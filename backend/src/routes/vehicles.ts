import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { vehicleService } from '../services/vehicleService';

export const vehicleRouter = Router();

// Get vehicle by ID with full history
vehicleRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const vehicle = await vehicleService.getVehicleWithHistory(req.params.id);
    
    if (!vehicle) {
      throw new AppError(404, 'NOT_FOUND', 'Vehicle not found');
    }
    
    // Add freshness level
    const freshness = vehicleService.calculateFreshness(vehicle.lastCheckedAt);
    
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
        ...vehicle,
        freshness,
        isWatching: !!watchEntry,
        watchEntry,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Search vehicles
vehicleRouter.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const querySchema = z.object({
      q: z.string().optional(),
      make: z.string().optional(),
      model: z.string().optional(),
      yearMin: z.coerce.number().optional(),
      yearMax: z.coerce.number().optional(),
      priceMin: z.coerce.number().optional(),
      priceMax: z.coerce.number().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(20),
    });
    
    const query = querySchema.parse(req.query);
    
    const where: any = {};
    
    if (query.q) {
      where.OR = [
        { make: { contains: query.q, mode: 'insensitive' } },
        { model: { contains: query.q, mode: 'insensitive' } },
        { vin: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    
    if (query.make) where.make = { contains: query.make, mode: 'insensitive' };
    if (query.model) where.model = { contains: query.model, mode: 'insensitive' };
    if (query.yearMin) where.year = { ...where.year, gte: query.yearMin };
    if (query.yearMax) where.year = { ...where.year, lte: query.yearMax };
    if (query.priceMin) where.currentPrice = { ...where.currentPrice, gte: query.priceMin * 100 };
    if (query.priceMax) where.currentPrice = { ...where.currentPrice, lte: query.priceMax * 100 };
    
    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
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
          lastCheckedAt: true,
          priceDropCount: true,
        },
      }),
      prisma.vehicle.count({ where }),
    ]);
    
    res.json({
      success: true,
      data: {
        items: vehicles.map(v => ({
          ...v,
          freshness: vehicleService.calculateFreshness(v.lastCheckedAt),
        })),
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

// Get price history for a vehicle
vehicleRouter.get('/:id/price-history', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 90;
    
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const snapshots = await prisma.vehicleSnapshot.findMany({
      where: {
        vehicleId: id,
        capturedAt: { gte: since },
        price: { not: null },
      },
      orderBy: { capturedAt: 'asc' },
      select: {
        capturedAt: true,
        price: true,
      },
    });
    
    const priceChanges = await prisma.priceChange.findMany({
      where: {
        vehicleId: id,
        detectedAt: { gte: since },
      },
      orderBy: { detectedAt: 'asc' },
    });
    
    res.json({
      success: true,
      data: {
        snapshots,
        priceChanges,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get vehicles by VIN (for cross-site tracking)
vehicleRouter.get('/vin/:vin', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { vin } = req.params;
    const normalizedVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (normalizedVin.length !== 17) {
      throw new AppError(400, 'INVALID_VIN', 'VIN must be exactly 17 characters');
    }
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { vin: normalizedVin },
      include: {
        snapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 10,
        },
        priceChanges: {
          orderBy: { detectedAt: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!vehicle) {
      throw new AppError(404, 'NOT_FOUND', 'No vehicle found with this VIN');
    }
    
    res.json({
      success: true,
      data: {
        ...vehicle,
        freshness: vehicleService.calculateFreshness(vehicle.lastCheckedAt),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Compare multiple vehicles
vehicleRouter.post('/compare', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { vehicleIds } = z.object({
      vehicleIds: z.array(z.string()).min(2).max(5),
    }).parse(req.body);
    
    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      include: {
        snapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 1,
        },
      },
    });
    
    res.json({
      success: true,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
});

