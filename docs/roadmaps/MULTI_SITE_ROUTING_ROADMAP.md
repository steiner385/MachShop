# Multi-Site/Multi-Part Routing Implementation Roadmap

**Version:** 1.0
**Created:** 2025-10-19
**Status:** NOT STARTED
**Target Completion:** 8 weeks (6 sprints)

---

## Executive Summary

The MES application currently has **45% multi-site maturity** with critical gaps preventing true multi-site/multi-part manufacturing operations. This roadmap outlines the path to full multi-site routing capabilities through 6 sprints over 8 weeks.

### Current State Assessment

**✅ STRENGTHS:**
- Complete ISA-95 equipment hierarchy (Enterprise → Site → Area → WorkCenter → WorkUnit → Equipment)
- WorkOrder and ProductionSchedule models have `siteId` support
- ProductionScheduleService properly filters by site
- Database foundation is PostgreSQL with proper indexing

**❌ CRITICAL GAPS:**
- Routing model has NO `siteId` → Cannot create site-specific manufacturing routes
- Part model has NO routing relationship → Cannot associate parts with routes
- RoutingOperation has NO `processSegmentId` → Cannot reuse standard operations
- NO RoutingService or REST API → Cannot manage routes programmatically
- Frontend has ZERO site awareness → No site selector, no filtering
- ProcessSegment (777 lines of service code) is isolated and unused for routing

### Vision

Enable the MES to support **multi-site, multi-part manufacturing** where:
1. Each site can manufacture different parts with unique processes
2. Same part can have different manufacturing routes at different sites
3. Standard operations (ProcessSegments) can be reused across multiple routes
4. Users can filter and operate within a specific site context
5. Routing definitions are version-controlled and lifecycle-managed

---

## High-Level Timeline

| Sprint | Duration | Focus Area | Key Deliverables |
|--------|----------|------------|------------------|
| **Sprint 1** | Week 1 | Database Foundation | Routing schema redesign, migrations, seed data |
| **Sprint 2** | Weeks 2-3 | Backend Services & APIs | RoutingService, REST API endpoints (20+ endpoints) |
| **Sprint 3** | Week 4 | Frontend Site Context | Site selector component, context provider |
| **Sprint 4** | Weeks 5-6 | Routing Management UI | Route list/create/detail pages, process segment builder |
| **Sprint 5** | Week 7 | Security & Permissions | Site-scoped permissions, access control |
| **Sprint 6** | Week 8 | Testing & Documentation | Comprehensive testing, user guides |

**Total Effort:** 8 weeks
**Team Size:** 1-2 developers
**Risk Level:** Medium-High (database migration + API changes)

---

## Sprint Breakdown

### Sprint 1: Database Foundation (Week 1)
**Objective:** Establish robust multi-site routing schema

**Deliverables:**
- [ ] Updated Routing model with `siteId`, `version`, `lifecycleState`
- [ ] New RoutingStep model (replaces RoutingOperation)
- [ ] RoutingStepDependency model for operation sequencing
- [ ] PartSiteAvailability model (which sites can manufacture which parts)
- [ ] Updated ProcessSegment model with `siteId` and `isStandardOperation`
- [ ] Migration script with rollback plan
- [ ] Seed data: 3 sites, 5 parts, 10 process segments, 5 routes

**Files Modified:**
- `prisma/schema.prisma` (~200 line changes)
- `prisma/migrations/YYYYMMDD_add_multi_site_routing/migration.sql`
- `prisma/seed.ts` (add routing seed data)

**Acceptance Criteria:**
- Migration runs successfully without errors
- All models have proper indexes on `siteId`
- Foreign key constraints properly defined
- Rollback script tested and documented

**Dependencies:** None
**Risk:** Medium - Data migration may affect existing WorkOrders
**Mitigation:** Create migration on staging first, full database backup before prod migration

---

### Sprint 2: Backend Services & APIs (Weeks 2-3)
**Objective:** Build complete RoutingService and REST API layer

**Deliverables:**
- [ ] `src/services/RoutingService.ts` (500+ lines) - Complete CRUD for routing
- [ ] `src/routes/routings.ts` (300+ lines) - 20+ REST API endpoints
- [ ] Updated `src/services/ProductService.ts` - Add site availability methods
- [ ] Updated `src/services/ProcessSegmentService.ts` - Add site filtering
- [ ] TypeScript types for routing in `src/types/routing.ts`
- [ ] API integration tests

**Key Endpoints:**
```
GET    /api/v1/routings?siteId={id}&partId={id}
POST   /api/v1/routings
GET    /api/v1/routings/:id
PUT    /api/v1/routings/:id
DELETE /api/v1/routings/:id
GET    /api/v1/routings/:id/steps
POST   /api/v1/routings/:id/steps
PUT    /api/v1/routings/:id/steps/:stepId
DELETE /api/v1/routings/:id/steps/:stepId
POST   /api/v1/routings/:id/release (lifecycle transition)
GET    /api/v1/parts/:id/routings?siteId={id}
GET    /api/v1/parts/:id/site-availability
POST   /api/v1/parts/:id/site-availability
```

**Acceptance Criteria:**
- All CRUD operations work for Routing and RoutingStep
- Site filtering enforced on all queries
- Route versioning works correctly
- Lifecycle state machine prevents invalid transitions
- API validates siteId access per user
- 90%+ test coverage on RoutingService

**Dependencies:** Sprint 1 complete
**Risk:** High - New API surface area, breaking changes possible
**Mitigation:** Version API endpoints (v1), maintain backward compatibility

---

### Sprint 3: Frontend Site Context (Week 4)
**Objective:** Add site awareness to frontend application

**Deliverables:**
- [ ] `frontend/src/contexts/SiteContext.tsx` - React Context for current site
- [ ] `frontend/src/components/Site/SiteSelector.tsx` - Site dropdown selector
- [ ] `frontend/src/hooks/useSite.ts` - Hook to access site context
- [ ] Updated `frontend/src/components/Layout/MainLayout.tsx` - Include site selector
- [ ] Site preference persistence (localStorage)
- [ ] Update existing pages to respect site context

**Component Specifications:**
```typescript
// SiteSelector displays in header
<SiteSelector
  currentSiteId={currentSite?.id}
  onSiteChange={(siteId) => setSite(siteId)}
  showAllSitesOption={true}
/>

// Context provider
<SiteProvider>
  <App />
</SiteProvider>

// Usage in components
const { currentSite, setCurrentSite, allSites } = useSite();
```

**Acceptance Criteria:**
- Site selector appears in main navigation header
- Site selection persists across page refreshes
- Changing site reloads relevant data
- "All Sites" option available for admin users
- Site context accessible via `useSite()` hook
- No console errors or warnings

**Dependencies:** Sprint 2 APIs available
**Risk:** Low - Additive changes only
**Mitigation:** Feature flag to enable/disable site selector

---

### Sprint 4: Routing Management UI (Weeks 5-6)
**Objective:** Complete routing management interface

**Deliverables:**
- [ ] `frontend/src/pages/Routing/RoutingListPage.tsx` - Browse all routes
- [ ] `frontend/src/pages/Routing/RoutingCreatePage.tsx` - Create new route
- [ ] `frontend/src/pages/Routing/RoutingDetailPage.tsx` - View/edit route details
- [ ] `frontend/src/components/Routing/RoutingStepBuilder.tsx` - Drag-drop step builder
- [ ] `frontend/src/api/routing.ts` - API client methods
- [ ] `frontend/src/store/routingStore.ts` - Zustand state management
- [ ] `frontend/src/types/routing.ts` - TypeScript interfaces
- [ ] Updated breadcrumbs to support routing pages
- [ ] Updated navigation menu to include "Routing" section

**Page Specifications:**

**RoutingListPage:**
- Table columns: Part Number, Routing Number, Site, Version, State, Actions
- Filters: Site, Part, Lifecycle State, Active/Inactive
- Search by routing number or part number
- Pagination (20 per page)
- Actions: View, Edit, Clone, Change State, Delete

**RoutingCreatePage:**
- Part selector (autocomplete)
- Site selector (dropdown, respects user site access)
- Version input (default: 1.0)
- Description textarea
- "Save as Draft" and "Create & Release" buttons
- Validation: part+site+version must be unique

**RoutingDetailPage:**
- Header: Part info, site, version, state badge, lifecycle buttons
- Tabs:
  - Steps: Table of routing steps with drag-drop reordering
  - Dependencies: Visual graph of step dependencies
  - History: Audit log of changes
  - BOM: Materials consumed by route (future)
- Step builder: Add process segment, configure timing overrides
- Lifecycle transitions: DRAFT → REVIEW → RELEASED → PRODUCTION

**Acceptance Criteria:**
- Can create a complete route with 5+ steps
- Can reorder steps via drag-drop
- Can transition route through all lifecycle states
- Validation prevents duplicate routes
- All CRUD operations work end-to-end
- Responsive design works on tablet/desktop
- E2E test covers create → edit → release workflow

**Dependencies:** Sprint 3 complete
**Risk:** Medium - Complex UI interactions
**Mitigation:** Iterative development, UX feedback after week 5

---

### Sprint 5: Security & Permissions (Week 7)
**Objective:** Implement site-scoped access control

**Deliverables:**
- [ ] User model extended with `primarySiteId` and `allowedSites[]`
- [ ] Updated `src/middleware/auth.ts` - Site-based access control
- [ ] Site-scoped permissions (e.g., `routings.create@dallas`)
- [ ] Row-level security helpers
- [ ] Audit logging for site context
- [ ] Frontend permission checks in routing UI
- [ ] Admin interface to manage user site access

**Permission Examples:**
```typescript
// Global permission (admin)
hasPermission(user, 'routings.create')  // Can create at any site

// Site-scoped permission
hasPermission(user, 'routings.create', siteId: 'dallas-plant')

// User with limited site access
user.allowedSites = ['dallas-plant', 'austin-plant']
// Cannot access 'shanghai-plant' data
```

**Acceptance Criteria:**
- Users can only see data for their allowed sites
- API endpoints enforce site access restrictions
- Attempting to access unauthorized site returns 403
- Admin users can assign site access to other users
- Audit logs capture site context for all actions
- Security tests verify site isolation

**Dependencies:** Sprints 1-4 complete
**Risk:** High - Security vulnerabilities if implemented incorrectly
**Mitigation:** Security code review, penetration testing

---

### Sprint 6: Testing & Documentation (Week 8)
**Objective:** Comprehensive testing and documentation

**Deliverables:**
- [ ] Unit tests for RoutingService (90%+ coverage)
- [ ] Integration tests for routing APIs
- [ ] E2E tests for routing UI workflows
- [ ] Performance tests for multi-site queries
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User guide: "Managing Manufacturing Routes"
- [ ] Admin guide: "Configuring Multi-Site Access"
- [ ] Migration guide for existing data
- [ ] Architecture documentation updates

**Test Coverage Requirements:**
- RoutingService: 90%+
- Routing API routes: 85%+
- Frontend components: 75%+
- E2E critical paths: 100% (create, edit, release, delete routes)

**Documentation:**
1. **API Documentation** (`docs/api/routing-api.md`)
   - All endpoint specifications
   - Request/response examples
   - Error codes and handling

2. **User Guide** (`docs/guides/routing-management-user-guide.md`)
   - How to create a route
   - How to add process steps
   - How to manage route versions
   - How to transition lifecycle states

3. **Admin Guide** (`docs/guides/multi-site-admin-guide.md`)
   - How to set up new sites
   - How to assign users to sites
   - How to manage site-specific configurations

4. **Migration Guide** (`docs/guides/migration-to-multi-site-routing.md`)
   - How to migrate existing routes
   - Data cleanup checklist
   - Common issues and solutions

**Acceptance Criteria:**
- All test suites pass consistently
- Test coverage meets requirements
- Documentation reviewed and approved
- Zero critical bugs remaining
- Performance benchmarks met (see below)

**Dependencies:** Sprints 1-5 complete
**Risk:** Low - Testing and documentation phase
**Mitigation:** Start documentation early in parallel with development

---

## Success Metrics

### Functional Metrics
- [ ] Can create site-specific routes for 100% of parts
- [ ] Can reuse process segments across multiple routes
- [ ] Users can filter all data by site context
- [ ] Route lifecycle management (DRAFT → PRODUCTION) works
- [ ] Site access control prevents unauthorized access

### Performance Metrics
- [ ] Route list page loads < 500ms with 1000+ routes
- [ ] Route creation completes < 1 second
- [ ] Multi-site filtering adds < 100ms overhead
- [ ] Database queries use proper indexes (verified via EXPLAIN)

### Quality Metrics
- [ ] 0 critical bugs
- [ ] < 3 high-priority bugs
- [ ] 90%+ test coverage on core routing logic
- [ ] All E2E workflows passing
- [ ] Zero security vulnerabilities

### Adoption Metrics
- [ ] 2+ users successfully create routes in UAT
- [ ] Documentation feedback score > 4/5
- [ ] < 2 hours training time required for power users

---

## Dependencies & Prerequisites

### Technical Prerequisites
- [x] PostgreSQL database operational
- [x] Prisma ORM configured
- [x] React frontend framework
- [x] Authentication system in place
- [ ] Staging environment for testing migrations

### Knowledge Prerequisites
- [ ] Team understands ISA-95 process modeling
- [ ] Team familiar with Prisma migrations
- [ ] UX designer available for routing UI wireframes

### External Dependencies
- None (all work self-contained within MES application)

---

## Risk Register

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| Data migration corrupts existing WorkOrders | Medium | High | Test on staging, full backups, rollback script | Dev Lead |
| Performance degradation on large datasets | Medium | Medium | Add composite indexes, implement caching | Backend Dev |
| UI complexity overwhelms users | Low | Medium | Iterative UX testing, progressive disclosure | Frontend Dev |
| Breaking changes affect integrations | High | High | Version APIs, maintain backward compatibility | API Lead |
| Security vulnerability in site access control | Low | Critical | Security code review, penetration testing | Security |
| Sprint 2 overruns into Sprint 3 | Medium | Medium | Buffer week built into timeline, prioritize MVP | PM |

---

## Rollback Plan

If critical issues arise during implementation:

### Sprint 1 Rollback (Database)
```sql
-- Rollback migration
npm run prisma migrate reset

-- Restore from backup
pg_restore -d mes_db backup.sql
```

### Sprint 2 Rollback (Backend)
- Remove routing API routes from `src/index.ts`
- Deploy previous version of backend
- No data loss (database unchanged from Sprint 1)

### Sprint 3-4 Rollback (Frontend)
- Feature flag: `ENABLE_MULTI_SITE_ROUTING = false`
- Revert to previous frontend build
- Site selector hidden, existing functionality unaffected

### Sprint 5 Rollback (Security)
- Revert user site access fields to nullable/optional
- Remove site-scoped permission checks
- Fallback to global permissions

---

## Communication Plan

### Weekly Status Updates
- **Audience:** Product Owner, Engineering Manager
- **Format:** Written status email
- **Contents:** Completed work, blockers, risks, next week plan

### Sprint Demos
- **Audience:** Stakeholders, QA team
- **Schedule:** End of each sprint
- **Format:** Live demo of working features

### Documentation Reviews
- **Audience:** Tech writers, QA team
- **Schedule:** Sprint 6
- **Format:** Documentation review sessions

---

## Go-Live Checklist

Before deploying to production:

### Pre-Deployment
- [ ] All sprints completed and accepted
- [ ] Test coverage requirements met
- [ ] Security review passed
- [ ] Performance benchmarks met
- [ ] Documentation complete and reviewed
- [ ] UAT completed with 2+ users
- [ ] Migration tested on staging (identical to prod data)
- [ ] Rollback plan tested and documented

### Deployment Day
- [ ] Database backup created
- [ ] Maintenance window scheduled and communicated
- [ ] Deploy database migration
- [ ] Deploy backend services
- [ ] Deploy frontend application
- [ ] Smoke tests pass
- [ ] Monitor for errors (24 hours)

### Post-Deployment
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Address any critical bugs within 48 hours
- [ ] Schedule retrospective meeting
- [ ] Update documentation based on feedback

---

## Next Steps

1. **Review this roadmap** with Product Owner and Engineering Manager
2. **Confirm sprint priorities** and adjust timeline if needed
3. **Assign sprint leads** for each sprint
4. **Set up staging environment** for Sprint 1 testing
5. **Schedule kickoff meeting** to review Sprint 1 detailed plan
6. **Begin Sprint 1** - Database Foundation

---

## References

- See `docs/sprints/` for detailed sprint plans
- See `docs/specs/` for technical specifications
- See `docs/adr/` for architecture decision records
- See `docs/PROGRESS_TRACKER.md` for real-time status

**Document Owner:** MES Development Team
**Last Updated:** 2025-10-19
**Next Review:** Start of each sprint
