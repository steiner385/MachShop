# Extension Security Model & Sandboxing Guide
## Issue #437: Extension Security Model & Sandboxing

### Overview

The MachShop Extension Security Model provides a comprehensive framework for safely executing third-party extensions while protecting system integrity, data privacy, and resource availability. The model includes:

- **Permission-based access control** with tier-specific permissions
- **Code signing and verification** for integrity assurance
- **Sandbox enforcement** with resource isolation and limits
- **Security auditing and vulnerability management**
- **Supply chain security** controls

### Architecture Components

#### 1. Extension Security Context
Defines the security profile for each extension, including:
- Extension identification and versioning
- Code integrity verification
- Permission grants and denials
- Resource limits and quotas
- Sandbox configuration

**File**: `src/extensions/security/extension-security-model.ts`

#### 2. Sandbox Enforcement
Implements isolation and resource control:
- **Resource Monitoring**: Tracks memory, CPU, disk, and network usage
- **Permission Enforcement**: Validates all operations against granted permissions
- **Network Access Control**: Whitelist-based domain access
- **File Access Control**: Path-based file system access restrictions

**File**: `src/extensions/security/sandbox-enforcement.ts`

#### 3. Code Signing
Ensures code integrity and authenticity:
- **Code Signer**: Signs extension packages with private keys
- **Code Verifier**: Verifies signatures against trusted certificates
- **Certificate Authority**: Manages code signing certificates
- **Package Integrity**: Verifies packages haven't been modified

**File**: `src/extensions/security/code-signing.ts`

### Extension Tiers & Permissions

#### Community Tier
Limited access for experimental extensions:
- Read access to work orders, materials, quality data, equipment data
- Report generation
- External API calls (with restrictions)
- **Resource Limits**:
  - Memory: 256 MB
  - CPU: 25%
  - Disk: 100 MB
  - Timeout: 30 seconds
- **Code Signing**: Optional (self-signed allowed)

#### Professional Tier
Enhanced access for production extensions:
- All Community permissions
- Write access to work orders and quality data
- Equipment data write access
- Production schedule access
- Personnel data read
- File upload/download
- Webhook registration
- **Resource Limits**:
  - Memory: 512 MB
  - CPU: 50%
  - Disk: 500 MB
  - Timeout: 2 minutes
- **Code Signing**: Required (trusted signer)

#### Enterprise Tier
Full access for certified extensions:
- All permissions available
- User and system management
- Audit log access
- Unrestricted external integration
- **Resource Limits**:
  - Memory: 2 GB
  - CPU: 100%
  - Disk: 5 GB
  - Timeout: 10 minutes
- **Code Signing**: Required (verified publisher)

### Permission Categories

| Category | Permissions |
|----------|-------------|
| **Data Read** | READ_WORK_ORDERS, READ_MATERIALS, READ_QUALITY_DATA, READ_EQUIPMENT_DATA, READ_PRODUCTION_SCHEDULE, READ_PERSONNEL_DATA |
| **Data Write** | WRITE_WORK_ORDERS, WRITE_QUALITY_DATA, WRITE_EQUIPMENT_DATA, WRITE_PRODUCTION_SCHEDULE |
| **Data Delete** | DELETE_WORK_ORDERS, DELETE_QUALITY_DATA |
| **System** | SYSTEM_CONFIGURATION, USER_MANAGEMENT, AUDIT_LOG_ACCESS |
| **External** | EXTERNAL_ERP_ACCESS, EXTERNAL_API_CALLS, WEBHOOK_REGISTRATION |
| **Files** | FILE_UPLOAD, FILE_DOWNLOAD |
| **Network** | NETWORK_ACCESS |
| **Reporting** | GENERATE_REPORTS, ACCESS_ANALYTICS |

### Security Policies

#### Code Signing Requirements
- **Community**: Optional, self-signed allowed
- **Professional**: Required, trusted issuer
- **Enterprise**: Required, verified publisher
- **Algorithm**: SHA256withRSA
- **Minimum Key Length**: 2048 bits
- **Validity Period**: Minimum 90 days

#### Security Review
- **Requirement**: Mandatory for Professional and Enterprise
- **Minimum Level**: INTERNAL security audit
- **Frequency**: Upon version updates
- **Documentation**: Detailed security review notes

#### Vulnerability Management
- **Maximum Vulnerability Score**: 50/100
- **Check Interval**: Every 30 days
- **Disclosure Process**: Coordinated responsible disclosure
- **Remediation Timeline**: Critical fixes within 7 days

### Sandbox Execution Model

#### Isolation Levels
1. **NONE**: No isolation (trusted extensions only, not recommended)
2. **PARTIAL**: Permission-based isolation with monitoring
3. **FULL**: Complete process isolation with container/VM enforcement

#### Resource Limits Enforcement
- **Memory**: Enforced via resource monitoring
- **CPU**: Enforced via process scheduling limits
- **Disk I/O**: Enforced via quota system
- **Execution Time**: Enforced via timeout mechanism
- **Network**: Enforced via domain whitelist

#### Permission Enforcement
All extension operations must pass permission checks:
- Data access (read/write/delete)
- File system operations
- Network operations
- System configuration changes

### Usage Examples

#### 1. Registering an Extension

```typescript
import {
  ExtensionSecurityManager,
  ExtensionTier,
  ExtensionPermission,
  SecurityLevel
} from '@extensions/security';

const securityManager = new ExtensionSecurityManager();

const context = {
  extensionId: 'ext-analytics-001',
  extensionName: 'Analytics Dashboard',
  extensionVersion: '1.0.0',
  publisherId: 'publisher-abc',
  tier: ExtensionTier.PROFESSIONAL,
  grantedPermissions: [
    ExtensionPermission.READ_WORK_ORDERS,
    ExtensionPermission.READ_QUALITY_DATA,
    ExtensionPermission.GENERATE_REPORTS,
    ExtensionPermission.ACCESS_ANALYTICS
  ],
  deniedPermissions: [],
  codeSignature: 'sig_12345...',
  codeSigningCert: {/* certificate details */},
  integrityHash: 'hash_abc...',
  signatureVerified: true,
  memoryLimit: 512,
  cpuLimit: 50,
  diskQuota: 500,
  timeoutMs: 120000,
  networkWhitelist: ['api.example.com', '*.analytics.com'],
  fileAccessPaths: ['/extensions/ext-analytics-001/data/*'],
  auditLevel: SecurityLevel.INTERNAL,
  securityReviewStatus: 'APPROVED',
  vulnerabilityScore: 15,
  isolationLevel: 'PARTIAL',
  createdAt: new Date(),
  updatedAt: new Date()
};

securityManager.registerExtension(context);
```

#### 2. Enforcing Security on Extension Execution

```typescript
const result = securityManager.enforceSecurityContext('ext-analytics-001');

if (!result.allowed) {
  console.error('Security enforcement failed:', result.reason);
  console.error('Violated policies:', result.violatedPolicies);
  throw new Error(result.reason);
}
```

#### 3. Checking Specific Permissions

```typescript
const hasPermission = securityManager.checkPermission(
  'ext-analytics-001',
  ExtensionPermission.READ_WORK_ORDERS
);

if (!hasPermission) {
  throw new Error('Extension does not have required permission');
}
```

#### 4. Creating a Sandbox Executor

```typescript
import { SandboxExecutor } from '@extensions/security';

const executor = new SandboxExecutor(
  'ext-analytics-001',
  context,
  securityManager,
  {
    isolationLevel: 'PARTIAL',
    memoryLimitMB: 512,
    cpuLimitPercent: 50,
    diskQuotaMB: 500,
    timeoutMs: 120000,
    allowedDomains: ['api.example.com'],
    allowedPaths: ['/extensions/data/*'],
    blockSystemAccess: true,
    enableNetworking: true,
    enableFileIO: true
  }
);

// Execute extension code with sandbox enforcement
const result = await executor.executeWithSandbox(async () => {
  // Extension code runs here with security constraints
  return extensionFunction();
});
```

#### 5. Verifying Code Signatures

```typescript
import { CodeVerifier } from '@extensions/security';

const verifier = new CodeVerifier();

const verificationResult = verifier.verifySignature(
  extensionCode,
  signature,
  certificate
);

if (!verificationResult.valid) {
  throw new Error(`Signature verification failed: ${verificationResult.error}`);
}

if (!verificationResult.trustedSigner) {
  console.warn('Extension signed by untrusted signer');
}
```

#### 6. Recording Resource Usage

```typescript
const usage = executor.getResourceUsage();

securityManager.recordResourceUsage({
  extensionId: 'ext-analytics-001',
  timestamp: new Date(),
  memoryUsedMB: usage.memoryUsedMB,
  cpuPercentage: usage.cpuPercentage,
  diskUsedMB: usage.diskUsedMB,
  networkBytesOut: usage.networkBytesOut,
  networkBytesIn: usage.networkBytesIn,
  executionTimeMs: usage.executionTimeMs,
  requestCount: usage.requestCount,
  errorCount: usage.errorCount
});
```

### Security Audit Log

All security-relevant events are logged:
- Extension registration and updates
- Permission grants and denials
- Code signature verification (success/failure)
- Sandbox violations
- Resource limit violations
- Vulnerability reports
- Execution errors

**Retention**: 365 days

### Vulnerability Management

#### Reporting Process
1. Publisher discovers vulnerability
2. Submit detailed vulnerability report with:
   - Description and impact assessment
   - Affected versions
   - Reproduction steps
   - Remediation recommendations
3. MachShop team verifies and assigns CVE if applicable
4. Coordinated disclosure deadline (typically 90 days)

#### Response Actions
- **Critical**: Automatic disable pending patch
- **High**: Review required, may disable if not patched
- **Medium**: Warning issued to users
- **Low**: Tracked but no immediate action

### Best Practices

#### For Extension Publishers
1. **Code Signing**
   - Always sign code with trusted certificate
   - Rotate signing keys regularly
   - Keep private keys secure

2. **Minimal Permissions**
   - Request only necessary permissions
   - Use READ when WRITE not needed
   - Avoid requesting system administration permissions

3. **Resource Awareness**
   - Monitor memory and CPU usage
   - Optimize for target tier limits
   - Cache external API responses

4. **Security Practices**
   - Submit for security review before production
   - Fix vulnerabilities quickly
   - Implement error handling
   - Log security-relevant events

#### For System Administrators
1. **Policy Configuration**
   - Review and customize tier definitions
   - Adjust resource limits based on hardware
   - Configure trusted publishers
   - Enable detailed auditing

2. **Extension Management**
   - Approve security reviews carefully
   - Monitor vulnerability reports
   - Disable compromised extensions immediately
   - Review audit logs regularly

3. **Supply Chain Security**
   - Verify publisher identities
   - Review extension dependencies
   - Monitor for suspicious activity
   - Keep signing certificates up to date

### Integration with Extension Lifecycle

The security model integrates with the extension lifecycle:
1. **Development**: Code signing during build
2. **Testing**: Security review and vulnerability scanning
3. **Deployment**: Permission and signature validation
4. **Runtime**: Sandbox enforcement and monitoring
5. **Updates**: Re-verification of signatures and permissions

### Future Enhancements

- Hardware-based code signing (HSM)
- Container-based full isolation
- Real-time threat detection
- Machine learning vulnerability detection
- Automated remediation workflows
- Decentralized supply chain verification

### References

- Extension Development Guide
- Extension API Documentation
- Security Review Checklist
- Code Signing Certificate Guide
