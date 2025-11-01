# MES Plugin Development FAQ

## Quick Reference

- **50+ Common Questions** addressed
- **Organized by Category**
- **Solutions with Code Examples**
- **Links to Full Documentation**

---

## Installation & Setup (Q1-Q8)

### Q1: How do I install the MES plugin framework?

```bash
npm install @mes/cli
npm install --save-dev @mes/eslint-plugin
```

### Q2: What are the minimum Node.js requirements?

Node.js 16.0.0 or higher. We recommend 18.x or later for best performance.

### Q3: How do I scaffold a new plugin?

```bash
npx @mes/cli scaffold my-plugin
cd my-plugin
npm install
```

### Q4: What dependencies does the framework require?

**Zero external dependencies!** All tools use Node.js built-in modules:
- `perf_hooks` for performance measurement
- `http`/`https` for webhooks
- `fs` for file operations

### Q5: Do I need ngrok for webhook testing?

No! Use `WebhookTunnel` from Phase 4:

```typescript
const tunnel = new WebhookTunnel({ port: 3000 });
await tunnel.start();
// Public URL ready for webhook testing
```

### Q6: How do I enable ESLint rules?

```javascript
// .eslintrc.js
module.exports = {
  extends: ['plugin:@mes/eslint-plugin/recommended']
};
```

### Q7: What's the recommended project structure?

```
my-plugin/
├── src/
│   ├── hooks/
│   │   ├── beforeCreate.ts
│   │   ├── afterCreate.ts
│   │   └── onDelete.ts
│   ├── validators/
│   │   └── validateData.ts
│   └── index.ts
├── tests/
│   ├── hooks.test.ts
│   └── integration.test.ts
├── manifest.json
├── package.json
├── tsconfig.json
└── .eslintrc.js
```

### Q8: How do I update the framework?

```bash
npm update @mes/cli @mes/eslint-plugin
```

---

## Testing & Debugging (Q9-Q25)

### Q9: My hook isn't being called. What do I check?

1. Verify manifest.json has correct hook name
2. Check hook function exports: `export const beforeCreate = async (context) => {}`
3. Ensure hook is registered in manifest
4. Run ESLint: `npm run lint`

### Q10: How do I test with sample data?

```typescript
import { TestDataGenerator } from '@mes/cli';

const workOrder = TestDataGenerator.generateWorkOrder();
const materials = TestDataGenerator.generateBatch('material', 10);
```

### Q11: How do I mock API calls?

```typescript
import { MockMESServer, createHookContext } from '@mes/cli';

const server = new MockMESServer();
server.post('/api/v2/work-orders', { body: { id: 'WO-001' } });

const context = createHookContext('workOrder.beforeCreate', {
  api: server.createClient()
});
```

### Q12: How do I measure performance?

```typescript
import { PerformanceTester } from '@mes/cli';

const benchmark = await PerformanceTester.benchmark({
  hook: myPlugin.beforeCreate,
  iterations: 100,
  maxExecutionTime: 5000
});

console.log(`Avg: ${benchmark.avgExecutionTime}ms`);
console.log(`P95: ${benchmark.p95ExecutionTime}ms`);
```

### Q13: How do I detect memory leaks?

```typescript
import { MemoryAnalyzer } from '@mes/cli';

const analyzer = new MemoryAnalyzer();
analyzer.startMonitoring(1000);

// Run your code...

const trend = analyzer.stopMonitoring();
if (trend.isLeaking) {
  console.warn('Memory leak detected!');
  console.warn('Confidence:', trend.confidenceScore);
}
```

### Q14: How do I validate API contracts?

```typescript
import { ContractTester } from '@mes/cli';

const contract = {
  name: 'workOrder',
  method: 'POST',
  responseSchema: { id: 'string', status: 'string' },
  statusCode: 200
};

const result = ContractTester.validateResponse(response, contract);
if (!result.passed) {
  console.error('Contract violations:', result.errors);
}
```

### Q15: How do I record webhook calls for testing?

```typescript
import { APIRecorder } from '@mes/cli';

const recorder = new APIRecorder('./recordings');
recorder.startRecording('my-test');

// Make API calls - automatically recorded...

await recorder.stopRecording();
```

### Q16: How do I profile a slow hook?

```typescript
import { PerformanceProfiler } from '@mes/cli';

const profiler = new PerformanceProfiler();
profiler.startProfiling('myHook');

// Run hook...

const result = profiler.stopProfiling('myHook');
console.log('Hotspots:', result.hotspots);

// Save flame graph
const svg = profiler.generateFlameGraphSVG(result);
```

### Q17: How do I test async operations?

```typescript
it('should handle async', async () => {
  const context = createHookContext('workOrder.beforeCreate', {
    api: { getUser: async () => ({ id: '123' }) }
  });

  const result = await myPlugin.beforeCreate(context);
  expect(result).toBeDefined();
});
```

### Q18: What's the difference between unit and integration tests?

- **Unit Tests**: Test hook in isolation, mock everything
- **Integration Tests**: Use MockMESServer, test real workflows

### Q19: How do I handle errors in tests?

```typescript
it('should throw on invalid data', async () => {
  const context = createHookContext('workOrder.beforeCreate', {
    data: {} // Invalid
  });

  expect(() => myPlugin.beforeCreate(context)).toThrow();
});
```

### Q20: How do I test batch operations?

```typescript
const items = TestDataGenerator.generateBatch('material', 1000);
const context = createHookContext('material.bulkCreate', { items });
const results = await myPlugin.processBatch(context);
expect(results).toHaveLength(1000);
```

### Q21: How do I verify permissions are checked?

```typescript
it('should require DELETE permission', async () => {
  const context = createHookContext('workOrder.delete', {
    user: { permissions: [] } // No DELETE
  });

  expect(() => myPlugin.delete(context)).toThrow('Permission denied');
});
```

### Q22: How do I test external API integration?

Use `APIRecorder` to record actual responses, then replay:

```typescript
const recorder = new APIRecorder('./recordings');
const session = recorder.loadSession('external-api-calls');
const call = recorder.findMatchingCall('GET', '/api/external/...');
```

### Q23: How do I avoid flaky tests?

- Use `PerformanceTester` instead of `Date.now()` for timing
- Use MockMESServer instead of real API calls
- Avoid hard-coded delays - use `waitFor` utilities
- Use deterministic test data

### Q24: How do I test webhook endpoints?

```typescript
import { WebhookTunnel } from '@mes/cli';

const tunnel = new WebhookTunnel({ port: 3000 });
const session = await tunnel.start();

// Send webhook to session.publicUrl
// Verify in session.requests
```

### Q25: How do I generate test reports?

```typescript
const benchmark = await PerformanceTester.benchmark({...});
const json = JSON.stringify(benchmark, null, 2);
fs.writeFileSync('benchmark.json', json);

// Or HAR format
const har = recorder.exportAsHAR(session);
fs.writeFileSync('calls.har', JSON.stringify(har, null, 2));
```

---

## Code Quality (Q26-Q35)

### Q26: What ESLint rules should I follow?

All 10 MES-specific rules are enabled in `recommended` config:
- `no-blocking-hooks`
- `require-error-handling`
- `limit-hook-execution-time`
- `no-direct-db-access`
- `require-permission-checks`
- `no-unhandled-promises`
- `no-console-in-production`
- `require-pagination`
- `validate-manifest`
- `security-linting`

### Q27: How do I fix ESLint violations?

```bash
# Auto-fix
npm run lint -- --fix

# Or manually:
npm run lint

# Then fix issues described in output
```

### Q28: Should hooks be async?

Yes, always. All hooks receive an async context:

```typescript
// ✅ CORRECT
export const beforeCreate = async (context) => {
  const user = await context.api.getUser(context.userId);
  return { ...data, validatedBy: user.id };
};

// ❌ WRONG
export const beforeCreate = (context) => {
  // Can't use await!
};
```

### Q29: How do I handle database access?

Use `context.api`:

```typescript
// ✅ CORRECT
const user = await context.api.getUser(userId);

// ❌ WRONG - Direct DB access
import prisma from '@prisma/client';
const user = await prisma.user.findUnique({...});
```

### Q30: How do I validate user permissions?

Use ESLint rule `require-permission-checks`:

```typescript
export const deleteWorkOrder = async (context) => {
  if (!context.user.permissions.includes('DELETE_WORK_ORDER')) {
    throw new Error('Permission denied: DELETE_WORK_ORDER');
  }
  return context.api.delete(context.id);
};
```

### Q31: What's the maximum execution time?

5 seconds (`limit-hook-execution-time`). If you need more:
1. Break into smaller operations
2. Use pagination (limit 100-1000 items per request)
3. Consider async background tasks

### Q32: How do I handle errors properly?

```typescript
// ✅ CORRECT
export const beforeCreate = async (context) => {
  try {
    const result = await context.api.create(data);
    return result;
  } catch (error) {
    context.logger.error('Creation failed', error);
    throw new Error(`Failed to create: ${error.message}`);
  }
};

// ❌ WRONG - No error handling
export const beforeCreate = async (context) => {
  return context.api.create(data);
};
```

### Q33: How do I paginate results?

```typescript
export const listMaterials = async (context) => {
  const page = context.page || 1;
  const pageSize = Math.min(context.pageSize || 50, 1000);

  return context.api.materials.list({
    page,
    pageSize
  });
};
```

### Q34: What console usage is allowed?

None in production! Use `context.logger`:

```typescript
// ✅ CORRECT
context.logger.debug('Processing', { id: data.id });
context.logger.warn('High cost item', { cost: data.cost });

// ❌ WRONG
console.log('Processing...');
console.warn('High cost!');
```

### Q35: How do I validate my manifest?

```bash
# ESLint includes validate-manifest rule
npm run lint

# Check manifest.json:
# - name (string)
# - version (semver)
# - hooks (array of hook definitions)
# - each hook has: name, trigger, description
```

---

## Performance (Q36-Q45)

### Q36: What's a good hook execution time?

Target: **<100ms average**
- 50ms: Excellent
- 100ms: Good
- 500ms: Acceptable for slow operations
- 5000ms: Maximum (hard timeout)

### Q37: How do I optimize slow hooks?

1. Profile with `PerformanceProfiler`
2. Identify hotspots (top 10)
3. Optimize in order:
   - Cache results
   - Use pagination
   - Parallelize operations
   - Consider async background tasks

### Q38: Should I cache data?

Yes, but be careful:

```typescript
const cache = new Map();

export const beforeCreate = async (context) => {
  // Check cache
  if (cache.has(context.userId)) {
    return cache.get(context.userId);
  }

  // Fetch
  const user = await context.api.getUser(context.userId);

  // Cache with TTL
  cache.set(context.userId, user);
  setTimeout(() => cache.delete(context.userId), 60000); // 1 min TTL

  return user;
};
```

### Q39: How do I handle large batches?

```typescript
export const processBatch = async (context) => {
  const results = [];

  for (const batch of chunk(context.items, 100)) {
    const batchResults = await Promise.all(
      batch.map(item => context.api.create(item))
    );
    results.push(...batchResults);
  }

  return results;
};

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
```

### Q40: How do I detect performance regressions?

```typescript
const baseline = await PerformanceTester.benchmark({
  hook: myHook, iterations: 50
});

// After code change...
const regression = await PerformanceTester.detectRegression(
  myHook, baseline, undefined, 10 // 10% threshold
);

if (regression.isRegression) {
  console.error('Performance regression detected!');
}
```

### Q41: What causes high memory usage?

1. Unreleased event listeners
2. Circular references
3. Large unbounded caches
4. Not closing database connections

Use `MemoryAnalyzer` to detect.

### Q42: How do I reduce bundle size?

```bash
# Check what's included
npm ls

# Remove unused dependencies
npm prune

# Tree-shaking friendly imports
import { beforeCreate } from '@mes/cli'; // Good
import * as MES from '@mes/cli'; // Bad
```

### Q43: Should I use external libraries?

Keep dependencies minimal. For common tasks:
- Validation: Use built-in checks
- Logging: Use `context.logger`
- HTTP: Use `context.api`
- Dates: Use `new Date()` and simple math

### Q44: How do I handle timeout errors?

```typescript
export const withTimeout = async (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
};

// Usage
const result = await withTimeout(
  mySlowOperation(),
  5000 // 5 second timeout
);
```

### Q45: What's the memory limit?

No hard limit, but stay under 500MB total for plugin + data.

---

## Security (Q46-Q50)

### Q46: How do I handle sensitive data?

```typescript
// ✅ CORRECT - Sanitize before logging
context.logger.debug('User data', {
  id: user.id,
  email: user.email.substring(0, 3) + '***'
});

// ❌ WRONG - Logs full password!
context.logger.debug('User:', user);
```

### Q47: How do I validate input?

```typescript
function validateWorkOrder(data) {
  if (!data.partNumber) throw new Error('Missing partNumber');
  if (typeof data.quantity !== 'number') {
    throw new Error('quantity must be number');
  }
  if (data.quantity < 1 || data.quantity > 1000000) {
    throw new Error('quantity out of range');
  }
  return data;
}
```

### Q48: How do I prevent SQL injection?

Use `context.api` (parameterized):

```typescript
// ✅ CORRECT - Parameterized
const users = await context.api.users.findMany({
  where: { name: userName } // Parameter-safe
});

// ❌ WRONG - String interpolation
const users = await context.api.query(`
  SELECT * FROM users WHERE name = '${userName}'
`);
```

### Q49: Should hooks contain secrets?

No! Use environment variables:

```typescript
// ✅ CORRECT
const apiKey = process.env.EXTERNAL_API_KEY;

// ❌ WRONG
const apiKey = 'sk_live_abc123xyz';
```

### Q50: How do I audit hook calls?

Use `context.logger`:

```typescript
context.logger.info('Hook executed', {
  hook: 'beforeCreate',
  userId: context.user.id,
  timestamp: new Date().toISOString(),
  dataId: context.data.id
});
```

---

## Troubleshooting

### Hook not triggering?
1. Check manifest.json
2. Verify hook export
3. Run `npm run lint`
4. Restart dev server

### Performance too slow?
1. Use `PerformanceProfiler`
2. Find hotspots
3. Add caching or pagination
4. Profile memory with `MemoryAnalyzer`

### Tests failing?
1. Use `MockMESServer` for API calls
2. Use `TestDataGenerator` for test data
3. Check ESLint violations
4. Verify async/await usage

### Memory leaks?
1. Run `MemoryAnalyzer`
2. Check event listeners
3. Look for circular references
4. Review cache TTLs

---

**Last Updated:** October 31, 2025
**Framework Version:** Phase 1-4 Complete
