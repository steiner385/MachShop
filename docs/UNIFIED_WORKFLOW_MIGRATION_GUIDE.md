# Unified Workflow Engine Migration Guide

## Overview

This guide provides comprehensive instructions for migrating from legacy approval systems to the new Unified Workflow Engine implemented in **GitHub Issue #147: Core Unified Workflow Engine Integration**.

The unified workflow engine consolidates all disparate approval processes into a single, consistent, and powerful system that provides:

- **Consistent API across all entity types** (Work Instructions, FAI Reports, Quality Processes, Documents)
- **Advanced workflow capabilities** (electronic signatures, delegation, escalation, audit trails)
- **Real-time status tracking** and comprehensive dashboards
- **Regulatory compliance features** (21 CFR Part 11 electronic signatures for FAI reports)
- **Role-based approval routing** with automatic approver assignment

## Architecture Overview

### Before: Disparate Approval Systems
```
WorkInstructionService ──► Custom approval logic
FAIService ──────────────► Custom approval logic
QualityService ───────────► Custom approval logic
ReviewService ────────────► Custom approval logic
```

### After: Unified Workflow Engine
```
                    ┌─► UnifiedApprovalIntegration
All Services ──────┤   ├─► WorkflowEngineService
                    └─► WorkflowDefinitionInitializer
                        ├─► Predefined Workflow Templates
                        ├─► Electronic Signature Support
                        ├─► Audit Trail & History
                        └─► Role-based Routing
```

## Migration Steps

### Phase 1: Service Integration

#### 1.1 WorkInstructionService Migration

**Before** (Legacy approval methods):
```typescript
// Old direct approval method
async approveWorkInstruction(id: string, userId: string): Promise<WorkInstruction> {
  // Custom approval logic
  return await this.prisma.workInstruction.update({
    where: { id },
    data: { status: 'APPROVED', approvedBy: userId }
  });
}
```

**After** (Unified workflow integration):
```typescript
// ✅ GITHUB ISSUE #147: Core Unified Workflow Engine Integration
import { UnifiedApprovalIntegration } from './UnifiedApprovalIntegration';

class WorkInstructionService {
  private unifiedApprovalService: UnifiedApprovalIntegration;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.unifiedApprovalService = new UnifiedApprovalIntegration(this.prisma);
  }

  // New unified approval methods
  async submitWorkInstructionForApproval(
    workInstructionId: string,
    userId: string,
    requiredApproverRoles: string[] = ['quality_manager'],
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): Promise<UnifiedApprovalResult> {
    await this.unifiedApprovalService.initialize(userId);

    return await this.unifiedApprovalService.initiateApproval({
      entityType: 'WORK_INSTRUCTION',
      entityId: workInstructionId,
      currentStatus: 'PENDING_APPROVAL',
      requiredApproverRoles,
      priority,
      metadata: {
        submittedAt: new Date().toISOString(),
        submittedBy: userId,
        processType: 'work_instruction_approval'
      }
    }, userId);
  }

  async approveWorkInstruction(
    workInstructionId: string,
    userId: string,
    comments?: string
  ): Promise<UnifiedApprovalResult> {
    return await this.unifiedApprovalService.approveWorkInstruction(
      workInstructionId,
      userId,
      comments
    );
  }

  async getWorkInstructionApprovalStatus(workInstructionId: string) {
    return await this.unifiedApprovalService.getApprovalStatus(
      'WORK_INSTRUCTION',
      workInstructionId
    );
  }
}
```

#### 1.2 FAIService Migration

**Key Changes for FAI Reports:**
- **Electronic signatures required** for regulatory compliance (21 CFR Part 11)
- **Enhanced audit trails** for traceability
- **Multi-stage approval process** (Technical Review → Quality Review → Customer Approval)

```typescript
// ✅ GITHUB ISSUE #147: Core Unified Workflow Engine Integration
async approveFAIReport(
  faiReportId: string,
  approvedById: string,
  comments?: string
): Promise<UnifiedApprovalResult> {
  // FAI reports always require electronic signatures
  const approvalResult = await this.unifiedApprovalService.approveFAIReport(
    faiReportId,
    approvedById,
    comments,
    true // Always require signature for FAI
  );

  if (!approvalResult.success) {
    throw new Error(`FAI approval failed: ${approvalResult.error}`);
  }

  return approvalResult;
}
```

#### 1.3 QualityService Migration

**Key Changes for Quality Processes:**
- **Integrated quality workflow** with inspection validation
- **Automatic NCR generation** for failed approvals
- **Quality metrics tracking** throughout approval process

```typescript
// ✅ GITHUB ISSUE #147: Core Unified Workflow Engine Integration
async approveQualityProcess(
  qualityProcessId: string,
  userId: string,
  comments?: string
): Promise<UnifiedApprovalResult> {
  const approvalResult = await this.unifiedApprovalService.approveQualityProcess(
    qualityProcessId,
    userId,
    comments
  );

  if (!approvalResult.success) {
    throw new Error(`Quality process approval failed: ${approvalResult.error}`);
  }

  return approvalResult;
}
```

#### 1.4 ReviewService Migration

**Key Changes for Document Approvals:**
- **Document type-specific workflows** (Procedures, SOPs, Work Instructions)
- **Review integration** with approval workflows
- **Version control** and document lifecycle management

```typescript
// ✅ GITHUB ISSUE #147: Core Unified Workflow Engine Integration
async approveDocument(
  documentId: string,
  userId: string,
  comments?: string,
  requiresSignature: boolean = false
): Promise<UnifiedApprovalResult> {
  let signatureData = null;
  if (requiresSignature) {
    signatureData = {
      userId,
      reason: 'Document approval signature',
      timestamp: new Date(),
      ipAddress: '127.0.0.1', // From request context
      userAgent: 'ReviewService'
    };
  }

  return await this.unifiedApprovalService.processApprovalAction(
    'DOCUMENT',
    documentId,
    'APPROVE',
    userId,
    comments,
    signatureData
  );
}
```

### Phase 2: API Integration

#### 2.1 Unified API Endpoints

The new unified approval system provides consistent REST endpoints for all entity types:

**Base URL:** `/api/v1/approvals`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/initiate` | POST | Initiate approval workflow for any entity |
| `/:entityType/:entityId/approve` | POST | Approve specific entity |
| `/:entityType/:entityId/reject` | POST | Reject specific entity |
| `/:entityType/:entityId/delegate` | POST | Delegate approval to another user |
| `/:entityType/:entityId/status` | GET | Get approval status |
| `/my-tasks` | GET | Get pending approval tasks for user |
| `/dashboard` | GET | Get approval dashboard summary |

#### 2.2 API Usage Examples

**Initiate Work Instruction Approval:**
```bash
curl -X POST /api/v1/approvals/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "WORK_INSTRUCTION",
    "entityId": "wi-12345",
    "priority": "MEDIUM",
    "requiredApproverRoles": ["quality_manager"],
    "metadata": {
      "departmentId": "manufacturing",
      "urgency": "standard"
    }
  }'
```

**Approve FAI Report with Signature:**
```bash
curl -X POST /api/v1/approvals/fai_report/fai-67890/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "APPROVE",
    "comments": "All measurements within tolerance",
    "requiresSignature": true,
    "signatureReason": "FAI regulatory approval"
  }'
```

**Get Approval Status:**
```bash
curl -X GET /api/v1/approvals/work_instruction/wi-12345/status \
  -H "Authorization: Bearer $TOKEN"
```

### Phase 3: Database Schema Updates

#### 3.1 Required Schema Changes

The unified workflow engine requires the following schema updates:

```sql
-- Add new workflow types to existing enum
ALTER TYPE "WorkflowType" ADD VALUE 'FAI_REPORT';
ALTER TYPE "WorkflowType" ADD VALUE 'QUALITY_PROCESS';
```

#### 3.2 Workflow Definitions

The system automatically creates predefined workflow definitions:

1. **Work Instruction Workflow** (`src/services/WorkflowDefinitionInitializer.ts:89`)
2. **FAI Report Workflow** (`src/services/WorkflowDefinitionInitializer.ts:145`)
3. **Quality Process Workflow** (`src/services/WorkflowDefinitionInitializer.ts:201`)
4. **Document Approval Workflow** (`src/services/WorkflowDefinitionInitializer.ts:249`)
5. **Emergency Approval Workflow** (`src/services/WorkflowDefinitionInitializer.ts:297`)

### Phase 4: Frontend Integration

#### 4.1 Component Migration

**Before** (Disparate approval components):
```tsx
// Multiple different approval components
<WorkInstructionApproval workInstructionId={id} />
<FAIReportApproval faiId={id} />
<QualityProcessApproval qualityId={id} />
<DocumentApproval documentId={id} />
```

**After** (Unified approval component):
```tsx
// Single unified approval component
<UnifiedApprovalWorkflow
  entityType="WORK_INSTRUCTION"
  entityId={id}
  currentUser={user}
  onApprovalComplete={handleApprovalComplete}
  onApprovalRejected={handleApprovalRejected}
/>
```

#### 4.2 State Management Updates

**Before** (Multiple approval states):
```javascript
const [workInstructionApproval, setWorkInstructionApproval] = useState();
const [faiApproval, setFaiApproval] = useState();
const [qualityApproval, setQualityApproval] = useState();
const [documentApproval, setDocumentApproval] = useState();
```

**After** (Unified approval state):
```javascript
const [approvalStatus, setApprovalStatus] = useState({
  hasActiveWorkflow: false,
  workflowStatus: null,
  currentStage: null,
  completionPercentage: 0,
  nextApprovers: [],
  approvalHistory: []
});
```

### Phase 5: Testing Migration

#### 5.1 Updated Test Structure

**New Test Files:**
- `src/tests/services/UnifiedApprovalIntegration.test.ts` - Core service tests
- `src/tests/routes/unifiedApprovals.test.ts` - API endpoint tests
- `src/tests/integration/unifiedWorkflowIntegration.test.ts` - End-to-end tests

**Test Coverage Areas:**
1. **API Endpoint Testing** - All REST endpoints
2. **Service Integration Testing** - Each service's workflow integration
3. **End-to-End Workflow Testing** - Complete approval workflows
4. **Error Handling Testing** - Edge cases and failure scenarios
5. **Performance Testing** - Concurrent approvals and large task lists

#### 5.2 Migration Testing Checklist

- [ ] **Service Integration Tests Pass** - All services integrate correctly
- [ ] **API Endpoint Tests Pass** - All REST endpoints work as expected
- [ ] **End-to-End Workflow Tests Pass** - Complete workflows function properly
- [ ] **Electronic Signature Tests Pass** - FAI signature requirements work
- [ ] **Role-Based Authorization Tests Pass** - Proper role enforcement
- [ ] **Performance Tests Pass** - System handles concurrent load
- [ ] **Error Handling Tests Pass** - Graceful error handling

### Phase 6: Deployment Strategy

#### 6.1 Gradual Migration Approach

**Week 1-2: Core Infrastructure**
1. Deploy UnifiedApprovalIntegration service
2. Deploy WorkflowDefinitionInitializer
3. Initialize workflow definitions
4. Deploy unified API routes

**Week 3-4: Service Integration**
1. Migrate WorkInstructionService
2. Migrate FAIService
3. Migrate QualityService
4. Migrate ReviewService

**Week 5-6: Frontend Migration**
1. Update approval components
2. Update state management
3. Update routing and navigation
4. User acceptance testing

**Week 7-8: Full Production**
1. Performance monitoring
2. User training
3. Documentation updates
4. Legacy system deprecation

#### 6.2 Rollback Strategy

In case of issues during migration:

1. **Database Rollback** - Revert schema changes if needed
2. **Service Rollback** - Keep legacy approval methods as fallbacks
3. **API Rollback** - Maintain legacy endpoints during transition
4. **Frontend Rollback** - Keep legacy components available

## Benefits of Migration

### 1. Consistency
- **Unified API** across all approval types
- **Consistent user experience** for all approvals
- **Standardized workflows** with common patterns

### 2. Advanced Features
- **Electronic signatures** for regulatory compliance
- **Delegation and escalation** capabilities
- **Real-time status tracking** and notifications
- **Comprehensive audit trails** for compliance

### 3. Maintainability
- **Single codebase** for all approval logic
- **Centralized workflow definitions**
- **Easier testing and debugging**
- **Reduced code duplication**

### 4. Scalability
- **Performance optimizations** for large approval loads
- **Concurrent approval processing**
- **Efficient database queries**
- **Caching and optimization**

### 5. Compliance
- **21 CFR Part 11** electronic signature support
- **Complete audit trails** for regulatory requirements
- **Role-based access control** (RBAC)
- **Document version control** integration

## Legacy Route Handlers Status

### Core Routes Updated ✅
- **Work Instructions** (`/api/v1/work-instructions/:id/approve`, `/api/v1/work-instructions/:id/reject`) - Updated to use unified approval service
- **FAI Reports** (`/api/v1/fai/:id/approve`) - Updated to use unified approval service with signature requirements

### Remaining Legacy Routes (Planned for Future Migration) 📋
The following routes still use direct service calls and should be migrated to the unified approval system in a future iteration:

- **SOPs** (`src/routes/sops.ts:556`) - `sopService.approveSOP()`
- **Tool Drawings** (`src/routes/toolDrawings.ts:601`) - `toolDrawingService.approveToolDrawing()`
- **Setup Sheets** (`src/routes/setupSheets.ts:525`) - `setupSheetService.approveSetupSheet()`
- **Inspection Plans** (`src/routes/inspectionPlans.ts:555`) - `inspectionPlanService.approveInspectionPlan()`
- **Routing Service** (`src/routes/routings.ts:817`) - `routingService.approveRouting()`
- **Material Service** (`src/routes/materials.ts:715`) - `MaterialService.rejectLot()`

**Migration Pattern for Legacy Routes:**
```typescript
// Replace this pattern:
const entity = await entityService.approveEntity(id, userId);

// With this pattern:
const unifiedApprovalService = new UnifiedApprovalIntegration(prisma);
await unifiedApprovalService.initialize(userId);
const result = await unifiedApprovalService.processApprovalAction(
  'ENTITY_TYPE',
  id,
  'APPROVE',
  userId,
  comments
);
```

## Post-Migration Validation

### 1. Functional Validation
- [ ] All approval workflows function correctly
- [ ] Electronic signatures work for FAI reports
- [ ] Role-based access control enforced
- [ ] Audit trails captured properly

### 2. Performance Validation
- [ ] Response times within acceptable limits
- [ ] Concurrent approvals handled efficiently
- [ ] Database performance optimized
- [ ] Memory usage within bounds

### 3. Security Validation
- [ ] Authentication and authorization working
- [ ] Electronic signatures secure and compliant
- [ ] Audit logs tamper-proof
- [ ] Data encryption in transit and at rest

### 4. User Experience Validation
- [ ] Approval dashboards functional
- [ ] Task lists accurate and current
- [ ] Notifications working properly
- [ ] Mobile responsiveness maintained

## Troubleshooting Common Issues

### 1. Service Integration Issues

**Problem:** Service cannot initialize UnifiedApprovalIntegration
**Solution:**
```typescript
// Ensure proper initialization
await unifiedApprovalService.initialize(userId);
```

**Problem:** Workflow definitions not found
**Solution:**
```typescript
// Check workflow initialization
const workflowIds = await workflowInitializer.getWorkflowIds();
console.log('Available workflows:', workflowIds);
```

### 2. API Integration Issues

**Problem:** 404 errors on approval endpoints
**Solution:** Verify unified approval routes are mounted in main app:
```typescript
// In src/index.ts
import unifiedApprovalRoutes from './routes/unifiedApprovals';
apiRouter.use('/approvals', authMiddleware, unifiedApprovalRoutes);
```

**Problem:** Authorization errors
**Solution:** Verify user has required roles:
```typescript
// Check user roles
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { roles: true }
});
```

### 3. Database Issues

**Problem:** WorkflowType enum missing values
**Solution:**
```sql
-- Add missing enum values
ALTER TYPE "WorkflowType" ADD VALUE 'FAI_REPORT';
ALTER TYPE "WorkflowType" ADD VALUE 'QUALITY_PROCESS';
```

**Problem:** Workflow instances not created
**Solution:** Check database constraints and foreign key relationships

### 4. Performance Issues

**Problem:** Slow approval task queries
**Solution:** Add database indexes:
```sql
-- Optimize approval task queries
CREATE INDEX idx_workflow_instance_entity ON "WorkflowInstance"(entity_type, entity_id);
CREATE INDEX idx_workflow_instance_status ON "WorkflowInstance"(status);
```

## Support and Resources

### Documentation
- **API Documentation** - `/api/v1/approvals` endpoints
- **Service Documentation** - Individual service integration guides
- **Workflow Documentation** - Workflow definition specifications

### Code References
- **UnifiedApprovalIntegration** - `src/services/UnifiedApprovalIntegration.ts:10`
- **WorkflowDefinitionInitializer** - `src/services/WorkflowDefinitionInitializer.ts:15`
- **Unified API Routes** - `src/routes/unifiedApprovals.ts:17`
- **Integration Tests** - `src/tests/integration/unifiedWorkflowIntegration.test.ts:14`

### Contact Information
- **Development Team** - For technical implementation questions
- **QA Team** - For testing and validation support
- **DevOps Team** - For deployment and infrastructure support

---

**Migration completed successfully!** The unified workflow engine provides a robust, scalable, and compliant approval system that will serve as the foundation for all future approval requirements in the MES system.