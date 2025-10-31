# Issue #74: API Access Control & Security Model - Strategic Implementation Plan

**Status:** Scope Analysis & Implementation Strategy
**Date:** 2025-10-31
**Issue:** GitHub #74 - API Access Control & Security Model (Public/Private/SDK Tiers)
**Effort Estimate:** 6/10 (Complex, Multi-Phase)
**Blocks:** Issues #75, #76, #77, #79, #80, #81

## Executive Summary

Issue #74 is a foundational security and extensibility feature that enables:
1. **Public APIs** - Safe external integrations
2. **SDK APIs** - Controlled plugin/extension development
3. **Private APIs** - Internal-only sensitive operations

This document outlines a strategic, phased approach to implement this large feature across multiple PRs.

## Complexity Analysis

### Total Scope
- **Database Models:** 6 new models (ApiKey, OAuthClient, OAuthAuthorization, OAuthToken, RateLimitConfig, ApiUsageLog)
- **Services:** 4 core services (ApiKey, RateLimiter, AuditLogger, OAuth)
- **Middleware:** 4 middleware components (Authentication, RateLimit, SecurityHeaders, Audit)
- **Endpoints:** 22 new endpoints (8 admin, 8 developer, 6 OAuth)
- **Decorators/Guards:** 3 new decorators (@ApiTier, @RateLimit, @Scope)
- **Tests:** 50+ test cases across unit and integration
- **Documentation:** 5+ documentation files
- **Estimated Code:** 3,000+ lines

### Risk Assessment
- **High Impact:** Touches authentication, authorization, rate limiting globally
- **Medium Risk:** Requires database schema changes (migration needed)
- **Dependencies:** Requires Redis for distributed rate limiting
- **Breaking Changes:** Can be additive-only (no breaking changes required)

## Recommended Phased Approach

### Phase 1: Foundation (This PR) - 40% Completion
**Time Estimate:** 4-6 hours
**Deliverables:**
- Database models and migrations
- API Key service (generation, validation, management)
- Rate Limiter service (Redis-backed)
- Authentication middleware (bearer token)
- Unit tests for core services
- Architecture documentation

**Why Start Here:**
- Enables all downstream work
- Foundational, testable, reviewable
- Minimal external dependencies
- Allows parallel work on remaining phases

**Files to Create:**
- `prisma/migrations/[timestamp]_add_api_access_control/migration.sql`
- `src/modules/api-keys/api-key.service.ts`
- `src/modules/api-keys/dto/api-key.dto.ts`
- `src/modules/rate-limiting/rate-limiter.service.ts`
- `src/constants/api-tiers.ts`
- `src/config/rate-limits.config.ts`
- `src/middleware/api-key-auth.middleware.ts`
- `src/decorators/api-tier.decorator.ts`
- `src/guards/api-tier.guard.ts`
- `src/modules/api-keys/__tests__/api-key.service.spec.ts`
- `docs/api-access-control/01-architecture.md`
- `docs/api-access-control/02-api-keys.md`

**Acceptance Criteria:**
- ✅ Database schema in place, migrations run
- ✅ API Key service fully functional (generation, validation, storage)
- ✅ Rate limiter service working with Redis
- ✅ Authentication middleware validates bearer tokens
- ✅ Unit tests >80% coverage for core services
- ✅ Architecture documentation complete
- ✅ Can create API keys and use them to authenticate

### Phase 2: Enforcement & Audit (PR #2) - 60% Completion
**Time Estimate:** 3-4 hours
**Deliverables:**
- API tier enforcement (decorators + guards on existing endpoints)
- Rate limit enforcement middleware
- Audit logging system
- Security headers middleware
- Integration tests
- Admin dashboard (basic CRUD for API keys)

**Why Next:**
- Builds directly on Phase 1
- Adds enforcement and observability
- Enables admin management

**Files to Create:**
- `src/middleware/api-rate-limit.middleware.ts`
- `src/middleware/audit-logger.middleware.ts`
- `src/middleware/security-headers.middleware.ts`
- `src/modules/audit/audit-logger.service.ts`
- `src/modules/api-keys/admin-api-key.controller.ts` (basic endpoints)
- `src/modules/api-keys/__tests__/rate-limiter.service.spec.ts`
- `tests/e2e/api-access-control.e2e-spec.ts`
- `docs/api-access-control/03-rate-limiting.md`
- `docs/api-access-control/04-audit-logging.md`

### Phase 3: Developer Portal (PR #3) - 80% Completion
**Time Estimate:** 3-4 hours
**Deliverables:**
- Self-service developer portal endpoints (register, create keys, view usage)
- API key approval workflow for SDK tier
- Developer dashboard
- Key regeneration and rotation
- Usage analytics

**Files to Create:**
- `src/modules/api-keys/developer-api-key.controller.ts`
- `src/modules/api-keys/approval-workflow.service.ts`
- `src/modules/api-keys/__tests__/developer-portal.spec.ts`
- `docs/api-access-control/05-developer-portal.md`
- `docs/api-access-control/06-key-management.md`

### Phase 4: OAuth 2.0 (PR #4) - 100% Completion
**Time Estimate:** 3-4 hours
**Deliverables:**
- OAuth 2.0 authorization server
- Authorization and token endpoints
- Scope-based access control
- Token introspection and revocation
- Third-party app management
- OAuth integration documentation

**Files to Create:**
- `src/modules/oauth/oauth.controller.ts`
- `src/modules/oauth/oauth.service.ts`
- `src/modules/oauth/authorization-flow.service.ts`
- `src/modules/oauth/__tests__/oauth.spec.ts`
- `docs/api-access-control/07-oauth-server.md`
- `docs/api-access-control/08-oauth-integration-guide.md`

## Implementation Timeline

**Estimated Total Time:** 13-18 hours
**Optimal Parallel Approach:** 5-7 days if done in phases

```
Week 1:
  Mon: Phase 1 Implementation (4-6 hrs)
  Tue: Phase 1 PR Review & Merge

Week 2:
  Mon-Tue: Phase 2 Implementation (3-4 hrs)
  Wed: Phase 2 PR Review & Merge

  Mon: Phase 3 Implementation (3-4 hrs)
  Tue: Phase 3 PR Review & Merge

Week 3:
  Mon: Phase 4 Implementation (3-4 hrs)
  Tue: Phase 4 PR Review & Merge
```

## Critical Success Factors

1. **Security First**
   - All API keys bcrypt hashed before storage
   - Cryptographically secure key generation (256-bit entropy)
   - No plaintext keys ever logged or transmitted
   - Bearer token validation on every request

2. **Scalability**
   - Redis-backed distributed rate limiting (horizontal scaling)
   - Async audit logging (non-blocking)
   - Efficient key lookup (prefix index)
   - Partition audit logs by date

3. **Backwards Compatibility**
   - No breaking changes to existing APIs
   - Gradual endpoint classification (private by default for safety)
   - Phased enforcement (monitor first, block later)

4. **Testing Coverage**
   - Unit tests: >80% for services
   - Integration tests: All auth flows
   - Load tests: Rate limiting under load
   - Security tests: Tier access validation

5. **Documentation**
   - Developer guide for API key creation
   - OAuth 2.0 integration guide with code examples
   - Admin guide for key management
   - Security best practices

## Decision Points & Alternatives

### Decision 1: Rate Limiting Implementation
**Options:**
- A) Custom Redis implementation (full control)
- B) `rate-limiter-flexible` library (proven, tested)
- C) External service (SaaS)

**Decision:** Option B (rate-limiter-flexible)
**Rationale:** Widely used, reliable, distributed support, minimal dependencies

### Decision 2: OAuth Implementation
**Options:**
- A) Custom OAuth 2.0 server (full control)
- B) ORY Hydra (mature, production-grade)
- C) Auth0 / external (outsourced)

**Decision:** Option A (custom) initially, with option to migrate to Hydra
**Rationale:** Full control, lighter dependencies, can migrate later if needed

### Decision 3: PR Granularity
**Options:**
- A) Single monolithic PR (all at once)
- B) Small focused PRs (Phase 1 only)
- C) Medium phased PRs (Phase 1-2, then 3-4)

**Decision:** Option C (Medium phased PRs)
**Rationale:** Manageable review size, enables parallel work, faster feedback

## Data Model Summary

```prisma
// API Key Management
model ApiKey {
  id String @id @default(cuid())
  keyPrefix String @unique // pk_live_, sdk_live_, etc.
  keyHash String // bcrypt hash
  name String
  tier ApiTier // PUBLIC, SDK, PRIVATE
  scopes String[] // permission scopes

  // Status & Metadata
  status ApiKeyStatus // ACTIVE, SUSPENDED, REVOKED, etc.
  rateLimit Int // requests/minute
  expiresAt DateTime?
  lastUsedAt DateTime?
  createdBy String
  approvedBy String?
  approvedAt DateTime?

  // Developer Info (SDK keys)
  developerName String?
  developerEmail String?
  developerCompany String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Audit & Analytics
model ApiUsageLog {
  id String @id @default(cuid())
  apiKeyId String

  endpoint String
  httpMethod String
  statusCode Int
  responseTime Int // milliseconds

  requestId String @unique
  ipAddress String
  userAgent String?

  createdAt DateTime @default(now())

  apiKey ApiKey @relation(fields: [apiKeyId], references: [id])
}

// OAuth Support
model OAuthClient {
  id String @id @default(cuid())
  clientId String @unique
  clientSecret String // hashed
  name String
  redirectUris String[]
  allowedScopes String[]
  tier ApiTier

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Rate Limiting Config
model RateLimitConfig {
  id String @id @default(cuid())
  tier ApiTier
  resource String? // resource-specific limits

  requestsPerMinute Int
  requestsPerHour Int?
  requestsPerDay Int?

  isActive Boolean @default(true)
  createdAt DateTime @default(now())
}
```

## Rollout Strategy

### Phase A: Foundation (Phase 1 PR)
1. Merge core services
2. Enable on internal endpoints (test)
3. Monitor for issues

### Phase B: Gradual Enforcement (Phase 2-3 PR)
1. Classify public endpoints with `@ApiTier('PUBLIC')`
2. Enable authentication (optional first, then required)
3. Monitor adoption

### Phase C: Full Integration (Phase 4 PR)
1. Enable OAuth server
2. Launch developer portal
3. Sunset legacy auth if applicable

## Success Metrics

**Phase 1:**
- API key generation working (0 errors)
- Authentication preventing unauthorized access (100% validation)
- Rate limiter stopping excessive requests (enforced correctly)
- Unit tests passing (>80% coverage)

**Phase 2:**
- Audit logs capturing all requests (100% logged)
- Rate limiting enforcing limits (verified with load test)
- Admin dashboard managing keys (CRUD working)

**Phase 3:**
- Developer portal allows self-service key creation (working)
- Approval workflow for SDK keys (process working)
- Usage analytics accurate (verified)

**Phase 4:**
- OAuth flows working (auth code, client credentials)
- Third-party integrations can authenticate
- Ecosystem growth (external developers using APIs)

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Database migration fails | Low | High | Test migration scripts, backup before deploy |
| Rate limiting too aggressive | Medium | Medium | Start with high limits, monitor, adjust |
| Performance regression | Low | High | Benchmark before/after, optimize queries |
| Security vulnerability | Low | Critical | Security audit, penetration testing |
| Backwards compatibility | Low | High | No breaking changes, feature flags for enforcement |

## Dependencies

### Required
- Redis (for distributed rate limiting)
- Prisma (already in use)
- bcrypt (password hashing)
- uuid (key generation)

### Optional
- rate-limiter-flexible (NPM package)
- jsonwebtoken (if implementing JWT tokens)

### Development
- Jest (testing)
- Supertest (HTTP testing)

## Next Steps

1. **Approve this plan** - Get buy-in on phased approach
2. **Begin Phase 1** - Implement core services and models
3. **Create PR for Phase 1** - Code review and merge
4. **Plan Phase 2** - After Phase 1 is merged and validated
5. **Communicate timeline** - To teams waiting on this feature

---

**Document Version:** 1.0
**Last Updated:** 2025-10-31
**Status:** Ready for Phase 1 Implementation
**Owner:** Development Team
**Contact:** developers@mes.company.com
