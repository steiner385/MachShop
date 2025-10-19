/**
 * Kafka Event Publisher
 *
 * Publishes domain events to Kafka topics for consumption by other microservices.
 * Implements the EventPublisher interface with Kafka-specific logic.
 */

import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { BaseEvent, EventPublisher } from '../types/base';
import { v4 as uuidv4 } from 'uuid';

export interface KafkaPublisherConfig {
  clientId: string;
  brokers: string[];
  topic: string;
  retry?: {
    retries: number;
    initialRetryTime: number;
    maxRetryTime: number;
  };
}

export class KafkaEventPublisher implements EventPublisher {
  private kafka: Kafka;
  private producer: Producer;
  private topic: string;
  private isConnected: boolean = false;

  constructor(private config: KafkaPublisherConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: config.retry || {
        retries: 5,
        initialRetryTime: 300,
        maxRetryTime: 30000,
      },
    });

    this.producer = this.kafka.producer({
      idempotent: true, // Ensures exactly-once semantics
      maxInFlightRequests: 5,
      retry: config.retry,
    });

    this.topic = config.topic;
  }

  /**
   * Connect to Kafka broker
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log(`[KafkaPublisher] Connected to Kafka (topic: ${this.topic})`);
    } catch (error) {
      console.error('[KafkaPublisher] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka broker
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('[KafkaPublisher] Disconnected from Kafka');
    } catch (error) {
      console.error('[KafkaPublisher] Error disconnecting:', error);
      throw error;
    }
  }

  /**
   * Publish a single event
   */
  async publish<T>(event: BaseEvent<T>): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const message: ProducerRecord = {
        topic: this.topic,
        messages: [
          {
            key: event.meta.eventId,
            value: JSON.stringify(event),
            headers: {
              'event-type': event.type,
              'event-version': event.meta.version,
              'event-source': event.meta.source,
              'correlation-id': event.meta.correlationId || '',
              'causation-id': event.meta.causationId || '',
            },
            timestamp: new Date(event.meta.timestamp).getTime().toString(),
          },
        ],
      };

      const result = await this.producer.send(message);

      console.log(`[KafkaPublisher] Published event: ${event.type}`, {
        eventId: event.meta.eventId,
        partition: result[0].partition,
        offset: result[0].baseOffset,
      });
    } catch (error) {
      console.error(`[KafkaPublisher] Failed to publish event: ${event.type}`, error);
      throw error;
    }
  }

  /**
   * Publish multiple events in a batch
   */
  async publishBatch<T>(events: BaseEvent<T>[]): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    if (events.length === 0) return;

    try {
      const messages = events.map((event) => ({
        key: event.meta.eventId,
        value: JSON.stringify(event),
        headers: {
          'event-type': event.type,
          'event-version': event.meta.version,
          'event-source': event.meta.source,
          'correlation-id': event.meta.correlationId || '',
          'causation-id': event.meta.causationId || '',
        },
        timestamp: new Date(event.meta.timestamp).getTime().toString(),
      }));

      const message: ProducerRecord = {
        topic: this.topic,
        messages,
      };

      const result = await this.producer.send(message);

      console.log(`[KafkaPublisher] Published batch of ${events.length} events`, {
        firstEventId: events[0].meta.eventId,
        partition: result[0].partition,
        offset: result[0].baseOffset,
      });
    } catch (error) {
      console.error('[KafkaPublisher] Failed to publish batch', error);
      throw error;
    }
  }
}

/**
 * Helper function to create event metadata
 */
export function createEventMetadata(
  source: string,
  userId?: string,
  correlationId?: string,
  causationId?: string
) {
  return {
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    source,
    version: '1.0',
    userId,
    correlationId,
    causationId,
  };
}
