# Test Organization Standards

This document establishes the official standards for organizing test files in the MES codebase. These conventions ensure consistency, maintainability, and developer productivity across the project.

## Overview

Our test organization follows a **hybrid approach** optimized for different types of code:

- **Backend Services**: Centralized in `src/tests/` directory (mirrors production structure)
- **Frontend Components**: Co-located with source code (modern React best practice)
- **Integration Tests**: Dedicated directories for cross-system testing
- **E2E Tests**: Separate Playwright test structure

## File Naming Conventions

### Standard Naming Pattern

- **Unit/Integration Tests**: `*.test.{ts,tsx}`
- **E2E Tests**: `*.spec.{ts}` (Playwright only)

### Examples

```
✓ Good
UserService.test.ts
LoginComponent.test.tsx
userManagement.spec.ts (E2E)

❌ Avoid
UserService.spec.ts (should be .test.ts for unit tests)
UserServiceTest.ts (missing .test extension)
user-service.test.ts (prefer PascalCase to match source files)
```

## Location Conventions

### Backend Tests

**Location**: `src/tests/` directory with subdirectories matching source structure

```
src/
├── services/
│   ├── UserService.ts
│   └── AuthService.ts
└── tests/
    ├── services/
    │   ├── UserService.test.ts
    │   └── AuthService.test.ts
    ├── routes/
    │   └── userRoutes.test.ts
    ├── middleware/
    │   └── authMiddleware.test.ts
    └── integration/
        └── userWorkflow.test.ts
```

**Rationale**:
- Clear separation between production and test code
- Easy to find all tests in one location
- Supports complex mocking strategies
- Maintains clean production builds

### Frontend Tests

**Location**: Co-located with source code using `__tests__` directories

```
frontend/src/
├── components/
│   ├── UserProfile/
│   │   ├── UserProfile.tsx
│   │   ├── UserProfileForm.tsx
│   │   └── __tests__/
│   │       ├── UserProfile.test.tsx
│   │       └── UserProfileForm.test.tsx
│   └── Dashboard/
│       ├── Dashboard.tsx
│       └── __tests__/
│           └── Dashboard.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── __tests__/
│       └── useAuth.test.ts
└── store/
    ├── authStore.ts
    └── __tests__/
        └── authStore.test.tsx
```

**Rationale**:
- Tests are immediately visible next to source code
- IDE autocomplete includes test files
- Easier maintenance (no need to navigate to separate directory)
- Standard practice in modern React/TypeScript projects
- Encourages writing tests (lower friction)

### Integration Tests

**Location**: Dedicated integration directories

```
# Backend Integration Tests
src/tests/integration/
├── userAuthenticationFlow.test.ts
├── orderProcessingWorkflow.test.ts
└── equipmentDataSync.test.ts

# Frontend Integration Tests
frontend/src/tests/integration/
├── workInstructionFlow.test.tsx
├── dashboardInteractions.test.tsx
└── multiComponentWorkflows.test.tsx
```

**Rationale**:
- Integration tests span multiple modules
- Separate from unit tests for different execution contexts
- Clear distinction from unit tests

### End-to-End Tests

**Location**: `src/tests/e2e/` (Playwright managed)

```
src/tests/e2e/
├── user-authentication.spec.ts
├── work-order-creation.spec.ts
└── quality-approval-workflow.spec.ts
```

**Rationale**:
- Playwright manages its own test structure
- E2E tests require different tooling and configuration
- Clear separation from unit/integration tests

## Directory Structure Examples

### Complete Frontend Component Structure

```
frontend/src/components/WorkOrders/
├── WorkOrderList/
│   ├── WorkOrderList.tsx
│   ├── WorkOrderItem.tsx
│   ├── WorkOrderFilters.tsx
│   └── __tests__/
│       ├── WorkOrderList.test.tsx
│       ├── WorkOrderItem.test.tsx
│       └── WorkOrderFilters.test.tsx
├── WorkOrderCreate/
│   ├── WorkOrderCreate.tsx
│   ├── WorkOrderForm.tsx
│   └── __tests__/
│       ├── WorkOrderCreate.test.tsx
│       └── WorkOrderForm.test.tsx
└── index.ts
```

### Complete Backend Service Structure

```
src/
├── services/
│   ├── WorkOrderService.ts
│   ├── EquipmentService.ts
│   └── NotificationService.ts
└── tests/
    ├── services/
    │   ├── WorkOrderService.test.ts
    │   ├── EquipmentService.test.ts
    │   └── NotificationService.test.ts
    ├── integration/
    │   └── workOrderEquipmentFlow.test.ts
    └── utils/
        └── testHelpers.ts
```

## Guidelines for New Tests

### When Creating New Tests

1. **Determine Test Type**:
   - Unit test for single function/component? → Follow location conventions above
   - Integration test spanning multiple modules? → Use integration directory
   - E2E test for full user workflow? → Use Playwright structure

2. **Choose Correct Location**:
   - Frontend component/hook/store? → Co-locate with `__tests__/` directory
   - Backend service/route/utility? → Use `src/tests/` with matching subdirectory
   - Cross-system integration? → Use appropriate integration directory

3. **Follow Naming Convention**:
   - Use `*.test.{ts,tsx}` for unit/integration tests
   - Use `*.spec.ts` only for E2E tests
   - Match source file name: `UserService.ts` → `UserService.test.ts`

### Creating Test Directories

**Frontend**: Create `__tests__` directory at the same level as source files:

```bash
# For a new component
mkdir frontend/src/components/NewComponent/__tests__
touch frontend/src/components/NewComponent/__tests__/NewComponent.test.tsx
```

**Backend**: Use existing `src/tests/` structure:

```bash
# For a new service
touch src/tests/services/NewService.test.ts

# For a new route
touch src/tests/routes/newRoute.test.ts
```

## Configuration Support

### Vitest Configuration

Our `vitest.config.ts` already supports both patterns:

```typescript
// Supports co-located frontend tests
environmentMatchGlobs: [
  ['frontend/**/*.test.{ts,tsx}', 'jsdom'],
],

// Includes both centralized and co-located tests
include: [
  'src/**/*.test.{ts,tsx}',           // Backend centralized
  'frontend/src/**/*.test.{ts,tsx}',  // Frontend co-located
],

// Excludes test directories from coverage
exclude: [
  'src/tests/',                       // Backend test directory
  'frontend/src/**/__tests__/',       // Frontend test directories
  // ...
]
```

### IDE Configuration

Most modern IDEs automatically recognize both patterns:

- **VSCode**: Test Explorer extension works with both structures
- **WebStorm**: Recognizes `__tests__` directories and `src/tests/` structure
- **Vim/Neovim**: File navigation plugins support both patterns

## Migration Guidelines

### When to Migrate Existing Tests

**Immediate Migration Required**:
- Frontend tests currently in `frontend/src/tests/components/` → Move to co-location
- Tests that don't follow naming conventions → Update to `*.test.{ts,tsx}`

**No Migration Needed**:
- Backend tests in `src/tests/` → Keep current structure (already optimal)
- Integration tests in dedicated directories → Keep current structure
- E2E tests → Keep Playwright structure

### Migration Process

See `FRONTEND_TEST_MIGRATION_GUIDE.md` for detailed step-by-step instructions.

## Benefits of This Organization

### For Developers

1. **Predictable**: Clear rules for where to put tests and where to find them
2. **IDE-Friendly**: Autocomplete and navigation work optimally with both patterns
3. **Low Friction**: Easy to create tests next to source code (frontend) or in organized structure (backend)

### For the Codebase

1. **Maintainable**: Tests are easy to find and update when source code changes
2. **Scalable**: Structure works for small and large codebases
3. **Standard**: Follows industry best practices for each technology stack

### For CI/CD

1. **Performant**: Vitest efficiently discovers tests in both structures
2. **Reliable**: Clear separation between test types allows different execution strategies
3. **Flexible**: Can run unit tests, integration tests, and E2E tests independently

## Examples from Existing Codebase

### Well-Organized Examples ✓

**Frontend Co-location**:
```
frontend/src/components/Navigation/__tests__/Breadcrumbs.test.tsx
frontend/src/hooks/__tests__/usePresence.test.ts
frontend/src/store/__tests__/AuthStore.test.tsx
```

**Backend Centralized**:
```
src/tests/services/AuthenticationManager.test.ts
src/tests/services/CollaborationService.test.ts
src/tests/integration/userAuthentication.test.ts
```

### Patterns to Avoid ❌

```
# Don't mix patterns within the same module type
frontend/src/tests/components/SomeComponent.test.tsx  # Should be co-located
src/services/SomeService.test.ts                     # Should be in src/tests/

# Don't use inconsistent naming
UserService.spec.ts                                  # Should be .test.ts
user_service_test.ts                                 # Should be UserService.test.ts
```

## Conclusion

This hybrid approach leverages the strengths of both organizational patterns:

- **Backend**: Centralized structure supports complex service testing and mocking
- **Frontend**: Co-located structure supports rapid component development and maintenance

Following these standards ensures consistency, improves developer experience, and maintains high code quality across the entire MES application.

---

*For implementation guidance, see `FRONTEND_TEST_MIGRATION_GUIDE.md`*
*For general testing practices, see `testing-guide.md`*