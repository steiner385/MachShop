/*
  Warnings:

  - A unique constraint covering the columns `[employeeNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
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
CREATE TYPE "ProcessSegmentType" AS ENUM ('PRODUCTION', 'QUALITY', 'MATERIAL_HANDLING', 'MAINTENANCE', 'SETUP', 'CLEANING', 'PACKAGING', 'TESTING', 'REWORK', 'OTHER');

-- CreateEnum
CREATE TYPE "ParameterType" AS ENUM ('INPUT', 'OUTPUT', 'SET_POINT', 'MEASURED', 'CALCULATED');

-- CreateEnum
CREATE TYPE "ParameterDataType" AS ENUM ('NUMBER', 'STRING', 'BOOLEAN', 'ENUM', 'DATE', 'JSON');

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
CREATE TYPE "ScheduleType" AS ENUM ('MASTER', 'DETAILED', 'DISPATCH');

-- CreateEnum
CREATE TYPE "B2MMessageStatus" AS ENUM ('PENDING', 'VALIDATED', 'PROCESSING', 'PROCESSED', 'SENT', 'CONFIRMED', 'FAILED', 'REJECTED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "ERPTransactionType" AS ENUM ('ISSUE', 'RECEIPT', 'RETURN', 'TRANSFER', 'ADJUSTMENT', 'SCRAP', 'CONSUMPTION');

-- CreateEnum
CREATE TYPE "PersonnelActionType" AS ENUM ('CREATE', 'UPDATE', 'DEACTIVATE', 'SKILL_UPDATE', 'SCHEDULE_UPDATE');

-- AlterTable
ALTER TABLE "bom_items" ADD COLUMN     "ecoNumber" TEXT,
ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ADD COLUMN     "findNumber" TEXT,
ADD COLUMN     "isCritical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOptional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "obsoleteDate" TIMESTAMP(3),
ADD COLUMN     "operationNumber" INTEGER,
ADD COLUMN     "processSegmentId" TEXT,
ADD COLUMN     "referenceDesignator" TEXT,
ADD COLUMN     "scrapFactor" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "parts" ADD COLUMN     "cadModelUrl" TEXT,
ADD COLUMN     "currency" TEXT DEFAULT 'USD',
ADD COLUMN     "isConfigurable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leadTimeDays" INTEGER,
ADD COLUMN     "lifecycleState" "ProductLifecycleState" NOT NULL DEFAULT 'PRODUCTION',
ADD COLUMN     "lotSizeMin" INTEGER,
ADD COLUMN     "lotSizeMultiple" INTEGER,
ADD COLUMN     "makeOrBuy" TEXT DEFAULT 'MAKE',
ADD COLUMN     "obsoleteDate" TIMESTAMP(3),
ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'MADE_TO_STOCK',
ADD COLUMN     "releaseDate" TIMESTAMP(3),
ADD COLUMN     "replacementPartId" TEXT,
ADD COLUMN     "requiresFAI" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "standardCost" DOUBLE PRECISION,
ADD COLUMN     "targetCost" DOUBLE PRECISION,
ADD COLUMN     "weight" DOUBLE PRECISION,
ADD COLUMN     "weightUnit" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "costCenter" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "employeeNumber" TEXT,
ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "laborRate" DOUBLE PRECISION,
ADD COLUMN     "personnelClassId" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "supervisorId" TEXT,
ADD COLUMN     "terminationDate" TIMESTAMP(3);

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
CREATE TABLE "process_segments" (
    "id" TEXT NOT NULL,
    "segmentCode" TEXT NOT NULL,
    "segmentName" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "parentSegmentId" TEXT,
    "segmentType" "ProcessSegmentType" NOT NULL,
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

    CONSTRAINT "process_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_segment_parameters" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
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

    CONSTRAINT "process_segment_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_segment_dependencies" (
    "id" TEXT NOT NULL,
    "dependentSegmentId" TEXT NOT NULL,
    "prerequisiteSegmentId" TEXT NOT NULL,
    "dependencyType" "DependencyType" NOT NULL,
    "timingType" "DependencyTimingType" NOT NULL,
    "lagTime" INTEGER,
    "leadTime" INTEGER,
    "condition" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_segment_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_segment_specifications" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
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

    CONSTRAINT "personnel_segment_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_segment_specifications" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
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

    CONSTRAINT "equipment_segment_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_segment_specifications" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
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

    CONSTRAINT "material_segment_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_asset_segment_specifications" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
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

    CONSTRAINT "physical_asset_segment_specifications_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "process_segments_segmentCode_key" ON "process_segments"("segmentCode");

-- CreateIndex
CREATE INDEX "process_segments_parentSegmentId_idx" ON "process_segments"("parentSegmentId");

-- CreateIndex
CREATE INDEX "process_segments_segmentType_idx" ON "process_segments"("segmentType");

-- CreateIndex
CREATE INDEX "process_segments_level_idx" ON "process_segments"("level");

-- CreateIndex
CREATE INDEX "process_segments_isActive_idx" ON "process_segments"("isActive");

-- CreateIndex
CREATE INDEX "process_segment_parameters_segmentId_idx" ON "process_segment_parameters"("segmentId");

-- CreateIndex
CREATE INDEX "process_segment_parameters_parameterType_idx" ON "process_segment_parameters"("parameterType");

-- CreateIndex
CREATE UNIQUE INDEX "process_segment_parameters_segmentId_parameterName_key" ON "process_segment_parameters"("segmentId", "parameterName");

-- CreateIndex
CREATE INDEX "process_segment_dependencies_dependentSegmentId_idx" ON "process_segment_dependencies"("dependentSegmentId");

-- CreateIndex
CREATE INDEX "process_segment_dependencies_prerequisiteSegmentId_idx" ON "process_segment_dependencies"("prerequisiteSegmentId");

-- CreateIndex
CREATE UNIQUE INDEX "process_segment_dependencies_dependentSegmentId_prerequisit_key" ON "process_segment_dependencies"("dependentSegmentId", "prerequisiteSegmentId");

-- CreateIndex
CREATE INDEX "personnel_segment_specifications_segmentId_idx" ON "personnel_segment_specifications"("segmentId");

-- CreateIndex
CREATE INDEX "personnel_segment_specifications_personnelClassId_idx" ON "personnel_segment_specifications"("personnelClassId");

-- CreateIndex
CREATE INDEX "equipment_segment_specifications_segmentId_idx" ON "equipment_segment_specifications"("segmentId");

-- CreateIndex
CREATE INDEX "equipment_segment_specifications_equipmentClass_idx" ON "equipment_segment_specifications"("equipmentClass");

-- CreateIndex
CREATE INDEX "material_segment_specifications_segmentId_idx" ON "material_segment_specifications"("segmentId");

-- CreateIndex
CREATE INDEX "material_segment_specifications_materialDefinitionId_idx" ON "material_segment_specifications"("materialDefinitionId");

-- CreateIndex
CREATE INDEX "physical_asset_segment_specifications_segmentId_idx" ON "physical_asset_segment_specifications"("segmentId");

-- CreateIndex
CREATE INDEX "physical_asset_segment_specifications_assetType_idx" ON "physical_asset_segment_specifications"("assetType");

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
CREATE INDEX "bom_items_parentPartId_idx" ON "bom_items"("parentPartId");

-- CreateIndex
CREATE INDEX "bom_items_componentPartId_idx" ON "bom_items"("componentPartId");

-- CreateIndex
CREATE INDEX "bom_items_processSegmentId_idx" ON "bom_items"("processSegmentId");

-- CreateIndex
CREATE INDEX "bom_items_effectiveDate_idx" ON "bom_items"("effectiveDate");

-- CreateIndex
CREATE INDEX "parts_productType_idx" ON "parts"("productType");

-- CreateIndex
CREATE INDEX "parts_lifecycleState_idx" ON "parts"("lifecycleState");

-- CreateIndex
CREATE INDEX "parts_isActive_idx" ON "parts"("isActive");

-- CreateIndex
CREATE INDEX "parts_partNumber_idx" ON "parts"("partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeNumber_key" ON "users"("employeeNumber");

-- CreateIndex
CREATE INDEX "users_employeeNumber_idx" ON "users"("employeeNumber");

-- CreateIndex
CREATE INDEX "users_personnelClassId_idx" ON "users"("personnelClassId");

-- CreateIndex
CREATE INDEX "users_supervisorId_idx" ON "users"("supervisorId");

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
ALTER TABLE "process_segments" ADD CONSTRAINT "process_segments_parentSegmentId_fkey" FOREIGN KEY ("parentSegmentId") REFERENCES "process_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_segment_parameters" ADD CONSTRAINT "process_segment_parameters_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "process_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_segment_dependencies" ADD CONSTRAINT "process_segment_dependencies_dependentSegmentId_fkey" FOREIGN KEY ("dependentSegmentId") REFERENCES "process_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_segment_dependencies" ADD CONSTRAINT "process_segment_dependencies_prerequisiteSegmentId_fkey" FOREIGN KEY ("prerequisiteSegmentId") REFERENCES "process_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_segment_specifications" ADD CONSTRAINT "personnel_segment_specifications_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "process_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_segment_specifications" ADD CONSTRAINT "equipment_segment_specifications_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "process_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_segment_specifications" ADD CONSTRAINT "material_segment_specifications_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "process_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_asset_segment_specifications" ADD CONSTRAINT "physical_asset_segment_specifications_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "process_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_replacementPartId_fkey" FOREIGN KEY ("replacementPartId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_processSegmentId_fkey" FOREIGN KEY ("processSegmentId") REFERENCES "process_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_configurations" ADD CONSTRAINT "product_configurations_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuration_options" ADD CONSTRAINT "configuration_options_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "product_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_lifecycle" ADD CONSTRAINT "product_lifecycle_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
