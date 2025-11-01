/**
 * Extension Dependency Resolution Engine
 *
 * Automatically discovers, validates, and installs required extensions in the correct order.
 * Handles circular dependency detection, version constraint resolution, and deterministic
 * installation order planning.
 *
 * Issue #405: Extension Dependency Resolution Engine
 */

import semver from 'semver';
import { prisma } from '../lib/prisma';

/**
 * Represents a version constraint (e.g., "^1.0.0", "~1.2.0", "1.0.0")
 */
interface VersionConstraint {
  raw: string;
  type: 'exact' | 'caret' | 'tilde' | 'range';
  major?: number;
  minor?: number;
  patch?: number;
}

/**
 * Represents an extension with its manifest information
 */
interface ExtensionNode {
  id: string;
  version: string;
  apiVersion: string;
  dependencies: Map<string, VersionConstraint>;
  optional: Set<string>;
  manifest: Record<string, any>;
  resolved?: boolean;
  installOrder?: number;
}

/**
 * Represents a dependency relationship in the graph
 */
interface DependencyEdge {
  from: string;
  to: string;
  version: VersionConstraint;
  optional: boolean;
}

/**
 * Cycle detection result
 */
interface Cycle {
  path: string[];
  isTransitive: boolean;
  description: string;
}

/**
 * Version resolution result
 */
interface VersionResolution {
  extensionId: string;
  resolvedVersion: string;
  constraint: VersionConstraint;
  candidates: string[];
  isCompatible: boolean;
  reason?: string;
}

/**
 * Dependency resolution result
 */
interface ResolutionResult {
  success: boolean;
  extensions: ExtensionNode[];
  installationOrder: string[];
  cycles: Cycle[];
  conflicts: Array<{
    extensionId: string;
    constraints: VersionConstraint[];
    reason: string;
  }>;
  unresolvedDependencies: Array<{
    dependant: string;
    dependency: string;
    reason: string;
  }>;
  resolutionTime: number;
}

/**
 * Validation result for dependency graph
 */
interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    type: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: string[];
}

/**
 * Installation result
 */
interface InstallationResult {
  success: boolean;
  installed: string[];
  failed?: string[];
  rolledBack: string[];
  error?: string;
  timestamp: Date;
}

/**
 * Suggested alternative for conflicts
 */
interface Alternative {
  extensionId: string;
  version: string;
  compatibility: number; // 0-100 percentage
  reason: string;
}

/**
 * DependencyResolverService - Core dependency resolution engine
 */
export class DependencyResolverService {
  private dependencyGraph: Map<string, ExtensionNode>;
  private edges: DependencyEdge[];
  private cache: Map<string, VersionResolution>;

  constructor() {
    this.dependencyGraph = new Map();
    this.edges = [];
    this.cache = new Map();
  }

  /**
   * Resolves all dependencies for an extension
   * @param extensionId - The extension to resolve dependencies for
   * @param version - The version of the extension
   * @returns Resolution result with installation order and any conflicts
   */
  async resolveDependencies(
    extensionId: string,
    version: string
  ): Promise<ResolutionResult> {
    const startTime = Date.now();
    const result: ResolutionResult = {
      success: false,
      extensions: [],
      installationOrder: [],
      cycles: [],
      conflicts: [],
      unresolvedDependencies: [],
      resolutionTime: 0,
    };

    try {
      // Fetch root extension manifest
      const rootManifest = await this.fetchExtensionManifest(
        extensionId,
        version
      );
      if (!rootManifest) {
        result.unresolvedDependencies.push({
          dependant: 'root',
          dependency: extensionId,
          reason: `Extension ${extensionId}@${version} not found`,
        });
        result.resolutionTime = Date.now() - startTime;
        return result;
      }

      // Clear previous resolution
      this.dependencyGraph.clear();
      this.edges = [];
      this.cache.clear();

      // Build dependency graph recursively
      await this.buildDependencyGraph(extensionId, version, new Set());

      // Detect circular dependencies
      const cycles = this.detectCircularDependencies();
      if (cycles.length > 0) {
        result.cycles = cycles;
        result.resolutionTime = Date.now() - startTime;
        return result;
      }

      // Validate the graph
      const validation = this.validateDependencyGraph();
      if (!validation.isValid) {
        validation.errors.forEach((error) => {
          if (error.severity === 'error') {
            result.conflicts.push({
              extensionId: 'unknown',
              constraints: [],
              reason: error.message,
            });
          }
        });
        result.resolutionTime = Date.now() - startTime;
        return result;
      }

      // Check for version conflicts
      const conflicts = this.detectVersionConflicts();
      if (conflicts.length > 0) {
        result.conflicts = conflicts;
        result.resolutionTime = Date.now() - startTime;
        return result;
      }

      // Topologically sort for installation order
      const installationOrder = this.topologicalSort();
      if (!installationOrder) {
        result.resolutionTime = Date.now() - startTime;
        return result;
      }

      // Prepare result
      result.success = true;
      result.extensions = Array.from(this.dependencyGraph.values());
      result.installationOrder = installationOrder;
      result.resolutionTime = Date.now() - startTime;

      return result;
    } catch (error) {
      result.unresolvedDependencies.push({
        dependant: extensionId,
        dependency: 'unknown',
        reason: `Error during resolution: ${error instanceof Error ? error.message : String(error)}`,
      });
      result.resolutionTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Detects circular dependencies in the graph
   * Uses depth-first search (DFS) to find cycles
   */
  private detectCircularDependencies(): Cycle[] {
    const cycles: Cycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];

    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      pathStack.push(nodeId);

      // Find all dependencies of this node
      const dependencies = this.edges
        .filter((edge) => edge.from === nodeId)
        .map((edge) => edge.to);

      for (const depId of dependencies) {
        if (!visited.has(depId)) {
          dfs(depId);
        } else if (recursionStack.has(depId)) {
          // Found a cycle
          const cycleStartIndex = pathStack.indexOf(depId);
          const cyclePath = pathStack.slice(cycleStartIndex).concat([depId]);
          const isTransitive = cyclePath.length > 2;

          cycles.push({
            path: cyclePath,
            isTransitive,
            description: `Circular dependency: ${cyclePath.join(' → ')}`,
          });
        }
      }

      pathStack.pop();
      recursionStack.delete(nodeId);
    };

    // Start DFS from all nodes
    for (const nodeId of this.dependencyGraph.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }

  /**
   * Builds the dependency graph recursively
   */
  private async buildDependencyGraph(
    extensionId: string,
    version: string,
    visited: Set<string>
  ): Promise<void> {
    const nodeKey = `${extensionId}@${version}`;

    // Prevent infinite recursion
    if (visited.has(nodeKey)) {
      return;
    }
    visited.add(nodeKey);

    // Fetch manifest
    const manifest = await this.fetchExtensionManifest(extensionId, version);
    if (!manifest) {
      return;
    }

    // Create node
    const node: ExtensionNode = {
      id: extensionId,
      version,
      apiVersion: manifest.apiVersion || '1.0.0',
      dependencies: new Map(),
      optional: new Set(),
      manifest,
    };

    // Parse dependencies
    const dependencies = manifest.dependencies || {};
    const optionalDependencies = manifest.optionalDependencies || {};

    for (const [depId, constraint] of Object.entries(dependencies)) {
      const versionConstraint = this.parseVersionConstraint(
        constraint as string
      );
      node.dependencies.set(depId, versionConstraint);

      // Resolve the dependency version
      const resolvedVersion = await this.findCompatibleVersion(
        depId,
        versionConstraint
      );
      if (resolvedVersion) {
        this.edges.push({
          from: extensionId,
          to: depId,
          version: versionConstraint,
          optional: false,
        });

        // Recursively build graph for this dependency
        await this.buildDependencyGraph(depId, resolvedVersion, visited);
      }
    }

    for (const [depId, constraint] of Object.entries(optionalDependencies)) {
      const versionConstraint = this.parseVersionConstraint(
        constraint as string
      );
      node.optional.add(depId);
      node.dependencies.set(depId, versionConstraint);

      // Try to resolve optional dependency
      const resolvedVersion = await this.findCompatibleVersion(
        depId,
        versionConstraint
      );
      if (resolvedVersion) {
        this.edges.push({
          from: extensionId,
          to: depId,
          version: versionConstraint,
          optional: true,
        });

        await this.buildDependencyGraph(depId, resolvedVersion, visited);
      }
    }

    this.dependencyGraph.set(extensionId, node);
  }

  /**
   * Parses a version constraint string into structured format
   */
  private parseVersionConstraint(constraint: string): VersionConstraint {
    const constraint_str = constraint.trim();

    if (constraint_str.startsWith('^')) {
      const version = constraint_str.substring(1);
      const parsed = semver.parse(version);
      return {
        raw: constraint_str,
        type: 'caret',
        major: parsed?.major,
        minor: parsed?.minor,
        patch: parsed?.patch,
      };
    }

    if (constraint_str.startsWith('~')) {
      const version = constraint_str.substring(1);
      const parsed = semver.parse(version);
      return {
        raw: constraint_str,
        type: 'tilde',
        major: parsed?.major,
        minor: parsed?.minor,
        patch: parsed?.patch,
      };
    }

    if (
      constraint_str.includes('>=') ||
      constraint_str.includes('<=') ||
      constraint_str.includes('>')
    ) {
      return {
        raw: constraint_str,
        type: 'range',
      };
    }

    const parsed = semver.parse(constraint_str);
    return {
      raw: constraint_str,
      type: 'exact',
      major: parsed?.major,
      minor: parsed?.minor,
      patch: parsed?.patch,
    };
  }

  /**
   * Finds a compatible version for a given constraint
   */
  private async findCompatibleVersion(
    extensionId: string,
    constraint: VersionConstraint
  ): Promise<string | null> {
    // Check cache first
    const cacheKey = `${extensionId}@${constraint.raw}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      return cached?.isCompatible ? cached.resolvedVersion : null;
    }

    // Fetch all available versions
    const versions = await this.fetchAvailableVersions(extensionId);
    if (versions.length === 0) {
      return null;
    }

    // Find matching version
    let bestMatch: string | null = null;

    for (const version of versions.sort(semver.rcompare)) {
      if (this.isVersionCompatible(version, constraint)) {
        bestMatch = version;
        break;
      }
    }

    // Cache result
    this.cache.set(cacheKey, {
      extensionId,
      resolvedVersion: bestMatch || '',
      constraint,
      candidates: versions,
      isCompatible: bestMatch !== null,
    });

    return bestMatch;
  }

  /**
   * Checks if a version matches a constraint
   */
  private isVersionCompatible(
    version: string,
    constraint: VersionConstraint
  ): boolean {
    try {
      switch (constraint.type) {
        case 'exact':
          return version === constraint.raw;

        case 'caret': {
          const base = `${constraint.major}.${constraint.minor}.${constraint.patch}`;
          return semver.satisfies(
            version,
            `>=${base} <${(constraint.major || 0) + 1}.0.0`
          );
        }

        case 'tilde': {
          const base = `${constraint.major}.${constraint.minor}.${constraint.patch}`;
          return semver.satisfies(
            version,
            `>=${base} <${constraint.major}.${(constraint.minor || 0) + 1}.0`
          );
        }

        case 'range':
          return semver.satisfies(version, constraint.raw);

        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Validates the dependency graph structure
   */
  validateDependencyGraph(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Check for isolated nodes
    for (const [nodeId, node] of this.dependencyGraph.entries()) {
      if (node.dependencies.size === 0) {
        result.warnings.push(
          `Extension ${nodeId} has no dependencies (may be intended)`
        );
      }
    }

    // Check for missing dependencies
    for (const edge of this.edges) {
      if (!this.dependencyGraph.has(edge.to)) {
        result.isValid = false;
        result.errors.push({
          type: 'missing_dependency',
          message: `Dependency ${edge.to} required by ${edge.from} is not available`,
          severity: 'error',
        });
      }
    }

    return result;
  }

  /**
   * Detects version conflicts in the graph
   */
  private detectVersionConflicts(): Array<{
    extensionId: string;
    constraints: VersionConstraint[];
    reason: string;
  }> {
    const conflicts: Array<{
      extensionId: string;
      constraints: VersionConstraint[];
      reason: string;
    }> = [];
    const versionRequirements = new Map<string, VersionConstraint[]>();

    // Collect all version requirements for each extension
    for (const edge of this.edges) {
      const key = edge.to;
      if (!versionRequirements.has(key)) {
        versionRequirements.set(key, []);
      }
      versionRequirements.get(key)!.push(edge.version);
    }

    // Check for conflicting constraints
    for (const [extensionId, constraints] of versionRequirements.entries()) {
      if (constraints.length > 1) {
        // Check if all constraints can be satisfied simultaneously
        const canBeSatisfied = this.canConstraintsBeSatisfied(constraints);
        if (!canBeSatisfied) {
          conflicts.push({
            extensionId,
            constraints,
            reason: `Version constraints conflict: ${constraints.map((c) => c.raw).join(', ')}`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Checks if multiple version constraints can be satisfied
   */
  private canConstraintsBeSatisfied(constraints: VersionConstraint[]): boolean {
    if (constraints.length === 0) return true;
    if (constraints.length === 1) return true;

    try {
      // For simplicity, check if ranges overlap
      // This is a simplified check - a full implementation would use range intersection
      for (let i = 0; i < constraints.length - 1; i++) {
        for (let j = i + 1; j < constraints.length; j++) {
          const range1 = constraints[i].raw;
          const range2 = constraints[j].raw;

          // Create a test version that satisfies both
          const testVersions = [
            '1.0.0',
            '2.0.0',
            '3.0.0',
            '0.1.0',
            '1.1.0',
            '1.0.1',
          ];
          let foundMatch = false;

          for (const testVersion of testVersions) {
            if (
              semver.satisfies(testVersion, range1) &&
              semver.satisfies(testVersion, range2)
            ) {
              foundMatch = true;
              break;
            }
          }

          if (!foundMatch) {
            return false;
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Topologically sorts extensions for installation order
   * Ensures all dependencies are installed before dependents
   */
  private topologicalSort(): string[] | null {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (nodeId: string): boolean => {
      if (visited.has(nodeId)) {
        return true;
      }

      if (visiting.has(nodeId)) {
        // Cycle detected (should have been caught earlier)
        return false;
      }

      visiting.add(nodeId);

      // Visit all dependencies first
      const dependencies = this.edges
        .filter((edge) => edge.from === nodeId)
        .map((edge) => edge.to);

      for (const depId of dependencies) {
        if (!visit(depId)) {
          return false;
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      sorted.push(nodeId);

      return true;
    };

    // Visit all nodes
    for (const nodeId of this.dependencyGraph.keys()) {
      if (!visit(nodeId)) {
        return null;
      }
    }

    return sorted;
  }

  /**
   * Installs an extension and all its dependencies in correct order
   * Rolls back all changes if any installation fails
   */
  async installDependencyChain(
    extensionId: string,
    version: string
  ): Promise<InstallationResult> {
    const result: InstallationResult = {
      success: false,
      installed: [],
      rolledBack: [],
      timestamp: new Date(),
    };

    try {
      // Resolve dependencies first
      const resolution = await this.resolveDependencies(extensionId, version);

      if (!resolution.success || resolution.cycles.length > 0) {
        result.error =
          resolution.cycles.length > 0
            ? `Circular dependencies detected: ${resolution.cycles.map((c) => c.description).join('; ')}`
            : 'Dependency resolution failed';
        return result;
      }

      // Install in order
      const toInstall = resolution.installationOrder;

      for (const extId of toInstall) {
        const node = this.dependencyGraph.get(extId);
        if (!node) continue;

        try {
          await this.installExtension(extId, node.version);
          result.installed.push(extId);
        } catch (error) {
          // Installation failed, rollback
          result.error = `Installation failed for ${extId}: ${error instanceof Error ? error.message : String(error)}`;
          result.failed = [extId];

          // Rollback all installed extensions
          for (const installed of result.installed) {
            try {
              await this.uninstallExtension(installed);
              result.rolledBack.push(installed);
            } catch (rollbackError) {
              // Log but continue rollback
            }
          }

          return result;
        }
      }

      result.success = true;
      return result;
    } catch (error) {
      result.error = `Installation error: ${error instanceof Error ? error.message : String(error)}`;
      return result;
    }
  }

  /**
   * Suggests alternative extensions for resolving conflicts
   */
  async suggestAlternatives(
    extensionId: string,
    conflictingConstraints: VersionConstraint[]
  ): Promise<Alternative[]> {
    const alternatives: Alternative[] = [];

    try {
      // Get all available versions
      const versions = await this.fetchAvailableVersions(extensionId);

      for (const version of versions.sort(semver.rcompare).slice(0, 5)) {
        // Calculate compatibility score
        let matchCount = 0;

        for (const constraint of conflictingConstraints) {
          if (this.isVersionCompatible(version, constraint)) {
            matchCount++;
          }
        }

        const compatibility = Math.round(
          (matchCount / conflictingConstraints.length) * 100
        );

        alternatives.push({
          extensionId,
          version,
          compatibility,
          reason: `Compatible with ${matchCount}/${conflictingConstraints.length} constraints`,
        });
      }
    } catch (error) {
      // Return empty alternatives on error
    }

    return alternatives.sort((a, b) => b.compatibility - a.compatibility);
  }

  /**
   * Fetches extension manifest from database
   */
  private async fetchExtensionManifest(
    extensionId: string,
    version: string
  ): Promise<Record<string, any> | null> {
    try {
      const extension = await prisma.extension.findFirst({
        where: {
          id: extensionId,
          version,
        },
      });

      return extension?.manifest as Record<string, any> | null;
    } catch {
      return null;
    }
  }

  /**
   * Fetches all available versions for an extension
   */
  private async fetchAvailableVersions(extensionId: string): Promise<string[]> {
    try {
      const extensions = await prisma.extension.findMany({
        where: {
          id: extensionId,
        },
        select: {
          version: true,
        },
      });

      return extensions
        .map((e) => e.version)
        .filter((v) => semver.valid(v) !== null);
    } catch {
      return [];
    }
  }

  /**
   * Installs a single extension (helper method)
   */
  private async installExtension(
    extensionId: string,
    version: string
  ): Promise<void> {
    // This would typically call PluginSystemService.installPlugin()
    // For now, just record in database
    const extension = await prisma.extension.findFirst({
      where: {
        id: extensionId,
        version,
      },
    });

    if (!extension) {
      throw new Error(`Extension ${extensionId}@${version} not found`);
    }

    // Update installation status in database
    await prisma.extension.update({
      where: {
        id: extension.id,
      },
      data: {
        installed: true,
        installedAt: new Date(),
      },
    });
  }

  /**
   * Uninstalls a single extension (helper method for rollback)
   */
  private async uninstallExtension(extensionId: string): Promise<void> {
    const extension = await prisma.extension.findFirst({
      where: {
        id: extensionId,
      },
    });

    if (extension) {
      await prisma.extension.update({
        where: {
          id: extension.id,
        },
        data: {
          installed: false,
          installedAt: null,
        },
      });
    }
  }
}

// Export singleton instance
export const dependencyResolverService = new DependencyResolverService();
