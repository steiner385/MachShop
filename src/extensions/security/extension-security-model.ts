/**
 * Extension Security Model & Sandboxing
 * Implements comprehensive security for MachShop extensions
 * Issue #437: Extension Security Model & Sandboxing
 */

/**
 * Extension tier levels with corresponding permission scopes
 */
export enum ExtensionTier {
  COMMUNITY = 'COMMUNITY',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE'
}

/**
 * Security levels for extension operations
 */
export enum SecurityLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  RESTRICTED = 'RESTRICTED',
  CRITICAL = 'CRITICAL'
}

/**
 * Permission categories for extension access control
 */
export enum PermissionCategory {
  DATA_READ = 'DATA_READ',
  DATA_WRITE = 'DATA_WRITE',
  DATA_DELETE = 'DATA_DELETE',
  SYSTEM_ACCESS = 'SYSTEM_ACCESS',
  EXTERNAL_API = 'EXTERNAL_API',
  FILE_ACCESS = 'FILE_ACCESS',
  NETWORK = 'NETWORK',
  REPORTING = 'REPORTING'
}

/**
 * Specific permissions that can be granted to extensions
 */
export enum ExtensionPermission {
  // Data Read Permissions
  READ_WORK_ORDERS = 'READ_WORK_ORDERS',
  READ_MATERIALS = 'READ_MATERIALS',
  READ_QUALITY_DATA = 'READ_QUALITY_DATA',
  READ_EQUIPMENT_DATA = 'READ_EQUIPMENT_DATA',
  READ_PRODUCTION_SCHEDULE = 'READ_PRODUCTION_SCHEDULE',
  READ_PERSONNEL_DATA = 'READ_PERSONNEL_DATA',

  // Data Write Permissions
  WRITE_WORK_ORDERS = 'WRITE_WORK_ORDERS',
  WRITE_QUALITY_DATA = 'WRITE_QUALITY_DATA',
  WRITE_EQUIPMENT_DATA = 'WRITE_EQUIPMENT_DATA',
  WRITE_PRODUCTION_SCHEDULE = 'WRITE_PRODUCTION_SCHEDULE',

  // Data Delete Permissions
  DELETE_WORK_ORDERS = 'DELETE_WORK_ORDERS',
  DELETE_QUALITY_DATA = 'DELETE_QUALITY_DATA',

  // System Access
  SYSTEM_CONFIGURATION = 'SYSTEM_CONFIGURATION',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  AUDIT_LOG_ACCESS = 'AUDIT_LOG_ACCESS',

  // External Integration
  EXTERNAL_ERP_ACCESS = 'EXTERNAL_ERP_ACCESS',
  EXTERNAL_API_CALLS = 'EXTERNAL_API_CALLS',
  WEBHOOK_REGISTRATION = 'WEBHOOK_REGISTRATION',

  // File & Network
  FILE_UPLOAD = 'FILE_UPLOAD',
  FILE_DOWNLOAD = 'FILE_DOWNLOAD',
  NETWORK_ACCESS = 'NETWORK_ACCESS',

  // Reporting
  GENERATE_REPORTS = 'GENERATE_REPORTS',
  ACCESS_ANALYTICS = 'ACCESS_ANALYTICS'
}

/**
 * Code signing certificate information
 */
export interface CodeSigningCertificate {
  thumbprint: string;
  issuer: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
  publicKeyAlgorithm: string;
  algorithm: string;
}

/**
 * Extension security context - defines what an extension can do
 */
export interface ExtensionSecurityContext {
  // Extension Identification
  extensionId: string;
  extensionName: string;
  extensionVersion: string;
  publisherId: string;
  tier: ExtensionTier;

  // Code Integrity
  codeSignature?: string;
  codeSigningCert?: CodeSigningCertificate;
  integrityHash: string;
  signatureVerified: boolean;
  signatureVerifiedAt?: Date;

  // Permissions
  grantedPermissions: ExtensionPermission[];
  deniedPermissions: ExtensionPermission[];
  customPermissions?: Record<string, boolean>;

  // Sandbox Configuration
  memoryLimit: number; // in MB
  cpuLimit: number; // percentage
  diskQuota: number; // in MB
  timeoutMs: number; // execution timeout
  networkWhitelist: string[]; // allowed domains
  fileAccessPaths: string[]; // allowed file paths

  // Security Audit
  auditLevel: SecurityLevel;
  securityReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  securityReviewDate?: Date;
  securityReviewNotes?: string;
  vulnerabilityScore: number; // 0-100, 100 is most vulnerable

  // Execution Environment
  sandboxId?: string;
  isolationLevel: 'NONE' | 'PARTIAL' | 'FULL';
  enableCrashReporting: boolean;
  enableResourceMonitoring: boolean;

  // Temporal Controls
  enabledAt?: Date;
  disabledAt?: Date;
  expiresAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

/**
 * Resource usage metrics for an extension
 */
export interface ExtensionResourceUsage {
  extensionId: string;
  timestamp: Date;
  memoryUsedMB: number;
  cpuPercentage: number;
  diskUsedMB: number;
  networkBytesOut: number;
  networkBytesIn: number;
  executionTimeMs: number;
  requestCount: number;
  errorCount: number;
}

/**
 * Security policy for extension execution
 */
export interface ExtensionSecurityPolicy {
  // Default permission sets per tier
  tierPermissions: Record<ExtensionTier, ExtensionPermission[]>;

  // Default resource limits per tier
  tierResourceLimits: Record<
    ExtensionTier,
    {
      memoryLimit: number;
      cpuLimit: number;
      diskQuota: number;
      timeoutMs: number;
    }
  >;

  // System-wide security settings
  requireCodeSigning: boolean;
  requireSecurityReview: boolean;
  minSecurityReviewLevel: SecurityLevel;
  allowNetworkAccess: boolean;
  allowFileAccess: boolean;
  enableResourceLimits: boolean;
  enableCrashReporting: boolean;

  // Vulnerability management
  maxVulnerabilityScore: number;
  vulnerabilityCheckInterval: number; // in days

  // Audit requirements
  auditLogRetention: number; // in days
  enableDetailedAuditing: boolean;

  // Supply chain security
  trustedPublishers: string[];
  requirePublisherVerification: boolean;
}

/**
 * Extension sandbox enforcement result
 */
export interface SandboxEnforcementResult {
  allowed: boolean;
  violatedPolicies: string[];
  deniedPermissions: ExtensionPermission[];
  reason?: string;
  recommendations?: string[];
}

/**
 * Security audit log entry
 */
export interface SecurityAuditEntry {
  id: string;
  timestamp: Date;
  extensionId: string;
  eventType:
    | 'PERMISSION_GRANT'
    | 'PERMISSION_DENY'
    | 'SIGNATURE_VERIFY'
    | 'SIGNATURE_FAIL'
    | 'SANDBOX_VIOLATION'
    | 'RESOURCE_EXCEEDED'
    | 'SECURITY_REVIEW'
    | 'VULNERABILITY_DETECTED'
    | 'EXECUTION_ERROR'
    | 'DISABLED';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  details: Record<string, any>;
  resolvedAt?: Date;
  resolution?: string;
}

/**
 * Vulnerability report for an extension
 */
export interface VulnerabilityReport {
  id: string;
  extensionId: string;
  reportedDate: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilityType: string;
  description: string;
  affectedVersions: string[];
  remediationSteps: string[];
  cveId?: string;
  disclosureDeadline?: Date;
  disclosurePublished?: boolean;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WONTFIX';
}

/**
 * Extension Security Model Validator
 * Validates extensions against security policies
 */
export class ExtensionSecurityValidator {
  constructor(private policy: ExtensionSecurityPolicy) {}

  /**
   * Validate extension against security context and policies
   */
  validateExtension(
    context: ExtensionSecurityContext
  ): SandboxEnforcementResult {
    const violations: string[] = [];
    const deniedPermissions: ExtensionPermission[] = [];

    // Check code signing
    if (
      this.policy.requireCodeSigning &&
      !context.signatureVerified
    ) {
      violations.push('Code signature not verified');
    }

    // Check security review
    if (
      this.policy.requireSecurityReview &&
      context.securityReviewStatus !== 'APPROVED'
    ) {
      violations.push(
        `Security review status is ${context.securityReviewStatus}, must be APPROVED`
      );
    }

    // Check vulnerability score
    if (context.vulnerabilityScore > this.policy.maxVulnerabilityScore) {
      violations.push(
        `Vulnerability score ${context.vulnerabilityScore} exceeds maximum ${this.policy.maxVulnerabilityScore}`
      );
    }

    // Check tier-based permissions
    const tierPermissions = this.policy.tierPermissions[context.tier];
    for (const permission of context.grantedPermissions) {
      if (!tierPermissions.includes(permission)) {
        deniedPermissions.push(permission);
        violations.push(`Permission ${permission} not allowed for tier ${context.tier}`);
      }
    }

    // Check if extension is expired
    if (context.expiresAt && context.expiresAt < new Date()) {
      violations.push('Extension has expired');
    }

    // Check if extension is disabled
    if (context.disabledAt && context.disabledAt <= new Date()) {
      violations.push('Extension is disabled');
    }

    return {
      allowed: violations.length === 0,
      violatedPolicies: violations,
      deniedPermissions,
      reason:
        violations.length > 0
          ? `Security validation failed: ${violations[0]}`
          : undefined,
      recommendations: this.getRecommendations(context, violations)
    };
  }

  /**
   * Check if extension has specific permission
   */
  hasPermission(
    context: ExtensionSecurityContext,
    permission: ExtensionPermission
  ): boolean {
    if (context.deniedPermissions.includes(permission)) {
      return false;
    }
    return context.grantedPermissions.includes(permission);
  }

  /**
   * Validate resource usage against limits
   */
  validateResourceUsage(
    context: ExtensionSecurityContext,
    usage: ExtensionResourceUsage
  ): boolean {
    if (!this.policy.enableResourceLimits) {
      return true;
    }

    if (usage.memoryUsedMB > context.memoryLimit) {
      return false;
    }
    if (usage.cpuPercentage > context.cpuLimit) {
      return false;
    }
    if (usage.diskUsedMB > context.diskQuota) {
      return false;
    }
    if (usage.executionTimeMs > context.timeoutMs) {
      return false;
    }

    return true;
  }

  /**
   * Get security recommendations for an extension
   */
  private getRecommendations(
    context: ExtensionSecurityContext,
    violations: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (violations.some(v => v.includes('signature'))) {
      recommendations.push(
        'Request code signing certificate from publisher'
      );
    }

    if (violations.some(v => v.includes('security review'))) {
      recommendations.push('Submit extension for security review');
    }

    if (violations.some(v => v.includes('Vulnerability'))) {
      recommendations.push('Address identified vulnerabilities');
    }

    if (context.deniedPermissions.length > 0) {
      recommendations.push(
        `Review permission requirements - consider downgrading extension tier or reducing requested permissions`
      );
    }

    return recommendations;
  }
}

/**
 * Default security policies for different tiers
 */
export const DEFAULT_SECURITY_POLICIES: ExtensionSecurityPolicy = {
  tierPermissions: {
    [ExtensionTier.COMMUNITY]: [
      ExtensionPermission.READ_WORK_ORDERS,
      ExtensionPermission.READ_MATERIALS,
      ExtensionPermission.READ_QUALITY_DATA,
      ExtensionPermission.READ_EQUIPMENT_DATA,
      ExtensionPermission.GENERATE_REPORTS,
      ExtensionPermission.EXTERNAL_API_CALLS
    ],
    [ExtensionTier.PROFESSIONAL]: [
      // All COMMUNITY permissions plus:
      ExtensionPermission.WRITE_WORK_ORDERS,
      ExtensionPermission.WRITE_QUALITY_DATA,
      ExtensionPermission.READ_PRODUCTION_SCHEDULE,
      ExtensionPermission.READ_PERSONNEL_DATA,
      ExtensionPermission.FILE_UPLOAD,
      ExtensionPermission.FILE_DOWNLOAD,
      ExtensionPermission.WEBHOOK_REGISTRATION,
      ExtensionPermission.ACCESS_ANALYTICS,
      ExtensionPermission.EXTERNAL_ERP_ACCESS
    ],
    [ExtensionTier.ENTERPRISE]: [
      // All permissions available
      ExtensionPermission.READ_WORK_ORDERS,
      ExtensionPermission.READ_MATERIALS,
      ExtensionPermission.READ_QUALITY_DATA,
      ExtensionPermission.READ_EQUIPMENT_DATA,
      ExtensionPermission.READ_PRODUCTION_SCHEDULE,
      ExtensionPermission.READ_PERSONNEL_DATA,
      ExtensionPermission.WRITE_WORK_ORDERS,
      ExtensionPermission.WRITE_QUALITY_DATA,
      ExtensionPermission.WRITE_EQUIPMENT_DATA,
      ExtensionPermission.WRITE_PRODUCTION_SCHEDULE,
      ExtensionPermission.DELETE_WORK_ORDERS,
      ExtensionPermission.DELETE_QUALITY_DATA,
      ExtensionPermission.SYSTEM_CONFIGURATION,
      ExtensionPermission.USER_MANAGEMENT,
      ExtensionPermission.AUDIT_LOG_ACCESS,
      ExtensionPermission.EXTERNAL_ERP_ACCESS,
      ExtensionPermission.EXTERNAL_API_CALLS,
      ExtensionPermission.WEBHOOK_REGISTRATION,
      ExtensionPermission.FILE_UPLOAD,
      ExtensionPermission.FILE_DOWNLOAD,
      ExtensionPermission.NETWORK_ACCESS,
      ExtensionPermission.GENERATE_REPORTS,
      ExtensionPermission.ACCESS_ANALYTICS
    ]
  },

  tierResourceLimits: {
    [ExtensionTier.COMMUNITY]: {
      memoryLimit: 256, // 256 MB
      cpuLimit: 25, // 25% CPU
      diskQuota: 100, // 100 MB
      timeoutMs: 30000 // 30 seconds
    },
    [ExtensionTier.PROFESSIONAL]: {
      memoryLimit: 512, // 512 MB
      cpuLimit: 50, // 50% CPU
      diskQuota: 500, // 500 MB
      timeoutMs: 120000 // 2 minutes
    },
    [ExtensionTier.ENTERPRISE]: {
      memoryLimit: 2048, // 2 GB
      cpuLimit: 100, // 100% CPU
      diskQuota: 5000, // 5 GB
      timeoutMs: 600000 // 10 minutes
    }
  },

  requireCodeSigning: true,
  requireSecurityReview: true,
  minSecurityReviewLevel: SecurityLevel.INTERNAL,
  allowNetworkAccess: true,
  allowFileAccess: true,
  enableResourceLimits: true,
  enableCrashReporting: true,
  maxVulnerabilityScore: 50,
  vulnerabilityCheckInterval: 30,
  auditLogRetention: 365,
  enableDetailedAuditing: true,
  trustedPublishers: [],
  requirePublisherVerification: false
};

/**
 * Extension Security Manager
 * Manages security contexts and enforcement
 */
export class ExtensionSecurityManager {
  private contexts: Map<string, ExtensionSecurityContext> = new Map();
  private auditLog: SecurityAuditEntry[] = [];
  private vulnerabilityReports: Map<string, VulnerabilityReport[]> = new Map();
  private resourceUsageCache: Map<string, ExtensionResourceUsage[]> = new Map();
  private validator: ExtensionSecurityValidator;

  constructor(private policy: ExtensionSecurityPolicy = DEFAULT_SECURITY_POLICIES) {
    this.validator = new ExtensionSecurityValidator(policy);
  }

  /**
   * Register an extension with security context
   */
  registerExtension(context: ExtensionSecurityContext): void {
    this.contexts.set(context.extensionId, context);
    this.auditLog.push({
      id: `audit-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      extensionId: context.extensionId,
      eventType: 'PERMISSION_GRANT',
      severity: 'INFO',
      details: {
        permissions: context.grantedPermissions,
        tier: context.tier
      }
    });
  }

  /**
   * Get security context for extension
   */
  getContext(extensionId: string): ExtensionSecurityContext | undefined {
    return this.contexts.get(extensionId);
  }

  /**
   * Enforce security on extension execution
   */
  enforceSecurityContext(
    extensionId: string
  ): SandboxEnforcementResult {
    const context = this.contexts.get(extensionId);
    if (!context) {
      return {
        allowed: false,
        violatedPolicies: ['Extension not registered'],
        deniedPermissions: []
      };
    }

    const result = this.validator.validateExtension(context);

    if (!result.allowed) {
      this.auditLog.push({
        id: `audit-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        extensionId,
        eventType: 'SANDBOX_VIOLATION',
        severity: 'CRITICAL',
        details: {
          violations: result.violatedPolicies
        }
      });
    }

    return result;
  }

  /**
   * Check if extension has permission
   */
  checkPermission(
    extensionId: string,
    permission: ExtensionPermission
  ): boolean {
    const context = this.contexts.get(extensionId);
    if (!context) {
      return false;
    }
    return this.validator.hasPermission(context, permission);
  }

  /**
   * Record resource usage for an extension
   */
  recordResourceUsage(usage: ExtensionResourceUsage): void {
    if (!this.resourceUsageCache.has(usage.extensionId)) {
      this.resourceUsageCache.set(usage.extensionId, []);
    }

    const cache = this.resourceUsageCache.get(usage.extensionId)!;
    cache.push(usage);

    // Keep only last 100 entries
    if (cache.length > 100) {
      cache.shift();
    }

    const context = this.contexts.get(usage.extensionId);
    if (context && !this.validator.validateResourceUsage(context, usage)) {
      this.auditLog.push({
        id: `audit-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        extensionId: usage.extensionId,
        eventType: 'RESOURCE_EXCEEDED',
        severity: 'WARNING',
        details: {
          usage
        }
      });
    }
  }

  /**
   * Report a vulnerability for an extension
   */
  reportVulnerability(report: VulnerabilityReport): void {
    if (!this.vulnerabilityReports.has(report.extensionId)) {
      this.vulnerabilityReports.set(report.extensionId, []);
    }

    this.vulnerabilityReports.get(report.extensionId)!.push(report);

    const context = this.contexts.get(report.extensionId);
    if (context) {
      // Update vulnerability score (simplified)
      const severityScore = {
        LOW: 10,
        MEDIUM: 25,
        HIGH: 50,
        CRITICAL: 100
      };
      context.vulnerabilityScore = Math.max(
        context.vulnerabilityScore,
        severityScore[report.severity]
      );
    }

    this.auditLog.push({
      id: `audit-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      extensionId: report.extensionId,
      eventType: 'VULNERABILITY_DETECTED',
      severity: 'CRITICAL',
      details: {
        vulnerability: report.vulnerabilityType,
        severity: report.severity
      }
    });
  }

  /**
   * Get audit log for extension
   */
  getAuditLog(extensionId?: string): SecurityAuditEntry[] {
    if (extensionId) {
      return this.auditLog.filter(entry => entry.extensionId === extensionId);
    }
    return this.auditLog;
  }

  /**
   * Get vulnerabilities for extension
   */
  getVulnerabilities(extensionId: string): VulnerabilityReport[] {
    return this.vulnerabilityReports.get(extensionId) || [];
  }
}
