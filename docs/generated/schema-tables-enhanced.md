# Enhanced Database Schema Documentation

> **Generated:** 10/30/2025, 7:17:23 AM
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
| **Tables with Documentation** | 58 / 186 | 31% |
| **Fields with Documentation** | 7 / 3536 | 0% |


## Models by Category


### Core Infrastructure (17 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [Area](#area) | No description available | Not specified | 11 | 2 |  |
| [Enterprise](#enterprise) | No description available | Not specified | 9 | 1 |  |
| [Equipment](#equipment) | Manufacturing equipment and machinery used in production operations with capability and status tracking | Manufacturing Engineering Team | 47 | 14 | ⚠️ |
| [EquipmentCapability](#equipmentcapability) | No description available | Not specified | 12 | 0 |  |
| [EquipmentCommand](#equipmentcommand) | No description available | Not specified | 24 | 0 |  |
| [EquipmentDataCollection](#equipmentdatacollection) | No description available | Not specified | 21 | 0 |  |
| [EquipmentLog](#equipmentlog) | No description available | Not specified | 8 | 1 |  |
| [EquipmentMaterialMovement](#equipmentmaterialmovement) | No description available | Not specified | 22 | 1 |  |
| [EquipmentOperationSpecification](#equipmentoperationspecification) | No description available | Not specified | 15 | 0 |  |
| [EquipmentPerformanceLog](#equipmentperformancelog) | No description available | Not specified | 30 | 0 |  |
| [EquipmentStateHistory](#equipmentstatehistory) | No description available | Not specified | 14 | 0 |  |
| [MeasurementEquipment](#measurementequipment) | No description available | Not specified | 23 | 3 |  |
| [PartSiteAvailability](#partsiteavailability) | No description available | Not specified | 17 | 2 |  |
| [PersonnelWorkCenterAssignment](#personnelworkcenterassignment) | No description available | Not specified | 12 | 2 |  |
| [Site](#site) | No description available | Not specified | 27 | 13 |  |
| [UserSiteRole](#usersiterole) | Junction table: User ↔ Role ↔ Site (many-to-many, site-specific) | Not specified | 10 | 2 |  |
| [WorkCenter](#workcenter) | No description available | Not specified | 16 | 7 |  |

### Personnel Management (6 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [PersonnelClass](#personnelclass) | No description available | Not specified | 13 | 4 |  |
| [User](#user) | System users with authentication credentials and role-based access permissions | IT Security Team | 86 | 45 | ⚠️ |
| [UserNotification](#usernotification) | User Notification - System notifications | Not specified | 12 | 0 |  |
| [UserRole](#userrole) | Junction table: User ↔ Role (many-to-many, global) | Not specified | 8 | 1 |  |
| [UserSessionLog](#usersessionlog) | User Session Tracking | Not specified | 12 | 1 |  |
| [UserWorkstationPreference](#userworkstationpreference) | User Workstation Preference - Manages user layout preferences for work instruction execution | Not specified | 14 | 0 |  |

### Other (100 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [Alert](#alert) | No description available | Not specified | 10 | 0 |  |
| [AuditLog](#auditlog) | No description available | Not specified | 11 | 1 |  |
| [AuthenticationEvent](#authenticationevent) | Authentication Analytics | Not specified | 14 | 1 |  |
| [BackupEntry](#backupentry) | Backup entries linking files to backup instances | Not specified | 10 | 2 |  |
| [BackupHistory](#backuphistory) | Backup execution history and status tracking | Not specified | 21 | 2 |  |
| [BackupSchedule](#backupschedule) | Backup schedules for automated backup management | Not specified | 25 | 1 |  |
| [CNCProgram](#cncprogram) | No description available | Not specified | 27 | 1 |  |
| [CommentReaction](#commentreaction) | Comment Reaction - Reactions to comments | Not specified | 7 | 1 |  |
| [ConfigurationOption](#configurationoption) | No description available | Not specified | 17 | 1 |  |
| [ConflictResolution](#conflictresolution) | Conflict Resolution - Merge conflict resolutions | Not specified | 13 | 0 |  |
| [CRBConfiguration](#crbconfiguration) | CRB Configuration - Change Review Board setup | Not specified | 11 | 0 |  |
| [DataCollectionFieldTemplate](#datacollectionfieldtemplate) | Data Collection Field Template - Reusable field templates | Not specified | 12 | 0 |  |
| [DispatchLog](#dispatchlog) | No description available | Not specified | 19 | 2 |  |
| [ECOAttachment](#ecoattachment) | ECO Attachment - Supporting documents for ECOs | Not specified | 12 | 1 |  |
| [ECOCRBReview](#ecocrbreview) | ECO CRB Review - Change Review Board meeting records | Not specified | 18 | 1 |  |
| [ECOHistory](#ecohistory) | ECO History - Complete audit trail for ECO changes | Not specified | 12 | 1 |  |
| [ECORelation](#ecorelation) | ECO Relation - Relationships between ECOs | Not specified | 8 | 2 |  |
| [ECOTask](#ecotask) | ECO Task - Implementation tasks for ECO completion | Not specified | 19 | 1 |  |
| [ElectronicSignature](#electronicsignature) | No description available | Not specified | 25 | 2 |  |
| [EngineeringChangeOrder](#engineeringchangeorder) | Engineering Change Order - Core ECO entity for formal change management | Not specified | 49 | 4 |  |
| [ExportTemplate](#exporttemplate) | Export Template - Templates for exporting work instructions | Not specified | 16 | 0 |  |
| [FAICharacteristic](#faicharacteristic) | No description available | Not specified | 23 | 1 |  |
| [FAIReport](#faireport) | No description available | Not specified | 19 | 3 |  |
| [FileAccessLog](#fileaccesslog) | File access logging for security and analytics | Not specified | 20 | 1 |  |
| [FileVersion](#fileversion) | File version history for comprehensive version tracking | Not specified | 18 | 1 |  |
| [HomeRealmDiscovery](#homerealmdiscovery) | Home Realm Discovery Rules | Not specified | 8 | 0 |  |
| [InspectionCharacteristic](#inspectioncharacteristic) | No description available | Not specified | 13 | 1 |  |
| [InspectionExecution](#inspectionexecution) | No description available | Not specified | 15 | 2 |  |
| [InspectionPlan](#inspectionplan) | No description available | Not specified | 42 | 8 |  |
| [InspectionRecord](#inspectionrecord) | No description available | Not specified | 14 | 2 |  |
| [InspectionStep](#inspectionstep) | No description available | Not specified | 8 | 1 |  |
| [IntegrationConfig](#integrationconfig) | No description available | Not specified | 21 | 4 |  |
| [IntegrationLog](#integrationlog) | No description available | Not specified | 17 | 1 |  |
| [Inventory](#inventory) | No description available | Not specified | 14 | 1 |  |
| [MultipartUpload](#multipartupload) | Multipart upload session tracking | Not specified | 19 | 0 |  |
| [ParameterFormula](#parameterformula) | No description available | Not specified | 15 | 1 |  |
| [ParameterGroup](#parametergroup) | No description available | Not specified | 14 | 1 |  |
| [ParameterLimits](#parameterlimits) | No description available | Not specified | 16 | 1 |  |
| [Part](#part) | No description available | Not specified | 45 | 14 |  |
| [PartGenealogy](#partgenealogy) | No description available | Not specified | 8 | 2 |  |
| [PersonnelAvailability](#personnelavailability) | No description available | Not specified | 15 | 1 |  |
| [PersonnelCertification](#personnelcertification) | No description available | Not specified | 15 | 2 |  |
| [PersonnelInfoExchange](#personnelinfoexchange) | No description available | Not specified | 29 | 1 |  |
| [PersonnelQualification](#personnelqualification) | No description available | Not specified | 14 | 2 |  |
| [PersonnelSkill](#personnelskill) | No description available | Not specified | 9 | 1 |  |
| [PersonnelSkillAssignment](#personnelskillassignment) | No description available | Not specified | 13 | 2 |  |
| [ProcessDataCollection](#processdatacollection) | No description available | Not specified | 28 | 0 |  |
| [ProductConfiguration](#productconfiguration) | No description available | Not specified | 21 | 2 |  |
| [ProductionPerformanceActual](#productionperformanceactual) | No description available | Not specified | 39 | 1 |  |
| [ProductionVariance](#productionvariance) | No description available | Not specified | 26 | 0 |  |
| [ProductLifecycle](#productlifecycle) | No description available | Not specified | 15 | 1 |  |
| [ProductSpecification](#productspecification) | No description available | Not specified | 19 | 1 |  |
| [ProgramDownloadLog](#programdownloadlog) | No description available | Not specified | 12 | 1 |  |
| [ProgramLoadAuthorization](#programloadauthorization) | No description available | Not specified | 21 | 0 |  |
| [QIFCharacteristic](#qifcharacteristic) | No description available | Not specified | 20 | 2 |  |
| [QIFMeasurement](#qifmeasurement) | No description available | Not specified | 17 | 2 |  |
| [QIFMeasurementPlan](#qifmeasurementplan) | No description available | Not specified | 23 | 3 |  |
| [QIFMeasurementResult](#qifmeasurementresult) | No description available | Not specified | 27 | 5 |  |
| [QualityCharacteristic](#qualitycharacteristic) | No description available | Not specified | 15 | 2 |  |
| [ReviewAssignment](#reviewassignment) | Review Assignment - Document review assignments | Not specified | 23 | 0 |  |
| [SamplingInspectionResult](#samplinginspectionresult) | No description available | Not specified | 13 | 0 |  |
| [SamplingPlan](#samplingplan) | No description available | Not specified | 30 | 2 |  |
| [ScheduleConstraint](#scheduleconstraint) | No description available | Not specified | 24 | 1 |  |
| [ScheduleEntry](#scheduleentry) | No description available | Not specified | 39 | 4 |  |
| [ScheduleStateHistory](#schedulestatehistory) | No description available | Not specified | 13 | 1 |  |
| [SerializedPart](#serializedpart) | No description available | Not specified | 17 | 5 |  |
| [SetupExecution](#setupexecution) | No description available | Not specified | 15 | 3 |  |
| [SetupParameter](#setupparameter) | No description available | Not specified | 9 | 1 |  |
| [SetupSheet](#setupsheet) | No description available | Not specified | 42 | 9 |  |
| [SetupStep](#setupstep) | No description available | Not specified | 11 | 1 |  |
| [SetupTool](#setuptool) | No description available | Not specified | 9 | 1 |  |
| [SOPAcknowledgment](#sopacknowledgment) | No description available | Not specified | 11 | 2 |  |
| [SOPAudit](#sopaudit) | No description available | Not specified | 12 | 2 |  |
| [SOPStep](#sopstep) | No description available | Not specified | 10 | 1 |  |
| [SPCConfiguration](#spcconfiguration) | No description available | Not specified | 27 | 2 |  |
| [SPCRuleViolation](#spcruleviolation) | No description available | Not specified | 19 | 1 |  |
| [SsoProvider](#ssoprovider) | SSO Provider Registry | Not specified | 15 | 2 |  |
| [SsoSession](#ssosession) | SSO Session Management | Not specified | 10 | 1 |  |
| [StandardOperatingProcedure](#standardoperatingprocedure) | No description available | Not specified | 46 | 8 |  |
| [StorageMetrics](#storagemetrics) | Storage analytics and metrics for monitoring | Not specified | 31 | 0 |  |
| [StoredFile](#storedfile) | Cloud storage file registry | Not specified | 47 | 5 |  |
| [ToolCalibrationRecord](#toolcalibrationrecord) | No description available | Not specified | 12 | 2 |  |
| [ToolDrawing](#tooldrawing) | No description available | Not specified | 58 | 8 |  |
| [ToolMaintenanceRecord](#toolmaintenancerecord) | No description available | Not specified | 13 | 2 |  |
| [ToolUsageLog](#toolusagelog) | No description available | Not specified | 11 | 2 |  |
| [WorkflowAssignment](#workflowassignment) | No description available | Not specified | 19 | 1 |  |
| [WorkflowDefinition](#workflowdefinition) | No description available | Not specified | 15 | 3 |  |
| [WorkflowDelegation](#workflowdelegation) | No description available | Not specified | 10 | 0 |  |
| [WorkflowHistory](#workflowhistory) | No description available | Not specified | 13 | 1 |  |
| [WorkflowInstance](#workflowinstance) | No description available | Not specified | 16 | 3 |  |
| [WorkflowMetrics](#workflowmetrics) | No description available | Not specified | 17 | 0 |  |
| [WorkflowParallelCoordination](#workflowparallelcoordination) | No description available | Not specified | 18 | 1 |  |
| [WorkflowRule](#workflowrule) | No description available | Not specified | 14 | 1 |  |
| [WorkflowStage](#workflowstage) | No description available | Not specified | 20 | 2 |  |
| [WorkflowStageInstance](#workflowstageinstance) | No description available | Not specified | 15 | 4 |  |
| [WorkflowTask](#workflowtask) | No description available | Not specified | 15 | 0 |  |
| [WorkflowTemplate](#workflowtemplate) | No description available | Not specified | 13 | 0 |  |
| [WorkPerformance](#workperformance) | No description available | Not specified | 37 | 1 |  |
| [WorkstationDisplayConfig](#workstationdisplayconfig) | Workstation Display Config - Physical display configuration for workstations | Not specified | 13 | 0 |  |
| [WorkUnit](#workunit) | No description available | Not specified | 10 | 1 |  |

### Material Management (10 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [BOMItem](#bomitem) | No description available | Not specified | 23 | 2 |  |
| [ERPMaterialTransaction](#erpmaterialtransaction) | No description available | Not specified | 32 | 2 |  |
| [MaterialClass](#materialclass) | No description available | Not specified | 18 | 3 |  |
| [MaterialDefinition](#materialdefinition) | No description available | Not specified | 40 | 3 |  |
| [MaterialLot](#materiallot) | No description available | Not specified | 48 | 5 |  |
| [MaterialLotGenealogy](#materiallotgenealogy) | No description available | Not specified | 15 | 0 |  |
| [MaterialProperty](#materialproperty) | No description available | Not specified | 16 | 1 |  |
| [MaterialStateHistory](#materialstatehistory) | No description available | Not specified | 22 | 0 |  |
| [MaterialSublot](#materialsublot) | No description available | Not specified | 17 | 0 |  |
| [MaterialTransaction](#materialtransaction) | No description available | Not specified | 11 | 1 |  |

### Production Management (20 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [MaintenanceWorkOrder](#maintenanceworkorder) | No description available | Not specified | 19 | 0 |  |
| [MaterialOperationSpecification](#materialoperationspecification) | No description available | Not specified | 16 | 0 |  |
| [Operation](#operation) | No description available | Not specified | 40 | 10 |  |
| [OperationDependency](#operationdependency) | No description available | Not specified | 14 | 0 |  |
| [OperationGaugeRequirement](#operationgaugerequirement) | No description available | Not specified | 7 | 1 |  |
| [OperationParameter](#operationparameter) | No description available | Not specified | 24 | 3 |  |
| [PersonnelOperationSpecification](#personneloperationspecification) | No description available | Not specified | 14 | 0 |  |
| [PhysicalAssetOperationSpecification](#physicalassetoperationspecification) | No description available | Not specified | 15 | 0 |  |
| [ProductionSchedule](#productionschedule) | No description available | Not specified | 28 | 3 |  |
| [ProductionScheduleRequest](#productionschedulerequest) | No description available | Not specified | 33 | 3 |  |
| [ProductionScheduleResponse](#productionscheduleresponse) | No description available | Not specified | 20 | 1 |  |
| [Routing](#routing) | No description available | Not specified | 30 | 6 |  |
| [RoutingOperation](#routingoperation) | No description available | Not specified | 14 | 1 |  |
| [RoutingStep](#routingstep) | No description available | Not specified | 26 | 4 |  |
| [RoutingStepDependency](#routingstepdependency) | No description available | Not specified | 10 | 2 |  |
| [RoutingStepParameter](#routingstepparameter) | No description available | Not specified | 9 | 1 |  |
| [RoutingTemplate](#routingtemplate) | No description available | Not specified | 19 | 2 |  |
| [WorkOrder](#workorder) | Production work orders defining specific manufacturing jobs with materials, operations, and quality requirements | Production Planning Team | 46 | 19 | ⚠️ |
| [WorkOrderOperation](#workorderoperation) | No description available | Not specified | 19 | 5 |  |
| [WorkOrderStatusHistory](#workorderstatushistory) | No description available | Not specified | 13 | 0 |  |

### Quality Management (5 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [AuditReport](#auditreport) | Audit Report Management | Not specified | 13 | 2 |  |
| [NCR](#ncr) | No description available | Not specified | 26 | 3 |  |
| [QualityInspection](#qualityinspection) | No description available | Not specified | 18 | 3 |  |
| [QualityMeasurement](#qualitymeasurement) | No description available | Not specified | 9 | 1 |  |
| [QualityPlan](#qualityplan) | Quality control plans defining inspection requirements, measurement criteria, and acceptance standards for manufacturing operations | Quality Assurance Team | 12 | 2 | ⚠️ |

### Document Management (13 tables)

| Table | Description | Data Owner | Fields | Relationships | Compliance |
|-------|-------------|------------|--------|---------------|------------|
| [DocumentActivity](#documentactivity) | Document Activity - Activity log for documents | Not specified | 11 | 0 |  |
| [DocumentAnnotation](#documentannotation) | Document Annotation - Visual annotations on media | Not specified | 18 | 0 |  |
| [DocumentComment](#documentcomment) | Document Comment - Threaded comments on documents | Not specified | 25 | 3 |  |
| [DocumentEditSession](#documenteditsession) | Document Edit Session - Real-time collaboration sessions | Not specified | 12 | 0 |  |
| [DocumentSubscription](#documentsubscription) | Document Subscription - User subscriptions to document updates | Not specified | 9 | 0 |  |
| [DocumentTemplate](#documenttemplate) | No description available | Not specified | 18 | 2 |  |
| [ECOAffectedDocument](#ecoaffecteddocument) | ECO Affected Document - Links ECOs to documents that need updates | Not specified | 16 | 1 |  |
| [WorkInstruction](#workinstruction) | No description available | Not specified | 36 | 7 |  |
| [WorkInstructionExecution](#workinstructionexecution) | No description available | Not specified | 13 | 2 |  |
| [WorkInstructionMedia](#workinstructionmedia) | Work Instruction Media - Enhanced media library for work instructions | Not specified | 16 | 0 |  |
| [WorkInstructionRelation](#workinstructionrelation) | Work Instruction Relation - Relationships between work instructions | Not specified | 7 | 0 |  |
| [WorkInstructionStep](#workinstructionstep) | No description available | Not specified | 15 | 0 |  |
| [WorkInstructionStepExecution](#workinstructionstepexecution) | No description available | Not specified | 14 | 1 |  |

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

**Fields (9):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| enterpriseCode | String | ✓ |  |  |  |
| enterpriseName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| headquarters | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| sites | Site[] | ✓ |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | Site | sites | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id

---

### Site

**Fields (27):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| siteCode | String | ✓ |  |  |  |
| siteName | String | ✓ |  |  |  |
| location | String |  |  |  |  |
| enterpriseId | String |  |  |  |  |
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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** enterpriseId

---

### Area

**Fields (11):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| areaCode | String | ✓ |  |  |  |
| areaName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| siteId | String | ✓ |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| site | Site | ✓ |  |  |  |
| equipment | Equipment[] | ✓ |  |  |  |
| workCenters | WorkCenter[] | ✓ |  |  |  |
**Relationships (2):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Site | site | ✓ |  |
| one-to-many | WorkCenter | workCenters | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** siteId

---

### User

**Description:** System users with authentication credentials and role-based access permissions

**Business Purpose:** Manages personnel access to the MES system, tracks user activities, and enforces security policies across manufacturing operations

**Data Governance:**
- **Data Owner:** IT Security Team
- **Update Frequency:** Real-time for status changes, daily batch for HR integration
- **Data Retention:** 7 years after employment termination for audit purposes
- **Security Classification:** Confidential - Contains PII and access control data

**Compliance Notes:** Contains PII - subject to data privacy regulations. Electronic signatures require 21 CFR Part 11 compliance

**System Integrations:** HR Management System, Active Directory, Badge Access System, Electronic Signature System

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

#### Production operator with shop floor access

Typical production worker with basic manufacturing access

```json
{
  "username": "jdoe_op",
  "employeeNumber": "EMP-001234",
  "firstName": "John",
  "lastName": "Doe",
  "roles": [
    "PRODUCTION_OPERATOR"
  ],
  "isActive": true
}
```

#### Quality engineer with inspection authority

Quality professional with inspection and approval permissions

```json
{
  "username": "msmith_qe",
  "employeeNumber": "EMP-005678",
  "roles": [
    "QUALITY_ENGINEER",
    "INSPECTOR"
  ],
  "isActive": true
}
```

**Common Queries:**
- Find all active users by role for access reviews
- Generate user activity reports for compliance audits
- List users requiring certification renewal

**Related Tables:** UserSiteRole, PersonnelClass, ElectronicSignature, SecurityEvent

**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** employeeNumber
- **Index:** personnelClassId
- **Index:** supervisorId

---

### PersonnelClass

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentClassId
- **Index:** level

---

### PersonnelQualification

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** personnelClassId
- **Index:** qualificationType

---

### PersonnelCertification

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** personnelId, qualificationId
- **Index:** personnelId
- **Index:** qualificationId
- **Index:** expirationDate
- **Index:** status

---

### PersonnelSkill

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** skillCategory

---

### PersonnelSkillAssignment

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** personnelId, skillId
- **Index:** personnelId
- **Index:** skillId
- **Index:** competencyLevel

---

### PersonnelWorkCenterAssignment

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** personnelId, workCenterId
- **Index:** personnelId
- **Index:** workCenterId
- **Index:** effectiveDate

---

### PersonnelAvailability

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** personnelId
- **Index:** startDateTime
- **Index:** availabilityType

---

### MaterialClass

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentClassId
- **Index:** level

---

### MaterialDefinition

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** materialClassId
- **Index:** materialType
- **Index:** isActive
- **Index:** materialNumber

---

### MaterialProperty

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** materialId, propertyName
- **Index:** materialId
- **Index:** propertyType

---

### MaterialLot

**Fields (48):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| lotNumber | String | ✓ |  |  |  |
| materialId | String | ✓ |  |  |  |
| supplierLotNumber | String |  |  |  |  |
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
| expirationDate | DateTime |  |  |  |  |
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
**Relationships (5):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-many | MaterialLotGenealogy | genealogyAsChild | ✓ |  |
| one-to-many | MaterialLotGenealogy | genealogyAsParent | ✓ |  |
| one-to-one | MaterialDefinition | material | ✓ |  |
| one-to-many | MaterialStateHistory | stateHistory | ✓ |  |
| one-to-many | MaterialSublot | sublots | ✓ |  |
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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentLotId
- **Index:** sublotNumber
- **Index:** workOrderId

---

### MaterialLotGenealogy

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** parentLotId, childLotId, processDate
- **Index:** parentLotId
- **Index:** childLotId
- **Index:** workOrderId
- **Index:** processDate

---

### MaterialStateHistory

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** lotId
- **Index:** changedAt
- **Index:** newState
- **Index:** newStatus

---

### Operation

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** operationId, parameterName
- **Index:** operationId
- **Index:** parameterType

---

### ParameterLimits

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### ParameterGroup

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentGroupId
- **Index:** groupType

---

### ParameterFormula

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** outputParameterId

---

### OperationDependency

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** dependentOperationId, prerequisiteOperationId
- **Index:** dependentOperationId
- **Index:** prerequisiteOperationId

---

### PersonnelOperationSpecification

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** operationId
- **Index:** personnelClassId

---

### EquipmentOperationSpecification

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** operationId
- **Index:** equipmentClass

---

### MaterialOperationSpecification

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** operationId
- **Index:** materialDefinitionId

---

### PhysicalAssetOperationSpecification

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** operationId
- **Index:** assetType

---

### Part

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** productType
- **Index:** lifecycleState
- **Index:** isActive
- **Index:** partNumber

---

### PartSiteAvailability

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** partId, siteId
- **Index:** siteId
- **Index:** isActive

---

### BOMItem

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** parentPartId
- **Index:** componentPartId
- **Index:** operationId
- **Index:** effectiveDate

---

### ProductSpecification

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** partId
- **Index:** specificationType
- **Index:** isCritical

---

### ProductConfiguration

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** partId
- **Index:** configurationType
- **Index:** isDefault

---

### ConfigurationOption

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configurationId

---

### ProductLifecycle

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** partId
- **Index:** newState
- **Index:** transitionDate

---

### WorkOrder

**Description:** Production work orders defining specific manufacturing jobs with materials, operations, and quality requirements

**Business Purpose:** Core production planning entity that drives manufacturing execution, resource allocation, and progress tracking through the shop floor

**Data Governance:**
- **Data Owner:** Production Planning Team
- **Update Frequency:** Real-time updates as work progresses through manufacturing operations
- **Data Retention:** Permanent retention for traceability and warranty support
- **Security Classification:** Internal - Production data with competitive sensitivity

**Compliance Notes:** Critical for traceability - changes must be logged for regulatory compliance (AS9100, ISO 9001)

**System Integrations:** ERP System, Production Scheduling, Quality Management, Material Management, Shop Floor Equipment

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

#### Turbine blade manufacturing work order

High-priority aerospace component with strict quality requirements

```json
{
  "workOrderNumber": "WO-2024-001234",
  "partNumber": "TB-A380-001",
  "quantity": 10,
  "priority": "HIGH",
  "status": "IN_PROGRESS"
}
```

**Common Queries:**
- Find all work orders for a specific part number
- Generate production status reports for customer delivery
- Track work order completion metrics by time period

**Related Tables:** WorkOrderOperation, Part, Material, QualityPlan, ProductionSchedule

**Constraints & Indexes:**

- **Primary Key:** id

---

### Routing

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### RoutingStep

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** routingId, stepNumber
- **Index:** routingId
- **Index:** operationId
- **Index:** workCenterId

---

### RoutingStepDependency

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** dependentStepId, prerequisiteStepId
- **Index:** dependentStepId
- **Index:** prerequisiteStepId

---

### RoutingStepParameter

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** routingStepId, parameterName
- **Index:** routingStepId

---

### RoutingTemplate

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** siteId
- **Index:** createdById
- **Index:** category
- **Index:** isFavorite

---

### WorkCenter

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** areaId

---

### WorkUnit

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workCenterId

---

### WorkOrderOperation

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### ProductionSchedule

**Fields (28):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| scheduleNumber | String | ✓ |  |  |  |
| scheduleName | String | ✓ |  |  |  |
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
**Relationships (3):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Site | site |  |  |
| one-to-many | ScheduleEntry | entries | ✓ |  |
| one-to-many | ScheduleStateHistory | stateHistory | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** siteId
- **Index:** state
- **Index:** periodStart
- **Index:** periodEnd

---

### ScheduleEntry

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** entryId
- **Index:** constraintType
- **Index:** isViolated
- **Index:** constraintDate

---

### ScheduleStateHistory

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** scheduleId
- **Index:** newState
- **Index:** transitionDate

---

### WorkOrderStatusHistory

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workOrderId
- **Index:** newStatus
- **Index:** transitionDate

---

### DispatchLog

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workOrderId
- **Index:** dispatchedAt
- **Index:** assignedToId
- **Index:** workCenterId

---

### WorkPerformance

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workOrderId
- **Index:** operationId
- **Index:** performanceType
- **Index:** recordedAt
- **Index:** personnelId

---

### ProductionVariance

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### QualityInspection

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### QualityMeasurement

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### NCR

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** capabilityType
- **Index:** capability

---

### EquipmentLog

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### EquipmentStateHistory

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** stateStartTime
- **Index:** newState

---

### EquipmentPerformanceLog

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** periodStart
- **Index:** periodType
- **Index:** oee

---

### Inventory

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### MaterialTransaction

**Fields (11):**

| Field | Type | Required | Default | Description | Business Impact |
|-------|------|----------|---------|-------------|------------------|
| id | String | ✓ | cuid( |  |  |
| inventoryId | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| transactionType | MaterialTransactionType | ✓ |  |  |  |
| quantity | Float | ✓ |  |  |  |
| unitOfMeasure | String | ✓ |  |  |  |
| reference | String |  |  |  |  |
| transactionDate | DateTime | ✓ | now( |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| inventory | Inventory | ✓ |  |  |  |
| workOrder | WorkOrder |  |  |  |  |
**Relationships (1):**

| Type | Related Model | Field | Required | Description |
|------|---------------|-------|----------|-------------|
| one-to-one | Inventory | inventory | ✓ |  |
**Constraints & Indexes:**

- **Primary Key:** id

---

### SerializedPart

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### PartGenealogy

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### WorkInstruction

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** status
- **Index:** partId
- **Index:** contentFormat
- **Index:** tags
- **Index:** categories

---

### WorkInstructionStep

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** workInstructionId, stepNumber
- **Index:** workInstructionId

---

### WorkInstructionExecution

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workOrderId
- **Index:** operatorId

---

### WorkInstructionStepExecution

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** executionId, stepNumber
- **Index:** executionId

---

### ElectronicSignature

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** userId
- **Index:** signedEntityType, signedEntityId
- **Index:** timestamp

---

### FAIReport

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** partId
- **Index:** status

---

### FAICharacteristic

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** faiReportId, characteristicNumber
- **Index:** faiReportId

---

### AuditLog

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### MaintenanceWorkOrder

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** externalWorkOrderNumber
- **Index:** equipmentId
- **Index:** status

---

### MeasurementEquipment

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** externalGaugeId
- **Index:** calibrationStatus
- **Index:** nextCalibrationDate

---

### InspectionRecord

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** serializedPartId
- **Index:** measurementEquipmentId
- **Index:** result

---

### CNCProgram

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** programName
- **Index:** partNumber
- **Index:** status
- **Index:** revision

---

### ProgramDownloadLog

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** programName
- **Index:** machineId
- **Index:** operatorBadgeNumber
- **Index:** downloadDate

---

### ProgramLoadAuthorization

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** authorizationId
- **Index:** operatorBadgeNumber
- **Index:** machineId
- **Index:** authorized
- **Index:** authorizationDate

---

### OperationGaugeRequirement

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** partNumber, operationCode, measurementEquipmentId
- **Index:** partNumber
- **Index:** operationCode

---

### Alert

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** alertType
- **Index:** severity
- **Index:** resolved
- **Index:** createdAt

---

### IntegrationConfig

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** name
- **Index:** type
- **Index:** enabled

---

### IntegrationLog

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configId
- **Index:** status
- **Index:** startedAt
- **Index:** operation

---

### ProductionScheduleRequest

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configId
- **Index:** status
- **Index:** externalWorkOrderId
- **Index:** requestedDate

---

### ProductionScheduleResponse

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** requestId
- **Index:** respondedAt

---

### ProductionPerformanceActual

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configId
- **Index:** transactionType
- **Index:** status
- **Index:** externalPartId
- **Index:** transactionDate

---

### PersonnelInfoExchange

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configId
- **Index:** actionType
- **Index:** status
- **Index:** externalPersonnelId
- **Index:** personnelId

---

### EquipmentDataCollection

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** equipmentId
- **Index:** dataCollectionType
- **Index:** collectionTimestamp
- **Index:** workOrderId
- **Index:** dataPointName

---

### EquipmentCommand

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** qifMeasurementPlanId
- **Index:** characteristicId
- **Index:** balloonNumber

---

### QIFMeasurementResult

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** qifMeasurementResultId
- **Index:** qifCharacteristicId
- **Index:** characteristicId
- **Index:** status

---

### SPCConfiguration

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### SPCRuleViolation

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** configurationId, timestamp
- **Index:** acknowledged

---

### SamplingPlan

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
**Constraints & Indexes:**

- **Primary Key:** id

---

### SamplingInspectionResult

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** planId, inspectionDate

---

### WorkInstructionMedia

**Description:** Work Instruction Media - Enhanced media library for work instructions

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentNumber
- **Index:** status
- **Index:** equipmentId
- **Index:** operationId
- **Index:** partId

---

### SetupStep

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** setupSheetId, stepNumber
- **Index:** setupSheetId

---

### SetupParameter

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** setupSheetId

---

### SetupTool

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** setupSheetId
- **Index:** toolId

---

### SetupExecution

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** setupSheetId
- **Index:** workOrderId

---

### InspectionPlan

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentNumber
- **Index:** status
- **Index:** partId
- **Index:** operationId
- **Index:** inspectionType

---

### InspectionCharacteristic

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** inspectionPlanId, characteristicNumber
- **Index:** inspectionPlanId

---

### InspectionStep

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** inspectionPlanId, stepNumber
- **Index:** inspectionPlanId

---

### InspectionExecution

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** inspectionPlanId
- **Index:** workOrderId
- **Index:** inspectedAt

---

### StandardOperatingProcedure

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentNumber
- **Index:** status
- **Index:** sopType
- **Index:** nextReviewDate

---

### SOPStep

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** sopId, stepNumber
- **Index:** sopId

---

### SOPAcknowledgment

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** sopId, userId
- **Index:** sopId
- **Index:** userId

---

### SOPAudit

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** sopId
- **Index:** auditDate

---

### ToolDrawing

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentNumber
- **Index:** status
- **Index:** toolType
- **Index:** vendorId
- **Index:** nextCalibrationDate

---

### ToolMaintenanceRecord

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** toolDrawingId
- **Index:** maintenanceDate

---

### ToolCalibrationRecord

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** toolDrawingId
- **Index:** calibrationDate

---

### ToolUsageLog

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** toolDrawingId
- **Index:** usedAt

---

### DocumentTemplate

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** documentType
- **Index:** isPublic
- **Index:** category

---

### UserWorkstationPreference

**Description:** User Workstation Preference - Manages user layout preferences for work instruction execution

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workflowType
- **Index:** isActive

---

### WorkflowStage

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** workflowId, stageNumber
- **Index:** workflowId

---

### WorkflowRule

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workflowId
- **Index:** priority

---

### WorkflowInstance

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** entityType, entityId
- **Index:** workflowId
- **Index:** status
- **Index:** deadline
- **Index:** createdById

---

### WorkflowStageInstance

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** workflowInstanceId, stageNumber
- **Index:** workflowInstanceId
- **Index:** status
- **Index:** deadline

---

### WorkflowAssignment

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** stageInstanceId
- **Index:** assignedToId
- **Index:** dueDate
- **Index:** action

---

### WorkflowHistory

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workflowInstanceId
- **Index:** eventType
- **Index:** occurredAt

---

### WorkflowDelegation

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** delegatorId
- **Index:** delegateeId
- **Index:** isActive

---

### WorkflowTemplate

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** workflowType
- **Index:** category
- **Index:** isActive

---

### WorkflowTask

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** assignedToId, status
- **Index:** dueDate
- **Index:** priority
- **Index:** workflowInstanceId

---

### WorkflowMetrics

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** periodStart, periodEnd
- **Index:** workflowType
- **Index:** userId

---

### WorkflowParallelCoordination

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Unique:** stageInstanceId, groupId
- **Index:** stageInstanceId
- **Index:** groupStatus

---

### EngineeringChangeOrder

**Description:** Engineering Change Order - Core ECO entity for formal change management

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

**Description:** User Notification - System notifications

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
| roleName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| isGlobal | Boolean | ✓ | true |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| createdBy | String |  |  |  |  |
| permissions | RolePermission[] | ✓ |  |  |  |
| userRoles | UserRole[] | ✓ |  |  |  |
| userSiteRoles | UserSiteRole[] | ✓ |  |  |  |
| templateInstance | RoleTemplateInstance |  |  |  |  |
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
| permissionName | String | ✓ |  |  |  |
| description | String |  |  |  |  |
| category | String |  |  |  |  |
| isActive | Boolean | ✓ | true |  |  |
| isWildcard | Boolean | ✓ | auto |  |  |
| createdAt | DateTime | ✓ | now( |  |  |
| updatedAt | DateTime | ✓ |  |  |  |
| roles | RolePermission[] | ✓ |  |  |  |
| templatePermissions | RoleTemplatePermission[] | ✓ |  |  |  |
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

**Description:** Junction table: User ↔ Role (many-to-many, global)
Assigns global roles to users that apply across all sites

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
| userId | String | ✓ |  |  |  |
| roleId | String | ✓ |  |  |  |
| siteId | String | ✓ |  |  |  |
| assignedAt | DateTime | ✓ | now( |  |  |
| assignedBy | String |  |  |  |  |
| expiresAt | DateTime |  |  |  |  |
| role | Role | ✓ |  |  |  |
| site | Site | ✓ |  |  |  |
| user | User | ✓ |  |  |  |
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
| siteId | String | ✓ |  |  |  |
| timeTrackingEnabled | Boolean | ✓ | true |  |  |
| trackingGranularity | TimeTrackingGranularity | ✓ | OPERATION |  |  |
| costingModel | CostingModel | ✓ | LABOR_HOURS |  |  |
| allowMultiTasking | Boolean | ✓ | auto |  |  |
| multiTaskingMode | MultiTaskingMode |  |  |  |  |
| autoSubtractBreaks | Boolean | ✓ | auto |  |  |
| standardBreakMinutes | Int |  |  |  |  |
| requireBreakClockOut | Boolean | ✓ | auto |  |  |
| overtimeThresholdHours | Float |  | 8 |  |  |
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
| userId | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| indirectCodeId | String |  |  |  |  |
| timeType | TimeType | ✓ |  |  |  |
| clockInTime | DateTime | ✓ |  |  |  |
| clockOutTime | DateTime |  |  |  |  |
| duration | Float |  |  |  |  |
| entrySource | TimeEntrySource | ✓ |  |  |  |
| deviceId | String |  |  |  |  |
| location | String |  |  |  |  |
| status | TimeEntryStatus | ✓ | ACTIVE |  |  |
| approvedBy | String |  |  |  |  |
| approvedAt | DateTime |  |  |  |  |
| rejectionReason | String |  |  |  |  |
| costCenter | String |  |  |  |  |
| laborRate | Float |  |  |  |  |
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
| equipmentId | String | ✓ |  |  |  |
| workOrderId | String |  |  |  |  |
| operationId | String |  |  |  |  |
| startTime | DateTime | ✓ |  |  |  |
| endTime | DateTime |  |  |  |  |
| duration | Float |  |  |  |  |
| entrySource | TimeEntrySource | ✓ |  |  |  |
| dataSource | String |  |  |  |  |
| cycleCount | Int |  |  |  |  |
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

**Description:** User Session Tracking
Comprehensive session monitoring for analytics and security

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
**Constraints & Indexes:**

- **Primary Key:** id
- **Index:** userId, startTime
- **Index:** sessionId
- **Index:** ip, startTime
- **Index:** lastActivity

---

### AuditReport

**Description:** Audit Report Management
Tracks generated compliance and security reports

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
| changeType | PermissionChangeType | ✓ |  |  |  |
| targetUserId | String | ✓ |  |  |  |
| targetRole | String |  |  |  |  |
| permission | String |  |  |  |  |
| oldValue | Json |  |  |  |  |
| newValue | Json |  |  |  |  |
| changedBy | String | ✓ |  |  |  |
| reason | String |  |  |  |  |
| timestamp | DateTime | ✓ | now( |  |  |
| siteId | String |  |  |  |  |
| changedByUser | User | ✓ |  |  |  |
| site | Site |  |  |  |  |
| targetUser | User | ✓ |  |  |  |
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
| Not Specified | Enterprise, Site, Area, PersonnelClass, PersonnelQualification, PersonnelCertification, PersonnelSkill, PersonnelSkillAssignment, PersonnelWorkCenterAssignment, PersonnelAvailability, MaterialClass, MaterialDefinition, MaterialProperty, MaterialLot, MaterialSublot, MaterialLotGenealogy, MaterialStateHistory, Operation, OperationParameter, ParameterLimits, ParameterGroup, ParameterFormula, OperationDependency, PersonnelOperationSpecification, EquipmentOperationSpecification, MaterialOperationSpecification, PhysicalAssetOperationSpecification, Part, PartSiteAvailability, BOMItem, ProductSpecification, ProductConfiguration, ConfigurationOption, ProductLifecycle, Routing, RoutingOperation, RoutingStep, RoutingStepDependency, RoutingStepParameter, RoutingTemplate, WorkCenter, WorkUnit, WorkOrderOperation, ProductionSchedule, ScheduleEntry, ScheduleConstraint, ScheduleStateHistory, WorkOrderStatusHistory, DispatchLog, WorkPerformance, ProductionVariance, QualityCharacteristic, QualityInspection, QualityMeasurement, NCR, EquipmentCapability, EquipmentLog, EquipmentStateHistory, EquipmentPerformanceLog, Inventory, MaterialTransaction, SerializedPart, PartGenealogy, WorkInstruction, WorkInstructionStep, WorkInstructionExecution, WorkInstructionStepExecution, ElectronicSignature, FAIReport, FAICharacteristic, AuditLog, MaintenanceWorkOrder, MeasurementEquipment, InspectionRecord, CNCProgram, ProgramDownloadLog, ProgramLoadAuthorization, OperationGaugeRequirement, Alert, IntegrationConfig, IntegrationLog, ProductionScheduleRequest, ProductionScheduleResponse, ProductionPerformanceActual, ERPMaterialTransaction, PersonnelInfoExchange, EquipmentDataCollection, EquipmentCommand, EquipmentMaterialMovement, ProcessDataCollection, QIFMeasurementPlan, QIFCharacteristic, QIFMeasurementResult, QIFMeasurement, SPCConfiguration, SPCRuleViolation, SamplingPlan, SamplingInspectionResult, WorkInstructionMedia, WorkInstructionRelation, ExportTemplate, DataCollectionFieldTemplate, SetupSheet, SetupStep, SetupParameter, SetupTool, SetupExecution, InspectionPlan, InspectionCharacteristic, InspectionStep, InspectionExecution, StandardOperatingProcedure, SOPStep, SOPAcknowledgment, SOPAudit, ToolDrawing, ToolMaintenanceRecord, ToolCalibrationRecord, ToolUsageLog, DocumentTemplate, UserWorkstationPreference, WorkstationDisplayConfig, WorkflowDefinition, WorkflowStage, WorkflowRule, WorkflowInstance, WorkflowStageInstance, WorkflowAssignment, WorkflowHistory, WorkflowDelegation, WorkflowTemplate, WorkflowTask, WorkflowMetrics, WorkflowParallelCoordination, EngineeringChangeOrder, ECOAffectedDocument, ECOTask, ECOAttachment, ECOHistory, ECOCRBReview, ECORelation, CRBConfiguration, DocumentComment, CommentReaction, DocumentAnnotation, ReviewAssignment, DocumentActivity, DocumentSubscription, UserNotification, DocumentEditSession, ConflictResolution, StoredFile, FileVersion, BackupSchedule, BackupHistory, BackupEntry, FileAccessLog, StorageMetrics, MultipartUpload, Role, Permission, RolePermission, UserRole, UserSiteRole, TimeTrackingConfiguration, LaborTimeEntry, MachineTimeEntry, IndirectCostCode, TimeEntryValidationRule, SsoProvider, SsoSession, AuthenticationEvent, HomeRealmDiscovery, PermissionUsageLog, SecurityEvent, UserSessionLog, AuditReport, PermissionChangeLog, RoleTemplate, RoleTemplatePermission, RoleTemplateInstance, RoleTemplateUsageLog | 182 |
| IT Security Team | User | 1 |
| Production Planning Team | WorkOrder | 1 |
| Quality Assurance Team | QualityPlan | 1 |
| Manufacturing Engineering Team | Equipment | 1 |


## Compliance and Security

### Compliance Requirements

| Table | Compliance Notes |
|-------|------------------|
| User | Contains PII - subject to data privacy regulations. Electronic signatures require 21 CFR Part 11 compliance |
| WorkOrder | Critical for traceability - changes must be logged for regulatory compliance (AS9100, ISO 9001) |
| QualityPlan | Critical for AS9100 and ISO 9001 compliance - must be approved and controlled |
| Equipment | Calibration records required for measurement equipment (ISO 17025). Maintenance logs for safety compliance |

### Privacy and PII Data

| Table | Field | Privacy Classification |
|-------|-------|------------------------|
| User | employeeNumber | Internal employee identifier - not PII but confidential |
| User | emergencyContact | PII - Personal emergency contact information |


## Integration Points

### External System Integrations

#### Active Directory

| Table | Description |
|-------|-------------|
| User | System users with authentication credentials and role-based access permissions |

#### Badge Access System

| Table | Description |
|-------|-------------|
| User | System users with authentication credentials and role-based access permissions |

#### Calibration System

| Table | Description |
|-------|-------------|
| Equipment | Manufacturing equipment and machinery used in production operations with capability and status tracking |

#### ERP System

| Table | Description |
|-------|-------------|
| WorkOrder | Production work orders defining specific manufacturing jobs with materials, operations, and quality requirements |

#### Electronic Signature System

| Table | Description |
|-------|-------------|
| User | System users with authentication credentials and role-based access permissions |

#### Engineering Change System

| Table | Description |
|-------|-------------|
| QualityPlan | Quality control plans defining inspection requirements, measurement criteria, and acceptance standards for manufacturing operations |

#### Equipment Controllers

| Table | Description |
|-------|-------------|
| Equipment | Manufacturing equipment and machinery used in production operations with capability and status tracking |

#### HR Management System

| Table | Description |
|-------|-------------|
| User | System users with authentication credentials and role-based access permissions |

#### Maintenance Management

| Table | Description |
|-------|-------------|
| Equipment | Manufacturing equipment and machinery used in production operations with capability and status tracking |

#### Material Management

| Table | Description |
|-------|-------------|
| WorkOrder | Production work orders defining specific manufacturing jobs with materials, operations, and quality requirements |

#### Measurement Equipment

| Table | Description |
|-------|-------------|
| QualityPlan | Quality control plans defining inspection requirements, measurement criteria, and acceptance standards for manufacturing operations |

#### Production Scheduling

| Table | Description |
|-------|-------------|
| WorkOrder | Production work orders defining specific manufacturing jobs with materials, operations, and quality requirements |
| Equipment | Manufacturing equipment and machinery used in production operations with capability and status tracking |

#### Quality Management

| Table | Description |
|-------|-------------|
| WorkOrder | Production work orders defining specific manufacturing jobs with materials, operations, and quality requirements |

#### Quality Management System

| Table | Description |
|-------|-------------|
| QualityPlan | Quality control plans defining inspection requirements, measurement criteria, and acceptance standards for manufacturing operations |

#### Shop Floor Equipment

| Table | Description |
|-------|-------------|
| WorkOrder | Production work orders defining specific manufacturing jobs with materials, operations, and quality requirements |

#### Work Instructions

| Table | Description |
|-------|-------------|
| QualityPlan | Quality control plans defining inspection requirements, measurement criteria, and acceptance standards for manufacturing operations |


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
