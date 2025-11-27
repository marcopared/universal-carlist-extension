import cron from 'node-cron';
import { logger } from '../utils/logger';
import { scheduleHeadChecks } from '../queues';
import { config } from '../config';

export function startCronJobs() {
  logger.info('Starting cron jobs...');
  
  // Schedule HEAD checks every day at 3 AM
  // This checks stale listings to detect removed/sold vehicles
  if (config.features.headChecks) {
    cron.schedule('0 3 * * *', async () => {
      logger.info('Running daily HEAD check scheduler');
      try {
        await scheduleHeadChecks();
      } catch (error) {
        logger.error('HEAD check scheduler failed:', error);
      }
    });
    
    logger.info('HEAD check cron job scheduled (daily at 3 AM)');
  }
  
  // TODO: Gmail sync job
  // Run every 15 minutes to check for new emails
  if (config.features.gmailIntegration) {
    cron.schedule('*/15 * * * *', async () => {
      logger.info('Running Gmail sync');
      // TODO: Implement Gmail sync
    });
    
    logger.info('Gmail sync cron job scheduled (every 15 minutes)');
  }
  
  // Cleanup old snapshots (keep only last 1000 per vehicle)
  cron.schedule('0 4 * * 0', async () => {
    logger.info('Running weekly snapshot cleanup');
    // TODO: Implement cleanup
  });
  
  logger.info('Cron jobs started');
}

