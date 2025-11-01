/**
 * Validation Batch Results Component
 * Phase 9: Display batch validation results with summary statistics
 *
 * Features:
 * - Shows batch-level validation summary
 * - Displays success rate and record counts
 * - Shows quality score for entire batch
 * - Provides detailed error report
 * - Lists problematic records
 */

import React, { useState } from 'react';
import { TrendingUp, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react';
import ValidationResultComponent from './ValidationResult';

interface BatchError {
  field: string;
  errorType: string;
  count: number;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

interface BatchValidationResult {
  batchId: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  skippedRecords?: number;
  successRate: number;
  qualityScore?: {
    score: number;
    band: string;
  };
  errors?: any[];
  errorReport?: {
    detailedErrors?: BatchError[];
    errorSummary?: Record<string, number>;
  };
  records?: any[];
}

interface Props {
  batchResult: BatchValidationResult;
  onRetry?: () => void;
  onExport?: () => void;
}

const ValidationBatchResults: React.FC<Props> = ({
  batchResult,
  onRetry,
  onExport
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary'])
  );
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getSuccessRateColor = () => {
    if (batchResult.successRate >= 90) return 'text-green-600';
    if (batchResult.successRate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateBgColor = () => {
    if (batchResult.successRate >= 90) return 'bg-green-50';
    if (batchResult.successRate >= 70) return 'bg-yellow-50';
    return 'bg-red-50';
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

  const invalidRecords = (batchResult.records || []).filter(
    r => r.validationStatus === 'invalid'
  );

  const topErrors = React.useMemo(() => {
    if (!batchResult.errorReport?.detailedErrors) return [];
    const errorCounts = new Map<string, BatchError>();

    batchResult.errorReport.detailedErrors.forEach(error => {
      const key = `${error.field}:${error.errorType}`;
      if (errorCounts.has(key)) {
        const existing = errorCounts.get(key)!;
        existing.count += 1;
      } else {
        errorCounts.set(key, { ...error, count: 1 });
      }
    });

    return Array.from(errorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [batchResult.errorReport?.detailedErrors]);

  return (
    <div className="space-y-4">
      {/* Main Summary Card */}
      <div className={`border-2 rounded-lg p-6 ${getSuccessRateBgColor()}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Batch Validation Summary</h2>
          {batchResult.successRate >= 90 && <CheckCircle className="w-6 h-6 text-green-600" />}
          {batchResult.successRate < 90 && batchResult.successRate >= 70 && <AlertCircle className="w-6 h-6 text-yellow-600" />}
          {batchResult.successRate < 70 && <AlertCircle className="w-6 h-6 text-red-600" />}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white bg-opacity-70 rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Total Records</p>
            <p className="text-2xl font-bold text-gray-900">{batchResult.totalRecords}</p>
          </div>
          <div className="bg-white bg-opacity-70 rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Valid</p>
            <p className="text-2xl font-bold text-green-600">{batchResult.validRecords}</p>
          </div>
          <div className="bg-white bg-opacity-70 rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Invalid</p>
            <p className="text-2xl font-bold text-red-600">{batchResult.invalidRecords}</p>
          </div>
          <div className={`bg-white bg-opacity-70 rounded-lg p-4`}>
            <p className="text-gray-600 text-sm font-medium">Success Rate</p>
            <p className={`text-2xl font-bold ${getSuccessRateColor()}`}>
              {batchResult.successRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Quality Score */}
        {batchResult.qualityScore && (
          <div className="bg-white bg-opacity-70 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Dataset Quality Score</span>
              <span className={`text-lg font-bold px-4 py-2 rounded-full ${getQualityBandColor(batchResult.qualityScore.band)}`}>
                {batchResult.qualityScore.score}% - {batchResult.qualityScore.band}
              </span>
            </div>
          </div>
        )}

        {/* Batch ID */}
        <div className="mt-4 text-sm text-gray-600">
          <span className="font-medium">Batch ID:</span> {batchResult.batchId}
        </div>
      </div>

      {/* Top Errors Section */}
      {topErrors.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div
            className="bg-gray-100 px-4 py-3 cursor-pointer flex items-center justify-between"
            onClick={() => toggleSection('errors')}
          >
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Top Errors
            </h3>
            <svg
              className={`w-5 h-5 transition-transform ${expandedSections.has('errors') ? 'rotate-180' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          {expandedSections.has('errors') && (
            <div className="p-4 space-y-2">
              {topErrors.map((error, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {error.field}: {error.errorType}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-red-600">{error.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invalid Records Section */}
      {invalidRecords.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div
            className="bg-gray-100 px-4 py-3 cursor-pointer flex items-center justify-between"
            onClick={() => toggleSection('invalidRecords')}
          >
            <h3 className="font-semibold text-gray-900">
              Invalid Records ({invalidRecords.length})
            </h3>
            <svg
              className={`w-5 h-5 transition-transform ${expandedSections.has('invalidRecords') ? 'rotate-180' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          {expandedSections.has('invalidRecords') && (
            <div className="divide-y max-h-96 overflow-y-auto">
              {invalidRecords.map((record, idx) => (
                <div
                  key={idx}
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedRecordIndex(selectedRecordIndex === idx ? null : idx)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        Row {record.rowNumber || idx + 1}
                      </p>
                      <p className="text-sm text-gray-600">
                        {record.enrichedErrors?.length || 0} error{(record.enrichedErrors?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {selectedRecordIndex === idx && record.validationResult && (
                    <div className="mt-4">
                      <ValidationResultComponent
                        result={{
                          isValid: false,
                          recordId: record.id,
                          errors: record.enrichedErrors,
                          errorCount: record.enrichedErrors?.length || 0
                        }}
                        expanded={true}
                        showQualityScore={false}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {(onRetry || onExport) && (
        <div className="flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Retry Import
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Export Report
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationBatchResults;
