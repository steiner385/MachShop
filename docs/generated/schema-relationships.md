# Database Relationships

Generated: 10/30/2025, 1:18:22 PM

## Summary

- **Total Relationships:** 417
- **One-to-One:** 204
- **One-to-Many:** 213
- **Many-to-Many:** 0

## Detailed Relationships

| From Table | From Field | Relationship Type | To Table | Description |
|------------|------------|------------------|----------|-------------|
| Enterprise | sites | one-to-many | Site | Sites for Enterprise
Purpose: Supports General Operations operations by tracking sites
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Site | areas | one-to-many | Area | Areas for Site
Purpose: Supports Core Infrastructure operations by tracking areas
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Site | auditReports | one-to-many | AuditReport | Audit reports for Site
Purpose: Supports Core Infrastructure operations by tracking audit reports
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Site | indirectCostCodes | one-to-many | IndirectCostCode | Indirect cost codes for Site
Purpose: Supports Core Infrastructure operations by tracking indirect cost codes
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Site | partAvailability | one-to-many | PartSiteAvailability | Part availability for Site
Purpose: Supports Core Infrastructure operations by tracking part availability
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Site | permissionChangeLogs | one-to-many | PermissionChangeLog | Permission change logs for Site
Purpose: Supports Core Infrastructure operations by tracking permission change logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Site | permissionUsageLogs | one-to-many | PermissionUsageLog | Permission usage logs for Site
Purpose: Supports Core Infrastructure operations by tracking permission usage logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Site | productionSchedules | one-to-many | ProductionSchedule | Production schedules for Site
Purpose: Supports Core Infrastructure operations by tracking production schedules
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Site | routingTemplates | one-to-many | RoutingTemplate | Routing templates for Site
Purpose: Supports Core Infrastructure operations by tracking routing templates
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Site | enterprise | one-to-one | Enterprise | Enterprise for Site
Purpose: Supports Core Infrastructure operations by tracking enterprise
Category: Other
Examples: Example value |
| Site | timeTrackingConfiguration | one-to-one | TimeTrackingConfiguration | Time tracking configuration for Site
Purpose: Supports Core Infrastructure operations by tracking time tracking configuration
Category: Other
Examples: Example value |
| Site | userSiteRoles | one-to-many | UserSiteRole | User site roles for Site
Purpose: Supports Core Infrastructure operations by tracking user site roles
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Site | roleTemplateInstances | one-to-many | RoleTemplateInstance | Role template instances for Site
Purpose: Supports Core Infrastructure operations by tracking role template instances
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Site | roleTemplateUsageLogs | one-to-many | RoleTemplateUsageLog | Role template usage logs for Site
Purpose: Supports Core Infrastructure operations by tracking role template usage logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Area | site | one-to-one | Site | Site for Area
Purpose: Supports Core Infrastructure operations by tracking site
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Area | workCenters | one-to-many | WorkCenter | Work centers for Area
Purpose: Supports Core Infrastructure operations by tracking work centers
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | auditLogs | one-to-many | AuditLog | Audit logs for User
Purpose: Supports Personnel Management operations by tracking audit logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | generatedAuditReports | one-to-many | AuditReport | Generated audit reports for User
Purpose: Supports Personnel Management operations by tracking generated audit reports
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | instantiatedTemplates | one-to-many | RoleTemplateInstance | Instantiated templates for User
Purpose: Supports Personnel Management operations by tracking instantiated templates
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | templateUsageLogsAsPerformer | one-to-many | RoleTemplateUsageLog | Template usage logs as performer for User
Purpose: Supports Personnel Management operations by tracking template usage logs as performer
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | templateUsageLogsAsTarget | one-to-many | RoleTemplateUsageLog | Template usage logs as target for User
Purpose: Supports Personnel Management operations by tracking template usage logs as target
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | dispatchedWorkOrders | one-to-many | DispatchLog | Dispatched work orders for User
Purpose: Supports Personnel Management operations by tracking dispatched work orders
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | createdDocumentTemplates | one-to-many | DocumentTemplate | Created document templates for User
Purpose: Supports Personnel Management operations by tracking created document templates
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | updatedDocumentTemplates | one-to-many | DocumentTemplate | Updated document templates for User
Purpose: Supports Personnel Management operations by tracking updated document templates
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | inspectionExecutions | one-to-many | InspectionExecution | Quality inspection data
Purpose: Quality control and compliance
Category: Quality
Examples: PASS, FAIL
Constraints: NOT NULL |
| User | approvedInspectionPlans | one-to-many | InspectionPlan | Approved inspection plans for User
Purpose: Supports Personnel Management operations by tracking approved inspection plans
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | createdInspectionPlans | one-to-many | InspectionPlan | Created inspection plans for User
Purpose: Supports Personnel Management operations by tracking created inspection plans
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | updatedInspectionPlans | one-to-many | InspectionPlan | Updated inspection plans for User
Purpose: Supports Personnel Management operations by tracking updated inspection plans
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | laborTimeEntries | one-to-many | LaborTimeEntry | Labor time entries for User
Purpose: Supports Personnel Management operations by tracking labor time entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | permissionChangesChanger | one-to-many | PermissionChangeLog | Permission changes changer for User
Purpose: Supports Personnel Management operations by tracking permission changes changer
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | permissionChangesTarget | one-to-many | PermissionChangeLog | Permission changes target for User
Purpose: Supports Personnel Management operations by tracking permission changes target
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | permissionUsageLogs | one-to-many | PermissionUsageLog | Permission usage logs for User
Purpose: Supports Personnel Management operations by tracking permission usage logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | availability | one-to-many | PersonnelAvailability | Availability for User
Purpose: Supports Personnel Management operations by tracking availability
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | certifications | one-to-many | PersonnelCertification | Certifications for User
Purpose: Supports Personnel Management operations by tracking certifications
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | skills | one-to-many | PersonnelSkillAssignment | Skills for User
Purpose: Supports Personnel Management operations by tracking skills
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | workCenterAssignments | one-to-many | PersonnelWorkCenterAssignment | Work center assignments for User
Purpose: Supports Personnel Management operations by tracking work center assignments
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | routingTemplates | one-to-many | RoutingTemplate | Routing templates for User
Purpose: Supports Personnel Management operations by tracking routing templates
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | completedSetupExecutions | one-to-many | SetupExecution | Completed setup executions for User
Purpose: Supports Personnel Management operations by tracking completed setup executions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | startedSetupExecutions | one-to-many | SetupExecution | Started setup executions for User
Purpose: Supports Personnel Management operations by tracking started setup executions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | approvedSetupSheets | one-to-many | SetupSheet | Approved setup sheets for User
Purpose: Supports Personnel Management operations by tracking approved setup sheets
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | createdSetupSheets | one-to-many | SetupSheet | Created setup sheets for User
Purpose: Supports Personnel Management operations by tracking created setup sheets
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | updatedSetupSheets | one-to-many | SetupSheet | Updated setup sheets for User
Purpose: Supports Personnel Management operations by tracking updated setup sheets
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | sopAcknowledgments | one-to-many | SOPAcknowledgment | Sop acknowledgments for User
Purpose: Supports Personnel Management operations by tracking sop acknowledgments
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | sopAudits | one-to-many | SOPAudit | Sop audits for User
Purpose: Supports Personnel Management operations by tracking sop audits
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | ssoSessions | one-to-many | SsoSession | Sso sessions for User
Purpose: Supports Personnel Management operations by tracking sso sessions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | approvedSOPs | one-to-many | StandardOperatingProcedure | Approved s o ps for User
Purpose: Supports Personnel Management operations by tracking approved s o ps
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | createdSOPs | one-to-many | StandardOperatingProcedure | Created s o ps for User
Purpose: Supports Personnel Management operations by tracking created s o ps
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | updatedSOPs | one-to-many | StandardOperatingProcedure | Updated s o ps for User
Purpose: Supports Personnel Management operations by tracking updated s o ps
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | toolCalibrationRecords | one-to-many | ToolCalibrationRecord | Tool calibration records for User
Purpose: Supports Personnel Management operations by tracking tool calibration records
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | approvedToolDrawings | one-to-many | ToolDrawing | Approved tool drawings for User
Purpose: Supports Personnel Management operations by tracking approved tool drawings
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | createdToolDrawings | one-to-many | ToolDrawing | Created tool drawings for User
Purpose: Supports Personnel Management operations by tracking created tool drawings
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | updatedToolDrawings | one-to-many | ToolDrawing | Updated tool drawings for User
Purpose: Supports Personnel Management operations by tracking updated tool drawings
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | toolMaintenanceRecords | one-to-many | ToolMaintenanceRecord | Tool maintenance records for User
Purpose: Supports Personnel Management operations by tracking tool maintenance records
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | toolUsageLogs | one-to-many | ToolUsageLog | Tool usage logs for User
Purpose: Supports Personnel Management operations by tracking tool usage logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | userRoles | one-to-many | UserRole | User roles for User
Purpose: Supports Personnel Management operations by tracking user roles
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | userSessionLogs | one-to-many | UserSessionLog | User session logs for User
Purpose: Supports Personnel Management operations by tracking user session logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | userSiteRoles | one-to-many | UserSiteRole | User site roles for User
Purpose: Supports Personnel Management operations by tracking user site roles
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | personnelClass | one-to-one | PersonnelClass | Personnel class for User
Purpose: Supports Personnel Management operations by tracking personnel class
Category: Other
Examples: Example value |
| User | supervisor | one-to-one | User | Supervisor for User
Purpose: Supports Personnel Management operations by tracking supervisor
Category: Other
Examples: Example value |
| User | subordinates | one-to-many | User | Subordinates for User
Purpose: Supports Personnel Management operations by tracking subordinates
Category: Other
Examples: Example value
Constraints: NOT NULL |
| User | signedStepExecutions | one-to-many | WorkInstructionStepExecution | Signed step executions for User
Purpose: Supports Personnel Management operations by tracking signed step executions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelClass | parentClass | one-to-one | PersonnelClass | Parent class for PersonnelClass
Purpose: Supports Personnel Management operations by tracking parent class
Category: Other
Examples: Example value |
| PersonnelClass | childClasses | one-to-many | PersonnelClass | Child classes for PersonnelClass
Purpose: Supports Personnel Management operations by tracking child classes
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelClass | qualifications | one-to-many | PersonnelQualification | Qualifications for PersonnelClass
Purpose: Supports Personnel Management operations by tracking qualifications
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelClass | personnel | one-to-many | User | Personnel for PersonnelClass
Purpose: Supports Personnel Management operations by tracking personnel
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelQualification | certifications | one-to-many | PersonnelCertification | Certifications for PersonnelQualification
Purpose: Supports Personnel Management operations by tracking certifications
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelQualification | personnelClass | one-to-one | PersonnelClass | Personnel class for PersonnelQualification
Purpose: Supports Personnel Management operations by tracking personnel class
Category: Other
Examples: Example value |
| PersonnelCertification | personnel | one-to-one | User | Personnel for PersonnelCertification
Purpose: Supports Personnel Management operations by tracking personnel
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelCertification | qualification | one-to-one | PersonnelQualification | Qualification for PersonnelCertification
Purpose: Supports Personnel Management operations by tracking qualification
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelSkill | skillAssignments | one-to-many | PersonnelSkillAssignment | Skill assignments for PersonnelSkill
Purpose: Supports Personnel Management operations by tracking skill assignments
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelSkillAssignment | personnel | one-to-one | User | Personnel for PersonnelSkillAssignment
Purpose: Supports Personnel Management operations by tracking personnel
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelSkillAssignment | skill | one-to-one | PersonnelSkill | Skill for PersonnelSkillAssignment
Purpose: Supports Personnel Management operations by tracking skill
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelWorkCenterAssignment | personnel | one-to-one | User | Personnel for PersonnelWorkCenterAssignment
Purpose: Supports Personnel Management operations by tracking personnel
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelWorkCenterAssignment | workCenter | one-to-one | WorkCenter | Work center for PersonnelWorkCenterAssignment
Purpose: Supports Personnel Management operations by tracking work center
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PersonnelAvailability | personnel | one-to-one | User | Personnel for PersonnelAvailability
Purpose: Supports Personnel Management operations by tracking personnel
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MaterialClass | parentClass | one-to-one | MaterialClass | Parent class for MaterialClass
Purpose: Supports Material Management operations by tracking parent class
Category: Other
Examples: Example value |
| MaterialClass | childClasses | one-to-many | MaterialClass | Child classes for MaterialClass
Purpose: Supports Material Management operations by tracking child classes
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MaterialClass | materials | one-to-many | MaterialDefinition | Materials for MaterialClass
Purpose: Supports Material Management operations by tracking materials
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MaterialDefinition | materialClass | one-to-one | MaterialClass | Material class for MaterialDefinition
Purpose: Supports Material Management operations by tracking material class
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MaterialDefinition | replacementMaterial | one-to-one | MaterialDefinition | Replacement material for MaterialDefinition
Purpose: Supports Material Management operations by tracking replacement material
Category: Other
Examples: Example value |
| MaterialDefinition | replacedMaterials | one-to-many | MaterialDefinition | Replaced materials for MaterialDefinition
Purpose: Supports Material Management operations by tracking replaced materials
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MaterialProperty | material | one-to-one | MaterialDefinition | Material for MaterialProperty
Purpose: Supports Material Management operations by tracking material
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MaterialLot | genealogyAsChild | one-to-many | MaterialLotGenealogy | Genealogy as child for MaterialLot
Purpose: Supports Material Management operations by tracking genealogy as child
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MaterialLot | genealogyAsParent | one-to-many | MaterialLotGenealogy | Genealogy as parent for MaterialLot
Purpose: Supports Material Management operations by tracking genealogy as parent
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MaterialLot | material | one-to-one | MaterialDefinition | Material for MaterialLot
Purpose: Supports Material Management operations by tracking material
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MaterialLot | stateHistory | one-to-many | MaterialStateHistory | State history for MaterialLot
Purpose: Supports Material Management operations by tracking state history
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MaterialLot | sublots | one-to-many | MaterialSublot | Sublots for MaterialLot
Purpose: Supports Material Management operations by tracking sublots
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Operation | bomItems | one-to-many | BOMItem | Bom items for Operation
Purpose: Supports General Operations operations by tracking bom items
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Operation | equipmentSpecs | one-to-many | EquipmentOperationSpecification | Equipment specs for Operation
Purpose: Supports General Operations operations by tracking equipment specs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Operation | materialSpecs | one-to-many | MaterialOperationSpecification | Material specs for Operation
Purpose: Supports General Operations operations by tracking material specs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Operation | dependencies | one-to-many | OperationDependency | Dependencies for Operation
Purpose: Supports General Operations operations by tracking dependencies
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Operation | prerequisiteFor | one-to-many | OperationDependency | Prerequisite for for Operation
Purpose: Supports General Operations operations by tracking prerequisite for
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Operation | parameters | one-to-many | OperationParameter | Parameters for Operation
Purpose: Supports General Operations operations by tracking parameters
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Operation | site | one-to-one | Site | Site for Operation
Purpose: Supports General Operations operations by tracking site
Category: Other
Examples: Example value |
| Operation | personnelSpecs | one-to-many | PersonnelOperationSpecification | Personnel specs for Operation
Purpose: Supports General Operations operations by tracking personnel specs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Operation | assetSpecs | one-to-many | PhysicalAssetOperationSpecification | Asset specs for Operation
Purpose: Supports General Operations operations by tracking asset specs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Operation | routingSteps | one-to-many | RoutingStep | Routing steps for Operation
Purpose: Supports General Operations operations by tracking routing steps
Category: Other
Examples: Example value
Constraints: NOT NULL |
| OperationParameter | formula | one-to-one | ParameterFormula | Formula for OperationParameter
Purpose: Supports General Operations operations by tracking formula
Category: Other
Examples: Example value |
| OperationParameter | limits | one-to-one | ParameterLimits | Limits for OperationParameter
Purpose: Supports General Operations operations by tracking limits
Category: Other
Examples: Example value |
| OperationParameter | spcConfiguration | one-to-one | SPCConfiguration | Spc configuration for OperationParameter
Purpose: Supports General Operations operations by tracking spc configuration
Category: Other
Examples: Example value |
| ParameterLimits | parameter | one-to-one | OperationParameter | Parameter for ParameterLimits
Purpose: Supports General Operations operations by tracking parameter
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ParameterGroup | parameters | one-to-many | OperationParameter | Parameters for ParameterGroup
Purpose: Supports General Operations operations by tracking parameters
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ParameterFormula | outputParameter | one-to-one | OperationParameter | Output parameter for ParameterFormula
Purpose: Supports General Operations operations by tracking output parameter
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | componentItems | one-to-many | BOMItem | Component items for Part
Purpose: Supports General Operations operations by tracking component items
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | bomItems | one-to-many | BOMItem | Bom items for Part
Purpose: Supports General Operations operations by tracking bom items
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | equipmentMaterialMovements | one-to-many | EquipmentMaterialMovement | Equipment material movements for Part
Purpose: Supports General Operations operations by tracking equipment material movements
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | erpMaterialTransactions | one-to-many | ERPMaterialTransaction | Erp material transactions for Part
Purpose: Supports General Operations operations by tracking erp material transactions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | inventoryItems | one-to-many | Inventory | Inventory items for Part
Purpose: Supports General Operations operations by tracking inventory items
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | siteAvailability | one-to-many | PartSiteAvailability | Site availability for Part
Purpose: Supports General Operations operations by tracking site availability
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | replacementPart | one-to-one | Part | Replacement part for Part
Purpose: Supports General Operations operations by tracking replacement part
Category: Other
Examples: Example value |
| Part | replacedParts | one-to-many | Part | Replaced parts for Part
Purpose: Supports General Operations operations by tracking replaced parts
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | configurations | one-to-many | ProductConfiguration | Configurations for Part
Purpose: Supports General Operations operations by tracking configurations
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | specifications | one-to-many | ProductSpecification | Technical specification
Purpose: Quality standards and requirements
Category: Quality
Examples: AMS4911 Standard
Constraints: NOT NULL |
| Part | productionScheduleRequests | one-to-many | ProductionScheduleRequest | Production schedule requests for Part
Purpose: Supports General Operations operations by tracking production schedule requests
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | qualityPlans | one-to-many | QualityPlan | Quality plans for Part
Purpose: Supports General Operations operations by tracking quality plans
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | scheduleEntries | one-to-many | ScheduleEntry | Schedule entries for Part
Purpose: Supports General Operations operations by tracking schedule entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Part | serializedParts | one-to-many | SerializedPart | Serialized parts for Part
Purpose: Supports General Operations operations by tracking serialized parts
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PartSiteAvailability | part | one-to-one | Part | Part for PartSiteAvailability
Purpose: Supports Core Infrastructure operations by tracking part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PartSiteAvailability | site | one-to-one | Site | Site for PartSiteAvailability
Purpose: Supports Core Infrastructure operations by tracking site
Category: Other
Examples: Example value
Constraints: NOT NULL |
| BOMItem | componentPart | one-to-one | Part | Component part for BOMItem
Purpose: Supports General Operations operations by tracking component part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| BOMItem | parentPart | one-to-one | Part | Parent part for BOMItem
Purpose: Supports General Operations operations by tracking parent part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ProductSpecification | part | one-to-one | Part | Part for ProductSpecification
Purpose: Supports General Operations operations by tracking part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ProductConfiguration | options | one-to-many | ConfigurationOption | Options for ProductConfiguration
Purpose: Supports General Operations operations by tracking options
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ProductConfiguration | part | one-to-one | Part | Part for ProductConfiguration
Purpose: Supports General Operations operations by tracking part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ConfigurationOption | configuration | one-to-one | ProductConfiguration | Configuration for ConfigurationOption
Purpose: Supports General Operations operations by tracking configuration
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ProductLifecycle | part | one-to-one | Part | Part for ProductLifecycle
Purpose: Supports General Operations operations by tracking part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | dispatchLogs | one-to-many | DispatchLog | Dispatch logs for WorkOrder
Purpose: Supports Production Management operations by tracking dispatch logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | equipmentCommands | one-to-many | EquipmentCommand | Equipment commands for WorkOrder
Purpose: Supports Production Management operations by tracking equipment commands
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | equipmentDataCollections | one-to-many | EquipmentDataCollection | Equipment data collections for WorkOrder
Purpose: Supports Production Management operations by tracking equipment data collections
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | equipmentMaterialMovements | one-to-many | EquipmentMaterialMovement | Equipment material movements for WorkOrder
Purpose: Supports Production Management operations by tracking equipment material movements
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | erpMaterialTransactions | one-to-many | ERPMaterialTransaction | Erp material transactions for WorkOrder
Purpose: Supports Production Management operations by tracking erp material transactions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | laborTimeEntries | one-to-many | LaborTimeEntry | Labor time entries for WorkOrder
Purpose: Supports Production Management operations by tracking labor time entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | machineTimeEntries | one-to-many | MachineTimeEntry | Machine time entries for WorkOrder
Purpose: Supports Production Management operations by tracking machine time entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | processDataCollections | one-to-many | ProcessDataCollection | Process data collections for WorkOrder
Purpose: Supports Production Management operations by tracking process data collections
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | productionPerformanceActuals | one-to-many | ProductionPerformanceActual | Production performance actuals for WorkOrder
Purpose: Supports Production Management operations by tracking production performance actuals
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | productionScheduleRequests | one-to-many | ProductionScheduleRequest | Production schedule requests for WorkOrder
Purpose: Supports Production Management operations by tracking production schedule requests
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | variances | one-to-many | ProductionVariance | Variances for WorkOrder
Purpose: Supports Production Management operations by tracking variances
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | qifMeasurementPlans | one-to-many | QIFMeasurementPlan | Qif measurement plans for WorkOrder
Purpose: Supports Production Management operations by tracking qif measurement plans
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | qifMeasurementResults | one-to-many | QIFMeasurementResult | Qif measurement results for WorkOrder
Purpose: Supports Production Management operations by tracking qif measurement results
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | scheduleEntry | one-to-one | ScheduleEntry | Schedule entry for WorkOrder
Purpose: Supports Production Management operations by tracking schedule entry
Category: Other
Examples: Example value |
| WorkOrder | statusHistory | one-to-many | WorkOrderStatusHistory | Status history for WorkOrder
Purpose: Supports Production Management operations by tracking status history
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | assignedTo | one-to-one | User | Assigned to for WorkOrder
Purpose: Supports Production Management operations by tracking assigned to
Category: Other
Examples: Example value |
| WorkOrder | createdBy | one-to-one | User | Created by for WorkOrder
Purpose: Supports Production Management operations by tracking created by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | part | one-to-one | Part | Part for WorkOrder
Purpose: Supports Production Management operations by tracking part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrder | site | one-to-one | Site | Site for WorkOrder
Purpose: Supports Production Management operations by tracking site
Category: Other
Examples: Example value |
| Routing | operations | one-to-many | RoutingOperation | Operations for Routing
Purpose: Supports General Operations operations by tracking operations
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Routing | steps | one-to-many | RoutingStep | Steps for Routing
Purpose: Supports General Operations operations by tracking steps
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Routing | templateSources | one-to-many | RoutingTemplate | Template sources for Routing
Purpose: Supports General Operations operations by tracking template sources
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Routing | part | one-to-one | Part | Part for Routing
Purpose: Supports General Operations operations by tracking part
Category: Other
Examples: Example value |
| Routing | site | one-to-one | Site | Site for Routing
Purpose: Supports General Operations operations by tracking site
Category: Other
Examples: Example value |
| Routing | scheduleEntries | one-to-many | ScheduleEntry | Schedule entries for Routing
Purpose: Supports General Operations operations by tracking schedule entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoutingOperation | workCenter | one-to-one | WorkCenter | Work center for RoutingOperation
Purpose: Supports General Operations operations by tracking work center
Category: Other
Examples: Example value |
| RoutingStep | dependencies | one-to-many | RoutingStepDependency | Dependencies for RoutingStep
Purpose: Supports General Operations operations by tracking dependencies
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoutingStep | prerequisites | one-to-many | RoutingStepDependency | Prerequisites for RoutingStep
Purpose: Supports General Operations operations by tracking prerequisites
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoutingStep | parameterOverrides | one-to-many | RoutingStepParameter | Parameter overrides for RoutingStep
Purpose: Supports General Operations operations by tracking parameter overrides
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoutingStep | workCenter | one-to-one | WorkCenter | Work center for RoutingStep
Purpose: Supports General Operations operations by tracking work center
Category: Other
Examples: Example value |
| RoutingStepDependency | dependentStep | one-to-one | RoutingStep | Dependent step for RoutingStepDependency
Purpose: Supports General Operations operations by tracking dependent step
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoutingStepDependency | prerequisiteStep | one-to-one | RoutingStep | Prerequisite step for RoutingStepDependency
Purpose: Supports General Operations operations by tracking prerequisite step
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoutingStepParameter | routingStep | one-to-one | RoutingStep | Routing step for RoutingStepParameter
Purpose: Supports General Operations operations by tracking routing step
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoutingTemplate | createdBy | one-to-one | User | Created by for RoutingTemplate
Purpose: Supports General Operations operations by tracking created by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoutingTemplate | site | one-to-one | Site | Site for RoutingTemplate
Purpose: Supports General Operations operations by tracking site
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkCenter | dispatchLogs | one-to-many | DispatchLog | Dispatch logs for WorkCenter
Purpose: Supports General Operations operations by tracking dispatch logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkCenter | personnelAssignments | one-to-many | PersonnelWorkCenterAssignment | Personnel assignments for WorkCenter
Purpose: Supports General Operations operations by tracking personnel assignments
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkCenter | operations | one-to-many | RoutingOperation | Operations for WorkCenter
Purpose: Supports General Operations operations by tracking operations
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkCenter | routingSteps | one-to-many | RoutingStep | Routing steps for WorkCenter
Purpose: Supports General Operations operations by tracking routing steps
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkCenter | scheduleEntries | one-to-many | ScheduleEntry | Schedule entries for WorkCenter
Purpose: Supports General Operations operations by tracking schedule entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkCenter | area | one-to-one | Area | Area for WorkCenter
Purpose: Supports General Operations operations by tracking area
Category: Other
Examples: Example value |
| WorkCenter | workUnits | one-to-many | WorkUnit | Work units for WorkCenter
Purpose: Supports General Operations operations by tracking work units
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkUnit | workCenter | one-to-one | WorkCenter | Work center for WorkUnit
Purpose: Supports General Operations operations by tracking work center
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrderOperation | laborTimeEntries | one-to-many | LaborTimeEntry | Labor time entries for WorkOrderOperation
Purpose: Supports Production Management operations by tracking labor time entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrderOperation | machineTimeEntries | one-to-many | MachineTimeEntry | Machine time entries for WorkOrderOperation
Purpose: Supports Production Management operations by tracking machine time entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrderOperation | variances | one-to-many | ProductionVariance | Variances for WorkOrderOperation
Purpose: Supports Production Management operations by tracking variances
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrderOperation | routingOperation | one-to-one | RoutingOperation | Routing operation for WorkOrderOperation
Purpose: Supports Production Management operations by tracking routing operation
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkOrderOperation | RoutingStep | one-to-one | RoutingStep | Routing step for WorkOrderOperation
Purpose: Supports Production Management operations by tracking routing step
Category: Other
Examples: Example value |
| ProductionSchedule | site | one-to-one | Site | Site for ProductionSchedule
Purpose: Supports General Operations operations by tracking site
Category: Other
Examples: Example value |
| ProductionSchedule | entries | one-to-many | ScheduleEntry | Entries for ProductionSchedule
Purpose: Supports General Operations operations by tracking entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ProductionSchedule | stateHistory | one-to-many | ScheduleStateHistory | State history for ProductionSchedule
Purpose: Supports General Operations operations by tracking state history
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ScheduleEntry | constraints | one-to-many | ScheduleConstraint | Constraints for ScheduleEntry
Purpose: Supports General Operations operations by tracking constraints
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ScheduleEntry | part | one-to-one | Part | Part for ScheduleEntry
Purpose: Supports General Operations operations by tracking part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ScheduleEntry | schedule | one-to-one | ProductionSchedule | Schedule for ScheduleEntry
Purpose: Supports General Operations operations by tracking schedule
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ScheduleEntry | workCenter | one-to-one | WorkCenter | Work center for ScheduleEntry
Purpose: Supports General Operations operations by tracking work center
Category: Other
Examples: Example value |
| ScheduleConstraint | entry | one-to-one | ScheduleEntry | Entry for ScheduleConstraint
Purpose: Supports General Operations operations by tracking entry
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ScheduleStateHistory | schedule | one-to-one | ProductionSchedule | Schedule for ScheduleStateHistory
Purpose: Supports General Operations operations by tracking schedule
Category: Other
Examples: Example value
Constraints: NOT NULL |
| DispatchLog | assignedTo | one-to-one | User | Assigned to for DispatchLog
Purpose: Supports General Operations operations by tracking assigned to
Category: Other
Examples: Example value |
| DispatchLog | workCenter | one-to-one | WorkCenter | Work center for DispatchLog
Purpose: Supports General Operations operations by tracking work center
Category: Other
Examples: Example value |
| WorkPerformance | personnel | one-to-one | User | Personnel for WorkPerformance
Purpose: Supports General Operations operations by tracking personnel
Category: Other
Examples: Example value |
| QualityPlan | characteristics | one-to-many | QualityCharacteristic | Characteristics for QualityPlan
Purpose: Supports Quality Management operations by tracking characteristics
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QualityPlan | part | one-to-one | Part | Part for QualityPlan
Purpose: Supports Quality Management operations by tracking part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QualityCharacteristic | plan | one-to-one | QualityPlan | Plan for QualityCharacteristic
Purpose: Supports Quality Management operations by tracking plan
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QualityCharacteristic | measurements | one-to-many | QualityMeasurement | Measurements for QualityCharacteristic
Purpose: Supports Quality Management operations by tracking measurements
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QualityInspection | inspector | one-to-one | User | Inspector for QualityInspection
Purpose: Supports Quality Management operations by tracking inspector
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QualityInspection | plan | one-to-one | QualityPlan | Plan for QualityInspection
Purpose: Supports Quality Management operations by tracking plan
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QualityInspection | measurements | one-to-many | QualityMeasurement | Measurements for QualityInspection
Purpose: Supports Quality Management operations by tracking measurements
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QualityMeasurement | characteristic | one-to-one | QualityCharacteristic | Characteristic for QualityMeasurement
Purpose: Supports Quality Management operations by tracking characteristic
Category: Other
Examples: Example value
Constraints: NOT NULL |
| NCR | assignedTo | one-to-one | User | Assigned to for NCR
Purpose: Supports General Operations operations by tracking assigned to
Category: Other
Examples: Example value |
| NCR | createdBy | one-to-one | User | Created by for NCR
Purpose: Supports General Operations operations by tracking created by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| NCR | site | one-to-one | Site | Site for NCR
Purpose: Supports General Operations operations by tracking site
Category: Other
Examples: Example value |
| Equipment | area | one-to-one | Area | Area for Equipment
Purpose: Supports Equipment Management operations by tracking area
Category: Other
Examples: Example value |
| Equipment | site | one-to-one | Site | Site for Equipment
Purpose: Supports Equipment Management operations by tracking site
Category: Other
Examples: Example value |
| Equipment | workCenter | one-to-one | WorkCenter | Work center for Equipment
Purpose: Supports Equipment Management operations by tracking work center
Category: Other
Examples: Example value |
| Equipment | workUnit | one-to-one | WorkUnit | Work unit for Equipment
Purpose: Supports Equipment Management operations by tracking work unit
Category: Other
Examples: Example value |
| Equipment | capabilities | one-to-many | EquipmentCapability | Capabilities for Equipment
Purpose: Supports Equipment Management operations by tracking capabilities
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Equipment | equipmentCommands | one-to-many | EquipmentCommand | Equipment commands for Equipment
Purpose: Supports Equipment Management operations by tracking equipment commands
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Equipment | equipmentDataCollections | one-to-many | EquipmentDataCollection | Equipment data collections for Equipment
Purpose: Supports Equipment Management operations by tracking equipment data collections
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Equipment | equipmentMaterialMovements | one-to-many | EquipmentMaterialMovement | Equipment material movements for Equipment
Purpose: Supports Equipment Management operations by tracking equipment material movements
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Equipment | performanceData | one-to-many | EquipmentPerformanceLog | Performance data for Equipment
Purpose: Supports Equipment Management operations by tracking performance data
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Equipment | stateHistory | one-to-many | EquipmentStateHistory | State history for Equipment
Purpose: Supports Equipment Management operations by tracking state history
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Equipment | machineTimeEntries | one-to-many | MachineTimeEntry | Machine time entries for Equipment
Purpose: Supports Equipment Management operations by tracking machine time entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Equipment | maintenanceWorkOrders | one-to-many | MaintenanceWorkOrder | Maintenance work orders for Equipment
Purpose: Supports Equipment Management operations by tracking maintenance work orders
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Equipment | processDataCollections | one-to-many | ProcessDataCollection | Process data collections for Equipment
Purpose: Supports Equipment Management operations by tracking process data collections
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Equipment | productionScheduleRequests | one-to-many | ProductionScheduleRequest | Production schedule requests for Equipment
Purpose: Supports Equipment Management operations by tracking production schedule requests
Category: Other
Examples: Example value
Constraints: NOT NULL |
| EquipmentLog | user | one-to-one | User | User for EquipmentLog
Purpose: Supports Equipment Management operations by tracking user
Category: Other
Examples: Example value |
| Inventory | part | one-to-one | Part | Part for Inventory
Purpose: Supports Material Management operations by tracking part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MaterialTransaction | inventory | one-to-one | Inventory | Inventory for MaterialTransaction
Purpose: Supports Material Management operations by tracking inventory
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SerializedPart | inspectionRecords | one-to-many | InspectionRecord | Quality inspection data
Purpose: Quality control and compliance
Category: Quality
Examples: PASS, FAIL
Constraints: NOT NULL |
| SerializedPart | components | one-to-many | PartGenealogy | Components for SerializedPart
Purpose: Supports General Operations operations by tracking components
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SerializedPart | genealogy | one-to-many | PartGenealogy | Genealogy for SerializedPart
Purpose: Supports General Operations operations by tracking genealogy
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SerializedPart | qifMeasurementResults | one-to-many | QIFMeasurementResult | Qif measurement results for SerializedPart
Purpose: Supports General Operations operations by tracking qif measurement results
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SerializedPart | part | one-to-one | Part | Part for SerializedPart
Purpose: Supports General Operations operations by tracking part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PartGenealogy | componentPart | one-to-one | SerializedPart | Component part for PartGenealogy
Purpose: Supports General Operations operations by tracking component part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PartGenealogy | parentPart | one-to-one | SerializedPart | Parent part for PartGenealogy
Purpose: Supports General Operations operations by tracking parent part
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkInstruction | routingStepOverrides | one-to-many | RoutingStep | Routing step overrides for WorkInstruction
Purpose: Supports Document Management operations by tracking routing step overrides
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkInstruction | mediaLibraryItems | one-to-many | WorkInstructionMedia | Media library items for WorkInstruction
Purpose: Supports Document Management operations by tracking media library items
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkInstruction | relatedDocuments | one-to-many | WorkInstructionRelation | Related documents for WorkInstruction
Purpose: Supports Document Management operations by tracking related documents
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkInstruction | steps | one-to-many | WorkInstructionStep | Steps for WorkInstruction
Purpose: Supports Document Management operations by tracking steps
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkInstruction | approvedBy | one-to-one | User | Approved by for WorkInstruction
Purpose: Supports Document Management operations by tracking approved by
Category: Other
Examples: Example value |
| WorkInstruction | createdBy | one-to-one | User | Created by for WorkInstruction
Purpose: Supports Document Management operations by tracking created by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkInstruction | updatedBy | one-to-one | User | Updated by for WorkInstruction
Purpose: Supports Document Management operations by tracking updated by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkInstructionExecution | operator | one-to-one | User | Operator for WorkInstructionExecution
Purpose: Supports Document Management operations by tracking operator
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkInstructionExecution | stepExecutions | one-to-many | WorkInstructionStepExecution | Step executions for WorkInstructionExecution
Purpose: Supports Document Management operations by tracking step executions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkInstructionStepExecution | signedBy | one-to-one | User | Signed by for WorkInstructionStepExecution
Purpose: Supports Document Management operations by tracking signed by
Category: Other
Examples: Example value |
| ElectronicSignature | invalidatedBy | one-to-one | User | Invalidated by for ElectronicSignature
Purpose: Supports General Operations operations by tracking invalidated by
Category: Other
Examples: Example value |
| ElectronicSignature | user | one-to-one | User | User for ElectronicSignature
Purpose: Supports General Operations operations by tracking user
Category: Other
Examples: Example value
Constraints: NOT NULL |
| FAIReport | characteristics | one-to-many | FAICharacteristic | Characteristics for FAIReport
Purpose: Supports General Operations operations by tracking characteristics
Category: Other
Examples: Example value
Constraints: NOT NULL |
| FAIReport | qifMeasurementPlans | one-to-many | QIFMeasurementPlan | Qif measurement plans for FAIReport
Purpose: Supports General Operations operations by tracking qif measurement plans
Category: Other
Examples: Example value
Constraints: NOT NULL |
| FAIReport | qifMeasurementResults | one-to-many | QIFMeasurementResult | Qif measurement results for FAIReport
Purpose: Supports General Operations operations by tracking qif measurement results
Category: Other
Examples: Example value
Constraints: NOT NULL |
| FAICharacteristic | faiReport | one-to-one | FAIReport | Fai report for FAICharacteristic
Purpose: Supports General Operations operations by tracking fai report
Category: Other
Examples: Example value
Constraints: NOT NULL |
| AuditLog | user | one-to-one | User | User for AuditLog
Purpose: Supports General Operations operations by tracking user
Category: Other
Examples: Example value |
| MeasurementEquipment | inspectionRecords | one-to-many | InspectionRecord | Quality inspection data
Purpose: Quality control and compliance
Category: Quality
Examples: PASS, FAIL
Constraints: NOT NULL |
| MeasurementEquipment | operationGaugeRequirements | one-to-many | OperationGaugeRequirement | Operation gauge requirements for MeasurementEquipment
Purpose: Supports Equipment Management operations by tracking operation gauge requirements
Category: Other
Examples: Example value
Constraints: NOT NULL |
| MeasurementEquipment | qifMeasurementResults | one-to-many | QIFMeasurementResult | Qif measurement results for MeasurementEquipment
Purpose: Supports Equipment Management operations by tracking qif measurement results
Category: Other
Examples: Example value
Constraints: NOT NULL |
| InspectionRecord | measurementEquipment | one-to-one | MeasurementEquipment | Measurement equipment for InspectionRecord
Purpose: Supports Quality Management operations by tracking measurement equipment
Category: Other
Examples: Example value |
| InspectionRecord | serializedPart | one-to-one | SerializedPart | Serialized part for InspectionRecord
Purpose: Supports Quality Management operations by tracking serialized part
Category: Other
Examples: Example value |
| CNCProgram | programDownloadLogs | one-to-many | ProgramDownloadLog | Program download logs for CNCProgram
Purpose: Supports General Operations operations by tracking program download logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ProgramDownloadLog | cncProgram | one-to-one | CNCProgram | Cnc program for ProgramDownloadLog
Purpose: Supports General Operations operations by tracking cnc program
Category: Other
Examples: Example value |
| OperationGaugeRequirement | measurementEquipment | one-to-one | MeasurementEquipment | Measurement equipment for OperationGaugeRequirement
Purpose: Supports General Operations operations by tracking measurement equipment
Category: Other
Examples: Example value
Constraints: NOT NULL |
| IntegrationConfig | erpMaterialTransactions | one-to-many | ERPMaterialTransaction | Erp material transactions for IntegrationConfig
Purpose: Supports General Operations operations by tracking erp material transactions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| IntegrationConfig | personnelInfoExchanges | one-to-many | PersonnelInfoExchange | Personnel info exchanges for IntegrationConfig
Purpose: Supports General Operations operations by tracking personnel info exchanges
Category: Other
Examples: Example value
Constraints: NOT NULL |
| IntegrationConfig | productionPerformanceActuals | one-to-many | ProductionPerformanceActual | Production performance actuals for IntegrationConfig
Purpose: Supports General Operations operations by tracking production performance actuals
Category: Other
Examples: Example value
Constraints: NOT NULL |
| IntegrationConfig | productionScheduleRequests | one-to-many | ProductionScheduleRequest | Production schedule requests for IntegrationConfig
Purpose: Supports General Operations operations by tracking production schedule requests
Category: Other
Examples: Example value
Constraints: NOT NULL |
| IntegrationLog | config | one-to-one | IntegrationConfig | Config for IntegrationLog
Purpose: Supports General Operations operations by tracking config
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ProductionScheduleRequest | config | one-to-one | IntegrationConfig | Config for ProductionScheduleRequest
Purpose: Supports General Operations operations by tracking config
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ProductionScheduleRequest | part | one-to-one | Part | Part for ProductionScheduleRequest
Purpose: Supports General Operations operations by tracking part
Category: Other
Examples: Example value |
| ProductionScheduleRequest | response | one-to-one | ProductionScheduleResponse | Response for ProductionScheduleRequest
Purpose: Supports General Operations operations by tracking response
Category: Other
Examples: Example value |
| ProductionScheduleResponse | request | one-to-one | ProductionScheduleRequest | Request for ProductionScheduleResponse
Purpose: Supports General Operations operations by tracking request
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ProductionPerformanceActual | config | one-to-one | IntegrationConfig | Config for ProductionPerformanceActual
Purpose: Supports General Operations operations by tracking config
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ERPMaterialTransaction | config | one-to-one | IntegrationConfig | Config for ERPMaterialTransaction
Purpose: Supports Material Management operations by tracking config
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ERPMaterialTransaction | part | one-to-one | Part | Part for ERPMaterialTransaction
Purpose: Supports Material Management operations by tracking part
Category: Other
Examples: Example value |
| PersonnelInfoExchange | config | one-to-one | IntegrationConfig | Config for PersonnelInfoExchange
Purpose: Supports Personnel Management operations by tracking config
Category: Other
Examples: Example value
Constraints: NOT NULL |
| EquipmentMaterialMovement | part | one-to-one | Part | Part for EquipmentMaterialMovement
Purpose: Supports Material Management operations by tracking part
Category: Other
Examples: Example value |
| QIFMeasurementPlan | characteristics | one-to-many | QIFCharacteristic | Characteristics for QIFMeasurementPlan
Purpose: Supports General Operations operations by tracking characteristics
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QIFMeasurementPlan | faiReport | one-to-one | FAIReport | Fai report for QIFMeasurementPlan
Purpose: Supports General Operations operations by tracking fai report
Category: Other
Examples: Example value |
| QIFMeasurementPlan | measurementResults | one-to-many | QIFMeasurementResult | Measurement results for QIFMeasurementPlan
Purpose: Supports General Operations operations by tracking measurement results
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QIFCharacteristic | qifMeasurementPlan | one-to-one | QIFMeasurementPlan | Qif measurement plan for QIFCharacteristic
Purpose: Supports General Operations operations by tracking qif measurement plan
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QIFCharacteristic | measurements | one-to-many | QIFMeasurement | Measurements for QIFCharacteristic
Purpose: Supports General Operations operations by tracking measurements
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QIFMeasurementResult | faiReport | one-to-one | FAIReport | Fai report for QIFMeasurementResult
Purpose: Supports General Operations operations by tracking fai report
Category: Other
Examples: Example value |
| QIFMeasurementResult | measurementDevice | one-to-one | MeasurementEquipment | Measurement device for QIFMeasurementResult
Purpose: Supports General Operations operations by tracking measurement device
Category: Other
Examples: Example value |
| QIFMeasurementResult | qifMeasurementPlan | one-to-one | QIFMeasurementPlan | Qif measurement plan for QIFMeasurementResult
Purpose: Supports General Operations operations by tracking qif measurement plan
Category: Other
Examples: Example value |
| QIFMeasurementResult | serializedPart | one-to-one | SerializedPart | Serialized part for QIFMeasurementResult
Purpose: Supports General Operations operations by tracking serialized part
Category: Other
Examples: Example value |
| QIFMeasurementResult | measurements | one-to-many | QIFMeasurement | Measurements for QIFMeasurementResult
Purpose: Supports General Operations operations by tracking measurements
Category: Other
Examples: Example value
Constraints: NOT NULL |
| QIFMeasurement | qifCharacteristic | one-to-one | QIFCharacteristic | Qif characteristic for QIFMeasurement
Purpose: Supports General Operations operations by tracking qif characteristic
Category: Other
Examples: Example value |
| QIFMeasurement | qifMeasurementResult | one-to-one | QIFMeasurementResult | Qif measurement result for QIFMeasurement
Purpose: Supports General Operations operations by tracking qif measurement result
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SPCConfiguration | parameter | one-to-one | OperationParameter | Parameter for SPCConfiguration
Purpose: Supports General Operations operations by tracking parameter
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SPCConfiguration | violations | one-to-many | SPCRuleViolation | Violations for SPCConfiguration
Purpose: Supports General Operations operations by tracking violations
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SPCRuleViolation | configuration | one-to-one | SPCConfiguration | Configuration for SPCRuleViolation
Purpose: Supports General Operations operations by tracking configuration
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SamplingPlan | inspectionResults | one-to-many | SamplingInspectionResult | Quality inspection data
Purpose: Quality control and compliance
Category: Quality
Examples: PASS, FAIL
Constraints: NOT NULL |
| SamplingPlan | parameter | one-to-one | OperationParameter | Parameter for SamplingPlan
Purpose: Supports General Operations operations by tracking parameter
Category: Other
Examples: Example value |
| SetupSheet | executions | one-to-many | SetupExecution | Executions for SetupSheet
Purpose: Supports General Operations operations by tracking executions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SetupSheet | parameters | one-to-many | SetupParameter | Parameters for SetupSheet
Purpose: Supports General Operations operations by tracking parameters
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SetupSheet | approvedBy | one-to-one | User | Approved by for SetupSheet
Purpose: Supports General Operations operations by tracking approved by
Category: Other
Examples: Example value |
| SetupSheet | createdBy | one-to-one | User | Created by for SetupSheet
Purpose: Supports General Operations operations by tracking created by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SetupSheet | parentVersion | one-to-one | SetupSheet | Parent version for SetupSheet
Purpose: Supports General Operations operations by tracking parent version
Category: Other
Examples: Example value |
| SetupSheet | childVersions | one-to-many | SetupSheet | Child versions for SetupSheet
Purpose: Supports General Operations operations by tracking child versions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SetupSheet | updatedBy | one-to-one | User | Updated by for SetupSheet
Purpose: Supports General Operations operations by tracking updated by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SetupSheet | steps | one-to-many | SetupStep | Steps for SetupSheet
Purpose: Supports General Operations operations by tracking steps
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SetupSheet | toolList | one-to-many | SetupTool | Tool list for SetupSheet
Purpose: Supports General Operations operations by tracking tool list
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SetupStep | setupSheet | one-to-one | SetupSheet | Setup sheet for SetupStep
Purpose: Supports General Operations operations by tracking setup sheet
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SetupParameter | setupSheet | one-to-one | SetupSheet | Setup sheet for SetupParameter
Purpose: Supports General Operations operations by tracking setup sheet
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SetupTool | setupSheet | one-to-one | SetupSheet | Setup sheet for SetupTool
Purpose: Supports General Operations operations by tracking setup sheet
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SetupExecution | completedBy | one-to-one | User | Completed by for SetupExecution
Purpose: Supports General Operations operations by tracking completed by
Category: Other
Examples: Example value |
| SetupExecution | setupSheet | one-to-one | SetupSheet | Setup sheet for SetupExecution
Purpose: Supports General Operations operations by tracking setup sheet
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SetupExecution | startedBy | one-to-one | User | Started by for SetupExecution
Purpose: Supports General Operations operations by tracking started by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| InspectionPlan | characteristics | one-to-many | InspectionCharacteristic | Characteristics for InspectionPlan
Purpose: Supports Quality Management operations by tracking characteristics
Category: Other
Examples: Example value
Constraints: NOT NULL |
| InspectionPlan | executions | one-to-many | InspectionExecution | Executions for InspectionPlan
Purpose: Supports Quality Management operations by tracking executions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| InspectionPlan | approvedBy | one-to-one | User | Approved by for InspectionPlan
Purpose: Supports Quality Management operations by tracking approved by
Category: Other
Examples: Example value |
| InspectionPlan | createdBy | one-to-one | User | Created by for InspectionPlan
Purpose: Supports Quality Management operations by tracking created by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| InspectionPlan | parentVersion | one-to-one | InspectionPlan | Parent version for InspectionPlan
Purpose: Supports Quality Management operations by tracking parent version
Category: Other
Examples: Example value |
| InspectionPlan | childVersions | one-to-many | InspectionPlan | Child versions for InspectionPlan
Purpose: Supports Quality Management operations by tracking child versions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| InspectionPlan | updatedBy | one-to-one | User | Updated by for InspectionPlan
Purpose: Supports Quality Management operations by tracking updated by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| InspectionPlan | steps | one-to-many | InspectionStep | Steps for InspectionPlan
Purpose: Supports Quality Management operations by tracking steps
Category: Other
Examples: Example value
Constraints: NOT NULL |
| InspectionCharacteristic | inspectionPlan | one-to-one | InspectionPlan | Quality inspection data
Purpose: Quality control and compliance
Category: Quality
Examples: PASS, FAIL
Constraints: NOT NULL |
| InspectionStep | inspectionPlan | one-to-one | InspectionPlan | Quality inspection data
Purpose: Quality control and compliance
Category: Quality
Examples: PASS, FAIL
Constraints: NOT NULL |
| InspectionExecution | inspectionPlan | one-to-one | InspectionPlan | Quality inspection data
Purpose: Quality control and compliance
Category: Quality
Examples: PASS, FAIL
Constraints: NOT NULL |
| InspectionExecution | inspector | one-to-one | User | Inspector for InspectionExecution
Purpose: Supports Quality Management operations by tracking inspector
Category: Other
Examples: Example value
Constraints: NOT NULL |
| StandardOperatingProcedure | acknowledgments | one-to-many | SOPAcknowledgment | Acknowledgments for StandardOperatingProcedure
Purpose: Supports General Operations operations by tracking acknowledgments
Category: Other
Examples: Example value
Constraints: NOT NULL |
| StandardOperatingProcedure | audits | one-to-many | SOPAudit | Audits for StandardOperatingProcedure
Purpose: Supports General Operations operations by tracking audits
Category: Other
Examples: Example value
Constraints: NOT NULL |
| StandardOperatingProcedure | steps | one-to-many | SOPStep | Steps for StandardOperatingProcedure
Purpose: Supports General Operations operations by tracking steps
Category: Other
Examples: Example value
Constraints: NOT NULL |
| StandardOperatingProcedure | approvedBy | one-to-one | User | Approved by for StandardOperatingProcedure
Purpose: Supports General Operations operations by tracking approved by
Category: Other
Examples: Example value |
| StandardOperatingProcedure | createdBy | one-to-one | User | Created by for StandardOperatingProcedure
Purpose: Supports General Operations operations by tracking created by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| StandardOperatingProcedure | parentVersion | one-to-one | StandardOperatingProcedure | Parent version for StandardOperatingProcedure
Purpose: Supports General Operations operations by tracking parent version
Category: Other
Examples: Example value |
| StandardOperatingProcedure | childVersions | one-to-many | StandardOperatingProcedure | Child versions for StandardOperatingProcedure
Purpose: Supports General Operations operations by tracking child versions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| StandardOperatingProcedure | updatedBy | one-to-one | User | Updated by for StandardOperatingProcedure
Purpose: Supports General Operations operations by tracking updated by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SOPStep | sop | one-to-one | StandardOperatingProcedure | Sop for SOPStep
Purpose: Supports General Operations operations by tracking sop
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SOPAcknowledgment | sop | one-to-one | StandardOperatingProcedure | Sop for SOPAcknowledgment
Purpose: Supports General Operations operations by tracking sop
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SOPAcknowledgment | user | one-to-one | User | User for SOPAcknowledgment
Purpose: Supports General Operations operations by tracking user
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SOPAudit | auditor | one-to-one | User | Auditor for SOPAudit
Purpose: Supports General Operations operations by tracking auditor
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SOPAudit | sop | one-to-one | StandardOperatingProcedure | Sop for SOPAudit
Purpose: Supports General Operations operations by tracking sop
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolDrawing | calibrationRecords | one-to-many | ToolCalibrationRecord | Calibration records for ToolDrawing
Purpose: Supports General Operations operations by tracking calibration records
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolDrawing | approvedBy | one-to-one | User | Approved by for ToolDrawing
Purpose: Supports General Operations operations by tracking approved by
Category: Other
Examples: Example value |
| ToolDrawing | createdBy | one-to-one | User | Created by for ToolDrawing
Purpose: Supports General Operations operations by tracking created by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolDrawing | parentVersion | one-to-one | ToolDrawing | Parent version for ToolDrawing
Purpose: Supports General Operations operations by tracking parent version
Category: Other
Examples: Example value |
| ToolDrawing | childVersions | one-to-many | ToolDrawing | Child versions for ToolDrawing
Purpose: Supports General Operations operations by tracking child versions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolDrawing | updatedBy | one-to-one | User | Updated by for ToolDrawing
Purpose: Supports General Operations operations by tracking updated by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolDrawing | maintenanceRecords | one-to-many | ToolMaintenanceRecord | Maintenance records for ToolDrawing
Purpose: Supports General Operations operations by tracking maintenance records
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolDrawing | usageLogs | one-to-many | ToolUsageLog | Usage logs for ToolDrawing
Purpose: Supports General Operations operations by tracking usage logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolMaintenanceRecord | performedBy | one-to-one | User | Performed by for ToolMaintenanceRecord
Purpose: Supports General Operations operations by tracking performed by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolMaintenanceRecord | toolDrawing | one-to-one | ToolDrawing | Tool drawing for ToolMaintenanceRecord
Purpose: Supports General Operations operations by tracking tool drawing
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolCalibrationRecord | performedBy | one-to-one | User | Performed by for ToolCalibrationRecord
Purpose: Supports General Operations operations by tracking performed by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolCalibrationRecord | toolDrawing | one-to-one | ToolDrawing | Tool drawing for ToolCalibrationRecord
Purpose: Supports General Operations operations by tracking tool drawing
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolUsageLog | toolDrawing | one-to-one | ToolDrawing | Tool drawing for ToolUsageLog
Purpose: Supports General Operations operations by tracking tool drawing
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ToolUsageLog | usedBy | one-to-one | User | Used by for ToolUsageLog
Purpose: Supports General Operations operations by tracking used by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| DocumentTemplate | createdBy | one-to-one | User | Created by for DocumentTemplate
Purpose: Supports Document Management operations by tracking created by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| DocumentTemplate | updatedBy | one-to-one | User | Updated by for DocumentTemplate
Purpose: Supports Document Management operations by tracking updated by
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowDefinition | instances | one-to-many | WorkflowInstance | Instances for WorkflowDefinition
Purpose: Supports General Operations operations by tracking instances
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowDefinition | rules | one-to-many | WorkflowRule | Rules for WorkflowDefinition
Purpose: Supports General Operations operations by tracking rules
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowDefinition | stages | one-to-many | WorkflowStage | Stages for WorkflowDefinition
Purpose: Supports General Operations operations by tracking stages
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowStage | stageInstances | one-to-many | WorkflowStageInstance | Stage instances for WorkflowStage
Purpose: Supports General Operations operations by tracking stage instances
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowStage | workflow | one-to-one | WorkflowDefinition | Workflow for WorkflowStage
Purpose: Supports General Operations operations by tracking workflow
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowRule | workflow | one-to-one | WorkflowDefinition | Workflow for WorkflowRule
Purpose: Supports General Operations operations by tracking workflow
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowInstance | history | one-to-many | WorkflowHistory | History for WorkflowInstance
Purpose: Supports General Operations operations by tracking history
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowInstance | workflow | one-to-one | WorkflowDefinition | Workflow for WorkflowInstance
Purpose: Supports General Operations operations by tracking workflow
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowInstance | stageInstances | one-to-many | WorkflowStageInstance | Stage instances for WorkflowInstance
Purpose: Supports General Operations operations by tracking stage instances
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowStageInstance | assignments | one-to-many | WorkflowAssignment | Assignments for WorkflowStageInstance
Purpose: Supports General Operations operations by tracking assignments
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowStageInstance | parallelCoordination | one-to-many | WorkflowParallelCoordination | Parallel coordination for WorkflowStageInstance
Purpose: Supports General Operations operations by tracking parallel coordination
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowStageInstance | stage | one-to-one | WorkflowStage | Stage for WorkflowStageInstance
Purpose: Supports General Operations operations by tracking stage
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowStageInstance | workflowInstance | one-to-one | WorkflowInstance | Workflow instance for WorkflowStageInstance
Purpose: Supports General Operations operations by tracking workflow instance
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowAssignment | stageInstance | one-to-one | WorkflowStageInstance | Stage instance for WorkflowAssignment
Purpose: Supports General Operations operations by tracking stage instance
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowHistory | workflowInstance | one-to-one | WorkflowInstance | Workflow instance for WorkflowHistory
Purpose: Supports General Operations operations by tracking workflow instance
Category: Other
Examples: Example value
Constraints: NOT NULL |
| WorkflowParallelCoordination | stageInstance | one-to-one | WorkflowStageInstance | Stage instance for WorkflowParallelCoordination
Purpose: Supports General Operations operations by tracking stage instance
Category: Other
Examples: Example value
Constraints: NOT NULL |
| EngineeringChangeOrder | affectedDocuments | one-to-many | ECOAffectedDocument | Affected documents for EngineeringChangeOrder
Purpose: Supports General Operations operations by tracking affected documents
Category: Other
Examples: Example value
Constraints: NOT NULL |
| EngineeringChangeOrder | attachments | one-to-many | ECOAttachment | Attachments for EngineeringChangeOrder
Purpose: Supports General Operations operations by tracking attachments
Category: Other
Examples: Example value
Constraints: NOT NULL |
| EngineeringChangeOrder | crbReviews | one-to-many | ECOCRBReview | Crb reviews for EngineeringChangeOrder
Purpose: Supports General Operations operations by tracking crb reviews
Category: Other
Examples: Example value
Constraints: NOT NULL |
| EngineeringChangeOrder | history | one-to-many | ECOHistory | History for EngineeringChangeOrder
Purpose: Supports General Operations operations by tracking history
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ECOAffectedDocument | eco | one-to-one | EngineeringChangeOrder | Eco for ECOAffectedDocument
Purpose: Supports Document Management operations by tracking eco
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ECOTask | eco | one-to-one | EngineeringChangeOrder | Eco for ECOTask
Purpose: Supports General Operations operations by tracking eco
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ECOAttachment | eco | one-to-one | EngineeringChangeOrder | Eco for ECOAttachment
Purpose: Supports General Operations operations by tracking eco
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ECOHistory | eco | one-to-one | EngineeringChangeOrder | Eco for ECOHistory
Purpose: Supports General Operations operations by tracking eco
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ECOCRBReview | eco | one-to-one | EngineeringChangeOrder | Eco for ECOCRBReview
Purpose: Supports General Operations operations by tracking eco
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ECORelation | parentEco | one-to-one | EngineeringChangeOrder | Parent eco for ECORelation
Purpose: Supports General Operations operations by tracking parent eco
Category: Other
Examples: Example value
Constraints: NOT NULL |
| ECORelation | relatedEco | one-to-one | EngineeringChangeOrder | Related eco for ECORelation
Purpose: Supports General Operations operations by tracking related eco
Category: Other
Examples: Example value
Constraints: NOT NULL |
| DocumentComment | reactions | one-to-many | CommentReaction | Reactions for DocumentComment
Purpose: Supports Document Management operations by tracking reactions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| DocumentComment | parentComment | one-to-one | DocumentComment | Parent comment for DocumentComment
Purpose: Supports Document Management operations by tracking parent comment
Category: Other
Examples: Example value |
| DocumentComment | replies | one-to-many | DocumentComment | Replies for DocumentComment
Purpose: Supports Document Management operations by tracking replies
Category: Other
Examples: Example value
Constraints: NOT NULL |
| CommentReaction | comment | one-to-one | DocumentComment | Comment for CommentReaction
Purpose: Supports General Operations operations by tracking comment
Category: Other
Examples: Example value
Constraints: NOT NULL |
| StoredFile | backupEntries | one-to-many | BackupEntry | Backup entries for StoredFile
Purpose: Supports General Operations operations by tracking backup entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| StoredFile | accessLogs | one-to-many | FileAccessLog | Access logs for StoredFile
Purpose: Supports General Operations operations by tracking access logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| StoredFile | versions | one-to-many | FileVersion | Versions for StoredFile
Purpose: Supports General Operations operations by tracking versions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| StoredFile | originalFile | one-to-one | StoredFile | Original file for StoredFile
Purpose: Supports General Operations operations by tracking original file
Category: Other
Examples: Example value |
| StoredFile | duplicateFiles | one-to-many | StoredFile | Duplicate files for StoredFile
Purpose: Supports General Operations operations by tracking duplicate files
Category: Other
Examples: Example value
Constraints: NOT NULL |
| FileVersion | file | one-to-one | StoredFile | File for FileVersion
Purpose: Supports General Operations operations by tracking file
Category: Other
Examples: Example value
Constraints: NOT NULL |
| BackupSchedule | backupHistory | one-to-many | BackupHistory | Backup history for BackupSchedule
Purpose: Supports General Operations operations by tracking backup history
Category: Other
Examples: Example value
Constraints: NOT NULL |
| BackupHistory | backupEntries | one-to-many | BackupEntry | Backup entries for BackupHistory
Purpose: Supports General Operations operations by tracking backup entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| BackupHistory | schedule | one-to-one | BackupSchedule | Schedule for BackupHistory
Purpose: Supports General Operations operations by tracking schedule
Category: Other
Examples: Example value |
| BackupEntry | backup | one-to-one | BackupHistory | Backup for BackupEntry
Purpose: Supports General Operations operations by tracking backup
Category: Other
Examples: Example value
Constraints: NOT NULL |
| BackupEntry | file | one-to-one | StoredFile | File for BackupEntry
Purpose: Supports General Operations operations by tracking file
Category: Other
Examples: Example value
Constraints: NOT NULL |
| FileAccessLog | file | one-to-one | StoredFile | File for FileAccessLog
Purpose: Supports General Operations operations by tracking file
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Role | permissions | one-to-many | RolePermission | Permissions for Role
Purpose: Supports Security & Access operations by tracking permissions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Role | userRoles | one-to-many | UserRole | User roles for Role
Purpose: Supports Security & Access operations by tracking user roles
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Role | userSiteRoles | one-to-many | UserSiteRole | User site roles for Role
Purpose: Supports Security & Access operations by tracking user site roles
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Role | templateInstance | one-to-one | RoleTemplateInstance | Template instance for Role
Purpose: Supports Security & Access operations by tracking template instance
Category: Other
Examples: Example value |
| Permission | roles | one-to-many | RolePermission | Roles for Permission
Purpose: Supports Security & Access operations by tracking roles
Category: Other
Examples: Example value
Constraints: NOT NULL |
| Permission | templatePermissions | one-to-many | RoleTemplatePermission | Template permissions for Permission
Purpose: Supports Security & Access operations by tracking template permissions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| UserRole | user | one-to-one | User | User for UserRole
Purpose: Supports Personnel Management operations by tracking user
Category: Other
Examples: Example value
Constraints: NOT NULL |
| UserSiteRole | site | one-to-one | Site | Site for UserSiteRole
Purpose: Supports Personnel Management operations by tracking site
Category: Other
Examples: Example value
Constraints: NOT NULL |
| UserSiteRole | user | one-to-one | User | User for UserSiteRole
Purpose: Supports Personnel Management operations by tracking user
Category: Other
Examples: Example value
Constraints: NOT NULL |
| TimeTrackingConfiguration | site | one-to-one | Site | Site for TimeTrackingConfiguration
Purpose: Supports General Operations operations by tracking site
Category: Other
Examples: Example value
Constraints: NOT NULL |
| LaborTimeEntry | indirectCode | one-to-one | IndirectCostCode | Indirect code for LaborTimeEntry
Purpose: Supports General Operations operations by tracking indirect code
Category: Other
Examples: Example value |
| LaborTimeEntry | user | one-to-one | User | User for LaborTimeEntry
Purpose: Supports General Operations operations by tracking user
Category: Other
Examples: Example value
Constraints: NOT NULL |
| IndirectCostCode | site | one-to-one | Site | Site for IndirectCostCode
Purpose: Supports General Operations operations by tracking site
Category: Other
Examples: Example value |
| IndirectCostCode | laborEntries | one-to-many | LaborTimeEntry | Labor entries for IndirectCostCode
Purpose: Supports General Operations operations by tracking labor entries
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SsoProvider | homeRealmRules | one-to-many | HomeRealmDiscovery | Home realm rules for SsoProvider
Purpose: Supports General Operations operations by tracking home realm rules
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SsoProvider | ssoSessions | one-to-many | SsoSession | Sso sessions for SsoProvider
Purpose: Supports General Operations operations by tracking sso sessions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SsoSession | user | one-to-one | User | User for SsoSession
Purpose: Supports General Operations operations by tracking user
Category: Other
Examples: Example value
Constraints: NOT NULL |
| AuthenticationEvent | user | one-to-one | User | User for AuthenticationEvent
Purpose: Supports General Operations operations by tracking user
Category: Other
Examples: Example value |
| PermissionUsageLog | site | one-to-one | Site | Site for PermissionUsageLog
Purpose: Supports Security & Access operations by tracking site
Category: Other
Examples: Example value |
| PermissionUsageLog | user | one-to-one | User | User for PermissionUsageLog
Purpose: Supports Security & Access operations by tracking user
Category: Other
Examples: Example value
Constraints: NOT NULL |
| SecurityEvent | resolvedByUser | one-to-one | User | Resolved by user for SecurityEvent
Purpose: Supports General Operations operations by tracking resolved by user
Category: Other
Examples: Example value |
| SecurityEvent | site | one-to-one | Site | Site for SecurityEvent
Purpose: Supports General Operations operations by tracking site
Category: Other
Examples: Example value |
| SecurityEvent | user | one-to-one | User | User for SecurityEvent
Purpose: Supports General Operations operations by tracking user
Category: Other
Examples: Example value |
| UserSessionLog | user | one-to-one | User | User for UserSessionLog
Purpose: Supports Personnel Management operations by tracking user
Category: Other
Examples: Example value
Constraints: NOT NULL |
| AuditReport | generatedByUser | one-to-one | User | Generated by user for AuditReport
Purpose: Supports General Operations operations by tracking generated by user
Category: Other
Examples: Example value
Constraints: NOT NULL |
| AuditReport | site | one-to-one | Site | Site for AuditReport
Purpose: Supports General Operations operations by tracking site
Category: Other
Examples: Example value |
| PermissionChangeLog | changedByUser | one-to-one | User | Changed by user for PermissionChangeLog
Purpose: Supports Security & Access operations by tracking changed by user
Category: Other
Examples: Example value
Constraints: NOT NULL |
| PermissionChangeLog | site | one-to-one | Site | Site for PermissionChangeLog
Purpose: Supports Security & Access operations by tracking site
Category: Other
Examples: Example value |
| PermissionChangeLog | targetUser | one-to-one | User | Target user for PermissionChangeLog
Purpose: Supports Security & Access operations by tracking target user
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoleTemplate | permissions | one-to-many | RoleTemplatePermission | Permissions for RoleTemplate
Purpose: Supports Security & Access operations by tracking permissions
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoleTemplate | instances | one-to-many | RoleTemplateInstance | Instances for RoleTemplate
Purpose: Supports Security & Access operations by tracking instances
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoleTemplate | usageLogs | one-to-many | RoleTemplateUsageLog | Usage logs for RoleTemplate
Purpose: Supports Security & Access operations by tracking usage logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoleTemplate | creator | one-to-one | User | Creator for RoleTemplate
Purpose: Supports Security & Access operations by tracking creator
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoleTemplate | updater | one-to-one | User | Updater for RoleTemplate
Purpose: Supports Security & Access operations by tracking updater
Category: Other
Examples: Example value |
| RoleTemplateInstance | site | one-to-one | Site | Site for RoleTemplateInstance
Purpose: Supports Security & Access operations by tracking site
Category: Other
Examples: Example value |
| RoleTemplateInstance | instantiator | one-to-one | User | Instantiator for RoleTemplateInstance
Purpose: Supports Security & Access operations by tracking instantiator
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoleTemplateInstance | usageLogs | one-to-many | RoleTemplateUsageLog | Usage logs for RoleTemplateInstance
Purpose: Supports Security & Access operations by tracking usage logs
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoleTemplateUsageLog | instance | one-to-one | RoleTemplateInstance | Instance for RoleTemplateUsageLog
Purpose: Supports Security & Access operations by tracking instance
Category: Other
Examples: Example value |
| RoleTemplateUsageLog | performer | one-to-one | User | Performer for RoleTemplateUsageLog
Purpose: Supports Security & Access operations by tracking performer
Category: Other
Examples: Example value
Constraints: NOT NULL |
| RoleTemplateUsageLog | targetUser | one-to-one | User | Target user for RoleTemplateUsageLog
Purpose: Supports Security & Access operations by tracking target user
Category: Other
Examples: Example value |
| RoleTemplateUsageLog | site | one-to-one | Site | Site for RoleTemplateUsageLog
Purpose: Supports Security & Access operations by tracking site
Category: Other
Examples: Example value |
