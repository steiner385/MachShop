# Multi-Site/Multi-Part Routing - Progress Tracker

**Last Updated:** 2025-10-19
**Overall Progress:** 0% (0/139 tasks completed)
**Current Sprint:** NOT STARTED
**Target Completion:** 8 weeks from start date

---

## Quick Status Dashboard

| Sprint | Status | Progress | Start Date | End Date | Blockers |
|--------|--------|----------|------------|----------|----------|
| Sprint 1: Database Foundation | ⬜ NOT STARTED | 0/20 | TBD | TBD | None |
| Sprint 2: Backend Services & APIs | ⬜ NOT STARTED | 0/35 | TBD | TBD | Sprint 1 |
| Sprint 3: Frontend Site Context | ⬜ NOT STARTED | 0/15 | TBD | TBD | Sprint 2 |
| Sprint 4: Routing Management UI | ⬜ NOT STARTED | 0/42 | TBD | TBD | Sprint 3 |
| Sprint 5: Security & Permissions | ⬜ NOT STARTED | 0/18 | TBD | TBD | Sprint 4 |
| Sprint 6: Testing & Documentation | ⬜ NOT STARTED | 0/9 | TBD | TBD | Sprint 5 |

**Legend:**
- ⬜ NOT STARTED
- 🟡 IN PROGRESS
- ✅ COMPLETED
- ⚠️ BLOCKED
- ❌ FAILED

---

## Sprint 1: Database Foundation (Week 1)

**Status:** ⬜ NOT STARTED | **Progress:** 0/20 tasks | **Owner:** TBD

### Schema Design (5 tasks)
- [ ] 1.1 - Design updated Routing model with siteId, version, lifecycleState
- [ ] 1.2 - Design RoutingStep model (replaces RoutingOperation)
- [ ] 1.3 - Design RoutingStepDependency model for sequencing
- [ ] 1.4 - Design PartSiteAvailability model
- [ ] 1.5 - Update ProcessSegment model with siteId and isStandardOperation

**Acceptance:** All 5 models documented in `docs/specs/DATABASE_SCHEMA_CHANGES.md`

### Prisma Schema Updates (5 tasks)
- [ ] 1.6 - Update `prisma/schema.prisma` with Routing model changes
- [ ] 1.7 - Add RoutingStep model to schema
- [ ] 1.8 - Add RoutingStepDependency model to schema
- [ ] 1.9 - Add PartSiteAvailability model to schema
- [ ] 1.10 - Update ProcessSegment model in schema

**Acceptance:** `npx prisma format` runs without errors, schema is valid

### Migration & Rollback (5 tasks)
- [ ] 1.11 - Create migration: `npx prisma migrate dev --name add_multi_site_routing`
- [ ] 1.12 - Test migration on clean database (success)
- [ ] 1.13 - Test migration on staging database with existing data
- [ ] 1.14 - Create rollback SQL script (`migrations/rollback_multi_site_routing.sql`)
- [ ] 1.15 - Test rollback script on staging database

**Acceptance:** Migration and rollback both work successfully on staging

### Seed Data (3 tasks)
- [ ] 1.16 - Add seed data: 3 sites (Dallas, Austin, Shanghai)
- [ ] 1.17 - Add seed data: 5 parts with site availability
- [ ] 1.18 - Add seed data: 10 process segments (5 global, 5 site-specific)

**Acceptance:** `npx prisma db seed` populates database successfully

### Validation & Documentation (2 tasks)
- [ ] 1.19 - Verify all foreign key constraints work
- [ ] 1.20 - Document migration in `docs/sprints/SPRINT_1_Database_Foundation.md`

**Sprint 1 Complete:** ⬜ (0/20 tasks done)

---

## Sprint 2: Backend Services & APIs (Weeks 2-3)

**Status:** ⬜ NOT STARTED | **Progress:** 0/35 tasks | **Owner:** TBD
**Dependencies:** Sprint 1 must be 100% complete

### TypeScript Types (3 tasks)
- [ ] 2.1 - Create `src/types/routing.ts` with all routing interfaces
- [ ] 2.2 - Create DTOs for create/update operations
- [ ] 2.3 - Create response types for API endpoints

**Acceptance:** TypeScript compiles without errors

### RoutingService.ts (12 tasks)
- [ ] 2.4 - Create `src/services/RoutingService.ts` file structure
- [ ] 2.5 - Implement `createRouting()` method
- [ ] 2.6 - Implement `getRoutingById()` method
- [ ] 2.7 - Implement `getAllRoutings()` with filters (siteId, partId, state)
- [ ] 2.8 - Implement `updateRouting()` method
- [ ] 2.9 - Implement `deleteRouting()` method
- [ ] 2.10 - Implement `addRoutingStep()` method
- [ ] 2.11 - Implement `updateRoutingStep()` method
- [ ] 2.12 - Implement `deleteRoutingStep()` method
- [ ] 2.13 - Implement `reorderRoutingSteps()` method
- [ ] 2.14 - Implement lifecycle transitions (draft → release → production)
- [ ] 2.15 - Implement route cloning/versioning

**Acceptance:** All methods implemented with error handling

### RoutingService Unit Tests (3 tasks)
- [ ] 2.16 - Write tests for CRUD operations (10+ test cases)
- [ ] 2.17 - Write tests for step management (8+ test cases)
- [ ] 2.18 - Write tests for lifecycle transitions (5+ test cases)

**Acceptance:** 90%+ coverage on RoutingService, all tests pass

### REST API Routes (10 tasks)
- [ ] 2.19 - Create `src/routes/routings.ts` file structure
- [ ] 2.20 - Implement GET /api/v1/routings (list with filters)
- [ ] 2.21 - Implement POST /api/v1/routings (create)
- [ ] 2.22 - Implement GET /api/v1/routings/:id (get by id)
- [ ] 2.23 - Implement PUT /api/v1/routings/:id (update)
- [ ] 2.24 - Implement DELETE /api/v1/routings/:id (delete)
- [ ] 2.25 - Implement GET /api/v1/routings/:id/steps (list steps)
- [ ] 2.26 - Implement POST /api/v1/routings/:id/steps (add step)
- [ ] 2.27 - Implement PUT /api/v1/routings/:id/steps/:stepId (update step)
- [ ] 2.28 - Implement POST /api/v1/routings/:id/release (lifecycle transition)

**Acceptance:** All endpoints return correct status codes and data

### API Validation & Security (4 tasks)
- [ ] 2.29 - Add request validation schemas (Zod)
- [ ] 2.30 - Add site access middleware to all routing endpoints
- [ ] 2.31 - Add permission checks (routings.read, routings.create, etc.)
- [ ] 2.32 - Add error handling and proper HTTP status codes

**Acceptance:** Invalid requests return 400, unauthorized returns 403

### Updated Services (3 tasks)
- [ ] 2.33 - Update ProductService: add `getPartSiteAvailability()` method
- [ ] 2.34 - Update ProductService: add `setPartSiteAvailability()` method
- [ ] 2.35 - Update ProcessSegmentService: add site filtering to `getAll()`

**Acceptance:** All service methods work with site filtering

**Sprint 2 Complete:** ⬜ (0/35 tasks done)

---

## Sprint 3: Frontend Site Context (Week 4)

**Status:** ⬜ NOT STARTED | **Progress:** 0/15 tasks | **Owner:** TBD
**Dependencies:** Sprint 2 must be 100% complete

### Site Context & Provider (5 tasks)
- [ ] 3.1 - Create `frontend/src/contexts/SiteContext.tsx`
- [ ] 3.2 - Implement SiteProvider component with state management
- [ ] 3.3 - Create `frontend/src/hooks/useSite.ts` hook
- [ ] 3.4 - Add site persistence to localStorage
- [ ] 3.5 - Wrap <App> with <SiteProvider> in main.tsx

**Acceptance:** Context provides currentSite, setCurrentSite, allSites

### Site Selector Component (5 tasks)
- [ ] 3.6 - Create `frontend/src/components/Site/SiteSelector.tsx`
- [ ] 3.7 - Implement site dropdown with Ant Design Select
- [ ] 3.8 - Add "All Sites" option for admin users
- [ ] 3.9 - Style component to match application theme
- [ ] 3.10 - Add loading state and error handling

**Acceptance:** Dropdown shows all sites, selection updates context

### Integration (5 tasks)
- [ ] 3.11 - Add SiteSelector to MainLayout.tsx header
- [ ] 3.12 - Update Dashboard to filter by current site
- [ ] 3.13 - Update WorkOrders page to filter by current site
- [ ] 3.14 - Update ProductionSchedule page to filter by current site
- [ ] 3.15 - Test site switching across all pages

**Acceptance:** Changing site refreshes data on all pages

**Sprint 3 Complete:** ⬜ (0/15 tasks done)

---

## Sprint 4: Routing Management UI (Weeks 5-6)

**Status:** ⬜ NOT STARTED | **Progress:** 0/42 tasks | **Owner:** TBD
**Dependencies:** Sprint 3 must be 100% complete

### API Client (4 tasks)
- [ ] 4.1 - Create `frontend/src/api/routing.ts` with API methods
- [ ] 4.2 - Implement getAllRoutings() with filters
- [ ] 4.3 - Implement createRouting(), updateRouting(), deleteRouting()
- [ ] 4.4 - Implement step management methods

**Acceptance:** All API client methods work and handle errors

### Zustand Store (3 tasks)
- [ ] 4.5 - Create `frontend/src/store/routingStore.ts`
- [ ] 4.6 - Implement state for routings list, selected routing, filters
- [ ] 4.7 - Add actions for CRUD operations and step management

**Acceptance:** Store manages routing state correctly

### TypeScript Types (2 tasks)
- [ ] 4.8 - Create `frontend/src/types/routing.ts` interfaces
- [ ] 4.9 - Ensure types match backend API responses

**Acceptance:** No TypeScript errors in routing components

### RoutingListPage Component (8 tasks)
- [ ] 4.10 - Create `frontend/src/pages/Routing/RoutingListPage.tsx` structure
- [ ] 4.11 - Implement table with columns: part, routing#, site, version, state
- [ ] 4.12 - Add filters: site, part, lifecycle state, active/inactive
- [ ] 4.13 - Add search by routing number or part number
- [ ] 4.14 - Implement pagination (20 per page)
- [ ] 4.15 - Add action buttons: View, Edit, Clone, Delete
- [ ] 4.16 - Add "Create New Routing" button in header
- [ ] 4.17 - Handle loading, empty, and error states

**Acceptance:** List page displays routes, filtering works, pagination works

### RoutingCreatePage Component (10 tasks)
- [ ] 4.18 - Create `frontend/src/pages/Routing/RoutingCreatePage.tsx` structure
- [ ] 4.19 - Add part selector (autocomplete search)
- [ ] 4.20 - Add site selector dropdown (respects user allowed sites)
- [ ] 4.21 - Add version input field (default: "1.0")
- [ ] 4.22 - Add description textarea
- [ ] 4.23 - Add form validation (part required, site required, unique part+site+version)
- [ ] 4.24 - Implement "Save as Draft" button
- [ ] 4.25 - Implement "Create & Release" button
- [ ] 4.26 - Add error handling and success messages
- [ ] 4.27 - Redirect to detail page after creation

**Acceptance:** Can create routing, validation works, redirects correctly

### RoutingDetailPage Component (12 tasks)
- [ ] 4.28 - Create `frontend/src/pages/Routing/RoutingDetailPage.tsx` structure
- [ ] 4.29 - Display header: part info, site, version, state badge
- [ ] 4.30 - Add lifecycle transition buttons (DRAFT → REVIEW → RELEASED)
- [ ] 4.31 - Create "Steps" tab with routing steps table
- [ ] 4.32 - Implement drag-drop step reordering
- [ ] 4.33 - Add "Add Step" button to open step builder modal
- [ ] 4.34 - Implement step edit functionality
- [ ] 4.35 - Implement step delete with confirmation
- [ ] 4.36 - Create "Dependencies" tab with graph visualization
- [ ] 4.37 - Create "History" tab with audit log
- [ ] 4.38 - Add edit routing metadata functionality
- [ ] 4.39 - Add delete routing with confirmation

**Acceptance:** Detail page shows all routing info, can manage steps

### Step Builder Component (2 tasks)
- [ ] 4.40 - Create `frontend/src/components/Routing/RoutingStepBuilder.tsx`
- [ ] 4.41 - Implement process segment selector, timing override fields

**Acceptance:** Can add/edit steps with process segment selection

### Navigation & Routes (1 task)
- [ ] 4.42 - Add routing routes to App.tsx and navigation menu

**Acceptance:** Routing pages accessible via navigation

**Sprint 4 Complete:** ⬜ (0/42 tasks done)

---

## Sprint 5: Security & Permissions (Week 7)

**Status:** ⬜ NOT STARTED | **Progress:** 0/18 tasks | **Owner:** TBD
**Dependencies:** Sprint 4 must be 100% complete

### User Model Extension (3 tasks)
- [ ] 5.1 - Add `primarySiteId` field to User model (migration)
- [ ] 5.2 - Add `allowedSites` String[] field to User model (migration)
- [ ] 5.3 - Update user seed data with site assignments

**Acceptance:** User model has site fields, migration successful

### Backend Middleware (6 tasks)
- [ ] 5.4 - Update `src/middleware/auth.ts` with site access logic
- [ ] 5.5 - Implement `requireSiteAccess()` middleware enhancement
- [ ] 5.6 - Implement site-scoped permission checks
- [ ] 5.7 - Add site validation to all routing endpoints
- [ ] 5.8 - Add site validation to work order endpoints
- [ ] 5.9 - Add audit logging for site context

**Acceptance:** Users can only access allowed sites, 403 for unauthorized

### Frontend Permission Checks (4 tasks)
- [ ] 5.10 - Add site access checks in routing UI
- [ ] 5.11 - Hide/disable actions for unauthorized sites
- [ ] 5.12 - Add site permission indicators in UI
- [ ] 5.13 - Update site selector to only show allowed sites

**Acceptance:** UI respects site permissions, no unauthorized access possible

### Admin Interface (3 tasks)
- [ ] 5.14 - Create admin page for managing user site access
- [ ] 5.15 - Add UI to assign/remove sites from users
- [ ] 5.16 - Add UI to set user's primary site

**Acceptance:** Admin can manage user site access

### Security Testing (2 tasks)
- [ ] 5.17 - Write security tests for site access control (10+ test cases)
- [ ] 5.18 - Perform penetration testing for site isolation

**Acceptance:** All security tests pass, no unauthorized access possible

**Sprint 5 Complete:** ⬜ (0/18 tasks done)

---

## Sprint 6: Testing & Documentation (Week 8)

**Status:** ⬜ NOT STARTED | **Progress:** 0/9 tasks | **Owner:** TBD
**Dependencies:** Sprint 5 must be 100% complete

### Testing (4 tasks)
- [ ] 6.1 - Write additional unit tests to reach 90% coverage
- [ ] 6.2 - Write E2E tests for routing workflows (create, edit, release, delete)
- [ ] 6.3 - Write performance tests for multi-site queries
- [ ] 6.4 - Run full regression test suite

**Acceptance:** All tests pass, coverage requirements met

### Documentation (5 tasks)
- [ ] 6.5 - Complete API documentation (`docs/api/routing-api.md`)
- [ ] 6.6 - Write user guide (`docs/guides/routing-management-user-guide.md`)
- [ ] 6.7 - Write admin guide (`docs/guides/multi-site-admin-guide.md`)
- [ ] 6.8 - Write migration guide (`docs/guides/migration-to-multi-site-routing.md`)
- [ ] 6.9 - Update architecture documentation with routing design

**Acceptance:** All documentation complete and reviewed

**Sprint 6 Complete:** ⬜ (0/9 tasks done)

---

## Blockers & Risks

### Current Blockers
No blockers (project not started)

### Active Risks
1. **Data Migration Risk:** Existing work orders may reference old routing structure
   - **Mitigation:** Test migration on staging with prod-like data

2. **Performance Risk:** Multi-site queries may be slow on large datasets
   - **Mitigation:** Add composite indexes, test with 10K+ routes

3. **Timeline Risk:** Sprint 2 and Sprint 4 are ambitious
   - **Mitigation:** Prioritize MVP features, defer nice-to-haves

---

## Notes & Decisions

### Session Notes
**2025-10-19:** Documentation structure created. Ready to begin Sprint 1.

### Key Decisions
- **Database:** Using PostgreSQL with Prisma ORM (confirmed)
- **State Management:** Zustand for frontend routing state (confirmed)
- **UI Framework:** Ant Design for routing components (confirmed)
- **API Versioning:** All new endpoints under `/api/v1/routings` (confirmed)

---

## How to Use This Tracker

### Starting a New Session
1. Review "Quick Status Dashboard" to see current progress
2. Check "Current Sprint" to know which tasks to focus on
3. Review any blockers or notes from previous session

### During Work
1. Check off tasks as you complete them: `- [x] Task description`
2. Update progress percentages in sprint headers
3. Add notes in "Session Notes" section with date

### Ending a Session
1. Update "Last Updated" date at top
2. Update "Overall Progress" percentage
3. Document any blockers or risks discovered
4. Note where to continue in next session

### Reporting Progress
- Use "Quick Status Dashboard" for high-level status reports
- Reference task IDs (e.g., "1.6", "2.15") in commit messages
- Update sprint status icons as work progresses

---

**This document is the source of truth for implementation progress.**
**Update it frequently and reference it at the start of each Claude Code session.**
