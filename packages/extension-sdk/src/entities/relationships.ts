/**
 * Entity Relationship Management
 * Issue #441: Custom Entity & Enum Extension System
 */

import type { EntityRelationship, EntityDefinition } from './types';
import { EntityError, EntityNotFoundError } from './types';
import { entityRegistry } from './registry';

/**
 * Relationship configuration
 */
export interface RelationshipConfig {
  sourceEntity: string;
  targetEntity: string;
  relationshipName: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  foreignKey?: string;
  joinTable?: string;
}

/**
 * Relationship resolver
 */
export interface RelationshipResolver {
  resolve(sourceId: string, relationshipName: string): Promise<any>;
  resolveMany(sourceIds: string[], relationshipName: string): Promise<Map<string, any>>;
}

/**
 * Entity Relationship Manager
 */
export class EntityRelationshipManager {
  private relationships: Map<string, EntityRelationship[]> = new Map();
  private joinTables: Map<string, string[][]> = new Map(); // For many-to-many
  private resolvers: Map<string, RelationshipResolver> = new Map();

  /**
   * Register a relationship
   */
  registerRelationship(config: RelationshipConfig): void {
    const sourceEntity = entityRegistry.get(config.sourceEntity);
    if (!sourceEntity) {
      throw new EntityNotFoundError(config.sourceEntity);
    }

    const targetEntity = entityRegistry.get(config.targetEntity);
    if (!targetEntity) {
      throw new EntityNotFoundError(config.targetEntity);
    }

    // Create relationship definition
    const relationship: EntityRelationship = {
      name: config.relationshipName,
      type: config.type,
      targetEntity: config.targetEntity,
      foreignKey: config.foreignKey || `${config.sourceEntity.toLowerCase()}Id`,
      joinTable: config.joinTable,
    };

    // Store relationship
    if (!this.relationships.has(config.sourceEntity)) {
      this.relationships.set(config.sourceEntity, []);
    }
    this.relationships.get(config.sourceEntity)!.push(relationship);

    // Initialize join table for many-to-many
    if (config.type === 'many-to-many' && config.joinTable) {
      if (!this.joinTables.has(config.joinTable)) {
        this.joinTables.set(config.joinTable, []);
      }
    }
  }

  /**
   * Get relationships for an entity
   */
  getRelationships(entityName: string): EntityRelationship[] {
    return this.relationships.get(entityName) || [];
  }

  /**
   * Get specific relationship
   */
  getRelationship(entityName: string, relationshipName: string): EntityRelationship | undefined {
    const rels = this.relationships.get(entityName) || [];
    return rels.find((r) => r.name === relationshipName);
  }

  /**
   * Add relationship data (for many-to-many)
   */
  addRelationshipData(joinTable: string, sourceId: string, targetId: string): void {
    if (!this.joinTables.has(joinTable)) {
      this.joinTables.set(joinTable, []);
    }

    const table = this.joinTables.get(joinTable)!;
    if (!table.some((row) => row[0] === sourceId && row[1] === targetId)) {
      table.push([sourceId, targetId]);
    }
  }

  /**
   * Remove relationship data (for many-to-many)
   */
  removeRelationshipData(joinTable: string, sourceId: string, targetId: string): void {
    const table = this.joinTables.get(joinTable);
    if (table) {
      const idx = table.findIndex((row) => row[0] === sourceId && row[1] === targetId);
      if (idx > -1) {
        table.splice(idx, 1);
      }
    }
  }

  /**
   * Get relationship data (for many-to-many)
   */
  getRelationshipData(joinTable: string, sourceId: string): string[] {
    const table = this.joinTables.get(joinTable);
    if (!table) {
      return [];
    }

    return table.filter((row) => row[0] === sourceId).map((row) => row[1]);
  }

  /**
   * Register custom relationship resolver
   */
  registerResolver(relationshipKey: string, resolver: RelationshipResolver): void {
    this.resolvers.set(relationshipKey, resolver);
  }

  /**
   * Get custom resolver
   */
  getResolver(relationshipKey: string): RelationshipResolver | undefined {
    return this.resolvers.get(relationshipKey);
  }

  /**
   * Resolve relationship data
   */
  async resolveRelationship(
    sourceEntity: string,
    sourceId: string,
    relationshipName: string
  ): Promise<any> {
    const relationship = this.getRelationship(sourceEntity, relationshipName);
    if (!relationship) {
      throw new EntityError(
        `Relationship ${relationshipName} not found on ${sourceEntity}`,
        'RELATIONSHIP_NOT_FOUND'
      );
    }

    const resolverKey = `${sourceEntity}.${relationshipName}`;
    const resolver = this.getResolver(resolverKey);

    if (resolver) {
      return resolver.resolve(sourceId, relationshipName);
    }

    // Default resolution based on relationship type
    switch (relationship.type) {
      case 'one-to-one':
        return this.resolveOneToOne(sourceId, relationship);
      case 'one-to-many':
        return this.resolveOneToMany(sourceId, relationship);
      case 'many-to-many':
        return this.resolveManyToMany(sourceId, relationship);
      default:
        throw new EntityError(`Unknown relationship type: ${relationship.type}`, 'INVALID_RELATIONSHIP');
    }
  }

  /**
   * Resolve one-to-one relationship
   */
  private async resolveOneToOne(sourceId: string, relationship: EntityRelationship): Promise<any> {
    // In a real implementation, would query the database
    // For now, return mock data
    return null;
  }

  /**
   * Resolve one-to-many relationship
   */
  private async resolveOneToMany(sourceId: string, relationship: EntityRelationship): Promise<any[]> {
    // In a real implementation, would query the database
    // For now, return empty array
    return [];
  }

  /**
   * Resolve many-to-many relationship
   */
  private async resolveManyToMany(sourceId: string, relationship: EntityRelationship): Promise<any[]> {
    if (!relationship.joinTable) {
      throw new EntityError('Join table not configured for many-to-many relationship', 'INVALID_RELATIONSHIP');
    }

    const targetIds = this.getRelationshipData(relationship.joinTable, sourceId);

    // In a real implementation, would fetch target entities
    // For now, return IDs
    return targetIds;
  }

  /**
   * Clear all relationships
   */
  clear(): void {
    this.relationships.clear();
    this.joinTables.clear();
    this.resolvers.clear();
  }

  /**
   * Get all join table data
   */
  getJoinTableData(joinTable: string): string[][] {
    return this.joinTables.get(joinTable) || [];
  }
}

/**
 * Global relationship manager
 */
export const relationshipManager = new EntityRelationshipManager();

/**
 * Query builder for relationships
 */
export class RelationshipQueryBuilder {
  private includes: string[] = [];
  private maxDepth: number = 2;
  private currentDepth: number = 0;

  /**
   * Include a relationship in the result
   */
  include(relationshipName: string): this {
    if (this.currentDepth < this.maxDepth) {
      this.includes.push(relationshipName);
    }
    return this;
  }

  /**
   * Include multiple relationships
   */
  includeMany(...names: string[]): this {
    for (const name of names) {
      this.include(name);
    }
    return this;
  }

  /**
   * Set maximum relationship depth
   */
  depth(maxDepth: number): this {
    this.maxDepth = maxDepth;
    return this;
  }

  /**
   * Build the includes array
   */
  build(): string[] {
    return this.includes;
  }

  /**
   * Get includes as object for query
   */
  toObject(): Record<string, boolean> {
    return this.includes.reduce(
      (acc, name) => {
        acc[name] = true;
        return acc;
      },
      {} as Record<string, boolean>
    );
  }

  /**
   * Check if relationship is included
   */
  isIncluded(relationshipName: string): boolean {
    return this.includes.includes(relationshipName);
  }

  /**
   * Clear includes
   */
  clear(): this {
    this.includes = [];
    return this;
  }
}

/**
 * Circular relationship detector
 */
export class CircularRelationshipDetector {
  /**
   * Check if a circular relationship exists
   */
  detectCircularRelationship(
    entityName: string,
    visitedChain: string[] = [],
    maxDepth: number = 10
  ): string[] | null {
    if (visitedChain.includes(entityName)) {
      // Found a cycle
      return [...visitedChain.slice(visitedChain.indexOf(entityName)), entityName];
    }

    if (visitedChain.length >= maxDepth) {
      return null; // Max depth reached without finding a cycle
    }

    const relationships = relationshipManager.getRelationships(entityName);
    const newChain = [...visitedChain, entityName];

    for (const rel of relationships) {
      const cycle = this.detectCircularRelationship(rel.targetEntity, newChain, maxDepth);
      if (cycle) {
        return cycle;
      }
    }

    return null;
  }

  /**
   * Check all entities for circular relationships
   */
  detectAllCircularRelationships(): string[][] {
    const cycles: string[][] = [];
    const checked = new Set<string>();

    for (const entity of entityRegistry.list()) {
      if (!checked.has(entity.name)) {
        const cycle = this.detectCircularRelationship(entity.name);
        if (cycle) {
          cycles.push(cycle);
          // Mark all entities in the cycle as checked
          cycle.forEach((e) => checked.add(e));
        }
      }
    }

    return cycles;
  }

  /**
   * Validate no circular relationships exist
   */
  validate(): { valid: boolean; cycles: string[][] } {
    const cycles = this.detectAllCircularRelationships();
    return {
      valid: cycles.length === 0,
      cycles,
    };
  }
}

/**
 * Global circular relationship detector
 */
export const circularDetector = new CircularRelationshipDetector();
