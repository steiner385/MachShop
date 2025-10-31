# Part Interchangeability & Substitution Group Framework (GitHub Issue #223)

## Overview

This document provides comprehensive documentation for the Part Interchangeability & Substitution Group Framework, implemented as part of GitHub Issue #223 for AS9100 regulatory compliance. This framework enables controlled part substitution management in aerospace manufacturing environments while maintaining full traceability and approval workflows.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [API Documentation](#api-documentation)
4. [Service Layer](#service-layer)
5. [MES Integration](#mes-integration)
6. [User Guides](#user-guides)
7. [Configuration Management](#configuration-management)
8. [Workflow Examples](#workflow-examples)
9. [Troubleshooting](#troubleshooting)
10. [Testing](#testing)

## System Architecture

### Core Components

The Part Interchangeability framework consists of several interconnected components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                    │
├─────────────────────────────────────────────────────────────┤
│                      API Gateway                           │
├─────────────────────────────────────────────────────────────┤
│  Part Interchangeability Routes  │  Work Order Routes      │
├─────────────────────────────────────────────────────────────┤
│ PartInterchangeabilityService     │ WorkOrderExecutionEnh   │
│                                   │ anced                   │
├─────────────────────────────────────────────────────────────┤
│          WorkOrderInterchangeabilityIntegration            │
├─────────────────────────────────────────────────────────────┤
│                     Database Layer                         │
│  • PartInterchangeabilityGroup   • InterchangeabilityApproval│
│  • PartSubstitution               • WorkOrderPartSubstitution│
│  • InterchangeabilityAuditLog                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Regulatory Compliance**: AS9100 compliant part substitution management
- **Configuration Control**: Full propagation vs interface abstraction
- **Approval Workflows**: Engineering approval for controlled substitutions
- **MES Integration**: Real-time work order execution validation
- **Audit Logging**: Complete traceability for all substitution activities
- **Automated Validation**: Pre-execution validation and substitute suggestions

## Database Schema

### Core Models

#### PartInterchangeabilityGroup

Defines groups of interchangeable parts with specific configuration control rules.

```prisma
model PartInterchangeabilityGroup {
  id                    String                 @id @default(cuid())
  name                  String                 @unique
  description           String?
  type                  InterchangeabilityType
  configurationControl  ConfigurationControl
  status                GroupStatus            @default(ACTIVE)
  effectiveDate         DateTime?
  expirationDate        DateTime?
  restrictionConditions String?

  // Relationships
  members               Part[]                 @relation("PartInterchangeabilityMembers")
  substitutions         PartSubstitution[]
  approvals             InterchangeabilityApproval[]
  auditLogs             InterchangeabilityAuditLog[]

  // Metadata
  createdBy             String
  createdAt             DateTime               @default(now())
  updatedBy             String?
  updatedAt             DateTime               @updatedAt
}
```

#### PartSubstitution

Defines specific substitution rules between parts within a group.

```prisma
model PartSubstitution {
  id                String                    @id @default(cuid())
  fromPartId        String
  toPartId          String
  groupId           String
  type              SubstitutionType
  direction         SubstitutionDirection
  quantityRatio     Float                     @default(1.0)
  priority          Int                       @default(1)
  effectiveDate     DateTime?
  expirationDate    DateTime?
  conditions        String?
  requiresApproval  Boolean                   @default(false)
  status            GroupStatus               @default(ACTIVE)

  // Relationships
  fromPart          Part                      @relation("FromPartSubstitutions", fields: [fromPartId], references: [id])
  toPart            Part                      @relation("ToPartSubstitutions", fields: [toPartId], references: [id])
  group             PartInterchangeabilityGroup @relation(fields: [groupId], references: [id])
  approvals         InterchangeabilityApproval[]
  workOrderUsage    WorkOrderPartSubstitution[]

  // Metadata
  createdBy         String
  createdAt         DateTime                  @default(now())
  updatedBy         String?
  updatedAt         DateTime                  @updatedAt
}
```

### Enums

```prisma
enum InterchangeabilityType {
  FORM_FIT_FUNCTION    // Complete interchangeability
  INTERFACE_ONLY       // Interface compatibility only
  FUNCTIONAL_ONLY      // Functional equivalence
  CONTROLLED_SUBSTITUTION // Requires specific conditions
}

enum ConfigurationControl {
  FULL_PROPAGATION     // Changes propagate to all configurations
  INTERFACE_ABSTRACTION // Changes isolated at interface level
}

enum SubstitutionType {
  DIRECT              // One-to-one substitution
  EQUIVALENT          // Functionally equivalent
  CONDITIONAL         // Conditional substitution
  EMERGENCY_ONLY      // Emergency use only
}

enum SubstitutionDirection {
  UNIDIRECTIONAL     // A → B only
  BIDIRECTIONAL      // A ↔ B
}
```

## API Documentation

### Base URL
All interchangeability endpoints are prefixed with:
```
/api/v1/part-interchangeability
```

### Authentication
All endpoints require production access authentication via the `authMiddleware`.

### Interchangeability Groups

#### GET /groups
Retrieve all interchangeability groups with filtering and pagination.

**Query Parameters:**
- `type` (string): Filter by interchangeability type
- `status` (string): Filter by group status
- `search` (string): Search in name and description
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `includeMembers` (boolean): Include group members
- `includeApprovals` (boolean): Include approval history

**Response:**
```json
{
  "data": [
    {
      "id": "group-123",
      "name": "Fastener Group A",
      "description": "Standard fasteners for wing assembly",
      "type": "FORM_FIT_FUNCTION",
      "configurationControl": "FULL_PROPAGATION",
      "status": "ACTIVE",
      "effectiveDate": "2024-01-01T00:00:00Z",
      "members": [...],
      "createdBy": "engineer-123",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

#### POST /groups
Create a new interchangeability group.

**Request Body:**
```json
{
  "name": "New Fastener Group",
  "description": "Description of the group",
  "type": "FORM_FIT_FUNCTION",
  "configurationControl": "FULL_PROPAGATION",
  "effectiveDate": "2024-01-01T00:00:00Z",
  "restrictionConditions": "Use only in non-critical applications",
  "createdBy": "engineer-123"
}
```

#### GET /groups/:id
Retrieve a specific interchangeability group.

#### PUT /groups/:id
Update an interchangeability group.

#### DELETE /groups/:id
Delete an interchangeability group.

### Part Substitutions

#### GET /substitutions
Retrieve part substitutions with filtering.

**Query Parameters:**
- `fromPartId` (string): Filter by source part
- `toPartId` (string): Filter by target part
- `groupId` (string): Filter by group
- `type` (string): Filter by substitution type
- `direction` (string): Filter by direction
- `status` (string): Filter by status

#### POST /substitutions
Create a new part substitution rule.

**Request Body:**
```json
{
  "fromPartId": "part-001",
  "toPartId": "part-002",
  "groupId": "group-123",
  "type": "DIRECT",
  "direction": "BIDIRECTIONAL",
  "quantityRatio": 1.0,
  "priority": 1,
  "effectiveDate": "2024-01-01T00:00:00Z",
  "conditions": "Temperature range: -40°C to +85°C",
  "requiresApproval": false,
  "createdBy": "engineer-123"
}
```

### Validation Endpoints

#### POST /validate
Validate if a part substitution is allowed.

**Request Body:**
```json
{
  "fromPartId": "part-001",
  "toPartId": "part-002",
  "workOrderId": "wo-123",
  "operationId": "op-456",
  "quantity": 10
}
```

**Response:**
```json
{
  "isValid": true,
  "canSubstitute": true,
  "substitutionRule": {
    "id": "sub-123",
    "quantityRatio": 1.0,
    "requiresApproval": false,
    "conditions": "Temperature restrictions apply"
  },
  "validationMessages": [],
  "approvalRequired": false
}
```

#### GET /parts/:partId/substitutes
Get all available substitutes for a part.

**Query Parameters:**
- `workOrderId` (string): Context work order
- `operationId` (string): Context operation
- `quantity` (number): Required quantity

**Response:**
```json
[
  {
    "partId": "part-002",
    "partNumber": "P002-001",
    "description": "Alternative fastener",
    "quantityRatio": 1.0,
    "priority": 1,
    "requiresApproval": false,
    "availableQuantity": 150,
    "estimatedCost": 2.50,
    "conditions": "Use with threadlocker",
    "groupName": "Fastener Group A"
  }
]
```

### Approval Workflow

#### GET /approvals
Retrieve approval requests.

#### POST /approvals
Create a new approval request.

#### POST /approvals/:id/process
Process an approval (approve/reject).

**Request Body:**
```json
{
  "decision": "APPROVED",
  "comments": "Approved for production use",
  "processedBy": "supervisor-123"
}
```

### Work Order Integration

#### POST /work-orders/:workOrderId/substitutions
Log a part substitution used in work order execution.

#### GET /work-orders/:workOrderId/substitutions
Get all substitutions used in a work order.

## Service Layer

### PartInterchangeabilityService

The main service class implementing the singleton pattern.

#### Key Methods

```typescript
// Group Management
createInterchangeabilityGroup(data: CreateGroupData): Promise<InterchangeabilityGroup>
updateInterchangeabilityGroup(id: string, data: UpdateGroupData): Promise<InterchangeabilityGroup>
searchInterchangeabilityGroups(options: SearchOptions): Promise<SearchResult>

// Substitution Management
createPartSubstitution(data: CreateSubstitutionData): Promise<PartSubstitution>
validateSubstitution(fromPartId: string, toPartId: string): Promise<ValidationResult>
getAvailableSubstitutes(partId: string): Promise<PartSubstitution[]>

// Approval Workflow
createApproval(data: CreateApprovalData): Promise<InterchangeabilityApproval>
processApproval(id: string, decision: string, processedBy: string): Promise<InterchangeabilityApproval>

// Work Order Integration
logWorkOrderSubstitution(data: WorkOrderSubstitutionData): Promise<WorkOrderPartSubstitution>
```

#### Usage Example

```typescript
import { PartInterchangeabilityService } from '../services/PartInterchangeabilityService';

const service = PartInterchangeabilityService.getInstance();

// Create a new interchangeability group
const group = await service.createInterchangeabilityGroup({
  name: 'Wing Fasteners',
  type: InterchangeabilityType.FORM_FIT_FUNCTION,
  configurationControl: ConfigurationControl.FULL_PROPAGATION,
  createdBy: 'engineer-123'
});

// Add parts to the group
await service.addPartToGroup(group.id, 'part-001', 'engineer-123');
await service.addPartToGroup(group.id, 'part-002', 'engineer-123');

// Create substitution rule
const substitution = await service.createPartSubstitution({
  fromPartId: 'part-001',
  toPartId: 'part-002',
  groupId: group.id,
  type: SubstitutionType.DIRECT,
  direction: SubstitutionDirection.BIDIRECTIONAL,
  createdBy: 'engineer-123'
});

// Validate substitution
const validation = await service.validateSubstitution('part-001', 'part-002');
if (validation.canSubstitute) {
  console.log('Substitution is allowed');
}
```

## MES Integration

### WorkOrderInterchangeabilityIntegration

Provides enhanced material consumption with automatic substitution validation.

#### Enhanced Material Consumption

```typescript
import { WorkOrderInterchangeabilityIntegration } from '../services/WorkOrderInterchangeabilityIntegration';

const integration = WorkOrderInterchangeabilityIntegration.getInstance();

// Enhanced material consumption with substitution validation
const result = await integration.consumeMaterialWithInterchangeability({
  workOrderId: 'wo-123',
  operationId: 'op-456',
  originalPartId: 'part-001',
  requestedQuantity: 10,
  recordedBy: 'operator-123',
  unitCost: 5.50
});

if (result.substitutionUsed) {
  console.log(`Substitution used: ${result.originalPartId} → ${result.actualPartUsed}`);
  console.log(`Cost impact: $${result.costImpact}`);
}
```

### WorkOrderExecutionEnhanced

Enhanced work order execution service with interchangeability capabilities.

#### Material Consumption with Validation

```typescript
import { WorkOrderExecutionEnhanced } from '../services/WorkOrderExecutionEnhanced';

const enhanced = WorkOrderExecutionEnhanced.getInstance();

// Pre-validate material consumption
const preValidation = await enhanced.preValidateMaterialConsumption(
  'wo-123',
  'part-001',
  10,
  'op-456'
);

if (!preValidation.canProceedDirectly) {
  console.log('Substitution required:', preValidation.suggestedAction);

  // Get substitute options
  const substitutes = await enhanced.getSubstituteOptions(
    'part-001',
    'wo-123',
    'op-456',
    10
  );

  console.log('Available substitutes:', substitutes);
}

// Enhanced consumption with automatic validation
const result = await enhanced.consumeMaterialWithValidation({
  workOrderId: 'wo-123',
  operationId: 'op-456',
  partId: 'part-001',
  quantityConsumed: 10,
  recordedBy: 'operator-123',
  allowSubstitution: true,
  requireApprovalForSubstitution: false
});
```

## User Guides

### For Design Engineers

#### Creating Interchangeability Groups

1. **Identify Parts**: Determine which parts are interchangeable based on form, fit, and function requirements.

2. **Create Group**:
   ```bash
   POST /api/v1/part-interchangeability/groups
   ```

3. **Set Configuration Control**:
   - **Full Propagation**: Use when design changes must be reflected across all configurations
   - **Interface Abstraction**: Use when changes should be isolated at the interface level

4. **Add Parts to Group**:
   ```bash
   POST /api/v1/part-interchangeability/groups/{groupId}/members
   ```

5. **Define Substitution Rules**: Create specific rules between parts with quantity ratios and conditions.

#### Example: Creating a Fastener Group

```javascript
// Step 1: Create the group
const group = await fetch('/api/v1/part-interchangeability/groups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'M6 Fasteners - Wing Assembly',
    description: 'Interchangeable M6 fasteners for wing structure',
    type: 'FORM_FIT_FUNCTION',
    configurationControl: 'FULL_PROPAGATION',
    effectiveDate: '2024-01-01T00:00:00Z',
    restrictionConditions: 'Operating temperature: -55°C to +125°C',
    createdBy: 'engineer-123'
  })
});

// Step 2: Add parts to the group
const parts = ['M6-SS-HEX-20', 'M6-TI-HEX-20', 'M6-AL-HEX-20'];
for (const partId of parts) {
  await fetch(`/api/v1/part-interchangeability/groups/${group.id}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partId: partId,
      addedBy: 'engineer-123'
    })
  });
}

// Step 3: Create substitution rules
await fetch('/api/v1/part-interchangeability/substitutions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromPartId: 'M6-SS-HEX-20',
    toPartId: 'M6-TI-HEX-20',
    groupId: group.id,
    type: 'DIRECT',
    direction: 'BIDIRECTIONAL',
    quantityRatio: 1.0,
    priority: 1,
    conditions: 'Titanium upgrade - higher strength',
    requiresApproval: true,
    createdBy: 'engineer-123'
  })
});
```

### For Manufacturing Engineers

#### Setting Up Approval Workflows

1. **Define Approval Requirements**: Determine which substitutions require approval.

2. **Configure Approval Matrix**:
   - **Low Risk**: No approval required
   - **Medium Risk**: Supervisor approval
   - **High Risk**: Engineering approval

3. **Create Approval Requests**:
   ```javascript
   const approval = await fetch('/api/v1/part-interchangeability/approvals', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       type: 'SUBSTITUTION_USAGE',
       entityId: 'substitution-123',
       requestedBy: 'operator-456',
       approverId: 'supervisor-789',
       requestReason: 'Original part unavailable - production cannot wait',
       priority: 'HIGH'
     })
   });
   ```

### For Production Operators

#### Using Substitutions in Work Orders

1. **Check Part Availability**: Verify if the originally specified part is available.

2. **Get Substitute Options**:
   ```javascript
   const substitutes = await fetch(
     `/api/v1/part-interchangeability/parts/PART-001/substitutes?workOrderId=WO-123&quantity=10`
   );
   ```

3. **Validate Substitution**:
   ```javascript
   const validation = await fetch('/api/v1/part-interchangeability/validate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       fromPartId: 'PART-001',
       toPartId: 'PART-002',
       workOrderId: 'WO-123',
       quantity: 10
     })
   });
   ```

4. **Consume Material with Substitution**:
   ```javascript
   const consumption = await fetch('/api/v1/part-interchangeability/work-orders/WO-123/substitutions', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       operationId: 'OP-456',
       fromPartId: 'PART-001',
       toPartId: 'PART-002',
       quantitySubstituted: 10,
       reason: 'Original part unavailable',
       authorizedBy: 'operator-123'
     })
   });
   ```

### For Quality Engineers

#### Monitoring and Auditing

1. **Review Substitution Usage**:
   ```javascript
   const usage = await fetch('/api/v1/part-interchangeability/work-orders/WO-123/substitutions');
   ```

2. **Audit Trail Review**:
   ```javascript
   const auditLogs = await fetch('/api/v1/part-interchangeability/audit-logs?' +
     'entityType=SUBSTITUTION&startDate=2024-01-01&endDate=2024-12-31');
   ```

3. **Part Usage History**:
   ```javascript
   const history = await fetch('/api/v1/part-interchangeability/parts/PART-001/usage-history?' +
     'startDate=2024-01-01&includeSubstitutions=true');
   ```

## Configuration Management

### Environment Variables

```env
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/machshop"

# Authentication
JWT_SECRET="your-jwt-secret"

# Logging
LOG_LEVEL="info"

# Interchangeability Settings
INTERCHANGEABILITY_AUTO_APPROVE_LOW_RISK=true
INTERCHANGEABILITY_MAX_SUBSTITUTION_RATIO=2.0
INTERCHANGEABILITY_AUDIT_RETENTION_DAYS=2555  # 7 years for AS9100
```

### Feature Flags

```typescript
// config/interchangeability.ts
export const InterchangeabilityConfig = {
  enableAutoSubstitution: process.env.ENABLE_AUTO_SUBSTITUTION === 'true',
  requireApprovalThreshold: parseFloat(process.env.APPROVAL_THRESHOLD || '1.5'),
  maxSubstitutionRatio: parseFloat(process.env.MAX_SUBSTITUTION_RATIO || '2.0'),
  enableCostImpactCalculation: process.env.ENABLE_COST_CALCULATION === 'true',
  auditRetentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '2555'),
  enableRealTimeValidation: process.env.ENABLE_REALTIME_VALIDATION !== 'false'
};
```

## Workflow Examples

### Complete Workflow: New Product Introduction

#### 1. Engineering Phase

```typescript
// Create interchangeability group for new product
const productGroup = await service.createInterchangeabilityGroup({
  name: 'Product X - Fasteners',
  description: 'All interchangeable fasteners for Product X',
  type: InterchangeabilityType.FORM_FIT_FUNCTION,
  configurationControl: ConfigurationControl.FULL_PROPAGATION,
  effectiveDate: new Date('2024-06-01'),
  createdBy: 'design-engineer-001'
});

// Add parts to group
const fastenerParts = ['F001-M6-SS', 'F002-M6-TI', 'F003-M6-AL'];
for (const partId of fastenerParts) {
  await service.addPartToGroup(productGroup.id, partId, 'design-engineer-001');
}

// Create substitution rules with engineering constraints
await service.createPartSubstitution({
  fromPartId: 'F001-M6-SS',
  toPartId: 'F002-M6-TI',
  groupId: productGroup.id,
  type: SubstitutionType.DIRECT,
  direction: SubstitutionDirection.UNIDIRECTIONAL, // Only upgrade to titanium
  quantityRatio: 1.0,
  priority: 1,
  conditions: 'Upgrade path only - higher strength requirement',
  requiresApproval: false, // Pre-approved upgrade
  createdBy: 'design-engineer-001'
});
```

#### 2. Manufacturing Phase

```typescript
// Manufacturing engineer reviews and approves for production
const approval = await service.createApproval({
  type: InterchangeabilityApprovalType.GROUP_ACTIVATION,
  entityId: productGroup.id,
  requestedBy: 'design-engineer-001',
  approverId: 'manufacturing-engineer-001',
  requestReason: 'New product introduction - fastener interchangeability',
  priority: 'HIGH'
});

// Process approval
await service.processApproval(
  approval.id,
  ApprovalStatus.APPROVED,
  'manufacturing-engineer-001',
  'Approved for production use - meets all manufacturing requirements'
);
```

#### 3. Production Phase

```typescript
// Operator encounters unavailable part during work order execution
const workOrderId = 'WO-2024-001';
const originalPartId = 'F001-M6-SS';

// System checks for available substitutes
const substitutes = await integration.getSubstituteOptions(
  originalPartId,
  workOrderId,
  undefined,
  50 // Required quantity
);

if (substitutes.length > 0) {
  // Use enhanced consumption with automatic substitution
  const result = await integration.consumeMaterialWithInterchangeability({
    workOrderId,
    originalPartId,
    requestedQuantity: 50,
    recordedBy: 'operator-001',
    unitCost: 2.50
  });

  if (result.substitutionUsed) {
    console.log(`Automatic substitution: ${originalPartId} → ${result.actualPartUsed}`);
    console.log(`Cost impact: $${result.costImpact}`);
  }
}
```

### Emergency Substitution Workflow

```typescript
// Emergency situation - original part not available
const emergencyValidation = await service.validateSubstitution(
  'CRITICAL-PART-001',
  'EMERGENCY-SUBSTITUTE-001',
  'EMERGENCY-WO-123'
);

if (!emergencyValidation.canSubstitute) {
  // Create emergency approval request
  const emergencyApproval = await service.createApproval({
    type: InterchangeabilityApprovalType.EMERGENCY_SUBSTITUTION,
    entityId: 'EMERGENCY-SUBSTITUTE-001',
    requestedBy: 'production-supervisor-001',
    approverId: 'chief-engineer-001',
    requestReason: 'Production line stopped - critical part unavailable',
    priority: 'URGENT'
  });

  // Notify for immediate approval
  await notificationService.sendUrgentApprovalRequest(emergencyApproval.id);
}
```

## Troubleshooting

### Common Issues

#### 1. "No substitution rule found" Error

**Symptom**: Validation returns `isValid: false` with message "No substitution rule found"

**Causes**:
- Parts are not in the same interchangeability group
- Substitution rule doesn't exist between the parts
- Substitution rule is expired or inactive

**Solutions**:
```typescript
// Check if parts are in the same group
const fromPartGroups = await service.getPartGroups('part-001');
const toPartGroups = await service.getPartGroups('part-002');
const commonGroups = fromPartGroups.filter(g =>
  toPartGroups.some(tg => tg.id === g.id)
);

if (commonGroups.length === 0) {
  // Add parts to the same group or create new substitution rule
  await service.createPartSubstitution({
    fromPartId: 'part-001',
    toPartId: 'part-002',
    groupId: 'existing-group-id',
    type: SubstitutionType.DIRECT,
    direction: SubstitutionDirection.BIDIRECTIONAL,
    createdBy: 'engineer-id'
  });
}
```

#### 2. "Substitution requires approval" Error

**Symptom**: Substitution validation succeeds but consumption fails due to missing approval

**Solutions**:
```typescript
// Create approval request
const approval = await service.createApproval({
  type: InterchangeabilityApprovalType.SUBSTITUTION_USAGE,
  entityId: 'substitution-rule-id',
  requestedBy: 'operator-id',
  approverId: 'supervisor-id',
  requestReason: 'Original part unavailable for production',
  priority: 'HIGH'
});

// Wait for approval or use emergency override
if (isEmergency) {
  await service.processApproval(
    approval.id,
    ApprovalStatus.APPROVED,
    'emergency-approver-id',
    'Emergency approval - production critical'
  );
}
```

#### 3. Performance Issues with Large Datasets

**Symptom**: Slow response times when searching groups or substitutions

**Solutions**:
- Use pagination and filtering:
```typescript
const result = await service.searchInterchangeabilityGroups({
  page: 1,
  limit: 20,
  search: 'specific-term',
  type: InterchangeabilityType.FORM_FIT_FUNCTION,
  includeMembers: false // Don't load members unless needed
});
```

- Implement caching for frequently accessed data
- Use database indexing on commonly queried fields

#### 4. Audit Trail Issues

**Symptom**: Missing or incomplete audit records

**Solutions**:
```typescript
// Verify audit logging is enabled
const auditLogs = await service.getAuditLogs({
  entityType: 'SUBSTITUTION',
  entityId: 'substitution-id',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});

if (auditLogs.length === 0) {
  // Check audit configuration
  console.error('Audit logging may be disabled or misconfigured');
}
```

### Performance Monitoring

#### Key Metrics to Monitor

1. **Substitution Success Rate**:
```typescript
const stats = await integration.getWorkOrderSubstitutionStats('wo-123');
const successRate = (stats.totalSubstitutions / totalAttempts) * 100;
```

2. **Approval Processing Time**:
```typescript
const approvals = await service.searchApprovals({
  status: ApprovalStatus.COMPLETED,
  startDate: new Date('2024-01-01')
});

const averageProcessingTime = approvals.data.reduce((sum, approval) => {
  const processingTime = approval.processedAt - approval.createdAt;
  return sum + processingTime;
}, 0) / approvals.data.length;
```

3. **Cost Impact Analysis**:
```typescript
const costImpact = await integration.getInterchangeabilityUtilizationReport({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});
```

### Debugging Tips

#### Enable Debug Logging

```typescript
// In service configuration
import { logger } from '../utils/logger';

// Set log level to debug
logger.level = 'debug';

// Add debug statements in key methods
logger.debug('Validating substitution', {
  fromPartId,
  toPartId,
  workOrderId,
  validationRules: rules.length
});
```

#### Database Query Analysis

```sql
-- Check for missing indexes
EXPLAIN ANALYZE SELECT * FROM "PartSubstitution"
WHERE "fromPartId" = 'part-001' AND "status" = 'ACTIVE';

-- Monitor slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE query LIKE '%PartInterchangeability%'
ORDER BY mean_time DESC;
```

## Testing

### Running Tests

```bash
# Run all interchangeability tests
npm test -- src/tests/services/PartInterchangeabilityService.test.ts
npm test -- src/tests/services/WorkOrderInterchangeabilityIntegration.test.ts
npm test -- src/tests/routes/partInterchangeability.test.ts

# Run with coverage
npm run test:coverage -- --include="**/PartInterchangeability*"

# Run integration tests
npm run test:integration -- --grep="interchangeability"
```

### Test Data Setup

```typescript
// Test data factory
export const createTestInterchangeabilityGroup = async () => {
  return await prisma.partInterchangeabilityGroup.create({
    data: {
      name: 'Test Group',
      type: InterchangeabilityType.FORM_FIT_FUNCTION,
      configurationControl: ConfigurationControl.FULL_PROPAGATION,
      createdBy: 'test-user',
      status: GroupStatus.ACTIVE
    }
  });
};

export const createTestSubstitution = async (groupId: string) => {
  return await prisma.partSubstitution.create({
    data: {
      fromPartId: 'test-part-001',
      toPartId: 'test-part-002',
      groupId,
      type: SubstitutionType.DIRECT,
      direction: SubstitutionDirection.BIDIRECTIONAL,
      quantityRatio: 1.0,
      priority: 1,
      createdBy: 'test-user',
      status: GroupStatus.ACTIVE
    }
  });
};
```

### Manual Testing Scenarios

#### Scenario 1: Basic Substitution Workflow

1. Create interchangeability group
2. Add parts to group
3. Create substitution rule
4. Validate substitution
5. Use substitution in work order
6. Verify audit trail

#### Scenario 2: Approval Workflow

1. Create substitution requiring approval
2. Attempt to use substitution without approval
3. Create approval request
4. Process approval
5. Use substitution successfully
6. Verify approval audit trail

#### Scenario 3: Emergency Override

1. Create critical production scenario
2. Attempt unavailable part consumption
3. Use emergency substitution override
4. Verify emergency audit logging
5. Follow up with post-emergency approval

## Conclusion

The Part Interchangeability & Substitution Group Framework provides a comprehensive solution for managing part substitutions in aerospace manufacturing while maintaining AS9100 compliance. The system offers:

- **Regulatory Compliance**: Full traceability and audit trails
- **Operational Flexibility**: Automated substitution suggestions and validation
- **Quality Control**: Approval workflows and configuration management
- **Integration**: Seamless MES integration with existing work order processes

For additional support or feature requests, please refer to the GitHub issue #223 or contact the development team.

---

**Document Version**: 1.0
**Last Updated**: 2024-01-01
**Authors**: Development Team
**Review Status**: Approved for Production Use