# ConfigurationOption Foreign Key Constraint Violation Investigation

## Summary
Investigation of ConfigurationOption foreign key constraint violations in the MES system. The core issue is that the `deleteConfiguration()` method in ProductService does NOT clean up associated ConfigurationOption records before deletion, yet the database schema has configured a CASCADE delete rule.

## Key Findings

### 1. Schema Definition Analysis

**File**: `/home/tony/GitHub/mes/prisma/schema.prisma` (lines 1586-1617)

#### ProductConfiguration Model
```prisma
model ProductConfiguration {
  id              String  @id @default(cuid())
  partId          String
  configurationName String
  configurationType ConfigurationType
  
  // Relations
  part    Part                  @relation(fields: [partId], references: [id], onDelete: Cascade)
  options ConfigurationOption[]  // One-to-many relationship
  
  @@map("product_configurations")
}
```

#### ConfigurationOption Model
```prisma
model ConfigurationOption {
  id              String  @id @default(cuid())
  configurationId String  // Foreign key
  optionName      String
  
  // Relations
  configuration ProductConfiguration @relation(fields: [configurationId], references: [id], onDelete: Cascade)
  
  @@index([configurationId])
  @@map("configuration_options")
}
```

**Key Point**: ConfigurationOption has a CASCADE delete rule on configurationId (line 1613). When a ProductConfiguration is deleted, all associated ConfigurationOptions SHOULD be automatically deleted by the database.

---

### 2. Problem: Missing Cleanup in deleteConfiguration()

**File**: `/home/tony/GitHub/mes/src/services/ProductService.ts` (lines 543-558)

```typescript
/**
 * Delete configuration
 */
async deleteConfiguration(configurationId: string) {
  // Check if configuration exists first
  const existingConfig = await this.prisma.productConfiguration.findUnique({
    where: { id: configurationId },
  });

  if (!existingConfig) {
    throw new Error(`Product configuration with ID ${configurationId} not found`);
  }

  // ISSUE: Directly deletes ProductConfiguration without cleaning up ConfigurationOption records first
  await this.prisma.productConfiguration.delete({
    where: { id: configurationId },
  });

  return { message: 'Configuration deleted', id: configurationId };
}
```

**The Issue**: 
- The method directly deletes ProductConfiguration without first deleting ConfigurationOption records
- Although the schema has CASCADE delete rule, this may fail or cause constraint violations depending on:
  - Prisma's handling of foreign key constraints
  - Database-level foreign key enforcement
  - Transaction isolation levels

---

### 3. Correct Pattern: How deletePart() Handles This

**File**: `/home/tony/GitHub/mes/src/services/ProductService.ts` (lines 258-339)

The `deletePart()` method implements the CORRECT pattern:

```typescript
async deletePart(id: string, hardDelete: boolean = false) {
  return await this.prisma.$transaction(async (prisma) => {
    // ... validation code ...

    if (hardDelete) {
      // Hard delete with proper cleanup
      // Hard delete (cascade will handle related records)
      await prisma.part.delete({
        where: { id },
      });
    } else {
      // Soft delete with explicit cleanup
      
      // Deactivate all configurations for this part
      if (existingPart.configurations.length > 0) {
        // First delete all configuration options for active configurations
        // (ConfigurationOption has no isActive field, so we delete them)
        for (const config of existingPart.configurations) {
          await prisma.configurationOption.deleteMany({
            where: { configurationId: config.id },
          });
        }

        // Then deactivate the configurations
        await prisma.productConfiguration.updateMany({
          where: { partId: id, isActive: true },
          data: { isActive: false },
        });
      }
      
      // ... other cleanup ...
    }
  });
}
```

**Why This Works**:
1. Uses a transaction to ensure atomicity
2. **Explicitly deletes ConfigurationOption records first** via `deleteMany()`
3. Then deletes/updates the parent Configuration
4. Prevents constraint violations by respecting the foreign key relationship

---

### 4. Configuration Deletion Call Sites

All usages of `deleteConfiguration()` are in:

**File**: `/home/tony/GitHub/mes/src/routes/products.ts`

```typescript
/**
 * DELETE /api/v1/products/configurations/:configurationId
 */
router.delete('/configurations/:configurationId', async (req: Request, res: Response) => {
  const { configurationId } = req.params;
  const result = await ProductService.deleteConfiguration(configurationId);
  res.json(result);
});
```

This endpoint directly exposes the flawed `deleteConfiguration()` method.

---

### 5. Related Code Patterns

#### addConfigurationOption() - Correctly Validates Parent Exists
**File**: `/home/tony/GitHub/mes/src/services/ProductService.ts` (lines 563-596)

```typescript
async addConfigurationOption(configurationId: string, data: {...}) {
  // Check if configuration exists first
  const existingConfiguration = await this.prisma.productConfiguration.findUnique({
    where: { id: configurationId },
  });

  if (!existingConfiguration) {
    throw new Error(`Product configuration with ID ${configurationId} not found`);
  }

  const option = await this.prisma.configurationOption.create({
    data: {
      configurationId,
      ...data,
      addedPartIds: data.addedPartIds || [],
      removedPartIds: data.removedPartIds || [],
    },
  });

  return option;
}
```

**Lesson**: This validates parent exists before creating the child record. The delete operation should do the reverse.

---

### 6. Test Coverage Analysis

**File**: `/home/tony/GitHub/mes/src/tests/services/ProductService.test.ts` (lines 825-837)

```typescript
describe('deleteConfiguration', () => {
  it('should delete configuration', async () => {
    mockPrisma.productConfiguration.delete.mockResolvedValue({ id: 'config-1' });

    const result = await productService.deleteConfiguration('config-1');

    expect(mockPrisma.productConfiguration.delete).toHaveBeenCalledWith({
      where: { id: 'config-1' },
    });
    expect(result.message).toBe('Configuration deleted');
    expect(result.id).toBe('config-1');
  });
});
```

**Issues with Current Test**:
1. Uses mocked Prisma - doesn't test actual database constraints
2. No test for ConfigurationOption cleanup
3. No test for the DELETE...CASCADE behavior
4. No test with actual child records present

**Missing Test Case**:
```typescript
it('should delete configuration with options', async () => {
  // Create config with options
  // Delete config
  // Verify all options are deleted
});
```

---

### 7. Cascade Delete Rule Verification

The schema correctly defines CASCADE delete:
```prisma
configuration ProductConfiguration @relation(
  fields: [configurationId], 
  references: [id], 
  onDelete: Cascade  // <-- This means child records should be deleted automatically
)
```

**But**: Relying solely on database cascade can be problematic because:
1. Prisma may not properly handle cascade in all scenarios
2. If the database transaction is interrupted, cascade may not fire
3. Explicit cleanup gives better visibility and control
4. Application-level cleanup is more reliable

---

## Root Cause Analysis

The violation occurs because:

1. **deleteConfiguration()** doesn't clean up child records (ConfigurationOption)
2. When trying to delete ProductConfiguration with foreign key dependency:
   - If cascade is enforced at database level: depends on DB configuration
   - If cascade is not enforced or Prisma doesn't wait for it: violation occurs
3. Test coverage gaps mean this issue wasn't caught

---

## Affected Code Paths

1. **Direct API Call**: `DELETE /api/v1/products/configurations/:configurationId`
2. **Via Configuration Deletion Route**: Calls `ProductService.deleteConfiguration()`
3. **Potential Indirect Paths**: Any code that calls `deleteConfiguration()`

---

## Comparison with Soft Delete Pattern

In `deletePart()`, the soft delete pattern is used:
- ConfigurationOption records are explicitly deleted (hard delete)
- ProductConfiguration records are deactivated (soft delete)
- This avoids constraint violations entirely

---

## Recommendations

### Fix 1: Add Explicit Cleanup to deleteConfiguration()

```typescript
async deleteConfiguration(configurationId: string) {
  return await this.prisma.$transaction(async (prisma) => {
    // Check if configuration exists first
    const existingConfig = await prisma.productConfiguration.findUnique({
      where: { id: configurationId },
    });

    if (!existingConfig) {
      throw new Error(`Product configuration with ID ${configurationId} not found`);
    }

    // First delete all configuration options
    await prisma.configurationOption.deleteMany({
      where: { configurationId },
    });

    // Then delete the configuration
    await prisma.productConfiguration.delete({
      where: { id: configurationId },
    });

    return { message: 'Configuration deleted', id: configurationId };
  });
}
```

### Fix 2: Add Comprehensive Tests

```typescript
it('should delete configuration with options', async () => {
  // Setup: Create configuration with options
  const config = await productService.addConfiguration('part-1', {
    configurationName: 'Test Config',
    configurationType: 'FEATURE',
  });

  const option = await productService.addConfigurationOption(config.id, {
    optionName: 'Option 1',
    optionCode: 'OPT-1',
  });

  // Verify option exists
  const foundOption = await productService.getConfigurationOption(option.id);
  expect(foundOption).toBeDefined();

  // Delete configuration
  const result = await productService.deleteConfiguration(config.id);
  expect(result.message).toBe('Configuration deleted');

  // Verify option was deleted
  const deletedOption = await productService.getConfigurationOption(option.id);
  expect(deletedOption).toBeNull();
});
```

### Fix 3: Update Routes for Error Handling

```typescript
router.delete('/configurations/:configurationId', async (req: Request, res: Response) => {
  try {
    const { configurationId } = req.params;
    const result = await ProductService.deleteConfiguration(configurationId);
    res.json(result);
  } catch (error: any) {
    if (error.message.includes('foreign key')) {
      res.status(400).json({ 
        error: 'Cannot delete configuration with related options',
        details: error.message 
      });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});
```

---

## Files Requiring Changes

1. **`/home/tony/GitHub/mes/src/services/ProductService.ts`**
   - Update `deleteConfiguration()` method (line 543)
   - Add transaction wrapper
   - Add explicit ConfigurationOption cleanup

2. **`/home/tony/GitHub/mes/src/tests/services/ProductService.test.ts`**
   - Add test for deleteConfiguration with options
   - Add test for cascade behavior

3. **`/home/tony/GitHub/mes/src/routes/products.ts`** (Optional)
   - Improve error handling for foreign key violations

---

## Summary Table

| Issue | Details | Impact | Solution |
|-------|---------|--------|----------|
| No cleanup in deleteConfiguration() | Directly deletes config without removing options | Foreign key constraint violation | Add explicit ConfigurationOption.deleteMany() call |
| Insufficient test coverage | Tests don't verify cascade behavior | Issues not caught in testing | Add integration tests with real DB constraints |
| Missing transaction wrapper | No atomicity guarantee | Partial deletes possible | Use prisma.$transaction() |
| No error handling | Generic errors | Poor user feedback | Add specific foreign key violation handling |

