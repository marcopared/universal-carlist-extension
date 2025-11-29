import { Queue, Worker } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import { notificationService } from '../services/notificationService';
import { vehicleService } from '../services/vehicleService';

// Queue connection options
const connection = {
  host: new URL(config.redisUrl).hostname,
  port: parseInt(new URL(config.redisUrl).port) || 6379,
};

// Notification Queue
export const notificationQueue = new Queue('notifications', { connection });

// HEAD Check Queue (for lightweight alive checks)
export const headCheckQueue = new Queue('head-checks', { connection });

// Email Processing Queue (for Gmail integration)
export const emailProcessingQueue = new Queue('email-processing', { connection });

export async function initializeQueues() {
  logger.info('Initializing background job queues...');
  
  // Notification Worker
  const notificationWorker = new Worker(
    'notifications',
    async (job) => {
      const { type, data } = job.data;
      
      switch (type) {
        case 'send_email':
          // Already handled in notificationService
          break;
        case 'send_push':
          // TODO: Implement push notifications
          break;
      }
    },
    { connection }
  );
  
  // HEAD Check Worker
  const headCheckWorker = new Worker(
    'head-checks',
    async (job) => {
      const { vehicleId, url } = job.data;
      
      try {
        // Perform lightweight HEAD request
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CarlistBot/1.0)',
          },
        });
        
        clearTimeout(timeout);
        
        const httpStatus = response.status;
        const isAlive = httpStatus >= 200 && httpStatus < 400;
        const redirectUrl = response.redirected ? response.url : null;
        
        // Record result
        await prisma.headCheckJob.create({
          data: {
            vehicleId,
            url,
            scheduledAt: new Date(),
            executedAt: new Date(),
            httpStatus,
            isAlive,
            redirectUrl,
          },
        });
        
        // If listing is dead (404/410), update vehicle status
        if (httpStatus === 404 || httpStatus === 410) {
          const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
          });
          
          if (vehicle && vehicle.currentStatus === 'ACTIVE') {
            await vehicleService.handleStatusChange(
              vehicleId,
              vehicle.currentStatus,
              'REMOVED',
              'system' // System-triggered
            );
          }
        }
        
        logger.info(`HEAD check for ${vehicleId}: ${httpStatus} ${isAlive ? 'alive' : 'dead'}`);
      } catch (error) {
        logger.error(`HEAD check failed for ${vehicleId}:`, error);
        
        // Record failed check
        await prisma.headCheckJob.create({
          data: {
            vehicleId,
            url,
            scheduledAt: new Date(),
            executedAt: new Date(),
            httpStatus: 0,
            isAlive: false,
          },
        });
      }
    },
    { connection, concurrency: 5 }
  );
  
  // Email Processing Worker
  const emailWorker = new Worker(
    'email-processing',
    async (job) => {
      // TODO: Implement Gmail email processing
      const { userId, emailId } = job.data;
      logger.info(`Processing email ${emailId} for user ${userId}`);
    },
    { connection }
  );
  
  // Event listeners
  notificationWorker.on('completed', (job) => {
    logger.debug(`Notification job ${job.id} completed`);
  });
  
  notificationWorker.on('failed', (job, err) => {
    logger.error(`Notification job ${job?.id} failed:`, err);
  });
  
  headCheckWorker.on('completed', (job) => {
    logger.debug(`HEAD check job ${job.id} completed`);
  });
  
  headCheckWorker.on('failed', (job, err) => {
    logger.error(`HEAD check job ${job?.id} failed:`, err);
  });
  
  logger.info('Background job queues initialized');
}

// Helper to schedule HEAD checks
export async function scheduleHeadChecks() {
  // Get vehicles that haven't been checked in 7+ days
  const staleVehicles = await prisma.vehicle.findMany({
    where: {
      currentStatus: 'ACTIVE',
      lastCheckedAt: {
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    },
    select: {
      id: true,
      sourceUrls: true,
    },
    take: 100, // Process in batches
  });
  
  for (const vehicle of staleVehicles) {
    const url = vehicle.sourceUrls[0];
    if (url) {
      await headCheckQueue.add(
        'head-check',
        { vehicleId: vehicle.id, url },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
    }
  }
  
  logger.info(`Scheduled ${staleVehicles.length} HEAD checks`);
}

