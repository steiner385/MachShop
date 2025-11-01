/**
 * Security Audit Logging & Reporting System
 * Comprehensive audit trail for all security review activities
 * Issue #444: Extension Security & Code Review Framework
 */

import type { SecurityReviewResult, ReviewApproval } from './code-review-framework';

/**
 * Audit event types
 */
export enum AuditEventType {
  REVIEW_SUBMITTED = 'REVIEW_SUBMITTED',
  REVIEW_COMPLETED = 'REVIEW_COMPLETED',
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  REVIEW_REJECTED = 'REVIEW_REJECTED',
  VULNERABILITY_DETECTED = 'VULNERABILITY_DETECTED',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  LICENSE_ISSUE = 'LICENSE_ISSUE',
  SECRET_DETECTED = 'SECRET_DETECTED',
  REVIEW_APPROVAL_EXPIRED = 'REVIEW_APPROVAL_EXPIRED',
  EXTENSION_INSTALLED = 'EXTENSION_INSTALLED',
  EXTENSION_UNINSTALLED = 'EXTENSION_UNINSTALLED',
  EXTENSION_UPDATED = 'EXTENSION_UPDATED',
  SECURITY_POLICY_CHANGED = 'SECURITY_POLICY_CHANGED',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  extensionId: string;
  extensionVersion?: string;
  actor: string; // User ID or system process
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  details: Record<string, unknown>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  };
}

/**
 * Audit log query
 */
export interface AuditLogQuery {
  extensionId?: string;
  eventType?: AuditEventType;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  actor?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  reportId: string;
  generatedDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalReviewsSubmitted: number;
  totalReviewsApproved: number;
  totalReviewsRejected: number;
  criticalVulnerabilitiesFound: number;
  highVulnerabilitiesFound: number;
  licenseViolations: number;
  secretsDetected: number;
  policyViolations: number;
  approvalRatio: number; // Approved / Total
  averageReviewTime: number; // Minutes
  extensions: {
    extensionId: string;
    version: string;
    status: 'APPROVED' | 'REJECTED' | 'PENDING';
    lastReviewDate: Date;
    vulnerabilityCount: number;
  }[];
}

/**
 * Security event stream for real-time monitoring
 */
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  extensionId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  message: string;
  details: Record<string, unknown>;
}

/**
 * Security Audit Logger - Comprehensive audit trail management
 */
export class SecurityAuditLogger {
  private auditLogs: Map<string, AuditLogEntry[]> = new Map();
  private eventListeners: Set<(event: SecurityEvent) => void> = new Set();

  /**
   * Log a security event
   */
  logEvent(
    extensionId: string,
    eventType: AuditEventType,
    actor: string,
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO',
    details: Record<string, unknown>,
    metadata?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      eventType,
      extensionId,
      actor,
      severity,
      details,
      metadata,
    };

    // Store in memory
    if (!this.auditLogs.has(extensionId)) {
      this.auditLogs.set(extensionId, []);
    }
    this.auditLogs.get(extensionId)!.push(entry);

    // Emit event to listeners
    this.emitSecurityEvent({
      id: entry.id,
      timestamp: entry.timestamp,
      eventType,
      extensionId,
      severity,
      message: `${eventType}: ${extensionId}`,
      details,
    });

    return entry;
  }

  /**
   * Log review submission
   */
  logReviewSubmission(
    extensionId: string,
    extensionVersion: string,
    actor: string,
    riskScore: number
  ): void {
    this.logEvent(
      extensionId,
      AuditEventType.REVIEW_SUBMITTED,
      actor,
      riskScore > 70 ? 'CRITICAL' : riskScore > 50 ? 'HIGH' : 'MEDIUM',
      {
        version: extensionVersion,
        riskScore,
        submittedBy: actor,
      }
    );
  }

  /**
   * Log review completion
   */
  logReviewCompletion(
    extensionId: string,
    extensionVersion: string,
    actor: string,
    result: SecurityReviewResult
  ): void {
    const severity = result.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM';

    this.logEvent(
      extensionId,
      AuditEventType.REVIEW_COMPLETED,
      actor,
      severity,
      {
        version: extensionVersion,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        vulnerabilities: result.findings.length,
        recommendations: result.recommendedAction,
      }
    );
  }

  /**
   * Log review approval
   */
  logReviewApproval(
    extensionId: string,
    extensionVersion: string,
    approver: string,
    conditions?: string[]
  ): void {
    this.logEvent(
      extensionId,
      AuditEventType.REVIEW_APPROVED,
      approver,
      'INFO',
      {
        version: extensionVersion,
        approvedBy: approver,
        conditions: conditions || [],
        approvalDate: new Date(),
      }
    );
  }

  /**
   * Log review rejection
   */
  logReviewRejection(
    extensionId: string,
    extensionVersion: string,
    rejector: string,
    reason: string
  ): void {
    this.logEvent(
      extensionId,
      AuditEventType.REVIEW_REJECTED,
      rejector,
      'HIGH',
      {
        version: extensionVersion,
        rejectedBy: rejector,
        reason,
        rejectionDate: new Date(),
      }
    );
  }

  /**
   * Log vulnerability detection
   */
  logVulnerabilityDetected(
    extensionId: string,
    cveId: string,
    severity: string,
    title: string
  ): void {
    const severityMap: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'> = {
      CRITICAL: 'CRITICAL',
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW',
      INFO: 'INFO',
    };

    this.logEvent(
      extensionId,
      AuditEventType.VULNERABILITY_DETECTED,
      'system',
      severityMap[severity] || 'MEDIUM',
      {
        cveId,
        severity,
        title,
        detectedDate: new Date(),
      }
    );
  }

  /**
   * Log secret detection
   */
  logSecretDetected(
    extensionId: string,
    secretType: string,
    location: string
  ): void {
    this.logEvent(
      extensionId,
      AuditEventType.SECRET_DETECTED,
      'system',
      'CRITICAL',
      {
        secretType,
        location,
        detectedDate: new Date(),
      }
    );
  }

  /**
   * Log policy violation
   */
  logPolicyViolation(
    extensionId: string,
    policyName: string,
    severity: string
  ): void {
    const severityMap: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'> = {
      CRITICAL: 'CRITICAL',
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW',
      INFO: 'INFO',
    };

    this.logEvent(
      extensionId,
      AuditEventType.POLICY_VIOLATION,
      'system',
      severityMap[severity] || 'MEDIUM',
      {
        policyName,
        severity,
        violationDate: new Date(),
      }
    );
  }

  /**
   * Query audit logs
   */
  queryAuditLogs(query: AuditLogQuery): AuditLogEntry[] {
    let results: AuditLogEntry[] = [];

    if (query.extensionId) {
      results = this.auditLogs.get(query.extensionId) || [];
    } else {
      // Combine all logs
      for (const logs of this.auditLogs.values()) {
        results.push(...logs);
      }
    }

    // Filter by criteria
    if (query.eventType) {
      results = results.filter((log) => log.eventType === query.eventType);
    }

    if (query.severity) {
      results = results.filter((log) => log.severity === query.severity);
    }

    if (query.actor) {
      results = results.filter((log) => log.actor === query.actor);
    }

    if (query.startDate) {
      results = results.filter((log) => log.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      results = results.filter((log) => log.timestamp <= query.endDate!);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get audit log entries for an extension
   */
  getExtensionAuditLog(extensionId: string): AuditLogEntry[] {
    return this.auditLogs.get(extensionId) || [];
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(startDate: Date, endDate: Date): ComplianceReport {
    const logs = this.queryAuditLogs({ startDate, endDate });

    // Count events
    const submitted = logs.filter((l) => l.eventType === AuditEventType.REVIEW_SUBMITTED).length;
    const approved = logs.filter((l) => l.eventType === AuditEventType.REVIEW_APPROVED).length;
    const rejected = logs.filter((l) => l.eventType === AuditEventType.REVIEW_REJECTED).length;
    const vulnerabilities = logs.filter((l) => l.eventType === AuditEventType.VULNERABILITY_DETECTED).length;
    const critical = logs.filter(
      (l) => l.eventType === AuditEventType.VULNERABILITY_DETECTED && l.severity === 'CRITICAL'
    ).length;
    const high = logs.filter((l) => l.eventType === AuditEventType.VULNERABILITY_DETECTED && l.severity === 'HIGH').length;
    const licenseIssues = logs.filter((l) => l.eventType === AuditEventType.LICENSE_ISSUE).length;
    const secrets = logs.filter((l) => l.eventType === AuditEventType.SECRET_DETECTED).length;
    const policyViolations = logs.filter((l) => l.eventType === AuditEventType.POLICY_VIOLATION).length;

    // Calculate average review time (mock - would be calculated from actual timestamps)
    const total = submitted + rejected;
    const approvalRatio = total > 0 ? approved / total : 0;

    // Build extension summary
    const extensionMap = new Map<string, { version: string; status: 'APPROVED' | 'REJECTED' | 'PENDING'; lastReviewDate: Date; vulnerabilityCount: number }>();

    logs.forEach((log) => {
      if (log.eventType === AuditEventType.REVIEW_APPROVED) {
        extensionMap.set(log.extensionId, {
          version: log.details.version as string,
          status: 'APPROVED',
          lastReviewDate: log.timestamp,
          vulnerabilityCount: (log.details.vulnerabilities as number) || 0,
        });
      } else if (log.eventType === AuditEventType.REVIEW_REJECTED) {
        extensionMap.set(log.extensionId, {
          version: log.details.version as string,
          status: 'REJECTED',
          lastReviewDate: log.timestamp,
          vulnerabilityCount: 0,
        });
      }
    });

    return {
      reportId: this.generateId(),
      generatedDate: new Date(),
      period: { startDate, endDate },
      totalReviewsSubmitted: submitted,
      totalReviewsApproved: approved,
      totalReviewsRejected: rejected,
      criticalVulnerabilitiesFound: critical,
      highVulnerabilitiesFound: high,
      licenseViolations: licenseIssues,
      secretsDetected: secrets,
      policyViolations,
      approvalRatio,
      averageReviewTime: 240, // Mock: 4 hours
      extensions: Array.from(extensionMap.values()).map((ext, idx) => ({
        extensionId: Array.from(extensionMap.keys())[idx],
        ...ext,
      })),
    };
  }

  /**
   * Export audit logs in various formats
   */
  exportAuditLogs(format: 'json' | 'csv' | 'pdf', query?: AuditLogQuery): string {
    const logs = query ? this.queryAuditLogs(query) : Array.from(this.auditLogs.values()).flat();

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    if (format === 'csv') {
      const headers = ['ID', 'Timestamp', 'Event Type', 'Extension ID', 'Actor', 'Severity', 'Details'];
      const rows = logs.map((log) => [
        log.id,
        log.timestamp.toISOString(),
        log.eventType,
        log.extensionId,
        log.actor,
        log.severity,
        JSON.stringify(log.details),
      ]);

      const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

      return csvContent;
    }

    if (format === 'pdf') {
      // Mock PDF export - real implementation would use a library like PDFKit
      return `PDF Report Generated: ${new Date().toISOString()}\n${logs.length} audit entries`;
    }

    return '';
  }

  /**
   * Subscribe to security events
   */
  onSecurityEvent(listener: (event: SecurityEvent) => void): void {
    this.eventListeners.add(listener);
  }

  /**
   * Unsubscribe from security events
   */
  offSecurityEvent(listener: (event: SecurityEvent) => void): void {
    this.eventListeners.delete(listener);
  }

  /**
   * Emit security event to all listeners
   */
  private emitSecurityEvent(event: SecurityEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in security event listener:', error);
      }
    });
  }

  /**
   * Clear old audit logs (e.g., older than 90 days)
   */
  purgeOldLogs(daysToKeep: number = 90): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let purgedCount = 0;

    for (const [extensionId, logs] of this.auditLogs.entries()) {
      const filtered = logs.filter((log) => log.timestamp > cutoffDate);
      const removed = logs.length - filtered.length;
      purgedCount += removed;

      if (filtered.length === 0) {
        this.auditLogs.delete(extensionId);
      } else {
        this.auditLogs.set(extensionId, filtered);
      }
    }

    return purgedCount;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global audit logger instance
 */
export const globalAuditLogger = new SecurityAuditLogger();
