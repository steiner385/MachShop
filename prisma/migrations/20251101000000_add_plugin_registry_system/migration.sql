-- CreateEnum PluginRegistryType
CREATE TYPE "PluginRegistryType" AS ENUM ('ENTERPRISE', 'SITE', 'DEVELOPER');

-- CreateEnum PluginPackageStatus
CREATE TYPE "PluginPackageStatus" AS ENUM ('PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'DEPRECATED', 'REVOKED');

-- CreateEnum PluginInstallationStatus
CREATE TYPE "PluginInstallationStatus" AS ENUM ('INSTALLING', 'INSTALLED', 'ACTIVE', 'INACTIVE', 'FAILED', 'UNINSTALLING', 'UNINSTALLED');

-- CreateEnum PluginLicenseType
CREATE TYPE "PluginLicenseType" AS ENUM ('FREE', 'TRIAL', 'SITE', 'ENTERPRISE', 'DEVELOPER');

-- CreateEnum PluginDeploymentType
CREATE TYPE "PluginDeploymentType" AS ENUM ('INSTALL', 'UPGRADE', 'ROLLBACK', 'UNINSTALL');

-- CreateEnum PluginDeploymentStatus
CREATE TYPE "PluginDeploymentStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'ROLLED_BACK');

-- CreateTable PluginRegistry
CREATE TABLE "plugin_registries" (
    "id" TEXT NOT NULL,
    "type" "PluginRegistryType" NOT NULL,
    "name" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "storageBucket" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "enterpriseId" TEXT,
    "siteId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_registries_pkey" PRIMARY KEY ("id")
);

-- CreateTable PluginPackage
CREATE TABLE "plugin_packages" (
    "id" TEXT NOT NULL,
    "registryId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "author" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "packageUrl" TEXT NOT NULL,
    "packageSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "apiVersion" TEXT NOT NULL,
    "mesVersion" TEXT NOT NULL,
    "permissions" TEXT[],
    "dependencies" JSONB,
    "status" "PluginPackageStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable PluginInstallation
CREATE TABLE "plugin_installations" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "installedVersion" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installedBy" TEXT NOT NULL,
    "status" "PluginInstallationStatus" NOT NULL DEFAULT 'INSTALLED',
    "activatedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "configuration" JSONB,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorAt" TIMESTAMP(3),
    "lastHealthCheck" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "licenseKey" TEXT,
    "licenseExpires" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable PluginHealthLog
CREATE TABLE "plugin_health_logs" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "avgExecutionTime" INTEGER,
    "memoryUsage" INTEGER,
    "cpuUsage" DECIMAL(5,2),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_health_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable PluginLicense
CREATE TABLE "plugin_licenses" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "licenseType" "PluginLicenseType" NOT NULL,
    "organizationId" TEXT,
    "enterpriseId" TEXT,
    "siteId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxInstallations" INTEGER,
    "currentInstallations" INTEGER NOT NULL DEFAULT 0,
    "issuedBy" TEXT NOT NULL,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable PluginReview
CREATE TABLE "plugin_reviews" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "reviewerId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable PluginDeployment
CREATE TABLE "plugin_deployments" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "deploymentType" "PluginDeploymentType" NOT NULL,
    "targetSites" TEXT[],
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "PluginDeploymentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "canRollback" BOOLEAN NOT NULL DEFAULT true,
    "rolledBackAt" TIMESTAMP(3),
    "rollbackReason" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable PluginSubmission
CREATE TABLE "plugin_submissions" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "packageUrl" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plugin_registries_type_idx" ON "plugin_registries"("type");

-- CreateIndex
CREATE INDEX "plugin_registries_organizationId_idx" ON "plugin_registries"("organizationId");

-- CreateIndex
CREATE INDEX "plugin_registries_enterpriseId_idx" ON "plugin_registries"("enterpriseId");

-- CreateIndex
CREATE INDEX "plugin_registries_siteId_idx" ON "plugin_registries"("siteId");

-- CreateIndex
CREATE INDEX "plugin_registries_isActive_idx" ON "plugin_registries"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_packages_registryId_pluginId_version_key" ON "plugin_packages"("registryId", "pluginId", "version");

-- CreateIndex
CREATE INDEX "plugin_packages_pluginId_idx" ON "plugin_packages"("pluginId");

-- CreateIndex
CREATE INDEX "plugin_packages_status_idx" ON "plugin_packages"("status");

-- CreateIndex
CREATE INDEX "plugin_packages_uploadedAt_idx" ON "plugin_packages"("uploadedAt");

-- CreateIndex
CREATE INDEX "plugin_packages_installCount_idx" ON "plugin_packages"("installCount");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_installations_packageId_siteId_key" ON "plugin_installations"("packageId", "siteId");

-- CreateIndex
CREATE INDEX "plugin_installations_siteId_idx" ON "plugin_installations"("siteId");

-- CreateIndex
CREATE INDEX "plugin_installations_status_idx" ON "plugin_installations"("status");

-- CreateIndex
CREATE INDEX "plugin_installations_licenseExpires_idx" ON "plugin_installations"("licenseExpires");

-- CreateIndex
CREATE INDEX "plugin_health_logs_installationId_idx" ON "plugin_health_logs"("installationId");

-- CreateIndex
CREATE INDEX "plugin_health_logs_recordedAt_idx" ON "plugin_health_logs"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_licenses_licenseKey_key" ON "plugin_licenses"("licenseKey");

-- CreateIndex
CREATE INDEX "plugin_licenses_packageId_idx" ON "plugin_licenses"("packageId");

-- CreateIndex
CREATE INDEX "plugin_licenses_licenseKey_idx" ON "plugin_licenses"("licenseKey");

-- CreateIndex
CREATE INDEX "plugin_licenses_expiresAt_idx" ON "plugin_licenses"("expiresAt");

-- CreateIndex
CREATE INDEX "plugin_licenses_isActive_idx" ON "plugin_licenses"("isActive");

-- CreateIndex
CREATE INDEX "plugin_reviews_packageId_idx" ON "plugin_reviews"("packageId");

-- CreateIndex
CREATE INDEX "plugin_reviews_siteId_idx" ON "plugin_reviews"("siteId");

-- CreateIndex
CREATE INDEX "plugin_reviews_rating_idx" ON "plugin_reviews"("rating");

-- CreateIndex
CREATE INDEX "plugin_deployments_packageId_idx" ON "plugin_deployments"("packageId");

-- CreateIndex
CREATE INDEX "plugin_deployments_status_idx" ON "plugin_deployments"("status");

-- CreateIndex
CREATE INDEX "plugin_deployments_scheduledFor_idx" ON "plugin_deployments"("scheduledFor");

-- CreateIndex
CREATE INDEX "plugin_deployments_createdAt_idx" ON "plugin_deployments"("createdAt");

-- CreateIndex
CREATE INDEX "plugin_submissions_pluginId_idx" ON "plugin_submissions"("pluginId");

-- CreateIndex
CREATE INDEX "plugin_submissions_submittedAt_idx" ON "plugin_submissions"("submittedAt");

-- AddForeignKey
ALTER TABLE "plugin_packages" ADD CONSTRAINT "plugin_packages_registryId_fkey" FOREIGN KEY ("registryId") REFERENCES "plugin_registries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_installations" ADD CONSTRAINT "plugin_installations_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "plugin_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_installations" ADD CONSTRAINT "plugin_installations_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_health_logs" ADD CONSTRAINT "plugin_health_logs_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "plugin_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_licenses" ADD CONSTRAINT "plugin_licenses_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "plugin_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_reviews" ADD CONSTRAINT "plugin_reviews_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "plugin_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_deployments" ADD CONSTRAINT "plugin_deployments_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "plugin_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
