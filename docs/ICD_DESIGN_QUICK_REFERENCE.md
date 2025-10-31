# ICD System Design Quick Reference

## Architecture Overview

### 1. Database Layer
```
InterfaceControlDocument (Main Table)
├── id (CUID primary key)
├── icdNumber (UNIQUE business identifier)
├── status (DRAFT → REVIEW → APPROVED → ACTIVE → SUPERSEDED)
├── sourceComponentId → Part (foreign key)
├── targetComponentId → Part (foreign key)
├── InterfaceRequirement[] (one-to-many)
├── ICDRelation[] (self-referential many-to-many)
├── ecoNumbers[] (PostgreSQL array of related ECO IDs)
├── affectedParts[] (PostgreSQL array of Part IDs)
└── Timestamps (createdAt, updatedAt)

InterfaceRequirement
├── reqNumber (e.g., REQ-001)
├── title, description
├── valueMin, valueMax, tolerance
└── unitOfMeasure (foreign key lookup)

ICDRelation (Self-Referential)
├── parentIcdId → InterfaceControlDocument
├── relatedIcdId → InterfaceControlDocument
└── relationType (SUPERSEDES, REPLACES, RELATED_TO, DEPENDENT_ON)
```

### 2. Service Layer
```
ICDService
├── Constructor: constructor(prisma: PrismaClient)
├── CRUD Operations
│   ├── createICD(input: ICDCreateInput): Promise<ICDResponse>
│   ├── getICDById(id: string): Promise<ICDResponse>
│   ├── updateICD(id: string, input: ICDUpdateInput): Promise<ICDResponse>
│   └── deleteICD(id: string): Promise<void>
├── Lifecycle Management
│   ├── changeICDStatus(id: string, newStatus: ICDStatus): Promise<ICDResponse>
│   ├── approveICD(id: string, approvedBy: string): Promise<ICDResponse>
│   └── createICDRevision(id: string): Promise<ICDResponse>
├── Impact Analysis
│   ├── analyzeICDImpact(icdId: string): Promise<ImpactAnalysis>
│   ├── identifyAffectedParts(icdId: string): Promise<Part[]>
│   └── findRelatedECOs(icdId: string): Promise<ECO[]>
├── Relationships
│   ├── relateICDs(parentId: string, relatedId: string, type: string): Promise<void>
│   └── removeICDRelation(parentId: string, relatedId: string): Promise<void>
└── Queries
    ├── getICDs(filters?: ICDFilters): Promise<ICDResponse[]>
    └── getICDByNumber(icdNumber: string): Promise<ICDResponse>
```

### 3. API Routes
```
GET    /api/v1/icd                      List ICDs with filters
POST   /api/v1/icd                      Create new ICD
GET    /api/v1/icd/:id                  Get ICD details
PUT    /api/v1/icd/:id                  Update ICD
DELETE /api/v1/icd/:id                  Delete/Archive ICD
GET    /api/v1/icd/number/:icdNumber    Get by ICD number

Status & Lifecycle:
PUT    /api/v1/icd/:id/status           Change status
POST   /api/v1/icd/:id/approve          Approve ICD
POST   /api/v1/icd/:id/revision         Create revision

Impact Analysis:
POST   /api/v1/icd/:id/analyze-impact   Analyze impact
GET    /api/v1/icd/:id/affected-parts   Get affected parts
GET    /api/v1/icd/:id/related-ecos     Get related ECOs

Requirements:
GET    /api/v1/icd/:id/requirements     Get requirements
POST   /api/v1/icd/:id/requirements     Add requirement
PUT    /api/v1/icd/:id/requirements/:reqId
DELETE /api/v1/icd/:id/requirements/:reqId

Relationships:
POST   /api/v1/icd/:id/relate           Create relationship
DELETE /api/v1/icd/:id/relate/:relatedId

History:
GET    /api/v1/icd/:id/history          Audit trail
```

## Key Design Patterns

### Pattern 1: ICD Number Generation
```typescript
// Similar to ECO number generation
async generateICDNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastICD = await this.prisma.icd.findFirst({
    where: { icdNumber: { startsWith: `ICD-${year}-` } },
    orderBy: { createdAt: 'desc' }
  });
  
  const sequence = lastICD ? parseInt(lastICD.icdNumber.split('-').pop() || '0') + 1 : 1;
  return `ICD-${year}-${sequence.toString().padStart(4, '0')}`;
}
```

### Pattern 2: Status Transition Validation
```typescript
private async validateStatusTransition(current: ICDStatus, next: ICDStatus): Promise<void> {
  const validTransitions: Record<ICDStatus, ICDStatus[]> = {
    [ICDStatus.DRAFT]: [ICDStatus.REVIEW, ICDStatus.CANCELLED],
    [ICDStatus.REVIEW]: [ICDStatus.APPROVED, ICDStatus.DRAFT, ICDStatus.REJECTED],
    [ICDStatus.APPROVED]: [ICDStatus.ACTIVE],
    [ICDStatus.ACTIVE]: [ICDStatus.SUPERSEDED, ICDStatus.OBSOLETE],
    [ICDStatus.SUPERSEDED]: [],
    [ICDStatus.REJECTED]: [ICDStatus.DRAFT],
    [ICDStatus.CANCELLED]: [],
    [ICDStatus.OBSOLETE]: []
  };
  
  if (!validTransitions[current]?.includes(next)) {
    throw new ICDStateError(`Invalid transition from ${current} to ${next}`);
  }
}
```

### Pattern 3: Impact Analysis
```typescript
async analyzeICDImpact(icdId: string): Promise<ImpactAnalysis> {
  const icd = await this.getICDById(icdId);
  
  // Find affected parts
  const affectedParts = await this.identifyAffectedParts(icdId);
  
  // Find work orders, production schedules
  const affectedWorkOrders = await this.prisma.workOrder.findMany({
    where: { partId: { in: icd.affectedParts } }
  });
  
  // Find related BOM items
  const bomItems = await this.prisma.bomItem.findMany({
    where: { 
      OR: [
        { parentPartId: { in: icd.affectedParts } },
        { componentPartId: { in: icd.affectedParts } }
      ]
    }
  });
  
  // Find related ECOs
  const relatedEcos = await this.findRelatedECOs(icdId);
  
  return {
    icdId,
    affectedPartsCount: affectedParts.length,
    affectedWorkOrdersCount: affectedWorkOrders.length,
    affectedBOMItemsCount: bomItems.length,
    relatedECOsCount: relatedEcos.length,
    impactLevel: this.calculateImpactLevel(...),
    estimatedChangeComplexity: 'HIGH' | 'MEDIUM' | 'LOW',
    affectedParts,
    relatedECOs: relatedEcos.map(e => ({ id: e.id, ecoNumber: e.ecoNumber })),
    analysisDate: new Date()
  };
}
```

### Pattern 4: Relationship Management
```typescript
// Self-referential many-to-many with metadata
async relateICDs(parentId: string, relatedId: string, relationType: string): Promise<void> {
  // Prevent circular relationships
  if (parentId === relatedId) {
    throw new ICDValidationError('ICD cannot relate to itself');
  }
  
  // Check for existing reverse relationship
  const existing = await this.prisma.icdRelation.findUnique({
    where: {
      parentIcdId_relatedIcdId: {
        parentIcdId: relatedId,
        relatedIcdId: parentId
      }
    }
  });
  
  if (existing) {
    throw new ICDValidationError('Inverse relationship already exists');
  }
  
  await this.prisma.icdRelation.create({
    data: {
      parentIcdId,
      relatedIcdId,
      relationType
    }
  });
}
```

### Pattern 5: Integration with ECO System
```typescript
// Link ICD to ECO when ECO changes parts that use interface
async linkToECO(icdId: string, ecoId: string): Promise<void> {
  const icd = await this.getICDById(icdId);
  const eco = await prisma.eco.findUnique({ where: { id: ecoId } });
  
  // Check if ECO affects parts using this interface
  const intersection = icd.affectedParts.filter(p => eco.affectedParts.includes(p));
  
  if (intersection.length > 0) {
    // Update ICD with ECO reference
    await this.prisma.icd.update({
      where: { id: icdId },
      data: {
        ecoNumbers: { push: eco.ecoNumber }
      }
    });
  }
}
```

## Type Definitions Structure

```typescript
// src/types/icd.ts

export enum ICDStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  OBSOLETE = 'OBSOLETE'
}

export enum InterfaceType {
  ELECTRICAL = 'ELECTRICAL',
  MECHANICAL = 'MECHANICAL',
  DATA = 'DATA',
  HYDRAULIC = 'HYDRAULIC',
  PNEUMATIC = 'PNEUMATIC',
  THERMAL = 'THERMAL',
  OTHER = 'OTHER'
}

export interface ICDCreateInput {
  title: string;
  description: string;
  interfaceType: InterfaceType;
  sourceComponentId: string;
  targetComponentId: string;
  requirements?: InterfaceRequirementCreateInput[];
  ecoNumbers?: string[];
  affectedParts?: string[];
  effectivityDate?: Date;
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
  requirements: InterfaceRequirementResponse[];
  relatedICDs: ICDRelationResponse[];
  ecoNumbers: string[];
  affectedParts: string[];
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

export interface InterfaceRequirementResponse extends InterfaceRequirementCreateInput {
  id: string;
  icdId: string;
}
```

## Error Handling

```typescript
export class ICDError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ICDError';
  }
}

export class ICDValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ICDValidationError';
  }
}

export class ICDStateError extends Error {
  constructor(message: string, public currentState?: ICDStatus) {
    super(message);
    this.name = 'ICDStateError';
  }
}

export class ICDPermissionError extends Error {
  constructor(message: string, public userId?: string) {
    super(message);
    this.name = 'ICDPermissionError';
  }
}
```

## Testing Strategy

```typescript
describe('ICDService', () => {
  let service: ICDService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new ICDService(prisma);
  });

  describe('createICD', () => {
    it('should create ICD with auto-generated number', async () => {
      const input: ICDCreateInput = {
        title: 'Test Interface',
        interfaceType: InterfaceType.MECHANICAL,
        sourceComponentId: 'part1',
        targetComponentId: 'part2'
      };
      
      const result = await service.createICD(input);
      expect(result.icdNumber).toMatch(/^ICD-\d{4}-\d{4}$/);
    });

    it('should validate required fields', async () => {
      await expect(service.createICD({} as any))
        .rejects.toThrow(ICDValidationError);
    });
  });

  describe('statusTransition', () => {
    it('should allow DRAFT -> REVIEW transition', async () => {
      // Create in DRAFT status
      const icd = await service.createICD(...);
      const updated = await service.changeICDStatus(icd.id, ICDStatus.REVIEW);
      expect(updated.status).toBe(ICDStatus.REVIEW);
    });

    it('should prevent invalid transitions', async () => {
      const icd = await service.createICD(...);
      await expect(service.changeICDStatus(icd.id, ICDStatus.ACTIVE))
        .rejects.toThrow(ICDStateError);
    });
  });
});
```

## Integration Checkpoints

1. **With Part/BOM System**
   - Link InterfaceControlDocument.sourceComponentId/targetComponentId to Part.id
   - Add applicableICDs array to Part model
   - Add icdSpecifications array to BOMItem model

2. **With ECO System**
   - Link InterfaceControlDocument.ecoNumbers to EngineeringChangeOrder.ecoNumber
   - Track when ECO affects parts using ICD
   - Auto-update ICD status when related ECO is implemented

3. **With Document Management**
   - Link ICD to WorkInstruction documents
   - Track ICD version changes
   - Manage document effectivity by ICD version

4. **With Workflow Engine**
   - Approval workflow for ICD status changes
   - Notification system for ICD updates
   - Integration with change board review process

## Migration Path

1. **Phase 1**: Create base ICD schema and service
2. **Phase 2**: Implement CRUD operations and routes
3. **Phase 3**: Add impact analysis and relationship management
4. **Phase 4**: Integrate with ECO system
5. **Phase 5**: Connect to document management
6. **Phase 6**: Implement approval workflows
7. **Phase 7**: Add reporting and analytics

## File Structure to Create

```
src/
├── services/
│   └── ICDService.ts                    # Main ICD service (1000+ lines)
├── routes/
│   └── icdRoutes.ts                     # ICD API endpoints (400+ lines)
├── types/
│   └── icd.ts                           # ICD type definitions (300+ lines)
└── tests/
    ├── services/
    │   └── ICDService.test.ts           # Unit tests (400+ lines)
    └── routes/
        └── icdRoutes.test.ts            # Integration tests (300+ lines)

prisma/
└── schema.prisma                        # Add ICD models (~200 lines)

docs/
├── ICD_ARCHITECTURE_ANALYSIS.md         # This comprehensive guide
└── ICD_DESIGN_QUICK_REFERENCE.md        # This quick reference
```

---

## Key Files to Reference

- **ECO Implementation**: `/src/services/ECOService.ts` (full lifecycle management example)
- **ECO Routes**: `/src/routes/ecoRoutes.ts` (API structure example)
- **ECO Types**: `/src/types/eco.ts` (type definition patterns)
- **ECO Workflow Integration**: `/src/services/ECOWorkflowIntegration.ts` (integration pattern)
- **Product Service**: `/src/services/ProductService.ts` (part management reference)
- **Main Schema**: `/prisma/schema.prisma` (database structure reference)

