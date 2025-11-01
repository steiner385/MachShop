/**
 * FormBuilderService Tests (Issue #45 - Phase 3)
 * Comprehensive test suite for form builder service utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import FormBuilderService, {
  FormDefinition,
  FormFieldDefinition,
  DataCollectionFieldType,
} from '../FormBuilderService';

describe('FormBuilderService', () => {
  let testForm: FormDefinition;

  beforeEach(() => {
    testForm = FormBuilderService.createEmptyForm('test-operation-id');
  });

  describe('createEmptyForm', () => {
    it('should create a new empty form with default values', () => {
      const form = FormBuilderService.createEmptyForm('test-op-id');

      expect(form.routingOperationId).toBe('test-op-id');
      expect(form.formName).toBe('New Form');
      expect(form.description).toBe('');
      expect(form.version).toBe('1.0.0');
      expect(form.fields).toEqual([]);
      expect(form.requiredForCompletion).toBe(false);
      expect(form.displayOrder).toBe(0);
      expect(form.isActive).toBe(true);
    });
  });

  describe('addField', () => {
    it('should add a new field to the form', () => {
      const updatedForm = FormBuilderService.addField(testForm, 'NUMBER');

      expect(updatedForm.fields).toHaveLength(1);
      expect(updatedForm.fields[0].dataType).toBe('NUMBER');
      expect(updatedForm.fields[0].required).toBe(false);
      expect(updatedForm.fields[0].displayOrder).toBe(0);
    });

    it('should generate unique field IDs', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form = FormBuilderService.addField(form, 'TEXT');

      expect(form.fields[0].id).not.toBe(form.fields[1].id);
    });

    it('should increment display order for each field', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form = FormBuilderService.addField(form, 'NUMBER');
      form = FormBuilderService.addField(form, 'TEXTAREA');

      expect(form.fields[0].displayOrder).toBe(0);
      expect(form.fields[1].displayOrder).toBe(1);
      expect(form.fields[2].displayOrder).toBe(2);
    });

    it('should support all field types', () => {
      const fieldTypes: DataCollectionFieldType[] = [
        'NUMBER',
        'TEXT',
        'TEXTAREA',
        'BOOLEAN',
        'SELECT',
        'MULTISELECT',
        'DATE',
        'TIME',
        'DATETIME',
        'FILE',
        'SIGNATURE',
      ];

      let form = testForm;
      for (const type of fieldTypes) {
        form = FormBuilderService.addField(form, type);
      }

      expect(form.fields).toHaveLength(11);
      fieldTypes.forEach((type, idx) => {
        expect(form.fields[idx].dataType).toBe(type);
      });
    });
  });

  describe('removeField', () => {
    it('should remove a field from the form', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form = FormBuilderService.addField(form, 'NUMBER');
      const fieldIdToRemove = form.fields[0].id;

      form = FormBuilderService.removeField(form, fieldIdToRemove);

      expect(form.fields).toHaveLength(1);
      expect(form.fields[0].dataType).toBe('NUMBER');
    });

    it('should re-index display order after removing a field', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form = FormBuilderService.addField(form, 'NUMBER');
      form = FormBuilderService.addField(form, 'TEXTAREA');

      form = FormBuilderService.removeField(form, form.fields[1].id);

      expect(form.fields[0].displayOrder).toBe(0);
      expect(form.fields[1].displayOrder).toBe(1);
    });

    it('should remove conditional references to deleted field', () => {
      let form = FormBuilderService.addField(testForm, 'SELECT');
      form = FormBuilderService.addField(form, 'TEXT');

      const fieldIdToRemove = form.fields[0].id;
      form = FormBuilderService.updateField(form, form.fields[1].id, {
        conditionalOn: {
          fieldId: fieldIdToRemove,
          condition: 'equals "yes"',
        },
      });

      expect(form.fields[1].conditionalOn).toBeDefined();

      form = FormBuilderService.removeField(form, fieldIdToRemove);

      expect(form.fields[0].conditionalOn).toBeUndefined();
    });

    it('should handle removing non-existent field gracefully', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      const originalLength = form.fields.length;

      form = FormBuilderService.removeField(form, 'non-existent-id');

      expect(form.fields).toHaveLength(originalLength);
    });
  });

  describe('updateField', () => {
    it('should update field properties', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      const fieldId = form.fields[0].id;

      form = FormBuilderService.updateField(form, fieldId, {
        displayLabel: 'Updated Label',
        required: true,
        placeholder: 'Enter text...',
      });

      expect(form.fields[0].displayLabel).toBe('Updated Label');
      expect(form.fields[0].required).toBe(true);
      expect(form.fields[0].placeholder).toBe('Enter text...');
    });

    it('should update validation rules', () => {
      let form = FormBuilderService.addField(testForm, 'NUMBER');
      const fieldId = form.fields[0].id;

      form = FormBuilderService.updateField(form, fieldId, {
        validationRules: {
          min: 0,
          max: 100,
        },
      });

      expect(form.fields[0].validationRules?.min).toBe(0);
      expect(form.fields[0].validationRules?.max).toBe(100);
    });

    it('should update options for select fields', () => {
      let form = FormBuilderService.addField(testForm, 'SELECT');
      const fieldId = form.fields[0].id;

      form = FormBuilderService.updateField(form, fieldId, {
        options: [
          { label: 'Option 1', value: 'opt1' },
          { label: 'Option 2', value: 'opt2' },
        ],
      });

      expect(form.fields[0].options).toHaveLength(2);
      expect(form.fields[0].options?.[0].label).toBe('Option 1');
    });

    it('should not affect other fields when updating one', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form = FormBuilderService.addField(form, 'NUMBER');
      const originalFirstField = { ...form.fields[0] };

      form = FormBuilderService.updateField(form, form.fields[1].id, {
        displayLabel: 'Updated',
      });

      expect(form.fields[0]).toEqual(originalFirstField);
    });
  });

  describe('reorderFields', () => {
    beforeEach(() => {
      let form = testForm;
      form = FormBuilderService.addField(form, 'TEXT');
      form = FormBuilderService.addField(form, 'NUMBER');
      form = FormBuilderService.addField(form, 'TEXTAREA');
      testForm = form;
    });

    it('should reorder fields correctly', () => {
      const form = FormBuilderService.reorderFields(testForm, 0, 2);

      // Field at index 0 (TEXT) should move to index 2
      expect(form.fields[0].dataType).toBe('NUMBER');
      expect(form.fields[1].dataType).toBe('TEXTAREA');
      expect(form.fields[2].dataType).toBe('TEXT');
    });

    it('should update display order after reordering', () => {
      const form = FormBuilderService.reorderFields(testForm, 1, 0);

      expect(form.fields[0].displayOrder).toBe(0);
      expect(form.fields[1].displayOrder).toBe(1);
      expect(form.fields[2].displayOrder).toBe(2);
    });

    it('should handle moving field down', () => {
      const form = FormBuilderService.reorderFields(testForm, 0, 2);

      expect(form.fields[2].dataType).toBe('TEXT');
    });

    it('should handle moving field up', () => {
      const form = FormBuilderService.reorderFields(testForm, 2, 0);

      expect(form.fields[0].dataType).toBe('TEXTAREA');
    });
  });

  describe('duplicateField', () => {
    it('should duplicate a field with new ID', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      const originalFieldId = form.fields[0].id;

      form = FormBuilderService.duplicateField(form, originalFieldId);

      expect(form.fields).toHaveLength(2);
      expect(form.fields[0].id).not.toBe(form.fields[1].id);
    });

    it('should copy field properties correctly', () => {
      let form = FormBuilderService.addField(testForm, 'NUMBER');
      form = FormBuilderService.updateField(form, form.fields[0].id, {
        displayLabel: 'Test Field',
        required: true,
        validationRules: { min: 0, max: 100 },
      });

      const originalFieldId = form.fields[0].id;
      form = FormBuilderService.duplicateField(form, originalFieldId);

      expect(form.fields[1].displayLabel).toBe('Test Field (Copy)');
      expect(form.fields[1].required).toBe(true);
      expect(form.fields[1].validationRules?.min).toBe(0);
    });

    it('should append duplicated field at end', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form = FormBuilderService.addField(form, 'NUMBER');
      const originalLength = form.fields.length;

      form = FormBuilderService.duplicateField(form, form.fields[0].id);

      expect(form.fields).toHaveLength(originalLength + 1);
      expect(form.fields[2].dataType).toBe('TEXT');
    });

    it('should handle non-existent field gracefully', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      const originalLength = form.fields.length;

      form = FormBuilderService.duplicateField(form, 'non-existent-id');

      expect(form.fields).toHaveLength(originalLength);
    });
  });

  describe('validateForm', () => {
    it('should return no errors for valid form', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form.formName = 'Valid Form';

      const errors = FormBuilderService.validateForm(form);

      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should require form name', () => {
      testForm.formName = '';

      const errors = FormBuilderService.validateForm(testForm);

      expect(errors.formName).toBeDefined();
    });

    it('should enforce form name max length', () => {
      testForm.formName = 'a'.repeat(101);

      const errors = FormBuilderService.validateForm(testForm);

      expect(errors.formName).toBeDefined();
    });

    it('should require at least one field', () => {
      testForm.formName = 'Test Form';

      const errors = FormBuilderService.validateForm(testForm);

      expect(errors.fields).toBeDefined();
    });

    it('should ensure unique field names', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form = FormBuilderService.addField(form, 'NUMBER');
      form = FormBuilderService.updateField(form, form.fields[1].id, {
        fieldName: form.fields[0].fieldName,
      });

      const errors = FormBuilderService.validateForm(form);

      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should ensure unique field labels', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form = FormBuilderService.addField(form, 'NUMBER');
      form = FormBuilderService.updateField(form, form.fields[1].id, {
        displayLabel: form.fields[0].displayLabel,
      });

      const errors = FormBuilderService.validateForm(form);

      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should validate field types', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      const fieldId = form.fields[0].id;
      // Directly mutate to create invalid state (normally prevented by type system)
      form.fields[0].dataType = 'INVALID' as any;

      const errors = FormBuilderService.validateForm(form);

      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should require options for SELECT fields', () => {
      let form = FormBuilderService.addField(testForm, 'SELECT');
      form.fields[0].options = [];

      const errors = FormBuilderService.validateForm(form);

      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should validate min/max for number fields', () => {
      let form = FormBuilderService.addField(testForm, 'NUMBER');
      form = FormBuilderService.updateField(form, form.fields[0].id, {
        validationRules: {
          min: 100,
          max: 50,
        },
      });

      const errors = FormBuilderService.validateForm(form);

      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should validate minLength/maxLength for text fields', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form = FormBuilderService.updateField(form, form.fields[0].id, {
        validationRules: {
          minLength: 100,
          maxLength: 50,
        },
      });

      const errors = FormBuilderService.validateForm(form);

      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should validate conditional references', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form = FormBuilderService.updateField(form, form.fields[0].id, {
        conditionalOn: {
          fieldId: 'non-existent-field-id',
          condition: 'equals "test"',
        },
      });

      const errors = FormBuilderService.validateForm(form);

      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });
  });

  describe('exportFormToJSON', () => {
    it('should export form as valid JSON', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form.formName = 'Test Form';

      const json = FormBuilderService.exportFormToJSON(form);
      const parsed = JSON.parse(json);

      expect(parsed.formName).toBe('Test Form');
      expect(parsed.fields).toHaveLength(1);
    });

    it('should export with proper formatting', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');

      const json = FormBuilderService.exportFormToJSON(form);

      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('importFormFromJSON', () => {
    it('should import valid JSON form', () => {
      const formData: FormDefinition = {
        routingOperationId: 'test-op',
        formName: 'Imported Form',
        description: 'A test form',
        version: '1.0.0',
        fields: [],
        requiredForCompletion: false,
        displayOrder: 0,
        isActive: true,
      };
      const json = JSON.stringify(formData);

      const imported = FormBuilderService.importFormFromJSON(json);

      expect(imported).not.toBeNull();
      expect(imported?.formName).toBe('Imported Form');
    });

    it('should return null for invalid JSON', () => {
      const imported = FormBuilderService.importFormFromJSON('{ invalid json }');

      expect(imported).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const invalidData = { description: 'Missing formName and fields' };
      const json = JSON.stringify(invalidData);

      const imported = FormBuilderService.importFormFromJSON(json);

      expect(imported).toBeNull();
    });

    it('should return null if fields is not array', () => {
      const invalidData = {
        formName: 'Test',
        fields: 'not an array',
      };
      const json = JSON.stringify(invalidData);

      const imported = FormBuilderService.importFormFromJSON(json);

      expect(imported).toBeNull();
    });
  });

  describe('cloneForm', () => {
    it('should clone form with new name', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form.formName = 'Original Form';

      const cloned = FormBuilderService.cloneForm(form, 'Cloned Form');

      expect(cloned.formName).toBe('Cloned Form');
      expect(cloned.id).toBeUndefined();
    });

    it('should use default name if not provided', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form.formName = 'Original Form';

      const cloned = FormBuilderService.cloneForm(form);

      expect(cloned.formName).toBe('Original Form (Copy)');
    });

    it('should reset version on clone', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      form.version = '2.5.3';

      const cloned = FormBuilderService.cloneForm(form);

      expect(cloned.version).toBe('1.0.0');
    });

    it('should generate new field IDs', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      const originalFieldId = form.fields[0].id;

      const cloned = FormBuilderService.cloneForm(form);

      expect(cloned.fields[0].id).not.toBe(originalFieldId);
    });

    it('should clone field properties correctly', () => {
      let form = FormBuilderService.addField(testForm, 'NUMBER');
      form = FormBuilderService.updateField(form, form.fields[0].id, {
        displayLabel: 'Test Field',
        validationRules: { min: 0, max: 100 },
      });

      const cloned = FormBuilderService.cloneForm(form);

      expect(cloned.fields[0].displayLabel).toBe('Test Field');
      expect(cloned.fields[0].validationRules?.min).toBe(0);
    });
  });

  describe('getFieldTemplate', () => {
    it('should return template for NUMBER type', () => {
      const template = FormBuilderService.getFieldTemplate('NUMBER');

      expect(template.dataType).toBe('NUMBER');
      expect(template.validationRules?.min).toBe(0);
      expect(template.validationRules?.max).toBe(100);
    });

    it('should return template for TEXT type', () => {
      const template = FormBuilderService.getFieldTemplate('TEXT');

      expect(template.dataType).toBe('TEXT');
      expect(template.validationRules?.minLength).toBe(0);
      expect(template.validationRules?.maxLength).toBe(255);
    });

    it('should return template for SELECT type', () => {
      const template = FormBuilderService.getFieldTemplate('SELECT');

      expect(template.dataType).toBe('SELECT');
      expect(template.options).toHaveLength(2);
    });

    it('should return template for all supported types', () => {
      const types: DataCollectionFieldType[] = [
        'NUMBER',
        'TEXT',
        'TEXTAREA',
        'BOOLEAN',
        'SELECT',
        'MULTISELECT',
        'DATE',
        'TIME',
        'DATETIME',
        'FILE',
        'SIGNATURE',
      ];

      for (const type of types) {
        const template = FormBuilderService.getFieldTemplate(type);
        expect(template.dataType).toBe(type);
      }
    });
  });

  describe('getFieldTypeIcon', () => {
    it('should return icon for NUMBER type', () => {
      const icon = FormBuilderService.getFieldTypeIcon('NUMBER');

      expect(icon).toBe('123');
    });

    it('should return icon for all types', () => {
      const types: DataCollectionFieldType[] = [
        'NUMBER',
        'TEXT',
        'TEXTAREA',
        'BOOLEAN',
        'SELECT',
        'MULTISELECT',
        'DATE',
        'TIME',
        'DATETIME',
        'FILE',
        'SIGNATURE',
      ];

      for (const type of types) {
        const icon = FormBuilderService.getFieldTypeIcon(type);
        expect(icon).toBeTruthy();
      }
    });
  });

  describe('getFieldTypeDescription', () => {
    it('should return description for NUMBER type', () => {
      const desc = FormBuilderService.getFieldTypeDescription('NUMBER');

      expect(desc).toContain('Numeric');
    });

    it('should return description for all types', () => {
      const types: DataCollectionFieldType[] = [
        'NUMBER',
        'TEXT',
        'TEXTAREA',
        'BOOLEAN',
        'SELECT',
        'MULTISELECT',
        'DATE',
        'TIME',
        'DATETIME',
        'FILE',
        'SIGNATURE',
      ];

      for (const type of types) {
        const desc = FormBuilderService.getFieldTypeDescription(type);
        expect(desc).toBeTruthy();
        expect(desc).not.toContain('Unknown');
      }
    });
  });

  describe('calculateComplexityScore', () => {
    it('should return 0 for empty form', () => {
      const score = FormBuilderService.calculateComplexityScore(testForm);

      expect(score).toBe(0);
    });

    it('should increase with field count', () => {
      let form = FormBuilderService.addField(testForm, 'TEXT');
      let scoreWithOne = FormBuilderService.calculateComplexityScore(form);

      form = FormBuilderService.addField(form, 'NUMBER');
      let scoreWithTwo = FormBuilderService.calculateComplexityScore(form);

      expect(scoreWithTwo).toBeGreaterThan(scoreWithOne);
    });

    it('should increase with validation rules', () => {
      let form = FormBuilderService.addField(testForm, 'NUMBER');
      let scoreWithoutRules = FormBuilderService.calculateComplexityScore(form);

      form = FormBuilderService.updateField(form, form.fields[0].id, {
        validationRules: { min: 0, max: 100 },
      });
      let scoreWithRules = FormBuilderService.calculateComplexityScore(form);

      expect(scoreWithRules).toBeGreaterThan(scoreWithoutRules);
    });

    it('should increase with conditional display', () => {
      let form = FormBuilderService.addField(testForm, 'SELECT');
      form = FormBuilderService.addField(form, 'TEXT');
      let scoreWithoutConditional = FormBuilderService.calculateComplexityScore(form);

      form = FormBuilderService.updateField(form, form.fields[1].id, {
        conditionalOn: {
          fieldId: form.fields[0].id,
          condition: 'equals "value"',
        },
      });
      let scoreWithConditional = FormBuilderService.calculateComplexityScore(form);

      expect(scoreWithConditional).toBeGreaterThan(scoreWithoutConditional);
    });

    it('should cap score at 100', () => {
      let form = testForm;
      for (let i = 0; i < 30; i++) {
        form = FormBuilderService.addField(form, 'NUMBER');
      }

      const score = FormBuilderService.calculateComplexityScore(form);

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getCommonFields', () => {
    it('should return array of suggested fields', () => {
      const fields = FormBuilderService.getCommonFields();

      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
    });

    it('should have required properties on each field', () => {
      const fields = FormBuilderService.getCommonFields();

      for (const field of fields) {
        expect(field.label).toBeTruthy();
        expect(field.type).toBeTruthy();
        expect(field.description).toBeTruthy();
      }
    });

    it('should include measurement field', () => {
      const fields = FormBuilderService.getCommonFields();
      const measurementField = fields.find((f) => f.label.includes('Measurement'));

      expect(measurementField).toBeDefined();
      expect(measurementField?.type).toBe('NUMBER');
    });

    it('should include signature field', () => {
      const fields = FormBuilderService.getCommonFields();
      const signatureField = fields.find((f) => f.label.includes('Signature'));

      expect(signatureField).toBeDefined();
      expect(signatureField?.type).toBe('SIGNATURE');
    });
  });
});
