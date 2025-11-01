/**
 * API Compatibility Testing Service
 * Tests API calls against different versions to detect compatibility issues
 */

import { prisma } from '../lib/prisma';
import { CompatibilityReport } from '../types/versioning';
import { apiVersioningService } from './ApiVersioningService';

export class CompatibilityTestingService {
  /**
   * Replay recorded API calls against a new version
   * Detects breaking changes by comparing responses
   */
  async testVersionCompatibility(
    sourceVersion: string,
    targetVersion: string,
    limit: number = 100,
  ): Promise<{
    compatible: boolean;
    testedRequests: number;
    successfulTests: number;
    failedTests: number;
    issues: CompatibilityIssue[];
  }> {
    // Get recorded API calls from source version
    const recordedCalls = await prisma.capturedApiCall.findMany({
      where: { apiVersion: sourceVersion },
      take: limit,
      orderBy: { timestamp: 'desc' },
    });

    if (recordedCalls.length === 0) {
      return {
        compatible: true,
        testedRequests: 0,
        successfulTests: 0,
        failedTests: 0,
        issues: [],
      };
    }

    const issues: CompatibilityIssue[] = [];
    let successfulTests = 0;

    // Test each recorded call
    for (const call of recordedCalls) {
      const testResult = await this.testSingleCall(call, sourceVersion, targetVersion);

      if (testResult.compatible) {
        successfulTests++;
      } else {
        issues.push(...testResult.issues);
      }
    }

    const compatible = issues.length === 0;

    return {
      compatible,
      testedRequests: recordedCalls.length,
      successfulTests,
      failedTests: recordedCalls.length - successfulTests,
      issues,
    };
  }

  /**
   * Test a single API call against target version
   */
  private async testSingleCall(
    call: any,
    sourceVersion: string,
    targetVersion: string,
  ): Promise<{
    compatible: boolean;
    issues: CompatibilityIssue[];
  }> {
    const issues: CompatibilityIssue[] = [];

    try {
      // Check for removed endpoints
      const endpointWillExist = await this.checkEndpointExists(call.endpoint, targetVersion);
      if (!endpointWillExist) {
        issues.push({
          type: 'ENDPOINT_REMOVED',
          severity: 'critical',
          endpoint: call.endpoint,
          message: `Endpoint ${call.method} ${call.endpoint} will be removed`,
          affectedEndpoints: [call.endpoint],
        });
      }

      // Check for breaking changes in response
      if (call.responseBody) {
        const responseIssues = await this.analyzeResponseChanges(
          call.endpoint,
          call.responseBody,
          sourceVersion,
          targetVersion,
        );
        issues.push(...responseIssues);
      }

      // Check for changed status codes
      const expectedStatusCode = await this.getExpectedStatusCode(call.endpoint, call.method, targetVersion);
      if (expectedStatusCode && expectedStatusCode !== call.statusCode) {
        issues.push({
          type: 'HTTP_STATUS_CHANGED',
          severity: 'high',
          endpoint: call.endpoint,
          message: `Status code changed from ${call.statusCode} to ${expectedStatusCode}`,
          affectedEndpoints: [call.endpoint],
        });
      }
    } catch (error) {
      console.error(`Error testing call ${call.id}:`, error);
      issues.push({
        type: 'UNKNOWN_ERROR',
        severity: 'medium',
        endpoint: call.endpoint,
        message: `Error during compatibility test: ${(error as any).message}`,
        affectedEndpoints: [call.endpoint],
      });
    }

    return {
      compatible: issues.length === 0,
      issues,
    };
  }

  /**
   * Check if endpoint exists in target version
   */
  private async checkEndpointExists(endpoint: string, version: string): Promise<boolean> {
    const breakingChanges = await prisma.apiBreakingChange.findMany({
      where: {
        endpoint,
        changeType: 'ENDPOINT_REMOVED',
        version: {
          version,
        },
      },
    });

    return breakingChanges.length === 0;
  }

  /**
   * Analyze response for breaking changes
   */
  private async analyzeResponseChanges(
    endpoint: string,
    responseBody: Record<string, unknown>,
    sourceVersion: string,
    targetVersion: string,
  ): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = [];

    // Get breaking changes for this endpoint
    const breakingChanges = await prisma.apiBreakingChange.findMany({
      where: {
        endpoint,
        fromVersion: sourceVersion,
        toVersion: targetVersion,
      },
    });

    for (const change of breakingChanges) {
      if (change.changeType === 'FIELD_REMOVED' && change.field) {
        // Check if removed field is in response
        if (this.fieldExists(responseBody, change.field)) {
          issues.push({
            type: 'FIELD_REMOVED',
            severity: 'high',
            endpoint,
            message: `Response field '${change.field}' will be removed`,
            affectedEndpoints: [endpoint],
            fieldName: change.field,
          });
        }
      } else if (change.changeType === 'FIELD_TYPE_CHANGED' && change.field) {
        issues.push({
          type: 'FIELD_TYPE_CHANGED',
          severity: 'high',
          endpoint,
          message: `Field '${change.field}' type will change from ${typeof this.getFieldValue(
            responseBody,
            change.field,
          )} to ${change.after?.type || 'unknown'}`,
          affectedEndpoints: [endpoint],
          fieldName: change.field,
          beforeType: typeof this.getFieldValue(responseBody, change.field),
          afterType: change.after?.type,
        });
      } else if (change.changeType === 'RESPONSE_STRUCTURE_CHANGED') {
        issues.push({
          type: 'RESPONSE_STRUCTURE_CHANGED',
          severity: 'critical',
          endpoint,
          message: `Response structure will change: ${change.description}`,
          affectedEndpoints: [endpoint],
        });
      }
    }

    return issues;
  }

  /**
   * Get expected status code for endpoint in target version
   */
  private async getExpectedStatusCode(
    endpoint: string,
    method: string,
    version: string,
  ): Promise<number | null> {
    // This would query your API spec/documentation
    // For now, return null (no specific expectation)
    return null;
  }

  /**
   * Check if field exists in object (supports dot notation)
   */
  private fieldExists(obj: any, fieldPath: string): boolean {
    return this.getFieldValue(obj, fieldPath) !== undefined;
  }

  /**
   * Get field value from object (supports dot notation)
   */
  private getFieldValue(obj: any, fieldPath: string): unknown {
    return fieldPath.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Generate detailed compatibility report
   */
  async generateDetailedReport(
    sourceVersion: string,
    targetVersion: string,
  ): Promise<DetailedCompatibilityReport> {
    // Get base compatibility report from versioning service
    const baseReport = await apiVersioningService.generateCompatibilityReport(sourceVersion, targetVersion);

    // Run compatibility tests
    const testResults = await this.testVersionCompatibility(sourceVersion, targetVersion, 200);

    // Analyze adoption of source version
    const adoptionStats = await this.getVersionAdoptionStats(sourceVersion);

    return {
      ...baseReport,
      testResults,
      adoptionStats,
      generatedAt: new Date(),
      nextSteps: this.getNextSteps(baseReport, testResults),
      riskAssessment: this.assessRisk(baseReport, testResults),
    };
  }

  /**
   * Get adoption statistics for version
   */
  private async getVersionAdoptionStats(version: string): Promise<VersionAdoptionStats> {
    const versionRecord = await prisma.apiVersion.findUnique({
      where: { version },
    });

    if (!versionRecord) {
      return {
        version,
        totalApiKeys: 0,
        totalRequests: 0,
        weeklyGrowth: 0,
        majorIntegrations: [],
      };
    }

    const usage = await prisma.apiUsageByVersion.findMany({
      where: { versionId: versionRecord.id },
    });

    return {
      version,
      totalApiKeys: new Set(usage.map((u) => u.apiKeyId)).size,
      totalRequests: usage.reduce((sum, u) => sum + u.requestCount, 0),
      weeklyGrowth: 0, // Would calculate from historical data
      majorIntegrations: [], // Would get from integration database
    };
  }

  /**
   * Get recommended next steps for migration
   */
  private getNextSteps(baseReport: CompatibilityReport, testResults: any): string[] {
    const steps: string[] = [];

    if (!baseReport.compatible) {
      steps.push(
        '1. Review breaking changes in detail: ' + baseReport.breakingChanges.map((bc) => bc.endpoint).join(', '),
      );
      steps.push('2. Update code for breaking changes');
      steps.push('3. Run compatibility tests in sandbox environment');
      steps.push('4. Update integration tests');
    }

    if (baseReport.deprecatedFeatures.length > 0) {
      steps.push('5. Update deprecated feature usage');
      steps.push('6. Follow migration guide for each deprecation');
    }

    if (testResults.failedTests > 0) {
      steps.push(`7. Address ${testResults.failedTests} failing compatibility tests`);
    }

    steps.push('8. Perform end-to-end testing in staging');
    steps.push('9. Deploy to production during maintenance window');

    return steps;
  }

  /**
   * Assess migration risk
   */
  private assessRisk(baseReport: CompatibilityReport, testResults: any): RiskAssessment {
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const riskFactors: string[] = [];

    // Assess based on number and severity of breaking changes
    if (baseReport.breakingChanges.length > 5) {
      riskLevel = 'high';
      riskFactors.push('Many breaking changes detected');
    } else if (baseReport.breakingChanges.length > 0) {
      riskLevel = 'medium';
      riskFactors.push('Some breaking changes detected');
    }

    // Assess based on test failures
    if (testResults.failedTests > testResults.testedRequests * 0.1) {
      riskLevel = 'high';
      riskFactors.push('High percentage of test failures');
    }

    // Assess based on deprecations
    if (baseReport.deprecatedFeatures.length > 10) {
      riskLevel = 'medium';
      riskFactors.push('Many deprecations in target version');
    }

    return {
      level: riskLevel,
      factors: riskFactors,
      recommendation: this.getRiskRecommendation(riskLevel),
      estimatedEffort: baseReport.estimatedMigrationEffort,
    };
  }

  /**
   * Get recommendation based on risk level
   */
  private getRiskRecommendation(riskLevel: string): string {
    switch (riskLevel) {
      case 'low':
        return 'Migration is straightforward. Proceed with standard deployment process.';
      case 'medium':
        return 'Migration requires careful review and testing. Schedule extended QA period.';
      case 'high':
        return 'Migration has significant risks. Consider phased rollout and extended testing.';
      case 'critical':
        return 'Migration is high-risk. Consider compatibility layer or maintaining older version.';
      default:
        return 'Unable to assess migration risk.';
    }
  }
}

/**
 * Compatibility test issue
 */
export interface CompatibilityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  endpoint: string;
  message: string;
  affectedEndpoints: string[];
  fieldName?: string;
  beforeType?: string;
  afterType?: string;
}

/**
 * Version adoption statistics
 */
export interface VersionAdoptionStats {
  version: string;
  totalApiKeys: number;
  totalRequests: number;
  weeklyGrowth: number;
  majorIntegrations: string[];
}

/**
 * Detailed compatibility report
 */
export interface DetailedCompatibilityReport extends CompatibilityReport {
  testResults: {
    compatible: boolean;
    testedRequests: number;
    successfulTests: number;
    failedTests: number;
    issues: CompatibilityIssue[];
  };
  adoptionStats: VersionAdoptionStats;
  nextSteps: string[];
  riskAssessment: RiskAssessment;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendation: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}

export const compatibilityTestingService = new CompatibilityTestingService();
