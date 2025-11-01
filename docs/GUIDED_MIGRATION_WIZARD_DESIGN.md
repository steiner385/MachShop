# Issue #37: Guided Migration Wizard UI - Design & Implementation Plan

**Status:** Design Document & Implementation Roadmap
**Date:** October 31, 2025
**Scope:** User-friendly multi-step wizard for data migration from legacy MES systems

---

## Executive Summary

Issue #37 requires building an intuitive, step-by-step wizard UI that guides administrators through data migration from legacy MES systems. This design document outlines the complete architecture, technology stack, and phased implementation approach.

### Key Dependencies (Now Resolved ✅)
- **Issue #32** - Bulk Import Engine (provides file import functionality) - COMPLETED
- **Issue #33** - Data Validation Framework (provides validation infrastructure) - COMPLETED

### Core Features
- **8-Step Guided Workflow** - Entity selection → Upload → Validation → Import → Verification → Completion
- **Dependency Visualization** - Interactive graph showing entity relationships and import order
- **Session Persistence** - Save wizard progress, resume later, clone previous sessions
- **Migration Playbooks** - Pre-defined migration sequences (New Deployment, Legacy Replacement, Partial)
- **Prerequisites Checking** - Auto-validate dependencies before each step
- **Real-Time Progress** - Monitor import progress with percentage complete and time estimates
- **Error Recovery** - Detailed error messages, export errors, fix-and-resubmit workflow

---

## Architecture

### Frontend Architecture (React TypeScript)

```
MigrationWizard (Main Component)
├── WizardHeader
│   ├── ProgressIndicator (Step 1-8 with icons)
│   └── SessionInfo (Session name, playbook, time estimate)
├── WizardBody
│   ├── StepNavigator (Sidebar with step list, current highlight)
│   └── StepContent (Dynamic step component renderer)
│       ├── Step 1: EntitySelectionStep
│       ├── Step 2: TemplateDownloadStep
│       ├── Step 3: FieldMappingStep
│       ├── Step 4: DataUploadStep
│       ├── Step 5: ValidationStep
│       ├── Step 6: ImportExecutionStep
│       ├── Step 7: VerificationStep
│       └── Step 8: CompletionStep
└── WizardFooter
    ├── BackButton
    ├── SaveSessionButton
    └── NextButton / CompleteButton
```

### Database Schema (3 new models)

```typescript
model MigrationPlaybook {
  // Pre-defined migration sequences
  id: String                    // Unique identifier
  name: String                  // 'New Deployment', 'Legacy Replacement', etc.
  playbookType: String         // new-deployment | legacy-replacement | partial | custom
  entitySequence: String[]      // Ordered list: ['Site', 'Part', 'BOMItem', ...]
  estimatedDurationMinutes: Int // Time estimate
  isPublic: Boolean            // Available to all users
  isActive: Boolean            // Currently enabled
  createdBy: String            // User who created
}

model MigrationSession {
  // User's migration workflow in progress
  id: String
  name: String                          // Session name
  playbookId: String?                   // Linked playbook (if used)
  selectedEntities: String[]            // Entities user selected
  entitySequence: String[]              // Dependency-ordered sequence
  fieldMappings: Json?                  // Legacy field → MES field mappings
  uploadedFiles: Json?                  // Map of entity → fileId
  validationResults: Json?              // Validation results per entity
  importResults: Json?                  // Import results per entity
  currentStep: Int                      // Current wizard step (1-8)
  status: String                        // IN_PROGRESS | COMPLETED | FAILED | ABANDONED
  startedAt: DateTime
  completedAt?: DateTime
  createdBy: String                     // User who started migration
  checkpoints: MigrationCheckpoint[]    // Session restore points
}

model MigrationCheckpoint {
  // Save points within a migration session
  id: String
  sessionId: String
  stepNumber: Int                       // Which step this checkpoint is for
  checkpointNumber: Int                 // Sequential checkpoint number
  sessionStateJson: Json                // Full session state snapshot
  createdAt: DateTime
}
```

### Backend Services

```typescript
// MigrationSessionService - Manage wizard sessions
class MigrationSessionService {
  // Create new migration session
  async createSession(
    name: string,
    playbookId?: string
  ): Promise<MigrationSession>

  // Get session details
  async getSession(sessionId: string): Promise<MigrationSession>

  // Update session (step, entities, data)
  async updateSession(
    sessionId: string,
    updates: Partial<MigrationSession>
  ): Promise<MigrationSession>

  // Save checkpoint (auto-save on each step)
  async createCheckpoint(
    sessionId: string,
    stepNumber: number
  ): Promise<MigrationCheckpoint>

  // Resume from checkpoint
  async resumeFromCheckpoint(
    sessionId: string,
    checkpointId: string
  ): Promise<MigrationSession>

  // Clone existing session
  async cloneSession(
    sessionId: string,
    newName: string
  ): Promise<MigrationSession>

  // List user's sessions
  async listSessions(userId: string): Promise<MigrationSession[]>

  // Delete session
  async deleteSession(sessionId: string): Promise<void>
}

// DependencyResolver - Determine entity import order
class DependencyResolver {
  // Get dependencies for an entity
  static getEntityDependencies(entity: string): string[]

  // Validate that all dependencies are present
  static validateDependencies(
    entities: string[]
  ): { valid: boolean; missing: string[] }

  // Auto-sequence entities based on dependencies
  static sequenceEntities(entities: string[]): string[]

  // Get prerequisite entities that must be imported first
  static getPrerequisites(entity: string): string[]
}

// EntityCatalog - Metadata for all importable entities
class EntityCatalog {
  // Get all entities with metadata
  static getAllEntities(): EntityMetadata[]

  // Group entities by tier
  static getEntitiesByTier(tier: 'master' | 'transactional' | 'historical'): EntityMetadata[]

  // Get entity dependencies
  static getDependencies(entity: string): string[]
}
```

### API Endpoints

```typescript
// Session Management
POST   /api/v1/migration/sessions                    // Create new session
GET    /api/v1/migration/sessions                    // List user's sessions
GET    /api/v1/migration/sessions/:id                // Get session details
PUT    /api/v1/migration/sessions/:id                // Update session
DELETE /api/v1/migration/sessions/:id                // Delete session
POST   /api/v1/migration/sessions/:id/clone          // Clone session
POST   /api/v1/migration/sessions/:id/checkpoints    // Save checkpoint
POST   /api/v1/migration/sessions/:id/resume         // Resume from checkpoint

// Playbooks
GET    /api/v1/migration/playbooks                   // List available playbooks
GET    /api/v1/migration/playbooks/:id               // Get playbook details

// Utility Endpoints
POST   /api/v1/migration/wizard/validate-entities    // Validate entity selection
POST   /api/v1/migration/wizard/sequence-entities    // Get proper import sequence
GET    /api/v1/migration/wizard/entity-catalog       // Get entity metadata

// Integration Endpoints (use existing services)
POST   /api/v1/migration/wizard/download-templates   // Uses Issue #31 service
POST   /api/v1/migration/wizard/validate-data        // Uses Issue #33 service
POST   /api/v1/migration/wizard/import-data          // Uses Issue #32 service
```

---

## Implementation Phases

### Phase 1: Database Models & Session API (1 week)
**Deliverables:**
- Add MigrationSession, MigrationPlaybook, MigrationCheckpoint models to Prisma schema
- Run Prisma migration
- Create MigrationSessionService class
- Implement session CRUD endpoints
- Implement checkpoint save/restore logic
- Write service unit tests

**Files to Create:**
- `src/services/migration/MigrationSessionService.ts`
- `src/routes/migration/sessions.ts`
- `src/services/migration/DependencyResolver.ts`
- `src/__tests__/services/MigrationSessionService.test.ts`

**Acceptance Criteria:**
- Sessions persist to database
- Checkpoints save and restore correctly
- Cloning creates independent session
- All CRUD operations work
- Proper authorization checks in place

---

### Phase 2: Dependency Resolution & Entity Catalog (1 week)
**Deliverables:**
- Build dependency detection logic for all entities
- Create EntityCatalog with metadata
- Implement dependency visualization data structure
- Create entity sequencing algorithm
- Add prerequisite validation

**Files to Create:**
- `src/services/migration/DependencyResolver.ts`
- `src/services/migration/EntityCatalog.ts`
- `src/__tests__/services/DependencyResolver.test.ts`

**Acceptance Criteria:**
- Dependencies correctly identified for all entities
- Sequencing algorithm produces correct order
- Prerequisites validation works
- All tests passing

---

### Phase 3: Wizard UI Framework (1 week)
**Deliverables:**
- Create main MigrationWizard component with step navigation
- Build WizardHeader with progress indicator
- Build WizardBody with step renderer
- Build WizardFooter with navigation buttons
- Implement step navigation logic (next/back/save)
- Add session loading on component mount

**Files to Create:**
- `frontend/src/pages/Admin/Migration/MigrationWizard.tsx`
- `frontend/src/components/Migration/Wizard/WizardHeader.tsx`
- `frontend/src/components/Migration/Wizard/WizardBody.tsx`
- `frontend/src/components/Migration/Wizard/WizardFooter.tsx`
- `frontend/src/components/Migration/Wizard/StepNavigator.tsx`
- `frontend/src/__tests__/components/MigrationWizard.test.tsx`

**Acceptance Criteria:**
- Wizard navigates between steps correctly
- Current step clearly indicated
- Progress saved on each step
- Session can be resumed from where it left off

---

### Phase 4: Entity Selection Step (1.5 weeks)
**Deliverables:**
- Build EntitySelectionStep component
- Create entity catalog display with descriptions
- Build dependency graph visualization (React Flow)
- Implement tier grouping (Master Data, Transactional, Historical)
- Add auto-add dependencies feature
- Calculate import sequence
- Estimate total time based on entity count

**Files to Create:**
- `frontend/src/components/Migration/Wizard/EntitySelectionStep.tsx`
- `frontend/src/components/Migration/Wizard/EntityCatalogDisplay.tsx`
- `frontend/src/components/Migration/Wizard/DependencyGraph.tsx`
- `frontend/src/hooks/useDependencyGraph.ts`
- `frontend/src/__tests__/components/EntitySelectionStep.test.tsx`

**NPM Packages Needed:**
- `reactflow` - Dependency graph visualization

**Acceptance Criteria:**
- All entities display with descriptions
- Dependencies visualized correctly
- Auto-sequencing works
- Estimated time calculated
- Tier grouping helps users select coherently

---

### Phase 5: Playbooks & Prerequisites (1 week)
**Deliverables:**
- Create PlaybookSelector component
- Define standard playbooks (New Deployment, Legacy Replacement, Partial)
- Implement playbook selection workflow
- Build PrerequisitesChecker component
- Add missing prerequisites alerts
- Implement auto-add dependencies feature

**Files to Create:**
- `frontend/src/components/Migration/Wizard/PlaybookSelector.tsx`
- `frontend/src/components/Migration/Wizard/PrerequisitesChecker.tsx`
- `frontend/src/constants/MigrationPlaybooks.ts`
- `frontend/src/__tests__/components/PlaybookSelector.test.tsx`

**Acceptance Criteria:**
- Playbooks display with descriptions
- Playbook selection pre-configures wizard
- Prerequisites checked before each step
- Missing prerequisites clearly flagged
- Auto-add feature works

---

### Phase 6: Template & Data Upload Steps (1 week)
**Deliverables:**
- Build TemplateDownloadStep (integrates with Issue #31)
- Build DataUploadStep (integrates with Issue #32)
- Implement file upload with drag-and-drop
- Add file validation
- Show upload progress
- Store fileIds in session

**Files to Create:**
- `frontend/src/components/Migration/Wizard/TemplateDownloadStep.tsx`
- `frontend/src/components/Migration/Wizard/DataUploadStep.tsx`
- `frontend/src/components/Migration/Common/FileUploader.tsx`
- `frontend/src/__tests__/components/DataUploadStep.test.tsx`

**Acceptance Criteria:**
- Users can download templates for each entity
- Files upload with drag-and-drop
- File validation works
- Progress visible during upload
- Files stored in session

---

### Phase 7: Validation & Import Steps (1.5 weeks)
**Deliverables:**
- Build ValidationStep (integrates with Issue #33)
- Display validation results per entity
- Show error counts and warnings
- Build ImportExecutionStep with real-time progress
- Monitor import job status
- Display results summary

**Files to Create:**
- `frontend/src/components/Migration/Wizard/ValidationStep.tsx`
- `frontend/src/components/Migration/Wizard/ImportExecutionStep.tsx`
- `frontend/src/components/Migration/Common/ValidationResults.tsx`
- `frontend/src/components/Migration/Common/ImportProgress.tsx`
- `frontend/src/__tests__/components/ValidationStep.test.tsx`

**Acceptance Criteria:**
- Validation results display correctly
- Errors clearly shown with row numbers
- Import progress updates in real-time
- Import can be paused/resumed
- Results summary accurate

---

### Phase 8: Verification & Completion Steps (1 week)
**Deliverables:**
- Build VerificationStep with data quality checks
- Build CompletionStep with migration summary
- Generate migration report
- Show statistics (records imported, errors fixed, warnings)
- Provide export of migration results

**Files to Create:**
- `frontend/src/components/Migration/Wizard/VerificationStep.tsx`
- `frontend/src/components/Migration/Wizard/CompletionStep.tsx`
- `frontend/src/components/Migration/Common/MigrationSummary.tsx`
- `frontend/src/__tests__/components/CompletionStep.test.tsx`

**Acceptance Criteria:**
- Verification queries show data quality metrics
- Completion summary shows statistics
- Migration results can be exported
- User can start new migration or review results

---

### Phase 9: Field Mapping Step (1 week)
**Deliverables:**
- Build FieldMappingStep component
- Integrate with Issue #38 (Data Mapping Assistant)
- Display legacy fields vs MES schema
- Save field mappings in session
- Add mapping preview

**Files to Create:**
- `frontend/src/components/Migration/Wizard/FieldMappingStep.tsx`
- `frontend/src/components/Migration/Common/FieldMapper.tsx`
- `frontend/src/__tests__/components/FieldMappingStep.test.tsx`

**Acceptance Criteria:**
- Field mappings display
- Users can map legacy to MES fields
- Mappings saved in session
- Preview shows result of mappings

---

### Phase 10: Help, Accessibility & Testing (2 weeks)
**Deliverables:**
- Add contextual help for each step
- Implement tooltips and inline documentation
- Embed video tutorials
- Implement keyboard navigation
- Test with screen readers (accessibility)
- Write comprehensive E2E tests
- Mobile responsiveness testing

**Files to Create:**
- `frontend/src/components/Migration/Wizard/HelpPanel.tsx`
- `frontend/cypress/e2e/migration-wizard.cy.ts`
- Accessibility test suite

**Acceptance Criteria:**
- WCAG 2.1 AA compliance
- Keyboard navigation works
- Screen reader compatible
- All E2E tests passing
- Mobile responsive

---

## Technical Stack

### Frontend
- **React 18** with TypeScript
- **React Hook Form** for step forms
- **ReactFlow** for dependency graph visualization
- **Zustand** for session state management
- **React Query** for API data fetching
- **Axios** for HTTP client
- **Tailwind CSS** for styling
- **Headless UI** for accessible components

### Backend
- **Node.js/Express** (existing)
- **Prisma ORM** for database
- **TypeScript** for type safety

### Database
- **PostgreSQL** with 3 new models (MigrationPlaybook, MigrationSession, MigrationCheckpoint)

### Testing
- **Jest** for unit tests
- **React Testing Library** for component tests
- **Cypress** for E2E tests

---

## Data Models

### MigrationPlaybook
```json
{
  "id": "cuid",
  "name": "New MES Deployment",
  "description": "Fresh deployment with master data",
  "playbookType": "new-deployment",
  "entitySequence": ["Site", "Part", "BOMItem", "Routing", "Operation"],
  "estimatedDurationMinutes": 120,
  "isPublic": true,
  "isActive": true,
  "createdBy": "system"
}
```

### MigrationSession
```json
{
  "id": "cuid",
  "name": "Legacy System Migration - Nov 2025",
  "playbookId": "cuid",
  "selectedEntities": ["Site", "Part", "BOMItem"],
  "entitySequence": ["Site", "Part", "BOMItem"],
  "fieldMappings": {
    "Part": [
      {"legacyField": "PART_ID", "mesField": "partNumber"},
      {"legacyField": "PART_DESC", "mesField": "description"}
    ]
  },
  "uploadedFiles": {
    "Site": "file-123",
    "Part": "file-456",
    "BOMItem": "file-789"
  },
  "validationResults": {
    "Site": {"valid": true, "recordCount": 42, "errors": 0},
    "Part": {"valid": true, "recordCount": 1523, "errors": 12}
  },
  "importResults": {
    "Site": {"status": "completed", "imported": 42, "failed": 0},
    "Part": {"status": "in_progress", "imported": 1500, "failed": 23}
  },
  "currentStep": 6,
  "status": "IN_PROGRESS",
  "startedAt": "2025-11-01T10:00:00Z",
  "createdBy": "admin@company.com"
}
```

---

## Entity Dependencies Map

```
Master Data Tier:
- Site (no dependencies)
- Part (depends on: MaterialClass, UnitOfMeasure)
- BOMItem (depends on: Part)
- Equipment (depends on: EquipmentType, Site)

Transactional Tier:
- Routing (depends on: Part)
- Operation (depends on: Routing)
- WorkOrder (depends on: Part, Routing, Site)
- MaterialLot (depends on: Material, Supplier)

Historical/Quality Tier:
- WorkPerformance (depends on: WorkOrder, Equipment)
- QualityInspection (depends on: WorkOrder, QualityPlan)
- TraceabilityEvent (depends on: SerializedPart)
```

---

## Standard Playbooks

### 1. New MES Deployment
- **Description:** Fresh deployment with master data only
- **Entities:** Site, Area, WorkCenter, Part, BOMItem, Routing, Operation, Personnel, Skill
- **Estimated Duration:** 2-4 hours
- **Best For:** Implementing MES in greenfield environment

### 2. Legacy System Replacement
- **Description:** Complete migration including historical data
- **Entities:** Site, Part, BOMItem, Routing, WorkOrder, MaterialLot, QualityInspection, WorkPerformance
- **Estimated Duration:** 1-2 days
- **Best For:** Replacing existing legacy MES

### 3. Partial Migration
- **Description:** Selective entity migration
- **Entities:** User selects
- **Estimated Duration:** Varies
- **Best For:** Incremental migrations or testing

### 4. Multi-Site Setup (Custom)
- **Description:** Deploy to multiple manufacturing sites
- **Entities:** Site, Area, WorkCenter, Equipment, Personnel + master data
- **Estimated Duration:** 3-5 days
- **Best For:** Enterprise with multiple facilities

---

## Success Metrics

### User Experience
- [ ] New users complete wizard without training
- [ ] Wizard reduces migration time by 50% vs manual
- [ ] Users understand entity dependencies
- [ ] Session save/resume works reliably

### Functionality
- [ ] All 8 steps functional
- [ ] Dependency resolution accurate
- [ ] Session persistence reliable
- [ ] Error recovery works

### Quality
- [ ] >90% test coverage
- [ ] Zero data loss during import
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] <2 second step transitions

### Performance
- [ ] Wizard loads in <2 seconds
- [ ] No lag during interactions
- [ ] Dependency graph renders smoothly with 100+ entities
- [ ] Session save in <1 second

---

## Risk Mitigation

### Risk 1: Complex Dependency Logic
- **Mitigation:** Comprehensive unit tests, thorough documentation
- **Owner:** Backend team

### Risk 2: Performance with Large Files
- **Mitigation:** Streaming file parsing, progress indicators
- **Owner:** Backend team (already handled by Issue #32)

### Risk 3: Session Data Consistency
- **Mitigation:** Transactional updates, checkpoints every step
- **Owner:** Backend team

### Risk 4: User Confusion with Workflow
- **Mitigation:** Inline help, video tutorials, clear messaging
- **Owner:** Frontend team

---

## Dependencies & Integration Points

### Integrations Needed
- **Issue #31:** Template Generator - Use to download import templates
- **Issue #32:** Bulk Import Engine - Use for data import
- **Issue #33:** Validation Framework - Use for data validation
- **Issue #38:** Data Mapping Assistant - Use for field mapping

### API Contracts Required
- Template download API (Issue #31)
- File upload and import API (Issue #32)
- Validation API (Issue #33)
- Field mapping API (Issue #38)

---

## Timeline

**Total Estimated Effort:** 10-12 weeks (accounting for testing, accessibility, polish)

**Breakdown:**
- Weeks 1-2: Database & Session API
- Weeks 2-3: Dependency resolution & catalog
- Week 3: Wizard UI framework
- Weeks 4-5: Entity selection & dependency visualization
- Week 5: Playbooks & prerequisites
- Week 6: Template & upload steps
- Weeks 7-8: Validation & import steps
- Week 8: Verification & completion
- Week 9: Field mapping
- Weeks 10-12: Help content, accessibility, testing, polish

---

## Acceptance Criteria - Complete Checklist

### Wizard Navigation ✅
- [ ] Users navigate forward/backward through 8 steps
- [ ] Current step clearly indicated
- [ ] Progress displayed as percentage
- [ ] Session auto-saves on each step
- [ ] Users can resume from saved session
- [ ] Breadcrumb navigation available

### Entity Selection ✅
- [ ] All 100+ entities displayed
- [ ] Entity descriptions and metadata shown
- [ ] Dependencies visualized in interactive graph
- [ ] Auto-sequencing produces correct order
- [ ] Tier grouping helps user selection
- [ ] Estimated import time calculated
- [ ] Selecting entity auto-adds dependencies

### Prerequisites ✅
- [ ] Prerequisites checked before import step
- [ ] Missing prerequisites clearly flagged
- [ ] Remediation steps suggested
- [ ] Auto-add feature available

### Playbooks ✅
- [ ] Standard playbooks available
- [ ] Playbook descriptions clear
- [ ] Playbook selection pre-configures wizard
- [ ] Custom playbooks can be created
- [ ] Playbooks can be cloned

### Session Management ✅
- [ ] New sessions created
- [ ] Session state persists
- [ ] Sessions can be resumed
- [ ] Session history viewable
- [ ] Sessions can be cloned
- [ ] Sessions can be deleted

### Help & Guidance ✅
- [ ] Contextual help for each step
- [ ] Tooltips on hover
- [ ] Video tutorials embedded
- [ ] Links to documentation
- [ ] Common mistakes documented

### Performance ✅
- [ ] Wizard loads in <2 seconds
- [ ] Step transitions smooth
- [ ] No lag on interactions
- [ ] Large entity graphs render smoothly
- [ ] Session save in <1 second

### Accessibility ✅
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation fully functional
- [ ] Screen reader compatible
- [ ] Proper ARIA labels
- [ ] Focus management working
- [ ] Color contrast adequate

---

## Conclusion

Issue #37 (Guided Migration Wizard UI) is a substantial feature that provides critical value by simplifying the complex data migration process. With dependencies on Issue #32 and #33 now resolved, the team can begin implementation using this design document as the roadmap.

The phased approach allows for incremental delivery and testing, with the core wizard framework available in weeks 1-3 and full functionality by week 12.

This wizard will significantly reduce migration time and improve user experience for one of the most critical operational tasks in implementing the MachShop MES platform.
