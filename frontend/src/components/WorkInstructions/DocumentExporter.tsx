import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Download,
  FileText,
  Image,
  File,
  Settings,
  X,
  Eye,
  CheckCircle,
  AlertTriangle,
  Loader,
  Palette,
  Layout,
  Type,
  Share,
  Save,
  RefreshCw,
  Calendar,
  User,
  Tag,
  Layers,
  Grid,
  List,
  Monitor,
  Smartphone,
  Printer,
  Globe,
  Lock,
  Unlock,
  Star,
  Clock,
} from 'lucide-react';

// ✅ GITHUB ISSUE #18 - Phase 4: DocumentExporter Component

interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  format: 'PDF' | 'DOCX' | 'PPTX' | 'HTML';
  isDefault: boolean;
  styling: {
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
    margins?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    colors?: {
      primary?: string;
      secondary?: string;
      text?: string;
      background?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ExportJob {
  id: string;
  workInstructionId: string;
  format: string;
  templateId?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  settings: ExportSettings;
}

interface ExportSettings {
  format: 'PDF' | 'DOCX' | 'PPTX' | 'HTML';
  templateId?: string;
  includeImages: boolean;
  includeDataFields: boolean;
  includeMetadata: boolean;
  includeStepNumbers: boolean;
  includeTableOfContents: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  customTitle?: string;
  customAuthor?: string;
  customDescription?: string;
  pageOrientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'Letter' | 'Legal';
  quality: 'draft' | 'standard' | 'high';
  watermark?: {
    text: string;
    opacity: number;
  };
  accessLevel: 'public' | 'internal' | 'restricted';
  expirationDate?: Date;
}

interface WorkInstruction {
  id: string;
  title: string;
  description: string;
  version: string;
  status: string;
  steps: any[];
  media: any[];
  dataCollectionFields: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentExporterProps {
  workInstruction: WorkInstruction;
  availableTemplates?: ExportTemplate[];
  onExportComplete?: (downloadUrl: string) => void;
  onClose?: () => void;
  className?: string;
}

const exportSettingsSchema = yup.object({
  format: yup.string().required('Format is required'),
  pageSize: yup.string().required('Page size is required'),
  pageOrientation: yup.string().required('Page orientation is required'),
  quality: yup.string().required('Quality is required'),
  accessLevel: yup.string().required('Access level is required'),
});

const DocumentExporter: React.FC<DocumentExporterProps> = ({
  workInstruction,
  availableTemplates = [],
  onExportComplete,
  onClose,
  className = '',
}) => {
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExportSettings>({
    resolver: yupResolver(exportSettingsSchema),
    defaultValues: {
      format: 'PDF',
      includeImages: true,
      includeDataFields: true,
      includeMetadata: true,
      includeStepNumbers: true,
      includeTableOfContents: true,
      includeHeader: true,
      includeFooter: true,
      customTitle: workInstruction.title,
      customAuthor: '',
      customDescription: workInstruction.description,
      pageOrientation: 'portrait',
      pageSize: 'A4',
      quality: 'standard',
      accessLevel: 'internal',
    },
  });

  const watchedSettings = watch();

  // Get templates for selected format
  const templatesForFormat = availableTemplates.filter(
    (template) => template.format === watchedSettings.format
  );

  // Auto-select default template when format changes
  useEffect(() => {
    const defaultTemplate = templatesForFormat.find((t) => t.isDefault);
    if (defaultTemplate && !selectedTemplate) {
      setSelectedTemplate(defaultTemplate);
      setValue('templateId', defaultTemplate.id);
    }
  }, [watchedSettings.format, templatesForFormat, selectedTemplate, setValue]);

  // Handle export
  const handleExport = useCallback(
    async (settings: ExportSettings) => {
      setIsExporting(true);

      const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newJob: ExportJob = {
        id: jobId,
        workInstructionId: workInstruction.id,
        format: settings.format,
        templateId: settings.templateId,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        settings,
      };

      setExportJobs((prev) => [newJob, ...prev]);

      try {
        // Simulate export process
        await simulateExportProcess(jobId);
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setIsExporting(false);
      }
    },
    [workInstruction.id]
  );

  // Simulate export process
  const simulateExportProcess = useCallback(async (jobId: string) => {
    const updateJob = (updates: Partial<ExportJob>) => {
      setExportJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job))
      );
    };

    try {
      updateJob({ status: 'processing' });

      // Simulate processing phases
      const phases = [
        'Preparing document...',
        'Rendering content...',
        'Applying template...',
        'Generating images...',
        'Finalizing document...',
      ];

      for (let i = 0; i < phases.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        updateJob({ progress: ((i + 1) / phases.length) * 100 });
      }

      // Generate mock download URL
      const downloadUrl = `${window.location.origin}/api/exports/${jobId}/download`;

      updateJob({
        status: 'completed',
        progress: 100,
        downloadUrl,
      });

      onExportComplete?.(downloadUrl);
    } catch (error) {
      updateJob({
        status: 'error',
        errorMessage: 'Export failed. Please try again.',
      });
    }
  }, [onExportComplete]);

  // Handle download
  const handleDownload = useCallback((job: ExportJob) => {
    if (job.downloadUrl) {
      const link = document.createElement('a');
      link.href = job.downloadUrl;
      link.download = `${workInstruction.title}.${job.format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [workInstruction.title]);

  // Handle preview
  const handlePreview = useCallback((settings: ExportSettings) => {
    // Generate preview URL
    const previewUrl = `${window.location.origin}/api/work-instructions/${workInstruction.id}/preview?format=${settings.format}&template=${settings.templateId}`;
    setPreviewUrl(previewUrl);
    setShowPreview(true);
  }, [workInstruction.id]);

  // Retry export
  const handleRetryExport = useCallback(
    (job: ExportJob) => {
      handleExport(job.settings);
    },
    [handleExport]
  );

  // Remove job
  const handleRemoveJob = useCallback((jobId: string) => {
    setExportJobs((prev) => prev.filter((job) => job.id !== jobId));
  }, []);

  // Get format icon
  const getFormatIcon = useCallback((format: string) => {
    switch (format) {
      case 'PDF':
        return FileText;
      case 'DOCX':
        return File;
      case 'PPTX':
        return Layers;
      case 'HTML':
        return Globe;
      default:
        return FileText;
    }
  }, []);

  // Get status color
  const getStatusColor = useCallback((status: ExportJob['status']) => {
    switch (status) {
      case 'pending':
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
            <h1 className="text-2xl font-bold text-gray-900">Document Exporter</h1>
            <div className="text-sm text-gray-500">
              <span className="font-medium">{workInstruction.title}</span>
              <span className="mx-2">•</span>
              <span>Version {workInstruction.version}</span>
            </div>
          </div>
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

      <div className="flex-1 flex overflow-hidden">
        {/* Export Configuration */}
        <div className="flex-1 p-6 overflow-y-auto">
          <form onSubmit={handleSubmit(handleExport)} className="space-y-8">
            {/* Format Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Export Format</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['PDF', 'DOCX', 'PPTX', 'HTML'].map((format) => {
                  const Icon = getFormatIcon(format);
                  const isSelected = watchedSettings.format === format;

                  return (
                    <div
                      key={format}
                      className={`relative rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setValue('format', format as any)}
                    >
                      <div className="p-4 text-center">
                        <Icon className={`w-8 h-8 mx-auto mb-2 ${
                          isSelected ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          isSelected ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {format}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Template Selection */}
            {templatesForFormat.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Template</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templatesForFormat.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;

                    return (
                      <div
                        key={template.id}
                        className={`relative rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setValue('templateId', template.id);
                        }}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className={`font-medium ${
                              isSelected ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {template.name}
                            </h3>
                            {template.isDefault && (
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Font: {template.styling.fontFamily || 'Default'}</span>
                            <span>Size: {template.styling.fontSize || 12}px</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Content Options */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Content Options</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Include images</label>
                    <Controller
                      name="includeImages"
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
                    <label className="text-sm font-medium text-gray-700">Include data collection fields</label>
                    <Controller
                      name="includeDataFields"
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
                    <label className="text-sm font-medium text-gray-700">Include metadata</label>
                    <Controller
                      name="includeMetadata"
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
                    <label className="text-sm font-medium text-gray-700">Include step numbers</label>
                    <Controller
                      name="includeStepNumbers"
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Include table of contents</label>
                    <Controller
                      name="includeTableOfContents"
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
                    <label className="text-sm font-medium text-gray-700">Include header</label>
                    <Controller
                      name="includeHeader"
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
                    <label className="text-sm font-medium text-gray-700">Include footer</label>
                    <Controller
                      name="includeFooter"
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
              </div>
            </div>

            {/* Document Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Document Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Title
                    </label>
                    <Controller
                      name="customTitle"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Override document title"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Author
                    </label>
                    <Controller
                      name="customAuthor"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Document author"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Page Size
                    </label>
                    <Controller
                      name="pageSize"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="A4">A4</option>
                          <option value="Letter">Letter</option>
                          <option value="Legal">Legal</option>
                        </select>
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Orientation
                    </label>
                    <Controller
                      name="pageOrientation"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quality
                    </label>
                    <Controller
                      name="quality"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="draft">Draft (Fast)</option>
                          <option value="standard">Standard</option>
                          <option value="high">High Quality</option>
                        </select>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Level
                    </label>
                    <Controller
                      name="accessLevel"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="public">Public</option>
                          <option value="internal">Internal</option>
                          <option value="restricted">Restricted</option>
                        </select>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handlePreview(watchedSettings)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </button>
                <button
                  type="submit"
                  disabled={isExporting}
                  className="inline-flex items-center px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export Document
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Export History */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Export History</h3>
          </div>

          <div className="p-4">
            {exportJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Download className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No exports yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exportJobs.map((job) => {
                  const Icon = getFormatIcon(job.format);
                  const statusColor = getStatusColor(job.status);

                  return (
                    <div
                      key={job.id}
                      className="bg-gray-50 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {job.format}
                          </span>
                        </div>
                        <span className={`text-xs font-medium ${statusColor}`}>
                          {job.status}
                        </span>
                      </div>

                      {job.status === 'processing' && (
                        <div className="mb-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${job.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{job.progress}%</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {job.createdAt.toLocaleTimeString()}
                        </span>
                        <div className="flex space-x-1">
                          {job.status === 'completed' && job.downloadUrl && (
                            <button
                              onClick={() => handleDownload(job)}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Download"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          )}
                          {job.status === 'error' && (
                            <button
                              onClick={() => handleRetryExport(job)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Retry"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveJob(job.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {job.status === 'error' && job.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          {job.errorMessage}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && previewUrl && (
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
              className="bg-white rounded-lg w-full max-w-4xl h-full max-h-[80vh] m-4 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Document Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 p-4">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border border-gray-200 rounded"
                  title="Document Preview"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentExporter;