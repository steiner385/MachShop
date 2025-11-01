# UUID Strategy Guide

**Status:** Implementation Guide
**Version:** 1.0
**Date:** October 31, 2025
**Audience:** Developers, Architects, System Integrators

---

## Overview

This guide provides practical implementation guidance for the MachShop MES hybrid identifier strategy. It explains when to use CUID, UUID, and String identifiers, and how to implement them correctly.

For architectural rationale, see [ADR-012: UUID Strategy for Model-Based Enterprise (MBE) Compliance](adr/ADR-012-UUID-Strategy-MBE-Compliance.md).

## Quick Reference

### Which Identifier Should I Use?

| Scenario | Identifier | Example | Notes |
|----------|-----------|---------|-------|
| **Internal database operations** | CUID | `clp4x9z0k000008kk2j3k3k3k` | Always the primary key, optimized for queries |
| **External API responses** | UUID | `550e8400-e29b-41d4-a716-446655440000` | Standards-compliant, globally unique |
| **Partner integrations** | UUID | ERP export, QIF files | Stable reference for long-term archival |
| **Business identifiers** | String | Part Number, Serial, SKU | Human-readable, business-meaningful |
| **CAD/PLM systems** | UUID | STEP AP242 reference | ISO standard for design data |
| **Archived records** | UUID | Historical data export | Ensures future system can reference records |

## Implementation Patterns

### Pattern 1: Simple Entities (No External Integration)

For entities that only serve internal operations with no external integrations:

```prisma
model User {
  // Primary key - CUID (internal optimization)
  id String @id @default(cuid())

  // Business identifier - unique, human-readable
  username String @unique
  email String @unique

  // ... other fields

  @@index([username])
  @@index([email])
}

model Site {
  id String @id @default(cuid())
  siteName String @unique
  siteCode String @unique

  @@index([siteName])
  @@index([siteCode])
}
```

**When to use:** Internal-only entities, operational tables without external references.

### Pattern 2: Manufacturing Entities (MBE Compliance)

For entities that need external integration, traceability, or standards compliance:

```prisma
model Part {
  // Primary key - CUID (internal optimization)
  id String @id @default(cuid())

  // External ID - UUID (standards compliance, archival)
  persistentUuid String @unique @default(uuid())

  // Business identifier - unique, human-readable
  partNumber String @unique

  // External system references
  stepAp242Uuid String?          // CAD/PLM identifier
  erpPartId String?              // ERP system identifier

  // Standard fields
  description String?
  materialType String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  serializedParts SerializedPart[]
  operations Operation[]

  @@index([persistentUuid])
  @@index([partNumber])
  @@index([stepAp242Uuid])
}

model SerializedPart {
  id String @id @default(cuid())
  persistentUuid String @unique @default(uuid())
  serialNumber String @unique

  partId String
  part Part @relation(fields: [partId], references: [id])

  // Traceability
  manufacturingDate DateTime?
  lotNumber String?
  status String @default("ACTIVE")

  @@unique([serialNumber, partId])
  @@index([persistentUuid])
  @@index([serialNumber])
  @@index([partId])
}
```

**When to use:** Manufacturing data, integration touchpoints, compliance-required entities.

### Pattern 3: Integration Entities (Multiple Systems)

For entities that reference multiple external systems:

```prisma
model ECORequest {
  // Primary key - CUID (internal optimization)
  id String @id @default(cuid())

  // External ID - UUID (standards compliance)
  persistentUuid String @unique @default(uuid())

  // External system references
  erpEcoNumber String?           // ERP system ID
  pdmEcoId String?               // PLM/PDM system ID

  // Standard fields
  title String
  description String?
  status String @default("DRAFT")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  affectedParts EcoPart[]
  approvals EcoApproval[]

  @@index([persistentUuid])
  @@index([erpEcoNumber])
  @@index([pdmEcoId])
}
```

**When to use:** Integration points with multiple external systems, records that need stable global references.

## Database Schema Implementation

### Adding UUID to Existing Tables

For existing tables that need UUID added:

```sql
-- Step 1: Add nullable UUID column
ALTER TABLE parts
ADD COLUMN persistent_uuid UUID;

-- Step 2: Generate UUIDs for existing records
UPDATE parts
SET persistent_uuid = gen_random_uuid()
WHERE persistent_uuid IS NULL;

-- Step 3: Verify uniqueness (optional but recommended)
SELECT COUNT(*), COUNT(DISTINCT persistent_uuid) FROM parts;

-- Step 4: Make UUID non-nullable and unique
ALTER TABLE parts
ALTER COLUMN persistent_uuid SET NOT NULL;

ALTER TABLE parts
ADD CONSTRAINT parts_persistent_uuid_unique UNIQUE (persistent_uuid);

-- Step 5: Create index for performance
CREATE UNIQUE INDEX idx_parts_persistent_uuid
ON parts(persistent_uuid);
```

### Prisma Migration File

```typescript
// prisma/migrations/20251031000000_add_uuid_to_part/migration.sql

-- Add UUID column
ALTER TABLE "Part" ADD COLUMN "persistentUuid" TEXT;

-- Generate UUIDs for existing records
UPDATE "Part" SET "persistentUuid" = gen_random_uuid() WHERE "persistentUuid" IS NULL;

-- Make non-nullable and unique
ALTER TABLE "Part" ALTER COLUMN "persistentUuid" SET NOT NULL;
ALTER TABLE "Part" ADD CONSTRAINT "Part_persistentUuid_key" UNIQUE ("persistentUuid");

-- Create index
CREATE UNIQUE INDEX "Part_persistentUuid_idx" ON "Part"("persistentUuid");
```

Then update the Prisma schema:

```prisma
model Part {
  id String @id @default(cuid())
  persistentUuid String @unique @default(uuid())
  // ... rest of fields
  @@index([persistentUuid])
}
```

## API Implementation

### Flexible Endpoint (Auto-Detection)

Support all identifier types in a single endpoint:

```typescript
import { Request, Response } from 'express';
import { isUUID, isCUID } from 'class-validator';
import { prisma } from '@/lib/prisma';

router.get('/api/parts/:identifier', async (req: Request, res: Response) => {
  const { identifier } = req.params;

  let part;

  // Try UUID first (most specific)
  if (isUUID(identifier)) {
    part = await prisma.part.findUnique({
      where: { persistentUuid: identifier }
    });
  }
  // Try CUID (internal ID)
  else if (isCUID(identifier)) {
    part = await prisma.part.findUnique({
      where: { id: identifier }
    });
  }
  // Fall back to business ID
  else {
    part = await prisma.part.findUnique({
      where: { partNumber: identifier }
    });
  }

  if (!part) {
    return res.status(404).json({
      error: 'Part not found',
      providedIdentifier: identifier
    });
  }

  res.json({ data: part });
});
```

### UUID-Specific Endpoint (External APIs)

For partner integrations, provide explicit UUID endpoint:

```typescript
router.get('/api/v1/external/parts/:uuid', async (req: Request, res: Response) => {
  const { uuid } = req.params;

  // Validate UUID format
  if (!isUUID(uuid)) {
    return res.status(400).json({
      error: 'Invalid UUID format',
      example: '550e8400-e29b-41d4-a716-446655440000'
    });
  }

  const part = await prisma.part.findUnique({
    where: { persistentUuid: uuid },
    select: {
      id: false,  // Don't expose internal ID to external APIs
      persistentUuid: true,
      partNumber: true,
      description: true,
      stepAp242Uuid: true,
      erpPartId: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!part) {
    return res.status(404).json({
      error: 'Part not found',
      uuid: uuid
    });
  }

  res.json({
    data: part,
    metadata: {
      requestedUuid: uuid,
      timestamp: new Date().toISOString()
    }
  });
});
```

### Internal API Endpoint (CUID)

For internal application usage, use CUID for performance:

```typescript
router.get('/api/parts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isCUID(id)) {
    return res.status(400).json({
      error: 'Invalid internal ID format'
    });
  }

  const part = await prisma.part.findUnique({
    where: { id },
    include: {
      serializedParts: true,
      operations: true
    }
  });

  if (!part) {
    return res.status(404).json({ error: 'Part not found' });
  }

  res.json({ data: part });
});
```

### Response Format Standards

**For internal APIs (use CUID):**
```json
{
  "data": {
    "id": "clp4x9z0k000008kk2j3k3k3k",
    "partNumber": "PART-2024-001",
    "description": "Precision bearing assembly",
    "status": "ACTIVE"
  }
}
```

**For external APIs (use UUID):**
```json
{
  "data": {
    "persistentUuid": "550e8400-e29b-41d4-a716-446655440000",
    "partNumber": "PART-2024-001",
    "description": "Precision bearing assembly",
    "status": "ACTIVE",
    "stepAp242Uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "erpPartId": "ERP-PART-12345"
  },
  "metadata": {
    "requestedUuid": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-10-31T10:30:00Z"
  }
}
```

## Integration Scenarios

### ERP Integration (Outbound Sync)

When syncing parts to an ERP system, always use UUID:

```typescript
async function syncPartToERP(partId: string): Promise<void> {
  const part = await prisma.part.findUnique({
    where: { id: partId }
  });

  if (!part) {
    throw new Error(`Part not found: ${partId}`);
  }

  // Send to ERP using UUID as stable reference
  const erpPayload = {
    id: part.persistentUuid,  // UUID for long-term stability
    partNumber: part.partNumber,
    description: part.description,
    materialType: part.materialType,
    status: part.status,
    lastSync: new Date().toISOString()
  };

  const response = await erpClient.createOrUpdate('/parts', erpPayload);

  // Store the ERP ID for future lookups
  if (response.erpPartId) {
    await prisma.part.update({
      where: { id: partId },
      data: { erpPartId: response.erpPartId }
    });
  }
}
```

### QIF Export (Quality Information Framework)

QIF files should use UUID for all references:

```typescript
async function exportToQIF(partId: string): Promise<QifDocument> {
  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: {
      operations: true,
      qualityPlans: true
    }
  });

  return {
    qifVersion: '3.0',
    measurementPlan: {
      id: part.persistentUuid,  // UUID per QIF standard
      name: `${part.partNumber} - QIF Plan`,
      characteristics: part.qualityPlans.map(plan => ({
        id: plan.persistentUuid,  // UUID per QIF standard
        name: plan.characteristicName,
        nominalValue: plan.nominalValue,
        tolerance: plan.tolerance
      }))
    }
  };
}
```

### STEP AP242 Integration (CAD/PLM)

Reference CAD models using STEP AP242 UUID:

```typescript
async function linkToCADModel(partId: string, stepUuid: string): Promise<void> {
  // Validate that STEP UUID is properly formatted
  if (!isUUID(stepUuid)) {
    throw new Error(`Invalid STEP UUID format: ${stepUuid}`);
  }

  await prisma.part.update({
    where: { id: partId },
    data: {
      stepAp242Uuid: stepUuid  // Store CAD system reference
    }
  });

  // Log for audit trail
  console.log(`Part ${partId} linked to CAD model ${stepUuid}`);
}
```

## Performance Considerations

### Indexing Strategy

Always index UUID columns for integration entities:

```prisma
model Part {
  id String @id @default(cuid())
  persistentUuid String @unique @default(uuid())
  partNumber String @unique
  stepAp242Uuid String?
  erpPartId String?

  // Indices for query performance
  @@index([persistentUuid])
  @@index([partNumber])
  @@index([stepAp242Uuid])
  @@index([erpPartId])
}
```

### Query Performance Comparison

| Query Type | Performance | Reasoning |
|-----------|-------------|-----------|
| `findUnique({ where: { id } })` | ⚡ Excellent | Primary key, clustered index |
| `findUnique({ where: { persistentUuid } })` | ⚡ Excellent | Unique index on UUID column |
| `findUnique({ where: { partNumber } })` | ⚡ Excellent | Unique index on business ID |
| `findMany({ where: { stepAp242Uuid } })` | ⚡ Good | Secondary index, typically few results |
| `findMany({ where: { erpPartId } })` | ⚡ Good | Secondary index, typically few results |

### Avoiding N+1 Queries with UUIDs

When querying external systems by UUID, always use batching:

```typescript
// ❌ AVOID: N+1 query problem
const uuids = ['uuid-1', 'uuid-2', 'uuid-3'];
const parts = await Promise.all(
  uuids.map(uuid => prisma.part.findUnique({ where: { persistentUuid: uuid } }))
);

// ✅ GOOD: Batch query
const parts = await prisma.part.findMany({
  where: {
    persistentUuid: { in: uuids }
  }
});
```

## Migration Checklist

### Before Adding UUID to Entity

- [ ] Is this entity used in external integrations? (If yes, add UUID)
- [ ] Will this entity need to be archived long-term? (If yes, add UUID)
- [ ] Are external partners requesting stable identifiers? (If yes, add UUID)
- [ ] Does this entity need to reference external systems? (If yes, add UUID)
- [ ] Is backward compatibility required? (Ensure CUID remains as primary key)

### When Implementing UUID

- [ ] Create Prisma migration adding `persistentUuid` field
- [ ] Add `@unique @default(uuid())` to field definition
- [ ] Create index on UUID field: `@@index([persistentUuid])`
- [ ] Generate UUIDs for existing records in migration
- [ ] Verify no UUID collisions: `SELECT COUNT(*), COUNT(DISTINCT persistent_uuid) FROM table_name`
- [ ] Update API endpoints to support UUID lookup
- [ ] Add UUID to external API responses
- [ ] Document UUID usage in API documentation
- [ ] Update integration partners with new UUID endpoints
- [ ] Test with all three identifier types (CUID, UUID, business ID)

## Common Pitfalls & Solutions

### Pitfall 1: Exposing Internal CUID in External APIs

**Problem:** Partners see internal CUID, creating coupling to internal implementation.

**Solution:**
```typescript
// ❌ WRONG
res.json({ data: part });  // Exposes 'id' (CUID)

// ✅ CORRECT
res.json({
  data: {
    persistentUuid: part.persistentUuid,  // Use UUID
    partNumber: part.partNumber,
    // ... other fields
  }
});
```

### Pitfall 2: Losing UUID When Re-exporting Data

**Problem:** UUID not included in exports, making records un-referenceable.

**Solution:**
```typescript
// ✅ CORRECT: Always include UUID in exports
async function exportParts(): Promise<void> {
  const parts = await prisma.part.findMany();

  const csv = parts.map(part => ({
    persistentUuid: part.persistentUuid,  // Always include
    partNumber: part.partNumber,
    description: part.description,
    status: part.status
  }));

  // Save to file with UUID
  writeCSV('parts_export.csv', csv);
}
```

### Pitfall 3: Not Indexing UUID Columns

**Problem:** Slow UUID-based lookups in external integrations.

**Solution:**
```prisma
// ✅ CORRECT: Always index UUID columns
model Part {
  persistentUuid String @unique @default(uuid())
  stepAp242Uuid String?
  erpPartId String?

  @@index([persistentUuid])
  @@index([stepAp242Uuid])
  @@index([erpPartId])
}
```

### Pitfall 4: Changing UUID Values

**Problem:** UUID values must be immutable for traceability and archival.

**Solution:**
```typescript
// ❌ WRONG: Never update UUID
await prisma.part.update({
  where: { id: partId },
  data: { persistentUuid: newUuid }  // DON'T DO THIS
});

// ✅ CORRECT: UUID is write-once, read-many
// Only set UUID on creation via @default(uuid())
```

## Testing UUID Implementation

### Unit Tests

```typescript
describe('UUID Implementation', () => {
  it('should generate UUID on creation', async () => {
    const part = await prisma.part.create({
      data: {
        partNumber: 'TEST-001',
        description: 'Test part'
      }
    });

    expect(part.persistentUuid).toBeDefined();
    expect(isUUID(part.persistentUuid)).toBe(true);
  });

  it('should find part by UUID', async () => {
    const part = await prisma.part.create({
      data: {
        partNumber: 'TEST-002',
        description: 'Test part'
      }
    });

    const found = await prisma.part.findUnique({
      where: { persistentUuid: part.persistentUuid }
    });

    expect(found).toBeDefined();
    expect(found?.partNumber).toBe('TEST-002');
  });

  it('should maintain UUID immutability', async () => {
    const part = await prisma.part.create({
      data: {
        partNumber: 'TEST-003',
        description: 'Test part'
      }
    });

    const originalUuid = part.persistentUuid;

    // UUID should not change on update
    const updated = await prisma.part.update({
      where: { id: part.id },
      data: { description: 'Updated description' }
    });

    expect(updated.persistentUuid).toBe(originalUuid);
  });
});
```

### Integration Tests

```typescript
describe('External API Integration', () => {
  it('should accept part by UUID', async () => {
    const part = await prisma.part.create({
      data: {
        partNumber: 'TEST-004',
        description: 'Test part'
      }
    });

    const response = await request(app)
      .get(`/api/v1/external/parts/${part.persistentUuid}`)
      .expect(200);

    expect(response.body.data.persistentUuid).toBe(part.persistentUuid);
    expect(response.body.data.id).toBeUndefined();  // CUID not exposed
  });

  it('should support flexible endpoint with UUID', async () => {
    const part = await prisma.part.create({
      data: {
        partNumber: 'TEST-005',
        description: 'Test part'
      }
    });

    const response = await request(app)
      .get(`/api/parts/${part.persistentUuid}`)
      .expect(200);

    expect(response.body.data.partNumber).toBe('TEST-005');
  });
});
```

## FAQ

**Q: Should I expose CUID in external APIs?**
A: No. Always use UUID for external APIs to decouple partners from internal implementation.

**Q: What if a partner is already using CUID?**
A: Provide a migration period. Keep supporting CUID lookup internally, but push them to migrate to UUID.

**Q: Can I change a UUID?**
A: No. UUIDs are immutable by design. If there's an error, create a new record with correct UUID.

**Q: What's the performance difference between CUID and UUID lookups?**
A: Negligible on indexed columns. Both have O(1) lookup complexity with proper indexing.

**Q: Do I need to migrate all entities to UUID?**
A: No. Only entities involved in external integrations, compliance, or archival need UUID.

---

## Related Documentation

- [ADR-012: UUID Strategy for Model-Based Enterprise (MBE) Compliance](adr/ADR-012-UUID-Strategy-MBE-Compliance.md)
- [UUID Migration Plan](migrations/UUID_MIGRATION.md)
- [Developer Guide: UUIDs](DEVELOPER_GUIDE_UUIDS.md)
- [Integration Guide: UUIDs for Partners](integration/UUID_INTEGRATION_GUIDE.md)
