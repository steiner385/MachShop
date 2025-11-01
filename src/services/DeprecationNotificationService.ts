/**
 * Deprecation Notification Service
 * Handles multi-channel notifications for API deprecations
 * Email, webhooks, in-app alerts, and SMS for critical sunsets
 */

import { prisma } from '../lib/prisma';
import { DeprecationInfo } from '../types/versioning';
import nodemailer from 'nodemailer';

/**
 * Email template for deprecation notices
 */
function generateDeprecationEmailHtml(
  feature: string,
  sunsetDate: Date,
  replacement: string | undefined,
  migrationGuideUrl: string | undefined,
): string {
  const daysRemaining = Math.ceil((sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #856404;">⚠️ API Deprecation Notice</h2>
          </div>

          <h3>Feature: ${feature}</h3>
          <p>Your MES API integration is using a feature that will be deprecated.</p>

          <h3>Timeline</h3>
          <ul>
            <li><strong>Sunset Date:</strong> ${sunsetDate.toDateString()}</li>
            <li><strong>Days Remaining:</strong> ${daysRemaining} days</li>
            <li><strong>Action Required:</strong> Migrate before sunset date</li>
          </ul>

          ${replacement ? `<h3>Recommended Alternative</h3><p><code>${replacement}</code></p>` : ''}

          ${
            migrationGuideUrl
              ? `
            <h3>Migration Resources</h3>
            <p>
              <a href="${migrationGuideUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                View Migration Guide
              </a>
            </p>
          `
              : ''
          }

          <h3>Next Steps</h3>
          <ol>
            <li>Review the migration guide for the recommended alternative</li>
            <li>Update your API integration code</li>
            <li>Test your changes in a staging environment</li>
            <li>Deploy to production before the sunset date</li>
          </ol>

          <h3>Questions?</h3>
          <p>
            Contact our developer support team:
            <br/>
            📧 Email: api-support@mes.com
            <br/>
            💬 Community: https://community.mes.com
            <br/>
            📖 Docs: https://docs.mes.com
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from MES API Platform.
            You received this because your API key uses deprecated features.
          </p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Deprecation Notification Service
 */
export class DeprecationNotificationService {
  private emailTransporter: any;

  constructor() {
    // Initialize email transporter (configure with your email service)
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'localhost',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: process.env.EMAIL_USER ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD } : undefined,
    });
  }

  /**
   * Send deprecation notification via email
   */
  async sendEmailNotification(
    email: string,
    feature: string,
    deprecation: DeprecationInfo,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const html = generateDeprecationEmailHtml(
        feature,
        new Date(deprecation.sunsetDate),
        deprecation.replacement,
        deprecation.migrationGuideUrl,
      );

      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'api-notifications@mes.com',
        to: email,
        subject: `[Deprecation Notice] ${feature} will be sunset on ${new Date(deprecation.sunsetDate).toDateString()}`,
        html,
        replyTo: 'api-support@mes.com',
      });

      return { success: true };
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error);
      return { success: false, error: (error as any).message };
    }
  }

  /**
   * Send webhook notification to developer's endpoint
   */
  async sendWebhookNotification(
    webhookUrl: string,
    feature: string,
    deprecation: DeprecationInfo,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = {
        event: 'api.deprecation',
        timestamp: new Date().toISOString(),
        data: {
          feature,
          deprecatedAt: deprecation.deprecatedAt,
          sunsetDate: deprecation.sunsetDate,
          severity: deprecation.severity,
          replacement: deprecation.replacement,
          migrationGuide: deprecation.migrationGuideUrl,
          description: deprecation.description,
        },
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MES-Signature': this.generateSignature(JSON.stringify(payload)),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to send webhook to ${webhookUrl}:`, error);
      return { success: false, error: (error as any).message };
    }
  }

  /**
   * Create in-app dashboard alert
   */
  async createDashboardAlert(
    apiKeyId: string,
    feature: string,
    deprecation: DeprecationInfo,
  ): Promise<{ success: boolean; alertId?: string }> {
    try {
      // In a real app, this would create an alert in the developer dashboard
      // For now, we'll track it in the database
      const daysUntilSunset = Math.ceil(
        (new Date(deprecation.sunsetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      const alert = {
        apiKeyId,
        feature,
        type: daysUntilSunset <= 30 ? 'critical' : 'warning',
        title: `${feature} will be deprecated`,
        message: `${feature} will be sunset on ${new Date(deprecation.sunsetDate).toDateString()}. ${daysUntilSunset} days remaining.`,
        actionUrl: deprecation.migrationGuideUrl || '/docs/migration',
        actionLabel: 'View Migration Guide',
        createdAt: new Date(),
        expiresAt: new Date(deprecation.sunsetDate),
      };

      // Store alert in database (would implement actual storage)
      return {
        success: true,
        alertId: `alert-${Date.now()}`,
      };
    } catch (error) {
      console.error(`Failed to create dashboard alert:`, error);
      return { success: false };
    }
  }

  /**
   * Send SMS notification (for critical sunsets only)
   */
  async sendSmsNotification(
    phoneNumber: string,
    feature: string,
    sunsetDate: Date,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const daysRemaining = Math.ceil((sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      // Only send SMS for critical alerts (30 days or less)
      if (daysRemaining > 30) {
        return { success: false, error: 'SMS only sent for critical alerts (30 days or less)' };
      }

      const message = `[MES Alert] API feature "${feature}" will be deprecated on ${sunsetDate.toDateString()}. ${daysRemaining} days remaining. Visit https://docs.mes.com/migrate to upgrade.`;

      // Implementation would use Twilio or similar SMS service
      // await twilioClient.messages.create({
      //   from: process.env.TWILIO_PHONE,
      //   to: phoneNumber,
      //   body: message,
      // });

      return { success: true };
    } catch (error) {
      console.error(`Failed to send SMS:`, error);
      return { success: false, error: (error as any).message };
    }
  }

  /**
   * Batch notify all affected API keys
   */
  async notifyAffectedApiKeys(deprecation: DeprecationInfo): Promise<NotificationBatch> {
    try {
      // Get all API keys affected by this deprecation
      const affectedApiKeys = await this.getAffectedApiKeys(deprecation.feature);

      const results: NotificationResult[] = [];

      for (const apiKey of affectedApiKeys) {
        const notificationResult: NotificationResult = {
          apiKeyId: apiKey.id,
          email: { success: false },
          webhook: { success: false },
          dashboard: { success: false },
          sms: { success: false },
        };

        // Send email
        if (apiKey.developerEmail) {
          notificationResult.email = await this.sendEmailNotification(
            apiKey.developerEmail,
            deprecation.feature,
            deprecation,
          );
        }

        // Send webhook (if configured)
        if (apiKey.webhookUrl) {
          notificationResult.webhook = await this.sendWebhookNotification(
            apiKey.webhookUrl,
            deprecation.feature,
            deprecation,
          );
        }

        // Create dashboard alert
        notificationResult.dashboard = await this.createDashboardAlert(apiKey.id, deprecation.feature, deprecation);

        // Send SMS only if critical (30 days or less)
        const daysUntil = Math.ceil(
          (new Date(deprecation.sunsetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        if (daysUntil <= 30 && apiKey.developerPhone) {
          notificationResult.sms = await this.sendSmsNotification(
            apiKey.developerPhone,
            deprecation.feature,
            new Date(deprecation.sunsetDate),
          );
        }

        results.push(notificationResult);
      }

      return {
        deprecationId: deprecation.id,
        feature: deprecation.feature,
        totalAffected: affectedApiKeys.length,
        notificationsSent: results.filter((r) => r.email.success).length,
        results,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`Failed to notify affected API keys:`, error);
      throw error;
    }
  }

  /**
   * Get all API keys affected by a deprecation
   */
  private async getAffectedApiKeys(feature: string): Promise<any[]> {
    try {
      // Query API keys that use the deprecated feature
      // This would require tracking which features each API key uses
      // For now, return empty array - implement based on your usage tracking
      const apiKeys = await prisma.apiKey.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
          developerEmail: true,
          developerPhone: true,
          // webhookUrl: true, // if tracking webhooks
        },
      });

      return apiKeys;
    } catch (error) {
      console.error(`Failed to get affected API keys:`, error);
      return [];
    }
  }

  /**
   * Generate webhook signature for verification
   */
  private generateSignature(payload: string): string {
    const crypto = require('crypto');
    const secret = process.env.WEBHOOK_SECRET || 'secret';
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(
    apiKeyId: string,
    limit: number = 50,
  ): Promise<Array<{
    id: string;
    feature: string;
    notificationType: string;
    sentAt: Date;
    status: 'pending' | 'sent' | 'failed';
  }>> {
    // Implementation would query notification history from database
    return [];
  }

  /**
   * Resend notification
   */
  async resendNotification(
    apiKeyId: string,
    feature: string,
    channels: Array<'email' | 'webhook' | 'sms'>,
  ): Promise<{
    success: boolean;
    channels: Record<string, { success: boolean; error?: string }>;
  }> {
    const results: Record<string, { success: boolean; error?: string }> = {};

    try {
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
        select: {
          developerEmail: true,
          developerPhone: true,
        },
      });

      if (!apiKey) {
        throw new Error(`API key ${apiKeyId} not found`);
      }

      const deprecation = await prisma.apiDeprecation.findFirst({
        where: {
          feature,
        },
      });

      if (!deprecation) {
        throw new Error(`Deprecation for ${feature} not found`);
      }

      // Resend on specified channels
      if (channels.includes('email') && apiKey.developerEmail) {
        results.email = await this.sendEmailNotification(
          apiKey.developerEmail,
          feature,
          {
            id: deprecation.id,
            version: deprecation.versionId,
            feature: deprecation.feature,
            deprecatedAt: deprecation.deprecatedAt,
            sunsetDate: deprecation.sunsetDate,
            replacement: deprecation.replacement,
            migrationGuideUrl: deprecation.migrationGuideUrl,
            affectedAccounts: deprecation.affectedAccounts,
            notificationsSent: deprecation.notificationsSent,
            severity: deprecation.severity,
            description: deprecation.description,
          },
        );
      }

      if (channels.includes('sms') && apiKey.developerPhone) {
        results.sms = await this.sendSmsNotification(
          apiKey.developerPhone,
          feature,
          new Date(deprecation.sunsetDate),
        );
      }

      return {
        success: Object.values(results).some((r) => r.success),
        channels: results,
      };
    } catch (error) {
      return {
        success: false,
        channels: {
          error: { success: false, error: (error as any).message },
        },
      };
    }
  }
}

/**
 * Notification result for a single API key
 */
export interface NotificationResult {
  apiKeyId: string;
  email: { success: boolean; error?: string };
  webhook: { success: boolean; error?: string };
  dashboard: { success: boolean; alertId?: string };
  sms: { success: boolean; error?: string };
}

/**
 * Batch notification result
 */
export interface NotificationBatch {
  deprecationId: string;
  feature: string;
  totalAffected: number;
  notificationsSent: number;
  results: NotificationResult[];
  timestamp: Date;
}

export const deprecationNotificationService = new DeprecationNotificationService();
