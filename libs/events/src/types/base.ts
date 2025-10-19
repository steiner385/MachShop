/**
 * Base Event Interfaces for MES Microservices
 *
 * All domain events inherit from these base interfaces to ensure
 * consistency across the event-driven architecture.
 */

/**
 * Base event metadata included in all events
 */
export interface EventMetadata {
  /** Unique event ID (UUID) */
  eventId: string;

  /** Event timestamp (ISO 8601) */
  timestamp: string;

  /** Service that published the event */
  source: string;

  /** Event version for schema evolution */
  version: string;

  /** Correlation ID for request tracing */
  correlationId?: string;

  /** Causation ID (ID of event that caused this event) */
  causationId?: string;

  /** User ID who triggered the event */
  userId?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Base interface for all domain events
 */
export interface BaseEvent<T = any> {
  /** Event type (e.g., 'work-order.created') */
  type: string;

  /** Event metadata */
  meta: EventMetadata;

  /** Event payload */
  data: T;
}

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (event: BaseEvent<T>) => Promise<void>;

/**
 * Event publisher interface
 */
export interface EventPublisher {
  publish<T>(event: BaseEvent<T>): Promise<void>;
  publishBatch<T>(events: BaseEvent<T>[]): Promise<void>;
}

/**
 * Event consumer interface
 */
export interface EventConsumer {
  subscribe<T>(eventType: string, handler: EventHandler<T>): Promise<void>;
  unsubscribe(eventType: string): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Idempotency record for event deduplication
 */
export interface IdempotencyRecord {
  eventId: string;
  eventType: string;
  consumedAt: Date;
  consumerId: string;
  status: 'processing' | 'completed' | 'failed';
  retryCount?: number;
  lastError?: string;
}

/**
 * Event schema for validation
 */
export interface EventSchema {
  type: string;
  version: string;
  dataSchema: any; // JSON Schema
}
