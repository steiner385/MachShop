---
sidebar_position: 2
title: Data Models
---

# Data Models

## Work Order Entity

```typescript
interface WorkOrder {
  id: string;
  orderNumber: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  product: string;
  quantity: number;
  completedQuantity: number;
  dueDate: Date;
  startDate?: Date;
  completionDate?: Date;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  operations: Operation[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Operation Entity

```typescript
interface Operation {
  id: string;
  workOrderId: string;
  sequence: number;
  operationType: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  plannedDuration: number;
  actualDuration?: number;
  createdAt: Date;
}
```

## Material Entity

```typescript
interface Material {
  id: string;
  sku: string;
  name: string;
  unitOfMeasure: string;
  reorderPoint: number;
  cost: number;
  createdAt: Date;
}
```

---

[Work Orders API](../api-reference/work-orders.md)
