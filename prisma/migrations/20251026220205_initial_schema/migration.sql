-- CreateEnum
CREATE TYPE "QualificationType" AS ENUM ('CERTIFICATION', 'LICENSE', 'TRAINING', 'SKILL');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED', 'PENDING');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('MACHINING', 'WELDING', 'INSPECTION', 'ASSEMBLY', 'PROGRAMMING', 'MAINTENANCE', 'QUALITY', 'SAFETY', 'MANAGEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CompetencyLevel" AS ENUM ('NOVICE', 'ADVANCED_BEGINNER', 'COMPETENT', 'PROFICIENT', 'EXPERT');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('AVAILABLE', 'VACATION', 'SICK_LEAVE', 'TRAINING', 'MEETING', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('RAW_MATERIAL', 'COMPONENT', 'SUBASSEMBLY', 'ASSEMBLY', 'FINISHED_GOODS', 'WIP', 'CONSUMABLE', 'PACKAGING', 'TOOLING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "MaterialPropertyType" AS ENUM ('PHYSICAL', 'CHEMICAL', 'MECHANICAL', 'THERMAL', 'ELECTRICAL', 'OPTICAL', 'REGULATORY', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialLotStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_USE', 'DEPLETED', 'QUARANTINED', 'EXPIRED', 'REJECTED', 'RETURNED', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "MaterialLotState" AS ENUM ('RECEIVED', 'INSPECTED', 'APPROVED', 'ISSUED', 'IN_PROCESS', 'CONSUMED', 'RETURNED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "QualityLotStatus" AS ENUM ('PENDING', 'IN_INSPECTION', 'APPROVED', 'REJECTED', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "SublotOperationType" AS ENUM ('SPLIT', 'MERGE', 'TRANSFER', 'REWORK');

-- CreateEnum
CREATE TYPE "GenealogyRelationType" AS ENUM ('CONSUMED_BY', 'PRODUCED_FROM', 'REWORKED_TO', 'BLENDED_WITH', 'SPLIT_FROM', 'MERGED_INTO', 'TRANSFERRED_TO');

-- CreateEnum
CREATE TYPE "StateTransitionType" AS ENUM ('MANUAL', 'AUTOMATIC', 'SYSTEM', 'SCHEDULED', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('PRODUCTION', 'QUALITY', 'MATERIAL_HANDLING', 'MAINTENANCE', 'SETUP', 'CLEANING', 'PACKAGING', 'TESTING', 'REWORK', 'OTHER');

-- CreateEnum
CREATE TYPE "OperationClassification" AS ENUM ('MAKE', 'ASSEMBLY', 'INSPECTION', 'TEST', 'REWORK', 'SETUP', 'SUBCONTRACT', 'PACKING');

-- CreateEnum
CREATE TYPE "ParameterType" AS ENUM ('INPUT', 'OUTPUT', 'SET_POINT', 'MEASURED', 'CALCULATED');

-- CreateEnum
CREATE TYPE "ParameterDataType" AS ENUM ('NUMBER', 'STRING', 'BOOLEAN', 'ENUM', 'DATE', 'JSON');

-- CreateEnum
CREATE TYPE "ParameterGroupType" AS ENUM ('PROCESS', 'QUALITY', 'MATERIAL', 'EQUIPMENT', 'ENVIRONMENTAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FormulaLanguage" AS ENUM ('JAVASCRIPT', 'PYTHON', 'SQL');

-- CreateEnum
CREATE TYPE "EvaluationTrigger" AS ENUM ('ON_CHANGE', 'SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('MUST_COMPLETE', 'MUST_START', 'OVERLAP_ALLOWED', 'PARALLEL');

-- CreateEnum
CREATE TYPE "DependencyTimingType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH');

-- CreateEnum
CREATE TYPE "ConsumptionType" AS ENUM ('PER_UNIT', 'PER_BATCH', 'FIXED', 'SETUP');

-- CreateEnum
CREATE TYPE "PhysicalAssetType" AS ENUM ('TOOLING', 'FIXTURE', 'GAUGE', 'CONSUMABLE', 'PPE', 'MOLD', 'PATTERN', 'SOFTWARE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('MADE_TO_STOCK', 'MADE_TO_ORDER', 'ENGINEER_TO_ORDER', 'CONFIGURE_TO_ORDER', 'ASSEMBLE_TO_ORDER');

-- CreateEnum
CREATE TYPE "ProductLifecycleState" AS ENUM ('DESIGN', 'PROTOTYPE', 'PILOT_PRODUCTION', 'PRODUCTION', 'MATURE', 'PHASE_OUT', 'OBSOLETE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConfigurationType" AS ENUM ('STANDARD', 'VARIANT', 'CUSTOM', 'CONFIGURABLE');

-- CreateEnum
CREATE TYPE "SpecificationType" AS ENUM ('PHYSICAL', 'CHEMICAL', 'MECHANICAL', 'ELECTRICAL', 'PERFORMANCE', 'REGULATORY', 'ENVIRONMENTAL', 'SAFETY', 'QUALITY', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkOrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('CREATED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "RoutingLifecycleState" AS ENUM ('DRAFT', 'REVIEW', 'RELEASED', 'PRODUCTION', 'OBSOLETE');

-- CreateEnum
CREATE TYPE "RoutingType" AS ENUM ('PRIMARY', 'ALTERNATE', 'REWORK', 'PROTOTYPE', 'ENGINEERING');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('PROCESS', 'INSPECTION', 'DECISION', 'PARALLEL_SPLIT', 'PARALLEL_JOIN', 'OSP', 'LOT_SPLIT', 'LOT_MERGE', 'TELESCOPING', 'START', 'END');

-- CreateEnum
CREATE TYPE "ControlType" AS ENUM ('LOT_CONTROLLED', 'SERIAL_CONTROLLED', 'MIXED');

-- CreateEnum
CREATE TYPE "WorkOrderOperationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ScheduleState" AS ENUM ('FORECAST', 'RELEASED', 'DISPATCHED', 'RUNNING', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SchedulePriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "ConstraintType" AS ENUM ('CAPACITY', 'MATERIAL', 'PERSONNEL', 'EQUIPMENT', 'DATE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WorkPerformanceType" AS ENUM ('LABOR', 'MATERIAL', 'EQUIPMENT', 'QUALITY', 'SETUP', 'DOWNTIME');

-- CreateEnum
CREATE TYPE "VarianceType" AS ENUM ('QUANTITY', 'TIME', 'COST', 'EFFICIENCY', 'YIELD', 'MATERIAL');

-- CreateEnum
CREATE TYPE "QualityToleranceType" AS ENUM ('BILATERAL', 'UNILATERAL_PLUS', 'UNILATERAL_MINUS', 'NOMINAL');

-- CreateEnum
CREATE TYPE "QualityInspectionStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QualityInspectionResult" AS ENUM ('PASS', 'FAIL', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "NCRSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NCRStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'CORRECTIVE_ACTION', 'CLOSED');

-- CreateEnum
CREATE TYPE "EquipmentClass" AS ENUM ('PRODUCTION', 'MAINTENANCE', 'QUALITY', 'MATERIAL_HANDLING', 'LABORATORY', 'STORAGE', 'ASSEMBLY');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'OPERATIONAL', 'MAINTENANCE', 'DOWN', 'RETIRED');

-- CreateEnum
CREATE TYPE "EquipmentState" AS ENUM ('IDLE', 'RUNNING', 'BLOCKED', 'STARVED', 'FAULT', 'MAINTENANCE', 'SETUP', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "EquipmentLogType" AS ENUM ('MAINTENANCE', 'REPAIR', 'CALIBRATION', 'STATUS_CHANGE', 'USAGE');

-- CreateEnum
CREATE TYPE "PerformancePeriodType" AS ENUM ('HOUR', 'SHIFT', 'DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR');

-- CreateEnum
CREATE TYPE "MaterialTransactionType" AS ENUM ('RECEIPT', 'ISSUE', 'RETURN', 'ADJUSTMENT', 'SCRAP');

-- CreateEnum
CREATE TYPE "WorkInstructionStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkInstructionExecutionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ElectronicSignatureType" AS ENUM ('BASIC', 'ADVANCED', 'QUALIFIED');

-- CreateEnum
CREATE TYPE "ElectronicSignatureLevel" AS ENUM ('OPERATOR', 'SUPERVISOR', 'QUALITY', 'ENGINEER', 'MANAGER');

-- CreateEnum
CREATE TYPE "BiometricType" AS ENUM ('FINGERPRINT', 'FACIAL', 'IRIS', 'VOICE', 'NONE');

-- CreateEnum
CREATE TYPE "FAIStatus" AS ENUM ('IN_PROGRESS', 'REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('ERP', 'PLM', 'CMMS', 'WMS', 'QMS', 'HISTORIAN', 'DNC', 'SFC', 'SKILLS', 'CALIBRATION', 'PDM', 'CMM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IntegrationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "IntegrationLogStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'PARTIAL', 'TIMEOUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('MASTER', 'DETAILED', 'DISPATCH');

-- CreateEnum
CREATE TYPE "B2MMessageStatus" AS ENUM ('PENDING', 'VALIDATED', 'PROCESSING', 'PROCESSED', 'SENT', 'CONFIRMED', 'ACCEPTED', 'FAILED', 'REJECTED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "ERPTransactionType" AS ENUM ('ISSUE', 'RECEIPT', 'RETURN', 'TRANSFER', 'ADJUSTMENT', 'SCRAP', 'CONSUMPTION');

-- CreateEnum
CREATE TYPE "PersonnelActionType" AS ENUM ('CREATE', 'UPDATE', 'DEACTIVATE', 'SKILL_UPDATE', 'SCHEDULE_UPDATE');

-- CreateEnum
CREATE TYPE "DataCollectionType" AS ENUM ('SENSOR', 'ALARM', 'EVENT', 'MEASUREMENT', 'STATUS', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('START', 'STOP', 'PAUSE', 'RESUME', 'RESET', 'CONFIGURE', 'LOAD_PROGRAM', 'UNLOAD_PROGRAM', 'DIAGNOSTIC', 'CALIBRATE', 'EMERGENCY_STOP');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'EXECUTING', 'COMPLETED', 'FAILED', 'TIMEOUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SPCChartType" AS ENUM ('X_BAR_R', 'X_BAR_S', 'I_MR', 'P_CHART', 'NP_CHART', 'C_CHART', 'U_CHART', 'EWMA', 'CUSUM');

-- CreateEnum
CREATE TYPE "LimitCalculationMethod" AS ENUM ('HISTORICAL_DATA', 'SPEC_LIMITS', 'MANUAL');

-- CreateEnum
CREATE TYPE "SamplingPlanType" AS ENUM ('SINGLE', 'DOUBLE', 'MULTIPLE', 'SEQUENTIAL');

-- CreateTable
CREATE TABLE "enterprises" (
    "id" TEXT NOT NULL,
    "enterpriseCode" TEXT NOT NULL,
    "enterpriseName" TEXT NOT NULL,
    "description" TEXT,
    "headquarters" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "location" TEXT,
    "enterpriseId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "areaCode" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "description" TEXT,
    "siteId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roles" TEXT[],
    "permissions" TEXT[],
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employeeNumber" TEXT,
    "personnelClassId" TEXT,
    "hireDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "phone" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "department" TEXT,
    "supervisorId" TEXT,
    "costCenter" TEXT,
    "laborRate" DOUBLE PRECISION,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_classes" (
    "id" TEXT NOT NULL,
    "classCode" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL,
    "parentClassId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_qualifications" (
    "id" TEXT NOT NULL,
    "qualificationCode" TEXT NOT NULL,
    "qualificationName" TEXT NOT NULL,
    "description" TEXT,
    "qualificationType" "QualificationType" NOT NULL,
    "issuingOrganization" TEXT,
    "validityPeriodMonths" INTEGER,
    "requiresRenewal" BOOLEAN NOT NULL DEFAULT false,
    "personnelClassId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_certifications" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "certificationNumber" TEXT,
    "issuedDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "status" "CertificationStatus" NOT NULL DEFAULT 'ACTIVE',
    "attachmentUrls" TEXT[],
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_skills" (
    "id" TEXT NOT NULL,
    "skillCode" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "description" TEXT,
    "skillCategory" "SkillCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_skill_assignments" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "competencyLevel" "CompetencyLevel" NOT NULL,
    "assessedBy" TEXT,
    "assessedAt" TIMESTAMP(3),
    "lastUsedDate" TIMESTAMP(3),
    "certifiedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_skill_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_work_center_assignments" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "certifiedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_work_center_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_availability" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "availabilityType" "AvailabilityType" NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "shiftCode" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "reason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_classes" (
    "id" TEXT NOT NULL,
    "classCode" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL,
    "parentClassId" TEXT,
    "requiresLotTracking" BOOLEAN NOT NULL DEFAULT true,
    "requiresSerialTracking" BOOLEAN NOT NULL DEFAULT false,
    "requiresExpirationDate" BOOLEAN NOT NULL DEFAULT false,
    "shelfLifeDays" INTEGER,
    "storageRequirements" TEXT,
    "handlingInstructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_definitions" (
    "id" TEXT NOT NULL,
    "materialNumber" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "description" TEXT,
    "materialClassId" TEXT NOT NULL,
    "baseUnitOfMeasure" TEXT NOT NULL,
    "alternateUnitOfMeasure" TEXT,
    "conversionFactor" DOUBLE PRECISION,
    "materialType" "MaterialType" NOT NULL,
    "materialGrade" TEXT,
    "specification" TEXT,
    "minimumStock" DOUBLE PRECISION,
    "reorderPoint" DOUBLE PRECISION,
    "reorderQuantity" DOUBLE PRECISION,
    "leadTimeDays" INTEGER,
    "requiresLotTracking" BOOLEAN NOT NULL DEFAULT true,
    "lotNumberFormat" TEXT,
    "defaultShelfLifeDays" INTEGER,
    "standardCost" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "requiresInspection" BOOLEAN NOT NULL DEFAULT false,
    "inspectionFrequency" TEXT,
    "primarySupplierId" TEXT,
    "supplierPartNumber" TEXT,
    "drawingNumber" TEXT,
    "revision" TEXT,
    "msdsUrl" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPhantom" BOOLEAN NOT NULL DEFAULT false,
    "isObsolete" BOOLEAN NOT NULL DEFAULT false,
    "obsoleteDate" TIMESTAMP(3),
    "replacementMaterialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_properties" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
    "propertyType" "MaterialPropertyType" NOT NULL,
    "propertyValue" TEXT NOT NULL,
    "propertyUnit" TEXT,
    "testMethod" TEXT,
    "nominalValue" DOUBLE PRECISION,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_lots" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "supplierLotNumber" TEXT,
    "purchaseOrderNumber" TEXT,
    "heatNumber" TEXT,
    "serialNumber" TEXT,
    "originalQuantity" DOUBLE PRECISION NOT NULL,
    "currentQuantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "location" TEXT,
    "warehouseId" TEXT,
    "manufactureDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "shelfLifeDays" INTEGER,
    "firstUsedDate" TIMESTAMP(3),
    "lastUsedDate" TIMESTAMP(3),
    "status" "MaterialLotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "state" "MaterialLotState" NOT NULL DEFAULT 'RECEIVED',
    "isQuarantined" BOOLEAN NOT NULL DEFAULT false,
    "quarantineReason" TEXT,
    "quarantinedAt" TIMESTAMP(3),
    "qualityStatus" "QualityLotStatus" NOT NULL DEFAULT 'PENDING',
    "inspectionId" TEXT,
    "certificationUrls" TEXT[],
    "supplierId" TEXT,
    "supplierName" TEXT,
    "manufacturerId" TEXT,
    "manufacturerName" TEXT,
    "countryOfOrigin" TEXT,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "parentLotId" TEXT,
    "isSplit" BOOLEAN NOT NULL DEFAULT false,
    "isMerged" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "customAttributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_sublots" (
    "id" TEXT NOT NULL,
    "sublotNumber" TEXT NOT NULL,
    "parentLotId" TEXT NOT NULL,
    "operationType" "SublotOperationType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "reservedFor" TEXT,
    "location" TEXT,
    "status" "MaterialLotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "splitReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_sublots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_lot_genealogy" (
    "id" TEXT NOT NULL,
    "parentLotId" TEXT NOT NULL,
    "childLotId" TEXT NOT NULL,
    "relationshipType" "GenealogyRelationType" NOT NULL,
    "quantityConsumed" DOUBLE PRECISION NOT NULL,
    "quantityProduced" DOUBLE PRECISION,
    "unitOfMeasure" TEXT NOT NULL,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "processDate" TIMESTAMP(3) NOT NULL,
    "operatorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_lot_genealogy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_state_history" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "previousState" "MaterialLotState",
    "newState" "MaterialLotState" NOT NULL,
    "previousStatus" "MaterialLotStatus",
    "newStatus" "MaterialLotStatus",
    "reason" TEXT,
    "transitionType" "StateTransitionType" NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unitOfMeasure" TEXT,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "inspectionId" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "qualityNotes" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "siteId" TEXT,
    "isStandardOperation" BOOLEAN NOT NULL DEFAULT false,
    "operationCode" TEXT NOT NULL,
    "operationName" TEXT NOT NULL,
    "operationClassification" "OperationClassification",
    "standardWorkInstructionId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "parentOperationId" TEXT,
    "operationType" "OperationType" NOT NULL,
    "category" TEXT,
    "duration" INTEGER,
    "setupTime" INTEGER,
    "teardownTime" INTEGER,
    "minCycleTime" INTEGER,
    "maxCycleTime" INTEGER,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_parameters" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "parameterType" "ParameterType" NOT NULL,
    "dataType" "ParameterDataType" NOT NULL,
    "defaultValue" TEXT,
    "unitOfMeasure" TEXT,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "allowedValues" TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "requiresVerification" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parameterGroupId" TEXT,

    CONSTRAINT "operation_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_limits" (
    "id" TEXT NOT NULL,
    "parameterId" TEXT NOT NULL,
    "engineeringMin" DOUBLE PRECISION,
    "engineeringMax" DOUBLE PRECISION,
    "operatingMin" DOUBLE PRECISION,
    "operatingMax" DOUBLE PRECISION,
    "LSL" DOUBLE PRECISION,
    "USL" DOUBLE PRECISION,
    "nominalValue" DOUBLE PRECISION,
    "highHighAlarm" DOUBLE PRECISION,
    "highAlarm" DOUBLE PRECISION,
    "lowAlarm" DOUBLE PRECISION,
    "lowLowAlarm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parameter_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_groups" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "parentGroupId" TEXT,
    "groupType" "ParameterGroupType" NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "displayOrder" INTEGER,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parameter_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_formulas" (
    "id" TEXT NOT NULL,
    "formulaName" TEXT NOT NULL,
    "outputParameterId" TEXT NOT NULL,
    "formulaExpression" TEXT NOT NULL,
    "formulaLanguage" "FormulaLanguage" NOT NULL DEFAULT 'JAVASCRIPT',
    "inputParameterIds" TEXT[],
    "evaluationTrigger" "EvaluationTrigger" NOT NULL DEFAULT 'ON_CHANGE',
    "evaluationSchedule" TEXT,
    "testCases" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT,

    CONSTRAINT "parameter_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_dependencies" (
    "id" TEXT NOT NULL,
    "dependentOperationId" TEXT NOT NULL,
    "prerequisiteOperationId" TEXT NOT NULL,
    "dependencyType" "DependencyType" NOT NULL,
    "timingType" "DependencyTimingType" NOT NULL,
    "lagTime" INTEGER,
    "leadTime" INTEGER,
    "condition" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_operation_specifications" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "personnelClassId" TEXT,
    "skillId" TEXT,
    "minimumCompetency" "CompetencyLevel",
    "requiredCertifications" TEXT[],
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "roleName" TEXT,
    "roleDescription" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_operation_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_operation_specifications" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "equipmentClass" "EquipmentClass",
    "equipmentType" TEXT,
    "specificEquipmentId" TEXT,
    "requiredCapabilities" TEXT[],
    "minimumCapacity" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "setupRequired" BOOLEAN NOT NULL DEFAULT false,
    "setupTime" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_operation_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_operation_specifications" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "materialDefinitionId" TEXT,
    "materialClassId" TEXT,
    "materialType" "MaterialType",
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "consumptionType" "ConsumptionType" NOT NULL,
    "requiredProperties" TEXT[],
    "qualityRequirements" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "allowSubstitutes" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_operation_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_asset_operation_specifications" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "assetType" "PhysicalAssetType" NOT NULL,
    "assetCode" TEXT,
    "assetName" TEXT NOT NULL,
    "specifications" JSONB,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "requiresCalibration" BOOLEAN NOT NULL DEFAULT false,
    "calibrationInterval" INTEGER,
    "estimatedLifeCycles" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_asset_operation_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "description" TEXT,
    "partType" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL DEFAULT 'MADE_TO_STOCK',
    "lifecycleState" "ProductLifecycleState" NOT NULL DEFAULT 'PRODUCTION',
    "unitOfMeasure" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "weightUnit" TEXT,
    "drawingNumber" TEXT,
    "revision" TEXT,
    "cadModelUrl" TEXT,
    "releaseDate" TIMESTAMP(3),
    "obsoleteDate" TIMESTAMP(3),
    "replacementPartId" TEXT,
    "makeOrBuy" TEXT DEFAULT 'MAKE',
    "leadTimeDays" INTEGER,
    "lotSizeMin" INTEGER,
    "lotSizeMultiple" INTEGER,
    "standardCost" DOUBLE PRECISION,
    "targetCost" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isConfigurable" BOOLEAN NOT NULL DEFAULT false,
    "requiresFAI" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_site_availability" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "leadTimeDays" INTEGER,
    "minimumLotSize" INTEGER,
    "maximumLotSize" INTEGER,
    "standardCost" DOUBLE PRECISION,
    "setupCost" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_site_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_items" (
    "id" TEXT NOT NULL,
    "parentPartId" TEXT NOT NULL,
    "componentPartId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "scrapFactor" DOUBLE PRECISION DEFAULT 0,
    "sequence" INTEGER,
    "findNumber" TEXT,
    "referenceDesignator" TEXT,
    "operationId" TEXT,
    "operationNumber" INTEGER,
    "effectiveDate" TIMESTAMP(3),
    "obsoleteDate" TIMESTAMP(3),
    "ecoNumber" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bom_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_specifications" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "specificationName" TEXT NOT NULL,
    "specificationType" "SpecificationType" NOT NULL,
    "specificationValue" TEXT,
    "nominalValue" DOUBLE PRECISION,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "unitOfMeasure" TEXT,
    "testMethod" TEXT,
    "inspectionFrequency" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "isRegulatory" BOOLEAN NOT NULL DEFAULT false,
    "documentReferences" TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_configurations" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "configurationName" TEXT NOT NULL,
    "configurationType" "ConfigurationType" NOT NULL,
    "description" TEXT,
    "configurationCode" TEXT,
    "attributes" JSONB,
    "priceModifier" DOUBLE PRECISION DEFAULT 0,
    "costModifier" DOUBLE PRECISION DEFAULT 0,
    "leadTimeDelta" INTEGER DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3),
    "obsoleteDate" TIMESTAMP(3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "marketingName" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuration_options" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "optionCode" TEXT,
    "description" TEXT,
    "optionCategory" TEXT,
    "optionValue" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "addedPartIds" TEXT[],
    "removedPartIds" TEXT[],
    "priceModifier" DOUBLE PRECISION DEFAULT 0,
    "costModifier" DOUBLE PRECISION DEFAULT 0,
    "displayOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuration_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_lifecycle" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "previousState" "ProductLifecycleState",
    "newState" "ProductLifecycleState" NOT NULL,
    "transitionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "ecoNumber" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notificationsSent" BOOLEAN NOT NULL DEFAULT false,
    "impactAssessment" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_lifecycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "workOrderNumber" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "partNumber" TEXT,
    "quantity" INTEGER NOT NULL,
    "quantityCompleted" INTEGER NOT NULL DEFAULT 0,
    "quantityScrapped" INTEGER NOT NULL DEFAULT 0,
    "priority" "WorkOrderPriority" NOT NULL,
    "status" "WorkOrderStatus" NOT NULL,
    "dueDate" TIMESTAMP(3),
    "customerOrder" TEXT,
    "routingId" TEXT,
    "siteId" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "startedAt" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routings" (
    "id" TEXT NOT NULL,
    "routingNumber" TEXT NOT NULL,
    "partId" TEXT,
    "siteId" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "lifecycleState" "RoutingLifecycleState" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "isPrimaryRoute" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "routingType" "RoutingType" NOT NULL DEFAULT 'PRIMARY',
    "alternateForId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "visualData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "routings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_operations" (
    "id" TEXT NOT NULL,
    "routingId" TEXT NOT NULL,
    "operationNumber" INTEGER NOT NULL,
    "operationName" TEXT NOT NULL,
    "description" TEXT,
    "setupTime" DOUBLE PRECISION,
    "cycleTime" DOUBLE PRECISION,
    "workCenterId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_steps" (
    "id" TEXT NOT NULL,
    "routingId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "operationId" TEXT NOT NULL,
    "workCenterId" TEXT,
    "stepType" "StepType" NOT NULL DEFAULT 'PROCESS',
    "controlType" "ControlType",
    "setupTimeOverride" INTEGER,
    "cycleTimeOverride" INTEGER,
    "teardownTimeOverride" INTEGER,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isQualityInspection" BOOLEAN NOT NULL DEFAULT false,
    "isCriticalPath" BOOLEAN NOT NULL DEFAULT false,
    "workInstructionId" TEXT,
    "stepInstructions" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_step_dependencies" (
    "id" TEXT NOT NULL,
    "dependentStepId" TEXT NOT NULL,
    "prerequisiteStepId" TEXT NOT NULL,
    "dependencyType" "DependencyType" NOT NULL,
    "timingType" "DependencyTimingType" NOT NULL,
    "lagTime" INTEGER,
    "leadTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_step_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_step_parameters" (
    "id" TEXT NOT NULL,
    "routingStepId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "parameterValue" TEXT NOT NULL,
    "unitOfMeasure" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_step_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "visualData" JSONB,
    "sourceRoutingId" TEXT,
    "createdById" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" DOUBLE PRECISION,
    "areaId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_units" (
    "id" TEXT NOT NULL,
    "workUnitCode" TEXT NOT NULL,
    "workUnitName" TEXT NOT NULL,
    "description" TEXT,
    "workCenterId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_operations" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "routingOperationId" TEXT NOT NULL,
    "status" "WorkOrderOperationStatus" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityCompleted" INTEGER NOT NULL DEFAULT 0,
    "quantityScrap" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "routingStepId" TEXT,

    CONSTRAINT "work_order_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_schedules" (
    "id" TEXT NOT NULL,
    "scheduleNumber" TEXT NOT NULL,
    "scheduleName" TEXT NOT NULL,
    "description" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "siteId" TEXT,
    "areaId" TEXT,
    "state" "ScheduleState" NOT NULL DEFAULT 'FORECAST',
    "stateChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stateChangedBy" TEXT,
    "priority" "SchedulePriority" NOT NULL DEFAULT 'NORMAL',
    "plannedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "dispatchedCount" INTEGER NOT NULL DEFAULT 0,
    "totalEntries" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isFeasible" BOOLEAN NOT NULL DEFAULT true,
    "feasibilityNotes" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_entries" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "entryNumber" INTEGER NOT NULL,
    "partId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "description" TEXT,
    "plannedQuantity" DOUBLE PRECISION NOT NULL,
    "dispatchedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "plannedStartDate" TIMESTAMP(3) NOT NULL,
    "plannedEndDate" TIMESTAMP(3) NOT NULL,
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "priority" "SchedulePriority" NOT NULL DEFAULT 'NORMAL',
    "sequenceNumber" INTEGER,
    "estimatedDuration" INTEGER,
    "workCenterId" TEXT,
    "routingId" TEXT,
    "customerOrder" TEXT,
    "customerDueDate" TIMESTAMP(3),
    "salesOrder" TEXT,
    "isDispatched" BOOLEAN NOT NULL DEFAULT false,
    "dispatchedAt" TIMESTAMP(3),
    "dispatchedBy" TEXT,
    "workOrderId" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_constraints" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "constraintType" "ConstraintType" NOT NULL,
    "constraintName" TEXT NOT NULL,
    "description" TEXT,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "requiredQuantity" DOUBLE PRECISION,
    "availableQuantity" DOUBLE PRECISION,
    "unitOfMeasure" TEXT,
    "constraintDate" TIMESTAMP(3),
    "leadTimeDays" INTEGER,
    "isViolated" BOOLEAN NOT NULL DEFAULT false,
    "violationSeverity" TEXT,
    "violationMessage" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_constraints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_state_history" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "previousState" "ScheduleState",
    "newState" "ScheduleState" NOT NULL,
    "transitionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "changedBy" TEXT,
    "entriesAffected" INTEGER,
    "notificationsSent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_status_history" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "previousStatus" "WorkOrderStatus",
    "newStatus" "WorkOrderStatus" NOT NULL,
    "transitionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "changedBy" TEXT,
    "notes" TEXT,
    "quantityAtTransition" INTEGER,
    "scrapAtTransition" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_logs" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedBy" TEXT,
    "dispatchedFrom" TEXT,
    "assignedToId" TEXT,
    "workCenterId" TEXT,
    "priorityOverride" "WorkOrderPriority",
    "expectedStartDate" TIMESTAMP(3),
    "expectedEndDate" TIMESTAMP(3),
    "quantityDispatched" INTEGER NOT NULL,
    "materialReserved" BOOLEAN NOT NULL DEFAULT false,
    "toolingReserved" BOOLEAN NOT NULL DEFAULT false,
    "dispatchNotes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_performance" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "operationId" TEXT,
    "performanceType" "WorkPerformanceType" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,
    "personnelId" TEXT,
    "laborHours" DOUBLE PRECISION,
    "laborCost" DOUBLE PRECISION,
    "laborEfficiency" DOUBLE PRECISION,
    "partId" TEXT,
    "quantityConsumed" DOUBLE PRECISION,
    "quantityPlanned" DOUBLE PRECISION,
    "materialVariance" DOUBLE PRECISION,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "equipmentId" TEXT,
    "setupTime" DOUBLE PRECISION,
    "runTime" DOUBLE PRECISION,
    "plannedSetupTime" DOUBLE PRECISION,
    "plannedRunTime" DOUBLE PRECISION,
    "quantityProduced" INTEGER,
    "quantityGood" INTEGER,
    "quantityScrap" INTEGER,
    "quantityRework" INTEGER,
    "yieldPercentage" DOUBLE PRECISION,
    "scrapReason" TEXT,
    "downtimeMinutes" DOUBLE PRECISION,
    "downtimeReason" TEXT,
    "downtimeCategory" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_variances" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "operationId" TEXT,
    "varianceType" "VarianceType" NOT NULL,
    "varianceName" TEXT NOT NULL,
    "plannedValue" DOUBLE PRECISION NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "variancePercent" DOUBLE PRECISION NOT NULL,
    "isFavorable" BOOLEAN NOT NULL DEFAULT false,
    "costImpact" DOUBLE PRECISION,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "responsibleParty" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_variances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_plans" (
    "id" TEXT NOT NULL,
    "planNumber" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "operation" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_characteristics" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "characteristic" TEXT NOT NULL,
    "specification" TEXT NOT NULL,
    "toleranceType" "QualityToleranceType" NOT NULL,
    "nominalValue" DOUBLE PRECISION,
    "upperLimit" DOUBLE PRECISION,
    "lowerLimit" DOUBLE PRECISION,
    "unitOfMeasure" TEXT,
    "inspectionMethod" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_characteristics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_inspections" (
    "id" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "status" "QualityInspectionStatus" NOT NULL,
    "result" "QualityInspectionResult",
    "quantity" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_measurements" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "characteristicId" TEXT NOT NULL,
    "measuredValue" DOUBLE PRECISION NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ncrs" (
    "id" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "workOrderId" TEXT,
    "inspectionId" TEXT,
    "siteId" TEXT,
    "partNumber" TEXT NOT NULL,
    "operation" TEXT,
    "defectType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "NCRSeverity" NOT NULL,
    "status" "NCRStatus" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ncrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "equipmentNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "equipmentClass" "EquipmentClass" NOT NULL,
    "equipmentType" TEXT,
    "equipmentLevel" INTEGER NOT NULL DEFAULT 1,
    "parentEquipmentId" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "installDate" TIMESTAMP(3),
    "commissionDate" TIMESTAMP(3),
    "siteId" TEXT,
    "areaId" TEXT,
    "workCenterId" TEXT,
    "workUnitId" TEXT,
    "status" "EquipmentStatus" NOT NULL,
    "currentState" "EquipmentState" NOT NULL DEFAULT 'IDLE',
    "stateChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilizationRate" DOUBLE PRECISION DEFAULT 0,
    "availability" DOUBLE PRECISION DEFAULT 0,
    "performance" DOUBLE PRECISION DEFAULT 0,
    "quality" DOUBLE PRECISION DEFAULT 0,
    "oee" DOUBLE PRECISION DEFAULT 0,
    "ratedCapacity" DOUBLE PRECISION,
    "currentCapacity" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_capabilities" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "capabilityType" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "description" TEXT,
    "parameters" JSONB,
    "certifiedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_logs" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "logType" "EquipmentLogType" NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_state_history" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "previousState" "EquipmentState",
    "newState" "EquipmentState" NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "stateStartTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stateEndTime" TIMESTAMP(3),
    "duration" INTEGER,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "downtime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_performance_logs" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodType" "PerformancePeriodType" NOT NULL DEFAULT 'SHIFT',
    "plannedProductionTime" INTEGER NOT NULL,
    "operatingTime" INTEGER NOT NULL,
    "downtime" INTEGER NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "idealCycleTime" DOUBLE PRECISION,
    "actualCycleTime" DOUBLE PRECISION,
    "totalUnitsProduced" INTEGER NOT NULL,
    "targetProduction" INTEGER,
    "performance" DOUBLE PRECISION NOT NULL,
    "goodUnits" INTEGER NOT NULL,
    "rejectedUnits" INTEGER NOT NULL,
    "scrapUnits" INTEGER NOT NULL,
    "reworkUnits" INTEGER NOT NULL,
    "quality" DOUBLE PRECISION NOT NULL,
    "oee" DOUBLE PRECISION NOT NULL,
    "workOrderId" TEXT,
    "partId" TEXT,
    "operatorId" TEXT,
    "teep" DOUBLE PRECISION,
    "utilizationRate" DOUBLE PRECISION,
    "notes" TEXT,
    "hasAnomalies" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_performance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "lotNumber" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "receivedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_transactions" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "transactionType" "MaterialTransactionType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "reference" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serialized_parts" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "lotNumber" TEXT,
    "status" TEXT NOT NULL,
    "currentLocation" TEXT,
    "manufactureDate" TIMESTAMP(3),
    "shipDate" TIMESTAMP(3),
    "customerInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serialized_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_genealogy" (
    "id" TEXT NOT NULL,
    "parentPartId" TEXT NOT NULL,
    "componentPartId" TEXT NOT NULL,
    "assemblyDate" TIMESTAMP(3),
    "assemblyOperator" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_genealogy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_instructions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "partId" TEXT,
    "operationId" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" "WorkInstructionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" TIMESTAMP(3),
    "supersededDate" TIMESTAMP(3),
    "ecoNumber" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalHistory" JSONB,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "operationType" TEXT,
    "requiredForExecution" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "work_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_instruction_steps" (
    "id" TEXT NOT NULL,
    "workInstructionId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "videoUrls" TEXT[],
    "attachmentUrls" TEXT[],
    "estimatedDuration" INTEGER,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "dataEntryFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_instruction_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_instruction_executions" (
    "id" TEXT NOT NULL,
    "workInstructionId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "operationId" TEXT,
    "operatorId" TEXT NOT NULL,
    "currentStepNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkInstructionExecutionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_instruction_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_instruction_step_executions" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dataEntered" JSONB,
    "notes" TEXT,
    "signedById" TEXT,
    "signedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_instruction_step_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electronic_signatures" (
    "id" TEXT NOT NULL,
    "signatureType" "ElectronicSignatureType" NOT NULL,
    "signatureLevel" "ElectronicSignatureLevel" NOT NULL,
    "userId" TEXT NOT NULL,
    "signedEntityType" TEXT NOT NULL,
    "signedEntityId" TEXT NOT NULL,
    "signatureReason" TEXT,
    "signatureData" JSONB NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "biometricType" "BiometricType",
    "biometricTemplate" TEXT,
    "biometricScore" DOUBLE PRECISION,
    "signatureHash" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "invalidatedAt" TIMESTAMP(3),
    "invalidatedById" TEXT,
    "invalidationReason" TEXT,
    "signedDocument" JSONB,
    "certificateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electronic_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fai_reports" (
    "id" TEXT NOT NULL,
    "faiNumber" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "inspectionId" TEXT,
    "status" "FAIStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "revisionLevel" TEXT,
    "form1Data" JSONB,
    "form2Data" JSONB,
    "createdById" TEXT,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fai_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fai_characteristics" (
    "id" TEXT NOT NULL,
    "faiReportId" TEXT NOT NULL,
    "characteristicNumber" INTEGER NOT NULL,
    "characteristic" TEXT NOT NULL,
    "specification" TEXT NOT NULL,
    "requirement" TEXT,
    "toleranceType" TEXT,
    "nominalValue" DOUBLE PRECISION,
    "upperLimit" DOUBLE PRECISION,
    "lowerLimit" DOUBLE PRECISION,
    "unitOfMeasure" TEXT,
    "inspectionMethod" TEXT,
    "inspectionFrequency" TEXT,
    "measuredValues" JSONB NOT NULL,
    "actualValue" DOUBLE PRECISION,
    "deviation" DOUBLE PRECISION,
    "result" TEXT,
    "notes" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fai_characteristics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_work_orders" (
    "id" TEXT NOT NULL,
    "externalWorkOrderNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "equipmentId" TEXT,
    "scheduledStart" TIMESTAMP(3),
    "scheduledFinish" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualFinish" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 3,
    "failureCode" TEXT,
    "problemCode" TEXT,
    "causeCode" TEXT,
    "remedyCode" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_equipment" (
    "id" TEXT NOT NULL,
    "externalGaugeId" TEXT,
    "description" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "gaugeType" TEXT NOT NULL,
    "measurementType" TEXT NOT NULL,
    "measurementRange" TEXT,
    "resolution" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "location" TEXT,
    "calibrationFrequency" INTEGER,
    "lastCalibrationDate" TIMESTAMP(3),
    "nextCalibrationDate" TIMESTAMP(3),
    "calibrationStatus" TEXT NOT NULL DEFAULT 'IN_CAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "measurement_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_records" (
    "id" TEXT NOT NULL,
    "serializedPartId" TEXT,
    "measurementEquipmentId" TEXT,
    "characteristic" TEXT NOT NULL,
    "nominalValue" DOUBLE PRECISION NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "lowerTolerance" DOUBLE PRECISION NOT NULL,
    "upperTolerance" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cnc_programs" (
    "id" TEXT NOT NULL,
    "externalProgramId" TEXT,
    "programName" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "operationCode" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "revisionDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "machineType" TEXT,
    "postProcessor" TEXT,
    "toolList" TEXT,
    "setupSheetUrl" TEXT,
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "ecoNumber" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "firstPieceRequired" BOOLEAN NOT NULL DEFAULT false,
    "firstPieceApproved" BOOLEAN NOT NULL DEFAULT false,
    "firstPieceDate" TIMESTAMP(3),
    "programUrl" TEXT,
    "stepAP242Url" TEXT,
    "pmiDataUrl" TEXT,
    "teamcenterItemId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cnc_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_download_logs" (
    "id" TEXT NOT NULL,
    "programId" TEXT,
    "programName" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "operatorBadgeNumber" TEXT NOT NULL,
    "workOrderNumber" TEXT,
    "downloadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorized" BOOLEAN NOT NULL,
    "authorizationMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_download_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_load_authorizations" (
    "id" TEXT NOT NULL,
    "authorizationId" TEXT NOT NULL,
    "operatorBadgeNumber" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "programRevision" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "workOrderNumber" TEXT,
    "authorized" BOOLEAN NOT NULL,
    "authorizationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operatorAuthenticated" BOOLEAN NOT NULL,
    "workOrderValid" BOOLEAN NOT NULL,
    "certificationValid" BOOLEAN NOT NULL,
    "programVersionValid" BOOLEAN NOT NULL,
    "gaugeCalibrationValid" BOOLEAN NOT NULL,
    "failureReasons" TEXT,
    "validationDetails" JSONB,
    "supervisorNotified" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "electronicSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_load_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_gauge_requirements" (
    "id" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "operationCode" TEXT NOT NULL,
    "measurementEquipmentId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_gauge_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "lastSync" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastError" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "totalSyncs" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "syncSchedule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "direction" "IntegrationDirection" NOT NULL,
    "status" "IntegrationLogStatus" NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL,
    "requestData" JSONB,
    "responseData" JSONB,
    "errors" JSONB,
    "details" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_schedule_requests" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "scheduleType" "ScheduleType" NOT NULL,
    "priority" "SchedulePriority" NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveStartDate" TIMESTAMP(3) NOT NULL,
    "effectiveEndDate" TIMESTAMP(3) NOT NULL,
    "workOrderId" TEXT,
    "externalWorkOrderId" TEXT NOT NULL,
    "partId" TEXT,
    "partNumber" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "workCenterId" TEXT,
    "equipmentRequirements" JSONB,
    "personnelRequirements" JSONB,
    "materialRequirements" JSONB,
    "status" "B2MMessageStatus" NOT NULL,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "validationErrors" JSONB,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_schedule_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_schedule_responses" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "confirmedStartDate" TIMESTAMP(3),
    "confirmedEndDate" TIMESTAMP(3),
    "confirmedQuantity" DOUBLE PRECISION,
    "rejectionReason" TEXT,
    "modifications" JSONB,
    "constraints" JSONB,
    "proposedStartDate" TIMESTAMP(3),
    "proposedEndDate" TIMESTAMP(3),
    "proposedQuantity" DOUBLE PRECISION,
    "respondedBy" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentToERP" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "responsePayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_schedule_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_performance_actuals" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "externalWorkOrderId" TEXT NOT NULL,
    "operationId" TEXT,
    "reportingPeriodStart" TIMESTAMP(3) NOT NULL,
    "reportingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "quantityProduced" DOUBLE PRECISION NOT NULL,
    "quantityGood" DOUBLE PRECISION NOT NULL,
    "quantityScrap" DOUBLE PRECISION NOT NULL,
    "quantityRework" DOUBLE PRECISION NOT NULL,
    "yieldPercentage" DOUBLE PRECISION,
    "setupTimeActual" DOUBLE PRECISION,
    "runTimeActual" DOUBLE PRECISION,
    "downtimeActual" DOUBLE PRECISION,
    "laborHoursActual" DOUBLE PRECISION,
    "laborCostActual" DOUBLE PRECISION,
    "materialCostActual" DOUBLE PRECISION,
    "overheadCostActual" DOUBLE PRECISION,
    "totalCostActual" DOUBLE PRECISION,
    "quantityVariance" DOUBLE PRECISION,
    "timeVariance" DOUBLE PRECISION,
    "costVariance" DOUBLE PRECISION,
    "efficiencyVariance" DOUBLE PRECISION,
    "personnelActuals" JSONB,
    "equipmentActuals" JSONB,
    "materialActuals" JSONB,
    "status" "B2MMessageStatus" NOT NULL,
    "sentToERP" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "erpConfirmation" TEXT,
    "errorMessage" TEXT,
    "messagePayload" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_performance_actuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erp_material_transactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "transactionType" "ERPTransactionType" NOT NULL,
    "direction" "IntegrationDirection" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partId" TEXT,
    "externalPartId" TEXT NOT NULL,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "workOrderId" TEXT,
    "externalWorkOrderId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "movementType" TEXT NOT NULL,
    "reasonCode" TEXT,
    "status" "B2MMessageStatus" NOT NULL,
    "processedAt" TIMESTAMP(3),
    "erpTransactionId" TEXT,
    "errorMessage" TEXT,
    "messagePayload" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "erp_material_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_info_exchanges" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "personnelId" TEXT,
    "externalPersonnelId" TEXT NOT NULL,
    "actionType" "PersonnelActionType" NOT NULL,
    "direction" "IntegrationDirection" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "employeeNumber" TEXT,
    "department" TEXT,
    "jobTitle" TEXT,
    "skills" JSONB,
    "certifications" JSONB,
    "qualifications" JSONB,
    "shiftCode" TEXT,
    "workCalendar" TEXT,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "employmentStatus" TEXT,
    "lastWorkDate" TIMESTAMP(3),
    "status" "B2MMessageStatus" NOT NULL,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "messagePayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_info_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_data_collections" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "dataCollectionType" "DataCollectionType" NOT NULL,
    "collectionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPointName" TEXT NOT NULL,
    "dataPointId" TEXT,
    "numericValue" DOUBLE PRECISION,
    "stringValue" TEXT,
    "booleanValue" BOOLEAN,
    "jsonValue" JSONB,
    "unitOfMeasure" TEXT,
    "quality" TEXT,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "productionRunId" TEXT,
    "equipmentState" TEXT,
    "protocol" TEXT,
    "sourceAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_data_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_commands" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "commandType" "CommandType" NOT NULL,
    "commandStatus" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "commandName" TEXT NOT NULL,
    "commandPayload" JSONB,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "responsePayload" JSONB,
    "responseCode" TEXT,
    "responseMessage" TEXT,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 30,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "issuedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_material_movements" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "partId" TEXT,
    "partNumber" TEXT NOT NULL,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "movementType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "movementTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "qualityStatus" TEXT,
    "upstreamTraceId" TEXT,
    "downstreamTraceId" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_material_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_data_collections" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "processName" TEXT NOT NULL,
    "processStepNumber" INTEGER,
    "startTimestamp" TIMESTAMP(3) NOT NULL,
    "endTimestamp" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "workOrderId" TEXT,
    "operationId" TEXT,
    "partNumber" TEXT,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "parameters" JSONB NOT NULL,
    "quantityProduced" DOUBLE PRECISION,
    "quantityGood" DOUBLE PRECISION,
    "quantityScrap" DOUBLE PRECISION,
    "inSpecCount" INTEGER,
    "outOfSpecCount" INTEGER,
    "averageUtilization" DOUBLE PRECISION,
    "peakUtilization" DOUBLE PRECISION,
    "alarmCount" INTEGER NOT NULL DEFAULT 0,
    "criticalAlarmCount" INTEGER NOT NULL DEFAULT 0,
    "operatorId" TEXT,
    "supervisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_data_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qif_measurement_plans" (
    "id" TEXT NOT NULL,
    "qifPlanId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partRevision" TEXT NOT NULL,
    "planVersion" TEXT NOT NULL,
    "planName" TEXT,
    "description" TEXT,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "qifXmlContent" TEXT NOT NULL,
    "qifVersion" TEXT NOT NULL DEFAULT '3.0.0',
    "characteristicCount" INTEGER NOT NULL DEFAULT 0,
    "workOrderId" TEXT,
    "faiReportId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "supersededBy" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qif_measurement_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qif_characteristics" (
    "id" TEXT NOT NULL,
    "qifMeasurementPlanId" TEXT NOT NULL,
    "characteristicId" TEXT NOT NULL,
    "balloonNumber" TEXT,
    "characteristicName" TEXT,
    "description" TEXT,
    "nominalValue" DOUBLE PRECISION,
    "upperTolerance" DOUBLE PRECISION,
    "lowerTolerance" DOUBLE PRECISION,
    "toleranceType" TEXT,
    "gdtType" TEXT,
    "datumReferenceFrame" TEXT,
    "materialCondition" TEXT,
    "measurementMethod" TEXT,
    "samplingRequired" BOOLEAN NOT NULL DEFAULT false,
    "sampleSize" INTEGER,
    "sequenceNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qif_characteristics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qif_measurement_results" (
    "id" TEXT NOT NULL,
    "qifResultsId" TEXT NOT NULL,
    "qifMeasurementPlanId" TEXT,
    "partNumber" TEXT NOT NULL,
    "serialNumber" TEXT,
    "lotNumber" TEXT,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectedBy" TEXT NOT NULL,
    "inspectionType" TEXT,
    "overallStatus" TEXT NOT NULL,
    "totalMeasurements" INTEGER NOT NULL DEFAULT 0,
    "passedMeasurements" INTEGER NOT NULL DEFAULT 0,
    "failedMeasurements" INTEGER NOT NULL DEFAULT 0,
    "qifXmlContent" TEXT NOT NULL,
    "qifVersion" TEXT NOT NULL DEFAULT '3.0.0',
    "workOrderId" TEXT,
    "serializedPartId" TEXT,
    "faiReportId" TEXT,
    "measurementDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qif_measurement_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qif_measurements" (
    "id" TEXT NOT NULL,
    "qifMeasurementResultId" TEXT NOT NULL,
    "qifCharacteristicId" TEXT,
    "characteristicId" TEXT NOT NULL,
    "balloonNumber" TEXT,
    "measuredValue" DOUBLE PRECISION NOT NULL,
    "deviation" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "measurementDate" TIMESTAMP(3),
    "measuredBy" TEXT,
    "measurementDevice" TEXT,
    "uncertainty" DOUBLE PRECISION,
    "uncertaintyK" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qif_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spc_configurations" (
    "id" TEXT NOT NULL,
    "parameterId" TEXT NOT NULL,
    "chartType" "SPCChartType" NOT NULL,
    "subgroupSize" INTEGER,
    "UCL" DOUBLE PRECISION,
    "centerLine" DOUBLE PRECISION,
    "LCL" DOUBLE PRECISION,
    "rangeUCL" DOUBLE PRECISION,
    "rangeCL" DOUBLE PRECISION,
    "rangeLCL" DOUBLE PRECISION,
    "USL" DOUBLE PRECISION,
    "LSL" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "limitsBasedOn" "LimitCalculationMethod" NOT NULL,
    "historicalDataDays" INTEGER,
    "lastCalculatedAt" TIMESTAMP(3),
    "enabledRules" JSONB NOT NULL,
    "ruleSensitivity" TEXT NOT NULL DEFAULT 'NORMAL',
    "enableCapability" BOOLEAN NOT NULL DEFAULT true,
    "confidenceLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spc_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spc_rule_violations" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "ruleNumber" INTEGER NOT NULL,
    "ruleName" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "dataPointId" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "subgroupNumber" INTEGER,
    "UCL" DOUBLE PRECISION,
    "LCL" DOUBLE PRECISION,
    "centerLine" DOUBLE PRECISION,
    "deviationSigma" DOUBLE PRECISION,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spc_rule_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sampling_plans" (
    "id" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "planType" "SamplingPlanType" NOT NULL,
    "parameterId" TEXT,
    "operationId" TEXT,
    "inspectionLevel" TEXT NOT NULL,
    "AQL" DOUBLE PRECISION NOT NULL,
    "lotSizeMin" INTEGER,
    "lotSizeMax" INTEGER,
    "sampleSizeNormal" INTEGER NOT NULL,
    "acceptanceNumber" INTEGER NOT NULL,
    "rejectionNumber" INTEGER NOT NULL,
    "sampleSizeTightened" INTEGER,
    "acceptanceNumberTightened" INTEGER,
    "sampleSizeReduced" INTEGER,
    "acceptanceNumberReduced" INTEGER,
    "sampleSize2" INTEGER,
    "acceptanceNumber2" INTEGER,
    "rejectionNumber2" INTEGER,
    "currentInspectionLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "consecutiveAccepted" INTEGER NOT NULL DEFAULT 0,
    "consecutiveRejected" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sampling_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sampling_inspection_results" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "lotSize" INTEGER NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "defectsFound" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    "inspectionLevel" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sampling_inspection_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_enterpriseCode_key" ON "enterprises"("enterpriseCode");

-- CreateIndex
CREATE UNIQUE INDEX "sites_siteCode_key" ON "sites"("siteCode");

-- CreateIndex
CREATE INDEX "sites_enterpriseId_idx" ON "sites"("enterpriseId");

-- CreateIndex
CREATE UNIQUE INDEX "areas_areaCode_key" ON "areas"("areaCode");

-- CreateIndex
CREATE INDEX "areas_siteId_idx" ON "areas"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeNumber_key" ON "users"("employeeNumber");

-- CreateIndex
CREATE INDEX "users_employeeNumber_idx" ON "users"("employeeNumber");

-- CreateIndex
CREATE INDEX "users_personnelClassId_idx" ON "users"("personnelClassId");

-- CreateIndex
CREATE INDEX "users_supervisorId_idx" ON "users"("supervisorId");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_classes_classCode_key" ON "personnel_classes"("classCode");

-- CreateIndex
CREATE INDEX "personnel_classes_parentClassId_idx" ON "personnel_classes"("parentClassId");

-- CreateIndex
CREATE INDEX "personnel_classes_level_idx" ON "personnel_classes"("level");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_qualifications_qualificationCode_key" ON "personnel_qualifications"("qualificationCode");

-- CreateIndex
CREATE INDEX "personnel_qualifications_personnelClassId_idx" ON "personnel_qualifications"("personnelClassId");

-- CreateIndex
CREATE INDEX "personnel_qualifications_qualificationType_idx" ON "personnel_qualifications"("qualificationType");

-- CreateIndex
CREATE INDEX "personnel_certifications_personnelId_idx" ON "personnel_certifications"("personnelId");

-- CreateIndex
CREATE INDEX "personnel_certifications_qualificationId_idx" ON "personnel_certifications"("qualificationId");

-- CreateIndex
CREATE INDEX "personnel_certifications_expirationDate_idx" ON "personnel_certifications"("expirationDate");

-- CreateIndex
CREATE INDEX "personnel_certifications_status_idx" ON "personnel_certifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_certifications_personnelId_qualificationId_key" ON "personnel_certifications"("personnelId", "qualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_skills_skillCode_key" ON "personnel_skills"("skillCode");

-- CreateIndex
CREATE INDEX "personnel_skills_skillCategory_idx" ON "personnel_skills"("skillCategory");

-- CreateIndex
CREATE INDEX "personnel_skill_assignments_personnelId_idx" ON "personnel_skill_assignments"("personnelId");

-- CreateIndex
CREATE INDEX "personnel_skill_assignments_skillId_idx" ON "personnel_skill_assignments"("skillId");

-- CreateIndex
CREATE INDEX "personnel_skill_assignments_competencyLevel_idx" ON "personnel_skill_assignments"("competencyLevel");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_skill_assignments_personnelId_skillId_key" ON "personnel_skill_assignments"("personnelId", "skillId");

-- CreateIndex
CREATE INDEX "personnel_work_center_assignments_personnelId_idx" ON "personnel_work_center_assignments"("personnelId");

-- CreateIndex
CREATE INDEX "personnel_work_center_assignments_workCenterId_idx" ON "personnel_work_center_assignments"("workCenterId");

-- CreateIndex
CREATE INDEX "personnel_work_center_assignments_effectiveDate_idx" ON "personnel_work_center_assignments"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_work_center_assignments_personnelId_workCenterId_key" ON "personnel_work_center_assignments"("personnelId", "workCenterId");

-- CreateIndex
CREATE INDEX "personnel_availability_personnelId_idx" ON "personnel_availability"("personnelId");

-- CreateIndex
CREATE INDEX "personnel_availability_startDateTime_idx" ON "personnel_availability"("startDateTime");

-- CreateIndex
CREATE INDEX "personnel_availability_availabilityType_idx" ON "personnel_availability"("availabilityType");

-- CreateIndex
CREATE UNIQUE INDEX "material_classes_classCode_key" ON "material_classes"("classCode");

-- CreateIndex
CREATE INDEX "material_classes_parentClassId_idx" ON "material_classes"("parentClassId");

-- CreateIndex
CREATE INDEX "material_classes_level_idx" ON "material_classes"("level");

-- CreateIndex
CREATE UNIQUE INDEX "material_definitions_materialNumber_key" ON "material_definitions"("materialNumber");

-- CreateIndex
CREATE INDEX "material_definitions_materialClassId_idx" ON "material_definitions"("materialClassId");

-- CreateIndex
CREATE INDEX "material_definitions_materialType_idx" ON "material_definitions"("materialType");

-- CreateIndex
CREATE INDEX "material_definitions_isActive_idx" ON "material_definitions"("isActive");

-- CreateIndex
CREATE INDEX "material_definitions_materialNumber_idx" ON "material_definitions"("materialNumber");

-- CreateIndex
CREATE INDEX "material_properties_materialId_idx" ON "material_properties"("materialId");

-- CreateIndex
CREATE INDEX "material_properties_propertyType_idx" ON "material_properties"("propertyType");

-- CreateIndex
CREATE UNIQUE INDEX "material_properties_materialId_propertyName_key" ON "material_properties"("materialId", "propertyName");

-- CreateIndex
CREATE UNIQUE INDEX "material_lots_lotNumber_key" ON "material_lots"("lotNumber");

-- CreateIndex
CREATE INDEX "material_lots_materialId_idx" ON "material_lots"("materialId");

-- CreateIndex
CREATE INDEX "material_lots_lotNumber_idx" ON "material_lots"("lotNumber");

-- CreateIndex
CREATE INDEX "material_lots_status_idx" ON "material_lots"("status");

-- CreateIndex
CREATE INDEX "material_lots_state_idx" ON "material_lots"("state");

-- CreateIndex
CREATE INDEX "material_lots_expirationDate_idx" ON "material_lots"("expirationDate");

-- CreateIndex
CREATE INDEX "material_lots_qualityStatus_idx" ON "material_lots"("qualityStatus");

-- CreateIndex
CREATE INDEX "material_lots_parentLotId_idx" ON "material_lots"("parentLotId");

-- CreateIndex
CREATE UNIQUE INDEX "material_sublots_sublotNumber_key" ON "material_sublots"("sublotNumber");

-- CreateIndex
CREATE INDEX "material_sublots_parentLotId_idx" ON "material_sublots"("parentLotId");

-- CreateIndex
CREATE INDEX "material_sublots_sublotNumber_idx" ON "material_sublots"("sublotNumber");

-- CreateIndex
CREATE INDEX "material_sublots_workOrderId_idx" ON "material_sublots"("workOrderId");

-- CreateIndex
CREATE INDEX "material_lot_genealogy_parentLotId_idx" ON "material_lot_genealogy"("parentLotId");

-- CreateIndex
CREATE INDEX "material_lot_genealogy_childLotId_idx" ON "material_lot_genealogy"("childLotId");

-- CreateIndex
CREATE INDEX "material_lot_genealogy_workOrderId_idx" ON "material_lot_genealogy"("workOrderId");

-- CreateIndex
CREATE INDEX "material_lot_genealogy_processDate_idx" ON "material_lot_genealogy"("processDate");

-- CreateIndex
CREATE UNIQUE INDEX "material_lot_genealogy_parentLotId_childLotId_processDate_key" ON "material_lot_genealogy"("parentLotId", "childLotId", "processDate");

-- CreateIndex
CREATE INDEX "material_state_history_lotId_idx" ON "material_state_history"("lotId");

-- CreateIndex
CREATE INDEX "material_state_history_changedAt_idx" ON "material_state_history"("changedAt");

-- CreateIndex
CREATE INDEX "material_state_history_newState_idx" ON "material_state_history"("newState");

-- CreateIndex
CREATE INDEX "material_state_history_newStatus_idx" ON "material_state_history"("newStatus");

-- CreateIndex
CREATE UNIQUE INDEX "operations_operationCode_key" ON "operations"("operationCode");

-- CreateIndex
CREATE INDEX "operations_parentOperationId_idx" ON "operations"("parentOperationId");

-- CreateIndex
CREATE INDEX "operations_operationType_idx" ON "operations"("operationType");

-- CreateIndex
CREATE INDEX "operations_level_idx" ON "operations"("level");

-- CreateIndex
CREATE INDEX "operations_isActive_idx" ON "operations"("isActive");

-- CreateIndex
CREATE INDEX "operations_siteId_idx" ON "operations"("siteId");

-- CreateIndex
CREATE INDEX "operations_isStandardOperation_idx" ON "operations"("isStandardOperation");

-- CreateIndex
CREATE INDEX "operation_parameters_operationId_idx" ON "operation_parameters"("operationId");

-- CreateIndex
CREATE INDEX "operation_parameters_parameterType_idx" ON "operation_parameters"("parameterType");

-- CreateIndex
CREATE UNIQUE INDEX "operation_parameters_operationId_parameterName_key" ON "operation_parameters"("operationId", "parameterName");

-- CreateIndex
CREATE UNIQUE INDEX "parameter_limits_parameterId_key" ON "parameter_limits"("parameterId");

-- CreateIndex
CREATE INDEX "parameter_groups_parentGroupId_idx" ON "parameter_groups"("parentGroupId");

-- CreateIndex
CREATE INDEX "parameter_groups_groupType_idx" ON "parameter_groups"("groupType");

-- CreateIndex
CREATE UNIQUE INDEX "parameter_formulas_outputParameterId_key" ON "parameter_formulas"("outputParameterId");

-- CreateIndex
CREATE INDEX "parameter_formulas_outputParameterId_idx" ON "parameter_formulas"("outputParameterId");

-- CreateIndex
CREATE INDEX "operation_dependencies_dependentOperationId_idx" ON "operation_dependencies"("dependentOperationId");

-- CreateIndex
CREATE INDEX "operation_dependencies_prerequisiteOperationId_idx" ON "operation_dependencies"("prerequisiteOperationId");

-- CreateIndex
CREATE UNIQUE INDEX "operation_dependencies_dependentOperationId_prerequisiteOpe_key" ON "operation_dependencies"("dependentOperationId", "prerequisiteOperationId");

-- CreateIndex
CREATE INDEX "personnel_operation_specifications_operationId_idx" ON "personnel_operation_specifications"("operationId");

-- CreateIndex
CREATE INDEX "personnel_operation_specifications_personnelClassId_idx" ON "personnel_operation_specifications"("personnelClassId");

-- CreateIndex
CREATE INDEX "equipment_operation_specifications_operationId_idx" ON "equipment_operation_specifications"("operationId");

-- CreateIndex
CREATE INDEX "equipment_operation_specifications_equipmentClass_idx" ON "equipment_operation_specifications"("equipmentClass");

-- CreateIndex
CREATE INDEX "material_operation_specifications_operationId_idx" ON "material_operation_specifications"("operationId");

-- CreateIndex
CREATE INDEX "material_operation_specifications_materialDefinitionId_idx" ON "material_operation_specifications"("materialDefinitionId");

-- CreateIndex
CREATE INDEX "physical_asset_operation_specifications_operationId_idx" ON "physical_asset_operation_specifications"("operationId");

-- CreateIndex
CREATE INDEX "physical_asset_operation_specifications_assetType_idx" ON "physical_asset_operation_specifications"("assetType");

-- CreateIndex
CREATE UNIQUE INDEX "parts_partNumber_key" ON "parts"("partNumber");

-- CreateIndex
CREATE INDEX "parts_productType_idx" ON "parts"("productType");

-- CreateIndex
CREATE INDEX "parts_lifecycleState_idx" ON "parts"("lifecycleState");

-- CreateIndex
CREATE INDEX "parts_isActive_idx" ON "parts"("isActive");

-- CreateIndex
CREATE INDEX "parts_partNumber_idx" ON "parts"("partNumber");

-- CreateIndex
CREATE INDEX "part_site_availability_siteId_idx" ON "part_site_availability"("siteId");

-- CreateIndex
CREATE INDEX "part_site_availability_isActive_idx" ON "part_site_availability"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "part_site_availability_partId_siteId_key" ON "part_site_availability"("partId", "siteId");

-- CreateIndex
CREATE INDEX "bom_items_parentPartId_idx" ON "bom_items"("parentPartId");

-- CreateIndex
CREATE INDEX "bom_items_componentPartId_idx" ON "bom_items"("componentPartId");

-- CreateIndex
CREATE INDEX "bom_items_operationId_idx" ON "bom_items"("operationId");

-- CreateIndex
CREATE INDEX "bom_items_effectiveDate_idx" ON "bom_items"("effectiveDate");

-- CreateIndex
CREATE INDEX "product_specifications_partId_idx" ON "product_specifications"("partId");

-- CreateIndex
CREATE INDEX "product_specifications_specificationType_idx" ON "product_specifications"("specificationType");

-- CreateIndex
CREATE INDEX "product_specifications_isCritical_idx" ON "product_specifications"("isCritical");

-- CreateIndex
CREATE INDEX "product_configurations_partId_idx" ON "product_configurations"("partId");

-- CreateIndex
CREATE INDEX "product_configurations_configurationType_idx" ON "product_configurations"("configurationType");

-- CreateIndex
CREATE INDEX "product_configurations_isDefault_idx" ON "product_configurations"("isDefault");

-- CreateIndex
CREATE INDEX "configuration_options_configurationId_idx" ON "configuration_options"("configurationId");

-- CreateIndex
CREATE INDEX "product_lifecycle_partId_idx" ON "product_lifecycle"("partId");

-- CreateIndex
CREATE INDEX "product_lifecycle_newState_idx" ON "product_lifecycle"("newState");

-- CreateIndex
CREATE INDEX "product_lifecycle_transitionDate_idx" ON "product_lifecycle"("transitionDate");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_workOrderNumber_key" ON "work_orders"("workOrderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "routings_routingNumber_key" ON "routings"("routingNumber");

-- CreateIndex
CREATE INDEX "routings_siteId_idx" ON "routings"("siteId");

-- CreateIndex
CREATE INDEX "routings_partId_idx" ON "routings"("partId");

-- CreateIndex
CREATE INDEX "routings_lifecycleState_idx" ON "routings"("lifecycleState");

-- CreateIndex
CREATE INDEX "routings_isActive_idx" ON "routings"("isActive");

-- CreateIndex
CREATE INDEX "routings_partId_siteId_routingType_idx" ON "routings"("partId", "siteId", "routingType");

-- CreateIndex
CREATE INDEX "routings_alternateForId_idx" ON "routings"("alternateForId");

-- CreateIndex
CREATE UNIQUE INDEX "routings_partId_siteId_version_key" ON "routings"("partId", "siteId", "version");

-- CreateIndex
CREATE INDEX "routing_steps_routingId_idx" ON "routing_steps"("routingId");

-- CreateIndex
CREATE INDEX "routing_steps_operationId_idx" ON "routing_steps"("operationId");

-- CreateIndex
CREATE INDEX "routing_steps_workCenterId_idx" ON "routing_steps"("workCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "routing_steps_routingId_stepNumber_key" ON "routing_steps"("routingId", "stepNumber");

-- CreateIndex
CREATE INDEX "routing_step_dependencies_dependentStepId_idx" ON "routing_step_dependencies"("dependentStepId");

-- CreateIndex
CREATE INDEX "routing_step_dependencies_prerequisiteStepId_idx" ON "routing_step_dependencies"("prerequisiteStepId");

-- CreateIndex
CREATE UNIQUE INDEX "routing_step_dependencies_dependentStepId_prerequisiteStepI_key" ON "routing_step_dependencies"("dependentStepId", "prerequisiteStepId");

-- CreateIndex
CREATE INDEX "routing_step_parameters_routingStepId_idx" ON "routing_step_parameters"("routingStepId");

-- CreateIndex
CREATE UNIQUE INDEX "routing_step_parameters_routingStepId_parameterName_key" ON "routing_step_parameters"("routingStepId", "parameterName");

-- CreateIndex
CREATE UNIQUE INDEX "routing_templates_number_key" ON "routing_templates"("number");

-- CreateIndex
CREATE INDEX "routing_templates_siteId_idx" ON "routing_templates"("siteId");

-- CreateIndex
CREATE INDEX "routing_templates_createdById_idx" ON "routing_templates"("createdById");

-- CreateIndex
CREATE INDEX "routing_templates_category_idx" ON "routing_templates"("category");

-- CreateIndex
CREATE INDEX "routing_templates_isFavorite_idx" ON "routing_templates"("isFavorite");

-- CreateIndex
CREATE UNIQUE INDEX "work_centers_name_key" ON "work_centers"("name");

-- CreateIndex
CREATE INDEX "work_centers_areaId_idx" ON "work_centers"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "work_units_workUnitCode_key" ON "work_units"("workUnitCode");

-- CreateIndex
CREATE INDEX "work_units_workCenterId_idx" ON "work_units"("workCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "production_schedules_scheduleNumber_key" ON "production_schedules"("scheduleNumber");

-- CreateIndex
CREATE INDEX "production_schedules_siteId_idx" ON "production_schedules"("siteId");

-- CreateIndex
CREATE INDEX "production_schedules_state_idx" ON "production_schedules"("state");

-- CreateIndex
CREATE INDEX "production_schedules_periodStart_idx" ON "production_schedules"("periodStart");

-- CreateIndex
CREATE INDEX "production_schedules_periodEnd_idx" ON "production_schedules"("periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_entries_workOrderId_key" ON "schedule_entries"("workOrderId");

-- CreateIndex
CREATE INDEX "schedule_entries_scheduleId_idx" ON "schedule_entries"("scheduleId");

-- CreateIndex
CREATE INDEX "schedule_entries_partId_idx" ON "schedule_entries"("partId");

-- CreateIndex
CREATE INDEX "schedule_entries_plannedStartDate_idx" ON "schedule_entries"("plannedStartDate");

-- CreateIndex
CREATE INDEX "schedule_entries_plannedEndDate_idx" ON "schedule_entries"("plannedEndDate");

-- CreateIndex
CREATE INDEX "schedule_entries_priority_idx" ON "schedule_entries"("priority");

-- CreateIndex
CREATE INDEX "schedule_entries_isDispatched_idx" ON "schedule_entries"("isDispatched");

-- CreateIndex
CREATE INDEX "schedule_entries_workOrderId_idx" ON "schedule_entries"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_entries_scheduleId_entryNumber_key" ON "schedule_entries"("scheduleId", "entryNumber");

-- CreateIndex
CREATE INDEX "schedule_constraints_entryId_idx" ON "schedule_constraints"("entryId");

-- CreateIndex
CREATE INDEX "schedule_constraints_constraintType_idx" ON "schedule_constraints"("constraintType");

-- CreateIndex
CREATE INDEX "schedule_constraints_isViolated_idx" ON "schedule_constraints"("isViolated");

-- CreateIndex
CREATE INDEX "schedule_constraints_constraintDate_idx" ON "schedule_constraints"("constraintDate");

-- CreateIndex
CREATE INDEX "schedule_state_history_scheduleId_idx" ON "schedule_state_history"("scheduleId");

-- CreateIndex
CREATE INDEX "schedule_state_history_newState_idx" ON "schedule_state_history"("newState");

-- CreateIndex
CREATE INDEX "schedule_state_history_transitionDate_idx" ON "schedule_state_history"("transitionDate");

-- CreateIndex
CREATE INDEX "work_order_status_history_workOrderId_idx" ON "work_order_status_history"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_status_history_newStatus_idx" ON "work_order_status_history"("newStatus");

-- CreateIndex
CREATE INDEX "work_order_status_history_transitionDate_idx" ON "work_order_status_history"("transitionDate");

-- CreateIndex
CREATE INDEX "dispatch_logs_workOrderId_idx" ON "dispatch_logs"("workOrderId");

-- CreateIndex
CREATE INDEX "dispatch_logs_dispatchedAt_idx" ON "dispatch_logs"("dispatchedAt");

-- CreateIndex
CREATE INDEX "dispatch_logs_assignedToId_idx" ON "dispatch_logs"("assignedToId");

-- CreateIndex
CREATE INDEX "dispatch_logs_workCenterId_idx" ON "dispatch_logs"("workCenterId");

-- CreateIndex
CREATE INDEX "work_performance_workOrderId_idx" ON "work_performance"("workOrderId");

-- CreateIndex
CREATE INDEX "work_performance_operationId_idx" ON "work_performance"("operationId");

-- CreateIndex
CREATE INDEX "work_performance_performanceType_idx" ON "work_performance"("performanceType");

-- CreateIndex
CREATE INDEX "work_performance_recordedAt_idx" ON "work_performance"("recordedAt");

-- CreateIndex
CREATE INDEX "work_performance_personnelId_idx" ON "work_performance"("personnelId");

-- CreateIndex
CREATE INDEX "production_variances_workOrderId_idx" ON "production_variances"("workOrderId");

-- CreateIndex
CREATE INDEX "production_variances_operationId_idx" ON "production_variances"("operationId");

-- CreateIndex
CREATE INDEX "production_variances_varianceType_idx" ON "production_variances"("varianceType");

-- CreateIndex
CREATE INDEX "production_variances_isFavorable_idx" ON "production_variances"("isFavorable");

-- CreateIndex
CREATE INDEX "production_variances_calculatedAt_idx" ON "production_variances"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_plans_planNumber_key" ON "quality_plans"("planNumber");

-- CreateIndex
CREATE UNIQUE INDEX "quality_inspections_inspectionNumber_key" ON "quality_inspections"("inspectionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ncrs_ncrNumber_key" ON "ncrs"("ncrNumber");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_equipmentNumber_key" ON "equipment"("equipmentNumber");

-- CreateIndex
CREATE INDEX "equipment_parentEquipmentId_idx" ON "equipment"("parentEquipmentId");

-- CreateIndex
CREATE INDEX "equipment_workUnitId_idx" ON "equipment"("workUnitId");

-- CreateIndex
CREATE INDEX "equipment_workCenterId_idx" ON "equipment"("workCenterId");

-- CreateIndex
CREATE INDEX "equipment_areaId_idx" ON "equipment"("areaId");

-- CreateIndex
CREATE INDEX "equipment_siteId_idx" ON "equipment"("siteId");

-- CreateIndex
CREATE INDEX "equipment_currentState_idx" ON "equipment"("currentState");

-- CreateIndex
CREATE INDEX "equipment_equipmentClass_idx" ON "equipment"("equipmentClass");

-- CreateIndex
CREATE INDEX "equipment_capabilities_equipmentId_idx" ON "equipment_capabilities"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_capabilities_capabilityType_idx" ON "equipment_capabilities"("capabilityType");

-- CreateIndex
CREATE INDEX "equipment_capabilities_capability_idx" ON "equipment_capabilities"("capability");

-- CreateIndex
CREATE INDEX "equipment_state_history_equipmentId_idx" ON "equipment_state_history"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_state_history_stateStartTime_idx" ON "equipment_state_history"("stateStartTime");

-- CreateIndex
CREATE INDEX "equipment_state_history_newState_idx" ON "equipment_state_history"("newState");

-- CreateIndex
CREATE INDEX "equipment_performance_logs_equipmentId_idx" ON "equipment_performance_logs"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_performance_logs_periodStart_idx" ON "equipment_performance_logs"("periodStart");

-- CreateIndex
CREATE INDEX "equipment_performance_logs_periodType_idx" ON "equipment_performance_logs"("periodType");

-- CreateIndex
CREATE INDEX "equipment_performance_logs_oee_idx" ON "equipment_performance_logs"("oee");

-- CreateIndex
CREATE UNIQUE INDEX "serialized_parts_serialNumber_key" ON "serialized_parts"("serialNumber");

-- CreateIndex
CREATE INDEX "work_instructions_status_idx" ON "work_instructions"("status");

-- CreateIndex
CREATE INDEX "work_instructions_partId_idx" ON "work_instructions"("partId");

-- CreateIndex
CREATE INDEX "work_instruction_steps_workInstructionId_idx" ON "work_instruction_steps"("workInstructionId");

-- CreateIndex
CREATE UNIQUE INDEX "work_instruction_steps_workInstructionId_stepNumber_key" ON "work_instruction_steps"("workInstructionId", "stepNumber");

-- CreateIndex
CREATE INDEX "work_instruction_executions_workOrderId_idx" ON "work_instruction_executions"("workOrderId");

-- CreateIndex
CREATE INDEX "work_instruction_executions_operatorId_idx" ON "work_instruction_executions"("operatorId");

-- CreateIndex
CREATE INDEX "work_instruction_step_executions_executionId_idx" ON "work_instruction_step_executions"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "work_instruction_step_executions_executionId_stepNumber_key" ON "work_instruction_step_executions"("executionId", "stepNumber");

-- CreateIndex
CREATE INDEX "electronic_signatures_userId_idx" ON "electronic_signatures"("userId");

-- CreateIndex
CREATE INDEX "electronic_signatures_signedEntityType_signedEntityId_idx" ON "electronic_signatures"("signedEntityType", "signedEntityId");

-- CreateIndex
CREATE INDEX "electronic_signatures_timestamp_idx" ON "electronic_signatures"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "fai_reports_faiNumber_key" ON "fai_reports"("faiNumber");

-- CreateIndex
CREATE INDEX "fai_reports_partId_idx" ON "fai_reports"("partId");

-- CreateIndex
CREATE INDEX "fai_reports_status_idx" ON "fai_reports"("status");

-- CreateIndex
CREATE INDEX "fai_characteristics_faiReportId_idx" ON "fai_characteristics"("faiReportId");

-- CreateIndex
CREATE UNIQUE INDEX "fai_characteristics_faiReportId_characteristicNumber_key" ON "fai_characteristics"("faiReportId", "characteristicNumber");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_work_orders_externalWorkOrderNumber_key" ON "maintenance_work_orders"("externalWorkOrderNumber");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_externalWorkOrderNumber_idx" ON "maintenance_work_orders"("externalWorkOrderNumber");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_equipmentId_idx" ON "maintenance_work_orders"("equipmentId");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_status_idx" ON "maintenance_work_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_equipment_externalGaugeId_key" ON "measurement_equipment"("externalGaugeId");

-- CreateIndex
CREATE INDEX "measurement_equipment_externalGaugeId_idx" ON "measurement_equipment"("externalGaugeId");

-- CreateIndex
CREATE INDEX "measurement_equipment_calibrationStatus_idx" ON "measurement_equipment"("calibrationStatus");

-- CreateIndex
CREATE INDEX "measurement_equipment_nextCalibrationDate_idx" ON "measurement_equipment"("nextCalibrationDate");

-- CreateIndex
CREATE INDEX "inspection_records_serializedPartId_idx" ON "inspection_records"("serializedPartId");

-- CreateIndex
CREATE INDEX "inspection_records_measurementEquipmentId_idx" ON "inspection_records"("measurementEquipmentId");

-- CreateIndex
CREATE INDEX "inspection_records_result_idx" ON "inspection_records"("result");

-- CreateIndex
CREATE UNIQUE INDEX "cnc_programs_externalProgramId_key" ON "cnc_programs"("externalProgramId");

-- CreateIndex
CREATE INDEX "cnc_programs_programName_idx" ON "cnc_programs"("programName");

-- CreateIndex
CREATE INDEX "cnc_programs_partNumber_idx" ON "cnc_programs"("partNumber");

-- CreateIndex
CREATE INDEX "cnc_programs_status_idx" ON "cnc_programs"("status");

-- CreateIndex
CREATE INDEX "cnc_programs_revision_idx" ON "cnc_programs"("revision");

-- CreateIndex
CREATE INDEX "program_download_logs_programName_idx" ON "program_download_logs"("programName");

-- CreateIndex
CREATE INDEX "program_download_logs_machineId_idx" ON "program_download_logs"("machineId");

-- CreateIndex
CREATE INDEX "program_download_logs_operatorBadgeNumber_idx" ON "program_download_logs"("operatorBadgeNumber");

-- CreateIndex
CREATE INDEX "program_download_logs_downloadDate_idx" ON "program_download_logs"("downloadDate");

-- CreateIndex
CREATE UNIQUE INDEX "program_load_authorizations_authorizationId_key" ON "program_load_authorizations"("authorizationId");

-- CreateIndex
CREATE INDEX "program_load_authorizations_authorizationId_idx" ON "program_load_authorizations"("authorizationId");

-- CreateIndex
CREATE INDEX "program_load_authorizations_operatorBadgeNumber_idx" ON "program_load_authorizations"("operatorBadgeNumber");

-- CreateIndex
CREATE INDEX "program_load_authorizations_machineId_idx" ON "program_load_authorizations"("machineId");

-- CreateIndex
CREATE INDEX "program_load_authorizations_authorized_idx" ON "program_load_authorizations"("authorized");

-- CreateIndex
CREATE INDEX "program_load_authorizations_authorizationDate_idx" ON "program_load_authorizations"("authorizationDate");

-- CreateIndex
CREATE INDEX "operation_gauge_requirements_partNumber_idx" ON "operation_gauge_requirements"("partNumber");

-- CreateIndex
CREATE INDEX "operation_gauge_requirements_operationCode_idx" ON "operation_gauge_requirements"("operationCode");

-- CreateIndex
CREATE UNIQUE INDEX "operation_gauge_requirements_partNumber_operationCode_measu_key" ON "operation_gauge_requirements"("partNumber", "operationCode", "measurementEquipmentId");

-- CreateIndex
CREATE INDEX "alerts_alertType_idx" ON "alerts"("alertType");

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");

-- CreateIndex
CREATE INDEX "alerts_resolved_idx" ON "alerts"("resolved");

-- CreateIndex
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_name_key" ON "integration_configs"("name");

-- CreateIndex
CREATE INDEX "integration_configs_name_idx" ON "integration_configs"("name");

-- CreateIndex
CREATE INDEX "integration_configs_type_idx" ON "integration_configs"("type");

-- CreateIndex
CREATE INDEX "integration_configs_enabled_idx" ON "integration_configs"("enabled");

-- CreateIndex
CREATE INDEX "integration_logs_configId_idx" ON "integration_logs"("configId");

-- CreateIndex
CREATE INDEX "integration_logs_status_idx" ON "integration_logs"("status");

-- CreateIndex
CREATE INDEX "integration_logs_startedAt_idx" ON "integration_logs"("startedAt");

-- CreateIndex
CREATE INDEX "integration_logs_operation_idx" ON "integration_logs"("operation");

-- CreateIndex
CREATE UNIQUE INDEX "production_schedule_requests_messageId_key" ON "production_schedule_requests"("messageId");

-- CreateIndex
CREATE INDEX "production_schedule_requests_configId_idx" ON "production_schedule_requests"("configId");

-- CreateIndex
CREATE INDEX "production_schedule_requests_status_idx" ON "production_schedule_requests"("status");

-- CreateIndex
CREATE INDEX "production_schedule_requests_externalWorkOrderId_idx" ON "production_schedule_requests"("externalWorkOrderId");

-- CreateIndex
CREATE INDEX "production_schedule_requests_requestedDate_idx" ON "production_schedule_requests"("requestedDate");

-- CreateIndex
CREATE UNIQUE INDEX "production_schedule_responses_requestId_key" ON "production_schedule_responses"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "production_schedule_responses_messageId_key" ON "production_schedule_responses"("messageId");

-- CreateIndex
CREATE INDEX "production_schedule_responses_requestId_idx" ON "production_schedule_responses"("requestId");

-- CreateIndex
CREATE INDEX "production_schedule_responses_respondedAt_idx" ON "production_schedule_responses"("respondedAt");

-- CreateIndex
CREATE UNIQUE INDEX "production_performance_actuals_messageId_key" ON "production_performance_actuals"("messageId");

-- CreateIndex
CREATE INDEX "production_performance_actuals_configId_idx" ON "production_performance_actuals"("configId");

-- CreateIndex
CREATE INDEX "production_performance_actuals_workOrderId_idx" ON "production_performance_actuals"("workOrderId");

-- CreateIndex
CREATE INDEX "production_performance_actuals_externalWorkOrderId_idx" ON "production_performance_actuals"("externalWorkOrderId");

-- CreateIndex
CREATE INDEX "production_performance_actuals_status_idx" ON "production_performance_actuals"("status");

-- CreateIndex
CREATE INDEX "production_performance_actuals_sentToERP_idx" ON "production_performance_actuals"("sentToERP");

-- CreateIndex
CREATE INDEX "production_performance_actuals_reportingPeriodStart_idx" ON "production_performance_actuals"("reportingPeriodStart");

-- CreateIndex
CREATE UNIQUE INDEX "erp_material_transactions_messageId_key" ON "erp_material_transactions"("messageId");

-- CreateIndex
CREATE INDEX "erp_material_transactions_configId_idx" ON "erp_material_transactions"("configId");

-- CreateIndex
CREATE INDEX "erp_material_transactions_transactionType_idx" ON "erp_material_transactions"("transactionType");

-- CreateIndex
CREATE INDEX "erp_material_transactions_status_idx" ON "erp_material_transactions"("status");

-- CreateIndex
CREATE INDEX "erp_material_transactions_externalPartId_idx" ON "erp_material_transactions"("externalPartId");

-- CreateIndex
CREATE INDEX "erp_material_transactions_transactionDate_idx" ON "erp_material_transactions"("transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_info_exchanges_messageId_key" ON "personnel_info_exchanges"("messageId");

-- CreateIndex
CREATE INDEX "personnel_info_exchanges_configId_idx" ON "personnel_info_exchanges"("configId");

-- CreateIndex
CREATE INDEX "personnel_info_exchanges_actionType_idx" ON "personnel_info_exchanges"("actionType");

-- CreateIndex
CREATE INDEX "personnel_info_exchanges_status_idx" ON "personnel_info_exchanges"("status");

-- CreateIndex
CREATE INDEX "personnel_info_exchanges_externalPersonnelId_idx" ON "personnel_info_exchanges"("externalPersonnelId");

-- CreateIndex
CREATE INDEX "personnel_info_exchanges_personnelId_idx" ON "personnel_info_exchanges"("personnelId");

-- CreateIndex
CREATE INDEX "equipment_data_collections_equipmentId_idx" ON "equipment_data_collections"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_data_collections_dataCollectionType_idx" ON "equipment_data_collections"("dataCollectionType");

-- CreateIndex
CREATE INDEX "equipment_data_collections_collectionTimestamp_idx" ON "equipment_data_collections"("collectionTimestamp");

-- CreateIndex
CREATE INDEX "equipment_data_collections_workOrderId_idx" ON "equipment_data_collections"("workOrderId");

-- CreateIndex
CREATE INDEX "equipment_data_collections_dataPointName_idx" ON "equipment_data_collections"("dataPointName");

-- CreateIndex
CREATE INDEX "equipment_commands_equipmentId_idx" ON "equipment_commands"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_commands_commandType_idx" ON "equipment_commands"("commandType");

-- CreateIndex
CREATE INDEX "equipment_commands_commandStatus_idx" ON "equipment_commands"("commandStatus");

-- CreateIndex
CREATE INDEX "equipment_commands_workOrderId_idx" ON "equipment_commands"("workOrderId");

-- CreateIndex
CREATE INDEX "equipment_commands_issuedAt_idx" ON "equipment_commands"("issuedAt");

-- CreateIndex
CREATE INDEX "equipment_commands_priority_idx" ON "equipment_commands"("priority");

-- CreateIndex
CREATE INDEX "equipment_material_movements_equipmentId_idx" ON "equipment_material_movements"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_material_movements_partId_idx" ON "equipment_material_movements"("partId");

-- CreateIndex
CREATE INDEX "equipment_material_movements_partNumber_idx" ON "equipment_material_movements"("partNumber");

-- CreateIndex
CREATE INDEX "equipment_material_movements_lotNumber_idx" ON "equipment_material_movements"("lotNumber");

-- CreateIndex
CREATE INDEX "equipment_material_movements_serialNumber_idx" ON "equipment_material_movements"("serialNumber");

-- CreateIndex
CREATE INDEX "equipment_material_movements_workOrderId_idx" ON "equipment_material_movements"("workOrderId");

-- CreateIndex
CREATE INDEX "equipment_material_movements_movementTimestamp_idx" ON "equipment_material_movements"("movementTimestamp");

-- CreateIndex
CREATE INDEX "equipment_material_movements_movementType_idx" ON "equipment_material_movements"("movementType");

-- CreateIndex
CREATE INDEX "process_data_collections_equipmentId_idx" ON "process_data_collections"("equipmentId");

-- CreateIndex
CREATE INDEX "process_data_collections_processName_idx" ON "process_data_collections"("processName");

-- CreateIndex
CREATE INDEX "process_data_collections_workOrderId_idx" ON "process_data_collections"("workOrderId");

-- CreateIndex
CREATE INDEX "process_data_collections_startTimestamp_idx" ON "process_data_collections"("startTimestamp");

-- CreateIndex
CREATE INDEX "process_data_collections_partNumber_idx" ON "process_data_collections"("partNumber");

-- CreateIndex
CREATE INDEX "process_data_collections_lotNumber_idx" ON "process_data_collections"("lotNumber");

-- CreateIndex
CREATE INDEX "process_data_collections_serialNumber_idx" ON "process_data_collections"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "qif_measurement_plans_qifPlanId_key" ON "qif_measurement_plans"("qifPlanId");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_partNumber_idx" ON "qif_measurement_plans"("partNumber");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_partRevision_idx" ON "qif_measurement_plans"("partRevision");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_qifPlanId_idx" ON "qif_measurement_plans"("qifPlanId");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_workOrderId_idx" ON "qif_measurement_plans"("workOrderId");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_faiReportId_idx" ON "qif_measurement_plans"("faiReportId");

-- CreateIndex
CREATE INDEX "qif_measurement_plans_status_idx" ON "qif_measurement_plans"("status");

-- CreateIndex
CREATE INDEX "qif_characteristics_qifMeasurementPlanId_idx" ON "qif_characteristics"("qifMeasurementPlanId");

-- CreateIndex
CREATE INDEX "qif_characteristics_characteristicId_idx" ON "qif_characteristics"("characteristicId");

-- CreateIndex
CREATE INDEX "qif_characteristics_balloonNumber_idx" ON "qif_characteristics"("balloonNumber");

-- CreateIndex
CREATE UNIQUE INDEX "qif_measurement_results_qifResultsId_key" ON "qif_measurement_results"("qifResultsId");

-- CreateIndex
CREATE INDEX "qif_measurement_results_qifResultsId_idx" ON "qif_measurement_results"("qifResultsId");

-- CreateIndex
CREATE INDEX "qif_measurement_results_qifMeasurementPlanId_idx" ON "qif_measurement_results"("qifMeasurementPlanId");

-- CreateIndex
CREATE INDEX "qif_measurement_results_partNumber_idx" ON "qif_measurement_results"("partNumber");

-- CreateIndex
CREATE INDEX "qif_measurement_results_serialNumber_idx" ON "qif_measurement_results"("serialNumber");

-- CreateIndex
CREATE INDEX "qif_measurement_results_inspectionDate_idx" ON "qif_measurement_results"("inspectionDate");

-- CreateIndex
CREATE INDEX "qif_measurement_results_overallStatus_idx" ON "qif_measurement_results"("overallStatus");

-- CreateIndex
CREATE INDEX "qif_measurement_results_workOrderId_idx" ON "qif_measurement_results"("workOrderId");

-- CreateIndex
CREATE INDEX "qif_measurement_results_faiReportId_idx" ON "qif_measurement_results"("faiReportId");

-- CreateIndex
CREATE INDEX "qif_measurements_qifMeasurementResultId_idx" ON "qif_measurements"("qifMeasurementResultId");

-- CreateIndex
CREATE INDEX "qif_measurements_qifCharacteristicId_idx" ON "qif_measurements"("qifCharacteristicId");

-- CreateIndex
CREATE INDEX "qif_measurements_characteristicId_idx" ON "qif_measurements"("characteristicId");

-- CreateIndex
CREATE INDEX "qif_measurements_status_idx" ON "qif_measurements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "spc_configurations_parameterId_key" ON "spc_configurations"("parameterId");

-- CreateIndex
CREATE INDEX "spc_rule_violations_configurationId_timestamp_idx" ON "spc_rule_violations"("configurationId", "timestamp");

-- CreateIndex
CREATE INDEX "spc_rule_violations_acknowledged_idx" ON "spc_rule_violations"("acknowledged");

-- CreateIndex
CREATE INDEX "sampling_inspection_results_planId_inspectionDate_idx" ON "sampling_inspection_results"("planId", "inspectionDate");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_personnelClassId_fkey" FOREIGN KEY ("personnelClassId") REFERENCES "personnel_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_classes" ADD CONSTRAINT "personnel_classes_parentClassId_fkey" FOREIGN KEY ("parentClassId") REFERENCES "personnel_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_qualifications" ADD CONSTRAINT "personnel_qualifications_personnelClassId_fkey" FOREIGN KEY ("personnelClassId") REFERENCES "personnel_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_certifications" ADD CONSTRAINT "personnel_certifications_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_certifications" ADD CONSTRAINT "personnel_certifications_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "personnel_qualifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_skill_assignments" ADD CONSTRAINT "personnel_skill_assignments_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_skill_assignments" ADD CONSTRAINT "personnel_skill_assignments_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "personnel_skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_work_center_assignments" ADD CONSTRAINT "personnel_work_center_assignments_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_work_center_assignments" ADD CONSTRAINT "personnel_work_center_assignments_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_availability" ADD CONSTRAINT "personnel_availability_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_classes" ADD CONSTRAINT "material_classes_parentClassId_fkey" FOREIGN KEY ("parentClassId") REFERENCES "material_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_definitions" ADD CONSTRAINT "material_definitions_materialClassId_fkey" FOREIGN KEY ("materialClassId") REFERENCES "material_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_definitions" ADD CONSTRAINT "material_definitions_replacementMaterialId_fkey" FOREIGN KEY ("replacementMaterialId") REFERENCES "material_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_properties" ADD CONSTRAINT "material_properties_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_lots" ADD CONSTRAINT "material_lots_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_lots" ADD CONSTRAINT "material_lots_parentLotId_fkey" FOREIGN KEY ("parentLotId") REFERENCES "material_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_sublots" ADD CONSTRAINT "material_sublots_parentLotId_fkey" FOREIGN KEY ("parentLotId") REFERENCES "material_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_lot_genealogy" ADD CONSTRAINT "material_lot_genealogy_parentLotId_fkey" FOREIGN KEY ("parentLotId") REFERENCES "material_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_lot_genealogy" ADD CONSTRAINT "material_lot_genealogy_childLotId_fkey" FOREIGN KEY ("childLotId") REFERENCES "material_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_state_history" ADD CONSTRAINT "material_state_history_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "material_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_standardWorkInstructionId_fkey" FOREIGN KEY ("standardWorkInstructionId") REFERENCES "work_instructions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_parentOperationId_fkey" FOREIGN KEY ("parentOperationId") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_parameters" ADD CONSTRAINT "operation_parameters_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_parameters" ADD CONSTRAINT "operation_parameters_parameterGroupId_fkey" FOREIGN KEY ("parameterGroupId") REFERENCES "parameter_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_limits" ADD CONSTRAINT "parameter_limits_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "operation_parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_groups" ADD CONSTRAINT "parameter_groups_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "parameter_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_formulas" ADD CONSTRAINT "parameter_formulas_outputParameterId_fkey" FOREIGN KEY ("outputParameterId") REFERENCES "operation_parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_dependencies" ADD CONSTRAINT "operation_dependencies_dependentOperationId_fkey" FOREIGN KEY ("dependentOperationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_dependencies" ADD CONSTRAINT "operation_dependencies_prerequisiteOperationId_fkey" FOREIGN KEY ("prerequisiteOperationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_operation_specifications" ADD CONSTRAINT "personnel_operation_specifications_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_operation_specifications" ADD CONSTRAINT "equipment_operation_specifications_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_operation_specifications" ADD CONSTRAINT "material_operation_specifications_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_asset_operation_specifications" ADD CONSTRAINT "physical_asset_operation_specifications_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_replacementPartId_fkey" FOREIGN KEY ("replacementPartId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_site_availability" ADD CONSTRAINT "part_site_availability_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_site_availability" ADD CONSTRAINT "part_site_availability_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_parentPartId_fkey" FOREIGN KEY ("parentPartId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_componentPartId_fkey" FOREIGN KEY ("componentPartId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_configurations" ADD CONSTRAINT "product_configurations_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuration_options" ADD CONSTRAINT "configuration_options_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "product_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_lifecycle" ADD CONSTRAINT "product_lifecycle_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "routings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routings" ADD CONSTRAINT "routings_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routings" ADD CONSTRAINT "routings_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routings" ADD CONSTRAINT "routings_alternateForId_fkey" FOREIGN KEY ("alternateForId") REFERENCES "routings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_operations" ADD CONSTRAINT "routing_operations_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "routings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_operations" ADD CONSTRAINT "routing_operations_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_workInstructionId_fkey" FOREIGN KEY ("workInstructionId") REFERENCES "work_instructions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "routings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_step_dependencies" ADD CONSTRAINT "routing_step_dependencies_dependentStepId_fkey" FOREIGN KEY ("dependentStepId") REFERENCES "routing_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_step_dependencies" ADD CONSTRAINT "routing_step_dependencies_prerequisiteStepId_fkey" FOREIGN KEY ("prerequisiteStepId") REFERENCES "routing_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_step_parameters" ADD CONSTRAINT "routing_step_parameters_routingStepId_fkey" FOREIGN KEY ("routingStepId") REFERENCES "routing_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_templates" ADD CONSTRAINT "routing_templates_sourceRoutingId_fkey" FOREIGN KEY ("sourceRoutingId") REFERENCES "routings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_templates" ADD CONSTRAINT "routing_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_templates" ADD CONSTRAINT "routing_templates_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_centers" ADD CONSTRAINT "work_centers_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_units" ADD CONSTRAINT "work_units_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_operations" ADD CONSTRAINT "work_order_operations_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_operations" ADD CONSTRAINT "work_order_operations_routingOperationId_fkey" FOREIGN KEY ("routingOperationId") REFERENCES "routing_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_operations" ADD CONSTRAINT "work_order_operations_routingStepId_fkey" FOREIGN KEY ("routingStepId") REFERENCES "routing_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_schedules" ADD CONSTRAINT "production_schedules_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "production_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "routings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_constraints" ADD CONSTRAINT "schedule_constraints_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "schedule_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_state_history" ADD CONSTRAINT "schedule_state_history_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "production_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_status_history" ADD CONSTRAINT "work_order_status_history_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_logs" ADD CONSTRAINT "dispatch_logs_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_logs" ADD CONSTRAINT "dispatch_logs_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_logs" ADD CONSTRAINT "dispatch_logs_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_performance" ADD CONSTRAINT "work_performance_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_performance" ADD CONSTRAINT "work_performance_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "work_order_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_performance" ADD CONSTRAINT "work_performance_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_variances" ADD CONSTRAINT "production_variances_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_variances" ADD CONSTRAINT "production_variances_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "work_order_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_plans" ADD CONSTRAINT "quality_plans_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_characteristics" ADD CONSTRAINT "quality_characteristics_planId_fkey" FOREIGN KEY ("planId") REFERENCES "quality_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_planId_fkey" FOREIGN KEY ("planId") REFERENCES "quality_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_measurements" ADD CONSTRAINT "quality_measurements_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "quality_inspections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_measurements" ADD CONSTRAINT "quality_measurements_characteristicId_fkey" FOREIGN KEY ("characteristicId") REFERENCES "quality_characteristics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "quality_inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_parentEquipmentId_fkey" FOREIGN KEY ("parentEquipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_workUnitId_fkey" FOREIGN KEY ("workUnitId") REFERENCES "work_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_capabilities" ADD CONSTRAINT "equipment_capabilities_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_logs" ADD CONSTRAINT "equipment_logs_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_logs" ADD CONSTRAINT "equipment_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_state_history" ADD CONSTRAINT "equipment_state_history_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_performance_logs" ADD CONSTRAINT "equipment_performance_logs_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_transactions" ADD CONSTRAINT "material_transactions_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_transactions" ADD CONSTRAINT "material_transactions_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serialized_parts" ADD CONSTRAINT "serialized_parts_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_genealogy" ADD CONSTRAINT "part_genealogy_parentPartId_fkey" FOREIGN KEY ("parentPartId") REFERENCES "serialized_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_genealogy" ADD CONSTRAINT "part_genealogy_componentPartId_fkey" FOREIGN KEY ("componentPartId") REFERENCES "serialized_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instructions" ADD CONSTRAINT "work_instructions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instructions" ADD CONSTRAINT "work_instructions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instructions" ADD CONSTRAINT "work_instructions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instruction_steps" ADD CONSTRAINT "work_instruction_steps_workInstructionId_fkey" FOREIGN KEY ("workInstructionId") REFERENCES "work_instructions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instruction_executions" ADD CONSTRAINT "work_instruction_executions_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instruction_step_executions" ADD CONSTRAINT "work_instruction_step_executions_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "work_instruction_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_instruction_step_executions" ADD CONSTRAINT "work_instruction_step_executions_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electronic_signatures" ADD CONSTRAINT "electronic_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electronic_signatures" ADD CONSTRAINT "electronic_signatures_invalidatedById_fkey" FOREIGN KEY ("invalidatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fai_characteristics" ADD CONSTRAINT "fai_characteristics_faiReportId_fkey" FOREIGN KEY ("faiReportId") REFERENCES "fai_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_serializedPartId_fkey" FOREIGN KEY ("serializedPartId") REFERENCES "serialized_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_measurementEquipmentId_fkey" FOREIGN KEY ("measurementEquipmentId") REFERENCES "measurement_equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_download_logs" ADD CONSTRAINT "program_download_logs_programId_fkey" FOREIGN KEY ("programId") REFERENCES "cnc_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_gauge_requirements" ADD CONSTRAINT "operation_gauge_requirements_measurementEquipmentId_fkey" FOREIGN KEY ("measurementEquipmentId") REFERENCES "measurement_equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_schedule_requests" ADD CONSTRAINT "production_schedule_requests_configId_fkey" FOREIGN KEY ("configId") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_schedule_requests" ADD CONSTRAINT "production_schedule_requests_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_schedule_requests" ADD CONSTRAINT "production_schedule_requests_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_schedule_requests" ADD CONSTRAINT "production_schedule_requests_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_schedule_responses" ADD CONSTRAINT "production_schedule_responses_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "production_schedule_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_performance_actuals" ADD CONSTRAINT "production_performance_actuals_configId_fkey" FOREIGN KEY ("configId") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_performance_actuals" ADD CONSTRAINT "production_performance_actuals_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erp_material_transactions" ADD CONSTRAINT "erp_material_transactions_configId_fkey" FOREIGN KEY ("configId") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erp_material_transactions" ADD CONSTRAINT "erp_material_transactions_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erp_material_transactions" ADD CONSTRAINT "erp_material_transactions_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_info_exchanges" ADD CONSTRAINT "personnel_info_exchanges_configId_fkey" FOREIGN KEY ("configId") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_data_collections" ADD CONSTRAINT "equipment_data_collections_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_data_collections" ADD CONSTRAINT "equipment_data_collections_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_commands" ADD CONSTRAINT "equipment_commands_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_commands" ADD CONSTRAINT "equipment_commands_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_material_movements" ADD CONSTRAINT "equipment_material_movements_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_material_movements" ADD CONSTRAINT "equipment_material_movements_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_material_movements" ADD CONSTRAINT "equipment_material_movements_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_data_collections" ADD CONSTRAINT "process_data_collections_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_data_collections" ADD CONSTRAINT "process_data_collections_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_plans" ADD CONSTRAINT "qif_measurement_plans_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_plans" ADD CONSTRAINT "qif_measurement_plans_faiReportId_fkey" FOREIGN KEY ("faiReportId") REFERENCES "fai_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_characteristics" ADD CONSTRAINT "qif_characteristics_qifMeasurementPlanId_fkey" FOREIGN KEY ("qifMeasurementPlanId") REFERENCES "qif_measurement_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_results" ADD CONSTRAINT "qif_measurement_results_qifMeasurementPlanId_fkey" FOREIGN KEY ("qifMeasurementPlanId") REFERENCES "qif_measurement_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_results" ADD CONSTRAINT "qif_measurement_results_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_results" ADD CONSTRAINT "qif_measurement_results_serializedPartId_fkey" FOREIGN KEY ("serializedPartId") REFERENCES "serialized_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_results" ADD CONSTRAINT "qif_measurement_results_faiReportId_fkey" FOREIGN KEY ("faiReportId") REFERENCES "fai_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurement_results" ADD CONSTRAINT "qif_measurement_results_measurementDeviceId_fkey" FOREIGN KEY ("measurementDeviceId") REFERENCES "measurement_equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurements" ADD CONSTRAINT "qif_measurements_qifMeasurementResultId_fkey" FOREIGN KEY ("qifMeasurementResultId") REFERENCES "qif_measurement_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qif_measurements" ADD CONSTRAINT "qif_measurements_qifCharacteristicId_fkey" FOREIGN KEY ("qifCharacteristicId") REFERENCES "qif_characteristics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spc_configurations" ADD CONSTRAINT "spc_configurations_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "operation_parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spc_rule_violations" ADD CONSTRAINT "spc_rule_violations_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "spc_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_plans" ADD CONSTRAINT "sampling_plans_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "operation_parameters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_plans" ADD CONSTRAINT "sampling_plans_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_inspection_results" ADD CONSTRAINT "sampling_inspection_results_planId_fkey" FOREIGN KEY ("planId") REFERENCES "sampling_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

