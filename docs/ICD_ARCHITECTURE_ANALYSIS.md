# MES Codebase Architecture Analysis for ICD System Integration

## Executive Summary

This document provides a comprehensive analysis of the MES (Manufacturing Execution System) codebase architecture to guide the design and implementation of an Interface Control Document (ICD) system. The analysis covers database schema patterns, service layer conventions, API route organization, ECO/change management workflows, and relationship management patterns that should be followed when implementing the ICD system.

---

## 1. DATABASE SCHEMA STRUCTURE & PATTERNS

### 1.1 Database Setup
- **ORM**: Prisma Client
- **Database**: PostgreSQL
- **Provider**: PostgreSQL
- **Architecture**: Modular schema with documented versions
  - Main schema: `/prisma/schema.prisma` (300KB+)
  - Documented versions: `/prisma/modular/modules/documented/`
  - Microservice schemas: `/services/*/prisma/schema.prisma`

### 1.2 Core Model Patterns

**Primary Key Generation**:
- Uses CUID (Collision-resistant IDs) for all primary keys
- Format: `@id @default(cuid())`
- Example: `id String @id @default(cuid())`

**Unique Identifiers**:
- Business identifiers are also marked as unique
- Example in Part model: `partNumber String @unique`
- Example in ECO: `ecoNumber String @unique`

**Temporal Fields**:
```prisma
createdAt     DateTime    @default(now())
updatedAt     DateTime    @updatedAt     // Automatically updated
```

**Indexing Strategy**:
- Business-critical fields indexed for query performance
- Status/state fields indexed for filtering
- Foreign key fields indexed automatically
- Example:
  ```prisma
  @@index([ecoNumber])
  @@index([status])
  @@index([priority])
  @@index([requestDate])
  ```

**Table Naming Convention**:
- Snake_case in database via `@@map("table_name")`
- Example: `@@map("parts")`, `@@map("engineering_change_orders")`

### 1.3 Part & BOM Model Structure

```prisma
model Part {
  id                      String                  @id @default(cuid())
  partNumber              String                  @unique
  partName                String
  description             String?
  partType                String
  productType             ProductType             @default(MADE_TO_STOCK)
  lifecycleState          ProductLifecycleState   @default(PRODUCTION)
  unitOfMeasure           String
  weight                  Float?
  weightUnit              String?
  drawingNumber           String?
  revision                String?
  cadModelUrl             String?
  releaseDate             DateTime?
  obsoleteDate            DateTime?
  
  // Relationships
  componentItems          BOMItem[]               @relation("ComponentPart")
  bomItems                BOMItem[]               @relation("ParentPart")
  replacementPart         Part?                   @relation("PartReplacement", fields: [replacementPartId], references: [id])
  replacedParts           Part[]                  @relation("PartReplacement")
  configurations          ProductConfiguration[]
  lifecycleHistory        ProductLifecycle[]
  specifications          ProductSpecification[]
  routings                Routing[]
  workOrders              WorkOrder[]
  
  // Indexing
  @@index([productType])
  @@index([lifecycleState])
  @@index([isActive])
  @@index([partNumber])
  @@map("parts")
}

model BOMItem {
  id                  String      @id @default(cuid())
  parentPartId        String
  componentPartId     String
  quantity            Float
  unitOfMeasure       String
  scrapFactor         Float?      @default(0)
  sequence            Int?
  findNumber          String?
  referenceDesignator String?
  operationId         String?
  operationNumber     Int?
  effectiveDate       DateTime?
  obsoleteDate        DateTime?
  ecoNumber           String?     // Links to ECO
  isOptional          Boolean     @default(false)
  isCritical          Boolean     @default(false)
  
  // Foreign Key Relationships
  componentPart       Part        @relation("ComponentPart", fields: [componentPartId], references: [id])
  operation           Operation?  @relation(fields: [operationId], references: [id])
  parentPart          Part        @relation("ParentPart", fields: [parentPartId], references: [id])
  
  @@index([parentPartId])
  @@index([componentPartId])
  @@index([operationId])
  @@index([effectiveDate])
  @@map("bom_items")
}
```

### 1.4 ECO (Engineering Change Order) Models

**Main ECO Model**:
```prisma
model EngineeringChangeOrder {
  id                    String                  @id @default(cuid())
  ecoNumber             String                  @unique
  title                 String
  description           String
  ecoType               ECOType
  priority              ECOPriority
  status                ECOStatus               @default(REQUESTED)
  currentState          String
  proposedChange        String
  reasonForChange       String
  affectedParts         String[]                // Array of part IDs
  affectedOperations    String[]                // Array of operation IDs
  estimatedCost         Float?
  actualCost            Float?
  estimatedSavings      Float?
  actualSavings         Float?
  requestedEffectiveDate DateTime?
  actualEffectiveDate   DateTime?
  effectivityType       EffectivityType?
  effectivityValue      String?
  isInterchangeable     Boolean                 @default(false)
  impactAnalysis        Json?                   // Complex data stored as JSON
  
  // Audit trail
  requestorId           String
  requestorName         String
  requestorDept         String?
  sponsorId             String?
  sponsorName           String?
  requestDate           DateTime                @default(now())
  crbReviewDate         DateTime?
  crbDecision           CRBDecision?
  completedDate         DateTime?
  verifiedDate          DateTime?
  
  // Relationships
  affectedDocuments     ECOAffectedDocument[]
  tasks                 ECOTask[]
  attachments           ECOAttachment[]
  history               ECOHistory[]
  crbReviews            ECOCRBReview[]
  relatedECOs           ECORelation[]           @relation("ParentECO")
  parentRelations       ECORelation[]           @relation("RelatedECO")
  
  @@index([ecoNumber])
  @@index([status])
  @@index([priority])
  @@index([requestDate])
  @@index([requestorId])
  @@map("engineering_change_orders")
}
```

**Supporting ECO Tables**:
- `ECOAffectedDocument`: Maps ECO to affected documents (composite key on ecoId, documentType, documentId)
- `ECOTask`: Implementation tasks for ECO execution
- `ECOAttachment`: Supporting documentation/files
- `ECOHistory`: Complete audit trail of all ECO changes (eventType, status transitions)
- `ECOCRBReview`: Change Review Board meeting records
- `ECORelation`: Relationships between ECOs (parent-child, related, dependent)

### 1.5 Enums for Change Management

**ECO Status Workflow**:
```
REQUESTED → UNDER_REVIEW → PENDING_CRB → CRB_APPROVED → IMPLEMENTATION 
            ↓              ↓               ↓
          REJECTED       ON_HOLD        VERIFICATION → COMPLETED
            ↓
          CANCELLED
```

**Related Enums**:
- `ECOType`: DESIGN, PROCESS, MATERIAL, COMPLIANCE, QUALITY, COST_REDUCTION, INTERCHANGEABILITY
- `ECOPriority`: LOW, MEDIUM, HIGH, CRITICAL, EMERGENCY
- `EffectivityType`: SERIAL_NUMBER, LOT_NUMBER, DATE_BASED, BUILD_SEQUENCE
- `ECOTaskType`: DESIGN_UPDATE, DOCUMENTATION_UPDATE, TOOLING_UPDATE, TRAINING, VERIFICATION
- `ECOTaskStatus`: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
- `DocUpdateStatus`: PENDING, IN_PROGRESS, COMPLETED, APPROVED
- `CRBDecision`: APPROVED, REJECTED, DEFERRED, REQUEST_MORE_INFO

---

## 2. SERVICE LAYER PATTERNS & CONVENTIONS

### 2.1 Service Architecture Overview
- **Location**: `/src/services/` (132 service files, ~3490 LOC average per service)
- **Pattern**: Class-based services with Prisma dependency injection
- **Database Integration**: All services use Prisma Client injected at instantiation

### 2.2 Service Constructor Pattern

**Standard Pattern**:
```typescript
export class ServiceName {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
}
```

**Alternative Pattern** (used by some services):
```typescript
import prisma from '../lib/database';

export class ServiceName {
  constructor() {}
  // Uses imported prisma singleton
}
```

### 2.3 Common Service Methods Structure

**CRUD Operations**:
1. `create(data: CreateInput): Promise<ResponseType>`
2. `getById(id: string): Promise<ResponseType>`
3. `getAll(filters?: FilterType): Promise<ResponseType[]>`
4. `update(id: string, data: UpdateInput): Promise<ResponseType>`
5. `delete(id: string): Promise<void>`

**Query Pattern with Filters**:
```typescript
async getECOs(filters?: ECOFilters): Promise<ECOResponse[]> {
  const where: Prisma.EngineeringChangeOrderWhereInput = {
    ...(filters?.status && { status: { in: filters.status } }),
    ...(filters?.priority && { priority: { in: filters.priority } }),
    ...(filters?.searchTerm && {
      OR: [
        { title: { contains: filters.searchTerm, mode: 'insensitive' } },
        { description: { contains: filters.searchTerm, mode: 'insensitive' } },
        { ecoNumber: { contains: filters.searchTerm, mode: 'insensitive' } }
      ]
    })
  };

  const items = await this.prisma.model.findMany({
    where,
    include: this.getInclude(),
    orderBy: { createdAt: 'desc' },
    skip: filters?.page ? (filters.page - 1) * (filters.limit || 20) : 0,
    take: filters?.limit || 20
  });

  return items.map(this.mapToResponse);
}
```

### 2.4 Relationship Handling

**Include Pattern for Related Data**:
```typescript
private getECOInclude() {
  return {
    affectedDocuments: true,
    tasks: true,
    attachments: true,
    history: {
      orderBy: { occurredAt: 'desc' as const },
      take: 10
    },
    crbReviews: true,
    relatedECOs: {
      include: {
        relatedEco: {
          select: {
            ecoNumber: true,
            title: true,
            status: true
          }
        }
      }
    }
  };
}
```

### 2.5 Error Handling in Services

**Custom Error Classes**:
```typescript
export class ECOError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ECOError';
  }
}

export class ECOValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ECOValidationError';
  }
}

export class ECOStateError extends Error {
  constructor(message: string, public currentState?: any) {
    super(message);
    this.name = 'ECOStateError';
  }
}

export class ECOPermissionError extends Error {
  constructor(message: string, public userId?: string) {
    super(message);
    this.name = 'ECOPermissionError';
  }
}
```

**Try-Catch Pattern**:
```typescript
async methodName(params): Promise<ResultType> {
  try {
    // Business logic
    const result = await this.prisma.model.create({ data });
    logger.info(`Success: ${message}`, { id: result.id });
    return result;
  } catch (error) {
    logger.error('Error message:', error);
    throw new CustomError(`Failed to perform action: ${error.message}`);
  }
}
```

### 2.6 Logging Convention

```typescript
import { logger } from '../utils/logger';

logger.info('Info message', { contextKey: value });
logger.error('Error message:', error);
logger.warn('Warning message');
logger.debug('Debug message');
```

### 2.7 Specific Service Patterns

**ProductService Example**:
- Handles Part CRUD, specifications, configurations, lifecycle
- Uses UOM (Unit of Measure) resolution helper methods
- Manages hierarchical relationships (parent-child parts)
- Includes cost and variant management

**MaterialService Example**:
- Material class hierarchy (parent-child relationships)
- Lot/batch tracking with genealogy
- Material properties and state transitions
- Split/merge operations with lineage tracking

**OperationService Example**:
- 5-level hierarchical operations
- Parameter management (inputs, outputs, set points)
- Resource specifications
- Validation and circular reference prevention

**ECOService Example** (Most Relevant to ICD):
- Full lifecycle management (create, update, status changes)
- Impact analysis calculation
- Affected document identification
- Task management and assignment
- History/audit trail maintenance
- Status transition validation

---

## 3. API ROUTE STRUCTURE & ORGANIZATION

### 3.1 Route File Organization
- **Location**: `/src/routes/`
- **Naming**: Resource-based naming (e.g., `products.ts`, `materials.ts`, `ecoRoutes.ts`)
- **Entry Point**: Routes are mounted in main Express app

### 3.2 Route Patterns

**Standard Route Structure**:
```typescript
import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { Service } from '../services/Service';

const router = express.Router();

// Initialize service
const service = new Service(prisma);

// Require authentication
router.use(authMiddleware);

// REST endpoints
router.get('/', async (req: Request, res: Response) => {
  try {
    const results = await service.getAll(filters);
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const result = await service.create(req.body);
    res.status(201).json({ success: true, data: result, message: 'Created' });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, error: 'Validation error', message: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create' });
    }
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await service.getById(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Not found' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const result = await service.update(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Update failed' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await service.delete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Delete failed' });
  }
});

export default router;
```

### 3.3 ECO Routes Example (Most Relevant to ICD)

**Endpoint Organization**:
```
ECO Management:
  GET    /api/v1/eco                      - List with filters
  POST   /api/v1/eco                      - Create new
  GET    /api/v1/eco/:id                  - Get details
  PUT    /api/v1/eco/:id                  - Update
  DELETE /api/v1/eco/:id                  - Cancel
  GET    /api/v1/eco/number/:ecoNumber    - Get by number
  GET    /api/v1/eco/my-ecos              - User's ECOs
  PUT    /api/v1/eco/:id/status           - Change status
  POST   /api/v1/eco/:id/complete         - Complete ECO

Impact Analysis:
  POST   /api/v1/eco/:id/analyze-impact   - Analyze impact
  GET    /api/v1/eco/:id/affected-documents
  POST   /api/v1/eco/:id/affected-documents
  PUT    /api/v1/eco/:id/affected-documents/:docId

Task Management:
  GET    /api/v1/eco/:id/tasks
  POST   /api/v1/eco/:id/tasks
  PUT    /api/v1/eco/tasks/:taskId
  POST   /api/v1/eco/tasks/:taskId/assign
  POST   /api/v1/eco/tasks/:taskId/complete
  GET    /api/v1/eco/tasks/my-tasks

Attachments:
  GET    /api/v1/eco/:id/attachments
  POST   /api/v1/eco/:id/attachments
  DELETE /api/v1/eco/attachments/:attachmentId

History & Audit:
  GET    /api/v1/eco/:id/history

CRB (Change Review Board):
  GET    /api/v1/eco/crb/configuration
  PUT    /api/v1/eco/crb/configuration
  POST   /api/v1/eco/:id/crb/schedule
  GET    /api/v1/eco/crb/agenda/:date
  POST   /api/v1/eco/crb/reviews/:reviewId/distribute
  POST   /api/v1/eco/crb/reviews/:reviewId/decision
  GET    /api/v1/eco/:id/crb/reviews
  GET    /api/v1/eco/crb/upcoming-meetings

Effectivity:
  POST   /api/v1/eco/:id/effectivity
  GET    /api/v1/eco/effectivity/version
  POST   /api/v1/eco/effectivity/check
  GET    /api/v1/eco/:id/transition-plan
```

### 3.4 Response Format Convention

**Success Response**:
```json
{
  "success": true,
  "data": { /* resource data */ },
  "count": 10,
  "message": "Operation successful"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Descriptive error message",
  "field": "fieldName" // Optional, for validation errors
}
```

**List Response with Pagination**:
```json
{
  "success": true,
  "data": [ /* array of resources */ ],
  "count": 100,
  "page": 1,
  "limit": 20,
  "total": 500
}
```

---

## 4. CHANGE MANAGEMENT & ECO WORKFLOW

### 4.1 ECO Lifecycle Management

**Status Workflow Implementation**:
```typescript
private async validateStatusTransition(currentStatus: ECOStatus, newStatus: ECOStatus): Promise<void> {
  const validTransitions: Record<ECOStatus, ECOStatus[]> = {
    [ECOStatus.REQUESTED]: [ECOStatus.UNDER_REVIEW, ECOStatus.REJECTED, ECOStatus.CANCELLED],
    [ECOStatus.UNDER_REVIEW]: [ECOStatus.PENDING_CRB, ECOStatus.REJECTED, ECOStatus.ON_HOLD],
    [ECOStatus.PENDING_CRB]: [ECOStatus.CRB_APPROVED, ECOStatus.REJECTED],
    [ECOStatus.CRB_APPROVED]: [ECOStatus.IMPLEMENTATION],
    [ECOStatus.IMPLEMENTATION]: [ECOStatus.VERIFICATION, ECOStatus.ON_HOLD],
    [ECOStatus.VERIFICATION]: [ECOStatus.COMPLETED, ECOStatus.IMPLEMENTATION],
    [ECOStatus.ON_HOLD]: [ECOStatus.UNDER_REVIEW, ECOStatus.IMPLEMENTATION, ECOStatus.CANCELLED],
    [ECOStatus.COMPLETED]: [],
    [ECOStatus.REJECTED]: [],
    [ECOStatus.CANCELLED]: []
  };

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new ECOStateError(
      `Invalid status transition from ${currentStatus} to ${newStatus}`,
      currentStatus
    );
  }
}
```

### 4.2 Impact Analysis

**Affected Document Identification**:
```typescript
async identifyAffectedDocuments(ecoId: string): Promise<ECOAffectedDocumentResponse[]> {
  const eco = await this.getECOById(ecoId);
  
  // Find WorkInstructions that use affected parts
  if (eco.affectedParts.length > 0) {
    const workInstructions = await this.prisma.workInstruction.findMany({
      where: { partId: { in: eco.affectedParts }, status: { not: 'ARCHIVED' } }
    });
    // Create affected document records
  }
  
  // Find SetupSheets for affected operations
  if (eco.affectedOperations.length > 0) {
    const setupSheets = await this.prisma.setupSheet.findMany({
      where: { operationId: { in: eco.affectedOperations } }
    });
    // Create affected document records
  }
}
```

**Impact Calculation**:
```typescript
// Operational Impact
- activeWorkOrdersAffected: number
- plannedWorkOrdersAffected: number
- inventoryImpact: { wipValue, finishedGoodsValue, rawMaterialsValue }
- productionCapacityImpact: percentage
- trainingRequired: boolean
- trainingHours: number

// Cost Impact
- implementationCost: number
- toolingCost: number
- equipmentCost: number
- trainingCost: number
- scrapReworkCost: number
- totalCost: number
- potentialSavings: number
- netBenefit: number
- paybackPeriodMonths: number

// Risk Assessment
- technicalRisk: 'LOW' | 'MEDIUM' | 'HIGH'
- scheduleRisk: 'LOW' | 'MEDIUM' | 'HIGH'
- costRisk: 'LOW' | 'MEDIUM' | 'HIGH'
- qualityRisk: 'LOW' | 'MEDIUM' | 'HIGH'
- overallRisk: 'LOW' | 'MEDIUM' | 'HIGH'
- mitigationActions: string[]
```

### 4.3 Task Management

**Task Lifecycle**:
```typescript
// Create task
await ecoService.createTask(ecoId, {
  taskName: string;
  description?: string;
  taskType: ECOTaskType;
  assignedToId?: string;
  assignedToName?: string;
  dueDate?: Date;
  prerequisiteTasks?: string[];
});

// Assign task
await ecoService.assignTask(taskId, userId, userName);

// Track task
- status: PENDING → IN_PROGRESS → COMPLETED or CANCELLED
- startedAt: DateTime
- completedAt: DateTime
- completionNotes: string
- verifiedById: string
- verifiedAt: DateTime
```

### 4.4 Audit Trail & History

**History Entry Creation**:
```typescript
async createHistoryEntry(ecoId: string, input: ECOHistoryCreateInput): Promise<void> {
  await this.prisma.eCOHistory.create({
    data: {
      ecoId,
      eventType: ECOEventType,
      eventDescription: string,
      fromStatus?: ECOStatus,
      toStatus?: ECOStatus,
      details?: Json,
      performedById: string,
      performedByName: string,
      performedByRole?: string,
      occurredAt: DateTime
    }
  });
}

// Event Types
ECOEventType = ECO_CREATED | STATUS_CHANGED | TASK_CREATED | TASK_COMPLETED | 
               ATTACHMENT_ADDED | ECO_COMPLETED | etc.
```

### 4.5 ECO-Workflow Integration

**ECOWorkflowIntegration Service**:
- Connects ECO system to workflow engine
- Auto-selects workflow based on ECO priority and cost
- Manages approval process automation
- Handles CRB review scheduling
- Creates implementation tasks based on ECO details

**Workflow Selection Logic**:
```typescript
private getWorkflowIdForECO(eco: any): string {
  if (eco.priority === ECOPriority.EMERGENCY) {
    return 'eco-emergency-workflow';
  }
  if (eco.estimatedCost > 100000) {
    return 'eco-high-cost-workflow';
  }
  return 'eco-standard-workflow';
}
```

---

## 5. MODEL RELATIONSHIP PATTERNS

### 5.1 Foreign Key Relationships

**Standard One-to-Many**:
```prisma
model Parent {
  id      String   @id @default(cuid())
  children Child[]
}

model Child {
  id       String   @id @default(cuid())
  parentId String
  parent   Parent   @relation(fields: [parentId], references: [id], onDelete: Cascade)
}
```

**One-to-One**:
```prisma
model Part {
  id              String    @id @default(cuid())
  replacementPartId String?
  replacementPart Part?     @relation("PartReplacement", fields: [replacementPartId], references: [id])
  replacedParts   Part[]    @relation("PartReplacement")
}
```

**Many-to-Many via Junction Table**:
```prisma
// Not directly used in schema, but common pattern
model Parent {
  id         String      @id @default(cuid())
  relations  Junction[]
}

model Junction {
  id        String  @id @default(cuid())
  parentId  String
  childId   String
  parent    Parent  @relation(fields: [parentId], references: [id])
  child     Child   @relation(fields: [childId], references: [id])
  
  @@unique([parentId, childId])
}

model Child {
  id        String      @id @default(cuid())
  relations Junction[]
}
```

### 5.2 Self-Referential Relationships

**Hierarchical Operations** (used in Operation model):
```prisma
model Operation {
  id                  String       @id @default(cuid())
  operationCode       String       @unique
  parentOperationId   String?
  level               Int          @default(1)
  
  parentOperation     Operation?   @relation("OperationHierarchy", fields: [parentOperationId], references: [id])
  childOperations     Operation[]  @relation("OperationHierarchy")
  
  @@index([parentOperationId])
  @@index([level])
}
```

**Hierarchical Materials** (used in MaterialClass):
```prisma
model MaterialClass {
  id              String           @id @default(cuid())
  className       String
  level           Int
  parentClassId   String?
  
  parentClass     MaterialClass?   @relation("MaterialClassHierarchy", fields: [parentClassId], references: [id])
  childClasses    MaterialClass[]  @relation("MaterialClassHierarchy")
}
```

**Self-Referential Many-to-Many** (used in ECORelation):
```prisma
model EngineeringChangeOrder {
  id              String       @id @default(cuid())
  ecoNumber       String       @unique
  
  relatedECOs     ECORelation[] @relation("ParentECO")
  parentRelations ECORelation[] @relation("RelatedECO")
}

model ECORelation {
  id            String                  @id @default(cuid())
  parentEcoId   String
  relatedEcoId  String
  relationType  ECORelationType
  
  parentEco     EngineeringChangeOrder  @relation("ParentECO", fields: [parentEcoId], references: [id], onDelete: Cascade)
  relatedEco    EngineeringChangeOrder  @relation("RelatedECO", fields: [relatedEcoId], references: [id], onDelete: Cascade)
  
  @@unique([parentEcoId, relatedEcoId])
  @@index([parentEcoId])
  @@index([relatedEcoId])
}
```

### 5.3 Array Fields (PostgreSQL)

**Used for simple relationships**:
```prisma
model EngineeringChangeOrder {
  affectedParts       String[]    // Array of Part IDs
  affectedOperations  String[]    // Array of Operation IDs
}

model ECOTask {
  prerequisiteTasks   String[]    // Array of Task IDs
}
```

### 5.4 JSON Fields

**Used for complex, variable data**:
```prisma
model EngineeringChangeOrder {
  impactAnalysis Json?           // Stores impact calculation results
}

model ECOCRBReview {
  members        Json            // Array of CRBMember objects
  actionItems    Json?           // Array of action item objects
}

model ProductConfiguration {
  attributes     Json?           // Variable configuration attributes
}
```

**Usage Pattern**:
```typescript
// Storing
await prisma.eco.update({
  where: { id: ecoId },
  data: {
    impactAnalysis: {
      totalDocumentsAffected: 5,
      documentsByType: { "WorkInstruction": 3 },
      operationalImpact: { /* nested object */ },
      generatedAt: new Date()
    }
  }
});

// Querying
const eco = await prisma.eco.findUnique({
  where: { id: ecoId },
  select: { impactAnalysis: true }
});
```

---

## 6. ARCHITECTURE PATTERNS FOR ICD SYSTEM

### 6.1 Recommended ICD Database Schema Structure

Based on the existing patterns, the ICD system should follow:

```prisma
// Main ICD Model
model InterfaceControlDocument {
  id                    String    @id @default(cuid())
  icdNumber             String    @unique              // e.g., "ICD-2024-001"
  title                 String
  description           String
  version               String    @default("1.0")
  status                ICDStatus @default(DRAFT)
  
  // Interface Definition
  interfaceType         InterfaceType               // ELECTRICAL, MECHANICAL, DATA, etc.
  sourceComponentId     String
  targetComponentId     String
  
  // Requirements & Specifications
  specifications        ProductSpecification[]      // Reuse existing pattern
  requirements          InterfaceRequirement[]
  testCriteria          String[]
  
  // Change Tracking
  ecoNumbers            String[]                    // Links to related ECOs
  affectedParts         String[]                    // Parts using this interface
  effectivityDate       DateTime?
  obsoleteDate          DateTime?
  
  // Relationships
  sourceComponent       Part      @relation("ICDSource", fields: [sourceComponentId], references: [id])
  targetComponent       Part      @relation("ICDTarget", fields: [targetComponentId], references: [id])
  relatedICDs           ICDRelation[] @relation("ParentICD")
  parentRelations       ICDRelation[] @relation("RelatedICD")
  
  // Audit
  createdBy             String
  approvedBy            String?
  approvedAt            DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  @@index([icdNumber])
  @@index([status])
  @@index([interfaceType])
  @@index([sourceComponentId])
  @@index([targetComponentId])
  @@map("interface_control_documents")
}

// Supporting tables
model InterfaceRequirement {
  id          String    @id @default(cuid())
  icdId       String
  reqNumber   String    // e.g., "REQ-001"
  title       String
  description String
  valueMin    Float?
  valueMax    Float?
  unitOfMeasure String?
  tolerance   Float?
  
  icd         InterfaceControlDocument @relation(fields: [icdId], references: [id], onDelete: Cascade)
  
  @@index([icdId])
  @@unique([icdId, reqNumber])
  @@map("interface_requirements")
}

model ICDRelation {
  id           String    @id @default(cuid())
  parentIcdId  String
  relatedIcdId String
  relationType String    // SUPERSEDES, REPLACES, RELATED_TO, DEPENDENT_ON
  
  parentIcd    InterfaceControlDocument @relation("ParentICD", fields: [parentIcdId], references: [id], onDelete: Cascade)
  relatedIcd   InterfaceControlDocument @relation("RelatedICD", fields: [relatedIcdId], references: [id], onDelete: Cascade)
  
  @@unique([parentIcdId, relatedIcdId])
  @@map("icd_relations")
}
```

### 6.2 ICD Service Implementation Pattern

```typescript
export class ICDService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // CRUD Operations
  async createICD(input: ICDCreateInput): Promise<ICDResponse> {
    // Validate input
    // Generate ICD number
    // Create record with all relationships
    // Create history entry
  }

  async getICDById(id: string): Promise<ICDResponse> {
    // Fetch with full relationships included
  }

  async updateICD(id: string, input: ICDUpdateInput): Promise<ICDResponse> {
    // Update and create history entry
  }

  async changeICDStatus(id: string, newStatus: ICDStatus): Promise<ICDResponse> {
    // Validate status transition
    // Update status
    // Create history entry
  }

  // Impact Analysis (similar to ECO)
  async analyzeICDImpact(icdId: string): Promise<ImpactAnalysis> {
    // Identify affected parts using this interface
    // Find related ECOs
    // Calculate impact on products
  }

  // Relationship Management
  async relateICDs(parentId: string, relatedId: string, type: string): Promise<void> {
    // Create relationship
  }

  // Validation
  async validateICDEffectivity(icdId: string): Promise<ValidationResult> {
    // Check if ICD is effective/applicable
  }

  // Private helpers
  private getICDInclude() { /* ... */ }
  private mapICDToResponse(icd: any): ICDResponse { /* ... */ }
  private validateICDInput(input: ICDCreateInput): void { /* ... */ }
}
```

### 6.3 ICD Routes Implementation Pattern

```typescript
const router = express.Router();
const icdService = new ICDService(prisma);

router.use(authMiddleware);

// Standard CRUD routes following existing patterns
router.get('/', async (req: Request, res: Response) => {
  // List ICDs with filters
});

router.post('/', async (req: Request, res: Response) => {
  // Create new ICD
});

router.get('/:id', async (req: Request, res: Response) => {
  // Get ICD details
});

router.put('/:id', async (req: Request, res: Response) => {
  // Update ICD
});

// ICD-specific endpoints
router.post('/:id/analyze-impact', async (req: Request, res: Response) => {
  // Impact analysis
});

router.post('/:id/relate', async (req: Request, res: Response) => {
  // Create relationship to another ICD
});

router.post('/:id/validate-effectivity', async (req: Request, res: Response) => {
  // Validate effectivity
});

router.get('/number/:icdNumber', async (req: Request, res: Response) => {
  // Get by ICD number
});
```

### 6.4 Integration with Part & BOM

**Part Model Enhancement**:
```prisma
model Part {
  // Existing fields...
  
  // Interface Control relationships
  icdsAsSource       InterfaceControlDocument[] @relation("ICDSource")
  icdsAsTarget       InterfaceControlDocument[] @relation("ICDTarget")
  applicableICDs     String[]                   // Array of ICD IDs applicable to this part
  
  // Existing indexes...
}
```

**BOMItem Enhancement**:
```prisma
model BOMItem {
  // Existing fields...
  
  // Interface Control requirements
  icdSpecifications  String[]                   // ICD numbers that apply to this BOM item
  interfaceNotes     String?                    // Interface-specific notes
  
  // Existing relationships...
}
```

### 6.5 Type Definition Pattern

```typescript
// src/types/icd.ts

export interface ICDCreateInput {
  title: string;
  description: string;
  interfaceType: InterfaceType;
  sourceComponentId: string;
  targetComponentId: string;
  specifications?: ProductSpecificationCreateInput[];
  requirements?: InterfaceRequirementCreateInput[];
  ecoNumbers?: string[];
  effectivityDate?: Date;
  createdById: string;
}

export interface ICDUpdateInput {
  title?: string;
  description?: string;
  specifications?: ProductSpecificationCreateInput[];
  requirements?: InterfaceRequirementCreateInput[];
  ecoNumbers?: string[];
}

export interface ICDResponse {
  id: string;
  icdNumber: string;
  title: string;
  description: string;
  version: string;
  status: ICDStatus;
  interfaceType: InterfaceType;
  sourceComponent: PartResponse;
  targetComponent: PartResponse;
  specifications: ProductSpecificationResponse[];
  requirements: InterfaceRequirementResponse[];
  relatedICDs: ICDRelationResponse[];
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface InterfaceRequirementCreateInput {
  reqNumber: string;
  title: string;
  description: string;
  valueMin?: number;
  valueMax?: number;
  unitOfMeasure?: string;
  tolerance?: number;
}

export interface InterfaceRequirementResponse {
  id: string;
  icdId: string;
  reqNumber: string;
  title: string;
  description: string;
  valueMin?: number;
  valueMax?: number;
  unitOfMeasure?: string;
  tolerance?: number;
}
```

---

## 7. TESTING PATTERNS & CONVENTIONS

### 7.1 Test File Organization
- **Location**: `/src/tests/services/`, `/src/tests/routes/`
- **Naming**: `*.test.ts` (e.g., `ServiceName.test.ts`)
- **Framework**: Jest with TypeScript support

### 7.2 Service Test Pattern

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new ServiceName(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up test data
  });

  describe('create', () => {
    it('should create a new resource', async () => {
      const input = { /* test data */ };
      const result = await service.create(input);
      expect(result.id).toBeDefined();
      expect(result.field).toBe(input.field);
    });

    it('should throw validation error for missing required field', async () => {
      const input = { /* incomplete data */ };
      await expect(service.create(input)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should return resource by ID', async () => {
      // Create test data
      // Fetch and verify
    });
  });
});
```

### 7.3 Environment Configuration
- **Test Database**: Uses TEST environment with DATABASE_URL
- **JWT Secret**: Passed via JWT_SECRET environment variable
- **No need to define DATABASE_URL or JWT_SECRET in command line when running tests**

---

## 8. AUTHENTICATION & AUTHORIZATION PATTERNS

### 8.1 Authentication Middleware

**JWT Token Pattern**:
```typescript
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token is required');
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || config.jwt.secret;
    
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      roles: decoded.roles,
      permissions: decoded.permissions,
      siteId: decoded.siteId
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

### 8.2 Route Protection Pattern

```typescript
// All routes require authentication
router.use(authMiddleware);

// Optional: Resource-level permission check
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const resource = await service.getById(req.params.id);
  
  if (resource.createdById !== req.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Continue with update
});
```

---

## 9. KEY ARCHITECTURAL RECOMMENDATIONS FOR ICD SYSTEM

### 9.1 Follow These Patterns Strictly

1. **Database Schema**
   - Use CUID for primary keys
   - Mark business identifiers as unique
   - Always include timestamps (createdAt, updatedAt)
   - Use PostgreSQL arrays for simple ID relationships
   - Use JSON fields for complex variable data
   - Add appropriate indexes for filtering/sorting
   - Use onDelete: Cascade for cleanup

2. **Service Layer**
   - Class-based services with Prisma injected
   - Separate validation, business logic, and data access
   - Use try-catch with custom error classes
   - Always log significant operations
   - Return mapped response objects, not raw Prisma models
   - Implement status transition validation

3. **API Routes**
   - RESTful endpoints (GET, POST, PUT, DELETE)
   - Consistent error responses (success/error flags)
   - Pagination support for list endpoints
   - Filter support with optional parameters
   - Status code conventions (201 for create, 400 for validation, 404 for not found)

4. **Relationships**
   - Use junction tables (via relations) for many-to-many
   - Use self-referential relations for hierarchies
   - Use arrays for simple ID collections
   - Use JSON for complex data structures
   - Always include appropriate indexes

5. **Change Tracking**
   - Create history/audit tables for important entities
   - Track status transitions with from/to values
   - Store who made changes and when
   - Log event descriptions for audit trails

### 9.2 Integration Points with Existing Systems

1. **With ECO System**
   - Link ICDs to ECOs via ecoNumbers array
   - Create history entries for ICD status changes
   - Use similar impact analysis approach
   - Share validation patterns

2. **With Part/BOM System**
   - Use Part relationships for source/target components
   - Add icdNumbers to BOMItem for interface-specific requirements
   - Leverage ProductSpecification model for requirements

3. **With Workflow System**
   - Use ECOWorkflowIntegration pattern as reference
   - Consider auto-triggering document updates when ICD changes
   - Manage approval workflows for ICD changes

4. **With Document Management**
   - Link to related work instructions that reference the interface
   - Track document versions related to ICD versions
   - Manage effectivity dates for documents

---

## 10. FILE STRUCTURE REFERENCE

```
/home/tony/GitHub/MachShop3/
├── prisma/
│   ├── schema.prisma                          # Main schema (300KB+)
│   └── modular/modules/
│       ├── parts-bom.prisma                   # BOM/Parts definitions
│       └── documented/                         # Documented versions
├── src/
│   ├── services/
│   │   ├── ECOService.ts                      # ECO lifecycle management
│   │   ├── ECOWorkflowIntegration.ts          # ECO-workflow integration
│   │   ├── ProductService.ts                  # Part/product management
│   │   ├── OperationService.ts                # Process operations
│   │   ├── MaterialService.ts                 # Material management
│   │   └── [131 other services]
│   ├── routes/
│   │   ├── ecoRoutes.ts                       # ECO API endpoints
│   │   ├── products.ts                        # Product API endpoints
│   │   ├── materials.ts                       # Material API endpoints
│   │   └── [80+ other route files]
│   ├── types/
│   │   ├── eco.ts                             # ECO type definitions
│   │   ├── workflow.ts
│   │   ├── quality.ts
│   │   └── [13 other type files]
│   ├── middleware/
│   │   ├── auth.ts                            # JWT authentication
│   │   ├── authorize.ts                       # RBAC authorization
│   │   ├── errorHandler.ts
│   │   └── [6 other middleware]
│   ├── lib/
│   │   └── database.ts                        # Prisma connection management
│   ├── utils/
│   │   ├── logger.ts                          # Logging utility
│   │   ├── uuidUtils.ts                       # UUID utilities
│   │   └── [other utilities]
│   └── tests/
│       ├── services/                          # Service unit tests
│       ├── routes/                            # Route integration tests
│       └── [test files]
└── package.json
```

---

## CONCLUSION

The MES codebase follows a well-established architectural pattern that is consistent across services and routes. When implementing the ICD system, strictly adhere to these patterns for:

- **Database**: CUID IDs, unique business identifiers, proper indexing, cascade deletes
- **Services**: Class-based with Prisma injection, error handling, logging, response mapping
- **Routes**: RESTful conventions, consistent response format, pagination, filtering
- **Relationships**: Foreign keys with proper cascading, self-referential hierarchies, arrays for collections
- **Change Management**: History tracking, audit trails, status validation, event logging

This consistency will ensure the ICD system integrates seamlessly with existing ECO, Part, and document management systems while maintaining code quality and maintainability.

