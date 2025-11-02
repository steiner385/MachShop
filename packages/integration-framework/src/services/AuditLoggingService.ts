/**
 * Audit Logging Service
 * Provides comprehensive audit trails for compliance and traceability
 */

import {
  AuditLogEntry,
  IntegrationOperationType,
} from '../types';

/**
 * Audit log filters
 */
export interface AuditLogFilter {
  connectorId?: string;
  userId?: string;
  operationType?: IntegrationOperationType;
  status?: 'success' | 'failure';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit log statistics
 */
export interface AuditLogStats {
  totalEntries: number;
  successfulOperations: number;
  failedOperations: number;
  operationsByType: Record<string, number>;
  operationsByConnector: Record<string, number>;
  operationsByUser: Record<string, number>;
}

/**
 * Comprehensive audit logging service for compliance
 */
export class AuditLoggingService {
  private auditLogs: AuditLogEntry[] = [];
  private logStorage: Map<string, AuditLogEntry[]> = new Map();
  private maxLogSize: number = 100000;
  private logRetentionDays: number = 365;

  /**
   * Log integration operation
   */
  logOperation(
    operationType: IntegrationOperationType,
    connectorId: string,
    userId: string,
    action: string,
    status: 'success' | 'failure',
    resourceId?: string,
    oldValue?: unknown,
    newValue?: unknown,
    errorCode?: string,
    ipAddress?: string
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      operationType,
      connectorId,
      userId,
      action,
      resourceId,
      oldValue,
      newValue,
      status,
      errorCode,
      ipAddress,
      changes: this.calculateChanges(oldValue, newValue),
    };

    this.auditLogs.push(entry);
    this.addToConnectorLog(connectorId, entry);

    // Enforce max log size
    if (this.auditLogs.length > this.maxLogSize) {
      this.auditLogs.shift();
    }

    return entry;
  }

  /**
   * Calculate field changes
   */
  private calculateChanges(
    oldValue: unknown,
    newValue: unknown
  ): Record<string, { old: unknown; new: unknown }> | undefined {
    if (!oldValue || !newValue) {
      return undefined;
    }

    if (typeof oldValue !== 'object' || typeof newValue !== 'object') {
      return undefined;
    }

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const oldObj = oldValue as Record<string, unknown>;
    const newObj = newValue as Record<string, unknown>;

    // Find changed fields
    for (const key of Object.keys(newObj)) {
      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        changes[key] = { old: oldObj[key], new: newObj[key] };
      }
    }

    return Object.keys(changes).length > 0 ? changes : undefined;
  }

  /**
   * Add entry to connector-specific log
   */
  private addToConnectorLog(connectorId: string, entry: AuditLogEntry): void {
    if (!this.logStorage.has(connectorId)) {
      this.logStorage.set(connectorId, []);
    }
    this.logStorage.get(connectorId)!.push(entry);
  }

  /**
   * Query audit logs
   */
  queryLogs(filter: AuditLogFilter): AuditLogEntry[] {
    let results = [...this.auditLogs];

    // Apply filters
    if (filter.connectorId) {
      results = results.filter((entry) => entry.connectorId === filter.connectorId);
    }

    if (filter.userId) {
      results = results.filter((entry) => entry.userId === filter.userId);
    }

    if (filter.operationType) {
      results = results.filter((entry) => entry.operationType === filter.operationType);
    }

    if (filter.status) {
      results = results.filter((entry) => entry.status === filter.status);
    }

    if (filter.startDate) {
      results = results.filter((entry) => entry.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      results = results.filter((entry) => entry.timestamp <= filter.endDate!);
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get audit logs for connector
   */
  getConnectorLogs(connectorId: string, limit?: number): AuditLogEntry[] {
    const logs = this.logStorage.get(connectorId) || [];
    if (limit) {
      return logs.slice(-limit);
    }
    return [...logs];
  }

  /**
   * Get audit logs for user
   */
  getUserLogs(userId: string, limit?: number): AuditLogEntry[] {
    let results = this.auditLogs.filter((entry) => entry.userId === userId);
    if (limit) {
      results = results.slice(-limit);
    }
    return results;
  }

  /**
   * Get audit logs by operation type
   */
  getLogsByOperationType(operationType: IntegrationOperationType, limit?: number): AuditLogEntry[] {
    let results = this.auditLogs.filter((entry) => entry.operationType === operationType);
    if (limit) {
      results = results.slice(-limit);
    }
    return results;
  }

  /**
   * Get failed operations
   */
  getFailedOperations(limit?: number): AuditLogEntry[] {
    let results = this.auditLogs.filter((entry) => entry.status === 'failure');
    if (limit) {
      results = results.slice(-limit);
    }
    return results;
  }

  /**
   * Generate audit report
   */
  generateReport(startDate: Date, endDate: Date): {
    period: { start: Date; end: Date };
    stats: AuditLogStats;
    topFailures: { errorCode: string; count: number }[];
    topUsers: { userId: string; operationCount: number }[];
    topConnectors: { connectorId: string; operationCount: number }[];
  } {
    const entries = this.auditLogs.filter(
      (entry) => entry.timestamp >= startDate && entry.timestamp <= endDate
    );

    const stats = this.calculateStats(entries);
    const topFailures = this.getTopFailures(entries);
    const topUsers = this.getTopUsers(entries);
    const topConnectors = this.getTopConnectors(entries);

    return {
      period: { start: startDate, end: endDate },
      stats,
      topFailures,
      topUsers,
      topConnectors,
    };
  }

  /**
   * Calculate statistics
   */
  private calculateStats(entries: AuditLogEntry[]): AuditLogStats {
    const stats: AuditLogStats = {
      totalEntries: entries.length,
      successfulOperations: 0,
      failedOperations: 0,
      operationsByType: {},
      operationsByConnector: {},
      operationsByUser: {},
    };

    for (const entry of entries) {
      if (entry.status === 'success') {
        stats.successfulOperations++;
      } else {
        stats.failedOperations++;
      }

      // Count by type
      stats.operationsByType[entry.operationType] = (stats.operationsByType[entry.operationType] ?? 0) + 1;

      // Count by connector
      stats.operationsByConnector[entry.connectorId] =
        (stats.operationsByConnector[entry.connectorId] ?? 0) + 1;

      // Count by user
      stats.operationsByUser[entry.userId] = (stats.operationsByUser[entry.userId] ?? 0) + 1;
    }

    return stats;
  }

  /**
   * Get top failures
   */
  private getTopFailures(entries: AuditLogEntry[]): { errorCode: string; count: number }[] {
    const failures: Record<string, number> = {};

    for (const entry of entries) {
      if (entry.status === 'failure' && entry.errorCode) {
        failures[entry.errorCode] = (failures[entry.errorCode] ?? 0) + 1;
      }
    }

    return Object.entries(failures)
      .map(([errorCode, count]) => ({ errorCode, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get top users
   */
  private getTopUsers(entries: AuditLogEntry[]): { userId: string; operationCount: number }[] {
    const users: Record<string, number> = {};

    for (const entry of entries) {
      users[entry.userId] = (users[entry.userId] ?? 0) + 1;
    }

    return Object.entries(users)
      .map(([userId, operationCount]) => ({ userId, operationCount }))
      .sort((a, b) => b.operationCount - a.operationCount)
      .slice(0, 10);
  }

  /**
   * Get top connectors
   */
  private getTopConnectors(entries: AuditLogEntry[]): { connectorId: string; operationCount: number }[] {
    const connectors: Record<string, number> = {};

    for (const entry of entries) {
      connectors[entry.connectorId] = (connectors[entry.connectorId] ?? 0) + 1;
    }

    return Object.entries(connectors)
      .map(([connectorId, operationCount]) => ({ connectorId, operationCount }))
      .sort((a, b) => b.operationCount - a.operationCount)
      .slice(0, 10);
  }

  /**
   * Check compliance for period
   */
  checkCompliance(startDate: Date, endDate: Date): {
    compliant: boolean;
    issues: string[];
    compliancePercentage: number;
  } {
    const entries = this.auditLogs.filter(
      (entry) => entry.timestamp >= startDate && entry.timestamp <= endDate
    );

    const issues: string[] = [];
    const stats = this.calculateStats(entries);

    // Check for high failure rate
    const failureRate = stats.totalEntries > 0 ? stats.failedOperations / stats.totalEntries : 0;
    if (failureRate > 0.1) {
      issues.push(`High failure rate: ${(failureRate * 100).toFixed(2)}%`);
    }

    // Check for unauthorized access patterns
    for (const [userId, count] of Object.entries(stats.operationsByUser)) {
      if (count > 1000) {
        issues.push(`Unusual activity for user ${userId}: ${count} operations in period`);
      }
    }

    const compliant = issues.length === 0;
    const compliancePercentage = Math.max(0, 100 - issues.length * 10);

    return { compliant, issues, compliancePercentage };
  }

  /**
   * Archive old logs
   */
  archiveLogs(olderThanDays: number = this.logRetentionDays): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const beforeLength = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter((entry) => entry.timestamp > cutoffDate);

    return beforeLength - this.auditLogs.length;
  }

  /**
   * Export logs as JSON
   */
  exportLogs(filter?: AuditLogFilter): string {
    const logs = filter ? this.queryLogs(filter) : this.auditLogs;
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Import logs (for recovery)
   */
  importLogs(data: string): void {
    try {
      const logs: AuditLogEntry[] = JSON.parse(data);
      this.auditLogs.push(...logs);
    } catch (error) {
      throw new Error(`Failed to import logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get total log count
   */
  getLogCount(): number {
    return this.auditLogs.length;
  }

  /**
   * Clear all logs (for testing)
   */
  clear(): void {
    this.auditLogs = [];
    this.logStorage.clear();
  }
}

// Singleton instance
export const auditLoggingService = new AuditLoggingService();
