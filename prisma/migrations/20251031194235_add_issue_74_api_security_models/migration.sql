-- CreateTable "api_permissions"
CREATE TABLE "api_permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable "api_roles"
CREATE TABLE "api_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable "api_role_permissions"
CREATE TABLE "api_role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "api_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable "api_key_roles"
CREATE TABLE "api_key_roles" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT NOT NULL,

    CONSTRAINT "api_key_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable "api_access_logs"
CREATE TABLE "api_access_logs" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "requestSize" INTEGER,
    "responseSize" INTEGER,
    "error" TEXT,
    "userId" TEXT,
    "requestId" TEXT,

    CONSTRAINT "api_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable "security_alerts"
CREATE TABLE "security_alerts" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_permissions_name_key" ON "api_permissions"("name");

-- CreateIndex
CREATE INDEX "api_permissions_scope_idx" ON "api_permissions"("scope");

-- CreateIndex
CREATE INDEX "api_permissions_resource_idx" ON "api_permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "api_roles_name_key" ON "api_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "api_role_permissions_roleId_permissionId_key" ON "api_role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "api_role_permissions_roleId_idx" ON "api_role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "api_role_permissions_permissionId_idx" ON "api_role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "api_key_roles_apiKeyId_roleId_key" ON "api_key_roles"("apiKeyId", "roleId");

-- CreateIndex
CREATE INDEX "api_key_roles_roleId_idx" ON "api_key_roles"("roleId");

-- CreateIndex
CREATE INDEX "api_access_logs_apiKeyId_idx" ON "api_access_logs"("apiKeyId");

-- CreateIndex
CREATE INDEX "api_access_logs_timestamp_idx" ON "api_access_logs"("timestamp");

-- CreateIndex
CREATE INDEX "api_access_logs_statusCode_idx" ON "api_access_logs"("statusCode");

-- CreateIndex
CREATE INDEX "security_alerts_apiKeyId_idx" ON "security_alerts"("apiKeyId");

-- CreateIndex
CREATE INDEX "security_alerts_detectedAt_idx" ON "security_alerts"("detectedAt");

-- CreateIndex
CREATE INDEX "security_alerts_severity_idx" ON "security_alerts"("severity");

-- AddForeignKey
ALTER TABLE "api_role_permissions" ADD CONSTRAINT "api_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "api_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_role_permissions" ADD CONSTRAINT "api_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "api_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_roles" ADD CONSTRAINT "api_key_roles_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_roles" ADD CONSTRAINT "api_key_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "api_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_access_logs" ADD CONSTRAINT "api_access_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
