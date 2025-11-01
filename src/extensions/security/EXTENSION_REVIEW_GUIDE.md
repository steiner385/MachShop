# Extension Security & Code Review Framework Guide

## Overview

The Extension Security & Code Review Framework provides comprehensive security scanning, code quality validation, and governance workflows for the MachShop extension ecosystem. This guide covers the security review process, best practices, and workflows for extension developers and reviewers.

---

## Table of Contents

1. [Security Review Process](#security-review-process)
2. [Code Quality Standards](#code-quality-standards)
3. [Security Scanning](#security-scanning)
4. [Approval Workflows](#approval-workflows)
5. [Common Issues & Remediation](#common-issues--remediation)
6. [Best Practices](#best-practices)
7. [API Reference](#api-reference)

---

## Security Review Process

### Overview

Every extension submitted to the MachShop marketplace undergoes a multi-stage security review:

1. **Automated Scanning** - Vulnerability, dependency, license, and secret detection
2. **Code Quality Analysis** - Complexity, test coverage, maintainability metrics
3. **Policy Validation** - Permission scope, dangerous API usage, resource limits
4. **Manual Review** - Security expert review and approval

### Submission Workflow

```typescript
import { ReviewWorkflowManager, SecurityReviewEngine } from '@machshop/extension-sdk/security';

const reviewManager = new ReviewWorkflowManager();
const reviewEngine = new SecurityReviewEngine();

// 1. Submit extension for review
const request = await reviewManager.submitForReview({
  extensionId: 'my-extension',
  version: '1.0.0',
  repositoryUrl: 'https://github.com/owner/my-extension',
  publisherName: 'My Company',
  extensionTier: 'PREMIUM',
});

// 2. Perform automated security review
const review = await reviewEngine.performSecurityReview({
  extensionId: 'my-extension',
  version: '1.0.0',
  code: readFileSync('src/index.ts', 'utf-8'),
  packageJson: readFileSync('package.json', 'utf-8'),
  repositoryUrl: 'https://github.com/owner/my-extension',
});

// 3. Approve or reject
if (review.riskLevel !== 'CRITICAL') {
  const approval = await reviewManager.approveReview('my-extension', 'security-reviewer', [
    'Monitor vulnerability reports',
    'Update dependencies within 30 days'
  ]);
}
```

### Review Result Structure

Each security review returns a comprehensive result:

```typescript
interface SecurityReviewResult {
  extensionId: string;
  version: string;
  timestamp: Date;
  findings: SecurityFinding[];
  codeQualityMetrics: CodeQualityMetrics;
  dependencyAnalysis: DependencyAnalysis;
  licenseCompliance: LicenseComplianceResult;
  policyViolations: PolicyViolation[];
  riskScore: number; // 0-100
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
  recommendedAction: 'BLOCK' | 'REJECT' | 'REVIEW' | 'APPROVE_WITH_CONDITIONS' | 'APPROVE';
  summary: string;
}
```

---

## Code Quality Standards

### Minimum Requirements

- **Test Coverage**: ≥ 90%
- **Code Complexity**: Cyclomatic complexity ≤ 15 per function
- **Maintainability Index**: ≥ 70
- **Duplication**: ≤ 5% of code base
- **Code Smells**: Max 3 per module

### Metrics Explained

#### Test Coverage
Percentage of code lines executed by tests. MachShop requires 90%+ coverage to ensure reliability.

```typescript
// Good: Well-tested code
export function calculatePrice(quantity: number, unitPrice: number): number {
  if (quantity <= 0) throw new Error('Invalid quantity');
  if (unitPrice < 0) throw new Error('Invalid price');
  return quantity * unitPrice;
}

// Test coverage:
test('calculatePrice with positive values', () => {
  expect(calculatePrice(5, 10)).toBe(50);
});
```

#### Cyclomatic Complexity
Measures number of decision branches. Lower is better.

```typescript
// High complexity: 8 branches
function processOrder(order) {
  if (order.status === 'new') {
    if (order.quantity > 100) {
      if (order.customerTier === 'gold') {
        // Branch 1
      } else if (order.customerTier === 'silver') {
        // Branch 2
      } else {
        // Branch 3
      }
    } else if (order.quantity > 50) {
      // Branch 4
    }
  } else if (order.status === 'pending') {
    // Branch 5
  }
  // ... more branches
}

// Better: Refactored with lower complexity
function getDiscount(tier, quantity) {
  const discounts = {
    gold: { '100+': 0.20, '50+': 0.15 },
    silver: { '100+': 0.10, '50+': 0.05 },
  };
  return discounts[tier]?.[`${quantity}+`] || 0;
}
```

#### Maintainability Index
Score 0-100 measuring code maintainability. 70+ is good.

- `> 85`: Highly maintainable
- `65-85`: Maintainable
- `< 65`: Difficult to maintain

Calculated from: lines of code, cyclomatic complexity, Halstead metrics.

---

## Security Scanning

### 1. Vulnerability Detection

Detects common security vulnerabilities in code:

#### SQL Injection
```typescript
// Bad: Vulnerable to SQL injection
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Good: Use parameterized queries
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

#### Cross-Site Scripting (XSS)
```typescript
// Bad: Unsafe HTML injection
return `<div>${userInput}</div>`;

// Good: Escape or use templating
return escapeHtml(`<div>${userInput}</div>`);
```

#### Authentication Bypass
```typescript
// Bad: Weak authentication check
if (password === 'admin') {
  grantAccess();
}

// Good: Use secure authentication
const isValid = await bcrypt.compare(password, hashedPassword);
if (isValid) {
  grantAccess();
}
```

### 2. Dependency Vulnerability Scanning

Checks dependencies for known CVEs:

```typescript
// Review dependency vulnerabilities
const analysis = await scanner.analyzeDependencies(packageJson);

// Result includes:
// - CVE IDs and descriptions
// - Affected versions
// - Recommended patches
```

**Action**: Update vulnerable dependencies immediately:

```bash
npm audit fix
npm update vulnerable-package@^2.0.0
```

### 3. License Compliance

Approved licenses:
- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- GPL-3.0 (open source only)

Restricted/prohibited licenses:
- GPL-2.0 (use GPL-3.0 instead)
- AGPL (incompatible with commercial use)
- Any proprietary unlicensed code

```json
{
  "dependencies": {
    "express": "^4.18.0", // MIT - OK
    "lodash": "^4.17.0", // MIT - OK
    "proprietary-lib": "^1.0.0" // UNLICENSED - BLOCKED
  }
}
```

### 4. Secret Detection

Scans for hardcoded secrets:

**Detected patterns:**
- AWS access keys: `AKIA[0-9A-Z]{16}`
- Private keys: `-----BEGIN RSA PRIVATE KEY-----`
- API tokens: Common patterns for tokens
- Passwords: `password\s*=\s*.+`

```typescript
// Bad: Secrets in code
const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const dbPassword = 'super-secret-password';

// Good: Use environment variables
const AWS_KEY = process.env.AWS_ACCESS_KEY_ID;
const dbPassword = process.env.DB_PASSWORD;
```

**Remediation:**
1. Remove secret from code
2. Rotate the exposed credential
3. Commit removal with clean git history
4. Use `.env` files and environment variables

---

## Approval Workflows

### Approval States

| State | Description | Next Action |
|-------|-------------|-------------|
| PENDING | Awaiting review | Assign reviewer |
| IN_PROGRESS | Actively being reviewed | Wait for completion |
| APPROVED | Passed all checks | Deploy to marketplace |
| REJECTED | Failed security checks | Address findings, resubmit |
| CHANGES_REQUIRED | Conditional approval | Make changes, resubmit |
| APPROVED_WITH_CONDITIONS | Approved with restrictions | Follow conditions |

### Approval Conditions

Approvals may include conditions:

```typescript
const approval = await reviewManager.approveReview(
  'my-extension',
  'security-reviewer',
  [
    'Update all dependencies before production deployment',
    'Implement rate limiting on API endpoints',
    'Add request validation for all user inputs',
    'Quarterly security audit required'
  ]
);
```

**Approval validity**: 1 year from issue date. Requires re-review after expiration.

---

## Common Issues & Remediation

### Issue: Vulnerable Dependency

**Problem**: Extension uses package with known CVE

**Remediation**:
```bash
npm audit
npm update vulnerable-package@^2.0.0
# If not fixable, use npm audit --audit-level=moderate
```

### Issue: Low Test Coverage

**Problem**: Code coverage below 90%

**Remediation**:
```bash
# Generate coverage report
npm run test:coverage

# Add tests for uncovered lines
# Target: 90%+ coverage
```

### Issue: High Cyclomatic Complexity

**Problem**: Function has too many branches (>15)

**Remediation**:
```typescript
// Before: Complexity = 12
function handleOrder(order) {
  if (order.type === 'new') { ... }
  else if (order.type === 'returning') { ... }
  else { ... }
  // Multiple nested conditions
}

// After: Complexity = 3
const handlers = {
  new: handleNewOrder,
  returning: handleReturningOrder,
  default: handleDefaultOrder
};
function handleOrder(order) {
  const handler = handlers[order.type] || handlers.default;
  return handler(order);
}
```

### Issue: Hardcoded Secrets

**Problem**: API keys or passwords in source code

**Remediation**:
```typescript
// Create .env file (NOT committed)
AWS_ACCESS_KEY_ID=your-key-here
DB_PASSWORD=your-password-here

// Use environment variables
const awsKey = process.env.AWS_ACCESS_KEY_ID;
const dbPassword = process.env.DB_PASSWORD;

// Add .env to .gitignore
echo ".env" >> .gitignore
```

### Issue: Prohibited License

**Problem**: Dependency has GPL-2.0 or other prohibited license

**Remediation**:
```bash
# Find problematic dependency
npm ls --all | grep GPL-2.0

# Replace with compatible alternative
npm uninstall problematic-package
npm install compatible-alternative

# Verify licenses
npm audit
```

---

## Best Practices

### 1. Security Development

- **Input Validation**: Always validate user input on server-side
- **Parameterized Queries**: Use prepared statements, never string concatenation
- **Error Handling**: Don't expose internal system details in error messages
- **HTTPS Only**: Use HTTPS for all network communication
- **Rate Limiting**: Implement rate limiting to prevent abuse

### 2. Dependency Management

```typescript
// package.json best practices
{
  "dependencies": {
    // Use exact versions for production dependencies
    "express": "4.18.2"
  },
  "devDependencies": {
    // Can use ranges for dev dependencies
    "jest": "^29.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 3. Code Quality

- Write tests first (TDD)
- Aim for 95%+ test coverage
- Keep functions focused and small (< 30 lines)
- Use type checking (TypeScript)
- Document complex logic

### 4. Secrets Management

```typescript
// Load secrets securely
import dotenv from 'dotenv';
dotenv.config();

// Secrets as environment variables
const secrets = {
  awsKey: process.env.AWS_ACCESS_KEY_ID,
  dbPassword: process.env.DB_PASSWORD,
  jwtSecret: process.env.JWT_SECRET,
};

// Never log secrets
console.log({ user: data.user }); // OK
console.log({ password: data.password }); // NEVER
```

### 5. Submission Checklist

Before submitting for review:

- [ ] All tests passing (`npm test`)
- [ ] Test coverage ≥ 90% (`npm run test:coverage`)
- [ ] No vulnerable dependencies (`npm audit`)
- [ ] No hardcoded secrets
- [ ] No prohibited licenses
- [ ] Code complexity reasonable
- [ ] Maintainability index ≥ 70
- [ ] README complete with examples
- [ ] GitHub repo properly configured
- [ ] Version bumped (semantic versioning)

---

## API Reference

### SecurityReviewEngine

```typescript
class SecurityReviewEngine {
  // Perform complete security review
  performSecurityReview(request: ExtensionReviewRequest): Promise<SecurityReviewResult>;

  // Scan for vulnerabilities only
  scanVulnerabilities(code: string): SecurityFinding[];

  // Analyze code quality
  analyzeCodeQuality(code: string): CodeQualityMetrics;

  // Check dependency safety
  analyzeDependencies(packageJson: string): DependencyAnalysis;

  // Verify licenses
  checkLicenseCompliance(packageJson: string): LicenseComplianceResult;

  // Detect hardcoded secrets
  detectSecrets(code: string): SecurityFinding[];
}
```

### ReviewWorkflowManager

```typescript
class ReviewWorkflowManager {
  // Submit extension for review
  submitForReview(request: ExtensionReviewRequest): Promise<void>;

  // Approve extension
  approveReview(extensionId: string, approver: string, conditions?: string[]): Promise<ReviewApproval>;

  // Reject extension
  rejectReview(extensionId: string, rejector: string, reason: string): Promise<void>;

  // Get review history
  getReviewHistory(extensionId: string): Promise<ReviewApproval[]>;

  // Get current approval status
  getApprovalStatus(extensionId: string): Promise<ReviewApproval | null>;
}
```

### SecurityAuditLogger

```typescript
class SecurityAuditLogger {
  // Log security events
  logEvent(extensionId: string, eventType: AuditEventType, ...): void;

  // Query audit logs
  queryAuditLogs(query: AuditLogQuery): AuditLogEntry[];

  // Generate compliance report
  generateComplianceReport(startDate: Date, endDate: Date): ComplianceReport;

  // Export audit logs
  exportAuditLogs(format: 'json' | 'csv' | 'pdf', query?: AuditLogQuery): string;

  // Subscribe to security events
  onSecurityEvent(listener: (event: SecurityEvent) => void): void;
}
```

---

## Examples

### Complete Review Workflow

```typescript
import {
  SecurityReviewEngine,
  ReviewWorkflowManager,
  SecurityAuditLogger,
} from '@machshop/extension-sdk/security';

const engine = new SecurityReviewEngine();
const workflow = new ReviewWorkflowManager();
const audit = new SecurityAuditLogger();

async function reviewExtension(extensionId: string, version: string) {
  // 1. Perform security review
  const review = await engine.performSecurityReview({
    extensionId,
    version,
    code: readExtensionCode(),
    packageJson: readPackageJson(),
    repositoryUrl: 'https://github.com/...',
    publisherName: 'My Company',
    extensionTier: 'PREMIUM',
  });

  // Log submission
  audit.logReviewSubmission(extensionId, version, 'auto', review.riskScore);

  // 2. Make decision
  if (review.riskLevel === 'CRITICAL' || review.riskLevel === 'HIGH') {
    // Reject unsafe extensions
    await workflow.rejectReview(extensionId, 'auto-reviewer',
      `Risk level too high: ${review.riskLevel}`);
    audit.logReviewRejection(extensionId, version, 'auto', review.summary);
  } else if (review.recommendedAction === 'APPROVE_WITH_CONDITIONS') {
    // Approve with conditions
    const approval = await workflow.approveReview(extensionId, 'auto-reviewer', [
      'Update vulnerable dependencies',
      'Increase test coverage to 95%',
    ]);
    audit.logReviewApproval(extensionId, version, 'auto', approval.conditions);
  } else {
    // Approve
    const approval = await workflow.approveReview(extensionId, 'auto-reviewer');
    audit.logReviewApproval(extensionId, version, 'auto');
  }

  // Log completion
  audit.logReviewCompletion(extensionId, version, 'auto', review);

  return review;
}

// Generate monthly compliance report
const report = audit.generateComplianceReport(
  new Date('2024-01-01'),
  new Date('2024-02-01')
);
console.log(`Approved: ${report.totalReviewsApproved}/${report.totalReviewsSubmitted}`);
```

---

## Support & Questions

For questions about the security review process:

1. Check this guide and examples
2. Review your specific findings
3. Contact security team for guidance

For security vulnerabilities, use responsible disclosure: security@machshop.com
