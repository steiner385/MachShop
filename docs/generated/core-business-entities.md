# Core Business Entities in MachShop MES

> **Generated:** 10/30/2025
> **Focus:** Business roles and manufacturing operations context
> **Audience:** Business analysts, system integrators, and manufacturing engineers

## Overview

This document details the core business entities that form the foundation of the MachShop Manufacturing Execution System, explaining their roles in manufacturing operations and how they interact to support complex aerospace and precision manufacturing workflows.

## Table of Contents

1. [Entity Relationship Summary](#entity-relationship-summary)
2. [Foundation Entities](#foundation-entities)
3. [Production Orchestration Entities](#production-orchestration-entities)
4. [Quality and Compliance Entities](#quality-and-compliance-entities)
5. [Material and Asset Entities](#material-and-asset-entities)
6. [Personnel and Security Entities](#personnel-and-security-entities)
7. [Manufacturing Workflow Integration](#manufacturing-workflow-integration)

## Entity Relationship Summary

### Most Connected Entities

| Entity | Relationships | Primary Role | Business Impact |
|--------|---------------|---------------|-----------------|
| **User** | 45 | Personnel & Authentication | Connects all human activities in manufacturing |
| **WorkOrder** | 19 | Production Orchestration | Central hub for all production activities |
| **Part** | 14 | Product Definition | Defines what is manufactured and its specifications |
| **Equipment** | 14 | Asset Management | Tracks manufacturing capabilities and performance |
| **Site** | 13 | Organizational Structure | Provides configuration and security boundaries |
| **Operation** | 10 | Process Definition | Defines how manufacturing work is performed |

## Foundation Entities

### Enterprise & Site Hierarchy

#### **Enterprise**
- **Business Role**: Top-level corporate entity managing multiple manufacturing sites
- **Manufacturing Context**: Provides global policies, standards, and corporate identity
- **Key Relationships**: Owns multiple Sites, defines enterprise-wide standards
- **Compliance Impact**: Required for ITAR, SOX, and international compliance reporting

#### **Site**
- **Business Role**: Individual manufacturing facility with local autonomy
- **Manufacturing Context**: Physical location where production occurs, enables multi-site operations
- **Key Relationships**:
  - Contains Areas, WorkCenters, Equipment
  - Hosts WorkOrders, Users, and local configurations
  - Maintains site-specific TimeTrackingConfiguration
- **Operational Impact**: Enables decentralized manufacturing with centralized oversight

#### **Area**
- **Business Role**: Physical production areas within a site (e.g., "Machining Bay", "Assembly Floor")
- **Manufacturing Context**: Logical grouping of WorkCenters for production flow optimization
- **Key Relationships**: Contains WorkCenters, associated with Equipment
- **Production Impact**: Supports production flow planning and resource allocation

#### **WorkCenter**
- **Business Role**: Logical production centers performing specific types of work
- **Manufacturing Context**: Groups related operations and equipment (e.g., "CNC Machining", "Quality Lab")
- **Key Relationships**:
  - Contains WorkUnits and Equipment
  - Hosts RoutingOperations and ScheduleEntries
  - Assigned to Personnel via PersonnelWorkCenterAssignment
- **Scheduling Impact**: Primary unit for capacity planning and work dispatch

#### **WorkUnit**
- **Business Role**: Individual equipment or workstation within a WorkCenter
- **Manufacturing Context**: Finest granularity for equipment tracking and work assignment
- **Key Relationships**: Contains specific Equipment, enables detailed capacity tracking
- **Operational Impact**: Supports precise scheduling and utilization tracking

## Production Orchestration Entities

### **WorkOrder (19 relationships)**
- **Business Role**: Central coordination entity for all production activities
- **Manufacturing Context**: Authorizes production of specific parts with defined quantities and requirements
- **Key Relationships**:
  - **Part**: Defines what to manufacture
  - **Site**: Where production occurs
  - **User**: Who created and is assigned to the order
  - **ScheduleEntry**: When production is planned
  - **LaborTimeEntry**: Time tracking for completion
  - **QualityInspection**: Quality control activities
  - **MaterialTransaction**: Material consumption tracking
- **Workflow Integration**: Triggers routing execution, quality planning, material allocation, and time tracking
- **Compliance Impact**: Provides traceability for FDA, AS9100, and customer audit requirements

### **Routing**
- **Business Role**: Template defining the sequence of operations needed to manufacture a part
- **Manufacturing Context**: Standard work definition that can be reused across multiple work orders
- **Key Relationships**:
  - **Part**: What part this routing manufactures
  - **RoutingOperation**: Individual steps in the process
  - **RoutingStep**: Detailed operation instructions
  - **ScheduleEntry**: How routing is scheduled in production
- **Operational Impact**: Enables standardization, continuous improvement, and accurate planning

### **Operation**
- **Business Role**: Reusable definition of a manufacturing process or activity
- **Manufacturing Context**: Standard operations (e.g., "Mill Face", "Drill Holes", "Inspect Dimensions")
- **Key Relationships**:
  - **RoutingStep**: How operation is used in specific routings
  - **OperationParameter**: Process parameters and specifications
  - **BOMItem**: Materials required for operation
  - **Equipment/PersonnelSpecs**: Resource requirements
- **Standardization Impact**: Enables consistent process execution and knowledge capture

## Quality and Compliance Entities

### **QualityPlan**
- **Business Role**: Defines quality requirements and inspection procedures for a part
- **Manufacturing Context**: Ensures manufactured parts meet specifications and regulatory requirements
- **Key Relationships**:
  - **Part**: What part this plan covers
  - **QualityCharacteristic**: Specific quality attributes to measure
  - **QualityInspection**: Actual inspection executions
- **Compliance Impact**: Required for AS9100, ISO 9001, and FDA compliance

### **InspectionPlan**
- **Business Role**: Detailed procedures for conducting quality inspections
- **Manufacturing Context**: Step-by-step instructions for quality personnel
- **Key Relationships**:
  - **User**: Who created, approved, and executes inspections
  - **InspectionCharacteristic**: What to measure
  - **InspectionExecution**: Actual inspection activities
- **Quality Impact**: Ensures consistent, traceable quality control

### **NCR (Non-Conformance Report)**
- **Business Role**: Documents and tracks quality issues and their resolution
- **Manufacturing Context**: Critical for continuous improvement and regulatory compliance
- **Key Relationships**:
  - **User**: Who identified and is assigned to resolve issues
  - **Site**: Where the issue occurred
- **Regulatory Impact**: Required for CAPA (Corrective and Preventive Action) processes

## Material and Asset Entities

### **Part (14 relationships)**
- **Business Role**: Central definition of products and components manufactured
- **Manufacturing Context**: Authoritative source for part specifications, drawings, and requirements
- **Key Relationships**:
  - **WorkOrder**: Production authorization
  - **Routing**: How to manufacture
  - **QualityPlan**: Quality requirements
  - **BOMItem**: Component relationships
  - **ProductSpecification**: Technical requirements
  - **SerializedPart**: Individual part instances
  - **Inventory**: Stock tracking
- **Traceability Impact**: Enables complete genealogy tracking for aerospace compliance

### **Equipment (14 relationships)**
- **Business Role**: Manufacturing assets including machines, tools, and measurement devices
- **Manufacturing Context**: Tracks capabilities, availability, and performance of production resources
- **Key Relationships**:
  - **Site/Area/WorkCenter**: Physical location and organization
  - **EquipmentCapability**: What operations equipment can perform
  - **MaintenanceWorkOrder**: Maintenance activities
  - **EquipmentDataCollection**: Real-time performance data
  - **MachineTimeEntry**: Utilization tracking
- **Operational Impact**: Enables predictive maintenance, capacity planning, and OEE tracking

### **MaterialDefinition**
- **Business Role**: Master data for raw materials, components, and supplies
- **Manufacturing Context**: Standardizes material specifications across the enterprise
- **Key Relationships**:
  - **MaterialClass**: Hierarchical categorization
  - **MaterialLot**: Specific material instances
  - **MaterialProperty**: Technical specifications
- **Supply Chain Impact**: Enables vendor management and quality consistency

### **SerializedPart**
- **Business Role**: Individual instances of manufactured parts with unique identification
- **Manufacturing Context**: Enables complete traceability for high-value, regulated products
- **Key Relationships**:
  - **Part**: What part definition this instance follows
  - **PartGenealogy**: Component relationships and assembly history
  - **InspectionRecord**: Quality testing results
  - **QIFMeasurementResult**: Detailed measurement data
- **Compliance Impact**: Critical for recalls, warranty tracking, and regulatory audits

## Personnel and Security Entities

### **User (45 relationships)**
- **Business Role**: Central entity for all human activities in the manufacturing system
- **Manufacturing Context**: Connects authentication, authorization, and audit trailing to all operations
- **Key Relationships**: Connected to virtually every operational table for audit and authorization
- **Security Impact**: Enables comprehensive tracking of who did what, when, and where
- **Compliance Impact**: Required for 21 CFR Part 11 electronic records and FDA validation

### **PersonnelClass**
- **Business Role**: Hierarchical classification of worker roles and responsibilities
- **Manufacturing Context**: Defines job functions, required qualifications, and access levels
- **Key Relationships**:
  - **User**: Personnel assignment to classes
  - **PersonnelQualification**: Required skills and certifications
  - **PersonnelCertification**: Individual worker certifications
- **Training Impact**: Supports skills management and compliance training tracking

### **Role & Permission System**
- **Business Role**: Sophisticated access control supporting manufacturing compliance
- **Manufacturing Context**: Ensures workers can only access appropriate functions and data
- **Key Relationships**:
  - **RoleTemplate**: Standardized role definitions
  - **UserSiteRole**: Site-specific access assignments
  - **PermissionUsageLog**: Comprehensive audit trail
- **Compliance Impact**: Supports FDA, aerospace, and SOX access control requirements

## Manufacturing Workflow Integration

### Production Workflow Integration
```
Part → QualityPlan → WorkOrder → Routing → Operations → Equipment/Personnel
     ↓                    ↓           ↓           ↓               ↓
QualityCharacteristic → Schedule → Execution → TimeTracking → Completion
     ↓                                            ↓
InspectionPlan → InspectionExecution → QualityMeasurement → NCR (if needed)
```

### Material Flow Integration
```
MaterialDefinition → MaterialLot → Inventory → BOMItem → WorkOrder
                                      ↓            ↓          ↓
                          MaterialTransaction → Consumption → Genealogy
```

### Quality Integration
```
Part → QualityPlan → InspectionPlan → InspectionExecution → Results
  ↓         ↓              ↓               ↓                   ↓
Specification → Characteristics → Procedures → Measurements → NCR/CAPA
```

### Document Control Integration
```
WorkInstruction → SetupSheet → StandardOperatingProcedure
        ↓              ↓                    ↓
   Execution → SetupExecution → SOPAcknowledgment → Audit
```

## Business Process Support

### 1. **Order-to-Cash Manufacturing**
- WorkOrder orchestrates production from customer requirements to delivery
- Part definitions ensure manufactured products meet specifications
- Quality systems ensure compliance and customer satisfaction
- Time tracking enables accurate costing and delivery commitments

### 2. **Regulatory Compliance**
- Comprehensive audit trails support FDA, AS9100, and aerospace requirements
- Electronic signatures ensure data integrity and non-repudiation
- Document control maintains current procedures and training records
- Traceability systems support recall management and quality investigations

### 3. **Continuous Improvement**
- NCR and CAPA systems capture and resolve quality issues
- Equipment performance tracking identifies improvement opportunities
- Time and material tracking reveals efficiency gains
- Statistical process control monitors process stability

### 4. **Supply Chain Integration**
- Material definitions and lot tracking ensure supply quality
- ERP integration synchronizes planning and financial systems
- Vendor portal integration extends quality systems to suppliers
- Genealogy tracking supports supplier qualification and audits

---

*This documentation provides business context for understanding how the MachShop MES database entities support real-world manufacturing operations. For technical implementation details, see the database architecture overview and relationship diagrams.*