# Issue #51 - Architecture & Flow Diagrams

## Current Data Flow (Issue #46 - Core Time Tracking)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND INTERFACES                          │
│  (Kiosk, Mobile, Widget - Issue #47)                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ POST /clock-in
                       │ POST /clock-out/:id
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              TIME TRACKING API ROUTES                           │
│  (/src/routes/timeTracking.ts)                                 │
│                                                                 │
│  • POST   /clock-in                                            │
│  • POST   /clock-out/:id          ← Sets status              │
│  • GET    /entries (+ filters)                                │
│  • PUT    /entries/:id/edit        ← Recalculates cost      │
│  • GET/PUT /configuration          ← requireTimeApproval     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│          TIME TRACKING SERVICE                                  │
│  (/src/services/TimeTrackingService.ts)                        │
│                                                                 │
│  • clockIn()        - Create entry (ACTIVE)                   │
│  • clockOut()       - Complete entry (COMPLETED or            │
│                      PENDING_APPROVAL)                         │
│  • validateTimeEntry() - Basic validation                      │
│  • calculateLaborCost() - Cost calculation                    │
│  • getTimeEntries() - Retrieve with filters                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│            PRISMA DATABASE LAYER                                │
│                                                                 │
│  LaborTimeEntry                                                │
│  ├─ id                          MachineTimeEntry              │
│  ├─ userId                      ├─ id                         │
│  ├─ workOrderId                 ├─ equipmentId               │
│  ├─ operationId                 ├─ status (same enum)        │
│  ├─ status: TimeEntryStatus     └─ ...                       │
│  │  └─ ACTIVE                                                 │
│  │  └─ COMPLETED                                              │
│  │  └─ PENDING_APPROVAL (set but unused!)                    │
│  │  └─ APPROVED                                               │
│  │  └─ REJECTED                                               │
│  │  └─ EXPORTED                                               │
│  ├─ approvedBy (null)                                          │
│  ├─ approvedAt (null)                                          │
│  ├─ rejectionReason (null)                                     │
│  ├─ clockInTime                                                │
│  ├─ clockOutTime                                               │
│  ├─ duration                                                    │
│  ├─ laborCost                                                   │
│  ├─ editedBy, editedAt, editReason                           │
│  └─ originalClockInTime, originalClockOutTime               │
│                                                                 │
│  TimeTrackingConfiguration (per-site)                         │
│  ├─ requireTimeApproval: true ← KEY FIELD                    │
│  ├─ approvalFrequency: DAILY   ← NOT USED YET               │
│  └─ ...other config...                                        │
│                                                                 │
│  TimeEntryValidationRule (unused)                             │
│  ├─ ruleName                                                   │
│  ├─ ruleType (MAX_DURATION, etc.)                            │
│  ├─ condition                                                  │
│  └─ severity (ERROR|WARNING)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Proposed Enhanced Flow (Issue #51 - Time Entry Management & Approvals)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND INTERFACES                                 │
│  (Kiosk, Mobile, Widget - Issue #47)                                     │
│  + Supervisor Dashboard (NEW for Issue #51)                              │
└──────────────────────┬───────────────────────────────────────────────────┘
                       │
       ┌───────────────┼────────────────────────────────────────┐
       │               │                                        │
       ▼ /clock-out    ▼ /entries/:id/approve    ▼ /entries/:id/reject
       │               │                         │
       ├─> Operator    ├─> Supervisor            ├─> Supervisor
       │               │                         │
┌──────▼───────────────┴─────────────────────────────────────────┐
│              EXTENDED TIME TRACKING API ROUTES                 │
│  (/src/routes/timeTracking.ts)                                │
│                                                                │
│  EXISTING:                                                     │
│  • POST   /clock-in                                           │
│  • POST   /clock-out/:id          ← NOW calls approval!     │
│  • GET    /entries (+ filters)                               │
│  • PUT    /entries/:id/edit        ← NOW re-triggers appr. │
│  • GET/PUT /configuration                                     │
│                                                                │
│  NEW FOR ISSUE #51:                                           │
│  • POST   /entries/:id/approve                               │
│  • POST   /entries/:id/reject                                │
│  • POST   /entries/:id/request-changes                       │
│  • GET    /approvals/pending       ← Supervisor dashboard    │
│  • GET    /timesheets              ← Batch groups            │
│  • POST   /timesheets/:id/approve  ← Bulk approval           │
│  • GET    /validation-rules                                   │
│  • POST   /validation-rules                                   │
└──────┬────────────────────────────────────────────────────────┘
       │
       ├─────────────────────────────────────────────────┐
       │                                                 │
       ▼                                                 ▼
   ┌────────────────────────┐        ┌──────────────────────────┐
   │ TIME TRACKING SERVICE  │        │ VALIDATION RULE ENGINE   │
   │ (Enhanced)             │        │ (NEW)                    │
   │                        │        │                          │
   │ • clockIn()            │        │ • validateEntry()        │
   │ • clockOut()           │        │ • evaluateRule()         │
   │ • validateTimeEntry()  ├──────>│ • getRulesForSite()      │
   │ • ...                  │        │                          │
   │                        │        │ (Loads TimeEntryValidation│
   │ [ENHANCED:]            │        │  Rule records from DB)   │
   │ • Calls UnifiedAppr.   │        │                          │
   │   initiateApproval()   │        └──────────────────────────┘
   │   when status→PENDING  │
   │                        │
   └────────────┬───────────┘
                │
                ▼
   ┌────────────────────────────────────┐
   │ UNIFIED APPROVAL INTEGRATION       │
   │ (Issue #147 - Extended)            │
   │                                    │
   │ • initiateApproval()               │
   │   └─> NEW entityType: 'TIME_ENTRY' │
   │   └─> metadata: { workOrderId,     │
   │        operationId, duration,      │
   │        laborCost, userId }         │
   │                                    │
   │ • processApprovalAction()          │
   │   ├─> APPROVED                     │
   │   ├─> REJECTED                     │
   │   ├─> CHANGES_REQUESTED            │
   │   └─> DELEGATED                    │
   │                                    │
   │ • getApprovalStatus()              │
   │ • getWorkflowHistory()             │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌──────────────────────────────────────────┐
   │ WORKFLOW ENGINE SERVICE                  │
   │ (Issue #147)                             │
   │                                          │
   │ Creates WorkflowInstance for each entry  │
   │ Manages approval stages and assignments  │
   │ Records WorkflowEvents for audit trail   │
   │ Handles escalations and timeouts         │
   │                                          │
   │ Database Tables:                         │
   │ • WorkflowDefinition                     │
   │ • WorkflowInstance                       │
   │ • WorkflowStage                          │
   │ • ApprovalAssignment                     │
   │ • WorkflowEvent                          │
   │ • WorkflowAuditLog                       │
   └────────────┬──────────────────────────────┘
                │
                ▼
   ┌──────────────────────────────────────────┐
   │ NOTIFICATION SERVICE (NEW)               │
   │                                          │
   │ Triggers on approval status changes:     │
   │ • Initiated     → notify supervisor      │
   │ • Approved      → notify operator        │
   │ • Rejected      → notify operator        │
   │ • ReApproval    → notify prev approver   │
   │                                          │
   │ Channels:                                │
   │ • Email (future)                         │
   │ • In-app notification                    │
   │ • Dashboard alert                        │
   └──────────────────────────────────────────┘
```

---

## Time Entry Lifecycle (Issue #51)

```
┌────────────────────────────────────────────────────────────────────────┐
│  SCENARIO 1: APPROVAL REQUIRED (requireTimeApproval = true)            │
└────────────────────────────────────────────────────────────────────────┘

  OPERATOR                                   SUPERVISOR
  ─────────────────────────────────────────────────────────────────────

  POST /clock-in
  └─> Entry created: ACTIVE
      └─> Display running timer

  [Work for 2 hours]

  POST /clock-out
  └─> Calculate duration + cost
      └─> Run validation rules
          └─> If OK: Status → PENDING_APPROVAL
              └─> Call UnifiedApprovalIntegration.initiateApproval()
                  └─> WorkflowInstance created
                      └─> ApprovalAssignment to 'supervisor' role
                          └─> Notify supervisor: NEW

                                                          ↓ Sees pending approval
                                                          ↓ GET /approvals/pending
                                                          ↓
                                                          Reviews entry details
                                                          ├─ Time duration
                                                          ├─ Work order/operation
                                                          ├─ Edit history (if any)
                                                          └─ Original vs. edited times

                                                          ↓ If valid:
                                                          POST /entries/:id/approve
                                                          └─> Status → APPROVED
                                                              approvedBy: supervisor_id
                                                              approvedAt: now()
                                                              └─> Update WorkflowInstance
                                                                  └─> WorkflowEvent: APPROVED
                                                                      └─> Notify operator

  GET /entries (status=APPROVED)
  └─> See approved time entry
      └─> Ready for export/reporting (Issue #53)

                                                          ↓ OR If problems:
                                                          POST /entries/:id/reject
                                                          └─> Status → REJECTED
                                                              rejectionReason: "..."
                                                              └─> Update WorkflowInstance
                                                                  └─> Notify operator

  See rejection reason
  ↓
  PUT /entries/:id/edit
  ├─> Adjust clock times
  ├─> Calculate new duration + cost
  ├─> Reset: status → PENDING_APPROVAL
  │             approvedBy → null
  │             approvedAt → null
  └─> Initiate new approval workflow
      └─> Back to PENDING_APPROVAL (supervisor re-reviews)


┌────────────────────────────────────────────────────────────────────────┐
│  SCENARIO 2: TIMESHEET BATCH APPROVAL (approvalFrequency = WEEKLY)     │
└────────────────────────────────────────────────────────────────────────┘

  OPERATOR                                   SUPERVISOR
  ─────────────────────────────────────────────────────────────────────

  Multiple days of:
  POST /clock-in / /clock-out
  └─> All entries: PENDING_APPROVAL
      └─> Grouped by (userId, week)

                                                          ↓ At week end:
                                                          GET /timesheets
                                                          ?week=2024-W45
                                                          &userId=user-123
                                                          └─> Lists all pending entries
                                                              for the week
                                                              with summary:
                                                              • Total hours: 40.5
                                                              • Total cost: $1,012.50
                                                              • By work order breakdown

                                                          ↓ Review entire timesheet
                                                          POST /timesheets/:id/approve
                                                          └─> Bulk update all entries
                                                              to APPROVED
                                                              └─> Single approval action
                                                                  covers whole week

  GET /timesheets (status=APPROVED)
  └─> See approved timesheet
      └─> All entries now reportable


┌────────────────────────────────────────────────────────────────────────┐
│  SCENARIO 3: VALIDATION RULE BLOCKS ENTRY                              │
└────────────────────────────────────────────────────────────────────────┘

  OPERATOR                                   SYSTEM
  ─────────────────────────────────────────────────────────────────────

  POST /clock-out
  ├─> Validation Rule loaded:
  │   "MAX_DURATION: 10 hours per day"
  │
  └─> Duration calculated: 11.5 hours
      └─> Rule evaluates: 11.5 > 10 → VIOLATION
          └─> Severity: ERROR
              └─> Return error: "Cannot exceed 10 hours per day"
                  └─> Entry NOT created
                      Operator must correct and resubmit

                                                          [Admin can adjust rule]
                                                          PUT /validation-rules/:id
                                                          └─> Update condition


┌────────────────────────────────────────────────────────────────────────┐
│  SCENARIO 4: ESCALATION (FUTURE ENHANCEMENT)                          │
└────────────────────────────────────────────────────────────────────────┘

  Supervisor                                 System
  ─────────────────────────────────────────────────────────────────────

  Entry pending > 2 business days
  └─> Escalation rule triggers
      └─> Notify manager (next approval level)
          └─> Workflow auto-transitions
              Entry visible in manager queue
              Escalation flag set
```

---

## Database Schema Changes (If Any)

### Optional Enhancement: Add Workflow Reference

```prisma
model LaborTimeEntry {
  // ... existing fields ...
  
  // NEW OPTIONAL: Track workflow for audit
  workflowInstanceId    String?           // Reference to WorkflowInstance
  workflowInstance      WorkflowInstance? @relation(fields: [workflowInstanceId], references: [id])
  
  // ... rest of fields ...
}
```

**No migration required** - approval fields already exist:
- ✓ status (TimeEntryStatus enum)
- ✓ approvedBy
- ✓ approvedAt
- ✓ rejectionReason
- ✓ editedBy, editedAt, editReason

---

## Permission & Role Mapping

```
┌─────────────────────────────────────────────────────────────┐
│              ROLE → PERMISSION MAPPING                      │
├─────────────────────────────────────────────────────────────┤
│ OPERATOR                                                    │
│ ├─ timetracking.clockin                                   │
│ ├─ timetracking.clockout                                  │
│ ├─ timetracking.read (own entries only)                   │
│ ├─ timetracking.edit (own entries only)                   │
│ └─ [Dashboard: See own time entries + status]             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ SUPERVISOR                                                  │
│ ├─ timetracking.read (team entries)                       │
│ ├─ timetracking.entries.approve  [NEW]                    │
│ ├─ timetracking.entries.reject   [NEW]                    │
│ ├─ timetracking.edit (team entries - admin)               │
│ ├─ timetracking.rules.view       [NEW]                    │
│ └─ [Dashboard: Approval queue + team timesheet]           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ MANAGER                                                     │
│ ├─ timetracking.read (all entries)                        │
│ ├─ timetracking.entries.approve (escalated)               │
│ ├─ timetracking.entries.export   [NEW]                    │
│ ├─ timetracking.config.write                              │
│ └─ [Dashboard: All entries + reporting + config]          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ SYSTEM ADMINISTRATOR                                        │
│ ├─ timetracking.* (all operations)                        │
│ ├─ timetracking.rules.manage     [NEW]                    │
│ └─ [Dashboard: Full control + audit logs]                 │
└─────────────────────────────────────────────────────────────┘
```

---

## API Request/Response Flow Examples

### Example 1: Clock Out → Approval Workflow

```
REQUEST:
POST /api/v1/time-tracking/clock-out/entry-123
Content-Type: application/json
Authorization: Bearer <operator_token>

{
  "clockOutTime": "2024-01-15T17:30:00Z"
}

═══════════════════════════════════════════════════════════════

BACKEND FLOW:
1. TimeTrackingService.clockOut()
   ├─ Validate entry exists & is ACTIVE
   ├─ Calculate duration = 8.5 hours
   ├─ Apply break rules if configured
   ├─ Calculate laborCost = 8.5 * $25 = $212.50
   ├─ Check config.requireTimeApproval = true
   └─ Set status = PENDING_APPROVAL

2. UnifiedApprovalIntegration.initiateApproval()
   ├─ Create WorkflowInstance
   ├─ Create WorkflowStage (Supervisor Review)
   ├─ Create ApprovalAssignment (supervisor role)
   └─ Send notification to supervisors

═══════════════════════════════════════════════════════════════

RESPONSE:
HTTP 200 OK
{
  "success": true,
  "data": {
    "id": "entry-123",
    "userId": "user-456",
    "clockInTime": "2024-01-15T09:00:00Z",
    "clockOutTime": "2024-01-15T17:30:00Z",
    "duration": 8.5,
    "laborCost": 212.50,
    "status": "PENDING_APPROVAL",
    "approvedBy": null,
    "approvedAt": null,
    "workOrderId": "wo-789"
  },
  "message": "Successfully clocked out. Entry pending supervisor approval."
}
```

---

### Example 2: Supervisor Approves Entry

```
REQUEST:
POST /api/v1/time-tracking/entries/entry-123/approve
Content-Type: application/json
Authorization: Bearer <supervisor_token>

{}

═══════════════════════════════════════════════════════════════

BACKEND FLOW:
1. Validate entry exists & status = PENDING_APPROVAL
2. Update LaborTimeEntry
   ├─ status → APPROVED
   ├─ approvedBy = supervisor_id
   └─ approvedAt = now()
3. Update WorkflowInstance
   └─ status = COMPLETED
4. Send notification to operator
5. Log audit trail

═══════════════════════════════════════════════════════════════

RESPONSE:
HTTP 200 OK
{
  "success": true,
  "data": {
    "id": "entry-123",
    "status": "APPROVED",
    "approvedBy": "supervisor-999",
    "approvedAt": "2024-01-15T18:00:00Z"
  },
  "message": "Time entry approved"
}
```

---

### Example 3: Supervisor Rejects Entry

```
REQUEST:
POST /api/v1/time-tracking/entries/entry-123/reject
Content-Type: application/json
Authorization: Bearer <supervisor_token>

{
  "rejectionReason": "Clock out time appears incorrect. Shift ended at 5:00 PM not 5:30 PM."
}

═══════════════════════════════════════════════════════════════

BACKEND FLOW:
1. Validate entry exists & status = PENDING_APPROVAL
2. Update LaborTimeEntry
   ├─ status → REJECTED
   ├─ approvedBy = supervisor_id  (who rejected)
   ├─ approvedAt = now()
   └─ rejectionReason = "..."
3. Update WorkflowInstance
   └─ status = REJECTED
4. Send notification to operator with reason
5. Log audit trail

═══════════════════════════════════════════════════════════════

RESPONSE:
HTTP 200 OK
{
  "success": true,
  "data": {
    "id": "entry-123",
    "status": "REJECTED",
    "rejectionReason": "Clock out time appears incorrect. Shift ended at 5:00 PM not 5:30 PM.",
    "approvedBy": "supervisor-999",
    "approvedAt": "2024-01-15T18:00:00Z"
  },
  "message": "Time entry rejected"
}
```

---

### Example 4: Operator Edits Rejected Entry

```
REQUEST:
PUT /api/v1/time-tracking/entries/entry-123/edit
Content-Type: application/json
Authorization: Bearer <operator_token>

{
  "clockOutTime": "2024-01-15T17:00:00Z",
  "editReason": "Corrected clock out time per supervisor feedback"
}

═══════════════════════════════════════════════════════════════

BACKEND FLOW:
1. Get current entry (status = REJECTED)
2. Update LaborTimeEntry
   ├─ clockOutTime → "2024-01-15T17:00:00Z"
   ├─ duration → 8.0 (recalculated)
   ├─ laborCost → 200.00 (recalculated)
   ├─ originalClockOutTime → "2024-01-15T17:30:00Z" (preserved)
   ├─ editedBy = operator_id
   ├─ editedAt = now()
   ├─ editReason = "..."
   └─ status → PENDING_APPROVAL (RESET for re-review!)
3. Create new WorkflowInstance for re-approval
4. Notify supervisors: "Entry edited and re-submitted"

═══════════════════════════════════════════════════════════════

RESPONSE:
HTTP 200 OK
{
  "success": true,
  "data": {
    "id": "entry-123",
    "clockOutTime": "2024-01-15T17:00:00Z",
    "duration": 8.0,
    "laborCost": 200.00,
    "status": "PENDING_APPROVAL",
    "originalClockOutTime": "2024-01-15T17:30:00Z",
    "editedBy": "operator-456",
    "editedAt": "2024-01-15T18:15:00Z",
    "editReason": "Corrected clock out time per supervisor feedback"
  },
  "message": "Time entry updated and resubmitted for approval"
}
```

---

## UI Component Hierarchy (Frontend)

```
App
├── Pages
│   ├── TimeEntries (Operator)
│   │   └── TimeEntryList
│   │       ├── TimeEntryCard
│   │       │   ├── TimeEntryDetails
│   │       │   │   └─ Show: status, duration, cost, edit button
│   │       │   └── TimeEntryStatusBadge
│   │       │       └─ ACTIVE | PENDING_APPROVAL | APPROVED | REJECTED
│   │       └── Filter/Sort controls
│   │
│   ├── SupervisorApprovals (Supervisor)
│   │   └── ApprovalQueue
│   │       ├── ApprovalCard (NEW)
│   │       │   ├─ Entry details
│   │       │   ├─ Operator info
│   │       │   ├─ Work order / operation
│   │       │   ├─ Duration + Cost
│   │       │   ├─ Edit history (if edited)
│   │       │   ├─ Approve button
│   │       │   ├─ Reject button
│   │       │   └─ Request Changes button
│   │       ├── PendingCount badge
│   │       └── Filter by: user, date, priority
│   │
│   ├── TimesheetReview (Supervisor/Manager)
│   │   └── TimesheetGrouping
│   │       ├─ By week/month (per config)
│   │       ├─ User summary
│   │       │   ├─ Total hours
│   │       │   ├─ By work order breakdown
│   │       │   └─ Total cost
│   │       ├─ Line item list (drillable)
│   │       └─ Bulk approve button
│   │
│   └── ValidationRules (Admin)
│       └── RuleEditor
│           ├─ List rules
│           ├─ Create rule
│           ├─ Edit rule
│           └─ Severity toggle
│
└── Components
    └── TimeTracking/
        ├── TimeEntryApprovalCard.tsx (NEW)
        │   └─ Show entry with approve/reject/edit buttons
        ├── TimeEntryDetails.tsx
        │   └─ Enhanced to show approval status
        ├── TimeEntryStatusBadge.tsx
        │   └─ Color-coded: ACTIVE | PENDING | APPROVED | REJECTED
        ├── ApprovalHistory.tsx (NEW)
        │   └─ Show who approved, when, and original values
        └── RejectionReasonDisplay.tsx (NEW)
            └─ Show rejection reason to operator
```

---

## Summary

The enhanced architecture for Issue #51:

1. **Existing Foundation**: Database schema complete, APIs in place
2. **Connection Point**: TimeTrackingService.clockOut() → UnifiedApprovalIntegration
3. **New Endpoints**: 3-4 approval decision endpoints
4. **Workflow Integration**: Leverage existing WorkflowEngine
5. **Validation**: Implement TimeEntryValidationRuleEngine
6. **Batch Processing**: Timesheet grouping by approvalFrequency
7. **Notifications**: Integrate notification service
8. **UI**: New supervisor dashboard + approval components

All pieces exist. Time to assemble them into the complete time entry management & approval system.

