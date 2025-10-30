# MachShop MES Database Architecture Overview

> **Generated:** 10/30/2025
> **Database Tables:** 186
> **Total Fields:** 3,536
> **Relationships:** 417
> **Purpose:** Comprehensive architectural overview of the MachShop Manufacturing Execution System database

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Architecture Philosophy](#database-architecture-philosophy)
3. [Core Domain Models](#core-domain-models)
4. [Functional Domain Organization](#functional-domain-organization)
5. [Entity Relationship Patterns](#entity-relationship-patterns)
6. [Data Flow Architecture](#data-flow-architecture)
7. [Integration Patterns](#integration-patterns)
8. [Scalability and Performance Considerations](#scalability-and-performance-considerations)

## Executive Summary

The MachShop MES database is architected as a comprehensive manufacturing execution system supporting aerospace, medical device, and precision manufacturing operations. The schema contains **186 interconnected tables** organized into **8 primary functional domains**, with **417 relationships** enabling complete traceability and workflow management.

### Key Architectural Characteristics

- **Manufacturing-Centric Design**: Purpose-built for complex manufacturing workflows with emphasis on traceability, quality, and compliance
- **Hierarchical Organization**: Enterprise → Site → Area → WorkCenter → WorkUnit structure enables multi-site operations
- **Audit-First Approach**: Comprehensive audit trails, change tracking, and electronic signatures throughout
- **Flexible Configuration**: Site-level customization supporting diverse manufacturing environments
- **Compliance Ready**: Built-in support for AS9100, FDA 21 CFR Part 11, ISO standards, and ITAR requirements

## Database Architecture Philosophy

### 1. **Domain-Driven Design**
The database is organized around manufacturing business domains rather than technical concerns, enabling clear separation of responsibilities and easier maintenance.

### 2. **Event Sourcing Patterns**
Critical business events (work order status changes, quality measurements, material movements) maintain complete historical records through dedicated state history tables.

### 3. **Multi-Tenant Architecture**
Enterprise → Site hierarchy enables secure multi-tenant operations while maintaining data isolation and site-specific configurations.

### 4. **Workflow-Centric Modeling**
Tables are designed to support configurable manufacturing workflows with dependencies, approvals, and execution tracking.

## Core Domain Models

### Central Business Entities

#### **Enterprise & Site Hierarchy**
```
Enterprise (Root Level)
└── Site (Manufacturing Locations)
    └── Area (Physical Areas)
        └── WorkCenter (Production Centers)
            └── WorkUnit (Individual Equipment)
```

- **Enterprise**: Top-level corporate entity with global policies
- **Site**: Individual manufacturing facilities with local configurations
- **Area**: Physical production areas within sites
- **WorkCenter**: Logical production centers grouping related operations
- **WorkUnit**: Individual pieces of equipment or workstations

#### **Core Manufacturing Entities**

| Entity | Purpose | Key Relationships | Business Impact |
|--------|---------|------------------|-----------------|
| **User** | Personnel and authentication | 45 relationships | Central to all manufacturing activities |
| **WorkOrder** | Production instructions | 19 relationships | Orchestrates all production activities |
| **Part** | Products and components | 14 relationships | Defines what is manufactured |
| **Equipment** | Manufacturing assets | 14 relationships | Tracks capabilities and performance |
| **Operation** | Manufacturing processes | 10 relationships | Defines how work is performed |

### Entity Relationship Complexity

**Highly Connected Entities** (10+ relationships):
- User (45) - Central authentication and audit entity
- WorkOrder (19) - Production orchestration hub
- Part (14) - Product definition center
- Equipment (14) - Asset management focus
- Site (13) - Configuration and organizational anchor
- Operation (10) - Process definition core

## Functional Domain Organization

### 1. **Core Infrastructure (17 tables)**
Foundation tables supporting enterprise structure and basic system operations.

**Key Tables:**
- `Enterprise`, `Site`, `Area`, `WorkCenter`, `WorkUnit`
- `User`, `Role`, `Permission`
- `AuditLog`, `SecurityEvent`

**Purpose:** Provides organizational structure, user management, and security foundation for all other domains.

### 2. **Production Management (26 tables)**
Core manufacturing execution functionality including work orders, scheduling, and production tracking.

**Key Tables:**
- `WorkOrder`, `WorkOrderOperation`, `WorkOrderStatusHistory`
- `ProductionSchedule`, `ScheduleEntry`, `DispatchLog`
- `Routing`, `RoutingOperation`, `RoutingStep`

**Purpose:** Orchestrates all production activities from planning through execution.

### 3. **Quality Management (5 tables)**
Quality control, inspection, and compliance tracking systems.

**Key Tables:**
- `QualityPlan`, `QualityCharacteristic`, `QualityInspection`
- `InspectionPlan`, `InspectionExecution`, `InspectionRecord`
- `NCR` (Non-Conformance Reports)

**Purpose:** Ensures product quality and regulatory compliance throughout manufacturing.

### 4. **Material Management (10 tables)**
Inventory, material tracking, and lot control systems.

**Key Tables:**
- `MaterialDefinition`, `MaterialLot`, `MaterialTransaction`
- `Inventory`, `MaterialLotGenealogy`
- `BOMItem` (Bill of Materials)

**Purpose:** Tracks material flow, inventory levels, and genealogy for traceability.

### 5. **Personnel Management (6 tables)**
Human resources, skills, and workforce management.

**Key Tables:**
- `PersonnelClass`, `PersonnelSkill`, `PersonnelCertification`
- `PersonnelAvailability`, `LaborTimeEntry`

**Purpose:** Manages workforce capabilities, certifications, and time tracking.

### 6. **Document Management (13 tables)**
Work instructions, procedures, and document control.

**Key Tables:**
- `WorkInstruction`, `WorkInstructionStep`, `WorkInstructionExecution`
- `StandardOperatingProcedure`, `SetupSheet`, `ToolDrawing`
- `DocumentTemplate`, `DocumentComment`

**Purpose:** Controls manufacturing documentation and ensures workers have current instructions.

### 7. **Equipment Management (10 tables)**
Asset management, maintenance, and equipment tracking.

**Key Tables:**
- `Equipment`, `EquipmentCapability`, `MeasurementEquipment`
- `MaintenanceWorkOrder`, `ToolCalibrationRecord`
- `EquipmentPerformanceLog`, `EquipmentStateHistory`

**Purpose:** Manages manufacturing assets, maintenance, and equipment performance.

### 8. **Security & Access (10 tables)**
Advanced security, permissions, and audit systems.

**Key Tables:**
- `RoleTemplate`, `RoleTemplateInstance`, `UserSiteRole`
- `PermissionUsageLog`, `PermissionChangeLog`
- `SsoProvider`, `SsoSession`, `AuthenticationEvent`

**Purpose:** Provides sophisticated role-based access control and security monitoring.

## Entity Relationship Patterns

### 1. **Hierarchical Relationships**
Many tables follow organizational or classification hierarchies:

```sql
-- Organizational Hierarchy
Enterprise → Site → Area → WorkCenter → WorkUnit

-- Material Classification
MaterialClass (parent/child hierarchy)

-- Personnel Classification
PersonnelClass (parent/child hierarchy)

-- Document Versioning
Document → DocumentVersion (parent/child)
```

### 2. **State Management Patterns**
Critical entities maintain state history for audit and rollback:

```sql
-- Examples of State History Tables
WorkOrder → WorkOrderStatusHistory
Equipment → EquipmentStateHistory
MaterialLot → MaterialStateHistory
ProductionSchedule → ScheduleStateHistory
```

### 3. **Audit and Traceability Patterns**
Comprehensive tracking of changes and usage:

```sql
-- Audit Patterns
User → AuditLog (all user actions)
Permission → PermissionUsageLog (access tracking)
RoleTemplate → RoleTemplateUsageLog (role changes)

-- Traceability Patterns
SerializedPart → PartGenealogy (component relationships)
MaterialLot → MaterialLotGenealogy (material traceability)
```

### 4. **Workflow and Approval Patterns**
Structured approval processes with electronic signatures:

```sql
-- Document Approval Pattern
Document → User (createdBy)
Document → User (approvedBy)
Document → User (updatedBy)

-- Electronic Signature Tracking
ElectronicSignature → User (signatory)
ElectronicSignature → User (invalidatedBy)
```

## Data Flow Architecture

### 1. **Production Flow**
```
WorkOrder Creation → Routing Assignment → Operation Scheduling →
Work Execution → Quality Inspection → Completion & Archive
```

### 2. **Material Flow**
```
Material Definition → Lot Receiving → Inventory Allocation →
Production Consumption → Genealogy Tracking → Disposition
```

### 3. **Quality Flow**
```
Quality Plan Creation → Inspection Planning → Measurement Execution →
Results Analysis → Non-Conformance Handling → CAPA Tracking
```

### 4. **Document Flow**
```
Document Creation → Review & Approval → Version Control →
Work Instruction Execution → Change Control → Archive
```

## Integration Patterns

### 1. **ERP Integration Points**
- `ERPMaterialTransaction` - Material synchronization
- `ProductionScheduleRequest/Response` - Schedule coordination
- `ProductionPerformanceActual` - Performance reporting

### 2. **External System Integration**
- `IntegrationConfig` - Configuration for external connections
- `PersonnelInfoExchange` - HR system synchronization
- `SsoProvider` - Single sign-on integration

### 3. **Equipment Integration**
- `EquipmentCommand` - Equipment control
- `EquipmentDataCollection` - Real-time data capture
- `ProcessDataCollection` - Process monitoring

## Scalability and Performance Considerations

### 1. **Indexing Strategy**
- Primary keys use CUID for global uniqueness
- Foreign key relationships optimized for join performance
- Unique constraints on business keys (part numbers, work order numbers)

### 2. **Partitioning Opportunities**
- Time-based partitioning for historical data (audit logs, time entries)
- Site-based partitioning for multi-tenant isolation
- Archive strategies for completed work orders and closed documents

### 3. **Caching Patterns**
- Configuration data (site settings, templates) - high read, low write
- User permissions and roles - frequently accessed, occasionally updated
- Active work orders and schedules - high read/write during production

### 4. **Data Archival Strategy**
- Completed work orders with all related data
- Historical quality measurements beyond retention requirements
- Archived audit logs per compliance requirements

---

*This architectural overview provides the foundation for understanding the MachShop MES database design. For detailed field-level documentation, see the comprehensive data dictionary and relationship diagrams.*