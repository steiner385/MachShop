# FormulaEngine.ts Error Handling Analysis

## Executive Summary

The FormulaEngine.ts service has **two critical error handling gaps** causing test failures:

1. **"Unique constraint failed on the fields: (`outputParameterId`)"** - During formula creation
2. **"Record to delete does not exist"** - During formula deletion

These errors occur because the code lacks defensive checks for existing records before database operations.

---

## Critical Issues Identified

### Issue 1: Unique Constraint Violation in createFormula() (Lines 71-117)

**Problem:**
The `createFormula()` method validates dependencies and test cases but **never checks if a formula already exists for the given outputParameterId**. The schema declares `outputParameterId` as `@unique`, meaning only one formula can have a particular output parameter.

**Schema Definition** (line 1040):
```prisma
model ParameterFormula {
  outputParameterId String @unique  // <- Only one formula per parameter!
  ...
}
```

**Current Code** (lines 104-116):
```typescript
return await prisma.parameterFormula.create({
  data: {
    formulaName: input.formulaName,
    outputParameterId: input.outputParameterId,
    formulaExpression: input.formulaExpression,
    inputParameterIds: dependencies,
    evaluationTrigger: input.evaluationTrigger || 'ON_CHANGE',
    evaluationSchedule: input.evaluationSchedule,
    testCases: input.testCases as any,
    isActive: true,
    createdBy: input.createdBy,
  },
});
```

**What's Missing:**
- No check for existing formula with same `outputParameterId`
- No upsert logic to handle duplicate creation attempts
- No error handling for Prisma P2002 constraint violation errors

**Why Tests Fail:**
The test cleanup (lines 13-33 in parameter-formulas.spec.ts) attempts to delete formulas after each test. If a deletion fails or a previous test didn't clean up properly, the next test trying to create a formula with the same `outputParameterId` will hit the unique constraint violation.

---

### Issue 2: Missing Record Check in deleteFormula() (Lines 356-359)

**Problem:**
The `deleteFormula()` method directly attempts to delete without checking if the record exists first.

**Current Code**:
```typescript
async deleteFormula(id: string): Promise<void> {
  await prisma.parameterFormula.delete({ where: { id } });
  logger.info('Deleted formula', { id });
}
```

**What's Missing:**
- No verification that the formula exists before deletion
- No handling for P2025 error (record not found)
- No graceful error message

**Why Tests Fail:**
If a deletion fails for any reason or if the ID is invalid, Prisma throws:
```
Record to delete does not exist
```

The test cleanup (lines 12-33) catches this in a try-catch, but the main delete endpoint (lines 82-93 in routes) returns HTTP 500 instead of handling it gracefully.

---

## Error Patterns in Prisma

### P2002: Unique Constraint Failed
```
Error Code: P2002
Message: Unique constraint failed on the fields: (`outputParameterId`)
```
This occurs when trying to create a record with a duplicate unique field value.

### P2025: Record Not Found
```
Error Code: P2025
Message: An operation failed because it depends on one or more records that were required but not found. Record to delete does not exist
```
This occurs when trying to delete/update a non-existent record.

---

## Root Cause Analysis

### Test Failure Scenario 1: Unique Constraint
1. Test 1 creates formula with `outputParameterId = 'flow-output'`
2. Test 1's cleanup tries to delete it
3. Deletion fails due to network issue/database lock
4. Test 2 runs and tries to create formula with same `outputParameterId`
5. **BOOM**: P2002 unique constraint violation

### Test Failure Scenario 2: Record Not Found
1. Test runs `deleteFormula()` with invalid/stale ID
2. ID doesn't exist in database
3. Prisma throws P2025 error
4. No error handling catches this
5. **BOOM**: Test fails with "Record to delete does not exist"

---

## Current Error Handling Gaps

### In FormulaEngine.ts createFormula():
```typescript
// Lines 82-89: Only checks if parameters exist
if (dependencies.length > 0) {
  const params = await prisma.operationParameter.findMany({
    where: { id: { in: dependencies } },
  });
  if (params.length !== dependencies.length) {
    throw new Error('Some input parameters do not exist');
  }
}

// MISSING: No check for existing formula!
// MISSING: No Prisma error handling for P2002!
```

### In FormulaEngine.ts deleteFormula():
```typescript
// Lines 356-359: Direct delete, no existence check
async deleteFormula(id: string): Promise<void> {
  await prisma.parameterFormula.delete({ where: { id } });
  logger.info('Deleted formula', { id });
}
// MISSING: No error handling for P2025!
```

### In Routes parameterFormulas.ts deleteFormula():
```typescript
// Lines 82-93: Returns 500 for any error
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await formulaEngine.deleteFormula(id);
    logger.info('Formula deleted', { formulaId: id });
    return res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting formula', { error: error.message });
    return res.status(500).json({ error: error.message });  // <- 500 for all errors
  }
});
// MISSING: No distinction between 404 (not found) and 500 (server error)
```

---

## Recommended Error Handling Patterns

### Pattern 1: Pre-check Before Create (Upsert Pattern)

```typescript
async createFormula(input: CreateFormulaInput): Promise<ParameterFormula> {
  // ... validation code ...

  // CHECK 1: Verify output parameter exists
  const outputParam = await prisma.operationParameter.findUnique({
    where: { id: input.outputParameterId },
  });
  if (!outputParam) {
    throw new Error(
      `Output parameter not found: ${input.outputParameterId}`
    );
  }

  // CHECK 2: Check if formula already exists for this output parameter
  const existingFormula = await prisma.parameterFormula.findUnique({
    where: { outputParameterId: input.outputParameterId },
  });
  
  if (existingFormula) {
    // Option A: Throw error (strict mode)
    throw new Error(
      `Formula already exists for output parameter: ${input.outputParameterId}. ` +
      `Delete existing formula (ID: ${existingFormula.id}) first or use update endpoint.`
    );
    
    // Option B: Update existing (upsert mode)
    // return this.updateFormula(existingFormula.id, input, input.createdBy);
  }

  try {
    return await prisma.parameterFormula.create({
      data: {
        formulaName: input.formulaName,
        outputParameterId: input.outputParameterId,
        formulaExpression: input.formulaExpression,
        inputParameterIds: dependencies,
        evaluationTrigger: input.evaluationTrigger || 'ON_CHANGE',
        evaluationSchedule: input.evaluationSchedule,
        testCases: input.testCases as any,
        isActive: true,
        createdBy: input.createdBy,
      },
    });
  } catch (error: any) {
    // Handle Prisma errors explicitly
    if (error.code === 'P2002') {
      throw new Error(
        `Unique constraint violation: Another formula uses outputParameterId ${input.outputParameterId}`
      );
    }
    if (error.code === 'P2003') {
      throw new Error('Invalid reference: One or more referenced parameters do not exist');
    }
    throw error; // Re-throw unexpected errors
  }
}
```

### Pattern 2: Safe Delete with Existence Check

```typescript
async deleteFormula(id: string): Promise<{ success: boolean; message: string }> {
  // CHECK 1: Verify formula exists
  const existing = await prisma.parameterFormula.findUnique({
    where: { id },
    select: { id: true, formulaName: true },
  });

  if (!existing) {
    throw new Error(
      `Formula not found: ${id}`
    );
  }

  try {
    await prisma.parameterFormula.delete({
      where: { id },
    });
    
    logger.info('Deleted formula', { 
      id, 
      formulaName: existing.formulaName 
    });
    
    return { 
      success: true, 
      message: `Formula "${existing.formulaName}" deleted successfully` 
    };
  } catch (error: any) {
    // Handle race condition: formula deleted between check and delete
    if (error.code === 'P2025') {
      logger.warn('Formula was deleted by another process', { id });
      return { 
        success: true, 
        message: 'Formula already deleted' 
      };
    }
    throw error;
  }
}
```

### Pattern 3: Better Route Error Handling

```typescript
// DELETE /api/v1/formulas/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id || !id.trim()) {
      return res.status(400).json({ error: 'Formula ID is required' });
    }

    const result = await formulaEngine.deleteFormula(id);
    logger.info('Formula deleted', { formulaId: id });
    return res.status(204).send();

  } catch (error: any) {
    logger.error('Error deleting formula', { 
      error: error.message,
      code: error.code 
    });

    // Distinguish between error types
    if (error.message.includes('not found') || error.code === 'P2025') {
      return res.status(404).json({ 
        error: `Formula not found`,
        code: 'NOT_FOUND' 
      });
    }

    if (error.message.includes('constraint')) {
      return res.status(409).json({ 
        error: error.message,
        code: 'CONSTRAINT_VIOLATION' 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});
```

### Pattern 4: Defensive Update with Pre-check

```typescript
async updateFormula(
  id: string,
  updates: Partial<CreateFormulaInput>,
  userId: string
): Promise<ParameterFormula> {
  // CHECK 1: Verify formula exists
  const existing = await prisma.parameterFormula.findUnique({ 
    where: { id } 
  });
  
  if (!existing) {
    throw new Error(`Formula not found: ${id}`);
  }

  // CHECK 2: If changing output parameter, verify no other formula uses it
  if (updates.outputParameterId && updates.outputParameterId !== existing.outputParameterId) {
    const conflict = await prisma.parameterFormula.findUnique({
      where: { outputParameterId: updates.outputParameterId },
    });
    
    if (conflict && conflict.id !== id) {
      throw new Error(
        `Cannot update: Output parameter already used by formula ${conflict.id}`
      );
    }
  }

  // ... rest of validation ...

  try {
    return await prisma.parameterFormula.update({
      where: { id },
      data: {
        ...updates,
        lastModifiedBy: userId,
      } as any,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new Error(`Formula was deleted by another process: ${id}`);
    }
    if (error.code === 'P2002') {
      throw new Error('Unique constraint violation: Output parameter already in use');
    }
    throw error;
  }
}
```

---

## Comprehensive Error Handling Checklist

### For createFormula():
- [ ] Verify `outputParameterId` parameter exists
- [ ] Check if formula already exists for this `outputParameterId`
- [ ] Catch and handle P2002 (unique constraint) errors
- [ ] Catch and handle P2003 (foreign key) errors
- [ ] Provide clear error messages for constraint violations
- [ ] Log formula creation with metadata

### For deleteFormula():
- [ ] Check if formula exists before deleting
- [ ] Return specific error for 404 (not found)
- [ ] Catch and handle P2025 errors gracefully
- [ ] Allow idempotent deletes (already deleted = success)
- [ ] Log deletion with formula metadata

### For updateFormula():
- [ ] Verify formula exists before updating
- [ ] Check if new `outputParameterId` conflicts with existing formulas
- [ ] Catch constraint violation errors
- [ ] Log update with delta information

### For routes:
- [ ] Return 400 for bad input
- [ ] Return 404 for not found errors
- [ ] Return 409 for conflict/constraint errors
- [ ] Return 500 for unexpected server errors
- [ ] Include error codes in response for client-side handling

---

## Test-Specific Recommendations

The test cleanup (lines 12-33 in parameter-formulas.spec.ts) shows the problem:

```typescript
test.afterEach(async ({ request }) => {
  try {
    const listResponse = await request.get('/api/v1/formulas', { headers: authHeaders });
    if (listResponse.ok()) {
      const formulas = await listResponse.json();
      for (const formula of formulas) {
        try {
          await request.delete(`/api/v1/formulas/${formula.id}`, { headers: authHeaders });
        } catch {
          // Silently ignoring failures!
        }
      }
    }
  } catch (error) {
    // Silently ignoring failures!
  }
});
```

**Improvement:**
```typescript
test.afterEach(async ({ request }) => {
  // With defensive delete, we can be more assertive:
  try {
    const listResponse = await request.get('/api/v1/formulas', { headers: authHeaders });
    if (listResponse.ok()) {
      const formulas = await listResponse.json();
      for (const formula of formulas) {
        const deleteResponse = await request.delete(`/api/v1/formulas/${formula.id}`, { 
          headers: authHeaders 
        });
        // 204 (deleted) or 404 (already gone) are both acceptable
        expect([204, 404]).toContain(deleteResponse.status());
      }
    }
  } catch (error) {
    console.warn('Cleanup error (non-critical)', error);
  }
});
```

---

## Summary of Changes Needed

| Component | Issue | Fix |
|-----------|-------|-----|
| **createFormula()** | No pre-check for existing formula | Add existence check before create, handle P2002 |
| **deleteFormula()** | No existence check | Add pre-check, handle P2025 gracefully |
| **updateFormula()** | No constraint checking | Check for conflicts on unique fields |
| **DELETE route** | Returns 500 for all errors | Distinguish 404 vs 500 errors |
| **Error messages** | Generic Prisma errors | Map to specific, actionable messages |

