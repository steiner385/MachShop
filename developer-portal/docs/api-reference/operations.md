---
sidebar_position: 3
title: Operations API
description: Manage operations within work orders
---

# Operations API

Operations represent individual manufacturing steps within a work order. Each operation has specific requirements and can track time, resources, and quality metrics.

## Endpoints

- `GET /operations` - List operations
- `GET /operations/{id}` - Get operation
- `POST /operations` - Create operation  
- `PUT /operations/{id}` - Update operation
- `POST /operations/{id}/start` - Start operation
- `POST /operations/{id}/complete` - Complete operation

## List Operations

```bash
curl "https://api.mes.company.com/api/v2/operations?workOrderId=wo-123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response includes operation status, time tracking, and resource allocation.

## Operation Statuses

- `PENDING` - Waiting to start
- `IN_PROGRESS` - Currently running
- `COMPLETED` - Finished
- `SKIPPED` - Not needed
- `BLOCKED` - Waiting for dependencies

## Fields

- `id` - Operation ID
- `workOrderId` - Parent work order
- `sequence` - Order in routing (1, 2, 3...)
- `operationType` - Type of operation (WELD, DRILL, ASSEMBLY, etc.)
- `status` - Current status
- `plannedStartTime` - Planned start
- `actualStartTime` - When it actually started
- `plannedEndTime` - Planned completion
- `actualEndTime` - When it completed
- `estimatedDuration` - How long it should take (minutes)
- `actualDuration` - How long it took
- `assignedOperator` - Person performing operation
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Related Documentation

- [Work Orders API](./work-orders.md) - Parent resource
- [Quality API](./quality.md) - Quality data for operations

---

**Need help?** [Email support](mailto:developers@mes.company.com)
