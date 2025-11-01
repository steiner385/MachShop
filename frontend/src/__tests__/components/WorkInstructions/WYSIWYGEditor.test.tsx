/**
 * WYSIWYG Editor Tests - Issue #65
 * Comprehensive test suite for WYSIWYGEditor component
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WYSIWYGEditor } from '../../../components/WorkInstructions/WYSIWYGEditor';

/**
 * Mock dependencies
 */
vi.mock('../../../components/WorkInstructions/RichTextEditor', () => ({
  default: ({ onChange, placeholder, readOnly }: any) => (
    <div data-testid="rich-text-editor">
      <textarea
        data-testid="editor-textarea"
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value, e.target.value)}
      />
    </div>
  ),
}));

vi.mock('../../../components/WorkInstructions/MediaLibraryBrowser', () => ({
  default: ({ onSelectMedia }: any) => (
    <div data-testid="media-library-browser">
      <button
        data-testid="select-media-btn"
        onClick={() =>
          onSelectMedia({
            id: 'media-1',
            fileName: 'test-image.jpg',
            fileUrl: '/uploads/test-image.jpg',
            mediaType: 'IMAGE',
            fileSize: 1024,
            mimeType: 'image/jpeg',
          })
        }
      >
        Select Media
      </button>
    </div>
  ),
}));

vi.mock('../../../components/WorkInstructions/DataCollectionFormBuilder', () => ({
  default: ({ onAddField }: any) => (
    <div data-testid="data-collection-form-builder">
      <button
        data-testid="add-field-btn"
        onClick={() =>
          onAddField({
            id: 'field-1',
            fieldTemplateId: 'template-1',
            order: 0,
            isRequired: true,
            fieldTemplate: {
              id: 'template-1',
              name: 'Test Field',
              fieldType: 'TEXT',
              label: 'Test Field Label',
            },
          })
        }
      >
        Add Field
      </button>
    </div>
  ),
}));

/**
 * Test fixtures
 */
const mockInitialData = {
  title: 'Test Work Instruction',
  description: 'This is a test instruction',
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      title: 'Step 1',
      content: '{}',
      instructions: 'First step instructions',
      estimatedDuration: 5,
      requiredTools: ['Tool A'],
      safetyNotes: 'Be careful',
      media: [],
      dataCollectionFields: [],
    },
    {
      id: 'step-2',
      stepNumber: 2,
      title: 'Step 2',
      content: '{}',
      instructions: 'Second step instructions',
      estimatedDuration: 10,
      requiredTools: [],
      safetyNotes: '',
      media: [],
      dataCollectionFields: [],
    },
  ],
};

/**
 * Test suite
 */
describe('WYSIWYGEditor Component', () => {
  let mockOnContentChange: any;
  let mockOnSave: any;

  beforeEach(() => {
    mockOnContentChange = vi.fn();
    mockOnSave = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Basic rendering tests
   */
  describe('Rendering', () => {
    it('should render the editor container', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should render the title input with initial value', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const titleInput = screen.getByDisplayValue('Test Work Instruction');
      expect(titleInput).toBeInTheDocument();
    });

    it('should render the description textarea with initial value', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const descriptionInput = screen.getByDisplayValue(
        'This is a test instruction'
      );
      expect(descriptionInput).toBeInTheDocument();
    });

    it('should render all initial steps', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      expect(screen.getByDisplayValue('Step 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Step 2')).toBeInTheDocument();
    });

    it('should render with read-only mode', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
          readOnly={true}
        />
      );

      const titleInput = screen.getByDisplayValue(
        'Test Work Instruction'
      ) as HTMLInputElement;
      expect(titleInput.readOnly).toBe(true);
    });
  });

  /**
   * Step management tests
   */
  describe('Step Management', () => {
    it('should add a new step', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const addStepBtn = screen.getByRole('button', { name: /add step/i });
      await user.click(addStepBtn);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Step 3')).toBeInTheDocument();
      });

      expect(mockOnContentChange).toHaveBeenCalled();
    });

    it('should delete a step', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const deleteButtons = screen.getAllByRole('button', {
        name: /delete step/i,
      });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('Step 1')).not.toBeInTheDocument();
      });

      expect(mockOnContentChange).toHaveBeenCalled();
    });

    it('should update step title', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const stepTitleInput = screen.getByDisplayValue('Step 1');
      await user.clear(stepTitleInput);
      await user.type(stepTitleInput, 'Updated Step Title');

      await waitFor(() => {
        expect(screen.getByDisplayValue('Updated Step Title')).toBeInTheDocument();
      });
    });

    it('should renumber steps after deletion', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      // Delete first step
      const deleteButtons = screen.getAllByRole('button', {
        name: /delete step/i,
      });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Step 1')).toHaveValue('Step 2');
      });
    });
  });

  /**
   * Editor content tests
   */
  describe('Editor Content', () => {
    it('should update title', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const titleInput = screen.getByDisplayValue(
        'Test Work Instruction'
      ) as HTMLInputElement;
      await user.clear(titleInput);
      await user.type(titleInput, 'New Title');

      await waitFor(() => {
        expect(titleInput.value).toBe('New Title');
      });

      expect(mockOnContentChange).toHaveBeenCalled();
    });

    it('should update description', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const descriptionInput = screen.getByDisplayValue(
        'This is a test instruction'
      ) as HTMLTextAreaElement;
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'New description');

      await waitFor(() => {
        expect(descriptionInput.value).toBe('New description');
      });

      expect(mockOnContentChange).toHaveBeenCalled();
    });

    it('should display character count for title', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      // "Test Work Instruction" is 21 characters
      expect(screen.getByText(/21 characters/)).toBeInTheDocument();
    });
  });

  /**
   * Step selection tests
   */
  describe('Step Selection', () => {
    it('should select first step by default', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      // First step title input should be in the document
      expect(screen.getByDisplayValue('Step 1')).toBeInTheDocument();
    });

    it('should allow selecting a step by clicking', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const step2TitleInput = screen.getByDisplayValue('Step 2');
      await user.click(step2TitleInput);

      // Step 2 should be selected (has visual feedback)
      const stepItems = screen.getAllByRole('button', {
        name: /delete step/i,
      });
      expect(stepItems.length).toBeGreaterThan(0);
    });
  });

  /**
   * Media integration tests
   */
  describe('Media Management', () => {
    it('should open media browser modal', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const addMediaBtn = screen.getByRole('button', { name: /add media/i });
      await user.click(addMediaBtn);

      expect(screen.getByTestId('media-library-browser')).toBeInTheDocument();
    });

    it('should add media to step', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const addMediaBtn = screen.getByRole('button', { name: /add media/i });
      await user.click(addMediaBtn);

      const selectMediaBtn = screen.getByTestId('select-media-btn');
      await user.click(selectMediaBtn);

      await waitFor(() => {
        expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      });

      expect(mockOnContentChange).toHaveBeenCalled();
    });

    it('should remove media from step', async () => {
      const user = userEvent.setup();
      const dataWithMedia = {
        ...mockInitialData,
        steps: [
          {
            ...mockInitialData.steps[0],
            media: [
              {
                id: 'media-1',
                fileName: 'test-image.jpg',
                fileUrl: '/uploads/test-image.jpg',
                mediaType: 'IMAGE' as const,
                fileSize: 1024,
                mimeType: 'image/jpeg',
              },
            ],
          },
          mockInitialData.steps[1],
        ],
      };

      render(
        <WYSIWYGEditor
          initialData={dataWithMedia}
          onContentChange={mockOnContentChange}
        />
      );

      const removeButtons = screen.getAllByRole('button', {
        name: /remove media/i,
      });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('test-image.jpg')).not.toBeInTheDocument();
      });
    });
  });

  /**
   * Data collection form tests
   */
  describe('Data Collection Fields', () => {
    it('should open form builder modal', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const addFieldBtn = screen.getByRole('button', { name: /add field/i });
      await user.click(addFieldBtn);

      expect(
        screen.getByTestId('data-collection-form-builder')
      ).toBeInTheDocument();
    });

    it('should add data collection field to step', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const addFieldBtn = screen.getByRole('button', { name: /add field/i });
      await user.click(addFieldBtn);

      const addFieldBtnInModal = screen.getByTestId('add-field-btn');
      await user.click(addFieldBtnInModal);

      await waitFor(() => {
        expect(screen.getByText('Test Field Label')).toBeInTheDocument();
      });

      expect(mockOnContentChange).toHaveBeenCalled();
    });

    it('should remove data collection field from step', async () => {
      const user = userEvent.setup();
      const dataWithField = {
        ...mockInitialData,
        steps: [
          {
            ...mockInitialData.steps[0],
            dataCollectionFields: [
              {
                id: 'field-1',
                fieldTemplateId: 'template-1',
                order: 0,
                isRequired: true,
                fieldTemplate: {
                  id: 'template-1',
                  name: 'Test Field',
                  fieldType: 'TEXT',
                  label: 'Test Field Label',
                },
              },
            ],
          },
          mockInitialData.steps[1],
        ],
      };

      render(
        <WYSIWYGEditor
          initialData={dataWithField}
          onContentChange={mockOnContentChange}
        />
      );

      const removeFieldBtns = screen.getAllByRole('button', {
        name: /remove field/i,
      });
      await user.click(removeFieldBtns[0]);

      await waitFor(() => {
        expect(screen.queryByText('Test Field Label')).not.toBeInTheDocument();
      });
    });
  });

  /**
   * Preview tests
   */
  describe('Preview', () => {
    it('should toggle preview visibility', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
          showPreview={false}
        />
      );

      const previewBtn = screen.getByRole('button', { name: /show preview/i });
      expect(previewBtn).toHaveAttribute('aria-pressed', 'false');

      await user.click(previewBtn);

      await waitFor(() => {
        expect(previewBtn).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should display preview panel when enabled', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
          showPreview={true}
        />
      );

      const previewHeader = screen.getByText(/Preview - Step/);
      expect(previewHeader).toBeInTheDocument();
    });
  });

  /**
   * Auto-save tests
   */
  describe('Auto-save', () => {
    it('should call onSave after content changes', async () => {
      vi.useFakeTimers();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
          onSave={mockOnSave}
          autoSaveInterval={1000}
        />
      );

      // Change content
      const titleInput = screen.getByDisplayValue(
        'Test Work Instruction'
      ) as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      // Fast-forward time
      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('should handle auto-save errors gracefully', async () => {
      vi.useFakeTimers();
      const saveError = new Error('Save failed');
      mockOnSave.mockRejectedValueOnce(saveError);

      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
          onSave={mockOnSave}
          autoSaveInterval={1000}
        />
      );

      // Change content
      const titleInput = screen.getByDisplayValue(
        'Test Work Instruction'
      ) as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      // Fast-forward time
      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('should display save status', async () => {
      vi.useFakeTimers();
      const { rerender } = render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
          onSave={mockOnSave}
          autoSaveInterval={1000}
        />
      );

      const titleInput = screen.getByDisplayValue(
        'Test Work Instruction'
      ) as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      vi.advanceTimersByTime(1100);

      await waitFor(() => {
        expect(screen.getByText(/Saving/)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  /**
   * Keyboard shortcut tests
   */
  describe('Keyboard Shortcuts', () => {
    it('should handle manual save via toolbar button', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
          onSave={mockOnSave}
        />
      );

      const saveBtn = screen.getByRole('button', { name: /save/i });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  /**
   * Content change callback tests
   */
  describe('Content Change Callback', () => {
    it('should call onContentChange with updated content', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const titleInput = screen.getByDisplayValue(
        'Test Work Instruction'
      ) as HTMLInputElement;
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Updated Title',
            steps: expect.any(Array),
          })
        );
      });
    });

    it('should include all steps in content change callback', async () => {
      const user = userEvent.setup();
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      const addStepBtn = screen.getByRole('button', { name: /add step/i });
      await user.click(addStepBtn);

      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalledWith(
          expect.objectContaining({
            steps: expect.arrayContaining([
              expect.objectContaining({ stepNumber: 1 }),
              expect.objectContaining({ stepNumber: 2 }),
              expect.objectContaining({ stepNumber: 3 }),
            ]),
          })
        );
      });
    });
  });

  /**
   * Accessibility tests
   */
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      expect(screen.getByLabelText(/work instruction title/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/work instruction description/i)
      ).toBeInTheDocument();
    });

    it('should have main role', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have button labels', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
        />
      );

      expect(screen.getByRole('button', { name: /add step/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  /**
   * Edge cases
   */
  describe('Edge Cases', () => {
    it('should handle empty initial data', () => {
      render(
        <WYSIWYGEditor
          onContentChange={mockOnContentChange}
        />
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should handle no steps', () => {
      const dataWithoutSteps = {
        title: 'Test',
        steps: [],
      };

      render(
        <WYSIWYGEditor
          initialData={dataWithoutSteps}
          onContentChange={mockOnContentChange}
        />
      );

      const addStepBtn = screen.getByRole('button', { name: /add step/i });
      expect(addStepBtn).toBeInTheDocument();
    });

    it('should disable actions when read-only', () => {
      render(
        <WYSIWYGEditor
          initialData={mockInitialData}
          onContentChange={mockOnContentChange}
          readOnly={true}
        />
      );

      const addStepBtn = screen.queryByRole('button', { name: /add step/i });
      expect(addStepBtn).not.toBeInTheDocument();
    });
  });
});
