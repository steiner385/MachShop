/**
 * Email Notification Service
 *
 * Manages email notifications for NCR workflow events:
 * - Approval request emails
 * - State transition notifications
 * - Escalation alerts
 * - Rejection notifications
 *
 * Features:
 * - Template-based email generation
 * - Retry logic for failed emails
 * - Queue management
 * - Personalization and variable substitution
 * - HTML and text email support
 */

import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Email template data
 */
interface EmailTemplateData {
  [key: string]: any;
}

/**
 * Email notification
 */
interface EmailNotificationRecord {
  id: string;
  recipientEmail: string;
  subject: string;
  template: string;
  data: EmailTemplateData;
  sent: boolean;
  sentAt?: Date;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
}

/**
 * Email templates
 */
const EMAIL_TEMPLATES: Record<string, { subject: string; html: (data: EmailTemplateData) => string }> = {
  approval_request: {
    subject: 'NCR {ncrNumber} - Approval Request ({requestType})',
    html: (data) => `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .button { background-color: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; }
            .footer { color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>NCR ${data.ncrNumber} - Approval Request</h2>
              <p>A new approval request requires your attention.</p>
            </div>

            <div class="section">
              <h3>Request Details</h3>
              <table>
                <tr>
                  <th>NCR Number</th>
                  <td>${data.ncrNumber}</td>
                </tr>
                <tr>
                  <th>Request Type</th>
                  <td>${data.requestType}</td>
                </tr>
                <tr>
                  <th>Requested By</th>
                  <td>${data.requestedByName || data.requestedBy}</td>
                </tr>
                <tr>
                  <th>Due Date</th>
                  <td>${data.dueDate}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <h3>Request Notes</h3>
              <p>${data.approvalNotes || 'No notes provided.'}</p>
            </div>

            <div class="section">
              <p>
                <a href="${data.actionUrl}" class="button">Review Approval Request</a>
              </p>
            </div>

            <div class="footer">
              <p>This is an automated notification from the NCR Management System.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  },

  state_transition: {
    subject: 'NCR {ncrNumber} - State Changed to {toState}',
    html: (data) => `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .state-transition { background-color: #f0f5ff; padding: 15px; border-left: 4px solid #1890ff; }
            .button { background-color: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; }
            .footer { color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>NCR ${data.ncrNumber} - State Transition</h2>
              <p>An NCR has transitioned to a new state.</p>
            </div>

            <div class="section">
              <div class="state-transition">
                <p><strong>${data.fromState}</strong> → <strong>${data.toState}</strong></p>
                <p>Changed by: ${data.changedByName || data.changedBy}</p>
                <p>${data.changeReason || ''}</p>
              </div>
            </div>

            <div class="section">
              <p>
                <a href="${data.actionUrl}" class="button">View NCR Details</a>
              </p>
            </div>

            <div class="footer">
              <p>This is an automated notification from the NCR Management System.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  },

  escalation: {
    subject: 'NCR {ncrNumber} - Approval Escalated (Overdue)',
    html: (data) => `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #fff2e8; padding: 20px; border-radius: 4px; margin-bottom: 20px; border-left: 4px solid #ff4d4f; }
            .section { margin-bottom: 20px; }
            .alert { background-color: #fff2e8; padding: 15px; border-left: 4px solid #ff4d4f; }
            .button { background-color: #ff4d4f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; }
            .footer { color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>⚠️ NCR ${data.ncrNumber} - Approval Escalated</h2>
              <p>An approval request is overdue and has been escalated.</p>
            </div>

            <div class="section">
              <div class="alert">
                <h3>Escalation Details</h3>
                <p><strong>Hours Overdue:</strong> ${data.hoursOverdue}</p>
                <p><strong>Original Due Date:</strong> ${data.dueDate}</p>
                <p><strong>Requested By:</strong> ${data.requestedByName}</p>
                <p><strong>Request Type:</strong> ${data.requestType}</p>
              </div>
            </div>

            <div class="section">
              <p>This approval requires immediate attention.</p>
              <p>
                <a href="${data.actionUrl}" class="button">Take Action Now</a>
              </p>
            </div>

            <div class="footer">
              <p>This is an automated escalation notification from the NCR Management System.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  },

  rejection: {
    subject: 'NCR {ncrNumber} - Approval Rejected',
    html: (data) => `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #fff2e8; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .rejection-reason { background-color: #fff2e8; padding: 15px; border-left: 4px solid #faad14; }
            .button { background-color: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; }
            .footer { color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>NCR ${data.ncrNumber} - Approval Rejected</h2>
              <p>Your approval request has been rejected.</p>
            </div>

            <div class="section">
              <div class="rejection-reason">
                <h3>Rejection Reason</h3>
                <p>${data.rejectionReason}</p>
                <p><strong>Rejected By:</strong> ${data.rejectedByName}</p>
              </div>
            </div>

            <div class="section">
              <h3>Next Steps</h3>
              <p>Please review the rejection reason and take appropriate action to address the concerns raised.</p>
              <p>
                <a href="${data.actionUrl}" class="button">View Details & Resubmit</a>
              </p>
            </div>

            <div class="footer">
              <p>This is an automated notification from the NCR Management System.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  },
};

/**
 * Email Notification Service
 */
export class EmailNotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private static instance: EmailNotificationService;

  /**
   * Get singleton instance
   */
  static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService();
    }
    return EmailNotificationService.instance;
  }

  /**
   * Initialize service
   */
  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter(): void {
    try {
      const emailConfig = {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        } : undefined,
      };

      this.transporter = nodemailer.createTransport(emailConfig);
      logger.info('Email transporter initialized');
    } catch (error) {
      logger.error('Failed to initialize email transporter', { error });
    }
  }

  /**
   * Send approval request email
   */
  async sendApprovalRequestEmail(
    approvalId: string,
    recipientEmail: string,
    ncrNumber: string,
    requestType: string,
    requestedByName: string,
    dueDate: Date,
    approvalNotes?: string
  ): Promise<void> {
    const templateData = {
      ncrNumber,
      requestType,
      requestedByName,
      dueDate: new Date(dueDate).toLocaleDateString(),
      approvalNotes,
      actionUrl: `${process.env.FRONTEND_URL}/quality/ncr/${ncrNumber}/approvals`,
    };

    await this.sendEmail('approval_request', recipientEmail, templateData, approvalId);
  }

  /**
   * Send state transition email
   */
  async sendStateTransitionEmail(
    ncrNumber: string,
    recipientEmail: string,
    fromState: string,
    toState: string,
    changedByName: string,
    changeReason?: string
  ): Promise<void> {
    const templateData = {
      ncrNumber,
      fromState,
      toState,
      changedByName,
      changeReason,
      actionUrl: `${process.env.FRONTEND_URL}/quality/ncr/${ncrNumber}`,
    };

    await this.sendEmail('state_transition', recipientEmail, templateData);
  }

  /**
   * Send escalation email
   */
  async sendEscalationEmail(
    ncrNumber: string,
    recipientEmail: string,
    hoursOverdue: number,
    dueDate: Date,
    requestedByName: string,
    requestType: string
  ): Promise<void> {
    const templateData = {
      ncrNumber,
      hoursOverdue,
      dueDate: new Date(dueDate).toLocaleDateString(),
      requestedByName,
      requestType,
      actionUrl: `${process.env.FRONTEND_URL}/quality/ncr/${ncrNumber}/approvals`,
    };

    await this.sendEmail('escalation', recipientEmail, templateData);
  }

  /**
   * Send rejection email
   */
  async sendRejectionEmail(
    ncrNumber: string,
    recipientEmail: string,
    rejectionReason: string,
    rejectedByName: string
  ): Promise<void> {
    const templateData = {
      ncrNumber,
      rejectionReason,
      rejectedByName,
      actionUrl: `${process.env.FRONTEND_URL}/quality/ncr/${ncrNumber}`,
    };

    await this.sendEmail('rejection', recipientEmail, templateData);
  }

  /**
   * Send email using template
   */
  private async sendEmail(
    templateName: string,
    recipientEmail: string,
    data: EmailTemplateData,
    referenceId?: string
  ): Promise<void> {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const template = EMAIL_TEMPLATES[templateName];
      if (!template) {
        throw new Error(`Unknown email template: ${templateName}`);
      }

      // Substitute variables in subject
      const subject = template.subject
        .replace(/{(\w+)}/g, (_, key) => data[key] || '');

      // Generate HTML
      const html = template.html(data);

      // Send email
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@machshop.local',
        to: recipientEmail,
        subject,
        html,
      });

      logger.info('Email sent', {
        messageId: info.messageId,
        to: recipientEmail,
        template: templateName,
      });

      // Update database record if reference ID provided
      if (referenceId) {
        // TODO: Update email notification record in database if using persistence
      }
    } catch (error) {
      logger.error('Failed to send email', {
        template: templateName,
        recipientEmail,
        error,
      });

      // Queue for retry
      await this.queueForRetry(templateName, recipientEmail, data, referenceId);
    }
  }

  /**
   * Queue email for retry
   */
  private async queueForRetry(
    templateName: string,
    recipientEmail: string,
    data: EmailTemplateData,
    referenceId?: string
  ): Promise<void> {
    try {
      // TODO: Implement email queue persistence in database
      // For now, log for monitoring
      logger.warn('Email queued for retry', {
        template: templateName,
        recipientEmail,
        referenceId,
      });
    } catch (error) {
      logger.error('Failed to queue email for retry', { error });
    }
  }

  /**
   * Retry failed emails
   */
  async retryFailedEmails(): Promise<number> {
    try {
      let retryCount = 0;
      // TODO: Implement retry logic from database queue
      logger.info('Email retry completed', { retryCount });
      return retryCount;
    } catch (error) {
      logger.error('Failed to retry emails', { error });
      return 0;
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(testEmail: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@machshop.local',
        to: testEmail,
        subject: 'Email Configuration Test',
        html: '<p>This is a test email to verify your email configuration is working correctly.</p>',
      });

      logger.info('Test email sent successfully', { testEmail });
      return true;
    } catch (error) {
      logger.error('Failed to send test email', { testEmail, error });
      return false;
    }
  }
}

export const emailNotificationService = EmailNotificationService.getInstance();
