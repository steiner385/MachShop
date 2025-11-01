# MachShop3 Quality & NCR Architecture Summary

## Overview
The MachShop3 codebase has a comprehensive quality management system with existing NCR (Non-Conformance Report) and CAPA (Corrective and Preventive Action) infrastructure. The system is designed to support advanced quality workflows including disposition management, Material Review Board (MRB) decisions, and multi-stage approvals.

---

## 1. PRISMA SCHEMA FOR NCR AND QUALITY MODELS

### Location
- **Main Schema**: `/home/tony/GitHub/MachShop3/prisma/schema.prisma`
- **Quality Module**: `/home/tony/GitHub/MachShop3/prisma/modular/modules/quality-management.prisma`

### Core Models

#### NCR (Non-Conformance Report)
```prisma
model NCR {
  id                 String             @id @default(cuid())
  ncrNumber          String             @unique
  workOrderId        String?
  inspectionId       String?
  siteId             String?
  partNumber         String
  severity           NCRSeverity
  status             NCRStatus
  quantity           Int
  
  // Disposition fields (Issue #55)
  disposition        NCRDisposition?
  dispositionJustification String?
  dispositionApprovedBy String?
  dispositionApprovedAt DateTime?
  
  // CTP (Continue to Process) fields
  ctpAuthorized      Boolean? @default(false)
  ctpApprovedBy      String?
  ctpApprovedAt      DateTime?
  ctpJustification   String?
  ctpConditions      String?
  ctpOperations      String?
  
  // DDR (Delayed Disposition Required) fields
  ddrExpectedDate    DateTime?
  ddrPendingItems    String?
  ddrEscalated       Boolean? @default(false)
  ddrEscalatedAt     DateTime?
  
  // MRB (Material Review Board) fields
  mrbRequired        Boolean? @default(false)
  mrbMeetingDate     DateTime?
  mrbAttendees       String?
  mrbDecision        String?
  mrbVotes           String?
  mrbMinutes         String?
  
  // Cost tracking
  estimatedCost      Decimal?           @db.Decimal(15, 2)
  actualCost         Decimal?           @db.Decimal(15, 2)
  scrapCost          Decimal?           @db.Decimal(15, 2)
  reworkCost         Decimal?           @db.Decimal(15, 2)
  
  // Relations
  assignedTo         User?              @relation("AssignedTo", fields: [assignedToId], references: [id])
  createdBy          User               @relation("CreatedBy", fields: [createdById], references: [id])
  inspection         QualityInspection? @relation(fields: [inspectionId], references: [id])
  site               Site?              @relation(fields: [siteId], references: [id])
  workOrder          WorkOrder?         @relation(fields: [workOrderId], references: [id])
  stateHistory       NCRStateHistory[]
  approvalRequests   NCRApprovalRequest[]
  buildDeviations    BuildDeviation[]
}
```

#### NCRStateHistory
Tracks all state transitions for audit trail:
```prisma
model NCRStateHistory {
  id              String   @id @default(cuid())
  ncrId           String
  fromState       NCRStatus?
  toState         NCRStatus
  changedBy       String
  changeReason    String?
  approvalRequired Boolean
  approvedBy      String?
  approvedAt      DateTime?
  timestamp       DateTime @default(now())
  ncr             NCR      @relation(fields: [ncrId], references: [id], onDelete: Cascade)
}
```

#### NCRApprovalRequest
Integration with unified approval system (Issue #147):
```prisma
model NCRApprovalRequest {
  id              String   @id @default(cuid())
  ncrId           String
  approvalType    String   // DISPOSITION, CTP_AUTHORIZATION, DDR_RESOLUTION, MRB_DECISION
  approverEmail   String
  status          String   // PENDING, APPROVED, REJECTED
  requestedAt     DateTime
  ...
}
```

#### CorrectiveAction (CAPA)
Full CAPA tracking model:
```prisma
model CorrectiveAction {
  id                  String   @id @default(cuid())
  caNumber            String   @unique
  title               String
  description         String
  
  // Source
  source              QMSCASource        // INTERNAL_AUDIT, EXTERNAL_AUDIT, NCR, CUSTOMER_COMPLAINT, etc.
  sourceReference     String?            // NCR #, Audit #, etc.
  
  // Root cause analysis
  rootCauseMethod     QMSRCAMethod?      // FIVE_WHY, FISHBONE, FAULT_TREE, PARETO, EIGHT_D
  rootCause           String?
  
  // Actions
  correctiveAction    String
  preventiveAction    String?
  
  // Assignment
  assignedTo          User     @relation("CAAssignedTo", fields: [assignedToId], references: [id])
  assignedToId        String
  
  // Timeline
  targetDate          DateTime
  implementedDate     DateTime?
  
  // Verification
  verificationMethod  String?
  verifiedBy          User?    @relation("CAVerifiedBy", fields: [verifiedById], references: [id], onDelete: SetNull)
  verifiedById        String?
  verifiedAt          DateTime?
  isEffective         Boolean?
  
  // Status
  status              QMSCAStatus @default(OPEN)  // OPEN, IN_PROGRESS, IMPLEMENTED, VERIFIED_EFFECTIVE, VERIFIED_INEFFECTIVE, CLOSED, CANCELLED
  
  // Linkages
  auditFindings       AuditFinding[]
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  createdBy           User     @relation("CACreatedBy", fields: [createdById], references: [id])
  createdById         String
}
```

#### Quality Inspection Models
```prisma
model QualityInspection {
  id               String                   @id @default(cuid())
  inspectionNumber String                   @unique
  workOrderId      String
  planId           String
  inspectorId      String
  status           QualityInspectionStatus
  result           QualityInspectionResult?
  quantity         Int
  startedAt        DateTime?
  completedAt      DateTime?
  notes            String?
  
  ncrs             NCR[]
  inspector        User                     @relation(fields: [inspectorId], references: [id])
  plan             QualityPlan              @relation(fields: [planId], references: [id])
  workOrder        WorkOrder                @relation(fields: [workOrderId], references: [id])
  measurements     QualityMeasurement[]
}

model QualityPlan {
  id              String                  @id @default(cuid())
  planNumber      String                  @unique
  planName        String
  partId          String
  operation       String?
  description     String?
  isActive        Boolean                 @default(true)
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt
  
  characteristics QualityCharacteristic[]
  inspections     QualityInspection[]
  part            Part                    @relation(fields: [partId], references: [id])
}

model QualityCharacteristic {
  id               String               @id @default(cuid())
  planId           String
  characteristic   String
  specification    String
  toleranceType    QualityToleranceType
  nominalValue     Float?
  upperLimit       Float?
  lowerLimit       Float?
  unitOfMeasure    String?
  inspectionMethod String?
  isActive         Boolean              @default(true)
  
  plan             QualityPlan          @relation(fields: [planId], references: [id])
  measurements     QualityMeasurement[]
}

model QualityMeasurement {
  id               String                @id @default(cuid())
  inspectionId     String
  characteristicId String
  measuredValue    Float
  result           String
  notes            String?
  createdAt        DateTime              @default(now())
  
  characteristic   QualityCharacteristic @relation(fields: [characteristicId], references: [id])
  inspection       QualityInspection     @relation(fields: [inspectionId], references: [id])
}
```

### Enums

**NCRStatus** (12 states):
- DRAFT, SUBMITTED, UNDER_INVESTIGATION, CONTAINMENT
- PENDING_DISPOSITION
- CTP, DDR, MRB (advanced dispositions)
- CORRECTIVE_ACTION, VERIFICATION, CLOSED, CANCELLED
- OPEN, UNDER_REVIEW, DISPOSITION_SET (legacy)

**NCRSeverity**:
- MINOR, MAJOR, CRITICAL

**NCRDisposition** (8 options):
- REWORK, REPAIR, SCRAP, USE_AS_IS
- RETURN_TO_SUPPLIER, SORT_AND_SEGREGATE, RETURN_TO_STOCK, ENGINEER_USE_ONLY

**QMSCAStatus**:
- OPEN, IN_PROGRESS, IMPLEMENTED, VERIFIED_EFFECTIVE, VERIFIED_INEFFECTIVE, CLOSED, CANCELLED

**QMSCASource**:
- INTERNAL_AUDIT, EXTERNAL_AUDIT, NCR, CUSTOMER_COMPLAINT, SUPPLIER_ISSUE, MANAGEMENT_REVIEW, PROCESS_MONITORING, IMPROVEMENT_OPPORTUNITY

**QMSRCAMethod**:
- FIVE_WHY, FISHBONE, FAULT_TREE, PARETO, EIGHT_D

---

## 2. EXISTING QUALITYSERVICE IMPLEMENTATION

### Location
`/home/tony/GitHub/MachShop3/src/services/QualityService.ts`

### Key Methods

**Inspection Management**:
- `createInspection()` - Create inspection record
- `recordMeasurements()` - Record measurement data against characteristics
- `generateInspectionNumber()` - Generate unique inspection numbers
- `validateMeasurement()` - Validate measurements against spec limits
- `determineOverallInspectionResult()` - Calculate overall inspection result

**NCR Management**:
- `createNCR()` - Create non-conformance report
- `setNCRDisposition()` - Set disposition with reason
- `generateNCRNumber()` - Generate unique NCR numbers
- `transitionNCRState()` - State machine transitions
- `closeNCRWithApproval()` - Close NCR with final approval

**Quality Process Approvals** (Integration with Issue #147 Unified Workflow):
- `submitQualityProcessForApproval()` - Submit for workflow approval
- `approveQualityProcess()` - Approve quality process
- `rejectQualityProcess()` - Reject quality process
- `getQualityProcessApprovalStatus()` - Check approval status

**NCR Workflow Methods** (Delegates to NCRWorkflowEnhancement):
- `transitionNCRState()` - State transitions with workflow validation
- `setNCRDispositionWithWorkflow()` - Disposition setting with approval
- `getAvailableTransitions()` - Get allowed next states
- `getNCRWorkflowConfig()` - Get site/severity-specific config
- `getNCRStateHistory()` - Audit trail
- `getNCRApprovalHistory()` - Approval tracking
- `closeNCRWithApproval()` - Final closure with approval
- `escalateOverdueApprovals()` - Escalate pending items
- `getNCRWorkflowStats()` - Workflow statistics

**Quality Metrics**:
- `calculateCpk()` - Process capability index
- `isProcessInControl()` - Statistical process control
- `calculateFirstPassYield()` - FPY calculation
- `isCertificateRequired()` - Certificate of compliance determination

### Architecture Pattern
- Uses dependency injection for PrismaClient
- Delegates to specialized services:
  - `UnifiedApprovalIntegration` - Approval workflow
  - `NCRWorkflowEnhancement` - NCR state management
  - `NCRWorkflowConfigService` - Configuration management

---

## 3. NCR-RELATED ROUTES AND SERVICES

### Routes

**Quality Routes** (`/home/tony/GitHub/MachShop3/src/routes/quality.ts`):
- GET `/api/v1/quality/inspections` - List inspections
- POST `/api/v1/quality/inspections` - Create inspection
- GET `/api/v1/quality/ncrs` - List NCRs
- GET `/api/v1/quality/ncrs/:id` - Get NCR detail

**NCR Workflow Routes** (`/home/tony/GitHub/MachShop3/src/routes/ncrWorkflow.ts`):
- GET `/api/v2/ncr/:ncrId/available-transitions` - Get allowed transitions
- POST `/api/v2/ncr/:ncrId/transition` - Execute state transition
- GET `/api/v2/ncr/approvals/pending` - Get pending approvals
- POST `/api/v2/ncr/approvals/:approvalRequestId/approve` - Approve
- POST `/api/v2/ncr/approvals/:approvalRequestId/reject` - Reject

**NCR Approvals Routes** (`/home/tony/GitHub/MachShop3/src/routes/ncrApprovals.ts`):
- GET `/api/v2/ncr-approvals/pending` - Pending approvals
- GET `/api/v2/ncr-approvals/:approvalId/details` - Approval details
- POST `/api/v2/ncr-approvals/:approvalId/approve` - Approve
- POST `/api/v2/ncr-approvals/:approvalId/reject` - Reject
- GET `/api/v2/ncr-approvals/user/:userId/pending` - User's pending

### Services

**NCRDispositionService** (`/home/tony/GitHub/MachShop3/src/services/NCRDispositionService.ts`):
- Config-based disposition validation (not hardcoded)
- Handles CTP, DDR, MRB workflows
- Cost tracking integration
- Approval requirement determination

**NCRWorkflowConfigService** (`/home/tony/GitHub/MachShop3/src/services/NCRWorkflowConfigService.ts`):
- Manages site-specific workflow configuration
- Severity-level-specific rules
- Defines allowed state transitions
- Controls disposition availability by state

**NCRStateTransitionService**:
- Validates state transitions
- Enforces workflow rules
- Creates state history records

**NCRApprovalService**:
- Manages approval requests
- Tracks approver responses
- Integrates with unified approval system

**WorkflowNotificationService** (`/home/tony/GitHub/MachShop3/src/services/WorkflowNotificationService.ts`):
- Notification creation and sending
- Multi-channel support (IN_APP, EMAIL, SMS, PUSH, SLACK)
- Escalation and reminder management

### NotificationService Architecture

**Location**: `/home/tony/GitHub/MachShop3/src/services/NotificationService.ts`

**Key Features**:
- Manages user notifications in database
- Multi-channel delivery (IN_APP, EMAIL, SMS, PUSH, SLACK)
- Notification filtering and retrieval
- Read/unread status tracking
- Bulk notification creation
- Notification statistics and analytics
- Expiration/cleanup of old notifications

**Key Methods**:
- `createNotification()` - Create single notification
- `createBulkNotifications()` - Create for multiple users
- `getUserNotifications()` - Retrieve with filters
- `markAsRead()`, `markAllAsRead()` - Status management
- `deleteNotification()` - Remove notification
- `getNotificationStats()` - Analytics
- `createCommentMentionNotification()` - Mention alerts
- `createReviewAssignmentNotification()` - Review assignments
- `createReviewDeadlineNotification()` - Deadline reminders
- `createDocumentUpdateNotification()` - Document changes
- `cleanupExpiredNotifications()` - Maintenance

---

## 4. QUALITY COMPONENT STRUCTURE - FRONTEND

### Location
`/home/tony/GitHub/MachShop3/frontend/src/pages/Quality/`

### Pages

**Quality.tsx**:
- Dashboard with quality metrics
- Recent inspections table
- First pass yield, defect rate
- NCR count and statistics
- Quick action buttons

**Inspections.tsx**:
- List inspections with filters
- Inspection status indicators
- Create new inspection button
- Integration with quality plans

**InspectionDetail.tsx**:
- Inspection overview
- Measurement details
- Quality characteristics
- Pass/fail results

**NCRs.tsx**:
- List NCRs with severity indicators
- Filter by status, severity
- Create new NCR
- Quick actions

**NCRDetail.tsx**:
- NCR overview with status
- Workflow and approvals tab
- Investigation tab
- Disposition tab
- Uses `NCRStateVisualizer` component
- State transition controls

**Approvals.tsx**:
- Pending approvals for current user
- Approval dashboard
- Quick approve/reject actions

### Components

**NCRStateVisualizer** (`/home/tony/GitHub/MachShop3/frontend/src/components/NCRWorkflow/`):
- Visual state machine representation
- Shows current state
- Lists available transitions
- Displays state history
- Shows approval requirements

**NCRApprovalDashboard**:
- Dashboard for pending approvals
- Approval details
- Action buttons for approvers

### Frontend API Service

**Location**: `/home/tony/GitHub/MachShop3/frontend/src/services/qualityApi.ts`

**Exported Types**:
```typescript
type InspectionResult = 'PASS' | 'FAIL' | 'CONDITIONAL'
type NCRSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL'
type NCRStatus = 'OPEN' | 'IN_REVIEW' | 'CORRECTIVE_ACTION' | 'CLOSED'

interface QualityInspection { ... }
interface NCR { ... }
interface InspectionListResponse { ... }
interface NCRListResponse { ... }
```

**Key Methods**:
- `getInspections(filters?)` - List inspections
- `getInspectionById(id)` - Get inspection detail
- `createInspection(data)` - Create inspection
- `updateInspectionResult()` - Update result
- `getNCRs(filters?)` - List NCRs
- `getNCRById(id)` - Get NCR detail
- `createNCR(data)` - Create NCR
- `updateNCRStatus()` - Change status
- `addCorrectiveAction()` - Add CA
- `closeNCR()` - Close NCR

---

## 5. NOTIFICATION SYSTEM ARCHITECTURE

### Core Notification Service

**Location**: `/home/tony/GitHub/MachShop3/src/services/NotificationService.ts`

**Features**:
- Centralized notification management
- Database persistence via Prisma
- Multi-channel delivery support:
  - IN_APP (immediate)
  - EMAIL (via SendGrid/AWS SES)
  - SMS (via Twilio/AWS SNS)
  - PUSH (via Firebase/APNs)
  - SLACK (via Slack API)

**Database Model** (UserNotification):
- id, userId, type, title, message
- relatedEntityType, relatedEntityId
- actionUrl for deep linking
- metadata (JSON)
- channels array
- priority levels (LOW, MEDIUM, HIGH, URGENT)
- isRead, readAt tracking
- expiresAt for auto-cleanup

**Notification Types** (from NotificationType enum):
- COMMENT_MENTION
- COMMENT_REPLY
- REVIEW_ASSIGNED
- REVIEW_DEADLINE
- DOCUMENT_UPDATED
- WORKFLOW_ASSIGNED
- APPROVAL_REQUIRED
- APPROVAL_COMPLETED
- SYSTEM_ALERT

### Workflow Notification Service

**Location**: `/home/tony/GitHub/MachShop3/src/services/WorkflowNotificationService.ts`

**Purpose**: 
- Workflow-specific notifications
- Escalations and reminders
- Multi-stage approval notifications

**Key Methods**:
- `sendWorkflowStartedNotification()` - Workflow initiated
- Escalation notifications for overdue items
- Reminder notifications at configurable intervals
- Daily/weekly digest notifications
- Role-based notification routing

### Notification Preferences

**User Preferences**:
- Channel preferences per notification type
- Quiet hours configuration
- Digest frequency (daily/weekly)
- Notification grouping preferences

### Integration Points

**With NCR Workflow**:
- Notification when NCR is assigned
- Notification when approval is required
- Notification when disposition is needed
- Notification when state transitions occur
- Escalation when approval is overdue

**With Quality Inspections**:
- Notification when inspection is assigned
- Notification when inspection results are ready
- Notification when quality issues are found

---

## EXISTING INFRASTRUCTURE SUMMARY

### Strengths
1. **Complete Prisma Schema**: All models defined for NCR, inspection, CAPA
2. **Advanced NCR States**: 12-state workflow supports complex disposition logic
3. **Flexible Configuration**: Site-specific and severity-level configurations
4. **Cost Tracking**: Built-in cost fields for disposition analysis
5. **Approval Integration**: Connected to unified approval system (Issue #147)
6. **Notification Framework**: Multi-channel notification system ready
7. **Frontend Components**: React components for viewing NCRs, inspections
8. **Quality Metrics**: Cpk, FPY, statistical process control
9. **Audit Trail**: Complete state history tracking

### What's Already in Place
- NCR creation and management
- Quality inspection and measurement recording
- CAPA model definition
- Disposition management (CTP, DDR, MRB)
- State machine workflows
- Configuration service
- Notification infrastructure
- Frontend pages and API service
- Role-based access control

### What Needs Implementation for CAPA Tracking
1. **CorrectiveActionService** - Full CAPA management operations
2. **CAPA Routes** - REST API endpoints for CAPA operations
3. **CAPA Frontend Pages** - React pages for CAPA management
4. **CAPA-to-NCR Linking** - Bi-directional relationships
5. **Effectiveness Verification** - Post-implementation verification workflow
6. **CAPA Status Reporting** - Dashboards and reports
7. **Root Cause Analysis Integration** - Methods implementation
8. **RCA Method Templates** - Five Why, Fishbone, Fault Tree, etc.
9. **CAPA Notifications** - Specific notification triggers
10. **Audit Trail** - Complete CAPA history tracking

---

## EXTENSION POINTS FOR CAPA TRACKING

### 1. Database Relations
Add to CorrectiveAction model:
- Link to NCR as source (already defined)
- Link to AuditFinding
- Multiple linked NCRs (one CA can address multiple NCRs)
- CAPA action history/audit trail

### 2. Services to Create
- `CorrectiveActionService` - CRUD and lifecycle management
- `RootCauseAnalysisService` - RCA method implementation
- `CapaEffectivenessService` - Verification workflow
- `CapaReportingService` - Analytics and reporting

### 3. Routes to Create
- `/api/v2/corrective-actions/*` - Full CAPA REST API
- Integration with existing notification routes
- Integration with approval workflow routes

### 4. Frontend to Create
- CorrectiveActionList component
- CorrectiveActionDetail page
- RCA analysis UI (method-specific templates)
- Effectiveness verification form
- CAPA dashboard/reporting

### 5. Notification Triggers
- CAPA assigned to user
- CAPA target date approaching
- CAPA overdue
- Implementation verification pending
- Effectiveness verification needed
- CAPA closed

### 6. Workflow State Machine
Current states ready: OPEN → IN_PROGRESS → IMPLEMENTED → VERIFIED_EFFECTIVE/INEFFECTIVE → CLOSED/CANCELLED

### 7. Approval Integration
- Implement approval for CAPA closure
- Implement approval for effectiveness verification
- Connect to Issue #147 unified approval system

---

## RECOMMENDED MIGRATION PATH FOR CAPA TRACKING

1. **Phase 1**: Create CorrectiveActionService with basic CRUD
2. **Phase 2**: Add state machine transitions and audit trail
3. **Phase 3**: Implement RCA methods and templates
4. **Phase 4**: Add effectiveness verification workflow
5. **Phase 5**: Create frontend pages and components
6. **Phase 6**: Implement notifications and approvals
7. **Phase 7**: Add reporting and dashboards
8. **Phase 8**: Integration testing and optimization

