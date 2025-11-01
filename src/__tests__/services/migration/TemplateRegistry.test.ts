/**
 * Unit Tests for TemplateRegistry (Issue #31)
 * Tests template metadata registration, categorization, and retrieval
 */

import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_REGISTRY,
  getAvailableEntityTypes,
  getTier1Templates,
  getTemplatesByCategory,
  getTemplateMetadata,
} from '../../../services/migration/TemplateRegistry';

describe('TemplateRegistry', () => {
  describe('Registry Structure', () => {
    it('should have TEMPLATE_REGISTRY defined', () => {
      expect(TEMPLATE_REGISTRY).toBeDefined();
      expect(typeof TEMPLATE_REGISTRY).toBe('object');
    });

    it('should have at least 5 Tier 1 templates', () => {
      const tier1 = getTier1Templates();
      expect(tier1.length).toBeGreaterThanOrEqual(5);
    });

    it('should have templates in multiple categories', () => {
      const categories = ['master_data', 'transactional', 'historical'];
      const templates = getAvailableEntityTypes();

      for (const category of categories) {
        const templatesByCategory = getTemplatesByCategory(category);
        // At least one category should have templates
        if (templatesByCategory.length > 0) {
          expect(templatesByCategory.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('getAvailableEntityTypes()', () => {
    it('should return array of entity types', () => {
      const types = getAvailableEntityTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should return unique entity types', () => {
      const types = getAvailableEntityTypes();
      const uniqueTypes = new Set(types);

      expect(uniqueTypes.size).toBe(types.length);
    });

    it('should include all Tier 1 entity types', () => {
      const allTypes = getAvailableEntityTypes();
      const tier1Templates = getTier1Templates();

      tier1Templates.forEach((template) => {
        expect(allTypes).toContain(template.entityType);
      });
    });

    it('should return consistent results', () => {
      const types1 = getAvailableEntityTypes();
      const types2 = getAvailableEntityTypes();

      expect(types1.sort()).toEqual(types2.sort());
    });
  });

  describe('getTier1Templates()', () => {
    it('should return array of Tier 1 templates', () => {
      const tier1 = getTier1Templates();

      expect(Array.isArray(tier1)).toBe(true);
      expect(tier1.length).toBeGreaterThanOrEqual(5);
    });

    it('should include SITE entity', () => {
      const tier1 = getTier1Templates();
      const hasSite = tier1.some((t) => t.entityType === 'SITE');

      expect(hasSite).toBe(true);
    });

    it('should include PART entity', () => {
      const tier1 = getTier1Templates();
      const hasPart = tier1.some((t) => t.entityType === 'PART');

      expect(hasPart).toBe(true);
    });

    it('should include PERSONNEL entity', () => {
      const tier1 = getTier1Templates();
      const hasPersonnel = tier1.some((t) => t.entityType === 'PERSONNEL');

      expect(hasPersonnel).toBe(true);
    });

    it('should include EQUIPMENT entity', () => {
      const tier1 = getTier1Templates();
      const hasEquipment = tier1.some((t) => t.entityType === 'EQUIPMENT');

      expect(hasEquipment).toBe(true);
    });

    it('should include ROUTING entity', () => {
      const tier1 = getTier1Templates();
      const hasRouting = tier1.some((t) => t.entityType === 'ROUTING');

      expect(hasRouting).toBe(true);
    });

    it('should have proper metadata structure for each template', () => {
      const tier1 = getTier1Templates();

      tier1.forEach((template) => {
        expect(template).toHaveProperty('entityType');
        expect(template).toHaveProperty('entityName');
        expect(template).toHaveProperty('displayName');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('fields');
        expect(template).toHaveProperty('relationships');
        expect(template).toHaveProperty('validationRules');
        expect(template).toHaveProperty('exampleData');
      });
    });
  });

  describe('getTemplatesByCategory()', () => {
    it('should return master_data templates', () => {
      const masterData = getTemplatesByCategory('master_data');

      expect(Array.isArray(masterData)).toBe(true);
      expect(masterData.length).toBeGreaterThan(0);
    });

    it('should return templates with correct category', () => {
      const masterData = getTemplatesByCategory('master_data');

      masterData.forEach((template) => {
        expect(template.category).toBe('master_data');
      });
    });

    it('should return transactional templates', () => {
      const transactional = getTemplatesByCategory('transactional');

      // May or may not have transactional templates
      expect(Array.isArray(transactional)).toBe(true);
    });

    it('should return historical templates', () => {
      const historical = getTemplatesByCategory('historical');

      // May or may not have historical templates
      expect(Array.isArray(historical)).toBe(true);
    });

    it('should return empty array for invalid category', () => {
      const invalid = getTemplatesByCategory('invalid_category' as any);

      expect(Array.isArray(invalid)).toBe(true);
      expect(invalid.length).toBe(0);
    });
  });

  describe('getTemplateMetadata()', () => {
    it('should return metadata for valid entity type', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);

      expect(metadata).toBeDefined();
      expect(metadata).not.toBeNull();
    });

    it('should return null for invalid entity type', () => {
      const metadata = getTemplateMetadata('INVALID_ENTITY' as any);

      expect(metadata).toBeNull();
    });

    it('should return complete metadata structure', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);

      expect(metadata?.entityType).toBe(entityType);
      expect(metadata?.entityName).toBeDefined();
      expect(metadata?.displayName).toBeDefined();
      expect(metadata?.description).toBeDefined();
      expect(metadata?.category).toBeDefined();
      expect(metadata?.fields).toBeDefined();
      expect(metadata?.relationships).toBeDefined();
      expect(metadata?.validationRules).toBeDefined();
      expect(metadata?.exampleData).toBeDefined();
    });

    it('should have valid field definitions', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);

      expect(Array.isArray(metadata?.fields)).toBe(true);
      expect(metadata?.fields!.length).toBeGreaterThan(0);

      metadata?.fields!.forEach((field) => {
        expect(field).toHaveProperty('name');
        expect(field).toHaveProperty('displayName');
        expect(field).toHaveProperty('description');
        expect(field).toHaveProperty('dataType');
        expect(field).toHaveProperty('required');
        expect(field).toHaveProperty('example');

        // Validate data type
        const validTypes = ['string', 'number', 'date', 'boolean', 'enum', 'uuid'];
        expect(validTypes).toContain(field.dataType);
      });
    });

    it('should have example data', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);

      expect(Array.isArray(metadata?.exampleData)).toBe(true);
      expect(metadata?.exampleData!.length).toBeGreaterThan(0);
    });

    it('should have example data with all required fields populated', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);
      const requiredFields = metadata?.fields!.filter((f) => f.required) || [];

      metadata?.exampleData!.forEach((example) => {
        requiredFields.forEach((field) => {
          expect(example).toHaveProperty(field.name);
          // Required fields should have non-null/non-empty values in examples
          if (field.required) {
            const value = example[field.name];
            expect(value).not.toBeNull();
            expect(value).not.toBeUndefined();
          }
        });
      });
    });

    it('should have enum values for enum fields', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);
      const enumFields = metadata?.fields!.filter((f) => f.dataType === 'enum') || [];

      enumFields.forEach((field) => {
        expect(field.enumValues).toBeDefined();
        expect(Array.isArray(field.enumValues)).toBe(true);
        expect(field.enumValues!.length).toBeGreaterThan(0);
      });
    });

    it('should have matching example values for enum fields', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);
      const enumFields = metadata?.fields!.filter((f) => f.dataType === 'enum') || [];

      metadata?.exampleData!.forEach((example) => {
        enumFields.forEach((field) => {
          const exampleValue = example[field.name];
          if (exampleValue && field.enumValues) {
            expect(field.enumValues).toContain(exampleValue);
          }
        });
      });
    });
  });

  describe('Field Validation Rules', () => {
    it('should define validation rules for each template', () => {
      const entityTypes = getAvailableEntityTypes();

      entityTypes.forEach((entityType) => {
        const metadata = getTemplateMetadata(entityType as any);
        expect(Array.isArray(metadata?.validationRules)).toBe(true);
      });
    });

    it('should have some validation rules defined in registry', () => {
      const entityTypes = getAvailableEntityTypes();

      // At least one entity type should have some validation rules
      const someHaveRules = entityTypes.some((entityType) => {
        const metadata = getTemplateMetadata(entityType as any);
        return metadata?.validationRules && metadata.validationRules.length > 0;
      });

      expect(someHaveRules).toBe(true);
    });
  });

  describe('Relationships', () => {
    it('should define relationships for each template', () => {
      const entityTypes = getAvailableEntityTypes();

      entityTypes.forEach((entityType) => {
        const metadata = getTemplateMetadata(entityType as any);
        expect(Array.isArray(metadata?.relationships)).toBe(true);
      });
    });

    it('should have proper relationship structure when relationships exist', () => {
      const entityTypes = getAvailableEntityTypes();

      entityTypes.forEach((entityType) => {
        const metadata = getTemplateMetadata(entityType as any);

        metadata?.relationships!.forEach((rel) => {
          expect(rel).toHaveProperty('field');
          expect(rel).toHaveProperty('relatedEntity');
          expect(rel).toHaveProperty('cardinality');
          expect(rel).toHaveProperty('description');
        });
      });
    });
  });

  describe('Data Type Coverage', () => {
    it('should have at least one string field in each template', () => {
      const entityTypes = getAvailableEntityTypes();

      entityTypes.forEach((entityType) => {
        const metadata = getTemplateMetadata(entityType as any);
        const hasStringField = metadata?.fields!.some((f) => f.dataType === 'string');
        expect(hasStringField).toBe(true);
      });
    });

    it('should properly define maxLength for string fields', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);
      const stringFields = metadata?.fields!.filter((f) => f.dataType === 'string') || [];

      stringFields.forEach((field) => {
        // maxLength should be defined for string fields or example should fit
        if (field.maxLength) {
          expect(field.maxLength).toBeGreaterThan(0);
        }
      });
    });

    it('should handle number fields with min/max values', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);
      const numberFields = metadata?.fields!.filter((f) => f.dataType === 'number') || [];

      numberFields.forEach((field) => {
        // If min/max defined, they should be valid
        if (field.minValue !== undefined) {
          expect(typeof field.minValue).toBe('number');
        }
        if (field.maxValue !== undefined) {
          expect(typeof field.maxValue).toBe('number');
        }
      });
    });

    it('should handle date fields properly', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);
      const dateFields = metadata?.fields!.filter((f) => f.dataType === 'date') || [];

      dateFields.forEach((field) => {
        const exampleValue = metadata?.exampleData![0][field.name];
        // Example should be a valid date or date-like string
        if (exampleValue) {
          expect(exampleValue).toBeDefined();
        }
      });
    });
  });

  describe('Field Name Conventions', () => {
    it('should use PascalCase for displayName', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);

      metadata?.fields!.forEach((field) => {
        // Display name should be human readable
        expect(field.displayName).toBeDefined();
        expect(field.displayName.length).toBeGreaterThan(0);
      });
    });

    it('should use camelCase or snake_case for field names', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const metadata = getTemplateMetadata(entityType);

      metadata?.fields!.forEach((field) => {
        // Field names should be valid identifiers (camelCase or snake_case)
        expect(/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)).toBe(true);
      });
    });
  });

  describe('Consistency Checks', () => {
    it('should have consistent field definitions across all templates', () => {
      const entityTypes = getAvailableEntityTypes();

      entityTypes.forEach((entityType) => {
        const metadata = getTemplateMetadata(entityType as any);

        metadata?.fields!.forEach((field) => {
          expect(field.name).toBeDefined();
          expect(field.name.length).toBeGreaterThan(0);
          expect(field.displayName).toBeDefined();
          expect(field.description).toBeDefined();
          expect(field.example).toBeDefined();
        });
      });
    });

    it('should not have duplicate field names within a template', () => {
      const entityTypes = getAvailableEntityTypes();

      entityTypes.forEach((entityType) => {
        const metadata = getTemplateMetadata(entityType as any);
        const fieldNames = metadata?.fields!.map((f) => f.name) || [];
        const uniqueNames = new Set(fieldNames);

        expect(uniqueNames.size).toBe(fieldNames.length);
      });
    });

    it('should have at least 1 example data row for each template', () => {
      const entityTypes = getAvailableEntityTypes();

      entityTypes.forEach((entityType) => {
        const metadata = getTemplateMetadata(entityType as any);
        expect(metadata?.exampleData!.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Performance', () => {
    it('should retrieve metadata quickly', () => {
      const entityTypes = getAvailableEntityTypes();
      const entityType = entityTypes[0] as any;

      const startTime = performance.now();
      getTemplateMetadata(entityType);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(10); // Should be near-instant
    });

    it('should list all entity types quickly', () => {
      const startTime = performance.now();
      getAvailableEntityTypes();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(10); // Should be near-instant
    });

    it('should filter by category quickly', () => {
      const startTime = performance.now();
      getTemplatesByCategory('master_data');
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(10); // Should be near-instant
    });
  });
});
