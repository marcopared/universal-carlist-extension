import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { notificationService } from '../services/notificationService';

export const notificationRouter = Router();

// Get user's notifications
notificationRouter.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const querySchema = z.object({
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(20),
      unreadOnly: z.coerce.boolean().default(false),
    });
    
    const query = querySchema.parse(req.query);
    
    const result = await notificationService.getUserNotifications(req.user!.id, query);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get unread count
notificationRouter.get('/unread-count', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    
    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
notificationRouter.patch('/:id/read', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user!.id);
    
    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
notificationRouter.post('/read-all', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user!.id);
    
    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
});

