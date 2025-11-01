# ADR-012: UUID Strategy for Model-Based Enterprise (MBE) Compliance

**Status:** Accepted

**Date:** October 31, 2025

**Deciders:** Engineering Team, Architecture Review Board

**Affected By:** Issues #218, #219, #220, #221, #222

---

## Context

### The Problem

The MachShop MES platform currently uses **CUID (Collision-Resistant Unique ID)** exclusively for all database primary keys. This approach works well for internal application performance but creates challenges for:

1. **Standards Compliance**
   - NIST AMS 300-12 recommends globally unique identifiers for MBE
   - ISO/IEC 9834-8:2005 specifies UUID as the standard identifier
   - Aerospace customers (Boeing, Lockheed, etc.) require UUID for traceability
   - QIF (Quality Information Framework) uses UUID as the standard

2. **External Integrations**
   - No stable, globally-unique identifiers for partner systems
   - STEP AP242 (3D CAD standards) expects UUID
   - ERP systems need long-term stable identifiers
   - LOTAR (Long-Term Archival) compliance requires UUID

3. **Traceability & Archival**
   - Manufacturing history needs to outlive the MES system
   - UUID provides ISO-standard, globally-unique archival identifiers
   - CUID cannot be reliably reconstructed in legacy systems

4. **Developer Experience**
   - No documented strategy for identifier selection
   - Confusion about which type to use for new entities
   - Inconsistent patterns across codebase
   - Onboarding difficulty for new developers

### Current State

```prisma
model Part {
  id           String    @id @default(cuid())  // Only identifier
  partNumber   String    @unique
  // ... other fields
}
```

**Limitations:**
- No external, globally-unique identifier
- Cannot easily exchange with external systems
- No archival/long-term stability
- Performance-optimized for internal use only

### Desired State

Support multiple identifier types with clear guidelines:
- **CUID**: Internal database optimization
- **UUID**: External integration, standards compliance, archival
- **Business IDs**: Human-readable identifiers (part numbers, etc.)

---

## Decision

### We will implement a **Hybrid Identifier Strategy**

This approach maintains backward compatibility while adding standards-compliance:

#### Pattern 1: Simple Entities (No External Integration)
```prisma
model User {
  // Internal database ID (CUID) - primary key, optimized for joins
  id String @id @default(cuid())
  
  // Business identifier (String) - unique, human-readable
  username String @unique
  email String @unique
  
  // ... other fields
}
```

#### Pattern 2: Manufacturing Entities (Requires Standards Compliance)
```prisma
model Part {
  // Internal database ID (CUID) - primary key, optimized for performance
  id String @id @default(cuid())
  
  // External persistent ID (UUID) - MBE, integrations, archival
  persistentUuid String @unique @default(uuid())
  
  // Business identifier (String) - unique, human-readable
  partNumber String @unique
  
  // Links to external systems
  stepAp242Uuid String?  // CAD/PLM identifier
  erpPartId String?      // ERP system identifier
  
  // ... other fields
}

model SerializedPart {
  id String @id @default(cuid())
  persistentUuid String @unique @default(uuid())
  serialNumber String @unique
  // ... other fields
}

model QIFMeasurementPlan {
  id String @id @default(cuid())
  persistentUuid String @unique @default(uuid())
  qifPlanName String @unique
  // ... other fields
}
```

#### Pattern 3: Integration Entities (External Systems)
```prisma
model ECORequest {
  // Internal ID for app logic
  id String @id @default(cuid())
  
  // UUID for external tracking
  persistentUuid String @unique @default(uuid())
  
  // External system references
  erpEcoNumber String?  // ERP ECO number
  pdmEcoId String?      // PLM/PDM system ID
}
```

### Guiding Principles

1. **Backward Compatibility**: CUID remains the primary key, no schema migration for existing IDs
2. **Additive Only**: UUID is an additional field, never replaces CUID
3. **Clear Responsibility**: 
   - CUID: Internal application optimization
   - UUID: External integration, standards compliance
   - Business IDs: Human interaction
4. **Lazy Adoption**: UUID added incrementally, not forced retrofit of all entities
5. **Performance First**: CUID indexing ensures query performance remains unchanged

### API Strategy

**Internal APIs** (for MES frontend/app):
```typescript
// Use CUID for internal performance
GET /api/parts/{id}              // CUID
GET /api/work-orders/{id}        // CUID
```

**External APIs** (for integrations, partners):
```typescript
// Use UUID for standards compliance
GET /api/v1/external/parts/{uuid}           // UUID
GET /api/v1/external/work-orders/{uuid}     // UUID
```

**Flexible Endpoints** (support all identifiers):
```typescript
GET /api/parts/{identifier}
// Auto-detects and accepts: CUID, UUID, or business ID
// Returns appropriate result
```

### Migration Strategy

**Phased Approach** (7-week timeline):

1. **Weeks 1-2: Infrastructure**
   - Add UUID columns to critical entities
   - Generate UUIDs for existing records
   - Create indices

2. **Weeks 3-4: API Support**
   - Add UUID-based endpoints
   - Implement identifier auto-detection
   - Keep CUID endpoints for compatibility

3. **Weeks 5-6: Integration Updates**
   - QIF export/import uses UUID
   - ERP integration receives UUID
   - STEP AP242 integration uses UUID

4. **Week 7: Documentation & Training**
   - Update API docs
   - Developer onboarding
   - Partner communication

---

## Consequences

### Positive ✅

1. **Standards Compliance**
   - Meets NIST AMS 300-12 recommendations
   - ISO/IEC 9834-8:2005 compliant
   - Aerospace customer requirements satisfied
   - QIF, STEP AP242, LOTAR compatible

2. **External Integration**
   - Stable, globally-unique identifiers for partners
   - Long-term archival capability
   - ERP system integration enhanced
   - PLM/CAD system integration possible

3. **Backward Compatibility**
   - Existing CUID logic unchanged
   - Zero impact on internal performance
   - No forced migration of existing data
   - Gradual adoption path

4. **Developer Experience**
   - Clear documented strategy
   - Type-safe patterns with TypeScript
   - Examples and best practices
   - Reduced decision-making burden

5. **Flexibility**
   - Support multiple identifier types
   - Entity-specific strategies
   - Integration-specific needs met
   - Future extensibility

### Negative ❌

1. **Storage Overhead**
   - UUID field: ~16 bytes additional per entity
   - Indices: ~additional 1-2% storage per table
   - Estimated total: 50-100MB across entire database
   - Acceptable trade-off given benefits

2. **Developer Education**
   - Must understand when to use which ID
   - Requires new patterns and conventions
   - Potential for misuse if guidance unclear
   - Needs comprehensive documentation (this ADR)

3. **Query Complexity**
   - Some queries need to check multiple ID fields
   - Join operations may use either CUID or UUID
   - Auto-detection adds minor overhead
   - Mitigation: Clear API routes for each use case

4. **API Payload Size**
   - Responses include both CUID and UUID
   - Additional ~50 bytes per response object
   - Negligible for most use cases
   - Can be mitigated with sparse field selection

### Mitigation Strategies

1. **Documentation**: Comprehensive guides (this ADR + implementation docs)
2. **Code Examples**: Reference implementations for each pattern
3. **API Versioning**: Clear endpoint paths for different ID types
4. **TypeScript Types**: Strict types enforce correct usage
5. **Code Review**: Guidelines for new entity creation
6. **Testing**: Test coverage for identifier handling

---

## Alternatives Considered

### ❌ Alternative 1: All UUID, All the Time

**Approach**: Replace all CUID with UUID

**Rejected because:**
- UUID is not sortable (worse query performance)
- Current CUID implementation is optimized and working
- Would require massive schema migration
- Zero compatibility with existing system
- Unwarranted effort for the benefits

### ❌ Alternative 2: UUID Only for External APIs

**Approach**: Keep CUID internally, only expose UUID to partners

**Rejected because:**
- UUID generation during API serialization is complex
- No persistent record of UUID for internal debugging
- External partners see inconsistent IDs
- Makes it difficult to track which UUID maps to which internal ID
- Cannot archive or reference UUIDs internally

### ✅ Selected: Hybrid Approach (This Decision)

**Approach**: CUID for internal, UUID for external (this ADR)

**Advantages:**
- Zero impact on existing performance
- Maintains backward compatibility
- Clear responsibility separation
- Easy to debug (all IDs in database)
- Partners get stable, standard identifiers
- Gradual rollout possible

---

## Implementation Details

### Phase 1 Entities (Priority)

These entities get UUID fields first due to compliance/integration needs:

1. **Part** - CAD/PLM integration (STEP AP242)
2. **SerializedPart** - Traceability, archival (LOTAR)
3. **MaterialLot** - Manufacturing genealogy
4. **WorkOrder** - ERP integration
5. **QIFMeasurementPlan** - QIF standard (ISO 13370)
6. **QIFCharacteristic** - QIF measurement
7. **QIFMeasurementResult** - QIF compliance
8. **ECORequest** - Engineering Change Order, ERP integration

### Phase 2 Entities (Secondary)

Added based on integration needs and prioritization:

9. **Equipment** - Maintenance history, OEE tracking
10. **Operation** - Process documentation, archival
11. **Material** - Supply chain integration
12. **Supplier** - Vendor management system integration
13. **Customer** - CRM integration

### Sample Migration SQL

```sql
-- Example: Part table (PostgreSQL)

-- Step 1: Add UUID column
ALTER TABLE parts 
ADD COLUMN persistent_uuid UUID;

-- Step 2: Generate UUIDs for existing records
UPDATE parts 
SET persistent_uuid = gen_random_uuid();

-- Step 3: Make UUID non-nullable and unique
ALTER TABLE parts 
ALTER COLUMN persistent_uuid SET NOT NULL;

ALTER TABLE parts 
ADD CONSTRAINT parts_persistent_uuid_unique UNIQUE (persistent_uuid);

-- Step 4: Create index for performance
CREATE UNIQUE INDEX idx_parts_persistent_uuid 
ON parts(persistent_uuid);

-- Step 5: Verify (optional)
SELECT COUNT(*), COUNT(DISTINCT persistent_uuid) FROM parts;
-- Both counts should match
```

### Prisma Schema Update

```prisma
model Part {
  // Existing CUID - unchanged
  id String @id @default(cuid())
  
  // New UUID field for external integration
  persistentUuid String @unique @default(uuid())
  
  // Existing business identifier - unchanged
  partNumber String @unique
  
  // New external system references
  stepAp242Uuid String?
  erpPartId String?
  
  // ... rest of model unchanged
  
  @@index([persistentUuid])
  @@index([partNumber])
}
```

### API Implementation

```typescript
import { Request, Response } from 'express';
import { isUUID, isCUID } from 'class-validator';

// Flexible endpoint supporting both CUID and UUID
router.get('/api/parts/:identifier', async (req: Request, res: Response) => {
  const { identifier } = req.params;

  let part;
  if (isUUID(identifier)) {
    // UUID provided
    part = await prisma.part.findUnique({
      where: { persistentUuid: identifier }
    });
  } else if (isCUID(identifier)) {
    // CUID provided
    part = await prisma.part.findUnique({
      where: { id: identifier }
    });
  } else {
    // Try as business ID
    part = await prisma.part.findUnique({
      where: { partNumber: identifier }
    });
  }

  if (!part) {
    return res.status(404).json({ error: 'Part not found' });
  }

  res.json({ data: part });
});

// UUID-specific endpoint (for external partners)
router.get('/api/v1/external/parts/:uuid', async (req: Request, res: Response) => {
  const { uuid } = req.params;

  const part = await prisma.part.findUnique({
    where: { persistentUuid: uuid }
  });

  if (!part) {
    return res.status(404).json({ error: 'Part not found' });
  }

  res.json({ data: part });
});

// CUID endpoint (for internal app)
router.get('/api/parts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const part = await prisma.part.findUnique({
    where: { id }
  });

  if (!part) {
    return res.status(404).json({ error: 'Part not found' });
  }

  res.json({ data: part });
});
```

---

## Validation & Testing

### Test Coverage Required

1. **UUID Generation**
   - UUID fields generated correctly
   - No collisions across database
   - UUIDs stable and unchanged

2. **Query Performance**
   - CUID queries: no performance change
   - UUID queries: indexed, comparable performance
   - Auto-detection: minimal overhead

3. **API Endpoints**
   - CUID endpoint works
   - UUID endpoint works
   - Auto-detect endpoint works for all ID types
   - Correct 404 when identifier not found

4. **Data Consistency**
   - UUID remains unique (constraint tests)
   - CUID primary key unchanged
   - Business IDs still unique
   - Foreign key relationships intact

5. **External Integrations**
   - ERP receives UUID correctly
   - QIF export includes UUID
   - STEP AP242 export includes UUID

### Success Criteria

- ✅ All Phase 1 entities have UUID fields
- ✅ No performance regression on existing queries
- ✅ New UUID endpoints working and tested
- ✅ External integrations using UUID
- ✅ Documentation complete
- ✅ Zero production issues in first month
- ✅ Developer confidence in identifier strategy

---

## References

1. **Standards**
   - ISO/IEC 9834-8:2005 - UUID specification
   - RFC 4122 - UUID standard
   - NIST AMS 300-12 - MBE recommendations
   - ISO 13370 - QIF standard

2. **Related Issues**
   - #218: Add Persistent UUIDs for MBE Traceability
   - #219: Migrate QIF Models to Use UUID
   - #220: Add STEP AP242 Integration Fields
   - #221: LOTAR Long-Term Archival Support
   - #222: Document UUID Strategy & Create Migration Plan

3. **Documentation**
   - `docs/UUID_STRATEGY.md` - Implementation guide
   - `docs/migrations/UUID_MIGRATION.md` - Migration plan
   - `docs/DEVELOPER_GUIDE_UUIDS.md` - Developer reference
   - `docs/integration/UUID_INTEGRATION_GUIDE.md` - Partner guide

---

## Approval

- [x] Engineering Lead
- [x] Architecture Review Board
- [x] Database Administrator
- [x] Integration Team

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2025-10-31 | 1.0 | Engineering Team | Initial decision accepted |

