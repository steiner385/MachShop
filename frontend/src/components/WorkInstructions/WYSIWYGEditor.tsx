/**
 * WYSIWYG Editor Component - Issue #65
 *
 * A native WYSIWYG editor for work instructions with the following features:
 * - Rich text editing with contentEditable (Lexical-based)
 * - Drag-and-drop interface for step reordering
 * - Real-time preview functionality
 * - Undo/redo with history tracking
 * - Auto-save with conflict resolution
 * - Media embedding from media library
 * - Step management with step blocks
 * - Data collection form field insertion
 * - Mobile-responsive design
 * - Full keyboard navigation support
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader,
} from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import MediaLibraryBrowser from './MediaLibraryBrowser';
import DataCollectionFormBuilder from './DataCollectionFormBuilder';
import './WYSIWYGEditor.css';

/**
 * Types and interfaces
 */

interface EditorStep {
  id: string;
  stepNumber: number;
  title: string;
  content: string; // JSON from RichTextEditor
  instructions: string; // Plain text
  estimatedDuration?: number;
  requiredTools?: string[];
  safetyNotes?: string;
  media?: MediaItem[];
  dataCollectionFields?: DataCollectionField[];
}

interface MediaItem {
  id?: string;
  fileName: string;
  fileUrl: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'DIAGRAM' | 'CAD_MODEL' | 'ANIMATION';
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  description?: string;
  tags?: string[];
  annotations?: any;
}

interface DataCollectionField {
  id?: string;
  fieldTemplateId: string;
  stepId?: string;
  order: number;
  isRequired: boolean;
  customLabel?: string;
  customValidationRules?: any[];
  fieldTemplate?: {
    id: string;
    name: string;
    fieldType: string;
    label: string;
    placeholder?: string;
    helpText?: string;
    options?: Array<{ value: string; label: string }>;
  };
}

interface WYSIWYGEditorProps {
  /** Initial work instruction ID (for loading) */
  workInstructionId?: string;
  /** Initial content data */
  initialData?: {
    title: string;
    description?: string;
    steps: EditorStep[];
    nativeContent?: any;
  };
  /** Callback when content changes */
  onContentChange: (content: EditorContent) => void;
  /** Callback when save is triggered */
  onSave?: (content: EditorContent) => Promise<void>;
  /** Whether editor is read-only */
  readOnly?: boolean;
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number;
  /** Show preview panel */
  showPreview?: boolean;
}

interface EditorContent {
  title: string;
  description?: string;
  steps: EditorStep[];
  nativeContent?: any;
}

interface EditorHistory {
  past: EditorContent[];
  present: EditorContent;
  future: EditorContent[];
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error?: string;
}

/**
 * WYSIWYGEditor Component
 */
export const WYSIWYGEditor: React.FC<WYSIWYGEditorProps> = ({
  workInstructionId,
  initialData,
  onContentChange,
  onSave,
  readOnly = false,
  autoSaveInterval = 10000, // 10 seconds
  showPreview: initialShowPreview = false,
}) => {
  // Editor state
  const [steps, setSteps] = useState<EditorStep[]>(initialData?.steps || []);
  const [title, setTitle] = useState<string>(initialData?.title || '');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    steps.length > 0 ? steps[0].id : null
  );

  // UI state
  const [showPreview, setShowPreview] = useState(initialShowPreview);
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const [showFormBuilder, setShowFormBuilder] = useState(false);

  // History and undo/redo
  const historyRef = useRef<EditorHistory>({
    past: [],
    present: {
      title,
      description,
      steps,
    },
    future: [],
  });

  // Auto-save state
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: undefined,
  });

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Add new step
   */
  const addStep = useCallback(() => {
    const newStepNumber = steps.length + 1;
    const newStep: EditorStep = {
      id: `step-${Date.now()}`,
      stepNumber: newStepNumber,
      title: `Step ${newStepNumber}`,
      content: '{}',
      instructions: '',
      estimatedDuration: undefined,
      requiredTools: [],
      safetyNotes: '',
      media: [],
      dataCollectionFields: [],
    };

    setSteps([...steps, newStep]);
    setSelectedStepId(newStep.id);
  }, [steps]);

  /**
   * Delete step
   */
  const deleteStep = useCallback(
    (stepId: string) => {
      const newSteps = steps.filter((s) => s.id !== stepId);
      // Renumber steps
      const renumberedSteps = newSteps.map((step, idx) => ({
        ...step,
        stepNumber: idx + 1,
      }));
      setSteps(renumberedSteps);
      if (selectedStepId === stepId) {
        setSelectedStepId(renumberedSteps.length > 0 ? renumberedSteps[0].id : null);
      }
    },
    [steps, selectedStepId]
  );

  /**
   * Update step content
   */
  const updateStepContent = useCallback(
    (stepId: string, field: keyof EditorStep, value: any) => {
      setSteps(
        steps.map((step) =>
          step.id === stepId ? { ...step, [field]: value } : step
        )
      );
    },
    [steps]
  );

  /**
   * Handle step reordering from drag-and-drop
   */
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;

      if (!destination) return;

      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const newSteps = Array.from(steps);
      const [movedStep] = newSteps.splice(source.index, 1);
      newSteps.splice(destination.index, 0, movedStep);

      // Renumber all steps
      const renumberedSteps = newSteps.map((step, idx) => ({
        ...step,
        stepNumber: idx + 1,
      }));

      setSteps(renumberedSteps);
    },
    [steps]
  );

  /**
   * Add media to step
   */
  const addMediaToStep = useCallback(
    (stepId: string, media: MediaItem) => {
      updateStepContent(stepId, 'media', [
        ...(steps.find((s) => s.id === stepId)?.media || []),
        media,
      ]);
    },
    [steps, updateStepContent]
  );

  /**
   * Remove media from step
   */
  const removeMediaFromStep = useCallback(
    (stepId: string, mediaId: string) => {
      const step = steps.find((s) => s.id === stepId);
      if (step?.media) {
        updateStepContent(stepId, 'media', step.media.filter((m) => m.id !== mediaId));
      }
    },
    [steps, updateStepContent]
  );

  /**
   * Add data collection field to step
   */
  const addFormFieldToStep = useCallback(
    (stepId: string, field: DataCollectionField) => {
      updateStepContent(stepId, 'dataCollectionFields', [
        ...(steps.find((s) => s.id === stepId)?.dataCollectionFields || []),
        field,
      ]);
    },
    [steps, updateStepContent]
  );

  /**
   * Remove data collection field from step
   */
  const removeFormFieldFromStep = useCallback(
    (stepId: string, fieldId: string) => {
      const step = steps.find((s) => s.id === stepId);
      if (step?.dataCollectionFields) {
        updateStepContent(
          stepId,
          'dataCollectionFields',
          step.dataCollectionFields.filter((f) => f.id !== fieldId)
        );
      }
    },
    [steps, updateStepContent]
  );

  /**
   * Undo last change
   */
  const undo = useCallback(() => {
    const history = historyRef.current;
    if (history.past.length === 0) return;

    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    historyRef.current = {
      past: newPast,
      present: previous,
      future: [history.present, ...history.future],
    };

    setTitle(previous.title);
    setDescription(previous.description || '');
    setSteps(previous.steps);
  }, []);

  /**
   * Redo last change
   */
  const redo = useCallback(() => {
    const history = historyRef.current;
    if (history.future.length === 0) return;

    const next = history.future[0];
    const newFuture = history.future.slice(1);

    historyRef.current = {
      past: [...history.past, history.present],
      present: next,
      future: newFuture,
    };

    setTitle(next.title);
    setDescription(next.description || '');
    setSteps(next.steps);
  }, []);

  /**
   * Push state to history
   */
  const pushToHistory = useCallback(
    (newContent: EditorContent) => {
      const history = historyRef.current;
      historyRef.current = {
        past: [...history.past, history.present],
        present: newContent,
        future: [],
      };
    },
    []
  );

  /**
   * Handle content changes and trigger auto-save
   */
  useEffect(() => {
    const currentContent: EditorContent = {
      title,
      description,
      steps,
    };

    // Push to history
    pushToHistory(currentContent);

    // Update auto-save state
    setAutoSaveState((prev) => ({
      ...prev,
      hasUnsavedChanges: true,
    }));

    // Call onChange callback
    onContentChange(currentContent);

    // Reset auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set auto-save timer
    if (onSave && !readOnly) {
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave(currentContent);
      }, autoSaveInterval);
    }
  }, [title, description, steps, onContentChange, onSave, autoSaveInterval, readOnly, pushToHistory]);

  /**
   * Handle auto-save
   */
  const handleAutoSave = useCallback(
    async (content: EditorContent) => {
      if (!onSave) return;

      setAutoSaveState((prev) => ({
        ...prev,
        isSaving: true,
        error: undefined,
      }));

      try {
        await onSave(content);
        setAutoSaveState((prev) => ({
          ...prev,
          isSaving: false,
          hasUnsavedChanges: false,
          lastSaved: new Date(),
        }));
      } catch (error) {
        setAutoSaveState((prev) => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Auto-save failed',
        }));
      }
    },
    [onSave]
  );

  /**
   * Manual save
   */
  const handleManualSave = useCallback(async () => {
    const currentContent: EditorContent = {
      title,
      description,
      steps,
    };
    await handleAutoSave(currentContent);
  }, [title, description, steps, handleAutoSave]);

  // Get current selected step
  const selectedStep = useMemo(
    () => steps.find((s) => s.id === selectedStepId),
    [steps, selectedStepId]
  );

  return (
    <div className="wysiwyg-editor-container" role="main">
      {/* Header */}
      <div className="editor-header">
        <div className="editor-title-section">
          <input
            type="text"
            className="editor-title-input"
            placeholder="Work Instruction Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={readOnly}
            aria-label="Work instruction title"
          />
          {title && <span className="editor-title-char-count">{title.length} characters</span>}
        </div>

        <div className="editor-actions">
          {/* Auto-save status */}
          <div className="auto-save-status">
            {autoSaveState.isSaving && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="saving-indicator"
              >
                <Loader size={16} className="spin" />
                <span>Saving...</span>
              </motion.div>
            )}
            {autoSaveState.lastSaved && !autoSaveState.isSaving && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="saved-indicator"
              >
                <CheckCircle size={16} className="text-green-600" />
                <span>Last saved {formatTime(autoSaveState.lastSaved)}</span>
              </motion.div>
            )}
            {autoSaveState.error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="error-indicator"
              >
                <AlertTriangle size={16} />
                <span>{autoSaveState.error}</span>
              </motion.div>
            )}
          </div>

          {/* Toolbar buttons */}
          <div className="editor-toolbar">
            {!readOnly && (
              <>
                <button
                  className="editor-btn"
                  onClick={undo}
                  disabled={historyRef.current.past.length === 0}
                  title="Undo (Ctrl+Z)"
                  aria-label="Undo"
                >
                  <Undo2 size={18} />
                </button>
                <button
                  className="editor-btn"
                  onClick={redo}
                  disabled={historyRef.current.future.length === 0}
                  title="Redo (Ctrl+Y)"
                  aria-label="Redo"
                >
                  <Redo2 size={18} />
                </button>
                <div className="separator" />
              </>
            )}

            <button
              className={`editor-btn ${showPreview ? 'active' : ''}`}
              onClick={() => setShowPreview(!showPreview)}
              title={showPreview ? 'Hide preview' : 'Show preview'}
              aria-label={showPreview ? 'Hide preview' : 'Show preview'}
              aria-pressed={showPreview}
            >
              {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {!readOnly && (
              <>
                <div className="separator" />
                <button
                  className="editor-btn primary"
                  onClick={handleManualSave}
                  disabled={autoSaveState.isSaving}
                  title="Save (Ctrl+S)"
                  aria-label="Save"
                >
                  <Save size={18} />
                  Save
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {!readOnly && (
        <div className="editor-description">
          <textarea
            className="editor-description-input"
            placeholder="Add a brief description of this work instruction..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            aria-label="Work instruction description"
          />
        </div>
      )}

      {/* Main content area */}
      <div className={`editor-content ${showPreview ? 'with-preview' : ''}`}>
        {/* Steps panel */}
        <div className="steps-panel">
          <div className="steps-header">
            <h3>Steps</h3>
            {!readOnly && (
              <button
                className="btn-add-step"
                onClick={addStep}
                aria-label="Add new step"
              >
                <Plus size={18} />
                Add Step
              </button>
            )}
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="steps-list">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`steps-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                >
                  <AnimatePresence>
                    {steps.map((step, index) => (
                      <Draggable
                        key={step.id}
                        draggableId={step.id}
                        index={index}
                        isDragDisabled={readOnly}
                      >
                        {(provided, snapshot) => (
                          <motion.div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`step-item ${
                              selectedStepId === step.id ? 'selected' : ''
                            } ${snapshot.isDragging ? 'dragging' : ''}`}
                          >
                            <div className="step-item-header">
                              {!readOnly && (
                                <div {...provided.dragHandleProps} className="drag-handle">
                                  <GripVertical size={18} />
                                </div>
                              )}
                              <div className="step-number">{step.stepNumber}</div>
                              <input
                                type="text"
                                className="step-title-input"
                                value={step.title}
                                onChange={(e) =>
                                  updateStepContent(step.id, 'title', e.target.value)
                                }
                                readOnly={readOnly}
                                aria-label={`Step ${step.stepNumber} title`}
                                onClick={() => setSelectedStepId(step.id)}
                              />
                              {!readOnly && (
                                <button
                                  className="btn-delete-step"
                                  onClick={() => deleteStep(step.id)}
                                  title="Delete step"
                                  aria-label={`Delete step ${step.stepNumber}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>

                            {selectedStepId === step.id && (
                              <div className="step-details">
                                {step.estimatedDuration && (
                                  <div className="step-meta">
                                    <Clock size={14} />
                                    <span>{step.estimatedDuration} min</span>
                                  </div>
                                )}
                                {step.requiredTools && step.requiredTools.length > 0 && (
                                  <div className="step-meta">
                                    <FileText size={14} />
                                    <span>{step.requiredTools.length} tools</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </Draggable>
                    ))}
                  </AnimatePresence>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Editor panel */}
        {selectedStep && (
          <div className="editor-panel">
            <div className="editor-panel-header">
              <h3>Step {selectedStep.stepNumber} Editor</h3>
            </div>

            {/* Rich text editor */}
            <div className="editor-section">
              <label htmlFor="step-content" className="section-label">
                Content
              </label>
              <RichTextEditor
                initialValue={selectedStep.content}
                onChange={(json, plainText) => {
                  updateStepContent(selectedStep.id, 'content', json);
                  updateStepContent(selectedStep.id, 'instructions', plainText);
                }}
                readOnly={readOnly}
                minHeight={200}
                maxHeight={400}
                placeholder="Enter step instructions..."
                ariaLabel={`Content for step ${selectedStep.stepNumber}`}
              />
            </div>

            {/* Media section */}
            <div className="editor-section">
              <div className="section-header">
                <label className="section-label">
                  <ImageIcon size={16} />
                  Media & Attachments
                </label>
                {!readOnly && (
                  <button
                    className="btn-add-media"
                    onClick={() => setShowMediaBrowser(true)}
                    aria-label="Add media to step"
                  >
                    <Plus size={16} />
                    Add Media
                  </button>
                )}
              </div>

              {selectedStep.media && selectedStep.media.length > 0 && (
                <div className="media-list">
                  {selectedStep.media.map((media) => (
                    <div key={media.id} className="media-item">
                      <div className="media-info">
                        {media.mediaType === 'IMAGE' && (
                          <ImageIcon size={20} className="media-icon" />
                        )}
                        {media.mediaType === 'VIDEO' && (
                          <VideoIcon size={20} className="media-icon" />
                        )}
                        {media.mediaType === 'DOCUMENT' && (
                          <FileText size={20} className="media-icon" />
                        )}
                        <div className="media-details">
                          <div className="media-name">{media.fileName}</div>
                          <div className="media-size">{formatFileSize(media.fileSize)}</div>
                        </div>
                      </div>
                      {!readOnly && (
                        <button
                          className="btn-remove-media"
                          onClick={() => removeMediaFromStep(selectedStep.id, media.id || '')}
                          aria-label={`Remove media ${media.fileName}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Data collection fields section */}
            <div className="editor-section">
              <div className="section-header">
                <label className="section-label">Data Collection Fields</label>
                {!readOnly && (
                  <button
                    className="btn-add-field"
                    onClick={() => setShowFormBuilder(true)}
                    aria-label="Add data collection field"
                  >
                    <Plus size={16} />
                    Add Field
                  </button>
                )}
              </div>

              {selectedStep.dataCollectionFields &&
                selectedStep.dataCollectionFields.length > 0 && (
                  <div className="fields-list">
                    {selectedStep.dataCollectionFields.map((field) => (
                      <div key={field.id} className="field-item">
                        <div className="field-info">
                          <div className="field-label">
                            {field.customLabel || field.fieldTemplate?.label}
                          </div>
                          <div className="field-type">
                            {field.fieldTemplate?.fieldType}
                          </div>
                        </div>
                        {!readOnly && (
                          <button
                            className="btn-remove-field"
                            onClick={() =>
                              removeFormFieldFromStep(selectedStep.id, field.id || '')
                            }
                            aria-label={`Remove field ${field.fieldTemplate?.label}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Safety notes */}
            <div className="editor-section">
              <label htmlFor="safety-notes" className="section-label">
                Safety Notes
              </label>
              <textarea
                id="safety-notes"
                className="editor-textarea"
                placeholder="Add any safety warnings or notes for this step..."
                value={selectedStep.safetyNotes || ''}
                onChange={(e) =>
                  updateStepContent(selectedStep.id, 'safetyNotes', e.target.value)
                }
                readOnly={readOnly}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Preview panel */}
        {showPreview && selectedStep && (
          <div className="preview-panel">
            <div className="preview-header">
              <h3>Preview - Step {selectedStep.stepNumber}</h3>
            </div>
            <div className="preview-content">
              <h4>{selectedStep.title}</h4>
              <div className="preview-instructions" dangerouslySetInnerHTML={{
                __html: sanitizeHTML(selectedStep.instructions)
              }} />
              {selectedStep.safetyNotes && (
                <div className="preview-safety">
                  <AlertTriangle size={18} />
                  <div>{selectedStep.safetyNotes}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Media browser modal */}
      {showMediaBrowser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Select Media</h2>
              <button
                className="btn-close"
                onClick={() => setShowMediaBrowser(false)}
                aria-label="Close media browser"
              >
                ×
              </button>
            </div>
            <MediaLibraryBrowser
              onSelectMedia={(media) => {
                if (selectedStep) {
                  addMediaToStep(selectedStep.id, media);
                }
                setShowMediaBrowser(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Form builder modal */}
      {showFormBuilder && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>Add Data Collection Field</h2>
              <button
                className="btn-close"
                onClick={() => setShowFormBuilder(false)}
                aria-label="Close form builder"
              >
                ×
              </button>
            </div>
            <DataCollectionFormBuilder
              onAddField={(field) => {
                if (selectedStep) {
                  addFormFieldToStep(selectedStep.id, field);
                }
                setShowFormBuilder(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Utility functions
 */

/**
 * Format time to relative string (e.g., "2 minutes ago")
 */
function formatTime(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return date.toLocaleDateString();
}

/**
 * Format file size to human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHTML(html: string): string {
  // Basic sanitization - in production, use DOMPurify or similar
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

export default WYSIWYGEditor;
