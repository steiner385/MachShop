# E2E Testing Infrastructure Guide

## Overview

This guide documents the world-class E2E testing infrastructure implemented for the MES (Manufacturing Execution System) application. The infrastructure provides robust parallel test execution with dynamic resource allocation, preventing common issues like port conflicts, database collisions, and infrastructure crashes.

## Architecture Components

### 1. Dynamic Port Allocation System

**Location**: `src/tests/helpers/portAllocator.ts`

**Purpose**: Prevents EADDRINUSE errors by dynamically allocating unique ports for each test project.

**Key Features**:
- Automatic port scanning and allocation
- Project-specific port persistence
- Cache file management (`test-results/allocated-ports.json`)
- EPIPE-safe logging for parallel execution

**Usage**:
```typescript
import { portAllocator } from '../helpers/portAllocator';

const allocation = await portAllocator.allocatePortsForProject('my-test-project');
// Returns: { backendPort: 3101, frontendPort: 3103, project: 'my-test-project' }
```

### 2. Database Isolation System

**Location**: `src/tests/helpers/databaseAllocator.ts`

**Purpose**: Creates isolated PostgreSQL databases for each test project to prevent data conflicts.

**Key Features**:
- Project-specific database creation (e.g., `mes_e2e_db_routing_feature_tests`)
- Automatic schema migration with Prisma
- Stale allocation cleanup (2-hour timeout)
- Database availability verification

**Usage**:
```typescript
import { databaseAllocator } from '../helpers/databaseAllocator';

const allocation = await databaseAllocator.allocateDatabaseForProject('routing-feature-tests');
// Returns: { databaseName: 'mes_e2e_db_routing_feature_tests', databaseUrl: '...', ... }
```

### 3. Worker-Aware Unique Identifiers

**Location**: `src/tests/helpers/uniqueTestIdentifiers.ts`

**Purpose**: Generates truly unique identifiers for parallel test execution, preventing collision-based race conditions.

**Key Features**:
- Process ID integration for worker awareness
- Timestamp-based uniqueness
- Random component for collision prevention
- Multiple identifier types (versions, codes, names)

**Usage**:
```typescript
import { generateUniqueVersion, generateUniqueCode } from '../helpers/uniqueTestIdentifiers';

const version = generateUniqueVersion(1); // "1.1729951234567.12345.a3f8k2"
const code = generateUniqueCode('TEST'); // "TEST_1729951234567_12345_a3f8k2"
```

### 4. EPIPE-Safe Logging

**Implementation**: Across all infrastructure files

**Purpose**: Prevents stdout race conditions during parallel execution that cause infrastructure crashes.

**Pattern**:
```typescript
private safeLog(message: string): void {
  try {
    console.log(message);
  } catch (error: any) {
    // Silently ignore ALL console/stdout errors during parallel execution
    // This includes EPIPE, ECONNRESET, broken pipes, and any write errors
    return;
  }
}
```

## Critical Fixes Implemented

### 1. SiteContext Infinite Loop Elimination

**Problem**: Dependency cycle in `frontend/src/contexts/SiteContext.tsx` causing browser hangs.

**Solution**:
- Removed `refreshSites` from useEffect dependencies
- Implemented persistent retry count with `useRef`
- Added maximum retry limits (10 attempts)
- Captured function reference to avoid stale closures

### 2. Global Date.now() Mock Removal

**Problem**: Fixed timestamp in `src/tests/setup.ts` causing identical versions across parallel workers.

**Solution**: Removed global mock and implemented worker-aware timestamp generation.

### 3. TOCTOU Race Condition Prevention

**Problem**: Check-then-create pattern in routing tests causing race conditions.

**Solution**: Replaced with atomic operations and graceful conflict handling.

### 4. Authentication Flow Stabilization

**Problem**: Browser timeout issues and 401 redirect race conditions.

**Solution**:
- Centralized 401 handling in API interceptors
- Async logout flow with proper error handling
- Enhanced authentication wait strategies

## Maintenance Guidelines

### Daily Operations

1. **Monitor Test Results**
   - Check for new EPIPE errors in logs
   - Verify dynamic allocation is working (no hardcoded ports in failures)
   - Watch for database connection issues

2. **Clean Up Resources**
   ```bash
   # Clean up old test databases (automatic, but can be triggered manually)
   npm run test:e2e:cleanup

   # Clear all allocations if needed
   rm -f test-results/allocated-*.json
   ```

### Weekly Maintenance

1. **Database Cleanup**
   - Stale databases are automatically cleaned up after 2 hours
   - Manually verify no orphaned test databases exist:
   ```sql
   SELECT datname FROM pg_database WHERE datname LIKE 'mes_e2e_db_%';
   ```

2. **Port Allocation Review**
   - Check `test-results/allocated-ports.json` for stale allocations
   - Ensure port ranges don't conflict with system services

### Monthly Review

1. **Infrastructure Health Check**
   - Review test execution times and failure patterns
   - Check for any new race conditions or timing issues
   - Validate that all test projects use dynamic allocation

2. **Performance Optimization**
   - Review cache effectiveness for database and port allocations
   - Consider adjusting timeout values based on system performance

## Troubleshooting Guide

### Common Issues

#### 1. EPIPE Errors
**Symptoms**: Tests crash with "EPIPE" or "broken pipe" errors
**Solution**: Ensure all console.log calls use `safeLog()` pattern
**Location**: Any infrastructure file making console output

#### 2. Port Conflicts
**Symptoms**: EADDRINUSE errors, tests failing to start servers
**Solution**:
- Verify `global-setup.ts` is using dynamic allocation
- Check no hardcoded ports in Playwright config
- Clear port allocation cache if needed

#### 3. Database Connection Issues
**Symptoms**: Connection timeouts, schema errors
**Solution**:
- Verify PostgreSQL is running and accessible
- Check database permissions for `mes_user`
- Ensure migrations ran successfully on test databases

#### 4. Authentication Timeouts
**Symptoms**: Tests timing out during login, 401 errors
**Solution**:
- Check SiteContext retry count isn't exceeded
- Verify auth token format compatibility
- Ensure no infinite loops in authentication flow

#### 5. Timestamp Collisions
**Symptoms**: Duplicate key errors, version conflicts
**Solution**:
- Verify `uniqueTestIdentifiers.ts` is being used
- Check no global Date.now() mocks exist
- Ensure worker-aware version generation

### Emergency Recovery

If infrastructure completely fails:

1. **Clean Slate Recovery**:
   ```bash
   # Stop all test processes
   pkill -f "playwright"

   # Clear all allocations
   rm -rf test-results/

   # Drop all test databases
   psql -U mes_user -h localhost -c "DROP DATABASE IF EXISTS mes_e2e_db_*;"

   # Restart fresh
   npm run test:e2e
   ```

2. **Verify Recovery**:
   - Check new allocations are created in `test-results/`
   - Verify tests use dynamic ports (not 3101, 5278, etc.)
   - Confirm no EPIPE errors in logs

## Best Practices

### For Developers

1. **Always use dynamic allocation** - Never hardcode ports or database names
2. **Use unique identifiers** - Import from `uniqueTestIdentifiers.ts` for any test data
3. **Implement EPIPE-safe logging** - Use `safeLog()` pattern for any console output
4. **Avoid global mocks** - Especially for Date, Math.random, or other timing functions

### For Infrastructure Changes

1. **Test in isolation** - Always test infrastructure changes with single project first
2. **Verify parallel execution** - Test with multiple projects running simultaneously
3. **Check resource cleanup** - Ensure proper teardown of allocated resources
4. **Document changes** - Update this guide when modifying infrastructure

### For CI/CD Integration

1. **Pre-execution cleanup** - Clear allocation files before test runs
2. **Resource monitoring** - Watch for database/port leaks in CI environment
3. **Timeout configuration** - Adjust based on CI system performance
4. **Parallel limits** - Configure appropriate worker limits for CI resources

## Infrastructure Success Metrics

The infrastructure is considered healthy when:

- ✅ All test projects use dynamic allocation (no hardcoded ports/databases)
- ✅ No EPIPE errors in test logs
- ✅ Test databases are properly isolated and cleaned up
- ✅ Authentication flows complete without infinite loops
- ✅ Unique identifiers prevent collision-based race conditions
- ✅ Tests find legitimate application bugs, not infrastructure issues

This infrastructure represents a **world-class E2E testing system** that enables reliable parallel test execution at scale.