# Security Best Practices Guide

## Overview

This guide establishes comprehensive security standards for the MachShop platform ecosystem, covering authentication, authorization, input validation, data protection, and secure API design. All developers must adhere to these practices to ensure the security and integrity of the platform.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Input Validation & Sanitization](#input-validation--sanitization)
3. [API Key Management](#api-key-management)
4. [Rate Limiting & DDoS Protection](#rate-limiting--ddos-protection)
5. [Audit Logging & Monitoring](#audit-logging--monitoring)
6. [Secure Error Handling](#secure-error-handling)
7. [HTTPS/TLS Requirements](#httpstls-requirements)
8. [CORS & Origin Validation](#cors--origin-validation)
9. [Dependency Management & Supply Chain Security](#dependency-management--supply-chain-security)
10. [Data Protection & Privacy](#data-protection--privacy)
11. [SQL Injection Prevention](#sql-injection-prevention)
12. [XSS Prevention](#xss-prevention)
13. [CSRF Protection](#csrf-protection)
14. [Plugin Security](#plugin-security)
15. [Security Checklist](#security-checklist)

---

## Authentication & Authorization

### JWT Implementation

All APIs requiring authentication must use JWT (JSON Web Tokens) with the following specifications:

**Token Structure:**
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Token Algorithm**: HS256 (HMAC with SHA-256) for symmetric key signing
- **Token Expiration**:
  - Short-lived access tokens: 15-60 minutes
  - Refresh tokens: 7-30 days
  - Remember-me tokens: up to 90 days (with additional verification)

**Token Payload Requirements:**
```json
{
  "sub": "user-id",
  "iat": 1704067200,
  "exp": 1704070800,
  "iss": "machshop-api",
  "aud": "machshop-platform",
  "role": "user",
  "siteId": "site-123",
  "permissions": ["work_orders:read", "materials:read"]
}
```

**Implementation Rules:**
- Always validate token signature using the same secret key
- Verify token expiration before processing requests
- Implement token refresh mechanism to issue new tokens without re-authentication
- Store refresh tokens server-side with revocation capability
- Include `siteId` and `role` in token payload for efficient authorization checks
- Never include sensitive data (passwords, API keys, credit card info) in token payload

**Token Security:**
```typescript
// CORRECT: Validate token signature and expiration
import jwt from 'jsonwebtoken';

function validateToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'machshop-api',
      audience: 'machshop-platform'
    });

    // Token is valid
    return decoded;
  } catch (error) {
    // Token is invalid, expired, or tampered with
    throw new Error('Invalid token');
  }
}

// WRONG: Not validating token signature
const decoded = jwt.decode(token); // ❌ Does not verify signature!

// WRONG: Not verifying expiration
jwt.verify(token, secret, { ignoreExpiration: true }); // ❌ Dangerous!
```

### Role-Based Access Control (RBAC)

Implement a hierarchical role system with explicit permission mapping:

**Predefined Roles:**
- `admin`: Full platform access, system configuration
- `site_admin`: Site-specific administration
- `supervisor`: Work order management, reporting
- `operator`: Execute work orders, material consumption
- `viewer`: Read-only access to reports and dashboards
- `plugin_admin`: Plugin installation and configuration (enterprise)

**Permission System:**
```typescript
// Permission format: RESOURCE:ACTION
const PERMISSIONS = {
  // Work Orders
  WORK_ORDERS_READ: 'work_orders:read',
  WORK_ORDERS_CREATE: 'work_orders:create',
  WORK_ORDERS_UPDATE: 'work_orders:update',
  WORK_ORDERS_DELETE: 'work_orders:delete',

  // Materials
  MATERIALS_READ: 'materials:read',
  MATERIALS_WRITE: 'materials:write',
  MATERIALS_DELETE: 'materials:delete',

  // Users
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',

  // Admin
  ADMIN_PANEL: 'admin:access',
  SYSTEM_CONFIG: 'system:configure',
  AUDIT_LOGS: 'audit:read'
};

const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  site_admin: [
    'work_orders:read', 'work_orders:create', 'work_orders:update',
    'materials:read', 'materials:write',
    'users:read', 'users:write',
    'audit:read'
  ],
  supervisor: [
    'work_orders:read', 'work_orders:create', 'work_orders:update',
    'materials:read', 'materials:write',
    'reports:read'
  ],
  operator: [
    'work_orders:read', 'work_orders:update',
    'materials:read', 'materials:write'
  ],
  viewer: [
    'work_orders:read', 'materials:read', 'reports:read'
  ]
};
```

**Authorization Middleware:**
```typescript
// CORRECT: Check permissions in middleware
import { Request, Response, NextFunction } from 'express';

function requirePermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userPermissions = user.permissions || [];
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required permission: ${requiredPermission}`
      });
    }

    next();
  };
}

// Use in routes
router.post('/work-orders',
  requirePermission('work_orders:create'),
  createWorkOrderHandler
);

// WRONG: Only checking role
function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) { // ❌ Not granular enough
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

### Multi-Site Authorization

In multi-tenant environments, always validate that users can only access data for their assigned sites:

```typescript
// CORRECT: Validate site context
async function getWorkOrders(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const siteId = (req as any).user.siteId;

  if (!siteId) {
    return res.status(400).json({ error: 'Site context required' });
  }

  const workOrders = await prisma.workOrder.findMany({
    where: {
      siteId, // Always filter by user's site
      // ... other filters
    }
  });

  return res.json({ data: workOrders });
}

// WRONG: No site validation
async function getWorkOrdersUnsafe(req: Request, res: Response) {
  const workOrders = await prisma.workOrder.findMany(); // ❌ No filtering!
  return res.json({ data: workOrders });
}

// WRONG: Client-provided site ID without validation
async function getWorkOrdersUnsafe2(req: Request, res: Response) {
  const { siteId } = req.query; // ❌ User could request other sites!
  const workOrders = await prisma.workOrder.findMany({
    where: { siteId }
  });
  return res.json({ data: workOrders });
}
```

---

## Input Validation & Sanitization

### Validation Strategy

All user input must be validated on the server side before processing:

**Validation Levels:**
1. **Type Validation**: Ensure data is of correct type (string, number, boolean, etc.)
2. **Format Validation**: Ensure data matches expected format (email, URL, date, etc.)
3. **Range Validation**: Ensure data is within acceptable bounds
4. **Business Logic Validation**: Ensure data satisfies business requirements

**Using Zod for Schema Validation:**
```typescript
import { z } from 'zod';

// CORRECT: Comprehensive input validation
const createWorkOrderSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters'),

  description: z.string()
    .max(5000, 'Description must not exceed 5000 characters')
    .optional(),

  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .default('MEDIUM'),

  dueDate: z.string()
    .datetime()
    .refine(
      (date) => new Date(date) > new Date(),
      'Due date must be in the future'
    ),

  assignedTo: z.string()
    .uuid('Invalid user ID format'),

  tags: z.array(z.string().max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),

  customFields: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()])
  )
    .optional()
    .refine(
      (obj) => !obj || Object.keys(obj).length <= 20,
      'Maximum 20 custom fields allowed'
    )
});

router.post('/work-orders', async (req: Request, res: Response) => {
  try {
    const validInput = createWorkOrderSchema.parse(req.body);
    // Process validated input
    res.status(201).json({ data: workOrder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code
        }))
      });
    }
  }
});

// WRONG: No input validation
router.post('/work-orders', async (req: Request, res: Response) => {
  const { title, description } = req.body;
  // ❌ No validation - could accept invalid data
  const workOrder = await prisma.workOrder.create({
    data: { title, description }
  });
  res.status(201).json({ data: workOrder });
});
```

### Sanitization

Remove or escape potentially dangerous characters from user input:

```typescript
import xss from 'xss';
import sanitizeHtml from 'sanitize-html';

// CORRECT: Sanitize HTML content
function sanitizeUserInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li'],
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
    },
    disallowedTagsMode: 'discard',
    selfClosing: ['br', 'hr', 'img'],
    transformTags: {
      'a': sanitizeHtml.simpleTransform('a', { 'target': '_blank' }),
    }
  });
}

// CORRECT: Escape HTML entities for display
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// WRONG: No sanitization
router.post('/comments', async (req: Request, res: Response) => {
  const { text } = req.body;
  // ❌ Dangerous - XSS vulnerability!
  await prisma.comment.create({
    data: { text } // Could contain <script> tags
  });
});
```

---

## API Key Management

### API Key Generation & Storage

For service-to-service or third-party integrations:

```typescript
// CORRECT: Generate cryptographically secure keys
import crypto from 'crypto';

function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Store in database with hash
async function createApiKey(userId: string, name: string) {
  const plainKey = generateApiKey();
  const hashedKey = crypto
    .createHash('sha256')
    .update(plainKey)
    .digest('hex');

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash: hashedKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      isActive: true
    }
  });

  // Return plaintext key only once to user
  return {
    id: apiKey.id,
    key: plainKey,
    message: 'Store this key securely. You will not see it again.'
  };
}

// CORRECT: Validate API key from header
async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const keyMatch = authHeader.match(/Bearer\s+([a-f0-9]{64})/);

  if (!keyMatch) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }

  const providedKey = keyMatch[1];
  const hashedKey = crypto
    .createHash('sha256')
    .update(providedKey)
    .digest('hex');

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hashedKey }
  });

  if (!apiKey || !apiKey.isActive) {
    return res.status(401).json({ error: 'Invalid or revoked API key' });
  }

  if (apiKey.expiresAt < new Date()) {
    return res.status(401).json({ error: 'API key expired' });
  }

  (req as any).apiKey = apiKey;
  (req as any).userId = apiKey.userId;
  next();
}

// WRONG: Storing plaintext keys
async function createApiKeyUnsafe(userId: string, name: string) {
  const plainKey = crypto.randomBytes(32).toString('hex');
  // ❌ Never store plaintext keys!
  await prisma.apiKey.create({
    data: {
      userId,
      name,
      key: plainKey // WRONG - should be hashed
    }
  });
}

// WRONG: Exposing key in response multiple times
function validateApiKeyUnsafe(providedKey: string) {
  const apiKey = await prisma.apiKey.findFirst({
    where: { key: providedKey } // ❌ Comparing plaintext!
  });
  return apiKey;
}
```

### API Key Rotation

Implement regular key rotation with overlap period:

```typescript
async function rotateApiKey(oldKeyId: string, userId: string) {
  // Create new key
  const newPlainKey = generateApiKey();
  const newHashedKey = crypto
    .createHash('sha256')
    .update(newPlainKey)
    .digest('hex');

  const newKey = await prisma.apiKey.create({
    data: {
      userId,
      name: `Rotated from ${oldKeyId}`,
      keyHash: newHashedKey,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true
    }
  });

  // Mark old key for deprecation (7-day grace period)
  await prisma.apiKey.update({
    where: { id: oldKeyId },
    data: {
      deprecatedAt: new Date(),
      deprecationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  return {
    newKey: newPlainKey,
    deprecationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    message: 'Old key will be deactivated in 7 days'
  };
}
```

---

## Rate Limiting & DDoS Protection

### Implement Rate Limiting

Protect APIs from abuse and DDoS attacks:

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient();

// CORRECT: Configure per-endpoint rate limits
const standardLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:standard:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req: Request) => {
    // Use JWT user ID if authenticated, otherwise use IP
    return (req as any).user?.id || req.ip!;
  },
  skip: (req: Request) => {
    // Don't rate limit health checks or public endpoints
    return req.path === '/health';
  }
});

const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  keyGenerator: (req: Request) => {
    return req.body?.email || req.ip!; // Limit by email + IP
  },
  skipSuccessfulRequests: true // Don't count successful attempts
});

// Apply rate limiters to routes
router.post('/login', authLimiter, loginHandler);
router.post('/register', authLimiter, registerHandler);
router.get('/work-orders', standardLimiter, getWorkOrdersHandler);

// WRONG: No rate limiting
router.post('/login', loginHandler); // ❌ Vulnerable to brute force
```

### Rate Limit Response Headers

Always include rate limit information in responses:

```typescript
// Example rate limit headers
HTTP/1.1 200 OK
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1640123456

// When limit exceeded:
HTTP/1.1 429 Too Many Requests
Retry-After: 420
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1640123456
```

### DDoS Protection Strategy

- **CloudFlare or WAF**: Use Web Application Firewall for DDoS protection
- **Bot Detection**: Implement CAPTCHA for suspicious traffic patterns
- **IP Blocking**: Maintain blocklist of known malicious IPs
- **Request Size Limits**: Limit request body size to prevent large payload attacks
- **Connection Limits**: Limit concurrent connections per IP

```typescript
// CORRECT: Set request size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb' }));

// CORRECT: Set timeout for requests
app.set('request timeout', 30000); // 30 seconds
```

---

## Audit Logging & Monitoring

### Comprehensive Audit Logging

Log all security-relevant actions:

```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: {
    before: any;
    after: any;
  };
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
}

// CORRECT: Create audit log for sensitive operations
async function createAuditLog(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  req: Request,
  status: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
  changes?: any,
  errorMessage?: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resourceType,
      resourceId,
      changes,
      ipAddress: req.ip!,
      userAgent: req.get('user-agent')!,
      status,
      errorMessage,
      timestamp: new Date()
    }
  });
}

// CORRECT: Log all sensitive operations
router.post('/users/:id/permissions/grant', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const targetUserId = req.params.id;
  const { permissions } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { permissions }
    });

    // Log successful permission grant
    await createAuditLog(
      userId,
      'PERMISSION_GRANT',
      'User',
      targetUserId,
      req,
      'SUCCESS',
      { before: [], after: permissions }
    );

    res.json({ data: updated });
  } catch (error) {
    // Log failed attempt
    await createAuditLog(
      userId,
      'PERMISSION_GRANT',
      'User',
      targetUserId,
      req,
      'FAILURE',
      undefined,
      (error as Error).message
    );

    res.status(500).json({ error: 'Failed to grant permissions' });
  }
});

// Log sensitive actions:
// - User creation/deletion/modification
// - Permission changes
// - API key generation/revocation
// - Configuration changes
// - Bulk data operations
// - Admin panel access
```

### Monitoring & Alerting

Set up monitoring for security events:

```typescript
// Monitor for suspicious patterns
async function checkSecurityAlerts() {
  // Failed login attempts
  const failedLogins = await prisma.auditLog.findMany({
    where: {
      action: 'LOGIN',
      status: 'FAILURE',
      timestamp: { gte: new Date(Date.now() - 15 * 60 * 1000) }
    }
  });

  // Alert if > 5 failed attempts from same IP in 15 minutes
  const ipGroups = new Map<string, number>();
  for (const log of failedLogins) {
    const count = (ipGroups.get(log.ipAddress) || 0) + 1;
    ipGroups.set(log.ipAddress, count);

    if (count > 5) {
      // Alert security team
      await notifySecurityTeam({
        severity: 'HIGH',
        type: 'BRUTE_FORCE_ATTEMPT',
        ipAddress: log.ipAddress,
        attempts: count
      });
    }
  }

  // Unusual permission grants
  const recentPermissions = await prisma.auditLog.findMany({
    where: {
      action: 'PERMISSION_GRANT',
      timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) }
    }
  });

  // Alert if user grants high-risk permissions outside business hours
  for (const log of recentPermissions) {
    const hour = new Date(log.timestamp).getHours();
    if (hour < 6 || hour > 22) { // Outside 6 AM - 10 PM
      const permissions = (log.changes?.after || []) as string[];
      const highRisk = permissions.some(p =>
        ['users:write', 'system:configure'].includes(p)
      );

      if (highRisk) {
        await notifySecurityTeam({
          severity: 'MEDIUM',
          type: 'UNUSUAL_PERMISSION_GRANT',
          userId: log.userId,
          timestamp: log.timestamp
        });
      }
    }
  }
}
```

---

## Secure Error Handling

### Error Response Security

Never leak sensitive information in error messages:

```typescript
// CORRECT: Generic error messages
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      // Don't reveal why the resource doesn't exist
      return res.status(404).json({
        error: 'Not found',
        errorCode: 'RESOURCE_NOT_FOUND'
      });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('Error fetching user:', error); // Log full error server-side

    // Return generic error to client
    res.status(500).json({
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
      traceId: generateTraceId() // For tracking, but doesn't expose details
    });
  }
});

// WRONG: Leaking implementation details
router.get('/users/:id', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id }
  });

  // ❌ Reveals database structure and details
  if (!user) {
    res.status(500).json({
      error: 'Prisma findUnique returned null for id ' + req.params.id
    });
  }
});

// WRONG: Returning stack traces
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  // ❌ Never send stack traces to client
  res.status(500).json({
    error: error.message,
    stack: error.stack // DANGEROUS
  });
});
```

### Structured Logging

Log errors securely for debugging:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'machshop-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// CORRECT: Log errors with context but no sensitive data
try {
  await performDangerousOperation();
} catch (error) {
  logger.error('Operation failed', {
    operation: 'performDangerousOperation',
    userId: userId, // OK to log
    timestamp: new Date().toISOString(),
    errorCode: (error as any).code,
    errorMessage: (error as Error).message,
    // DO NOT include:
    // - password hashes
    // - API keys
    // - credit card numbers
    // - personal identification numbers
  });
}

// Filter sensitive data from logs
function sanitizeForLogging(data: any): any {
  const sensitiveFields = ['password', 'apiKey', 'creditCard', 'ssn', 'token'];
  const copy = { ...data };

  for (const field of sensitiveFields) {
    if (field in copy) {
      copy[field] = '[REDACTED]';
    }
  }

  return copy;
}
```

---

## HTTPS/TLS Requirements

### Enforce HTTPS

All API endpoints must use HTTPS in production:

```typescript
// CORRECT: Redirect HTTP to HTTPS
app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect('https://' + req.get('host') + req.url);
    }
  }
  next();
});

// CORRECT: Set HSTS header
app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    // Tell browsers to always use HTTPS for 1 year
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// CORRECT: Disable insecure ciphers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.machshop.local']
    }
  }
}));

// WRONG: Accepting HTTP in production
app.listen(80); // ❌ No HTTPS
```

### Certificate Management

- Use certificates from trusted Certificate Authorities
- Implement certificate pinning for high-security endpoints
- Automate certificate renewal (e.g., Let's Encrypt with cert-bot)
- Regular security audits of TLS configuration

---

## CORS & Origin Validation

### Properly Configure CORS

```typescript
import cors from 'cors';

// CORRECT: Strict CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');

app.use(cors({
  origin: function (origin: string | undefined, callback: Function) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'RateLimit-Remaining'],
  maxAge: 86400 // 24 hours
}));

// WRONG: Allow all origins
app.use(cors()); // ❌ Allows any domain to access API

// WRONG: Reflect origin without validation
app.use(cors({
  origin: (origin) => {
    // ❌ Dangerous - reflects any origin
    return origin;
  }
}));
```

### Preflight Requests

Handle OPTIONS preflight correctly:

```typescript
// Express with CORS middleware handles this automatically
// But verify in integration tests:

// CORRECT: OPTIONS request returns proper headers
// Request: OPTIONS /api/work-orders
// Response headers should include:
// - Access-Control-Allow-Origin: https://allowed-domain.com
// - Access-Control-Allow-Methods: GET, POST, PUT, DELETE
// - Access-Control-Allow-Headers: Content-Type, Authorization
// - Access-Control-Max-Age: 86400
```

---

## Dependency Management & Supply Chain Security

### Vulnerability Scanning

Regularly scan dependencies for vulnerabilities:

```bash
# CORRECT: Use npm audit to identify vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Run in CI/CD pipeline
npm audit --audit-level=high --exit-code=1
```

### Dependency Pinning

Use exact versions for critical dependencies:

```json
{
  "dependencies": {
    "express": "4.18.2",
    "jsonwebtoken": "9.0.0",
    "prisma": "4.9.0",
    "zod": "3.20.2"
  }
}
```

### Regular Updates

- Review and test dependency updates monthly
- Prioritize security patches
- Use tools like Dependabot for automated PRs
- Establish upgrade policies for major version changes

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    allow:
      - dependency-type: "direct"
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
```

---

## Data Protection & Privacy

### Encryption

Encrypt sensitive data at rest and in transit:

```typescript
import crypto from 'crypto';

// CORRECT: Encrypt sensitive fields
function encryptSensitiveData(plaintext: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey, 'hex'),
    iv
  );

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return iv:encryptedData:authTag
  return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
}

function decryptSensitiveData(encrypted: string, encryptionKey: string): string {
  const [ivHex, encryptedHex, authTagHex] = encrypted.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey, 'hex'),
    iv
  );

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// CORRECT: Encrypt in Prisma middleware
prisma.$use(async (params, next) => {
  if (params.model === 'User' && params.action === 'create') {
    params.args.data.ssn = encryptSensitiveData(
      params.args.data.ssn,
      process.env.ENCRYPTION_KEY!
    );
  }
  return next(params);
});

// WRONG: Storing plaintext sensitive data
async function createUser(email: string, ssn: string) {
  // ❌ SSN stored in plaintext!
  await prisma.user.create({
    data: { email, ssn }
  });
}
```

### Data Retention & Deletion

Implement data retention policies:

```typescript
// CORRECT: Delete data after retention period
async function deleteExpiredData() {
  const retentionDays = 90;
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  // Delete old audit logs
  await prisma.auditLog.deleteMany({
    where: { timestamp: { lt: cutoffDate } }
  });

  // Delete old temporary tokens
  await prisma.tempToken.deleteMany({
    where: { createdAt: { lt: cutoffDate } }
  });

  // Archive old work orders
  await prisma.workOrder.updateMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: 'COMPLETED'
    },
    data: { isArchived: true }
  });
}

// CORRECT: Allow users to request data deletion
router.delete('/users/me',
  requireAuthentication,
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    // Mark for deletion instead of immediate delete
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: new Date(),
        deletionScheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: false
      }
    });

    res.json({ message: 'Deletion scheduled for 30 days' });
  }
);
```

### PII (Personally Identifiable Information) Handling

- Never log PII without masking
- Implement field-level encryption for PII
- Restrict access to PII fields to authorized users only
- Implement audit logging for PII access

```typescript
// CORRECT: Mask PII in logs
function maskPII(data: any) {
  return {
    ...data,
    email: data.email ? data.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : undefined,
    phone: data.phone ? data.phone.replace(/(\d{3})(\d{3})(\d{4})/, '***-***-$3') : undefined,
    ssn: data.ssn ? data.ssn.replace(/.*/, '***-**-****') : undefined
  };
}

logger.info('User accessed', maskPII(userData));
```

---

## SQL Injection Prevention

### Use Parameterized Queries

Always use Prisma ORM or parameterized queries. Never use string concatenation:

```typescript
// CORRECT: Use Prisma with proper parameterization
const userByEmail = await prisma.user.findUnique({
  where: { email: userInput.email }
});

// CORRECT: Use parameterized queries if raw SQL is necessary
const users = await prisma.$queryRaw`
  SELECT * FROM "User" WHERE email = ${userInput.email}
`;

// WRONG: String concatenation (SQL Injection vulnerability!)
const query = "SELECT * FROM User WHERE email = '" + userInput.email + "'";
const user = await prisma.$queryRawUnsafe(query); // ❌ DANGEROUS!

// WRONG: Template literals without parameterization
const query = `SELECT * FROM User WHERE email = '${userInput.email}'`; // ❌ Still dangerous!
const user = await prisma.$queryRaw(query);
```

### Input Validation for Raw SQL

If raw SQL is necessary, validate all inputs:

```typescript
// ONLY if Prisma doesn't support the query:
async function customQuery(tableName: string, searchTerm: string) {
  // CORRECT: Whitelist table names (not parameterizable)
  const allowedTables = ['users', 'work_orders', 'materials'];
  if (!allowedTables.includes(tableName)) {
    throw new Error('Invalid table');
  }

  // CORRECT: Parameterize search input
  return prisma.$queryRaw`
    SELECT * FROM "${prisma.raw(tableName)}"
    WHERE name ILIKE ${`%${searchTerm}%`}
  `;
}
```

---

## XSS Prevention

### Content Security Policy (CSP)

Implement strict CSP headers:

```typescript
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Minimize inline scripts
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://api.machshop.local'],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: []
  }
}));
```

### Output Encoding

Properly encode output for the context:

```typescript
// CORRECT: Encode for HTML context
function encodeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// CORRECT: Encode for JavaScript context
function encodeJS(str: string): string {
  return JSON.stringify(str); // Safe for embedding in JS strings
}

// CORRECT: Encode for URL context
function encodeURL(str: string): string {
  return encodeURIComponent(str);
}

// WRONG: No encoding (XSS vulnerability!)
response.json({
  message: userInput.comment // ❌ Could contain <script> tags
});
```

---

## CSRF Protection

### CSRF Tokens

Implement CSRF token protection for state-changing operations:

```typescript
import csrf from 'csurf';
import session from 'express-session';

// CORRECT: Configure CSRF protection
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  }
}));

const csrfProtection = csrf({ cookie: false }); // Use sessions instead

// GET endpoint returns CSRF token
router.get('/form', csrfProtection, (req: Request, res: Response) => {
  res.json({ csrfToken: (req as any).csrfToken() });
});

// POST endpoint validates CSRF token
router.post('/work-orders', csrfProtection, async (req: Request, res: Response) => {
  // CSRF token is automatically validated by middleware
  const workOrder = await createWorkOrder(req.body);
  res.json({ data: workOrder });
});

// CORRECT: Set SameSite cookie attribute
app.use((req: Request, res: Response, next: NextFunction) => {
  res.cookie('sessionId', generateSessionId(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' // Prevents CSRF
  });
  next();
});
```

---

## Plugin Security

Comprehensive security for third-party plugins:

### Plugin Sandbox & Isolation

```typescript
// Plugins run in isolated V8 context with limited access
import { Worker } from 'worker_threads';

async function executePlugin(pluginCode: string, context: any) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(pluginCode, {
      eval: true
    });

    // Limit available globals
    const sandbox = {
      // Allowed APIs only
      console: { log: console.log },
      // No access to: fs, process, require, global, etc.
    };

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.postMessage(context);
  });
}
```

### Plugin Permission Validation

See `PluginValidationService` in the codebase for:
- Permission analysis and risk levels
- Hook point validation
- Dependency scanning
- Security scan for suspicious patterns

---

## Security Checklist

Use this checklist before deploying any API or feature:

- [ ] **Authentication**
  - [ ] Using JWT with secure algorithm (HS256 or RS256)
  - [ ] Token expiration configured (short-lived access tokens)
  - [ ] Refresh token mechanism implemented
  - [ ] Tokens validated on every protected endpoint

- [ ] **Authorization**
  - [ ] Role-based access control (RBAC) implemented
  - [ ] Permission checks on all sensitive operations
  - [ ] Multi-site/tenant data properly isolated
  - [ ] No privilege escalation possible

- [ ] **Input Validation**
  - [ ] All inputs validated with Zod schemas
  - [ ] Type, format, and range validation implemented
  - [ ] Business logic validation enforced
  - [ ] HTML/SQL sanitization applied

- [ ] **API Security**
  - [ ] HTTPS/TLS enforced in production
  - [ ] HSTS header set
  - [ ] CORS properly configured (no wildcard origins)
  - [ ] Rate limiting implemented
  - [ ] Request size limits set
  - [ ] Timeout configured

- [ ] **Error Handling**
  - [ ] No sensitive data in error messages
  - [ ] Stack traces not exposed to clients
  - [ ] Structured logging implemented
  - [ ] Audit logging for sensitive operations

- [ ] **Data Protection**
  - [ ] Sensitive data encrypted at rest
  - [ ] Encryption in transit (TLS)
  - [ ] Data retention policy implemented
  - [ ] PII access restricted and logged
  - [ ] Data deletion mechanism implemented

- [ ] **API Keys (if applicable)**
  - [ ] Keys generated cryptographically
  - [ ] Keys stored as hashes only
  - [ ] Key rotation mechanism implemented
  - [ ] Expired/revoked keys blocked
  - [ ] Key expiration enforced

- [ ] **Dependencies**
  - [ ] npm audit run and no high/critical issues
  - [ ] Dependencies regularly updated
  - [ ] Vulnerable packages identified and fixed
  - [ ] Dependency versions pinned

- [ ] **Monitoring**
  - [ ] Audit logging for all sensitive actions
  - [ ] Security alerts configured
  - [ ] Failed authentication attempts logged
  - [ ] Rate limit breaches monitored
  - [ ] Unusual activity patterns detected

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [CWE Top 25](https://cwe.mitre.org/top25/2022/)
