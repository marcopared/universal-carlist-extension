import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { vehicleRouter } from './routes/vehicles';
import { watchlistRouter } from './routes/watchlist';
import { snapshotRouter } from './routes/snapshots';
import { notificationRouter } from './routes/notifications';
import { extensionRouter } from './routes/extension';
import { webhookRouter } from './routes/webhooks';
import { initializeQueues } from './queues';
import { startCronJobs } from './cron';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [config.frontendUrl, 'chrome-extension://*', 'moz-extension://*'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehicleRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/snapshots', snapshotRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/extension', extensionRouter);
app.use('/api/webhooks', webhookRouter);

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Initialize background job queues
    await initializeQueues();
    
    // Start cron jobs (HEAD checks, etc.)
    startCronJobs();
    
    app.listen(config.port, () => {
      logger.info(`🚗 Carlist API running on port ${config.port}`);
      logger.info(`📍 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

