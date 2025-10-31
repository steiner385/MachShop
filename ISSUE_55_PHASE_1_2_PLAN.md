# Issue #55: Enhanced NCR Workflow States & Disposition Management
# Phase 1-2 Implementation Plan

**Issue**: #55 - Enhanced NCR Workflow States & Disposition Management (CTP, DDR, MRB)
**Category**: Quality Management
**Business Value**: 9/10
**Effort Estimate**: 6 weeks (Phase 1-2 = ~40% of total)
**Strategic Focus**: Aerospace quality management with advanced disposition workflows
**Status**: Phase 1-2 Foundation (In Progress)

---

## Executive Summary

This issue extends the existing NCR (Non-Conformance Report) system with aerospace-specific workflow states and advanced disposition management. Phase 1-2 establishes the foundation for:

1. **Enhanced workflow states**: From 4 states (OPEN, UNDER_REVIEW, DISPOSITION_SET, CLOSED) to 12 states enabling advanced disposition workflows
2. **Configurable state machines**: Per-site and per-severity-level workflow configurations
3. **Advanced dispositions**: Support for CTP (Continue to Process), DDR (Delayed Disposition Required), and MRB (Material Review Board) workflows
4. **Approval frameworks**: Integration with Issue #147 unified approval system for disposition approvals
5. **Cost tracking**: Estimated and actual costs for dispositions
6. **Audit trails**: Complete state history and approval records

**Phase 1-2 Scope** (~40% of effort):
- Foundation models and types
- Core state machine logic
- Configuration system
- Basic API endpoints
- Integration test framework

**Phase 3-8 Scope** (~60% of effort, future):
- Advanced CTP/DDR/MRB workflows
- Comprehensive UI components
- Notification system
- Advanced analytics
- Blockchain audit trail
- Export capabilities
- Performance optimization for 1M+ NCRs

---

## Current State

### Existing NCR System (types/quality.ts)

```typescript
enum NCRStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DISPOSITION_SET = 'DISPOSITION_SET',
  CLOSED = 'CLOSED'
}

enum NCRSeverity {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL'
}

enum NCRDisposition {
  REWORK = 'REWORK',
  REPAIR = 'REPAIR',
  SCRAP = 'SCRAP',
  USE_AS_IS = 'USE_AS_IS',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER'
}

interface NonConformanceReport {
  id: string;
  ncrNumber: string;
  inspectionId?: string;
  workOrderId?: string;
  partId: string;
  description: string;
  quantityAffected: number;
  severity: NCRSeverity;
  status: NCRStatus;
  disposition?: NCRDisposition;
  dispositionReason?: string;
  rootCause?: string;
  correctiveAction?: string;
  reportedBy: string;
  reportedDate: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  closedBy?: string;
  closedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Known Issues
1. **Hardcoded restrictions**: Line 271-272 in QualityService.ts prevents CRITICAL NCRs from being USE_AS_IS
2. **Limited workflow**: Only 4 states, no support for complex aerospace workflows
3. **No cost tracking**: Dispositions don't track estimated/actual costs
4. **No approval integration**: Dispositions set without formal approval workflow
5. **No audit trail**: State changes not tracked with history

---

## Phase 1-2 Architecture

### 1. Enhanced Type Definitions (src/types/quality.ts)

#### 1.1 New Enums

```typescript
// Enhanced NCR States (from 4 to 12)
enum NCRStatus {
  // Basic states
  DRAFT = 'DRAFT',              // Initial creation
  SUBMITTED = 'SUBMITTED',      // Ready for review

  // Investigation states
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  CONTAINMENT = 'CONTAINMENT',

  // Disposition states
  PENDING_DISPOSITION = 'PENDING_DISPOSITION',

  // Advanced dispositions
  CTP = 'CTP',                  // Continue to Process (pending final disposition)
  DDR = 'DDR',                  // Delayed Disposition Required
  MRB = 'MRB',                  // Material Review Board

  // Final states
  CORRECTIVE_ACTION = 'CORRECTIVE_ACTION',
  VERIFICATION = 'VERIFICATION',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

// Enhanced Dispositions (from 5 to 7)
enum NCRDisposition {
  REWORK = 'REWORK',
  REPAIR = 'REPAIR',
  SCRAP = 'SCRAP',
  USE_AS_IS = 'USE_AS_IS',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
  SORT_AND_SEGREGATE = 'SORT_AND_SEGREGATE',
  RETURN_TO_STOCK = 'RETURN_TO_STOCK',
  ENGINEER_USE_ONLY = 'ENGINEER_USE_ONLY'
}

// Effectivity Types
enum NCREffectivityType {
  SERIAL_NUMBER = 'SERIAL_NUMBER',
  PRODUCTION_RUN = 'PRODUCTION_RUN',
  DATE_EFFECTIVE = 'DATE_EFFECTIVE',
  NONE = 'NONE'
}

// CTP State
enum CTPAuthorizationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

// DDR State
enum DDRStatus {
  PENDING = 'PENDING',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED'
}

// MRB State
enum MRBVoteStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ABSTAIN = 'ABSTAIN'
}
```

#### 1.2 New Interfaces

```typescript
// CTP (Continue to Process) Authorization
interface CTPAuthorization {
  id: string;
  ncrId: string;
  justification: string;
  authorizedBy: string;
  authorizationDate: Date;
  expirationDate: Date;
  status: CTPAuthorizationStatus;
  operationId?: string;
  trackedQuantity?: number;
  completedQuantity?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// DDR (Delayed Disposition Required)
interface DDRRequest {
  id: string;
  ncrId: string;
  reason: string;
  expectedResolutionDate: Date;
  requiredApprovals: string[];
  pendingItems: DDRPendingItem[];
  escalationLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DDRPendingItem {
  id: string;
  description: string;
  ownerEmail: string;
  targetDate: Date;
  isCompleted: boolean;
  completedDate?: Date;
  notes?: string;
}

// MRB (Material Review Board) Meeting
interface MRBMeeting {
  id: string;
  ncrId: string;
  scheduledDate: Date;
  meetingLocation?: string;
  mrbMembers: MRBMember[];
  mrbVotes: MRBVote[];
  decision?: NCRDisposition;
  decisionReason?: string;
  decisionDate?: Date;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  meetingNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MRBMember {
  email: string;
  role: string;           // e.g., 'ENGINEERING', 'QUALITY', 'OPERATIONS'
  votingStatus: MRBVoteStatus;
}

interface MRBVote {
  memberId: string;
  memberEmail: string;
  disposition: NCRDisposition;
  voteReason: string;
  votedAt: Date;
}

// State History (Audit Trail)
interface NCRStateHistory {
  id: string;
  ncrId: string;
  fromStatus: NCRStatus;
  toStatus: NCRStatus;
  changedBy: string;
  changedAt: Date;
  reason?: string;
  approvalDetails?: {
    approvalId: string;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
}

// Approval Request Integration with Issue #147
interface NCRApprovalRequest {
  id: string;
  ncrId: string;
  approvalType: 'DISPOSITION' | 'CTP_AUTHORIZATION' | 'DDR_RESOLUTION' | 'MRB_DECISION';
  approverEmail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: Date;
  responseDate?: Date;
  responseComment?: string;
  unifiedApprovalId?: string;  // Reference to Issue #147 unified approval
}

// Disposition Cost Tracking
interface DispositionCost {
  id: string;
  ncrId: string;
  disposition: NCRDisposition;
  estimatedCost: number;
  actualCost?: number;
  scrapCost?: number;
  reworkCost?: number;
  returnCost?: number;
  currency: string;           // e.g., 'USD', 'EUR'
  costCenter?: string;
  costApprovedBy?: string;
  costApprovalDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Workflow Configuration (site-specific, severity-level-specific)
interface NCRWorkflowConfig {
  id: string;
  siteId: string;
  severityLevel: NCRSeverity;
  allowedStateTransitions: {
    from: NCRStatus;
    to: NCRStatus[];
  }[];
  dispositionsByState: {
    status: NCRStatus;
    allowedDispositions: NCRDisposition[];
  }[];
  requiredApprovalsForDisposition: {
    severity: NCRSeverity;
    disposition: NCRDisposition;
    approverRoles: string[];
    approvalCount: number;
  }[];
  ctpExpirationDays: number;     // Default: 30 days
  ddrMaxDays: number;            // Default: 15 days
  mrbScheduleBuffer?: number;    // Days before MRB scheduling
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced NonConformanceReport (extends existing)
interface NonConformanceReportEnhanced extends NonConformanceReport {
  // Phase 1-2 enhancements
  status: NCRStatus;                    // Now uses enhanced enum
  disposition?: NCRDisposition;         // Now uses enhanced enum
  dispositionEffectivity?: {
    type: NCREffectivityType;
    value?: string;  // Serial number, date, production run
  };
  stateHistory: NCRStateHistory[];

  // Phase 1-2 - Advanced disposition tracking
  ctpAuthorization?: CTPAuthorization;
  ddrRequest?: DDRRequest;
  mrbMeeting?: MRBMeeting;

  // Phase 1-2 - Cost tracking
  dispositionCost?: DispositionCost;

  // Phase 1-2 - Approvals
  approvalRequests: NCRApprovalRequest[];

  // Audit fields
  lastModifiedBy: string;
  lastModifiedAt: Date;
}
```

---

### 2. Core Services (Phase 1-2)

#### 2.1 NCRWorkflowConfigService (src/services/NCRWorkflowConfigService.ts)

**Purpose**: Manages site-specific and severity-level-specific workflow configurations

**Key Methods**:
```typescript
class NCRWorkflowConfigService {
  // Configuration Management
  getConfigBySiteAndSeverity(siteId: string, severity: NCRSeverity): Promise<NCRWorkflowConfig>
  createOrUpdateConfig(config: NCRWorkflowConfig): Promise<NCRWorkflowConfig>

  // Validation
  isTransitionAllowed(siteId: string, severity: NCRSeverity, from: NCRStatus, to: NCRStatus): Promise<boolean>
  isDispositionAllowedInState(siteId: string, status: NCRStatus, disposition: NCRDisposition): Promise<boolean>
  getRequiredApproversForDisposition(siteId: string, severity: NCRSeverity, disposition: NCRDisposition): Promise<string[]>
}
```

**Implementation Notes**:
- Caches configurations in memory with TTL
- Falls back to default config if site-specific not found
- Validates transitions before NCR state changes

#### 2.2 NCRStateTransitionService (src/services/NCRStateTransitionService.ts)

**Purpose**: Manages NCR state transitions with validation

**Key Methods**:
```typescript
class NCRStateTransitionService {
  // State Transitions
  transitionState(ncrId: string, toStatus: NCRStatus, changedBy: string, reason?: string): Promise<NonConformanceReportEnhanced>

  // Batch transitions
  bulkTransitionState(ncrIds: string[], toStatus: NCRStatus, changedBy: string): Promise<NonConformanceReportEnhanced[]>

  // State history
  getStateHistory(ncrId: string): Promise<NCRStateHistory[]>

  // Validation
  validateTransition(ncrId: string, toStatus: NCRStatus): Promise<{ valid: boolean; errors: string[] }>
}
```

**Implementation Notes**:
- Validates transition against workflow config
- Creates state history record
- Integrates with approval system (Issue #147)
- Prevents invalid state transitions

#### 2.3 NCRDispositionService (src/services/NCRDispositionService.ts)

**Purpose**: Manages disposition setting with approval integration

**Key Methods**:
```typescript
class NCRDispositionService {
  // Disposition Management
  setDisposition(ncrId: string, disposition: NCRDisposition, reason: string, setBy: string): Promise<NonConformanceReportEnhanced>

  // Cost Tracking
  setDispositionCost(ncrId: string, cost: DispositionCost): Promise<DispositionCost>
  getDispositionCost(ncrId: string): Promise<DispositionCost | null>

  // Batch disposition
  bulkSetDisposition(ncrIds: string[], disposition: NCRDisposition, reason: string, setBy: string): Promise<NonConformanceReportEnhanced[]>
}
```

**Implementation Notes**:
- Removes hardcoded restriction from line 271-272 in QualityService.ts
- Replaces severity-based validation with config-based validation
- Tracks who set the disposition and when
- Integrates with cost tracking

#### 2.4 CTPAuthorizationService (src/services/CTPAuthorizationService.ts)

**Purpose**: Manages Continue-to-Process authorizations

**Key Methods**:
```typescript
class CTPAuthorizationService {
  // CTP Authorization
  createCTPAuthorization(ncrId: string, justification: string, authorizedBy: string, expirationDays?: number): Promise<CTPAuthorization>
  getCTPAuthorization(ncrId: string): Promise<CTPAuthorization | null>
  revokeCTPAuthorization(ctpId: string, revokedBy: string): Promise<CTPAuthorization>

  // Tracking
  trackCTPUsage(ctpId: string, operationId: string, quantity: number): Promise<CTPAuthorization>

  // Expiration
  checkExpiredCTPAuthorizations(): Promise<CTPAuthorization[]>
}
```

**Implementation Notes**:
- Creates approval request via Issue #147
- Tracks CTP usage through operations
- Auto-expires based on configured expiration days
- Integrates with corrective action workflow

#### 2.5 DDRRequestService (src/services/DDRRequestService.ts)

**Purpose**: Manages Delayed Disposition Required requests

**Key Methods**:
```typescript
class DDRRequestService {
  // DDR Management
  createDDRRequest(ncrId: string, reason: string, expectedResolutionDate: Date, createdBy: string): Promise<DDRRequest>
  updateDDRRequest(ddrId: string, updates: Partial<DDRRequest>): Promise<DDRRequest>
  resolveDDRRequest(ddrId: string, resolvedBy: string): Promise<DDRRequest>

  // Pending Items
  addPendingItem(ddrId: string, item: DDRPendingItem): Promise<DDRRequest>
  completePendingItem(ddrId: string, itemId: string): Promise<DDRRequest>

  // Escalation
  escalateDDRRequest(ddrId: string, escalatedBy: string): Promise<DDRRequest>
}
```

**Implementation Notes**:
- Tracks pending items with owners and target dates
- Supports escalation levels (1, 2, 3)
- Auto-escalates if resolution date passed
- Integrates with notification system (Phase 3)

#### 2.6 MRBMeetingService (src/services/MRBMeetingService.ts)

**Purpose**: Manages Material Review Board meetings

**Key Methods**:
```typescript
class MRBMeetingService {
  // Meeting Management
  scheduleMRBMeeting(ncrId: string, scheduledDate: Date, mrbMembers: MRBMember[], createdBy: string): Promise<MRBMeeting>
  updateMRBMeeting(mrbId: string, updates: Partial<MRBMeeting>): Promise<MRBMeeting>

  // Voting
  recordMRBVote(mrbId: string, vote: MRBVote): Promise<MRBMeeting>
  getMRBVoteStatus(mrbId: string): Promise<{ allVotesReceived: boolean; disposition?: NCRDisposition }>

  // Meeting Status
  startMRBMeeting(mrbId: string): Promise<MRBMeeting>
  completeMRBMeeting(mrbId: string, decision: NCRDisposition, decisionReason: string, completedBy: string): Promise<MRBMeeting>
  cancelMRBMeeting(mrbId: string, reason: string): Promise<MRBMeeting>
}
```

**Implementation Notes**:
- Tracks votes from all MRB members
- Determines decision based on majority vote
- Creates approval request with decision
- Supports recorded meetings (Phase 2)

---

### 3. API Endpoints (Phase 1-2)

#### 3.1 NCR State Management Endpoints

```
POST   /api/quality/ncrs/:ncrId/transitions
       Request: { toStatus: NCRStatus, reason?: string }
       Response: NonConformanceReportEnhanced
       Auth: QUALITY_MANAGER

GET    /api/quality/ncrs/:ncrId/history
       Response: NCRStateHistory[]
       Auth: QUALITY_VIEWER

POST   /api/quality/ncrs/bulk-transition
       Request: { ncrIds: string[], toStatus: NCRStatus, reason?: string }
       Response: NonConformanceReportEnhanced[]
       Auth: QUALITY_MANAGER
```

#### 3.2 Disposition Management Endpoints

```
POST   /api/quality/ncrs/:ncrId/disposition
       Request: { disposition: NCRDisposition, reason: string }
       Response: NonConformanceReportEnhanced
       Auth: QUALITY_MANAGER

GET    /api/quality/ncrs/:ncrId/disposition-cost
       Response: DispositionCost
       Auth: QUALITY_VIEWER

PUT    /api/quality/ncrs/:ncrId/disposition-cost
       Request: DispositionCost
       Response: DispositionCost
       Auth: FINANCE_MANAGER

POST   /api/quality/ncrs/bulk-disposition
       Request: { ncrIds: string[], disposition: NCRDisposition, reason: string }
       Response: NonConformanceReportEnhanced[]
       Auth: QUALITY_MANAGER
```

#### 3.3 CTP Authorization Endpoints

```
POST   /api/quality/ncrs/:ncrId/ctp-authorization
       Request: { justification: string, expirationDays?: number }
       Response: CTPAuthorization
       Auth: QUALITY_MANAGER

GET    /api/quality/ncrs/:ncrId/ctp-authorization
       Response: CTPAuthorization | null
       Auth: QUALITY_VIEWER

DELETE /api/quality/ncrs/:ncrId/ctp-authorization/:ctpId
       Auth: QUALITY_MANAGER

POST   /api/quality/ctp-authorizations/:ctpId/track-usage
       Request: { operationId: string, quantity: number }
       Response: CTPAuthorization
       Auth: OPERATIONS_PERSONNEL
```

#### 3.4 DDR Management Endpoints

```
POST   /api/quality/ncrs/:ncrId/ddr-request
       Request: { reason: string, expectedResolutionDate: Date }
       Response: DDRRequest
       Auth: QUALITY_MANAGER

GET    /api/quality/ncrs/:ncrId/ddr-request
       Response: DDRRequest | null
       Auth: QUALITY_VIEWER

PUT    /api/quality/ddr-requests/:ddrId/pending-items
       Request: { itemId: string, completed: boolean }
       Response: DDRRequest
       Auth: TEAM_LEAD

PUT    /api/quality/ddr-requests/:ddrId/escalate
       Request: { escalatedBy: string }
       Response: DDRRequest
       Auth: QUALITY_MANAGER

PUT    /api/quality/ddr-requests/:ddrId/resolve
       Request: { resolvedBy: string }
       Response: DDRRequest
       Auth: QUALITY_MANAGER
```

#### 3.5 MRB Meeting Endpoints

```
POST   /api/quality/ncrs/:ncrId/mrb-meeting
       Request: { scheduledDate: Date, mrbMembers: MRBMember[] }
       Response: MRBMeeting
       Auth: QUALITY_MANAGER

GET    /api/quality/ncrs/:ncrId/mrb-meeting
       Response: MRBMeeting | null
       Auth: QUALITY_VIEWER

PUT    /api/quality/mrb-meetings/:mrbId/start
       Auth: QUALITY_MANAGER

PUT    /api/quality/mrb-meetings/:mrbId/vote
       Request: { vote: MRBVote }
       Response: MRBMeeting
       Auth: MRB_MEMBER

PUT    /api/quality/mrb-meetings/:mrbId/complete
       Request: { decision: NCRDisposition, decisionReason: string }
       Response: MRBMeeting
       Auth: QUALITY_MANAGER

GET    /api/quality/mrb-meetings/:mrbId/vote-status
       Response: { allVotesReceived: boolean, disposition?: NCRDisposition }
       Auth: QUALITY_VIEWER
```

#### 3.6 Workflow Configuration Endpoints

```
GET    /api/quality/workflow-config/:siteId/:severity
       Response: NCRWorkflowConfig
       Auth: QUALITY_MANAGER

PUT    /api/quality/workflow-config/:siteId/:severity
       Request: NCRWorkflowConfig
       Response: NCRWorkflowConfig
       Auth: QUALITY_MANAGER

GET    /api/quality/workflow-config/:siteId/:severity/transitions
       Response: { from: NCRStatus, to: NCRStatus[] }[]
       Auth: QUALITY_VIEWER

GET    /api/quality/workflow-config/:siteId/:severity/validate-transition
       Query: { from: NCRStatus, to: NCRStatus }
       Response: { valid: boolean, errors: string[] }
       Auth: QUALITY_VIEWER
```

---

### 4. Database Schema Extensions (Phase 1-2)

#### 4.1 New Prisma Models

```prisma
model NCRWorkflowConfig {
  id                String        @id @default(cuid())
  siteId            String
  severityLevel     NCRSeverity

  // State transitions JSON
  allowedStateTransitions  Json  // { from: string, to: string[] }[]
  dispositionsByState      Json  // { status: string, allowedDispositions: string[] }[]
  requiredApprovalsConfig  Json  // Complex approval rules

  ctpExpirationDays    Int       @default(30)
  ddrMaxDays          Int       @default(15)
  mrbScheduleBuffer   Int?

  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  @@unique([siteId, severityLevel])
}

model NCRStateHistory {
  id          String    @id @default(cuid())
  ncrId       String
  fromStatus  String
  toStatus    String
  changedBy   String
  changedAt   DateTime  @default(now())
  reason      String?
  approvalId  String?

  createdAt   DateTime  @default(now())

  @@index([ncrId])
  @@index([changedAt])
}

model CTPAuthorization {
  id              String    @id @default(cuid())
  ncrId           String    @unique
  justification   String
  authorizedBy    String
  authorizationDate DateTime @default(now())
  expirationDate  DateTime
  status          String    @default("APPROVED")

  operationId     String?
  trackedQuantity Int?
  completedQuantity Int?
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([ncrId])
  @@index([expirationDate])
}

model DDRRequest {
  id                    String    @id @default(cuid())
  ncrId                 String    @unique
  reason                String
  expectedResolutionDate DateTime
  escalationLevel       Int       @default(0)

  pendingItems          Json      // DDRPendingItem[]
  requiredApprovals     String[]

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([ncrId])
  @@index([expectedResolutionDate])
}

model MRBMeeting {
  id              String    @id @default(cuid())
  ncrId           String    @unique
  scheduledDate   DateTime
  meetingLocation String?

  mrbMembers      Json      // MRBMember[]
  mrbVotes        Json      // MRBVote[]

  decision        String?
  decisionReason  String?
  decisionDate    DateTime?
  status          String    @default("SCHEDULED")
  meetingNotes    String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([ncrId])
  @@index([scheduledDate])
}

model NCRApprovalRequest {
  id                String    @id @default(cuid())
  ncrId             String
  approvalType      String    // DISPOSITION, CTP_AUTHORIZATION, DDR_RESOLUTION, MRB_DECISION
  approverEmail     String
  status            String    @default("PENDING")

  requestedAt       DateTime  @default(now())
  responseDate      DateTime?
  responseComment   String?

  unifiedApprovalId String?   // Reference to Issue #147

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([ncrId])
  @@index([approverEmail])
  @@index([status])
}

model DispositionCost {
  id              String    @id @default(cuid())
  ncrId           String    @unique
  disposition     String

  estimatedCost   Float
  actualCost      Float?
  scrapCost       Float?
  reworkCost      Float?
  returnCost      Float?
  currency        String    @default("USD")

  costCenter      String?
  costApprovedBy  String?
  costApprovalDate DateTime?
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([ncrId])
  @@index([disposition])
}
```

---

### 5. Integration Tests (Phase 1-2)

#### 5.1 Test Structure (src/tests/services/ncr-workflow/)

```
src/tests/services/ncr-workflow/
├── NCRStateTransition.test.ts           (50+ tests)
├── NCRDisposition.test.ts               (40+ tests)
├── CTPAuthorization.test.ts             (30+ tests)
├── DDRRequest.test.ts                   (30+ tests)
├── MRBMeeting.test.ts                   (40+ tests)
├── NCRWorkflowConfig.test.ts            (25+ tests)
└── NCRWorkflowIntegration.test.ts       (50+ tests - end-to-end)
```

#### 5.2 Sample Test Scenarios

```typescript
describe('NCR State Transitions', () => {
  // Test allowed transitions per workflow config
  test('allows DRAFT → SUBMITTED transition for MINOR severity', async () => {})
  test('allows SUBMITTED → UNDER_INVESTIGATION for all severities', async () => {})
  test('prevents invalid transitions (e.g., DRAFT → CLOSED)', async () => {})

  // Test approval requirements
  test('requires approval before UNDER_INVESTIGATION → DISPOSITION_SET', async () => {})
  test('creates approval request on state transition', async () => {})

  // Test state history
  test('creates state history record for each transition', async () => {})
  test('retrieves state history in chronological order', async () => {})
})

describe('Disposition Management', () => {
  // Test disposition setting
  test('sets disposition with cost tracking', async () => {})
  test('validates disposition is allowed in current state', async () => {})
  test('removes hardcoded severity restrictions', async () => {})

  // Test cost tracking
  test('tracks estimated and actual costs', async () => {})
  test('calculates total disposition cost', async () => {})
})

describe('CTP Authorization', () => {
  // Test authorization
  test('creates CTP authorization for MINOR severity NCRs', async () => {})
  test('requires approval for CRITICAL severity CTP', async () => {})
  test('auto-expires CTP after configured days', async () => {})

  // Test tracking
  test('tracks CTP usage through operations', async () => {})
  test('maintains accurate completed quantity', async () => {})
})

describe('DDR Request', () => {
  // Test DDR creation
  test('creates DDR request with pending items', async () => {})
  test('tracks pending item completion', async () => {})

  // Test escalation
  test('escalates DDR if resolution date passed', async () => {})
  test('notifies escalation recipients', async () => {})
})

describe('MRB Meeting', () => {
  // Test meeting management
  test('schedules MRB meeting with all members', async () => {})
  test('prevents decisions until all votes received', async () => {})
  test('determines decision based on majority vote', async () => {})

  // Test voting
  test('records votes from each MRB member', async () => {})
  test('validates vote data', async () => {})
})

describe('End-to-End Workflow', () => {
  // Complex multi-step scenarios
  test('CRITICAL NCR: DRAFT → SUBMITTED → UNDER_INVESTIGATION → DDR → MRB → CLOSED', async () => {})
  test('MAJOR NCR with CTP: DRAFT → SUBMITTED → CTP → VERIFICATION → CLOSED', async () => {})
  test('Bulk disposition with cost approval', async () => {})
})
```

---

## Phase 1-2 Deliverables

### Code Files

1. **Type Definitions** (src/types/quality.ts - ~600 lines)
   - Enhanced NCRStatus enum (12 states)
   - Enhanced NCRDisposition enum (8 dispositions)
   - 8 new interfaces (CTPAuthorization, DDRRequest, MRBMeeting, etc.)
   - Workflow configuration schema

2. **Services** (8 files, ~2,500 lines total)
   - NCRWorkflowConfigService.ts (~300 lines)
   - NCRStateTransitionService.ts (~400 lines)
   - NCRDispositionService.ts (~350 lines)
   - CTPAuthorizationService.ts (~350 lines)
   - DDRRequestService.ts (~400 lines)
   - MRBMeetingService.ts (~450 lines)
   - NCRApprovalIntegration.ts (~250 lines) - Issue #147 integration

3. **Database** (Prisma migrations - ~200 lines)
   - 7 new models (NCRWorkflowConfig, NCRStateHistory, etc.)
   - Indexes on frequently queried fields
   - Foreign key relationships

4. **API Routes** (src/routes/qualityRoutes.ts extension - ~500 lines)
   - 15+ new endpoints for state transitions, dispositions, CTP, DDR, MRB
   - Comprehensive request/response validation
   - Error handling

5. **Tests** (src/tests/services/ncr-workflow/ - ~1,500 lines)
   - 265+ test cases covering all services
   - Integration tests for end-to-end workflows
   - Edge case handling

### Documentation

1. **ISSUE_55_PHASE_1_2_PLAN.md** (This file - ~1,000 lines)
   - Complete architecture design
   - Database schema
   - API specifications
   - Test plan

2. **Updated README.md** (docs/quality/NCR_WORKFLOW.md - ~300 lines)
   - Quick start guide
   - Configuration examples
   - Common workflows

---

## Phase 3-8 Roadmap (Future)

### Phase 3: Advanced CTP/DDR/MRB Workflows (1-2 weeks)
- Complete CTP tracking with serialization
- DDR escalation rules and automation
- MRB meeting recordings and decision documentation
- Advanced approvals (multiple signers, conditional)

### Phase 4: Frontend Components (1-2 weeks)
- NCR state machine diagram visualizer
- Workflow configuration UI
- CTP/DDR/MRB dashboards
- Real-time approval notifications

### Phase 5: Notification System (1 week)
- Email notifications for state transitions
- Approval request notifications
- CTP expiration warnings
- DDR escalation alerts
- MRB meeting reminders

### Phase 6: Analytics & Reporting (1 week)
- NCR trend analysis
- Disposition effectiveness metrics
- CTP duration analysis
- MRB decision patterns
- Cost impact analysis

### Phase 7: Advanced Features (1 week)
- Blockchain audit trail (immutable NCR history)
- AI-powered root cause suggestions
- Predictive failure analysis
- Supplier quality integration
- CAD/PLM integration (Issue #241)

### Phase 8: Performance & Scale (1 week)
- Optimize for 1M+ NCR records
- Caching strategy for configs
- Batch processing improvements
- Search and filtering optimization
- Pagination for large datasets

---

## Testing Strategy

### Unit Tests (Per Service)
- 30-40 tests per service
- Covers all public methods
- Tests error conditions
- Validates business rules

### Integration Tests
- 50+ end-to-end workflow tests
- Tests approval workflow integration (Issue #147)
- Tests state machine completeness
- Validates cost tracking

### Test Coverage Goal
- **Phase 1-2 Target**: 80%+ code coverage
- **Critical Paths**: 100% coverage
- **Edge Cases**: Comprehensive coverage

### Test Data
- 100+ sample NCRs (various severities/states)
- Pre-configured workflow configs
- Sample approval scenarios
- CTP/DDR/MRB test fixtures

---

## Acceptance Criteria

### Functional Requirements
- ✅ 12 NCR states fully implemented and transitionable
- ✅ 8 dispositions supported with config-based validation
- ✅ CTP authorization workflow complete
- ✅ DDR request management with pending items
- ✅ MRB meeting scheduling and voting
- ✅ Disposition cost tracking
- ✅ State history audit trail (100% of transitions)
- ✅ Integration with Issue #147 unified approval system

### Code Quality
- ✅ TypeScript strict mode (no `any`)
- ✅ Comprehensive JSDoc comments
- ✅ 80%+ test coverage
- ✅ No linting errors
- ✅ Proper error handling

### Performance
- ✅ State transitions: <50ms (p95)
- ✅ Disposition setting: <50ms (p95)
- ✅ Workflow config queries: <20ms (p95)
- ✅ History retrieval: <100ms for 1,000 records
- ✅ Memory usage: <50MB for 10,000 NCRs

### Documentation
- ✅ API documentation (Swagger/OpenAPI)
- ✅ Service documentation
- ✅ Configuration guide
- ✅ Testing guide
- ✅ Integration examples

---

## Known Issues to Address

### Issue 1: Hardcoded Disposition Restriction (QualityService.ts:271-272)
**Location**: src/services/QualityService.ts:271-272
```typescript
if (ncr.severity === NCRSeverity.CRITICAL && disposition === NCRDisposition.USE_AS_IS) {
  throw new Error('Critical NCRs cannot be dispositioned as USE_AS_IS');
}
```

**Action**:
- Remove hardcoded check
- Replace with config-based validation in NCRDispositionService
- Allows per-site/per-severity customization

---

## Dependencies

### Issue #147: Core Unified Workflow Engine
- **Status**: Completed
- **Usage**: NCR approvals use unified approval system
- **Integration Points**: State transition approvals, CTP authorization, DDR resolution, MRB decisions

### Issue #241: Teamcenter PLM Surrogate
- **Status**: Phase 1-2 Complete
- **Usage**: Future phase - CAD/BOM integration with NCRs
- **Integration Points**: Phase 7 (Advanced Features)

### External Dependencies
- `@prisma/client` - Database ORM
- `uuid` - ID generation
- `zod` - Request validation (if adopting)

---

## Success Metrics

### Adoption Metrics
- NCR workflows using enhanced states by end of Phase 2: 50%
- New dispositions used: DDR/MRB in 30% of NCRs
- CTP authorizations created: 20% of NCRs

### Quality Metrics
- NCR resolution time: -15% improvement
- Disposition effectiveness: +20%
- Cost tracking accuracy: 95%

### Performance Metrics
- API response times: <100ms (p95)
- Database query times: <50ms (p95)
- Zero data loss events: 100%

---

## Timeline (Phase 1-2)

**Estimated Duration**: 2-3 weeks

### Week 1
- Day 1-2: Type definitions and schema
- Day 3-4: Core services (Config, StateTransition, Disposition)
- Day 5: Database migration

### Week 2
- Day 1-2: Advanced services (CTP, DDR, MRB)
- Day 3-4: API endpoints
- Day 5: Initial testing

### Week 3
- Day 1-2: Complete test suite
- Day 3-4: Documentation
- Day 5: Code review and polish

---

## References

- Issue #147: Core Unified Workflow Engine - Approval system
- Issue #241: Teamcenter PLM Surrogate - Future CAD integration
- Issue #56, #57, #58: Blocked by this issue (will be unblocked in Phase 3)
- Issue #266: Quality Management: Teamcenter Quality MRB Integration (depends on Phase 3)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-31
**Author**: Claude Code
**Status**: Phase 1-2 Planning Complete
