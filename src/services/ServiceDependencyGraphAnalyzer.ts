/**
 * Service Dependency Graph Analyzer
 * Analyzes dependencies between core services to enable safe migration to extensions
 * Detects circular dependencies, orphaned services, and provides impact analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from 'winston';
import {
  ServiceDependency,
  DependencyGraph,
  ServiceInfo,
  ImpactAnalysis,
} from '../types/coreExtensionMigration';

export class ServiceDependencyGraphAnalyzer {
  private graph: DependencyGraph = {
    services: new Map(),
    dependencies: [],
    circularDependencies: [],
    orphanedServices: [],
    rootServices: [],
  };

  constructor(
    private servicesPath: string,
    private logger: Logger
  ) {}

  /**
   * Analyze all services and build dependency graph
   */
  async analyzeServices(): Promise<DependencyGraph> {
    this.logger.info('Starting service dependency analysis', { path: this.servicesPath });

    try {
      // Get all service files
      const serviceFiles = this.getServiceFiles();
      this.logger.info(`Found ${serviceFiles.length} service files`);

      // Analyze each service
      for (const filePath of serviceFiles) {
        await this.analyzeService(filePath);
      }

      // Build dependency relationships
      this.buildDependencies();

      // Detect circular dependencies
      this.detectCircularDependencies();

      // Identify orphaned and root services
      this.identifyServiceRoles();

      this.logger.info('Service dependency analysis complete', {
        totalServices: this.graph.services.size,
        totalDependencies: this.graph.dependencies.length,
        circularDependencies: this.graph.circularDependencies.length,
        orphanedServices: this.graph.orphanedServices.length,
      });

      return this.graph;
    } catch (error) {
      this.logger.error('Failed to analyze services', { error });
      throw error;
    }
  }

  /**
   * Get all service files
   */
  private getServiceFiles(): string[] {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(this.servicesPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(this.servicesPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively get files from subdirectories
          files.push(...this.getServiceFilesRecursive(fullPath));
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to read services directory', { error });
    }

    return files;
  }

  /**
   * Recursively get service files
   */
  private getServiceFilesRecursive(dirPath: string): string[] {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          files.push(...this.getServiceFilesRecursive(fullPath));
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors in recursion
    }

    return files;
  }

  /**
   * Analyze a single service file
   */
  private async analyzeService(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const serviceId = this.getServiceId(filePath);
      const serviceName = this.getServiceName(filePath);

      // Extract imports
      const imports = this.extractImports(content);
      const exports = this.extractExports(content);
      const methods = this.extractMethods(content);
      const properties = this.extractProperties(content);
      const interfaces = this.extractInterfaces(content);

      const serviceInfo: ServiceInfo = {
        id: serviceId,
        name: serviceName,
        filePath,
        exports: exports,
        imports: imports,
        methods: methods,
        properties: properties,
        interfaces: interfaces,
        testCoverage: 0, // Would need to check test files
        linesOfCode: content.split('\n').length,
        complexity: this.calculateCyclomaticComplexity(content),
        lastModified: new Date(fs.statSync(filePath).mtime),
      };

      this.graph.services.set(serviceId, serviceInfo);
    } catch (error) {
      this.logger.warn('Failed to analyze service', { filePath, error });
    }
  }

  /**
   * Extract imports from source code
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:.*from\s+)?['"]([@\w.\/-]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      // Only include local imports (from services)
      if (importPath.includes('./') || importPath.includes('../')) {
        imports.push(importPath);
      }
    }

    return Array.from(new Set(imports));
  }

  /**
   * Extract exports from source code
   */
  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:class|function|interface|type|const)\s+(\w+)/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  /**
   * Extract methods from service
   */
  private extractMethods(content: string): any[] {
    const methods: any[] = [];
    const methodRegex = /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g;
    let match;
    const seen = new Set<string>();

    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      if (!seen.has(methodName) && methodName !== 'constructor') {
        methods.push({
          name: methodName,
          signature: '',
          isPublic: !content.substring(Math.max(0, match.index - 50), match.index).includes('private'),
          parameters: [],
          returnType: 'unknown',
          dependencies: [],
          testCoverage: 0,
        });
        seen.add(methodName);
      }
    }

    return methods;
  }

  /**
   * Extract properties from service
   */
  private extractProperties(content: string): any[] {
    const properties: any[] = [];
    const propRegex = /(?:private|public|protected)?\s*(\w+)\s*:\s*([^;=]+)[;=]/g;
    let match;
    const seen = new Set<string>();

    while ((match = propRegex.exec(content)) !== null) {
      const propName = match[1];
      if (!seen.has(propName)) {
        properties.push({
          name: propName,
          type: match[2].trim(),
          visibility: 'public',
          readonly: content.includes(`readonly ${propName}`),
        });
        seen.add(propName);
      }
    }

    return properties;
  }

  /**
   * Extract interfaces from service
   */
  private extractInterfaces(content: string): any[] {
    const interfaces: any[] = [];
    const interfaceRegex = /interface\s+(\w+)\s*{([^}]*)}/g;
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push({
        name: match[1],
        methods: [],
        properties: [],
      });
    }

    return interfaces;
  }

  /**
   * Calculate cyclomatic complexity of code
   */
  private calculateCyclomaticComplexity(content: string): number {
    let complexity = 1; // Base complexity
    complexity += (content.match(/\bif\b/g) || []).length;
    complexity += (content.match(/\belse\b/g) || []).length;
    complexity += (content.match(/\bfor\b/g) || []).length;
    complexity += (content.match(/\bwhile\b/g) || []).length;
    complexity += (content.match(/\bcatch\b/g) || []).length;
    complexity += (content.match(/\bcase\b/g) || []).length;
    complexity += (content.match(/\?\s*:/g) || []).length; // Ternary operator
    return Math.min(complexity, 100); // Cap at 100
  }

  /**
   * Build dependency relationships
   */
  private buildDependencies(): void {
    for (const [serviceId, serviceInfo] of this.graph.services.entries()) {
      for (const importPath of serviceInfo.imports) {
        const targetServiceId = this.resolveServiceId(importPath);

        if (targetServiceId && this.graph.services.has(targetServiceId)) {
          const dependency: ServiceDependency = {
            source: serviceId,
            target: targetServiceId,
            type: 'direct',
            weight: 1,
            canRemove: false,
            breakingChange: false,
          };

          this.graph.dependencies.push(dependency);
        }
      }
    }

    this.logger.info(`Built ${this.graph.dependencies.length} dependency relationships`);
  }

  /**
   * Resolve service ID from import path
   */
  private resolveServiceId(importPath: string): string | null {
    // Simple resolution - would need more sophisticated logic for real paths
    const parts = importPath.split('/');
    const fileName = parts[parts.length - 1].replace(/\.(ts|js)$/, '');
    return fileName;
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const service of this.graph.services.keys()) {
      if (!visited.has(service)) {
        this.dfsCircular(service, visited, recursionStack);
      }
    }

    this.logger.info(`Detected ${this.graph.circularDependencies.length} circular dependencies`);
  }

  /**
   * DFS for circular dependency detection
   */
  private dfsCircular(
    node: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[] = []
  ): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const dependencies = this.graph.dependencies
      .filter(dep => dep.source === node)
      .map(dep => dep.target);

    for (const dep of dependencies) {
      if (!visited.has(dep)) {
        this.dfsCircular(dep, visited, recursionStack, path);
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart).concat(dep);
        this.graph.circularDependencies.push(cycle);
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  /**
   * Identify orphaned and root services
   */
  private identifyServiceRoles(): void {
    const hasInbound = new Set(this.graph.dependencies.map(dep => dep.target));
    const hasOutbound = new Set(this.graph.dependencies.map(dep => dep.source));

    for (const serviceId of this.graph.services.keys()) {
      // Orphaned: no inbound and no outbound dependencies
      if (!hasInbound.has(serviceId) && !hasOutbound.has(serviceId)) {
        this.graph.orphanedServices.push(serviceId);
      }

      // Root: no inbound dependencies
      if (!hasInbound.has(serviceId) && hasOutbound.has(serviceId)) {
        this.graph.rootServices.push(serviceId);
      }
    }
  }

  /**
   * Analyze impact of removing a service
   */
  analyzeServiceRemovalImpact(serviceId: string): ImpactAnalysis {
    const affectedServices = new Set<string>();
    const affectedEndpoints: string[] = [];
    const affectedDatabases: string[] = [];
    const affectedIntegrations: string[] = [];

    // Find all services that depend on this service
    for (const dep of this.graph.dependencies) {
      if (dep.target === serviceId) {
        affectedServices.add(dep.source);
      }
    }

    return {
      service: serviceId,
      affectedServices: Array.from(affectedServices),
      affectedEndpoints,
      affectedDatabases,
      affectedIntegrations,
      dataMigrationRequired: false,
      schemaMigrationRequired: false,
      dataLossRisk: false,
      performanceImpact: 'neutral',
      securityImpact: 'neutral',
      estimatedDowntime: 0,
      rollbackComplexity: 'low',
      risks: [],
      mitigations: [],
    };
  }

  /**
   * Get service ID from file path
   */
  private getServiceId(filePath: string): string {
    const fileName = path.basename(filePath, '.ts');
    return fileName;
  }

  /**
   * Get service name from file path
   */
  private getServiceName(filePath: string): string {
    const fileName = path.basename(filePath, '.ts');
    // Convert CamelCase to readable name
    return fileName.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Get detailed dependency information
   */
  getDependencyInfo(serviceId: string): {
    dependencies: string[];
    dependents: string[];
    transitiveDepth: number;
  } {
    const dependencies: string[] = [];
    const dependents: string[] = [];

    for (const dep of this.graph.dependencies) {
      if (dep.source === serviceId) {
        dependencies.push(dep.target);
      }
      if (dep.target === serviceId) {
        dependents.push(dep.source);
      }
    }

    return {
      dependencies,
      dependents,
      transitiveDepth: this.calculateTransitiveDepth(serviceId),
    };
  }

  /**
   * Calculate transitive dependency depth
   */
  private calculateTransitiveDepth(
    serviceId: string,
    visited = new Set<string>(),
    depth = 0
  ): number {
    if (visited.has(serviceId)) return depth;
    visited.add(serviceId);

    const directDeps = this.graph.dependencies
      .filter(dep => dep.source === serviceId)
      .map(dep => dep.target);

    if (directDeps.length === 0) {
      return depth;
    }

    let maxDepth = depth;
    for (const dep of directDeps) {
      const depthFromDep = this.calculateTransitiveDepth(dep, new Set(visited), depth + 1);
      maxDepth = Math.max(maxDepth, depthFromDep);
    }

    return maxDepth;
  }

  /**
   * Export graph as JSON
   */
  exportGraph(): Record<string, unknown> {
    return {
      services: Array.from(this.graph.services.entries()).map(([id, info]) => ({
        id,
        ...info,
      })),
      dependencies: this.graph.dependencies,
      circularDependencies: this.graph.circularDependencies,
      orphanedServices: this.graph.orphanedServices,
      rootServices: this.graph.rootServices,
      statistics: {
        totalServices: this.graph.services.size,
        totalDependencies: this.graph.dependencies.length,
        circulars: this.graph.circularDependencies.length,
        orphaned: this.graph.orphanedServices.length,
      },
    };
  }
}
