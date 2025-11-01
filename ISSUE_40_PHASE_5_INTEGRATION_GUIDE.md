# Issue #40: Phase 5 - WorkOrderExecutionService Integration Guide

## Overview

Phase 5 implements runtime integration of the workflow configuration system with the WorkOrderExecutionService. This phase enables configuration-driven enforcement of operation execution, data collection, and external vouching in production operations.

## Architecture

### Integration Pattern

The integration uses a **wrapper service pattern**:

```
Application Code
    ↓
WorkflowAwareExecutionService (NEW)
    ↓
├─→ WorkflowConfigurationService (reads configuration)
├─→ WorkOrderExecutionService (executes operations)
└─→ Database (persists execution and vouching records)
```

### Components

#### 1. WorkflowAwareExecutionService (NEW - 426 lines)

**Location**: `src/services/WorkflowAwareExecutionService.ts`

**Purpose**: Wraps WorkOrderExecutionService with workflow configuration awareness

**Key Methods**:

- `canExecuteOperation(workOrderId, operationId)` → ExecutionCheckResult
  - Checks if operation can be executed given configuration
  - Enforces STRICT/FLEXIBLE/HYBRID mode rules
  - Returns allowed/reason and current configuration

- `canCollectData(workOrderId)` → ExecutionCheckResult
  - Checks if data can be collected
  - Respects status gating configuration
  - Allows flexible collection in FLEXIBLE/HYBRID modes

- `recordExternalVouching(voucherData)` → ExternalVouching record
  - Records external system operation completion (HYBRID mode only)
  - Validates mode and enablement
  - Creates audit trail

- `getQualityCheckRequirements(workOrderId)` → { enforceQualityChecks, configuration }
  - Returns quality enforcement requirements
  - Respects configuration mode

- `transitionWithConfigurationCheck(...)` → StatusTransition result
  - Wraps standard status transition with configuration validation
  - Checks requireApproval, requireStartTransition settings
  - Logs mode context

- `recordPerformanceWithConfigurationCheck(...)` → WorkPerformance record
  - Wraps standard performance recording with configuration checks
  - Validates data collection permission
  - Enforces quality requirements

#### 2. Integration Tests (300+ lines)

**Location**: `src/services/__tests__/WorkflowAwareExecutionService.test.ts`

**Coverage**:

- **STRICT Mode Tests** (4 scenarios)
  - IN_PROGRESS requirement
  - Operation sequence enforcement
  - Status gating validation
  - Rejection of out-of-sequence operations

- **FLEXIBLE Mode Tests** (2 scenarios)
  - Status-agnostic execution
  - Sequence override support
  - Flexible data collection

- **HYBRID Mode Tests** (1 scenario)
  - External vouching support
  - Flexible execution with external integration

- **Data Collection Tests** (3 scenarios)
  - Status gating enforcement
  - STRICT vs FLEXIBLE/HYBRID differences

- **External Vouching Tests** (3 scenarios)
  - HYBRID mode requirement
  - enablement validation
  - System identification tracking

- **Quality Check Tests** (2 scenarios)
  - Requirement enforcement
  - Quality check pass validation

- **Wrapper Method Tests** (3 scenarios)
  - Status transition wrapping
  - Performance recording wrapping
  - Configuration propagation

## Configuration-Driven Enforcement

### STRICT Mode Behavior

```
Operation Execution:
├─ Require: work order status = IN_PROGRESS
├─ Require: operations execute in defined sequence
├─ Require: prerequisite operations completed
├─ Require: quality checks passed
└─ Result: Full ISA-95 compliance

Data Collection:
├─ Require: IN_PROGRESS status
├─ Require: operations in sequence
└─ Deny: collection outside these constraints

External Vouching:
└─ NOT ALLOWED (allowExternalVouching = false)
```

### FLEXIBLE Mode Behavior

```
Operation Execution:
├─ Optional: status gating (configurable)
├─ Optional: sequence enforcement (configurable)
├─ Allow: out-of-sequence execution if configured
├─ Require: quality checks (if enforceQualityChecks=true)
└─ Result: Route authoring + data collection friendly

Data Collection:
├─ Optional: status gating (configurable)
├─ Allow: collection from any status if gating disabled
└─ Support: quality check enforcement

External Vouching:
└─ NOT ALLOWED (mode not HYBRID)
```

### HYBRID Mode Behavior

```
Operation Execution:
├─ Optional: status gating (configurable)
├─ Allow: external system completion (if enabled)
├─ Allow: MES completion (normal flow)
├─ Support: operation duplicates (external + MES)
└─ Result: Multi-system execution support

Data Collection:
├─ Optional: status gating (configurable)
├─ Allow: flexible collection from any status
└─ Support: both MES and external data

External Vouching:
├─ Allow: external systems to complete operations
├─ Require: allowExternalVouching = true
├─ Validate: voucher system identification
└─ Audit: all external vouching attempts
```

## Database Schema Changes (Phase 5)

### New Table: external_operation_vouching

```sql
CREATE TABLE external_operation_vouching (
  id                  TEXT PRIMARY KEY,
  workOrderId        TEXT NOT NULL,
  operationId        TEXT NOT NULL,
  vouchedBy          TEXT NOT NULL,        -- External system identifier
  voucherSystemId    TEXT NOT NULL,        -- "SAP", "ORACLE", "LEGACY_MES"
  externalOperationId TEXT,                -- Reference in external system
  completionTime     TIMESTAMP NOT NULL,   -- When operation was completed
  recordedAt         TIMESTAMP DEFAULT NOW(),
  notes              TEXT,
  FOREIGN KEY (workOrderId) REFERENCES work_orders(id),
  FOREIGN KEY (operationId) REFERENCES operations(id)
);

CREATE INDEX idx_external_vouching_workOrder ON external_operation_vouching(workOrderId);
CREATE INDEX idx_external_vouching_voucher ON external_operation_vouching(vouchedBy);
```

## Usage Examples

### Example 1: Check Operation Execution in STRICT Mode

```typescript
import { workflowAwareExecutionService } from '../services/WorkflowAwareExecutionService';

// User attempts to execute operation
const canExecute = await workflowAwareExecutionService.canExecuteOperation(
  'WO-2024-001',
  'OP-001'
);

if (!canExecute.allowed) {
  console.error(`Cannot execute: ${canExecute.reason}`);
  console.log(`Current mode: ${canExecute.configuration.mode}`);
  // STRICT mode requires: IN_PROGRESS status, sequence enforcement
  return;
}

// Proceed with operation execution...
```

### Example 2: Record External Vouching in HYBRID Mode

```typescript
// External ERP system reports operation completion
const vouching = await workflowAwareExecutionService.recordExternalVouching({
  workOrderId: 'WO-2024-001',
  operationId: 'OP-001',
  vouchedBy: 'SAP_SYSTEM',
  voucherSystemId: 'SAP',
  externalOperationId: 'SAP-12345',
  completionTime: new Date(),
  notes: 'Completed in SAP ERP'
});

console.log(`External vouching recorded: ${vouching.id}`);
// Audit trail created for compliance
```

### Example 3: Record Performance with Configuration Checks

```typescript
// Collect labor performance data
const performance = await workflowAwareExecutionService.recordPerformanceWithConfigurationCheck(
  'WO-2024-001',
  'LABOR',
  {
    personalId: 'EMP-123',
    laborHours: 8,
    laborCost: 400,
    laborEfficiency: 95
  },
  'supervisor-456'
);

// Configuration checks:
// - Data collection allowed? (checks enforceStatusGating)
// - Quality checks required? (returns enforceQualityChecks)
// - External vouching enabled? (returns allowExternalVouching)

console.log(`Labor performance recorded: ${performance.id}`);
```

### Example 4: Transition with Approval Requirement

```typescript
// Attempt status transition
const transition = await workflowAwareExecutionService.transitionWithConfigurationCheck(
  'WO-2024-001',
  'IN_PROGRESS',
  'Start production',
  'operator-789'
);

// Configuration validation:
// - requireApproval: true → requires supervisor approval
// - requireStartTransition: true → requires explicit start
// - Mode context logged in reason

console.log(`Transitioned to: ${transition.newStatus}`);
```

## Integration Points

### 1. Work Order Dispatch

Update `WorkOrderExecutionService.dispatchWorkOrder()` to call:

```typescript
const canDispatch = await workflowAwareExecutionService.canCollectData(workOrderId);
if (!canDispatch.allowed) {
  throw new Error(`Cannot dispatch: ${canDispatch.reason}`);
}
```

### 2. Status Transitions

Update `WorkOrderExecutionService.transitionWorkOrderStatus()` to call:

```typescript
// Use wrapper instead of direct transition
const result = await workflowAwareExecutionService.transitionWithConfigurationCheck(
  workOrderId,
  newStatus,
  reason,
  changedBy,
  notes
);
```

### 3. Performance Recording

Update `WorkOrderExecutionService.recordWorkPerformance()` to call:

```typescript
// Use wrapper instead of direct recording
const result = await workflowAwareExecutionService.recordPerformanceWithConfigurationCheck(
  workOrderId,
  performanceType,
  perfData,
  recordedBy
);
```

### 4. Quality Control

Integrate with quality check enforcement:

```typescript
const qcRequirements = await workflowAwareExecutionService.getQualityCheckRequirements(workOrderId);

if (qcRequirements.enforceQualityChecks && !qualityChecksPassed) {
  throw new Error('Quality checks required before proceeding');
}
```

## Testing Strategy

### Unit Tests (WorkflowAwareExecutionService.test.ts)
- Mode-specific behavior validation
- Configuration propagation
- Error handling
- Permission checking

### Integration Tests
- Full workflow: dispatch → execute → collect data → complete
- Configuration changes during execution
- External vouching workflow (HYBRID mode)
- Quality check enforcement

### E2E Tests
- Shop floor operator workflows
- Configuration mode switching
- Multi-system execution (HYBRID)
- Audit trail verification

## Performance Considerations

1. **Configuration Caching**
   - Consider caching effective configurations (5-10 min TTL)
   - Reduces database queries for frequently accessed configurations

2. **External Vouching Lookup**
   - Index on workOrderId for fast lookup
   - Index on voucherSystemId for multi-system queries

3. **Authorization Checks**
   - Integrate with permission system
   - Cache role-based permissions per user

## Security Considerations

1. **External Vouching Validation**
   - Verify voucher system identity
   - Require authentication for external systems
   - Audit all external vouching attempts

2. **Configuration Inheritance**
   - Enforce site-level defaults
   - Prevent escalation of privileges via overrides
   - Track all configuration changes

3. **Data Collection**
   - Enforce data ownership (recorded by user)
   - Validate data before recording
   - Maintain audit trail

## Deployment Checklist

- [ ] Database migration: external_operation_vouching table created
- [ ] WorkflowAwareExecutionService integrated into routes
- [ ] All execution paths updated to use wrapper service
- [ ] Configuration validation tested for all modes
- [ ] External vouching endpoints secured with authentication
- [ ] Audit logging enabled for all operations
- [ ] Performance baseline established
- [ ] Backup strategy for configuration data
- [ ] Rollback plan prepared
- [ ] User documentation updated

## Next Steps

Phase 5 completion enables:
- **Issue #41**: Flexible Workflow Enforcement Engine (now unblocked)
- **Issue #43**: External System Vouching API (now unblocked)
- **Issue #44**: Flexible Quality Controls (now unblocked)

## Files Modified/Created

### Created
- `src/services/WorkflowAwareExecutionService.ts` (426 lines)
- `src/services/__tests__/WorkflowAwareExecutionService.test.ts` (300+ lines)
- `ISSUE_40_PHASE_5_INTEGRATION_GUIDE.md` (this file)

### To Modify
- `src/services/WorkOrderExecutionService.ts`
- `src/routes/workOrderExecution.ts`
- Database migrations (external_operation_vouching table)

## Total Implementation (Phase 5)

- **Service Code**: 426 lines
- **Test Code**: 300+ lines
- **Documentation**: This guide
- **Total**: 726+ lines

## Overall Progress

| Phase | Status | Lines | Components |
|-------|--------|-------|-----------|
| 1 | ✅ | 573 | Backend (models, service, API) |
| 2 | ✅ | 573 | Overrides (routing, WO) |
| 3 | ✅ | 2,241 | Admin UI (5 components) |
| 4 | ✅ | 1,868 | Tests (unit, integration, E2E) |
| 5 | ⏳ | 726 | Runtime Integration |
| 6 | 📋 | TBD | Migration Script |

**Total So Far**: 5,981 lines across 5 phases
**Progress**: 70-75% complete
