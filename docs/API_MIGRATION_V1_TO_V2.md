# API Migration Guide: V1 to V2

## Overview

This guide walks you through migrating your MES API integrations from **v1** to **v2**. The migration process is designed to be straightforward for most use cases, with estimated effort of **2-4 hours** for typical integrations.

## Migration Timeline

- **Announcement Date**: January 15, 2026
- **Parallel Operation**: Both v1 and v2 available (12-18 months)
- **Sunset Date**: January 15, 2027
- **Deprecation Period**: 12 months to migrate

## Key Changes

### 1. Status Field Format

**Before (V1):**
```json
{
  "id": "wo-123",
  "status": "IN_PROGRESS",
  "title": "Fix pump assembly"
}
```

**After (V2):**
```json
{
  "id": "wo-123",
  "status": {
    "value": "IN_PROGRESS",
    "displayName": "In Progress"
  },
  "title": "Fix pump assembly"
}
```

**How to Migrate:**
```javascript
// Before: Direct string comparison
if (workOrder.status === 'IN_PROGRESS') {
  // Process
}

// After: Access status.value
if (workOrder.status.value === 'IN_PROGRESS') {
  // Process
}

// Or: Use display name for UI
console.log(workOrder.status.displayName); // "In Progress"
```

### 2. Response Structure - Nested Objects

**Before (V1):**
```json
{
  "id": "wo-123",
  "status": "COMPLETED",
  "startDate": "2026-01-15T10:00:00Z",
  "endDate": "2026-01-16T15:30:00Z",
  "actualStartDate": "2026-01-15T10:05:00Z",
  "actualEndDate": "2026-01-16T15:45:00Z",
  "assignedTo": "user-456"
}
```

**After (V2):**
```json
{
  "id": "wo-123",
  "status": {
    "value": "COMPLETED",
    "displayName": "Completed"
  },
  "schedule": {
    "startDate": "2026-01-15T10:00:00Z",
    "endDate": "2026-01-16T15:30:00Z"
  },
  "actual": {
    "startDate": "2026-01-15T10:05:00Z",
    "endDate": "2026-01-16T15:45:00Z",
    "duration": 86100
  },
  "assignment": {
    "assignedToId": "user-456",
    "assignedAt": "2026-01-15T10:00:00Z"
  },
  "metadata": {
    "createdAt": "2026-01-15T09:00:00Z",
    "updatedAt": "2026-01-16T16:00:00Z",
    "createdBy": "admin-123"
  }
}
```

**How to Migrate:**

```javascript
// Helper function for backward compatibility
function normalizeV2Response(v2Response) {
  return {
    id: v2Response.id,
    status: v2Response.status.value,
    startDate: v2Response.schedule.startDate,
    endDate: v2Response.schedule.endDate,
    actualStartDate: v2Response.actual.startDate,
    actualEndDate: v2Response.actual.endDate,
    assignedTo: v2Response.assignment.assignedToId,
    createdAt: v2Response.metadata.createdAt,
    updatedAt: v2Response.metadata.updatedAt,
  };
}

// Usage
const v2WorkOrder = getWorkOrder('wo-123', 'v2');
const v1Format = normalizeV2Response(v2WorkOrder);
processWorkOrder(v1Format);
```

### 3. Request Format Changes

**Before (V1):**
```javascript
const request = {
  number: 'WO-2026-001',
  title: 'Fix pump',
  status: 'OPEN',
  startDate: '2026-01-15T10:00:00Z',
  endDate: '2026-01-16T15:00:00Z',
  assignedTo: 'user-456',
};

// Send to /api/v1/work-orders
```

**After (V2):**
```javascript
const request = {
  number: 'WO-2026-001',
  title: 'Fix pump',
  status: {
    value: 'OPEN',
  },
  schedule: {
    startDate: '2026-01-15T10:00:00Z',
    endDate: '2026-01-16T15:00:00Z',
  },
  assignment: {
    assignedToId: 'user-456',
  },
};

// Send to /api/v2/work-orders
```

**How to Migrate:**

```javascript
// Helper to convert V1 request to V2
function convertV1RequestToV2(v1Request) {
  return {
    number: v1Request.number,
    title: v1Request.title,
    status: {
      value: v1Request.status,
    },
    schedule: {
      startDate: v1Request.startDate,
      endDate: v1Request.endDate,
    },
    assignment: {
      assignedToId: v1Request.assignedTo,
    },
  };
}

// Usage
const v1Request = buildWorkOrderRequest();
const v2Request = convertV1RequestToV2(v1Request);
createWorkOrder(v2Request, 'v2');
```

## Step-by-Step Migration

### Phase 1: Preparation (Week 1)

**1. Audit Current Usage**
```bash
# Get all work orders using v1
curl -H "Accept: application/json" https://api.mes.com/api/v1/work-orders

# Check which endpoints you use
grep -r "api/v1" your-codebase/
```

**2. Set Up Parallel Testing**
```javascript
const API_V1 = 'https://api.mes.com/api/v1';
const API_V2 = 'https://api.mes.com/api/v2';

// Test with v2 in non-production environment
const testEndpoint = process.env.NODE_ENV === 'test' ? API_V2 : API_V1;
```

**3. Review Breaking Changes**
- [ ] Status format (string → object)
- [ ] Response structure (flat → nested)
- [ ] New required fields
- [ ] Removed fields
- [ ] Field type changes

### Phase 2: Code Updates (Week 2-3)

**1. Update API Calls**
```javascript
// Before
fetch('/api/v1/work-orders/wo-123')
  .then(r => r.json())
  .then(data => {
    console.log(data.status); // "IN_PROGRESS"
  });

// After
fetch('/api/v2/work-orders/wo-123')
  .then(r => r.json())
  .then(data => {
    console.log(data.status.value); // "IN_PROGRESS"
    console.log(data.status.displayName); // "In Progress"
  });
```

**2. Update Status Checks**
```javascript
// Before
if (workOrder.status === 'COMPLETED') { }

// After
if (workOrder.status.value === 'COMPLETED') { }
```

**3. Update Data Processing**
```javascript
// Before
const schedule = {
  start: workOrder.startDate,
  end: workOrder.endDate,
};

// After
const schedule = {
  start: workOrder.schedule.startDate,
  end: workOrder.schedule.endDate,
};
```

**4. Create Compatibility Layer**
```javascript
// Create adapter for backward compatibility
class WorkOrderAdapter {
  static toV1Format(v2WorkOrder) {
    return {
      id: v2WorkOrder.id,
      status: v2WorkOrder.status.value,
      startDate: v2WorkOrder.schedule.startDate,
      endDate: v2WorkOrder.schedule.endDate,
      actualStartDate: v2WorkOrder.actual?.startDate,
      actualEndDate: v2WorkOrder.actual?.endDate,
      assignedTo: v2WorkOrder.assignment?.assignedToId,
    };
  }

  static toV2Format(v1WorkOrder) {
    return {
      number: v1WorkOrder.number,
      title: v1WorkOrder.title,
      status: { value: v1WorkOrder.status },
      schedule: {
        startDate: v1WorkOrder.startDate,
        endDate: v1WorkOrder.endDate,
      },
      assignment: {
        assignedToId: v1WorkOrder.assignedTo,
      },
    };
  }
}
```

### Phase 3: Testing (Week 3-4)

**1. Unit Tests**
```javascript
describe('API V2 Migration', () => {
  it('should parse v2 status format', () => {
    const v2Response = {
      status: { value: 'OPEN', displayName: 'Open' }
    };
    expect(v2Response.status.value).toBe('OPEN');
  });

  it('should handle nested schedule object', () => {
    const v2Response = {
      schedule: { startDate: '2026-01-15T10:00:00Z' }
    };
    expect(v2Response.schedule.startDate).toBeDefined();
  });
});
```

**2. Integration Tests**
```javascript
describe('API V2 Endpoints', () => {
  it('should create work order with v2 format', async () => {
    const response = await fetch('/api/v2/work-orders', {
      method: 'POST',
      body: JSON.stringify({
        number: 'WO-2026-001',
        title: 'Test',
        status: { value: 'OPEN' },
        schedule: { startDate: new Date().toISOString() },
      }),
    });
    expect(response.status).toBe(201);
  });
});
```

**3. Compatibility Tests**
```bash
# Run your existing v1 test suite against v2
npm run test:compatibility -- --source=v1 --target=v2
```

### Phase 4: Gradual Rollout (Week 4+)

**1. Enable Feature Flag**
```javascript
const useV2Api = process.env.USE_V2_API === 'true';
const apiVersion = useV2Api ? 'v2' : 'v1';
const endpoint = `/api/${apiVersion}/work-orders`;
```

**2. Canary Deployment**
```javascript
// Route 5% of requests to v2
if (Math.random() < 0.05) {
  useV2Api = true;
}
```

**3. Monitor Metrics**
- Response times
- Error rates
- Status code distribution
- Deprecation warnings in logs

**4. Full Migration**
- Remove v1 code path
- Clean up adapters
- Update documentation

## Endpoint Mapping

| V1 | V2 | Changes |
|----|----|---------|
| `GET /api/v1/work-orders` | `GET /api/v2/work-orders` | Response structure nested |
| `POST /api/v1/work-orders` | `POST /api/v2/work-orders` | Request structure nested |
| `GET /api/v1/work-orders/:id` | `GET /api/v2/work-orders/:id` | Status object, new fields |
| `PUT /api/v1/work-orders/:id` | `PUT /api/v2/work-orders/:id` | Request structure nested |

## Common Issues & Solutions

### Issue: "status is not a string"
**Cause:** Comparing status directly instead of using `status.value`
```javascript
// ❌ Wrong
if (wo.status === 'OPEN') { }

// ✅ Correct
if (wo.status.value === 'OPEN') { }
```

### Issue: "Cannot read property of undefined"
**Cause:** Accessing flat fields instead of nested structure
```javascript
// ❌ Wrong
const start = wo.startDate;

// ✅ Correct
const start = wo.schedule.startDate;
```

### Issue: "400 Bad Request"
**Cause:** Sending v1 format request to v2 endpoint
```javascript
// ❌ Wrong
fetch('/api/v2/work-orders', {
  body: JSON.stringify({
    startDate: '2026-01-15T10:00:00Z'
  })
});

// ✅ Correct
fetch('/api/v2/work-orders', {
  body: JSON.stringify({
    schedule: {
      startDate: '2026-01-15T10:00:00Z'
    }
  })
});
```

## Support

- 📖 [API Documentation](https://docs.mes.com)
- 🆘 [Support Portal](https://support.mes.com)
- 💬 [Developer Community](https://community.mes.com)
- 📧 Email: api-support@mes.com

## Deprecation Timeline

| Date | Event |
|------|-------|
| Jan 15, 2026 | V1 marked deprecated |
| Jan 31, 2026 | Deprecation warnings in responses |
| Jul 15, 2026 | Final migration notice |
| Jan 15, 2027 | V1 sunset, 410 responses |

