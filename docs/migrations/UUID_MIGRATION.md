# UUID Migration Plan

**Status:** Implementation Plan
**Version:** 1.0
**Date:** October 31, 2025
**Timeline:** 7 weeks
**Audience:** DevOps, Database Administrators, Backend Developers

---

## Executive Summary

This document outlines the phased approach to implementing persistent UUIDs across MachShop MES entities over a 7-week period. The migration maintains backward compatibility, requires zero downtime, and enables standards compliance for external integrations.

**Key Principles:**
- ✅ Backward compatible (CUID primary keys unchanged)
- ✅ Zero downtime migration
- ✅ Phased rollout (can stop/pause if needed)
- ✅ Parallel support for old and new identifiers
- ✅ Full rollback capability at each phase
- ✅ Comprehensive testing at each step

## Timeline Overview

```
Week 1-2: Infrastructure Preparation
├─ Add UUID columns to Phase 1 entities
├─ Generate UUIDs for existing records
├─ Create indices for performance
└─ Run verification tests

Week 3-4: API & Internal Support
├─ Implement UUID-based API endpoints
├─ Add identifier auto-detection logic
├─ Update internal services to use UUID
├─ Backward compatibility verification

Week 5-6: Integration Updates
├─ QIF export includes UUID
├─ ERP integration uses UUID
├─ STEP AP242 integration uses UUID
├─ Partner API endpoints published

Week 7: Documentation & Training
├─ API documentation updates
├─ Developer training materials
├─ Partner onboarding guide
├─ Production launch preparation
```

## Phase 1: Infrastructure (Weeks 1-2)

### Objectives
- Add UUID columns to Phase 1 entities
- Generate UUIDs for all existing records
- Create indices for optimal query performance
- Verify data integrity

### Phase 1 Entities (Priority)

These entities get UUID first due to compliance/integration needs:

1. **Part** - CAD/PLM integration (STEP AP242)
2. **SerializedPart** - Traceability, archival (LOTAR)
3. **MaterialLot** - Manufacturing genealogy
4. **WorkOrder** - ERP integration
5. **QIFMeasurementPlan** - QIF standard (ISO 13370)
6. **QIFCharacteristic** - QIF measurement
7. **QIFMeasurementResult** - QIF compliance
8. **ECORequest** - Engineering Change Order, ERP integration

### Implementation Steps

#### Step 1.1: Create Prisma Migration (Day 1)

```prisma
# prisma/schema.prisma

model Part {
  id String @id @default(cuid())
  persistentUuid String @unique @default(uuid())  // NEW
  partNumber String @unique
  description String?
  materialType String?
  status String @default("ACTIVE")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  serializedParts SerializedPart[]
  operations Operation[]

  @@index([persistentUuid])  // NEW
  @@index([partNumber])
}

model SerializedPart {
  id String @id @default(cuid())
  persistentUuid String @unique @default(uuid())  // NEW
  serialNumber String @unique

  partId String
  part Part @relation(fields: [partId], references: [id])

  manufacturingDate DateTime?
  lotNumber String?
  status String @default("ACTIVE")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([serialNumber, partId])
  @@index([persistentUuid])  // NEW
  @@index([serialNumber])
  @@index([partId])
}

// ... repeat for other Phase 1 entities
```

Generate migration:
```bash
npx prisma migrate dev --name "Add UUIDs to Phase 1 entities"
```

This generates `prisma/migrations/[timestamp]_add_uuids_phase1/migration.sql`

#### Step 1.2: Review Generated Migration (Day 1)

The auto-generated migration will look like:

```sql
-- prisma/migrations/20251107000000_add_uuids_phase1/migration.sql

-- Add persistent_uuid column to Part table
ALTER TABLE "Part" ADD COLUMN "persistentUuid" TEXT;

-- Add persistent_uuid column to SerializedPart table
ALTER TABLE "SerializedPart" ADD COLUMN "persistentUuid" TEXT;

-- Add persistent_uuid column to MaterialLot table
ALTER TABLE "MaterialLot" ADD COLUMN "persistentUuid" TEXT;

-- Add persistent_uuid column to WorkOrder table
ALTER TABLE "WorkOrder" ADD COLUMN "persistentUuid" TEXT;

-- Add persistent_uuid column to QIFMeasurementPlan table
ALTER TABLE "QIFMeasurementPlan" ADD COLUMN "persistentUuid" TEXT;

-- Add persistent_uuid column to QIFCharacteristic table
ALTER TABLE "QIFCharacteristic" ADD COLUMN "persistentUuid" TEXT;

-- Add persistent_uuid column to QIFMeasurementResult table
ALTER TABLE "QIFMeasurementResult" ADD COLUMN "persistentUuid" TEXT;

-- Add persistent_uuid column to ECORequest table
ALTER TABLE "ECORequest" ADD COLUMN "persistentUuid" TEXT;
```

**Review checklist:**
- [ ] All 8 Phase 1 entities present
- [ ] Columns added as nullable (allows null until migration completes)
- [ ] No foreign key changes
- [ ] No data loss operations

#### Step 1.3: Deploy to Development (Day 2)

```bash
# In development environment
cd /path/to/MachShop2
npx prisma migrate dev

# Verify migration applied
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='Part' AND column_name='persistentUuid';"
# Should return: persistentUuid
```

#### Step 1.4: Generate UUIDs for Existing Records (Day 2)

Create a data migration script:

```typescript
// scripts/migrations/generate-phase1-uuids.ts

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function generateUUIDs() {
  console.log('Starting UUID generation for Phase 1 entities...');

  const entities = [
    { name: 'Part', model: prisma.part },
    { name: 'SerializedPart', model: prisma.serializedPart },
    { name: 'MaterialLot', model: prisma.materialLot },
    { name: 'WorkOrder', model: prisma.workOrder },
    { name: 'QIFMeasurementPlan', model: prisma.qiFMeasurementPlan },
    { name: 'QIFCharacteristic', model: prisma.qiFCharacteristic },
    { name: 'QIFMeasurementResult', model: prisma.qiFMeasurementResult },
    { name: 'ECORequest', model: prisma.eCORequest }
  ];

  for (const entity of entities) {
    console.log(`\nGenerating UUIDs for ${entity.name}...`);

    // Find all records without UUID
    const recordsWithoutUUID = await entity.model.findMany({
      where: { persistentUuid: null },
      select: { id: true }
    });

    console.log(`  Found ${recordsWithoutUUID.length} records without UUID`);

    // Batch update in chunks of 1000 to avoid memory issues
    const chunkSize = 1000;
    for (let i = 0; i < recordsWithoutUUID.length; i += chunkSize) {
      const chunk = recordsWithoutUUID.slice(i, i + chunkSize);

      // Generate UUIDs and update
      await Promise.all(
        chunk.map(record =>
          entity.model.update({
            where: { id: record.id },
            data: { persistentUuid: uuidv4() }
          })
        )
      );

      console.log(`  Updated ${Math.min(i + chunkSize, recordsWithoutUUID.length)}/${recordsWithoutUUID.length}`);
    }

    // Verify
    const remaining = await entity.model.findMany({
      where: { persistentUuid: null }
    });

    if (remaining.length === 0) {
      console.log(`  ✅ All ${entity.name} records have UUIDs`);
    } else {
      console.error(`  ❌ ERROR: ${remaining.length} ${entity.name} records still missing UUIDs`);
      process.exit(1);
    }
  }

  console.log('\n✅ UUID generation complete!');
}

generateUUIDs()
  .catch(error => {
    console.error('UUID generation failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run the script:

```bash
# Install uuid package if not present
npm install uuid

# Run migration script
npx ts-node scripts/migrations/generate-phase1-uuids.ts

# Verify completion
echo "SELECT COUNT(*), COUNT(DISTINCT persistent_uuid) FROM part;" | psql $DATABASE_URL
# Both counts should match and equal total records
```

#### Step 1.5: Add Constraints (Day 3)

Now make UUID columns non-nullable and unique:

```sql
-- Apply constraints one table at a time to monitor for issues

-- Part table
ALTER TABLE "Part"
ALTER COLUMN "persistentUuid" SET NOT NULL;

ALTER TABLE "Part"
ADD CONSTRAINT "Part_persistentUuid_key" UNIQUE ("persistentUuid");

-- Create index for performance
CREATE UNIQUE INDEX "Part_persistentUuid_idx" ON "Part"("persistentUuid");

-- Repeat for other Phase 1 entities...
```

Or use Prisma migration:

```bash
# Update schema.prisma with NOT NULL constraints
# Then generate migration
npx prisma migrate dev --name "Add NOT NULL and UNIQUE constraints to UUIDs"
```

#### Step 1.6: Verification Tests (Day 4)

```typescript
// __tests__/migrations/uuid-phase1-verification.test.ts

import { prisma } from '@/lib/prisma';

describe('Phase 1 UUID Migration Verification', () => {
  it('should have UUID for all Part records', async () => {
    const partsWithoutUUID = await prisma.part.findMany({
      where: { persistentUuid: null }
    });

    expect(partsWithoutUUID.length).toBe(0);
  });

  it('should have UUID for all SerializedPart records', async () => {
    const recordsWithoutUUID = await prisma.serializedPart.findMany({
      where: { persistentUuid: null }
    });

    expect(recordsWithoutUUID.length).toBe(0);
  });

  it('should have no UUID collisions in Part table', async () => {
    const result = await prisma.$queryRaw<{ count: bigint; distinct_count: bigint }[]>`
      SELECT
        COUNT(*) as count,
        COUNT(DISTINCT "persistentUuid") as distinct_count
      FROM "Part"
    `;

    expect(result[0].count).toBe(result[0].distinct_count);
  });

  it('should find parts by UUID efficiently', async () => {
    const part = await prisma.part.findFirst();

    if (part) {
      const start = Date.now();
      const found = await prisma.part.findUnique({
        where: { persistentUuid: part.persistentUuid! }
      });
      const duration = Date.now() - start;

      expect(found).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be < 100ms
    }
  });
});
```

Run tests:
```bash
npm test -- uuid-phase1-verification.test.ts
```

### Phase 1 Success Criteria

- ✅ All 8 Phase 1 entities have `persistentUuid` column
- ✅ All existing records have UUIDs (no nulls)
- ✅ UUIDs are unique per table (no collisions)
- ✅ Indices created and functional
- ✅ Zero records lost in migration
- ✅ Verification tests pass
- ✅ Query performance unchanged

### Phase 1 Rollback Plan

If issues occur, revert the migration:

```bash
# Rollback to previous migration
npx prisma migrate resolve --rolled-back 20251107000000_add_uuids_phase1

# Or manually drop columns
ALTER TABLE "Part" DROP COLUMN "persistentUuid";
ALTER TABLE "SerializedPart" DROP COLUMN "persistentUuid";
# ... repeat for other tables
```

---

## Phase 2: API & Internal Support (Weeks 3-4)

### Objectives
- Implement UUID-based API endpoints
- Add identifier auto-detection logic
- Update internal services to use UUID
- Maintain backward compatibility

### Implementation

#### Step 2.1: Create Identifier Detection Utility

```typescript
// src/lib/identifier-detection.ts

import { isUUID, isCUID } from 'class-validator';

export enum IdentifierType {
  UUID = 'UUID',
  CUID = 'CUID',
  BUSINESS_ID = 'BUSINESS_ID'
}

export interface IdentifierInfo {
  type: IdentifierType;
  value: string;
}

/**
 * Detect the type of identifier provided
 * Order matters: UUID first (most specific), then CUID, then other
 */
export function detectIdentifier(value: string): IdentifierInfo {
  if (isUUID(value)) {
    return { type: IdentifierType.UUID, value };
  }

  if (isCUID(value)) {
    return { type: IdentifierType.CUID, value };
  }

  return { type: IdentifierType.BUSINESS_ID, value };
}

/**
 * Build where clause for flexible lookup
 */
export function buildFlexibleWhereClause(
  identifier: string,
  options: {
    uuidField?: string;
    cuidField?: string;
    businessIdField?: string;
  } = {}
) {
  const {
    uuidField = 'persistentUuid',
    cuidField = 'id',
    businessIdField = 'partNumber'
  } = options;

  const identInfo = detectIdentifier(identifier);

  switch (identInfo.type) {
    case IdentifierType.UUID:
      return { [uuidField]: identifier };
    case IdentifierType.CUID:
      return { [cuidField]: identifier };
    case IdentifierType.BUSINESS_ID:
      return { [businessIdField]: identifier };
  }
}
```

#### Step 2.2: Update API Routes (Days 2-5)

```typescript
// src/routes/parts.ts

import express, { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { buildFlexibleWhereClause, detectIdentifier } from '@/lib/identifier-detection';

const router = express.Router();

/**
 * GET /api/parts/:identifier
 * Flexible endpoint supporting CUID, UUID, or business ID
 * @internal
 */
router.get('/api/parts/:identifier', async (req: Request, res: Response) => {
  const { identifier } = req.params;

  try {
    const where = buildFlexibleWhereClause(identifier);

    const part = await prisma.part.findUnique({ where });

    if (!part) {
      return res.status(404).json({
        error: 'Part not found',
        identifier
      });
    }

    res.json({ data: part });
  } catch (error) {
    console.error('Error fetching part:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/external/parts/:uuid
 * External API endpoint - UUID only
 * @external For partner integrations
 */
router.get('/api/v1/external/parts/:uuid', async (req: Request, res: Response) => {
  const { uuid } = req.params;

  // Validate UUID format
  const identInfo = detectIdentifier(uuid);
  if (identInfo.type !== 'UUID') {
    return res.status(400).json({
      error: 'Invalid UUID format',
      provided: uuid,
      example: '550e8400-e29b-41d4-a716-446655440000'
    });
  }

  try {
    const part = await prisma.part.findUnique({
      where: { persistentUuid: uuid },
      select: {
        id: false,  // Never expose internal ID
        persistentUuid: true,
        partNumber: true,
        description: true,
        materialType: true,
        status: true,
        stepAp242Uuid: true,
        erpPartId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!part) {
      return res.status(404).json({
        error: 'Part not found',
        uuid
      });
    }

    res.json({
      data: part,
      metadata: {
        requestedUuid: uuid,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching part by UUID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/parts/:id
 * Internal API endpoint - CUID only
 * @internal For frontend/internal app performance
 */
router.get('/api/parts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate CUID format
  const identInfo = detectIdentifier(id);
  if (identInfo.type !== 'CUID') {
    return res.status(400).json({
      error: 'Invalid internal ID format',
      provided: id
    });
  }

  try {
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
  } catch (error) {
    console.error('Error fetching part:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

#### Step 2.3: Update Services (Days 3-6)

Update business logic to use UUID for integrations:

```typescript
// src/services/PartService.ts

import { prisma } from '@/lib/prisma';

export class PartService {
  /**
   * Find part by any identifier (UUID, CUID, or business ID)
   * Used internally within the application
   */
  async findByAnyIdentifier(identifier: string) {
    const where = buildFlexibleWhereClause(identifier);
    return prisma.part.findUnique({ where });
  }

  /**
   * Find part by UUID only
   * Used for external integrations and partner APIs
   */
  async findByUUID(uuid: string) {
    return prisma.part.findUnique({
      where: { persistentUuid: uuid }
    });
  }

  /**
   * Get UUID for a part (used when syncing to external systems)
   */
  async getUUID(partId: string): Promise<string> {
    const part = await prisma.part.findUnique({
      where: { id: partId },
      select: { persistentUuid: true }
    });

    if (!part) {
      throw new Error(`Part not found: ${partId}`);
    }

    return part.persistentUuid;
  }

  /**
   * Create part with UUID
   */
  async create(data: { partNumber: string; description?: string }) {
    return prisma.part.create({
      data: {
        ...data,
        persistentUuid: undefined  // Let Prisma default generate UUID
      }
    });
  }
}
```

### Phase 2 Success Criteria

- ✅ All Phase 1 entities have UUID-based API endpoints
- ✅ Flexible endpoints supporting all identifier types
- ✅ External endpoints expose UUID, hide CUID
- ✅ Internal services updated to use UUID for integration lookups
- ✅ Backward compatibility maintained (old CUID endpoints still work)
- ✅ API documentation updated with new endpoints
- ✅ All endpoint tests passing (>90% coverage)

### Phase 2 Testing Checklist

```typescript
describe('Phase 2 API Updates', () => {
  describe('Flexible Endpoint', () => {
    it('should find by CUID', async () => {
      // Test with internal CUID
    });
    it('should find by UUID', async () => {
      // Test with UUID
    });
    it('should find by business ID', async () => {
      // Test with partNumber
    });
  });

  describe('External Endpoint', () => {
    it('should accept UUID', async () => {
      // Test with UUID
    });
    it('should reject CUID', async () => {
      // Test with CUID (should fail)
    });
    it('should not expose internal ID', async () => {
      // Verify 'id' not in response
    });
  });

  describe('Internal Endpoint', () => {
    it('should accept CUID', async () => {
      // Test with CUID
    });
    it('should reject UUID', async () => {
      // Test with UUID (should fail for internal-only endpoint)
    });
    it('should include related data', async () => {
      // Verify includes are present
    });
  });
});
```

---

## Phase 3: Integration Updates (Weeks 5-6)

### Objectives
- Update QIF export to use UUID
- Update ERP integration to use UUID
- Update STEP AP242 integration to use UUID
- Publish partner API endpoints

### QIF Export (Day 1-2)

```typescript
// src/services/QIFExportService.ts

import { prisma } from '@/lib/prisma';
import { qifBuilder } from '@/lib/qif';

export class QIFExportService {
  async exportPart(partId: string): Promise<QifDocument> {
    const part = await prisma.part.findUnique({
      where: { id: partId },
      include: {
        qualityPlans: {
          include: {
            characteristics: true
          }
        }
      }
    });

    if (!part) {
      throw new Error(`Part not found: ${partId}`);
    }

    // QIF uses UUID per ISO 13370 standard
    return {
      qifVersion: '3.0',
      headerSection: {
        partNumber: part.partNumber,
        partUUID: part.persistentUuid,  // UUID per QIF standard
        description: part.description,
        creationDate: part.createdAt.toISOString()
      },
      measurementPlans: part.qualityPlans.map(plan => ({
        id: plan.persistentUuid,  // UUID for each measurement plan
        name: plan.name,
        characteristics: plan.characteristics.map(char => ({
          id: char.persistentUuid,  // UUID for each characteristic
          name: char.name,
          nominalValue: char.nominalValue,
          toleranceUpper: char.toleranceUpper,
          toleranceLower: char.toleranceLower
        }))
      }))
    };
  }
}
```

### ERP Integration (Day 3-4)

```typescript
// src/integrations/erp/PartSyncService.ts

import { prisma } from '@/lib/prisma';
import { erpClient } from '@/integrations/erp/client';

export class PartSyncService {
  async syncPartToERP(partId: string): Promise<void> {
    const part = await prisma.part.findUnique({
      where: { id: partId }
    });

    if (!part) {
      throw new Error(`Part not found: ${partId}`);
    }

    // Sync to ERP using UUID as stable reference
    const erpPayload = {
      id: part.persistentUuid,  // UUID for stable reference
      partNumber: part.partNumber,
      description: part.description,
      materialType: part.materialType,
      status: part.status,
      lastSyncedAt: new Date().toISOString()
    };

    try {
      const response = await erpClient.createOrUpdate('/parts', erpPayload);

      // Store ERP ID for future lookups
      if (response.erpPartId) {
        await prisma.part.update({
          where: { id: partId },
          data: { erpPartId: response.erpPartId }
        });
      }

      console.log(`Part ${part.partNumber} synced to ERP with UUID ${part.persistentUuid}`);
    } catch (error) {
      console.error(`Failed to sync part ${partId} to ERP:`, error);
      throw error;
    }
  }

  async syncAllParts(): Promise<SyncReport> {
    const parts = await prisma.part.findMany();
    const report = {
      total: parts.length,
      synced: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const part of parts) {
      try {
        await this.syncPartToERP(part.id);
        report.synced++;
      } catch (error) {
        report.failed++;
        report.errors.push(`${part.partNumber}: ${error.message}`);
      }
    }

    return report;
  }
}
```

### STEP AP242 Integration (Day 5-6)

```typescript
// src/integrations/cad/StepIntegrationService.ts

import { prisma } from '@/lib/prisma';
import { isUUID } from 'class-validator';

export class StepIntegrationService {
  /**
   * Link a Part to a CAD model via STEP AP242 UUID
   */
  async linkToCADModel(partId: string, stepUuid: string): Promise<void> {
    // Validate STEP UUID format
    if (!isUUID(stepUuid)) {
      throw new Error(`Invalid STEP UUID format: ${stepUuid}`);
    }

    const part = await prisma.part.findUnique({
      where: { id: partId }
    });

    if (!part) {
      throw new Error(`Part not found: ${partId}`);
    }

    await prisma.part.update({
      where: { id: partId },
      data: {
        stepAp242Uuid: stepUuid  // Store CAD system reference
      }
    });

    console.log(`Part ${part.partNumber} linked to CAD model ${stepUuid}`);
  }

  /**
   * Export part in STEP format with UUID references
   */
  async exportSTEP(partId: string): Promise<Buffer> {
    const part = await prisma.part.findUnique({
      where: { id: partId }
    });

    if (!part) {
      throw new Error(`Part not found: ${partId}`);
    }

    // Create STEP file with UUID references
    const stepContent = `
STEP AP242 FILE
Part: ${part.partNumber}
UUID: ${part.persistentUuid}
CAD-UUID: ${part.stepAp242Uuid || 'N/A'}
Description: ${part.description || ''}
`;

    return Buffer.from(stepContent);
  }
}
```

### Publish Partner API Documentation (Day 6-7)

Create comprehensive partner integration guide (see Phase 4 for details).

### Phase 3 Success Criteria

- ✅ QIF exports include UUID
- ✅ ERP integration syncs UUID
- ✅ STEP AP242 integration uses UUID
- ✅ Partner API endpoints documented
- ✅ Integration tests passing
- ✅ No changes to existing CUID-based internal APIs

---

## Phase 4: Documentation & Training (Week 7)

### Objectives
- Update API documentation
- Create developer training materials
- Publish partner onboarding guide
- Prepare for production launch

### Documentation Updates

1. **API Reference** - Add UUID endpoints
2. **Integration Guide** - UUID usage examples
3. **Developer Guide** - Best practices and patterns
4. **Partner Onboarding** - Getting started with UUIDs

See `DEVELOPER_GUIDE_UUIDS.md` and `UUID_INTEGRATION_GUIDE.md` for details.

### Training Materials

- Developer training sessions
- Partner webinars
- Internal documentation wiki
- Video tutorials

### Phase 4 Success Criteria

- ✅ All documentation updated
- ✅ Training delivered to development team
- ✅ Partner training materials prepared
- ✅ No open questions about UUID usage
- ✅ Ready for production launch

---

## Monitoring & Validation

### During Migration

```sql
-- Monitor UUID generation progress
SELECT
  table_name,
  COUNT(*) as total_records,
  COUNT(persistent_uuid) as with_uuid,
  COUNT(*) - COUNT(persistent_uuid) as without_uuid,
  ROUND(100.0 * COUNT(persistent_uuid) / COUNT(*), 1) as percentage_complete
FROM (
  SELECT 'Part' as table_name, persistent_uuid FROM part
  UNION ALL
  SELECT 'SerializedPart', persistent_uuid FROM serialized_part
  UNION ALL
  SELECT 'MaterialLot', persistent_uuid FROM material_lot
  -- ... add other tables
) subquery
GROUP BY table_name
ORDER BY percentage_complete DESC;
```

### Performance Monitoring

```sql
-- Check query performance before and after
EXPLAIN ANALYZE
SELECT * FROM part WHERE persistent_uuid = '550e8400-e29b-41d4-a716-446655440000';

-- Should show:
-- Index Scan using idx_part_persistent_uuid (cost=0.42..8.43 rows=1)
```

### Data Integrity Checks

```sql
-- Verify no UUID collisions
SELECT persistent_uuid, COUNT(*)
FROM part
GROUP BY persistent_uuid
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Verify no nulls
SELECT COUNT(*) as null_count FROM part WHERE persistent_uuid IS NULL;
-- Should return 0
```

---

## Rollback Procedures

### If Issues Found During Phase 1

```bash
# Revert the migration
npx prisma migrate resolve --rolled-back 20251107000000_add_uuids_phase1

# Restart after investigation
npx prisma migrate dev
```

### If Issues Found During Phase 2-3

The changes are additive and can be disabled:

```typescript
// Temporarily disable new UUID endpoints
app.get('/api/v1/external/*', (req, res) => {
  res.status(503).json({ error: 'External API temporarily unavailable' });
});

// Fall back to CUID endpoints
```

### If Issues Found During Phase 4

All previous phases remain functional independently.

---

## Success Metrics

Track these metrics throughout the migration:

| Metric | Target | Monitoring |
|--------|--------|------------|
| **Migration Completion** | 100% | SQL queries count records |
| **Query Performance** | < 100ms | Application monitoring |
| **API Availability** | 99.9% | Uptime monitoring |
| **Data Integrity** | 100% | Automated tests |
| **Backward Compatibility** | 100% | Regression tests |

---

## Contingency Plans

### If Entity Has More Data Than Expected

Batch the UUID generation in smaller chunks:

```typescript
const chunkSize = 10000;  // Process 10k records at a time
for (let offset = 0; offset < totalCount; offset += chunkSize) {
  // Process chunk
}
```

### If Performance Degrades

May need to add more indices:

```sql
-- Add covering index for common queries
CREATE INDEX idx_part_uuid_status
ON part(persistent_uuid, status)
WHERE status = 'ACTIVE';
```

### If Partner Onboarding Takes Longer

Extend Phase 4, but all development is complete:

```
Week 8+: Partner Onboarding & Support
├─ Extended partner training
├─ Migration support for partners
├─ Troubleshooting assistance
└─ Gradual traffic migration
```

---

## Related Documentation

- [ADR-012: UUID Strategy for MBE Compliance](../adr/ADR-012-UUID-Strategy-MBE-Compliance.md)
- [UUID Strategy Guide](../UUID_STRATEGY.md)
- [Developer Guide: UUIDs](../DEVELOPER_GUIDE_UUIDS.md)
- [Integration Guide: UUIDs for Partners](../integration/UUID_INTEGRATION_GUIDE.md)

---

## Sign-Off

- [ ] Engineering Lead
- [ ] Database Administrator
- [ ] DevOps Lead
- [ ] Integration Team Lead

**Migration Date:** November 7, 2025 (Week 1 start)
**Expected Completion:** December 19, 2025 (Week 7 end)
