-- CreateEnum
CREATE TYPE "ElectronicSignatureType" AS ENUM ('BASIC', 'ADVANCED', 'QUALIFIED');

-- CreateEnum
CREATE TYPE "ElectronicSignatureLevel" AS ENUM ('OPERATOR', 'SUPERVISOR', 'QUALITY', 'ENGINEER', 'MANAGER');

-- CreateEnum
CREATE TYPE "BiometricType" AS ENUM ('FINGERPRINT', 'FACIAL', 'IRIS', 'VOICE', 'NONE');

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

-- CreateIndex
CREATE INDEX "electronic_signatures_userId_idx" ON "electronic_signatures"("userId");

-- CreateIndex
CREATE INDEX "electronic_signatures_signedEntityType_signedEntityId_idx" ON "electronic_signatures"("signedEntityType", "signedEntityId");

-- CreateIndex
CREATE INDEX "electronic_signatures_timestamp_idx" ON "electronic_signatures"("timestamp");

-- AddForeignKey
ALTER TABLE "electronic_signatures" ADD CONSTRAINT "electronic_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electronic_signatures" ADD CONSTRAINT "electronic_signatures_invalidatedById_fkey" FOREIGN KEY ("invalidatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
