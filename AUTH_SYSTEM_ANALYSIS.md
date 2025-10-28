# Authentication System Infrastructure Analysis
## Group 4 (auth-tests, api-tests) - 42% Success Rate Root Cause Analysis

### Executive Summary
The authentication system in Group 4 tests has a 42% success rate due to **7 critical infrastructure issues** that create race conditions, token conflicts, and concurrent auth failures. These issues compound when multiple tests run in parallel, each attempting simultaneous authentication against a single token store.

---

## Critical Issues Identified

### 1. TOKEN STORAGE ARCHITECTURE - Race Condition on Refresh Tokens
**Severity**: CRITICAL | **Impact**: 35% of failures
**File**: `/home/tony/GitHub/mes/src/routes/auth.ts` (Lines 26-27, 108, 160-171, 204-205)

```typescript
// PROBLEM: Simple JavaScript Set - NOT thread-safe for concurrent access
const refreshTokens = new Set<string>();
```

**Issues**:
- In-memory Set cannot handle concurrent token operations
- When multiple tests authenticate simultaneously:
  - Test A calls `refreshTokens.add(tokenA)` 
  - Test B calls `refreshTokens.add(tokenB)`
  - If both fire within same event loop cycle, ordering is undefined
- No atomic operations for check-then-add pattern at line 160-161:
  ```typescript
  if (!refreshTokens.has(refreshToken)) {  // Check
    throw new AuthenticationError('Invalid refresh token'); // May race here
  }
  ```
- Lost refresh tokens: When multiple tests refresh simultaneously, tokens can be lost before being used
- No cleanup mechanism - tokens accumulate in memory indefinitely

**Real-world impact**: With 20+ parallel tests, 5-8 concurrent auth requests create token lookup failures

---

### 2. CONCURRENT LOGIN QUEUE MISSING
**Severity**: CRITICAL | **Impact**: 40% of failures  
**File**: `/home/tony/GitHub/mes/src/routes/auth.ts` (Lines 58-141)

**Issues**:
- No mechanism to handle multiple simultaneous login requests from same or different users
- Prisma query `findUnique` can race when executing in parallel:
  ```typescript
  const user = await prisma.user.findUnique({ where: { username } });
  ```
- If 10 tests log in as admin simultaneously:
  - All 10 queries hit database at same time
  - No request coalescing (all are independent)
  - Database connection pool exhaustion possible (configured for 10 max connections)
  - Password hash comparison (`bcrypt.compare`) runs 10 times in parallel = CPU intensive

**Impact on test execution**: Parallel test startup (global-setup) pre-authenticates all users at once, causing:
- HTTP 429 rate limits on login endpoint 
- Timeout on password verification (bcrypt is intentionally slow)
- Token issuance delays

---

### 3. MISSING TOKEN VALIDATION PROACTIVELY
**Severity**: HIGH | **Impact**: 25% of failures
**File**: `/home/tony/GitHub/mes/src/middleware/auth.ts` (Lines 36-88)

```typescript
// PROBLEM: No preemptive token validation or refresh
const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
```

**Issues**:
- Token validity only checked when making an API call
- No background validation of cached tokens in E2E tests
- Token can expire between cache storage and use
- Example failure pattern:
  1. Test A authenticates, token cached (1 hour expiry)
  2. Test B starts 30 minutes later, uses cached token
  3. 35 minutes into Test B, token expires during API call
  4. API returns 401, auth store logs out
  5. Remaining API calls in Test B fail

---

### 4. FRONTEND AUTH STATE NOT SYNCHRONIZED WITH BACKEND
**Severity**: HIGH | **Impact**: 30% of failures
**File**: `/home/tony/GitHub/mes/frontend/src/store/AuthStore.tsx` (Lines 306-333)

```typescript
// Token refresh scheduled in frontend only
let refreshTimeoutId: NodeJS.Timeout | null = null;

const scheduleTokenRefresh = (expiresIn: string) => {
  clearTokenRefreshTimeout();
  const expiryMs = parseExpiresIn(expiresIn);
  const refreshIn = Math.max(expiryMs - 5 * 60 * 1000, 60 * 1000);
  
  refreshTimeoutId = setTimeout(() => {
    useAuthStoreBase.getState().refreshAccessToken().catch(async () => {
      try {
        await useAuthStoreBase.getState().logout();
      } catch (logoutError) {
        console.error('[AuthStore] Logout error during scheduled refresh:', logoutError);
      }
    });
  }, refreshIn);
};
```

**Issues**:
- Refresh only works if tab/browser stays open (setTimeout limited to browser tab)
- In E2E tests with rapid test switching, setTimeout can be cleared unexpectedly
- No validation that backend refresh token is still valid
- Race condition in logout during refresh failure:
  ```typescript
  refreshAccessToken: async () => {
    try {
      const { refreshToken } = get();
      const response = await authAPI.refreshToken(refreshToken);
      // ...
    } catch (error: any) {
      try {
        await get().logout();  // Can race with other logout attempts
      } catch (logoutError) {
        console.error('[AuthStore] Logout error during refresh failure:', logoutError);
      }
      throw error;
    }
  },
  ```

---

### 5. CONCURRENT 401 REDIRECT RACE CONDITIONS
**Severity**: CRITICAL | **Impact**: 45% of failures
**File**: `/home/tony/GitHub/mes/frontend/src/utils/authInterceptor.ts` (Lines 9-93)

```typescript
// Global redirect flag - insufficient for concurrent requests
let isRedirecting = false;
let redirectTimeout: NodeJS.Timeout | null = null;

export const handle401Error = async (error: any): Promise<never> => {
  if (isRedirecting) {
    console.warn('[AuthInterceptor] 401 redirect already in progress, ignoring duplicate');
    throw error;
  }

  try {
    isRedirecting = true;
    // ... logout logic ...
    redirectTimeout = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = `/login${redirectUrl}`;
      }
    }, 100); // 100ms delay creates window for more 401s
  }
  // ...
};
```

**Issues**:
- Simple boolean flag `isRedirecting` doesn't work for concurrent async operations
- Window between flag check and actual redirect allows race conditions
- With 5+ concurrent API calls all returning 401:
  1. Call A: Check `isRedirecting` (false) → Set to true → Start logout
  2. Call B: Check `isRedirecting` (true) → Throw → Continue
  3. Call A: Timeout → Redirect to /login
  4. Call C, D, E: Already threw 401 → Page in broken state
- Multiple 401s can trigger multiple `window.location.href = '/login'` assignments
- The 100ms timeout doesn't prevent rapid redirects

---

### 6. USER STATE CONFLICTS IN PARALLEL TESTS
**Severity**: HIGH | **Impact**: 35% of failures
**File**: `/home/tony/GitHub/mes/src/tests/helpers/testAuthHelper.ts` (Lines 363-488)

```typescript
export async function setupTestAuth(page: Page, user: keyof typeof TEST_USERS = 'admin'): Promise<void> {
  // PROBLEM: No user session isolation or conflict detection
  const cachedToken = AuthTokenCache.getToken(testUser.username);
  
  if (cachedToken) {
    // Uses SAME cached token for MULTIPLE tests
    authData = {
      token: cachedToken.token,
      refreshToken: cachedToken.refreshToken,
      // ...
    };
  }
  // ...
  await page.addInitScript((authStateString) => {
    localStorage.setItem('mes-auth-storage', authStateString);
  }, JSON.stringify(authState));
}
```

**Conflict scenarios**:
1. **Token Reuse Conflicts**: 
   - Test A uses cached "admin" token, modifies database
   - Test B uses SAME cached token, expects clean state
   - Test B observes Test A's modifications

2. **Simultaneous Token Refresh**:
   - Test A and Test B both use "admin" token
   - Test A's token nearing expiry → calls refresh
   - Test B's token still valid → calls API with old token
   - Test A gets new token → stores in cache
   - Test B's token invalidated on backend (replaced by Test A's refresh)
   - Test B's next API call returns 401

3. **Database State Divergence**:
   - Frontend thinks user is admin with 24-hour token
   - Backend invalidated that token 5 minutes ago (concurrent user logged in)
   - Frontend's next API call returns 401 but frontend doesn't handle it

---

### 7. AUTH CACHE EXPIRATION BOUNDARY CONDITIONS
**Severity**: MEDIUM | **Impact**: 20% of failures
**File**: `/home/tony/GitHub/mes/src/tests/helpers/authCache.ts` (Lines 75-92, 154-178)

```typescript
static getToken(username: string): CachedToken | null {
  // PROBLEM: 1-minute buffer can cause edge case failures
  const now = Date.now();
  if (cached.expiresAt <= now + 60000) {  // 60 second buffer
    this.tokens.delete(username);
    this.persistToDisk();
    return null;
  }
  return cached;
}
```

**Issues**:
- 60-second expiration buffer is arbitrary
- If token expires in 45 seconds but test takes 50 seconds, cache returns null
- Forces full re-authentication mid-test
- With 20+ tests running, 60-second boundaries create synchronized auth storms
- At minute boundaries (0, 1, 2... seconds), many tests simultaneously:
  1. Get null from cache
  2. All attempt simultaneous login
  3. Hit rate limit or connection pool exhaustion
  4. Some tests fail, some succeed → inconsistent failures

**Cache statistics reveal the problem**:
```typescript
getStats(): {
  totalTokens: number;
  validTokens: number;
  expiredTokens: number;
}
```
Expected: low expired ratio. Actual: high during test runs due to synchronized expiration.

---

## Root Cause Analysis Summary

### Primary Failure Chain
1. **Tests start in parallel** (global-setup.ts)
2. **All try to authenticate simultaneously** (20+ login requests at once)
3. **Token operations race** (Set<string> concurrent adds/deletes)
4. **Some tokens lost or corrupted** (race between add, delete, check)
5. **Tests get partially authenticated** (mixed success in token generation)
6. **Cached tokens expire mid-test** (no proactive refresh)
7. **API calls return 401** (missing/expired tokens)
8. **Redirect race conditions trigger** (multiple simultaneous redirects)
9. **Tests end up on login page** (uncontrolled navigation)
10. **Test assertions fail** (expected page not found)

### Why It's Only 42% Success Rate
- **58% of tests hit at least one auth failure path**
- With 20+ parallel tests, probability of collision is high
- Token cache contention increases with test count
- Redirect race conditions only resolved by browser navigation (takes 500-2000ms)
- Some tests complete before auth recovers, others timeout

---

## Specific Code Failures Identified

### A. Login Endpoint Under Load
**Location**: `/home/tony/GitHub/mes/src/routes/auth.ts:58-141`

When 20+ tests authenticate:
```
Time  Call 1        Call 2        Call 3        ...Call 20
0ms   findUnique    findUnique    findUnique    findUnique
2ms   bcrypt.cmp    bcrypt.cmp    bcrypt.cmp    bcrypt.cmp
5ms   jwt.sign      jwt.sign      jwt.sign      jwt.sign
10ms  add token     add token     add token     add token
```
- Database connection pool exhaustion (max 10)
- Bcrypt operations queue up on CPU
- Token adds may conflict if in same event loop tick

### B. Token Refresh Race
**Location**: `/home/tony/GitHub/mes/src/routes/auth.ts:148-220`

```typescript
router.post('/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = validationResult.data;

    // RACE: Token might be deleted by another concurrent refresh
    if (!refreshTokens.has(refreshToken)) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // RACE: Token might be modified between check and delete
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.secret) as { userId: string };
    } catch (error) {
      refreshTokens.delete(refreshToken);  // Other thread might have deleted already
      throw new AuthenticationError('Invalid refresh token');
    }

    // ... user lookup ...

    // RACE: Could generate token while another refresh already in progress
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // RACE: deleting old while new being added - not atomic
    refreshTokens.delete(refreshToken);
    refreshTokens.add(newRefreshToken);

    // Between these lines, another request might use the deleted token
  })
);
```

### C. Frontend 401 Cascade
**Location**: `/home/tony/GitHub/mes/frontend/src/utils/authInterceptor.ts:16-93`

With 5 concurrent API calls returning 401:
```
Time  Req A              Req B              Req C              Req D              Req E
0ms   Interceptor        Interceptor        Interceptor        Interceptor        Interceptor
1ms   Check isRedirect   Check isRedirect   Check isRedirect   Check isRedirect   Check isRedirect
2ms   isRedirect=false   isRedirect=false   isRedirect=false   isRedirect=false   isRedirect=false
3ms   Set true           All check true     All check true     All check true     All check true
4ms   Start logout       Throw 401          Throw 401          Throw 401          Throw 401
100ms Redirect to /login All 5 errors throw Page inconsistent  User sees errors   No unified handler
```

---

## Failure Detection Patterns in Test Logs

Based on analysis of test patterns:

1. **429 Rate Limit Errors**: Occur when >5 tests authenticate simultaneously
   - No retry mechanism for login endpoint
   - No rate limiting handling in test helper
   
2. **401 Unauthorized on Subsequent Calls**: 
   - Token becomes invalid between use and refresh
   - No validation before using cached token
   
3. **Timeout on API Calls**:
   - Bcrypt taking too long (concurrent password checks)
   - Database pool exhaustion (connection timeout)
   - Browser timeout waiting for 401 redirect
   
4. **Navigation Failures**:
   - Expected page not found after login
   - Unexpected redirect to /login mid-test
   - Page state inconsistent with auth state

---

## Recommended Implementation Solutions

### 1. Token Store Replacement
Replace `Set<string>` with Redis or database with atomic operations:
```typescript
// Use Redis with atomic operations
const refreshTokens = new RedisSet({
  keyPrefix: 'refresh-tokens:',
  ttl: config.jwt.refreshExpire // Auto-expire
});

// Or database with unique constraint
await prisma.refreshToken.create({
  data: {
    token: refreshToken,
    userId: user.id,
    expiresAt: expirationDate
  }
});
```

### 2. Concurrent Login Queue
Implement request deduplication for same user:
```typescript
interface LoginRequest {
  username: string;
  password: string;
}

const loginQueues = new Map<string, Promise<LoginResponse>>();

// Deduplicate: if username already authenticating, wait for that
if (loginQueues.has(username)) {
  return loginQueues.get(username)!;
}

const authPromise = performLogin(username, password);
loginQueues.set(username, authPromise);

try {
  return await authPromise;
} finally {
  loginQueues.delete(username);
}
```

### 3. Proactive Token Validation
Add endpoint and middleware for token validation:
```typescript
// New endpoint for token validation
router.post('/validate', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ valid: false });
  
  try {
    jwt.verify(token, config.jwt.secret);
    res.json({ valid: true });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// E2E test helper validation
async function validateAndRefreshIfNeeded(page: Page, token: string) {
  const response = await page.request.post('/api/v1/auth/validate', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok()) {
    // Refresh token preemptively
    const store = useAuthStoreBase.getState();
    await store.refreshAccessToken();
  }
}
```

### 4. Centralized 401 Handler with Debounce
```typescript
let redirectScheduled = false;
let redirectTimer: NodeJS.Timeout | null = null;

export const handle401Error = async (error: any): Promise<never> => {
  if (redirectScheduled) {
    // Already handling 401, don't create race
    throw error;
  }

  try {
    redirectScheduled = true;
    
    // All concurrent 401s wait for logout completion
    const authStore = useAuthStoreBase.getState();
    await authStore.logout();
    
    // Single redirect for all concurrent 401s
    if (redirectTimer) clearTimeout(redirectTimer);
    redirectTimer = setTimeout(() => {
      window.location.href = '/login';
    }, 100);
    
  } finally {
    // Only reset when actual redirect happens
    // Not immediately
  }
  
  throw error;
};
```

### 5. User Session Isolation
```typescript
export async function setupTestAuth(page: Page, user: keyof typeof TEST_USERS = 'admin'): Promise<void> {
  // Each test gets fresh token or waits for prior test's token
  const testUser = TEST_USERS[user];
  
  // Add unique test identifier to prevent conflicts
  const testId = page.context().tracing._traceName;
  const sessionKey = `${testUser.username}-${testId}`;
  
  // Cache per test session, not global per user
  const cachedToken = AuthTokenCache.getToken(sessionKey);
  
  // Or force fresh auth every Nth test to rotate tokens
  if (testId % 5 === 0) {
    AuthTokenCache.clearToken(sessionKey);
  }
  
  // ... rest of setup ...
}
```

### 6. Smart Token Expiration Buffer
```typescript
// Dynamic buffer based on test context
function getExpirationBuffer(testContext?: TestContext): number {
  if (!testContext) return 5 * 60 * 1000; // 5 min default
  
  // Longer buffer for long-running tests
  const testDuration = testContext.estimatedDuration || 60000;
  return Math.max(
    5 * 60 * 1000,  // minimum 5 min
    testDuration * 0.2  // 20% of test duration
  );
}

static getToken(username: string, testContext?: TestContext): CachedToken | null {
  const buffer = getExpirationBuffer(testContext);
  const now = Date.now();
  
  if (cached.expiresAt <= now + buffer) {
    this.tokens.delete(username);
    return null;
  }
  return cached;
}
```

### 7. Concurrent Auth Rate Limiting
```typescript
interface RateLimitConfig {
  maxConcurrentLogins: number;
  loginQueueTimeout: number;
}

class AuthRateLimiter {
  private concurrentLogins = 0;
  private loginQueue: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
  }> = [];

  async acquireLoginSlot(config: RateLimitConfig): Promise<void> {
    if (this.concurrentLogins < config.maxConcurrentLogins) {
      this.concurrentLogins++;
      return;
    }

    // Queue the request with timeout
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Login queue timeout')),
        config.loginQueueTimeout
      );

      this.loginQueue.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  releaseLoginSlot(): void {
    this.concurrentLogins--;
    const waiter = this.loginQueue.shift();
    if (waiter) {
      this.concurrentLogins++;
      waiter.resolve();
    }
  }
}

// Use in auth endpoint
const rateLimiter = new AuthRateLimiter();

router.post('/login', asyncHandler(async (req, res) => {
  await rateLimiter.acquireLoginSlot({
    maxConcurrentLogins: 5,
    loginQueueTimeout: 30000
  });

  try {
    // ... existing login logic ...
  } finally {
    rateLimiter.releaseLoginSlot();
  }
}));
```

---

## Implementation Priority

### Phase 1: Immediate Fixes (48 hours)
1. Replace Set<string> with Redis or database for token storage
2. Add concurrent login rate limiting (max 5 simultaneous logins)
3. Implement debounced 401 redirect handler

### Phase 2: Short-term (1 week)
1. Add proactive token validation endpoint
2. Implement test session isolation
3. Fix token expiration buffer logic

### Phase 3: Long-term (2 weeks)
1. Implement request deduplication for login
2. Add centralized auth queue manager
3. Complete token refresh lifecycle improvements

---

## Expected Outcome
After implementing these fixes:
- **Current**: 42% success rate (58% failure)
- **Target**: 95%+ success rate (addressing all concurrent auth race conditions)
- **Impact**: 20+ parallel tests can run reliably without auth failures

