-- CreateEnum for API Access Control
CREATE TYPE "ApiTier" AS ENUM ('PUBLIC', 'SDK', 'PRIVATE');
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'PENDING_APPROVAL');
CREATE TYPE "TokenType" AS ENUM ('ACCESS_TOKEN', 'REFRESH_TOKEN');

-- CreateTable api_keys
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" "ApiTier" NOT NULL DEFAULT 'PUBLIC',
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "siteId" TEXT,
    "companyId" TEXT,
    "pluginId" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "dailyQuota" INTEGER,
    "monthlyQuota" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedEndpoint" TEXT,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "developerName" TEXT,
    "developerEmail" TEXT,
    "developerCompany" TEXT,
    "developerPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable api_usage_logs
CREATE TABLE "api_usage_logs" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "httpMethod" TEXT NOT NULL,
    "apiVersion" TEXT,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "rateLimitRemaining" INTEGER,
    "rateLimitReset" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "requestBytes" INTEGER,
    "responseBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable rate_limit_configs
CREATE TABLE "rate_limit_configs" (
    "id" TEXT NOT NULL,
    "tier" "ApiTier" NOT NULL,
    "resource" TEXT,
    "requestsPerMinute" INTEGER NOT NULL DEFAULT 100,
    "requestsPerHour" INTEGER,
    "requestsPerDay" INTEGER,
    "burstMultiplier" DECIMAL(65,30) NOT NULL DEFAULT 2.0,
    "burstDuration" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "siteId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable oauth_clients
CREATE TABLE "oauth_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "grantTypes" TEXT[] DEFAULT ARRAY['authorization_code']::TEXT[],
    "redirectUris" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tier" "ApiTier" NOT NULL DEFAULT 'PUBLIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable oauth_authorizations
CREATE TABLE "oauth_authorizations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable oauth_tokens
CREATE TABLE "oauth_tokens" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "tokenType" "TokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "refreshTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable api_endpoint_tiers
CREATE TABLE "api_endpoint_tiers" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "httpMethod" TEXT NOT NULL,
    "tier" "ApiTier" NOT NULL,
    "description" TEXT,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "deprecationDate" TIMESTAMP(3),
    "replacementEndpoint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_endpoint_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for api_keys
CREATE UNIQUE INDEX "api_keys_keyPrefix_key" ON "api_keys"("keyPrefix");
CREATE INDEX "api_keys_keyPrefix_idx" ON "api_keys"("keyPrefix");
CREATE INDEX "api_keys_siteId_idx" ON "api_keys"("siteId");
CREATE INDEX "api_keys_pluginId_idx" ON "api_keys"("pluginId");
CREATE INDEX "api_keys_status_idx" ON "api_keys"("status");
CREATE INDEX "api_keys_tier_idx" ON "api_keys"("tier");
CREATE INDEX "api_keys_createdAt_idx" ON "api_keys"("createdAt");

-- CreateIndexes for api_usage_logs
CREATE UNIQUE INDEX "api_usage_logs_requestId_key" ON "api_usage_logs"("requestId");
CREATE INDEX "api_usage_logs_apiKeyId_idx" ON "api_usage_logs"("apiKeyId");
CREATE INDEX "api_usage_logs_endpoint_idx" ON "api_usage_logs"("endpoint");
CREATE INDEX "api_usage_logs_statusCode_idx" ON "api_usage_logs"("statusCode");
CREATE INDEX "api_usage_logs_createdAt_idx" ON "api_usage_logs"("createdAt");
CREATE INDEX "api_usage_logs_requestId_idx" ON "api_usage_logs"("requestId");

-- CreateIndexes for rate_limit_configs
CREATE INDEX "rate_limit_configs_tier_idx" ON "rate_limit_configs"("tier");
CREATE INDEX "rate_limit_configs_resource_idx" ON "rate_limit_configs"("resource");
CREATE INDEX "rate_limit_configs_siteId_idx" ON "rate_limit_configs"("siteId");

-- CreateIndexes for oauth_clients
CREATE UNIQUE INDEX "oauth_clients_clientId_key" ON "oauth_clients"("clientId");
CREATE INDEX "oauth_clients_clientId_idx" ON "oauth_clients"("clientId");
CREATE INDEX "oauth_clients_companyId_idx" ON "oauth_clients"("companyId");

-- CreateIndexes for oauth_authorizations
CREATE INDEX "oauth_authorizations_clientId_idx" ON "oauth_authorizations"("clientId");
CREATE INDEX "oauth_authorizations_userId_idx" ON "oauth_authorizations"("userId");

-- CreateIndexes for oauth_tokens
CREATE INDEX "oauth_tokens_clientId_idx" ON "oauth_tokens"("clientId");
CREATE INDEX "oauth_tokens_userId_idx" ON "oauth_tokens"("userId");
CREATE INDEX "oauth_tokens_tokenHash_idx" ON "oauth_tokens"("tokenHash");
CREATE INDEX "oauth_tokens_expiresAt_idx" ON "oauth_tokens"("expiresAt");

-- CreateIndexes for api_endpoint_tiers
CREATE UNIQUE INDEX "api_endpoint_tiers_endpoint_key" ON "api_endpoint_tiers"("endpoint");
CREATE INDEX "api_endpoint_tiers_endpoint_idx" ON "api_endpoint_tiers"("endpoint");
CREATE INDEX "api_endpoint_tiers_tier_idx" ON "api_endpoint_tiers"("tier");

-- AddForeignKey
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
