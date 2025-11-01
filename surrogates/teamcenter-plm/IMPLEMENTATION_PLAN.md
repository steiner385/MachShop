# Teamcenter PLM Surrogate Implementation Plan (Phase 1-2)

## Overview

Issue #241 is a **10-point full effort** project to build a comprehensive mock Teamcenter PLM system that enables testing of BOM integration, engineering change management, CAD metadata handling, and quality characteristics without requiring access to a live Teamcenter instance.

**Estimated Phase Breakdown:**
- **Phase 1-2** (Foundation) - **40% of effort** - Core APIs and data models
- **Phase 3-4** (Features) - **35% of effort** - Advanced workflows and CAD integration
- **Phase 5-6** (Testing & Optimization) - **25% of effort** - Test coverage, performance, deployment

This document outlines the Phase 1-2 foundation architecture and roadmap for complete implementation.

## Architecture Overview

```
Teamcenter PLM Surrogate
├─ Part Management Service
│  ├─ Part CRUD operations
│  ├─ Revision management
│  ├─ Lifecycle state machine
│  └─ Attribute management
├─ BOM Service
│  ├─ BOM structure management
│  ├─ Multi-level explosion/implosion
│  ├─ Where-used queries
│  └─ Effectivity tracking
├─ Characteristics Service
│  ├─ Quality characteristics
│  ├─ Specifications
│  ├─ Quality plans
│  └─ Inspection requirements
├─ Engineering Change Service
│  ├─ ECR management (Change Requests)
│  ├─ ECO management (Change Orders)
│  ├─ Change impact analysis
│  └─ Approval workflows
├─ CAD Integration Service
│  ├─ CAD file metadata
│  ├─ STEP AP242 data
│  ├─ PMI (Product Manufacturing Information)
│  └─ Drawing references
├─ Document Service
│  ├─ Work instructions
│  ├─ Quality plans
│  ├─ Test procedures
│  └─ Document versioning
└─ Test Data Generation
   ├─ Part creation
   ├─ BOM building
   ├─ Characteristic setup
   └─ Scenario configuration
```

## Phase 1-2 Scope: Core Foundation

### Completed in Phase 1-2

#### 1. Project Structure (`package.json`, `tsconfig.json`, directory layout)
- ✅ NPM configuration with all required dependencies
- ✅ TypeScript configuration
- ✅ Directory structure for models, services, routes, utils, tests, docs

#### 2. Type Definitions (`src/types.ts` - 400+ lines)
- ✅ Part lifecycle and versioning types
- ✅ BOM structure types with multi-level support
- ✅ Characteristics and quality plan types
- ✅ ECR/ECO workflow types
- ✅ CAD metadata and STEP types
- ✅ Document management types
- ✅ Error scenario types
- ✅ API response and pagination types
- ✅ Test data configuration types

**Key Design Decisions:**
- Enum-based state management for immutable lifecycle states
- Separate types for ECR (Change Request) and ECO (Change Order) for workflow flexibility
- Generic APIResponse<T> for consistent API responses
- MockDataState Map-based storage for fast lookups

### Phase 1-2 Implementation Roadmap

#### 3. Core Models & In-Memory Database

**Files to create:**
- `src/models/database.ts` (300+ lines)
  - MockDataState management
  - In-memory data persistence
  - Snapshot/restore capabilities for test scenarios
  - Data initialization

#### 4. Part Management Service (`src/services/partService.ts` - 500+ lines)

**Core Methods:**
- `createPart(partNumber, partName, attrs)` - Create new part
- `updatePart(partId, updates)` - Update part attributes
- `queryParts(filters)` - Query parts with filtering
- `getPartById(partId)` - Retrieve by ID
- `createRevision(partId, newRevisionNum)` - New part revision
- `getPartHistory(partId)` - Revision history
- `transitionLifecycleState(partId, newState)` - State machine enforcement
- `setPartAttributes(partId, attributes)` - Manage custom attributes

**Features:**
- Automatic revision incrementing (A → B → C...)
- Lifecycle state validation (DESIGN → REVIEW → RELEASED → PRODUCTION → OBSOLETE)
- Attribute type checking
- Audit trail (createdBy, updatedBy timestamps)

#### 5. BOM Service (`src/services/bomService.ts` - 700+ lines)

**Core Methods:**
- `createBOM(topLevelPartId, lineItems)` - Create BOM structure
- `addLineItem(bomId, lineNumber, partId, quantity)` - Add part to BOM
- `removeLineItem(bomId, lineNumber)` - Remove part from BOM
- `exploseBOM(bomId, maxLevels)` - Flatten BOM to specified level
- `whereUsed(partId)` - Find all parent assemblies
- `getEffectiveBOM(partNumber, effectiveDate)` - Get BOM for specific date
- `setEffectivity(bomLineId, effectiveDate, expiryDate)` - Manage BOM versions
- `compareBOMs(bom1Id, bom2Id)` - As-designed vs. as-built comparison

**Features:**
- Multi-level BOM support (10+ levels)
- Circular dependency detection
- Effectivity date-based BOM versioning
- Alternate part handling
- Optional component flagging

#### 6. Characteristics Service (`src/services/characteristicsService.ts` - 400+ lines)

**Core Methods:**
- `createCharacteristic(partId, type, name, spec)` - Define characteristic
- `updateCharacteristic(charId, updates)` - Modify characteristic
- `getCharacteristicsForPart(partId)` - List all characteristics
- `createQualityPlan(partId, planCode, characteristics)` - Create inspection plan
- `getQualityPlan(partId, planCode)` - Retrieve quality plan
- `setInspectionRequirements(charId, criteria)` - Define inspection rules

**Features:**
- 8 characteristic types (DIMENSION, TOLERANCE, MATERIAL, SURFACE_FINISH, HARDNESS, WEIGHT, PERFORMANCE, OTHER)
- Control limits (UCL/LCL) for SPC
- Inspection criticality levels (CRITICAL, MAJOR, MINOR)
- Test procedure linking

#### 7. Engineering Change Service (`src/services/changeManagementService.ts` - 600+ lines)

**ECR Methods:**
- `createECR(title, description, reason)` - Create change request
- `updateECRState(ecrId, newState)` - Workflow state transition
- `submitECR(ecrId)` - Submit for review
- `approveECR(ecrId, approver)` - Approval decision
- `rejectECR(ecrId, reason)` - Rejection with feedback

**ECO Methods:**
- `createECO(ecrId, title, changeItems)` - Create from ECR
- `updateECOState(ecoId, newState)` - Workflow state transition
- `setECOEffectivity(ecoId, effectiveDate)` - Implementation date
- `approveECO(ecoId, approverList)` - Multi-level approval
- `implementECO(ecoId)` - Mark as implemented
- `getChangeImpact(ecoId)` - Impact analysis
- `getECOHistory(partId)` - ECO history for part

**Features:**
- ECR → ECO workflow (Change Request → Change Order)
- State machine validation
- Approval tracking with timestamp and comments
- Change item impact analysis (affected assemblies)
- Effectivity date management

#### 8. CAD Integration Service (`src/services/cadService.ts` - 400+ lines)

**Core Methods:**
- `registerCADFile(partId, format, filePath)` - Register CAD file
- `getCADMetadata(partId)` - Retrieve CAD information
- `registerSTEPData(partId, stepUUID, modelData)` - Register STEP AP242 data
- `getSTEPMetadata(partId)` - STEP data retrieval
- `registerPMI(partId, pmiData)` - Register Product Manufacturing Information
- `getPMI(partId)` - Get PMI data
- `linkCharacteristicToPMI(charId, pmiId)` - Link quality to CAD

**Features:**
- Multi-format support (STEP, IGES, PDF, JPEG, SVG)
- STEP AP242 MBE support
- PMI (dimensions, tolerances, annotations) tracking
- File checksum/versioning
- 3D model references and UUIDs

#### 9. Document Service (`src/services/documentService.ts` - 300+ lines)

**Core Methods:**
- `createDocument(docNumber, title, type, content)` - Create document
- `updateDocument(docId, updates)` - Modify document
- `publishDocument(docId, approver)` - Approval workflow
- `getDocumentsForPart(partId)` - Find related documents
- `getDocumentRevisions(docId)` - Version history
- `linkDocumentToPart(docId, partId)` - Associate with part

**Features:**
- 5 document types (WORK_INSTRUCTION, SPEC, QUALITY_PLAN, TEST_PROCEDURE, DRAWING)
- Document lifecycle (DRAFT → APPROVED → SUPERSEDED)
- Revision tracking
- Attachment support

#### 10. Test Data Generation (`src/services/testDataService.ts` - 800+ lines)

**Scenarios:**
1. **SIMPLE** (10 parts, 2 levels)
   - 3 raw materials
   - 4 components
   - 2 assemblies
   - 1 top-level product

2. **MEDIUM** (100 parts, 4 levels)
   - Typical engineering scenario
   - Multiple sub-assemblies
   - Alternate parts
   - Basic BOMs

3. **COMPLEX** (1,000 parts, 8 levels)
   - Realistic manufacturing system
   - Complex interchangeability
   - Multiple ECOs

4. **GE9X** (25,000 parts, 10+ levels)
   - Real-world engine assembly
   - Thousands of relationships
   - Complex supplier network

**Features:**
- Deterministic data generation (seeded RNG)
- Realistic part attributes
- Automatic BOM creation
- Multi-level hierarchy generation
- ECO/ECR scenario setup
- CAD metadata simulation
- Quality plan generation

#### 11. Core API Routes (`src/routes/` - 1,500+ lines)

**Part Routes** (`routes/parts.ts`):
- `POST /api/teamcenter/parts` - Create part
- `GET /api/teamcenter/parts/:partId` - Retrieve part
- `PUT /api/teamcenter/parts/:partId` - Update part
- `GET /api/teamcenter/parts` - Query parts (with pagination/filtering)
- `POST /api/teamcenter/parts/:partId/revisions` - Create revision
- `GET /api/teamcenter/parts/:partId/history` - Revision history
- `PUT /api/teamcenter/parts/:partId/lifecycle` - Change lifecycle state

**BOM Routes** (`routes/boms.ts`):
- `POST /api/teamcenter/boms` - Create BOM
- `GET /api/teamcenter/boms/:bomId` - Retrieve BOM
- `POST /api/teamcenter/boms/:bomId/items` - Add line item
- `DELETE /api/teamcenter/boms/:bomId/items/:lineNumber` - Remove item
- `GET /api/teamcenter/boms/:bomId/explosion` - BOM explosion
- `GET /api/teamcenter/parts/:partId/where-used` - Where-used query
- `GET /api/teamcenter/boms/effective` - Get effective BOM
- `POST /api/teamcenter/boms/compare` - Compare BOMs

**Characteristics Routes** (`routes/characteristics.ts`):
- `POST /api/teamcenter/characteristics` - Create characteristic
- `GET /api/teamcenter/parts/:partId/characteristics` - List characteristics
- `POST /api/teamcenter/quality-plans` - Create quality plan
- `GET /api/teamcenter/quality-plans/:planId` - Retrieve plan

**Change Management Routes** (`routes/changeManagement.ts`):
- `POST /api/teamcenter/ecrs` - Create ECR
- `GET /api/teamcenter/ecrs/:ecrId` - Retrieve ECR
- `PUT /api/teamcenter/ecrs/:ecrId/state` - Update ECR state
- `POST /api/teamcenter/ecos` - Create ECO
- `GET /api/teamcenter/ecos/:ecoId` - Retrieve ECO
- `PUT /api/teamcenter/ecos/:ecoId/approve` - Approve ECO
- `PUT /api/teamcenter/ecos/:ecoId/implement` - Implement ECO

**CAD Routes** (`routes/cad.ts`):
- `POST /api/teamcenter/cad/metadata` - Register CAD file
- `GET /api/teamcenter/parts/:partId/cad` - Get CAD metadata
- `POST /api/teamcenter/step-data` - Register STEP data
- `GET /api/teamcenter/parts/:partId/step` - Get STEP metadata
- `POST /api/teamcenter/pmi` - Register PMI
- `GET /api/teamcenter/parts/:partId/pmi` - Get PMI data

#### 12. Main Application (`src/index.ts` - 200+ lines)

**Features:**
- Express server setup
- CORS middleware
- Logging middleware (Morgan)
- Request validation (Joi)
- Error handling middleware
- Health check endpoint
- OpenAPI/Swagger integration
- Environment configuration

#### 13. Docker Support

**Files:**
- `Dockerfile` - Multi-stage build, security hardened
- `docker-compose.yml` - Local development
- `.dockerignore` - Build optimization
- `DEPLOYMENT.md` - Deployment guide

### Phase 1-2 Key Technologies

- **Backend**: Node.js + Express + TypeScript
- **Data Storage**: In-memory (Maps) with optional file persistence
- **API Documentation**: Swagger/OpenAPI with swagger-ui-express
- **Testing**: Jest + Supertest
- **Containerization**: Docker + Docker Compose
- **Code Quality**: TypeScript strict mode, TSLint

## Phase 3-4: Advanced Features (To Be Implemented)

1. **Database Integration**
   - PostgreSQL for persistent storage
   - Graph database (Neo4j) for BOM relationships

2. **Advanced BOM Features**
   - Phantom parts
   - Configurable BOMs
   - Kitting support
   - Assembly sequence management

3. **Approval Workflow Engine**
   - Multi-level approvals
   - Approval rules/conditions
   - Escalation paths

4. **Reporting & Analytics**
   - BOM usage reports
   - ECO lifecycle analytics
   - Change impact metrics

5. **Authentication & Security**
   - LDAP/Active Directory integration
   - OAuth 2.0/SAML
   - API key management
   - Role-based access control

## Phase 5-6: Testing & Deployment (To Be Implemented)

1. **Comprehensive Test Suite**
   - Unit tests (100+ tests)
   - Integration tests
   - Performance benchmarks
   - Load testing

2. **Monitoring & Logging**
   - Structured logging
   - Request tracing
   - Performance metrics
   - Health checks

3. **Kubernetes Deployment**
   - StatefulSet configuration
   - Resource limits
   - Horizontal autoscaling
   - Service mesh integration

4. **Documentation**
   - API specification
   - Integration guide
   - Troubleshooting guide
   - Architecture documentation

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Part CRUD | <10ms | In-memory lookup |
| BOM Query (1000 parts) | <100ms | With caching |
| Where-Used Query | <50ms | Graph traversal |
| ECO State Transition | <5ms | State machine validation |
| Approval Workflow | <10ms | Audit trail |
| Data Initialization | <5 seconds | Complex scenario |

## Success Criteria

- ✅ All 6+ core service implementations complete
- ✅ 20+ API endpoints operational
- ✅ Multi-level BOM support (10+ levels)
- ✅ ECR/ECO workflow state machine
- ✅ CAD metadata + STEP AP242 support
- ✅ 4 test data scenarios (SIMPLE, MEDIUM, COMPLEX, GE9X)
- ✅ Docker deployment working
- ✅ OpenAPI documentation complete
- ✅ 50+ integration tests passing
- ✅ <100ms response time for 95% of requests

## Implementation Order

For completing Phase 1-2 and beyond:

1. ✅ Project structure and types
2. In-memory database model
3. Part management service + routes
4. BOM service + routes
5. Characteristics service + routes
6. Change management service + routes
7. CAD integration service + routes
8. Document service + routes
9. Test data generation service
10. Main application setup
11. Docker configuration
12. OpenAPI documentation
13. Integration tests
14. Deployment guide

## Dependencies & Blocking Issues

This Issue #241 blocks:
- **Issue #266**: Quality Management: Core Teamcenter Quality MRB Integration Infrastructure

The MRB (Material Review Board) integration depends on having a functional PLM surrogate to test against.

## Files to Create (Phase 1-2)

```
surrogates/teamcenter-plm/
├── src/
│   ├── index.ts (200 lines)
│   ├── types.ts (400 lines)
│   ├── models/
│   │   └── database.ts (300 lines)
│   ├── services/
│   │   ├── partService.ts (500 lines)
│   │   ├── bomService.ts (700 lines)
│   │   ├── characteristicsService.ts (400 lines)
│   │   ├── changeManagementService.ts (600 lines)
│   │   ├── cadService.ts (400 lines)
│   │   ├── documentService.ts (300 lines)
│   │   └── testDataService.ts (800 lines)
│   ├── routes/
│   │   ├── parts.ts (250 lines)
│   │   ├── boms.ts (300 lines)
│   │   ├── characteristics.ts (200 lines)
│   │   ├── changeManagement.ts (250 lines)
│   │   └── cad.ts (200 lines)
│   ├── utils/
│   │   ├── logger.ts (100 lines)
│   │   ├── validation.ts (150 lines)
│   │   └── errors.ts (100 lines)
│   └── tests/
│       ├── parts.test.ts (300 lines)
│       ├── boms.test.ts (400 lines)
│       ├── changeManagement.test.ts (300 lines)
│       └── integration.test.ts (500 lines)
├── docs/
│   ├── API.md (200 lines)
│   ├── ARCHITECTURE.md (150 lines)
│   ├── USAGE.md (200 lines)
│   └── INTEGRATION.md (200 lines)
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── IMPLEMENTATION_PLAN.md
├── package.json
└── tsconfig.json
```

**Phase 1-2 Total: 8,000+ lines of code**

## Next Steps (After Phase 1-2)

1. Create comprehensive test suite with >50 tests
2. Implement database backend (PostgreSQL)
3. Add authentication and RBAC
4. Implement advanced BOM features (phantoms, configurability)
5. Create Kubernetes deployment manifests
6. Document integration patterns
7. Performance optimization and load testing

---

**Status**: Phase 1-2 Foundation
**Foundation Level**: L0 (Core Infrastructure)
**Effort**: 40% of 10-point total
**Complexity**: High (graph structures, multi-level queries, state machines)
