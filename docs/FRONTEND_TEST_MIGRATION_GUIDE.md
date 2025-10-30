# Frontend Test Migration Guide

This guide provides step-by-step instructions for migrating existing frontend tests from separate directories to the co-location pattern as defined in our [Test Organization Standards](./TEST_ORGANIZATION_STANDARDS.md).

## Overview

We are migrating from a mixed test organization pattern to a consistent co-location approach for frontend tests:

- **From**: `frontend/src/tests/components/` and `frontend/src/tests/pages/`
- **To**: `frontend/src/components/[Group]/__tests__/` and `frontend/src/pages/[Group]/__tests__/`

## Current Migration Targets

Based on the analysis of our codebase, the following tests need to be migrated:

### 1. Component Tests
```
BEFORE: frontend/src/tests/components/LoginPage.test.tsx
AFTER:  frontend/src/pages/Auth/__tests__/LoginPage.test.tsx
```

### 2. Admin Page Tests
```
BEFORE: frontend/src/tests/pages/Admin/RBACAdminPages.test.tsx
AFTER:  frontend/src/pages/Admin/__tests__/RBACAdminPages.test.tsx
```

### 3. Integration Tests (Keep in Place)
```
KEEP: frontend/src/tests/integration/workInstructions.test.tsx
```
*Integration tests should remain in the dedicated integration directory.*

## Migration Process

### Step 1: Analyze the Test File

Before moving any test, examine its content to understand:

1. **What component/page it tests**
2. **Import paths used**
3. **Test dependencies**
4. **Whether it's truly a unit test or integration test**

### Step 2: Identify Target Location

For each test file, determine the correct new location:

**For Component Tests**:
- Find the source component in `frontend/src/components/`
- Place test in `[ComponentGroup]/__tests__/` directory

**For Page Tests**:
- Find the source page in `frontend/src/pages/`
- Place test in `[PageGroup]/__tests__/` directory

**For Integration Tests**:
- Keep in `frontend/src/tests/integration/` (no migration needed)

### Step 3: Create Target Directory

```bash
# Example: For LoginPage component
mkdir -p frontend/src/pages/Auth/__tests__

# Example: For Admin pages
mkdir -p frontend/src/pages/Admin/__tests__
```

### Step 4: Move the Test File

```bash
# Move LoginPage test
git mv frontend/src/tests/components/LoginPage.test.tsx \
       frontend/src/pages/Auth/__tests__/LoginPage.test.tsx

# Move Admin pages test
git mv frontend/src/tests/pages/Admin/RBACAdminPages.test.tsx \
       frontend/src/pages/Admin/__tests__/RBACAdminPages.test.tsx
```

*Using `git mv` preserves file history in version control.*

### Step 5: Update Import Paths

After moving the test file, update any import paths that may have changed:

#### Common Import Path Updates

**Relative Path Changes**:
```typescript
// BEFORE (in frontend/src/tests/components/)
import LoginPage from '../../pages/Auth/LoginPage';

// AFTER (in frontend/src/pages/Auth/__tests__/)
import LoginPage from '../LoginPage';
```

**Test Utilities**:
```typescript
// BEFORE
import { renderWithProviders } from '../../../test-utils/test-utils';

// AFTER
import { renderWithProviders } from '../../../test-utils/test-utils';
```

*Note: Test utilities path may need adjustment based on new relative location.*

### Step 6: Update Test Configuration (If Needed)

Our `vitest.config.ts` already supports both patterns, so no configuration changes should be needed. However, verify that:

1. **Include Pattern**: Tests are discovered by the glob pattern
2. **Environment**: Tests run in the correct environment (jsdom for frontend)
3. **Coverage**: Test directories are excluded from coverage reports

### Step 7: Run Tests to Verify

After migration, run the tests to ensure they still work:

```bash
# Run specific migrated test
npm test -- LoginPage.test.tsx

# Run all frontend tests
npm test -- frontend/

# Run full test suite
npm test
```

### Step 8: Clean Up Empty Directories

After successful migration, remove empty directories:

```bash
# Remove empty directories (only if completely empty)
rmdir frontend/src/tests/components/  # if empty
rmdir frontend/src/tests/pages/Admin/ # if empty
```

*Be careful not to remove directories that still contain integration tests or other files.*

## Detailed Migration Examples

### Example 1: LoginPage Component Test

**Current Location**: `frontend/src/tests/components/LoginPage.test.tsx`

**Analysis**:
```typescript
// Typical structure
import LoginPage from '../../pages/Auth/LoginPage';
import { render, screen } from '@testing-library/react';
```

**Target Location**: `frontend/src/pages/Auth/__tests__/LoginPage.test.tsx`

**Migration Steps**:
```bash
# 1. Create target directory
mkdir -p frontend/src/pages/Auth/__tests__

# 2. Move file
git mv frontend/src/tests/components/LoginPage.test.tsx \
       frontend/src/pages/Auth/__tests__/LoginPage.test.tsx

# 3. Update imports (if needed)
# Change: import LoginPage from '../../pages/Auth/LoginPage';
# To:     import LoginPage from '../LoginPage';
```

### Example 2: Admin Pages Test

**Current Location**: `frontend/src/tests/pages/Admin/RBACAdminPages.test.tsx`

**Target Location**: `frontend/src/pages/Admin/__tests__/RBACAdminPages.test.tsx`

**Migration Steps**:
```bash
# 1. Create target directory
mkdir -p frontend/src/pages/Admin/__tests__

# 2. Move file
git mv frontend/src/tests/pages/Admin/RBACAdminPages.test.tsx \
       frontend/src/pages/Admin/__tests__/RBACAdminPages.test.tsx

# 3. Update any relative imports if necessary
```

## Common Issues and Solutions

### Issue 1: Import Path Errors

**Problem**: Tests fail with import errors after migration

**Solution**:
1. Check relative paths to source files
2. Verify test utility imports
3. Update any absolute paths that may have changed

```typescript
// Example fix
// BEFORE: import Component from '../../components/Component';
// AFTER:  import Component from '../Component';
```

### Issue 2: Test Discovery Issues

**Problem**: Tests not discovered by Vitest after migration

**Solution**:
1. Verify file naming follows `*.test.tsx` pattern
2. Check that location matches include patterns in `vitest.config.ts`
3. Ensure `__tests__` directory name is correct

### Issue 3: Coverage Reporting Issues

**Problem**: Test files appear in coverage reports

**Solution**:
1. Verify `__tests__` directories are excluded in coverage config
2. Check that moved tests don't conflict with existing exclusions

## Verification Checklist

After migrating each test file:

- [ ] Test file moved to correct location using `git mv`
- [ ] Target directory follows `__tests__` naming convention
- [ ] Import paths updated and working
- [ ] Test runs successfully: `npm test -- [TestFileName]`
- [ ] Test appears in test discovery: `npm test -- --reporter=verbose`
- [ ] No broken imports or missing dependencies
- [ ] Git history preserved (using `git mv`)

## Benefits After Migration

### Developer Experience
- **Faster Navigation**: Tests are immediately visible next to source code
- **IDE Support**: Better autocomplete and navigation between test and source
- **Lower Friction**: Easier to create new tests (next to source)

### Maintenance
- **Easier Updates**: When components change, tests are in the same directory
- **Clear Relationships**: Obvious which tests belong to which components
- **Reduced Cognitive Load**: No need to navigate to separate directories

### Code Organization
- **Consistent Structure**: All frontend tests follow the same pattern
- **Industry Standard**: Matches React/TypeScript best practices
- **Scalable**: Structure works for small and large component hierarchies

## Integration with CI/CD

The migration should not affect CI/CD processes because:

1. **Vitest Configuration**: Already supports both patterns
2. **Test Discovery**: Automatic discovery works with new locations
3. **Coverage Reporting**: Exclusion patterns handle `__tests__` directories
4. **Build Process**: Test files excluded from production builds

## Best Practices Going Forward

### For New Tests
- Always co-locate new frontend tests with source code
- Use `__tests__` directory naming convention
- Follow `ComponentName.test.tsx` naming pattern

### For Existing Tests
- Migrate remaining tests as they are modified
- Prioritize frequently-changed components
- Consider migration during major refactoring

### For Team Workflow
- Update documentation and onboarding materials
- Include test location in code review checklist
- Ensure new team members understand the co-location approach

## Rollback Process

If issues arise during migration:

```bash
# Rollback a single file
git mv frontend/src/pages/Auth/__tests__/LoginPage.test.tsx \
       frontend/src/tests/components/LoginPage.test.tsx

# Revert import changes
git checkout HEAD -- [filename]

# Remove empty directories created during migration
rmdir frontend/src/pages/Auth/__tests__/
```

## Conclusion

This migration improves code organization by:

1. **Standardizing** frontend test locations
2. **Improving** developer experience and maintenance
3. **Aligning** with modern React development practices
4. **Maintaining** all existing test functionality

The migration is low-risk because:
- No test logic changes
- Configuration already supports both patterns
- Easy rollback if issues arise
- Git history preserved with `git mv`

Follow this guide step-by-step to ensure a smooth transition to the co-location pattern for all frontend tests.

---

*For complete test organization standards, see `TEST_ORGANIZATION_STANDARDS.md`*
*For general testing practices, see `testing-guide.md`*