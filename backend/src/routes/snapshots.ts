import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { vehicleService } from '../services/vehicleService';

export const snapshotRouter = Router();

// Get snapshots for a vehicle
snapshotRouter.get('/vehicle/:vehicleId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const querySchema = z.object({
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(50),
    });
    
    const query = querySchema.parse(req.query);
    
    const [snapshots, total] = await Promise.all([
      prisma.vehicleSnapshot.findMany({
        where: { vehicleId: req.params.vehicleId },
        orderBy: { capturedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          capturedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.vehicleSnapshot.count({
        where: { vehicleId: req.params.vehicleId },
      }),
    ]);
    
    res.json({
      success: true,
      data: {
        items: snapshots,
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

// Get a specific snapshot
snapshotRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const snapshot = await prisma.vehicleSnapshot.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: true,
        capturedBy: {
          select: { id: true, name: true },
        },
      },
    });
    
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Snapshot not found' },
      });
    }
    
    res.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    next(error);
  }
});

// Submit a new snapshot (used by extension)
snapshotRouter.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
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
    
    // Process snapshot using vehicle service
    // This handles crowd refresh, price change detection, etc.
    const result = await vehicleService.processSnapshot(req.user!.id, data);
    
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get user's contributed snapshots
snapshotRouter.get('/my/contributions', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const querySchema = z.object({
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(20),
    });
    
    const query = querySchema.parse(req.query);
    
    const [snapshots, total] = await Promise.all([
      prisma.vehicleSnapshot.findMany({
        where: { capturedById: req.user!.id },
        orderBy: { capturedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          vehicle: {
            select: {
              id: true,
              year: true,
              make: true,
              model: true,
              primaryPhotoUrl: true,
            },
          },
        },
      }),
      prisma.vehicleSnapshot.count({
        where: { capturedById: req.user!.id },
      }),
    ]);
    
    res.json({
      success: true,
      data: {
        items: snapshots,
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

