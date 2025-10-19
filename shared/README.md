# MES Shared Libraries
## Phase 2, Task 2.3: Database Per Service Pattern

This directory contains shared libraries for cross-service communication in the microservices architecture.

---

## 📚 Libraries

### 1. Reference Data Cache (`cache/ReferenceDataCache.ts`)

**Purpose**: Redis-backed distributed cache for cross-service reference data access without direct database queries.

**Features**:
- TTL-based expiration
- Bulk operations (getMany/setMany)
- Pattern-based invalidation
- Automatic cache warming
- Health checks and statistics

**Usage**:

```typescript
import ReferenceDataCache, { CacheKeyPrefix } from './shared/cache/ReferenceDataCache';

// Initialize cache
const cache = new ReferenceDataCache(
  process.env.REDIS_URL || 'redis://localhost:6379',
  { defaultTTL: 300 } // 5 minutes
);

await cache.connect(); // Not needed, but recommended

// Cache a part from Material Service for use in Work Order Service
await cache.set(
  CacheKeyPrefix.PART,
  'P-12345',
  {
    partNumber: 'P-12345',
    partName: 'Landing Gear Strut',
    revision: 'C',
    unitOfMeasure: 'EA'
  },
  { ttl: 300 }
);

// Retrieve cached part
const part = await cache.get(CacheKeyPrefix.PART, 'P-12345');

// Bulk retrieval
const partIds = ['P-12345', 'P-67890', 'P-11111'];
const parts = await cache.getMany(CacheKeyPrefix.PART, partIds);

// Invalidate when part is updated
await cache.invalidate(CacheKeyPrefix.PART, 'P-12345');

// Invalidate all parts
await cache.invalidateAll(CacheKeyPrefix.PART);

// Cache warming on service startup
await cache.warmCache(
  CacheKeyPrefix.PART,
  async () => {
    // Load all active parts from database
    const parts = await prisma.part.findMany({ where: { isActive: true } });
    return new Map(parts.map(p => [p.id, { partNumber: p.partNumber, partName: p.partName }]));
  },
  { ttl: 600, enableCacheWarming: true, warmingInterval: 300 }
);

// Health check
const isHealthy = await cache.healthCheck();

// Get statistics
const stats = await cache.getStats(CacheKeyPrefix.PART);
console.log(`Cached parts: ${stats.totalKeys}, Memory: ${stats.memoryUsage}`);
```

**Cache Key Prefixes**:
```typescript
enum CacheKeyPrefix {
  USER = 'user',
  PART = 'part',
  WORK_CENTER = 'work_center',
  SITE = 'site',
  AREA = 'area',
  PRODUCT = 'product',
  ROUTING = 'routing',
  OPERATION = 'operation',
  SKILL = 'skill',
  TOOL = 'tool',
}
```

---

### 2. Event Publisher (`events/EventPublisher.ts`)

**Purpose**: Kafka-based event publishing for cross-service communication and cache synchronization.

**Features**:
- CloudEvents 1.0 compliant
- Automatic partitioning by entity ID
- Batch publishing
- Transactional support
- Guaranteed delivery with retries

**Usage**:

```typescript
import EventPublisher from './shared/events/EventPublisher';
import {
  createDomainEvent,
  MaterialEventTypes,
  PartUpdatedPayload
} from './shared/events/types';

// Initialize publisher
const publisher = new EventPublisher({
  clientId: 'material-service',
  brokers: ['localhost:9092'],
  retries: 8,
  idempotent: true
});

await publisher.connect();

// Publish part updated event
const event = createDomainEvent<PartUpdatedPayload>(
  MaterialEventTypes.PART_UPDATED,
  'material-service',
  {
    partId: 'P-12345',
    partNumber: 'P-99999', // New part number
    partName: 'Landing Gear Strut',
    changes: { partNumber: 'P-99999' },
    previousValues: { partNumber: 'P-12345' }
  },
  {
    entityId: 'P-12345',
    entityType: 'Part',
    metadata: { userId: 'user-123', action: 'update' }
  }
);

await publisher.publish(event);

// Batch publishing
const events = [event1, event2, event3];
await publisher.publishBatch(events);

// Transactional publishing
await publisher.publishTransactional(
  [event],
  async () => {
    // Database operations that must succeed
    await prisma.part.update({
      where: { id: 'P-12345' },
      data: { partNumber: 'P-99999' }
    });
  }
);

// Health check
const isHealthy = await publisher.healthCheck();

// Disconnect
await publisher.disconnect();
```

---

### 3. Event Types (`events/types.ts`)

**Purpose**: Type-safe event schemas for all cross-service events.

**Event Types Available**:

```typescript
// Material Service Events
MaterialEventTypes.PART_CREATED
MaterialEventTypes.PART_UPDATED
MaterialEventTypes.PART_DELETED
MaterialEventTypes.LOT_CREATED
MaterialEventTypes.SERIAL_CREATED

// Resource Service Events
ResourceEventTypes.WORK_CENTER_UPDATED
ResourceEventTypes.PERSONNEL_UPDATED
ResourceEventTypes.PRODUCT_UPDATED

// Auth Service Events
AuthEventTypes.USER_CREATED
AuthEventTypes.USER_UPDATED
AuthEventTypes.USER_DELETED

// Work Order Service Events
WorkOrderEventTypes.WORK_ORDER_CREATED
WorkOrderEventTypes.WORK_ORDER_STATUS_CHANGED
WorkOrderEventTypes.WORK_ORDER_COMPLETED

// Quality Service Events
QualityEventTypes.INSPECTION_COMPLETED
QualityEventTypes.NCR_CREATED
```

**Example Payloads**:

```typescript
// Part updated event payload
interface PartUpdatedPayload {
  partId: string;
  partNumber: string;
  partName: string;
  revision?: string;
  changes: Partial<PartCreatedPayload>;
  previousValues?: Partial<PartCreatedPayload>;
}

// Work order status changed payload
interface WorkOrderStatusChangedPayload {
  workOrderId: string;
  workOrderNumber: string;
  previousStatus: string;
  newStatus: string;
  changedAt: Date;
  changedBy: string;
}
```

---

## 🔄 Event-Driven Cache Synchronization Pattern

### Scenario: Part Updated in Material Service

**1. Material Service**: Update part and publish event
```typescript
// Material Service
async function updatePart(partId: string, updates: Partial<Part>) {
  // Update database
  const updated = await prisma.part.update({
    where: { id: partId },
    data: updates
  });

  // Publish event
  const event = createDomainEvent(
    MaterialEventTypes.PART_UPDATED,
    'material-service',
    {
      partId: updated.id,
      partNumber: updated.partNumber,
      partName: updated.partName,
      changes: updates
    },
    { entityId: partId, entityType: 'Part' }
  );

  await eventPublisher.publish(event);

  // Invalidate cache
  await cache.invalidate(CacheKeyPrefix.PART, partId);

  return updated;
}
```

**2. Work Order Service**: Listen for events and update cached fields
```typescript
// Work Order Service - Event Consumer
eventConsumer.on(MaterialEventTypes.PART_UPDATED, async (event) => {
  const { partId, partNumber, partName } = event.payload;

  // Update cached fields in all work orders using this part
  await prisma.workOrder.updateMany({
    where: { partId },
    data: {
      partNumber, // Cached for display
      partName    // Cached for display
    }
  });

  // Invalidate cache entries for affected work orders
  await cache.invalidateByPattern(`work_order:*:${partId}`);

  console.log(`Updated ${partNumber} in all work orders`);
});
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install ioredis kafkajs
npm install -D @types/ioredis
```

### 2. Set Environment Variables

```bash
# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=my-service
```

### 3. Initialize in Service

```typescript
// services/work-order/src/index.ts
import ReferenceDataCache, { CacheKeyPrefix } from '../../shared/cache/ReferenceDataCache';
import EventPublisher from '../../shared/events/EventPublisher';

// Initialize cache
const cache = new ReferenceDataCache(process.env.REDIS_URL);

// Initialize event publisher
const publisher = new EventPublisher({
  clientId: process.env.KAFKA_CLIENT_ID!,
  brokers: process.env.KAFKA_BROKERS!.split(',')
});

await publisher.connect();

// Warm cache with frequently accessed data
await cache.warmCache(
  CacheKeyPrefix.PART,
  async () => {
    // Load parts from Material Service cache or API
    const parts = await fetchActiveParts();
    return new Map(parts.map(p => [p.id, p]));
  },
  { ttl: 300, enableCacheWarming: true }
);
```

---

## 📊 Monitoring & Observability

### Cache Metrics

```typescript
// Get cache statistics
const stats = await cache.getStats();
console.log(`Total keys: ${stats.totalKeys}`);
console.log(`Memory usage: ${stats.memoryUsage}`);

// Health check
const isHealthy = await cache.healthCheck();
if (!isHealthy) {
  console.error('Cache health check failed!');
}
```

### Event Metrics

```typescript
// Kafka metrics available via admin client
const admin = kafka.admin();
await admin.connect();
const topics = await admin.listTopics();
console.log('Available topics:', topics);
await admin.disconnect();
```

---

## 🔧 Troubleshooting

### Cache Connection Issues

```bash
# Test Redis connection
redis-cli ping

# Check Redis stats
redis-cli info stats

# Monitor cache operations
redis-cli monitor
```

### Kafka Connection Issues

```bash
# List Kafka topics
kafka-topics.sh --bootstrap-server localhost:9092 --list

# Describe topic
kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic mes.material.events

# Consume events (debug)
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic mes.material.events --from-beginning
```

---

## 📚 References

- **CloudEvents Specification**: https://cloudevents.io/
- **Kafka Documentation**: https://kafka.apache.org/documentation/
- **Redis Documentation**: https://redis.io/documentation
- **Event-Driven Architecture**: https://martinfowler.com/articles/201701-event-driven.html

---

## 🎯 Best Practices

1. **Cache TTL**: Set appropriate TTL based on data update frequency
2. **Event Ordering**: Use entity ID as partition key for event ordering
3. **Idempotency**: Always use idempotent producers to prevent duplicates
4. **Error Handling**: Implement dead letter queues for failed event processing
5. **Monitoring**: Monitor cache hit rates and event lag
6. **Testing**: Use test doubles for cache and events in unit tests

---

**Version**: 1.0
**Last Updated**: 2025-10-18
**Status**: Production Ready
