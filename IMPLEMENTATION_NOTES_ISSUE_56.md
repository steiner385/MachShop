# Issue #56: CAPA (Corrective & Preventive Action) Tracking System

**Status**: Implementation In Progress
**Priority Score**: 88/100
**Foundation Level**: L1 (Essential Capabilities)
**Dependencies**: Issue #54 (Hierarchical Cause Code System) ✅, Issue #55 (Enhanced NCR Workflow) ✅

## Overview

Issue #56 implements a comprehensive CAPA (Corrective & Preventive Action) tracking system that is triggered by NCRs (Non-Conformance Reports) and provides structured lifecycle management from planning through effectiveness verification. The system is critical for AS9100 and ISO 9001 compliance.

## Architecture

### Database Models

The CAPA system requires the following database models to be added to `prisma/schema.prisma`:

#### 1. **CAPA** (Main CAPA Record)
- **Key Fields**:
  - `capaNumber`: Unique identifier (auto-generated)
  - `status`: Enum (DRAFT, PLANNED, IN_PROGRESS, PENDING_VERIFICATION, VERIFIED_EFFECTIVE, VERIFIED_INEFFECTIVE, CLOSED, CANCELLED)
  - `riskLevel`: Enum (LOW, MEDIUM, HIGH, CRITICAL)
  - `ncrId`: Reference to triggering NCR (required)
  - `siteId`: Site where CAPA is being executed
  - `ownerId`: Person responsible for CAPA execution
  - `plannedDueDate`: Target date for completion
  - `actualCompletionDate`: When CAPA was actually completed
  - `rootCauseAnalysis`: RCA details (rich text/JSON)
  - `causeCodeIds`: JSON array of related cause codes
  - `estimatedCost` / `actualCost`: Budget tracking
  - `verificationMethod`: How effectiveness will be measured
  - `verificationResult`: VERIFIED_EFFECTIVE / VERIFIED_INEFFECTIVE
  - `requiresReplanning`: Boolean flag if verification shows ineffectiveness

- **Relations**:
  - Many-to-One: Site
  - Many-to-One: NCR (Cannot delete NCR until all CAPAs are closed)
  - Many-to-One: User (owner, creator, approver)
  - One-to-Many: CapaAction[]
  - One-to-Many: CapaVerification[]
  - One-to-Many: CapaStateHistory[]

#### 2. **CapaAction** (Individual Actions within a CAPA)
- **Key Fields**:
  - `capaId`: Reference to parent CAPA
  - `actionNumber`: Sequential number within CAPA
  - `actionType`: Enum (IMMEDIATE, PREVENTIVE, CORRECTIVE, SYSTEMIC)
  - `status`: Enum (OPEN, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED)
  - `ownerId`: Action owner
  - `plannedDueDate`: Target completion date
  - `completedDate`: Actual completion date
  - `percentComplete`: Progress tracking (0-100)
  - `estimatedEffort` / `actualEffort`: Time tracking
  - `estimatedCost` / `actualCost`: Cost tracking
  - `dependsOnActionId`: For managing action dependencies
  - `requiresApproval`: Boolean for approval workflow
  - `approvalRequired`: If true, action cannot be marked complete until approved

- **Relations**:
  - Many-to-One: CAPA (Cascade delete)
  - Many-to-One: User (owner, creator)
  - Optional-to-One: CapaAction (for dependencies)

#### 3. **CapaVerification** (Effectiveness Verification Records)
- **Key Fields**:
  - `capaId`: Reference to parent CAPA
  - `verificationNumber`: Sequential number for retries
  - `verificationDate`: When verification was performed
  - `verificationMethod`: How verification was done
  - `sampleSize`: If applicable
  - `result`: VERIFIED_EFFECTIVE / VERIFIED_INEFFECTIVE / INCONCLUSIVE
  - `metrics`: JSON object with verification metrics
  - `evidence`: JSON with evidence attachments/files
  - `rootCauseOfFailure`: If ineffective, why
  - `recommendedActions`: If ineffective, what to do next
  - `approvedBy` / `approvedAt`: Approval tracking

- **Relations**:
  - Many-to-One: CAPA (Cascade delete)

#### 4. **CapaStateHistory** (Audit Trail)
- **Key Fields**:
  - `capaId`: Reference to CAPA
  - `fromState` / `toState`: State transition tracking
  - `changedBy`: User ID who made change
  - `changeReason`: Why change was made
  - `approvalRequired`: If transition requires approval
  - `approvedBy` / `approvedAt`: Approval tracking

- **Relations**:
  - Many-to-One: CAPA (Cascade delete)

### Enums

Four new enums must be added:

```prisma
enum CapaStatus {
  DRAFT
  PLANNED
  IN_PROGRESS
  PENDING_VERIFICATION
  VERIFIED_EFFECTIVE
  VERIFIED_INEFFECTIVE
  CLOSED
  CANCELLED
}

enum CapaActionType {
  IMMEDIATE
  PREVENTIVE
  CORRECTIVE
  SYSTEMIC
}

enum CapaActionStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  OVERDUE
  CANCELLED
}

enum CapaRiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

## Backend Implementation

### Services

#### **CapaService** (`src/services/CapaService.ts`)
Core CAPA management service with the following methods:

**CAPA Lifecycle Methods**:
- `createCapaFromNCR(ncrId, data)`: Auto-create CAPA from NCR with auto-assign to NCR.createdBy
- `getCapaById(capaId)`: Retrieve CAPA with all related data
- `getCapasForSite(siteId, filters)`: List CAPAs with pagination
- `getCapasForNCR(ncrId)`: Get all CAPAs related to an NCR
- `updateCapa(capaId, updates)`: Update CAPA fields
- `transitionCapaStatus(capaId, newStatus, approverInfo)`: State transition with optional approval

**Action Management**:
- `addCapaAction(capaId, actionData)`: Add new action to CAPA
- `updateCapaAction(actionId, updates)`: Update action details
- `markActionComplete(actionId, completedDate)`: Mark action as completed
- `getCapaActions(capaId)`: List all actions for a CAPA
- `getOverdueActions(siteId)`: Query overdue actions across site

**Verification Management**:
- `createVerification(capaId, verificationData)`: Record effectiveness check
- `verifyCapaEffectiveness(capaId, result, metrics)`: Verify CAPA effectiveness
- `requiresReplanning(capaId)`: Check if CAPA needs replanning
- `closeCapaWithVerification(capaId, verificationResult)`: Final closure workflow

**Cost Tracking**:
- `updateCapaCost(capaId, estimatedCost, actualCost)`: Update cost tracking
- `getCapaCostMetrics(siteId, dateRange)`: Cost reporting by site

**Auto-Approval Logic**:
- `shouldAutoApprove(capa, action)`: Business rules for automatic approval
  - Auto-approve if cost < $500 AND risk level ≤ MEDIUM
  - Auto-approve if assigned to quality manager
  - Auto-approve immediate actions completing within 24 hours
  - All other cases require manual approval

**Validation**:
- `validateCapaBeforeClose(capaId)`: Ensure all actions completed and verified
- `validateCapaCompleteness(capa)`: Check required fields are filled
- `validateActionDependencies(capaId)`: Ensure dependent actions are ordered correctly

**State History**:
- `getCapaStateHistory(capaId)`: Audit trail of all transitions
- `recordStateTransition(capaId, fromState, toState, reason)`: Log state change

**Dashboard/Metrics**:
- `getCapaMetrics(siteId, dateRange)`: KPIs for CAPA system
  - Effectiveness rate (% verified effective)
  - Average cycle time (days from creation to closure)
  - Overdue action count
  - Cost of CAPAs by type
  - Distribution by risk level

### API Routes

#### **POST /api/capa** - Create CAPA from NCR
```typescript
Body: {
  ncrId: string;
  title: string;
  description: string;
  riskLevel: CapaRiskLevel;
  plannedDueDate: Date;
  rootCauseAnalysis?: string;
}
Response: { id, capaNumber, status }
```

#### **GET /api/capa/:capaId** - Retrieve CAPA Details
```typescript
Response: {
  id, capaNumber, status, ncrId, ownerId,
  actions: CapaAction[],
  verifications: CapaVerification[],
  stateHistory: CapaStateHistory[]
}
```

#### **GET /api/capa/site/:siteId** - List CAPAs
```typescript
Query: {
  status?: CapaStatus,
  riskLevel?: CapaRiskLevel,
  ownerId?: string,
  overdue?: boolean,
  page?: number,
  limit?: number
}
Response: { items: CAPA[], total, page, pageSize }
```

#### **PUT /api/capa/:capaId** - Update CAPA
```typescript
Body: {
  title?: string,
  description?: string,
  riskLevel?: CapaRiskLevel,
  plannedDueDate?: Date,
  rootCauseAnalysis?: string,
  estimatedCost?: Decimal
}
```

#### **POST /api/capa/:capaId/transition** - Transition Status
```typescript
Body: {
  toStatus: CapaStatus,
  reason: string,
  approvalRequired?: boolean
}
```

#### **POST /api/capa/:capaId/actions** - Add Action
```typescript
Body: {
  actionType: CapaActionType,
  description: string,
  ownerId: string,
  plannedDueDate: Date,
  estimatedCost?: Decimal,
  dependsOnActionId?: string
}
Response: { actionId, actionNumber }
```

#### **PUT /api/capa/actions/:actionId** - Update Action
```typescript
Body: {
  percentComplete?: number,
  status?: CapaActionStatus,
  actualEffort?: string,
  actualCost?: Decimal,
  notes?: string
}
```

#### **POST /api/capa/:capaId/verify** - Record Verification
```typescript
Body: {
  verificationDate: Date,
  verificationMethod: string,
  sampleSize?: number,
  result: "VERIFIED_EFFECTIVE" | "VERIFIED_INEFFECTIVE" | "INCONCLUSIVE",
  metrics: object,
  evidence?: object,
  rootCauseOfFailure?: string,
  recommendedActions?: string
}
```

#### **GET /api/capa/metrics/dashboard** - CAPA Metrics
```typescript
Query: { siteId, dateRange: "week" | "month" | "quarter" | "year" }
Response: {
  effectivenessRate: number,
  averageCycleTime: number,
  overdueCount: number,
  costByType: object,
  costByRiskLevel: object,
  byStatus: object
}
```

### Auto-Approval Configuration

Business rules in `CapaService.shouldAutoApprove()`:
- **Immediate Actions**: Auto-approve if completed within 24 hours AND cost < $500
- **Low Risk CAPAs**: Auto-approve all actions if capa.riskLevel === LOW AND cost < $1000
- **Quality Manager**: Auto-approve any action assigned to quality managers
- **Cost Threshold**: Auto-approve if actual cost < $500 regardless of type
- **Owner Override**: Owner can mark any action as auto-approving in the system

## Frontend Implementation

### Components

#### **CapaList.tsx** - CAPA Listing
- Displays all CAPAs for the site with filtering by:
  - Status (DRAFT, PLANNED, IN_PROGRESS, PENDING_VERIFICATION, etc.)
  - Risk Level (LOW, MEDIUM, HIGH, CRITICAL)
  - Owner
  - Overdue (Y/N)
  - Date range
- Sorting by: Due Date, Created Date, Status, Risk
- Column display: Number, NCR, Title, Owner, Status, Risk, Due Date, Days Overdue
- Bulk actions: Close, Reassign, Delete
- Quick view modal

#### **CapaDetail.tsx** - CAPA Viewer/Editor
- Left panel: CAPA metadata
  - Basic info: Title, Description, NCR link
  - Dates: Planned Due, Actual Completion
  - Ownership: Owner, Creator, Department
  - Analysis: Root Cause, Cause Codes
  - Costs: Estimated vs Actual
  - Risk Level selector
- Center panel: Actions accordion
  - Add action button
  - Each action shows:
    - Type, Description, Status
    - Progress bar (%)
    - Owner, Dates
    - Cost tracking
    - Dependency indicators
  - Edit/Complete/Delete actions for each
- Right panel: Verifications, State History, Comments
- Action buttons at top: Status Transition, Assign, Verify, Close
- Edit mode with Save/Cancel buttons

#### **CapaActionEditor.tsx** - Action Configuration
- Modal or inline form for creating/editing actions
- Fields:
  - Type (dropdown: IMMEDIATE, PREVENTIVE, CORRECTIVE, SYSTEMIC)
  - Description (rich text editor)
  - Owner (user selector)
  - Planned Start/Due dates
  - Estimated Effort (time input)
  - Estimated Cost
  - Dependencies (select from other actions)
  - Approval Required (checkbox)
  - Notes
- Save validates:
  - Description not empty
  - Owner selected
  - Due date > today
  - Dependencies form valid DAG (no cycles)

#### **CapaVerification.tsx** - Effectiveness Verification
- Form for recording verification results
- Fields:
  - Verification Date
  - Method (dropdown: Visual Inspection, Testing, Audit, Process Monitoring, etc.)
  - Sample Size (if applicable)
  - Result (radio: Effective, Ineffective, Inconclusive)
  - Metrics JSON editor
  - Evidence file upload
  - Verification Notes
  - If Ineffective:
    - Root Cause of Failure (text area)
    - Recommended Actions (rich text)
- Approval workflow if required
- Display verification history (all prior verifications)

#### **CapaDashboard.tsx** - Metrics & Overview
- KPI Cards:
  - Effectiveness Rate (%)
  - Average Cycle Time (days)
  - Overdue Count (with warning color if > threshold)
  - Total Cost (running total)
  - By Risk Level breakdown
- Charts:
  - Effectiveness by Risk Level (bar chart)
  - Cycle Time Trend (line chart)
  - Status Distribution (pie chart)
  - Cost by Type (stacked bar)
- Links to:
  - Overdue CAPAs list
  - My Assigned Actions
  - Pending Verification

#### **CapaWorkflow.tsx** - State Transition
- Modal showing current state and allowed transitions
- Transition buttons with:
  - Confirmation prompt
  - Reason text field
  - Approval checkbox (if required)
- State history displayed below
- Validation: Cannot close if:
  - Not all actions completed
  - Not all actions approved
  - No verification performed

#### **CapaReports.tsx** - CAPA Analytics
- Filters: Date range, Site, Risk Level, Owner, NCR Type, Status
- Reports:
  - Effectiveness Summary (% effective by risk level, type)
  - Aging Report (how long CAPAs remain in each state)
  - Cost Report (total, by risk, by owner)
  - Action Performance (completion rates, time vs plan)
  - Export to CSV/Excel

### Hooks

#### **useCapaManagement.ts**
- Custom hook for CAPA lifecycle management
- Methods:
  - `getCapaList(filters)`: Query with caching
  - `getCapaDetail(id)`: Single CAPA with relations
  - `updateCapa(id, data)`: Optimistic update
  - `transitionStatus(id, newStatus, reason)`: State transition
  - `addAction(capaId, data)`: Add action with validation
  - `updateAction(actionId, data)`: Update action
  - `createVerification(capaId, data)`: Verify effectiveness
  - `closeCapaAction(actionId)`: Mark complete
- State: current CAPA, actions, verifications, loading, errors
- Auto-refresh when status changes

#### **useCapaMetrics.ts**
- Dashboard metrics hook
- Methods:
  - `getMetrics(siteId, dateRange)`: Fetch KPIs
  - `getEffectivenessRate(siteId, dateRange)`: Effectiveness %
  - `getCycleTimeStats(siteId)`: Min/max/avg cycle times
  - `getCostMetrics(siteId, dateRange)`: Cost analysis
- Real-time updates (WebSocket if available)

## Integration Points

### NCR Integration
- New CAPA auto-created when NCR transitions to CORRECTIVE_ACTION state
- Cannot close NCR until all related CAPAs are CLOSED
- NCR detail page shows: CAPA count, effectiveness rate, outstanding actions
- Link from CAPA detail to trigger NCR

### Quality Analytics Integration (Issue #58)
- CAPA effectiveness tracked as QualityMetricType.CAPA_EFFECTIVENESS
- QualityAlert for:
  - CAPA_OVERDUE: When action due date passed
  - CAPA_INEFFECTIVE: When verification shows ineffectiveness
- Metrics feed COPQ dashboard

### Notification System
- Email/SMS notifications for:
  - CAPA creation: To owner and supervisor
  - Action assigned: To action owner
  - Verification required: To quality manager
  - Overdue action: Daily to owner + supervisor
  - Ineffectiveness: To CAPA owner for replanning decision

### Audit Trail
- All CAPA changes logged to CapaStateHistory
- All action changes logged
- Approval decisions and reason recorded
- Cost changes tracked with before/after values

## Test Strategy

### Unit Tests
- **CapaService**: CRUD, state transitions, auto-approval logic, validation
- **Business Rules**: Auto-approval decision logic, effectiveness calculation
- **Validations**: Action dependencies (DAG validation), cycle time calc

### Integration Tests
- **NCR to CAPA Flow**: NCR creation → CAPA auto-create
- **State Transitions**: Valid and invalid transition paths
- **Approval Workflows**: Auto-approval vs manual approval scenarios
- **Verification Closure**: Effective closure vs ineffective with replanning

### E2E Tests
- **Complete CAPA Workflow**:
  1. NCR created with severity CRITICAL
  2. CAPA auto-created
  3. Add 3 corrective actions with dependencies
  4. Mark actions complete
  5. Verify effectiveness
  6. Close CAPA
- **Overdue Scenarios**:
  1. Create action with due date in past
  2. System flags as overdue
  3. Verify dashboard alert appears

### Test Coverage
- Target: 85%+ line coverage for services
- Target: 90%+ coverage for business logic (auto-approval, validation)

## Migration Strategy

1. **Phase 1**: Add schema migrations for CAPA tables
   - Create Prisma migration with all models
   - Deploy to dev/staging
   - Add indexes for performance (siteId, ncrId, ownerId, status, plannedDueDate)

2. **Phase 2**: Implement backend services
   - CapaService with full lifecycle management
   - API routes with proper authorization
   - Auto-approval business logic
   - Notification triggers

3. **Phase 3**: Frontend components
   - Create CapaList and CapaDetail
   - Add to Admin navigation menu
   - Add link from NCR to CAPA
   - Add dashboard widgets

4. **Phase 4**: Integration & Testing
   - Complete E2E tests
   - Load testing with realistic data
   - UAT with quality team
   - Performance optimization

5. **Phase 5**: Production Deployment
   - Database migration on production
   - Feature flag for gradual rollout
   - Monitor metrics and errors
   - Documentation and training

## Success Metrics

- All CAPA actions track to completion (no dropped actions)
- Effectiveness rate ≥ 90% (CAPAs verified effective)
- Average cycle time < 60 days from creation to closure
- Auto-approval eliminates <10% of required approvals for cost/risk
- Dashboard provides real-time visibility to quality team
- Integration with NCR prevents closure without CAPA closure
- Full audit trail for compliance

## Known Limitations & Future Enhancements

### Current Limitations
- No multi-level approval routing (all approvals are to single approver)
- No automatic escalation for overdue actions
- No integration with external CAPA systems (Teamcenter Quality)
- No predictive analytics on effectiveness likelihood

### Future Enhancements (Post-Launch)
- Multi-level approval with escalation matrix
- Predictive effectiveness scoring based on root cause
- Integraton with Teamcenter Quality MRB (Issue #266)
- AI-assisted root cause analysis suggestions
- CAPA template library for common defect types
- Lessons learned knowledge base
- Supplier CAPA tracking
- Automated SPC monitoring for verification
