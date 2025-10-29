# E2E Testing Developer Guide

## Overview

This guide provides comprehensive instructions for developers working with the MES e2e testing framework. Our testing infrastructure is production-grade, featuring dynamic resource allocation, intelligent reliability management, and extensive coverage of all MES workflows.

## Quick Start

### Prerequisites
```bash
# Ensure database is running
docker-compose up -d postgres

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate
```

### Running Tests
```bash
# Run all e2e tests (not recommended for development)
npm run test:e2e

# Run specific test groups (recommended)
npm run test:e2e:group1  # Core features
npm run test:e2e:group2  # Advanced workflows
npm run test:e2e:group3  # Hierarchies
npm run test:e2e:group4  # API tests
npm run test:e2e:group5  # Routing features
npm run test:e2e:group6  # Smoke tests
npm run test:e2e:group7  # Role tests

# Run specific test files
npx playwright test src/tests/e2e/work-order-management.spec.ts

# Run with headed browser (for debugging)
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug
```

## Architecture Overview

### Infrastructure Components

#### 1. Dynamic Resource Allocation
- **Port Allocation**: Each test project gets unique ports to prevent conflicts
- **Database Isolation**: Dedicated test databases per project
- **Reference Counting**: Prevents resource cleanup during parallel execution

#### 2. Advanced Reliability Features
- **Frontend Stability Manager**: Circuit breaker patterns with intelligent recovery
- **Server Health Monitoring**: Continuous monitoring with automatic recovery
- **Pre-Authentication Caching**: 22 test users cached to prevent rate limiting

#### 3. Test Organization
```
src/tests/e2e/
├── 42 workflow test files (authentication, work orders, quality, etc.)
├── roles/
│   └── 19 role-based test files
└── helpers/
    ├── authCache.ts              # Token caching system
    ├── portAllocator.ts          # Dynamic port management
    ├── databaseAllocator.ts      # Database isolation
    ├── frontendStabilityManager.ts # Circuit breaker patterns
    ├── reliableTestHelpers.ts    # Robust UI interaction patterns
    └── 10 other specialized helpers
```

## Writing New Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';
import { ReliableTestHelpers } from '../helpers/reliableTestHelpers';
import { authenticateAs } from '../helpers/testAuthHelper';

test.describe('My Feature Tests', () => {
  test('should perform basic workflow', async ({ page }) => {
    const helpers = new ReliableTestHelpers(page);

    // Authenticate with cached token (recommended)
    await authenticateAs(page, 'production-operator');

    // Navigate reliably
    await page.goto('/my-feature');

    // Wait for elements reliably
    const button = await helpers.waitForElementReady('button[data-testid="submit"]', {
      timeout: 30000,
      description: 'Submit button'
    });

    // Perform actions
    await button.click();

    // Assertions
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

### Authentication Patterns

#### Using Pre-Authenticated Users (Recommended)
```typescript
import { authenticateAs, TEST_USERS } from '../helpers/testAuthHelper';

// Use cached authentication tokens
await authenticateAs(page, 'admin');
await authenticateAs(page, 'production-operator');
await authenticateAs(page, 'quality-inspector');
```

#### Available Test Users
```typescript
// Core administrative roles
'admin', 'system-administrator', 'plant-manager'

// Production roles
'production-operator', 'production-supervisor', 'production-planner', 'production-scheduler'

// Quality roles
'quality-inspector', 'quality-engineer', 'dcma-inspector'

// Manufacturing roles
'manufacturing-engineer', 'process-engineer'

// Operations roles
'maintenance-technician', 'maintenance-supervisor'
'materials-handler', 'warehouse-manager', 'inventory-control-specialist'
'shipping-receiving', 'logistics-coordinator'
```

### Reliable UI Interactions

#### Element Waiting Patterns
```typescript
const helpers = new ReliableTestHelpers(page);

// Wait for element with retries and progressive loading support
const element = await helpers.waitForElementReady('.complex-component', {
  timeout: 60000,
  retries: 7,
  description: 'Complex dashboard component',
  progressive: true  // Wait for parent containers first
});

// Reliable form filling
await helpers.reliableFill('input[name="partNumber"]', 'PART-001');

// Reliable clicking with stability checks
await helpers.reliableClick('button[data-testid="save"]');
```

#### SPA Navigation Patterns
```typescript
// Wait for SPA to be ready (handles React loading states)
await helpers.waitForSpaReadiness();

// Navigate with SPA awareness
await helpers.navigateToRoute('/work-orders', {
  waitForStability: true,
  expectedSelectors: ['.work-order-list', '.pagination']
});
```

### Database Test Patterns

#### Using Test Data Factories
```typescript
import { DatabaseTestUtilities, TestDataFactory, QuickSetup } from '../../../utils/testing/database-test-utilities';

// Quick setup for common scenarios
const { enterprise, site, user } = await QuickSetup.fullEnvironment();
const { workOrder, equipment, parts } = await QuickSetup.workOrderEnvironment();

// Factory patterns for specific data
const factory = new TestDataFactory(prisma);
const part = await factory.createPart({
  partNumber: 'TEST-PART-001',
  partName: 'Test Component'
});
```

## Test Configuration

### Playwright Projects

Our tests are organized into 17 specialized projects:

#### Authenticated Tests (Self-Managing Auth)
- `authenticated`: Core feature tests with dynamic allocation
- `quality-tests`: Quality management with extended timeouts
- `collaborative-routing-tests`: Routing collaboration features
- `traceability-tests`: Material traceability workflows
- `fai-tests`: First Article Inspection workflows

#### API Tests (Own Request Context)
- `api-tests`: API integration testing
- `equipment-hierarchy-tests`: Equipment hierarchy APIs
- `material-hierarchy-tests`: Material hierarchy APIs
- `parameter-management-tests`: Parameter management APIs
- `spc-tests`: Statistical Process Control APIs

#### Unauthenticated Tests
- `auth-tests`: Authentication flow validation
- `smoke-tests`: Comprehensive site traversal
- `role-tests`: Role-based access validation

### Project-Specific Configuration
```typescript
// playwright.config.ts example
{
  name: 'quality-tests',
  testMatch: '**/quality-management.spec.ts',
  timeout: 120000, // 2 minutes per test
  use: {
    actionTimeout: 120000, // Extended for slow quality dashboard renders
    navigationTimeout: 90000,
  },
}
```

## Performance Optimization

### Test Grouping Strategy
- **Group 1-2**: Core features (80-100 tests each)
- **Group 3-4**: API and hierarchy tests (60-80 tests each)
- **Group 5-6**: Routing and smoke tests (40-60 tests each)
- **Group 7**: Role validation (19 tests)

### Parallel Execution
```bash
# Run groups in parallel (CI/CD)
npm run test:e2e:group1 & npm run test:e2e:group2 & wait

# Sequential execution (safer for local development)
npm run test:e2e:sequential
```

### Resource Management
- **Dynamic Port Allocation**: Prevents EADDRINUSE conflicts
- **Database Isolation**: Each project gets dedicated test database
- **Connection Pool Optimization**: 100 connections for test environment
- **Memory Management**: Automatic cleanup and garbage collection

## Debugging and Troubleshooting

### Common Issues and Solutions

#### Test Timeouts
```typescript
// Increase timeouts for slow operations
test('slow operation', async ({ page }) => {
  test.setTimeout(180000); // 3 minutes for this specific test

  // Use longer waits for complex operations
  await page.waitForSelector('.complex-result', { timeout: 120000 });
});
```

#### Element Not Found
```typescript
// Use progressive loading approach
const helpers = new ReliableTestHelpers(page);
await helpers.waitForSpaReadiness(); // Ensure SPA is loaded
await helpers.waitForElementReady('.target-element', {
  progressive: true,
  description: 'Target element for debugging'
});
```

#### Authentication Issues
```typescript
// Clear and re-authenticate if needed
await page.context().clearCookies();
await authenticateAs(page, 'admin');

// Verify authentication state
const authState = await page.evaluate(() => {
  const authData = localStorage.getItem('mes-auth-storage');
  return authData ? JSON.parse(authData) : null;
});
console.log('Auth state:', authState);
```

#### Database State Issues
```typescript
// Use database utilities for cleanup
const dbUtils = new DatabaseTestUtilities(prisma);
await dbUtils.resetDatabase();
await dbUtils.seedDatabase();
```

### Debug Mode Features
```bash
# Run with debug output
DEBUG=pw:api npm run test:e2e:debug

# Run with browser console output
npm run test:e2e:headed

# Generate trace for failed tests
npx playwright show-trace test-results/trace.zip
```

### Visual Debugging
- **Screenshots**: Automatically captured on failure
- **Videos**: Recorded for failed tests
- **Traces**: Full execution traces for debugging
- **Console Logs**: Browser console output captured

## Best Practices

### Test Organization
1. **Group Related Tests**: Use descriptive test suites
2. **Use Data-Testid**: Prefer `data-testid` over CSS selectors
3. **Meaningful Assertions**: Use descriptive error messages
4. **Clean Test Data**: Use factories and cleanup utilities

### Performance
1. **Use Cached Authentication**: Avoid login flows in every test
2. **Optimize Waits**: Use specific waits rather than fixed timeouts
3. **Parallel Execution**: Design tests to be independent
4. **Resource Cleanup**: Clean up test data appropriately

### Reliability
1. **Handle Dynamic Content**: Use progressive loading patterns
2. **Retry Mechanisms**: Use built-in retry capabilities
3. **Stable Selectors**: Use semantic selectors over CSS classes
4. **Error Handling**: Graceful degradation for non-critical failures

### Code Quality
1. **Reusable Helpers**: Extract common patterns to helper functions
2. **Type Safety**: Use TypeScript for better development experience
3. **Documentation**: Comment complex test logic
4. **Consistent Patterns**: Follow established test patterns

## Advanced Features

### Custom Test Fixtures
```typescript
// Create reusable test fixtures
export const workOrderTest = test.extend<{
  workOrderSetup: { enterprise: any, site: any, workOrder: any }
}>({
  workOrderSetup: async ({}, use) => {
    const setup = await QuickSetup.workOrderEnvironment();
    await use(setup);
    // Cleanup happens automatically
  },
});

// Use in tests
workOrderTest('should complete work order', async ({ page, workOrderSetup }) => {
  const { workOrder } = workOrderSetup;
  // Test implementation
});
```

### Performance Monitoring
```typescript
import { DatabasePerformanceMonitor, PerformanceTestUtils } from '../helpers/performanceTestUtils';

test('performance-critical operation', async ({ page }) => {
  const { result, duration, memoryUsage } = await PerformanceTestUtils.measureOperation(
    async () => {
      // Perform operation
      return await page.locator('.result').textContent();
    }
  );

  expect(duration).toBeLessThan(5000); // Max 5 seconds
  expect(result).toBeDefined();
});
```

### Cross-Service Integration
```typescript
// Test cross-service workflows
test('end-to-end integration', async ({ page, request }) => {
  // API setup
  const apiResponse = await request.post('/api/v1/work-orders', {
    data: { /* work order data */ }
  });
  const workOrder = await apiResponse.json();

  // UI verification
  await page.goto(`/work-orders/${workOrder.id}`);
  await expect(page.locator(`[data-testid="wo-${workOrder.id}"]`)).toBeVisible();
});
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    npm run test:e2e:group1
    npm run test:e2e:group2
    npm run test:e2e:group3
  env:
    CI: true

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: test-results/
```

### Test Reporting
- **JSON Reports**: `test-results/results.json`
- **JUnit Reports**: `test-results/results.xml`
- **HTML Reports**: Generated with `npx playwright show-report`
- **Coverage Reports**: Available via `npm run test:coverage`

## Conclusion

This e2e testing framework provides enterprise-grade testing capabilities with sophisticated reliability features. By following these patterns and best practices, you can write maintainable, reliable tests that provide confidence in the MES system's critical workflows.

For additional information, refer to:
- [E2E Test Groups](../E2E_TEST_GROUPS.md) - Test organization and grouping
- [Role-Based Testing Guide](./ROLE_BASED_TESTING_EXECUTION_GUIDE.md) - Role-specific testing patterns
- [Playwright Documentation](https://playwright.dev/docs) - Framework documentation