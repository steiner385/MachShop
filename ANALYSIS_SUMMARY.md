# FormulaEngine.ts Error Analysis - Executive Summary

## Documents Generated

This analysis includes three comprehensive documents:

1. **FORMULA_ENGINE_ANALYSIS.md** (14KB)
   - Complete error identification and root cause analysis
   - Detailed explanation of Prisma error codes
   - Current code issues with line numbers
   - Recommended error handling patterns

2. **FORMULA_ENGINE_IMPLEMENTATION_GUIDE.md** (19KB)
   - Before/after code comparisons for each method
   - Complete implementation examples for robust error handling
   - Enhanced route error handling with proper HTTP status codes
   - Better test cleanup patterns

3. **FORMULA_ENGINE_QUICK_FIX.md** (5.8KB)
   - Quick reference for immediate fixes
   - Exact locations and code snippets to add/modify
   - Validation checklist
   - Files to modify list

---

## Critical Findings

### Issue 1: Unique Constraint Violation During Creation
**Location:** src/services/FormulaEngine.ts, lines 71-117
**Error:** "Unique constraint failed on the fields: (`outputParameterId`)"
**Root Cause:** No pre-check before creating formula with duplicate outputParameterId
**Prisma Code:** P2002
**Fix:** Add findUnique check before create, handle constraint violations

### Issue 2: Record Not Found During Deletion
**Location:** src/services/FormulaEngine.ts, lines 356-359
**Error:** "Record to delete does not exist"
**Root Cause:** Direct delete without existence verification
**Prisma Code:** P2025
**Fix:** Verify record exists before delete, handle P2025 errors gracefully

---

## Key Defensive Programming Patterns Recommended

### Pattern 1: Pre-Check Before Create
```typescript
// Before creating, verify no duplicate exists:
const existing = await prisma.parameterFormula.findUnique({
  where: { outputParameterId: input.outputParameterId },
});
if (existing) {
  throw new Error(`Formula already exists for output parameter: ${input.outputParameterId}`);
}
```

### Pattern 2: Existence Check Before Delete
```typescript
// Before deleting, verify record exists:
const existing = await prisma.parameterFormula.findUnique({
  where: { id },
});
if (!existing) {
  throw new Error(`Formula not found: ${id}`);
}
```

### Pattern 3: Prisma Error Code Handling
```typescript
// Catch and handle specific Prisma error codes:
try {
  // ... database operation ...
} catch (error: any) {
  if (error.code === 'P2002') {
    // Unique constraint violation
  } else if (error.code === 'P2025') {
    // Record not found
  }
  throw error;
}
```

### Pattern 4: Proper HTTP Status Codes
```typescript
// Map errors to correct HTTP responses:
- 400: Bad request / validation error
- 404: Not found (P2025)
- 409: Conflict / constraint violation (P2002)
- 500: Unexpected server error
```

---

## Test Failure Scenarios

### Scenario 1: Unique Constraint Failure
1. Test creates formula with `outputParameterId = 'flow-output'`
2. Test cleanup fails to delete (network issue, lock)
3. Next test tries to create formula with same `outputParameterId`
4. P2002 error: "Unique constraint failed on the fields: (`outputParameterId`)"

### Scenario 2: Record Not Found Failure
1. Test attempts to delete formula with stale/invalid ID
2. Prisma throws P2025: "Record to delete does not exist"
3. Route handler returns 500 instead of 404
4. Test cleanup continues silently hiding the error

---

## Files That Need Modification

| File | Lines | Changes |
|------|-------|---------|
| src/services/FormulaEngine.ts | 71-117 | Add pre-check in createFormula() |
| src/services/FormulaEngine.ts | 356-359 | Add existence check in deleteFormula() |
| src/services/FormulaEngine.ts | 309-351 | Add outputParameterId conflict check in updateFormula() |
| src/routes/parameterFormulas.ts | 27-37 | Enhance error handling in POST route |
| src/routes/parameterFormulas.ts | 82-93 | Return 404 for not found in DELETE route |
| src/routes/parameterFormulas.ts | 63-76 | Add conflict handling in PUT route |

---

## Implementation Priority

### Priority 1 (Critical - Causes Test Failures)
- [ ] Add pre-check in createFormula() for duplicate outputParameterId
- [ ] Add existence check in deleteFormula()
- [ ] Return 404 (not 500) for not found errors in DELETE route

### Priority 2 (Important - Prevents Future Issues)
- [ ] Add P2002 error handling in createFormula() try-catch
- [ ] Add P2025 error handling in deleteFormula() try-catch
- [ ] Add outputParameterId conflict check in updateFormula()

### Priority 3 (Enhancement - Better UX)
- [ ] Improve error messages with context and suggestions
- [ ] Add error codes (CONFLICT, NOT_FOUND, VALIDATION_ERROR)
- [ ] Enhance logging with metadata

---

## Expected Test Results After Fix

### Before
```
✗ should create a valid formula - FAILS (unique constraint)
✗ should delete formula - FAILS (record not found)
✗ cleanup errors (silent)
```

### After
```
✓ should create a valid formula - PASSES
✓ should delete formula - PASSES
✓ cleanup completes cleanly
```

---

## Code Review Checklist

When reviewing the fixes:

- [ ] Pre-checks added before create/update/delete
- [ ] Prisma error codes handled (P2002, P2025, P2003)
- [ ] Proper HTTP status codes returned
- [ ] Error messages are actionable and helpful
- [ ] Logging includes context for debugging
- [ ] No silent failures in error handling
- [ ] Race conditions handled (formula deleted between check and delete)

---

## Additional Resources

The analysis includes:

1. **Prisma Error Code Reference**
   - P2002: Unique constraint failed
   - P2003: Foreign key constraint failed
   - P2025: Record to delete does not exist

2. **HTTP Status Code Mapping**
   - 400: Bad Request / Validation Error
   - 404: Not Found
   - 409: Conflict
   - 500: Internal Server Error

3. **Database Schema Context**
   - ParameterFormula.outputParameterId is @unique
   - One formula per output parameter maximum
   - Cascading deletes enabled

4. **Test Context**
   - Tests use afterEach cleanup
   - Cleanup currently silently ignores errors
   - Tests need defensive deletion patterns

---

## Estimated Implementation Time

- Implementation: 30-45 minutes
- Testing: 15-20 minutes
- Code review: 10-15 minutes
- Total: ~1 hour

---

## Next Steps

1. Review FORMULA_ENGINE_QUICK_FIX.md for immediate fixes
2. Implement Priority 1 fixes in FormulaEngine.ts and routes
3. Run tests: `npm test -- parameter-formulas.spec.ts`
4. Verify no unique constraint or "record not found" errors
5. Review FORMULA_ENGINE_IMPLEMENTATION_GUIDE.md for Priority 2 & 3

---

## Key Takeaway

The FormulaEngine service validates formula syntax and dependencies but fails to validate database constraints. Adding pre-checks before create/delete operations prevents Prisma constraint violations and improves error handling, making the service more robust and the tests more reliable.

