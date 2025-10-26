```mermaid
erDiagram

        QualificationType {
            CERTIFICATION CERTIFICATION
LICENSE LICENSE
TRAINING TRAINING
SKILL SKILL
        }
    


        CertificationStatus {
            ACTIVE ACTIVE
EXPIRED EXPIRED
SUSPENDED SUSPENDED
REVOKED REVOKED
PENDING PENDING
        }
    


        SkillCategory {
            MACHINING MACHINING
WELDING WELDING
INSPECTION INSPECTION
ASSEMBLY ASSEMBLY
PROGRAMMING PROGRAMMING
MAINTENANCE MAINTENANCE
QUALITY QUALITY
SAFETY SAFETY
MANAGEMENT MANAGEMENT
OTHER OTHER
        }
    


        CompetencyLevel {
            NOVICE NOVICE
ADVANCED_BEGINNER ADVANCED_BEGINNER
COMPETENT COMPETENT
PROFICIENT PROFICIENT
EXPERT EXPERT
        }
    


        AvailabilityType {
            AVAILABLE AVAILABLE
VACATION VACATION
SICK_LEAVE SICK_LEAVE
TRAINING TRAINING
MEETING MEETING
UNAVAILABLE UNAVAILABLE
        }
    


        MaterialType {
            RAW_MATERIAL RAW_MATERIAL
COMPONENT COMPONENT
SUBASSEMBLY SUBASSEMBLY
ASSEMBLY ASSEMBLY
FINISHED_GOODS FINISHED_GOODS
WIP WIP
CONSUMABLE CONSUMABLE
PACKAGING PACKAGING
TOOLING TOOLING
MAINTENANCE MAINTENANCE
        }
    


        MaterialPropertyType {
            PHYSICAL PHYSICAL
CHEMICAL CHEMICAL
MECHANICAL MECHANICAL
THERMAL THERMAL
ELECTRICAL ELECTRICAL
OPTICAL OPTICAL
REGULATORY REGULATORY
OTHER OTHER
        }
    


        MaterialLotStatus {
            AVAILABLE AVAILABLE
RESERVED RESERVED
IN_USE IN_USE
DEPLETED DEPLETED
QUARANTINED QUARANTINED
EXPIRED EXPIRED
REJECTED REJECTED
RETURNED RETURNED
SCRAPPED SCRAPPED
        }
    


        MaterialLotState {
            RECEIVED RECEIVED
INSPECTED INSPECTED
APPROVED APPROVED
ISSUED ISSUED
IN_PROCESS IN_PROCESS
CONSUMED CONSUMED
RETURNED RETURNED
DISPOSED DISPOSED
        }
    


        QualityLotStatus {
            PENDING PENDING
IN_INSPECTION IN_INSPECTION
APPROVED APPROVED
REJECTED REJECTED
CONDITIONAL CONDITIONAL
        }
    


        SublotOperationType {
            SPLIT SPLIT
MERGE MERGE
TRANSFER TRANSFER
REWORK REWORK
        }
    


        GenealogyRelationType {
            CONSUMED_BY CONSUMED_BY
PRODUCED_FROM PRODUCED_FROM
REWORKED_TO REWORKED_TO
BLENDED_WITH BLENDED_WITH
SPLIT_FROM SPLIT_FROM
MERGED_INTO MERGED_INTO
TRANSFERRED_TO TRANSFERRED_TO
        }
    


        StateTransitionType {
            MANUAL MANUAL
AUTOMATIC AUTOMATIC
SYSTEM SYSTEM
SCHEDULED SCHEDULED
INTEGRATION INTEGRATION
        }
    


        OperationType {
            PRODUCTION PRODUCTION
QUALITY QUALITY
MATERIAL_HANDLING MATERIAL_HANDLING
MAINTENANCE MAINTENANCE
SETUP SETUP
CLEANING CLEANING
PACKAGING PACKAGING
TESTING TESTING
REWORK REWORK
OTHER OTHER
        }
    


        OperationClassification {
            MAKE MAKE
ASSEMBLY ASSEMBLY
INSPECTION INSPECTION
TEST TEST
REWORK REWORK
SETUP SETUP
SUBCONTRACT SUBCONTRACT
PACKING PACKING
        }
    


        ParameterType {
            INPUT INPUT
OUTPUT OUTPUT
SET_POINT SET_POINT
MEASURED MEASURED
CALCULATED CALCULATED
        }
    


        ParameterDataType {
            NUMBER NUMBER
STRING STRING
BOOLEAN BOOLEAN
ENUM ENUM
DATE DATE
JSON JSON
        }
    


        ParameterGroupType {
            PROCESS PROCESS
QUALITY QUALITY
MATERIAL MATERIAL
EQUIPMENT EQUIPMENT
ENVIRONMENTAL ENVIRONMENTAL
CUSTOM CUSTOM
        }
    


        FormulaLanguage {
            JAVASCRIPT JAVASCRIPT
PYTHON PYTHON
SQL SQL
        }
    


        EvaluationTrigger {
            ON_CHANGE ON_CHANGE
SCHEDULED SCHEDULED
MANUAL MANUAL
        }
    


        DependencyType {
            MUST_COMPLETE MUST_COMPLETE
MUST_START MUST_START
OVERLAP_ALLOWED OVERLAP_ALLOWED
PARALLEL PARALLEL
        }
    


        DependencyTimingType {
            FINISH_TO_START FINISH_TO_START
START_TO_START START_TO_START
FINISH_TO_FINISH FINISH_TO_FINISH
START_TO_FINISH START_TO_FINISH
        }
    


        ConsumptionType {
            PER_UNIT PER_UNIT
PER_BATCH PER_BATCH
FIXED FIXED
SETUP SETUP
        }
    


        PhysicalAssetType {
            TOOLING TOOLING
FIXTURE FIXTURE
GAUGE GAUGE
CONSUMABLE CONSUMABLE
PPE PPE
MOLD MOLD
PATTERN PATTERN
SOFTWARE SOFTWARE
OTHER OTHER
        }
    


        ProductType {
            MADE_TO_STOCK MADE_TO_STOCK
MADE_TO_ORDER MADE_TO_ORDER
ENGINEER_TO_ORDER ENGINEER_TO_ORDER
CONFIGURE_TO_ORDER CONFIGURE_TO_ORDER
ASSEMBLE_TO_ORDER ASSEMBLE_TO_ORDER
        }
    


        ProductLifecycleState {
            DESIGN DESIGN
PROTOTYPE PROTOTYPE
PILOT_PRODUCTION PILOT_PRODUCTION
PRODUCTION PRODUCTION
MATURE MATURE
PHASE_OUT PHASE_OUT
OBSOLETE OBSOLETE
ARCHIVED ARCHIVED
        }
    


        ConfigurationType {
            STANDARD STANDARD
VARIANT VARIANT
CUSTOM CUSTOM
CONFIGURABLE CONFIGURABLE
        }
    


        SpecificationType {
            PHYSICAL PHYSICAL
CHEMICAL CHEMICAL
MECHANICAL MECHANICAL
ELECTRICAL ELECTRICAL
PERFORMANCE PERFORMANCE
REGULATORY REGULATORY
ENVIRONMENTAL ENVIRONMENTAL
SAFETY SAFETY
QUALITY QUALITY
OTHER OTHER
        }
    


        WorkOrderPriority {
            LOW LOW
NORMAL NORMAL
HIGH HIGH
URGENT URGENT
        }
    


        WorkOrderStatus {
            CREATED CREATED
RELEASED RELEASED
IN_PROGRESS IN_PROGRESS
COMPLETED COMPLETED
CANCELLED CANCELLED
ON_HOLD ON_HOLD
        }
    


        RoutingLifecycleState {
            DRAFT DRAFT
REVIEW REVIEW
RELEASED RELEASED
PRODUCTION PRODUCTION
OBSOLETE OBSOLETE
        }
    


        RoutingType {
            PRIMARY PRIMARY
ALTERNATE ALTERNATE
REWORK REWORK
PROTOTYPE PROTOTYPE
ENGINEERING ENGINEERING
        }
    


        StepType {
            PROCESS PROCESS
INSPECTION INSPECTION
DECISION DECISION
PARALLEL_SPLIT PARALLEL_SPLIT
PARALLEL_JOIN PARALLEL_JOIN
OSP OSP
LOT_SPLIT LOT_SPLIT
LOT_MERGE LOT_MERGE
TELESCOPING TELESCOPING
START START
END END
        }
    


        ControlType {
            LOT_CONTROLLED LOT_CONTROLLED
SERIAL_CONTROLLED SERIAL_CONTROLLED
MIXED MIXED
        }
    


        WorkOrderOperationStatus {
            PENDING PENDING
IN_PROGRESS IN_PROGRESS
COMPLETED COMPLETED
SKIPPED SKIPPED
        }
    


        ScheduleState {
            FORECAST FORECAST
RELEASED RELEASED
DISPATCHED DISPATCHED
RUNNING RUNNING
COMPLETED COMPLETED
CLOSED CLOSED
        }
    


        SchedulePriority {
            URGENT URGENT
HIGH HIGH
NORMAL NORMAL
LOW LOW
        }
    


        ConstraintType {
            CAPACITY CAPACITY
MATERIAL MATERIAL
PERSONNEL PERSONNEL
EQUIPMENT EQUIPMENT
DATE DATE
CUSTOM CUSTOM
        }
    


        WorkPerformanceType {
            LABOR LABOR
MATERIAL MATERIAL
EQUIPMENT EQUIPMENT
QUALITY QUALITY
SETUP SETUP
DOWNTIME DOWNTIME
        }
    


        VarianceType {
            QUANTITY QUANTITY
TIME TIME
COST COST
EFFICIENCY EFFICIENCY
YIELD YIELD
MATERIAL MATERIAL
        }
    


        QualityToleranceType {
            BILATERAL BILATERAL
UNILATERAL_PLUS UNILATERAL_PLUS
UNILATERAL_MINUS UNILATERAL_MINUS
NOMINAL NOMINAL
        }
    


        QualityInspectionStatus {
            CREATED CREATED
IN_PROGRESS IN_PROGRESS
COMPLETED COMPLETED
CANCELLED CANCELLED
        }
    


        QualityInspectionResult {
            PASS PASS
FAIL FAIL
CONDITIONAL CONDITIONAL
        }
    


        NCRSeverity {
            MINOR MINOR
MAJOR MAJOR
CRITICAL CRITICAL
        }
    


        NCRStatus {
            OPEN OPEN
IN_REVIEW IN_REVIEW
CORRECTIVE_ACTION CORRECTIVE_ACTION
CLOSED CLOSED
        }
    


        EquipmentClass {
            PRODUCTION PRODUCTION
MAINTENANCE MAINTENANCE
QUALITY QUALITY
MATERIAL_HANDLING MATERIAL_HANDLING
LABORATORY LABORATORY
STORAGE STORAGE
ASSEMBLY ASSEMBLY
        }
    


        EquipmentStatus {
            AVAILABLE AVAILABLE
IN_USE IN_USE
OPERATIONAL OPERATIONAL
MAINTENANCE MAINTENANCE
DOWN DOWN
RETIRED RETIRED
        }
    


        EquipmentState {
            IDLE IDLE
RUNNING RUNNING
BLOCKED BLOCKED
STARVED STARVED
FAULT FAULT
MAINTENANCE MAINTENANCE
SETUP SETUP
EMERGENCY EMERGENCY
        }
    


        EquipmentLogType {
            MAINTENANCE MAINTENANCE
REPAIR REPAIR
CALIBRATION CALIBRATION
STATUS_CHANGE STATUS_CHANGE
USAGE USAGE
        }
    


        PerformancePeriodType {
            HOUR HOUR
SHIFT SHIFT
DAY DAY
WEEK WEEK
MONTH MONTH
QUARTER QUARTER
YEAR YEAR
        }
    


        MaterialTransactionType {
            RECEIPT RECEIPT
ISSUE ISSUE
RETURN RETURN
ADJUSTMENT ADJUSTMENT
SCRAP SCRAP
        }
    


        WorkInstructionStatus {
            DRAFT DRAFT
REVIEW REVIEW
APPROVED APPROVED
REJECTED REJECTED
SUPERSEDED SUPERSEDED
ARCHIVED ARCHIVED
        }
    


        WorkInstructionExecutionStatus {
            IN_PROGRESS IN_PROGRESS
COMPLETED COMPLETED
PAUSED PAUSED
CANCELLED CANCELLED
        }
    


        ElectronicSignatureType {
            BASIC BASIC
ADVANCED ADVANCED
QUALIFIED QUALIFIED
        }
    


        ElectronicSignatureLevel {
            OPERATOR OPERATOR
SUPERVISOR SUPERVISOR
QUALITY QUALITY
ENGINEER ENGINEER
MANAGER MANAGER
        }
    


        BiometricType {
            FINGERPRINT FINGERPRINT
FACIAL FACIAL
IRIS IRIS
VOICE VOICE
NONE NONE
        }
    


        FAIStatus {
            IN_PROGRESS IN_PROGRESS
REVIEW REVIEW
APPROVED APPROVED
REJECTED REJECTED
SUPERSEDED SUPERSEDED
        }
    


        IntegrationType {
            ERP ERP
PLM PLM
CMMS CMMS
WMS WMS
QMS QMS
HISTORIAN HISTORIAN
DNC DNC
SFC SFC
SKILLS SKILLS
CALIBRATION CALIBRATION
PDM PDM
CMM CMM
CUSTOM CUSTOM
        }
    


        IntegrationDirection {
            INBOUND INBOUND
OUTBOUND OUTBOUND
BIDIRECTIONAL BIDIRECTIONAL
        }
    


        IntegrationLogStatus {
            PENDING PENDING
IN_PROGRESS IN_PROGRESS
SUCCESS SUCCESS
FAILED FAILED
PARTIAL PARTIAL
TIMEOUT TIMEOUT
CANCELLED CANCELLED
        }
    


        ScheduleType {
            MASTER MASTER
DETAILED DETAILED
DISPATCH DISPATCH
        }
    


        B2MMessageStatus {
            PENDING PENDING
VALIDATED VALIDATED
PROCESSING PROCESSING
PROCESSED PROCESSED
SENT SENT
CONFIRMED CONFIRMED
ACCEPTED ACCEPTED
FAILED FAILED
REJECTED REJECTED
TIMEOUT TIMEOUT
        }
    


        ERPTransactionType {
            ISSUE ISSUE
RECEIPT RECEIPT
RETURN RETURN
TRANSFER TRANSFER
ADJUSTMENT ADJUSTMENT
SCRAP SCRAP
CONSUMPTION CONSUMPTION
        }
    


        PersonnelActionType {
            CREATE CREATE
UPDATE UPDATE
DEACTIVATE DEACTIVATE
SKILL_UPDATE SKILL_UPDATE
SCHEDULE_UPDATE SCHEDULE_UPDATE
        }
    


        DataCollectionType {
            SENSOR SENSOR
ALARM ALARM
EVENT EVENT
MEASUREMENT MEASUREMENT
STATUS STATUS
PERFORMANCE PERFORMANCE
        }
    


        CommandType {
            START START
STOP STOP
PAUSE PAUSE
RESUME RESUME
RESET RESET
CONFIGURE CONFIGURE
LOAD_PROGRAM LOAD_PROGRAM
UNLOAD_PROGRAM UNLOAD_PROGRAM
DIAGNOSTIC DIAGNOSTIC
CALIBRATE CALIBRATE
EMERGENCY_STOP EMERGENCY_STOP
        }
    


        CommandStatus {
            PENDING PENDING
SENT SENT
ACKNOWLEDGED ACKNOWLEDGED
EXECUTING EXECUTING
COMPLETED COMPLETED
FAILED FAILED
TIMEOUT TIMEOUT
CANCELLED CANCELLED
        }
    


        SPCChartType {
            X_BAR_R X_BAR_R
X_BAR_S X_BAR_S
I_MR I_MR
P_CHART P_CHART
NP_CHART NP_CHART
C_CHART C_CHART
U_CHART U_CHART
EWMA EWMA
CUSUM CUSUM
        }
    


        LimitCalculationMethod {
            HISTORICAL_DATA HISTORICAL_DATA
SPEC_LIMITS SPEC_LIMITS
MANUAL MANUAL
        }
    


        SamplingPlanType {
            SINGLE SINGLE
DOUBLE DOUBLE
MULTIPLE MULTIPLE
SEQUENTIAL SEQUENTIAL
        }
    
  "enterprises" {
    String id "🗝️"
    String enterpriseCode 
    String enterpriseName 
    String description "❓"
    String headquarters "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "sites" {
    String id "🗝️"
    String siteCode 
    String siteName 
    String location "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "areas" {
    String id "🗝️"
    String areaCode 
    String areaName 
    String description "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "users" {
    String id "🗝️"
    String username 
    String email 
    String firstName "❓"
    String lastName "❓"
    String passwordHash 
    Boolean isActive 
    String roles 
    String permissions 
    DateTime lastLoginAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    String employeeNumber "❓"
    DateTime hireDate "❓"
    DateTime terminationDate "❓"
    String phone "❓"
    String emergencyContact "❓"
    String emergencyPhone "❓"
    String department "❓"
    String costCenter "❓"
    Float laborRate "❓"
    }
  

  "personnel_classes" {
    String id "🗝️"
    String classCode 
    String className 
    String description "❓"
    Int level 
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "personnel_qualifications" {
    String id "🗝️"
    String qualificationCode 
    String qualificationName 
    String description "❓"
    QualificationType qualificationType 
    String issuingOrganization "❓"
    Int validityPeriodMonths "❓"
    Boolean requiresRenewal 
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "personnel_certifications" {
    String id "🗝️"
    String certificationNumber "❓"
    DateTime issuedDate 
    DateTime expirationDate "❓"
    CertificationStatus status 
    String attachmentUrls 
    String verifiedBy "❓"
    DateTime verifiedAt "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "personnel_skills" {
    String id "🗝️"
    String skillCode 
    String skillName 
    String description "❓"
    SkillCategory skillCategory 
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "personnel_skill_assignments" {
    String id "🗝️"
    CompetencyLevel competencyLevel 
    String assessedBy "❓"
    DateTime assessedAt "❓"
    DateTime lastUsedDate "❓"
    DateTime certifiedDate "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "personnel_work_center_assignments" {
    String id "🗝️"
    Boolean isPrimary 
    DateTime effectiveDate 
    DateTime endDate "❓"
    DateTime certifiedDate "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "personnel_availability" {
    String id "🗝️"
    AvailabilityType availabilityType 
    DateTime startDateTime 
    DateTime endDateTime 
    String shiftCode "❓"
    Boolean isRecurring 
    String recurrenceRule "❓"
    String reason "❓"
    String approvedBy "❓"
    DateTime approvedAt "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "material_classes" {
    String id "🗝️"
    String classCode 
    String className 
    String description "❓"
    Int level 
    Boolean requiresLotTracking 
    Boolean requiresSerialTracking 
    Boolean requiresExpirationDate 
    Int shelfLifeDays "❓"
    String storageRequirements "❓"
    String handlingInstructions "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "material_definitions" {
    String id "🗝️"
    String materialNumber 
    String materialName 
    String description "❓"
    String baseUnitOfMeasure 
    String alternateUnitOfMeasure "❓"
    Float conversionFactor "❓"
    MaterialType materialType 
    String materialGrade "❓"
    String specification "❓"
    Float minimumStock "❓"
    Float reorderPoint "❓"
    Float reorderQuantity "❓"
    Int leadTimeDays "❓"
    Boolean requiresLotTracking 
    String lotNumberFormat "❓"
    Int defaultShelfLifeDays "❓"
    Float standardCost "❓"
    String currency "❓"
    Boolean requiresInspection 
    String inspectionFrequency "❓"
    String primarySupplierId "❓"
    String supplierPartNumber "❓"
    String drawingNumber "❓"
    String revision "❓"
    String msdsUrl "❓"
    String imageUrl "❓"
    Boolean isActive 
    Boolean isPhantom 
    Boolean isObsolete 
    DateTime obsoleteDate "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "material_properties" {
    String id "🗝️"
    String propertyName 
    MaterialPropertyType propertyType 
    String propertyValue 
    String propertyUnit "❓"
    String testMethod "❓"
    Float nominalValue "❓"
    Float minValue "❓"
    Float maxValue "❓"
    Boolean isRequired 
    Boolean isCritical 
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "material_lots" {
    String id "🗝️"
    String lotNumber 
    String supplierLotNumber "❓"
    String purchaseOrderNumber "❓"
    String heatNumber "❓"
    String serialNumber "❓"
    Float originalQuantity 
    Float currentQuantity 
    String unitOfMeasure 
    String location "❓"
    String warehouseId "❓"
    DateTime manufactureDate "❓"
    DateTime receivedDate 
    DateTime expirationDate "❓"
    Int shelfLifeDays "❓"
    DateTime firstUsedDate "❓"
    DateTime lastUsedDate "❓"
    MaterialLotStatus status 
    MaterialLotState state 
    Boolean isQuarantined 
    String quarantineReason "❓"
    DateTime quarantinedAt "❓"
    QualityLotStatus qualityStatus 
    String inspectionId "❓"
    String certificationUrls 
    String supplierId "❓"
    String supplierName "❓"
    String manufacturerId "❓"
    String manufacturerName "❓"
    String countryOfOrigin "❓"
    Float unitCost "❓"
    Float totalCost "❓"
    String currency "❓"
    Boolean isSplit 
    Boolean isMerged 
    String notes "❓"
    Json customAttributes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "material_sublots" {
    String id "🗝️"
    String sublotNumber 
    SublotOperationType operationType 
    Float quantity 
    String unitOfMeasure 
    String workOrderId "❓"
    String operationId "❓"
    String reservedFor "❓"
    String location "❓"
    MaterialLotStatus status 
    Boolean isActive 
    String splitReason "❓"
    String createdById "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "material_lot_genealogy" {
    String id "🗝️"
    GenealogyRelationType relationshipType 
    Float quantityConsumed 
    Float quantityProduced "❓"
    String unitOfMeasure 
    String workOrderId "❓"
    String operationId "❓"
    DateTime processDate 
    String operatorId "❓"
    String notes "❓"
    DateTime createdAt 
    }
  

  "material_state_history" {
    String id "🗝️"
    MaterialLotState previousState "❓"
    MaterialLotState newState 
    MaterialLotStatus previousStatus "❓"
    MaterialLotStatus newStatus "❓"
    String reason "❓"
    StateTransitionType transitionType 
    Float quantity "❓"
    String unitOfMeasure "❓"
    String workOrderId "❓"
    String operationId "❓"
    String inspectionId "❓"
    String changedById "❓"
    DateTime changedAt 
    String fromLocation "❓"
    String toLocation "❓"
    String qualityNotes "❓"
    String notes "❓"
    Json metadata "❓"
    DateTime createdAt 
    }
  

  "operations" {
    String id "🗝️"
    String description "❓"
    Boolean isStandardOperation 
    String operationCode 
    String operationName 
    OperationClassification operationClassification "❓"
    Int level 
    OperationType operationType 
    String category "❓"
    Int duration "❓"
    Int setupTime "❓"
    Int teardownTime "❓"
    Int minCycleTime "❓"
    Int maxCycleTime "❓"
    String version 
    DateTime effectiveDate "❓"
    DateTime expirationDate "❓"
    Boolean isActive 
    Boolean requiresApproval 
    String approvedBy "❓"
    DateTime approvedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "operation_parameters" {
    String id "🗝️"
    String parameterName 
    ParameterType parameterType 
    ParameterDataType dataType 
    String defaultValue "❓"
    String unitOfMeasure "❓"
    Float minValue "❓"
    Float maxValue "❓"
    String allowedValues 
    Boolean isRequired 
    Boolean isCritical 
    Boolean requiresVerification 
    Int displayOrder "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "parameter_limits" {
    String id "🗝️"
    Float engineeringMin "❓"
    Float engineeringMax "❓"
    Float operatingMin "❓"
    Float operatingMax "❓"
    Float LSL "❓"
    Float USL "❓"
    Float nominalValue "❓"
    Float highHighAlarm "❓"
    Float highAlarm "❓"
    Float lowAlarm "❓"
    Float lowLowAlarm "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "parameter_groups" {
    String id "🗝️"
    String groupName 
    ParameterGroupType groupType 
    String description "❓"
    String tags 
    Int displayOrder "❓"
    String icon "❓"
    String color "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "parameter_formulas" {
    String id "🗝️"
    String formulaName 
    String formulaExpression 
    FormulaLanguage formulaLanguage 
    String inputParameterIds 
    EvaluationTrigger evaluationTrigger 
    String evaluationSchedule "❓"
    Json testCases "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    String createdBy 
    String lastModifiedBy "❓"
    }
  

  "operation_dependencies" {
    String id "🗝️"
    DependencyType dependencyType 
    DependencyTimingType timingType 
    Int lagTime "❓"
    Int leadTime "❓"
    String condition "❓"
    Boolean isOptional 
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "personnel_operation_specifications" {
    String id "🗝️"
    String personnelClassId "❓"
    String skillId "❓"
    CompetencyLevel minimumCompetency "❓"
    String requiredCertifications 
    Int quantity 
    Boolean isOptional 
    String roleName "❓"
    String roleDescription "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "equipment_operation_specifications" {
    String id "🗝️"
    EquipmentClass equipmentClass "❓"
    String equipmentType "❓"
    String specificEquipmentId "❓"
    String requiredCapabilities 
    Float minimumCapacity "❓"
    Int quantity 
    Boolean isOptional 
    Boolean setupRequired 
    Int setupTime "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "material_operation_specifications" {
    String id "🗝️"
    String materialDefinitionId "❓"
    String materialClassId "❓"
    MaterialType materialType "❓"
    Float quantity 
    String unitOfMeasure 
    ConsumptionType consumptionType 
    String requiredProperties 
    String qualityRequirements "❓"
    Boolean isOptional 
    Boolean allowSubstitutes 
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "physical_asset_operation_specifications" {
    String id "🗝️"
    PhysicalAssetType assetType 
    String assetCode "❓"
    String assetName 
    Json specifications "❓"
    Int quantity 
    Boolean isOptional 
    Boolean requiresCalibration 
    Int calibrationInterval "❓"
    Int estimatedLifeCycles "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "parts" {
    String id "🗝️"
    String partNumber 
    String partName 
    String description "❓"
    String partType 
    ProductType productType 
    ProductLifecycleState lifecycleState 
    String unitOfMeasure 
    Float weight "❓"
    String weightUnit "❓"
    String drawingNumber "❓"
    String revision "❓"
    String cadModelUrl "❓"
    DateTime releaseDate "❓"
    DateTime obsoleteDate "❓"
    String makeOrBuy "❓"
    Int leadTimeDays "❓"
    Int lotSizeMin "❓"
    Int lotSizeMultiple "❓"
    Float standardCost "❓"
    Float targetCost "❓"
    String currency "❓"
    Boolean isActive 
    Boolean isConfigurable 
    Boolean requiresFAI 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "part_site_availability" {
    String id "🗝️"
    Boolean isPreferred 
    Boolean isActive 
    Int leadTimeDays "❓"
    Int minimumLotSize "❓"
    Int maximumLotSize "❓"
    Float standardCost "❓"
    Float setupCost "❓"
    DateTime effectiveDate "❓"
    DateTime expirationDate "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "bom_items" {
    String id "🗝️"
    Float quantity 
    String unitOfMeasure 
    Float scrapFactor "❓"
    Int sequence "❓"
    String findNumber "❓"
    String referenceDesignator "❓"
    Int operationNumber "❓"
    DateTime effectiveDate "❓"
    DateTime obsoleteDate "❓"
    String ecoNumber "❓"
    Boolean isOptional 
    Boolean isCritical 
    String notes "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "product_specifications" {
    String id "🗝️"
    String specificationName 
    SpecificationType specificationType 
    String specificationValue "❓"
    Float nominalValue "❓"
    Float minValue "❓"
    Float maxValue "❓"
    String unitOfMeasure "❓"
    String testMethod "❓"
    String inspectionFrequency "❓"
    Boolean isCritical 
    Boolean isRegulatory 
    String documentReferences 
    String notes "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "product_configurations" {
    String id "🗝️"
    String configurationName 
    ConfigurationType configurationType 
    String description "❓"
    String configurationCode "❓"
    Json attributes "❓"
    Float priceModifier "❓"
    Float costModifier "❓"
    Int leadTimeDelta "❓"
    Boolean isAvailable 
    DateTime effectiveDate "❓"
    DateTime obsoleteDate "❓"
    Boolean isDefault 
    String marketingName "❓"
    String imageUrl "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "configuration_options" {
    String id "🗝️"
    String optionName 
    String optionCode "❓"
    String description "❓"
    String optionCategory "❓"
    String optionValue "❓"
    Boolean isRequired 
    Boolean isDefault 
    String addedPartIds 
    String removedPartIds 
    Float priceModifier "❓"
    Float costModifier "❓"
    Int displayOrder "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "product_lifecycle" {
    String id "🗝️"
    ProductLifecycleState previousState "❓"
    ProductLifecycleState newState 
    DateTime transitionDate 
    String reason "❓"
    String ecoNumber "❓"
    String approvedBy "❓"
    DateTime approvedAt "❓"
    Boolean notificationsSent 
    String impactAssessment "❓"
    String notes "❓"
    Json metadata "❓"
    DateTime createdAt 
    }
  

  "work_orders" {
    String id "🗝️"
    String workOrderNumber 
    String partNumber "❓"
    Int quantity 
    Int quantityCompleted 
    Int quantityScrapped 
    WorkOrderPriority priority 
    WorkOrderStatus status 
    DateTime dueDate "❓"
    String customerOrder "❓"
    DateTime startedAt "❓"
    DateTime actualStartDate "❓"
    DateTime completedAt "❓"
    DateTime actualEndDate "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "routings" {
    String id "🗝️"
    String routingNumber 
    String version 
    RoutingLifecycleState lifecycleState 
    String description "❓"
    Boolean isPrimaryRoute 
    Boolean isActive 
    DateTime effectiveDate "❓"
    DateTime expirationDate "❓"
    RoutingType routingType 
    Int priority 
    String approvedBy "❓"
    DateTime approvedAt "❓"
    Json visualData "❓"
    DateTime createdAt 
    DateTime updatedAt 
    String createdBy "❓"
    String notes "❓"
    }
  

  "routing_operations" {
    String id "🗝️"
    Int operationNumber 
    String operationName 
    String description "❓"
    Float setupTime "❓"
    Float cycleTime "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "routing_steps" {
    String id "🗝️"
    Int stepNumber 
    StepType stepType 
    ControlType controlType "❓"
    Int setupTimeOverride "❓"
    Int cycleTimeOverride "❓"
    Int teardownTimeOverride "❓"
    Boolean isOptional 
    Boolean isQualityInspection 
    Boolean isCriticalPath 
    String stepInstructions "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "routing_step_dependencies" {
    String id "🗝️"
    DependencyType dependencyType 
    DependencyTimingType timingType 
    Int lagTime "❓"
    Int leadTime "❓"
    DateTime createdAt 
    }
  

  "routing_step_parameters" {
    String id "🗝️"
    String parameterName 
    String parameterValue 
    String unitOfMeasure "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "routing_templates" {
    String id "🗝️"
    String name 
    String number 
    String category "❓"
    String description "❓"
    String tags 
    Boolean isPublic 
    Boolean isFavorite 
    Int usageCount 
    Float rating "❓"
    Json visualData "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "work_centers" {
    String id "🗝️"
    String name 
    String description "❓"
    Float capacity "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "work_units" {
    String id "🗝️"
    String workUnitCode 
    String workUnitName 
    String description "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "work_order_operations" {
    String id "🗝️"
    WorkOrderOperationStatus status 
    Int quantity 
    Int quantityCompleted 
    Int quantityScrap 
    DateTime startedAt "❓"
    DateTime completedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "production_schedules" {
    String id "🗝️"
    String scheduleNumber 
    String scheduleName 
    String description "❓"
    DateTime periodStart 
    DateTime periodEnd 
    String periodType 
    String areaId "❓"
    ScheduleState state 
    DateTime stateChangedAt 
    String stateChangedBy "❓"
    SchedulePriority priority 
    String plannedBy "❓"
    String approvedBy "❓"
    DateTime approvedAt "❓"
    Int dispatchedCount 
    Int totalEntries 
    Boolean isLocked 
    Boolean isFeasible 
    String feasibilityNotes "❓"
    String notes "❓"
    Json metadata "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "schedule_entries" {
    String id "🗝️"
    Int entryNumber 
    String partNumber 
    String description "❓"
    Float plannedQuantity 
    Float dispatchedQuantity 
    Float completedQuantity 
    String unitOfMeasure 
    DateTime plannedStartDate 
    DateTime plannedEndDate 
    DateTime actualStartDate "❓"
    DateTime actualEndDate "❓"
    SchedulePriority priority 
    Int sequenceNumber "❓"
    Int estimatedDuration "❓"
    String customerOrder "❓"
    DateTime customerDueDate "❓"
    String salesOrder "❓"
    Boolean isDispatched 
    DateTime dispatchedAt "❓"
    String dispatchedBy "❓"
    Boolean isCancelled 
    DateTime cancelledAt "❓"
    String cancelledReason "❓"
    String notes "❓"
    Json metadata "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "schedule_constraints" {
    String id "🗝️"
    ConstraintType constraintType 
    String constraintName 
    String description "❓"
    String resourceId "❓"
    String resourceType "❓"
    Float requiredQuantity "❓"
    Float availableQuantity "❓"
    String unitOfMeasure "❓"
    DateTime constraintDate "❓"
    Int leadTimeDays "❓"
    Boolean isViolated 
    String violationSeverity "❓"
    String violationMessage "❓"
    Boolean isResolved 
    DateTime resolvedAt "❓"
    String resolvedBy "❓"
    String resolutionNotes "❓"
    String notes "❓"
    Json metadata "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "schedule_state_history" {
    String id "🗝️"
    ScheduleState previousState "❓"
    ScheduleState newState 
    DateTime transitionDate 
    String reason "❓"
    String changedBy "❓"
    Int entriesAffected "❓"
    Boolean notificationsSent 
    String notes "❓"
    Json metadata "❓"
    DateTime createdAt 
    }
  

  "work_order_status_history" {
    String id "🗝️"
    WorkOrderStatus previousStatus "❓"
    WorkOrderStatus newStatus 
    DateTime transitionDate 
    String reason "❓"
    String changedBy "❓"
    String notes "❓"
    Int quantityAtTransition "❓"
    Int scrapAtTransition "❓"
    Json metadata "❓"
    DateTime createdAt 
    }
  

  "dispatch_logs" {
    String id "🗝️"
    DateTime dispatchedAt 
    String dispatchedBy "❓"
    String dispatchedFrom "❓"
    WorkOrderPriority priorityOverride "❓"
    DateTime expectedStartDate "❓"
    DateTime expectedEndDate "❓"
    Int quantityDispatched 
    Boolean materialReserved 
    Boolean toolingReserved 
    String dispatchNotes "❓"
    Json metadata "❓"
    DateTime createdAt 
    }
  

  "work_performance" {
    String id "🗝️"
    WorkPerformanceType performanceType 
    DateTime recordedAt 
    String recordedBy "❓"
    Float laborHours "❓"
    Float laborCost "❓"
    Float laborEfficiency "❓"
    String partId "❓"
    Float quantityConsumed "❓"
    Float quantityPlanned "❓"
    Float materialVariance "❓"
    Float unitCost "❓"
    Float totalCost "❓"
    String equipmentId "❓"
    Float setupTime "❓"
    Float runTime "❓"
    Float plannedSetupTime "❓"
    Float plannedRunTime "❓"
    Int quantityProduced "❓"
    Int quantityGood "❓"
    Int quantityScrap "❓"
    Int quantityRework "❓"
    Float yieldPercentage "❓"
    String scrapReason "❓"
    Float downtimeMinutes "❓"
    String downtimeReason "❓"
    String downtimeCategory "❓"
    String notes "❓"
    Json metadata "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "production_variances" {
    String id "🗝️"
    VarianceType varianceType 
    String varianceName 
    Float plannedValue 
    Float actualValue 
    Float variance 
    Float variancePercent 
    Boolean isFavorable 
    Float costImpact "❓"
    String rootCause "❓"
    String correctiveAction "❓"
    String responsibleParty "❓"
    DateTime calculatedAt 
    DateTime periodStart "❓"
    DateTime periodEnd "❓"
    Boolean isResolved 
    DateTime resolvedAt "❓"
    String resolvedBy "❓"
    String notes "❓"
    Json metadata "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "quality_plans" {
    String id "🗝️"
    String planNumber 
    String planName 
    String operation "❓"
    String description "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "quality_characteristics" {
    String id "🗝️"
    String characteristic 
    String specification 
    QualityToleranceType toleranceType 
    Float nominalValue "❓"
    Float upperLimit "❓"
    Float lowerLimit "❓"
    String unitOfMeasure "❓"
    String inspectionMethod "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "quality_inspections" {
    String id "🗝️"
    String inspectionNumber 
    QualityInspectionStatus status 
    QualityInspectionResult result "❓"
    Int quantity 
    DateTime startedAt "❓"
    DateTime completedAt "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "quality_measurements" {
    String id "🗝️"
    Float measuredValue 
    String result 
    String notes "❓"
    DateTime createdAt 
    }
  

  "ncrs" {
    String id "🗝️"
    String ncrNumber 
    String partNumber 
    String operation "❓"
    String defectType 
    String description 
    NCRSeverity severity 
    NCRStatus status 
    Int quantity 
    DateTime dueDate "❓"
    String rootCause "❓"
    String correctiveAction "❓"
    String preventiveAction "❓"
    DateTime closedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "equipment" {
    String id "🗝️"
    String equipmentNumber 
    String name 
    String description "❓"
    EquipmentClass equipmentClass 
    String equipmentType "❓"
    Int equipmentLevel 
    String manufacturer "❓"
    String model "❓"
    String serialNumber "❓"
    DateTime installDate "❓"
    DateTime commissionDate "❓"
    EquipmentStatus status 
    EquipmentState currentState 
    DateTime stateChangedAt 
    Float utilizationRate "❓"
    Float availability "❓"
    Float performance "❓"
    Float quality "❓"
    Float oee "❓"
    Float ratedCapacity "❓"
    Float currentCapacity "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "equipment_capabilities" {
    String id "🗝️"
    String capabilityType 
    String capability 
    String description "❓"
    Json parameters "❓"
    DateTime certifiedDate "❓"
    DateTime expiryDate "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "equipment_logs" {
    String id "🗝️"
    EquipmentLogType logType 
    String description 
    DateTime loggedAt 
    }
  

  "equipment_state_history" {
    String id "🗝️"
    EquipmentState previousState "❓"
    EquipmentState newState 
    String reason "❓"
    String changedBy "❓"
    DateTime stateStartTime 
    DateTime stateEndTime "❓"
    Int duration "❓"
    String workOrderId "❓"
    String operationId "❓"
    Boolean downtime 
    DateTime createdAt 
    }
  

  "equipment_performance_logs" {
    String id "🗝️"
    DateTime periodStart 
    DateTime periodEnd 
    PerformancePeriodType periodType 
    Int plannedProductionTime 
    Int operatingTime 
    Int downtime 
    Float availability 
    Float idealCycleTime "❓"
    Float actualCycleTime "❓"
    Int totalUnitsProduced 
    Int targetProduction "❓"
    Float performance 
    Int goodUnits 
    Int rejectedUnits 
    Int scrapUnits 
    Int reworkUnits 
    Float quality 
    Float oee 
    String workOrderId "❓"
    String partId "❓"
    String operatorId "❓"
    Float teep "❓"
    Float utilizationRate "❓"
    String notes "❓"
    Boolean hasAnomalies 
    DateTime createdAt 
    DateTime calculatedAt 
    }
  

  "inventory" {
    String id "🗝️"
    String location 
    String lotNumber "❓"
    Float quantity 
    String unitOfMeasure 
    Float unitCost "❓"
    DateTime receivedDate "❓"
    DateTime expiryDate "❓"
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "material_transactions" {
    String id "🗝️"
    MaterialTransactionType transactionType 
    Float quantity 
    String unitOfMeasure 
    String reference "❓"
    DateTime transactionDate 
    DateTime createdAt 
    }
  

  "serialized_parts" {
    String id "🗝️"
    String serialNumber 
    String workOrderId "❓"
    String lotNumber "❓"
    String status 
    String currentLocation "❓"
    DateTime manufactureDate "❓"
    DateTime shipDate "❓"
    String customerInfo "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "part_genealogy" {
    String id "🗝️"
    DateTime assemblyDate "❓"
    String assemblyOperator "❓"
    DateTime createdAt 
    }
  

  "work_instructions" {
    String id "🗝️"
    String title 
    String description "❓"
    String partId "❓"
    String operationId "❓"
    String version 
    WorkInstructionStatus status 
    DateTime effectiveDate "❓"
    DateTime supersededDate "❓"
    String ecoNumber "❓"
    DateTime approvedAt "❓"
    Json approvalHistory "❓"
    DateTime createdAt 
    DateTime updatedAt 
    String operationType "❓"
    Boolean requiredForExecution 
    }
  

  "work_instruction_steps" {
    String id "🗝️"
    Int stepNumber 
    String title 
    String content 
    String imageUrls 
    String videoUrls 
    String attachmentUrls 
    Int estimatedDuration "❓"
    Boolean isCritical 
    Boolean requiresSignature 
    Json dataEntryFields "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "work_instruction_executions" {
    String id "🗝️"
    String workInstructionId 
    String workOrderId 
    String operationId "❓"
    Int currentStepNumber 
    WorkInstructionExecutionStatus status 
    DateTime startedAt 
    DateTime completedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "work_instruction_step_executions" {
    String id "🗝️"
    Int stepNumber 
    String status 
    Json dataEntered "❓"
    String notes "❓"
    DateTime signedAt "❓"
    DateTime startedAt "❓"
    DateTime completedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "electronic_signatures" {
    String id "🗝️"
    ElectronicSignatureType signatureType 
    ElectronicSignatureLevel signatureLevel 
    String signedEntityType 
    String signedEntityId 
    String signatureReason "❓"
    Json signatureData 
    String ipAddress 
    String userAgent 
    DateTime timestamp 
    BiometricType biometricType "❓"
    String biometricTemplate "❓"
    Float biometricScore "❓"
    String signatureHash 
    Boolean isValid 
    DateTime invalidatedAt "❓"
    String invalidationReason "❓"
    Json signedDocument "❓"
    String certificateId "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "fai_reports" {
    String id "🗝️"
    String faiNumber 
    String partId 
    String workOrderId "❓"
    String inspectionId "❓"
    FAIStatus status 
    String revisionLevel "❓"
    Json form1Data "❓"
    Json form2Data "❓"
    String createdById "❓"
    String reviewedById "❓"
    String approvedById "❓"
    DateTime reviewedAt "❓"
    DateTime approvedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "fai_characteristics" {
    String id "🗝️"
    Int characteristicNumber 
    String characteristic 
    String specification 
    String requirement "❓"
    String toleranceType "❓"
    Float nominalValue "❓"
    Float upperLimit "❓"
    Float lowerLimit "❓"
    String unitOfMeasure "❓"
    String inspectionMethod "❓"
    String inspectionFrequency "❓"
    Json measuredValues 
    Float actualValue "❓"
    Float deviation "❓"
    String result "❓"
    String notes "❓"
    String verifiedById "❓"
    DateTime verifiedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "audit_logs" {
    String id "🗝️"
    String tableName 
    String recordId 
    String action 
    Json oldValues "❓"
    Json newValues "❓"
    String ipAddress "❓"
    String userAgent "❓"
    DateTime timestamp 
    }
  

  "maintenance_work_orders" {
    String id "🗝️"
    String externalWorkOrderNumber 
    String description 
    String workType 
    String status 
    DateTime scheduledStart "❓"
    DateTime scheduledFinish "❓"
    DateTime actualStart "❓"
    DateTime actualFinish "❓"
    Int priority 
    String failureCode "❓"
    String problemCode "❓"
    String causeCode "❓"
    String remedyCode "❓"
    DateTime lastSyncedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "measurement_equipment" {
    String id "🗝️"
    String externalGaugeId "❓"
    String description 
    String manufacturer "❓"
    String model "❓"
    String serialNumber "❓"
    String gaugeType 
    String measurementType 
    String measurementRange "❓"
    Float resolution "❓"
    Float accuracy "❓"
    String location "❓"
    Int calibrationFrequency "❓"
    DateTime lastCalibrationDate "❓"
    DateTime nextCalibrationDate "❓"
    String calibrationStatus 
    Boolean isActive 
    DateTime lastSyncedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "inspection_records" {
    String id "🗝️"
    String characteristic 
    Float nominalValue 
    Float actualValue 
    Float lowerTolerance 
    Float upperTolerance 
    String unit 
    String result 
    DateTime inspectionDate 
    DateTime createdAt 
    }
  

  "cnc_programs" {
    String id "🗝️"
    String externalProgramId "❓"
    String programName 
    String partNumber 
    String operationCode 
    String revision 
    DateTime revisionDate 
    String status 
    String machineType "❓"
    String postProcessor "❓"
    String toolList "❓"
    String setupSheetUrl "❓"
    String approvedBy "❓"
    DateTime approvalDate "❓"
    String ecoNumber "❓"
    DateTime effectiveDate "❓"
    Boolean firstPieceRequired 
    Boolean firstPieceApproved 
    DateTime firstPieceDate "❓"
    String programUrl "❓"
    String stepAP242Url "❓"
    String pmiDataUrl "❓"
    String teamcenterItemId "❓"
    DateTime lastSyncedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "program_download_logs" {
    String id "🗝️"
    String programName 
    String revision 
    String machineId 
    String operatorBadgeNumber 
    String workOrderNumber "❓"
    DateTime downloadDate 
    Boolean authorized 
    String authorizationMethod 
    DateTime createdAt 
    }
  

  "program_load_authorizations" {
    String id "🗝️"
    String authorizationId 
    String operatorBadgeNumber 
    String machineId 
    String programName 
    String programRevision 
    String partNumber 
    String workOrderNumber "❓"
    Boolean authorized 
    DateTime authorizationDate 
    Boolean operatorAuthenticated 
    Boolean workOrderValid 
    Boolean certificationValid 
    Boolean programVersionValid 
    Boolean gaugeCalibrationValid 
    String failureReasons "❓"
    Json validationDetails "❓"
    Boolean supervisorNotified 
    String overrideReason "❓"
    String electronicSignature "❓"
    DateTime createdAt 
    }
  

  "operation_gauge_requirements" {
    String id "🗝️"
    String partNumber 
    String operationCode 
    Boolean required 
    DateTime createdAt 
    }
  

  "alerts" {
    String id "🗝️"
    String alertType 
    String severity 
    String message 
    Json details "❓"
    Boolean resolved 
    String resolvedBy "❓"
    DateTime resolvedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "integration_configs" {
    String id "🗝️"
    String name 
    String displayName 
    IntegrationType type 
    Boolean enabled 
    Json config 
    DateTime lastSync "❓"
    String lastSyncStatus "❓"
    String lastError "❓"
    Int errorCount 
    Int totalSyncs 
    Int successCount 
    Int failureCount 
    Json syncSchedule "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "integration_logs" {
    String id "🗝️"
    String operation 
    IntegrationDirection direction 
    IntegrationLogStatus status 
    Int recordCount 
    Int successCount 
    Int errorCount 
    Int duration 
    Json requestData "❓"
    Json responseData "❓"
    Json errors "❓"
    Json details "❓"
    DateTime startedAt 
    DateTime completedAt "❓"
    DateTime createdAt 
    }
  

  "production_schedule_requests" {
    String id "🗝️"
    String messageId 
    ScheduleType scheduleType 
    SchedulePriority priority 
    String requestedBy 
    DateTime requestedDate 
    DateTime effectiveStartDate 
    DateTime effectiveEndDate 
    String externalWorkOrderId 
    String partNumber "❓"
    Float quantity 
    String unitOfMeasure 
    DateTime dueDate 
    Json equipmentRequirements "❓"
    Json personnelRequirements "❓"
    Json materialRequirements "❓"
    B2MMessageStatus status 
    DateTime processedAt "❓"
    String errorMessage "❓"
    Json validationErrors "❓"
    Json requestPayload 
    Json responsePayload "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "production_schedule_responses" {
    String id "🗝️"
    String messageId 
    Boolean accepted 
    DateTime confirmedStartDate "❓"
    DateTime confirmedEndDate "❓"
    Float confirmedQuantity "❓"
    String rejectionReason "❓"
    Json modifications "❓"
    Json constraints "❓"
    DateTime proposedStartDate "❓"
    DateTime proposedEndDate "❓"
    Float proposedQuantity "❓"
    String respondedBy 
    DateTime respondedAt 
    Boolean sentToERP 
    DateTime sentAt "❓"
    Json responsePayload 
    DateTime createdAt 
    }
  

  "production_performance_actuals" {
    String id "🗝️"
    String messageId 
    String externalWorkOrderId 
    String operationId "❓"
    DateTime reportingPeriodStart 
    DateTime reportingPeriodEnd 
    Float quantityProduced 
    Float quantityGood 
    Float quantityScrap 
    Float quantityRework 
    Float yieldPercentage "❓"
    Float setupTimeActual "❓"
    Float runTimeActual "❓"
    Float downtimeActual "❓"
    Float laborHoursActual "❓"
    Float laborCostActual "❓"
    Float materialCostActual "❓"
    Float overheadCostActual "❓"
    Float totalCostActual "❓"
    Float quantityVariance "❓"
    Float timeVariance "❓"
    Float costVariance "❓"
    Float efficiencyVariance "❓"
    Json personnelActuals "❓"
    Json equipmentActuals "❓"
    Json materialActuals "❓"
    B2MMessageStatus status 
    Boolean sentToERP 
    DateTime sentAt "❓"
    String erpConfirmation "❓"
    String errorMessage "❓"
    Json messagePayload 
    String createdBy 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "erp_material_transactions" {
    String id "🗝️"
    String messageId 
    ERPTransactionType transactionType 
    IntegrationDirection direction 
    DateTime transactionDate 
    String externalPartId 
    String fromLocation "❓"
    String toLocation "❓"
    String externalWorkOrderId "❓"
    Float quantity 
    String unitOfMeasure 
    String lotNumber "❓"
    String serialNumber "❓"
    Float unitCost "❓"
    Float totalCost "❓"
    String currency "❓"
    String movementType 
    String reasonCode "❓"
    B2MMessageStatus status 
    DateTime processedAt "❓"
    String erpTransactionId "❓"
    String errorMessage "❓"
    Json messagePayload 
    String createdBy 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "personnel_info_exchanges" {
    String id "🗝️"
    String messageId 
    String personnelId "❓"
    String externalPersonnelId 
    PersonnelActionType actionType 
    IntegrationDirection direction 
    String firstName "❓"
    String lastName "❓"
    String email "❓"
    String employeeNumber "❓"
    String department "❓"
    String jobTitle "❓"
    Json skills "❓"
    Json certifications "❓"
    Json qualifications "❓"
    String shiftCode "❓"
    String workCalendar "❓"
    DateTime availableFrom "❓"
    DateTime availableTo "❓"
    String employmentStatus "❓"
    DateTime lastWorkDate "❓"
    B2MMessageStatus status 
    DateTime processedAt "❓"
    String errorMessage "❓"
    Json messagePayload 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "equipment_data_collections" {
    String id "🗝️"
    DataCollectionType dataCollectionType 
    DateTime collectionTimestamp 
    String dataPointName 
    String dataPointId "❓"
    Float numericValue "❓"
    String stringValue "❓"
    Boolean booleanValue "❓"
    Json jsonValue "❓"
    String unitOfMeasure "❓"
    String quality "❓"
    String operationId "❓"
    String productionRunId "❓"
    String equipmentState "❓"
    String protocol "❓"
    String sourceAddress "❓"
    DateTime createdAt 
    }
  

  "equipment_commands" {
    String id "🗝️"
    CommandType commandType 
    CommandStatus commandStatus 
    String commandName 
    Json commandPayload "❓"
    String operationId "❓"
    DateTime issuedAt 
    DateTime sentAt "❓"
    DateTime acknowledgedAt "❓"
    DateTime completedAt "❓"
    Json responsePayload "❓"
    String responseCode "❓"
    String responseMessage "❓"
    Int timeoutSeconds 
    Int retryCount 
    Int maxRetries 
    Int priority 
    String issuedBy 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "equipment_material_movements" {
    String id "🗝️"
    String partNumber 
    String lotNumber "❓"
    String serialNumber "❓"
    String movementType 
    Float quantity 
    String unitOfMeasure 
    DateTime movementTimestamp 
    String operationId "❓"
    String fromLocation "❓"
    String toLocation "❓"
    String qualityStatus "❓"
    String upstreamTraceId "❓"
    String downstreamTraceId "❓"
    String recordedBy 
    DateTime createdAt 
    }
  

  "process_data_collections" {
    String id "🗝️"
    String processName 
    Int processStepNumber "❓"
    DateTime startTimestamp 
    DateTime endTimestamp "❓"
    Float duration "❓"
    String operationId "❓"
    String partNumber "❓"
    String lotNumber "❓"
    String serialNumber "❓"
    Json parameters 
    Float quantityProduced "❓"
    Float quantityGood "❓"
    Float quantityScrap "❓"
    Int inSpecCount "❓"
    Int outOfSpecCount "❓"
    Float averageUtilization "❓"
    Float peakUtilization "❓"
    Int alarmCount 
    Int criticalAlarmCount 
    String operatorId "❓"
    String supervisorId "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "qif_measurement_plans" {
    String id "🗝️"
    String qifPlanId 
    String partNumber 
    String partRevision 
    String planVersion 
    String planName "❓"
    String description "❓"
    DateTime createdDate 
    String createdBy "❓"
    String qifXmlContent 
    String qifVersion 
    Int characteristicCount 
    String status 
    String supersededBy "❓"
    DateTime lastSyncedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "qif_characteristics" {
    String id "🗝️"
    String characteristicId 
    String balloonNumber "❓"
    String characteristicName "❓"
    String description "❓"
    Float nominalValue "❓"
    Float upperTolerance "❓"
    Float lowerTolerance "❓"
    String toleranceType "❓"
    String gdtType "❓"
    String datumReferenceFrame "❓"
    String materialCondition "❓"
    String measurementMethod "❓"
    Boolean samplingRequired 
    Int sampleSize "❓"
    Int sequenceNumber "❓"
    DateTime createdAt 
    }
  

  "qif_measurement_results" {
    String id "🗝️"
    String qifResultsId 
    String partNumber 
    String serialNumber "❓"
    String lotNumber "❓"
    DateTime inspectionDate 
    String inspectedBy 
    String inspectionType "❓"
    String overallStatus 
    Int totalMeasurements 
    Int passedMeasurements 
    Int failedMeasurements 
    String qifXmlContent 
    String qifVersion 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "qif_measurements" {
    String id "🗝️"
    String characteristicId 
    String balloonNumber "❓"
    Float measuredValue 
    Float deviation "❓"
    String status 
    DateTime measurementDate "❓"
    String measuredBy "❓"
    String measurementDevice "❓"
    Float uncertainty "❓"
    Float uncertaintyK "❓"
    String notes "❓"
    DateTime createdAt 
    }
  

  "spc_configurations" {
    String id "🗝️"
    SPCChartType chartType 
    Int subgroupSize "❓"
    Float UCL "❓"
    Float centerLine "❓"
    Float LCL "❓"
    Float rangeUCL "❓"
    Float rangeCL "❓"
    Float rangeLCL "❓"
    Float USL "❓"
    Float LSL "❓"
    Float targetValue "❓"
    LimitCalculationMethod limitsBasedOn 
    Int historicalDataDays "❓"
    DateTime lastCalculatedAt "❓"
    Json enabledRules 
    String ruleSensitivity 
    Boolean enableCapability 
    Float confidenceLevel 
    Boolean isActive 
    String createdBy 
    String lastModifiedBy "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "spc_rule_violations" {
    String id "🗝️"
    Int ruleNumber 
    String ruleName 
    String severity 
    String dataPointId "❓"
    Float value 
    DateTime timestamp 
    Int subgroupNumber "❓"
    Float UCL "❓"
    Float LCL "❓"
    Float centerLine "❓"
    Float deviationSigma "❓"
    Boolean acknowledged 
    String acknowledgedBy "❓"
    DateTime acknowledgedAt "❓"
    String resolution "❓"
    DateTime createdAt 
    }
  

  "sampling_plans" {
    String id "🗝️"
    String planName 
    SamplingPlanType planType 
    String inspectionLevel 
    Float AQL 
    Int lotSizeMin "❓"
    Int lotSizeMax "❓"
    Int sampleSizeNormal 
    Int acceptanceNumber 
    Int rejectionNumber 
    Int sampleSizeTightened "❓"
    Int acceptanceNumberTightened "❓"
    Int sampleSizeReduced "❓"
    Int acceptanceNumberReduced "❓"
    Int sampleSize2 "❓"
    Int acceptanceNumber2 "❓"
    Int rejectionNumber2 "❓"
    String currentInspectionLevel 
    Int consecutiveAccepted 
    Int consecutiveRejected 
    Boolean isActive 
    String createdBy 
    String lastModifiedBy "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "sampling_inspection_results" {
    String id "🗝️"
    String lotNumber 
    Int lotSize 
    DateTime inspectionDate 
    Int sampleSize 
    Int defectsFound 
    String decision 
    String inspectionLevel 
    String inspectorId 
    String notes "❓"
    DateTime createdAt 
    }
  
    "enterprises" o{--}o "sites" : ""
    "sites" o|--|o "enterprises" : "enterprise"
    "sites" o{--}o "routings" : ""
    "sites" o{--}o "part_site_availability" : ""
    "sites" o{--}o "operations" : ""
    "sites" o{--}o "work_orders" : ""
    "sites" o{--}o "equipment" : ""
    "sites" o{--}o "ncrs" : ""
    "sites" o{--}o "areas" : ""
    "sites" o{--}o "production_schedules" : ""
    "sites" o{--}o "routing_templates" : ""
    "areas" o|--|| "sites" : "site"
    "areas" o{--}o "work_centers" : ""
    "areas" o{--}o "equipment" : ""
    "users" o{--}o "work_orders" : ""
    "users" o{--}o "work_orders" : ""
    "users" o{--}o "quality_inspections" : ""
    "users" o{--}o "ncrs" : ""
    "users" o{--}o "ncrs" : ""
    "users" o{--}o "equipment_logs" : ""
    "users" o{--}o "audit_logs" : ""
    "users" o{--}o "work_instructions" : ""
    "users" o{--}o "work_instructions" : ""
    "users" o{--}o "work_instructions" : ""
    "users" o{--}o "work_instruction_executions" : ""
    "users" o{--}o "work_instruction_step_executions" : ""
    "users" o{--}o "electronic_signatures" : ""
    "users" o{--}o "electronic_signatures" : ""
    "users" o|--|o "personnel_classes" : "personnelClass"
    "users" o|--|o "users" : "supervisor"
    "users" o{--}o "personnel_certifications" : ""
    "users" o{--}o "personnel_skill_assignments" : ""
    "users" o{--}o "personnel_work_center_assignments" : ""
    "users" o{--}o "personnel_availability" : ""
    "users" o{--}o "dispatch_logs" : ""
    "users" o{--}o "work_performance" : ""
    "users" o{--}o "routing_templates" : ""
    "personnel_classes" o|--|o "personnel_classes" : "parentClass"
    "personnel_classes" o{--}o "personnel_qualifications" : ""
    "personnel_qualifications" o|--|| "QualificationType" : "enum:qualificationType"
    "personnel_qualifications" o|--|o "personnel_classes" : "personnelClass"
    "personnel_qualifications" o{--}o "personnel_certifications" : ""
    "personnel_certifications" o|--|| "CertificationStatus" : "enum:status"
    "personnel_certifications" o|--|| "users" : "personnel"
    "personnel_certifications" o|--|| "personnel_qualifications" : "qualification"
    "personnel_skills" o|--|| "SkillCategory" : "enum:skillCategory"
    "personnel_skills" o{--}o "personnel_skill_assignments" : ""
    "personnel_skill_assignments" o|--|| "CompetencyLevel" : "enum:competencyLevel"
    "personnel_skill_assignments" o|--|| "users" : "personnel"
    "personnel_skill_assignments" o|--|| "personnel_skills" : "skill"
    "personnel_work_center_assignments" o|--|| "users" : "personnel"
    "personnel_work_center_assignments" o|--|| "work_centers" : "workCenter"
    "personnel_availability" o|--|| "AvailabilityType" : "enum:availabilityType"
    "personnel_availability" o|--|| "users" : "personnel"
    "material_classes" o|--|o "material_classes" : "parentClass"
    "material_classes" o{--}o "material_definitions" : ""
    "material_definitions" o|--|| "MaterialType" : "enum:materialType"
    "material_definitions" o|--|| "material_classes" : "materialClass"
    "material_definitions" o|--|o "material_definitions" : "replacementMaterial"
    "material_definitions" o{--}o "material_properties" : ""
    "material_definitions" o{--}o "material_lots" : ""
    "material_properties" o|--|| "MaterialPropertyType" : "enum:propertyType"
    "material_properties" o|--|| "material_definitions" : "material"
    "material_lots" o|--|| "MaterialLotStatus" : "enum:status"
    "material_lots" o|--|| "MaterialLotState" : "enum:state"
    "material_lots" o|--|| "QualityLotStatus" : "enum:qualityStatus"
    "material_lots" o|--|| "material_definitions" : "material"
    "material_lots" o|--|o "material_lots" : "parentLot"
    "material_lots" o{--}o "material_sublots" : ""
    "material_lots" o{--}o "material_state_history" : ""
    "material_lots" o{--}o "material_lot_genealogy" : ""
    "material_lots" o{--}o "material_lot_genealogy" : ""
    "material_sublots" o|--|| "SublotOperationType" : "enum:operationType"
    "material_sublots" o|--|| "MaterialLotStatus" : "enum:status"
    "material_sublots" o|--|| "material_lots" : "parentLot"
    "material_lot_genealogy" o|--|| "GenealogyRelationType" : "enum:relationshipType"
    "material_lot_genealogy" o|--|| "material_lots" : "parentLot"
    "material_lot_genealogy" o|--|| "material_lots" : "childLot"
    "material_state_history" o|--|o "MaterialLotState" : "enum:previousState"
    "material_state_history" o|--|| "MaterialLotState" : "enum:newState"
    "material_state_history" o|--|o "MaterialLotStatus" : "enum:previousStatus"
    "material_state_history" o|--|o "MaterialLotStatus" : "enum:newStatus"
    "material_state_history" o|--|| "StateTransitionType" : "enum:transitionType"
    "material_state_history" o|--|| "material_lots" : "lot"
    "operations" o|--|o "OperationClassification" : "enum:operationClassification"
    "operations" o|--|o "work_instructions" : "standardWorkInstruction"
    "operations" o|--|| "OperationType" : "enum:operationType"
    "operations" o|--|o "operations" : "parentOperation"
    "operations" o|--|o "sites" : "site"
    "operations" o{--}o "routing_steps" : ""
    "operations" o{--}o "operation_parameters" : ""
    "operations" o{--}o "operation_dependencies" : ""
    "operations" o{--}o "operation_dependencies" : ""
    "operations" o{--}o "personnel_operation_specifications" : ""
    "operations" o{--}o "equipment_operation_specifications" : ""
    "operations" o{--}o "material_operation_specifications" : ""
    "operations" o{--}o "physical_asset_operation_specifications" : ""
    "operations" o{--}o "bom_items" : ""
    "operations" o{--}o "sampling_plans" : ""
    "operation_parameters" o|--|| "ParameterType" : "enum:parameterType"
    "operation_parameters" o|--|| "ParameterDataType" : "enum:dataType"
    "operation_parameters" o|--|| "operations" : "operation"
    "operation_parameters" o{--}o "parameter_limits" : ""
    "operation_parameters" o|--|o "parameter_groups" : "parameterGroup"
    "operation_parameters" o{--}o "parameter_formulas" : ""
    "operation_parameters" o{--}o "spc_configurations" : ""
    "operation_parameters" o{--}o "sampling_plans" : ""
    "parameter_limits" o|--|| "operation_parameters" : "parameter"
    "parameter_groups" o|--|o "parameter_groups" : "parentGroup"
    "parameter_groups" o|--|| "ParameterGroupType" : "enum:groupType"
    "parameter_formulas" o|--|| "operation_parameters" : "outputParameter"
    "parameter_formulas" o|--|| "FormulaLanguage" : "enum:formulaLanguage"
    "parameter_formulas" o|--|| "EvaluationTrigger" : "enum:evaluationTrigger"
    "operation_dependencies" o|--|| "DependencyType" : "enum:dependencyType"
    "operation_dependencies" o|--|| "DependencyTimingType" : "enum:timingType"
    "operation_dependencies" o|--|| "operations" : "dependentOperation"
    "operation_dependencies" o|--|| "operations" : "prerequisiteOperation"
    "personnel_operation_specifications" o|--|o "CompetencyLevel" : "enum:minimumCompetency"
    "personnel_operation_specifications" o|--|| "operations" : "operation"
    "equipment_operation_specifications" o|--|o "EquipmentClass" : "enum:equipmentClass"
    "equipment_operation_specifications" o|--|| "operations" : "operation"
    "material_operation_specifications" o|--|o "MaterialType" : "enum:materialType"
    "material_operation_specifications" o|--|| "ConsumptionType" : "enum:consumptionType"
    "material_operation_specifications" o|--|| "operations" : "operation"
    "physical_asset_operation_specifications" o|--|| "PhysicalAssetType" : "enum:assetType"
    "physical_asset_operation_specifications" o|--|| "operations" : "operation"
    "parts" o|--|| "ProductType" : "enum:productType"
    "parts" o|--|| "ProductLifecycleState" : "enum:lifecycleState"
    "parts" o|--|o "parts" : "replacementPart"
    "parts" o{--}o "work_orders" : ""
    "parts" o{--}o "bom_items" : ""
    "parts" o{--}o "bom_items" : ""
    "parts" o{--}o "quality_plans" : ""
    "parts" o{--}o "inventory" : ""
    "parts" o{--}o "serialized_parts" : ""
    "parts" o{--}o "product_specifications" : ""
    "parts" o{--}o "product_configurations" : ""
    "parts" o{--}o "product_lifecycle" : ""
    "parts" o{--}o "schedule_entries" : ""
    "parts" o{--}o "routings" : ""
    "parts" o{--}o "part_site_availability" : ""
    "parts" o{--}o "production_schedule_requests" : ""
    "parts" o{--}o "erp_material_transactions" : ""
    "parts" o{--}o "equipment_material_movements" : ""
    "part_site_availability" o|--|| "parts" : "part"
    "part_site_availability" o|--|| "sites" : "site"
    "bom_items" o|--|| "parts" : "parentPart"
    "bom_items" o|--|| "parts" : "componentPart"
    "bom_items" o|--|o "operations" : "operation"
    "product_specifications" o|--|| "SpecificationType" : "enum:specificationType"
    "product_specifications" o|--|| "parts" : "part"
    "product_configurations" o|--|| "ConfigurationType" : "enum:configurationType"
    "product_configurations" o|--|| "parts" : "part"
    "product_configurations" o{--}o "configuration_options" : ""
    "configuration_options" o|--|| "product_configurations" : "configuration"
    "product_lifecycle" o|--|o "ProductLifecycleState" : "enum:previousState"
    "product_lifecycle" o|--|| "ProductLifecycleState" : "enum:newState"
    "product_lifecycle" o|--|| "parts" : "part"
    "work_orders" o|--|| "WorkOrderPriority" : "enum:priority"
    "work_orders" o|--|| "WorkOrderStatus" : "enum:status"
    "work_orders" o|--|| "parts" : "part"
    "work_orders" o|--|o "sites" : "site"
    "work_orders" o|--|| "users" : "createdBy"
    "work_orders" o|--|o "users" : "assignedTo"
    "work_orders" o|--|o "routings" : "routing"
    "work_orders" o{--}o "work_order_operations" : ""
    "work_orders" o{--}o "quality_inspections" : ""
    "work_orders" o{--}o "material_transactions" : ""
    "work_orders" o{--}o "ncrs" : ""
    "work_orders" o{--}o "schedule_entries" : ""
    "work_orders" o{--}o "work_order_status_history" : ""
    "work_orders" o{--}o "dispatch_logs" : ""
    "work_orders" o{--}o "work_performance" : ""
    "work_orders" o{--}o "production_variances" : ""
    "work_orders" o{--}o "production_schedule_requests" : ""
    "work_orders" o{--}o "production_performance_actuals" : ""
    "work_orders" o{--}o "erp_material_transactions" : ""
    "work_orders" o{--}o "equipment_data_collections" : ""
    "work_orders" o{--}o "equipment_commands" : ""
    "work_orders" o{--}o "equipment_material_movements" : ""
    "work_orders" o{--}o "process_data_collections" : ""
    "work_orders" o{--}o "qif_measurement_plans" : ""
    "work_orders" o{--}o "qif_measurement_results" : ""
    "routings" o|--|| "RoutingLifecycleState" : "enum:lifecycleState"
    "routings" o|--|| "RoutingType" : "enum:routingType"
    "routings" o|--|o "parts" : "part"
    "routings" o|--|o "sites" : "site"
    "routings" o{--}o "routing_steps" : ""
    "routings" o{--}o "routing_operations" : ""
    "routings" o{--}o "schedule_entries" : ""
    "routings" o{--}o "routing_templates" : ""
    "routings" o|--|o "routings" : "alternateFor"
    "routing_operations" o|--|| "routings" : "routing"
    "routing_operations" o|--|o "work_centers" : "workCenter"
    "routing_operations" o{--}o "work_order_operations" : ""
    "routing_steps" o|--|| "StepType" : "enum:stepType"
    "routing_steps" o|--|o "ControlType" : "enum:controlType"
    "routing_steps" o|--|o "work_instructions" : "workInstruction"
    "routing_steps" o|--|| "routings" : "routing"
    "routing_steps" o|--|| "operations" : "operation"
    "routing_steps" o|--|o "work_centers" : "workCenter"
    "routing_steps" o{--}o "routing_step_dependencies" : ""
    "routing_steps" o{--}o "routing_step_dependencies" : ""
    "routing_steps" o{--}o "work_order_operations" : ""
    "routing_steps" o{--}o "routing_step_parameters" : ""
    "routing_step_dependencies" o|--|| "DependencyType" : "enum:dependencyType"
    "routing_step_dependencies" o|--|| "DependencyTimingType" : "enum:timingType"
    "routing_step_dependencies" o|--|| "routing_steps" : "dependentStep"
    "routing_step_dependencies" o|--|| "routing_steps" : "prerequisiteStep"
    "routing_step_parameters" o|--|| "routing_steps" : "routingStep"
    "routing_templates" o|--|o "routings" : "sourceRouting"
    "routing_templates" o|--|| "users" : "createdBy"
    "routing_templates" o|--|| "sites" : "site"
    "work_centers" o|--|o "areas" : "area"
    "work_centers" o{--}o "work_units" : ""
    "work_centers" o{--}o "equipment" : ""
    "work_centers" o{--}o "schedule_entries" : ""
    "work_centers" o{--}o "dispatch_logs" : ""
    "work_units" o|--|| "work_centers" : "workCenter"
    "work_units" o{--}o "equipment" : ""
    "work_order_operations" o|--|| "WorkOrderOperationStatus" : "enum:status"
    "work_order_operations" o|--|| "work_orders" : "workOrder"
    "work_order_operations" o|--|| "routing_operations" : "routingOperation"
    "work_order_operations" o{--}o "work_performance" : ""
    "work_order_operations" o{--}o "production_variances" : ""
    "work_order_operations" o|--|o "routing_steps" : "RoutingStep"
    "production_schedules" o|--|| "ScheduleState" : "enum:state"
    "production_schedules" o|--|| "SchedulePriority" : "enum:priority"
    "production_schedules" o|--|o "sites" : "site"
    "production_schedules" o{--}o "schedule_entries" : ""
    "production_schedules" o{--}o "schedule_state_history" : ""
    "schedule_entries" o|--|| "SchedulePriority" : "enum:priority"
    "schedule_entries" o|--|| "production_schedules" : "schedule"
    "schedule_entries" o|--|| "parts" : "part"
    "schedule_entries" o|--|o "work_orders" : "workOrder"
    "schedule_entries" o|--|o "work_centers" : "workCenter"
    "schedule_entries" o|--|o "routings" : "routing"
    "schedule_entries" o{--}o "schedule_constraints" : ""
    "schedule_constraints" o|--|| "ConstraintType" : "enum:constraintType"
    "schedule_constraints" o|--|| "schedule_entries" : "entry"
    "schedule_state_history" o|--|o "ScheduleState" : "enum:previousState"
    "schedule_state_history" o|--|| "ScheduleState" : "enum:newState"
    "schedule_state_history" o|--|| "production_schedules" : "schedule"
    "work_order_status_history" o|--|o "WorkOrderStatus" : "enum:previousStatus"
    "work_order_status_history" o|--|| "WorkOrderStatus" : "enum:newStatus"
    "work_order_status_history" o|--|| "work_orders" : "workOrder"
    "dispatch_logs" o|--|o "WorkOrderPriority" : "enum:priorityOverride"
    "dispatch_logs" o|--|| "work_orders" : "workOrder"
    "dispatch_logs" o|--|o "users" : "assignedTo"
    "dispatch_logs" o|--|o "work_centers" : "workCenter"
    "work_performance" o|--|| "WorkPerformanceType" : "enum:performanceType"
    "work_performance" o|--|| "work_orders" : "workOrder"
    "work_performance" o|--|o "work_order_operations" : "operation"
    "work_performance" o|--|o "users" : "personnel"
    "production_variances" o|--|| "VarianceType" : "enum:varianceType"
    "production_variances" o|--|| "work_orders" : "workOrder"
    "production_variances" o|--|o "work_order_operations" : "operation"
    "quality_plans" o|--|| "parts" : "part"
    "quality_plans" o{--}o "quality_characteristics" : ""
    "quality_plans" o{--}o "quality_inspections" : ""
    "quality_characteristics" o|--|| "QualityToleranceType" : "enum:toleranceType"
    "quality_characteristics" o|--|| "quality_plans" : "plan"
    "quality_characteristics" o{--}o "quality_measurements" : ""
    "quality_inspections" o|--|| "QualityInspectionStatus" : "enum:status"
    "quality_inspections" o|--|o "QualityInspectionResult" : "enum:result"
    "quality_inspections" o|--|| "work_orders" : "workOrder"
    "quality_inspections" o|--|| "quality_plans" : "plan"
    "quality_inspections" o|--|| "users" : "inspector"
    "quality_inspections" o{--}o "quality_measurements" : ""
    "quality_inspections" o{--}o "ncrs" : ""
    "quality_measurements" o|--|| "quality_inspections" : "inspection"
    "quality_measurements" o|--|| "quality_characteristics" : "characteristic"
    "ncrs" o|--|| "NCRSeverity" : "enum:severity"
    "ncrs" o|--|| "NCRStatus" : "enum:status"
    "ncrs" o|--|| "users" : "createdBy"
    "ncrs" o|--|o "users" : "assignedTo"
    "ncrs" o|--|o "quality_inspections" : "inspection"
    "ncrs" o|--|o "work_orders" : "workOrder"
    "ncrs" o|--|o "sites" : "site"
    "equipment" o|--|| "EquipmentClass" : "enum:equipmentClass"
    "equipment" o|--|| "EquipmentStatus" : "enum:status"
    "equipment" o|--|| "EquipmentState" : "enum:currentState"
    "equipment" o|--|o "equipment" : "parentEquipment"
    "equipment" o|--|o "work_units" : "workUnit"
    "equipment" o|--|o "work_centers" : "workCenter"
    "equipment" o|--|o "areas" : "area"
    "equipment" o|--|o "sites" : "site"
    "equipment" o{--}o "equipment_capabilities" : ""
    "equipment" o{--}o "equipment_logs" : ""
    "equipment" o{--}o "equipment_state_history" : ""
    "equipment" o{--}o "equipment_performance_logs" : ""
    "equipment" o{--}o "production_schedule_requests" : ""
    "equipment" o{--}o "equipment_data_collections" : ""
    "equipment" o{--}o "equipment_commands" : ""
    "equipment" o{--}o "equipment_material_movements" : ""
    "equipment" o{--}o "process_data_collections" : ""
    "equipment" o{--}o "maintenance_work_orders" : ""
    "equipment_capabilities" o|--|| "equipment" : "equipment"
    "equipment_logs" o|--|| "EquipmentLogType" : "enum:logType"
    "equipment_logs" o|--|| "equipment" : "equipment"
    "equipment_logs" o|--|o "users" : "user"
    "equipment_state_history" o|--|o "EquipmentState" : "enum:previousState"
    "equipment_state_history" o|--|| "EquipmentState" : "enum:newState"
    "equipment_state_history" o|--|| "equipment" : "equipment"
    "equipment_performance_logs" o|--|| "PerformancePeriodType" : "enum:periodType"
    "equipment_performance_logs" o|--|| "equipment" : "equipment"
    "inventory" o|--|| "parts" : "part"
    "inventory" o{--}o "material_transactions" : ""
    "material_transactions" o|--|| "MaterialTransactionType" : "enum:transactionType"
    "material_transactions" o|--|| "inventory" : "inventory"
    "material_transactions" o|--|o "work_orders" : "workOrder"
    "serialized_parts" o|--|| "parts" : "part"
    "serialized_parts" o{--}o "part_genealogy" : ""
    "serialized_parts" o{--}o "part_genealogy" : ""
    "serialized_parts" o{--}o "inspection_records" : ""
    "serialized_parts" o{--}o "qif_measurement_results" : ""
    "part_genealogy" o|--|| "serialized_parts" : "parentPart"
    "part_genealogy" o|--|| "serialized_parts" : "componentPart"
    "work_instructions" o|--|| "WorkInstructionStatus" : "enum:status"
    "work_instructions" o|--|| "users" : "createdBy"
    "work_instructions" o|--|| "users" : "updatedBy"
    "work_instructions" o|--|o "users" : "approvedBy"
    "work_instructions" o{--}o "work_instruction_steps" : ""
    "work_instruction_steps" o|--|| "work_instructions" : "workInstruction"
    "work_instruction_executions" o|--|| "WorkInstructionExecutionStatus" : "enum:status"
    "work_instruction_executions" o|--|| "users" : "operator"
    "work_instruction_executions" o{--}o "work_instruction_step_executions" : ""
    "work_instruction_step_executions" o|--|| "work_instruction_executions" : "execution"
    "work_instruction_step_executions" o|--|o "users" : "signedBy"
    "electronic_signatures" o|--|| "ElectronicSignatureType" : "enum:signatureType"
    "electronic_signatures" o|--|| "ElectronicSignatureLevel" : "enum:signatureLevel"
    "electronic_signatures" o|--|o "BiometricType" : "enum:biometricType"
    "electronic_signatures" o|--|| "users" : "user"
    "electronic_signatures" o|--|o "users" : "invalidatedBy"
    "fai_reports" o|--|| "FAIStatus" : "enum:status"
    "fai_reports" o{--}o "fai_characteristics" : ""
    "fai_reports" o{--}o "qif_measurement_plans" : ""
    "fai_reports" o{--}o "qif_measurement_results" : ""
    "fai_characteristics" o|--|| "fai_reports" : "faiReport"
    "audit_logs" o|--|o "users" : "user"
    "maintenance_work_orders" o|--|o "equipment" : "equipment"
    "measurement_equipment" o{--}o "inspection_records" : ""
    "measurement_equipment" o{--}o "operation_gauge_requirements" : ""
    "measurement_equipment" o{--}o "qif_measurement_results" : ""
    "inspection_records" o|--|o "serialized_parts" : "serializedPart"
    "inspection_records" o|--|o "measurement_equipment" : "measurementEquipment"
    "cnc_programs" o{--}o "program_download_logs" : ""
    "program_download_logs" o|--|o "cnc_programs" : "cncProgram"
    "operation_gauge_requirements" o|--|| "measurement_equipment" : "measurementEquipment"
    "integration_configs" o|--|| "IntegrationType" : "enum:type"
    "integration_configs" o{--}o "integration_logs" : ""
    "integration_configs" o{--}o "production_schedule_requests" : ""
    "integration_configs" o{--}o "production_performance_actuals" : ""
    "integration_configs" o{--}o "erp_material_transactions" : ""
    "integration_configs" o{--}o "personnel_info_exchanges" : ""
    "integration_logs" o|--|| "IntegrationDirection" : "enum:direction"
    "integration_logs" o|--|| "IntegrationLogStatus" : "enum:status"
    "integration_logs" o|--|| "integration_configs" : "config"
    "production_schedule_requests" o|--|| "ScheduleType" : "enum:scheduleType"
    "production_schedule_requests" o|--|| "SchedulePriority" : "enum:priority"
    "production_schedule_requests" o|--|| "B2MMessageStatus" : "enum:status"
    "production_schedule_requests" o|--|| "integration_configs" : "config"
    "production_schedule_requests" o|--|o "work_orders" : "workOrder"
    "production_schedule_requests" o|--|o "parts" : "part"
    "production_schedule_requests" o|--|o "equipment" : "workCenter"
    "production_schedule_requests" o{--}o "production_schedule_responses" : ""
    "production_schedule_responses" o|--|| "production_schedule_requests" : "request"
    "production_performance_actuals" o|--|| "B2MMessageStatus" : "enum:status"
    "production_performance_actuals" o|--|| "integration_configs" : "config"
    "production_performance_actuals" o|--|| "work_orders" : "workOrder"
    "erp_material_transactions" o|--|| "ERPTransactionType" : "enum:transactionType"
    "erp_material_transactions" o|--|| "IntegrationDirection" : "enum:direction"
    "erp_material_transactions" o|--|| "B2MMessageStatus" : "enum:status"
    "erp_material_transactions" o|--|| "integration_configs" : "config"
    "erp_material_transactions" o|--|o "parts" : "part"
    "erp_material_transactions" o|--|o "work_orders" : "workOrder"
    "personnel_info_exchanges" o|--|| "PersonnelActionType" : "enum:actionType"
    "personnel_info_exchanges" o|--|| "IntegrationDirection" : "enum:direction"
    "personnel_info_exchanges" o|--|| "B2MMessageStatus" : "enum:status"
    "personnel_info_exchanges" o|--|| "integration_configs" : "config"
    "equipment_data_collections" o|--|| "DataCollectionType" : "enum:dataCollectionType"
    "equipment_data_collections" o|--|| "equipment" : "equipment"
    "equipment_data_collections" o|--|o "work_orders" : "workOrder"
    "equipment_commands" o|--|| "CommandType" : "enum:commandType"
    "equipment_commands" o|--|| "CommandStatus" : "enum:commandStatus"
    "equipment_commands" o|--|| "equipment" : "equipment"
    "equipment_commands" o|--|o "work_orders" : "workOrder"
    "equipment_material_movements" o|--|| "equipment" : "equipment"
    "equipment_material_movements" o|--|o "parts" : "part"
    "equipment_material_movements" o|--|o "work_orders" : "workOrder"
    "process_data_collections" o|--|| "equipment" : "equipment"
    "process_data_collections" o|--|o "work_orders" : "workOrder"
    "qif_measurement_plans" o|--|o "work_orders" : "workOrder"
    "qif_measurement_plans" o|--|o "fai_reports" : "faiReport"
    "qif_measurement_plans" o{--}o "qif_characteristics" : ""
    "qif_measurement_plans" o{--}o "qif_measurement_results" : ""
    "qif_characteristics" o|--|| "qif_measurement_plans" : "qifMeasurementPlan"
    "qif_characteristics" o{--}o "qif_measurements" : ""
    "qif_measurement_results" o|--|o "qif_measurement_plans" : "qifMeasurementPlan"
    "qif_measurement_results" o|--|o "work_orders" : "workOrder"
    "qif_measurement_results" o|--|o "serialized_parts" : "serializedPart"
    "qif_measurement_results" o|--|o "fai_reports" : "faiReport"
    "qif_measurement_results" o|--|o "measurement_equipment" : "measurementDevice"
    "qif_measurement_results" o{--}o "qif_measurements" : ""
    "qif_measurements" o|--|| "qif_measurement_results" : "qifMeasurementResult"
    "qif_measurements" o|--|o "qif_characteristics" : "qifCharacteristic"
    "spc_configurations" o|--|| "operation_parameters" : "parameter"
    "spc_configurations" o|--|| "SPCChartType" : "enum:chartType"
    "spc_configurations" o|--|| "LimitCalculationMethod" : "enum:limitsBasedOn"
    "spc_configurations" o{--}o "spc_rule_violations" : ""
    "spc_rule_violations" o|--|| "spc_configurations" : "configuration"
    "sampling_plans" o|--|| "SamplingPlanType" : "enum:planType"
    "sampling_plans" o|--|o "operation_parameters" : "parameter"
    "sampling_plans" o|--|o "operations" : "operation"
    "sampling_plans" o{--}o "sampling_inspection_results" : ""
    "sampling_inspection_results" o|--|| "sampling_plans" : "plan"
```
