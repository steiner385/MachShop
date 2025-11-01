/**
 * ✅ GITHUB ISSUE #74: API Access Control & Security Model - Phase 1-2
 * Security Types and Interfaces
 *
 * Comprehensive type definitions for:
 * - API key management
 * - Role-based access control (RBAC)
 * - Rate limiting and quotas
 * - Audit logging
 * - OAuth 2.0 integration
 */

// ============================================================================
// API Key Management
// ============================================================================

/**
 * API Key Status
 */
export enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  INACTIVE = 'INACTIVE'
}

/**
 * API Key Type
 */
export enum ApiKeyType {
  PERSONAL = 'PERSONAL',              // User-owned personal API key
  SERVICE_ACCOUNT = 'SERVICE_ACCOUNT', // For service-to-service integrations
  OAUTH_CLIENT = 'OAUTH_CLIENT'        // OAuth 2.0 client credentials
}

/**
 * API Key Rotation Schedule
 */
export interface ApiKeyRotationSchedule {
  enabled: boolean;
  rotateEveryDays: number;             // Minimum: 30, Maximum: 365
  nextRotationDate?: Date;
  lastRotationDate?: Date;
}

/**
 * API Key Owner Information
 */
export interface ApiKeyOwner {
  userId?: string;
  serviceAccountId?: string;
}

/**
 * API Key
 * Represents a key for API authentication
 */
export interface ApiKey {
  id: string;
  name: string;
  type: ApiKeyType;
  key: string;                         // Hashed with bcrypt
  keyPrefix: string;                   // First 8 characters for display
  secret?: string;                     // OAuth client secret (hashed)
  owner: ApiKeyOwner;
  status: ApiKeyStatus;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
  rotationSchedule?: ApiKeyRotationSchedule;
  metadata?: Record<string, any>;      // Custom metadata
}

/**
 * API Key Summary (safe to return to clients)
 * Excludes sensitive information
 */
export interface ApiKeySummary {
  id: string;
  name: string;
  type: ApiKeyType;
  keyPrefix: string;
  status: ApiKeyStatus;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

// ============================================================================
// RBAC (Role-Based Access Control)
// ============================================================================

/**
 * API Action
 */
export enum ApiAction {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  ADMIN = 'ADMIN'
}

/**
 * API Permission
 * Represents a specific API action on a resource
 */
export interface ApiPermission {
  id: string;
  name: string;
  description: string;
  scope: string;                      // e.g., 'quality:ncr:read'
  resource: string;                   // e.g., 'quality.ncr'
  action: ApiAction;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * API Role
 * Collection of permissions
 */
export interface ApiRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];              // Permission IDs
  createdAt: Date;
  updatedAt: Date;
  isSystem: boolean;                  // System roles cannot be deleted
  metadata?: Record<string, any>;
}

/**
 * API Key Role Assignment
 */
export interface ApiKeyRole {
  apiKeyId: string;
  roleId: string;
  grantedAt: Date;
  grantedBy: string;
}

/**
 * Default System Roles
 */
export const DEFAULT_ROLES = {
  ADMIN: {
    id: 'role-admin',
    name: 'Admin',
    description: 'Full API access and administration',
    action: ApiAction.ADMIN
  },
  DEVELOPER: {
    id: 'role-developer',
    name: 'Developer',
    description: 'Read and write access for development',
    action: ApiAction.WRITE
  },
  INTEGRATION: {
    id: 'role-integration',
    name: 'Integration',
    description: 'Limited access for third-party integrations',
    action: ApiAction.READ
  },
  READONLY: {
    id: 'role-readonly',
    name: 'ReadOnly',
    description: 'Read-only access',
    action: ApiAction.READ
  }
} as const;

// ============================================================================
// Rate Limiting & Quotas
// ============================================================================

/**
 * Time Window for Rate Limiting
 */
export enum TimeWindow {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day'
}

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  id: string;
  apiKeyId: string;
  requestsPerMinute: number;          // Default: 100
  requestsPerHour: number;            // Default: 5000
  requestsPerDay: number;             // Default: 50000
  burstSize: number;                  // Max concurrent requests (default: 10)
  quotaResetAt: Date;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rate Limit Bucket (in-memory)
 * Tracks token count for token bucket algorithm
 */
export interface RateLimitBucket {
  apiKeyId: string;
  minute: Map<string, number>;
  hour: Map<string, number>;
  day: Map<string, number>;
  lastRefill: Date;
}

/**
 * Current Quota Usage
 */
export interface QuotaUsage {
  minute: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: Date;
  };
  hour: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: Date;
  };
  day: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: Date;
  };
}

/**
 * Rate Limit Headers for Response
 */
export interface RateLimitHeaders {
  'RateLimit-Limit': string;
  'RateLimit-Remaining': string;
  'RateLimit-Reset': string;
  'RateLimit-Window': string;          // minute, hour, or day
}

// ============================================================================
// Audit Logging
// ============================================================================

/**
 * HTTP Method
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

/**
 * API Access Log
 * Complete record of every API call for audit trail
 */
export interface ApiAccessLog {
  id: string;
  apiKeyId: string;
  timestamp: Date;
  method: HttpMethod;
  endpoint: string;
  statusCode: number;
  responseTime: number;               // milliseconds
  ipAddress: string;
  userAgent?: string;
  requestSize?: number;               // bytes
  responseSize?: number;              // bytes
  error?: string;
  userId?: string;                    // Resolved from API key
  requestId?: string;                 // For tracing
  createdAt: Date;
}

/**
 * API Access Log Summary (for queries)
 */
export interface ApiAccessLogSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  mostUsedEndpoint: string;
  mostCommonError?: string;
  lastAccessAt?: Date;
}

/**
 * Security Alert
 */
export interface SecurityAlert {
  id: string;
  apiKeyId: string;
  alertType: 'rate_limit_exceeded' | 'repeated_failures' | 'unusual_activity' | 'key_compromise';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  metadata: Record<string, any>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// ============================================================================
// OAuth 2.0
// ============================================================================

/**
 * OAuth Grant Type
 */
export enum OAuthGrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  CLIENT_CREDENTIALS = 'client_credentials',
  REFRESH_TOKEN = 'refresh_token',
  IMPLICIT = 'implicit'
}

/**
 * OAuth Client
 */
export interface OAuthClient {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  clientSecret: string;               // Hashed
  redirectUris: string[];
  allowedGrantTypes: OAuthGrantType[];
  scopes: string[];
  ownerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OAuth Token
 */
export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;                  // seconds
  tokenType: 'Bearer';
  scope: string[];
  grantedAt: Date;
  expiresAt: Date;
}

/**
 * OAuth Authorization Code
 */
export interface OAuthAuthorizationCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string[];
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
}

// ============================================================================
// Authentication Context
// ============================================================================

/**
 * Authenticated API Request Context
 * Attached to request object after authentication
 */
export interface ApiAuthContext {
  apiKeyId: string;
  userId?: string;
  serviceAccountId?: string;
  roles: string[];
  permissions: string[];
  scopes: string[];
  authenticatedAt: Date;
  expiresAt?: Date;
}

/**
 * API Request with Authentication Context
 */
export interface AuthenticatedApiRequest {
  auth: ApiAuthContext;
  requestId: string;
  clientIp: string;
  userAgent?: string;
}

// ============================================================================
// Authorization & Validation
// ============================================================================

/**
 * Permission Check Result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermission?: string;
}

/**
 * Scope Validation Result
 */
export interface ScopeValidationResult {
  valid: boolean;
  reason?: string;
  missingScopes?: string[];
}

/**
 * Authentication Result
 */
export interface AuthenticationResult {
  success: boolean;
  apiKeyId?: string;
  error?: string;
  errorCode?: 'INVALID_KEY' | 'EXPIRED_KEY' | 'REVOKED_KEY' | 'MALFORMED_KEY';
}

// ============================================================================
// Metrics & Statistics
// ============================================================================

/**
 * API Key Usage Statistics
 */
export interface ApiKeyUsageStats {
  apiKeyId: string;
  totalRequests: number;
  requestsByEndpoint: Record<string, number>;
  requestsByMethod: Record<string, number>;
  requestsByStatus: Record<number, number>;
  averageResponseTime: number;
  errorRate: number;                  // percentage
  lastUsedAt?: Date;
  createdAt: Date;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Access Control Metrics
 */
export interface AccessControlMetrics {
  totalApiKeys: number;
  activeApiKeys: number;
  revokedApiKeys: number;
  expiredApiKeys: number;
  totalRoles: number;
  totalPermissions: number;
  averageKeysPerUser: number;
  mostUsedRole: string;
  mostUsedPermission: string;
}

/**
 * Audit Metrics
 */
export interface AuditMetrics {
  totalLogEntries: number;
  logsForPeriod: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  failureRate: number;
  averageResponseTime: number;
  topErrors: Array<{
    error: string;
    count: number;
  }>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Create API Key Request
 */
export interface CreateApiKeyRequest {
  name: string;
  type: ApiKeyType;
  expiresInDays?: number;
  roles?: string[];
  rotationSchedule?: {
    enabled: boolean;
    rotateEveryDays: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Create API Key Response
 */
export interface CreateApiKeyResponse {
  apiKey: ApiKeySummary;
  secret: string;                     // Only returned at creation time
  expiresAt?: Date;
}

/**
 * Validate Permission Request
 */
export interface ValidatePermissionRequest {
  resource: string;
  action: ApiAction;
  context?: Record<string, any>;
}

/**
 * Validate Permission Response
 */
export interface ValidatePermissionResponse {
  allowed: boolean;
  reason?: string;
}

/**
 * Update Rate Limit Request
 */
export interface UpdateRateLimitRequest {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstSize?: number;
}

/**
 * Get Access Logs Request
 */
export interface GetAccessLogsRequest {
  apiKeyId?: string;
  startDate?: Date;
  endDate?: Date;
  method?: HttpMethod;
  endpoint?: string;
  statusCode?: number;
  limit?: number;
  offset?: number;
}

/**
 * Export Logs Request
 */
export interface ExportLogsRequest {
  format: 'csv' | 'json' | 'parquet';
  filters: {
    startDate: Date;
    endDate: Date;
    apiKeyId?: string;
    statusCode?: number;
  };
  includeMetadata?: boolean;
}
