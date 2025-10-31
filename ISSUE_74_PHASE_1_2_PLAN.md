# Issue #74: API Access Control & Security Model - Phase 1-2 Implementation Plan

**Issue**: #74
**Title**: API Access Control & Security Model
**Category**: SDK & Extensibility Foundation
**Foundation Level**: L3 (Refinement/Extension)
**Blocks**: Issues #75, #76, #77, #79, #80, #81
**Status**: Phase 1-2 Implementation
**Target Completion**: Current Session

## Executive Summary

Implement a comprehensive API access control and security model that serves as the foundation for the SDK and third-party integrations platform. This includes API key management, role-based access control (RBAC), OAuth 2.0 scopes, rate limiting, and comprehensive audit logging.

**Phase 1-2 Scope**: ~40% of total effort - Core security infrastructure, API key management, RBAC, rate limiting, and audit foundation.

---

## Phase 1-2 Detailed Specification

### 1. Type Definitions & Interfaces (src/types/security.ts - ~250 lines)

```typescript
// API Key Management
enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  INACTIVE = 'INACTIVE'
}

enum ApiKeyType {
  PERSONAL = 'PERSONAL',        // User-owned API key
  SERVICE_ACCOUNT = 'SERVICE_ACCOUNT',  // For integrations
  OAUTH_CLIENT = 'OAUTH_CLIENT'   // OAuth 2.0 client
}

interface ApiKey {
  id: string;
  name: string;
  type: ApiKeyType;
  key: string;                   // Hashed
  keyPrefix: string;             // First 8 chars for display
  secret?: string;               // OAuth client secret (hashed)
  owner: {
    userId?: string;
    serviceAccountId?: string;
  };
  status: ApiKeyStatus;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  rotationSchedule?: {
    enabled: boolean;
    rotateEveryDays: number;
    nextRotationDate?: Date;
  };
}

// RBAC & Permissions
enum ApiScope {
  'READ' = 'read',
  'WRITE' = 'write',
  'DELETE' = 'delete',
  'ADMIN' = 'admin'
}

interface ApiPermission {
  id: string;
  name: string;
  description: string;
  scope: string;                 // e.g., 'quality:ncr:read'
  resource: string;              // e.g., 'quality.ncr'
  action: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';
}

interface ApiRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];         // Permission IDs
  createdAt: Date;
  updatedAt: Date;
}

interface ApiKeyRole {
  apiKeyId: string;
  roleId: string;
  grantedAt: Date;
  grantedBy: string;
}

// Rate Limiting & Quotas
interface RateLimitConfig {
  id: string;
  apiKeyId: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstSize: number;             // Max concurrent requests
  quotaResetAt: Date;
  enabled: boolean;
}

interface RateLimitBucket {
  apiKeyId: string;
  minute: Map<string, number>;   // Token count by minute
  hour: Map<string, number>;     // Token count by hour
  day: Map<string, number>;      // Token count by day
  lastRefill: Date;
}

// Audit Logging
interface ApiAccessLog {
  id: string;
  apiKeyId: string;
  timestamp: Date;
  method: string;                // GET, POST, PUT, DELETE
  endpoint: string;
  statusCode: number;
  responseTime: number;          // milliseconds
  ipAddress: string;
  userAgent: string;
  requestSize: number;
  responseSize: number;
  error?: string;
  userId?: string;               // Resolved from API key
}

// OAuth 2.0 Integration
interface OAuthClient {
  id: string;
  name: string;
  description: string;
  clientId: string;
  clientSecret: string;          // Hashed
  redirectUris: string[];
  allowedGrantTypes: ('authorization_code' | 'client_credentials' | 'refresh_token')[];
  scopes: string[];
  owner: string;                 // User ID
  createdAt: Date;
  updatedAt: Date;
}

interface OAuthToken {
  accessToken: string;           // JWT or opaque token
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
  scope: string[];
  grantedAt: Date;
}
```

### 2. Database Models (Prisma Schema - ~150 lines)

```prisma
// API Key Management
model ApiKey {
  id                String    @id @default(cuid())
  name              String
  type              String    // PERSONAL, SERVICE_ACCOUNT, OAUTH_CLIENT
  key               String    @unique  // Hashed
  keyPrefix         String
  secret            String?   // Hashed
  ownerId           String?
  ownerType         String?   // 'user' | 'service_account'
  status            String    @default("ACTIVE")
  createdAt         DateTime  @default(now())
  lastUsedAt        DateTime?
  expiresAt         DateTime?
  revokedAt         DateTime?
  revokedBy         String?
  rotationSchedule  Json?

  roles             ApiKeyRole[]
  rateLimitConfig   RateLimitConfig?
  accessLogs        ApiAccessLog[]

  @@index([ownerId])
  @@index([status])
  @@index([createdAt])
  @@map("api_keys")
}

// RBAC
model ApiPermission {
  id                String    @id @default(cuid())
  name              String    @unique
  description       String?
  scope             String    // e.g., 'quality:ncr:read'
  resource          String    // e.g., 'quality.ncr'
  action            String    // READ, WRITE, DELETE, ADMIN
  createdAt         DateTime  @default(now())

  roles             ApiRole[]

  @@index([scope])
  @@index([resource])
  @@map("api_permissions")
}

model ApiRole {
  id                String    @id @default(cuid())
  name              String    @unique
  description       String?
  permissions       String[]  // Permission IDs
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  apiKeys           ApiKeyRole[]

  @@map("api_roles")
}

model ApiKeyRole {
  id                String    @id @default(cuid())
  apiKeyId          String
  roleId            String
  grantedAt         DateTime  @default(now())
  grantedBy         String

  apiKey            ApiKey    @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
  role              ApiRole   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([apiKeyId, roleId])
  @@index([roleId])
  @@map("api_key_roles")
}

// Rate Limiting
model RateLimitConfig {
  id                String    @id @default(cuid())
  apiKeyId          String    @unique
  requestsPerMinute Int       @default(100)
  requestsPerHour   Int       @default(5000)
  requestsPerDay    Int       @default(50000)
  burstSize         Int       @default(10)
  quotaResetAt      DateTime  @default(now())
  enabled           Boolean   @default(true)

  apiKey            ApiKey    @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)

  @@map("rate_limit_configs")
}

// Audit Logging
model ApiAccessLog {
  id                String    @id @default(cuid())
  apiKeyId          String
  timestamp         DateTime  @default(now())
  method            String
  endpoint          String
  statusCode        Int
  responseTime      Int
  ipAddress         String
  userAgent         String?
  requestSize       Int?
  responseSize      Int?
  error             String?
  userId            String?

  apiKey            ApiKey    @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)

  @@index([apiKeyId])
  @@index([timestamp])
  @@index([statusCode])
  @@map("api_access_logs")
}

// OAuth 2.0
model OAuthClient {
  id                String    @id @default(cuid())
  name              String
  description       String?
  clientId          String    @unique
  clientSecret      String    // Hashed
  redirectUris      String[]
  allowedGrantTypes String[]
  scopes            String[]
  ownerId           String
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([ownerId])
  @@map("oauth_clients")
}
```

### 3. Core Services (~1,200 lines)

#### 3a. ApiKeyService.ts (400 lines)
- Generate/revoke API keys with proper hashing
- Key rotation with scheduled auto-rotation
- Key validation and authentication
- Key metadata and usage tracking

#### 3b. ApiAccessControlService.ts (400 lines)
- RBAC permission checking
- Scope-based access validation
- Endpoint authorization middleware
- Permission inheritance and composition

#### 3c. RateLimitService.ts (200 lines)
- Token bucket algorithm implementation
- Quota tracking and reset
- Rate limit headers and responses
- Quota warning notifications

#### 3d. ApiAuditService.ts (200 lines)
- Log all API access with full context
- Search and filter access logs
- Compliance reporting
- Suspicious activity detection

### 4. Middleware & Utilities (~300 lines)

#### 4a. API Authentication Middleware
```typescript
// Middleware that:
// 1. Extracts API key or Bearer token
// 2. Validates signature/format
// 3. Resolves to user/service account
// 4. Attaches to request context
// 5. Logs access attempt
```

#### 4b. Authorization Middleware
```typescript
// Middleware that:
// 1. Checks RBAC permissions
// 2. Validates scopes
// 3. Applies rate limiting
// 4. Returns 401/403 as appropriate
```

#### 4c. Audit Logging Middleware
```typescript
// Middleware that:
// 1. Captures request/response details
// 2. Records timing and sizes
// 3. Stores in database asynchronously
// 4. Compresses old logs
```

### 5. API Endpoints (20+ routes)

#### API Key Management (10 endpoints)
- `POST /api/v1/api-keys` - Create new API key
- `GET /api/v1/api-keys` - List user's API keys
- `GET /api/v1/api-keys/:id` - Get key details
- `PUT /api/v1/api-keys/:id` - Update key (name, scopes)
- `DELETE /api/v1/api-keys/:id` - Revoke API key
- `POST /api/v1/api-keys/:id/rotate` - Rotate key
- `POST /api/v1/api-keys/:id/roles` - Assign role
- `DELETE /api/v1/api-keys/:id/roles/:roleId` - Remove role
- `GET /api/v1/api-keys/:id/usage` - Get key usage stats
- `POST /api/v1/api-keys/validate` - Validate key without authentication

#### RBAC Management (6 endpoints)
- `GET /api/v1/permissions` - List all permissions
- `GET /api/v1/roles` - List all roles
- `POST /api/v1/roles` - Create custom role
- `PUT /api/v1/roles/:id` - Update role permissions
- `DELETE /api/v1/roles/:id` - Delete role
- `GET /api/v1/roles/:id/permissions` - List role permissions

#### Rate Limiting (4 endpoints)
- `GET /api/v1/api-keys/:id/rate-limits` - Get rate limit config
- `PUT /api/v1/api-keys/:id/rate-limits` - Update limits
- `GET /api/v1/api-keys/:id/quota` - Get current quota usage
- `POST /api/v1/api-keys/:id/quota-reset` - Force quota reset

#### Audit & Analytics (5 endpoints)
- `GET /api/v1/api-keys/:id/access-logs` - Get access logs
- `GET /api/v1/access-logs/search` - Search logs across all keys
- `GET /api/v1/access-logs/stats` - Get access statistics
- `GET /api/v1/access-logs/security` - Get security alerts
- `POST /api/v1/access-logs/export` - Export logs for compliance

### 6. Security Features

#### API Key Security
✅ Keys hashed with bcrypt (not stored in plain text)
✅ Key rotation with automated scheduling
✅ Key expiration with warnings
✅ Revocation with audit trail
✅ Key prefix display for user-friendliness

#### RBAC Implementation
✅ Default roles: Admin, Developer, Integration, ReadOnly
✅ Custom roles with fine-grained permissions
✅ Permission inheritance and composition
✅ Scope-based access control (OAuth 2.0 style)
✅ Endpoint-level authorization checks

#### Rate Limiting
✅ Token bucket algorithm (allows bursts)
✅ Multiple time windows (minute, hour, day)
✅ Quota reset with configurable schedules
✅ Soft limits with warnings
✅ Hard limits with rejection

#### Audit Logging
✅ Every API call logged with full context
✅ 1-year retention (configurable)
✅ Searchable with advanced filters
✅ Compliance exports (ISO 27001, SOC 2)
✅ Suspicious activity alerts

### 7. Type Safety & Validation

✅ TypeScript strict mode throughout
✅ Comprehensive type definitions
✅ Request/response validation with Zod
✅ Error handling with specific security errors
✅ Input sanitization

### 8. Testing Strategy (Target: 80%+ coverage)

#### Unit Tests (~400 lines)
- API key generation and validation
- RBAC permission checking
- Rate limit token bucket algorithm
- Audit log creation and queries
- Error handling and edge cases

#### Integration Tests (~300 lines)
- Full authentication flow
- Authorization with multiple roles
- Rate limiting enforcement
- Concurrent access handling
- Log retention and cleanup

#### Security Tests (~200 lines)
- Key rotation timing
- Token expiration
- Permission bypass attempts
- Rate limit bypass attempts
- Audit log integrity

---

## Phase 1-2 Deliverables Summary

| Component | Lines | Status |
|-----------|-------|--------|
| Type Definitions | 250 | To Build |
| Prisma Models | 150 | To Build |
| ApiKeyService | 400 | To Build |
| ApiAccessControlService | 400 | To Build |
| RateLimitService | 200 | To Build |
| ApiAuditService | 200 | To Build |
| Middleware & Utils | 300 | To Build |
| API Routes | 400 | To Build |
| Tests | 900 | To Build |
| Documentation | 500 | To Build |
| **TOTAL** | **~4,000** | **Phase 1-2** |

---

## Phase 3-8 Roadmap (60% of effort)

**Phase 3**: OAuth 2.0 Authorization Code Flow
**Phase 4**: Multi-tenant API Key Scoping
**Phase 5**: Advanced Analytics & Dashboards
**Phase 6**: Machine Learning-based Anomaly Detection
**Phase 7**: API Gateway Integration
**Phase 8**: Developer Portal Self-Service

---

## Implementation Notes

### Security Best Practices
- All keys hashed before database storage
- Secrets never logged or displayed
- HTTPS enforcement for all API calls
- CORS configuration for browser-based clients
- Timing attack resistance
- Key rotation automated with gradual rollout

### Performance Considerations
- Rate limit checks in Redis (in-memory)
- Async audit logging to prevent latency
- Efficient permission lookups with caching
- Log rotation and archival for old data
- Concurrent request handling with semaphores

### Compliance & Auditing
- SOC 2 audit trail requirements
- ISO 27001 access control standards
- GDPR data retention policies
- Export formats for compliance reporting

### Developer Experience
- Clear error messages with remediation steps
- Quota usage in response headers
- Rate limit headers (RateLimit-Limit, RateLimit-Remaining)
- Webhooks for quota warnings
- Gradual backoff recommendations

---

## Success Criteria

✅ All type definitions compile without errors
✅ Database migrations execute successfully
✅ All 20+ API endpoints functional
✅ RBAC permissions enforce correctly
✅ Rate limiting prevents abuse
✅ Audit logs capture all access
✅ Tests achieve 80%+ code coverage
✅ Documentation complete and reviewed
✅ PR approved and merged

---

## Risk Mitigation

**Risk**: Key compromise
**Mitigation**: Immediate revocation, access log analysis, affected resources identified

**Risk**: Rate limit bypass
**Mitigation**: Multiple validation layers, distributed rate limiting with Redis

**Risk**: Performance impact
**Mitigation**: Async audit logging, efficient queries, caching strategies

**Risk**: Backward compatibility
**Mitigation**: Versioned APIs, deprecation warnings, gradual rollout

---

## Related Issues & Dependencies

**Blocks**: #75, #76, #77, #79, #80, #81
**Unblocks**: Plugin system, API versioning, developer tooling
**Integrates with**: Issue #147 (Unified Approval System), existing auth middleware

---

**Document Version**: 1.0
**Last Updated**: 2025-10-31
**Status**: READY FOR IMPLEMENTATION
