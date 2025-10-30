# Database Relationship Diagrams

> **Generated:** 10/30/2025
> **Purpose:** Visual representation of key entity relationships and data flows
> **Format:** Text-based diagrams for documentation and system understanding

## Table of Contents

1. [Core Entity Relationship Overview](#core-entity-relationship-overview)
2. [Organizational Hierarchy](#organizational-hierarchy)
3. [Production Workflow Relationships](#production-workflow-relationships)
4. [Quality Management Flow](#quality-management-flow)
5. [Material and Inventory Flow](#material-and-inventory-flow)
6. [User and Security Model](#user-and-security-model)
7. [Document Control Flow](#document-control-flow)
8. [Equipment and Asset Management](#equipment-and-asset-management)
9. [Integration Points](#integration-points)

## Core Entity Relationship Overview

### Central Hub Model
```
                            ┌─────────────────┐
                            │      User       │
                            │   (45 rel.)     │
                            └─────────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
            ┌───────▼────────┐ ┌─────▼──────┐ ┌────────▼───────┐
            │   WorkOrder    │ │    Site    │ │   Equipment    │
            │   (19 rel.)    │ │ (13 rel.)  │ │   (14 rel.)    │
            └───────┬────────┘ └─────┬──────┘ └────────┬───────┘
                    │                │                 │
            ┌───────▼────────┐ ┌─────▼──────┐ ┌────────▼───────┐
            │     Part       │ │ Operation  │ │ MaterialDef    │
            │   (14 rel.)    │ │ (10 rel.)  │ │   (8 rel.)     │
            └────────────────┘ └────────────┘ └────────────────┘
```

### Relationship Density Analysis
```
High Connectivity (10+ relationships):
├── User (45) ────────── Authentication, Audit, Authorization
├── WorkOrder (19) ───── Production Orchestration Hub
├── Part (14) ────────── Product Definition Center
├── Equipment (14) ───── Asset Management Focus
├── Site (13) ─────────── Organizational Anchor
└── Operation (10) ───── Process Definition Core

Medium Connectivity (5-9 relationships):
├── SetupSheet (9) ───── Setup Procedures
├── InspectionPlan (8) ─ Quality Procedures
├── StandardOperatingProcedure (8) ─ SOPs
├── ToolDrawing (8) ──── Tool Management
├── WorkInstruction (7) ─ Work Procedures
├── Routing (7) ──────── Process Templates
└── WorkCenter (7) ───── Production Centers
```

## Organizational Hierarchy

### Multi-Tenant Structure
```
┌────────────────────────────────────────────────────────────┐
│                     Enterprise                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ enterpriseCode, enterpriseName, headquarters        │   │
│  └─────────────────┬───────────────────────────────────┘   │
└────────────────────┼────────────────────────────────────────┘
                     │ 1:N
         ┌───────────▼────────────┐
         │        Site           │
         │  ┌─────────────────┐  │
         │  │ siteCode        │  │
         │  │ siteName        │  │
         │  │ timeTracking    │  │
         │  │ configuration   │  │
         │  └─────────┬───────┘  │
         └───────────┼────────────┘
                     │ 1:N
         ┌───────────▼────────────┐
         │        Area           │
         │  ┌─────────────────┐  │
         │  │ areaCode        │  │
         │  │ areaName        │  │
         │  └─────────┬───────┘  │
         └───────────┼────────────┘
                     │ 1:N
         ┌───────────▼────────────┐
         │     WorkCenter        │
         │  ┌─────────────────┐  │
         │  │ name            │  │
         │  │ description     │  │
         │  └─────────┬───────┘  │
         └───────────┼────────────┘
                     │ 1:N
         ┌───────────▼────────────┐
         │      WorkUnit         │
         │  ┌─────────────────┐  │
         │  │ unitCode        │  │
         │  │ description     │  │
         │  └─────────────────┘  │
         └─────────────────────────┘
```

### Access Control Integration
```
┌──────────────┐    1:N    ┌─────────────────┐    N:M    ┌──────────────┐
│     User     │ ─────────▶│  UserSiteRole   │ ◄────────▶│     Site     │
└──────────────┘           └─────────────────┘           └──────────────┘
       │                            │                            │
       │ 1:N                        │ N:1                        │ 1:N
       ▼                            ▼                            ▼
┌──────────────┐           ┌─────────────────┐           ┌──────────────┐
│   UserRole   │           │      Role       │           │    Area      │
└──────────────┘           └─────────────────┘           └──────────────┘
                                   │ 1:N                         │ 1:N
                                   ▼                             ▼
                           ┌─────────────────┐           ┌──────────────┐
                           │ RolePermission  │           │ WorkCenter   │
                           └─────────────────┘           └──────────────┘
                                   │ N:1
                                   ▼
                           ┌─────────────────┐
                           │   Permission    │
                           └─────────────────┘
```

## Production Workflow Relationships

### Work Order Orchestration
```
                    ┌─────────────────┐
                    │      Part       │
                    │   (Definition)  │
                    └─────────┬───────┘
                              │ 1:N
                    ┌─────────▼───────┐
                    │   WorkOrder     │ ◄──── User (createdBy)
                    │  (Production)   │ ◄──── User (assignedTo)
                    └─────────┬───────┘
                              │ 1:1
                    ┌─────────▼───────┐
                    │ ScheduleEntry   │
                    │  (When/Where)   │
                    └─────────┬───────┘
                              │ N:1
                    ┌─────────▼───────┐
                    │   WorkCenter    │
                    │   (Location)    │
                    └─────────────────┘

┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   LaborTime     │         │ MaterialTrans   │         │ QualityInspect  │
│    Entry        │ ───────▶│    action       │ ◄─────── │     tion        │
└─────────────────┘         └─────────────────┘         └─────────────────┘
         │                           │                           │
         │ N:1                       │ N:1                       │ N:1
         ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   WorkOrder     │ ◄──────▶│   WorkOrder     │ ◄──────▶│   WorkOrder     │
│  (Time Track)   │         │  (Materials)    │         │   (Quality)     │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Routing and Operations Flow
```
┌─────────────────┐    1:N    ┌─────────────────┐    1:1    ┌─────────────────┐
│     Routing     │ ─────────▶│ RoutingOperation│ ─────────▶│   Operation     │
│   (Template)    │           │                 │           │ (Process Def)   │
└─────────┬───────┘           └─────────────────┘           └─────────────────┘
          │ 1:N                                                      │ 1:N
          ▼                                                          ▼
┌─────────────────┐                                         ┌─────────────────┐
│  RoutingStep    │                                         │ OperationParam  │
│   (Detailed)    │                                         │ (Parameters)    │
└─────────┬───────┘                                         └─────────────────┘
          │ N:1
          ▼
┌─────────────────┐
│   WorkCenter    │
│  (Where Done)   │
└─────────────────┘

Dependencies:
┌─────────────────┐    1:N    ┌─────────────────┐    N:1    ┌─────────────────┐
│ RoutingStep     │ ─────────▶│ RoutingStep     │ ◄─────────│ RoutingStep     │
│ (Prerequisite)  │           │   Dependency    │           │ (Dependent)     │
└─────────────────┘           └─────────────────┘           └─────────────────┘
```

## Quality Management Flow

### Quality Planning and Execution
```
┌─────────────────┐    1:1    ┌─────────────────┐    1:N    ┌─────────────────┐
│      Part       │ ─────────▶│  QualityPlan    │ ─────────▶│ QualityCharac   │
│                 │           │                 │           │   teristic      │
└─────────────────┘           └─────────┬───────┘           └─────────────────┘
                                        │ 1:N                        │ 1:N
                                        ▼                            ▼
                              ┌─────────────────┐           ┌─────────────────┐
                              │ QualityInspect  │ ─────────▶│ QualityMeasure  │
                              │     tion        │    1:N    │     ment        │
                              └─────────┬───────┘           └─────────────────┘
                                        │ N:1
                                        ▼
                              ┌─────────────────┐
                              │      User       │
                              │  (Inspector)    │
                              └─────────────────┘

Detailed Inspection Process:
┌─────────────────┐    1:N    ┌─────────────────┐    N:1    ┌─────────────────┐
│ InspectionPlan  │ ─────────▶│ InspectionStep  │ ◄─────────│     User        │
│                 │           │                 │           │ (Approver)      │
└─────────┬───────┘           └─────────────────┘           └─────────────────┘
          │ 1:N
          ▼
┌─────────────────┐
│ InspectionExec  │ ◄──── User (Inspector)
│    ution        │
└─────────┬───────┘
          │ 1:1
          ▼
┌─────────────────┐
│ InspectionRec   │ ◄──── MeasurementEquipment
│     ord         │ ◄──── SerializedPart
└─────────────────┘
```

### Non-Conformance Management
```
┌─────────────────┐                    ┌─────────────────┐
│      NCR        │ ◄──── User ────────│ QualityInspect  │
│ (Non-Conform)   │    (createdBy)     │     tion        │
└─────────┬───────┘                    └─────────────────┘
          │ 1:1
          ▼
┌─────────────────┐
│      Site       │
│   (Location)    │
└─────────────────┘
```

## Material and Inventory Flow

### Material Hierarchy and Tracking
```
┌─────────────────┐    1:N    ┌─────────────────┐    1:N    ┌─────────────────┐
│ MaterialClass   │ ─────────▶│ MaterialClass   │ ─────────▶│ MaterialDef     │
│   (Parent)      │           │   (Child)       │           │                 │
└─────────────────┘           └─────────────────┘           └─────────┬───────┘
                                                                      │ 1:N
                                                            ┌─────────▼───────┐
                                                            │  MaterialLot    │
                                                            │                 │
                                                            └─────────┬───────┘
                                                                      │ 1:N
                                                            ┌─────────▼───────┐
                                                            │ MaterialState   │
                                                            │    History      │
                                                            └─────────────────┘

Material Traceability:
┌─────────────────┐    1:N    ┌─────────────────┐    N:1    ┌─────────────────┐
│ MaterialLot     │ ─────────▶│ MaterialLot     │ ◄─────────│ MaterialLot     │
│   (Parent)      │           │   Genealogy     │           │   (Child)       │
└─────────────────┘           └─────────────────┘           └─────────────────┘
```

### Inventory and Transactions
```
┌─────────────────┐    1:N    ┌─────────────────┐    N:1    ┌─────────────────┐
│      Part       │ ─────────▶│   Inventory     │ ◄─────────│ MaterialTrans   │
│                 │           │                 │           │    action       │
└─────────────────┘           └─────────────────┘           └─────────┬───────┘
                                                                      │ N:1
                                                            ┌─────────▼───────┐
                                                            │   WorkOrder     │
                                                            │ (Consumption)   │
                                                            └─────────────────┘

Bill of Materials:
┌─────────────────┐    1:N    ┌─────────────────┐    N:1    ┌─────────────────┐
│      Part       │ ─────────▶│    BOMItem      │ ◄─────────│      Part       │
│   (Parent)      │           │                 │           │  (Component)    │
└─────────────────┘           └─────────┬───────┘           └─────────────────┘
                                        │ N:1
                                        ▼
                              ┌─────────────────┐
                              │   Operation     │
                              │ (Where Used)    │
                              └─────────────────┘
```

## User and Security Model

### Role-Based Access Control
```
┌─────────────────┐    1:N    ┌─────────────────┐    N:M    ┌─────────────────┐
│     User        │ ─────────▶│   UserRole      │ ◄────────▶│     Role        │
│                 │           │                 │           │                 │
└─────────┬───────┘           └─────────────────┘           └─────────┬───────┘
          │ 1:1                                                      │ 1:N
          ▼                                                          ▼
┌─────────────────┐                                         ┌─────────────────┐
│ PersonnelClass  │                                         │ RolePermission  │
│                 │                                         │                 │
└─────────┬───────┘                                         └─────────┬───────┘
          │ 1:N                                                      │ N:1
          ▼                                                          ▼
┌─────────────────┐                                         ┌─────────────────┐
│ PersonnelQual   │                                         │   Permission    │
│                 │                                         │                 │
└─────────┬───────┘                                         └─────────────────┘
          │ 1:N
          ▼
┌─────────────────┐
│ PersonnelCert   │ ◄──── User
│                 │
└─────────────────┘
```

### Advanced Security Features
```
┌─────────────────┐    1:N    ┌─────────────────┐    1:N    ┌─────────────────┐
│ RoleTemplate    │ ─────────▶│ RoleTemplate    │ ─────────▶│ RoleTemplate    │
│                 │           │   Instance      │           │  UsageLog       │
└─────────┬───────┘           └─────────┬───────┘           └─────────────────┘
          │ N:1                         │ N:1
          ▼                             ▼
┌─────────────────┐           ┌─────────────────┐
│      User       │           │      Site       │
│   (Creator)     │           │                 │
└─────────────────┘           └─────────────────┘

Audit Trail:
┌─────────────────┐    1:N    ┌─────────────────┐
│      User       │ ─────────▶│ PermissionUsage │
│                 │           │      Log        │
└─────────────────┘           └─────────┬───────┘
                                        │ N:1
                              ┌─────────▼───────┐
                              │      Site       │
                              │                 │
                              └─────────────────┘
```

## Document Control Flow

### Document Lifecycle Management
```
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│ DocumentTemplate│ ─────────▶│ WorkInstruction │ ◄────────│      User       │
│                 │    1:N    │                 │   N:1     │  (createdBy)    │
└─────────────────┘           └─────────┬───────┘           └─────────────────┘
                                        │ 1:N                        │
                                        ▼                            │ N:1
                              ┌─────────────────┐                    │
                              │ WorkInstruction │ ◄──────────────────┘
                              │     Step        │       (approvedBy)
                              └─────────┬───────┘
                                        │ 1:N
                                        ▼
                              ┌─────────────────┐
                              │ WorkInstruction │ ◄──── User (operator)
                              │   Execution     │
                              └─────────┬───────┘
                                        │ 1:N
                                        ▼
                              ┌─────────────────┐
                              │ WorkInstruction │ ◄──── User (signedBy)
                              │ StepExecution   │
                              └─────────────────┘

Version Control:
┌─────────────────┐    1:1    ┌─────────────────┐    1:N    ┌─────────────────┐
│   SetupSheet    │ ◄─────────│   SetupSheet    │ ─────────▶│   SetupSheet    │
│ (parentVersion) │           │   (Current)     │           │ (childVersions) │
└─────────────────┘           └─────────────────┘           └─────────────────┘
```

### Standard Operating Procedures
```
┌─────────────────┐    1:N    ┌─────────────────┐
│      SOP        │ ─────────▶│    SOPStep      │
│                 │           │                 │
└─────────┬───────┘           └─────────────────┘
          │ 1:N
          ▼
┌─────────────────┐           ┌─────────────────┐
│      SOP        │           │      SOP        │
│ Acknowledgment  │           │     Audit       │
└─────────┬───────┘           └─────────┬───────┘
          │ N:1                         │ N:1
          ▼                             ▼
┌─────────────────┐           ┌─────────────────┐
│      User       │           │      User       │
│                 │           │   (Auditor)     │
└─────────────────┘           └─────────────────┘
```

## Equipment and Asset Management

### Equipment Organization
```
┌─────────────────┐    N:1    ┌─────────────────┐    N:1    ┌─────────────────┐
│   Equipment     │ ─────────▶│   WorkUnit      │ ─────────▶│  WorkCenter     │
│                 │           │                 │           │                 │
└─────────┬───────┘           └─────────────────┘           └─────────┬───────┘
          │ 1:N                                                      │ N:1
          ▼                                                          ▼
┌─────────────────┐                                         ┌─────────────────┐
│ EquipmentCap    │                                         │      Area       │
│   ability       │                                         │                 │
└─────────────────┘                                         └─────────┬───────┘
                                                                      │ N:1
                                                                      ▼
                                                            ┌─────────────────┐
                                                            │      Site       │
                                                            │                 │
                                                            └─────────────────┘
```

### Equipment Performance and Maintenance
```
┌─────────────────┐    1:N    ┌─────────────────┐    1:N    ┌─────────────────┐
│   Equipment     │ ─────────▶│ EquipmentPerf   │           │ EquipmentState  │
│                 │           │      Log        │           │    History      │
└─────────┬───────┘           └─────────────────┘           └─────────────────┘
          │ 1:N
          ▼
┌─────────────────┐           ┌─────────────────┐
│ Maintenance     │           │ EquipmentData   │
│  WorkOrder      │           │   Collection    │
└─────────────────┘           └─────────┬───────┘
                                        │ N:1
                              ┌─────────▼───────┐
                              │   WorkOrder     │
                              │                 │
                              └─────────────────┘
```

### Measurement Equipment
```
┌─────────────────┐    1:N    ┌─────────────────┐    1:N    ┌─────────────────┐
│ Measurement     │ ─────────▶│ OperationGauge  │           │ InspectionRec   │
│   Equipment     │           │   Requirement   │           │     ord         │
└─────────┬───────┘           └─────────────────┘           └─────────────────┘
          │ 1:N
          ▼
┌─────────────────┐
│ QIFMeasurement  │
│     Result      │
└─────────────────┘
```

## Integration Points

### ERP Integration Architecture
```
┌─────────────────┐    1:N    ┌─────────────────┐    N:1    ┌─────────────────┐
│ IntegrationConf │ ─────────▶│ ERPMaterial     │ ◄─────────│      Part       │
│     ig          │           │  Transaction    │           │                 │
└─────────┬───────┘           └─────────────────┘           └─────────────────┘
          │ 1:N                        │ N:1
          ▼                            ▼
┌─────────────────┐           ┌─────────────────┐
│ ProductionPerf  │           │   WorkOrder     │
│    Actual       │           │                 │
└─────────────────┘           └─────────────────┘

Schedule Integration:
┌─────────────────┐    1:1    ┌─────────────────┐    1:1    ┌─────────────────┐
│ ProductionSched │ ─────────▶│ ProductionSched │ ◄─────────│ IntegrationConf │
│    Request      │           │    Response     │           │     ig          │
└─────────┬───────┘           └─────────────────┘           └─────────────────┘
          │ N:1
          ▼
┌─────────────────┐
│   Equipment     │
│                 │
└─────────────────┘
```

### External System Integration
```
┌─────────────────┐    1:N    ┌─────────────────┐    N:1    ┌─────────────────┐
│  SsoProvider    │ ─────────▶│  SsoSession     │ ◄─────────│      User       │
│                 │           │                 │           │                 │
└─────────┬───────┘           └─────────────────┘           └─────────────────┘
          │ 1:N
          ▼
┌─────────────────┐
│ HomeRealmDisc   │
│    overy        │
└─────────────────┘

Personnel Integration:
┌─────────────────┐    N:1    ┌─────────────────┐
│ PersonnelInfo   │ ─────────▶│ IntegrationConf │
│   Exchange      │           │     ig          │
└─────────────────┘           └─────────────────┘
```

---

*These diagrams provide visual representation of the key relationships within the MachShop MES database. For implementation details and field-level specifications, refer to the comprehensive data dictionary and technical documentation.*