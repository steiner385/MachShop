# Database Schema Changes - Multi-Site Routing

**Version:** 1.0
**Status:** DESIGN PHASE
**Migration Name:** `add_multi_site_routing_support`
**Estimated Impact:** 5 models changed, 3 models added, ~200 lines of Prisma schema

---

## Overview

This document specifies all database schema changes required to support multi-site, multi-part manufacturing routing with ISA-95 process segment integration.

### Goals
1. Enable site-specific manufacturing routes
2. Link routing to process segments for operation reuse
3. Support route versioning and lifecycle management
4. Define which sites can manufacture which parts
5. Maintain backward compatibility where possible

### Non-Goals
- Changes to work order execution (handled separately)
- Changes to BOM structure (deferred to future phase)
- Multi-tenancy at database level (single database, logical separation)

---

## Schema Changes

### 1. Routing Model (MODIFIED)

**Current State (prisma/schema.prisma:1529-1544):**
```prisma
model Routing {
  id          String   @id @default(cuid())
  routingNumber String @unique
  partId      String?  // ❌ PROBLEM: Optional
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  operations      RoutingOperation[]
  workOrders      WorkOrder[]
  scheduleEntries ScheduleEntry[]
}
```

**Problems:**
- NO `siteId` → cannot create site-specific routes
- `partId` is optional → every route should belong to a part
- NO version control → cannot track route revisions
- NO lifecycle state → cannot distinguish DRAFT from PRODUCTION routes

**New Design:**
```prisma
model Routing {
  id              String   @id @default(cuid())
  routingNumber   String   @unique
  partId          String   // ✅ CHANGED: Now required
  siteId          String   // ✅ NEW: Site-specific routes
  version         String   @default("1.0")  // ✅ NEW: Version control
  lifecycleState  RoutingLifecycleState @default(DRAFT)  // ✅ NEW: State management
  description     String?  @db.Text

  // Route attributes
  isPrimaryRoute  Boolean  @default(false)  // ✅ NEW: Is this the preferred route for this part at this site?
  isActive        Boolean  @default(true)
  effectiveDate   DateTime?  // ✅ NEW: When route becomes active
  expirationDate  DateTime?  // ✅ NEW: When route expires

  // Approval tracking
  approvedBy      String?
  approvedAt      DateTime?

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String?
  notes           String?  @db.Text

  // Relations
  part            Part     @relation(fields: [partId], references: [id])
  site            Site     @relation(fields: [siteId], references: [id])
  steps           RoutingStep[]  // ✅ NEW: Replaces operations
  workOrders      WorkOrder[]
  scheduleEntries ScheduleEntry[]

  // Indexes
  @@unique([partId, siteId, version])  // ✅ NEW: One route per part+site+version
  @@index([siteId])
  @@index([partId])
  @@index([lifecycleState])
  @@index([isActive])
  @@map("routings")
}

// ✅ NEW: Lifecycle states for routes
enum RoutingLifecycleState {
  DRAFT       // Being created/edited
  REVIEW      // Under review for approval
  RELEASED    // Approved, ready for use
  PRODUCTION  // Currently in use for manufacturing
  OBSOLETE    // No longer used, kept for historical reference
}
```

**Migration Strategy:**
```sql
-- Add new columns with defaults
ALTER TABLE routings ADD COLUMN site_id TEXT;
ALTER TABLE routings ADD COLUMN version TEXT DEFAULT '1.0';
ALTER TABLE routings ADD COLUMN lifecycle_state TEXT DEFAULT 'PRODUCTION';
ALTER TABLE routings ADD COLUMN is_primary_route BOOLEAN DEFAULT true;

-- Set siteId for existing routes (use default site)
UPDATE routings SET site_id = (SELECT id FROM sites LIMIT 1);

-- Make columns NOT NULL after data populated
ALTER TABLE routings ALTER COLUMN site_id SET NOT NULL;
ALTER TABLE routings ALTER COLUMN part_id SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE routings ADD CONSTRAINT routings_site_id_fkey
  FOREIGN KEY (site_id) REFERENCES sites(id);

-- Add unique constraint
ALTER TABLE routings ADD CONSTRAINT routings_part_id_site_id_version_key
  UNIQUE (part_id, site_id, version);
```

**Rollback:**
```sql
ALTER TABLE routings DROP CONSTRAINT IF EXISTS routings_part_id_site_id_version_key;
ALTER TABLE routings DROP CONSTRAINT IF EXISTS routings_site_id_fkey;
ALTER TABLE routings DROP COLUMN site_id;
ALTER TABLE routings DROP COLUMN version;
ALTER TABLE routings DROP COLUMN lifecycle_state;
ALTER TABLE routings DROP COLUMN is_primary_route;
```

---

### 2. RoutingStep Model (NEW - Replaces RoutingOperation)

**Rationale:**
Current `RoutingOperation` model duplicates data (setupTime, cycleTime) and doesn't link to ProcessSegments. Replace with `RoutingStep` that references ProcessSegment for operation details.

**New Model:**
```prisma
model RoutingStep {
  id                  String   @id @default(cuid())
  routingId           String
  stepNumber          Int      // Sequence: 10, 20, 30, 40... (allows inserts between steps)
  processSegmentId    String   // ✅ KEY: Links to standard operation
  workCenterId        String?  // Optional: specific work center assignment

  // Timing overrides (optional, defaults come from ProcessSegment)
  setupTimeOverride   Int?     // Seconds - overrides ProcessSegment.setupTime
  cycleTimeOverride   Int?     // Seconds - overrides ProcessSegment.duration
  teardownTimeOverride Int?    // Seconds - overrides ProcessSegment.teardownTime

  // Step attributes
  isOptional          Boolean  @default(false)  // Can this step be skipped?
  isQualityInspection Boolean  @default(false)  // Is this a quality checkpoint?
  isCriticalPath      Boolean  @default(false)  // Is this on critical path for scheduling?

  // Instructions
  stepInstructions    String?  @db.Text  // Additional instructions specific to this route
  notes               String?  @db.Text

  // Metadata
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  routing             Routing           @relation(fields: [routingId], references: [id], onDelete: Cascade)
  processSegment      ProcessSegment    @relation(fields: [processSegmentId], references: [id])
  workCenter          WorkCenter?       @relation(fields: [workCenterId], references: [id])
  dependencies        RoutingStepDependency[] @relation("DependentStep")
  prerequisites       RoutingStepDependency[] @relation("PrerequisiteStep")
  workOrderOperations WorkOrderOperation[]  // When work orders are created from this route

  // Indexes
  @@unique([routingId, stepNumber])  // One step number per route
  @@index([routingId])
  @@index([processSegmentId])
  @@index([workCenterId])
  @@map("routing_steps")
}
```

**Migration Strategy:**
```sql
-- Create new table
CREATE TABLE routing_steps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  routing_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  process_segment_id TEXT NOT NULL,
  work_center_id TEXT,
  setup_time_override INTEGER,
  cycle_time_override INTEGER,
  teardown_time_override INTEGER,
  is_optional BOOLEAN DEFAULT false,
  is_quality_inspection BOOLEAN DEFAULT false,
  is_critical_path BOOLEAN DEFAULT false,
  step_instructions TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (routing_id) REFERENCES routings(id) ON DELETE CASCADE,
  FOREIGN KEY (process_segment_id) REFERENCES process_segments(id),
  FOREIGN KEY (work_center_id) REFERENCES work_centers(id),
  UNIQUE (routing_id, step_number)
);

-- Migrate data from routing_operations to routing_steps
-- NOTE: This requires process segments to be created first
INSERT INTO routing_steps (routing_id, step_number, process_segment_id, work_center_id, setup_time_override, cycle_time_override)
SELECT
  ro.routing_id,
  ro.operation_number * 10,  -- Convert 1,2,3 to 10,20,30
  ps.id as process_segment_id,  -- Match by operation name or create default
  ro.work_center_id,
  ro.setup_time,
  ro.cycle_time
FROM routing_operations ro
LEFT JOIN process_segments ps ON ps.segment_name = ro.operation_name
WHERE ro.is_active = true;

-- Drop old table after verification
-- DROP TABLE routing_operations;
```

---

### 3. RoutingStepDependency Model (NEW)

**Rationale:**
Define sequencing rules between routing steps (e.g., "Step 30 cannot start until Step 20 completes").

**New Model:**
```prisma
model RoutingStepDependency {
  id                  String   @id @default(cuid())
  dependentStepId     String   // Step that has the dependency
  prerequisiteStepId  String   // Step that must complete first

  // Dependency details
  dependencyType      DependencyType  // MUST_COMPLETE, MUST_START, OVERLAP_ALLOWED
  timingType          DependencyTimingType  // FINISH_TO_START, START_TO_START, etc.

  // Timing constraints
  lagTime             Int?     // Minimum time delay (seconds) after prerequisite
  leadTime            Int?     // Maximum time gap (seconds) allowed

  // Metadata
  createdAt           DateTime @default(now())

  // Relations
  dependentStep       RoutingStep @relation("DependentStep", fields: [dependentStepId], references: [id], onDelete: Cascade)
  prerequisiteStep    RoutingStep @relation("PrerequisiteStep", fields: [prerequisiteStepId], references: [id], onDelete: Cascade)

  // Indexes
  @@unique([dependentStepId, prerequisiteStepId])
  @@index([dependentStepId])
  @@index([prerequisiteStepId])
  @@map("routing_step_dependencies")
}

enum DependencyType {
  MUST_COMPLETE       // Prerequisite must complete before dependent can start
  MUST_START          // Prerequisite must start before dependent can start
  OVERLAP_ALLOWED     // Can overlap, but prerequisite must start first
  PARALLEL            // Can run in parallel (no dependency, just for documentation)
}

enum DependencyTimingType {
  FINISH_TO_START     // Prerequisite finish → Dependent start (most common)
  START_TO_START      // Both start at same time
  FINISH_TO_FINISH    // Both finish at same time
  START_TO_FINISH     // Prerequisite start → Dependent finish (rare)
}
```

---

### 4. Part Model (MODIFIED)

**Current State:**
```prisma
model Part {
  id              String   @id @default(cuid())
  partNumber      String   @unique
  // ...existing fields...
  workOrders      WorkOrder[]
  bomItems        BOMItem[]
}
```

**New Design:**
```prisma
model Part {
  id              String   @id @default(cuid())
  partNumber      String   @unique
  // ...existing fields unchanged...

  // ✅ NEW: Relations
  routings        Routing[]  // One part can have multiple routes (different sites, versions)
  siteAvailability PartSiteAvailability[]  // Which sites can manufacture this part

  workOrders      WorkOrder[]
  bomItems        BOMItem[]
}
```

**Migration Strategy:**
No SQL migration needed - Prisma handles relation additions automatically.

---

### 5. PartSiteAvailability Model (NEW)

**Rationale:**
Track which manufacturing sites are capable of producing which parts, with site-specific attributes.

**New Model:**
```prisma
model PartSiteAvailability {
  id              String   @id @default(cuid())
  partId          String
  siteId          String

  // Availability attributes
  isPreferred     Boolean  @default(false)  // Is this the preferred site for this part?
  isActive        Boolean  @default(true)   // Can this site currently manufacture this part?

  // Site-specific manufacturing data
  leadTimeDays    Int?     // Manufacturing lead time at this site
  minimumLotSize  Int?     // Minimum production lot size
  maximumLotSize  Int?     // Maximum production lot size

  // Cost data (site-specific)
  standardCost    Float?   // Standard cost to manufacture at this site
  setupCost       Float?   // Setup cost at this site

  // Dates
  effectiveDate   DateTime?  // When site became capable
  expirationDate  DateTime?  // When site capability expires

  // Metadata
  notes           String?  @db.Text
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  part            Part     @relation(fields: [partId], references: [id], onDelete: Cascade)
  site            Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)

  // Indexes
  @@unique([partId, siteId])  // One record per part-site combination
  @@index([siteId])
  @@index([isActive])
  @@map("part_site_availability")
}
```

---

### 6. ProcessSegment Model (MODIFIED)

**Current State:**
```prisma
model ProcessSegment {
  id              String   @id @default(cuid())
  segmentCode     String   @unique
  segmentName     String
  // ...existing fields...
  bomItems        BOMItem[]
}
```

**New Design:**
```prisma
model ProcessSegment {
  id              String   @id @default(cuid())
  segmentCode     String   @unique
  segmentName     String

  // ✅ NEW: Multi-site support
  siteId          String?  // NULL = global/standard operation, NOT NULL = site-specific
  isStandardOperation Boolean @default(false)  // Can be reused across routes?

  // ...all existing fields unchanged...

  // ✅ NEW: Relations
  site            Site?    @relation(fields: [siteId], references: [id])
  routingSteps    RoutingStep[]  // Used in routing steps

  bomItems        BOMItem[]

  // ✅ NEW: Indexes
  @@index([siteId])
  @@index([isStandardOperation])
}
```

**Migration Strategy:**
```sql
-- Add new columns
ALTER TABLE process_segments ADD COLUMN site_id TEXT;
ALTER TABLE process_segments ADD COLUMN is_standard_operation BOOLEAN DEFAULT false;

-- Set existing segments as standard operations (global)
UPDATE process_segments SET is_standard_operation = true WHERE site_id IS NULL;

-- Add foreign key
ALTER TABLE process_segments ADD CONSTRAINT process_segments_site_id_fkey
  FOREIGN KEY (site_id) REFERENCES sites(id);
```

---

### 7. Site Model (MODIFIED)

**Current State:**
```prisma
model Site {
  id           String   @id @default(cuid())
  siteCode     String   @unique
  siteName     String
  // ...existing fields...
  workOrders          WorkOrder[]
  equipment           Equipment[]
}
```

**New Design:**
```prisma
model Site {
  id           String   @id @default(cuid())
  siteCode     String   @unique
  siteName     String
  // ...existing fields unchanged...

  // ✅ NEW: Relations
  routings            Routing[]  // Routes defined for this site
  partAvailability    PartSiteAvailability[]  // Parts that can be made here
  processSegments     ProcessSegment[]  // Site-specific process segments

  workOrders          WorkOrder[]
  equipment           Equipment[]
  // ...existing relations unchanged...
}
```

---

## Summary of Changes

| Model | Change Type | Impact | Breaking Change? |
|-------|------------|--------|------------------|
| **Routing** | Modified | 7 new fields, 3 new indexes | ⚠️ Yes - `partId` now required |
| **RoutingStep** | New | Replaces RoutingOperation | ⚠️ Yes - RoutingOperation deprecated |
| **RoutingStepDependency** | New | New functionality | ✅ No |
| **Part** | Modified | 2 new relations | ✅ No |
| **PartSiteAvailability** | New | New functionality | ✅ No |
| **ProcessSegment** | Modified | 2 new fields, 2 indexes, 1 relation | ✅ No |
| **Site** | Modified | 3 new relations | ✅ No |

**Total:**
- 3 new models
- 4 modified models
- 5 new enums
- ~200 lines of Prisma schema changes
- ~15 new indexes

---

## Migration Plan

### Phase 1: Pre-Migration (Day 1 Morning)
1. **Backup production database**
   ```bash
   pg_dump mes_production > backup_$(date +%Y%m%d).sql
   ```

2. **Create staging clone**
   ```bash
   pg_restore -d mes_staging backup_$(date +%Y%m%d).sql
   ```

3. **Verify staging data integrity**
   ```sql
   SELECT COUNT(*) FROM routings;
   SELECT COUNT(*) FROM routing_operations;
   ```

### Phase 2: Migration Development (Day 1)
1. Update `prisma/schema.prisma` with all changes
2. Generate migration: `npx prisma migrate dev --name add_multi_site_routing_support --create-only`
3. Review generated SQL in `prisma/migrations/`
4. Add data migration scripts to populate new fields
5. Test on staging database

### Phase 3: Migration Testing (Day 2-3)
1. Run migration on staging
2. Verify data integrity
3. Run existing test suite against staging
4. Perform manual smoke tests
5. Test rollback procedure

### Phase 4: Production Migration (Day 4)
1. Schedule maintenance window (low-traffic period)
2. Create final production backup
3. Run migration on production
4. Verify migration success
5. Deploy updated application code
6. Monitor for errors (24-48 hours)

---

## Rollback Procedure

If critical issues arise:

```bash
# 1. Stop application
systemctl stop mes-backend

# 2. Rollback Prisma migration
npx prisma migrate resolve --rolled-back add_multi_site_routing_support

# 3. Restore from backup (if needed)
pg_restore -d mes_production backup_$(date +%Y%m%d).sql

# 4. Deploy previous application version
git checkout <previous-commit>
npm run build
systemctl start mes-backend

# 5. Verify application health
curl http://localhost:3000/api/health
```

---

## Validation Queries

After migration, run these queries to verify data integrity:

```sql
-- Verify all routings have siteId
SELECT COUNT(*) FROM routings WHERE site_id IS NULL;  -- Should be 0

-- Verify all routing steps link to valid process segments
SELECT COUNT(*) FROM routing_steps rs
LEFT JOIN process_segments ps ON rs.process_segment_id = ps.id
WHERE ps.id IS NULL;  -- Should be 0

-- Verify unique constraint on routings
SELECT part_id, site_id, version, COUNT(*)
FROM routings
GROUP BY part_id, site_id, version
HAVING COUNT(*) > 1;  -- Should be empty

-- Verify routing steps are sequential
SELECT r.routing_number, rs.step_number
FROM routing_steps rs
JOIN routings r ON rs.routing_id = r.id
ORDER BY r.routing_number, rs.step_number;  -- Check for gaps

-- Count of new records
SELECT 'Routings' as table_name, COUNT(*) as count FROM routings
UNION ALL
SELECT 'RoutingSteps', COUNT(*) FROM routing_steps
UNION ALL
SELECT 'PartSiteAvailability', COUNT(*) FROM part_site_availability;
```

---

## Performance Considerations

### Indexes Added
```sql
CREATE INDEX idx_routings_site_id ON routings(site_id);
CREATE INDEX idx_routings_part_id ON routings(part_id);
CREATE INDEX idx_routings_lifecycle_state ON routings(lifecycle_state);
CREATE INDEX idx_routing_steps_routing_id ON routing_steps(routing_id);
CREATE INDEX idx_routing_steps_process_segment_id ON routing_steps(process_segment_id);
CREATE INDEX idx_part_site_availability_site_id ON part_site_availability(site_id);
CREATE INDEX idx_process_segments_site_id ON process_segments(site_id);
```

### Composite Index for Common Query
```sql
CREATE INDEX idx_routings_site_part_active ON routings(site_id, part_id, is_active);
```

### Expected Query Performance
- Routing lookup by part+site: < 10ms
- Routing steps for route: < 5ms
- Parts manufacturable at site: < 20ms

---

## References

- See `docs/PROGRESS_TRACKER.md` task 1.1-1.20 for implementation checklist
- See `docs/sprints/SPRINT_1_Database_Foundation.md` for sprint plan
- See `docs/adr/001_Multi_Site_Routing_Architecture.md` for design decisions
- See Prisma migration docs: https://www.prisma.io/docs/concepts/components/prisma-migrate

**Document Owner:** Database Team
**Last Updated:** 2025-10-19
**Status:** Ready for implementation
