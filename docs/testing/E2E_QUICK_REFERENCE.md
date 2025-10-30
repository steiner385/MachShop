# E2E Testing Quick Reference

## For Developers - Essential Patterns

### ✅ DO: Use Dynamic Allocation
```typescript
// ✅ Correct - Use dynamic allocation
import { portAllocator, databaseAllocator } from '../helpers';

const ports = await portAllocator.allocatePortsForProject(projectName);
const db = await databaseAllocator.allocateDatabaseForProject(projectName);
```

```typescript
// ❌ Wrong - Never hardcode
const backendPort = 3101;  // Will cause EADDRINUSE errors
const dbName = 'test_db';  // Will cause data conflicts
```

### ✅ DO: Use Unique Identifiers
```typescript
// ✅ Correct - Worker-aware unique identifiers
import { generateUniqueVersion, generateUniqueCode } from '../helpers/uniqueTestIdentifiers';

const version = generateUniqueVersion(1);  // "1.1729951234567.12345.a3f8k2"
const code = generateUniqueCode('ROUTE'); // "ROUTE_1729951234567_12345_a3f8k2"
```

```typescript
// ❌ Wrong - Fixed values cause collisions
const version = '1.0.0';           // Will conflict in parallel
const timestamp = Date.now();      // Was causing identical timestamps
```

### ✅ DO: EPIPE-Safe Logging
```typescript
// ✅ Correct - Safe for parallel execution
private safeLog(message: string): void {
  try {
    console.log(message);
  } catch (error: any) {
    // Silently ignore stdout errors during parallel execution
    return;
  }
}
```

```typescript
// ❌ Wrong - Can crash parallel tests
console.log('Direct logging');  // May cause EPIPE errors
```

### ✅ DO: Atomic Operations
```typescript
// ✅ Correct - Atomic create with conflict handling
try {
  await page.getByRole('button', { name: 'Create Routing' }).click();
  await page.getByText('Routing created successfully').waitFor();
} catch (error) {
  // Handle gracefully if already exists
  if (error.message.includes('already exists')) {
    console.log('Routing already exists, continuing...');
  } else {
    throw error;
  }
}
```

```typescript
// ❌ Wrong - Check-then-create race condition
const exists = await page.getByText('My Routing').isVisible();
if (!exists) {
  // TOCTOU: Another worker might create it here
  await page.getByRole('button', { name: 'Create' }).click();
}
```

## Common File Locations

| Component | File Path |
|-----------|-----------|
| Port Allocation | `src/tests/helpers/portAllocator.ts` |
| Database Allocation | `src/tests/helpers/databaseAllocator.ts` |
| Unique Identifiers | `src/tests/helpers/uniqueTestIdentifiers.ts` |
| Global Setup | `src/tests/e2e/global-setup.ts` |
| Project Configs | `playwright.config.ts` |
| Test Results | `test-results/` |

## Emergency Commands

```bash
# Stop all tests
pkill -f "playwright"

# Clear all allocations
rm -rf test-results/

# Drop test databases
psql -U mes_user -h localhost -c "SELECT 'DROP DATABASE IF EXISTS ' || datname || ';' FROM pg_database WHERE datname LIKE 'mes_e2e_db_%';"

# Fresh start
npm run test:e2e
```

## Health Check Commands

```bash
# Check allocated ports
cat test-results/allocated-ports.json

# Check allocated databases
cat test-results/allocated-databases.json

# List test databases
psql -U mes_user -h localhost -c "SELECT datname FROM pg_database WHERE datname LIKE 'mes_e2e_db_%';"

# Check for EPIPE errors
grep -r "EPIPE" test-results/ || echo "No EPIPE errors found ✅"
```

## Infrastructure Status Indicators

### ✅ Healthy Infrastructure
- No hardcoded ports in test failures
- No EPIPE errors in logs
- Unique identifiers prevent collisions
- Database isolation working
- Tests find app bugs, not infrastructure issues

### ⚠️ Warning Signs
- EADDRINUSE errors (port conflicts)
- EPIPE/broken pipe errors
- Identical timestamp collisions
- Database connection failures
- Infinite retry loops

### 🚨 Critical Issues
- Tests consistently crashing on startup
- All tests failing with infrastructure errors
- Resource leaks (ports/databases not cleaned up)
- Authentication infinite loops

## Performance Targets

| Metric | Target | Command |
|--------|--------|---------|
| Test Startup | < 30s | Monitor global-setup.ts logs |
| Database Creation | < 10s | Check databaseAllocator logs |
| Port Allocation | < 5s | Check portAllocator logs |
| Authentication | < 15s | Check auth flow in tests |

## Integration Checklist

### Before Committing New Tests
- [ ] Uses `generateUniqueVersion()` for test data
- [ ] No hardcoded ports or database names
- [ ] EPIPE-safe logging if adding console output
- [ ] Atomic operations instead of check-then-create
- [ ] Proper resource cleanup in test teardown

### Before Infrastructure Changes
- [ ] Test with single project first
- [ ] Verify parallel execution works
- [ ] Check resource cleanup
- [ ] Update documentation
- [ ] Add appropriate error handling

### For Production Deployment
- [ ] CI/CD clears allocation files before runs
- [ ] Resource monitoring in place
- [ ] Timeout values appropriate for CI environment
- [ ] Worker limits configured for available resources