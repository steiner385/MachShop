/**
 * Extension Security & Code Review Framework
 * Comprehensive security scanning, code quality validation, and review workflows
 * Issue #444: Extension Security & Code Review Framework
 */

/**
 * Security scan result types
 */
export enum ScanType {
  VULNERABILITY = 'VULNERABILITY',
  DEPENDENCY = 'DEPENDENCY',
  CODE_QUALITY = 'CODE_QUALITY',
  LICENSE = 'LICENSE',
  SECRETS = 'SECRETS',
  SECURITY_POLICY = 'SECURITY_POLICY'
}

/**
 * Severity levels for findings
 */
export enum FindingSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

/**
 * Review status states
 */
export enum ReviewStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUIRED = 'CHANGES_REQUIRED',
  APPROVED_WITH_CONDITIONS = 'APPROVED_WITH_CONDITIONS'
}

/**
 * Security finding from code scan
 */
export interface SecurityFinding {
  id: string;
  scanType: ScanType;
  severity: FindingSeverity;
  title: string;
  description: string;
  location: {
    file: string;
    line?: number;
    column?: number;
  };
  cveId?: string;
  cwe?: string;
  cvss?: number;
  remediationSteps: string[];
  affectedVersions?: string[];
  discoveredAt: Date;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACKNOWLEDGED' | 'FALSE_POSITIVE';
}

/**
 * Code quality metrics
 */
export interface CodeQualityMetrics {
  testCoverage: number; // percentage 0-100
  complexity: number; // average cyclomatic complexity
  linesOfCode: number;
  duplicateLines: number; // percentage
  maintainabilityIndex: number; // 0-100
  codeSmells: number;
  technicalDebtDays: number;
}

/**
 * Dependency analysis result
 */
export interface DependencyAnalysis {
  totalDependencies: number;
  vulnerableDependencies: number;
  outdatedDependencies: number;
  vulnerabilities: Array<{
    packageName: string;
    currentVersion: string;
    vulnerabilityId: string;
    severity: FindingSeverity;
    fixedVersion?: string;
  }>;
}

/**
 * License compliance check result
 */
export interface LicenseComplianceResult {
  compliant: boolean;
  findings: Array<{
    packageName: string;
    license: string;
    allowed: boolean;
    reason?: string;
  }>;
  restrictedLicenses: string[];
}

/**
 * Security policy violation
 */
export interface PolicyViolation {
  policyName: string;
  description: string;
  severity: FindingSeverity;
  affectedFiles: string[];
  remediation: string;
}

/**
 * Complete security review result
 */
export interface SecurityReviewResult {
  id: string;
  extensionId: string;
  extensionVersion: string;
  reviewDate: Date;
  reviewer?: string;
  scanResults: SecurityFinding[];
  codeQuality: CodeQualityMetrics;
  dependencies: DependencyAnalysis;
  licenseCompliance: LicenseComplianceResult;
  policyViolations: PolicyViolation[];
  overallRiskScore: number; // 0-100, higher is riskier
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
  recommendedAction: 'BLOCK' | 'REJECT' | 'REVIEW' | 'APPROVE_WITH_CONDITIONS' | 'APPROVE';
  summary: string;
}

/**
 * Extension review request
 */
export interface ExtensionReviewRequest {
  extensionId: string;
  extensionName: string;
  extensionVersion: string;
  codeRepository: {
    url: string;
    branch: string;
    commit: string;
  };
  description: string;
  publisherId: string;
  requestedAt: Date;
  tier: 'COMMUNITY' | 'PROFESSIONAL' | 'ENTERPRISE';
}

/**
 * Extension review approval record
 */
export interface ReviewApproval {
  id: string;
  extensionId: string;
  reviewResult: SecurityReviewResult;
  approvedBy: string;
  approvedAt: Date;
  conditions?: string[];
  expiresAt?: Date;
  approvalStatus: ReviewStatus;
}

/**
 * Security Scanner - Performs vulnerability and code scanning
 */
export class SecurityScanner {
  /**
   * Scan code for vulnerabilities
   */
  static scanForVulnerabilities(
    code: string,
    language: string,
    version: string
  ): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    // OWASP Top 10 checks
    if (this.hasOWASPVulnerability(code, 'injection')) {
      findings.push({
        id: `vuln-${Date.now()}-injection`,
        scanType: ScanType.VULNERABILITY,
        severity: FindingSeverity.CRITICAL,
        title: 'SQL Injection Risk Detected',
        description: 'Code contains potential SQL injection vulnerabilities. Use parameterized queries.',
        location: { file: 'unknown' },
        cwe: 'CWE-89',
        remediationSteps: [
          'Use parameterized queries/prepared statements',
          'Implement input validation',
          'Use ORM frameworks'
        ],
        discoveredAt: new Date(),
        status: 'OPEN'
      });
    }

    if (this.hasOWASPVulnerability(code, 'xss')) {
      findings.push({
        id: `vuln-${Date.now()}-xss`,
        scanType: ScanType.VULNERABILITY,
        severity: FindingSeverity.HIGH,
        title: 'Cross-Site Scripting (XSS) Risk',
        description: 'Unsanitized user input detected in output. Implement output encoding.',
        location: { file: 'unknown' },
        cwe: 'CWE-79',
        remediationSteps: [
          'Sanitize and validate all user inputs',
          'Use context-aware output encoding',
          'Implement Content Security Policy'
        ],
        discoveredAt: new Date(),
        status: 'OPEN'
      });
    }

    if (this.hasOWASPVulnerability(code, 'auth')) {
      findings.push({
        id: `vuln-${Date.now()}-auth`,
        scanType: ScanType.VULNERABILITY,
        severity: FindingSeverity.CRITICAL,
        title: 'Authentication Bypass Risk',
        description: 'Weak or missing authentication checks detected.',
        location: { file: 'unknown' },
        remediationSteps: [
          'Implement strong authentication mechanism',
          'Use standard authentication libraries',
          'Add multi-factor authentication support'
        ],
        discoveredAt: new Date(),
        status: 'OPEN'
      });
    }

    return findings;
  }

  /**
   * Scan dependencies for vulnerabilities
   */
  static analyzeDependencies(packageJson: Record<string, any>): DependencyAnalysis {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const vulnerable: Array<any> = [];
    const outdated: Array<any> = [];

    // Simulate vulnerability check
    for (const [pkg, version] of Object.entries(deps)) {
      if (this.isKnownVulnerableDependency(pkg, version as string)) {
        vulnerable.push({
          packageName: pkg,
          currentVersion: version,
          vulnerabilityId: `CVE-${Date.now()}`,
          severity: FindingSeverity.HIGH,
          fixedVersion: this.getFixedVersion(pkg)
        });
      }
    }

    return {
      totalDependencies: Object.keys(deps).length,
      vulnerableDependencies: vulnerable.length,
      outdatedDependencies: outdated.length,
      vulnerabilities: vulnerable
    };
  }

  /**
   * Check license compliance
   */
  static checkLicenseCompliance(
    packageJson: Record<string, any>,
    allowedLicenses: string[] = [
      'MIT',
      'Apache-2.0',
      'BSD-2-Clause',
      'BSD-3-Clause',
      'ISC',
      'GPL-3.0'
    ]
  ): LicenseComplianceResult {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const findings: Array<any> = [];
    const restrictedLicenses = new Set<string>();

    for (const [pkg] of Object.entries(deps)) {
      const license = this.getPackageLicense(pkg);
      const allowed = allowedLicenses.includes(license);

      findings.push({
        packageName: pkg,
        license,
        allowed,
        reason: !allowed ? `License ${license} not in approved list` : undefined
      });

      if (!allowed) {
        restrictedLicenses.add(license);
      }
    }

    return {
      compliant: Array.from(restrictedLicenses).length === 0,
      findings,
      restrictedLicenses: Array.from(restrictedLicenses)
    };
  }

  /**
   * Detect secrets in code
   */
  static detectSecrets(code: string): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    // Regex patterns for common secrets
    const patterns = {
      apiKey: /api[_-]?key\s*[:=]\s*['"][^'"]{20,}['"]/gi,
      awsKey: /AKIA[0-9A-Z]{16}/g,
      privateKey: /-----BEGIN PRIVATE KEY-----/g,
      password: /password\s*[:=]\s*['"][^'"]{8,}['"]/gi,
      token: /token\s*[:=]\s*['"][^'"]{20,}['"]/gi
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = code.match(pattern);
      if (matches) {
        findings.push({
          id: `secret-${Date.now()}-${type}`,
          scanType: ScanType.SECRETS,
          severity: FindingSeverity.CRITICAL,
          title: `Hardcoded ${type} Detected`,
          description: `Source code contains hardcoded ${type}. Move to environment variables.`,
          location: { file: 'unknown' },
          cwe: 'CWE-798',
          remediationSteps: [
            'Remove all hardcoded secrets',
            'Use environment variables',
            'Use secrets management system',
            'Rotate any exposed credentials'
          ],
          discoveredAt: new Date(),
          status: 'OPEN'
        });
      }
    }

    return findings;
  }

  /**
   * Private helper: Check for OWASP vulnerability patterns
   */
  private static hasOWASPVulnerability(code: string, type: string): boolean {
    const patterns: Record<string, RegExp> = {
      injection: /query\s*\(\s*[`"'].*\$\{|eval\s*\(|exec\s*\(/gi,
      xss: /innerHTML\s*=|dangerouslySetInnerHTML|\.html\s*\(/gi,
      auth: /if\s*\(\s*(true|1)\s*\)|skipAuth|bypass/gi
    };

    return patterns[type]?.test(code) || false;
  }

  /**
   * Private helper: Check if dependency is known vulnerable
   */
  private static isKnownVulnerableDependency(pkg: string, version: string): boolean {
    // Simplified check - in real implementation would use CVE database
    const knownVulnerable: Record<string, string[]> = {
      'lodash': ['<4.17.11'],
      'jquery': ['<3.4.0'],
      'handlebars': ['<4.1.0']
    };

    return knownVulnerable[pkg]?.some(v => v.includes(version)) || false;
  }

  /**
   * Get fixed version for dependency
   */
  private static getFixedVersion(pkg: string): string {
    const fixes: Record<string, string> = {
      'lodash': '4.17.21',
      'jquery': '3.6.0',
      'handlebars': '4.7.7'
    };
    return fixes[pkg] || 'latest';
  }

  /**
   * Get package license
   */
  private static getPackageLicense(pkg: string): string {
    // Simplified - would fetch from npm registry in real implementation
    return 'MIT';
  }
}

/**
 * Code Quality Analyzer
 */
export class CodeQualityAnalyzer {
  /**
   * Analyze code quality metrics
   */
  static analyzeCodeQuality(
    code: string,
    testCoverageData?: { lines: number; covered: number }
  ): CodeQualityMetrics {
    const testCoverage = testCoverageData
      ? (testCoverageData.covered / testCoverageData.lines) * 100
      : 75;

    const linesOfCode = code.split('\n').length;
    const complexity = this.calculateComplexity(code);
    const duplicates = this.calculateDuplicate(code);
    const codeSmells = this.detectCodeSmells(code);
    const mi = this.calculateMaintainabilityIndex(linesOfCode, complexity, testCoverage);

    return {
      testCoverage: Math.min(100, testCoverage),
      complexity,
      linesOfCode,
      duplicateLines: duplicates,
      maintainabilityIndex: mi,
      codeSmells,
      technicalDebtDays: Math.ceil(complexity * codeSmells / 100)
    };
  }

  /**
   * Calculate cyclomatic complexity
   */
  private static calculateComplexity(code: string): number {
    const patterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bswitch\b/g
    ];

    let complexity = 1;
    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    }
    return Math.round(complexity / 10);
  }

  /**
   * Calculate duplicate lines percentage
   */
  private static calculateDuplicate(code: string): number {
    const lines = code.split('\n');
    const seen = new Set<string>();
    let duplicates = 0;

    for (const line of lines) {
      if (seen.has(line)) {
        duplicates++;
      }
      seen.add(line);
    }

    return (duplicates / lines.length) * 100;
  }

  /**
   * Detect code smells
   */
  private static detectCodeSmells(code: string): number {
    let smells = 0;

    // Long methods
    if (code.match(/function\s+\w+[^}]{2000,}/g)) smells += 5;

    // Duplicate code
    if (code.match(/(.+)\n\1/g)) smells += 3;

    // Large classes/modules
    if (code.length > 5000) smells += 2;

    // Deep nesting
    if (code.match(/\{\s*\{\s*\{\s*\{/g)) smells += 4;

    return smells;
  }

  /**
   * Calculate Maintainability Index
   */
  private static calculateMaintainabilityIndex(
    loc: number,
    complexity: number,
    coverage: number
  ): number {
    // Simplified MI calculation
    const mi = Math.max(
      0,
      100 - (loc * 0.01 + complexity * 10 + (100 - coverage) * 0.5) / 100
    );
    return Math.min(100, mi);
  }

  /**
   * Check code quality gates
   */
  static checkQualityGates(metrics: CodeQualityMetrics): string[] {
    const violations: string[] = [];

    if (metrics.testCoverage < 90) {
      violations.push(
        `Test coverage too low: ${metrics.testCoverage.toFixed(1)}% (required: 90%)`
      );
    }

    if (metrics.complexity > 15) {
      violations.push(
        `Code complexity too high: ${metrics.complexity} (max: 15)`
      );
    }

    if (metrics.maintainabilityIndex < 70) {
      violations.push(
        `Maintainability index too low: ${metrics.maintainabilityIndex.toFixed(1)} (min: 70)`
      );
    }

    if (metrics.duplicateLines > 5) {
      violations.push(
        `Code duplication too high: ${metrics.duplicateLines.toFixed(1)}% (max: 5%)`
      );
    }

    return violations;
  }
}

/**
 * Security Policy Enforcer
 */
export class SecurityPolicyEnforcer {
  /**
   * Check extension against security policies
   */
  static checkSecurityPolicies(
    extensionCode: string,
    manifest: Record<string, any>
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Check permission scope
    if (manifest.permissions && manifest.permissions.length > 50) {
      violations.push({
        policyName: 'PERMISSION_SCOPE',
        description: 'Extension requests too many permissions',
        severity: FindingSeverity.HIGH,
        affectedFiles: ['manifest.json'],
        remediation: 'Reduce permission requests to only necessary ones'
      });
    }

    // Check for dangerous APIs
    if (this.usesDangerousAPIs(extensionCode)) {
      violations.push({
        policyName: 'DANGEROUS_API_USAGE',
        description: 'Code uses dangerous or restricted APIs',
        severity: FindingSeverity.CRITICAL,
        affectedFiles: ['unknown'],
        remediation: 'Replace with safer alternatives provided by extension API'
      });
    }

    // Check resource limits
    if (this.exceedsResourceLimits(extensionCode)) {
      violations.push({
        policyName: 'RESOURCE_LIMITS',
        description: 'Code may exceed resource limits',
        severity: FindingSeverity.MEDIUM,
        affectedFiles: ['unknown'],
        remediation: 'Optimize code to stay within resource limits'
      });
    }

    return violations;
  }

  /**
   * Check if code uses dangerous APIs
   */
  private static usesDangerousAPIs(code: string): boolean {
    const dangerous = [
      /eval\s*\(/,
      /Function\s*\(/,
      /process\.exit/,
      /require\.cache/,
      /__dirname/,
      /__filename/
    ];

    return dangerous.some(pattern => pattern.test(code));
  }

  /**
   * Check if code exceeds resource limits
   */
  private static exceedsResourceLimits(code: string): boolean {
    // Check for infinite loops or resource hogs
    return (
      /while\s*\(\s*true\s*\)/g.test(code) ||
      /for\s*\(\s*;\s*;\s*\)/g.test(code) ||
      code.match(/setInterval|setImmediate/g)?.length || 0 > 10
    );
  }
}

/**
 * Comprehensive Security Review Engine
 */
export class SecurityReviewEngine {
  /**
   * Perform complete security review
   */
  static async performSecurityReview(
    request: ExtensionReviewRequest,
    extensionCode: string,
    packageJson: Record<string, any>
  ): Promise<SecurityReviewResult> {
    const vulnerabilities = SecurityScanner.scanForVulnerabilities(
      extensionCode,
      'typescript',
      request.extensionVersion
    );

    const secrets = SecurityScanner.detectSecrets(extensionCode);

    const codeQuality = CodeQualityAnalyzer.analyzeCodeQuality(extensionCode);

    const dependencies = SecurityScanner.analyzeDependencies(packageJson);

    const licenseCompliance = SecurityScanner.checkLicenseCompliance(packageJson);

    const policyViolations = SecurityPolicyEnforcer.checkSecurityPolicies(
      extensionCode,
      packageJson
    );

    const allFindings = [...vulnerabilities, ...secrets];

    const riskScore = this.calculateRiskScore(
      allFindings,
      codeQuality,
      dependencies,
      licenseCompliance,
      policyViolations
    );

    return {
      id: `review-${Date.now()}`,
      extensionId: request.extensionId,
      extensionVersion: request.extensionVersion,
      reviewDate: new Date(),
      scanResults: allFindings,
      codeQuality,
      dependencies,
      licenseCompliance,
      policyViolations,
      overallRiskScore: riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      recommendedAction: this.getRecommendedAction(riskScore, codeQuality),
      summary: this.generateSummary(riskScore, allFindings, codeQuality)
    };
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private static calculateRiskScore(
    findings: SecurityFinding[],
    codeQuality: CodeQualityMetrics,
    dependencies: DependencyAnalysis,
    licenses: LicenseComplianceResult,
    policies: PolicyViolation[]
  ): number {
    let score = 0;

    // Vulnerabilities (up to 50 points)
    const criticalCount = findings.filter(f => f.severity === FindingSeverity.CRITICAL).length;
    const highCount = findings.filter(f => f.severity === FindingSeverity.HIGH).length;
    score += criticalCount * 10 + highCount * 5;

    // Code quality (up to 25 points)
    if (codeQuality.testCoverage < 80) score += 15;
    if (codeQuality.complexity > 10) score += 5;
    if (codeQuality.maintainabilityIndex < 70) score += 5;

    // Dependencies (up to 15 points)
    score += dependencies.vulnerableDependencies * 3;

    // License issues (up to 10 points)
    if (!licenses.compliant) score += 10;

    // Policy violations (up to 25 points)
    const criticalPolicies = policies.filter(p => p.severity === FindingSeverity.CRITICAL);
    const highPolicies = policies.filter(p => p.severity === FindingSeverity.HIGH);
    score += criticalPolicies.length * 10 + highPolicies.length * 5;

    return Math.min(100, score);
  }

  /**
   * Determine risk level from score
   */
  private static getRiskLevel(
    score: number
  ): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL' {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Get recommended action based on risk
   */
  private static getRecommendedAction(
    riskScore: number,
    quality: CodeQualityMetrics
  ): 'BLOCK' | 'REJECT' | 'REVIEW' | 'APPROVE_WITH_CONDITIONS' | 'APPROVE' {
    if (riskScore >= 80) return 'BLOCK';
    if (riskScore >= 60) return 'REJECT';
    if (riskScore >= 40) return 'REVIEW';
    if (quality.testCoverage < 90) return 'APPROVE_WITH_CONDITIONS';
    return 'APPROVE';
  }

  /**
   * Generate review summary
   */
  private static generateSummary(
    riskScore: number,
    findings: SecurityFinding[],
    quality: CodeQualityMetrics
  ): string {
    const criticals = findings.filter(f => f.severity === FindingSeverity.CRITICAL).length;
    return `Security review complete. Risk score: ${riskScore}/100. Found ${criticals} critical issues. Code coverage: ${quality.testCoverage.toFixed(1)}%.`;
  }
}

/**
 * Review Workflow Manager
 */
export class ReviewWorkflowManager {
  private reviews: Map<string, ReviewApproval> = new Map();
  private reviewHistory: SecurityReviewResult[] = [];

  /**
   * Submit extension for review
   */
  async submitForReview(request: ExtensionReviewRequest): Promise<SecurityReviewResult> {
    // In real implementation, would fetch code from repository
    const code = `// Extension code for ${request.extensionId}`;
    const packageJson = {};

    const review = await SecurityReviewEngine.performSecurityReview(
      request,
      code,
      packageJson
    );

    this.reviewHistory.push(review);
    return review;
  }

  /**
   * Approve extension review
   */
  approveReview(
    reviewId: string,
    approver: string,
    conditions?: string[]
  ): ReviewApproval {
    const review = this.reviewHistory.find(r => r.id === reviewId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }

    const approval: ReviewApproval = {
      id: `approval-${Date.now()}`,
      extensionId: review.extensionId,
      reviewResult: review,
      approvedBy: approver,
      approvedAt: new Date(),
      conditions,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      approvalStatus: conditions ? ReviewStatus.APPROVED_WITH_CONDITIONS : ReviewStatus.APPROVED
    };

    this.reviews.set(approval.id, approval);
    return approval;
  }

  /**
   * Reject review
   */
  rejectReview(reviewId: string, reviewer: string, reason: string): void {
    const review = this.reviewHistory.find(r => r.id === reviewId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }

    // Log rejection
    console.log(
      `Review ${reviewId} rejected by ${reviewer}: ${reason}`
    );
  }

  /**
   * Get review history for extension
   */
  getReviewHistory(extensionId: string): SecurityReviewResult[] {
    return this.reviewHistory.filter(r => r.extensionId === extensionId);
  }

  /**
   * Get current approval status
   */
  getApprovalStatus(extensionId: string): ReviewApproval | undefined {
    return Array.from(this.reviews.values()).find(
      a => a.extensionId === extensionId
    );
  }
}
