# Issue #51 - Code References & Implementation Guide

## Database Schema References

### LaborTimeEntry Model
**File**: `/home/tony/GitHub/MachShop/prisma/schema.prisma`
**Lines**: 4930-4972

**Key Approval Fields**:
```prisma
model LaborTimeEntry {
  id                   String              @id @default(cuid())
  
  // ... basic fields (userId, workOrderId, operationId, etc.) ...
  
  // APPROVAL FIELDS - for Issue #51
  status               TimeEntryStatus     @default(ACTIVE)  // ACTIVE | COMPLETED | PENDING_APPROVAL | APPROVED | REJECTED | EXPORTED
  approvedBy           String?             // User ID of approver
  approvedAt           DateTime?           // When approved
  rejectionReason      String?             // Why rejected
  
  // EDIT TRACKING - for edit re-approval
  originalClockInTime  DateTime?           // Before edit
  originalClockOutTime DateTime?           // Before edit
  editedBy             String?             // Who edited
  editedAt             DateTime?           // When edited
  editReason           String?             // Why edited
  
  // ... costing and export fields ...
}
```

### TimeTrackingConfiguration Model
**File**: `/home/tony/GitHub/MachShop/prisma/schema.prisma`
**Lines**: 4901-4926

**Key Approval Configuration**:
```prisma
model TimeTrackingConfiguration {
  id                 String                  @id @default(cuid())
  siteId             String                  @unique
  
  // ... other config ...
  
  // APPROVAL CONFIGURATION - for Issue #51
  requireTimeApproval    Boolean             @default(true)   // Master switch for approvals
  approvalFrequency      ApprovalFrequency   @default(DAILY)  // DAILY | WEEKLY | BIWEEKLY | NONE
  
  // ... rest of config ...
}
```

**Enums**:
```prisma
enum TimeEntryStatus {
  ACTIVE
  COMPLETED
  PENDING_APPROVAL    // Entry awaiting approval
  APPROVED           // Entry approved by supervisor
  REJECTED           // Entry rejected by supervisor
  EXPORTED           // Entry exported to external system
}

enum ApprovalFrequency {
  DAILY       // Approve each day's time
  WEEKLY      // Approve by week (timesheet batch)
  BIWEEKLY    // Approve by 2-week period
  NONE        // No approval required (config.requireTimeApproval = false)
}
```

### TimeEntryValidationRule Model
**File**: `/home/tony/GitHub/MachShop/prisma/schema.prisma`
**Lines**: 5035-5050

**Currently Unused - Needs Implementation for Issue #51**:
```prisma
model TimeEntryValidationRule {
  id           String                 @id @default(cuid())
  ruleName     String                 // e.g., "No more than 10 hours/day"
  ruleType     TimeValidationRuleType // Type of rule
  condition    String                 // Rule logic to evaluate
  errorMessage String                 // Message if rule violated
  severity     String                 // ERROR | WARNING
  isActive     Boolean                @default(true)
  siteId       String?                // Site-specific rule
  createdAt    DateTime               @default(now())
  updatedAt    DateTime               @updatedAt
}

enum TimeValidationRuleType {
  MAX_DURATION       // Entry cannot exceed X hours
  MIN_DURATION       // Entry must be at least X hours
  MISSING_CLOCK_OUT  // Detect unclosed entries
  CONCURRENT_ENTRIES // Prevent overlapping time
  OVERTIME_THRESHOLD // Warn/block on overtime
  INVALID_TIME_RANGE // Clock-out before clock-in
}
```

---

## Service Layer References

### TimeTrackingService Class
**File**: `/home/tony/GitHub/MachShop/src/services/TimeTrackingService.ts`

#### clockOut() Method
**Lines**: 154-224

**Current Implementation**:
```typescript
async clockOut(request: ClockOutRequest): Promise<LaborTimeEntry> {
  // 1. Get time entry and validate
  const entry = await prisma.laborTimeEntry.findUnique({...});
  if (entry.status !== TimeEntryStatus.ACTIVE) {
    throw new Error(`Time entry is not active (status: ${entry.status})`);
  }

  // 2. Calculate duration
  const clockOut = request.clockOutTime || new Date();
  const durationMs = clockOut.getTime() - entry.clockInTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  // 3. Apply break rules if configured
  let adjustedDuration = durationHours;
  if (config.autoSubtractBreaks && config.standardBreakMinutes) {
    const breakHours = config.standardBreakMinutes / 60;
    adjustedDuration = Math.max(0, durationHours - breakHours);
  }

  // 4. Calculate labor cost
  const laborCost = adjustedDuration * (entry.laborRate || 0);

  // 5. CRITICAL: Determine status after clock out
  const newStatus = config.requireTimeApproval
    ? TimeEntryStatus.PENDING_APPROVAL      // ⬅️ ISSUE #51: No workflow initiated here!
    : TimeEntryStatus.COMPLETED;

  // 6. Update entry
  const updatedEntry = await prisma.laborTimeEntry.update({
    where: { id: request.timeEntryId },
    data: {
      clockOutTime: clockOut,
      duration: adjustedDuration,
      laborCost,
      status: newStatus,
    },
    // ...
  });

  return updatedEntry;
}
```

**NEEDED ENHANCEMENT for Issue #51**:
```typescript
// After setting newStatus to PENDING_APPROVAL, call:
if (newStatus === TimeEntryStatus.PENDING_APPROVAL) {
  try {
    await unifiedApprovalService.initiateApproval(
      {
        entityType: 'TIME_ENTRY',
        entityId: updatedEntry.id,
        currentStatus: 'PENDING_APPROVAL',
        requiredApproverRoles: ['supervisor'],
        priority: adjustedDuration > config.overtimeThresholdHours ? 'HIGH' : 'NORMAL',
        metadata: {
          workOrderId: entry.workOrderId,
          operationId: entry.operationId,
          duration: adjustedDuration,
          laborCost: laborCost,
          userId: entry.userId
        }
      },
      entry.userId  // createdById
    );
  } catch (error) {
    logger.error('Failed to initiate approval workflow', error);
    // Decide: fail hard or allow with warning?
  }
}
```

#### validateTimeEntry() Method
**Lines**: 404-465

**Current Basic Validation**:
```typescript
async validateTimeEntry(timeEntry: LaborTimeEntry): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check duration constraints
  if (timeEntry.duration && timeEntry.duration > 24) {
    result.errors.push('Time entry duration cannot exceed 24 hours');
    result.isValid = false;
  }

  if (timeEntry.duration && timeEntry.duration < 0) {
    result.errors.push('Time entry duration cannot be negative');
    result.isValid = false;
  }

  // Check active entries duration warning
  if (timeEntry.status === TimeEntryStatus.ACTIVE && timeEntry.clockInTime) {
    const hoursActive = (new Date().getTime() - timeEntry.clockInTime.getTime()) / (1000 * 60 * 60);
    if (hoursActive > 16) {
      result.warnings.push('Time entry has been active for more than 16 hours');
    }
  }

  // Check for overlapping entries
  const overlapping = await prisma.laborTimeEntry.findMany({...});
  if (overlapping.length > 0) {
    result.errors.push('Time entry overlaps with existing entries');
    result.isValid = false;
  }

  return result;
}
```

**NEEDED ENHANCEMENT for Issue #51**:
```typescript
// Add after existing validation - implement dynamic rule evaluation
const rules = await prisma.timeEntryValidationRule.findMany({
  where: {
    isActive: true,
    siteId: timeEntry.user?.userSiteRoles[0]?.siteId // Get site from user
  }
});

for (const rule of rules) {
  try {
    const ruleResult = evaluateRule(rule, timeEntry);
    if (!ruleResult.isValid) {
      if (rule.severity === 'ERROR') {
        result.errors.push(rule.errorMessage);
        result.isValid = false;
      } else {
        result.warnings.push(rule.errorMessage);
      }
    }
  } catch (error) {
    logger.error(`Failed to evaluate rule ${rule.id}`, error);
  }
}
```

---

## API Route References

### Time Tracking Routes
**File**: `/home/tony/GitHub/MachShop/src/routes/timeTracking.ts`

#### Clock Out Endpoint
**Lines**: 124-148

**Current Endpoint**:
```typescript
router.post('/clock-out/:timeEntryId', requireAuth, requirePermission('timetracking.clockout'), async (req: Request, res: Response) => {
  try {
    const { timeEntryId } = req.params;
    const validatedData = clockOutSchema.parse(req.body);

    const clockOutRequest: ClockOutRequest = {
      timeEntryId,
      clockOutTime: validatedData.clockOutTime ? new Date(validatedData.clockOutTime) : undefined
    };

    const timeEntry = await timeTrackingService.clockOut(clockOutRequest);

    res.json({
      success: true,
      data: timeEntry,
      message: 'Successfully clocked out'
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clock out'
    });
  }
});
```

#### Edit Entry Endpoint
**Lines**: 345-413

**Current Endpoint (GAP: Doesn't re-trigger approval)**:
```typescript
router.put('/entries/:id/edit', requireAuth, requirePermission('timetracking.edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = editTimeEntrySchema.parse(req.body);

    const currentEntry = await prisma.laborTimeEntry.findUnique({
      where: { id }
    });

    // Prepare update data
    const updateData: any = {
      editedBy: req.user?.id,
      editedAt: new Date(),
      editReason: validatedData.editReason,
    };

    // Track original values
    if (validatedData.clockInTime) {
      updateData.originalClockInTime = currentEntry.originalClockInTime || currentEntry.clockInTime;
      updateData.clockInTime = new Date(validatedData.clockInTime);
    }

    if (validatedData.clockOutTime) {
      updateData.originalClockOutTime = currentEntry.originalClockOutTime || currentEntry.clockOutTime;
      updateData.clockOutTime = new Date(validatedData.clockOutTime);
    }

    // Recalculate duration and cost
    if (updateData.clockInTime && updateData.clockOutTime) {
      const durationMs = updateData.clockOutTime.getTime() - updateData.clockInTime.getTime();
      updateData.duration = durationMs / (1000 * 60 * 60);
      if (currentEntry.laborRate) {
        updateData.laborCost = updateData.duration * currentEntry.laborRate;
      }
    }

    const updatedEntry = await prisma.laborTimeEntry.update({
      where: { id },
      data: updateData,
      // ...
    });

    res.json({
      success: true,
      data: updatedEntry,
      message: 'Time entry updated successfully'
    });
  } catch (error) {
    console.error('Edit entry error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to edit time entry'
    });
  }
});
```

**NEEDED ENHANCEMENT for Issue #51**:
```typescript
// After successful update, check if re-approval needed:
if (currentEntry.status === TimeEntryStatus.APPROVED && updateData.clockInTime || updateData.clockOutTime) {
  // Entry was approved and times were edited - need re-approval
  updatedEntry = await prisma.laborTimeEntry.update({
    where: { id },
    data: {
      status: TimeEntryStatus.PENDING_APPROVAL,
      approvedBy: null,
      approvedAt: null
    }
  });

  // Initiate new approval workflow
  await unifiedApprovalService.initiateApproval(
    {
      entityType: 'TIME_ENTRY',
      entityId: id,
      currentStatus: 'PENDING_APPROVAL',
      requiredApproverRoles: ['supervisor'],
      priority: 'NORMAL',
      metadata: {
        previousApprover: currentEntry.approvedBy,
        editReason: validatedData.editReason,
        isReapproval: true
      }
    },
    req.user?.id
  );

  // Notify previous approver of re-submission
  // await notificationService.send(...)
}
```

#### Configuration Endpoint
**Lines**: 446-476

**Current Endpoint** (allows setting requireTimeApproval and approvalFrequency):
```typescript
router.put('/sites/:siteId/configuration', requireAuth, requirePermission('timetracking.config.write'), async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const validatedData = configurationUpdateSchema.parse(req.body);

    const updatedConfig = await prisma.timeTrackingConfiguration.upsert({
      where: { siteId },
      update: {
        ...validatedData,
        updatedAt: new Date(),
      },
      create: {
        siteId,
        ...validatedData,
        createdBy: req.user?.id || 'system',
      }
    });

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update configuration'
    });
  }
});
```

**NEEDED NEW ENDPOINTS for Issue #51**:
```typescript
// POST /api/v1/time-tracking/entries/:id/approve
router.post('/entries/:id/approve', requireAuth, requirePermission('timetracking.entries.approve'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const entry = await prisma.laborTimeEntry.findUnique({ where: { id } });
    if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });
    if (entry.status !== TimeEntryStatus.PENDING_APPROVAL) {
      return res.status(400).json({ success: false, error: 'Entry is not pending approval' });
    }

    const approved = await prisma.laborTimeEntry.update({
      where: { id },
      data: {
        status: TimeEntryStatus.APPROVED,
        approvedBy: req.user?.id,
        approvedAt: new Date()
      }
    });

    // Update workflow instance if it exists
    // await workflowEngine.updateWorkflowInstance(...)

    res.json({
      success: true,
      data: approved,
      message: 'Time entry approved'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/v1/time-tracking/entries/:id/reject
router.post('/entries/:id/reject', requireAuth, requirePermission('timetracking.entries.reject'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const rejected = await prisma.laborTimeEntry.update({
      where: { id },
      data: {
        status: TimeEntryStatus.REJECTED,
        rejectionReason,
        approvedBy: req.user?.id,
        approvedAt: new Date()
      }
    });

    // Notify operator of rejection
    // await notificationService.send(...)

    res.json({
      success: true,
      data: rejected,
      message: 'Time entry rejected'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/v1/time-tracking/entries/:id/request-changes
router.post('/entries/:id/request-changes', requireAuth, requirePermission('timetracking.entries.approve'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { changeRequest } = req.body;

    // Create workflow action for "changes requested"
    // Transition entry to a state indicating changes needed
    // Notify operator

    res.json({
      success: true,
      message: 'Change request submitted'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/time-tracking/approvals/pending
router.get('/approvals/pending', requireAuth, requirePermission('timetracking.entries.approve'), async (req: Request, res: Response) => {
  try {
    // Get supervisor's site
    const siteId = req.user?.userSiteRoles[0]?.siteId;
    
    // Get all pending entries for users in this site
    const pending = await prisma.laborTimeEntry.findMany({
      where: {
        status: TimeEntryStatus.PENDING_APPROVAL,
        user: {
          userSiteRoles: {
            some: { siteId }
          }
        }
      },
      include: {
        user: true,
        workOrder: true,
        operation: true
      },
      orderBy: {
        clockOutTime: 'desc'
      }
    });

    res.json({
      success: true,
      data: pending,
      count: pending.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## Unified Approval Engine References

### UnifiedApprovalIntegration Service
**File**: `/home/tony/GitHub/MachShop/src/services/UnifiedApprovalIntegration.ts`
**Lines**: 1-150

**Key Interface for Time Entries**:
```typescript
interface ApprovalEntityMapping {
  entityType: 'TIME_ENTRY';  // NEW for Issue #51
  entityId: string;           // Time entry ID
  currentStatus: 'PENDING_APPROVAL';
  requiredApproverRoles: string[]; // e.g., ['supervisor']
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: {
    workOrderId?: string;
    operationId?: string;
    duration?: number;
    laborCost?: number;
    userId?: string;
    isReapproval?: boolean;
    previousApprover?: string;
  };
}
```

**Usage Pattern for Issue #51**:
```typescript
import { UnifiedApprovalIntegration } from '../services/UnifiedApprovalIntegration';
import prisma from '../lib/database';

const approvalService = new UnifiedApprovalIntegration(prisma);

// In clockOut() or endpoint:
const result = await approvalService.initiateApproval(
  {
    entityType: 'TIME_ENTRY',
    entityId: timeEntry.id,
    currentStatus: 'PENDING_APPROVAL',
    requiredApproverRoles: ['supervisor'],
    priority: timeEntry.duration > 8 ? 'HIGH' : 'NORMAL',
    metadata: {
      workOrderId: timeEntry.workOrderId,
      operationId: timeEntry.operationId,
      duration: timeEntry.duration,
      laborCost: timeEntry.laborCost,
      userId: timeEntry.userId
    }
  },
  timeEntry.userId  // createdById - who initiated (operator)
);

// Result contains:
// - workflowInstanceId: Can be stored in a new field on LaborTimeEntry
// - currentStage: Current approval stage
// - nextApprovers: List of users who need to approve
// - estimatedCompletionTime: When approval should be done
// - requiresSignature: Whether signature needed
```

---

## Validation Rules Engine (Needs Implementation)

### Sample Implementation for Issue #51

```typescript
// File: src/services/TimeEntryValidationRuleEngine.ts (NEW)

export class TimeEntryValidationRuleEngine {
  constructor(private prisma: PrismaClient) {}

  async validateEntry(
    entry: LaborTimeEntry,
    siteId: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Get applicable rules
    const rules = await this.prisma.timeEntryValidationRule.findMany({
      where: {
        isActive: true,
        siteId: siteId  // Site-specific rules
      }
    });

    // Evaluate each rule
    for (const rule of rules) {
      const ruleResult = this.evaluateRule(rule, entry);
      
      if (!ruleResult.isValid) {
        if (rule.severity === 'ERROR') {
          result.errors.push(rule.errorMessage);
          result.isValid = false;
        } else if (rule.severity === 'WARNING') {
          result.warnings.push(rule.errorMessage);
        }
      }
    }

    return result;
  }

  private evaluateRule(rule: TimeEntryValidationRule, entry: LaborTimeEntry): {isValid: boolean} {
    switch (rule.ruleType) {
      case TimeValidationRuleType.MAX_DURATION:
        // Example condition: "duration > 10"
        if (entry.duration && entry.duration > parseFloat(rule.condition)) {
          return { isValid: false };
        }
        return { isValid: true };

      case TimeValidationRuleType.MIN_DURATION:
        // Example condition: "duration < 0.25" (15 minutes)
        if (entry.duration && entry.duration < parseFloat(rule.condition)) {
          return { isValid: false };
        }
        return { isValid: true };

      case TimeValidationRuleType.OVERTIME_THRESHOLD:
        // Example condition: "8"
        if (entry.duration && entry.duration > parseFloat(rule.condition)) {
          return { isValid: false };
        }
        return { isValid: true };

      // ... other rule types ...

      default:
        return { isValid: true };
    }
  }
}
```

---

## Testing References

### TimeTrackingService Unit Tests
**File**: `/home/tony/GitHub/MachShop/src/tests/services/TimeTrackingService.test.ts`

**Key Test Cases Existing**:
- Clock in with work order
- Clock in with multi-tasking prevention
- Clock out with break rules
- Validation checks

**Test Cases Needed for Issue #51**:
```typescript
describe('Approval Workflow', () => {
  it('should initiate approval workflow on clock-out when requireTimeApproval=true', async () => {
    // Mock config with requireTimeApproval: true
    // Clock out entry
    // Verify UnifiedApprovalIntegration.initiateApproval was called
    // Verify entry status is PENDING_APPROVAL
    // Verify workflow instance created
  });

  it('should re-initiate approval when approved entry is edited', async () => {
    // Create approved entry
    // Edit the entry times
    // Verify status reset to PENDING_APPROVAL
    // Verify new approval workflow initiated
  });

  it('should validate against TimeEntryValidationRules', async () => {
    // Create rule: MAX_DURATION 10 hours
    // Attempt to clock-in 12 hours
    // Verify validation fails
  });
});
```

---

## Authentication & Permission References

**Permission Checks for Issue #51**:

```typescript
// In routes/timeTracking.ts

// Operator can clock out
router.post('/clock-out/:id', requireAuth, requirePermission('timetracking.clockout'), ...)

// Supervisor can approve
router.post('/entries/:id/approve', requireAuth, requirePermission('timetracking.entries.approve'), ...)

// Supervisor can reject
router.post('/entries/:id/reject', requireAuth, requirePermission('timetracking.entries.reject'), ...)

// Manager can export (future)
router.post('/entries/:id/export', requireAuth, requirePermission('timetracking.entries.export'), ...)

// System admin can manage validation rules
router.post('/validation-rules', requireAuth, requirePermission('timetracking.rules.manage'), ...)
```

---

## Configuration References

### Site-Level Settings (Key for Issue #51)

```typescript
// Get site config
const config = await prisma.timeTrackingConfiguration.findUnique({
  where: { siteId: 'site-123' }
});

// Check approval requirement
if (config.requireTimeApproval) {
  // Entries need supervisor approval
}

// Check approval frequency (currently unused - implement for Phase 3)
switch (config.approvalFrequency) {
  case 'DAILY':
    // Separate approval for each day
    break;
  case 'WEEKLY':
    // Group approvals by week (timesheet)
    break;
  case 'BIWEEKLY':
    // Group approvals by 2-week period
    break;
  case 'NONE':
    // No approval workflow
    break;
}
```

---

## Summary of Changes Needed

| Component | Current State | Needed for Issue #51 |
|-----------|---------------|---------------------|
| DB Schema | Complete ✓ | No migration needed |
| TimeTrackingService.clockOut() | Sets status | Call UnifiedApprovalIntegration |
| Edit endpoint | Recalculates times | Reset status if approved |
| Validation | Basic checks only | Rule engine implementation |
| Approval endpoints | MISSING | Create 3-4 new endpoints |
| Batch approval | NOT IMPLEMENTED | Group by approvalFrequency |
| Notifications | NOT INTEGRATED | Email/in-app on status change |
| Supervisor dashboard | MISSING | New UI component |
| Workflow integration | AVAILABLE | Just need to call |

---

## Files to Create/Modify

### Create
- `src/services/TimeEntryValidationRuleEngine.ts` - Rule execution
- `src/services/TimeEntryApprovalService.ts` - Approval workflow wrapper (optional)
- `frontend/src/components/TimeTracking/TimeEntryApprovalCard.tsx` - UI
- `frontend/src/pages/SupervisorApprovals.tsx` - Supervisor dashboard
- `src/tests/services/TimeEntryApprovalService.test.ts` - Tests

### Modify
- `src/services/TimeTrackingService.ts` - Call approval service
- `src/routes/timeTracking.ts` - Add approval endpoints
- `prisma/schema.prisma` - Optional: Add workflowInstanceId field to LaborTimeEntry
- `frontend/src/components/TimeTracking/TimeEntryDetails.tsx` - Show approval status
- Middleware/auth - New permissions definitions

---

The foundation is solid. The implementation path is clear. Time to build Issue #51!
