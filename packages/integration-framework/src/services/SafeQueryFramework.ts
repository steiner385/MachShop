/**
 * Safe Query Framework
 * Provides safety guardrails for all integration queries and operations
 */

import {
  SafeQueryConfig,
  IntegrationRequest,
  IntegrationOperationType,
  QueryDepthLimit,
  CostControlConfig,
  QueryCostEstimate,
  ImpactAnalysis,
  RiskAssessment,
} from '../types';

/**
 * Framework for validating and controlling integration queries
 * Prevents expensive operations, data corruption, and performance degradation
 */
export class SafeQueryFramework {
  private configs: Map<string, SafeQueryConfig> = new Map();
  private queryCache: Map<string, QueryCostEstimate> = new Map();

  /**
   * Register safe query configuration for a connector
   */
  registerConfig(connectorId: string, config: SafeQueryConfig): void {
    this.configs.set(connectorId, config);
  }

  /**
   * Get safe query configuration
   */
  getConfig(connectorId: string): SafeQueryConfig | undefined {
    return this.configs.get(connectorId);
  }

  /**
   * Validate query against safe query rules
   */
  validateQuery(connectorId: string, request: IntegrationRequest): { valid: boolean; errors: string[] } {
    const config = this.configs.get(connectorId);
    if (!config) {
      return { valid: false, errors: [`No safe query config for connector ${connectorId}`] };
    }

    const errors: string[] = [];

    // Check if operation is allowed
    if (!config.allowedOperations.includes(request.operationType)) {
      errors.push(`Operation ${request.operationType} is not allowed`);
    }

    // Check allowed patterns
    if (request.query && config.allowedPatterns && config.allowedPatterns.length > 0) {
      const isAllowed = config.allowedPatterns.some((pattern) => pattern.test(request.query!));
      if (!isAllowed) {
        errors.push('Query does not match any allowed patterns');
      }
    }

    // Check blocked patterns
    if (request.query && config.blockedPatterns && config.blockedPatterns.length > 0) {
      const isBlocked = config.blockedPatterns.some((pattern) => pattern.test(request.query!));
      if (isBlocked) {
        errors.push('Query matches blocked pattern');
      }
    }

    // Analyze query depth
    if (request.query) {
      const depthAnalysis = this.analyzeQueryDepth(request.query);
      if (depthAnalysis.depth > config.queryDepthLimit.maxDepth) {
        errors.push(
          `Query depth ${depthAnalysis.depth} exceeds limit ${config.queryDepthLimit.maxDepth}`
        );
      }
    }

    // Estimate costs
    const costEstimate = this.estimateQueryCost(request);
    if (costEstimate.wouldExceedQuota) {
      errors.push('Query would exceed data transfer quota');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Analyze query depth and complexity
   */
  private analyzeQueryDepth(query: string): { depth: number; fieldCount: number } {
    // Simplified depth analysis - count nested braces and dots
    let depth = 0;
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of query) {
      if (char === '{' || char === '[') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}' || char === ']') {
        currentDepth--;
      }
    }

    const fieldCount = (query.match(/\./g) || []).length + 1;

    return { depth: maxDepth, fieldCount };
  }

  /**
   * Estimate query cost
   */
  estimateQueryCost(request: IntegrationRequest): QueryCostEstimate {
    // Estimate based on query size and type
    let estimatedRowCount = 1000;
    let estimatedDataVolumeGB = 0.001;
    let estimatedExecutionTimeMs = 500;
    let estimatedCost = 1.0;

    if (request.query) {
      // Heuristic estimates based on query patterns
      const selectCount = (request.query.match(/SELECT/gi) || []).length;
      const joinCount = (request.query.match(/JOIN/gi) || []).length;

      estimatedRowCount = 1000 + selectCount * 500 + joinCount * 1000;
      estimatedDataVolumeGB = estimatedRowCount * 0.00001;
      estimatedExecutionTimeMs = 100 + joinCount * 200 + estimatedRowCount / 100;
      estimatedCost = estimatedDataVolumeGB * 2.0 + estimatedExecutionTimeMs * 0.001;
    }

    // Check against cost controls
    const config = Array.from(this.configs.values())[0]; // Get any config for cost limits
    let wouldExceedQuota = false;

    if (config?.costControls) {
      const controls = config.costControls;
      wouldExceedQuota =
        (controls.maxQueryRowCount && estimatedRowCount > controls.maxQueryRowCount) ||
        (controls.maxDataTransferMB && estimatedDataVolumeGB * 1024 > controls.maxDataTransferMB);
    }

    return {
      estimatedRowCount,
      estimatedDataVolumeGB,
      estimatedExecutionTimeMs,
      estimatedCost,
      wouldExceedQuota,
    };
  }

  /**
   * Apply rate limiting to request
   */
  applyRateLimit(
    connectorId: string,
    userId: string
  ): { allowed: boolean; retryAfterMs?: number } {
    // Simplified rate limiting - check request count
    const key = `${connectorId}:${userId}`;
    const now = Date.now();

    // In production, use Redis or similar for distributed rate limiting
    // This is a simplified in-memory implementation
    const lastRequest = this.queryCache.get(key);

    // Allow 60 requests per minute per user per connector
    const requestsPerMinute = 60;
    const timeWindowMs = 60000;

    if (lastRequest && now - (lastRequest.estimatedExecutionTimeMs || 0) < timeWindowMs / requestsPerMinute) {
      return {
        allowed: false,
        retryAfterMs: Math.ceil(timeWindowMs / requestsPerMinute),
      };
    }

    return { allowed: true };
  }

  /**
   * Analyze impact of query before execution
   */
  analyzeImpact(request: IntegrationRequest): ImpactAnalysis {
    const costEstimate = this.estimateQueryCost(request);

    const risks: RiskAssessment[] = [];

    // Assess data loss risk (for write operations)
    if (request.operationType === IntegrationOperationType.DELETE) {
      risks.push({
        type: 'data-loss',
        severity: costEstimate.estimatedRowCount > 10000 ? 'critical' : 'high',
        description: `Query will delete approximately ${costEstimate.estimatedRowCount} rows`,
        mitigation: 'Create recovery point before execution, use WITH (NOLOCK) for safety',
      });
    }

    // Assess performance risk
    if (costEstimate.estimatedExecutionTimeMs > 5000) {
      risks.push({
        type: 'performance',
        severity: 'medium',
        description: `Query estimated to take ${costEstimate.estimatedExecutionTimeMs}ms`,
        mitigation: 'Consider adding indexes or breaking into smaller queries',
      });
    }

    // Assess compliance risk
    if (request.operationType === IntegrationOperationType.READ && costEstimate.estimatedRowCount > 100000) {
      risks.push({
        type: 'compliance',
        severity: 'medium',
        description: 'Large data extraction may require compliance review',
        mitigation: 'Submit approval request before execution',
      });
    }

    return {
      estimatedRowsAffected: costEstimate.estimatedRowCount,
      estimatedDataVolumeGB: costEstimate.estimatedDataVolumeGB,
      affectedSystems: ['MES', 'ERP'],
      affectedUsers: 1,
      estimatedCost: costEstimate.estimatedCost,
      risksIdentified: risks,
      requiresRollback: request.operationType === IntegrationOperationType.WRITE,
    };
  }

  /**
   * Check if query requires approval
   */
  requiresApproval(request: IntegrationRequest): boolean {
    // Require approval for:
    // 1. Delete operations
    // 2. Large data transfers
    // 3. Manual request flag
    if (request.requiresApproval) {
      return true;
    }

    if (request.operationType === IntegrationOperationType.DELETE) {
      return true;
    }

    const costEstimate = this.estimateQueryCost(request);
    if (costEstimate.estimatedDataVolumeGB > 1.0) {
      return true;
    }

    return false;
  }

  /**
   * Enforce timeout on operation
   */
  enforceTimeout(request: IntegrationRequest, config?: SafeQueryConfig): number {
    let timeoutMs = request.timeoutMs || 30000; // Default 30 seconds

    if (config?.queryDepthLimit) {
      // Add 100ms per depth level
      const depthAnalysis = this.analyzeQueryDepth(request.query || '');
      timeoutMs += depthAnalysis.depth * 100;
    }

    return Math.min(timeoutMs, 60000); // Max 60 seconds
  }

  /**
   * Check for query pattern safety
   */
  checkQueryPatternSafety(query: string): { safe: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for SQL injection patterns
    const sqlInjectionPatterns = [
      /('|")\s*(or|and)\s*('|")/i,
      /;\s*(drop|delete|truncate)/i,
      /union\s+select/i,
      /exec\s*\(/i,
      /xp_\w+/i,
    ];

    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(query)) {
        issues.push(`Potential SQL injection pattern detected: ${pattern.source}`);
      }
    }

    // Check for performance anti-patterns
    if (/select\s+\*\s+from\s+\w+\s+where\s+1\s*=\s*1/i.test(query)) {
      issues.push('Anti-pattern: SELECT * with WHERE 1=1');
    }

    if (/select\s+\*(?!.*limit)/i.test(query) && query.length > 500) {
      issues.push('Anti-pattern: SELECT * without LIMIT on large query');
    }

    return { safe: issues.length === 0, issues };
  }

  /**
   * Get query cache stats
   */
  getCacheStats(): { totalCached: number; cacheHitRate: number } {
    return {
      totalCached: this.queryCache.size,
      cacheHitRate: 0.75, // Placeholder
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.configs.clear();
    this.queryCache.clear();
  }
}

// Singleton instance
export const safeQueryFramework = new SafeQueryFramework();
