# Developer Guide: UUID Implementation

**Status:** Developer Reference
**Version:** 1.0
**Date:** October 31, 2025
**Audience:** Backend Developers, Full-Stack Developers

---

## Quick Start

### When Creating a New Entity

If the entity needs **external integration, archival, or standards compliance**, add UUID:

```prisma
model MyEntity {
  // Always add CUID as primary key
  id String @id @default(cuid())

  // Add UUID if external integration needed
  persistentUuid String @unique @default(uuid())

  // Business identifier (if applicable)
  code String @unique

  // ... other fields

  @@index([persistentUuid])
  @@index([code])
}
```

### When Querying

**For internal operations (use CUID):**
```typescript
const record = await prisma.myEntity.findUnique({
  where: { id: 'clp4x9z0k000008kk2j3k3k3k' }
});
```

**For external/integration (use UUID):**
```typescript
const record = await prisma.myEntity.findUnique({
  where: { persistentUuid: '550e8400-e29b-41d4-a716-446655440000' }
});
```

### When Responding to External APIs

```typescript
// ✅ CORRECT: Expose UUID, hide CUID
res.json({
  persistentUuid: record.persistentUuid,
  code: record.code,
  // Don't include 'id' field
});

// ❌ WRONG: Exposing internal CUID
res.json({ id: record.id, ...rest });
```

---

## Decision Tree

Use this tree to decide which identifiers to use:

```
┌─ Is this for internal-only operations?
│  └─ YES: Use CUID only
│
├─ Does this entity integrate with external systems?
│  ├─ YES (ERP, QIF, CAD, etc.):
│  │  └─ Add UUID + keep CUID
│  │     └─ Use UUID in external APIs
│  │     └─ Use CUID in internal APIs
│  │
│  └─ NO: Next question...
│
├─ Will records need to be archived long-term?
│  ├─ YES: Add UUID
│  │  └─ UUID remains valid after system changes
│  │
│  └─ NO: Next question...
│
├─ Do external partners need stable references?
│  ├─ YES: Add UUID
│  │  └─ UUID won't change across system versions
│  │
│  └─ NO: CUID only is fine
│
└─ Final decision: If ANY question above is YES → Add UUID
```

---

## Common Scenarios

### Scenario 1: Simple Internal Entity (No UUID)

```typescript
// User entity - internal authentication only
model User {
  id String @id @default(cuid())
  email String @unique
  username String @unique
  password String
  // ... no external integration needed
}

// Query
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' }
});
```

### Scenario 2: Manufacturing Entity (With UUID)

```typescript
// Part entity - ERP integration, QIF export, CAD linking
model Part {
  id String @id @default(cuid())
  persistentUuid String @unique @default(uuid())
  partNumber String @unique

  // External system references
  erpPartId String?
  stepAp242Uuid String?

  @@index([persistentUuid])
  @@index([partNumber])
}

// Internal query (use CUID)
const part = await prisma.part.findUnique({
  where: { id: 'clp4x9z0k000008kk2j3k3k3k' }
});

// External query (use UUID)
const part = await prisma.part.findUnique({
  where: { persistentUuid: '550e8400-e29b-41d4-a716-446655440000' }
});
```

### Scenario 3: Integration Hub Entity (Multiple UUIDs)

```typescript
// ECORequest entity - links to ERP, PDM, MES
model ECORequest {
  id String @id @default(cuid())
  persistentUuid String @unique @default(uuid())

  // External system references
  erpEcoNumber String?      // ERP system
  pdmEcoId String?          // PLM/PDM system
  mesEcoRef String?         // Internal tracking

  @@index([persistentUuid])
  @@index([erpEcoNumber])
  @@index([pdmEcoId])
}

// Sync to ERP
async function syncECOToERP(ecoId: string) {
  const eco = await prisma.eCORequest.findUnique({
    where: { id: ecoId }
  });

  // Send to ERP with UUID
  const erpPayload = {
    id: eco.persistentUuid,  // Use UUID for stable reference
    erpEcoNumber: eco.erpEcoNumber,
    // ...
  };
}
```

---

## Code Patterns

### Pattern 1: Flexible Lookup Service

For services that support multiple identifier types:

```typescript
// src/services/PartService.ts

import { buildFlexibleWhereClause } from '@/lib/identifier-detection';

export class PartService {
  /**
   * Find part by any identifier (CUID, UUID, or business ID)
   * Used internally within the application
   */
  async findByAnyIdentifier(identifier: string) {
    const where = buildFlexibleWhereClause(identifier, {
      uuidField: 'persistentUuid',
      cuidField: 'id',
      businessIdField: 'partNumber'
    });

    return prisma.part.findUnique({ where });
  }

  /**
   * Find part by UUID only
   * Used for external integrations
   */
  async findByUUID(uuid: string) {
    return prisma.part.findUnique({
      where: { persistentUuid: uuid }
    });
  }

  /**
   * Get UUID for a part (conversion from internal ID)
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
}
```

### Pattern 2: Internal vs External API Routes

```typescript
// src/routes/parts.ts

import { buildFlexibleWhereClause } from '@/lib/identifier-detection';

/**
 * GET /api/parts/:identifier
 * Internal API - supports CUID, UUID, business ID
 * Used by frontend application for performance
 */
router.get('/api/parts/:identifier', async (req, res) => {
  const where = buildFlexibleWhereClause(req.params.identifier);
  const part = await prisma.part.findUnique({ where });

  if (!part) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Return full record (includes CUID)
  res.json({ data: part });
});

/**
 * GET /api/v1/external/parts/:uuid
 * External API - UUID only
 * Used by partner integrations
 */
router.get('/api/v1/external/parts/:uuid', async (req, res) => {
  const part = await prisma.part.findUnique({
    where: { persistentUuid: req.params.uuid },
    select: {
      id: false,  // Never expose internal CUID
      persistentUuid: true,
      partNumber: true,
      description: true,
      erpPartId: true,
      stepAp242Uuid: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!part) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Return only external-safe fields
  res.json({ data: part });
});
```

### Pattern 3: Integration Sync

```typescript
// src/integrations/erp/syncService.ts

/**
 * Sync part to ERP system
 * Always use UUID as stable reference
 */
export async function syncPartToERP(partId: string) {
  const part = await prisma.part.findUnique({
    where: { id: partId }
  });

  if (!part) {
    throw new Error(`Part ${partId} not found`);
  }

  // Build payload with UUID
  const payload = {
    id: part.persistentUuid,        // UUID for stable reference
    partNumber: part.partNumber,
    description: part.description,
    lastSynced: new Date().toISOString()
  };

  // Send to ERP
  const response = await erpClient.post('/parts', payload);

  // Store ERP reference
  if (response.erpPartId) {
    await prisma.part.update({
      where: { id: partId },
      data: { erpPartId: response.erpPartId }
    });
  }

  return response;
}
```

---

## Testing UUIDs

### Unit Tests

```typescript
// __tests__/services/PartService.test.ts

import { PartService } from '@/services/PartService';
import { prisma } from '@/lib/prisma';

describe('PartService UUID Tests', () => {
  let service: PartService;

  beforeEach(() => {
    service = new PartService();
  });

  describe('Finding by UUID', () => {
    it('should find part by persistent UUID', async () => {
      const part = await prisma.part.create({
        data: { partNumber: 'TEST-001' }
      });

      const found = await service.findByUUID(part.persistentUuid);

      expect(found).toBeDefined();
      expect(found?.partNumber).toBe('TEST-001');
    });

    it('should not expose CUID when finding by UUID', async () => {
      const part = await prisma.part.create({
        data: { partNumber: 'TEST-002' }
      });

      const response = await service.findByUUID(part.persistentUuid);
      expect(response.id).toBeUndefined();  // CUID not exposed
    });
  });

  describe('Flexible lookup', () => {
    it('should find by CUID', async () => {
      const part = await prisma.part.create({
        data: { partNumber: 'TEST-003' }
      });

      const found = await service.findByAnyIdentifier(part.id);
      expect(found).toBeDefined();
    });

    it('should find by UUID', async () => {
      const part = await prisma.part.create({
        data: { partNumber: 'TEST-004' }
      });

      const found = await service.findByAnyIdentifier(part.persistentUuid);
      expect(found).toBeDefined();
    });

    it('should find by business ID', async () => {
      const part = await prisma.part.create({
        data: { partNumber: 'TEST-005' }
      });

      const found = await service.findByAnyIdentifier('TEST-005');
      expect(found).toBeDefined();
    });
  });

  describe('UUID generation', () => {
    it('should auto-generate UUID on creation', async () => {
      const part = await prisma.part.create({
        data: { partNumber: 'TEST-006' }
      });

      expect(part.persistentUuid).toBeDefined();
      expect(isUUID(part.persistentUuid)).toBe(true);
    });

    it('should have unique UUIDs across parts', async () => {
      const part1 = await prisma.part.create({
        data: { partNumber: 'TEST-007' }
      });

      const part2 = await prisma.part.create({
        data: { partNumber: 'TEST-008' }
      });

      expect(part1.persistentUuid).not.toBe(part2.persistentUuid);
    });

    it('should maintain UUID on updates', async () => {
      const part = await prisma.part.create({
        data: { partNumber: 'TEST-009' }
      });

      const originalUuid = part.persistentUuid;

      const updated = await prisma.part.update({
        where: { id: part.id },
        data: { description: 'Updated' }
      });

      expect(updated.persistentUuid).toBe(originalUuid);
    });
  });
});
```

### API Tests

```typescript
// __tests__/routes/parts.test.ts

import request from 'supertest';
import app from '@/app';
import { prisma } from '@/lib/prisma';

describe('Parts API UUID Tests', () => {
  describe('POST /api/parts', () => {
    it('should generate UUID on creation', async () => {
      const response = await request(app)
        .post('/api/parts')
        .send({
          partNumber: 'TEST-API-001',
          description: 'Test part'
        })
        .expect(201);

      expect(response.body.data.persistentUuid).toBeDefined();
      expect(isUUID(response.body.data.persistentUuid)).toBe(true);
    });
  });

  describe('GET /api/v1/external/parts/:uuid', () => {
    it('should return part by UUID', async () => {
      const part = await prisma.part.create({
        data: { partNumber: 'TEST-API-002' }
      });

      const response = await request(app)
        .get(`/api/v1/external/parts/${part.persistentUuid}`)
        .expect(200);

      expect(response.body.data.persistentUuid).toBe(part.persistentUuid);
      expect(response.body.data.partNumber).toBe('TEST-API-002');
    });

    it('should not expose internal CUID', async () => {
      const part = await prisma.part.create({
        data: { partNumber: 'TEST-API-003' }
      });

      const response = await request(app)
        .get(`/api/v1/external/parts/${part.persistentUuid}`)
        .expect(200);

      expect(response.body.data.id).toBeUndefined();
    });

    it('should reject invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/external/parts/invalid-uuid')
        .expect(400);

      expect(response.body.error).toContain('Invalid UUID');
    });

    it('should return 404 for non-existent UUID', async () => {
      const response = await request(app)
        .get('/api/v1/external/parts/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/parts/:identifier', () => {
    it('should accept CUID', async () => {
      const part = await prisma.part.create({
        data: { partNumber: 'TEST-API-004' }
      });

      const response = await request(app)
        .get(`/api/parts/${part.id}`)
        .expect(200);

      expect(response.body.data.partNumber).toBe('TEST-API-004');
    });

    it('should accept UUID', async () => {
      const part = await prisma.part.create({
        data: { partNumber: 'TEST-API-005' }
      });

      const response = await request(app)
        .get(`/api/parts/${part.persistentUuid}`)
        .expect(200);

      expect(response.body.data.partNumber).toBe('TEST-API-005');
    });

    it('should accept business ID', async () => {
      const response = await request(app)
        .get('/api/parts/TEST-API-006')
        .expect(200);

      expect(response.body.data.partNumber).toBe('TEST-API-006');
    });
  });
});
```

---

## Troubleshooting

### Problem: UUID is null in newly created record

**Cause:** Prisma schema not updated or field not marked with `@default(uuid())`

**Solution:**
```prisma
model Part {
  id String @id @default(cuid())
  persistentUuid String @unique @default(uuid())  // ← Make sure this line exists
  // ...
}
```

Then run:
```bash
npx prisma generate  # Regenerate Prisma client
npx prisma migrate dev
```

### Problem: Query by UUID is slow

**Cause:** Index not created on UUID column

**Solution:**
```prisma
model Part {
  persistentUuid String @unique @default(uuid())
  @@index([persistentUuid])  // ← Add this index
}
```

Verify the index exists:
```sql
SELECT * FROM pg_indexes WHERE tablename = 'Part' AND indexname LIKE '%uuid%';
```

### Problem: UUID is changing on update

**Cause:** Accidentally setting UUID in update operation

**Solution:**
```typescript
// ❌ WRONG
await prisma.part.update({
  where: { id },
  data: {
    persistentUuid: uuidv4()  // DON'T DO THIS
  }
});

// ✅ CORRECT - Never update UUID
await prisma.part.update({
  where: { id },
  data: {
    description: 'Updated'  // Only update other fields
  }
});
```

### Problem: UUID collisions

**Cause:** Extremely rare (1 in 5 billion) but indicates serious issues

**Check:**
```sql
SELECT persistent_uuid, COUNT(*)
FROM part
GROUP BY persistent_uuid
HAVING COUNT(*) > 1;
```

**If found:**
- Do NOT update existing UUIDs
- Delete and recreate the duplicate record
- Investigate the UUID generation issue

---

## Best Practices

### ✅ DO

- [ ] Use CUID for all primary keys (unchanged pattern)
- [ ] Add UUID to entities with external integrations
- [ ] Expose UUID in external APIs only
- [ ] Keep UUID immutable (never update)
- [ ] Index UUID columns for performance
- [ ] Document which entities have UUID
- [ ] Test both CUID and UUID lookups
- [ ] Batch large UUID operations
- [ ] Include UUID in exports

### ❌ DON'T

- [ ] Replace CUID with UUID (breaks performance)
- [ ] Expose CUID in external APIs
- [ ] Generate UUIDs manually (use `@default(uuid())`)
- [ ] Update UUID values
- [ ] Forget to create indices
- [ ] Use UUID for internal queries only
- [ ] Store UUID in business logic (query DB instead)
- [ ] Change UUID generation strategy mid-project

---

## Quick Reference

| Task | Method | Example |
|------|--------|---------|
| **Find by CUID** | `findUnique({ where: { id } })` | `findUnique({ where: { id: 'clp4x...' } })` |
| **Find by UUID** | `findUnique({ where: { persistentUuid } })` | `findUnique({ where: { persistentUuid: 'uuid-...' } })` |
| **Find by business ID** | `findUnique({ where: { code } })` | `findUnique({ where: { code: 'PART-001' } })` |
| **Create with auto UUID** | Just create | `create({ data: { partNumber } })` |
| **Check if UUID** | `isUUID(value)` | `if (isUUID(identifier))` |
| **Check if CUID** | `isCUID(value)` | `if (isCUID(identifier))` |
| **Get UUID for ID** | `findUnique select` | `findUnique({ where: { id }, select: { persistentUuid } })` |

---

## Related Documentation

- [ADR-012: UUID Strategy for MBE Compliance](adr/ADR-012-UUID-Strategy-MBE-Compliance.md)
- [UUID Strategy Guide](UUID_STRATEGY.md)
- [UUID Migration Plan](migrations/UUID_MIGRATION.md)
- [Integration Guide: UUIDs for Partners](integration/UUID_INTEGRATION_GUIDE.md)

---

## Support

Need help? Check these resources:

1. **Schema Questions** → [UUID_STRATEGY.md](UUID_STRATEGY.md)
2. **Migration Questions** → [UUID_MIGRATION.md](migrations/UUID_MIGRATION.md)
3. **Integration Questions** → [UUID_INTEGRATION_GUIDE.md](integration/UUID_INTEGRATION_GUIDE.md)
4. **Architecture Questions** → [ADR-012](adr/ADR-012-UUID-Strategy-MBE-Compliance.md)
