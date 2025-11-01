/**
 * Entity & Enum Registry Tests
 * Issue #441: Custom Entity & Enum Extension System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityRegistry } from '../../../packages/extension-sdk/src/entities/registry';
import { EnumRegistry } from '../../../packages/extension-sdk/src/entities/registry';
import type {
  EntityDefinition,
  EnumDefinition,
  EntityData,
  EntityEventType,
} from '../../../packages/extension-sdk/src/entities/types';
import {
  EntityNotFoundError,
  DuplicateEntityError,
  EntityValidationError,
  EntityEventType as EventType,
} from '../../../packages/extension-sdk/src/entities/types';

describe('EntityRegistry', () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();
  });

  describe('entity registration', () => {
    it('should register a custom entity', () => {
      const definition: EntityDefinition = {
        name: 'CustomProduct',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'name', type: 'string', required: true },
          { name: 'price', type: 'number' },
        ],
      };

      registry.register(definition);
      const retrieved = registry.get('CustomProduct');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('CustomProduct');
      expect(retrieved?.extensionId).toBe('test-ext');
      expect(retrieved?.fields).toHaveLength(3);
    });

    it('should generate JSON schema for entity', () => {
      const definition: EntityDefinition = {
        name: 'User',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'email', type: 'string', required: true },
          { name: 'active', type: 'boolean', default: true },
        ],
      };

      registry.register(definition);
      const schema = registry.generateSchema('User');

      expect(schema).toBeDefined();
      expect(schema.title).toBe('User');
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('id');
      expect(schema.properties).toHaveProperty('email');
      expect(schema.properties).toHaveProperty('active');
    });

    it('should prevent duplicate entity registration', () => {
      const definition: EntityDefinition = {
        name: 'Duplicate',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [{ name: 'id', type: 'string' }],
      };

      registry.register(definition);

      expect(() => {
        registry.register(definition);
      }).toThrow(DuplicateEntityError);
    });

    it('should list all registered entities', () => {
      const entity1: EntityDefinition = {
        name: 'Entity1',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [{ name: 'id', type: 'string' }],
      };

      const entity2: EntityDefinition = {
        name: 'Entity2',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [{ name: 'id', type: 'string' }],
      };

      registry.register(entity1);
      registry.register(entity2);

      const entities = registry.list();

      expect(entities).toHaveLength(2);
      expect(entities.map(e => e.name)).toContain('Entity1');
      expect(entities.map(e => e.name)).toContain('Entity2');
    });

    it('should unregister an entity', () => {
      const definition: EntityDefinition = {
        name: 'ToDelete',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [{ name: 'id', type: 'string' }],
      };

      registry.register(definition);
      expect(registry.get('ToDelete')).toBeDefined();

      registry.unregister('ToDelete');
      expect(registry.get('ToDelete')).toBeUndefined();
    });

    it('should throw error when unregistering non-existent entity', () => {
      expect(() => {
        registry.unregister('NonExistent');
      }).toThrow(EntityNotFoundError);
    });
  });

  describe('entity validation', () => {
    beforeEach(() => {
      const definition: EntityDefinition = {
        name: 'Product',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'name', type: 'string', required: true },
          { name: 'price', type: 'number', validation: { min: 0 } },
        ],
      };

      registry.register(definition);
    });

    it('should validate valid entity data', () => {
      const data: EntityData = {
        id: '123',
        name: 'Widget',
        price: 29.99,
      };

      const result = registry.validate('Product', data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const data: EntityData = {
        id: '123',
        // missing required 'name' field
      };

      const result = registry.validate('Product', data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate field types', () => {
      const data: EntityData = {
        id: '123',
        name: 'Widget',
        price: 'not-a-number', // Invalid type
      };

      const result = registry.validate('Product', data);

      expect(result.valid).toBe(false);
    });

    it('should validate numeric constraints', () => {
      const data: EntityData = {
        id: '123',
        name: 'Widget',
        price: -5, // Violates min: 0
      };

      const result = registry.validate('Product', data);

      expect(result.valid).toBe(false);
    });

    it('should throw error validating non-existent entity', () => {
      expect(() => {
        registry.validate('NonExistent', {});
      }).toThrow(EntityNotFoundError);
    });
  });

  describe('TypeScript generation', () => {
    it('should generate TypeScript types for entity', () => {
      const definition: EntityDefinition = {
        name: 'Order',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [
          { name: 'id', type: 'string', required: true, unique: true },
          { name: 'customerId', type: 'string', required: true },
          { name: 'total', type: 'number' },
          { name: 'status', type: 'enum', enumType: 'OrderStatus' },
        ],
      };

      registry.register(definition);
      const tsType = registry.generateTypeScript('Order');

      expect(tsType).toBeDefined();
      expect(tsType.name).toBe('Order');
      expect(tsType.code).toContain('interface Order');
      expect(tsType.code).toContain('id');
      expect(tsType.code).toContain('customerId');
      expect(tsType.code).toContain('total');
    });
  });

  describe('entity events', () => {
    it('should emit event when entity is registered', (done) => {
      const definition: EntityDefinition = {
        name: 'Tracked',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [{ name: 'id', type: 'string' }],
      };

      const unsubscribe = registry.onEntityEvent((event) => {
        expect(event.type).toBe(EventType.REGISTERED);
        expect(event.entityName).toBe('Tracked');
        expect(event.data.version).toBe('1.0.0');
        unsubscribe();
        done();
      });

      registry.register(definition);
    });

    it('should allow multiple event listeners', () => {
      const definition: EntityDefinition = {
        name: 'MultiEvent',
        extensionId: 'test-ext',
        version: '1.0.0',
        fields: [{ name: 'id', type: 'string' }],
      };

      const listener1Events: any[] = [];
      const listener2Events: any[] = [];

      const unsub1 = registry.onEntityEvent((event) => {
        listener1Events.push(event);
      });

      const unsub2 = registry.onEntityEvent((event) => {
        listener2Events.push(event);
      });

      registry.register(definition);

      expect(listener1Events).toHaveLength(1);
      expect(listener2Events).toHaveLength(1);

      unsub1();
      unsub2();
    });
  });
});

describe('EnumRegistry', () => {
  let registry: EnumRegistry;

  beforeEach(() => {
    registry = new EnumRegistry();
  });

  describe('enum registration', () => {
    it('should register a custom enum', () => {
      const definition: EnumDefinition = {
        name: 'OrderStatus',
        extensionId: 'test-ext',
        version: '1.0.0',
        values: [
          { name: 'PENDING', value: 'PENDING' },
          { name: 'PROCESSING', value: 'PROCESSING' },
          { name: 'COMPLETED', value: 'COMPLETED' },
        ],
      };

      registry.register(definition);
      const retrieved = registry.get('OrderStatus');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('OrderStatus');
      expect(retrieved?.values).toHaveLength(3);
    });

    it('should list all registered enums', () => {
      const enum1: EnumDefinition = {
        name: 'Status1',
        extensionId: 'test-ext',
        version: '1.0.0',
        values: [{ name: 'ACTIVE', value: 'ACTIVE' }],
      };

      const enum2: EnumDefinition = {
        name: 'Status2',
        extensionId: 'test-ext',
        version: '1.0.0',
        values: [{ name: 'ACTIVE', value: 'ACTIVE' }],
      };

      registry.register(enum1);
      registry.register(enum2);

      const enums = registry.list();

      expect(enums).toHaveLength(2);
      expect(enums.map(e => e.name)).toContain('Status1');
      expect(enums.map(e => e.name)).toContain('Status2');
    });

    it('should unregister an enum', () => {
      const definition: EnumDefinition = {
        name: 'ToDelete',
        extensionId: 'test-ext',
        version: '1.0.0',
        values: [{ name: 'VALUE', value: 'VALUE' }],
      };

      registry.register(definition);
      expect(registry.get('ToDelete')).toBeDefined();

      registry.unregister('ToDelete');
      expect(registry.get('ToDelete')).toBeUndefined();
    });
  });

  describe('enum validation', () => {
    beforeEach(() => {
      const definition: EnumDefinition = {
        name: 'Priority',
        extensionId: 'test-ext',
        version: '1.0.0',
        values: [
          { name: 'LOW', value: 'LOW' },
          { name: 'MEDIUM', value: 'MEDIUM' },
          { name: 'HIGH', value: 'HIGH' },
        ],
      };

      registry.register(definition);
    });

    it('should validate valid enum values', () => {
      expect(registry.validate('Priority', 'LOW')).toBe(true);
      expect(registry.validate('Priority', 'MEDIUM')).toBe(true);
      expect(registry.validate('Priority', 'HIGH')).toBe(true);
    });

    it('should reject invalid enum values', () => {
      expect(registry.validate('Priority', 'INVALID')).toBe(false);
      expect(registry.validate('Priority', 'low')).toBe(false); // case-sensitive
    });

    it('should get enum values', () => {
      const values = registry.values('Priority');

      expect(values).toHaveLength(3);
      expect(values).toHaveLength(3);
      // Values should contain the enum definition entries
      expect(values.length).toBe(3);
    });
  });

  describe('TypeScript generation for enums', () => {
    it('should generate TypeScript enum', () => {
      const definition: EnumDefinition = {
        name: 'Color',
        extensionId: 'test-ext',
        version: '1.0.0',
        values: [
          { name: 'RED', value: 'RED' },
          { name: 'GREEN', value: 'GREEN' },
          { name: 'BLUE', value: 'BLUE' },
        ],
      };

      registry.register(definition);
      const tsType = registry.generateTypeScript('Color');

      expect(tsType).toBeDefined();
      expect(tsType.name).toBe('Color');
      expect(tsType.code).toContain('enum Color');
      expect(tsType.code).toContain('RED');
      expect(tsType.code).toContain('GREEN');
      expect(tsType.code).toContain('BLUE');
    });
  });
});
