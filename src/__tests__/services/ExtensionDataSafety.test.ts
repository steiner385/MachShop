/**
 * Extension Data Safety Tests
 *
 * Comprehensive test suite for the Extension Data Safety & Validation Layer
 */

import { PrismaClient } from '@prisma/client'
import { ExtensionDataSafety } from '../../services/ExtensionDataSafety'
import { ExtensionField, ExtensionDatabaseSchema } from '../../types/extensionSchema'

jest.mock('@prisma/client')

describe('ExtensionDataSafety', () => {
  let prisma: any
  let dataSafety: ExtensionDataSafety

  beforeEach(() => {
    prisma = new PrismaClient()
    dataSafety = new ExtensionDataSafety(prisma)
  })

  describe('Field Type Validation', () => {
    it('should validate String type', () => {
      const fields: ExtensionField[] = [
        { name: 'name', type: 'String', required: true },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { name: 'John' }
      )

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject non-string for String field', () => {
      const fields: ExtensionField[] = [
        { name: 'name', type: 'String', required: true },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { name: 123 }
      )

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.rule === 'type')).toBe(true)
    })

    it('should validate Int type', () => {
      const fields: ExtensionField[] = [
        { name: 'count', type: 'Int', required: true },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { count: 42 }
      )

      expect(result.valid).toBe(true)
    })

    it('should reject non-integer for Int field', () => {
      const fields: ExtensionField[] = [
        { name: 'count', type: 'Int', required: true },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { count: 3.14 }
      )

      expect(result.valid).toBe(false)
    })

    it('should validate Float type', () => {
      const fields: ExtensionField[] = [
        { name: 'price', type: 'Float', required: true },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { price: 19.99 }
      )

      expect(result.valid).toBe(true)
    })

    it('should validate Boolean type', () => {
      const fields: ExtensionField[] = [
        { name: 'active', type: 'Boolean', required: true },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { active: true }
      )

      expect(result.valid).toBe(true)
    })

    it('should validate DateTime type', () => {
      const fields: ExtensionField[] = [
        { name: 'createdAt', type: 'DateTime', required: true },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { createdAt: new Date() }
      )

      expect(result.valid).toBe(true)
    })

    it('should validate DateTime ISO string', () => {
      const fields: ExtensionField[] = [
        { name: 'createdAt', type: 'DateTime', required: true },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { createdAt: '2025-11-01T12:00:00Z' }
      )

      expect(result.valid).toBe(true)
    })

    it('should validate Json type', () => {
      const fields: ExtensionField[] = [
        { name: 'metadata', type: 'Json', required: true },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { metadata: { key: 'value' } }
      )

      expect(result.valid).toBe(true)
    })

    it('should validate Json string', () => {
      const fields: ExtensionField[] = [
        { name: 'metadata', type: 'Json', required: true },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { metadata: '{"key":"value"}' }
      )

      expect(result.valid).toBe(true)
    })
  })

  describe('Field Constraints', () => {
    it('should validate required field', () => {
      const fields: ExtensionField[] = [
        { name: 'name', type: 'String', required: true },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        {}
      )

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.rule === 'required')).toBe(true)
    })

    it('should allow optional field to be missing', () => {
      const fields: ExtensionField[] = [
        { name: 'nickname', type: 'String', required: false },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        {}
      )

      expect(result.valid).toBe(true)
    })

    it('should validate minLength constraint', () => {
      const fields: ExtensionField[] = [
        {
          name: 'password',
          type: 'String',
          required: true,
          validation: { minLength: 8 },
        },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { password: 'short' }
      )

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.rule === 'minLength')).toBe(true)
    })

    it('should validate maxLength constraint', () => {
      const fields: ExtensionField[] = [
        {
          name: 'name',
          type: 'String',
          required: true,
          validation: { maxLength: 50 },
        },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { name: 'a'.repeat(100) }
      )

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.rule === 'maxLength')).toBe(true)
    })

    it('should validate numeric min constraint', () => {
      const fields: ExtensionField[] = [
        {
          name: 'age',
          type: 'Int',
          required: true,
          validation: { min: 0 },
        },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { age: -5 }
      )

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.rule === 'min')).toBe(true)
    })

    it('should validate numeric max constraint', () => {
      const fields: ExtensionField[] = [
        {
          name: 'age',
          type: 'Int',
          required: true,
          validation: { max: 150 },
        },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { age: 200 }
      )

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.rule === 'max')).toBe(true)
    })

    it('should validate pattern constraint', () => {
      const fields: ExtensionField[] = [
        {
          name: 'email',
          type: 'String',
          required: true,
          validation: { pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { email: 'invalid-email' }
      )

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.rule === 'pattern')).toBe(true)
    })

    it('should validate enum constraint', () => {
      const fields: ExtensionField[] = [
        {
          name: 'status',
          type: 'String',
          required: true,
          validation: { enum: ['ACTIVE', 'INACTIVE', 'PENDING'] },
        },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { status: 'INVALID' }
      )

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.rule === 'enum')).toBe(true)
    })

    it('should pass valid enum value', () => {
      const fields: ExtensionField[] = [
        {
          name: 'status',
          type: 'String',
          required: true,
          validation: { enum: ['ACTIVE', 'INACTIVE'] },
        },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        { status: 'ACTIVE' }
      )

      expect(result.valid).toBe(true)
    })

    it('should use default value for missing field', () => {
      const fields: ExtensionField[] = [
        { name: 'count', type: 'Int', required: false, default: 0 },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        {}
      )

      expect(result.valid).toBe(true)
    })
  })

  describe('Data Sanitization', () => {
    it('should trim string values', () => {
      const fields: ExtensionField[] = [
        { name: 'name', type: 'String', required: true },
      ]

      const result = dataSafety.sanitizeData(
        { name: '  John Doe  ' },
        fields
      )

      expect(result.name).toBe('John Doe')
    })

    it('should coerce string to Int', () => {
      const fields: ExtensionField[] = [
        { name: 'count', type: 'Int', required: true },
      ]

      const result = dataSafety.sanitizeData(
        { count: '42' },
        fields
      )

      expect(result.count).toBe(42)
      expect(typeof result.count).toBe('number')
    })

    it('should coerce string to Float', () => {
      const fields: ExtensionField[] = [
        { name: 'price', type: 'Float', required: true },
      ]

      const result = dataSafety.sanitizeData(
        { price: '19.99' },
        fields
      )

      expect(result.price).toBe(19.99)
    })

    it('should coerce string to Boolean', () => {
      const fields: ExtensionField[] = [
        { name: 'active', type: 'Boolean', required: true },
      ]

      const result = dataSafety.sanitizeData(
        { active: 'true' },
        fields
      )

      expect(result.active).toBe(true)
    })

    it('should parse JSON string', () => {
      const fields: ExtensionField[] = [
        { name: 'metadata', type: 'Json', required: true },
      ]

      const result = dataSafety.sanitizeData(
        { metadata: '{"key":"value"}' },
        fields
      )

      expect(result.metadata).toEqual({ key: 'value' })
    })

    it('should apply default values', () => {
      const fields: ExtensionField[] = [
        { name: 'count', type: 'Int', required: false, default: 0 },
      ]

      const result = dataSafety.sanitizeData({}, fields)

      expect(result.count).toBe(0)
    })

    it('should handle null values', () => {
      const fields: ExtensionField[] = [
        { name: 'nickname', type: 'String', required: false },
      ]

      const result = dataSafety.sanitizeData(
        { nickname: null },
        fields
      )

      expect(result.nickname).toBeNull()
    })
  })

  describe('Relationship Validation', () => {
    it('should validate schema relationships', () => {
      const schema: ExtensionDatabaseSchema = {
        pluginId: 'test',
        version: '1.0.0',
        tables: [
          {
            name: 'comments',
            namespace: 'plugin_test',
            fields: [{ name: 'id', type: 'String', required: true }],
          },
        ],
        enums: [],
        relationships: [
          {
            source: 'plugin_test_comments',
            sourceField: 'id',
            target: 'WorkOrder',
            targetField: 'id',
            type: 'ManyToOne',
          },
        ],
        metadata: { namespace: 'plugin_test' },
      }

      const result = dataSafety.validateSchemaRelationships(schema)

      expect(result.valid).toBe(true)
    })

    it('should warn about missing target table', () => {
      const schema: ExtensionDatabaseSchema = {
        pluginId: 'test',
        version: '1.0.0',
        tables: [
          {
            name: 'comments',
            namespace: 'plugin_test',
            fields: [{ name: 'id', type: 'String', required: true }],
          },
        ],
        enums: [],
        relationships: [
          {
            source: 'plugin_test_comments',
            sourceField: 'id',
            target: 'NonExistentTable',
            targetField: 'id',
            type: 'OneToMany',
          },
        ],
        metadata: { namespace: 'plugin_test' },
      }

      const result = dataSafety.validateSchemaRelationships(schema)

      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should warn about ManyToMany relationships', () => {
      const schema: ExtensionDatabaseSchema = {
        pluginId: 'test',
        version: '1.0.0',
        tables: [
          {
            name: 'table1',
            namespace: 'plugin_test',
            fields: [{ name: 'id', type: 'String', required: true }],
          },
          {
            name: 'table2',
            namespace: 'plugin_test',
            fields: [{ name: 'id', type: 'String', required: true }],
          },
        ],
        enums: [],
        relationships: [
          {
            source: 'plugin_test_table1',
            sourceField: 'id',
            target: 'plugin_test_table2',
            targetField: 'id',
            type: 'ManyToMany',
          },
        ],
        metadata: { namespace: 'plugin_test' },
      }

      const result = dataSafety.validateSchemaRelationships(schema)

      expect(result.warnings.some((w) => w.rule === 'many_to_many')).toBe(true)
    })
  })

  describe('Data Migration Scripts', () => {
    it('should generate migration script for new fields', () => {
      const oldFields: ExtensionField[] = [
        { name: 'name', type: 'String', required: true },
      ]

      const newFields: ExtensionField[] = [
        { name: 'name', type: 'String', required: true },
        { name: 'email', type: 'String', required: true },
      ]

      const scripts = dataSafety.generateDataMigrationScript(oldFields, newFields)

      expect(scripts.length).toBeGreaterThan(0)
      expect(scripts.some((s) => s.includes('email'))).toBe(true)
    })

    it('should warn about removed fields', () => {
      const oldFields: ExtensionField[] = [
        { name: 'name', type: 'String', required: true },
        { name: 'deprecated_field', type: 'String', required: false },
      ]

      const newFields: ExtensionField[] = [
        { name: 'name', type: 'String', required: true },
      ]

      const scripts = dataSafety.generateDataMigrationScript(oldFields, newFields)

      expect(scripts.length).toBeGreaterThan(0)
      expect(scripts.some((s) => s.includes('deprecated_field'))).toBe(true)
    })
  })

  describe('Multiple Field Validation', () => {
    it('should validate multiple fields together', () => {
      const fields: ExtensionField[] = [
        { name: 'name', type: 'String', required: true },
        { name: 'age', type: 'Int', required: true, validation: { min: 0, max: 150 } },
        {
          name: 'email',
          type: 'String',
          required: true,
          validation: { pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        {
          name: 'John Doe',
          age: 30,
          email: 'john@example.com',
        }
      )

      expect(result.valid).toBe(true)
    })

    it('should report multiple validation errors', () => {
      const fields: ExtensionField[] = [
        { name: 'name', type: 'String', required: true },
        { name: 'age', type: 'Int', required: true, validation: { min: 0 } },
      ]

      const result = dataSafety.validateEntityData(
        { fields },
        {
          name: 123, // Wrong type
          age: -5, // Below min
        }
      )

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })
})
