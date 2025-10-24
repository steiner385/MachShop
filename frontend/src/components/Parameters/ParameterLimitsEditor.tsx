import React, { useState, useEffect } from 'react';
import {
  ParameterLimits,
  createOrUpdateParameterLimits,
  getParameterLimits,
  validateParameterLimits,
  evaluateParameterValue,
  LimitEvaluationResult,
} from '../../api/parameters';

interface ParameterLimitsEditorProps {
  parameterId: string;
  onSave?: (limits: ParameterLimits) => void;
  onCancel?: () => void;
}

interface LimitField {
  key: keyof Omit<ParameterLimits, 'id' | 'parameterId' | 'createdAt' | 'updatedAt'>;
  label: string;
  color: string;
  description: string;
}

const LIMIT_FIELDS: LimitField[] = [
  {
    key: 'engineeringMin',
    label: 'Engineering Min',
    color: '#D32F2F',
    description: 'Absolute minimum - equipment damage risk',
  },
  {
    key: 'lowLowAlarm',
    label: 'Low-Low Alarm',
    color: '#F44336',
    description: 'Critical low alarm threshold',
  },
  {
    key: 'lowAlarm',
    label: 'Low Alarm',
    color: '#FF9800',
    description: 'Warning low alarm threshold',
  },
  {
    key: 'operatingMin',
    label: 'Operating Min',
    color: '#FFC107',
    description: 'Minimum normal operating limit',
  },
  {
    key: 'LSL',
    label: 'LSL (Lower Spec)',
    color: '#FFEB3B',
    description: 'Lower specification limit for quality',
  },
  {
    key: 'nominalValue',
    label: 'Nominal (Target)',
    color: '#4CAF50',
    description: 'Target operating value',
  },
  {
    key: 'USL',
    label: 'USL (Upper Spec)',
    color: '#FFEB3B',
    description: 'Upper specification limit for quality',
  },
  {
    key: 'operatingMax',
    label: 'Operating Max',
    color: '#FFC107',
    description: 'Maximum normal operating limit',
  },
  {
    key: 'highAlarm',
    label: 'High Alarm',
    color: '#FF9800',
    description: 'Warning high alarm threshold',
  },
  {
    key: 'highHighAlarm',
    label: 'High-High Alarm',
    color: '#F44336',
    description: 'Critical high alarm threshold',
  },
  {
    key: 'engineeringMax',
    label: 'Engineering Max',
    color: '#D32F2F',
    description: 'Absolute maximum - equipment damage risk',
  },
];

export const ParameterLimitsEditor: React.FC<ParameterLimitsEditorProps> = ({
  parameterId,
  onSave,
  onCancel,
}) => {
  const [limits, setLimits] = useState<Partial<ParameterLimits>>({
    engineeringMin: null,
    lowLowAlarm: null,
    lowAlarm: null,
    operatingMin: null,
    LSL: null,
    nominalValue: null,
    USL: null,
    operatingMax: null,
    highAlarm: null,
    highHighAlarm: null,
    engineeringMax: null,
  });

  const [testValue, setTestValue] = useState<string>('');
  const [evaluation, setEvaluation] = useState<LimitEvaluationResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLimits();
  }, [parameterId]);

  const loadLimits = async () => {
    if (!parameterId) return;

    setLoading(true);
    setError(null);

    try {
      const existingLimits = await getParameterLimits(parameterId);
      setLimits(existingLimits);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError(err.message || 'Failed to load limits');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (field: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const updatedLimits = { ...limits, [field]: numValue };
    setLimits(updatedLimits);

    // Validate on change
    validateParameterLimits(updatedLimits as any).then((result) => {
      setValidationErrors(result.errors);
    });
  };

  const handleTestValue = async () => {
    if (!testValue || !parameterId) return;

    try {
      const result = await evaluateParameterValue(parameterId, parseFloat(testValue));
      setEvaluation(result);
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate value');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await createOrUpdateParameterLimits(parameterId, limits as any);
      onSave?.(result);
    } catch (err: any) {
      setError(err.message || 'Failed to save limits');
    } finally {
      setSaving(false);
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'OK':
        return '#4CAF50';
      case 'INFO':
        return '#2196F3';
      case 'WARNING':
        return '#FF9800';
      case 'CRITICAL':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading limits...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px' }}>Parameter Limits Editor</h2>

      {error && (
        <div
          style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#FFEBEE',
            color: '#C62828',
            borderRadius: '4px',
            border: '1px solid #EF5350',
          }}
        >
          {error}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div
          style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#FFF3E0',
            color: '#E65100',
            borderRadius: '4px',
            border: '1px solid #FFB74D',
          }}
        >
          <strong>Validation Errors:</strong>
          <ul style={{ margin: '8px 0 0 20px' }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        {/* Left Column: Limit Inputs */}
        <div>
          <h3 style={{ marginBottom: '16px' }}>Limit Values</h3>
          {LIMIT_FIELDS.map((field) => (
            <div
              key={field.key}
              style={{
                marginBottom: '20px',
                padding: '12px',
                borderRadius: '4px',
                border: `2px solid ${field.color}`,
                backgroundColor: '#FAFAFA',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <label
                  style={{
                    fontWeight: 600,
                    color: field.color,
                    fontSize: '14px',
                  }}
                >
                  {field.label}
                </label>
                <input
                  type="number"
                  step="any"
                  value={limits[field.key] ?? ''}
                  onChange={(e) => handleLimitChange(field.key, e.target.value)}
                  style={{
                    width: '120px',
                    padding: '6px 10px',
                    border: '1px solid #CCC',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  placeholder="Not set"
                />
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>{field.description}</div>
            </div>
          ))}
        </div>

        {/* Right Column: Visual Representation & Test */}
        <div>
          <h3 style={{ marginBottom: '16px' }}>Visual Representation</h3>
          <div
            style={{
              position: 'relative',
              height: '500px',
              border: '1px solid #CCC',
              borderRadius: '4px',
              padding: '20px',
              backgroundColor: '#FAFAFA',
            }}
          >
            {LIMIT_FIELDS.map((field, idx) => {
              const value = limits[field.key];
              if (value === null || value === undefined) return null;

              const percentage = 10 + idx * 8;

              return (
                <div
                  key={field.key}
                  style={{
                    position: 'absolute',
                    left: '20px',
                    right: '20px',
                    top: `${percentage}%`,
                    height: '2px',
                    backgroundColor: field.color,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: '-10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: field.color,
                    }}
                  >
                    {field.label}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      right: '0',
                      top: '-10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: field.color,
                    }}
                  >
                    {value.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Test Value Input */}
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ marginBottom: '16px' }}>Test a Value</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input
                type="number"
                step="any"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
                placeholder="Enter test value"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #CCC',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={handleTestValue}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Evaluate
              </button>
            </div>

            {evaluation && (
              <div
                style={{
                  padding: '16px',
                  borderRadius: '4px',
                  backgroundColor: getSeverityColor(evaluation.severity) + '20',
                  border: `2px solid ${getSeverityColor(evaluation.severity)}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Severity:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '16px',
                      color: getSeverityColor(evaluation.severity),
                    }}
                  >
                    {evaluation.severity}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                  <strong>Type:</strong> {evaluation.type}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  <strong>Message:</strong> {evaluation.message}
                </div>
                {evaluation.limit && (
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#333',
                    }}
                  >
                    Limit violated: {evaluation.limit}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          marginTop: '30px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}
      >
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '10px 24px',
              backgroundColor: '#F5F5F5',
              color: '#333',
              border: '1px solid #CCC',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || validationErrors.length > 0}
          style={{
            padding: '10px 24px',
            backgroundColor:
              validationErrors.length > 0 ? '#CCC' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: validationErrors.length > 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {saving ? 'Saving...' : 'Save Limits'}
        </button>
      </div>
    </div>
  );
};
