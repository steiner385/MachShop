/**
 * Form Builder Store using Zustand
 * Manages form state, field values, and validation errors
 */

import { create } from 'zustand';
import { FieldConfig, FormBuilderStoreState, FormValidationError, LayoutConfig, LayoutType } from '../types';
import { ValidationEngine } from '../validation/ValidationEngine';

/**
 * Create form store factory
 */
export const createFormStore = (formId: string, validationEngine: ValidationEngine) => {
  return create<FormBuilderStoreState>((set, get) => ({
    // Initial state
    formId,
    fields: new Map(),
    layout: { type: LayoutType.SINGLE_COLUMN },
    values: {},
    errors: [],
    touched: {},
    isDirty: false,
    isSubmitting: false,
    isValid: true,
    isLoading: false,

    // Set form ID
    setFormId: (id: string) => {
      set({ formId: id });
    },

    // Set field value
    setFieldValue: (fieldId: string, value: unknown) => {
      const state = get();
      const newValues = { ...state.values, [fieldId]: value };

      set({
        values: newValues,
        isDirty: true,
      });

      // Trigger field validation if validateOnChange is enabled
      // This can be enhanced with a config parameter
      get().validateField(fieldId);
    },

    // Set field touched
    setFieldTouched: (fieldId: string, touched: boolean) => {
      const state = get();
      set({
        touched: { ...state.touched, [fieldId]: touched },
      });
    },

    // Set field error
    setFieldError: (fieldId: string, fieldErrors: FormValidationError[]) => {
      const state = get();
      const otherErrors = state.errors.filter((e) => e.fieldId !== fieldId);
      set({
        errors: [...otherErrors, ...fieldErrors],
      });
    },

    // Add field to form
    addField: (field: FieldConfig) => {
      const state = get();
      const newFields = new Map(state.fields);
      newFields.set(field.id, { field, errors: [], value: field.defaultValue });

      set({
        fields: newFields,
        values: { ...state.values, [field.id]: field.defaultValue },
      });
    },

    // Remove field from form
    removeField: (fieldId: string) => {
      const state = get();
      const newFields = new Map(state.fields);
      newFields.delete(fieldId);

      const newValues = { ...state.values };
      delete newValues[fieldId];

      const newTouched = { ...state.touched };
      delete newTouched[fieldId];

      const newErrors = state.errors.filter((e) => e.fieldId !== fieldId);

      set({
        fields: newFields,
        values: newValues,
        touched: newTouched,
        errors: newErrors,
      });
    },

    // Update field configuration
    updateField: (fieldId: string, config: Partial<FieldConfig>) => {
      const state = get();
      const field = state.fields.get(fieldId);

      if (field) {
        const updatedField = { ...field.field, ...config };
        const newFields = new Map(state.fields);
        newFields.set(fieldId, { ...field, field: updatedField });

        set({ fields: newFields });
      }
    },

    // Get field configuration
    getField: (fieldId: string) => {
      const state = get();
      const field = state.fields.get(fieldId);
      return field?.field;
    },

    // Reset form to initial state
    resetForm: () => {
      const state = get();
      const resetValues: Record<string, unknown> = {};
      const resetTouched: Record<string, boolean> = {};

      for (const field of state.fields.values()) {
        resetValues[field.field.id] = field.field.defaultValue;
        resetTouched[field.field.id] = false;
      }

      set({
        values: resetValues,
        touched: resetTouched,
        errors: [],
        isDirty: false,
        isValid: true,
      });
    },

    // Reset single field
    resetField: (fieldId: string) => {
      const state = get();
      const field = state.fields.get(fieldId);

      if (field) {
        const newValues = { ...state.values, [fieldId]: field.field.defaultValue };
        const newTouched = { ...state.touched, [fieldId]: false };
        const newErrors = state.errors.filter((e) => e.fieldId !== fieldId);

        set({
          values: newValues,
          touched: newTouched,
          errors: newErrors,
        });
      }
    },

    // Set layout
    setLayout: (layout: LayoutConfig) => {
      set({ layout });
    },

    // Validate single field
    validateField: async (fieldId: string) => {
      const state = get();
      const field = state.fields.get(fieldId)?.field;

      if (!field) {
        return [];
      }

      const result = await validationEngine.validateField(
        field,
        state.values[fieldId],
        state.values
      );

      get().setFieldError(fieldId, result.errors);

      return result.errors;
    },

    // Validate entire form
    validateForm: async () => {
      const state = get();
      // Extract field configs from store items
      const fieldConfigs = new Map<string, FieldConfig>();
      for (const [id, item] of state.fields) {
        fieldConfigs.set(id, item.field);
      }

      const results = await validationEngine.validateForm(fieldConfigs, state.values);

      const allErrors: FormValidationError[] = [];
      const isValid = results.every((result) => {
        allErrors.push(...result.errors);
        return result.isValid;
      });

      set({
        errors: allErrors,
        isValid,
      });

      return isValid;
    },

    // Submit form
    submitForm: async (onSubmit: (data: Record<string, unknown>) => void) => {
      const state = get();

      set({ isSubmitting: true });

      try {
        const isValid = await get().validateForm();

        if (!isValid) {
          throw new Error('Form validation failed');
        }

        await onSubmit(state.values);

        // Mark as clean after successful submission
        set({
          isDirty: false,
          isSubmitting: false,
        });
      } catch (error) {
        set({ isSubmitting: false });
        throw error;
      }
    },
  }));
};

/**
 * Default form store instance (for single form usage)
 */
export const useFormStore = createFormStore('default', new ValidationEngine());
