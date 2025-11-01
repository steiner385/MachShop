# API Access Control & Security Model Implementation

**GitHub Issue #74** - Comprehensive three-tier API access control system with rate limiting, OAuth 2.0, and audit logging.

## Implementation Status

### Phase 1: Data Models & Core Infrastructure ✅ COMPLETED

#### Prisma Schema Updates
Location: `/home/tony/GitHub/MachShop3/prisma/schema.prisma`

**New Models Added:**
1. **ApiKey** - Core authentication credential with three-tier access control
   - Fields: id, keyPrefix, keyHash, name, tier, status, scopes, rateLimit, quotas, companyId, siteId, pluginId, expiresAt, lastUsedAt, createdBy, approvedBy, developerName, developerEmail
   - Supports PUBLIC, SDK, and PRIVATE tiers
   - Includes approval workflow for SDK/PRIVATE tiers

2. **ApiUsageLog** - Comprehensive audit trail for all API requests
   - Fields: id, apiKeyId, endpoint, httpMethod, apiVersion, statusCode, responseTime, requestId, ipAddress, userAgent, rateLimitRemaining, rateLimitReset, timestamp
   - Indexed for fast queries and analytics

3. **OAuthClient** - Registered OAuth 2.0 clients
   - Fields: id, clientId, clientSecret, name, grantTypes, redirectUris, allowedScopes, tier, isActive, companyId, createdBy
   - Supports authorization code and client credentials flows

4. **OAuthAuthorization** - User authorization grants
   - Fields: id, clientId, userId, scopes, code, codeExpiresAt, isRevoked, authorizedAt, expiresAt
   - Tracks which users authorized which clients

5. **OAuthToken** - Access and refresh tokens
   - Fields: id, clientId, userId, apiKeyId, tokenType, tokenHash, scopes, expiresAt, isRevoked, refreshTokenId
   - Supports both authorization code and client credentials

6. **RateLimitConfig** - Flexible rate limiting rules
   - Fields: id, tier, resource, requestsPerMinute, requestsPerHour, requestsPerDay, burstMultiplier, isActive, siteId
   - Allows site-level and resource-specific overrides

**New Enums:**
- **ApiTier**: PUBLIC, SDK, PRIVATE
- **ApiKeyStatus**: ACTIVE, SUSPENDED, REVOKED, EXPIRED, PENDING_APPROVAL
- **TokenType**: ACCESS_TOKEN, REFRESH_TOKEN

**Schema Validation:**
```bash
npx prisma validate --schema=/home/tony/GitHub/MachShop3/prisma/schema.prisma
# Result: ✅ The schema is valid
```

### Phase 2: Constants & Configuration ✅ COMPLETED

#### API Tier Constants
Location: `/home/tony/GitHub/MachShop3/src/constants/api-tiers.ts`

**Features:**
- API tier enums and characteristics
- Key prefixes: `pk_live_`, `sdk_live_`, `pvt_live_` (and test variants)
- OAuth scopes: 40+ granular permission scopes
- Scope hierarchies and validation
- Helper functions: `hasScope()`, `expandScopes()`, `validateScopes()`

**Default Tier Characteristics:**
```typescript
PUBLIC:  max 5 scopes,   requires approval: NO,  expiration: 365 days
SDK:     max 20 scopes,  requires approval: YES, expiration: never
PRIVATE: unlimited,      requires approval: YES, expiration: never
```

#### Rate Limit Configuration
Location: `/home/tony/GitHub/MachShop3/src/config/rate-limits.ts`

**Default Rate Limits:**
```typescript
PUBLIC:  100 req/min,  5,000 req/hour,    100,000 req/day
SDK:     500 req/min,  25,000 req/hour,   500,000 req/day
PRIVATE: unlimited,    unlimited,         unlimited
```

**Resource-Specific Limits:**
- Reports generation: Lower limits (computationally expensive)
- Data exports: Lower limits (large data transfers)
- Global search: Medium limits (database intensive)
- Bulk operations: Lower limits (impact on system)
- File uploads: Medium limits (bandwidth intensive)

**Burst Multiplier:**
- PUBLIC: 1.5x (allow up to 150 req/min for short bursts)
- SDK: 2.0x (allow up to 1000 req/min for short bursts)
- PRIVATE: 1.0x (no burst needed, already unlimited)

### Phase 3: Core Services ✅ COMPLETED

#### API Key Service
Location: `/home/tony/GitHub/MachShop3/src/modules/api-keys/api-key.service.ts`

**Key Features:**
1. **Key Generation**
   - Cryptographically secure 32-character keys (256-bit security)
   - Format: `{prefix}{32_random_chars}` (e.g., `pk_live_abc123...`)
   - Uses `crypto.randomBytes()` with base64url encoding

2. **Key Validation**
   - Fast lookup by prefix
   - Bcrypt hash verification (10 rounds)
   - Status and expiration checks
   - Automatic lastUsedAt tracking

3. **Lifecycle Management**
   - Create, revoke, suspend, reactivate
   - Approval workflow for SDK/PRIVATE tiers
   - Auto-expire inactive keys (180 days default)
   - Scope validation per tier

4. **Usage Analytics**
   - Total requests by status code
   - Requests by endpoint
   - Average response time
   - Error rate calculation

**Public Methods:**
```typescript
- generateApiKey(tier: ApiTier): string
- hashApiKey(apiKey: string): Promise<string>
- validateApiKey(providedKey: string): Promise<ValidatedApiKey | null>
- createApiKey(data: CreateApiKeyData): Promise<{apiKey, keyId, keyPrefix}>
- revokeApiKey(keyId: string, revokedBy: string): Promise<void>
- suspendApiKey(keyId: string, suspendedBy: string): Promise<void>
- reactivateApiKey(keyId: string, reactivatedBy: string): Promise<void>
- approveApiKey(keyId: string, approvedBy: string): Promise<void>
- expireInactiveKeys(inactiveDays: number): Promise<number>
- getUsageStats(apiKeyId, periodStart, periodEnd): Promise<ApiKeyUsageStats>
- listApiKeys(filters?: {...}): Promise<ApiKey[]>
- getApiKeyById(keyId: string): Promise<ApiKey>
```

#### Rate Limiter Service
Location: `/home/tony/GitHub/MachShop3/src/modules/rate-limiting/rate-limiter.service.ts`

**Key Features:**
1. **Distributed Rate Limiting**
   - Redis-backed for multi-instance deployments
   - Token bucket algorithm
   - Multiple windows: minute, hour, day
   - Resource-specific limits

2. **Graceful Degradation**
   - Fail-open if Redis unavailable
   - Health monitoring
   - Automatic reconnection

3. **Rate Limit Tracking**
   - Per-key counters
   - Automatic TTL on counters
   - Burst allowance support

**Public Methods:**
```typescript
- initialize(): Promise<void>
- disconnect(): Promise<void>
- checkRateLimit(apiKeyId, tier, resource?): Promise<RateLimitStatus>
- getRemainingQuota(apiKeyId, tier, resource?): Promise<{minute, hour, day}>
- resetRateLimits(apiKeyId: string): Promise<void>
- getHealthStatus(): Promise<{healthy, redisConnected, message}>
```

**Redis Key Patterns:**
```
ratelimit:{apiKeyId}:minute
ratelimit:{apiKeyId}:hour
ratelimit:{apiKeyId}:day
ratelimit:{apiKeyId}:{resource}:minute
quota:{apiKeyId}:monthly
```

### Phase 4: Middleware & Guards (IN PROGRESS)

The following components need to be created:

#### 1. API Key Authentication Middleware
Location: `/home/tony/GitHub/MachShop3/src/middleware/api-key-auth.middleware.ts`

**Purpose:** Extract and validate API keys from requests

```typescript
// Pseudo-code structure
export const apiKeyAuthMiddleware = async (req, res, next) => {
  // 1. Extract API key from Authorization header (Bearer token)
  // 2. Validate using apiKeyService.validateApiKey()
  // 3. Attach validated key info to req.apiKey
  // 4. Call next() or return 401
}
```

#### 2. Rate Limit Middleware
Location: `/home/tony/GitHub/MachShop3/src/middleware/api-rate-limit.middleware.ts`

**Purpose:** Enforce rate limits on API requests

```typescript
// Pseudo-code structure
export const apiRateLimitMiddleware = async (req, res, next) => {
  // 1. Get API key from req.apiKey
  // 2. Check rate limits using rateLimiterService.checkRateLimit()
  // 3. Set X-RateLimit-* headers
  // 4. Return 429 if exceeded, else call next()
}
```

**Response Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when window resets
- `Retry-After`: Seconds to wait (429 responses only)

#### 3. API Usage Audit Middleware
Location: `/home/tony/GitHub/MachShop3/src/middleware/api-audit.middleware.ts`

**Purpose:** Log all API requests to ApiUsageLog

```typescript
// Pseudo-code structure
export const apiAuditMiddleware = async (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', async () => {
    // Log request to ApiUsageLog
    await prisma.apiUsageLog.create({
      data: {
        apiKeyId: req.apiKey.id,
        endpoint: req.path,
        httpMethod: req.method,
        statusCode: res.statusCode,
        responseTime: Date.now() - startTime,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        // ... other fields
      }
    });
  });

  next();
}
```

#### 4. API Tier Guard/Decorator
Location: `/home/tony/GitHub/MachShop3/src/middleware/api-tier.guard.ts`

**Purpose:** Enforce minimum tier requirements on endpoints

```typescript
// Decorator usage in routes
@ApiTierGuard(ApiTier.SDK)
router.get('/api/advanced-endpoint', async (req, res) => {
  // Only SDK and PRIVATE tier keys can access
});

// Guard checks req.apiKey.tier against required tier
```

#### 5. Security Headers Middleware
Location: `/home/tony/GitHub/MachShop3/src/middleware/api-security-headers.middleware.ts`

**Purpose:** Set security headers for API responses

**Headers to Set:**
- `Strict-Transport-Security`: HSTS for HTTPS
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY
- `Content-Security-Policy`: Restrictive CSP
- `X-API-Version`: API version header

### Phase 5: API Endpoints (PENDING)

#### Admin API Key Endpoints
Location: `/home/tony/GitHub/MachShop3/src/routes/admin/api-keys.ts`

**Endpoints:**
- `GET /api/admin/api-keys` - List all API keys
- `POST /api/admin/api-keys` - Create new API key
- `GET /api/admin/api-keys/:id` - Get API key details
- `PUT /api/admin/api-keys/:id` - Update API key
- `DELETE /api/admin/api-keys/:id` - Revoke API key
- `POST /api/admin/api-keys/:id/approve` - Approve pending SDK key
- `POST /api/admin/api-keys/:id/suspend` - Suspend API key
- `POST /api/admin/api-keys/:id/reactivate` - Reactivate suspended key
- `GET /api/admin/api-keys/:id/usage` - Get usage statistics

**Access:** Requires PRIVATE tier or admin:api_keys scope

#### Developer Portal Endpoints
Location: `/home/tony/GitHub/MachShop3/src/routes/developer/api-keys.ts`

**Endpoints:**
- `POST /api/developer/register` - Register as developer
- `POST /api/developer/api-keys` - Create PUBLIC tier key
- `POST /api/developer/api-keys/sdk-request` - Request SDK tier access
- `GET /api/developer/api-keys` - List my API keys
- `GET /api/developer/api-keys/:id` - Get my API key details
- `POST /api/developer/api-keys/:id/regenerate` - Regenerate key
- `DELETE /api/developer/api-keys/:id` - Delete my key
- `GET /api/developer/usage` - Get my usage statistics

**Access:** Requires authentication, manages own keys only

#### OAuth Endpoints
Location: `/home/tony/GitHub/MachShop3/src/routes/oauth.ts`

**Endpoints:**
- `GET /oauth/authorize` - Authorization endpoint (auth code flow)
- `POST /oauth/token` - Token endpoint (all grant types)
- `POST /oauth/token/introspect` - Token introspection
- `POST /oauth/token/revoke` - Revoke token
- `GET /oauth/clients` - List authorized clients
- `DELETE /oauth/clients/:id/revoke` - Revoke authorization

**Supported Grant Types:**
- Authorization Code (for user-facing apps)
- Client Credentials (for server-to-server)
- Refresh Token (for token renewal)

### Phase 6: Testing (PENDING)

#### Unit Tests
Locations:
- `/home/tony/GitHub/MachShop3/src/modules/api-keys/__tests__/api-key.service.test.ts`
- `/home/tony/GitHub/MachShop3/src/modules/rate-limiting/__tests__/rate-limiter.service.test.ts`

**Test Coverage:**
- API key generation and validation
- Key lifecycle management
- Scope validation
- Rate limit enforcement
- Tier-based access control
- OAuth token flows

#### Integration Tests
Location: `/home/tony/GitHub/MachShop3/src/tests/e2e/api-access-control.spec.ts`

**Test Scenarios:**
- End-to-end API key creation and usage
- Rate limiting under load
- OAuth authorization code flow
- OAuth client credentials flow
- Tier enforcement
- Key expiration and renewal

### Phase 7: Documentation (PENDING)

#### Files to Create:
1. `/home/tony/GitHub/MachShop3/docs/authentication.md`
   - API key authentication guide
   - Getting started with API keys
   - Security best practices

2. `/home/tony/GitHub/MachShop3/docs/oauth.md`
   - OAuth 2.0 integration guide
   - Code examples for all flows
   - Scope documentation

3. `/home/tony/GitHub/MachShop3/docs/rate-limiting.md`
   - Rate limit tiers and quotas
   - Handling 429 responses
   - Custom rate limits

4. `/home/tony/GitHub/MachShop3/docs/api-tiers.md`
   - Comparison of PUBLIC vs SDK vs PRIVATE tiers
   - Feature matrix
   - Upgrading tiers

## Installation & Setup

### 1. Generate Prisma Client
```bash
cd /home/tony/GitHub/MachShop3
npx prisma generate
```

### 2. Run Database Migration
```bash
npx prisma migrate dev --name add-api-access-control
```

### 3. Initialize Rate Limiter Service
Add to `/home/tony/GitHub/MachShop3/src/index.ts`:
```typescript
import { rateLimiterService } from './modules/rate-limiting/rate-limiter.service';

// Initialize before starting server
await rateLimiterService.initialize();
```

### 4. Add Middleware to Express App
```typescript
import { apiKeyAuthMiddleware } from './middleware/api-key-auth.middleware';
import { apiRateLimitMiddleware } from './middleware/api-rate-limit.middleware';
import { apiAuditMiddleware } from './middleware/api-audit.middleware';

// Apply to API routes
app.use('/api/*', apiKeyAuthMiddleware);
app.use('/api/*', apiRateLimitMiddleware);
app.use('/api/*', apiAuditMiddleware);
```

## Usage Examples

### Creating an API Key (Admin)
```typescript
import { apiKeyService } from './modules/api-keys/api-key.service';

const result = await apiKeyService.createApiKey({
  name: 'Production Integration Key',
  tier: ApiTier.SDK,
  scopes: ['read:*', 'write:work_orders', 'write:quality'],
  createdBy: 'admin-user-id',
  developerName: 'Acme Corp',
  developerEmail: 'api@acme.com'
});

console.log(`API Key: ${result.apiKey}`);
console.log(`Key ID: ${result.keyId}`);
// API Key: sdk_live_abc123xyz789... (show only once!)
```

### Using an API Key (Client)
```bash
curl -H "Authorization: Bearer sdk_live_abc123xyz789..." \
     https://api.example.com/api/work-orders
```

### Response Headers
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1699564860
```

### Rate Limit Exceeded
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699564860
Retry-After: 45

{
  "error": "Rate limit exceeded",
  "message": "Too many requests per minute. Please retry after 45 seconds.",
  "retryAfter": 45
}
```

## Security Considerations

### 1. Key Storage
- **Never store plaintext keys** - Always hash with bcrypt
- **Show keys only once** - During creation
- **Use HTTPS only** - Never send keys over HTTP

### 2. Key Rotation
- Implement 180-day expiration for PUBLIC keys
- Encourage regular rotation for SDK keys
- Provide regenerate endpoint for seamless rotation

### 3. Rate Limiting
- Implement at load balancer level as well (defense in depth)
- Monitor for abuse patterns
- Automatic suspension after repeated 429s

### 4. Audit Logging
- Log all API requests
- Retain logs for compliance (90+ days)
- Alert on suspicious patterns

### 5. Scope Management
- Principle of least privilege
- Regular scope audits
- Automatic scope reduction on security events

## Performance Optimizations

### 1. Redis Caching
- Cache validated keys (1-minute TTL)
- Reduce database queries
- Distributed rate limit counters

### 2. Async Audit Logging
- Don't block responses
- Use message queue for high-volume logs
- Batch inserts to database

### 3. Key Prefix Indexing
- Fast key lookup by prefix
- No full table scan needed
- Sub-millisecond validation

## Monitoring & Alerting

### Metrics to Track:
- API requests per tier
- Rate limit hit rate
- Average response time by tier
- Failed authentication attempts
- Key creation rate
- Inactive keys count

### Alerts:
- Rate limit exceeded threshold (>80% consistently)
- Failed auth spike (>100/min)
- Expired keys not rotated
- Redis connection failures
- Unusual usage patterns

## Next Steps

1. **Complete Middleware Implementation** (Estimated: 4 hours)
   - API key auth middleware
   - Rate limit middleware
   - Audit middleware
   - Security headers middleware

2. **Implement API Endpoints** (Estimated: 8 hours)
   - Admin endpoints (8 routes)
   - Developer endpoints (8 routes)
   - OAuth endpoints (6 routes)

3. **Write Comprehensive Tests** (Estimated: 8 hours)
   - Unit tests (>80% coverage)
   - Integration tests
   - Load testing for rate limits

4. **Create Documentation** (Estimated: 4 hours)
   - Authentication guide
   - OAuth integration guide
   - Rate limiting documentation
   - API tier comparison

5. **Deploy & Monitor** (Estimated: 2 hours)
   - Database migration
   - Redis configuration
   - Monitoring setup
   - Initial key creation

**Total Estimated Effort:** 26 hours remaining

## Files Created

### Core Implementation
1. `/home/tony/GitHub/MachShop3/prisma/api-access-control-schema-addition.prisma` - Schema models
2. `/home/tony/GitHub/MachShop3/src/constants/api-tiers.ts` - Constants and enums
3. `/home/tony/GitHub/MachShop3/src/config/rate-limits.ts` - Rate limit configuration
4. `/home/tony/GitHub/MachShop3/src/modules/api-keys/api-key.service.ts` - API Key Service
5. `/home/tony/GitHub/MachShop3/src/modules/rate-limiting/rate-limiter.service.ts` - Rate Limiter Service

### Documentation
6. `/home/tony/GitHub/MachShop3/docs/api-access-control-implementation.md` - This file

## Summary

The API Access Control & Security Model implementation provides a robust, enterprise-grade authentication and authorization system for the MES platform. The foundation has been completed with:

- ✅ Complete Prisma schema with 6 new models and 3 enums
- ✅ Comprehensive constants and configuration
- ✅ Fully implemented API Key Service with lifecycle management
- ✅ Redis-backed Rate Limiter Service with distributed support
- ✅ Three-tier access control (PUBLIC, SDK, PRIVATE)
- ✅ OAuth 2.0 data models ready for implementation

The remaining work focuses on middleware integration, API endpoint implementation, testing, and documentation. The architecture is designed for scalability, security, and ease of use, following industry best practices for API access control.
