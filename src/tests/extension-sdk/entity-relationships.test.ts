/**
 * Entity Relationships Tests
 * Issue #441: Custom Entity & Enum Extension System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityRegistry } from '../../../packages/extension-sdk/src/entities/registry';
import type { EntityDefinition, EntityRelationship } from '../../../packages/extension-sdk/src/entities/types';

describe('Entity Relationships', () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();

    // Register entities with relationships
    const authorDef: EntityDefinition = {
      name: 'Author',
      extensionId: 'test-ext',
      version: '1.0.0',
      fields: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string' },
      ],
    };

    const postDef: EntityDefinition = {
      name: 'Post',
      extensionId: 'test-ext',
      version: '1.0.0',
      fields: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'title', type: 'string', required: true },
        { name: 'content', type: 'string' },
        { name: 'authorId', type: 'string', required: true },
      ],
      relationships: [
        {
          name: 'author',
          type: 'one-to-many',
          targetEntity: 'Author',
          foreignKey: 'authorId',
        },
      ],
    };

    registry.register(authorDef);
    registry.register(postDef);
  });

  describe('relationship definition', () => {
    it('should retrieve entity definition with relationships', () => {
      const entity = registry.get('Post');

      expect(entity).toBeDefined();
      expect(entity?.relationships).toBeDefined();
      expect(entity?.relationships).toHaveLength(1);
      expect(entity?.relationships?.[0].name).toBe('author');
    });

    it('should preserve relationship type', () => {
      const entity = registry.get('Post');
      const relationship = entity?.relationships?.[0];

      expect(relationship?.type).toBe('one-to-many');
      expect(relationship?.targetEntity).toBe('Author');
      expect(relationship?.foreignKey).toBe('authorId');
    });

    it('should support multiple relationships', () => {
      const commentDef: EntityDefinition = {
        name: 'Comment',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'text', type: 'string', required: true },
          { name: 'postId', type: 'string', required: true },
          { name: 'authorId', type: 'string', required: true },
        ],
        relationships: [
          {
            name: 'post',
            type: 'one-to-many',
            targetEntity: 'Post',
            foreignKey: 'postId',
          },
          {
            name: 'author',
            type: 'one-to-many',
            targetEntity: 'Author',
            foreignKey: 'authorId',
          },
        ],
      };

      registry.register(commentDef);

      const entity = registry.get('Comment');
      expect(entity?.relationships).toHaveLength(2);
    });
  });

  describe('relationship types', () => {
    it('should support one-to-many relationships', () => {
      const entity = registry.get('Post');
      const rel = entity?.relationships?.[0];

      expect(rel?.type).toBe('one-to-many');
    });

    it('should support one-to-one relationships', () => {
      const userDef: EntityDefinition = {
        name: 'User',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'email', type: 'string', required: true },
        ],
      };

      const profileDef: EntityDefinition = {
        name: 'UserProfile',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'bio', type: 'string' },
          { name: 'userId', type: 'string', unique: true, required: true },
        ],
        relationships: [
          {
            name: 'user',
            type: 'one-to-one',
            targetEntity: 'User',
            foreignKey: 'userId',
          },
        ],
      };

      registry.register(userDef);
      registry.register(profileDef);

      const entity = registry.get('UserProfile');
      const rel = entity?.relationships?.[0];

      expect(rel?.type).toBe('one-to-one');
    });

    it('should support many-to-many relationships with join table', () => {
      const tagDef: EntityDefinition = {
        name: 'Tag',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'name', type: 'string', required: true },
        ],
      };

      const postWithTagsDef: EntityDefinition = {
        name: 'PostWithTags',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'title', type: 'string', required: true },
        ],
        relationships: [
          {
            name: 'tags',
            type: 'many-to-many',
            targetEntity: 'Tag',
            joinTable: 'PostTags',
          },
        ],
      };

      registry.register(tagDef);
      registry.register(postWithTagsDef);

      const entity = registry.get('PostWithTags');
      const rel = entity?.relationships?.[0];

      expect(rel?.type).toBe('many-to-many');
      expect(rel?.joinTable).toBe('PostTags');
    });
  });

  describe('relationship field mapping', () => {
    it('should map foreign key fields correctly', () => {
      const entity = registry.get('Post');
      const rel = entity?.relationships?.[0];

      expect(rel?.foreignKey).toBe('authorId');

      // Verify the field exists in entity
      const authorIdField = entity?.fields.find(f => f.name === 'authorId');
      expect(authorIdField).toBeDefined();
      expect(authorIdField?.type).toBe('string');
    });

    it('should support optional foreign keys', () => {
      const optionalRelDef: EntityDefinition = {
        name: 'OptionalRel',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'parentId', type: 'string', required: false }, // Optional FK
        ],
        relationships: [
          {
            name: 'parent',
            type: 'one-to-many',
            targetEntity: 'Author',
            foreignKey: 'parentId',
          },
        ],
      };

      registry.register(optionalRelDef);

      const entity = registry.get('OptionalRel');
      const parentIdField = entity?.fields.find(f => f.name === 'parentId');

      expect(parentIdField?.required).toBe(false);
    });
  });

  describe('relationship schema generation', () => {
    it('should include relationships in generated schema', () => {
      const schema = registry.generateSchema('Post');

      expect(schema).toBeDefined();
      expect(schema.properties).toHaveProperty('authorId');
    });

    it('should generate TypeScript with relationship types', () => {
      const tsType = registry.generateTypeScript('Post');

      expect(tsType.code).toContain('Post');
      expect(tsType.code).toContain('authorId');
    });
  });

  describe('relationship constraints', () => {
    it('should allow registration even with unresolved relationships', () => {
      // Note: Some implementations allow forward references for relationships
      const forwardRefDef: EntityDefinition = {
        name: 'ForwardRef',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'refId', type: 'string' },
        ],
        relationships: [
          {
            name: 'ref',
            type: 'one-to-many',
            targetEntity: 'FutureEntity',
            foreignKey: 'refId',
          },
        ],
      };

      // Should register and allow later validation
      registry.register(forwardRefDef);
      const entity = registry.get('ForwardRef');
      expect(entity).toBeDefined();
      expect(entity?.relationships).toHaveLength(1);
    });
  });
});
