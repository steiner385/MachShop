# NCR Workflow Configuration Guide

## Overview

The NCR (Non-Conformance Record) Workflow system provides a comprehensive, configurable state machine for managing non-conformance records in aerospace quality management. It supports complex approval workflows, state transitions, and configuration management per site and severity level.

**Related GitHub Issue**: #55 - Enhanced NCR Workflow States & Disposition (CTP, DDR, MRB)

## Architecture

### Core Components

#### 1. **NCRStateTransitionService**
Manages NCR workflow state transitions with validation and approval routing.

**Key Responsibilities**:
- Validate state transitions against configured rules
- Check required fields before transitions
- Determine approval requirements
- Create approval requests when needed
- Record state history for audit trails

**Location**: `src/services/NCRStateTransitionService.ts` (437 lines)

#### 2. **NCRApprovalService**
Manages the approval request workflow for state transitions, dispositions, and authorizations.

**Key Responsibilities**:
- Create approval requests
- Track approval lifecycle (pending, approved, rejected, delegated)
- Manage approval escalation for overdue items
- Generate approval statistics
- Support delegation to other approvers

**Location**: `src/services/NCRApprovalService.ts` (522 lines)

#### 3. **NCRWorkflowConfigService**
Manages workflow configuration per site and severity level for customizable processing rules.

**Key Responsibilities**:
- Store and retrieve workflow configurations
- Support per-site and per-severity configuration
- Validate state transitions against config
- Manage disposition rules
- Control feature enablement (CTP, DDR, MRB)

**Location**: `src/services/NCRWorkflowConfigService.ts` (658 lines)

#### 4. **EmailNotificationService**
Manages email notifications for NCR workflow events.

**Key Responsibilities**:
- Send approval request emails
- Notify on state transitions
- Escalate overdue approvals
- Handle rejection notifications
- Support email retry logic

**Location**: `src/services/EmailNotificationService.ts`

### Database Models

#### NCR (Extended)
Main non-conformance record with workflow fields:
- `status`: Current NCR state
- `disposition`: Disposition type (REWORK, REPAIR, SCRAP, USE_AS_IS, etc.)
- `ctpAuthorized`: Continue to Process authorization status
- `ddrExpectedDate`: DDR expected resolution date
- `mrbRequired`: Material Review Board required flag
- `estimatedCost`, `actualCost`: Cost tracking for dispositions

#### NCRStateHistory
Audit trail for all state transitions:
- `fromState`, `toState`: State transition details
- `changedBy`: User who made the change
- `changeReason`: Reason for state change
- `approvalRequired`: Whether approval was required
- `approvedAt`: Timestamp of state change

#### NCRApprovalRequest
Approval request tracking:
- `requestType`: Type of approval (STATE_TRANSITION, DISPOSITION, CTP_AUTHORIZATION, MRB_DECISION, CLOSURE)
- `status`: Approval status (PENDING, APPROVED, REJECTED, DELEGATED, EXPIRED)
- `approverUserId`: User responsible for approval
- `dueDate`: Approval deadline (default: 2 days)
- `escalated`: Whether approval has been escalated
- `escalatedAt`: Escalation timestamp

#### NCRWorkflowConfig
Workflow configuration per site/severity:
- `siteId`, `severityLevel`: Configuration scope
- `enabledStates`: List of states available for this configuration
- `stateTransitions`: Allowed state transition map
- `ctpEnabled`, `ddrEnabled`, `mrbEnabled`: Feature flags
- `allowedDispositions`: List of allowed disposition types
- `dispositionApprovalRules`: Approval rules by disposition

## Workflow States

### State Definitions

```
DRAFT → SUBMITTED → UNDER_INVESTIGATION ↙
                    ↓
           CONTAINMENT
                ↓
    PENDING_DISPOSITION
    ↙  ↓  ↓  ↓
  CTP DDR MRB CORRECTIVE_ACTION
    ↘  ↓  ↓  ↓
        VERIFICATION
            ↓
          CLOSED

Also: DRAFT/SUBMITTED → CANCELLED (at any point)
```

### State Descriptions

| State | Description | Approval Required | Requirements |
|-------|-------------|-------------------|--------------|
| **DRAFT** | Initial NCR creation | No | partNumber, defectType, description, severity |
| **SUBMITTED** | Submitted for review | No | NCR complete |
| **UNDER_INVESTIGATION** | Root cause analysis in progress | Yes | Quality Engineer role |
| **CONTAINMENT** | Containment actions being implemented | Yes | Quality Manager role |
| **PENDING_DISPOSITION** | Awaiting disposition decision | No | Investigation complete |
| **CTP** | Continue to Process authorized | Yes | Quality Engineer approval |
| **DDR** | Delayed Disposition Required | No | ddrExpectedDate required |
| **MRB** | Material Review Board meeting | Yes | Quality Manager role |
| **CORRECTIVE_ACTION** | CAPA in progress | Yes | Disposition approved |
| **VERIFICATION** | Effectiveness verification | Yes | CAPA complete |
| **CLOSED** | NCR closed and complete | Yes | All requirements met |
| **CANCELLED** | NCR cancelled | No | Reason required |

## Configuration Management

### Default Configuration

The system includes a comprehensive default configuration:

```typescript
{
  enabledStates: [
    'DRAFT', 'SUBMITTED', 'UNDER_INVESTIGATION', 'CONTAINMENT',
    'PENDING_DISPOSITION', 'CTP', 'DDR', 'MRB',
    'CORRECTIVE_ACTION', 'VERIFICATION', 'CLOSED', 'CANCELLED'
  ],
  initialState: 'DRAFT',
  stateTransitions: {
    'DRAFT': ['SUBMITTED', 'CANCELLED'],
    'SUBMITTED': ['UNDER_INVESTIGATION', 'CANCELLED'],
    'UNDER_INVESTIGATION': ['CONTAINMENT', 'PENDING_DISPOSITION', 'CANCELLED'],
    'CONTAINMENT': ['PENDING_DISPOSITION'],
    'PENDING_DISPOSITION': ['CTP', 'DDR', 'MRB', 'CORRECTIVE_ACTION'],
    'CTP': ['CORRECTIVE_ACTION', 'CLOSED'],
    'DDR': ['CORRECTIVE_ACTION', 'CLOSED'],
    'MRB': ['CORRECTIVE_ACTION', 'CLOSED'],
    'CORRECTIVE_ACTION': ['VERIFICATION'],
    'VERIFICATION': ['CLOSED'],
  },
  ctpEnabled: true,
  ctpPreventFinalShip: true,
  ddrEnabled: true,
  ddrEscalationThreshold: 24, // hours
  mrbEnabled: true,
  mrbVotingMethod: 'UNANIMOUS',
  allowedDispositions: [
    'REWORK', 'REPAIR', 'SCRAP', 'USE_AS_IS',
    'RETURN_TO_SUPPLIER', 'SORT_AND_SEGREGATE',
    'RETURN_TO_STOCK', 'ENGINEER_USE_ONLY'
  ],
}
```

### Site-Specific Configuration

Configure per-site workflow rules:

```javascript
POST /api/v2/ncr/config
{
  "siteId": "SITE-001",
  "severityLevel": "HIGH",  // optional
  "ctpEnabled": true,
  "ctpApprovalRole": "QUALITY_MANAGER",
  "ddrEnabled": false,  // DDR not allowed at this site
  "mrbEnabled": true,
  "mrbValueThreshold": 50000,  // MRB required if cost > $50k
  "allowedDispositions": [
    "REWORK", "REPAIR", "SCRAP"  // Subset of global dispositions
  ],
  "dispositionApprovalRules": {
    "SCRAP": { requiresEngineering": true, requiresQuality: true },
    "USE_AS_IS": { requiresEngineering: true }
  }
}
```

### Severity-Level Configuration

Different workflow rules by NCR severity:

```javascript
POST /api/v2/ncr/config
{
  "severityLevel": "CRITICAL",
  "mrbRequired": true,  // Always require MRB for critical
  "ctpEnabled": false,  // No CTP for critical
  "mrbValueThreshold": 0,  // Any cost triggers MRB
  "allowedDispositions": ["REWORK", "SCRAP"],  // Restricted options
}
```

## API Endpoints

### State Transition Endpoints

#### Get Available Transitions
```
GET /api/v2/ncr/:ncrId/available-transitions
Response:
{
  "success": true,
  "data": {
    "ncrId": "ncr-123",
    "transitions": [
      {
        "toState": "SUBMITTED",
        "description": "Submit NCR for review",
        "requiresApproval": false,
        "requiredFields": ["partNumber", "defectType"]
      }
    ]
  }
}
```

#### Execute State Transition
```
POST /api/v2/ncr/:ncrId/transition
Request:
{
  "toState": "SUBMITTED",
  "reason": "NCR review initiated"
}

Response:
{
  "success": true,
  "message": "State transition executed",
  "approvalRequired": false,
  "approvalRequestId": "approval-456"  // if approval created
}
```

### Approval Endpoints

#### Get Pending Approvals
```
GET /api/v2/ncr/approvals/pending
Response:
{
  "success": true,
  "data": [
    {
      "id": "approval-1",
      "ncrNumber": "NCR-001",
      "requestType": "STATE_TRANSITION",
      "requestedBy": "user-1",
      "requestedByName": "John Doe",
      "status": "PENDING",
      "dueDate": "2024-11-03T12:00:00Z",
      "daysOverdue": -1
    }
  ],
  "count": 5
}
```

#### Approve Request
```
POST /api/v2/ncr/approvals/:approvalRequestId/approve
Request:
{
  "approvalNotes": "Looks good, proceeding"
}

Response:
{
  "success": true,
  "message": "Approval request approved",
  "data": {
    "id": "approval-1",
    "status": "APPROVED",
    "approvedAt": "2024-11-02T12:00:00Z"
  }
}
```

#### Reject Request
```
POST /api/v2/ncr/approvals/:approvalRequestId/reject
Request:
{
  "rejectionReason": "Requires additional data on root cause"
}

Response:
{
  "success": true,
  "message": "Approval request rejected"
}
```

#### Delegate Approval
```
POST /api/v2/ncr/approvals/:approvalRequestId/delegate
Request:
{
  "delegateTo": "user-2"
}

Response:
{
  "success": true,
  "message": "Approval request delegated"
}
```

#### Get Approval History
```
GET /api/v2/ncr/:ncrId/approvals
Response:
{
  "success": true,
  "data": [
    {
      "id": "approval-1",
      "status": "APPROVED",
      "approvedAt": "2024-11-02T12:00:00Z",
      "approverName": "Jane Smith"
    }
  ],
  "count": 3
}
```

### Configuration Endpoints

#### Get Configuration
```
GET /api/v2/ncr/config/:siteId?severity=HIGH
Response:
{
  "success": true,
  "data": {
    "siteId": "SITE-001",
    "severityLevel": "HIGH",
    "ctpEnabled": true,
    "ddrEnabled": false,
    "allowedDispositions": ["REWORK", "REPAIR", "SCRAP"],
    "stateTransitions": { ... }
  }
}
```

#### Save Configuration
```
POST /api/v2/ncr/config
Request: { WorkflowConfigDTO }
Response:
{
  "success": true,
  "message": "Workflow configuration saved",
  "data": { ... }
}
```

#### Get Site Configurations
```
GET /api/v2/ncr/config/sites/:siteId
Response:
{
  "success": true,
  "data": [
    { "severityLevel": "HIGH", ... },
    { "severityLevel": "MEDIUM", ... },
    { "severityLevel": "LOW", ... }
  ],
  "count": 3
}
```

### Admin Endpoints

#### Get Approval Statistics
```
GET /api/v2/ncr/admin/approvals/stats
Response:
{
  "success": true,
  "data": {
    "totalPending": 5,
    "totalApproved": 120,
    "totalRejected": 8,
    "totalDelegated": 3,
    "averageApprovalTime": 24,  // hours
    "overduePending": 1
  }
}
```

#### Escalate Overdue Approvals
```
POST /api/v2/ncr/admin/approvals/escalate-overdue
Response:
{
  "success": true,
  "message": "3 approvals escalated",
  "data": {
    "escalatedCount": 3
  }
}
```

## Approval Workflow

### Approval Types

| Type | Purpose | Default Requirement |
|------|---------|-------------------|
| **STATE_TRANSITION** | Approval for state changes | Varies by transition |
| **DISPOSITION** | Approval for disposition selection | Often required |
| **CTP_AUTHORIZATION** | Continue to Process authorization | Quality Engineer |
| **MRB_DECISION** | Material Review Board decision | Quality Manager |
| **CLOSURE** | NCR closure approval | Quality Manager |

### Approval Timeline

```
1. Approval Request Created
   - requestedAt: NOW
   - dueDate: NOW + 2 days (configurable)
   - status: PENDING

2. Escalation Logic (24 hours overdue)
   - escalated: true
   - escalatedAt: NOW
   - Notifications sent to management

3. Resolution (Approved/Rejected/Delegated)
   - approvedAt: NOW
   - status: APPROVED | REJECTED | DELEGATED
```

## Business Rules

### Required Fields by State

| Transition | Required Fields |
|-----------|-----------------|
| DRAFT → SUBMITTED | partNumber, defectType, description, severity |
| UNDER_INVESTIGATION → PENDING_DISPOSITION | rootCauseId |
| PENDING_DISPOSITION → CTP | (none) |
| PENDING_DISPOSITION → DDR | ddrExpectedDate |
| PENDING_DISPOSITION → MRB | mrbMeetingDate |
| PENDING_DISPOSITION → CORRECTIVE_ACTION | disposition, correctiveAction |
| CTP → CORRECTIVE_ACTION | disposition |
| CTP → CLOSED | (none) |
| DDR → CORRECTIVE_ACTION | disposition, correctiveAction |
| DDR → CLOSED | disposition |
| MRB → CORRECTIVE_ACTION | mrbDecision, disposition, correctiveAction |
| MRB → CLOSED | mrbDecision, disposition |

### Approval Requirements

- **STATE_TRANSITION**: Most state transitions require approval
- **DISPOSITION**: Scrap/Use-as-is typically require approvals
- **CTP_AUTHORIZATION**: Always requires Quality Engineer approval
- **MRB_DECISION**: Always requires Quality Manager approval
- **CLOSURE**: Final approval required before closing

### Escalation Rules

1. **24-hour overdue**: Mark as escalated
2. **Notification sent**: To manager/supervisor
3. **Escalation tracking**: For SLA reporting

## Frontend Integration

### Components Available

#### NCRStateVisualizer
Displays current NCR state with available transitions:
- Current state overview
- Available transitions with requirements
- State change history timeline
- Days in current state tracking

```typescript
import { NCRStateVisualizer } from '@/components/NCRWorkflow';

<NCRStateVisualizer
  currentState="PENDING_DISPOSITION"
  ncrNumber="NCR-001"
  availableTransitions={transitions}
  stateHistory={history}
  onTransitionSelect={handleTransition}
/>
```

#### NCRApprovalDashboard
Comprehensive approval management interface:
- Pending approvals queue
- Approval statistics
- Quick action buttons
- Filtering and search

```typescript
import { NCRApprovalDashboard } from '@/components/NCRWorkflow';

<NCRApprovalDashboard
  pendingApprovals={approvals}
  statistics={stats}
  currentUserId={userId}
  onApprove={handleApprove}
  onReject={handleReject}
  onDelegate={handleDelegate}
/>
```

#### NotificationCenter
Real-time notification display:
- Approval request notifications
- State transition alerts
- Escalation warnings
- Filtering by category

## Testing

### Unit Tests
- **NCRStateTransitionService.test.ts**: 15+ test cases
  - State transition validation
  - Required field checking
  - Approval routing
  - Available transitions

- **NCRApprovalService.test.ts**: 20+ test cases
  - Approval request creation
  - Approval/rejection/delegation
  - Escalation detection
  - Statistics calculation

### Integration Tests
- **ncrWorkflow.integration.test.ts**: 25+ test cases
  - All 13 API endpoints
  - Request/response validation
  - Error handling
  - Workflow completeness

## Monitoring & Troubleshooting

### Key Metrics

- **Total Pending Approvals**: Monitor queue length
- **Average Approval Time**: Track SLA compliance
- **Overdue Approvals**: Watch escalation triggers
- **Rejection Rate**: Monitor approval quality
- **State Distribution**: Track bottlenecks

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Transitions not allowed | Missing required fields | Verify all required fields populated |
| Approval stuck | Wrong approver assigned | Use delegation to change approver |
| Configuration not applied | Incorrect site/severity | Verify site ID and severity level |
| Notifications not sent | Email service misconfigured | Check SMTP_* environment variables |

## Configuration Examples

### Example 1: Strict Quality Process
```javascript
{
  "enabledStates": ["DRAFT", "SUBMITTED", "UNDER_INVESTIGATION",
                   "PENDING_DISPOSITION", "MRB", "CORRECTIVE_ACTION",
                   "VERIFICATION", "CLOSED"],
  "ctpEnabled": false,
  "ddrEnabled": false,
  "mrbEnabled": true,
  "mrbValueThreshold": 0,  // Always require MRB
  "mrbVotingMethod": "UNANIMOUS"
}
```

### Example 2: Flexible Manufacturing
```javascript
{
  "enabledStates": ["DRAFT", "SUBMITTED", "UNDER_INVESTIGATION",
                   "PENDING_DISPOSITION", "CTP", "DDR", "CORRECTIVE_ACTION",
                   "CLOSED"],
  "ctpEnabled": true,
  "ctpPreventFinalShip": false,
  "ddrEnabled": true,
  "mrbEnabled": false,  // Skip MRB for efficiency
  "allowedDispositions": ["REWORK", "REPAIR", "USE_AS_IS"]
}
```

## References

- **GitHub Issue**: #55 - Enhanced NCR Workflow States & Disposition (CTP, DDR, MRB)
- **PR #330**: Phase 1 - Core services and API endpoints
- **Related Issues**: #56 (CAPA), #57 (8D), #58 (Analytics), #266 (Teamcenter Integration)
- **Standards**: AS9100, ISO 9001, FAA AC 43-207
