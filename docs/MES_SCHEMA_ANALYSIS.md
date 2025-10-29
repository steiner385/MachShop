# MachShop MES - Comprehensive Database Schema Analysis
## Complete Data Model & Seed Data Assessment

**Date:** October 29, 2025  
**Total Models in Schema:** 177  
**Current Seed Coverage:** 44+ entities  
**Schema File:** `/home/tony/GitHub/MachShop/prisma/schema.prisma`

---

## EXECUTIVE SUMMARY

The MachShop Manufacturing Execution System (MES) is built on an comprehensive ISA-95 compliant data model with 177 distinct entities organized across 10+ functional domains. The schema represents a complete production management platform with:

- **6-Level ISA-95 Equipment Hierarchy:** Enterprise → Site → Area → WorkCenter → WorkUnit → Equipment
- **Personnel Management:** Complete role, skill, certification, and availability tracking
- **Material Lifecycle:** Full traceability from raw materials through finished goods with lot genealogy
- **Production Execution:** Work orders, operations, routing, scheduling, and dispatch
- **Quality Management:** Plans, inspections, measurements, FAI, NCR, and statistical process control
- **Equipment & Maintenance:** Asset management, logs, performance tracking, and maintenance
- **Integration & Data Collection:** ERP integration, ISA-95 B2M messages, QIF standards, equipment data collection
- **Document Management:** Work instructions, SOPs, ECOs, setup sheets, inspection plans
- **Electronic Signatures & Compliance:** 21 CFR Part 11 compliant signature management

Current seed scripts cover approximately 44 core entities (25% of the total schema), focusing on production workflows, quality, materials, and resources. Significant gaps exist in advanced features like workflow automation, document management, equipment monitoring, and analytics.

---

## TABLE OF CONTENTS

1. [Complete Model Inventory by Functional Area](#complete-model-inventory-by-functional-area)
2. [Current Seed Data Coverage](#current-seed-data-coverage)
3. [Missing Seed Data Analysis](#missing-seed-data-analysis)
4. [Complex Entities Requiring Comprehensive Scenarios](#complex-entities-requiring-comprehensive-scenarios)
5. [Seed Data Generation Framework Recommendations](#seed-data-generation-framework-recommendations)

---

## COMPLETE MODEL INVENTORY BY FUNCTIONAL AREA

### 1. ISA-95 ORGANIZATIONAL HIERARCHY (5 models)

**Purpose:** Define the hierarchical structure of the manufacturing enterprise according to ISA-95 standards

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `Enterprise` | IMPLEMENTED | Top-level enterprise entity | ✅ Partial | Low |
| `Site` | IMPLEMENTED | Manufacturing site/plant | ✅ Yes | Low |
| `Area` | IMPLEMENTED | Production area within site | ✅ Yes | Low |
| `WorkCenter` | IMPLEMENTED | Equipment grouping (ISA-95 L4) | ✅ Yes | Medium |
| `WorkUnit` | IMPLEMENTED | Individual equipment unit (ISA-95 L5) | ❌ NO | Medium |

**Seeding Status:** Minimal - only basic entities. Missing WorkUnit hierarchy linkage.

**Key Relationships:**
- Enterprise (1:N) → Sites
- Site (1:N) → Areas
- Area (1:N) → WorkCenters
- WorkCenter (1:N) → WorkUnits
- WorkUnit → Equipment

---

### 2. PERSONNEL MANAGEMENT (10 models)

**Purpose:** Complete workforce management with roles, skills, certifications, availability, and organizational structure

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `User` | IMPLEMENTED | Core user/employee record | ✅ Yes (13+ users) | High |
| `PersonnelClass` | IMPLEMENTED | Job classifications (Operator, Tech, Engineer, Supervisor, Manager) | ✅ Yes | Low |
| `PersonnelQualification` | IMPLEMENTED | Certification/License definitions | ✅ Yes | Medium |
| `PersonnelCertification` | IMPLEMENTED | Individual certifications with expiration | ✅ Yes | High |
| `PersonnelSkill` | IMPLEMENTED | Skill definitions (machining, welding, inspection, etc.) | ✅ Yes | Low |
| `PersonnelSkillAssignment` | IMPLEMENTED | Competency matrix (personnel × skills × levels 1-5) | ✅ Yes | Medium |
| `PersonnelWorkCenterAssignment` | IMPLEMENTED | Many-to-many personnel ↔ work centers | ✅ Yes | Medium |
| `PersonnelAvailability` | IMPLEMENTED | Shift schedules, time off, availability calendar | ⚠️ Partial | Medium |
| `UserRole` (RBAC) | IMPLEMENTED | Dynamic global role assignments | ❌ NO | Medium |
| `UserSiteRole` | IMPLEMENTED | Dynamic site-specific role assignments | ❌ NO | Medium |

**Seeding Status:** Good for users (13 created), basic qualifications, but missing:
- Advanced certification scenarios (expired, suspended, revoked)
- Competency level variations
- Complex shift schedules and recurring patterns
- Dynamic RBAC setup (global and site-specific roles)
- Supervisor hierarchies

**Key Scenarios Needed:**
- Multi-level supervisor chains
- Certification near-expiration alerts
- Complex skill combinations (e.g., CNC + QA + Safety)
- Cross-shift coverage planning
- Compliance tracking for regulated skills

---

### 3. MATERIAL MANAGEMENT (8 models)

**Purpose:** Complete material lifecycle from procurement through consumption with full traceability

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `MaterialClass` | IMPLEMENTED | Material hierarchy (RAW, WIP, FG, CONS, PACK, TOOL) | ✅ Yes | Low |
| `MaterialDefinition` | IMPLEMENTED | Material master data (part numbers, specs) | ✅ Yes (4 parts) | High |
| `MaterialProperty` | IMPLEMENTED | Physical/chemical properties with specs | ✅ Partial | High |
| `MaterialLot` | IMPLEMENTED | Batch/lot tracking with genealogy | ✅ Yes (2 lots) | Very High |
| `MaterialSublot` | IMPLEMENTED | Split/merge operations | ❌ NO | High |
| `MaterialLotGenealogy` | IMPLEMENTED | Parent-child relationships for traceability | ✅ Partial | Very High |
| `MaterialStateHistory` | IMPLEMENTED | State transition tracking (RECEIVED → INSPECTED → APPROVED) | ✅ Partial | High |
| `SerializedPart` | IMPLEMENTED | Individual serial number tracking | ✅ Yes (2 serials) | Very High |

**Seeding Status:** Moderate - core materials exist but limited genealogy scenarios

**Missing Scenarios:**
- Lot merges (multiple lots → single lot)
- Complex splits (multi-level sublots)
- Quality lot status transitions (PENDING → IN_INSPECTION → APPROVED/REJECTED/CONDITIONAL)
- Expired/quarantined lots
- Multi-generational genealogy (A → B → C → D)
- Supplier lot number mapping
- Heat number and serial number validation scenarios
- Material property variations by lot

---

### 4. PRODUCTION OPERATIONS & PROCESSES (10 models)

**Purpose:** Define manufacturing processes, operations, parameters, and dependencies

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `Operation` | IMPLEMENTED | Process segments/manufacturing operations | ✅ Yes | High |
| `OperationParameter` | IMPLEMENTED | Operation inputs/outputs (Speed, Feed, Temp, Pressure) | ✅ Yes | Very High |
| `ParameterLimits` | IMPLEMENTED | Multi-level parameter constraints | ❌ NO | High |
| `ParameterGroup` | IMPLEMENTED | Grouped parameters (e.g., spindle settings) | ❌ NO | Medium |
| `ParameterFormula` | IMPLEMENTED | Calculated parameters (e.g., SFM = π × D × RPM) | ❌ NO | Very High |
| `OperationDependency` | IMPLEMENTED | Operation prerequisites and sequences | ✅ Partial | Medium |
| `PersonnelOperationSpecification` | IMPLEMENTED | Required personnel, skills, certifications | ✅ Yes | High |
| `EquipmentOperationSpecification` | IMPLEMENTED | Required equipment/capabilities | ✅ Yes | High |
| `MaterialOperationSpecification` | IMPLEMENTED | Required materials and quantities | ✅ Yes | High |
| `PhysicalAssetOperationSpecification` | IMPLEMENTED | Required tooling, fixtures, gauges | ✅ Yes | Very High |

**Seeding Status:** Partial - basic operations exist but parameters are minimal

**Complex Scenarios Missing:**
- Multi-tier parameter hierarchies with dependencies
- Calculated parameters (formulas linking inputs to outputs)
- Parameter version control
- Conditional parameters (if-then rules)
- Complex operation sequences with multiple dependencies
- Rework operation flows
- Setup/teardown operations with parameters

---

### 5. PARTS & PRODUCTS (5 models)

**Purpose:** Product definitions and bill-of-materials management

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `Part` | IMPLEMENTED | Part/component master data | ✅ Yes (3 parts) | High |
| `PartSiteAvailability` | IMPLEMENTED | Site-specific part availability | ❌ NO | Medium |
| `BOMItem` | IMPLEMENTED | Bill-of-materials relationships | ✅ Partial | Medium |
| `ProductSpecification` | IMPLEMENTED | Product technical specs | ❌ NO | High |
| `ProductConfiguration` | IMPLEMENTED | Configurable product variants | ❌ NO | Very High |

**Seeding Status:** Minimal - basic parts and BOMs only

**Missing Scenarios:**
- Multi-level BOM hierarchies (e.g., Assembly → Subassembly → Components)
- Phantom BOM items
- Alternate parts (substitutions)
- Product configurations and options
- Revision management (A, B, C revisions with obsolescence)
- Replacement material scenarios
- Configurable products with variants

---

### 6. PRODUCTION PLANNING & SCHEDULING (7 models)

**Purpose:** Production schedule management, work orders, and dispatch

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `ProductionSchedule` | IMPLEMENTED | Master production schedule | ✅ Yes (1 schedule) | High |
| `ScheduleEntry` | IMPLEMENTED | Schedule line items | ✅ Yes (2 entries) | Medium |
| `ScheduleConstraint` | IMPLEMENTED | Constraints (capacity, material, personnel) | ❌ NO | Very High |
| `ScheduleStateHistory` | IMPLEMENTED | Schedule state transitions | ❌ NO | Medium |
| `WorkOrder` | IMPLEMENTED | Production work orders | ✅ Yes (3 WOs) | Very High |
| `WorkOrderStatusHistory` | IMPLEMENTED | Work order lifecycle tracking | ✅ Partial | High |
| `DispatchLog` | IMPLEMENTED | Dispatch records with assignments | ✅ Yes | Medium |

**Seeding Status:** Good baseline but minimal scenarios

**Complex Scenarios Missing:**
- Multi-resource constrained scheduling
- Schedule conflicts and resolution
- Dynamic rescheduling
- Bottleneck scenarios
- Material shortage impacts
- Personnel unavailability impacts
- Work order split/merge scenarios
- Priority/sequence changes during execution

---

### 7. ROUTING & OPERATIONS EXECUTION (6 models)

**Purpose:** Route definitions, step sequencing, and execution tracking

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `Routing` | IMPLEMENTED | Manufacturing route master data | ✅ Yes | Medium |
| `RoutingOperation` | IMPLEMENTED | Route operation sequence | ❌ NO | Medium |
| `RoutingStep` | IMPLEMENTED | Detailed operation steps | ❌ NO | High |
| `RoutingStepDependency` | IMPLEMENTED | Step prerequisites | ❌ NO | Medium |
| `RoutingStepParameter` | IMPLEMENTED | Step-specific parameters | ❌ NO | High |
| `RoutingTemplate` | IMPLEMENTED | Reusable routing templates | ❌ NO | High |

**Seeding Status:** Minimal - only basic routing exists

**Missing Scenarios:**
- Multi-operation routings (5+ operations)
- Alternative routings for same part
- Step-level parameter overrides
- Conditional routing logic
- Rework routing paths
- Subcontract operations
- Setup/teardown step definitions

---

### 8. WORK EXECUTION & PERFORMANCE (4 models)

**Purpose:** Track actual production execution and performance metrics

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `WorkOrderOperation` | IMPLEMENTED | Work order operation instances | ✅ Yes (2 instances) | High |
| `WorkPerformance` | IMPLEMENTED | Labor, machine, quality performance | ✅ Yes (2 records) | Very High |
| `ProductionVariance` | IMPLEMENTED | Variance tracking (cost, quality, schedule) | ✅ Yes (1 variance) | High |
| `EquipmentPerformanceLog` | IMPLEMENTED | Equipment OEE, downtime, efficiency | ✅ Partial | Very High |

**Seeding Status:** Basic scenarios exist

**Complex Scenarios Missing:**
- Multi-day/multi-shift operations
- Concurrent operations on same part
- Machine downtime during operation
- Personnel changes during operation
- Multiple variance types per operation
- Root cause analysis workflows
- Corrective action tracking

---

### 9. QUALITY MANAGEMENT (7 models)

**Purpose:** Quality planning, inspection, measurements, and non-conformance tracking

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `QualityPlan` | IMPLEMENTED | Quality inspection plans | ✅ Yes (1 plan) | High |
| `QualityCharacteristic` | IMPLEMENTED | Measurable quality attributes | ✅ Yes (3 chars) | High |
| `QualityInspection` | IMPLEMENTED | Inspection execution records | ✅ Yes (1 inspection) | Very High |
| `QualityMeasurement` | IMPLEMENTED | Individual measurement results | ✅ Yes (2 measurements) | High |
| `NCR` | IMPLEMENTED | Non-Conformance Reports | ✅ Yes (1 NCR) | Very High |
| `FAIReport` | IMPLEMENTED | First Article Inspection | ✅ Yes (1 FAI) | Very High |
| `FAICharacteristic` | IMPLEMENTED | FAI characteristic results | ✅ Yes (2 characteristics) | High |

**Seeding Status:** Good - core quality workflows present

**Complex Scenarios Missing:**
- Multiple inspection types (RECEIVING, IN-PROCESS, FINAL)
- AQL sampling plans (100%, FIRST_LAST, NORMAL, TIGHTENED, RELAXED)
- Trend analysis (measurements over time)
- Out-of-control conditions
- Multiple NCR levels (CRITICAL, MAJOR, MINOR)
- NCR disposition workflows (SCRAP, REWORK, USE_AS_IS)
- FAI split samples
- Customer quality audits

---

### 10. EQUIPMENT & ASSETS (6 models)

**Purpose:** Equipment lifecycle management, capabilities, logs, and maintenance

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `Equipment` | IMPLEMENTED | Equipment/asset master data | ✅ Yes | Very High |
| `EquipmentCapability` | IMPLEMENTED | Equipment capabilities matrix | ✅ Partial | High |
| `EquipmentLog` | IMPLEMENTED | Equipment activity logs | ✅ Yes | High |
| `EquipmentStateHistory` | IMPLEMENTED | Equipment state transitions | ✅ Partial | High |
| `EquipmentPerformanceLog` | IMPLEMENTED | Performance metrics (OEE, efficiency) | ✅ Partial | Very High |
| `EquipmentCommand` | IMPLEMENTED | IoT equipment commands | ❌ NO | High |

**Seeding Status:** Partial - basic equipment exists

**Complex Scenarios Missing:**
- Equipment hierarchies (Cell → Equipment → Component)
- OEE calculations (Availability × Performance × Quality)
- Equipment downtime scenarios
- Maintenance triggered by performance degradation
- Multi-shift equipment usage patterns
- Equipment calibration status
- Predictive maintenance baselines

---

### 11. INVENTORY & TRANSACTIONS (3 models)

**Purpose:** Inventory management and material transaction tracking

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `Inventory` | IMPLEMENTED | On-hand inventory by location/lot | ✅ Yes (3 records) | Medium |
| `MaterialTransaction` | IMPLEMENTED | All inventory movements | ✅ Yes (3 transactions) | High |
| `PartGenealogy` | IMPLEMENTED | Part parent-child relationships | ✅ Partial | Medium |

**Seeding Status:** Moderate - basic inventory and transactions

**Missing Scenarios:**
- Multi-location inventory movements
- Cycle counts and discrepancies
- Inventory reserve scenarios
- Backorder situations
- Inter-warehouse transfers
- Scrap and rework transactions
- Complex genealogy chains (A ← B ← C ← D)

---

### 12. WORK INSTRUCTIONS & DOCUMENTATION (5 models)

**Purpose:** Digital work instruction delivery and execution tracking

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `WorkInstruction` | IMPLEMENTED | Digital work instruction master | ✅ Yes (1 WI) | High |
| `WorkInstructionStep` | IMPLEMENTED | Instruction steps with media | ✅ Yes (3 steps) | Medium |
| `WorkInstructionExecution` | IMPLEMENTED | Execution instances | ❌ NO | High |
| `WorkInstructionStepExecution` | IMPLEMENTED | Step execution with signatures | ❌ NO | Very High |
| `ElectronicSignature` | IMPLEMENTED | 21 CFR Part 11 signatures | ❌ NO | Very High |

**Seeding Status:** Minimal - only instruction definitions, no executions

**Missing Scenarios:**
- Instruction execution workflows
- Step-by-step signature requirements
- Media attachments (images, videos, PDFs)
- Instruction version management
- Approval chains
- Compliance audit trails
- Multi-language support
- QR code linking to instructions

---

### 13. ADVANCED QUALITY FEATURES (4 models)

**Purpose:** Statistical process control, QIF standards, and sampling

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `SamplingPlan` | IMPLEMENTED | Sampling plans for acceptance testing | ❌ NO | Very High |
| `SamplingInspectionResult` | IMPLEMENTED | Sampling inspection results | ❌ NO | High |
| `QIFMeasurementPlan` | IMPLEMENTED | QIF (Quality Information Framework) plans | ❌ NO | Very High |
| `SPCConfiguration` | IMPLEMENTED | Statistical Process Control setup | ❌ NO | Very High |

**Seeding Status:** None - complex quality features unimplemented

**Missing Scenarios:**
- AQL sampling plans (ANSI/ASQ Z1.4)
- SPC control charts (x-bar, R, p-chart, c-chart)
- Rule violations (Nelson rules, Western Electric rules)
- Trend detection
- Measurement system analysis (MSA/GR&R)

---

### 14. MAINTENANCE MANAGEMENT (4 models)

**Purpose:** Maintenance work order tracking and equipment maintenance

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `MaintenanceWorkOrder` | IMPLEMENTED | Maintenance work order tracking | ❌ NO | High |
| `MeasurementEquipment` | IMPLEMENTED | Calibration equipment master | ❌ NO | Medium |
| `ToolMaintenanceRecord` | IMPLEMENTED | Tool maintenance history | ❌ NO | High |
| `ToolCalibrationRecord` | IMPLEMENTED | Tool calibration tracking | ❌ NO | High |

**Seeding Status:** None - maintenance features unimplemented

**Missing Scenarios:**
- Preventive maintenance schedules
- Maintenance request workflows
- Equipment downtime due to maintenance
- Calibration certificates
- Tool life tracking
- Replacement part recommendations

---

### 15. CNC PROGRAMMING & TOOL MANAGEMENT (6 models)

**Purpose:** CNC program management, tool control, and gauging

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `CNCProgram` | IMPLEMENTED | CNC program master data | ❌ NO | High |
| `ProgramDownloadLog` | IMPLEMENTED | Program download history | ❌ NO | Medium |
| `ProgramLoadAuthorization` | IMPLEMENTED | Program authorization tracking | ❌ NO | Medium |
| `ToolDrawing` | IMPLEMENTED | Tool specification drawings | ❌ NO | Medium |
| `ToolUsageLog` | IMPLEMENTED | Tool usage tracking | ❌ NO | High |
| `OperationGaugeRequirement` | IMPLEMENTED | Gauge requirements per operation | ❌ NO | Medium |

**Seeding Status:** None - CNC and tool management unimplemented

**Missing Scenarios:**
- CNC program versioning
- Program upload/download workflows
- Tool setup with specific parameters
- Tool offset management
- Gauge certification and traceability

---

### 16. ALERTS & NOTIFICATIONS (1 model)

**Purpose:** System alerts and notifications

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `Alert` | IMPLEMENTED | System alerts and notifications | ❌ NO | Medium |

**Seeding Status:** None

**Missing Scenarios:**
- Alert trigger scenarios
- Alert escalation chains
- Alert acknowledgment workflows

---

### 17. SETUP SHEETS & SETUP TRACKING (4 models)

**Purpose:** Setup procedure management and execution

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `SetupSheet` | IMPLEMENTED | Setup procedure master data | ❌ NO | High |
| `SetupStep` | IMPLEMENTED | Setup procedure steps | ❌ NO | Medium |
| `SetupParameter` | IMPLEMENTED | Setup step parameters | ❌ NO | High |
| `SetupExecution` | IMPLEMENTED | Setup execution instances | ❌ NO | High |

**Seeding Status:** None - setup management unimplemented

**Missing Scenarios:**
- Setup checklists
- Setup validation
- Setup sign-off workflows
- Changeover time tracking

---

### 18. INSPECTION PLANS & EXECUTION (3 models)

**Purpose:** Detailed inspection planning and execution

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `InspectionPlan` | IMPLEMENTED | Inspection plan master | ❌ NO | High |
| `InspectionStep` | IMPLEMENTED | Inspection step definitions | ❌ NO | Medium |
| `InspectionExecution` | IMPLEMENTED | Inspection execution instances | ❌ NO | High |

**Seeding Status:** None - inspection execution unimplemented

**Missing Scenarios:**
- Step-by-step inspection workflows
- Inspector qualification requirements
- Inspection result documentation
- Inspection audit trails

---

### 19. STANDARD OPERATING PROCEDURES (3 models)

**Purpose:** SOP management with acknowledgment and audit trails

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `StandardOperatingProcedure` | IMPLEMENTED | SOP master data | ❌ NO | High |
| `SOPAcknowledgment` | IMPLEMENTED | Employee SOP acknowledgments | ❌ NO | Medium |
| `SOPAudit` | IMPLEMENTED | SOP audit trails | ❌ NO | High |

**Seeding Status:** None - SOP management unimplemented

**Missing Scenarios:**
- SOP version control
- Mandatory SOP acknowledgment
- SOP compliance tracking
- SOP audit requirements

---

### 20. INTEGRATION & ERP (6 models)

**Purpose:** External system integration and data exchange

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `IntegrationConfig` | IMPLEMENTED | Integration endpoint configuration | ✅ Partial | High |
| `IntegrationLog` | IMPLEMENTED | Integration transaction logs | ✅ Partial | Medium |
| `ProductionScheduleRequest` | IMPLEMENTED | ERP production schedule requests | ❌ NO | High |
| `ProductionScheduleResponse` | IMPLEMENTED | MES production schedule responses | ❌ NO | High |
| `ProductionPerformanceActual` | IMPLEMENTED | Actual production performance to ERP | ❌ NO | High |
| `ERPMaterialTransaction` | IMPLEMENTED | Material transaction sync to ERP | ✅ Partial | High |

**Seeding Status:** Minimal - basic configuration only

**Missing Scenarios:**
- Multi-endpoint integration
- Error handling and retry scenarios
- Data transformation pipelines
- Sync conflict resolution
- Schedule push/pull workflows
- Performance data export

---

### 21. DATA COLLECTION & IOT (4 models)

**Purpose:** Equipment data collection and IoT integration

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `EquipmentDataCollection` | IMPLEMENTED | Equipment sensor data collection | ❌ NO | Very High |
| `EquipmentCommand` | IMPLEMENTED | Equipment remote commands | ❌ NO | High |
| `EquipmentMaterialMovement` | IMPLEMENTED | Material movement tracking | ❌ NO | Medium |
| `ProcessDataCollection` | IMPLEMENTED | Process parameter data collection | ❌ NO | Very High |

**Seeding Status:** None - IoT integration unimplemented

**Missing Scenarios:**
- Real-time sensor data streams
- Time-series data aggregation
- Equipment telemetry scenarios
- Predictive maintenance baselines

---

### 22. TRACEABILITY (2 models)

**Purpose:** Digital thread and product genealogy

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `SerializedPart` | IMPLEMENTED | Serial number traceability | ✅ Yes (2 serials) | Very High |
| `PartGenealogy` | IMPLEMENTED | Parent-child part relationships | ✅ Partial | High |

**Seeding Status:** Minimal - only basic genealogy

**Missing Scenarios:**
- Multi-generational genealogy
- Backward traceability (what was consumed)
- Forward traceability (what was produced)
- Batch recall scenarios
- Material origin tracking
- Digital thread linkage

---

### 23. DOCUMENT MANAGEMENT (12 models)

**Purpose:** Document lifecycle, annotations, versioning, and access control

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `DocumentTemplate` | IMPLEMENTED | Document template definitions | ❌ NO | Medium |
| `DocumentComment` | IMPLEMENTED | Comments on documents | ❌ NO | Medium |
| `CommentReaction` | IMPLEMENTED | Reactions to comments (emoji, like) | ❌ NO | Low |
| `DocumentAnnotation` | IMPLEMENTED | Document markups/annotations | ❌ NO | High |
| `ReviewAssignment` | IMPLEMENTED | Document review assignments | ❌ NO | High |
| `DocumentActivity` | IMPLEMENTED | Document activity audit trail | ❌ NO | Medium |
| `DocumentSubscription` | IMPLEMENTED | Document subscription notifications | ❌ NO | Medium |
| `UserNotification` | IMPLEMENTED | User notifications | ❌ NO | Medium |
| `DocumentEditSession` | IMPLEMENTED | Concurrent edit session management | ❌ NO | High |
| `ConflictResolution` | IMPLEMENTED | Edit conflict resolution | ❌ NO | High |
| `StoredFile` | IMPLEMENTED | File storage with versioning | ❌ NO | Medium |
| `FileVersion` | IMPLEMENTED | File version history | ❌ NO | Medium |

**Seeding Status:** None - document management unimplemented

**Missing Scenarios:**
- Document review workflows
- Version control with conflict resolution
- Collaborative editing
- Document retention policies
- Access control scenarios

---

### 24. ENGINEERING CHANGE ORDERS (6 models)

**Purpose:** ECO workflow and change management

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `EngineeringChangeOrder` | IMPLEMENTED | ECO master data | ❌ NO | Very High |
| `ECOAffectedDocument` | IMPLEMENTED | Documents affected by ECO | ❌ NO | Medium |
| `ECOTask` | IMPLEMENTED | ECO implementation tasks | ❌ NO | High |
| `ECOAttachment` | IMPLEMENTED | ECO supporting files | ❌ NO | Medium |
| `ECOHistory` | IMPLEMENTED | ECO state history | ❌ NO | Medium |
| `ECOCRBReview` | IMPLEMENTED | Change Review Board decisions | ❌ NO | High |

**Seeding Status:** None - ECO management unimplemented

**Missing Scenarios:**
- ECO workflow (DRAFT → SUBMITTED → REVIEW → APPROVED → IMPLEMENTED)
- Impact analysis
- Document versioning with ECO linkage
- CRB decision workflows

---

### 25. WORKFLOW AUTOMATION (11 models)

**Purpose:** Generic workflow engine for process automation

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `WorkflowDefinition` | IMPLEMENTED | Workflow process definitions | ❌ NO | Very High |
| `WorkflowStage` | IMPLEMENTED | Workflow process stages | ❌ NO | High |
| `WorkflowRule` | IMPLEMENTED | Workflow conditional rules | ❌ NO | Very High |
| `WorkflowInstance` | IMPLEMENTED | Workflow execution instances | ❌ NO | Very High |
| `WorkflowStageInstance` | IMPLEMENTED | Stage execution instances | ❌ NO | High |
| `WorkflowAssignment` | IMPLEMENTED | Task assignments | ❌ NO | High |
| `WorkflowHistory` | IMPLEMENTED | Workflow execution history | ❌ NO | Medium |
| `WorkflowDelegation` | IMPLEMENTED | Task delegation | ❌ NO | Medium |
| `WorkflowTemplate` | IMPLEMENTED | Workflow templates | ❌ NO | High |
| `WorkflowTask` | IMPLEMENTED | Workflow task definitions | ❌ NO | Medium |
| `WorkflowMetrics` | IMPLEMENTED | Workflow performance metrics | ❌ NO | High |

**Seeding Status:** None - workflow engine unimplemented

**Missing Scenarios:**
- NCR approval workflows
- ECO review workflows
- Multi-stage approval chains
- Conditional branching
- Parallel task execution
- Task escalation

---

### 26. TIME TRACKING & LABOR (3 models)

**Purpose:** Labor tracking, cost analysis, and indirect costs

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `TimeTrackingConfiguration` | IMPLEMENTED | Site-specific time tracking config | ❌ NO | Medium |
| `LaborTimeEntry` | IMPLEMENTED | Employee time entries | ❌ NO | High |
| `MachineTimeEntry` | IMPLEMENTED | Equipment/machine runtime tracking | ❌ NO | High |
| `IndirectCostCode` | IMPLEMENTED | Indirect cost allocations | ✅ Yes | Medium |

**Seeding Status:** Minimal - only cost codes

**Missing Scenarios:**
- Shift-based time tracking
- Overtime scenarios
- Labor rate variations
- Cost center allocations
- Machine utilization tracking
- Downtime cost tracking

---

### 27. USER EXPERIENCE & CONFIGURATION (3 models)

**Purpose:** User interface customization and preferences

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `UserWorkstationPreference` | IMPLEMENTED | User workstation preferences | ❌ NO | Low |
| `WorkstationDisplayConfig` | IMPLEMENTED | Workstation display configuration | ❌ NO | Medium |
| `DataCollectionFieldTemplate` | IMPLEMENTED | Custom data collection fields | ❌ NO | Medium |

**Seeding Status:** None - UX configuration unimplemented

---

### 28. BACKUP & RECOVERY (3 models)

**Purpose:** Data backup and restore management

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `BackupSchedule` | IMPLEMENTED | Backup schedule definitions | ❌ NO | Medium |
| `BackupHistory` | IMPLEMENTED | Backup execution history | ❌ NO | Medium |
| `BackupEntry` | IMPLEMENTED | Individual backup entries | ❌ NO | Medium |

**Seeding Status:** None - backup management unimplemented

---

### 29. FILE STORAGE & ACCESS (3 models)

**Purpose:** File storage versioning and access logging

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `FileAccessLog` | IMPLEMENTED | File access audit trail | ❌ NO | Medium |
| `StorageMetrics` | IMPLEMENTED | Storage usage metrics | ❌ NO | Low |
| `MultipartUpload` | IMPLEMENTED | Large file upload management | ❌ NO | Medium |

**Seeding Status:** None - file storage unimplemented

---

### 30. AUTHENTICATION & SECURITY (5 models)

**Purpose:** SSO, authentication events, and session management

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `SsoProvider` | IMPLEMENTED | SSO provider configuration | ❌ NO | High |
| `SsoSession` | IMPLEMENTED | SSO session tracking | ❌ NO | High |
| `AuthenticationEvent` | IMPLEMENTED | Authentication audit trail | ❌ NO | Medium |
| `HomeRealmDiscovery` | IMPLEMENTED | Home realm discovery for SSO | ❌ NO | Medium |
| `Role` (RBAC) | IMPLEMENTED | Dynamic role definitions | ❌ NO | Medium |

**Seeding Status:** None - advanced auth unimplemented

**Missing Scenarios:**
- Multi-provider SSO setup
- SAML/OAuth configurations
- Session timeout scenarios
- Multi-factor authentication
- Permission hierarchy

---

### 31. AUDIT & LOGGING (2 models)

**Purpose:** System-wide audit trails and compliance tracking

| Model | Status | Description | Seeded | Complexity |
|-------|--------|-------------|--------|-----------|
| `AuditLog` | IMPLEMENTED | System audit trail | ✅ Partial | Medium |
| `Permission` (RBAC) | IMPLEMENTED | Permission definitions | ❌ NO | Medium |

**Seeding Status:** Minimal - only basic audit

**Missing Scenarios:**
- Comprehensive audit coverage
- Compliance report generation
- Data retention policies
- Tamper detection

---

## CURRENT SEED DATA COVERAGE

### Seeded Entities (44 total)

#### Auth Service (13 users)
- `User`: 13 users (admin, 2 supervisors, 2 QC, 5 operators, 1 material handler, 1 maintenance, 1 engineer)
- `PersonnelClass`: Basic classifications
- `PersonnelQualification`: Certification definitions
- `PersonnelCertification`: Individual certifications
- `PersonnelSkill`: Skill definitions
- `PersonnelSkillAssignment`: Skill assignments
- `PersonnelWorkCenterAssignment`: Work center assignments
- `PersonnelAvailability`: Basic availability

#### Work Order Service
- `WorkOrder`: 3 work orders (WO-2025-001, WO-2025-002, WO-2025-003)
- `ProductionSchedule`: 1 schedule (October 2025)
- `ScheduleEntry`: 2 entries
- `DispatchLog`: Dispatch records
- `WorkOrderOperation`: 2 operation instances
- `WorkPerformance`: 2 performance records
- `ProductionVariance`: 1 variance
- `WorkInstruction`: 1 instruction with 3 steps

#### Quality Service
- `QualityPlan`: 1 plan (Bracket Final Inspection)
- `QualityCharacteristic`: 3 characteristics
- `QualityInspection`: 1 inspection
- `QualityMeasurement`: 2 measurements
- `NCR`: 1 non-conformance report
- `FAIReport`: 1 First Article Inspection
- `FAICharacteristic`: 2 FAI characteristics

#### Material Service
- `Part`: 4 parts (bracket, shaft, housing, raw aluminum)
- `MaterialLot`: 2 material lots
- `MaterialDefinition`: Core material definitions
- `MaterialProperty`: Property definitions
- `MaterialSublot`: Sublot definitions
- `MaterialStateHistory`: State transition tracking
- `MaterialLotGenealogy`: 1 genealogy relationship
- `Inventory`: 3 inventory records
- `MaterialTransaction`: 3 transactions
- `SerializedPart`: 2 serialized parts

#### Resource Service
- `Site`: 1 site
- `Area`: 1 area
- `WorkCenter`: 1 work center
- `Equipment`: Basic equipment
- `EquipmentLog`: Equipment logs
- `Operation`: 1 operation

#### Integration Service
- `IntegrationConfig`: Basic configuration
- `IntegrationLog`: Integration logs
- `ERPMaterialTransaction`: Material transaction sync

#### Other
- `IndirectCostCode`: Indirect cost codes
- `AuditLog`: Sample audit logs
- `Operation`: 1 operation
- `OperationParameter`: Basic parameters
- `OperationDependency`: Operation dependencies
- `PersonnelOperationSpecification`: Personnel specs
- `EquipmentOperationSpecification`: Equipment specs
- `MaterialOperationSpecification`: Material specs
- `PhysicalAssetOperationSpecification`: Asset specs

---

## MISSING SEED DATA ANALYSIS

### Critical Gaps (Must Have for Comprehensive Testing)

#### 1. Equipment Hierarchy & Monitoring (9 missing models)

**Impact:** HIGH - Equipment is core to production execution

Models Missing:
- `Equipment` (advanced scenarios)
- `EquipmentCapability` (capability matrix)
- `EquipmentStateHistory` (state transitions)
- `EquipmentPerformanceLog` (OEE data)
- `EquipmentCommand` (IoT commands)
- `EquipmentDataCollection` (sensor data)
- `ProcessDataCollection` (parameter collection)
- `MaintenanceWorkOrder` (maintenance workflows)
- `MeasurementEquipment` (calibration equipment)

**Required Scenarios:**
- Multi-equipment production cells
- Equipment downtime during production
- Concurrent equipment usage
- OEE calculation with multiple shifts
- Equipment capability matching to operations
- Predictive maintenance baselines
- Equipment telemetry streams

#### 2. Tool & Gauge Management (6 missing models)

**Impact:** MEDIUM-HIGH - Critical for precision manufacturing

Models Missing:
- `ToolDrawing` (tool specifications)
- `ToolMaintenanceRecord` (tool maintenance)
- `ToolCalibrationRecord` (tool calibration)
- `ToolUsageLog` (tool usage tracking)
- `OperationGaugeRequirement` (gauge requirements)
- `CNCProgram` (CNC program management)

**Required Scenarios:**
- Tool life tracking and replacement
- Tool offset management
- Gauge R&R studies
- Tool pre-inspection workflows
- Multi-tool operations
- Tool cost tracking

#### 3. Setup & Changeover (4 missing models)

**Impact:** MEDIUM - Important for lean manufacturing

Models Missing:
- `SetupSheet` (setup procedures)
- `SetupStep` (setup steps)
- `SetupParameter` (setup parameters)
- `SetupExecution` (setup execution)

**Required Scenarios:**
- Quick changeover procedures
- Setup validation workflows
- Changeover time tracking
- Setup-induced defects
- Multi-operation setups

#### 4. Inspection Planning & Execution (3 missing models)

**Impact:** MEDIUM-HIGH - Compliance critical

Models Missing:
- `InspectionPlan` (inspection planning)
- `InspectionStep` (inspection steps)
- `InspectionExecution` (inspection execution)

**Required Scenarios:**
- In-process inspection
- Setup verification inspection
- 100% inspection scenarios
- Sampling plan execution
- Inspection failure workflows

#### 5. Advanced Quality (5 missing models)

**Impact:** MEDIUM - Regulatory compliance

Models Missing:
- `SamplingPlan` (acceptance sampling)
- `SamplingInspectionResult` (sampling results)
- `SPCConfiguration` (SPC setup)
- `SPCRuleViolation` (SPC violations)
- `QIFMeasurementPlan` (QIF plans)

**Required Scenarios:**
- AQL sampling (100%, FIRST_LAST, NORMAL, TIGHTENED)
- SPC control charts
- Trend detection and alerts
- Measurement system analysis
- Control limit violations

#### 6. Work Instructions & Compliance (5 missing models)

**Impact:** MEDIUM - Critical for compliance

Models Missing:
- `WorkInstructionExecution` (instruction execution)
- `WorkInstructionStepExecution` (step execution)
- `ElectronicSignature` (21 CFR Part 11)
- `InspectionPlan` (inspection instructions)
- `StandardOperatingProcedure` (SOP management)

**Required Scenarios:**
- Step-by-step work execution
- Operator signature requirements
- SOP acknowledgment workflows
- Compliance audit trails
- Instruction version control

#### 7. Workflow Automation (11 missing models)

**Impact:** MEDIUM - Process automation

Models Missing:
- `WorkflowDefinition` (workflow definitions)
- `WorkflowStage` (workflow stages)
- `WorkflowRule` (workflow rules)
- `WorkflowInstance` (workflow instances)
- `WorkflowStageInstance` (stage instances)
- `WorkflowAssignment` (task assignments)
- `WorkflowHistory` (workflow history)
- `WorkflowDelegation` (task delegation)
- `WorkflowTemplate` (workflow templates)
- `WorkflowTask` (workflow tasks)
- `WorkflowMetrics` (workflow metrics)

**Required Scenarios:**
- NCR approval workflows
- ECO review workflows
- Multi-stage approval chains
- Conditional branching
- Parallel approvals

#### 8. Engineering Change Orders (6 missing models)

**Impact:** MEDIUM - Change management

Models Missing:
- `EngineeringChangeOrder` (ECO master)
- `ECOAffectedDocument` (affected documents)
- `ECOTask` (ECO tasks)
- `ECOAttachment` (ECO files)
- `ECOHistory` (ECO history)
- `ECOCRBReview` (CRB reviews)

**Required Scenarios:**
- ECO lifecycle workflows
- Impact analysis
- Implementation tracking
- CRB decision workflows

#### 9. Document Management (12 missing models)

**Impact:** MEDIUM - Compliance & collaboration

Models Missing:
- `DocumentTemplate` (templates)
- `DocumentComment` (comments)
- `CommentReaction` (reactions)
- `DocumentAnnotation` (annotations)
- `ReviewAssignment` (review assignments)
- `DocumentActivity` (activity audit)
- `DocumentSubscription` (subscriptions)
- `UserNotification` (notifications)
- `DocumentEditSession` (edit sessions)
- `ConflictResolution` (conflict resolution)
- `StoredFile` (file storage)
- `FileVersion` (file versions)

**Required Scenarios:**
- Document review workflows
- Version control with conflicts
- Concurrent editing
- Document retention
- Access control

#### 10. Time Tracking & Labor (3 missing models)

**Impact:** MEDIUM - Cost accounting

Models Missing:
- `TimeTrackingConfiguration` (config)
- `LaborTimeEntry` (labor entries)
- `MachineTimeEntry` (machine time)

**Required Scenarios:**
- Shift-based time tracking
- Overtime scenarios
- Labor rate variations
- Cost center allocations
- Machine utilization

#### 11. Traceability & Genealogy (Missing Scenarios)

**Impact:** HIGH - Regulatory compliance

Missing Scenarios:
- Multi-generational genealogy
- Batch recall workflows
- Material origin traceability
- Digital thread linkage
- Backward/forward traceability

#### 12. Schedule Constraints (1 missing model)

**Impact:** MEDIUM - Production scheduling

Models Missing:
- `ScheduleConstraint` (capacity constraints)

**Required Scenarios:**
- Material availability constraints
- Personnel availability constraints
- Equipment capacity constraints
- Schedule conflict resolution

---

## COMPLEX ENTITIES REQUIRING COMPREHENSIVE TEST SCENARIOS

### 1. Work Order Lifecycle (Very High Complexity)

**Entity:** `WorkOrder` + related models

**Current Seed:** 3 basic work orders

**Complex Scenarios Needed:**

| Scenario | Details |
|----------|---------|
| Split WO | Single WO split into multiple sub-orders |
| Merged WO | Multiple WOs consolidated |
| Multi-operation | WO with 5+ complex operations |
| Material Shortage | WO waiting on material availability |
| Equipment Blocked | WO waiting for equipment release |
| Personnel Change | Operator change mid-operation |
| Priority Change | WO priority escalated during execution |
| Rework Flow | Original WO → Quality Issue → Rework WO → Final WO |
| Expedited | Expedited WO inserted into schedule |
| Cancelled | WO cancellation with cleanup |
| Partial Completion | WO completed partially, remainder scrapped |

**Seed Data Needed:**
- 10-15 work orders covering all states (CREATED, RELEASED, STARTED, COMPLETED, CANCELLED, ON_HOLD)
- Complex multi-operation work orders
- Work order hierarchies (parent/child)
- Work order splits and merges
- Rework scenarios

---

### 2. Material Lot Genealogy (Very High Complexity)

**Entity:** `MaterialLot` + `MaterialLotGenealogy` + `MaterialStateHistory`

**Current Seed:** 2 basic lots, 1 genealogy

**Complex Scenarios Needed:**

| Scenario | Details |
|----------|---------|
| Multi-Gen Genealogy | A → B → C → D (4 generations) |
| Lot Merge | 3 sublots merged into single lot |
| Lot Split | Single lot split into 3 sublots |
| Multi-Lot BOM | Assembly uses materials from 5 different lots |
| Lot Rejection | Lot rejected at inspection, traced back |
| Partial Consumption | Lot partially consumed, remainder returned |
| Lot Blending | Materials blended with specific ratios |
| Lot Rework | Reworked lot produces new lot |
| Expired Lot | Lot expiration scenario |
| Supplier Lot Mapping | Multiple supplier lots → single internal lot |

**Seed Data Needed:**
- 20-30 material lots
- Multi-level genealogy chains
- Split/merge scenarios
- Expired lots
- Quarantined lots
- Quality lot status transitions
- Lot-to-work-order traceability

---

### 3. Quality Inspection Workflows (Very High Complexity)

**Entity:** `QualityPlan` + `QualityInspection` + `QualityMeasurement` + `NCR`

**Current Seed:** 1 quality plan, 1 inspection

**Complex Scenarios Needed:**

| Scenario | Details |
|----------|---------|
| RECEIVING Inspection | Incoming material inspection |
| IN_PROCESS Inspection | Mid-production inspection |
| FINAL Inspection | Post-production inspection |
| FIRST_LAST Sampling | Only first & last pieces inspected |
| NORMAL Sampling | AQL sampling (100%, 1.0%, 2.5%, etc.) |
| TIGHTENED Sampling | Increased inspection after failures |
| RELAXED Sampling | Reduced inspection after passes |
| Out-of-Control | SPC violation detected |
| Multi-Characteristic | Inspection with 10+ characteristics |
| Visual Inspection | Visual defect detection |
| Dimensional Inspection | Measured characteristics with tolerances |
| Attribute Inspection | Pass/Fail characteristics |
| Trend Analysis | Measurements showing trend |
| Measurement Repeatability | Same characteristic measured 3 times |

**Seed Data Needed:**
- 10-15 quality plans for different part types
- Plans with varying inspection types (RECEIVING, IN_PROCESS, FINAL)
- Plans with 5-20 characteristics each
- Inspections with different sampling plans
- Out-of-control condition scenarios
- Multiple NCRs with different severities and dispositions
- Electronic signatures on quality records
- FAI scenarios with engineering change
- Traceability back to material lots and work orders

---

### 4. Equipment Performance & Maintenance (Very High Complexity)

**Entity:** `Equipment` + `EquipmentLog` + `EquipmentPerformanceLog` + `MaintenanceWorkOrder`

**Current Seed:** Basic equipment only

**Complex Scenarios Needed:**

| Scenario | Details |
|----------|---------|
| Multi-Shift OEE | Equipment used across 3 shifts |
| Downtime Event | Equipment breakdown during production |
| Degraded Performance | Gradual efficiency decline requiring maintenance |
| Planned Maintenance | Preventive maintenance scheduled |
| Unplanned Maintenance | Emergency maintenance |
| Tool Calibration Due | Equipment requiring calibration |
| Parameter Out-of-Range | Operating parameter exceeded limits |
| Concurrent Usage | Multiple WOs on same equipment |
| Equipment Changeover | Equipment reconfiguration for new part |
| Performance Alert | OEE below threshold |

**Seed Data Needed:**
- 5-10 equipment items with capabilities
- Equipment hierarchies (cell → equipment → component)
- Daily equipment logs across multiple shifts
- OEE calculations with availability, performance, quality
- Equipment downtime events with reasons
- Maintenance work orders
- Tool calibration records
- Equipment state transitions (UP, DOWN, DEGRADED, MAINTENANCE)
- Performance trend data

---

### 5. Production Scheduling & Constraints (Very High Complexity)

**Entity:** `ProductionSchedule` + `ScheduleEntry` + `ScheduleConstraint`

**Current Seed:** 1 schedule with 2 entries

**Complex Scenarios Needed:**

| Scenario | Details |
|----------|---------|
| Multi-Week Schedule | 4-week rolling schedule |
| Material Shortage | Schedule constrained by material availability |
| Equipment Capacity | Schedule constrained by equipment capacity |
| Personnel Availability | Schedule adjusted for staff unavailability |
| Priority Conflict | High-priority WO inserted, affects other orders |
| Schedule Conflict | Order conflicts due to resource constraint |
| Bottleneck Resource | Single equipment bottleneck affecting schedule |
| Multi-Site Scheduling | Scheduling across multiple plants |
| Demand Spike | Sudden increase in demand |
| Schedule Optimization | Algorithm-driven scheduling |

**Seed Data Needed:**
- 2-4 week production schedules
- 20-30 schedule entries with varying priorities
- Multiple work centers with capacity constraints
- Material availability scenarios
- Personnel shift schedules
- Schedule conflicts and resolution
- Constraint tracking (capacity, material, personnel)
- Schedule state history

---

### 6. Personnel Skills & Availability (High Complexity)

**Entity:** `User` + `PersonnelSkill` + `PersonnelCertification` + `PersonnelAvailability`

**Current Seed:** 13 users with basic skills

**Complex Scenarios Needed:**

| Scenario | Details |
|----------|---------|
| Multi-Skill Operator | Operator qualified on multiple machines |
| Certification Expiration | Certification about to expire |
| Certification Suspended | Certification temporarily suspended |
| Certification Revoked | Certification permanently revoked |
| Skill Proficiency Levels | Operators at different competency levels |
| Training Required | New operator requires training |
| Vacation Coverage | Coverage planning during vacation |
| Shift Rotation | Operators rotating through shifts |
| Supervisor Chain | Multi-level reporting structure |
| Cost Center Assignment | Personnel assigned to cost centers |

**Seed Data Needed:**
- 30-50 personnel with diverse roles
- Personnel with 3-5 skills at varying competency levels
- Certification scenarios (active, expired, suspended, revoked)
- Complex shift schedules with recurrence rules
- Vacation and time-off scenarios
- Supervisor hierarchies
- Personnel work center assignments with primary/secondary
- Cost center allocations
- Cross-training plans

---

### 7. CNC Operations & Tool Management (High Complexity)

**Entity:** `Operation` + `OperationParameter` + `CNCProgram` + `ToolDrawing`

**Current Seed:** 1 basic operation

**Complex Scenarios Needed:**

| Scenario | Details |
|----------|---------|
| Multi-Stage Machining | Part requires multiple CNC operations |
| Tool Change Strategy | Optimal tool sequencing for efficiency |
| Parameter Dependency | Feed rate depends on material and tool |
| Tool Life Consumption | Tool reaches life limit mid-operation |
| Program Version Control | Multiple program versions for same part |
| Program Download Log | History of program downloads to equipment |
| Tool Offset Adjustments | Tool wear compensation |
| Spindle Speed Optimization | Optimizing RPM for material and tool |
| Feed Rate Validation | Feed rate within equipment and tool limits |
| Tool Gauge Requirement | Specific gauges required for setup |

**Seed Data Needed:**
- 5-10 CNC operations with multi-stage workflows
- 20-30 operation parameters with dependencies and formulas
- CNC programs with version control
- Tool definitions with specifications
- Tool offset tables
- Program download history
- Tool usage logs
- Gauge requirements per operation
- Parameter validation rules
- Tool change scenarios

---

### 8. Approval Workflows & Compliance (High Complexity)

**Entity:** `ElectronicSignature` + `WorkflowDefinition` + `ReviewAssignment`

**Current Seed:** Minimal workflow support

**Complex Scenarios Needed:**

| Scenario | Details |
|----------|---------|
| Multi-Approver | Requires signatures from multiple people |
| Sequential Approval | Approvals must happen in sequence |
| Parallel Approval | Multiple approvals happen simultaneously |
| Conditional Approval | Approval depends on data values |
| Escalation | Approval escalates if not completed |
| Rejection Workflow | Rejection requires rework and resubmission |
| Audit Trail | Complete 21 CFR Part 11 compliant audit |
| Signature Invalidation | Signature can be invalidated by authorized user |
| Approval Delegation | Delegate approval authority |
| Approval History | Complete history of approvals |

**Seed Data Needed:**
- Workflow definitions for NCR approval
- Workflow definitions for ECO review
- Workflow definitions for FAI approval
- Multi-stage approval chains
- Electronic signatures on quality/engineering records
- Complete audit trails
- Signature timestamps and IP addresses
- Signature invalidation scenarios
- Approval delegation workflows

---

### 9. Rework & Scrap Scenarios (High Complexity)

**Entity:** `WorkOrder` + `ProductionVariance` + `NCR`

**Current Seed:** 1 NCR with scrap disposition

**Complex Scenarios Needed:**

| Scenario | Details |
|----------|---------|
| Defect Detection | Defect found during inspection |
| Quality Investigation | Root cause analysis |
| Rework Decision | Parts approved for rework |
| Rework WO Creation | New work order for rework |
| Rework Success | Rework produces acceptable parts |
| Rework Failure | Rework fails, parts scrapped |
| Use-As-Is Approval | Non-conforming parts approved for use |
| Scrap Disposal | Parts scrapped with documentation |
| Scrap Cost Tracking | Cost of scrap recorded |
| Corrective Action | Actions to prevent recurrence |

**Seed Data Needed:**
- Quality inspections that fail
- NCRs with multiple severity levels (CRITICAL, MAJOR, MINOR)
- NCRs with different dispositions (SCRAP, REWORK, USE_AS_IS)
- Root cause analysis with trending
- Corrective and preventive actions
- Rework work orders linked to original WOs
- Rework success/failure scenarios
- Scrap cost tracking
- Corrective action effectiveness tracking

---

### 10. Digital Thread & Traceability (Very High Complexity)

**Entity:** `SerializedPart` + `PartGenealogy` + `MaterialLotGenealogy` + Multiple cross-references

**Current Seed:** 2 serialized parts, minimal genealogy

**Complex Scenarios Needed:**

| Scenario | Details |
|----------|---------|
| Build Record | Complete assembly history for serial number |
| Component Traceability | All components in assembly traced back |
| Material Origin | Raw material traced to finished product |
| Quality Records Link | Quality inspections linked to serial |
| Test Results Link | Test results linked to serial |
| Operator Information | Operator who produced item recorded |
| Equipment Used | Equipment used to produce item recorded |
| Batch Recall | All serials from lot identified for recall |
| Failure Analysis | Failed unit traced to root cause |
| Warranty Claim | Serial linked to warranty claim |

**Seed Data Needed:**
- 20-30 serialized parts
- Complete genealogy from raw materials through finished product
- Quality records linked to serial numbers
- Work order and operation linkage
- Material lot genealogy
- Assembly hierarchy with component serial numbers
- Test and inspection results linked to serials
- Operator and equipment attribution
- Batch recall scenarios
- Complete digital thread for sample products

---

## SEED DATA GENERATION FRAMEWORK RECOMMENDATIONS

### Framework Architecture

```
SeedDataFramework/
├── Core/
│   ├── BaseSeeder (abstract class for all seeders)
│   ├── EntityFactory (factory pattern for creating realistic data)
│   ├── DataValidator (validate relationships and constraints)
│   └── ScenarioBuilder (build complex scenarios from components)
│
├── Generators/
│   ├── PersonnelGenerator (users, skills, certifications, availability)
│   ├── MaterialGenerator (lots, genealogy, transactions, states)
│   ├── ProductionGenerator (work orders, operations, scheduling)
│   ├── QualityGenerator (plans, inspections, measurements, NCRs)
│   ├── EquipmentGenerator (assets, logs, performance, maintenance)
│   ├── WorkflowGenerator (approval chains, automation)
│   ├── DocumentGenerator (work instructions, SOPs, ECOs)
│   └── IntegrationGenerator (ERP sync, data collection)
│
├── Scenarios/
│   ├── ProductionScenarios/
│   │   ├── SimpleProduction (1 WO, 1 operation, success)
│   │   ├── ComplexProduction (5+ operations, multi-resource)
│   │   ├── ReworkScenario (quality issue → rework → success)
│   │   └── ScrapScenario (quality issue → scrap)
│   │
│   ├── QualityScenarios/
│   │   ├── InspectionPass (all characteristics pass)
│   │   ├── InspectionFail (characteristics fail, NCR created)
│   │   ├── TrendViolation (SPC trend detected)
│   │   ├── OutOfControl (SPC violation)
│   │   └── FAIApproval (FAI workflow)
│   │
│   ├── MaterialScenarios/
│   │   ├── SimpleLot (single lot consumption)
│   │   ├── LotGenealogy (multi-generation genealogy)
│   │   ├── LotSplit (lot split into sublots)
│   │   ├── LotMerge (sublots merged)
│   │   └── BatchRecall (lot recall scenario)
│   │
│   ├── SchedulingScenarios/
│   │   ├── SimpleSchedule (sequential WOs)
│   │   ├── ConstrainedSchedule (material/equipment constraints)
│   │   ├── ConflictResolution (schedule conflicts)
│   │   └── DynamicRescheduling (priority changes)
│   │
│   └── EquipmentScenarios/
│       ├── SuccessfulRun (equipment operates normally)
│       ├── DowntimeEvent (equipment breakdown)
│       ├── MaintenanceRequired (preventive maintenance)
│       └── DegradedPerformance (efficiency decline)
│
├── Data/
│   ├── Dictionaries/ (lookup lists)
│   │   ├── operations.json (standard operations)
│   │   ├── parameters.json (standard parameters)
│   │   ├── materials.json (standard materials)
│   │   ├── equipment.json (standard equipment)
│   │   └── personnel.json (personnel templates)
│   │
│   └── Templates/ (template configurations)
│       ├── WorkOrderTemplate
│       ├── QualityPlanTemplate
│       ├── MaterialLotTemplate
│       └── ProductionScheduleTemplate
│
└── Services/
    ├── SeedOrchestrator (coordinates multi-service seeding)
    ├── DataIntegrityChecker (validates relationships)
    ├── SeedProgressTracker (progress reporting)
    └── SeedCleanup (reset databases)
```

### Key Design Principles

1. **Factory Pattern**: Use builders to create realistic, interconnected data
2. **Scenario Composition**: Build complex scenarios from simpler building blocks
3. **Relationship Integrity**: Ensure all foreign keys and relationships are valid
4. **Configurable Complexity**: Support simple and complex seed scenarios
5. **Data Realism**: Use realistic values, codes, and sequences
6. **Progress Tracking**: Report what's being seeded and counts
7. **Cleanup Support**: Easy reset of seed data for tests
8. **Cross-Service Consistency**: Ensure data consistency across microservices

### Implementation Priority

**Phase 1 (Critical):**
1. Personnel with skills/certifications/availability
2. Materials with lot genealogy
3. Work orders with operations
4. Quality inspections with measurements
5. Basic equipment and capabilities

**Phase 2 (High):**
6. Advanced scheduling with constraints
7. Equipment maintenance and downtime
8. Rework and scrap scenarios
9. Tool and gauge management
10. Electronic signatures and workflow

**Phase 3 (Medium):**
11. Document management workflows
12. Engineering change orders
13. Setup sheets and changeover
14. Time tracking and labor costs
15. Integration endpoints

**Phase 4 (Nice-to-Have):**
16. Advanced SPC and sampling
17. Workflow automation
18. IoT data collection
19. File storage and versioning
20. UX configuration

---

## SUMMARY TABLE: ALL ENTITIES & SEEDING STATUS

| Category | Model | Status | Seeded | Priority | Complexity |
|----------|-------|--------|--------|----------|-----------|
| **ISA-95 Hierarchy** | Enterprise | Impl | ✅ Partial | Medium | Low |
| | Site | Impl | ✅ Yes | High | Low |
| | Area | Impl | ✅ Yes | High | Low |
| | WorkCenter | Impl | ✅ Yes | High | Medium |
| | WorkUnit | Impl | ❌ NO | High | Medium |
| **Personnel** | User | Impl | ✅ Yes | High | High |
| | PersonnelClass | Impl | ✅ Yes | High | Low |
| | PersonnelQualification | Impl | ✅ Yes | High | Medium |
| | PersonnelCertification | Impl | ✅ Yes | High | High |
| | PersonnelSkill | Impl | ✅ Yes | High | Low |
| | PersonnelSkillAssignment | Impl | ✅ Yes | High | Medium |
| | PersonnelWorkCenterAssignment | Impl | ✅ Yes | High | Medium |
| | PersonnelAvailability | Impl | ⚠️ Partial | High | Medium |
| | UserRole | Impl | ❌ NO | Medium | Medium |
| | UserSiteRole | Impl | ❌ NO | Medium | Medium |
| **Materials** | MaterialClass | Impl | ✅ Yes | High | Low |
| | MaterialDefinition | Impl | ✅ Yes | High | High |
| | MaterialProperty | Impl | ✅ Partial | High | High |
| | MaterialLot | Impl | ✅ Yes | High | Very High |
| | MaterialSublot | Impl | ❌ NO | High | High |
| | MaterialLotGenealogy | Impl | ✅ Partial | High | Very High |
| | MaterialStateHistory | Impl | ✅ Partial | High | High |
| | SerializedPart | Impl | ✅ Yes | High | Very High |
| **Operations** | Operation | Impl | ✅ Yes | High | High |
| | OperationParameter | Impl | ✅ Yes | High | Very High |
| | ParameterLimits | Impl | ❌ NO | High | High |
| | ParameterGroup | Impl | ❌ NO | Medium | Medium |
| | ParameterFormula | Impl | ❌ NO | Medium | Very High |
| | OperationDependency | Impl | ✅ Partial | High | Medium |
| | PersonnelOperationSpecification | Impl | ✅ Yes | High | High |
| | EquipmentOperationSpecification | Impl | ✅ Yes | High | High |
| | MaterialOperationSpecification | Impl | ✅ Yes | High | High |
| | PhysicalAssetOperationSpecification | Impl | ✅ Yes | High | Very High |
| **Parts & Products** | Part | Impl | ✅ Yes | High | High |
| | PartSiteAvailability | Impl | ❌ NO | Medium | Medium |
| | BOMItem | Impl | ✅ Partial | High | Medium |
| | ProductSpecification | Impl | ❌ NO | Medium | High |
| | ProductConfiguration | Impl | ❌ NO | Low | Very High |
| **Production Planning** | ProductionSchedule | Impl | ✅ Yes | High | High |
| | ScheduleEntry | Impl | ✅ Yes | High | Medium |
| | ScheduleConstraint | Impl | ❌ NO | High | Very High |
| | ScheduleStateHistory | Impl | ❌ NO | Medium | Medium |
| | WorkOrder | Impl | ✅ Yes | High | Very High |
| | WorkOrderStatusHistory | Impl | ✅ Partial | High | High |
| | DispatchLog | Impl | ✅ Yes | High | Medium |
| **Routing** | Routing | Impl | ✅ Yes | High | Medium |
| | RoutingOperation | Impl | ❌ NO | High | Medium |
| | RoutingStep | Impl | ❌ NO | High | High |
| | RoutingStepDependency | Impl | ❌ NO | High | Medium |
| | RoutingStepParameter | Impl | ❌ NO | High | High |
| | RoutingTemplate | Impl | ❌ NO | Medium | High |
| **Work Execution** | WorkOrderOperation | Impl | ✅ Yes | High | High |
| | WorkPerformance | Impl | ✅ Yes | High | Very High |
| | ProductionVariance | Impl | ✅ Yes | High | High |
| | EquipmentPerformanceLog | Impl | ✅ Partial | High | Very High |
| **Quality** | QualityPlan | Impl | ✅ Yes | High | High |
| | QualityCharacteristic | Impl | ✅ Yes | High | High |
| | QualityInspection | Impl | ✅ Yes | High | Very High |
| | QualityMeasurement | Impl | ✅ Yes | High | High |
| | NCR | Impl | ✅ Yes | High | Very High |
| | FAIReport | Impl | ✅ Yes | High | Very High |
| | FAICharacteristic | Impl | ✅ Yes | High | High |
| **Advanced Quality** | SamplingPlan | Impl | ❌ NO | High | Very High |
| | SamplingInspectionResult | Impl | ❌ NO | High | High |
| | QIFMeasurementPlan | Impl | ❌ NO | Medium | Very High |
| | SPCConfiguration | Impl | ❌ NO | High | Very High |
| **Equipment** | Equipment | Impl | ✅ Yes | High | Very High |
| | EquipmentCapability | Impl | ✅ Partial | High | High |
| | EquipmentLog | Impl | ✅ Yes | High | High |
| | EquipmentStateHistory | Impl | ✅ Partial | High | High |
| | EquipmentPerformanceLog | Impl | ✅ Partial | High | Very High |
| | EquipmentCommand | Impl | ❌ NO | Medium | High |
| **Inventory** | Inventory | Impl | ✅ Yes | High | Medium |
| | MaterialTransaction | Impl | ✅ Yes | High | High |
| | PartGenealogy | Impl | ✅ Partial | High | Medium |
| **Work Instructions** | WorkInstruction | Impl | ✅ Yes | High | High |
| | WorkInstructionStep | Impl | ✅ Yes | High | Medium |
| | WorkInstructionExecution | Impl | ❌ NO | Medium | High |
| | WorkInstructionStepExecution | Impl | ❌ NO | Medium | Very High |
| | ElectronicSignature | Impl | ❌ NO | High | Very High |
| **Maintenance** | MaintenanceWorkOrder | Impl | ❌ NO | High | High |
| | MeasurementEquipment | Impl | ❌ NO | High | Medium |
| | ToolMaintenanceRecord | Impl | ❌ NO | High | High |
| | ToolCalibrationRecord | Impl | ❌ NO | High | High |
| **CNC & Tools** | CNCProgram | Impl | ❌ NO | High | High |
| | ProgramDownloadLog | Impl | ❌ NO | Medium | Medium |
| | ProgramLoadAuthorization | Impl | ❌ NO | Medium | Medium |
| | ToolDrawing | Impl | ❌ NO | High | Medium |
| | ToolUsageLog | Impl | ❌ NO | High | High |
| | OperationGaugeRequirement | Impl | ❌ NO | High | Medium |
| **Setup** | SetupSheet | Impl | ❌ NO | Medium | High |
| | SetupStep | Impl | ❌ NO | Medium | Medium |
| | SetupParameter | Impl | ❌ NO | Medium | High |
| | SetupExecution | Impl | ❌ NO | Medium | High |
| **Inspection** | InspectionPlan | Impl | ❌ NO | High | High |
| | InspectionStep | Impl | ❌ NO | High | Medium |
| | InspectionExecution | Impl | ❌ NO | High | High |
| **SOPs** | StandardOperatingProcedure | Impl | ❌ NO | Medium | High |
| | SOPAcknowledgment | Impl | ❌ NO | Medium | Medium |
| | SOPAudit | Impl | ❌ NO | Medium | High |
| **Workflows** | WorkflowDefinition | Impl | ❌ NO | Medium | Very High |
| | WorkflowStage | Impl | ❌ NO | Medium | High |
| | WorkflowRule | Impl | ❌ NO | Medium | Very High |
| | WorkflowInstance | Impl | ❌ NO | Medium | Very High |
| | WorkflowStageInstance | Impl | ❌ NO | Medium | High |
| | WorkflowAssignment | Impl | ❌ NO | Medium | High |
| | WorkflowHistory | Impl | ❌ NO | Medium | Medium |
| | WorkflowDelegation | Impl | ❌ NO | Medium | Medium |
| | WorkflowTemplate | Impl | ❌ NO | Medium | High |
| | WorkflowTask | Impl | ❌ NO | Medium | Medium |
| | WorkflowMetrics | Impl | ❌ NO | Low | High |
| **ECO** | EngineeringChangeOrder | Impl | ❌ NO | Medium | Very High |
| | ECOAffectedDocument | Impl | ❌ NO | Medium | Medium |
| | ECOTask | Impl | ❌ NO | Medium | High |
| | ECOAttachment | Impl | ❌ NO | Medium | Medium |
| | ECOHistory | Impl | ❌ NO | Medium | Medium |
| | ECOCRBReview | Impl | ❌ NO | Medium | High |
| **Documents** | DocumentTemplate | Impl | ❌ NO | Medium | Medium |
| | DocumentComment | Impl | ❌ NO | Low | Medium |
| | CommentReaction | Impl | ❌ NO | Low | Low |
| | DocumentAnnotation | Impl | ❌ NO | Low | High |
| | ReviewAssignment | Impl | ❌ NO | Medium | High |
| | DocumentActivity | Impl | ❌ NO | Low | Medium |
| | DocumentSubscription | Impl | ❌ NO | Low | Medium |
| | UserNotification | Impl | ❌ NO | Low | Medium |
| | DocumentEditSession | Impl | ❌ NO | Low | High |
| | ConflictResolution | Impl | ❌ NO | Low | High |
| | StoredFile | Impl | ❌ NO | Low | Medium |
| | FileVersion | Impl | ❌ NO | Low | Medium |
| **Time Tracking** | TimeTrackingConfiguration | Impl | ❌ NO | Medium | Medium |
| | LaborTimeEntry | Impl | ❌ NO | Medium | High |
| | MachineTimeEntry | Impl | ❌ NO | Medium | High |
| | IndirectCostCode | Impl | ✅ Yes | Medium | Medium |
| **Integration** | IntegrationConfig | Impl | ✅ Partial | Medium | High |
| | IntegrationLog | Impl | ✅ Partial | Low | Medium |
| | ProductionScheduleRequest | Impl | ❌ NO | Medium | High |
| | ProductionScheduleResponse | Impl | ❌ NO | Medium | High |
| | ProductionPerformanceActual | Impl | ❌ NO | Medium | High |
| | ERPMaterialTransaction | Impl | ✅ Partial | Medium | High |
| **Data Collection** | EquipmentDataCollection | Impl | ❌ NO | Medium | Very High |
| | EquipmentCommand | Impl | ❌ NO | Low | High |
| | EquipmentMaterialMovement | Impl | ❌ NO | Low | Medium |
| | ProcessDataCollection | Impl | ❌ NO | Medium | Very High |
| **Auth & Security** | SsoProvider | Impl | ❌ NO | Low | High |
| | SsoSession | Impl | ❌ NO | Low | High |
| | AuthenticationEvent | Impl | ❌ NO | Low | Medium |
| | HomeRealmDiscovery | Impl | ❌ NO | Low | Medium |
| | Role | Impl | ❌ NO | Medium | Medium |
| | Permission | Impl | ❌ NO | Medium | Medium |
| | RolePermission | Impl | ❌ NO | Medium | Low |
| **Audit** | AuditLog | Impl | ✅ Partial | Medium | Medium |
| **UX Config** | UserWorkstationPreference | Impl | ❌ NO | Low | Low |
| | WorkstationDisplayConfig | Impl | ❌ NO | Low | Medium |
| | DataCollectionFieldTemplate | Impl | ❌ NO | Low | Medium |
| **Backup** | BackupSchedule | Impl | ❌ NO | Low | Medium |
| | BackupHistory | Impl | ❌ NO | Low | Medium |
| | BackupEntry | Impl | ❌ NO | Low | Medium |
| **File Storage** | FileAccessLog | Impl | ❌ NO | Low | Medium |
| | StorageMetrics | Impl | ❌ NO | Low | Low |
| | MultipartUpload | Impl | ❌ NO | Low | Medium |
| **Alerts** | Alert | Impl | ❌ NO | Low | Medium |

---

## RECOMMENDATIONS FOR SEED DATA GENERATION

### Immediate Actions (Sprint 1)

1. **Extend Personnel Scenarios**
   - Create 30-50 personnel with diverse roles
   - Add certification expiration scenarios
   - Implement complex shift schedules
   - Create supervisor hierarchies

2. **Enhance Material Scenarios**
   - Create 20-30 material lots with genealogy
   - Implement lot split/merge scenarios
   - Add quality lot status transitions
   - Create batch recall scenarios

3. **Expand Work Order Coverage**
   - Create 10-15 work orders in various states
   - Implement multi-operation work orders
   - Add rework and scrap scenarios
   - Create split/merge workflows

4. **Improve Quality Data**
   - Create multiple quality plans
   - Implement different sampling methods
   - Add SPC violation scenarios
   - Create trending data for 10+ measurements per characteristic

### Short Term (Sprint 2-3)

5. Create advanced scheduling scenarios with constraints
6. Implement equipment downtime and maintenance workflows
7. Add tool management and calibration scenarios
8. Create setup sheet and changeover workflows
9. Implement electronic signature and compliance workflows

### Medium Term (Sprint 4-6)

10. Create workflow automation scenarios (NCR, ECO, FAI approval)
11. Implement document management workflows
12. Add engineering change order lifecycle
13. Create time tracking and labor cost scenarios
14. Implement integration/ERP sync scenarios

### Long Term (Future)

15. Advanced SPC and statistical analysis scenarios
16. IoT equipment data collection
17. Predictive maintenance baselines
18. Multi-site manufacturing scenarios
19. Advanced workflow with conditional logic

---

**Framework Status:** READY FOR IMPLEMENTATION  
**Estimated Effort:** 3-4 weeks for comprehensive framework with Phase 1 & 2 coverage  
**ROI:** 10-20x reduction in test data manual creation, improved test coverage and realism

