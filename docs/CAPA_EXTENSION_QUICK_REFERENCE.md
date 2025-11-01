# CAPA Tracking Extension - Quick Reference Guide

## Key Files to Understand

### Database Schema
- **Main schema**: `/home/tony/GitHub/MachShop3/prisma/schema.prisma` (lines 2144-2310)
- **CorrectiveAction model**: Already fully defined (line 12260)
- **Enums**: QMSCAStatus, QMSCASource, QMSRCAMethod (lines 12133-12151)

### Services (Backend)
- **QualityService**: `/src/services/QualityService.ts` - Main quality operations
- **NCRDispositionService**: `/src/services/NCRDispositionService.ts` - Disposition logic
- **NotificationService**: `/src/services/NotificationService.ts` - All notifications
- **WorkflowNotificationService**: `/src/services/WorkflowNotificationService.ts` - Workflow alerts

### Routes (API Endpoints)
- **Quality routes**: `/src/routes/quality.ts` - Inspections and NCR endpoints
- **NCR workflow**: `/src/routes/ncrWorkflow.ts` - State transitions
- **NCR approvals**: `/src/routes/ncrApprovals.ts` - Approval management

### Frontend
- **Quality pages**: `/frontend/src/pages/Quality/` - All quality management pages
- **API service**: `/frontend/src/services/qualityApi.ts` - Frontend API calls
- **Components**: `/frontend/src/components/NCRWorkflow/` - State visualization

---

## What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| CorrectiveAction model | Defined | schema.prisma:12260 |
| QMSCAStatus enum | Defined | schema.prisma:12154 |
| QMSCASource enum | Defined | schema.prisma:12133 |
| QMSRCAMethod enum | Defined | schema.prisma:12145 |
| AuditFinding linkage | Defined | schema.prisma |
| User relations | Defined | schema.prisma |
| Notification system | Implemented | NotificationService.ts |
| Approval workflow | Implemented | Issue #147 integration |
| State machine | Implemented | NCR workflow |
| Cost tracking | Implemented | NCR model |

---

## What Needs to Be Built

### 1. CorrectiveActionService (Priority: HIGH)
**Purpose**: Complete CRUD and lifecycle management for CAPA

**Key methods to implement**:
```typescript
// Creation and status
createCorrectiveAction(data: CreateCAInput): Promise<CorrectiveAction>
updateStatus(caId: string, newStatus: QMSCAStatus, userId: string): Promise<void>

// Root cause analysis
setRootCause(caId: string, method: QMSRCAMethod, rootCause: string): Promise<void>
getRootCauseAnalysis(caId: string): Promise<RCADetails>

// Implementation
recordImplementation(caId: string, implementationDetails: string, userId: string): Promise<void>
recordVerification(caId: string, isEffective: boolean, verificationMethod: string): Promise<void>

// Queries
getCAsBySource(source: QMSCASource, filters?: any): Promise<CorrectiveAction[]>
getOverdueCA(days: number): Promise<CorrectiveAction[]>
getCAsByAssignee(userId: string): Promise<CorrectiveAction[]>
getCAStatistics(siteId?: string): Promise<CAStats>
```

**Location**: `/src/services/CorrectiveActionService.ts`

---

### 2. RootCauseAnalysisService (Priority: HIGH)
**Purpose**: Implement RCA methodology templates

**Key methods**:
```typescript
// Five Why template
generateFiveWhyTemplate(problem: string): FiveWhyTemplate
recordFiveWhyAnalysis(caId: string, analysis: FiveWhyAnalysis): Promise<void>

// Fishbone/Ishikawa diagram
generateFishboneTemplate(problem: string): FishboneTemplate
recordFishboneAnalysis(caId: string, analysis: FishboneAnalysis): Promise<void>

// Fault Tree Analysis
generateFaultTreeTemplate(problem: string): FaultTreeTemplate
recordFaultTreeAnalysis(caId: string, analysis: FaultTreeAnalysis): Promise<void>

// Pareto 80/20
generateParetoTemplate(problems: Problem[]): ParetoTemplate
recordParetoAnalysis(caId: string, analysis: ParetoAnalysis): Promise<void>

// 8D (Eight Disciplines)
generate8DTemplate(problem: string): EightDTemplate
record8DAnalysis(caId: string, analysis: EightDAnalysis): Promise<void>
```

**Location**: `/src/services/RootCauseAnalysisService.ts`

---

### 3. CapaEffectivenessService (Priority: MEDIUM)
**Purpose**: Post-implementation verification workflow

**Key methods**:
```typescript
// Verification workflow
scheduleEffectivenessVerification(caId: string, verificationDate: Date): Promise<void>
recordEffectivenessVerification(
  caId: string,
  isEffective: boolean,
  verificationDetails: string,
  verifiedBy: string
): Promise<void>

// For ineffective actions
requireFollowUpCA(originalCAId: string, reason: string): Promise<CorrectiveAction>

// Trending
getEffectivenessRate(siteId?: string, timeframe?: string): Promise<number>
getIneffectiveCACount(siteId?: string): Promise<number>
```

**Location**: `/src/services/CapaEffectivenessService.ts`

---

### 4. CAPA REST Routes (Priority: HIGH)
**Purpose**: API endpoints for CAPA management

**Endpoints to create**:
```
GET    /api/v2/corrective-actions              - List with filters
POST   /api/v2/corrective-actions              - Create new CA
GET    /api/v2/corrective-actions/:id          - Get detail
PATCH  /api/v2/corrective-actions/:id          - Update
PATCH  /api/v2/corrective-actions/:id/status   - Change status
PATCH  /api/v2/corrective-actions/:id/root-cause - Set RCA
PATCH  /api/v2/corrective-actions/:id/implementation - Record implementation
PATCH  /api/v2/corrective-actions/:id/verification  - Record verification
GET    /api/v2/corrective-actions/stats        - Statistics
GET    /api/v2/corrective-actions/overdue      - Overdue items
```

**Location**: `/src/routes/correctiveActions.ts`

---

### 5. Frontend: CAPA Pages (Priority: MEDIUM)
**Pages to create**:

**CorrectiveActionList.tsx**
- List all CAPAs with filters
- Status indicators
- Due date highlighting
- Quick action buttons

**CorrectiveActionDetail.tsx**
- Overview tab (basic info)
- Root Cause Analysis tab (with method templates)
- Implementation tab (record implementation)
- Verification tab (effectiveness check)
- Linked NCRs tab
- Audit trail tab

**CorrectiveActionCreate.tsx**
- Create new CAPA
- Link to source (NCR, Audit, etc.)
- Assign to user
- Set target date

**RCAMethodUI components**
- FiveWhyForm
- FishboneForm
- FaultTreeForm
- ParetoForm
- EightDForm

**Location**: `/frontend/src/pages/Quality/CorrectiveActions/`

---

### 6. Frontend: CAPA API Service (Priority: MEDIUM)
**File**: `/frontend/src/services/capaApi.ts`

**Key methods**:
```typescript
export const capaApi = {
  getCorrectiveActions(filters?): Promise<CorrectiveActionListResponse>
  getCAById(id: string): Promise<CorrectiveAction>
  createCA(data: CreateCARequest): Promise<CorrectiveAction>
  updateCA(id: string, data: UpdateCARequest): Promise<CorrectiveAction>
  updateCAStatus(id: string, status: QMSCAStatus): Promise<CorrectiveAction>
  setRootCause(id: string, data: SetRCACRequest): Promise<CorrectiveAction>
  recordImplementation(id: string, data: ImplementationData): Promise<CorrectiveAction>
  recordVerification(id: string, data: VerificationData): Promise<CorrectiveAction>
  getCAStatistics(): Promise<CAStatistics>
  getOverdueCA(): Promise<CorrectiveAction[]>
}
```

---

### 7. Notification Integration (Priority: MEDIUM)

**CAPA-specific notifications to add**:

```typescript
// In NotificationService.ts, add these methods:
async createCAAssignmentNotification(
  assigneeId: string,
  caNumber: string,
  title: string,
  assignerName: string,
  targetDate: Date
): Promise<UserNotification>

async createCADueDateNotification(
  assigneeId: string,
  caNumber: string,
  daysRemaining: number
): Promise<UserNotification>

async createCAOverdueNotification(
  assigneeId: string,
  caNumber: string,
  daysPastDue: number
): Promise<UserNotification>

async createCAVerificationPendingNotification(
  assigneeId: string,
  caNumber: string,
  implementationDate: Date
): Promise<UserNotification>

async createCAIneffectiveNotification(
  managerId: string,
  originalCANumber: string,
  reason: string
): Promise<UserNotification>
```

---

### 8. CAPA Approval Workflow (Priority: LOW)
**For Issue #147 Integration**:

```typescript
// In CorrectiveActionService.ts
async submitCAForApproval(
  caId: string,
  userId: string,
  requiredApproverRoles: string[]
): Promise<ApprovalResult>

async approveCA(caId: string, userId: string, comments?: string): Promise<ApprovalResult>

async rejectCA(caId: string, userId: string, rejectionReason: string): Promise<ApprovalResult>

async getCAApprovalStatus(caId: string): Promise<ApprovalStatusResult>
```

---

## Database Queries Already Available

The following Prisma queries will work with existing schema:

```typescript
// Get CAPA by ID
const ca = await prisma.correctiveAction.findUnique({
  where: { id: caId },
  include: {
    assignedTo: true,
    verifiedBy: true,
    createdBy: true,
    auditFindings: true
  }
})

// Get CAPAs by source reference (e.g., NCR number)
const capasByNCR = await prisma.correctiveAction.findMany({
  where: { sourceReference: ncrNumber }
})

// Get overdue CAPAs
const overdue = await prisma.correctiveAction.findMany({
  where: {
    status: 'IN_PROGRESS',
    targetDate: { lt: new Date() }
  }
})

// Get CAPAs by assignee
const assignedCAs = await prisma.correctiveAction.findMany({
  where: { assignedToId: userId },
  include: { createdBy: true, assignedTo: true }
})

// Count by status
const statsByStatus = await prisma.correctiveAction.groupBy({
  by: ['status'],
  _count: true
})
```

---

## Testing Strategy

### Unit Tests to Create
- CorrectiveActionService CRUD operations
- State transitions validation
- RCA method implementations
- Effectiveness verification logic

### Integration Tests
- CAPA creation from NCR
- State machine transitions
- Notification triggers
- Approval workflow

### E2E Tests
- Complete CAPA lifecycle (create → implement → verify → close)
- RCA method workflows
- Dashboard and reporting

---

## Notification Triggers to Implement

```typescript
// Hook into notification service during:

// 1. CAPA creation
await notificationService.createCAAssignmentNotification(
  capa.assignedToId,
  capa.caNumber,
  capa.title,
  createdBy.name,
  capa.targetDate
)

// 2. Status transitions
switch(newStatus) {
  case 'IN_PROGRESS':
    // Already notified on assignment
    break
  case 'IMPLEMENTED':
    // Notify verifier that implementation is ready
    break
  case 'VERIFIED_EFFECTIVE':
    // Notify creator of successful closure
    break
  case 'VERIFIED_INEFFECTIVE':
    // Notify manager, may require follow-up CA
    break
}

// 3. Overdue detection (scheduled job)
const overdueCAs = await caService.getOverdueCA(0)
for (const ca of overdueCAs) {
  await notificationService.createCAOverdueNotification(
    ca.assignedToId,
    ca.caNumber,
    daysPastDue
  )
}

// 4. Approaching due date (scheduled job, 7 days before)
const dueSoon = await caService.getCADueSoon(7)
for (const ca of dueSoon) {
  await notificationService.createCADueDateNotification(
    ca.assignedToId,
    ca.caNumber,
    daysRemaining
  )
}
```

---

## Integration with Existing Systems

### Linking to NCRs
```typescript
// When creating CAPA from NCR
const ca = await caService.createCorrectiveAction({
  source: 'NCR',
  sourceReference: ncr.ncrNumber,
  description: `Corrective action for ${ncr.ncrNumber}`,
  ...
})
```

### Linking to Audits
```typescript
// When creating CAPA from Audit Finding
const ca = await caService.createCorrectiveAction({
  source: 'INTERNAL_AUDIT',
  sourceReference: auditFinding.findingNumber,
  ...
})
```

### Approval Integration
```typescript
// Use existing unified approval system (Issue #147)
await caService.submitCAForApproval(
  caId,
  userId,
  ['quality_manager', 'operations_manager']
)
```

---

## Implementation Checklist

- [ ] Create CorrectiveActionService
- [ ] Create RootCauseAnalysisService
- [ ] Create CapaEffectivenessService
- [ ] Create REST routes in correctiveActions.ts
- [ ] Register routes in main app
- [ ] Create frontend CAPA pages
- [ ] Create capaApi frontend service
- [ ] Add CAPA notifications to NotificationService
- [ ] Create notification triggers in services
- [ ] Add CAPA to Quality dashboard
- [ ] Create CAPA unit tests
- [ ] Create CAPA integration tests
- [ ] Create CAPA e2e tests
- [ ] Add CAPA reporting/analytics
- [ ] Documentation and user guides

