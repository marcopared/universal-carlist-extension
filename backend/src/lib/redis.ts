import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error('Redis error:', err);
});

// Pub/Sub client for real-time updates
export const redisPub = new Redis(config.redisUrl);
export const redisSub = new Redis(config.redisUrl);

// Channel names
export const CHANNELS = {
  VEHICLE_UPDATE: 'vehicle:update',
  PRICE_CHANGE: 'price:change',
  STATUS_CHANGE: 'status:change',
} as const;

// Publish vehicle update to all subscribers
export async function publishVehicleUpdate(vehicleId: string, data: {
  type: 'price_change' | 'status_change' | 'refresh';
  previousValue?: number | string;
  newValue?: number | string;
  triggeredByUserId?: string;
}) {
  await redisPub.publish(
    CHANNELS.VEHICLE_UPDATE,
    JSON.stringify({ vehicleId, ...data, timestamp: new Date().toISOString() })
  );
}

