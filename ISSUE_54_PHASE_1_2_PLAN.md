# Issue #54: Hierarchical Cause Code System for NCR Root Cause Analysis
# Phase 1-2 Implementation Plan

**Issue**: #54 - Hierarchical Cause Code System for NCR Root Cause Analysis
**Category**: Quality Management
**Foundation Level**: L1 (Essential Capabilities)
**Business Value**: 8/10
**Effort Estimate**: 5/10 (Phase 1-2 = ~40% of total)
**Strategic Focus**: Quality Management
**Status**: Phase 1-2 Foundation (In Progress)

---

## Executive Summary

This issue implements a configurable hierarchical cause code system for standardizing root cause categorization in NCRs. Phase 1-2 establishes the foundation for:

1. **Hierarchical Cause Code System**: Multi-level (2-10 levels) configurable taxonomy
2. **Global & Site-Specific Codes**: Support for global library + site-specific extensions
3. **Multi-Select Root Causes**: Support for multiple causes per NCR with weighted attribution
4. **Versioning & Audit Trail**: Complete change history tracking
5. **API Framework**: RESTful endpoints for cause code management
6. **UI Components**: Tree view and hierarchical selection interface

**Phase 1-2 Scope** (~40% of effort):
- Type definitions and data models
- Core CauseCodeService for hierarchy navigation
- CauseCodeConfigService for configuration
- Database schema with Prisma models
- Basic API endpoints (CRUD + hierarchy operations)
- Frontend tree view and cascading dropdown components
- Versioning and history tracking foundation
- Integration test framework

**Phase 3-8 Scope** (~60% of effort, future):
- Advanced UI features (drag-drop, bulk operations)
- Data migration tools (free-text to structured codes)
- Integration with Pareto analysis and SPC
- CAPA triggering automation
- Advanced reporting and analytics
- Performance optimization for 10K+ codes

---

## Current State

### Existing NCR System
The current NCR system (see Issue #55) includes:
- Free-text `rootCause` field in NonConformanceReport
- No standardized taxonomy
- Difficult to perform trend analysis
- Cannot generate meaningful Pareto analysis

### What Needs to Change
- Replace free-text with structured cause codes
- Support multi-level hierarchy (2-10 levels)
- Global + site-specific cause codes
- Versioning and history tracking
- Weighted multi-cause attribution

---

## Phase 1-2 Architecture

### 1. Type Definitions (src/types/quality.ts - ~400 lines)

#### Cause Code Enums and Interfaces

```typescript
// ✅ GITHUB ISSUE #54: Hierarchical Cause Code System - Phase 1-2

/**
 * Cause code scope (global vs site-specific)
 */
export enum CauseCodeScope {
  GLOBAL = 'GLOBAL',
  SITE_SPECIFIC = 'SITE_SPECIFIC'
}

/**
 * Cause code status (active, inactive, deprecated)
 */
export enum CauseCodeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED'
}

/**
 * Change types for cause code versioning
 */
export enum CauseCodeChangeType {
  CREATED = 'CREATED',
  MODIFIED = 'MODIFIED',
  DEPRECATED = 'DEPRECATED',
  RESTORED = 'RESTORED',
  DELETED = 'DELETED'
}

/**
 * Hierarchical cause code configuration
 */
export interface CauseCodeHierarchyConfig {
  id: string;
  siteId?: string;                    // null = global config
  numberOfLevels: number;             // 2-10
  levelNames: string[];               // e.g., ["Category", "Subcategory", "Specific Cause"]
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cause code definition
 */
export interface CauseCode {
  id: string;
  code: string;                       // MAT-001, PROC-005, etc.
  name: string;
  description?: string;
  level: number;                      // 1, 2, 3, etc.
  parentCauseCodeId?: string;         // null for top-level
  scope: CauseCodeScope;
  siteId?: string;                    // required if SITE_SPECIFIC
  status: CauseCodeStatus;
  effectiveDate?: Date;
  expirationDate?: Date;
  capaRequired: boolean;              // whether this cause mandates CAPA
  notificationRecipients?: string[];  // user IDs or emails
  displayOrder?: number;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cause code with navigation (for tree view)
 */
export interface CauseCodeNode extends CauseCode {
  children?: CauseCodeNode[];         // child nodes for tree rendering
  isExpanded?: boolean;               // for UI state
  childCount?: number;                // number of direct children
}

/**
 * Cause code change history
 */
export interface CauseCodeHistory {
  id: string;
  causeCodeId: string;
  version: number;
  changeType: CauseCodeChangeType;
  changedFields: Record<string, { oldValue: any; newValue: any }>;
  changeReason?: string;
  changedBy: string;
  changedAt: Date;
}

/**
 * NCR cause mapping (multiple causes per NCR)
 */
export interface NCRCauseMapping {
  id: string;
  ncrId: string;
  causeCodeId: string;
  isPrimary: boolean;                 // primary vs contributing cause
  attribution?: number;               // 0-100 percentage
  additionalNotes?: string;
  createdAt: Date;
}

/**
 * Enhanced NonConformanceReport with cause codes
 */
export interface NonConformanceReportWithCauses extends NonConformanceReport {
  rootCause?: string;                 // DEPRECATED: kept for backward compatibility
  causeMappings: NCRCauseMapping[];  // NEW: structured cause codes
  primaryCauseCode?: CauseCode;      // resolved primary cause
  allCauseCodes?: CauseCode[];       // all selected causes resolved
}

/**
 * Cause code search result
 */
export interface CauseCodeSearchResult {
  id: string;
  code: string;
  name: string;
  level: number;
  breadcrumb: string[];              // path from root to this node
  scope: CauseCodeScope;
  status: CauseCodeStatus;
  matchType: 'code' | 'name' | 'description';
}

/**
 * Hierarchy validation result
 */
export interface HierarchyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### 2. Core Services (Phase 1-2)

#### 2.1 CauseCodeService (src/services/CauseCodeService.ts - ~500 lines)

**Purpose**: Core cause code hierarchy navigation and operations

**Key Methods**:
```typescript
class CauseCodeService {
  // Query operations
  getCauseCodeById(id: string): Promise<CauseCode>
  getCauseCodeByCode(code: string, siteId?: string): Promise<CauseCode>
  getCauseCodesByLevel(level: number, siteId?: string): Promise<CauseCode[]>
  getChildCodes(parentId: string): Promise<CauseCode[]>
  getRootCodes(siteId?: string): Promise<CauseCode[]>

  // Hierarchy navigation
  getHierarchyPath(causeCodeId: string): Promise<CauseCode[]>  // path from root to node
  getHierarchyTree(siteId?: string, maxDepth?: number): Promise<CauseCodeNode[]>
  getSubtree(parentId: string, maxDepth?: number): Promise<CauseCodeNode>

  // Create/Update
  createCauseCode(data: CreateCauseCodeInput, createdBy: string): Promise<CauseCode>
  updateCauseCode(id: string, data: UpdateCauseCodeInput, updatedBy: string): Promise<CauseCode>
  deprecateCauseCode(id: string, reason?: string, deprecatedBy?: string): Promise<CauseCode>

  // Validation
  validateHierarchy(rootId?: string): Promise<HierarchyValidationResult>
  validateCauseCodeData(data: CreateCauseCodeInput): Promise<ValidationResult>

  // Versioning
  getCauseCodeHistory(id: string): Promise<CauseCodeHistory[]>
  restoreCauseCode(id: string, version: number, restoredBy: string): Promise<CauseCode>

  // Bulk operations
  bulkCreateCauseCodes(codes: CreateCauseCodeInput[], createdBy: string): Promise<CauseCode[]>
  bulkUpdateStatus(ids: string[], status: CauseCodeStatus, updatedBy: string): Promise<CauseCode[]>

  // Search and filtering
  searchCauseCodes(query: string, siteId?: string): Promise<CauseCodeSearchResult[]>
  filterCauseCodes(filter: CauseCodeFilter): Promise<CauseCode[]>
}
```

**Implementation Notes**:
- Uses recursive tree traversal for hierarchy navigation
- Caches frequently accessed cause codes
- Validates no circular references in hierarchy
- Tracks all changes in history table
- Supports both global and site-specific scopes

#### 2.2 CauseCodeConfigService (src/services/CauseCodeConfigService.ts - ~300 lines)

**Purpose**: Manage hierarchy configuration per site/global

**Key Methods**:
```typescript
class CauseCodeConfigService {
  // Configuration Management
  getConfigBySite(siteId: string): Promise<CauseCodeHierarchyConfig>
  getGlobalConfig(): Promise<CauseCodeHierarchyConfig>
  createOrUpdateConfig(config: CauseCodeHierarchyConfig): Promise<CauseCodeHierarchyConfig>

  // Validation
  validateLevelCount(numberOfLevels: number): Promise<ValidationResult>
  validateLevelNames(names: string[]): Promise<ValidationResult>

  // Defaults
  getDefaultConfig(): CauseCodeHierarchyConfig
  initializeGlobalConfig(): Promise<CauseCodeHierarchyConfig>
  initializeSiteConfig(siteId: string): Promise<CauseCodeHierarchyConfig>
}
```

**Implementation Notes**:
- Default configuration: 3 levels (Category, Subcategory, Specific Cause)
- Allows 2-10 levels
- Caches configurations
- Supports site-level overrides

### 3. Database Schema (Prisma Models - ~200 lines)

```prisma
// Cause Code Hierarchy Configuration
model CauseCodeHierarchyConfig {
  id              String    @id @default(cuid())
  siteId          String?   // null = global
  numberOfLevels  Int       // 2-10
  levelNames      Json      // string array
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([siteId])
}

// Cause Code Definition
model CauseCode {
  id                      String    @id @default(cuid())
  code                    String    // MAT-001, PROC-005
  name                    String
  description             String?
  level                   Int
  parentCauseCodeId       String?
  scope                   String    // GLOBAL, SITE_SPECIFIC
  siteId                  String?
  status                  String    // ACTIVE, INACTIVE, DEPRECATED
  effectiveDate           DateTime?
  expirationDate          DateTime?
  capaRequired            Boolean   @default(false)
  notificationRecipients  Json?     // string array
  displayOrder            Int?
  version                 Int       @default(1)
  createdBy               String
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  parent              CauseCode?         @relation("CauseCodeHierarchy", fields: [parentCauseCodeId], references: [id])
  children            CauseCode[]        @relation("CauseCodeHierarchy")
  ncrMappings         NCRCauseMapping[]
  history             CauseCodeHistory[]

  @@unique([code, scope, siteId])
  @@index([parentCauseCodeId])
  @@index([level])
  @@index([status])
  @@index([scope])
  @@index([siteId])
}

// Cause Code Change History
model CauseCodeHistory {
  id              String    @id @default(cuid())
  causeCodeId     String
  version         Int
  changeType      String    // CREATED, MODIFIED, DEPRECATED, RESTORED
  changedFields   Json      // {field: {oldValue, newValue}}
  changeReason    String?
  changedBy       String
  changedAt       DateTime  @default(now())

  causeCode       CauseCode @relation(fields: [causeCodeId], references: [id], onDelete: Cascade)

  @@index([causeCodeId])
  @@index([changedAt])
}

// NCR Cause Mapping (Multiple causes per NCR)
model NCRCauseMapping {
  id                String    @id @default(cuid())
  ncrId             String
  causeCodeId       String
  isPrimary         Boolean   @default(false)
  attribution       Int?      // 0-100 percentage
  additionalNotes   String?
  createdAt         DateTime  @default(now())

  ncr               NCR       @relation(fields: [ncrId], references: [id], onDelete: Cascade)
  causeCode         CauseCode @relation(fields: [causeCodeId], references: [id])

  @@unique([ncrId, causeCodeId])
  @@index([ncrId])
  @@index([causeCodeId])
  @@index([isPrimary])
}

// Update existing NCR model
model NCR {
  // ... existing fields ...
  rootCause       String?   // DEPRECATED: backward compatibility
  causeMappings   NCRCauseMapping[]  // NEW: structured causes
}
```

### 4. API Endpoints (Phase 1-2)

```
// Configuration
GET    /api/cause-codes/config
PUT    /api/cause-codes/config

// CRUD Operations
GET    /api/cause-codes
GET    /api/cause-codes/:id
POST   /api/cause-codes
PUT    /api/cause-codes/:id
DELETE /api/cause-codes/:id (soft delete/deprecate)

// Hierarchy Operations
GET    /api/cause-codes/:id/children
GET    /api/cause-codes/:id/hierarchy-path
GET    /api/cause-codes/tree (full hierarchy tree)
GET    /api/cause-codes/:id/subtree

// History and Versioning
GET    /api/cause-codes/:id/history
POST   /api/cause-codes/:id/restore/:version

// Search
GET    /api/cause-codes/search?q=

// Bulk Operations
POST   /api/cause-codes/bulk
POST   /api/cause-codes/import (CSV/JSON)

// NCR Cause Mappings
POST   /api/ncrs/:ncrId/causes
GET    /api/ncrs/:ncrId/causes
PUT    /api/ncrs/:ncrId/causes/:mappingId
DELETE /api/ncrs/:ncrId/causes/:mappingId
```

### 5. Frontend Components (Phase 1-2)

**Components to Implement**:
1. **CauseCodeTreeView** - Hierarchical tree navigation with expand/collapse
2. **CauseCodeCascadingDropdown** - Multi-level dropdown for selection
3. **CauseCodeSearch** - Autocomplete search across hierarchy
4. **CauseCodeEditor** - Create/edit cause code modal
5. **NCRCauseMappingSelector** - Multi-select with weighted attribution
6. **CauseCodeHistoryViewer** - View change history

**Key Features**:
- Tree view with lazy loading for large hierarchies
- Cascading dropdowns for multi-level selection
- Autocomplete search
- Drag-and-drop for reordering (with safeguards)
- Visual indicators (global/site-specific, active/deprecated)
- Mobile-friendly design

### 6. Integration Tests (Phase 1-2)

**Test Coverage Areas**:
- Hierarchy validation (no circular references)
- Multi-level navigation (2-10 levels)
- Global vs site-specific scope rules
- Versioning and history tracking
- Multi-select cause mapping
- Weighted attribution calculation
- Search and filtering
- Bulk operations

**Target**: 80%+ code coverage for Phase 1-2

### 7. Pre-populated Global Cause Codes

**Default Hierarchy Structure** (3 levels):

```
Level 1: Category
├── Material
├── Process
├── Equipment
├── Human Error
├── Design
├── Environmental
└── Documentation

Level 2: Subcategory (examples)
Material
├── Raw Material
├── Packaging
├── Component
└── Supplier Quality

Process
├── Setup Error
├── Process Drift
├── Incorrect Parameters
└── Missing Step

... (and so on)

Level 3: Specific Cause (examples)
Raw Material
├── Incorrect Grade
├── Contamination
└── Supplier Defect

Incorrect Parameters
├── Wrong Temperature
├── Wrong Pressure
└── Wrong Speed

... (and so on)
```

---

## Phase 1-2 Deliverables

### Code Files

1. **Type Definitions** (src/types/quality.ts - ~400 lines)
   - Cause code enums and interfaces
   - NCR cause mapping types
   - Search and validation result types

2. **Services** (2 files, ~800 lines)
   - CauseCodeService.ts (~500 lines) - Hierarchy operations
   - CauseCodeConfigService.ts (~300 lines) - Configuration management

3. **Database** (Prisma migrations - ~200 lines)
   - CauseCodeHierarchyConfig model
   - CauseCode model with parent relationship
   - CauseCodeHistory model for versioning
   - NCRCauseMapping model for multi-cause support
   - Updated NCR model to reference cause mappings

4. **API Routes** (src/routes/causeCodeRoutes.ts - ~400 lines)
   - 15+ endpoints for cause code management
   - Hierarchy query endpoints
   - Bulk operations and search

5. **Frontend Components** (6 components, ~1,200 lines)
   - Tree view, cascading dropdown, search
   - Editor modal, cause mapping selector
   - History viewer

6. **Tests** (src/tests/services/cause-codes/ - ~1,000 lines)
   - Service unit tests
   - Hierarchy validation tests
   - API integration tests
   - Component tests

7. **Seed Data** (scripts/seed-cause-codes.ts - ~300 lines)
   - Pre-populated global cause codes
   - Example site-specific codes
   - Test data generation

### Documentation

1. **ISSUE_54_PHASE_1_2_PLAN.md** (this file - ~1,000 lines)
   - Complete architecture design
   - Database schema
   - API specifications

2. **Cause Code Administrator Guide** (docs/quality/cause-codes-admin.md - ~300 lines)
   - Configuring hierarchy depth
   - Creating and managing cause codes
   - Best practices for taxonomy design

3. **Cause Code User Guide** (docs/quality/cause-codes-user.md - ~200 lines)
   - Using cause code dropdown
   - Multi-cause selection
   - Weighted attribution

---

## Phase 3-8 Roadmap (Future)

### Phase 3: Data Migration (1-2 weeks)
- Text analysis to suggest matching cause codes for free-text causes
- Manual review workflow for migration
- Migration progress dashboard
- Backward compatibility maintenance

### Phase 4: Advanced UI Features (1 week)
- Drag-and-drop reorganization
- Bulk import/export (CSV, JSON)
- Impact analysis before deletion
- Recently used quick access

### Phase 5: Integration with Quality Management (1-2 weeks)
- CAPA triggering based on cause code
- Pareto analysis by cause code
- Trend analysis (increasing/decreasing causes)
- Cross-site comparison

### Phase 6: Analytics & Reporting (1 week)
- Cause code effectiveness metrics
- Corrective action success rates
- Root cause trending
- Predictive cause analysis

### Phase 7: Advanced Features (1 week)
- AI-powered cause code suggestions
- Pattern detection in cause codes
- Supply chain impact analysis
- Supplier quality integration

### Phase 8: Performance & Scale (1 week)
- Optimize for 10,000+ cause codes
- Caching strategy
- Query optimization
- Archived cause codes management

---

## Testing Strategy

### Unit Tests (Per Service)
- 40+ tests for CauseCodeService
- 20+ tests for CauseCodeConfigService
- Hierarchy validation logic
- Versioning and history tracking

### Integration Tests
- 30+ API endpoint tests
- Hierarchy operations (CRUD, traversal)
- Multi-cause mapping scenarios
- Bulk operations

### UI Component Tests
- Tree view rendering and interaction
- Cascading dropdown selection
- Search functionality
- Modal workflows

**Test Coverage Goal**: 80%+ for Phase 1-2

---

## Acceptance Criteria

### Functional Requirements
- ✅ Configurable hierarchy (2-10 levels) with level names
- ✅ Global cause code library with pre-populated codes
- ✅ Site-specific cause codes extend global hierarchy
- ✅ Cause code versioning with complete change history
- ✅ Multi-select root causes with weighted attribution per NCR
- ✅ Tree view and cascading dropdown for selection
- ✅ Hierarchical search and filtering
- ✅ No circular references allowed
- ✅ Historical NCRs retain cause code version

### Code Quality
- ✅ TypeScript strict mode (no `any`)
- ✅ Comprehensive JSDoc comments
- ✅ 80%+ test coverage
- ✅ No linting errors
- ✅ Proper error handling

### Performance
- ✅ Tree queries: <100ms (p95) for 1,000 codes
- ✅ Hierarchy path: <50ms (p95)
- ✅ Search: <200ms (p95)
- ✅ Caching of frequently accessed codes

### Documentation
- ✅ API documentation (Swagger/OpenAPI)
- ✅ Service documentation
- ✅ Configuration guide
- ✅ User and administrator guides
- ✅ Testing guide

---

## Known Issues to Address

None at Phase 1-2 start. This is a greenfield implementation.

---

## Dependencies

### Existing Systems Used
- NCR model (Issue #55) - Enhanced NCR system
- UnifiedApprovalIntegration (Issue #147) - For CAPA triggering (Phase 3)
- PrismaClient - ORM

### External Dependencies
- `uuid` - ID generation
- `zod` - Request validation (optional)
- React tree component library (e.g., react-complex-tree) - For UI

---

## Success Metrics

### Adoption Metrics
- Cause codes used in 80%+ of new NCRs by end of Phase 2
- Average selection time < 10 seconds
- User satisfaction score > 4/5

### Quality Metrics
- Cause code consistency (80%+ of similar issues use same codes)
- Pareto analysis accuracy (top 20% of causes account for 80% of issues)

### Performance Metrics
- API response times: <100ms (p95)
- UI interaction response: <200ms
- Search performance: <200ms for 1,000 codes

---

## Timeline (Phase 1-2)

**Estimated Duration**: 2-3 weeks

### Week 1
- Day 1-2: Type definitions and data models
- Day 3-4: Core services (CauseCodeService, ConfigService)
- Day 5: Database schema and migrations

### Week 2
- Day 1-2: API endpoints implementation
- Day 3-4: Frontend components (tree view, dropdowns)
- Day 5: Initial testing

### Week 3
- Day 1-2: Complete test suite
- Day 3-4: Documentation
- Day 5: Code review and polish

---

## References

- GitHub Issue #54: Hierarchical Cause Code System
- GitHub Issue #55: Enhanced NCR Workflow States (uses cause codes)
- GitHub Issue #56: CAPA Tracking (blocked by this issue)
- GitHub Issue #57: 8D Problem Solving (blocked by this issue)
- GitHub Issue #58: Quality Analytics (blocked by this issue)
- GitHub Issue #266: Teamcenter Quality MRB Integration (blocked by this issue)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-31
**Author**: Claude Code
**Status**: Phase 1-2 Planning Complete
