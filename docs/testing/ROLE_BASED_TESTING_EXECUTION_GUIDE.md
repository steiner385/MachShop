# Role-Based Testing Execution Guide

**Version**: 1.0
**Date**: October 19, 2025
**Status**: Production Ready

---

## Quick Start

### Run All Role Tests
```bash
# Execute all 19 role test suites
npx playwright test src/tests/e2e/roles/

# With HTML report
npx playwright test src/tests/e2e/roles/ --reporter=html
npx playwright show-report
```

### Run Tests by Tier

```bash
# Tier 1 - Production Roles (P0 - Critical)
npx playwright test src/tests/e2e/roles/production-*.spec.ts

# Tier 2 - Quality & Compliance (P1 - High)
npx playwright test src/tests/e2e/roles/quality-*.spec.ts
npx playwright test src/tests/e2e/roles/dcma-*.spec.ts
npx playwright test src/tests/e2e/roles/process-*.spec.ts

# Tier 3 - Materials & Logistics (P1 - High)
npx playwright test src/tests/e2e/roles/warehouse-*.spec.ts
npx playwright test src/tests/e2e/roles/materials-*.spec.ts
npx playwright test src/tests/e2e/roles/shipping-*.spec.ts
npx playwright test src/tests/e2e/roles/logistics-*.spec.ts

# Tier 4 - Maintenance (P2 - Medium)
npx playwright test src/tests/e2e/roles/maintenance-*.spec.ts

# Tier 5 - Administration (P2 - Medium)
npx playwright test src/tests/e2e/roles/plant-*.spec.ts
npx playwright test src/tests/e2e/roles/system-*.spec.ts
npx playwright test src/tests/e2e/roles/superuser.spec.ts
npx playwright test src/tests/e2e/roles/inventory-*.spec.ts
```

### Run Individual Role Tests

```bash
# Production Operator
npx playwright test src/tests/e2e/roles/production-operator.spec.ts

# Quality Engineer
npx playwright test src/tests/e2e/roles/quality-engineer.spec.ts

# DCMA Inspector
npx playwright test src/tests/e2e/roles/dcma-inspector.spec.ts

# Manufacturing Engineer
npx playwright test src/tests/e2e/roles/manufacturing-engineer.spec.ts
```

---

## Test Environment Setup

### Prerequisites

1. **Backend Server**: Must be running on port 3101 (E2E mode)
2. **Frontend Server**: Must be running on port 5278 (E2E mode)
3. **Database**: E2E test database `mes_e2e_db` must be seeded

### Environment Setup Commands

```bash
# 1. Set up E2E environment
npm run test:e2e:setup

# 2. Start E2E servers (in separate terminals)
# Terminal 1: Backend
npm run e2e:server

# Terminal 2: Frontend
npm run e2e:frontend

# 3. Run tests (in third terminal)
npx playwright test src/tests/e2e/roles/
```

---

## Advanced Test Execution

### Parallel Execution

```bash
# Run tests in parallel (default: 4 workers)
npx playwright test src/tests/e2e/roles/ --workers=4

# Run tests in parallel (max workers)
npx playwright test src/tests/e2e/roles/ --workers=100%

# Run sequentially (useful for debugging)
npx playwright test src/tests/e2e/roles/ --workers=1
```

### Debugging Tests

```bash
# Run in headed mode (see browser)
npx playwright test src/tests/e2e/roles/production-operator.spec.ts --headed

# Run in debug mode (step through)
npx playwright test src/tests/e2e/roles/production-operator.spec.ts --debug

# Run with trace
npx playwright test src/tests/e2e/roles/ --trace=on

# View trace
npx playwright show-trace trace.zip
```

### Filtering Tests

```bash
# Run only P0 (critical) tests
npx playwright test src/tests/e2e/roles/production-*.spec.ts
npx playwright test src/tests/e2e/roles/manufacturing-*.spec.ts

# Run only authentication tests
npx playwright test src/tests/e2e/roles/ --grep="AUTH-"

# Run only permission boundary tests
npx playwright test src/tests/e2e/roles/ --grep="PERM-"

# Exclude specific tests
npx playwright test src/tests/e2e/roles/ --grep-invert="SKIP"
```

---

## Test Reporting

### HTML Report (Recommended)

```bash
# Generate HTML report
npx playwright test src/tests/e2e/roles/ --reporter=html

# View report
npx playwright show-report
```

### CI/CD Reports

```bash
# JUnit XML (for CI systems)
npx playwright test src/tests/e2e/roles/ --reporter=junit

# JSON report
npx playwright test src/tests/e2e/roles/ --reporter=json

# Line reporter (concise output)
npx playwright test src/tests/e2e/roles/ --reporter=line

# List reporter (detailed output)
npx playwright test src/tests/e2e/roles/ --reporter=list
```

### Multiple Reporters

```bash
# HTML + JUnit
npx playwright test src/tests/e2e/roles/ --reporter=html,junit

# JSON + Line
npx playwright test src/tests/e2e/roles/ --reporter=json,line
```

---

## Test Organization by Use Case

### Pre-Deployment Validation

```bash
# Run all P0 tests before deployment
npx playwright test src/tests/e2e/roles/production-*.spec.ts --reporter=html
npx playwright test src/tests/e2e/roles/manufacturing-*.spec.ts --reporter=html
```

### DCMA Audit Preparation

```bash
# Run compliance-focused tests
npx playwright test src/tests/e2e/roles/dcma-inspector.spec.ts
npx playwright test src/tests/e2e/roles/quality-*.spec.ts
npx playwright test src/tests/e2e/roles/production-operator.spec.ts --grep="AUDIT"
```

### Security Audit

```bash
# Run permission boundary tests for all roles
npx playwright test src/tests/e2e/roles/ --grep="PERM-"

# Verify READ-ONLY roles
npx playwright test src/tests/e2e/roles/dcma-inspector.spec.ts
npx playwright test src/tests/e2e/roles/plant-manager.spec.ts
```

### New Feature Validation

```bash
# Run specific role tests affected by feature
# Example: New routing feature
npx playwright test src/tests/e2e/roles/manufacturing-engineer.spec.ts
npx playwright test src/tests/e2e/roles/production-planner.spec.ts
```

---

## Common Test Patterns

### Test Structure

Each role test follows this pattern:

```typescript
test.describe('Role Name - Test Category', () => {
  test('TEST-ID: Test description', async ({ page }) => {
    // 1. Navigate with authentication
    await navigateAuthenticated(page, '/route', 'roleName');

    // 2. Perform actions
    await page.click('button:has-text("Action")');

    // 3. Verify results
    await expectPageTitle(page, 'Expected Title');

    // 4. Log success
    console.log('✓ Test validation complete');
  });
});
```

### Test Categories

1. **Authentication & Authorization** (`AUTH-`)
   - Login validation
   - Access control
   - Session management

2. **Navigation & Menu Visibility** (`NAV-`)
   - Menu item visibility
   - Route access
   - UI element visibility

3. **Permission Boundary** (`PERM-`)
   - CAN perform authorized actions
   - CANNOT perform unauthorized actions
   - Read-only vs. read-write

4. **CRUD Operations** (`CRUD-`)
   - Create capability
   - Read access
   - Update permissions
   - Delete restrictions

5. **Workflows** (`WORK-`)
   - End-to-end processes
   - Multi-step workflows
   - Cross-role collaboration

6. **Forms & Validation** (`FORM-`)
   - Field validation
   - Required fields
   - Data constraints

7. **Reporting** (`RPT-`)
   - Report generation
   - Data export
   - Dashboard views

8. **Integration** (`INT-`)
   - API interactions
   - Real-time updates
   - External systems

9. **Compliance & Audit** (`AUDIT-`)
   - AS9100 validation
   - DCMA requirements
   - Traceability

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3101 (backend)
sudo lsof -ti:3101 | xargs kill -9

# Kill process on port 5278 (frontend)
sudo lsof -ti:5278 | xargs kill -9
```

### Database Issues

```bash
# Reset E2E database
npm run test:e2e:db:reset

# Re-seed test data
npm run test:e2e:db:seed
```

### Authentication Failures

```bash
# Check if auth service is running
curl http://localhost:3101/api/v1/auth/login

# Verify test users exist
npm run test:e2e:verify-users
```

### Test Timeouts

```bash
# Increase timeout for slow tests
npx playwright test src/tests/e2e/roles/ --timeout=60000

# Or in playwright.config.ts:
# timeout: 60 * 1000
```

---

## Performance Optimization

### Reduce Test Execution Time

```bash
# Run in parallel with max workers
npx playwright test src/tests/e2e/roles/ --workers=100%

# Run only changed tests
npx playwright test src/tests/e2e/roles/ --only-changed

# Use trace only on failure
npx playwright test src/tests/e2e/roles/ --trace=retain-on-failure
```

### Test Data Optimization

- Use test data fixtures for faster setup
- Mock external API calls when possible
- Reuse authentication tokens across tests
- Parallelize independent test suites

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Role-Based E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Setup E2E environment
        run: npm run test:e2e:setup

      - name: Run role-based tests
        run: npx playwright test src/tests/e2e/roles/ --reporter=html,junit

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload JUnit report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: junit-report
          path: test-results/junit.xml
```

---

## Test Maintenance

### Adding New Roles

1. **Add user persona** to `testAuthHelper.ts`:
```typescript
newRole: {
  username: 'new.role',
  password: 'password123',
  email: 'new.role@mes.com',
  roles: ['New Role'],
  permissions: ['permission1.read', 'permission2.write']
}
```

2. **Create test file** at `src/tests/e2e/roles/new-role.spec.ts`

3. **Follow existing patterns** for test structure

4. **Update documentation** in `ROLE_BASED_TEST_SCENARIOS.md`

### Updating Test Scenarios

When functionality changes:

1. Update test scenarios in `ROLE_BASED_TEST_SCENARIOS.md`
2. Update corresponding test file in `src/tests/e2e/roles/`
3. Verify tests still pass
4. Update any affected helper functions

---

## Best Practices

### DO ✅

- Run all P0 tests before deployment
- Use descriptive test IDs (e.g., `PROD-OP-AUTH-001`)
- Log validation steps with `console.log('✓ ...')`
- Test both positive and negative cases
- Verify permission boundaries for each role
- Use helper functions from `roleTestHelper.ts`
- Run tests in parallel for faster execution
- Review HTML reports after test runs

### DON'T ❌

- Skip authentication tests
- Hardcode test data in tests
- Ignore failing tests
- Run production tests on production database
- Modify test data during test execution
- Skip compliance-related tests
- Use actual user credentials in tests

---

## Metrics & KPIs

### Test Coverage Targets

| Metric | Target | Current |
|--------|--------|---------|
| Role Coverage | 100% | 19/19 (100%) |
| Critical Workflows | 100% | TBD |
| Permission Boundaries | 100% | TBD |
| Compliance Tests | 100% | TBD |
| Test Success Rate | >95% | TBD |

### Monitor These Metrics

- Test execution time
- Test failure rate
- Flaky test count
- Coverage by role
- Coverage by feature

---

## Support & Resources

### Documentation
- Test Scenarios: `docs/testing/ROLE_BASED_TEST_SCENARIOS.md`
- Implementation Summary: `docs/testing/ROLE_BASED_TESTING_IMPLEMENTATION_SUMMARY.md`
- This Guide: `docs/testing/ROLE_BASED_TESTING_EXECUTION_GUIDE.md`

### Helper Functions
- Authentication: `src/tests/helpers/testAuthHelper.ts`
- Test Utilities: `src/tests/helpers/roleTestHelper.ts`

### Test Files
- All Role Tests: `src/tests/e2e/roles/`

---

**Last Updated**: October 19, 2025
**Maintained By**: QA Team
**Contact**: qa@machshopmES.com
