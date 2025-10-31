# Issue #40: Site-Level Workflow Configuration System - Implementation Guide

## Overview

This document outlines the comprehensive implementation of Issue #40 (Site-Level Workflow Configuration System). The issue requires creating a flexible configuration system that allows MES sites to define their own workflow enforcement levels, supporting three modes:

- **STRICT**: Full ISA-95 enforcement (current behavior)
- **FLEXIBLE**: Relaxed prerequisites for data collection  
- **HYBRID**: External system execution with MES data collection

## Implementation Status

### ✅ COMPLETED

#### Database Models (Issue #40)
- `SiteWorkflowConfiguration` - Site-level enforcement configuration
- `RoutingWorkflowConfiguration` - Routing-level overrides
- `WorkOrderWorkflowConfiguration` - Work order-level overrides (requires approval)
- `WorkflowConfigurationHistory` - Audit trail for configuration changes
- `OperationWorkflowConfiguration` - Operation-level granular control
- `WorkflowMode` enum - STRICT, FLEXIBLE, HYBRID modes

**Location**: `prisma/schema.prisma:11155-11317`

#### Database Relationships
- Site → SiteWorkflowConfiguration (1:1)
- Routing → RoutingWorkflowConfiguration (1:1)
- WorkOrder → WorkOrderWorkflowConfiguration (1:1)
- Operation → OperationWorkflowConfiguration (1:1)
- SiteWorkflowConfiguration → WorkflowConfigurationHistory (1:n)

**Schema updates**: Lines 80, 874, 1420, 1461

#### WorkflowConfigurationService (Issue #40)
**Location**: `src/services/WorkflowConfigurationService.ts`

**Key Methods Implemented**:
- `getEffectiveConfiguration()` - Resolve configuration with inheritance (WO > Routing > Site)
- `getSiteConfiguration()` - Retrieve or create default site configuration
- `createDefaultSiteConfiguration()` - Initialize STRICT mode for new sites
- `updateSiteConfiguration()` - Update configuration and track changes
- `canExecuteOperation()` - Check if operation can be executed given config
- `canCollectData()` - Check if data can be collected given config
- `validateConfiguration()` - Validate configuration before saving

**Key Features**:
- Hierarchical inheritance with clear precedence rules
- Configuration change history tracking for audit trail
- Validation logic for mode-specific constraints
- Permission checking methods for execution and data collection

#### API Routes (Issue #40)
**Location**: `src/routes/workflowConfiguration.ts`

**Implemented Endpoints**:
- `GET /api/v1/sites/:siteId/workflow-configuration` - Get site config
- `PUT /api/v1/sites/:siteId/workflow-configuration` - Update site config
- `GET /api/v1/work-orders/:workOrderId/effective-configuration` - Get effective config
- `GET /api/v1/work-orders/:workOrderId/can-execute-operation/:operationId` - Check operation execution
- `GET /api/v1/work-orders/:workOrderId/can-collect-data` - Check data collection

---

### 🚧 REMAINING WORK (Not in Scope for this Phase)

#### Phase 1: Database Migration & Testing
- [ ] Create Prisma migration SQL (requires interactive environment)
- [ ] Run migration on dev/test databases
- [ ] Verify all tables created correctly
- [ ] Test foreign key relationships
- [ ] Test cascade deletes

**Estimated Effort**: 1-2 days

#### Phase 2: Routing & Work Order Configuration APIs  
- [ ] Create/update/delete routing overrides endpoints
- [ ] Create/update/delete work order overrides endpoints  
- [ ] Implement approval workflow for work order overrides
- [ ] Add authorization middleware (Site Manager role required)
- [ ] Configuration preview endpoint

**Files to Create**:
- Extend `src/routes/workflowConfiguration.ts` with additional endpoints

**Estimated Effort**: 2-3 days

#### Phase 3: Admin UI
- [ ] Create `SiteConfiguration` page component
- [ ] Implement mode selector with visual cards (STRICT/FLEXIBLE/HYBRID)
- [ ] Create enforcement rule toggles with descriptions
- [ ] Add configuration preview functionality
- [ ] Implement change history timeline
- [ ] Add routing override management UI
- [ ] Add work order override approval workflow UI

**Files to Create**:
- `frontend/src/pages/Admin/WorkflowConfiguration/SiteConfiguration.tsx`
- `frontend/src/components/WorkflowConfiguration/ModeSelector.tsx`
- `frontend/src/components/WorkflowConfiguration/RuleToggle.tsx`
- `frontend/src/components/WorkflowConfiguration/ConfigurationHistory.tsx`

**Estimated Effort**: 3-4 days

#### Phase 4: Testing & Documentation
- [ ] Write unit tests for WorkflowConfigurationService
- [ ] Write integration tests for API endpoints
- [ ] Write E2E tests for admin UI (Cypress)
- [ ] Test configuration inheritance with multiple override levels
- [ ] Test all three modes with sample work orders
- [ ] Performance testing (configuration resolution latency)
- [ ] Create user documentation

**Files to Create**:
- `src/services/__tests__/WorkflowConfigurationService.test.ts`
- `src/routes/__tests__/workflowConfiguration.test.ts`
- `frontend/src/pages/Admin/WorkflowConfiguration/__tests__/SiteConfiguration.e2e.ts`

**Estimated Effort**: 3-4 days

#### Phase 5: Integration with Work Order Execution
- [ ] Update `WorkOrderExecutionService` to use configuration
- [ ] Modify status gating logic to respect configuration
- [ ] Implement flexible data collection based on mode
- [ ] Add external vouching support for HYBRID mode
- [ ] Update quality check enforcement logic

**Files to Update**:
- `src/services/WorkOrderExecutionService.ts`

**Note**: This work is blocked by Issue #41 (Flexible Workflow Enforcement Engine)

**Estimated Effort**: 2-3 days (depends on Issue #41)

#### Phase 6: Migration Script
- [ ] Create script to initialize default configurations for all existing sites
- [ ] Ensure all sites have at least one configuration record
- [ ] Log migration results

**Files to Create**:
- `scripts/migrate-workflow-configurations.ts`

**Estimated Effort**: 1 day

---

## Configuration Inheritance Example

```
Site Configuration (STRICT mode):
├── enforceOperationSequence: true
├── enforceStatusGating: true
├── allowExternalVouching: false
└── enforceQualityChecks: true

Routing Override (for Route-123):
├── enforceStatusGating: false (override)
└── All other fields inherit from site

Work Order Override (for WO-456):
├── mode: FLEXIBLE (override)
├── enforceStatusGating: null (now inherits FLEXIBLE's default)
└── All other fields resolve through inheritance chain

Effective Configuration for WO-456:
{
  mode: FLEXIBLE,
  enforceOperationSequence: true (from site),
  enforceStatusGating: true (from routing override),
  allowExternalVouching: false (from site),
  enforceQualityChecks: true (from site),
  ...
}
```

---

## Three Workflow Modes

### STRICT Mode (Default)
- Full ISA-95 enforcement
- Work orders must be IN_PROGRESS to collect data
- Operations must complete in sequence
- All quality checks mandatory
- No external vouching
- **Use Case**: FDA-regulated production, aerospace critical parts, full MES execution

### FLEXIBLE Mode
- Relaxed prerequisites for data collection
- Data collection allowed without status constraints
- Can skip prerequisite checks
- Quality checks still enforced
- **Use Case**: Route authoring + data collection, work instruction viewing, shop floor forms

### HYBRID Mode
- External system execution + MES data collection
- Accept operation completions vouched by external systems
- Flexible data collection
- **Use Case**: External ERP execution, legacy system integration, phased migration

---

## Configuration Validation Rules

1. **STRICT mode cannot have**:
   - `enforceOperationSequence: false`
   - `enforceStatusGating: false`
   - `allowExternalVouching: true`

2. **FLEXIBLE mode allows**:
   - Any enforcement toggle configuration
   - But maintains quality check requirements

3. **HYBRID mode allows**:
   - All toggle combinations
   - Requires explicit external vouching enabled

---

## API Request/Response Examples

### Get Effective Configuration

```bash
GET /api/v1/work-orders/WO-123/effective-configuration
```

**Response**:
```json
{
  "success": true,
  "data": {
    "mode": "FLEXIBLE",
    "enforceOperationSequence": true,
    "enforceStatusGating": false,
    "allowExternalVouching": false,
    "enforceQualityChecks": true,
    "requireStartTransition": true,
    "requireJustification": false,
    "requireApproval": false,
    "isStrictMode": false,
    "isFlexibleMode": true,
    "isHybridMode": false,
    "source": {
      "site": { ... site config ... },
      "routing": { ... routing override ... },
      "workOrder": null
    }
  }
}
```

### Update Site Configuration

```bash
PUT /api/v1/sites/SITE-001/workflow-configuration
Content-Type: application/json

{
  "mode": "FLEXIBLE",
  "enforceStatusGating": false,
  "enforceQualityChecks": true,
  "reason": "Enabling flexible mode for route authoring"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "config-123",
    "siteId": "SITE-001",
    "mode": "FLEXIBLE",
    "enforceOperationSequence": true,
    "enforceStatusGating": false,
    "allowExternalVouching": false,
    "enforceQualityChecks": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

---

## Database Migration SQL (Template)

The actual migration will be generated by Prisma, but here's the structure:

```sql
-- Create enum type
CREATE TYPE "WorkflowMode" AS ENUM ('STRICT', 'FLEXIBLE', 'HYBRID');

-- Create tables
CREATE TABLE "site_workflow_configurations" (
  id                      TEXT PRIMARY KEY,
  siteId                  TEXT UNIQUE NOT NULL,
  mode                    "WorkflowMode" DEFAULT 'STRICT',
  enforceOperationSequence BOOLEAN DEFAULT true,
  enforceStatusGating     BOOLEAN DEFAULT true,
  allowExternalVouching   BOOLEAN DEFAULT false,
  enforceQualityChecks    BOOLEAN DEFAULT true,
  requireStartTransition  BOOLEAN DEFAULT true,
  requireJustification    BOOLEAN DEFAULT false,
  requireApproval         BOOLEAN DEFAULT false,
  effectiveDate           TIMESTAMP DEFAULT NOW(),
  createdAt               TIMESTAMP DEFAULT NOW(),
  updatedAt               TIMESTAMP,
  createdBy               TEXT,
  updatedBy               TEXT,
  FOREIGN KEY (siteId) REFERENCES "sites"(id) ON DELETE CASCADE
);

CREATE TABLE "routing_workflow_configurations" (
  id                      TEXT PRIMARY KEY,
  routingId               TEXT UNIQUE NOT NULL,
  siteConfigId            TEXT,
  mode                    "WorkflowMode",
  enforceOperationSequence BOOLEAN,
  enforceStatusGating     BOOLEAN,
  allowExternalVouching   BOOLEAN,
  enforceQualityChecks    BOOLEAN,
  requireStartTransition  BOOLEAN,
  overrideReason          TEXT,
  approvedBy              TEXT,
  approvedAt              TIMESTAMP,
  createdAt               TIMESTAMP DEFAULT NOW(),
  updatedAt               TIMESTAMP,
  createdBy               TEXT,
  FOREIGN KEY (routingId) REFERENCES "routings"(id) ON DELETE CASCADE,
  FOREIGN KEY (siteConfigId) REFERENCES "site_workflow_configurations"(id) ON DELETE SET NULL
);

-- Create other tables similarly...

-- Create indexes
CREATE INDEX "idx_site_workflow_configurations_siteId" ON "site_workflow_configurations"(siteId);
CREATE INDEX "idx_site_workflow_configurations_mode" ON "site_workflow_configurations"(mode);
-- ... more indexes ...
```

---

## Integration Points with Other Issues

This Issue #40 **blocks**:
- **Issue #41**: Flexible Workflow Enforcement Engine (needs configuration to enforce)
- **Issue #43**: External System Vouching API (needs HYBRID mode config)
- **Issue #44**: Flexible Quality Controls (needs configuration toggles)
- **Issue #45**: Workflow Testing Framework (needs configurations to test against)

---

## Testing Strategy

### Unit Tests
- Configuration resolution algorithm
- Inheritance logic (WO > Routing > Site)
- Validation logic for each mode
- Change history tracking

### Integration Tests
- CRUD operations for all configuration levels
- Configuration query with proper inheritance
- Bulk import/export
- Authorization checks

### E2E Tests
- Full workflow: Create site → Change mode → Create work order → Verify permissions
- Configuration preview functionality
- History timeline display
- Routing/work order override workflows

---

## Deployment Checklist

- [ ] Database migration runs successfully
- [ ] All existing sites have default STRICT configuration
- [ ] No breaking changes to existing APIs
- [ ] Configuration service passes all tests
- [ ] API endpoints pass integration tests
- [ ] UI is responsive and accessible
- [ ] Documentation is complete
- [ ] Training materials prepared
- [ ] Rollout plan created

---

## Next Steps

1. **Run database migration** once interactive environment is available
2. **Create remaining API endpoints** for routing and work order overrides
3. **Develop admin UI** for configuration management
4. **Write comprehensive test suite**
5. **Integrate with WorkOrderExecutionService** (blocks Issue #41)
6. **Deploy to production** with default STRICT mode

---

## Files Reference

### Created in This Phase
- `src/services/WorkflowConfigurationService.ts` - Core service (370 lines)
- `src/routes/workflowConfiguration.ts` - API routes (215 lines)
- `prisma/schema.prisma` - Database models (165 lines added)

### To Be Created
- Database migration
- Additional API endpoints (routing/WO overrides)
- Admin UI components
- Test suites
- Migration script

---

**Total Implementation Effort**: 4-5 weeks as estimated in Issue #40

**Current Progress**: 15-20% (Database schema + Core service + Basic API)
