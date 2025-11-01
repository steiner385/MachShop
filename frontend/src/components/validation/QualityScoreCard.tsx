/**
 * Quality Score Card Component
 * Phase 9: Display quality scores with visual indicators
 *
 * Features:
 * - Shows overall quality score with gauge
 * - Displays quality dimensions (completeness, validity, consistency, accuracy)
 * - Color-coded quality bands
 * - Trend indicators
 * - Recommendations
 */

import React from 'react';
import { TrendingUp, AlertCircle, Award } from 'lucide-react';

interface QualityDimension {
  name: string;
  value: number;
  weight: number;
}

interface QualityScore {
  score: number;
  band: string;
  dimensions?: {
    completeness: number;
    validity: number;
    consistency: number;
    accuracy: number;
  };
  recommendations?: string[];
}

interface Props {
  qualityScore: QualityScore;
  previousScore?: number;
  compact?: boolean;
}

const QualityScoreCard: React.FC<Props> = ({
  qualityScore,
  previousScore,
  compact = false
}) => {
  const getQualityBandColor = (band: string) => {
    switch (band) {
      case 'EXCELLENT':
        return {
          bg: 'bg-green-50',
          border: 'border-green-300',
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-800',
          icon: 'text-green-600'
        };
      case 'GOOD':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-700',
          badge: 'bg-blue-100 text-blue-800',
          icon: 'text-blue-600'
        };
      case 'ACCEPTABLE':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800',
          icon: 'text-yellow-600'
        };
      case 'POOR':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          text: 'text-orange-700',
          badge: 'bg-orange-100 text-orange-800',
          icon: 'text-orange-600'
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
          icon: 'text-red-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-800',
          icon: 'text-gray-600'
        };
    }
  };

  const colors = getQualityBandColor(qualityScore.band);

  const scoreImprovement = previousScore
    ? qualityScore.score - previousScore
    : null;

  const dimensions = [
    { name: 'Completeness', value: qualityScore.dimensions?.completeness || 0 },
    { name: 'Validity', value: qualityScore.dimensions?.validity || 0 },
    { name: 'Consistency', value: qualityScore.dimensions?.consistency || 0 },
    { name: 'Accuracy', value: qualityScore.dimensions?.accuracy || 0 }
  ];

  const getDimensionColor = (value: number) => {
    if (value >= 90) return 'from-green-400 to-green-600';
    if (value >= 75) return 'from-blue-400 to-blue-600';
    if (value >= 60) return 'from-yellow-400 to-yellow-600';
    if (value >= 40) return 'from-orange-400 to-orange-600';
    return 'from-red-400 to-red-600';
  };

  if (compact) {
    return (
      <div className={`border-2 rounded-lg p-4 ${colors.bg} border-${colors.border}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Quality Score</p>
            <p className={`text-3xl font-bold ${colors.text}`}>{qualityScore.score}%</p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${colors.badge}`}>
              {qualityScore.band}
            </span>
            {scoreImprovement !== null && (
              <div className="mt-2 flex items-center justify-end gap-1">
                <TrendingUp className={`w-4 h-4 ${scoreImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                <span className={`text-sm font-medium ${scoreImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {scoreImprovement >= 0 ? '+' : ''}{scoreImprovement}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-2 rounded-lg p-6 ${colors.bg} border-${colors.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Award className={`w-6 h-6 ${colors.icon}`} />
          <h3 className={`text-xl font-bold ${colors.text}`}>Quality Score</h3>
        </div>
        {scoreImprovement !== null && (
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-5 h-5 ${scoreImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`text-lg font-bold ${scoreImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {scoreImprovement >= 0 ? '+' : ''}{scoreImprovement}
            </span>
          </div>
        )}
      </div>

      {/* Main Score */}
      <div className="mb-6">
        <div className="flex items-end gap-4">
          <div className="relative w-24 h-24">
            <svg className="transform -rotate-90 w-24 h-24" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="4"
                strokeDasharray={`${(qualityScore.score / 100) * 283} 283`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={
                    qualityScore.score >= 90 ? '#10b981' :
                    qualityScore.score >= 75 ? '#3b82f6' :
                    qualityScore.score >= 60 ? '#f59e0b' :
                    qualityScore.score >= 40 ? '#f97316' :
                    '#ef4444'
                  } />
                  <stop offset="100%" stopColor={
                    qualityScore.score >= 90 ? '#059669' :
                    qualityScore.score >= 75 ? '#1d4ed8' :
                    qualityScore.score >= 60 ? '#d97706' :
                    qualityScore.score >= 40 ? '#ea580c' :
                    '#dc2626'
                  } />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className={`text-2xl font-bold ${colors.text}`}>{qualityScore.score}%</p>
            </div>
          </div>
          <div>
            <p className={`text-3xl font-bold ${colors.text} mb-2`}>{qualityScore.band}</p>
            <p className="text-sm text-gray-600">Overall Quality</p>
          </div>
        </div>
      </div>

      {/* Dimensions */}
      {dimensions.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Quality Dimensions</h4>
          <div className="space-y-3">
            {dimensions.map((dimension, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{dimension.name}</span>
                  <span className="text-sm font-bold text-gray-900">{dimension.value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${getDimensionColor(dimension.value)} transition-all duration-300`}
                    style={{ width: `${dimension.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {qualityScore.recommendations && qualityScore.recommendations.length > 0 && (
        <div className="bg-white bg-opacity-60 rounded-lg p-3">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="font-semibold text-gray-900 text-sm">Recommendations</p>
          </div>
          <ul className="space-y-1 text-sm text-gray-700">
            {qualityScore.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QualityScoreCard;
