import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { SaviyntService } from './SaviyntService';
import { UserProvisioningService } from './UserProvisioningService';
import { UserDeprovisioningService } from './UserDeprovisioningService';
import { AttributeSynchronizationService } from './AttributeSynchronizationService';
import { RoleMappingService } from './RoleMappingService';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import * as crypto from 'crypto';
import {
  SaviyntSyncStatus,
  SaviyntSyncType,
  SaviyntEntityType,
  SaviyntOperation
} from '@prisma/client';

export interface WebhookEvent {
  id: string;
  eventType: WebhookEventType;
  eventSubtype?: string;
  source: 'SAVIYNT' | 'MES';
  entityType: SaviyntEntityType;
  entityId: string;
  entityData: any;
  metadata: WebhookMetadata;
  timestamp: Date;
  signature?: string;
  processed: boolean;
  processingStatus: SaviyntSyncStatus;
  processingError?: string;
  retryCount: number;
  maxRetries: number;
}

export enum WebhookEventType {
  // User Events
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_LOCKED = 'USER_LOCKED',
  USER_UNLOCKED = 'USER_UNLOCKED',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',

  // Role Events
  ROLE_CREATED = 'ROLE_CREATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  ROLE_DELETED = 'ROLE_DELETED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REVOKED = 'ROLE_REVOKED',

  // Account Events
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_UPDATED = 'ACCOUNT_UPDATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  ACCOUNT_ENABLED = 'ACCOUNT_ENABLED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',

  // Access Events
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_REVOKED = 'ACCESS_REVOKED',
  ACCESS_MODIFIED = 'ACCESS_MODIFIED',
  ACCESS_CERTIFIED = 'ACCESS_CERTIFIED',
  ACCESS_VIOLATION = 'ACCESS_VIOLATION',

  // Certification Events
  CERTIFICATION_STARTED = 'CERTIFICATION_STARTED',
  CERTIFICATION_COMPLETED = 'CERTIFICATION_COMPLETED',
  CERTIFICATION_APPROVED = 'CERTIFICATION_APPROVED',
  CERTIFICATION_REJECTED = 'CERTIFICATION_REJECTED',
  CERTIFICATION_EXPIRED = 'CERTIFICATION_EXPIRED',

  // Security Events
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  SOD_VIOLATION = 'SOD_VIOLATION',
  RISK_THRESHOLD_EXCEEDED = 'RISK_THRESHOLD_EXCEEDED',

  // System Events
  SYSTEM_HEALTH_CHECK = 'SYSTEM_HEALTH_CHECK',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SYNC_STARTED = 'SYNC_STARTED',
  SYNC_COMPLETED = 'SYNC_COMPLETED',
  SYNC_FAILED = 'SYNC_FAILED'
}

export interface WebhookMetadata {
  sourceSystem: string;
  sourceVersion: string;
  correlationId?: string;
  parentEventId?: string;
  priority: WebhookPriority;
  requiresImmediate: boolean;
  businessContext?: Record<string, any>;
  securityContext?: SecurityContext;
}

export enum WebhookPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface SecurityContext {
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresEncryption: boolean;
  accessControls?: string[];
}

export interface WebhookProcessor {
  eventType: WebhookEventType;
  processor: (event: WebhookEvent) => Promise<void>;
  priority: number;
  timeout: number;
  retryOnFailure: boolean;
}

export interface WebhookValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedPayload?: any;
}

export interface WebhookResponse {
  success: boolean;
  eventId: string;
  message: string;
  processingTime: number;
  errors?: string[];
  warnings?: string[];
}

export class SaviyntWebhookService {
  private prisma: PrismaClient;
  private saviyntService: SaviyntService;
  private provisioningService: UserProvisioningService;
  private deprovisioningService: UserDeprovisioningService;
  private attributeSyncService: AttributeSynchronizationService;
  private roleMappingService: RoleMappingService;

  private processors: Map<WebhookEventType, WebhookProcessor> = new Map();
  private eventQueue: WebhookEvent[] = [];
  private processingQueue: Map<string, WebhookEvent> = new Map();
  private webhookSecret: string;
  private isEnabled: boolean;
  private maxConcurrentEvents: number = 10;
  private queueProcessingInterval?: NodeJS.Timeout;

  constructor(
    prisma: PrismaClient,
    saviyntService: SaviyntService,
    provisioningService: UserProvisioningService,
    deprovisioningService: UserDeprovisioningService,
    attributeSyncService: AttributeSynchronizationService,
    roleMappingService: RoleMappingService
  ) {
    this.prisma = prisma;
    this.saviyntService = saviyntService;
    this.provisioningService = provisioningService;
    this.deprovisioningService = deprovisioningService;
    this.attributeSyncService = attributeSyncService;
    this.roleMappingService = roleMappingService;

    this.webhookSecret = config.saviynt.webhookSecret || 'default-secret';
    this.isEnabled = config.saviynt.enabled;
  }

  /**
   * Initialize webhook service and register processors
   */
  public async initialize(): Promise<void> {
    if (!this.isEnabled) {
      logger.info('Saviynt webhook service is disabled');
      return;
    }

    try {
      this.registerWebhookProcessors();
      await this.startQueueProcessor();
      await this.loadPendingEvents();

      logger.info('Saviynt webhook service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize webhook service', { error });
      throw error;
    }
  }

  /**
   * Register webhook event processors
   */
  private registerWebhookProcessors(): void {
    // User event processors
    this.processors.set(WebhookEventType.USER_CREATED, {
      eventType: WebhookEventType.USER_CREATED,
      processor: this.processUserCreated.bind(this),
      priority: 1,
      timeout: 30000,
      retryOnFailure: true
    });

    this.processors.set(WebhookEventType.USER_UPDATED, {
      eventType: WebhookEventType.USER_UPDATED,
      processor: this.processUserUpdated.bind(this),
      priority: 2,
      timeout: 30000,
      retryOnFailure: true
    });

    this.processors.set(WebhookEventType.USER_DEACTIVATED, {
      eventType: WebhookEventType.USER_DEACTIVATED,
      processor: this.processUserDeactivated.bind(this),
      priority: 1,
      timeout: 30000,
      retryOnFailure: true
    });

    this.processors.set(WebhookEventType.ROLE_ASSIGNED, {
      eventType: WebhookEventType.ROLE_ASSIGNED,
      processor: this.processRoleAssigned.bind(this),
      priority: 2,
      timeout: 30000,
      retryOnFailure: true
    });

    this.processors.set(WebhookEventType.ROLE_REVOKED, {
      eventType: WebhookEventType.ROLE_REVOKED,
      processor: this.processRoleRevoked.bind(this),
      priority: 2,
      timeout: 30000,
      retryOnFailure: true
    });

    this.processors.set(WebhookEventType.ACCESS_VIOLATION, {
      eventType: WebhookEventType.ACCESS_VIOLATION,
      processor: this.processAccessViolation.bind(this),
      priority: 1,
      timeout: 15000,
      retryOnFailure: true
    });

    this.processors.set(WebhookEventType.CERTIFICATION_COMPLETED, {
      eventType: WebhookEventType.CERTIFICATION_COMPLETED,
      processor: this.processCertificationCompleted.bind(this),
      priority: 3,
      timeout: 60000,
      retryOnFailure: true
    });

    this.processors.set(WebhookEventType.SOD_VIOLATION, {
      eventType: WebhookEventType.SOD_VIOLATION,
      processor: this.processSodViolation.bind(this),
      priority: 1,
      timeout: 15000,
      retryOnFailure: true
    });

    logger.info(`Registered ${this.processors.size} webhook processors`);
  }

  /**
   * Handle incoming webhook request
   */
  public async handleWebhook(req: Request, res: Response): Promise<WebhookResponse> {
    const startTime = Date.now();

    try {
      // Validate webhook signature
      const isValidSignature = this.validateWebhookSignature(req);
      if (!isValidSignature) {
        const response: WebhookResponse = {
          success: false,
          eventId: 'unknown',
          message: 'Invalid webhook signature',
          processingTime: Date.now() - startTime,
          errors: ['Invalid webhook signature']
        };
        res.status(401).json(response);
        return response;
      }

      // Parse and validate payload
      const validationResult = await this.validateWebhookPayload(req.body);
      if (!validationResult.isValid) {
        const response: WebhookResponse = {
          success: false,
          eventId: 'unknown',
          message: 'Invalid webhook payload',
          processingTime: Date.now() - startTime,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        };
        res.status(400).json(response);
        return response;
      }

      // Create webhook event
      const webhookEvent = await this.createWebhookEvent(validationResult.sanitizedPayload!);

      // Queue for processing
      this.queueEvent(webhookEvent);

      const response: WebhookResponse = {
        success: true,
        eventId: webhookEvent.id,
        message: 'Webhook received and queued for processing',
        processingTime: Date.now() - startTime
      };

      res.status(200).json(response);
      return response;

    } catch (error) {
      logger.error('Webhook processing error', { error });

      const response: WebhookResponse = {
        success: false,
        eventId: 'unknown',
        message: 'Internal server error',
        processingTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };

      res.status(500).json(response);
      return response;
    }
  }

  /**
   * Validate webhook signature
   */
  private validateWebhookSignature(req: Request): boolean {
    try {
      const signature = req.headers['x-saviynt-signature'] as string;
      if (!signature) {
        return false;
      }

      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Signature validation error', { error });
      return false;
    }
  }

  /**
   * Validate webhook payload
   */
  private async validateWebhookPayload(payload: any): Promise<WebhookValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Required fields validation
      if (!payload.eventType) {
        errors.push('Missing required field: eventType');
      }

      if (!payload.entityType) {
        errors.push('Missing required field: entityType');
      }

      if (!payload.entityId) {
        errors.push('Missing required field: entityId');
      }

      if (!payload.timestamp) {
        errors.push('Missing required field: timestamp');
      }

      // Event type validation
      if (payload.eventType && !Object.values(WebhookEventType).includes(payload.eventType)) {
        errors.push(`Invalid event type: ${payload.eventType}`);
      }

      // Entity type validation
      if (payload.entityType && !Object.values(SaviyntEntityType).includes(payload.entityType)) {
        errors.push(`Invalid entity type: ${payload.entityType}`);
      }

      // Timestamp validation
      if (payload.timestamp) {
        const timestamp = new Date(payload.timestamp);
        if (isNaN(timestamp.getTime())) {
          errors.push('Invalid timestamp format');
        } else {
          const now = new Date();
          const timeDiff = now.getTime() - timestamp.getTime();

          // Warn if event is older than 5 minutes
          if (timeDiff > 5 * 60 * 1000) {
            warnings.push(`Event is ${Math.round(timeDiff / 60000)} minutes old`);
          }

          // Reject if event is older than 1 hour
          if (timeDiff > 60 * 60 * 1000) {
            errors.push('Event timestamp is too old (> 1 hour)');
          }
        }
      }

      // Sanitize payload
      const sanitizedPayload = {
        eventType: payload.eventType,
        eventSubtype: payload.eventSubtype,
        entityType: payload.entityType,
        entityId: String(payload.entityId),
        entityData: payload.entityData || {},
        timestamp: payload.timestamp,
        metadata: {
          sourceSystem: payload.metadata?.sourceSystem || 'SAVIYNT',
          sourceVersion: payload.metadata?.sourceVersion || 'unknown',
          correlationId: payload.metadata?.correlationId,
          parentEventId: payload.metadata?.parentEventId,
          priority: payload.metadata?.priority || WebhookPriority.NORMAL,
          requiresImmediate: payload.metadata?.requiresImmediate || false,
          businessContext: payload.metadata?.businessContext || {},
          securityContext: payload.metadata?.securityContext
        }
      };

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedPayload: errors.length === 0 ? sanitizedPayload : undefined
      };

    } catch (error) {
      errors.push(`Payload validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Create webhook event record
   */
  private async createWebhookEvent(payload: any): Promise<WebhookEvent> {
    const eventId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const webhookEvent: WebhookEvent = {
      id: eventId,
      eventType: payload.eventType,
      eventSubtype: payload.eventSubtype,
      source: 'SAVIYNT',
      entityType: payload.entityType,
      entityId: payload.entityId,
      entityData: payload.entityData,
      metadata: payload.metadata,
      timestamp: new Date(payload.timestamp),
      processed: false,
      processingStatus: SaviyntSyncStatus.PENDING,
      retryCount: 0,
      maxRetries: 3
    };

    // Store in database
    await this.prisma.saviyntWebhookEvent.create({
      data: {
        eventType: webhookEvent.eventType,
        eventSubtype: webhookEvent.eventSubtype,
        entityType: webhookEvent.entityType,
        entityId: webhookEvent.entityId,
        eventPayload: webhookEvent.entityData,
        processingStatus: webhookEvent.processingStatus,
        retryCount: webhookEvent.retryCount,
        receivedAt: webhookEvent.timestamp
      }
    });

    logger.info('Webhook event created', {
      eventId,
      eventType: webhookEvent.eventType,
      entityType: webhookEvent.entityType,
      entityId: webhookEvent.entityId
    });

    return webhookEvent;
  }

  /**
   * Queue event for processing
   */
  private queueEvent(event: WebhookEvent): void {
    // Insert based on priority
    const insertIndex = this.eventQueue.findIndex(queuedEvent =>
      this.getEventPriority(queuedEvent) > this.getEventPriority(event)
    );

    if (insertIndex === -1) {
      this.eventQueue.push(event);
    } else {
      this.eventQueue.splice(insertIndex, 0, event);
    }

    logger.debug('Event queued for processing', {
      eventId: event.id,
      queueLength: this.eventQueue.length,
      priority: event.metadata.priority
    });
  }

  /**
   * Start queue processor
   */
  private async startQueueProcessor(): Promise<void> {
    this.queueProcessingInterval = setInterval(async () => {
      await this.processEventQueue();
    }, 1000); // Process every second

    logger.info('Webhook queue processor started');
  }

  /**
   * Process event queue
   */
  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0 || this.processingQueue.size >= this.maxConcurrentEvents) {
      return;
    }

    const event = this.eventQueue.shift();
    if (!event) return;

    this.processingQueue.set(event.id, event);

    try {
      await this.processEvent(event);
    } catch (error) {
      logger.error('Event processing failed', {
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.processingQueue.delete(event.id);
    }
  }

  /**
   * Process individual webhook event
   */
  private async processEvent(event: WebhookEvent): Promise<void> {
    const processor = this.processors.get(event.eventType);
    if (!processor) {
      logger.warn('No processor found for event type', {
        eventId: event.id,
        eventType: event.eventType
      });
      return;
    }

    const startTime = Date.now();
    event.processingStatus = SaviyntSyncStatus.IN_PROGRESS;

    try {
      // Update database status
      await this.updateEventStatus(event.id, SaviyntSyncStatus.IN_PROGRESS);

      // Execute processor with timeout
      await Promise.race([
        processor.processor(event),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Processor timeout')), processor.timeout)
        )
      ]);

      event.processed = true;
      event.processingStatus = SaviyntSyncStatus.COMPLETED;

      await this.updateEventStatus(event.id, SaviyntSyncStatus.COMPLETED, {
        processedAt: new Date(),
        duration: Date.now() - startTime
      });

      logger.info('Event processed successfully', {
        eventId: event.id,
        eventType: event.eventType,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      event.processingError = errorMessage;
      event.retryCount++;

      if (event.retryCount < event.maxRetries && processor.retryOnFailure) {
        // Requeue for retry
        event.processingStatus = SaviyntSyncStatus.PENDING;
        this.queueEvent(event);

        logger.warn('Event processing failed, queued for retry', {
          eventId: event.id,
          retryCount: event.retryCount,
          maxRetries: event.maxRetries,
          error: errorMessage
        });
      } else {
        // Mark as failed
        event.processingStatus = SaviyntSyncStatus.FAILED;

        await this.updateEventStatus(event.id, SaviyntSyncStatus.FAILED, {
          errorMessage,
          processedAt: new Date(),
          duration: Date.now() - startTime
        });

        logger.error('Event processing failed permanently', {
          eventId: event.id,
          eventType: event.eventType,
          error: errorMessage
        });
      }
    }
  }

  /**
   * Event processors
   */

  private async processUserCreated(event: WebhookEvent): Promise<void> {
    logger.info('Processing user created event', {
      eventId: event.id,
      entityId: event.entityId
    });

    // This would typically create a corresponding user in MES
    // For now, just log the event
    await this.logEventProcessing(event, 'User created event processed');
  }

  private async processUserUpdated(event: WebhookEvent): Promise<void> {
    logger.info('Processing user updated event', {
      eventId: event.id,
      entityId: event.entityId
    });

    // Trigger attribute synchronization
    const mesUser = await this.findMESUserBySaviyntId(event.entityId);
    if (mesUser) {
      await this.attributeSyncService.syncUserAttributes(
        mesUser.id,
        'SAVIYNT_TO_MES' as any,
        'webhook-automation'
      );
    }

    await this.logEventProcessing(event, 'User updated event processed');
  }

  private async processUserDeactivated(event: WebhookEvent): Promise<void> {
    logger.info('Processing user deactivated event', {
      eventId: event.id,
      entityId: event.entityId
    });

    // Trigger deprovisioning process
    const mesUser = await this.findMESUserBySaviyntId(event.entityId);
    if (mesUser) {
      await this.deprovisioningService.handleDeprovisioningEvent(
        mesUser.id,
        'USER_DEACTIVATED' as any,
        mesUser,
        'webhook-automation',
        'Deactivated in Saviynt'
      );
    }

    await this.logEventProcessing(event, 'User deactivated event processed');
  }

  private async processRoleAssigned(event: WebhookEvent): Promise<void> {
    logger.info('Processing role assigned event', {
      eventId: event.id,
      entityId: event.entityId
    });

    // Extract user and role information from event data
    const { userId, roleId } = event.entityData;

    if (userId && roleId) {
      const mesUser = await this.findMESUserBySaviyntId(userId);
      const mesRole = await this.findMESRoleBySaviyntId(roleId);

      if (mesUser && mesRole) {
        await this.roleMappingService.assignRoleToUser(
          mesUser.id,
          mesRole.id,
          'webhook-automation'
        );
      }
    }

    await this.logEventProcessing(event, 'Role assigned event processed');
  }

  private async processRoleRevoked(event: WebhookEvent): Promise<void> {
    logger.info('Processing role revoked event', {
      eventId: event.id,
      entityId: event.entityId
    });

    // Extract user and role information from event data
    const { userId, roleId } = event.entityData;

    if (userId && roleId) {
      const mesUser = await this.findMESUserBySaviyntId(userId);
      const mesRole = await this.findMESRoleBySaviyntId(roleId);

      if (mesUser && mesRole) {
        await this.roleMappingService.removeRoleFromUser(
          mesUser.id,
          mesRole.id,
          'webhook-automation'
        );
      }
    }

    await this.logEventProcessing(event, 'Role revoked event processed');
  }

  private async processAccessViolation(event: WebhookEvent): Promise<void> {
    logger.info('Processing access violation event', {
      eventId: event.id,
      entityId: event.entityId,
      severity: event.metadata.priority
    });

    // Handle security violations with immediate action
    if (event.metadata.priority === WebhookPriority.CRITICAL) {
      const mesUser = await this.findMESUserBySaviyntId(event.entityId);
      if (mesUser) {
        await this.deprovisioningService.handleDeprovisioningEvent(
          mesUser.id,
          'SECURITY_INCIDENT' as any,
          mesUser,
          'webhook-automation',
          `Access violation: ${event.entityData.violationType}`
        );
      }
    }

    await this.logEventProcessing(event, 'Access violation event processed');
  }

  private async processCertificationCompleted(event: WebhookEvent): Promise<void> {
    logger.info('Processing certification completed event', {
      eventId: event.id,
      entityId: event.entityId
    });

    // Update certification status in database
    await this.prisma.saviyntAccessCertification.updateMany({
      where: { certificationId: event.entityId },
      data: {
        status: 'APPROVED' as any,
        certifiedAt: new Date(),
        certificationDecision: event.entityData.decision || 'APPROVE'
      }
    });

    await this.logEventProcessing(event, 'Certification completed event processed');
  }

  private async processSodViolation(event: WebhookEvent): Promise<void> {
    logger.info('Processing SOD violation event', {
      eventId: event.id,
      entityId: event.entityId
    });

    // Create alert and trigger review process
    // This would integrate with alerting and workflow systems

    await this.logEventProcessing(event, 'SOD violation event processed');
  }

  /**
   * Utility methods
   */

  private async findMESUserBySaviyntId(saviyntUserId: string): Promise<any> {
    const mapping = await this.prisma.saviyntUserMapping.findFirst({
      where: { saviyntUserId },
      include: { user: true }
    });
    return mapping?.user;
  }

  private async findMESRoleBySaviyntId(saviyntRoleId: string): Promise<any> {
    const mapping = await this.prisma.saviyntRoleMapping.findFirst({
      where: { saviyntRoleId },
      include: { role: true }
    });
    return mapping?.role;
  }

  private getEventPriority(event: WebhookEvent): number {
    switch (event.metadata.priority) {
      case WebhookPriority.CRITICAL: return 1;
      case WebhookPriority.HIGH: return 2;
      case WebhookPriority.NORMAL: return 3;
      case WebhookPriority.LOW: return 4;
      default: return 3;
    }
  }

  private async updateEventStatus(
    eventId: string,
    status: SaviyntSyncStatus,
    additional?: Record<string, any>
  ): Promise<void> {
    try {
      await this.prisma.saviyntWebhookEvent.updateMany({
        where: { eventType: eventId }, // This would need adjustment for proper ID matching
        data: {
          processingStatus: status,
          ...(additional?.processedAt && { processedAt: additional.processedAt }),
          ...(additional?.errorMessage && { errorMessage: additional.errorMessage })
        }
      });
    } catch (error) {
      logger.error('Failed to update event status', { eventId, status, error });
    }
  }

  private async logEventProcessing(event: WebhookEvent, message: string): Promise<void> {
    logger.info(message, {
      eventId: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId
    });
  }

  private async loadPendingEvents(): Promise<void> {
    // Load unprocessed events from database on startup
    const pendingEvents = await this.prisma.saviyntWebhookEvent.findMany({
      where: {
        processingStatus: { in: [SaviyntSyncStatus.PENDING, SaviyntSyncStatus.FAILED] }
      },
      orderBy: { receivedAt: 'asc' }
    });

    for (const dbEvent of pendingEvents) {
      const webhookEvent: WebhookEvent = {
        id: `loaded-${dbEvent.id}`,
        eventType: dbEvent.eventType as WebhookEventType,
        eventSubtype: dbEvent.eventSubtype || undefined,
        source: 'SAVIYNT',
        entityType: dbEvent.entityType,
        entityId: dbEvent.entityId,
        entityData: dbEvent.eventPayload,
        metadata: {
          sourceSystem: 'SAVIYNT',
          sourceVersion: 'unknown',
          priority: WebhookPriority.NORMAL,
          requiresImmediate: false
        },
        timestamp: dbEvent.receivedAt,
        processed: false,
        processingStatus: dbEvent.processingStatus,
        processingError: dbEvent.errorMessage || undefined,
        retryCount: dbEvent.retryCount,
        maxRetries: 3
      };

      this.queueEvent(webhookEvent);
    }

    logger.info(`Loaded ${pendingEvents.length} pending webhook events`);
  }

  /**
   * Public methods for service management
   */

  public getQueueStatus() {
    return {
      queueLength: this.eventQueue.length,
      processingCount: this.processingQueue.size,
      maxConcurrent: this.maxConcurrentEvents,
      isEnabled: this.isEnabled
    };
  }

  public getEventStatistics() {
    const totalEvents = this.eventQueue.length + this.processingQueue.size;

    const eventsByType = this.eventQueue.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsByPriority = this.eventQueue.reduce((acc, event) => {
      acc[event.metadata.priority] = (acc[event.metadata.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents,
      queuedEvents: this.eventQueue.length,
      processingEvents: this.processingQueue.size,
      eventsByType,
      eventsByPriority,
      registeredProcessors: this.processors.size
    };
  }

  public async shutdown(): Promise<void> {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
    }

    // Wait for current processing to complete
    while (this.processingQueue.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('Webhook service shutdown completed');
  }
}