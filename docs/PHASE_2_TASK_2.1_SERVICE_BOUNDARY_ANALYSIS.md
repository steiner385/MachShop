# Phase 2, Task 2.1: Service Boundary Analysis
## Microservices Decomposition Strategy

**Document Version:** 1.0
**Date:** October 18, 2025
**Status:** In Progress
**Phase:** 2 - Microservices Migration
**Task:** 2.1 - Service Boundary Analysis (Week 1 of 1)

---

## Executive Summary

This document provides a comprehensive analysis of the current monolithic MES application and proposes a decomposition strategy into 8 independently deployable microservices based on Domain-Driven Design (DDD) bounded contexts and ISA-95 functional alignment.

### Proposed Microservices Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Kong)                        │
│                    Port: 8080 (External)                     │
└───────────┬─────────────────────────────────────────────────┘
            │
    ┌───────┴──────────────────────────────────────────────┐
    │                                                       │
┌───▼────┐  ┌────────┐  ┌─────────┐  ┌─────────────┐      │
│  Auth  │  │  Work  │  │ Quality │  │  Material   │      │
│Service │  │ Order  │  │ Service │  │   Service   │      │
│:3008   │  │Service │  │  :3002  │  │    :3003    │      │
└────────┘  │ :3001  │  └─────────┘  └─────────────┘      │
            └────────┘                                      │
┌────────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│Traceability│  │ Resource │  │Reporting │  │Integration│ │
│  Service   │  │ Service  │  │ Service  │  │  Service  │ │
│   :3004    │  │  :3005   │  │  :3006   │  │   :3007   │ │
└────────────┘  └──────────┘  └──────────┘  └───────────┘ │
                                                            │
    ┌───────────────────────────────────────────────────────┘
    │
┌───▼────────────────────────────────────────────────┐
│           Message Bus (Kafka/RabbitMQ)             │
│  Topics: work-orders, quality, materials, etc.     │
└────────────────────────────────────────────────────┘
```

---

## Part 1: Current Codebase Analysis

### Current Monolithic Structure

**Total Components:**
- **Routes:** 28 route files
- **Services:** 41 service files
- **API Endpoints:** 150+ RESTful endpoints
- **Database Models:** 35+ Prisma models
- **Lines of Service Code:** 10,442 lines

### Route Inventory

```
Current Routes (28 files):
├── auth.ts                      ← Authentication
├── b2mRoutes.ts                ← ERP Integration
├── cmmRoutes.ts                ← CMM Integration
├── covalentRoutes.ts           ← Covalent Integration
├── dashboard.ts                ← Reporting/Analytics
├── equipment.ts                ← Resource Management
├── fai.ts                      ← Quality/FAI
├── historianRoutes.ts          ← Equipment Integration
├── indysoftRoutes.ts           ← Indysoft Integration
├── integrationRoutes.ts        ← Integration Management
├── l2EquipmentRoutes.ts        ← Equipment Integration
├── materials.ts                ← Material Management
├── maximoRoutes.ts             ← Maximo Integration
├── personnel.ts                ← Resource Management
├── predatorDNCRoutes.ts        ← DNC Integration
├── predatorPDMRoutes.ts        ← PDM Integration
├── processSegments.ts          ← Resource Management
├── productionSchedules.ts      ← Work Order Management
├── products.ts                 ← Resource Management
├── quality.ts                  ← Quality Management
├── serialization.ts            ← Material/Traceability
├── shopFloorConnectRoutes.ts   ← Shop Floor Integration
├── signatures.ts               ← Quality/Signatures
├── traceability.ts             ← Traceability
├── upload.ts                   ← Document Management
├── workInstructions.ts         ← Work Order/Documents
├── workOrderExecution.ts       ← Work Order Management
└── workOrders.ts               ← Work Order Management
```

### Service Inventory

```
Current Services (41 files):
├── B2MMessageBuilder.ts                    ← Integration
├── CMMAdapter.ts                           ← Integration
├── CMMImportService.ts                     ← Quality
├── CovalentAdapter.ts                      ← Integration
├── ElectronicSignatureService.ts           ← Quality
├── EquipmentCommandService.ts              ← Integration/Equipment
├── EquipmentDataCollectionService.ts       ← Integration/Equipment
├── EquipmentMessageBuilder.ts              ← Integration
├── EquipmentService.ts                     ← Resource
├── FAIRPDFService.ts                       ← Quality
├── FAIService.ts                           ← Quality
├── FileUploadService.ts                    ← Shared/Document
├── IBMMaximoAdapter.ts                     ← Integration
├── IndysoftAdapter.ts                      ← Integration
├── IntegrationManager.ts                   ← Integration
├── MaterialMovementTrackingService.ts      ← Integration/Equipment
├── MaterialService.ts                      ← Material
├── MaterialTransactionService.ts           ← Material/Integration
├── OEECalculationService.ts                ← Resource/Equipment
├── OracleEBSAdapter.ts                     ← Integration
├── OracleFusionAdapter.ts                  ← Integration
├── PersonnelInfoSyncService.ts             ← Integration/Resource
├── PersonnelService.ts                     ← Resource
├── PredatorDNCAdapter.ts                   ← Integration
├── PredatorPDMAdapter.ts                   ← Integration
├── ProcessDataCollectionService.ts         ← Integration/Equipment
├── ProcessSegmentService.ts                ← Resource
├── ProductionPerformanceExportService.ts   ← Integration/Work Order
├── ProductionScheduleService.ts            ← Work Order
├── ProductionScheduleSyncService.ts        ← Integration/Work Order
├── ProductService.ts                       ← Resource
├── ProficyHistorianAdapter.ts              ← Integration
├── QIFService.ts                           ← Quality
├── QualityService.ts                       ← Quality
├── SerializationService.ts                 ← Material/Traceability
├── ShopFloorConnectAdapter.ts              ← Integration
├── TeamcenterAdapter.ts                    ← Integration
├── TraceabilityService.ts                  ← Traceability
├── WorkInstructionService.ts               ← Work Order
├── WorkOrderExecutionService.ts            ← Work Order
└── WorkOrderService.ts                     ← Work Order
```

---

## Part 2: Proposed Microservices Bounded Contexts

### Service 1: Authentication Service

**Port:** 3008
**Bounded Context:** User authentication, authorization, and session management

**Current Components:**
- Routes: `auth.ts`
- Services: Authentication middleware logic (currently embedded)
- Models: `User`, `Role`, `Permission` (to be created/enhanced)

**Responsibilities:**
- User login/logout
- JWT token generation and validation
- OAuth 2.0 / SAML 2.0 integration (Phase 4)
- Multi-factor authentication (Phase 4)
- Session management
- Password policy enforcement
- API token management for integrations

**API Endpoints (Current + Planned):**
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/forgot-password` - Forgot password
- `POST /api/v1/auth/validate-token` - Validate JWT token
- `POST /api/v1/auth/api-tokens` - Generate API token for integrations

**Database Models:**
- `User` (with enhanced security fields)
- `RefreshToken`
- `APIToken`
- `UserSession`
- `AuditLog` (authentication events)

**Dependencies:**
- **Outbound:** None (foundational service)
- **Inbound:** All services (token validation)

**Communication Pattern:**
- **Synchronous:** REST API for login/token operations
- **Asynchronous:** Publish authentication events to message bus

---

### Service 2: Work Order Service

**Port:** 3001
**Bounded Context:** Work order lifecycle, scheduling, dispatching, execution, and performance tracking

**Current Components:**
- Routes: `workOrders.ts`, `workOrderExecution.ts`, `productionSchedules.ts`, `workInstructions.ts`
- Services: `WorkOrderService`, `WorkOrderExecutionService`, `ProductionScheduleService`, `WorkInstructionService`
- Models: `WorkOrder`, `WorkOrderOperation`, `WorkOrderMaterial`, `ProductionSchedule`, `ScheduleEntry`, `ScheduleConstraint`, `WorkOrderStatusHistory`, `DispatchLog`, `WorkPerformance`, `ProductionVariance`, `WorkInstruction`, `WorkInstructionStep`, `WorkInstructionAttachment`

**Responsibilities:**
- Work order CRUD operations
- Production scheduling (constraint-based, sequencing algorithms)
- Work order dispatching to shop floor
- Work order execution tracking (status transitions)
- Actuals capture (labor, material, equipment, quality, downtime)
- Variance tracking and calculation
- Work instruction management (digital work instructions)
- Real-time execution dashboard

**API Endpoints (47 endpoints):**
- Work Order CRUD (10 endpoints)
- Production Scheduling (15 endpoints)
- Work Order Execution (13 endpoints)
- Work Instructions (9 endpoints)

**Database Models (Owned):**
- `WorkOrder`
- `WorkOrderOperation`
- `WorkOrderMaterial`
- `ProductionSchedule`
- `ScheduleEntry`
- `ScheduleConstraint`
- `ScheduleStateHistory`
- `WorkOrderStatusHistory`
- `DispatchLog`
- `WorkPerformance`
- `ProductionVariance`
- `WorkInstruction`
- `WorkInstructionStep`
- `WorkInstructionAttachment`

**Dependencies:**
- **Outbound:**
  - Material Service (material reservation, consumption)
  - Resource Service (equipment, personnel availability)
  - Quality Service (inspection requirements)
  - Traceability Service (serial number generation)
  - Integration Service (schedule sync, actuals export)
- **Inbound:**
  - Integration Service (production schedule requests from ERP)

**Communication Pattern:**
- **Synchronous:** REST API for work order operations
- **Asynchronous:** Kafka topics for work order events (`work-order.created`, `work-order.completed`, `material.consumed`, etc.)

---

### Service 3: Quality Service

**Port:** 3002
**Bounded Context:** Quality planning, inspection, non-conformance, CAPA, FAI, and electronic signatures

**Current Components:**
- Routes: `quality.ts`, `fai.ts`, `signatures.ts`, `cmmRoutes.ts`
- Services: `QualityService`, `FAIService`, `FAIRPDFService`, `ElectronicSignatureService`, `QIFService`, `CMMImportService`, `CMMAdapter`
- Models: `QualityPlan`, `QualityInspection`, `InspectionCharacteristic`, `InspectionResult`, `NCR`, `CAPA`, `FAI`, `FAICharacteristic`, `FAIResult`, `FAIApproval`, `Signature`, `SignatureWorkflow`

**Responsibilities:**
- Quality plan management
- Inspection planning and execution
- Inspection results capture and analysis
- Non-conformance reporting (NCR)
- Corrective/Preventive Action (CAPA) management
- First Article Inspection (FAI) workflow
- FAI report generation (AS9102 compliance)
- Electronic signature workflows (21 CFR Part 11 compliant)
- CMM data import (QIF format)
- Statistical Process Control (SPC) calculations

**API Endpoints (35 endpoints):**
- Quality Plans (5 endpoints)
- Inspections (8 endpoints)
- NCR/CAPA (10 endpoints)
- FAI (7 endpoints)
- Electronic Signatures (5 endpoints)

**Database Models (Owned):**
- `QualityPlan`
- `QualityInspection`
- `InspectionCharacteristic`
- `InspectionResult`
- `NCR`
- `CAPA`
- `FAI`
- `FAICharacteristic`
- `FAIResult`
- `FAIApproval`
- `Signature`
- `SignatureWorkflow`
- `SignatureHistory`

**Dependencies:**
- **Outbound:**
  - Work Order Service (work order context for inspections)
  - Material Service (lot/serial number for inspections)
  - Resource Service (equipment calibration status)
  - Integration Service (CMM data import, QIF export)
- **Inbound:**
  - Work Order Service (inspection triggers)

**Communication Pattern:**
- **Synchronous:** REST API for quality operations
- **Asynchronous:** Kafka topics for quality events (`inspection.failed`, `ncr.created`, `signature.required`, etc.)

---

### Service 4: Material Service

**Port:** 3003
**Bounded Context:** Material master data, inventory, lot/batch tracking, and serialization

**Current Components:**
- Routes: `materials.ts`, `serialization.ts`
- Services: `MaterialService`, `SerializationService`
- Models: `Part`, `PartRevision`, `BOMItem`, `Inventory`, `MaterialTransaction`, `MaterialClass`, `MaterialDefinition`, `MaterialProperty`, `MaterialLot`, `MaterialSublot`, `MaterialLotGenealogy`, `MaterialStateHistory`, `SerializedPart`, `SerialNumberRange`

**Responsibilities:**
- Part master data management
- Bill of Materials (BOM) management
- Inventory transactions (receipt, issue, transfer, adjustment)
- Material lot/batch tracking
- Lot split/merge operations
- Material expiration management
- Material quality status (available, quarantined, etc.)
- Serial number generation and tracking
- Inventory balance queries
- Material reservation and allocation

**API Endpoints (42 endpoints):**
- Part Master (8 endpoints)
- BOM (6 endpoints)
- Inventory (12 endpoints)
- Material Lots (10 endpoints)
- Serialization (6 endpoints)

**Database Models (Owned):**
- `Part`
- `PartRevision`
- `BOMItem`
- `Inventory`
- `MaterialTransaction` (internal MES transactions)
- `MaterialClass`
- `MaterialDefinition`
- `MaterialProperty`
- `MaterialLot`
- `MaterialSublot`
- `MaterialLotGenealogy`
- `MaterialStateHistory`
- `SerializedPart`
- `SerialNumberRange`

**Dependencies:**
- **Outbound:**
  - Traceability Service (genealogy tracking)
  - Integration Service (material transaction sync with ERP)
  - Quality Service (material quality status)
- **Inbound:**
  - Work Order Service (material consumption)
  - Integration Service (material receipts from ERP)

**Communication Pattern:**
- **Synchronous:** REST API for material operations
- **Asynchronous:** Kafka topics for material events (`inventory.low`, `lot.expired`, `material.consumed`, etc.)

---

### Service 5: Traceability Service

**Port:** 3004
**Bounded Context:** Product genealogy, forward/backward traceability, and recall simulation

**Current Components:**
- Routes: `traceability.ts`
- Services: `TraceabilityService`
- Models: `MaterialLotGenealogy` (shared with Material Service), `SerializedPart` (shared with Material Service), traceability-specific views

**Responsibilities:**
- Forward genealogy (where did materials go?)
- Backward genealogy (where did materials come from?)
- Serial number traceability
- Lot traceability
- Recall simulation
- Genealogy tree visualization
- Digital thread queries (end-to-end product history)
- Traceability reports

**API Endpoints (8 endpoints):**
- Genealogy Queries (4 endpoints)
- Recall Simulation (2 endpoints)
- Traceability Reports (2 endpoints)

**Database Models (Owned):**
- Traceability views and aggregation tables (read-optimized)
- May own genealogy event log for audit

**Dependencies:**
- **Outbound:**
  - Material Service (lot/serial number data)
  - Work Order Service (production context)
  - Quality Service (inspection results)
  - Integration Service (PLM/QMS traceability data)
- **Inbound:**
  - Material Service (genealogy updates)
  - Work Order Service (production genealogy)

**Communication Pattern:**
- **Synchronous:** REST API for traceability queries
- **Asynchronous:** Subscribe to material and work order events for genealogy updates
- **Note:** Heavy read operations, consider read replicas

---

### Service 6: Resource Service (Equipment & Personnel)

**Port:** 3005
**Bounded Context:** Equipment, personnel, process segments, and product definitions (manufacturing resources)

**Current Components:**
- Routes: `equipment.ts`, `personnel.ts`, `processSegments.ts`, `products.ts`
- Services: `EquipmentService`, `OEECalculationService`, `PersonnelService`, `ProcessSegmentService`, `ProductService`
- Models: `Equipment`, `EquipmentClass`, `EquipmentState`, `EquipmentStateHistory`, `EquipmentPerformanceLog`, `User` (as Personnel), `PersonnelClass`, `PersonnelQualification`, `PersonnelCertification`, `PersonnelSkill`, `PersonnelSkillAssignment`, `PersonnelWorkCenterAssignment`, `PersonnelAvailability`, `ProcessSegment`, `ProcessSegmentParameter`, `ProcessSegmentDependency`, `PersonnelSegmentSpecification`, `EquipmentSegmentSpecification`, `MaterialSegmentSpecification`, `PhysicalAssetSegmentSpecification`, `Part` (as Product), `ProductSpecification`, `ProductConfiguration`, `ConfigurationOption`, `ProductLifecycle`

**Responsibilities:**
- Equipment hierarchy management (5 levels)
- Equipment state tracking
- OEE calculation and reporting
- Equipment maintenance scheduling
- Personnel management (hierarchy, skills, certifications)
- Personnel availability and shift scheduling
- Process segment definitions (manufacturing recipes)
- Process segment dependencies and sequencing
- Product/part master data management
- Product specifications and configurations
- Product lifecycle management
- Work center and area management

**API Endpoints (70+ endpoints):**
- Equipment (20 endpoints)
- Personnel (25 endpoints)
- Process Segments (15 endpoints)
- Products (10 endpoints)

**Database Models (Owned):**
- Equipment models (7 models)
- Personnel models (8 models)
- Process Segment models (7 models)
- Product models (5 models)
- `Site`, `Area`, `WorkCenter`

**Dependencies:**
- **Outbound:**
  - Work Order Service (resource availability for scheduling)
  - Integration Service (equipment data collection, personnel sync)
- **Inbound:**
  - Work Order Service (resource assignment)
  - Integration Service (equipment commands, personnel updates from HR)

**Communication Pattern:**
- **Synchronous:** REST API for resource operations
- **Asynchronous:** Kafka topics for resource events (`equipment.fault`, `personnel.unavailable`, `certification.expired`, etc.)

---

### Service 7: Reporting Service

**Port:** 3006
**Bounded Context:** Analytics, dashboards, reports, and data aggregation

**Current Components:**
- Routes: `dashboard.ts`
- Services: Reporting/analytics logic (currently embedded in other services)
- Models: Read-optimized views and aggregation tables

**Responsibilities:**
- Real-time dashboard data aggregation
- Production analytics (OEE, downtime, throughput)
- Quality analytics (PPM, yield, NCR trends)
- Inventory analytics (turnover, aging)
- Traceability reports
- Scheduled report generation
- Report export (PDF, Excel, CSV)
- Custom report builder
- KPI tracking and visualization
- Historical trend analysis

**API Endpoints (Planned: 20+ endpoints):**
- Dashboard APIs (5 endpoints)
- Production Reports (5 endpoints)
- Quality Reports (5 endpoints)
- Inventory Reports (3 endpoints)
- Custom Reports (2 endpoints)

**Database Models (Owned):**
- Read-optimized materialized views
- Report definitions
- Report schedules
- Aggregation tables (hourly, daily, weekly rollups)

**Dependencies:**
- **Outbound:**
  - Work Order Service (production data)
  - Quality Service (quality data)
  - Material Service (inventory data)
  - Resource Service (equipment/personnel data)
  - Traceability Service (genealogy data)
- **Inbound:**
  - None (reporting is a sink, not a source)

**Communication Pattern:**
- **Synchronous:** REST API for report queries
- **Asynchronous:** Subscribe to all service events for real-time aggregation
- **Note:** Should use read replicas to avoid impacting transactional databases

---

### Service 8: Integration Service

**Port:** 3007
**Bounded Context:** External system integration (ERP, PLM, SCADA, QMS, CMMS, etc.)

**Current Components:**
- Routes: `integrationRoutes.ts`, `b2mRoutes.ts`, `l2EquipmentRoutes.ts`, `historianRoutes.ts`, `covalentRoutes.ts`, `indysoftRoutes.ts`, `maximoRoutes.ts`, `predatorDNCRoutes.ts`, `predatorPDMRoutes.ts`, `shopFloorConnectRoutes.ts`
- Services: `IntegrationManager`, `B2MMessageBuilder`, `EquipmentMessageBuilder`, `ProductionPerformanceExportService`, `MaterialTransactionService` (ERP part), `PersonnelInfoSyncService`, `OracleFusionAdapter`, `OracleEBSAdapter`, `TeamcenterAdapter`, `ProficyHistorianAdapter`, `IBMMaximoAdapter`, `CovalentAdapter`, `ShopFloorConnectAdapter`, `PredatorDNCAdapter`, `PredatorPDMAdapter`, `IndysoftAdapter`, `EquipmentDataCollectionService`, `EquipmentCommandService`, `MaterialMovementTrackingService`, `ProcessDataCollectionService`
- Models: `IntegrationConfig`, `ProductionScheduleRequest`, `ProductionScheduleResponse`, `ProductionPerformanceActual`, `ERPMaterialTransaction`, `PersonnelInfoExchange`, `EquipmentDataCollection`, `EquipmentCommand`, `EquipmentMaterialMovement`, `ProcessDataCollection`

**Responsibilities:**
- **Level 4 (ERP) Integration:**
  - Production schedule synchronization (ERP → MES)
  - Production performance export (MES → ERP)
  - Material transaction sync (bidirectional)
  - Personnel info exchange (bidirectional)

- **Level 2 (Equipment) Integration:**
  - Equipment data collection (OPC UA, MTConnect, MQTT, MODBUS, REST)
  - Equipment command/response protocol
  - Material movement tracking through equipment
  - Process data collection

- **PLM Integration:**
  - BOM synchronization
  - Engineering change orders (ECO)
  - CAD model metadata

- **CMMS Integration:**
  - Equipment maintenance sync
  - Work order integration

- **Other Integrations:**
  - Historian data push
  - DNC program management
  - Shop floor connectivity

**API Endpoints (50+ endpoints):**
- Integration Config (5 endpoints)
- ERP Integration (19 endpoints from b2mRoutes)
- Equipment Integration (25 endpoints from l2EquipmentRoutes)
- Adapter-specific endpoints (varies)

**Database Models (Owned):**
- `IntegrationConfig`
- `ProductionScheduleRequest`
- `ProductionScheduleResponse`
- `ProductionPerformanceActual`
- `ERPMaterialTransaction`
- `PersonnelInfoExchange`
- `EquipmentDataCollection`
- `EquipmentCommand`
- `EquipmentMaterialMovement`
- `ProcessDataCollection`
- Integration audit logs
- Message queues and retry logic

**Dependencies:**
- **Outbound:**
  - Work Order Service (schedule sync, actuals export)
  - Material Service (transaction sync)
  - Resource Service (personnel sync, equipment data)
  - Quality Service (CMM data import)
  - External Systems (ERP, PLM, SCADA, etc.)
- **Inbound:**
  - All services (integration is a hub)

**Communication Pattern:**
- **Synchronous:** REST API for integration management
- **Asynchronous:**
  - Kafka topics for integration events
  - Message queues for reliable message delivery to external systems
  - Retry and dead-letter queues
- **Protocols:** REST, SOAP, gRPC, OPC UA, MTConnect, MQTT, MODBUS

---

## Part 3: Cross-Service Dependencies

### Dependency Matrix

```
┌──────────────┬─────┬──────┬────────┬─────────┬─────────────┬─────────┬──────────┬────────────┐
│ Service      │Auth │Work  │Quality │Material │Traceability │Resource │Reporting │Integration │
│              │3008 │Order │ 3002   │  3003   │    3004     │  3005   │  3006    │   3007     │
│              │     │ 3001 │        │         │             │         │          │            │
├──────────────┼─────┼──────┼────────┼─────────┼─────────────┼─────────┼──────────┼────────────┤
│Auth          │  -  │  ✓   │   ✓    │    ✓    │      ✓      │    ✓    │    ✓     │     ✓      │
│Work Order    │  ✓  │  -   │   ✓    │    ✓    │      ✓      │    ✓    │    ✓     │     ✓      │
│Quality       │  ✓  │  ✓   │   -    │    ✓    │      -      │    ✓    │    ✓     │     ✓      │
│Material      │  ✓  │  ✓   │   ✓    │    -    │      ✓      │    -    │    ✓     │     ✓      │
│Traceability  │  ✓  │  ✓   │   ✓    │    ✓    │      -      │    -    │    ✓     │     ✓      │
│Resource      │  ✓  │  ✓   │   ✓    │    -    │      -      │    -    │    ✓     │     ✓      │
│Reporting     │  ✓  │  ✓   │   ✓    │    ✓    │      ✓      │    ✓    │    -     │     -      │
│Integration   │  ✓  │  ✓   │   ✓    │    ✓    │      -      │    ✓    │    -     │     -      │
└──────────────┴─────┴──────┴────────┴─────────┴─────────────┴─────────┴──────────┴────────────┘

Legend: ✓ = Service depends on (calls) the column service
```

### Key Dependency Patterns

**1. Authentication Service (Foundation)**
- **Pattern:** All services depend on Auth for token validation
- **Implementation:** Shared JWT validation library OR API Gateway-level auth

**2. Work Order Service (Central Orchestrator)**
- **Dependencies:** Material (reservation), Resource (availability), Quality (inspections), Traceability (serial numbers), Integration (sync)
- **Pattern:** Saga pattern for distributed transactions

**3. Material Service (Data Owner)**
- **Dependencies:** Traceability (genealogy), Integration (ERP sync), Quality (status)
- **Pattern:** Event sourcing for inventory transactions

**4. Traceability Service (Read-Heavy)**
- **Dependencies:** Material, Work Order, Quality (all read-only queries)
- **Pattern:** CQRS (Command Query Responsibility Segregation) with read replicas

**5. Resource Service (Reference Data)**
- **Dependencies:** Integration (equipment data, personnel sync)
- **Pattern:** Master data management with caching

**6. Reporting Service (Analytics Sink)**
- **Dependencies:** All services (read-only)
- **Pattern:** Event-driven materialized views

**7. Integration Service (Hub)**
- **Dependencies:** Work Order, Material, Resource (bidirectional sync)
- **Pattern:** Adapter pattern for multiple external systems

---

## Part 4: Data Ownership

### Database Per Service Pattern

Each microservice will own its data exclusively. No direct database access across services.

```
┌─────────────────────────────────────────────────────────┐
│ Authentication Service Database (PostgreSQL)            │
├─────────────────────────────────────────────────────────┤
│ • User                                                  │
│ • RefreshToken                                          │
│ • APIToken                                              │
│ • UserSession                                           │
│ • AuthAuditLog                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Work Order Service Database (PostgreSQL)                │
├─────────────────────────────────────────────────────────┤
│ • WorkOrder                                             │
│ • WorkOrderOperation                                    │
│ • WorkOrderMaterial                                     │
│ • ProductionSchedule                                    │
│ • ScheduleEntry                                         │
│ • ScheduleConstraint                                    │
│ • ScheduleStateHistory                                  │
│ • WorkOrderStatusHistory                                │
│ • DispatchLog                                           │
│ • WorkPerformance                                       │
│ • ProductionVariance                                    │
│ • WorkInstruction                                       │
│ • WorkInstructionStep                                   │
│ • WorkInstructionAttachment                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Quality Service Database (PostgreSQL)                   │
├─────────────────────────────────────────────────────────┤
│ • QualityPlan                                           │
│ • QualityInspection                                     │
│ • InspectionCharacteristic                              │
│ • InspectionResult                                      │
│ • NCR                                                   │
│ • CAPA                                                  │
│ • FAI                                                   │
│ • FAICharacteristic                                     │
│ • FAIResult                                             │
│ • FAIApproval                                           │
│ • Signature                                             │
│ • SignatureWorkflow                                     │
│ • SignatureHistory                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Material Service Database (PostgreSQL)                  │
├─────────────────────────────────────────────────────────┤
│ • Part                                                  │
│ • PartRevision                                          │
│ • BOMItem                                               │
│ • Inventory                                             │
│ • MaterialTransaction                                   │
│ • MaterialClass                                         │
│ • MaterialDefinition                                    │
│ • MaterialProperty                                      │
│ • MaterialLot                                           │
│ • MaterialSublot                                        │
│ • MaterialLotGenealogy                                  │
│ • MaterialStateHistory                                  │
│ • SerializedPart                                        │
│ • SerialNumberRange                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Traceability Service Database (PostgreSQL - Read Optimized) │
├─────────────────────────────────────────────────────────┤
│ • GenealogyView (materialized view)                     │
│ • TraceabilityEventLog                                  │
│ • RecallSimulationCache                                 │
│ • DigitalThreadView                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Resource Service Database (PostgreSQL)                  │
├─────────────────────────────────────────────────────────┤
│ • Site                                                  │
│ • Area                                                  │
│ • WorkCenter                                            │
│ • Equipment                                             │
│ • EquipmentClass                                        │
│ • EquipmentState                                        │
│ • EquipmentStateHistory                                 │
│ • EquipmentPerformanceLog                               │
│ • Personnel (User reference data)                       │
│ • PersonnelClass                                        │
│ • PersonnelQualification                                │
│ • PersonnelCertification                                │
│ • PersonnelSkill                                        │
│ • PersonnelSkillAssignment                              │
│ • PersonnelWorkCenterAssignment                         │
│ • PersonnelAvailability                                 │
│ • ProcessSegment                                        │
│ • ProcessSegmentParameter                               │
│ • ProcessSegmentDependency                              │
│ • PersonnelSegmentSpecification                         │
│ • EquipmentSegmentSpecification                         │
│ • MaterialSegmentSpecification                          │
│ • PhysicalAssetSegmentSpecification                     │
│ • Part (Product reference data)                         │
│ • ProductSpecification                                  │
│ • ProductConfiguration                                  │
│ • ConfigurationOption                                   │
│ • ProductLifecycle                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Reporting Service Database (PostgreSQL - Read Optimized) │
├─────────────────────────────────────────────────────────┤
│ • DashboardView (materialized view)                     │
│ • ProductionMetricsHourly (aggregation)                 │
│ • ProductionMetricsDaily (aggregation)                  │
│ • QualityMetricsDaily (aggregation)                     │
│ • InventorySnapshotDaily (aggregation)                  │
│ • OEEMetricsShift (aggregation)                         │
│ • ReportDefinition                                      │
│ • ReportSchedule                                        │
│ • ReportExecutionLog                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Integration Service Database (PostgreSQL)               │
├─────────────────────────────────────────────────────────┤
│ • IntegrationConfig                                     │
│ • ProductionScheduleRequest                             │
│ • ProductionScheduleResponse                            │
│ • ProductionPerformanceActual                           │
│ • ERPMaterialTransaction                                │
│ • PersonnelInfoExchange                                 │
│ • EquipmentDataCollection                               │
│ • EquipmentCommand                                      │
│ • EquipmentMaterialMovement                             │
│ • ProcessDataCollection                                 │
│ • IntegrationMessageLog                                 │
│ • IntegrationErrorLog                                   │
│ • MessageRetryQueue                                     │
└─────────────────────────────────────────────────────────┘
```

### Shared Data Challenges

**Challenge 1: User (Personnel) Data**
- **Current:** Single `User` table used by Auth, Resource, and Work Order services
- **Solution:**
  - Auth Service owns authentication credentials
  - Resource Service owns personnel master data
  - Other services store User ID reference only
  - Eventual consistency via events

**Challenge 2: Part (Product) Data**
- **Current:** `Part` table used by Material and Resource services
- **Solution:**
  - Resource Service owns product definitions (master data)
  - Material Service stores Part ID reference
  - Cache product data in Material Service for performance
  - Sync via events

**Challenge 3: Work Center Data**
- **Current:** `WorkCenter` referenced by many services
- **Solution:**
  - Resource Service owns work centers
  - Other services store Work Center ID reference
  - Cache work center data for performance

---

## Part 5: Inter-Service Communication Patterns

### Communication Strategies

#### 1. Synchronous Communication (REST APIs)

**Use Cases:**
- Real-time queries (e.g., "Is material available?")
- Immediate validation (e.g., "Can work order be dispatched?")
- User-initiated actions (e.g., "Create work order")

**Implementation:**
- RESTful APIs with OpenAPI/Swagger documentation
- Circuit breaker pattern (Hystrix or Resilience4j) for fault tolerance
- Request/response timeouts (2-5 seconds)
- Retry with exponential backoff

**Example Flow:**
```
Work Order Service → Material Service
POST /api/v1/materials/reserve
{
  "partId": "part-123",
  "quantity": 100,
  "workOrderId": "wo-456"
}

Response:
{
  "success": true,
  "reservationId": "res-789",
  "availableQuantity": 500
}
```

#### 2. Asynchronous Communication (Message Bus)

**Use Cases:**
- Event notifications (e.g., "Work order completed")
- Data synchronization (e.g., "Inventory updated")
- Long-running processes (e.g., "Report generation")
- Decoupled services

**Implementation:**
- Apache Kafka or RabbitMQ message bus
- Topic-based publish/subscribe
- Event schema registry (Avro or JSON Schema)
- At-least-once delivery guarantee
- Idempotent consumers

**Kafka Topics:**
```
Topics:
├── work-order.created
├── work-order.dispatched
├── work-order.completed
├── work-order.cancelled
├── material.consumed
├── material.received
├── material.low-stock
├── material.lot-expired
├── quality.inspection-failed
├── quality.ncr-created
├── equipment.fault
├── equipment.maintenance-required
├── personnel.certification-expired
├── schedule.updated
└── integration.message-received
```

**Example Flow:**
```
Work Order Service publishes:
Topic: work-order.completed
{
  "eventId": "evt-123",
  "eventType": "work-order.completed",
  "timestamp": "2025-10-18T10:00:00Z",
  "workOrderId": "wo-456",
  "partNumber": "PN-789",
  "quantityCompleted": 95,
  "quantityScrap": 5,
  "completedBy": "user-101"
}

Subscribers:
- Reporting Service (update dashboard)
- Integration Service (export to ERP)
- Material Service (update inventory)
- Traceability Service (update genealogy)
```

#### 3. Saga Pattern (Distributed Transactions)

**Use Case:** Work order dispatch requires coordinated actions across multiple services

**Implementation:** Choreography-based saga using event-driven approach

**Example: Work Order Dispatch Saga**
```
Step 1: Work Order Service publishes work-order.dispatch-requested
  ↓
Step 2: Material Service reserves materials → publishes material.reserved
  ↓
Step 3: Resource Service assigns personnel → publishes personnel.assigned
  ↓
Step 4: Resource Service assigns equipment → publishes equipment.assigned
  ↓
Step 5: Work Order Service confirms dispatch → publishes work-order.dispatched

Compensation (if any step fails):
- Material Service releases reservation
- Resource Service releases assignments
- Work Order Service marks dispatch as failed
```

#### 4. API Gateway Pattern

**Purpose:** Single entry point for all client requests

**Implementation:** Kong API Gateway or AWS API Gateway

**Responsibilities:**
- Routing requests to appropriate microservice
- Authentication/authorization (JWT validation)
- Rate limiting
- Request/response transformation
- API versioning
- CORS handling
- SSL termination
- Request logging

**Gateway Configuration Example:**
```yaml
routes:
  - path: /api/v1/auth/*
    service: auth-service:3008

  - path: /api/v1/workorders/*
    service: work-order-service:3001
    auth: required

  - path: /api/v1/quality/*
    service: quality-service:3002
    auth: required

  - path: /api/v1/materials/*
    service: material-service:3003
    auth: required
```

---

## Part 6: Service API Specifications (OpenAPI)

### Service API Versioning Strategy

All services will use URL-based versioning:
```
/api/v1/{resource}
/api/v2/{resource}  (future versions)
```

### OpenAPI Specification Template

Each service will generate OpenAPI 3.0 specifications:

```yaml
openapi: 3.0.0
info:
  title: Work Order Service API
  version: 1.0.0
  description: Work order lifecycle, scheduling, dispatching, and execution
  contact:
    name: MES Development Team
    email: mes-dev@example.com

servers:
  - url: http://localhost:3001/api/v1
    description: Local development
  - url: https://mes-dev.example.com/api/v1
    description: Development environment
  - url: https://mes.example.com/api/v1
    description: Production environment

security:
  - bearerAuth: []

paths:
  /workorders:
    get:
      summary: Get all work orders
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [CREATED, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED]
        - name: partNumber
          in: query
          schema:
            type: string
      responses:
        200:
          description: List of work orders
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/WorkOrder'
    post:
      summary: Create a new work order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WorkOrderCreateRequest'
      responses:
        201:
          description: Work order created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkOrder'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    WorkOrder:
      type: object
      properties:
        id:
          type: string
          format: uuid
        workOrderNumber:
          type: string
        partNumber:
          type: string
        quantity:
          type: number
        status:
          type: string
          enum: [CREATED, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED]
        # ... additional fields
```

### API Documentation URLs (After Implementation)

```
http://localhost:3008/api-docs  → Authentication Service API
http://localhost:3001/api-docs  → Work Order Service API
http://localhost:3002/api-docs  → Quality Service API
http://localhost:3003/api-docs  → Material Service API
http://localhost:3004/api-docs  → Traceability Service API
http://localhost:3005/api-docs  → Resource Service API
http://localhost:3006/api-docs  → Reporting Service API
http://localhost:3007/api-docs  → Integration Service API
```

---

## Part 7: Technology Stack for Microservices

### Core Technologies (Unchanged from Monolith)
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL 15
- **ORM:** Prisma
- **Testing:** Playwright (E2E), Vitest (unit)

### New Technologies for Microservices

**1. API Gateway**
- **Primary Choice:** Kong Gateway (open-source)
- **Alternative:** AWS API Gateway (if deploying to AWS)
- **Features:** Routing, auth, rate limiting, logging

**2. Message Bus**
- **Primary Choice:** Apache Kafka
- **Alternative:** RabbitMQ
- **Rationale:** Kafka for high-throughput event streaming

**3. Service Discovery**
- **Kubernetes-native:** Kubernetes DNS (if deploying to K8s)
- **Standalone:** Consul (if not using K8s)

**4. Distributed Tracing**
- **Primary Choice:** Jaeger
- **Alternative:** AWS X-Ray
- **Library:** OpenTelemetry

**5. Centralized Logging**
- **Primary Choice:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Alternative:** AWS CloudWatch
- **Library:** Winston or Pino with structured logging

**6. Circuit Breaker**
- **Library:** Opossum (Node.js circuit breaker library)
- **Alternative:** Hystrix.js

**7. API Documentation**
- **Tool:** Swagger UI + Redoc
- **Generation:** swagger-jsdoc from TypeScript annotations

**8. Container Orchestration**
- **Platform:** Kubernetes (see Task 2.6)
- **Local Development:** Docker Compose

---

## Part 8: Migration Strategy

### Migration Approach: Strangler Fig Pattern

**Strategy:** Gradually replace monolith functionality with microservices without disrupting operations.

**Phases:**
1. **Setup infrastructure** (API Gateway, Message Bus, Service Registry)
2. **Extract one service at a time** (starting with least dependent)
3. **Route traffic through API Gateway** (monolith + new service coexist)
4. **Migrate data incrementally** (dual writes during transition)
5. **Decommission monolith components** (once service is stable)

### Recommended Migration Order

```
Phase 1: Foundation
1. Authentication Service (foundational, least dependencies)
2. Reporting Service (read-only, no impact on transactions)

Phase 2: Core Services
3. Material Service (central to traceability)
4. Resource Service (reference data)

Phase 3: Operational Services
5. Quality Service (depends on Material, Resource)
6. Traceability Service (depends on Material)

Phase 4: Complex Services
7. Work Order Service (depends on most services)
8. Integration Service (depends on all services)
```

### Dual-Write Strategy (Example: Material Service)

During migration, writes go to both monolith and microservice:

```typescript
// Monolith code (temporary during migration)
async createPart(data) {
  // Write to monolith database
  const part = await prisma.part.create({ data });

  // Also publish event for new Material Service
  await kafka.publish('material.part-created', part);

  return part;
}

// Material Service (new)
async onPartCreated(event) {
  // Write to Material Service database
  await this.prisma.part.create({ data: event.data });
}
```

Once Material Service is stable and all clients migrated, remove dual-write logic.

---

## Deliverables Checklist

### Task 2.1 Deliverables

- [x] **Service dependency diagram** - Part 3
- [x] **API specifications for all 8 services** - Part 6
- [x] **Data ownership matrix** - Part 4
- [x] **Bounded context mapping** - Part 2
- [x] **Cross-service dependency analysis** - Part 3
- [x] **Communication pattern design** - Part 5
- [x] **Technology stack recommendations** - Part 7
- [x] **Migration strategy** - Part 8

---

## Next Steps: Task 2.2 - Shared Infrastructure Setup (2 weeks)

With service boundaries defined, the next task will set up the shared infrastructure:

**Task 2.2 Objectives:**
1. Setup API Gateway (Kong)
2. Implement Service Registry (Kubernetes DNS or Consul)
3. Configure Message Bus (Kafka)
4. Setup Distributed Tracing (Jaeger)
5. Implement Centralized Logging (ELK Stack)
6. (Optional) Configure Service Mesh (Istio)

**Timeline:** Weeks 2-3 of Phase 2

---

**Document Status:** ✅ Task 2.1 Complete - Ready for Review
**Approval Required:** System Architect, Technical Lead, DevOps Lead

**Last Updated:** October 18, 2025
**Author:** MES Development Team
