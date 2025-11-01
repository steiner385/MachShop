/**
 * Extension Schema Registry Service Tests
 *
 * Comprehensive test suite for the Extension Schema Registry service
 * covering registration, validation, and conflict detection
 */

import { PrismaClient } from '@prisma/client'
import { ExtensionSchemaRegistry } from '../../services/ExtensionSchemaRegistry'
import {
  ExtensionDatabaseSchema,
  ExtensionTable,
  ValidationResult,
  ConflictReport,
} from '../../types/extensionSchema'

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    extensionSchema: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    extensionTableMetadata: {
      upsert: jest.fn(),
    },
    extensionSchemaVersion: {
      create: jest.fn(),
    },
    extensionSchemaAuditLog: {
      create: jest.fn(),
    },
    extensionSchemaConflict: {
      create: jest.fn(),
    },
  })),
}))

describe('ExtensionSchemaRegistry', () => {
  let prisma: any
  let registry: ExtensionSchemaRegistry

  beforeEach(() => {
    prisma = new PrismaClient()
    registry = new ExtensionSchemaRegistry(prisma)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Schema Validation', () => {
    it('should validate a valid schema', () => {
      const schema: ExtensionDatabaseSchema = {
        pluginId: 'test-plugin',
        version: '1.0.0',
        tables: [
          {
            name: 'custom_entities',
            namespace: 'plugin_test',
            fields: [
              {
                name: 'name',
                type: 'String',
                required: true,
              },
              {
                name: 'count',
                type: 'Int',
                required: false,
                default: 0,
              },
            ],
          },
        ],
        enums: [],
        relationships: [],
        metadata: {
          namespace: 'plugin_test',
          description: 'Test schema',
        },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject schema with missing pluginId', () => {
      const schema: any = {
        pluginId: '',
        version: '1.0.0',
        tables: [],
        enums: [],
        relationships: [],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'pluginId')).toBe(true)
    })

    it('should reject schema with missing version', () => {
      const schema: any = {
        pluginId: 'test',
        version: '',
        tables: [],
        enums: [],
        relationships: [],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'version')).toBe(true)
    })

    it('should reject invalid plugin ID format', () => {
      const schema: any = {
        pluginId: 'plugin@invalid',
        version: '1.0.0',
        tables: [],
        enums: [],
        relationships: [],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'INVALID_PLUGIN_ID_FORMAT')
      ).toBe(true)
    })

    it('should warn about non-semver version', () => {
      const schema: ExtensionDatabaseSchema = {
        pluginId: 'test',
        version: 'latest',
        tables: [
          {
            name: 'test',
            namespace: 'plugin_test',
            fields: [{ name: 'id', type: 'String', required: true }],
          },
        ],
        enums: [],
        relationships: [],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.warnings.some((w) => w.code === 'INVALID_VERSION_FORMAT')).toBe(true)
    })

    it('should reject table with no fields', () => {
      const schema: any = {
        pluginId: 'test',
        version: '1.0.0',
        tables: [
          {
            name: 'empty_table',
            namespace: 'plugin_test',
            fields: [],
          },
        ],
        enums: [],
        relationships: [],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'EMPTY_TABLE_FIELDS')).toBe(true)
    })

    it('should reject invalid field type', () => {
      const schema: any = {
        pluginId: 'test',
        version: '1.0.0',
        tables: [
          {
            name: 'test',
            namespace: 'plugin_test',
            fields: [
              {
                name: 'invalid_field',
                type: 'InvalidType',
                required: true,
              },
            ],
          },
        ],
        enums: [],
        relationships: [],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'INVALID_FIELD_TYPE')).toBe(true)
    })

    it('should validate all 8 field types', () => {
      const fieldTypes = [
        'String',
        'Int',
        'Float',
        'Boolean',
        'DateTime',
        'Decimal',
        'Json',
        'Bytes',
      ]

      fieldTypes.forEach((type) => {
        const schema: any = {
          pluginId: 'test',
          version: '1.0.0',
          tables: [
            {
              name: 'test',
              namespace: 'plugin_test',
              fields: [{ name: 'field', type, required: true }],
            },
          ],
          enums: [],
          relationships: [],
          metadata: { namespace: 'test' },
        }

        const result = registry.validateSchema(schema)
        expect(result.valid).toBe(true)
      })
    })

    it('should validate enum definitions', () => {
      const schema: ExtensionDatabaseSchema = {
        pluginId: 'test',
        version: '1.0.0',
        tables: [
          {
            name: 'test',
            namespace: 'plugin_test',
            fields: [{ name: 'id', type: 'String', required: true }],
          },
        ],
        enums: [
          {
            name: 'Status',
            values: ['ACTIVE', 'INACTIVE', 'PENDING'],
          },
        ],
        relationships: [],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(true)
    })

    it('should reject enum with no values', () => {
      const schema: any = {
        pluginId: 'test',
        version: '1.0.0',
        tables: [
          {
            name: 'test',
            namespace: 'plugin_test',
            fields: [{ name: 'id', type: 'String', required: true }],
          },
        ],
        enums: [
          {
            name: 'Status',
            values: [],
          },
        ],
        relationships: [],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'EMPTY_ENUM_VALUES')).toBe(true)
    })

    it('should validate relationships', () => {
      const schema: ExtensionDatabaseSchema = {
        pluginId: 'test',
        version: '1.0.0',
        tables: [
          {
            name: 'test',
            namespace: 'plugin_test',
            fields: [{ name: 'id', type: 'String', required: true }],
          },
        ],
        enums: [],
        relationships: [
          {
            source: 'plugin_test_test',
            sourceField: 'id',
            target: 'WorkOrder',
            targetField: 'id',
            type: 'OneToMany',
          },
        ],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(true)
    })

    it('should reject invalid relationship type', () => {
      const schema: any = {
        pluginId: 'test',
        version: '1.0.0',
        tables: [
          {
            name: 'test',
            namespace: 'plugin_test',
            fields: [{ name: 'id', type: 'String', required: true }],
          },
        ],
        enums: [],
        relationships: [
          {
            source: 'test',
            sourceField: 'id',
            target: 'other',
            targetField: 'id',
            type: 'InvalidType',
          },
        ],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'INVALID_RELATIONSHIP_TYPE')
      ).toBe(true)
    })

    it('should validate regex patterns', () => {
      const schema: ExtensionDatabaseSchema = {
        pluginId: 'test',
        version: '1.0.0',
        tables: [
          {
            name: 'test',
            namespace: 'plugin_test',
            fields: [
              {
                name: 'email',
                type: 'String',
                required: true,
                validation: {
                  pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                },
              },
            ],
          },
        ],
        enums: [],
        relationships: [],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(true)
    })

    it('should reject invalid regex patterns', () => {
      const schema: any = {
        pluginId: 'test',
        version: '1.0.0',
        tables: [
          {
            name: 'test',
            namespace: 'plugin_test',
            fields: [
              {
                name: 'field',
                type: 'String',
                required: true,
                validation: {
                  pattern: '[invalid(regex',
                },
              },
            ],
          },
        ],
        enums: [],
        relationships: [],
        metadata: { namespace: 'test' },
      }

      const result = registry.validateSchema(schema)

      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'INVALID_REGEX_PATTERN')
      ).toBe(true)
    })
  })

  describe('Conflict Detection', () => {
    it('should detect table name conflicts', () => {
      // Register first schema
      const schema1: ExtensionDatabaseSchema = {
        pluginId: 'plugin1',
        version: '1.0.0',
        tables: [
          {
            name: 'users',
            namespace: 'plugin_1',
            fields: [{ name: 'name', type: 'String', required: true }],
          },
        ],
        enums: [],
        relationships: [],
        metadata: { namespace: 'plugin_1' },
      }

      registry['registeredSchemas'].set('plugin1', schema1)

      // Check conflict with second schema
      const schema2: ExtensionDatabaseSchema = {
        pluginId: 'plugin2',
        version: '1.0.0',
        tables: [
          {
            name: 'users',
            namespace: 'plugin_1',
            fields: [{ name: 'name', type: 'String', required: true }],
          },
        ],
        enums: [],
        relationships: [],
        metadata: { namespace: 'plugin_1' },
      }

      const conflicts = registry.detectConflicts(schema2)

      expect(conflicts.hasConflicts).toBe(true)
      expect(conflicts.conflicts.some((c) => c.type === 'table_name')).toBe(true)
    })

    it('should detect enum name conflicts', () => {
      const schema1: ExtensionDatabaseSchema = {
        pluginId: 'plugin1',
        version: '1.0.0',
        tables: [
          {
            name: 'test',
            namespace: 'plugin_1',
            fields: [{ name: 'id', type: 'String', required: true }],
          },
        ],
        enums: [{ name: 'Status', values: ['ACTIVE', 'INACTIVE'] }],
        relationships: [],
        metadata: { namespace: 'plugin_1' },
      }

      registry['registeredSchemas'].set('plugin1', schema1)

      const schema2: ExtensionDatabaseSchema = {
        pluginId: 'plugin2',
        version: '1.0.0',
        tables: [
          {
            name: 'test2',
            namespace: 'plugin_2',
            fields: [{ name: 'id', type: 'String', required: true }],
          },
        ],
        enums: [{ name: 'Status', values: ['PENDING', 'COMPLETED'] }],
        relationships: [],
        metadata: { namespace: 'plugin_2' },
      }

      const conflicts = registry.detectConflicts(schema2)

      expect(conflicts.hasConflicts).toBe(true)
      expect(conflicts.conflicts.some((c) => c.type === 'enum_name')).toBe(true)
    })

    it('should detect field name conflicts', () => {
      const schema: ExtensionDatabaseSchema = {
        pluginId: 'plugin1',
        version: '1.0.0',
        tables: [
          {
            name: 'test',
            namespace: 'plugin_1',
            fields: [
              { name: 'id', type: 'String', required: true },
              { name: 'id', type: 'String', required: true }, // Duplicate
            ],
          },
        ],
        enums: [],
        relationships: [],
        metadata: { namespace: 'plugin_1' },
      }

      const conflicts = registry.detectConflicts(schema)

      expect(conflicts.hasConflicts).toBe(true)
      expect(conflicts.conflicts.some((c) => c.type === 'field_name')).toBe(true)
    })
  })

  describe('Schema Retrieval', () => {
    it('should retrieve all registered schemas', () => {
      const schema1: ExtensionDatabaseSchema = {
        pluginId: 'plugin1',
        version: '1.0.0',
        tables: [],
        enums: [],
        relationships: [],
        metadata: { namespace: 'plugin_1' },
      }

      const schema2: ExtensionDatabaseSchema = {
        pluginId: 'plugin2',
        version: '1.0.0',
        tables: [],
        enums: [],
        relationships: [],
        metadata: { namespace: 'plugin_2' },
      }

      registry['registeredSchemas'].set('plugin1', schema1)
      registry['registeredSchemas'].set('plugin2', schema2)

      const schemas = registry.getAllSchemas()

      expect(schemas).toHaveLength(2)
      expect(schemas).toContain(schema1)
      expect(schemas).toContain(schema2)
    })

    it('should retrieve schema by plugin ID', () => {
      const schema: ExtensionDatabaseSchema = {
        pluginId: 'plugin1',
        version: '1.0.0',
        tables: [],
        enums: [],
        relationships: [],
        metadata: { namespace: 'plugin_1' },
      }

      registry['registeredSchemas'].set('plugin1', schema)

      const retrieved = registry.getPluginSchema('plugin1')

      expect(retrieved).toEqual(schema)
    })

    it('should return null for non-existent schema', () => {
      const retrieved = registry.getPluginSchema('nonexistent')

      expect(retrieved).toBeNull()
    })
  })

  describe('Prisma Schema Generation', () => {
    it('should generate valid Prisma schema', () => {
      const schema: ExtensionDatabaseSchema = {
        pluginId: 'plugin1',
        version: '1.0.0',
        tables: [
          {
            name: 'users',
            namespace: 'plugin_1',
            fields: [
              { name: 'name', type: 'String', required: true },
              { name: 'age', type: 'Int', required: false },
            ],
          },
        ],
        enums: [
          {
            name: 'Role',
            values: ['ADMIN', 'USER'],
          },
        ],
        relationships: [],
        metadata: { namespace: 'plugin_1' },
      }

      registry['registeredSchemas'].set('plugin1', schema)

      const result = registry.generatePrismaSchema()

      expect(result.success).toBe(true)
      expect(result.schema).toContain('enum Role')
      expect(result.schema).toContain('model Users')
      expect(result.models).toHaveLength(1)
      expect(result.enums).toHaveLength(1)
    })
  })
})
