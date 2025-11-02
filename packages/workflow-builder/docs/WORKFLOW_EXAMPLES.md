# Workflow Execution Examples & Tutorials

Comprehensive examples and tutorials for building and executing workflows in the Workflow Builder system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Workflow Structure](#basic-workflow-structure)
3. [Common Patterns](#common-patterns)
4. [Node Type Examples](#node-type-examples)
5. [Variable Management](#variable-management)
6. [Error Handling](#error-handling)
7. [Advanced Workflows](#advanced-workflows)
8. [Integration Examples](#integration-examples)
9. [Performance Optimization](#performance-optimization)

## Getting Started

### Creating Your First Workflow

```typescript
import { WorkflowExecutionEngine } from '../services/WorkflowExecutionEngine';
import { Workflow, WorkflowNode, WorkflowEdge } from '../types/workflow';

// Step 1: Define nodes
const startNode: WorkflowNode = {
  id: 'start-001',
  type: 'START',
  position: { x: 100, y: 100 },
  properties: {}
};

const endNode: WorkflowNode = {
  id: 'end-001',
  type: 'END',
  position: { x: 400, y: 100 },
  properties: {}
};

// Step 2: Define edges (connections)
const edge: WorkflowEdge = {
  id: 'edge-001',
  source: 'start-001',
  target: 'end-001'
};

// Step 3: Create workflow
const workflow: Workflow = {
  id: 'workflow-hello-world',
  name: 'Hello World Workflow',
  description: 'Simple workflow to get started',
  nodes: [startNode, endNode],
  edges: [edge],
  variables: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: 'user@example.com',
  isActive: true
};

// Step 4: Execute workflow
const engine = new WorkflowExecutionEngine();
const result = await engine.executeWorkflow(workflow, 'user@example.com');

console.log('Execution result:', result.status); // 'success'
```

## Basic Workflow Structure

### Workflow Components

```typescript
// Complete workflow structure
const workflow: Workflow = {
  // Unique identifier
  id: 'wf-manufacturing-001',

  // Display name
  name: 'Manufacturing Order Processing',

  // Description for documentation
  description: 'Process customer orders through manufacturing',

  // Array of nodes (operations)
  nodes: [
    // ... node definitions
  ],

  // Array of edges (connections between nodes)
  edges: [
    // ... edge definitions
  ],

  // Workflow-level variables
  variables: {
    orderId: {
      name: 'orderId',
      value: '',
      type: 'string',
      scope: 'global'
    }
  },

  // Metadata
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: 'user@example.com',
  isActive: true,
  version: '1.0.0',
  tags: ['manufacturing', 'orders'],
  metadata: {
    category: 'order-processing',
    criticality: 'high'
  }
};
```

## Common Patterns

### Pattern 1: Sequential Operations

Execute operations one after another.

```typescript
// Workflow: Order → Quality Check → Ship
const sequentialWorkflow: Workflow = {
  id: 'wf-sequential',
  name: 'Sequential Processing',
  nodes: [
    {
      id: 'start',
      type: 'START',
      position: { x: 100, y: 100 }
    },
    {
      id: 'consume-materials',
      type: 'MATERIAL_CONSUME',
      position: { x: 250, y: 100 },
      properties: {
        material: 'RawSteel',
        quantity: 100,
        unit: 'kg'
      }
    },
    {
      id: 'quality-check',
      type: 'QUALITY_CHECK',
      position: { x: 400, y: 100 },
      properties: {
        checkType: 'dimensional',
        tolerancePercent: 2.5
      }
    },
    {
      id: 'end',
      type: 'END',
      position: { x: 550, y: 100 }
    }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'consume-materials' },
    { id: 'e2', source: 'consume-materials', target: 'quality-check' },
    { id: 'e3', source: 'quality-check', target: 'end' }
  ],
  variables: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: 'user@example.com',
  isActive: true
};
```

### Pattern 2: Conditional Branching

Execute different paths based on conditions.

```typescript
// Workflow: Check Quality → Pass/Fail paths
const conditionalWorkflow: Workflow = {
  id: 'wf-conditional',
  name: 'Quality-Based Branching',
  nodes: [
    {
      id: 'start',
      type: 'START',
      position: { x: 100, y: 100 }
    },
    {
      id: 'quality-check',
      type: 'QUALITY_CHECK',
      position: { x: 250, y: 100 },
      properties: {
        checkType: 'full',
        failureThreshold: 5.0
      }
    },
    {
      id: 'decision',
      type: 'IF_THEN_ELSE',
      position: { x: 400, y: 100 },
      properties: {
        condition: '${qualityScore} >= 95',
        trueLabel: 'PASS',
        falseLabel: 'FAIL'
      }
    },
    {
      id: 'ship-product',
      type: 'DATA_TRANSFORMATION',
      position: { x: 400, y: 30 },
      properties: {
        operation: 'update_status',
        newStatus: 'shipped'
      }
    },
    {
      id: 'rework',
      type: 'NOTIFICATION',
      position: { x: 400, y: 170 },
      properties: {
        title: 'Quality Check Failed',
        message: 'Product requires rework',
        recipients: ['supervisor@example.com']
      }
    },
    {
      id: 'end',
      type: 'END',
      position: { x: 550, y: 100 }
    }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'quality-check' },
    { id: 'e2', source: 'quality-check', target: 'decision' },
    { id: 'e3', source: 'decision', target: 'ship-product', sourcePort: 'true' },
    { id: 'e4', source: 'decision', target: 'rework', sourcePort: 'false' },
    { id: 'e5', source: 'ship-product', target: 'end' },
    { id: 'e6', source: 'rework', target: 'end' }
  ],
  variables: {
    qualityScore: {
      name: 'qualityScore',
      value: 0,
      type: 'number',
      scope: 'execution'
    }
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: 'user@example.com',
  isActive: true
};
```

### Pattern 3: Parallel Processing

Execute multiple operations in parallel.

```typescript
// Workflow: Process orders from multiple sources simultaneously
const parallelWorkflow: Workflow = {
  id: 'wf-parallel',
  name: 'Parallel Order Processing',
  nodes: [
    {
      id: 'start',
      type: 'START',
      position: { x: 100, y: 100 }
    },
    {
      id: 'parallel-split',
      type: 'PARALLEL',
      position: { x: 250, y: 100 },
      properties: {
        branches: 3
      }
    },
    {
      id: 'fetch-salesforce',
      type: 'SALESFORCE_CONNECTOR',
      position: { x: 400, y: 20 },
      properties: {
        operation: 'query',
        query: 'SELECT Id, Name FROM Account WHERE CreatedDate = TODAY'
      }
    },
    {
      id: 'fetch-sap',
      type: 'SAP_CONNECTOR',
      position: { x: 400, y: 100 },
      properties: {
        operation: 'getMaterial',
        materialId: '${materialId}'
      }
    },
    {
      id: 'fetch-netsuite',
      type: 'NETSUITE_CONNECTOR',
      position: { x: 400, y: 180 },
      properties: {
        operation: 'getSalesOrder',
        id: '${orderId}'
      }
    },
    {
      id: 'merge-results',
      type: 'DATA_TRANSFORMATION',
      position: { x: 550, y: 100 },
      properties: {
        operation: 'merge',
        mergeStrategy: 'combine'
      }
    },
    {
      id: 'end',
      type: 'END',
      position: { x: 700, y: 100 }
    }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'parallel-split' },
    { id: 'e2', source: 'parallel-split', target: 'fetch-salesforce' },
    { id: 'e3', source: 'parallel-split', target: 'fetch-sap' },
    { id: 'e4', source: 'parallel-split', target: 'fetch-netsuite' },
    { id: 'e5', source: 'fetch-salesforce', target: 'merge-results' },
    { id: 'e6', source: 'fetch-sap', target: 'merge-results' },
    { id: 'e7', source: 'fetch-netsuite', target: 'merge-results' },
    { id: 'e8', source: 'merge-results', target: 'end' }
  ],
  variables: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: 'user@example.com',
  isActive: true
};
```

### Pattern 4: Looping Operations

Repeat operations over collections.

```typescript
// Workflow: Process multiple items in a batch
const loopWorkflow: Workflow = {
  id: 'wf-loop',
  name: 'Batch Item Processing',
  nodes: [
    {
      id: 'start',
      type: 'START',
      position: { x: 100, y: 100 }
    },
    {
      id: 'load-batch',
      type: 'DATA_TRANSFORMATION',
      position: { x: 250, y: 100 },
      properties: {
        operation: 'load_batch',
        batchSize: 10
      }
    },
    {
      id: 'loop-items',
      type: 'LOOP',
      position: { x: 400, y: 100 },
      properties: {
        iterableVar: '${batchItems}',
        itemVar: 'currentItem'
      }
    },
    {
      id: 'process-item',
      type: 'API_CALL',
      position: { x: 550, y: 100 },
      properties: {
        method: 'POST',
        endpoint: '/api/process-item',
        body: '${currentItem}'
      }
    },
    {
      id: 'accumulate-results',
      type: 'DATA_TRANSFORMATION',
      position: { x: 700, y: 100 },
      properties: {
        operation: 'accumulate',
        accumulator: 'results'
      }
    },
    {
      id: 'end',
      type: 'END',
      position: { x: 850, y: 100 }
    }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'load-batch' },
    { id: 'e2', source: 'load-batch', target: 'loop-items' },
    { id: 'e3', source: 'loop-items', target: 'process-item' },
    { id: 'e4', source: 'process-item', target: 'accumulate-results' },
    { id: 'e5', source: 'accumulate-results', target: 'loop-items' },
    { id: 'e6', source: 'loop-items', target: 'end' }
  ],
  variables: {
    batchItems: {
      name: 'batchItems',
      value: [],
      type: 'array',
      scope: 'execution'
    },
    results: {
      name: 'results',
      value: [],
      type: 'array',
      scope: 'execution'
    }
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: 'user@example.com',
  isActive: true
};
```

## Node Type Examples

### MATERIAL_CONSUME Node

```typescript
const materialNode: WorkflowNode = {
  id: 'consume-steel',
  type: 'MATERIAL_CONSUME',
  position: { x: 250, y: 100 },
  properties: {
    material: 'StainlessSteel-304',
    quantity: 500,
    unit: 'kg',
    warehouseLocation: 'Zone-A-Shelf-3',
    batchId: '${batchId}'
  }
};
```

### EQUIPMENT_OPERATION Node

```typescript
const equipmentNode: WorkflowNode = {
  id: 'run-lathe',
  type: 'EQUIPMENT_OPERATION',
  position: { x: 250, y: 100 },
  properties: {
    equipmentId: 'LATHE-001',
    operation: 'turning',
    duration: 300, // seconds
    speed: 1500, // RPM
    feedRate: 0.25 // mm/rev
  }
};
```

### QUALITY_CHECK Node

```typescript
const qualityNode: WorkflowNode = {
  id: 'inspect-dimensions',
  type: 'QUALITY_CHECK',
  position: { x: 250, y: 100 },
  properties: {
    checkType: 'dimensional',
    measurements: [
      { dimension: 'length', target: 100, tolerance: 0.5 },
      { dimension: 'diameter', target: 50, tolerance: 0.2 }
    ],
    sampleSize: 5,
    passCriteria: 'all-must-pass'
  }
};
```

### API_CALL Node

```typescript
const apiNode: WorkflowNode = {
  id: 'notify-customer',
  type: 'API_CALL',
  position: { x: 250, y: 100 },
  properties: {
    method: 'POST',
    endpoint: 'https://api.example.com/notifications',
    headers: {
      'Authorization': 'Bearer ${apiToken}',
      'Content-Type': 'application/json'
    },
    body: {
      customerId: '${customerId}',
      orderStatus: 'processing',
      eta: '${estimatedDelivery}'
    },
    timeout: 30000,
    retries: 3
  }
};
```

### DATA_TRANSFORMATION Node

```typescript
const transformNode: WorkflowNode = {
  id: 'transform-data',
  type: 'DATA_TRANSFORMATION',
  position: { x: 250, y: 100 },
  properties: {
    operation: 'map',
    inputVar: '${rawData}',
    outputVar: 'transformedData',
    transformation: {
      'customerId': '${source.customer_id}',
      'orderDate': 'new Date(${source.order_date})',
      'total': '${source.items.reduce((sum, item) => sum + item.price, 0)}'
    }
  }
};
```

### SALESFORCE_CONNECTOR Node

```typescript
const salesforceNode: WorkflowNode = {
  id: 'create-account',
  type: 'SALESFORCE_CONNECTOR',
  position: { x: 250, y: 100 },
  properties: {
    operation: 'createAccount',
    name: '${companyName}',
    phone: '${companyPhone}',
    website: '${companyWebsite}',
    industry: '${industry}'
  }
};
```

## Variable Management

### Setting Variables

```typescript
const varService = new VariableManagementService();

// Set global variable
varService.setVariable('apiKey', 'secret-key-123', {
  executionId: 'exec-001'
});

// Set execution variable
varService.setVariable('orderId', 'ORD-123456', {
  executionId: 'exec-001'
});

// Set node variable
varService.setVariable('nodeResult', { success: true }, {
  executionId: 'exec-001',
  nodeId: 'node-001'
});
```

### Using Variables in Expressions

```typescript
// Simple variable substitution
const greeting = varService.interpolateString(
  'Hello ${customerName}, your order ${orderId} is ready',
  { executionId: 'exec-001' }
);

// Expression evaluation
const total = varService.evaluateExpression(
  '${itemPrice} * ${quantity} * (1 + ${taxRate})',
  { executionId: 'exec-001' }
);

// Complex expressions
const status = varService.evaluateExpression(
  `${qualityScore} >= 95 ? 'pass' : 'fail'`,
  { executionId: 'exec-001' }
);
```

### Variable Scope Hierarchy

```typescript
// Variables follow scope hierarchy: node → execution → global

// Get variable (tries node first, then execution, then global)
const timeout = varService.getVariable('timeout_ms', {
  executionId: 'exec-001',
  nodeId: 'node-001'
});

// If defined at:
// - Node scope: returns node value
// - Execution scope: returns execution value
// - Global scope: returns global value
// - Nowhere: returns undefined
```

## Error Handling

### Registering Error Handlers

```typescript
const errorService = new ErrorHandlingService();

// Handle API timeouts with retry
errorService.registerErrorHandler({
  id: 'timeout-retry',
  pattern: 'TIMEOUT',
  action: 'retry',
  retryStrategy: {
    maxRetries: 3,
    backoffMs: 1000,
    jitter: true
  },
  priority: 10
});

// Handle invalid input by skipping
errorService.registerErrorHandler({
  id: 'invalid-skip',
  pattern: 'INVALID_INPUT',
  action: 'skip',
  priority: 5
});

// Handle critical errors with fallback
errorService.registerErrorHandler({
  id: 'critical-fallback',
  pattern: 'CRITICAL_.*',
  action: 'fallback',
  fallbackNodeId: 'fallback-handler',
  priority: 20
});

// Handle fatal errors with notification
errorService.registerErrorHandler({
  id: 'fatal-notify',
  pattern: 'FATAL_.*',
  action: 'notify',
  notificationConfig: {
    channels: ['email', 'slack'],
    message: 'Critical error occurred: ${errorMessage}'
  },
  priority: 30
});
```

### Error Recovery Example

```typescript
// Workflow with error handling
const robustWorkflow: Workflow = {
  id: 'wf-robust',
  name: 'Workflow with Error Handling',
  nodes: [
    {
      id: 'start',
      type: 'START',
      position: { x: 100, y: 100 }
    },
    {
      id: 'api-call',
      type: 'API_CALL',
      position: { x: 250, y: 100 },
      properties: {
        method: 'GET',
        endpoint: 'https://api.example.com/data',
        timeout: 10000
      }
    },
    {
      id: 'retry-logic',
      type: 'RETRY_LOGIC',
      position: { x: 400, y: 100 },
      properties: {
        maxRetries: 3,
        backoffMs: 1000,
        exponential: true
      }
    },
    {
      id: 'fallback-handler',
      type: 'FALLBACK_PATH',
      position: { x: 400, y: 200 },
      properties: {
        operation: 'use_cached_data',
        cacheKey: 'last_known_data'
      }
    },
    {
      id: 'error-handler',
      type: 'ERROR_HANDLER',
      position: { x: 550, y: 100 },
      properties: {
        errorPatterns: ['TIMEOUT', 'NETWORK_ERROR'],
        action: 'log_and_continue'
      }
    },
    {
      id: 'end',
      type: 'END',
      position: { x: 700, y: 100 }
    }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'api-call' },
    { id: 'e2', source: 'api-call', target: 'error-handler', properties: { condition: 'success' } },
    { id: 'e3', source: 'api-call', target: 'retry-logic', properties: { condition: 'failure' } },
    { id: 'e4', source: 'retry-logic', target: 'error-handler', properties: { condition: 'success' } },
    { id: 'e5', source: 'retry-logic', target: 'fallback-handler', properties: { condition: 'max_retries_exceeded' } },
    { id: 'e6', source: 'fallback-handler', target: 'error-handler' },
    { id: 'e7', source: 'error-handler', target: 'end' }
  ],
  variables: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: 'user@example.com',
  isActive: true
};
```

## Advanced Workflows

### Multi-Site Workflow Deployment

```typescript
// Workflow that considers site configuration
const siteAwareWorkflow: Workflow = {
  id: 'wf-site-aware',
  name: 'Site-Aware Manufacturing Workflow',
  nodes: [
    {
      id: 'start',
      type: 'START',
      position: { x: 100, y: 100 }
    },
    {
      id: 'load-site-config',
      type: 'DATA_TRANSFORMATION',
      position: { x: 250, y: 100 },
      properties: {
        operation: 'load_config',
        configKeys: ['max_workers', 'timeout_ms', 'enable_logging']
      }
    },
    {
      id: 'execute-operation',
      type: 'EQUIPMENT_OPERATION',
      position: { x: 400, y: 100 },
      properties: {
        equipmentId: '${equipment}',
        workerCount: '${max_workers}',
        timeout: '${timeout_ms}'
      }
    },
    {
      id: 'end',
      type: 'END',
      position: { x: 550, y: 100 }
    }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'load-site-config' },
    { id: 'e2', source: 'load-site-config', target: 'execute-operation' },
    { id: 'e3', source: 'execute-operation', target: 'end' }
  ],
  variables: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: 'user@example.com',
  isActive: true
};
```

## Integration Examples

### Salesforce Order Processing

```typescript
// Complete workflow: Salesforce → Manufacturing → Inventory → NetSuite
const salesforceWorkflow: Workflow = {
  id: 'wf-salesforce-mfg',
  name: 'Salesforce Order to Manufacturing',
  nodes: [
    {
      id: 'start',
      type: 'START',
      position: { x: 100, y: 100 }
    },
    {
      id: 'fetch-order',
      type: 'SALESFORCE_CONNECTOR',
      position: { x: 250, y: 100 },
      properties: {
        operation: 'query',
        query: "SELECT Id, Amount, Account.Name FROM Opportunity WHERE Id = '${opportunityId}'"
      }
    },
    {
      id: 'create-mfg-order',
      type: 'SAP_CONNECTOR',
      position: { x: 400, y: 100 },
      properties: {
        operation: 'createProductionOrder',
        product: '${product}',
        quantity: '${quantity}',
        dueDate: '${dueDate}'
      }
    },
    {
      id: 'update-inventory',
      type: 'NETSUITE_CONNECTOR',
      position: { x: 550, y: 100 },
      properties: {
        operation: 'updateInventoryLevel',
        item: '${product}',
        location: '${warehouse}',
        quantity: '${-quantity}' // Deduct from inventory
      }
    },
    {
      id: 'notify-salesforce',
      type: 'SALESFORCE_CONNECTOR',
      position: { x: 700, y: 100 },
      properties: {
        operation: 'updateAccount',
        id: '${accountId}',
        lastOrderDate: 'new Date().toISOString()'
      }
    },
    {
      id: 'end',
      type: 'END',
      position: { x: 850, y: 100 }
    }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'fetch-order' },
    { id: 'e2', source: 'fetch-order', target: 'create-mfg-order' },
    { id: 'e3', source: 'create-mfg-order', target: 'update-inventory' },
    { id: 'e4', source: 'update-inventory', target: 'notify-salesforce' },
    { id: 'e5', source: 'notify-salesforce', target: 'end' }
  ],
  variables: {
    opportunityId: { name: 'opportunityId', value: '', type: 'string', scope: 'execution' },
    accountId: { name: 'accountId', value: '', type: 'string', scope: 'execution' },
    product: { name: 'product', value: '', type: 'string', scope: 'execution' },
    quantity: { name: 'quantity', value: 0, type: 'number', scope: 'execution' },
    dueDate: { name: 'dueDate', value: '', type: 'string', scope: 'execution' },
    warehouse: { name: 'warehouse', value: 'Main', type: 'string', scope: 'global' }
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: 'user@example.com',
  isActive: true
};
```

## Performance Optimization

### Best Practices

1. **Use Parallel Nodes for Independent Operations**
   - Reduces execution time
   - Utilizes system resources efficiently

2. **Minimize Variable Scope**
   - Use node-level variables when possible
   - Reduces memory footprint

3. **Error Handling Reduces Retries**
   - Register appropriate handlers
   - Prevents cascading failures

4. **Cache Integration Results**
   - Store API responses
   - Reduces external system load

### Performance Monitoring

```typescript
const result = await engine.executeWorkflow(workflow, 'user');

console.log('Performance Metrics:');
console.log(`Total Duration: ${result.summary.totalDuration}ms`);
console.log(`Successful Nodes: ${result.summary.successfulNodes}`);
console.log(`Failed Nodes: ${result.summary.failedNodes}`);

// Node-level performance
result.nodeResults.forEach((nodeResult, nodeId) => {
  console.log(`${nodeId}: ${nodeResult.duration}ms`);
});
```

---

## Summary

These examples demonstrate:
- ✓ Basic workflow creation and execution
- ✓ Common integration patterns
- ✓ Node type usage
- ✓ Variable management
- ✓ Error handling and recovery
- ✓ Advanced features like parallelism and looping
- ✓ Multi-system integrations (Salesforce, SAP, NetSuite)

Use these as templates for your own workflows!
