/**
 * @mes/events - Shared Event Library
 *
 * Central package for event-driven communication between MES microservices.
 * Provides type-safe event definitions, publishers, and consumers.
 */

// Base types
export * from './types/base';

// Domain event types
export * from './types/events';

// Publishers
export * from './publishers/KafkaEventPublisher';

// Consumers
export * from './consumers/KafkaEventConsumer';

// Utilities (to be implemented)
// export * from './utils/eventHelpers';
