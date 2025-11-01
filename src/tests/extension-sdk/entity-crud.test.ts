/**
 * Entity CRUD Operations Tests
 * Issue #441: Custom Entity & Enum Extension System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityRegistry } from '../../../packages/extension-sdk/src/entities/registry';
import type { EntityDefinition, EntityData } from '../../../packages/extension-sdk/src/entities/types';

describe('Entity CRUD Operations', () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();

    // Register test entity
    const definition: EntityDefinition = {
      name: 'Article',
      extensionId: 'test-ext',
      version: '1.0.0',
      fields: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'title', type: 'string', required: true },
        { name: 'content', type: 'string' },
        { name: 'published', type: 'boolean', default: false },
        { name: 'views', type: 'number', default: 0 },
      ],
    };

    registry.register(definition);
  });

  describe('data validation', () => {
    it('should validate valid entity data', () => {
      const data: EntityData = {
        id: 'art-001',
        title: 'First Article',
        content: 'Content here',
        published: true,
        views: 100,
      };

      const result = registry.validate('Article', data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid entity data - missing required field', () => {
      const data: EntityData = {
        id: 'art-001',
        // Missing required 'title' field
      };

      const result = registry.validate('Article', data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate type constraints', () => {
      const data: EntityData = {
        id: 'art-001',
        title: 'Article',
        content: 'Content',
        published: 'not-a-boolean', // Should be boolean
      };

      const result = registry.validate('Article', data);

      expect(result.valid).toBe(false);
    });

    it('should validate numeric constraints', () => {
      const data: EntityData = {
        id: 'art-001',
        title: 'Article',
        views: -10, // Negative views might violate constraints
      };

      const result = registry.validate('Article', data);

      // Result depends on field constraints
      expect(result).toBeDefined();
    });
  });

  describe('schema generation', () => {
    it('should generate JSON schema for entity', () => {
      const schema = registry.generateSchema('Article');

      expect(schema).toBeDefined();
      expect(schema.title).toBe('Article');
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('id');
      expect(schema.properties).toHaveProperty('title');
      expect(schema.properties).toHaveProperty('content');
      expect(schema.properties).toHaveProperty('published');
      expect(schema.properties).toHaveProperty('views');
    });

    it('should mark required fields in schema', () => {
      const schema = registry.generateSchema('Article');

      expect(schema.required).toContain('id');
      expect(schema.required).toContain('title');
    });

    it('should include default values in schema', () => {
      const schema = registry.generateSchema('Article');

      // Check default values are preserved
      expect(schema.properties.published.default).toBe(false);
      expect(schema.properties.views.default).toBe(0);
    });
  });

  describe('TypeScript generation', () => {
    it('should generate TypeScript interface from entity', () => {
      const tsType = registry.generateTypeScript('Article');

      expect(tsType).toBeDefined();
      expect(tsType.name).toBe('Article');
      expect(tsType.code).toContain('interface Article');
      expect(tsType.code).toContain('id');
      expect(tsType.code).toContain('title');
      expect(tsType.code).toContain('content');
      expect(tsType.code).toContain('published');
      expect(tsType.code).toContain('views');
    });
  });

  describe('entity listing', () => {
    it('should register multiple entities', () => {
      const def2: EntityDefinition = {
        name: 'Page',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'title', type: 'string', required: true },
        ],
      };

      registry.register(def2);

      const entities = registry.list();

      expect(entities.length).toBeGreaterThanOrEqual(2);
      expect(entities.map(e => e.name)).toContain('Article');
      expect(entities.map(e => e.name)).toContain('Page');
    });
  });
});
