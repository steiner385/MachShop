/**
 * Service Classification Engine
 * Classifies services as core, extension, or hybrid based on analysis criteria
 * Provides recommendations and scoring for migration prioritization
 */

import { Logger } from 'winston';
import {
  ServiceClassification,
  ServiceInfo,
  DependencyGraph,
} from '../types/coreExtensionMigration';

export class ServiceClassificationEngine {
  // Classification criteria weights
  private readonly weights = {
    dependencies: 0.25,
    businessLogic: 0.25,
    integration: 0.20,
    complexity: 0.15,
    testCoverage: 0.10,
    usage: 0.05,
  };

  // Threshold for extension migration (0-100)
  private readonly extensionThreshold = 60;
  private readonly coreThreshold = 40;

  constructor(private logger: Logger) {}

  /**
   * Classify all services
   */
  classifyServices(
    services: Map<string, ServiceInfo>,
    dependencyGraph: DependencyGraph
  ): ServiceClassification[] {
    this.logger.info('Starting service classification', { totalServices: services.size });

    const classifications: ServiceClassification[] = [];

    for (const [serviceId, serviceInfo] of services.entries()) {
      const classification = this.classifyService(serviceId, serviceInfo, dependencyGraph);
      classifications.push(classification);
    }

    // Sort by confidence (descending)
    classifications.sort((a, b) => b.confidence - a.confidence);

    this.logger.info('Service classification complete', {
      total: classifications.length,
      extension: classifications.filter(c => c.classification === 'extension').length,
      core: classifications.filter(c => c.classification === 'core').length,
      hybrid: classifications.filter(c => c.classification === 'hybrid').length,
    });

    return classifications;
  }

  /**
   * Classify a single service
   */
  private classifyService(
    serviceId: string,
    serviceInfo: ServiceInfo,
    dependencyGraph: DependencyGraph
  ): ServiceClassification {
    // Calculate individual scores
    const dependencyScore = this.scoreDependencies(serviceId, dependencyGraph);
    const businessLogicScore = this.scoreBusinessLogic(serviceInfo);
    const integrationScore = this.scoreIntegration(serviceInfo);
    const complexityScore = this.scoreComplexity(serviceInfo);
    const testCoverageScore = this.scoreTestCoverage(serviceInfo);
    const usageScore = this.scoreUsage(serviceId, dependencyGraph);

    // Calculate weighted total
    const totalScore =
      dependencyScore * this.weights.dependencies +
      businessLogicScore * this.weights.businessLogic +
      integrationScore * this.weights.integration +
      complexityScore * this.weights.complexity +
      testCoverageScore * this.weights.testCoverage +
      usageScore * this.weights.usage;

    // Determine classification
    let classification: 'core' | 'extension' | 'hybrid';
    if (totalScore >= this.extensionThreshold) {
      classification = 'extension';
    } else if (totalScore <= this.coreThreshold) {
      classification = 'core';
    } else {
      classification = 'hybrid';
    }

    // Get dependencies and dependents
    const dependencies = dependencyGraph.dependencies
      .filter(dep => dep.source === serviceId)
      .map(dep => dep.target);
    const dependents = dependencyGraph.dependencies
      .filter(dep => dep.target === serviceId)
      .map(dep => dep.source);

    // Determine category
    const category = this.determineCategory(serviceInfo);

    // Determine complexity level
    const complexity =
      serviceInfo.complexity < 15 ? 'low' : serviceInfo.complexity < 50 ? 'medium' : 'high';

    // Generate reasoning
    const reasoning = this.generateReasoning(
      classification,
      totalScore,
      {
        dependencyScore,
        businessLogicScore,
        integrationScore,
        complexityScore,
        testCoverageScore,
        usageScore,
      }
    );

    // Assess risk level
    const riskLevel = this.assessRiskLevel(serviceInfo, dependencies, dependents);

    // Estimate effort
    const estimatedEffort = this.estimateEffort(
      classification,
      complexity,
      dependencies.length,
      testCoverageScore
    );

    return {
      serviceId,
      serviceName: serviceInfo.name,
      filePath: serviceInfo.filePath,
      classification,
      reasoning,
      confidence: Math.round(Math.abs(50 - totalScore) * 2), // Higher confidence at extremes
      category,
      complexity,
      dependencies,
      dependents,
      estimatedEffort,
      riskLevel,
      businessImpact: this.assessBusinessImpact(serviceInfo, dependents.length),
      technicalDebt: this.assessTechnicalDebt(serviceInfo),
    };
  }

  /**
   * Score dependency characteristics
   */
  private scoreDependencies(serviceId: string, graph: DependencyGraph): number {
    const deps = graph.dependencies.filter(d => d.source === serviceId);
    const dependents = graph.dependencies.filter(d => d.target === serviceId);

    // Services with fewer dependencies score higher for extension
    const depScore = Math.max(0, 100 - deps.length * 5);
    // Services with more dependents score lower for extension (core-like)
    const dependentPenalty = dependents.length * 10;

    return Math.max(0, depScore - dependentPenalty);
  }

  /**
   * Score business logic characteristics
   */
  private scoreBusinessLogic(serviceInfo: ServiceInfo): number {
    // More methods/properties = more business logic = less likely extension
    const methodScore = Math.max(0, 100 - serviceInfo.methods.length * 2);
    // Services with interfaces = more formalized = better for extension
    const interfaceBonus = serviceInfo.interfaces.length * 5;

    return Math.min(100, Math.max(0, methodScore + interfaceBonus));
  }

  /**
   * Score integration characteristics
   */
  private scoreIntegration(serviceInfo: ServiceInfo): number {
    // External integrations are good candidates for extensions
    const name = serviceInfo.name.toLowerCase();
    const isIntegration =
      name.includes('integration') ||
      name.includes('api') ||
      name.includes('client') ||
      name.includes('connector') ||
      name.includes('external');

    return isIntegration ? 70 : 30;
  }

  /**
   * Score complexity
   */
  private scoreComplexity(serviceInfo: ServiceInfo): number {
    // Lower complexity = better for extension
    if (serviceInfo.complexity < 20) return 80;
    if (serviceInfo.complexity < 40) return 60;
    if (serviceInfo.complexity < 60) return 40;
    return 20;
  }

  /**
   * Score test coverage
   */
  private scoreTestCoverage(serviceInfo: ServiceInfo): number {
    // High test coverage = safer to migrate
    return serviceInfo.testCoverage > 80 ? 100 : serviceInfo.testCoverage > 50 ? 70 : 30;
  }

  /**
   * Score usage patterns
   */
  private scoreUsage(serviceId: string, graph: DependencyGraph): number {
    // Services used by few other services = better for extension
    const dependentCount = graph.dependencies.filter(d => d.target === serviceId).length;

    if (dependentCount === 0) return 100; // Orphaned = safe
    if (dependentCount < 5) return 80;
    if (dependentCount < 10) return 50;
    return 20;
  }

  /**
   * Determine service category
   */
  private determineCategory(
    serviceInfo: ServiceInfo
  ): 'business_logic' | 'integration' | 'utility' | 'infrastructure' | 'custom' {
    const name = serviceInfo.name.toLowerCase();

    if (
      name.includes('integration') ||
      name.includes('api') ||
      name.includes('client') ||
      name.includes('connector') ||
      name.includes('external')
    ) {
      return 'integration';
    }

    if (
      name.includes('service') &&
      !name.includes('time') &&
      !name.includes('cache') &&
      !name.includes('queue')
    ) {
      return 'business_logic';
    }

    if (
      name.includes('cache') ||
      name.includes('queue') ||
      name.includes('storage') ||
      name.includes('redis') ||
      name.includes('database')
    ) {
      return 'infrastructure';
    }

    if (name.includes('helper') || name.includes('util') || name.includes('formatter')) {
      return 'utility';
    }

    return 'custom';
  }

  /**
   * Assess risk level
   */
  private assessRiskLevel(
    serviceInfo: ServiceInfo,
    dependencies: string[],
    dependents: string[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const riskFactors = {
      highComplexity: serviceInfo.complexity > 50,
      manyDependencies: dependencies.length > 10,
      manyDependents: dependents.length > 15,
      lowTestCoverage: serviceInfo.testCoverage < 50,
      recentlyModified: this.isRecentlyModified(serviceInfo.lastModified),
    };

    const riskCount = Object.values(riskFactors).filter(Boolean).length;

    if (riskCount >= 4) return 'critical';
    if (riskCount === 3) return 'high';
    if (riskCount === 2) return 'medium';
    return 'low';
  }

  /**
   * Check if service was recently modified
   */
  private isRecentlyModified(lastModified: Date): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastModified > thirtyDaysAgo;
  }

  /**
   * Estimate effort for migration
   */
  private estimateEffort(
    classification: string,
    complexity: string,
    dependencyCount: number,
    testCoverageScore: number
  ): number {
    let baseEffort = 5; // Base story points

    if (complexity === 'high') baseEffort += 5;
    if (complexity === 'medium') baseEffort += 3;

    baseEffort += Math.min(dependencyCount, 10); // Up to 10 points for dependencies

    // Reduce for good test coverage
    if (testCoverageScore < 50) baseEffort += 3;

    return baseEffort;
  }

  /**
   * Assess business impact
   */
  private assessBusinessImpact(serviceInfo: ServiceInfo, dependentCount: number): string {
    if (dependentCount > 10) {
      return 'Critical - used by many services';
    }
    if (dependentCount > 5) {
      return 'High - used by several services';
    }
    if (dependentCount > 1) {
      return 'Medium - used by few services';
    }
    return 'Low - isolated service';
  }

  /**
   * Assess technical debt
   */
  private assessTechnicalDebt(serviceInfo: ServiceInfo): string[] {
    const debt: string[] = [];

    if (serviceInfo.complexity > 60) {
      debt.push('High cyclomatic complexity');
    }

    if (serviceInfo.testCoverage < 50) {
      debt.push('Low test coverage');
    }

    if (serviceInfo.methods.length > 30) {
      debt.push('Too many methods - needs refactoring');
    }

    if (serviceInfo.linesOfCode > 1000) {
      debt.push('Large file - should be split');
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (serviceInfo.lastModified < sixMonthsAgo) {
      debt.push('Not recently maintained');
    }

    return debt;
  }

  /**
   * Generate reasoning for classification
   */
  private generateReasoning(
    classification: string,
    score: number,
    scores: Record<string, number>
  ): string {
    const reasons: string[] = [];

    if (classification === 'extension') {
      reasons.push('Suitable for extension-based architecture');
      if (scores.dependencyScore > 70) reasons.push('Low external dependencies');
      if (scores.integrationScore > 60) reasons.push('Integration-focused service');
      if (scores.complexityScore > 60) reasons.push('Manageable complexity');
    } else if (classification === 'core') {
      reasons.push('Should remain in core platform');
      if (scores.usageScore < 30) reasons.push('Used by many other services');
      if (scores.dependencyScore < 40) reasons.push('Core infrastructure service');
    } else {
      reasons.push('Could be migrated with careful planning');
      if (scores.testCoverageScore < 50) reasons.push('Needs improved test coverage');
    }

    return reasons.join('; ') || 'Requires further analysis';
  }

  /**
   * Get classification summary
   */
  getSummary(classifications: ServiceClassification[]): Record<string, unknown> {
    const extension = classifications.filter(c => c.classification === 'extension');
    const core = classifications.filter(c => c.classification === 'core');
    const hybrid = classifications.filter(c => c.classification === 'hybrid');

    const totalEffort = [...extension, ...hybrid].reduce((sum, c) => sum + c.estimatedEffort, 0);

    return {
      total: classifications.length,
      canMigrateToExtension: extension.length,
      shouldStayCore: core.length,
      requiresDecision: hybrid.length,
      totalMigrationEffort: totalEffort,
      highRiskServices: classifications.filter(c => c.riskLevel === 'critical'),
    };
  }
}
