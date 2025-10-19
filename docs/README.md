# Multi-Site/Multi-Part Routing Documentation

**Project:** MES Multi-Site Routing Implementation
**Version:** 1.0
**Status:** NOT STARTED
**Created:** 2025-10-19

---

## Quick Start

### For New Sessions
1. **Start here:** Read `PROGRESS_TRACKER.md` to see current status
2. **Check roadmap:** Review `roadmaps/MULTI_SITE_ROUTING_ROADMAP.md` for timeline
3. **Current sprint:** See `sprints/SPRINT_X_*.md` for detailed tasks
4. **Implementation:** Reference `specs/` for technical details

### For Implementation
1. **Database changes:** `specs/DATABASE_SCHEMA_CHANGES.md`
2. **API specifications:** `specs/ROUTING_API_SPEC.md` (to be created)
3. **UI components:** `specs/FRONTEND_COMPONENTS_SPEC.md` (to be created)
4. **Architecture decisions:** `adr/001_Multi_Site_Routing_Architecture.md`

---

## Problem Statement

The MES application currently has **45% multi-site maturity**:
- ✅ ISA-95 equipment hierarchy supports sites
- ✅ WorkOrder and ProductionSchedule have siteId fields
- ❌ **Routing has NO siteId** → Cannot create site-specific manufacturing routes
- ❌ **Part has NO routing relationship** → Cannot associate parts with routes
- ❌ **No RoutingService or API** → Cannot manage routes programmatically
- ❌ **Frontend has ZERO site awareness** → No site selector or filtering

**Result:** Cannot support multi-site manufacturing where Dallas plant and Shanghai plant manufacture the same part using different processes.

---

## Solution Overview

### Vision
Enable the MES to support multi-site, multi-part manufacturing routing where:
1. Each site can manufacture different parts with unique processes
2. Same part can have different manufacturing routes at different sites (e.g., Dallas CNC route vs Shanghai manual route)
3. Standard operations (ProcessSegments) can be reused across multiple routes
4. Users can filter and operate within a specific site context
5. Routing definitions are version-controlled and lifecycle-managed

### Implementation Strategy
**6 Sprints over 8 weeks:**
1. **Sprint 1 (Week 1):** Database schema redesign + migration
2. **Sprint 2 (Weeks 2-3):** Backend RoutingService + REST API
3. **Sprint 3 (Week 4):** Frontend site context (site selector)
4. **Sprint 4 (Weeks 5-6):** Routing management UI
5. **Sprint 5 (Week 7):** Security & permissions (site-scoped access)
6. **Sprint 6 (Week 8):** Testing & documentation

---

## Document Structure

```
docs/
├── README.md                                    ← You are here
├── PROGRESS_TRACKER.md                          ← ⭐ START HERE for task checklist
├── TESTING_CHECKLIST.md                         ← Test coverage requirements
│
├── roadmaps/
│   └── MULTI_SITE_ROUTING_ROADMAP.md           ← High-level timeline & milestones
│
├── sprints/
│   ├── SPRINT_1_Database_Foundation.md          ← Week 1: Schema changes
│   ├── SPRINT_2_Backend_Services.md             ← Weeks 2-3: RoutingService + API
│   ├── SPRINT_3_Site_Context.md                 ← Week 4: Frontend site selector
│   ├── SPRINT_4_Routing_UI.md                   ← Weeks 5-6: Routing management UI
│   ├── SPRINT_5_Security.md                     ← Week 7: Permissions & access control
│   └── SPRINT_6_Testing.md                      ← Week 8: Testing & docs
│
├── specs/
│   ├── DATABASE_SCHEMA_CHANGES.md              ← ⭐ Complete Prisma schema changes
│   ├── ROUTING_SERVICE_SPEC.md                 ← RoutingService.ts implementation
│   ├── ROUTING_API_SPEC.md                     ← REST API endpoints (OpenAPI)
│   └── FRONTEND_COMPONENTS_SPEC.md             ← React component specifications
│
├── adr/                                         ← Architecture Decision Records
│   ├── 001_Multi_Site_Routing_Architecture.md  ← Core architectural decisions
│   └── 002_Process_Segment_Integration.md      ← ProcessSegment reuse strategy
│
└── guides/                                      ← User & admin guides (Sprint 6)
    ├── routing-management-user-guide.md
    ├── multi-site-admin-guide.md
    └── migration-to-multi-site-routing.md
```

---

## Key Concepts

### 1. Manufacturing Routing
A **Routing** defines the sequence of operations to manufacture a part at a specific site.

**Example:**
```
Part: "Gear Housing GH-2024"
Site: "Dallas Manufacturing Plant"
Routing: "RT-GH2024-DALLAS-V1.0"
Steps:
  10. CNC Milling (Process Segment: OP-010-MILL)
  20. Deburring (Process Segment: OP-020-DEBURR)
  30. Heat Treatment (Process Segment: OP-030-HEAT)
  40. Quality Inspection (Process Segment: QC-001-INSPECT)
```

### 2. Process Segments (Standard Operations)
A **ProcessSegment** is a reusable operation definition following ISA-95 standards.

**Examples:**
- `OP-010-MILL`: CNC Milling operation (global, can be used anywhere)
- `OP-020-DEBURR`: Deburring operation (global)
- `OP-030-HEAT-DALLAS`: Heat treatment specific to Dallas plant (site-specific)

**Key Point:** Process segments can be **global** (shared across all sites) or **site-specific** (unique to one plant).

### 3. Routing Steps
A **RoutingStep** links a process segment to a specific routing with overrides.

**Example:**
```typescript
RoutingStep {
  stepNumber: 20,
  processSegment: OP-020-DEBURR,
  setupTimeOverride: 300,  // Override default setup time
  workCenter: "DEBURR-WC-01"  // Assign to specific work center
}
```

### 4. Site-Specific Routes
The same part can have different routes at different sites:

```
Part: "Gear Housing GH-2024"

Dallas Route (automated):
  10. CNC Milling
  20. Automated Deburring
  30. Heat Treatment
  40. CMM Inspection

Shanghai Route (manual):
  10. Manual Milling
  20. Manual Deburring
  30. Visual Inspection
```

### 5. Route Lifecycle States
Routes follow a lifecycle:
- **DRAFT** → Under development
- **REVIEW** → Under review for approval
- **RELEASED** → Approved, ready for use
- **PRODUCTION** → Currently in use for manufacturing
- **OBSOLETE** → No longer used

---

## Database Schema Overview

### Core Models

#### Routing (MODIFIED)
- **New fields:** `siteId`, `version`, `lifecycleState`, `isPrimaryRoute`
- **Constraint:** Unique per `(partId, siteId, version)`
- **Indexes:** `siteId`, `partId`, `lifecycleState`

#### RoutingStep (NEW - replaces RoutingOperation)
- **Purpose:** Links routing to process segment
- **Key fields:** `stepNumber`, `processSegmentId`, `setupTimeOverride`
- **Constraint:** Unique per `(routingId, stepNumber)`

#### PartSiteAvailability (NEW)
- **Purpose:** Tracks which sites can manufacture which parts
- **Key fields:** `partId`, `siteId`, `isPreferred`, `leadTimeDays`

#### ProcessSegment (MODIFIED)
- **New fields:** `siteId`, `isStandardOperation`
- **Purpose:** Can now be site-specific or global

---

## API Overview

### Routing Endpoints (Sprint 2)
```
GET    /api/v1/routings?siteId={id}&partId={id}    List routes with filters
POST   /api/v1/routings                            Create new route
GET    /api/v1/routings/:id                        Get route by ID
PUT    /api/v1/routings/:id                        Update route
DELETE /api/v1/routings/:id                        Delete route
GET    /api/v1/routings/:id/steps                  List routing steps
POST   /api/v1/routings/:id/steps                  Add step to route
PUT    /api/v1/routings/:id/steps/:stepId          Update step
DELETE /api/v1/routings/:id/steps/:stepId          Delete step
POST   /api/v1/routings/:id/release                Transition lifecycle state
GET    /api/v1/parts/:id/routings                  Get routes for part
```

---

## UI Components Overview

### Site Context (Sprint 3)
- **SiteSelector** component in header
- **SiteContext** React context provider
- **useSite()** hook for accessing current site

### Routing Management (Sprint 4)
- **RoutingListPage** - Browse/filter all routes
- **RoutingCreatePage** - Create new route
- **RoutingDetailPage** - View/edit route with tabs:
  - Steps: Manage routing steps (drag-drop reordering)
  - Dependencies: Visual graph of step dependencies
  - History: Audit log of changes
- **RoutingStepBuilder** - Add/edit process segments

---

## Progress Tracking

### Current Status
- **Overall Progress:** 0% (0/139 tasks)
- **Current Sprint:** NOT STARTED
- **Blockers:** None

### How to Track Progress
1. Open `PROGRESS_TRACKER.md`
2. Check sprint status in "Quick Status Dashboard"
3. Mark tasks as complete: `- [x] Task description`
4. Update percentages and status icons
5. Add session notes at bottom

### Task Numbering
Tasks are numbered by sprint: `1.1`, `1.2`, ..., `2.1`, `2.2`, etc.
- Reference task IDs in git commits: `git commit -m "1.6: Add siteId to Routing model"`

---

## Getting Started (Implementation)

### Prerequisites
- [ ] PostgreSQL database operational
- [ ] Prisma ORM configured
- [ ] Staging environment available for testing migrations
- [ ] Team familiar with Prisma migrations

### Step 1: Sprint 1 - Database Foundation
1. Review `specs/DATABASE_SCHEMA_CHANGES.md`
2. Update `prisma/schema.prisma` with all changes
3. Generate migration: `npx prisma migrate dev --name add_multi_site_routing_support --create-only`
4. Test migration on staging
5. Run migration on production

### Step 2: Sprint 2 - Backend Services
1. Review `specs/ROUTING_SERVICE_SPEC.md`
2. Create `src/services/RoutingService.ts`
3. Create `src/routes/routings.ts` API endpoints
4. Write unit tests (90%+ coverage)
5. Test on staging

### Step 3-6: Continue through remaining sprints
Follow sprint-specific documentation in `sprints/` directory.

---

## FAQs

**Q: Why replace RoutingOperation with RoutingStep?**
A: RoutingOperation duplicates data (setupTime, cycleTime) and doesn't link to ProcessSegments. RoutingStep references ProcessSegment for operation details, enabling reuse across routes.

**Q: Can a route exist without a site?**
A: No. Every route must be tied to a specific site. This ensures manufacturing processes are site-aware.

**Q: Can process segments be shared across sites?**
A: Yes. Process segments can be global (`siteId = NULL`, `isStandardOperation = true`) or site-specific (`siteId = 'dallas-plant'`).

**Q: What happens to existing routes during migration?**
A: Existing routes are assigned to a default site during migration. You'll need to review and update site assignments post-migration.

**Q: How do I roll back if migration fails?**
A: See "Rollback Procedure" section in `specs/DATABASE_SCHEMA_CHANGES.md`. Full rollback SQL scripts are provided.

---

## Support & Contact

**Document Owner:** MES Development Team
**Questions:** See `PROGRESS_TRACKER.md` session notes for current blockers
**Issues:** Track implementation issues in project management tool

---

## Next Steps

1. ✅ Read this README
2. ➡️ Review `PROGRESS_TRACKER.md` to see task breakdown
3. ➡️ Review `roadmaps/MULTI_SITE_ROUTING_ROADMAP.md` for high-level plan
4. ➡️ Review `specs/DATABASE_SCHEMA_CHANGES.md` when ready to start Sprint 1
5. ➡️ Check off tasks in `PROGRESS_TRACKER.md` as you complete them

**Ready to begin? Start with Sprint 1: Database Foundation!**
