# @mes/events - Shared Event Library

**Version:** 1.0.0
**Status:** In Development - Phase 2

A shared TypeScript library for event-driven communication across MES microservices using Apache Kafka.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Event Architecture](#event-architecture)
4. [Publishing Events](#publishing-events)
5. [Consuming Events](#consuming-events)
6. [Event Types](#event-types)
7. [Idempotency](#idempotency)
8. [Best Practices](#best-practices)
9. [Examples](#examples)

---

## Overview

The MES system uses event-driven architecture to enable loose coupling between microservices. This shared library provides:

- **Type-safe event definitions** - Strongly typed events for all domain models
- **Event publishers** - Kafka-based publishers with retry logic
- **Event consumers** - Idempotent consumers with error handling
- **Event metadata** - Correlation IDs, causation tracking, timestamps
- **Schema validation** - Runtime validation of event payloads

### Benefits

- **Loose Coupling** - Services communicate via events, not direct API calls
- **Scalability** - Asynchronous processing handles high loads
- **Resilience** - Services can be offline temporarily without data loss
- **Audit Trail** - Complete event history for traceability
- **Eventual Consistency** - Data synchronized across services eventually

---

## Installation

Install the package in your microservice:

```bash
npm install @mes/events
```

Ensure Kafka dependencies are installed:

```bash
npm install kafkajs uuid
npm install -D @types/uuid
```

---

## Event Architecture

### Event Flow

```
┌─────────────┐       ┌───────┐       ┌─────────────┐
│  Service A  │──────>│ Kafka │──────>│  Service B  │
│ (Publisher) │       │ Topic │       │ (Consumer)  │
└─────────────┘       └───────┘       └─────────────┘
                          │
                          ├──────────>┌─────────────┐
                          │           │  Service C  │
                          │           │ (Consumer)  │
                          │           └─────────────┘
                          │
                          └──────────>┌─────────────┐
                                      │  Service D  │
                                      │ (Consumer)  │
                                      └─────────────┘
```

### Event Structure

Every event follows this structure:

```typescript
interface BaseEvent<T> {
  type: string;           // Event type (e.g., 'work-order.created')
  meta: EventMetadata;    // Metadata (ID, timestamp, source, etc.)
  data: T;                // Event payload (domain-specific)
}
```

### Event Metadata

```typescript
interface EventMetadata {
  eventId: string;          // Unique UUID
  timestamp: string;        // ISO 8601 timestamp
  source: string;           // Publishing service name
  version: string;          // Event schema version
  correlationId?: string;   // Request correlation ID
  causationId?: string;     // ID of event that caused this event
  userId?: string;          // User who triggered the event
}
```

---

## Publishing Events

### Basic Usage

```typescript
import { KafkaEventPublisher, createEventMetadata, EventTypes } from '@mes/events';

// Initialize publisher
const publisher = new KafkaEventPublisher({
  clientId: 'work-order-service',
  brokers: ['localhost:9092'],
  topic: 'mes-events',
});

await publisher.connect();

// Publish an event
await publisher.publish({
  type: EventTypes.WORK_ORDER_CREATED,
  meta: createEventMetadata('work-order-service', 'user-123'),
  data: {
    workOrderId: 'wo-001',
    workOrderNumber: 'WO-2025-001',
    partId: 'part-123',
    partNumber: 'BRK-001',
    quantity: 100,
    dueDate: '2025-11-01T00:00:00Z',
    priority: 'HIGH',
    createdBy: 'user-123',
  },
});
```

### Batch Publishing

```typescript
const events = [
  {
    type: Event Types.MATERIAL_RECEIVED,
    meta: createEventMetadata('material-service', 'user-456'),
    data: { /* ... */ },
  },
  {
    type: EventTypes.LOT_CREATED,
    meta: createEventMetadata('material-service', 'user-456'),
    data: { /* ... */ },
  },
];

await publisher.publishBatch(events);
```

### In a Service

```typescript
// src/services/WorkOrderService.ts
import { publisher } from './eventPublisher';
import { EventTypes } from '@mes/events';

class WorkOrderService {
  async createWorkOrder(data: CreateWorkOrderDto): Promise<WorkOrder> {
    // Create work order in database
    const workOrder = await prisma.workOrder.create({ data });

    // Publish event
    await publisher.publish({
      type: EventTypes.WORK_ORDER_CREATED,
      meta: createEventMetadata('work-order-service', data.createdBy),
      data: {
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.workOrderNumber,
        partId: workOrder.partId,
        partNumber: workOrder.partNumber,
        quantity: workOrder.quantity,
        dueDate: workOrder.dueDate.toISOString(),
        priority: workOrder.priority,
        createdBy: data.createdBy,
      },
    });

    return workOrder;
  }
}
```

---

## Consuming Events

### Basic Consumer

```typescript
import { KafkaEventConsumer, EventTypes } from '@mes/events';

// Initialize consumer
const consumer = new KafkaEventConsumer({
  clientId: 'quality-service',
  groupId: 'quality-service-group',
  brokers: ['localhost:9092'],
  topic: 'mes-events',
  fromBeginning: false,  // Only consume new messages
});

// Subscribe to events
await consumer.subscribe(EventTypes.WORK_ORDER_COMPLETED, async (event) => {
  console.log('Work order completed:', event.data);

  // Process the event (create inspection, etc.)
  await qualityService.createInspection({
    workOrderId: event.data.workOrderId,
    quantity: event.data.quantityCompleted,
  });
});

await consumer.start();
```

### Idempotent Processing

```typescript
import { createIdempotentHandler } from '@mes/events';

// Create idempotent handler wrapper
const idempotentHandler = createIdempotentHandler(
  async (event) => {
    // Process event
    await traceabilityService.recordMaterialReceived(event.data);
  },
  {
    consumerId: 'traceability-service',

    checkIdempotency: async (eventId: string) => {
      const record = await prisma.idempotencyRecord.findUnique({
        where: { eventId },
      });
      return record?.status === 'completed';
    },

    markProcessing: async (eventId: string, eventType: string) => {
      await prisma.idempotencyRecord.upsert({
        where: { eventId },
        create: {
          eventId,
          eventType,
          consumerId: 'traceability-service',
          status: 'processing',
        },
        update: { status: 'processing' },
      });
    },

    markCompleted: async (eventId: string) => {
      await prisma.idempotencyRecord.update({
        where: { eventId },
        data: { status: 'completed', consumedAt: new Date() },
      });
    },

    markFailed: async (eventId: string, error: string) => {
      await prisma.idempotencyRecord.update({
        where: { eventId },
        data: {
          status: 'failed',
          lastError: error,
          retryCount: { increment: 1 },
        },
      });
    },
  }
);

// Subscribe with idempotent handler
await consumer.subscribe(EventTypes.MATERIAL_RECEIVED, idempotentHandler);
```

---

## Event Types

### Work Order Events

- `work-order.created` - New work order created
- `work-order.updated` - Work order details updated
- `work-order.started` - Work order production started
- `work-order.completed` - Work order production completed
- `work-order.cancelled` - Work order cancelled

### Quality Events

- `quality.inspection.created` - Quality inspection initiated
- `quality.inspection.completed` - Inspection completed (pass/fail)
- `quality.inspection.failed` - Inspection failed
- `quality.ncr.created` - Non-conformance report created
- `quality.ncr.closed` - NCR resolved and closed
- `quality.fai.approved` - First Article Inspection approved
- `quality.fai.rejected` - FAI rejected

### Material Events

- `material.received` - Material received from supplier
- `material.issued` - Material issued to production
- `material.returned` - Material returned to inventory
- `material.lot.created` - New lot created
- `material.serial.generated` - Serial number generated
- `material.inventory.adjusted` - Inventory adjustment

### Traceability Events

- `traceability.event.created` - New traceability event recorded
- `traceability.lot.genealogy.updated` - Lot genealogy updated
- `traceability.serial.genealogy.updated` - Serial genealogy updated
- `traceability.recall.initiated` - Product recall initiated

### Cache Invalidation Events

- `cache.invalidate` - Cache invalidation requested

---

## Idempotency

### Why Idempotency?

Kafka provides "at-least-once" delivery semantics, meaning events may be delivered multiple times. Idempotency ensures that processing an event multiple times has the same effect as processing it once.

### Implementation

1. **Event ID Tracking** - Store processed event IDs in database
2. **Status Tracking** - Track processing, completed, failed states
3. **Retry Logic** - Retry failed events with exponential backoff
4. **Deduplication Window** - Keep records for reasonable time period

### Schema

```sql
CREATE TABLE idempotency_records (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  consumer_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  consumed_at TIMESTAMP,
  retry_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_idempotency_event_type ON idempotency_records(event_type);
CREATE INDEX idx_idempotency_consumed_at ON idempotency_records(consumed_at);
```

---

## Best Practices

### Event Design

1. **Make Events Immutable** - Never modify published events
2. **Include All Necessary Data** - Consumers shouldn't need to fetch additional data
3. **Use Business Language** - Event names should reflect domain concepts
4. **Version Events** - Include version in metadata for schema evolution
5. **Keep Events Small** - Don't include entire entity, just changed data

### Publishing

1. **Publish After Commit** - Only publish events after database transaction commits
2. **Use Correlation IDs** - Track request flow across services
3. **Set Causation IDs** - Link events that cause other events
4. **Batch When Possible** - Reduce network overhead

### Consuming

1. **Be Idempotent** - Always implement idempotency checks
2. **Handle Failures Gracefully** - Log errors, retry with backoff
3. **Process Quickly** - Don't block event loop with long operations
4. **Monitor Lag** - Track consumer lag and alert if growing

### Error Handling

1. **Retry Transient Errors** - Network failures, temporary database issues
2. **Dead Letter Queue** - Move permanently failed events to DLQ
3. **Alert on Failures** - Monitor and alert on high error rates
4. **Log Everything** - Comprehensive logging for debugging

---

## Examples

### Complete Service Setup

```typescript
// src/events/publisher.ts
import { KafkaEventPublisher } from '@mes/events';

export const publisher = new KafkaEventPublisher({
  clientId: process.env.SERVICE_NAME!,
  brokers: process.env.KAFKA_BROKERS!.split(','),
  topic: 'mes-events',
});

// Initialize on startup
publisher.connect().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await publisher.disconnect();
});
```

### Event Correlation

```typescript
// Service A publishes event
const workOrderEvent = {
  type: EventTypes.WORK_ORDER_CREATED,
  meta: createEventMetadata(
    'work-order-service',
    'user-123',
    'req-correlation-id' // From HTTP request
  ),
  data: { /* ... */ },
};

await publisher.publish(workOrderEvent);

// Service B consumes and publishes related event
await consumer.subscribe(EventTypes.WORK_ORDER_CREATED, async (event) => {
  // Create material reservation
  const reservation = await createReservation(event.data);

  // Publish with correlation and causation
  await publisher.publish({
    type: EventTypes.MATERIAL_RESERVED,
    meta: createEventMetadata(
      'material-service',
      'system',
      event.meta.correlationId,  // Same correlation ID
      event.meta.eventId          // Causation: this event caused by work order created
    ),
    data: { /* ... */ },
  });
});
```

---

## Next Steps

1. **Implement Consumers** - Create KafkaEventConsumer class
2. **Add Schema Validation** - Validate event payloads at runtime
3. **Implement Saga Orchestration** - Coordinate distributed transactions
4. **Add Monitoring** - Prometheus metrics for event publishing/consuming
5. **Create Event Replay** - Ability to replay events for debugging
6. **Build Event Store** - Persist all events for event sourcing

---

**Last Updated:** October 19, 2025
**Maintainer:** MES Development Team
