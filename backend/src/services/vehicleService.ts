import { prisma } from '../lib/prisma';
import { publishVehicleUpdate } from '../lib/redis';
import { notificationService } from './notificationService';
import { logger } from '../utils/logger';
import { ListingSource, ListingStatus, TriggerSource } from '@prisma/client';

// Normalize source string to enum
function normalizeSource(source: string): ListingSource {
  const sourceMap: Record<string, ListingSource> = {
    'cars.com': 'CARS_COM',
    'autotrader': 'AUTOTRADER',
    'cargurus': 'CARGURUS',
    'craigslist': 'CRAIGSLIST',
    'facebook': 'FACEBOOK',
    'carfax': 'CARFAX',
    'carvana': 'CARVANA',
    'vroom': 'VROOM',
    'dealer_site': 'DEALER_SITE',
  };
  return sourceMap[source.toLowerCase()] || 'UNKNOWN';
}

interface SnapshotData {
  url: string;
  source: string;
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  price?: number | null;
  mileage?: number | null;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  bodyStyle?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  fuelType?: string | null;
  engine?: string | null;
  sellerName?: string | null;
  sellerType?: 'dealer' | 'private' | 'unknown';
  sellerLocation?: string | null;
  sellerPhone?: string | null;
  photoUrls?: string[];
  status?: string;
}

export const vehicleService = {
  /**
   * Process a snapshot from the extension
   * This is the core function that handles crowd-refresh
   */
  async processSnapshot(userId: string, data: SnapshotData) {
    const normalizedSource = normalizeSource(data.source);
    
    // Normalize VIN
    const normalizedVin = data.vin 
      ? data.vin.toUpperCase().replace(/[^A-Z0-9]/g, '')
      : null;
    
    // Generate fingerprint for VIN-less matching
    const fingerprint = this.generateFingerprint(data);
    
    // Find or create vehicle
    let vehicle = await this.findVehicle(normalizedVin, fingerprint, data.url);
    
    const isNewVehicle = !vehicle;
    const previousPrice = vehicle?.currentPrice ?? null;
    const previousStatus = vehicle?.currentStatus ?? 'UNKNOWN';
    
    // Convert price to cents for storage
    const priceInCents = data.price ? Math.round(data.price * 100) : null;
    
    if (vehicle) {
      // Update existing vehicle
      vehicle = await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          // Update VIN if we now have one
          vin: normalizedVin || vehicle.vin,
          fingerprint: fingerprint,
          
          // Update specs if provided
          year: data.year ?? vehicle.year,
          make: data.make ?? vehicle.make,
          model: data.model ?? vehicle.model,
          trim: data.trim ?? vehicle.trim,
          exteriorColor: data.exteriorColor ?? vehicle.exteriorColor,
          interiorColor: data.interiorColor ?? vehicle.interiorColor,
          bodyStyle: data.bodyStyle ?? vehicle.bodyStyle,
          transmission: data.transmission ?? vehicle.transmission,
          drivetrain: data.drivetrain ?? vehicle.drivetrain,
          fuelType: data.fuelType ?? vehicle.fuelType,
          engine: data.engine ?? vehicle.engine,
          
          // Update current state
          currentPrice: priceInCents ?? vehicle.currentPrice,
          currentMileage: data.mileage ?? vehicle.currentMileage,
          currentStatus: (data.status?.toUpperCase() as ListingStatus) || vehicle.currentStatus,
          
          // Update price tracking
          lowestPrice: priceInCents && (!vehicle.lowestPrice || priceInCents < vehicle.lowestPrice) 
            ? priceInCents 
            : vehicle.lowestPrice,
          highestPrice: priceInCents && (!vehicle.highestPrice || priceInCents > vehicle.highestPrice)
            ? priceInCents
            : vehicle.highestPrice,
          
          // Update seller info
          sellerName: data.sellerName ?? vehicle.sellerName,
          sellerType: data.sellerType?.toUpperCase() as 'DEALER' | 'PRIVATE' | 'UNKNOWN' ?? vehicle.sellerType,
          sellerLocation: data.sellerLocation ?? vehicle.sellerLocation,
          sellerPhone: data.sellerPhone ?? vehicle.sellerPhone,
          
          // Update photos
          primaryPhotoUrl: data.photoUrls?.[0] ?? vehicle.primaryPhotoUrl,
          photoUrls: data.photoUrls?.length ? data.photoUrls : vehicle.photoUrls,
          
          // Add source if new
          sources: vehicle.sources.includes(normalizedSource) 
            ? vehicle.sources 
            : [...vehicle.sources, normalizedSource],
          sourceUrls: vehicle.sourceUrls.includes(data.url)
            ? vehicle.sourceUrls
            : [...vehicle.sourceUrls, data.url],
          
          // Update freshness
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new vehicle
      vehicle = await prisma.vehicle.create({
        data: {
          vin: normalizedVin,
          fingerprint,
          year: data.year,
          make: data.make,
          model: data.model,
          trim: data.trim,
          exteriorColor: data.exteriorColor,
          interiorColor: data.interiorColor,
          bodyStyle: data.bodyStyle,
          transmission: data.transmission,
          drivetrain: data.drivetrain,
          fuelType: data.fuelType,
          engine: data.engine,
          currentPrice: priceInCents,
          currentMileage: data.mileage,
          currentStatus: (data.status?.toUpperCase() as ListingStatus) || 'ACTIVE',
          lowestPrice: priceInCents,
          highestPrice: priceInCents,
          sellerName: data.sellerName,
          sellerType: data.sellerType?.toUpperCase() as 'DEALER' | 'PRIVATE' | 'UNKNOWN' ?? 'UNKNOWN',
          sellerLocation: data.sellerLocation,
          sellerPhone: data.sellerPhone,
          primaryPhotoUrl: data.photoUrls?.[0],
          photoUrls: data.photoUrls ?? [],
          sources: [normalizedSource],
          sourceUrls: [data.url],
          lastCheckedAt: new Date(),
        },
      });
    }
    
    // Create snapshot record
    const snapshot = await prisma.vehicleSnapshot.create({
      data: {
        vehicleId: vehicle.id,
        capturedById: userId,
        price: priceInCents,
        mileage: data.mileage,
        status: (data.status?.toUpperCase() as ListingStatus) || 'ACTIVE',
        sourceUrl: data.url,
        source: normalizedSource,
        rawData: data as any,
      },
    });
    
    // CROWD REFRESH: Detect changes and notify ALL watchers
    if (!isNewVehicle && priceInCents !== null && previousPrice !== null) {
      if (priceInCents !== previousPrice) {
        await this.handlePriceChange(
          vehicle.id,
          previousPrice,
          priceInCents,
          userId
        );
      }
    }
    
    // Detect status change
    const newStatus = (data.status?.toUpperCase() as ListingStatus) || 'ACTIVE';
    if (!isNewVehicle && newStatus !== previousStatus) {
      await this.handleStatusChange(
        vehicle.id,
        previousStatus,
        newStatus,
        userId
      );
    }
    
    // Publish real-time update
    await publishVehicleUpdate(vehicle.id, {
      type: 'refresh',
      triggeredByUserId: userId,
    });
    
    logger.info(`Processed snapshot for vehicle ${vehicle.id} (VIN: ${vehicle.vin})`);
    
    return { vehicle, snapshot, isNewVehicle };
  },
  
  /**
   * Handle price change - notify all watchers
   * This is the CROWD REFRESH mechanism
   */
  async handlePriceChange(
    vehicleId: string,
    previousPrice: number,
    newPrice: number,
    triggeredByUserId: string
  ) {
    const changeAmount = newPrice - previousPrice;
    const changePercent = (changeAmount / previousPrice) * 100;
    
    // Record the price change
    const priceChange = await prisma.priceChange.create({
      data: {
        vehicleId,
        previousPrice,
        newPrice,
        changeAmount,
        changePercent,
        triggeredBy: 'EXTENSION_REFRESH',
        triggeredByUserId,
      },
    });
    
    // Update vehicle price drop count
    if (changeAmount < 0) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { priceDropCount: { increment: 1 } },
      });
    }
    
    // Get ALL users watching this vehicle (except the one who triggered it)
    const watchers = await prisma.watchlistEntry.findMany({
      where: {
        vehicleId,
        // Exclude the user who triggered the refresh - they already see it
        userId: { not: triggeredByUserId },
      },
      include: {
        user: true,
        vehicle: true,
      },
    });
    
    logger.info(
      `Price change detected for vehicle ${vehicleId}: ` +
      `$${previousPrice / 100} → $${newPrice / 100} ` +
      `(${changeAmount > 0 ? '+' : ''}${changePercent.toFixed(1)}%). ` +
      `Notifying ${watchers.length} watchers.`
    );
    
    // Notify each watcher based on their preferences
    for (const watcher of watchers) {
      const isPriceDrop = changeAmount < 0;
      const isPriceRise = changeAmount > 0;
      
      // Check if user wants this type of notification
      if (isPriceDrop && !watcher.notifyPriceDrop) continue;
      if (isPriceRise && !watcher.notifyPriceRise) continue;
      
      // Check threshold if set
      if (watcher.priceDropThreshold && Math.abs(changeAmount) < watcher.priceDropThreshold) {
        continue;
      }
      
      // Check if target price hit
      const targetPriceHit = watcher.targetPrice && newPrice <= watcher.targetPrice;
      
      await notificationService.createAndSend({
        userId: watcher.userId,
        vehicleId,
        type: targetPriceHit ? 'TARGET_PRICE_HIT' : (isPriceDrop ? 'PRICE_DROP' : 'PRICE_RISE'),
        priceChangeId: priceChange.id,
        vehicle: watcher.vehicle,
        priceChange: {
          previousPrice,
          newPrice,
          changeAmount,
          changePercent,
        },
      });
    }
    
    // Publish to real-time channel
    await publishVehicleUpdate(vehicleId, {
      type: 'price_change',
      previousValue: previousPrice,
      newValue: newPrice,
      triggeredByUserId,
    });
    
    return priceChange;
  },
  
  /**
   * Handle status change - notify all watchers
   */
  async handleStatusChange(
    vehicleId: string,
    previousStatus: ListingStatus,
    newStatus: ListingStatus,
    triggeredByUserId: string
  ) {
    // Record the status change
    const statusChange = await prisma.statusChange.create({
      data: {
        vehicleId,
        previousStatus,
        newStatus,
        triggeredBy: 'EXTENSION_REFRESH',
        triggeredByUserId,
      },
    });
    
    // Get all watchers
    const watchers = await prisma.watchlistEntry.findMany({
      where: {
        vehicleId,
        notifyStatusChange: true,
        userId: { not: triggeredByUserId },
      },
      include: {
        user: true,
        vehicle: true,
      },
    });
    
    logger.info(
      `Status change detected for vehicle ${vehicleId}: ` +
      `${previousStatus} → ${newStatus}. ` +
      `Notifying ${watchers.length} watchers.`
    );
    
    // Notify watchers
    for (const watcher of watchers) {
      await notificationService.createAndSend({
        userId: watcher.userId,
        vehicleId,
        type: 'STATUS_CHANGE',
        statusChangeId: statusChange.id,
        vehicle: watcher.vehicle,
        statusChange: {
          previousStatus,
          newStatus,
        },
      });
    }
    
    // Publish to real-time channel
    await publishVehicleUpdate(vehicleId, {
      type: 'status_change',
      previousValue: previousStatus,
      newValue: newStatus,
      triggeredByUserId,
    });
    
    return statusChange;
  },
  
  /**
   * Find existing vehicle by VIN, fingerprint, or URL
   */
  async findVehicle(vin: string | null, fingerprint: string, url: string) {
    // First try exact VIN match
    if (vin && vin.length === 17) {
      const byVin = await prisma.vehicle.findUnique({
        where: { vin },
      });
      if (byVin) return byVin;
    }
    
    // Try URL match
    const byUrl = await prisma.vehicle.findFirst({
      where: {
        sourceUrls: { has: url },
      },
    });
    if (byUrl) return byUrl;
    
    // Try fingerprint match (fuzzy)
    const byFingerprint = await prisma.vehicle.findFirst({
      where: { fingerprint },
    });
    if (byFingerprint) return byFingerprint;
    
    return null;
  },
  
  /**
   * Generate fuzzy fingerprint for VIN-less matching
   */
  generateFingerprint(data: SnapshotData): string {
    const parts = [
      data.year?.toString() || 'XXXX',
      (data.make || 'unknown').toLowerCase().replace(/\s+/g, ''),
      (data.model || 'unknown').toLowerCase().replace(/\s+/g, ''),
      (data.trim || '').toLowerCase().replace(/\s+/g, ''),
      data.mileage ? Math.round(data.mileage / 1000).toString() + 'k' : 'XXXk',
      data.price ? Math.round(data.price / 500) * 500 : 'XXXXX',
      (data.sellerLocation || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10),
    ];
    
    return parts.join('|');
  },
  
  /**
   * Get vehicle with price history
   */
  async getVehicleWithHistory(vehicleId: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        snapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 100,
        },
        priceChanges: {
          orderBy: { detectedAt: 'desc' },
          take: 50,
        },
        statusChanges: {
          orderBy: { detectedAt: 'desc' },
          take: 20,
        },
      },
    });
    
    return vehicle;
  },
  
  /**
   * Calculate freshness level
   */
  calculateFreshness(lastCheckedAt: Date): 'fresh' | 'recent' | 'stale' {
    const now = new Date();
    const diffMs = now.getTime() - lastCheckedAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffDays < 1) return 'fresh';
    if (diffDays < 6) return 'recent';
    return 'stale';
  },
  
  /**
   * Merge duplicate vehicles (when VIN is discovered later)
   */
  async mergeVehicles(primaryId: string, duplicateId: string) {
    // Move all snapshots to primary
    await prisma.vehicleSnapshot.updateMany({
      where: { vehicleId: duplicateId },
      data: { vehicleId: primaryId },
    });
    
    // Move all watchlist entries
    const duplicateWatchers = await prisma.watchlistEntry.findMany({
      where: { vehicleId: duplicateId },
    });
    
    for (const watcher of duplicateWatchers) {
      // Check if user already watches primary
      const existingEntry = await prisma.watchlistEntry.findUnique({
        where: {
          userId_vehicleId: {
            userId: watcher.userId,
            vehicleId: primaryId,
          },
        },
      });
      
      if (!existingEntry) {
        // Move to primary
        await prisma.watchlistEntry.update({
          where: { id: watcher.id },
          data: { vehicleId: primaryId },
        });
      } else {
        // Delete duplicate entry
        await prisma.watchlistEntry.delete({
          where: { id: watcher.id },
        });
      }
    }
    
    // Move price changes and status changes
    await prisma.priceChange.updateMany({
      where: { vehicleId: duplicateId },
      data: { vehicleId: primaryId },
    });
    
    await prisma.statusChange.updateMany({
      where: { vehicleId: duplicateId },
      data: { vehicleId: primaryId },
    });
    
    // Delete duplicate vehicle
    await prisma.vehicle.delete({
      where: { id: duplicateId },
    });
    
    logger.info(`Merged vehicle ${duplicateId} into ${primaryId}`);
  },
};

