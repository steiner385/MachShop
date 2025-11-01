/**
 * API Versioning Service
 * Manages API versions, breaking changes, deprecations, and backward compatibility
 */

import { prisma } from '../lib/prisma';
import {
  ApiVersion,
  ApiVersionStatus,
  BreakingChangeInfo,
  BreakingChangeType,
  ChangelogEntry,
  CompatibilityReport,
  DeprecationInfo,
  MigrationGuide,
} from '../types/versioning';

export class ApiVersioningService {
  /**
   * Create a new API version
   */
  async createVersion(data: {
    version: string;
    semver: string;
    releaseDate: Date;
    status?: ApiVersionStatus;
    changelogUrl?: string;
    migrationGuideUrl?: string;
  }): Promise<ApiVersion> {
    const versionRecord = await prisma.apiVersion.create({
      data: {
        version: data.version,
        semver: data.semver,
        releaseDate: data.releaseDate,
        status: data.status || ApiVersionStatus.BETA,
        changelogUrl: data.changelogUrl,
        migrationGuideUrl: data.migrationGuideUrl,
      },
      include: {
        breakingChanges: true,
        deprecations: true,
      },
    });

    return this.mapToApiVersion(versionRecord);
  }

  /**
   * Get version by identifier
   */
  async getVersion(versionId: string): Promise<ApiVersion | null> {
    const version = await prisma.apiVersion.findUnique({
      where: { version: versionId },
      include: {
        breakingChanges: true,
        deprecations: true,
        usageStats: {
          take: 10, // Recent usage
          orderBy: { date: 'desc' },
        },
      },
    });

    return version ? this.mapToApiVersion(version) : null;
  }

  /**
   * List all versions
   */
  async listVersions(
    status?: ApiVersionStatus,
  ): Promise<ApiVersion[]> {
    const versions = await prisma.apiVersion.findMany({
      where: status ? { status } : undefined,
      orderBy: { releaseDate: 'desc' },
      include: {
        breakingChanges: true,
        deprecations: true,
      },
    });

    return versions.map((v) => this.mapToApiVersion(v));
  }

  /**
   * Add a breaking change to a version
   */
  async addBreakingChange(
    versionId: string,
    change: BreakingChangeInfo,
  ): Promise<BreakingChangeInfo> {
    const breakingChange = await prisma.apiBreakingChange.create({
      data: {
        versionId,
        fromVersion: change.fromVersion,
        toVersion: change.toVersion,
        changeType: change.changeType,
        endpoint: change.endpoint,
        field: change.field,
        description: change.description,
        before: change.before,
        after: change.after,
        migrationSteps: change.migrationSteps,
        migrationGuideUrl: change.migrationGuideUrl,
        announcedAt: change.announcedAt,
        effectiveDate: change.effectiveDate,
      },
    });

    return this.mapToBreakingChange(breakingChange);
  }

  /**
   * Record a deprecation
   */
  async deprecateFeature(
    versionId: string,
    deprecation: DeprecationInfo,
  ): Promise<DeprecationInfo> {
    const deprecated = await prisma.apiDeprecation.create({
      data: {
        versionId,
        feature: deprecation.feature,
        deprecatedAt: deprecation.deprecatedAt,
        sunsetDate: deprecation.sunsetDate,
        replacement: deprecation.replacement,
        migrationGuideUrl: deprecation.migrationGuideUrl,
        severity: deprecation.severity,
        description: deprecation.description,
      },
    });

    return this.mapToDeprecation(deprecated);
  }

  /**
   * Get deprecation info for a feature
   */
  async getDeprecation(feature: string): Promise<DeprecationInfo | null> {
    const deprecation = await prisma.apiDeprecation.findFirst({
      where: { feature },
    });

    return deprecation ? this.mapToDeprecation(deprecation) : null;
  }

  /**
   * Get all active deprecations (not yet sunset)
   */
  async getActiveDeprecations(): Promise<DeprecationInfo[]> {
    const now = new Date();
    const deprecations = await prisma.apiDeprecation.findMany({
      where: {
        sunsetDate: {
          gt: now,
        },
      },
      orderBy: { sunsetDate: 'asc' },
    });

    return deprecations.map((d) => this.mapToDeprecation(d));
  }

  /**
   * Track API usage by version
   */
  async recordVersionUsage(
    apiKeyId: string,
    version: string,
    success: boolean = true,
  ): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const versionRecord = await prisma.apiVersion.findUnique({
      where: { version },
    });

    if (!versionRecord) {
      throw new Error(`API version ${version} not found`);
    }

    await prisma.apiUsageByVersion.upsert({
      where: {
        versionId_apiKeyId_date: {
          versionId: versionRecord.id,
          apiKeyId,
          date: today,
        },
      },
      create: {
        versionId: versionRecord.id,
        apiKeyId,
        date: today,
        requestCount: 1,
        lastRequestAt: new Date(),
        failureCount: success ? 0 : 1,
      },
      update: {
        requestCount: { increment: 1 },
        lastRequestAt: new Date(),
        failureCount: success ? undefined : { increment: 1 },
        lastFailureAt: !success ? new Date() : undefined,
      },
    });
  }

  /**
   * Get version adoption stats
   */
  async getVersionAdoptionStats(versionId: string) {
    const versionRecord = await prisma.apiVersion.findUnique({
      where: { id: versionId },
    });

    if (!versionRecord) {
      return null;
    }

    const usage = await prisma.apiUsageByVersion.findMany({
      where: { versionId },
    });

    const totalRequests = usage.reduce((sum, u) => sum + u.requestCount, 0);
    const uniqueApiKeys = new Set(usage.map((u) => u.apiKeyId)).size;
    const totalFailures = usage.reduce((sum, u) => sum + u.failureCount, 0);

    return {
      version: versionRecord.version,
      totalRequests,
      uniqueApiKeys,
      totalFailures,
      successRate: totalRequests > 0 ? ((totalRequests - totalFailures) / totalRequests) * 100 : 0,
      lastUsedAt: usage.length > 0 ? new Date(Math.max(...usage.map((u) => u.lastRequestAt?.getTime() || 0))) : null,
    };
  }

  /**
   * Mark version as deprecated
   */
  async deprecateVersion(versionId: string, sunsetDate: Date): Promise<ApiVersion> {
    const updated = await prisma.apiVersion.update({
      where: { id: versionId },
      data: {
        status: 'DEPRECATED',
        deprecatedAt: new Date(),
        sunsetDate,
      },
      include: {
        breakingChanges: true,
        deprecations: true,
      },
    });

    return this.mapToApiVersion(updated);
  }

  /**
   * Publish changelog entry
   */
  async publishChangelogEntry(entry: ChangelogEntry): Promise<void> {
    await prisma.apiChangelog.create({
      data: {
        version: entry.version,
        releaseDate: entry.releaseDate,
        category: entry.category,
        title: entry.title,
        description: entry.description,
        endpoint: entry.endpoint,
        field: entry.field,
        migrationGuide: entry.migrationGuide,
        alternativeFeature: entry.alternativeFeature,
        severity: entry.severity,
        affectedApiKeys: entry.affectedApiKeys,
      },
    });
  }

  /**
   * Get changelog for version
   */
  async getChangelog(version: string, limit = 50): Promise<ChangelogEntry[]> {
    const entries = await prisma.apiChangelog.findMany({
      where: { version },
      take: limit,
      orderBy: { releaseDate: 'desc' },
    });

    return entries.map((e) => ({
      id: e.id,
      version: e.version,
      releaseDate: e.releaseDate,
      category: e.category as any,
      title: e.title,
      description: e.description,
      endpoint: e.endpoint || undefined,
      field: e.field || undefined,
      migrationGuide: e.migrationGuide || undefined,
      alternativeFeature: e.alternativeFeature || undefined,
      severity: e.severity || undefined,
      affectedApiKeys: e.affectedApiKeys || undefined,
    }));
  }

  /**
   * Capture an API call for compatibility testing
   */
  async captureApiCall(data: {
    apiKeyId: string;
    apiVersion: string;
    method: string;
    endpoint: string;
    requestPath: string;
    requestHeaders: Record<string, string>;
    requestBody?: Record<string, unknown>;
    requestQuery?: Record<string, unknown>;
    statusCode: number;
    responseHeaders: Record<string, string>;
    responseBody?: Record<string, unknown>;
    duration: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    await prisma.capturedApiCall.create({
      data: {
        apiKeyId: data.apiKeyId,
        apiVersion: data.apiVersion,
        method: data.method,
        endpoint: data.endpoint,
        requestPath: data.requestPath,
        requestHeaders: data.requestHeaders,
        requestBody: data.requestBody,
        requestQuery: data.requestQuery,
        statusCode: data.statusCode,
        responseHeaders: data.responseHeaders,
        responseBody: data.responseBody,
        duration: data.duration,
        success: data.success,
        errorMessage: data.errorMessage,
      },
    });
  }

  /**
   * Generate compatibility report
   */
  async generateCompatibilityReport(
    sourceVersion: string,
    targetVersion: string,
  ): Promise<CompatibilityReport> {
    // Check if report already exists and is fresh
    const existing = await prisma.apiCompatibilityTest.findUnique({
      where: {
        sourceVersion_targetVersion: {
          sourceVersion,
          targetVersion,
        },
      },
    });

    if (existing && existing.expiresAt > new Date()) {
      return this.mapToCompatibilityReport(existing);
    }

    // Generate new report
    const breakingChanges = await prisma.apiBreakingChange.findMany({
      where: {
        fromVersion: sourceVersion,
        toVersion: targetVersion,
      },
    });

    const deprecations = await prisma.apiDeprecation.findMany({
      where: {
        version: {
          version: targetVersion,
        },
      },
    });

    const compatible = breakingChanges.length === 0;

    const report: any = {
      sourceVersion,
      targetVersion,
      compatible,
      breakingChanges: breakingChanges.map((bc) => this.mapToBreakingChange(bc)),
      deprecatedFeatures: deprecations.map((d) => this.mapToDeprecation(d)),
      unsupportedEndpoints: breakingChanges
        .filter((bc) => bc.changeType === 'ENDPOINT_REMOVED')
        .map((bc) => bc.endpoint!)
        .filter(Boolean),
      unsupportedFields: breakingChanges
        .filter((bc) => bc.changeType === 'FIELD_REMOVED')
        .map((bc) => bc.field!)
        .filter(Boolean),
      recommendations: this.getRecommendations(breakingChanges),
      estimatedMigrationEffort: this.estimateMigrationEffort(breakingChanges),
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    // Save report for caching
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.apiCompatibilityTest.upsert({
      where: {
        sourceVersion_targetVersion: {
          sourceVersion,
          targetVersion,
        },
      },
      create: {
        sourceVersion,
        targetVersion,
        compatible,
        breakingChanges: report.breakingChanges,
        deprecatedFeatures: report.deprecatedFeatures,
        unsupportedEndpoints: report.unsupportedEndpoints,
        unsupportedFields: report.unsupportedFields,
        recommendations: report.recommendations,
        estimatedMigrationEffort: report.estimatedMigrationEffort,
        testedEndpoints: 0,
        compatibleEndpoints: 0,
        failingEndpoints: 0,
        expiresAt,
      },
      update: { expiresAt },
    });

    return report;
  }

  // Helper methods

  private mapToApiVersion(record: any): ApiVersion {
    return {
      id: record.id,
      version: record.version,
      semver: record.semver,
      releaseDate: record.releaseDate,
      status: record.status,
      maintenanceUntil: record.maintenanceUntil,
      deprecatedAt: record.deprecatedAt,
      sunsetDate: record.sunsetDate,
      changelogUrl: record.changelogUrl,
      migrationGuideUrl: record.migrationGuideUrl,
      documentationUrl: record.documentationUrl,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapToBreakingChange(record: any): BreakingChangeInfo {
    return {
      id: record.id,
      fromVersion: record.fromVersion,
      toVersion: record.toVersion,
      changeType: record.changeType,
      endpoint: record.endpoint,
      field: record.field,
      description: record.description,
      before: record.before,
      after: record.after,
      migrationSteps: record.migrationSteps,
      migrationGuideUrl: record.migrationGuideUrl,
      announcedAt: record.announcedAt,
      effectiveDate: record.effectiveDate,
    };
  }

  private mapToDeprecation(record: any): DeprecationInfo {
    return {
      id: record.id,
      version: record.version,
      feature: record.feature,
      deprecatedAt: record.deprecatedAt,
      sunsetDate: record.sunsetDate,
      replacement: record.replacement,
      migrationGuideUrl: record.migrationGuideUrl,
      affectedAccounts: record.affectedAccounts,
      notificationsSent: record.notificationsSent,
      severity: record.severity,
      description: record.description,
    };
  }

  private mapToCompatibilityReport(record: any): CompatibilityReport {
    return {
      sourceVersion: record.sourceVersion,
      targetVersion: record.targetVersion,
      compatible: record.compatible,
      breakingChanges: record.breakingChanges || [],
      deprecatedFeatures: record.deprecatedFeatures || [],
      unsupportedEndpoints: record.unsupportedEndpoints || [],
      unsupportedFields: record.unsupportedFields || [],
      recommendations: record.recommendations || [],
      estimatedMigrationEffort: record.estimatedMigrationEffort || 'medium',
      migrationGuideUrl: record.migrationGuideUrl,
      generatedAt: record.createdAt,
      expiresAt: record.expiresAt,
    };
  }

  private getRecommendations(breakingChanges: any[]): string[] {
    const recommendations: string[] = [];

    if (breakingChanges.length === 0) {
      recommendations.push('No breaking changes detected. Migration should be straightforward.');
      return recommendations;
    }

    const endpointRemovals = breakingChanges.filter((bc) => bc.changeType === 'ENDPOINT_REMOVED');
    if (endpointRemovals.length > 0) {
      recommendations.push(
        `Update code to use new endpoints: ${endpointRemovals.map((bc) => bc.endpoint).join(', ')}`,
      );
    }

    const fieldChanges = breakingChanges.filter((bc) => bc.changeType === 'FIELD_TYPE_CHANGED');
    if (fieldChanges.length > 0) {
      recommendations.push('Type conversions needed for: ' + fieldChanges.map((bc) => bc.field).join(', '));
    }

    recommendations.push('Run automated compatibility tests in sandbox environment first');
    recommendations.push('Follow migration guide for step-by-step instructions');

    return recommendations;
  }

  private estimateMigrationEffort(breakingChanges: any[]): 'low' | 'medium' | 'high' {
    if (breakingChanges.length === 0) return 'low';
    if (breakingChanges.length <= 3) return 'medium';
    return 'high';
  }
}

export const apiVersioningService = new ApiVersioningService();
