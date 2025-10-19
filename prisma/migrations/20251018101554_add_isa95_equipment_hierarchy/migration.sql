-- AlterTable
ALTER TABLE "equipment" ADD COLUMN     "workUnitId" TEXT;

-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "enterpriseId" TEXT;

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

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_enterpriseCode_key" ON "enterprises"("enterpriseCode");

-- CreateIndex
CREATE UNIQUE INDEX "work_units_workUnitCode_key" ON "work_units"("workUnitCode");

-- CreateIndex
CREATE INDEX "work_units_workCenterId_idx" ON "work_units"("workCenterId");

-- CreateIndex
CREATE INDEX "equipment_capabilities_equipmentId_idx" ON "equipment_capabilities"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_capabilities_capabilityType_idx" ON "equipment_capabilities"("capabilityType");

-- CreateIndex
CREATE INDEX "equipment_capabilities_capability_idx" ON "equipment_capabilities"("capability");

-- CreateIndex
CREATE INDEX "equipment_workUnitId_idx" ON "equipment"("workUnitId");

-- CreateIndex
CREATE INDEX "sites_enterpriseId_idx" ON "sites"("enterpriseId");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_units" ADD CONSTRAINT "work_units_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_workUnitId_fkey" FOREIGN KEY ("workUnitId") REFERENCES "work_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_capabilities" ADD CONSTRAINT "equipment_capabilities_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
