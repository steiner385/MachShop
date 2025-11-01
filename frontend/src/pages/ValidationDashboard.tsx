/**
 * Validation Dashboard Page
 * Phase 9: Complete validation UI page combining all validation components
 *
 * Features:
 * - Bulk import validation workflow
 * - Real-time progress tracking
 * - Result display with quality scores
 * - Error analysis and reporting
 * - Import history
 */

import React, { useState } from 'react';
import { UploadCloud, RotateCcw, Download, Loader } from 'lucide-react';
import ValidationResultComponent from '../components/validation/ValidationResult';
import ValidationBatchResults from '../components/validation/ValidationBatchResults';
import ImportProgress from '../components/validation/ImportProgress';
import QualityScoreCard from '../components/validation/QualityScoreCard';

type ValidationStage = 'idle' | 'uploading' | 'validating' | 'completed' | 'error';

interface ImportHistory {
  id: string;
  date: string;
  entityType: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  successRate: number;
  status: 'success' | 'partial' | 'failed';
}

const ValidationDashboard: React.FC = () => {
  const [stage, setStage] = useState<ValidationStage>('idle');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [batchResult, setBatchResult] = useState<any | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<any | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([
    {
      id: 'imp-001',
      date: '2024-11-01',
      entityType: 'PART',
      totalRecords: 150,
      validRecords: 147,
      invalidRecords: 3,
      successRate: 98,
      status: 'success'
    },
    {
      id: 'imp-002',
      date: '2024-10-31',
      entityType: 'BOM_ITEM',
      totalRecords: 250,
      validRecords: 225,
      invalidRecords: 25,
      successRate: 90,
      status: 'partial'
    }
  ]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleStartValidation = async () => {
    if (!uploadedFile) return;

    setStage('uploading');

    // Simulate file upload delay
    await new Promise(resolve => setTimeout(resolve, 500));

    setStage('validating');

    // Simulate validation progress
    const mockProgress = [
      { percentage: 10, recordsProcessed: 10, stage: 'pre_import' },
      { percentage: 30, recordsProcessed: 30, stage: 'per_record' },
      { percentage: 60, recordsProcessed: 60, stage: 'per_record' },
      { percentage: 90, recordsProcessed: 100, stage: 'post_import' },
      { percentage: 95, recordsProcessed: 100, stage: 'commit' },
      { percentage: 100, recordsProcessed: 100, stage: 'commit' }
    ];

    for (const progress of mockProgress) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgressUpdate({
        ...progress,
        totalRecords: 100,
        currentErrors: Math.floor(Math.random() * 5),
        validRecords: progress.recordsProcessed,
        invalidRecords: 0
      });
    }

    // Mock batch result
    const mockBatchResult = {
      batchId: `batch-${Date.now()}`,
      totalRecords: 100,
      validRecords: 98,
      invalidRecords: 2,
      successRate: 98,
      qualityScore: {
        score: 92,
        band: 'EXCELLENT',
        dimensions: {
          completeness: 95,
          validity: 92,
          consistency: 90,
          accuracy: 89
        }
      },
      errorReport: {
        detailedErrors: [
          {
            field: 'partNumber',
            errorType: 'REQUIRED_FIELD',
            count: 1,
            severity: 'ERROR'
          },
          {
            field: 'standardCost',
            errorType: 'FORMAT',
            count: 1,
            severity: 'ERROR'
          }
        ]
      },
      records: [
        {
          id: 'rec-001',
          rowNumber: 1,
          validationStatus: 'valid',
          data: { partNumber: 'PART-001', description: 'Valid Part' }
        },
        {
          id: 'rec-002',
          rowNumber: 2,
          validationStatus: 'invalid',
          enrichedErrors: [
            {
              field: 'partNumber',
              errorType: 'REQUIRED_FIELD',
              severity: 'ERROR',
              message: 'Part Number is required'
            }
          ]
        }
      ]
    };

    setBatchResult(mockBatchResult);
    setStage('completed');

    // Add to history
    const newHistory: ImportHistory = {
      id: mockBatchResult.batchId,
      date: new Date().toISOString().split('T')[0],
      entityType: 'PART',
      totalRecords: mockBatchResult.totalRecords,
      validRecords: mockBatchResult.validRecords,
      invalidRecords: mockBatchResult.invalidRecords,
      successRate: mockBatchResult.successRate,
      status: mockBatchResult.successRate >= 95 ? 'success' : 'partial'
    };
    setImportHistory([newHistory, ...importHistory]);
  };

  const handleReset = () => {
    setStage('idle');
    setUploadedFile(null);
    setBatchResult(null);
    setProgressUpdate(null);
  };

  const handleRetry = () => {
    handleStartValidation();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export functionality coming soon');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Data Validation</h1>
          <p className="text-gray-600">Validate, monitor, and import data with confidence</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* File Upload Section */}
            {stage === 'idle' && (
              <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Start Validation</h2>

                <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50 mb-6">
                  <UploadCloud className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">Select a file to validate</p>
                  <p className="text-sm text-gray-600 mb-4">CSV, XLSX, or JSON formats supported</p>

                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".csv,.xlsx,.json"
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors font-medium"
                  >
                    Choose File
                  </label>
                </div>

                {uploadedFile && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-600 mb-2">Selected File:</p>
                    <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}

                <button
                  onClick={handleStartValidation}
                  disabled={!uploadedFile || stage !== 'idle'}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  Start Validation
                </button>
              </div>
            )}

            {/* Progress Section */}
            {stage === 'uploading' && (
              <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                <div className="flex items-center justify-center">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin mr-3" />
                  <p className="text-lg font-medium text-gray-900">Uploading file...</p>
                </div>
              </div>
            )}

            {stage === 'validating' && (
              <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                <ImportProgress
                  update={progressUpdate}
                  isRunning={stage === 'validating'}
                  onCancel={handleReset}
                />
              </div>
            )}

            {/* Results Section */}
            {stage === 'completed' && batchResult && (
              <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Validation Results</h2>

                {/* Quality Score */}
                <div className="mb-6">
                  <QualityScoreCard
                    qualityScore={batchResult.qualityScore}
                    previousScore={98}
                  />
                </div>

                {/* Batch Summary */}
                <ValidationBatchResults
                  batchResult={batchResult}
                  onRetry={handleRetry}
                  onExport={handleExport}
                />

                <button
                  onClick={handleReset}
                  className="w-full mt-6 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Start New Import
                </button>
              </div>
            )}
          </div>

          {/* Sidebar - Statistics & History */}
          <div>
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>

              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 font-medium mb-1">Total Imports</p>
                  <p className="text-2xl font-bold text-green-900">{importHistory.length}</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium mb-1">Avg Success Rate</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {(importHistory.reduce((acc, h) => acc + h.successRate, 0) / importHistory.length).toFixed(1)}%
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600 font-medium mb-1">Records Processed</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {importHistory.reduce((acc, h) => acc + h.totalRecords, 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Import History */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Imports</h3>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {importHistory.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 text-sm">{item.entityType}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeColor(item.status)}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{item.date}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-600">Total</p>
                        <p className="font-bold text-gray-900">{item.totalRecords}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Valid</p>
                        <p className="font-bold text-green-600">{item.validRecords}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Success</p>
                        <p className="font-bold text-blue-600">{item.successRate}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationDashboard;
