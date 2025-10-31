# Time Tracking Infrastructure Analysis for Issue #51
## Time Entry Management & Approvals System

---

## Executive Summary

The MachShop codebase has a **mature time tracking infrastructure** (Issue #46) that provides the foundation for implementing Issue #51 (Time Entry Management & Approvals). The system is built with:

- **Comprehensive database models** for labor time entries, machine time entries, and configuration
- **RESTful API layer** with validation and permission-based authorization
- **Service layer** implementing business logic for clock-in/out operations
- **Configuration system** with flexible approval workflows
- **Approval integration** through the Unified Approval Engine (Issue #147)

This analysis identifies the key extension points, existing validation rules, and how to integrate approvals into the time entry lifecycle.

---

## 1. EXISTING DATABASE MODELS

### 1.1 LaborTimeEntry Model
**Location**: `/home/tony/GitHub/MachShop/prisma/schema.prisma` (lines 4930-4972)

**Purpose**: Records when operators clock in and out for work orders, operations, or indirect activities

**Key Fields**:
- `id` (String, PK): Unique identifier
- `userId` (String, FK): User performing work
- `workOrderId` (String?, FK): Target work order
- `operationId` (String?, FK): Specific operation within work order
- `indirectCodeId` (String?, FK): Reference to indirect cost code
- `timeType` (TimeType): DIRECT_LABOR | INDIRECT | MACHINE
- `clockInTime` (DateTime): When entry started
- `clockOutTime` (DateTime?): When entry ended
- `duration` (Float?): Hours worked
- `entrySource` (TimeEntrySource): MANUAL | KIOSK | MOBILE | MACHINE_AUTO | API | HISTORIAN
- `deviceId` (String?): Source device identifier
- `location` (String?): Physical location
- **APPROVAL FIELDS**:
  - `status` (TimeEntryStatus): ACTIVE | COMPLETED | PENDING_APPROVAL | APPROVED | REJECTED | EXPORTED
  - `approvedBy` (String?): User who approved
  - `approvedAt` (DateTime?): When approved
  - `rejectionReason` (String?): Why rejected
- **EDIT TRACKING**:
  - `originalClockInTime` (DateTime?): Original clock in before edit
  - `originalClockOutTime` (DateTime?): Original clock out before edit
  - `editedBy` (String?): User who edited
  - `editedAt` (DateTime?): When edited
  - `editReason` (String?): Why edited
- **COSTING**:
  - `laborRate` (Float?): Hourly rate
  - `laborCost` (Float?): Total cost
  - `costCenter` (String?): Accounting cost center
- **EXPORT**:
  - `exportedToSystem` (String?): External system identifier
  - `exportedAt` (DateTime?): When exported
  - `externalReferenceId` (String?): External system ID

**Relationships**:
```
LaborTimeEntry
├── User (userId) - The operator
├── WorkOrder (workOrderId) - Associated work
├── WorkOrderOperation (operationId) - Specific operation
└── IndirectCostCode (indirectCodeId) - Break, lunch, etc.
```

**Indices**: userId, workOrderId, operationId, status, clockInTime, timeType

### 1.2 MachineTimeEntry Model
**Location**: `/home/tony/GitHub/MachShop/prisma/schema.prisma` (lines 4976-5006)

**Purpose**: Records machine/equipment runtime separately from labor for equipment-based costing

**Key Fields**:
- `id` (String, PK)
- `equipmentId` (String, FK)
- `workOrderId` (String?, FK)
- `operationId` (String?, FK)
- `startTime` (DateTime)
- `endTime` (DateTime?)
- `duration` (Float?)
- `entrySource` (TimeEntrySource)
- `dataSource` (String?): Origin of machine data
- `cycleCount` (Int?)
- `partCount` (Int?)
- `machineUtilization` (Float?)
- `status` (TimeEntryStatus): Same enum as labor entries
- `machineRate` (Float?): Equipment hourly rate
- `machineCost` (Float?)
- `exportedToSystem` (String?)
- `exportedAt` (DateTime?)

### 1.3 TimeTrackingConfiguration Model
**Location**: `/home/tony/GitHub/MachShop/prisma/schema.prisma` (lines 4901-4926)

**Purpose**: Site-level configuration for how time tracking operates

**Key Fields**:
- `timeTrackingEnabled` (Boolean): Master on/off
- `trackingGranularity` (TimeTrackingGranularity): NONE | WORK_ORDER | OPERATION
- `costingModel` (CostingModel): LABOR_HOURS | MACHINE_HOURS | BOTH
- `allowMultiTasking` (Boolean): Can user track multiple activities simultaneously?
- `multiTaskingMode` (MultiTaskingMode): CONCURRENT | SPLIT_ALLOCATION
- `autoSubtractBreaks` (Boolean): Automatic break time deduction
- `standardBreakMinutes` (Int?): Default break duration
- `requireBreakClockOut` (Boolean): Must users explicitly clock out for breaks?
- `overtimeThresholdHours` (Float): When to trigger overtime warnings
- `warnOnOvertime` (Boolean)
- `enableMachineTracking` (Boolean)
- `autoStartFromMachine` (Boolean): Auto-start based on equipment sensors
- `autoStopFromMachine` (Boolean): Auto-stop based on equipment sensors
- **APPROVAL CONFIGURATION**:
  - `requireTimeApproval` (Boolean): **KEY FIELD** - Does time require approval?
  - `approvalFrequency` (ApprovalFrequency): DAILY | WEEKLY | BIWEEKLY | NONE

**Relationship**: Site -> TimeTrackingConfiguration (1:1)

### 1.4 TimeEntryValidationRule Model
**Location**: `/home/tony/GitHub/MachShop/prisma/schema.prisma` (lines 5035-5050)

**Purpose**: Configurable validation rules for enforcing business logic

**Key Fields**:
- `ruleName` (String): Display name
- `ruleType` (TimeValidationRuleType):
  - MAX_DURATION: Time entry cannot exceed X hours
  - MIN_DURATION: Time entry must be at least X hours
  - MISSING_CLOCK_OUT: Detect unclosed entries
  - CONCURRENT_ENTRIES: Prevent overlapping time
  - OVERTIME_THRESHOLD: Warn/block on overtime
  - INVALID_TIME_RANGE: Clock-out before clock-in checks
- `condition` (String): Rule expression/condition
- `errorMessage` (String): User-facing error message
- `severity` (String): ERROR | WARNING
- `isActive` (Boolean)
- `siteId` (String?): Site-specific rules

### 1.5 IndirectCostCode Model
**Location**: `/home/tony/GitHub/MachShop/prisma/schema.prisma` (lines 5010-5031)

**Purpose**: Categories for non-productive time (breaks, training, etc.)

**Key Fields**:
- `code` (String, UNIQUE): Code like "BREAK-15", "LUNCH-30"
- `description` (String)
- `category` (IndirectCategory):
  - BREAK, LUNCH, TRAINING, MEETING, MAINTENANCE, SETUP, CLEANUP, WAITING, ADMINISTRATIVE, OTHER
- `costCenter` (String?): Accounting code
- `glAccount` (String?): General ledger account
- `siteId` (String?): Site scope
- `displayColor` (String?): UI color
- `displayIcon` (String?): UI icon

---

## 2. SERVICE LAYER

### 2.1 TimeTrackingService
**Location**: `/home/tony/GitHub/MachShop/src/services/TimeTrackingService.ts`

**Class**: `TimeTrackingService`

**Core Methods**:

#### Clock Operations
```typescript
async clockIn(request: ClockInRequest): Promise<LaborTimeEntry>
```
- **Purpose**: Create a new labor time entry
- **Input**: UserId, work order/operation/indirect code, entry source, device, location
- **Validation**:
  - User exists and assigned to site
  - Time tracking enabled for site
  - No active entries (unless multi-tasking enabled)
  - Tracking granularity honored
- **Output**: Created LaborTimeEntry with status ACTIVE (or PENDING_APPROVAL if configured)
- **Costing**: Calculates initial labor rate from user profile
- **Extension Point**: This returns entry with status ACTIVE initially, but config.requireTimeApproval determines final status

```typescript
async clockOut(request: ClockOutRequest): Promise<LaborTimeEntry>
```
- **Purpose**: Complete a time entry
- **Logic**:
  1. Validate entry exists and is ACTIVE
  2. Calculate duration in hours
  3. Apply break rules if configured (autoSubtractBreaks)
  4. Calculate labor cost (duration × laborRate)
  5. Set status to COMPLETED or PENDING_APPROVAL based on config.requireTimeApproval
- **Return**: Updated entry with duration, laborCost calculated
- **Extension Point**: Status transitions happen here - where approval workflow could be triggered

#### Time Entry Retrieval
```typescript
async getActiveTimeEntries(userId: string): Promise<LaborTimeEntry[]>
async getTimeEntries(filters: {...}): Promise<{entries, total, hasMore}>
```
- Retrieves time entries with flexible filtering
- Supports pagination

#### Emergency Operations
```typescript
async stopAllActiveEntries(userId: string, reason: string): Promise<LaborTimeEntry[]>
```
- Force-stops all active entries with reason tracking
- Uses `editReason` field to record why

#### Validation
```typescript
async validateTimeEntry(timeEntry: LaborTimeEntry): Promise<ValidationResult>
```
- **Checks**:
  - Duration <= 24 hours
  - Duration >= 0
  - Active entries > 16 hours (warning)
  - Overlapping entries with other times
- **Returns**: `{isValid: boolean, errors: [], warnings: []}`
- **Extension Point**: This is where custom business rules could be enforced

#### Costing
```typescript
async calculateLaborCost(timeEntryId: string): Promise<number>
async calculateMachineCost(machineTimeEntryId: string): Promise<number>
```

#### Configuration
```typescript
async getTimeTrackingConfiguration(siteId: string): Promise<TimeTrackingConfiguration>
```
- Gets or creates default config for site
- **KEY FIELD**: config.requireTimeApproval determines if approvals are needed

#### Machine Time Operations
```typescript
async startMachineTime(request: MachineTimeStartRequest): Promise<MachineTimeEntry>
async stopMachineTime(machineTimeEntryId: string, endTime?: Date): Promise<MachineTimeEntry>
```

---

## 3. API ENDPOINTS

### 3.1 Time Entry Operations

**POST /api/v1/time-tracking/clock-in**
```json
Request:
{
  "userId": "user-123",
  "workOrderId": "wo-456",
  "operationId": "op-789",
  "indirectCodeId": "break-15",
  "entrySource": "KIOSK|MOBILE|MANUAL",
  "deviceId": "kiosk-01",
  "location": "Station-A"
}

Response:
{
  "success": true,
  "data": {
    "id": "entry-123",
    "userId": "user-123",
    "workOrderId": "wo-456",
    "clockInTime": "2024-01-15T08:00:00Z",
    "status": "ACTIVE",
    "entrySource": "KIOSK"
  }
}
```
- **Auth Required**: Yes (requireAuth)
- **Permission Required**: `timetracking.clockin`
- **Validation**: Zod schema validates input structure

**POST /api/v1/time-tracking/clock-out/:timeEntryId**
```json
Request:
{
  "clockOutTime": "2024-01-15T08:30:00Z"  // optional, defaults to now()
}

Response:
{
  "success": true,
  "data": {
    "id": "entry-123",
    "clockInTime": "2024-01-15T08:00:00Z",
    "clockOutTime": "2024-01-15T08:30:00Z",
    "duration": 0.5,  // hours
    "laborCost": 12.50,
    "status": "COMPLETED|PENDING_APPROVAL"  // depends on config
  }
}
```
- **Auth Required**: Yes
- **Permission Required**: `timetracking.clockout`
- **Status Update**: Transitions to COMPLETED or PENDING_APPROVAL

**GET /api/v1/time-tracking/entries**
```
Query Parameters:
- userId
- workOrderId
- operationId
- status: ACTIVE|COMPLETED|PENDING_APPROVAL|APPROVED|REJECTED|EXPORTED
- timeType: DIRECT_LABOR|INDIRECT|MACHINE
- startDate, endDate (ISO format)
- limit (1-100, default 50)
- offset (default 0)
```
- **Auth Required**: Yes
- **Permission Required**: `timetracking.read`

**PUT /api/v1/time-tracking/entries/:id/edit**
```json
Request:
{
  "clockInTime": "2024-01-15T08:05:00Z",
  "clockOutTime": "2024-01-15T08:35:00Z",
  "editReason": "Corrected start time - operator arrived early"
}
```
- **Auth Required**: Yes
- **Permission Required**: `timetracking.edit`
- **Behavior**:
  - Preserves original times in originalClockInTime/originalClockOutTime
  - Recalculates duration and cost
  - Records editedBy user and editedAt timestamp
  - Updates editReason
  - **GAP**: No transition to approval workflow after edit

### 3.2 Configuration Endpoints

**GET /api/v1/sites/:siteId/time-tracking-configuration**
- **Permission Required**: `timetracking.config.read`

**PUT /api/v1/sites/:siteId/time-tracking-configuration**
- **Permission Required**: `timetracking.config.write`
- **Allows updating**: trackingGranularity, costingModel, allowMultiTasking, requireTimeApproval, approvalFrequency, etc.

### 3.3 Indirect Cost Code Endpoints

**GET /api/v1/time-tracking/indirect-cost-codes**
- Filter by siteId, category, isActive

**POST /api/v1/time-tracking/indirect-cost-codes**
- **Permission Required**: `timetracking.admin`

**PUT /api/v1/time-tracking/indirect-cost-codes/:id**
- **Permission Required**: `timetracking.admin`

**DELETE /api/v1/time-tracking/indirect-cost-codes/:id**
- Soft-deletes by setting isActive=false

---

## 4. AUTHENTICATION & AUTHORIZATION

### 4.1 Permission System
**Location**: `/home/tony/GitHub/MachShop/src/middleware/auth.ts`

**Permission-Based Access Control**:
```typescript
export const requirePermission = (permission: string) => {
  // Checks req.user.permissions array
  // Supports wildcard permissions (e.g., 'timetracking.*', '*')
}
```

**Time Tracking Permissions**:
- `timetracking.clockin` - Clock in operations
- `timetracking.clockout` - Clock out operations
- `timetracking.read` - View time entries
- `timetracking.edit` - Edit existing entries
- `timetracking.admin` - Administrative operations
- `timetracking.machine` - Machine time operations
- `timetracking.config.read` - Read configuration
- `timetracking.config.write` - Update configuration

### 4.2 User Context
The `req.user` object contains:
- `id` - User ID
- `username` - Username
- `permissions` - Array of permission strings
- `roles` - Array of role names (from RBAC system)

### 4.3 Role-Based Access
The system supports role checks via `requireRole()` middleware:
- Common roles: 'operator', 'supervisor', 'manager', 'administrator'

---

## 5. UNIFIED APPROVAL ENGINE INTEGRATION

### 5.1 UnifiedApprovalIntegration Service
**Location**: `/home/tony/GitHub/MachShop/src/services/UnifiedApprovalIntegration.ts`

**Purpose**: Consolidates approval workflows across all entity types (Issue #147)

**Key Interfaces**:
```typescript
interface ApprovalEntityMapping {
  entityType: string;  // 'WORK_INSTRUCTION', 'FAI_REPORT', 'QUALITY_PROCESS', 'DOCUMENT'
  entityId: string;    // Reference to entity
  currentStatus: string; // Entity's current status
  requiredApproverRoles: string[]; // Who must approve
  priority: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
  metadata?: Record<string, any>; // Custom data
}

interface UnifiedApprovalResult {
  success: boolean;
  workflowInstanceId: string;
  currentStage: string;
  nextApprovers: string[];
  estimatedCompletionTime?: Date;
  requiresSignature: boolean;
}
```

**Core Method**:
```typescript
async initiateApproval(
  entityMapping: ApprovalEntityMapping,
  createdById: string,
  config?: Partial<UnifiedApprovalConfig>
): Promise<UnifiedApprovalResult>
```

**Workflow Enums** (Prisma):
- `ApprovalAction`: APPROVED, REJECTED, CHANGES_REQUESTED, DELEGATED, SKIPPED
- `WorkflowStatus`: IN_PROGRESS, COMPLETED, REJECTED, CANCELLED, ON_HOLD
- `StageStatus`: PENDING, IN_PROGRESS, COMPLETED, SKIPPED, ESCALATED
- `StageOutcome`: APPROVED, REJECTED, CHANGES_REQUESTED, DELEGATED, SKIPPED

### 5.2 Workflow Engine
**Location**: `/home/tony/GitHub/MachShop/src/services/WorkflowEngineService.ts`

The system has a sophisticated workflow engine that:
- Manages workflow instances and stages
- Tracks approval actions (approve, reject, request changes, delegate)
- Records audit trails
- Handles escalations and timeouts
- Supports conditional routing

---

## 6. CONFIGURATION SYSTEM

### 6.1 TimeTrackingConfiguration Fields

**Approval-Related**:
```typescript
interface TimeTrackingConfiguration {
  requireTimeApproval: boolean = true;
  approvalFrequency: 'DAILY'|'WEEKLY'|'BIWEEKLY'|'NONE' = 'DAILY';
  // ... other fields
}
```

**Current State**:
- Configuration exists and can be read/updated
- `requireTimeApproval` determines if entries need approval
- `approvalFrequency` is stored but **NOT CURRENTLY USED**
  - This suggests batch approval workflows haven't been implemented
  - OPPORTUNITY: Daily/weekly time sheet review concept

---

## 7. VALIDATION FRAMEWORK

### 7.1 Existing Validation

**In TimeTrackingService.validateTimeEntry()**:
```
✓ Duration <= 24 hours (error)
✓ Duration >= 0 (error)
✓ Active entries > 16 hours (warning)
✓ Overlapping entries (error)
```

### 7.2 TimeEntryValidationRule Model (Not Yet Used)
The database model exists but validation rules aren't enforced at API layer.

**Opportunity**: Implement dynamic rule engine that:
- Retrieves rules from database
- Evaluates conditions against time entry data
- Returns structured validation results
- Allows site-specific customization

---

## 8. TESTING

### 8.1 Unit Tests
**Location**: `/home/tony/GitHub/MachShop/src/tests/services/TimeTrackingService.test.ts`

**Test Coverage**:
- Clock in scenarios (work order, operation, indirect)
- Multi-tasking prevention
- Active entry retrieval
- Stop all entries
- Machine time operations
- Configuration retrieval
- Time entry validation

### 8.2 Integration Tests
**Location**: `/home/tony/GitHub/MachShop/src/tests/integration/timeTracking.test.ts`

Tests API endpoints with mock database.

---

## 9. APPROVAL WORKFLOW DATA STRUCTURES

### 9.1 Approval-Related Models in Database

The system likely has (from UnifiedApprovalIntegration):
- `WorkflowDefinition` - Defines approval process shape
- `WorkflowInstance` - Active approval for specific entity
- `WorkflowStage` - Steps in approval process
- `ApprovalAssignment` - Who must approve
- `WorkflowEvent` - Audit trail of actions
- `WorkflowAuditLog` - Detailed history

### 9.2 Approval State Transitions

For time entries:
```
ACTIVE
    ↓ (clockOut)
COMPLETED (if config.requireTimeApproval = false)
    ↓ (initiate approval if true)
PENDING_APPROVAL
    ├─ (supervisor approves)
    └─→ APPROVED
    ├─ (supervisor rejects)
    └─→ REJECTED
    ├─ (supervisor requests changes)
    └─→ (edit and resubmit)
```

---

## 10. KEY EXTENSION POINTS FOR ISSUE #51

### 10.1 **Approval Initiation**
**Location to modify**: `TimeTrackingService.clockOut()`

**Current behavior**: Sets status to PENDING_APPROVAL if config.requireTimeApproval

**Needed enhancement**:
- Call `UnifiedApprovalIntegration.initiateApproval()` instead of direct status update
- Pass:
  - entityType: 'TIME_ENTRY'
  - entityId: entry.id
  - requiredApproverRoles: ['supervisor', 'manager']  // site-specific
  - priority: derived from overtime/special flags
  - metadata: { workOrderId, operationId, duration, laborCost }

### 10.2 **Approval Decision Endpoints**
**New endpoints needed**:

**POST /api/v1/time-tracking/entries/:id/approve**
- Supervisor approves entry
- Transitions status to APPROVED
- Records approvedBy, approvedAt
- May trigger downstream processes (export, costing, etc.)

**POST /api/v1/time-tracking/entries/:id/reject**
- Supervisor rejects entry
- Records rejectionReason
- Sets status to REJECTED
- May notify operator for correction

**POST /api/v1/time-tracking/entries/:id/request-changes**
- Supervisor requests changes
- Entry awaits operator re-edit
- Integrates with workflow system

### 10.3 **Batch Approval (Timesheet Review)**
**Leverage approvalFrequency field**:

**New endpoints needed**:

**GET /api/v1/time-tracking/timesheets**
- List pending timesheets by user, week, or date range
- Groups entries for approval batch
- Respects approvalFrequency configuration

**POST /api/v1/time-tracking/timesheets/:id/approve**
- Bulk approve all entries in timesheet
- Single action vs. per-entry approach

### 10.4 **Edit Workflow Integration**
**Enhancement to**: `TimeTrackingService.clockOut()` and edit endpoint

**Current state**: Edit creates new entry without re-approval

**Needed enhancement**:
- If entry was APPROVED, and edited, transition back to PENDING_APPROVAL
- Trigger new approval workflow
- Mark in workflow that this is re-approval (edited)
- Notify previous approver of edit

### 10.5 **Validation Integration**
**Enhancement to**: Implement TimeEntryValidationRule execution

**Needed**:
- Load rules from database based on site
- Evaluate rules during clock-in/clock-out
- Return validation errors/warnings
- Block problematic entries or require supervisor review

### 10.6 **Notification System**
**New integration needed**:

**Trigger points**:
- Approval initiated (notify supervisor)
- Approval granted (notify operator)
- Approval rejected (notify operator with reason)
- Changes requested (notify operator)
- Edit detected on approved entry (notify previous approver)
- Overtime detected (notify supervisor)

**Channels**: Email, in-app notification, dashboard alerts

### 10.7 **Audit & Compliance**
**Leverage existing structures**:

The system tracks:
- `editedBy` / `editedAt` / `editReason`
- `approvedBy` / `approvedAt`
- `rejectionReason`
- Entry source (KIOSK, MOBILE, API, etc.)
- Device tracking

**Enhancement needed**:
- Unified approval workflow audit trail
- Signature/electronic proof for signed-off entries
- Export with approval evidence

---

## 11. TECHNICAL DEBT & GAPS

| Gap | Impact | Recommendation |
|-----|--------|-----------------|
| No approval workflow initiated in clockOut() | Entries stuck in PENDING_APPROVAL status | Integrate UnifiedApprovalIntegration |
| TimeEntryValidationRule model exists but unused | No dynamic validation | Implement rule engine |
| approvalFrequency stored but not used | Weekly/monthly timesheet not possible | Implement batch approval endpoints |
| No "request changes" workflow for edits | Limited feedback loop | Add change request status and flow |
| Edit doesn't trigger re-approval | Approved entries can be changed | Add status reset on edit |
| No notifications on approval status | Stakeholders uninformed | Integrate notification service |
| No signature/authentication for approvals | Compliance risk | Add electronic signature tracking |
| No escalation workflow | Stuck approvals not handled | Integrate workflow escalation |
| Limited approval role configuration | Hard-coded supervisor/manager | Make roles configurable per site |

---

## 12. INTERFACE REQUIREMENTS

### 12.1 Frontend Components Needed

For Issue #51, these new components will be required:

```
frontend/src/components/TimeTracking/
├── TimeEntryDetails.tsx              # View single entry
├── TimeEntryEditor.tsx               # Edit clock times
├── TimeEntryApprovalCard.tsx         # Approval UI
├── TimesheetView.tsx                 # Weekly timesheet
├── ApprovalQueue.tsx                 # Pending approvals dashboard
├── TimeEntryStatusBadge.tsx           # Status visual
└── ApprovalHistory.tsx               # Audit trail display

frontend/src/pages/
├── TimeEntries.tsx                   # Operator view of their entries
├── SupervisorApprovals.tsx           # Supervisor approval queue
└── TimesheetReview.tsx               # Timesheet review interface
```

### 12.2 API Routes Needed

```typescript
// Time entry management
GET    /api/v1/time-tracking/entries/:id
GET    /api/v1/time-tracking/entries?userId=...&status=PENDING_APPROVAL
PUT    /api/v1/time-tracking/entries/:id/edit

// Approval workflow
POST   /api/v1/time-tracking/entries/:id/approve
POST   /api/v1/time-tracking/entries/:id/reject
POST   /api/v1/time-tracking/entries/:id/request-changes
GET    /api/v1/time-tracking/entries/:id/approval-status
GET    /api/v1/time-tracking/approvals/pending         # Supervisor dashboard

// Timesheet batch
GET    /api/v1/time-tracking/timesheets?week=...&userId=...
POST   /api/v1/time-tracking/timesheets/:id/approve    # Bulk approve
GET    /api/v1/time-tracking/timesheets/:id/summary    # Stats

// Validation rules
GET    /api/v1/time-tracking/validation-rules?siteId=...
POST   /api/v1/time-tracking/validation-rules
PUT    /api/v1/time-tracking/validation-rules/:id

// Approval history
GET    /api/v1/time-tracking/entries/:id/approval-history
```

---

## 13. PERMISSIONS MATRIX

**Recommended permissions for Issue #51**:

```
timetracking.entries.view         # View own or team entries
timetracking.entries.edit         # Edit own entries
timetracking.entries.edit.admin   # Edit any entries (supervisor)
timetracking.entries.approve      # Approve submitted entries (supervisor)
timetracking.entries.reject       # Reject entries (supervisor)
timetracking.entries.export       # Export entries (manager)
timetracking.rules.view           # View validation rules
timetracking.rules.manage         # Manage validation rules (admin)
```

---

## 14. RELATED SYSTEMS

### 14.1 Unified Approval Engine (Issue #147)
- Already provides core workflow infrastructure
- Can be extended for time entry approvals
- Provides audit trail and escalation

### 14.2 Notification System
- B2MMessageBuilder available
- Can send approval notifications
- Email/in-app channels needed

### 14.3 Multi-Interface Time Clock (Issue #47)
- UI components for time entry
- Kiosk, Mobile, Widget interfaces
- Feeds into approval system

### 14.4 Performance Reporting (Issue #53)
- Depends on approved time entries
- Needs complete time entry data
- Validation rules affect reporting accuracy

---

## 15. IMPLEMENTATION ROADMAP FOR ISSUE #51

### Phase 1: Core Approval Integration (Foundation)
1. Extend TimeTrackingService to use UnifiedApprovalIntegration
2. Implement approval initiation on clock-out
3. Add approval decision endpoints (/approve, /reject)
4. Record approver information and timestamps

### Phase 2: Editing & Workflow
1. Enhance edit functionality to handle approved entries
2. Implement "request changes" workflow
3. Add change request notification
4. Track edit history with approval context

### Phase 3: Batch Approval (Timesheet)
1. Implement timesheet grouping endpoints
2. Add batch approval functionality
3. Leverage approvalFrequency configuration
4. Build supervisor dashboard

### Phase 4: Validation & Rules
1. Implement TimeEntryValidationRule engine
2. Dynamic rule evaluation during clock operations
3. Site-specific rule configuration UI
4. Validation error/warning feedback

### Phase 5: Notifications & Integration
1. Email/in-app approval notifications
2. Approval status alerts
3. Escalation notifications
4. Audit trail visualization

### Phase 6: Compliance & Export
1. Electronic signature support
2. Signed approval export
3. Compliance reporting
4. Integration with external T&A systems

---

## Conclusion

The MachShop codebase provides a **solid foundation** for implementing Issue #51. The database schema is complete with approval fields, the API structure is in place, and the UnifiedApprovalIntegration provides the workflow engine. The main work involves:

1. **Connecting** the TimeTrackingService to the approval workflow
2. **Creating** new API endpoints for approval decisions
3. **Building** the supervisor approval dashboard UI
4. **Implementing** batch/timesheet approval workflows
5. **Adding** dynamic validation rules
6. **Integrating** notifications

The existing permission system and multi-interface time clock provide the scaffolding. The approval workflow enums and models are defined. The path forward is clear.

