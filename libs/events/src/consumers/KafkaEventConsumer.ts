/**
 * Kafka Event Consumer
 *
 * Consumes domain events from Kafka topics with idempotent processing.
 * Implements the EventConsumer interface with Kafka-specific logic.
 */

import {
  Kafka,
  Consumer,
  ConsumerSubscribeTopics,
  EachMessagePayload,
  ConsumerRunConfig,
} from 'kafkajs';
import { BaseEvent, EventConsumer, EventHandler } from '../types/base';

export interface KafkaConsumerConfig {
  clientId: string;
  groupId: string;
  brokers: string[];
  topic: string;
  fromBeginning?: boolean;
  sessionTimeout?: number;
  heartbeatInterval?: number;
  autoCommit?: boolean;
  autoCommitInterval?: number;
}

export class KafkaEventConsumer implements EventConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private topic: string;
  private handlers: Map<string, EventHandler[]> = new Map();
  private isRunning: boolean = false;
  private fromBeginning: boolean;

  constructor(private config: KafkaConsumerConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
    });

    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: config.sessionTimeout || 30000,
      heartbeatInterval: config.heartbeatInterval || 3000,
      retry: {
        retries: 5,
        initialRetryTime: 300,
        maxRetryTime: 30000,
      },
    });

    this.topic = config.topic;
    this.fromBeginning = config.fromBeginning ?? false;
  }

  /**
   * Subscribe to a specific event type
   */
  async subscribe<T>(eventType: string, handler: EventHandler<T>): Promise<void> {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler as EventHandler);

    console.log(`[KafkaConsumer] Subscribed to event type: ${eventType}`);
  }

  /**
   * Unsubscribe from a specific event type
   */
  async unsubscribe(eventType: string): Promise<void> {
    this.handlers.delete(eventType);
    console.log(`[KafkaConsumer] Unsubscribed from event type: ${eventType}`);
  }

  /**
   * Start consuming events from Kafka
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[KafkaConsumer] Already running');
      return;
    }

    try {
      // Connect to Kafka
      await this.consumer.connect();
      console.log(`[KafkaConsumer] Connected to Kafka (group: ${this.config.groupId})`);

      // Subscribe to topic
      const subscribeConfig: ConsumerSubscribeTopics = {
        topics: [this.topic],
        fromBeginning: this.fromBeginning,
      };
      await this.consumer.subscribe(subscribeConfig);
      console.log(`[KafkaConsumer] Subscribed to topic: ${this.topic}`);

      // Start consuming
      const runConfig: ConsumerRunConfig = {
        autoCommit: this.config.autoCommit ?? true,
        autoCommitInterval: this.config.autoCommitInterval ?? 5000,
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      };

      await this.consumer.run(runConfig);
      this.isRunning = true;

      console.log('[KafkaConsumer] Started consuming events');
    } catch (error) {
      console.error('[KafkaConsumer] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Stop consuming events
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.consumer.disconnect();
      this.isRunning = false;
      console.log('[KafkaConsumer] Stopped and disconnected');
    } catch (error) {
      console.error('[KafkaConsumer] Error stopping:', error);
      throw error;
    }
  }

  /**
   * Handle incoming Kafka message
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    if (!message.value) {
      console.warn('[KafkaConsumer] Received message with no value');
      return;
    }

    try {
      // Parse event from message
      const event: BaseEvent = JSON.parse(message.value.toString());

      // Log received event
      console.log(`[KafkaConsumer] Received event: ${event.type}`, {
        eventId: event.meta.eventId,
        partition,
        offset: message.offset,
      });

      // Get handlers for this event type
      const handlers = this.handlers.get(event.type);

      if (!handlers || handlers.length === 0) {
        console.log(`[KafkaConsumer] No handlers registered for: ${event.type}`);
        return;
      }

      // Execute all handlers for this event type
      for (const handler of handlers) {
        try {
          await handler(event);
          console.log(`[KafkaConsumer] Handler executed successfully for: ${event.type}`);
        } catch (handlerError) {
          console.error(
            `[KafkaConsumer] Handler failed for event: ${event.type}`,
            {
              eventId: event.meta.eventId,
              error: handlerError,
            }
          );

          // Rethrow to trigger Kafka retry
          throw handlerError;
        }
      }
    } catch (error) {
      console.error('[KafkaConsumer] Error processing message:', {
        topic,
        partition,
        offset: message.offset,
        error,
      });

      // Rethrow to prevent commit and trigger retry
      throw error;
    }
  }

  /**
   * Subscribe to multiple event types at once
   */
  async subscribeMany(
    subscriptions: Array<{ eventType: string; handler: EventHandler }>
  ): Promise<void> {
    for (const { eventType, handler } of subscriptions) {
      await this.subscribe(eventType, handler);
    }
  }

  /**
   * Get list of subscribed event types
   */
  getSubscriptions(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if consumer is running
   */
  isConsumerRunning(): boolean {
    return this.isRunning;
  }
}

/**
 * Helper function to create idempotent event handler
 *
 * Wraps an event handler with idempotency checking to prevent duplicate processing.
 * Requires a Prisma client instance to track processed events.
 *
 * @param handler - The actual event handler function
 * @param checkIdempotency - Function to check if event was already processed
 * @param markProcessing - Function to mark event as being processed
 * @param markCompleted - Function to mark event as completed
 * @param markFailed - Function to mark event as failed
 */
export function createIdempotentHandler<T>(
  handler: EventHandler<T>,
  options: {
    consumerId: string;
    checkIdempotency: (eventId: string) => Promise<boolean>;
    markProcessing: (eventId: string, eventType: string) => Promise<void>;
    markCompleted: (eventId: string) => Promise<void>;
    markFailed: (eventId: string, error: string) => Promise<void>;
  }
): EventHandler<T> {
  return async (event: BaseEvent<T>): Promise<void> => {
    const { eventId, source } = event.meta;

    // Check if already processed
    const alreadyProcessed = await options.checkIdempotency(eventId);
    if (alreadyProcessed) {
      console.log(`[IdempotentHandler] Event already processed, skipping: ${eventId}`);
      return;
    }

    // Mark as processing
    await options.markProcessing(eventId, event.type);

    try {
      // Execute handler
      await handler(event);

      // Mark as completed
      await options.markCompleted(eventId);

      console.log(`[IdempotentHandler] Event processed successfully: ${eventId}`);
    } catch (error) {
      // Mark as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      await options.markFailed(eventId, errorMessage);

      console.error(`[IdempotentHandler] Event processing failed: ${eventId}`, error);

      // Rethrow to trigger Kafka retry
      throw error;
    }
  };
}
