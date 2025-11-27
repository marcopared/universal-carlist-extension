import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Vehicle, NotificationType, ListingStatus } from '@prisma/client';

// Create transporter
const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })
  : null;

interface NotificationEmailData {
  type: NotificationType;
  title: string;
  body: string;
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

export const emailService = {
  /**
   * Send notification email
   */
  async sendNotificationEmail(to: string, data: NotificationEmailData) {
    if (!transporter) {
      logger.warn('Email service not configured, skipping email send');
      return;
    }
    
    const vehicleName = `${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}`;
    const vehicleUrl = data.vehicle.sourceUrls[0] || '#';
    const appUrl = config.frontendUrl;
    
    const html = this.generateEmailHtml(data, vehicleName, vehicleUrl, appUrl);
    
    await transporter.sendMail({
      from: config.emailFrom,
      to,
      subject: data.title,
      html,
    });
    
    logger.info(`Sent email to ${to}: ${data.title}`);
  },
  
  /**
   * Generate beautiful email HTML
   */
  generateEmailHtml(
    data: NotificationEmailData,
    vehicleName: string,
    vehicleUrl: string,
    appUrl: string
  ): string {
    const priceHtml = data.priceChange
      ? `
        <div style="background: ${data.priceChange.changeAmount < 0 ? '#dcfce7' : '#fef2f2'}; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <div style="font-size: 14px; color: #666;">Price Change</div>
          <div style="font-size: 24px; font-weight: bold; color: ${data.priceChange.changeAmount < 0 ? '#16a34a' : '#dc2626'};">
            $${(data.priceChange.previousPrice / 100).toLocaleString()} → $${(data.priceChange.newPrice / 100).toLocaleString()}
          </div>
          <div style="font-size: 14px; color: ${data.priceChange.changeAmount < 0 ? '#16a34a' : '#dc2626'};">
            ${data.priceChange.changeAmount < 0 ? '▼' : '▲'} ${Math.abs(data.priceChange.changePercent).toFixed(1)}% (${data.priceChange.changeAmount < 0 ? '-' : '+'}$${Math.abs(data.priceChange.changeAmount / 100).toLocaleString()})
          </div>
        </div>
      `
      : '';
    
    const statusHtml = data.statusChange
      ? `
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <div style="font-size: 14px; color: #666;">Status Update</div>
          <div style="font-size: 18px; font-weight: bold;">
            ${data.statusChange.previousStatus} → ${data.statusChange.newStatus}
          </div>
        </div>
      `
      : '';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🚗 Carlist</h1>
            </div>
            
            <!-- Content -->
            <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="margin: 0 0 16px 0; color: #1f2937;">${data.title}</h2>
              
              <!-- Vehicle Card -->
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
                ${data.vehicle.primaryPhotoUrl ? `
                  <img src="${data.vehicle.primaryPhotoUrl}" alt="${vehicleName}" style="width: 100%; height: 200px; object-fit: cover;">
                ` : ''}
                <div style="padding: 16px;">
                  <h3 style="margin: 0 0 8px 0; color: #1f2937;">${vehicleName}</h3>
                  <div style="font-size: 14px; color: #666;">
                    ${data.vehicle.currentMileage ? `${data.vehicle.currentMileage.toLocaleString()} miles` : ''}
                    ${data.vehicle.trim ? ` • ${data.vehicle.trim}` : ''}
                  </div>
                  <div style="font-size: 24px; font-weight: bold; color: #1e3a5f; margin-top: 8px;">
                    $${data.vehicle.currentPrice ? (data.vehicle.currentPrice / 100).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
              
              ${priceHtml}
              ${statusHtml}
              
              <p style="color: #4b5563; line-height: 1.6;">${data.body}</p>
              
              <!-- CTA Buttons -->
              <div style="margin-top: 24px; text-align: center;">
                <a href="${vehicleUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 8px;">
                  View Listing
                </a>
                <a href="${appUrl}/watchlist" style="display: inline-block; background: #f3f4f6; color: #1f2937; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Open Watchlist
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
              <p>You're receiving this because you're watching this vehicle on Carlist.</p>
              <p><a href="${appUrl}/settings/notifications" style="color: #6b7280;">Manage notification preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  },
  
  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, name: string) {
    if (!transporter) return;
    
    await transporter.sendMail({
      from: config.emailFrom,
      to,
      subject: 'Welcome to Carlist! 🚗',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to Carlist! 🚗</h1>
              </div>
              <div style="padding: 32px;">
                <p style="font-size: 18px; color: #1f2937;">Hi ${name || 'there'},</p>
                <p style="color: #4b5563; line-height: 1.6;">
                  Thanks for joining Carlist! You're now ready to track car listings across all major sites.
                </p>
                <h3 style="color: #1f2937;">Getting Started:</h3>
                <ol style="color: #4b5563; line-height: 2;">
                  <li>Install our browser extension</li>
                  <li>Browse any car listing site</li>
                  <li>Click "Add to Watchlist" to track a vehicle</li>
                  <li>Get notified when prices drop!</li>
                </ol>
                <div style="text-align: center; margin-top: 24px;">
                  <a href="${config.frontendUrl}/get-started" style="display: inline-block; background: #1e3a5f; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    Get Started →
                  </a>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  },
};

