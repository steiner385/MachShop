# Hook Points Reference

Complete reference of all available hook points in the MachShop system.

## Hook Types

- **Workflow**: Business logic hooks during entity lifecycle
- **Data**: Data transformation and validation hooks
- **Integration**: External system synchronization hooks
- **Notification**: Alert and notification hooks
- **UI**: Frontend customization hooks

## Workflow Hooks

### Work Order Lifecycle

#### workOrder.beforeCreate
Triggered before a work order is created.

**Parameters:**
```typescript
{
  data: {
    id?: string;
    partNumber: string;
    quantity: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    dueDate: string;
    instructions?: string;
    qualityThreshold?: number;
  },
  userId: string;
  requestId: string;
}
```

**Use Cases:**
- Validate work order data
- Check inventory availability
- Assign to appropriate queue
- Trigger pre-production notifications

**Example:**
```typescript
plugin.registerHook('workOrder.beforeCreate', async (context) => {
  // Validate required fields
  if (!context.data.partNumber || context.data.quantity <= 0) {
    throw new Error('Invalid work order data');
  }

  // Check part exists
  const part = await context.api('GET', `/parts/${context.data.partNumber}`);
  if (!part) {
    throw new Error(`Part ${context.data.partNumber} not found`);
  }

  // Add defaults
  context.data.status = 'PENDING';
  context.data.createdBy = context.userId;
});
```

#### workOrder.afterCreate
Triggered after a work order is successfully created.

**Use Cases:**
- Schedule production
- Notify team members
- Synchronize with external systems
- Update dashboards

#### workOrder.beforeUpdate
Triggered before a work order is updated.

**Use Cases:**
- Validate status transitions
- Prevent invalid updates
- Audit changes

#### workOrder.afterUpdate
Triggered after a work order is updated.

**Use Cases:**
- Notify on status changes
- Trigger follow-up actions
- Log state changes

#### workOrder.beforeComplete
Triggered before marking work order as complete.

**Use Cases:**
- Verify all tasks completed
- Check quality requirements
- Generate reports

#### workOrder.afterComplete
Triggered after work order is completed.

**Use Cases:**
- Update inventory
- Trigger shipping
- Send completion notification
- Archive work order

### Material Lifecycle

#### material.beforeCreate
Triggered before material is added to inventory.

**Parameters:**
```typescript
{
  data: {
    id?: string;
    partNumber: string;
    quantity: number;
    unitCost: number;
    supplier: string;
    lotNumber?: string;
    expiryDate?: string;
  }
}
```

**Use Cases:**
- Validate supplier information
- Check for duplicates
- Calculate material cost

#### material.afterCreate
Triggered after material is added to inventory.

**Use Cases:**
- Update purchase orders
- Notify warehouse
- Update cost accounting

#### material.beforeConsume
Triggered before material is consumed in production.

**Use Cases:**
- Check sufficient quantity
- Validate lot number
- Check expiry date

#### material.afterConsume
Triggered after material is consumed.

**Use Cases:**
- Update inventory levels
- Trigger reorder if low
- Track consumption

## Data Hooks

### Transformation Hooks

#### workOrder.validate
Transform and validate work order data.

**Parameters:**
```typescript
{
  data: { ... },
  original: { ... }
}
```

**Returns:** Modified context

**Use Cases:**
- Normalize data format
- Add computed fields
- Split data
- Enrich with additional info

**Example:**
```typescript
plugin.registerHook('workOrder.validate', async (context) => {
  // Add computed field
  context.data.totalCost = context.data.quantity * context.data.unitPrice;

  // Normalize dates
  context.data.dueDate = new Date(context.data.dueDate).toISOString();

  // Split long instructions
  if (context.data.instructions?.length > 1000) {
    context.data.longInstructions = true;
  }

  return context;
});
```

#### material.transform
Transform material data before storage.

**Use Cases:**
- Unit conversion
- Add metadata
- Enrich with supplier info

#### quality.validateMetrics
Validate quality metrics.

**Use Cases:**
- Check metric ranges
- Flag anomalies
- Update baselines

## Integration Hooks

### External System Sync

#### external.sync
Synchronize entity with external system.

**Parameters:**
```typescript
{
  data: { ... },
  entityType: 'workOrder' | 'material' | 'quality' | ...
}
```

**Use Cases:**
- Sync with ERP system
- Send to PDM system
- Update maintenance system
- Sync with quality system

**Example:**
```typescript
plugin.registerHook('external.sync', async (context) => {
  const externalUrl = context.config.externalApiUrl;

  try {
    const response = await context.api('POST', `${externalUrl}/sync`, {
      entity: context.data,
      timestamp: new Date(),
    });

    context.data.externalId = response.externalId;
    context.data.syncedAt = new Date();
  } catch (error) {
    plugin.log('error', 'External sync failed', {
      entity: context.data.id,
      error: error.message,
    });
  }
});
```

#### erp.update
Send updates to ERP system.

**Use Cases:**
- Update inventory in ERP
- Sync completed orders
- Send cost updates

#### pdm.sync
Synchronize with PDM/CAD system.

**Use Cases:**
- Update part designs
- Sync BOM changes
- Update CAD references

## Notification Hooks

### Alert System

#### alert.quality
Trigger quality alert.

**Parameters:**
```typescript
{
  data: {
    severity: 'info' | 'warning' | 'error';
    workOrderId?: string;
    reason: string;
    metrics: Record<string, any>;
  }
}
```

**Use Cases:**
- Send email alerts
- Trigger mobile notifications
- Log to monitoring system
- Create tickets

**Example:**
```typescript
plugin.registerHook('alert.quality', async (context) => {
  if (context.data.severity === 'error') {
    // Send urgent notification
    await context.api('POST', '/notifications/send', {
      type: 'QUALITY_ERROR',
      priority: 'HIGH',
      recipients: ['supervisor@company.com', 'manager@company.com'],
      message: context.data.reason,
      metadata: context.data.metrics,
    });

    // Log to monitoring
    plugin.log('error', 'Quality alert triggered', context.data);
  }
});
```

#### alert.inventory
Trigger inventory alert.

**Use Cases:**
- Low stock notifications
- Expiry warnings
- Overstock alerts

#### alert.production
Trigger production alert.

**Use Cases:**
- Delay notifications
- Machine down alerts
- Resource shortage notifications

#### notification.send
Send user notification.

**Parameters:**
```typescript
{
  data: {
    type: string;
    recipients: string[];
    subject?: string;
    message: string;
    priority: 'low' | 'normal' | 'high';
    metadata?: Record<string, any>;
  }
}
```

**Use Cases:**
- Email notifications
- Slack/Teams messages
- SMS alerts
- In-app notifications

## UI Hooks

### Dashboard Customization

#### dashboard.render
Customize dashboard display.

**Parameters:**
```typescript
{
  data: {
    dashboardId: string;
    widgets: Widget[];
    layout: Layout;
  }
}
```

**Use Cases:**
- Add custom widgets
- Rearrange layout
- Hide/show sections
- Apply custom styling

#### report.generate
Customize report generation.

**Parameters:**
```typescript
{
  data: {
    reportType: string;
    filters: Record<string, any>;
    format: 'pdf' | 'excel' | 'json';
  }
}
```

**Use Cases:**
- Add custom sections
- Include custom data
- Change formatting
- Add branding

## Hook Execution Order

Hooks execute in priority order (0-100, lower first):

```
Priority 0-30:   Early/validation hooks
Priority 31-70:  Main processing hooks
Priority 71-100: Late/cleanup hooks
```

### Execution Example

```typescript
// Register multiple hooks for same point
plugin.registerHook('workOrder.validate', validateBasics, { priority: 10 });
plugin.registerHook('workOrder.validate', enrichData, { priority: 50 });
plugin.registerHook('workOrder.validate', syncExternal, { priority: 90 });

// Execution order:
// 1. validateBasics() - priority 10
// 2. enrichData() - priority 50
// 3. syncExternal() - priority 90
```

## Common Hook Patterns

### 1. Validation Pattern

```typescript
plugin.registerHook('workOrder.beforeCreate', async (context) => {
  const errors: string[] = [];

  if (!context.data.partNumber) {
    errors.push('Part number is required');
  }

  if (context.data.quantity <= 0) {
    errors.push('Quantity must be positive');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
});
```

### 2. Enrichment Pattern

```typescript
plugin.registerHook('workOrder.validate', async (context) => {
  // Fetch related data
  const part = await context.api('GET', `/parts/${context.data.partNumber}`);

  // Add enriched data
  context.data.partName = part.name;
  context.data.partCost = part.cost;
  context.data.partLeadTime = part.leadTime;

  return context;
});
```

### 3. Sync Pattern

```typescript
plugin.registerHook('external.sync', async (context) => {
  try {
    const response = await context.api('POST', '/external/api/sync', {
      data: context.data,
      timestamp: new Date(),
    });

    context.data.externalId = response.id;
    context.data.syncStatus = 'SUCCESS';
  } catch (error) {
    context.data.syncStatus = 'FAILED';
    context.data.syncError = error.message;
  }
});
```

### 4. Notification Pattern

```typescript
plugin.registerHook('workOrder.afterComplete', async (context) => {
  plugin.log('info', 'Sending completion notification', {
    workOrderId: context.data.id,
  });

  await context.api('POST', '/notifications/send', {
    type: 'WORK_ORDER_COMPLETED',
    recipients: [context.data.assignedTo],
    message: `Work order ${context.data.id} is complete`,
  });
});
```

## Error Handling in Hooks

### Stopping Execution

```typescript
plugin.registerHook('workOrder.beforeCreate', async (context) => {
  const validation = await validateWorkOrder(context.data);

  if (!validation.isValid) {
    // Throw to prevent creation
    throw new Error(`Invalid: ${validation.reason}`);
  }
});
```

### Logging Errors

```typescript
plugin.registerHook('external.sync', async (context) => {
  try {
    await syncWithExternal(context);
  } catch (error) {
    plugin.log('error', 'Sync failed', {
      workOrderId: context.data.id,
      error: error.message,
      stack: error.stack,
    });

    // Continue with local processing
  }
});
```

## Performance Considerations

### Hook Timeouts

Default timeout is 5 seconds per hook. Configure via hook options:

```typescript
plugin.registerHook('workOrder.validate', handler, {
  timeout: 10000, // 10 seconds for slow operations
});
```

### Async vs Sync Hooks

```typescript
// Blocking (default) - blocks entity creation
plugin.registerHook('workOrder.beforeCreate', handler, { async: false });

// Non-blocking - runs in background
plugin.registerHook('workOrder.afterCreate', handler, { async: true });
```

## Testing Hooks

### Unit Test Example

```typescript
describe('workOrder.beforeCreate', () => {
  it('should validate part number', async () => {
    const context = {
      data: { quantity: 100 },
      api: mockApi,
    };

    try {
      await hookHandler(context);
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toContain('Part number required');
    }
  });
});
```

## Next Steps

- [Plugin Development Guide](./PLUGIN_DEVELOPMENT_GUIDE.md)
- [API Reference](./PLUGIN_API_REFERENCE.md)
- [Example Plugins](./examples/)
