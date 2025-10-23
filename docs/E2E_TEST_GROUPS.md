# E2E Test Groups

## Overview

The E2E test suite has been split into 7 smaller groups to improve stability and reduce backend load. Each group can be run independently, and they can also be run sequentially to validate the entire system.

## Why Test Groups?

**Problem**: Running all 637 tests at once can overwhelm the backend server, causing crashes and test failures.

**Solution**: Split tests into logical groups of 50-100 tests each, allowing:
- Better backend load distribution
- Easier debugging (isolate failures to specific groups)
- Faster feedback (run only relevant groups during development)
- Improved stability (retry individual groups on failure)

## Test Groups

### Group 1: Core Features (`test:e2e:group1`)
**Projects**: `authenticated`, `quality-tests`
**Test Files**:
- frontend-quality.spec.ts
- material-traceability.spec.ts
- work-order-management.spec.ts
- performance.spec.ts
- product-definition.spec.ts
- production-scheduling.spec.ts
- quality-management.spec.ts

**Estimated Tests**: ~80-100 tests
**Purpose**: Core MES features (work orders, quality, traceability)

```bash
npm run test:e2e:group1
```

### Group 2: Advanced Workflows (`test:e2e:group2`)
**Projects**: `collaborative-routing-tests`, `traceability-tests`, `fai-tests`
**Test Files**:
- collaborative-routing.spec.ts
- traceability-workflow.spec.ts
- fai-workflow.spec.ts

**Estimated Tests**: ~60-80 tests
**Purpose**: Complex workflows (routing, genealogy, FAI)

```bash
npm run test:e2e:group2
```

### Group 3: Hierarchy Tests (`test:e2e:group3`)
**Projects**: `equipment-hierarchy-tests`, `material-hierarchy-tests`, `process-segment-hierarchy-tests`
**Test Files**:
- equipment-hierarchy.spec.ts
- material-hierarchy.spec.ts
- process-segment-hierarchy.spec.ts

**Estimated Tests**: ~40-60 tests
**Purpose**: API tests for hierarchical data structures

```bash
npm run test:e2e:group3
```

### Group 4: Auth & API (`test:e2e:group4`)
**Projects**: `auth-tests`, `api-tests`
**Test Files**:
- authentication.spec.ts
- account-status-errors.spec.ts
- dashboard-after-login.spec.ts
- csp-api-violations.spec.ts
- mainlayout-permission-errors.spec.ts
- api-integration.spec.ts
- work-order-execution.spec.ts
- b2m-integration.spec.ts
- l2-equipment-integration.spec.ts

**Estimated Tests**: ~80-100 tests
**Purpose**: Authentication and API integration tests

```bash
npm run test:e2e:group4
```

### Group 5: Routing Tests (`test:e2e:group5`)
**Projects**: `routing-edge-cases`, `routing-localhost`
**Test Files**:
- routing-edge-cases.spec.ts
- spa-routing.spec.ts

**Estimated Tests**: ~60-80 tests
**Purpose**: SPA routing and navigation edge cases

```bash
npm run test:e2e:group5
```

### Group 6: Smoke Tests (`test:e2e:group6`)
**Projects**: `smoke-tests`
**Test Files**:
- frontend-smoke-test.spec.ts

**Estimated Tests**: ~50-60 tests
**Purpose**: Comprehensive site traversal and smoke testing

```bash
npm run test:e2e:group6
```

### Group 7: Role-Based Tests (`test:e2e:group7`)
**Projects**: `role-tests`
**Test Files**: All files in `src/tests/e2e/roles/`
- production-operator.spec.ts
- production-supervisor.spec.ts
- production-planner.spec.ts
- production-scheduler.spec.ts
- manufacturing-engineer.spec.ts
- quality-engineer.spec.ts
- quality-inspector.spec.ts
- dcma-inspector.spec.ts
- process-engineer.spec.ts
- warehouse-manager.spec.ts
- materials-handler.spec.ts
- shipping-receiving.spec.ts
- logistics-coordinator.spec.ts
- maintenance-technician.spec.ts
- maintenance-supervisor.spec.ts
- plant-manager.spec.ts
- system-administrator.spec.ts
- superuser.spec.ts
- inventory-control-specialist.spec.ts

**Estimated Tests**: ~180-200 tests
**Purpose**: Role-based access control validation

```bash
npm run test:e2e:group7
```

## Running Tests

### Run All Groups Sequentially
Runs all test groups one after another (recommended for CI/CD):

```bash
npm run test:e2e:sequential
```

This will:
1. Run Group 1 (Core Features)
2. Run Group 2 (Advanced Workflows)
3. Run Group 3 (Hierarchy Tests)
4. Run Group 4 (Auth & API)
5. Run Group 5 (Routing Tests)
6. Run Group 7 (Role-Based Tests)
7. Skip Group 6 (Smoke Tests) - run separately if needed

**Note**: Group 6 is excluded from sequential runs because it overlaps with other tests.

### Run All Tests at Once (Original Behavior)
```bash
npm run test:e2e
```

**Warning**: This may cause backend crashes on long runs. Use sequential mode instead.

### Run Individual Groups
```bash
npm run test:e2e:group1  # Core features
npm run test:e2e:group2  # Advanced workflows
npm run test:e2e:group3  # Hierarchy tests
npm run test:e2e:group4  # Auth & API
npm run test:e2e:group5  # Routing tests
npm run test:e2e:group6  # Smoke tests
npm run test:e2e:group7  # Role-based tests
```

### Run Specific Playwright Projects
```bash
npx playwright test --project=authenticated
npx playwright test --project=quality-tests
npx playwright test --project=role-tests
```

### Run Role Tests by Tier
```bash
npm run test:roles:tier1  # Production roles
npm run test:roles:tier2  # Quality & compliance roles
npm run test:roles:tier3  # Materials & logistics roles
npm run test:roles:tier4  # Maintenance roles
npm run test:roles:tier5  # Administration roles
```

## Benefits of Grouped Testing

1. **Better Stability**: Smaller test batches reduce backend load and prevent crashes
2. **Faster Debugging**: Failures isolated to specific groups are easier to diagnose
3. **Parallel Development**: Teams can run relevant test groups during feature development
4. **CI/CD Optimization**: Failed groups can be retried without re-running entire suite
5. **Resource Management**: Better memory and CPU utilization

## Resilience Features

The test infrastructure includes:

- **Server Health Monitoring**: Monitors backend/frontend health every 30 seconds
- **Automatic Retry**: Transient failures are retried with exponential backoff (up to 3 retries)
- **Circuit Breaker**: Prevents cascading failures after 5 consecutive auth failures
- **Auth Token Caching**: Reduces auth API calls by ~95%, preventing rate limiting
- **Graceful Degradation**: Detailed error logging helps debug infrastructure issues

## Troubleshooting

### Backend Crashes During Tests
If the backend crashes during a test run:

1. Check the health monitor output in test logs
2. Run smaller groups instead of all tests at once
3. Review backend logs for memory/resource issues
4. Consider increasing backend resources or reducing worker count

### Flaky Tests
If tests fail intermittently:

1. Run the specific test group again: `npm run test:e2e:group<N>`
2. Check for retry logs in test output (automatic retry will attempt 1-3 times)
3. Review circuit breaker status if auth failures occur
4. Verify test data isolation between test runs

### Debugging Specific Groups
```bash
# Run with headed browser to see what's happening
npm run test:e2e:group1 -- --headed

# Run with debug mode for step-by-step execution
npm run test:e2e:group1 -- --debug

# Run with verbose logging
npm run test:e2e:group1 -- --reporter=list
```

## CI/CD Recommendations

For continuous integration:

```yaml
# Run groups sequentially with retries
- name: Run E2E Tests
  run: npm run test:e2e:sequential

# Or run groups in parallel (requires multiple runners)
- name: Run Group 1
  run: npm run test:e2e:group1

- name: Run Group 2
  run: npm run test:e2e:group2

# ...etc
```

## Statistics

- **Total E2E Tests**: 637 tests
- **Test Spec Files**: 47 files
- **Test Groups**: 7 groups
- **Average Tests per Group**: ~90 tests
- **Estimated Full Suite Runtime**: 15-20 minutes (sequential mode)
- **Estimated Group Runtime**: 2-4 minutes per group
