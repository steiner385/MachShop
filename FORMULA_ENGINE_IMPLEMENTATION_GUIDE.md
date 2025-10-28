# FormulaEngine.ts - Implementation Guide with Code Examples

## Quick Reference: Error Codes to Handle

```typescript
// Prisma Error Codes to watch for:
// P2002 - Unique constraint failed
// P2003 - Foreign key constraint failed
// P2025 - Record to delete does not exist
// P2029 - Failed to validate connection string

// Custom Error Types for better handling:
class ConstraintViolationError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ConstraintViolationError';
  }
}

class RecordNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecordNotFoundError';
  }
}
```

---

## Implementation: Robust createFormula()

### BEFORE (Current - Vulnerable)
```typescript
async createFormula(input: CreateFormulaInput): Promise<ParameterFormula> {
  const validation = await this.validateFormula(input.formulaExpression);
  if (!validation.valid) {
    throw new Error(`Invalid formula: ${validation.error}`);
  }

  const dependencies = this.extractDependencies(input.formulaExpression);

  // Problem: Only checks if dependencies exist
  if (dependencies.length > 0) {
    const params = await prisma.operationParameter.findMany({
      where: { id: { in: dependencies } },
    });
    if (params.length !== dependencies.length) {
      throw new Error('Some input parameters do not exist');
    }
  }

  // Problem: No check for existing formula with same outputParameterId!
  return await prisma.parameterFormula.create({
    data: {
      formulaName: input.formulaName,
      outputParameterId: input.outputParameterId,
      // ...rest of data
    },
  });
}
```

### AFTER (Robust - Safe)
```typescript
async createFormula(input: CreateFormulaInput): Promise<ParameterFormula> {
  // VALIDATION 1: Formula syntax
  const validation = await this.validateFormula(input.formulaExpression);
  if (!validation.valid) {
    throw new Error(`Invalid formula: ${validation.error}`);
  }

  const dependencies = this.extractDependencies(input.formulaExpression);

  // VALIDATION 2: Output parameter exists
  const outputParam = await prisma.operationParameter.findUnique({
    where: { id: input.outputParameterId },
  });
  if (!outputParam) {
    throw new Error(
      `Output parameter not found: ${input.outputParameterId}. ` +
      `Create the parameter first before defining a formula.`
    );
  }

  // VALIDATION 3: Input parameters exist
  if (dependencies.length > 0) {
    const params = await prisma.operationParameter.findMany({
      where: { id: { in: dependencies } },
    });
    if (params.length !== dependencies.length) {
      const found = params.map(p => p.id);
      const missing = dependencies.filter(d => !found.includes(d));
      throw new Error(
        `Missing input parameters: ${missing.join(', ')}. ` +
        `Create these parameters before using them in the formula.`
      );
    }
  }

  // VALIDATION 4: No existing formula for this output parameter
  const existingFormula = await prisma.parameterFormula.findUnique({
    where: { outputParameterId: input.outputParameterId },
  });
  if (existingFormula) {
    throw new Error(
      `Formula already exists for output parameter "${outputParam.parameterName}". ` +
      `Existing formula ID: ${existingFormula.id}. ` +
      `Update the existing formula or delete it first.`
    );
  }

  // VALIDATION 5: Test cases (if provided)
  if (input.testCases && input.testCases.length > 0) {
    const testResults = await this.runTestCases(input.formulaExpression, input.testCases);
    const failures = testResults.filter((r) => !r.passed);
    if (failures.length > 0) {
      throw new Error(
        `Formula validation failed: ${failures.length} test case(s) failed. ` +
        `Details: ${failures.map((f) => f.error).join('; ')}`
      );
    }
  }

  logger.info('Creating formula', {
    formulaName: input.formulaName,
    outputParameterId: input.outputParameterId,
    dependencyCount: dependencies.length,
  });

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
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      // This should not happen due to our pre-check, but handle as safety net
      throw new Error(
        `Unique constraint violation: ` +
        `Another formula already uses output parameter ${input.outputParameterId}`
      );
    }
    if (error.code === 'P2003') {
      throw new Error(
        `Foreign key constraint failed: ` +
        `One or more referenced parameters do not exist`
      );
    }
    
    // Log unexpected errors for debugging
    logger.error('Unexpected error creating formula', {
      error: error.message,
      code: error.code,
      formulaName: input.formulaName,
    });
    
    throw error;
  }
}
```

---

## Implementation: Robust deleteFormula()

### BEFORE (Current - Unsafe)
```typescript
async deleteFormula(id: string): Promise<void> {
  // Problem: Direct delete without existence check
  // Problem: No error handling for record not found
  await prisma.parameterFormula.delete({ where: { id } });
  logger.info('Deleted formula', { id });
}
```

### AFTER (Robust - Safe)
```typescript
async deleteFormula(id: string): Promise<{ success: boolean; message: string }> {
  // VALIDATION 1: Input parameter
  if (!id || !id.trim()) {
    throw new Error('Formula ID is required');
  }

  // CHECK 1: Verify formula exists BEFORE attempting delete
  const existing = await prisma.parameterFormula.findUnique({
    where: { id },
    select: {
      id: true,
      formulaName: true,
      outputParameterId: true,
    },
  });

  if (!existing) {
    logger.warn('Attempted to delete non-existent formula', { id });
    throw new Error(`Formula not found with ID: ${id}`);
  }

  try {
    await prisma.parameterFormula.delete({ where: { id } });

    logger.info('Successfully deleted formula', {
      id,
      formulaName: existing.formulaName,
      outputParameterId: existing.outputParameterId,
    });

    return {
      success: true,
      message: `Formula "${existing.formulaName}" deleted successfully`,
    };
  } catch (error: any) {
    // Handle race condition: formula deleted between check and delete
    if (error.code === 'P2025') {
      logger.warn('Formula was deleted by another process (race condition)', { id });
      return {
        success: true,
        message: 'Formula was already deleted',
      };
    }

    // Unexpected error
    logger.error('Unexpected error deleting formula', {
      error: error.message,
      code: error.code,
      id,
    });

    throw error;
  }
}
```

---

## Implementation: Robust updateFormula()

### BEFORE (Current - Incomplete)
```typescript
async updateFormula(
  id: string,
  updates: Partial<CreateFormulaInput>,
  userId: string
): Promise<ParameterFormula> {
  const existing = await prisma.parameterFormula.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Formula not found');
  }

  if (updates.formulaExpression) {
    // ... validation code ...
  }

  // Problem: No check for outputParameterId conflicts if changing it
  return await prisma.parameterFormula.update({
    where: { id },
    data: {
      ...updates,
      lastModifiedBy: userId,
    } as any,
  });
}
```

### AFTER (Robust - Safe)
```typescript
async updateFormula(
  id: string,
  updates: Partial<CreateFormulaInput>,
  userId: string
): Promise<ParameterFormula> {
  // VALIDATION 1: Input parameter
  if (!id || !id.trim()) {
    throw new Error('Formula ID is required');
  }

  // CHECK 1: Formula exists
  const existing = await prisma.parameterFormula.findUnique({
    where: { id },
    select: {
      id: true,
      formulaName: true,
      outputParameterId: true,
      formulaExpression: true,
    },
  });

  if (!existing) {
    throw new Error(`Formula not found: ${id}`);
  }

  // VALIDATION 2: Check expression if being updated
  if (updates.formulaExpression && updates.formulaExpression !== existing.formulaExpression) {
    const validation = await this.validateFormula(updates.formulaExpression);
    if (!validation.valid) {
      throw new Error(`Invalid formula expression: ${validation.error}`);
    }

    const dependencies = this.extractDependencies(updates.formulaExpression);

    // Verify all dependencies exist
    if (dependencies.length > 0) {
      const params = await prisma.operationParameter.findMany({
        where: { id: { in: dependencies } },
      });
      if (params.length !== dependencies.length) {
        const found = params.map(p => p.id);
        const missing = dependencies.filter(d => !found.includes(d));
        throw new Error(`Missing input parameters: ${missing.join(', ')}`);
      }
    }

    // Store for use in update
    (updates as any).inputParameterIds = dependencies;

    // Run test cases if provided
    if (updates.testCases && updates.testCases.length > 0) {
      const testResults = await this.runTestCases(updates.formulaExpression, updates.testCases);
      const failures = testResults.filter((r) => !r.passed);
      if (failures.length > 0) {
        throw new Error(
          `Formula validation failed: ${failures.length} test case(s) failed`
        );
      }
    }
  }

  // CHECK 2: If changing output parameter, verify no conflict
  if (
    updates.outputParameterId &&
    updates.outputParameterId !== existing.outputParameterId
  ) {
    // Verify new parameter exists
    const newParam = await prisma.operationParameter.findUnique({
      where: { id: updates.outputParameterId },
    });
    if (!newParam) {
      throw new Error(
        `Output parameter not found: ${updates.outputParameterId}`
      );
    }

    // Check for conflict: another formula using this parameter
    const conflict = await prisma.parameterFormula.findUnique({
      where: { outputParameterId: updates.outputParameterId },
    });

    if (conflict && conflict.id !== id) {
      throw new Error(
        `Cannot update: Output parameter already used by another formula (ID: ${conflict.id})`
      );
    }
  }

  logger.info('Updating formula', {
    id,
    formulaName: existing.formulaName,
    changes: Object.keys(updates),
    modifiedBy: userId,
  });

  try {
    return await prisma.parameterFormula.update({
      where: { id },
      data: {
        ...updates,
        lastModifiedBy: userId,
      } as any,
    });
  } catch (error: any) {
    // Handle specific errors
    if (error.code === 'P2025') {
      throw new Error(
        `Formula was deleted by another process: ${id}`
      );
    }
    if (error.code === 'P2002') {
      throw new Error(
        `Unique constraint violation: Output parameter already in use`
      );
    }

    logger.error('Unexpected error updating formula', {
      error: error.message,
      code: error.code,
      id,
    });

    throw error;
  }
}
```

---

## Implementation: Enhanced Route Error Handling

### BEFORE (Current - Generic)
```typescript
router.post('/', async (req: Request, res: Response) => {
  try {
    const formula = await formulaEngine.createFormula(req.body);
    logger.info('Formula created', { formulaId: formula.id });
    return res.status(201).json(formula);
  } catch (error: any) {
    logger.error('Error creating formula', { error: error.message });
    return res.status(400).json({ error: error.message });  // <-- Always 400
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await formulaEngine.deleteFormula(id);
    logger.info('Formula deleted', { formulaId: id });
    return res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting formula', { error: error.message });
    return res.status(500).json({ error: error.message });  // <-- Always 500
  }
});
```

### AFTER (Robust - Proper Status Codes)
```typescript
// CREATE
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate required fields
    if (!req.body.outputParameterId) {
      return res.status(400).json({
        error: 'outputParameterId is required',
        code: 'MISSING_FIELD',
      });
    }
    if (!req.body.formulaExpression) {
      return res.status(400).json({
        error: 'formulaExpression is required',
        code: 'MISSING_FIELD',
      });
    }

    const formula = await formulaEngine.createFormula(req.body);

    logger.info('Formula created successfully', {
      formulaId: formula.id,
      formulaName: formula.formulaName,
    });

    return res.status(201).json(formula);

  } catch (error: any) {
    logger.error('Error creating formula', {
      error: error.message,
      code: error.code,
      body: req.body,
    });

    // Map errors to appropriate status codes
    if (error.message.includes('not found') || error.code === 'P2003') {
      return res.status(404).json({
        error: error.message,
        code: 'NOT_FOUND',
      });
    }

    if (error.message.includes('already exists') || error.code === 'P2002') {
      return res.status(409).json({
        error: error.message,
        code: 'CONFLICT',
      });
    }

    if (error.message.includes('Invalid formula') ||
        error.message.includes('validation failed')) {
      return res.status(400).json({
        error: error.message,
        code: 'VALIDATION_ERROR',
      });
    }

    // Default to 500 for unexpected errors
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// DELETE
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || !id.trim()) {
      return res.status(400).json({
        error: 'Formula ID is required',
        code: 'MISSING_PARAMETER',
      });
    }

    const result = await formulaEngine.deleteFormula(id);

    logger.info('Formula deleted successfully', {
      formulaId: id,
      message: result.message,
    });

    return res.status(204).send();

  } catch (error: any) {
    logger.error('Error deleting formula', {
      error: error.message,
      code: error.code,
      formulaId: req.params.id,
    });

    // Map errors to appropriate status codes
    if (error.message.includes('not found') || error.code === 'P2025') {
      return res.status(404).json({
        error: 'Formula not found',
        code: 'NOT_FOUND',
      });
    }

    if (error.message.includes('required')) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_REQUEST',
      });
    }

    // Default to 500
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// UPDATE
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || 'system';

    if (!id || !id.trim()) {
      return res.status(400).json({
        error: 'Formula ID is required',
        code: 'MISSING_PARAMETER',
      });
    }

    const formula = await formulaEngine.updateFormula(id, req.body, userId);

    logger.info('Formula updated successfully', {
      formulaId: id,
      formulaName: formula.formulaName,
    });

    return res.json(formula);

  } catch (error: any) {
    logger.error('Error updating formula', {
      error: error.message,
      code: error.code,
      formulaId: req.params.id,
    });

    if (error.message.includes('not found') || error.code === 'P2025') {
      return res.status(404).json({
        error: 'Formula not found',
        code: 'NOT_FOUND',
      });
    }

    if (error.message.includes('Constraint') ||
        error.message.includes('already used') ||
        error.code === 'P2002') {
      return res.status(409).json({
        error: error.message,
        code: 'CONFLICT',
      });
    }

    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        error: error.message,
        code: 'VALIDATION_ERROR',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});
```

---

## Testing with Better Cleanup

### BEFORE (Silent Failures)
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
          // Silent failure - problems hide!
        }
      }
    }
  } catch (error) {
    // Silent failure
  }
});
```

### AFTER (Observable Cleanup)
```typescript
test.afterEach(async ({ request }) => {
  try {
    const listResponse = await request.get('/api/v1/formulas', { headers: authHeaders });
    expect(listResponse.ok()).toBe(true);

    const formulas = await listResponse.json();

    for (const formula of formulas) {
      const deleteResponse = await request.delete(
        `/api/v1/formulas/${formula.id}`,
        { headers: authHeaders }
      );

      // Accept both 204 (deleted) and 404 (already gone)
      expect([204, 404]).toContain(deleteResponse.status());

      if (deleteResponse.status() !== 204 && deleteResponse.status() !== 404) {
        console.warn(`Cleanup failed for formula ${formula.id}:`, {
          status: deleteResponse.status(),
          error: deleteResponse.statusText(),
        });
      }
    }
  } catch (error) {
    console.error('Cleanup encountered error:', error);
    // Don't fail the test, just warn
    console.warn('Test cleanup failed but continuing test suite');
  }
});
```

---

## Error Response Format

### Consistent API Response Format
```typescript
// Success Response
{
  "id": "cuid",
  "formulaName": "...",
  "outputParameterId": "...",
  ...
}

// Error Response
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",      // For client-side handling
  "timestamp": "ISO-8601",   // When error occurred
  "path": "/api/v1/formulas", // Which endpoint failed
  "requestId": "..."         // For logging correlation
}

// Example error codes:
// MISSING_FIELD - Required field not provided
// MISSING_PARAMETER - Required URL parameter missing
// NOT_FOUND - Resource doesn't exist
// CONFLICT - Constraint or conflict error
// VALIDATION_ERROR - Input validation failed
// INTERNAL_ERROR - Unexpected server error
```

