# MachShop Database Schema Analysis - Comprehensive Summary

## Executive Overview

This document provides a complete analysis of the MachShop Manufacturing Execution System (MES) database schema, including field counts, enum definitions, naming patterns, and documentation coverage for field example population.

---

## 1. SCHEMA SIZE & SCOPE

### Database Metrics
- **Total Models/Tables**: 398
- **Total Fields**: 7,859 fields across all tables
- **Total Enums (Prisma Schema)**: 159
- **Total Enum Values**: 1,300+ distinct enumeration values
- **Prisma Schema File Size**: 16,734 lines

### Table Distribution
Sample of first 50 model names:
```
Enterprise, Site, Area, Department, User, PersonnelClass, PersonnelQualification,
PersonnelCertification, PersonnelSkill, PersonnelSkillAssignment, PersonnelWorkCenterAssignment,
PersonnelAvailability, UnitOfMeasure, MaterialClass, MaterialDefinition, MaterialProperty,
MaterialLot, MaterialSublot, MaterialLotGenealogy, MaterialStateHistory, Operation,
OperationParameter, ParameterLimits, ParameterGroup, ParameterFormula, OperationDependency,
PersonnelOperationSpecification, EquipmentOperationSpecification, MaterialOperationSpecification,
PhysicalAssetOperationSpecification, Part, PartSiteAvailability, BOMItem, ProductSpecification,
ProductConfiguration, ConfigurationOption, ProductLifecycle, WorkOrder, Routing, RoutingOperation,
RoutingStep, RoutingStepDependency, RoutingStepParameter, RoutingTemplate, WorkCenter, WorkUnit,
WorkOrderOperation, ProductionSchedule, ScheduleEntry, ScheduleConstraint
```

---

## 2. FIELD-DESCRIPTIONS.JSON COVERAGE

### Current Documentation Status
- **Total Fields Documented**: 7,869
- **Fields WITH Examples**: 17 (0.22%)
- **Fields MISSING Examples**: 7,852 (99.78%)

### Key Insight
**The field-descriptions.json file has comprehensive business context metadata BUT nearly all fields lack concrete examples.** This is the primary gap for documentation population.

### Documented Fields with Examples (17 total)
- WorkOrder.workOrderNumber
- WorkOrder.priority
- WorkOrder.actualStartDate
- Material.lotNumber
- Material.unitOfMeasure
- (Only 12 more across the entire database)

---

## 3. COMPREHENSIVE ENUM REFERENCE

### Full Enum Count: 159 Enums

#### Personnel & Qualifications (5 enums)
1. **QualificationType** - CERTIFICATION, LICENSE, TRAINING, SKILL
2. **CertificationStatus** - ACTIVE, EXPIRED, SUSPENDED, REVOKED, PENDING
3. **SkillCategory** - MACHINING, WELDING, INSPECTION, ASSEMBLY, PROGRAMMING, MAINTENANCE, QUALITY, SAFETY, MANAGEMENT, OTHER
4. **CompetencyLevel** - NOVICE, ADVANCED_BEGINNER, COMPETENT, PROFICIENT, EXPERT
5. **AvailabilityType** - AVAILABLE, VACATION, SICK_LEAVE, TRAINING, MEETING, UNAVAILABLE

#### Material & Inventory (6 enums)
6. **MaterialType** - RAW_MATERIAL, COMPONENT, SUBASSEMBLY, ASSEMBLY, FINISHED_GOODS, WIP, CONSUMABLE, PACKAGING, TOOLING, MAINTENANCE
7. **MaterialPropertyType** - PHYSICAL, CHEMICAL, MECHANICAL, THERMAL, ELECTRICAL, OPTICAL, REGULATORY, OTHER
8. **MaterialLotStatus** - AVAILABLE, RESERVED, IN_USE, DEPLETED, QUARANTINED, EXPIRED, REJECTED, RETURNED, SCRAPPED
9. **MaterialLotState** - RECEIVED, INSPECTED, APPROVED, ISSUED, IN_PROCESS, CONSUMED, RETURNED, DISPOSED
10. **QualityLotStatus** - PENDING, IN_INSPECTION, APPROVED, REJECTED, CONDITIONAL
11. **SublotOperationType** - SPLIT, MERGE, TRANSFER, REWORK

#### Operations & Routing (8 enums)
12. **OperationType** - PRODUCTION, QUALITY, MATERIAL_HANDLING, MAINTENANCE, SETUP, CLEANING, PACKAGING, TESTING, REWORK, OTHER
13. **OperationClassification** - MAKE, ASSEMBLY, INSPECTION, TEST, REWORK, SETUP, SUBCONTRACT, PACKING
14. **ParameterType** - INPUT, OUTPUT, SET_POINT, MEASURED, CALCULATED
15. **ParameterDataType** - NUMBER, STRING, BOOLEAN, ENUM, DATE, JSON
16. **ParameterGroupType** - PROCESS, QUALITY, MATERIAL, EQUIPMENT, ENVIRONMENTAL, CUSTOM
17. **FormulaLanguage** - JAVASCRIPT, PYTHON, SQL
18. **DependencyType** - MUST_COMPLETE, MUST_START, OVERLAP_ALLOWED, PARALLEL
19. **DependencyTimingType** - FINISH_TO_START, START_TO_START, FINISH_TO_FINISH, START_TO_FINISH

#### Production & Scheduling (8 enums)
20. **WorkOrderPriority** - LOW, NORMAL, HIGH, URGENT
21. **WorkOrderStatus** - CREATED, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD
22. **RoutingLifecycleState** - DRAFT, REVIEW, RELEASED, PRODUCTION, OBSOLETE
23. **RoutingType** - PRIMARY, ALTERNATE, REWORK, PROTOTYPE, ENGINEERING
24. **StepType** - PROCESS, INSPECTION, DECISION, PARALLEL_SPLIT, PARALLEL_JOIN, OSP, LOT_SPLIT, LOT_MERGE, TELESCOPING, START, END
25. **ControlType** - LOT_CONTROLLED, SERIAL_CONTROLLED, MIXED
26. **WorkOrderOperationStatus** - PENDING, IN_PROGRESS, COMPLETED, SKIPPED
27. **ScheduleState** - FORECAST, RELEASED, DISPATCHED, RUNNING, COMPLETED, CLOSED

#### Quality & Compliance (11 enums)
28. **QualityToleranceType** - BILATERAL, UNILATERAL_PLUS, UNILATERAL_MINUS, NOMINAL
29. **QualityInspectionStatus** - CREATED, IN_PROGRESS, COMPLETED, CANCELLED
30. **QualityInspectionResult** - PASS, FAIL, CONDITIONAL
31. **NCRSeverity** - MINOR, MAJOR, CRITICAL
32. **NCRStatus** - OPEN, IN_REVIEW, CORRECTIVE_ACTION, CLOSED
33. **InspectionType** - FIRST_ARTICLE, IN_PROCESS, FINAL, RECEIVING, AUDIT, PATROL
34. **InspectionFrequency** - PER_PIECE, PER_BATCH, PER_LOT, PERIODIC, SAMPLING, ON_DEMAND
35. **MeasurementType** - DIMENSIONAL, VISUAL, FUNCTIONAL, MATERIAL, SURFACE_FINISH, GEOMETRIC_TOLERANCE
36. **InspectionResult** - PASS, FAIL, CONDITIONAL_PASS, PENDING_REVIEW
37. **Disposition** - ACCEPT, REJECT, REWORK, USE_AS_IS, RETURN_TO_VENDOR, SCRAP
38. **FAIStatus** - IN_PROGRESS, REVIEW, APPROVED, REJECTED, SUPERSEDED

#### Equipment & Assets (7 enums)
39. **PhysicalAssetType** - TOOLING, FIXTURE, GAUGE, CONSUMABLE, PPE, MOLD, PATTERN, SOFTWARE, OTHER
40. **EquipmentClass** - PRODUCTION, MAINTENANCE, QUALITY, MATERIAL_HANDLING, LABORATORY, STORAGE, ASSEMBLY
41. **EquipmentStatus** - AVAILABLE, IN_USE, OPERATIONAL, MAINTENANCE, DOWN, RETIRED
42. **EquipmentState** - IDLE, RUNNING, BLOCKED, STARVED, FAULT, MAINTENANCE, SETUP, EMERGENCY
43. **EquipmentLogType** - MAINTENANCE, REPAIR, CALIBRATION, STATUS_CHANGE, USAGE
44. **EquipmentCommandType** - START, STOP, PAUSE, RESUME, RESET, CONFIGURE, LOAD_PROGRAM, UNLOAD_PROGRAM, DIAGNOSTIC, CALIBRATE, EMERGENCY_STOP
45. **EquipmentCommandStatus** - PENDING, SENT, ACKNOWLEDGED, EXECUTING, COMPLETED, FAILED, TIMEOUT, CANCELLED

#### Product & Configuration (5 enums)
46. **ProductType** - MADE_TO_STOCK, MADE_TO_ORDER, ENGINEER_TO_ORDER, CONFIGURE_TO_ORDER, ASSEMBLE_TO_ORDER
47. **ProductLifecycleState** - DESIGN, PROTOTYPE, PILOT_PRODUCTION, PRODUCTION, MATURE, PHASE_OUT, OBSOLETE, ARCHIVED
48. **ConfigurationType** - STANDARD, VARIANT, CUSTOM, CONFIGURABLE
49. **SpecificationType** - PHYSICAL, CHEMICAL, MECHANICAL, ELECTRICAL, PERFORMANCE, REGULATORY, ENVIRONMENTAL, SAFETY, QUALITY, OTHER
50. **ConsumptionType** - PER_UNIT, PER_BATCH, FIXED, SETUP

#### Data Collection & Monitoring (4 enums)
51. **DataCollectionType** - SENSOR, ALARM, EVENT, MEASUREMENT, STATUS, PERFORMANCE
52. **SPCChartType** - X_BAR_R, X_BAR_S, I_MR, P_CHART, NP_CHART, C_CHART, U_CHART, EWMA, CUSUM
53. **LimitCalculationMethod** - HISTORICAL_DATA, SPEC_LIMITS, MANUAL
54. **SamplingPlanType** - SINGLE, DOUBLE, MULTIPLE, SEQUENTIAL

#### Integration (5 enums)
55. **IntegrationType** - ERP, PLM, CMMS, WMS, QMS, HISTORIAN, DNC, SFC, SKILLS, CALIBRATION, PDM, CMM, CUSTOM
56. **IntegrationDirection** - INBOUND, OUTBOUND, BIDIRECTIONAL
57. **IntegrationLogStatus** - PENDING, IN_PROGRESS, SUCCESS, FAILED, PARTIAL, TIMEOUT, CANCELLED
58. **B2MMessageStatus** - PENDING, VALIDATED, PROCESSING, PROCESSED, SENT, CONFIRMED, ACCEPTED, FAILED, REJECTED, TIMEOUT
59. **ERPTransactionType** - ISSUE, RECEIPT, RETURN, TRANSFER, ADJUSTMENT, SCRAP, CONSUMPTION

#### Work Instructions & Documentation (8 enums)
60. **WorkInstructionStatus** - DRAFT, REVIEW, APPROVED, REJECTED, SUPERSEDED, ARCHIVED
61. **WorkInstructionExecutionStatus** - IN_PROGRESS, COMPLETED, PAUSED, CANCELLED
62. **WorkInstructionFormat** - NATIVE, IMPORTED_PDF, IMPORTED_DOC, IMPORTED_PPT, HYBRID
63. **MediaType** - IMAGE, VIDEO, DOCUMENT, DIAGRAM, CAD_MODEL, ANIMATION
64. **RelationType** - PREREQUISITE, SUPERSEDES, RELATED_TO, ALTERNATIVE_TO, REFERENCED_BY
65. **ExportTemplateType** - WORK_INSTRUCTION, SETUP_SHEET, INSPECTION_PLAN, SOP
66. **ExportFormat** - PDF, DOCX, PPTX
67. **DocumentType** - WORK_INSTRUCTION, SETUP_SHEET, INSPECTION_PLAN, SOP, TOOL_DRAWING

#### Workflow & Approval (13 enums)
68. **WorkflowType** - WORK_INSTRUCTION, SETUP_SHEET, INSPECTION_PLAN, SOP, TOOL_DRAWING, ECO, NCR, CAPA, CHANGE_REQUEST, DOCUMENT_APPROVAL, FAI_REPORT, QUALITY_PROCESS
69. **ApprovalType** - ALL_REQUIRED, ANY_ONE, THRESHOLD, PERCENTAGE, WEIGHTED
70. **AssignmentStrategy** - MANUAL, ROLE_BASED, LOAD_BALANCED, ROUND_ROBIN
71. **ConditionOperator** - EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN, GREATER_THAN_OR_EQUAL, LESS_THAN_OR_EQUAL, IN, NOT_IN, CONTAINS, REGEX_MATCH
72. **RuleActionType** - ADD_STAGE, SKIP_STAGE, CHANGE_APPROVERS, SET_DEADLINE, SEND_NOTIFICATION, REQUIRE_SIGNATURE_TYPE
73. **WorkflowStatus** - IN_PROGRESS, COMPLETED, REJECTED, CANCELLED, ON_HOLD
74. **Priority** - LOW, NORMAL, HIGH, CRITICAL
75. **ImpactLevel** - NONE, LOW, MEDIUM, HIGH, CRITICAL
76. **StageStatus** - PENDING, IN_PROGRESS, COMPLETED, SKIPPED, ESCALATED
77. **StageOutcome** - APPROVED, REJECTED, CHANGES_REQUESTED, DELEGATED, SKIPPED
78. **AssignmentType** - REQUIRED, OPTIONAL, OBSERVER
79. **ApprovalAction** - APPROVED, REJECTED, CHANGES_REQUESTED, DELEGATED, SKIPPED
80. **WorkflowEventType** - WORKFLOW_STARTED, STAGE_STARTED, STAGE_COMPLETED, APPROVAL_GRANTED, APPROVAL_REJECTED, CHANGES_REQUESTED, DELEGATED, ESCALATED, DEADLINE_EXTENDED, WORKFLOW_COMPLETED, WORKFLOW_CANCELLED, REMINDER_SENT, RULE_EVALUATED, STAGE_ADDED, STAGE_SKIPPED

#### Engineering Change Orders (7 enums)
81. **ECOType** - CORRECTIVE, IMPROVEMENT, COST_REDUCTION, COMPLIANCE, CUSTOMER_REQUEST, ENGINEERING, EMERGENCY
82. **ECOPriority** - LOW, MEDIUM, HIGH, CRITICAL, EMERGENCY
83. **ECOStatus** - REQUESTED, UNDER_REVIEW, PENDING_CRB, CRB_APPROVED, IMPLEMENTATION, VERIFICATION, COMPLETED, REJECTED, CANCELLED, ON_HOLD
84. **EffectivityType** - BY_DATE, BY_SERIAL_NUMBER, BY_WORK_ORDER, BY_LOT_BATCH, IMMEDIATE
85. **CRBDecision** - APPROVED, REJECTED, DEFERRED, REQUEST_MORE_INFO
86. **DocUpdateStatus** - PENDING, IN_PROGRESS, AWAITING_APPROVAL, APPROVED, COMPLETED
87. **ECOTaskType** - DOCUMENT_UPDATE, ROUTING_UPDATE, BOM_UPDATE, PART_MASTER_UPDATE, TOOLING_CREATION, EQUIPMENT_SETUP, TRAINING, VERIFICATION, FIRST_ARTICLE, PROCESS_VALIDATION

#### Comments & Collaboration (8 enums)
88. **CommentContextType** - DOCUMENT, STEP, PARAMETER, CHARACTERISTIC, IMAGE, VIDEO, TEXT_SECTION
89. **CommentStatus** - OPEN, RESOLVED, ARCHIVED
90. **CommentPriority** - LOW, MEDIUM, HIGH
91. **ReactionType** - LIKE, AGREE, DISAGREE, HELPFUL, QUESTION
92. **AnnotationType** - ARROW, CALLOUT, HIGHLIGHT, TEXT_LABEL, FREEHAND, RECTANGLE, CIRCLE, LINE, BLUR, STICKY_NOTE, STRIKETHROUGH, UNDERLINE, STAMP
93. **ReviewType** - TECHNICAL, EDITORIAL, QUALITY, SAFETY, COMPLIANCE, GENERAL
94. **ReviewStatus** - NOT_STARTED, IN_PROGRESS, FEEDBACK_PROVIDED, COMPLETED, OVERDUE
95. **ReviewRecommendation** - APPROVE, REQUEST_CHANGES, REJECT, NO_RECOMMENDATION

#### Activity & Notifications (2 enums)
96. **ActivityType** - CREATED, EDITED, COMMENTED, ANNOTATED, REVIEW_ASSIGNED, REVIEW_COMPLETED, APPROVED, REJECTED, VERSION_CREATED, LINKED, ECO_LINKED, SHARED, EXPORTED, VIEWED
97. **NotificationType** - MENTION, COMMENT_REPLY, REVIEW_ASSIGNED, DOCUMENT_UPDATED, APPROVAL_GRANTED, APPROVAL_REJECTED, COMMENT_RESOLVED, DEADLINE_APPROACHING, REVIEW_COMPLETED

#### File Management & Storage (7 enums)
98. **StorageClass** - HOT, WARM, COLD, ARCHIVE
99. **CacheStatus** - CACHED, NOT_CACHED, INVALIDATED, EXPIRED
100. **UploadMethod** - DIRECT, MULTIPART, PRESIGNED, RESUMABLE
101. **ProcessingStatus** - PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
102. **FileAttachmentType** - PRIMARY, ATTACHMENT, THUMBNAIL, PREVIEW, EXPORT, BACKUP, TEMP
103. **VersionChangeType** - CREATE, UPDATE, RENAME, METADATA, RESTORE, MIGRATE
104. **BackupFrequency** - REAL_TIME, HOURLY, DAILY, WEEKLY, MONTHLY, CUSTOM

#### Backup & Security (3 enums)
105. **BackupType** - FULL, INCREMENTAL, DIFFERENTIAL, SNAPSHOT
106. **BackupStatus** - SCHEDULED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED, PARTIAL
107. **AccessType** - READ, WRITE, DELETE, METADATA, LIST, PREVIEW

#### Time Tracking (7 enums)
108. **TimeTrackingGranularity** - NONE, WORK_ORDER, OPERATION
109. **CostingModel** - LABOR_HOURS, MACHINE_HOURS, BOTH
110. **MultiTaskingMode** - CONCURRENT, SPLIT_ALLOCATION
111. **ApprovalFrequency** - DAILY, WEEKLY, BIWEEKLY, NONE
112. **TimeType** - DIRECT_LABOR, INDIRECT, MACHINE
113. **TimeEntrySource** - MANUAL, KIOSK, MOBILE, MACHINE_AUTO, API, HISTORIAN
114. **TimeEntryStatus** - ACTIVE, COMPLETED, PENDING_APPROVAL, APPROVED, REJECTED, EXPORTED

#### Time Validation (2 enums)
115. **IndirectCategory** - BREAK, LUNCH, TRAINING, MEETING, MAINTENANCE, SETUP, CLEANUP, WAITING, ADMINISTRATIVE, OTHER
116. **TimeValidationRuleType** - MAX_DURATION, MIN_DURATION, MISSING_CLOCK_OUT, CONCURRENT_ENTRIES, OVERTIME_THRESHOLD, INVALID_TIME_RANGE

#### Security & Compliance (8 enums)
117. **SecurityEventType** - AUTH_FAILURE, PRIVILEGE_ESCALATION, EMERGENCY_ACCESS, UNUSUAL_PATTERN, MULTIPLE_SESSIONS, PERMISSION_DENIED, SUSPICIOUS_IP, SESSION_HIJACK, BRUTE_FORCE, ACCOUNT_LOCKOUT, DATA_EXPORT, ADMIN_ACTION, SYSTEM_ACCESS
118. **SecuritySeverity** - LOW, MEDIUM, HIGH, CRITICAL
119. **ReportType** - USER_ACCESS, PERMISSION_CHANGES, SECURITY_EVENTS, SESSION_ANALYTICS, COMPLIANCE_SOX, COMPLIANCE_GDPR, COMPLIANCE_ISO27001, USAGE_ANALYTICS, TREND_ANALYSIS
120. **ReportStatus** - GENERATING, COMPLETED, FAILED, EXPIRED
121. **PermissionChangeType** - ROLE_ASSIGNED, ROLE_REMOVED, PERMISSION_GRANTED, PERMISSION_REVOKED, ROLE_MODIFIED, SITE_ACCESS_GRANTED, SITE_ACCESS_REVOKED, EMERGENCY_OVERRIDE, BULK_CHANGE
122. **SsoProviderType** - SAML, OIDC, AZURE_AD, LDAP, INTERNAL
123. **AuthenticationEventType** - LOGIN, LOGOUT, REFRESH, FAILURE, PROVIDER_ERROR, SESSION_TIMEOUT, FORCED_LOGOUT
124. **RoleTemplateCategory** - PRODUCTION, QUALITY, MAINTENANCE, MANAGEMENT, ADMINISTRATION, ENGINEERING, SAFETY, COMPLIANCE, CUSTOM

#### Role Templates (1 enum)
125. **RoleTemplateAction** - TEMPLATE_CREATED, TEMPLATE_UPDATED, TEMPLATE_DELETED, TEMPLATE_ACTIVATED, TEMPLATE_DEACTIVATED, ROLE_INSTANTIATED, ROLE_CUSTOMIZED, PERMISSIONS_MODIFIED, USER_ASSIGNED, USER_REMOVED

#### ICD System (7 enums) - Issue #224
126. **ICDStatus** - DRAFT, UNDER_REVIEW, PENDING_APPROVAL, APPROVED, RELEASED, SUPERSEDED, OBSOLETE, WITHDRAWN
127. **InterfaceType** - MECHANICAL, ELECTRICAL, FLUID, PNEUMATIC, THERMAL, DATA, OPTICAL, STRUCTURAL, ENVIRONMENTAL, SOFTWARE
128. **InterfaceDirection** - BIDIRECTIONAL, INPUT_ONLY, OUTPUT_ONLY, CONFIGURABLE
129. **InterfaceCriticality** - CRITICAL, MAJOR, MINOR, INFORMATIONAL
130. **VerificationMethod** - ANALYSIS, INSPECTION, TEST, DEMONSTRATION, SIMILARITY
131. **ComplianceStatus** - COMPLIANT, NON_COMPLIANT, CONDITIONALLY_COMPLIANT, UNDER_EVALUATION, NOT_APPLICABLE
132. **InterfaceEffectivityType** - IMMEDIATE, SERIAL_NUMBER, DATE, LOT_NUMBER, WORK_ORDER, CONFIGURATION

#### Additional Enums (27 remaining)
133. **GenealogyRelationType** - CONSUMED_BY, PRODUCED_FROM, REWORKED_TO, BLENDED_WITH, SPLIT_FROM, MERGED_INTO, TRANSFERRED_TO
134. **StateTransitionType** - MANUAL, AUTOMATIC, SYSTEM, SCHEDULED, INTEGRATION
135. **SchedulePriority** - URGENT, HIGH, NORMAL, LOW
136. **ConstraintType** - CAPACITY, MATERIAL, PERSONNEL, EQUIPMENT, DATE, CUSTOM
137. **WorkPerformanceType** - LABOR, MATERIAL, EQUIPMENT, QUALITY, SETUP, DOWNTIME
138. **VarianceType** - QUANTITY, TIME, COST, EFFICIENCY, YIELD, MATERIAL
139. **PersonnelActionType** - CREATE, UPDATE, DEACTIVATE, SKILL_UPDATE, SCHEDULE_UPDATE
140. **CommandType** - START, STOP, PAUSE, RESUME, RESET, CONFIGURE, LOAD_PROGRAM, UNLOAD_PROGRAM, DIAGNOSTIC, CALIBRATE, EMERGENCY_STOP
141. **SOPType** - SAFETY, QUALITY, MAINTENANCE, TRAINING, EMERGENCY, ENVIRONMENTAL, SECURITY, GENERAL
142. **ToolType** - CUTTING_TOOL, GAGE, FIXTURE, JIG, DIE, MOLD, HAND_TOOL, MEASURING_INSTRUMENT, WORK_HOLDING, OTHER
143. **MaintenanceType** - PREVENTIVE, CORRECTIVE, PREDICTIVE, BREAKDOWN
144. **LayoutMode** - SPLIT_VERTICAL, SPLIT_HORIZONTAL, TABBED, OVERLAY, PICTURE_IN_PICTURE
145. **PanelPosition** - LEFT, RIGHT, TOP, BOTTOM, CENTER
146. **ECORelationType** - DEPENDS_ON, BLOCKS, RELATED_TO, SUPERSEDES, DUPLICATE_OF, CHILD_OF
147. **VotingRule** - UNANIMOUS, MAJORITY, SUPERMAJORITY, CONSENSUS
148. **TaskStatus** - PENDING, IN_PROGRESS, COMPLETED, ESCALATED, DELEGATED
149. **ECOTaskStatus** - PENDING, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED
150. **AttachmentType** - SUPPORTING_DOC, DRAWING_CURRENT, DRAWING_PROPOSED, CALCULATION, TEST_RESULT, SUPPLIER_DOC, CUSTOMER_CORRESPONDENCE, ANALYSIS_REPORT, PHOTO, OTHER
151. **ECOEventType** - ECO_CREATED, STATUS_CHANGED, CRB_REVIEW_SCHEDULED, CRB_REVIEW_COMPLETED, TASK_CREATED, TASK_COMPLETED, DOCUMENT_UPDATED, EFFECTIVITY_SET, ECO_COMPLETED, ECO_CANCELLED, COMMENT_ADDED, ATTACHMENT_ADDED
152. **UploadStatus** - PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED, EXPIRED
153. **ResolutionType** - ACCEPT_YOURS, ACCEPT_THEIRS, MANUAL_MERGE, AUTO_MERGED
154. **MaterialTransactionType** - RECEIPT, ISSUE, RETURN, ADJUSTMENT, SCRAP
155. **ElectronicSignatureType** - BASIC, ADVANCED, QUALIFIED
156. **ElectronicSignatureLevel** - OPERATOR, SUPERVISOR, QUALITY, ENGINEER, MANAGER
157. **BiometricType** - FINGERPRINT, FACIAL, IRIS, VOICE, NONE
158. **ScheduleType** - MASTER, DETAILED, DISPATCH
159. **PerformancePeriodType** - HOUR, SHIFT, DAY, WEEK, MONTH, QUARTER, YEAR

---

## 4. FIELD NAMING PATTERNS & CATEGORIES

### Pattern-Based Field Categories

#### "Number" Suffix Fields (40+ fields)
Manufacturing-specific numbering patterns for traceability:

```
acceptanceNumber, accountNumber, actionNumber, alertNumber, auditNumber,
balloonNumber, batchNumber, buildRecordNumber, caNumber, capaNumber,
catalogNumber, certificateNumber, certificationNumber, changeNumber,
characteristicNumber, containerNumber, contractNumber, courseNumber,
currentStageNumber, currentStepNumber, documentNumber, drawingNumber,
ecoNumber, employeeNumber, entryNumber, equipmentNumber,
externalWorkOrderNumber, faiNumber, findingNumber, findNumber,
... (40+ total)
```

**Example Naming Pattern**: `WO-2024-000123` (WorkOrder), `LOT240301001` (Material)

#### "Status" Suffix Fields (100+ fields)
State tracking across all business domains:

```
AlertStatus, AndonAlertStatus, ApiKeyStatus, approvalStatus, ApprovalStatus,
BackupStatus, BuildRecordStatus, cacheStatus, CacheStatus, calibrationStatus,
CapaActionStatus, CapaStatus, CertificationStatus, commandStatus, CommandStatus,
CommentStatus, CommunicationStatus, complianceStatus, ComplianceStatus,
ContainerStatus, conversionStatus, daqStatus, dataCollectionStatus,
DeviationStatus, DocUpdateStatus, ECOStatus, ECOTaskStatus, EightDStatus,
... (100+ total - nearly 13% of all fields)
```

#### "Code" Suffix Fields (30+ fields)
Business domain codes for categorization:

```
areaCode, assetCode, assignmentOperationCode, autoApproveCostCode,
budgetCode, causeCode, CauseCode, classCode, colorCode,
configurationCode, currencyCode, departmentCode, enterpriseCode,
errorCode, failureCode, httpStatusCode, indirectCode,
indirectCostCode, IndirectCostCode, locationCode, numericCode,
operationCode, optionCode, permissionCode, problemCode,
qualificationCode, reasonCode, remedyCode, responseCode,
roleCode, shiftCode, siteCode, skillCode, statusCode,
templateCode, torqueSpecCode, typeCode, workUnitCode, zoneCode
```

#### "Date/Time" Suffix Fields (100+ fields)
Temporal tracking for manufacturing processes:

```
acceptedDate, accessedAt, acknowledgedAt, actionTakenAt, activatedAt,
actualCompletionDate, actualCycleTime, actualDate, actualDeliveryDate,
actualEffectiveDate, actualEndDate, actualEndTime, actualReceiveDate,
actualReturnDate, actualSetupTime, actualShipDate, actualStartDate,
actualStartTime, addedAt, affectedDate, analysisDate, announcedAt,
approvalDate, approvedAt, approvedDate, assemblyDate, assessedAt,
assignedAt, auditDate, authorizationDate, authorizedAt, autoDeleteAt,
averageLeadTime, avgExecutionTime, buildBookGeneratedAt, buildEndDate,
buildStartDate, calculatedAt, calibrationDate, calibrationDueDate,
cancelledAt, capturedAt, certificationDate, certifiedAt, certifiedDate,
changedAt, checkDate, clockInTime, clockOutTime, closedAt,
... (100+ total fields ending in Date/Time/At)
```

### Field Categories by Type

#### Identity/Reference Fields
- ID fields: `id`, `uuid`, `persistentUuid`
- Foreign Keys: `*Id` suffix (e.g., `partId`, `siteId`, `userId`)
- Code fields: `*Code` suffix (e.g., `operationCode`, `siteCode`)

#### Measurement Fields
- Quantity fields: `quantity*` (e.g., `quantityCompleted`, `quantityScrapped`)
- Time fields: `*Time`, `*Duration`, `*Hours`
- Numeric fields: `*Number`, `*Count`, `*Percent`, `*Rate`, `*Price`

#### Status/State Fields
- Status: `*Status`, `*State`
- Approval: `*Approval`, `*ApprovalStatus`
- Workflow: `*Workflow*`, `*Stage*`

#### Audit/Compliance Fields
- Timestamps: `createdAt`, `updatedAt`, `deletedAt`
- User tracking: `createdById`, `updatedById`
- Change tracking: `*History`, `*Log`, `*Audit*`

#### Relationship Fields
- One-to-Many: Relations (`dispatchLogs`, `operations`, `materials`)
- Many-to-One: Foreign keys (`partId`, `siteId`, `routingId`)
- Many-to-Many: Junction tables

---

## 5. MANUFACTURING-SPECIFIC NAMING CONVENTIONS

### Work Order Domain
- Format: `WO-YYYY-NNNNNN` (e.g., `WO-2024-000123`, `WO-2024-R00456`)
- Components: workOrderNumber, workOrderStatus, workOrderPriority
- Operations: workOrderOperation, workOrderPartSubstitution
- Tracking: WorkOrderStatusHistory, WorkOrderWorkflowConfiguration

### Material Domain
- Lot Identification: `LOT` + date + sequence or supplier format
- Examples: `LOT240301001`, `SUP-ABC-2024-0123`, `STEEL-2024Q1-456`
- States: MaterialLotStatus, MaterialLotState, MaterialSublot
- Genealogy: MaterialLotGenealogy (traceability tracking)

### Quality Domain
- Inspection Plans: InspectionPlan, InspectionCharacteristic
- Records: QualityInspection, QualityMeasurement, QIFMeasurementResult
- NCRs: NCR, NCRStatus, NCRApprovalRequest, NCRDispositionRule
- CAPA: CAPA, CapaAction, CapaVerification

### Equipment/Asset Domain
- Equipment tracking: Equipment, EquipmentCommand, EquipmentLog
- State management: EquipmentState, EquipmentStateHistory
- Performance: EquipmentPerformanceLog, EquipmentDataCollection

### Document Management
- Instructions: WorkInstruction, WorkInstructionStep, WorkInstructionMedia
- SOPs: StandardOperatingProcedure, SOPAcknowledgment
- Technical: ControlledDocument, DocumentAnnotation, DocumentComment

---

## 6. FIELD COUNT BY TABLE - TOP TABLES

### Tables with Most Fields
1. **User** - 201 fields missing examples
2. **Part** - 101 fields missing examples
3. **Equipment** - 67 fields missing examples
4. **ToolDrawing** - 60 fields missing examples
5. **Site** - 57 fields missing examples
6. **WorkOrder** - 54 fields missing examples
7. **Operation** - 55 fields missing examples
8. **BuildRecord** - 51 fields missing examples
9. **EngineeringChangeOrder** - 55 fields missing examples
10. **StandardOperatingProcedure** - 46 fields missing examples

### Tables Needing Examples Most Urgently
- **User**: 201 missing examples (authentication, roles, preferences)
- **Part**: 101 missing examples (manufacturing specs, configurations)
- **Equipment**: 67 missing examples (assets, capabilities, maintenance)
- **Operation**: 55 missing examples (process steps, parameters)
- **BuildRecord**: 51 missing examples (production history, deviations)

---

## 7. EXAMPLE STRUCTURE REQUIREMENTS

### Current Field-Descriptions Metadata Attributes (17 total)
Each field can have these documented attributes:

1. **description** - Functional description
2. **businessRule** - Rules and constraints
3. **dataSource** - Origin of data
4. **format** - Expected format/pattern
5. **examples** - MISSING for 7,852 fields
6. **validation** - Validation rules
7. **calculations** - Formula/calculation info
8. **privacy** - Data classification
9. **retention** - Retention policy
10. **auditTrail** - Audit requirements
11. **integrationMapping** - ERP/external system mappings
12. **businessImpact** - Impact if incorrect
13. **validValues** - Enumerated values
14. **complianceNotes** - Regulatory requirements
15. **businessPurpose** - Why the field exists
16. **businessJustification** - Justification for existence
17. **consequences** - Consequences of bad data

### Example Format (from existing WorkOrder.workOrderNumber)
```json
{
  "workOrderNumber": {
    "description": "Human-readable unique identifier for manufacturing work orders",
    "format": "WO-YYYY-NNNNNN where YYYY=4-digit year, NNNNNN=6-digit sequential number",
    "examples": [
      "WO-2024-000123",
      "WO-2024-R00456",
      "WO-2025-000001"
    ],
    "validation": "Regex: ^WO-\\d{4}-[R]?\\d{6}$ AND must be unique across all WorkOrder records"
  }
}
```

---

## 8. RECOMMENDED EXAMPLE POPULATION STRATEGY

### Priority Tiers for Example Generation

#### Tier 1: Critical Fields (High Impact)
- All Status fields (100+ fields)
- Work Order related fields
- Material Lot identification
- Quality inspection results
- Equipment state tracking
- Financial/Cost fields

#### Tier 2: Common Fields (Medium Impact)
- Date/Time fields (100+ fields)
- Quantity fields
- Code fields (30+ fields)
- Standard operation parameters
- Personnel information

#### Tier 3: Remaining Fields
- Less frequently used fields
- Reference/relationship fields
- System/audit fields

### Data Type Patterns for Example Generation

#### String/Text Fields
- Pattern: Use business-specific formats
- Examples: `"WO-2024-000123"`, `"SENSOR_A1_TEMP"`, `"Premium_Grade_Steel"`

#### Numeric Fields
- Pattern: Realistic manufacturing values
- Examples: 
  - Quantities: 100, 500, 1000
  - Prices: 25.50, 150.00, 1000.00
  - Percentages: 95.5, 99.9, 0.5
  - Tolerances: 0.01, 0.05, 0.001

#### Date/Time Fields
- Pattern: ISO 8601 with timezone
- Examples: `"2024-10-30T08:15:30.000Z"`, `"2024-11-01T14:22:15.123Z"`

#### Enum Fields
- Pattern: From enum definition
- Examples: Use actual enum values (already documented in 159 enums)

#### Boolean Fields
- Pattern: True/False with manufacturing context
- Examples: `true` (certified), `false` (not approved)

#### JSON Fields
- Pattern: Realistic nested structures
- Examples: Parameter objects, configuration objects

---

## 9. EXISTING DOCUMENTATION ASSETS

### Documentation Infrastructure Located At:
- `/home/tony/GitHub/MachShop2/docs/schema-documentation/`
  - `field-descriptions.json` (3.2MB, 7,869 fields documented with 16 attributes each)
  - `table-descriptions.json` (table-level documentation)
  - `business-rules.json` (business rule definitions)

### Generated Documentation:
- `/home/tony/GitHub/MachShop2/docs/generated/schema-metadata.json`

### Prisma Schema Files:
- Main: `/home/tony/GitHub/MachShop2/prisma/schema.prisma` (16,734 lines)
- Modular: `/home/tony/GitHub/MachShop2/prisma/modular/` (398 models organized by functional area)
- Documented variants: `/home/tony/GitHub/MachShop2/prisma/modular/modules/documented/`

---

## 10. KEY STATISTICS FOR PROGRAMMATIC POPULATION

### Numbers Summary
- **Total Tables**: 398 models
- **Total Fields**: 7,859
- **Total Enums**: 159
- **Enum Values**: 1,300+
- **Fields with Examples**: 17 (0.22%)
- **Fields Missing Examples**: 7,852 (99.78%)

### High-Volume Field Patterns
- Status fields: 100+ instances
- Date/Time fields: 100+ instances
- Number/Code fields: 70+ instances
- Quantity fields: 30+ instances
- Foreign Key fields: 500+ instances

### Enum Distribution
- Most enums: 5-10 values
- Largest enums: 13+ values (CommandType, SecurityEventType, WorkflowEventType)
- Total enumeration values: ~1,300

---

## 11. DATA VALIDATION PATTERNS

### Common Validation Rules Observed
1. **Uniqueness**: Most `Number` and `Code` fields require global uniqueness
2. **Format Patterns**: 
   - `WO-YYYY-NNNNNN` for work orders
   - `LOT` + date patterns for materials
   - Standard ISO formats for dates
3. **Enum Constraints**: 159 enums enforce valid values
4. **Foreign Key Constraints**: 500+ relationship fields
5. **Date Constraints**: Start <= End dates, no future dates

### Business Rule Categories
- **Sequential**: auto-generated numbers per site/year
- **Immutable**: Once created, many key fields cannot change
- **State-based**: Workflow transitions restricted by current state
- **Audit-required**: All modifications must be tracked
- **Traceability**: Material and work order history must be preserved

---

## Summary & Next Steps

### What You Have
- Complete Prisma schema with 398 models and 7,859 fields
- Full enumeration definitions (159 enums with 1,300+ values)
- Comprehensive field metadata (17 attributes per field)
- Manufacturing-domain naming conventions
- Established example formats for 17 fields

### What You Need
- Examples for 7,852 fields (structured by field type)
- Programmatic generation rules for each field category
- Manufacturing-specific example templates
- Validation regex patterns for text fields

### Ready for Development
The schema structure is fully documented and ready for:
1. Automated example generation using field naming patterns
2. Type-specific example creation (Date/Time, Numeric, Status, etc.)
3. Manufacturing domain-specific value suggestions
4. Batch population of field-descriptions.json

