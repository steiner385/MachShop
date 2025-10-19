# Event Integration Guide

**Version:** 1.0.0
**Last Updated:** October 19, 2025
**Status:** Ready for Implementation

This guide explains how to integrate the `@mes/events` library into MES microservices for event-driven communication.

---

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Publishing Events](#publishing-events)
4. [Consuming Events](#consuming-events)
5. [Service-Specific Examples](#service-specific-examples)
6. [Best Practices](#best-practices)
7. [Testing](#testing)

---

## Overview

The MES platform uses event-driven architecture to enable loose coupling between microservices. Each service can publish events when domain objects change, and consume events from other services to stay synchronized.

**Benefits:**
- Loose coupling between services
- Asynchronous processing
- Complete audit trail
- Scalability and resilience
- Eventual consistency

---

## Setup

### 1. Install Dependencies

The `@mes/events` library is already installed in all 8 microservices:

```json
{
  "dependencies": {
    "@mes/events": "file:../../libs/events"
  }
}
```

### 2. Configure Environment Variables

Add Kafka configuration to your service's `.env` file:

```bash
# Kafka Configuration
KAFKA_BROKERS=localhost:9092,localhost:9093,localhost:9094
KAFKA_CLIENT_ID=work-order-service
KAFKA_TOPIC=mes-events
SERVICE_NAME=work-order-service
```

### 3. Create Event Publisher Instance

Create `src/events/publisher.ts` in your service:

```typescript
import { KafkaEventPublisher } from '@mes/events';
import { config } from '../config/config';

export const publisher = new KafkaEventPublisher({
  clientId: config.kafkaClientId,
  brokers: config.kafkaBrokers.split(','),
  topic: config.kafkaTopic || 'mes-events',
  retry: {
    retries: 5,
    initialRetryTime: 300,
    maxRetryTime: 30000,
  },
});

// Initialize on startup
export async function initializePublisher() {
  try {
    await publisher.connect();
    console.log('[EventPublisher] Connected successfully');
  } catch (error) {
    console.error('[EventPublisher] Failed to connect:', error);
    throw error;
  }
}

// Graceful shutdown
export async function shutdownPublisher() {
  try {
    await publisher.disconnect();
    console.log('[EventPublisher] Disconnected successfully');
  } catch (error) {
    console.error('[EventPublisher] Error during shutdown:', error);
  }
}
```

### 4. Initialize in Server Startup

Update your `src/index.ts`:

```typescript
import { initializePublisher, shutdownPublisher } from './events/publisher';

async function startServer() {
  // ... existing code ...

  // Initialize event publisher
  await initializePublisher();

  // Start HTTP server
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await shutdownPublisher();
    process.exit(0);
  });
}
```

---

## Publishing Events

### Basic Pattern

Publish events AFTER successfully committing database transactions:

```typescript
import { publisher } from '../events/publisher';
import { EventTypes, createEventMetadata } from '@mes/events';

async function createWorkOrder(data: CreateWorkOrderDto): Promise<WorkOrder> {
  // 1. Perform database transaction
  const workOrder = await prisma.workOrder.create({ data });

  // 2. Publish event AFTER commit
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
```

### Event Correlation

Use correlation IDs to track requests across services:

```typescript
async function createWorkOrder(
  data: CreateWorkOrderDto,
  correlationId?: string
): Promise<WorkOrder> {
  const workOrder = await prisma.workOrder.create({ data });

  await publisher.publish({
    type: EventTypes.WORK_ORDER_CREATED,
    meta: createEventMetadata(
      'work-order-service',
      data.createdBy,
      correlationId  // Pass through correlation ID
    ),
    data: { /* ... */ },
  });

  return workOrder;
}
```

### Batch Publishing

For bulk operations, use batch publishing:

```typescript
async function bulkCreateWorkOrders(items: CreateWorkOrderDto[]): Promise<WorkOrder[]> {
  // Create all work orders
  const workOrders = await prisma.$transaction(
    items.map(item => prisma.workOrder.create({ data: item }))
  );

  // Publish all events in one batch
  const events = workOrders.map(wo => ({
    type: EventTypes.WORK_ORDER_CREATED,
    meta: createEventMetadata('work-order-service', wo.createdBy),
    data: {
      workOrderId: wo.id,
      workOrderNumber: wo.workOrderNumber,
      // ... other fields
    },
  }));

  await publisher.publishBatch(events);

  return workOrders;
}
```

---

## Consuming Events

### Setup Consumer

Create `src/events/consumer.ts`:

```typescript
import { KafkaEventConsumer, EventTypes } from '@mes/events';
import { config } from '../config/config';
import { handleWorkOrderCompleted } from './handlers/workOrderHandlers';

export const consumer = new KafkaEventConsumer({
  clientId: config.kafkaClientId,
  groupId: `${config.serviceName}-group`,
  brokers: config.kafkaBrokers.split(','),
  topic: config.kafkaTopic || 'mes-events',
  fromBeginning: false,
});

export async function initializeConsumer() {
  // Subscribe to events
  await consumer.subscribe(EventTypes.WORK_ORDER_COMPLETED, handleWorkOrderCompleted);

  // Start consuming
  await consumer.start();
  console.log('[EventConsumer] Started successfully');
}

export async function shutdownConsumer() {
  await consumer.stop();
  console.log('[EventConsumer] Stopped successfully');
}
```

### Create Event Handlers

Create `src/events/handlers/workOrderHandlers.ts`:

```typescript
import { BaseEvent, WorkOrderCompletedData, createIdempotentHandler } from '@mes/events';
import { prisma } from '../../config/database';
import { qualityService } from '../../services/qualityService';

export const handleWorkOrderCompleted = createIdempotentHandler(
  async (event: BaseEvent<WorkOrderCompletedData>) => {
    console.log('Processing work order completed event:', event.data.workOrderId);

    // Create quality inspection
    await qualityService.createInspection({
      workOrderId: event.data.workOrderId,
      quantityToInspect: event.data.quantityCompleted,
      inspectionType: 'FINAL',
    });
  },
  {
    consumerId: 'quality-service',

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
          consumerId: 'quality-service',
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
```

---

## Service-Specific Examples

### Work Order Service

**Events to Publish:**
- `work-order.created` - When work order is created
- `work-order.updated` - When work order details change
- `work-order.started` - When production starts
- `work-order.completed` - When production completes
- `work-order.cancelled` - When work order is cancelled

**Example:**

```typescript
// src/services/WorkOrderService.ts
import { publisher } from '../events/publisher';
import { EventTypes, createEventMetadata } from '@mes/events';

export class WorkOrderService {
  async completeWorkOrder(id: string, data: CompleteWorkOrderDto) {
    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        quantityCompleted: data.quantityCompleted,
        quantityRejected: data.quantityRejected,
        completedAt: new Date(),
        completedBy: data.completedBy,
      },
    });

    // Publish completion event
    await publisher.publish({
      type: EventTypes.WORK_ORDER_COMPLETED,
      meta: createEventMetadata('work-order-service', data.completedBy),
      data: {
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.workOrderNumber,
        quantityCompleted: workOrder.quantityCompleted!,
        quantityRejected: workOrder.quantityRejected!,
        completedAt: workOrder.completedAt!.toISOString(),
        completedBy: data.completedBy,
      },
    });

    return workOrder;
  }
}
```

### Quality Service

**Events to Publish:**
- `quality.inspection.created`
- `quality.inspection.completed`
- `quality.inspection.failed`
- `quality.ncr.created`
- `quality.ncr.closed`
- `quality.fai.approved`
- `quality.fai.rejected`

**Events to Consume:**
- `work-order.completed` → Create inspection

**Example:**

```typescript
// src/services/InspectionService.ts
export class InspectionService {
  async completeInspection(id: string, data: CompleteInspectionDto) {
    const inspection = await prisma.inspection.update({
      where: { id },
      data: {
        result: data.result,
        quantityAccepted: data.quantityAccepted,
        quantityRejected: data.quantityRejected,
        inspectedBy: data.inspectedBy,
        inspectionDate: new Date(),
      },
    });

    // Publish inspection completed event
    await publisher.publish({
      type: EventTypes.QUALITY_INSPECTION_COMPLETED,
      meta: createEventMetadata('quality-service', data.inspectedBy),
      data: {
        inspectionId: inspection.id,
        inspectionNumber: inspection.inspectionNumber,
        workOrderId: inspection.workOrderId,
        result: inspection.result,
        quantityInspected: data.quantityAccepted + data.quantityRejected,
        quantityAccepted: data.quantityAccepted,
        quantityRejected: data.quantityRejected,
        ncrGenerated: data.result === 'FAIL',
        inspectedBy: data.inspectedBy,
        inspectionDate: inspection.inspectionDate!.toISOString(),
      },
    });

    return inspection;
  }
}
```

### Material Service

**Events to Publish:**
- `material.received`
- `material.issued`
- `material.returned`
- `material.lot.created`
- `material.serial.generated`
- `material.inventory.adjusted`

**Events to Consume:**
- `work-order.created` → Reserve material
- `work-order.completed` → Update inventory

### Traceability Service

**Events to Publish:**
- `traceability.event.created`
- `traceability.lot.genealogy.updated`
- `traceability.serial.genealogy.updated`
- `traceability.recall.initiated`

**Events to Consume:**
- `material.received` → Record traceability event
- `material.issued` → Record traceability event
- `work-order.completed` → Update genealogy
- `quality.inspection.completed` → Record quality event

---

## Best Practices

### 1. Publish After Commit

Always publish events AFTER database transactions commit:

```typescript
// ✅ GOOD
const workOrder = await prisma.workOrder.create({ data });
await publisher.publish(event);  // After DB commit

// ❌ BAD
await publisher.publish(event);
const workOrder = await prisma.workOrder.create({ data });  // Might fail
```

### 2. Include Complete Data

Event consumers shouldn't need to fetch additional data:

```typescript
// ✅ GOOD - Complete data
data: {
  workOrderId: workOrder.id,
  workOrderNumber: workOrder.workOrderNumber,
  partId: workOrder.partId,
  partNumber: workOrder.partNumber,  // Include denormalized data
  quantity: workOrder.quantity,
}

// ❌ BAD - Incomplete data
data: {
  workOrderId: workOrder.id,  // Consumer has to fetch the rest
}
```

### 3. Use Correlation IDs

Track requests across services:

```typescript
// In HTTP route handler
app.post('/work-orders', async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();

  const workOrder = await workOrderService.createWorkOrder(
    req.body,
    correlationId
  );

  res.json(workOrder);
});
```

### 4. Handle Failures Gracefully

Log errors but don't crash the service:

```typescript
try {
  await publisher.publish(event);
} catch (error) {
  console.error('Failed to publish event:', error);
  // Don't throw - the DB operation already succeeded
  // Consider implementing a dead letter queue or retry mechanism
}
```

### 5. Implement Idempotency

Always use idempotent event handlers:

```typescript
// Use the createIdempotentHandler wrapper
export const handleEvent = createIdempotentHandler(
  async (event) => {
    // Process event
  },
  {
    consumerId: 'my-service',
    checkIdempotency: async (eventId) => { /* ... */ },
    markProcessing: async (eventId, eventType) => { /* ... */ },
    markCompleted: async (eventId) => { /* ... */ },
    markFailed: async (eventId, error) => { /* ... */ },
  }
);
```

---

## Testing

### Unit Testing Event Publishing

```typescript
import { publisher } from '../events/publisher';

jest.mock('../events/publisher');

describe('WorkOrderService', () => {
  it('should publish event when work order is created', async () => {
    const mockPublish = jest.spyOn(publisher, 'publish');

    await workOrderService.createWorkOrder(mockData);

    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EventTypes.WORK_ORDER_CREATED,
        data: expect.objectContaining({
          workOrderNumber: mockData.workOrderNumber,
        }),
      })
    );
  });
});
```

### Integration Testing Event Consumers

```typescript
import { consumer } from '../events/consumer';
import { EventTypes, createEventMetadata } from '@mes/events';

describe('Work Order Event Consumer', () => {
  it('should create inspection when work order completes', async () => {
    const event = {
      type: EventTypes.WORK_ORDER_COMPLETED,
      meta: createEventMetadata('test-service', 'test-user'),
      data: {
        workOrderId: 'wo-123',
        quantityCompleted: 100,
        // ... other fields
      },
    };

    // Manually trigger handler (don't actually start consumer)
    await handleWorkOrderCompleted(event);

    const inspection = await prisma.inspection.findFirst({
      where: { workOrderId: 'wo-123' },
    });

    expect(inspection).toBeDefined();
  });
});
```

---

## Next Steps

1. **Add Idempotency Tables**: Add the `idempotencyRecord` table to all service schemas
2. **Wire Up Publishers**: Implement event publishing in service operations
3. **Wire Up Consumers**: Implement event handlers for cross-service communication
4. **Add Monitoring**: Track event publishing/consuming metrics with Prometheus
5. **Implement Saga Orchestration**: Coordinate distributed transactions

---

**Last Updated:** October 19, 2025
**Maintainer:** MES Development Team
