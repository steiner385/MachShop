import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  ParameterFormula,
  createFormula,
  updateFormula,
  deleteFormula,
  listFormulas,
  evaluateExpression,
  validateFormula,
  testFormula,
  extractDependencies,
  toggleFormulaActive,
} from '../../api/parameters';

interface FormulaBuilderProps {
  formula?: ParameterFormula | null;
  onSave?: (formula: ParameterFormula) => void;
  onCancel?: () => void;
}

interface TestCase {
  inputs: Record<string, number>;
  expectedOutput: number;
}

interface TestResult {
  passed: boolean;
  error?: string;
  actualOutput?: number;
}

const AVAILABLE_FUNCTIONS = [
  'sqrt', 'pow', 'abs', 'floor', 'ceil', 'round',
  'sin', 'cos', 'tan', 'log', 'exp',
  'min', 'max', 'mean', 'median', 'std'
];

export const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
  formula,
  onSave,
  onCancel,
}) => {
  const [formulaName, setFormulaName] = useState(formula?.formulaName || '');
  const [expression, setExpression] = useState(formula?.formulaExpression || '');
  const [outputParameterId, setOutputParameterId] = useState(formula?.outputParameterId || '');
  const [evaluationTrigger, setEvaluationTrigger] = useState<'ON_CHANGE' | 'ON_DEMAND' | 'SCHEDULED'>(
    formula?.evaluationTrigger || 'ON_CHANGE'
  );
  const [createdBy, setCreatedBy] = useState(formula?.createdBy || 'system');

  const [dependencies, setDependencies] = useState<string[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([
    { inputs: {}, expectedOutput: 0 },
  ]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [testExpression, setTestExpression] = useState('');
  const [testScope, setTestScope] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expression) {
      handleExtractDependencies();
      handleValidate();
    }
  }, [expression]);

  const handleExtractDependencies = async () => {
    if (!expression) return;

    try {
      const result = await extractDependencies(expression);
      setDependencies(result.dependencies);

      // Initialize test case inputs
      const newInputs: Record<string, number> = {};
      result.dependencies.forEach((dep) => {
        newInputs[dep] = 0;
      });
      setTestCases([{ inputs: newInputs, expectedOutput: 0 }]);
      setTestScope(newInputs);
    } catch (err: any) {
      console.error('Failed to extract dependencies:', err);
    }
  };

  const handleValidate = async () => {
    if (!expression) {
      setValidationError(null);
      return;
    }

    try {
      const result = await validateFormula(expression);
      setValidationError(result.valid ? null : result.errors.join(', '));
    } catch (err: any) {
      setValidationError(err.message || 'Validation failed');
    }
  };

  const handleTestExpression = async () => {
    if (!testExpression) return;

    try {
      const result = await evaluateExpression(testExpression, testScope);
      if (result.success && result.value !== undefined) {
        setTestResult(result.value);
      } else {
        setError(result.error || 'Evaluation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate');
    }
  };

  const handleRunTests = async () => {
    if (!expression || testCases.length === 0) return;

    try {
      const results = await testFormula(expression, testCases);
      setTestResults(results);
    } catch (err: any) {
      setError(err.message || 'Test execution failed');
    }
  };

  const handleSave = async () => {
    if (!formulaName || !expression || !outputParameterId) {
      setError('Formula name, expression, and output parameter are required');
      return;
    }

    if (validationError) {
      setError('Cannot save formula with validation errors');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let result: ParameterFormula;

      if (formula) {
        result = await updateFormula(formula.id, {
          formulaName,
          formulaExpression: expression,
          outputParameterId,
          evaluationTrigger,
        });
      } else {
        result = await createFormula({
          formulaName,
          formulaExpression: expression,
          outputParameterId,
          evaluationTrigger,
          isActive: true,
          createdBy,
          testCases: testCases.length > 0 ? testCases : undefined,
        });
      }

      onSave?.(result);
    } catch (err: any) {
      setError(err.message || 'Failed to save formula');
    } finally {
      setSaving(false);
    }
  };

  const addTestCase = () => {
    const newInputs: Record<string, number> = {};
    dependencies.forEach((dep) => {
      newInputs[dep] = 0;
    });
    setTestCases([...testCases, { inputs: newInputs, expectedOutput: 0 }]);
  };

  const updateTestCase = (index: number, field: 'expectedOutput' | string, value: number) => {
    const updated = [...testCases];
    if (field === 'expectedOutput') {
      updated[index].expectedOutput = value;
    } else {
      updated[index].inputs[field] = value;
    }
    setTestCases(updated);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px' }}>
        {formula ? 'Edit Formula' : 'Create New Formula'}
      </h2>

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Left Column: Formula Definition */}
        <div>
          <h3 style={{ marginBottom: '16px' }}>Formula Definition</h3>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Formula Name *
            </label>
            <input
              type="text"
              value={formulaName}
              onChange={(e) => setFormulaName(e.target.value)}
              placeholder="e.g., Flow Rate Calculation"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #CCC',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Expression *
            </label>
            <div
              style={{
                border: validationError ? '2px solid #F44336' : '1px solid #CCC',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <Editor
                height="120px"
                defaultLanguage="javascript"
                value={expression}
                onChange={(value) => setExpression(value || '')}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                  fontSize: 14,
                  fontFamily: 'monospace',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  wrappingIndent: 'indent',
                  automaticLayout: true,
                  tabSize: 2,
                  suggest: {
                    showWords: false,
                  },
                }}
              />
            </div>
            {validationError && (
              <div style={{ color: '#F44336', fontSize: '12px', marginTop: '4px' }}>
                {validationError}
              </div>
            )}
            {!validationError && expression && (
              <div style={{ color: '#4CAF50', fontSize: '12px', marginTop: '4px' }}>
                ✓ Valid expression
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Output Parameter ID *
            </label>
            <input
              type="text"
              value={outputParameterId}
              onChange={(e) => setOutputParameterId(e.target.value)}
              placeholder="e.g., calculated-flow-rate"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #CCC',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Evaluation Trigger
            </label>
            <select
              value={evaluationTrigger}
              onChange={(e) => setEvaluationTrigger(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #CCC',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="ON_CHANGE">On Change (Automatic)</option>
              <option value="ON_DEMAND">On Demand (Manual)</option>
              <option value="SCHEDULED">Scheduled (Periodic)</option>
            </select>
          </div>

          {dependencies.length > 0 && (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#E3F2FD',
                borderRadius: '4px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  marginBottom: '8px',
                  color: '#1976D2',
                }}
              >
                Detected Input Parameters:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {dependencies.map((dep) => (
                  <span
                    key={dep}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              padding: '12px',
              backgroundColor: '#F5F5F5',
              borderRadius: '4px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: '14px',
                marginBottom: '8px',
                color: '#666',
              }}
            >
              Available Functions:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px' }}>
              {AVAILABLE_FUNCTIONS.map((fn) => (
                <code
                  key={fn}
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#E0E0E0',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                  }}
                >
                  {fn}()
                </code>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Testing */}
        <div>
          <h3 style={{ marginBottom: '16px' }}>Testing & Validation</h3>

          {/* Quick Test */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#F5F5F5',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px' }}>
              Quick Test
            </h4>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                value={testExpression}
                onChange={(e) => setTestExpression(e.target.value)}
                placeholder="Enter expression to test"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #CCC',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {dependencies.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                {dependencies.map((dep) => (
                  <div
                    key={dep}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <label
                      style={{
                        flex: '0 0 100px',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {dep}:
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={testScope[dep] || 0}
                      onChange={(e) =>
                        setTestScope({
                          ...testScope,
                          [dep]: parseFloat(e.target.value) || 0,
                        })
                      }
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        border: '1px solid #CCC',
                        borderRadius: '4px',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleTestExpression}
              disabled={!testExpression}
              style={{
                width: '100%',
                padding: '8px 16px',
                backgroundColor: !testExpression ? '#CCC' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: !testExpression ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '12px',
              }}
            >
              Evaluate
            </button>

            {testResult !== null && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#E8F5E9',
                  borderRadius: '4px',
                  border: '1px solid #4CAF50',
                }}
              >
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  Result:
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#2E7D32',
                    fontFamily: 'monospace',
                  }}
                >
                  {testResult}
                </div>
              </div>
            )}
          </div>

          {/* Test Cases */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '14px' }}>Test Cases</h4>
              <button
                onClick={addTestCase}
                disabled={dependencies.length === 0}
                style={{
                  padding: '4px 12px',
                  backgroundColor: dependencies.length === 0 ? '#CCC' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: dependencies.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
              >
                + Add Test Case
              </button>
            </div>

            {testCases.map((testCase, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  backgroundColor: '#FAFAFA',
                  borderRadius: '4px',
                  marginBottom: '12px',
                  border: '1px solid #E0E0E0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    Test Case {idx + 1}
                  </span>
                  <button
                    onClick={() => removeTestCase(idx)}
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#FFEBEE',
                      color: '#D32F2F',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    Remove
                  </button>
                </div>

                {Object.keys(testCase.inputs).map((key) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '4px',
                    }}
                  >
                    <label
                      style={{
                        flex: '0 0 80px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {key}:
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={testCase.inputs[key]}
                      onChange={(e) =>
                        updateTestCase(idx, key, parseFloat(e.target.value) || 0)
                      }
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        border: '1px solid #CCC',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                ))}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #E0E0E0',
                  }}
                >
                  <label
                    style={{
                      flex: '0 0 80px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Expected:
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={testCase.expectedOutput}
                    onChange={(e) =>
                      updateTestCase(idx, 'expectedOutput', parseFloat(e.target.value) || 0)
                    }
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      border: '1px solid #CCC',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  />
                </div>

                {testResults[idx] && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: testResults[idx].passed ? '#E8F5E9' : '#FFEBEE',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    {testResults[idx].passed ? (
                      <span style={{ color: '#2E7D32', fontWeight: 600 }}>
                        ✓ Passed (output: {testResults[idx].actualOutput})
                      </span>
                    ) : (
                      <span style={{ color: '#C62828', fontWeight: 600 }}>
                        ✗ Failed: {testResults[idx].error}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {testCases.length > 0 && (
              <button
                onClick={handleRunTests}
                disabled={!expression}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  backgroundColor: !expression ? '#CCC' : '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !expression ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Run All Tests
              </button>
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
          paddingTop: '20px',
          borderTop: '1px solid #E0E0E0',
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
          disabled={saving || !!validationError || !formulaName || !expression || !outputParameterId}
          style={{
            padding: '10px 24px',
            backgroundColor:
              saving || validationError || !formulaName || !expression || !outputParameterId
                ? '#CCC'
                : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor:
              saving || validationError || !formulaName || !expression || !outputParameterId
                ? 'not-allowed'
                : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {saving ? 'Saving...' : formula ? 'Update Formula' : 'Create Formula'}
        </button>
      </div>
    </div>
  );
};
