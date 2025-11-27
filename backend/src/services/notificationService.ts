import { prisma } from '../lib/prisma';
import { emailService } from './emailService';
import { logger } from '../utils/logger';
import { NotificationType, NotificationChannel, Vehicle, ListingStatus } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  vehicleId: string;
  type: NotificationType;
  priceChangeId?: string;
  statusChangeId?: string;
  vehicle: Vehicle;
  priceChange?: {
    previousPrice: number;
    newPrice: number;
    changeAmount: number;
    changePercent: number;
  };
  statusChange?: {
    previousStatus: ListingStatus;
    newStatus: ListingStatus;
  };
}

export const notificationService = {
  /**
   * Create notification and send via appropriate channel
   */
  async createAndSend(params: CreateNotificationParams) {
    const { userId, vehicleId, type, priceChangeId, statusChangeId, vehicle, priceChange, statusChange } = params;
    
    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailNotifications: true,
        pushNotifications: true,
      },
    });
    
    if (!user) {
      logger.warn(`User ${userId} not found for notification`);
      return null;
    }
    
    // Generate notification content
    const { title, body } = this.generateContent(type, vehicle, priceChange, statusChange);
    
    // Determine channel
    const channel: NotificationChannel = user.emailNotifications ? 'EMAIL' : 'IN_APP';
    
    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        userId,
        vehicleId,
        type,
        title,
        body,
        priceChangeId,
        statusChangeId,
        channel,
      },
    });
    
    // Send notification
    if (channel === 'EMAIL' && user.emailNotifications) {
      try {
        await emailService.sendNotificationEmail(user.email, {
          type,
          title,
          body,
          vehicle,
          priceChange,
          statusChange,
        });
        
        // Mark as sent
        await prisma.notification.update({
          where: { id: notification.id },
          data: { sentAt: new Date() },
        });
        
        logger.info(`Sent ${type} notification to ${user.email} for vehicle ${vehicleId}`);
      } catch (error) {
        logger.error(`Failed to send notification email:`, error);
      }
    }
    
    // Update watchlist entry last notified
    await prisma.watchlistEntry.updateMany({
      where: { userId, vehicleId },
      data: { lastNotifiedAt: new Date() },
    });
    
    return notification;
  },
  
  /**
   * Generate notification title and body
   */
  generateContent(
    type: NotificationType,
    vehicle: Vehicle,
    priceChange?: { previousPrice: number; newPrice: number; changeAmount: number; changePercent: number },
    statusChange?: { previousStatus: ListingStatus; newStatus: ListingStatus }
  ): { title: string; body: string } {
    const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim() || 'Your watched vehicle';
    
    switch (type) {
      case 'PRICE_DROP':
        return {
          title: `🔻 Price Drop: ${vehicleName}`,
          body: `Price dropped from $${(priceChange!.previousPrice / 100).toLocaleString()} to $${(priceChange!.newPrice / 100).toLocaleString()} (${priceChange!.changePercent.toFixed(1)}% off)`,
        };
        
      case 'PRICE_RISE':
        return {
          title: `📈 Price Increase: ${vehicleName}`,
          body: `Price increased from $${(priceChange!.previousPrice / 100).toLocaleString()} to $${(priceChange!.newPrice / 100).toLocaleString()} (+${priceChange!.changePercent.toFixed(1)}%)`,
        };
        
      case 'TARGET_PRICE_HIT':
        return {
          title: `🎯 Target Price Hit: ${vehicleName}`,
          body: `The vehicle is now at your target price of $${(priceChange!.newPrice / 100).toLocaleString()}!`,
        };
        
      case 'STATUS_CHANGE':
        return {
          title: `📋 Status Update: ${vehicleName}`,
          body: `Status changed from ${statusChange!.previousStatus.toLowerCase()} to ${statusChange!.newStatus.toLowerCase()}`,
        };
        
      case 'RELIST_DETECTED':
        return {
          title: `🔄 Relisted: ${vehicleName}`,
          body: `This vehicle has been relisted. It may be back on the market!`,
        };
        
      default:
        return {
          title: `Update: ${vehicleName}`,
          body: `There's an update on your watched vehicle.`,
        };
    }
  },
  
  /**
   * Get user's notifications
   */
  async getUserNotifications(userId: string, options: {
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
  } = {}) {
    const { page = 1, pageSize = 20, unreadOnly = false } = options;
    
    const where = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };
    
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              year: true,
              make: true,
              model: true,
              trim: true,
              primaryPhotoUrl: true,
              currentPrice: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
    ]);
    
    return {
      items: notifications,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  },
  
  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  },
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
  
  /**
   * Get unread count
   */
  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  },
};

