import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateExtension, AuthenticatedRequest } from '../middleware/auth';
import { vehicleService } from '../services/vehicleService';
import { logger } from '../utils/logger';

export const extensionRouter = Router();

// All routes require extension authentication
extensionRouter.use(authenticateExtension);

/**
 * Submit snapshot from extension
 * This is the main endpoint the extension calls when user views a listing
 */
extensionRouter.post('/snapshot', async (req: AuthenticatedRequest, res, next) => {
  try {
    const snapshotSchema = z.object({
      url: z.string().url(),
      source: z.string(),
      vin: z.string().nullable().optional(),
      year: z.number().nullable().optional(),
      make: z.string().nullable().optional(),
      model: z.string().nullable().optional(),
      trim: z.string().nullable().optional(),
      price: z.number().nullable().optional(),
      mileage: z.number().nullable().optional(),
      exteriorColor: z.string().nullable().optional(),
      interiorColor: z.string().nullable().optional(),
      bodyStyle: z.string().nullable().optional(),
      transmission: z.string().nullable().optional(),
      drivetrain: z.string().nullable().optional(),
      fuelType: z.string().nullable().optional(),
      engine: z.string().nullable().optional(),
      sellerName: z.string().nullable().optional(),
      sellerType: z.enum(['dealer', 'private', 'unknown']).optional(),
      sellerLocation: z.string().nullable().optional(),
      sellerPhone: z.string().nullable().optional(),
      photoUrls: z.array(z.string()).optional(),
      status: z.string().optional(),
    });
    
    const data = snapshotSchema.parse(req.body);
    
    logger.info(`Extension snapshot received from ${req.user!.email} for ${data.url}`);
    
    // Process snapshot - this triggers crowd refresh for all watchers
    const result = await vehicleService.processSnapshot(req.user!.id, data);
    
    // Check if user is watching this vehicle
    const watchEntry = await prisma.watchlistEntry.findUnique({
      where: {
        userId_vehicleId: {
          userId: req.user!.id,
          vehicleId: result.vehicle.id,
        },
      },
    });
    
    res.json({
      success: true,
      data: {
        vehicle: result.vehicle,
        snapshot: result.snapshot,
        isNewVehicle: result.isNewVehicle,
        isWatching: !!watchEntry,
        freshness: vehicleService.calculateFreshness(result.vehicle.lastCheckedAt),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Quick add to watchlist from extension
 */
extensionRouter.post('/watch', async (req: AuthenticatedRequest, res, next) => {
  try {
    const watchSchema = z.object({
      vehicleId: z.string().uuid(),
      notes: z.string().optional(),
    });
    
    const { vehicleId, notes } = watchSchema.parse(req.body);
    
    // Check if already watching
    const existing = await prisma.watchlistEntry.findUnique({
      where: {
        userId_vehicleId: {
          userId: req.user!.id,
          vehicleId,
        },
      },
    });
    
    if (existing) {
      return res.json({
        success: true,
        data: { alreadyWatching: true, entry: existing },
      });
    }
    
    // Get vehicle for price
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vehicle not found' },
      });
    }
    
    // Create watchlist entry with defaults
    const entry = await prisma.watchlistEntry.create({
      data: {
        userId: req.user!.id,
        vehicleId,
        priceWhenAdded: vehicle.currentPrice,
        notes,
        notifyPriceDrop: true,
        notifyStatusChange: true,
        notifyRelist: true,
      },
      include: { vehicle: true },
    });
    
    logger.info(`User ${req.user!.email} added vehicle ${vehicleId} to watchlist via extension`);
    
    res.status(201).json({
      success: true,
      data: { alreadyWatching: false, entry },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Remove from watchlist via extension
 */
extensionRouter.delete('/watch/:vehicleId', async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.watchlistEntry.deleteMany({
      where: {
        userId: req.user!.id,
        vehicleId: req.params.vehicleId,
      },
    });
    
    res.json({
      success: true,
      message: 'Removed from watchlist',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Check if URL is being watched
 */
extensionRouter.get('/check-url', async (req: AuthenticatedRequest, res, next) => {
  try {
    const url = req.query.url as string;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_URL', message: 'URL is required' },
      });
    }
    
    // Find vehicle by URL
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        sourceUrls: { has: url },
      },
      select: {
        id: true,
        vin: true,
        year: true,
        make: true,
        model: true,
        currentPrice: true,
        lastCheckedAt: true,
      },
    });
    
    if (!vehicle) {
      return res.json({
        success: true,
        data: { found: false, isWatching: false },
      });
    }
    
    // Check if user is watching
    const watchEntry = await prisma.watchlistEntry.findUnique({
      where: {
        userId_vehicleId: {
          userId: req.user!.id,
          vehicleId: vehicle.id,
        },
      },
    });
    
    res.json({
      success: true,
      data: {
        found: true,
        isWatching: !!watchEntry,
        vehicle,
        freshness: vehicleService.calculateFreshness(vehicle.lastCheckedAt),
        watchEntry,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get user's watchlist summary for extension popup
 */
extensionRouter.get('/watchlist-summary', async (req: AuthenticatedRequest, res, next) => {
  try {
    const entries = await prisma.watchlistEntry.findMany({
      where: { userId: req.user!.id },
      include: {
        vehicle: {
          select: {
            id: true,
            year: true,
            make: true,
            model: true,
            currentPrice: true,
            currentStatus: true,
            primaryPhotoUrl: true,
            lastCheckedAt: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
      take: 10,
    });
    
    // Get unread notification count
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    });
    
    res.json({
      success: true,
      data: {
        recentWatchlist: entries.map(e => ({
          ...e,
          freshness: vehicleService.calculateFreshness(e.vehicle.lastCheckedAt),
        })),
        totalWatching: await prisma.watchlistEntry.count({
          where: { userId: req.user!.id },
        }),
        unreadNotifications: unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

