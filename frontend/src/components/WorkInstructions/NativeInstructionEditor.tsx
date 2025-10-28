import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useDropzone } from 'react-dropzone';
import Select from 'react-select';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  Upload,
  Image,
  Video,
  FileText,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Download,
  Settings,
  Tag,
  Clock,
  User,
  AlertTriangle,
} from 'lucide-react';

// ✅ GITHUB ISSUE #18 - Phase 4: NativeInstructionEditor Component

interface WorkInstructionData {
  id?: string;
  title: string;
  description: string;
  version: string;
  partId: string;
  status: string;
  tags: string[];
  categories: string[];
  keywords: string[];
  nativeContent: any;
  contentFormat: string;
  exportTemplateId?: string;
  steps: WorkInstructionStep[];
  media: MediaItem[];
  dataCollectionFields: DataCollectionField[];
}

interface WorkInstructionStep {
  id?: string;
  stepNumber: number;
  title: string;
  description: string;
  instructions: string;
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
  mediaType: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  description?: string;
  tags?: string[];
  stepId?: string;
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

interface ExportTemplate {
  id: string;
  name: string;
  format: string;
  description?: string;
}

interface NativeInstructionEditorProps {
  workInstruction?: WorkInstructionData;
  onSave: (data: WorkInstructionData) => Promise<void>;
  onPreview?: (data: WorkInstructionData) => void;
  onExport?: (data: WorkInstructionData, format: string) => void;
  exportTemplates?: ExportTemplate[];
  fieldTemplates?: any[];
  isLoading?: boolean;
  readOnly?: boolean;
}

const validationSchema = yup.object({
  title: yup.string().required('Title is required').min(3, 'Title must be at least 3 characters'),
  description: yup.string().required('Description is required'),
  version: yup.string().required('Version is required'),
  partId: yup.string().required('Part ID is required'),
  steps: yup.array().of(
    yup.object({
      title: yup.string().required('Step title is required'),
      description: yup.string().required('Step description is required'),
      instructions: yup.string().required('Step instructions are required'),
      stepNumber: yup.number().required().positive(),
    })
  ).min(1, 'At least one step is required'),
});

const NativeInstructionEditor: React.FC<NativeInstructionEditorProps> = ({
  workInstruction,
  onSave,
  onPreview,
  onExport,
  exportTemplates = [],
  fieldTemplates = [],
  isLoading = false,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'steps' | 'media' | 'fields' | 'settings'>('content');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [selectedExportTemplate, setSelectedExportTemplate] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<WorkInstructionData>({
    resolver: yupResolver(validationSchema),
    defaultValues: workInstruction || {
      title: '',
      description: '',
      version: '1.0',
      partId: '',
      status: 'DRAFT',
      tags: [],
      categories: [],
      keywords: [],
      nativeContent: {},
      contentFormat: 'NATIVE',
      steps: [
        {
          stepNumber: 1,
          title: '',
          description: '',
          instructions: '',
          requiredTools: [],
          dataCollectionFields: [],
          media: [],
        },
      ],
      media: [],
      dataCollectionFields: [],
    },
  });

  const watchedSteps = watch('steps');
  const watchedMedia = watch('media');

  // Quill modules configuration
  const quillModules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          ['link', 'image', 'video'],
          ['clean'],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
        ],
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    []
  );

  // File upload handling
  const onDrop = useCallback(
    (acceptedFiles: File[], stepId?: string) => {
      acceptedFiles.forEach((file) => {
        const fileId = `${Date.now()}-${file.name}`;
        setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

        // Simulate upload progress
        const uploadSimulation = setInterval(() => {
          setUploadProgress((prev) => {
            const currentProgress = prev[fileId] || 0;
            if (currentProgress >= 100) {
              clearInterval(uploadSimulation);
              return prev;
            }
            return { ...prev, [fileId]: currentProgress + 10 };
          });
        }, 200);

        // Create media item
        const mediaItem: MediaItem = {
          id: fileId,
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          mediaType: file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : 'DOCUMENT',
          fileSize: file.size,
          mimeType: file.type,
          stepId,
          tags: [],
        };

        // Add to appropriate location
        if (stepId) {
          const steps = getValues('steps');
          const stepIndex = steps.findIndex((step) => step.id === stepId);
          if (stepIndex >= 0) {
            const updatedSteps = [...steps];
            updatedSteps[stepIndex].media = [...(updatedSteps[stepIndex].media || []), mediaItem];
            setValue('steps', updatedSteps);
          }
        } else {
          const currentMedia = getValues('media');
          setValue('media', [...currentMedia, mediaItem]);
        }
      });
    },
    [getValues, setValue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.ogg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  // Step management
  const addStep = () => {
    const steps = getValues('steps');
    const newStep: WorkInstructionStep = {
      stepNumber: steps.length + 1,
      title: '',
      description: '',
      instructions: '',
      requiredTools: [],
      dataCollectionFields: [],
      media: [],
    };
    setValue('steps', [...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const steps = getValues('steps');
    if (steps.length > 1) {
      const updatedSteps = steps.filter((_, i) => i !== index);
      // Renumber steps
      updatedSteps.forEach((step, i) => {
        step.stepNumber = i + 1;
      });
      setValue('steps', updatedSteps);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const steps = Array.from(getValues('steps'));
    const [reorderedStep] = steps.splice(result.source.index, 1);
    steps.splice(result.destination.index, 0, reorderedStep);

    // Renumber steps
    steps.forEach((step, index) => {
      step.stepNumber = index + 1;
    });

    setValue('steps', steps);
  };

  // Data collection field management
  const addDataCollectionField = (stepId?: string) => {
    // This would open a modal to select from available field templates
    console.log('Add data collection field', stepId);
  };

  // Save handler
  const onSubmit = async (data: WorkInstructionData) => {
    setIsSaving(true);
    try {
      await onSave(data);
    } catch (error) {
      console.error('Failed to save work instruction:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Export handler
  const handleExport = (format: string) => {
    const data = getValues();
    onExport?.(data, format);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {workInstruction?.id ? 'Edit Work Instruction' : 'Create Work Instruction'}
            </h1>
            {isDirty && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <Clock className="w-3 h-3 mr-1" />
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {onPreview && (
              <button
                type="button"
                onClick={() => onPreview(getValues())}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={readOnly}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </button>
            )}
            {exportTemplates.length > 0 && (
              <div className="flex items-center space-x-2">
                <Select
                  value={exportTemplates.find((t) => t.id === selectedExportTemplate)}
                  onChange={(option) => setSelectedExportTemplate(option?.id || null)}
                  options={exportTemplates}
                  getOptionLabel={(option) => option.name}
                  getOptionValue={(option) => option.id}
                  placeholder="Export as..."
                  className="min-w-[150px]"
                  isDisabled={readOnly}
                />
                <button
                  type="button"
                  onClick={() => selectedExportTemplate && handleExport(selectedExportTemplate)}
                  disabled={!selectedExportTemplate || readOnly}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            )}
            <button
              type="submit"
              form="work-instruction-form"
              disabled={isSaving || readOnly}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          {[
            { id: 'content', label: 'Content', icon: FileText },
            { id: 'steps', label: 'Steps', icon: Plus },
            { id: 'media', label: 'Media', icon: Image },
            { id: 'fields', label: 'Data Collection', icon: Tag },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <form id="work-instruction-form" onSubmit={handleSubmit(onSubmit)} className="h-full">
          <div className="h-full overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {/* Content Tab */}
              {activeTab === 'content' && (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <Controller
                          name="title"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                                errors.title ? 'border-red-300' : ''
                              }`}
                              placeholder="Enter work instruction title"
                              disabled={readOnly}
                            />
                          )}
                        />
                        {errors.title && (
                          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                        <Controller
                          name="version"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="e.g., 1.0"
                              disabled={readOnly}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Part ID</label>
                        <Controller
                          name="partId"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                                errors.partId ? 'border-red-300' : ''
                              }`}
                              placeholder="Enter part ID"
                              disabled={readOnly}
                            />
                          )}
                        />
                        {errors.partId && (
                          <p className="mt-1 text-sm text-red-600">{errors.partId.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              disabled={readOnly}
                            >
                              <option value="DRAFT">Draft</option>
                              <option value="IN_REVIEW">In Review</option>
                              <option value="APPROVED">Approved</option>
                              <option value="REJECTED">Rejected</option>
                            </select>
                          )}
                        />
                      </div>
                    </div>
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <textarea
                            {...field}
                            rows={4}
                            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors.description ? 'border-red-300' : ''
                            }`}
                            placeholder="Enter a detailed description of this work instruction"
                            disabled={readOnly}
                          />
                        )}
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Steps Tab */}
              {activeTab === 'steps' && (
                <motion.div
                  key="steps"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-medium text-gray-900">Work Instruction Steps</h2>
                      <button
                        type="button"
                        onClick={addStep}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        disabled={readOnly}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Step
                      </button>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="steps">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                            {watchedSteps.map((step, index) => (
                              <Draggable
                                key={`step-${index}`}
                                draggableId={`step-${index}`}
                                index={index}
                                isDragDisabled={readOnly}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`bg-gray-50 rounded-lg p-4 border ${
                                      snapshot.isDragging ? 'shadow-lg' : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center space-x-3">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="text-gray-400 hover:text-gray-600 cursor-grab"
                                        >
                                          <GripVertical className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">
                                          Step {step.stepNumber}
                                        </h3>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeStep(index)}
                                        className="text-red-400 hover:text-red-600"
                                        disabled={watchedSteps.length <= 1 || readOnly}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Step Title
                                        </label>
                                        <Controller
                                          name={`steps.${index}.title`}
                                          control={control}
                                          render={({ field }) => (
                                            <input
                                              {...field}
                                              type="text"
                                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                              placeholder="Enter step title"
                                              disabled={readOnly}
                                            />
                                          )}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Estimated Duration (minutes)
                                        </label>
                                        <Controller
                                          name={`steps.${index}.estimatedDuration`}
                                          control={control}
                                          render={({ field }) => (
                                            <input
                                              {...field}
                                              type="number"
                                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                              placeholder="e.g., 15"
                                              disabled={readOnly}
                                            />
                                          )}
                                        />
                                      </div>
                                    </div>

                                    <div className="mb-4">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Step Description
                                      </label>
                                      <Controller
                                        name={`steps.${index}.description`}
                                        control={control}
                                        render={({ field }) => (
                                          <textarea
                                            {...field}
                                            rows={2}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            placeholder="Brief description of this step"
                                            disabled={readOnly}
                                          />
                                        )}
                                      />
                                    </div>

                                    <div className="mb-4">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Instructions
                                      </label>
                                      <Controller
                                        name={`steps.${index}.instructions`}
                                        control={control}
                                        render={({ field }) => (
                                          <ReactQuill
                                            {...field}
                                            theme="snow"
                                            modules={quillModules}
                                            placeholder="Enter detailed instructions..."
                                            readOnly={readOnly}
                                            style={{ height: '200px' }}
                                          />
                                        )}
                                      />
                                    </div>

                                    <div style={{ height: '60px' }}></div>

                                    {step.safetyNotes && (
                                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                        <div className="flex">
                                          <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                          <div className="ml-3">
                                            <h4 className="text-sm font-medium text-yellow-800">Safety Notes</h4>
                                            <p className="text-sm text-yellow-700">{step.safetyNotes}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                </motion.div>
              )}

              {/* Media Tab */}
              {activeTab === 'media' && (
                <motion.div
                  key="media"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Media Library</h2>

                    {/* Upload Area */}
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors ${
                        isDragActive ? 'border-blue-400 bg-blue-50' : ''
                      } ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <input {...getInputProps()} disabled={readOnly} />
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      {isDragActive ? (
                        <p className="text-lg text-blue-600">Drop files here...</p>
                      ) : (
                        <div>
                          <p className="text-lg text-gray-600">Drag and drop files here, or click to select</p>
                          <p className="text-sm text-gray-500 mt-2">
                            Supports images, videos, and documents (max 50MB)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Media Grid */}
                    {watchedMedia.length > 0 && (
                      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {watchedMedia.map((media, index) => (
                          <div key={media.id || index} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              {media.mediaType === 'IMAGE' ? (
                                <img
                                  src={media.fileUrl}
                                  alt={media.fileName}
                                  className="w-full h-full object-cover"
                                />
                              ) : media.mediaType === 'VIDEO' ? (
                                <video
                                  src={media.fileUrl}
                                  className="w-full h-full object-cover"
                                  controls={false}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="w-12 h-12 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{media.fileName}</p>
                              <p className="text-xs text-gray-500">
                                {(media.fileSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => {
                                  const currentMedia = getValues('media');
                                  setValue('media', currentMedia.filter((_, i) => i !== index));
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            {/* Upload progress */}
                            {uploadProgress[media.id || ''] !== undefined &&
                              uploadProgress[media.id || ''] < 100 && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                                  <div className="text-white text-sm">
                                    {uploadProgress[media.id || '']}%
                                  </div>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Data Collection Fields Tab */}
              {activeTab === 'fields' && (
                <motion.div
                  key="fields"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-medium text-gray-900">Data Collection Fields</h2>
                      <button
                        type="button"
                        onClick={() => addDataCollectionField()}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        disabled={readOnly}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Field
                      </button>
                    </div>

                    <div className="text-center py-12 text-gray-500">
                      <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">No data collection fields configured</p>
                      <p className="text-sm">Add fields to collect data during work instruction execution</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Settings</h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                        <Controller
                          name="tags"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="text"
                              placeholder="Add tags (comma-separated)"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              value={field.value?.join(', ') || ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean)
                                )
                              }
                              disabled={readOnly}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                        <Controller
                          name="categories"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="text"
                              placeholder="Add categories (comma-separated)"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              value={field.value?.join(', ') || ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.split(',').map((cat) => cat.trim()).filter(Boolean)
                                )
                              }
                              disabled={readOnly}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                        <Controller
                          name="keywords"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="text"
                              placeholder="Add keywords (comma-separated)"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              value={field.value?.join(', ') || ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.split(',').map((keyword) => keyword.trim()).filter(Boolean)
                                )
                              }
                              disabled={readOnly}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NativeInstructionEditor;