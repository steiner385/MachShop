/**
 * Property Editor Component
 * Edits properties of selected nodes
 */

import React, { useState, useCallback, useMemo } from 'react';
import { NodeConfig, NodeType } from '../types/workflow';
import { getNodeLabel, getDefaultNodeProperties, validateNodeConfiguration } from '../utils/nodeUtils';
import './PropertyEditor.css';

export interface PropertyEditorProps {
  node?: NodeConfig;
  onNodeUpdate?: (nodeId: string, updates: Partial<NodeConfig>) => void;
  isReadOnly?: boolean;
}

interface PropertyField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'json';
  required?: boolean;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: any) => string | null;
}

/**
 * Get property fields for node type
 */
function getPropertyFields(nodeType: NodeType): PropertyField[] {
  const commonFields: PropertyField[] = [
    {
      key: 'name',
      label: 'Node Name',
      type: 'text',
      required: true,
      description: 'Display name for this node',
    },
  ];

  const typeFields: Record<NodeType, PropertyField[]> = {
    [NodeType.START]: commonFields,
    [NodeType.END]: commonFields,

    [NodeType.MATERIAL_CONSUME]: [
      ...commonFields,
      {
        key: 'material',
        label: 'Material',
        type: 'text',
        required: true,
        description: 'Material to consume',
      },
      {
        key: 'quantity',
        label: 'Quantity',
        type: 'number',
        required: true,
        validation: val => (val <= 0 ? 'Must be greater than 0' : null),
      },
      {
        key: 'unit',
        label: 'Unit',
        type: 'select',
        options: [
          { value: 'pcs', label: 'Pieces' },
          { value: 'kg', label: 'Kilograms' },
          { value: 'liters', label: 'Liters' },
          { value: 'meters', label: 'Meters' },
        ],
      },
    ],

    [NodeType.EQUIPMENT_OPERATION]: [
      ...commonFields,
      {
        key: 'equipment',
        label: 'Equipment',
        type: 'text',
        required: true,
      },
      {
        key: 'operation',
        label: 'Operation',
        type: 'text',
        required: true,
      },
      {
        key: 'duration',
        label: 'Duration (seconds)',
        type: 'number',
      },
    ],

    [NodeType.QUALITY_CHECK]: [
      ...commonFields,
      {
        key: 'checkType',
        label: 'Check Type',
        type: 'select',
        required: true,
        options: [
          { value: 'visual', label: 'Visual Inspection' },
          { value: 'dimensional', label: 'Dimensional Check' },
          { value: 'functional', label: 'Functional Test' },
          { value: 'automated', label: 'Automated Test' },
        ],
      },
      {
        key: 'expectedResult',
        label: 'Expected Result',
        type: 'select',
        required: true,
        options: [
          { value: 'pass', label: 'Pass' },
          { value: 'fail', label: 'Fail' },
          { value: 'rework', label: 'Rework' },
        ],
      },
    ],

    [NodeType.DATA_TRANSFORMATION]: [
      ...commonFields,
      {
        key: 'assignments',
        label: 'Variable Assignments',
        type: 'json',
        description: 'JSON object with variable assignments',
      },
    ],

    [NodeType.API_CALL]: [
      ...commonFields,
      {
        key: 'url',
        label: 'URL',
        type: 'text',
        required: true,
        validation: val => {
          try {
            new URL(val);
            return null;
          } catch {
            return 'Invalid URL';
          }
        },
      },
      {
        key: 'method',
        label: 'Method',
        type: 'select',
        required: true,
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' },
          { value: 'PATCH', label: 'PATCH' },
        ],
      },
      {
        key: 'headers',
        label: 'Headers',
        type: 'json',
        description: 'HTTP headers as JSON',
      },
    ],

    [NodeType.IF_THEN_ELSE]: [
      ...commonFields,
      {
        key: 'condition',
        label: 'Condition',
        type: 'textarea',
        required: true,
        description: 'Expression to evaluate (e.g., "status === \'ready\'")',
      },
    ],

    [NodeType.LOOP]: [
      ...commonFields,
      {
        key: 'condition',
        label: 'Loop Condition',
        type: 'textarea',
        required: true,
        description: 'Condition to repeat while true',
      },
      {
        key: 'maxIterations',
        label: 'Max Iterations',
        type: 'number',
        validation: val => (val <= 0 ? 'Must be greater than 0' : null),
      },
    ],

    [NodeType.WAIT]: [
      ...commonFields,
      {
        key: 'type',
        label: 'Wait Type',
        type: 'select',
        required: true,
        options: [
          { value: 'delay', label: 'Delay' },
          { value: 'event', label: 'Wait for Event' },
        ],
      },
      {
        key: 'duration',
        label: 'Duration (seconds)',
        type: 'number',
        description: 'For delay type',
      },
    ],

    [NodeType.SUBPROCESS]: [
      ...commonFields,
      {
        key: 'workflowId',
        label: 'Workflow ID',
        type: 'text',
        required: true,
      },
    ],

    [NodeType.NOTIFICATION]: [
      ...commonFields,
      {
        key: 'type',
        label: 'Notification Type',
        type: 'select',
        required: true,
        options: [
          { value: 'email', label: 'Email' },
          { value: 'sms', label: 'SMS' },
          { value: 'slack', label: 'Slack' },
          { value: 'webhook', label: 'Webhook' },
        ],
      },
      {
        key: 'recipient',
        label: 'Recipient',
        type: 'text',
        required: true,
      },
      {
        key: 'message',
        label: 'Message',
        type: 'textarea',
        required: true,
      },
    ],

    [NodeType.SWITCH]: commonFields,
    [NodeType.PARALLEL]: commonFields,
    [NodeType.SALESFORCE_CONNECTOR]: commonFields,
    [NodeType.SAP_CONNECTOR]: commonFields,
    [NodeType.NETSUITE_CONNECTOR]: commonFields,
    [NodeType.CUSTOM_API]: commonFields,
    [NodeType.EVENT_PUBLISHER]: commonFields,
    [NodeType.EVENT_SUBSCRIBER]: commonFields,
    [NodeType.ERROR_HANDLER]: commonFields,
    [NodeType.RETRY_LOGIC]: commonFields,
    [NodeType.FALLBACK_PATH]: commonFields,
  };

  return typeFields[nodeType] || commonFields;
}

/**
 * PropertyEditor - Edit node properties
 *
 * Features:
 * - Type-specific input fields
 * - Real-time validation
 * - JSON editor for complex properties
 * - Help text and descriptions
 * - Undo/redo support
 */
export const PropertyEditor: React.FC<PropertyEditorProps> = ({
  node,
  onNodeUpdate,
  isReadOnly = false,
}) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fields = useMemo(
    () => (node ? getPropertyFields(node.type) : []),
    [node?.type]
  );

  const handlePropertyChange = useCallback(
    (key: string, value: any) => {
      if (!node || isReadOnly) return;

      // Validate
      const field = fields.find(f => f.key === key);
      let error: string | null = null;

      if (field?.validation) {
        error = field.validation(value);
      }

      if (error) {
        setValidationErrors(prev => ({ ...prev, [key]: error }));
        return;
      } else {
        setValidationErrors(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }

      // Update node
      const updates: Partial<NodeConfig> = {};

      if (key === 'name') {
        updates.name = value;
      } else {
        updates.properties = {
          ...node.properties,
          [key]: value,
        };
      }

      onNodeUpdate?.(node.id, updates);
    },
    [node, fields, isReadOnly, onNodeUpdate]
  );

  if (!node) {
    return (
      <div className="property-editor empty">
        <p>Select a node to edit its properties</p>
      </div>
    );
  }

  const nodeLabel = getNodeLabel(node.type);

  return (
    <div className="property-editor" role="region" aria-label="Property editor">
      {/* Header */}
      <div className="editor-header">
        <h2 className="editor-title">{nodeLabel} Properties</h2>
        <span className="node-id">{node.id}</span>
      </div>

      {/* Properties */}
      <div className="editor-properties">
        {fields.map(field => (
          <PropertyInputField
            key={field.key}
            field={field}
            value={
              field.key === 'name'
                ? node.name
                : node.properties[field.key] ?? ''
            }
            error={validationErrors[field.key]}
            onChange={(value) => handlePropertyChange(field.key, value)}
            isReadOnly={isReadOnly}
          />
        ))}
      </div>

      {/* Position Info */}
      <div className="editor-section">
        <h3>Position</h3>
        <div className="position-info">
          <div className="info-row">
            <label>X:</label>
            <span>{node.x}px</span>
          </div>
          <div className="info-row">
            <label>Y:</label>
            <span>{node.y}px</span>
          </div>
          <div className="info-row">
            <label>Width:</label>
            <span>{node.width || 100}px</span>
          </div>
          <div className="info-row">
            <label>Height:</label>
            <span>{node.height || 60}px</span>
          </div>
        </div>
      </div>

      {/* Validation Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="validation-errors">
          <h4>Validation Errors</h4>
          <ul>
            {Object.entries(validationErrors).map(([key, error]) => (
              <li key={key}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Individual Property Input Field
 */
interface PropertyInputFieldProps {
  field: PropertyField;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  isReadOnly?: boolean;
}

const PropertyInputField: React.FC<PropertyInputFieldProps> = ({
  field,
  value,
  error,
  onChange,
  isReadOnly = false,
}) => {
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsed = JSON.parse(e.target.value);
      setJsonError(null);
      onChange(parsed);
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  return (
    <div className={`property-field ${error ? 'error' : ''}`}>
      <label htmlFor={field.key} className="field-label">
        {field.label}
        {field.required && <span className="required-asterisk">*</span>}
      </label>

      {field.description && (
        <p className="field-description">{field.description}</p>
      )}

      {field.type === 'text' && (
        <input
          id={field.key}
          type="text"
          className="field-input"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={isReadOnly}
          placeholder={field.label}
          aria-label={field.label}
        />
      )}

      {field.type === 'number' && (
        <input
          id={field.key}
          type="number"
          className="field-input"
          value={value ?? ''}
          onChange={e => onChange(Number(e.target.value))}
          disabled={isReadOnly}
          placeholder={field.label}
          aria-label={field.label}
        />
      )}

      {field.type === 'boolean' && (
        <input
          id={field.key}
          type="checkbox"
          className="field-checkbox"
          checked={value || false}
          onChange={e => onChange(e.target.checked)}
          disabled={isReadOnly}
          aria-label={field.label}
        />
      )}

      {field.type === 'select' && field.options && (
        <select
          id={field.key}
          className="field-select"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={isReadOnly}
          aria-label={field.label}
        >
          <option value="">-- Select --</option>
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {field.type === 'textarea' && (
        <textarea
          id={field.key}
          className="field-textarea"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={isReadOnly}
          placeholder={field.label}
          rows={3}
          aria-label={field.label}
        />
      )}

      {field.type === 'json' && (
        <textarea
          id={field.key}
          className={`field-textarea json-editor ${jsonError ? 'error' : ''}`}
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={handleJsonChange}
          disabled={isReadOnly}
          placeholder={field.label}
          rows={4}
          aria-label={field.label}
        />
      )}

      {error && <span className="error-message">{error}</span>}
      {jsonError && <span className="error-message">{jsonError}</span>}
    </div>
  );
};

export default PropertyEditor;
