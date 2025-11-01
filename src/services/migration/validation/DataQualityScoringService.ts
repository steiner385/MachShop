/**
 * Data Quality Scoring Service
 * Phase 5: Comprehensive data quality measurement and analysis
 *
 * Provides:
 * - Multi-dimensional quality scoring (Completeness, Validity, Consistency, Accuracy)
 * - Weighted quality calculations
 * - Score history and trends
 * - Dataset and record-level quality metrics
 * - Quality improvement recommendations
 * - Threshold-based scoring bands
 */

import {
  ValidationResult,
  ValidationError,
  EntityType,
  Severity,
  ValidationType
} from './ValidationService';

// ============================================================================
// Quality Score Dimensions
// ============================================================================

export enum QualityDimension {
  COMPLETENESS = 'completeness',
  VALIDITY = 'validity',
  CONSISTENCY = 'consistency',
  ACCURACY = 'accuracy'
}

export enum QualityBand {
  EXCELLENT = 'EXCELLENT',    // 90-100%
  GOOD = 'GOOD',              // 70-89%
  ACCEPTABLE = 'ACCEPTABLE',  // 50-69%
  POOR = 'POOR',              // 30-49%
  CRITICAL = 'CRITICAL'       // 0-29%
}

export interface DimensionScore {
  dimension: QualityDimension;
  score: number;
  weight: number;
  details: {
    totalFields: number;
    compliantFields: number;
    issueCount: number;
    severity: {
      errors: number;
      warnings: number;
      info: number;
    };
  };
}

export interface QualityScore {
  overall: number;
  band: QualityBand;
  dimensions: DimensionScore[];
  confidence: number;
  lastUpdated: Date;
  trend?: 'improving' | 'declining' | 'stable';
}

export interface RecordQualityScore extends QualityScore {
  recordId?: string;
  recordKey?: string;
  entityType: EntityType;
  fieldCount: number;
  issueCount: number;
}

export interface DatasetQualityScore extends QualityScore {
  recordCount: number;
  validRecords: number;
  invalidRecords: number;
  averageIssuesPerRecord: number;
  coverage: {
    completeRecords: number;
    partialRecords: number;
    emptyRecords: number;
  };
}

export interface QualityMetric {
  metric: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface QualityReport {
  generatedAt: Date;
  period?: {
    startDate: Date;
    endDate: Date;
  };
  summary: DatasetQualityScore;
  metrics: QualityMetric[];
  recommendations: QualityRecommendation[];
  trends: QualityTrend[];
}

export interface QualityRecommendation {
  priority: 'high' | 'medium' | 'low';
  area: QualityDimension | 'general';
  title: string;
  description: string;
  estimatedImpact: number; // Potential score improvement percentage
  effort: 'low' | 'medium' | 'high';
}

export interface QualityTrend {
  dimension: QualityDimension;
  timestamp: Date;
  score: number;
  change: number; // percentage change from previous period
}

export interface QualityScoringConfig {
  dimensionWeights: {
    completeness: number;
    validity: number;
    consistency: number;
    accuracy: number;
  };
  qualityBands: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
    critical: number;
  };
  minConfidence: number;
  trackHistory: boolean;
  historyRetention: number; // days
}

// ============================================================================
// Data Quality Scoring Service
// ============================================================================

export class DataQualityScoringService {
  private scoreHistory: Map<string, QualityScore[]> = new Map();
  private config: QualityScoringConfig;

  constructor(config: Partial<QualityScoringConfig> = {}) {
    this.config = {
      dimensionWeights: {
        completeness: 0.25,
        validity: 0.35,
        consistency: 0.20,
        accuracy: 0.20,
        ...(config.dimensionWeights || {})
      },
      qualityBands: {
        excellent: 90,
        good: 70,
        acceptable: 50,
        poor: 30,
        critical: 0,
        ...(config.qualityBands || {})
      },
      minConfidence: config.minConfidence || 0.7,
      trackHistory: config.trackHistory !== false,
      historyRetention: config.historyRetention || 90
    };
  }

  /**
   * Calculate quality score for a single record
   */
  calculateRecordScore(
    validationResult: ValidationResult,
    entityType: EntityType,
    totalFields: number,
    recordId?: string
  ): RecordQualityScore {
    const errors = validationResult.errors;
    const dimensionScores = this.calculateDimensions(errors, totalFields);
    const overall = this.calculateOverallScore(dimensionScores);
    const band = this.determineQualityBand(overall);

    const score: RecordQualityScore = {
      overall,
      band,
      dimensions: dimensionScores,
      confidence: this.calculateConfidence(validationResult),
      lastUpdated: new Date(),
      recordId,
      entityType,
      fieldCount: totalFields,
      issueCount: errors.length
    };

    // Track history if enabled
    if (this.config.trackHistory && recordId) {
      this.addToHistory(recordId, score);
    }

    return score;
  }

  /**
   * Calculate quality score for a dataset
   */
  calculateDatasetScore(
    validationResults: ValidationResult[],
    recordCount: number,
    entityType: EntityType,
    fieldsPerRecord: number
  ): DatasetQualityScore {
    const allErrors = validationResults.flatMap(r => r.errors);
    const validRecords = validationResults.filter(r => r.isValid).length;
    const invalidRecords = recordCount - validRecords;

    // Calculate coverage
    const coverage = this.calculateCoverage(validationResults, recordCount);

    // Calculate dimension scores across dataset
    const dimensionScores = this.calculateDimensions(allErrors, fieldsPerRecord);
    const overall = this.calculateOverallScore(dimensionScores);
    const band = this.determineQualityBand(overall);

    // Calculate average issues per record
    const averageIssuesPerRecord = allErrors.length / Math.max(recordCount, 1);

    const score: DatasetQualityScore = {
      overall,
      band,
      dimensions: dimensionScores,
      confidence: this.calculateDatasetConfidence(validationResults),
      lastUpdated: new Date(),
      recordCount,
      validRecords,
      invalidRecords,
      averageIssuesPerRecord,
      coverage
    };

    return score;
  }

  /**
   * Calculate dimension scores for completeness, validity, consistency, accuracy
   */
  private calculateDimensions(errors: ValidationError[], totalFields: number): DimensionScore[] {
    const dimensionErrors = this.groupErrorsByDimension(errors);
    const totalErrors = errors.length;

    const dimensions: DimensionScore[] = [
      // Completeness: Absence of missing/empty values
      {
        dimension: QualityDimension.COMPLETENESS,
        score: this.calculateDimensionScore(
          dimensionErrors.completeness.length,
          totalErrors,
          totalFields
        ),
        weight: this.config.dimensionWeights.completeness,
        details: {
          totalFields,
          compliantFields: totalFields - dimensionErrors.completeness.length,
          issueCount: dimensionErrors.completeness.length,
          severity: this.calculateSeverityCounts(dimensionErrors.completeness)
        }
      },
      // Validity: Values conform to format and type constraints
      {
        dimension: QualityDimension.VALIDITY,
        score: this.calculateDimensionScore(
          dimensionErrors.validity.length,
          totalErrors,
          totalFields
        ),
        weight: this.config.dimensionWeights.validity,
        details: {
          totalFields,
          compliantFields: totalFields - dimensionErrors.validity.length,
          issueCount: dimensionErrors.validity.length,
          severity: this.calculateSeverityCounts(dimensionErrors.validity)
        }
      },
      // Consistency: Values are consistent across records and with business rules
      {
        dimension: QualityDimension.CONSISTENCY,
        score: this.calculateDimensionScore(
          dimensionErrors.consistency.length,
          totalErrors,
          totalFields
        ),
        weight: this.config.dimensionWeights.consistency,
        details: {
          totalFields,
          compliantFields: totalFields - dimensionErrors.consistency.length,
          issueCount: dimensionErrors.consistency.length,
          severity: this.calculateSeverityCounts(dimensionErrors.consistency)
        }
      },
      // Accuracy: Values are correct and trustworthy
      {
        dimension: QualityDimension.ACCURACY,
        score: this.calculateDimensionScore(
          dimensionErrors.accuracy.length,
          totalErrors,
          totalFields
        ),
        weight: this.config.dimensionWeights.accuracy,
        details: {
          totalFields,
          compliantFields: totalFields - dimensionErrors.accuracy.length,
          issueCount: dimensionErrors.accuracy.length,
          severity: this.calculateSeverityCounts(dimensionErrors.accuracy)
        }
      }
    ];

    return dimensions;
  }

  /**
   * Group validation errors by quality dimension
   */
  private groupErrorsByDimension(errors: ValidationError[]) {
    const groups = {
      completeness: [] as ValidationError[],
      validity: [] as ValidationError[],
      consistency: [] as ValidationError[],
      accuracy: [] as ValidationError[]
    };

    errors.forEach(error => {
      switch (error.errorType) {
        case ValidationType.REQUIRED_FIELD:
        case ValidationType.UNIQUE:
          groups.completeness.push(error);
          break;

        case ValidationType.FORMAT:
        case ValidationType.DATA_TYPE:
        case ValidationType.ENUM:
        case ValidationType.RANGE:
          groups.validity.push(error);
          break;

        case ValidationType.BUSINESS_RULE:
        case ValidationType.CONSISTENCY:
          groups.consistency.push(error);
          break;

        case ValidationType.FOREIGN_KEY:
        case ValidationType.CUSTOM:
          groups.accuracy.push(error);
          break;

        default:
          groups.validity.push(error);
      }
    });

    return groups;
  }

  /**
   * Calculate score for a single dimension
   */
  private calculateDimensionScore(
    issueCount: number,
    totalErrors: number,
    totalFields: number
  ): number {
    if (totalFields === 0) return 100;

    const issueRatio = issueCount / totalFields;
    const score = Math.max(0, 100 * (1 - issueRatio));

    return Math.round(score);
  }

  /**
   * Calculate overall quality score from dimension scores
   */
  private calculateOverallScore(dimensions: DimensionScore[]): number {
    const weightedSum = dimensions.reduce((sum, dim) => {
      return sum + dim.score * dim.weight;
    }, 0);

    return Math.round(weightedSum);
  }

  /**
   * Determine quality band based on score
   */
  private determineQualityBand(score: number): QualityBand {
    if (score >= this.config.qualityBands.excellent) {
      return QualityBand.EXCELLENT;
    }
    if (score >= this.config.qualityBands.good) {
      return QualityBand.GOOD;
    }
    if (score >= this.config.qualityBands.acceptable) {
      return QualityBand.ACCEPTABLE;
    }
    if (score >= this.config.qualityBands.poor) {
      return QualityBand.POOR;
    }
    return QualityBand.CRITICAL;
  }

  /**
   * Calculate confidence in the quality score
   */
  private calculateConfidence(validationResult: ValidationResult): number {
    if (validationResult.isValid) {
      return 1.0;
    }

    const errorCount = validationResult.errors.length;
    const severity = validationResult.errors.reduce((max, err) => {
      const severityMap = { [Severity.ERROR]: 3, [Severity.WARNING]: 2, [Severity.INFO]: 1 };
      return Math.max(max, severityMap[err.severity] || 0);
    }, 0);

    // Confidence decreases with more errors and higher severity
    const confidence = Math.max(0, 1 - (errorCount * 0.1 + severity * 0.05));
    return Math.max(this.config.minConfidence, confidence);
  }

  /**
   * Calculate dataset-level confidence
   */
  private calculateDatasetConfidence(validationResults: ValidationResult[]): number {
    if (validationResults.length === 0) return 1.0;

    const validCount = validationResults.filter(r => r.isValid).length;
    const confidence = validCount / validationResults.length;

    return Math.max(this.config.minConfidence, confidence);
  }

  /**
   * Calculate coverage metrics
   */
  private calculateCoverage(
    validationResults: ValidationResult[],
    recordCount: number
  ): { completeRecords: number; partialRecords: number; emptyRecords: number } {
    let completeRecords = 0;
    let partialRecords = 0;
    let emptyRecords = 0;

    validationResults.forEach(result => {
      if (result.errors.length === 0) {
        completeRecords++;
      } else {
        const hasRequiredFieldErrors = result.errors.some(
          e => e.errorType === ValidationType.REQUIRED_FIELD
        );
        if (hasRequiredFieldErrors) {
          emptyRecords++;
        } else {
          partialRecords++;
        }
      }
    });

    return { completeRecords, partialRecords, emptyRecords };
  }

  /**
   * Calculate severity counts for errors
   */
  private calculateSeverityCounts(errors: ValidationError[]) {
    return {
      errors: errors.filter(e => e.severity === Severity.ERROR).length,
      warnings: errors.filter(e => e.severity === Severity.WARNING).length,
      info: errors.filter(e => e.severity === Severity.INFO).length
    };
  }

  /**
   * Generate quality report
   */
  generateQualityReport(
    score: DatasetQualityScore,
    period?: { startDate: Date; endDate: Date }
  ): QualityReport {
    const recommendations = this.generateRecommendations(score);
    const trends = this.calculateTrends(score);

    const metrics: QualityMetric[] = [
      {
        metric: 'Overall Quality Score',
        value: score.overall,
        unit: '%',
        threshold: 80,
        status: this.getMetricStatus(score.overall, 80)
      },
      {
        metric: 'Valid Records Ratio',
        value: Math.round((score.validRecords / score.recordCount) * 100),
        unit: '%',
        threshold: 95,
        status: this.getMetricStatus(
          (score.validRecords / score.recordCount) * 100,
          95
        )
      },
      {
        metric: 'Completeness Score',
        value: score.dimensions[0].score,
        unit: '%',
        threshold: 90,
        status: this.getMetricStatus(score.dimensions[0].score, 90)
      },
      {
        metric: 'Validity Score',
        value: score.dimensions[1].score,
        unit: '%',
        threshold: 90,
        status: this.getMetricStatus(score.dimensions[1].score, 90)
      },
      {
        metric: 'Average Issues Per Record',
        value: Math.round(score.averageIssuesPerRecord * 100) / 100,
        unit: 'count',
        threshold: 0.5,
        status: this.getMetricStatus(
          score.recordCount - score.averageIssuesPerRecord,
          score.recordCount * 0.9
        )
      }
    ];

    return {
      generatedAt: new Date(),
      period,
      summary: score,
      metrics,
      recommendations,
      trends
    };
  }

  /**
   * Generate quality improvement recommendations
   */
  private generateRecommendations(score: DatasetQualityScore): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = [];

    // Check each dimension for improvement opportunities
    score.dimensions.forEach(dimension => {
      if (dimension.score < 80) {
        let title = '';
        let description = '';
        let effort: 'low' | 'medium' | 'high' = 'medium';

        switch (dimension.dimension) {
          case QualityDimension.COMPLETENESS:
            title = 'Improve Data Completeness';
            description = `${dimension.details.issueCount} fields are missing or empty. Implement mandatory field validation and data entry requirements.`;
            effort = 'low';
            break;

          case QualityDimension.VALIDITY:
            title = 'Improve Data Validity';
            description = `${dimension.details.issueCount} values fail format or type validation. Review and enforce data type constraints and format rules.`;
            effort = 'medium';
            break;

          case QualityDimension.CONSISTENCY:
            title = 'Improve Data Consistency';
            description = `${dimension.details.issueCount} business rule violations detected. Standardize values and implement consistency checks.`;
            effort = 'high';
            break;

          case QualityDimension.ACCURACY:
            title = 'Improve Data Accuracy';
            description = `${dimension.details.issueCount} accuracy issues detected. Validate referential integrity and data sources.`;
            effort = 'high';
            break;
        }

        recommendations.push({
          priority: dimension.score < 50 ? 'high' : 'medium',
          area: dimension.dimension,
          title,
          description,
          estimatedImpact: Math.min(100 - score.overall, dimension.score < 50 ? 20 : 10),
          effort
        });
      }
    });

    // Add general recommendations
    if (score.overall < 70) {
      recommendations.push({
        priority: 'high',
        area: 'general',
        title: 'Conduct Data Audit',
        description:
          'Overall quality score is below acceptable threshold. Conduct comprehensive data audit and quality assessment.',
        estimatedImpact: 25,
        effort: 'high'
      });
    }

    if (score.averageIssuesPerRecord > 2) {
      recommendations.push({
        priority: 'high',
        area: 'general',
        title: 'Review Data Entry Process',
        description:
          'High average issues per record indicate systematic problems. Review and improve data entry process and validation rules.',
        estimatedImpact: 30,
        effort: 'high'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculate quality trends
   */
  private calculateTrends(score: DatasetQualityScore): QualityTrend[] {
    return score.dimensions.map(dimension => ({
      dimension: dimension.dimension,
      timestamp: new Date(),
      score: dimension.score,
      change: 0 // Would be populated if history is available
    }));
  }

  /**
   * Get metric status
   */
  private getMetricStatus(
    value: number,
    threshold: number
  ): 'healthy' | 'warning' | 'critical' {
    if (value >= threshold) return 'healthy';
    if (value >= threshold * 0.75) return 'warning';
    return 'critical';
  }

  /**
   * Add score to history
   */
  private addToHistory(key: string, score: QualityScore): void {
    const history = this.scoreHistory.get(key) || [];
    history.push(score);

    // Trim history if it exceeds retention period
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - this.config.historyRetention);
    const trimmedHistory = history.filter(s => s.lastUpdated >= cutoffTime);

    this.scoreHistory.set(key, trimmedHistory);
  }

  /**
   * Get score history for a record/dataset
   */
  getScoreHistory(key: string): QualityScore[] {
    return this.scoreHistory.get(key) || [];
  }

  /**
   * Clear history for a specific key
   */
  clearHistory(key: string): void {
    this.scoreHistory.delete(key);
  }

  /**
   * Clear all history
   */
  clearAllHistory(): void {
    this.scoreHistory.clear();
  }

  /**
   * Get configuration
   */
  getConfig(): QualityScoringConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QualityScoringConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      dimensionWeights: {
        ...this.config.dimensionWeights,
        ...(config.dimensionWeights || {})
      },
      qualityBands: {
        ...this.config.qualityBands,
        ...(config.qualityBands || {})
      }
    };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const dataQualityScoringService = new DataQualityScoringService();
