# Complete Field Documentation

**Generated:** 10/30/2025, 11:36:29 AM
**Coverage:** 100% (3536 fields across 186 tables)

## Summary

| Metric | Value |
|--------|-------|
| Total Tables | 186 |
| Total Fields | 3536 |
| Documentation Coverage | 100% |

## Enterprise

**Business Domain:** General Operations
**Fields:** 9

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| enterpriseCode | String | Enterprise code for Enterprise | Example text, Sample value |
| enterpriseName | String | Enterprise name for Enterprise | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| headquarters | String | Headquarters for Enterprise | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| sites | Site | Sites for Enterprise | Example value |

## Site

**Business Domain:** Core Infrastructure
**Fields:** 27

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| siteCode | String | Site code for Site | Example text, Sample value |
| siteName | String | Site name for Site | Example text, Sample value |
| location | String | Location for Site | Example text, Sample value |
| enterpriseId | String | Foreign key reference | site-001, user-123 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| areas | Area | Areas for Site | Example value |
| auditReports | AuditReport | Audit reports for Site | Example value |
| equipment | Equipment | Equipment for Site | Example value |
| indirectCostCodes | IndirectCostCode | Indirect cost codes for Site | Example value |
| ncrs | NCR | Ncrs for Site | Example value |
| operations | Operation | Operations for Site | Example value |
| partAvailability | PartSiteAvailability | Part availability for Site | Example value |
| permissionChangeLogs | PermissionChangeLog | Permission change logs for Site | Example value |
| permissionUsageLogs | PermissionUsageLog | Permission usage logs for Site | Example value |
| productionSchedules | ProductionSchedule | Production schedules for Site | Example value |
| routingTemplates | RoutingTemplate | Routing templates for Site | Example value |
| routings | Routing | Routings for Site | Example value |
| securityEvents | SecurityEvent | Security events for Site | Example value |
| enterprise | Enterprise | Enterprise for Site | Example value |
| timeTrackingConfiguration | TimeTrackingConfiguration | Time tracking configuration for Site | Example value |
| userSiteRoles | UserSiteRole | User site roles for Site | Example value |
| workOrders | WorkOrder | Work orders for Site | Example value |
| roleTemplateInstances | RoleTemplateInstance | Role template instances for Site | Example value |
| roleTemplateUsageLogs | RoleTemplateUsageLog | Role template usage logs for Site | Example value |

## Area

**Business Domain:** Core Infrastructure
**Fields:** 11

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| areaCode | String | Area code for Area | Example text, Sample value |
| areaName | String | Area name for Area | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| siteId | String | Foreign key reference | site-001, user-123 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| site | Site | Site for Area | Example value |
| equipment | Equipment | Equipment for Area | Example value |
| workCenters | WorkCenter | Work centers for Area | Example value |

## User

**Business Domain:** Personnel Management
**Fields:** 86

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| username | String | Username for User | Example text, Sample value |
| email | String | Email address | user@machshop.com |
| firstName | String | Name information | John, Doe |
| lastName | String | Name information | John, Doe |
| passwordHash | String | Password hash for User | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |
| roles | String | Roles for User | Example text, Sample value |
| permissions | String | Permissions for User | Example text, Sample value |
| lastLoginAt | DateTime | Last login at for User | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| employeeNumber | String | Employee identifier | EMP-001234 |
| personnelClassId | String | Foreign key reference | site-001, user-123 |
| hireDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| terminationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| phone | String | Phone for User | Example text, Sample value |
| emergencyContact | String | Emergency contact for User | Example text, Sample value |
| emergencyPhone | String | Emergency phone for User | Example text, Sample value |
| department | String | Department for User | Example text, Sample value |
| supervisorId | String | Foreign key reference | site-001, user-123 |
| costCenter | String | Cost center for User | Example text, Sample value |
| laborRate | Float | Labor rate for User | 1.5, 10.25 |
| auditLogs | AuditLog | Audit logs for User | Example value |
| generatedAuditReports | AuditReport | Generated audit reports for User | Example value |
| createdRoleTemplates | RoleTemplate | Created role templates for User | Example value |
| updatedRoleTemplates | RoleTemplate | Updated role templates for User | Example value |
| instantiatedTemplates | RoleTemplateInstance | Instantiated templates for User | Example value |
| templateUsageLogsAsPerformer | RoleTemplateUsageLog | Template usage logs as performer for User | Example value |
| templateUsageLogsAsTarget | RoleTemplateUsageLog | Template usage logs as target for User | Example value |
| authenticationEvents | AuthenticationEvent | Authentication events for User | Example value |
| dispatchedWorkOrders | DispatchLog | Dispatched work orders for User | Example value |
| createdDocumentTemplates | DocumentTemplate | Created document templates for User | Example value |
| updatedDocumentTemplates | DocumentTemplate | Updated document templates for User | Example value |
| invalidatedSignatures | ElectronicSignature | Invalidated signatures for User | Example value |
| electronicSignatures | ElectronicSignature | Electronic signatures for User | Example value |
| equipmentLogs | EquipmentLog | Equipment logs for User | Example value |
| inspectionExecutions | InspectionExecution | Quality inspection data | PASS, FAIL |
| approvedInspectionPlans | InspectionPlan | Approved inspection plans for User | Example value |
| createdInspectionPlans | InspectionPlan | Created inspection plans for User | Example value |
| updatedInspectionPlans | InspectionPlan | Updated inspection plans for User | Example value |
| laborTimeEntries | LaborTimeEntry | Labor time entries for User | Example value |
| assignedNcrs | NCR | Assigned ncrs for User | Example value |
| ncrReports | NCR | Ncr reports for User | Example value |
| permissionChangesChanger | PermissionChangeLog | Permission changes changer for User | Example value |
| permissionChangesTarget | PermissionChangeLog | Permission changes target for User | Example value |
| permissionUsageLogs | PermissionUsageLog | Permission usage logs for User | Example value |
| availability | PersonnelAvailability | Availability for User | Example value |
| certifications | PersonnelCertification | Certifications for User | Example value |
| skills | PersonnelSkillAssignment | Skills for User | Example value |
| workCenterAssignments | PersonnelWorkCenterAssignment | Work center assignments for User | Example value |
| qualityInspections | QualityInspection | Quality inspections for User | Example value |
| routingTemplates | RoutingTemplate | Routing templates for User | Example value |
| resolvedSecurityEvents | SecurityEvent | Resolved security events for User | Example value |
| securityEvents | SecurityEvent | Security events for User | Example value |
| completedSetupExecutions | SetupExecution | Completed setup executions for User | Example value |
| startedSetupExecutions | SetupExecution | Started setup executions for User | Example value |
| approvedSetupSheets | SetupSheet | Approved setup sheets for User | Example value |
| createdSetupSheets | SetupSheet | Created setup sheets for User | Example value |
| updatedSetupSheets | SetupSheet | Updated setup sheets for User | Example value |
| sopAcknowledgments | SOPAcknowledgment | Sop acknowledgments for User | Example value |
| sopAudits | SOPAudit | Sop audits for User | Example value |
| ssoSessions | SsoSession | Sso sessions for User | Example value |
| approvedSOPs | StandardOperatingProcedure | Approved s o ps for User | Example value |
| createdSOPs | StandardOperatingProcedure | Created s o ps for User | Example value |
| updatedSOPs | StandardOperatingProcedure | Updated s o ps for User | Example value |
| toolCalibrationRecords | ToolCalibrationRecord | Tool calibration records for User | Example value |
| approvedToolDrawings | ToolDrawing | Approved tool drawings for User | Example value |
| createdToolDrawings | ToolDrawing | Created tool drawings for User | Example value |
| updatedToolDrawings | ToolDrawing | Updated tool drawings for User | Example value |
| toolMaintenanceRecords | ToolMaintenanceRecord | Tool maintenance records for User | Example value |
| toolUsageLogs | ToolUsageLog | Tool usage logs for User | Example value |
| userRoles | UserRole | User roles for User | Example value |
| userSessionLogs | UserSessionLog | User session logs for User | Example value |
| userSiteRoles | UserSiteRole | User site roles for User | Example value |
| personnelClass | PersonnelClass | Personnel class for User | Example value |
| supervisor | User | Supervisor for User | Example value |
| subordinates | User | Subordinates for User | Example value |
| workInstructionExecutions | WorkInstructionExecution | Work instruction executions for User | Example value |
| signedStepExecutions | WorkInstructionStepExecution | Signed step executions for User | Example value |
| approvedWorkInstructions | WorkInstruction | Approved work instructions for User | Example value |
| createdWorkInstructions | WorkInstruction | Created work instructions for User | Example value |
| updatedWorkInstructions | WorkInstruction | Updated work instructions for User | Example value |
| assignedWorkOrders | WorkOrder | Assigned work orders for User | Example value |
| createdWorkOrders | WorkOrder | Created work orders for User | Example value |
| workPerformanceRecords | WorkPerformance | Work performance records for User | Example value |

## PersonnelClass

**Business Domain:** Personnel Management
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| classCode | String | Class code for PersonnelClass | Example text, Sample value |
| className | String | Class name for PersonnelClass | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| level | Int | Level for PersonnelClass | 1, 10 |
| parentClassId | String | Foreign key reference | site-001, user-123 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| parentClass | PersonnelClass | Parent class for PersonnelClass | Example value |
| childClasses | PersonnelClass | Child classes for PersonnelClass | Example value |
| qualifications | PersonnelQualification | Qualifications for PersonnelClass | Example value |
| personnel | User | Personnel for PersonnelClass | Example value |

## PersonnelQualification

**Business Domain:** Personnel Management
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| qualificationCode | String | Qualification code for PersonnelQualification | Example text, Sample value |
| qualificationName | String | Qualification name for PersonnelQualification | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| qualificationType | QualificationType | Qualification type for PersonnelQualification | Example value |
| issuingOrganization | String | Issuing organization for PersonnelQualification | Example text, Sample value |
| validityPeriodMonths | Int | Validity period months for PersonnelQualification | 1, 10 |
| requiresRenewal | Boolean | Requires renewal for PersonnelQualification | true, false |
| personnelClassId | String | Foreign key reference | site-001, user-123 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| certifications | PersonnelCertification | Certifications for PersonnelQualification | Example value |
| personnelClass | PersonnelClass | Personnel class for PersonnelQualification | Example value |

## PersonnelCertification

**Business Domain:** Personnel Management
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| personnelId | String | Foreign key reference | site-001, user-123 |
| qualificationId | String | Foreign key reference | site-001, user-123 |
| certificationNumber | String | Certification number for PersonnelCertification | Example text, Sample value |
| issuedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| expirationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| status | CertificationStatus | Current operational status | ACTIVE, COMPLETED |
| attachmentUrls | String | Attachment urls for PersonnelCertification | Example text, Sample value |
| verifiedBy | String | Verified by for PersonnelCertification | Example text, Sample value |
| verifiedAt | DateTime | Verified at for PersonnelCertification | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| personnel | User | Personnel for PersonnelCertification | Example value |
| qualification | PersonnelQualification | Qualification for PersonnelCertification | Example value |

## PersonnelSkill

**Business Domain:** Personnel Management
**Fields:** 9

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| skillCode | String | Skill code for PersonnelSkill | Example text, Sample value |
| skillName | String | Skill name for PersonnelSkill | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| skillCategory | SkillCategory | Skill category for PersonnelSkill | Example value |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| skillAssignments | PersonnelSkillAssignment | Skill assignments for PersonnelSkill | Example value |

## PersonnelSkillAssignment

**Business Domain:** Personnel Management
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| personnelId | String | Foreign key reference | site-001, user-123 |
| skillId | String | Foreign key reference | site-001, user-123 |
| competencyLevel | CompetencyLevel | Competency level for PersonnelSkillAssignment | Example value |
| assessedBy | String | Assessed by for PersonnelSkillAssignment | Example text, Sample value |
| assessedAt | DateTime | Assessed at for PersonnelSkillAssignment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| lastUsedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| certifiedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| personnel | User | Personnel for PersonnelSkillAssignment | Example value |
| skill | PersonnelSkill | Skill for PersonnelSkillAssignment | Example value |

## PersonnelWorkCenterAssignment

**Business Domain:** Personnel Management
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| personnelId | String | Foreign key reference | site-001, user-123 |
| workCenterId | String | Foreign key reference | site-001, user-123 |
| isPrimary | Boolean | Is primary for PersonnelWorkCenterAssignment | true, false |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| endDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| certifiedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| personnel | User | Personnel for PersonnelWorkCenterAssignment | Example value |
| workCenter | WorkCenter | Work center for PersonnelWorkCenterAssignment | Example value |

## PersonnelAvailability

**Business Domain:** Personnel Management
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| personnelId | String | Foreign key reference | site-001, user-123 |
| availabilityType | AvailabilityType | Availability type for PersonnelAvailability | Example value |
| startDateTime | DateTime | Start date time for PersonnelAvailability | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| endDateTime | DateTime | End date time for PersonnelAvailability | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| shiftCode | String | Shift code for PersonnelAvailability | Example text, Sample value |
| isRecurring | Boolean | Is recurring for PersonnelAvailability | true, false |
| recurrenceRule | String | Recurrence rule for PersonnelAvailability | Example text, Sample value |
| reason | String | Reason for PersonnelAvailability | Example text, Sample value |
| approvedBy | String | Approved by for PersonnelAvailability | Example text, Sample value |
| approvedAt | DateTime | Approved at for PersonnelAvailability | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| personnel | User | Personnel for PersonnelAvailability | Example value |

## MaterialClass

**Business Domain:** Material Management
**Fields:** 18

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| classCode | String | Class code for MaterialClass | Example text, Sample value |
| className | String | Class name for MaterialClass | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| level | Int | Level for MaterialClass | 1, 10 |
| parentClassId | String | Foreign key reference | site-001, user-123 |
| requiresLotTracking | Boolean | Requires lot tracking for MaterialClass | true, false |
| requiresSerialTracking | Boolean | Requires serial tracking for MaterialClass | true, false |
| requiresExpirationDate | Boolean | Date value | 2024-10-30T10:00:00Z |
| shelfLifeDays | Int | Shelf life days for MaterialClass | 1, 10 |
| storageRequirements | String | Storage requirements for MaterialClass | Example text, Sample value |
| handlingInstructions | String | Handling instructions for MaterialClass | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| parentClass | MaterialClass | Parent class for MaterialClass | Example value |
| childClasses | MaterialClass | Child classes for MaterialClass | Example value |
| materials | MaterialDefinition | Materials for MaterialClass | Example value |

## MaterialDefinition

**Business Domain:** Material Management
**Fields:** 40

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| materialNumber | String | Material number for MaterialDefinition | Example text, Sample value |
| materialName | String | Material name for MaterialDefinition | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| materialClassId | String | Foreign key reference | site-001, user-123 |
| baseUnitOfMeasure | String | Base unit of measure for MaterialDefinition | Example text, Sample value |
| alternateUnitOfMeasure | String | Alternate unit of measure for MaterialDefinition | Example text, Sample value |
| conversionFactor | Float | Conversion factor for MaterialDefinition | 1.5, 10.25 |
| materialType | MaterialType | Material type for MaterialDefinition | Example value |
| materialGrade | String | Material grade for MaterialDefinition | Example text, Sample value |
| specification | String | Technical specification | AMS4911 Standard |
| minimumStock | Float | Minimum stock for MaterialDefinition | 1.5, 10.25 |
| reorderPoint | Float | Reorder point for MaterialDefinition | 1.5, 10.25 |
| reorderQuantity | Float | Reorder quantity for MaterialDefinition | 1.5, 10.25 |
| leadTimeDays | Int | Lead time days for MaterialDefinition | 1, 10 |
| requiresLotTracking | Boolean | Requires lot tracking for MaterialDefinition | true, false |
| lotNumberFormat | String | Lot number format for MaterialDefinition | Example text, Sample value |
| defaultShelfLifeDays | Int | Default shelf life days for MaterialDefinition | 1, 10 |
| standardCost | Float | Standard cost for MaterialDefinition | 1.5, 10.25 |
| currency | String | Currency for MaterialDefinition | Example text, Sample value |
| requiresInspection | Boolean | Requires inspection for MaterialDefinition | true, false |
| inspectionFrequency | String | Quality inspection data | PASS, FAIL |
| primarySupplierId | String | Foreign key reference | site-001, user-123 |
| supplierPartNumber | String | Supplier part number for MaterialDefinition | Example text, Sample value |
| drawingNumber | String | Drawing number for MaterialDefinition | Example text, Sample value |
| revision | String | Revision for MaterialDefinition | Example text, Sample value |
| msdsUrl | String | Msds url for MaterialDefinition | Example text, Sample value |
| imageUrl | String | Image url for MaterialDefinition | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |
| isPhantom | Boolean | Is phantom for MaterialDefinition | true, false |
| isObsolete | Boolean | Is obsolete for MaterialDefinition | true, false |
| obsoleteDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| replacementMaterialId | String | Foreign key reference | site-001, user-123 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| materialClass | MaterialClass | Material class for MaterialDefinition | Example value |
| replacementMaterial | MaterialDefinition | Replacement material for MaterialDefinition | Example value |
| replacedMaterials | MaterialDefinition | Replaced materials for MaterialDefinition | Example value |
| lots | MaterialLot | Lots for MaterialDefinition | Example value |
| properties | MaterialProperty | Properties for MaterialDefinition | Example value |

## MaterialProperty

**Business Domain:** Material Management
**Fields:** 16

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| materialId | String | Foreign key reference | site-001, user-123 |
| propertyName | String | Property name for MaterialProperty | Example text, Sample value |
| propertyType | MaterialPropertyType | Property type for MaterialProperty | Example value |
| propertyValue | String | Property value for MaterialProperty | Example text, Sample value |
| propertyUnit | String | Property unit for MaterialProperty | Example text, Sample value |
| testMethod | String | Test method for MaterialProperty | Example text, Sample value |
| nominalValue | Float | Nominal value for MaterialProperty | 1.5, 10.25 |
| minValue | Float | Min value for MaterialProperty | 1.5, 10.25 |
| maxValue | Float | Max value for MaterialProperty | 1.5, 10.25 |
| isRequired | Boolean | Is required for MaterialProperty | true, false |
| isCritical | Boolean | Is critical for MaterialProperty | true, false |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| material | MaterialDefinition | Material for MaterialProperty | Example value |

## MaterialLot

**Business Domain:** Material Management
**Fields:** 48

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| lotNumber | String | Material lot identifier | LOT-TI-20241015 |
| materialId | String | Foreign key reference | site-001, user-123 |
| supplierLotNumber | String | Supplier lot number for MaterialLot | Example text, Sample value |
| purchaseOrderNumber | String | Purchase order number for MaterialLot | Example text, Sample value |
| heatNumber | String | Heat number for MaterialLot | Example text, Sample value |
| serialNumber | String | Unique serial number | SN-ENG-001-20241030 |
| originalQuantity | Float | Original quantity for MaterialLot | 1.5, 10.25 |
| currentQuantity | Float | Current quantity for MaterialLot | 1.5, 10.25 |
| unitOfMeasure | String | Unit of measure for MaterialLot | Example text, Sample value |
| location | String | Location for MaterialLot | Example text, Sample value |
| warehouseId | String | Foreign key reference | site-001, user-123 |
| manufactureDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| receivedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| expirationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| shelfLifeDays | Int | Shelf life days for MaterialLot | 1, 10 |
| firstUsedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| lastUsedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| status | MaterialLotStatus | Current operational status | ACTIVE, COMPLETED |
| state | MaterialLotState | State for MaterialLot | Example value |
| isQuarantined | Boolean | Is quarantined for MaterialLot | true, false |
| quarantineReason | String | Quarantine reason for MaterialLot | Example text, Sample value |
| quarantinedAt | DateTime | Quarantined at for MaterialLot | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| qualityStatus | QualityLotStatus | Quality status for MaterialLot | Example value |
| inspectionId | String | Foreign key reference | site-001, user-123 |
| certificationUrls | String | Certification urls for MaterialLot | Example text, Sample value |
| supplierId | String | Foreign key reference | site-001, user-123 |
| supplierName | String | Supplier name for MaterialLot | Example text, Sample value |
| manufacturerId | String | Foreign key reference | site-001, user-123 |
| manufacturerName | String | Manufacturer name for MaterialLot | Example text, Sample value |
| countryOfOrigin | String | Country of origin for MaterialLot | Example text, Sample value |
| unitCost | Float | Unit cost for MaterialLot | 1.5, 10.25 |
| totalCost | Float | Total cost for MaterialLot | 1.5, 10.25 |
| currency | String | Currency for MaterialLot | Example text, Sample value |
| parentLotId | String | Foreign key reference | site-001, user-123 |
| isSplit | Boolean | Is split for MaterialLot | true, false |
| isMerged | Boolean | Is merged for MaterialLot | true, false |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| customAttributes | Json | Custom attributes for MaterialLot | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| genealogyAsChild | MaterialLotGenealogy | Genealogy as child for MaterialLot | Example value |
| genealogyAsParent | MaterialLotGenealogy | Genealogy as parent for MaterialLot | Example value |
| material | MaterialDefinition | Material for MaterialLot | Example value |
| parentLot | MaterialLot | Parent lot for MaterialLot | Example value |
| childLots | MaterialLot | Child lots for MaterialLot | Example value |
| stateHistory | MaterialStateHistory | State history for MaterialLot | Example value |
| sublots | MaterialSublot | Sublots for MaterialLot | Example value |

## MaterialSublot

**Business Domain:** Material Management
**Fields:** 17

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| sublotNumber | String | Sublot number for MaterialSublot | Example text, Sample value |
| parentLotId | String | Foreign key reference | site-001, user-123 |
| operationType | SublotOperationType | Operation type for MaterialSublot | Example value |
| quantity | Float | Numerical quantity | 10, 25 |
| unitOfMeasure | String | Unit of measure for MaterialSublot | Example text, Sample value |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| reservedFor | String | Reserved for for MaterialSublot | Example text, Sample value |
| location | String | Location for MaterialSublot | Example text, Sample value |
| status | MaterialLotStatus | Current operational status | ACTIVE, COMPLETED |
| isActive | Boolean | Active status flag | true, false |
| splitReason | String | Split reason for MaterialSublot | Example text, Sample value |
| createdById | String | Foreign key reference | site-001, user-123 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| parentLot | MaterialLot | Parent lot for MaterialSublot | Example value |

## MaterialLotGenealogy

**Business Domain:** Material Management
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| parentLotId | String | Foreign key reference | site-001, user-123 |
| childLotId | String | Foreign key reference | site-001, user-123 |
| relationshipType | GenealogyRelationType | Relationship type for MaterialLotGenealogy | Example value |
| quantityConsumed | Float | Numerical quantity | 10, 25 |
| quantityProduced | Float | Numerical quantity | 10, 25 |
| unitOfMeasure | String | Unit of measure for MaterialLotGenealogy | Example text, Sample value |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| processDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| operatorId | String | Foreign key reference | site-001, user-123 |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| childLot | MaterialLot | Child lot for MaterialLotGenealogy | Example value |
| parentLot | MaterialLot | Parent lot for MaterialLotGenealogy | Example value |

## MaterialStateHistory

**Business Domain:** Material Management
**Fields:** 22

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| lotId | String | Foreign key reference | site-001, user-123 |
| previousState | MaterialLotState | Previous state for MaterialStateHistory | Example value |
| newState | MaterialLotState | New state for MaterialStateHistory | Example value |
| previousStatus | MaterialLotStatus | Previous status for MaterialStateHistory | Example value |
| newStatus | MaterialLotStatus | New status for MaterialStateHistory | Example value |
| reason | String | Reason for MaterialStateHistory | Example text, Sample value |
| transitionType | StateTransitionType | Transition type for MaterialStateHistory | Example value |
| quantity | Float | Numerical quantity | 10, 25 |
| unitOfMeasure | String | Unit of measure for MaterialStateHistory | Example text, Sample value |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| inspectionId | String | Foreign key reference | site-001, user-123 |
| changedById | String | Foreign key reference | site-001, user-123 |
| changedAt | DateTime | Changed at for MaterialStateHistory | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| fromLocation | String | From location for MaterialStateHistory | Example text, Sample value |
| toLocation | String | To location for MaterialStateHistory | Example text, Sample value |
| qualityNotes | String | Quality notes for MaterialStateHistory | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| metadata | Json | Metadata for MaterialStateHistory | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| lot | MaterialLot | Lot for MaterialStateHistory | Example value |

## Operation

**Business Domain:** General Operations
**Fields:** 40

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| description | String | Text description | Manufacturing notes, Quality requirements |
| siteId | String | Foreign key reference | site-001, user-123 |
| isStandardOperation | Boolean | Is standard operation for Operation | true, false |
| operationCode | String | Operation code for Operation | Example text, Sample value |
| operationName | String | Operation name for Operation | Example text, Sample value |
| operationClassification | OperationClassification | Operation classification for Operation | Example value |
| standardWorkInstructionId | String | Foreign key reference | site-001, user-123 |
| level | Int | Level for Operation | 1, 10 |
| parentOperationId | String | Foreign key reference | site-001, user-123 |
| operationType | OperationType | Operation type for Operation | Example value |
| category | String | Category for Operation | Example text, Sample value |
| duration | Int | Duration for Operation | 1, 10 |
| setupTime | Int | Setup time for Operation | 1, 10 |
| teardownTime | Int | Teardown time for Operation | 1, 10 |
| minCycleTime | Int | Min cycle time for Operation | 1, 10 |
| maxCycleTime | Int | Max cycle time for Operation | 1, 10 |
| version | String | Version for Operation | Example text, Sample value |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| expirationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| isActive | Boolean | Active status flag | true, false |
| requiresApproval | Boolean | Requires approval for Operation | true, false |
| approvedBy | String | Approved by for Operation | Example text, Sample value |
| approvedAt | DateTime | Approved at for Operation | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| bomItems | BOMItem | Bom items for Operation | Example value |
| equipmentSpecs | EquipmentOperationSpecification | Equipment specs for Operation | Example value |
| materialSpecs | MaterialOperationSpecification | Material specs for Operation | Example value |
| dependencies | OperationDependency | Dependencies for Operation | Example value |
| prerequisiteFor | OperationDependency | Prerequisite for for Operation | Example value |
| parameters | OperationParameter | Parameters for Operation | Example value |
| parentOperation | Operation | Parent operation for Operation | Example value |
| childOperations | Operation | Child operations for Operation | Example value |
| site | Site | Site for Operation | Example value |
| standardWorkInstruction | WorkInstruction | Standard work instruction for Operation | Example value |
| personnelSpecs | PersonnelOperationSpecification | Personnel specs for Operation | Example value |
| assetSpecs | PhysicalAssetOperationSpecification | Asset specs for Operation | Example value |
| routingSteps | RoutingStep | Routing steps for Operation | Example value |
| samplingPlans | SamplingPlan | Sampling plans for Operation | Example value |

## OperationParameter

**Business Domain:** General Operations
**Fields:** 24

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| operationId | String | Foreign key reference | site-001, user-123 |
| parameterName | String | Parameter name for OperationParameter | Example text, Sample value |
| parameterType | ParameterType | Parameter type for OperationParameter | Example value |
| dataType | ParameterDataType | Data type for OperationParameter | Example value |
| defaultValue | String | Default value for OperationParameter | Example text, Sample value |
| unitOfMeasure | String | Unit of measure for OperationParameter | Example text, Sample value |
| minValue | Float | Min value for OperationParameter | 1.5, 10.25 |
| maxValue | Float | Max value for OperationParameter | 1.5, 10.25 |
| allowedValues | String | Allowed values for OperationParameter | Example text, Sample value |
| isRequired | Boolean | Is required for OperationParameter | true, false |
| isCritical | Boolean | Is critical for OperationParameter | true, false |
| requiresVerification | Boolean | Requires verification for OperationParameter | true, false |
| displayOrder | Int | Display order for OperationParameter | 1, 10 |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| parameterGroupId | String | Foreign key reference | site-001, user-123 |
| operation | Operation | Operation for OperationParameter | Example value |
| parameterGroup | ParameterGroup | Parameter group for OperationParameter | Example value |
| formula | ParameterFormula | Formula for OperationParameter | Example value |
| limits | ParameterLimits | Limits for OperationParameter | Example value |
| samplingPlans | SamplingPlan | Sampling plans for OperationParameter | Example value |
| spcConfiguration | SPCConfiguration | Spc configuration for OperationParameter | Example value |

## ParameterLimits

**Business Domain:** General Operations
**Fields:** 16

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| parameterId | String | Foreign key reference | site-001, user-123 |
| engineeringMin | Float | Engineering min for ParameterLimits | 1.5, 10.25 |
| engineeringMax | Float | Engineering max for ParameterLimits | 1.5, 10.25 |
| operatingMin | Float | Operating min for ParameterLimits | 1.5, 10.25 |
| operatingMax | Float | Operating max for ParameterLimits | 1.5, 10.25 |
| LSL | Float | L s l for ParameterLimits | 1.5, 10.25 |
| USL | Float | U s l for ParameterLimits | 1.5, 10.25 |
| nominalValue | Float | Nominal value for ParameterLimits | 1.5, 10.25 |
| highHighAlarm | Float | High high alarm for ParameterLimits | 1.5, 10.25 |
| highAlarm | Float | High alarm for ParameterLimits | 1.5, 10.25 |
| lowAlarm | Float | Low alarm for ParameterLimits | 1.5, 10.25 |
| lowLowAlarm | Float | Low low alarm for ParameterLimits | 1.5, 10.25 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| parameter | OperationParameter | Parameter for ParameterLimits | Example value |

## ParameterGroup

**Business Domain:** General Operations
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| groupName | String | Group name for ParameterGroup | Example text, Sample value |
| parentGroupId | String | Foreign key reference | site-001, user-123 |
| groupType | ParameterGroupType | Group type for ParameterGroup | Example value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| tags | String | Tags for ParameterGroup | Example text, Sample value |
| displayOrder | Int | Display order for ParameterGroup | 1, 10 |
| icon | String | Icon for ParameterGroup | Example text, Sample value |
| color | String | Color for ParameterGroup | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| parameters | OperationParameter | Parameters for ParameterGroup | Example value |
| parentGroup | ParameterGroup | Parent group for ParameterGroup | Example value |
| childGroups | ParameterGroup | Child groups for ParameterGroup | Example value |

## ParameterFormula

**Business Domain:** General Operations
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| formulaName | String | Formula name for ParameterFormula | Example text, Sample value |
| outputParameterId | String | Foreign key reference | site-001, user-123 |
| formulaExpression | String | Formula expression for ParameterFormula | Example text, Sample value |
| formulaLanguage | FormulaLanguage | Formula language for ParameterFormula | Example value |
| inputParameterIds | String | Input parameter ids for ParameterFormula | Example text, Sample value |
| evaluationTrigger | EvaluationTrigger | Evaluation trigger for ParameterFormula | Example value |
| evaluationSchedule | String | Evaluation schedule for ParameterFormula | Example text, Sample value |
| testCases | Json | Test cases for ParameterFormula | Example value |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdBy | String | Created by for ParameterFormula | Example text, Sample value |
| lastModifiedBy | String | Last modified by for ParameterFormula | Example text, Sample value |
| outputParameter | OperationParameter | Output parameter for ParameterFormula | Example value |

## OperationDependency

**Business Domain:** General Operations
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| dependentOperationId | String | Foreign key reference | site-001, user-123 |
| prerequisiteOperationId | String | Foreign key reference | site-001, user-123 |
| dependencyType | DependencyType | Dependency type for OperationDependency | Example value |
| timingType | DependencyTimingType | Timing type for OperationDependency | Example value |
| lagTime | Int | Lag time for OperationDependency | 1, 10 |
| leadTime | Int | Lead time for OperationDependency | 1, 10 |
| condition | String | Condition for OperationDependency | Example text, Sample value |
| isOptional | Boolean | Is optional for OperationDependency | true, false |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| dependentOperation | Operation | Dependent operation for OperationDependency | Example value |
| prerequisiteOperation | Operation | Prerequisite operation for OperationDependency | Example value |

## PersonnelOperationSpecification

**Business Domain:** Personnel Management
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| operationId | String | Foreign key reference | site-001, user-123 |
| personnelClassId | String | Foreign key reference | site-001, user-123 |
| skillId | String | Foreign key reference | site-001, user-123 |
| minimumCompetency | CompetencyLevel | Minimum competency for PersonnelOperationSpecification | Example value |
| requiredCertifications | String | Required certifications for PersonnelOperationSpecification | Example text, Sample value |
| quantity | Int | Numerical quantity | 10, 25 |
| isOptional | Boolean | Is optional for PersonnelOperationSpecification | true, false |
| roleName | String | Role name for PersonnelOperationSpecification | Example text, Sample value |
| roleDescription | String | Role description for PersonnelOperationSpecification | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| operation | Operation | Operation for PersonnelOperationSpecification | Example value |

## EquipmentOperationSpecification

**Business Domain:** Equipment Management
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| operationId | String | Foreign key reference | site-001, user-123 |
| equipmentClass | EquipmentClass | Equipment class for EquipmentOperationSpecification | Example value |
| equipmentType | String | Equipment type for EquipmentOperationSpecification | Example text, Sample value |
| specificEquipmentId | String | Foreign key reference | site-001, user-123 |
| requiredCapabilities | String | Required capabilities for EquipmentOperationSpecification | Example text, Sample value |
| minimumCapacity | Float | Minimum capacity for EquipmentOperationSpecification | 1.5, 10.25 |
| quantity | Int | Numerical quantity | 10, 25 |
| isOptional | Boolean | Is optional for EquipmentOperationSpecification | true, false |
| setupRequired | Boolean | Setup required for EquipmentOperationSpecification | true, false |
| setupTime | Int | Setup time for EquipmentOperationSpecification | 1, 10 |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| operation | Operation | Operation for EquipmentOperationSpecification | Example value |

## MaterialOperationSpecification

**Business Domain:** Material Management
**Fields:** 16

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| operationId | String | Foreign key reference | site-001, user-123 |
| materialDefinitionId | String | Foreign key reference | site-001, user-123 |
| materialClassId | String | Foreign key reference | site-001, user-123 |
| materialType | MaterialType | Material type for MaterialOperationSpecification | Example value |
| quantity | Float | Numerical quantity | 10, 25 |
| unitOfMeasure | String | Unit of measure for MaterialOperationSpecification | Example text, Sample value |
| consumptionType | ConsumptionType | Consumption type for MaterialOperationSpecification | Example value |
| requiredProperties | String | Required properties for MaterialOperationSpecification | Example text, Sample value |
| qualityRequirements | String | Quality requirements for MaterialOperationSpecification | Example text, Sample value |
| isOptional | Boolean | Is optional for MaterialOperationSpecification | true, false |
| allowSubstitutes | Boolean | Allow substitutes for MaterialOperationSpecification | true, false |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| operation | Operation | Operation for MaterialOperationSpecification | Example value |

## PhysicalAssetOperationSpecification

**Business Domain:** General Operations
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| operationId | String | Foreign key reference | site-001, user-123 |
| assetType | PhysicalAssetType | Asset type for PhysicalAssetOperationSpecification | Example value |
| assetCode | String | Asset code for PhysicalAssetOperationSpecification | Example text, Sample value |
| assetName | String | Asset name for PhysicalAssetOperationSpecification | Example text, Sample value |
| specifications | Json | Technical specification | AMS4911 Standard |
| quantity | Int | Numerical quantity | 10, 25 |
| isOptional | Boolean | Is optional for PhysicalAssetOperationSpecification | true, false |
| requiresCalibration | Boolean | Requires calibration for PhysicalAssetOperationSpecification | true, false |
| calibrationInterval | Int | Calibration interval for PhysicalAssetOperationSpecification | 1, 10 |
| estimatedLifeCycles | Int | Estimated life cycles for PhysicalAssetOperationSpecification | 1, 10 |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| operation | Operation | Operation for PhysicalAssetOperationSpecification | Example value |

## Part

**Business Domain:** General Operations
**Fields:** 45

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| partName | String | Part name for Part | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| partType | String | Part type for Part | Example text, Sample value |
| productType | ProductType | Product type for Part | Example value |
| lifecycleState | ProductLifecycleState | Lifecycle state for Part | Example value |
| unitOfMeasure | String | Unit of measure for Part | Example text, Sample value |
| weight | Float | Weight for Part | 1.5, 10.25 |
| weightUnit | String | Weight unit for Part | Example text, Sample value |
| drawingNumber | String | Drawing number for Part | Example text, Sample value |
| revision | String | Revision for Part | Example text, Sample value |
| cadModelUrl | String | Cad model url for Part | Example text, Sample value |
| releaseDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| obsoleteDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| replacementPartId | String | Foreign key reference | site-001, user-123 |
| makeOrBuy | String | Make or buy for Part | Example text, Sample value |
| leadTimeDays | Int | Lead time days for Part | 1, 10 |
| lotSizeMin | Int | Lot size min for Part | 1, 10 |
| lotSizeMultiple | Int | Lot size multiple for Part | 1, 10 |
| standardCost | Float | Standard cost for Part | 1.5, 10.25 |
| targetCost | Float | Target cost for Part | 1.5, 10.25 |
| currency | String | Currency for Part | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |
| isConfigurable | Boolean | Is configurable for Part | true, false |
| requiresFAI | Boolean | Requires f a i for Part | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| componentItems | BOMItem | Component items for Part | Example value |
| bomItems | BOMItem | Bom items for Part | Example value |
| equipmentMaterialMovements | EquipmentMaterialMovement | Equipment material movements for Part | Example value |
| erpMaterialTransactions | ERPMaterialTransaction | Erp material transactions for Part | Example value |
| inventoryItems | Inventory | Inventory items for Part | Example value |
| siteAvailability | PartSiteAvailability | Site availability for Part | Example value |
| replacementPart | Part | Replacement part for Part | Example value |
| replacedParts | Part | Replaced parts for Part | Example value |
| configurations | ProductConfiguration | Configurations for Part | Example value |
| lifecycleHistory | ProductLifecycle | Lifecycle history for Part | Example value |
| specifications | ProductSpecification | Technical specification | AMS4911 Standard |
| productionScheduleRequests | ProductionScheduleRequest | Production schedule requests for Part | Example value |
| qualityPlans | QualityPlan | Quality plans for Part | Example value |
| routings | Routing | Routings for Part | Example value |
| scheduleEntries | ScheduleEntry | Schedule entries for Part | Example value |
| serializedParts | SerializedPart | Serialized parts for Part | Example value |
| workOrders | WorkOrder | Work orders for Part | Example value |

## PartSiteAvailability

**Business Domain:** Core Infrastructure
**Fields:** 17

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| partId | String | Foreign key reference | site-001, user-123 |
| siteId | String | Foreign key reference | site-001, user-123 |
| isPreferred | Boolean | Is preferred for PartSiteAvailability | true, false |
| isActive | Boolean | Active status flag | true, false |
| leadTimeDays | Int | Lead time days for PartSiteAvailability | 1, 10 |
| minimumLotSize | Int | Minimum lot size for PartSiteAvailability | 1, 10 |
| maximumLotSize | Int | Maximum lot size for PartSiteAvailability | 1, 10 |
| standardCost | Float | Standard cost for PartSiteAvailability | 1.5, 10.25 |
| setupCost | Float | Setup cost for PartSiteAvailability | 1.5, 10.25 |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| expirationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| part | Part | Part for PartSiteAvailability | Example value |
| site | Site | Site for PartSiteAvailability | Example value |

## BOMItem

**Business Domain:** General Operations
**Fields:** 23

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| parentPartId | String | Foreign key reference | site-001, user-123 |
| componentPartId | String | Foreign key reference | site-001, user-123 |
| quantity | Float | Numerical quantity | 10, 25 |
| unitOfMeasure | String | Unit of measure for BOMItem | Example text, Sample value |
| scrapFactor | Float | Scrap factor for BOMItem | 1.5, 10.25 |
| sequence | Int | Sequence for BOMItem | 1, 10 |
| findNumber | String | Find number for BOMItem | Example text, Sample value |
| referenceDesignator | String | Reference designator for BOMItem | Example text, Sample value |
| operationId | String | Foreign key reference | site-001, user-123 |
| operationNumber | Int | Operation number for BOMItem | 1, 10 |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| obsoleteDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| ecoNumber | String | Eco number for BOMItem | Example text, Sample value |
| isOptional | Boolean | Is optional for BOMItem | true, false |
| isCritical | Boolean | Is critical for BOMItem | true, false |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| componentPart | Part | Component part for BOMItem | Example value |
| operation | Operation | Operation for BOMItem | Example value |
| parentPart | Part | Parent part for BOMItem | Example value |

## ProductSpecification

**Business Domain:** General Operations
**Fields:** 19

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| partId | String | Foreign key reference | site-001, user-123 |
| specificationName | String | Technical specification | AMS4911 Standard |
| specificationType | SpecificationType | Technical specification | AMS4911 Standard |
| specificationValue | String | Technical specification | AMS4911 Standard |
| nominalValue | Float | Nominal value for ProductSpecification | 1.5, 10.25 |
| minValue | Float | Min value for ProductSpecification | 1.5, 10.25 |
| maxValue | Float | Max value for ProductSpecification | 1.5, 10.25 |
| unitOfMeasure | String | Unit of measure for ProductSpecification | Example text, Sample value |
| testMethod | String | Test method for ProductSpecification | Example text, Sample value |
| inspectionFrequency | String | Quality inspection data | PASS, FAIL |
| isCritical | Boolean | Is critical for ProductSpecification | true, false |
| isRegulatory | Boolean | Is regulatory for ProductSpecification | true, false |
| documentReferences | String | Document references for ProductSpecification | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| part | Part | Part for ProductSpecification | Example value |

## ProductConfiguration

**Business Domain:** General Operations
**Fields:** 21

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| partId | String | Foreign key reference | site-001, user-123 |
| configurationName | String | Configuration name for ProductConfiguration | Example text, Sample value |
| configurationType | ConfigurationType | Configuration type for ProductConfiguration | Example value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| configurationCode | String | Configuration code for ProductConfiguration | Example text, Sample value |
| attributes | Json | Attributes for ProductConfiguration | Example value |
| priceModifier | Float | Price modifier for ProductConfiguration | 1.5, 10.25 |
| costModifier | Float | Cost modifier for ProductConfiguration | 1.5, 10.25 |
| leadTimeDelta | Int | Lead time delta for ProductConfiguration | 1, 10 |
| isAvailable | Boolean | Is available for ProductConfiguration | true, false |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| obsoleteDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| isDefault | Boolean | Is default for ProductConfiguration | true, false |
| marketingName | String | Marketing name for ProductConfiguration | Example text, Sample value |
| imageUrl | String | Image url for ProductConfiguration | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| options | ConfigurationOption | Options for ProductConfiguration | Example value |
| part | Part | Part for ProductConfiguration | Example value |

## ConfigurationOption

**Business Domain:** General Operations
**Fields:** 17

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| configurationId | String | Foreign key reference | site-001, user-123 |
| optionName | String | Option name for ConfigurationOption | Example text, Sample value |
| optionCode | String | Option code for ConfigurationOption | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| optionCategory | String | Option category for ConfigurationOption | Example text, Sample value |
| optionValue | String | Option value for ConfigurationOption | Example text, Sample value |
| isRequired | Boolean | Is required for ConfigurationOption | true, false |
| isDefault | Boolean | Is default for ConfigurationOption | true, false |
| addedPartIds | String | Added part ids for ConfigurationOption | Example text, Sample value |
| removedPartIds | String | Removed part ids for ConfigurationOption | Example text, Sample value |
| priceModifier | Float | Price modifier for ConfigurationOption | 1.5, 10.25 |
| costModifier | Float | Cost modifier for ConfigurationOption | 1.5, 10.25 |
| displayOrder | Int | Display order for ConfigurationOption | 1, 10 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| configuration | ProductConfiguration | Configuration for ConfigurationOption | Example value |

## ProductLifecycle

**Business Domain:** General Operations
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| partId | String | Foreign key reference | site-001, user-123 |
| previousState | ProductLifecycleState | Previous state for ProductLifecycle | Example value |
| newState | ProductLifecycleState | New state for ProductLifecycle | Example value |
| transitionDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| reason | String | Reason for ProductLifecycle | Example text, Sample value |
| ecoNumber | String | Eco number for ProductLifecycle | Example text, Sample value |
| approvedBy | String | Approved by for ProductLifecycle | Example text, Sample value |
| approvedAt | DateTime | Approved at for ProductLifecycle | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| notificationsSent | Boolean | Notifications sent for ProductLifecycle | true, false |
| impactAssessment | String | Impact assessment for ProductLifecycle | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| metadata | Json | Metadata for ProductLifecycle | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| part | Part | Part for ProductLifecycle | Example value |

## WorkOrder

**Business Domain:** Production Management
**Fields:** 46

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workOrderNumber | String | Work order identifier | WO-2024-001, WO-ENG-001 |
| partId | String | Foreign key reference | site-001, user-123 |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| quantity | Int | Numerical quantity | 10, 25 |
| quantityCompleted | Int | Numerical quantity | 10, 25 |
| quantityScrapped | Int | Numerical quantity | 10, 25 |
| priority | WorkOrderPriority | Business priority level | HIGH, NORMAL |
| status | WorkOrderStatus | Current operational status | ACTIVE, COMPLETED |
| dueDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| customerOrder | String | Customer order for WorkOrder | Example text, Sample value |
| routingId | String | Foreign key reference | site-001, user-123 |
| siteId | String | Foreign key reference | site-001, user-123 |
| createdById | String | Foreign key reference | site-001, user-123 |
| assignedToId | String | Foreign key reference | site-001, user-123 |
| startedAt | DateTime | Started at for WorkOrder | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| actualStartDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| completedAt | DateTime | Completed at for WorkOrder | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| actualEndDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| dispatchLogs | DispatchLog | Dispatch logs for WorkOrder | Example value |
| equipmentCommands | EquipmentCommand | Equipment commands for WorkOrder | Example value |
| equipmentDataCollections | EquipmentDataCollection | Equipment data collections for WorkOrder | Example value |
| equipmentMaterialMovements | EquipmentMaterialMovement | Equipment material movements for WorkOrder | Example value |
| erpMaterialTransactions | ERPMaterialTransaction | Erp material transactions for WorkOrder | Example value |
| laborTimeEntries | LaborTimeEntry | Labor time entries for WorkOrder | Example value |
| machineTimeEntries | MachineTimeEntry | Machine time entries for WorkOrder | Example value |
| materialTransactions | MaterialTransaction | Material transactions for WorkOrder | Example value |
| ncrs | NCR | Ncrs for WorkOrder | Example value |
| processDataCollections | ProcessDataCollection | Process data collections for WorkOrder | Example value |
| productionPerformanceActuals | ProductionPerformanceActual | Production performance actuals for WorkOrder | Example value |
| productionScheduleRequests | ProductionScheduleRequest | Production schedule requests for WorkOrder | Example value |
| variances | ProductionVariance | Variances for WorkOrder | Example value |
| qifMeasurementPlans | QIFMeasurementPlan | Qif measurement plans for WorkOrder | Example value |
| qifMeasurementResults | QIFMeasurementResult | Qif measurement results for WorkOrder | Example value |
| qualityInspections | QualityInspection | Quality inspections for WorkOrder | Example value |
| scheduleEntry | ScheduleEntry | Schedule entry for WorkOrder | Example value |
| operations | WorkOrderOperation | Operations for WorkOrder | Example value |
| statusHistory | WorkOrderStatusHistory | Status history for WorkOrder | Example value |
| assignedTo | User | Assigned to for WorkOrder | Example value |
| createdBy | User | Created by for WorkOrder | Example value |
| part | Part | Part for WorkOrder | Example value |
| routing | Routing | Routing for WorkOrder | Example value |
| site | Site | Site for WorkOrder | Example value |
| workPerformance | WorkPerformance | Work performance for WorkOrder | Example value |

## Routing

**Business Domain:** General Operations
**Fields:** 30

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| routingNumber | String | Routing number for Routing | Example text, Sample value |
| partId | String | Foreign key reference | site-001, user-123 |
| siteId | String | Foreign key reference | site-001, user-123 |
| version | String | Version for Routing | Example text, Sample value |
| lifecycleState | RoutingLifecycleState | Lifecycle state for Routing | Example value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| isPrimaryRoute | Boolean | Is primary route for Routing | true, false |
| isActive | Boolean | Active status flag | true, false |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| expirationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| routingType | RoutingType | Routing type for Routing | Example value |
| alternateForId | String | Foreign key reference | site-001, user-123 |
| priority | Int | Business priority level | HIGH, NORMAL |
| approvedBy | String | Approved by for Routing | Example text, Sample value |
| approvedAt | DateTime | Approved at for Routing | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| visualData | Json | Visual data for Routing | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdBy | String | Created by for Routing | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| operations | RoutingOperation | Operations for Routing | Example value |
| steps | RoutingStep | Steps for Routing | Example value |
| templateSources | RoutingTemplate | Template sources for Routing | Example value |
| alternateFor | Routing | Alternate for for Routing | Example value |
| alternateRoutes | Routing | Alternate routes for Routing | Example value |
| part | Part | Part for Routing | Example value |
| site | Site | Site for Routing | Example value |
| scheduleEntries | ScheduleEntry | Schedule entries for Routing | Example value |
| workOrders | WorkOrder | Work orders for Routing | Example value |

## RoutingOperation

**Business Domain:** General Operations
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| routingId | String | Foreign key reference | site-001, user-123 |
| operationNumber | Int | Operation number for RoutingOperation | 1, 10 |
| operationName | String | Operation name for RoutingOperation | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| setupTime | Float | Setup time for RoutingOperation | 1.5, 10.25 |
| cycleTime | Float | Cycle time for RoutingOperation | 1.5, 10.25 |
| workCenterId | String | Foreign key reference | site-001, user-123 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| routing | Routing | Routing for RoutingOperation | Example value |
| workCenter | WorkCenter | Work center for RoutingOperation | Example value |
| workOrderOps | WorkOrderOperation | Work order ops for RoutingOperation | Example value |

## RoutingStep

**Business Domain:** General Operations
**Fields:** 26

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| routingId | String | Foreign key reference | site-001, user-123 |
| stepNumber | Int | Step number for RoutingStep | 1, 10 |
| operationId | String | Foreign key reference | site-001, user-123 |
| workCenterId | String | Foreign key reference | site-001, user-123 |
| stepType | StepType | Step type for RoutingStep | Example value |
| controlType | ControlType | Control type for RoutingStep | Example value |
| setupTimeOverride | Int | Setup time override for RoutingStep | 1, 10 |
| cycleTimeOverride | Int | Cycle time override for RoutingStep | 1, 10 |
| teardownTimeOverride | Int | Teardown time override for RoutingStep | 1, 10 |
| isOptional | Boolean | Is optional for RoutingStep | true, false |
| isQualityInspection | Boolean | Is quality inspection for RoutingStep | true, false |
| isCriticalPath | Boolean | Is critical path for RoutingStep | true, false |
| workInstructionId | String | Foreign key reference | site-001, user-123 |
| stepInstructions | String | Step instructions for RoutingStep | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| dependencies | RoutingStepDependency | Dependencies for RoutingStep | Example value |
| prerequisites | RoutingStepDependency | Prerequisites for RoutingStep | Example value |
| parameterOverrides | RoutingStepParameter | Parameter overrides for RoutingStep | Example value |
| operation | Operation | Operation for RoutingStep | Example value |
| routing | Routing | Routing for RoutingStep | Example value |
| workCenter | WorkCenter | Work center for RoutingStep | Example value |
| workInstruction | WorkInstruction | Work instruction for RoutingStep | Example value |
| workOrderOperations | WorkOrderOperation | Work order operations for RoutingStep | Example value |

## RoutingStepDependency

**Business Domain:** General Operations
**Fields:** 10

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| dependentStepId | String | Foreign key reference | site-001, user-123 |
| prerequisiteStepId | String | Foreign key reference | site-001, user-123 |
| dependencyType | DependencyType | Dependency type for RoutingStepDependency | Example value |
| timingType | DependencyTimingType | Timing type for RoutingStepDependency | Example value |
| lagTime | Int | Lag time for RoutingStepDependency | 1, 10 |
| leadTime | Int | Lead time for RoutingStepDependency | 1, 10 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| dependentStep | RoutingStep | Dependent step for RoutingStepDependency | Example value |
| prerequisiteStep | RoutingStep | Prerequisite step for RoutingStepDependency | Example value |

## RoutingStepParameter

**Business Domain:** General Operations
**Fields:** 9

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| routingStepId | String | Foreign key reference | site-001, user-123 |
| parameterName | String | Parameter name for RoutingStepParameter | Example text, Sample value |
| parameterValue | String | Parameter value for RoutingStepParameter | Example text, Sample value |
| unitOfMeasure | String | Unit of measure for RoutingStepParameter | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| routingStep | RoutingStep | Routing step for RoutingStepParameter | Example value |

## RoutingTemplate

**Business Domain:** General Operations
**Fields:** 19

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| name | String | Name information | John, Doe |
| number | String | Number for RoutingTemplate | Example text, Sample value |
| category | String | Category for RoutingTemplate | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| tags | String | Tags for RoutingTemplate | Example text, Sample value |
| isPublic | Boolean | Is public for RoutingTemplate | true, false |
| isFavorite | Boolean | Is favorite for RoutingTemplate | true, false |
| usageCount | Int | Usage count for RoutingTemplate | 1, 10 |
| rating | Float | Rating for RoutingTemplate | 1.5, 10.25 |
| visualData | Json | Visual data for RoutingTemplate | Example value |
| sourceRoutingId | String | Foreign key reference | site-001, user-123 |
| createdById | String | Foreign key reference | site-001, user-123 |
| siteId | String | Foreign key reference | site-001, user-123 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdBy | User | Created by for RoutingTemplate | Example value |
| site | Site | Site for RoutingTemplate | Example value |
| sourceRouting | Routing | Source routing for RoutingTemplate | Example value |

## WorkCenter

**Business Domain:** General Operations
**Fields:** 16

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| name | String | Name information | John, Doe |
| description | String | Text description | Manufacturing notes, Quality requirements |
| capacity | Float | Capacity for WorkCenter | 1.5, 10.25 |
| areaId | String | Foreign key reference | site-001, user-123 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| dispatchLogs | DispatchLog | Dispatch logs for WorkCenter | Example value |
| equipment | Equipment | Equipment for WorkCenter | Example value |
| personnelAssignments | PersonnelWorkCenterAssignment | Personnel assignments for WorkCenter | Example value |
| operations | RoutingOperation | Operations for WorkCenter | Example value |
| routingSteps | RoutingStep | Routing steps for WorkCenter | Example value |
| scheduleEntries | ScheduleEntry | Schedule entries for WorkCenter | Example value |
| area | Area | Area for WorkCenter | Example value |
| workUnits | WorkUnit | Work units for WorkCenter | Example value |

## WorkUnit

**Business Domain:** General Operations
**Fields:** 10

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workUnitCode | String | Work unit code for WorkUnit | Example text, Sample value |
| workUnitName | String | Work unit name for WorkUnit | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| workCenterId | String | Foreign key reference | site-001, user-123 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| equipment | Equipment | Equipment for WorkUnit | Example value |
| workCenter | WorkCenter | Work center for WorkUnit | Example value |

## WorkOrderOperation

**Business Domain:** Production Management
**Fields:** 19

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| routingOperationId | String | Foreign key reference | site-001, user-123 |
| status | WorkOrderOperationStatus | Current operational status | ACTIVE, COMPLETED |
| quantity | Int | Numerical quantity | 10, 25 |
| quantityCompleted | Int | Numerical quantity | 10, 25 |
| quantityScrap | Int | Numerical quantity | 10, 25 |
| startedAt | DateTime | Started at for WorkOrderOperation | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for WorkOrderOperation | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| routingStepId | String | Foreign key reference | site-001, user-123 |
| laborTimeEntries | LaborTimeEntry | Labor time entries for WorkOrderOperation | Example value |
| machineTimeEntries | MachineTimeEntry | Machine time entries for WorkOrderOperation | Example value |
| variances | ProductionVariance | Variances for WorkOrderOperation | Example value |
| routingOperation | RoutingOperation | Routing operation for WorkOrderOperation | Example value |
| RoutingStep | RoutingStep | Routing step for WorkOrderOperation | Example value |
| workOrder | WorkOrder | Work order for WorkOrderOperation | Example value |
| workPerformance | WorkPerformance | Work performance for WorkOrderOperation | Example value |

## ProductionSchedule

**Business Domain:** General Operations
**Fields:** 28

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| scheduleNumber | String | Schedule number for ProductionSchedule | Example text, Sample value |
| scheduleName | String | Schedule name for ProductionSchedule | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| periodStart | DateTime | Period start for ProductionSchedule | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| periodEnd | DateTime | Period end for ProductionSchedule | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| periodType | String | Period type for ProductionSchedule | Example text, Sample value |
| siteId | String | Foreign key reference | site-001, user-123 |
| areaId | String | Foreign key reference | site-001, user-123 |
| state | ScheduleState | State for ProductionSchedule | Example value |
| stateChangedAt | DateTime | State changed at for ProductionSchedule | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| stateChangedBy | String | State changed by for ProductionSchedule | Example text, Sample value |
| priority | SchedulePriority | Business priority level | HIGH, NORMAL |
| plannedBy | String | Planned by for ProductionSchedule | Example text, Sample value |
| approvedBy | String | Approved by for ProductionSchedule | Example text, Sample value |
| approvedAt | DateTime | Approved at for ProductionSchedule | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| dispatchedCount | Int | Dispatched count for ProductionSchedule | 1, 10 |
| totalEntries | Int | Total entries for ProductionSchedule | 1, 10 |
| isLocked | Boolean | Is locked for ProductionSchedule | true, false |
| isFeasible | Boolean | Is feasible for ProductionSchedule | true, false |
| feasibilityNotes | String | Feasibility notes for ProductionSchedule | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| metadata | Json | Metadata for ProductionSchedule | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| site | Site | Site for ProductionSchedule | Example value |
| entries | ScheduleEntry | Entries for ProductionSchedule | Example value |
| stateHistory | ScheduleStateHistory | State history for ProductionSchedule | Example value |

## ScheduleEntry

**Business Domain:** General Operations
**Fields:** 39

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| scheduleId | String | Foreign key reference | site-001, user-123 |
| entryNumber | Int | Entry number for ScheduleEntry | 1, 10 |
| partId | String | Foreign key reference | site-001, user-123 |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| description | String | Text description | Manufacturing notes, Quality requirements |
| plannedQuantity | Float | Planned quantity for ScheduleEntry | 1.5, 10.25 |
| dispatchedQuantity | Float | Dispatched quantity for ScheduleEntry | 1.5, 10.25 |
| completedQuantity | Float | Completed quantity for ScheduleEntry | 1.5, 10.25 |
| unitOfMeasure | String | Unit of measure for ScheduleEntry | Example text, Sample value |
| plannedStartDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| plannedEndDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| actualStartDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| actualEndDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| priority | SchedulePriority | Business priority level | HIGH, NORMAL |
| sequenceNumber | Int | Sequence number for ScheduleEntry | 1, 10 |
| estimatedDuration | Int | Estimated duration for ScheduleEntry | 1, 10 |
| workCenterId | String | Foreign key reference | site-001, user-123 |
| routingId | String | Foreign key reference | site-001, user-123 |
| customerOrder | String | Customer order for ScheduleEntry | Example text, Sample value |
| customerDueDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| salesOrder | String | Sales order for ScheduleEntry | Example text, Sample value |
| isDispatched | Boolean | Is dispatched for ScheduleEntry | true, false |
| dispatchedAt | DateTime | Dispatched at for ScheduleEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| dispatchedBy | String | Dispatched by for ScheduleEntry | Example text, Sample value |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| isCancelled | Boolean | Is cancelled for ScheduleEntry | true, false |
| cancelledAt | DateTime | Cancelled at for ScheduleEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| cancelledReason | String | Cancelled reason for ScheduleEntry | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| metadata | Json | Metadata for ScheduleEntry | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| constraints | ScheduleConstraint | Constraints for ScheduleEntry | Example value |
| part | Part | Part for ScheduleEntry | Example value |
| routing | Routing | Routing for ScheduleEntry | Example value |
| schedule | ProductionSchedule | Schedule for ScheduleEntry | Example value |
| workCenter | WorkCenter | Work center for ScheduleEntry | Example value |
| workOrder | WorkOrder | Work order for ScheduleEntry | Example value |

## ScheduleConstraint

**Business Domain:** General Operations
**Fields:** 24

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| entryId | String | Foreign key reference | site-001, user-123 |
| constraintType | ConstraintType | Constraint type for ScheduleConstraint | Example value |
| constraintName | String | Constraint name for ScheduleConstraint | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| resourceId | String | Foreign key reference | site-001, user-123 |
| resourceType | String | Resource type for ScheduleConstraint | Example text, Sample value |
| requiredQuantity | Float | Required quantity for ScheduleConstraint | 1.5, 10.25 |
| availableQuantity | Float | Available quantity for ScheduleConstraint | 1.5, 10.25 |
| unitOfMeasure | String | Unit of measure for ScheduleConstraint | Example text, Sample value |
| constraintDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| leadTimeDays | Int | Lead time days for ScheduleConstraint | 1, 10 |
| isViolated | Boolean | Is violated for ScheduleConstraint | true, false |
| violationSeverity | String | Violation severity for ScheduleConstraint | Example text, Sample value |
| violationMessage | String | Violation message for ScheduleConstraint | Example text, Sample value |
| isResolved | Boolean | Is resolved for ScheduleConstraint | true, false |
| resolvedAt | DateTime | Resolved at for ScheduleConstraint | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| resolvedBy | String | Resolved by for ScheduleConstraint | Example text, Sample value |
| resolutionNotes | String | Resolution notes for ScheduleConstraint | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| metadata | Json | Metadata for ScheduleConstraint | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| entry | ScheduleEntry | Entry for ScheduleConstraint | Example value |

## ScheduleStateHistory

**Business Domain:** General Operations
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| scheduleId | String | Foreign key reference | site-001, user-123 |
| previousState | ScheduleState | Previous state for ScheduleStateHistory | Example value |
| newState | ScheduleState | New state for ScheduleStateHistory | Example value |
| transitionDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| reason | String | Reason for ScheduleStateHistory | Example text, Sample value |
| changedBy | String | Changed by for ScheduleStateHistory | Example text, Sample value |
| entriesAffected | Int | Entries affected for ScheduleStateHistory | 1, 10 |
| notificationsSent | Boolean | Notifications sent for ScheduleStateHistory | true, false |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| metadata | Json | Metadata for ScheduleStateHistory | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| schedule | ProductionSchedule | Schedule for ScheduleStateHistory | Example value |

## WorkOrderStatusHistory

**Business Domain:** Production Management
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| previousStatus | WorkOrderStatus | Previous status for WorkOrderStatusHistory | Example value |
| newStatus | WorkOrderStatus | New status for WorkOrderStatusHistory | Example value |
| transitionDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| reason | String | Reason for WorkOrderStatusHistory | Example text, Sample value |
| changedBy | String | Changed by for WorkOrderStatusHistory | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| quantityAtTransition | Int | Numerical quantity | 10, 25 |
| scrapAtTransition | Int | Scrap at transition for WorkOrderStatusHistory | 1, 10 |
| metadata | Json | Metadata for WorkOrderStatusHistory | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| workOrder | WorkOrder | Work order for WorkOrderStatusHistory | Example value |

## DispatchLog

**Business Domain:** General Operations
**Fields:** 19

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| dispatchedAt | DateTime | Dispatched at for DispatchLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| dispatchedBy | String | Dispatched by for DispatchLog | Example text, Sample value |
| dispatchedFrom | String | Dispatched from for DispatchLog | Example text, Sample value |
| assignedToId | String | Foreign key reference | site-001, user-123 |
| workCenterId | String | Foreign key reference | site-001, user-123 |
| priorityOverride | WorkOrderPriority | Priority override for DispatchLog | Example value |
| expectedStartDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| expectedEndDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| quantityDispatched | Int | Numerical quantity | 10, 25 |
| materialReserved | Boolean | Material reserved for DispatchLog | true, false |
| toolingReserved | Boolean | Tooling reserved for DispatchLog | true, false |
| dispatchNotes | String | Dispatch notes for DispatchLog | Example text, Sample value |
| metadata | Json | Metadata for DispatchLog | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| assignedTo | User | Assigned to for DispatchLog | Example value |
| workCenter | WorkCenter | Work center for DispatchLog | Example value |
| workOrder | WorkOrder | Work order for DispatchLog | Example value |

## WorkPerformance

**Business Domain:** General Operations
**Fields:** 37

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| performanceType | WorkPerformanceType | Performance type for WorkPerformance | Example value |
| recordedAt | DateTime | Recorded at for WorkPerformance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| recordedBy | String | Recorded by for WorkPerformance | Example text, Sample value |
| personnelId | String | Foreign key reference | site-001, user-123 |
| laborHours | Float | Labor hours for WorkPerformance | 1.5, 10.25 |
| laborCost | Float | Labor cost for WorkPerformance | 1.5, 10.25 |
| laborEfficiency | Float | Labor efficiency for WorkPerformance | 1.5, 10.25 |
| partId | String | Foreign key reference | site-001, user-123 |
| quantityConsumed | Float | Numerical quantity | 10, 25 |
| quantityPlanned | Float | Numerical quantity | 10, 25 |
| materialVariance | Float | Material variance for WorkPerformance | 1.5, 10.25 |
| unitCost | Float | Unit cost for WorkPerformance | 1.5, 10.25 |
| totalCost | Float | Total cost for WorkPerformance | 1.5, 10.25 |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| setupTime | Float | Setup time for WorkPerformance | 1.5, 10.25 |
| runTime | Float | Run time for WorkPerformance | 1.5, 10.25 |
| plannedSetupTime | Float | Planned setup time for WorkPerformance | 1.5, 10.25 |
| plannedRunTime | Float | Planned run time for WorkPerformance | 1.5, 10.25 |
| quantityProduced | Int | Numerical quantity | 10, 25 |
| quantityGood | Int | Numerical quantity | 10, 25 |
| quantityScrap | Int | Numerical quantity | 10, 25 |
| quantityRework | Int | Numerical quantity | 10, 25 |
| yieldPercentage | Float | Yield percentage for WorkPerformance | 1.5, 10.25 |
| scrapReason | String | Scrap reason for WorkPerformance | Example text, Sample value |
| downtimeMinutes | Float | Downtime minutes for WorkPerformance | 1.5, 10.25 |
| downtimeReason | String | Downtime reason for WorkPerformance | Example text, Sample value |
| downtimeCategory | String | Downtime category for WorkPerformance | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| metadata | Json | Metadata for WorkPerformance | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| operation | WorkOrderOperation | Operation for WorkPerformance | Example value |
| personnel | User | Personnel for WorkPerformance | Example value |
| workOrder | WorkOrder | Work order for WorkPerformance | Example value |

## ProductionVariance

**Business Domain:** General Operations
**Fields:** 26

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| varianceType | VarianceType | Variance type for ProductionVariance | Example value |
| varianceName | String | Variance name for ProductionVariance | Example text, Sample value |
| plannedValue | Float | Planned value for ProductionVariance | 1.5, 10.25 |
| actualValue | Float | Actual value for ProductionVariance | 1.5, 10.25 |
| variance | Float | Variance for ProductionVariance | 1.5, 10.25 |
| variancePercent | Float | Variance percent for ProductionVariance | 1.5, 10.25 |
| isFavorable | Boolean | Is favorable for ProductionVariance | true, false |
| costImpact | Float | Cost impact for ProductionVariance | 1.5, 10.25 |
| rootCause | String | Root cause for ProductionVariance | Example text, Sample value |
| correctiveAction | String | Corrective action for ProductionVariance | Example text, Sample value |
| responsibleParty | String | Responsible party for ProductionVariance | Example text, Sample value |
| calculatedAt | DateTime | Calculated at for ProductionVariance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| periodStart | DateTime | Period start for ProductionVariance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| periodEnd | DateTime | Period end for ProductionVariance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| isResolved | Boolean | Is resolved for ProductionVariance | true, false |
| resolvedAt | DateTime | Resolved at for ProductionVariance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| resolvedBy | String | Resolved by for ProductionVariance | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| metadata | Json | Metadata for ProductionVariance | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| operation | WorkOrderOperation | Operation for ProductionVariance | Example value |
| workOrder | WorkOrder | Work order for ProductionVariance | Example value |

## QualityPlan

**Business Domain:** Quality Management
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| planNumber | String | Plan number for QualityPlan | Example text, Sample value |
| planName | String | Plan name for QualityPlan | Example text, Sample value |
| partId | String | Foreign key reference | site-001, user-123 |
| operation | String | Operation for QualityPlan | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| characteristics | QualityCharacteristic | Characteristics for QualityPlan | Example value |
| inspections | QualityInspection | Quality inspection data | PASS, FAIL |
| part | Part | Part for QualityPlan | Example value |

## QualityCharacteristic

**Business Domain:** Quality Management
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| planId | String | Foreign key reference | site-001, user-123 |
| characteristic | String | Characteristic for QualityCharacteristic | Example text, Sample value |
| specification | String | Technical specification | AMS4911 Standard |
| toleranceType | QualityToleranceType | Tolerance type for QualityCharacteristic | Example value |
| nominalValue | Float | Nominal value for QualityCharacteristic | 1.5, 10.25 |
| upperLimit | Float | Upper limit for QualityCharacteristic | 1.5, 10.25 |
| lowerLimit | Float | Lower limit for QualityCharacteristic | 1.5, 10.25 |
| unitOfMeasure | String | Unit of measure for QualityCharacteristic | Example text, Sample value |
| inspectionMethod | String | Quality inspection data | PASS, FAIL |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| plan | QualityPlan | Plan for QualityCharacteristic | Example value |
| measurements | QualityMeasurement | Measurements for QualityCharacteristic | Example value |

## QualityInspection

**Business Domain:** Quality Management
**Fields:** 18

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| inspectionNumber | String | Quality inspection data | PASS, FAIL |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| planId | String | Foreign key reference | site-001, user-123 |
| inspectorId | String | Foreign key reference | site-001, user-123 |
| status | QualityInspectionStatus | Current operational status | ACTIVE, COMPLETED |
| result | QualityInspectionResult | Result for QualityInspection | Example value |
| quantity | Int | Numerical quantity | 10, 25 |
| startedAt | DateTime | Started at for QualityInspection | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for QualityInspection | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| ncrs | NCR | Ncrs for QualityInspection | Example value |
| inspector | User | Inspector for QualityInspection | Example value |
| plan | QualityPlan | Plan for QualityInspection | Example value |
| workOrder | WorkOrder | Work order for QualityInspection | Example value |
| measurements | QualityMeasurement | Measurements for QualityInspection | Example value |

## QualityMeasurement

**Business Domain:** Quality Management
**Fields:** 9

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| inspectionId | String | Foreign key reference | site-001, user-123 |
| characteristicId | String | Foreign key reference | site-001, user-123 |
| measuredValue | Float | Measured value for QualityMeasurement | 1.5, 10.25 |
| result | String | Result for QualityMeasurement | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| characteristic | QualityCharacteristic | Characteristic for QualityMeasurement | Example value |
| inspection | QualityInspection | Quality inspection data | PASS, FAIL |

## NCR

**Business Domain:** General Operations
**Fields:** 26

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| ncrNumber | String | Ncr number for NCR | Example text, Sample value |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| inspectionId | String | Foreign key reference | site-001, user-123 |
| siteId | String | Foreign key reference | site-001, user-123 |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| operation | String | Operation for NCR | Example text, Sample value |
| defectType | String | Defect type for NCR | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| severity | NCRSeverity | Severity for NCR | Example value |
| status | NCRStatus | Current operational status | ACTIVE, COMPLETED |
| quantity | Int | Numerical quantity | 10, 25 |
| createdById | String | Foreign key reference | site-001, user-123 |
| assignedToId | String | Foreign key reference | site-001, user-123 |
| dueDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| rootCause | String | Root cause for NCR | Example text, Sample value |
| correctiveAction | String | Corrective action for NCR | Example text, Sample value |
| preventiveAction | String | Preventive action for NCR | Example text, Sample value |
| closedAt | DateTime | Closed at for NCR | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| assignedTo | User | Assigned to for NCR | Example value |
| createdBy | User | Created by for NCR | Example value |
| inspection | QualityInspection | Quality inspection data | PASS, FAIL |
| site | Site | Site for NCR | Example value |
| workOrder | WorkOrder | Work order for NCR | Example value |

## Equipment

**Business Domain:** Equipment Management
**Fields:** 47

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| equipmentNumber | String | Equipment number for Equipment | Example text, Sample value |
| name | String | Name information | John, Doe |
| description | String | Text description | Manufacturing notes, Quality requirements |
| equipmentClass | EquipmentClass | Equipment class for Equipment | Example value |
| equipmentType | String | Equipment type for Equipment | Example text, Sample value |
| equipmentLevel | Int | Equipment level for Equipment | 1, 10 |
| parentEquipmentId | String | Foreign key reference | site-001, user-123 |
| manufacturer | String | Manufacturer for Equipment | Example text, Sample value |
| model | String | Model for Equipment | Example text, Sample value |
| serialNumber | String | Unique serial number | SN-ENG-001-20241030 |
| installDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| commissionDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| siteId | String | Foreign key reference | site-001, user-123 |
| areaId | String | Foreign key reference | site-001, user-123 |
| workCenterId | String | Foreign key reference | site-001, user-123 |
| workUnitId | String | Foreign key reference | site-001, user-123 |
| status | EquipmentStatus | Current operational status | ACTIVE, COMPLETED |
| currentState | EquipmentState | Current state for Equipment | Example value |
| stateChangedAt | DateTime | State changed at for Equipment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| utilizationRate | Float | Utilization rate for Equipment | 1.5, 10.25 |
| availability | Float | Availability for Equipment | 1.5, 10.25 |
| performance | Float | Performance for Equipment | 1.5, 10.25 |
| quality | Float | Quality for Equipment | 1.5, 10.25 |
| oee | Float | Oee for Equipment | 1.5, 10.25 |
| ratedCapacity | Float | Rated capacity for Equipment | 1.5, 10.25 |
| currentCapacity | Float | Current capacity for Equipment | 1.5, 10.25 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| area | Area | Area for Equipment | Example value |
| parentEquipment | Equipment | Parent equipment for Equipment | Example value |
| childEquipment | Equipment | Child equipment for Equipment | Example value |
| site | Site | Site for Equipment | Example value |
| workCenter | WorkCenter | Work center for Equipment | Example value |
| workUnit | WorkUnit | Work unit for Equipment | Example value |
| capabilities | EquipmentCapability | Capabilities for Equipment | Example value |
| equipmentCommands | EquipmentCommand | Equipment commands for Equipment | Example value |
| equipmentDataCollections | EquipmentDataCollection | Equipment data collections for Equipment | Example value |
| logs | EquipmentLog | Logs for Equipment | Example value |
| equipmentMaterialMovements | EquipmentMaterialMovement | Equipment material movements for Equipment | Example value |
| performanceData | EquipmentPerformanceLog | Performance data for Equipment | Example value |
| stateHistory | EquipmentStateHistory | State history for Equipment | Example value |
| machineTimeEntries | MachineTimeEntry | Machine time entries for Equipment | Example value |
| maintenanceWorkOrders | MaintenanceWorkOrder | Maintenance work orders for Equipment | Example value |
| processDataCollections | ProcessDataCollection | Process data collections for Equipment | Example value |
| productionScheduleRequests | ProductionScheduleRequest | Production schedule requests for Equipment | Example value |

## EquipmentCapability

**Business Domain:** Equipment Management
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| capabilityType | String | Capability type for EquipmentCapability | Example text, Sample value |
| capability | String | Capability for EquipmentCapability | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| parameters | Json | Parameters for EquipmentCapability | Example value |
| certifiedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| expiryDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| equipment | Equipment | Equipment for EquipmentCapability | Example value |

## EquipmentLog

**Business Domain:** Equipment Management
**Fields:** 8

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| logType | EquipmentLogType | Log type for EquipmentLog | Example value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| userId | String | Foreign key reference | site-001, user-123 |
| loggedAt | DateTime | Logged at for EquipmentLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| equipment | Equipment | Equipment for EquipmentLog | Example value |
| user | User | User for EquipmentLog | Example value |

## EquipmentStateHistory

**Business Domain:** Equipment Management
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| previousState | EquipmentState | Previous state for EquipmentStateHistory | Example value |
| newState | EquipmentState | New state for EquipmentStateHistory | Example value |
| reason | String | Reason for EquipmentStateHistory | Example text, Sample value |
| changedBy | String | Changed by for EquipmentStateHistory | Example text, Sample value |
| stateStartTime | DateTime | State start time for EquipmentStateHistory | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| stateEndTime | DateTime | State end time for EquipmentStateHistory | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| duration | Int | Duration for EquipmentStateHistory | 1, 10 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| downtime | Boolean | Downtime for EquipmentStateHistory | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| equipment | Equipment | Equipment for EquipmentStateHistory | Example value |

## EquipmentPerformanceLog

**Business Domain:** Equipment Management
**Fields:** 30

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| periodStart | DateTime | Period start for EquipmentPerformanceLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| periodEnd | DateTime | Period end for EquipmentPerformanceLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| periodType | PerformancePeriodType | Period type for EquipmentPerformanceLog | Example value |
| plannedProductionTime | Int | Planned production time for EquipmentPerformanceLog | 1, 10 |
| operatingTime | Int | Operating time for EquipmentPerformanceLog | 1, 10 |
| downtime | Int | Downtime for EquipmentPerformanceLog | 1, 10 |
| availability | Float | Availability for EquipmentPerformanceLog | 1.5, 10.25 |
| idealCycleTime | Float | Ideal cycle time for EquipmentPerformanceLog | 1.5, 10.25 |
| actualCycleTime | Float | Actual cycle time for EquipmentPerformanceLog | 1.5, 10.25 |
| totalUnitsProduced | Int | Total units produced for EquipmentPerformanceLog | 1, 10 |
| targetProduction | Int | Target production for EquipmentPerformanceLog | 1, 10 |
| performance | Float | Performance for EquipmentPerformanceLog | 1.5, 10.25 |
| goodUnits | Int | Good units for EquipmentPerformanceLog | 1, 10 |
| rejectedUnits | Int | Rejected units for EquipmentPerformanceLog | 1, 10 |
| scrapUnits | Int | Scrap units for EquipmentPerformanceLog | 1, 10 |
| reworkUnits | Int | Rework units for EquipmentPerformanceLog | 1, 10 |
| quality | Float | Quality for EquipmentPerformanceLog | 1.5, 10.25 |
| oee | Float | Oee for EquipmentPerformanceLog | 1.5, 10.25 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| partId | String | Foreign key reference | site-001, user-123 |
| operatorId | String | Foreign key reference | site-001, user-123 |
| teep | Float | Teep for EquipmentPerformanceLog | 1.5, 10.25 |
| utilizationRate | Float | Utilization rate for EquipmentPerformanceLog | 1.5, 10.25 |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| hasAnomalies | Boolean | Has anomalies for EquipmentPerformanceLog | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| calculatedAt | DateTime | Calculated at for EquipmentPerformanceLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| equipment | Equipment | Equipment for EquipmentPerformanceLog | Example value |

## Inventory

**Business Domain:** Material Management
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| partId | String | Foreign key reference | site-001, user-123 |
| location | String | Location for Inventory | Example text, Sample value |
| lotNumber | String | Material lot identifier | LOT-TI-20241015 |
| quantity | Float | Numerical quantity | 10, 25 |
| unitOfMeasure | String | Unit of measure for Inventory | Example text, Sample value |
| unitCost | Float | Unit cost for Inventory | 1.5, 10.25 |
| receivedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| expiryDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| part | Part | Part for Inventory | Example value |
| transactions | MaterialTransaction | Transactions for Inventory | Example value |

## MaterialTransaction

**Business Domain:** Material Management
**Fields:** 11

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| inventoryId | String | Foreign key reference | site-001, user-123 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| transactionType | MaterialTransactionType | Transaction type for MaterialTransaction | Example value |
| quantity | Float | Numerical quantity | 10, 25 |
| unitOfMeasure | String | Unit of measure for MaterialTransaction | Example text, Sample value |
| reference | String | Reference for MaterialTransaction | Example text, Sample value |
| transactionDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| inventory | Inventory | Inventory for MaterialTransaction | Example value |
| workOrder | WorkOrder | Work order for MaterialTransaction | Example value |

## SerializedPart

**Business Domain:** General Operations
**Fields:** 17

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| serialNumber | String | Unique serial number | SN-ENG-001-20241030 |
| partId | String | Foreign key reference | site-001, user-123 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| lotNumber | String | Material lot identifier | LOT-TI-20241015 |
| status | String | Current operational status | ACTIVE, COMPLETED |
| currentLocation | String | Current location for SerializedPart | Example text, Sample value |
| manufactureDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| shipDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| customerInfo | String | Customer info for SerializedPart | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| inspectionRecords | InspectionRecord | Quality inspection data | PASS, FAIL |
| components | PartGenealogy | Components for SerializedPart | Example value |
| genealogy | PartGenealogy | Genealogy for SerializedPart | Example value |
| qifMeasurementResults | QIFMeasurementResult | Qif measurement results for SerializedPart | Example value |
| part | Part | Part for SerializedPart | Example value |

## PartGenealogy

**Business Domain:** General Operations
**Fields:** 8

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| parentPartId | String | Foreign key reference | site-001, user-123 |
| componentPartId | String | Foreign key reference | site-001, user-123 |
| assemblyDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| assemblyOperator | String | Assembly operator for PartGenealogy | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| componentPart | SerializedPart | Component part for PartGenealogy | Example value |
| parentPart | SerializedPart | Parent part for PartGenealogy | Example value |

## WorkInstruction

**Business Domain:** Document Management
**Fields:** 36

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| title | String | Title for WorkInstruction | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| partId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| version | String | Version for WorkInstruction | Example text, Sample value |
| status | WorkInstructionStatus | Current operational status | ACTIVE, COMPLETED |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| supersededDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| ecoNumber | String | Eco number for WorkInstruction | Example text, Sample value |
| approvedById | String | Foreign key reference | site-001, user-123 |
| approvedAt | DateTime | Approved at for WorkInstruction | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| approvalHistory | Json | Approval history for WorkInstruction | Example value |
| createdById | String | Foreign key reference | site-001, user-123 |
| updatedById | String | Foreign key reference | site-001, user-123 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| operationType | String | Operation type for WorkInstruction | Example text, Sample value |
| requiredForExecution | Boolean | Required for execution for WorkInstruction | true, false |
| contentFormat | WorkInstructionFormat | Content format for WorkInstruction | Example value |
| nativeContent | Json | Native content for WorkInstruction | Example value |
| importedFromFile | String | Imported from file for WorkInstruction | Example text, Sample value |
| exportTemplateId | String | Foreign key reference | site-001, user-123 |
| tags | String | Tags for WorkInstruction | Example text, Sample value |
| categories | String | Categories for WorkInstruction | Example text, Sample value |
| keywords | String | Keywords for WorkInstruction | Example text, Sample value |
| thumbnailUrl | String | Thumbnail url for WorkInstruction | Example text, Sample value |
| operationStandard | Operation | Operation standard for WorkInstruction | Example value |
| routingStepOverrides | RoutingStep | Routing step overrides for WorkInstruction | Example value |
| mediaLibraryItems | WorkInstructionMedia | Media library items for WorkInstruction | Example value |
| relatedDocuments | WorkInstructionRelation | Related documents for WorkInstruction | Example value |
| steps | WorkInstructionStep | Steps for WorkInstruction | Example value |
| approvedBy | User | Approved by for WorkInstruction | Example value |
| createdBy | User | Created by for WorkInstruction | Example value |
| exportTemplate | ExportTemplate | Export template for WorkInstruction | Example value |
| updatedBy | User | Updated by for WorkInstruction | Example value |

## WorkInstructionStep

**Business Domain:** Document Management
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workInstructionId | String | Foreign key reference | site-001, user-123 |
| stepNumber | Int | Step number for WorkInstructionStep | 1, 10 |
| title | String | Title for WorkInstructionStep | Example text, Sample value |
| content | String | Content for WorkInstructionStep | Example text, Sample value |
| imageUrls | String | Image urls for WorkInstructionStep | Example text, Sample value |
| videoUrls | String | Video urls for WorkInstructionStep | Example text, Sample value |
| attachmentUrls | String | Attachment urls for WorkInstructionStep | Example text, Sample value |
| estimatedDuration | Int | Estimated duration for WorkInstructionStep | 1, 10 |
| isCritical | Boolean | Is critical for WorkInstructionStep | true, false |
| requiresSignature | Boolean | Requires signature for WorkInstructionStep | true, false |
| dataEntryFields | Json | Data entry fields for WorkInstructionStep | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| workInstruction | WorkInstruction | Work instruction for WorkInstructionStep | Example value |

## WorkInstructionExecution

**Business Domain:** Document Management
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workInstructionId | String | Foreign key reference | site-001, user-123 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| operatorId | String | Foreign key reference | site-001, user-123 |
| currentStepNumber | Int | Current step number for WorkInstructionExecution | 1, 10 |
| status | WorkInstructionExecutionStatus | Current operational status | ACTIVE, COMPLETED |
| startedAt | DateTime | Started at for WorkInstructionExecution | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for WorkInstructionExecution | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| operator | User | Operator for WorkInstructionExecution | Example value |
| stepExecutions | WorkInstructionStepExecution | Step executions for WorkInstructionExecution | Example value |

## WorkInstructionStepExecution

**Business Domain:** Document Management
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| executionId | String | Foreign key reference | site-001, user-123 |
| stepNumber | Int | Step number for WorkInstructionStepExecution | 1, 10 |
| status | String | Current operational status | ACTIVE, COMPLETED |
| dataEntered | Json | Data entered for WorkInstructionStepExecution | Example value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| signedById | String | Foreign key reference | site-001, user-123 |
| signedAt | DateTime | Signed at for WorkInstructionStepExecution | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| startedAt | DateTime | Started at for WorkInstructionStepExecution | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for WorkInstructionStepExecution | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| execution | WorkInstructionExecution | Execution for WorkInstructionStepExecution | Example value |
| signedBy | User | Signed by for WorkInstructionStepExecution | Example value |

## ElectronicSignature

**Business Domain:** General Operations
**Fields:** 25

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| signatureType | ElectronicSignatureType | Signature type for ElectronicSignature | Example value |
| signatureLevel | ElectronicSignatureLevel | Signature level for ElectronicSignature | Example value |
| userId | String | Foreign key reference | site-001, user-123 |
| signedEntityType | String | Signed entity type for ElectronicSignature | Example text, Sample value |
| signedEntityId | String | Foreign key reference | site-001, user-123 |
| signatureReason | String | Signature reason for ElectronicSignature | Example text, Sample value |
| signatureData | Json | Signature data for ElectronicSignature | Example value |
| ipAddress | String | Ip address for ElectronicSignature | Example text, Sample value |
| userAgent | String | User agent for ElectronicSignature | Example text, Sample value |
| timestamp | DateTime | Timestamp for ElectronicSignature | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| biometricType | BiometricType | Biometric type for ElectronicSignature | Example value |
| biometricTemplate | String | Biometric template for ElectronicSignature | Example text, Sample value |
| biometricScore | Float | Biometric score for ElectronicSignature | 1.5, 10.25 |
| signatureHash | String | Signature hash for ElectronicSignature | Example text, Sample value |
| isValid | Boolean | Foreign key reference | site-001, user-123 |
| invalidatedAt | DateTime | Invalidated at for ElectronicSignature | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| invalidatedById | String | Foreign key reference | site-001, user-123 |
| invalidationReason | String | Invalidation reason for ElectronicSignature | Example text, Sample value |
| signedDocument | Json | Signed document for ElectronicSignature | Example value |
| certificateId | String | Foreign key reference | site-001, user-123 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| invalidatedBy | User | Invalidated by for ElectronicSignature | Example value |
| user | User | User for ElectronicSignature | Example value |

## FAIReport

**Business Domain:** General Operations
**Fields:** 19

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| faiNumber | String | Fai number for FAIReport | Example text, Sample value |
| partId | String | Foreign key reference | site-001, user-123 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| inspectionId | String | Foreign key reference | site-001, user-123 |
| status | FAIStatus | Current operational status | ACTIVE, COMPLETED |
| revisionLevel | String | Revision level for FAIReport | Example text, Sample value |
| form1Data | Json | Form1 data for FAIReport | Example value |
| form2Data | Json | Form2 data for FAIReport | Example value |
| createdById | String | Foreign key reference | site-001, user-123 |
| reviewedById | String | Foreign key reference | site-001, user-123 |
| approvedById | String | Foreign key reference | site-001, user-123 |
| reviewedAt | DateTime | Reviewed at for FAIReport | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| approvedAt | DateTime | Approved at for FAIReport | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| characteristics | FAICharacteristic | Characteristics for FAIReport | Example value |
| qifMeasurementPlans | QIFMeasurementPlan | Qif measurement plans for FAIReport | Example value |
| qifMeasurementResults | QIFMeasurementResult | Qif measurement results for FAIReport | Example value |

## FAICharacteristic

**Business Domain:** General Operations
**Fields:** 23

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| faiReportId | String | Foreign key reference | site-001, user-123 |
| characteristicNumber | Int | Characteristic number for FAICharacteristic | 1, 10 |
| characteristic | String | Characteristic for FAICharacteristic | Example text, Sample value |
| specification | String | Technical specification | AMS4911 Standard |
| requirement | String | Requirement for FAICharacteristic | Example text, Sample value |
| toleranceType | String | Tolerance type for FAICharacteristic | Example text, Sample value |
| nominalValue | Float | Nominal value for FAICharacteristic | 1.5, 10.25 |
| upperLimit | Float | Upper limit for FAICharacteristic | 1.5, 10.25 |
| lowerLimit | Float | Lower limit for FAICharacteristic | 1.5, 10.25 |
| unitOfMeasure | String | Unit of measure for FAICharacteristic | Example text, Sample value |
| inspectionMethod | String | Quality inspection data | PASS, FAIL |
| inspectionFrequency | String | Quality inspection data | PASS, FAIL |
| measuredValues | Json | Measured values for FAICharacteristic | Example value |
| actualValue | Float | Actual value for FAICharacteristic | 1.5, 10.25 |
| deviation | Float | Deviation for FAICharacteristic | 1.5, 10.25 |
| result | String | Result for FAICharacteristic | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| verifiedById | String | Foreign key reference | site-001, user-123 |
| verifiedAt | DateTime | Verified at for FAICharacteristic | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| faiReport | FAIReport | Fai report for FAICharacteristic | Example value |

## AuditLog

**Business Domain:** General Operations
**Fields:** 11

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| tableName | String | Table name for AuditLog | Example text, Sample value |
| recordId | String | Foreign key reference | site-001, user-123 |
| action | String | Action for AuditLog | Example text, Sample value |
| oldValues | Json | Old values for AuditLog | Example value |
| newValues | Json | New values for AuditLog | Example value |
| userId | String | Foreign key reference | site-001, user-123 |
| ipAddress | String | Ip address for AuditLog | Example text, Sample value |
| userAgent | String | User agent for AuditLog | Example text, Sample value |
| timestamp | DateTime | Timestamp for AuditLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| user | User | User for AuditLog | Example value |

## MaintenanceWorkOrder

**Business Domain:** Production Management
**Fields:** 19

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| externalWorkOrderNumber | String | External work order number for MaintenanceWorkOrder | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| workType | String | Work type for MaintenanceWorkOrder | Example text, Sample value |
| status | String | Current operational status | ACTIVE, COMPLETED |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| scheduledStart | DateTime | Scheduled start for MaintenanceWorkOrder | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| scheduledFinish | DateTime | Scheduled finish for MaintenanceWorkOrder | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| actualStart | DateTime | Actual start for MaintenanceWorkOrder | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| actualFinish | DateTime | Actual finish for MaintenanceWorkOrder | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| priority | Int | Business priority level | HIGH, NORMAL |
| failureCode | String | Failure code for MaintenanceWorkOrder | Example text, Sample value |
| problemCode | String | Problem code for MaintenanceWorkOrder | Example text, Sample value |
| causeCode | String | Cause code for MaintenanceWorkOrder | Example text, Sample value |
| remedyCode | String | Remedy code for MaintenanceWorkOrder | Example text, Sample value |
| lastSyncedAt | DateTime | Last synced at for MaintenanceWorkOrder | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| equipment | Equipment | Equipment for MaintenanceWorkOrder | Example value |

## MeasurementEquipment

**Business Domain:** Equipment Management
**Fields:** 23

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| externalGaugeId | String | Foreign key reference | site-001, user-123 |
| description | String | Text description | Manufacturing notes, Quality requirements |
| manufacturer | String | Manufacturer for MeasurementEquipment | Example text, Sample value |
| model | String | Model for MeasurementEquipment | Example text, Sample value |
| serialNumber | String | Unique serial number | SN-ENG-001-20241030 |
| gaugeType | String | Gauge type for MeasurementEquipment | Example text, Sample value |
| measurementType | String | Measurement type for MeasurementEquipment | Example text, Sample value |
| measurementRange | String | Measurement range for MeasurementEquipment | Example text, Sample value |
| resolution | Float | Resolution for MeasurementEquipment | 1.5, 10.25 |
| accuracy | Float | Accuracy for MeasurementEquipment | 1.5, 10.25 |
| location | String | Location for MeasurementEquipment | Example text, Sample value |
| calibrationFrequency | Int | Calibration frequency for MeasurementEquipment | 1, 10 |
| lastCalibrationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| nextCalibrationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| calibrationStatus | String | Calibration status for MeasurementEquipment | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |
| lastSyncedAt | DateTime | Last synced at for MeasurementEquipment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| inspectionRecords | InspectionRecord | Quality inspection data | PASS, FAIL |
| operationGaugeRequirements | OperationGaugeRequirement | Operation gauge requirements for MeasurementEquipment | Example value |
| qifMeasurementResults | QIFMeasurementResult | Qif measurement results for MeasurementEquipment | Example value |

## InspectionRecord

**Business Domain:** Quality Management
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| serializedPartId | String | Foreign key reference | site-001, user-123 |
| measurementEquipmentId | String | Foreign key reference | site-001, user-123 |
| characteristic | String | Characteristic for InspectionRecord | Example text, Sample value |
| nominalValue | Float | Nominal value for InspectionRecord | 1.5, 10.25 |
| actualValue | Float | Actual value for InspectionRecord | 1.5, 10.25 |
| lowerTolerance | Float | Lower tolerance for InspectionRecord | 1.5, 10.25 |
| upperTolerance | Float | Upper tolerance for InspectionRecord | 1.5, 10.25 |
| unit | String | Unit for InspectionRecord | Example text, Sample value |
| result | String | Result for InspectionRecord | Example text, Sample value |
| inspectionDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| measurementEquipment | MeasurementEquipment | Measurement equipment for InspectionRecord | Example value |
| serializedPart | SerializedPart | Serialized part for InspectionRecord | Example value |

## CNCProgram

**Business Domain:** General Operations
**Fields:** 27

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| externalProgramId | String | Foreign key reference | site-001, user-123 |
| programName | String | Program name for CNCProgram | Example text, Sample value |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| operationCode | String | Operation code for CNCProgram | Example text, Sample value |
| revision | String | Revision for CNCProgram | Example text, Sample value |
| revisionDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| status | String | Current operational status | ACTIVE, COMPLETED |
| machineType | String | Machine type for CNCProgram | Example text, Sample value |
| postProcessor | String | Post processor for CNCProgram | Example text, Sample value |
| toolList | String | Tool list for CNCProgram | Example text, Sample value |
| setupSheetUrl | String | Setup sheet url for CNCProgram | Example text, Sample value |
| approvedBy | String | Approved by for CNCProgram | Example text, Sample value |
| approvalDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| ecoNumber | String | Eco number for CNCProgram | Example text, Sample value |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| firstPieceRequired | Boolean | First piece required for CNCProgram | true, false |
| firstPieceApproved | Boolean | First piece approved for CNCProgram | true, false |
| firstPieceDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| programUrl | String | Program url for CNCProgram | Example text, Sample value |
| stepAP242Url | String | Step a p242 url for CNCProgram | Example text, Sample value |
| pmiDataUrl | String | Pmi data url for CNCProgram | Example text, Sample value |
| teamcenterItemId | String | Foreign key reference | site-001, user-123 |
| lastSyncedAt | DateTime | Last synced at for CNCProgram | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| programDownloadLogs | ProgramDownloadLog | Program download logs for CNCProgram | Example value |

## ProgramDownloadLog

**Business Domain:** General Operations
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| programId | String | Foreign key reference | site-001, user-123 |
| programName | String | Program name for ProgramDownloadLog | Example text, Sample value |
| revision | String | Revision for ProgramDownloadLog | Example text, Sample value |
| machineId | String | Foreign key reference | site-001, user-123 |
| operatorBadgeNumber | String | Operator badge number for ProgramDownloadLog | Example text, Sample value |
| workOrderNumber | String | Work order identifier | WO-2024-001, WO-ENG-001 |
| downloadDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| authorized | Boolean | Authorized for ProgramDownloadLog | true, false |
| authorizationMethod | String | Authorization method for ProgramDownloadLog | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| cncProgram | CNCProgram | Cnc program for ProgramDownloadLog | Example value |

## ProgramLoadAuthorization

**Business Domain:** General Operations
**Fields:** 21

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| authorizationId | String | Foreign key reference | site-001, user-123 |
| operatorBadgeNumber | String | Operator badge number for ProgramLoadAuthorization | Example text, Sample value |
| machineId | String | Foreign key reference | site-001, user-123 |
| programName | String | Program name for ProgramLoadAuthorization | Example text, Sample value |
| programRevision | String | Program revision for ProgramLoadAuthorization | Example text, Sample value |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| workOrderNumber | String | Work order identifier | WO-2024-001, WO-ENG-001 |
| authorized | Boolean | Authorized for ProgramLoadAuthorization | true, false |
| authorizationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| operatorAuthenticated | Boolean | Operator authenticated for ProgramLoadAuthorization | true, false |
| workOrderValid | Boolean | Foreign key reference | site-001, user-123 |
| certificationValid | Boolean | Foreign key reference | site-001, user-123 |
| programVersionValid | Boolean | Foreign key reference | site-001, user-123 |
| gaugeCalibrationValid | Boolean | Foreign key reference | site-001, user-123 |
| failureReasons | String | Failure reasons for ProgramLoadAuthorization | Example text, Sample value |
| validationDetails | Json | Validation details for ProgramLoadAuthorization | Example value |
| supervisorNotified | Boolean | Supervisor notified for ProgramLoadAuthorization | true, false |
| overrideReason | String | Override reason for ProgramLoadAuthorization | Example text, Sample value |
| electronicSignature | String | Electronic signature for ProgramLoadAuthorization | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |

## OperationGaugeRequirement

**Business Domain:** General Operations
**Fields:** 7

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| operationCode | String | Operation code for OperationGaugeRequirement | Example text, Sample value |
| measurementEquipmentId | String | Foreign key reference | site-001, user-123 |
| required | Boolean | Required for OperationGaugeRequirement | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| measurementEquipment | MeasurementEquipment | Measurement equipment for OperationGaugeRequirement | Example value |

## Alert

**Business Domain:** General Operations
**Fields:** 10

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| alertType | String | Alert type for Alert | Example text, Sample value |
| severity | String | Severity for Alert | Example text, Sample value |
| message | String | Message for Alert | Example text, Sample value |
| details | Json | Details for Alert | Example value |
| resolved | Boolean | Resolved for Alert | true, false |
| resolvedBy | String | Resolved by for Alert | Example text, Sample value |
| resolvedAt | DateTime | Resolved at for Alert | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |

## IntegrationConfig

**Business Domain:** General Operations
**Fields:** 21

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| name | String | Name information | John, Doe |
| displayName | String | Display name for IntegrationConfig | Example text, Sample value |
| type | IntegrationType | Type for IntegrationConfig | Example value |
| enabled | Boolean | Enabled for IntegrationConfig | true, false |
| config | Json | Config for IntegrationConfig | Example value |
| lastSync | DateTime | Last sync for IntegrationConfig | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| lastSyncStatus | String | Last sync status for IntegrationConfig | Example text, Sample value |
| lastError | String | Last error for IntegrationConfig | Example text, Sample value |
| errorCount | Int | Error count for IntegrationConfig | 1, 10 |
| totalSyncs | Int | Total syncs for IntegrationConfig | 1, 10 |
| successCount | Int | Success count for IntegrationConfig | 1, 10 |
| failureCount | Int | Failure count for IntegrationConfig | 1, 10 |
| syncSchedule | Json | Sync schedule for IntegrationConfig | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| erpMaterialTransactions | ERPMaterialTransaction | Erp material transactions for IntegrationConfig | Example value |
| logs | IntegrationLog | Logs for IntegrationConfig | Example value |
| personnelInfoExchanges | PersonnelInfoExchange | Personnel info exchanges for IntegrationConfig | Example value |
| productionPerformanceActuals | ProductionPerformanceActual | Production performance actuals for IntegrationConfig | Example value |
| productionScheduleRequests | ProductionScheduleRequest | Production schedule requests for IntegrationConfig | Example value |

## IntegrationLog

**Business Domain:** General Operations
**Fields:** 17

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| configId | String | Foreign key reference | site-001, user-123 |
| operation | String | Operation for IntegrationLog | Example text, Sample value |
| direction | IntegrationDirection | Direction for IntegrationLog | Example value |
| status | IntegrationLogStatus | Current operational status | ACTIVE, COMPLETED |
| recordCount | Int | Record count for IntegrationLog | 1, 10 |
| successCount | Int | Success count for IntegrationLog | 1, 10 |
| errorCount | Int | Error count for IntegrationLog | 1, 10 |
| duration | Int | Duration for IntegrationLog | 1, 10 |
| requestData | Json | Request data for IntegrationLog | Example value |
| responseData | Json | Response data for IntegrationLog | Example value |
| errors | Json | Errors for IntegrationLog | Example value |
| details | Json | Details for IntegrationLog | Example value |
| startedAt | DateTime | Started at for IntegrationLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for IntegrationLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| config | IntegrationConfig | Config for IntegrationLog | Example value |

## ProductionScheduleRequest

**Business Domain:** General Operations
**Fields:** 33

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| messageId | String | Foreign key reference | site-001, user-123 |
| configId | String | Foreign key reference | site-001, user-123 |
| scheduleType | ScheduleType | Schedule type for ProductionScheduleRequest | Example value |
| priority | SchedulePriority | Business priority level | HIGH, NORMAL |
| requestedBy | String | Requested by for ProductionScheduleRequest | Example text, Sample value |
| requestedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| effectiveStartDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| effectiveEndDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| externalWorkOrderId | String | Foreign key reference | site-001, user-123 |
| partId | String | Foreign key reference | site-001, user-123 |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| quantity | Float | Numerical quantity | 10, 25 |
| unitOfMeasure | String | Unit of measure for ProductionScheduleRequest | Example text, Sample value |
| dueDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| workCenterId | String | Foreign key reference | site-001, user-123 |
| equipmentRequirements | Json | Equipment requirements for ProductionScheduleRequest | Example value |
| personnelRequirements | Json | Personnel requirements for ProductionScheduleRequest | Example value |
| materialRequirements | Json | Material requirements for ProductionScheduleRequest | Example value |
| status | B2MMessageStatus | Current operational status | ACTIVE, COMPLETED |
| processedAt | DateTime | Processed at for ProductionScheduleRequest | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| errorMessage | String | Error message for ProductionScheduleRequest | Example text, Sample value |
| validationErrors | Json | Validation errors for ProductionScheduleRequest | Example value |
| requestPayload | Json | Request payload for ProductionScheduleRequest | Example value |
| responsePayload | Json | Response payload for ProductionScheduleRequest | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| config | IntegrationConfig | Config for ProductionScheduleRequest | Example value |
| part | Part | Part for ProductionScheduleRequest | Example value |
| workCenter | Equipment | Work center for ProductionScheduleRequest | Example value |
| workOrder | WorkOrder | Work order for ProductionScheduleRequest | Example value |
| response | ProductionScheduleResponse | Response for ProductionScheduleRequest | Example value |

## ProductionScheduleResponse

**Business Domain:** General Operations
**Fields:** 20

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| requestId | String | Foreign key reference | site-001, user-123 |
| messageId | String | Foreign key reference | site-001, user-123 |
| accepted | Boolean | Accepted for ProductionScheduleResponse | true, false |
| confirmedStartDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| confirmedEndDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| confirmedQuantity | Float | Confirmed quantity for ProductionScheduleResponse | 1.5, 10.25 |
| rejectionReason | String | Rejection reason for ProductionScheduleResponse | Example text, Sample value |
| modifications | Json | Modifications for ProductionScheduleResponse | Example value |
| constraints | Json | Constraints for ProductionScheduleResponse | Example value |
| proposedStartDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| proposedEndDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| proposedQuantity | Float | Proposed quantity for ProductionScheduleResponse | 1.5, 10.25 |
| respondedBy | String | Responded by for ProductionScheduleResponse | Example text, Sample value |
| respondedAt | DateTime | Responded at for ProductionScheduleResponse | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| sentToERP | Boolean | Sent to e r p for ProductionScheduleResponse | true, false |
| sentAt | DateTime | Sent at for ProductionScheduleResponse | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| responsePayload | Json | Response payload for ProductionScheduleResponse | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| request | ProductionScheduleRequest | Request for ProductionScheduleResponse | Example value |

## ProductionPerformanceActual

**Business Domain:** General Operations
**Fields:** 39

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| messageId | String | Foreign key reference | site-001, user-123 |
| configId | String | Foreign key reference | site-001, user-123 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| externalWorkOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| reportingPeriodStart | DateTime | Reporting period start for ProductionPerformanceActual | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| reportingPeriodEnd | DateTime | Reporting period end for ProductionPerformanceActual | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| quantityProduced | Float | Numerical quantity | 10, 25 |
| quantityGood | Float | Numerical quantity | 10, 25 |
| quantityScrap | Float | Numerical quantity | 10, 25 |
| quantityRework | Float | Numerical quantity | 10, 25 |
| yieldPercentage | Float | Yield percentage for ProductionPerformanceActual | 1.5, 10.25 |
| setupTimeActual | Float | Setup time actual for ProductionPerformanceActual | 1.5, 10.25 |
| runTimeActual | Float | Run time actual for ProductionPerformanceActual | 1.5, 10.25 |
| downtimeActual | Float | Downtime actual for ProductionPerformanceActual | 1.5, 10.25 |
| laborHoursActual | Float | Labor hours actual for ProductionPerformanceActual | 1.5, 10.25 |
| laborCostActual | Float | Labor cost actual for ProductionPerformanceActual | 1.5, 10.25 |
| materialCostActual | Float | Material cost actual for ProductionPerformanceActual | 1.5, 10.25 |
| overheadCostActual | Float | Overhead cost actual for ProductionPerformanceActual | 1.5, 10.25 |
| totalCostActual | Float | Total cost actual for ProductionPerformanceActual | 1.5, 10.25 |
| quantityVariance | Float | Numerical quantity | 10, 25 |
| timeVariance | Float | Time variance for ProductionPerformanceActual | 1.5, 10.25 |
| costVariance | Float | Cost variance for ProductionPerformanceActual | 1.5, 10.25 |
| efficiencyVariance | Float | Efficiency variance for ProductionPerformanceActual | 1.5, 10.25 |
| personnelActuals | Json | Personnel actuals for ProductionPerformanceActual | Example value |
| equipmentActuals | Json | Equipment actuals for ProductionPerformanceActual | Example value |
| materialActuals | Json | Material actuals for ProductionPerformanceActual | Example value |
| status | B2MMessageStatus | Current operational status | ACTIVE, COMPLETED |
| sentToERP | Boolean | Sent to e r p for ProductionPerformanceActual | true, false |
| sentAt | DateTime | Sent at for ProductionPerformanceActual | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| erpConfirmation | String | Erp confirmation for ProductionPerformanceActual | Example text, Sample value |
| errorMessage | String | Error message for ProductionPerformanceActual | Example text, Sample value |
| messagePayload | Json | Message payload for ProductionPerformanceActual | Example value |
| createdBy | String | Created by for ProductionPerformanceActual | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| config | IntegrationConfig | Config for ProductionPerformanceActual | Example value |
| workOrder | WorkOrder | Work order for ProductionPerformanceActual | Example value |

## ERPMaterialTransaction

**Business Domain:** Material Management
**Fields:** 32

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| messageId | String | Foreign key reference | site-001, user-123 |
| configId | String | Foreign key reference | site-001, user-123 |
| transactionType | ERPTransactionType | Transaction type for ERPMaterialTransaction | Example value |
| direction | IntegrationDirection | Direction for ERPMaterialTransaction | Example value |
| transactionDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| partId | String | Foreign key reference | site-001, user-123 |
| externalPartId | String | Foreign key reference | site-001, user-123 |
| fromLocation | String | From location for ERPMaterialTransaction | Example text, Sample value |
| toLocation | String | To location for ERPMaterialTransaction | Example text, Sample value |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| externalWorkOrderId | String | Foreign key reference | site-001, user-123 |
| quantity | Float | Numerical quantity | 10, 25 |
| unitOfMeasure | String | Unit of measure for ERPMaterialTransaction | Example text, Sample value |
| lotNumber | String | Material lot identifier | LOT-TI-20241015 |
| serialNumber | String | Unique serial number | SN-ENG-001-20241030 |
| unitCost | Float | Unit cost for ERPMaterialTransaction | 1.5, 10.25 |
| totalCost | Float | Total cost for ERPMaterialTransaction | 1.5, 10.25 |
| currency | String | Currency for ERPMaterialTransaction | Example text, Sample value |
| movementType | String | Movement type for ERPMaterialTransaction | Example text, Sample value |
| reasonCode | String | Reason code for ERPMaterialTransaction | Example text, Sample value |
| status | B2MMessageStatus | Current operational status | ACTIVE, COMPLETED |
| processedAt | DateTime | Processed at for ERPMaterialTransaction | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| erpTransactionId | String | Foreign key reference | site-001, user-123 |
| errorMessage | String | Error message for ERPMaterialTransaction | Example text, Sample value |
| messagePayload | Json | Message payload for ERPMaterialTransaction | Example value |
| createdBy | String | Created by for ERPMaterialTransaction | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| config | IntegrationConfig | Config for ERPMaterialTransaction | Example value |
| part | Part | Part for ERPMaterialTransaction | Example value |
| workOrder | WorkOrder | Work order for ERPMaterialTransaction | Example value |

## PersonnelInfoExchange

**Business Domain:** Personnel Management
**Fields:** 29

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| messageId | String | Foreign key reference | site-001, user-123 |
| configId | String | Foreign key reference | site-001, user-123 |
| personnelId | String | Foreign key reference | site-001, user-123 |
| externalPersonnelId | String | Foreign key reference | site-001, user-123 |
| actionType | PersonnelActionType | Action type for PersonnelInfoExchange | Example value |
| direction | IntegrationDirection | Direction for PersonnelInfoExchange | Example value |
| firstName | String | Name information | John, Doe |
| lastName | String | Name information | John, Doe |
| email | String | Email address | user@machshop.com |
| employeeNumber | String | Employee identifier | EMP-001234 |
| department | String | Department for PersonnelInfoExchange | Example text, Sample value |
| jobTitle | String | Job title for PersonnelInfoExchange | Example text, Sample value |
| skills | Json | Skills for PersonnelInfoExchange | Example value |
| certifications | Json | Certifications for PersonnelInfoExchange | Example value |
| qualifications | Json | Qualifications for PersonnelInfoExchange | Example value |
| shiftCode | String | Shift code for PersonnelInfoExchange | Example text, Sample value |
| workCalendar | String | Work calendar for PersonnelInfoExchange | Example text, Sample value |
| availableFrom | DateTime | Available from for PersonnelInfoExchange | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| availableTo | DateTime | Available to for PersonnelInfoExchange | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| employmentStatus | String | Employment status for PersonnelInfoExchange | Example text, Sample value |
| lastWorkDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| status | B2MMessageStatus | Current operational status | ACTIVE, COMPLETED |
| processedAt | DateTime | Processed at for PersonnelInfoExchange | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| errorMessage | String | Error message for PersonnelInfoExchange | Example text, Sample value |
| messagePayload | Json | Message payload for PersonnelInfoExchange | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| config | IntegrationConfig | Config for PersonnelInfoExchange | Example value |

## EquipmentDataCollection

**Business Domain:** Equipment Management
**Fields:** 21

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| dataCollectionType | DataCollectionType | Data collection type for EquipmentDataCollection | Example value |
| collectionTimestamp | DateTime | Collection timestamp for EquipmentDataCollection | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| dataPointName | String | Data point name for EquipmentDataCollection | Example text, Sample value |
| dataPointId | String | Foreign key reference | site-001, user-123 |
| numericValue | Float | Numeric value for EquipmentDataCollection | 1.5, 10.25 |
| stringValue | String | String value for EquipmentDataCollection | Example text, Sample value |
| booleanValue | Boolean | Boolean value for EquipmentDataCollection | true, false |
| jsonValue | Json | Json value for EquipmentDataCollection | Example value |
| unitOfMeasure | String | Unit of measure for EquipmentDataCollection | Example text, Sample value |
| quality | String | Quality for EquipmentDataCollection | Example text, Sample value |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| productionRunId | String | Foreign key reference | site-001, user-123 |
| equipmentState | String | Equipment state for EquipmentDataCollection | Example text, Sample value |
| protocol | String | Protocol for EquipmentDataCollection | Example text, Sample value |
| sourceAddress | String | Source address for EquipmentDataCollection | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| equipment | Equipment | Equipment for EquipmentDataCollection | Example value |
| workOrder | WorkOrder | Work order for EquipmentDataCollection | Example value |

## EquipmentCommand

**Business Domain:** Equipment Management
**Fields:** 24

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| commandType | CommandType | Command type for EquipmentCommand | Example value |
| commandStatus | CommandStatus | Command status for EquipmentCommand | Example value |
| commandName | String | Command name for EquipmentCommand | Example text, Sample value |
| commandPayload | Json | Command payload for EquipmentCommand | Example value |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| issuedAt | DateTime | Issued at for EquipmentCommand | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| sentAt | DateTime | Sent at for EquipmentCommand | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| acknowledgedAt | DateTime | Acknowledged at for EquipmentCommand | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for EquipmentCommand | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| responsePayload | Json | Response payload for EquipmentCommand | Example value |
| responseCode | String | Response code for EquipmentCommand | Example text, Sample value |
| responseMessage | String | Response message for EquipmentCommand | Example text, Sample value |
| timeoutSeconds | Int | Timeout seconds for EquipmentCommand | 1, 10 |
| retryCount | Int | Retry count for EquipmentCommand | 1, 10 |
| maxRetries | Int | Max retries for EquipmentCommand | 1, 10 |
| priority | Int | Business priority level | HIGH, NORMAL |
| issuedBy | String | Issued by for EquipmentCommand | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| equipment | Equipment | Equipment for EquipmentCommand | Example value |
| workOrder | WorkOrder | Work order for EquipmentCommand | Example value |

## EquipmentMaterialMovement

**Business Domain:** Material Management
**Fields:** 22

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| partId | String | Foreign key reference | site-001, user-123 |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| lotNumber | String | Material lot identifier | LOT-TI-20241015 |
| serialNumber | String | Unique serial number | SN-ENG-001-20241030 |
| movementType | String | Movement type for EquipmentMaterialMovement | Example text, Sample value |
| quantity | Float | Numerical quantity | 10, 25 |
| unitOfMeasure | String | Unit of measure for EquipmentMaterialMovement | Example text, Sample value |
| movementTimestamp | DateTime | Movement timestamp for EquipmentMaterialMovement | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| fromLocation | String | From location for EquipmentMaterialMovement | Example text, Sample value |
| toLocation | String | To location for EquipmentMaterialMovement | Example text, Sample value |
| qualityStatus | String | Quality status for EquipmentMaterialMovement | Example text, Sample value |
| upstreamTraceId | String | Foreign key reference | site-001, user-123 |
| downstreamTraceId | String | Foreign key reference | site-001, user-123 |
| recordedBy | String | Recorded by for EquipmentMaterialMovement | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| equipment | Equipment | Equipment for EquipmentMaterialMovement | Example value |
| part | Part | Part for EquipmentMaterialMovement | Example value |
| workOrder | WorkOrder | Work order for EquipmentMaterialMovement | Example value |

## ProcessDataCollection

**Business Domain:** General Operations
**Fields:** 28

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| processName | String | Process name for ProcessDataCollection | Example text, Sample value |
| processStepNumber | Int | Process step number for ProcessDataCollection | 1, 10 |
| startTimestamp | DateTime | Start timestamp for ProcessDataCollection | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| endTimestamp | DateTime | End timestamp for ProcessDataCollection | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| duration | Float | Duration for ProcessDataCollection | 1.5, 10.25 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| lotNumber | String | Material lot identifier | LOT-TI-20241015 |
| serialNumber | String | Unique serial number | SN-ENG-001-20241030 |
| parameters | Json | Parameters for ProcessDataCollection | Example value |
| quantityProduced | Float | Numerical quantity | 10, 25 |
| quantityGood | Float | Numerical quantity | 10, 25 |
| quantityScrap | Float | Numerical quantity | 10, 25 |
| inSpecCount | Int | In spec count for ProcessDataCollection | 1, 10 |
| outOfSpecCount | Int | Out of spec count for ProcessDataCollection | 1, 10 |
| averageUtilization | Float | Average utilization for ProcessDataCollection | 1.5, 10.25 |
| peakUtilization | Float | Peak utilization for ProcessDataCollection | 1.5, 10.25 |
| alarmCount | Int | Alarm count for ProcessDataCollection | 1, 10 |
| criticalAlarmCount | Int | Critical alarm count for ProcessDataCollection | 1, 10 |
| operatorId | String | Foreign key reference | site-001, user-123 |
| supervisorId | String | Foreign key reference | site-001, user-123 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| equipment | Equipment | Equipment for ProcessDataCollection | Example value |
| workOrder | WorkOrder | Work order for ProcessDataCollection | Example value |

## QIFMeasurementPlan

**Business Domain:** General Operations
**Fields:** 23

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| qifPlanId | String | Foreign key reference | site-001, user-123 |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| partRevision | String | Part revision for QIFMeasurementPlan | Example text, Sample value |
| planVersion | String | Plan version for QIFMeasurementPlan | Example text, Sample value |
| planName | String | Plan name for QIFMeasurementPlan | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| createdDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| createdBy | String | Created by for QIFMeasurementPlan | Example text, Sample value |
| qifXmlContent | String | Qif xml content for QIFMeasurementPlan | Example text, Sample value |
| qifVersion | String | Qif version for QIFMeasurementPlan | Example text, Sample value |
| characteristicCount | Int | Characteristic count for QIFMeasurementPlan | 1, 10 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| faiReportId | String | Foreign key reference | site-001, user-123 |
| status | String | Current operational status | ACTIVE, COMPLETED |
| supersededBy | String | Superseded by for QIFMeasurementPlan | Example text, Sample value |
| lastSyncedAt | DateTime | Last synced at for QIFMeasurementPlan | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| characteristics | QIFCharacteristic | Characteristics for QIFMeasurementPlan | Example value |
| faiReport | FAIReport | Fai report for QIFMeasurementPlan | Example value |
| workOrder | WorkOrder | Work order for QIFMeasurementPlan | Example value |
| measurementResults | QIFMeasurementResult | Measurement results for QIFMeasurementPlan | Example value |

## QIFCharacteristic

**Business Domain:** General Operations
**Fields:** 20

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| qifMeasurementPlanId | String | Foreign key reference | site-001, user-123 |
| characteristicId | String | Foreign key reference | site-001, user-123 |
| balloonNumber | String | Balloon number for QIFCharacteristic | Example text, Sample value |
| characteristicName | String | Characteristic name for QIFCharacteristic | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| nominalValue | Float | Nominal value for QIFCharacteristic | 1.5, 10.25 |
| upperTolerance | Float | Upper tolerance for QIFCharacteristic | 1.5, 10.25 |
| lowerTolerance | Float | Lower tolerance for QIFCharacteristic | 1.5, 10.25 |
| toleranceType | String | Tolerance type for QIFCharacteristic | Example text, Sample value |
| gdtType | String | Gdt type for QIFCharacteristic | Example text, Sample value |
| datumReferenceFrame | String | Datum reference frame for QIFCharacteristic | Example text, Sample value |
| materialCondition | String | Material condition for QIFCharacteristic | Example text, Sample value |
| measurementMethod | String | Measurement method for QIFCharacteristic | Example text, Sample value |
| samplingRequired | Boolean | Sampling required for QIFCharacteristic | true, false |
| sampleSize | Int | Sample size for QIFCharacteristic | 1, 10 |
| sequenceNumber | Int | Sequence number for QIFCharacteristic | 1, 10 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| qifMeasurementPlan | QIFMeasurementPlan | Qif measurement plan for QIFCharacteristic | Example value |
| measurements | QIFMeasurement | Measurements for QIFCharacteristic | Example value |

## QIFMeasurementResult

**Business Domain:** General Operations
**Fields:** 27

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| qifResultsId | String | Foreign key reference | site-001, user-123 |
| qifMeasurementPlanId | String | Foreign key reference | site-001, user-123 |
| partNumber | String | Manufacturing part number | ENGINE-BLADE-A380, TURBINE-DISC-777 |
| serialNumber | String | Unique serial number | SN-ENG-001-20241030 |
| lotNumber | String | Material lot identifier | LOT-TI-20241015 |
| inspectionDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| inspectedBy | String | Inspected by for QIFMeasurementResult | Example text, Sample value |
| inspectionType | String | Quality inspection data | PASS, FAIL |
| overallStatus | String | Overall status for QIFMeasurementResult | Example text, Sample value |
| totalMeasurements | Int | Total measurements for QIFMeasurementResult | 1, 10 |
| passedMeasurements | Int | Passed measurements for QIFMeasurementResult | 1, 10 |
| failedMeasurements | Int | Failed measurements for QIFMeasurementResult | 1, 10 |
| qifXmlContent | String | Qif xml content for QIFMeasurementResult | Example text, Sample value |
| qifVersion | String | Qif version for QIFMeasurementResult | Example text, Sample value |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| serializedPartId | String | Foreign key reference | site-001, user-123 |
| faiReportId | String | Foreign key reference | site-001, user-123 |
| measurementDeviceId | String | Foreign key reference | site-001, user-123 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| faiReport | FAIReport | Fai report for QIFMeasurementResult | Example value |
| measurementDevice | MeasurementEquipment | Measurement device for QIFMeasurementResult | Example value |
| qifMeasurementPlan | QIFMeasurementPlan | Qif measurement plan for QIFMeasurementResult | Example value |
| serializedPart | SerializedPart | Serialized part for QIFMeasurementResult | Example value |
| workOrder | WorkOrder | Work order for QIFMeasurementResult | Example value |
| measurements | QIFMeasurement | Measurements for QIFMeasurementResult | Example value |

## QIFMeasurement

**Business Domain:** General Operations
**Fields:** 17

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| qifMeasurementResultId | String | Foreign key reference | site-001, user-123 |
| qifCharacteristicId | String | Foreign key reference | site-001, user-123 |
| characteristicId | String | Foreign key reference | site-001, user-123 |
| balloonNumber | String | Balloon number for QIFMeasurement | Example text, Sample value |
| measuredValue | Float | Measured value for QIFMeasurement | 1.5, 10.25 |
| deviation | Float | Deviation for QIFMeasurement | 1.5, 10.25 |
| status | String | Current operational status | ACTIVE, COMPLETED |
| measurementDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| measuredBy | String | Measured by for QIFMeasurement | Example text, Sample value |
| measurementDevice | String | Measurement device for QIFMeasurement | Example text, Sample value |
| uncertainty | Float | Uncertainty for QIFMeasurement | 1.5, 10.25 |
| uncertaintyK | Float | Uncertainty k for QIFMeasurement | 1.5, 10.25 |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| qifCharacteristic | QIFCharacteristic | Qif characteristic for QIFMeasurement | Example value |
| qifMeasurementResult | QIFMeasurementResult | Qif measurement result for QIFMeasurement | Example value |

## SPCConfiguration

**Business Domain:** General Operations
**Fields:** 27

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| parameterId | String | Foreign key reference | site-001, user-123 |
| chartType | SPCChartType | Chart type for SPCConfiguration | Example value |
| subgroupSize | Int | Subgroup size for SPCConfiguration | 1, 10 |
| UCL | Float | U c l for SPCConfiguration | 1.5, 10.25 |
| centerLine | Float | Center line for SPCConfiguration | 1.5, 10.25 |
| LCL | Float | L c l for SPCConfiguration | 1.5, 10.25 |
| rangeUCL | Float | Range u c l for SPCConfiguration | 1.5, 10.25 |
| rangeCL | Float | Range c l for SPCConfiguration | 1.5, 10.25 |
| rangeLCL | Float | Range l c l for SPCConfiguration | 1.5, 10.25 |
| USL | Float | U s l for SPCConfiguration | 1.5, 10.25 |
| LSL | Float | L s l for SPCConfiguration | 1.5, 10.25 |
| targetValue | Float | Target value for SPCConfiguration | 1.5, 10.25 |
| limitsBasedOn | LimitCalculationMethod | Limits based on for SPCConfiguration | Example value |
| historicalDataDays | Int | Historical data days for SPCConfiguration | 1, 10 |
| lastCalculatedAt | DateTime | Last calculated at for SPCConfiguration | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| enabledRules | Json | Enabled rules for SPCConfiguration | Example value |
| ruleSensitivity | String | Rule sensitivity for SPCConfiguration | Example text, Sample value |
| enableCapability | Boolean | Enable capability for SPCConfiguration | true, false |
| confidenceLevel | Float | Confidence level for SPCConfiguration | 1.5, 10.25 |
| isActive | Boolean | Active status flag | true, false |
| createdBy | String | Created by for SPCConfiguration | Example text, Sample value |
| lastModifiedBy | String | Last modified by for SPCConfiguration | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| parameter | OperationParameter | Parameter for SPCConfiguration | Example value |
| violations | SPCRuleViolation | Violations for SPCConfiguration | Example value |

## SPCRuleViolation

**Business Domain:** General Operations
**Fields:** 19

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| configurationId | String | Foreign key reference | site-001, user-123 |
| ruleNumber | Int | Rule number for SPCRuleViolation | 1, 10 |
| ruleName | String | Rule name for SPCRuleViolation | Example text, Sample value |
| severity | String | Severity for SPCRuleViolation | Example text, Sample value |
| dataPointId | String | Foreign key reference | site-001, user-123 |
| value | Float | Value for SPCRuleViolation | 1.5, 10.25 |
| timestamp | DateTime | Timestamp for SPCRuleViolation | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| subgroupNumber | Int | Subgroup number for SPCRuleViolation | 1, 10 |
| UCL | Float | U c l for SPCRuleViolation | 1.5, 10.25 |
| LCL | Float | L c l for SPCRuleViolation | 1.5, 10.25 |
| centerLine | Float | Center line for SPCRuleViolation | 1.5, 10.25 |
| deviationSigma | Float | Deviation sigma for SPCRuleViolation | 1.5, 10.25 |
| acknowledged | Boolean | Acknowledged for SPCRuleViolation | true, false |
| acknowledgedBy | String | Acknowledged by for SPCRuleViolation | Example text, Sample value |
| acknowledgedAt | DateTime | Acknowledged at for SPCRuleViolation | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| resolution | String | Resolution for SPCRuleViolation | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| configuration | SPCConfiguration | Configuration for SPCRuleViolation | Example value |

## SamplingPlan

**Business Domain:** General Operations
**Fields:** 30

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| planName | String | Plan name for SamplingPlan | Example text, Sample value |
| planType | SamplingPlanType | Plan type for SamplingPlan | Example value |
| parameterId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| inspectionLevel | String | Quality inspection data | PASS, FAIL |
| AQL | Float | A q l for SamplingPlan | 1.5, 10.25 |
| lotSizeMin | Int | Lot size min for SamplingPlan | 1, 10 |
| lotSizeMax | Int | Lot size max for SamplingPlan | 1, 10 |
| sampleSizeNormal | Int | Sample size normal for SamplingPlan | 1, 10 |
| acceptanceNumber | Int | Acceptance number for SamplingPlan | 1, 10 |
| rejectionNumber | Int | Rejection number for SamplingPlan | 1, 10 |
| sampleSizeTightened | Int | Sample size tightened for SamplingPlan | 1, 10 |
| acceptanceNumberTightened | Int | Acceptance number tightened for SamplingPlan | 1, 10 |
| sampleSizeReduced | Int | Sample size reduced for SamplingPlan | 1, 10 |
| acceptanceNumberReduced | Int | Acceptance number reduced for SamplingPlan | 1, 10 |
| sampleSize2 | Int | Sample size2 for SamplingPlan | 1, 10 |
| acceptanceNumber2 | Int | Acceptance number2 for SamplingPlan | 1, 10 |
| rejectionNumber2 | Int | Rejection number2 for SamplingPlan | 1, 10 |
| currentInspectionLevel | String | Current inspection level for SamplingPlan | Example text, Sample value |
| consecutiveAccepted | Int | Consecutive accepted for SamplingPlan | 1, 10 |
| consecutiveRejected | Int | Consecutive rejected for SamplingPlan | 1, 10 |
| isActive | Boolean | Active status flag | true, false |
| createdBy | String | Created by for SamplingPlan | Example text, Sample value |
| lastModifiedBy | String | Last modified by for SamplingPlan | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| inspectionResults | SamplingInspectionResult | Quality inspection data | PASS, FAIL |
| operation | Operation | Operation for SamplingPlan | Example value |
| parameter | OperationParameter | Parameter for SamplingPlan | Example value |

## SamplingInspectionResult

**Business Domain:** Quality Management
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| planId | String | Foreign key reference | site-001, user-123 |
| lotNumber | String | Material lot identifier | LOT-TI-20241015 |
| lotSize | Int | Lot size for SamplingInspectionResult | 1, 10 |
| inspectionDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| sampleSize | Int | Sample size for SamplingInspectionResult | 1, 10 |
| defectsFound | Int | Defects found for SamplingInspectionResult | 1, 10 |
| decision | String | Decision for SamplingInspectionResult | Example text, Sample value |
| inspectionLevel | String | Quality inspection data | PASS, FAIL |
| inspectorId | String | Foreign key reference | site-001, user-123 |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| plan | SamplingPlan | Plan for SamplingInspectionResult | Example value |

## WorkInstructionMedia

**Business Domain:** Document Management
**Fields:** 16

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| instructionId | String | Foreign key reference | site-001, user-123 |
| mediaType | MediaType | Media type for WorkInstructionMedia | Example value |
| fileName | String | File name for WorkInstructionMedia | Example text, Sample value |
| fileUrl | String | File url for WorkInstructionMedia | Example text, Sample value |
| fileSize | Int | File size for WorkInstructionMedia | 1, 10 |
| mimeType | String | Mime type for WorkInstructionMedia | Example text, Sample value |
| title | String | Title for WorkInstructionMedia | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| tags | String | Tags for WorkInstructionMedia | Example text, Sample value |
| annotations | Json | Annotations for WorkInstructionMedia | Example value |
| usageCount | Int | Usage count for WorkInstructionMedia | 1, 10 |
| lastUsedAt | DateTime | Last used at for WorkInstructionMedia | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| instruction | WorkInstruction | Instruction for WorkInstructionMedia | Example value |

## WorkInstructionRelation

**Business Domain:** Document Management
**Fields:** 7

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| parentId | String | Foreign key reference | site-001, user-123 |
| relatedId | String | Foreign key reference | site-001, user-123 |
| relationType | RelationType | Relation type for WorkInstructionRelation | Example value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| parent | WorkInstruction | Parent for WorkInstructionRelation | Example value |

## ExportTemplate

**Business Domain:** General Operations
**Fields:** 16

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| name | String | Name information | John, Doe |
| description | String | Text description | Manufacturing notes, Quality requirements |
| templateType | ExportTemplateType | Template type for ExportTemplate | Example value |
| templateFormat | ExportFormat | Template format for ExportTemplate | Example value |
| headerTemplate | String | Header template for ExportTemplate | Example text, Sample value |
| footerTemplate | String | Footer template for ExportTemplate | Example text, Sample value |
| styles | Json | Styles for ExportTemplate | Example value |
| layout | Json | Layout for ExportTemplate | Example value |
| isDefault | Boolean | Is default for ExportTemplate | true, false |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |
| updatedById | String | Foreign key reference | site-001, user-123 |
| instructions | WorkInstruction | Instructions for ExportTemplate | Example value |

## DataCollectionFieldTemplate

**Business Domain:** General Operations
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| name | String | Name information | John, Doe |
| description | String | Text description | Manufacturing notes, Quality requirements |
| fieldSchema | Json | Field schema for DataCollectionFieldTemplate | Example value |
| validationRules | Json | Validation rules for DataCollectionFieldTemplate | Example value |
| category | String | Category for DataCollectionFieldTemplate | Example text, Sample value |
| tags | String | Tags for DataCollectionFieldTemplate | Example text, Sample value |
| usageCount | Int | Usage count for DataCollectionFieldTemplate | 1, 10 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |

## SetupSheet

**Business Domain:** General Operations
**Fields:** 42

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| documentNumber | String | Document number for SetupSheet | Example text, Sample value |
| title | String | Title for SetupSheet | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| version | String | Version for SetupSheet | Example text, Sample value |
| status | WorkInstructionStatus | Current operational status | ACTIVE, COMPLETED |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| supersededDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| ecoNumber | String | Eco number for SetupSheet | Example text, Sample value |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| partId | String | Foreign key reference | site-001, user-123 |
| workCenterId | String | Foreign key reference | site-001, user-123 |
| estimatedSetupTime | Int | Estimated setup time for SetupSheet | 1, 10 |
| safetyChecklist | Json | Safety checklist for SetupSheet | Example value |
| requiredPPE | String | Required p p e for SetupSheet | Example text, Sample value |
| imageUrls | String | Image urls for SetupSheet | Example text, Sample value |
| videoUrls | String | Video urls for SetupSheet | Example text, Sample value |
| attachmentUrls | String | Attachment urls for SetupSheet | Example text, Sample value |
| tags | String | Tags for SetupSheet | Example text, Sample value |
| categories | String | Categories for SetupSheet | Example text, Sample value |
| keywords | String | Keywords for SetupSheet | Example text, Sample value |
| thumbnailUrl | String | Thumbnail url for SetupSheet | Example text, Sample value |
| parentVersionId | String | Foreign key reference | site-001, user-123 |
| approvalWorkflowId | String | Foreign key reference | site-001, user-123 |
| approvedById | String | Foreign key reference | site-001, user-123 |
| approvedAt | DateTime | Approved at for SetupSheet | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| approvalHistory | Json | Approval history for SetupSheet | Example value |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |
| updatedById | String | Foreign key reference | site-001, user-123 |
| executions | SetupExecution | Executions for SetupSheet | Example value |
| parameters | SetupParameter | Parameters for SetupSheet | Example value |
| approvedBy | User | Approved by for SetupSheet | Example value |
| createdBy | User | Created by for SetupSheet | Example value |
| parentVersion | SetupSheet | Parent version for SetupSheet | Example value |
| childVersions | SetupSheet | Child versions for SetupSheet | Example value |
| updatedBy | User | Updated by for SetupSheet | Example value |
| steps | SetupStep | Steps for SetupSheet | Example value |
| toolList | SetupTool | Tool list for SetupSheet | Example value |

## SetupStep

**Business Domain:** General Operations
**Fields:** 11

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| setupSheetId | String | Foreign key reference | site-001, user-123 |
| stepNumber | Int | Step number for SetupStep | 1, 10 |
| title | String | Title for SetupStep | Example text, Sample value |
| instructions | String | Instructions for SetupStep | Example text, Sample value |
| imageUrls | String | Image urls for SetupStep | Example text, Sample value |
| videoUrls | String | Video urls for SetupStep | Example text, Sample value |
| estimatedDuration | Int | Estimated duration for SetupStep | 1, 10 |
| isCritical | Boolean | Is critical for SetupStep | true, false |
| requiresVerification | Boolean | Requires verification for SetupStep | true, false |
| setupSheet | SetupSheet | Setup sheet for SetupStep | Example value |

## SetupParameter

**Business Domain:** General Operations
**Fields:** 9

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| setupSheetId | String | Foreign key reference | site-001, user-123 |
| parameterName | String | Parameter name for SetupParameter | Example text, Sample value |
| targetValue | String | Target value for SetupParameter | Example text, Sample value |
| tolerance | String | Tolerance for SetupParameter | Example text, Sample value |
| unit | String | Unit for SetupParameter | Example text, Sample value |
| equipmentSetting | String | Equipment setting for SetupParameter | Example text, Sample value |
| verificationMethod | String | Verification method for SetupParameter | Example text, Sample value |
| setupSheet | SetupSheet | Setup sheet for SetupParameter | Example value |

## SetupTool

**Business Domain:** General Operations
**Fields:** 9

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| setupSheetId | String | Foreign key reference | site-001, user-123 |
| toolId | String | Foreign key reference | site-001, user-123 |
| toolName | String | Tool name for SetupTool | Example text, Sample value |
| toolNumber | String | Tool number for SetupTool | Example text, Sample value |
| quantity | Int | Numerical quantity | 10, 25 |
| toolOffset | String | Tool offset for SetupTool | Example text, Sample value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| setupSheet | SetupSheet | Setup sheet for SetupTool | Example value |

## SetupExecution

**Business Domain:** General Operations
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| setupSheetId | String | Foreign key reference | site-001, user-123 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| startedById | String | Foreign key reference | site-001, user-123 |
| startedAt | DateTime | Started at for SetupExecution | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedById | String | Foreign key reference | site-001, user-123 |
| completedAt | DateTime | Completed at for SetupExecution | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| actualSetupTime | Int | Actual setup time for SetupExecution | 1, 10 |
| verificationData | Json | Verification data for SetupExecution | Example value |
| firstPieceResults | Json | First piece results for SetupExecution | Example value |
| status | WorkInstructionExecutionStatus | Current operational status | ACTIVE, COMPLETED |
| completedBy | User | Completed by for SetupExecution | Example value |
| setupSheet | SetupSheet | Setup sheet for SetupExecution | Example value |
| startedBy | User | Started by for SetupExecution | Example value |

## InspectionPlan

**Business Domain:** Quality Management
**Fields:** 42

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| documentNumber | String | Document number for InspectionPlan | Example text, Sample value |
| title | String | Title for InspectionPlan | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| version | String | Version for InspectionPlan | Example text, Sample value |
| status | WorkInstructionStatus | Current operational status | ACTIVE, COMPLETED |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| supersededDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| ecoNumber | String | Eco number for InspectionPlan | Example text, Sample value |
| partId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| inspectionType | InspectionType | Quality inspection data | PASS, FAIL |
| frequency | InspectionFrequency | Frequency for InspectionPlan | Example value |
| samplingPlan | Json | Sampling plan for InspectionPlan | Example value |
| dispositionRules | Json | Disposition rules for InspectionPlan | Example value |
| gageRRRequired | Boolean | Gage r r required for InspectionPlan | true, false |
| gageRRFrequency | String | Gage r r frequency for InspectionPlan | Example text, Sample value |
| imageUrls | String | Image urls for InspectionPlan | Example text, Sample value |
| videoUrls | String | Video urls for InspectionPlan | Example text, Sample value |
| attachmentUrls | String | Attachment urls for InspectionPlan | Example text, Sample value |
| tags | String | Tags for InspectionPlan | Example text, Sample value |
| categories | String | Categories for InspectionPlan | Example text, Sample value |
| keywords | String | Keywords for InspectionPlan | Example text, Sample value |
| thumbnailUrl | String | Thumbnail url for InspectionPlan | Example text, Sample value |
| parentVersionId | String | Foreign key reference | site-001, user-123 |
| approvalWorkflowId | String | Foreign key reference | site-001, user-123 |
| approvedById | String | Foreign key reference | site-001, user-123 |
| approvedAt | DateTime | Approved at for InspectionPlan | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| approvalHistory | Json | Approval history for InspectionPlan | Example value |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |
| updatedById | String | Foreign key reference | site-001, user-123 |
| characteristics | InspectionCharacteristic | Characteristics for InspectionPlan | Example value |
| executions | InspectionExecution | Executions for InspectionPlan | Example value |
| approvedBy | User | Approved by for InspectionPlan | Example value |
| createdBy | User | Created by for InspectionPlan | Example value |
| parentVersion | InspectionPlan | Parent version for InspectionPlan | Example value |
| childVersions | InspectionPlan | Child versions for InspectionPlan | Example value |
| updatedBy | User | Updated by for InspectionPlan | Example value |
| steps | InspectionStep | Steps for InspectionPlan | Example value |

## InspectionCharacteristic

**Business Domain:** Quality Management
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| inspectionPlanId | String | Foreign key reference | site-001, user-123 |
| characteristicNumber | Int | Characteristic number for InspectionCharacteristic | 1, 10 |
| characteristicName | String | Characteristic name for InspectionCharacteristic | Example text, Sample value |
| measurementType | MeasurementType | Measurement type for InspectionCharacteristic | Example value |
| nominal | Float | Nominal for InspectionCharacteristic | 1.5, 10.25 |
| upperLimit | Float | Upper limit for InspectionCharacteristic | 1.5, 10.25 |
| lowerLimit | Float | Lower limit for InspectionCharacteristic | 1.5, 10.25 |
| unit | String | Unit for InspectionCharacteristic | Example text, Sample value |
| measurementMethod | String | Measurement method for InspectionCharacteristic | Example text, Sample value |
| gageType | String | Gage type for InspectionCharacteristic | Example text, Sample value |
| isCritical | Boolean | Is critical for InspectionCharacteristic | true, false |
| inspectionPlan | InspectionPlan | Quality inspection data | PASS, FAIL |

## InspectionStep

**Business Domain:** Quality Management
**Fields:** 8

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| inspectionPlanId | String | Foreign key reference | site-001, user-123 |
| stepNumber | Int | Step number for InspectionStep | 1, 10 |
| title | String | Title for InspectionStep | Example text, Sample value |
| instructions | String | Instructions for InspectionStep | Example text, Sample value |
| characteristicRefs | Int | Characteristic refs for InspectionStep | 1, 10 |
| imageUrls | String | Image urls for InspectionStep | Example text, Sample value |
| inspectionPlan | InspectionPlan | Quality inspection data | PASS, FAIL |

## InspectionExecution

**Business Domain:** Quality Management
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| inspectionPlanId | String | Foreign key reference | site-001, user-123 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| lotNumber | String | Material lot identifier | LOT-TI-20241015 |
| serialNumber | String | Unique serial number | SN-ENG-001-20241030 |
| inspectorId | String | Foreign key reference | site-001, user-123 |
| inspectedAt | DateTime | Inspected at for InspectionExecution | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| results | Json | Results for InspectionExecution | Example value |
| overallResult | InspectionResult | Overall result for InspectionExecution | Example value |
| defectsFound | Json | Defects found for InspectionExecution | Example value |
| disposition | Disposition | Disposition for InspectionExecution | Example value |
| signatureId | String | Foreign key reference | site-001, user-123 |
| inspectionPlan | InspectionPlan | Quality inspection data | PASS, FAIL |
| inspector | User | Inspector for InspectionExecution | Example value |

## StandardOperatingProcedure

**Business Domain:** General Operations
**Fields:** 46

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| documentNumber | String | Document number for StandardOperatingProcedure | Example text, Sample value |
| title | String | Title for StandardOperatingProcedure | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| version | String | Version for StandardOperatingProcedure | Example text, Sample value |
| status | WorkInstructionStatus | Current operational status | ACTIVE, COMPLETED |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| supersededDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| ecoNumber | String | Eco number for StandardOperatingProcedure | Example text, Sample value |
| sopType | SOPType | Sop type for StandardOperatingProcedure | Example value |
| scope | String | Scope for StandardOperatingProcedure | Example text, Sample value |
| applicability | String | Applicability for StandardOperatingProcedure | Example text, Sample value |
| responsibleRoles | String | Responsible roles for StandardOperatingProcedure | Example text, Sample value |
| references | Json | References for StandardOperatingProcedure | Example value |
| safetyWarnings | String | Safety warnings for StandardOperatingProcedure | Example text, Sample value |
| requiredPPE | String | Required p p e for StandardOperatingProcedure | Example text, Sample value |
| emergencyProcedure | String | Emergency procedure for StandardOperatingProcedure | Example text, Sample value |
| trainingRequired | Boolean | Training required for StandardOperatingProcedure | true, false |
| trainingFrequency | String | Training frequency for StandardOperatingProcedure | Example text, Sample value |
| reviewFrequency | String | Review frequency for StandardOperatingProcedure | Example text, Sample value |
| nextReviewDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| imageUrls | String | Image urls for StandardOperatingProcedure | Example text, Sample value |
| videoUrls | String | Video urls for StandardOperatingProcedure | Example text, Sample value |
| attachmentUrls | String | Attachment urls for StandardOperatingProcedure | Example text, Sample value |
| tags | String | Tags for StandardOperatingProcedure | Example text, Sample value |
| categories | String | Categories for StandardOperatingProcedure | Example text, Sample value |
| keywords | String | Keywords for StandardOperatingProcedure | Example text, Sample value |
| thumbnailUrl | String | Thumbnail url for StandardOperatingProcedure | Example text, Sample value |
| parentVersionId | String | Foreign key reference | site-001, user-123 |
| approvalWorkflowId | String | Foreign key reference | site-001, user-123 |
| approvedById | String | Foreign key reference | site-001, user-123 |
| approvedAt | DateTime | Approved at for StandardOperatingProcedure | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| approvalHistory | Json | Approval history for StandardOperatingProcedure | Example value |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |
| updatedById | String | Foreign key reference | site-001, user-123 |
| acknowledgments | SOPAcknowledgment | Acknowledgments for StandardOperatingProcedure | Example value |
| audits | SOPAudit | Audits for StandardOperatingProcedure | Example value |
| steps | SOPStep | Steps for StandardOperatingProcedure | Example value |
| approvedBy | User | Approved by for StandardOperatingProcedure | Example value |
| createdBy | User | Created by for StandardOperatingProcedure | Example value |
| parentVersion | StandardOperatingProcedure | Parent version for StandardOperatingProcedure | Example value |
| childVersions | StandardOperatingProcedure | Child versions for StandardOperatingProcedure | Example value |
| updatedBy | User | Updated by for StandardOperatingProcedure | Example value |

## SOPStep

**Business Domain:** General Operations
**Fields:** 10

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| sopId | String | Foreign key reference | site-001, user-123 |
| stepNumber | Int | Step number for SOPStep | 1, 10 |
| title | String | Title for SOPStep | Example text, Sample value |
| instructions | String | Instructions for SOPStep | Example text, Sample value |
| isWarning | Boolean | Is warning for SOPStep | true, false |
| isCritical | Boolean | Is critical for SOPStep | true, false |
| imageUrls | String | Image urls for SOPStep | Example text, Sample value |
| videoUrls | String | Video urls for SOPStep | Example text, Sample value |
| sop | StandardOperatingProcedure | Sop for SOPStep | Example value |

## SOPAcknowledgment

**Business Domain:** General Operations
**Fields:** 11

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| sopId | String | Foreign key reference | site-001, user-123 |
| userId | String | Foreign key reference | site-001, user-123 |
| userName | String | User name for SOPAcknowledgment | Example text, Sample value |
| acknowledgedAt | DateTime | Acknowledged at for SOPAcknowledgment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| trainingCompletedAt | DateTime | Training completed at for SOPAcknowledgment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| assessmentScore | Float | Assessment score for SOPAcknowledgment | 1.5, 10.25 |
| assessmentPassed | Boolean | Assessment passed for SOPAcknowledgment | true, false |
| signatureId | String | Foreign key reference | site-001, user-123 |
| sop | StandardOperatingProcedure | Sop for SOPAcknowledgment | Example value |
| user | User | User for SOPAcknowledgment | Example value |

## SOPAudit

**Business Domain:** General Operations
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| sopId | String | Foreign key reference | site-001, user-123 |
| auditDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| auditorId | String | Foreign key reference | site-001, user-123 |
| auditorName | String | Auditor name for SOPAudit | Example text, Sample value |
| complianceChecks | Json | Compliance checks for SOPAudit | Example value |
| overallCompliance | Boolean | Overall compliance for SOPAudit | true, false |
| findingsCount | Int | Findings count for SOPAudit | 1, 10 |
| findings | String | Findings for SOPAudit | Example text, Sample value |
| correctiveActions | Json | Corrective actions for SOPAudit | Example value |
| auditor | User | Auditor for SOPAudit | Example value |
| sop | StandardOperatingProcedure | Sop for SOPAudit | Example value |

## ToolDrawing

**Business Domain:** General Operations
**Fields:** 58

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| documentNumber | String | Document number for ToolDrawing | Example text, Sample value |
| title | String | Title for ToolDrawing | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| version | String | Version for ToolDrawing | Example text, Sample value |
| status | WorkInstructionStatus | Current operational status | ACTIVE, COMPLETED |
| effectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| supersededDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| ecoNumber | String | Eco number for ToolDrawing | Example text, Sample value |
| toolType | ToolType | Tool type for ToolDrawing | Example value |
| toolSubtype | String | Tool subtype for ToolDrawing | Example text, Sample value |
| dimensions | Json | Dimensions for ToolDrawing | Example value |
| material | String | Material for ToolDrawing | Example text, Sample value |
| weight | Float | Weight for ToolDrawing | 1.5, 10.25 |
| weightUnit | String | Weight unit for ToolDrawing | Example text, Sample value |
| vendorId | String | Foreign key reference | site-001, user-123 |
| vendorName | String | Vendor name for ToolDrawing | Example text, Sample value |
| vendorPartNumber | String | Vendor part number for ToolDrawing | Example text, Sample value |
| catalogNumber | String | Catalog number for ToolDrawing | Example text, Sample value |
| cost | Float | Monetary value | 125.5, 1250 |
| costCurrency | String | Cost currency for ToolDrawing | Example text, Sample value |
| applicablePartIds | String | Applicable part ids for ToolDrawing | Example text, Sample value |
| applicableOperations | String | Applicable operations for ToolDrawing | Example text, Sample value |
| usageInstructions | String | Usage instructions for ToolDrawing | Example text, Sample value |
| maintenanceProcedure | String | Maintenance procedure for ToolDrawing | Example text, Sample value |
| requiresCalibration | Boolean | Requires calibration for ToolDrawing | true, false |
| calibrationInterval | Int | Calibration interval for ToolDrawing | 1, 10 |
| lastCalibrationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| nextCalibrationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| storageLocation | String | Storage location for ToolDrawing | Example text, Sample value |
| quantityOnHand | Int | Numerical quantity | 10, 25 |
| minimumQuantity | Int | Minimum quantity for ToolDrawing | 1, 10 |
| cadFileUrls | String | Cad file urls for ToolDrawing | Example text, Sample value |
| imageUrls | String | Image urls for ToolDrawing | Example text, Sample value |
| videoUrls | String | Video urls for ToolDrawing | Example text, Sample value |
| attachmentUrls | String | Attachment urls for ToolDrawing | Example text, Sample value |
| tags | String | Tags for ToolDrawing | Example text, Sample value |
| categories | String | Categories for ToolDrawing | Example text, Sample value |
| keywords | String | Keywords for ToolDrawing | Example text, Sample value |
| thumbnailUrl | String | Thumbnail url for ToolDrawing | Example text, Sample value |
| parentVersionId | String | Foreign key reference | site-001, user-123 |
| approvalWorkflowId | String | Foreign key reference | site-001, user-123 |
| approvedById | String | Foreign key reference | site-001, user-123 |
| approvedAt | DateTime | Approved at for ToolDrawing | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| approvalHistory | Json | Approval history for ToolDrawing | Example value |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |
| updatedById | String | Foreign key reference | site-001, user-123 |
| calibrationRecords | ToolCalibrationRecord | Calibration records for ToolDrawing | Example value |
| approvedBy | User | Approved by for ToolDrawing | Example value |
| createdBy | User | Created by for ToolDrawing | Example value |
| parentVersion | ToolDrawing | Parent version for ToolDrawing | Example value |
| childVersions | ToolDrawing | Child versions for ToolDrawing | Example value |
| updatedBy | User | Updated by for ToolDrawing | Example value |
| maintenanceRecords | ToolMaintenanceRecord | Maintenance records for ToolDrawing | Example value |
| usageLogs | ToolUsageLog | Usage logs for ToolDrawing | Example value |

## ToolMaintenanceRecord

**Business Domain:** General Operations
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| toolDrawingId | String | Foreign key reference | site-001, user-123 |
| maintenanceDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| performedById | String | Foreign key reference | site-001, user-123 |
| performedByName | String | Performed by name for ToolMaintenanceRecord | Example text, Sample value |
| maintenanceType | MaintenanceType | Maintenance type for ToolMaintenanceRecord | Example value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| partsReplaced | Json | Parts replaced for ToolMaintenanceRecord | Example value |
| cost | Float | Monetary value | 125.5, 1250 |
| toolConditionBefore | String | Tool condition before for ToolMaintenanceRecord | Example text, Sample value |
| toolConditionAfter | String | Tool condition after for ToolMaintenanceRecord | Example text, Sample value |
| performedBy | User | Performed by for ToolMaintenanceRecord | Example value |
| toolDrawing | ToolDrawing | Tool drawing for ToolMaintenanceRecord | Example value |

## ToolCalibrationRecord

**Business Domain:** General Operations
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| toolDrawingId | String | Foreign key reference | site-001, user-123 |
| calibrationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| performedById | String | Foreign key reference | site-001, user-123 |
| performedByName | String | Performed by name for ToolCalibrationRecord | Example text, Sample value |
| calibrationResults | Json | Calibration results for ToolCalibrationRecord | Example value |
| passed | Boolean | Passed for ToolCalibrationRecord | true, false |
| certificationNumber | String | Certification number for ToolCalibrationRecord | Example text, Sample value |
| certificateUrl | String | Certificate url for ToolCalibrationRecord | Example text, Sample value |
| nextDueDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| performedBy | User | Performed by for ToolCalibrationRecord | Example value |
| toolDrawing | ToolDrawing | Tool drawing for ToolCalibrationRecord | Example value |

## ToolUsageLog

**Business Domain:** General Operations
**Fields:** 11

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| toolDrawingId | String | Foreign key reference | site-001, user-123 |
| usedAt | DateTime | Used at for ToolUsageLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| usedById | String | Foreign key reference | site-001, user-123 |
| usedByName | String | Used by name for ToolUsageLog | Example text, Sample value |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| usageDuration | Int | Usage duration for ToolUsageLog | 1, 10 |
| conditionAfterUse | String | Condition after use for ToolUsageLog | Example text, Sample value |
| toolDrawing | ToolDrawing | Tool drawing for ToolUsageLog | Example value |
| usedBy | User | Used by for ToolUsageLog | Example value |

## DocumentTemplate

**Business Domain:** Document Management
**Fields:** 18

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| name | String | Name information | John, Doe |
| description | String | Text description | Manufacturing notes, Quality requirements |
| documentType | DocumentType | Document type for DocumentTemplate | Example value |
| templateData | Json | Template data for DocumentTemplate | Example value |
| defaultValues | Json | Default values for DocumentTemplate | Example value |
| isPublic | Boolean | Is public for DocumentTemplate | true, false |
| isSystemTemplate | Boolean | Is system template for DocumentTemplate | true, false |
| tags | String | Tags for DocumentTemplate | Example text, Sample value |
| category | String | Category for DocumentTemplate | Example text, Sample value |
| usageCount | Int | Usage count for DocumentTemplate | 1, 10 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |
| updatedById | String | Foreign key reference | site-001, user-123 |
| createdBy | User | Created by for DocumentTemplate | Example value |
| updatedBy | User | Updated by for DocumentTemplate | Example value |

## UserWorkstationPreference

**Business Domain:** Personnel Management
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| userId | String | Foreign key reference | site-001, user-123 |
| workstationId | String | Foreign key reference | site-001, user-123 |
| layoutMode | LayoutMode | Layout mode for UserWorkstationPreference | Example value |
| splitRatio | Float | Split ratio for UserWorkstationPreference | 1.5, 10.25 |
| panelPosition | PanelPosition | Panel position for UserWorkstationPreference | Example value |
| autoAdvanceSteps | Boolean | Auto advance steps for UserWorkstationPreference | true, false |
| showStepTimer | Boolean | Show step timer for UserWorkstationPreference | true, false |
| compactMode | Boolean | Compact mode for UserWorkstationPreference | true, false |
| useSecondMonitor | Boolean | Use second monitor for UserWorkstationPreference | true, false |
| secondMonitorPosition | Json | Second monitor position for UserWorkstationPreference | Example value |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |

## WorkstationDisplayConfig

**Business Domain:** General Operations
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workstationId | String | Foreign key reference | site-001, user-123 |
| screenWidth | Int | Screen width for WorkstationDisplayConfig | 1, 10 |
| screenHeight | Int | Screen height for WorkstationDisplayConfig | 1, 10 |
| isMultiMonitor | Boolean | Is multi monitor for WorkstationDisplayConfig | true, false |
| monitorCount | Int | Monitor count for WorkstationDisplayConfig | 1, 10 |
| forcedLayout | LayoutMode | Forced layout for WorkstationDisplayConfig | Example value |
| allowUserOverride | Boolean | Allow user override for WorkstationDisplayConfig | true, false |
| isTouchScreen | Boolean | Is touch screen for WorkstationDisplayConfig | true, false |
| touchTargetSize | Int | Touch target size for WorkstationDisplayConfig | 1, 10 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| updatedById | String | Foreign key reference | site-001, user-123 |

## WorkflowDefinition

**Business Domain:** General Operations
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| name | String | Name information | John, Doe |
| description | String | Text description | Manufacturing notes, Quality requirements |
| workflowType | WorkflowType | Workflow type for WorkflowDefinition | Example value |
| version | String | Version for WorkflowDefinition | Example text, Sample value |
| structure | Json | Structure for WorkflowDefinition | Example value |
| isActive | Boolean | Active status flag | true, false |
| isTemplate | Boolean | Is template for WorkflowDefinition | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |
| updatedById | String | Foreign key reference | site-001, user-123 |
| instances | WorkflowInstance | Instances for WorkflowDefinition | Example value |
| rules | WorkflowRule | Rules for WorkflowDefinition | Example value |
| stages | WorkflowStage | Stages for WorkflowDefinition | Example value |

## WorkflowStage

**Business Domain:** General Operations
**Fields:** 20

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workflowId | String | Foreign key reference | site-001, user-123 |
| stageNumber | Int | Stage number for WorkflowStage | 1, 10 |
| stageName | String | Stage name for WorkflowStage | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| approvalType | ApprovalType | Approval type for WorkflowStage | Example value |
| minimumApprovals | Int | Minimum approvals for WorkflowStage | 1, 10 |
| approvalThreshold | Float | Approval threshold for WorkflowStage | 1.5, 10.25 |
| requiredRoles | String | Required roles for WorkflowStage | Example text, Sample value |
| optionalRoles | String | Optional roles for WorkflowStage | Example text, Sample value |
| assignmentStrategy | AssignmentStrategy | Assignment strategy for WorkflowStage | Example value |
| deadlineHours | Int | Deadline hours for WorkflowStage | 1, 10 |
| escalationRules | Json | Escalation rules for WorkflowStage | Example value |
| allowDelegation | Boolean | Allow delegation for WorkflowStage | true, false |
| allowSkip | Boolean | Allow skip for WorkflowStage | true, false |
| skipConditions | Json | Skip conditions for WorkflowStage | Example value |
| requiresSignature | Boolean | Requires signature for WorkflowStage | true, false |
| signatureType | String | Signature type for WorkflowStage | Example text, Sample value |
| stageInstances | WorkflowStageInstance | Stage instances for WorkflowStage | Example value |
| workflow | WorkflowDefinition | Workflow for WorkflowStage | Example value |

## WorkflowRule

**Business Domain:** General Operations
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workflowId | String | Foreign key reference | site-001, user-123 |
| ruleName | String | Rule name for WorkflowRule | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| conditionField | String | Condition field for WorkflowRule | Example text, Sample value |
| conditionOperator | ConditionOperator | Condition operator for WorkflowRule | Example value |
| conditionValue | Json | Condition value for WorkflowRule | Example value |
| actionType | RuleActionType | Action type for WorkflowRule | Example value |
| actionConfig | Json | Action config for WorkflowRule | Example value |
| priority | Int | Business priority level | HIGH, NORMAL |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| workflow | WorkflowDefinition | Workflow for WorkflowRule | Example value |

## WorkflowInstance

**Business Domain:** General Operations
**Fields:** 16

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workflowId | String | Foreign key reference | site-001, user-123 |
| entityType | String | Entity type for WorkflowInstance | Example text, Sample value |
| entityId | String | Foreign key reference | site-001, user-123 |
| status | WorkflowStatus | Current operational status | ACTIVE, COMPLETED |
| currentStageNumber | Int | Current stage number for WorkflowInstance | 1, 10 |
| contextData | Json | Context data for WorkflowInstance | Example value |
| startedAt | DateTime | Started at for WorkflowInstance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for WorkflowInstance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| deadline | DateTime | Deadline for WorkflowInstance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| priority | Priority | Business priority level | HIGH, NORMAL |
| impactLevel | ImpactLevel | Impact level for WorkflowInstance | Example value |
| createdById | String | Foreign key reference | site-001, user-123 |
| history | WorkflowHistory | History for WorkflowInstance | Example value |
| workflow | WorkflowDefinition | Workflow for WorkflowInstance | Example value |
| stageInstances | WorkflowStageInstance | Stage instances for WorkflowInstance | Example value |

## WorkflowStageInstance

**Business Domain:** General Operations
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workflowInstanceId | String | Foreign key reference | site-001, user-123 |
| stageId | String | Foreign key reference | site-001, user-123 |
| stageNumber | Int | Stage number for WorkflowStageInstance | 1, 10 |
| stageName | String | Stage name for WorkflowStageInstance | Example text, Sample value |
| status | StageStatus | Current operational status | ACTIVE, COMPLETED |
| startedAt | DateTime | Started at for WorkflowStageInstance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for WorkflowStageInstance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| deadline | DateTime | Deadline for WorkflowStageInstance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| outcome | StageOutcome | Outcome for WorkflowStageInstance | Example value |
| notes | String | Text description | Manufacturing notes, Quality requirements |
| assignments | WorkflowAssignment | Assignments for WorkflowStageInstance | Example value |
| parallelCoordination | WorkflowParallelCoordination | Parallel coordination for WorkflowStageInstance | Example value |
| stage | WorkflowStage | Stage for WorkflowStageInstance | Example value |
| workflowInstance | WorkflowInstance | Workflow instance for WorkflowStageInstance | Example value |

## WorkflowAssignment

**Business Domain:** General Operations
**Fields:** 19

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| stageInstanceId | String | Foreign key reference | site-001, user-123 |
| assignedToId | String | Foreign key reference | site-001, user-123 |
| assignedToRole | String | Assigned to role for WorkflowAssignment | Example text, Sample value |
| assignmentType | AssignmentType | Assignment type for WorkflowAssignment | Example value |
| delegatedFromId | String | Foreign key reference | site-001, user-123 |
| delegationReason | String | Delegation reason for WorkflowAssignment | Example text, Sample value |
| delegationExpiry | DateTime | Delegation expiry for WorkflowAssignment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| action | ApprovalAction | Action for WorkflowAssignment | Example value |
| actionTakenAt | DateTime | Action taken at for WorkflowAssignment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| comments | String | Text description | Manufacturing notes, Quality requirements |
| signatureId | String | Foreign key reference | site-001, user-123 |
| signatureType | String | Signature type for WorkflowAssignment | Example text, Sample value |
| assignedAt | DateTime | Assigned at for WorkflowAssignment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| dueDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| escalationLevel | Int | Escalation level for WorkflowAssignment | 1, 10 |
| escalatedAt | DateTime | Escalated at for WorkflowAssignment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| escalatedToId | String | Foreign key reference | site-001, user-123 |
| stageInstance | WorkflowStageInstance | Stage instance for WorkflowAssignment | Example value |

## WorkflowHistory

**Business Domain:** General Operations
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| workflowInstanceId | String | Foreign key reference | site-001, user-123 |
| eventType | WorkflowEventType | Event type for WorkflowHistory | Example value |
| eventDescription | String | Event description for WorkflowHistory | Example text, Sample value |
| stageNumber | Int | Stage number for WorkflowHistory | 1, 10 |
| fromStatus | String | From status for WorkflowHistory | Example text, Sample value |
| toStatus | String | To status for WorkflowHistory | Example text, Sample value |
| performedById | String | Foreign key reference | site-001, user-123 |
| performedByName | String | Performed by name for WorkflowHistory | Example text, Sample value |
| performedByRole | String | Performed by role for WorkflowHistory | Example text, Sample value |
| details | Json | Details for WorkflowHistory | Example value |
| occurredAt | DateTime | Occurred at for WorkflowHistory | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| workflowInstance | WorkflowInstance | Workflow instance for WorkflowHistory | Example value |

## WorkflowDelegation

**Business Domain:** General Operations
**Fields:** 10

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| delegatorId | String | Foreign key reference | site-001, user-123 |
| delegateeId | String | Foreign key reference | site-001, user-123 |
| workflowType | WorkflowType | Workflow type for WorkflowDelegation | Example value |
| specificWorkflowId | String | Foreign key reference | site-001, user-123 |
| startDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| endDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| reason | String | Reason for WorkflowDelegation | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |

## WorkflowTemplate

**Business Domain:** General Operations
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| name | String | Name information | John, Doe |
| description | String | Text description | Manufacturing notes, Quality requirements |
| workflowType | WorkflowType | Workflow type for WorkflowTemplate | Example value |
| category | String | Category for WorkflowTemplate | Example text, Sample value |
| templateDefinition | Json | Template definition for WorkflowTemplate | Example value |
| usageCount | Int | Usage count for WorkflowTemplate | 1, 10 |
| lastUsedAt | DateTime | Last used at for WorkflowTemplate | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| isActive | Boolean | Active status flag | true, false |
| isBuiltIn | Boolean | Is built in for WorkflowTemplate | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |

## WorkflowTask

**Business Domain:** General Operations
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| assignmentId | String | Foreign key reference | site-001, user-123 |
| assignedToId | String | Foreign key reference | site-001, user-123 |
| workflowInstanceId | String | Foreign key reference | site-001, user-123 |
| stageNumber | Int | Stage number for WorkflowTask | 1, 10 |
| entityType | String | Entity type for WorkflowTask | Example text, Sample value |
| entityId | String | Foreign key reference | site-001, user-123 |
| taskTitle | String | Task title for WorkflowTask | Example text, Sample value |
| taskDescription | String | Task description for WorkflowTask | Example text, Sample value |
| priority | Priority | Business priority level | HIGH, NORMAL |
| status | TaskStatus | Current operational status | ACTIVE, COMPLETED |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| dueDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| lastReminderSent | DateTime | Last reminder sent for WorkflowTask | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| reminderCount | Int | Reminder count for WorkflowTask | 1, 10 |

## WorkflowMetrics

**Business Domain:** General Operations
**Fields:** 17

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| periodStart | DateTime | Period start for WorkflowMetrics | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| periodEnd | DateTime | Period end for WorkflowMetrics | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| workflowId | String | Foreign key reference | site-001, user-123 |
| stageId | String | Foreign key reference | site-001, user-123 |
| workflowType | WorkflowType | Workflow type for WorkflowMetrics | Example value |
| userId | String | Foreign key reference | site-001, user-123 |
| roleId | String | Foreign key reference | site-001, user-123 |
| totalAssignments | Int | Total assignments for WorkflowMetrics | 1, 10 |
| completedOnTime | Int | Completed on time for WorkflowMetrics | 1, 10 |
| completedLate | Int | Completed late for WorkflowMetrics | 1, 10 |
| avgCompletionHours | Float | Avg completion hours for WorkflowMetrics | 1.5, 10.25 |
| escalationCount | Int | Escalation count for WorkflowMetrics | 1, 10 |
| rejectionCount | Int | Rejection count for WorkflowMetrics | 1, 10 |
| onTimePercentage | Float | On time percentage for WorkflowMetrics | 1.5, 10.25 |
| avgResponseHours | Float | Avg response hours for WorkflowMetrics | 1.5, 10.25 |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |

## WorkflowParallelCoordination

**Business Domain:** General Operations
**Fields:** 18

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| stageInstanceId | String | Foreign key reference | site-001, user-123 |
| groupId | String | Foreign key reference | site-001, user-123 |
| groupName | String | Group name for WorkflowParallelCoordination | Example text, Sample value |
| groupType | String | Group type for WorkflowParallelCoordination | Example text, Sample value |
| completionType | String | Completion type for WorkflowParallelCoordination | Example text, Sample value |
| thresholdValue | Int | Threshold value for WorkflowParallelCoordination | 1, 10 |
| totalAssignments | Int | Total assignments for WorkflowParallelCoordination | 1, 10 |
| completedAssignments | Int | Completed assignments for WorkflowParallelCoordination | 1, 10 |
| approvedAssignments | Int | Approved assignments for WorkflowParallelCoordination | 1, 10 |
| rejectedAssignments | Int | Rejected assignments for WorkflowParallelCoordination | 1, 10 |
| groupStatus | String | Group status for WorkflowParallelCoordination | Example text, Sample value |
| groupDecision | String | Group decision for WorkflowParallelCoordination | Example text, Sample value |
| completedAt | DateTime | Completed at for WorkflowParallelCoordination | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| metadata | Json | Metadata for WorkflowParallelCoordination | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| stageInstance | WorkflowStageInstance | Stage instance for WorkflowParallelCoordination | Example value |

## EngineeringChangeOrder

**Business Domain:** General Operations
**Fields:** 49

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| ecoNumber | String | Eco number for EngineeringChangeOrder | Example text, Sample value |
| title | String | Title for EngineeringChangeOrder | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| ecoType | ECOType | Eco type for EngineeringChangeOrder | Example value |
| priority | ECOPriority | Business priority level | HIGH, NORMAL |
| status | ECOStatus | Current operational status | ACTIVE, COMPLETED |
| currentState | String | Current state for EngineeringChangeOrder | Example text, Sample value |
| proposedChange | String | Proposed change for EngineeringChangeOrder | Example text, Sample value |
| reasonForChange | String | Reason for change for EngineeringChangeOrder | Example text, Sample value |
| benefitsExpected | String | Benefits expected for EngineeringChangeOrder | Example text, Sample value |
| risksIfNotImplemented | String | Risks if not implemented for EngineeringChangeOrder | Example text, Sample value |
| requestorId | String | Foreign key reference | site-001, user-123 |
| requestorName | String | Requestor name for EngineeringChangeOrder | Example text, Sample value |
| requestorDept | String | Requestor dept for EngineeringChangeOrder | Example text, Sample value |
| requestDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| sponsorId | String | Foreign key reference | site-001, user-123 |
| sponsorName | String | Sponsor name for EngineeringChangeOrder | Example text, Sample value |
| impactAnalysis | Json | Impact analysis for EngineeringChangeOrder | Example value |
| affectedParts | String | Affected parts for EngineeringChangeOrder | Example text, Sample value |
| affectedOperations | String | Affected operations for EngineeringChangeOrder | Example text, Sample value |
| estimatedCost | Float | Estimated cost for EngineeringChangeOrder | 1.5, 10.25 |
| actualCost | Float | Actual cost for EngineeringChangeOrder | 1.5, 10.25 |
| estimatedSavings | Float | Estimated savings for EngineeringChangeOrder | 1.5, 10.25 |
| actualSavings | Float | Actual savings for EngineeringChangeOrder | 1.5, 10.25 |
| costCurrency | String | Cost currency for EngineeringChangeOrder | Example text, Sample value |
| requestedEffectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| plannedEffectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| actualEffectiveDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| effectivityType | EffectivityType | Effectivity type for EngineeringChangeOrder | Example value |
| effectivityValue | String | Effectivity value for EngineeringChangeOrder | Example text, Sample value |
| isInterchangeable | Boolean | Is interchangeable for EngineeringChangeOrder | true, false |
| crbReviewDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| crbDecision | CRBDecision | Crb decision for EngineeringChangeOrder | Example value |
| crbNotes | String | Crb notes for EngineeringChangeOrder | Example text, Sample value |
| completedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| verifiedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| closedDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| closedById | String | Foreign key reference | site-001, user-123 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| affectedDocuments | ECOAffectedDocument | Affected documents for EngineeringChangeOrder | Example value |
| attachments | ECOAttachment | Attachments for EngineeringChangeOrder | Example value |
| crbReviews | ECOCRBReview | Crb reviews for EngineeringChangeOrder | Example value |
| history | ECOHistory | History for EngineeringChangeOrder | Example value |
| relatedECOs | ECORelation | Related e c os for EngineeringChangeOrder | Example value |
| parentRelations | ECORelation | Parent relations for EngineeringChangeOrder | Example value |
| tasks | ECOTask | Tasks for EngineeringChangeOrder | Example value |

## ECOAffectedDocument

**Business Domain:** Document Management
**Fields:** 16

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| ecoId | String | Foreign key reference | site-001, user-123 |
| documentType | String | Document type for ECOAffectedDocument | Example text, Sample value |
| documentId | String | Foreign key reference | site-001, user-123 |
| documentTitle | String | Document title for ECOAffectedDocument | Example text, Sample value |
| currentVersion | String | Current version for ECOAffectedDocument | Example text, Sample value |
| targetVersion | String | Target version for ECOAffectedDocument | Example text, Sample value |
| status | DocUpdateStatus | Current operational status | ACTIVE, COMPLETED |
| assignedToId | String | Foreign key reference | site-001, user-123 |
| assignedToName | String | Assigned to name for ECOAffectedDocument | Example text, Sample value |
| updateStartedAt | DateTime | Update started at for ECOAffectedDocument | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| updateCompletedAt | DateTime | Update completed at for ECOAffectedDocument | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| approvedAt | DateTime | Approved at for ECOAffectedDocument | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| eco | EngineeringChangeOrder | Eco for ECOAffectedDocument | Example value |

## ECOTask

**Business Domain:** General Operations
**Fields:** 19

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| ecoId | String | Foreign key reference | site-001, user-123 |
| taskName | String | Task name for ECOTask | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| taskType | ECOTaskType | Task type for ECOTask | Example value |
| assignedToId | String | Foreign key reference | site-001, user-123 |
| assignedToName | String | Assigned to name for ECOTask | Example text, Sample value |
| assignedToDept | String | Assigned to dept for ECOTask | Example text, Sample value |
| status | ECOTaskStatus | Current operational status | ACTIVE, COMPLETED |
| dueDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| startedAt | DateTime | Started at for ECOTask | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for ECOTask | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| prerequisiteTasks | String | Prerequisite tasks for ECOTask | Example text, Sample value |
| completionNotes | String | Completion notes for ECOTask | Example text, Sample value |
| verifiedById | String | Foreign key reference | site-001, user-123 |
| verifiedAt | DateTime | Verified at for ECOTask | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| eco | EngineeringChangeOrder | Eco for ECOTask | Example value |

## ECOAttachment

**Business Domain:** General Operations
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| ecoId | String | Foreign key reference | site-001, user-123 |
| fileName | String | File name for ECOAttachment | Example text, Sample value |
| fileUrl | String | File url for ECOAttachment | Example text, Sample value |
| fileSize | Int | File size for ECOAttachment | 1, 10 |
| mimeType | String | Mime type for ECOAttachment | Example text, Sample value |
| attachmentType | AttachmentType | Attachment type for ECOAttachment | Example value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| uploadedById | String | Foreign key reference | site-001, user-123 |
| uploadedByName | String | Uploaded by name for ECOAttachment | Example text, Sample value |
| uploadedAt | DateTime | Uploaded at for ECOAttachment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| eco | EngineeringChangeOrder | Eco for ECOAttachment | Example value |

## ECOHistory

**Business Domain:** General Operations
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| ecoId | String | Foreign key reference | site-001, user-123 |
| eventType | ECOEventType | Event type for ECOHistory | Example value |
| eventDescription | String | Event description for ECOHistory | Example text, Sample value |
| fromStatus | ECOStatus | From status for ECOHistory | Example value |
| toStatus | ECOStatus | To status for ECOHistory | Example value |
| details | Json | Details for ECOHistory | Example value |
| performedById | String | Foreign key reference | site-001, user-123 |
| performedByName | String | Performed by name for ECOHistory | Example text, Sample value |
| performedByRole | String | Performed by role for ECOHistory | Example text, Sample value |
| occurredAt | DateTime | Occurred at for ECOHistory | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| eco | EngineeringChangeOrder | Eco for ECOHistory | Example value |

## ECOCRBReview

**Business Domain:** General Operations
**Fields:** 18

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| ecoId | String | Foreign key reference | site-001, user-123 |
| meetingDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| meetingAgenda | String | Meeting agenda for ECOCRBReview | Example text, Sample value |
| members | Json | Members for ECOCRBReview | Example value |
| discussionNotes | String | Discussion notes for ECOCRBReview | Example text, Sample value |
| questionsConcerns | String | Questions concerns for ECOCRBReview | Example text, Sample value |
| decision | CRBDecision | Decision for ECOCRBReview | Example value |
| decisionRationale | String | Decision rationale for ECOCRBReview | Example text, Sample value |
| votesFor | Int | Votes for for ECOCRBReview | 1, 10 |
| votesAgainst | Int | Votes against for ECOCRBReview | 1, 10 |
| votesAbstain | Int | Votes abstain for ECOCRBReview | 1, 10 |
| conditions | String | Conditions for ECOCRBReview | Example text, Sample value |
| actionItems | Json | Action items for ECOCRBReview | Example value |
| nextReviewDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| eco | EngineeringChangeOrder | Eco for ECOCRBReview | Example value |

## ECORelation

**Business Domain:** General Operations
**Fields:** 8

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| parentEcoId | String | Foreign key reference | site-001, user-123 |
| relatedEcoId | String | Foreign key reference | site-001, user-123 |
| relationType | ECORelationType | Relation type for ECORelation | Example value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| parentEco | EngineeringChangeOrder | Parent eco for ECORelation | Example value |
| relatedEco | EngineeringChangeOrder | Related eco for ECORelation | Example value |

## CRBConfiguration

**Business Domain:** General Operations
**Fields:** 11

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| boardMembers | Json | Board members for CRBConfiguration | Example value |
| meetingFrequency | String | Meeting frequency for CRBConfiguration | Example text, Sample value |
| meetingDay | String | Meeting day for CRBConfiguration | Example text, Sample value |
| meetingTime | String | Meeting time for CRBConfiguration | Example text, Sample value |
| votingRule | VotingRule | Voting rule for CRBConfiguration | Example value |
| quorumRequired | Int | Quorum required for CRBConfiguration | 1, 10 |
| preReviewDays | Int | Pre review days for CRBConfiguration | 1, 10 |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |

## DocumentComment

**Business Domain:** Document Management
**Fields:** 25

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| documentType | String | Document type for DocumentComment | Example text, Sample value |
| documentId | String | Foreign key reference | site-001, user-123 |
| contextType | CommentContextType | Context type for DocumentComment | Example value |
| contextId | String | Foreign key reference | site-001, user-123 |
| contextPath | String | Context path for DocumentComment | Example text, Sample value |
| commentText | String | Comment text for DocumentComment | Example text, Sample value |
| attachments | String | Attachments for DocumentComment | Example text, Sample value |
| parentCommentId | String | Foreign key reference | site-001, user-123 |
| status | CommentStatus | Current operational status | ACTIVE, COMPLETED |
| priority | CommentPriority | Business priority level | HIGH, NORMAL |
| tags | String | Tags for DocumentComment | Example text, Sample value |
| isPinned | Boolean | Is pinned for DocumentComment | true, false |
| isResolved | Boolean | Is resolved for DocumentComment | true, false |
| resolvedAt | DateTime | Resolved at for DocumentComment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| resolvedById | String | Foreign key reference | site-001, user-123 |
| authorId | String | Foreign key reference | site-001, user-123 |
| authorName | String | Author name for DocumentComment | Example text, Sample value |
| mentionedUserIds | String | Mentioned user ids for DocumentComment | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| editedAt | DateTime | Edited at for DocumentComment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| reactions | CommentReaction | Reactions for DocumentComment | Example value |
| parentComment | DocumentComment | Parent comment for DocumentComment | Example value |
| replies | DocumentComment | Replies for DocumentComment | Example value |

## CommentReaction

**Business Domain:** General Operations
**Fields:** 7

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| commentId | String | Foreign key reference | site-001, user-123 |
| userId | String | Foreign key reference | site-001, user-123 |
| userName | String | User name for CommentReaction | Example text, Sample value |
| reactionType | ReactionType | Reaction type for CommentReaction | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| comment | DocumentComment | Comment for CommentReaction | Example value |

## DocumentAnnotation

**Business Domain:** Document Management
**Fields:** 18

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| documentType | String | Document type for DocumentAnnotation | Example text, Sample value |
| documentId | String | Foreign key reference | site-001, user-123 |
| mediaType | String | Media type for DocumentAnnotation | Example text, Sample value |
| mediaUrl | String | Media url for DocumentAnnotation | Example text, Sample value |
| annotationType | AnnotationType | Annotation type for DocumentAnnotation | Example value |
| annotationData | Json | Annotation data for DocumentAnnotation | Example value |
| text | String | Text for DocumentAnnotation | Example text, Sample value |
| color | String | Color for DocumentAnnotation | Example text, Sample value |
| strokeWidth | Int | Stroke width for DocumentAnnotation | 1, 10 |
| opacity | Float | Opacity for DocumentAnnotation | 1.5, 10.25 |
| fontSize | Int | Font size for DocumentAnnotation | 1, 10 |
| timestamp | Float | Timestamp for DocumentAnnotation | 1.5, 10.25 |
| authorId | String | Foreign key reference | site-001, user-123 |
| authorName | String | Author name for DocumentAnnotation | Example text, Sample value |
| isResolved | Boolean | Is resolved for DocumentAnnotation | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |

## ReviewAssignment

**Business Domain:** General Operations
**Fields:** 23

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| documentType | String | Document type for ReviewAssignment | Example text, Sample value |
| documentId | String | Foreign key reference | site-001, user-123 |
| documentVersion | String | Document version for ReviewAssignment | Example text, Sample value |
| reviewerId | String | Foreign key reference | site-001, user-123 |
| reviewerName | String | Reviewer name for ReviewAssignment | Example text, Sample value |
| assignedById | String | Foreign key reference | site-001, user-123 |
| assignedByName | String | Assigned by name for ReviewAssignment | Example text, Sample value |
| assignedAt | DateTime | Assigned at for ReviewAssignment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| reviewType | ReviewType | Review type for ReviewAssignment | Example value |
| instructions | String | Instructions for ReviewAssignment | Example text, Sample value |
| focusAreas | String | Focus areas for ReviewAssignment | Example text, Sample value |
| isRequired | Boolean | Is required for ReviewAssignment | true, false |
| deadline | DateTime | Deadline for ReviewAssignment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| checklistItems | Json | Checklist items for ReviewAssignment | Example value |
| status | ReviewStatus | Current operational status | ACTIVE, COMPLETED |
| startedAt | DateTime | Started at for ReviewAssignment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for ReviewAssignment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| recommendation | ReviewRecommendation | Recommendation for ReviewAssignment | Example value |
| summary | String | Summary for ReviewAssignment | Example text, Sample value |
| timeSpent | Int | Time spent for ReviewAssignment | 1, 10 |
| signatureId | String | Foreign key reference | site-001, user-123 |
| signedOffAt | DateTime | Signed off at for ReviewAssignment | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |

## DocumentActivity

**Business Domain:** Document Management
**Fields:** 11

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| documentType | String | Document type for DocumentActivity | Example text, Sample value |
| documentId | String | Foreign key reference | site-001, user-123 |
| activityType | ActivityType | Activity type for DocumentActivity | Example value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| changesSummary | Json | Changes summary for DocumentActivity | Example value |
| performedById | String | Foreign key reference | site-001, user-123 |
| performedByName | String | Performed by name for DocumentActivity | Example text, Sample value |
| performedByRole | String | Performed by role for DocumentActivity | Example text, Sample value |
| metadata | Json | Metadata for DocumentActivity | Example value |
| occurredAt | DateTime | Occurred at for DocumentActivity | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |

## DocumentSubscription

**Business Domain:** Document Management
**Fields:** 9

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| userId | String | Foreign key reference | site-001, user-123 |
| documentType | String | Document type for DocumentSubscription | Example text, Sample value |
| documentId | String | Foreign key reference | site-001, user-123 |
| notifyOnEdit | Boolean | Notify on edit for DocumentSubscription | true, false |
| notifyOnComment | Boolean | Notify on comment for DocumentSubscription | true, false |
| notifyOnApproval | Boolean | Notify on approval for DocumentSubscription | true, false |
| notifyOnVersion | Boolean | Notify on version for DocumentSubscription | true, false |
| subscribedAt | DateTime | Subscribed at for DocumentSubscription | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |

## UserNotification

**Business Domain:** Personnel Management
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| userId | String | Foreign key reference | site-001, user-123 |
| notificationType | NotificationType | Notification type for UserNotification | Example value |
| title | String | Title for UserNotification | Example text, Sample value |
| message | String | Message for UserNotification | Example text, Sample value |
| entityType | String | Entity type for UserNotification | Example text, Sample value |
| entityId | String | Foreign key reference | site-001, user-123 |
| actionUrl | String | Action url for UserNotification | Example text, Sample value |
| isRead | Boolean | Is read for UserNotification | true, false |
| readAt | DateTime | Read at for UserNotification | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| expiresAt | DateTime | Expires at for UserNotification | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |

## DocumentEditSession

**Business Domain:** Document Management
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| documentType | String | Document type for DocumentEditSession | Example text, Sample value |
| documentId | String | Foreign key reference | site-001, user-123 |
| userId | String | Foreign key reference | site-001, user-123 |
| userName | String | User name for DocumentEditSession | Example text, Sample value |
| sessionId | String | Foreign key reference | site-001, user-123 |
| startedAt | DateTime | Started at for DocumentEditSession | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| lastActivityAt | DateTime | Last activity at for DocumentEditSession | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| endedAt | DateTime | Ended at for DocumentEditSession | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| cursorPosition | Json | Cursor position for DocumentEditSession | Example value |
| lockedSections | String | Locked sections for DocumentEditSession | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |

## ConflictResolution

**Business Domain:** General Operations
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| documentType | String | Document type for ConflictResolution | Example text, Sample value |
| documentId | String | Foreign key reference | site-001, user-123 |
| conflictPath | String | Conflict path for ConflictResolution | Example text, Sample value |
| baseVersion | String | Base version for ConflictResolution | Example text, Sample value |
| yourVersion | Json | Your version for ConflictResolution | Example value |
| theirVersion | Json | Their version for ConflictResolution | Example value |
| theirUserId | String | Foreign key reference | site-001, user-123 |
| resolution | ResolutionType | Resolution for ConflictResolution | Example value |
| mergedVersion | Json | Merged version for ConflictResolution | Example value |
| resolvedById | String | Foreign key reference | site-001, user-123 |
| resolvedByName | String | Resolved by name for ConflictResolution | Example text, Sample value |
| resolvedAt | DateTime | Resolved at for ConflictResolution | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |

## StoredFile

**Business Domain:** General Operations
**Fields:** 47

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| storagePath | String | Storage path for StoredFile | Example text, Sample value |
| storageProvider | String | Storage provider for StoredFile | Example text, Sample value |
| bucket | String | Bucket for StoredFile | Example text, Sample value |
| fileName | String | File name for StoredFile | Example text, Sample value |
| originalFileName | String | Original file name for StoredFile | Example text, Sample value |
| fileSize | Int | File size for StoredFile | 1, 10 |
| mimeType | String | Mime type for StoredFile | Example text, Sample value |
| fileHash | String | File hash for StoredFile | Example text, Sample value |
| versionId | String | Foreign key reference | site-001, user-123 |
| isLatestVersion | Boolean | Is latest version for StoredFile | true, false |
| versionNumber | Int | Version number for StoredFile | 1, 10 |
| storageClass | StorageClass | Storage class for StoredFile | Example value |
| transitionedAt | DateTime | Transitioned at for StoredFile | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| metadata | Json | Metadata for StoredFile | Example value |
| tags | String | Tags for StoredFile | Example text, Sample value |
| cdnUrl | String | Cdn url for StoredFile | Example text, Sample value |
| cacheStatus | CacheStatus | Cache status for StoredFile | Example value |
| lastCacheUpdate | DateTime | Date value | 2024-10-30T10:00:00Z |
| accessCount | Int | Access count for StoredFile | 1, 10 |
| lastAccessedAt | DateTime | Last accessed at for StoredFile | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| downloadCount | Int | Download count for StoredFile | 1, 10 |
| documentType | String | Document type for StoredFile | Example text, Sample value |
| documentId | String | Foreign key reference | site-001, user-123 |
| attachmentType | FileAttachmentType | Attachment type for StoredFile | Example value |
| deduplicationRefs | Int | Deduplication refs for StoredFile | 1, 10 |
| originalFileId | String | Foreign key reference | site-001, user-123 |
| retentionPolicy | String | Retention policy for StoredFile | Example text, Sample value |
| expiresAt | DateTime | Expires at for StoredFile | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| autoDeleteAt | DateTime | Auto delete at for StoredFile | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| isEncrypted | Boolean | Is encrypted for StoredFile | true, false |
| encryptionKeyId | String | Foreign key reference | site-001, user-123 |
| encryptionAlgorithm | String | Encryption algorithm for StoredFile | Example text, Sample value |
| uploadedById | String | Foreign key reference | site-001, user-123 |
| uploadedByName | String | Uploaded by name for StoredFile | Example text, Sample value |
| uploadedAt | DateTime | Uploaded at for StoredFile | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| uploadMethod | UploadMethod | Upload method for StoredFile | Example value |
| uploadSessionId | String | Foreign key reference | site-001, user-123 |
| processingStatus | ProcessingStatus | Processing status for StoredFile | Example value |
| processingError | String | Processing error for StoredFile | Example text, Sample value |
| thumbnailGenerated | Boolean | Thumbnail generated for StoredFile | true, false |
| thumbnailPath | String | Thumbnail path for StoredFile | Example text, Sample value |
| backupEntries | BackupEntry | Backup entries for StoredFile | Example value |
| accessLogs | FileAccessLog | Access logs for StoredFile | Example value |
| versions | FileVersion | Versions for StoredFile | Example value |
| originalFile | StoredFile | Original file for StoredFile | Example value |
| duplicateFiles | StoredFile | Duplicate files for StoredFile | Example value |

## FileVersion

**Business Domain:** General Operations
**Fields:** 18

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| fileId | String | Foreign key reference | site-001, user-123 |
| versionNumber | Int | Version number for FileVersion | 1, 10 |
| versionId | String | Foreign key reference | site-001, user-123 |
| storagePath | String | Storage path for FileVersion | Example text, Sample value |
| fileSize | Int | File size for FileVersion | 1, 10 |
| fileHash | String | File hash for FileVersion | Example text, Sample value |
| mimeType | String | Mime type for FileVersion | Example text, Sample value |
| changeDescription | String | Change description for FileVersion | Example text, Sample value |
| changeType | VersionChangeType | Change type for FileVersion | Example value |
| storageClass | StorageClass | Storage class for FileVersion | Example value |
| metadata | Json | Metadata for FileVersion | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |
| createdByName | String | Created by name for FileVersion | Example text, Sample value |
| retentionPolicy | String | Retention policy for FileVersion | Example text, Sample value |
| expiresAt | DateTime | Expires at for FileVersion | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| file | StoredFile | File for FileVersion | Example value |

## BackupSchedule

**Business Domain:** General Operations
**Fields:** 25

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| name | String | Name information | John, Doe |
| description | String | Text description | Manufacturing notes, Quality requirements |
| bucketName | String | Bucket name for BackupSchedule | Example text, Sample value |
| backupBucket | String | Backup bucket for BackupSchedule | Example text, Sample value |
| includePattern | String | Include pattern for BackupSchedule | Example text, Sample value |
| excludePattern | String | Exclude pattern for BackupSchedule | Example text, Sample value |
| frequency | BackupFrequency | Frequency for BackupSchedule | Example value |
| cronExpression | String | Cron expression for BackupSchedule | Example text, Sample value |
| timezone | String | Timezone for BackupSchedule | Example text, Sample value |
| retentionDays | Int | Retention days for BackupSchedule | 1, 10 |
| maxBackups | Int | Max backups for BackupSchedule | 1, 10 |
| enableCompression | Boolean | Enable compression for BackupSchedule | true, false |
| enableEncryption | Boolean | Enable encryption for BackupSchedule | true, false |
| crossRegionReplication | Boolean | Cross region replication for BackupSchedule | true, false |
| isActive | Boolean | Active status flag | true, false |
| lastBackupAt | DateTime | Last backup at for BackupSchedule | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| nextBackupAt | DateTime | Next backup at for BackupSchedule | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| lastSuccessAt | DateTime | Last success at for BackupSchedule | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| lastFailureAt | DateTime | Last failure at for BackupSchedule | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdById | String | Foreign key reference | site-001, user-123 |
| updatedById | String | Foreign key reference | site-001, user-123 |
| backupHistory | BackupHistory | Backup history for BackupSchedule | Example value |

## BackupHistory

**Business Domain:** General Operations
**Fields:** 21

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| scheduleId | String | Foreign key reference | site-001, user-123 |
| backupType | BackupType | Backup type for BackupHistory | Example value |
| status | BackupStatus | Current operational status | ACTIVE, COMPLETED |
| sourceBucket | String | Source bucket for BackupHistory | Example text, Sample value |
| destBucket | String | Dest bucket for BackupHistory | Example text, Sample value |
| backupLocation | String | Backup location for BackupHistory | Example text, Sample value |
| fileCount | Int | File count for BackupHistory | 1, 10 |
| totalSize | Int | Total size for BackupHistory | 1, 10 |
| compressedSize | Int | Compressed size for BackupHistory | 1, 10 |
| compressionRatio | Float | Compression ratio for BackupHistory | 1.5, 10.25 |
| startedAt | DateTime | Started at for BackupHistory | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for BackupHistory | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| duration | Int | Duration for BackupHistory | 1, 10 |
| errorMessage | String | Error message for BackupHistory | Example text, Sample value |
| errorCode | String | Error code for BackupHistory | Example text, Sample value |
| checksumVerified | Boolean | Checksum verified for BackupHistory | true, false |
| verificationDate | DateTime | Date value | 2024-10-30T10:00:00Z |
| metadata | Json | Metadata for BackupHistory | Example value |
| backupEntries | BackupEntry | Backup entries for BackupHistory | Example value |
| schedule | BackupSchedule | Schedule for BackupHistory | Example value |

## BackupEntry

**Business Domain:** General Operations
**Fields:** 10

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| backupId | String | Foreign key reference | site-001, user-123 |
| fileId | String | Foreign key reference | site-001, user-123 |
| backupPath | String | Backup path for BackupEntry | Example text, Sample value |
| originalPath | String | Original path for BackupEntry | Example text, Sample value |
| checksum | String | Checksum for BackupEntry | Example text, Sample value |
| checksumVerified | Boolean | Checksum verified for BackupEntry | true, false |
| metadata | Json | Metadata for BackupEntry | Example value |
| backup | BackupHistory | Backup for BackupEntry | Example value |
| file | StoredFile | File for BackupEntry | Example value |

## FileAccessLog

**Business Domain:** General Operations
**Fields:** 20

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| fileId | String | Foreign key reference | site-001, user-123 |
| accessType | AccessType | Access type for FileAccessLog | Example value |
| accessMethod | String | Access method for FileAccessLog | Example text, Sample value |
| userId | String | Foreign key reference | site-001, user-123 |
| userName | String | User name for FileAccessLog | Example text, Sample value |
| userAgent | String | User agent for FileAccessLog | Example text, Sample value |
| ipAddress | String | Ip address for FileAccessLog | Example text, Sample value |
| referrer | String | Referrer for FileAccessLog | Example text, Sample value |
| requestHeaders | Json | Request headers for FileAccessLog | Example value |
| responseCode | Int | Response code for FileAccessLog | 1, 10 |
| responseSize | Int | Response size for FileAccessLog | 1, 10 |
| accessedAt | DateTime | Accessed at for FileAccessLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| duration | Int | Duration for FileAccessLog | 1, 10 |
| country | String | Country for FileAccessLog | Example text, Sample value |
| region | String | Region for FileAccessLog | Example text, Sample value |
| city | String | City for FileAccessLog | Example text, Sample value |
| cdnHit | Boolean | Cdn hit for FileAccessLog | true, false |
| edgeLocation | String | Edge location for FileAccessLog | Example text, Sample value |
| file | StoredFile | File for FileAccessLog | Example value |

## StorageMetrics

**Business Domain:** General Operations
**Fields:** 31

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| date | DateTime | Date value | 2024-10-30T10:00:00Z |
| hour | Int | Hour for StorageMetrics | 1, 10 |
| totalFiles | Int | Total files for StorageMetrics | 1, 10 |
| totalSize | Int | Total size for StorageMetrics | 1, 10 |
| hotStorageFiles | Int | Hot storage files for StorageMetrics | 1, 10 |
| hotStorageSize | Int | Hot storage size for StorageMetrics | 1, 10 |
| warmStorageFiles | Int | Warm storage files for StorageMetrics | 1, 10 |
| warmStorageSize | Int | Warm storage size for StorageMetrics | 1, 10 |
| coldStorageFiles | Int | Cold storage files for StorageMetrics | 1, 10 |
| coldStorageSize | Int | Cold storage size for StorageMetrics | 1, 10 |
| archiveFiles | Int | Archive files for StorageMetrics | 1, 10 |
| archiveSize | Int | Archive size for StorageMetrics | 1, 10 |
| imageFiles | Int | Image files for StorageMetrics | 1, 10 |
| imageSize | Int | Image size for StorageMetrics | 1, 10 |
| videoFiles | Int | Video files for StorageMetrics | 1, 10 |
| videoSize | Int | Video size for StorageMetrics | 1, 10 |
| documentFiles | Int | Document files for StorageMetrics | 1, 10 |
| documentSize | Int | Document size for StorageMetrics | 1, 10 |
| cadFiles | Int | Cad files for StorageMetrics | 1, 10 |
| cadSize | Int | Cad size for StorageMetrics | 1, 10 |
| uploads | Int | Uploads for StorageMetrics | 1, 10 |
| downloads | Int | Downloads for StorageMetrics | 1, 10 |
| deletes | Int | Deletes for StorageMetrics | 1, 10 |
| totalRequests | Int | Total requests for StorageMetrics | 1, 10 |
| totalBandwidth | Int | Total bandwidth for StorageMetrics | 1, 10 |
| cdnHits | Int | Cdn hits for StorageMetrics | 1, 10 |
| cdnMisses | Int | Cdn misses for StorageMetrics | 1, 10 |
| duplicateFiles | Int | Duplicate files for StorageMetrics | 1, 10 |
| spaceSaved | Int | Space saved for StorageMetrics | 1, 10 |
| estimatedCost | Decimal | Estimated cost for StorageMetrics | Example value |

## MultipartUpload

**Business Domain:** General Operations
**Fields:** 19

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| uploadId | String | Foreign key reference | site-001, user-123 |
| fileName | String | File name for MultipartUpload | Example text, Sample value |
| storagePath | String | Storage path for MultipartUpload | Example text, Sample value |
| totalSize | Int | Total size for MultipartUpload | 1, 10 |
| chunkSize | Int | Chunk size for MultipartUpload | 1, 10 |
| totalChunks | Int | Total chunks for MultipartUpload | 1, 10 |
| uploadedChunks | Int | Uploaded chunks for MultipartUpload | 1, 10 |
| status | UploadStatus | Current operational status | ACTIVE, COMPLETED |
| parts | Json | Parts for MultipartUpload | Example value |
| uploadedById | String | Foreign key reference | site-001, user-123 |
| uploadedByName | String | Uploaded by name for MultipartUpload | Example text, Sample value |
| startedAt | DateTime | Started at for MultipartUpload | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| lastActivityAt | DateTime | Last activity at for MultipartUpload | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| completedAt | DateTime | Completed at for MultipartUpload | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| expiresAt | DateTime | Expires at for MultipartUpload | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| errorMessage | String | Error message for MultipartUpload | Example text, Sample value |
| retryCount | Int | Retry count for MultipartUpload | 1, 10 |
| metadata | Json | Metadata for MultipartUpload | Example value |

## Role

**Business Domain:** Security & Access
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| roleCode | String | Role code for Role | Example text, Sample value |
| roleName | String | Role name for Role | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| isActive | Boolean | Active status flag | true, false |
| isGlobal | Boolean | Is global for Role | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdBy | String | Created by for Role | Example text, Sample value |
| permissions | RolePermission | Permissions for Role | Example value |
| userRoles | UserRole | User roles for Role | Example value |
| userSiteRoles | UserSiteRole | User site roles for Role | Example value |
| templateInstance | RoleTemplateInstance | Template instance for Role | Example value |

## Permission

**Business Domain:** Security & Access
**Fields:** 11

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| permissionCode | String | Permission code for Permission | Example text, Sample value |
| permissionName | String | Permission name for Permission | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| category | String | Category for Permission | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |
| isWildcard | Boolean | Is wildcard for Permission | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| roles | RolePermission | Roles for Permission | Example value |
| templatePermissions | RoleTemplatePermission | Template permissions for Permission | Example value |

## RolePermission

**Business Domain:** Security & Access
**Fields:** 7

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| roleId | String | Foreign key reference | site-001, user-123 |
| permissionId | String | Foreign key reference | site-001, user-123 |
| grantedAt | DateTime | Granted at for RolePermission | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| grantedBy | String | Granted by for RolePermission | Example text, Sample value |
| permission | Permission | Permission for RolePermission | Example value |
| role | Role | Role for RolePermission | Example value |

## UserRole

**Business Domain:** Personnel Management
**Fields:** 8

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| userId | String | Foreign key reference | site-001, user-123 |
| roleId | String | Foreign key reference | site-001, user-123 |
| assignedAt | DateTime | Assigned at for UserRole | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| assignedBy | String | Assigned by for UserRole | Example text, Sample value |
| expiresAt | DateTime | Expires at for UserRole | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| role | Role | Role for UserRole | Example value |
| user | User | User for UserRole | Example value |

## UserSiteRole

**Business Domain:** Personnel Management
**Fields:** 10

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| userId | String | Foreign key reference | site-001, user-123 |
| roleId | String | Foreign key reference | site-001, user-123 |
| siteId | String | Foreign key reference | site-001, user-123 |
| assignedAt | DateTime | Assigned at for UserSiteRole | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| assignedBy | String | Assigned by for UserSiteRole | Example text, Sample value |
| expiresAt | DateTime | Expires at for UserSiteRole | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| role | Role | Role for UserSiteRole | Example value |
| site | Site | Site for UserSiteRole | Example value |
| user | User | User for UserSiteRole | Example value |

## TimeTrackingConfiguration

**Business Domain:** General Operations
**Fields:** 21

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| siteId | String | Foreign key reference | site-001, user-123 |
| timeTrackingEnabled | Boolean | Time tracking enabled for TimeTrackingConfiguration | true, false |
| trackingGranularity | TimeTrackingGranularity | Tracking granularity for TimeTrackingConfiguration | Example value |
| costingModel | CostingModel | Costing model for TimeTrackingConfiguration | Example value |
| allowMultiTasking | Boolean | Allow multi tasking for TimeTrackingConfiguration | true, false |
| multiTaskingMode | MultiTaskingMode | Multi tasking mode for TimeTrackingConfiguration | Example value |
| autoSubtractBreaks | Boolean | Auto subtract breaks for TimeTrackingConfiguration | true, false |
| standardBreakMinutes | Int | Standard break minutes for TimeTrackingConfiguration | 1, 10 |
| requireBreakClockOut | Boolean | Require break clock out for TimeTrackingConfiguration | true, false |
| overtimeThresholdHours | Float | Overtime threshold hours for TimeTrackingConfiguration | 1.5, 10.25 |
| warnOnOvertime | Boolean | Warn on overtime for TimeTrackingConfiguration | true, false |
| enableMachineTracking | Boolean | Enable machine tracking for TimeTrackingConfiguration | true, false |
| autoStartFromMachine | Boolean | Auto start from machine for TimeTrackingConfiguration | true, false |
| autoStopFromMachine | Boolean | Auto stop from machine for TimeTrackingConfiguration | true, false |
| requireTimeApproval | Boolean | Require time approval for TimeTrackingConfiguration | true, false |
| approvalFrequency | ApprovalFrequency | Approval frequency for TimeTrackingConfiguration | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdBy | String | Created by for TimeTrackingConfiguration | Example text, Sample value |
| site | Site | Site for TimeTrackingConfiguration | Example value |

## LaborTimeEntry

**Business Domain:** General Operations
**Fields:** 33

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| userId | String | Foreign key reference | site-001, user-123 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| indirectCodeId | String | Foreign key reference | site-001, user-123 |
| timeType | TimeType | Time type for LaborTimeEntry | Example value |
| clockInTime | DateTime | Clock in time for LaborTimeEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| clockOutTime | DateTime | Clock out time for LaborTimeEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| duration | Float | Duration for LaborTimeEntry | 1.5, 10.25 |
| entrySource | TimeEntrySource | Entry source for LaborTimeEntry | Example value |
| deviceId | String | Foreign key reference | site-001, user-123 |
| location | String | Location for LaborTimeEntry | Example text, Sample value |
| status | TimeEntryStatus | Current operational status | ACTIVE, COMPLETED |
| approvedBy | String | Approved by for LaborTimeEntry | Example text, Sample value |
| approvedAt | DateTime | Approved at for LaborTimeEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| rejectionReason | String | Rejection reason for LaborTimeEntry | Example text, Sample value |
| costCenter | String | Cost center for LaborTimeEntry | Example text, Sample value |
| laborRate | Float | Labor rate for LaborTimeEntry | 1.5, 10.25 |
| laborCost | Float | Labor cost for LaborTimeEntry | 1.5, 10.25 |
| originalClockInTime | DateTime | Original clock in time for LaborTimeEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| originalClockOutTime | DateTime | Original clock out time for LaborTimeEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| editedBy | String | Edited by for LaborTimeEntry | Example text, Sample value |
| editedAt | DateTime | Edited at for LaborTimeEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| editReason | String | Edit reason for LaborTimeEntry | Example text, Sample value |
| exportedToSystem | String | Exported to system for LaborTimeEntry | Example text, Sample value |
| exportedAt | DateTime | Exported at for LaborTimeEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| externalReferenceId | String | Foreign key reference | site-001, user-123 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| indirectCode | IndirectCostCode | Indirect code for LaborTimeEntry | Example value |
| operation | WorkOrderOperation | Operation for LaborTimeEntry | Example value |
| user | User | User for LaborTimeEntry | Example value |
| workOrder | WorkOrder | Work order for LaborTimeEntry | Example value |

## MachineTimeEntry

**Business Domain:** Equipment Management
**Fields:** 22

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| equipmentId | String | Foreign key reference | site-001, user-123 |
| workOrderId | String | Foreign key reference | site-001, user-123 |
| operationId | String | Foreign key reference | site-001, user-123 |
| startTime | DateTime | Start time for MachineTimeEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| endTime | DateTime | End time for MachineTimeEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| duration | Float | Duration for MachineTimeEntry | 1.5, 10.25 |
| entrySource | TimeEntrySource | Entry source for MachineTimeEntry | Example value |
| dataSource | String | Data source for MachineTimeEntry | Example text, Sample value |
| cycleCount | Int | Cycle count for MachineTimeEntry | 1, 10 |
| partCount | Int | Part count for MachineTimeEntry | 1, 10 |
| machineUtilization | Float | Machine utilization for MachineTimeEntry | 1.5, 10.25 |
| status | TimeEntryStatus | Current operational status | ACTIVE, COMPLETED |
| machineRate | Float | Machine rate for MachineTimeEntry | 1.5, 10.25 |
| machineCost | Float | Machine cost for MachineTimeEntry | 1.5, 10.25 |
| exportedToSystem | String | Exported to system for MachineTimeEntry | Example text, Sample value |
| exportedAt | DateTime | Exported at for MachineTimeEntry | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| equipment | Equipment | Equipment for MachineTimeEntry | Example value |
| operation | WorkOrderOperation | Operation for MachineTimeEntry | Example value |
| workOrder | WorkOrder | Work order for MachineTimeEntry | Example value |

## IndirectCostCode

**Business Domain:** General Operations
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| code | String | Code for IndirectCostCode | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| category | IndirectCategory | Category for IndirectCostCode | Example value |
| costCenter | String | Cost center for IndirectCostCode | Example text, Sample value |
| glAccount | String | Gl account for IndirectCostCode | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |
| siteId | String | Foreign key reference | site-001, user-123 |
| displayColor | String | Display color for IndirectCostCode | Example text, Sample value |
| displayIcon | String | Display icon for IndirectCostCode | Example text, Sample value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdBy | String | Created by for IndirectCostCode | Example text, Sample value |
| site | Site | Site for IndirectCostCode | Example value |
| laborEntries | LaborTimeEntry | Labor entries for IndirectCostCode | Example value |

## TimeEntryValidationRule

**Business Domain:** General Operations
**Fields:** 10

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| ruleName | String | Rule name for TimeEntryValidationRule | Example text, Sample value |
| ruleType | TimeValidationRuleType | Rule type for TimeEntryValidationRule | Example value |
| condition | String | Condition for TimeEntryValidationRule | Example text, Sample value |
| errorMessage | String | Error message for TimeEntryValidationRule | Example text, Sample value |
| severity | String | Severity for TimeEntryValidationRule | Example text, Sample value |
| isActive | Boolean | Active status flag | true, false |
| siteId | String | Foreign key reference | site-001, user-123 |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |

## SsoProvider

**Business Domain:** General Operations
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| name | String | Name information | John, Doe |
| type | SsoProviderType | Type for SsoProvider | Example value |
| configId | String | Foreign key reference | site-001, user-123 |
| priority | Int | Business priority level | HIGH, NORMAL |
| isActive | Boolean | Active status flag | true, false |
| isDefault | Boolean | Is default for SsoProvider | true, false |
| domainRestrictions | String | Domain restrictions for SsoProvider | Example text, Sample value |
| groupRestrictions | String | Group restrictions for SsoProvider | Example text, Sample value |
| metadata | Json | Metadata for SsoProvider | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| authenticationEvents | AuthenticationEvent | Authentication events for SsoProvider | Example value |
| homeRealmRules | HomeRealmDiscovery | Home realm rules for SsoProvider | Example value |
| ssoSessions | SsoSession | Sso sessions for SsoProvider | Example value |

## SsoSession

**Business Domain:** General Operations
**Fields:** 10

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| userId | String | Foreign key reference | site-001, user-123 |
| primaryProviderId | String | Foreign key reference | site-001, user-123 |
| activeProviders | String | Active providers for SsoSession | Example text, Sample value |
| sessionData | Json | Session data for SsoSession | Example value |
| expiresAt | DateTime | Expires at for SsoSession | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| lastActivityAt | DateTime | Last activity at for SsoSession | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| primaryProvider | SsoProvider | Primary provider for SsoSession | Example value |
| user | User | User for SsoSession | Example value |

## AuthenticationEvent

**Business Domain:** General Operations
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| userId | String | Foreign key reference | site-001, user-123 |
| providerId | String | Foreign key reference | site-001, user-123 |
| eventType | AuthenticationEventType | Event type for AuthenticationEvent | Example value |
| userAgent | String | User agent for AuthenticationEvent | Example text, Sample value |
| ipAddress | String | Ip address for AuthenticationEvent | Example text, Sample value |
| location | String | Location for AuthenticationEvent | Example text, Sample value |
| responseTime | Int | Response time for AuthenticationEvent | 1, 10 |
| errorCode | String | Error code for AuthenticationEvent | Example text, Sample value |
| errorMessage | String | Error message for AuthenticationEvent | Example text, Sample value |
| metadata | Json | Metadata for AuthenticationEvent | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| provider | SsoProvider | Provider for AuthenticationEvent | Example value |
| user | User | User for AuthenticationEvent | Example value |

## HomeRealmDiscovery

**Business Domain:** General Operations
**Fields:** 8

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| name | String | Name information | John, Doe |
| pattern | String | Pattern for HomeRealmDiscovery | Example text, Sample value |
| providerId | String | Foreign key reference | site-001, user-123 |
| priority | Int | Business priority level | HIGH, NORMAL |
| isActive | Boolean | Active status flag | true, false |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| provider | SsoProvider | Provider for HomeRealmDiscovery | Example value |

## PermissionUsageLog

**Business Domain:** Security & Access
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| userId | String | Foreign key reference | site-001, user-123 |
| permission | String | Permission for PermissionUsageLog | Example text, Sample value |
| endpoint | String | Endpoint for PermissionUsageLog | Example text, Sample value |
| method | String | Method for PermissionUsageLog | Example text, Sample value |
| success | Boolean | Success for PermissionUsageLog | true, false |
| timestamp | DateTime | Timestamp for PermissionUsageLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| ip | String | Ip for PermissionUsageLog | Example text, Sample value |
| userAgent | String | User agent for PermissionUsageLog | Example text, Sample value |
| siteId | String | Foreign key reference | site-001, user-123 |
| duration | Int | Duration for PermissionUsageLog | 1, 10 |
| context | Json | Context for PermissionUsageLog | Example value |
| site | Site | Site for PermissionUsageLog | Example value |
| user | User | User for PermissionUsageLog | Example value |

## SecurityEvent

**Business Domain:** General Operations
**Fields:** 16

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| eventType | SecurityEventType | Event type for SecurityEvent | Example value |
| severity | SecuritySeverity | Severity for SecurityEvent | Example value |
| userId | String | Foreign key reference | site-001, user-123 |
| ip | String | Ip for SecurityEvent | Example text, Sample value |
| userAgent | String | User agent for SecurityEvent | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| metadata | Json | Metadata for SecurityEvent | Example value |
| timestamp | DateTime | Timestamp for SecurityEvent | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| resolved | Boolean | Resolved for SecurityEvent | true, false |
| resolvedBy | String | Resolved by for SecurityEvent | Example text, Sample value |
| resolvedAt | DateTime | Resolved at for SecurityEvent | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| siteId | String | Foreign key reference | site-001, user-123 |
| resolvedByUser | User | Resolved by user for SecurityEvent | Example value |
| site | Site | Site for SecurityEvent | Example value |
| user | User | User for SecurityEvent | Example value |

## UserSessionLog

**Business Domain:** Personnel Management
**Fields:** 12

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| userId | String | Foreign key reference | site-001, user-123 |
| sessionId | String | Foreign key reference | site-001, user-123 |
| ip | String | Ip for UserSessionLog | Example text, Sample value |
| userAgent | String | User agent for UserSessionLog | Example text, Sample value |
| startTime | DateTime | Start time for UserSessionLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| endTime | DateTime | End time for UserSessionLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| duration | Int | Duration for UserSessionLog | 1, 10 |
| actionsCount | Int | Actions count for UserSessionLog | 1, 10 |
| siteAccess | String | Site access for UserSessionLog | Example text, Sample value |
| lastActivity | DateTime | Last activity for UserSessionLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| user | User | User for UserSessionLog | Example value |

## AuditReport

**Business Domain:** General Operations
**Fields:** 13

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| reportType | ReportType | Report type for AuditReport | Example value |
| title | String | Title for AuditReport | Example text, Sample value |
| parameters | Json | Parameters for AuditReport | Example value |
| generatedBy | String | Generated by for AuditReport | Example text, Sample value |
| generatedAt | DateTime | Generated at for AuditReport | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| filePath | String | File path for AuditReport | Example text, Sample value |
| status | ReportStatus | Current operational status | ACTIVE, COMPLETED |
| error | String | Error for AuditReport | Example text, Sample value |
| downloadCount | Int | Download count for AuditReport | 1, 10 |
| siteId | String | Foreign key reference | site-001, user-123 |
| generatedByUser | User | Generated by user for AuditReport | Example value |
| site | Site | Site for AuditReport | Example value |

## PermissionChangeLog

**Business Domain:** Security & Access
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| changeType | PermissionChangeType | Change type for PermissionChangeLog | Example value |
| targetUserId | String | Foreign key reference | site-001, user-123 |
| targetRole | String | Target role for PermissionChangeLog | Example text, Sample value |
| permission | String | Permission for PermissionChangeLog | Example text, Sample value |
| oldValue | Json | Old value for PermissionChangeLog | Example value |
| newValue | Json | New value for PermissionChangeLog | Example value |
| changedBy | String | Changed by for PermissionChangeLog | Example text, Sample value |
| reason | String | Reason for PermissionChangeLog | Example text, Sample value |
| timestamp | DateTime | Timestamp for PermissionChangeLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| siteId | String | Foreign key reference | site-001, user-123 |
| changedByUser | User | Changed by user for PermissionChangeLog | Example value |
| site | Site | Site for PermissionChangeLog | Example value |
| targetUser | User | Target user for PermissionChangeLog | Example value |

## RoleTemplate

**Business Domain:** Security & Access
**Fields:** 18

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| templateCode | String | Template code for RoleTemplate | Example text, Sample value |
| templateName | String | Template name for RoleTemplate | Example text, Sample value |
| description | String | Text description | Manufacturing notes, Quality requirements |
| category | RoleTemplateCategory | Category for RoleTemplate | Example value |
| isActive | Boolean | Active status flag | true, false |
| isGlobal | Boolean | Is global for RoleTemplate | true, false |
| version | String | Version for RoleTemplate | Example text, Sample value |
| metadata | Json | Metadata for RoleTemplate | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| updatedAt | DateTime | Last modification timestamp | 2024-10-30T14:30:00Z |
| createdBy | String | Created by for RoleTemplate | Example text, Sample value |
| updatedBy | String | Updated by for RoleTemplate | Example text, Sample value |
| permissions | RoleTemplatePermission | Permissions for RoleTemplate | Example value |
| instances | RoleTemplateInstance | Instances for RoleTemplate | Example value |
| usageLogs | RoleTemplateUsageLog | Usage logs for RoleTemplate | Example value |
| creator | User | Creator for RoleTemplate | Example value |
| updater | User | Updater for RoleTemplate | Example value |

## RoleTemplatePermission

**Business Domain:** Security & Access
**Fields:** 9

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| templateId | String | Foreign key reference | site-001, user-123 |
| permissionId | String | Foreign key reference | site-001, user-123 |
| isRequired | Boolean | Is required for RoleTemplatePermission | true, false |
| isOptional | Boolean | Is optional for RoleTemplatePermission | true, false |
| metadata | Json | Metadata for RoleTemplatePermission | Example value |
| createdAt | DateTime | Record creation timestamp | 2024-10-30T10:00:00Z |
| template | RoleTemplate | Template for RoleTemplatePermission | Example value |
| permission | Permission | Permission for RoleTemplatePermission | Example value |

## RoleTemplateInstance

**Business Domain:** Security & Access
**Fields:** 15

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| templateId | String | Foreign key reference | site-001, user-123 |
| roleId | String | Foreign key reference | site-001, user-123 |
| instanceName | String | Instance name for RoleTemplateInstance | Example text, Sample value |
| siteId | String | Foreign key reference | site-001, user-123 |
| customPermissions | Json | Custom permissions for RoleTemplateInstance | Example value |
| isActive | Boolean | Active status flag | true, false |
| instantiatedAt | DateTime | Instantiated at for RoleTemplateInstance | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| instantiatedBy | String | Instantiated by for RoleTemplateInstance | Example text, Sample value |
| metadata | Json | Metadata for RoleTemplateInstance | Example value |
| template | RoleTemplate | Template for RoleTemplateInstance | Example value |
| role | Role | Role for RoleTemplateInstance | Example value |
| site | Site | Site for RoleTemplateInstance | Example value |
| instantiator | User | Instantiator for RoleTemplateInstance | Example value |
| usageLogs | RoleTemplateUsageLog | Usage logs for RoleTemplateInstance | Example value |

## RoleTemplateUsageLog

**Business Domain:** Security & Access
**Fields:** 14

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| id | String | Unique identifier | usr-123, wo-456 |
| templateId | String | Foreign key reference | site-001, user-123 |
| instanceId | String | Foreign key reference | site-001, user-123 |
| action | RoleTemplateAction | Action for RoleTemplateUsageLog | Example value |
| performedBy | String | Performed by for RoleTemplateUsageLog | Example text, Sample value |
| targetUserId | String | Foreign key reference | site-001, user-123 |
| siteId | String | Foreign key reference | site-001, user-123 |
| details | Json | Details for RoleTemplateUsageLog | Example value |
| timestamp | DateTime | Timestamp for RoleTemplateUsageLog | 2024-10-30T10:00:00Z, 2024-10-30T14:30:00Z |
| template | RoleTemplate | Template for RoleTemplateUsageLog | Example value |
| instance | RoleTemplateInstance | Instance for RoleTemplateUsageLog | Example value |
| performer | User | Performer for RoleTemplateUsageLog | Example value |
| targetUser | User | Target user for RoleTemplateUsageLog | Example value |
| site | Site | Site for RoleTemplateUsageLog | Example value |

