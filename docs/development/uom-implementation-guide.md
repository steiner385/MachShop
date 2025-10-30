# UOM System - Technical Implementation Guide

## Developer Quick Start

This guide provides technical implementation details for working with the enhanced Unit of Measure (UOM) system in MachShop MES.

## Core Implementation Pattern

### Service-Level UOM Helpers

All enhanced services include these helper methods:

```typescript
/**
 * Resolve UnitOfMeasure ID from string code
 * Supports both direct ID (if already a CUID) and code lookup
 */
private async resolveUomId(uomCode: string): Promise<string | null> {
  // If it's already a CUID (starts with 'c'), assume it's an ID
  if (uomCode.startsWith('c') && uomCode.length > 20) {
    return uomCode;
  }

  // Look up by code (case-insensitive)
  const uom = await this.prisma.unitOfMeasure.findFirst({
    where: {
      code: { equals: uomCode.toUpperCase(), mode: 'insensitive' },
      isActive: true
    },
    select: { id: true }
  });

  return uom?.id || null;
}

/**
 * Enhanced UOM data preparation for database operations
 * Returns both string and FK for dual-field support
 */
private async prepareUomData(uomCode?: string) {
  if (!uomCode) return { unitOfMeasure: null, unitOfMeasureId: null };

  const unitOfMeasureId = await this.resolveUomId(uomCode);
  return {
    unitOfMeasure: uomCode.toUpperCase(), // Normalize to uppercase
    unitOfMeasureId
  };
}
```

### Database Operation Pattern

When creating/updating records with UOM fields:

```typescript
// Before (string-only)
const material = await prisma.materialLot.create({
  data: {
    // ... other fields
    unitOfMeasure: data.unitOfMeasure
  }
});

// After (enhanced with FK)
const uomData = await this.prepareUomData(data.unitOfMeasure);
const material = await prisma.materialLot.create({
  data: {
    // ... other fields
    unitOfMeasure: uomData.unitOfMeasure || data.unitOfMeasure,
    unitOfMeasureId: uomData.unitOfMeasureId
  }
});
```

## Service-Specific Implementations

### MaterialService

Enhanced methods for material operations:

```typescript
// Material Sublot Creation
async splitLot(data: SplitLotData): Promise<MaterialSublot> {
  const parentLot = await this.getParentLot(data.parentLotId);
  const uomData = await this.prepareUomData(parentLot.unitOfMeasure);

  return this.prisma.materialSublot.create({
    data: {
      // ... other fields
      unitOfMeasure: uomData.unitOfMeasure || parentLot.unitOfMeasure,
      unitOfMeasureId: uomData.unitOfMeasureId
    }
  });
}

// Material Genealogy Creation
async createGenealogyRecord(data: GenealogyData): Promise<MaterialLotGenealogy> {
  const uomData = await this.prepareUomData(data.unitOfMeasure);

  return this.prisma.materialLotGenealogy.create({
    data: {
      ...data,
      unitOfMeasure: uomData.unitOfMeasure || data.unitOfMeasure,
      unitOfMeasureId: uomData.unitOfMeasureId
    }
  });
}
```

### ProductService

Enhanced part and BOM operations:

```typescript
// Part Creation
async createPart(data: CreatePartData): Promise<Part> {
  const uomData = await this.prepareUomData(data.unitOfMeasure);

  return this.prisma.part.create({
    data: {
      ...data,
      unitOfMeasure: uomData.unitOfMeasure || data.unitOfMeasure,
      unitOfMeasureId: uomData.unitOfMeasureId
    }
  });
}

// BOM Item Creation
async addBOMItem(data: BOMItemData): Promise<BOMItem> {
  const uomData = await this.prepareUomData(data.unitOfMeasure);

  return this.prisma.bOMItem.create({
    data: {
      ...data,
      unitOfMeasure: uomData.unitOfMeasure || data.unitOfMeasure,
      unitOfMeasureId: uomData.unitOfMeasureId
    }
  });
}

// BOM Item Update (conditional UOM handling)
async updateBOMItem(bomItemId: string, data: Partial<BOMItemData>) {
  const uomData = data.unitOfMeasure ? await this.prepareUomData(data.unitOfMeasure) : {};

  return this.prisma.bOMItem.update({
    where: { id: bomItemId },
    data: {
      ...data,
      ...(data.unitOfMeasure && {
        unitOfMeasure: uomData.unitOfMeasure || data.unitOfMeasure,
        unitOfMeasureId: uomData.unitOfMeasureId,
      }),
    }
  });
}
```

### OperationService

Enhanced parameter and specification operations:

```typescript
// Operation Parameter Creation
async addParameter(operationId: string, parameterData: ParameterData) {
  const uomData = parameterData.unitOfMeasure
    ? await this.prepareUomData(parameterData.unitOfMeasure)
    : { unitOfMeasure: null, unitOfMeasureId: null };

  return this.prisma.operationParameter.create({
    data: {
      operationId,
      // ... other fields
      unitOfMeasure: uomData.unitOfMeasure || parameterData.unitOfMeasure,
      unitOfMeasureId: uomData.unitOfMeasureId
    }
  });
}

// Material Operation Specification
async addMaterialSpec(operationId: string, specData: MaterialSpecData) {
  const uomData = await this.prepareUomData(specData.unitOfMeasure);

  return this.prisma.materialOperationSpecification.create({
    data: {
      operationId,
      // ... other fields
      unitOfMeasure: uomData.unitOfMeasure || specData.unitOfMeasure,
      unitOfMeasureId: uomData.unitOfMeasureId
    }
  });
}
```

## Database Query Patterns

### Reading Data with UOM Details

```typescript
// Basic query with FK relation
const materialLot = await prisma.materialLot.findUnique({
  where: { id: lotId },
  include: {
    unitOfMeasureRef: true  // Includes UOM details
  }
});

// Response structure:
// {
//   id: "lot123",
//   unitOfMeasure: "KG",
//   unitOfMeasureId: "uom456",
//   unitOfMeasureRef: {
//     id: "uom456",
//     code: "KG",
//     name: "Kilogram",
//     unitType: "MASS",
//     systemOfMeasure: "METRIC"
//   }
// }
```

### Filtering by UOM

```typescript
// Filter by UOM code
const lots = await prisma.materialLot.findMany({
  where: {
    unitOfMeasureRef: {
      code: "KG"
    }
  }
});

// Filter by UOM type
const massBasedLots = await prisma.materialLot.findMany({
  where: {
    unitOfMeasureRef: {
      unitType: "MASS"
    }
  }
});
```

### Aggregation with UOM Grouping

```typescript
// Group by UOM for reporting
const uomSummary = await prisma.materialLot.groupBy({
  by: ['unitOfMeasure'],
  _sum: {
    currentQuantity: true
  },
  _count: {
    id: true
  }
});
```

## API Route Integration

### Request Handling

API routes automatically benefit from enhanced services:

```typescript
// Material genealogy route (already enhanced)
router.post('/api/v1/materials/genealogy', async (req, res) => {
  const genealogy = await materialService.createGenealogyRecord({
    parentLotId: req.body.parentLotId,
    childLotId: req.body.childLotId,
    quantityConsumed: req.body.quantityConsumed,
    unitOfMeasure: req.body.unitOfMeasure || 'EA'  // Automatically enhanced
  });

  res.json(genealogy);
});
```

### Response Enhancement

For enhanced API responses with UOM details:

```typescript
// Enhanced response with UOM details
router.get('/api/v1/materials/lots/:id', async (req, res) => {
  const lot = await prisma.materialLot.findUnique({
    where: { id: req.params.id },
    include: {
      unitOfMeasureRef: true
    }
  });

  // Transform response to include UOM details
  const response = {
    ...lot,
    _unitOfMeasureDetails: lot.unitOfMeasureRef ? {
      name: lot.unitOfMeasureRef.name,
      symbol: lot.unitOfMeasureRef.symbol,
      unitType: lot.unitOfMeasureRef.unitType,
      systemOfMeasure: lot.unitOfMeasureRef.systemOfMeasure
    } : null
  };

  res.json(response);
});
```

## Testing Patterns

### Unit Test Structure

```typescript
describe('UOM Integration', () => {
  it('should resolve UOM code to FK', async () => {
    const result = await service.createEntity({
      unitOfMeasure: 'kg'  // lowercase input
    });

    expect(result.unitOfMeasure).toBe('KG');  // normalized
    expect(result.unitOfMeasureId).toBeDefined();  // FK populated
  });

  it('should handle unknown UOM codes gracefully', async () => {
    const result = await service.createEntity({
      unitOfMeasure: 'UNKNOWN_CODE'
    });

    expect(result.unitOfMeasure).toBe('UNKNOWN_CODE');  // preserved
    expect(result.unitOfMeasureId).toBeNull();  // no FK
  });
});
```

### Test Data Setup

```typescript
// Create test UOM data
const testUom = await prisma.unitOfMeasure.create({
  data: {
    code: 'TEST_KG',
    name: 'Test Kilogram',
    unitType: 'MASS',
    systemOfMeasure: 'METRIC',
    isBaseUnit: true
  }
});
```

## Migration Scripts

### Data Analysis

```typescript
// Analyze existing UOM values
const analysis = await analyzeExistingUomValues();
console.log(`Found ${analysis.uniqueValues.length} unique UOM values`);
console.log(`Mapping coverage: ${analysis.mappingCoverage}%`);
```

### Production Migration

```typescript
// Run production migration
await migrateUomForeignKeys(false); // dryRun = false
```

### Validation

```typescript
// Validate migration results
const validationResults = await validateUomMigration();
console.log(`Migration success rate: ${validationResults.successRate}%`);
```

## Error Handling

### Common Error Patterns

```typescript
// Service-level error handling
try {
  const result = await service.createWithUom(data);
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation (duplicate UOM code)
    throw new ValidationError('UOM code already exists');
  }
  throw error;
}
```

### UOM Validation

```typescript
// Pre-validation helper
async function validateUomCode(code: string): Promise<boolean> {
  const uom = await prisma.unitOfMeasure.findFirst({
    where: {
      code: code.toUpperCase(),
      isActive: true
    }
  });
  return !!uom;
}
```

## Performance Considerations

### Indexing Strategy

All UOM-related queries are optimized with indexes:

```sql
-- Automatically created indexes
CREATE INDEX "units_of_measure_code_idx" ON "units_of_measure"("code");
CREATE INDEX "units_of_measure_unitType_idx" ON "units_of_measure"("unitType");
CREATE INDEX "units_of_measure_isActive_idx" ON "units_of_measure"("isActive");
```

### Query Optimization

```typescript
// Efficient UOM lookup (indexed)
const uom = await prisma.unitOfMeasure.findFirst({
  where: {
    code: 'EA',          // Uses code index
    isActive: true       // Uses isActive index
  },
  select: { id: true }   // Minimal data transfer
});

// Efficient batch UOM resolution
const uoms = await prisma.unitOfMeasure.findMany({
  where: {
    code: { in: ['EA', 'KG', 'LB'] },  // Batch lookup
    isActive: true
  }
});
```

## Best Practices Summary

### DO
- ✅ Use enhanced service methods for UOM operations
- ✅ Validate UOM codes before database operations
- ✅ Include UOM details in API responses when needed
- ✅ Handle both string and FK fields in queries
- ✅ Use case-insensitive UOM code handling
- ✅ Test with unknown UOM codes for robustness

### DON'T
- ❌ Bypass service layer UOM helpers
- ❌ Assume UOM codes are case-sensitive
- ❌ Ignore FK population failures
- ❌ Hard-code UOM IDs in application logic
- ❌ Skip validation of UOM code existence
- ❌ Remove string fields during migration period

## Troubleshooting Guide

### Issue: UOM FK not populated
**Cause**: Unknown UOM code or inactive unit
**Solution**: Check code spelling, validate against active units

### Issue: Case sensitivity problems
**Cause**: Manual database operations bypassing service layer
**Solution**: Use service methods with automatic normalization

### Issue: Performance degradation
**Cause**: Missing indexes or inefficient queries
**Solution**: Verify indexes exist, use select projections

### Issue: Migration failures
**Cause**: FK constraint violations or data inconsistencies
**Solution**: Run analysis script, check data quality

*Technical implementation guide for GitHub Issue #206 - October 30, 2025*