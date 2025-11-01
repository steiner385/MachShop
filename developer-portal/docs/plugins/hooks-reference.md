---
sidebar_position: 3
title: Hooks Reference
description: Available hooks and how to use them
---

# Hooks Reference

MES provides hooks to intercept and customize workflows.

## Work Order Hooks

### work_order.before_create

Validate or modify work order before creation.

```typescript
export const workOrderBeforeCreate = async (context) => {
  // context.data = work order being created
  // context.errors = validation errors

  if (context.data.quantity > 1000) {
    context.errors.push('Quantity too high');
  }

  return context;
};
```

### work_order.after_create

Called after work order is created.

```typescript
export const workOrderAfterCreate = async (context) => {
  // context.data = newly created work order
  // Can trigger external integrations
  console.log(`Created: ${context.data.orderNumber}`);
};
```

### work_order.before_start

Validate before starting production.

### work_order.after_complete

Called when work order is completed.

## Operation Hooks

### operation.before_start
### operation.after_complete

## Quality Hooks

### ncr.before_create
### ncr.after_disposition

---

[Back to Plugins](./overview.md)
