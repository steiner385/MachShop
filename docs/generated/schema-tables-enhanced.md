# Enhanced Database Schema Documentation

> **Generated:** 10/30/2025, 9:59:11 AM
> **Total Models:** 186
> **Total Fields:** 3536
> **Total Relationships:** 417

## Overview

This document provides comprehensive documentation for the MachShop Manufacturing Execution System (MES) database schema, enhanced with business context and operational details. The schema implements ISA-95 standards and supports enterprise manufacturing operations across 186 interconnected data models.

## Table of Contents

- [Documentation Coverage Summary](#documentation-coverage-summary)
- [Models by Category](#models-by-category)
- [Detailed Table Definitions](#detailed-table-definitions)
- [Data Governance Information](#data-governance-information)
- [Compliance and Security](#compliance-and-security)
- [Integration Points](#integration-points)
- [Enumerations](#enumerations)

## Documentation Coverage Summary


| Metric | Count | Coverage |
|--------|-------|----------|
| **Tables with Documentation** | 186 / 186 | 100% |
| **Fields with Documentation** | 50 / 3536 | 1% |


## Models by Category


### Core Infrastructure (17 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [Area](#area) | Functional work area within a manufacturing site, such as machining centers, assembly lines, or quality labs | Manufacturing Engineering and Production Management | 11 | 2 | ⚠️ |
| [Enterprise](#enterprise) | Top-level organizational entity representing the entire company or corporation with multiple manufacturing sites | Corporate IT and Operations Management | 9 | 1 | ⚠️ |
| [Equipment](#equipment) | Manufacturing equipment and machinery used in production operations with capability and status tracking | Manufacturing Engineering Team | 47 | 14 | ⚠️ |
| [EquipmentCapability](#equipmentcapability) | Specific capabilities and qualifications of manufacturing equipment including certifications and operational parameters | Manufacturing Engineering and Equipment Management Teams | 12 | 0 | ⚠️ |
| [EquipmentCommand](#equipmentcommand) | Equipment control commands and automation instructions sent to manufacturing equipment with execution tracking and response management | Manufacturing Engineering and Automation Teams | 24 | 0 | ⚠️ |
| [EquipmentDataCollection](#equipmentdatacollection) | Real-time data collection from manufacturing equipment capturing process parameters, sensor readings, and operational metrics for analysis and control | Manufacturing Engineering and Automation Teams | 21 | 0 | ⚠️ |
| [EquipmentLog](#equipmentlog) | Equipment activity logs capturing operational events, maintenance actions, and state changes for comprehensive equipment history | Manufacturing Engineering and Maintenance Teams | 8 | 1 | ⚠️ |
| [EquipmentMaterialMovement](#equipmentmaterialmovement) | Material movements and transactions processed through manufacturing equipment with complete traceability and quality status tracking | Manufacturing Operations and Materials Management Teams | 22 | 1 | ⚠️ |
| [EquipmentOperationSpecification](#equipmentoperationspecification) | Equipment requirements and specifications for manufacturing operations defining equipment capabilities, capacity, and setup requirements | Manufacturing Engineering and Process Engineering Teams | 15 | 0 | ⚠️ |
| [EquipmentPerformanceLog](#equipmentperformancelog) | Equipment performance metrics tracking availability, performance efficiency, and Overall Equipment Effectiveness (OEE) | Manufacturing Engineering and Industrial Engineering Teams | 30 | 0 | ⚠️ |
| [EquipmentStateHistory](#equipmentstatehistory) | Complete history of equipment state transitions tracking operational status, downtime, and utilization patterns | Manufacturing Engineering and Production Control Teams | 14 | 0 | ⚠️ |
| [MeasurementEquipment](#measurementequipment) | Calibrated measurement and inspection equipment with certification tracking and maintenance schedules | Quality Engineering and Metrology Teams | 23 | 3 | ⚠️ |
| [PartSiteAvailability](#partsiteavailability) | Part availability and manufacturing capability by site including costs, lead times, and production constraints for multi-site operations | Production Planning and Site Operations Teams | 17 | 2 | ⚠️ |
| [PersonnelWorkCenterAssignment](#personnelworkcenterassignment) | Assignment of personnel to specific work centers defining operational responsibilities, certifications, and capacity allocation | Human Resources and Manufacturing Engineering Teams | 12 | 2 | ⚠️ |
| [Site](#site) | Manufacturing facility or plant location within an enterprise, representing a physical production location | Site Operations Management and Manufacturing Engineering | 27 | 13 | ⚠️ |
| [UserSiteRole](#usersiterole) | Junction table: User ↔ Role ↔ Site (many-to-many, site-specific) | Not specified | 10 | 2 |  |
| [WorkCenter](#workcenter) | Manufacturing work centers that organize equipment, personnel, and operations within functional areas of the facility | Manufacturing Engineering and Production Planning Teams | 16 | 7 | ⚠️ |

### Personnel Management (6 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [PersonnelClass](#personnelclass) | Hierarchical classification system for organizing personnel by job function, skill level, and organizational responsibility | Human Resources and Manufacturing Engineering Teams | 13 | 4 | ⚠️ |
| [User](#user) | Core user management and authentication system defining personnel identity, access credentials, and organizational information | IT Security and Human Resources Teams | 86 | 45 | ⚠️ |
| [UserNotification](#usernotification) | System-generated notifications and alerts delivered to users for operational updates, task assignments, and system events | System Administration and Operations Management Teams | 12 | 0 | ⚠️ |
| [UserRole](#userrole) | Assignment of system roles to users establishing access permissions and functional capabilities within the MES | IT Security and System Administration Teams | 8 | 1 | ⚠️ |
| [UserSessionLog](#usersessionlog) | Comprehensive logging of user session activities including login times, access patterns, and system interaction tracking | IT Security and System Administration Teams | 12 | 1 | ⚠️ |
| [UserWorkstationPreference](#userworkstationpreference) | User-specific workstation display and interface preferences for optimized work instruction execution and system interaction | Manufacturing Engineering and User Experience Teams | 14 | 0 | ⚠️ |

### Other (94 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [Alert](#alert) | System alerts and notifications for real-time monitoring of manufacturing operations, quality exceptions, and equipment status | Production Control and IT Operations Teams | 10 | 0 | ⚠️ |
| [AuditLog](#auditlog) | System audit logs capturing all critical data changes, user actions, and system events for regulatory compliance and security monitoring | IT Security and Compliance Teams | 11 | 1 | ⚠️ |
| [AuthenticationEvent](#authenticationevent) | Authentication Analytics | Not specified | 14 | 1 |  |
| [BackupEntry](#backupentry) | Backup entries linking files to backup instances | Not specified | 10 | 2 |  |
| [BackupHistory](#backuphistory) | Backup execution history and status tracking | Not specified | 21 | 2 |  |
| [BackupSchedule](#backupschedule) | Backup schedules for automated backup management | Not specified | 25 | 1 |  |
| [CNCProgram](#cncprogram) | CNC machining programs and G-code management with version control and machine-specific optimization for manufacturing operations | Manufacturing Engineering and CNC Programming Teams | 27 | 1 | ⚠️ |
| [CommentReaction](#commentreaction) | Comment Reaction - Reactions to comments | Not specified | 7 | 1 |  |
| [ConfigurationOption](#configurationoption) | Product configuration options and variants enabling customizable manufacturing for different customer requirements and specifications | Product Engineering and Manufacturing Engineering Teams | 17 | 1 | ⚠️ |
| [ConflictResolution](#conflictresolution) | Conflict Resolution - Merge conflict resolutions | Not specified | 13 | 0 |  |
| [CRBConfiguration](#crbconfiguration) | CRB Configuration - Change Review Board setup | Not specified | 11 | 0 |  |
| [DataCollectionFieldTemplate](#datacollectionfieldtemplate) | Data Collection Field Template - Reusable field templates | Not specified | 12 | 0 |  |
| [ECOAttachment](#ecoattachment) | ECO Attachment - Supporting documents for ECOs | Not specified | 12 | 1 |  |
| [ECOCRBReview](#ecocrbreview) | ECO CRB Review - Change Review Board meeting records | Not specified | 18 | 1 |  |
| [ECOHistory](#ecohistory) | ECO History - Complete audit trail for ECO changes | Not specified | 12 | 1 |  |
| [ECORelation](#ecorelation) | ECO Relation - Relationships between ECOs | Not specified | 8 | 2 |  |
| [ECOTask](#ecotask) | ECO Task - Implementation tasks for ECO completion | Not specified | 19 | 1 |  |
| [ElectronicSignature](#electronicsignature) | Electronic signatures for digital document approval and authentication supporting regulatory compliance and audit trails | Quality Assurance and IT Security Teams | 25 | 2 | ⚠️ |
| [EngineeringChangeOrder](#engineeringchangeorder) | Engineering change orders managing all product and process modifications with complete approval workflow and compliance traceability | Engineering Change Management and Product Engineering Teams | 49 | 4 | ⚠️ |
| [ExportTemplate](#exporttemplate) | Export Template - Templates for exporting work instructions | Not specified | 16 | 0 |  |
| [FAICharacteristic](#faicharacteristic) | First Article Inspection characteristics defining specific measurements and acceptance criteria for aerospace and medical device validation | Quality Engineering and Manufacturing Engineering Teams | 23 | 1 | ⚠️ |
| [FAIReport](#faireport) | First Article Inspection reports documenting complete dimensional and functional verification for new or changed manufacturing processes | Quality Assurance and Manufacturing Engineering Teams | 19 | 3 | ⚠️ |
| [FileAccessLog](#fileaccesslog) | File access logging for security and analytics | Not specified | 20 | 1 |  |
| [FileVersion](#fileversion) | File version history for comprehensive version tracking | Not specified | 18 | 1 |  |
| [HomeRealmDiscovery](#homerealmdiscovery) | Home Realm Discovery Rules | Not specified | 8 | 0 |  |
| [InspectionCharacteristic](#inspectioncharacteristic) | Specific measurable attributes and quality characteristics that must be inspected during quality control processes | Quality Engineering Team | 13 | 1 | ⚠️ |
| [InspectionExecution](#inspectionexecution) | Execution records of quality inspection activities tracking inspector actions, measurement completion, and inspection results | Quality Control Team | 15 | 2 | ⚠️ |
| [InspectionPlan](#inspectionplan) | Quality inspection plans defining comprehensive inspection strategies, procedures, and acceptance criteria for manufacturing operations | Quality Assurance and Manufacturing Engineering Teams | 42 | 8 | ⚠️ |
| [InspectionRecord](#inspectionrecord) | Individual inspection records capturing quality measurements and compliance data for manufactured parts and materials | Quality Assurance Team | 14 | 2 | ⚠️ |
| [InspectionStep](#inspectionstep) | Individual steps within inspection procedures defining specific measurement actions, acceptance criteria, and verification requirements | Quality Engineering and Manufacturing Engineering Teams | 8 | 1 | ⚠️ |
| [IntegrationConfig](#integrationconfig) | Integration configuration settings for external system connections including ERP, quality systems, and third-party manufacturing applications | IT Systems and Integration Teams | 21 | 4 | ⚠️ |
| [IntegrationLog](#integrationlog) | Integration transaction logs capturing data exchanges between MES and external systems with error tracking and performance monitoring | IT Systems and Integration Teams | 17 | 1 | ⚠️ |
| [Inventory](#inventory) | Material inventory management tracking quantities, locations, costs, and availability across all manufacturing sites and storage locations | Materials Management and Inventory Control Teams | 14 | 1 | ⚠️ |
| [MultipartUpload](#multipartupload) | Multipart upload session tracking | Not specified | 19 | 0 |  |
| [ParameterFormula](#parameterformula) | Calculated parameters using formulas and expressions to derive values from other parameters for advanced process control | Manufacturing Engineering and Automation Teams | 15 | 1 | ⚠️ |
| [ParameterGroup](#parametergroup) | Hierarchical organization of operation parameters into logical groups for streamlined process management and operator interface design | Manufacturing Engineering and User Experience Teams | 14 | 1 | ⚠️ |
| [ParameterLimits](#parameterlimits) | Control limits and alarm thresholds for operation parameters enabling automatic process monitoring and quality control | Manufacturing Engineering and Quality Engineering Teams | 16 | 1 | ⚠️ |
| [Part](#part) | Master part data defining all manufactured, purchased, and assemblable items with specifications and lifecycle management | Engineering and Product Management Teams | 45 | 14 | ⚠️ |
| [PartGenealogy](#partgenealogy) | Assembly genealogy tracking parent-child relationships between serialized parts for complete product traceability | Manufacturing Operations and Quality Assurance Teams | 8 | 2 | ⚠️ |
| [PersonnelAvailability](#personnelavailability) | Personnel availability schedules tracking work patterns, shifts, time off, and capacity planning for manufacturing resource allocation | Human Resources and Production Planning Teams | 15 | 1 | ⚠️ |
| [PersonnelCertification](#personnelcertification) | Personnel certification records tracking professional credentials, industry certifications, and specialized qualifications for manufacturing operations | Human Resources and Training Management Teams | 15 | 2 | ⚠️ |
| [PersonnelInfoExchange](#personnelinfoexchange) | Data synchronization and integration records for personnel information exchange between MES and external HR/payroll systems | Human Resources and IT Integration Teams | 29 | 1 | ⚠️ |
| [PersonnelQualification](#personnelqualification) | Personnel qualifications and competency records tracking certifications, skills, training completion, and authorization levels for manufacturing operations | Human Resources and Training Management Teams | 14 | 2 | ⚠️ |
| [PersonnelSkill](#personnelskill) | Personnel skill definitions and competency levels for manufacturing operations defining specific technical capabilities and proficiency requirements | Human Resources and Manufacturing Engineering Teams | 9 | 1 | ⚠️ |
| [PersonnelSkillAssignment](#personnelskillassignment) | Personnel skill assignments linking employees to specific skills with competency levels and certification status for work order assignment | Human Resources and Manufacturing Engineering Teams | 13 | 2 | ⚠️ |
| [ProductConfiguration](#productconfiguration) | Product configuration variants and options enabling customizable products with different features and characteristics | Product Management and Sales Engineering Teams | 21 | 2 | ⚠️ |
| [ProductionPerformanceActual](#productionperformanceactual) | Actual production performance data captured from manufacturing operations for ERP integration and performance analysis | Production Control and ERP Integration Teams | 39 | 1 | ⚠️ |
| [ProductLifecycle](#productlifecycle) | Product lifecycle management tracking development phases, production status, and end-of-life planning for manufactured products | Product Management and Engineering Teams | 15 | 1 | ⚠️ |
| [ProductSpecification](#productspecification) | Detailed technical specifications and requirements for parts including dimensions, materials, and performance criteria | Engineering and Quality Assurance Teams | 19 | 1 | ⚠️ |
| [ProgramDownloadLog](#programdownloadlog) | Audit trail and version control for CNC program downloads to manufacturing equipment ensuring program integrity and traceability | Manufacturing Engineering and CNC Programming Teams | 12 | 1 | ⚠️ |
| [ProgramLoadAuthorization](#programloadauthorization) | CNC program loading authorizations ensuring only qualified personnel can load programs to specific machines with complete audit trail | Manufacturing Engineering and CNC Programming Teams | 21 | 0 | ⚠️ |
| [QIFCharacteristic](#qifcharacteristic) | Quality Information Framework (QIF) characteristic definitions specifying measurable quality attributes and their tolerances | Quality Engineering Team | 20 | 2 | ⚠️ |
| [QIFMeasurement](#qifmeasurement) | Individual QIF measurement instances linking measurement results to specific parts and inspection events | Quality Control Team | 17 | 2 | ⚠️ |
| [QIFMeasurementPlan](#qifmeasurementplan) | Quality Information Framework measurement plans defining structured measurement requirements for aerospace and medical device compliance | Quality Engineering and Metrology Teams | 23 | 3 | ⚠️ |
| [QIFMeasurementResult](#qifmeasurementresult) | Quality Information Framework (QIF) measurement results containing actual measured values and statistical analysis data | Quality Control Team | 27 | 5 | ⚠️ |
| [QualityCharacteristic](#qualitycharacteristic) | Quality characteristics and measurement specifications defining inspection requirements, tolerances, and acceptance criteria for manufacturing quality control | Quality Engineering and Quality Assurance Teams | 15 | 2 | ⚠️ |
| [ReviewAssignment](#reviewassignment) | Review Assignment - Document review assignments | Not specified | 23 | 0 |  |
| [SamplingInspectionResult](#samplinginspectionresult) | Statistical sampling inspection results capturing acceptance decisions and quality control outcomes for production lots | Quality Control and Statistical Analysis Teams | 13 | 0 | ⚠️ |
| [SamplingPlan](#samplingplan) | Statistical sampling plans defining inspection frequency, sample sizes, and acceptance criteria for quality control and regulatory compliance | Quality Engineering and Statistical Process Control Teams | 30 | 2 | ⚠️ |
| [ScheduleEntry](#scheduleentry) | Individual scheduled activities linking specific work order operations to equipment, personnel, and time slots | Production Planning Team | 39 | 4 | ⚠️ |
| [SerializedPart](#serializedpart) | Individual serialized parts with unique identifiers enabling complete traceability throughout manufacturing and service life | Manufacturing Operations and Quality Control Teams | 17 | 5 | ⚠️ |
| [SetupExecution](#setupexecution) | Execution records of manufacturing setup procedures tracking completion status, times, and operator verification | Production Operations Team | 15 | 3 | ⚠️ |
| [SetupParameter](#setupparameter) | Configurable parameters and their values required for equipment setup procedures and manufacturing processes | Process Engineering Team | 9 | 1 | ⚠️ |
| [SetupSheet](#setupsheet) | Manufacturing setup sheets providing detailed instructions for equipment configuration, tooling setup, and process preparation for production operations | Manufacturing Engineering and Process Engineering Teams | 42 | 9 | ⚠️ |
| [SetupStep](#setupstep) | Individual steps in manufacturing setup procedures defining specific actions required to configure equipment for production | Manufacturing Engineering Team | 11 | 1 | ⚠️ |
| [SetupTool](#setuptool) | Specific tools and equipment required for manufacturing setup procedures with specifications and usage requirements | Manufacturing Engineering and Tool Management Teams | 9 | 1 | ⚠️ |
| [SOPAcknowledgment](#sopacknowledgment) | Employee acknowledgment and compliance records for Standard Operating Procedure training and understanding verification | Training and Safety Management Teams | 11 | 2 | ⚠️ |
| [SOPAudit](#sopaudit) | Compliance audit records for Standard Operating Procedure adherence verification and corrective action tracking | Quality Assurance and Safety Audit Teams | 12 | 2 | ⚠️ |
| [SOPStep](#sopstep) | Individual steps within Standard Operating Procedures defining specific actions, safety requirements, and process controls | Manufacturing Engineering and Safety Teams | 10 | 1 | ⚠️ |
| [SPCConfiguration](#spcconfiguration) | Statistical Process Control configuration defining control charts, control limits, and monitoring rules for real-time manufacturing process control | Quality Engineering and Process Control Teams | 27 | 2 | ⚠️ |
| [SPCRuleViolation](#spcruleviolation) | Statistical Process Control rule violations tracking out-of-control conditions and triggering corrective actions for quality management | Quality Engineering and Process Control Teams | 19 | 1 | ⚠️ |
| [SsoProvider](#ssoprovider) | SSO Provider Registry | Not specified | 15 | 2 |  |
| [SsoSession](#ssosession) | SSO Session Management | Not specified | 10 | 1 |  |
| [StandardOperatingProcedure](#standardoperatingprocedure) | Standardized operating procedures providing detailed step-by-step instructions for manufacturing operations, safety protocols, and quality procedures | Manufacturing Engineering and Training Teams | 46 | 8 | ⚠️ |
| [StorageMetrics](#storagemetrics) | Storage analytics and metrics for monitoring | Not specified | 31 | 0 |  |
| [StoredFile](#storedfile) | Cloud storage file registry | Not specified | 47 | 5 |  |
| [ToolCalibrationRecord](#toolcalibrationrecord) | Tool and measurement equipment calibration records maintaining traceability and accuracy verification for quality assurance and regulatory compliance | Quality Engineering and Metrology Teams | 12 | 2 | ⚠️ |
| [ToolDrawing](#tooldrawing) | Engineering drawings and technical specifications for manufacturing tools, fixtures, and production equipment | Tool Design Engineering and Manufacturing Engineering Teams | 58 | 8 | ⚠️ |
| [ToolMaintenanceRecord](#toolmaintenancerecord) | Tool and equipment maintenance records tracking service history, repairs, and lifecycle management for manufacturing assets | Maintenance Engineering and Asset Management Teams | 13 | 2 | ⚠️ |
| [ToolUsageLog](#toolusagelog) | Comprehensive usage tracking and lifecycle management for manufacturing tools including utilization, performance, and maintenance history | Tool Management and Manufacturing Engineering Teams | 11 | 2 | ⚠️ |
| [WorkflowAssignment](#workflowassignment) | Task and approval assignments within workflows specifying responsible users, roles, and delegation relationships | Business Process Management and Human Resources Teams | 19 | 1 | ⚠️ |
| [WorkflowDefinition](#workflowdefinition) | Business workflow definitions enabling automated routing of approvals, reviews, and business processes throughout the manufacturing organization | Business Process Management and IT Systems Teams | 15 | 3 | ⚠️ |
| [WorkflowDelegation](#workflowdelegation) | Authority delegation and coverage management for workflow responsibilities enabling business continuity and flexible resource allocation | Business Process Management and Human Resources Teams | 10 | 0 | ⚠️ |
| [WorkflowHistory](#workflowhistory) | Complete audit trail and historical record of all workflow activities, decisions, and state changes for compliance and analysis | Business Process Management and Compliance Teams | 13 | 1 | ⚠️ |
| [WorkflowInstance](#workflowinstance) | Active workflow instances managing approval processes, document reviews, and business process execution with complete audit trails | Business Process Management and Quality Assurance Teams | 16 | 3 | ⚠️ |
| [WorkflowMetrics](#workflowmetrics) | Performance analytics and operational metrics for workflow processes enabling continuous improvement and efficiency optimization | Business Process Management and Performance Analytics Teams | 17 | 0 | ⚠️ |
| [WorkflowParallelCoordination](#workflowparallelcoordination) | Coordination and synchronization management for parallel workflow branches enabling complex multi-path business process execution | Business Process Management and Systems Integration Teams | 18 | 1 | ⚠️ |
| [WorkflowRule](#workflowrule) | Business logic rules and automation conditions that govern workflow behavior, transitions, and decision-making processes | Business Process Management and IT Operations Teams | 14 | 1 | ⚠️ |
| [WorkflowStage](#workflowstage) | Workflow stage definitions within business processes defining approval steps, decision points, and stage-specific requirements | Business Process Management and Quality Assurance Teams | 20 | 2 | ⚠️ |
| [WorkflowStageInstance](#workflowstageinstance) | Active instances of workflow stages tracking real-time progress, approvals, and execution status for ongoing business processes | Business Process Management and Operations Teams | 15 | 4 | ⚠️ |
| [WorkflowTask](#workflowtask) | Individual tasks and action items within workflow stages defining specific work to be completed by assigned users | Business Process Management and Operations Teams | 15 | 0 | ⚠️ |
| [WorkflowTemplate](#workflowtemplate) | Reusable workflow patterns and standardized process templates for consistent business process implementation across the organization | Business Process Management and Quality Teams | 13 | 0 | ⚠️ |
| [WorkPerformance](#workperformance) | Actual production performance data capturing labor, material, and equipment metrics against planned targets for continuous improvement | Production Control and Industrial Engineering Teams | 37 | 1 | ⚠️ |
| [WorkstationDisplayConfig](#workstationdisplayconfig) | Workstation Display Config - Physical display configuration for workstations | Not specified | 13 | 0 |  |

### Material Management (10 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [BOMItem](#bomitem) | Bill of Materials structure defining parent-child relationships between parts with quantities and assembly information | Engineering and Manufacturing Engineering Teams | 23 | 2 | ⚠️ |
| [ERPMaterialTransaction](#erpmaterialtransaction) | Integration transactions with ERP systems for material movements, consumption, and inventory synchronization across enterprise systems | IT Integration and Materials Management Teams | 32 | 2 | ⚠️ |
| [MaterialClass](#materialclass) | Hierarchical classification system for organizing materials by type, characteristics, and usage patterns | Materials Management and Engineering Teams | 18 | 3 | ⚠️ |
| [MaterialDefinition](#materialdefinition) | Detailed specifications and requirements for specific materials including technical properties and supplier information | Materials Engineering and Quality Assurance Teams | 40 | 3 | ⚠️ |
| [MaterialLot](#materiallot) | Individual lots or batches of materials with complete traceability information including supplier certifications and quality data | Materials Management and Quality Control Teams | 48 | 5 | ⚠️ |
| [MaterialLotGenealogy](#materiallotgenealogy) | Parent-child relationships between material lots tracking transformations, combinations, and processing history throughout manufacturing | Materials Management and Quality Assurance Teams | 15 | 0 | ⚠️ |
| [MaterialProperty](#materialproperty) | Physical, chemical, and mechanical properties of materials with test results and certification data | Materials Engineering and Quality Assurance Teams | 16 | 1 | ⚠️ |
| [MaterialStateHistory](#materialstatehistory) | Complete audit trail of material lot state and status transitions including quality events, location changes, and process milestones | Materials Management and Quality Control Teams | 22 | 0 | ⚠️ |
| [MaterialSublot](#materialsublot) | Subdivision of material lots into smaller batches enabling precise material allocation, work order reservations, and inventory control | Materials Management and Production Control Teams | 17 | 0 | ⚠️ |
| [MaterialTransaction](#materialtransaction) | Detailed record of all material movements, consumption, and inventory changes with timestamps and authorization | Materials Management and Production Control Teams | 11 | 1 | ⚠️ |

### Production Management (26 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [DispatchLog](#dispatchlog) | Work order dispatching and resource assignment tracking for production execution with operator and equipment allocation | Production Planning and Scheduling Teams | 19 | 2 | ⚠️ |
| [MaintenanceWorkOrder](#maintenanceworkorder) | Maintenance work orders managing preventive, corrective, and emergency maintenance activities across manufacturing equipment | Maintenance Management and Manufacturing Engineering Teams | 19 | 0 | ⚠️ |
| [MaterialOperationSpecification](#materialoperationspecification) | Material requirements and consumption specifications for manufacturing operations defining material types, quantities, and quality standards | Manufacturing Engineering and Materials Management Teams | 16 | 0 | ⚠️ |
| [Operation](#operation) | Individual manufacturing operations defining specific processes, procedures, and requirements for transforming materials | Manufacturing Engineering and Process Engineering Teams | 40 | 10 | ⚠️ |
| [OperationDependency](#operationdependency) | Dependencies and prerequisites between manufacturing operations defining sequence constraints and timing relationships for production scheduling | Manufacturing Engineering and Production Planning Teams | 14 | 0 | ⚠️ |
| [OperationGaugeRequirement](#operationgaugerequirement) | Measurement equipment and gauge requirements for specific manufacturing operations ensuring proper inspection capability and measurement traceability | Quality Engineering and Manufacturing Engineering Teams | 7 | 1 | ⚠️ |
| [OperationParameter](#operationparameter) | Manufacturing operation parameters defining process variables, settings, and control points for precise manufacturing execution | Manufacturing Engineering and Process Engineering Teams | 24 | 3 | ⚠️ |
| [PersonnelOperationSpecification](#personneloperationspecification) | Personnel requirements and specifications for manufacturing operations defining required skills, certifications, and competency levels | Manufacturing Engineering and Human Resources Teams | 14 | 0 | ⚠️ |
| [PhysicalAssetOperationSpecification](#physicalassetoperationspecification) | Physical asset requirements and specifications for manufacturing operations defining equipment, tooling, and infrastructure needs | Manufacturing Engineering and Asset Management Teams | 15 | 0 | ⚠️ |
| [ProcessDataCollection](#processdatacollection) | Real-time manufacturing process data collection including parameters, measurements, and equipment states for process monitoring and optimization | Manufacturing Engineering and Process Control Teams | 28 | 0 | ⚠️ |
| [ProductionSchedule](#productionschedule) | Master production schedules coordinating work orders, resources, and timeline across the manufacturing facility | Production Planning Team | 28 | 3 | ⚠️ |
| [ProductionScheduleRequest](#productionschedulerequest) | External production scheduling requests from ERP systems or planning applications requiring MES validation and capacity confirmation | Production Planning and Systems Integration Teams | 33 | 3 | ⚠️ |
| [ProductionScheduleResponse](#productionscheduleresponse) | MES responses to external production scheduling requests confirming feasibility, proposing alternatives, or rejecting infeasible schedules | Production Planning and Systems Integration Teams | 20 | 1 | ⚠️ |
| [ProductionVariance](#productionvariance) | Cost and performance variance tracking comparing actual production results against planned targets for continuous improvement | Production Control and Cost Accounting Teams | 26 | 0 | ⚠️ |
| [Routing](#routing) | Manufacturing process routes defining the complete sequence of operations required to produce a specific part or assembly | Manufacturing Engineering and Production Planning Teams | 30 | 6 | ⚠️ |
| [RoutingOperation](#routingoperation) | Specific operations assigned to routings with work center assignments and timing details for manufacturing execution | Manufacturing Engineering and Production Planning Teams | 14 | 1 | ⚠️ |
| [RoutingStep](#routingstep) | Detailed individual steps within operations providing granular control and specific instructions for manufacturing execution | Manufacturing Engineering and Process Engineering Teams | 26 | 4 | ⚠️ |
| [RoutingStepDependency](#routingstepdependency) | Granular dependencies between individual routing steps enabling precise process control and step-level scheduling coordination | Manufacturing Engineering and Process Engineering Teams | 10 | 2 | ⚠️ |
| [RoutingStepParameter](#routingstepparameter) | Specific parameters and settings for individual routing steps enabling precise control of manufacturing operations at the step level | Manufacturing Engineering and Process Engineering Teams | 9 | 1 | ⚠️ |
| [RoutingTemplate](#routingtemplate) | Reusable routing templates enabling standardized process creation, best practice sharing, and manufacturing methodology consistency | Manufacturing Engineering and Process Engineering Teams | 19 | 2 | ⚠️ |
| [ScheduleConstraint](#scheduleconstraint) | Production schedule constraints defining capacity limitations, resource availability, and operational dependencies that must be respected during scheduling | Production Planning and Industrial Engineering Teams | 24 | 1 | ⚠️ |
| [ScheduleStateHistory](#schedulestatehistory) | Audit trail tracking production schedule state transitions and lifecycle changes with timestamp and user accountability | Production Planning and Quality Assurance Teams | 13 | 1 | ⚠️ |
| [WorkOrder](#workorder) | Central production work orders defining specific manufacturing jobs with materials, operations, quantities, and scheduling requirements | Production Planning and Manufacturing Operations Teams | 46 | 19 | ⚠️ |
| [WorkOrderOperation](#workorderoperation) | Individual manufacturing operations within a work order, defining the specific steps, resources, and sequence required to transform materials | Production Engineering Team | 19 | 5 | ⚠️ |
| [WorkOrderStatusHistory](#workorderstatushistory) | Complete audit trail of work order status transitions tracking lifecycle progression, decision points, and operational milestones | Production Control and Manufacturing Operations Teams | 13 | 0 | ⚠️ |
| [WorkUnit](#workunit) | Work center subdivisions representing distinct operational areas within work centers for granular production control and resource allocation | Manufacturing Engineering and Production Planning Teams | 10 | 1 | ⚠️ |

### Quality Management (5 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [AuditReport](#auditreport) | Automated audit reports and compliance documentation generated for regulatory requirements and quality system audits | Quality Assurance and Compliance Teams | 13 | 2 | ⚠️ |
| [NCR](#ncr) | Non-Conformance Reports documenting quality issues, defects, and corrective actions throughout the manufacturing process | Quality Assurance and Continuous Improvement Teams | 26 | 3 | ⚠️ |
| [QualityInspection](#qualityinspection) | Quality inspection records tracking the execution of quality plans with inspector assignments, results, and compliance status | Quality Assurance and Quality Control Teams | 18 | 3 | ⚠️ |
| [QualityMeasurement](#qualitymeasurement) | Individual measurement data collected during quality inspections with actual values, results, and acceptance criteria | Quality Control and Inspection Teams | 9 | 1 | ⚠️ |
| [QualityPlan](#qualityplan) | Quality control plans defining inspection requirements, measurement criteria, and acceptance standards for manufacturing operations | Quality Assurance Team | 12 | 2 | ⚠️ |

### Document Management (13 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [DocumentActivity](#documentactivity) | Document Activity - Activity log for documents | Not specified | 11 | 0 |  |
| [DocumentAnnotation](#documentannotation) | Document Annotation - Visual annotations on media | Not specified | 18 | 0 |  |
| [DocumentComment](#documentcomment) | Document Comment - Threaded comments on documents | Not specified | 25 | 3 |  |
| [DocumentEditSession](#documenteditsession) | Document Edit Session - Real-time collaboration sessions | Not specified | 12 | 0 |  |
| [DocumentSubscription](#documentsubscription) | Document Subscription - User subscriptions to document updates | Not specified | 9 | 0 |  |
| [DocumentTemplate](#documenttemplate) | Standardized document templates for creating consistent manufacturing documents, forms, and reports | Quality Management and Document Control Teams | 18 | 2 | ⚠️ |
| [ECOAffectedDocument](#ecoaffecteddocument) | ECO Affected Document - Links ECOs to documents that need updates | Not specified | 16 | 1 |  |
| [WorkInstruction](#workinstruction) | Detailed step-by-step instructions for manufacturing operations, processes, and procedures | Manufacturing Engineering and Process Engineering Teams | 36 | 7 | ⚠️ |
| [WorkInstructionExecution](#workinstructionexecution) | Records of work instruction execution including operator, timing, and completion status for specific work orders | Production Control and Quality Assurance Teams | 13 | 2 | ⚠️ |
| [WorkInstructionMedia](#workinstructionmedia) | Multimedia content for work instructions including images, videos, animations, and interactive content supporting manufacturing operations | Manufacturing Engineering and Technical Documentation Teams | 16 | 0 | ⚠️ |
| [WorkInstructionRelation](#workinstructionrelation) | Work Instruction Relation - Relationships between work instructions | Not specified | 7 | 0 |  |
| [WorkInstructionStep](#workinstructionstep) | Individual steps within work instructions containing specific actions, parameters, and verification requirements | Manufacturing Engineering and Process Engineering Teams | 15 | 0 | ⚠️ |
| [WorkInstructionStepExecution](#workinstructionstepexecution) | Detailed execution records for individual work instruction steps including data collection, verification, and timing | Production Control and Quality Assurance Teams | 14 | 1 | ⚠️ |

### Security & Access (10 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [Permission](#permission) | Enhanced Permission model - Replaces placeholder in auth service | Not specified | 11 | 2 |  |
| [PermissionChangeLog](#permissionchangelog) | Permission Change History | Not specified | 14 | 3 |  |
| [PermissionUsageLog](#permissionusagelog) | Permission Usage Tracking | Not specified | 14 | 2 |  |
| [Role](#role) | Enhanced Role model - Replaces placeholder in auth service | Not specified | 13 | 4 |  |
| [RolePermission](#rolepermission) | Junction table: Role ↔ Permission (many-to-many) | Not specified | 7 | 0 |  |
| [RoleTemplate](#roletemplate) | Role Template Actions for Audit Trail | Not specified | 18 | 5 |  |
| [RoleTemplateInstance](#roletemplateinstance) | Role Template Instance - Tracks when templates are instantiated into actual roles | Not specified | 15 | 3 |  |
| [RoleTemplatePermission](#roletemplatepermission) | Role Template Permissions - Defines permissions included in each template | Not specified | 9 | 0 |  |
| [RoleTemplateUsageLog](#roletemplateusagelog) | Role Template Usage Log - Audit trail for template operations | Not specified | 14 | 4 |  |
| [SecurityEvent](#securityevent) | Security Event Monitoring | Not specified | 16 | 3 |  |

### Time Tracking (5 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [IndirectCostCode](#indirectcostcode) | Indirect cost codes (non-productive time) | Not specified | 15 | 2 |  |
| [LaborTimeEntry](#labortimeentry) | Labor time entry (operator clocking in/out) | Not specified | 33 | 2 |  |
| [MachineTimeEntry](#machinetimeentry) | Machine time entry (equipment run time) | Not specified | 22 | 0 |  |
| [TimeEntryValidationRule](#timeentryvalidationrule) | Time entry validation rules (business logic) | Not specified | 10 | 0 |  |
| [TimeTrackingConfiguration](#timetrackingconfiguration) | Time tracking configuration (site level) | Not specified | 21 | 1 |  |

## Detailed Table Definitions


### Enterprise

**Description:** Top-level organizational entity representing the entire company or corporation with multiple manufacturing sites

**Business Purpose:** Provides the highest level of organizational hierarchy for multi-site manufacturing operations, enabling corporate-level reporting and governance

**Data Governance:**
- **Data Owner:** Corporate IT and Operations Management
- **Update Frequency:** Rarely updated, typically during corporate restructuring or acquisitions
- **Data Retention:** Permanent retention for corporate records and regulatory compliance
- **Security Classification:** Internal - Corporate organizational information

**Compliance Notes:** Corporate entity information required for regulatory reporting, financial consolidation, and international trade compliance

**System Integrations:** ERP Corporate Module, Financial Reporting Systems, Regulatory Compliance Platforms, Business Intelligence

**Fields (9):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| enterpriseCode | String | ✓ |  | Unique alphanumeric identifier for the enterprise following corporate naming standards | Primary reference for all corporate reporting, financial consolidation, and regulatory filings |
| enterpriseName | String | ✓ |  | Official legal name of the enterprise as registered with regulatory authorities | Used in all legal documents, contracts, and regulatory submissions |
| description | String |  |  |  |  |
| headquarters | String |  |  | Primary corporate headquarters location for legal and administrative purposes | Determines tax obligations, regulatory requirements, and legal jurisdiction |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| sites | Site[] | ✓ |  |  |  |

**Field Details:**

#### enterpriseCode

- **Data Source:** Corporate IT during enterprise setup or acquisition integration
- **Format:** COMPANY-DIVISION format (e.g., ACME-AERO, MEDTECH-01)
- **Validation:** Must be uppercase, alphanumeric with hyphens, 6-20 characters
- **Examples:** ACME-AERO - Aerospace division of ACME Corporation, BOEING-COMM - Commercial aircraft division, GE-AVIATION - General Electric aviation unit

#### enterpriseName

- **Data Source:** Legal department and corporate registration documents
- **Validation:** Must match official corporate documents, required for legal compliance
- **Examples:** ACME Aerospace Corporation, Boeing Commercial Airplanes, General Electric Aviation

#### headquarters

- **Data Source:** Corporate legal department and SEC filings
- **Format:** City, State/Province, Country format
- **Examples:** Seattle, WA, USA, Chicago, IL, USA, Toulouse, France

**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | Site | sites | ✓ |  |

**Usage Examples:**

#### Aerospace manufacturing corporation

Multi-national aerospace company with facilities across North America and Europe

```json
{
  "enterpriseCode": "ACME-AERO",
  "enterpriseName": "ACME Aerospace Corporation",
  "description": "Leading manufacturer of commercial aircraft components",
  "headquarters": "Seattle, WA, USA",
  "isActive": true
}
```

#### Medical device manufacturer

Specialized medical device manufacturer with strict FDA compliance requirements

```json
{
  "enterpriseCode": "MED-TECH-01",
  "enterpriseName": "MedTech Solutions Inc.",
  "description": "FDA-regulated medical device manufacturing",
  "headquarters": "Boston, MA, USA",
  "isActive": true
}
```

**Common Queries:**
- List all active enterprises for corporate reporting
- Find enterprise details for regulatory filing
- Generate enterprise-level production summaries

**Related Tables:** Site, User, AuditReport, SecurityEvent

**Constraints & Indexes:**

- **Primary Key:** id

---

### Site

**Description:** Manufacturing facility or plant location within an enterprise, representing a physical production location

**Business Purpose:** Organizes manufacturing operations by geographic location, enabling site-specific planning, scheduling, and compliance management

**Data Governance:**
- **Data Owner:** Site Operations Management and Manufacturing Engineering
- **Update Frequency:** Updated when facilities are opened, closed, or significantly reconfigured
- **Data Retention:** Permanent retention for facility history and regulatory compliance
- **Security Classification:** Internal - Facility and location information

**Compliance Notes:** Site registration required for regulatory compliance (FDA establishment registration, ISO certifications, environmental permits)

**System Integrations:** ERP Plant Management, Environmental Management Systems, Facility Management, Local Regulatory Systems

**Fields (27):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| siteCode | String | ✓ |  | Unique identifier for manufacturing site following corporate site naming standards | Primary reference for all site-specific operations, scheduling, and reporting |
| siteName | String | ✓ |  | Descriptive name of the manufacturing facility for operational identification | Used in operational communications, shipping documents, and customer communications |
| location | String |  |  | Physical address or geographic location of the manufacturing site | Critical for logistics, shipping, emergency response, and regulatory compliance |
| enterpriseId | String |  |  | Foreign key linking site to its parent enterprise organization | Defines corporate ownership and reporting hierarchy for financial and operational reporting |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| areas | Area[] | ✓ |  |  |  |
| auditReports | AuditReport[] | ✓ |  |  |  |
| equipment | Equipment[] | ✓ |  |  |  |
| indirectCostCodes | IndirectCostCode[] | ✓ |  |  |  |
| ncrs | NCR[] | ✓ |  |  |  |
| operations | Operation[] | ✓ |  |  |  |
| partAvailability | PartSiteAvailability[] | ✓ |  |  |  |
| permissionChangeLogs | PermissionChangeLog[] | ✓ |  |  |  |
| permissionUsageLogs | PermissionUsageLog[] | ✓ |  |  |  |
| productionSchedules | ProductionSchedule[] | ✓ |  |  |  |
| routingTemplates | RoutingTemplate[] | ✓ |  |  |  |
| routings | Routing[] | ✓ |  |  |  |
| securityEvents | SecurityEvent[] | ✓ |  |  |  |
| enterprise | Enterprise |  |  |  |  |
| timeTrackingConfiguration | TimeTrackingConfiguration |  |  |  |  |
| userSiteRoles | UserSiteRole[] | ✓ |  |  |  |
| workOrders | WorkOrder[] | ✓ |  |  |  |
| roleTemplateInstances | RoleTemplateInstance[] | ✓ |  |  |  |
| roleTemplateUsageLogs | RoleTemplateUsageLog[] | ✓ |  |  |  |

**Field Details:**

#### siteCode

- **Data Source:** Corporate facilities management and site operations
- **Format:** LOCATION-NN format where LOCATION is 3-letter city code and NN is sequential number
- **Validation:** Must follow corporate naming standard, be unique across enterprise
- **Examples:** ATL-01 - First site in Atlanta, DFW-02 - Second site in Dallas-Fort Worth area, SEA-03 - Third site in Seattle area
- **Integration Mapping:**
  - erpSystem: PlantCode
  - facilityManagement: SiteID

#### siteName

- **Data Source:** Site operations management and facilities planning
- **Examples:** Atlanta Manufacturing Center, Dallas Assembly Plant, Seattle Engine Components Facility

#### location

- **Data Source:** Facilities management and logistics planning
- **Format:** City, State/Province, Country or full street address
- **Validation:** Must be valid geographic location
- **Examples:** Atlanta, GA, USA, 1234 Manufacturing Drive, Dallas, TX 75201, USA, Toulouse, Haute-Garonne, France

#### enterpriseId

- **Data Source:** Corporate organizational structure and site ownership records
- **Validation:** Must exist in Enterprise table, required for organizational hierarchy

**Relationships (13):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | Area | areas | ✓ |  |
| one-to-many | AuditReport | auditReports | ✓ |  |
| one-to-many | IndirectCostCode | indirectCostCodes | ✓ |  |
| one-to-many | PartSiteAvailability | partAvailability | ✓ |  |
| one-to-many | PermissionChangeLog | permissionChangeLogs | ✓ |  |
| one-to-many | PermissionUsageLog | permissionUsageLogs | ✓ |  |
| one-to-many | ProductionSchedule | productionSchedules | ✓ |  |
| one-to-many | RoutingTemplate | routingTemplates | ✓ |  |
| one-to-one | Enterprise | enterprise |  |  |
| one-to-one | TimeTrackingConfiguration | timeTrackingConfiguration |  |  |
| one-to-many | UserSiteRole | userSiteRoles | ✓ |  |
| one-to-many | RoleTemplateInstance | roleTemplateInstances | ✓ |  |
| one-to-many | RoleTemplateUsageLog | roleTemplateUsageLogs | ✓ |  |

**Usage Examples:**

#### Primary manufacturing facility

Main production facility with full manufacturing capabilities

```json
{
  "siteCode": "ATL-01",
  "siteName": "Atlanta Manufacturing Center",
  "location": "Atlanta, GA, USA",
  "isActive": true
}
```

#### Assembly and testing facility

Specialized facility focused on final assembly and testing operations

```json
{
  "siteCode": "DFW-02",
  "siteName": "Dallas Assembly Plant",
  "location": "Dallas, TX, USA",
  "isActive": true
}
```

**Common Queries:**
- Find all active sites for production planning
- Generate site-specific production reports
- List sites requiring certification renewal

**Related Tables:** Enterprise, Area, Equipment, WorkOrder, ProductionSchedule, UserSiteRole

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** enterpriseId

---

### Area

**Description:** Functional work area within a manufacturing site, such as machining centers, assembly lines, or quality labs

**Business Purpose:** Provides granular organization of work within a site, enabling area-specific scheduling, resource allocation, and performance tracking

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Production Management
- **Update Frequency:** Updated when production layouts change or new work areas are established
- **Data Retention:** 10 years for production history and layout changes
- **Security Classification:** Internal - Production layout and organization information

**Compliance Notes:** Area definitions important for safety compliance, environmental controls, and quality system organization

**System Integrations:** Production Scheduling Systems, Equipment Management, Work Center Planning, Safety Management

**Fields (11):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| areaCode | String | ✓ |  | Unique identifier for work area within the site following site area naming standards | Primary reference for work scheduling, resource allocation, and performance tracking |
| areaName | String | ✓ |  | Descriptive name of the work area for operational identification and communication | Used in work instructions, scheduling communications, and operator assignments |
| description | String |  |  | Detailed description of the area's purpose, capabilities, and operational characteristics | Used for capacity planning, capability assessment, and resource allocation decisions |
| siteId | String | ✓ |  | Foreign key linking area to its parent site location | Defines site ownership and enables site-level reporting and capacity planning |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| site | Site | ✓ |  |  |  |
| equipment | Equipment[] | ✓ |  |  |  |
| workCenters | WorkCenter[] | ✓ |  |  |  |

**Field Details:**

#### areaCode

- **Data Source:** Manufacturing engineering and production planning
- **Format:** SITE-FUNCTION-NN format (e.g., ATL-MACH-01, DFW-ASSY-02)
- **Validation:** Must be unique within site, follow naming convention
- **Examples:** ATL-MACH-01 - Machining area 1 in Atlanta, DFW-ASSY-02 - Assembly area 2 in Dallas, SEA-QC-01 - Quality control area in Seattle

#### areaName

- **Data Source:** Manufacturing engineering and production supervision
- **Examples:** CNC Machining Center A, Final Assembly Line 1, Quality Control Laboratory, Raw Material Storage

#### description

- **Data Source:** Manufacturing engineering specifications and operational documentation
- **Examples:** High-precision CNC machining for aerospace components with 5-axis capability, Clean room assembly environment for medical device final assembly, Temperature-controlled measurement lab with calibrated inspection equipment

#### siteId

- **Data Source:** Site layout planning and manufacturing engineering
- **Validation:** Must exist in Site table, required for site organizational hierarchy

**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Site | site | ✓ |  |
| one-to-many | WorkCenter | workCenters | ✓ |  |

**Usage Examples:**

#### CNC machining center

Dedicated area for precision machining operations with specialized equipment

```json
{
  "areaCode": "ATL-MACH-01",
  "areaName": "CNC Machining Center A",
  "description": "High-precision CNC machining for aerospace components",
  "isActive": true
}
```

#### Final assembly line

Production line for final assembly operations with sequential work stations

```json
{
  "areaCode": "ATL-ASSY-01",
  "areaName": "Final Assembly Line 1",
  "description": "Main assembly line for turbine blade assemblies",
  "isActive": true
}
```

#### Quality inspection lab

Controlled environment for quality inspections and measurements

```json
{
  "areaCode": "ATL-QC-01",
  "areaName": "Quality Control Laboratory",
  "description": "Measurement and testing lab with calibrated equipment",
  "isActive": true
}
```

**Common Queries:**
- Find all areas within a site for capacity planning
- List active areas by equipment type
- Generate area-specific utilization reports

**Related Tables:** Site, Equipment, WorkCenter, Personnel, WorkOrder

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** siteId

---

### User

**Description:** Core user management and authentication system defining personnel identity, access credentials, and organizational information

**Business Purpose:** Provides centralized user identity management enabling secure system access, personnel tracking, and organizational role assignment across all manufacturing operations

**Data Governance:**
- **Data Owner:** IT Security and Human Resources Teams
- **Update Frequency:** Updated when personnel join, leave, or change roles within the organization
- **Data Retention:** 5 years after employment termination for audit and legal requirements
- **Security Classification:** Confidential - Personal information and security credentials with strict access controls

**Compliance Notes:** User data must comply with privacy regulations (GDPR, CCPA), security standards, and corporate access control policies

**System Integrations:** Active Directory, HR Management Systems, Security Management, Time Tracking, Training Systems

**Fields (86):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| username | String | ✓ |  |  |  |
| email | String | ✓ |  |  |  |
| firstName | String |  |  |  |  |
| lastName | String |  |  |  |  |
| passwordHash | String | ✓ |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| roles | String[] | ✓ |  |  |  |
| permissions | String[] | ✓ |  |  |  |
| lastLoginAt | DateTime |  |  | Timestamp of user's most recent successful authentication | Used for inactive user identification and security audits |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| employeeNumber | String |  |  | Unique identifier from HR system linking MES user to employee record | Incorrect mapping prevents HR integration and payroll allocation |
| personnelClassId | String |  |  | Links user to job classification determining access levels and capabilities | Determines user permissions and system access levels |
| hireDate | DateTime |  |  |  |  |
| terminationDate | DateTime |  |  |  |  |
| phone | String |  |  |  |  |
| emergencyContact | String |  |  | Emergency contact information required for manufacturing safety compliance | Critical for workplace safety and emergency response |
| emergencyPhone | String |  |  |  |  |
| department | String |  |  |  |  |
| supervisorId | String |  |  |  |  |
| costCenter | String |  |  |  |  |
| laborRate | Float |  |  |  |  |
| auditLogs | AuditLog[] | ✓ |  |  |  |
| generatedAuditReports | AuditReport[] | ✓ |  |  |  |
| createdRoleTemplates | RoleTemplate[] | ✓ |  |  |  |
| updatedRoleTemplates | RoleTemplate[] | ✓ |  |  |  |
| instantiatedTemplates | RoleTemplateInstance[] | ✓ |  |  |  |
| templateUsageLogsAsPerformer | RoleTemplateUsageLog[] | ✓ |  |  |  |
| templateUsageLogsAsTarget | RoleTemplateUsageLog[] | ✓ |  |  |  |
| authenticationEvents | AuthenticationEvent[] | ✓ |  |  |  |
| dispatchedWorkOrders | DispatchLog[] | ✓ |  |  |  |
| createdDocumentTemplates | DocumentTemplate[] | ✓ |  |  |  |
| updatedDocumentTemplates | DocumentTemplate[] | ✓ |  |  |  |
| invalidatedSignatures | ElectronicSignature[] | ✓ |  |  |  |
| electronicSignatures | ElectronicSignature[] | ✓ |  |  |  |
| equipmentLogs | EquipmentLog[] | ✓ |  |  |  |
| inspectionExecutions | InspectionExecution[] | ✓ |  |  |  |
| approvedInspectionPlans | InspectionPlan[] | ✓ |  |  |  |
| createdInspectionPlans | InspectionPlan[] | ✓ |  |  |  |
| updatedInspectionPlans | InspectionPlan[] | ✓ |  |  |  |
| laborTimeEntries | LaborTimeEntry[] | ✓ |  |  |  |
| assignedNcrs | NCR[] | ✓ |  |  |  |
| ncrReports | NCR[] | ✓ |  |  |  |
| permissionChangesChanger | PermissionChangeLog[] | ✓ |  |  |  |
| permissionChangesTarget | PermissionChangeLog[] | ✓ |  |  |  |
| permissionUsageLogs | PermissionUsageLog[] | ✓ |  |  |  |
| availability | PersonnelAvailability[] | ✓ |  |  |  |
| certifications | PersonnelCertification[] | ✓ |  |  |  |
| skills | PersonnelSkillAssignment[] | ✓ |  |  |  |
| workCenterAssignments | PersonnelWorkCenterAssignment[] | ✓ |  |  |  |
| qualityInspections | QualityInspection[] | ✓ |  |  |  |
| routingTemplates | RoutingTemplate[] | ✓ |  |  |  |
| resolvedSecurityEvents | SecurityEvent[] | ✓ |  |  |  |
| securityEvents | SecurityEvent[] | ✓ |  |  |  |
| completedSetupExecutions | SetupExecution[] | ✓ |  |  |  |
| startedSetupExecutions | SetupExecution[] | ✓ |  |  |  |
| approvedSetupSheets | SetupSheet[] | ✓ |  |  |  |
| createdSetupSheets | SetupSheet[] | ✓ |  |  |  |
| updatedSetupSheets | SetupSheet[] | ✓ |  |  |  |
| sopAcknowledgments | SOPAcknowledgment[] | ✓ |  |  |  |
| sopAudits | SOPAudit[] | ✓ |  |  |  |
| ssoSessions | SsoSession[] | ✓ |  |  |  |
| approvedSOPs | StandardOperatingProcedure[] | ✓ |  |  |  |
| createdSOPs | StandardOperatingProcedure[] | ✓ |  |  |  |
| updatedSOPs | StandardOperatingProcedure[] | ✓ |  |  |  |
| toolCalibrationRecords | ToolCalibrationRecord[] | ✓ |  |  |  |
| approvedToolDrawings | ToolDrawing[] | ✓ |  |  |  |
| createdToolDrawings | ToolDrawing[] | ✓ |  |  |  |
| updatedToolDrawings | ToolDrawing[] | ✓ |  |  |  |
| toolMaintenanceRecords | ToolMaintenanceRecord[] | ✓ |  |  |  |
| toolUsageLogs | ToolUsageLog[] | ✓ |  |  |  |
| userRoles | UserRole[] | ✓ |  |  |  |
| userSessionLogs | UserSessionLog[] | ✓ |  |  |  |
| userSiteRoles | UserSiteRole[] | ✓ |  |  |  |
| personnelClass | PersonnelClass |  |  |  |  |
| supervisor | User |  |  |  |  |
| subordinates | User[] | ✓ |  |  |  |
| workInstructionExecutions | WorkInstructionExecution[] | ✓ |  |  |  |
| signedStepExecutions | WorkInstructionStepExecution[] | ✓ |  |  |  |
| approvedWorkInstructions | WorkInstruction[] | ✓ |  |  |  |
| createdWorkInstructions | WorkInstruction[] | ✓ |  |  |  |
| updatedWorkInstructions | WorkInstruction[] | ✓ |  |  |  |
| assignedWorkOrders | WorkOrder[] | ✓ |  |  |  |
| createdWorkOrders | WorkOrder[] | ✓ |  |  |  |
| workPerformanceRecords | WorkPerformance[] | ✓ |  |  |  |

**Field Details:**

#### lastLoginAt

- **Data Source:** Authentication system
- **Format:** ISO 8601 timestamp with timezone
- **Validation:** Cannot be future date
- **Audit Trail:** Tracked for security monitoring and compliance

#### employeeNumber

- **Data Source:** HR Management System daily import
- **Format:** EMP-NNNNNN (e.g., EMP-001234)
- **Validation:** Must be unique when not null, format validated on entry
- **Privacy:** Internal employee identifier - not PII but confidential
- **Examples:** EMP-001234 - Regular full-time employee, EMP-999999 - Temporary contractor, null - System service accounts
- **Integration Mapping:**
  - hrSystem: EmployeeID
  - badgeSystem: EmployeeNumber

#### personnelClassId

- **Data Source:** HR system or manual assignment by administrators
- **Validation:** Must exist in PersonnelClass table and be currently active
- **Examples:** PROD-OP-L1 - Level 1 Production Operator, QE-SENIOR - Senior Quality Engineer, MAINT-TECH - Maintenance Technician

#### emergencyContact

- **Data Source:** User self-service portal or HR system
- **Format:** Name and phone number in free text format
- **Privacy:** PII - Personal emergency contact information
- **Examples:** Jane Doe - (555) 123-4567 (spouse), Emergency Services - 911, Company Security - ext. 5555

**Relationships (45):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | AuditLog | auditLogs | ✓ |  |
| one-to-many | AuditReport | generatedAuditReports | ✓ |  |
| one-to-many | RoleTemplateInstance | instantiatedTemplates | ✓ |  |
| one-to-many | RoleTemplateUsageLog | templateUsageLogsAsPerformer | ✓ |  |
| one-to-many | RoleTemplateUsageLog | templateUsageLogsAsTarget | ✓ |  |
| one-to-many | DispatchLog | dispatchedWorkOrders | ✓ |  |
| one-to-many | DocumentTemplate | createdDocumentTemplates | ✓ |  |
| one-to-many | DocumentTemplate | updatedDocumentTemplates | ✓ |  |
| one-to-many | InspectionExecution | inspectionExecutions | ✓ |  |
| one-to-many | InspectionPlan | approvedInspectionPlans | ✓ |  |
| one-to-many | InspectionPlan | createdInspectionPlans | ✓ |  |
| one-to-many | InspectionPlan | updatedInspectionPlans | ✓ |  |
| one-to-many | LaborTimeEntry | laborTimeEntries | ✓ |  |
| one-to-many | PermissionChangeLog | permissionChangesChanger | ✓ |  |
| one-to-many | PermissionChangeLog | permissionChangesTarget | ✓ |  |
| one-to-many | PermissionUsageLog | permissionUsageLogs | ✓ |  |
| one-to-many | PersonnelAvailability | availability | ✓ |  |
| one-to-many | PersonnelCertification | certifications | ✓ |  |
| one-to-many | PersonnelSkillAssignment | skills | ✓ |  |
| one-to-many | PersonnelWorkCenterAssignment | workCenterAssignments | ✓ |  |
| one-to-many | RoutingTemplate | routingTemplates | ✓ |  |
| one-to-many | SetupExecution | completedSetupExecutions | ✓ |  |
| one-to-many | SetupExecution | startedSetupExecutions | ✓ |  |
| one-to-many | SetupSheet | approvedSetupSheets | ✓ |  |
| one-to-many | SetupSheet | createdSetupSheets | ✓ |  |
| one-to-many | SetupSheet | updatedSetupSheets | ✓ |  |
| one-to-many | SOPAcknowledgment | sopAcknowledgments | ✓ |  |
| one-to-many | SOPAudit | sopAudits | ✓ |  |
| one-to-many | SsoSession | ssoSessions | ✓ |  |
| one-to-many | StandardOperatingProcedure | approvedSOPs | ✓ |  |
| one-to-many | StandardOperatingProcedure | createdSOPs | ✓ |  |
| one-to-many | StandardOperatingProcedure | updatedSOPs | ✓ |  |
| one-to-many | ToolCalibrationRecord | toolCalibrationRecords | ✓ |  |
| one-to-many | ToolDrawing | approvedToolDrawings | ✓ |  |
| one-to-many | ToolDrawing | createdToolDrawings | ✓ |  |
| one-to-many | ToolDrawing | updatedToolDrawings | ✓ |  |
| one-to-many | ToolMaintenanceRecord | toolMaintenanceRecords | ✓ |  |
| one-to-many | ToolUsageLog | toolUsageLogs | ✓ |  |
| one-to-many | UserRole | userRoles | ✓ |  |
| one-to-many | UserSessionLog | userSessionLogs | ✓ |  |
| one-to-many | UserSiteRole | userSiteRoles | ✓ |  |
| one-to-one | PersonnelClass | personnelClass |  |  |
| one-to-one | User | supervisor |  |  |
| one-to-many | User | subordinates | ✓ |  |
| one-to-many | WorkInstructionStepExecution | signedStepExecutions | ✓ |  |

**Usage Examples:**

#### Manufacturing operator user account

Active manufacturing operator with production and quality inspection roles

```json
{
  "username": "jsmith001",
  "email": "john.smith@company.com",
  "firstName": "John",
  "lastName": "Smith",
  "employeeNumber": "EMP-001234",
  "personnelClassId": "PC-OPERATOR-L2",
  "department": "Manufacturing",
  "isActive": true,
  "roles": [
    "PRODUCTION_OPERATOR",
    "QUALITY_INSPECTOR"
  ]
}
```

#### Engineering manager user account

Engineering manager with process engineering and approval permissions

```json
{
  "username": "djohnson",
  "email": "david.johnson@company.com",
  "firstName": "David",
  "lastName": "Johnson",
  "employeeNumber": "EMP-005678",
  "department": "Engineering",
  "roles": [
    "PROCESS_ENGINEER",
    "MANAGER"
  ],
  "permissions": [
    "APPROVE_ROUTINGS",
    "MODIFY_OPERATIONS"
  ]
}
```

**Common Queries:**
- Authenticate users and validate access permissions
- Find personnel by department and role for work assignment
- Generate user access reports for security audits

**Related Tables:** PersonnelClass, UserRole, UserSiteRole, WorkOrder, LaborTimeEntry

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** employeeNumber
- **Index:** personnelClassId
- **Index:** supervisorId

---

### PersonnelClass

**Description:** Hierarchical classification system for organizing personnel by job function, skill level, and organizational responsibility

**Business Purpose:** Provides standardized workforce categorization for skill management, training requirements, and organizational planning

**Data Governance:**
- **Data Owner:** Human Resources and Manufacturing Engineering Teams
- **Update Frequency:** Updated when organizational structure changes or new job classifications are established
- **Data Retention:** Permanent retention for organizational history and personnel development tracking
- **Security Classification:** Internal - Organizational structure and personnel categorization information

**Compliance Notes:** Personnel classifications must align with labor regulations, safety requirements, and certification standards

**System Integrations:** HR Management Systems, Training Management, Certification Tracking, Payroll Systems

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| classCode | String | ✓ |  |  |  |
| className | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| level | Int | ✓ |  |  |  |
| parentClassId | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| parentClass | PersonnelClass |  |  |  |  |
| childClasses | PersonnelClass[] | ✓ |  |  |  |
| qualifications | PersonnelQualification[] | ✓ |  |  |  |
| personnel | User[] | ✓ |  |  |  |
**Relationships (4):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | PersonnelClass | parentClass |  |  |
| one-to-many | PersonnelClass | childClasses | ✓ |  |
| one-to-many | PersonnelQualification | qualifications | ✓ |  |
| one-to-many | User | personnel | ✓ |  |

**Usage Examples:**

#### Manufacturing operator classification

Mid-level operator classification with specific machining qualifications and progression path

```json
{
  "classCode": "MFG-OP-L2",
  "className": "Manufacturing Operator Level 2",
  "description": "Certified operator for CNC machining operations",
  "level": 2,
  "parentClassId": "MFG-OP-L1"
}
```

#### Quality inspector classification

Senior-level quality classification requiring advanced certifications and inspection authority

```json
{
  "classCode": "QA-INSP-SR",
  "className": "Senior Quality Inspector",
  "description": "Certified for critical aerospace inspections",
  "level": 3,
  "isActive": true
}
```

**Common Queries:**
- Find personnel by classification for work assignment
- Generate organizational charts and reporting structures
- Track skill development and career progression paths

**Related Tables:** User, PersonnelQualification, PersonnelSkillAssignment, PersonnelWorkCenterAssignment

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentClassId
- **Index:** level

---

### PersonnelQualification

**Description:** Personnel qualifications and competency records tracking certifications, skills, training completion, and authorization levels for manufacturing operations

**Business Purpose:** Ensures only qualified and certified personnel perform critical manufacturing operations, maintaining quality standards and regulatory compliance

**Data Governance:**
- **Data Owner:** Human Resources and Training Management Teams
- **Update Frequency:** Updated when certifications are obtained, renewed, or expired, and when competency assessments are completed
- **Data Retention:** 7 years after personnel termination for regulatory compliance and audit requirements
- **Security Classification:** Confidential - Personnel competency and certification information

**Compliance Notes:** Critical for AS9100 personnel competency requirements, ISO 9001 training records, and industry-specific certifications

**System Integrations:** Training Management, User Management, Work Order Assignment, Quality Management, Certification Bodies

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| qualificationCode | String | ✓ |  |  |  |
| qualificationName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| qualificationType | QualificationType | ✓ |  |  |  |
| issuingOrganization | String |  |  |  |  |
| validityPeriodMonths | Int |  |  |  |  |
| requiresRenewal | Boolean | ✓ | auto |  |  |
| personnelClassId | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| certifications | PersonnelCertification[] | ✓ |  |  |  |
| personnelClass | PersonnelClass |  |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | PersonnelCertification | certifications | ✓ |  |
| one-to-one | PersonnelClass | personnelClass |  |  |

**Usage Examples:**

#### CNC machinist qualification

Advanced CNC machinist qualification with NIMS certification for titanium machining and specific operational authorizations

```json
{
  "employeeId": "EMP-001234",
  "qualificationType": "CNC_MACHINING_TITANIUM",
  "certificationBody": "NIMS",
  "certificationNumber": "NIMS-CNC-001234",
  "qualificationDate": "2024-01-15T00:00:00Z",
  "expirationDate": "2027-01-15T00:00:00Z",
  "competencyLevel": "ADVANCED",
  "authorizedOperations": [
    "TITANIUM_MILLING",
    "5_AXIS_MACHINING",
    "PRECISION_BORING"
  ],
  "restrictions": "Requires supervision for new part programs",
  "isActive": true
}
```

#### Quality inspector certification

Quality inspector certification with equipment authorizations, special process qualifications, and customer approvals

```json
{
  "employeeId": "EMP-005678",
  "qualificationType": "DIMENSIONAL_INSPECTION",
  "certificationBody": "ASQ",
  "certificationNumber": "ASQ-CQI-005678",
  "equipmentAuthorizations": [
    "CMM_OPERATION",
    "OPTICAL_COMPARATOR",
    "MICROMETERS"
  ],
  "inspectionScope": "AEROSPACE_COMPONENTS",
  "specialProcesses": [
    "FLUORESCENT_PENETRANT",
    "MAGNETIC_PARTICLE"
  ],
  "customerApprovals": [
    "BOEING",
    "AIRBUS"
  ]
}
```

**Common Queries:**
- Find qualified personnel for specific operations or equipment
- Track certification expiration dates for renewal planning
- Generate competency reports for customer audits

**Related Tables:** User, PersonnelCertification, TrainingRecord, WorkOrderAssignment, OperationAuthorization

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** personnelClassId
- **Index:** qualificationType

---

### PersonnelCertification

**Description:** Personnel certification records tracking professional credentials, industry certifications, and specialized qualifications for manufacturing operations

**Business Purpose:** Ensures regulatory compliance and operational competency by maintaining current certification status and tracking renewal requirements

**Data Governance:**
- **Data Owner:** Human Resources and Training Management Teams
- **Update Frequency:** Updated when certifications are obtained, renewed, expired, or suspended with real-time status tracking
- **Data Retention:** 7 years after expiration for regulatory compliance and audit requirements
- **Security Classification:** Confidential - Personnel certification and competency information

**Compliance Notes:** Critical for AS9100 personnel competency, OSHA safety certifications, and industry-specific regulatory requirements

**System Integrations:** Personnel Management, Training Systems, Certification Bodies, Work Order Assignment, Compliance Reporting

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| personnelId | String | ✓ |  |  |  |
| qualificationId | String | ✓ |  |  |  |
| certificationNumber | String |  |  |  |  |
| issuedDate | DateTime | ✓ |  |  |  |
| expirationDate | DateTime |  |  |  |  |
| status | CertificationStatus | ✓ | ACTIVE |  |  |
| attachmentUrls | String[] | ✓ |  |  |  |
| verifiedBy | String |  |  |  |  |
| verifiedAt | DateTime |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| personnel | User | ✓ |  |  |  |
| qualification | PersonnelQualification | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | personnel | ✓ |  |
| one-to-one | PersonnelQualification | qualification | ✓ |  |

**Usage Examples:**

#### Aerospace welding certification

Advanced aerospace welding certification with multiple material and position qualifications plus customer approvals

```json
{
  "employeeId": "EMP-001234",
  "certificationType": "AWS_D17.1_AEROSPACE_WELDING",
  "certificationBody": "American Welding Society",
  "certificateNumber": "AWS-D17-001234",
  "issuedDate": "2024-01-15T00:00:00Z",
  "expirationDate": "2027-01-15T00:00:00Z",
  "certificationLevel": "ADVANCED",
  "materialAuthorizations": [
    "TITANIUM",
    "ALUMINUM",
    "STAINLESS_STEEL"
  ],
  "positionQualifications": [
    "1G",
    "2G",
    "3G",
    "4G"
  ],
  "customerApprovals": [
    "BOEING",
    "AIRBUS"
  ],
  "status": "ACTIVE"
}
```

#### Quality inspector ASQ certification

Professional quality inspector certification with continuing education requirements and specialized competencies

```json
{
  "employeeId": "EMP-005678",
  "certificationType": "ASQ_CQI_QUALITY_INSPECTOR",
  "certificationBody": "American Society for Quality",
  "certificateNumber": "ASQ-CQI-005678",
  "issuedDate": "2023-06-01T00:00:00Z",
  "expirationDate": "2026-06-01T00:00:00Z",
  "continuingEducationRequired": true,
  "ceCreditsRequired": 18,
  "ceCreditsEarned": 12,
  "specializations": [
    "DIMENSIONAL_INSPECTION",
    "SPC_ANALYSIS",
    "AUDIT_PROCEDURES"
  ]
}
```

**Common Queries:**
- Track certification expiration dates for renewal planning
- Find certified personnel for specific operations or customers
- Generate compliance reports for regulatory audits

**Related Tables:** User, PersonnelQualification, TrainingRecord, PersonnelOperationSpecification, WorkOrderAssignment

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** personnelId, qualificationId
- **Index:** personnelId
- **Index:** qualificationId
- **Index:** expirationDate
- **Index:** status

---

### PersonnelSkill

**Description:** Personnel skill definitions and competency levels for manufacturing operations defining specific technical capabilities and proficiency requirements

**Business Purpose:** Enables precise skill-based personnel assignment and competency development by defining specific technical skills and proficiency levels required for manufacturing operations

**Data Governance:**
- **Data Owner:** Human Resources and Manufacturing Engineering Teams
- **Update Frequency:** Updated when new skills are identified, skill requirements change, or competency standards are modified
- **Data Retention:** Permanent retention for competency framework and skills development programs
- **Security Classification:** Internal - Skills framework and competency definitions

**Compliance Notes:** Skill definitions support AS9100 competency requirements and provide foundation for personnel qualification and training programs

**System Integrations:** Personnel Management, Training Systems, Work Order Assignment, Competency Management, Skills Assessment

**Fields (9):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| skillCode | String | ✓ |  |  |  |
| skillName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| skillCategory | SkillCategory | ✓ |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| skillAssignments | PersonnelSkillAssignment[] | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | PersonnelSkillAssignment | skillAssignments | ✓ |  |

**Usage Examples:**

#### CNC machining skill definition

Advanced machining skill with multiple competency levels and assessment criteria for aerospace titanium components

```json
{
  "skillCode": "CNC_TITANIUM_MILLING",
  "skillName": "CNC Titanium Precision Milling",
  "skillCategory": "MACHINING",
  "skillDescription": "Advanced CNC milling of titanium aerospace components with tight tolerances",
  "requiredTraining": "40 hours classroom + 80 hours hands-on",
  "competencyLevels": [
    {
      "level": "BASIC",
      "description": "Can perform simple titanium milling with supervision"
    },
    {
      "level": "INTERMEDIATE",
      "description": "Can perform complex geometries with minimal supervision"
    },
    {
      "level": "ADVANCED",
      "description": "Can program and optimize titanium milling processes independently"
    },
    {
      "level": "EXPERT",
      "description": "Can train others and develop new titanium milling procedures"
    }
  ],
  "assessmentCriteria": "Dimensional accuracy within ±0.001 inch on test part",
  "renewalRequired": true,
  "renewalInterval": 24,
  "renewalUnit": "MONTHS"
}
```

#### Quality inspection skill definition

Precision measurement skill with specific equipment authorizations and accuracy requirements for quality control

```json
{
  "skillCode": "CMM_DIMENSIONAL_INSPECTION",
  "skillName": "Coordinate Measuring Machine Operation",
  "skillCategory": "QUALITY_INSPECTION",
  "skillDescription": "Operation of CMM equipment for precision dimensional inspection of aerospace components",
  "prerequisiteSkills": [
    "BASIC_METROLOGY",
    "BLUEPRINT_READING"
  ],
  "certificationRequired": "CMM_OPERATOR_CERTIFIED",
  "equipmentAuthorized": [
    "CMM_ZEISS",
    "CMM_MITUTOYO"
  ],
  "measurementStandards": [
    "ASME_Y14.5",
    "ISO_1101"
  ],
  "accuracyRequirement": "±0.0001 inches",
  "assessmentMethod": "Practical measurement test on certified artifact"
}
```

**Common Queries:**
- Find personnel with specific skills for work assignment
- Generate skill gap analysis for training planning
- Track skill certification and renewal requirements

**Related Tables:** PersonnelSkillAssignment, PersonnelQualification, User, TrainingRecord, PersonnelOperationSpecification

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** skillCategory

---

### PersonnelSkillAssignment

**Description:** Personnel skill assignments linking employees to specific skills with competency levels and certification status for work order assignment

**Business Purpose:** Enables precise personnel assignment based on specific skills and competency levels, ensuring qualified personnel perform critical manufacturing operations

**Data Governance:**
- **Data Owner:** Human Resources and Manufacturing Engineering Teams
- **Update Frequency:** Updated when skills are acquired, competency levels change, or assignments are modified
- **Data Retention:** 7 years after assignment termination for competency audit and training records
- **Security Classification:** Internal - Personnel skill assignments and competency information

**Compliance Notes:** Skill assignments support AS9100 competency requirements and provide foundation for work order personnel validation

**System Integrations:** Personnel Management, Work Order Assignment, Training Systems, Competency Management, Operations Planning

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| personnelId | String | ✓ |  |  |  |
| skillId | String | ✓ |  |  |  |
| competencyLevel | CompetencyLevel | ✓ |  |  |  |
| assessedBy | String |  |  |  |  |
| assessedAt | DateTime |  |  |  |  |
| lastUsedDate | DateTime |  |  |  |  |
| certifiedDate | DateTime |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| personnel | User | ✓ |  |  |  |
| skill | PersonnelSkill | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | personnel | ✓ |  |
| one-to-one | PersonnelSkill | skill | ✓ |  |

**Usage Examples:**

#### CNC machinist skill assignment

Advanced CNC skill assignment with specific operational authorizations and time restrictions for safety

```json
{
  "employeeId": "EMP-001234",
  "skillId": "CNC_TITANIUM_MILLING",
  "competencyLevel": "ADVANCED",
  "assignedDate": "2024-01-15T00:00:00Z",
  "certifiedDate": "2024-02-01T00:00:00Z",
  "expirationDate": "2026-02-01T00:00:00Z",
  "assessmentScore": 92.5,
  "assessorId": "supervisor_martinez",
  "status": "ACTIVE",
  "authorizedOperations": [
    "TITANIUM_ROUGHING",
    "TITANIUM_FINISHING",
    "5_AXIS_CONTOURING"
  ],
  "restrictions": "Maximum 8 hours continuous operation"
}
```

#### Quality inspector skill assignment

Expert quality inspector assignment with customer approvals and specialized aerospace capabilities

```json
{
  "employeeId": "EMP-005678",
  "skillId": "CMM_DIMENSIONAL_INSPECTION",
  "competencyLevel": "EXPERT",
  "assignedDate": "2023-06-01T00:00:00Z",
  "certifiedDate": "2023-06-15T00:00:00Z",
  "customerApprovals": [
    "BOEING",
    "AIRBUS"
  ],
  "equipmentAuthorizations": [
    "CMM_ZEISS",
    "CMM_MITUTOYO"
  ],
  "specialCapabilities": [
    "AS9102_FAI",
    "SPC_ANALYSIS"
  ],
  "maxInspectionComplexity": "CLASS_A_AEROSPACE"
}
```

**Common Queries:**
- Find qualified personnel for specific work orders
- Generate skill assignment reports for compliance audits
- Track skill competency levels for training planning

**Related Tables:** User, PersonnelSkill, PersonnelQualification, WorkOrderOperation, PersonnelOperationSpecification

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** personnelId, skillId
- **Index:** personnelId
- **Index:** skillId
- **Index:** competencyLevel

---

### PersonnelWorkCenterAssignment

**Description:** Assignment of personnel to specific work centers defining operational responsibilities, certifications, and capacity allocation

**Business Purpose:** Optimizes workforce allocation and ensures qualified personnel are assigned to appropriate work centers based on skills and certifications

**Data Governance:**
- **Data Owner:** Human Resources and Manufacturing Engineering Teams
- **Update Frequency:** Updated when personnel assignments change, certifications are obtained, or work center requirements are modified
- **Data Retention:** 7 years for personnel assignment history and certification tracking
- **Security Classification:** Internal - Personnel assignment and capability information

**Compliance Notes:** Personnel assignments must align with certification requirements, safety qualifications, and regulatory training standards

**System Integrations:** HR Management Systems, Training Management, Capacity Planning, Work Order Assignment

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| personnelId | String | ✓ |  |  |  |
| workCenterId | String | ✓ |  |  |  |
| isPrimary | Boolean | ✓ | auto |  |  |
| effectiveDate | DateTime | ✓ | now( |  |  |
| endDate | DateTime |  |  |  |  |
| certifiedDate | DateTime |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| personnel | User | ✓ |  |  |  |
| workCenter | WorkCenter | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | personnel | ✓ |  |
| one-to-one | WorkCenter | workCenter | ✓ |  |

**Usage Examples:**

#### Primary machining operator assignment

Primary operator assignment to CNC machining center with aerospace certification

```json
{
  "personnelId": "EMP-001234",
  "workCenterId": "CNC-MILL-001",
  "isPrimary": true,
  "effectiveDate": "2024-01-15T00:00:00Z",
  "certifiedDate": "2024-01-10T00:00:00Z",
  "notes": "Certified for aerospace precision machining operations"
}
```

#### Cross-trained operator assignment

Secondary assignment for cross-training and capacity flexibility

```json
{
  "personnelId": "EMP-005678",
  "workCenterId": "ASSEMBLY-LINE-A",
  "isPrimary": false,
  "effectiveDate": "2024-02-01T00:00:00Z",
  "notes": "Cross-trained for assembly line backup coverage during peak periods"
}
```

**Common Queries:**
- Find qualified personnel for work center assignments
- Generate work center staffing reports for capacity planning
- Track personnel certifications and assignment history

**Related Tables:** User, WorkCenter, PersonnelClass, PersonnelCertification

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** personnelId, workCenterId
- **Index:** personnelId
- **Index:** workCenterId
- **Index:** effectiveDate

---

### PersonnelAvailability

**Description:** Personnel availability schedules tracking work patterns, shifts, time off, and capacity planning for manufacturing resource allocation

**Business Purpose:** Optimizes personnel scheduling and capacity planning by tracking availability patterns, ensuring adequate staffing for manufacturing operations

**Data Governance:**
- **Data Owner:** Human Resources and Production Planning Teams
- **Update Frequency:** Daily updates for schedule changes, time off requests, and capacity adjustments
- **Data Retention:** 2 years for labor analysis and capacity planning optimization
- **Security Classification:** Confidential - Personnel scheduling and availability information

**Compliance Notes:** Availability tracking supports labor compliance and ensures proper staffing for critical operations requiring certified personnel

**System Integrations:** HR Management, Production Scheduling, Time Tracking, Capacity Planning, Work Order Assignment

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| personnelId | String | ✓ |  |  |  |
| availabilityType | AvailabilityType | ✓ |  |  |  |
| startDateTime | DateTime | ✓ |  |  |  |
| endDateTime | DateTime | ✓ |  |  |  |
| shiftCode | String |  |  |  |  |
| isRecurring | Boolean | ✓ | auto |  |  |
| recurrenceRule | String |  |  |  |  |
| reason | String |  |  |  |  |
| approvedBy | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| personnel | User | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | personnel | ✓ |  |

**Usage Examples:**

#### CNC operator availability schedule

Day shift CNC operator availability with skill set, certification status, and overtime availability for production planning

```json
{
  "employeeId": "EMP-001234",
  "availabilityDate": "2024-03-25T00:00:00Z",
  "shift": "DAY_SHIFT",
  "startTime": "07:00",
  "endTime": "15:30",
  "availabilityStatus": "AVAILABLE",
  "skillsAvailable": [
    "CNC_TITANIUM_MILLING",
    "5_AXIS_PROGRAMMING"
  ],
  "certificationStatus": "CURRENT",
  "maxContinuousHours": 8,
  "preferredWorkCenters": [
    "CNC-MILL-001",
    "CNC-MILL-002"
  ],
  "overtimeAvailable": true,
  "maxOvertimeHours": 4,
  "specialRestrictions": "No night shift due to training schedule",
  "emergencyContact": true
}
```

#### Quality inspector vacation schedule

Planned vacation absence with backup personnel assignments and critical responsibility coverage for quality operations

```json
{
  "employeeId": "EMP-005678",
  "availabilityDate": "2024-03-25T00:00:00Z",
  "availabilityStatus": "VACATION",
  "unavailableStartDate": "2024-03-25T00:00:00Z",
  "unavailableEndDate": "2024-03-29T23:59:59Z",
  "absenceType": "PLANNED_VACATION",
  "backupPersonnel": [
    "EMP-005679",
    "EMP-005680"
  ],
  "criticalResponsibilities": [
    "AS9102_FAI_INSPECTION",
    "CUSTOMER_AUDIT_SUPPORT"
  ],
  "workTransferCompleted": true,
  "returnDate": "2024-04-01T07:00:00Z",
  "coverageArranged": true
}
```

**Common Queries:**
- Find available personnel for work order assignments
- Generate capacity reports for production planning
- Track attendance patterns for workforce optimization

**Related Tables:** User, PersonnelSkill, WorkShift, ProductionSchedule, WorkOrderAssignment

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** personnelId
- **Index:** startDateTime
- **Index:** availabilityType

---

### MaterialClass

**Description:** Hierarchical classification system for organizing materials by type, characteristics, and usage patterns

**Business Purpose:** Provides standardized material categorization for procurement, inventory management, and quality control across the enterprise

**Data Governance:**
- **Data Owner:** Materials Management and Engineering Teams
- **Update Frequency:** Updated when new material types are introduced or classification standards change
- **Data Retention:** Permanent retention for traceability and material history
- **Security Classification:** Internal - Material classification and sourcing information

**Compliance Notes:** Material classifications must align with industry standards and customer requirements for aerospace and medical applications

**System Integrations:** ERP Materials Management, Supplier Catalogs, Quality Management Systems, Procurement Systems

**Fields (18):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| classCode | String | ✓ |  |  |  |
| className | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| level | Int | ✓ |  |  |  |
| parentClassId | String |  |  |  |  |
| requiresLotTracking | Boolean | ✓ | true |  |  |
| requiresSerialTracking | Boolean | ✓ | auto |  |  |
| requiresExpirationDate | Boolean | ✓ | auto |  |  |
| shelfLifeDays | Int |  |  |  |  |
| storageRequirements | String |  |  |  |  |
| handlingInstructions | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| parentClass | MaterialClass |  |  |  |  |
| childClasses | MaterialClass[] | ✓ |  |  |  |
| materials | MaterialDefinition[] | ✓ |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | MaterialClass | parentClass |  |  |
| one-to-many | MaterialClass | childClasses | ✓ |  |
| one-to-many | MaterialDefinition | materials | ✓ |  |

**Usage Examples:**

#### Aerospace raw materials

Top-level classification for all aerospace-certified metallic materials

```json
{
  "classCode": "AERO-METALS",
  "className": "Aerospace Grade Metals",
  "description": "High-performance metals certified for aerospace applications",
  "category": "RAW_MATERIALS"
}
```

#### Medical device polymers

Specialized classification for FDA-compliant polymer materials

```json
{
  "classCode": "MED-POLYMERS",
  "className": "Medical Grade Polymers",
  "description": "Biocompatible polymers for medical device manufacturing",
  "category": "ENGINEERED_MATERIALS"
}
```

**Common Queries:**
- Find all material classes by category for procurement planning
- List aerospace-certified material classes for compliance reporting
- Generate material class hierarchy for engineering specifications

**Related Tables:** MaterialDefinition, Material, Part, BOMItem

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentClassId
- **Index:** level

---

### MaterialDefinition

**Description:** Detailed specifications and requirements for specific materials including technical properties and supplier information

**Business Purpose:** Defines exact material specifications, quality requirements, and approved suppliers to ensure consistent procurement and quality

**Data Governance:**
- **Data Owner:** Materials Engineering and Quality Assurance Teams
- **Update Frequency:** Updated when specifications change, new suppliers are qualified, or engineering changes occur
- **Data Retention:** Permanent retention for engineering and quality traceability
- **Security Classification:** Internal - Contains proprietary specifications and supplier information

**Compliance Notes:** Material definitions must include all required certifications and specifications for regulatory compliance (AS9100, FDA, ISO)

**System Integrations:** Supplier Management Systems, Quality Management, Engineering Change Control, Procurement Systems

**Fields (40):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| materialNumber | String | ✓ |  |  |  |
| materialName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| materialClassId | String | ✓ |  |  |  |
| baseUnitOfMeasure | String | ✓ |  |  |  |
| alternateUnitOfMeasure | String |  |  |  |  |
| conversionFactor | Float |  |  |  |  |
| materialType | MaterialType | ✓ |  |  |  |
| materialGrade | String |  |  |  |  |
| specification | String |  |  |  |  |
| minimumStock | Float |  |  |  |  |
| reorderPoint | Float |  |  |  |  |
| reorderQuantity | Float |  |  |  |  |
| leadTimeDays | Int |  |  |  |  |
| requiresLotTracking | Boolean | ✓ | true |  |  |
| lotNumberFormat | String |  |  |  |  |
| defaultShelfLifeDays | Int |  |  |  |  |
| standardCost | Float |  |  |  |  |
| currency | String |  | USD |  |  |
| requiresInspection | Boolean | ✓ | auto |  |  |
| inspectionFrequency | String |  |  |  |  |
| primarySupplierId | String |  |  |  |  |
| supplierPartNumber | String |  |  |  |  |
| drawingNumber | String |  |  |  |  |
| revision | String |  |  |  |  |
| msdsUrl | String |  |  |  |  |
| imageUrl | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| isPhantom | Boolean | ✓ | auto |  |  |
| isObsolete | Boolean | ✓ | auto |  |  |
| obsoleteDate | DateTime |  |  |  |  |
| replacementMaterialId | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| materialClass | MaterialClass | ✓ |  |  |  |
| replacementMaterial | MaterialDefinition |  |  |  |  |
| replacedMaterials | MaterialDefinition[] | ✓ |  |  |  |
| lots | MaterialLot[] | ✓ |  |  |  |
| properties | MaterialProperty[] | ✓ |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | MaterialClass | materialClass | ✓ |  |
| one-to-one | MaterialDefinition | replacementMaterial |  |  |
| one-to-many | MaterialDefinition | replacedMaterials | ✓ |  |

**Usage Examples:**

#### Titanium alloy specification

Precise specification for high-performance titanium used in engine components

```json
{
  "materialCode": "TI-6AL-4V-GRADE5",
  "materialName": "Titanium 6Al-4V Grade 5",
  "specification": "AMS 4928",
  "description": "Aerospace grade titanium alloy for critical components"
}
```

#### Medical grade stainless steel

FDA-compliant stainless steel for medical device applications

```json
{
  "materialCode": "SS-316LVM-MEDICAL",
  "materialName": "316LVM Stainless Steel",
  "specification": "ASTM F138",
  "description": "Vacuum melted stainless steel for implantable devices"
}
```

**Common Queries:**
- Find approved material definitions by specification
- List materials requiring certification updates
- Generate material specifications for engineering drawings

**Related Tables:** MaterialClass, MaterialLot, Supplier, MaterialProperty

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** materialClassId
- **Index:** materialType
- **Index:** isActive
- **Index:** materialNumber

---

### MaterialProperty

**Description:** Physical, chemical, and mechanical properties of materials with test results and certification data

**Business Purpose:** Documents material characteristics and test results to ensure materials meet engineering requirements and specifications

**Data Governance:**
- **Data Owner:** Materials Engineering and Quality Assurance Teams
- **Update Frequency:** Updated when new test results are received or material specifications change
- **Data Retention:** Permanent retention for engineering analysis and quality verification
- **Security Classification:** Internal - Contains proprietary material performance data

**Compliance Notes:** Property data required for engineering analysis, quality verification, and customer material certifications

**System Integrations:** Quality Management Systems, Engineering Analysis Tools, Supplier Certification Systems, Test Equipment

**Fields (16):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| materialId | String | ✓ |  |  |  |
| propertyName | String | ✓ |  |  |  |
| propertyType | MaterialPropertyType | ✓ |  |  |  |
| propertyValue | String | ✓ |  |  |  |
| propertyUnit | String |  |  |  |  |
| testMethod | String |  |  |  |  |
| nominalValue | Float |  |  |  |  |
| minValue | Float |  |  |  |  |
| maxValue | Float |  |  |  |  |
| isRequired | Boolean | ✓ | auto |  |  |
| isCritical | Boolean | ✓ | auto |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| material | MaterialDefinition | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | MaterialDefinition | material | ✓ |  |

**Usage Examples:**

#### Titanium mechanical properties

Certified tensile strength data for aerospace titanium alloy

```json
{
  "materialCode": "TI-6AL-4V-GRADE5",
  "propertyType": "TENSILE_STRENGTH",
  "value": "950 MPa",
  "testMethod": "ASTM E8",
  "certificationRequired": true
}
```

#### Polymer biocompatibility data

FDA-required biocompatibility certification for medical device polymer

```json
{
  "materialCode": "PEEK-MEDICAL-GRADE",
  "propertyType": "BIOCOMPATIBILITY",
  "value": "USP Class VI Compliant",
  "testMethod": "ISO 10993",
  "certificationRequired": true
}
```

**Common Queries:**
- Find material properties for engineering analysis
- Generate material certificates for customer deliveries
- Verify material compliance with specifications

**Related Tables:** MaterialDefinition, QualityInspection, Part, Engineering

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** materialId, propertyName
- **Index:** materialId
- **Index:** propertyType

---

### MaterialLot

**Description:** Individual lots or batches of materials with complete traceability information including supplier certifications and quality data

**Business Purpose:** Provides lot-level traceability for quality control, recalls, and regulatory compliance throughout the manufacturing process

**Data Governance:**
- **Data Owner:** Materials Management and Quality Control Teams
- **Update Frequency:** Created for each new material lot received, updated as lot is consumed or moved
- **Data Retention:** Permanent retention for complete product traceability and regulatory compliance
- **Security Classification:** Internal - Contains supplier and quality certification data

**Compliance Notes:** Critical for aerospace and medical traceability requirements - lot records must be maintained for product lifetime

**System Integrations:** Inventory Management, Quality Management, Supplier Systems, ERP Materials Module

**Fields (48):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| lotNumber | String | ✓ |  | Unique identifier for a specific lot or batch of material with complete traceability | Primary reference for all material traceability, quality control, and regulatory compliance |
| materialId | String | ✓ |  |  |  |
| supplierLotNumber | String |  |  | Original lot or batch number from the material supplier for upstream traceability | Enables upstream traceability to supplier source and original certifications |
| purchaseOrderNumber | String |  |  |  |  |
| heatNumber | String |  |  |  |  |
| serialNumber | String |  |  |  |  |
| originalQuantity | Float | ✓ |  |  |  |
| currentQuantity | Float | ✓ |  |  |  |
| unitOfMeasure | String | ✓ |  |  |  |
| location | String |  |  |  |  |
| warehouseId | String |  |  |  |  |
| manufactureDate | DateTime |  |  |  |  |
| receivedDate | DateTime | ✓ |  |  |  |
| expirationDate | DateTime |  |  | Date when material lot expires or becomes unsuitable for use in production | Prevents use of expired materials that could compromise product quality or safety |
| shelfLifeDays | Int |  |  |  |  |
| firstUsedDate | DateTime |  |  |  |  |
| lastUsedDate | DateTime |  |  |  |  |
| status | MaterialLotStatus | ✓ | AVAILABLE |  |  |
| state | MaterialLotState | ✓ | RECEIVED |  |  |
| isQuarantined | Boolean | ✓ | auto |  |  |
| quarantineReason | String |  |  |  |  |
| quarantinedAt | DateTime |  |  |  |  |
| qualityStatus | QualityLotStatus | ✓ | PENDING |  |  |
| inspectionId | String |  |  |  |  |
| certificationUrls | String[] | ✓ |  |  |  |
| supplierId | String |  |  |  |  |
| supplierName | String |  |  |  |  |
| manufacturerId | String |  |  |  |  |
| manufacturerName | String |  |  |  |  |
| countryOfOrigin | String |  |  |  |  |
| unitCost | Float |  |  |  |  |
| totalCost | Float |  |  |  |  |
| currency | String |  | USD |  |  |
| parentLotId | String |  |  |  |  |
| isSplit | Boolean | ✓ | auto |  |  |
| isMerged | Boolean | ✓ | auto |  |  |
| notes | String |  |  |  |  |
| customAttributes | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| genealogyAsChild | MaterialLotGenealogy[] | ✓ |  |  |  |
| genealogyAsParent | MaterialLotGenealogy[] | ✓ |  |  |  |
| material | MaterialDefinition | ✓ |  |  |  |
| parentLot | MaterialLot |  |  |  |  |
| childLots | MaterialLot[] | ✓ |  |  |  |
| stateHistory | MaterialStateHistory[] | ✓ |  |  |  |
| sublots | MaterialSublot[] | ✓ |  |  |  |

**Field Details:**

#### lotNumber

- **Data Source:** Generated by materials management system upon receipt or internal lot creation
- **Format:** MATERIAL-YYMMDD-NNN format (e.g., TI-240325-001)
- **Validation:** Must be unique globally, follow format standard, cannot be changed once assigned
- **Audit Trail:** Critical for product traceability and recall procedures
- **Examples:** TI-240325-001 - First titanium lot received March 25, 2024, SS-240320-005 - Fifth stainless steel lot received March 20, 2024, PEEK-240315-002 - Second PEEK polymer lot received March 15, 2024

#### supplierLotNumber

- **Data Source:** Supplier documentation, material certificates, and packing lists
- **Validation:** Must match supplier documentation, required for certified materials
- **Examples:** SUPP-TI-789456 - Supplier's internal titanium lot number, ACME-SS-2024-Q1-123 - Supplier quarterly batch identifier, MED-CERT-456789 - Medical grade material certificate number
- **Integration Mapping:**
  - supplierSystem: BatchNumber
  - certificationSystem: LotID

#### expirationDate

- **Data Source:** Supplier specifications, material certificates, and shelf-life standards
- **Format:** ISO 8601 date (YYYY-MM-DD)
- **Validation:** Must be future date at time of receipt, enforced in production planning

**Relationships (5):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | MaterialLotGenealogy | genealogyAsChild | ✓ |  |
| one-to-many | MaterialLotGenealogy | genealogyAsParent | ✓ |  |
| one-to-one | MaterialDefinition | material | ✓ |  |
| one-to-many | MaterialStateHistory | stateHistory | ✓ |  |
| one-to-many | MaterialSublot | sublots | ✓ |  |

**Usage Examples:**

#### Titanium alloy lot with aerospace certification

Specific lot of certified titanium with complete supplier documentation

```json
{
  "lotNumber": "TI-240325-001",
  "materialCode": "TI-6AL-4V-GRADE5",
  "supplierLotNumber": "SUPP-TI-789456",
  "quantity": "500 lbs",
  "receivedDate": "2024-03-25"
}
```

#### Medical polymer lot with FDA documentation

Medical grade polymer lot with full FDA compliance documentation

```json
{
  "lotNumber": "PEEK-240320-003",
  "materialCode": "PEEK-MEDICAL-GRADE",
  "supplierLotNumber": "MED-PEEK-123789",
  "quantity": "100 kg",
  "certificationLevel": "FDA_APPROVED"
}
```

**Common Queries:**
- Find all lots for a specific material requiring recall
- Track lot usage across work orders for traceability
- Generate lot genealogy reports for customer deliveries

**Related Tables:** MaterialDefinition, MaterialTransaction, Supplier, QualityInspection

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** materialId
- **Index:** lotNumber
- **Index:** status
- **Index:** state
- **Index:** expirationDate
- **Index:** qualityStatus
- **Index:** parentLotId

---

### MaterialSublot

**Description:** Subdivision of material lots into smaller batches enabling precise material allocation, work order reservations, and inventory control

**Business Purpose:** Provides granular material management by splitting large lots into smaller working quantities for specific work orders and operations

**Data Governance:**
- **Data Owner:** Materials Management and Production Control Teams
- **Update Frequency:** Real-time updates as material lots are split, reserved, or consumed in manufacturing operations
- **Data Retention:** Permanent retention for complete material traceability and regulatory compliance
- **Security Classification:** Internal - Material allocation and inventory control information

**Compliance Notes:** Sublot tracking required for material traceability, inventory accuracy, and regulatory compliance in controlled environments

**System Integrations:** Work Order Management, Material Requirements Planning, Inventory Control, Shop Floor Systems

**Fields (17):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| sublotNumber | String | ✓ |  |  |  |
| parentLotId | String | ✓ |  |  |  |
| operationType | SublotOperationType | ✓ |  |  |  |
| quantity | Float | ✓ |  |  |  |
| unitOfMeasure | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| reservedFor | String |  |  |  |  |
| location | String |  |  |  |  |
| status | MaterialLotStatus | ✓ | AVAILABLE |  |  |
| isActive | Boolean | ✓ | true |  |  |
| splitReason | String |  |  |  |  |
| createdById | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| parentLot | MaterialLot | ✓ |  |  |  |

**Usage Examples:**

#### Work order material reservation

Titanium sublot reserved for specific turbine blade manufacturing work order

```json
{
  "sublotNumber": "SUB-TI-240325-001-A",
  "parentLotId": "LOT-TI-240325-001",
  "operationType": "SPLIT",
  "quantity": 25.5,
  "unitOfMeasure": "kg",
  "workOrderId": "WO-2024-001234",
  "reservedFor": "Turbine Blade Manufacturing",
  "status": "RESERVED"
}
```

#### Quality hold sublot

Aluminum sublot quarantined due to quality issues requiring investigation

```json
{
  "sublotNumber": "SUB-AL-240326-002-B",
  "parentLotId": "LOT-AL-240326-002",
  "operationType": "QUALITY_HOLD",
  "quantity": 10,
  "unitOfMeasure": "kg",
  "status": "QUARANTINE",
  "splitReason": "Failed incoming inspection - dimensional variance"
}
```

**Common Queries:**
- Find available sublots for work order material allocation
- Track sublot consumption and remaining quantities
- Generate material reservation reports for production planning

**Related Tables:** MaterialLot, WorkOrder, Operation, MaterialTransaction

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentLotId
- **Index:** sublotNumber
- **Index:** workOrderId

---

### MaterialLotGenealogy

**Description:** Parent-child relationships between material lots tracking transformations, combinations, and processing history throughout manufacturing

**Business Purpose:** Maintains complete material genealogy enabling rapid traceability for quality issues, recalls, and customer delivery documentation

**Data Governance:**
- **Data Owner:** Materials Management and Quality Assurance Teams
- **Update Frequency:** Real-time updates as materials are processed, combined, or transformed during manufacturing operations
- **Data Retention:** Permanent retention for complete product lifetime traceability and regulatory compliance
- **Security Classification:** Internal - Material genealogy with quality and regulatory implications

**Compliance Notes:** Critical for aerospace, medical, and automotive recall management and regulatory traceability requirements

**System Integrations:** Quality Management, Manufacturing Execution, Recall Management, Customer Delivery

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| parentLotId | String | ✓ |  |  |  |
| childLotId | String | ✓ |  |  |  |
| relationshipType | GenealogyRelationType | ✓ |  |  |  |
| quantityConsumed | Float | ✓ |  |  |  |
| quantityProduced | Float |  |  |  |  |
| unitOfMeasure | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| processDate | DateTime | ✓ |  |  |  |
| operatorId | String |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| childLot | MaterialLot | ✓ |  |  |  |
| parentLot | MaterialLot | ✓ |  |  |  |

**Usage Examples:**

#### Material transformation genealogy

Raw titanium lot transformed into machined components with yield tracking

```json
{
  "parentLotId": "LOT-RAW-TI-001",
  "childLotId": "LOT-MACH-TI-002",
  "relationshipType": "TRANSFORMATION",
  "quantityConsumed": 50,
  "quantityProduced": 45.5,
  "unitOfMeasure": "kg",
  "workOrderId": "WO-2024-001234",
  "processDate": "2024-03-25T10:30:00Z"
}
```

#### Material combination genealogy

Multiple component lots combined into alloy mixture with operator tracking

```json
{
  "parentLotId": "LOT-COMP-A-001",
  "childLotId": "LOT-ALLOY-MIX-001",
  "relationshipType": "COMBINATION",
  "quantityConsumed": 25,
  "quantityProduced": 75,
  "operationId": "OP-ALLOY-MIX-001",
  "operatorId": "EMP-001234"
}
```

**Common Queries:**
- Generate complete material genealogy for customer deliveries
- Find all downstream products affected by material quality issues
- Track material yield and transformation efficiency

**Related Tables:** MaterialLot, WorkOrder, Operation, User

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** parentLotId, childLotId, processDate
- **Index:** parentLotId
- **Index:** childLotId
- **Index:** workOrderId
- **Index:** processDate

---

### MaterialStateHistory

**Description:** Complete audit trail of material lot state and status transitions including quality events, location changes, and process milestones

**Business Purpose:** Provides comprehensive material lifecycle tracking for quality control, inventory management, and regulatory compliance audit trails

**Data Governance:**
- **Data Owner:** Materials Management and Quality Control Teams
- **Update Frequency:** Real-time logging as material lots transition through states, locations, and quality checkpoints
- **Data Retention:** 7 years minimum for audit requirements, permanent for critical material traceability
- **Security Classification:** Internal - Material status and quality information with regulatory significance

**Compliance Notes:** State history required for quality system compliance, material tracking, and regulatory audit requirements

**System Integrations:** Quality Management, Inventory Control, Work Order Execution, Inspection Systems

**Fields (22):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| lotId | String | ✓ |  |  |  |
| previousState | MaterialLotState |  |  |  |  |
| newState | MaterialLotState | ✓ |  |  |  |
| previousStatus | MaterialLotStatus |  |  |  |  |
| newStatus | MaterialLotStatus |  |  |  |  |
| reason | String |  |  |  |  |
| transitionType | StateTransitionType | ✓ |  |  |  |
| quantity | Float |  |  |  |  |
| unitOfMeasure | String |  |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| inspectionId | String |  |  |  |  |
| changedById | String |  |  |  |  |
| changedAt | DateTime | ✓ | now( |  |  |
| fromLocation | String |  |  |  |  |
| toLocation | String |  |  |  |  |
| qualityNotes | String |  |  |  |  |
| notes | String |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| lot | MaterialLot | ✓ |  |  |  |

**Usage Examples:**

#### Quality inspection state transition

Material lot approved after successful quality inspection with detailed transition tracking

```json
{
  "lotId": "LOT-TI-240325-001",
  "previousState": "INSPECTION",
  "newState": "APPROVED",
  "previousStatus": "PENDING",
  "newStatus": "AVAILABLE",
  "reason": "Passed dimensional and chemical inspection",
  "transitionType": "QUALITY_APPROVAL",
  "inspectionId": "QI-2024-001234"
}
```

#### Location transfer with quarantine

Material lot quarantined due to supplier quality alert with location tracking

```json
{
  "lotId": "LOT-AL-240326-002",
  "previousState": "AVAILABLE",
  "newState": "QUARANTINE",
  "newStatus": "HOLD",
  "reason": "Supplier quality alert - batch recall",
  "fromLocation": "WAREHOUSE-A",
  "toLocation": "QUARANTINE-AREA",
  "qualityNotes": "Customer complaint investigation required"
}
```

**Common Queries:**
- Track material lot history for quality investigations
- Generate audit reports for regulatory compliance
- Monitor material flow and location changes

**Related Tables:** MaterialLot, QualityInspection, WorkOrder, User

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** lotId
- **Index:** changedAt
- **Index:** newState
- **Index:** newStatus

---

### Operation

**Description:** Individual manufacturing operations defining specific processes, procedures, and requirements for transforming materials

**Business Purpose:** Provides the fundamental building blocks of manufacturing processes, defining what work is performed, how it's executed, and what resources are required

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Process Engineering Teams
- **Update Frequency:** Updated when processes change, new operations are developed, or continuous improvement modifications are made
- **Data Retention:** Permanent retention for process history, engineering records, and regulatory compliance
- **Security Classification:** Internal - Contains proprietary manufacturing processes and cycle times

**Compliance Notes:** Operations must be documented per AS9100 and ISO 9001 requirements. Changes require engineering approval and may need customer notification

**System Integrations:** Routing Systems, Work Instructions, Equipment Management, Quality Plans, Time Standards

**Fields (40):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| description | String |  |  |  |  |
| siteId | String |  |  |  |  |
| isStandardOperation | Boolean | ✓ | auto |  |  |
| operationCode | String | ✓ |  |  |  |
| operationName | String | ✓ |  |  |  |
| operationClassification | OperationClassification |  |  |  |  |
| standardWorkInstructionId | String |  |  |  |  |
| level | Int | ✓ | 1 |  |  |
| parentOperationId | String |  |  |  |  |
| operationType | OperationType | ✓ |  |  |  |
| category | String |  |  |  |  |
| duration | Int |  |  |  |  |
| setupTime | Int |  |  |  |  |
| teardownTime | Int |  |  |  |  |
| minCycleTime | Int |  |  |  |  |
| maxCycleTime | Int |  |  |  |  |
| version | String | ✓ | 1.0 |  |  |
| effectiveDate | DateTime |  |  |  |  |
| expirationDate | DateTime |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| requiresApproval | Boolean | ✓ | auto |  |  |
| approvedBy | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| bomItems | BOMItem[] | ✓ |  |  |  |
| equipmentSpecs | EquipmentOperationSpecification[] | ✓ |  |  |  |
| materialSpecs | MaterialOperationSpecification[] | ✓ |  |  |  |
| dependencies | OperationDependency[] | ✓ |  |  |  |
| prerequisiteFor | OperationDependency[] | ✓ |  |  |  |
| parameters | OperationParameter[] | ✓ |  |  |  |
| parentOperation | Operation |  |  |  |  |
| childOperations | Operation[] | ✓ |  |  |  |
| site | Site |  |  |  |  |
| standardWorkInstruction | WorkInstruction |  |  |  |  |
| personnelSpecs | PersonnelOperationSpecification[] | ✓ |  |  |  |
| assetSpecs | PhysicalAssetOperationSpecification[] | ✓ |  |  |  |
| routingSteps | RoutingStep[] | ✓ |  |  |  |
| samplingPlans | SamplingPlan[] | ✓ |  |  |  |
**Relationships (10):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | BOMItem | bomItems | ✓ |  |
| one-to-many | EquipmentOperationSpecification | equipmentSpecs | ✓ |  |
| one-to-many | MaterialOperationSpecification | materialSpecs | ✓ |  |
| one-to-many | OperationDependency | dependencies | ✓ |  |
| one-to-many | OperationDependency | prerequisiteFor | ✓ |  |
| one-to-many | OperationParameter | parameters | ✓ |  |
| one-to-one | Site | site |  |  |
| one-to-many | PersonnelOperationSpecification | personnelSpecs | ✓ |  |
| one-to-many | PhysicalAssetOperationSpecification | assetSpecs | ✓ |  |
| one-to-many | RoutingStep | routingSteps | ✓ |  |

**Usage Examples:**

#### CNC machining operation

Standard machining operation with defined cycle times for aerospace component manufacturing

```json
{
  "operationCode": "OP-MILL-001",
  "operationName": "Rough Milling - Turbine Blade",
  "operationType": "MACHINING",
  "duration": "120 minutes",
  "setupTime": "30 minutes",
  "isStandardOperation": true
}
```

#### Quality inspection operation

Quality control operation requiring certification and approval for critical dimensions

```json
{
  "operationCode": "OP-INSP-001",
  "operationName": "Dimensional Inspection",
  "operationType": "INSPECTION",
  "duration": "45 minutes",
  "requiresApproval": true,
  "category": "QUALITY_CONTROL"
}
```

**Common Queries:**
- Find operations by type for routing development
- Generate operation time standards for scheduling
- Track operation performance and efficiency metrics

**Related Tables:** RoutingStep, WorkOrderOperation, OperationParameter, OperationDependency

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentOperationId
- **Index:** operationType
- **Index:** level
- **Index:** isActive
- **Index:** siteId
- **Index:** isStandardOperation

---

### OperationParameter

**Description:** Manufacturing operation parameters defining process variables, settings, and control points for precise manufacturing execution

**Business Purpose:** Enables precise process control by defining measurable parameters that ensure consistent quality and manufacturing repeatability

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Process Engineering Teams
- **Update Frequency:** Updated when process parameters change, new controls are added, or optimization improvements are implemented
- **Data Retention:** Permanent retention for process validation and continuous improvement analysis
- **Security Classification:** Internal - Process control parameters with competitive manufacturing sensitivity

**Compliance Notes:** Parameter definitions critical for process validation, statistical process control, and regulatory manufacturing compliance

**System Integrations:** Shop Floor Control Systems, SPC Systems, Process Control, Quality Management

**Fields (24):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| operationId | String | ✓ |  |  |  |
| parameterName | String | ✓ |  |  |  |
| parameterType | ParameterType | ✓ |  |  |  |
| dataType | ParameterDataType | ✓ |  |  |  |
| defaultValue | String |  |  |  |  |
| unitOfMeasure | String |  |  |  |  |
| minValue | Float |  |  |  |  |
| maxValue | Float |  |  |  |  |
| allowedValues | String[] | ✓ |  |  |  |
| isRequired | Boolean | ✓ | auto |  |  |
| isCritical | Boolean | ✓ | auto |  |  |
| requiresVerification | Boolean | ✓ | auto |  |  |
| displayOrder | Int |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| parameterGroupId | String |  |  |  |  |
| operation | Operation | ✓ |  |  |  |
| parameterGroup | ParameterGroup |  |  |  |  |
| formula | ParameterFormula |  |  |  |  |
| limits | ParameterLimits |  |  |  |  |
| samplingPlans | SamplingPlan[] | ✓ |  |  |  |
| spcConfiguration | SPCConfiguration |  |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | ParameterFormula | formula |  |  |
| one-to-one | ParameterLimits | limits |  |  |
| one-to-one | SPCConfiguration | spcConfiguration |  |  |

**Usage Examples:**

#### CNC machining speed parameter

Critical machining parameter with defined operating range for quality control

```json
{
  "operationId": "OP-MILL-001",
  "parameterName": "Spindle Speed",
  "parameterType": "PROCESS_SETTING",
  "dataType": "NUMERIC",
  "defaultValue": "1500",
  "unitOfMeasure": "RPM",
  "minValue": 800,
  "maxValue": 3000,
  "isCritical": true
}
```

#### Temperature monitoring parameter

Critical temperature parameter requiring verification and alarm monitoring

```json
{
  "operationId": "OP-HEAT-TREAT-001",
  "parameterName": "Furnace Temperature",
  "parameterType": "MEASUREMENT",
  "dataType": "NUMERIC",
  "unitOfMeasure": "°C",
  "isCritical": true,
  "requiresVerification": true,
  "parameterGroupId": "PG-TEMPERATURE"
}
```

**Common Queries:**
- Find critical parameters for operation setup
- Generate parameter control charts for SPC analysis
- Track parameter changes for process optimization

**Related Tables:** Operation, ParameterLimits, ParameterGroup, SPCConfiguration

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** operationId, parameterName
- **Index:** operationId
- **Index:** parameterType

---

### ParameterLimits

**Description:** Control limits and alarm thresholds for operation parameters enabling automatic process monitoring and quality control

**Business Purpose:** Provides automated process monitoring and alarm generation to prevent defects and ensure consistent manufacturing quality

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Quality Engineering Teams
- **Update Frequency:** Updated when process capability changes, quality requirements change, or SPC studies determine new limits
- **Data Retention:** Permanent retention for process capability and control system validation
- **Security Classification:** Internal - Process control limits with quality and competitive implications

**Compliance Notes:** Control limits essential for statistical process control, process validation, and regulatory compliance documentation

**System Integrations:** SPC Systems, Process Control, Alarm Management, Quality Monitoring

**Fields (16):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| parameterId | String | ✓ |  |  |  |
| engineeringMin | Float |  |  |  |  |
| engineeringMax | Float |  |  |  |  |
| operatingMin | Float |  |  |  |  |
| operatingMax | Float |  |  |  |  |
| LSL | Float |  |  |  |  |
| USL | Float |  |  |  |  |
| nominalValue | Float |  |  |  |  |
| highHighAlarm | Float |  |  |  |  |
| highAlarm | Float |  |  |  |  |
| lowAlarm | Float |  |  |  |  |
| lowLowAlarm | Float |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| parameter | OperationParameter | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | OperationParameter | parameter | ✓ |  |

**Usage Examples:**

#### Machining tolerance limits

Spindle speed control limits with engineering range and operating alarms for quality control

```json
{
  "parameterId": "PARAM-SPINDLE-SPEED-001",
  "engineeringMin": 800,
  "engineeringMax": 3000,
  "operatingMin": 1200,
  "operatingMax": 2400,
  "nominalValue": 1500,
  "highAlarm": 2200,
  "lowAlarm": 1000
}
```

#### Critical temperature control

Critical temperature limits with specification limits and multi-level alarm structure

```json
{
  "parameterId": "PARAM-FURNACE-TEMP-001",
  "LSL": 580,
  "USL": 620,
  "nominalValue": 600,
  "highHighAlarm": 630,
  "highAlarm": 615,
  "lowAlarm": 585,
  "lowLowAlarm": 575
}
```

**Common Queries:**
- Find parameters exceeding control limits for alarm management
- Generate control charts with specification limits
- Track parameter capability and performance trends

**Related Tables:** OperationParameter, SPCConfiguration, QualityMeasurement

**Constraints & Indexes:**

- **Primary Key:** id

---

### ParameterGroup

**Description:** Hierarchical organization of operation parameters into logical groups for streamlined process management and operator interface design

**Business Purpose:** Organizes complex parameter sets into manageable groups enabling efficient operator training, system navigation, and process control

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and User Experience Teams
- **Update Frequency:** Updated when process organization changes, new parameter groups are needed, or user interface improvements are implemented
- **Data Retention:** Permanent retention for process organization and operator training consistency
- **Security Classification:** Internal - Process organization and operator interface information

**Compliance Notes:** Parameter grouping supports operator training requirements and process documentation for regulatory compliance

**System Integrations:** Operator Interfaces, Training Systems, Process Control, Work Instructions

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| groupName | String | ✓ |  |  |  |
| parentGroupId | String |  |  |  |  |
| groupType | ParameterGroupType | ✓ |  |  |  |
| description | String |  |  |  |  |
| tags | String[] | ✓ |  |  |  |
| displayOrder | Int |  |  |  |  |
| icon | String |  |  |  |  |
| color | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| parameters | OperationParameter[] | ✓ |  |  |  |
| parentGroup | ParameterGroup |  |  |  |  |
| childGroups | ParameterGroup[] | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | OperationParameter | parameters | ✓ |  |

**Usage Examples:**

#### Machining parameters group

Machining parameter group with visual interface elements for operator clarity

```json
{
  "groupName": "Spindle Control",
  "groupType": "PROCESS_CONTROL",
  "description": "Spindle speed, feed rate, and cutting parameters",
  "parentGroupId": "PG-MACHINING",
  "displayOrder": 1,
  "icon": "spindle",
  "color": "#4CAF50"
}
```

#### Temperature monitoring group

Critical temperature parameter group with alarm capability and priority designation

```json
{
  "groupName": "Temperature Control",
  "groupType": "MONITORING",
  "description": "Process temperature monitoring and control parameters",
  "tags": [
    "CRITICAL",
    "ALARM_ENABLED"
  ],
  "displayOrder": 2,
  "icon": "temperature"
}
```

**Common Queries:**
- Find parameter groups by type for interface design
- Generate hierarchical parameter displays for operators
- Organize parameters for training and documentation

**Related Tables:** OperationParameter, Operation, WorkInstruction

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentGroupId
- **Index:** groupType

---

### ParameterFormula

**Description:** Calculated parameters using formulas and expressions to derive values from other parameters for advanced process control

**Business Purpose:** Enables sophisticated process control through calculated parameters, derived measurements, and automated parameter relationships

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Automation Teams
- **Update Frequency:** Updated when calculation logic changes, new derived parameters are needed, or process optimization requires formula adjustments
- **Data Retention:** Permanent retention for calculation validation and process control system documentation
- **Security Classification:** Internal - Process calculation logic with competitive and operational sensitivity

**Compliance Notes:** Formula documentation required for process validation, calculation traceability, and regulatory audit requirements

**System Integrations:** Process Control Systems, SPC Analytics, Automated Control, Real-time Calculations

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| formulaName | String | ✓ |  |  |  |
| outputParameterId | String | ✓ |  |  |  |
| formulaExpression | String | ✓ |  |  |  |
| formulaLanguage | FormulaLanguage | ✓ | JAVASCRIPT |  |  |
| inputParameterIds | String[] | ✓ |  |  |  |
| evaluationTrigger | EvaluationTrigger | ✓ | ON_CHANGE |  |  |
| evaluationSchedule | String |  |  |  |  |
| testCases | Json |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdBy | String | ✓ |  |  |  |
| lastModifiedBy | String |  |  |  |  |
| outputParameter | OperationParameter | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | OperationParameter | outputParameter | ✓ |  |

**Usage Examples:**

#### Feed rate calculation

Automatic feed rate calculation based on spindle speed and cutting tool parameters

```json
{
  "formulaName": "Optimal Feed Rate",
  "outputParameterId": "PARAM-FEED-RATE-CALC",
  "formulaExpression": "spindleSpeed * chipLoad * numberOfTeeth",
  "formulaLanguage": "JAVASCRIPT",
  "inputParameterIds": [
    "PARAM-SPINDLE-SPEED",
    "PARAM-CHIP-LOAD",
    "PARAM-TEETH"
  ],
  "evaluationTrigger": "ON_CHANGE"
}
```

#### Process efficiency calculation

Scheduled efficiency calculation updated every 5 minutes for performance monitoring

```json
{
  "formulaName": "Cycle Time Efficiency",
  "outputParameterId": "PARAM-EFFICIENCY-PCT",
  "formulaExpression": "(standardCycleTime / actualCycleTime) * 100",
  "inputParameterIds": [
    "PARAM-STANDARD-TIME",
    "PARAM-ACTUAL-TIME"
  ],
  "evaluationTrigger": "ON_SCHEDULE",
  "evaluationSchedule": "*/5 * * * *"
}
```

**Common Queries:**
- Find formulas requiring recalculation after parameter changes
- Generate calculated parameter values for process control
- Track formula performance and calculation accuracy

**Related Tables:** OperationParameter, Operation, SPCConfiguration

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** outputParameterId

---

### OperationDependency

**Description:** Dependencies and prerequisites between manufacturing operations defining sequence constraints and timing relationships for production scheduling

**Business Purpose:** Ensures proper operation sequencing and timing to maintain product quality, process integrity, and manufacturing efficiency

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Production Planning Teams
- **Update Frequency:** Updated when process sequences change, new dependencies are identified, or manufacturing methods are modified
- **Data Retention:** Permanent retention for process validation and manufacturing methodology documentation
- **Security Classification:** Internal - Manufacturing process relationships with competitive sensitivity

**Compliance Notes:** Operation dependencies critical for process validation, quality control, and regulatory compliance in controlled manufacturing

**System Integrations:** Production Scheduling, Work Order Management, Capacity Planning, Process Control

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| dependentOperationId | String | ✓ |  |  |  |
| prerequisiteOperationId | String | ✓ |  |  |  |
| dependencyType | DependencyType | ✓ |  |  |  |
| timingType | DependencyTimingType | ✓ |  |  |  |
| lagTime | Int |  |  |  |  |
| leadTime | Int |  |  |  |  |
| condition | String |  |  |  |  |
| isOptional | Boolean | ✓ | auto |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| dependentOperation | Operation | ✓ |  |  |  |
| prerequisiteOperation | Operation | ✓ |  |  |  |

**Usage Examples:**

#### Heat treatment dependency

Machining operation dependent on heat treatment completion with mandatory cooling period

```json
{
  "dependentOperationId": "OP-MACHINE-001",
  "prerequisiteOperationId": "OP-HEAT-TREAT-001",
  "dependencyType": "PROCESS_SEQUENCE",
  "timingType": "FINISH_TO_START",
  "lagTime": "24 hours",
  "condition": "Material must cool to room temperature before machining"
}
```

#### Quality inspection prerequisite

Assembly operation requires successful dimensional inspection completion

```json
{
  "dependentOperationId": "OP-ASSEMBLY-001",
  "prerequisiteOperationId": "OP-INSPECT-DIM-001",
  "dependencyType": "QUALITY_GATE",
  "timingType": "FINISH_TO_START",
  "isOptional": false,
  "condition": "All dimensions must pass inspection before assembly"
}
```

**Common Queries:**
- Find operation prerequisites for scheduling and planning
- Generate operation sequence diagrams for process visualization
- Validate operation dependencies for process compliance

**Related Tables:** Operation, Routing, RoutingStep, WorkOrder

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** dependentOperationId, prerequisiteOperationId
- **Index:** dependentOperationId
- **Index:** prerequisiteOperationId

---

### PersonnelOperationSpecification

**Description:** Personnel requirements and specifications for manufacturing operations defining required skills, certifications, and competency levels

**Business Purpose:** Ensures proper personnel capability matching for production operations by specifying exact skill and certification requirements

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Human Resources Teams
- **Update Frequency:** Updated when operation requirements change, new certifications are established, or competency standards are modified
- **Data Retention:** 7 years for competency validation and regulatory compliance
- **Security Classification:** Internal - Personnel competency requirements and operational assignments

**Compliance Notes:** Personnel specifications critical for AS9100 competency requirements and ensuring qualified personnel perform critical operations

**System Integrations:** Personnel Management, Operations Management, Training Systems, Work Order Assignment, Competency Management

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| operationId | String | ✓ |  |  |  |
| personnelClassId | String |  |  |  |  |
| skillId | String |  |  |  |  |
| minimumCompetency | CompetencyLevel |  |  |  |  |
| requiredCertifications | String[] | ✓ |  |  |  |
| quantity | Int | ✓ | 1 |  |  |
| isOptional | Boolean | ✓ | auto |  |  |
| roleName | String |  |  |  |  |
| roleDescription | String |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| operation | Operation | ✓ |  |  |  |

**Usage Examples:**

#### CNC machining personnel requirement

Advanced machinist requirements for critical aerospace titanium machining with specific skills and safety certifications

```json
{
  "operationId": "OP-MILL-001",
  "partNumber": "TB-A380-001",
  "requiredCertification": "CNC_MACHINING_TITANIUM",
  "minimumExperience": 24,
  "experienceUnit": "MONTHS",
  "requiredSkills": [
    "5_AXIS_PROGRAMMING",
    "TITANIUM_MACHINING",
    "CMM_OPERATION"
  ],
  "competencyLevel": "ADVANCED",
  "supervisorRequired": false,
  "maxConcurrentOperators": 1,
  "shiftRestrictions": "DAY_SHIFT_ONLY",
  "safetyRequirements": [
    "CONFINED_SPACE_CERTIFIED",
    "MACHINE_SAFETY_TRAINED"
  ]
}
```

#### Quality inspection personnel requirement

Certified quality inspector requirements for aerospace FAI with customer approvals and equipment authorizations

```json
{
  "operationId": "OP-INSP-005",
  "requiredCertification": "AS9102_FAI_INSPECTOR",
  "minimumExperience": 36,
  "experienceUnit": "MONTHS",
  "equipmentAuthorizations": [
    "CMM_ZEISS",
    "OPTICAL_COMPARATOR"
  ],
  "customerApprovals": [
    "BOEING",
    "AIRBUS"
  ],
  "independentInspectionRequired": true,
  "maxInspectionHours": 6
}
```

**Common Queries:**
- Find qualified personnel for specific operations
- Validate personnel assignments against operation requirements
- Generate competency gap analysis for training planning

**Related Tables:** Operation, PersonnelQualification, User, WorkOrderOperation, PersonnelClass

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** operationId
- **Index:** personnelClassId

---

### EquipmentOperationSpecification

**Description:** Equipment requirements and specifications for manufacturing operations defining equipment capabilities, capacity, and setup requirements

**Business Purpose:** Ensures proper equipment selection and capacity allocation for manufacturing operations based on technical requirements and production needs

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Process Engineering Teams
- **Update Frequency:** Updated when operation requirements change, equipment capabilities are modified, or process optimization identifies new specifications
- **Data Retention:** Permanent retention for process validation and equipment requirement documentation
- **Security Classification:** Internal - Manufacturing process requirements with competitive and operational sensitivity

**Compliance Notes:** Equipment specifications critical for process validation, capability verification, and regulatory compliance in controlled manufacturing

**System Integrations:** Equipment Management, Operation Planning, Capacity Planning, Work Order Assignment

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| operationId | String | ✓ |  |  |  |
| equipmentClass | EquipmentClass |  |  |  |  |
| equipmentType | String |  |  |  |  |
| specificEquipmentId | String |  |  |  |  |
| requiredCapabilities | String[] | ✓ |  |  |  |
| minimumCapacity | Float |  |  |  |  |
| quantity | Int | ✓ | 1 |  |  |
| isOptional | Boolean | ✓ | auto |  |  |
| setupRequired | Boolean | ✓ | auto |  |  |
| setupTime | Int |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| operation | Operation | ✓ |  |  |  |

**Usage Examples:**

#### CNC machining operation requirements

Precision machining operation requiring specific 5-axis CNC capabilities with titanium processing

```json
{
  "operationId": "OP-MILL-001",
  "equipmentClass": "CNC_MILL",
  "equipmentType": "5-Axis CNC Machining Center",
  "requiredCapabilities": [
    "HIGH_PRECISION",
    "TITANIUM_CAPABLE",
    "COOLANT_SYSTEM"
  ],
  "minimumCapacity": "1000mm x 800mm x 600mm",
  "setupRequired": true,
  "setupTime": 30
}
```

#### Heat treatment operation requirements

Critical heat treatment requiring vacuum furnace with aerospace certification

```json
{
  "operationId": "OP-HEAT-TREAT-001",
  "equipmentClass": "FURNACE",
  "equipmentType": "Vacuum Heat Treatment Furnace",
  "requiredCapabilities": [
    "VACUUM_CAPABLE",
    "1200C_MAX_TEMP",
    "ATMOSPHERE_CONTROL"
  ],
  "quantity": 1,
  "isOptional": false,
  "notes": "Aerospace certification required for titanium heat treatment"
}
```

**Common Queries:**
- Find equipment meeting operation requirements for routing
- Generate equipment specification reports for capacity planning
- Validate equipment capabilities against operation needs

**Related Tables:** Operation, Equipment, EquipmentCapability, WorkCenter

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** operationId
- **Index:** equipmentClass

---

### MaterialOperationSpecification

**Description:** Material requirements and consumption specifications for manufacturing operations defining material types, quantities, and quality standards

**Business Purpose:** Ensures correct material allocation and consumption tracking by specifying exact material requirements for each manufacturing operation

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Materials Management Teams
- **Update Frequency:** Updated when material requirements change, new materials are qualified, or process optimization affects consumption
- **Data Retention:** Permanent retention for traceability and process validation
- **Security Classification:** Internal - Material consumption and operational specifications

**Compliance Notes:** Material specifications critical for traceability compliance and quality assurance - must maintain material-operation linkage for regulatory audits

**System Integrations:** Material Management, Production Planning, Work Order Management, Quality Management, Inventory Control

**Fields (16):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| operationId | String | ✓ |  |  |  |
| materialDefinitionId | String |  |  |  |  |
| materialClassId | String |  |  |  |  |
| materialType | MaterialType |  |  |  |  |
| quantity | Float | ✓ |  |  |  |
| unitOfMeasure | String | ✓ |  |  |  |
| consumptionType | ConsumptionType | ✓ |  |  |  |
| requiredProperties | String[] | ✓ |  |  |  |
| qualityRequirements | String |  |  |  |  |
| isOptional | Boolean | ✓ | auto |  |  |
| allowSubstitutes | Boolean | ✓ | auto |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| operation | Operation | ✓ |  |  |  |

**Usage Examples:**

#### Titanium alloy machining specification

Precision machining operation requiring certified titanium alloy with waste factor for material planning

```json
{
  "operationId": "OP-MILL-001",
  "materialDefinitionId": "TI-6AL-4V-BAR",
  "materialType": "RAW_MATERIAL",
  "quantityRequired": 2.5,
  "quantityUnit": "KG",
  "consumptionType": "CONSUMED",
  "qualityRequirements": "Aerospace grade certification required",
  "isRequired": true,
  "wasteFactor": 0.15
}
```

#### Assembly consumable specification

Assembly operation specifying fastener requirements with installation specifications and quality criteria

```json
{
  "operationId": "OP-ASSEMBLY-001",
  "materialDefinitionId": "FASTENER-SS-M6",
  "materialType": "FASTENER",
  "quantityRequired": 12,
  "quantityUnit": "EA",
  "consumptionType": "CONSUMED",
  "qualityRequirements": "Torque specification 25 Nm ±5%",
  "installationNotes": "Apply thread locker per specification"
}
```

**Common Queries:**
- Generate material requirements for work order planning
- Track material consumption against specifications
- Validate material compliance for quality assurance

**Related Tables:** Operation, MaterialDefinition, WorkOrder, BOMItem, MaterialTransaction

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** operationId
- **Index:** materialDefinitionId

---

### PhysicalAssetOperationSpecification

**Description:** Physical asset requirements and specifications for manufacturing operations defining equipment, tooling, and infrastructure needs

**Business Purpose:** Ensures proper physical asset allocation and availability for manufacturing operations by specifying required assets, quantities, and specifications

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Asset Management Teams
- **Update Frequency:** Updated when operation requirements change, new assets are qualified, or asset specifications are modified
- **Data Retention:** 7 years for asset utilization analysis and operational optimization
- **Security Classification:** Internal - Asset requirements and operational specifications

**Compliance Notes:** Asset specifications support capacity planning and ensure proper asset utilization for regulatory compliance and operational efficiency

**System Integrations:** Asset Management, Operations Management, Maintenance Systems, Capacity Planning, Work Order Management

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| operationId | String | ✓ |  |  |  |
| assetType | PhysicalAssetType | ✓ |  |  |  |
| assetCode | String |  |  |  |  |
| assetName | String | ✓ |  |  |  |
| specifications | Json |  |  |  |  |
| quantity | Int | ✓ | 1 |  |  |
| isOptional | Boolean | ✓ | auto |  |  |
| requiresCalibration | Boolean | ✓ | auto |  |  |
| calibrationInterval | Int |  |  |  |  |
| estimatedLifeCycles | Int |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| operation | Operation | ✓ |  |  |  |

**Usage Examples:**

#### CNC machining asset requirement

Specific CNC machine requirements for precision titanium milling with calibration and lifecycle specifications

```json
{
  "operationId": "OP-MILL-001",
  "assetType": "CNC_MACHINE",
  "assetCode": "CNC-MILL-001",
  "assetName": "5-Axis CNC Milling Center",
  "specifications": {
    "workEnvelope": "800x600x500mm",
    "spindleSpeed": "15000 RPM",
    "toolCapacity": 40,
    "accuracy": "±0.005mm",
    "requiredOptions": [
      "High-pressure coolant",
      "Titanium cutting package"
    ]
  },
  "quantity": 1,
  "isOptional": false,
  "requiresCalibration": true,
  "calibrationInterval": 6,
  "estimatedLifeCycles": 10000
}
```

#### Assembly station tooling requirement

Assembly fixture specification with clamping system and positioning requirements for engine component assembly

```json
{
  "operationId": "OP-ASSEMBLY-001",
  "assetType": "ASSEMBLY_FIXTURE",
  "assetCode": "FIX-ENGINE-001",
  "assetName": "Engine Subassembly Fixture",
  "specifications": {
    "partNumber": "ENGINE-VALVE-002",
    "fixtureType": "Pneumatic clamping",
    "loadCapacity": "50 kg",
    "positioningAccuracy": "±0.1mm",
    "cycleTime": "45 seconds"
  },
  "quantity": 1,
  "isOptional": false,
  "requiresCalibration": false,
  "notes": "Dedicated fixture for engine valve subassembly with pneumatic clamping system"
}
```

**Common Queries:**
- Find required assets for work order planning
- Track asset utilization and availability
- Generate asset calibration schedules for operations

**Related Tables:** Operation, PhysicalAsset, AssetCalibration, WorkOrder, MaintenanceSchedule

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** operationId
- **Index:** assetType

---

### Part

**Description:** Master part data defining all manufactured, purchased, and assemblable items with specifications and lifecycle management

**Business Purpose:** Serves as the foundation for all product-related activities including design, manufacturing, purchasing, and inventory management

**Data Governance:**
- **Data Owner:** Engineering and Product Management Teams
- **Update Frequency:** Updated when new parts are introduced, specifications change, or lifecycle transitions occur
- **Data Retention:** Permanent retention for product lifecycle, warranty, and regulatory compliance
- **Security Classification:** Internal - Product design and manufacturing information with competitive sensitivity

**Compliance Notes:** Part data critical for regulatory compliance, change control, and customer part approval requirements

**System Integrations:** ERP Product Master, PLM Systems, CAD Systems, Inventory Management, Purchasing Systems

**Fields (45):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| partNumber | String | ✓ |  |  |  |
| partName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| partType | String | ✓ |  |  |  |
| productType | ProductType | ✓ | MADE_TO_STOCK |  |  |
| lifecycleState | ProductLifecycleState | ✓ | PRODUCTION |  |  |
| unitOfMeasure | String | ✓ |  |  |  |
| weight | Float |  |  |  |  |
| weightUnit | String |  |  |  |  |
| drawingNumber | String |  |  |  |  |
| revision | String |  |  |  |  |
| cadModelUrl | String |  |  |  |  |
| releaseDate | DateTime |  |  |  |  |
| obsoleteDate | DateTime |  |  |  |  |
| replacementPartId | String |  |  |  |  |
| makeOrBuy | String |  | MAKE |  |  |
| leadTimeDays | Int |  |  |  |  |
| lotSizeMin | Int |  |  |  |  |
| lotSizeMultiple | Int |  |  |  |  |
| standardCost | Float |  |  |  |  |
| targetCost | Float |  |  |  |  |
| currency | String |  | USD |  |  |
| isActive | Boolean | ✓ | true |  |  |
| isConfigurable | Boolean | ✓ | auto |  |  |
| requiresFAI | Boolean | ✓ | auto |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| componentItems | BOMItem[] | ✓ |  |  |  |
| bomItems | BOMItem[] | ✓ |  |  |  |
| equipmentMaterialMovements | EquipmentMaterialMovement[] | ✓ |  |  |  |
| erpMaterialTransactions | ERPMaterialTransaction[] | ✓ |  |  |  |
| inventoryItems | Inventory[] | ✓ |  |  |  |
| siteAvailability | PartSiteAvailability[] | ✓ |  |  |  |
| replacementPart | Part |  |  |  |  |
| replacedParts | Part[] | ✓ |  |  |  |
| configurations | ProductConfiguration[] | ✓ |  |  |  |
| lifecycleHistory | ProductLifecycle[] | ✓ |  |  |  |
| specifications | ProductSpecification[] | ✓ |  |  |  |
| productionScheduleRequests | ProductionScheduleRequest[] | ✓ |  |  |  |
| qualityPlans | QualityPlan[] | ✓ |  |  |  |
| routings | Routing[] | ✓ |  |  |  |
| scheduleEntries | ScheduleEntry[] | ✓ |  |  |  |
| serializedParts | SerializedPart[] | ✓ |  |  |  |
| workOrders | WorkOrder[] | ✓ |  |  |  |
**Relationships (14):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | BOMItem | componentItems | ✓ |  |
| one-to-many | BOMItem | bomItems | ✓ |  |
| one-to-many | EquipmentMaterialMovement | equipmentMaterialMovements | ✓ |  |
| one-to-many | ERPMaterialTransaction | erpMaterialTransactions | ✓ |  |
| one-to-many | Inventory | inventoryItems | ✓ |  |
| one-to-many | PartSiteAvailability | siteAvailability | ✓ |  |
| one-to-one | Part | replacementPart |  |  |
| one-to-many | Part | replacedParts | ✓ |  |
| one-to-many | ProductConfiguration | configurations | ✓ |  |
| one-to-many | ProductSpecification | specifications | ✓ |  |
| one-to-many | ProductionScheduleRequest | productionScheduleRequests | ✓ |  |
| one-to-many | QualityPlan | qualityPlans | ✓ |  |
| one-to-many | ScheduleEntry | scheduleEntries | ✓ |  |
| one-to-many | SerializedPart | serializedParts | ✓ |  |

**Usage Examples:**

#### Aerospace turbine blade part

Critical aerospace component with controlled drawings and revision management

```json
{
  "partNumber": "TB-A380-001",
  "partName": "Turbine Blade - First Stage",
  "partType": "MANUFACTURED",
  "productType": "MADE_TO_ORDER",
  "lifecycleState": "PRODUCTION",
  "drawingNumber": "DWG-TB-A380-001-R3",
  "revision": "C"
}
```

#### Commercial off-the-shelf component

Standard purchased component with lead time and procurement information

```json
{
  "partNumber": "BOLT-M12-SS-001",
  "partName": "M12x40 Stainless Steel Bolt",
  "partType": "PURCHASED",
  "productType": "MADE_TO_STOCK",
  "makeOrBuy": "BUY",
  "leadTimeDays": 14
}
```

**Common Queries:**
- Find parts by lifecycle state for product planning
- Generate part lists for BOM explosion
- Track part changes and revision history for compliance

**Related Tables:** BOMItem, WorkOrder, ProductSpecification, Routing, SerializedPart

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** productType
- **Index:** lifecycleState
- **Index:** isActive
- **Index:** partNumber

---

### PartSiteAvailability

**Description:** Part availability and manufacturing capability by site including costs, lead times, and production constraints for multi-site operations

**Business Purpose:** Enables optimal site selection for part production based on capability, cost, and capacity considerations across multiple manufacturing locations

**Data Governance:**
- **Data Owner:** Production Planning and Site Operations Teams
- **Update Frequency:** Updated when site capabilities change, costs are revised, or production capacity is modified
- **Data Retention:** 5 years for cost analysis and production planning historical data
- **Security Classification:** Internal - Site capabilities and cost information with competitive sensitivity

**Compliance Notes:** Site availability must consider regulatory approvals, customer certifications, and quality system requirements

**System Integrations:** Production Planning, Cost Management, Site Management, Customer Requirements

**Fields (17):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| partId | String | ✓ |  |  |  |
| siteId | String | ✓ |  |  |  |
| isPreferred | Boolean | ✓ | auto |  |  |
| isActive | Boolean | ✓ | true |  |  |
| leadTimeDays | Int |  |  |  |  |
| minimumLotSize | Int |  |  |  |  |
| maximumLotSize | Int |  |  |  |  |
| standardCost | Float |  |  |  |  |
| setupCost | Float |  |  |  |  |
| effectiveDate | DateTime |  |  |  |  |
| expirationDate | DateTime |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| part | Part | ✓ |  |  |  |
| site | Site | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Part | part | ✓ |  |
| one-to-one | Site | site | ✓ |  |

**Usage Examples:**

#### Preferred site for aerospace parts

Preferred Atlanta site for aerospace turbine blade production with customer certification

```json
{
  "partId": "TB-A380-001",
  "siteId": "ATL-01",
  "isPreferred": true,
  "isActive": true,
  "leadTimeDays": 14,
  "minimumLotSize": 10,
  "standardCost": 1250.5,
  "notes": "AS9100 certified site with customer approval for aerospace turbine blades"
}
```

#### Alternative site with cost advantage

Alternative Dallas site for standard bolt production with cost advantages for larger quantities

```json
{
  "partId": "BOLT-M12-001",
  "siteId": "DFW-02",
  "isPreferred": false,
  "isActive": true,
  "leadTimeDays": 7,
  "minimumLotSize": 100,
  "standardCost": 2.75,
  "setupCost": 150
}
```

**Common Queries:**
- Find optimal sites for part production based on cost and capability
- Generate site loading reports for capacity planning
- Track part availability and lead times across sites

**Related Tables:** Part, Site, WorkOrder, ProductionSchedule

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** partId, siteId
- **Index:** siteId
- **Index:** isActive

---

### BOMItem

**Description:** Bill of Materials structure defining parent-child relationships between parts with quantities and assembly information

**Business Purpose:** Defines product structure enabling material planning, costing, and manufacturing execution based on assembly hierarchy

**Data Governance:**
- **Data Owner:** Engineering and Manufacturing Engineering Teams
- **Update Frequency:** Updated when product designs change, engineering changes occur, or assembly methods are modified
- **Data Retention:** Permanent retention for product configuration history and regulatory compliance
- **Security Classification:** Internal - Product structure and design information with competitive sensitivity

**Compliance Notes:** BOM changes must be controlled through engineering change process for traceability and customer approval

**System Integrations:** PLM Systems, ERP BOM Management, Material Requirements Planning, Cost Management

**Fields (23):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| parentPartId | String | ✓ |  |  |  |
| componentPartId | String | ✓ |  |  |  |
| quantity | Float | ✓ |  |  |  |
| unitOfMeasure | String | ✓ |  |  |  |
| scrapFactor | Float |  | auto |  |  |
| sequence | Int |  |  |  |  |
| findNumber | String |  |  |  |  |
| referenceDesignator | String |  |  |  |  |
| operationId | String |  |  |  |  |
| operationNumber | Int |  |  |  |  |
| effectiveDate | DateTime |  |  |  |  |
| obsoleteDate | DateTime |  |  |  |  |
| ecoNumber | String |  |  |  |  |
| isOptional | Boolean | ✓ | auto |  |  |
| isCritical | Boolean | ✓ | auto |  |  |
| notes | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| componentPart | Part | ✓ |  |  |  |
| operation | Operation |  |  |  |  |
| parentPart | Part | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Part | componentPart | ✓ |  |
| one-to-one | Part | parentPart | ✓ |  |

**Usage Examples:**

#### Turbine assembly BOM item

Critical blade component in turbine assembly with specific operation assignment

```json
{
  "parentPartId": "TURB-ASSY-001",
  "componentPartId": "TB-A380-001",
  "quantity": 24,
  "unitOfMeasure": "EA",
  "findNumber": "1",
  "operationNumber": 10,
  "isCritical": true
}
```

#### Optional configuration component

Optional component with engineering change tracking and effective date control

```json
{
  "parentPartId": "ENGINE-MOUNT-001",
  "componentPartId": "VIBRATION-DAMPER-001",
  "quantity": 2,
  "isOptional": true,
  "effectiveDate": "2024-01-15",
  "ecoNumber": "ECO-2024-001"
}
```

**Common Queries:**
- Explode BOM for material requirements planning
- Find where-used information for impact analysis
- Generate assembly lists for production planning

**Related Tables:** Part, Operation, MaterialTransaction, WorkOrder

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentPartId
- **Index:** componentPartId
- **Index:** operationId
- **Index:** effectiveDate

---

### ProductSpecification

**Description:** Detailed technical specifications and requirements for parts including dimensions, materials, and performance criteria

**Business Purpose:** Defines quality requirements and acceptance criteria ensuring parts meet design intent and customer specifications

**Data Governance:**
- **Data Owner:** Engineering and Quality Assurance Teams
- **Update Frequency:** Updated when specifications change, quality requirements are modified, or customer requirements change
- **Data Retention:** Permanent retention for product compliance and quality system requirements
- **Security Classification:** Internal - Technical specifications with potential customer and competitive sensitivity

**Compliance Notes:** Specifications must be controlled and approved per quality system requirements and customer agreements

**System Integrations:** Quality Management, Inspection Planning, Supplier Management, Customer Requirements

**Fields (19):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| partId | String | ✓ |  |  |  |
| specificationName | String | ✓ |  |  |  |
| specificationType | SpecificationType | ✓ |  |  |  |
| specificationValue | String |  |  |  |  |
| nominalValue | Float |  |  |  |  |
| minValue | Float |  |  |  |  |
| maxValue | Float |  |  |  |  |
| unitOfMeasure | String |  |  |  |  |
| testMethod | String |  |  |  |  |
| inspectionFrequency | String |  |  |  |  |
| isCritical | Boolean | ✓ | auto |  |  |
| isRegulatory | Boolean | ✓ | auto |  |  |
| documentReferences | String[] | ✓ |  |  |  |
| notes | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| part | Part | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Part | part | ✓ |  |

**Usage Examples:**

#### Critical dimensional specification

Critical aerospace dimension with tight tolerance requiring regulatory compliance

```json
{
  "partId": "TB-A380-001",
  "specificationName": "Blade Profile Tolerance",
  "specificationType": "DIMENSIONAL",
  "nominalValue": 25.4,
  "minValue": 25.35,
  "maxValue": 25.45,
  "unitOfMeasure": "mm",
  "isCritical": true,
  "isRegulatory": true
}
```

#### Material property specification

Material strength requirement with specified test method and regulatory documentation

```json
{
  "partId": "TB-A380-001",
  "specificationName": "Tensile Strength",
  "specificationType": "MATERIAL_PROPERTY",
  "specificationValue": "≥950 MPa",
  "testMethod": "ASTM E8",
  "isRegulatory": true,
  "documentReferences": [
    "AMS-4928",
    "ASTM-E8"
  ]
}
```

**Common Queries:**
- Find specifications by criticality for quality planning
- Generate inspection requirements from specifications
- Track specification changes for customer notification

**Related Tables:** Part, QualityPlan, QualityCharacteristic, InspectionPlan

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** partId
- **Index:** specificationType
- **Index:** isCritical

---

### ProductConfiguration

**Description:** Product configuration variants and options enabling customizable products with different features and characteristics

**Business Purpose:** Supports product customization and variant management for customer-specific requirements and market differentiation

**Data Governance:**
- **Data Owner:** Product Management and Sales Engineering Teams
- **Update Frequency:** Updated when new configurations are introduced, options change, or market requirements evolve
- **Data Retention:** Permanent retention for product configuration history and customer order fulfillment
- **Security Classification:** Internal - Product configuration and pricing information with competitive sensitivity

**Compliance Notes:** Configuration changes may require customer approval and regulatory certification for safety-critical applications

**System Integrations:** Sales Configuration, Order Management, Engineering Change Control, Manufacturing Planning

**Fields (21):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| partId | String | ✓ |  |  |  |
| configurationName | String | ✓ |  |  |  |
| configurationType | ConfigurationType | ✓ |  |  |  |
| description | String |  |  |  |  |
| configurationCode | String |  |  |  |  |
| attributes | Json |  |  |  |  |
| priceModifier | Float |  | auto |  |  |
| costModifier | Float |  | auto |  |  |
| leadTimeDelta | Int |  | auto |  |  |
| isAvailable | Boolean | ✓ | true |  |  |
| effectiveDate | DateTime |  |  |  |  |
| obsoleteDate | DateTime |  |  |  |  |
| isDefault | Boolean | ✓ | auto |  |  |
| marketingName | String |  |  |  |  |
| imageUrl | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| options | ConfigurationOption[] | ✓ |  |  |  |
| part | Part | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | ConfigurationOption | options | ✓ |  |
| one-to-one | Part | part | ✓ |  |

**Usage Examples:**

#### Engine performance configuration

Performance upgrade configuration with pricing impact and extended lead time

```json
{
  "partId": "ENGINE-TURBO-001",
  "configurationName": "High Performance",
  "configurationType": "PERFORMANCE_VARIANT",
  "description": "Enhanced performance configuration for aerospace applications",
  "priceModifier": 15000,
  "leadTimeDelta": 14,
  "isAvailable": true
}
```

#### Regional compliance configuration

Regulatory compliance configuration for specific market requirements

```json
{
  "partId": "ENGINE-TURBO-001",
  "configurationName": "EU Emissions Compliant",
  "configurationType": "REGULATORY_VARIANT",
  "description": "EU emissions standards compliance configuration",
  "marketingName": "EuroClean",
  "effectiveDate": "2024-01-01"
}
```

**Common Queries:**
- Find available configurations for sales quotation
- Generate configuration BOMs for manufacturing
- Track configuration usage for market analysis

**Related Tables:** Part, ConfigurationOption, WorkOrder, ProductLifecycle

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** partId
- **Index:** configurationType
- **Index:** isDefault

---

### ConfigurationOption

**Description:** Product configuration options and variants enabling customizable manufacturing for different customer requirements and specifications

**Business Purpose:** Supports mass customization by defining configurable product options, enabling efficient manufacturing of customer-specific variants

**Data Governance:**
- **Data Owner:** Product Engineering and Manufacturing Engineering Teams
- **Update Frequency:** Updated when new configuration options are introduced, modified, or discontinued based on customer requirements
- **Data Retention:** Permanent retention for product configuration history and customer traceability
- **Security Classification:** Internal - Product configuration and customer-specific requirements

**Compliance Notes:** Configuration management supports product traceability and ensures proper documentation of custom product variants

**System Integrations:** Product Management, Work Order Management, BOM Management, Customer Requirements, Engineering Change Management

**Fields (17):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| configurationId | String | ✓ |  |  |  |
| optionName | String | ✓ |  |  |  |
| optionCode | String |  |  |  |  |
| description | String |  |  |  |  |
| optionCategory | String |  |  |  |  |
| optionValue | String |  |  |  |  |
| isRequired | Boolean | ✓ | auto |  |  |
| isDefault | Boolean | ✓ | auto |  |  |
| addedPartIds | String[] | ✓ |  |  |  |
| removedPartIds | String[] | ✓ |  |  |  |
| priceModifier | Float |  | auto |  |  |
| costModifier | Float |  | auto |  |  |
| displayOrder | Int |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| configuration | ProductConfiguration | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | ProductConfiguration | configuration | ✓ |  |

**Usage Examples:**

#### Turbine blade coating configuration

Thermal barrier coating configuration option for aerospace turbine blades with customer-specific requirements

```json
{
  "configurationId": "CFG-TB-COATING-001",
  "productId": "TB-A380-001",
  "optionCategory": "SURFACE_COATING",
  "optionName": "Thermal Barrier Coating",
  "optionCode": "TBC_STANDARD",
  "description": "Standard thermal barrier coating for high-temperature operation",
  "technicalSpecs": {
    "coatingThickness": "0.008-0.012 inches",
    "coatingMaterial": "Yttria-stabilized zirconia",
    "bondCoatRequired": true,
    "thermalCycleRating": "1200°C maximum"
  },
  "customerOptions": [
    "AIRBUS",
    "BOEING"
  ],
  "additionalCost": 150,
  "leadTimeImpact": "2 days",
  "isStandard": true,
  "effectiveDate": "2024-01-01T00:00:00Z"
}
```

#### Engine valve material configuration

High-performance material configuration for engine valves with temperature rating and supplier restrictions

```json
{
  "configurationId": "CFG-EV-MATERIAL-002",
  "productId": "ENGINE-VALVE-002",
  "optionCategory": "MATERIAL_SELECTION",
  "optionName": "High-Temperature Alloy",
  "optionCode": "INCONEL_718",
  "description": "Inconel 718 superalloy for extreme temperature applications",
  "materialCertification": "AMS_5662_CERTIFIED",
  "temperatureRating": "700°C continuous operation",
  "applicationNotes": "Required for turbocharger applications",
  "supplierRestrictions": "Approved suppliers only - see ASL-001",
  "additionalCost": 85
}
```

**Common Queries:**
- Find available configuration options for customer orders
- Track configuration cost and lead time impacts
- Generate configuration documentation for work orders

**Related Tables:** Product, BOMItem, CustomerRequirement, MaterialDefinition, WorkOrder

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configurationId

---

### ProductLifecycle

**Description:** Product lifecycle management tracking development phases, production status, and end-of-life planning for manufactured products

**Business Purpose:** Manages complete product lifecycle from development through production to discontinuation, ensuring proper planning and customer communication

**Data Governance:**
- **Data Owner:** Product Management and Engineering Teams
- **Update Frequency:** Updated at major lifecycle milestones, phase transitions, and when lifecycle decisions are made
- **Data Retention:** Permanent retention for product history and customer support
- **Security Classification:** Internal - Product roadmap and lifecycle planning information

**Compliance Notes:** Lifecycle management supports product traceability, obsolescence planning, and customer notification requirements

**System Integrations:** Product Management, Engineering Change Management, Customer Management, Supply Chain, Production Planning

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| partId | String | ✓ |  |  |  |
| previousState | ProductLifecycleState |  |  |  |  |
| newState | ProductLifecycleState | ✓ |  |  |  |
| transitionDate | DateTime | ✓ | now( |  |  |
| reason | String |  |  |  |  |
| ecoNumber | String |  |  |  |  |
| approvedBy | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| notificationsSent | Boolean | ✓ | auto |  |  |
| impactAssessment | String |  |  |  |  |
| notes | String |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| part | Part | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Part | part | ✓ |  |

**Usage Examples:**

#### Aerospace turbine blade lifecycle

Long-lifecycle aerospace product with regulatory certification and extended spare parts support commitment

```json
{
  "productId": "TB-A380-001",
  "lifecyclePhase": "PRODUCTION",
  "phaseStartDate": "2023-01-15T00:00:00Z",
  "developmentPhase": "COMPLETED",
  "certificationStatus": "FAA_EASA_CERTIFIED",
  "productionVolume": "HIGH_VOLUME",
  "expectedLifecycleYears": 15,
  "plannedObsolescenceDate": "2039-01-15T00:00:00Z",
  "lastTimeByDate": "2038-01-15T00:00:00Z",
  "sparePartsSupport": "20 years post-production",
  "majorCustomers": [
    "AIRBUS",
    "BOEING"
  ],
  "lifecycleManager": "product_manager_wilson",
  "nextReviewDate": "2024-06-01T00:00:00Z"
}
```

#### Engine valve technology transition

Mature product transitioning to next-generation technology with managed customer migration and inventory planning

```json
{
  "productId": "ENGINE-VALVE-002",
  "lifecyclePhase": "MATURE",
  "phaseStartDate": "2020-03-01T00:00:00Z",
  "successorProduct": "ENGINE-VALVE-003",
  "transitionPlan": "OVERLAPPING_PRODUCTION",
  "customerMigrationPlan": "24-month transition period",
  "inventoryRunOut": "2025-12-31T00:00:00Z",
  "productionCeaseDate": "2025-06-30T00:00:00Z",
  "reasonForTransition": "Next-generation material technology",
  "riskAssessment": "LOW_RISK_TRANSITION"
}
```

**Common Queries:**
- Track products approaching end-of-life for customer notification
- Generate lifecycle reports for strategic planning
- Monitor transition timelines for successor products

**Related Tables:** Product, CustomerRequirement, ProductionSchedule, EngineeringChangeOrder, InventoryPlan

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** partId
- **Index:** newState
- **Index:** transitionDate

---

### WorkOrder

**Description:** Central production work orders defining specific manufacturing jobs with materials, operations, quantities, and scheduling requirements

**Business Purpose:** Orchestrates all manufacturing activities by defining what to produce, when to produce it, and how to execute production with complete traceability

**Data Governance:**
- **Data Owner:** Production Planning and Manufacturing Operations Teams
- **Update Frequency:** Real-time updates as work orders are created, scheduled, executed, and completed through the manufacturing lifecycle
- **Data Retention:** 7 years for production accountability and financial audit, permanent for critical part traceability
- **Security Classification:** Internal - Production schedules and manufacturing information with competitive and operational sensitivity

**Compliance Notes:** Work orders critical for production accountability, quality traceability, and regulatory compliance in controlled manufacturing environments

**System Integrations:** Production Scheduling, Material Requirements Planning, Quality Management, Labor Tracking, Cost Accounting

**Fields (46):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workOrderNumber | String | ✓ |  | Human-readable identifier for production work orders following company format | Primary reference for all production tracking and customer communication |
| partId | String | ✓ |  |  |  |
| partNumber | String |  |  |  |  |
| quantity | Int | ✓ |  |  |  |
| quantityCompleted | Int | ✓ | auto |  |  |
| quantityScrapped | Int | ✓ | auto |  |  |
| priority | WorkOrderPriority | ✓ |  | Production priority level affecting scheduling and resource allocation | Drives scheduling algorithms and resource allocation decisions |
| status | WorkOrderStatus | ✓ |  |  |  |
| dueDate | DateTime |  |  |  |  |
| customerOrder | String |  |  |  |  |
| routingId | String |  |  |  |  |
| siteId | String |  |  |  |  |
| createdById | String | ✓ |  |  |  |
| assignedToId | String |  |  |  |  |
| startedAt | DateTime |  |  |  |  |
| actualStartDate | DateTime |  |  | Date when production work actually began on the shop floor | Actual vs. planned start variance affects delivery predictions |
| completedAt | DateTime |  |  |  |  |
| actualEndDate | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| dispatchLogs | DispatchLog[] | ✓ |  |  |  |
| equipmentCommands | EquipmentCommand[] | ✓ |  |  |  |
| equipmentDataCollections | EquipmentDataCollection[] | ✓ |  |  |  |
| equipmentMaterialMovements | EquipmentMaterialMovement[] | ✓ |  |  |  |
| erpMaterialTransactions | ERPMaterialTransaction[] | ✓ |  |  |  |
| laborTimeEntries | LaborTimeEntry[] | ✓ |  |  |  |
| machineTimeEntries | MachineTimeEntry[] | ✓ |  |  |  |
| materialTransactions | MaterialTransaction[] | ✓ |  |  |  |
| ncrs | NCR[] | ✓ |  |  |  |
| processDataCollections | ProcessDataCollection[] | ✓ |  |  |  |
| productionPerformanceActuals | ProductionPerformanceActual[] | ✓ |  |  |  |
| productionScheduleRequests | ProductionScheduleRequest[] | ✓ |  |  |  |
| variances | ProductionVariance[] | ✓ |  |  |  |
| qifMeasurementPlans | QIFMeasurementPlan[] | ✓ |  |  |  |
| qifMeasurementResults | QIFMeasurementResult[] | ✓ |  |  |  |
| qualityInspections | QualityInspection[] | ✓ |  |  |  |
| scheduleEntry | ScheduleEntry |  |  |  |  |
| operations | WorkOrderOperation[] | ✓ |  |  |  |
| statusHistory | WorkOrderStatusHistory[] | ✓ |  |  |  |
| assignedTo | User |  |  |  |  |
| createdBy | User | ✓ |  |  |  |
| part | Part | ✓ |  |  |  |
| routing | Routing |  |  |  |  |
| site | Site |  |  |  |  |
| workPerformance | WorkPerformance[] | ✓ |  |  |  |

**Field Details:**

#### workOrderNumber

- **Data Source:** Auto-generated by production planning system
- **Format:** WO-YYYY-NNNNNN (e.g., WO-2024-001234)
- **Validation:** Format enforced, uniqueness checked globally
- **Examples:** WO-2024-001234 - Regular production work order, WO-2024-999999 - Emergency or rush order, WO-2024-R00123 - Rework order (R prefix)
- **Integration Mapping:**
  - erpSystem: JobNumber
  - schedulingSystem: WorkOrderID

#### priority

- **Data Source:** Production planner assignment or ERP system import

#### actualStartDate

- **Data Source:** Shop floor data collection or operator entry
- **Format:** ISO 8601 timestamp with timezone
- **Audit Trail:** Critical for production metrics and on-time delivery tracking

**Relationships (19):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | DispatchLog | dispatchLogs | ✓ |  |
| one-to-many | EquipmentCommand | equipmentCommands | ✓ |  |
| one-to-many | EquipmentDataCollection | equipmentDataCollections | ✓ |  |
| one-to-many | EquipmentMaterialMovement | equipmentMaterialMovements | ✓ |  |
| one-to-many | ERPMaterialTransaction | erpMaterialTransactions | ✓ |  |
| one-to-many | LaborTimeEntry | laborTimeEntries | ✓ |  |
| one-to-many | MachineTimeEntry | machineTimeEntries | ✓ |  |
| one-to-many | ProcessDataCollection | processDataCollections | ✓ |  |
| one-to-many | ProductionPerformanceActual | productionPerformanceActuals | ✓ |  |
| one-to-many | ProductionScheduleRequest | productionScheduleRequests | ✓ |  |
| one-to-many | ProductionVariance | variances | ✓ |  |
| one-to-many | QIFMeasurementPlan | qifMeasurementPlans | ✓ |  |
| one-to-many | QIFMeasurementResult | qifMeasurementResults | ✓ |  |
| one-to-one | ScheduleEntry | scheduleEntry |  |  |
| one-to-many | WorkOrderStatusHistory | statusHistory | ✓ |  |
| one-to-one | User | assignedTo |  |  |
| one-to-one | User | createdBy | ✓ |  |
| one-to-one | Part | part | ✓ |  |
| one-to-one | Site | site |  |  |

**Usage Examples:**

#### Aerospace turbine blade work order

High-priority aerospace work order for Boeing customer with defined routing and tight delivery schedule

```json
{
  "workOrderNumber": "WO-2024-001234",
  "partId": "TB-A380-001",
  "partNumber": "TB-A380-001",
  "quantity": 24,
  "priority": "HIGH",
  "status": "IN_PROGRESS",
  "dueDate": "2024-12-15T00:00:00Z",
  "customerOrder": "BOEING-PO-789123",
  "routingId": "RTG-TB-A380-001"
}
```

#### Standard bolt production work order

Standard production work order for stainless steel bolts at Dallas facility

```json
{
  "workOrderNumber": "WO-2024-005678",
  "partId": "BOLT-M12-SS-001",
  "quantity": 1000,
  "priority": "NORMAL",
  "status": "PLANNED",
  "dueDate": "2024-11-30T00:00:00Z",
  "quantityCompleted": 0,
  "siteId": "DFW-02"
}
```

**Common Queries:**
- Find work orders by status for production scheduling
- Track work order progress and completion rates
- Generate production reports for customer delivery commitments

**Related Tables:** Part, Routing, WorkOrderOperation, MaterialTransaction, QualityInspection

**Constraints & Indexes:**

- **Primary Key:** id

---

### Routing

**Description:** Manufacturing process routes defining the complete sequence of operations required to produce a specific part or assembly

**Business Purpose:** Orchestrates the manufacturing process by defining operation sequence, work centers, and process flow to transform raw materials into finished products

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Production Planning Teams
- **Update Frequency:** Updated when processes change, equipment modifications occur, or engineering changes affect manufacturing methods
- **Data Retention:** Permanent retention for manufacturing history, cost analysis, and regulatory compliance
- **Security Classification:** Internal - Contains proprietary manufacturing processes and competitive information

**Compliance Notes:** Routing changes must be approved and documented per AS9100 requirements. Customer notification may be required for critical parts

**System Integrations:** Production Scheduling, Work Order Management, Capacity Planning, Cost Estimation, Shop Floor Control

**Fields (30):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| routingNumber | String | ✓ |  |  |  |
| partId | String |  |  |  |  |
| siteId | String |  |  |  |  |
| version | String | ✓ | 1.0 |  |  |
| lifecycleState | RoutingLifecycleState | ✓ | DRAFT |  |  |
| description | String |  |  |  |  |
| isPrimaryRoute | Boolean | ✓ | auto |  |  |
| isActive | Boolean | ✓ | true |  |  |
| effectiveDate | DateTime |  |  |  |  |
| expirationDate | DateTime |  |  |  |  |
| routingType | RoutingType | ✓ | PRIMARY |  |  |
| alternateForId | String |  |  |  |  |
| priority | Int | ✓ | 1 |  |  |
| approvedBy | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| visualData | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdBy | String |  |  |  |  |
| notes | String |  |  |  |  |
| operations | RoutingOperation[] | ✓ |  |  |  |
| steps | RoutingStep[] | ✓ |  |  |  |
| templateSources | RoutingTemplate[] | ✓ |  |  |  |
| alternateFor | Routing |  |  |  |  |
| alternateRoutes | Routing[] | ✓ |  |  |  |
| part | Part |  |  |  |  |
| site | Site |  |  |  |  |
| scheduleEntries | ScheduleEntry[] | ✓ |  |  |  |
| workOrders | WorkOrder[] | ✓ |  |  |  |
**Relationships (6):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | RoutingOperation | operations | ✓ |  |
| one-to-many | RoutingStep | steps | ✓ |  |
| one-to-many | RoutingTemplate | templateSources | ✓ |  |
| one-to-one | Part | part |  |  |
| one-to-one | Site | site |  |  |
| one-to-many | ScheduleEntry | scheduleEntries | ✓ |  |

**Usage Examples:**

#### Aerospace turbine blade routing

Complete manufacturing sequence for critical aerospace component with version control

```json
{
  "routingNumber": "RTG-TB-A380-001",
  "partId": "TB-A380-001",
  "version": "2.1",
  "lifecycleState": "ACTIVE",
  "isPrimaryRoute": true,
  "description": "Primary manufacturing route for A380 turbine blade"
}
```

#### Alternative routing for capacity optimization

Backup routing for production flexibility and capacity management

```json
{
  "routingNumber": "RTG-TB-A380-001-ALT",
  "partId": "TB-A380-001",
  "version": "1.0",
  "routingType": "ALTERNATE",
  "priority": 2,
  "description": "Alternative route using secondary equipment"
}
```

**Common Queries:**
- Find active routings for production scheduling
- Generate routing costs for job estimation
- Track routing performance and cycle time analysis

**Related Tables:** RoutingOperation, RoutingStep, Part, WorkOrder, RoutingTemplate

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** partId, siteId, version
- **Index:** siteId
- **Index:** partId
- **Index:** lifecycleState
- **Index:** isActive
- **Index:** partId, siteId, routingType
- **Index:** alternateForId

---

### RoutingOperation

**Description:** Specific operations assigned to routings with work center assignments and timing details for manufacturing execution

**Business Purpose:** Links individual operations to specific routings, defining where work is performed and providing scheduling granularity for production control

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Production Planning Teams
- **Update Frequency:** Updated when routing changes occur, work center assignments change, or timing standards are revised
- **Data Retention:** Permanent retention for manufacturing history and performance analysis
- **Security Classification:** Internal - Manufacturing process and capacity information

**Compliance Notes:** Operation assignments must maintain traceability for quality system compliance and customer requirements

**System Integrations:** Production Scheduling, Work Center Management, Capacity Planning, Shop Floor Control

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| routingId | String | ✓ |  |  |  |
| operationNumber | Int | ✓ |  |  |  |
| operationName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| setupTime | Float |  |  |  |  |
| cycleTime | Float |  |  |  |  |
| workCenterId | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| routing | Routing | ✓ |  |  |  |
| workCenter | WorkCenter |  |  |  |  |
| workOrderOps | WorkOrderOperation[] | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | WorkCenter | workCenter |  |  |

**Usage Examples:**

#### Machining operation in routing

First operation in turbine blade routing with timing and work center assignment

```json
{
  "operationNumber": 10,
  "operationName": "Rough Mill Blade Profile",
  "setupTime": "0.5 hours",
  "cycleTime": "2.0 hours",
  "workCenterId": "CNC-MILL-001",
  "isActive": true
}
```

#### Inspection operation in routing

Quality control checkpoint in manufacturing sequence with measurement requirements

```json
{
  "operationNumber": 30,
  "operationName": "Dimensional Inspection",
  "setupTime": "0.25 hours",
  "cycleTime": "0.75 hours",
  "workCenterId": "QC-LAB-001",
  "isActive": true
}
```

**Common Queries:**
- Find operations by work center for scheduling
- Generate operation sequences for work orders
- Track operation timing for efficiency analysis

**Related Tables:** Routing, WorkCenter, Operation, WorkOrderOperation

**Constraints & Indexes:**

- **Primary Key:** id

---

### RoutingStep

**Description:** Detailed individual steps within operations providing granular control and specific instructions for manufacturing execution

**Business Purpose:** Breaks down operations into executable steps with detailed parameters, dependencies, and quality requirements for precise shop floor control

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Process Engineering Teams
- **Update Frequency:** Updated when process details change, quality requirements are modified, or continuous improvement changes are implemented
- **Data Retention:** Permanent retention for process validation and regulatory compliance
- **Security Classification:** Internal - Detailed process parameters and proprietary manufacturing methods

**Compliance Notes:** Step documentation must include verification requirements and acceptance criteria for regulatory compliance

**System Integrations:** Work Instructions, Quality Plans, Shop Floor Terminals, Process Control Systems

**Fields (26):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| routingId | String | ✓ |  |  |  |
| stepNumber | Int | ✓ |  |  |  |
| operationId | String | ✓ |  |  |  |
| workCenterId | String |  |  |  |  |
| stepType | StepType | ✓ | PROCESS |  |  |
| controlType | ControlType |  |  |  |  |
| setupTimeOverride | Int |  |  |  |  |
| cycleTimeOverride | Int |  |  |  |  |
| teardownTimeOverride | Int |  |  |  |  |
| isOptional | Boolean | ✓ | auto |  |  |
| isQualityInspection | Boolean | ✓ | auto |  |  |
| isCriticalPath | Boolean | ✓ | auto |  |  |
| workInstructionId | String |  |  |  |  |
| stepInstructions | String |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| dependencies | RoutingStepDependency[] | ✓ |  |  |  |
| prerequisites | RoutingStepDependency[] | ✓ |  |  |  |
| parameterOverrides | RoutingStepParameter[] | ✓ |  |  |  |
| operation | Operation | ✓ |  |  |  |
| routing | Routing | ✓ |  |  |  |
| workCenter | WorkCenter |  |  |  |  |
| workInstruction | WorkInstruction |  |  |  |  |
| workOrderOperations | WorkOrderOperation[] | ✓ |  |  |  |
**Relationships (4):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | RoutingStepDependency | dependencies | ✓ |  |
| one-to-many | RoutingStepDependency | prerequisites | ✓ |  |
| one-to-many | RoutingStepParameter | parameterOverrides | ✓ |  |
| one-to-one | WorkCenter | workCenter |  |  |

**Usage Examples:**

#### Machining setup step

Critical setup step with specific instructions and timing for precision machining

```json
{
  "stepNumber": 1,
  "stepType": "SETUP",
  "operationId": "OP-MILL-001",
  "setupTimeOverride": "30 minutes",
  "stepInstructions": "Mount workpiece in fixture using torque specification",
  "isCriticalPath": true
}
```

#### Quality verification step

Quality control step with specific measurement requirements and work instruction reference

```json
{
  "stepNumber": 5,
  "stepType": "INSPECTION",
  "operationId": "OP-INSP-001",
  "isQualityInspection": true,
  "stepInstructions": "Verify critical dimensions per drawing requirements",
  "workInstructionId": "WI-INSP-DIM-001"
}
```

**Common Queries:**
- Find critical path steps for schedule optimization
- Generate step-by-step work instructions
- Track step execution times and dependencies

**Related Tables:** Routing, Operation, WorkCenter, RoutingStepDependency, WorkInstruction

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** routingId, stepNumber
- **Index:** routingId
- **Index:** operationId
- **Index:** workCenterId

---

### RoutingStepDependency

**Description:** Granular dependencies between individual routing steps enabling precise process control and step-level scheduling coordination

**Business Purpose:** Provides detailed step-level coordination ensuring proper execution sequence, resource allocation, and quality control at the finest granularity

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Process Engineering Teams
- **Update Frequency:** Updated when detailed process steps change, timing requirements are modified, or step-level optimizations are implemented
- **Data Retention:** Permanent retention for detailed process validation and step-level methodology documentation
- **Security Classification:** Internal - Detailed process control with proprietary manufacturing methodology

**Compliance Notes:** Step dependencies essential for detailed process validation, quality control, and regulatory compliance documentation

**System Integrations:** Work Instructions, Shop Floor Control, Process Execution, Quality Management

**Fields (10):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| dependentStepId | String | ✓ |  |  |  |
| prerequisiteStepId | String | ✓ |  |  |  |
| dependencyType | DependencyType | ✓ |  |  |  |
| timingType | DependencyTimingType | ✓ |  |  |  |
| lagTime | Int |  |  |  |  |
| leadTime | Int |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| dependentStep | RoutingStep | ✓ |  |  |  |
| prerequisiteStep | RoutingStep | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | RoutingStep | dependentStep | ✓ |  |
| one-to-one | RoutingStep | prerequisiteStep | ✓ |  |

**Usage Examples:**

#### Setup to execution step dependency

Machining execution step requires setup completion with 5-minute preparation buffer

```json
{
  "dependentStepId": "STEP-MACH-EXEC-001",
  "prerequisiteStepId": "STEP-MACH-SETUP-001",
  "dependencyType": "SETUP_REQUIRED",
  "timingType": "FINISH_TO_START",
  "lagTime": "5 minutes",
  "leadTime": "0"
}
```

#### Measurement verification dependency

Next operation step dependent on dimensional verification completion

```json
{
  "dependentStepId": "STEP-NEXT-OP-001",
  "prerequisiteStepId": "STEP-VERIFY-DIM-001",
  "dependencyType": "VERIFICATION_REQUIRED",
  "timingType": "FINISH_TO_START",
  "lagTime": "0"
}
```

**Common Queries:**
- Find step prerequisites for detailed scheduling
- Generate step dependency charts for operator guidance
- Validate step sequences for process execution

**Related Tables:** RoutingStep, Routing, Operation, WorkInstruction

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** dependentStepId, prerequisiteStepId
- **Index:** dependentStepId
- **Index:** prerequisiteStepId

---

### RoutingStepParameter

**Description:** Specific parameters and settings for individual routing steps enabling precise control of manufacturing operations at the step level

**Business Purpose:** Provides granular control over manufacturing processes by defining step-specific parameters, tolerances, and operational settings for consistent execution

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Process Engineering Teams
- **Update Frequency:** Updated when process parameters change, tolerance requirements are modified, or process optimization occurs
- **Data Retention:** Permanent retention for process validation and regulatory compliance
- **Security Classification:** Internal - Proprietary process parameters and manufacturing methods

**Compliance Notes:** Parameter documentation required for process validation and regulatory compliance - critical for repeatable manufacturing

**System Integrations:** Routing Management, Process Control, Work Instructions, Quality Control, Equipment Control

**Fields (9):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| routingStepId | String | ✓ |  |  |  |
| parameterName | String | ✓ |  |  |  |
| parameterValue | String | ✓ |  |  |  |
| unitOfMeasure | String |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| routingStep | RoutingStep | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | RoutingStep | routingStep | ✓ |  |

**Usage Examples:**

#### Machining speed parameter

Critical spindle speed parameter for precision titanium milling with tight tolerance requirements

```json
{
  "routingStepId": "STEP-MILL-001-003",
  "parameterName": "SPINDLE_SPEED",
  "parameterValue": "1200",
  "parameterUnit": "RPM",
  "tolerancePlus": 50,
  "toleranceMinus": 50,
  "isRequired": true,
  "parameterType": "MACHINING"
}
```

#### Quality inspection parameter

Precision dimensional tolerance parameter for critical aerospace component inspection

```json
{
  "routingStepId": "STEP-INSP-001-005",
  "parameterName": "DIMENSIONAL_TOLERANCE",
  "parameterValue": "0.001",
  "parameterUnit": "INCHES",
  "nominalValue": 2.5,
  "upperLimit": 2.501,
  "lowerLimit": 2.499,
  "parameterType": "QUALITY"
}
```

**Common Queries:**
- Retrieve step parameters for work instruction generation
- Validate parameter compliance for quality assurance
- Track parameter changes for process improvement

**Related Tables:** RoutingStep, Operation, ParameterGroup, WorkInstruction, QualityPlan

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** routingStepId, parameterName
- **Index:** routingStepId

---

### RoutingTemplate

**Description:** Reusable routing templates enabling standardized process creation, best practice sharing, and manufacturing methodology consistency

**Business Purpose:** Accelerates routing development and ensures process consistency by providing proven manufacturing sequences and optimized methodologies

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Process Engineering Teams
- **Update Frequency:** Updated when new templates are created, existing templates are optimized, or best practices are identified
- **Data Retention:** Permanent retention for manufacturing knowledge management and process standardization
- **Security Classification:** Internal - Manufacturing methodologies and process templates with competitive value

**Compliance Notes:** Templates must maintain process validation and quality requirements when instantiated for production use

**System Integrations:** Routing Management, Process Development, Best Practice Libraries, Manufacturing Standards

**Fields (19):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| name | String | ✓ |  |  |  |
| number | String | ✓ | cuid( |  |  |
| category | String |  |  |  |  |
| description | String |  |  |  |  |
| tags | String[] | ✓ |  |  |  |
| isPublic | Boolean | ✓ | auto |  |  |
| isFavorite | Boolean | ✓ | auto |  |  |
| usageCount | Int | ✓ | auto |  |  |
| rating | Float |  |  |  |  |
| visualData | Json |  |  |  |  |
| sourceRoutingId | String |  |  |  |  |
| createdById | String | ✓ |  |  |  |
| siteId | String | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdBy | User | ✓ |  |  |  |
| site | Site | ✓ |  |  |  |
| sourceRouting | Routing |  |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | createdBy | ✓ |  |
| one-to-one | Site | site | ✓ |  |

**Usage Examples:**

#### Aerospace machining template

High-rated aerospace machining template used across multiple precision component routings

```json
{
  "name": "Aerospace Precision Machining",
  "number": "TPL-AERO-MACH-001",
  "category": "MACHINING",
  "description": "Standard routing for aerospace precision components",
  "tags": [
    "AEROSPACE",
    "PRECISION",
    "AS9100"
  ],
  "isPublic": true,
  "usageCount": 45,
  "rating": 4.8
}
```

#### Assembly process template

Favorite template derived from master engine routing with proven assembly methodology

```json
{
  "name": "Engine Assembly Standard",
  "number": "TPL-ASSY-ENG-001",
  "category": "ASSEMBLY",
  "description": "Standard engine assembly sequence with quality gates",
  "tags": [
    "ENGINE",
    "ASSEMBLY",
    "TORQUE_SPEC"
  ],
  "isFavorite": true,
  "sourceRoutingId": "RTG-ENGINE-MASTER-001"
}
```

**Common Queries:**
- Find templates by category for routing development
- Generate new routings from proven templates
- Track template usage and effectiveness metrics

**Related Tables:** Routing, User, Site, Operation

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** siteId
- **Index:** createdById
- **Index:** category
- **Index:** isFavorite

---

### WorkCenter

**Description:** Manufacturing work centers that organize equipment, personnel, and operations within functional areas of the facility

**Business Purpose:** Provides logical grouping of manufacturing resources to enable efficient scheduling, capacity planning, and resource allocation

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Production Planning Teams
- **Update Frequency:** Updated when manufacturing layouts change or new work centers are established
- **Data Retention:** Permanent retention for manufacturing history and capacity analysis
- **Security Classification:** Internal - Manufacturing organization and capacity information

**Compliance Notes:** Work center definitions critical for capacity planning, resource allocation, and regulatory reporting requirements

**System Integrations:** Production Scheduling, Equipment Management, Personnel Management, Capacity Planning, Shop Floor Control

**Fields (16):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| name | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| capacity | Float |  |  |  |  |
| areaId | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| dispatchLogs | DispatchLog[] | ✓ |  |  |  |
| equipment | Equipment[] | ✓ |  |  |  |
| personnelAssignments | PersonnelWorkCenterAssignment[] | ✓ |  |  |  |
| operations | RoutingOperation[] | ✓ |  |  |  |
| routingSteps | RoutingStep[] | ✓ |  |  |  |
| scheduleEntries | ScheduleEntry[] | ✓ |  |  |  |
| area | Area |  |  |  |  |
| workUnits | WorkUnit[] | ✓ |  |  |  |
**Relationships (7):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | DispatchLog | dispatchLogs | ✓ |  |
| one-to-many | PersonnelWorkCenterAssignment | personnelAssignments | ✓ |  |
| one-to-many | RoutingOperation | operations | ✓ |  |
| one-to-many | RoutingStep | routingSteps | ✓ |  |
| one-to-many | ScheduleEntry | scheduleEntries | ✓ |  |
| one-to-one | Area | area |  |  |
| one-to-many | WorkUnit | workUnits | ✓ |  |

**Usage Examples:**

#### CNC machining work center

Dedicated work center for precision machining operations with defined capacity

```json
{
  "name": "CNC Machining Center A",
  "description": "High-precision machining center for aerospace components",
  "capacity": "24 hours/day",
  "areaId": "ATL-MACH-01",
  "isActive": true
}
```

#### Assembly work center

Assembly work center with sequential workstations and defined throughput capacity

```json
{
  "name": "Final Assembly Line 1",
  "description": "Main assembly line for turbine components",
  "capacity": "16 hours/day",
  "areaId": "ATL-ASSY-01",
  "isActive": true
}
```

**Common Queries:**
- Find available work centers by capability for routing
- Generate work center utilization reports
- Track personnel assignments by work center

**Related Tables:** Area, Equipment, PersonnelWorkCenterAssignment, ScheduleEntry, RoutingOperation

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** areaId

---

### WorkUnit

**Description:** Work center subdivisions representing distinct operational areas within work centers for granular production control and resource allocation

**Business Purpose:** Provides fine-grained control over production resources by organizing equipment and personnel into logical operational units within work centers

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Production Planning Teams
- **Update Frequency:** Updated when work center layouts change, equipment is relocated, or operational reorganization occurs
- **Data Retention:** 5 years for capacity analysis and operational optimization
- **Security Classification:** Internal - Work center organization and capacity information

**Compliance Notes:** Work unit organization supports capacity planning and resource allocation required for production efficiency analysis

**System Integrations:** Work Center Management, Equipment Management, Production Scheduling, Capacity Planning, Resource Allocation

**Fields (10):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workUnitCode | String | ✓ |  |  |  |
| workUnitName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| workCenterId | String | ✓ |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| equipment | Equipment[] | ✓ |  |  |  |
| workCenter | WorkCenter | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | WorkCenter | workCenter | ✓ |  |

**Usage Examples:**

#### CNC machining work unit

Dedicated work unit for precision aerospace machining with specialized equipment and certified operators

```json
{
  "workUnitCode": "WU-CNC-001",
  "workCenterId": "CNC-MACHINING-001",
  "workUnitName": "Precision Milling Area",
  "description": "High-precision CNC milling equipment cluster for aerospace components",
  "capacity": 24,
  "capacityUnit": "HOURS_PER_DAY",
  "equipmentCount": 4,
  "operatorCount": 2,
  "shiftPattern": "TWO_SHIFT",
  "specialCapabilities": [
    "5_AXIS_MACHINING",
    "TITANIUM_CERTIFIED"
  ],
  "isActive": true
}
```

#### Assembly work unit

Controlled environment assembly work unit with specific tooling and quality requirements

```json
{
  "workUnitCode": "WU-ASSY-002",
  "workCenterId": "ASSEMBLY-001",
  "workUnitName": "Engine Subassembly Station",
  "description": "Specialized assembly area for engine component integration",
  "capacity": 16,
  "capacityUnit": "HOURS_PER_DAY",
  "toolingRequired": "Engine assembly fixtures and torque tools",
  "cleanRoomClass": "ISO_7",
  "qualityRequirements": "100% dimensional inspection"
}
```

**Common Queries:**
- Find available work units for production scheduling
- Track work unit utilization for capacity planning
- Generate work unit performance reports

**Related Tables:** WorkCenter, Equipment, PersonnelWorkCenterAssignment, ScheduleEntry, DispatchLog

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workCenterId

---

### WorkOrderOperation

**Description:** Individual manufacturing operations within a work order, defining the specific steps, resources, and sequence required to transform materials

**Business Purpose:** Breaks down work orders into executable shop floor operations, enabling detailed scheduling, resource allocation, and progress tracking at the operation level

**Data Governance:**
- **Data Owner:** Production Engineering Team
- **Update Frequency:** Real-time updates as operations are started, paused, and completed on the shop floor
- **Data Retention:** Permanent retention for traceability and process improvement analysis
- **Security Classification:** Internal - Contains detailed manufacturing process information

**Compliance Notes:** Operation records critical for AS9100 traceability requirements and FDA process validation in medical device manufacturing

**System Integrations:** Shop Floor Control Systems, Equipment Controllers, Time & Attendance, Quality Management, Production Scheduling

**Fields (19):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workOrderId | String | ✓ |  |  |  |
| routingOperationId | String | ✓ |  |  |  |
| status | WorkOrderOperationStatus | ✓ |  |  |  |
| quantity | Int | ✓ |  |  |  |
| quantityCompleted | Int | ✓ | auto |  |  |
| quantityScrap | Int | ✓ | auto |  |  |
| startedAt | DateTime |  |  |  |  |
| completedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| routingStepId | String |  |  |  |  |
| laborTimeEntries | LaborTimeEntry[] | ✓ |  |  |  |
| machineTimeEntries | MachineTimeEntry[] | ✓ |  |  |  |
| variances | ProductionVariance[] | ✓ |  |  |  |
| routingOperation | RoutingOperation | ✓ |  |  |  |
| RoutingStep | RoutingStep |  |  |  |  |
| workOrder | WorkOrder | ✓ |  |  |  |
| workPerformance | WorkPerformance[] | ✓ |  |  |  |
**Relationships (5):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | LaborTimeEntry | laborTimeEntries | ✓ |  |
| one-to-many | MachineTimeEntry | machineTimeEntries | ✓ |  |
| one-to-many | ProductionVariance | variances | ✓ |  |
| one-to-one | RoutingOperation | routingOperation | ✓ |  |
| one-to-one | RoutingStep | RoutingStep |  |  |

**Usage Examples:**

#### CNC machining operation for turbine blade

Primary machining operation requiring specific equipment and skilled operator

```json
{
  "operationNumber": "010",
  "operationName": "Rough Machining - Blade Profile",
  "equipmentRequired": "CNC-001",
  "estimatedDuration": "2.5 hours",
  "status": "IN_PROGRESS",
  "setupTime": "30 minutes"
}
```

#### Quality inspection checkpoint

Critical measurement operation ensuring dimensional compliance

```json
{
  "operationNumber": "020",
  "operationName": "Dimensional Inspection",
  "equipmentRequired": "CMM-001",
  "estimatedDuration": "45 minutes",
  "status": "PENDING",
  "qualityPlanRequired": true
}
```

**Common Queries:**
- Find operations ready to start for available equipment
- Track operation completion times for labor efficiency analysis
- Generate operation status reports for production meetings

**Related Tables:** WorkOrder, Operation, Equipment, ProductionSchedule, QualityInspection

**Constraints & Indexes:**

- **Primary Key:** id

---

### ProductionSchedule

**Description:** Master production schedules coordinating work orders, resources, and timeline across the manufacturing facility

**Business Purpose:** Optimizes production flow by sequencing work orders, allocating equipment and personnel, and managing capacity constraints to meet delivery commitments

**Data Governance:**
- **Data Owner:** Production Planning Team
- **Update Frequency:** Daily schedule generation with real-time adjustments for disruptions and priority changes
- **Data Retention:** 5 years for production planning optimization and performance analysis
- **Security Classification:** Internal - Contains production capacity and customer delivery information

**Compliance Notes:** Schedule changes affecting customer deliveries must be documented for contract compliance and quality system requirements

**System Integrations:** ERP Planning System, Shop Floor Control, Customer Order Management, Capacity Planning, Material Requirements Planning

**Fields (28):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| scheduleNumber | String | ✓ |  |  |  |
| scheduleName | String | ✓ |  | Human-readable identifier for the production schedule | Provides clear identification for schedule communication and management |
| description | String |  |  |  |  |
| periodStart | DateTime | ✓ |  |  |  |
| periodEnd | DateTime | ✓ |  |  |  |
| periodType | String | ✓ | MONTHLY |  |  |
| siteId | String |  |  |  |  |
| areaId | String |  |  |  |  |
| state | ScheduleState | ✓ | FORECAST |  |  |
| stateChangedAt | DateTime | ✓ | now( |  |  |
| stateChangedBy | String |  |  |  |  |
| priority | SchedulePriority | ✓ | NORMAL |  |  |
| plannedBy | String |  |  |  |  |
| approvedBy | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| dispatchedCount | Int | ✓ | auto |  |  |
| totalEntries | Int | ✓ | auto |  |  |
| isLocked | Boolean | ✓ | auto |  |  |
| isFeasible | Boolean | ✓ | true |  |  |
| feasibilityNotes | String |  |  |  |  |
| notes | String |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| site | Site |  |  |  |  |
| entries | ScheduleEntry[] | ✓ |  |  |  |
| stateHistory | ScheduleStateHistory[] | ✓ |  |  |  |

**Field Details:**

#### scheduleName

- **Data Source:** Production planning system or manual assignment
- **Format:** Descriptive format including location and time period
- **Examples:** Cell A - Week 43 2024, CNC Department - Daily Schedule 2024-10-21, Assembly Line 1 - Shift 1 Schedule

**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Site | site |  |  |
| one-to-many | ScheduleEntry | entries | ✓ |  |
| one-to-many | ScheduleStateHistory | stateHistory | ✓ |  |

**Usage Examples:**

#### Weekly production schedule for Cell A

Coordinated schedule balancing multiple work orders across available equipment

```json
{
  "scheduleName": "Cell A - Week 43 2024",
  "startDate": "2024-10-21",
  "endDate": "2024-10-25",
  "totalWorkOrders": 15,
  "utilizationTarget": "85%",
  "status": "PUBLISHED"
}
```

**Common Queries:**
- Find schedules with capacity availability for rush orders
- Generate resource utilization reports by time period
- Track schedule adherence and variance analysis

**Related Tables:** ScheduleEntry, WorkOrder, Equipment, PersonnelWorkCenterAssignment, Site

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** siteId
- **Index:** state
- **Index:** periodStart
- **Index:** periodEnd

---

### ScheduleEntry

**Description:** Individual scheduled activities linking specific work order operations to equipment, personnel, and time slots

**Business Purpose:** Provides detailed scheduling granularity for shop floor execution, ensuring the right work is assigned to the right resources at the right time

**Data Governance:**
- **Data Owner:** Production Planning Team
- **Update Frequency:** Real-time updates as work progresses and schedules are adjusted for operational realities
- **Data Retention:** 3 years for operational analysis and continuous improvement
- **Security Classification:** Internal - Contains detailed resource allocation and timing information

**Compliance Notes:** Schedule entries provide audit trail for production decisions and resource allocation compliance

**System Integrations:** Shop Floor Terminals, Equipment Controllers, Time Tracking Systems, Labor Management, Real-time Production Monitoring

**Fields (39):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| scheduleId | String | ✓ |  |  |  |
| entryNumber | Int | ✓ |  |  |  |
| partId | String | ✓ |  |  |  |
| partNumber | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| plannedQuantity | Float | ✓ |  |  |  |
| dispatchedQuantity | Float | ✓ | auto |  |  |
| completedQuantity | Float | ✓ | auto |  |  |
| unitOfMeasure | String | ✓ | EA |  |  |
| plannedStartDate | DateTime | ✓ |  |  |  |
| plannedEndDate | DateTime | ✓ |  |  |  |
| actualStartDate | DateTime |  |  |  |  |
| actualEndDate | DateTime |  |  |  |  |
| priority | SchedulePriority | ✓ | NORMAL |  |  |
| sequenceNumber | Int |  |  |  |  |
| estimatedDuration | Int |  |  |  |  |
| workCenterId | String |  |  |  |  |
| routingId | String |  |  |  |  |
| customerOrder | String |  |  |  |  |
| customerDueDate | DateTime |  |  |  |  |
| salesOrder | String |  |  |  |  |
| isDispatched | Boolean | ✓ | auto |  |  |
| dispatchedAt | DateTime |  |  |  |  |
| dispatchedBy | String |  |  |  |  |
| workOrderId | String |  |  |  |  |
| isCancelled | Boolean | ✓ | auto |  |  |
| cancelledAt | DateTime |  |  |  |  |
| cancelledReason | String |  |  |  |  |
| notes | String |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| constraints | ScheduleConstraint[] | ✓ |  |  |  |
| part | Part | ✓ |  |  |  |
| routing | Routing |  |  |  |  |
| schedule | ProductionSchedule | ✓ |  |  |  |
| workCenter | WorkCenter |  |  |  |  |
| workOrder | WorkOrder |  |  |  |  |
**Relationships (4):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | ScheduleConstraint | constraints | ✓ |  |
| one-to-one | Part | part | ✓ |  |
| one-to-one | ProductionSchedule | schedule | ✓ |  |
| one-to-one | WorkCenter | workCenter |  |  |

**Usage Examples:**

#### CNC operation scheduled for morning shift

Specific time slot assignment for machining operation with designated resources

```json
{
  "startTime": "2024-10-21T06:00:00Z",
  "endTime": "2024-10-21T08:30:00Z",
  "equipmentId": "CNC-001",
  "operatorId": "EMP-001234",
  "workOrderOperationId": "WOO-456789",
  "status": "SCHEDULED"
}
```

#### Setup and changeover activity

Equipment preparation time allocated before production operation

```json
{
  "startTime": "2024-10-21T05:30:00Z",
  "endTime": "2024-10-21T06:00:00Z",
  "equipmentId": "CNC-001",
  "activityType": "SETUP",
  "setupTime": "30 minutes",
  "status": "COMPLETED"
}
```

**Common Queries:**
- Find available schedule slots for urgent work orders
- Track actual vs. planned execution times for schedule optimization
- Generate daily work assignments for shop floor personnel

**Related Tables:** ProductionSchedule, WorkOrderOperation, Equipment, User, ScheduleConstraint

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** scheduleId, entryNumber
- **Index:** scheduleId
- **Index:** partId
- **Index:** plannedStartDate
- **Index:** plannedEndDate
- **Index:** priority
- **Index:** isDispatched
- **Index:** workOrderId

---

### ScheduleConstraint

**Description:** Production schedule constraints defining capacity limitations, resource availability, and operational dependencies that must be respected during scheduling

**Business Purpose:** Ensures feasible production schedules by capturing and enforcing real-world constraints on production capacity, resource availability, and operational dependencies

**Data Governance:**
- **Data Owner:** Production Planning and Industrial Engineering Teams
- **Update Frequency:** Updated when constraints change due to equipment status, personnel availability, or operational requirements
- **Data Retention:** 3 years for capacity planning analysis and constraint optimization
- **Security Classification:** Internal - Production capacity and operational constraint information

**Compliance Notes:** Constraint documentation critical for schedule feasibility validation and production capacity audits

**System Integrations:** Production Scheduling, Capacity Planning, Resource Management, Equipment Management, Personnel Management

**Fields (24):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| entryId | String | ✓ |  |  |  |
| constraintType | ConstraintType | ✓ |  |  |  |
| constraintName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| resourceId | String |  |  |  |  |
| resourceType | String |  |  |  |  |
| requiredQuantity | Float |  |  |  |  |
| availableQuantity | Float |  |  |  |  |
| unitOfMeasure | String |  |  |  |  |
| constraintDate | DateTime |  |  |  |  |
| leadTimeDays | Int |  |  |  |  |
| isViolated | Boolean | ✓ | auto |  |  |
| violationSeverity | String |  |  |  |  |
| violationMessage | String |  |  |  |  |
| isResolved | Boolean | ✓ | auto |  |  |
| resolvedAt | DateTime |  |  |  |  |
| resolvedBy | String |  |  |  |  |
| resolutionNotes | String |  |  |  |  |
| notes | String |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| entry | ScheduleEntry | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | ScheduleEntry | entry | ✓ |  |

**Usage Examples:**

#### Equipment capacity constraint

Daily capacity constraint for precision machining center limiting available production hours

```json
{
  "constraintType": "CAPACITY",
  "resourceId": "CNC-MILL-001",
  "constraintName": "Machining Center Daily Capacity",
  "maxCapacity": 16,
  "capacityUnit": "HOURS",
  "effectiveStartDate": "2024-03-25T00:00:00Z",
  "isActive": true,
  "priority": "HIGH"
}
```

#### Material availability constraint

Material constraint defining supplier lead times and minimum order quantities affecting schedule feasibility

```json
{
  "constraintType": "MATERIAL_AVAILABILITY",
  "materialId": "TI-6AL-4V-BAR",
  "constraintName": "Titanium Alloy Lead Time",
  "leadTimeHours": 168,
  "minimumOrderQuantity": 500,
  "supplierConstraints": "3-week supplier lead time with minimum order requirements"
}
```

**Common Queries:**
- Validate schedule feasibility against capacity constraints
- Generate constraint violation reports for schedule optimization
- Track constraint utilization for capacity planning

**Related Tables:** ProductionSchedule, ScheduleEntry, Equipment, MaterialDefinition, WorkCenter

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** entryId
- **Index:** constraintType
- **Index:** isViolated
- **Index:** constraintDate

---

### ScheduleStateHistory

**Description:** Audit trail tracking production schedule state transitions and lifecycle changes with timestamp and user accountability

**Business Purpose:** Provides complete traceability of schedule changes for regulatory compliance, performance analysis, and operational decision auditing

**Data Governance:**
- **Data Owner:** Production Planning and Quality Assurance Teams
- **Update Frequency:** Real-time updates as schedules transition through states (FORECAST → RELEASED → DISPATCHED → RUNNING → COMPLETED → CLOSED)
- **Data Retention:** 7 years for regulatory compliance and audit requirements
- **Security Classification:** Internal - Schedule change history with user accountability

**Compliance Notes:** Schedule state history required for regulatory compliance and audit trails - must maintain complete lifecycle documentation

**System Integrations:** Production Scheduling, Audit Systems, Compliance Reporting, Performance Analytics, Change Management

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| scheduleId | String | ✓ |  |  |  |
| previousState | ScheduleState |  |  |  |  |
| newState | ScheduleState | ✓ |  |  |  |
| transitionDate | DateTime | ✓ | now( |  |  |
| reason | String |  |  |  |  |
| changedBy | String |  |  |  |  |
| entriesAffected | Int |  |  |  |  |
| notificationsSent | Boolean | ✓ | auto |  |  |
| notes | String |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| schedule | ProductionSchedule | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | ProductionSchedule | schedule | ✓ |  |

**Usage Examples:**

#### Schedule release transition

Manual schedule release transition from forecast to active production state with planner authorization

```json
{
  "scheduleId": "SCHED-240325-001",
  "fromState": "FORECAST",
  "toState": "RELEASED",
  "transitionTimestamp": "2024-03-25T07:00:00Z",
  "triggeredBy": "planner_johnson",
  "reason": "Resource availability confirmed, releasing to production",
  "transitionType": "MANUAL",
  "isValid": true
}
```

#### Emergency schedule hold

Emergency hold transition due to equipment failure requiring immediate schedule suspension

```json
{
  "scheduleId": "SCHED-240325-010",
  "fromState": "RUNNING",
  "toState": "HOLD",
  "transitionTimestamp": "2024-03-25T14:30:00Z",
  "triggeredBy": "supervisor_martinez",
  "reason": "Equipment failure - CNC-MILL-001 requires emergency maintenance",
  "transitionType": "EMERGENCY"
}
```

**Common Queries:**
- Generate audit reports for schedule change history
- Track schedule performance and state transition times
- Identify frequent schedule disruptions for improvement opportunities

**Related Tables:** ProductionSchedule, ScheduleEntry, User, ScheduleConstraint, WorkOrder

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** scheduleId
- **Index:** newState
- **Index:** transitionDate

---

### WorkOrderStatusHistory

**Description:** Complete audit trail of work order status transitions tracking lifecycle progression, decision points, and operational milestones

**Business Purpose:** Provides comprehensive work order lifecycle tracking for performance analysis, accountability, and continuous improvement initiatives

**Data Governance:**
- **Data Owner:** Production Control and Manufacturing Operations Teams
- **Update Frequency:** Real-time logging as work orders transition through manufacturing lifecycle stages
- **Data Retention:** 7 years for production accountability, permanent for critical work order analysis
- **Security Classification:** Internal - Production progress and operational performance information

**Compliance Notes:** Status history required for production accountability, delivery tracking, and regulatory compliance audit trails

**System Integrations:** Work Order Management, Production Reporting, Performance Analytics, Customer Communication

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workOrderId | String | ✓ |  |  |  |
| previousStatus | WorkOrderStatus |  |  |  |  |
| newStatus | WorkOrderStatus | ✓ |  |  |  |
| transitionDate | DateTime | ✓ | now( |  |  |
| reason | String |  |  |  |  |
| changedBy | String |  |  |  |  |
| notes | String |  |  |  |  |
| quantityAtTransition | Int |  |  |  |  |
| scrapAtTransition | Int |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| workOrder | WorkOrder | ✓ |  |  |  |

**Usage Examples:**

#### Work order release to production

Work order released to production with material confirmation and quantity tracking

```json
{
  "workOrderId": "WO-2024-001234",
  "previousStatus": "PLANNED",
  "newStatus": "RELEASED",
  "transitionDate": "2024-10-30T08:00:00Z",
  "reason": "Material available and capacity confirmed",
  "changedBy": "PROD-PLANNER-001",
  "quantityAtTransition": 100
}
```

#### Quality hold status transition

Work order placed on quality hold requiring engineering investigation

```json
{
  "workOrderId": "WO-2024-001235",
  "previousStatus": "IN_PROGRESS",
  "newStatus": "QUALITY_HOLD",
  "transitionDate": "2024-10-30T14:30:00Z",
  "reason": "Dimensional variance detected in first article inspection",
  "changedBy": "QA-INSP-001",
  "notes": "Engineering review required before continuation"
}
```

**Common Queries:**
- Track work order lifecycle performance and timing
- Generate production progress reports for management
- Analyze status transition patterns for process improvement

**Related Tables:** WorkOrder, User, QualityInspection, ProductionSchedule

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workOrderId
- **Index:** newStatus
- **Index:** transitionDate

---

### DispatchLog

**Description:** Work order dispatching and resource assignment tracking for production execution with operator and equipment allocation

**Business Purpose:** Manages the critical transition from planned work orders to active production by tracking assignment decisions, resource allocation, and execution timing

**Data Governance:**
- **Data Owner:** Production Planning and Scheduling Teams
- **Update Frequency:** Real-time updates when work orders are dispatched to production resources and operators
- **Data Retention:** 3 years for production analysis and resource optimization
- **Security Classification:** Internal - Production scheduling and resource allocation data

**Compliance Notes:** Dispatch records provide audit trail for work order execution and resource accountability - critical for traceability compliance

**System Integrations:** Production Scheduling, Work Order Management, Resource Planning, Shop Floor Control, Labor Tracking

**Fields (19):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workOrderId | String | ✓ |  |  |  |
| dispatchedAt | DateTime | ✓ | now( |  |  |
| dispatchedBy | String |  |  |  |  |
| dispatchedFrom | String |  |  |  |  |
| assignedToId | String |  |  |  |  |
| workCenterId | String |  |  |  |  |
| priorityOverride | WorkOrderPriority |  |  |  |  |
| expectedStartDate | DateTime |  |  |  |  |
| expectedEndDate | DateTime |  |  |  |  |
| quantityDispatched | Int | ✓ |  |  |  |
| materialReserved | Boolean | ✓ | auto |  |  |
| toolingReserved | Boolean | ✓ | auto |  |  |
| dispatchNotes | String |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| assignedTo | User |  |  |  |  |
| workCenter | WorkCenter |  |  |  |  |
| workOrder | WorkOrder | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | assignedTo |  |  |
| one-to-one | WorkCenter | workCenter |  |  |

**Usage Examples:**

#### Machining work order dispatch

High-priority turbine component work order dispatched to certified machinist with all resources reserved

```json
{
  "workOrderId": "WO-240325-001",
  "dispatchedAt": "2024-03-25T08:00:00Z",
  "dispatchedBy": "scheduler_jones",
  "assignedToId": "operator_smith",
  "workCenterId": "CNC-MILL-001",
  "materialReserved": true,
  "toolingReserved": true,
  "estimatedStartTime": "2024-03-25T09:00:00Z"
}
```

#### Assembly operation dispatch

Assembly work order dispatched with dependency on incoming material delivery

```json
{
  "workOrderId": "WO-240325-015",
  "dispatchedAt": "2024-03-25T14:00:00Z",
  "assignedToId": "team_lead_brown",
  "workCenterId": "ASSEMBLY-001",
  "priority": "NORMAL",
  "materialReserved": false,
  "notes": "Material delivery expected at 15:00"
}
```

**Common Queries:**
- Track work order dispatch timing for scheduling analysis
- Generate operator work assignments for shift planning
- Monitor resource allocation effectiveness

**Related Tables:** WorkOrder, User, WorkCenter, ProductionSchedule, WorkOrderOperation

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workOrderId
- **Index:** dispatchedAt
- **Index:** assignedToId
- **Index:** workCenterId

---

### WorkPerformance

**Description:** Actual production performance data capturing labor, material, and equipment metrics against planned targets for continuous improvement

**Business Purpose:** Provides real-time and historical performance tracking to enable production optimization, cost control, and continuous improvement initiatives

**Data Governance:**
- **Data Owner:** Production Control and Industrial Engineering Teams
- **Update Frequency:** Real-time data collection as work is performed and completed on the shop floor
- **Data Retention:** 7 years for financial audit, permanent for performance benchmarking and improvement analysis
- **Security Classification:** Internal - Production performance and cost data

**Compliance Notes:** Performance data required for cost accounting, efficiency analysis, and regulatory reporting requirements

**System Integrations:** Shop Floor Data Collection, ERP Costing, Performance Analytics, Continuous Improvement Systems

**Fields (37):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workOrderId | String | ✓ |  |  |  |
| operationId | String |  |  |  |  |
| performanceType | WorkPerformanceType | ✓ |  |  |  |
| recordedAt | DateTime | ✓ | now( |  |  |
| recordedBy | String |  |  |  |  |
| personnelId | String |  |  |  |  |
| laborHours | Float |  |  |  |  |
| laborCost | Float |  |  |  |  |
| laborEfficiency | Float |  |  |  |  |
| partId | String |  |  |  |  |
| quantityConsumed | Float |  |  |  |  |
| quantityPlanned | Float |  |  |  |  |
| materialVariance | Float |  |  |  |  |
| unitCost | Float |  |  |  |  |
| totalCost | Float |  |  |  |  |
| equipmentId | String |  |  |  |  |
| setupTime | Float |  |  |  |  |
| runTime | Float |  |  |  |  |
| plannedSetupTime | Float |  |  |  |  |
| plannedRunTime | Float |  |  |  |  |
| quantityProduced | Int |  |  |  |  |
| quantityGood | Int |  |  |  |  |
| quantityScrap | Int |  |  |  |  |
| quantityRework | Int |  |  |  |  |
| yieldPercentage | Float |  |  |  |  |
| scrapReason | String |  |  |  |  |
| downtimeMinutes | Float |  |  |  |  |
| downtimeReason | String |  |  |  |  |
| downtimeCategory | String |  |  |  |  |
| notes | String |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| operation | WorkOrderOperation |  |  |  |  |
| personnel | User |  |  |  |  |
| workOrder | WorkOrder | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | personnel |  |  |

**Usage Examples:**

#### Labor performance tracking

Labor performance data showing efficiency and cost tracking for work order completion

```json
{
  "performanceType": "LABOR",
  "workOrderId": "WO-2024-001234",
  "laborHours": "8.5 hours",
  "laborEfficiency": "95%",
  "laborCost": "$425.00",
  "personnelId": "EMP-001234"
}
```

#### Material consumption tracking

Material usage tracking showing consumption versus planned quantities for cost control

```json
{
  "performanceType": "MATERIAL",
  "workOrderId": "WO-2024-001234",
  "quantityConsumed": "25.5 lbs",
  "quantityPlanned": "25.0 lbs",
  "materialVariance": "2%",
  "unitCost": "$15.50/lb"
}
```

#### Equipment performance tracking

Equipment performance showing actual versus planned times for efficiency analysis

```json
{
  "performanceType": "EQUIPMENT",
  "equipmentId": "CNC-001",
  "setupTime": "0.5 hours",
  "runTime": "2.25 hours",
  "plannedRunTime": "2.0 hours",
  "quantityProduced": 10
}
```

**Common Queries:**
- Track labor efficiency by operator and operation
- Analyze material consumption variances for cost control
- Generate equipment utilization reports for capacity planning

**Related Tables:** WorkOrder, Operation, User, Equipment, Part

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workOrderId
- **Index:** operationId
- **Index:** performanceType
- **Index:** recordedAt
- **Index:** personnelId

---

### ProductionVariance

**Description:** Cost and performance variance tracking comparing actual production results against planned targets for continuous improvement

**Business Purpose:** Enables cost control, performance management, and operational excellence by identifying and analyzing deviations from production plans

**Data Governance:**
- **Data Owner:** Production Control and Cost Accounting Teams
- **Update Frequency:** Real-time capture as operations complete, with periodic variance analysis and reporting
- **Data Retention:** 7 years for financial audit and historical analysis
- **Security Classification:** Confidential - Cost and profitability information with competitive sensitivity

**Compliance Notes:** Variance tracking required for accurate product costing and financial reporting - critical for profitability analysis

**System Integrations:** Work Order Management, Cost Accounting, ERP Systems, Performance Analytics, Continuous Improvement

**Fields (26):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workOrderId | String | ✓ |  |  |  |
| operationId | String |  |  |  |  |
| varianceType | VarianceType | ✓ |  |  |  |
| varianceName | String | ✓ |  |  |  |
| plannedValue | Float | ✓ |  |  |  |
| actualValue | Float | ✓ |  |  |  |
| variance | Float | ✓ |  |  |  |
| variancePercent | Float | ✓ |  |  |  |
| isFavorable | Boolean | ✓ | auto |  |  |
| costImpact | Float |  |  |  |  |
| rootCause | String |  |  |  |  |
| correctiveAction | String |  |  |  |  |
| responsibleParty | String |  |  |  |  |
| calculatedAt | DateTime | ✓ | now( |  |  |
| periodStart | DateTime |  |  |  |  |
| periodEnd | DateTime |  |  |  |  |
| isResolved | Boolean | ✓ | auto |  |  |
| resolvedAt | DateTime |  |  |  |  |
| resolvedBy | String |  |  |  |  |
| notes | String |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| operation | WorkOrderOperation |  |  |  |  |
| workOrder | WorkOrder | ✓ |  |  |  |

**Usage Examples:**

#### Material cost variance

Unfavorable material cost variance due to supplier constraint requiring premium material

```json
{
  "workOrderId": "WO-240325-001",
  "operationId": "OP-MILL-001",
  "varianceType": "MATERIAL_COST",
  "plannedValue": 1250,
  "actualValue": 1387.5,
  "variance": 137.5,
  "variancePercent": 11,
  "isFavorable": false,
  "costImpact": 137.5,
  "rootCause": "Premium material substitution due to supplier shortage"
}
```

#### Labor efficiency variance

Favorable labor efficiency variance from process improvement reducing assembly time

```json
{
  "workOrderId": "WO-240325-015",
  "operationId": "OP-ASSEMBLY-001",
  "varianceType": "LABOR_EFFICIENCY",
  "plannedValue": 8,
  "actualValue": 7.2,
  "variance": -0.8,
  "variancePercent": -10,
  "isFavorable": true,
  "costImpact": -45,
  "rootCause": "Process improvement implementation - new fixture design"
}
```

**Common Queries:**
- Generate variance reports for cost center analysis
- Identify operations with consistent unfavorable variances
- Track continuous improvement impact on variance trends

**Related Tables:** WorkOrder, WorkOrderOperation, Operation, MaterialTransaction, LaborTimeEntry

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workOrderId
- **Index:** operationId
- **Index:** varianceType
- **Index:** isFavorable
- **Index:** calculatedAt

---

### QualityPlan

**Description:** Quality control plans defining inspection requirements, measurement criteria, and acceptance standards for manufacturing operations

**Business Purpose:** Ensures product quality by specifying what to inspect, how to measure, and what constitutes acceptable results during manufacturing

**Data Governance:**
- **Data Owner:** Quality Assurance Team
- **Update Frequency:** Updated when engineering changes occur or quality issues are identified
- **Data Retention:** Permanent retention for regulatory compliance and continuous improvement
- **Security Classification:** Internal - Contains proprietary quality specifications

**Compliance Notes:** Critical for AS9100 and ISO 9001 compliance - must be approved and controlled

**System Integrations:** Quality Management System, Measurement Equipment, Work Instructions, Engineering Change System

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| planNumber | String | ✓ |  |  |  |
| planName | String | ✓ |  |  |  |
| partId | String | ✓ |  |  |  |
| operation | String |  |  |  |  |
| description | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| characteristics | QualityCharacteristic[] | ✓ |  |  |  |
| inspections | QualityInspection[] | ✓ |  |  |  |
| part | Part | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | QualityCharacteristic | characteristics | ✓ |  |
| one-to-one | Part | part | ✓ |  |

**Usage Examples:**

#### Dimensional inspection plan for precision part

Critical dimension checks required for aerospace component

```json
{
  "planName": "TB-A380-001 Dimensional Check",
  "partNumber": "TB-A380-001",
  "inspectionType": "DIMENSIONAL",
  "frequency": "EVERY_PART",
  "approvalRequired": true
}
```

**Common Queries:**
- Find quality plans requiring measurement equipment calibration
- Generate inspection schedules for upcoming production
- Track quality plan compliance rates by part family

**Related Tables:** QualityMeasurement, InspectionPlan, QualityInspection, Part

**Constraints & Indexes:**

- **Primary Key:** id

---

### QualityCharacteristic

**Description:** Quality characteristics and measurement specifications defining inspection requirements, tolerances, and acceptance criteria for manufacturing quality control

**Business Purpose:** Defines specific quality requirements and measurement standards ensuring products meet design specifications and customer quality expectations

**Data Governance:**
- **Data Owner:** Quality Engineering and Quality Assurance Teams
- **Update Frequency:** Updated when quality requirements change, specifications are revised, or customer requirements are modified
- **Data Retention:** Permanent retention for quality system validation and product compliance documentation
- **Security Classification:** Internal - Quality specifications with customer and competitive sensitivity

**Compliance Notes:** Quality characteristics critical for quality system compliance, customer acceptance, and regulatory requirements (AS9100, ISO 9001, FDA)

**System Integrations:** Quality Management, Inspection Planning, Measurement Systems, Customer Requirements, Supplier Quality

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| planId | String | ✓ |  |  |  |
| characteristic | String | ✓ |  |  |  |
| specification | String | ✓ |  |  |  |
| toleranceType | QualityToleranceType | ✓ |  |  |  |
| nominalValue | Float |  |  |  |  |
| upperLimit | Float |  |  |  |  |
| lowerLimit | Float |  |  |  |  |
| unitOfMeasure | String |  |  |  |  |
| inspectionMethod | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| plan | QualityPlan | ✓ |  |  |  |
| measurements | QualityMeasurement[] | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | QualityPlan | plan | ✓ |  |
| one-to-many | QualityMeasurement | measurements | ✓ |  |

**Usage Examples:**

#### Critical dimensional characteristic

Critical aerospace blade profile dimension with tight bilateral tolerance requiring CMM measurement

```json
{
  "planId": "QP-TB-A380-001",
  "characteristic": "Blade Profile Tolerance",
  "specification": "Profile tolerance per drawing TB-A380-001-R3",
  "toleranceType": "BILATERAL",
  "nominalValue": 25.4,
  "upperLimit": 25.45,
  "lowerLimit": 25.35,
  "unitOfMeasure": "mm",
  "inspectionMethod": "CMM Measurement"
}
```

#### Material property characteristic

Material strength requirement with minimum specification and standardized test method

```json
{
  "planId": "QP-MATERIAL-TI-001",
  "characteristic": "Tensile Strength",
  "specification": "Minimum tensile strength per AMS-4928",
  "toleranceType": "MINIMUM",
  "lowerLimit": 950,
  "unitOfMeasure": "MPa",
  "inspectionMethod": "Tensile Test per ASTM E8"
}
```

**Common Queries:**
- Find quality characteristics for inspection planning
- Generate inspection requirements for work orders
- Track measurement data against specification limits

**Related Tables:** QualityPlan, QualityMeasurement, QualityInspection, SPCConfiguration

**Constraints & Indexes:**

- **Primary Key:** id

---

### QualityInspection

**Description:** Quality inspection records tracking the execution of quality plans with inspector assignments, results, and compliance status

**Business Purpose:** Ensures product quality by documenting inspection execution, recording results, and maintaining traceability for regulatory compliance

**Data Governance:**
- **Data Owner:** Quality Assurance and Quality Control Teams
- **Update Frequency:** Real-time updates as inspections are performed and completed
- **Data Retention:** Permanent retention for regulatory compliance and product traceability
- **Security Classification:** Internal - Quality data with potential customer delivery impact

**Compliance Notes:** Critical for AS9100, ISO 9001, and FDA compliance. Electronic signatures may be required per 21 CFR Part 11

**System Integrations:** Quality Management Systems, Work Order Execution, Measurement Equipment, Non-Conformance Management

**Fields (18):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| inspectionNumber | String | ✓ |  |  |  |
| workOrderId | String | ✓ |  |  |  |
| planId | String | ✓ |  |  |  |
| inspectorId | String | ✓ |  |  |  |
| status | QualityInspectionStatus | ✓ |  |  |  |
| result | QualityInspectionResult |  |  |  |  |
| quantity | Int | ✓ |  |  |  |
| startedAt | DateTime |  |  |  |  |
| completedAt | DateTime |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| ncrs | NCR[] | ✓ |  |  |  |
| inspector | User | ✓ |  |  |  |
| plan | QualityPlan | ✓ |  |  |  |
| workOrder | WorkOrder | ✓ |  |  |  |
| measurements | QualityMeasurement[] | ✓ |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | inspector | ✓ |  |
| one-to-one | QualityPlan | plan | ✓ |  |
| one-to-many | QualityMeasurement | measurements | ✓ |  |

**Usage Examples:**

#### Dimensional inspection for aerospace part

Completed dimensional inspection for turbine blade with certified inspector and documented results

```json
{
  "inspectionNumber": "QI-2024-001234",
  "workOrderId": "WO-2024-001234",
  "planId": "QP-TB-DIMENSIONAL",
  "inspectorId": "EMP-QC-001",
  "status": "COMPLETED",
  "result": "PASS"
}
```

#### Material certification inspection

Active material certification inspection for incoming material batch verification

```json
{
  "inspectionNumber": "QI-2024-001235",
  "workOrderId": "WO-2024-001235",
  "planId": "QP-MATERIAL-CERT",
  "inspectorId": "EMP-QC-002",
  "status": "IN_PROGRESS",
  "quantity": 100
}
```

**Common Queries:**
- Find inspections by status for work queue management
- Generate inspection reports for customer deliveries
- Track inspector workload and certification compliance

**Related Tables:** QualityPlan, WorkOrder, User, QualityMeasurement, NCR

**Constraints & Indexes:**

- **Primary Key:** id

---

### QualityMeasurement

**Description:** Individual measurement data collected during quality inspections with actual values, results, and acceptance criteria

**Business Purpose:** Captures precise measurement data for quality verification, statistical process control, and regulatory documentation

**Data Governance:**
- **Data Owner:** Quality Control and Inspection Teams
- **Update Frequency:** Real-time data entry as measurements are performed during inspections
- **Data Retention:** Permanent retention for statistical analysis and product lifetime traceability
- **Security Classification:** Internal - Quality measurement data with competitive sensitivity

**Compliance Notes:** Measurement data required for SPC analysis, customer certifications, and regulatory audit trails

**System Integrations:** Measurement Equipment, SPC Systems, Quality Inspection, Customer Certification Systems

**Fields (9):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| inspectionId | String | ✓ |  |  |  |
| characteristicId | String | ✓ |  |  |  |
| measuredValue | Float | ✓ |  |  |  |
| result | String | ✓ |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| characteristic | QualityCharacteristic | ✓ |  |  |  |
| inspection | QualityInspection | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | QualityCharacteristic | characteristic | ✓ |  |

**Usage Examples:**

#### Dimensional measurement data

Precision measurement showing diameter value within acceptable tolerance range

```json
{
  "inspectionId": "QI-2024-001234",
  "characteristicId": "CHAR-DIAMETER-001",
  "measuredValue": "25.38",
  "result": "PASS",
  "notes": "Within specification limits"
}
```

#### Surface finish measurement

Surface finish measurement identifying non-conformance requiring corrective action

```json
{
  "inspectionId": "QI-2024-001234",
  "characteristicId": "CHAR-SURFACE-001",
  "measuredValue": "32.5",
  "result": "FAIL",
  "notes": "Exceeds 32 Ra specification - rework required"
}
```

**Common Queries:**
- Collect measurement data for SPC analysis
- Generate capability studies for process validation
- Track measurement trends for continuous improvement

**Related Tables:** QualityInspection, QualityCharacteristic, QualityPlan, SPCConfiguration

**Constraints & Indexes:**

- **Primary Key:** id

---

### NCR

**Description:** Non-Conformance Reports documenting quality issues, defects, and corrective actions throughout the manufacturing process

**Business Purpose:** Manages quality issues by documenting problems, tracking corrective actions, and preventing recurrence through systematic problem-solving

**Data Governance:**
- **Data Owner:** Quality Assurance and Continuous Improvement Teams
- **Update Frequency:** Real-time creation when issues are identified, updated as corrective actions are implemented
- **Data Retention:** Permanent retention for continuous improvement and regulatory compliance
- **Security Classification:** Internal - Quality issues with potential customer and regulatory impact

**Compliance Notes:** Critical for AS9100 and ISO 9001 compliance. Customer notification may be required for delivered products

**System Integrations:** Quality Management Systems, Supplier Management, Customer Management, Corrective Action Systems

**Fields (26):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| ncrNumber | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| inspectionId | String |  |  |  |  |
| siteId | String |  |  |  |  |
| partNumber | String | ✓ |  |  |  |
| operation | String |  |  |  |  |
| defectType | String | ✓ |  |  |  |
| description | String | ✓ |  |  |  |
| severity | NCRSeverity | ✓ |  |  |  |
| status | NCRStatus | ✓ |  |  |  |
| quantity | Int | ✓ |  |  |  |
| createdById | String | ✓ |  |  |  |
| assignedToId | String |  |  |  |  |
| dueDate | DateTime |  |  |  |  |
| rootCause | String |  |  |  |  |
| correctiveAction | String |  |  |  |  |
| preventiveAction | String |  |  |  |  |
| closedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| assignedTo | User |  |  |  |  |
| createdBy | User | ✓ |  |  |  |
| inspection | QualityInspection |  |  |  |  |
| site | Site |  |  |  |  |
| workOrder | WorkOrder |  |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | assignedTo |  |  |
| one-to-one | User | createdBy | ✓ |  |
| one-to-one | Site | site |  |  |

**Usage Examples:**

#### Dimensional non-conformance

Critical dimensional issue requiring immediate corrective action and customer notification

```json
{
  "ncrNumber": "NCR-2024-001234",
  "partNumber": "TB-A380-001",
  "defectType": "DIMENSIONAL_DEVIATION",
  "description": "Blade profile exceeds tolerance by 0.002 inches",
  "severity": "MAJOR",
  "status": "OPEN"
}
```

#### Material defect with supplier involvement

Material quality issue requiring supplier investigation and process improvement

```json
{
  "ncrNumber": "NCR-2024-001235",
  "partNumber": "TI-6AL-4V-001",
  "defectType": "MATERIAL_DEFECT",
  "description": "Inclusion found in titanium bar stock",
  "severity": "CRITICAL",
  "status": "INVESTIGATING",
  "rootCause": "Supplier manufacturing process deviation"
}
```

**Common Queries:**
- Track open NCRs by severity for priority management
- Generate supplier quality reports for performance review
- Analyze defect trends for continuous improvement

**Related Tables:** QualityInspection, WorkOrder, User, Site, Part

**Constraints & Indexes:**

- **Primary Key:** id

---

### Equipment

**Description:** Manufacturing equipment and machinery used in production operations with capability and status tracking

**Business Purpose:** Manages shop floor assets including machines, tools, and measurement devices to optimize utilization and ensure capability

**Data Governance:**
- **Data Owner:** Manufacturing Engineering Team
- **Update Frequency:** Real-time for status updates, periodic for capability assessments
- **Data Retention:** Equipment lifetime plus 10 years for warranty and safety records
- **Security Classification:** Internal - Contains equipment capabilities and performance data

**Compliance Notes:** Calibration records required for measurement equipment (ISO 17025). Maintenance logs for safety compliance

**System Integrations:** Equipment Controllers, Maintenance Management, Calibration System, Production Scheduling

**Fields (47):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| equipmentNumber | String | ✓ |  |  |  |
| name | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| equipmentClass | EquipmentClass | ✓ |  |  |  |
| equipmentType | String |  |  |  |  |
| equipmentLevel | Int | ✓ | 1 |  |  |
| parentEquipmentId | String |  |  |  |  |
| manufacturer | String |  |  |  |  |
| model | String |  |  |  |  |
| serialNumber | String |  |  |  |  |
| installDate | DateTime |  |  |  |  |
| commissionDate | DateTime |  |  |  |  |
| siteId | String |  |  |  |  |
| areaId | String |  |  |  |  |
| workCenterId | String |  |  |  |  |
| workUnitId | String |  |  |  |  |
| status | EquipmentStatus | ✓ |  |  |  |
| currentState | EquipmentState | ✓ | IDLE |  |  |
| stateChangedAt | DateTime | ✓ | now( |  |  |
| utilizationRate | Float |  | auto |  |  |
| availability | Float |  | auto |  |  |
| performance | Float |  | auto |  |  |
| quality | Float |  | auto |  |  |
| oee | Float |  | auto |  |  |
| ratedCapacity | Float |  |  |  |  |
| currentCapacity | Float |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| area | Area |  |  |  |  |
| parentEquipment | Equipment |  |  |  |  |
| childEquipment | Equipment[] | ✓ |  |  |  |
| site | Site |  |  |  |  |
| workCenter | WorkCenter |  |  |  |  |
| workUnit | WorkUnit |  |  |  |  |
| capabilities | EquipmentCapability[] | ✓ |  |  |  |
| equipmentCommands | EquipmentCommand[] | ✓ |  |  |  |
| equipmentDataCollections | EquipmentDataCollection[] | ✓ |  |  |  |
| logs | EquipmentLog[] | ✓ |  |  |  |
| equipmentMaterialMovements | EquipmentMaterialMovement[] | ✓ |  |  |  |
| performanceData | EquipmentPerformanceLog[] | ✓ |  |  |  |
| stateHistory | EquipmentStateHistory[] | ✓ |  |  |  |
| machineTimeEntries | MachineTimeEntry[] | ✓ |  |  |  |
| maintenanceWorkOrders | MaintenanceWorkOrder[] | ✓ |  |  |  |
| processDataCollections | ProcessDataCollection[] | ✓ |  |  |  |
| productionScheduleRequests | ProductionScheduleRequest[] | ✓ |  |  |  |
**Relationships (14):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Area | area |  |  |
| one-to-one | Site | site |  |  |
| one-to-one | WorkCenter | workCenter |  |  |
| one-to-one | WorkUnit | workUnit |  |  |
| one-to-many | EquipmentCapability | capabilities | ✓ |  |
| one-to-many | EquipmentCommand | equipmentCommands | ✓ |  |
| one-to-many | EquipmentDataCollection | equipmentDataCollections | ✓ |  |
| one-to-many | EquipmentMaterialMovement | equipmentMaterialMovements | ✓ |  |
| one-to-many | EquipmentPerformanceLog | performanceData | ✓ |  |
| one-to-many | EquipmentStateHistory | stateHistory | ✓ |  |
| one-to-many | MachineTimeEntry | machineTimeEntries | ✓ |  |
| one-to-many | MaintenanceWorkOrder | maintenanceWorkOrders | ✓ |  |
| one-to-many | ProcessDataCollection | processDataCollections | ✓ |  |
| one-to-many | ProductionScheduleRequest | productionScheduleRequests | ✓ |  |

**Usage Examples:**

#### CNC machining center for precision parts

Primary machining equipment for aerospace components

```json
{
  "equipmentCode": "CNC-001",
  "equipmentName": "Haas VF-3 Machining Center",
  "equipmentType": "CNC_MILL",
  "status": "AVAILABLE",
  "location": "Cell A-01"
}
```

**Common Queries:**
- Find available equipment for specific operation types
- Generate equipment utilization reports
- Track equipment maintenance schedules and compliance

**Related Tables:** EquipmentCapability, EquipmentLog, WorkCenter, Operation

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentEquipmentId
- **Index:** workUnitId
- **Index:** workCenterId
- **Index:** areaId
- **Index:** siteId
- **Index:** currentState
- **Index:** equipmentClass

---

### EquipmentCapability

**Description:** Specific capabilities and qualifications of manufacturing equipment including certifications and operational parameters

**Business Purpose:** Defines what operations equipment can perform to enable intelligent routing, scheduling, and quality compliance

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Equipment Management Teams
- **Update Frequency:** Updated when equipment capabilities change, certifications are renewed, or new qualifications are added
- **Data Retention:** Permanent retention for equipment qualification history and regulatory compliance
- **Security Classification:** Internal - Equipment capabilities and certification information

**Compliance Notes:** Capability certifications required for regulatory compliance, customer approvals, and quality system requirements

**System Integrations:** Equipment Management, Production Routing, Quality Management, Certification Management

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| equipmentId | String | ✓ |  |  |  |
| capabilityType | String | ✓ |  |  |  |
| capability | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| parameters | Json |  |  |  |  |
| certifiedDate | DateTime |  |  |  |  |
| expiryDate | DateTime |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| equipment | Equipment | ✓ |  |  |  |

**Usage Examples:**

#### CNC machine precision capability

Precision capability with aerospace certification and renewal requirements

```json
{
  "capabilityType": "MACHINING_PRECISION",
  "capability": "±0.0005 inch tolerance",
  "description": "High-precision machining certified for aerospace components",
  "certifiedDate": "2024-01-15",
  "expiryDate": "2025-01-15"
}
```

#### CMM measurement capability

Measurement equipment capability with calibration certification

```json
{
  "capabilityType": "MEASUREMENT",
  "capability": "3D Coordinate Measurement",
  "description": "Calibrated for dimensional inspection per ISO 10360",
  "certifiedDate": "2024-06-01",
  "expiryDate": "2024-12-01"
}
```

#### Material processing capability

Material-specific processing capability with parameter definitions

```json
{
  "capabilityType": "MATERIAL_PROCESSING",
  "capability": "Titanium Alloy Processing",
  "description": "Qualified for aerospace titanium alloys per customer requirements",
  "parameters": {
    "maxTemperature": "600°C",
    "materials": [
      "Ti-6Al-4V",
      "Ti-5553"
    ]
  }
}
```

**Common Queries:**
- Find equipment by capability for operation routing
- Generate capability matrices for customer approvals
- Track certification renewals and compliance status

**Related Tables:** Equipment, Operation, RoutingOperation, QualityPlan

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** capabilityType
- **Index:** capability

---

### EquipmentLog

**Description:** Equipment activity logs capturing operational events, maintenance actions, and state changes for comprehensive equipment history

**Business Purpose:** Maintains detailed audit trail of equipment activities to support troubleshooting, compliance, and performance analysis

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Maintenance Teams
- **Update Frequency:** Real-time logging as equipment events occur and maintenance activities are performed
- **Data Retention:** 7 years for regulatory compliance, permanent for critical equipment and safety-related events
- **Security Classification:** Internal - Equipment operational and maintenance information

**Compliance Notes:** Equipment logs required for regulatory compliance, safety audits, and quality system maintenance records

**System Integrations:** Equipment Controllers, Maintenance Management, Safety Systems, Audit Management

**Fields (8):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| equipmentId | String | ✓ |  |  |  |
| logType | EquipmentLogType | ✓ |  |  |  |
| description | String | ✓ |  |  |  |
| userId | String |  |  |  |  |
| loggedAt | DateTime | ✓ | now( |  |  |
| equipment | Equipment | ✓ |  |  |  |
| user | User |  |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | user |  |  |

**Usage Examples:**

#### Equipment maintenance event log

Maintenance action logged with technician identification and detailed description

```json
{
  "equipmentId": "CNC-001",
  "logType": "MAINTENANCE",
  "description": "Preventive maintenance - spindle bearing replacement",
  "userId": "MAINT-TECH-001",
  "loggedAt": "2024-10-30T10:30:00Z"
}
```

#### Equipment alarm event

Automated alarm event indicating potential equipment issue requiring attention

```json
{
  "equipmentId": "CNC-001",
  "logType": "ALARM",
  "description": "High vibration detected - spindle bearing warning",
  "loggedAt": "2024-10-30T08:15:00Z"
}
```

**Common Queries:**
- Find equipment logs by type for maintenance analysis
- Generate equipment history reports for troubleshooting
- Track maintenance activities by technician and equipment

**Related Tables:** Equipment, User, MaintenanceWorkOrder, EquipmentStateHistory

**Constraints & Indexes:**

- **Primary Key:** id

---

### EquipmentStateHistory

**Description:** Complete history of equipment state transitions tracking operational status, downtime, and utilization patterns

**Business Purpose:** Enables equipment utilization analysis, downtime tracking, and operational efficiency improvement through detailed state monitoring

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Production Control Teams
- **Update Frequency:** Real-time updates as equipment transitions between operational states
- **Data Retention:** 5 years for operational analysis, permanent for critical production equipment
- **Security Classification:** Internal - Equipment utilization and operational performance data

**Compliance Notes:** State history required for equipment efficiency reporting, utilization analysis, and production accountability

**System Integrations:** Equipment Controllers, Production Scheduling, Performance Analytics, Maintenance Management

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| equipmentId | String | ✓ |  |  |  |
| previousState | EquipmentState |  |  |  |  |
| newState | EquipmentState | ✓ |  |  |  |
| reason | String |  |  |  |  |
| changedBy | String |  |  |  |  |
| stateStartTime | DateTime | ✓ | now( |  |  |
| stateEndTime | DateTime |  |  |  |  |
| duration | Int |  |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| downtime | Boolean | ✓ | auto |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| equipment | Equipment | ✓ |  |  |  |

**Usage Examples:**

#### Equipment running to maintenance transition

State change from production to maintenance with duration tracking and work order reference

```json
{
  "equipmentId": "CNC-001",
  "previousState": "RUNNING",
  "newState": "MAINTENANCE",
  "reason": "Scheduled preventive maintenance",
  "duration": "480 minutes",
  "workOrderId": "WO-2024-001234"
}
```

#### Unplanned downtime event

Equipment failure event triggering downtime tracking and requiring immediate attention

```json
{
  "equipmentId": "CNC-001",
  "previousState": "RUNNING",
  "newState": "DOWN",
  "reason": "Spindle bearing failure",
  "downtime": true,
  "changedBy": "OPERATOR-001"
}
```

**Common Queries:**
- Calculate equipment utilization by time period
- Track downtime events for reliability analysis
- Generate state transition reports for performance improvement

**Related Tables:** Equipment, WorkOrder, Operation, MaintenanceWorkOrder

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** stateStartTime
- **Index:** newState

---

### EquipmentPerformanceLog

**Description:** Equipment performance metrics tracking availability, performance efficiency, and Overall Equipment Effectiveness (OEE)

**Business Purpose:** Provides comprehensive performance measurement to drive equipment optimization, maintenance planning, and continuous improvement initiatives

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Industrial Engineering Teams
- **Update Frequency:** Periodic performance calculation by shift, day, or production period
- **Data Retention:** 5 years for trend analysis and benchmarking, permanent for critical equipment baselines
- **Security Classification:** Internal - Equipment performance and operational efficiency data

**Compliance Notes:** Performance data required for operational reporting, efficiency analysis, and continuous improvement compliance

**System Integrations:** Equipment Controllers, Production Systems, Performance Analytics, Maintenance Planning

**Fields (30):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| equipmentId | String | ✓ |  |  |  |
| periodStart | DateTime | ✓ |  |  |  |
| periodEnd | DateTime | ✓ |  |  |  |
| periodType | PerformancePeriodType | ✓ | SHIFT |  |  |
| plannedProductionTime | Int | ✓ |  |  |  |
| operatingTime | Int | ✓ |  |  |  |
| downtime | Int | ✓ |  |  |  |
| availability | Float | ✓ |  |  |  |
| idealCycleTime | Float |  |  |  |  |
| actualCycleTime | Float |  |  |  |  |
| totalUnitsProduced | Int | ✓ |  |  |  |
| targetProduction | Int |  |  |  |  |
| performance | Float | ✓ |  |  |  |
| goodUnits | Int | ✓ |  |  |  |
| rejectedUnits | Int | ✓ |  |  |  |
| scrapUnits | Int | ✓ |  |  |  |
| reworkUnits | Int | ✓ |  |  |  |
| quality | Float | ✓ |  |  |  |
| oee | Float | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| partId | String |  |  |  |  |
| operatorId | String |  |  |  |  |
| teep | Float |  |  |  |  |
| utilizationRate | Float |  |  |  |  |
| notes | String |  |  |  |  |
| hasAnomalies | Boolean | ✓ | auto |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| calculatedAt | DateTime | ✓ | now( |  |  |
| equipment | Equipment | ✓ |  |  |  |

**Usage Examples:**

#### Daily shift performance metrics

Complete OEE calculation for day shift showing strong quality but opportunities in availability and performance

```json
{
  "equipmentId": "CNC-001",
  "periodType": "SHIFT",
  "availability": "92.5%",
  "performance": "87.3%",
  "quality": "98.1%",
  "oee": "79.2%",
  "totalUnitsProduced": 120
}
```

#### Weekly performance summary

Weekly utilization summary showing planned versus actual operating time with downtime analysis

```json
{
  "equipmentId": "CNC-001",
  "periodType": "WEEK",
  "plannedProductionTime": "7200 minutes",
  "operatingTime": "6480 minutes",
  "downtime": "720 minutes",
  "availability": "90.0%"
}
```

**Common Queries:**
- Track OEE trends for equipment optimization
- Generate performance benchmarks for capacity planning
- Analyze performance patterns for maintenance scheduling

**Related Tables:** Equipment, WorkOrder, Operation, EquipmentStateHistory

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** periodStart
- **Index:** periodType
- **Index:** oee

---

### Inventory

**Description:** Material inventory management tracking quantities, locations, costs, and availability across all manufacturing sites and storage locations

**Business Purpose:** Provides real-time inventory visibility enabling material planning, cost control, and production support through accurate inventory management

**Data Governance:**
- **Data Owner:** Materials Management and Inventory Control Teams
- **Update Frequency:** Real-time updates as materials are received, consumed, transferred, or adjusted through manufacturing operations
- **Data Retention:** 7 years for financial audit requirements and inventory valuation
- **Security Classification:** Internal - Inventory levels and cost information with competitive and financial sensitivity

**Compliance Notes:** Inventory tracking required for financial accuracy, material accountability, and regulatory compliance in controlled environments

**System Integrations:** Material Requirements Planning, Purchasing, Receiving, Work Order Management, Financial Systems

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| partId | String | ✓ |  |  |  |
| location | String | ✓ |  |  |  |
| lotNumber | String |  |  |  |  |
| quantity | Float | ✓ |  |  |  |
| unitOfMeasure | String | ✓ |  |  |  |
| unitCost | Float |  |  |  |  |
| receivedDate | DateTime |  |  |  |  |
| expiryDate | DateTime |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| part | Part | ✓ |  |  |  |
| transactions | MaterialTransaction[] | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Part | part | ✓ |  |

**Usage Examples:**

#### Raw titanium inventory

Titanium alloy bar stock inventory with lot tracking and cost information

```json
{
  "partId": "TI-6AL-4V-BAR-001",
  "location": "WAREHOUSE-A-R01-S03",
  "lotNumber": "LOT-TI-240325-001",
  "quantity": 125.5,
  "unitOfMeasure": "kg",
  "unitCost": 125.5,
  "receivedDate": "2024-03-25T00:00:00Z",
  "isActive": true
}
```

#### Finished goods inventory

Finished turbine blade inventory ready for customer shipment

```json
{
  "partId": "TB-A380-001",
  "location": "FG-WAREHOUSE-B",
  "quantity": 48,
  "unitOfMeasure": "EA",
  "unitCost": 2750,
  "receivedDate": "2024-10-15T00:00:00Z"
}
```

**Common Queries:**
- Find available inventory for material requirements planning
- Track inventory costs and valuation for financial reporting
- Generate inventory reports by location and part

**Related Tables:** Part, MaterialTransaction, MaterialLot, Site

**Constraints & Indexes:**

- **Primary Key:** id

---

### MaterialTransaction

**Description:** Detailed record of all material movements, consumption, and inventory changes with timestamps and authorization

**Business Purpose:** Maintains complete audit trail of material usage for cost accounting, inventory control, and regulatory traceability

**Data Governance:**
- **Data Owner:** Materials Management and Production Control Teams
- **Update Frequency:** Real-time updates for every material movement, issue, or return transaction
- **Data Retention:** 7 years for financial audit requirements, permanent for critical part traceability
- **Security Classification:** Internal - Contains cost and usage information

**Compliance Notes:** Transaction records required for cost accounting, inventory accuracy, and regulatory audit trails

**System Integrations:** ERP Inventory Module, Production Control Systems, Cost Accounting, Shop Floor Data Collection

**Fields (11):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| inventoryId | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| transactionType | MaterialTransactionType | ✓ |  | Type of material movement or inventory transaction being recorded | Determines inventory valuation, cost allocation, and material availability |
| quantity | Float | ✓ |  | Amount of material involved in the transaction with appropriate units of measure | Affects inventory levels, cost calculations, and material availability for production |
| unitOfMeasure | String | ✓ |  |  |  |
| reference | String |  |  |  |  |
| transactionDate | DateTime | ✓ | now( |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| inventory | Inventory | ✓ |  |  |  |
| workOrder | WorkOrder |  |  |  |  |

**Field Details:**

#### transactionType

- **Data Source:** Production control system, inventory management, and shop floor transactions
- **Validation:** Must be valid transaction type with proper authorization
- **Audit Trail:** All transactions logged for financial and regulatory audit compliance

#### quantity

- **Data Source:** Physical measurement, scale readings, or count verification
- **Format:** Decimal number with unit of measure (lbs, kg, pieces, etc.)
- **Validation:** Must be positive for normal transactions, match physical verification
- **Examples:** 25.5 lbs - Weight-based materials like metals, 100 pieces - Count-based materials like fasteners, 2.5 m³ - Volume-based materials like composites

**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Inventory | inventory | ✓ |  |

**Usage Examples:**

#### Material issue to work order

Titanium alloy issued from inventory to specific work order for production

```json
{
  "transactionType": "ISSUE",
  "materialLotId": "TI-240325-001",
  "workOrderId": "WO-2024-001234",
  "quantity": "25 lbs",
  "transactionDate": "2024-03-26T08:30:00Z"
}
```

#### Material return from production

Unused medical polymer returned to inventory after production completion

```json
{
  "transactionType": "RETURN",
  "materialLotId": "PEEK-240320-003",
  "workOrderId": "WO-2024-001235",
  "quantity": "2 kg",
  "reason": "EXCESS_MATERIAL"
}
```

**Common Queries:**
- Track material consumption by work order for costing
- Generate material usage reports for inventory planning
- Audit material transactions for specific time periods

**Related Tables:** MaterialLot, WorkOrder, User, CostCenter

**Constraints & Indexes:**

- **Primary Key:** id

---

### SerializedPart

**Description:** Individual serialized parts with unique identifiers enabling complete traceability throughout manufacturing and service life

**Business Purpose:** Provides unit-level traceability for quality control, warranty management, and regulatory compliance requirements

**Data Governance:**
- **Data Owner:** Manufacturing Operations and Quality Control Teams
- **Update Frequency:** Real-time updates as parts move through manufacturing, inspection, and delivery processes
- **Data Retention:** Permanent retention for complete product lifetime traceability and warranty support
- **Security Classification:** Internal - Serialized part information with customer delivery and service implications

**Compliance Notes:** Critical for aerospace, medical, and automotive traceability requirements. Serial numbers must be maintained for product lifetime

**System Integrations:** Manufacturing Execution, Quality Management, Shipping Systems, Service Management

**Fields (17):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| serialNumber | String | ✓ |  |  |  |
| partId | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| lotNumber | String |  |  |  |  |
| status | String | ✓ |  |  |  |
| currentLocation | String |  |  |  |  |
| manufactureDate | DateTime |  |  |  |  |
| shipDate | DateTime |  |  |  |  |
| customerInfo | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| inspectionRecords | InspectionRecord[] | ✓ |  |  |  |
| components | PartGenealogy[] | ✓ |  |  |  |
| genealogy | PartGenealogy[] | ✓ |  |  |  |
| qifMeasurementResults | QIFMeasurementResult[] | ✓ |  |  |  |
| part | Part | ✓ |  |  |  |
**Relationships (5):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | InspectionRecord | inspectionRecords | ✓ |  |
| one-to-many | PartGenealogy | components | ✓ |  |
| one-to-many | PartGenealogy | genealogy | ✓ |  |
| one-to-many | QIFMeasurementResult | qifMeasurementResults | ✓ |  |
| one-to-one | Part | part | ✓ |  |

**Usage Examples:**

#### Aerospace engine component

Shipped turbine blade with complete manufacturing and customer traceability

```json
{
  "serialNumber": "TB-A380-001-S240325001",
  "partId": "TB-A380-001",
  "workOrderId": "WO-2024-001234",
  "lotNumber": "LOT-TB-240325",
  "status": "SHIPPED",
  "manufactureDate": "2024-03-25",
  "customerInfo": "Boeing Commercial Aircraft"
}
```

#### In-process serialized part

Part currently in manufacturing with location tracking and work order assignment

```json
{
  "serialNumber": "TB-A380-001-S240326001",
  "partId": "TB-A380-001",
  "workOrderId": "WO-2024-001235",
  "status": "IN_PROCESS",
  "currentLocation": "CNC-CELL-A",
  "manufactureDate": "2024-03-26"
}
```

**Common Queries:**
- Track serialized parts by status for production control
- Generate genealogy reports for customer deliveries
- Find parts requiring inspection or service by serial number

**Related Tables:** Part, WorkOrder, PartGenealogy, QualityInspection, InspectionRecord

**Constraints & Indexes:**

- **Primary Key:** id

---

### PartGenealogy

**Description:** Assembly genealogy tracking parent-child relationships between serialized parts for complete product traceability

**Business Purpose:** Maintains assembly history enabling rapid response to quality issues, recalls, and service requirements through complete traceability

**Data Governance:**
- **Data Owner:** Manufacturing Operations and Quality Assurance Teams
- **Update Frequency:** Real-time updates as parts are assembled and genealogy relationships are established
- **Data Retention:** Permanent retention for complete product lifetime traceability and regulatory compliance
- **Security Classification:** Internal - Assembly relationships with quality and service implications

**Compliance Notes:** Essential for aerospace, medical, and automotive recall management and regulatory traceability requirements

**System Integrations:** Assembly Operations, Quality Management, Service Management, Recall Management

**Fields (8):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| parentPartId | String | ✓ |  |  |  |
| componentPartId | String | ✓ |  |  |  |
| assemblyDate | DateTime |  |  |  |  |
| assemblyOperator | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| componentPart | SerializedPart | ✓ |  |  |  |
| parentPart | SerializedPart | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | SerializedPart | componentPart | ✓ |  |
| one-to-one | SerializedPart | parentPart | ✓ |  |

**Usage Examples:**

#### Turbine blade assembly genealogy

Turbine blade installed in assembly with operator identification and timestamp

```json
{
  "parentPartId": "TURB-ASSY-001-S240325001",
  "componentPartId": "TB-A380-001-S240325001",
  "assemblyDate": "2024-03-26T14:30:00Z",
  "assemblyOperator": "EMP-001234"
}
```

#### Multi-level assembly traceability

Assembly incorporated into higher-level product creating multi-level genealogy chain

```json
{
  "parentPartId": "ENGINE-001-S240327001",
  "componentPartId": "TURB-ASSY-001-S240325001",
  "assemblyDate": "2024-03-27T10:15:00Z",
  "assemblyOperator": "EMP-005678"
}
```

**Common Queries:**
- Generate complete product genealogy for customer delivery
- Find all components affected by material or quality issues
- Track assembly history for service and warranty analysis

**Related Tables:** SerializedPart, WorkOrder, User, QualityInspection

**Constraints & Indexes:**

- **Primary Key:** id

---

### WorkInstruction

**Description:** Detailed step-by-step instructions for manufacturing operations, processes, and procedures

**Business Purpose:** Provides standardized work procedures to ensure consistent quality, safety, and efficiency in manufacturing operations

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Process Engineering Teams
- **Update Frequency:** Updated when processes change, equipment is modified, or continuous improvement identifies better methods
- **Data Retention:** Permanent retention for process history and regulatory compliance
- **Security Classification:** Internal - Contains proprietary manufacturing processes and procedures

**Compliance Notes:** Work instructions must be controlled documents per AS9100 and ISO 9001 requirements. Changes require approval and training

**System Integrations:** Shop Floor Terminals, Training Management, Quality Management, Equipment Controllers

**Fields (36):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| title | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| partId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| version | String | ✓ | 1.0.0 |  |  |
| status | WorkInstructionStatus | ✓ | DRAFT |  |  |
| effectiveDate | DateTime |  |  |  |  |
| supersededDate | DateTime |  |  |  |  |
| ecoNumber | String |  |  |  |  |
| approvedById | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| approvalHistory | Json |  |  |  |  |
| createdById | String | ✓ |  |  |  |
| updatedById | String | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| operationType | String |  |  |  |  |
| requiredForExecution | Boolean | ✓ | auto |  |  |
| contentFormat | WorkInstructionFormat | ✓ | NATIVE |  |  |
| nativeContent | Json |  |  |  |  |
| importedFromFile | String |  |  |  |  |
| exportTemplateId | String |  |  |  |  |
| tags | String[] | ✓ |  |  |  |
| categories | String[] | ✓ |  |  |  |
| keywords | String[] | ✓ |  |  |  |
| thumbnailUrl | String |  |  |  |  |
| operationStandard | Operation[] | ✓ |  |  |  |
| routingStepOverrides | RoutingStep[] | ✓ |  |  |  |
| mediaLibraryItems | WorkInstructionMedia[] | ✓ |  |  |  |
| relatedDocuments | WorkInstructionRelation[] | ✓ |  |  |  |
| steps | WorkInstructionStep[] | ✓ |  |  |  |
| approvedBy | User |  |  |  |  |
| createdBy | User | ✓ |  |  |  |
| exportTemplate | ExportTemplate |  |  |  |  |
| updatedBy | User | ✓ |  |  |  |
**Relationships (7):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | RoutingStep | routingStepOverrides | ✓ |  |
| one-to-many | WorkInstructionMedia | mediaLibraryItems | ✓ |  |
| one-to-many | WorkInstructionRelation | relatedDocuments | ✓ |  |
| one-to-many | WorkInstructionStep | steps | ✓ |  |
| one-to-one | User | approvedBy |  |  |
| one-to-one | User | createdBy | ✓ |  |
| one-to-one | User | updatedBy | ✓ |  |

**Usage Examples:**

#### CNC machining work instruction

Detailed instructions for rough machining operation on aerospace turbine blade

```json
{
  "title": "Turbine Blade Rough Machining",
  "version": "3.2",
  "status": "APPROVED",
  "partId": "TB-A380-001",
  "operationId": "OP-ROUGH-MILL"
}
```

#### Assembly work instruction

Step-by-step assembly procedure with safety requirements and training prerequisites

```json
{
  "title": "Engine Mount Assembly Procedure",
  "version": "1.5",
  "status": "ACTIVE",
  "requiresTraining": true,
  "safetyRequired": true
}
```

**Common Queries:**
- Find work instructions for specific operations
- Generate work instruction packages for work orders
- Track work instruction compliance and execution

**Related Tables:** WorkInstructionStep, Part, Operation, WorkInstructionExecution

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** status
- **Index:** partId
- **Index:** contentFormat
- **Index:** tags
- **Index:** categories

---

### WorkInstructionStep

**Description:** Individual steps within work instructions containing specific actions, parameters, and verification requirements

**Business Purpose:** Breaks down complex manufacturing procedures into manageable steps with clear acceptance criteria and safety requirements

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Process Engineering Teams
- **Update Frequency:** Updated when process details change or step improvements are identified
- **Data Retention:** Permanent retention with work instruction version history
- **Security Classification:** Internal - Contains detailed process parameters and specifications

**Compliance Notes:** Step documentation must include verification methods and acceptance criteria for quality compliance

**System Integrations:** Shop Floor Data Collection, Operator Terminals, Measurement Equipment, Safety Systems

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workInstructionId | String | ✓ |  |  |  |
| stepNumber | Int | ✓ |  |  |  |
| title | String | ✓ |  |  |  |
| content | String | ✓ |  |  |  |
| imageUrls | String[] | ✓ |  |  |  |
| videoUrls | String[] | ✓ |  |  |  |
| attachmentUrls | String[] | ✓ |  |  |  |
| estimatedDuration | Int |  |  |  |  |
| isCritical | Boolean | ✓ | auto |  |  |
| requiresSignature | Boolean | ✓ | auto |  |  |
| dataEntryFields | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| workInstruction | WorkInstruction | ✓ |  |  |  |

**Usage Examples:**

#### Machining setup step

Initial setup step with safety requirements and time estimates

```json
{
  "stepNumber": 1,
  "title": "Mount Workpiece in Fixture",
  "content": "Secure part in custom fixture using specified torque",
  "estimatedTime": "5 minutes",
  "criticalSafety": true
}
```

#### Quality verification step

Quality control step requiring measurement and verification

```json
{
  "stepNumber": 5,
  "title": "Verify Dimensional Accuracy",
  "content": "Measure critical dimensions per drawing requirements",
  "requiresVerification": true,
  "toolsRequired": [
    "Calipers",
    "Height Gauge"
  ]
}
```

**Common Queries:**
- Find steps requiring specific tools or equipment
- Generate step-by-step operator guidance
- Track step execution times and compliance

**Related Tables:** WorkInstruction, WorkInstructionStepExecution, Equipment, QualityPlan

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** workInstructionId, stepNumber
- **Index:** workInstructionId

---

### WorkInstructionExecution

**Description:** Records of work instruction execution including operator, timing, and completion status for specific work orders

**Business Purpose:** Tracks adherence to standardized procedures and provides audit trail for manufacturing compliance and process improvement

**Data Governance:**
- **Data Owner:** Production Control and Quality Assurance Teams
- **Update Frequency:** Real-time updates as operators execute work instructions on the shop floor
- **Data Retention:** 7 years for audit requirements, permanent for critical part traceability
- **Security Classification:** Internal - Contains production execution and operator performance data

**Compliance Notes:** Execution records required for traceability and regulatory compliance (AS9100, FDA). Electronic signatures may be required

**System Integrations:** Shop Floor Terminals, Time Tracking, Quality Management, Electronic Signature Systems

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workInstructionId | String | ✓ |  |  |  |
| workOrderId | String | ✓ |  |  |  |
| operationId | String |  |  |  |  |
| operatorId | String | ✓ |  |  |  |
| currentStepNumber | Int | ✓ | 1 |  |  |
| status | WorkInstructionExecutionStatus | ✓ | IN_PROGRESS |  |  |
| startedAt | DateTime | ✓ | now( |  |  |
| completedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| operator | User | ✓ |  |  |  |
| stepExecutions | WorkInstructionStepExecution[] | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | operator | ✓ |  |
| one-to-many | WorkInstructionStepExecution | stepExecutions | ✓ |  |

**Usage Examples:**

#### Completed machining instruction execution

Completed execution of rough machining work instruction with operator tracking

```json
{
  "workInstructionId": "WI-ROUGH-MILL-TB",
  "workOrderId": "WO-2024-001234",
  "operatorId": "EMP-001234",
  "status": "COMPLETED",
  "completedAt": "2024-10-30T14:30:00Z"
}
```

#### In-progress assembly instruction

Active execution of assembly work instruction currently in progress

```json
{
  "workInstructionId": "WI-ASSEMBLY-ENGINE",
  "workOrderId": "WO-2024-001235",
  "operatorId": "EMP-005678",
  "status": "IN_PROGRESS",
  "startedAt": "2024-10-30T13:15:00Z"
}
```

**Common Queries:**
- Track work instruction execution by operator
- Generate compliance reports for completed work orders
- Analyze execution times for process improvement

**Related Tables:** WorkInstruction, WorkOrder, User, WorkInstructionStepExecution

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workOrderId
- **Index:** operatorId

---

### WorkInstructionStepExecution

**Description:** Detailed execution records for individual work instruction steps including data collection, verification, and timing

**Business Purpose:** Provides granular tracking of step-by-step execution for quality verification, process optimization, and regulatory compliance

**Data Governance:**
- **Data Owner:** Production Control and Quality Assurance Teams
- **Update Frequency:** Real-time updates as each step is completed with data collection and verification
- **Data Retention:** 7 years minimum, permanent for critical processes and regulatory requirements
- **Security Classification:** Internal - Contains detailed process execution and measurement data

**Compliance Notes:** Step execution data required for detailed traceability and process validation per regulatory requirements

**System Integrations:** Shop Floor Data Collection, Measurement Equipment, Quality Systems, Process Control

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| executionId | String | ✓ |  |  |  |
| stepNumber | Int | ✓ |  |  |  |
| status | String | ✓ | PENDING |  |  |
| dataEntered | Json |  |  |  |  |
| notes | String |  |  |  |  |
| signedById | String |  |  |  |  |
| signedAt | DateTime |  |  |  |  |
| startedAt | DateTime |  |  |  |  |
| completedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| execution | WorkInstructionExecution | ✓ |  |  |  |
| signedBy | User |  |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | signedBy |  |  |

**Usage Examples:**

#### Measurement step execution with data

Completed measurement step with collected dimensional data and verification

```json
{
  "stepNumber": 3,
  "status": "COMPLETED",
  "dataEntered": {
    "diameter": "25.4mm",
    "tolerance": "±0.05mm",
    "actualValue": "25.38mm"
  },
  "completedAt": "2024-10-30T14:15:00Z"
}
```

#### Setup step with tool verification

Setup step execution with tool verification and condition notes

```json
{
  "stepNumber": 1,
  "status": "COMPLETED",
  "dataEntered": {
    "toolNumber": "T01",
    "toolLength": "125.5mm",
    "verified": true
  },
  "notes": "Tool condition verified - good"
}
```

**Common Queries:**
- Track step-by-step execution progress
- Collect process data for analysis and improvement
- Generate detailed execution reports for compliance

**Related Tables:** WorkInstructionExecution, WorkInstructionStep, QualityMeasurement, Equipment

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** executionId, stepNumber
- **Index:** executionId

---

### ElectronicSignature

**Description:** Electronic signatures for digital document approval and authentication supporting regulatory compliance and audit trails

**Business Purpose:** Provides secure electronic approval mechanisms for critical manufacturing documents ensuring regulatory compliance and non-repudiation

**Data Governance:**
- **Data Owner:** Quality Assurance and IT Security Teams
- **Update Frequency:** Real-time creation when documents are electronically signed with immutable audit trail
- **Data Retention:** Permanent retention for regulatory compliance and legal requirements
- **Security Classification:** Confidential - Electronic signature data and authentication records

**Compliance Notes:** Critical for 21 CFR Part 11 FDA compliance and ISO 9001 document control - must maintain complete signature integrity

**System Integrations:** Document Management, Workflow Systems, User Authentication, Audit Systems, Compliance Reporting

**Fields (25):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| signatureType | ElectronicSignatureType | ✓ |  |  |  |
| signatureLevel | ElectronicSignatureLevel | ✓ |  |  |  |
| userId | String | ✓ |  |  |  |
| signedEntityType | String | ✓ |  |  |  |
| signedEntityId | String | ✓ |  |  |  |
| signatureReason | String |  |  |  |  |
| signatureData | Json | ✓ |  |  |  |
| ipAddress | String | ✓ |  |  |  |
| userAgent | String | ✓ |  |  |  |
| timestamp | DateTime | ✓ | now( |  |  |
| biometricType | BiometricType |  |  |  |  |
| biometricTemplate | String |  |  |  |  |
| biometricScore | Float |  |  |  |  |
| signatureHash | String | ✓ |  |  |  |
| isValid | Boolean | ✓ | true |  |  |
| invalidatedAt | DateTime |  |  |  |  |
| invalidatedById | String |  |  |  |  |
| invalidationReason | String |  |  |  |  |
| signedDocument | Json |  |  |  |  |
| certificateId | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| invalidatedBy | User |  |  |  |  |
| user | User | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | invalidatedBy |  |  |
| one-to-one | User | user | ✓ |  |

**Usage Examples:**

#### Quality plan approval signature

Biometric signature for quality plan approval with complete audit trail and integrity verification

```json
{
  "documentId": "QP-TB-A380-001",
  "documentType": "QUALITY_PLAN",
  "signerId": "quality_manager_jones",
  "signerRole": "QUALITY_MANAGER",
  "signatureType": "APPROVAL",
  "signatureMethod": "BIOMETRIC_SIGNATURE_PAD",
  "signedAt": "2024-03-25T14:30:00Z",
  "signatureReason": "Approved for production release",
  "biometricHash": "SHA256:a1b2c3d4e5f6...",
  "ipAddress": "192.168.1.100",
  "isValid": true,
  "witnessRequired": false
}
```

#### ECO approval signature chain

PKI-based signature for ECO final approval with preceding signature chain and timestamp verification

```json
{
  "documentId": "ECO-2024-001234",
  "documentType": "ENGINEERING_CHANGE_ORDER",
  "signerId": "engineering_director_smith",
  "signerRole": "ENGINEERING_DIRECTOR",
  "signatureType": "FINAL_APPROVAL",
  "signatureMethod": "SMART_CARD_PKI",
  "signedAt": "2024-03-25T16:45:00Z",
  "signatureReason": "Final approval for implementation",
  "certificateSerial": "12345678901234567890",
  "timestampToken": "RFC3161_TIMESTAMP",
  "precedingSignatures": [
    "design_engineer_davis",
    "quality_engineer_brown"
  ]
}
```

**Common Queries:**
- Validate signature integrity for document authenticity
- Generate signature audit trails for regulatory compliance
- Track signature workflow completion for document approval

**Related Tables:** User, Document, WorkflowInstance, AuditLog, DocumentRevision

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** userId
- **Index:** signedEntityType, signedEntityId
- **Index:** timestamp

---

### FAIReport

**Description:** First Article Inspection reports documenting complete dimensional and functional verification for new or changed manufacturing processes

**Business Purpose:** Provides comprehensive verification that manufacturing processes can consistently produce parts meeting all engineering requirements and customer specifications

**Data Governance:**
- **Data Owner:** Quality Assurance and Manufacturing Engineering Teams
- **Update Frequency:** Created for each new part, process change, tooling change, or supplier qualification requiring first article inspection
- **Data Retention:** Permanent retention for part qualification and customer delivery requirements
- **Security Classification:** Confidential - Contains customer-specific requirements and proprietary manufacturing data

**Compliance Notes:** Critical for AS9102 aerospace compliance, automotive PPAP requirements, and customer-specific FAI protocols

**System Integrations:** Quality Management, Engineering Change Management, Supplier Management, Manufacturing Engineering, Customer Portal

**Fields (19):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| faiNumber | String | ✓ |  |  |  |
| partId | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| inspectionId | String |  |  |  |  |
| status | FAIStatus | ✓ | IN_PROGRESS |  |  |
| revisionLevel | String |  |  |  |  |
| form1Data | Json |  |  |  |  |
| form2Data | Json |  |  |  |  |
| createdById | String |  |  |  |  |
| reviewedById | String |  |  |  |  |
| approvedById | String |  |  |  |  |
| reviewedAt | DateTime |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| characteristics | FAICharacteristic[] | ✓ |  |  |  |
| qifMeasurementPlans | QIFMeasurementPlan[] | ✓ |  |  |  |
| qifMeasurementResults | QIFMeasurementResult[] | ✓ |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | FAICharacteristic | characteristics | ✓ |  |
| one-to-many | QIFMeasurementPlan | qifMeasurementPlans | ✓ |  |
| one-to-many | QIFMeasurementResult | qifMeasurementResults | ✓ |  |

**Usage Examples:**

#### Aerospace turbine blade FAI

Complete aerospace FAI for critical turbine blade with customer approval and special process verification

```json
{
  "faiNumber": "FAI-TB-A380-001-001",
  "partNumber": "TB-A380-001",
  "customerName": "Airbus",
  "faiType": "INITIAL_PRODUCTION",
  "inspectionDate": "2024-03-25T00:00:00Z",
  "inspectorCertification": "AS9102_CERTIFIED",
  "dimensionalResults": "ALL_ACCEPTABLE",
  "functionalResults": "ALL_ACCEPTABLE",
  "materialCertification": "CERTIFIED_TO_AMS_4928",
  "specialProcesses": [
    "FLUORESCENT_PENETRANT_INSPECTION"
  ],
  "customerApprovalRequired": true,
  "status": "APPROVED"
}
```

#### Medical device component FAI

Medical device FAI with FDA compliance, biocompatibility certification, and sterilization validation

```json
{
  "faiNumber": "FAI-MD-VALVE-002-001",
  "partNumber": "MD-VALVE-002",
  "regulatoryCompliance": "FDA_510K",
  "biocompatibilityTesting": "ISO_10993_CERTIFIED",
  "sterilizationValidation": "GAMMA_RADIATION_VALIDATED",
  "traceabilityRequired": true,
  "riskClass": "CLASS_II_MEDICAL_DEVICE"
}
```

**Common Queries:**
- Generate customer FAI packages for delivery approval
- Track FAI completion status for new product introductions
- Find FAI reports for specific parts or customers

**Related Tables:** FAICharacteristic, InspectionPlan, QualityMeasurement, EngineeringChangeOrder, CustomerRequirement

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** partId
- **Index:** status

---

### FAICharacteristic

**Description:** First Article Inspection characteristics defining specific measurements and acceptance criteria for aerospace and medical device validation

**Business Purpose:** Ensures comprehensive part validation by defining specific dimensional and functional characteristics requiring verification during first article inspection

**Data Governance:**
- **Data Owner:** Quality Engineering and Manufacturing Engineering Teams
- **Update Frequency:** Updated when part requirements change, inspection methods are validated, or customer specifications are modified
- **Data Retention:** Permanent retention for part qualification and customer delivery requirements
- **Security Classification:** Confidential - Customer-specific requirements and proprietary measurement criteria

**Compliance Notes:** Critical for AS9102 aerospace FAI compliance and automotive PPAP requirements - must include all critical characteristics

**System Integrations:** FAI Reporting, Quality Management, Measurement Systems, Engineering Drawings, Customer Requirements

**Fields (23):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| faiReportId | String | ✓ |  |  |  |
| characteristicNumber | Int | ✓ |  |  |  |
| characteristic | String | ✓ |  |  |  |
| specification | String | ✓ |  |  |  |
| requirement | String |  |  |  |  |
| toleranceType | String |  |  |  |  |
| nominalValue | Float |  |  |  |  |
| upperLimit | Float |  |  |  |  |
| lowerLimit | Float |  |  |  |  |
| unitOfMeasure | String |  |  |  |  |
| inspectionMethod | String |  |  |  |  |
| inspectionFrequency | String |  |  |  |  |
| measuredValues | Json | ✓ |  |  |  |
| actualValue | Float |  |  |  |  |
| deviation | Float |  |  |  |  |
| result | String |  |  |  |  |
| notes | String |  |  |  |  |
| verifiedById | String |  |  |  |  |
| verifiedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| faiReport | FAIReport | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | FAIReport | faiReport | ✓ |  |

**Usage Examples:**

#### Aerospace turbine blade critical dimension

Critical dimensional characteristic for aerospace turbine blade with tight tolerance and 100% inspection requirement

```json
{
  "faiReportId": "FAI-TB-A380-001-001",
  "characteristicNumber": "001",
  "characteristicDescription": "Leading Edge Radius",
  "specification": "0.250 ± 0.005 inches",
  "toleranceType": "BILATERAL",
  "upperLimit": 0.255,
  "lowerLimit": 0.245,
  "nominalValue": 0.25,
  "measurementMethod": "CMM_MEASUREMENT",
  "measurementEquipment": "CMM-LAB-001",
  "criticalityLevel": "CRITICAL",
  "customerRequirement": "AIRBUS_SPEC_AB123",
  "samplingPlan": "100% inspection",
  "acceptanceCriteria": "All measurements within specification limits"
}
```

#### Medical device surface finish requirement

Medical device surface finish characteristic with biocompatibility impact and FDA submission requirements

```json
{
  "faiReportId": "FAI-MD-VALVE-002-001",
  "characteristicNumber": "015",
  "characteristicDescription": "Internal Surface Finish",
  "specification": "16 μin Ra maximum",
  "toleranceType": "MAXIMUM",
  "upperLimit": 16,
  "toleranceUnit": "MICROINCHES_RA",
  "measurementMethod": "SURFACE_ROUGHNESS_MEASUREMENT",
  "measurementStandard": "ASME_B46.1",
  "criticalityLevel": "MAJOR",
  "biocompatibilityImpact": true,
  "fdaRequirement": "510K_SUBMISSION_ITEM_15"
}
```

**Common Queries:**
- Generate FAI measurement plans for new parts
- Track characteristic compliance for customer deliveries
- Find critical characteristics requiring special measurement equipment

**Related Tables:** FAIReport, QualityCharacteristic, MeasurementEquipment, InspectionPlan, CustomerRequirement

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** faiReportId, characteristicNumber
- **Index:** faiReportId

---

### AuditLog

**Description:** System audit logs capturing all critical data changes, user actions, and system events for regulatory compliance and security monitoring

**Business Purpose:** Provides comprehensive audit trail for regulatory compliance, security monitoring, and data integrity verification across all manufacturing operations

**Data Governance:**
- **Data Owner:** IT Security and Compliance Teams
- **Update Frequency:** Real-time logging of all auditable events with immutable timestamp and user attribution
- **Data Retention:** 7 years minimum for regulatory compliance, permanent for critical manufacturing records
- **Security Classification:** Confidential - System audit data and security event information

**Compliance Notes:** Critical for 21 CFR Part 11, ISO 9001, and SOX compliance - must maintain complete audit trail for all regulated activities

**System Integrations:** User Management, Document Management, Security Systems, Compliance Reporting, SIEM Systems

**Fields (11):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| tableName | String | ✓ |  |  |  |
| recordId | String | ✓ |  |  |  |
| action | String | ✓ |  |  |  |
| oldValues | Json |  |  |  |  |
| newValues | Json |  |  |  |  |
| userId | String |  |  |  |  |
| ipAddress | String |  |  |  |  |
| userAgent | String |  |  |  |  |
| timestamp | DateTime | ✓ | now( |  |  |
| user | User |  |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | user |  |  |

**Usage Examples:**

#### Quality document modification audit

Critical quality document modification with complete before/after values and compliance impact assessment

```json
{
  "eventType": "DOCUMENT_MODIFIED",
  "userId": "quality_engineer_brown",
  "documentId": "QP-TB-A380-001",
  "documentType": "QUALITY_PLAN",
  "action": "SPECIFICATION_UPDATED",
  "timestamp": "2024-03-25T14:30:00Z",
  "ipAddress": "192.168.1.105",
  "sessionId": "ses_a1b2c3d4e5f6",
  "beforeValue": "Tolerance: ±0.005 inches",
  "afterValue": "Tolerance: ±0.003 inches",
  "changeReason": "Customer requirement update per ECO-2024-001234",
  "approvalRequired": true,
  "complianceImpact": "HIGH"
}
```

#### Security access violation attempt

Security violation attempt with immediate alert generation and investigation requirement

```json
{
  "eventType": "SECURITY_VIOLATION",
  "userId": "operator_invalid",
  "attemptedAction": "ACCESS_RESTRICTED_DOCUMENT",
  "resourceId": "CONFIDENTIAL_PROCESS_SPEC_001",
  "timestamp": "2024-03-25T16:45:00Z",
  "ipAddress": "192.168.1.200",
  "violationType": "INSUFFICIENT_PERMISSIONS",
  "alertGenerated": true,
  "securityResponse": "ACCESS_DENIED_LOGGED",
  "investigationRequired": true
}
```

**Common Queries:**
- Generate audit trails for regulatory compliance reports
- Track user activity for security monitoring
- Investigate data changes for compliance verification

**Related Tables:** User, SecurityEvent, Document, WorkOrder, QualityPlan

**Constraints & Indexes:**

- **Primary Key:** id

---

### MaintenanceWorkOrder

**Description:** Maintenance work orders managing preventive, corrective, and emergency maintenance activities across manufacturing equipment

**Business Purpose:** Coordinates maintenance activities to ensure equipment reliability, minimize downtime, and maintain production capability

**Data Governance:**
- **Data Owner:** Maintenance Management and Manufacturing Engineering Teams
- **Update Frequency:** Real-time updates as maintenance work is scheduled, executed, and completed
- **Data Retention:** Equipment lifetime plus 10 years for warranty and safety compliance
- **Security Classification:** Internal - Maintenance activities and equipment reliability information

**Compliance Notes:** Maintenance records required for equipment warranty, safety compliance, and regulatory maintenance documentation

**System Integrations:** CMMS Systems, Equipment Management, Work Order Management, Inventory Management

**Fields (19):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| externalWorkOrderNumber | String | ✓ |  |  |  |
| description | String | ✓ |  |  |  |
| workType | String | ✓ |  |  |  |
| status | String | ✓ |  |  |  |
| equipmentId | String |  |  |  |  |
| scheduledStart | DateTime |  |  |  |  |
| scheduledFinish | DateTime |  |  |  |  |
| actualStart | DateTime |  |  |  |  |
| actualFinish | DateTime |  |  |  |  |
| priority | Int | ✓ | 3 |  |  |
| failureCode | String |  |  |  |  |
| problemCode | String |  |  |  |  |
| causeCode | String |  |  |  |  |
| remedyCode | String |  |  |  |  |
| lastSyncedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| equipment | Equipment |  |  |  |  |

**Usage Examples:**

#### Preventive maintenance work order

Scheduled quarterly maintenance with defined timing and priority for production planning

```json
{
  "externalWorkOrderNumber": "PM-CNC001-2024-Q4",
  "description": "Quarterly preventive maintenance - CNC machining center",
  "workType": "PREVENTIVE",
  "status": "SCHEDULED",
  "equipmentId": "CNC-001",
  "scheduledStart": "2024-11-01T06:00:00Z",
  "priority": 2
}
```

#### Emergency repair work order

High-priority emergency repair with failure classification for root cause tracking

```json
{
  "externalWorkOrderNumber": "EM-CNC001-2024-1030",
  "description": "Emergency repair - spindle bearing replacement",
  "workType": "CORRECTIVE",
  "status": "IN_PROGRESS",
  "equipmentId": "CNC-001",
  "priority": 1,
  "failureCode": "MECH_BEARING"
}
```

**Common Queries:**
- Find scheduled maintenance for capacity planning
- Track maintenance completion rates and efficiency
- Generate maintenance cost reports by equipment

**Related Tables:** Equipment, User, EquipmentLog, EquipmentStateHistory

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** externalWorkOrderNumber
- **Index:** equipmentId
- **Index:** status

---

### MeasurementEquipment

**Description:** Calibrated measurement and inspection equipment with certification tracking and maintenance schedules

**Business Purpose:** Ensures measurement accuracy and regulatory compliance by managing calibration schedules, certifications, and equipment capabilities

**Data Governance:**
- **Data Owner:** Quality Engineering and Metrology Teams
- **Update Frequency:** Updated when calibrations are performed, equipment is added, or specifications change
- **Data Retention:** Permanent retention for calibration history and measurement traceability
- **Security Classification:** Internal - Measurement capability and calibration certification information

**Compliance Notes:** Critical for ISO 17025, AS9100, and FDA compliance. Calibration records required for measurement traceability

**System Integrations:** Calibration Management, Quality Management, Inspection Systems, Metrology Labs

**Fields (23):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| externalGaugeId | String |  |  |  |  |
| description | String | ✓ |  |  |  |
| manufacturer | String |  |  |  |  |
| model | String |  |  |  |  |
| serialNumber | String |  |  |  |  |
| gaugeType | String | ✓ |  |  |  |
| measurementType | String | ✓ |  |  |  |
| measurementRange | String |  |  |  |  |
| resolution | Float |  |  |  |  |
| accuracy | Float |  |  |  |  |
| location | String |  |  |  |  |
| calibrationFrequency | Int |  |  |  |  |
| lastCalibrationDate | DateTime |  |  |  |  |
| nextCalibrationDate | DateTime |  |  |  |  |
| calibrationStatus | String | ✓ | IN_CAL |  |  |
| isActive | Boolean | ✓ | true |  |  |
| lastSyncedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| inspectionRecords | InspectionRecord[] | ✓ |  |  |  |
| operationGaugeRequirements | OperationGaugeRequirement[] | ✓ |  |  |  |
| qifMeasurementResults | QIFMeasurementResult[] | ✓ |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | InspectionRecord | inspectionRecords | ✓ |  |
| one-to-many | OperationGaugeRequirement | operationGaugeRequirements | ✓ |  |
| one-to-many | QIFMeasurementResult | qifMeasurementResults | ✓ |  |

**Usage Examples:**

#### Coordinate measuring machine (CMM)

High-precision measurement equipment with defined accuracy and annual calibration requirements

```json
{
  "description": "3-axis CMM for precision dimensional inspection",
  "manufacturer": "Zeiss",
  "model": "CONTURA G2",
  "gaugeType": "CMM",
  "measurementRange": "1000x1200x800mm",
  "accuracy": "±0.001mm",
  "calibrationFrequency": "12 months"
}
```

#### Handheld measurement tool

Standard measurement tool with semi-annual calibration cycle for routine inspections

```json
{
  "description": "Digital calipers for dimensional inspection",
  "manufacturer": "Mitutoyo",
  "model": "500-196-30",
  "gaugeType": "CALIPER",
  "measurementRange": "0-200mm",
  "resolution": "0.01mm",
  "calibrationFrequency": "6 months"
}
```

**Common Queries:**
- Find equipment requiring calibration by date range
- Generate calibration certificates for customer audits
- Track measurement equipment by capability and availability

**Related Tables:** QualityInspection, QualityMeasurement, OperationGaugeRequirement

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** externalGaugeId
- **Index:** calibrationStatus
- **Index:** nextCalibrationDate

---

### InspectionRecord

**Description:** Individual inspection records capturing quality measurements and compliance data for manufactured parts and materials

**Business Purpose:** Documents quality control measurements and inspection results to ensure product conformance to specifications and regulatory requirements

**Data Governance:**
- **Data Owner:** Quality Assurance Team
- **Update Frequency:** Real-time during inspection activities and quality control processes
- **Data Retention:** Permanent retention for product traceability and regulatory compliance requirements
- **Security Classification:** Internal - Quality data with regulatory significance

**Compliance Notes:** Critical for regulatory compliance (AS9102, FDA, ISO 9001) - inspection records must be maintained for product lifetime and audit purposes

**System Integrations:** Quality Management System, Inspection Equipment, Certificate of Compliance Generation, Customer Quality Reports

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| serializedPartId | String |  |  |  |  |
| measurementEquipmentId | String |  |  |  |  |
| characteristic | String | ✓ |  |  |  |
| nominalValue | Float | ✓ |  |  |  |
| actualValue | Float | ✓ |  |  |  |
| lowerTolerance | Float | ✓ |  |  |  |
| upperTolerance | Float | ✓ |  |  |  |
| unit | String | ✓ |  |  |  |
| result | String | ✓ |  |  |  |
| inspectionDate | DateTime | ✓ | now( |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| measurementEquipment | MeasurementEquipment |  |  |  |  |
| serializedPart | SerializedPart |  |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | MeasurementEquipment | measurementEquipment |  |  |
| one-to-one | SerializedPart | serializedPart |  |  |

**Usage Examples:**

#### Aerospace part dimensional inspection with full measurement data

First article inspection for aerospace component with complete dimensional verification and acceptance

```json
{
  "inspectionId": "INS-240330-001",
  "partNumber": "WO-24-0156-BLK-001",
  "inspectionType": "FIRST_ARTICLE",
  "inspector": "M.Johnson",
  "measurementCount": 47,
  "conformingMeasurements": 47,
  "nonConformingMeasurements": 0,
  "inspectionResult": "ACCEPT"
}
```

#### Medical device biocompatibility inspection with material certification

Material certification inspection for medical implant with FDA Class III biocompatibility verification

```json
{
  "inspectionId": "INS-240330-002",
  "partNumber": "MD-IMPLANT-Ti6Al4V",
  "inspectionType": "MATERIAL_CERTIFICATION",
  "certificationLevel": "FDA_CLASS_III",
  "biocompatibilityTest": "ISO_10993",
  "inspectionResult": "ACCEPT"
}
```

**Common Queries:**
- Generate inspection reports for customer delivery packages
- Find non-conforming inspection records for corrective action
- Track inspection completion rates for production scheduling

**Related Tables:** InspectionPlan, QualityMeasurement, InspectionExecution, Part, MaterialLot

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** serializedPartId
- **Index:** measurementEquipmentId
- **Index:** result

---

### CNCProgram

**Description:** CNC machining programs and G-code management with version control and machine-specific optimization for manufacturing operations

**Business Purpose:** Manages CNC programming assets ensuring consistent machining operations, version control, and optimized machine utilization across manufacturing

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and CNC Programming Teams
- **Update Frequency:** Updated when programs are modified, optimized, or new versions are validated for production use
- **Data Retention:** Permanent retention for program validation and manufacturing repeatability
- **Security Classification:** Confidential - Proprietary manufacturing programs and process parameters

**Compliance Notes:** Program management supports traceability requirements and ensures consistent manufacturing processes for quality compliance

**System Integrations:** Equipment Management, Work Instructions, Part Programming, Tool Management, Quality Control

**Fields (27):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| externalProgramId | String |  |  |  |  |
| programName | String | ✓ |  |  |  |
| partNumber | String | ✓ |  |  |  |
| operationCode | String | ✓ |  |  |  |
| revision | String | ✓ |  |  |  |
| revisionDate | DateTime | ✓ |  |  |  |
| status | String | ✓ |  |  |  |
| machineType | String |  |  |  |  |
| postProcessor | String |  |  |  |  |
| toolList | String |  |  |  |  |
| setupSheetUrl | String |  |  |  |  |
| approvedBy | String |  |  |  |  |
| approvalDate | DateTime |  |  |  |  |
| ecoNumber | String |  |  |  |  |
| effectiveDate | DateTime |  |  |  |  |
| firstPieceRequired | Boolean | ✓ | auto |  |  |
| firstPieceApproved | Boolean | ✓ | auto |  |  |
| firstPieceDate | DateTime |  |  |  |  |
| programUrl | String |  |  |  |  |
| stepAP242Url | String |  |  |  |  |
| pmiDataUrl | String |  |  |  |  |
| teamcenterItemId | String |  |  |  |  |
| lastSyncedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| programDownloadLogs | ProgramDownloadLog[] | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | ProgramDownloadLog | programDownloadLogs | ✓ |  |

**Usage Examples:**

#### Titanium aerospace component program

Production-approved CNC program for aerospace titanium component with proven cycle time and tool requirements

```json
{
  "programNumber": "O1234",
  "programName": "TB_A380_001_ROUGH_FINISH",
  "partNumber": "TB-A380-001",
  "operation": "Rough and Finish Milling",
  "machineType": "5_AXIS_CNC_MILL",
  "machineId": "CNC-MILL-001",
  "version": "3.2",
  "versionDate": "2024-03-25T00:00:00Z",
  "programmerName": "cnc_programmer_johnson",
  "estimatedCycleTime": "45.5 minutes",
  "toolCount": 8,
  "maxSpindleSpeed": 1200,
  "coolantRequired": "HIGH_PRESSURE_THROUGH_TOOL",
  "workOffset": "G54",
  "programStatus": "PRODUCTION_APPROVED",
  "lastProvenDate": "2024-03-20T00:00:00Z"
}
```

#### Engine valve precision boring program

High-precision boring program for engine valve with strict accuracy and surface finish requirements

```json
{
  "programNumber": "O5678",
  "programName": "ENGINE_VALVE_BORE_FINISH",
  "partNumber": "ENGINE-VALVE-002",
  "operation": "Precision Boring and Chamfering",
  "machineType": "HORIZONTAL_BORING_MILL",
  "requiredAccuracy": "±0.0005 inches",
  "surfaceFinishReq": "16 microinches Ra",
  "toolingRequired": "Carbide boring bar with diamond insert",
  "programComplexity": "HIGH",
  "setupTime": "2.5 hours",
  "specialInstructions": "Temperature controlled environment required"
}
```

**Common Queries:**
- Find approved programs for specific parts and machines
- Track program version history for manufacturing consistency
- Generate program documentation for work order execution

**Related Tables:** Equipment, Part, ToolDrawing, WorkInstruction, SetupSheet

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** programName
- **Index:** partNumber
- **Index:** status
- **Index:** revision

---

### ProgramDownloadLog

**Description:** Audit trail and version control for CNC program downloads to manufacturing equipment ensuring program integrity and traceability

**Business Purpose:** Maintains complete control over CNC program deployment preventing unauthorized modifications and ensuring manufacturing consistency

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and CNC Programming Teams
- **Update Frequency:** Real-time logging of all program download events and version deployments to production equipment
- **Data Retention:** 7 years for process validation and audit support
- **Security Classification:** Internal - Manufacturing program control with competitive and security sensitivity

**Compliance Notes:** Program control critical for AS9100 process control and FDA software validation requirements - maintains immutable audit trail

**System Integrations:** CNC Equipment, Program Management Systems, Version Control, Manufacturing Execution Systems

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| programId | String |  |  |  |  |
| programName | String | ✓ |  |  |  |
| revision | String | ✓ |  |  |  |
| machineId | String | ✓ |  |  |  |
| operatorBadgeNumber | String | ✓ |  |  |  |
| workOrderNumber | String |  |  |  |  |
| downloadDate | DateTime | ✓ | now( |  |  |
| authorized | Boolean | ✓ |  |  |  |
| authorizationMethod | String | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| cncProgram | CNCProgram |  |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | CNCProgram | cncProgram |  |  |

**Usage Examples:**

#### Critical aerospace program download with version verification and authorization tracking

Authorized download of critical aerospace machining program with checksum verification and senior programmer authorization

```json
{
  "downloadLogId": "PDL-240330-001",
  "programNumber": "O1234-TURBINE-BLADE-V3",
  "programVersion": "3.2",
  "equipmentId": "CNC-MILL-001",
  "downloadTimestamp": "2024-03-30T08:30:00Z",
  "downloadedByUserId": "programmer_smith",
  "authorizationLevel": "SENIOR_PROGRAMMER",
  "workOrderNumber": "WO-24-0156",
  "programChecksum": "A5F7B2C9D8E1F3G4",
  "downloadStatus": "SUCCESS",
  "verificationRequired": true,
  "verificationCompleted": true
}
```

#### Medical device program deployment with FDA validation and digital signature requirements

FDA-validated medical device program download with digital signature and change control documentation

```json
{
  "downloadLogId": "PDL-240330-002",
  "programNumber": "O5678-IMPLANT-MILL-V2",
  "programVersion": "2.1",
  "equipmentId": "CNC-MILL-MED-001",
  "downloadTimestamp": "2024-03-30T14:15:00Z",
  "downloadedByUserId": "programmer_johnson",
  "fdaValidationRequired": true,
  "digitalSignature": "BIOMETRIC_VERIFIED",
  "validationDocument": "FDA-VAL-IMPLANT-001",
  "changeControlNumber": "CC-MED-240330-001"
}
```

**Common Queries:**
- Track program deployment history for audit purposes
- Verify current program versions on production equipment
- Generate program change control reports for compliance

**Related Tables:** CNCProgram, Equipment, User, WorkOrder, ProgramLoadAuthorization

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** programName
- **Index:** machineId
- **Index:** operatorBadgeNumber
- **Index:** downloadDate

---

### ProgramLoadAuthorization

**Description:** CNC program loading authorizations ensuring only qualified personnel can load programs to specific machines with complete audit trail

**Business Purpose:** Prevents unauthorized program changes and ensures only certified operators load programs, maintaining manufacturing integrity and safety

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and CNC Programming Teams
- **Update Frequency:** Real-time logging of all program loading attempts with authorization validation
- **Data Retention:** 3 years for manufacturing audit and operator certification validation
- **Security Classification:** Internal - Program authorization and operator certification data

**Compliance Notes:** Program authorization supports manufacturing process control and provides audit trail for quality compliance and operator certification

**System Integrations:** CNC Program Management, User Authentication, Equipment Control, Audit Systems, Training Management

**Fields (21):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| authorizationId | String | ✓ |  |  |  |
| operatorBadgeNumber | String | ✓ |  |  |  |
| machineId | String | ✓ |  |  |  |
| programName | String | ✓ |  |  |  |
| programRevision | String | ✓ |  |  |  |
| partNumber | String | ✓ |  |  |  |
| workOrderNumber | String |  |  |  |  |
| authorized | Boolean | ✓ |  |  |  |
| authorizationDate | DateTime | ✓ | now( |  |  |
| operatorAuthenticated | Boolean | ✓ |  |  |  |
| workOrderValid | Boolean | ✓ |  |  |  |
| certificationValid | Boolean | ✓ |  |  |  |
| programVersionValid | Boolean | ✓ |  |  |  |
| gaugeCalibrationValid | Boolean | ✓ |  |  |  |
| failureReasons | String |  |  |  |  |
| validationDetails | Json |  |  |  |  |
| supervisorNotified | Boolean | ✓ | auto |  |  |
| overrideReason | String |  |  |  |  |
| electronicSignature | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |

**Usage Examples:**

#### Authorized titanium machining program load

Authorized program load for certified titanium machining with complete safety verification and supervisor approval

```json
{
  "authorizationId": "PLA-240325-001",
  "programNumber": "O1234",
  "programName": "TB_A380_001_ROUGH_FINISH",
  "machineId": "CNC-MILL-001",
  "operatorId": "operator_smith",
  "operatorCertification": "CNC_TITANIUM_CERTIFIED",
  "authorizedBy": "cnc_supervisor_jones",
  "authorizedAt": "2024-03-25T08:30:00Z",
  "loadedAt": "2024-03-25T08:45:00Z",
  "authorizationStatus": "APPROVED",
  "workOrderId": "WO-240325-001",
  "partNumber": "TB-A380-001",
  "programVersion": "3.2",
  "safetyChecksCompleted": true,
  "toolListVerified": true,
  "fixtureVerified": true
}
```

#### Rejected program load attempt

Rejected program load attempt due to insufficient operator certification with training recommendation and supervisor notification

```json
{
  "authorizationId": "PLA-240325-010",
  "programNumber": "O5678",
  "machineId": "CNC-MILL-002",
  "operatorId": "operator_trainee",
  "attemptedAt": "2024-03-25T14:15:00Z",
  "authorizationStatus": "REJECTED",
  "rejectionReason": "Operator not certified for high-precision programs",
  "requiredCertification": "PRECISION_MACHINING_ADVANCED",
  "operatorCurrentLevel": "BASIC_CNC_CERTIFIED",
  "supervisorNotified": "cnc_supervisor_martinez",
  "trainingRecommended": "Advanced precision machining certification course",
  "alertGenerated": true
}
```

**Common Queries:**
- Validate operator authorization before program loading
- Generate program loading audit reports for compliance
- Track unauthorized access attempts for security monitoring

**Related Tables:** CNCProgram, Equipment, User, PersonnelCertification, WorkOrder

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** authorizationId
- **Index:** operatorBadgeNumber
- **Index:** machineId
- **Index:** authorized
- **Index:** authorizationDate

---

### OperationGaugeRequirement

**Description:** Measurement equipment and gauge requirements for specific manufacturing operations ensuring proper inspection capability and measurement traceability

**Business Purpose:** Guarantees correct measurement equipment is available and calibrated for quality control activities, supporting traceability and measurement accuracy

**Data Governance:**
- **Data Owner:** Quality Engineering and Manufacturing Engineering Teams
- **Update Frequency:** Updated when measurement requirements change, new equipment is qualified, or calibration procedures are modified
- **Data Retention:** Permanent retention for measurement traceability and quality validation
- **Security Classification:** Internal - Measurement requirements and quality specifications

**Compliance Notes:** Gauge requirements critical for ISO 9001 measurement traceability and AS9102 FAI measurement system requirements

**System Integrations:** Quality Management, Equipment Management, Calibration Systems, Measurement Systems, Work Instructions

**Fields (7):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| partNumber | String | ✓ |  |  |  |
| operationCode | String | ✓ |  |  |  |
| measurementEquipmentId | String | ✓ |  |  |  |
| required | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| measurementEquipment | MeasurementEquipment | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | MeasurementEquipment | measurementEquipment | ✓ |  |

**Usage Examples:**

#### Precision machining gauge requirement

Critical CMM measurement requirement for aerospace component with tight accuracy and calibration traceability

```json
{
  "partNumber": "TB-A380-001",
  "operationCode": "OP-MILL-001",
  "gaugeType": "CMM_MEASUREMENT",
  "requiredAccuracy": "±0.0001",
  "accuracyUnit": "INCHES",
  "measurementEquipmentId": "CMM-LAB-001",
  "calibrationRequired": true,
  "calibrationInterval": 12,
  "intervalUnit": "MONTHS",
  "measurementStandard": "ASME_Y14.5",
  "traceabilityRequired": true,
  "isRequired": true
}
```

#### Surface finish gauge requirement

Surface finish measurement requirement for engine valve with specific roughness range and sampling protocol

```json
{
  "partNumber": "ENGINE-VALVE-002",
  "operationCode": "OP-FINISH-001",
  "gaugeType": "SURFACE_ROUGHNESS",
  "requiredRange": "0.1 to 6.3",
  "rangeUnit": "MICROMETERS_RA",
  "measurementEquipmentId": "SURF-ROUGH-001",
  "measurementStandard": "ISO_4287",
  "samplingRequired": true,
  "sampleSize": 3
}
```

**Common Queries:**
- Find required gauges for work order operations
- Validate measurement equipment availability for production
- Generate calibration schedules for operation-specific equipment

**Related Tables:** Part, Operation, MeasurementEquipment, QualityCharacteristic, InspectionPlan

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** partNumber, operationCode, measurementEquipmentId
- **Index:** partNumber
- **Index:** operationCode

---

### Alert

**Description:** System alerts and notifications for real-time monitoring of manufacturing operations, quality exceptions, and equipment status

**Business Purpose:** Enables immediate response to manufacturing exceptions through automated alerting, ensuring operational continuity and quality compliance

**Data Governance:**
- **Data Owner:** Production Control and IT Operations Teams
- **Update Frequency:** Real-time generation based on system events, threshold violations, and predefined alert conditions
- **Data Retention:** 6 months for alert pattern analysis and system optimization
- **Security Classification:** Internal - Operational alerts and system monitoring data

**Compliance Notes:** Alert systems support regulatory requirements for immediate response to quality and safety exceptions

**System Integrations:** Production Monitoring, Quality Systems, Equipment Management, Notification Systems, Dashboard Systems

**Fields (10):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| alertType | String | ✓ |  |  |  |
| severity | String | ✓ |  |  |  |
| message | String | ✓ |  |  |  |
| details | Json |  |  |  |  |
| resolved | Boolean | ✓ | auto |  |  |
| resolvedBy | String |  |  |  |  |
| resolvedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |

**Usage Examples:**

#### SPC violation alert

High-severity SPC violation alert with specific rule violation, recommended actions, and personnel notification tracking

```json
{
  "alertId": "ALT-240325-001",
  "alertType": "SPC_VIOLATION",
  "severity": "HIGH",
  "title": "Control Chart Violation - Surface Roughness",
  "description": "7 consecutive points above center line detected in surface roughness measurements",
  "source": "CNC-MILL-001",
  "triggeredAt": "2024-03-25T14:30:00Z",
  "workOrderId": "WO-240325-001",
  "partNumber": "TB-A380-001",
  "characteristic": "SURFACE_ROUGHNESS",
  "violationRule": "7_CONSECUTIVE_ABOVE_CENTER",
  "recommendedAction": "Stop production, investigate process parameters, adjust cutting conditions",
  "notifiedPersonnel": [
    "operator_smith",
    "quality_supervisor_martinez"
  ],
  "status": "ACTIVE",
  "acknowledgedBy": "quality_supervisor_martinez",
  "acknowledgedAt": "2024-03-25T14:35:00Z"
}
```

#### Equipment maintenance alert

Equipment maintenance alert with impact assessment and scheduling information for proactive maintenance planning

```json
{
  "alertId": "ALT-240325-015",
  "alertType": "EQUIPMENT_MAINTENANCE",
  "severity": "MEDIUM",
  "title": "Preventive Maintenance Due - CMM Calibration",
  "description": "CMM-LAB-001 calibration due within 48 hours",
  "source": "CMM-LAB-001",
  "triggeredAt": "2024-03-25T08:00:00Z",
  "maintenanceType": "CALIBRATION",
  "dueDate": "2024-03-27T17:00:00Z",
  "estimatedDowntime": "4 hours",
  "impactedOperations": [
    "Dimensional inspection",
    "FAI measurements"
  ],
  "maintenanceProvider": "CALIBRATION_LAB_CERTIFIED",
  "status": "SCHEDULED",
  "scheduledMaintenanceDate": "2024-03-26T18:00:00Z"
}
```

**Common Queries:**
- Monitor active alerts for real-time dashboard display
- Generate alert summary reports for management review
- Track alert response times for process improvement

**Related Tables:** Equipment, QualityMeasurement, SPCConfiguration, User, MaintenanceSchedule

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** alertType
- **Index:** severity
- **Index:** resolved
- **Index:** createdAt

---

### IntegrationConfig

**Description:** Integration configuration settings for external system connections including ERP, quality systems, and third-party manufacturing applications

**Business Purpose:** Enables seamless data exchange and process automation between MES and external systems for comprehensive manufacturing integration

**Data Governance:**
- **Data Owner:** IT Systems and Integration Teams
- **Update Frequency:** Updated when integration requirements change, system upgrades occur, or new external systems are connected
- **Data Retention:** 5 years for integration audit and system validation
- **Security Classification:** Confidential - System integration and security configuration information

**Compliance Notes:** Integration configurations support audit trails and data integrity requirements for regulatory compliance and system validation

**System Integrations:** ERP Systems, Quality Management Systems, PLM Systems, External Databases, Web Services

**Fields (21):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| name | String | ✓ |  |  |  |
| displayName | String | ✓ |  |  |  |
| type | IntegrationType | ✓ |  |  |  |
| enabled | Boolean | ✓ | true |  |  |
| config | Json | ✓ |  |  |  |
| lastSync | DateTime |  |  |  |  |
| lastSyncStatus | String |  |  |  |  |
| lastError | String |  |  |  |  |
| errorCount | Int | ✓ | auto |  |  |
| totalSyncs | Int | ✓ | auto |  |  |
| successCount | Int | ✓ | auto |  |  |
| failureCount | Int | ✓ | auto |  |  |
| syncSchedule | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| erpMaterialTransactions | ERPMaterialTransaction[] | ✓ |  |  |  |
| logs | IntegrationLog[] | ✓ |  |  |  |
| personnelInfoExchanges | PersonnelInfoExchange[] | ✓ |  |  |  |
| productionPerformanceActuals | ProductionPerformanceActual[] | ✓ |  |  |  |
| productionScheduleRequests | ProductionScheduleRequest[] | ✓ |  |  |  |
**Relationships (4):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | ERPMaterialTransaction | erpMaterialTransactions | ✓ |  |
| one-to-many | PersonnelInfoExchange | personnelInfoExchanges | ✓ |  |
| one-to-many | ProductionPerformanceActual | productionPerformanceActuals | ✓ |  |
| one-to-many | ProductionScheduleRequest | productionScheduleRequests | ✓ |  |

**Usage Examples:**

#### SAP ERP integration configuration

Real-time bidirectional integration with SAP ERP for production order synchronization with OAuth2 security

```json
{
  "configName": "SAP_ERP_Production_Orders",
  "integrationType": "ERP_INTEGRATION",
  "direction": "BIDIRECTIONAL",
  "sourceSystem": "MES",
  "targetSystem": "SAP_ERP",
  "connectionString": "https://sap.company.com/api/v2/production",
  "authenticationMethod": "OAUTH2",
  "dataFormat": "JSON",
  "syncFrequency": "REAL_TIME",
  "batchSize": 100,
  "retryAttempts": 3,
  "timeout": 30,
  "timeoutUnit": "SECONDS",
  "isActive": true,
  "lastSyncTimestamp": "2024-03-25T14:30:00Z"
}
```

#### Quality system integration

Quality system integration for automatic inspection results transfer with data mapping and error handling

```json
{
  "configName": "QMS_Inspection_Results",
  "integrationType": "QUALITY_INTEGRATION",
  "direction": "OUTBOUND",
  "targetSystem": "QUALITY_MANAGEMENT_SYSTEM",
  "dataMapping": {
    "inspectionId": "inspection_number",
    "partNumber": "part_id",
    "inspectionResults": "measurement_data",
    "inspectorId": "inspector_name"
  },
  "triggerEvent": "INSPECTION_COMPLETE",
  "dataTransformation": "XML_TO_JSON",
  "errorHandling": "LOG_AND_RETRY"
}
```

**Common Queries:**
- Monitor integration performance and error rates
- Configure new system connections and data mappings
- Generate integration audit reports for compliance

**Related Tables:** IntegrationLog, SystemCredentials, DataMapping, ExternalSystem, IntegrationSchedule

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** name
- **Index:** type
- **Index:** enabled

---

### IntegrationLog

**Description:** Integration transaction logs capturing data exchanges between MES and external systems with error tracking and performance monitoring

**Business Purpose:** Ensures reliable system integration by logging all data exchanges, tracking errors, and providing diagnostics for continuous system optimization

**Data Governance:**
- **Data Owner:** IT Systems and Integration Teams
- **Update Frequency:** Real-time logging of all integration transactions with automatic error detection and alerting
- **Data Retention:** 2 years for integration performance analysis and system troubleshooting
- **Security Classification:** Internal - System integration logs and performance data

**Compliance Notes:** Integration logs provide audit trail for data integrity and system validation required for regulatory compliance

**System Integrations:** ERP Systems, Quality Management Systems, PLM Systems, External Databases, Monitoring Systems

**Fields (17):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| configId | String | ✓ |  |  |  |
| operation | String | ✓ |  |  |  |
| direction | IntegrationDirection | ✓ |  |  |  |
| status | IntegrationLogStatus | ✓ |  |  |  |
| recordCount | Int | ✓ | auto |  |  |
| successCount | Int | ✓ | auto |  |  |
| errorCount | Int | ✓ | auto |  |  |
| duration | Int | ✓ |  |  |  |
| requestData | Json |  |  |  |  |
| responseData | Json |  |  |  |  |
| errors | Json |  |  |  |  |
| details | Json |  |  |  |  |
| startedAt | DateTime | ✓ | now( |  |  |
| completedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| config | IntegrationConfig | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | IntegrationConfig | config | ✓ |  |

**Usage Examples:**

#### Successful ERP work order sync

Successful ERP integration transaction updating work order status with performance metrics and payload details

```json
{
  "integrationConfigId": "SAP_ERP_Production_Orders",
  "transactionId": "TXN-240325-001234",
  "direction": "OUTBOUND",
  "operation": "WORK_ORDER_UPDATE",
  "sourceSystem": "MES",
  "targetSystem": "SAP_ERP",
  "transactionTimestamp": "2024-03-25T14:30:00Z",
  "status": "SUCCESS",
  "recordsProcessed": 15,
  "processingTimeMs": 245,
  "dataPayload": {
    "workOrders": [
      "WO-240325-001",
      "WO-240325-002"
    ],
    "operation": "STATUS_UPDATE",
    "newStatus": "COMPLETED"
  },
  "responseCode": "200_OK"
}
```

#### Failed quality system integration

Failed integration transaction with detailed error information, retry logic, and impact assessment for rapid resolution

```json
{
  "integrationConfigId": "QMS_Inspection_Results",
  "transactionId": "TXN-240325-005678",
  "direction": "OUTBOUND",
  "operation": "INSPECTION_RESULT_TRANSFER",
  "transactionTimestamp": "2024-03-25T16:45:00Z",
  "status": "FAILED",
  "errorCode": "TIMEOUT_ERROR",
  "errorMessage": "Connection timeout after 30 seconds",
  "retryAttempt": 2,
  "maxRetries": 3,
  "nextRetryTimestamp": "2024-03-25T17:00:00Z",
  "alertGenerated": true,
  "impactAssessment": "Quality data not synchronized - manual intervention required"
}
```

**Common Queries:**
- Monitor integration success rates for system reliability
- Troubleshoot failed transactions for rapid resolution
- Generate integration performance reports for system optimization

**Related Tables:** IntegrationConfig, SystemAlert, ExternalSystem, ErrorLog, PerformanceMetric

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configId
- **Index:** status
- **Index:** startedAt
- **Index:** operation

---

### ProductionScheduleRequest

**Description:** External production scheduling requests from ERP systems or planning applications requiring MES validation and capacity confirmation

**Business Purpose:** Integrates external production planning with MES capabilities by validating schedule feasibility and resource availability

**Data Governance:**
- **Data Owner:** Production Planning and Systems Integration Teams
- **Update Frequency:** Real-time creation as external systems submit production schedule requests requiring MES validation
- **Data Retention:** 3 years for planning analysis and integration audit trails
- **Security Classification:** Internal - Production planning and capacity requests

**Compliance Notes:** Schedule requests provide audit trail for production planning decisions and capacity allocation validation

**System Integrations:** ERP Systems, Production Planning, Capacity Management, Resource Allocation, Schedule Optimization

**Fields (33):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| messageId | String | ✓ |  |  |  |
| configId | String | ✓ |  |  |  |
| scheduleType | ScheduleType | ✓ |  |  |  |
| priority | SchedulePriority | ✓ |  |  |  |
| requestedBy | String | ✓ |  |  |  |
| requestedDate | DateTime | ✓ | now( |  |  |
| effectiveStartDate | DateTime | ✓ |  |  |  |
| effectiveEndDate | DateTime | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| externalWorkOrderId | String | ✓ |  |  |  |
| partId | String |  |  |  |  |
| partNumber | String |  |  |  |  |
| quantity | Float | ✓ |  |  |  |
| unitOfMeasure | String | ✓ |  |  |  |
| dueDate | DateTime | ✓ |  |  |  |
| workCenterId | String |  |  |  |  |
| equipmentRequirements | Json |  |  |  |  |
| personnelRequirements | Json |  |  |  |  |
| materialRequirements | Json |  |  |  |  |
| status | B2MMessageStatus | ✓ |  |  |  |
| processedAt | DateTime |  |  |  |  |
| errorMessage | String |  |  |  |  |
| validationErrors | Json |  |  |  |  |
| requestPayload | Json | ✓ |  |  |  |
| responsePayload | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| config | IntegrationConfig | ✓ |  |  |  |
| part | Part |  |  |  |  |
| workCenter | Equipment |  |  |  |  |
| workOrder | WorkOrder |  |  |  |  |
| response | ProductionScheduleResponse |  |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | IntegrationConfig | config | ✓ |  |
| one-to-one | Part | part |  |  |
| one-to-one | ProductionScheduleResponse | response |  |  |

**Usage Examples:**

#### ERP work order schedule request

High-priority ERP schedule request for aerospace turbine blade production requiring specialized operator capability

```json
{
  "requestId": "PSR-240325-001",
  "sourceSystem": "SAP_ERP",
  "requestType": "WORK_ORDER_SCHEDULE",
  "workOrderId": "WO-240325-001",
  "requestedStartDate": "2024-03-26T08:00:00Z",
  "requestedCompletionDate": "2024-03-28T17:00:00Z",
  "priority": "HIGH",
  "quantity": 50,
  "partNumber": "TB-A380-001",
  "workCenterRequested": "CNC-MACHINING-001",
  "specialRequirements": "Titanium certified operator required",
  "status": "PENDING_VALIDATION"
}
```

#### Capacity validation request

Weekly capacity validation request across multiple work centers for production planning optimization

```json
{
  "requestId": "PSR-240325-010",
  "sourceSystem": "PRODUCTION_PLANNER",
  "requestType": "CAPACITY_VALIDATION",
  "timeHorizon": "WEEKLY",
  "startDate": "2024-04-01T00:00:00Z",
  "endDate": "2024-04-07T23:59:59Z",
  "workCenters": [
    "CNC-MACHINING-001",
    "ASSEMBLY-001",
    "INSPECTION-001"
  ],
  "requestedCapacity": 168,
  "capacityUnit": "HOURS"
}
```

**Common Queries:**
- Process incoming schedule requests for validation
- Track request response times for integration performance
- Generate capacity analysis reports for planning optimization

**Related Tables:** ProductionSchedule, WorkOrder, WorkCenter, ProductionScheduleResponse, CapacityPlan

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configId
- **Index:** status
- **Index:** externalWorkOrderId
- **Index:** requestedDate

---

### ProductionScheduleResponse

**Description:** MES responses to external production scheduling requests confirming feasibility, proposing alternatives, or rejecting infeasible schedules

**Business Purpose:** Provides feedback to external planning systems on schedule feasibility with confirmed dates, capacity constraints, and alternative proposals

**Data Governance:**
- **Data Owner:** Production Planning and Systems Integration Teams
- **Update Frequency:** Generated in response to ProductionScheduleRequest validation with confirmed schedules or constraint explanations
- **Data Retention:** 3 years for planning analysis and integration performance tracking
- **Security Classification:** Internal - Production schedule confirmations and capacity commitments

**Compliance Notes:** Schedule responses provide audit trail for production planning decisions and capacity allocation commitments

**System Integrations:** ERP Systems, Production Planning, Capacity Management, Schedule Optimization, Resource Allocation

**Fields (20):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| requestId | String | ✓ |  |  |  |
| messageId | String | ✓ |  |  |  |
| accepted | Boolean | ✓ |  |  |  |
| confirmedStartDate | DateTime |  |  |  |  |
| confirmedEndDate | DateTime |  |  |  |  |
| confirmedQuantity | Float |  |  |  |  |
| rejectionReason | String |  |  |  |  |
| modifications | Json |  |  |  |  |
| constraints | Json |  |  |  |  |
| proposedStartDate | DateTime |  |  |  |  |
| proposedEndDate | DateTime |  |  |  |  |
| proposedQuantity | Float |  |  |  |  |
| respondedBy | String | ✓ |  |  |  |
| respondedAt | DateTime | ✓ | now( |  |  |
| sentToERP | Boolean | ✓ | auto |  |  |
| sentAt | DateTime |  |  |  |  |
| responsePayload | Json | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| request | ProductionScheduleRequest | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | ProductionScheduleRequest | request | ✓ |  |

**Usage Examples:**

#### Schedule confirmation response

Confirmed schedule response with specific resource allocations and timing estimates for aerospace production

```json
{
  "responseId": "PSP-240325-001",
  "requestId": "PSR-240325-001",
  "responseType": "CONFIRMED",
  "confirmedStartDate": "2024-03-26T08:00:00Z",
  "confirmedCompletionDate": "2024-03-28T16:30:00Z",
  "allocatedWorkCenter": "CNC-MACHINING-001",
  "allocatedOperator": "operator_smith",
  "confirmedQuantity": 50,
  "estimatedSetupTime": "2.5 hours",
  "estimatedCycleTime": "45 minutes per part",
  "responseTimestamp": "2024-03-25T14:30:00Z"
}
```

#### Alternative schedule proposal

Alternative schedule proposal when original request cannot be accommodated with detailed reasoning and recommendations

```json
{
  "responseId": "PSP-240325-015",
  "requestId": "PSR-240325-015",
  "responseType": "ALTERNATIVE_PROPOSED",
  "rejectionReason": "Requested operator not available during specified timeframe",
  "alternativeStartDate": "2024-03-27T08:00:00Z",
  "alternativeCompletionDate": "2024-03-29T17:00:00Z",
  "alternativeWorkCenter": "CNC-MACHINING-002",
  "capacityImpact": "No impact to other scheduled work orders",
  "recommendationNotes": "Alternative work center has equivalent capability and certified operator available"
}
```

**Common Queries:**
- Track schedule response accuracy for integration performance
- Generate capacity utilization reports from confirmed schedules
- Analyze rejection patterns for capacity planning improvements

**Related Tables:** ProductionScheduleRequest, ProductionSchedule, WorkCenter, User, CapacityPlan

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** requestId
- **Index:** respondedAt

---

### ProductionPerformanceActual

**Description:** Actual production performance data captured from manufacturing operations for ERP integration and performance analysis

**Business Purpose:** Provides real-time production visibility to ERP systems enabling accurate cost tracking, capacity planning, and operational decision making

**Data Governance:**
- **Data Owner:** Production Control and ERP Integration Teams
- **Update Frequency:** Real-time capture as operations complete with periodic synchronization to ERP systems
- **Data Retention:** 3 years for financial analysis and operational benchmarking
- **Security Classification:** Internal - Production performance and cost data with competitive sensitivity

**Compliance Notes:** Production actuals support cost accounting accuracy and provide data for regulatory reporting and customer delivery commitments

**System Integrations:** ERP Systems, Production Scheduling, Cost Accounting, Performance Analytics, Customer Reporting

**Fields (39):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| messageId | String | ✓ |  |  |  |
| configId | String | ✓ |  |  |  |
| workOrderId | String | ✓ |  |  |  |
| externalWorkOrderId | String | ✓ |  |  |  |
| operationId | String |  |  |  |  |
| reportingPeriodStart | DateTime | ✓ |  |  |  |
| reportingPeriodEnd | DateTime | ✓ |  |  |  |
| quantityProduced | Float | ✓ |  |  |  |
| quantityGood | Float | ✓ |  |  |  |
| quantityScrap | Float | ✓ |  |  |  |
| quantityRework | Float | ✓ |  |  |  |
| yieldPercentage | Float |  |  |  |  |
| setupTimeActual | Float |  |  |  |  |
| runTimeActual | Float |  |  |  |  |
| downtimeActual | Float |  |  |  |  |
| laborHoursActual | Float |  |  |  |  |
| laborCostActual | Float |  |  |  |  |
| materialCostActual | Float |  |  |  |  |
| overheadCostActual | Float |  |  |  |  |
| totalCostActual | Float |  |  |  |  |
| quantityVariance | Float |  |  |  |  |
| timeVariance | Float |  |  |  |  |
| costVariance | Float |  |  |  |  |
| efficiencyVariance | Float |  |  |  |  |
| personnelActuals | Json |  |  |  |  |
| equipmentActuals | Json |  |  |  |  |
| materialActuals | Json |  |  |  |  |
| status | B2MMessageStatus | ✓ |  |  |  |
| sentToERP | Boolean | ✓ | auto |  |  |
| sentAt | DateTime |  |  |  |  |
| erpConfirmation | String |  |  |  |  |
| errorMessage | String |  |  |  |  |
| messagePayload | Json | ✓ |  |  |  |
| createdBy | String | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| config | IntegrationConfig | ✓ |  |  |  |
| workOrder | WorkOrder | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | IntegrationConfig | config | ✓ |  |

**Usage Examples:**

#### Aerospace machining performance actual

Complete aerospace machining actual performance with cost breakdown and variance analysis for ERP integration

```json
{
  "workOrderId": "WO-240325-001",
  "operationId": "OP-MILL-001",
  "partNumber": "TB-A380-001",
  "actualStartTime": "2024-03-25T09:15:00Z",
  "actualEndTime": "2024-03-25T15:45:00Z",
  "actualLaborHours": 6.5,
  "actualMachineHours": 6.5,
  "actualQuantityProduced": 50,
  "actualQuantityGood": 48,
  "actualQuantityScrap": 2,
  "actualMaterialCost": 1375.5,
  "actualLaborCost": 455,
  "actualOverheadCost": 286.25,
  "totalActualCost": 2116.75,
  "varianceFromStandard": 116.75,
  "operatorId": "operator_smith",
  "machineId": "CNC-MILL-001"
}
```

#### Assembly line performance actual

Assembly line performance actual showing cycle time variance and efficiency metrics for continuous improvement

```json
{
  "workOrderId": "WO-240325-015",
  "operationId": "OP-ASSEMBLY-001",
  "actualStartTime": "2024-03-25T07:00:00Z",
  "actualEndTime": "2024-03-25T15:30:00Z",
  "actualCycleTime": 47.5,
  "standardCycleTime": 45,
  "efficiencyPercent": 94.7,
  "throughputActual": 16,
  "throughputStandard": 16.9,
  "qualityYield": 98.5,
  "downtimeMinutes": 15,
  "downtimeReason": "Tool change - scheduled maintenance"
}
```

**Common Queries:**
- Generate production actuals for ERP cost roll-up
- Track actual vs. standard performance for efficiency analysis
- Calculate labor and machine utilization for capacity planning

**Related Tables:** WorkOrder, Operation, Equipment, User, ProductionVariance

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configId
- **Index:** workOrderId
- **Index:** externalWorkOrderId
- **Index:** status
- **Index:** sentToERP
- **Index:** reportingPeriodStart

---

### ERPMaterialTransaction

**Description:** Integration transactions with ERP systems for material movements, consumption, and inventory synchronization across enterprise systems

**Business Purpose:** Maintains data synchronization between MES and ERP systems ensuring consistent material information across the enterprise

**Data Governance:**
- **Data Owner:** IT Integration and Materials Management Teams
- **Update Frequency:** Real-time or scheduled batch processing as material transactions occur in manufacturing operations
- **Data Retention:** 7 years for financial audit requirements and system integration validation
- **Security Classification:** Internal - Integration data with financial and operational implications

**Compliance Notes:** Integration data required for financial reconciliation, inventory accuracy, and audit trail compliance

**System Integrations:** ERP Systems, Financial Management, Inventory Control, Cost Accounting

**Fields (32):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| messageId | String | ✓ |  |  |  |
| configId | String | ✓ |  |  |  |
| transactionType | ERPTransactionType | ✓ |  |  |  |
| direction | IntegrationDirection | ✓ |  |  |  |
| transactionDate | DateTime | ✓ | now( |  |  |
| partId | String |  |  |  |  |
| externalPartId | String | ✓ |  |  |  |
| fromLocation | String |  |  |  |  |
| toLocation | String |  |  |  |  |
| workOrderId | String |  |  |  |  |
| externalWorkOrderId | String |  |  |  |  |
| quantity | Float | ✓ |  |  |  |
| unitOfMeasure | String | ✓ |  |  |  |
| lotNumber | String |  |  |  |  |
| serialNumber | String |  |  |  |  |
| unitCost | Float |  |  |  |  |
| totalCost | Float |  |  |  |  |
| currency | String |  | USD |  |  |
| movementType | String | ✓ |  |  |  |
| reasonCode | String |  |  |  |  |
| status | B2MMessageStatus | ✓ |  |  |  |
| processedAt | DateTime |  |  |  |  |
| erpTransactionId | String |  |  |  |  |
| errorMessage | String |  |  |  |  |
| messagePayload | Json | ✓ |  |  |  |
| createdBy | String | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| config | IntegrationConfig | ✓ |  |  |  |
| part | Part |  |  |  |  |
| workOrder | WorkOrder |  |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | IntegrationConfig | config | ✓ |  |
| one-to-one | Part | part |  |  |

**Usage Examples:**

#### Material consumption transaction to ERP

Material consumption synchronized with ERP for cost accounting and inventory management

```json
{
  "messageId": "MSG-MAT-CONS-240325-001",
  "transactionType": "MATERIAL_CONSUMPTION",
  "direction": "OUTBOUND",
  "externalPartId": "ERP-TI-6AL-4V-001",
  "fromLocation": "WAREHOUSE-A",
  "toLocation": "WIP",
  "workOrderId": "WO-2024-001234",
  "quantity": 25.5,
  "unitCost": 125.5,
  "status": "PROCESSED"
}
```

#### Material receipt transaction from ERP

Material receipt from supplier processed through ERP integration for inventory update

```json
{
  "messageId": "MSG-MAT-RCPT-240326-001",
  "transactionType": "MATERIAL_RECEIPT",
  "direction": "INBOUND",
  "externalPartId": "ERP-AL-2024-001",
  "toLocation": "INCOMING-INSPECTION",
  "quantity": 100,
  "lotNumber": "LOT-AL-240326-002",
  "status": "PENDING",
  "movementType": "PURCHASE_RECEIPT"
}
```

**Common Queries:**
- Track ERP synchronization status for material transactions
- Generate integration reports for system reconciliation
- Monitor failed transactions requiring manual intervention

**Related Tables:** MaterialLot, WorkOrder, IntegrationConfig

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configId
- **Index:** transactionType
- **Index:** status
- **Index:** externalPartId
- **Index:** transactionDate

---

### PersonnelInfoExchange

**Description:** Data synchronization and integration records for personnel information exchange between MES and external HR/payroll systems

**Business Purpose:** Ensures accurate and timely personnel data synchronization enabling workforce management and regulatory compliance across systems

**Data Governance:**
- **Data Owner:** Human Resources and IT Integration Teams
- **Update Frequency:** Real-time synchronization events and scheduled batch updates for personnel data exchange
- **Data Retention:** 7 years for audit purposes and employee lifecycle management
- **Security Classification:** Confidential - Contains PII and requires strict access control

**Compliance Notes:** Personnel data exchange must comply with data privacy regulations and maintain audit trail for HR compliance

**System Integrations:** HR Management Systems, Payroll Systems, Badge Access Systems, Training Management

**Fields (29):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| messageId | String | ✓ |  |  |  |
| configId | String | ✓ |  |  |  |
| personnelId | String |  |  |  |  |
| externalPersonnelId | String | ✓ |  |  |  |
| actionType | PersonnelActionType | ✓ |  |  |  |
| direction | IntegrationDirection | ✓ |  |  |  |
| firstName | String |  |  |  |  |
| lastName | String |  |  |  |  |
| email | String |  |  |  |  |
| employeeNumber | String |  |  |  |  |
| department | String |  |  |  |  |
| jobTitle | String |  |  |  |  |
| skills | Json |  |  |  |  |
| certifications | Json |  |  |  |  |
| qualifications | Json |  |  |  |  |
| shiftCode | String |  |  |  |  |
| workCalendar | String |  |  |  |  |
| availableFrom | DateTime |  |  |  |  |
| availableTo | DateTime |  |  |  |  |
| employmentStatus | String |  |  |  |  |
| lastWorkDate | DateTime |  |  |  |  |
| status | B2MMessageStatus | ✓ |  |  |  |
| processedAt | DateTime |  |  |  |  |
| errorMessage | String |  |  |  |  |
| messagePayload | Json | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| config | IntegrationConfig | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | IntegrationConfig | config | ✓ |  |

**Usage Examples:**

#### New employee onboarding data synchronization with MES system integration

Successful new employee data synchronization from HR system to MES with skill and access permission mapping

```json
{
  "exchangeId": "PIE-240330-001",
  "exchangeType": "NEW_EMPLOYEE_ONBOARDING",
  "employeeNumber": "EMP-007890",
  "exchangeTimestamp": "2024-03-30T09:00:00Z",
  "sourceSystem": "HR_WORKDAY",
  "targetSystem": "MES_PRODUCTION",
  "dataElements": [
    "Employee profile",
    "Skill certifications",
    "Access permissions"
  ],
  "exchangeStatus": "SUCCESS",
  "recordsProcessed": 1,
  "validationPassed": true,
  "integrationUser": "hr_integration_service"
}
```

#### Certification update synchronization with training system integration and validation

Training system certification update automatically synchronized to MES with workflow trigger for operation authorization updates

```json
{
  "exchangeId": "PIE-240330-002",
  "exchangeType": "CERTIFICATION_UPDATE",
  "employeeNumber": "EMP-001234",
  "exchangeTimestamp": "2024-03-30T16:30:00Z",
  "sourceSystem": "TRAINING_LMS",
  "targetSystem": "MES_PRODUCTION",
  "certificationData": {
    "certificationType": "CNC_ADVANCED_MACHINING",
    "certificationDate": "2024-03-30",
    "expirationDate": "2026-03-30",
    "certifyingBody": "NIMS"
  },
  "exchangeStatus": "SUCCESS",
  "workflowTriggered": "UPDATE_OPERATION_AUTHORIZATIONS"
}
```

**Common Queries:**
- Track personnel data synchronization for audit purposes
- Monitor integration failures for data consistency
- Generate compliance reports for HR data management

**Related Tables:** User, PersonnelCertification, IntegrationLog, PersonnelQualification

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configId
- **Index:** actionType
- **Index:** status
- **Index:** externalPersonnelId
- **Index:** personnelId

---

### EquipmentDataCollection

**Description:** Real-time data collection from manufacturing equipment capturing process parameters, sensor readings, and operational metrics for analysis and control

**Business Purpose:** Enables real-time monitoring, process optimization, and quality control through comprehensive equipment data collection and analysis

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Automation Teams
- **Update Frequency:** Real-time data collection as equipment operates and sensors generate data points
- **Data Retention:** 1 year for operational data, 7 years for quality-critical measurements, permanent for validation studies
- **Security Classification:** Internal - Manufacturing process data with competitive and operational sensitivity

**Compliance Notes:** Data collection required for process validation, statistical process control, and regulatory compliance documentation

**System Integrations:** Equipment Controllers, Process Control Systems, SPC Analytics, Predictive Maintenance

**Fields (21):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| equipmentId | String | ✓ |  |  |  |
| dataCollectionType | DataCollectionType | ✓ |  |  |  |
| collectionTimestamp | DateTime | ✓ | now( |  |  |
| dataPointName | String | ✓ |  |  |  |
| dataPointId | String |  |  |  |  |
| numericValue | Float |  |  |  |  |
| stringValue | String |  |  |  |  |
| booleanValue | Boolean |  |  |  |  |
| jsonValue | Json |  |  |  |  |
| unitOfMeasure | String |  |  |  |  |
| quality | String |  |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| productionRunId | String |  |  |  |  |
| equipmentState | String |  |  |  |  |
| protocol | String |  |  |  |  |
| sourceAddress | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| equipment | Equipment | ✓ |  |  |  |
| workOrder | WorkOrder |  |  |  |  |

**Usage Examples:**

#### CNC machine parameter monitoring

Real-time spindle speed monitoring during active machining operation with work order context

```json
{
  "equipmentId": "CNC-001",
  "dataCollectionType": "PROCESS_PARAMETER",
  "dataPointName": "Spindle Speed",
  "numericValue": 1850.5,
  "unitOfMeasure": "RPM",
  "workOrderId": "WO-2024-001234",
  "equipmentState": "RUNNING"
}
```

#### Temperature sensor data collection

Critical temperature monitoring with data quality assessment and communication protocol tracking

```json
{
  "equipmentId": "FURNACE-001",
  "dataCollectionType": "SENSOR_READING",
  "dataPointName": "Chamber Temperature",
  "numericValue": 598.7,
  "unitOfMeasure": "°C",
  "quality": "GOOD",
  "protocol": "OPC-UA"
}
```

**Common Queries:**
- Collect real-time equipment data for process monitoring
- Generate equipment performance analytics and trends
- Track data quality and collection system health

**Related Tables:** Equipment, WorkOrder, OperationParameter, SPCConfiguration

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** dataCollectionType
- **Index:** collectionTimestamp
- **Index:** workOrderId
- **Index:** dataPointName

---

### EquipmentCommand

**Description:** Equipment control commands and automation instructions sent to manufacturing equipment with execution tracking and response management

**Business Purpose:** Enables automated equipment control, recipe execution, and process automation through systematic command management and tracking

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Automation Teams
- **Update Frequency:** Real-time command issuance and status updates as equipment automation systems execute instructions
- **Data Retention:** 7 years for command audit trails and process validation documentation
- **Security Classification:** Internal - Equipment control and automation information with operational security implications

**Compliance Notes:** Command tracking required for process validation, audit trails, and regulatory compliance in automated manufacturing

**System Integrations:** Equipment Controllers, Manufacturing Execution Systems, Process Control, Work Order Management

**Fields (24):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| equipmentId | String | ✓ |  |  |  |
| commandType | CommandType | ✓ |  |  |  |
| commandStatus | CommandStatus | ✓ | PENDING |  |  |
| commandName | String | ✓ |  |  |  |
| commandPayload | Json |  |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| issuedAt | DateTime | ✓ | now( |  |  |
| sentAt | DateTime |  |  |  |  |
| acknowledgedAt | DateTime |  |  |  |  |
| completedAt | DateTime |  |  |  |  |
| responsePayload | Json |  |  |  |  |
| responseCode | String |  |  |  |  |
| responseMessage | String |  |  |  |  |
| timeoutSeconds | Int | ✓ | 30 |  |  |
| retryCount | Int | ✓ | auto |  |  |
| maxRetries | Int | ✓ | 3 |  |  |
| priority | Int | ✓ | 5 |  |  |
| issuedBy | String | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| equipment | Equipment | ✓ |  |  |  |
| workOrder | WorkOrder |  |  |  |  |

**Usage Examples:**

#### CNC program execution command

High-priority CNC program execution command with detailed parameters and successful completion

```json
{
  "equipmentId": "CNC-001",
  "commandType": "PROGRAM_EXECUTION",
  "commandName": "Run CNC Program TB-001-R3",
  "commandPayload": {
    "programNumber": "TB-001-R3",
    "toolOffsets": "T01-125.5mm",
    "feedRate": "1500mm/min"
  },
  "workOrderId": "WO-2024-001234",
  "commandStatus": "COMPLETED",
  "priority": 1
}
```

#### Equipment setup command

Equipment setup command for heat treatment recipe configuration currently executing

```json
{
  "equipmentId": "FURNACE-001",
  "commandType": "SETUP",
  "commandName": "Set Heat Treatment Recipe",
  "commandPayload": {
    "recipe": "AEROSPACE_TITANIUM",
    "temperature": "600°C",
    "duration": "4 hours"
  },
  "commandStatus": "IN_PROGRESS",
  "issuedBy": "AUTOMATION_SYSTEM"
}
```

**Common Queries:**
- Track equipment command execution status for automation monitoring
- Generate command audit trails for process validation
- Monitor failed commands requiring manual intervention

**Related Tables:** Equipment, WorkOrder, Operation, User

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** commandType
- **Index:** commandStatus
- **Index:** workOrderId
- **Index:** issuedAt
- **Index:** priority

---

### EquipmentMaterialMovement

**Description:** Material movements and transactions processed through manufacturing equipment with complete traceability and quality status tracking

**Business Purpose:** Provides equipment-level material tracking enabling precise traceability, quality control, and production accountability through equipment-based monitoring

**Data Governance:**
- **Data Owner:** Manufacturing Operations and Materials Management Teams
- **Update Frequency:** Real-time tracking as materials are processed, consumed, or produced by manufacturing equipment
- **Data Retention:** Permanent retention for complete material traceability and regulatory compliance
- **Security Classification:** Internal - Material flow and equipment utilization information with operational significance

**Compliance Notes:** Equipment-based material tracking required for complete traceability, quality accountability, and regulatory compliance in controlled manufacturing

**System Integrations:** Equipment Controllers, Material Management, Quality Tracking, Traceability Systems

**Fields (22):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| equipmentId | String | ✓ |  |  |  |
| partId | String |  |  |  |  |
| partNumber | String | ✓ |  |  |  |
| lotNumber | String |  |  |  |  |
| serialNumber | String |  |  |  |  |
| movementType | String | ✓ |  |  |  |
| quantity | Float | ✓ |  |  |  |
| unitOfMeasure | String | ✓ |  |  |  |
| movementTimestamp | DateTime | ✓ | now( |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| fromLocation | String |  |  |  |  |
| toLocation | String |  |  |  |  |
| qualityStatus | String |  |  |  |  |
| upstreamTraceId | String |  |  |  |  |
| downstreamTraceId | String |  |  |  |  |
| recordedBy | String | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| equipment | Equipment | ✓ |  |  |  |
| part | Part |  |  |  |  |
| workOrder | WorkOrder |  |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Part | part |  |  |

**Usage Examples:**

#### CNC machining material consumption

Raw titanium bar consumed by CNC machine for turbine blade manufacturing with quality approval

```json
{
  "equipmentId": "CNC-001",
  "partNumber": "TB-A380-001-RAW",
  "lotNumber": "LOT-TI-240325-001",
  "movementType": "CONSUMPTION",
  "quantity": 1,
  "unitOfMeasure": "EA",
  "workOrderId": "WO-2024-001234",
  "fromLocation": "RAW_MATERIAL",
  "toLocation": "WIP",
  "qualityStatus": "APPROVED"
}
```

#### Assembly equipment material tracking

Finished turbine blade produced by assembly equipment with upstream traceability linkage

```json
{
  "equipmentId": "ASSEMBLY-001",
  "partNumber": "TB-A380-001-FINISHED",
  "serialNumber": "TB-A380-001-S240325001",
  "movementType": "PRODUCTION",
  "quantity": 1,
  "unitOfMeasure": "EA",
  "operationId": "OP-FINAL-ASSEMBLY",
  "upstreamTraceId": "TRACE-UPSTREAM-001",
  "recordedBy": "EQUIPMENT_CONTROLLER"
}
```

**Common Queries:**
- Track material consumption and production by equipment
- Generate equipment-based material traceability reports
- Monitor material quality status through equipment processing

**Related Tables:** Equipment, Part, WorkOrder, MaterialLot

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** partId
- **Index:** partNumber
- **Index:** lotNumber
- **Index:** serialNumber
- **Index:** workOrderId
- **Index:** movementTimestamp
- **Index:** movementType

---

### ProcessDataCollection

**Description:** Real-time manufacturing process data collection including parameters, measurements, and equipment states for process monitoring and optimization

**Business Purpose:** Captures critical production data for process control, quality assurance, and operational excellence enabling data-driven manufacturing decisions

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Process Control Teams
- **Update Frequency:** Real-time data collection during production operations with high-frequency sampling for critical parameters
- **Data Retention:** 3 years for process validation and continuous improvement analysis
- **Security Classification:** Internal - Proprietary process parameters and manufacturing data

**Compliance Notes:** Process data critical for statistical process control and regulatory compliance - must maintain data integrity for validation

**System Integrations:** Shop Floor Equipment, Process Control Systems, SPC Systems, Quality Management, OEE Calculation

**Fields (28):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| equipmentId | String | ✓ |  |  |  |
| processName | String | ✓ |  |  |  |
| processStepNumber | Int |  |  |  |  |
| startTimestamp | DateTime | ✓ |  |  |  |
| endTimestamp | DateTime |  |  |  |  |
| duration | Float |  |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| partNumber | String |  |  |  |  |
| lotNumber | String |  |  |  |  |
| serialNumber | String |  |  |  |  |
| parameters | Json | ✓ |  |  |  |
| quantityProduced | Float |  |  |  |  |
| quantityGood | Float |  |  |  |  |
| quantityScrap | Float |  |  |  |  |
| inSpecCount | Int |  |  |  |  |
| outOfSpecCount | Int |  |  |  |  |
| averageUtilization | Float |  |  |  |  |
| peakUtilization | Float |  |  |  |  |
| alarmCount | Int | ✓ | auto |  |  |
| criticalAlarmCount | Int | ✓ | auto |  |  |
| operatorId | String |  |  |  |  |
| supervisorId | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| equipment | Equipment | ✓ |  |  |  |
| workOrder | WorkOrder |  |  |  |  |

**Usage Examples:**

#### CNC machining data collection

Precision milling operation with optimal parameters producing good parts with no alarms

```json
{
  "workOrderId": "WO-240325-001",
  "equipmentId": "CNC-MILL-001",
  "operationId": "OP-MILL-001",
  "processName": "Titanium Precision Milling",
  "processStepNumber": 3,
  "startTimestamp": "2024-03-25T09:15:00Z",
  "duration": 45.5,
  "parameters": {
    "spindleSpeed": 1200,
    "feedRate": 0.15,
    "coolantFlow": 2.5,
    "toolWear": 0.003
  },
  "quantityProduced": 1,
  "quantityGood": 1,
  "quantityScrap": 0,
  "alarmCount": 0
}
```

#### Heat treatment process monitoring

Heat treatment batch process with controlled atmosphere maintaining tight temperature control

```json
{
  "workOrderId": "WO-240325-010",
  "equipmentId": "FURNACE-001",
  "processName": "Solution Heat Treatment",
  "startTimestamp": "2024-03-25T14:00:00Z",
  "duration": 180,
  "parameters": {
    "targetTemp": 980,
    "actualTemp": 982,
    "dwellTime": 120,
    "atmosphere": "ARGON"
  },
  "quantityProduced": 24,
  "quantityGood": 24,
  "processCompliance": true
}
```

**Common Queries:**
- Monitor real-time process parameters for quality control
- Generate OEE reports from production data
- Analyze process trends for continuous improvement

**Related Tables:** WorkOrder, Equipment, Operation, QualityMeasurement, EquipmentLog

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** processName
- **Index:** workOrderId
- **Index:** startTimestamp
- **Index:** partNumber
- **Index:** lotNumber
- **Index:** serialNumber

---

### QIFMeasurementPlan

**Description:** Quality Information Framework measurement plans defining structured measurement requirements for aerospace and medical device compliance

**Business Purpose:** Standardizes measurement planning using QIF industry standards ensuring consistent dimensional inspection and regulatory compliance

**Data Governance:**
- **Data Owner:** Quality Engineering and Metrology Teams
- **Update Frequency:** Updated when measurement requirements change, new QIF standards are adopted, or customer specifications are modified
- **Data Retention:** Permanent retention for measurement validation and regulatory compliance
- **Security Classification:** Confidential - Customer-specific measurement requirements and QIF data

**Compliance Notes:** Critical for AS9102 aerospace compliance and medical device FDA requirements using QIF industry standards for measurement traceability

**System Integrations:** Quality Management, Measurement Systems, FAI Reporting, Customer Portals, CAD Systems

**Fields (23):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| qifPlanId | String | ✓ |  |  |  |
| partNumber | String | ✓ |  |  |  |
| partRevision | String | ✓ |  |  |  |
| planVersion | String | ✓ |  |  |  |
| planName | String |  |  |  |  |
| description | String |  |  |  |  |
| createdDate | DateTime | ✓ | now( |  |  |
| createdBy | String |  |  |  |  |
| qifXmlContent | String | ✓ |  |  |  |
| qifVersion | String | ✓ | 3.0.0 |  |  |
| characteristicCount | Int | ✓ | auto |  |  |
| workOrderId | String |  |  |  |  |
| faiReportId | String |  |  |  |  |
| status | String | ✓ | ACTIVE |  |  |
| supersededBy | String |  |  |  |  |
| lastSyncedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| characteristics | QIFCharacteristic[] | ✓ |  |  |  |
| faiReport | FAIReport |  |  |  |  |
| workOrder | WorkOrder |  |  |  |  |
| measurementResults | QIFMeasurementResult[] | ✓ |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | QIFCharacteristic | characteristics | ✓ |  |
| one-to-one | FAIReport | faiReport |  |  |
| one-to-many | QIFMeasurementResult | measurementResults | ✓ |  |

**Usage Examples:**

#### Aerospace turbine blade QIF plan

Comprehensive QIF measurement plan for aerospace turbine blade with ASME standards and customer-specific requirements

```json
{
  "qifPlanId": "QIF-TB-A380-001-001",
  "partNumber": "TB-A380-001",
  "qifVersion": "3.0",
  "measurementType": "DIMENSIONAL_INSPECTION",
  "cadModelReference": "TB_A380_001_Rev_C.step",
  "coordinateSystem": "PART_COORDINATE_SYSTEM",
  "measurementDevice": "CMM_ZEISS_CONTURA",
  "measurementStrategy": "FEATURE_BASED",
  "toleranceStandard": "ASME_Y14.5_2018",
  "characteristicCount": 45,
  "criticalCharacteristics": 12,
  "customerRequirement": "AIRBUS_QIF_SPEC_AB789",
  "createdDate": "2024-03-15T00:00:00Z",
  "approvedBy": "quality_engineer_wilson"
}
```

#### Medical device QIF measurement plan

Medical device QIF plan with FDA compliance requirements and environmental controls for precision measurement

```json
{
  "qifPlanId": "QIF-MD-VALVE-002-001",
  "partNumber": "MD-VALVE-002",
  "qifVersion": "3.0",
  "measurementType": "FIRST_ARTICLE_INSPECTION",
  "regulatoryCompliance": "FDA_510K",
  "biocompatibilityImpact": true,
  "measurementUncertainty": "±0.0001 inches",
  "traceabilityRequired": "NIST_TRACEABLE",
  "temperatureControl": "68°F ±2°F",
  "humidityControl": "45-55% RH",
  "riskClass": "CLASS_II_MEDICAL_DEVICE"
}
```

**Common Queries:**
- Generate QIF measurement plans for new product introductions
- Track QIF compliance for customer requirements
- Export QIF data for customer quality portals

**Related Tables:** QIFCharacteristic, QIFMeasurementResult, MeasurementEquipment, FAIReport, QualityCharacteristic

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** partNumber
- **Index:** partRevision
- **Index:** qifPlanId
- **Index:** workOrderId
- **Index:** faiReportId
- **Index:** status

---

### QIFCharacteristic

**Description:** Quality Information Framework (QIF) characteristic definitions specifying measurable quality attributes and their tolerances

**Business Purpose:** Standardizes quality characteristic definitions for consistent measurement and reporting across aerospace and automotive quality systems

**Data Governance:**
- **Data Owner:** Quality Engineering Team
- **Update Frequency:** Updated when part specifications change or new quality requirements are established
- **Data Retention:** Maintained for part lifecycle plus 10 years for aerospace compliance
- **Security Classification:** Internal - Quality specification data with competitive sensitivity

**Compliance Notes:** Complies with QIF 3.0 standard for aerospace and automotive quality data exchange - critical for AS9102 and PPAP documentation

**System Integrations:** CAD Systems, CMM Programming, Statistical Process Control, Quality Measurement Equipment

**Fields (20):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| qifMeasurementPlanId | String | ✓ |  |  |  |
| characteristicId | String | ✓ |  |  |  |
| balloonNumber | String |  |  |  |  |
| characteristicName | String |  |  |  |  |
| description | String |  |  |  |  |
| nominalValue | Float |  |  |  |  |
| upperTolerance | Float |  |  |  |  |
| lowerTolerance | Float |  |  |  |  |
| toleranceType | String |  |  |  |  |
| gdtType | String |  |  |  |  |
| datumReferenceFrame | String |  |  |  |  |
| materialCondition | String |  |  |  |  |
| measurementMethod | String |  |  |  |  |
| samplingRequired | Boolean | ✓ | auto |  |  |
| sampleSize | Int |  |  |  |  |
| sequenceNumber | Int |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| qifMeasurementPlan | QIFMeasurementPlan | ✓ |  |  |  |
| measurements | QIFMeasurement[] | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | QIFMeasurementPlan | qifMeasurementPlan | ✓ |  |
| one-to-many | QIFMeasurement | measurements | ✓ |  |

**Usage Examples:**

#### Critical dimensional characteristic for aerospace component with tight tolerances

Critical bore diameter specification with tight aerospace tolerances requiring 100% inspection

```json
{
  "characteristicId": "CHAR-DIM-001",
  "characteristicName": "Bore Diameter",
  "characteristicType": "DIMENSIONAL",
  "nominalValue": 12.7,
  "upperTolerance": 0.025,
  "lowerTolerance": -0.025,
  "units": "mm",
  "criticality": "CRITICAL"
}
```

#### Surface finish characteristic for medical implant component

Surface finish specification for medical implant requiring specific measurement method and criticality level

```json
{
  "characteristicId": "CHAR-SF-002",
  "characteristicName": "Surface Roughness",
  "characteristicType": "SURFACE_FINISH",
  "specification": "Ra 0.8 max",
  "measurementMethod": "PROFILOMETER",
  "criticality": "MAJOR"
}
```

**Common Queries:**
- Retrieve characteristic definitions for CMM programming
- Generate quality plans with characteristic specifications
- Track characteristic measurement capability studies

**Related Tables:** QIFMeasurementPlan, QualityMeasurement, Part, InspectionCharacteristic

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** qifMeasurementPlanId
- **Index:** characteristicId
- **Index:** balloonNumber

---

### QIFMeasurementResult

**Description:** Quality Information Framework (QIF) measurement results containing actual measured values and statistical analysis data

**Business Purpose:** Captures standardized measurement results for quality characteristics enabling statistical analysis and regulatory compliance reporting

**Data Governance:**
- **Data Owner:** Quality Control Team
- **Update Frequency:** Real-time during measurement activities and automated data collection from inspection equipment
- **Data Retention:** Permanent retention for product traceability and statistical process control analysis
- **Security Classification:** Internal - Measurement data with regulatory and competitive significance

**Compliance Notes:** QIF 3.0 compliant measurement data required for AS9102 First Article Inspection and automotive PPAP documentation

**System Integrations:** Coordinate Measuring Machines, Statistical Process Control Systems, Quality Reporting, Customer Quality Portals

**Fields (27):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| qifResultsId | String | ✓ |  |  |  |
| qifMeasurementPlanId | String |  |  |  |  |
| partNumber | String | ✓ |  |  |  |
| serialNumber | String |  |  |  |  |
| lotNumber | String |  |  |  |  |
| inspectionDate | DateTime | ✓ |  |  |  |
| inspectedBy | String | ✓ |  |  |  |
| inspectionType | String |  |  |  |  |
| overallStatus | String | ✓ |  |  |  |
| totalMeasurements | Int | ✓ | auto |  |  |
| passedMeasurements | Int | ✓ | auto |  |  |
| failedMeasurements | Int | ✓ | auto |  |  |
| qifXmlContent | String | ✓ |  |  |  |
| qifVersion | String | ✓ | 3.0.0 |  |  |
| workOrderId | String |  |  |  |  |
| serializedPartId | String |  |  |  |  |
| faiReportId | String |  |  |  |  |
| measurementDeviceId | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| faiReport | FAIReport |  |  |  |  |
| measurementDevice | MeasurementEquipment |  |  |  |  |
| qifMeasurementPlan | QIFMeasurementPlan |  |  |  |  |
| serializedPart | SerializedPart |  |  |  |  |
| workOrder | WorkOrder |  |  |  |  |
| measurements | QIFMeasurement[] | ✓ |  |  |  |
**Relationships (5):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | FAIReport | faiReport |  |  |
| one-to-one | MeasurementEquipment | measurementDevice |  |  |
| one-to-one | QIFMeasurementPlan | qifMeasurementPlan |  |  |
| one-to-one | SerializedPart | serializedPart |  |  |
| one-to-many | QIFMeasurement | measurements | ✓ |  |

**Usage Examples:**

#### CMM measurement results for aerospace critical dimension with statistical analysis

Precise CMM measurement of critical aerospace dimension with statistical capability analysis showing acceptable process control

```json
{
  "measurementId": "MEAS-240330-001",
  "characteristicId": "CHAR-DIM-001",
  "actualValue": 12.715,
  "deviation": 0.015,
  "measurementUncertainty": 0.002,
  "cpk": 1.67,
  "measurementDateTime": "2024-03-30T14:30:00Z"
}
```

#### Automated gauge measurement with SPC trending data

Automated dimensional measurement with real-time SPC analysis showing stable process performance

```json
{
  "measurementId": "MEAS-240330-002",
  "characteristicId": "CHAR-DIM-002",
  "actualValue": 25.003,
  "deviation": 0.003,
  "spcTrend": "STABLE",
  "controlLimits": "WITHIN",
  "measurementEquipment": "AUTO_GAUGE_05"
}
```

**Common Queries:**
- Generate capability studies for process qualification
- Extract measurement data for customer quality reports
- Analyze measurement trends for process improvement

**Related Tables:** QIFCharacteristic, QIFMeasurement, MeasurementEquipment, StatisticalProcessControl

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** qifResultsId
- **Index:** qifMeasurementPlanId
- **Index:** partNumber
- **Index:** serialNumber
- **Index:** inspectionDate
- **Index:** overallStatus
- **Index:** workOrderId
- **Index:** faiReportId

---

### QIFMeasurement

**Description:** Individual QIF measurement instances linking measurement results to specific parts and inspection events

**Business Purpose:** Provides traceability between measured parts and their quality characteristics for complete measurement history and compliance documentation

**Data Governance:**
- **Data Owner:** Quality Control Team
- **Update Frequency:** Created for each measurement event during inspection and quality control activities
- **Data Retention:** Permanent retention for complete measurement traceability and audit support
- **Security Classification:** Internal - Measurement traceability data with regulatory significance

**Compliance Notes:** Essential for AS9102 and PPAP traceability requirements - maintains complete measurement genealogy for regulatory audits

**System Integrations:** QIF Measurement Results, Part Traceability, Inspection Equipment, Quality Certificates

**Fields (17):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| qifMeasurementResultId | String | ✓ |  |  |  |
| qifCharacteristicId | String |  |  |  |  |
| characteristicId | String | ✓ |  |  |  |
| balloonNumber | String |  |  |  |  |
| measuredValue | Float | ✓ |  |  |  |
| deviation | Float |  |  |  |  |
| status | String | ✓ |  |  |  |
| measurementDate | DateTime |  |  |  |  |
| measuredBy | String |  |  |  |  |
| measurementDevice | String |  |  |  |  |
| uncertainty | Float |  |  |  |  |
| uncertaintyK | Float |  |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| qifCharacteristic | QIFCharacteristic |  |  |  |  |
| qifMeasurementResult | QIFMeasurementResult | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | QIFCharacteristic | qifCharacteristic |  |  |
| one-to-one | QIFMeasurementResult | qifMeasurementResult | ✓ |  |

**Usage Examples:**

#### First article inspection measurement with complete traceability to specific part serial number

Complete first article measurement instance for aerospace part with full characteristic measurement and traceability

```json
{
  "measurementInstanceId": "QIF-MEAS-001",
  "partSerialNumber": "SN-240330-001",
  "inspectionEvent": "FIRST_ARTICLE",
  "measurementPlan": "QMP-AEROSPACE-001",
  "totalCharacteristics": 47,
  "measuredCharacteristics": 47,
  "measurementCompleteDateTime": "2024-03-30T16:45:00Z"
}
```

#### In-process measurement for production control with partial characteristic measurement

In-process sampling measurement for production lot with selected critical characteristics for process control

```json
{
  "measurementInstanceId": "QIF-MEAS-002",
  "lotNumber": "LOT-240330-002",
  "inspectionEvent": "IN_PROCESS",
  "measurementPlan": "QMP-PRODUCTION-002",
  "totalCharacteristics": 12,
  "measuredCharacteristics": 5,
  "measurementType": "SAMPLING"
}
```

**Common Queries:**
- Track measurement completion for production parts
- Generate measurement genealogy reports for customer audits
- Analyze measurement frequency for process optimization

**Related Tables:** QIFMeasurementResult, QIFMeasurementPlan, Part, InspectionExecution

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** qifMeasurementResultId
- **Index:** qifCharacteristicId
- **Index:** characteristicId
- **Index:** status

---

### SPCConfiguration

**Description:** Statistical Process Control configuration defining control charts, control limits, and monitoring rules for real-time manufacturing process control

**Business Purpose:** Enables predictive quality control and process optimization through statistical monitoring, early detection of process variations, and automated alerts

**Data Governance:**
- **Data Owner:** Quality Engineering and Process Control Teams
- **Update Frequency:** Updated when process capability changes, control limits are recalculated, or monitoring rules are modified
- **Data Retention:** 7 years for process validation and continuous improvement analysis
- **Security Classification:** Internal - Process control parameters and statistical methods

**Compliance Notes:** SPC configurations support ISO 9001 process control requirements and automotive PPAP statistical documentation

**System Integrations:** Process Data Collection, Quality Management, Equipment Control, Alert Systems, Performance Analytics

**Fields (27):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| parameterId | String | ✓ |  |  |  |
| chartType | SPCChartType | ✓ |  |  |  |
| subgroupSize | Int |  |  |  |  |
| UCL | Float |  |  |  |  |
| centerLine | Float |  |  |  |  |
| LCL | Float |  |  |  |  |
| rangeUCL | Float |  |  |  |  |
| rangeCL | Float |  |  |  |  |
| rangeLCL | Float |  |  |  |  |
| USL | Float |  |  |  |  |
| LSL | Float |  |  |  |  |
| targetValue | Float |  |  |  |  |
| limitsBasedOn | LimitCalculationMethod | ✓ |  |  |  |
| historicalDataDays | Int |  |  |  |  |
| lastCalculatedAt | DateTime |  |  |  |  |
| enabledRules | Json | ✓ |  |  |  |
| ruleSensitivity | String | ✓ | NORMAL |  |  |
| enableCapability | Boolean | ✓ | true |  |  |
| confidenceLevel | Float | ✓ | 0.95 |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdBy | String | ✓ |  |  |  |
| lastModifiedBy | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| parameter | OperationParameter | ✓ |  |  |  |
| violations | SPCRuleViolation[] | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | OperationParameter | parameter | ✓ |  |
| one-to-many | SPCRuleViolation | violations | ✓ |  |

**Usage Examples:**

#### Machining process SPC control

SPC control configuration for critical surface finish monitoring with automated alerts and violation detection

```json
{
  "processName": "Titanium Precision Milling",
  "characteristic": "SURFACE_ROUGHNESS",
  "chartType": "X_BAR_R",
  "upperControlLimit": 3.2,
  "lowerControlLimit": 0.8,
  "targetValue": 2,
  "sampleSize": 5,
  "samplingFrequency": "EVERY_HOUR",
  "violationRules": [
    "7_CONSECUTIVE_ABOVE_CENTER",
    "2_OF_3_BEYOND_2_SIGMA"
  ],
  "alertActions": [
    "STOP_PRODUCTION",
    "NOTIFY_OPERATOR",
    "LOG_INCIDENT"
  ],
  "isActive": true
}
```

#### Assembly torque SPC monitoring

Individual measurement SPC for critical fastener torque with capability requirements and specification limits

```json
{
  "processName": "Critical Fastener Assembly",
  "characteristic": "TORQUE_VALUE",
  "chartType": "INDIVIDUALS",
  "upperControlLimit": 28.5,
  "lowerControlLimit": 21.5,
  "targetValue": 25,
  "toleranceUnit": "NM",
  "capabilityStudyRequired": true,
  "cpkMinimum": 1.33
}
```

**Common Queries:**
- Monitor real-time SPC violations for immediate response
- Generate process capability reports for customer requirements
- Track SPC performance trends for continuous improvement

**Related Tables:** ProcessDataCollection, QualityMeasurement, Equipment, Alert, QualityCharacteristic

**Constraints & Indexes:**

- **Primary Key:** id

---

### SPCRuleViolation

**Description:** Statistical Process Control rule violations tracking out-of-control conditions and triggering corrective actions for quality management

**Business Purpose:** Maintains process stability and quality by detecting statistical anomalies, triggering immediate corrective actions, and preventing defective production

**Data Governance:**
- **Data Owner:** Quality Engineering and Process Control Teams
- **Update Frequency:** Real-time detection and logging of SPC rule violations with immediate alerting
- **Data Retention:** 3 years for process validation and continuous improvement analysis
- **Security Classification:** Internal - Process control data and quality metrics

**Compliance Notes:** SPC violations support ISO 9001 process control requirements and provide data for continuous improvement and quality audits

**System Integrations:** SPC Systems, Quality Management, Process Control, Alert Systems, Production Control

**Fields (19):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| configurationId | String | ✓ |  |  |  |
| ruleNumber | Int | ✓ |  |  |  |
| ruleName | String | ✓ |  |  |  |
| severity | String | ✓ |  |  |  |
| dataPointId | String |  |  |  |  |
| value | Float | ✓ |  |  |  |
| timestamp | DateTime | ✓ |  |  |  |
| subgroupNumber | Int |  |  |  |  |
| UCL | Float |  |  |  |  |
| LCL | Float |  |  |  |  |
| centerLine | Float |  |  |  |  |
| deviationSigma | Float |  |  |  |  |
| acknowledged | Boolean | ✓ | auto |  |  |
| acknowledgedBy | String |  |  |  |  |
| acknowledgedAt | DateTime |  |  |  |  |
| resolution | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| configuration | SPCConfiguration | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | SPCConfiguration | configuration | ✓ |  |

**Usage Examples:**

#### Nelson Rule 1 violation - point beyond control limits

High-severity SPC violation exceeding control limits requiring immediate production stop and corrective action

```json
{
  "violationId": "SPC-VIO-240325-001",
  "spcConfigurationId": "SPC-TB-SURFACE-001",
  "characteristic": "SURFACE_ROUGHNESS",
  "workOrderId": "WO-240325-001",
  "partNumber": "TB-A380-001",
  "equipmentId": "CNC-MILL-001",
  "violationTimestamp": "2024-03-25T14:30:00Z",
  "ruleViolated": "NELSON_RULE_1",
  "ruleDescription": "Point beyond upper control limit",
  "measurementValue": 3.8,
  "upperControlLimit": 3.2,
  "lowerControlLimit": 0.8,
  "centerLine": 2,
  "sigma": 0.4,
  "severity": "HIGH",
  "automaticAction": "STOP_PRODUCTION",
  "operatorNotified": "operator_smith",
  "supervisorNotified": "quality_supervisor_martinez",
  "correctiveActionRequired": true
}
```

#### Nelson Rule 2 violation - trending pattern

Medium-severity trending violation indicating systematic process shift requiring investigation and tool adjustment

```json
{
  "violationId": "SPC-VIO-240325-010",
  "spcConfigurationId": "SPC-TORQUE-ASSEMBLY-001",
  "characteristic": "FASTENER_TORQUE",
  "violationTimestamp": "2024-03-25T16:45:00Z",
  "ruleViolated": "NELSON_RULE_2",
  "ruleDescription": "9 consecutive points on same side of center line",
  "consecutivePoints": 9,
  "trendDirection": "ABOVE_CENTER",
  "lastNineValues": [
    26.2,
    26.5,
    26.3,
    26.8,
    26.4,
    26.7,
    26.9,
    26.6,
    26.8
  ],
  "centerLine": 25,
  "severity": "MEDIUM",
  "possibleCause": "Tool wear or systematic bias",
  "recommendedAction": "Investigate tool condition and recalibrate torque wrench"
}
```

**Common Queries:**
- Monitor real-time SPC violations for immediate response
- Generate process stability reports for quality audits
- Track violation patterns for process improvement opportunities

**Related Tables:** SPCConfiguration, QualityMeasurement, Equipment, Alert, CorrectiveAction

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configurationId, timestamp
- **Index:** acknowledged

---

### SamplingPlan

**Description:** Statistical sampling plans defining inspection frequency, sample sizes, and acceptance criteria for quality control and regulatory compliance

**Business Purpose:** Ensures statistically valid quality control through scientific sampling methods while optimizing inspection resources and maintaining product quality

**Data Governance:**
- **Data Owner:** Quality Engineering and Statistical Process Control Teams
- **Update Frequency:** Updated when quality requirements change, process capability improves, or statistical analysis indicates plan optimization
- **Data Retention:** 7 years for statistical validation and regulatory compliance
- **Security Classification:** Internal - Quality control methods and statistical sampling approaches

**Compliance Notes:** Sampling plans support ANSI/ASQ Z1.4 standards, automotive PPAP requirements, and aerospace AS9102 statistical sampling

**System Integrations:** Quality Management, SPC Systems, Inspection Planning, Statistical Analysis, Customer Requirements

**Fields (30):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| planName | String | ✓ |  |  |  |
| planType | SamplingPlanType | ✓ |  |  |  |
| parameterId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| inspectionLevel | String | ✓ |  |  |  |
| AQL | Float | ✓ |  |  |  |
| lotSizeMin | Int |  |  |  |  |
| lotSizeMax | Int |  |  |  |  |
| sampleSizeNormal | Int | ✓ |  |  |  |
| acceptanceNumber | Int | ✓ |  |  |  |
| rejectionNumber | Int | ✓ |  |  |  |
| sampleSizeTightened | Int |  |  |  |  |
| acceptanceNumberTightened | Int |  |  |  |  |
| sampleSizeReduced | Int |  |  |  |  |
| acceptanceNumberReduced | Int |  |  |  |  |
| sampleSize2 | Int |  |  |  |  |
| acceptanceNumber2 | Int |  |  |  |  |
| rejectionNumber2 | Int |  |  |  |  |
| currentInspectionLevel | String | ✓ | NORMAL |  |  |
| consecutiveAccepted | Int | ✓ | auto |  |  |
| consecutiveRejected | Int | ✓ | auto |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdBy | String | ✓ |  |  |  |
| lastModifiedBy | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| inspectionResults | SamplingInspectionResult[] | ✓ |  |  |  |
| operation | Operation |  |  |  |  |
| parameter | OperationParameter |  |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | SamplingInspectionResult | inspectionResults | ✓ |  |
| one-to-one | OperationParameter | parameter |  |  |

**Usage Examples:**

#### Aerospace component AQL sampling

Critical aerospace component sampling plan with AQL 1.0 for safety-critical dimensional characteristics

```json
{
  "planName": "TB_A380_DIMENSIONAL_AQL",
  "partNumber": "TB-A380-001",
  "characteristicType": "DIMENSIONAL",
  "samplingStandard": "ANSI_ASQ_Z1_4",
  "lotSizeRange": "501-1200",
  "inspectionLevel": "II",
  "aql": 1,
  "sampleSize": 32,
  "acceptanceNumber": 1,
  "rejectionNumber": 2,
  "samplingType": "SINGLE_SAMPLING",
  "criticality": "CRITICAL_SAFETY_ITEM",
  "customerRequirement": "AIRBUS_SAMPLING_SPEC_AB456",
  "effectiveDate": "2024-03-01T00:00:00Z"
}
```

#### Medical device biocompatibility sampling

Medical device biocompatibility sampling plan with FDA requirements for Class II device approval

```json
{
  "planName": "MD_VALVE_BIOCOMPAT_SAMPLING",
  "partNumber": "MD-VALVE-002",
  "characteristicType": "BIOCOMPATIBILITY",
  "samplingStandard": "ISO_10993_SAMPLING",
  "lotSizeRange": "100-500",
  "sampleSize": 10,
  "samplingFrequency": "EVERY_LOT",
  "testingRequired": "CYTOTOXICITY_USP_87",
  "acceptanceCriteria": "No cytotoxic response",
  "fdaRequirement": "510K_BIOCOMPAT_TESTING",
  "riskClass": "CLASS_II_MEDICAL_DEVICE"
}
```

**Common Queries:**
- Generate sampling plans for new product introductions
- Validate sample sizes for statistical confidence
- Track sampling plan effectiveness and optimization opportunities

**Related Tables:** InspectionPlan, QualityCharacteristic, SPCConfiguration, CustomerRequirement, RegulatoryRequirement

**Constraints & Indexes:**

- **Primary Key:** id

---

### SamplingInspectionResult

**Description:** Statistical sampling inspection results capturing acceptance decisions and quality control outcomes for production lots

**Business Purpose:** Enables statistical quality control through sampling methodology reducing inspection costs while maintaining quality assurance

**Data Governance:**
- **Data Owner:** Quality Control and Statistical Analysis Teams
- **Update Frequency:** Updated for each sampling inspection event with statistical analysis and lot acceptance decisions
- **Data Retention:** Permanent retention for statistical analysis and regulatory compliance
- **Security Classification:** Internal - Quality control data with regulatory and competitive significance

**Compliance Notes:** Sampling results critical for statistical process control and regulatory compliance - must follow ANSI/ASQ standards

**System Integrations:** Statistical Process Control, Quality Management Systems, Production Control, Certificate Generation

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| planId | String | ✓ |  |  |  |
| lotNumber | String | ✓ |  |  |  |
| lotSize | Int | ✓ |  |  |  |
| inspectionDate | DateTime | ✓ |  |  |  |
| sampleSize | Int | ✓ |  |  |  |
| defectsFound | Int | ✓ |  |  |  |
| decision | String | ✓ |  |  |  |
| inspectionLevel | String | ✓ |  |  |  |
| inspectorId | String | ✓ |  |  |  |
| notes | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| plan | SamplingPlan | ✓ |  |  |  |

**Usage Examples:**

#### Production lot sampling inspection with statistical acceptance decision

Military standard sampling inspection with zero defects found resulting in lot acceptance with high statistical confidence

```json
{
  "samplingResultId": "SIR-240330-001",
  "lotNumber": "LOT-240330-001",
  "partNumber": "AERO-COMPONENT-001",
  "samplingPlan": "MIL-STD-105E",
  "lotSize": 500,
  "sampleSize": 32,
  "acceptableQualityLevel": 1,
  "defectsFound": 0,
  "acceptanceNumber": 1,
  "rejectionNumber": 2,
  "inspectionResult": "ACCEPT",
  "statisticalConfidence": 95,
  "inspector": "M.Rodriguez"
}
```

#### Medical device sampling with enhanced statistical requirements and FDA compliance

FDA-compliant sampling inspection for medical implants with zero defects and enhanced statistical requirements

```json
{
  "samplingResultId": "SIR-240330-002",
  "lotNumber": "LOT-MD-240330-002",
  "partNumber": "MD-IMPLANT-001",
  "samplingPlan": "FDA_STATISTICAL",
  "lotSize": 1000,
  "sampleSize": 80,
  "acceptableQualityLevel": 0.25,
  "defectsFound": 0,
  "criticalCharacteristics": 15,
  "majorCharacteristics": 8,
  "minorCharacteristics": 2,
  "inspectionResult": "ACCEPT",
  "fdaCompliance": true
}
```

**Common Queries:**
- Generate statistical control charts for process monitoring
- Track sampling inspection acceptance rates for process improvement
- Produce regulatory compliance reports for audit purposes

**Related Tables:** SamplingPlan, InspectionRecord, MaterialLot, QualityMeasurement, StatisticalProcessControl

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** planId, inspectionDate

---

### WorkInstructionMedia

**Description:** Multimedia content for work instructions including images, videos, animations, and interactive content supporting manufacturing operations

**Business Purpose:** Enhances work instruction effectiveness through visual and interactive content, reducing training time and improving manufacturing consistency

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Technical Documentation Teams
- **Update Frequency:** Updated when processes change, new content is created, or media requires refresh for clarity and accuracy
- **Data Retention:** 7 years for training records and process validation
- **Security Classification:** Internal - Process documentation and training materials

**Compliance Notes:** Media content supports training requirements and process documentation for ISO 9001 and industry-specific training standards

**System Integrations:** Work Instructions, Training Systems, Document Management, Digital Asset Management, Shop Floor Displays

**Fields (16):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| instructionId | String | ✓ |  |  |  |
| mediaType | MediaType | ✓ |  |  |  |
| fileName | String | ✓ |  |  |  |
| fileUrl | String | ✓ |  |  |  |
| fileSize | Int | ✓ |  |  |  |
| mimeType | String | ✓ |  |  |  |
| title | String |  |  |  |  |
| description | String |  |  |  |  |
| tags | String[] | ✓ |  |  |  |
| annotations | Json |  |  |  |  |
| usageCount | Int | ✓ | auto |  |  |
| lastUsedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| instruction | WorkInstruction | ✓ |  |  |  |

**Usage Examples:**

#### CNC setup video instruction

Comprehensive video instruction for CNC setup with timestamped steps and safety emphasis

```json
{
  "mediaId": "VID-CNC-SETUP-001",
  "workInstructionId": "WI-CNC-MILL-001",
  "mediaType": "VIDEO",
  "mediaTitle": "CNC Mill Setup for Titanium Machining",
  "description": "Step-by-step video showing proper setup procedure for titanium alloy machining",
  "duration": "8 minutes 45 seconds",
  "fileFormat": "MP4",
  "resolution": "1920x1080",
  "language": "English",
  "subtitlesAvailable": true,
  "createdDate": "2024-03-15T00:00:00Z",
  "version": "2.1",
  "mediaSteps": [
    {
      "stepNumber": 1,
      "timestamp": "00:30",
      "description": "Safety equipment verification"
    },
    {
      "stepNumber": 2,
      "timestamp": "01:15",
      "description": "Workpiece clamping procedure"
    },
    {
      "stepNumber": 3,
      "timestamp": "03:45",
      "description": "Tool loading and offset setup"
    }
  ]
}
```

#### Assembly animation sequence

Interactive 3D animation for complex assembly with embedded quality checkpoints and safety callouts

```json
{
  "mediaId": "ANIM-ASSEMBLY-ENGINE-001",
  "workInstructionId": "WI-ASSEMBLY-ENGINE-001",
  "mediaType": "ANIMATION",
  "mediaTitle": "Engine Valve Assembly Sequence",
  "description": "3D animation showing proper valve assembly sequence and torque application",
  "fileFormat": "WEBM",
  "interactiveElements": true,
  "torqueSpecifications": "25 Nm ±2 Nm",
  "safetyCallouts": [
    "Thread locker application",
    "Cross-pattern tightening"
  ],
  "qualityCheckpoints": [
    "Valve seat contact verification",
    "Final torque validation"
  ]
}
```

**Common Queries:**
- Find multimedia content for specific work instructions
- Track media usage for training effectiveness analysis
- Generate content inventory for documentation management

**Related Tables:** WorkInstruction, TrainingRecord, DocumentRevision, MediaAsset, DigitalContent

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** instructionId
- **Index:** mediaType

---

### WorkInstructionRelation

**Description:** Work Instruction Relation - Relationships between work instructions

**Fields (7):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| parentId | String | ✓ |  |  |  |
| relatedId | String | ✓ |  |  |  |
| relationType | RelationType | ✓ |  |  |  |
| description | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| parent | WorkInstruction | ✓ |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** parentId, relatedId, relationType
- **Index:** parentId
- **Index:** relatedId

---

### ExportTemplate

**Description:** Export Template - Templates for exporting work instructions

**Fields (16):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| name | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| templateType | ExportTemplateType | ✓ |  |  |  |
| templateFormat | ExportFormat | ✓ |  |  |  |
| headerTemplate | String |  |  |  |  |
| footerTemplate | String |  |  |  |  |
| styles | Json |  |  |  |  |
| layout | Json |  |  |  |  |
| isDefault | Boolean | ✓ | auto |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdById | String | ✓ |  |  |  |
| updatedById | String | ✓ |  |  |  |
| instructions | WorkInstruction[] | ✓ |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** templateType
- **Index:** templateFormat

---

### DataCollectionFieldTemplate

**Description:** Data Collection Field Template - Reusable field templates

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| name | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| fieldSchema | Json | ✓ |  |  |  |
| validationRules | Json |  |  |  |  |
| category | String |  |  |  |  |
| tags | String[] | ✓ |  |  |  |
| usageCount | Int | ✓ | auto |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdById | String | ✓ |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** category
- **Index:** tags

---

### SetupSheet

**Description:** Manufacturing setup sheets providing detailed instructions for equipment configuration, tooling setup, and process preparation for production operations

**Business Purpose:** Ensures consistent and efficient production setup by providing standardized instructions, reducing setup time, and maintaining quality standards

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Process Engineering Teams
- **Update Frequency:** Updated when processes are optimized, tooling changes, or setup procedures are improved through continuous improvement
- **Data Retention:** 7 years for process validation and setup optimization analysis
- **Security Classification:** Internal - Setup procedures and tooling specifications

**Compliance Notes:** Setup documentation supports ISO 9001 process control and provides traceability for setup-related quality issues

**System Integrations:** Work Instructions, Tool Management, Equipment Management, Production Planning, Quality Control

**Fields (42):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| documentNumber | String | ✓ |  |  |  |
| title | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| version | String | ✓ | 1.0.0 |  |  |
| status | WorkInstructionStatus | ✓ | DRAFT |  |  |
| effectiveDate | DateTime |  |  |  |  |
| supersededDate | DateTime |  |  |  |  |
| ecoNumber | String |  |  |  |  |
| equipmentId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| partId | String |  |  |  |  |
| workCenterId | String |  |  |  |  |
| estimatedSetupTime | Int |  |  |  |  |
| safetyChecklist | Json |  |  |  |  |
| requiredPPE | String[] | ✓ |  |  |  |
| imageUrls | String[] | ✓ |  |  |  |
| videoUrls | String[] | ✓ |  |  |  |
| attachmentUrls | String[] | ✓ |  |  |  |
| tags | String[] | ✓ |  |  |  |
| categories | String[] | ✓ |  |  |  |
| keywords | String[] | ✓ |  |  |  |
| thumbnailUrl | String |  |  |  |  |
| parentVersionId | String |  |  |  |  |
| approvalWorkflowId | String |  |  |  |  |
| approvedById | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| approvalHistory | Json |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdById | String | ✓ |  |  |  |
| updatedById | String | ✓ |  |  |  |
| executions | SetupExecution[] | ✓ |  |  |  |
| parameters | SetupParameter[] | ✓ |  |  |  |
| approvedBy | User |  |  |  |  |
| createdBy | User | ✓ |  |  |  |
| parentVersion | SetupSheet |  |  |  |  |
| childVersions | SetupSheet[] | ✓ |  |  |  |
| updatedBy | User | ✓ |  |  |  |
| steps | SetupStep[] | ✓ |  |  |  |
| toolList | SetupTool[] | ✓ |  |  |  |
**Relationships (9):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | SetupExecution | executions | ✓ |  |
| one-to-many | SetupParameter | parameters | ✓ |  |
| one-to-one | User | approvedBy |  |  |
| one-to-one | User | createdBy | ✓ |  |
| one-to-one | SetupSheet | parentVersion |  |  |
| one-to-many | SetupSheet | childVersions | ✓ |  |
| one-to-one | User | updatedBy | ✓ |  |
| one-to-many | SetupStep | steps | ✓ |  |
| one-to-many | SetupTool | toolList | ✓ |  |

**Usage Examples:**

#### CNC milling setup sheet

Comprehensive CNC setup sheet with tooling, programming, and quality checkpoint specifications for turbine blade machining

```json
{
  "setupSheetNumber": "SETUP-MILL-TB-001",
  "partNumber": "TB-A380-001",
  "operation": "Rough and Finish Milling",
  "machine": "CNC-MILL-001",
  "workholding": "Custom Fixture FIX-TB-001",
  "toolList": [
    {
      "toolNumber": "T01",
      "description": "1/2 inch carbide end mill",
      "offsetNumber": "H01"
    },
    {
      "toolNumber": "T02",
      "description": "1/4 inch ball end mill",
      "offsetNumber": "H02"
    }
  ],
  "programNumber": "O1234",
  "setupTime": "45 minutes",
  "coordinateSystem": "G54",
  "qualityCheckpoints": [
    "First piece inspection after setup",
    "Mid-run dimensional check"
  ],
  "setupNotes": "Verify workpiece material orientation before clamping"
}
```

#### Assembly station setup

Assembly setup sheet with sequential setup steps, tool requirements, and safety protocols for engine subassembly

```json
{
  "setupSheetNumber": "SETUP-ASSY-ENGINE-001",
  "assemblyOperation": "Engine Subassembly",
  "workstation": "ASSEMBLY-001",
  "toolsRequired": [
    "Torque wrench 50 Nm",
    "Digital caliper",
    "Thread locker applicator"
  ],
  "setupSteps": [
    {
      "stepNumber": 1,
      "description": "Position assembly fixture",
      "estimatedTime": "5 minutes"
    },
    {
      "stepNumber": 2,
      "description": "Calibrate torque wrench",
      "estimatedTime": "3 minutes"
    },
    {
      "stepNumber": 3,
      "description": "Prepare thread locker",
      "estimatedTime": "2 minutes"
    }
  ],
  "safetyRequirements": [
    "Safety glasses",
    "Cut-resistant gloves"
  ]
}
```

**Common Queries:**
- Generate setup instructions for work order execution
- Track setup time performance for efficiency improvement
- Find setup sheets for specific parts or operations

**Related Tables:** SetupStep, SetupTool, WorkInstruction, Equipment, ToolDrawing

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentNumber
- **Index:** status
- **Index:** equipmentId
- **Index:** operationId
- **Index:** partId

---

### SetupStep

**Description:** Individual steps in manufacturing setup procedures defining specific actions required to configure equipment for production

**Business Purpose:** Standardizes setup procedures to ensure consistent equipment configuration, reduce setup time, and maintain product quality across production runs

**Data Governance:**
- **Data Owner:** Manufacturing Engineering Team
- **Update Frequency:** Updated when setup procedures are revised or equipment configurations change
- **Data Retention:** Maintained for equipment lifecycle plus 5 years for procedure validation and training records
- **Security Classification:** Internal - Manufacturing process information with competitive sensitivity

**Compliance Notes:** Setup procedures must be validated and controlled for regulated industries - changes require engineering approval and operator training

**System Integrations:** Setup Sheets, Work Instructions, Equipment Control Systems, Operator Training Systems

**Fields (11):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| setupSheetId | String | ✓ |  |  |  |
| stepNumber | Int | ✓ |  |  |  |
| title | String | ✓ |  |  |  |
| instructions | String | ✓ |  |  |  |
| imageUrls | String[] | ✓ |  |  |  |
| videoUrls | String[] | ✓ |  |  |  |
| estimatedDuration | Int |  |  |  |  |
| isCritical | Boolean | ✓ | auto |  |  |
| requiresVerification | Boolean | ✓ | auto |  |  |
| setupSheet | SetupSheet | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | SetupSheet | setupSheet | ✓ |  |

**Usage Examples:**

#### CNC machine tool setup step with specific torque requirements and verification

Precise tool installation step for CNC machining with torque specification and mandatory verification

```json
{
  "setupStepId": "STEP-CNC-001",
  "stepNumber": 3,
  "stepDescription": "Install cutting tool and verify setup height",
  "stepType": "TOOL_INSTALLATION",
  "requiredTools": [
    "Torque wrench",
    "Height gauge"
  ],
  "torqueSpecification": "25 Nm",
  "verificationRequired": true,
  "estimatedTimeMinutes": 8
}
```

#### Assembly station fixture setup with alignment verification and safety checks

Assembly fixture setup step with safety requirements and precision alignment verification

```json
{
  "setupStepId": "STEP-ASM-002",
  "stepNumber": 1,
  "stepDescription": "Position assembly fixture and verify alignment",
  "stepType": "FIXTURE_POSITIONING",
  "safetyRequirements": [
    "Lock out power",
    "Verify alignment pins"
  ],
  "toleranceCheck": "±0.005 inch alignment",
  "estimatedTimeMinutes": 12
}
```

**Common Queries:**
- Retrieve setup procedures for equipment configuration
- Track setup step completion times for optimization
- Generate setup training materials for operator certification

**Related Tables:** SetupSheet, SetupExecution, SetupParameter, WorkInstruction

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** setupSheetId, stepNumber
- **Index:** setupSheetId

---

### SetupParameter

**Description:** Configurable parameters and their values required for equipment setup procedures and manufacturing processes

**Business Purpose:** Defines specific parameter values needed for equipment configuration to ensure consistent product quality and optimal process performance

**Data Governance:**
- **Data Owner:** Process Engineering Team
- **Update Frequency:** Updated when process parameters are optimized or product specifications change
- **Data Retention:** Maintained for product lifecycle plus 10 years for process validation and continuous improvement analysis
- **Security Classification:** Internal - Process parameter data with competitive and quality sensitivity

**Compliance Notes:** Process parameters must be validated and controlled for regulated manufacturing - changes require engineering approval and process validation

**System Integrations:** Equipment Control Systems, Process Control Software, Setup Sheets, Statistical Process Control

**Fields (9):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| setupSheetId | String | ✓ |  |  |  |
| parameterName | String | ✓ |  |  |  |
| targetValue | String | ✓ |  |  |  |
| tolerance | String |  |  |  |  |
| unit | String |  |  |  |  |
| equipmentSetting | String |  |  |  |  |
| verificationMethod | String |  |  |  |  |
| setupSheet | SetupSheet | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | SetupSheet | setupSheet | ✓ |  |

**Usage Examples:**

#### CNC machining parameters for critical aerospace component with tight tolerances

Critical spindle speed parameter for aerospace machining with tight tolerance control for surface finish and dimensional accuracy

```json
{
  "parameterId": "PARAM-CNC-001",
  "parameterName": "Spindle Speed",
  "parameterValue": 3200,
  "units": "RPM",
  "toleranceUpper": 3250,
  "toleranceLower": 3150,
  "parameterType": "MACHINING",
  "criticalityLevel": "CRITICAL"
}
```

#### Injection molding temperature parameter with process control limits

Injection molding temperature parameter with statistical process control for consistent part quality and material properties

```json
{
  "parameterId": "PARAM-MOLD-002",
  "parameterName": "Barrel Temperature Zone 1",
  "parameterValue": 285,
  "units": "°C",
  "toleranceUpper": 290,
  "toleranceLower": 280,
  "parameterType": "THERMAL",
  "controlChart": "ENABLED"
}
```

**Common Queries:**
- Retrieve parameter settings for equipment setup
- Track parameter variations for process optimization
- Generate parameter control charts for quality analysis

**Related Tables:** SetupStep, SetupExecution, ProcessDataCollection, OperationParameter

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** setupSheetId

---

### SetupTool

**Description:** Specific tools and equipment required for manufacturing setup procedures with specifications and usage requirements

**Business Purpose:** Ensures proper tool selection and availability for consistent setup execution and manufacturing quality

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Tool Management Teams
- **Update Frequency:** Updated when setup procedures change, tools are upgraded, or new equipment is introduced
- **Data Retention:** Maintained for equipment lifecycle plus 5 years for setup optimization and tool analysis
- **Security Classification:** Internal - Tool specifications and setup requirements

**Compliance Notes:** Setup tool specifications support process validation and ensure consistent manufacturing capability

**System Integrations:** Tool Management Systems, Setup Procedures, Equipment Management, Inventory Control

**Fields (9):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| setupSheetId | String | ✓ |  |  |  |
| toolId | String |  |  |  |  |
| toolName | String | ✓ |  |  |  |
| toolNumber | String |  |  |  |  |
| quantity | Int | ✓ | 1 |  |  |
| toolOffset | String |  |  |  |  |
| notes | String |  |  |  |  |
| setupSheet | SetupSheet | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | SetupSheet | setupSheet | ✓ |  |

**Usage Examples:**

#### CNC setup tooling with precision requirements and calibration specifications

Precision cutting tool for CNC setup with accuracy requirements and calibration specifications for aerospace machining

```json
{
  "setupToolId": "ST-CNC-001",
  "setupSheetId": "SETUP-CNC-TB-001",
  "toolDescription": "Precision Boring Head",
  "toolPartNumber": "SANDVIK-C4-391.01-16 050",
  "toolType": "CUTTING_TOOL",
  "requiredAccuracy": "±0.0001 inches",
  "speedRange": "500-3000 RPM",
  "toolOffsetNumber": "H01",
  "calibrationRequired": true,
  "calibrationInterval": 90,
  "storageLocation": "TOOL_CRIB_A-15",
  "usageInstructions": "Pre-set length and diameter before installation"
}
```

#### Assembly setup tool with torque specifications and safety requirements

Precision torque wrench for assembly setup with calibration requirements and operator certification for quality control

```json
{
  "setupToolId": "ST-ASSY-002",
  "setupSheetId": "SETUP-ASSY-ENGINE-001",
  "toolDescription": "Digital Torque Wrench",
  "toolPartNumber": "SNAP-ON-TECH3FR250",
  "toolType": "MEASUREMENT_TOOL",
  "torqueRange": "10-250 ft-lbs",
  "accuracy": "±2%",
  "calibrationRequired": true,
  "calibrationInterval": 365,
  "safetyRequirements": [
    "Calibration verification before use",
    "Proper grip technique"
  ],
  "certificationRequired": "Torque wrench operator training"
}
```

**Common Queries:**
- Find required tools for setup procedures
- Track tool calibration status for setup readiness
- Generate tool lists for setup planning and procurement

**Related Tables:** SetupSheet, Tool, ToolCalibrationRecord, SetupExecution

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** setupSheetId
- **Index:** toolId

---

### SetupExecution

**Description:** Execution records of manufacturing setup procedures tracking completion status, times, and operator verification

**Business Purpose:** Documents actual setup execution to ensure procedures are followed correctly, track setup efficiency, and maintain quality control compliance

**Data Governance:**
- **Data Owner:** Production Operations Team
- **Update Frequency:** Real-time updates during setup execution and completion verification
- **Data Retention:** Maintained for 3 years for setup optimization analysis and operator performance evaluation
- **Security Classification:** Internal - Production execution data with operational sensitivity

**Compliance Notes:** Setup execution records required for quality control and regulatory compliance - must include operator verification and timestamp documentation

**System Integrations:** Setup Sheets, Work Orders, Operator Training Records, Equipment Control Systems

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| setupSheetId | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| startedById | String | ✓ |  |  |  |
| startedAt | DateTime | ✓ | now( |  |  |
| completedById | String |  |  |  |  |
| completedAt | DateTime |  |  |  |  |
| actualSetupTime | Int |  |  |  |  |
| verificationData | Json |  |  |  |  |
| firstPieceResults | Json |  |  |  |  |
| status | WorkInstructionExecutionStatus | ✓ | IN_PROGRESS |  |  |
| completedBy | User |  |  |  |  |
| setupSheet | SetupSheet | ✓ |  |  |  |
| startedBy | User | ✓ |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | completedBy |  |  |
| one-to-one | SetupSheet | setupSheet | ✓ |  |
| one-to-one | User | startedBy | ✓ |  |

**Usage Examples:**

#### CNC machine setup execution with operator verification and time tracking

Completed CNC setup execution with 45-minute setup time and full operator verification for production readiness

```json
{
  "setupExecutionId": "EXEC-240330-001",
  "workOrderNumber": "WO-24-0156",
  "setupSheet": "SETUP-CNC-001",
  "operator": "J.Smith",
  "startTime": "2024-03-30T08:00:00Z",
  "completionTime": "2024-03-30T08:45:00Z",
  "setupStatus": "COMPLETE",
  "verificationComplete": true
}
```

#### Assembly line changeover execution with multiple operator involvement

Assembly line changeover with multiple operators, extended setup time, and quality verification signoff

```json
{
  "setupExecutionId": "EXEC-240330-002",
  "workOrderNumber": "WO-24-0157",
  "setupSheet": "SETUP-ASM-002",
  "primaryOperator": "M.Johnson",
  "supportOperators": [
    "K.Davis",
    "R.Wilson"
  ],
  "setupDurationMinutes": 65,
  "setupStatus": "COMPLETE",
  "qualitySignoff": true
}
```

**Common Queries:**
- Track setup times for production scheduling optimization
- Generate setup efficiency reports for continuous improvement
- Verify setup completion before production authorization

**Related Tables:** SetupSheet, SetupStep, WorkOrder, User, Equipment

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** setupSheetId
- **Index:** workOrderId

---

### InspectionPlan

**Description:** Quality inspection plans defining comprehensive inspection strategies, procedures, and acceptance criteria for manufacturing operations

**Business Purpose:** Ensures product quality and regulatory compliance by defining systematic inspection approaches with statistical sampling and measurement requirements

**Data Governance:**
- **Data Owner:** Quality Assurance and Manufacturing Engineering Teams
- **Update Frequency:** Updated when quality requirements change, new inspection methods are validated, or customer specifications are modified
- **Data Retention:** Permanent retention for quality validation and regulatory compliance
- **Security Classification:** Internal - Quality procedures and customer-specific inspection requirements

**Compliance Notes:** Critical for AS9102 FAI compliance, ISO 9001 quality planning, and ANSI/ASQ Z1.4 sampling standards

**System Integrations:** Quality Management, SPC Systems, FAI Reporting, Measurement Systems, Work Instructions

**Fields (42):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| documentNumber | String | ✓ |  |  |  |
| title | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| version | String | ✓ | 1.0.0 |  |  |
| status | WorkInstructionStatus | ✓ | DRAFT |  |  |
| effectiveDate | DateTime |  |  |  |  |
| supersededDate | DateTime |  |  |  |  |
| ecoNumber | String |  |  |  |  |
| partId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| inspectionType | InspectionType | ✓ |  |  |  |
| frequency | InspectionFrequency | ✓ |  |  |  |
| samplingPlan | Json |  |  |  |  |
| dispositionRules | Json |  |  |  |  |
| gageRRRequired | Boolean | ✓ | auto |  |  |
| gageRRFrequency | String |  |  |  |  |
| imageUrls | String[] | ✓ |  |  |  |
| videoUrls | String[] | ✓ |  |  |  |
| attachmentUrls | String[] | ✓ |  |  |  |
| tags | String[] | ✓ |  |  |  |
| categories | String[] | ✓ |  |  |  |
| keywords | String[] | ✓ |  |  |  |
| thumbnailUrl | String |  |  |  |  |
| parentVersionId | String |  |  |  |  |
| approvalWorkflowId | String |  |  |  |  |
| approvedById | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| approvalHistory | Json |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdById | String | ✓ |  |  |  |
| updatedById | String | ✓ |  |  |  |
| characteristics | InspectionCharacteristic[] | ✓ |  |  |  |
| executions | InspectionExecution[] | ✓ |  |  |  |
| approvedBy | User |  |  |  |  |
| createdBy | User | ✓ |  |  |  |
| parentVersion | InspectionPlan |  |  |  |  |
| childVersions | InspectionPlan[] | ✓ |  |  |  |
| updatedBy | User | ✓ |  |  |  |
| steps | InspectionStep[] | ✓ |  |  |  |
**Relationships (8):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | InspectionCharacteristic | characteristics | ✓ |  |
| one-to-many | InspectionExecution | executions | ✓ |  |
| one-to-one | User | approvedBy |  |  |
| one-to-one | User | createdBy | ✓ |  |
| one-to-one | InspectionPlan | parentVersion |  |  |
| one-to-many | InspectionPlan | childVersions | ✓ |  |
| one-to-one | User | updatedBy | ✓ |  |
| one-to-many | InspectionStep | steps | ✓ |  |

**Usage Examples:**

#### Aerospace component inspection plan

Critical aerospace inspection plan with statistical sampling and tight tolerance requirements for safety components

```json
{
  "planName": "Turbine Blade Critical Dimension Inspection",
  "partNumber": "TB-A380-001",
  "inspectionType": "RECEIVING_DIMENSIONAL",
  "inspectionFrequency": "EVERY_LOT",
  "sampleSize": 5,
  "sampleSizeJustification": "AQL 1.0 per ANSI/ASQ Z1.4 for critical safety components",
  "acceptanceCriteria": "All dimensions within ±0.001 inch tolerance",
  "inspectionMethod": "CMM_MEASUREMENT",
  "requiredCertifications": [
    "AS9102_FAI"
  ],
  "isActive": true
}
```

#### In-process quality control plan

In-process SPC monitoring plan for machining operations with real-time control and corrective actions

```json
{
  "planName": "Machining Process SPC Monitoring",
  "operation": "CNC_MILLING",
  "inspectionType": "IN_PROCESS_SPC",
  "inspectionFrequency": "EVERY_PART",
  "controlCharacteristics": [
    "SURFACE_FINISH",
    "DIMENSIONAL_ACCURACY"
  ],
  "spcControlLimits": "±3 sigma calculated from process capability study",
  "outOfControlActions": "Stop production, investigate root cause, adjust process parameters"
}
```

**Common Queries:**
- Generate inspection requirements for work orders
- Track inspection plan effectiveness and compliance
- Create FAI inspection plans for new products

**Related Tables:** InspectionCharacteristic, InspectionStep, SamplingPlan, FAIReport, QualityMeasurement

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentNumber
- **Index:** status
- **Index:** partId
- **Index:** operationId
- **Index:** inspectionType

---

### InspectionCharacteristic

**Description:** Specific measurable attributes and quality characteristics that must be inspected during quality control processes

**Business Purpose:** Defines what quality attributes must be measured and verified to ensure product conformance to specifications and regulatory requirements

**Data Governance:**
- **Data Owner:** Quality Engineering Team
- **Update Frequency:** Updated when product specifications change or new quality requirements are established
- **Data Retention:** Maintained for product lifecycle plus 10 years for quality system traceability and audit support
- **Security Classification:** Internal - Quality specification data with competitive and regulatory sensitivity

**Compliance Notes:** Inspection characteristics must align with customer specifications and regulatory standards (AS9100, ISO 9001, FDA) for compliance verification

**System Integrations:** Quality Plans, Inspection Equipment, Measurement Systems, Customer Quality Requirements

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| inspectionPlanId | String | ✓ |  |  |  |
| characteristicNumber | Int | ✓ |  |  |  |
| characteristicName | String | ✓ |  |  |  |
| measurementType | MeasurementType | ✓ |  |  |  |
| nominal | Float |  |  |  |  |
| upperLimit | Float |  |  |  |  |
| lowerLimit | Float |  |  |  |  |
| unit | String |  |  |  |  |
| measurementMethod | String |  |  |  |  |
| gageType | String |  |  |  |  |
| isCritical | Boolean | ✓ | auto |  |  |
| inspectionPlan | InspectionPlan | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | InspectionPlan | inspectionPlan | ✓ |  |

**Usage Examples:**

#### Critical dimensional characteristic for aerospace component with statistical process control

Critical aerospace dimension requiring 100% inspection with CMM measurement for tight tolerance verification

```json
{
  "characteristicId": "IC-AERO-001",
  "characteristicName": "Critical Bore Diameter",
  "measurementType": "DIMENSIONAL",
  "specification": "12.700 ±0.025 mm",
  "measurementMethod": "CMM",
  "sampleFrequency": "100%",
  "criticalityLevel": "CRITICAL"
}
```

#### Surface finish characteristic for medical device with specific measurement requirements

Medical device surface finish characteristic with specific measurement method and sampling strategy for biocompatibility

```json
{
  "characteristicId": "IC-MED-002",
  "characteristicName": "Implant Surface Roughness",
  "measurementType": "SURFACE_FINISH",
  "specification": "Ra 0.8 µm max",
  "measurementMethod": "PROFILOMETER",
  "sampleFrequency": "FIRST_ARTICLE_PLUS_SAMPLING",
  "criticalityLevel": "MAJOR"
}
```

**Common Queries:**
- Retrieve inspection characteristics for quality plan creation
- Generate inspection checklists for operator guidance
- Track characteristic measurement capability for process validation

**Related Tables:** InspectionPlan, QualityMeasurement, InspectionRecord, MeasurementEquipment

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** inspectionPlanId, characteristicNumber
- **Index:** inspectionPlanId

---

### InspectionStep

**Description:** Individual steps within inspection procedures defining specific measurement actions, acceptance criteria, and verification requirements

**Business Purpose:** Standardizes inspection procedures ensuring consistent quality verification and measurement traceability across all operators

**Data Governance:**
- **Data Owner:** Quality Engineering and Manufacturing Engineering Teams
- **Update Frequency:** Updated when inspection procedures change, measurement methods improve, or customer requirements are modified
- **Data Retention:** Maintained for product lifecycle plus 10 years for procedure validation and training records
- **Security Classification:** Internal - Quality procedures and measurement specifications

**Compliance Notes:** Inspection procedures must be validated and controlled for regulatory compliance - changes require quality approval

**System Integrations:** Inspection Plans, Quality Procedures, Measurement Equipment, Operator Training Systems

**Fields (8):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| inspectionPlanId | String | ✓ |  |  |  |
| stepNumber | Int | ✓ |  |  |  |
| title | String | ✓ |  |  |  |
| instructions | String | ✓ |  |  |  |
| characteristicRefs | Int[] | ✓ |  |  |  |
| imageUrls | String[] | ✓ |  |  |  |
| inspectionPlan | InspectionPlan | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | InspectionPlan | inspectionPlan | ✓ |  |

**Usage Examples:**

#### Critical dimension measurement step with CMM requirements and statistical analysis

Critical dimensional measurement step requiring CMM with specific measurement method and statistical capability requirements

```json
{
  "inspectionStepId": "IS-AERO-001",
  "inspectionPlanId": "IP-AERO-001",
  "stepNumber": 3,
  "stepDescription": "Measure critical bore diameter using CMM",
  "measurementType": "DIMENSIONAL",
  "requiredEquipment": "CMM_ZEISS_CONTURA",
  "specification": "12.700 ±0.025 mm",
  "measurementMethod": "3_POINT_CIRCLE",
  "acceptanceCriteria": "Within tolerance limits",
  "statisticalRequirement": "Cpk >= 1.33",
  "sampleFrequency": "100%",
  "estimatedTimeMinutes": 8
}
```

#### Surface finish inspection step with profilometer measurement and biocompatibility requirements

Medical device surface finish inspection with biocompatibility standards and cleanroom requirements

```json
{
  "inspectionStepId": "IS-MED-002",
  "inspectionPlanId": "IP-MED-002",
  "stepNumber": 5,
  "stepDescription": "Verify implant surface finish for biocompatibility",
  "measurementType": "SURFACE_FINISH",
  "requiredEquipment": "PROFILOMETER_TAYLOR_HOBSON",
  "specification": "Ra 0.8 µm max",
  "measurementMethod": "STYLUS_PROFILOMETRY",
  "biocompatibilityStandard": "ISO_10993",
  "cleanlinessRequired": "CLASS_100_CLEANROOM",
  "sampleFrequency": "FIRST_ARTICLE_PLUS_STATISTICAL"
}
```

**Common Queries:**
- Retrieve inspection procedures for operator training
- Generate inspection checklists for quality control
- Track inspection step completion times for efficiency analysis

**Related Tables:** InspectionPlan, InspectionExecution, MeasurementEquipment, QualityMeasurement

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** inspectionPlanId, stepNumber
- **Index:** inspectionPlanId

---

### InspectionExecution

**Description:** Execution records of quality inspection activities tracking inspector actions, measurement completion, and inspection results

**Business Purpose:** Documents actual inspection execution to ensure quality procedures are followed, maintain inspection traceability, and support regulatory compliance

**Data Governance:**
- **Data Owner:** Quality Control Team
- **Update Frequency:** Real-time updates during inspection activities and completion verification
- **Data Retention:** Permanent retention for quality traceability and regulatory audit support
- **Security Classification:** Internal - Quality execution data with regulatory and audit significance

**Compliance Notes:** Inspection execution records required for quality traceability and regulatory compliance - must include inspector certification and complete audit trail

**System Integrations:** Inspection Plans, Quality Measurements, Inspector Certification, Non-Conformance Systems

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| inspectionPlanId | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| lotNumber | String |  |  |  |  |
| serialNumber | String |  |  |  |  |
| inspectorId | String | ✓ |  |  |  |
| inspectedAt | DateTime | ✓ | now( |  |  |
| results | Json | ✓ |  |  |  |
| overallResult | InspectionResult | ✓ |  |  |  |
| defectsFound | Json |  |  |  |  |
| disposition | Disposition |  |  |  |  |
| signatureId | String |  |  |  |  |
| inspectionPlan | InspectionPlan | ✓ |  |  |  |
| inspector | User | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | InspectionPlan | inspectionPlan | ✓ |  |
| one-to-one | User | inspector | ✓ |  |

**Usage Examples:**

#### First article inspection execution for aerospace component with complete measurement verification

Complete first article inspection execution for aerospace component with certified inspector and full measurement completion

```json
{
  "inspectionExecutionId": "IE-240330-001",
  "inspectionPlan": "IP-AERO-001",
  "partNumber": "AERO-BRACKET-001",
  "inspector": "M.Rodriguez",
  "inspectorCertification": "LEVEL_II_CMM",
  "inspectionStartTime": "2024-03-30T09:00:00Z",
  "inspectionEndTime": "2024-03-30T11:30:00Z",
  "inspectionResult": "ACCEPT"
}
```

#### In-process inspection execution with sampling strategy and real-time results

In-process sampling inspection for production lot with statistical sampling strategy and lot acceptance decision

```json
{
  "inspectionExecutionId": "IE-240330-002",
  "inspectionPlan": "IP-PROD-002",
  "lotNumber": "LOT-240330-002",
  "inspector": "K.Thompson",
  "inspectionType": "SAMPLING",
  "sampleSize": 5,
  "totalPopulation": 100,
  "inspectionResult": "ACCEPT"
}
```

**Common Queries:**
- Track inspection completion for production releases
- Generate inspector performance reports for certification maintenance
- Analyze inspection cycle times for capacity planning

**Related Tables:** InspectionPlan, InspectionRecord, User, QualityMeasurement, NonConformanceReport

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** inspectionPlanId
- **Index:** workOrderId
- **Index:** inspectedAt

---

### StandardOperatingProcedure

**Description:** Standardized operating procedures providing detailed step-by-step instructions for manufacturing operations, safety protocols, and quality procedures

**Business Purpose:** Ensures consistent and safe execution of manufacturing operations while maintaining quality standards and regulatory compliance across all personnel

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Training Teams
- **Update Frequency:** Updated when processes change, safety requirements evolve, or continuous improvement modifications are implemented
- **Data Retention:** 7 years for training records and regulatory compliance
- **Security Classification:** Internal - Operational procedures and safety protocols

**Compliance Notes:** Critical for ISO 9001 process documentation, OSHA safety compliance, and training record requirements for regulated industries

**System Integrations:** Training Management, Work Instructions, Safety Management, Document Control, Electronic Signatures

**Fields (46):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| documentNumber | String | ✓ |  |  |  |
| title | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| version | String | ✓ | 1.0.0 |  |  |
| status | WorkInstructionStatus | ✓ | DRAFT |  |  |
| effectiveDate | DateTime |  |  |  |  |
| supersededDate | DateTime |  |  |  |  |
| ecoNumber | String |  |  |  |  |
| sopType | SOPType | ✓ |  |  |  |
| scope | String | ✓ |  |  |  |
| applicability | String |  |  |  |  |
| responsibleRoles | String[] | ✓ |  |  |  |
| references | Json |  |  |  |  |
| safetyWarnings | String[] | ✓ |  |  |  |
| requiredPPE | String[] | ✓ |  |  |  |
| emergencyProcedure | String |  |  |  |  |
| trainingRequired | Boolean | ✓ | auto |  |  |
| trainingFrequency | String |  |  |  |  |
| reviewFrequency | String |  |  |  |  |
| nextReviewDate | DateTime |  |  |  |  |
| imageUrls | String[] | ✓ |  |  |  |
| videoUrls | String[] | ✓ |  |  |  |
| attachmentUrls | String[] | ✓ |  |  |  |
| tags | String[] | ✓ |  |  |  |
| categories | String[] | ✓ |  |  |  |
| keywords | String[] | ✓ |  |  |  |
| thumbnailUrl | String |  |  |  |  |
| parentVersionId | String |  |  |  |  |
| approvalWorkflowId | String |  |  |  |  |
| approvedById | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| approvalHistory | Json |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdById | String | ✓ |  |  |  |
| updatedById | String | ✓ |  |  |  |
| acknowledgments | SOPAcknowledgment[] | ✓ |  |  |  |
| audits | SOPAudit[] | ✓ |  |  |  |
| steps | SOPStep[] | ✓ |  |  |  |
| approvedBy | User |  |  |  |  |
| createdBy | User | ✓ |  |  |  |
| parentVersion | StandardOperatingProcedure |  |  |  |  |
| childVersions | StandardOperatingProcedure[] | ✓ |  |  |  |
| updatedBy | User | ✓ |  |  |  |
**Relationships (8):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | SOPAcknowledgment | acknowledgments | ✓ |  |
| one-to-many | SOPAudit | audits | ✓ |  |
| one-to-many | SOPStep | steps | ✓ |  |
| one-to-one | User | approvedBy |  |  |
| one-to-one | User | createdBy | ✓ |  |
| one-to-one | StandardOperatingProcedure | parentVersion |  |  |
| one-to-many | StandardOperatingProcedure | childVersions | ✓ |  |
| one-to-one | User | updatedBy | ✓ |  |

**Usage Examples:**

#### CNC machining safety SOP

Safety-focused SOP for CNC operations with hazard identification, PPE requirements, and certification prerequisites

```json
{
  "sopNumber": "SOP-MACH-001",
  "sopTitle": "CNC Machining Center Safe Operation",
  "sopType": "SAFETY_PROCEDURE",
  "version": "3.2",
  "effectiveDate": "2024-03-01T00:00:00Z",
  "reviewFrequency": "ANNUAL",
  "trainingRequired": true,
  "competencyRequired": "CNC_OPERATOR_CERTIFIED",
  "hazards": [
    "Rotating machinery",
    "Metal chips",
    "Coolant exposure"
  ],
  "ppe": [
    "Safety glasses",
    "Steel-toed boots",
    "Cut-resistant gloves"
  ],
  "isActive": true
}
```

#### Quality inspection SOP

Precision measurement SOP with environmental controls and calibration requirements for quality assurance

```json
{
  "sopNumber": "SOP-QUAL-005",
  "sopTitle": "Coordinate Measuring Machine Operation",
  "sopType": "QUALITY_PROCEDURE",
  "inspectionEquipment": "CMM-LAB-001",
  "calibrationRequired": true,
  "measurementUncertainty": "±0.0002 inches",
  "environmentalControls": "Temperature 68°F ±2°F, relative humidity <50%",
  "dataRecordingMethod": "Electronic capture to quality database"
}
```

**Common Queries:**
- Generate training requirements for personnel certification
- Track SOP compliance and acknowledgment status
- Find applicable SOPs for specific operations or equipment

**Related Tables:** SOPStep, SOPAcknowledgment, WorkInstruction, TrainingRecord, ElectronicSignature

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentNumber
- **Index:** status
- **Index:** sopType
- **Index:** nextReviewDate

---

### SOPStep

**Description:** Individual steps within Standard Operating Procedures defining specific actions, safety requirements, and process controls

**Business Purpose:** Ensures consistent execution of critical manufacturing processes through standardized procedures and safety protocols

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and Safety Teams
- **Update Frequency:** Updated when processes change, safety requirements are modified, or continuous improvement opportunities are identified
- **Data Retention:** Maintained for equipment lifecycle plus 7 years for training validation and safety compliance
- **Security Classification:** Internal - Manufacturing procedures and safety protocols

**Compliance Notes:** SOP procedures critical for safety compliance, regulatory requirements, and process validation - changes require approval

**System Integrations:** Standard Operating Procedures, Training Systems, Safety Management, Process Control Systems

**Fields (10):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| sopId | String | ✓ |  |  |  |
| stepNumber | Int | ✓ |  |  |  |
| title | String | ✓ |  |  |  |
| instructions | String | ✓ |  |  |  |
| isWarning | Boolean | ✓ | auto |  |  |
| isCritical | Boolean | ✓ | auto |  |  |
| imageUrls | String[] | ✓ |  |  |  |
| videoUrls | String[] | ✓ |  |  |  |
| sop | StandardOperatingProcedure | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | StandardOperatingProcedure | sop | ✓ |  |

**Usage Examples:**

#### CNC machine startup procedure step with safety interlocks and verification requirements

Critical safety verification step in CNC startup procedure with mandatory testing and PPE requirements

```json
{
  "sopStepId": "SOP-CNC-STARTUP-001",
  "sopId": "SOP-CNC-STARTUP",
  "stepNumber": 2,
  "stepDescription": "Verify safety interlocks and emergency stops",
  "stepType": "SAFETY_VERIFICATION",
  "safetyRequirements": [
    "Check emergency stop functionality",
    "Verify guard interlocks",
    "Test light curtains"
  ],
  "verificationRequired": true,
  "verificationMethod": "PHYSICAL_TEST",
  "estimatedTimeMinutes": 5,
  "criticalSafetyStep": true,
  "requiredPPE": [
    "Safety glasses",
    "Steel-toed boots"
  ],
  "prerequisiteSteps": [
    "Power-on sequence completed"
  ]
}
```

#### Chemical handling procedure step with environmental controls and disposal requirements

Environmental compliance step for chemical waste disposal with regulatory requirements and training prerequisites

```json
{
  "sopStepId": "SOP-CHEM-HANDLE-003",
  "sopId": "SOP-CHEMICAL-HANDLING",
  "stepNumber": 7,
  "stepDescription": "Dispose of waste chemicals according to environmental regulations",
  "stepType": "WASTE_DISPOSAL",
  "environmentalControls": [
    "Fume hood operation",
    "Secondary containment",
    "Spill kit availability"
  ],
  "regulatoryCompliance": [
    "EPA_RCRA",
    "DOT_HAZMAT"
  ],
  "requiredTraining": [
    "HAZMAT_CERTIFICATION",
    "ENVIRONMENTAL_AWARENESS"
  ],
  "disposalMethod": "LICENSED_WASTE_CONTRACTOR",
  "documentationRequired": "Waste manifest completion"
}
```

**Common Queries:**
- Retrieve SOP procedures for operator training and certification
- Track procedure compliance for safety audits
- Generate training materials from standardized procedures

**Related Tables:** StandardOperatingProcedure, SOPExecution, SafetyRequirement, TrainingRecord

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** sopId, stepNumber
- **Index:** sopId

---

### SOPAcknowledgment

**Description:** Employee acknowledgment and compliance records for Standard Operating Procedure training and understanding verification

**Business Purpose:** Ensures all personnel have received, understood, and acknowledged critical safety and operational procedures for regulatory compliance

**Data Governance:**
- **Data Owner:** Training and Safety Management Teams
- **Update Frequency:** Updated when employees complete SOP training, acknowledgments are recorded, or retraining occurs
- **Data Retention:** Permanent retention for safety compliance and training audit requirements
- **Security Classification:** Internal - Training records with regulatory and liability significance

**Compliance Notes:** SOP acknowledgments critical for safety compliance and regulatory requirements - maintains proof of training for audits

**System Integrations:** Training Management Systems, Safety Management, Electronic Signature Systems, Compliance Reporting

**Fields (11):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| sopId | String | ✓ |  |  |  |
| userId | String | ✓ |  |  |  |
| userName | String | ✓ |  |  |  |
| acknowledgedAt | DateTime | ✓ | now( |  |  |
| trainingCompletedAt | DateTime |  |  |  |  |
| assessmentScore | Float |  |  |  |  |
| assessmentPassed | Boolean |  |  |  |  |
| signatureId | String |  |  |  |  |
| sop | StandardOperatingProcedure | ✓ |  |  |  |
| user | User | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | StandardOperatingProcedure | sop | ✓ |  |
| one-to-one | User | user | ✓ |  |

**Usage Examples:**

#### Critical safety procedure acknowledgment with electronic signature and comprehension verification

Critical lockout/tagout safety procedure acknowledgment with biometric signature and high comprehension test score

```json
{
  "acknowledgmentId": "SOPA-240330-001",
  "sopId": "SOP-LOCKOUT-TAGOUT",
  "employeeId": "EMP-001234",
  "acknowledgmentDate": "2024-03-30T10:30:00Z",
  "trainingSessionId": "TS-LOTO-240330-001",
  "acknowledmentType": "INITIAL_TRAINING",
  "electronicSignature": "BIOMETRIC_VERIFIED",
  "comprehensionTest": "PASSED",
  "testScore": 95,
  "instructorId": "INSTRUCTOR_WILSON",
  "nextRetrainingDue": "2025-03-30T00:00:00Z",
  "criticalSafetyProcedure": true
}
```

#### Chemical handling procedure acknowledgment with specialized training and certification requirements

Annual hazmat handling retraining with practical demonstration and emergency procedure verification for regulatory compliance

```json
{
  "acknowledgmentId": "SOPA-240330-002",
  "sopId": "SOP-HAZMAT-HANDLING",
  "employeeId": "EMP-005678",
  "acknowledgmentDate": "2024-03-30T14:00:00Z",
  "acknowledmentType": "ANNUAL_RETRAINING",
  "specialTrainingRequired": "HAZMAT_CERTIFICATION",
  "regulatoryCompliance": [
    "OSHA_1910",
    "EPA_RCRA"
  ],
  "practicalDemonstration": "COMPLETED",
  "emergencyProcedures": "VERIFIED",
  "nextAuditDue": "2024-09-30T00:00:00Z"
}
```

**Common Queries:**
- Track employee SOP acknowledgment status for compliance audits
- Identify personnel requiring retraining or certification renewal
- Generate training compliance reports for regulatory submissions

**Related Tables:** StandardOperatingProcedure, User, TrainingRecord, ElectronicSignature

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** sopId, userId
- **Index:** sopId
- **Index:** userId

---

### SOPAudit

**Description:** Compliance audit records for Standard Operating Procedure adherence verification and corrective action tracking

**Business Purpose:** Ensures ongoing compliance with established procedures through systematic auditing and continuous improvement of safety and operational practices

**Data Governance:**
- **Data Owner:** Quality Assurance and Safety Audit Teams
- **Update Frequency:** Updated during scheduled audits, compliance verification activities, and corrective action implementation
- **Data Retention:** 10 years for regulatory compliance and audit trail requirements
- **Security Classification:** Internal - Audit findings with regulatory and liability significance

**Compliance Notes:** SOP audits essential for regulatory compliance verification and maintaining safety management system effectiveness

**System Integrations:** Audit Management Systems, Corrective Action Systems, Training Management, Compliance Reporting

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| sopId | String | ✓ |  |  |  |
| auditDate | DateTime | ✓ |  |  |  |
| auditorId | String | ✓ |  |  |  |
| auditorName | String | ✓ |  |  |  |
| complianceChecks | Json | ✓ |  |  |  |
| overallCompliance | Boolean | ✓ |  |  |  |
| findingsCount | Int | ✓ | auto |  |  |
| findings | String |  |  |  |  |
| correctiveActions | Json |  |  |  |  |
| auditor | User | ✓ |  |  |  |
| sop | StandardOperatingProcedure | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | auditor | ✓ |  |
| one-to-one | StandardOperatingProcedure | sop | ✓ |  |

**Usage Examples:**

#### Safety procedure compliance audit with findings and corrective action requirements

Scheduled confined space safety audit with minor non-compliance finding requiring corrective action within 15 days

```json
{
  "auditId": "SOPA-AUDIT-240330-001",
  "sopId": "SOP-CONFINED-SPACE",
  "auditDate": "2024-03-30T09:00:00Z",
  "auditorId": "AUDITOR_MARTINEZ",
  "auditType": "SCHEDULED_COMPLIANCE",
  "auditScope": "Confined space entry procedures and emergency response",
  "observationsCount": 3,
  "findingsCount": 1,
  "nonComplianceLevel": "MINOR",
  "correctiveActionRequired": true,
  "correctiveActionDue": "2024-04-15T00:00:00Z",
  "auditResult": "SATISFACTORY_WITH_IMPROVEMENTS",
  "nextAuditDue": "2024-09-30T00:00:00Z"
}
```

#### Chemical handling audit with regulatory compliance verification and training assessment

Regulatory compliance audit for chemical storage with excellent rating and identification of best practices for sharing

```json
{
  "auditId": "SOPA-AUDIT-240330-002",
  "sopId": "SOP-CHEMICAL-STORAGE",
  "auditDate": "2024-03-30T14:30:00Z",
  "auditorId": "AUDITOR_THOMPSON",
  "auditType": "REGULATORY_COMPLIANCE",
  "regulatoryStandard": "EPA_RCRA",
  "auditScope": "Chemical storage procedures and documentation",
  "personnelInterviewed": 4,
  "documentationReviewed": 12,
  "physicalInspection": "COMPLETED",
  "complianceRating": "FULLY_COMPLIANT",
  "bestPracticesIdentified": 2,
  "auditResult": "EXCELLENT"
}
```

**Common Queries:**
- Track SOP compliance audit results for regulatory reporting
- Monitor corrective action completion for audit findings
- Generate audit trend analysis for continuous improvement

**Related Tables:** StandardOperatingProcedure, User, CorrectiveAction, AuditReport

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** sopId
- **Index:** auditDate

---

### ToolDrawing

**Description:** Engineering drawings and technical specifications for manufacturing tools, fixtures, and production equipment

**Business Purpose:** Provides complete technical documentation for tool design, manufacturing, maintenance, and quality control of production tooling

**Data Governance:**
- **Data Owner:** Tool Design Engineering and Manufacturing Engineering Teams
- **Update Frequency:** Updated when tool designs change, revisions are required, or engineering improvements are implemented
- **Data Retention:** Maintained for tool lifecycle plus 10 years for design validation and improvement analysis
- **Security Classification:** Confidential - Proprietary tool designs and manufacturing specifications

**Compliance Notes:** Tool drawings must be controlled and validated for manufacturing repeatability and quality assurance

**System Integrations:** CAD Systems, Tool Management, Engineering Change Control, Manufacturing Systems

**Fields (58):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| documentNumber | String | ✓ |  |  |  |
| title | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| version | String | ✓ | 1.0.0 |  |  |
| status | WorkInstructionStatus | ✓ | DRAFT |  |  |
| effectiveDate | DateTime |  |  |  |  |
| supersededDate | DateTime |  |  |  |  |
| ecoNumber | String |  |  |  |  |
| toolType | ToolType | ✓ |  |  |  |
| toolSubtype | String |  |  |  |  |
| dimensions | Json |  |  |  |  |
| material | String |  |  |  |  |
| weight | Float |  |  |  |  |
| weightUnit | String |  |  |  |  |
| vendorId | String |  |  |  |  |
| vendorName | String |  |  |  |  |
| vendorPartNumber | String |  |  |  |  |
| catalogNumber | String |  |  |  |  |
| cost | Float |  |  |  |  |
| costCurrency | String |  |  |  |  |
| applicablePartIds | String[] | ✓ |  |  |  |
| applicableOperations | String[] | ✓ |  |  |  |
| usageInstructions | String |  |  |  |  |
| maintenanceProcedure | String |  |  |  |  |
| requiresCalibration | Boolean | ✓ | auto |  |  |
| calibrationInterval | Int |  |  |  |  |
| lastCalibrationDate | DateTime |  |  |  |  |
| nextCalibrationDate | DateTime |  |  |  |  |
| storageLocation | String |  |  |  |  |
| quantityOnHand | Int |  |  |  |  |
| minimumQuantity | Int |  |  |  |  |
| cadFileUrls | String[] | ✓ |  |  |  |
| imageUrls | String[] | ✓ |  |  |  |
| videoUrls | String[] | ✓ |  |  |  |
| attachmentUrls | String[] | ✓ |  |  |  |
| tags | String[] | ✓ |  |  |  |
| categories | String[] | ✓ |  |  |  |
| keywords | String[] | ✓ |  |  |  |
| thumbnailUrl | String |  |  |  |  |
| parentVersionId | String |  |  |  |  |
| approvalWorkflowId | String |  |  |  |  |
| approvedById | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| approvalHistory | Json |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdById | String | ✓ |  |  |  |
| updatedById | String | ✓ |  |  |  |
| calibrationRecords | ToolCalibrationRecord[] | ✓ |  |  |  |
| approvedBy | User |  |  |  |  |
| createdBy | User | ✓ |  |  |  |
| parentVersion | ToolDrawing |  |  |  |  |
| childVersions | ToolDrawing[] | ✓ |  |  |  |
| updatedBy | User | ✓ |  |  |  |
| maintenanceRecords | ToolMaintenanceRecord[] | ✓ |  |  |  |
| usageLogs | ToolUsageLog[] | ✓ |  |  |  |
**Relationships (8):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | ToolCalibrationRecord | calibrationRecords | ✓ |  |
| one-to-one | User | approvedBy |  |  |
| one-to-one | User | createdBy | ✓ |  |
| one-to-one | ToolDrawing | parentVersion |  |  |
| one-to-many | ToolDrawing | childVersions | ✓ |  |
| one-to-one | User | updatedBy | ✓ |  |
| one-to-many | ToolMaintenanceRecord | maintenanceRecords | ✓ |  |
| one-to-many | ToolUsageLog | usageLogs | ✓ |  |

**Usage Examples:**

#### CNC fixture drawing with precision specifications and assembly instructions

Precision machining fixture drawing with tight tolerance requirements and assembly specifications for aerospace component

```json
{
  "drawingNumber": "TD-FIXTURE-TB-001",
  "drawingTitle": "Turbine Blade Machining Fixture",
  "partNumber": "FIXTURE-TB-A380-001",
  "revision": "C",
  "designEngineer": "J.Peterson",
  "drawingType": "ASSEMBLY_DRAWING",
  "materialSpecification": "7075-T6 Aluminum",
  "criticalDimensions": [
    "Locating pin positions ±0.0001",
    "Clamping force 500 ±50 lbs"
  ],
  "assemblyInstructions": "Torque clamp bolts to 25 ft-lbs in cross pattern",
  "qualityRequirements": "CMM verification required for all critical dimensions"
}
```

#### Inspection gauge drawing with calibration specifications and measurement uncertainty

Medical device inspection gauge with FDA compliance requirements and NIST traceability for regulatory validation

```json
{
  "drawingNumber": "TD-GAUGE-MD-002",
  "drawingTitle": "Medical Implant Go/No-Go Gauge",
  "partNumber": "GAUGE-MD-IMPLANT-002",
  "revision": "B",
  "drawingType": "DETAIL_DRAWING",
  "materialSpecification": "Tool Steel A2 Hardened",
  "gaugeTolerance": "±0.0002 inches",
  "calibrationRequirement": "Traceable to NIST standards",
  "measurementUncertainty": "±0.00005 inches",
  "fdaCompliance": "21_CFR_PART_820",
  "inspectionFrequency": "Annual calibration required"
}
```

**Common Queries:**
- Retrieve tool specifications for manufacturing and maintenance
- Track drawing revisions for change control
- Generate tool procurement specifications from drawings

**Related Tables:** Tool, EngineeringDrawing, ToolCalibrationRecord, ToolMaintenanceRecord

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentNumber
- **Index:** status
- **Index:** toolType
- **Index:** vendorId
- **Index:** nextCalibrationDate

---

### ToolMaintenanceRecord

**Description:** Tool and equipment maintenance records tracking service history, repairs, and lifecycle management for manufacturing assets

**Business Purpose:** Ensures equipment reliability and compliance through systematic maintenance tracking, extending asset life and preventing production disruptions

**Data Governance:**
- **Data Owner:** Maintenance Engineering and Asset Management Teams
- **Update Frequency:** Updated after each maintenance activity with complete service documentation
- **Data Retention:** Asset lifetime plus 5 years for warranty and regulatory compliance
- **Security Classification:** Internal - Equipment maintenance and asset management data

**Compliance Notes:** Maintenance records support asset management requirements and provide documentation for regulatory compliance and warranty claims

**System Integrations:** Asset Management, Maintenance Scheduling, Equipment Control, Cost Accounting, Supplier Management

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| toolDrawingId | String | ✓ |  |  |  |
| maintenanceDate | DateTime | ✓ |  |  |  |
| performedById | String | ✓ |  |  |  |
| performedByName | String | ✓ |  |  |  |
| maintenanceType | MaintenanceType | ✓ |  |  |  |
| description | String | ✓ |  |  |  |
| partsReplaced | Json |  |  |  |  |
| cost | Float |  |  |  |  |
| toolConditionBefore | String |  |  |  |  |
| toolConditionAfter | String |  |  |  |  |
| performedBy | User | ✓ |  |  |  |
| toolDrawing | ToolDrawing | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | performedBy | ✓ |  |
| one-to-one | ToolDrawing | toolDrawing | ✓ |  |

**Usage Examples:**

#### CNC spindle rebuild maintenance

Major spindle overhaul with certified technician, detailed parts list, cost tracking, and quality verification

```json
{
  "maintenanceRecordId": "TMR-240325-001",
  "equipmentId": "CNC-MILL-001",
  "toolComponent": "MAIN_SPINDLE",
  "maintenanceType": "MAJOR_OVERHAUL",
  "scheduledDate": "2024-03-25T18:00:00Z",
  "actualStartTime": "2024-03-25T18:00:00Z",
  "actualEndTime": "2024-03-26T08:00:00Z",
  "maintenanceProvider": "SPINDLE_SPECIALISTS_INC",
  "technicianCertification": "SPINDLE_REBUILD_CERTIFIED",
  "workPerformed": "Complete spindle disassembly, bearing replacement, dynamic balancing, reassembly",
  "partsReplaced": [
    "Bearings - NSK 7020",
    "Seals - SKF 25x40x7",
    "Coolant fitting"
  ],
  "totalCost": 8500,
  "laborHours": 14,
  "warrantyPeriod": "12 months",
  "nextServiceDue": "2024-09-25T00:00:00Z",
  "qualityCheck": "Vibration test passed - 0.02mm maximum deviation"
}
```

#### CMM routine calibration

Precision measurement equipment calibration with NIST traceability and uncertainty verification for quality compliance

```json
{
  "maintenanceRecordId": "TMR-240325-005",
  "equipmentId": "CMM-LAB-001",
  "maintenanceType": "CALIBRATION",
  "scheduledDate": "2024-03-25T17:00:00Z",
  "calibrationProvider": "NIST_TRACEABLE_LAB",
  "certificateNumber": "CAL-2024-005678",
  "calibrationStandard": "NIST_SRM_2060",
  "measurementUncertainty": "±0.0001 inches",
  "temperatureCompensation": "Verified and adjusted",
  "probeCalibration": "All 5 probes calibrated and certified",
  "softwareVersion": "CALYPSO_2024.1",
  "calibrationResults": "PASS",
  "nextCalibrationDue": "2025-03-25T00:00:00Z",
  "costCenter": "QUALITY_LAB"
}
```

**Common Queries:**
- Track maintenance history for equipment reliability analysis
- Generate maintenance cost reports for budget planning
- Schedule preventive maintenance based on usage and history

**Related Tables:** Equipment, MaintenanceSchedule, CalibrationRecord, AssetLifecycle, CostCenter

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** toolDrawingId
- **Index:** maintenanceDate

---

### ToolCalibrationRecord

**Description:** Tool and measurement equipment calibration records maintaining traceability and accuracy verification for quality assurance and regulatory compliance

**Business Purpose:** Ensures measurement accuracy and regulatory compliance by tracking calibration status, maintaining traceability to standards, and scheduling recalibration

**Data Governance:**
- **Data Owner:** Quality Engineering and Metrology Teams
- **Update Frequency:** Updated after each calibration event with traceability information and next due dates
- **Data Retention:** 7 years for measurement traceability and regulatory compliance
- **Security Classification:** Internal - Calibration data and measurement system information

**Compliance Notes:** Critical for ISO 9001 measurement system requirements, AS9102 FAI traceability, and customer-specific calibration standards

**System Integrations:** Quality Management, Equipment Management, Metrology Systems, Calibration Services, Work Instructions

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| toolDrawingId | String | ✓ |  |  |  |
| calibrationDate | DateTime | ✓ |  |  |  |
| performedById | String | ✓ |  |  |  |
| performedByName | String | ✓ |  |  |  |
| calibrationResults | Json | ✓ |  |  |  |
| passed | Boolean | ✓ |  |  |  |
| certificationNumber | String |  |  |  |  |
| certificateUrl | String |  |  |  |  |
| nextDueDate | DateTime | ✓ |  |  |  |
| performedBy | User | ✓ |  |  |  |
| toolDrawing | ToolDrawing | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | performedBy | ✓ |  |
| one-to-one | ToolDrawing | toolDrawing | ✓ |  |

**Usage Examples:**

#### CMM calibration record

Precision CMM calibration with NIST traceability and environmental control requirements for aerospace measurements

```json
{
  "equipmentId": "CMM-LAB-001",
  "calibrationDate": "2024-03-15T00:00:00Z",
  "calibrationDueDate": "2025-03-15T00:00:00Z",
  "calibrationProvider": "NIST Traceable Calibration Lab",
  "certificateNumber": "CAL-2024-001234",
  "calibrationStandard": "NIST_SRM_2060",
  "uncertaintyValue": "±0.0001",
  "uncertaintyUnit": "INCHES",
  "temperatureRange": "68°F ±2°F",
  "humidityRange": "45-55% RH",
  "calibrationResults": "PASS",
  "adjustmentsMade": false,
  "nextCalibrationDate": "2025-03-15T00:00:00Z",
  "isActive": true
}
```

#### Torque wrench calibration record

Torque tool calibration with multiple point verification and accuracy specification for critical assembly operations

```json
{
  "equipmentId": "TORQUE-001",
  "toolDescription": "Digital Torque Wrench 0-50 Nm",
  "calibrationDate": "2024-03-01T00:00:00Z",
  "calibrationDueDate": "2024-09-01T00:00:00Z",
  "calibrationInterval": 6,
  "intervalUnit": "MONTHS",
  "accuracySpecification": "±2% of reading",
  "calibrationResults": "PASS",
  "calibrationPoints": [
    5,
    15,
    25,
    35,
    45
  ],
  "calibrationPointUnit": "NM",
  "maxDeviation": 0.3,
  "maxDeviationUnit": "NM"
}
```

**Common Queries:**
- Track calibration due dates for preventive scheduling
- Generate calibration certificates for customer requirements
- Validate measurement equipment status for work orders

**Related Tables:** MeasurementEquipment, QualityCharacteristic, OperationGaugeRequirement, InspectionPlan, CalibrationSchedule

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** toolDrawingId
- **Index:** calibrationDate

---

### ToolUsageLog

**Description:** Comprehensive usage tracking and lifecycle management for manufacturing tools including utilization, performance, and maintenance history

**Business Purpose:** Optimizes tool utilization, predicts maintenance needs, and ensures quality control through complete tool lifecycle tracking

**Data Governance:**
- **Data Owner:** Tool Management and Manufacturing Engineering Teams
- **Update Frequency:** Real-time logging of tool usage events, performance metrics, and lifecycle milestones
- **Data Retention:** 5 years for tool lifecycle analysis and maintenance optimization
- **Security Classification:** Internal - Tool performance data with operational and competitive significance

**Compliance Notes:** Tool usage tracking supports quality control validation and process capability verification for regulatory compliance

**System Integrations:** Tool Management Systems, Equipment Control, Maintenance Systems, Quality Control

**Fields (11):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| toolDrawingId | String | ✓ |  |  |  |
| usedAt | DateTime | ✓ | now( |  |  |
| usedById | String | ✓ |  |  |  |
| usedByName | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| usageDuration | Int |  |  |  |  |
| conditionAfterUse | String |  |  |  |  |
| toolDrawing | ToolDrawing | ✓ |  |  |  |
| usedBy | User | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | ToolDrawing | toolDrawing | ✓ |  |
| one-to-one | User | usedBy | ✓ |  |

**Usage Examples:**

#### Precision cutting tool usage tracking with performance monitoring and wear analysis

Precision titanium cutting operation with tool wear monitoring showing optimal performance and good condition

```json
{
  "usageLogId": "TUL-240330-001",
  "toolId": "TOOL-CARBIDE-001",
  "toolSerialNumber": "CC-240225-001",
  "equipmentId": "CNC-MILL-001",
  "workOrderNumber": "WO-24-0156",
  "usageStartTime": "2024-03-30T09:15:00Z",
  "usageEndTime": "2024-03-30T11:45:00Z",
  "operationTime": 150,
  "operationTimeUnit": "MINUTES",
  "materialCut": "Ti-6Al-4V",
  "partsCut": 5,
  "toolWearMeasurement": 0.0015,
  "toolCondition": "GOOD",
  "performanceRating": "OPTIMAL"
}
```

#### Assembly tool usage with torque verification and calibration status tracking

Assembly torque tool usage with precision torque applications and current calibration status verification

```json
{
  "usageLogId": "TUL-240330-002",
  "toolId": "TOOL-TORQUE-WRENCH-001",
  "toolSerialNumber": "TW-240101-005",
  "workOrderNumber": "WO-24-0158",
  "usageStartTime": "2024-03-30T13:30:00Z",
  "usageEndTime": "2024-03-30T15:00:00Z",
  "operationType": "ASSEMBLY_TORQUING",
  "torqueApplications": 24,
  "averageTorque": 125.5,
  "torqueRange": "120-130 ft-lbs",
  "calibrationStatus": "CURRENT",
  "lastCalibrationDate": "2024-03-15T00:00:00Z",
  "nextCalibrationDue": "2024-09-15T00:00:00Z"
}
```

**Common Queries:**
- Track tool utilization for replacement planning and optimization
- Monitor tool performance for quality control and process validation
- Generate tool lifecycle reports for cost analysis and procurement

**Related Tables:** Tool, ToolMaintenanceRecord, ToolCalibrationRecord, Equipment

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** toolDrawingId
- **Index:** usedAt

---

### DocumentTemplate

**Description:** Standardized document templates for creating consistent manufacturing documents, forms, and reports

**Business Purpose:** Provides reusable document structures and formatting to ensure consistency, compliance, and efficiency in document creation across manufacturing operations

**Data Governance:**
- **Data Owner:** Quality Management and Document Control Teams
- **Update Frequency:** Updated when document standards change or new template requirements are identified
- **Data Retention:** Permanent retention for template library and version history
- **Security Classification:** Internal - Contains document structure and formatting standards

**Compliance Notes:** Templates must comply with regulatory document requirements (AS9100, ISO 9001, FDA) and corporate documentation standards

**System Integrations:** Document Management System, Form Generation Tools, Report Generation, Quality Management

**Fields (18):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| name | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| documentType | DocumentType | ✓ |  |  |  |
| templateData | Json | ✓ |  |  |  |
| defaultValues | Json |  |  |  |  |
| isPublic | Boolean | ✓ | auto |  |  |
| isSystemTemplate | Boolean | ✓ | auto |  |  |
| tags | String[] | ✓ |  |  |  |
| category | String |  |  |  |  |
| usageCount | Int | ✓ | auto |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdById | String | ✓ |  |  |  |
| updatedById | String | ✓ |  |  |  |
| createdBy | User | ✓ |  |  |  |
| updatedBy | User | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | createdBy | ✓ |  |
| one-to-one | User | updatedBy | ✓ |  |

**Usage Examples:**

#### Quality inspection report template

Standardized template for generating dimensional inspection reports with consistent format

```json
{
  "name": "Dimensional Inspection Report",
  "documentType": "QUALITY_REPORT",
  "category": "INSPECTION",
  "isSystemTemplate": true,
  "isActive": true
}
```

#### Work instruction template

Reusable template for creating consistent work instructions across manufacturing operations

```json
{
  "name": "Manufacturing Work Instruction",
  "documentType": "WORK_INSTRUCTION",
  "category": "MANUFACTURING",
  "isPublic": true,
  "usageCount": 150
}
```

**Common Queries:**
- Find available templates by document type
- Generate new documents from templates
- Track template usage and effectiveness

**Related Tables:** User, DocumentComment, DocumentActivity

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentType
- **Index:** isPublic
- **Index:** category

---

### UserWorkstationPreference

**Description:** User-specific workstation display and interface preferences for optimized work instruction execution and system interaction

**Business Purpose:** Enhances operator productivity and ergonomics by providing customizable interface layouts and display configurations

**Data Governance:**
- **Data Owner:** Manufacturing Engineering and User Experience Teams
- **Update Frequency:** Updated as users modify their interface preferences and workstation configurations
- **Data Retention:** 5 years for user experience analysis and interface optimization
- **Security Classification:** Internal - User interface preferences and productivity optimization data

**Compliance Notes:** Interface configurations should maintain regulatory compliance and safety visibility requirements

**System Integrations:** Work Instruction Systems, Display Management, Ergonomics Analysis, User Interface Systems

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| userId | String | ✓ |  |  |  |
| workstationId | String |  |  |  |  |
| layoutMode | LayoutMode | ✓ | SPLIT_VERTICAL |  |  |
| splitRatio | Float |  | 0.6 |  |  |
| panelPosition | PanelPosition |  | LEFT |  |  |
| autoAdvanceSteps | Boolean | ✓ | auto |  |  |
| showStepTimer | Boolean | ✓ | true |  |  |
| compactMode | Boolean | ✓ | auto |  |  |
| useSecondMonitor | Boolean | ✓ | auto |  |  |
| secondMonitorPosition | Json |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |

**Usage Examples:**

#### Dual monitor machining operator setup

Machining operator configuration with dual monitors and automatic step advancement for efficiency

```json
{
  "userId": "EMP-001234",
  "workstationId": "CNC-WS-001",
  "layoutMode": "SPLIT_VERTICAL",
  "splitRatio": 0.7,
  "useSecondMonitor": true,
  "autoAdvanceSteps": true,
  "showStepTimer": true
}
```

#### Compact inspection workstation

Quality inspector setup with compact layout optimized for inspection workflow

```json
{
  "userId": "QA-INSP-001",
  "workstationId": "QC-WS-001",
  "layoutMode": "COMPACT",
  "compactMode": true,
  "panelPosition": "RIGHT",
  "showStepTimer": false
}
```

**Common Queries:**
- Load user preferences for workstation initialization
- Analyze interface usage patterns for optimization
- Track productivity improvements from preference customization

**Related Tables:** User, WorkInstruction, WorkstationDisplayConfig

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** userId, workstationId
- **Index:** userId
- **Index:** workstationId

---

### WorkstationDisplayConfig

**Description:** Workstation Display Config - Physical display configuration for workstations

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workstationId | String | ✓ |  |  |  |
| screenWidth | Int |  |  |  |  |
| screenHeight | Int |  |  |  |  |
| isMultiMonitor | Boolean | ✓ | auto |  |  |
| monitorCount | Int | ✓ | 1 |  |  |
| forcedLayout | LayoutMode |  |  |  |  |
| allowUserOverride | Boolean | ✓ | true |  |  |
| isTouchScreen | Boolean | ✓ | auto |  |  |
| touchTargetSize | Int |  | 48 |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| updatedById | String | ✓ |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workstationId

---

### WorkflowDefinition

**Description:** Business workflow definitions enabling automated routing of approvals, reviews, and business processes throughout the manufacturing organization

**Business Purpose:** Standardizes and automates business processes ensuring consistent execution, proper approvals, and audit trails for regulatory compliance

**Data Governance:**
- **Data Owner:** Business Process Management and IT Systems Teams
- **Update Frequency:** Updated when business processes change, approval hierarchies are modified, or regulatory requirements evolve
- **Data Retention:** 7 years for regulatory compliance and business process audit requirements
- **Security Classification:** Internal - Business process definitions and approval hierarchies

**Compliance Notes:** Workflow definitions critical for 21 CFR Part 11 electronic signature compliance and ISO 9001 process control requirements

**System Integrations:** Electronic Signature System, Document Management, User Management, Audit Systems, Notification Systems

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| name | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| workflowType | WorkflowType | ✓ |  |  |  |
| version | String | ✓ | 1.0.0 |  |  |
| structure | Json | ✓ |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| isTemplate | Boolean | ✓ | auto |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdById | String | ✓ |  |  |  |
| updatedById | String | ✓ |  |  |  |
| instances | WorkflowInstance[] | ✓ |  |  |  |
| rules | WorkflowRule[] | ✓ |  |  |  |
| stages | WorkflowStage[] | ✓ |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | WorkflowInstance | instances | ✓ |  |
| one-to-many | WorkflowRule | rules | ✓ |  |
| one-to-many | WorkflowStage | stages | ✓ |  |

**Usage Examples:**

#### ECO approval workflow

Multi-stage ECO approval workflow with role-based approvers and time limits for regulatory compliance

```json
{
  "workflowName": "Engineering Change Order Approval",
  "workflowType": "APPROVAL",
  "triggerEvent": "ECO_SUBMITTED",
  "maxDuration": 168,
  "durationUnit": "HOURS",
  "isActive": true,
  "requiresElectronicSignature": true,
  "stages": [
    {
      "stageName": "Engineering Review",
      "approverRole": "DESIGN_ENGINEER",
      "maxHours": 24
    },
    {
      "stageName": "Quality Review",
      "approverRole": "QUALITY_ENGINEER",
      "maxHours": 48
    },
    {
      "stageName": "Management Approval",
      "approverRole": "ENGINEERING_MANAGER",
      "maxHours": 72
    }
  ]
}
```

#### Quality deviation workflow

Critical quality workflow for non-conformance investigation with escalation and mandatory approvals

```json
{
  "workflowName": "Non-Conformance Resolution",
  "workflowType": "INVESTIGATION",
  "triggerEvent": "NCR_CREATED",
  "priority": "HIGH",
  "escalationRules": "Auto-escalate after 4 hours if not acknowledged",
  "requiresRootCauseAnalysis": true,
  "mandatoryApprovals": [
    "QUALITY_MANAGER",
    "PRODUCTION_SUPERVISOR"
  ]
}
```

**Common Queries:**
- Deploy new workflow definitions for business process automation
- Track workflow performance and bottlenecks
- Generate compliance reports for workflow execution

**Related Tables:** WorkflowStage, WorkflowInstance, WorkflowHistory, WorkflowAssignment, ElectronicSignature

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workflowType
- **Index:** isActive

---

### WorkflowStage

**Description:** Workflow stage definitions within business processes defining approval steps, decision points, and stage-specific requirements

**Business Purpose:** Structures business process execution by defining discrete stages with specific requirements, approvers, and transition criteria for compliance and efficiency

**Data Governance:**
- **Data Owner:** Business Process Management and Quality Assurance Teams
- **Update Frequency:** Updated when business processes are modified, approval hierarchies change, or regulatory requirements evolve
- **Data Retention:** 7 years for regulatory compliance and business process validation
- **Security Classification:** Internal - Business process definitions and approval hierarchies

**Compliance Notes:** Workflow stages support 21 CFR Part 11 electronic signature requirements and ISO 9001 document control processes

**System Integrations:** Workflow Management, Electronic Signatures, Document Control, Role Management, Audit Systems

**Fields (20):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workflowId | String | ✓ |  |  |  |
| stageNumber | Int | ✓ |  |  |  |
| stageName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| approvalType | ApprovalType | ✓ | ALL_REQUIRED |  |  |
| minimumApprovals | Int |  |  |  |  |
| approvalThreshold | Float |  |  |  |  |
| requiredRoles | String[] | ✓ |  |  |  |
| optionalRoles | String[] | ✓ |  |  |  |
| assignmentStrategy | AssignmentStrategy | ✓ | MANUAL |  |  |
| deadlineHours | Int |  |  |  |  |
| escalationRules | Json |  |  |  |  |
| allowDelegation | Boolean | ✓ | true |  |  |
| allowSkip | Boolean | ✓ | auto |  |  |
| skipConditions | Json |  |  |  |  |
| requiresSignature | Boolean | ✓ | auto |  |  |
| signatureType | String |  |  |  |  |
| stageInstances | WorkflowStageInstance[] | ✓ |  |  |  |
| workflow | WorkflowDefinition | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | WorkflowStageInstance | stageInstances | ✓ |  |
| one-to-one | WorkflowDefinition | workflow | ✓ |  |

**Usage Examples:**

#### ECO approval workflow stage

Quality review stage in ECO workflow with specific approval requirements, timing constraints, and electronic signature

```json
{
  "stageId": "WFS-ECO-QUALITY-REVIEW",
  "workflowDefinitionId": "WFD-ECO-APPROVAL",
  "stageName": "Quality Review",
  "stageOrder": 2,
  "stageType": "APPROVAL",
  "description": "Quality engineering review of proposed changes for impact assessment",
  "requiredRole": "QUALITY_ENGINEER",
  "approverCount": 1,
  "parallelApproval": false,
  "maxDurationHours": 48,
  "escalationHours": 36,
  "escalationRole": "QUALITY_MANAGER",
  "electronicSignatureRequired": true,
  "signatureType": "BIOMETRIC",
  "entryConditions": [
    "Engineering review completed",
    "Technical feasibility confirmed"
  ],
  "exitConditions": [
    "Quality impact assessed",
    "Test plan approved"
  ],
  "requiredDocuments": [
    "Quality impact assessment",
    "Test protocol"
  ],
  "isOptional": false
}
```

#### Quality plan approval stage

Final approval stage for quality plan with business hours restriction and automatic advancement upon approval

```json
{
  "stageId": "WFS-QP-MGMT-APPROVAL",
  "workflowDefinitionId": "WFD-QUALITY-PLAN-APPROVAL",
  "stageName": "Management Approval",
  "stageOrder": 3,
  "stageType": "FINAL_APPROVAL",
  "description": "Final management approval for quality plan implementation",
  "requiredRole": "QUALITY_MANAGER",
  "approverCount": 1,
  "maxDurationHours": 24,
  "businessHoursOnly": true,
  "holidaysExcluded": true,
  "autoAdvanceOnApproval": true,
  "notificationTemplate": "Quality plan ready for final approval",
  "completionActions": [
    "Publish quality plan",
    "Notify production team",
    "Update work instructions"
  ]
}
```

**Common Queries:**
- Define workflow stages for new business processes
- Track stage completion times for process optimization
- Generate workflow configuration reports for compliance audits

**Related Tables:** WorkflowDefinition, WorkflowInstance, Role, ElectronicSignature, User

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** workflowId, stageNumber
- **Index:** workflowId

---

### WorkflowRule

**Description:** Business logic rules and automation conditions that govern workflow behavior, transitions, and decision-making processes

**Business Purpose:** Enables automated workflow decision-making and business process enforcement through configurable rules and conditions

**Data Governance:**
- **Data Owner:** Business Process Management and IT Operations Teams
- **Update Frequency:** Updated when business rules change, process optimization occurs, or regulatory requirements are modified
- **Data Retention:** 7 years for business process validation and regulatory compliance
- **Security Classification:** Internal - Business logic and process automation rules

**Compliance Notes:** Workflow rules support SOX compliance for process automation and provide audit trail for automated business decisions

**System Integrations:** Workflow Engine, Business Rules Engine, Process Analytics, Compliance Systems, Decision Management

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workflowId | String | ✓ |  |  |  |
| ruleName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| conditionField | String | ✓ |  |  |  |
| conditionOperator | ConditionOperator | ✓ |  |  |  |
| conditionValue | Json | ✓ |  |  |  |
| actionType | RuleActionType | ✓ |  |  |  |
| actionConfig | Json | ✓ |  |  |  |
| priority | Int | ✓ | auto |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| workflow | WorkflowDefinition | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | WorkflowDefinition | workflow | ✓ |  |

**Usage Examples:**

#### Engineering change approval rule with conditional routing based on impact level

Automated routing rule that escalates high-impact engineering changes to executive approval for enhanced oversight

```json
{
  "ruleId": "WR-ECO-APPROVAL-001",
  "ruleName": "ECO Impact-Based Routing",
  "ruleType": "CONDITIONAL_ROUTING",
  "condition": "changeImpact == 'HIGH' AND affectedProducts > 5",
  "action": "ROUTE_TO_EXECUTIVE_APPROVAL",
  "priority": 1,
  "isActive": true,
  "effectiveDate": "2024-01-01T00:00:00Z",
  "businessJustification": "High-impact changes affecting multiple products require executive oversight"
}
```

#### Quality plan approval rule with time-based escalation and role validation

Automatic escalation rule ensuring quality plan approvals don't exceed business hour timelines

```json
{
  "ruleId": "WR-QP-ESCALATION-001",
  "ruleName": "Quality Plan Approval Escalation",
  "ruleType": "TIME_BASED_ESCALATION",
  "condition": "approvalPending > 48 AND businessHoursOnly == true",
  "action": "ESCALATE_TO_QUALITY_MANAGER",
  "escalationHours": 48,
  "requiredRole": "QUALITY_ENGINEER",
  "notificationTemplate": "Quality plan approval overdue - escalating to management"
}
```

**Common Queries:**
- Evaluate workflow rules for process automation decisions
- Track rule effectiveness for process optimization
- Generate business rule compliance reports for audits

**Related Tables:** WorkflowDefinition, WorkflowStageInstance, WorkflowHistory, Role, User

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workflowId
- **Index:** priority

---

### WorkflowInstance

**Description:** Active workflow instances managing approval processes, document reviews, and business process execution with complete audit trails

**Business Purpose:** Orchestrates business process execution ensuring proper approvals, compliance requirements, and audit trails for regulatory and quality standards

**Data Governance:**
- **Data Owner:** Business Process Management and Quality Assurance Teams
- **Update Frequency:** Real-time updates as workflows progress through stages, approvals, and completion
- **Data Retention:** 7 years for regulatory compliance and business process audit requirements
- **Security Classification:** Internal - Business process execution and approval workflows

**Compliance Notes:** Critical for 21 CFR Part 11 electronic signature workflows and ISO 9001 document control compliance

**System Integrations:** Workflow Management, Electronic Signatures, Document Control, User Management, Audit Systems

**Fields (16):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workflowId | String | ✓ |  |  |  |
| entityType | String | ✓ |  |  |  |
| entityId | String | ✓ |  |  |  |
| status | WorkflowStatus | ✓ | IN_PROGRESS |  |  |
| currentStageNumber | Int |  |  |  |  |
| contextData | Json |  |  |  |  |
| startedAt | DateTime | ✓ | now( |  |  |
| completedAt | DateTime |  |  |  |  |
| deadline | DateTime |  |  |  |  |
| priority | Priority | ✓ | NORMAL |  |  |
| impactLevel | ImpactLevel |  |  |  |  |
| createdById | String | ✓ |  |  |  |
| history | WorkflowHistory[] | ✓ |  |  |  |
| workflow | WorkflowDefinition | ✓ |  |  |  |
| stageInstances | WorkflowStageInstance[] | ✓ |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | WorkflowHistory | history | ✓ |  |
| one-to-one | WorkflowDefinition | workflow | ✓ |  |
| one-to-many | WorkflowStageInstance | stageInstances | ✓ |  |

**Usage Examples:**

#### ECO approval workflow instance

High-priority ECO workflow instance in quality review stage with tracked progress and pending approvals

```json
{
  "workflowInstanceId": "WFI-ECO-240325-001",
  "workflowDefinitionId": "WFD-ECO-APPROVAL",
  "triggerEvent": "ECO_SUBMITTED",
  "relatedDocumentId": "ECO-2024-001234",
  "initiatedBy": "design_engineer_davis",
  "initiatedAt": "2024-03-25T09:00:00Z",
  "currentStage": "QUALITY_REVIEW",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "dueDate": "2024-03-29T17:00:00Z",
  "completedStages": [
    "ENGINEERING_REVIEW"
  ],
  "pendingApprovers": [
    "quality_manager_jones"
  ],
  "escalationRequired": false
}
```

#### Quality plan approval workflow

Quality plan approval workflow requiring electronic signature with complete approval history tracking

```json
{
  "workflowInstanceId": "WFI-QP-240325-005",
  "workflowDefinitionId": "WFD-QUALITY-PLAN-APPROVAL",
  "relatedDocumentId": "QP-TB-A380-001",
  "initiatedBy": "quality_engineer_brown",
  "currentStage": "MANAGEMENT_APPROVAL",
  "status": "PENDING_SIGNATURE",
  "electronicSignatureRequired": true,
  "signatureType": "BIOMETRIC",
  "approvalHistory": [
    {
      "stage": "PEER_REVIEW",
      "approver": "quality_engineer_smith",
      "approvedAt": "2024-03-25T14:30:00Z"
    },
    {
      "stage": "TECHNICAL_REVIEW",
      "approver": "senior_engineer_wilson",
      "approvedAt": "2024-03-25T16:15:00Z"
    }
  ]
}
```

**Common Queries:**
- Track workflow progress for management dashboards
- Generate approval status reports for compliance audits
- Find overdue workflows requiring escalation

**Related Tables:** WorkflowDefinition, WorkflowStage, ElectronicSignature, User, Document

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** entityType, entityId
- **Index:** workflowId
- **Index:** status
- **Index:** deadline
- **Index:** createdById

---

### WorkflowStageInstance

**Description:** Active instances of workflow stages tracking real-time progress, approvals, and execution status for ongoing business processes

**Business Purpose:** Provides real-time visibility into workflow execution enabling process monitoring, performance tracking, and proactive management

**Data Governance:**
- **Data Owner:** Business Process Management and Operations Teams
- **Update Frequency:** Real-time updates as workflow stages progress, complete, or encounter exceptions
- **Data Retention:** 5 years for process analysis and audit support
- **Security Classification:** Internal - Active process execution data with operational sensitivity

**Compliance Notes:** Stage instance tracking critical for audit trails and compliance verification - maintains complete execution history

**System Integrations:** Workflow Engine, Task Management, Notification Systems, Process Analytics, Performance Monitoring

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workflowInstanceId | String | ✓ |  |  |  |
| stageId | String | ✓ |  |  |  |
| stageNumber | Int | ✓ |  |  |  |
| stageName | String | ✓ |  |  |  |
| status | StageStatus | ✓ | PENDING |  |  |
| startedAt | DateTime |  |  |  |  |
| completedAt | DateTime |  |  |  |  |
| deadline | DateTime |  |  |  |  |
| outcome | StageOutcome |  |  |  |  |
| notes | String |  |  |  |  |
| assignments | WorkflowAssignment[] | ✓ |  |  |  |
| parallelCoordination | WorkflowParallelCoordination[] | ✓ |  |  |  |
| stage | WorkflowStage | ✓ |  |  |  |
| workflowInstance | WorkflowInstance | ✓ |  |  |  |
**Relationships (4):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | WorkflowAssignment | assignments | ✓ |  |
| one-to-many | WorkflowParallelCoordination | parallelCoordination | ✓ |  |
| one-to-one | WorkflowStage | stage | ✓ |  |
| one-to-one | WorkflowInstance | workflowInstance | ✓ |  |

**Usage Examples:**

#### Engineering change approval stage in progress with timing and approval tracking

Active engineering review stage with progress tracking and deadline management for ECO approval process

```json
{
  "stageInstanceId": "WSI-ECO-240330-001",
  "workflowInstanceId": "WI-ECO-240330-001",
  "stageId": "WS-ENGINEERING-REVIEW",
  "stageName": "Engineering Review",
  "stageStatus": "IN_PROGRESS",
  "startTime": "2024-03-30T09:00:00Z",
  "assignedUserId": "engineer_smith",
  "assignedRole": "SENIOR_ENGINEER",
  "dueDate": "2024-03-31T17:00:00Z",
  "percentComplete": 75,
  "currentTask": "Technical impact assessment"
}
```

#### Quality plan approval stage completed with electronic signature and timing metrics

Completed quality approval stage with electronic signature verification and performance timing metrics

```json
{
  "stageInstanceId": "WSI-QP-240330-002",
  "workflowInstanceId": "WI-QP-240330-002",
  "stageId": "WS-QUALITY-APPROVAL",
  "stageName": "Quality Manager Approval",
  "stageStatus": "COMPLETED",
  "startTime": "2024-03-30T14:00:00Z",
  "completionTime": "2024-03-30T15:30:00Z",
  "assignedUserId": "qmgr_johnson",
  "approvalDecision": "APPROVED",
  "electronicSignature": "BIOMETRIC_VERIFIED",
  "durationMinutes": 90
}
```

**Common Queries:**
- Monitor active workflow stages for operational oversight
- Track stage completion times for performance optimization
- Generate workflow progress reports for management dashboards

**Related Tables:** WorkflowInstance, WorkflowStage, User, WorkflowTask, ElectronicSignature

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** workflowInstanceId, stageNumber
- **Index:** workflowInstanceId
- **Index:** status
- **Index:** deadline

---

### WorkflowAssignment

**Description:** Task and approval assignments within workflows specifying responsible users, roles, and delegation relationships

**Business Purpose:** Ensures proper task allocation and accountability in business processes while supporting delegation and workload distribution

**Data Governance:**
- **Data Owner:** Business Process Management and Human Resources Teams
- **Update Frequency:** Updated when assignments change, delegations occur, or organizational structure modifications happen
- **Data Retention:** 7 years for accountability tracking and organizational analysis
- **Security Classification:** Internal - Assignment and delegation information with organizational sensitivity

**Compliance Notes:** Assignment tracking essential for SOX compliance and audit trail requirements - maintains accountability and segregation of duties

**System Integrations:** Workflow Engine, User Management, Organization Structure, Notification Systems, Performance Tracking

**Fields (19):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| stageInstanceId | String | ✓ |  |  |  |
| assignedToId | String | ✓ |  |  |  |
| assignedToRole | String |  |  |  |  |
| assignmentType | AssignmentType | ✓ | REQUIRED |  |  |
| delegatedFromId | String |  |  |  |  |
| delegationReason | String |  |  |  |  |
| delegationExpiry | DateTime |  |  |  |  |
| action | ApprovalAction |  |  |  |  |
| actionTakenAt | DateTime |  |  |  |  |
| comments | String |  |  |  |  |
| signatureId | String |  |  |  |  |
| signatureType | String |  |  |  |  |
| assignedAt | DateTime | ✓ | now( |  |  |
| dueDate | DateTime |  |  |  |  |
| escalationLevel | Int | ✓ | auto |  |  |
| escalatedAt | DateTime |  |  |  |  |
| escalatedToId | String |  |  |  |  |
| stageInstance | WorkflowStageInstance | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | WorkflowStageInstance | stageInstance | ✓ |  |

**Usage Examples:**

#### Engineering change review assignment with primary and backup assignees

ECO review assignment with backup assignee ensuring continuity and specialized focus requirements

```json
{
  "assignmentId": "WA-ECO-240330-001",
  "workflowInstanceId": "WI-ECO-240330-001",
  "stageInstanceId": "WSI-ECO-240330-001",
  "primaryAssigneeId": "engineer_smith",
  "backupAssigneeId": "engineer_davis",
  "assignedRole": "SENIOR_ENGINEER",
  "assignmentType": "PRIMARY_WITH_BACKUP",
  "assignedDate": "2024-03-30T09:00:00Z",
  "dueDate": "2024-03-31T17:00:00Z",
  "priorityLevel": "HIGH",
  "specialInstructions": "Focus on tooling impact assessment"
}
```

#### Quality approval assignment with delegation due to vacation coverage

Quality approval assignment delegated for vacation coverage with automatic approval for continuity

```json
{
  "assignmentId": "WA-QP-240330-002",
  "workflowInstanceId": "WI-QP-240330-002",
  "originalAssigneeId": "qmgr_johnson",
  "delegatedToId": "qmgr_wilson",
  "assignedRole": "QUALITY_MANAGER",
  "assignmentType": "DELEGATED",
  "delegationReason": "VACATION_COVERAGE",
  "delegationDate": "2024-03-30T08:00:00Z",
  "delegationApproval": "AUTO_APPROVED"
}
```

**Common Queries:**
- Find active assignments for user workload management
- Track delegation patterns for organizational analysis
- Generate assignment reports for performance evaluation

**Related Tables:** WorkflowInstance, WorkflowStageInstance, User, Role, WorkflowDelegation

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** stageInstanceId
- **Index:** assignedToId
- **Index:** dueDate
- **Index:** action

---

### WorkflowHistory

**Description:** Complete audit trail and historical record of all workflow activities, decisions, and state changes for compliance and analysis

**Business Purpose:** Provides comprehensive audit trail for regulatory compliance, process analysis, and continuous improvement of business workflows

**Data Governance:**
- **Data Owner:** Business Process Management and Compliance Teams
- **Update Frequency:** Real-time capture of all workflow events, decisions, and state transitions
- **Data Retention:** Permanent retention for regulatory compliance and historical process analysis
- **Security Classification:** Internal - Complete audit trail with regulatory and competitive significance

**Compliance Notes:** Critical for SOX, FDA, and regulatory audit requirements - maintains immutable record of all business process activities

**System Integrations:** Workflow Engine, Audit Systems, Compliance Reporting, Process Analytics, Data Warehouse

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| workflowInstanceId | String | ✓ |  |  |  |
| eventType | WorkflowEventType | ✓ |  |  |  |
| eventDescription | String | ✓ |  |  |  |
| stageNumber | Int |  |  |  |  |
| fromStatus | String |  |  |  |  |
| toStatus | String |  |  |  |  |
| performedById | String | ✓ |  |  |  |
| performedByName | String | ✓ |  |  |  |
| performedByRole | String |  |  |  |  |
| details | Json |  |  |  |  |
| occurredAt | DateTime | ✓ | now( |  |  |
| workflowInstance | WorkflowInstance | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | WorkflowInstance | workflowInstance | ✓ |  |

**Usage Examples:**

#### Engineering change workflow history with complete decision trail and timing analysis

Complete audit record of engineering review completion with decision rationale and supporting documentation

```json
{
  "historyId": "WH-ECO-240330-001",
  "workflowInstanceId": "WI-ECO-240330-001",
  "eventType": "STAGE_COMPLETION",
  "stageName": "Engineering Review",
  "eventTimestamp": "2024-03-30T16:30:00Z",
  "userId": "engineer_smith",
  "eventDescription": "Engineering review completed with approval",
  "decision": "APPROVED",
  "comments": "Technical review confirms feasibility with minor tooling updates required",
  "attachments": [
    "technical_analysis.pdf",
    "impact_assessment.xlsx"
  ],
  "electronicSignature": "BIOMETRIC_VERIFIED"
}
```

#### Quality plan workflow history with escalation event and resolution tracking

Audit record of automatic escalation due to timeout with complete rule and user tracking

```json
{
  "historyId": "WH-QP-240330-002",
  "workflowInstanceId": "WI-QP-240330-002",
  "eventType": "ESCALATION_TRIGGERED",
  "stageName": "Quality Review",
  "eventTimestamp": "2024-03-30T18:00:00Z",
  "escalationReason": "TIMEOUT_EXCEEDED",
  "escalatedFromId": "qeng_davis",
  "escalatedToId": "qmgr_johnson",
  "automaticEscalation": true,
  "escalationRuleId": "WR-QP-ESCALATION-001"
}
```

**Common Queries:**
- Generate complete audit trails for regulatory compliance
- Analyze workflow performance and bottlenecks
- Track decision history for process improvement

**Related Tables:** WorkflowInstance, WorkflowStageInstance, User, WorkflowRule, ElectronicSignature

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workflowInstanceId
- **Index:** eventType
- **Index:** occurredAt

---

### WorkflowDelegation

**Description:** Authority delegation and coverage management for workflow responsibilities enabling business continuity and flexible resource allocation

**Business Purpose:** Ensures business process continuity through systematic delegation while maintaining accountability and approval authority tracking

**Data Governance:**
- **Data Owner:** Business Process Management and Human Resources Teams
- **Update Frequency:** Updated when delegation arrangements are established, modified, or terminated
- **Data Retention:** 7 years for accountability tracking and organizational audit support
- **Security Classification:** Internal - Authority delegation with organizational and compliance sensitivity

**Compliance Notes:** Delegation tracking critical for SOX compliance and audit trail requirements - maintains clear authority and accountability

**System Integrations:** Workflow Engine, User Management, Organization Structure, Electronic Signature Systems

**Fields (10):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| delegatorId | String | ✓ |  |  |  |
| delegateeId | String | ✓ |  |  |  |
| workflowType | WorkflowType |  |  |  |  |
| specificWorkflowId | String |  |  |  |  |
| startDate | DateTime | ✓ |  |  |  |
| endDate | DateTime |  |  |  |  |
| reason | String | ✓ |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |

**Usage Examples:**

#### Quality manager vacation delegation with time-limited authority and approval scope restrictions

Time-limited quality manager delegation for vacation coverage with specific authority scope and financial limits

```json
{
  "delegationId": "WD-240330-001",
  "delegatingUserId": "qmgr_johnson",
  "delegateUserId": "qmgr_wilson",
  "delegationReason": "VACATION_COVERAGE",
  "effectiveStartDate": "2024-04-01T00:00:00Z",
  "effectiveEndDate": "2024-04-15T23:59:59Z",
  "delegatedAuthorities": [
    "QUALITY_PLAN_APPROVAL",
    "NCR_DISPOSITION",
    "SUPPLIER_AUDIT_APPROVAL"
  ],
  "approvalLimits": {
    "maxApprovalValue": 50000,
    "currency": "USD"
  },
  "autoRevoke": true,
  "delegationApproval": "AUTO_APPROVED"
}
```

#### Emergency engineering approval delegation with escalation and notification requirements

Emergency engineering delegation with escalation requirements and confirmation protocols for critical decisions

```json
{
  "delegationId": "WD-240330-002",
  "delegatingUserId": "eng_director_smith",
  "delegateUserId": "senior_eng_davis",
  "delegationReason": "EMERGENCY_COVERAGE",
  "effectiveStartDate": "2024-03-30T18:00:00Z",
  "effectiveEndDate": "2024-03-31T08:00:00Z",
  "emergencyContact": true,
  "notificationRequired": true,
  "delegatedAuthorities": [
    "EMERGENCY_ECO_APPROVAL",
    "PRODUCTION_HOLD_AUTHORITY"
  ],
  "escalationRequired": "ALL_ACTIONS",
  "approvalRequired": "DELEGATOR_CONFIRMATION"
}
```

**Common Queries:**
- Track active delegations for authority verification
- Monitor delegation usage for organizational analysis
- Generate delegation reports for compliance audits

**Related Tables:** User, WorkflowAssignment, Role, WorkflowInstance

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** delegatorId
- **Index:** delegateeId
- **Index:** isActive

---

### WorkflowTemplate

**Description:** Reusable workflow patterns and standardized process templates for consistent business process implementation across the organization

**Business Purpose:** Enables rapid deployment of standardized business processes while ensuring consistency and compliance across different operational contexts

**Data Governance:**
- **Data Owner:** Business Process Management and Quality Teams
- **Update Frequency:** Updated when process standards change, templates are optimized, or new business requirements are established
- **Data Retention:** 10 years for process validation and continuous improvement analysis
- **Security Classification:** Internal - Process templates with competitive and operational significance

**Compliance Notes:** Workflow templates support process standardization and regulatory compliance by ensuring consistent implementation

**System Integrations:** Workflow Engine, Process Design Tools, Compliance Systems, Change Management

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| name | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| workflowType | WorkflowType | ✓ |  |  |  |
| category | String | ✓ | STANDARD |  |  |
| templateDefinition | Json | ✓ |  |  |  |
| usageCount | Int | ✓ | auto |  |  |
| lastUsedAt | DateTime |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| isBuiltIn | Boolean | ✓ | auto |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdById | String | ✓ |  |  |  |

**Usage Examples:**

#### Engineering change control template with aerospace compliance requirements and approval stages

Comprehensive aerospace ECO template with AS9100D compliance requirements and multi-stage approval process

```json
{
  "templateId": "WT-ECO-AEROSPACE-001",
  "templateName": "Aerospace Engineering Change Control",
  "templateVersion": "2.1",
  "industryStandard": "AS9100D",
  "processOwner": "Engineering Director",
  "stageCount": 6,
  "averageDuration": 10,
  "durationUnit": "BUSINESS_DAYS",
  "requiredRoles": [
    "DESIGN_ENGINEER",
    "QUALITY_ENGINEER",
    "MANUFACTURING_ENGINEER"
  ],
  "criticalDecisionPoints": 3,
  "electronicsSignatureRequired": true,
  "customerNotificationRequired": true,
  "templateStatus": "ACTIVE"
}
```

#### Supplier qualification template with quality system assessment and certification requirements

Structured supplier qualification template with comprehensive assessment requirements and ongoing monitoring

```json
{
  "templateId": "WT-SUPPLIER-QUAL-001",
  "templateName": "Critical Supplier Qualification",
  "templateVersion": "1.3",
  "qualificationScope": "CRITICAL_MATERIALS",
  "stageCount": 8,
  "assessmentRequirements": [
    "ISO_9001_AUDIT",
    "FINANCIAL_REVIEW",
    "CAPABILITY_STUDY"
  ],
  "approvalAuthority": "SUPPLIER_QUALITY_MANAGER",
  "probationPeriod": 90,
  "probationPeriodUnit": "DAYS",
  "requalificationInterval": 24,
  "requalificationIntervalUnit": "MONTHS"
}
```

**Common Queries:**
- Retrieve workflow templates for process standardization
- Track template usage for process optimization
- Generate process compliance reports from template implementations

**Related Tables:** WorkflowDefinition, WorkflowInstance, Role, ComplianceRequirement

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workflowType
- **Index:** category
- **Index:** isActive

---

### WorkflowTask

**Description:** Individual tasks and action items within workflow stages defining specific work to be completed by assigned users

**Business Purpose:** Breaks down complex workflow stages into manageable tasks enabling detailed progress tracking and resource management

**Data Governance:**
- **Data Owner:** Business Process Management and Operations Teams
- **Update Frequency:** Real-time updates as tasks are created, assigned, progressed, and completed
- **Data Retention:** 5 years for process optimization and performance analysis
- **Security Classification:** Internal - Task details and work assignments with operational sensitivity

**Compliance Notes:** Task tracking supports detailed audit requirements and provides granular accountability for process compliance

**System Integrations:** Workflow Engine, Task Management Systems, Time Tracking, Performance Analytics, Notification Systems

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| assignmentId | String | ✓ |  |  |  |
| assignedToId | String | ✓ |  |  |  |
| workflowInstanceId | String | ✓ |  |  |  |
| stageNumber | Int | ✓ |  |  |  |
| entityType | String | ✓ |  |  |  |
| entityId | String | ✓ |  |  |  |
| taskTitle | String | ✓ |  |  |  |
| taskDescription | String |  |  |  |  |
| priority | Priority | ✓ | NORMAL |  |  |
| status | TaskStatus | ✓ | PENDING |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| dueDate | DateTime |  |  |  |  |
| lastReminderSent | DateTime |  |  |  |  |
| reminderCount | Int | ✓ | auto |  |  |

**Usage Examples:**

#### Engineering change technical assessment task with deliverables and time tracking

Technical assessment task with detailed deliverable tracking and time management for ECO evaluation

```json
{
  "taskId": "WT-ECO-240330-001",
  "workflowInstanceId": "WI-ECO-240330-001",
  "stageInstanceId": "WSI-ECO-240330-001",
  "taskName": "Technical Feasibility Assessment",
  "taskDescription": "Evaluate technical feasibility of proposed design changes and tooling requirements",
  "assignedUserId": "engineer_smith",
  "taskType": "ANALYSIS",
  "taskStatus": "IN_PROGRESS",
  "startDate": "2024-03-30T09:00:00Z",
  "dueDate": "2024-03-30T17:00:00Z",
  "estimatedHours": 6,
  "actualHours": 4.5,
  "percentComplete": 75,
  "deliverables": [
    "Feasibility report",
    "Tooling requirements",
    "Risk assessment"
  ]
}
```

#### Quality plan validation task with checklist and verification requirements

Quality validation task with structured checklist and compliance verification for plan approval

```json
{
  "taskId": "WT-QP-240330-002",
  "workflowInstanceId": "WI-QP-240330-002",
  "stageInstanceId": "WSI-QP-240330-002",
  "taskName": "Inspection Plan Validation",
  "taskDescription": "Validate inspection procedures against customer requirements and regulatory standards",
  "assignedUserId": "qeng_davis",
  "taskType": "VALIDATION",
  "taskStatus": "COMPLETED",
  "checklistItems": [
    "Customer specs reviewed",
    "Regulatory compliance verified",
    "Measurement capability confirmed"
  ],
  "completionDate": "2024-03-30T14:30:00Z",
  "validationResult": "APPROVED"
}
```

**Common Queries:**
- Track individual task progress for workflow monitoring
- Generate task performance reports for productivity analysis
- Find overdue tasks for escalation and resource reallocation

**Related Tables:** WorkflowInstance, WorkflowStageInstance, User, WorkflowAssignment, TimeEntry

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** assignedToId, status
- **Index:** dueDate
- **Index:** priority
- **Index:** workflowInstanceId

---

### WorkflowMetrics

**Description:** Performance analytics and operational metrics for workflow processes enabling continuous improvement and efficiency optimization

**Business Purpose:** Provides data-driven insights for process optimization, resource allocation, and operational excellence through comprehensive workflow analytics

**Data Governance:**
- **Data Owner:** Business Process Management and Performance Analytics Teams
- **Update Frequency:** Real-time metric calculation and periodic aggregation for performance trending and analysis
- **Data Retention:** 5 years for trend analysis and process improvement validation
- **Security Classification:** Internal - Performance data with operational and competitive significance

**Compliance Notes:** Workflow metrics support process validation and continuous improvement requirements for quality management systems

**System Integrations:** Workflow Engine, Business Intelligence, Performance Dashboards, Process Analytics

**Fields (17):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| periodStart | DateTime | ✓ |  |  |  |
| periodEnd | DateTime | ✓ |  |  |  |
| workflowId | String |  |  |  |  |
| stageId | String |  |  |  |  |
| workflowType | WorkflowType |  |  |  |  |
| userId | String |  |  |  |  |
| roleId | String |  |  |  |  |
| totalAssignments | Int | ✓ | auto |  |  |
| completedOnTime | Int | ✓ | auto |  |  |
| completedLate | Int | ✓ | auto |  |  |
| avgCompletionHours | Float |  |  |  |  |
| escalationCount | Int | ✓ | auto |  |  |
| rejectionCount | Int | ✓ | auto |  |  |
| onTimePercentage | Float |  |  |  |  |
| avgResponseHours | Float |  |  |  |  |
| updatedAt | DateTime | ✓ |  |  |  |

**Usage Examples:**

#### Engineering change workflow performance metrics with cycle time analysis and bottleneck identification

Q1 ECO workflow metrics showing above-target performance with customer approval identified as primary bottleneck

```json
{
  "metricId": "WM-ECO-240330-001",
  "workflowType": "ENGINEERING_CHANGE_CONTROL",
  "measurementPeriod": "2024-Q1",
  "totalInstances": 47,
  "completedInstances": 43,
  "averageCycleTime": 8.5,
  "cycleTimeUnit": "BUSINESS_DAYS",
  "targetCycleTime": 10,
  "performanceToTarget": 115,
  "bottleneckStage": "CUSTOMER_APPROVAL",
  "bottleneckAverageDuration": 3.2,
  "firstPassYield": 91.5,
  "customerSatisfactionScore": 4.2
}
```

#### Quality plan approval workflow metrics with efficiency trending and resource utilization analysis

March quality plan metrics showing 18% cycle time improvement and high quality scores with moderate automation

```json
{
  "metricId": "WM-QP-240330-002",
  "workflowType": "QUALITY_PLAN_APPROVAL",
  "measurementPeriod": "2024-03",
  "totalInstances": 23,
  "completedInstances": 23,
  "averageCycleTime": 4.1,
  "cycleTimeUnit": "BUSINESS_DAYS",
  "cycleTimeImprovement": 18,
  "improvementUnit": "PERCENT",
  "resourceUtilization": 78.5,
  "escalationRate": 8.7,
  "automationPercentage": 45,
  "qualityScore": 4.7
}
```

**Common Queries:**
- Generate workflow performance dashboards for management reporting
- Analyze process bottlenecks for optimization opportunities
- Track continuous improvement metrics for quality system validation

**Related Tables:** WorkflowInstance, WorkflowStageInstance, PerformanceIndicator, ProcessImprovement

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** periodStart, periodEnd
- **Index:** workflowType
- **Index:** userId

---

### WorkflowParallelCoordination

**Description:** Coordination and synchronization management for parallel workflow branches enabling complex multi-path business process execution

**Business Purpose:** Manages sophisticated parallel process execution ensuring proper coordination, timing, and decision-making for complex manufacturing workflows

**Data Governance:**
- **Data Owner:** Business Process Management and Systems Integration Teams
- **Update Frequency:** Real-time coordination updates as parallel branches progress, synchronize, and reach decision points
- **Data Retention:** 5 years for process validation and coordination pattern analysis
- **Security Classification:** Internal - Process coordination with operational and competitive significance

**Compliance Notes:** Parallel coordination tracking ensures process integrity and audit trail completeness for complex regulatory workflows

**System Integrations:** Workflow Engine, Process Orchestration, Decision Management, Event Processing

**Fields (18):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| stageInstanceId | String | ✓ |  |  |  |
| groupId | String | ✓ |  |  |  |
| groupName | String |  |  |  |  |
| groupType | String | ✓ |  |  |  |
| completionType | String | ✓ |  |  |  |
| thresholdValue | Int |  |  |  |  |
| totalAssignments | Int | ✓ | auto |  |  |
| completedAssignments | Int | ✓ | auto |  |  |
| approvedAssignments | Int | ✓ | auto |  |  |
| rejectedAssignments | Int | ✓ | auto |  |  |
| groupStatus | String | ✓ | PENDING |  |  |
| groupDecision | String |  |  |  |  |
| completedAt | DateTime |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| stageInstance | WorkflowStageInstance | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | WorkflowStageInstance | stageInstance | ✓ |  |

**Usage Examples:**

#### Engineering change parallel review coordination with simultaneous engineering and manufacturing assessment

ECO parallel review coordination waiting for manufacturing assessment completion before proceeding to design approval gate

```json
{
  "coordinationId": "WPC-ECO-240330-001",
  "workflowInstanceId": "WI-ECO-240330-001",
  "coordinationType": "PARALLEL_REVIEW",
  "parallelBranches": 3,
  "branchNames": [
    "Engineering Review",
    "Manufacturing Assessment",
    "Quality Impact"
  ],
  "synchronizationPoint": "DESIGN_APPROVAL_GATE",
  "coordinationRule": "ALL_BRANCHES_COMPLETE",
  "branch1Status": "COMPLETED",
  "branch2Status": "IN_PROGRESS",
  "branch3Status": "COMPLETED",
  "coordinationStatus": "WAITING_FOR_COMPLETION",
  "timeoutEnabled": true,
  "timeoutHours": 72
}
```

#### Supplier qualification parallel coordination with simultaneous audit, financial review, and capability assessment

Supplier qualification coordination with majority approval achieved including critical quality audit branch completion

```json
{
  "coordinationId": "WPC-SUPPLIER-240330-002",
  "workflowInstanceId": "WI-SUPPLIER-240330-002",
  "coordinationType": "PARALLEL_QUALIFICATION",
  "parallelBranches": 4,
  "branchNames": [
    "Quality Audit",
    "Financial Review",
    "Capability Study",
    "References Check"
  ],
  "synchronizationPoint": "QUALIFICATION_DECISION",
  "coordinationRule": "MAJORITY_APPROVAL_WITH_CRITICAL",
  "criticalBranches": [
    "Quality Audit"
  ],
  "votingResults": {
    "approvals": 3,
    "rejections": 0,
    "pending": 1
  },
  "coordinationStatus": "APPROVED",
  "decisionTimestamp": "2024-03-30T16:45:00Z"
}
```

**Common Queries:**
- Monitor parallel workflow coordination for process management
- Track coordination patterns for process optimization
- Generate parallel execution reports for complexity analysis

**Related Tables:** WorkflowInstance, WorkflowStageInstance, WorkflowRule, DecisionPoint

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** stageInstanceId, groupId
- **Index:** stageInstanceId
- **Index:** groupStatus

---

### EngineeringChangeOrder

**Description:** Engineering change orders managing all product and process modifications with complete approval workflow and compliance traceability

**Business Purpose:** Controls and documents all engineering changes to ensure proper authorization, impact assessment, and regulatory compliance throughout the product lifecycle

**Data Governance:**
- **Data Owner:** Engineering Change Management and Product Engineering Teams
- **Update Frequency:** Real-time updates as ECOs progress through approval workflows and implementation stages
- **Data Retention:** Permanent retention for product lifecycle traceability and regulatory compliance
- **Security Classification:** Confidential - Product design changes and proprietary engineering information

**Compliance Notes:** Critical for ISO 9001, AS9100, and 21 CFR Part 11 compliance - must maintain complete audit trail of all product/process changes

**System Integrations:** Product Lifecycle Management, Document Control, Quality Management, Production Planning, Workflow Systems

**Fields (49):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| ecoNumber | String | ✓ |  |  |  |
| title | String | ✓ |  |  |  |
| description | String | ✓ |  |  |  |
| ecoType | ECOType | ✓ |  |  |  |
| priority | ECOPriority | ✓ |  |  |  |
| status | ECOStatus | ✓ | REQUESTED |  |  |
| currentState | String | ✓ |  |  |  |
| proposedChange | String | ✓ |  |  |  |
| reasonForChange | String | ✓ |  |  |  |
| benefitsExpected | String |  |  |  |  |
| risksIfNotImplemented | String |  |  |  |  |
| requestorId | String | ✓ |  |  |  |
| requestorName | String | ✓ |  |  |  |
| requestorDept | String |  |  |  |  |
| requestDate | DateTime | ✓ | now( |  |  |
| sponsorId | String |  |  |  |  |
| sponsorName | String |  |  |  |  |
| impactAnalysis | Json |  |  |  |  |
| affectedParts | String[] | ✓ |  |  |  |
| affectedOperations | String[] | ✓ |  |  |  |
| estimatedCost | Float |  |  |  |  |
| actualCost | Float |  |  |  |  |
| estimatedSavings | Float |  |  |  |  |
| actualSavings | Float |  |  |  |  |
| costCurrency | String | ✓ | USD |  |  |
| requestedEffectiveDate | DateTime |  |  |  |  |
| plannedEffectiveDate | DateTime |  |  |  |  |
| actualEffectiveDate | DateTime |  |  |  |  |
| effectivityType | EffectivityType |  |  |  |  |
| effectivityValue | String |  |  |  |  |
| isInterchangeable | Boolean | ✓ | auto |  |  |
| crbReviewDate | DateTime |  |  |  |  |
| crbDecision | CRBDecision |  |  |  |  |
| crbNotes | String |  |  |  |  |
| completedDate | DateTime |  |  |  |  |
| verifiedDate | DateTime |  |  |  |  |
| closedDate | DateTime |  |  |  |  |
| closedById | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| affectedDocuments | ECOAffectedDocument[] | ✓ |  |  |  |
| attachments | ECOAttachment[] | ✓ |  |  |  |
| crbReviews | ECOCRBReview[] | ✓ |  |  |  |
| history | ECOHistory[] | ✓ |  |  |  |
| relatedECOs | ECORelation[] | ✓ |  |  |  |
| parentRelations | ECORelation[] | ✓ |  |  |  |
| tasks | ECOTask[] | ✓ |  |  |  |
**Relationships (4):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | ECOAffectedDocument | affectedDocuments | ✓ |  |
| one-to-many | ECOAttachment | attachments | ✓ |  |
| one-to-many | ECOCRBReview | crbReviews | ✓ |  |
| one-to-many | ECOHistory | history | ✓ |  |

**Usage Examples:**

#### Critical dimensional change ECO

High-priority design change requiring approval workflow for critical aerospace component dimensional revisions

```json
{
  "ecoNumber": "ECO-2024-001234",
  "ecoType": "DESIGN_CHANGE",
  "priority": "HIGH",
  "title": "Turbine Blade Dimensional Tolerance Revision",
  "requestedBy": "chief_engineer_davis",
  "affectedProducts": [
    "TB-A380-001",
    "TB-A350-002"
  ],
  "changeReason": "Improve manufacturing tolerance for reduced scrap rate",
  "estimatedCost": 15000,
  "targetImplementationDate": "2024-04-15T00:00:00Z",
  "status": "IN_REVIEW"
}
```

#### Process improvement ECO

Process optimization ECO with cost savings tracking and approved implementation status

```json
{
  "ecoNumber": "ECO-2024-005678",
  "ecoType": "PROCESS_CHANGE",
  "priority": "MEDIUM",
  "title": "Heat Treatment Cycle Optimization",
  "changeReason": "Reduce cycle time while maintaining metallurgical properties",
  "costSavingsExpected": 8500,
  "status": "APPROVED",
  "implementationDate": "2024-03-30T00:00:00Z"
}
```

**Common Queries:**
- Track ECO status and approval progress
- Generate ECO impact reports for cost analysis
- Find all ECOs affecting specific products or documents

**Related Tables:** ECOAffectedDocument, ECOTask, ECOHistory, WorkflowInstance, DocumentRevision

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** ecoNumber
- **Index:** status
- **Index:** priority
- **Index:** requestDate
- **Index:** requestorId

---

### ECOAffectedDocument

**Description:** ECO Affected Document - Links ECOs to documents that need updates

**Fields (16):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| ecoId | String | ✓ |  |  |  |
| documentType | String | ✓ |  |  |  |
| documentId | String | ✓ |  |  |  |
| documentTitle | String | ✓ |  |  |  |
| currentVersion | String |  |  |  |  |
| targetVersion | String |  |  |  |  |
| status | DocUpdateStatus | ✓ | PENDING |  |  |
| assignedToId | String |  |  |  |  |
| assignedToName | String |  |  |  |  |
| updateStartedAt | DateTime |  |  |  |  |
| updateCompletedAt | DateTime |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| eco | EngineeringChangeOrder | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | EngineeringChangeOrder | eco | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** ecoId, documentType, documentId
- **Index:** ecoId
- **Index:** status
- **Index:** assignedToId

---

### ECOTask

**Description:** ECO Task - Implementation tasks for ECO completion

**Fields (19):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| ecoId | String | ✓ |  |  |  |
| taskName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| taskType | ECOTaskType | ✓ |  |  |  |
| assignedToId | String |  |  |  |  |
| assignedToName | String |  |  |  |  |
| assignedToDept | String |  |  |  |  |
| status | ECOTaskStatus | ✓ | PENDING |  |  |
| dueDate | DateTime |  |  |  |  |
| startedAt | DateTime |  |  |  |  |
| completedAt | DateTime |  |  |  |  |
| prerequisiteTasks | String[] | ✓ |  |  |  |
| completionNotes | String |  |  |  |  |
| verifiedById | String |  |  |  |  |
| verifiedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| eco | EngineeringChangeOrder | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | EngineeringChangeOrder | eco | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** ecoId
- **Index:** assignedToId
- **Index:** status
- **Index:** dueDate

---

### ECOAttachment

**Description:** ECO Attachment - Supporting documents for ECOs

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| ecoId | String | ✓ |  |  |  |
| fileName | String | ✓ |  |  |  |
| fileUrl | String | ✓ |  |  |  |
| fileSize | Int | ✓ |  |  |  |
| mimeType | String | ✓ |  |  |  |
| attachmentType | AttachmentType | ✓ |  |  |  |
| description | String |  |  |  |  |
| uploadedById | String | ✓ |  |  |  |
| uploadedByName | String | ✓ |  |  |  |
| uploadedAt | DateTime | ✓ | now( |  |  |
| eco | EngineeringChangeOrder | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | EngineeringChangeOrder | eco | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** ecoId
- **Index:** attachmentType

---

### ECOHistory

**Description:** ECO History - Complete audit trail for ECO changes

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| ecoId | String | ✓ |  |  |  |
| eventType | ECOEventType | ✓ |  |  |  |
| eventDescription | String | ✓ |  |  |  |
| fromStatus | ECOStatus |  |  |  |  |
| toStatus | ECOStatus |  |  |  |  |
| details | Json |  |  |  |  |
| performedById | String | ✓ |  |  |  |
| performedByName | String | ✓ |  |  |  |
| performedByRole | String |  |  |  |  |
| occurredAt | DateTime | ✓ | now( |  |  |
| eco | EngineeringChangeOrder | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | EngineeringChangeOrder | eco | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** ecoId
- **Index:** eventType
- **Index:** occurredAt

---

### ECOCRBReview

**Description:** ECO CRB Review - Change Review Board meeting records

**Fields (18):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| ecoId | String | ✓ |  |  |  |
| meetingDate | DateTime | ✓ |  |  |  |
| meetingAgenda | String |  |  |  |  |
| members | Json | ✓ |  |  |  |
| discussionNotes | String |  |  |  |  |
| questionsConcerns | String |  |  |  |  |
| decision | CRBDecision | ✓ |  |  |  |
| decisionRationale | String |  |  |  |  |
| votesFor | Int |  |  |  |  |
| votesAgainst | Int |  |  |  |  |
| votesAbstain | Int |  |  |  |  |
| conditions | String |  |  |  |  |
| actionItems | Json |  |  |  |  |
| nextReviewDate | DateTime |  |  |  |  |
| createdById | String | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| eco | EngineeringChangeOrder | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | EngineeringChangeOrder | eco | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** ecoId
- **Index:** meetingDate

---

### ECORelation

**Description:** ECO Relation - Relationships between ECOs

**Fields (8):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| parentEcoId | String | ✓ |  |  |  |
| relatedEcoId | String | ✓ |  |  |  |
| relationType | ECORelationType | ✓ |  |  |  |
| description | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| parentEco | EngineeringChangeOrder | ✓ |  |  |  |
| relatedEco | EngineeringChangeOrder | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | EngineeringChangeOrder | parentEco | ✓ |  |
| one-to-one | EngineeringChangeOrder | relatedEco | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** parentEcoId, relatedEcoId
- **Index:** parentEcoId
- **Index:** relatedEcoId

---

### CRBConfiguration

**Description:** CRB Configuration - Change Review Board setup

**Fields (11):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| boardMembers | Json | ✓ |  |  |  |
| meetingFrequency | String |  |  |  |  |
| meetingDay | String |  |  |  |  |
| meetingTime | String |  |  |  |  |
| votingRule | VotingRule | ✓ | MAJORITY |  |  |
| quorumRequired | Int |  |  |  |  |
| preReviewDays | Int | ✓ | 3 |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** isActive

---

### DocumentComment

**Description:** Document Comment - Threaded comments on documents

**Fields (25):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| documentType | String | ✓ |  |  |  |
| documentId | String | ✓ |  |  |  |
| contextType | CommentContextType |  |  |  |  |
| contextId | String |  |  |  |  |
| contextPath | String |  |  |  |  |
| commentText | String | ✓ |  |  |  |
| attachments | String[] | ✓ |  |  |  |
| parentCommentId | String |  |  |  |  |
| status | CommentStatus | ✓ | OPEN |  |  |
| priority | CommentPriority | ✓ | MEDIUM |  |  |
| tags | String[] | ✓ |  |  |  |
| isPinned | Boolean | ✓ | auto |  |  |
| isResolved | Boolean | ✓ | auto |  |  |
| resolvedAt | DateTime |  |  |  |  |
| resolvedById | String |  |  |  |  |
| authorId | String | ✓ |  |  |  |
| authorName | String | ✓ |  |  |  |
| mentionedUserIds | String[] | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| editedAt | DateTime |  |  |  |  |
| reactions | CommentReaction[] | ✓ |  |  |  |
| parentComment | DocumentComment |  |  |  |  |
| replies | DocumentComment[] | ✓ |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | CommentReaction | reactions | ✓ |  |
| one-to-one | DocumentComment | parentComment |  |  |
| one-to-many | DocumentComment | replies | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentType, documentId
- **Index:** parentCommentId
- **Index:** authorId
- **Index:** status
- **Index:** createdAt

---

### CommentReaction

**Description:** Comment Reaction - Reactions to comments

**Fields (7):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| commentId | String | ✓ |  |  |  |
| userId | String | ✓ |  |  |  |
| userName | String | ✓ |  |  |  |
| reactionType | ReactionType | ✓ |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| comment | DocumentComment | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | DocumentComment | comment | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** commentId, userId, reactionType
- **Index:** commentId

---

### DocumentAnnotation

**Description:** Document Annotation - Visual annotations on media

**Fields (18):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| documentType | String | ✓ |  |  |  |
| documentId | String | ✓ |  |  |  |
| mediaType | String |  |  |  |  |
| mediaUrl | String |  |  |  |  |
| annotationType | AnnotationType | ✓ |  |  |  |
| annotationData | Json | ✓ |  |  |  |
| text | String |  |  |  |  |
| color | String |  |  |  |  |
| strokeWidth | Int |  |  |  |  |
| opacity | Float |  |  |  |  |
| fontSize | Int |  |  |  |  |
| timestamp | Float |  |  |  |  |
| authorId | String | ✓ |  |  |  |
| authorName | String | ✓ |  |  |  |
| isResolved | Boolean | ✓ | auto |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentType, documentId
- **Index:** authorId

---

### ReviewAssignment

**Description:** Review Assignment - Document review assignments

**Fields (23):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| documentType | String | ✓ |  |  |  |
| documentId | String | ✓ |  |  |  |
| documentVersion | String | ✓ |  |  |  |
| reviewerId | String | ✓ |  |  |  |
| reviewerName | String | ✓ |  |  |  |
| assignedById | String | ✓ |  |  |  |
| assignedByName | String | ✓ |  |  |  |
| assignedAt | DateTime | ✓ | now( |  |  |
| reviewType | ReviewType | ✓ |  |  |  |
| instructions | String |  |  |  |  |
| focusAreas | String[] | ✓ |  |  |  |
| isRequired | Boolean | ✓ | true |  |  |
| deadline | DateTime |  |  |  |  |
| checklistItems | Json |  |  |  |  |
| status | ReviewStatus | ✓ | NOT_STARTED |  |  |
| startedAt | DateTime |  |  |  |  |
| completedAt | DateTime |  |  |  |  |
| recommendation | ReviewRecommendation |  |  |  |  |
| summary | String |  |  |  |  |
| timeSpent | Int |  |  |  |  |
| signatureId | String |  |  |  |  |
| signedOffAt | DateTime |  |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** documentType, documentId, reviewerId
- **Index:** reviewerId
- **Index:** status
- **Index:** deadline

---

### DocumentActivity

**Description:** Document Activity - Activity log for documents

**Fields (11):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| documentType | String | ✓ |  |  |  |
| documentId | String | ✓ |  |  |  |
| activityType | ActivityType | ✓ |  |  |  |
| description | String | ✓ |  |  |  |
| changesSummary | Json |  |  |  |  |
| performedById | String | ✓ |  |  |  |
| performedByName | String | ✓ |  |  |  |
| performedByRole | String |  |  |  |  |
| metadata | Json |  |  |  |  |
| occurredAt | DateTime | ✓ | now( |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentType, documentId
- **Index:** activityType
- **Index:** occurredAt
- **Index:** performedById

---

### DocumentSubscription

**Description:** Document Subscription - User subscriptions to document updates

**Fields (9):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| userId | String | ✓ |  |  |  |
| documentType | String | ✓ |  |  |  |
| documentId | String | ✓ |  |  |  |
| notifyOnEdit | Boolean | ✓ | true |  |  |
| notifyOnComment | Boolean | ✓ | true |  |  |
| notifyOnApproval | Boolean | ✓ | true |  |  |
| notifyOnVersion | Boolean | ✓ | true |  |  |
| subscribedAt | DateTime | ✓ | now( |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** userId, documentType, documentId
- **Index:** userId
- **Index:** documentType, documentId

---

### UserNotification

**Description:** System-generated notifications and alerts delivered to users for operational updates, task assignments, and system events

**Business Purpose:** Ensures timely communication of critical information, task assignments, and system status to enable efficient operations

**Data Governance:**
- **Data Owner:** System Administration and Operations Management Teams
- **Update Frequency:** Real-time generation as events occur and notifications are triggered
- **Data Retention:** 1 year for operational analysis and communication audit trails
- **Security Classification:** Internal - Operational communications and task assignment information

**Compliance Notes:** Notification delivery and acknowledgment may be required for critical safety and quality alerts

**System Integrations:** Workflow Management, Alert Systems, Email Systems, Mobile Applications

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| userId | String | ✓ |  |  |  |
| notificationType | NotificationType | ✓ |  |  |  |
| title | String | ✓ |  |  |  |
| message | String | ✓ |  |  |  |
| entityType | String |  |  |  |  |
| entityId | String |  |  |  |  |
| actionUrl | String |  |  |  |  |
| isRead | Boolean | ✓ | auto |  |  |
| readAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| expiresAt | DateTime |  |  |  |  |

**Usage Examples:**

#### Quality alert notification

Critical quality notification requiring immediate inspector attention and action

```json
{
  "userId": "QA-INSP-001",
  "notificationType": "QUALITY_ALERT",
  "title": "NCR Requires Immediate Attention",
  "message": "NCR-2024-001234 for Part TB-A380-001 requires immediate investigation",
  "entityType": "NCR",
  "entityId": "NCR-2024-001234"
}
```

#### Work assignment notification

Work assignment notification with direct link to work order details

```json
{
  "userId": "EMP-001234",
  "notificationType": "WORK_ASSIGNMENT",
  "title": "New Work Order Assignment",
  "message": "Work Order WO-2024-001235 assigned to your queue",
  "actionUrl": "/work-orders/WO-2024-001235",
  "isRead": false
}
```

**Common Queries:**
- Find unread notifications by user for dashboard display
- Track notification delivery and response rates
- Generate communication audit reports for compliance

**Related Tables:** User, WorkOrder, NCR, Alert

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** userId
- **Index:** isRead
- **Index:** createdAt

---

### DocumentEditSession

**Description:** Document Edit Session - Real-time collaboration sessions

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| documentType | String | ✓ |  |  |  |
| documentId | String | ✓ |  |  |  |
| userId | String | ✓ |  |  |  |
| userName | String | ✓ |  |  |  |
| sessionId | String | ✓ |  |  |  |
| startedAt | DateTime | ✓ | now( |  |  |
| lastActivityAt | DateTime | ✓ | now( |  |  |
| endedAt | DateTime |  |  |  |  |
| cursorPosition | Json |  |  |  |  |
| lockedSections | String[] | ✓ |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentType, documentId
- **Index:** userId
- **Index:** isActive

---

### ConflictResolution

**Description:** Conflict Resolution - Merge conflict resolutions

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| documentType | String | ✓ |  |  |  |
| documentId | String | ✓ |  |  |  |
| conflictPath | String | ✓ |  |  |  |
| baseVersion | String | ✓ |  |  |  |
| yourVersion | Json | ✓ |  |  |  |
| theirVersion | Json | ✓ |  |  |  |
| theirUserId | String | ✓ |  |  |  |
| resolution | ResolutionType | ✓ |  |  |  |
| mergedVersion | Json | ✓ |  |  |  |
| resolvedById | String | ✓ |  |  |  |
| resolvedByName | String | ✓ |  |  |  |
| resolvedAt | DateTime | ✓ | now( |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentType, documentId
- **Index:** resolvedById

---

### StoredFile

**Description:** Cloud storage file registry
Tracks all files stored in S3/MinIO with versioning, deduplication, and metadata

**Fields (47):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | uuid( |  |  |
| storagePath | String | ✓ |  |  |  |
| storageProvider | String | ✓ |  |  |  |
| bucket | String | ✓ |  |  |  |
| fileName | String | ✓ |  |  |  |
| originalFileName | String | ✓ |  |  |  |
| fileSize | Int | ✓ |  |  |  |
| mimeType | String | ✓ |  |  |  |
| fileHash | String | ✓ |  |  |  |
| versionId | String |  |  |  |  |
| isLatestVersion | Boolean | ✓ | true |  |  |
| versionNumber | Int | ✓ | 1 |  |  |
| storageClass | StorageClass | ✓ | HOT |  |  |
| transitionedAt | DateTime |  |  |  |  |
| metadata | Json |  |  |  |  |
| tags | String[] | ✓ |  |  |  |
| cdnUrl | String |  |  |  |  |
| cacheStatus | CacheStatus |  |  |  |  |
| lastCacheUpdate | DateTime |  |  |  |  |
| accessCount | Int | ✓ | auto |  |  |
| lastAccessedAt | DateTime |  |  |  |  |
| downloadCount | Int | ✓ | auto |  |  |
| documentType | String |  |  |  |  |
| documentId | String |  |  |  |  |
| attachmentType | FileAttachmentType |  |  |  |  |
| deduplicationRefs | Int | ✓ | 1 |  |  |
| originalFileId | String |  |  |  |  |
| retentionPolicy | String |  |  |  |  |
| expiresAt | DateTime |  |  |  |  |
| autoDeleteAt | DateTime |  |  |  |  |
| isEncrypted | Boolean | ✓ | auto |  |  |
| encryptionKeyId | String |  |  |  |  |
| encryptionAlgorithm | String |  |  |  |  |
| uploadedById | String | ✓ |  |  |  |
| uploadedByName | String | ✓ |  |  |  |
| uploadedAt | DateTime | ✓ | now( |  |  |
| uploadMethod | UploadMethod | ✓ | DIRECT |  |  |
| uploadSessionId | String |  |  |  |  |
| processingStatus | ProcessingStatus | ✓ | COMPLETED |  |  |
| processingError | String |  |  |  |  |
| thumbnailGenerated | Boolean | ✓ | auto |  |  |
| thumbnailPath | String |  |  |  |  |
| backupEntries | BackupEntry[] | ✓ |  |  |  |
| accessLogs | FileAccessLog[] | ✓ |  |  |  |
| versions | FileVersion[] | ✓ |  |  |  |
| originalFile | StoredFile |  |  |  |  |
| duplicateFiles | StoredFile[] | ✓ |  |  |  |
**Relationships (5):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | BackupEntry | backupEntries | ✓ |  |
| one-to-many | FileAccessLog | accessLogs | ✓ |  |
| one-to-many | FileVersion | versions | ✓ |  |
| one-to-one | StoredFile | originalFile |  |  |
| one-to-many | StoredFile | duplicateFiles | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** storagePath
- **Index:** fileHash
- **Index:** documentType, documentId
- **Index:** storageClass
- **Index:** uploadedAt
- **Index:** isLatestVersion
- **Index:** originalFileId

---

### FileVersion

**Description:** File version history for comprehensive version tracking

**Fields (18):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | uuid( |  |  |
| fileId | String | ✓ |  |  |  |
| versionNumber | Int | ✓ |  |  |  |
| versionId | String | ✓ |  |  |  |
| storagePath | String | ✓ |  |  |  |
| fileSize | Int | ✓ |  |  |  |
| fileHash | String | ✓ |  |  |  |
| mimeType | String | ✓ |  |  |  |
| changeDescription | String |  |  |  |  |
| changeType | VersionChangeType | ✓ | UPDATE |  |  |
| storageClass | StorageClass | ✓ | HOT |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| createdById | String | ✓ |  |  |  |
| createdByName | String | ✓ |  |  |  |
| retentionPolicy | String |  |  |  |  |
| expiresAt | DateTime |  |  |  |  |
| file | StoredFile | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | StoredFile | file | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** fileId, versionNumber
- **Index:** fileId
- **Index:** createdAt

---

### BackupSchedule

**Description:** Backup schedules for automated backup management

**Fields (25):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | uuid( |  |  |
| name | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| bucketName | String | ✓ |  |  |  |
| backupBucket | String |  |  |  |  |
| includePattern | String |  |  |  |  |
| excludePattern | String |  |  |  |  |
| frequency | BackupFrequency | ✓ |  |  |  |
| cronExpression | String |  |  |  |  |
| timezone | String | ✓ | UTC |  |  |
| retentionDays | Int | ✓ | 30 |  |  |
| maxBackups | Int |  |  |  |  |
| enableCompression | Boolean | ✓ | true |  |  |
| enableEncryption | Boolean | ✓ | true |  |  |
| crossRegionReplication | Boolean | ✓ | auto |  |  |
| isActive | Boolean | ✓ | true |  |  |
| lastBackupAt | DateTime |  |  |  |  |
| nextBackupAt | DateTime |  |  |  |  |
| lastSuccessAt | DateTime |  |  |  |  |
| lastFailureAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdById | String | ✓ |  |  |  |
| updatedById | String |  |  |  |  |
| backupHistory | BackupHistory[] | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | BackupHistory | backupHistory | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** isActive
- **Index:** nextBackupAt

---

### BackupHistory

**Description:** Backup execution history and status tracking

**Fields (21):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | uuid( |  |  |
| scheduleId | String |  |  |  |  |
| backupType | BackupType | ✓ |  |  |  |
| status | BackupStatus | ✓ |  |  |  |
| sourceBucket | String | ✓ |  |  |  |
| destBucket | String | ✓ |  |  |  |
| backupLocation | String | ✓ |  |  |  |
| fileCount | Int |  |  |  |  |
| totalSize | Int |  |  |  |  |
| compressedSize | Int |  |  |  |  |
| compressionRatio | Float |  |  |  |  |
| startedAt | DateTime | ✓ |  |  |  |
| completedAt | DateTime |  |  |  |  |
| duration | Int |  |  |  |  |
| errorMessage | String |  |  |  |  |
| errorCode | String |  |  |  |  |
| checksumVerified | Boolean | ✓ | auto |  |  |
| verificationDate | DateTime |  |  |  |  |
| metadata | Json |  |  |  |  |
| backupEntries | BackupEntry[] | ✓ |  |  |  |
| schedule | BackupSchedule |  |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | BackupEntry | backupEntries | ✓ |  |
| one-to-one | BackupSchedule | schedule |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** scheduleId
- **Index:** status
- **Index:** startedAt
- **Index:** backupType

---

### BackupEntry

**Description:** Backup entries linking files to backup instances

**Fields (10):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | uuid( |  |  |
| backupId | String | ✓ |  |  |  |
| fileId | String | ✓ |  |  |  |
| backupPath | String | ✓ |  |  |  |
| originalPath | String | ✓ |  |  |  |
| checksum | String | ✓ |  |  |  |
| checksumVerified | Boolean | ✓ | auto |  |  |
| metadata | Json |  |  |  |  |
| backup | BackupHistory | ✓ |  |  |  |
| file | StoredFile | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | BackupHistory | backup | ✓ |  |
| one-to-one | StoredFile | file | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** backupId, fileId
- **Index:** backupId
- **Index:** fileId

---

### FileAccessLog

**Description:** File access logging for security and analytics

**Fields (20):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | uuid( |  |  |
| fileId | String | ✓ |  |  |  |
| accessType | AccessType | ✓ |  |  |  |
| accessMethod | String | ✓ |  |  |  |
| userId | String |  |  |  |  |
| userName | String |  |  |  |  |
| userAgent | String |  |  |  |  |
| ipAddress | String |  |  |  |  |
| referrer | String |  |  |  |  |
| requestHeaders | Json |  |  |  |  |
| responseCode | Int |  |  |  |  |
| responseSize | Int |  |  |  |  |
| accessedAt | DateTime | ✓ | now( |  |  |
| duration | Int |  |  |  |  |
| country | String |  |  |  |  |
| region | String |  |  |  |  |
| city | String |  |  |  |  |
| cdnHit | Boolean |  |  |  |  |
| edgeLocation | String |  |  |  |  |
| file | StoredFile | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | StoredFile | file | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** fileId
- **Index:** accessedAt
- **Index:** userId
- **Index:** accessType

---

### StorageMetrics

**Description:** Storage analytics and metrics for monitoring

**Fields (31):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | uuid( |  |  |
| date | DateTime | ✓ |  |  |  |
| hour | Int |  |  |  |  |
| totalFiles | Int | ✓ | auto |  |  |
| totalSize | Int | ✓ | auto |  |  |
| hotStorageFiles | Int | ✓ | auto |  |  |
| hotStorageSize | Int | ✓ | auto |  |  |
| warmStorageFiles | Int | ✓ | auto |  |  |
| warmStorageSize | Int | ✓ | auto |  |  |
| coldStorageFiles | Int | ✓ | auto |  |  |
| coldStorageSize | Int | ✓ | auto |  |  |
| archiveFiles | Int | ✓ | auto |  |  |
| archiveSize | Int | ✓ | auto |  |  |
| imageFiles | Int | ✓ | auto |  |  |
| imageSize | Int | ✓ | auto |  |  |
| videoFiles | Int | ✓ | auto |  |  |
| videoSize | Int | ✓ | auto |  |  |
| documentFiles | Int | ✓ | auto |  |  |
| documentSize | Int | ✓ | auto |  |  |
| cadFiles | Int | ✓ | auto |  |  |
| cadSize | Int | ✓ | auto |  |  |
| uploads | Int | ✓ | auto |  |  |
| downloads | Int | ✓ | auto |  |  |
| deletes | Int | ✓ | auto |  |  |
| totalRequests | Int | ✓ | auto |  |  |
| totalBandwidth | Int | ✓ | auto |  |  |
| cdnHits | Int | ✓ | auto |  |  |
| cdnMisses | Int | ✓ | auto |  |  |
| duplicateFiles | Int | ✓ | auto |  |  |
| spaceSaved | Int | ✓ | auto |  |  |
| estimatedCost | Decimal |  |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** date
- **Index:** hour

---

### MultipartUpload

**Description:** Multipart upload session tracking

**Fields (19):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | uuid( |  |  |
| uploadId | String | ✓ |  |  |  |
| fileName | String | ✓ |  |  |  |
| storagePath | String | ✓ |  |  |  |
| totalSize | Int | ✓ |  |  |  |
| chunkSize | Int | ✓ |  |  |  |
| totalChunks | Int | ✓ |  |  |  |
| uploadedChunks | Int | ✓ | auto |  |  |
| status | UploadStatus | ✓ | IN_PROGRESS |  |  |
| parts | Json[] | ✓ |  |  |  |
| uploadedById | String | ✓ |  |  |  |
| uploadedByName | String | ✓ |  |  |  |
| startedAt | DateTime | ✓ | now( |  |  |
| lastActivityAt | DateTime | ✓ | now( |  |  |
| completedAt | DateTime |  |  |  |  |
| expiresAt | DateTime | ✓ |  |  |  |
| errorMessage | String |  |  |  |  |
| retryCount | Int | ✓ | auto |  |  |
| metadata | Json |  |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** uploadId
- **Index:** status
- **Index:** uploadedById
- **Index:** expiresAt

---

### Role

**Description:** Enhanced Role model - Replaces placeholder in auth service
Supports both global and site-specific roles with flexible permission assignment

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| roleCode | String | ✓ |  |  |  |
| roleName | String | ✓ |  | Unique name identifier for the role following corporate role naming standards | Primary identifier for role-based access control and security management |
| description | String |  |  | Detailed description of the role's responsibilities and scope of authority | Provides clear understanding of role scope for access control decisions |
| isActive | Boolean | ✓ | true | Indicates whether the role is currently active and available for assignment | Controls role availability while maintaining audit history |
| isGlobal | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdBy | String |  |  |  |  |
| permissions | RolePermission[] | ✓ |  | Array of permission identifiers that define what actions this role can perform | Determines system access levels and operational capabilities |
| userRoles | UserRole[] | ✓ |  |  |  |
| userSiteRoles | UserSiteRole[] | ✓ |  |  |  |
| templateInstance | RoleTemplateInstance |  |  |  |  |

**Field Details:**

#### roleName

- **Data Source:** Security administration and human resources role definitions
- **Format:** DEPARTMENT_FUNCTION format (e.g., PRODUCTION_OPERATOR, QUALITY_ENGINEER)
- **Validation:** Must be unique, alphanumeric with underscores, all uppercase
- **Examples:** PRODUCTION_OPERATOR - Shop floor production worker, QUALITY_ENGINEER - Quality control and inspection authority, MAINTENANCE_TECHNICIAN - Equipment maintenance and repair, PLANT_MANAGER - Site-level management authority

#### description

- **Data Source:** Human resources job descriptions and security policy documentation
- **Examples:** Authorized to perform production operations and data entry, Quality inspection authority with approval permissions, Equipment maintenance with safety lockout authority

#### isActive

- **Data Source:** Security administration and role lifecycle management
- **Validation:** Boolean field, defaults to true for new roles

#### permissions

- **Data Source:** Security policy and role-based access control matrix
- **Validation:** All permissions must exist in Permission table
- **Examples:** ['READ_WORK_ORDERS', 'UPDATE_PRODUCTION_DATA'] - Production operator permissions, ['READ_QUALITY_PLANS', 'APPROVE_INSPECTIONS'] - Quality engineer permissions, ['READ_ALL_DATA', 'MANAGE_USERS'] - Administrative permissions

**Relationships (4):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | RolePermission | permissions | ✓ |  |
| one-to-many | UserRole | userRoles | ✓ |  |
| one-to-many | UserSiteRole | userSiteRoles | ✓ |  |
| one-to-one | RoleTemplateInstance | templateInstance |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** roleCode
- **Index:** isActive
- **Index:** isGlobal

---

### Permission

**Description:** Enhanced Permission model - Replaces placeholder in auth service
Granular permissions with wildcard support and categorization

**Fields (11):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| permissionCode | String | ✓ |  |  |  |
| permissionName | String | ✓ |  | Unique identifier for the specific system permission or access right | Granular access control for system security and compliance |
| description | String |  |  | Human-readable description of what this permission allows users to do | Facilitates proper permission assignment and security training |
| category | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| isWildcard | Boolean | ✓ | auto |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| roles | RolePermission[] | ✓ |  |  |  |
| templatePermissions | RoleTemplatePermission[] | ✓ |  |  |  |

**Field Details:**

#### permissionName

- **Data Source:** Security policy definitions and system access control requirements
- **Format:** ACTION_RESOURCE format (e.g., READ_WORK_ORDERS, APPROVE_QUALITY_PLANS)
- **Validation:** Must be unique, alphanumeric with underscores, all uppercase
- **Examples:** READ_WORK_ORDERS - View work order information, UPDATE_PRODUCTION_DATA - Modify production records, APPROVE_QUALITY_PLANS - Quality plan approval authority, MANAGE_USERS - User administration permissions

#### description

- **Data Source:** Security documentation and user training materials
- **Examples:** Allows viewing of all work order details and status information, Grants authority to approve quality inspection results, Enables creation and modification of user accounts

**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | RolePermission | roles | ✓ |  |
| one-to-many | RoleTemplatePermission | templatePermissions | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** permissionCode
- **Index:** category
- **Index:** isActive
- **Index:** isWildcard

---

### RolePermission

**Description:** Junction table: Role ↔ Permission (many-to-many)
Defines which permissions are assigned to each role

**Fields (7):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| roleId | String | ✓ |  |  |  |
| permissionId | String | ✓ |  |  |  |
| grantedAt | DateTime | ✓ | now( |  |  |
| grantedBy | String |  |  |  |  |
| permission | Permission | ✓ |  |  |  |
| role | Role | ✓ |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** roleId, permissionId
- **Index:** roleId
- **Index:** permissionId

---

### UserRole

**Description:** Assignment of system roles to users establishing access permissions and functional capabilities within the MES

**Business Purpose:** Controls user access to system functions and data based on job responsibilities and security requirements

**Data Governance:**
- **Data Owner:** IT Security and System Administration Teams
- **Update Frequency:** Real-time updates as personnel roles change or access requirements are modified
- **Data Retention:** 7 years for security audit and compliance requirements
- **Security Classification:** Confidential - Contains access control and security authorization information

**Compliance Notes:** Role assignments must follow principle of least privilege and regulatory access control requirements

**System Integrations:** Active Directory, Role Management, Permission Systems, Audit Management

**Fields (8):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| userId | String | ✓ |  |  |  |
| roleId | String | ✓ |  |  |  |
| assignedAt | DateTime | ✓ | now( |  |  |
| assignedBy | String |  |  |  |  |
| expiresAt | DateTime |  |  |  |  |
| role | Role | ✓ |  |  |  |
| user | User | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | user | ✓ |  |

**Usage Examples:**

#### Production operator role assignment

Standard operator role providing access to production systems and work instructions

```json
{
  "userId": "EMP-001234",
  "roleId": "PRODUCTION_OPERATOR",
  "assignedAt": "2024-01-15T09:00:00Z",
  "assignedBy": "IT-ADMIN-001"
}
```

#### Temporary quality role assignment

Temporary quality inspector role with defined expiration for project-based assignment

```json
{
  "userId": "EMP-005678",
  "roleId": "QUALITY_INSPECTOR",
  "assignedAt": "2024-10-01T08:00:00Z",
  "expiresAt": "2024-12-31T23:59:59Z",
  "assignedBy": "QA-MANAGER-001"
}
```

**Common Queries:**
- Find users by role for access management
- Track role assignment history for security audits
- Generate access reports for compliance verification

**Related Tables:** User, Role, UserSiteRole, PermissionChangeLog

**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** userId, roleId
- **Index:** userId
- **Index:** roleId
- **Index:** expiresAt

---

### UserSiteRole

**Description:** Junction table: User ↔ Role ↔ Site (many-to-many, site-specific)
Assigns site-specific roles to users for enhanced granular control

**Fields (10):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| userId | String | ✓ |  | Foreign key reference to the user being assigned a site-specific role | Links users to their site-specific access rights and responsibilities |
| roleId | String | ✓ |  |  |  |
| siteId | String | ✓ |  | Foreign key reference to the specific site where this role assignment applies | Enables site-specific access control for multi-site operations |
| assignedAt | DateTime | ✓ | now( | Timestamp when the role assignment was created | Enables tracking of role assignment timeline for security analysis |
| assignedBy | String |  |  | User who authorized and created this role assignment | Provides accountability for role assignment decisions |
| expiresAt | DateTime |  |  |  |  |
| role | Role | ✓ |  |  |  |
| site | Site | ✓ |  |  |  |
| user | User | ✓ |  |  |  |

**Field Details:**

#### userId

- **Data Source:** User management system and role assignment workflow
- **Validation:** Must exist in User table, user must be active

#### siteId

- **Data Source:** Site organization structure and security policies
- **Validation:** Must exist in Site table

#### assignedAt

- **Data Source:** System timestamp at assignment creation
- **Format:** ISO 8601 timestamp with timezone
- **Audit Trail:** Required for security audit and compliance reporting

#### assignedBy

- **Data Source:** User management workflow and authorization system
- **Validation:** Must be valid user with appropriate administrative permissions
- **Audit Trail:** Critical for security audit and role assignment accountability

**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Site | site | ✓ |  |
| one-to-one | User | user | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** userId, roleId, siteId
- **Index:** userId
- **Index:** roleId
- **Index:** siteId
- **Index:** expiresAt

---

### TimeTrackingConfiguration

**Description:** Time tracking configuration (site level)
Controls how time tracking behaves at each manufacturing site

**Fields (21):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| siteId | String | ✓ |  | Foreign key reference to the site where this time tracking configuration applies | Enables site-specific time tracking policies for multi-site operations |
| timeTrackingEnabled | Boolean | ✓ | true |  |  |
| trackingGranularity | TimeTrackingGranularity | ✓ | OPERATION |  |  |
| costingModel | CostingModel | ✓ | LABOR_HOURS |  |  |
| allowMultiTasking | Boolean | ✓ | auto |  |  |
| multiTaskingMode | MultiTaskingMode |  |  |  |  |
| autoSubtractBreaks | Boolean | ✓ | auto |  |  |
| standardBreakMinutes | Int |  |  |  |  |
| requireBreakClockOut | Boolean | ✓ | auto |  |  |
| overtimeThresholdHours | Float |  | 8 | Number of hours per day after which overtime rules apply | Determines overtime calculation for payroll and cost management |
| warnOnOvertime | Boolean | ✓ | true |  |  |
| enableMachineTracking | Boolean | ✓ | auto |  |  |
| autoStartFromMachine | Boolean | ✓ | auto |  |  |
| autoStopFromMachine | Boolean | ✓ | auto |  |  |
| requireTimeApproval | Boolean | ✓ | true |  |  |
| approvalFrequency | ApprovalFrequency | ✓ | DAILY |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdBy | String | ✓ |  |  |  |
| site | Site | ✓ |  |  |  |

**Field Details:**

#### siteId

- **Data Source:** Site operations management and time tracking policy
- **Validation:** Must exist in Site table

#### overtimeThresholdHours

- **Data Source:** Labor law requirements and collective bargaining agreements
- **Format:** Decimal hours (e.g., 8.0, 10.0, 12.0)
- **Validation:** Must be positive, typically 8-12 hours

**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Site | site | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** siteId

---

### LaborTimeEntry

**Description:** Labor time entry (operator clocking in/out)
Records when operators clock in and out for work orders, operations, or indirect activities

**Fields (33):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| userId | String | ✓ |  | Foreign key reference to the user/operator who performed the work | Provides individual productivity tracking and payroll allocation |
| workOrderId | String |  |  | Foreign key reference to the work order this labor time is charged against | Links labor costs to specific production jobs for accurate costing |
| operationId | String |  |  | Foreign key reference to the specific operation within the work order | Enables detailed operation-level labor cost analysis and efficiency tracking |
| indirectCodeId | String |  |  |  |  |
| timeType | TimeType | ✓ |  |  |  |
| clockInTime | DateTime | ✓ |  | Timestamp when the operator clocked in to start work on the assigned task or operation | Determines start of billable labor time for cost accounting and payroll |
| clockOutTime | DateTime |  |  | Timestamp when the operator clocked out after completing work on the assigned task | Determines end of billable labor time and calculates total work duration |
| duration | Float |  |  |  |  |
| entrySource | TimeEntrySource | ✓ |  |  |  |
| deviceId | String |  |  |  |  |
| location | String |  |  |  |  |
| status | TimeEntryStatus | ✓ | ACTIVE |  |  |
| approvedBy | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| rejectionReason | String |  |  |  |  |
| costCenter | String |  |  |  |  |
| laborRate | Float |  |  | Hourly labor rate applied to this time entry for cost calculation | Determines labor cost for work order costing and financial reporting |
| laborCost | Float |  |  |  |  |
| originalClockInTime | DateTime |  |  |  |  |
| originalClockOutTime | DateTime |  |  |  |  |
| editedBy | String |  |  |  |  |
| editedAt | DateTime |  |  |  |  |
| editReason | String |  |  |  |  |
| exportedToSystem | String |  |  |  |  |
| exportedAt | DateTime |  |  |  |  |
| externalReferenceId | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| indirectCode | IndirectCostCode |  |  |  |  |
| operation | WorkOrderOperation |  |  |  |  |
| user | User | ✓ |  |  |  |
| workOrder | WorkOrder |  |  |  |  |

**Field Details:**

#### userId

- **Data Source:** User authentication and badge scanning systems
- **Validation:** Must exist in User table and user must be active

#### workOrderId

- **Data Source:** Production planning system and work order assignment
- **Validation:** Must exist in WorkOrder table if specified

#### operationId

- **Data Source:** Work order operation definitions and routing specifications
- **Validation:** Must exist in WorkOrderOperation table if specified

#### clockInTime

- **Data Source:** Shop floor terminals, badge scanners, or mobile time tracking applications
- **Format:** ISO 8601 timestamp with timezone (e.g., 2024-10-30T08:00:00Z)
- **Validation:** Cannot be future time, must be reasonable for shift timing
- **Audit Trail:** Critical for labor cost tracking and compliance reporting

#### clockOutTime

- **Data Source:** Shop floor terminals, badge scanners, or mobile time tracking applications
- **Format:** ISO 8601 timestamp with timezone
- **Validation:** Must be after clockInTime, cannot be future time

#### laborRate

- **Data Source:** Human resources rate tables and labor contract specifications
- **Format:** Currency amount per hour
- **Validation:** Must be positive value, reasonable for labor category
- **Privacy:** Confidential payroll information - restricted access

**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | IndirectCostCode | indirectCode |  |  |
| one-to-one | User | user | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** userId
- **Index:** workOrderId
- **Index:** operationId
- **Index:** status
- **Index:** clockInTime
- **Index:** timeType

---

### MachineTimeEntry

**Description:** Machine time entry (equipment run time)
Records machine run time separately from labor for equipment-based costing

**Fields (22):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| equipmentId | String | ✓ |  | Foreign key reference to the equipment/machine for which time is being tracked | Links machine utilization to specific equipment for efficiency analysis |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| startTime | DateTime | ✓ |  | Timestamp when the machine started operating or processing | Tracks machine utilization for capacity planning and OEE calculation |
| endTime | DateTime |  |  | Timestamp when the machine stopped operating or completed processing | Calculates actual machine run time for efficiency and costing analysis |
| duration | Float |  |  |  |  |
| entrySource | TimeEntrySource | ✓ |  |  |  |
| dataSource | String |  |  |  |  |
| cycleCount | Int |  |  | Number of machine cycles or parts processed during this time period | Measures actual production output for efficiency and capacity analysis |
| partCount | Int |  |  |  |  |
| machineUtilization | Float |  |  |  |  |
| status | TimeEntryStatus | ✓ | ACTIVE |  |  |
| machineRate | Float |  |  |  |  |
| machineCost | Float |  |  |  |  |
| exportedToSystem | String |  |  |  |  |
| exportedAt | DateTime |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| equipment | Equipment | ✓ |  |  |  |
| operation | WorkOrderOperation |  |  |  |  |
| workOrder | WorkOrder |  |  |  |  |

**Field Details:**

#### equipmentId

- **Data Source:** Equipment management system and time tracking integration
- **Validation:** Must exist in Equipment table

#### startTime

- **Data Source:** Machine control systems, PLCs, or operator entry
- **Format:** ISO 8601 timestamp with timezone
- **Validation:** Cannot be future time, must be reasonable for operation

#### endTime

- **Data Source:** Machine control systems, PLCs, or operator entry
- **Format:** ISO 8601 timestamp with timezone
- **Validation:** Must be after startTime

#### cycleCount

- **Data Source:** Machine counters, sensors, or operator counting
- **Format:** Integer count of cycles or parts
- **Validation:** Must be non-negative, reasonable for time period

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** workOrderId
- **Index:** operationId
- **Index:** status
- **Index:** startTime

---

### IndirectCostCode

**Description:** Indirect cost codes (non-productive time)
Defines categories for non-productive time like breaks, training, meetings

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| code | String | ✓ |  |  |  |
| description | String | ✓ |  |  |  |
| category | IndirectCategory | ✓ |  |  |  |
| costCenter | String |  |  |  |  |
| glAccount | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| siteId | String |  |  |  |  |
| displayColor | String |  |  |  |  |
| displayIcon | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdBy | String | ✓ |  |  |  |
| site | Site |  |  |  |  |
| laborEntries | LaborTimeEntry[] | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Site | site |  |  |
| one-to-many | LaborTimeEntry | laborEntries | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** code
- **Index:** category
- **Index:** siteId

---

### TimeEntryValidationRule

**Description:** Time entry validation rules (business logic)
Configurable rules for validating time entries and preventing common errors

**Fields (10):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| ruleName | String | ✓ |  |  |  |
| ruleType | TimeValidationRuleType | ✓ |  |  |  |
| condition | String | ✓ |  |  |  |
| errorMessage | String | ✓ |  |  |  |
| severity | String | ✓ |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| siteId | String |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** ruleType
- **Index:** siteId

---

### SsoProvider

**Description:** SSO Provider Registry
Centralized registry of all configured SSO providers

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| name | String | ✓ |  |  |  |
| type | SsoProviderType | ✓ |  |  |  |
| configId | String | ✓ |  |  |  |
| priority | Int | ✓ | auto |  |  |
| isActive | Boolean | ✓ | true |  |  |
| isDefault | Boolean | ✓ | auto |  |  |
| domainRestrictions | String[] | ✓ |  |  |  |
| groupRestrictions | String[] | ✓ |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| authenticationEvents | AuthenticationEvent[] | ✓ |  |  |  |
| homeRealmRules | HomeRealmDiscovery[] | ✓ |  |  |  |
| ssoSessions | SsoSession[] | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | HomeRealmDiscovery | homeRealmRules | ✓ |  |
| one-to-many | SsoSession | ssoSessions | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** type
- **Index:** isActive
- **Index:** isDefault
- **Index:** priority

---

### SsoSession

**Description:** SSO Session Management
Unified session handling across multiple providers

**Fields (10):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| userId | String | ✓ |  |  |  |
| primaryProviderId | String | ✓ |  |  |  |
| activeProviders | String[] | ✓ |  |  |  |
| sessionData | Json |  |  |  |  |
| expiresAt | DateTime |  |  |  |  |
| lastActivityAt | DateTime | ✓ | now( |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| primaryProvider | SsoProvider | ✓ |  |  |  |
| user | User | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | user | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** userId
- **Index:** primaryProviderId
- **Index:** expiresAt
- **Index:** lastActivityAt

---

### AuthenticationEvent

**Description:** Authentication Analytics
Comprehensive tracking of authentication events and metrics

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| userId | String |  |  |  |  |
| providerId | String | ✓ |  |  |  |
| eventType | AuthenticationEventType | ✓ |  |  |  |
| userAgent | String |  |  |  |  |
| ipAddress | String |  |  |  |  |
| location | String |  |  |  |  |
| responseTime | Int |  |  |  |  |
| errorCode | String |  |  |  |  |
| errorMessage | String |  |  |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| provider | SsoProvider | ✓ |  |  |  |
| user | User |  |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | user |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** userId
- **Index:** providerId
- **Index:** eventType
- **Index:** createdAt
- **Index:** ipAddress

---

### HomeRealmDiscovery

**Description:** Home Realm Discovery Rules
Automatic provider selection based on user attributes

**Fields (8):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| name | String | ✓ |  |  |  |
| pattern | String | ✓ |  |  |  |
| providerId | String | ✓ |  |  |  |
| priority | Int | ✓ | auto |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| provider | SsoProvider | ✓ |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** pattern
- **Index:** providerId
- **Index:** priority
- **Index:** isActive

---

### PermissionUsageLog

**Description:** Permission Usage Tracking
Logs every permission check with full context for security monitoring

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| userId | String | ✓ |  |  |  |
| permission | String | ✓ |  |  |  |
| endpoint | String |  |  |  |  |
| method | String |  |  |  |  |
| success | Boolean | ✓ |  |  |  |
| timestamp | DateTime | ✓ | now( |  |  |
| ip | String |  |  |  |  |
| userAgent | String |  |  |  |  |
| siteId | String |  |  |  |  |
| duration | Int |  |  |  |  |
| context | Json |  |  |  |  |
| site | Site |  |  |  |  |
| user | User | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Site | site |  |  |
| one-to-one | User | user | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** userId, timestamp
- **Index:** permission, timestamp
- **Index:** success, timestamp
- **Index:** siteId, timestamp
- **Index:** endpoint, method

---

### SecurityEvent

**Description:** Security Event Monitoring
Tracks security-related events for threat detection and compliance

**Fields (16):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| eventType | SecurityEventType | ✓ |  |  |  |
| severity | SecuritySeverity | ✓ |  |  |  |
| userId | String |  |  |  |  |
| ip | String |  |  |  |  |
| userAgent | String |  |  |  |  |
| description | String | ✓ |  |  |  |
| metadata | Json |  |  |  |  |
| timestamp | DateTime | ✓ | now( |  |  |
| resolved | Boolean | ✓ | auto |  |  |
| resolvedBy | String |  |  |  |  |
| resolvedAt | DateTime |  |  |  |  |
| siteId | String |  |  |  |  |
| resolvedByUser | User |  |  |  |  |
| site | Site |  |  |  |  |
| user | User |  |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | resolvedByUser |  |  |
| one-to-one | Site | site |  |  |
| one-to-one | User | user |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** eventType, timestamp
- **Index:** severity, resolved
- **Index:** userId, timestamp
- **Index:** ip, timestamp
- **Index:** siteId, timestamp

---

### UserSessionLog

**Description:** Comprehensive logging of user session activities including login times, access patterns, and system interaction tracking

**Business Purpose:** Provides security monitoring, usage analytics, and compliance audit trails for user system access and activities

**Data Governance:**
- **Data Owner:** IT Security and System Administration Teams
- **Update Frequency:** Real-time logging as users access and interact with the system
- **Data Retention:** 3 years for security analysis and compliance requirements
- **Security Classification:** Confidential - Contains user access patterns and security-sensitive information

**Compliance Notes:** Session logging required for security compliance, fraud detection, and regulatory audit requirements

**System Integrations:** Authentication Systems, Security Monitoring, Audit Management, Analytics Platforms

**Fields (12):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| userId | String | ✓ |  |  |  |
| sessionId | String | ✓ |  |  |  |
| ip | String |  |  |  |  |
| userAgent | String |  |  |  |  |
| startTime | DateTime | ✓ | now( |  |  |
| endTime | DateTime |  |  |  |  |
| duration | Int |  |  |  |  |
| actionsCount | Int | ✓ | auto |  |  |
| siteAccess | String[] | ✓ |  |  |  |
| lastActivity | DateTime | ✓ | now( |  |  |
| user | User | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | user | ✓ |  |

**Usage Examples:**

#### Active production operator session

Active production session with shop floor access across multiple sites and tracked activities

```json
{
  "userId": "EMP-001234",
  "sessionId": "sess-20241030-001234",
  "ip": "192.168.1.100",
  "startTime": "2024-10-30T06:00:00Z",
  "actionsCount": 45,
  "siteAccess": [
    "ATL-01",
    "DFW-02"
  ]
}
```

#### Completed administrative session

Completed administrative session with full duration tracking for security audit

```json
{
  "userId": "IT-ADMIN-001",
  "sessionId": "sess-20241030-admin-001",
  "ip": "192.168.1.10",
  "startTime": "2024-10-30T08:00:00Z",
  "endTime": "2024-10-30T10:30:00Z",
  "duration": "150 minutes"
}
```

**Common Queries:**
- Track user access patterns for security analysis
- Generate session reports for compliance audits
- Monitor concurrent sessions and system usage

**Related Tables:** User, SecurityEvent, AuditReport, PermissionUsageLog

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** userId, startTime
- **Index:** sessionId
- **Index:** ip, startTime
- **Index:** lastActivity

---

### AuditReport

**Description:** Automated audit reports and compliance documentation generated for regulatory requirements and quality system audits

**Business Purpose:** Provides automated generation of audit trails, compliance reports, and quality documentation for regulatory agencies and customers

**Data Governance:**
- **Data Owner:** Quality Assurance and Compliance Teams
- **Update Frequency:** Generated on-demand for audits, scheduled for periodic compliance reporting
- **Data Retention:** 7 years minimum for regulatory compliance, permanent for critical quality documentation
- **Security Classification:** Internal - Audit and compliance information with regulatory significance

**Compliance Notes:** Reports must meet regulatory requirements for AS9100, ISO 9001, FDA, and customer-specific audit standards

**System Integrations:** Quality Management Systems, Audit Management, Regulatory Reporting, Document Management

**Fields (13):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| reportType | ReportType | ✓ |  |  |  |
| title | String | ✓ |  |  |  |
| parameters | Json | ✓ |  |  |  |
| generatedBy | String | ✓ |  |  |  |
| generatedAt | DateTime | ✓ | now( |  |  |
| filePath | String |  |  |  |  |
| status | ReportStatus | ✓ |  |  |  |
| error | String |  |  |  |  |
| downloadCount | Int | ✓ | auto |  |  |
| siteId | String |  |  |  |  |
| generatedByUser | User | ✓ |  |  |  |
| site | Site |  |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | generatedByUser | ✓ |  |
| one-to-one | Site | site |  |  |

**Usage Examples:**

#### AS9100 compliance audit report

Quarterly aerospace compliance report documenting quality system performance

```json
{
  "reportType": "COMPLIANCE_AUDIT",
  "title": "AS9100 Quarterly Compliance Report",
  "generatedBy": "QA-MANAGER-001",
  "status": "COMPLETED",
  "siteId": "ATL-01"
}
```

#### Customer quality audit preparation

Customer-specific audit documentation package for supplier assessment

```json
{
  "reportType": "CUSTOMER_AUDIT",
  "title": "Boeing Supplier Quality Audit Package",
  "generatedBy": "QA-ANALYST-002",
  "status": "IN_PROGRESS",
  "downloadCount": 0
}
```

**Common Queries:**
- Generate audit reports for regulatory compliance
- Track audit report generation and access
- Create customer-specific quality documentation packages

**Related Tables:** User, Site, QualityInspection, NCR

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** reportType, generatedAt
- **Index:** generatedBy, generatedAt
- **Index:** status
- **Index:** siteId, reportType

---

### PermissionChangeLog

**Description:** Permission Change History
Tracks all changes to user permissions and roles for compliance

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| changeType | PermissionChangeType | ✓ |  | Type of permission change that was performed | Enables tracking of permission lifecycle and security posture |
| targetUserId | String | ✓ |  |  |  |
| targetRole | String |  |  |  |  |
| permission | String |  |  |  |  |
| oldValue | Json |  |  | Previous permission configuration before the change | Enables understanding of what access was previously available |
| newValue | Json |  |  | New permission configuration after the change | Documents what access is now available to the user |
| changedBy | String | ✓ |  | User who authorized and performed the permission change | Provides responsibility tracking for permission management |
| reason | String |  |  |  |  |
| timestamp | DateTime | ✓ | now( |  |  |
| siteId | String |  |  |  |  |
| changedByUser | User | ✓ |  |  |  |
| site | Site |  |  |  |  |
| targetUser | User | ✓ |  |  |  |

**Field Details:**

#### changeType

- **Data Source:** Permission management system and change workflow
- **Audit Trail:** Required for security compliance and access reviews

#### oldValue

- **Data Source:** Permission management system state before change
- **Format:** JSON structure containing previous permission details
- **Audit Trail:** Essential for rollback capabilities and audit compliance

#### newValue

- **Data Source:** Permission management system state after change
- **Format:** JSON structure containing updated permission details
- **Audit Trail:** Required for current state verification and audit compliance

#### changedBy

- **Data Source:** User authentication and authorization system
- **Validation:** Must be valid user with permission management authority
- **Audit Trail:** Critical for accountability and security investigation

**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | User | changedByUser | ✓ |  |
| one-to-one | Site | site |  |  |
| one-to-one | User | targetUser | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** targetUserId, timestamp
- **Index:** changedBy, timestamp
- **Index:** changeType, timestamp
- **Index:** siteId, timestamp

---

### RoleTemplate

**Description:** Role Template Actions for Audit Trail
Role Template - Master template definition for role configurations

**Fields (18):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| templateCode | String | ✓ |  |  |  |
| templateName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| category | RoleTemplateCategory | ✓ |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| isGlobal | Boolean | ✓ | true |  |  |
| version | String | ✓ | 1.0.0 |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdBy | String | ✓ |  |  |  |
| updatedBy | String |  |  |  |  |
| permissions | RoleTemplatePermission[] | ✓ |  |  |  |
| instances | RoleTemplateInstance[] | ✓ |  |  |  |
| usageLogs | RoleTemplateUsageLog[] | ✓ |  |  |  |
| creator | User | ✓ |  |  |  |
| updater | User |  |  |  |  |
**Relationships (5):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | RoleTemplatePermission | permissions | ✓ |  |
| one-to-many | RoleTemplateInstance | instances | ✓ |  |
| one-to-many | RoleTemplateUsageLog | usageLogs | ✓ |  |
| one-to-one | User | creator | ✓ |  |
| one-to-one | User | updater |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** templateCode
- **Index:** category
- **Index:** isActive
- **Index:** isGlobal

---

### RoleTemplatePermission

**Description:** Role Template Permissions - Defines permissions included in each template

**Fields (9):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| templateId | String | ✓ |  |  |  |
| permissionId | String | ✓ |  |  |  |
| isRequired | Boolean | ✓ | true |  |  |
| isOptional | Boolean | ✓ | auto |  |  |
| metadata | Json |  |  |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| template | RoleTemplate | ✓ |  |  |  |
| permission | Permission | ✓ |  |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** templateId, permissionId
- **Index:** templateId
- **Index:** permissionId

---

### RoleTemplateInstance

**Description:** Role Template Instance - Tracks when templates are instantiated into actual roles

**Fields (15):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| templateId | String | ✓ |  |  |  |
| roleId | String | ✓ |  |  |  |
| instanceName | String |  |  |  |  |
| siteId | String |  |  |  |  |
| customPermissions | Json |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| instantiatedAt | DateTime | ✓ | now( |  |  |
| instantiatedBy | String | ✓ |  |  |  |
| metadata | Json |  |  |  |  |
| template | RoleTemplate | ✓ |  |  |  |
| role | Role | ✓ |  |  |  |
| site | Site |  |  |  |  |
| instantiator | User | ✓ |  |  |  |
| usageLogs | RoleTemplateUsageLog[] | ✓ |  |  |  |
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Site | site |  |  |
| one-to-one | User | instantiator | ✓ |  |
| one-to-many | RoleTemplateUsageLog | usageLogs | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** templateId
- **Index:** roleId
- **Index:** siteId
- **Index:** instantiatedBy

---

### RoleTemplateUsageLog

**Description:** Role Template Usage Log - Audit trail for template operations

**Fields (14):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| templateId | String |  |  |  |  |
| instanceId | String |  |  |  |  |
| action | RoleTemplateAction | ✓ |  |  |  |
| performedBy | String | ✓ |  |  |  |
| targetUserId | String |  |  |  |  |
| siteId | String |  |  |  |  |
| details | Json |  |  |  |  |
| timestamp | DateTime | ✓ | now( |  |  |
| template | RoleTemplate |  |  |  |  |
| instance | RoleTemplateInstance |  |  |  |  |
| performer | User | ✓ |  |  |  |
| targetUser | User |  |  |  |  |
| site | Site |  |  |  |  |
**Relationships (4):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | RoleTemplateInstance | instance |  |  |
| one-to-one | User | performer | ✓ |  |
| one-to-one | User | targetUser |  |  |
| one-to-one | Site | site |  |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** templateId
- **Index:** instanceId
- **Index:** performedBy
- **Index:** targetUserId
- **Index:** timestamp

---

## Data Governance Information

### Data Ownership

| Data Owner | Tables | Count |
|------------|--------|-------|
| Corporate IT and Operations Management | Enterprise | 1 |
| Site Operations Management and Manufacturing Engineering | Site | 1 |
| Manufacturing Engineering and Production Management | Area | 1 |
| IT Security and Human Resources Teams | User | 1 |
| Human Resources and Manufacturing Engineering Teams | PersonnelClass, PersonnelSkill, PersonnelSkillAssignment, PersonnelWorkCenterAssignment | 4 |
| Human Resources and Training Management Teams | PersonnelQualification, PersonnelCertification | 2 |
| Human Resources and Production Planning Teams | PersonnelAvailability | 1 |
| Materials Management and Engineering Teams | MaterialClass | 1 |
| Materials Engineering and Quality Assurance Teams | MaterialDefinition, MaterialProperty | 2 |
| Materials Management and Quality Control Teams | MaterialLot, MaterialStateHistory | 2 |
| Materials Management and Production Control Teams | MaterialSublot, MaterialTransaction | 2 |
| Materials Management and Quality Assurance Teams | MaterialLotGenealogy | 1 |
| Manufacturing Engineering and Process Engineering Teams | Operation, OperationParameter, EquipmentOperationSpecification, RoutingStep, RoutingStepDependency, RoutingStepParameter, RoutingTemplate, WorkInstruction, WorkInstructionStep, SetupSheet | 10 |
| Manufacturing Engineering and Quality Engineering Teams | ParameterLimits | 1 |
| Manufacturing Engineering and User Experience Teams | ParameterGroup, UserWorkstationPreference | 2 |
| Manufacturing Engineering and Automation Teams | ParameterFormula, EquipmentDataCollection, EquipmentCommand | 3 |
| Manufacturing Engineering and Production Planning Teams | OperationDependency, Routing, RoutingOperation, WorkCenter, WorkUnit | 5 |
| Manufacturing Engineering and Human Resources Teams | PersonnelOperationSpecification | 1 |
| Manufacturing Engineering and Materials Management Teams | MaterialOperationSpecification | 1 |
| Manufacturing Engineering and Asset Management Teams | PhysicalAssetOperationSpecification | 1 |
| Engineering and Product Management Teams | Part | 1 |
| Production Planning and Site Operations Teams | PartSiteAvailability | 1 |
| Engineering and Manufacturing Engineering Teams | BOMItem | 1 |
| Engineering and Quality Assurance Teams | ProductSpecification | 1 |
| Product Management and Sales Engineering Teams | ProductConfiguration | 1 |
| Product Engineering and Manufacturing Engineering Teams | ConfigurationOption | 1 |
| Product Management and Engineering Teams | ProductLifecycle | 1 |
| Production Planning and Manufacturing Operations Teams | WorkOrder | 1 |
| Production Engineering Team | WorkOrderOperation | 1 |
| Production Planning Team | ProductionSchedule, ScheduleEntry | 2 |
| Production Planning and Industrial Engineering Teams | ScheduleConstraint | 1 |
| Production Planning and Quality Assurance Teams | ScheduleStateHistory | 1 |
| Production Control and Manufacturing Operations Teams | WorkOrderStatusHistory | 1 |
| Production Planning and Scheduling Teams | DispatchLog | 1 |
| Production Control and Industrial Engineering Teams | WorkPerformance | 1 |
| Production Control and Cost Accounting Teams | ProductionVariance | 1 |
| Quality Assurance Team | QualityPlan, InspectionRecord | 2 |
| Quality Engineering and Quality Assurance Teams | QualityCharacteristic | 1 |
| Quality Assurance and Quality Control Teams | QualityInspection | 1 |
| Quality Control and Inspection Teams | QualityMeasurement | 1 |
| Quality Assurance and Continuous Improvement Teams | NCR | 1 |
| Manufacturing Engineering Team | Equipment, SetupStep | 2 |
| Manufacturing Engineering and Equipment Management Teams | EquipmentCapability | 1 |
| Manufacturing Engineering and Maintenance Teams | EquipmentLog | 1 |
| Manufacturing Engineering and Production Control Teams | EquipmentStateHistory | 1 |
| Manufacturing Engineering and Industrial Engineering Teams | EquipmentPerformanceLog | 1 |
| Materials Management and Inventory Control Teams | Inventory | 1 |
| Manufacturing Operations and Quality Control Teams | SerializedPart | 1 |
| Manufacturing Operations and Quality Assurance Teams | PartGenealogy | 1 |
| Production Control and Quality Assurance Teams | WorkInstructionExecution, WorkInstructionStepExecution | 2 |
| Quality Assurance and IT Security Teams | ElectronicSignature | 1 |
| Quality Assurance and Manufacturing Engineering Teams | FAIReport, InspectionPlan | 2 |
| Quality Engineering and Manufacturing Engineering Teams | FAICharacteristic, OperationGaugeRequirement, InspectionStep | 3 |
| IT Security and Compliance Teams | AuditLog | 1 |
| Maintenance Management and Manufacturing Engineering Teams | MaintenanceWorkOrder | 1 |
| Quality Engineering and Metrology Teams | MeasurementEquipment, QIFMeasurementPlan, ToolCalibrationRecord | 3 |
| Manufacturing Engineering and CNC Programming Teams | CNCProgram, ProgramDownloadLog, ProgramLoadAuthorization | 3 |
| Production Control and IT Operations Teams | Alert | 1 |
| IT Systems and Integration Teams | IntegrationConfig, IntegrationLog | 2 |
| Production Planning and Systems Integration Teams | ProductionScheduleRequest, ProductionScheduleResponse | 2 |
| Production Control and ERP Integration Teams | ProductionPerformanceActual | 1 |
| IT Integration and Materials Management Teams | ERPMaterialTransaction | 1 |
| Human Resources and IT Integration Teams | PersonnelInfoExchange | 1 |
| Manufacturing Operations and Materials Management Teams | EquipmentMaterialMovement | 1 |
| Manufacturing Engineering and Process Control Teams | ProcessDataCollection | 1 |
| Quality Engineering Team | QIFCharacteristic, InspectionCharacteristic | 2 |
| Quality Control Team | QIFMeasurementResult, QIFMeasurement, InspectionExecution | 3 |
| Quality Engineering and Process Control Teams | SPCConfiguration, SPCRuleViolation | 2 |
| Quality Engineering and Statistical Process Control Teams | SamplingPlan | 1 |
| Quality Control and Statistical Analysis Teams | SamplingInspectionResult | 1 |
| Manufacturing Engineering and Technical Documentation Teams | WorkInstructionMedia | 1 |
| Not Specified | WorkInstructionRelation, ExportTemplate, DataCollectionFieldTemplate, WorkstationDisplayConfig, ECOAffectedDocument, ECOTask, ECOAttachment, ECOHistory, ECOCRBReview, ECORelation, CRBConfiguration, DocumentComment, CommentReaction, DocumentAnnotation, ReviewAssignment, DocumentActivity, DocumentSubscription, DocumentEditSession, ConflictResolution, StoredFile, FileVersion, BackupSchedule, BackupHistory, BackupEntry, FileAccessLog, StorageMetrics, MultipartUpload, Role, Permission, RolePermission, UserSiteRole, TimeTrackingConfiguration, LaborTimeEntry, MachineTimeEntry, IndirectCostCode, TimeEntryValidationRule, SsoProvider, SsoSession, AuthenticationEvent, HomeRealmDiscovery, PermissionUsageLog, SecurityEvent, PermissionChangeLog, RoleTemplate, RoleTemplatePermission, RoleTemplateInstance, RoleTemplateUsageLog | 47 |
| Process Engineering Team | SetupParameter | 1 |
| Manufacturing Engineering and Tool Management Teams | SetupTool | 1 |
| Production Operations Team | SetupExecution | 1 |
| Manufacturing Engineering and Training Teams | StandardOperatingProcedure | 1 |
| Manufacturing Engineering and Safety Teams | SOPStep | 1 |
| Training and Safety Management Teams | SOPAcknowledgment | 1 |
| Quality Assurance and Safety Audit Teams | SOPAudit | 1 |
| Tool Design Engineering and Manufacturing Engineering Teams | ToolDrawing | 1 |
| Maintenance Engineering and Asset Management Teams | ToolMaintenanceRecord | 1 |
| Tool Management and Manufacturing Engineering Teams | ToolUsageLog | 1 |
| Quality Management and Document Control Teams | DocumentTemplate | 1 |
| Business Process Management and IT Systems Teams | WorkflowDefinition | 1 |
| Business Process Management and Quality Assurance Teams | WorkflowStage, WorkflowInstance | 2 |
| Business Process Management and IT Operations Teams | WorkflowRule | 1 |
| Business Process Management and Operations Teams | WorkflowStageInstance, WorkflowTask | 2 |
| Business Process Management and Human Resources Teams | WorkflowAssignment, WorkflowDelegation | 2 |
| Business Process Management and Compliance Teams | WorkflowHistory | 1 |
| Business Process Management and Quality Teams | WorkflowTemplate | 1 |
| Business Process Management and Performance Analytics Teams | WorkflowMetrics | 1 |
| Business Process Management and Systems Integration Teams | WorkflowParallelCoordination | 1 |
| Engineering Change Management and Product Engineering Teams | EngineeringChangeOrder | 1 |
| System Administration and Operations Management Teams | UserNotification | 1 |
| IT Security and System Administration Teams | UserRole, UserSessionLog | 2 |
| Quality Assurance and Compliance Teams | AuditReport | 1 |


## Compliance and Security

### Compliance Requirements

| Table | Compliance Notes |
|-------|------------------|
| Enterprise | Corporate entity information required for regulatory reporting, financial consolidation, and international trade compliance |
| Site | Site registration required for regulatory compliance (FDA establishment registration, ISO certifications, environmental permits) |
| Area | Area definitions important for safety compliance, environmental controls, and quality system organization |
| User | User data must comply with privacy regulations (GDPR, CCPA), security standards, and corporate access control policies |
| PersonnelClass | Personnel classifications must align with labor regulations, safety requirements, and certification standards |
| PersonnelQualification | Critical for AS9100 personnel competency requirements, ISO 9001 training records, and industry-specific certifications |
| PersonnelCertification | Critical for AS9100 personnel competency, OSHA safety certifications, and industry-specific regulatory requirements |
| PersonnelSkill | Skill definitions support AS9100 competency requirements and provide foundation for personnel qualification and training programs |
| PersonnelSkillAssignment | Skill assignments support AS9100 competency requirements and provide foundation for work order personnel validation |
| PersonnelWorkCenterAssignment | Personnel assignments must align with certification requirements, safety qualifications, and regulatory training standards |
| PersonnelAvailability | Availability tracking supports labor compliance and ensures proper staffing for critical operations requiring certified personnel |
| MaterialClass | Material classifications must align with industry standards and customer requirements for aerospace and medical applications |
| MaterialDefinition | Material definitions must include all required certifications and specifications for regulatory compliance (AS9100, FDA, ISO) |
| MaterialProperty | Property data required for engineering analysis, quality verification, and customer material certifications |
| MaterialLot | Critical for aerospace and medical traceability requirements - lot records must be maintained for product lifetime |
| MaterialSublot | Sublot tracking required for material traceability, inventory accuracy, and regulatory compliance in controlled environments |
| MaterialLotGenealogy | Critical for aerospace, medical, and automotive recall management and regulatory traceability requirements |
| MaterialStateHistory | State history required for quality system compliance, material tracking, and regulatory audit requirements |
| Operation | Operations must be documented per AS9100 and ISO 9001 requirements. Changes require engineering approval and may need customer notification |
| OperationParameter | Parameter definitions critical for process validation, statistical process control, and regulatory manufacturing compliance |
| ParameterLimits | Control limits essential for statistical process control, process validation, and regulatory compliance documentation |
| ParameterGroup | Parameter grouping supports operator training requirements and process documentation for regulatory compliance |
| ParameterFormula | Formula documentation required for process validation, calculation traceability, and regulatory audit requirements |
| OperationDependency | Operation dependencies critical for process validation, quality control, and regulatory compliance in controlled manufacturing |
| PersonnelOperationSpecification | Personnel specifications critical for AS9100 competency requirements and ensuring qualified personnel perform critical operations |
| EquipmentOperationSpecification | Equipment specifications critical for process validation, capability verification, and regulatory compliance in controlled manufacturing |
| MaterialOperationSpecification | Material specifications critical for traceability compliance and quality assurance - must maintain material-operation linkage for regulatory audits |
| PhysicalAssetOperationSpecification | Asset specifications support capacity planning and ensure proper asset utilization for regulatory compliance and operational efficiency |
| Part | Part data critical for regulatory compliance, change control, and customer part approval requirements |
| PartSiteAvailability | Site availability must consider regulatory approvals, customer certifications, and quality system requirements |
| BOMItem | BOM changes must be controlled through engineering change process for traceability and customer approval |
| ProductSpecification | Specifications must be controlled and approved per quality system requirements and customer agreements |
| ProductConfiguration | Configuration changes may require customer approval and regulatory certification for safety-critical applications |
| ConfigurationOption | Configuration management supports product traceability and ensures proper documentation of custom product variants |
| ProductLifecycle | Lifecycle management supports product traceability, obsolescence planning, and customer notification requirements |
| WorkOrder | Work orders critical for production accountability, quality traceability, and regulatory compliance in controlled manufacturing environments |
| Routing | Routing changes must be approved and documented per AS9100 requirements. Customer notification may be required for critical parts |
| RoutingOperation | Operation assignments must maintain traceability for quality system compliance and customer requirements |
| RoutingStep | Step documentation must include verification requirements and acceptance criteria for regulatory compliance |
| RoutingStepDependency | Step dependencies essential for detailed process validation, quality control, and regulatory compliance documentation |
| RoutingStepParameter | Parameter documentation required for process validation and regulatory compliance - critical for repeatable manufacturing |
| RoutingTemplate | Templates must maintain process validation and quality requirements when instantiated for production use |
| WorkCenter | Work center definitions critical for capacity planning, resource allocation, and regulatory reporting requirements |
| WorkUnit | Work unit organization supports capacity planning and resource allocation required for production efficiency analysis |
| WorkOrderOperation | Operation records critical for AS9100 traceability requirements and FDA process validation in medical device manufacturing |
| ProductionSchedule | Schedule changes affecting customer deliveries must be documented for contract compliance and quality system requirements |
| ScheduleEntry | Schedule entries provide audit trail for production decisions and resource allocation compliance |
| ScheduleConstraint | Constraint documentation critical for schedule feasibility validation and production capacity audits |
| ScheduleStateHistory | Schedule state history required for regulatory compliance and audit trails - must maintain complete lifecycle documentation |
| WorkOrderStatusHistory | Status history required for production accountability, delivery tracking, and regulatory compliance audit trails |
| DispatchLog | Dispatch records provide audit trail for work order execution and resource accountability - critical for traceability compliance |
| WorkPerformance | Performance data required for cost accounting, efficiency analysis, and regulatory reporting requirements |
| ProductionVariance | Variance tracking required for accurate product costing and financial reporting - critical for profitability analysis |
| QualityPlan | Critical for AS9100 and ISO 9001 compliance - must be approved and controlled |
| QualityCharacteristic | Quality characteristics critical for quality system compliance, customer acceptance, and regulatory requirements (AS9100, ISO 9001, FDA) |
| QualityInspection | Critical for AS9100, ISO 9001, and FDA compliance. Electronic signatures may be required per 21 CFR Part 11 |
| QualityMeasurement | Measurement data required for SPC analysis, customer certifications, and regulatory audit trails |
| NCR | Critical for AS9100 and ISO 9001 compliance. Customer notification may be required for delivered products |
| Equipment | Calibration records required for measurement equipment (ISO 17025). Maintenance logs for safety compliance |
| EquipmentCapability | Capability certifications required for regulatory compliance, customer approvals, and quality system requirements |
| EquipmentLog | Equipment logs required for regulatory compliance, safety audits, and quality system maintenance records |
| EquipmentStateHistory | State history required for equipment efficiency reporting, utilization analysis, and production accountability |
| EquipmentPerformanceLog | Performance data required for operational reporting, efficiency analysis, and continuous improvement compliance |
| Inventory | Inventory tracking required for financial accuracy, material accountability, and regulatory compliance in controlled environments |
| MaterialTransaction | Transaction records required for cost accounting, inventory accuracy, and regulatory audit trails |
| SerializedPart | Critical for aerospace, medical, and automotive traceability requirements. Serial numbers must be maintained for product lifetime |
| PartGenealogy | Essential for aerospace, medical, and automotive recall management and regulatory traceability requirements |
| WorkInstruction | Work instructions must be controlled documents per AS9100 and ISO 9001 requirements. Changes require approval and training |
| WorkInstructionStep | Step documentation must include verification methods and acceptance criteria for quality compliance |
| WorkInstructionExecution | Execution records required for traceability and regulatory compliance (AS9100, FDA). Electronic signatures may be required |
| WorkInstructionStepExecution | Step execution data required for detailed traceability and process validation per regulatory requirements |
| ElectronicSignature | Critical for 21 CFR Part 11 FDA compliance and ISO 9001 document control - must maintain complete signature integrity |
| FAIReport | Critical for AS9102 aerospace compliance, automotive PPAP requirements, and customer-specific FAI protocols |
| FAICharacteristic | Critical for AS9102 aerospace FAI compliance and automotive PPAP requirements - must include all critical characteristics |
| AuditLog | Critical for 21 CFR Part 11, ISO 9001, and SOX compliance - must maintain complete audit trail for all regulated activities |
| MaintenanceWorkOrder | Maintenance records required for equipment warranty, safety compliance, and regulatory maintenance documentation |
| MeasurementEquipment | Critical for ISO 17025, AS9100, and FDA compliance. Calibration records required for measurement traceability |
| InspectionRecord | Critical for regulatory compliance (AS9102, FDA, ISO 9001) - inspection records must be maintained for product lifetime and audit purposes |
| CNCProgram | Program management supports traceability requirements and ensures consistent manufacturing processes for quality compliance |
| ProgramDownloadLog | Program control critical for AS9100 process control and FDA software validation requirements - maintains immutable audit trail |
| ProgramLoadAuthorization | Program authorization supports manufacturing process control and provides audit trail for quality compliance and operator certification |
| OperationGaugeRequirement | Gauge requirements critical for ISO 9001 measurement traceability and AS9102 FAI measurement system requirements |
| Alert | Alert systems support regulatory requirements for immediate response to quality and safety exceptions |
| IntegrationConfig | Integration configurations support audit trails and data integrity requirements for regulatory compliance and system validation |
| IntegrationLog | Integration logs provide audit trail for data integrity and system validation required for regulatory compliance |
| ProductionScheduleRequest | Schedule requests provide audit trail for production planning decisions and capacity allocation validation |
| ProductionScheduleResponse | Schedule responses provide audit trail for production planning decisions and capacity allocation commitments |
| ProductionPerformanceActual | Production actuals support cost accounting accuracy and provide data for regulatory reporting and customer delivery commitments |
| ERPMaterialTransaction | Integration data required for financial reconciliation, inventory accuracy, and audit trail compliance |
| PersonnelInfoExchange | Personnel data exchange must comply with data privacy regulations and maintain audit trail for HR compliance |
| EquipmentDataCollection | Data collection required for process validation, statistical process control, and regulatory compliance documentation |
| EquipmentCommand | Command tracking required for process validation, audit trails, and regulatory compliance in automated manufacturing |
| EquipmentMaterialMovement | Equipment-based material tracking required for complete traceability, quality accountability, and regulatory compliance in controlled manufacturing |
| ProcessDataCollection | Process data critical for statistical process control and regulatory compliance - must maintain data integrity for validation |
| QIFMeasurementPlan | Critical for AS9102 aerospace compliance and medical device FDA requirements using QIF industry standards for measurement traceability |
| QIFCharacteristic | Complies with QIF 3.0 standard for aerospace and automotive quality data exchange - critical for AS9102 and PPAP documentation |
| QIFMeasurementResult | QIF 3.0 compliant measurement data required for AS9102 First Article Inspection and automotive PPAP documentation |
| QIFMeasurement | Essential for AS9102 and PPAP traceability requirements - maintains complete measurement genealogy for regulatory audits |
| SPCConfiguration | SPC configurations support ISO 9001 process control requirements and automotive PPAP statistical documentation |
| SPCRuleViolation | SPC violations support ISO 9001 process control requirements and provide data for continuous improvement and quality audits |
| SamplingPlan | Sampling plans support ANSI/ASQ Z1.4 standards, automotive PPAP requirements, and aerospace AS9102 statistical sampling |
| SamplingInspectionResult | Sampling results critical for statistical process control and regulatory compliance - must follow ANSI/ASQ standards |
| WorkInstructionMedia | Media content supports training requirements and process documentation for ISO 9001 and industry-specific training standards |
| SetupSheet | Setup documentation supports ISO 9001 process control and provides traceability for setup-related quality issues |
| SetupStep | Setup procedures must be validated and controlled for regulated industries - changes require engineering approval and operator training |
| SetupParameter | Process parameters must be validated and controlled for regulated manufacturing - changes require engineering approval and process validation |
| SetupTool | Setup tool specifications support process validation and ensure consistent manufacturing capability |
| SetupExecution | Setup execution records required for quality control and regulatory compliance - must include operator verification and timestamp documentation |
| InspectionPlan | Critical for AS9102 FAI compliance, ISO 9001 quality planning, and ANSI/ASQ Z1.4 sampling standards |
| InspectionCharacteristic | Inspection characteristics must align with customer specifications and regulatory standards (AS9100, ISO 9001, FDA) for compliance verification |
| InspectionStep | Inspection procedures must be validated and controlled for regulatory compliance - changes require quality approval |
| InspectionExecution | Inspection execution records required for quality traceability and regulatory compliance - must include inspector certification and complete audit trail |
| StandardOperatingProcedure | Critical for ISO 9001 process documentation, OSHA safety compliance, and training record requirements for regulated industries |
| SOPStep | SOP procedures critical for safety compliance, regulatory requirements, and process validation - changes require approval |
| SOPAcknowledgment | SOP acknowledgments critical for safety compliance and regulatory requirements - maintains proof of training for audits |
| SOPAudit | SOP audits essential for regulatory compliance verification and maintaining safety management system effectiveness |
| ToolDrawing | Tool drawings must be controlled and validated for manufacturing repeatability and quality assurance |
| ToolMaintenanceRecord | Maintenance records support asset management requirements and provide documentation for regulatory compliance and warranty claims |
| ToolCalibrationRecord | Critical for ISO 9001 measurement system requirements, AS9102 FAI traceability, and customer-specific calibration standards |
| ToolUsageLog | Tool usage tracking supports quality control validation and process capability verification for regulatory compliance |
| DocumentTemplate | Templates must comply with regulatory document requirements (AS9100, ISO 9001, FDA) and corporate documentation standards |
| UserWorkstationPreference | Interface configurations should maintain regulatory compliance and safety visibility requirements |
| WorkflowDefinition | Workflow definitions critical for 21 CFR Part 11 electronic signature compliance and ISO 9001 process control requirements |
| WorkflowStage | Workflow stages support 21 CFR Part 11 electronic signature requirements and ISO 9001 document control processes |
| WorkflowRule | Workflow rules support SOX compliance for process automation and provide audit trail for automated business decisions |
| WorkflowInstance | Critical for 21 CFR Part 11 electronic signature workflows and ISO 9001 document control compliance |
| WorkflowStageInstance | Stage instance tracking critical for audit trails and compliance verification - maintains complete execution history |
| WorkflowAssignment | Assignment tracking essential for SOX compliance and audit trail requirements - maintains accountability and segregation of duties |
| WorkflowHistory | Critical for SOX, FDA, and regulatory audit requirements - maintains immutable record of all business process activities |
| WorkflowDelegation | Delegation tracking critical for SOX compliance and audit trail requirements - maintains clear authority and accountability |
| WorkflowTemplate | Workflow templates support process standardization and regulatory compliance by ensuring consistent implementation |
| WorkflowTask | Task tracking supports detailed audit requirements and provides granular accountability for process compliance |
| WorkflowMetrics | Workflow metrics support process validation and continuous improvement requirements for quality management systems |
| WorkflowParallelCoordination | Parallel coordination tracking ensures process integrity and audit trail completeness for complex regulatory workflows |
| EngineeringChangeOrder | Critical for ISO 9001, AS9100, and 21 CFR Part 11 compliance - must maintain complete audit trail of all product/process changes |
| UserNotification | Notification delivery and acknowledgment may be required for critical safety and quality alerts |
| UserRole | Role assignments must follow principle of least privilege and regulatory access control requirements |
| UserSessionLog | Session logging required for security compliance, fraud detection, and regulatory audit requirements |
| AuditReport | Reports must meet regulatory requirements for AS9100, ISO 9001, FDA, and customer-specific audit standards |

### Privacy and PII Data

| Table | Field | Privacy Classification |
|-------|-------|------------------------|
| User | employeeNumber | Internal employee identifier - not PII but confidential |
| User | emergencyContact | PII - Personal emergency contact information |
| LaborTimeEntry | laborRate | Confidential payroll information - restricted access |


## Integration Points

### External System Integrations

#### Active Directory

| Table | Description |
|-------|-------------|
| User | Core user management and authentication system defining personnel identity, access credentials, and organizational information |
| UserRole | Assignment of system roles to users establishing access permissions and functional capabilities within the MES |

#### Alarm Management

| Table | Description |
|-------|-------------|
| ParameterLimits | Control limits and alarm thresholds for operation parameters enabling automatic process monitoring and quality control |

#### Alert Systems

| Table | Description |
|-------|-------------|
| SPCConfiguration | Statistical Process Control configuration defining control charts, control limits, and monitoring rules for real-time manufacturing process control |
| SPCRuleViolation | Statistical Process Control rule violations tracking out-of-control conditions and triggering corrective actions for quality management |
| UserNotification | System-generated notifications and alerts delivered to users for operational updates, task assignments, and system events |

#### Analytics Platforms

| Table | Description |
|-------|-------------|
| UserSessionLog | Comprehensive logging of user session activities including login times, access patterns, and system interaction tracking |

#### Assembly Operations

| Table | Description |
|-------|-------------|
| PartGenealogy | Assembly genealogy tracking parent-child relationships between serialized parts for complete product traceability |

#### Asset Management

| Table | Description |
|-------|-------------|
| PhysicalAssetOperationSpecification | Physical asset requirements and specifications for manufacturing operations defining equipment, tooling, and infrastructure needs |
| ToolMaintenanceRecord | Tool and equipment maintenance records tracking service history, repairs, and lifecycle management for manufacturing assets |

#### Audit Management

| Table | Description |
|-------|-------------|
| EquipmentLog | Equipment activity logs capturing operational events, maintenance actions, and state changes for comprehensive equipment history |
| UserRole | Assignment of system roles to users establishing access permissions and functional capabilities within the MES |
| UserSessionLog | Comprehensive logging of user session activities including login times, access patterns, and system interaction tracking |
| AuditReport | Automated audit reports and compliance documentation generated for regulatory requirements and quality system audits |

#### Audit Management Systems

| Table | Description |
|-------|-------------|
| SOPAudit | Compliance audit records for Standard Operating Procedure adherence verification and corrective action tracking |

#### Audit Systems

| Table | Description |
|-------|-------------|
| ScheduleStateHistory | Audit trail tracking production schedule state transitions and lifecycle changes with timestamp and user accountability |
| ElectronicSignature | Electronic signatures for digital document approval and authentication supporting regulatory compliance and audit trails |
| ProgramLoadAuthorization | CNC program loading authorizations ensuring only qualified personnel can load programs to specific machines with complete audit trail |
| WorkflowDefinition | Business workflow definitions enabling automated routing of approvals, reviews, and business processes throughout the manufacturing organization |
| WorkflowStage | Workflow stage definitions within business processes defining approval steps, decision points, and stage-specific requirements |
| WorkflowInstance | Active workflow instances managing approval processes, document reviews, and business process execution with complete audit trails |
| WorkflowHistory | Complete audit trail and historical record of all workflow activities, decisions, and state changes for compliance and analysis |

#### Authentication Systems

| Table | Description |
|-------|-------------|
| UserSessionLog | Comprehensive logging of user session activities including login times, access patterns, and system interaction tracking |

#### Automated Control

| Table | Description |
|-------|-------------|
| ParameterFormula | Calculated parameters using formulas and expressions to derive values from other parameters for advanced process control |

#### BOM Management

| Table | Description |
|-------|-------------|
| ConfigurationOption | Product configuration options and variants enabling customizable manufacturing for different customer requirements and specifications |

#### Badge Access Systems

| Table | Description |
|-------|-------------|
| PersonnelInfoExchange | Data synchronization and integration records for personnel information exchange between MES and external HR/payroll systems |

#### Best Practice Libraries

| Table | Description |
|-------|-------------|
| RoutingTemplate | Reusable routing templates enabling standardized process creation, best practice sharing, and manufacturing methodology consistency |

#### Business Intelligence

| Table | Description |
|-------|-------------|
| Enterprise | Top-level organizational entity representing the entire company or corporation with multiple manufacturing sites |
| WorkflowMetrics | Performance analytics and operational metrics for workflow processes enabling continuous improvement and efficiency optimization |

#### Business Rules Engine

| Table | Description |
|-------|-------------|
| WorkflowRule | Business logic rules and automation conditions that govern workflow behavior, transitions, and decision-making processes |

#### CAD Systems

| Table | Description |
|-------|-------------|
| Part | Master part data defining all manufactured, purchased, and assemblable items with specifications and lifecycle management |
| QIFMeasurementPlan | Quality Information Framework measurement plans defining structured measurement requirements for aerospace and medical device compliance |
| QIFCharacteristic | Quality Information Framework (QIF) characteristic definitions specifying measurable quality attributes and their tolerances |
| ToolDrawing | Engineering drawings and technical specifications for manufacturing tools, fixtures, and production equipment |

#### CMM Programming

| Table | Description |
|-------|-------------|
| QIFCharacteristic | Quality Information Framework (QIF) characteristic definitions specifying measurable quality attributes and their tolerances |

#### CMMS Systems

| Table | Description |
|-------|-------------|
| MaintenanceWorkOrder | Maintenance work orders managing preventive, corrective, and emergency maintenance activities across manufacturing equipment |

#### CNC Equipment

| Table | Description |
|-------|-------------|
| ProgramDownloadLog | Audit trail and version control for CNC program downloads to manufacturing equipment ensuring program integrity and traceability |

#### CNC Program Management

| Table | Description |
|-------|-------------|
| ProgramLoadAuthorization | CNC program loading authorizations ensuring only qualified personnel can load programs to specific machines with complete audit trail |

#### Calibration Management

| Table | Description |
|-------|-------------|
| MeasurementEquipment | Calibrated measurement and inspection equipment with certification tracking and maintenance schedules |

#### Calibration Services

| Table | Description |
|-------|-------------|
| ToolCalibrationRecord | Tool and measurement equipment calibration records maintaining traceability and accuracy verification for quality assurance and regulatory compliance |

#### Calibration System

| Table | Description |
|-------|-------------|
| Equipment | Manufacturing equipment and machinery used in production operations with capability and status tracking |

#### Calibration Systems

| Table | Description |
|-------|-------------|
| OperationGaugeRequirement | Measurement equipment and gauge requirements for specific manufacturing operations ensuring proper inspection capability and measurement traceability |

#### Capacity Management

| Table | Description |
|-------|-------------|
| ProductionScheduleRequest | External production scheduling requests from ERP systems or planning applications requiring MES validation and capacity confirmation |
| ProductionScheduleResponse | MES responses to external production scheduling requests confirming feasibility, proposing alternatives, or rejecting infeasible schedules |

#### Capacity Planning

| Table | Description |
|-------|-------------|
| PersonnelWorkCenterAssignment | Assignment of personnel to specific work centers defining operational responsibilities, certifications, and capacity allocation |
| PersonnelAvailability | Personnel availability schedules tracking work patterns, shifts, time off, and capacity planning for manufacturing resource allocation |
| OperationDependency | Dependencies and prerequisites between manufacturing operations defining sequence constraints and timing relationships for production scheduling |
| EquipmentOperationSpecification | Equipment requirements and specifications for manufacturing operations defining equipment capabilities, capacity, and setup requirements |
| PhysicalAssetOperationSpecification | Physical asset requirements and specifications for manufacturing operations defining equipment, tooling, and infrastructure needs |
| Routing | Manufacturing process routes defining the complete sequence of operations required to produce a specific part or assembly |
| RoutingOperation | Specific operations assigned to routings with work center assignments and timing details for manufacturing execution |
| WorkCenter | Manufacturing work centers that organize equipment, personnel, and operations within functional areas of the facility |
| WorkUnit | Work center subdivisions representing distinct operational areas within work centers for granular production control and resource allocation |
| ProductionSchedule | Master production schedules coordinating work orders, resources, and timeline across the manufacturing facility |
| ScheduleConstraint | Production schedule constraints defining capacity limitations, resource availability, and operational dependencies that must be respected during scheduling |

#### Certificate Generation

| Table | Description |
|-------|-------------|
| SamplingInspectionResult | Statistical sampling inspection results capturing acceptance decisions and quality control outcomes for production lots |

#### Certificate of Compliance Generation

| Table | Description |
|-------|-------------|
| InspectionRecord | Individual inspection records capturing quality measurements and compliance data for manufactured parts and materials |

#### Certification Bodies

| Table | Description |
|-------|-------------|
| PersonnelQualification | Personnel qualifications and competency records tracking certifications, skills, training completion, and authorization levels for manufacturing operations |
| PersonnelCertification | Personnel certification records tracking professional credentials, industry certifications, and specialized qualifications for manufacturing operations |

#### Certification Management

| Table | Description |
|-------|-------------|
| EquipmentCapability | Specific capabilities and qualifications of manufacturing equipment including certifications and operational parameters |

#### Certification Tracking

| Table | Description |
|-------|-------------|
| PersonnelClass | Hierarchical classification system for organizing personnel by job function, skill level, and organizational responsibility |

#### Change Management

| Table | Description |
|-------|-------------|
| ScheduleStateHistory | Audit trail tracking production schedule state transitions and lifecycle changes with timestamp and user accountability |
| WorkflowTemplate | Reusable workflow patterns and standardized process templates for consistent business process implementation across the organization |

#### Competency Management

| Table | Description |
|-------|-------------|
| PersonnelSkill | Personnel skill definitions and competency levels for manufacturing operations defining specific technical capabilities and proficiency requirements |
| PersonnelSkillAssignment | Personnel skill assignments linking employees to specific skills with competency levels and certification status for work order assignment |
| PersonnelOperationSpecification | Personnel requirements and specifications for manufacturing operations defining required skills, certifications, and competency levels |

#### Compliance Reporting

| Table | Description |
|-------|-------------|
| PersonnelCertification | Personnel certification records tracking professional credentials, industry certifications, and specialized qualifications for manufacturing operations |
| ScheduleStateHistory | Audit trail tracking production schedule state transitions and lifecycle changes with timestamp and user accountability |
| ElectronicSignature | Electronic signatures for digital document approval and authentication supporting regulatory compliance and audit trails |
| AuditLog | System audit logs capturing all critical data changes, user actions, and system events for regulatory compliance and security monitoring |
| SOPAcknowledgment | Employee acknowledgment and compliance records for Standard Operating Procedure training and understanding verification |
| SOPAudit | Compliance audit records for Standard Operating Procedure adherence verification and corrective action tracking |
| WorkflowHistory | Complete audit trail and historical record of all workflow activities, decisions, and state changes for compliance and analysis |

#### Compliance Systems

| Table | Description |
|-------|-------------|
| WorkflowRule | Business logic rules and automation conditions that govern workflow behavior, transitions, and decision-making processes |
| WorkflowTemplate | Reusable workflow patterns and standardized process templates for consistent business process implementation across the organization |

#### Continuous Improvement

| Table | Description |
|-------|-------------|
| ProductionVariance | Cost and performance variance tracking comparing actual production results against planned targets for continuous improvement |

#### Continuous Improvement Systems

| Table | Description |
|-------|-------------|
| WorkPerformance | Actual production performance data capturing labor, material, and equipment metrics against planned targets for continuous improvement |

#### Coordinate Measuring Machines

| Table | Description |
|-------|-------------|
| QIFMeasurementResult | Quality Information Framework (QIF) measurement results containing actual measured values and statistical analysis data |

#### Corrective Action Systems

| Table | Description |
|-------|-------------|
| NCR | Non-Conformance Reports documenting quality issues, defects, and corrective actions throughout the manufacturing process |
| SOPAudit | Compliance audit records for Standard Operating Procedure adherence verification and corrective action tracking |

#### Cost Accounting

| Table | Description |
|-------|-------------|
| WorkOrder | Central production work orders defining specific manufacturing jobs with materials, operations, quantities, and scheduling requirements |
| ProductionVariance | Cost and performance variance tracking comparing actual production results against planned targets for continuous improvement |
| MaterialTransaction | Detailed record of all material movements, consumption, and inventory changes with timestamps and authorization |
| ProductionPerformanceActual | Actual production performance data captured from manufacturing operations for ERP integration and performance analysis |
| ERPMaterialTransaction | Integration transactions with ERP systems for material movements, consumption, and inventory synchronization across enterprise systems |
| ToolMaintenanceRecord | Tool and equipment maintenance records tracking service history, repairs, and lifecycle management for manufacturing assets |

#### Cost Estimation

| Table | Description |
|-------|-------------|
| Routing | Manufacturing process routes defining the complete sequence of operations required to produce a specific part or assembly |

#### Cost Management

| Table | Description |
|-------|-------------|
| PartSiteAvailability | Part availability and manufacturing capability by site including costs, lead times, and production constraints for multi-site operations |
| BOMItem | Bill of Materials structure defining parent-child relationships between parts with quantities and assembly information |

#### Customer Certification Systems

| Table | Description |
|-------|-------------|
| QualityMeasurement | Individual measurement data collected during quality inspections with actual values, results, and acceptance criteria |

#### Customer Communication

| Table | Description |
|-------|-------------|
| WorkOrderStatusHistory | Complete audit trail of work order status transitions tracking lifecycle progression, decision points, and operational milestones |

#### Customer Delivery

| Table | Description |
|-------|-------------|
| MaterialLotGenealogy | Parent-child relationships between material lots tracking transformations, combinations, and processing history throughout manufacturing |

#### Customer Management

| Table | Description |
|-------|-------------|
| ProductLifecycle | Product lifecycle management tracking development phases, production status, and end-of-life planning for manufactured products |
| NCR | Non-Conformance Reports documenting quality issues, defects, and corrective actions throughout the manufacturing process |

#### Customer Order Management

| Table | Description |
|-------|-------------|
| ProductionSchedule | Master production schedules coordinating work orders, resources, and timeline across the manufacturing facility |

#### Customer Portal

| Table | Description |
|-------|-------------|
| FAIReport | First Article Inspection reports documenting complete dimensional and functional verification for new or changed manufacturing processes |

#### Customer Portals

| Table | Description |
|-------|-------------|
| QIFMeasurementPlan | Quality Information Framework measurement plans defining structured measurement requirements for aerospace and medical device compliance |

#### Customer Quality Portals

| Table | Description |
|-------|-------------|
| QIFMeasurementResult | Quality Information Framework (QIF) measurement results containing actual measured values and statistical analysis data |

#### Customer Quality Reports

| Table | Description |
|-------|-------------|
| InspectionRecord | Individual inspection records capturing quality measurements and compliance data for manufactured parts and materials |

#### Customer Quality Requirements

| Table | Description |
|-------|-------------|
| InspectionCharacteristic | Specific measurable attributes and quality characteristics that must be inspected during quality control processes |

#### Customer Reporting

| Table | Description |
|-------|-------------|
| ProductionPerformanceActual | Actual production performance data captured from manufacturing operations for ERP integration and performance analysis |

#### Customer Requirements

| Table | Description |
|-------|-------------|
| PartSiteAvailability | Part availability and manufacturing capability by site including costs, lead times, and production constraints for multi-site operations |
| ProductSpecification | Detailed technical specifications and requirements for parts including dimensions, materials, and performance criteria |
| ConfigurationOption | Product configuration options and variants enabling customizable manufacturing for different customer requirements and specifications |
| QualityCharacteristic | Quality characteristics and measurement specifications defining inspection requirements, tolerances, and acceptance criteria for manufacturing quality control |
| FAICharacteristic | First Article Inspection characteristics defining specific measurements and acceptance criteria for aerospace and medical device validation |
| SamplingPlan | Statistical sampling plans defining inspection frequency, sample sizes, and acceptance criteria for quality control and regulatory compliance |

#### Dashboard Systems

| Table | Description |
|-------|-------------|
| Alert | System alerts and notifications for real-time monitoring of manufacturing operations, quality exceptions, and equipment status |

#### Data Warehouse

| Table | Description |
|-------|-------------|
| WorkflowHistory | Complete audit trail and historical record of all workflow activities, decisions, and state changes for compliance and analysis |

#### Decision Management

| Table | Description |
|-------|-------------|
| WorkflowRule | Business logic rules and automation conditions that govern workflow behavior, transitions, and decision-making processes |
| WorkflowParallelCoordination | Coordination and synchronization management for parallel workflow branches enabling complex multi-path business process execution |

#### Digital Asset Management

| Table | Description |
|-------|-------------|
| WorkInstructionMedia | Multimedia content for work instructions including images, videos, animations, and interactive content supporting manufacturing operations |

#### Display Management

| Table | Description |
|-------|-------------|
| UserWorkstationPreference | User-specific workstation display and interface preferences for optimized work instruction execution and system interaction |

#### Document Control

| Table | Description |
|-------|-------------|
| StandardOperatingProcedure | Standardized operating procedures providing detailed step-by-step instructions for manufacturing operations, safety protocols, and quality procedures |
| WorkflowStage | Workflow stage definitions within business processes defining approval steps, decision points, and stage-specific requirements |
| WorkflowInstance | Active workflow instances managing approval processes, document reviews, and business process execution with complete audit trails |
| EngineeringChangeOrder | Engineering change orders managing all product and process modifications with complete approval workflow and compliance traceability |

#### Document Management

| Table | Description |
|-------|-------------|
| ElectronicSignature | Electronic signatures for digital document approval and authentication supporting regulatory compliance and audit trails |
| AuditLog | System audit logs capturing all critical data changes, user actions, and system events for regulatory compliance and security monitoring |
| WorkInstructionMedia | Multimedia content for work instructions including images, videos, animations, and interactive content supporting manufacturing operations |
| WorkflowDefinition | Business workflow definitions enabling automated routing of approvals, reviews, and business processes throughout the manufacturing organization |
| AuditReport | Automated audit reports and compliance documentation generated for regulatory requirements and quality system audits |

#### Document Management System

| Table | Description |
|-------|-------------|
| DocumentTemplate | Standardized document templates for creating consistent manufacturing documents, forms, and reports |

#### ERP BOM Management

| Table | Description |
|-------|-------------|
| BOMItem | Bill of Materials structure defining parent-child relationships between parts with quantities and assembly information |

#### ERP Corporate Module

| Table | Description |
|-------|-------------|
| Enterprise | Top-level organizational entity representing the entire company or corporation with multiple manufacturing sites |

#### ERP Costing

| Table | Description |
|-------|-------------|
| WorkPerformance | Actual production performance data capturing labor, material, and equipment metrics against planned targets for continuous improvement |

#### ERP Inventory Module

| Table | Description |
|-------|-------------|
| MaterialTransaction | Detailed record of all material movements, consumption, and inventory changes with timestamps and authorization |

#### ERP Materials Management

| Table | Description |
|-------|-------------|
| MaterialClass | Hierarchical classification system for organizing materials by type, characteristics, and usage patterns |

#### ERP Materials Module

| Table | Description |
|-------|-------------|
| MaterialLot | Individual lots or batches of materials with complete traceability information including supplier certifications and quality data |

#### ERP Planning System

| Table | Description |
|-------|-------------|
| ProductionSchedule | Master production schedules coordinating work orders, resources, and timeline across the manufacturing facility |

#### ERP Plant Management

| Table | Description |
|-------|-------------|
| Site | Manufacturing facility or plant location within an enterprise, representing a physical production location |

#### ERP Product Master

| Table | Description |
|-------|-------------|
| Part | Master part data defining all manufactured, purchased, and assemblable items with specifications and lifecycle management |

#### ERP Systems

| Table | Description |
|-------|-------------|
| ProductionVariance | Cost and performance variance tracking comparing actual production results against planned targets for continuous improvement |
| IntegrationConfig | Integration configuration settings for external system connections including ERP, quality systems, and third-party manufacturing applications |
| IntegrationLog | Integration transaction logs capturing data exchanges between MES and external systems with error tracking and performance monitoring |
| ProductionScheduleRequest | External production scheduling requests from ERP systems or planning applications requiring MES validation and capacity confirmation |
| ProductionScheduleResponse | MES responses to external production scheduling requests confirming feasibility, proposing alternatives, or rejecting infeasible schedules |
| ProductionPerformanceActual | Actual production performance data captured from manufacturing operations for ERP integration and performance analysis |
| ERPMaterialTransaction | Integration transactions with ERP systems for material movements, consumption, and inventory synchronization across enterprise systems |

#### Electronic Signature System

| Table | Description |
|-------|-------------|
| WorkflowDefinition | Business workflow definitions enabling automated routing of approvals, reviews, and business processes throughout the manufacturing organization |

#### Electronic Signature Systems

| Table | Description |
|-------|-------------|
| WorkInstructionExecution | Records of work instruction execution including operator, timing, and completion status for specific work orders |
| SOPAcknowledgment | Employee acknowledgment and compliance records for Standard Operating Procedure training and understanding verification |
| WorkflowDelegation | Authority delegation and coverage management for workflow responsibilities enabling business continuity and flexible resource allocation |

#### Electronic Signatures

| Table | Description |
|-------|-------------|
| StandardOperatingProcedure | Standardized operating procedures providing detailed step-by-step instructions for manufacturing operations, safety protocols, and quality procedures |
| WorkflowStage | Workflow stage definitions within business processes defining approval steps, decision points, and stage-specific requirements |
| WorkflowInstance | Active workflow instances managing approval processes, document reviews, and business process execution with complete audit trails |

#### Email Systems

| Table | Description |
|-------|-------------|
| UserNotification | System-generated notifications and alerts delivered to users for operational updates, task assignments, and system events |

#### Engineering Analysis Tools

| Table | Description |
|-------|-------------|
| MaterialProperty | Physical, chemical, and mechanical properties of materials with test results and certification data |

#### Engineering Change Control

| Table | Description |
|-------|-------------|
| MaterialDefinition | Detailed specifications and requirements for specific materials including technical properties and supplier information |
| ProductConfiguration | Product configuration variants and options enabling customizable products with different features and characteristics |
| ToolDrawing | Engineering drawings and technical specifications for manufacturing tools, fixtures, and production equipment |

#### Engineering Change Management

| Table | Description |
|-------|-------------|
| ConfigurationOption | Product configuration options and variants enabling customizable manufacturing for different customer requirements and specifications |
| ProductLifecycle | Product lifecycle management tracking development phases, production status, and end-of-life planning for manufactured products |
| FAIReport | First Article Inspection reports documenting complete dimensional and functional verification for new or changed manufacturing processes |

#### Engineering Change System

| Table | Description |
|-------|-------------|
| QualityPlan | Quality control plans defining inspection requirements, measurement criteria, and acceptance standards for manufacturing operations |

#### Engineering Drawings

| Table | Description |
|-------|-------------|
| FAICharacteristic | First Article Inspection characteristics defining specific measurements and acceptance criteria for aerospace and medical device validation |

#### Environmental Management Systems

| Table | Description |
|-------|-------------|
| Site | Manufacturing facility or plant location within an enterprise, representing a physical production location |

#### Equipment Control

| Table | Description |
|-------|-------------|
| RoutingStepParameter | Specific parameters and settings for individual routing steps enabling precise control of manufacturing operations at the step level |
| ProgramLoadAuthorization | CNC program loading authorizations ensuring only qualified personnel can load programs to specific machines with complete audit trail |
| SPCConfiguration | Statistical Process Control configuration defining control charts, control limits, and monitoring rules for real-time manufacturing process control |
| ToolMaintenanceRecord | Tool and equipment maintenance records tracking service history, repairs, and lifecycle management for manufacturing assets |
| ToolUsageLog | Comprehensive usage tracking and lifecycle management for manufacturing tools including utilization, performance, and maintenance history |

#### Equipment Control Systems

| Table | Description |
|-------|-------------|
| SetupStep | Individual steps in manufacturing setup procedures defining specific actions required to configure equipment for production |
| SetupParameter | Configurable parameters and their values required for equipment setup procedures and manufacturing processes |
| SetupExecution | Execution records of manufacturing setup procedures tracking completion status, times, and operator verification |

#### Equipment Controllers

| Table | Description |
|-------|-------------|
| WorkOrderOperation | Individual manufacturing operations within a work order, defining the specific steps, resources, and sequence required to transform materials |
| ScheduleEntry | Individual scheduled activities linking specific work order operations to equipment, personnel, and time slots |
| Equipment | Manufacturing equipment and machinery used in production operations with capability and status tracking |
| EquipmentLog | Equipment activity logs capturing operational events, maintenance actions, and state changes for comprehensive equipment history |
| EquipmentStateHistory | Complete history of equipment state transitions tracking operational status, downtime, and utilization patterns |
| EquipmentPerformanceLog | Equipment performance metrics tracking availability, performance efficiency, and Overall Equipment Effectiveness (OEE) |
| WorkInstruction | Detailed step-by-step instructions for manufacturing operations, processes, and procedures |
| EquipmentDataCollection | Real-time data collection from manufacturing equipment capturing process parameters, sensor readings, and operational metrics for analysis and control |
| EquipmentCommand | Equipment control commands and automation instructions sent to manufacturing equipment with execution tracking and response management |
| EquipmentMaterialMovement | Material movements and transactions processed through manufacturing equipment with complete traceability and quality status tracking |

#### Equipment Management

| Table | Description |
|-------|-------------|
| Area | Functional work area within a manufacturing site, such as machining centers, assembly lines, or quality labs |
| Operation | Individual manufacturing operations defining specific processes, procedures, and requirements for transforming materials |
| EquipmentOperationSpecification | Equipment requirements and specifications for manufacturing operations defining equipment capabilities, capacity, and setup requirements |
| WorkCenter | Manufacturing work centers that organize equipment, personnel, and operations within functional areas of the facility |
| WorkUnit | Work center subdivisions representing distinct operational areas within work centers for granular production control and resource allocation |
| ScheduleConstraint | Production schedule constraints defining capacity limitations, resource availability, and operational dependencies that must be respected during scheduling |
| EquipmentCapability | Specific capabilities and qualifications of manufacturing equipment including certifications and operational parameters |
| MaintenanceWorkOrder | Maintenance work orders managing preventive, corrective, and emergency maintenance activities across manufacturing equipment |
| CNCProgram | CNC machining programs and G-code management with version control and machine-specific optimization for manufacturing operations |
| OperationGaugeRequirement | Measurement equipment and gauge requirements for specific manufacturing operations ensuring proper inspection capability and measurement traceability |
| Alert | System alerts and notifications for real-time monitoring of manufacturing operations, quality exceptions, and equipment status |
| SetupSheet | Manufacturing setup sheets providing detailed instructions for equipment configuration, tooling setup, and process preparation for production operations |
| SetupTool | Specific tools and equipment required for manufacturing setup procedures with specifications and usage requirements |
| ToolCalibrationRecord | Tool and measurement equipment calibration records maintaining traceability and accuracy verification for quality assurance and regulatory compliance |

#### Ergonomics Analysis

| Table | Description |
|-------|-------------|
| UserWorkstationPreference | User-specific workstation display and interface preferences for optimized work instruction execution and system interaction |

#### Event Processing

| Table | Description |
|-------|-------------|
| WorkflowParallelCoordination | Coordination and synchronization management for parallel workflow branches enabling complex multi-path business process execution |

#### External Databases

| Table | Description |
|-------|-------------|
| IntegrationConfig | Integration configuration settings for external system connections including ERP, quality systems, and third-party manufacturing applications |
| IntegrationLog | Integration transaction logs capturing data exchanges between MES and external systems with error tracking and performance monitoring |

#### FAI Reporting

| Table | Description |
|-------|-------------|
| FAICharacteristic | First Article Inspection characteristics defining specific measurements and acceptance criteria for aerospace and medical device validation |
| QIFMeasurementPlan | Quality Information Framework measurement plans defining structured measurement requirements for aerospace and medical device compliance |
| InspectionPlan | Quality inspection plans defining comprehensive inspection strategies, procedures, and acceptance criteria for manufacturing operations |

#### Facility Management

| Table | Description |
|-------|-------------|
| Site | Manufacturing facility or plant location within an enterprise, representing a physical production location |

#### Financial Management

| Table | Description |
|-------|-------------|
| ERPMaterialTransaction | Integration transactions with ERP systems for material movements, consumption, and inventory synchronization across enterprise systems |

#### Financial Reporting Systems

| Table | Description |
|-------|-------------|
| Enterprise | Top-level organizational entity representing the entire company or corporation with multiple manufacturing sites |

#### Financial Systems

| Table | Description |
|-------|-------------|
| Inventory | Material inventory management tracking quantities, locations, costs, and availability across all manufacturing sites and storage locations |

#### Form Generation Tools

| Table | Description |
|-------|-------------|
| DocumentTemplate | Standardized document templates for creating consistent manufacturing documents, forms, and reports |

#### HR Management

| Table | Description |
|-------|-------------|
| PersonnelAvailability | Personnel availability schedules tracking work patterns, shifts, time off, and capacity planning for manufacturing resource allocation |

#### HR Management Systems

| Table | Description |
|-------|-------------|
| User | Core user management and authentication system defining personnel identity, access credentials, and organizational information |
| PersonnelClass | Hierarchical classification system for organizing personnel by job function, skill level, and organizational responsibility |
| PersonnelWorkCenterAssignment | Assignment of personnel to specific work centers defining operational responsibilities, certifications, and capacity allocation |
| PersonnelInfoExchange | Data synchronization and integration records for personnel information exchange between MES and external HR/payroll systems |

#### Inspection Equipment

| Table | Description |
|-------|-------------|
| InspectionRecord | Individual inspection records capturing quality measurements and compliance data for manufactured parts and materials |
| QIFMeasurement | Individual QIF measurement instances linking measurement results to specific parts and inspection events |
| InspectionCharacteristic | Specific measurable attributes and quality characteristics that must be inspected during quality control processes |

#### Inspection Planning

| Table | Description |
|-------|-------------|
| ProductSpecification | Detailed technical specifications and requirements for parts including dimensions, materials, and performance criteria |
| QualityCharacteristic | Quality characteristics and measurement specifications defining inspection requirements, tolerances, and acceptance criteria for manufacturing quality control |
| SamplingPlan | Statistical sampling plans defining inspection frequency, sample sizes, and acceptance criteria for quality control and regulatory compliance |

#### Inspection Plans

| Table | Description |
|-------|-------------|
| InspectionStep | Individual steps within inspection procedures defining specific measurement actions, acceptance criteria, and verification requirements |
| InspectionExecution | Execution records of quality inspection activities tracking inspector actions, measurement completion, and inspection results |

#### Inspection Systems

| Table | Description |
|-------|-------------|
| MaterialStateHistory | Complete audit trail of material lot state and status transitions including quality events, location changes, and process milestones |
| MeasurementEquipment | Calibrated measurement and inspection equipment with certification tracking and maintenance schedules |

#### Inspector Certification

| Table | Description |
|-------|-------------|
| InspectionExecution | Execution records of quality inspection activities tracking inspector actions, measurement completion, and inspection results |

#### Inventory Control

| Table | Description |
|-------|-------------|
| MaterialSublot | Subdivision of material lots into smaller batches enabling precise material allocation, work order reservations, and inventory control |
| MaterialStateHistory | Complete audit trail of material lot state and status transitions including quality events, location changes, and process milestones |
| MaterialOperationSpecification | Material requirements and consumption specifications for manufacturing operations defining material types, quantities, and quality standards |
| ERPMaterialTransaction | Integration transactions with ERP systems for material movements, consumption, and inventory synchronization across enterprise systems |
| SetupTool | Specific tools and equipment required for manufacturing setup procedures with specifications and usage requirements |

#### Inventory Management

| Table | Description |
|-------|-------------|
| MaterialLot | Individual lots or batches of materials with complete traceability information including supplier certifications and quality data |
| Part | Master part data defining all manufactured, purchased, and assemblable items with specifications and lifecycle management |
| MaintenanceWorkOrder | Maintenance work orders managing preventive, corrective, and emergency maintenance activities across manufacturing equipment |

#### Labor Management

| Table | Description |
|-------|-------------|
| ScheduleEntry | Individual scheduled activities linking specific work order operations to equipment, personnel, and time slots |

#### Labor Tracking

| Table | Description |
|-------|-------------|
| WorkOrder | Central production work orders defining specific manufacturing jobs with materials, operations, quantities, and scheduling requirements |
| DispatchLog | Work order dispatching and resource assignment tracking for production execution with operator and equipment allocation |

#### Local Regulatory Systems

| Table | Description |
|-------|-------------|
| Site | Manufacturing facility or plant location within an enterprise, representing a physical production location |

#### Maintenance Management

| Table | Description |
|-------|-------------|
| Equipment | Manufacturing equipment and machinery used in production operations with capability and status tracking |
| EquipmentLog | Equipment activity logs capturing operational events, maintenance actions, and state changes for comprehensive equipment history |
| EquipmentStateHistory | Complete history of equipment state transitions tracking operational status, downtime, and utilization patterns |

#### Maintenance Planning

| Table | Description |
|-------|-------------|
| EquipmentPerformanceLog | Equipment performance metrics tracking availability, performance efficiency, and Overall Equipment Effectiveness (OEE) |

#### Maintenance Scheduling

| Table | Description |
|-------|-------------|
| ToolMaintenanceRecord | Tool and equipment maintenance records tracking service history, repairs, and lifecycle management for manufacturing assets |

#### Maintenance Systems

| Table | Description |
|-------|-------------|
| PhysicalAssetOperationSpecification | Physical asset requirements and specifications for manufacturing operations defining equipment, tooling, and infrastructure needs |
| ToolUsageLog | Comprehensive usage tracking and lifecycle management for manufacturing tools including utilization, performance, and maintenance history |

#### Manufacturing Engineering

| Table | Description |
|-------|-------------|
| FAIReport | First Article Inspection reports documenting complete dimensional and functional verification for new or changed manufacturing processes |

#### Manufacturing Execution

| Table | Description |
|-------|-------------|
| MaterialLotGenealogy | Parent-child relationships between material lots tracking transformations, combinations, and processing history throughout manufacturing |
| SerializedPart | Individual serialized parts with unique identifiers enabling complete traceability throughout manufacturing and service life |

#### Manufacturing Execution Systems

| Table | Description |
|-------|-------------|
| ProgramDownloadLog | Audit trail and version control for CNC program downloads to manufacturing equipment ensuring program integrity and traceability |
| EquipmentCommand | Equipment control commands and automation instructions sent to manufacturing equipment with execution tracking and response management |

#### Manufacturing Planning

| Table | Description |
|-------|-------------|
| ProductConfiguration | Product configuration variants and options enabling customizable products with different features and characteristics |

#### Manufacturing Standards

| Table | Description |
|-------|-------------|
| RoutingTemplate | Reusable routing templates enabling standardized process creation, best practice sharing, and manufacturing methodology consistency |

#### Manufacturing Systems

| Table | Description |
|-------|-------------|
| ToolDrawing | Engineering drawings and technical specifications for manufacturing tools, fixtures, and production equipment |

#### Material Management

| Table | Description |
|-------|-------------|
| MaterialOperationSpecification | Material requirements and consumption specifications for manufacturing operations defining material types, quantities, and quality standards |
| EquipmentMaterialMovement | Material movements and transactions processed through manufacturing equipment with complete traceability and quality status tracking |

#### Material Requirements Planning

| Table | Description |
|-------|-------------|
| MaterialSublot | Subdivision of material lots into smaller batches enabling precise material allocation, work order reservations, and inventory control |
| BOMItem | Bill of Materials structure defining parent-child relationships between parts with quantities and assembly information |
| WorkOrder | Central production work orders defining specific manufacturing jobs with materials, operations, quantities, and scheduling requirements |
| ProductionSchedule | Master production schedules coordinating work orders, resources, and timeline across the manufacturing facility |
| Inventory | Material inventory management tracking quantities, locations, costs, and availability across all manufacturing sites and storage locations |

#### Measurement Equipment

| Table | Description |
|-------|-------------|
| QualityPlan | Quality control plans defining inspection requirements, measurement criteria, and acceptance standards for manufacturing operations |
| QualityInspection | Quality inspection records tracking the execution of quality plans with inspector assignments, results, and compliance status |
| QualityMeasurement | Individual measurement data collected during quality inspections with actual values, results, and acceptance criteria |
| WorkInstructionStep | Individual steps within work instructions containing specific actions, parameters, and verification requirements |
| WorkInstructionStepExecution | Detailed execution records for individual work instruction steps including data collection, verification, and timing |
| InspectionStep | Individual steps within inspection procedures defining specific measurement actions, acceptance criteria, and verification requirements |

#### Measurement Systems

| Table | Description |
|-------|-------------|
| QualityCharacteristic | Quality characteristics and measurement specifications defining inspection requirements, tolerances, and acceptance criteria for manufacturing quality control |
| FAICharacteristic | First Article Inspection characteristics defining specific measurements and acceptance criteria for aerospace and medical device validation |
| OperationGaugeRequirement | Measurement equipment and gauge requirements for specific manufacturing operations ensuring proper inspection capability and measurement traceability |
| QIFMeasurementPlan | Quality Information Framework measurement plans defining structured measurement requirements for aerospace and medical device compliance |
| InspectionPlan | Quality inspection plans defining comprehensive inspection strategies, procedures, and acceptance criteria for manufacturing operations |
| InspectionCharacteristic | Specific measurable attributes and quality characteristics that must be inspected during quality control processes |

#### Metrology Labs

| Table | Description |
|-------|-------------|
| MeasurementEquipment | Calibrated measurement and inspection equipment with certification tracking and maintenance schedules |

#### Metrology Systems

| Table | Description |
|-------|-------------|
| ToolCalibrationRecord | Tool and measurement equipment calibration records maintaining traceability and accuracy verification for quality assurance and regulatory compliance |

#### Mobile Applications

| Table | Description |
|-------|-------------|
| UserNotification | System-generated notifications and alerts delivered to users for operational updates, task assignments, and system events |

#### Monitoring Systems

| Table | Description |
|-------|-------------|
| IntegrationLog | Integration transaction logs capturing data exchanges between MES and external systems with error tracking and performance monitoring |

#### Non-Conformance Management

| Table | Description |
|-------|-------------|
| QualityInspection | Quality inspection records tracking the execution of quality plans with inspector assignments, results, and compliance status |

#### Non-Conformance Systems

| Table | Description |
|-------|-------------|
| InspectionExecution | Execution records of quality inspection activities tracking inspector actions, measurement completion, and inspection results |

#### Notification Systems

| Table | Description |
|-------|-------------|
| Alert | System alerts and notifications for real-time monitoring of manufacturing operations, quality exceptions, and equipment status |
| WorkflowDefinition | Business workflow definitions enabling automated routing of approvals, reviews, and business processes throughout the manufacturing organization |
| WorkflowStageInstance | Active instances of workflow stages tracking real-time progress, approvals, and execution status for ongoing business processes |
| WorkflowAssignment | Task and approval assignments within workflows specifying responsible users, roles, and delegation relationships |
| WorkflowTask | Individual tasks and action items within workflow stages defining specific work to be completed by assigned users |

#### OEE Calculation

| Table | Description |
|-------|-------------|
| ProcessDataCollection | Real-time manufacturing process data collection including parameters, measurements, and equipment states for process monitoring and optimization |

#### Operation Planning

| Table | Description |
|-------|-------------|
| EquipmentOperationSpecification | Equipment requirements and specifications for manufacturing operations defining equipment capabilities, capacity, and setup requirements |

#### Operations Management

| Table | Description |
|-------|-------------|
| PersonnelOperationSpecification | Personnel requirements and specifications for manufacturing operations defining required skills, certifications, and competency levels |
| PhysicalAssetOperationSpecification | Physical asset requirements and specifications for manufacturing operations defining equipment, tooling, and infrastructure needs |

#### Operations Planning

| Table | Description |
|-------|-------------|
| PersonnelSkillAssignment | Personnel skill assignments linking employees to specific skills with competency levels and certification status for work order assignment |

#### Operator Interfaces

| Table | Description |
|-------|-------------|
| ParameterGroup | Hierarchical organization of operation parameters into logical groups for streamlined process management and operator interface design |

#### Operator Terminals

| Table | Description |
|-------|-------------|
| WorkInstructionStep | Individual steps within work instructions containing specific actions, parameters, and verification requirements |

#### Operator Training Records

| Table | Description |
|-------|-------------|
| SetupExecution | Execution records of manufacturing setup procedures tracking completion status, times, and operator verification |

#### Operator Training Systems

| Table | Description |
|-------|-------------|
| SetupStep | Individual steps in manufacturing setup procedures defining specific actions required to configure equipment for production |
| InspectionStep | Individual steps within inspection procedures defining specific measurement actions, acceptance criteria, and verification requirements |

#### Order Management

| Table | Description |
|-------|-------------|
| ProductConfiguration | Product configuration variants and options enabling customizable products with different features and characteristics |

#### Organization Structure

| Table | Description |
|-------|-------------|
| WorkflowAssignment | Task and approval assignments within workflows specifying responsible users, roles, and delegation relationships |
| WorkflowDelegation | Authority delegation and coverage management for workflow responsibilities enabling business continuity and flexible resource allocation |

#### PLM Systems

| Table | Description |
|-------|-------------|
| Part | Master part data defining all manufactured, purchased, and assemblable items with specifications and lifecycle management |
| BOMItem | Bill of Materials structure defining parent-child relationships between parts with quantities and assembly information |
| IntegrationConfig | Integration configuration settings for external system connections including ERP, quality systems, and third-party manufacturing applications |
| IntegrationLog | Integration transaction logs capturing data exchanges between MES and external systems with error tracking and performance monitoring |

#### Part Programming

| Table | Description |
|-------|-------------|
| CNCProgram | CNC machining programs and G-code management with version control and machine-specific optimization for manufacturing operations |

#### Part Traceability

| Table | Description |
|-------|-------------|
| QIFMeasurement | Individual QIF measurement instances linking measurement results to specific parts and inspection events |

#### Payroll Systems

| Table | Description |
|-------|-------------|
| PersonnelClass | Hierarchical classification system for organizing personnel by job function, skill level, and organizational responsibility |
| PersonnelInfoExchange | Data synchronization and integration records for personnel information exchange between MES and external HR/payroll systems |

#### Performance Analytics

| Table | Description |
|-------|-------------|
| ScheduleStateHistory | Audit trail tracking production schedule state transitions and lifecycle changes with timestamp and user accountability |
| WorkOrderStatusHistory | Complete audit trail of work order status transitions tracking lifecycle progression, decision points, and operational milestones |
| WorkPerformance | Actual production performance data capturing labor, material, and equipment metrics against planned targets for continuous improvement |
| ProductionVariance | Cost and performance variance tracking comparing actual production results against planned targets for continuous improvement |
| EquipmentStateHistory | Complete history of equipment state transitions tracking operational status, downtime, and utilization patterns |
| EquipmentPerformanceLog | Equipment performance metrics tracking availability, performance efficiency, and Overall Equipment Effectiveness (OEE) |
| ProductionPerformanceActual | Actual production performance data captured from manufacturing operations for ERP integration and performance analysis |
| SPCConfiguration | Statistical Process Control configuration defining control charts, control limits, and monitoring rules for real-time manufacturing process control |
| WorkflowTask | Individual tasks and action items within workflow stages defining specific work to be completed by assigned users |

#### Performance Dashboards

| Table | Description |
|-------|-------------|
| WorkflowMetrics | Performance analytics and operational metrics for workflow processes enabling continuous improvement and efficiency optimization |

#### Performance Monitoring

| Table | Description |
|-------|-------------|
| WorkflowStageInstance | Active instances of workflow stages tracking real-time progress, approvals, and execution status for ongoing business processes |

#### Performance Tracking

| Table | Description |
|-------|-------------|
| WorkflowAssignment | Task and approval assignments within workflows specifying responsible users, roles, and delegation relationships |

#### Permission Systems

| Table | Description |
|-------|-------------|
| UserRole | Assignment of system roles to users establishing access permissions and functional capabilities within the MES |

#### Personnel Management

| Table | Description |
|-------|-------------|
| PersonnelCertification | Personnel certification records tracking professional credentials, industry certifications, and specialized qualifications for manufacturing operations |
| PersonnelSkill | Personnel skill definitions and competency levels for manufacturing operations defining specific technical capabilities and proficiency requirements |
| PersonnelSkillAssignment | Personnel skill assignments linking employees to specific skills with competency levels and certification status for work order assignment |
| PersonnelOperationSpecification | Personnel requirements and specifications for manufacturing operations defining required skills, certifications, and competency levels |
| WorkCenter | Manufacturing work centers that organize equipment, personnel, and operations within functional areas of the facility |
| ScheduleConstraint | Production schedule constraints defining capacity limitations, resource availability, and operational dependencies that must be respected during scheduling |

#### Predictive Maintenance

| Table | Description |
|-------|-------------|
| EquipmentDataCollection | Real-time data collection from manufacturing equipment capturing process parameters, sensor readings, and operational metrics for analysis and control |

#### Process Analytics

| Table | Description |
|-------|-------------|
| WorkflowRule | Business logic rules and automation conditions that govern workflow behavior, transitions, and decision-making processes |
| WorkflowStageInstance | Active instances of workflow stages tracking real-time progress, approvals, and execution status for ongoing business processes |
| WorkflowHistory | Complete audit trail and historical record of all workflow activities, decisions, and state changes for compliance and analysis |
| WorkflowMetrics | Performance analytics and operational metrics for workflow processes enabling continuous improvement and efficiency optimization |

#### Process Control

| Table | Description |
|-------|-------------|
| OperationParameter | Manufacturing operation parameters defining process variables, settings, and control points for precise manufacturing execution |
| ParameterLimits | Control limits and alarm thresholds for operation parameters enabling automatic process monitoring and quality control |
| ParameterGroup | Hierarchical organization of operation parameters into logical groups for streamlined process management and operator interface design |
| OperationDependency | Dependencies and prerequisites between manufacturing operations defining sequence constraints and timing relationships for production scheduling |
| RoutingStepParameter | Specific parameters and settings for individual routing steps enabling precise control of manufacturing operations at the step level |
| WorkInstructionStepExecution | Detailed execution records for individual work instruction steps including data collection, verification, and timing |
| EquipmentCommand | Equipment control commands and automation instructions sent to manufacturing equipment with execution tracking and response management |
| SPCRuleViolation | Statistical Process Control rule violations tracking out-of-control conditions and triggering corrective actions for quality management |

#### Process Control Software

| Table | Description |
|-------|-------------|
| SetupParameter | Configurable parameters and their values required for equipment setup procedures and manufacturing processes |

#### Process Control Systems

| Table | Description |
|-------|-------------|
| ParameterFormula | Calculated parameters using formulas and expressions to derive values from other parameters for advanced process control |
| RoutingStep | Detailed individual steps within operations providing granular control and specific instructions for manufacturing execution |
| EquipmentDataCollection | Real-time data collection from manufacturing equipment capturing process parameters, sensor readings, and operational metrics for analysis and control |
| ProcessDataCollection | Real-time manufacturing process data collection including parameters, measurements, and equipment states for process monitoring and optimization |
| SOPStep | Individual steps within Standard Operating Procedures defining specific actions, safety requirements, and process controls |

#### Process Data Collection

| Table | Description |
|-------|-------------|
| SPCConfiguration | Statistical Process Control configuration defining control charts, control limits, and monitoring rules for real-time manufacturing process control |

#### Process Design Tools

| Table | Description |
|-------|-------------|
| WorkflowTemplate | Reusable workflow patterns and standardized process templates for consistent business process implementation across the organization |

#### Process Development

| Table | Description |
|-------|-------------|
| RoutingTemplate | Reusable routing templates enabling standardized process creation, best practice sharing, and manufacturing methodology consistency |

#### Process Execution

| Table | Description |
|-------|-------------|
| RoutingStepDependency | Granular dependencies between individual routing steps enabling precise process control and step-level scheduling coordination |

#### Process Orchestration

| Table | Description |
|-------|-------------|
| WorkflowParallelCoordination | Coordination and synchronization management for parallel workflow branches enabling complex multi-path business process execution |

#### Procurement Systems

| Table | Description |
|-------|-------------|
| MaterialClass | Hierarchical classification system for organizing materials by type, characteristics, and usage patterns |
| MaterialDefinition | Detailed specifications and requirements for specific materials including technical properties and supplier information |

#### Product Lifecycle Management

| Table | Description |
|-------|-------------|
| EngineeringChangeOrder | Engineering change orders managing all product and process modifications with complete approval workflow and compliance traceability |

#### Product Management

| Table | Description |
|-------|-------------|
| ConfigurationOption | Product configuration options and variants enabling customizable manufacturing for different customer requirements and specifications |
| ProductLifecycle | Product lifecycle management tracking development phases, production status, and end-of-life planning for manufactured products |

#### Production Control

| Table | Description |
|-------|-------------|
| SPCRuleViolation | Statistical Process Control rule violations tracking out-of-control conditions and triggering corrective actions for quality management |
| SamplingInspectionResult | Statistical sampling inspection results capturing acceptance decisions and quality control outcomes for production lots |

#### Production Control Systems

| Table | Description |
|-------|-------------|
| MaterialTransaction | Detailed record of all material movements, consumption, and inventory changes with timestamps and authorization |

#### Production Monitoring

| Table | Description |
|-------|-------------|
| Alert | System alerts and notifications for real-time monitoring of manufacturing operations, quality exceptions, and equipment status |

#### Production Planning

| Table | Description |
|-------|-------------|
| MaterialOperationSpecification | Material requirements and consumption specifications for manufacturing operations defining material types, quantities, and quality standards |
| PartSiteAvailability | Part availability and manufacturing capability by site including costs, lead times, and production constraints for multi-site operations |
| ProductLifecycle | Product lifecycle management tracking development phases, production status, and end-of-life planning for manufactured products |
| ProductionScheduleRequest | External production scheduling requests from ERP systems or planning applications requiring MES validation and capacity confirmation |
| ProductionScheduleResponse | MES responses to external production scheduling requests confirming feasibility, proposing alternatives, or rejecting infeasible schedules |
| SetupSheet | Manufacturing setup sheets providing detailed instructions for equipment configuration, tooling setup, and process preparation for production operations |
| EngineeringChangeOrder | Engineering change orders managing all product and process modifications with complete approval workflow and compliance traceability |

#### Production Reporting

| Table | Description |
|-------|-------------|
| WorkOrderStatusHistory | Complete audit trail of work order status transitions tracking lifecycle progression, decision points, and operational milestones |

#### Production Routing

| Table | Description |
|-------|-------------|
| EquipmentCapability | Specific capabilities and qualifications of manufacturing equipment including certifications and operational parameters |

#### Production Scheduling

| Table | Description |
|-------|-------------|
| PersonnelAvailability | Personnel availability schedules tracking work patterns, shifts, time off, and capacity planning for manufacturing resource allocation |
| OperationDependency | Dependencies and prerequisites between manufacturing operations defining sequence constraints and timing relationships for production scheduling |
| WorkOrder | Central production work orders defining specific manufacturing jobs with materials, operations, quantities, and scheduling requirements |
| Routing | Manufacturing process routes defining the complete sequence of operations required to produce a specific part or assembly |
| RoutingOperation | Specific operations assigned to routings with work center assignments and timing details for manufacturing execution |
| WorkCenter | Manufacturing work centers that organize equipment, personnel, and operations within functional areas of the facility |
| WorkUnit | Work center subdivisions representing distinct operational areas within work centers for granular production control and resource allocation |
| WorkOrderOperation | Individual manufacturing operations within a work order, defining the specific steps, resources, and sequence required to transform materials |
| ScheduleConstraint | Production schedule constraints defining capacity limitations, resource availability, and operational dependencies that must be respected during scheduling |
| ScheduleStateHistory | Audit trail tracking production schedule state transitions and lifecycle changes with timestamp and user accountability |
| DispatchLog | Work order dispatching and resource assignment tracking for production execution with operator and equipment allocation |
| Equipment | Manufacturing equipment and machinery used in production operations with capability and status tracking |
| EquipmentStateHistory | Complete history of equipment state transitions tracking operational status, downtime, and utilization patterns |
| ProductionPerformanceActual | Actual production performance data captured from manufacturing operations for ERP integration and performance analysis |

#### Production Scheduling Systems

| Table | Description |
|-------|-------------|
| Area | Functional work area within a manufacturing site, such as machining centers, assembly lines, or quality labs |

#### Production Systems

| Table | Description |
|-------|-------------|
| EquipmentPerformanceLog | Equipment performance metrics tracking availability, performance efficiency, and Overall Equipment Effectiveness (OEE) |

#### Program Management Systems

| Table | Description |
|-------|-------------|
| ProgramDownloadLog | Audit trail and version control for CNC program downloads to manufacturing equipment ensuring program integrity and traceability |

#### Purchasing

| Table | Description |
|-------|-------------|
| Inventory | Material inventory management tracking quantities, locations, costs, and availability across all manufacturing sites and storage locations |

#### Purchasing Systems

| Table | Description |
|-------|-------------|
| Part | Master part data defining all manufactured, purchased, and assemblable items with specifications and lifecycle management |

#### QIF Measurement Results

| Table | Description |
|-------|-------------|
| QIFMeasurement | Individual QIF measurement instances linking measurement results to specific parts and inspection events |

#### Quality Certificates

| Table | Description |
|-------|-------------|
| QIFMeasurement | Individual QIF measurement instances linking measurement results to specific parts and inspection events |

#### Quality Control

| Table | Description |
|-------|-------------|
| RoutingStepParameter | Specific parameters and settings for individual routing steps enabling precise control of manufacturing operations at the step level |
| CNCProgram | CNC machining programs and G-code management with version control and machine-specific optimization for manufacturing operations |
| SetupSheet | Manufacturing setup sheets providing detailed instructions for equipment configuration, tooling setup, and process preparation for production operations |
| ToolUsageLog | Comprehensive usage tracking and lifecycle management for manufacturing tools including utilization, performance, and maintenance history |

#### Quality Inspection

| Table | Description |
|-------|-------------|
| QualityMeasurement | Individual measurement data collected during quality inspections with actual values, results, and acceptance criteria |

#### Quality Management

| Table | Description |
|-------|-------------|
| PersonnelQualification | Personnel qualifications and competency records tracking certifications, skills, training completion, and authorization levels for manufacturing operations |
| MaterialDefinition | Detailed specifications and requirements for specific materials including technical properties and supplier information |
| MaterialLot | Individual lots or batches of materials with complete traceability information including supplier certifications and quality data |
| MaterialLotGenealogy | Parent-child relationships between material lots tracking transformations, combinations, and processing history throughout manufacturing |
| MaterialStateHistory | Complete audit trail of material lot state and status transitions including quality events, location changes, and process milestones |
| OperationParameter | Manufacturing operation parameters defining process variables, settings, and control points for precise manufacturing execution |
| MaterialOperationSpecification | Material requirements and consumption specifications for manufacturing operations defining material types, quantities, and quality standards |
| ProductSpecification | Detailed technical specifications and requirements for parts including dimensions, materials, and performance criteria |
| WorkOrder | Central production work orders defining specific manufacturing jobs with materials, operations, quantities, and scheduling requirements |
| RoutingStepDependency | Granular dependencies between individual routing steps enabling precise process control and step-level scheduling coordination |
| WorkOrderOperation | Individual manufacturing operations within a work order, defining the specific steps, resources, and sequence required to transform materials |
| QualityCharacteristic | Quality characteristics and measurement specifications defining inspection requirements, tolerances, and acceptance criteria for manufacturing quality control |
| EquipmentCapability | Specific capabilities and qualifications of manufacturing equipment including certifications and operational parameters |
| SerializedPart | Individual serialized parts with unique identifiers enabling complete traceability throughout manufacturing and service life |
| PartGenealogy | Assembly genealogy tracking parent-child relationships between serialized parts for complete product traceability |
| WorkInstruction | Detailed step-by-step instructions for manufacturing operations, processes, and procedures |
| WorkInstructionExecution | Records of work instruction execution including operator, timing, and completion status for specific work orders |
| FAIReport | First Article Inspection reports documenting complete dimensional and functional verification for new or changed manufacturing processes |
| FAICharacteristic | First Article Inspection characteristics defining specific measurements and acceptance criteria for aerospace and medical device validation |
| MeasurementEquipment | Calibrated measurement and inspection equipment with certification tracking and maintenance schedules |
| OperationGaugeRequirement | Measurement equipment and gauge requirements for specific manufacturing operations ensuring proper inspection capability and measurement traceability |
| ProcessDataCollection | Real-time manufacturing process data collection including parameters, measurements, and equipment states for process monitoring and optimization |
| QIFMeasurementPlan | Quality Information Framework measurement plans defining structured measurement requirements for aerospace and medical device compliance |
| SPCConfiguration | Statistical Process Control configuration defining control charts, control limits, and monitoring rules for real-time manufacturing process control |
| SPCRuleViolation | Statistical Process Control rule violations tracking out-of-control conditions and triggering corrective actions for quality management |
| SamplingPlan | Statistical sampling plans defining inspection frequency, sample sizes, and acceptance criteria for quality control and regulatory compliance |
| InspectionPlan | Quality inspection plans defining comprehensive inspection strategies, procedures, and acceptance criteria for manufacturing operations |
| ToolCalibrationRecord | Tool and measurement equipment calibration records maintaining traceability and accuracy verification for quality assurance and regulatory compliance |
| DocumentTemplate | Standardized document templates for creating consistent manufacturing documents, forms, and reports |
| EngineeringChangeOrder | Engineering change orders managing all product and process modifications with complete approval workflow and compliance traceability |

#### Quality Management System

| Table | Description |
|-------|-------------|
| QualityPlan | Quality control plans defining inspection requirements, measurement criteria, and acceptance standards for manufacturing operations |
| InspectionRecord | Individual inspection records capturing quality measurements and compliance data for manufactured parts and materials |

#### Quality Management Systems

| Table | Description |
|-------|-------------|
| MaterialClass | Hierarchical classification system for organizing materials by type, characteristics, and usage patterns |
| MaterialProperty | Physical, chemical, and mechanical properties of materials with test results and certification data |
| QualityInspection | Quality inspection records tracking the execution of quality plans with inspector assignments, results, and compliance status |
| NCR | Non-Conformance Reports documenting quality issues, defects, and corrective actions throughout the manufacturing process |
| IntegrationConfig | Integration configuration settings for external system connections including ERP, quality systems, and third-party manufacturing applications |
| IntegrationLog | Integration transaction logs capturing data exchanges between MES and external systems with error tracking and performance monitoring |
| SamplingInspectionResult | Statistical sampling inspection results capturing acceptance decisions and quality control outcomes for production lots |
| AuditReport | Automated audit reports and compliance documentation generated for regulatory requirements and quality system audits |

#### Quality Measurement Equipment

| Table | Description |
|-------|-------------|
| QIFCharacteristic | Quality Information Framework (QIF) characteristic definitions specifying measurable quality attributes and their tolerances |

#### Quality Measurements

| Table | Description |
|-------|-------------|
| InspectionExecution | Execution records of quality inspection activities tracking inspector actions, measurement completion, and inspection results |

#### Quality Monitoring

| Table | Description |
|-------|-------------|
| ParameterLimits | Control limits and alarm thresholds for operation parameters enabling automatic process monitoring and quality control |

#### Quality Plans

| Table | Description |
|-------|-------------|
| Operation | Individual manufacturing operations defining specific processes, procedures, and requirements for transforming materials |
| RoutingStep | Detailed individual steps within operations providing granular control and specific instructions for manufacturing execution |
| InspectionCharacteristic | Specific measurable attributes and quality characteristics that must be inspected during quality control processes |

#### Quality Procedures

| Table | Description |
|-------|-------------|
| InspectionStep | Individual steps within inspection procedures defining specific measurement actions, acceptance criteria, and verification requirements |

#### Quality Reporting

| Table | Description |
|-------|-------------|
| QIFMeasurementResult | Quality Information Framework (QIF) measurement results containing actual measured values and statistical analysis data |

#### Quality Systems

| Table | Description |
|-------|-------------|
| WorkInstructionStepExecution | Detailed execution records for individual work instruction steps including data collection, verification, and timing |
| Alert | System alerts and notifications for real-time monitoring of manufacturing operations, quality exceptions, and equipment status |

#### Quality Tracking

| Table | Description |
|-------|-------------|
| EquipmentMaterialMovement | Material movements and transactions processed through manufacturing equipment with complete traceability and quality status tracking |

#### Real-time Calculations

| Table | Description |
|-------|-------------|
| ParameterFormula | Calculated parameters using formulas and expressions to derive values from other parameters for advanced process control |

#### Real-time Production Monitoring

| Table | Description |
|-------|-------------|
| ScheduleEntry | Individual scheduled activities linking specific work order operations to equipment, personnel, and time slots |

#### Recall Management

| Table | Description |
|-------|-------------|
| MaterialLotGenealogy | Parent-child relationships between material lots tracking transformations, combinations, and processing history throughout manufacturing |
| PartGenealogy | Assembly genealogy tracking parent-child relationships between serialized parts for complete product traceability |

#### Receiving

| Table | Description |
|-------|-------------|
| Inventory | Material inventory management tracking quantities, locations, costs, and availability across all manufacturing sites and storage locations |

#### Regulatory Compliance Platforms

| Table | Description |
|-------|-------------|
| Enterprise | Top-level organizational entity representing the entire company or corporation with multiple manufacturing sites |

#### Regulatory Reporting

| Table | Description |
|-------|-------------|
| AuditReport | Automated audit reports and compliance documentation generated for regulatory requirements and quality system audits |

#### Report Generation

| Table | Description |
|-------|-------------|
| DocumentTemplate | Standardized document templates for creating consistent manufacturing documents, forms, and reports |

#### Resource Allocation

| Table | Description |
|-------|-------------|
| WorkUnit | Work center subdivisions representing distinct operational areas within work centers for granular production control and resource allocation |
| ProductionScheduleRequest | External production scheduling requests from ERP systems or planning applications requiring MES validation and capacity confirmation |
| ProductionScheduleResponse | MES responses to external production scheduling requests confirming feasibility, proposing alternatives, or rejecting infeasible schedules |

#### Resource Management

| Table | Description |
|-------|-------------|
| ScheduleConstraint | Production schedule constraints defining capacity limitations, resource availability, and operational dependencies that must be respected during scheduling |

#### Resource Planning

| Table | Description |
|-------|-------------|
| DispatchLog | Work order dispatching and resource assignment tracking for production execution with operator and equipment allocation |

#### Role Management

| Table | Description |
|-------|-------------|
| WorkflowStage | Workflow stage definitions within business processes defining approval steps, decision points, and stage-specific requirements |
| UserRole | Assignment of system roles to users establishing access permissions and functional capabilities within the MES |

#### Routing Management

| Table | Description |
|-------|-------------|
| RoutingStepParameter | Specific parameters and settings for individual routing steps enabling precise control of manufacturing operations at the step level |
| RoutingTemplate | Reusable routing templates enabling standardized process creation, best practice sharing, and manufacturing methodology consistency |

#### Routing Systems

| Table | Description |
|-------|-------------|
| Operation | Individual manufacturing operations defining specific processes, procedures, and requirements for transforming materials |

#### SIEM Systems

| Table | Description |
|-------|-------------|
| AuditLog | System audit logs capturing all critical data changes, user actions, and system events for regulatory compliance and security monitoring |

#### SPC Analytics

| Table | Description |
|-------|-------------|
| ParameterFormula | Calculated parameters using formulas and expressions to derive values from other parameters for advanced process control |
| EquipmentDataCollection | Real-time data collection from manufacturing equipment capturing process parameters, sensor readings, and operational metrics for analysis and control |

#### SPC Systems

| Table | Description |
|-------|-------------|
| OperationParameter | Manufacturing operation parameters defining process variables, settings, and control points for precise manufacturing execution |
| ParameterLimits | Control limits and alarm thresholds for operation parameters enabling automatic process monitoring and quality control |
| QualityMeasurement | Individual measurement data collected during quality inspections with actual values, results, and acceptance criteria |
| ProcessDataCollection | Real-time manufacturing process data collection including parameters, measurements, and equipment states for process monitoring and optimization |
| SPCRuleViolation | Statistical Process Control rule violations tracking out-of-control conditions and triggering corrective actions for quality management |
| SamplingPlan | Statistical sampling plans defining inspection frequency, sample sizes, and acceptance criteria for quality control and regulatory compliance |
| InspectionPlan | Quality inspection plans defining comprehensive inspection strategies, procedures, and acceptance criteria for manufacturing operations |

#### Safety Management

| Table | Description |
|-------|-------------|
| Area | Functional work area within a manufacturing site, such as machining centers, assembly lines, or quality labs |
| StandardOperatingProcedure | Standardized operating procedures providing detailed step-by-step instructions for manufacturing operations, safety protocols, and quality procedures |
| SOPStep | Individual steps within Standard Operating Procedures defining specific actions, safety requirements, and process controls |
| SOPAcknowledgment | Employee acknowledgment and compliance records for Standard Operating Procedure training and understanding verification |

#### Safety Systems

| Table | Description |
|-------|-------------|
| EquipmentLog | Equipment activity logs capturing operational events, maintenance actions, and state changes for comprehensive equipment history |
| WorkInstructionStep | Individual steps within work instructions containing specific actions, parameters, and verification requirements |

#### Sales Configuration

| Table | Description |
|-------|-------------|
| ProductConfiguration | Product configuration variants and options enabling customizable products with different features and characteristics |

#### Schedule Optimization

| Table | Description |
|-------|-------------|
| ProductionScheduleRequest | External production scheduling requests from ERP systems or planning applications requiring MES validation and capacity confirmation |
| ProductionScheduleResponse | MES responses to external production scheduling requests confirming feasibility, proposing alternatives, or rejecting infeasible schedules |

#### Security Management

| Table | Description |
|-------|-------------|
| User | Core user management and authentication system defining personnel identity, access credentials, and organizational information |

#### Security Monitoring

| Table | Description |
|-------|-------------|
| UserSessionLog | Comprehensive logging of user session activities including login times, access patterns, and system interaction tracking |

#### Security Systems

| Table | Description |
|-------|-------------|
| AuditLog | System audit logs capturing all critical data changes, user actions, and system events for regulatory compliance and security monitoring |

#### Service Management

| Table | Description |
|-------|-------------|
| SerializedPart | Individual serialized parts with unique identifiers enabling complete traceability throughout manufacturing and service life |
| PartGenealogy | Assembly genealogy tracking parent-child relationships between serialized parts for complete product traceability |

#### Setup Procedures

| Table | Description |
|-------|-------------|
| SetupTool | Specific tools and equipment required for manufacturing setup procedures with specifications and usage requirements |

#### Setup Sheets

| Table | Description |
|-------|-------------|
| SetupStep | Individual steps in manufacturing setup procedures defining specific actions required to configure equipment for production |
| SetupParameter | Configurable parameters and their values required for equipment setup procedures and manufacturing processes |
| SetupExecution | Execution records of manufacturing setup procedures tracking completion status, times, and operator verification |

#### Shipping Systems

| Table | Description |
|-------|-------------|
| SerializedPart | Individual serialized parts with unique identifiers enabling complete traceability throughout manufacturing and service life |

#### Shop Floor Control

| Table | Description |
|-------|-------------|
| Routing | Manufacturing process routes defining the complete sequence of operations required to produce a specific part or assembly |
| RoutingOperation | Specific operations assigned to routings with work center assignments and timing details for manufacturing execution |
| RoutingStepDependency | Granular dependencies between individual routing steps enabling precise process control and step-level scheduling coordination |
| WorkCenter | Manufacturing work centers that organize equipment, personnel, and operations within functional areas of the facility |
| ProductionSchedule | Master production schedules coordinating work orders, resources, and timeline across the manufacturing facility |
| DispatchLog | Work order dispatching and resource assignment tracking for production execution with operator and equipment allocation |

#### Shop Floor Control Systems

| Table | Description |
|-------|-------------|
| OperationParameter | Manufacturing operation parameters defining process variables, settings, and control points for precise manufacturing execution |
| WorkOrderOperation | Individual manufacturing operations within a work order, defining the specific steps, resources, and sequence required to transform materials |

#### Shop Floor Data Collection

| Table | Description |
|-------|-------------|
| WorkPerformance | Actual production performance data capturing labor, material, and equipment metrics against planned targets for continuous improvement |
| MaterialTransaction | Detailed record of all material movements, consumption, and inventory changes with timestamps and authorization |
| WorkInstructionStep | Individual steps within work instructions containing specific actions, parameters, and verification requirements |
| WorkInstructionStepExecution | Detailed execution records for individual work instruction steps including data collection, verification, and timing |

#### Shop Floor Displays

| Table | Description |
|-------|-------------|
| WorkInstructionMedia | Multimedia content for work instructions including images, videos, animations, and interactive content supporting manufacturing operations |

#### Shop Floor Equipment

| Table | Description |
|-------|-------------|
| ProcessDataCollection | Real-time manufacturing process data collection including parameters, measurements, and equipment states for process monitoring and optimization |

#### Shop Floor Systems

| Table | Description |
|-------|-------------|
| MaterialSublot | Subdivision of material lots into smaller batches enabling precise material allocation, work order reservations, and inventory control |

#### Shop Floor Terminals

| Table | Description |
|-------|-------------|
| RoutingStep | Detailed individual steps within operations providing granular control and specific instructions for manufacturing execution |
| ScheduleEntry | Individual scheduled activities linking specific work order operations to equipment, personnel, and time slots |
| WorkInstruction | Detailed step-by-step instructions for manufacturing operations, processes, and procedures |
| WorkInstructionExecution | Records of work instruction execution including operator, timing, and completion status for specific work orders |

#### Site Management

| Table | Description |
|-------|-------------|
| PartSiteAvailability | Part availability and manufacturing capability by site including costs, lead times, and production constraints for multi-site operations |

#### Skills Assessment

| Table | Description |
|-------|-------------|
| PersonnelSkill | Personnel skill definitions and competency levels for manufacturing operations defining specific technical capabilities and proficiency requirements |

#### Standard Operating Procedures

| Table | Description |
|-------|-------------|
| SOPStep | Individual steps within Standard Operating Procedures defining specific actions, safety requirements, and process controls |

#### Statistical Analysis

| Table | Description |
|-------|-------------|
| SamplingPlan | Statistical sampling plans defining inspection frequency, sample sizes, and acceptance criteria for quality control and regulatory compliance |

#### Statistical Process Control

| Table | Description |
|-------|-------------|
| QIFCharacteristic | Quality Information Framework (QIF) characteristic definitions specifying measurable quality attributes and their tolerances |
| SamplingInspectionResult | Statistical sampling inspection results capturing acceptance decisions and quality control outcomes for production lots |
| SetupParameter | Configurable parameters and their values required for equipment setup procedures and manufacturing processes |

#### Statistical Process Control Systems

| Table | Description |
|-------|-------------|
| QIFMeasurementResult | Quality Information Framework (QIF) measurement results containing actual measured values and statistical analysis data |

#### Supplier Catalogs

| Table | Description |
|-------|-------------|
| MaterialClass | Hierarchical classification system for organizing materials by type, characteristics, and usage patterns |

#### Supplier Certification Systems

| Table | Description |
|-------|-------------|
| MaterialProperty | Physical, chemical, and mechanical properties of materials with test results and certification data |

#### Supplier Management

| Table | Description |
|-------|-------------|
| ProductSpecification | Detailed technical specifications and requirements for parts including dimensions, materials, and performance criteria |
| NCR | Non-Conformance Reports documenting quality issues, defects, and corrective actions throughout the manufacturing process |
| FAIReport | First Article Inspection reports documenting complete dimensional and functional verification for new or changed manufacturing processes |
| ToolMaintenanceRecord | Tool and equipment maintenance records tracking service history, repairs, and lifecycle management for manufacturing assets |

#### Supplier Management Systems

| Table | Description |
|-------|-------------|
| MaterialDefinition | Detailed specifications and requirements for specific materials including technical properties and supplier information |

#### Supplier Quality

| Table | Description |
|-------|-------------|
| QualityCharacteristic | Quality characteristics and measurement specifications defining inspection requirements, tolerances, and acceptance criteria for manufacturing quality control |

#### Supplier Systems

| Table | Description |
|-------|-------------|
| MaterialLot | Individual lots or batches of materials with complete traceability information including supplier certifications and quality data |

#### Supply Chain

| Table | Description |
|-------|-------------|
| ProductLifecycle | Product lifecycle management tracking development phases, production status, and end-of-life planning for manufactured products |

#### Task Management

| Table | Description |
|-------|-------------|
| WorkflowStageInstance | Active instances of workflow stages tracking real-time progress, approvals, and execution status for ongoing business processes |

#### Task Management Systems

| Table | Description |
|-------|-------------|
| WorkflowTask | Individual tasks and action items within workflow stages defining specific work to be completed by assigned users |

#### Test Equipment

| Table | Description |
|-------|-------------|
| MaterialProperty | Physical, chemical, and mechanical properties of materials with test results and certification data |

#### Time & Attendance

| Table | Description |
|-------|-------------|
| WorkOrderOperation | Individual manufacturing operations within a work order, defining the specific steps, resources, and sequence required to transform materials |

#### Time Standards

| Table | Description |
|-------|-------------|
| Operation | Individual manufacturing operations defining specific processes, procedures, and requirements for transforming materials |

#### Time Tracking

| Table | Description |
|-------|-------------|
| User | Core user management and authentication system defining personnel identity, access credentials, and organizational information |
| PersonnelAvailability | Personnel availability schedules tracking work patterns, shifts, time off, and capacity planning for manufacturing resource allocation |
| WorkInstructionExecution | Records of work instruction execution including operator, timing, and completion status for specific work orders |
| WorkflowTask | Individual tasks and action items within workflow stages defining specific work to be completed by assigned users |

#### Time Tracking Systems

| Table | Description |
|-------|-------------|
| ScheduleEntry | Individual scheduled activities linking specific work order operations to equipment, personnel, and time slots |

#### Tool Management

| Table | Description |
|-------|-------------|
| CNCProgram | CNC machining programs and G-code management with version control and machine-specific optimization for manufacturing operations |
| SetupSheet | Manufacturing setup sheets providing detailed instructions for equipment configuration, tooling setup, and process preparation for production operations |
| ToolDrawing | Engineering drawings and technical specifications for manufacturing tools, fixtures, and production equipment |

#### Tool Management Systems

| Table | Description |
|-------|-------------|
| SetupTool | Specific tools and equipment required for manufacturing setup procedures with specifications and usage requirements |
| ToolUsageLog | Comprehensive usage tracking and lifecycle management for manufacturing tools including utilization, performance, and maintenance history |

#### Traceability Systems

| Table | Description |
|-------|-------------|
| EquipmentMaterialMovement | Material movements and transactions processed through manufacturing equipment with complete traceability and quality status tracking |

#### Training Management

| Table | Description |
|-------|-------------|
| PersonnelClass | Hierarchical classification system for organizing personnel by job function, skill level, and organizational responsibility |
| PersonnelQualification | Personnel qualifications and competency records tracking certifications, skills, training completion, and authorization levels for manufacturing operations |
| PersonnelWorkCenterAssignment | Assignment of personnel to specific work centers defining operational responsibilities, certifications, and capacity allocation |
| WorkInstruction | Detailed step-by-step instructions for manufacturing operations, processes, and procedures |
| ProgramLoadAuthorization | CNC program loading authorizations ensuring only qualified personnel can load programs to specific machines with complete audit trail |
| PersonnelInfoExchange | Data synchronization and integration records for personnel information exchange between MES and external HR/payroll systems |
| StandardOperatingProcedure | Standardized operating procedures providing detailed step-by-step instructions for manufacturing operations, safety protocols, and quality procedures |
| SOPAudit | Compliance audit records for Standard Operating Procedure adherence verification and corrective action tracking |

#### Training Management Systems

| Table | Description |
|-------|-------------|
| SOPAcknowledgment | Employee acknowledgment and compliance records for Standard Operating Procedure training and understanding verification |

#### Training Systems

| Table | Description |
|-------|-------------|
| User | Core user management and authentication system defining personnel identity, access credentials, and organizational information |
| PersonnelCertification | Personnel certification records tracking professional credentials, industry certifications, and specialized qualifications for manufacturing operations |
| PersonnelSkill | Personnel skill definitions and competency levels for manufacturing operations defining specific technical capabilities and proficiency requirements |
| PersonnelSkillAssignment | Personnel skill assignments linking employees to specific skills with competency levels and certification status for work order assignment |
| ParameterGroup | Hierarchical organization of operation parameters into logical groups for streamlined process management and operator interface design |
| PersonnelOperationSpecification | Personnel requirements and specifications for manufacturing operations defining required skills, certifications, and competency levels |
| WorkInstructionMedia | Multimedia content for work instructions including images, videos, animations, and interactive content supporting manufacturing operations |
| SOPStep | Individual steps within Standard Operating Procedures defining specific actions, safety requirements, and process controls |

#### User Authentication

| Table | Description |
|-------|-------------|
| ElectronicSignature | Electronic signatures for digital document approval and authentication supporting regulatory compliance and audit trails |
| ProgramLoadAuthorization | CNC program loading authorizations ensuring only qualified personnel can load programs to specific machines with complete audit trail |

#### User Interface Systems

| Table | Description |
|-------|-------------|
| UserWorkstationPreference | User-specific workstation display and interface preferences for optimized work instruction execution and system interaction |

#### User Management

| Table | Description |
|-------|-------------|
| PersonnelQualification | Personnel qualifications and competency records tracking certifications, skills, training completion, and authorization levels for manufacturing operations |
| AuditLog | System audit logs capturing all critical data changes, user actions, and system events for regulatory compliance and security monitoring |
| WorkflowDefinition | Business workflow definitions enabling automated routing of approvals, reviews, and business processes throughout the manufacturing organization |
| WorkflowInstance | Active workflow instances managing approval processes, document reviews, and business process execution with complete audit trails |
| WorkflowAssignment | Task and approval assignments within workflows specifying responsible users, roles, and delegation relationships |
| WorkflowDelegation | Authority delegation and coverage management for workflow responsibilities enabling business continuity and flexible resource allocation |

#### Version Control

| Table | Description |
|-------|-------------|
| ProgramDownloadLog | Audit trail and version control for CNC program downloads to manufacturing equipment ensuring program integrity and traceability |

#### Web Services

| Table | Description |
|-------|-------------|
| IntegrationConfig | Integration configuration settings for external system connections including ERP, quality systems, and third-party manufacturing applications |

#### Work Center Management

| Table | Description |
|-------|-------------|
| RoutingOperation | Specific operations assigned to routings with work center assignments and timing details for manufacturing execution |
| WorkUnit | Work center subdivisions representing distinct operational areas within work centers for granular production control and resource allocation |

#### Work Center Planning

| Table | Description |
|-------|-------------|
| Area | Functional work area within a manufacturing site, such as machining centers, assembly lines, or quality labs |

#### Work Instruction Systems

| Table | Description |
|-------|-------------|
| UserWorkstationPreference | User-specific workstation display and interface preferences for optimized work instruction execution and system interaction |

#### Work Instructions

| Table | Description |
|-------|-------------|
| Operation | Individual manufacturing operations defining specific processes, procedures, and requirements for transforming materials |
| ParameterGroup | Hierarchical organization of operation parameters into logical groups for streamlined process management and operator interface design |
| RoutingStep | Detailed individual steps within operations providing granular control and specific instructions for manufacturing execution |
| RoutingStepDependency | Granular dependencies between individual routing steps enabling precise process control and step-level scheduling coordination |
| RoutingStepParameter | Specific parameters and settings for individual routing steps enabling precise control of manufacturing operations at the step level |
| QualityPlan | Quality control plans defining inspection requirements, measurement criteria, and acceptance standards for manufacturing operations |
| CNCProgram | CNC machining programs and G-code management with version control and machine-specific optimization for manufacturing operations |
| OperationGaugeRequirement | Measurement equipment and gauge requirements for specific manufacturing operations ensuring proper inspection capability and measurement traceability |
| WorkInstructionMedia | Multimedia content for work instructions including images, videos, animations, and interactive content supporting manufacturing operations |
| SetupSheet | Manufacturing setup sheets providing detailed instructions for equipment configuration, tooling setup, and process preparation for production operations |
| SetupStep | Individual steps in manufacturing setup procedures defining specific actions required to configure equipment for production |
| InspectionPlan | Quality inspection plans defining comprehensive inspection strategies, procedures, and acceptance criteria for manufacturing operations |
| StandardOperatingProcedure | Standardized operating procedures providing detailed step-by-step instructions for manufacturing operations, safety protocols, and quality procedures |
| ToolCalibrationRecord | Tool and measurement equipment calibration records maintaining traceability and accuracy verification for quality assurance and regulatory compliance |

#### Work Order Assignment

| Table | Description |
|-------|-------------|
| PersonnelQualification | Personnel qualifications and competency records tracking certifications, skills, training completion, and authorization levels for manufacturing operations |
| PersonnelCertification | Personnel certification records tracking professional credentials, industry certifications, and specialized qualifications for manufacturing operations |
| PersonnelSkill | Personnel skill definitions and competency levels for manufacturing operations defining specific technical capabilities and proficiency requirements |
| PersonnelSkillAssignment | Personnel skill assignments linking employees to specific skills with competency levels and certification status for work order assignment |
| PersonnelWorkCenterAssignment | Assignment of personnel to specific work centers defining operational responsibilities, certifications, and capacity allocation |
| PersonnelAvailability | Personnel availability schedules tracking work patterns, shifts, time off, and capacity planning for manufacturing resource allocation |
| PersonnelOperationSpecification | Personnel requirements and specifications for manufacturing operations defining required skills, certifications, and competency levels |
| EquipmentOperationSpecification | Equipment requirements and specifications for manufacturing operations defining equipment capabilities, capacity, and setup requirements |

#### Work Order Execution

| Table | Description |
|-------|-------------|
| MaterialStateHistory | Complete audit trail of material lot state and status transitions including quality events, location changes, and process milestones |
| QualityInspection | Quality inspection records tracking the execution of quality plans with inspector assignments, results, and compliance status |

#### Work Order Management

| Table | Description |
|-------|-------------|
| MaterialSublot | Subdivision of material lots into smaller batches enabling precise material allocation, work order reservations, and inventory control |
| OperationDependency | Dependencies and prerequisites between manufacturing operations defining sequence constraints and timing relationships for production scheduling |
| MaterialOperationSpecification | Material requirements and consumption specifications for manufacturing operations defining material types, quantities, and quality standards |
| PhysicalAssetOperationSpecification | Physical asset requirements and specifications for manufacturing operations defining equipment, tooling, and infrastructure needs |
| ConfigurationOption | Product configuration options and variants enabling customizable manufacturing for different customer requirements and specifications |
| Routing | Manufacturing process routes defining the complete sequence of operations required to produce a specific part or assembly |
| WorkOrderStatusHistory | Complete audit trail of work order status transitions tracking lifecycle progression, decision points, and operational milestones |
| DispatchLog | Work order dispatching and resource assignment tracking for production execution with operator and equipment allocation |
| ProductionVariance | Cost and performance variance tracking comparing actual production results against planned targets for continuous improvement |
| Inventory | Material inventory management tracking quantities, locations, costs, and availability across all manufacturing sites and storage locations |
| MaintenanceWorkOrder | Maintenance work orders managing preventive, corrective, and emergency maintenance activities across manufacturing equipment |
| EquipmentCommand | Equipment control commands and automation instructions sent to manufacturing equipment with execution tracking and response management |

#### Work Orders

| Table | Description |
|-------|-------------|
| SetupExecution | Execution records of manufacturing setup procedures tracking completion status, times, and operator verification |

#### Workflow Engine

| Table | Description |
|-------|-------------|
| WorkflowRule | Business logic rules and automation conditions that govern workflow behavior, transitions, and decision-making processes |
| WorkflowStageInstance | Active instances of workflow stages tracking real-time progress, approvals, and execution status for ongoing business processes |
| WorkflowAssignment | Task and approval assignments within workflows specifying responsible users, roles, and delegation relationships |
| WorkflowHistory | Complete audit trail and historical record of all workflow activities, decisions, and state changes for compliance and analysis |
| WorkflowDelegation | Authority delegation and coverage management for workflow responsibilities enabling business continuity and flexible resource allocation |
| WorkflowTemplate | Reusable workflow patterns and standardized process templates for consistent business process implementation across the organization |
| WorkflowTask | Individual tasks and action items within workflow stages defining specific work to be completed by assigned users |
| WorkflowMetrics | Performance analytics and operational metrics for workflow processes enabling continuous improvement and efficiency optimization |
| WorkflowParallelCoordination | Coordination and synchronization management for parallel workflow branches enabling complex multi-path business process execution |

#### Workflow Management

| Table | Description |
|-------|-------------|
| WorkflowStage | Workflow stage definitions within business processes defining approval steps, decision points, and stage-specific requirements |
| WorkflowInstance | Active workflow instances managing approval processes, document reviews, and business process execution with complete audit trails |
| UserNotification | System-generated notifications and alerts delivered to users for operational updates, task assignments, and system events |

#### Workflow Systems

| Table | Description |
|-------|-------------|
| ElectronicSignature | Electronic signatures for digital document approval and authentication supporting regulatory compliance and audit trails |
| EngineeringChangeOrder | Engineering change orders managing all product and process modifications with complete approval workflow and compliance traceability |


## Enumerations


#### QualificationType

**Values:**
- `CERTIFICATION`
- `LICENSE`
- `TRAINING`
- `SKILL`

#### CertificationStatus

**Values:**
- `ACTIVE`
- `EXPIRED`
- `SUSPENDED`
- `REVOKED`
- `PENDING`

#### SkillCategory

**Values:**
- `MACHINING`
- `WELDING`
- `INSPECTION`
- `ASSEMBLY`
- `PROGRAMMING`
- `MAINTENANCE`
- `QUALITY`
- `SAFETY`
- `MANAGEMENT`
- `OTHER`

#### CompetencyLevel

**Values:**
- `NOVICE`
- `ADVANCED_BEGINNER`
- `COMPETENT`
- `PROFICIENT`
- `EXPERT`

#### AvailabilityType

**Values:**
- `AVAILABLE`
- `VACATION`
- `SICK_LEAVE`
- `TRAINING`
- `MEETING`
- `UNAVAILABLE`

#### MaterialType

**Values:**
- `RAW_MATERIAL`
- `COMPONENT`
- `SUBASSEMBLY`
- `ASSEMBLY`
- `FINISHED_GOODS`
- `WIP`
- `CONSUMABLE`
- `PACKAGING`
- `TOOLING`
- `MAINTENANCE`

#### MaterialPropertyType

**Values:**
- `PHYSICAL`
- `CHEMICAL`
- `MECHANICAL`
- `THERMAL`
- `ELECTRICAL`
- `OPTICAL`
- `REGULATORY`
- `OTHER`

#### MaterialLotStatus

**Values:**
- `AVAILABLE`
- `RESERVED`
- `IN_USE`
- `DEPLETED`
- `QUARANTINED`
- `EXPIRED`
- `REJECTED`
- `RETURNED`
- `SCRAPPED`

#### MaterialLotState

**Values:**
- `RECEIVED`
- `INSPECTED`
- `APPROVED`
- `ISSUED`
- `IN_PROCESS`
- `CONSUMED`
- `RETURNED`
- `DISPOSED`

#### QualityLotStatus

**Values:**
- `PENDING`
- `IN_INSPECTION`
- `APPROVED`
- `REJECTED`
- `CONDITIONAL`

#### SublotOperationType

**Values:**
- `SPLIT`
- `MERGE`
- `TRANSFER`
- `REWORK`

#### GenealogyRelationType

**Values:**
- `CONSUMED_BY`
- `PRODUCED_FROM`
- `REWORKED_TO`
- `BLENDED_WITH`
- `SPLIT_FROM`
- `MERGED_INTO`
- `TRANSFERRED_TO`

#### StateTransitionType

**Values:**
- `MANUAL`
- `AUTOMATIC`
- `SYSTEM`
- `SCHEDULED`
- `INTEGRATION`

#### OperationType

**Values:**
- `PRODUCTION`
- `QUALITY`
- `MATERIAL_HANDLING`
- `MAINTENANCE`
- `SETUP`
- `CLEANING`
- `PACKAGING`
- `TESTING`
- `REWORK`
- `OTHER`

#### OperationClassification

**Values:**
- `MAKE`
- `ASSEMBLY`
- `INSPECTION`
- `TEST`
- `REWORK`
- `SETUP`
- `SUBCONTRACT`
- `PACKING`

#### ParameterType

**Values:**
- `INPUT`
- `OUTPUT`
- `SET_POINT`
- `MEASURED`
- `CALCULATED`

#### ParameterDataType

**Values:**
- `NUMBER`
- `STRING`
- `BOOLEAN`
- `ENUM`
- `DATE`
- `JSON`

#### ParameterGroupType

**Values:**
- `PROCESS`
- `QUALITY`
- `MATERIAL`
- `EQUIPMENT`
- `ENVIRONMENTAL`
- `CUSTOM`

#### FormulaLanguage

**Values:**
- `JAVASCRIPT`
- `PYTHON`
- `SQL`

#### EvaluationTrigger

**Values:**
- `ON_CHANGE`
- `SCHEDULED`
- `MANUAL`

#### DependencyType

**Values:**
- `MUST_COMPLETE`
- `MUST_START`
- `OVERLAP_ALLOWED`
- `PARALLEL`

#### DependencyTimingType

**Values:**
- `FINISH_TO_START`
- `START_TO_START`
- `FINISH_TO_FINISH`
- `START_TO_FINISH`

#### ConsumptionType

**Values:**
- `PER_UNIT`
- `PER_BATCH`
- `FIXED`
- `SETUP`

#### PhysicalAssetType

**Values:**
- `TOOLING`
- `FIXTURE`
- `GAUGE`
- `CONSUMABLE`
- `PPE`
- `MOLD`
- `PATTERN`
- `SOFTWARE`
- `OTHER`

#### ProductType

**Values:**
- `MADE_TO_STOCK`
- `MADE_TO_ORDER`
- `ENGINEER_TO_ORDER`
- `CONFIGURE_TO_ORDER`
- `ASSEMBLE_TO_ORDER`

#### ProductLifecycleState

**Values:**
- `DESIGN`
- `PROTOTYPE`
- `PILOT_PRODUCTION`
- `PRODUCTION`
- `MATURE`
- `PHASE_OUT`
- `OBSOLETE`
- `ARCHIVED`

#### ConfigurationType

**Values:**
- `STANDARD`
- `VARIANT`
- `CUSTOM`
- `CONFIGURABLE`

#### SpecificationType

**Values:**
- `PHYSICAL`
- `CHEMICAL`
- `MECHANICAL`
- `ELECTRICAL`
- `PERFORMANCE`
- `REGULATORY`
- `ENVIRONMENTAL`
- `SAFETY`
- `QUALITY`
- `OTHER`

#### WorkOrderPriority

**Values:**
- `LOW`
- `NORMAL`
- `HIGH`
- `URGENT`

#### WorkOrderStatus

**Values:**
- `CREATED`
- `RELEASED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`
- `ON_HOLD`

#### RoutingLifecycleState

**Values:**
- `DRAFT`
- `REVIEW`
- `RELEASED`
- `PRODUCTION`
- `OBSOLETE`

#### RoutingType

**Values:**
- `PRIMARY`
- `ALTERNATE`
- `REWORK`
- `PROTOTYPE`
- `ENGINEERING`

#### StepType

**Values:**
- `PROCESS`
- `INSPECTION`
- `DECISION`
- `PARALLEL_SPLIT`
- `PARALLEL_JOIN`
- `OSP`
- `LOT_SPLIT`
- `LOT_MERGE`
- `TELESCOPING`
- `START`
- `END`

#### ControlType

**Values:**
- `LOT_CONTROLLED`
- `SERIAL_CONTROLLED`
- `MIXED`

#### WorkOrderOperationStatus

**Values:**
- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- `SKIPPED`

#### ScheduleState

**Values:**
- `FORECAST`
- `RELEASED`
- `DISPATCHED`
- `RUNNING`
- `COMPLETED`
- `CLOSED`

#### SchedulePriority

**Values:**
- `URGENT`
- `HIGH`
- `NORMAL`
- `LOW`

#### ConstraintType

**Values:**
- `CAPACITY`
- `MATERIAL`
- `PERSONNEL`
- `EQUIPMENT`
- `DATE`
- `CUSTOM`

#### WorkPerformanceType

**Values:**
- `LABOR`
- `MATERIAL`
- `EQUIPMENT`
- `QUALITY`
- `SETUP`
- `DOWNTIME`

#### VarianceType

**Values:**
- `QUANTITY`
- `TIME`
- `COST`
- `EFFICIENCY`
- `YIELD`
- `MATERIAL`

#### QualityToleranceType

**Values:**
- `BILATERAL`
- `UNILATERAL_PLUS`
- `UNILATERAL_MINUS`
- `NOMINAL`

#### QualityInspectionStatus

**Values:**
- `CREATED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

#### QualityInspectionResult

**Values:**
- `PASS`
- `FAIL`
- `CONDITIONAL`

#### NCRSeverity

**Values:**
- `MINOR`
- `MAJOR`
- `CRITICAL`

#### NCRStatus

**Values:**
- `OPEN`
- `IN_REVIEW`
- `CORRECTIVE_ACTION`
- `CLOSED`

#### EquipmentClass

**Values:**
- `PRODUCTION`
- `MAINTENANCE`
- `QUALITY`
- `MATERIAL_HANDLING`
- `LABORATORY`
- `STORAGE`
- `ASSEMBLY`

#### EquipmentStatus

**Values:**
- `AVAILABLE`
- `IN_USE`
- `OPERATIONAL`
- `MAINTENANCE`
- `DOWN`
- `RETIRED`

#### EquipmentState

**Values:**
- `IDLE`
- `RUNNING`
- `BLOCKED`
- `STARVED`
- `FAULT`
- `MAINTENANCE`
- `SETUP`
- `EMERGENCY`

#### EquipmentLogType

**Values:**
- `MAINTENANCE`
- `REPAIR`
- `CALIBRATION`
- `STATUS_CHANGE`
- `USAGE`

#### PerformancePeriodType

**Values:**
- `HOUR`
- `SHIFT`
- `DAY`
- `WEEK`
- `MONTH`
- `QUARTER`
- `YEAR`

#### MaterialTransactionType

**Values:**
- `RECEIPT`
- `ISSUE`
- `RETURN`
- `ADJUSTMENT`
- `SCRAP`

#### WorkInstructionStatus

**Values:**
- `DRAFT`
- `REVIEW`
- `APPROVED`
- `REJECTED`
- `SUPERSEDED`
- `ARCHIVED`

#### WorkInstructionExecutionStatus

**Values:**
- `IN_PROGRESS`
- `COMPLETED`
- `PAUSED`
- `CANCELLED`

#### ElectronicSignatureType

**Values:**
- `BASIC`
- `ADVANCED`
- `QUALIFIED`

#### ElectronicSignatureLevel

**Values:**
- `OPERATOR`
- `SUPERVISOR`
- `QUALITY`
- `ENGINEER`
- `MANAGER`

#### BiometricType

**Values:**
- `FINGERPRINT`
- `FACIAL`
- `IRIS`
- `VOICE`
- `NONE`

#### FAIStatus

**Values:**
- `IN_PROGRESS`
- `REVIEW`
- `APPROVED`
- `REJECTED`
- `SUPERSEDED`

#### IntegrationType

**Values:**
- `ERP`
- `PLM`
- `CMMS`
- `WMS`
- `QMS`
- `HISTORIAN`
- `DNC`
- `SFC`
- `SKILLS`
- `CALIBRATION`
- `PDM`
- `CMM`
- `CUSTOM`

#### IntegrationDirection

**Values:**
- `INBOUND`
- `OUTBOUND`
- `BIDIRECTIONAL`

#### IntegrationLogStatus

**Values:**
- `PENDING`
- `IN_PROGRESS`
- `SUCCESS`
- `FAILED`
- `PARTIAL`
- `TIMEOUT`
- `CANCELLED`

#### ScheduleType

**Values:**
- `MASTER`
- `DETAILED`
- `DISPATCH`

#### B2MMessageStatus

**Values:**
- `PENDING`
- `VALIDATED`
- `PROCESSING`
- `PROCESSED`
- `SENT`
- `CONFIRMED`
- `ACCEPTED`
- `FAILED`
- `REJECTED`
- `TIMEOUT`

#### ERPTransactionType

**Values:**
- `ISSUE`
- `RECEIPT`
- `RETURN`
- `TRANSFER`
- `ADJUSTMENT`
- `SCRAP`
- `CONSUMPTION`

#### PersonnelActionType

**Values:**
- `CREATE`
- `UPDATE`
- `DEACTIVATE`
- `SKILL_UPDATE`
- `SCHEDULE_UPDATE`

#### DataCollectionType

**Values:**
- `SENSOR`
- `ALARM`
- `EVENT`
- `MEASUREMENT`
- `STATUS`
- `PERFORMANCE`

#### CommandType

**Values:**
- `START`
- `STOP`
- `PAUSE`
- `RESUME`
- `RESET`
- `CONFIGURE`
- `LOAD_PROGRAM`
- `UNLOAD_PROGRAM`
- `DIAGNOSTIC`
- `CALIBRATE`
- `EMERGENCY_STOP`

#### CommandStatus

**Values:**
- `PENDING`
- `SENT`
- `ACKNOWLEDGED`
- `EXECUTING`
- `COMPLETED`
- `FAILED`
- `TIMEOUT`
- `CANCELLED`

#### SPCChartType

**Values:**
- `X_BAR_R`
- `X_BAR_S`
- `I_MR`
- `P_CHART`
- `NP_CHART`
- `C_CHART`
- `U_CHART`
- `EWMA`
- `CUSUM`

#### LimitCalculationMethod

**Values:**
- `HISTORICAL_DATA`
- `SPEC_LIMITS`
- `MANUAL`

#### SamplingPlanType

**Values:**
- `SINGLE`
- `DOUBLE`
- `MULTIPLE`
- `SEQUENTIAL`

#### WorkInstructionFormat

**Values:**
- `NATIVE`
- `IMPORTED_PDF`
- `IMPORTED_DOC`
- `IMPORTED_PPT`
- `HYBRID`

#### MediaType

**Values:**
- `IMAGE`
- `VIDEO`
- `DOCUMENT`
- `DIAGRAM`
- `CAD_MODEL`
- `ANIMATION`

#### RelationType

**Values:**
- `PREREQUISITE`
- `SUPERSEDES`
- `RELATED_TO`
- `ALTERNATIVE_TO`
- `REFERENCED_BY`

#### ExportTemplateType

**Values:**
- `WORK_INSTRUCTION`
- `SETUP_SHEET`
- `INSPECTION_PLAN`
- `SOP`

#### ExportFormat

**Values:**
- `PDF`
- `DOCX`
- `PPTX`

#### InspectionType

**Values:**
- `FIRST_ARTICLE`
- `IN_PROCESS`
- `FINAL`
- `RECEIVING`
- `AUDIT`
- `PATROL`

#### InspectionFrequency

**Values:**
- `PER_PIECE`
- `PER_BATCH`
- `PER_LOT`
- `PERIODIC`
- `SAMPLING`
- `ON_DEMAND`

#### MeasurementType

**Values:**
- `DIMENSIONAL`
- `VISUAL`
- `FUNCTIONAL`
- `MATERIAL`
- `SURFACE_FINISH`
- `GEOMETRIC_TOLERANCE`

#### InspectionResult

**Values:**
- `PASS`
- `FAIL`
- `CONDITIONAL_PASS`
- `PENDING_REVIEW`

#### Disposition

**Values:**
- `ACCEPT`
- `REJECT`
- `REWORK`
- `USE_AS_IS`
- `RETURN_TO_VENDOR`
- `SCRAP`

#### SOPType

**Values:**
- `SAFETY`
- `QUALITY`
- `MAINTENANCE`
- `TRAINING`
- `EMERGENCY`
- `ENVIRONMENTAL`
- `SECURITY`
- `GENERAL`

#### ToolType

**Values:**
- `CUTTING_TOOL`
- `GAGE`
- `FIXTURE`
- `JIG`
- `DIE`
- `MOLD`
- `HAND_TOOL`
- `MEASURING_INSTRUMENT`
- `WORK_HOLDING`
- `OTHER`

#### MaintenanceType

**Values:**
- `PREVENTIVE`
- `CORRECTIVE`
- `PREDICTIVE`
- `BREAKDOWN`

#### DocumentType

**Values:**
- `WORK_INSTRUCTION`
- `SETUP_SHEET`
- `INSPECTION_PLAN`
- `SOP`
- `TOOL_DRAWING`

#### LayoutMode

**Values:**
- `SPLIT_VERTICAL`
- `SPLIT_HORIZONTAL`
- `TABBED`
- `OVERLAY`
- `PICTURE_IN_PICTURE`

#### PanelPosition

**Values:**
- `LEFT`
- `RIGHT`
- `TOP`
- `BOTTOM`
- `CENTER`

#### WorkflowType

**Values:**
- `WORK_INSTRUCTION`
- `SETUP_SHEET`
- `INSPECTION_PLAN`
- `SOP`
- `TOOL_DRAWING`
- `ECO`
- `NCR`
- `CAPA`
- `CHANGE_REQUEST`
- `DOCUMENT_APPROVAL`
- `FAI_REPORT`
- `QUALITY_PROCESS`

#### ApprovalType

**Values:**
- `ALL_REQUIRED`
- `ANY_ONE`
- `THRESHOLD`
- `PERCENTAGE`
- `WEIGHTED`

#### AssignmentStrategy

**Values:**
- `MANUAL`
- `ROLE_BASED`
- `LOAD_BALANCED`
- `ROUND_ROBIN`

#### ConditionOperator

**Values:**
- `EQUALS`
- `NOT_EQUALS`
- `GREATER_THAN`
- `LESS_THAN`
- `GREATER_THAN_OR_EQUAL`
- `LESS_THAN_OR_EQUAL`
- `IN`
- `NOT_IN`
- `CONTAINS`
- `REGEX_MATCH`

#### RuleActionType

**Values:**
- `ADD_STAGE`
- `SKIP_STAGE`
- `CHANGE_APPROVERS`
- `SET_DEADLINE`
- `SEND_NOTIFICATION`
- `REQUIRE_SIGNATURE_TYPE`

#### WorkflowStatus

**Values:**
- `IN_PROGRESS`
- `COMPLETED`
- `REJECTED`
- `CANCELLED`
- `ON_HOLD`

#### Priority

**Values:**
- `LOW`
- `NORMAL`
- `HIGH`
- `CRITICAL`

#### ImpactLevel

**Values:**
- `NONE`
- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

#### StageStatus

**Values:**
- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- `SKIPPED`
- `ESCALATED`

#### StageOutcome

**Values:**
- `APPROVED`
- `REJECTED`
- `CHANGES_REQUESTED`
- `DELEGATED`
- `SKIPPED`

#### AssignmentType

**Values:**
- `REQUIRED`
- `OPTIONAL`
- `OBSERVER`

#### ApprovalAction

**Values:**
- `APPROVED`
- `REJECTED`
- `CHANGES_REQUESTED`
- `DELEGATED`
- `SKIPPED`

#### WorkflowEventType

**Values:**
- `WORKFLOW_STARTED`
- `STAGE_STARTED`
- `STAGE_COMPLETED`
- `APPROVAL_GRANTED`
- `APPROVAL_REJECTED`
- `CHANGES_REQUESTED`
- `DELEGATED`
- `ESCALATED`
- `DEADLINE_EXTENDED`
- `WORKFLOW_COMPLETED`
- `WORKFLOW_CANCELLED`
- `REMINDER_SENT`
- `RULE_EVALUATED`
- `STAGE_ADDED`
- `STAGE_SKIPPED`

#### TaskStatus

**Values:**
- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- `ESCALATED`
- `DELEGATED`

#### ECOType

**Values:**
- `CORRECTIVE`
- `IMPROVEMENT`
- `COST_REDUCTION`
- `COMPLIANCE`
- `CUSTOMER_REQUEST`
- `ENGINEERING`
- `EMERGENCY`

#### ECOPriority

**Values:**
- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`
- `EMERGENCY`

#### ECOStatus

**Values:**
- `REQUESTED`
- `UNDER_REVIEW`
- `PENDING_CRB`
- `CRB_APPROVED`
- `IMPLEMENTATION`
- `VERIFICATION`
- `COMPLETED`
- `REJECTED`
- `CANCELLED`
- `ON_HOLD`

#### EffectivityType

**Values:**
- `BY_DATE`
- `BY_SERIAL_NUMBER`
- `BY_WORK_ORDER`
- `BY_LOT_BATCH`
- `IMMEDIATE`

#### CRBDecision

**Values:**
- `APPROVED`
- `REJECTED`
- `DEFERRED`
- `REQUEST_MORE_INFO`

#### DocUpdateStatus

**Values:**
- `PENDING`
- `IN_PROGRESS`
- `AWAITING_APPROVAL`
- `APPROVED`
- `COMPLETED`

#### ECOTaskType

**Values:**
- `DOCUMENT_UPDATE`
- `ROUTING_UPDATE`
- `BOM_UPDATE`
- `PART_MASTER_UPDATE`
- `TOOLING_CREATION`
- `EQUIPMENT_SETUP`
- `TRAINING`
- `VERIFICATION`
- `FIRST_ARTICLE`
- `PROCESS_VALIDATION`

#### ECOTaskStatus

**Values:**
- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- `BLOCKED`
- `CANCELLED`

#### AttachmentType

**Values:**
- `SUPPORTING_DOC`
- `DRAWING_CURRENT`
- `DRAWING_PROPOSED`
- `CALCULATION`
- `TEST_RESULT`
- `SUPPLIER_DOC`
- `CUSTOMER_CORRESPONDENCE`
- `ANALYSIS_REPORT`
- `PHOTO`
- `OTHER`

#### ECOEventType

**Values:**
- `ECO_CREATED`
- `STATUS_CHANGED`
- `CRB_REVIEW_SCHEDULED`
- `CRB_REVIEW_COMPLETED`
- `TASK_CREATED`
- `TASK_COMPLETED`
- `DOCUMENT_UPDATED`
- `EFFECTIVITY_SET`
- `ECO_COMPLETED`
- `ECO_CANCELLED`
- `COMMENT_ADDED`
- `ATTACHMENT_ADDED`

#### ECORelationType

**Values:**
- `DEPENDS_ON`
- `BLOCKS`
- `RELATED_TO`
- `SUPERSEDES`
- `DUPLICATE_OF`
- `CHILD_OF`

#### VotingRule

**Values:**
- `UNANIMOUS`
- `MAJORITY`
- `SUPERMAJORITY`
- `CONSENSUS`

#### CommentContextType

**Values:**
- `DOCUMENT`
- `STEP`
- `PARAMETER`
- `CHARACTERISTIC`
- `IMAGE`
- `VIDEO`
- `TEXT_SECTION`

#### CommentStatus

**Values:**
- `OPEN`
- `RESOLVED`
- `ARCHIVED`

#### CommentPriority

**Values:**
- `LOW`
- `MEDIUM`
- `HIGH`

#### ReactionType

**Values:**
- `LIKE`
- `AGREE`
- `DISAGREE`
- `HELPFUL`
- `QUESTION`

#### AnnotationType

**Values:**
- `ARROW`
- `CALLOUT`
- `HIGHLIGHT`
- `TEXT_LABEL`
- `FREEHAND`
- `RECTANGLE`
- `CIRCLE`
- `LINE`
- `BLUR`
- `STICKY_NOTE`
- `STRIKETHROUGH`
- `UNDERLINE`
- `STAMP`

#### ReviewType

**Values:**
- `TECHNICAL`
- `EDITORIAL`
- `QUALITY`
- `SAFETY`
- `COMPLIANCE`
- `GENERAL`

#### ReviewStatus

**Values:**
- `NOT_STARTED`
- `IN_PROGRESS`
- `FEEDBACK_PROVIDED`
- `COMPLETED`
- `OVERDUE`

#### ReviewRecommendation

**Values:**
- `APPROVE`
- `REQUEST_CHANGES`
- `REJECT`
- `NO_RECOMMENDATION`

#### ActivityType

**Values:**
- `CREATED`
- `EDITED`
- `COMMENTED`
- `ANNOTATED`
- `REVIEW_ASSIGNED`
- `REVIEW_COMPLETED`
- `APPROVED`
- `REJECTED`
- `VERSION_CREATED`
- `LINKED`
- `ECO_LINKED`
- `SHARED`
- `EXPORTED`
- `VIEWED`

#### NotificationType

**Values:**
- `MENTION`
- `COMMENT_REPLY`
- `REVIEW_ASSIGNED`
- `DOCUMENT_UPDATED`
- `APPROVAL_GRANTED`
- `APPROVAL_REJECTED`
- `COMMENT_RESOLVED`
- `DEADLINE_APPROACHING`
- `REVIEW_COMPLETED`

#### ResolutionType

**Values:**
- `ACCEPT_YOURS`
- `ACCEPT_THEIRS`
- `MANUAL_MERGE`
- `AUTO_MERGED`

#### StorageClass

**Values:**
- `HOT`
- `WARM`
- `COLD`
- `ARCHIVE`

#### CacheStatus

**Values:**
- `CACHED`
- `NOT_CACHED`
- `INVALIDATED`
- `EXPIRED`

#### UploadMethod

**Values:**
- `DIRECT`
- `MULTIPART`
- `PRESIGNED`
- `RESUMABLE`

#### ProcessingStatus

**Values:**
- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

#### FileAttachmentType

**Values:**
- `PRIMARY`
- `ATTACHMENT`
- `THUMBNAIL`
- `PREVIEW`
- `EXPORT`
- `BACKUP`
- `TEMP`

#### VersionChangeType

**Values:**
- `CREATE`
- `UPDATE`
- `RENAME`
- `METADATA`
- `RESTORE`
- `MIGRATE`

#### BackupFrequency

**Values:**
- `REAL_TIME`
- `HOURLY`
- `DAILY`
- `WEEKLY`
- `MONTHLY`
- `CUSTOM`

#### BackupType

**Values:**
- `FULL`
- `INCREMENTAL`
- `DIFFERENTIAL`
- `SNAPSHOT`

#### BackupStatus

**Values:**
- `SCHEDULED`
- `IN_PROGRESS`
- `COMPLETED`
- `FAILED`
- `CANCELLED`
- `PARTIAL`

#### AccessType

**Values:**
- `READ`
- `WRITE`
- `DELETE`
- `METADATA`
- `LIST`
- `PREVIEW`

#### UploadStatus

**Values:**
- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- `FAILED`
- `CANCELLED`
- `EXPIRED`

#### TimeTrackingGranularity

**Values:**
- `NONE`
- `WORK_ORDER`
- `OPERATION`

#### CostingModel

**Values:**
- `LABOR_HOURS`
- `MACHINE_HOURS`
- `BOTH`

#### MultiTaskingMode

**Values:**
- `CONCURRENT`
- `SPLIT_ALLOCATION`

#### ApprovalFrequency

**Values:**
- `DAILY`
- `WEEKLY`
- `BIWEEKLY`
- `NONE`

#### TimeType

**Values:**
- `DIRECT_LABOR`
- `INDIRECT`
- `MACHINE`

#### TimeEntrySource

**Values:**
- `MANUAL`
- `KIOSK`
- `MOBILE`
- `MACHINE_AUTO`
- `API`
- `HISTORIAN`

#### TimeEntryStatus

**Values:**
- `ACTIVE`
- `COMPLETED`
- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `EXPORTED`

#### IndirectCategory

**Values:**
- `BREAK`
- `LUNCH`
- `TRAINING`
- `MEETING`
- `MAINTENANCE`
- `SETUP`
- `CLEANUP`
- `WAITING`
- `ADMINISTRATIVE`
- `OTHER`

#### TimeValidationRuleType

**Values:**
- `MAX_DURATION`
- `MIN_DURATION`
- `MISSING_CLOCK_OUT`
- `CONCURRENT_ENTRIES`
- `OVERTIME_THRESHOLD`
- `INVALID_TIME_RANGE`

#### SecurityEventType

**Values:**
- `AUTH_FAILURE`
- `PRIVILEGE_ESCALATION`
- `EMERGENCY_ACCESS`
- `UNUSUAL_PATTERN`
- `MULTIPLE_SESSIONS`
- `PERMISSION_DENIED`
- `SUSPICIOUS_IP`
- `SESSION_HIJACK`
- `BRUTE_FORCE`
- `ACCOUNT_LOCKOUT`
- `DATA_EXPORT`
- `ADMIN_ACTION`
- `SYSTEM_ACCESS`

#### SecuritySeverity

**Values:**
- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

#### ReportType

**Values:**
- `USER_ACCESS`
- `PERMISSION_CHANGES`
- `SECURITY_EVENTS`
- `SESSION_ANALYTICS`
- `COMPLIANCE_SOX`
- `COMPLIANCE_GDPR`
- `COMPLIANCE_ISO27001`
- `USAGE_ANALYTICS`
- `TREND_ANALYSIS`

#### ReportStatus

**Values:**
- `GENERATING`
- `COMPLETED`
- `FAILED`
- `EXPIRED`

#### PermissionChangeType

**Values:**
- `ROLE_ASSIGNED`
- `ROLE_REMOVED`
- `PERMISSION_GRANTED`
- `PERMISSION_REVOKED`
- `ROLE_MODIFIED`
- `SITE_ACCESS_GRANTED`
- `SITE_ACCESS_REVOKED`
- `EMERGENCY_OVERRIDE`
- `BULK_CHANGE`

#### SsoProviderType

**Values:**
- `SAML`
- `OIDC`
- `AZURE_AD`
- `LDAP`
- `INTERNAL`

#### AuthenticationEventType

**Values:**
- `LOGIN`
- `LOGOUT`
- `REFRESH`
- `FAILURE`
- `PROVIDER_ERROR`
- `SESSION_TIMEOUT`
- `FORCED_LOGOUT`

#### RoleTemplateCategory

**Values:**
- `PRODUCTION`
- `QUALITY`
- `MAINTENANCE`
- `MANAGEMENT`
- `ADMINISTRATION`
- `ENGINEERING`
- `SAFETY`
- `COMPLIANCE`
- `CUSTOM`

#### RoleTemplateAction

**Values:**
- `TEMPLATE_CREATED`
- `TEMPLATE_UPDATED`
- `TEMPLATE_DELETED`
- `TEMPLATE_ACTIVATED`
- `TEMPLATE_DEACTIVATED`
- `ROLE_INSTANTIATED`
- `ROLE_CUSTOMIZED`
- `PERMISSIONS_MODIFIED`
- `USER_ASSIGNED`
- `USER_REMOVED`
