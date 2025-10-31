# Testing Patterns and Best Practices

## Overview

This document outlines the testing patterns and best practices established during the implementation of comprehensive test suites for business-critical backend services as part of GitHub Issue #176 - Epic 2: Backend Service Testing - Phase 2.

## Testing Framework Architecture

### Framework Selection
- **Primary Framework**: Vitest (v1.6.1)
- **Database Testing**: Prisma with mocked clients
- **TypeScript Support**: Full TypeScript integration with type safety
- **Coverage Tool**: v8 coverage engine

### Directory Structure
```
src/
├── __tests__/
│   └── services/
│       ├── SerializationService.test.ts
│       ├── NotificationService.test.ts
│       ├── InspectionPlanService.test.ts
│       ├── GlobalSearchService.test.ts
│       ├── ReviewService.test.ts
│       ├── TraceabilityService.test.ts
│       ├── SPCService.test.ts
│       ├── EquipmentService.test.ts
│       └── ProcessDataCollectionService.test.ts
```

## Test Structure Patterns

### 1. Test File Organization

Each service test file follows a consistent structure:

```typescript
// Standard imports and setup
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceName } from '../services/ServiceName';

// Mock setup
const mockPrisma = {
  // Comprehensive mocking of all Prisma methods used
};

// Service instantiation
const service = new ServiceName(mockPrisma as any);

// Test organization
describe('ServiceName', () => {
  describe('Service Initialization', () => {
    // Initialization tests
  });

  describe('Core Operations', () => {
    // Primary functionality tests
  });

  describe('Error Handling and Edge Cases', () => {
    // Exception and boundary condition tests
  });

  describe('Integration Scenarios', () => {
    // Real-world usage scenarios
  });

  describe('Manufacturing Scenarios', () => {
    // Domain-specific manufacturing tests
  });

  describe('Performance and Optimization', () => {
    // Performance-related tests
  });
});
```

### 2. Test Coverage Targeting

**Coverage Goals:**
- **75%+ line coverage** for each service
- **Comprehensive method coverage** for all public methods
- **Branch coverage** for complex conditional logic
- **Error path coverage** for exception handling

**Milestone-Based Coverage:**
- **Milestone 2 (20% coverage)**: SerializationService, NotificationService
- **Milestone 3 (30% coverage)**: InspectionPlanService, GlobalSearchService, ReviewService
- **Milestone 4 (40% coverage)**: TraceabilityService, SPCService, EquipmentService, ProcessDataCollectionService

### 3. Mock Strategy Patterns

#### Prisma Mocking Pattern
```typescript
const mockPrisma = {
  // Primary entity operations
  entityName: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  },

  // Transaction support
  $transaction: vi.fn(),

  // Event handling
  $on: vi.fn(),
  $disconnect: vi.fn(),
};
```

#### Service Dependency Mocking
```typescript
// External service mocking for integration tests
vi.mock('../services/ExternalService', () => ({
  default: vi.fn().mockImplementation(() => ({
    method: vi.fn(),
  })),
}));
```

### 4. Test Data Patterns

#### Mock Data Factory Pattern
```typescript
// Centralized mock data creation
const createMockEntity = (overrides = {}): EntityType => ({
  id: 'test-id',
  // Standard fields with sensible defaults
  createdAt: new Date(),
  updatedAt: new Date(),
  // Domain-specific fields
  ...overrides,
});
```

#### Manufacturing Domain Test Data
```typescript
// Aerospace and manufacturing-specific test scenarios
const createAerospaceTestData = () => ({
  partNumber: 'AE-123456-001',
  revision: 'A',
  workOrderNumber: 'WO-AE-2024-001',
  inspectionPlan: 'AS9102-REQUIRED',
  // Manufacturing-specific data patterns
});
```

## Best Practices Established

### 1. Test Organization Best Practices

**Descriptive Test Names:**
- Use clear, behavior-driven test descriptions
- Follow "should [expected behavior] when [condition]" pattern
- Include domain context (e.g., "aerospace SOP review workflow")

**Logical Grouping:**
- Group related tests in describe blocks
- Separate initialization, core operations, and edge cases
- Include manufacturing-specific scenario groups

**Setup and Teardown:**
- Use `beforeEach` for consistent test state setup
- Use `afterEach` for cleanup and mock resets
- Avoid test interdependencies

### 2. Assertion Patterns

**Comprehensive Assertions:**
```typescript
// Verify both return value and side effects
expect(result).toEqual(expectedResult);
expect(mockPrisma.entity.create).toHaveBeenCalledWith({
  data: expect.objectContaining({
    field: expectedValue,
  }),
});
```

**Error Testing Pattern:**
```typescript
// Consistent error testing approach
await expect(service.method(invalidInput))
  .rejects
  .toThrow('Specific error message');
```

**Manufacturing Domain Assertions:**
```typescript
// Domain-specific validation patterns
expect(result.serialNumber).toMatch(/^[A-Z]{2}-\d{6}-\d{3}$/);
expect(result.status).toBe(WorkOrderStatus.IN_PROGRESS);
expect(result.qualityCheckpoints).toHaveLength(expectedCount);
```

### 3. Async Testing Patterns

**Promise Handling:**
```typescript
// Proper async/await usage in tests
it('should handle async operations', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

**Error Handling in Async Tests:**
```typescript
// Proper async error testing
it('should handle async errors', async () => {
  mockPrisma.entity.create.mockRejectedValue(new Error('Database error'));
  await expect(service.createEntity()).rejects.toThrow('Database error');
});
```

### 4. Performance Testing Patterns

**Execution Time Measurement:**
```typescript
it('should complete operations within acceptable time', async () => {
  const startTime = Date.now();
  await service.bulkOperation(largeDataset);
  const executionTime = Date.now() - startTime;
  expect(executionTime).toBeLessThan(1000); // 1 second max
});
```

**Memory Usage Considerations:**
```typescript
it('should handle large datasets efficiently', async () => {
  const largeDataset = Array(10000).fill(null).map(() => createMockData());
  const result = await service.processLargeDataset(largeDataset);
  expect(result).toBeDefined();
  // Memory cleanup verification
});
```

## Manufacturing-Specific Testing Patterns

### 1. Quality Management Testing

**Inspection Plan Testing:**
```typescript
describe('AS9102 Compliance', () => {
  it('should enforce First Article Inspection requirements', async () => {
    const inspectionPlan = await service.createInspectionPlan({
      standard: InspectionStandard.AS9102,
      characteristics: createAS9102Characteristics(),
    });

    expect(inspectionPlan.isFirstArticleRequired).toBe(true);
    expect(inspectionPlan.characteristics).toContainAS9102Requirements();
  });
});
```

### 2. Traceability Testing

**Genealogy Testing:**
```typescript
describe('Manufacturing Traceability', () => {
  it('should maintain complete forward and backward traceability', async () => {
    const forwardTrace = await service.getForwardTraceability(serialNumber);
    const backwardTrace = await service.getBackwardTraceability(serialNumber);

    expect(forwardTrace.completenessScore).toBeGreaterThan(95);
    expect(backwardTrace.hasCompleteLineage).toBe(true);
  });
});
```

### 3. SPC and Process Control Testing

**Statistical Process Control:**
```typescript
describe('SPC Calculations', () => {
  it('should calculate control limits using Western Electric rules', async () => {
    const controlLimits = await service.calculateControlLimits(processData);

    expect(controlLimits.upperControlLimit).toBeGreaterThan(controlLimits.centerLine);
    expect(controlLimits.lowerControlLimit).toBeLessThan(controlLimits.centerLine);
    expect(controlLimits.westernElectricViolations).toHaveLength(0);
  });
});
```

## Error Handling and Edge Case Patterns

### 1. Database Error Simulation

```typescript
describe('Database Error Handling', () => {
  it('should handle database connection issues gracefully', async () => {
    mockPrisma.entity.create.mockRejectedValue(
      new Error('Connection timeout')
    );

    await expect(service.createEntity(validData))
      .rejects
      .toThrow('Database operation failed');
  });
});
```

### 2. Boundary Condition Testing

```typescript
describe('Edge Cases', () => {
  it('should handle null and undefined inputs gracefully', async () => {
    await expect(service.method(null)).rejects.toThrow('Invalid input');
    await expect(service.method(undefined)).rejects.toThrow('Invalid input');
  });

  it('should handle extremely large datasets', async () => {
    const largeDataset = Array(100000).fill(null).map(createMockData);
    const result = await service.processDataset(largeDataset);
    expect(result.processedCount).toBe(100000);
  });
});
```

## Integration Testing Patterns

### 1. Cross-Service Integration

```typescript
describe('Integration Scenarios', () => {
  it('should integrate with workflow approval system', async () => {
    // Test complete workflow from review to approval
    const reviewAssignment = await service.assignReview(documentData);
    const workflowResult = await service.submitDocumentForApproval(
      reviewAssignment.documentId
    );

    expect(workflowResult.status).toBe('PENDING_APPROVAL');
    expect(mockUnifiedApprovalIntegration.submitDocument)
      .toHaveBeenCalledWith(expect.objectContaining({
        documentId: reviewAssignment.documentId,
      }));
  });
});
```

### 2. Real-World Scenario Testing

```typescript
describe('Manufacturing Scenarios', () => {
  it('should handle complete production cycle', async () => {
    // Simulate full production workflow
    const schedule = await scheduleService.createSchedule(scheduleData);
    const workOrder = await scheduleService.dispatchScheduleEntry(schedule.entries[0].id);
    const execution = await executionService.transitionWorkOrderStatus(
      workOrder.id,
      WorkOrderStatus.IN_PROGRESS
    );

    expect(execution.status).toBe(WorkOrderStatus.IN_PROGRESS);
    expect(execution.startedAt).toBeDefined();
  });
});
```

## Coverage and Quality Metrics

### 1. Coverage Measurement

**Coverage Command:**
```bash
npm run test:coverage
```

**Coverage Thresholds:**
- Line Coverage: 75%+
- Branch Coverage: 70%+
- Function Coverage: 80%+

### 2. Quality Metrics

**Test Quality Indicators:**
- Test-to-code ratio: 1:1 minimum
- Average test execution time: <100ms per test
- Test reliability: 0% flaky tests
- Error path coverage: 90%+ of error conditions tested

## CI/CD Integration

### 1. Automated Testing Pipeline

**GitHub Actions Integration:**
```yaml
# .github/workflows/ci-build-test.yml
- name: Run unit tests
  run: npm run test
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/test_db

- name: Upload test coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
    flags: unittests
```

### 2. Test Environment Setup

**Database Setup for Tests:**
```bash
# CI environment setup
npx prisma migrate deploy
npm run test:coverage
npm run test:e2e
```

## Maintenance and Evolution

### 1. Test Maintenance Guidelines

**Regular Maintenance Tasks:**
- Review and update mock data to reflect schema changes
- Maintain test coverage as new features are added
- Refactor tests to reduce duplication and improve clarity
- Update manufacturing scenario tests based on new requirements

### 2. Test Evolution Patterns

**Adding New Service Tests:**
1. Follow established directory structure
2. Use consistent test organization patterns
3. Implement comprehensive mock strategies
4. Include manufacturing-specific scenarios
5. Maintain coverage thresholds

**Updating Existing Tests:**
1. Preserve existing test coverage
2. Update mocks to reflect service changes
3. Add tests for new functionality
4. Maintain backward compatibility in test data

## Conclusion

The testing patterns and best practices established in this implementation provide a solid foundation for maintaining high-quality, comprehensive test coverage across all business-critical backend services. These patterns ensure consistency, maintainability, and thorough validation of manufacturing execution system functionality while supporting continuous integration and deployment workflows.

The implementation successfully achieved the milestone coverage targets (20-40%) and established a robust testing infrastructure that can be extended to additional services and features as the system evolves.

---

*Document created as part of GitHub Issue #176 - Epic 2: Backend Service Testing - Phase 2*
*Last updated: October 31, 2025*