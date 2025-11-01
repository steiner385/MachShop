/**
 * Extension Conflict Detection Engine
 * Comprehensive conflict detection identifying potential issues beyond dependency/compatibility checks.
 * Detects hook conflicts, resource collisions, schema conflicts, and suggests mitigation strategies.
 *
 * Issue #409 Implementation
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import { ExtensionManifest } from '../packages/extension-sdk/src/manifest.types';
import {
  CompatibilityContext,
  ConflictDetail,
  InstalledExtensionInfo,
} from '../types/extensionCompatibility';

/**
 * Conflict Type Classification
 */
export enum ConflictType {
  HOOK_CONFLICT = 'hook',
  ROUTE_COLLISION = 'route',
  ENTITY_COLLISION = 'entity',
  SCHEMA_CONFLICT = 'schema',
  PERMISSION_CONFLICT = 'permission',
  RESOURCE_CONFLICT = 'resource',
  DATA_MUTATION_CONFLICT = 'data_mutation',
  EXECUTION_TIMEOUT = 'execution_timeout',
  MANIFEST_DECLARED = 'manifest_declared',
  TRANSITIVE_DEPENDENCY = 'transitive_dependency',
}

/**
 * Conflict Severity Level
 */
export enum ConflictSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Detailed Conflict Description
 */
export interface ConflictReport {
  type: ConflictType;
  severity: ConflictSeverity;
  sourceExtensionId: string;
  sourceVersion: string;
  conflictingExtensionId?: string;
  conflictingVersion?: string;
  conflictItem?: string; // e.g., route path, entity name, hook name
  message: string;
  detailedDescription: string;
  affectedResources?: string[]; // e.g., specific routes, entities, fields
  resolutionStrategies: ResolutionStrategy[];
  documentation?: string;
  testingRecommendations: string[];
  timestamp: Date;
}

/**
 * Resolution Strategy for a Conflict
 */
export interface ResolutionStrategy {
  name: string;
  description: string;
  implementation: 'automatic' | 'manual' | 'requires_review';
  steps: string[];
  riskLevel: 'low' | 'medium' | 'high';
  estimatedEffort?: string;
  sideEffects?: string[];
}

/**
 * Pre-Installation Validation Result
 */
export interface ConflictDetectionResult {
  sourceExtensionId: string;
  sourceVersion: string;
  canInstall: boolean; // false if any error-level conflicts
  conflicts: ConflictReport[];
  warnings: ConflictReport[];
  infos: ConflictReport[];
  summaryByType: {
    hookConflicts: number;
    routeCollisions: number;
    entityCollisions: number;
    schemaConflicts: number;
    permissionConflicts: number;
    resourceConflicts: number;
    dataMutationConflicts: number;
    executionTimeoutRisks: number;
    manifestDeclaredConflicts: number;
    transitiveDependencies: number;
  };
  dependencyGraph?: DependencyGraphNode[];
  analysisTime: number; // milliseconds
  timestamp: Date;
}

/**
 * Dependency Graph Node for visualization
 */
export interface DependencyGraphNode {
  extensionId: string;
  version: string;
  status: 'installed' | 'candidate' | 'conflicting';
  dependencies: {
    extensionId: string;
    version: string;
    type: 'requires' | 'optional' | 'conflicts';
  }[];
}

/**
 * Hook Conflict Details
 */
export interface HookConflictDetail {
  hookName: string;
  hookType: string;
  conflictingExtensions: {
    extensionId: string;
    version: string;
    priority?: number;
    blockingOthers?: boolean;
  }[];
  conflictReason: string;
  executionOrderMatter: boolean;
}

/**
 * Extension Conflict Detection Engine
 * Main orchestrator for all conflict detection across extension system
 */
export class ExtensionConflictDetectionEngine {
  private readonly prisma: PrismaClient;
  private readonly logger: Logger;
  private conflictCache: Map<string, ConflictDetectionResult> = new Map();
  private cacheExpireMs = 600000; // 10 minutes

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Detect all conflicts for a new extension being installed
   * @param manifest - Extension manifest
   * @param context - Current environment context with installed extensions
   * @returns Comprehensive conflict detection result
   */
  async detectConflicts(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Promise<ConflictDetectionResult> {
    const startTime = Date.now();
    const cacheKey = `${manifest.id}:${manifest.version}:${JSON.stringify(context.installedExtensions.map((e) => e.extensionId).sort())}`;

    // Check cache
    const cached = this.conflictCache.get(cacheKey);
    if (cached && cached.timestamp.getTime() + this.cacheExpireMs > Date.now()) {
      this.logger.debug(`Using cached conflict detection result for ${cacheKey}`);
      return cached;
    }

    this.logger.info(`Detecting conflicts for ${manifest.id}@${manifest.version}`);

    const conflicts: ConflictReport[] = [];

    // Run all conflict detection checks in parallel
    const [
      hookConflicts,
      routeConflicts,
      entityConflicts,
      schemaConflicts,
      permissionConflicts,
      resourceConflicts,
      dataMutationConflicts,
      executionTimeoutRisks,
      manifestDeclaredConflicts,
      transitiveDependencies,
    ] = await Promise.all([
      this.detectHookConflicts(manifest, context),
      this.detectRouteCollisions(manifest, context),
      this.detectEntityCollisions(manifest, context),
      this.detectSchemaConflicts(manifest, context),
      this.detectPermissionConflicts(manifest, context),
      this.detectResourceConflicts(manifest, context),
      this.detectDataMutationConflicts(manifest, context),
      this.detectExecutionTimeoutRisks(manifest, context),
      this.detectManifestDeclaredConflicts(manifest, context),
      this.detectTransitiveDependencies(manifest, context),
    ]);

    conflicts.push(
      ...hookConflicts,
      ...routeConflicts,
      ...entityConflicts,
      ...schemaConflicts,
      ...permissionConflicts,
      ...resourceConflicts,
      ...dataMutationConflicts,
      ...executionTimeoutRisks,
      ...manifestDeclaredConflicts,
      ...transitiveDependencies
    );

    // Separate by severity
    const errorConflicts = conflicts.filter((c) => c.severity === ConflictSeverity.ERROR);
    const warningConflicts = conflicts.filter((c) => c.severity === ConflictSeverity.WARNING);
    const infoConflicts = conflicts.filter((c) => c.severity === ConflictSeverity.INFO);

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(manifest, context, conflicts);

    const result: ConflictDetectionResult = {
      sourceExtensionId: manifest.id,
      sourceVersion: manifest.version,
      canInstall: errorConflicts.length === 0,
      conflicts: errorConflicts,
      warnings: warningConflicts,
      infos: infoConflicts,
      summaryByType: {
        hookConflicts: hookConflicts.length,
        routeCollisions: routeConflicts.length,
        entityCollisions: entityConflicts.length,
        schemaConflicts: schemaConflicts.length,
        permissionConflicts: permissionConflicts.length,
        resourceConflicts: resourceConflicts.length,
        dataMutationConflicts: dataMutationConflicts.length,
        executionTimeoutRisks: executionTimeoutRisks.length,
        manifestDeclaredConflicts: manifestDeclaredConflicts.length,
        transitiveDependencies: transitiveDependencies.length,
      },
      dependencyGraph,
      analysisTime: Date.now() - startTime,
      timestamp: new Date(),
    };

    // Cache result
    this.conflictCache.set(cacheKey, result);

    // Store in database for audit trail
    await this.storeConflictDetectionAudit(result);

    this.logger.info(
      `Conflict detection completed for ${manifest.id}@${manifest.version} in ${result.analysisTime}ms: ${errorConflicts.length} errors, ${warningConflicts.length} warnings`
    );

    return result;
  }

  /**
   * Detect hook conflicts
   * Analyzes hook handler registrations for conflicts
   */
  private async detectHookConflicts(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Promise<ConflictReport[]> {
    const conflicts: ConflictReport[] = [];

    if (!manifest.hooks || manifest.hooks.length === 0) {
      return conflicts;
    }

    for (const hook of manifest.hooks) {
      // Find all extensions that register the same hook
      const conflictingExtensions = context.installedExtensions.filter((ext) => ext.hooked.includes(hook.name));

      if (conflictingExtensions.length > 0) {
        // Check for blocking hooks
        const blockingExtensions = conflictingExtensions.filter((ext) => {
          // Query database for hook blocking configuration
          return false; // TODO: Implement blocking check from database
        });

        if (blockingExtensions.length > 0) {
          conflicts.push({
            type: ConflictType.HOOK_CONFLICT,
            severity: ConflictSeverity.ERROR,
            sourceExtensionId: manifest.id,
            sourceVersion: manifest.version,
            conflictingExtensionId: blockingExtensions[0].extensionId,
            conflictingVersion: blockingExtensions[0].version,
            conflictItem: hook.name,
            message: `Hook "${hook.name}" conflict with blocking extension`,
            detailedDescription: `Extension ${manifest.id}@${manifest.version} registers hook "${hook.name}" which is also registered by ${blockingExtensions[0].extensionId}@${blockingExtensions[0].version} with blocking enabled. Blocking hooks prevent other handlers from executing.`,
            affectedResources: [hook.name],
            resolutionStrategies: [
              {
                name: 'Adjust Hook Priority',
                description: 'Modify hook priority to ensure proper execution order',
                implementation: 'manual',
                steps: [
                  'Review hook priorities in both extensions',
                  'Adjust priority values to establish safe execution order',
                  'Document interdependencies between hooks',
                ],
                riskLevel: 'medium',
                sideEffects: [
                  'Execution order change may affect business logic',
                  'Hook side effects may execute in different sequence',
                ],
              },
              {
                name: 'Disable Blocking Behavior',
                description: 'Allow non-blocking hook execution for both extensions',
                implementation: 'manual',
                steps: [
                  'Contact blocking extension maintainers',
                  'Request configuration to disable blocking behavior',
                  'Test both extensions with blocking disabled',
                ],
                riskLevel: 'high',
                sideEffects: [
                  'May reduce blocking extension functionality',
                  'Requires manual coordination with other extension teams',
                ],
              },
            ],
            testingRecommendations: [
              'Test hook execution order with both extensions active',
              'Verify hook side effects are applied correctly',
              'Test data integrity with concurrent hook execution',
              'Load test with realistic hook invocation patterns',
            ],
            timestamp: new Date(),
          });
        }

        // Check for multiple mutations to same field
        if (hook.mutations && hook.mutations.length > 0) {
          for (const mutation of hook.mutations) {
            const otherMutations = conflictingExtensions.flatMap((ext) => {
              // TODO: Get other extension mutations from database
              return [];
            });

            if (otherMutations.length > 0) {
              conflicts.push({
                type: ConflictType.HOOK_CONFLICT,
                severity: ConflictSeverity.WARNING,
                sourceExtensionId: manifest.id,
                sourceVersion: manifest.version,
                conflictItem: `${hook.name} -> ${mutation}`,
                message: `Hook mutation conflict on "${mutation}"`,
                detailedDescription: `Multiple extensions modify the same field "${mutation}" through hook "${hook.name}". Execution order matters for data consistency.`,
                resolutionStrategies: [
                  {
                    name: 'Document Mutation Order',
                    description: 'Document the required execution order for safe mutations',
                    implementation: 'manual',
                    steps: [
                      'Identify all extensions mutating this field',
                      'Determine safe execution order based on data dependencies',
                      'Document mutation sequence in hook configuration',
                    ],
                    riskLevel: 'medium',
                  },
                  {
                    name: 'Separate Concerns',
                    description: 'Refactor hooks to mutate different fields or use intermediate fields',
                    implementation: 'manual',
                    steps: [
                      'Analyze field dependencies',
                      'Design alternative field schemas',
                      'Refactor hooks to use new schema',
                    ],
                    riskLevel: 'high',
                    estimatedEffort: 'medium',
                  },
                ],
                testingRecommendations: [
                  'Test data consistency with concurrent mutations',
                  'Verify final field values are correct after all hooks',
                  'Test rollback scenarios',
                ],
              });
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect route collision conflicts
   */
  private async detectRouteCollisions(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Promise<ConflictReport[]> {
    const conflicts: ConflictReport[] = [];

    if (!manifest.routes || manifest.routes.length === 0) {
      return conflicts;
    }

    for (const route of manifest.routes) {
      const routeKey = `${route.method}:${route.path}`;

      // Check for exact match with installed extensions
      for (const installedExt of context.installedExtensions) {
        for (const installedRoute of installedExt.registeredRoutes) {
          if (installedRoute === routeKey) {
            conflicts.push({
              type: ConflictType.ROUTE_COLLISION,
              severity: ConflictSeverity.ERROR,
              sourceExtensionId: manifest.id,
              sourceVersion: manifest.version,
              conflictingExtensionId: installedExt.extensionId,
              conflictingVersion: installedExt.version,
              conflictItem: routeKey,
              message: `Route collision: ${routeKey}`,
              detailedDescription: `Extension ${manifest.id}@${manifest.version} attempts to register route "${routeKey}" which is already registered by ${installedExt.extensionId}@${installedExt.version}. Route paths must be unique across all extensions.`,
              affectedResources: [routeKey],
              resolutionStrategies: [
                {
                  name: 'Use Namespace Prefix',
                  description: 'Add a unique namespace prefix to the route path',
                  implementation: 'automatic',
                  steps: [
                    `Modify route path from "${route.path}" to "/extensions/${manifest.id}${route.path}"`,
                    'Update all route references in extension code',
                    'Update API documentation',
                  ],
                  riskLevel: 'low',
                  sideEffects: ['Route path changes may break existing clients using the route'],
                },
                {
                  name: 'Route Delegation',
                  description: 'Have one extension delegate to the other through middleware',
                  implementation: 'manual',
                  steps: [
                    'Contact other extension team',
                    'Agree on delegation strategy',
                    'Implement middleware for request routing',
                  ],
                  riskLevel: 'high',
                  estimatedEffort: 'high',
                },
                {
                  name: 'Uninstall Conflicting Extension',
                  description: 'Remove the conflicting extension and reinstall after this one',
                  implementation: 'manual',
                  steps: [
                    `Uninstall ${installedExt.extensionId}@${installedExt.version}`,
                    `Install ${manifest.id}@${manifest.version}`,
                    `Reinstall ${installedExt.extensionId} with updated configuration`,
                  ],
                  riskLevel: 'medium',
                  sideEffects: ['Temporary loss of conflicting extension functionality'],
                },
              ],
              testingRecommendations: [
                'Verify route registration succeeds',
                'Test route invocation returns correct response',
                'Test with concurrent requests to the route',
                'Verify no request routing errors',
              ],
            });
          }
        }
      }

      // Check for pattern overlap (e.g., /api/users and /api/users/:id)
      for (const installedExt of context.installedExtensions) {
        for (const installedRoute of installedExt.registeredRoutes) {
          if (this.routesOverlap(routeKey, installedRoute)) {
            conflicts.push({
              type: ConflictType.ROUTE_COLLISION,
              severity: ConflictSeverity.WARNING,
              sourceExtensionId: manifest.id,
              sourceVersion: manifest.version,
              conflictingExtensionId: installedExt.extensionId,
              conflictingVersion: installedExt.version,
              conflictItem: `${routeKey} overlaps with ${installedRoute}`,
              message: `Route pattern overlap: ${routeKey} <-> ${installedRoute}`,
              detailedDescription: `Route patterns may overlap causing unexpected request routing. Route "${routeKey}" from ${manifest.id}@${manifest.version} overlaps with "${installedRoute}" from ${installedExt.extensionId}@${installedExt.version}.`,
              resolutionStrategies: [
                {
                  name: 'Clarify Route Patterns',
                  description: 'Make route patterns more specific to avoid overlap',
                  implementation: 'manual',
                  steps: [
                    'Review both route patterns',
                    'Determine which should have priority',
                    'Refine patterns to be more specific',
                  ],
                  riskLevel: 'medium',
                },
              ],
              testingRecommendations: [
                'Test request routing with overlapping patterns',
                'Verify correct extension handler receives requests',
                'Test edge cases in route matching',
              ],
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect entity/table name collision conflicts
   */
  private async detectEntityCollisions(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Promise<ConflictReport[]> {
    const conflicts: ConflictReport[] = [];

    if (!manifest.dataSchema || !manifest.dataSchema.customEntities) {
      return conflicts;
    }

    for (const entity of manifest.dataSchema.customEntities) {
      // Check for exact name match with installed extensions
      for (const installedExt of context.installedExtensions) {
        for (const customEntity of installedExt.customEntities) {
          if (customEntity === entity.name) {
            conflicts.push({
              type: ConflictType.ENTITY_COLLISION,
              severity: ConflictSeverity.ERROR,
              sourceExtensionId: manifest.id,
              sourceVersion: manifest.version,
              conflictingExtensionId: installedExt.extensionId,
              conflictingVersion: installedExt.version,
              conflictItem: entity.name,
              message: `Entity name collision: ${entity.name}`,
              detailedDescription: `Extension ${manifest.id}@${manifest.version} attempts to create entity "${entity.name}" which already exists in ${installedExt.extensionId}@${installedExt.version}. Entity/table names must be unique across all extensions.`,
              affectedResources: [entity.name],
              resolutionStrategies: [
                {
                  name: 'Rename Entity with Prefix',
                  description: 'Rename the entity to include extension namespace prefix',
                  implementation: 'automatic',
                  steps: [
                    `Rename entity from "${entity.name}" to "${manifest.id}_${entity.name}"`,
                    'Update all database queries referencing the entity',
                    'Update schema migrations',
                    'Update ORM model definitions',
                  ],
                  riskLevel: 'medium',
                  sideEffects: [
                    'Database migrations required',
                    'Existing data may need migration',
                    'API changes for entity access',
                  ],
                },
                {
                  name: 'Merge Entities',
                  description: 'Merge duplicate entities into a single shared entity',
                  implementation: 'manual',
                  steps: [
                    'Contact other extension maintainers',
                    'Design merged entity schema',
                    'Migrate data from both entities',
                    'Update both extensions to use merged entity',
                  ],
                  riskLevel: 'high',
                  estimatedEffort: 'high',
                },
              ],
              testingRecommendations: [
                'Verify entity creation succeeds',
                'Test entity persistence and retrieval',
                'Verify data integrity after migration',
                'Test concurrent access to entity',
              ],
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect schema migration conflicts
   */
  private async detectSchemaConflicts(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Promise<ConflictReport[]> {
    const conflicts: ConflictReport[] = [];

    // Query database for schema migrations from other extensions
    const otherMigrations = await this.prisma.extensionSchemaMigration.findMany({
      where: {
        extensionId: {
          not: manifest.id,
        },
        // Filter to only installed extensions
        extensionId: {
          in: context.installedExtensions.map((e) => e.extensionId),
        },
      },
    });

    if (!manifest.dataSchema || !manifest.dataSchema.customEntities) {
      return conflicts;
    }

    for (const entity of manifest.dataSchema.customEntities) {
      // Check if other extensions modify the same table
      for (const migration of otherMigrations) {
        if (migration.affectedTables?.includes(entity.name)) {
          conflicts.push({
            type: ConflictType.SCHEMA_CONFLICT,
            severity: ConflictSeverity.WARNING,
            sourceExtensionId: manifest.id,
            sourceVersion: manifest.version,
            conflictingExtensionId: migration.extensionId,
            conflictItem: entity.name,
            message: `Schema migration conflict on table "${entity.name}"`,
            detailedDescription: `Multiple extensions modify the same database table "${entity.name}". Extension ${manifest.id}@${manifest.version} and ${migration.extensionId} both have migrations for this table. Schema migration order and compatibility is critical.`,
            affectedResources: [entity.name],
            resolutionStrategies: [
              {
                name: 'Define Migration Sequence',
                description: 'Explicitly define safe schema migration execution order',
                implementation: 'manual',
                steps: [
                  'Identify all extensions with migrations for this table',
                  'Review migration changes in each extension',
                  'Determine safe execution sequence',
                  'Configure explicit migration ordering',
                ],
                riskLevel: 'medium',
                sideEffects: ['Different installation orders may produce different results'],
              },
              {
                name: 'Separate Concerns',
                description: 'Split table modifications across separate tables',
                implementation: 'manual',
                steps: [
                  'Design new table schema to avoid conflicts',
                  'Create foreign key relationships',
                  'Migrate existing data',
                  'Update application code',
                ],
                riskLevel: 'high',
                estimatedEffort: 'high',
              },
            ],
            testingRecommendations: [
              'Test schema migrations execute in correct order',
              'Verify final schema is correct regardless of installation order',
              'Test data integrity after migrations',
              'Test rollback scenarios',
            ],
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect permission/RBAC conflicts
   */
  private async detectPermissionConflicts(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Promise<ConflictReport[]> {
    const conflicts: ConflictReport[] = [];

    if (!manifest.permissions || manifest.permissions.length === 0) {
      return conflicts;
    }

    // Query database for permission definitions from other extensions
    const otherPermissions = await this.prisma.extensionPermission.findMany({
      where: {
        extensionId: {
          not: manifest.id,
        },
        extensionId: {
          in: context.installedExtensions.map((e) => e.extensionId),
        },
      },
    });

    for (const permission of manifest.permissions) {
      // Check for same resource with different permissions
      for (const otherPerm of otherPermissions) {
        if (otherPerm.resource === permission.resource && otherPerm.action !== permission.action) {
          conflicts.push({
            type: ConflictType.PERMISSION_CONFLICT,
            severity: ConflictSeverity.WARNING,
            sourceExtensionId: manifest.id,
            sourceVersion: manifest.version,
            conflictingExtensionId: otherPerm.extensionId,
            conflictItem: `${permission.resource}:${permission.action}`,
            message: `Permission conflict on resource "${permission.resource}"`,
            detailedDescription: `Extensions define different permissions for the same resource. ${manifest.id}@${manifest.version} grants "${permission.action}" on "${permission.resource}" while ${otherPerm.extensionId} grants "${otherPerm.action}". Permission precedence rules will determine access.`,
            resolutionStrategies: [
              {
                name: 'Document Permission Hierarchy',
                description: 'Document how permission conflicts should be resolved',
                implementation: 'manual',
                steps: [
                  'Document permission hierarchy and precedence rules',
                  'Specify default behavior when permissions conflict',
                  'Update access control policy',
                ],
                riskLevel: 'low',
              },
              {
                name: 'Align Permission Definitions',
                description: 'Contact other extensions to align permission definitions',
                implementation: 'manual',
                steps: [
                  'Contact other extension maintainers',
                  'Discuss permission requirements',
                  'Align permission definitions',
                ],
                riskLevel: 'medium',
                estimatedEffort: 'medium',
              },
            ],
            testingRecommendations: [
              'Test permission evaluation with conflicting rules',
              'Verify access control decisions are consistent',
              'Test role-based access control with multiple extensions',
            ],
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect resource conflicts (memory, CPU, API rate limits)
   */
  private async detectResourceConflicts(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Promise<ConflictReport[]> {
    const conflicts: ConflictReport[] = [];

    if (!manifest.resources) {
      return conflicts;
    }

    // Calculate total resource requirements
    let totalMemory = manifest.resources.memoryMB || 0;
    let totalCpuCores = manifest.resources.cpuCores || 0;
    let totalApiRateLimit = manifest.resources.apiRateLimitPerMinute || 0;

    // Add installed extension resources
    for (const installed of context.installedExtensions) {
      // TODO: Query database for resource requirements
      // totalMemory += installedManifest.resources?.memoryMB || 0;
      // totalCpuCores += installedManifest.resources?.cpuCores || 0;
      // totalApiRateLimit += installedManifest.resources?.apiRateLimitPerMinute || 0;
    }

    // Define resource limits (these should be configurable)
    const maxMemoryMB = 4096;
    const maxCpuCores = 4;
    const maxApiRateLimit = 10000;

    if (totalMemory > maxMemoryMB) {
      conflicts.push({
        type: ConflictType.RESOURCE_CONFLICT,
        severity: ConflictSeverity.WARNING,
        sourceExtensionId: manifest.id,
        sourceVersion: manifest.version,
        message: `Memory resource limit exceeded`,
        detailedDescription: `Total memory requirement (${totalMemory}MB) exceeds system limit (${maxMemoryMB}MB). Extensions consuming excessive memory may cause system instability.`,
        resolutionStrategies: [
          {
            name: 'Reduce Memory Usage',
            description: 'Optimize extension code to reduce memory consumption',
            implementation: 'manual',
            steps: [
              'Profile extension memory usage',
              'Identify memory optimization opportunities',
              'Refactor code to reduce memory footprint',
              'Re-test memory usage',
            ],
            riskLevel: 'high',
            estimatedEffort: 'high',
          },
          {
            name: 'Disable Non-Essential Extensions',
            description: 'Disable less critical extensions to free memory',
            implementation: 'manual',
            steps: [
              'Identify extensions that can be temporarily disabled',
              'Disable less critical extensions',
              'Install this extension',
              'Re-enable disabled extensions later if possible',
            ],
            riskLevel: 'medium',
            sideEffects: ['Loss of functionality from disabled extensions'],
          },
        ],
        testingRecommendations: [
          'Monitor memory usage during extension initialization',
          'Test memory usage under load',
          'Verify no memory leaks over extended runtime',
        ],
      });
    }

    if (totalCpuCores > maxCpuCores) {
      conflicts.push({
        type: ConflictType.RESOURCE_CONFLICT,
        severity: ConflictSeverity.WARNING,
        sourceExtensionId: manifest.id,
        sourceVersion: manifest.version,
        message: `CPU resource limit exceeded`,
        detailedDescription: `Total CPU requirement (${totalCpuCores} cores) exceeds system limit (${maxCpuCores} cores). Extensions consuming excessive CPU may degrade system performance.`,
        resolutionStrategies: [
          {
            name: 'Optimize CPU Usage',
            description: 'Optimize extension code to reduce CPU consumption',
            implementation: 'manual',
            steps: [
              'Profile extension CPU usage',
              'Identify CPU optimization opportunities',
              'Refactor algorithms for efficiency',
              'Consider asynchronous operations',
            ],
            riskLevel: 'high',
            estimatedEffort: 'high',
          },
        ],
        testingRecommendations: [
          'Profile CPU usage with realistic workloads',
          'Test performance with other extensions active',
          'Verify CPU usage scales appropriately with load',
        ],
      });
    }

    if (totalApiRateLimit > maxApiRateLimit) {
      conflicts.push({
        type: ConflictType.RESOURCE_CONFLICT,
        severity: ConflictSeverity.INFO,
        sourceExtensionId: manifest.id,
        sourceVersion: manifest.version,
        message: `API rate limit may be exceeded`,
        detailedDescription: `Total API rate limit requirement (${totalApiRateLimit} req/min) exceeds recommended limit (${maxApiRateLimit} req/min). Extensions making excessive API calls may experience rate limiting.`,
        resolutionStrategies: [
          {
            name: 'Implement Caching',
            description: 'Add caching to reduce API call frequency',
            implementation: 'manual',
            steps: [
              'Identify frequently accessed API endpoints',
              'Implement caching layer',
              'Set appropriate cache TTLs',
              'Monitor cache hit rates',
            ],
            riskLevel: 'low',
            estimatedEffort: 'medium',
          },
          {
            name: 'Batch API Requests',
            description: 'Combine multiple API requests into single batch calls',
            implementation: 'manual',
            steps: [
              'Identify opportunities for request batching',
              'Refactor API calls to use batch endpoints',
              'Test batched requests',
            ],
            riskLevel: 'low',
            estimatedEffort: 'medium',
          },
        ],
        testingRecommendations: [
          'Monitor API call frequency',
          'Test with realistic data volumes',
          'Verify rate limiting behavior',
        ],
      });
    }

    return conflicts;
  }

  /**
   * Detect data mutation conflicts
   */
  private async detectDataMutationConflicts(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Promise<ConflictReport[]> {
    const conflicts: ConflictReport[] = [];

    if (!manifest.dataSchema || !manifest.dataSchema.customEntities) {
      return conflicts;
    }

    // Check if multiple extensions modify the same fields
    for (const entity of manifest.dataSchema.customEntities) {
      if (!entity.fields) continue;

      for (const field of entity.fields) {
        // Query database for other extensions modifying the same field
        const otherMutations = await this.prisma.extensionDataMutation.findMany({
          where: {
            entity: entity.name,
            fieldName: field.name,
            extensionId: {
              not: manifest.id,
              in: context.installedExtensions.map((e) => e.extensionId),
            },
          },
        });

        if (otherMutations.length > 0) {
          conflicts.push({
            type: ConflictType.DATA_MUTATION_CONFLICT,
            severity: ConflictSeverity.WARNING,
            sourceExtensionId: manifest.id,
            sourceVersion: manifest.version,
            conflictItem: `${entity.name}.${field.name}`,
            message: `Multiple extensions mutate field "${entity.name}.${field.name}"`,
            detailedDescription: `Extensions ${[manifest.id, ...otherMutations.map((m) => m.extensionId)].join(', ')} all modify the same field. Data consistency depends on mutation order.`,
            affectedResources: [`${entity.name}.${field.name}`],
            resolutionStrategies: [
              {
                name: 'Explicit Mutation Ordering',
                description: 'Define explicit order for field mutations',
                implementation: 'manual',
                steps: [
                  'Identify all extensions mutating this field',
                  'Determine safe mutation order',
                  'Document mutation sequence',
                  'Configure extension execution order',
                ],
                riskLevel: 'medium',
              },
              {
                name: 'Use Intermediate Fields',
                description: 'Use intermediate fields to avoid direct conflicts',
                implementation: 'manual',
                steps: [
                  'Design intermediate field schema',
                  'Refactor mutations to use intermediate fields',
                  'Aggregate intermediate values to final field',
                  'Test data consistency',
                ],
                riskLevel: 'medium',
                estimatedEffort: 'medium',
              },
            ],
            testingRecommendations: [
              'Test data consistency with multiple mutations',
              'Verify final field values are correct',
              'Test rollback scenarios',
              'Test with concurrent data updates',
            ],
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect execution timeout risks
   */
  private async detectExecutionTimeoutRisks(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Promise<ConflictReport[]> {
    const conflicts: ConflictReport[] = [];

    if (!manifest.hooks || manifest.hooks.length === 0) {
      return conflicts;
    }

    // Check hooks for timeout configurations
    for (const hook of manifest.hooks) {
      const timeout = hook.timeout || 5000; // Default 5 seconds

      if (timeout > 10000) {
        conflicts.push({
          type: ConflictType.EXECUTION_TIMEOUT,
          severity: ConflictSeverity.WARNING,
          sourceExtensionId: manifest.id,
          sourceVersion: manifest.version,
          conflictItem: hook.name,
          message: `Long-running hook "${hook.name}" may cause timeout cascades`,
          detailedDescription: `Hook "${hook.name}" has a timeout of ${timeout}ms. Long-running hooks may cause upstream operations to timeout, potentially causing cascading failures in dependent business logic.`,
          resolutionStrategies: [
            {
              name: 'Optimize Hook Performance',
              description: 'Optimize hook implementation to execute faster',
              implementation: 'manual',
              steps: [
                'Profile hook execution time',
                'Identify performance bottlenecks',
                'Optimize slow operations',
                'Consider async/background processing',
              ],
              riskLevel: 'medium',
              estimatedEffort: 'medium',
            },
            {
              name: 'Move to Background Job',
              description: 'Move long-running logic to background job queue',
              implementation: 'manual',
              steps: [
                'Identify long-running operations',
                'Refactor to enqueue background jobs',
                'Implement job processing',
                'Update hook to return immediately',
              ],
              riskLevel: 'medium',
              estimatedEffort: 'high',
            },
          ],
          testingRecommendations: [
            'Measure hook execution time under load',
            'Test timeout behavior with slow operations',
            'Verify error handling for timeouts',
            'Test cascading effects of hook timeouts',
          ],
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect manifest-declared conflicts
   */
  private async detectManifestDeclaredConflicts(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Promise<ConflictReport[]> {
    const conflicts: ConflictReport[] = [];

    if (!manifest.conflicts || manifest.conflicts.length === 0) {
      return conflicts;
    }

    for (const declaredConflict of manifest.conflicts) {
      // Check if conflicting extension is installed
      const conflictingExt = context.installedExtensions.find(
        (e) => e.extensionId === declaredConflict.extensionId
      );

      if (conflictingExt) {
        conflicts.push({
          type: ConflictType.MANIFEST_DECLARED,
          severity: ConflictSeverity.ERROR,
          sourceExtensionId: manifest.id,
          sourceVersion: manifest.version,
          conflictingExtensionId: declaredConflict.extensionId,
          conflictingVersion: conflictingExt.version,
          message: `Manifest declared conflict with ${declaredConflict.extensionId}`,
          detailedDescription: `Extension ${manifest.id}@${manifest.version} declares incompatibility with ${declaredConflict.extensionId}. Reason: ${declaredConflict.reason}`,
          resolutionStrategies: [
            {
              name: 'Uninstall Conflicting Extension',
              description: 'Uninstall the conflicting extension',
              implementation: 'manual',
              steps: [
                `Uninstall ${declaredConflict.extensionId}@${conflictingExt.version}`,
                `Install ${manifest.id}@${manifest.version}`,
              ],
              riskLevel: 'medium',
              sideEffects: [`Loss of ${declaredConflict.extensionId} functionality`],
            },
            {
              name: 'Use Alternative Extension',
              description: 'Use an alternative extension that provides similar functionality',
              implementation: 'manual',
              steps: [
                `Identify alternatives to ${declaredConflict.extensionId}`,
                'Evaluate alternatives for feature parity',
                'Uninstall conflicting extension',
                'Install alternative extension',
              ],
              riskLevel: 'high',
              estimatedEffort: 'high',
            },
          ],
          testingRecommendations: [
            'Verify installation succeeds after uninstall',
            'Test all functionality of both extensions independently',
          ],
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect transitive dependency conflicts
   * Checks for conflicts in extension dependency chains
   */
  private async detectTransitiveDependencies(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Promise<ConflictReport[]> {
    const conflicts: ConflictReport[] = [];

    if (!manifest.dependencies || manifest.dependencies.length === 0) {
      return conflicts;
    }

    // Build dependency graph
    const depGraph = this.buildFullDependencyGraph(manifest, context);

    // Check for dependency conflicts
    for (const dep of manifest.dependencies) {
      const depExtension = context.installedExtensions.find((e) => e.extensionId === dep.extensionId);

      if (depExtension) {
        // Check version compatibility
        const versionMatch = this.versionSatisfies(depExtension.version, dep.versionRange || '*');
        if (!versionMatch) {
          conflicts.push({
            type: ConflictType.TRANSITIVE_DEPENDENCY,
            severity: ConflictSeverity.ERROR,
            sourceExtensionId: manifest.id,
            sourceVersion: manifest.version,
            conflictingExtensionId: dep.extensionId,
            conflictingVersion: depExtension.version,
            message: `Dependency version conflict: ${dep.extensionId}`,
            detailedDescription: `Extension ${manifest.id}@${manifest.version} requires ${dep.extensionId}${dep.versionRange ? `@${dep.versionRange}` : ''}. Installed version is ${depExtension.version}.`,
            resolutionStrategies: [
              {
                name: 'Update Dependency Extension',
                description: 'Update the dependency extension to a compatible version',
                implementation: 'manual',
                steps: [
                  `Locate compatible version of ${dep.extensionId} matching ${dep.versionRange}`,
                  `Update ${dep.extensionId} to compatible version`,
                  'Re-test this extension after dependency update',
                ],
                riskLevel: 'medium',
                sideEffects: ['Dependency update may introduce breaking changes'],
              },
              {
                name: 'Relax Version Constraint',
                description: 'Update this extension to accept current dependency version',
                implementation: 'manual',
                steps: [
                  'Test compatibility with current dependency version',
                  `Update dependency constraint from ${dep.versionRange} to allow ${depExtension.version}`,
                  'Run full test suite',
                ],
                riskLevel: 'high',
                estimatedEffort: 'medium',
                sideEffects: ['May accept incompatible versions if not careful'],
              },
            ],
            testingRecommendations: [
              'Test with updated dependency version',
              'Verify all transitive dependencies are satisfied',
              'Test compatibility between dependent extensions',
            ],
          });
        }
      } else if (!dep.optional) {
        // Required dependency not installed
        conflicts.push({
          type: ConflictType.TRANSITIVE_DEPENDENCY,
          severity: ConflictSeverity.ERROR,
          sourceExtensionId: manifest.id,
          sourceVersion: manifest.version,
          conflictingExtensionId: dep.extensionId,
          message: `Required dependency not installed: ${dep.extensionId}`,
          detailedDescription: `Extension ${manifest.id}@${manifest.version} requires ${dep.extensionId}${dep.versionRange ? `@${dep.versionRange}` : ''} to be installed, but it is not currently available.`,
          resolutionStrategies: [
            {
              name: 'Install Missing Dependency',
              description: 'Install the required dependency extension',
              implementation: 'automatic',
              steps: [
                `Install ${dep.extensionId}${dep.versionRange ? `@${dep.versionRange}` : ''}`,
                'Verify installation completes successfully',
                'Test dependency functionality',
              ],
              riskLevel: 'low',
            },
          ],
          testingRecommendations: [
            'Verify dependency installation succeeds',
            'Test dependency-dependent functionality',
          ],
        });
      }
    }

    return conflicts;
  }

  /**
   * Build dependency graph for visualization
   */
  private buildDependencyGraph(
    manifest: ExtensionManifest,
    context: CompatibilityContext,
    conflicts: ConflictReport[]
  ): DependencyGraphNode[] {
    const nodes: Map<string, DependencyGraphNode> = new Map();

    // Add candidate (being installed) extension
    nodes.set(manifest.id, {
      extensionId: manifest.id,
      version: manifest.version,
      status: 'candidate',
      dependencies: (manifest.dependencies || []).map((dep) => ({
        extensionId: dep.extensionId,
        version: dep.versionRange || '*',
        type: dep.optional ? 'optional' : 'requires',
      })),
    });

    // Add installed extensions
    for (const installed of context.installedExtensions) {
      const isConflicting = conflicts.some(
        (c) =>
          (c.sourceExtensionId === manifest.id && c.conflictingExtensionId === installed.extensionId) ||
          (c.sourceExtensionId === installed.extensionId && c.conflictingExtensionId === manifest.id)
      );

      nodes.set(installed.extensionId, {
        extensionId: installed.extensionId,
        version: installed.version,
        status: isConflicting ? 'conflicting' : 'installed',
        dependencies: [], // TODO: Query from database
      });
    }

    return Array.from(nodes.values());
  }

  /**
   * Build full dependency graph for analysis
   */
  private buildFullDependencyGraph(
    manifest: ExtensionManifest,
    context: CompatibilityContext
  ): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    graph.set(manifest.id, (manifest.dependencies || []).map((d) => d.extensionId));

    for (const installed of context.installedExtensions) {
      // TODO: Query dependencies from database
      graph.set(installed.extensionId, []);
    }

    return graph;
  }

  /**
   * Check if two routes overlap in pattern matching
   */
  private routesOverlap(route1: string, route2: string): boolean {
    // Simple pattern matching - can be enhanced
    const pattern1 = route1.split(':')[1]?.split('/') || [];
    const pattern2 = route2.split(':')[1]?.split('/') || [];

    if (pattern1.length !== pattern2.length) return false;

    for (let i = 0; i < pattern1.length; i++) {
      const seg1 = pattern1[i];
      const seg2 = pattern2[i];

      // Both are static segments and different
      if (!seg1.startsWith('{') && !seg2.startsWith('{') && seg1 !== seg2) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a version satisfies a version range
   */
  private versionSatisfies(version: string, range: string): boolean {
    // Simple semver checking - can use semver library for production
    if (range === '*') return true;

    const parts = version.split('.');
    const rangeParts = range.split('.');

    for (let i = 0; i < Math.min(parts.length, rangeParts.length); i++) {
      const part = parseInt(parts[i], 10);
      const rangePart = parseInt(rangeParts[i], 10);

      if (isNaN(part) || isNaN(rangePart)) {
        return true; // Assume compatible if can't parse
      }

      if (part > rangePart) return true;
      if (part < rangePart) return false;
    }

    return true;
  }

  /**
   * Store conflict detection audit trail in database
   */
  private async storeConflictDetectionAudit(result: ConflictDetectionResult): Promise<void> {
    try {
      // TODO: Implement database storage for audit trail
      // This would store the conflict detection result for future reference
      this.logger.debug(`Storing conflict detection audit for ${result.sourceExtensionId}`);
    } catch (error) {
      this.logger.error('Failed to store conflict detection audit:', error);
      // Don't fail the detection process if audit fails
    }
  }

  /**
   * Clear cache for testing purposes
   */
  clearCache(): void {
    this.conflictCache.clear();
    this.logger.debug('Conflict detection cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.conflictCache.size,
      keys: Array.from(this.conflictCache.keys()),
    };
  }
}
