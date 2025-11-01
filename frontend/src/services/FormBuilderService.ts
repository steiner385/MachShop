/**
 * Form Builder Service (Issue #45 - Phase 3)
 * Client-side service for managing form builder state and operations
 */

import { v4 as uuidv4 } from 'uuid';

export type DataCollectionFieldType =
  | 'NUMBER'
  | 'TEXT'
  | 'TEXTAREA'
  | 'BOOLEAN'
  | 'SELECT'
  | 'MULTISELECT'
  | 'DATE'
  | 'TIME'
  | 'DATETIME'
  | 'FILE'
  | 'SIGNATURE';

export interface ValidationRule {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  allowedValues?: string[];
}

export interface ConditionalDisplay {
  fieldId: string;
  condition: string; // e.g., "value > 50" or "value == 'YES'"
}

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldDefinition {
  id: string;
  fieldName: string;
  displayLabel: string;
  dataType: DataCollectionFieldType;
  required: boolean;
  displayOrder: number;
  placeholder?: string;
  helpText?: string;
  unitOfMeasure?: string;
  defaultValue?: any;
  options?: FormFieldOption[];
  validationRules?: ValidationRule;
  conditionalOn?: ConditionalDisplay;
}

export interface FormDefinition {
  id?: string;
  routingOperationId: string;
  formName: string;
  description?: string;
  version: string;
  fields: FormFieldDefinition[];
  requiredForCompletion: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface FormBuilderState {
  form: FormDefinition;
  currentFieldId?: string;
  isDirty: boolean;
  errors: Record<string, string>;
}

/**
 * Form Builder Service
 * Provides utilities for managing form builder operations
 */
export class FormBuilderService {
  /**
   * Create a new empty form
   */
  static createEmptyForm(routingOperationId: string): FormDefinition {
    return {
      routingOperationId,
      formName: 'New Form',
      description: '',
      version: '1.0.0',
      fields: [],
      requiredForCompletion: false,
      displayOrder: 0,
      isActive: true,
    };
  }

  /**
   * Add a new field to the form
   */
  static addField(form: FormDefinition, fieldType: DataCollectionFieldType): FormDefinition {
    const newField: FormFieldDefinition = {
      id: uuidv4(),
      fieldName: `field_${form.fields.length + 1}`,
      displayLabel: `Field ${form.fields.length + 1}`,
      dataType: fieldType,
      required: false,
      displayOrder: form.fields.length,
      placeholder: '',
      helpText: '',
    };

    return {
      ...form,
      fields: [...form.fields, newField],
    };
  }

  /**
   * Remove a field from the form
   */
  static removeField(form: FormDefinition, fieldId: string): FormDefinition {
    const updatedFields = form.fields
      .filter((f) => f.id !== fieldId)
      .map((f, idx) => ({ ...f, displayOrder: idx }));

    // Remove conditional references to deleted field
    const cleanedFields = updatedFields.map((f) => ({
      ...f,
      conditionalOn: f.conditionalOn?.fieldId === fieldId ? undefined : f.conditionalOn,
    }));

    return {
      ...form,
      fields: cleanedFields,
    };
  }

  /**
   * Update a field definition
   */
  static updateField(
    form: FormDefinition,
    fieldId: string,
    updates: Partial<FormFieldDefinition>
  ): FormDefinition {
    return {
      ...form,
      fields: form.fields.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f
      ),
    };
  }

  /**
   * Reorder fields (drag and drop)
   */
  static reorderFields(
    form: FormDefinition,
    sourceIndex: number,
    destIndex: number
  ): FormDefinition {
    const fields = [...form.fields];
    const [removed] = fields.splice(sourceIndex, 1);
    fields.splice(destIndex, 0, removed);

    // Update display order
    const reorderedFields = fields.map((f, idx) => ({
      ...f,
      displayOrder: idx,
    }));

    return {
      ...form,
      fields: reorderedFields,
    };
  }

  /**
   * Duplicate a field
   */
  static duplicateField(form: FormDefinition, fieldId: string): FormDefinition {
    const fieldToDuplicate = form.fields.find((f) => f.id === fieldId);
    if (!fieldToDuplicate) return form;

    const duplicatedField: FormFieldDefinition = {
      ...fieldToDuplicate,
      id: uuidv4(),
      fieldName: `${fieldToDuplicate.fieldName}_copy`,
      displayLabel: `${fieldToDuplicate.displayLabel} (Copy)`,
      displayOrder: form.fields.length,
    };

    return {
      ...form,
      fields: [...form.fields, duplicatedField],
    };
  }

  /**
   * Validate form structure
   */
  static validateForm(form: FormDefinition): Record<string, string> {
    const errors: Record<string, string> = {};

    // Validate form name
    if (!form.formName || form.formName.trim() === '') {
      errors.formName = 'Form name is required';
    }

    if (form.formName && form.formName.length > 100) {
      errors.formName = 'Form name must be less than 100 characters';
    }

    // Validate at least one field
    if (form.fields.length === 0) {
      errors.fields = 'At least one field is required';
    }

    // Validate field names are unique
    const fieldNames = new Set<string>();
    for (const field of form.fields) {
      if (fieldNames.has(field.fieldName)) {
        errors[`field_${field.id}`] = `Field name "${field.fieldName}" is already used`;
      }
      fieldNames.add(field.fieldName);
    }

    // Validate field labels are unique
    const fieldLabels = new Set<string>();
    for (const field of form.fields) {
      if (fieldLabels.has(field.displayLabel)) {
        errors[`field_${field.id}_label`] = `Field label "${field.displayLabel}" is already used`;
      }
      fieldLabels.add(field.displayLabel);
    }

    // Validate field data types
    const validTypes: DataCollectionFieldType[] = [
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

    for (const field of form.fields) {
      if (!validTypes.includes(field.dataType)) {
        errors[`field_${field.id}_type`] = `Invalid field type: ${field.dataType}`;
      }

      // Validate SELECT/MULTISELECT have options
      if ((field.dataType === 'SELECT' || field.dataType === 'MULTISELECT') && !field.options?.length) {
        errors[`field_${field.id}_options`] = `${field.dataType} fields require at least one option`;
      }

      // Validate validation rules
      if (field.validationRules) {
        const rules = field.validationRules;

        if (field.dataType === 'NUMBER') {
          if (rules.min !== undefined && rules.max !== undefined && rules.min > rules.max) {
            errors[`field_${field.id}_rules`] = 'Minimum value cannot be greater than maximum value';
          }
        }

        if (field.dataType === 'TEXT' || field.dataType === 'TEXTAREA') {
          if (
            rules.minLength !== undefined &&
            rules.maxLength !== undefined &&
            rules.minLength > rules.maxLength
          ) {
            errors[`field_${field.id}_rules`] = 'Minimum length cannot be greater than maximum length';
          }
        }
      }

      // Validate conditional display references valid fields
      if (field.conditionalOn) {
        const referencedField = form.fields.find((f) => f.id === field.conditionalOn?.fieldId);
        if (!referencedField) {
          errors[`field_${field.id}_conditional`] = 'Referenced field in conditional logic not found';
        }
      }
    }

    return errors;
  }

  /**
   * Export form to JSON
   */
  static exportFormToJSON(form: FormDefinition): string {
    return JSON.stringify(form, null, 2);
  }

  /**
   * Import form from JSON
   */
  static importFormFromJSON(json: string): FormDefinition | null {
    try {
      const parsed = JSON.parse(json);

      // Validate minimum required fields
      if (!parsed.formName || !Array.isArray(parsed.fields)) {
        return null;
      }

      return parsed as FormDefinition;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clone a form
   */
  static cloneForm(form: FormDefinition, newFormName?: string): FormDefinition {
    const cloned: FormDefinition = {
      ...form,
      formName: newFormName || `${form.formName} (Copy)`,
      id: undefined, // Remove ID for new form
      version: '1.0.0',
      fields: form.fields.map((f) => ({
        ...f,
        id: uuidv4(),
      })),
    };

    return cloned;
  }

  /**
   * Get field template by type
   */
  static getFieldTemplate(fieldType: DataCollectionFieldType): Partial<FormFieldDefinition> {
    const templates: Record<DataCollectionFieldType, Partial<FormFieldDefinition>> = {
      NUMBER: {
        dataType: 'NUMBER',
        validationRules: {
          min: 0,
          max: 100,
        },
      },
      TEXT: {
        dataType: 'TEXT',
        validationRules: {
          minLength: 0,
          maxLength: 255,
        },
      },
      TEXTAREA: {
        dataType: 'TEXTAREA',
        validationRules: {
          minLength: 0,
          maxLength: 2000,
        },
      },
      BOOLEAN: {
        dataType: 'BOOLEAN',
      },
      SELECT: {
        dataType: 'SELECT',
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
        ],
      },
      MULTISELECT: {
        dataType: 'MULTISELECT',
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
        ],
      },
      DATE: {
        dataType: 'DATE',
      },
      TIME: {
        dataType: 'TIME',
      },
      DATETIME: {
        dataType: 'DATETIME',
      },
      FILE: {
        dataType: 'FILE',
      },
      SIGNATURE: {
        dataType: 'SIGNATURE',
      },
    };

    return templates[fieldType] || {};
  }

  /**
   * Get field type icon
   */
  static getFieldTypeIcon(
    fieldType: DataCollectionFieldType
  ): string {
    const icons: Record<DataCollectionFieldType, string> = {
      NUMBER: '123',
      TEXT: 'a',
      TEXTAREA: '📄',
      BOOLEAN: '☑️',
      SELECT: '▼',
      MULTISELECT: '☑️☑️',
      DATE: '📅',
      TIME: '🕐',
      DATETIME: '📅🕐',
      FILE: '📎',
      SIGNATURE: '✍️',
    };

    return icons[fieldType] || '❓';
  }

  /**
   * Get field type description
   */
  static getFieldTypeDescription(fieldType: DataCollectionFieldType): string {
    const descriptions: Record<DataCollectionFieldType, string> = {
      NUMBER: 'Numeric input with optional min/max validation',
      TEXT: 'Single-line text input',
      TEXTAREA: 'Multi-line text input',
      BOOLEAN: 'Yes/No checkbox',
      SELECT: 'Dropdown with single selection',
      MULTISELECT: 'Multiple choice checkboxes',
      DATE: 'Date picker',
      TIME: 'Time picker',
      DATETIME: 'Date and time picker',
      FILE: 'File upload reference',
      SIGNATURE: 'Digital signature capture',
    };

    return descriptions[fieldType] || 'Unknown field type';
  }

  /**
   * Calculate form complexity score (for UI hints)
   */
  static calculateComplexityScore(form: FormDefinition): number {
    let score = 0;

    // Base score for field count
    score += form.fields.length * 2;

    // Points for validation rules
    for (const field of form.fields) {
      if (field.validationRules) {
        score += 3;
      }
      if (field.conditionalOn) {
        score += 5;
      }
      if (field.required) {
        score += 1;
      }
    }

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Get field suggestions based on operation type
   */
  static getCommonFields(): Array<{
    label: string;
    type: DataCollectionFieldType;
    description: string;
  }> {
    return [
      {
        label: 'Measurement (mm)',
        type: 'NUMBER',
        description: 'Numeric measurement with validation',
      },
      {
        label: 'Visual Inspection',
        type: 'SELECT',
        description: 'Pass/Fail or Good/Bad selection',
      },
      {
        label: 'Quality Notes',
        type: 'TEXTAREA',
        description: 'Detailed notes about quality',
      },
      {
        label: 'Operator Sign-off',
        type: 'SIGNATURE',
        description: 'Digital signature requirement',
      },
      {
        label: 'Completion Time',
        type: 'DATETIME',
        description: 'Track when work was completed',
      },
      {
        label: 'Part Serial Number',
        type: 'TEXT',
        description: 'Serial number or lot code',
      },
      {
        label: 'Photo Documentation',
        type: 'FILE',
        description: 'Attach photos of work',
      },
      {
        label: 'Special Handling',
        type: 'BOOLEAN',
        description: 'Yes/No for special handling',
      },
    ];
  }
}

export default FormBuilderService;
