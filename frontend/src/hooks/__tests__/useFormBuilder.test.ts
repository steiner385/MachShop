/**
 * useFormBuilder Hook Tests (Issue #45 - Phase 3)
 * Comprehensive test suite for form builder state management hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFormBuilder } from '../useFormBuilder';
import * as dataCollectionApi from '@/api/dataCollectionApi';

// Mock the API
vi.mock('@/api/dataCollectionApi', () => ({
  dataCollectionApi: {
    getDataCollectionForm: vi.fn(),
    createDataCollectionForm: vi.fn(),
    updateDataCollectionForm: vi.fn(),
  },
}));

describe('useFormBuilder', () => {
  const mockRoutingOperationId = 'test-routing-op-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty form', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      expect(result.current.form.formName).toBe('New Form');
      expect(result.current.form.fields).toEqual([]);
      expect(result.current.form.routingOperationId).toBe(mockRoutingOperationId);
    });

    it('should initialize with clean state', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      expect(result.current.isDirty).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentFieldId).toBeUndefined();
    });

    it('should initialize errors as empty object', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      expect(result.current.errors).toEqual({});
    });
  });

  describe('form metadata operations', () => {
    it('should update form name', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.setFormName('New Form Name');
      });

      expect(result.current.form.formName).toBe('New Form Name');
      expect(result.current.isDirty).toBe(true);
    });

    it('should update form description', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.setFormDescription('Test description');
      });

      expect(result.current.form.description).toBe('Test description');
      expect(result.current.isDirty).toBe(true);
    });

    it('should update required for completion', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.setRequiredForCompletion(true);
      });

      expect(result.current.form.requiredForCompletion).toBe(true);
      expect(result.current.isDirty).toBe(true);
    });

    it('should update display order', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.setDisplayOrder(5);
      });

      expect(result.current.form.displayOrder).toBe(5);
      expect(result.current.isDirty).toBe(true);
    });

    it('should update active status', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.setActive(false);
      });

      expect(result.current.form.isActive).toBe(false);
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('field operations', () => {
    it('should add a field', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.addField('TEXT');
      });

      expect(result.current.form.fields).toHaveLength(1);
      expect(result.current.form.fields[0].dataType).toBe('TEXT');
      expect(result.current.isDirty).toBe(true);
    });

    it('should remove a field', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.addField('TEXT');
      });

      const fieldId = result.current.form.fields[0].id;

      act(() => {
        result.current.removeField(fieldId);
      });

      expect(result.current.form.fields).toHaveLength(0);
      expect(result.current.isDirty).toBe(true);
    });

    it('should select a field', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.addField('TEXT');
      });

      const fieldId = result.current.form.fields[0].id;

      act(() => {
        result.current.selectField(fieldId);
      });

      expect(result.current.currentFieldId).toBe(fieldId);
    });

    it('should deselect a field', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.addField('TEXT');
      });

      const fieldId = result.current.form.fields[0].id;

      act(() => {
        result.current.selectField(fieldId);
      });

      act(() => {
        result.current.deselectField();
      });

      expect(result.current.currentFieldId).toBeUndefined();
    });

    it('should update a field', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.addField('TEXT');
      });

      const fieldId = result.current.form.fields[0].id;

      act(() => {
        result.current.updateField(fieldId, {
          displayLabel: 'Updated Label',
          required: true,
        });
      });

      expect(result.current.form.fields[0].displayLabel).toBe('Updated Label');
      expect(result.current.form.fields[0].required).toBe(true);
      expect(result.current.isDirty).toBe(true);
    });

    it('should reorder fields', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.addField('TEXT');
        result.current.addField('NUMBER');
        result.current.addField('TEXTAREA');
      });

      act(() => {
        result.current.reorderFields(0, 2);
      });

      expect(result.current.form.fields[0].dataType).toBe('NUMBER');
      expect(result.current.form.fields[2].dataType).toBe('TEXT');
      expect(result.current.isDirty).toBe(true);
    });

    it('should duplicate a field', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.addField('TEXT');
      });

      const fieldId = result.current.form.fields[0].id;

      act(() => {
        result.current.duplicateField(fieldId);
      });

      expect(result.current.form.fields).toHaveLength(2);
      expect(result.current.form.fields[0].id).not.toBe(result.current.form.fields[1].id);
      expect(result.current.isDirty).toBe(true);
    });

    it('should clear current field when it is removed', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.addField('TEXT');
      });

      const fieldId = result.current.form.fields[0].id;

      act(() => {
        result.current.selectField(fieldId);
      });

      act(() => {
        result.current.removeField(fieldId);
      });

      expect(result.current.currentFieldId).toBeUndefined();
    });
  });

  describe('form validation', () => {
    it('should validate empty form', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      const errors = result.current.validateForm();

      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should validate form with fields', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.setFormName('Test Form');
        result.current.addField('TEXT');
      });

      const errors = result.current.validateForm();

      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should collect validation errors', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.validateForm();
      });

      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
    });
  });

  describe('form persistence', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.setFormName('Changed Form');
        result.current.addField('TEXT');
      });

      expect(result.current.form.formName).toBe('Changed Form');
      expect(result.current.form.fields).toHaveLength(1);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.form.formName).toBe('New Form');
      expect(result.current.form.fields).toHaveLength(0);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.currentFieldId).toBeUndefined();
    });

    it('should mark form as saved', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.setFormName('Changed');
      });

      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.markAsSaved();
      });

      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('import/export', () => {
    it('should export form to JSON', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.setFormName('Test Form');
        result.current.addField('TEXT');
      });

      const json = result.current.exportForm();
      const parsed = JSON.parse(json);

      expect(parsed.formName).toBe('Test Form');
      expect(parsed.fields).toHaveLength(1);
    });

    it('should import form from JSON', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      const formData = {
        routingOperationId: mockRoutingOperationId,
        formName: 'Imported Form',
        description: 'Test description',
        version: '1.0.0',
        fields: [],
        requiredForCompletion: false,
        displayOrder: 0,
        isActive: true,
      };
      const json = JSON.stringify(formData);

      act(() => {
        result.current.importForm(json);
      });

      expect(result.current.form.formName).toBe('Imported Form');
      expect(result.current.form.description).toBe('Test description');
      expect(result.current.isDirty).toBe(true);
    });

    it('should handle invalid import JSON gracefully', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      const success = result.current.importForm('invalid json');

      expect(success).toBe(false);
    });
  });

  describe('clone form', () => {
    it('should clone form with new name', async () => {
      const mockCreatedForm = {
        id: 'created-form-id',
        routingOperationId: mockRoutingOperationId,
        formName: 'Cloned Form',
        fields: [],
        version: '1.0.0',
        requiredForCompletion: false,
        displayOrder: 0,
        isActive: true,
      };

      vi.mocked(dataCollectionApi.dataCollectionApi.createDataCollectionForm).mockResolvedValueOnce(
        mockCreatedForm
      );

      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.setFormName('Original Form');
        result.current.addField('TEXT');
      });

      await act(async () => {
        await result.current.cloneForm('Cloned Form');
      });

      await waitFor(() => {
        expect(result.current.form.formName).toBe('Cloned Form');
        expect(result.current.isDirty).toBe(false);
      });
    });
  });

  describe('dirty state tracking', () => {
    it('should track dirty state on changes', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.setFormName('Changed');
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should track dirty state on field additions', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.addField('TEXT');
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should track dirty state on field removals', () => {
      const { result } = renderHook(() => useFormBuilder({ routingOperationId: mockRoutingOperationId }));

      act(() => {
        result.current.addField('TEXT');
      });

      const fieldId = result.current.form.fields[0].id;

      // Reset dirty state
      act(() => {
        result.current.markAsSaved();
      });

      act(() => {
        result.current.removeField(fieldId);
      });

      expect(result.current.isDirty).toBe(true);
    });
  });
});
