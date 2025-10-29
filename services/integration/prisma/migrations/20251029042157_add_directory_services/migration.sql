-- CreateEnum
CREATE TYPE "DirectoryType" AS ENUM ('LDAP', 'OPENLDAP', 'ACTIVE_DIRECTORY', 'AZURE_AD');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('FULL', 'INCREMENTAL', 'USERS_ONLY', 'GROUPS_ONLY');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DirectoryConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DirectoryType" NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 389,
    "useSSL" BOOLEAN NOT NULL DEFAULT false,
    "useStartTLS" BOOLEAN NOT NULL DEFAULT false,
    "baseDN" TEXT NOT NULL,
    "bindDN" TEXT,
    "bindPassword" TEXT,
    "userSearchBase" TEXT NOT NULL,
    "userSearchFilter" TEXT DEFAULT '(objectClass=person)',
    "groupSearchBase" TEXT,
    "groupSearchFilter" TEXT DEFAULT '(objectClass=group)',
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "maxConnections" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enableSync" BOOLEAN NOT NULL DEFAULT false,
    "syncInterval" INTEGER NOT NULL DEFAULT 3600,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryUserMapping" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "ldapAttribute" TEXT NOT NULL,
    "mesField" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isIdentity" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "transform" TEXT,
    "transformConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryUserMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryGroupMapping" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "groupDN" TEXT NOT NULL,
    "groupName" TEXT,
    "roleId" TEXT NOT NULL,
    "siteId" TEXT,
    "autoAssign" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryGroupMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectorySyncLog" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "type" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "batchId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "usersProcessed" INTEGER NOT NULL DEFAULT 0,
    "usersCreated" INTEGER NOT NULL DEFAULT 0,
    "usersUpdated" INTEGER NOT NULL DEFAULT 0,
    "usersDeactivated" INTEGER NOT NULL DEFAULT 0,
    "groupsProcessed" INTEGER NOT NULL DEFAULT 0,
    "rolesAssigned" INTEGER NOT NULL DEFAULT 0,
    "rolesRevoked" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "errors" JSONB,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectorySyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryConfig_name_key" ON "DirectoryConfig"("name");

-- CreateIndex
CREATE INDEX "DirectoryConfig_type_idx" ON "DirectoryConfig"("type");

-- CreateIndex
CREATE INDEX "DirectoryConfig_isActive_idx" ON "DirectoryConfig"("isActive");

-- CreateIndex
CREATE INDEX "DirectoryConfig_enableSync_idx" ON "DirectoryConfig"("enableSync");

-- CreateIndex
CREATE INDEX "DirectoryUserMapping_configId_idx" ON "DirectoryUserMapping"("configId");

-- CreateIndex
CREATE INDEX "DirectoryUserMapping_mesField_idx" ON "DirectoryUserMapping"("mesField");

-- CreateIndex
CREATE INDEX "DirectoryUserMapping_isIdentity_idx" ON "DirectoryUserMapping"("isIdentity");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryUserMapping_configId_ldapAttribute_key" ON "DirectoryUserMapping"("configId", "ldapAttribute");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryUserMapping_configId_mesField_key" ON "DirectoryUserMapping"("configId", "mesField");

-- CreateIndex
CREATE INDEX "DirectoryGroupMapping_configId_idx" ON "DirectoryGroupMapping"("configId");

-- CreateIndex
CREATE INDEX "DirectoryGroupMapping_roleId_idx" ON "DirectoryGroupMapping"("roleId");

-- CreateIndex
CREATE INDEX "DirectoryGroupMapping_siteId_idx" ON "DirectoryGroupMapping"("siteId");

-- CreateIndex
CREATE INDEX "DirectoryGroupMapping_isActive_idx" ON "DirectoryGroupMapping"("isActive");

-- CreateIndex
CREATE INDEX "DirectoryGroupMapping_priority_idx" ON "DirectoryGroupMapping"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryGroupMapping_configId_groupDN_roleId_siteId_key" ON "DirectoryGroupMapping"("configId", "groupDN", "roleId", "siteId");

-- CreateIndex
CREATE INDEX "DirectorySyncLog_configId_idx" ON "DirectorySyncLog"("configId");

-- CreateIndex
CREATE INDEX "DirectorySyncLog_type_idx" ON "DirectorySyncLog"("type");

-- CreateIndex
CREATE INDEX "DirectorySyncLog_status_idx" ON "DirectorySyncLog"("status");

-- CreateIndex
CREATE INDEX "DirectorySyncLog_batchId_idx" ON "DirectorySyncLog"("batchId");

-- CreateIndex
CREATE INDEX "DirectorySyncLog_startedAt_idx" ON "DirectorySyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "DirectorySyncLog_completedAt_idx" ON "DirectorySyncLog"("completedAt");

-- AddForeignKey
ALTER TABLE "DirectoryUserMapping" ADD CONSTRAINT "DirectoryUserMapping_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DirectoryConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryGroupMapping" ADD CONSTRAINT "DirectoryGroupMapping_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DirectoryConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorySyncLog" ADD CONSTRAINT "DirectorySyncLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DirectoryConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;