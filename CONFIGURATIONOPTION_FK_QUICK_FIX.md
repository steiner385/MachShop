# ConfigurationOption Foreign Key Violation - Quick Fix Guide

## Problem Summary
The `deleteConfiguration()` method in ProductService does not clean up associated ConfigurationOption records before deletion, causing foreign key constraint violations.

## Quick Identification

### Where it fails:
- **File**: `/home/tony/GitHub/mes/src/services/ProductService.ts`
- **Method**: `deleteConfiguration()` (lines 543-558)
- **API Endpoint**: `DELETE /api/v1/products/configurations/:configurationId`

### Error Message You'll See:
```
Foreign key constraint failed on the field: `configuration_options_configurationId_fkey`
```

## The Fix (Ready to Apply)

### Option 1: Quick Fix (Minimal Changes)

Replace the `deleteConfiguration()` method in ProductService.ts:

```typescript
/**
 * Delete configuration
 */
async deleteConfiguration(configurationId: string) {
  return await this.prisma.$transaction(async (prisma) => {
    // Check if configuration exists first
    const existingConfig = await prisma.productConfiguration.findUnique({
      where: { id: configurationId },
    });

    if (!existingConfig) {
      throw new Error(`Product configuration with ID ${configurationId} not found`);
    }

    // First delete all configuration options (CRITICAL: Must happen before deleting config)
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

### Key Changes:
1. Wrapped in `prisma.$transaction()` for atomicity
2. Added `deleteMany()` for ConfigurationOption records **before** deleting ProductConfiguration
3. Prevents foreign key violations

## Files to Modify

### 1. ProductService.ts
- **What**: Replace `deleteConfiguration()` method
- **Lines**: 543-558
- **Change**: Add ConfigurationOption cleanup

### 2. ProductService.test.ts (Optional but Recommended)
- **What**: Add new test case for delete with options
- **After line**: 837 (after existing deleteConfiguration test)

```typescript
it('should delete configuration and its options', async () => {
  mockPrisma.productConfiguration.findUnique.mockResolvedValue({
    id: 'config-1',
  });
  mockPrisma.configurationOption.deleteMany.mockResolvedValue({ count: 2 });
  mockPrisma.productConfiguration.delete.mockResolvedValue({ id: 'config-1' });

  const result = await productService.deleteConfiguration('config-1');

  expect(mockPrisma.configurationOption.deleteMany).toHaveBeenCalledWith({
    where: { configurationId: 'config-1' },
  });
  expect(mockPrisma.productConfiguration.delete).toHaveBeenCalledWith({
    where: { id: 'config-1' },
  });
  expect(result.message).toBe('Configuration deleted');
});
```

## Testing the Fix

### Unit Tests
```bash
npm test -- ProductService.test.ts
```

### Integration Tests
```bash
npm test -- --integration
```

### Manual API Test
```bash
# Create a configuration
curl -X POST http://localhost:3000/api/v1/products/:partId/configurations \
  -H "Content-Type: application/json" \
  -d '{"configurationName":"Test","configurationType":"FEATURE"}'

# Add an option to the configuration
curl -X POST http://localhost:3000/api/v1/products/configurations/:configurationId/options \
  -H "Content-Type: application/json" \
  -d '{"optionName":"Option1","optionCode":"OPT-1"}'

# Delete the configuration (should work without foreign key error)
curl -X DELETE http://localhost:3000/api/v1/products/configurations/:configurationId
```

## Why This Fix Works

1. **Respects Foreign Keys**: Explicitly deletes child records before parent
2. **Transaction Safety**: Uses `$transaction()` to ensure all-or-nothing execution
3. **Prevents Orphaned Records**: No ConfigurationOption records left without parent
4. **Consistent Pattern**: Matches the correct pattern used in `deletePart()` method

## Related Pattern

This fix follows the same pattern as `deletePart()` (lines 305-311):

```typescript
// CORRECT PATTERN - used in deletePart()
for (const config of existingPart.configurations) {
  await prisma.configurationOption.deleteMany({
    where: { configurationId: config.id },
  });
}

await prisma.productConfiguration.updateMany({
  where: { partId: id, isActive: true },
  data: { isActive: false },
});
```

The new `deleteConfiguration()` applies the same principle:
1. Delete children (ConfigurationOption) first
2. Then delete parent (ProductConfiguration)

## Common Issues

### "Still getting foreign key errors"
- Ensure you're running the code with the fix applied
- Clear any browser cache if testing API
- Restart the server after making changes

### "My test is still failing"
- Unit tests might not catch this because Prisma is mocked
- Run integration tests or E2E tests for real database constraints
- Check that `configurationId` parameter is passed correctly

### "Performance concerns with large datasets"
- The `deleteMany()` is optimized by Prisma
- For very large datasets, consider batch deletion
- Current approach is safe and atomic

## Verification Checklist

- [ ] Fix applied to `deleteConfiguration()` method
- [ ] Transaction wrapper added
- [ ] ConfigurationOption.deleteMany() called first
- [ ] Unit tests updated/passing
- [ ] Integration tests passing
- [ ] Manual API test successful
- [ ] No regression in other configuration operations

## Database Notes

The schema defines CASCADE delete:
```prisma
configuration ProductConfiguration @relation(
  fields: [configurationId], 
  references: [id], 
  onDelete: Cascade
)
```

While cascade is configured at DB level, application-level cleanup is more reliable because:
- Ensures atomicity with transactions
- Provides better error handling
- Gives visibility to the cleanup operation
- Works consistently across database engines

## Related Issues

This issue is similar to other foreign key violations in the codebase. The fix pattern should be applied to any deletion that has child records:

1. Wrap in transaction
2. Delete/update children first
3. Then delete/update parent
4. Return result

## References

- Full Investigation: `/home/tony/GitHub/mes/CONFIGURATIONOPTION_FK_INVESTIGATION.md`
- ProductService: `/home/tony/GitHub/mes/src/services/ProductService.ts`
- Routes: `/home/tony/GitHub/mes/src/routes/products.ts`
- Schema: `/home/tony/GitHub/mes/prisma/schema.prisma` (lines 1586-1617)

