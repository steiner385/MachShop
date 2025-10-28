import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Eye,
  Copy,
  Search,
  Filter,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  Image,
  FileSignature,
  BarChart3,
  AlertTriangle,
  Info,
  Save,
  Undo,
  Redo,
  Grid,
  List,
} from 'lucide-react';

// ✅ GITHUB ISSUE #18 - Phase 4: DataCollectionFormBuilder Component

interface FieldTemplate {
  id: string;
  name: string;
  description?: string;
  fieldType: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  isRequired: boolean;
  validationRules: ValidationRule[];
  options?: FieldOption[];
  styling?: FieldStyling;
  category?: string;
  tags?: string[];
}

interface ValidationRule {
  type: string;
  value?: any;
  message?: string;
}

interface FieldOption {
  value: string;
  label: string;
  description?: string;
  isDefault?: boolean;
}

interface FieldStyling {
  width?: string;
  alignment?: string;
  theme?: string;
}

interface FormField {
  id: string;
  templateId: string;
  template: FieldTemplate;
  order: number;
  stepId?: string;
  customLabel?: string;
  customPlaceholder?: string;
  customHelpText?: string;
  isRequired?: boolean;
  customValidationRules?: ValidationRule[];
  customOptions?: FieldOption[];
  styling?: FieldStyling;
  isVisible: boolean;
  isReadOnly: boolean;
  groupId?: string;
}

interface FieldGroup {
  id: string;
  name: string;
  description?: string;
  isCollapsible: boolean;
  isExpanded: boolean;
  order: number;
}

interface DataCollectionFormBuilderProps {
  workInstructionId?: string;
  stepId?: string;
  initialFields?: FormField[];
  initialGroups?: FieldGroup[];
  availableTemplates?: FieldTemplate[];
  onSave?: (fields: FormField[], groups: FieldGroup[]) => Promise<void>;
  onPreview?: (fields: FormField[], groups: FieldGroup[]) => void;
  readOnly?: boolean;
  className?: string;
}

const FIELD_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  text: Type,
  number: Hash,
  decimal: Hash,
  date: Calendar,
  datetime: Calendar,
  time: Calendar,
  boolean: CheckSquare,
  select: List,
  multiselect: Grid,
  radio: CheckSquare,
  checkbox: CheckSquare,
  file: Image,
  image: Image,
  signature: FileSignature,
  measurement: BarChart3,
  temperature: BarChart3,
  pressure: BarChart3,
  weight: BarChart3,
  dimension: BarChart3,
};

const DataCollectionFormBuilder: React.FC<DataCollectionFormBuilderProps> = ({
  workInstructionId,
  stepId,
  initialFields = [],
  initialGroups = [],
  availableTemplates = [],
  onSave,
  onPreview,
  readOnly = false,
  className = '',
}) => {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [groups, setGroups] = useState<FieldGroup[]>(initialGroups);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'builder' | 'preview'>('builder');
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<{ fields: FormField[]; groups: FieldGroup[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const { control, handleSubmit, watch, setValue, getValues } = useForm({
    defaultValues: {
      selectedField: null as FormField | null,
    },
  });

  // Filter available templates
  const filteredTemplates = useMemo(() => {
    return availableTemplates.filter((template) => {
      const matchesSearch = !searchTerm ||
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.label.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = !selectedCategory || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [availableTemplates, searchTerm, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(availableTemplates.map(t => t.category).filter(Boolean)));
    return cats.sort();
  }, [availableTemplates]);

  // Save to history
  const saveToHistory = useCallback(() => {
    const newState = { fields: [...fields], groups: [...groups] };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [fields, groups, history, historyIndex]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setFields(previousState.fields);
      setGroups(previousState.groups);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setFields(nextState.fields);
      setGroups(nextState.groups);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Add field from template
  const addFieldFromTemplate = useCallback((template: FieldTemplate, groupId?: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateId: template.id,
      template,
      order: fields.length,
      stepId,
      customLabel: template.label,
      customPlaceholder: template.placeholder,
      customHelpText: template.helpText,
      isRequired: template.isRequired,
      customValidationRules: [...template.validationRules],
      customOptions: template.options ? [...template.options] : undefined,
      styling: template.styling ? { ...template.styling } : {},
      isVisible: true,
      isReadOnly: false,
      groupId,
    };

    saveToHistory();
    setFields([...fields, newField]);
  }, [fields, stepId, saveToHistory]);

  // Remove field
  const removeField = useCallback((fieldId: string) => {
    saveToHistory();
    setFields(fields.filter(f => f.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  }, [fields, selectedField, saveToHistory]);

  // Update field
  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  }, [fields]);

  // Duplicate field
  const duplicateField = useCallback((field: FormField) => {
    const duplicated: FormField = {
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customLabel: `${field.customLabel} (Copy)`,
      order: fields.length,
    };

    saveToHistory();
    setFields([...fields, duplicated]);
  }, [fields, saveToHistory]);

  // Drag end handler
  const onDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'template') {
      // Adding template to form
      const template = filteredTemplates[source.index];
      addFieldFromTemplate(template);
      return;
    }

    if (type === 'field') {
      saveToHistory();
      const reorderedFields = Array.from(fields);
      const [movedField] = reorderedFields.splice(source.index, 1);
      reorderedFields.splice(destination.index, 0, movedField);

      // Update order
      const updatedFields = reorderedFields.map((field, index) => ({
        ...field,
        order: index,
      }));

      setFields(updatedFields);
    }
  }, [filteredTemplates, fields, addFieldFromTemplate, saveToHistory]);

  // Add group
  const addGroup = useCallback(() => {
    const newGroup: FieldGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'New Group',
      description: '',
      isCollapsible: true,
      isExpanded: true,
      order: groups.length,
    };

    saveToHistory();
    setGroups([...groups, newGroup]);
  }, [groups, saveToHistory]);

  // Remove group
  const removeGroup = useCallback((groupId: string) => {
    saveToHistory();
    setGroups(groups.filter(g => g.id !== groupId));
    // Remove group assignment from fields
    setFields(fields.map(f => f.groupId === groupId ? { ...f, groupId: undefined } : f));
  }, [groups, fields, saveToHistory]);

  // Save form
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(fields, groups);
    } catch (error) {
      console.error('Failed to save form:', error);
    } finally {
      setIsSaving(false);
    }
  }, [fields, groups, onSave]);

  // Preview form
  const handlePreview = useCallback(() => {
    if (viewMode === 'preview') {
      setViewMode('builder');
    } else {
      setViewMode('preview');
      onPreview?.(fields, groups);
    }
  }, [viewMode, fields, groups, onPreview]);

  // Render field preview
  const renderFieldPreview = useCallback((field: FormField) => {
    const { template } = field;
    const Icon = FIELD_TYPE_ICONS[template.fieldType] || Type;

    switch (template.fieldType) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={field.customPlaceholder || template.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={field.isReadOnly}
            required={field.isRequired}
          />
        );

      case 'number':
      case 'decimal':
        return (
          <input
            type="number"
            step={template.fieldType === 'decimal' ? '0.01' : '1'}
            placeholder={field.customPlaceholder || template.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={field.isReadOnly}
            required={field.isRequired}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={field.isReadOnly}
            required={field.isRequired}
          />
        );

      case 'select':
        return (
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={field.isReadOnly}
            required={field.isRequired}
          >
            <option value="">Select...</option>
            {(field.customOptions || template.options || []).map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              disabled={field.isReadOnly}
              required={field.isRequired}
            />
            <span className="text-sm text-gray-700">{field.customLabel || template.label}</span>
          </label>
        );

      case 'signature':
        return (
          <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-500">
            <FileSignature className="w-8 h-8 mr-2" />
            Signature Area
          </div>
        );

      default:
        return (
          <div className="w-full h-10 bg-gray-100 border border-gray-300 rounded-md flex items-center justify-center text-gray-500">
            <Icon className="w-4 h-4 mr-2" />
            {template.fieldType}
          </div>
        );
    }
  }, []);

  return (
    <div className={`h-full flex bg-gray-50 ${className}`}>
      <DragDropContext onDragEnd={onDragEnd}>
        {/* Template Palette */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Field Templates</h2>

            {/* Search and Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <Select
                value={categories.find(c => c === selectedCategory)}
                onChange={(option) => setSelectedCategory(option || '')}
                options={[{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))]}
                getOptionValue={(option) => option.value}
                getOptionLabel={(option) => option.label}
                placeholder="Filter by category"
                isClearable
                className="text-sm"
              />
            </div>
          </div>

          {/* Template List */}
          <div className="flex-1 overflow-y-auto p-4">
            <Droppable droppableId="templates" type="template" isDropDisabled>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {filteredTemplates.map((template, index) => {
                    const Icon = FIELD_TYPE_ICONS[template.fieldType] || Type;
                    return (
                      <Draggable
                        key={template.id}
                        draggableId={`template-${template.id}`}
                        index={index}
                        isDragDisabled={readOnly}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors ${
                              snapshot.isDragging ? 'shadow-lg border-blue-400 bg-blue-50' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <Icon className="w-5 h-5 text-gray-600 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {template.name}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {template.description || template.label}
                                </p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    {template.fieldType}
                                  </span>
                                  {template.isRequired && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                      Required
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>

        {/* Form Builder Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900">Form Builder</h1>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0 || readOnly}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    title="Undo"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1 || readOnly}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    title="Redo"
                  >
                    <Redo className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={addGroup}
                  disabled={readOnly}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Group
                </button>

                <button
                  onClick={handlePreview}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {viewMode === 'preview' ? 'Edit' : 'Preview'}
                </button>

                {onSave && (
                  <button
                    onClick={handleSave}
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
                        Save Form
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden flex">
            {/* Form Canvas */}
            <div className="flex-1 overflow-y-auto p-6">
              {viewMode === 'builder' ? (
                <Droppable droppableId="form" type="field">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`min-h-96 p-6 border-2 border-dashed rounded-lg transition-colors ${
                        snapshot.isDraggingOver
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {fields.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Grid className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg">No fields added yet</p>
                          <p className="text-sm">Drag field templates from the left panel to build your form</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {fields.map((field, index) => {
                            const Icon = FIELD_TYPE_ICONS[field.template.fieldType] || Type;
                            return (
                              <Draggable
                                key={field.id}
                                draggableId={field.id}
                                index={index}
                                isDragDisabled={readOnly}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`bg-white border rounded-lg p-4 ${
                                      snapshot.isDragging ? 'shadow-lg' : 'shadow-sm hover:shadow-md'
                                    } ${selectedField?.id === field.id ? 'ring-2 ring-blue-500' : ''}`}
                                    onClick={() => setSelectedField(field)}
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center space-x-3">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="text-gray-400 hover:text-gray-600 cursor-grab"
                                        >
                                          <GripVertical className="w-5 h-5" />
                                        </div>
                                        <Icon className="w-5 h-5 text-gray-600" />
                                        <div>
                                          <h4 className="font-medium text-gray-900">
                                            {field.customLabel || field.template.label}
                                            {field.isRequired && (
                                              <span className="text-red-500 ml-1">*</span>
                                            )}
                                          </h4>
                                          <p className="text-sm text-gray-500">
                                            {field.customHelpText || field.template.helpText}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            duplicateField(field);
                                          }}
                                          className="p-1 text-gray-400 hover:text-gray-600"
                                          title="Duplicate"
                                          disabled={readOnly}
                                        >
                                          <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedField(field);
                                          }}
                                          className="p-1 text-gray-400 hover:text-gray-600"
                                          title="Configure"
                                        >
                                          <Settings className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeField(field.id);
                                          }}
                                          className="p-1 text-red-400 hover:text-red-600"
                                          title="Remove"
                                          disabled={readOnly}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="border border-gray-200 rounded p-3 bg-gray-50">
                                      {renderFieldPreview(field)}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ) : (
                /* Preview Mode */
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Form Preview</h2>
                  <form className="space-y-6">
                    {fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.customLabel || field.template.label}
                          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderFieldPreview(field)}
                        {(field.customHelpText || field.template.helpText) && (
                          <p className="text-sm text-gray-500">
                            {field.customHelpText || field.template.helpText}
                          </p>
                        )}
                      </div>
                    ))}
                  </form>
                </div>
              )}
            </div>

            {/* Properties Panel */}
            {selectedField && viewMode === 'builder' && (
              <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Field Properties</h3>
                </div>

                <div className="p-4 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Label
                    </label>
                    <input
                      type="text"
                      value={selectedField.customLabel || ''}
                      onChange={(e) => updateField(selectedField.id, { customLabel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder={selectedField.template.label}
                      disabled={readOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Placeholder
                    </label>
                    <input
                      type="text"
                      value={selectedField.customPlaceholder || ''}
                      onChange={(e) => updateField(selectedField.id, { customPlaceholder: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder={selectedField.template.placeholder}
                      disabled={readOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Help Text
                    </label>
                    <textarea
                      value={selectedField.customHelpText || ''}
                      onChange={(e) => updateField(selectedField.id, { customHelpText: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder={selectedField.template.helpText}
                      disabled={readOnly}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Required</label>
                    <input
                      type="checkbox"
                      checked={selectedField.isRequired ?? selectedField.template.isRequired}
                      onChange={(e) => updateField(selectedField.id, { isRequired: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      disabled={readOnly}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Visible</label>
                    <input
                      type="checkbox"
                      checked={selectedField.isVisible}
                      onChange={(e) => updateField(selectedField.id, { isVisible: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      disabled={readOnly}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Read Only</label>
                    <input
                      type="checkbox"
                      checked={selectedField.isReadOnly}
                      onChange={(e) => updateField(selectedField.id, { isReadOnly: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default DataCollectionFormBuilder;