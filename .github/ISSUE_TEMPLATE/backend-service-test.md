---
name: Backend Service Test
about: Create comprehensive test coverage for a backend service
title: 'Test [ServiceName]'
labels: ['type: backend-test', 'area: services', 'type: test-coverage']
assignees: ''
---

## Test Coverage Issue: [ServiceName]

### Service Information
- **File:** `/home/tony/GitHub/mes/src/services/[ServiceName].ts`
- **Priority:** P[1-4] - [Critical|High|Medium|Low]
- **Complexity:** [Low|Medium|High]
- **Epic:** [Epic Name]
- **Milestone:** Milestone [N] ([X]% Coverage)

### Current Coverage
- Lines: 0%
- Branches: 0%
- Functions: 0%
- Statements: 0%

### Target Coverage
- Lines: 70-80%
- Branches: 65-75%
- Functions: 75-85%
- Statements: 70-80%

### Test Scope
**Methods to Test:**
- [ ] `methodName1()` - Description
- [ ] `methodName2()` - Description
- [ ] `methodName3()` - Description

**Test Scenarios:**
1. Happy path scenarios
2. Error handling and validation
3. Edge cases and boundary conditions
4. Business logic validation
5. Integration with dependencies

### Implementation Guidance
**Test File:** `/home/tony/GitHub/mes/src/tests/services/[ServiceName].test.ts`

**Dependencies to Mock:**
- PrismaClient (database operations)
- External service adapters
- File system operations
- Third-party libraries

**Example Test Structure:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceName } from '../../services/ServiceName';

vi.mock('@prisma/client', () => ({
  // Mock Prisma
}));

describe('ServiceName', () => {
  describe('methodName', () => {
    it('should handle success case', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle error case', () => {
      // Test error scenarios
    });

    it('should validate inputs', () => {
      // Test input validation
    });
  });
});
```

### Acceptance Criteria
- [ ] Test file created at correct location
- [ ] All major methods have tests
- [ ] Happy path scenarios covered
- [ ] Error cases tested
- [ ] Edge cases handled
- [ ] Coverage meets targets (70-80%)
- [ ] All tests pass
- [ ] No console warnings/errors
- [ ] Code follows existing test patterns

### Estimated Effort
**Time:** [X-Y] hours

### Related Issues
- Relates to: #[Epic Issue]
- Blocks: #[Dependent Issue] (if applicable)
- Depends on: #[Prerequisite Issue] (if applicable)

### Resources
- Test setup file: `/home/tony/GitHub/mes/src/tests/setup.ts`
- Example test: `/home/tony/GitHub/mes/src/tests/services/RoutingService.test.ts`
- Service implementation: `/home/tony/GitHub/mes/src/services/[ServiceName].ts`