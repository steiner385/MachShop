# ICD (Interface Control Document) System - Implementation Guide

## Overview

This guide provides a complete roadmap for implementing an Interface Control Document (ICD) system within the MES (Manufacturing Execution System) codebase. The implementation should follow the established architectural patterns found in the ECO (Engineering Change Order) system.

## Documentation Files

This analysis provides three complementary documents:

### 1. **ICD_ARCHITECTURE_ANALYSIS.md** (41KB)
Comprehensive deep-dive analysis covering:
- Database schema structure and patterns (Section 1)
- Service layer conventions and patterns (Section 2)
- API route organization (Section 3)
- Change management and ECO workflows (Section 4)
- Model relationship patterns (Section 5)
- ICD system architecture recommendations (Section 6)
- Testing patterns and conventions (Section 7)
- Authentication & authorization patterns (Section 8)
- Key architectural recommendations (Section 9)
- File structure reference (Section 10)

**When to use:** Use this when you need detailed understanding of how the codebase works, want to see complete code examples, or need to understand why specific patterns exist.

### 2. **ICD_DESIGN_QUICK_REFERENCE.md** (14KB)
Quick reference guide with:
- Architecture overview (database, service, routes)
- Key design patterns (code templates)
- Type definitions structure
- Error handling patterns
- Testing strategy examples
- Integration checkpoints
- Migration path (7 phases)
- File structure to create
- Key files to reference

**When to use:** Use this when you're actively implementing and need quick examples, templates, or reminders of how to structure code.

### 3. **ARCHITECTURE_ANALYSIS_SUMMARY.txt** (15KB)
Executive summary containing:
- Key findings about the codebase
- Database schema patterns to follow
- Service layer patterns to follow
- API route patterns to follow
- Change management patterns
- Relationship patterns
- Design recommendations for ICD
- Testing patterns
- Architectural principles
- File reference locations
- Immediate next steps

**When to use:** Use this as a quick reference card or to share findings with the team. Best for understanding high-level principles without diving into details.

## Implementation Checklist

### Phase 1: Database Schema (Week 1)
- [ ] Create InterfaceControlDocument model in Prisma schema
  - CUID id, unique icdNumber
  - Status field with enum
  - sourceComponentId/targetComponentId (Part foreign keys)
  - Arrays for ecoNumbers and affectedParts
  - Timestamps (createdAt, updatedAt)
  - Approval fields (approvedBy, approvedAt)
  
- [ ] Create InterfaceRequirement model
  - One-to-many relationship to ICD
  - Fields: reqNumber, title, description, valueMin, valueMax, tolerance
  - Unique constraint on (icdId, reqNumber)
  
- [ ] Create ICDRelation model
  - Self-referential many-to-many to ICD
  - Fields: parentIcdId, relatedIcdId, relationType
  - Unique constraint on (parentIcdId, relatedIcdId)
  
- [ ] Add ICD-related fields to Part model
  - icdsAsSource: InterfaceControlDocument[]
  - icdsAsTarget: InterfaceControlDocument[]
  - applicableICDs: String[]
  
- [ ] Add ICD-related fields to BOMItem model
  - icdSpecifications: String[]
  - interfaceNotes: String?
  
- [ ] Create database migration
  - Run: `npx prisma migrate dev --name add_icd_system`
  - Verify tables created in database

### Phase 2: Type Definitions (Week 1)
- [ ] Create `/src/types/icd.ts`
  - Enums: ICDStatus, InterfaceType
  - Interfaces: ICDCreateInput, ICDUpdateInput, ICDResponse
  - Interfaces: InterfaceRequirementCreateInput, InterfaceRequirementResponse
  - Error classes: ICDError, ICDValidationError, ICDStateError, ICDPermissionError

### Phase 3: Service Implementation (Week 2)
- [ ] Create `/src/services/ICDService.ts`
  - Constructor with Prisma injection
  - CRUD methods: create, getById, getAll, update, delete
  - Status management: changeICDStatus, validateStatusTransition
  - Impact analysis: analyzeICDImpact, identifyAffectedParts, findRelatedECOs
  - Relationships: relateICDs, removeICDRelation
  - History: createHistoryEntry, getICDHistory
  - Utilities: generateICDNumber, mapICDToResponse
  
- [ ] Implement all error handling
  - Custom error classes with appropriate codes
  - Validation error messages with field names
  - State error messages with current state
  - Permission error checks
  
- [ ] Add logging throughout service
  - Log successful operations
  - Log errors with context
  - Use logger utility from utils/logger

### Phase 4: API Routes (Week 2)
- [ ] Create `/src/routes/icdRoutes.ts`
  - CRUD endpoints (GET, POST, PUT, DELETE)
  - Status management endpoints
  - Impact analysis endpoints
  - Requirements endpoints
  - Relationship endpoints
  - History endpoint
  
- [ ] Implement authentication
  - Use authMiddleware on all routes
  - Extract user info from req.user
  
- [ ] Implement error handling
  - Separate handling for validation errors (400)
  - Separate handling for not-found errors (404)
  - Proper status codes for all scenarios
  
- [ ] Follow response format conventions
  - Use { success: true, data: {...} } format
  - Include count in list responses
  - Include message in success responses

### Phase 5: Unit Tests (Week 3)
- [ ] Create `/src/tests/services/ICDService.test.ts`
  - Test CRUD operations
  - Test status transitions
  - Test validation errors
  - Test relationship management
  - Test impact analysis
  - Test history creation
  
- [ ] Ensure >80% code coverage
  - Test happy paths
  - Test error cases
  - Test edge cases

### Phase 6: Integration Tests (Week 3)
- [ ] Create `/src/tests/routes/icdRoutes.test.ts`
  - Test all GET endpoints
  - Test POST (create) endpoints
  - Test PUT (update) endpoints
  - Test DELETE endpoints
  - Test authentication/authorization
  - Test error responses
  
- [ ] Test API response formats
  - Verify success response structure
  - Verify error response structure
  - Verify status codes

### Phase 7: Integration with ECO System (Week 4)
- [ ] Create `ICDWorkflowIntegration` service
  - Auto-link ICDs to related ECOs
  - Create history entries when ECO affects ICD
  - Update ICD status when related ECO is implemented
  
- [ ] Update ECOService
  - Check for affected ICDs when creating/updating ECO
  - Link ECO to ICDs that affect same parts
  
- [ ] Create integration tests
  - Test ECO-ICD relationships
  - Test automatic linking
  - Test impact on both systems

### Phase 8: Integration with Document Management (Week 4)
- [ ] Link ICDs to WorkInstructions
  - Find instructions that reference affected parts
  - Track which instructions implement which ICDs
  
- [ ] Track document versions
  - Link document versions to ICD versions
  - Manage effectivity by ICD status

### Phase 9: Documentation & Approval (Week 5)
- [ ] Create user documentation
- [ ] Set up approval workflows
- [ ] Configure change board review process
- [ ] Set up notifications

## Reference Implementation

The ECO (Engineering Change Order) system is the closest existing implementation:

**Service Reference**: `/src/services/ECOService.ts` (1055 lines)
- Lifecycle management (create, update, status change)
- Impact analysis (identify affected documents)
- Task management (create, assign, complete)
- Attachment management
- History/audit trail
- Query with filters

**Routes Reference**: `/src/routes/ecoRoutes.ts` (400+ lines)
- Standard CRUD endpoints
- Status change endpoint
- Impact analysis endpoint
- Task management endpoints
- Attachment endpoints
- History endpoint

**Types Reference**: `/src/types/eco.ts` (400+ lines)
- Input/output interfaces
- Filter interfaces
- Error types
- Response types

**Workflow Integration**: `/src/services/ECOWorkflowIntegration.ts` (528 lines)
- Connects to workflow engine
- Auto-selects workflow based on priority/cost
- Manages approval process
- Handles CRB review scheduling
- Creates implementation tasks

## Database Pattern Reference

Key patterns to follow (from `/prisma/schema.prisma`):

```prisma
// Primary key pattern (from Part, ECO, Operation models)
id                String  @id @default(cuid())
icdNumber         String  @unique

// Relationship pattern (from Part, BOMItem)
sourceComponent   Part    @relation("ICDSource", fields: [sourceComponentId], references: [id])
targetComponent   Part    @relation("ICDTarget", fields: [targetComponentId], references: [id])

// Self-referential hierarchy (from Operation, MaterialClass)
parentICD         ICD?    @relation("ICDHierarchy", fields: [parentICDId], references: [id])
childICDs         ICD[]   @relation("ICDHierarchy")

// Self-referential many-to-many (from ECO)
relatedICDs       ICDRelation[] @relation("ParentICD")
parentRelations   ICDRelation[] @relation("RelatedICD")

// Array fields (from ECO)
ecoNumbers        String[]
affectedParts     String[]

// JSON fields (from ECO)
impactAnalysis    Json?

// Timestamps (from all models)
createdAt         DateTime @default(now())
updatedAt         DateTime @updatedAt

// Indexing (from all models)
@@index([icdNumber])
@@index([status])
@@index([sourceComponentId])
```

## Testing Pattern Reference

```typescript
// From ECOService tests
describe('ICDService', () => {
  let service: ICDService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new ICDService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('CRUD operations', () => {
    it('should create ICD with auto-generated number', async () => {
      const result = await service.createICD(validInput);
      expect(result.icdNumber).toMatch(/^ICD-\d{4}-\d{4}$/);
    });

    it('should validate required fields', async () => {
      await expect(service.createICD(invalidInput))
        .rejects.toThrow(ICDValidationError);
    });
  });

  describe('status transitions', () => {
    it('should allow valid transitions', async () => {
      const icd = await service.createICD(validInput);
      const updated = await service.changeICDStatus(icd.id, ICDStatus.REVIEW);
      expect(updated.status).toBe(ICDStatus.REVIEW);
    });

    it('should prevent invalid transitions', async () => {
      const icd = await service.createICD(validInput);
      await expect(service.changeICDStatus(icd.id, ICDStatus.ACTIVE))
        .rejects.toThrow(ICDStateError);
    });
  });
});
```

## Key Success Criteria

1. **Code Quality**
   - Follows all existing patterns consistently
   - 100% TypeScript with strict mode
   - Error handling for all paths
   - Comprehensive logging

2. **Test Coverage**
   - Unit tests with >80% coverage
   - Integration tests for all routes
   - Edge case testing
   - Error scenario testing

3. **Documentation**
   - Inline code comments
   - Type definitions with JSDoc
   - README for ICD system
   - API documentation

4. **Integration**
   - Seamlessly integrates with existing systems
   - ECO system integration tested
   - Part/BOM integration tested
   - Document management integration tested

5. **Performance**
   - Database queries optimized with proper indexing
   - No N+1 query problems
   - Pagination support for large datasets
   - Efficient impact analysis

## Common Pitfalls to Avoid

1. **Don't** deviate from existing patterns
   - Always use CUID for IDs
   - Always include timestamps
   - Always use proper indexes

2. **Don't** skip validation
   - Validate at service layer
   - Validate at route layer
   - Validate state transitions

3. **Don't** ignore error handling
   - Create specific error classes
   - Use proper HTTP status codes
   - Include meaningful error messages

4. **Don't** forget audit trails
   - Create history entries for all changes
   - Track who made changes and when
   - Record why changes were made

5. **Don't** skip testing
   - Test CRUD operations
   - Test validations
   - Test relationships
   - Test error cases

## Resources

- **Prisma Documentation**: https://www.prisma.io/docs/
- **Express.js Guide**: https://expressjs.com/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Jest Testing**: https://jestjs.io/

## Questions & Clarifications

When implementing, refer to these files in order:

1. Start with: `ICD_DESIGN_QUICK_REFERENCE.md` for quick patterns
2. Reference: `ICD_ARCHITECTURE_ANALYSIS.md` for detailed explanations
3. Check: `ARCHITECTURE_ANALYSIS_SUMMARY.txt` for high-level principles
4. Review actual code: ECOService, ProductService, etc. as examples

## Next Steps

1. Read the three documentation files in provided order
2. Review ECOService.ts and ecoRoutes.ts in detail
3. Create database schema following Phase 1
4. Implement ICDService following Phase 3
5. Create routes following Phase 4
6. Add tests following Phase 5-6
7. Integrate with other systems following Phase 7-8

---

Last Updated: October 31, 2025
For questions or clarifications, refer to the comprehensive analysis documents.
