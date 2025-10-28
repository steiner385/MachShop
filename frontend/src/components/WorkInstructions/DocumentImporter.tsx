import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Upload,
  FileText,
  Image,
  File,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
  Eye,
  Settings,
  RefreshCw,
  ArrowRight,
  Loader,
  AlertCircle,
  Info,
  Zap,
  FileType,
  Layers,
  Target,
} from 'lucide-react';

// ✅ GITHUB ISSUE #18 - Phase 4: DocumentImporter Component

interface ImportedDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  extractedContent?: {
    title?: string;
    description?: string;
    steps?: Array<{
      stepNumber: number;
      title: string;
      content: string;
      images?: string[];
    }>;
    images?: string[];
    metadata?: Record<string, any>;
  };
  errorMessage?: string;
  workInstructionId?: string;
}

interface ImportSettings {
  targetPartId: string;
  autoCreateSteps: boolean;
  extractImages: boolean;
  preserveFormatting: boolean;
  splitOnHeadings: boolean;
  headingLevel: number;
  includeMetadata: boolean;
  defaultVersion: string;
  assignToUser?: string;
}

interface DocumentImporterProps {
  onImportComplete?: (workInstructionId: string) => void;
  onClose?: () => void;
  className?: string;
}

const importSettingsSchema = yup.object({
  targetPartId: yup.string().required('Part ID is required'),
  defaultVersion: yup.string().required('Version is required'),
  headingLevel: yup.number().min(1).max(6).required(),
});

const DocumentImporter: React.FC<DocumentImporterProps> = ({
  onImportComplete,
  onClose,
  className = '',
}) => {
  const [documents, setDocuments] = useState<ImportedDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<ImportedDocument | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ImportSettings>({
    resolver: yupResolver(importSettingsSchema),
    defaultValues: {
      targetPartId: '',
      autoCreateSteps: true,
      extractImages: true,
      preserveFormatting: true,
      splitOnHeadings: true,
      headingLevel: 2,
      includeMetadata: true,
      defaultVersion: '1.0',
    },
  });

  const watchedSettings = watch();

  // File upload handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newDocument: ImportedDocument = {
        id: documentId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date(),
        status: 'uploading',
        progress: 0,
      };

      setDocuments((prev) => [...prev, newDocument]);

      // Simulate upload and processing
      simulateDocumentProcessing(documentId, file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/html': ['.html'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 5,
  });

  // Simulate document processing
  const simulateDocumentProcessing = useCallback(async (documentId: string, file: File) => {
    const updateDocument = (updates: Partial<ImportedDocument>) => {
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === documentId ? { ...doc, ...updates } : doc))
      );
    };

    try {
      // Upload phase
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        updateDocument({ progress: i });
      }

      // Processing phase
      updateDocument({ status: 'processing', progress: 0 });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate content extraction
      const extractedContent = {
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: `Imported from ${file.name}`,
        steps: [
          {
            stepNumber: 1,
            title: 'Introduction',
            content: 'This is the first step extracted from the document.',
            images: [],
          },
          {
            stepNumber: 2,
            title: 'Main Process',
            content: 'This step contains the main process instructions.',
            images: ['image1.jpg'],
          },
          {
            stepNumber: 3,
            title: 'Completion',
            content: 'Final step to complete the work instruction.',
            images: [],
          },
        ],
        images: ['image1.jpg', 'image2.png'],
        metadata: {
          pageCount: 5,
          wordCount: 1250,
          extractedAt: new Date().toISOString(),
        },
      };

      for (let i = 0; i <= 100; i += 20) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        updateDocument({ progress: i });
      }

      updateDocument({
        status: 'completed',
        progress: 100,
        extractedContent,
      });
    } catch (error) {
      updateDocument({
        status: 'error',
        errorMessage: 'Failed to process document',
      });
    }
  }, []);

  // Import document to work instruction
  const handleImportDocument = useCallback(
    async (document: ImportedDocument, settings: ImportSettings) => {
      if (!document.extractedContent) return;

      setIsImporting(true);
      try {
        // Simulate API call to create work instruction
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const workInstructionId = `wi_${Date.now()}`;

        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === document.id ? { ...doc, workInstructionId } : doc
          )
        );

        onImportComplete?.(workInstructionId);
      } catch (error) {
        console.error('Failed to import document:', error);
      } finally {
        setIsImporting(false);
      }
    },
    [onImportComplete]
  );

  // Remove document
  const handleRemoveDocument = useCallback((documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    if (selectedDocument?.id === documentId) {
      setSelectedDocument(null);
    }
  }, [selectedDocument]);

  // Retry processing
  const handleRetryProcessing = useCallback((documentId: string) => {
    const document = documents.find((doc) => doc.id === documentId);
    if (document) {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === documentId ? { ...doc, status: 'uploading', progress: 0 } : doc
        )
      );

      // Create a mock file for retry
      const mockFile = new File([''], document.fileName, { type: document.fileType });
      simulateDocumentProcessing(documentId, mockFile);
    }
  }, [documents, simulateDocumentProcessing]);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get file type icon
  const getFileTypeIcon = useCallback((fileType: string) => {
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return Layers;
    if (fileType.includes('text')) return File;
    return FileType;
  }, []);

  // Get status color
  const getStatusColor = useCallback((status: ImportedDocument['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }, []);

  return (
    <div className={`h-full flex flex-col bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Document Importer</h1>
            <p className="text-sm text-gray-500">
              Convert documents to work instructions automatically
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Upload Area & Document List */}
        <div className="flex-1 flex flex-col p-6">
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-6 ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : documents.length === 0
                ? 'border-gray-300 hover:border-gray-400'
                : 'border-gray-200'
            } ${documents.length === 0 ? 'cursor-pointer' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg text-blue-600">Drop documents here...</p>
            ) : (
              <div>
                <p className="text-lg text-gray-600">
                  {documents.length === 0
                    ? 'Drag and drop documents here, or click to select'
                    : 'Drop more documents or click to add'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supports PDF, Word, PowerPoint, and text files (max 50MB)
                </p>
              </div>
            )}
          </div>

          {/* File Rejections */}
          {fileRejections.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">Some files were rejected:</h4>
                  <ul className="text-sm text-red-700 mt-1">
                    {fileRejections.map((rejection, index) => (
                      <li key={index}>
                        {rejection.file.name}: {rejection.errors.map(e => e.message).join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Document List */}
          {documents.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Uploaded Documents</h3>
              <div className="space-y-3">
                {documents.map((document) => {
                  const Icon = getFileTypeIcon(document.fileType);
                  const statusColor = getStatusColor(document.status);

                  return (
                    <motion.div
                      key={document.id}
                      layout
                      className={`bg-white rounded-lg border-2 p-4 transition-all ${
                        selectedDocument?.id === document.id
                          ? 'border-blue-500 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDocument(document)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Icon className="w-8 h-8 text-gray-600" />
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {document.fileName}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(document.fileSize)} • {document.status}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {document.status === 'uploading' || document.status === 'processing' ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${document.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">{document.progress}%</span>
                              <Loader className="w-4 h-4 text-blue-600 animate-spin" />
                            </div>
                          ) : document.status === 'completed' ? (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowPreview(true);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {document.workInstructionId ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Imported
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleImportDocument(document, watchedSettings);
                                  }}
                                  disabled={isImporting}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {isImporting ? (
                                    <>
                                      <Loader className="w-3 h-3 mr-1 animate-spin" />
                                      Importing...
                                    </>
                                  ) : (
                                    <>
                                      <ArrowRight className="w-3 h-3 mr-1" />
                                      Import
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          ) : document.status === 'error' ? (
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="w-5 h-5 text-red-600" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetryProcessing(document.id);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Retry"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                          ) : null}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDocument(document.id);
                            }}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {document.status === 'error' && document.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          {document.errorMessage}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {selectedDocument && selectedDocument.extractedContent && (
          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Document Preview</h3>
              <p className="text-sm text-gray-500">{selectedDocument.fileName}</p>
            </div>

            <div className="p-4 space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Title:</span>{' '}
                    <span className="text-gray-900">{selectedDocument.extractedContent.title}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Description:</span>{' '}
                    <span className="text-gray-900">{selectedDocument.extractedContent.description}</span>
                  </div>
                </div>
              </div>

              {/* Steps */}
              {selectedDocument.extractedContent.steps && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Extracted Steps ({selectedDocument.extractedContent.steps.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedDocument.extractedContent.steps.map((step) => (
                      <div key={step.stepNumber} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-medium rounded-full">
                            {step.stepNumber}
                          </span>
                          <h5 className="text-sm font-medium text-gray-900">{step.title}</h5>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">{step.content}</p>
                        {step.images && step.images.length > 0 && (
                          <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
                            <Image className="w-3 h-3" />
                            <span>{step.images.length} image(s)</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Images */}
              {selectedDocument.extractedContent.images && selectedDocument.extractedContent.images.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Extracted Images ({selectedDocument.extractedContent.images.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedDocument.extractedContent.images.map((image, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                        <Image className="w-8 h-8 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedDocument.extractedContent.metadata && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Metadata</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(selectedDocument.extractedContent.metadata).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-gray-500 capitalize">{key}:</span>{' '}
                        <span className="text-gray-900">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            >
              <form onSubmit={handleSubmit(() => setShowSettings(false))}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Import Settings</h3>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Part ID
                    </label>
                    <Controller
                      name="targetPartId"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter part ID"
                        />
                      )}
                    />
                    {errors.targetPartId && (
                      <p className="mt-1 text-sm text-red-600">{errors.targetPartId.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Version
                    </label>
                    <Controller
                      name="defaultVersion"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 1.0"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Auto-create steps</label>
                      <Controller
                        name="autoCreateSteps"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="checkbox"
                            checked={field.value}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Extract images</label>
                      <Controller
                        name="extractImages"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="checkbox"
                            checked={field.value}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Preserve formatting</label>
                      <Controller
                        name="preserveFormatting"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="checkbox"
                            checked={field.value}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Split on headings</label>
                      <Controller
                        name="splitOnHeadings"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="checkbox"
                            checked={field.value}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        )}
                      />
                    </div>
                  </div>

                  {watchedSettings.splitOnHeadings && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Heading Level
                      </label>
                      <Controller
                        name="headingLevel"
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            {[1, 2, 3, 4, 5, 6].map((level) => (
                              <option key={level} value={level}>
                                H{level} - Heading {level}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Settings
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentImporter;