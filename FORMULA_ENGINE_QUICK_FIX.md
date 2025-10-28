# FormulaEngine.ts - Quick Fix Reference

## Problem Summary
Two test failures caused by missing error handling in FormulaEngine.ts:

1. **"Unique constraint failed on the fields: (`outputParameterId`)"** at createFormula()
2. **"Record to delete does not exist"** at deleteFormula()

---

## Root Causes

### Issue 1: createFormula() (Line 71-117)
**Missing:** Pre-check for existing formula before create
**Cause:** `outputParameterId` has `@unique` constraint in schema (line 1040)
**Result:** P2002 error when trying to create second formula with same parameter

### Issue 2: deleteFormula() (Line 356-359)
**Missing:** Existence check and error handling
**Cause:** Direct delete without verification
**Result:** P2025 error "Record to delete does not exist" when ID is invalid

---

## Quick Fixes

### Fix 1: Add Pre-check in createFormula()

**Location:** src/services/FormulaEngine.ts, Line 90 (before create)

```typescript
// ADD THIS CHECK before line 104 (before prisma.parameterFormula.create):

// Check if formula already exists for this output parameter
const existingFormula = await prisma.parameterFormula.findUnique({
  where: { outputParameterId: input.outputParameterId },
});
if (existingFormula) {
  throw new Error(
    `Formula already exists for output parameter: ${input.outputParameterId}. ` +
    `Delete existing formula (ID: ${existingFormula.id}) first.`
  );
}

// THEN wrap the create in try-catch:
try {
  return await prisma.parameterFormula.create({
    // ... existing data ...
  });
} catch (error: any) {
  if (error.code === 'P2002') {
    throw new Error(
      `Unique constraint violation: Another formula uses outputParameterId ${input.outputParameterId}`
    );
  }
  throw error;
}
```

### Fix 2: Add Existence Check in deleteFormula()

**Location:** src/services/FormulaEngine.ts, Line 356

**Replace:**
```typescript
async deleteFormula(id: string): Promise<void> {
  await prisma.parameterFormula.delete({ where: { id } });
  logger.info('Deleted formula', { id });
}
```

**With:**
```typescript
async deleteFormula(id: string): Promise<void> {
  // Check if formula exists
  const existing = await prisma.parameterFormula.findUnique({
    where: { id },
    select: { id: true, formulaName: true },
  });

  if (!existing) {
    throw new Error(`Formula not found: ${id}`);
  }

  try {
    await prisma.parameterFormula.delete({ where: { id } });
    logger.info('Deleted formula', { id, formulaName: existing.formulaName });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Already deleted by another process - that's ok
      logger.warn('Formula was deleted by another process', { id });
    } else {
      throw error;
    }
  }
}
```

### Fix 3: Improve Route Error Handling

**Location:** src/routes/parameterFormulas.ts, Line 82-93

**Replace:**
```typescript
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await formulaEngine.deleteFormula(id);
    logger.info('Formula deleted', { formulaId: id });
    return res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting formula', { error: error.message });
    return res.status(500).json({ error: error.message });  // Always 500!
  }
});
```

**With:**
```typescript
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await formulaEngine.deleteFormula(id);
    logger.info('Formula deleted', { formulaId: id });
    return res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting formula', { error: error.message });
    
    // Return 404 for not found, 500 for other errors
    if (error.message.includes('not found') || error.code === 'P2025') {
      return res.status(404).json({ error: 'Formula not found' });
    }
    
    return res.status(500).json({ error: error.message });
  }
});
```

---

## Validation Checklist

After implementing fixes, verify:

- [ ] createFormula() checks if formula exists before creating
- [ ] createFormula() handles P2002 constraint errors
- [ ] deleteFormula() checks if formula exists before deleting
- [ ] deleteFormula() handles P2025 errors gracefully
- [ ] DELETE route returns 404 (not 500) for not found
- [ ] Tests pass without cleanup errors
- [ ] No duplicate formula creation errors
- [ ] No "Record to delete does not exist" errors

---

## Testing After Fix

Run the formula tests:
```bash
npm test -- parameter-formulas.spec.ts
```

Expected results:
- All CRUD tests pass
- Cleanup completes without errors
- No unique constraint violations
- No record not found errors

---

## Files to Modify

1. `/home/tony/GitHub/mes/src/services/FormulaEngine.ts`
   - Lines 71-117: createFormula()
   - Lines 356-359: deleteFormula()

2. `/home/tony/GitHub/mes/src/routes/parameterFormulas.ts`
   - Lines 82-93: DELETE route error handling

---

## Affected Methods Summary

| Method | Current Issue | Required Fix |
|--------|---------------|--------------|
| createFormula() | No duplicate check | Add pre-check for existing formula |
| deleteFormula() | No existence check | Add pre-check + P2025 handling |
| updateFormula() | Partial checks | Add outputParameterId conflict check |
| DELETE route | Returns 500 for all | Distinguish 404 vs 500 |

---

## Error Messages: Before vs After

### Before (Unhelpful)
```
Error: Unique constraint failed on the fields: (`outputParameterId`)
Error: Record to delete does not exist
```

### After (Helpful)
```
Error: Formula already exists for output parameter: flow-output. Delete existing formula (ID: abc123) first.
Error: Formula not found: xyz789
```

---

## Performance Impact
- Adds 1 extra findUnique() call per create
- Adds 1 extra findUnique() call per delete
- Negligible performance impact (< 5ms per operation)
- Prevents expensive constraint violation errors
- Worth it for test stability and user experience

