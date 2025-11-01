-- CreateEnum for Material Movement & Logistics Management (Issue #64)

CREATE TYPE "MovementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_TRANSIT', 'AT_LOCATION', 'COMPLETED', 'CANCELLED', 'ON_HOLD');
CREATE TYPE "MovementPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "ForkliftRequestStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD', 'FAILED');
CREATE TYPE "ForkliftType" AS ENUM ('ELECTRIC_RIDER', 'INTERNAL_COMBUSTION', 'WALKIE_STACKER', 'REACH_TRUCK', 'TELEHANDLER', 'OTHER');
CREATE TYPE "ForkliftStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'RESERVED', 'DAMAGED', 'OFFLINE');
CREATE TYPE "ShipmentType" AS ENUM ('STANDARD', 'EXPEDITED', 'DROP_SHIP', 'INTERCOMPANY', 'RETURN', 'SAMPLE', 'CONSIGNMENT');
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'READY_TO_SHIP', 'PICKED', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
CREATE TYPE "ContainerType" AS ENUM ('PALLET', 'CARTON', 'CRATE', 'BIN', 'DRUM', 'TOTE', 'CUSTOM');
CREATE TYPE "ContainerStatus" AS ENUM ('EMPTY', 'LOADED', 'IN_TRANSIT', 'AT_LOCATION', 'DAMAGED');
CREATE TYPE "CarrierType" AS ENUM ('UPS', 'FEDEX', 'USPS', 'DHL', 'AMAZON_LOGISTICS', 'LAST_MILE', 'LTL', 'TRUCKLOAD', 'PARCEL', 'CUSTOM');

-- CreateTable "movement_types"
CREATE TABLE "movement_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "requiresCarrier" BOOLEAN NOT NULL DEFAULT false,
    "requiresPackingList" BOOLEAN NOT NULL DEFAULT false,
    "requiresForklift" BOOLEAN NOT NULL DEFAULT false,
    "autoPrintLabel" BOOLEAN NOT NULL DEFAULT false,
    "defaultCarrier" TEXT,
    "estimatedDuration" INTEGER,
    "trackCost" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "movement_types_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE,
    UNIQUE("siteId", "code")
);

CREATE INDEX "movement_types_siteId_idx" ON "movement_types"("siteId");

-- CreateTable "forklifts" (must come before material_movements which references it)
CREATE TABLE "forklifts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "equipmentNumber" TEXT NOT NULL,
    "forkliftType" "ForkliftType" NOT NULL,
    "status" "ForkliftStatus" NOT NULL DEFAULT 'ACTIVE',
    "make" TEXT,
    "model" TEXT,
    "yearManufactured" INTEGER,
    "serialNumber" TEXT,
    "capacityLbs" INTEGER,
    "maxLiftHeightInches" INTEGER,
    "currentLocationId" TEXT,
    "currentOperatorId" TEXT,
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "meterHours" INTEGER,
    "fuelType" TEXT,
    "hasGPS" BOOLEAN DEFAULT false,
    "lastGPSLocation" JSONB,
    "lastGPSUpdateAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "forklifts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE,
    CONSTRAINT "forklifts_currentOperatorId_fkey" FOREIGN KEY ("currentOperatorId") REFERENCES "users" ("id") ON DELETE SET NULL,
    UNIQUE("siteId", "equipmentNumber")
);

CREATE INDEX "forklifts_siteId_idx" ON "forklifts"("siteId");
CREATE INDEX "forklifts_status_idx" ON "forklifts"("status");

-- CreateTable "carrier_accounts" (must come before shipments)
CREATE TABLE "carrier_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "carrierType" "CarrierType" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB,
    "apiEndpoint" TEXT,
    "apiKey" TEXT,
    "apiUsername" TEXT,
    "apiPassword" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "carrier_accounts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE,
    UNIQUE("siteId", "carrierType", "accountNumber")
);

CREATE INDEX "carrier_accounts_siteId_idx" ON "carrier_accounts"("siteId");
CREATE INDEX "carrier_accounts_carrierType_idx" ON "carrier_accounts"("carrierType");

-- CreateTable "shipments"
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "shipmentType" "ShipmentType" NOT NULL DEFAULT 'STANDARD',
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "shipFromAddressId" TEXT,
    "shipToAddressId" TEXT,
    "billToAddressId" TEXT,
    "shipFromCompanyName" TEXT,
    "shipToCompanyName" TEXT,
    "shipFromContactId" TEXT,
    "shipToContactId" TEXT,
    "carrierType" "CarrierType" NOT NULL,
    "carrierAccountId" TEXT,
    "trackingNumber" TEXT,
    "estimatedDeliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "totalWeight" DECIMAL(15, 3),
    "totalDimensions" JSONB,
    "totalValue" DECIMAL(15, 2),
    "carrierServiceType" TEXT,
    "insuranceRequired" BOOLEAN DEFAULT false,
    "internationalShipment" BOOLEAN DEFAULT false,
    "customsDocuments" JSONB,
    "deliveryInstructions" TEXT,
    "specialHandling" JSONB,
    "containerId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shipments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE,
    CONSTRAINT "shipments_carrierAccountId_fkey" FOREIGN KEY ("carrierAccountId") REFERENCES "carrier_accounts" ("id") ON DELETE SET NULL,
    UNIQUE("siteId", "shipmentNumber")
);

CREATE INDEX "shipments_siteId_idx" ON "shipments"("siteId");
CREATE INDEX "shipments_status_idx" ON "shipments"("status");
CREATE INDEX "shipments_trackingNumber_idx" ON "shipments"("trackingNumber");
CREATE INDEX "shipments_createdAt_idx" ON "shipments"("createdAt");

-- CreateTable "shipping_labels"
CREATE TABLE "shipping_labels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "labelNumber" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "labelFormat" TEXT,
    "labelImage" BYTEA,
    "labelURL" TEXT,
    "printed" BOOLEAN DEFAULT false,
    "printedAt" TIMESTAMP(3),
    "printedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipping_labels_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments" ("id") ON DELETE CASCADE
);

CREATE INDEX "shipping_labels_shipmentId_idx" ON "shipping_labels"("shipmentId");
CREATE INDEX "shipping_labels_trackingNumber_idx" ON "shipping_labels"("trackingNumber");

-- CreateTable "containers"
CREATE TABLE "containers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "containerNumber" TEXT NOT NULL,
    "containerType" "ContainerType" NOT NULL,
    "status" "ContainerStatus" NOT NULL DEFAULT 'EMPTY',
    "capacity" DECIMAL(20, 8),
    "capacityUnitOfMeasure" TEXT,
    "currentQuantity" DECIMAL(20, 8),
    "currentLocation" TEXT,
    "lastMovementTime" TIMESTAMP(3),
    "ownershipType" TEXT,
    "dimensions" JSONB,
    "weight" DECIMAL(15, 3),
    "palletId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "containers_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE,
    UNIQUE("siteId", "containerNumber")
);

CREATE INDEX "containers_siteId_idx" ON "containers"("siteId");
CREATE INDEX "containers_status_idx" ON "containers"("status");

-- CreateTable "material_movements"
CREATE TABLE "material_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "movementTypeId" TEXT NOT NULL,
    "status" "MovementStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "MovementPriority" NOT NULL DEFAULT 'NORMAL',
    "movementNumber" TEXT NOT NULL,
    "description" TEXT,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "fromSiteId" TEXT,
    "toSiteId" TEXT,
    "workOrderIds" JSONB,
    "containerIds" JSONB,
    "palletIds" JSONB,
    "partNumber" TEXT,
    "lotNumber" TEXT,
    "quantity" DECIMAL(20, 8),
    "unitOfMeasure" TEXT,
    "forkliftId" TEXT,
    "forkliftOperatorId" TEXT,
    "forkliftRequestId" TEXT,
    "shipmentId" TEXT,
    "trackingNumber" TEXT,
    "carrier" TEXT,
    "carrierId" TEXT,
    "estimatedStartTime" TIMESTAMP(3),
    "actualStartTime" TIMESTAMP(3),
    "estimatedCompletionTime" TIMESTAMP(3),
    "actualCompletionTime" TIMESTAMP(3),
    "cost" DECIMAL(15, 2),
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "approvalTimestamp" TIMESTAMP(3),
    "notes" TEXT,
    "trackingEvents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "material_movements_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE,
    CONSTRAINT "material_movements_movementTypeId_fkey" FOREIGN KEY ("movementTypeId") REFERENCES "movement_types" ("id") ON DELETE RESTRICT,
    CONSTRAINT "material_movements_forkliftId_fkey" FOREIGN KEY ("forkliftId") REFERENCES "forklifts" ("id") ON DELETE SET NULL,
    CONSTRAINT "material_movements_forkliftOperatorId_fkey" FOREIGN KEY ("forkliftOperatorId") REFERENCES "users" ("id") ON DELETE SET NULL,
    CONSTRAINT "material_movements_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments" ("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "material_movements_movementNumber_siteId_key" ON "material_movements"("movementNumber", "siteId");
CREATE INDEX "material_movements_siteId_idx" ON "material_movements"("siteId");
CREATE INDEX "material_movements_movementTypeId_idx" ON "material_movements"("movementTypeId");
CREATE INDEX "material_movements_status_idx" ON "material_movements"("status");
CREATE INDEX "material_movements_priority_idx" ON "material_movements"("priority");
CREATE INDEX "material_movements_createdAt_idx" ON "material_movements"("createdAt");

-- CreateTable "forklift_move_requests"
CREATE TABLE "forklift_move_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "status" "ForkliftRequestStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "MovementPriority" NOT NULL DEFAULT 'NORMAL',
    "sourceLocationId" TEXT,
    "destinationLocationId" TEXT,
    "containerIds" JSONB,
    "palletIds" JSONB,
    "assignedForkliftId" TEXT,
    "operatorId" TEXT,
    "estimatedStartTime" TIMESTAMP(3),
    "actualStartTime" TIMESTAMP(3),
    "estimatedCompletionTime" TIMESTAMP(3),
    "actualCompletionTime" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "forklift_move_requests_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites" ("id") ON DELETE CASCADE,
    CONSTRAINT "forklift_move_requests_assignedForkliftId_fkey" FOREIGN KEY ("assignedForkliftId") REFERENCES "forklifts" ("id") ON DELETE SET NULL,
    CONSTRAINT "forklift_move_requests_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users" ("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "forklift_move_requests_requestNumber_siteId_key" ON "forklift_move_requests"("requestNumber", "siteId");
CREATE INDEX "forklift_move_requests_siteId_idx" ON "forklift_move_requests"("siteId");
CREATE INDEX "forklift_move_requests_status_idx" ON "forklift_move_requests"("status");
CREATE INDEX "forklift_move_requests_priority_idx" ON "forklift_move_requests"("priority");

-- Add relations to existing Site model
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "_movementTypesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "_forkliftCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "_containersCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "_carrierAccountsCount" INTEGER NOT NULL DEFAULT 0;

-- Add relations to existing User model
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "_forkliftRequestsAssignedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "_forkliftCurrentOperationCount" INTEGER NOT NULL DEFAULT 0;
