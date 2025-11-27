import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { vehicleService } from '../services/vehicleService';

export const watchlistRouter = Router();

// Get user's watchlist
watchlistRouter.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const querySchema = z.object({
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(20),
      sortBy: z.enum(['addedAt', 'price', 'priceChange', 'freshness']).default('addedAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      tags: z.string().optional(), // Comma-separated tags
    });
    
    const query = querySchema.parse(req.query);
    
    const where: any = { userId: req.user!.id };
    
    if (query.tags) {
      const tags = query.tags.split(',');
      where.tags = { hasSome: tags };
    }
    
    let orderBy: any = { addedAt: query.sortOrder };
    if (query.sortBy === 'price') {
      orderBy = { vehicle: { currentPrice: query.sortOrder } };
    }
    
    const [entries, total] = await Promise.all([
      prisma.watchlistEntry.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              vin: true,
              year: true,
              make: true,
              model: true,
              trim: true,
              currentPrice: true,
              currentMileage: true,
              currentStatus: true,
              primaryPhotoUrl: true,
              sources: true,
              sourceUrls: true,
              lastCheckedAt: true,
              lowestPrice: true,
              highestPrice: true,
              priceDropCount: true,
            },
          },
        },
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.watchlistEntry.count({ where }),
    ]);
    
    // Add computed fields
    const items = entries.map(entry => ({
      ...entry,
      priceDifference: entry.priceWhenAdded && entry.vehicle.currentPrice
        ? entry.vehicle.currentPrice - entry.priceWhenAdded
        : null,
      freshness: vehicleService.calculateFreshness(entry.vehicle.lastCheckedAt),
    }));
    
    res.json({
      success: true,
      data: {
        items,
        total,
        page: query.page,
        pageSize: query.pageSize,
        hasMore: query.page * query.pageSize < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Add vehicle to watchlist
watchlistRouter.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const addSchema = z.object({
      vehicleId: z.string().uuid(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      notifyPriceDrop: z.boolean().optional(),
      notifyPriceRise: z.boolean().optional(),
      notifyStatusChange: z.boolean().optional(),
      notifyRelist: z.boolean().optional(),
      priceDropThreshold: z.number().optional(),
      targetPrice: z.number().optional(),
    });
    
    const data = addSchema.parse(req.body);
    
    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
    });
    
    if (!vehicle) {
      throw new AppError(404, 'NOT_FOUND', 'Vehicle not found');
    }
    
    // Check if already watching
    const existing = await prisma.watchlistEntry.findUnique({
      where: {
        userId_vehicleId: {
          userId: req.user!.id,
          vehicleId: data.vehicleId,
        },
      },
    });
    
    if (existing) {
      throw new AppError(400, 'ALREADY_WATCHING', 'You are already watching this vehicle');
    }
    
    // Create watchlist entry
    const entry = await prisma.watchlistEntry.create({
      data: {
        userId: req.user!.id,
        vehicleId: data.vehicleId,
        priceWhenAdded: vehicle.currentPrice,
        notes: data.notes,
        tags: data.tags || [],
        notifyPriceDrop: data.notifyPriceDrop ?? true,
        notifyPriceRise: data.notifyPriceRise ?? false,
        notifyStatusChange: data.notifyStatusChange ?? true,
        notifyRelist: data.notifyRelist ?? true,
        priceDropThreshold: data.priceDropThreshold ? Math.round(data.priceDropThreshold * 100) : null,
        targetPrice: data.targetPrice ? Math.round(data.targetPrice * 100) : null,
      },
      include: {
        vehicle: true,
      },
    });
    
    res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
});

// Update watchlist entry
watchlistRouter.patch('/:vehicleId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const updateSchema = z.object({
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      notifyPriceDrop: z.boolean().optional(),
      notifyPriceRise: z.boolean().optional(),
      notifyStatusChange: z.boolean().optional(),
      notifyRelist: z.boolean().optional(),
      priceDropThreshold: z.number().nullable().optional(),
      targetPrice: z.number().nullable().optional(),
    });
    
    const data = updateSchema.parse(req.body);
    
    const entry = await prisma.watchlistEntry.updateMany({
      where: {
        userId: req.user!.id,
        vehicleId: req.params.vehicleId,
      },
      data: {
        ...data,
        priceDropThreshold: data.priceDropThreshold ? Math.round(data.priceDropThreshold * 100) : data.priceDropThreshold,
        targetPrice: data.targetPrice ? Math.round(data.targetPrice * 100) : data.targetPrice,
      },
    });
    
    if (entry.count === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Watchlist entry not found');
    }
    
    const updated = await prisma.watchlistEntry.findUnique({
      where: {
        userId_vehicleId: {
          userId: req.user!.id,
          vehicleId: req.params.vehicleId,
        },
      },
      include: { vehicle: true },
    });
    
    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// Remove from watchlist
watchlistRouter.delete('/:vehicleId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await prisma.watchlistEntry.deleteMany({
      where: {
        userId: req.user!.id,
        vehicleId: req.params.vehicleId,
      },
    });
    
    if (result.count === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Watchlist entry not found');
    }
    
    res.json({
      success: true,
      message: 'Vehicle removed from watchlist',
    });
  } catch (error) {
    next(error);
  }
});

// Get watchlist stats
watchlistRouter.get('/stats', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const entries = await prisma.watchlistEntry.findMany({
      where: { userId: req.user!.id },
      include: {
        vehicle: {
          select: {
            currentPrice: true,
            currentStatus: true,
            priceDropCount: true,
            lastCheckedAt: true,
          },
        },
      },
    });
    
    const stats = {
      totalWatching: entries.length,
      totalPriceDrops: entries.reduce((sum, e) => sum + e.vehicle.priceDropCount, 0),
      activeListings: entries.filter(e => e.vehicle.currentStatus === 'ACTIVE').length,
      staleListings: entries.filter(e => 
        vehicleService.calculateFreshness(e.vehicle.lastCheckedAt) === 'stale'
      ).length,
      totalSavings: entries.reduce((sum, e) => {
        if (e.priceWhenAdded && e.vehicle.currentPrice) {
          const diff = e.priceWhenAdded - e.vehicle.currentPrice;
          return sum + (diff > 0 ? diff : 0);
        }
        return sum;
      }, 0),
    };
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// Get all tags
watchlistRouter.get('/tags', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const entries = await prisma.watchlistEntry.findMany({
      where: { userId: req.user!.id },
      select: { tags: true },
    });
    
    const allTags = new Set<string>();
    entries.forEach(e => e.tags.forEach(t => allTags.add(t)));
    
    res.json({
      success: true,
      data: Array.from(allTags).sort(),
    });
  } catch (error) {
    next(error);
  }
});

