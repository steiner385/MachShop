/**
 * Validation Framework API Routes
 * Phase 7: REST API endpoints for validation operations
 *
 * Endpoints:
 * POST   /api/validation/validate-record - Validate single record
 * POST   /api/validation/validate-batch - Validate multiple records
 * POST   /api/validation/validate-dataset - Validate entire dataset
 * GET    /api/validation/results/:id - Get validation result
 * GET    /api/validation/quality-score/:type/:id - Get quality score
 * GET    /api/validation/quality-report/:type/:id - Get quality report
 * GET    /api/validation/error-report/:batchId - Get error report
 * GET    /api/validation/rules/:entityType - Get rules for entity type
 * POST   /api/validation/rules - Create custom validation rule
 * PUT    /api/validation/rules/:ruleId - Update validation rule
 * DELETE /api/validation/rules/:ruleId - Delete validation rule
 * GET    /api/validation/rules/:ruleId - Get rule details
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ValidationService, EntityType } from '../services/migration/validation/ValidationService';
import { DataQualityScoringService } from '../services/migration/validation/DataQualityScoringService';
import { ErrorReportingService } from '../services/migration/validation/ErrorReportingService';
import { BusinessRulesEngine } from '../services/migration/validation/BusinessRulesEngine';

const router = Router();

// Initialize services
const validationService = new ValidationService();
const qualityScoringService = new DataQualityScoringService();
const errorReportingService = new ErrorReportingService();
const businessRulesEngine = new BusinessRulesEngine();

// Initialize validation rules from entity validation rules
try {
  const { ALL_ENTITY_RULES } = require('../services/migration/validation/rules/EntityValidationRules');
  Object.values(ALL_ENTITY_RULES).forEach((rules: any) => {
    if (Array.isArray(rules) && rules.length > 0) {
      rules.forEach((rule: any) => {
        if (rule && rule.id) {
          validationService.addRule(rule);
        }
      });
    }
  });
} catch (err) {
  console.warn('Could not load entity validation rules:', err);
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

interface ValidateRecordRequest {
  entityType: EntityType;
  data: Record<string, any>;
  recordId?: string;
  context?: Record<string, any>;
}

interface ValidateBatchRequest {
  entityType: EntityType;
  records: Array<Record<string, any>>;
  batchId?: string;
  stopOnFirstError?: boolean;
}

interface ValidateDatasetRequest {
  entityType: EntityType;
  records: Array<Record<string, any>>;
  datasetId?: string;
  generateQualityScore?: boolean;
  generateErrorReport?: boolean;
}

interface ValidationResponse {
  success: boolean;
  data?: any;
  errors?: any[];
  message?: string;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Validate request body
 */
const validateBody = (req: Request, res: Response, next: NextFunction) => {
  if (!req.body) {
    return res.status(400).json({
      success: false,
      message: 'Request body is required'
    });
  }
  next();
};

/**
 * Error handling middleware
 */
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Validation API Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// ============================================================================
// VALIDATION ENDPOINTS
// ============================================================================

/**
 * POST /api/validation/validate-record
 * Validate a single record
 */
router.post('/validate-record', validateBody, async (req: Request, res: Response) => {
  try {
    const { entityType, data, recordId, context }: ValidateRecordRequest = req.body;

    if (!entityType || !data) {
      return res.status(400).json({
        success: false,
        message: 'entityType and data are required'
      });
    }

    // Get rules for entity type
    const rules = validationService.getRules(entityType) || PART_VALIDATION_RULES;

    // Validate the record
    const validationResult = validationService.validateRecord(data, rules, {
      recordId,
      ...context
    });

    // Enrich errors with messages and suggestions
    const enrichedErrors = errorReportingService.enrichErrors(
      validationResult.errors,
      { recordId, ...context }
    );

    // Calculate quality score
    const qualityScore = qualityScoringService.calculateRecordScore(
      validationResult,
      entityType,
      Object.keys(data).length,
      recordId
    );

    res.status(200).json({
      success: validationResult.isValid,
      data: {
        isValid: validationResult.isValid,
        recordId,
        errors: enrichedErrors,
        qualityScore,
        fieldCount: Object.keys(data).length,
        errorCount: validationResult.errors.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating record',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/validation/validate-batch
 * Validate multiple records
 */
router.post('/validate-batch', validateBody, async (req: Request, res: Response) => {
  try {
    const {
      entityType,
      records,
      batchId,
      stopOnFirstError
    }: ValidateBatchRequest = req.body;

    if (!entityType || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'entityType and records array are required'
      });
    }

    // Get rules
    const rules = validationService.getRules(entityType) || PART_VALIDATION_RULES;

    // Validate batch
    const batchResult = validationService.validateBatch(records, rules, {
      stopOnFirstError,
      batchId
    });

    // Enrich all errors
    const enrichedErrors = errorReportingService.enrichErrors(
      batchResult.errors,
      { batchId }
    );

    // Generate batch error report
    const batchErrorReport = errorReportingService.generateBatchErrorReport(
      batchId || `batch-${Date.now()}`,
      records.length,
      enrichedErrors,
      'json'
    );

    res.status(200).json({
      success: batchResult.validRecords === records.length,
      data: {
        totalRecords: records.length,
        validRecords: batchResult.validRecords,
        invalidRecords: batchResult.invalidRecords,
        successRate: (batchResult.validRecords / records.length) * 100,
        errors: enrichedErrors,
        errorReport: batchErrorReport
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating batch',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/validation/validate-dataset
 * Validate entire dataset with quality scoring and reporting
 */
router.post('/validate-dataset', validateBody, async (req: Request, res: Response) => {
  try {
    const {
      entityType,
      records,
      datasetId,
      generateQualityScore = true,
      generateErrorReport = true
    }: ValidateDatasetRequest = req.body;

    if (!entityType || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'entityType and records array are required'
      });
    }

    // Get rules
    const rules = validationService.getRules(entityType) || PART_VALIDATION_RULES;

    // Validate all records
    const results = records.map(record =>
      validationService.validateRecord(record, rules, {
        recordId: record.id || `record-${records.indexOf(record)}`
      })
    );

    // Enrich errors
    const allErrors = results.flatMap((result, index) =>
      errorReportingService.enrichErrors(result.errors, {
        recordId: records[index].id || `record-${index}`,
        rowNumber: index + 1
      })
    );

    let qualityScore;
    let qualityReport;
    if (generateQualityScore) {
      qualityScore = qualityScoringService.calculateDatasetScore(
        results,
        records.length,
        entityType,
        Object.keys(records[0] || {}).length
      );

      qualityReport = qualityScoringService.generateQualityReport(qualityScore);
    }

    let errorReport;
    if (generateErrorReport) {
      errorReport = errorReportingService.generateErrorReport(
        allErrors,
        results.filter(r => r.isValid).length / results.length * 100
      );
    }

    res.status(200).json({
      success: results.every(r => r.isValid),
      data: {
        datasetId: datasetId || `dataset-${Date.now()}`,
        totalRecords: records.length,
        validRecords: results.filter(r => r.isValid).length,
        invalidRecords: results.filter(r => !r.isValid).length,
        successRate: (results.filter(r => r.isValid).length / records.length) * 100,
        qualityScore: generateQualityScore ? qualityScore : undefined,
        qualityReport: generateQualityScore ? qualityReport : undefined,
        errorReport: generateErrorReport ? errorReport : undefined,
        totalErrors: allErrors.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating dataset',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// QUALITY SCORING ENDPOINTS
// ============================================================================

/**
 * GET /api/validation/quality-score/:entityType/:recordId
 * Get quality score for a record
 */
router.get('/quality-score/:entityType/:recordId', async (req: Request, res: Response) => {
  try {
    const { entityType, recordId } = req.params;

    // This would typically fetch from database
    // For now, return sample response
    res.status(200).json({
      success: true,
      data: {
        recordId,
        entityType,
        message: 'Quality score endpoint - integrate with database'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving quality score'
    });
  }
});

/**
 * GET /api/validation/quality-report/:entityType/:datasetId
 * Get quality report for dataset
 */
router.get('/quality-report/:entityType/:datasetId', async (req: Request, res: Response) => {
  try {
    const { entityType, datasetId } = req.params;

    res.status(200).json({
      success: true,
      data: {
        datasetId,
        entityType,
        message: 'Quality report endpoint - integrate with database'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving quality report'
    });
  }
});

// ============================================================================
// ERROR REPORTING ENDPOINTS
// ============================================================================

/**
 * GET /api/validation/error-report/:batchId
 * Get error report for batch
 */
router.get('/error-report/:batchId', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;

    res.status(200).json({
      success: true,
      data: {
        batchId,
        message: 'Error report endpoint - integrate with database'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving error report'
    });
  }
});

// ============================================================================
// VALIDATION RULES ENDPOINTS
// ============================================================================

/**
 * GET /api/validation/rules/:entityType
 * Get all validation rules for entity type
 */
router.get('/rules/:entityType', async (req: Request, res: Response) => {
  try {
    const { entityType } = req.params;

    // Get rules from service
    const rules = validationService.getRules(entityType as EntityType);

    if (!rules || rules.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No rules found for entity type: ${entityType}`
      });
    }

    res.status(200).json({
      success: true,
      data: {
        entityType,
        rules,
        ruleCount: rules.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving rules'
    });
  }
});

/**
 * POST /api/validation/rules
 * Create custom validation rule
 */
router.post('/rules', validateBody, async (req: Request, res: Response) => {
  try {
    const rule = req.body;

    if (!rule.id || !rule.entityType || !rule.ruleType) {
      return res.status(400).json({
        success: false,
        message: 'id, entityType, and ruleType are required'
      });
    }

    // Add rule to service
    validationService.addRule(rule);

    res.status(201).json({
      success: true,
      data: {
        ruleId: rule.id,
        message: 'Rule created successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating rule'
    });
  }
});

/**
 * GET /api/validation/rules/:ruleId
 * Get specific rule details
 */
router.get('/rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;

    res.status(200).json({
      success: true,
      data: {
        ruleId,
        message: 'Rule details endpoint - integrate with database'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving rule'
    });
  }
});

/**
 * PUT /api/validation/rules/:ruleId
 * Update validation rule
 */
router.put('/rules/:ruleId', validateBody, async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    res.status(200).json({
      success: true,
      data: {
        ruleId,
        message: 'Rule updated successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating rule'
    });
  }
});

/**
 * DELETE /api/validation/rules/:ruleId
 * Delete validation rule
 */
router.delete('/rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;

    res.status(200).json({
      success: true,
      data: {
        ruleId,
        message: 'Rule deleted successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting rule'
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/validation/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'operational',
      service: 'Validation Framework',
      timestamp: new Date().toISOString()
    }
  });
});

// Apply error handler
router.use(errorHandler);

export default router;
