# FormulaEngine.ts - Error Flow Diagrams

## Current Error Flow (Broken)

### Create Formula Flow
```
User Request: POST /api/v1/formulas
  |
  v
createFormula(input)
  |
  +-- Validate formula expression
  |    |
  |    v
  |    math.parse() successful? YES -> Continue
  |    NO -> throw Error
  |
  +-- Extract dependencies
  |    |
  |    v
  |    Check input parameters exist?
  |    NO -> throw Error
  |    YES -> Continue
  |
  +-- Run test cases (if provided)
  |    |
  |    v
  |    All tests pass? NO -> throw Error
  |    YES -> Continue
  |
  +-- MISSING CHECK: Verify no existing formula for outputParameterId!
  |
  v
prisma.parameterFormula.create({
  outputParameterId: input.outputParameterId,
  ...data
})
  |
  +-- P2002: UNIQUE CONSTRAINT FAILED!
  |    |
  |    v
  |    ERROR: "Unique constraint failed on the fields: (`outputParameterId`)"
  |    |
  |    v
  |    Route returns 400 status
  |    |
  |    v
  |    Test fails with constraint violation
  |
  +-- Success -> Return formula
```

### Delete Formula Flow
```
User Request: DELETE /api/v1/formulas/:id
  |
  v
deleteFormula(id)
  |
  +-- MISSING CHECK: Verify formula exists!
  |
  v
prisma.parameterFormula.delete({ where: { id } })
  |
  +-- P2025: RECORD NOT FOUND!
  |    |
  |    v
  |    ERROR: "Record to delete does not exist"
  |    |
  |    v
  |    Route returns 500 status (should be 404!)
  |    |
  |    v
  |    Test cleanup catches error silently
  |
  +-- Success -> Return void
```

---

## Fixed Error Flow (Robust)

### Create Formula Flow with Pre-Check
```
User Request: POST /api/v1/formulas
  |
  v
createFormula(input)
  |
  +-- VALIDATION 1: Formula expression
  |    v
  |    math.parse() successful? YES -> Continue, NO -> throw Error
  |
  +-- VALIDATION 2: Output parameter exists
  |    v
  |    findUnique(outputParameterId)
  |    Exists? YES -> Continue, NO -> throw Error "Output parameter not found"
  |
  +-- VALIDATION 3: Input parameters exist
  |    v
  |    findMany(dependencies)
  |    All exist? YES -> Continue, NO -> throw Error "Missing parameters"
  |
  +-- VALIDATION 4: Check existing formula [NEW]
  |    v
  |    findUnique({ where: { outputParameterId } })
  |    Exists? YES -> throw Error "Formula already exists", NO -> Continue
  |
  +-- VALIDATION 5: Test cases
  |    v
  |    All pass? YES -> Continue, NO -> throw Error
  |
  v
try {
  prisma.parameterFormula.create({...})
    |
    v
    Success -> Return formula ✓
} catch (error) {
  if (error.code === 'P2002') {
    throw Error "Unique constraint violation" [SAFETY NET]
  }
  if (error.code === 'P2003') {
    throw Error "Foreign key constraint failed"
  }
  throw error
}
```

### Delete Formula Flow with Existence Check
```
User Request: DELETE /api/v1/formulas/:id
  |
  v
deleteFormula(id)
  |
  +-- CHECK 1: Input validation
  |    v
  |    id provided? YES -> Continue, NO -> throw Error
  |
  +-- CHECK 2: Verify formula exists [NEW]
  |    v
  |    findUnique({ where: { id } })
  |    Exists? YES -> Continue, NO -> throw Error "Formula not found"
  |
  v
try {
  prisma.parameterFormula.delete({ where: { id } })
    |
    v
    Success -> return { success: true, message: "..." } ✓
} catch (error) {
  if (error.code === 'P2025') {
    // Race condition: formula deleted by another process
    return { success: true, message: "Already deleted" } ✓
  }
  throw error
}
  |
  v
Route error handler
  |
  +-- if message.includes('not found') -> 404 ✓
  +-- if message.includes('required') -> 400 ✓
  +-- else -> 500 ✓
```

---

## Error Handling Decision Tree

```
                      Database Operation
                            |
                ____________________________
               |                            |
            CREATE                        DELETE
               |                            |
        ____________                  ___________
       |            |                |           |
    CHECK FOR    TRY CREATE      CHECK EXISTS  TRY DELETE
    DUPLICATES       |              |            |
       |             |              |            |
       NO DUP?    SUCCESS?        EXISTS?     SUCCESS?
       |             |              |            |
    YES ->       RETURN          YES ->      RETURN
    CONTINUE     FORMULA ✓        CONTINUE    DELETED ✓
       |                          DELETE       |
       v                              |        v
    CREATE                          SUCCESS?   CATCH
       |                              |        ERROR
       v                           YES ->   P2025?
      SUCCESS?                     DELETE ✓  |
       |                                     v
    YES ->                              RACE CONDITION
    RETURN                              RETURN OK ✓
    FORMULA ✓
       |
    NO ->
    CATCH
    ERROR
       |
    P2002?
       |
    YES ->
    THROW
    ERROR ✓
    (Safety Net)
```

---

## Database Constraint Validation Layers

### Layer 1: Application Level (Current - Incomplete)
```
createFormula()
├── Formula syntax validation ✓
├── Input parameter existence ✓
├── Test case validation ✓
├── Output parameter existence ✗ MISSING
└── Unique constraint check ✗ MISSING <- CAUSES P2002!

deleteFormula()
├── Input validation ✗ MISSING
└── Record existence ✗ MISSING <- CAUSES P2025!
```

### Layer 2: Database Level (Prisma - Safety Net)
```
Prisma create/update/delete operations
├── Unique constraints ✓ (enforced by database)
├── Foreign key constraints ✓ (enforced by database)
├── Required fields ✓ (enforced by database)
└── Error codes ✓ (P2002, P2025, P2003)
```

### Recommended: Both Layers
```
createFormula()
├── Formula syntax validation ✓
├── Input parameter existence ✓
├── Output parameter existence ✓ NEW!
├── Unique constraint check ✓ NEW! <- PREVENTS P2002
├── Test case validation ✓
└── Try-catch with error code handling ✓ NEW! <- SAFETY NET

deleteFormula()
├── Input validation ✓ NEW!
├── Record existence check ✓ NEW! <- PREVENTS P2025
└── Try-catch with error code handling ✓ NEW! <- SAFETY NET
```

---

## Error Path Analysis

### Current: Vulnerable Path
```
Test 1: Create formula
  -> outputParameterId = 'flow-output'
  -> Create successful ✓

Test 1 Cleanup: Delete formula
  -> Delete fails (network/lock) ✗

Test 2: Create formula
  -> outputParameterId = 'flow-output' (reuse same)
  -> Database constraint violation P2002
  -> ERROR: "Unique constraint failed" ✗
  -> Test FAILS ✗
```

### Fixed: Resilient Path
```
Test 1: Create formula
  -> outputParameterId = 'flow-output'
  -> Check: Does formula exist? NO
  -> Create successful ✓

Test 1 Cleanup: Delete formula
  -> Check: Does formula exist? YES
  -> Delete successful ✓

Test 2: Create formula
  -> outputParameterId = 'flow-output' (reuse same)
  -> Check: Does formula exist? NO
  -> Create successful ✓
```

---

## HTTP Status Code Mapping

### Current Behavior (Incorrect)
```
Scenario 1: Create with duplicate outputParameterId
  DB throws P2002
  -> Route catches error
  -> Returns 400 (Wrong! Should be 409)

Scenario 2: Delete non-existent formula
  DB throws P2025
  -> Route catches error
  -> Returns 500 (Wrong! Should be 404)
```

### Fixed Behavior (Correct)
```
Scenario 1: Create with duplicate outputParameterId
  Pre-check finds existing formula
  -> Throw error "Formula already exists"
  -> Route catches error
  -> Returns 409 CONFLICT ✓

Scenario 2: Delete non-existent formula
  Pre-check finds no formula
  -> Throw error "Formula not found"
  -> Route catches error
  -> Returns 404 NOT FOUND ✓

Scenario 3: Validation error
  -> Throw error "Invalid formula"
  -> Route catches error
  -> Returns 400 BAD REQUEST ✓

Scenario 4: Unexpected error
  -> Throw/re-throw error
  -> Route catches error
  -> Returns 500 INTERNAL ERROR ✓
```

---

## Code Coverage Improvement

### Current Coverage
```
createFormula()
├── Happy path (valid input) ✓
├── Invalid syntax ✓
├── Missing parameters ✓
├── Constraint violation (uncovered) ✗
└── Database errors (uncovered) ✗

deleteFormula()
├── Happy path (valid ID) ✓
├── Non-existent ID (uncovered) ✗
└── Database errors (uncovered) ✗
```

### Fixed Coverage
```
createFormula()
├── Happy path (valid input) ✓
├── Invalid syntax ✓
├── Missing parameters ✓
├── Duplicate formula (covered) ✓ NEW!
├── Constraint violation (covered) ✓ NEW!
└── Database errors (covered) ✓ NEW!

deleteFormula()
├── Happy path (valid ID) ✓
├── Non-existent ID (covered) ✓ NEW!
├── Race condition (covered) ✓ NEW!
└── Database errors (covered) ✓ NEW!
```

---

## Test Reliability Timeline

### Before Fixes
```
Test Run 1: All tests pass
Test Run 2: Test 2 fails (constraint violation)
Test Run 3: Tests 1 and 3 fail (state dependent)
Result: Flaky tests, intermittent failures
```

### After Fixes
```
Test Run 1: All tests pass
Test Run 2: All tests pass
Test Run 3: All tests pass
...
Test Run N: All tests pass consistently
Result: Reliable tests, deterministic behavior
```

