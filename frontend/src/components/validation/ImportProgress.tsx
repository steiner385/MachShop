/**
 * Import Progress Component
 * Phase 9: Display real-time progress during bulk import operations
 *
 * Features:
 * - Shows progress bar with percentage
 * - Displays current stage (pre-import, per-record, post-import, commit)
 * - Shows record counts (processed, valid, invalid)
 * - Lists current errors
 * - Provides time estimation
 */

import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface ProgressUpdate {
  stage: string;
  recordsProcessed: number;
  totalRecords: number;
  percentage: number;
  currentErrors: number;
  validRecords: number;
  invalidRecords: number;
}

interface Props {
  update?: ProgressUpdate;
  isRunning?: boolean;
  estimatedTimeRemaining?: number;
  onCancel?: () => void;
}

const ImportProgress: React.FC<Props> = ({
  update,
  isRunning = true,
  estimatedTimeRemaining,
  onCancel
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStageLabel = (stage?: string) => {
    const labels: Record<string, string> = {
      'pre_import': 'Pre-Import Validation',
      'per_record': 'Processing Records',
      'post_import': 'Post-Import Validation',
      'commit': 'Database Commit'
    };
    return labels[stage || ''] || stage || 'Processing...';
  };

  const getStageColor = (stage?: string) => {
    switch (stage) {
      case 'pre_import':
        return 'bg-blue-500';
      case 'per_record':
        return 'bg-green-500';
      case 'post_import':
        return 'bg-yellow-500';
      case 'commit':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const percentage = update?.percentage || 0;
  const recordsProcessed = update?.recordsProcessed || 0;
  const totalRecords = update?.totalRecords || 0;
  const validRecords = update?.validRecords || 0;
  const invalidRecords = update?.invalidRecords || 0;
  const currentErrors = update?.currentErrors || 0;

  return (
    <div className="space-y-4">
      {/* Main Progress Card */}
      <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {isRunning ? (
              <Loader className="w-5 h-5 text-blue-600 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            {getStageLabel(update?.stage)}
          </h3>
          <span className="text-sm font-medium text-gray-600">
            {recordsProcessed} / {totalRecords} records
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className={`text-lg font-bold ${percentage === 100 ? 'text-green-600' : 'text-blue-600'}`}>
              {percentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${getStageColor(update?.stage)} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Stage Indicator */}
        <div className="mb-6">
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStageColor(update?.stage)} text-white`}>
            {getStageLabel(update?.stage)}
          </div>
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Elapsed Time</p>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatTime(elapsedTime)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Processing Rate</p>
            <p className="text-sm font-semibold text-gray-900">
              {elapsedTime > 0 ? (recordsProcessed / (elapsedTime / 60)).toFixed(1) : 0} r/min
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Time Remaining</p>
            <p className="text-sm font-semibold text-gray-900">
              {estimatedTimeRemaining ? formatTime(estimatedTimeRemaining) : 'calculating...'}
            </p>
          </div>
        </div>

        {/* Record Statistics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium">Total Processed</p>
            <p className="text-2xl font-bold text-blue-900">{recordsProcessed}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-600 font-medium">Valid</p>
            <p className="text-2xl font-bold text-green-900">{validRecords}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-600 font-medium">Invalid</p>
            <p className="text-2xl font-bold text-red-900">{invalidRecords}</p>
          </div>
        </div>

        {/* Current Errors */}
        {currentErrors > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  {currentErrors} error{currentErrors !== 1 ? 's' : ''} detected
                </p>
                <p className="text-xs text-red-700">
                  Errors will be detailed in the final report
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Button */}
      {onCancel && isRunning && (
        <button
          onClick={onCancel}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Cancel Import
        </button>
      )}
    </div>
  );
};

export default ImportProgress;
