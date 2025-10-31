---
sidebar_position: 2
title: Webhook Events
description: Complete catalog of all webhook events
---

# Webhook Events Catalog

All events that MES can send to your webhook endpoint.

## Work Order Events

### work_order.created

Triggered when a new work order is created.

```json
{
  "type": "work_order.created",
  "data": {
    "workOrder": {
      "id": "wo-123",
      "orderNumber": "WO-2024-001",
      "product": "Widget A",
      "quantity": 100,
      "dueDate": "2024-01-25T00:00:00Z"
    }
  }
}
```

### work_order.started

Triggered when production begins.

```json
{
  "type": "work_order.started",
  "data": {
    "workOrder": {
      "id": "wo-123",
      "status": "IN_PROGRESS",
      "startDate": "2024-01-15T08:00:00Z"
    }
  }
}
```

### work_order.completed

Triggered when a work order is finished.

```json
{
  "type": "work_order.completed",
  "data": {
    "workOrder": {
      "id": "wo-123",
      "status": "COMPLETED",
      "completedQuantity": 100,
      "completionDate": "2024-01-22T14:30:00Z"
    }
  }
}
```

## Operation Events

### operation.started

```json
{
  "type": "operation.started",
  "data": {
    "operation": {
      "id": "op-456",
      "workOrderId": "wo-123",
      "operationType": "WELD",
      "startDate": "2024-01-15T08:30:00Z"
    }
  }
}
```

### operation.completed

```json
{
  "type": "operation.completed",
  "data": {
    "operation": {
      "id": "op-456",
      "workOrderId": "wo-123",
      "status": "COMPLETED",
      "completionDate": "2024-01-15T12:00:00Z",
      "actualDuration": 210
    }
  }
}
```

## Quality Events

### quality.inspection_complete

```json
{
  "type": "quality.inspection_complete",
  "data": {
    "inspection": {
      "id": "insp-789",
      "workOrderId": "wo-123",
      "result": "PASS",
      "inspectedBy": "John Smith"
    }
  }
}
```

### quality.ncr_created

```json
{
  "type": "quality.ncr_created",
  "data": {
    "ncr": {
      "id": "ncr-101",
      "workOrderId": "wo-123",
      "description": "Surface defect",
      "severity": "MAJOR"
    }
  }
}
```

## Inventory Events

### inventory.material_allocated

```json
{
  "type": "inventory.material_allocated",
  "data": {
    "movement": {
      "id": "mov-202",
      "materialId": "mat-123",
      "quantity": 50,
      "workOrderId": "wo-456"
    }
  }
}
```

### inventory.material_consumed

```json
{
  "type": "inventory.material_consumed",
  "data": {
    "movement": {
      "id": "mov-203",
      "materialId": "mat-123",
      "quantity": 45,
      "workOrderId": "wo-456"
    }
  }
}
```

---

**[Back to Webhooks Overview](./overview.md)**
