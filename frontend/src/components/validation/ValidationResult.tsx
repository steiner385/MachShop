/**
 * Validation Result Component
 * Phase 9: Display validation results with status, errors, and quality scores
 *
 * Features:
 * - Shows validation status (valid/invalid)
 * - Displays error count and details
 * - Shows quality score with visual indicator
 * - Lists enriched error messages with suggestions
 * - Provides detailed error breakdown by field
 */

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface ValidationError {
  field: string;
  errorType: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string | {
    code: string;
    title: string;
    description: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    category: string;
  };
  suggestion?: string;
}

interface ValidationResult {
  isValid: boolean;
  recordId?: string;
  errors?: ValidationError[];
  qualityScore?: {
    score: number;
    band: string;
    dimensions?: {
      completeness: number;
      validity: number;
      consistency: number;
      accuracy: number;
    };
  };
  fieldCount?: number;
  errorCount?: number;
}

interface Props {
  result: ValidationResult;
  expanded?: boolean;
  showQualityScore?: boolean;
  onExpandClick?: () => void;
}

const ValidationResultComponent: React.FC<Props> = ({
  result,
  expanded = false,
  showQualityScore = true,
  onExpandClick
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [selectedError, setSelectedError] = useState<ValidationError | null>(null);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    onExpandClick?.();
  };

  const getStatusIcon = () => {
    if (result.isValid) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  const getStatusColor = () => {
    if (result.isValid) return 'bg-green-50 border-green-200';
    return 'bg-red-50 border-red-200';
  };

  const getStatusText = () => {
    if (result.isValid) return 'Valid';
    return `Invalid (${result.errorCount || result.errors?.length || 0} error${(result.errorCount || result.errors?.length || 0) !== 1 ? 's' : ''})`;
  };

  const getQualityBandColor = (band?: string) => {
    switch (band) {
      case 'EXCELLENT':
        return 'bg-green-100 text-green-800';
      case 'GOOD':
        return 'bg-blue-100 text-blue-800';
      case 'ACCEPTABLE':
        return 'bg-yellow-100 text-yellow-800';
      case 'POOR':
        return 'bg-orange-100 text-orange-800';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getErrorSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'ERROR':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'INFO':
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getErrorMessage = (error: ValidationError) => {
    if (typeof error.message === 'string') {
      return error.message;
    }
    return error.message.title || error.message.description;
  };

  const getErrorCode = (error: ValidationError) => {
    if (typeof error.message === 'object' && error.message.code) {
      return error.message.code;
    }
    return null;
  };

  const groupedErrors = React.useMemo(() => {
    const groups: Record<string, ValidationError[]> = {};
    (result.errors || []).forEach(error => {
      const key = error.field || 'general';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(error);
    });
    return groups;
  }, [result.errors]);

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer" onClick={toggleExpanded}>
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold text-gray-900">{getStatusText()}</h3>
            {result.recordId && (
              <p className="text-sm text-gray-600">Record ID: {result.recordId}</p>
            )}
          </div>
        </div>
        {isExpanded ? (
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Quality Score */}
      {showQualityScore && result.qualityScore && (
        <div className="mt-4 p-3 bg-white bg-opacity-60 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Quality Score</span>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getQualityBandColor(result.qualityScore.band)}`}>
              {result.qualityScore.score}% - {result.qualityScore.band}
            </span>
          </div>
          {result.qualityScore.dimensions && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="bg-white bg-opacity-70 p-2 rounded">
                <p className="text-gray-600">Completeness</p>
                <p className="font-semibold text-gray-900">{result.qualityScore.dimensions.completeness}%</p>
              </div>
              <div className="bg-white bg-opacity-70 p-2 rounded">
                <p className="text-gray-600">Validity</p>
                <p className="font-semibold text-gray-900">{result.qualityScore.dimensions.validity}%</p>
              </div>
              <div className="bg-white bg-opacity-70 p-2 rounded">
                <p className="text-gray-600">Consistency</p>
                <p className="font-semibold text-gray-900">{result.qualityScore.dimensions.consistency}%</p>
              </div>
              <div className="bg-white bg-opacity-70 p-2 rounded">
                <p className="text-gray-600">Accuracy</p>
                <p className="font-semibold text-gray-900">{result.qualityScore.dimensions.accuracy}%</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Field Summary */}
          {result.fieldCount && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Fields:</span> {result.fieldCount}
            </div>
          )}

          {/* Grouped Errors */}
          {Object.keys(groupedErrors).length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 text-sm">Error Details</h4>
              {Object.entries(groupedErrors).map(([field, errors]) => (
                <div key={field} className="bg-white bg-opacity-60 rounded-lg p-3 space-y-2">
                  <p className="font-medium text-gray-900 text-sm">{field}</p>
                  <div className="space-y-1">
                    {errors.map((error, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        {getErrorSeverityIcon(error.severity)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">
                            {getErrorMessage(error)}
                            {getErrorCode(error) && (
                              <span className="ml-2 text-xs text-gray-600">({getErrorCode(error)})</span>
                            )}
                          </p>
                          {error.suggestion && (
                            <p className="text-xs text-gray-600 italic mt-1">
                              💡 Suggestion: {error.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Errors Message */}
          {(!result.errors || result.errors.length === 0) && result.isValid && (
            <div className="text-sm text-gray-700 p-3 bg-white bg-opacity-60 rounded-lg">
              ✓ All validation checks passed
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationResultComponent;
