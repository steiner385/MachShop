/**
 * Dependency Resolution System
 *
 * Resolves extension dependencies and detects conflicts.
 */

import type { DependencyResolutionResult, DependencyConflict } from './types';
import { VersionManager } from './version';

/**
 * Dependency Resolver
 *
 * Handles:
 * - Dependency resolution for extension installation
 * - Conflict detection
 * - Version constraint validation
 * - Dependency tree building
 */
export class DependencyResolver {
  private versionManager: VersionManager;
  private resolvedDependencies: Map<string, string> = new Map();

  constructor() {
    this.versionManager = new VersionManager();
  }

  /**
   * Resolve dependencies for an extension
   */
  async resolve(dependencies: Record<string, string>): Promise<DependencyResolutionResult> {
    const conflicts: DependencyConflict[] = [];
    this.resolvedDependencies.clear();

    try {
      for (const [extensionId, versionConstraint] of Object.entries(dependencies)) {
        const resolution = await this.resolveDependency(extensionId, versionConstraint);

        if (!resolution.resolved) {
          conflicts.push({
            extension1: extensionId,
            extension2: 'system',
            version1: versionConstraint,
            version2: 'N/A',
            conflictReason: `Cannot resolve dependency: ${extensionId}@${versionConstraint}`,
          });
        } else {
          this.resolvedDependencies.set(extensionId, resolution.version);
        }
      }

      // Check for conflicts between dependencies
      const pairConflicts = this.checkDependencyConflicts(dependencies);
      conflicts.push(...pairConflicts);

      return {
        resolvable: conflicts.length === 0,
        conflicts,
        suggestedResolution: conflicts.length === 0 ? Array.from(this.resolvedDependencies.values()) : undefined,
      };
    } catch (error) {
      return {
        resolvable: false,
        conflicts: [
          {
            extension1: 'unknown',
            extension2: 'unknown',
            version1: 'unknown',
            version2: 'unknown',
            conflictReason: `Resolution failed: ${String(error)}`,
          },
        ],
      };
    }
  }

  /**
   * Resolve a single dependency
   */
  private async resolveDependency(
    extensionId: string,
    versionConstraint: string
  ): Promise<{ resolved: boolean; version?: string }> {
    // This would typically query a registry for available versions
    // For now, we'll assume the constraint itself is a valid version

    const isValid = this.versionManager.isValidVersion(versionConstraint) ||
      this.versionManager.satisfiesRange('1.0.0', versionConstraint);

    return {
      resolved: isValid,
      version: versionConstraint,
    };
  }

  /**
   * Check for conflicts between dependencies
   */
  private checkDependencyConflicts(dependencies: Record<string, string>): DependencyConflict[] {
    const conflicts: DependencyConflict[] = [];
    const extensionIds = Object.keys(dependencies);

    for (let i = 0; i < extensionIds.length; i++) {
      for (let j = i + 1; j < extensionIds.length; j++) {
        const ext1 = extensionIds[i];
        const ext2 = extensionIds[j];
        const v1 = dependencies[ext1];
        const v2 = dependencies[ext2];

        // Check if there's a known conflict between these extensions
        if (this.hasKnownConflict(ext1, ext2)) {
          conflicts.push({
            extension1: ext1,
            extension2: ext2,
            version1: v1,
            version2: v2,
            conflictReason: `Known conflict between ${ext1} and ${ext2}`,
            suggestedAction: `Use alternative extension or update to compatible versions`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if there's a known conflict between two extensions
   */
  private hasKnownConflict(ext1: string, ext2: string): boolean {
    // This would be maintained as a conflict database
    // For now, return false to indicate no known conflicts
    return false;
  }

  /**
   * Build dependency tree
   */
  buildDependencyTree(
    extensionId: string,
    dependencies: Record<string, Record<string, string>>
  ): DependencyTreeNode {
    const node: DependencyTreeNode = {
      extensionId,
      version: 'unknown',
      dependencies: [],
      depth: 0,
    };

    const visited = new Set<string>();

    const buildNode = (id: string, depth: number) => {
      if (visited.has(id) || depth > 10) {
        return; // Prevent infinite recursion and circular dependencies
      }

      visited.add(id);

      const deps = dependencies[id];
      if (deps) {
        for (const [depId, depVersion] of Object.entries(deps)) {
          const depNode: DependencyTreeNode = {
            extensionId: depId,
            version: depVersion,
            dependencies: [],
            depth: depth + 1,
          };

          node.dependencies.push(depNode);
          buildNode(depId, depth + 1);
        }
      }
    };

    buildNode(extensionId, 0);

    return node;
  }

  /**
   * Get circular dependencies
   */
  getCircularDependencies(dependencies: Record<string, Record<string, string>>): string[][] {
    const circles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const deps = dependencies[node];
      if (deps) {
        for (const depId of Object.keys(deps)) {
          if (!visited.has(depId)) {
            dfs(depId, [...path]);
          } else if (recursionStack.has(depId)) {
            // Found a cycle
            const cycleStart = path.indexOf(depId);
            if (cycleStart !== -1) {
              circles.push([...path.slice(cycleStart), depId]);
            }
          }
        }
      }

      recursionStack.delete(node);
    };

    for (const extensionId of Object.keys(dependencies)) {
      if (!visited.has(extensionId)) {
        dfs(extensionId, []);
      }
    }

    return circles;
  }

  /**
   * Get dependents (extensions that depend on a given extension)
   */
  getDependents(extensionId: string, dependencies: Record<string, Record<string, string>>): string[] {
    const dependents: string[] = [];

    for (const [depId, deps] of Object.entries(dependencies)) {
      if (deps[extensionId]) {
        dependents.push(depId);
      }
    }

    return dependents;
  }

  /**
   * Check if removing an extension would break dependencies
   */
  canRemoveExtension(extensionId: string, dependencies: Record<string, Record<string, string>>): boolean {
    const dependents = this.getDependents(extensionId, dependencies);
    return dependents.length === 0;
  }
}

/**
 * Dependency tree node
 */
interface DependencyTreeNode {
  extensionId: string;
  version: string;
  dependencies: DependencyTreeNode[];
  depth: number;
}
