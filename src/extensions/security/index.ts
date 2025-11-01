/**
 * Extension Security Module
 * Comprehensive security model, sandboxing, code signing, and code review framework for MachShop extensions
 * Issue #437: Extension Security Model & Sandboxing
 * Issue #444: Extension Security & Code Review Framework
 */

// Export security model types and classes
export {
  ExtensionTier,
  SecurityLevel,
  PermissionCategory,
  ExtensionPermission,
  CodeSigningCertificate,
  ExtensionSecurityContext,
  ExtensionResourceUsage,
  ExtensionSecurityPolicy,
  SandboxEnforcementResult,
  SecurityAuditEntry,
  VulnerabilityReport,
  ExtensionSecurityValidator,
  ExtensionSecurityManager,
  DEFAULT_SECURITY_POLICIES
} from './extension-security-model';

// Export sandbox enforcement classes and utilities
export {
  IsolationLevel,
  SandboxConfig,
  ResourceMonitor,
  PermissionEnforcer,
  NetworkAccessController,
  FileAccessController,
  SandboxExecutor,
  SandboxViolationError,
  ExtensionPermissionDeniedError,
  ResourceLimitExceededError,
  NetworkAccessDeniedError,
  FileAccessDeniedError,
  ExecutionTimeoutError
} from './sandbox-enforcement';

// Export code signing and verification classes
export {
  CodeSigningResult,
  SignatureVerificationResult,
  CodeSigner,
  CodeVerifier,
  CertificateAuthority,
  ExtensionPackageSigner,
  CODE_SIGNING_POLICY
} from './code-signing';

// Export code review and security scanning classes
export {
  ScanType,
  FindingSeverity,
  ReviewStatus,
  SecurityScanner,
  CodeQualityAnalyzer,
  SecurityPolicyEnforcer,
  SecurityReviewEngine,
  ReviewWorkflowManager,
  type SecurityFinding,
  type CodeQualityMetrics,
  type DependencyAnalysis,
  type LicenseComplianceResult,
  type PolicyViolation,
  type SecurityReviewResult,
  type ExtensionReviewRequest,
  type ReviewApproval,
  type VersionConstraint,
  type RiskLevel,
} from './code-review-framework';

// Export audit logging and reporting classes
export {
  AuditEventType,
  SecurityAuditLogger,
  globalAuditLogger,
  type AuditLogEntry,
  type AuditLogQuery,
  type ComplianceReport,
  type SecurityEvent,
} from './security-audit-log';

/**
 * Extension Security Service - Unified interface for extension security
 */
export class ExtensionSecurityService {
  private securityManager: ExtensionSecurityManager;
  private codeVerifier: CodeVerifier;

  constructor(policy?: any) {
    this.securityManager = new ExtensionSecurityManager(policy);
    this.codeVerifier = new CodeVerifier();
  }

  /**
   * Get the security manager
   */
  getSecurityManager(): ExtensionSecurityManager {
    return this.securityManager;
  }

  /**
   * Get the code verifier
   */
  getCodeVerifier(): CodeVerifier {
    return this.codeVerifier;
  }

  /**
   * Complete extension registration flow
   */
  async registerAndVerifyExtension(
    context: any,
    codeSigningCert: any
  ): Promise<boolean> {
    // Register with security manager
    this.securityManager.registerExtension(context);

    // Verify code signature if provided
    if (codeSigningCert && context.codeSignature) {
      const verificationResult = this.codeVerifier.verifySignature(
        '', // code would be passed here
        context.codeSignature,
        codeSigningCert
      );

      if (!verificationResult.valid) {
        throw new Error(
          `Code signature verification failed: ${verificationResult.error}`
        );
      }
    }

    // Enforce security context
    const enforcementResult = this.securityManager.enforceSecurityContext(
      context.extensionId
    );

    if (!enforcementResult.allowed) {
      throw new Error(
        `Security enforcement failed: ${enforcementResult.reason}`
      );
    }

    return true;
  }
}
