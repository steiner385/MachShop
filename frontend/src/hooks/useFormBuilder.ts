/**
 * useFormBuilder Hook (Issue #45 - Phase 3)
 * Custom hook for managing form builder state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import FormBuilderService, {
  FormDefinition,
  FormFieldDefinition,
  DataCollectionFieldType,
} from '@/services/FormBuilderService';
import { dataCollectionApi } from '@/api/dataCollectionApi';

interface UseFormBuilderOptions {
  formId?: string;
  routingOperationId: string;
  onFormSaved?: (form: FormDefinition) => void;
  onFormLoadFailed?: (error: Error) => void;
}

interface UseFormBuilderReturn {
  // State
  form: FormDefinition;
  currentFieldId?: string;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  errors: Record<string, string>;

  // Form operations
  setFormName: (name: string) => void;
  setFormDescription: (description: string) => void;
  setRequiredForCompletion: (required: boolean) => void;
  setDisplayOrder: (order: number) => void;
  setActive: (active: boolean) => void;

  // Field operations
  addField: (fieldType: DataCollectionFieldType) => void;
  removeField: (fieldId: string) => void;
  selectField: (fieldId: string) => void;
  deselectField: () => void;
  updateField: (fieldId: string, updates: Partial<FormFieldDefinition>) => void;
  reorderFields: (sourceIndex: number, destIndex: number) => void;
  duplicateField: (fieldId: string) => void;

  // Form operations
  validateForm: () => Record<string, string>;
  saveForm: () => Promise<void>;
  loadForm: (formId: string) => Promise<void>;
  resetForm: () => void;
  cloneForm: (newName: string) => Promise<void>;
  exportForm: () => string;
  importForm: (json: string) => boolean;
  markAsSaved: () => void;
}

/**
 * Custom hook for form builder state management
 */
export const useFormBuilder = (options: UseFormBuilderOptions): UseFormBuilderReturn => {
  const { formId, routingOperationId, onFormSaved, onFormLoadFailed } = options;

  // Initialize empty form
  const initialForm = FormBuilderService.createEmptyForm(routingOperationId);

  // State management
  const [form, setForm] = useState<FormDefinition>(initialForm);
  const [currentFieldId, setCurrentFieldId] = useState<string | undefined>();
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load form on mount if formId provided
  useEffect(() => {
    if (formId) {
      loadFormData(formId);
    }
  }, [formId]);

  // Load form data from API
  const loadFormData = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const loadedForm = await dataCollectionApi.getDataCollectionForm(id);
      if (loadedForm) {
        setForm(loadedForm);
        setIsDirty(false);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to load form');
      onFormLoadFailed?.(err);
      console.error('Error loading form:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onFormLoadFailed]);

  // Form metadata operations
  const setFormName = useCallback((name: string) => {
    setForm((prev) => ({ ...prev, formName: name }));
    setIsDirty(true);
  }, []);

  const setFormDescription = useCallback((description: string) => {
    setForm((prev) => ({ ...prev, description }));
    setIsDirty(true);
  }, []);

  const setRequiredForCompletion = useCallback((required: boolean) => {
    setForm((prev) => ({ ...prev, requiredForCompletion: required }));
    setIsDirty(true);
  }, []);

  const setDisplayOrder = useCallback((order: number) => {
    setForm((prev) => ({ ...prev, displayOrder: order }));
    setIsDirty(true);
  }, []);

  const setActive = useCallback((active: boolean) => {
    setForm((prev) => ({ ...prev, isActive: active }));
    setIsDirty(true);
  }, []);

  // Field operations
  const addFieldField = useCallback((fieldType: DataCollectionFieldType) => {
    setForm((prev) => FormBuilderService.addField(prev, fieldType));
    setIsDirty(true);
  }, []);

  const removeFieldField = useCallback((fieldId: string) => {
    setForm((prev) => FormBuilderService.removeField(prev, fieldId));
    if (currentFieldId === fieldId) {
      setCurrentFieldId(undefined);
    }
    setIsDirty(true);
  }, [currentFieldId]);

  const selectFieldField = useCallback((fieldId: string) => {
    setCurrentFieldId(fieldId);
  }, []);

  const deselectFieldField = useCallback(() => {
    setCurrentFieldId(undefined);
  }, []);

  const updateFieldField = useCallback(
    (fieldId: string, updates: Partial<FormFieldDefinition>) => {
      setForm((prev) => FormBuilderService.updateField(prev, fieldId, updates));
      setIsDirty(true);
    },
    []
  );

  const reorderFieldsField = useCallback((sourceIndex: number, destIndex: number) => {
    setForm((prev) => FormBuilderService.reorderFields(prev, sourceIndex, destIndex));
    setIsDirty(true);
  }, []);

  const duplicateFieldField = useCallback((fieldId: string) => {
    setForm((prev) => FormBuilderService.duplicateField(prev, fieldId));
    setIsDirty(true);
  }, []);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors = FormBuilderService.validateForm(form);
    setErrors(newErrors);
    return newErrors;
  }, [form]);

  // Save form
  const saveForm = useCallback(async () => {
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      throw new Error('Form validation failed');
    }

    try {
      setIsSaving(true);

      if (form.id) {
        // Update existing form
        const updatedForm = await dataCollectionApi.updateDataCollectionForm(form.id, form);
        setForm(updatedForm);
      } else {
        // Create new form
        const createdForm = await dataCollectionApi.createDataCollectionForm(
          form.routingOperationId,
          form
        );
        setForm(createdForm);
      }

      setIsDirty(false);
      onFormSaved?.(form);
    } finally {
      setIsSaving(false);
    }
  }, [form, validateForm, onFormSaved]);

  // Load form
  const loadForm = useCallback(async (id: string) => {
    await loadFormData(id);
  }, [loadFormData]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setForm(FormBuilderService.createEmptyForm(routingOperationId));
    setCurrentFieldId(undefined);
    setIsDirty(false);
    setErrors({});
  }, [routingOperationId]);

  // Clone form
  const cloneFormForm = useCallback(
    async (newName: string) => {
      try {
        setIsSaving(true);

        const clonedForm = FormBuilderService.cloneForm(form, newName);
        const createdForm = await dataCollectionApi.createDataCollectionForm(
          routingOperationId,
          clonedForm
        );

        setForm(createdForm);
        setIsDirty(false);
        onFormSaved?.(createdForm);
      } finally {
        setIsSaving(false);
      }
    },
    [form, routingOperationId, onFormSaved]
  );

  // Export form to JSON
  const exportForm = useCallback(() => {
    return FormBuilderService.exportFormToJSON(form);
  }, [form]);

  // Import form from JSON
  const importForm = useCallback((json: string) => {
    const importedForm = FormBuilderService.importFormFromJSON(json);
    if (importedForm) {
      setForm({ ...importedForm, routingOperationId });
      setIsDirty(true);
      return true;
    }
    return false;
  }, [routingOperationId]);

  // Mark as saved (for undo/redo integration)
  const markAsSaved = useCallback(() => {
    setIsDirty(false);
  }, []);

  return {
    // State
    form,
    currentFieldId,
    isDirty,
    isSaving,
    isLoading,
    errors,

    // Form operations
    setFormName,
    setFormDescription,
    setRequiredForCompletion,
    setDisplayOrder,
    setActive,

    // Field operations
    addField: addFieldField,
    removeField: removeFieldField,
    selectField: selectFieldField,
    deselectField: deselectFieldField,
    updateField: updateFieldField,
    reorderFields: reorderFieldsField,
    duplicateField: duplicateFieldField,

    // Form operations
    validateForm,
    saveForm,
    loadForm,
    resetForm,
    cloneForm: cloneFormForm,
    exportForm,
    importForm,
    markAsSaved,
  };
};

export default useFormBuilder;
