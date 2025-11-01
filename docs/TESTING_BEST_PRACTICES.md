# MES Plugin Testing Best Practices Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Unit Testing Patterns](#unit-testing-patterns)
3. [Integration Testing](#integration-testing)
4. [Performance Testing](#performance-testing)
5. [Contract Testing](#contract-testing)
6. [Debugging Techniques](#debugging-techniques)
7. [Common Pitfalls](#common-pitfalls)
8. [Testing Checklist](#testing-checklist)

---

## Introduction

This guide covers comprehensive testing strategies for MES plugins using the Phase 1-4 framework. All testing tools are zero-dependency, using only Node.js built-ins.

### Testing Framework Overview

- **Phase 1**: MockMESServer, createHookContext, test utilities
- **Phase 2**: PerformanceTester, ContractTester, TestDataGenerator
- **Phase 3**: ESLint rules for code quality enforcement
- **Phase 4**: WebhookTunnel, PerformanceProfiler, MemoryAnalyzer, APIRecorder

---

## Unit Testing Patterns

### Pattern 1: Simple Hook Test

```typescript
import { describe, it, expect } from 'vitest';
import { createHookContext, TestDataGenerator } from '@mes/cli';
import { myPlugin } from './plugin';

describe('Plugin Hook Tests', () => {
  it('should create work order successfully', async () => {
    const workOrder = TestDataGenerator.generateWorkOrder();
    const context = createHookContext('workOrder.beforeCreate', {
      data: workOrder,
      userId: 'user-123',
      timestamp: new Date()
    });

    const result = await myPlugin.beforeCreate(context);

    expect(result).toHaveProperty('id');
    expect(result.status).toBe('OPEN');
  });

  it('should handle validation errors', async () => {
    const context = createHookContext('workOrder.beforeCreate', {
      data: { /* invalid data */ }
    });

    expect(() => myPlugin.beforeCreate(context)).toThrow();
  });

  it('should require permission', async () => {
    const context = createHookContext('workOrder.beforeCreate', {
      user: { permissions: [] }, // No permissions
      data: { /* ... */ }
    });

    expect(() => myPlugin.beforeCreate(context)).toThrow('Permission denied');
  });
});
```

### Pattern 2: Async Hook with Retry Logic

```typescript
describe('Async Operations', () => {
  it('should retry on transient failure', async () => {
    let attemptCount = 0;
    const context = createHookContext('material.afterCreate', {
      api: {
        syncInventory: async () => {
          attemptCount++;
          if (attemptCount < 2) throw new Error('Temporary failure');
          return { synced: true };
        }
      }
    });

    const result = await myPlugin.withRetry(context, 3);

    expect(result.synced).toBe(true);
    expect(attemptCount).toBe(2);
  });
});
```

### Pattern 3: Batch Operations

```typescript
describe('Batch Processing', () => {
  it('should process batch of materials', async () => {
    const materials = TestDataGenerator.generateBatch('material', 50);
    const context = createHookContext('material.bulkImport', {
      items: materials
    });

    const results = await myPlugin.processBatch(context);

    expect(results).toHaveLength(50);
    expect(results.every(r => r.success)).toBe(true);
  });

  it('should handle partial failure in batch', async () => {
    const materials = TestDataGenerator.generateBatch('material', 10);
    materials[5].cost = 'invalid'; // Corrupt one item

    const context = createHookContext('material.bulkImport', {
      items: materials
    });

    const results = await myPlugin.processBatch(context);

    expect(results).toHaveLength(10);
    expect(results.filter(r => r.success)).toHaveLength(9);
    expect(results.filter(r => !r.success)).toHaveLength(1);
  });
});
```

---

## Integration Testing

### Setup with MockMESServer

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MockMESServer } from '@mes/cli';

describe('Integration Tests', () => {
  let server: MockMESServer;

  beforeAll(async () => {
    server = new MockMESServer();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should integrate with mock API', async () => {
    // Setup mock endpoint
    server.post('/api/v2/work-orders', {
      body: { id: 'WO-001', status: 'OPEN' }
    });

    // Test plugin
    const result = await myPlugin.createWorkOrder({
      api: server.createClient()
    });

    expect(result.id).toBe('WO-001');
  });
});
```

### End-to-End Workflow Testing

```typescript
describe('E2E Workflows', () => {
  it('should complete work order lifecycle', async () => {
    const workOrder = TestDataGenerator.generateWorkOrder();

    // Phase 1: Creation
    const created = await myPlugin.beforeCreate({
      data: workOrder
    });
    expect(created.status).toBe('OPEN');

    // Phase 2: Assignment
    const assigned = await myPlugin.onAssign({
      id: created.id,
      assignedTo: 'user-123'
    });
    expect(assigned.status).toBe('ASSIGNED');

    // Phase 3: Completion
    const completed = await myPlugin.beforeClose({
      id: created.id,
      closureReason: 'COMPLETED'
    });
    expect(completed.status).toBe('CLOSED');
  });
});
```

---

## Performance Testing

### Basic Benchmark

```typescript
import { PerformanceTester } from '@mes/cli';

describe('Performance Tests', () => {
  it('should benchmark hook execution', async () => {
    const context = createHookContext('workOrder.beforeCreate', {
      data: TestDataGenerator.generateWorkOrder()
    });

    const benchmark = await PerformanceTester.benchmark({
      hook: async (ctx) => myPlugin.beforeCreate(ctx),
      iterations: 100,
      maxExecutionTime: 5000,
      context
    });

    console.log(`Average: ${benchmark.avgExecutionTime}ms`);
    console.log(`P95: ${benchmark.p95ExecutionTime}ms`);

    expect(benchmark.avgExecutionTime).toBeLessThan(100);
    expect(benchmark.passRate).toBeGreaterThan(99);
  });
});
```

### Load Testing

```typescript
describe('Load Tests', () => {
  it('should handle 1000 concurrent requests', async () => {
    const promises = Array(1000)
      .fill(null)
      .map(async () => {
        const context = createHookContext('workOrder.beforeCreate', {
          data: TestDataGenerator.generateWorkOrder()
        });
        return myPlugin.beforeCreate(context);
      });

    const results = await Promise.all(promises);
    expect(results).toHaveLength(1000);
    expect(results.every(r => r.id)).toBe(true);
  });
});
```

### Regression Detection

```typescript
describe('Performance Regression', () => {
  it('should not regress performance', async () => {
    const baseline = await PerformanceTester.benchmark({
      hook: myPlugin.beforeCreate,
      iterations: 50
    });

    // Simulate code change
    const current = await PerformanceTester.benchmark({
      hook: myPlugin.beforeCreate,
      iterations: 50
    });

    const regression = await PerformanceTester.detectRegression(
      myPlugin.beforeCreate,
      baseline,
      undefined,
      10 // 10% threshold
    );

    expect(regression.isRegression).toBe(false);
  });
});
```

---

## Contract Testing

### API Contract Validation

```typescript
import { ContractTester } from '@mes/cli';

describe('Contract Tests', () => {
  const workOrderContract = {
    name: 'workOrder',
    endpoint: '/api/v2/work-orders',
    method: 'POST',
    responseSchema: {
      id: 'string',
      workOrderNumber: 'string',
      status: 'string',
      createdAt: 'string',
      priority: 'string'
    },
    statusCode: 200
  };

  it('should validate hook response against contract', async () => {
    const response = await myPlugin.createWorkOrder({
      data: TestDataGenerator.generateWorkOrder()
    });

    const result = ContractTester.validateResponse(response, workOrderContract);

    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should catch contract violations', async () => {
    const response = {
      id: 'WO-001',
      // Missing required fields!
      statusCode: 200
    };

    const result = ContractTester.validateResponse(response, workOrderContract);

    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].type).toBe('missing_field');
  });
});
```

### Multi-Contract Testing

```typescript
describe('Multi-Contract Tests', () => {
  const contracts = [
    { name: 'create', endpoint: '/api/v2/work-orders', method: 'POST', ... },
    { name: 'read', endpoint: '/api/v2/work-orders/:id', method: 'GET', ... },
    { name: 'update', endpoint: '/api/v2/work-orders/:id', method: 'PUT', ... }
  ];

  it('should satisfy all contracts', async () => {
    const results = await ContractTester.testHookAgainstContracts(
      myPlugin.workOrderHandler,
      contracts,
      context
    );

    expect(results).toHaveLength(3);
    expect(results.every(r => r.passed)).toBe(true);
  });
});
```

---

## Debugging Techniques

### Memory Leak Detection

```typescript
import { MemoryAnalyzer } from '@mes/cli';

describe('Memory Tests', () => {
  it('should not leak memory', async () => {
    const analyzer = new MemoryAnalyzer();
    analyzer.startMonitoring(500);

    // Run hook 100 times
    for (let i = 0; i < 100; i++) {
      await myPlugin.beforeCreate(context);
    }

    const trend = analyzer.stopMonitoring();

    expect(trend.isLeaking).toBe(false);
    expect(trend.confidenceScore).toBeLessThan(50);
  });
});
```

### Performance Profiling

```typescript
import { PerformanceProfiler } from '@mes/cli';

describe('Profiling Tests', () => {
  it('should profile hook execution', async () => {
    const profiler = new PerformanceProfiler();
    profiler.startProfiling('myHook');

    profiler.enterFrame('database');
    await context.api.getUser(userId);
    profiler.exitFrame();

    profiler.enterFrame('validation');
    validateData(data);
    profiler.exitFrame();

    const result = profiler.stopProfiling('myHook');

    console.log(`Total: ${result.totalDuration}ms`);
    console.log('Hotspots:', result.hotspots);

    // Generate flame graph
    const svg = profiler.generateFlameGraphSVG(result);
    // Save for analysis...
  });
});
```

### API Call Recording

```typescript
import { APIRecorder } from '@mes/cli';

describe('API Recording Tests', () => {
  it('should record and replay API calls', async () => {
    const recorder = new APIRecorder('./test-recordings');
    recorder.startRecording('integration-test');

    // Make actual API calls
    const response = await fetch('https://api.example.com/work-orders');

    await recorder.stopRecording();

    // Load and verify recording
    const session = recorder.loadSession('integration-test');
    expect(session?.calls).toHaveLength(1);

    // Replay
    const call = recorder.findMatchingCall('GET', 'https://api.example.com/work-orders');
    expect(call?.response.statusCode).toBe(200);
  });
});
```

---

## Common Pitfalls

### ❌ Pitfall 1: Not Awaiting Promises

```typescript
// WRONG
it('should create work order', async () => {
  const result = myPlugin.beforeCreate(context); // Missing await!
  expect(result.id).toBeDefined();
});

// CORRECT
it('should create work order', async () => {
  const result = await myPlugin.beforeCreate(context);
  expect(result.id).toBeDefined();
});
```

### ❌ Pitfall 2: Not Cleaning Up Resources

```typescript
// WRONG
describe('Tests', () => {
  let server: MockMESServer;

  beforeEach(() => {
    server = new MockMESServer();
  }); // No cleanup!
});

// CORRECT
describe('Tests', () => {
  let server: MockMESServer;

  beforeEach(async () => {
    server = new MockMESServer();
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });
});
```

### ❌ Pitfall 3: Testing Implementation Details

```typescript
// WRONG - Tests internal state
it('should set internal flag', () => {
  myPlugin.internalFlag = true;
  expect(myPlugin.internalFlag).toBe(true);
});

// CORRECT - Tests behavior
it('should handle special case', async () => {
  const result = await myPlugin.beforeCreate({
    data: { specialCase: true }
  });
  expect(result.treated).toBe('special');
});
```

### ❌ Pitfall 4: Flaky Tests with Timing

```typescript
// WRONG - Depends on timing
it('should complete quickly', async () => {
  const start = Date.now();
  await myPlugin.beforeCreate(context);
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(100); // Unreliable!
});

// CORRECT - Use PerformanceTester
it('should meet performance SLA', async () => {
  const benchmark = await PerformanceTester.benchmark({
    hook: myPlugin.beforeCreate,
    iterations: 100
  });
  expect(benchmark.avgExecutionTime).toBeLessThan(100);
});
```

---

## Testing Checklist

### Before Committing

- [ ] All unit tests pass (`npm test`)
- [ ] Integration tests pass with MockMESServer
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Performance benchmarks meet SLA (<100ms avg)
- [ ] No memory leaks detected (MemoryAnalyzer)
- [ ] Contract tests passing
- [ ] Code coverage >80%

### For Production Release

- [ ] All tests pass in CI/CD pipeline
- [ ] Performance regression tests pass
- [ ] Memory profiling shows no leaks
- [ ] Load testing (100+ concurrent) passes
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Security review passed (ESLint security rules)

### For Performance-Critical Hooks

- [ ] Baseline performance metrics documented
- [ ] Regression tests in CI/CD
- [ ] Flame graph generated and analyzed
- [ ] Memory profiling completed
- [ ] Load testing with actual data volumes

---

## Summary

Effective testing requires:

1. **Unit Tests** - Fast, isolated, comprehensive coverage
2. **Integration Tests** - MockMESServer for API simulation
3. **Performance Tests** - PerformanceTester for SLA validation
4. **Contract Tests** - Verify API compliance
5. **Memory Tests** - MemoryAnalyzer for leak detection
6. **Profiling** - PerformanceProfiler for optimization

Combine these techniques to build robust, reliable MES plugins.

---

**Last Updated:** October 31, 2025
**Framework Version:** Phase 1-4 Complete
