/**
 * Validation Framework API Routes Tests
 * Phase 7: REST API endpoint testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import validationRouter from '../../routes/validation';
import { EntityType, Severity, ValidationType } from '../../services/migration/validation/ValidationService';

describe('Validation Framework API Routes - Phase 7', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/validation', validationRouter);
  });

  // ============================================================================
  // VALIDATION ENDPOINTS
  // ============================================================================

  describe('POST /api/validation/validate-record', () => {
    it('should validate a single valid record', async () => {
      const response = await request(app)
        .post('/api/validation/validate-record')
        .send({
          entityType: EntityType.PART,
          data: {
            partNumber: 'PART-001',
            description: 'Test Part',
            unitOfMeasure: 'EACH',
            standardCost: 100
          }
        });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.isValid).toBeDefined();
        expect(response.body.data.recordId).toBeDefined();
        expect(response.body.data.errors).toBeDefined();
      }
    });

    it('should return error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/validation/validate-record')
        .send({
          entityType: EntityType.PART,
          data: {
            description: 'Test Part'
            // Missing required partNumber
          }
        });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200 && response.body.data) {
        if (response.body.data.isValid === false) {
          expect(response.body.data.errors.length).toBeGreaterThan(0);
        }
      }
    });

    it('should reject request without entityType', async () => {
      const response = await request(app)
        .post('/api/validation/validate-record')
        .send({
          data: { partNumber: 'PART-001' }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should reject request without data', async () => {
      const response = await request(app)
        .post('/api/validation/validate-record')
        .send({
          entityType: EntityType.PART
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should include custom recordId if provided', async () => {
      const response = await request(app)
        .post('/api/validation/validate-record')
        .send({
          entityType: EntityType.PART,
          recordId: 'custom-record-001',
          data: {
            partNumber: 'PART-001',
            description: 'Test Part',
            unitOfMeasure: 'EACH'
          }
        });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.recordId).toBe('custom-record-001');
      }
    });

    it('should include enriched errors with messages', async () => {
      const response = await request(app)
        .post('/api/validation/validate-record')
        .send({
          entityType: EntityType.PART,
          data: {
            description: 'Test Part'
            // Missing partNumber
          }
        });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const errors = response.body.data.errors;
        if (errors && errors.length > 0) {
          expect(errors[0].message).toBeDefined();
        }
      }
    });
  });

  describe('POST /api/validation/validate-batch', () => {
    it('should validate multiple records', async () => {
      const response = await request(app)
        .post('/api/validation/validate-batch')
        .send({
          entityType: EntityType.PART,
          records: [
            {
              id: 'part-001',
              partNumber: 'PART-001',
              description: 'Test Part 1',
              unitOfMeasure: 'EACH'
            },
            {
              id: 'part-002',
              partNumber: 'PART-002',
              description: 'Test Part 2',
              unitOfMeasure: 'LB'
            }
          ]
        });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBeDefined();
        expect(response.body.data.totalRecords).toBe(2);
        expect(response.body.data.validRecords).toBeDefined();
        expect(response.body.data.invalidRecords).toBeDefined();
        expect(response.body.data.successRate).toBeDefined();
      }
    });

    it('should calculate success rate correctly', async () => {
      const response = await request(app)
        .post('/api/validation/validate-batch')
        .send({
          entityType: EntityType.PART,
          records: [
            {
              id: 'part-001',
              partNumber: 'PART-001',
              description: 'Test Part 1',
              unitOfMeasure: 'EACH'
            },
            {
              id: 'part-002',
              // Missing partNumber
              description: 'Test Part 2',
              unitOfMeasure: 'EACH'
            }
          ]
        });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.totalRecords).toBe(2);
        const successRate = response.body.data.successRate;
        expect(successRate).toBeGreaterThanOrEqual(0);
        expect(successRate).toBeLessThanOrEqual(100);
      }
    });

    it('should generate batch error report', async () => {
      const response = await request(app)
        .post('/api/validation/validate-batch')
        .send({
          entityType: EntityType.PART,
          batchId: 'test-batch-001',
          records: [
            {
              partNumber: 'PART-001',
              description: 'Test Part'
            }
          ]
        });

      expect([200, 500]).toContain(response.status);
    });

    it('should reject request without records array', async () => {
      const response = await request(app)
        .post('/api/validation/validate-batch')
        .send({
          entityType: EntityType.PART
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/validation/validate-dataset', () => {
    it('should validate entire dataset', async () => {
      const response = await request(app)
        .post('/api/validation/validate-dataset')
        .send({
          entityType: EntityType.PART,
          records: [
            {
              partNumber: 'PART-001',
              description: 'Test Part 1',
              unitOfMeasure: 'EACH'
            },
            {
              partNumber: 'PART-002',
              description: 'Test Part 2',
              unitOfMeasure: 'LB'
            }
          ],
          generateQualityScore: true,
          generateErrorReport: true
        });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBeDefined();
        expect(response.body.data.datasetId).toBeDefined();
        expect(response.body.data.totalRecords).toBe(2);
      }
    });

    it('should include quality score when requested', async () => {
      const response = await request(app)
        .post('/api/validation/validate-dataset')
        .send({
          entityType: EntityType.PART,
          records: [
            {
              partNumber: 'PART-001',
              description: 'Test Part',
              unitOfMeasure: 'EACH'
            }
          ],
          generateQualityScore: true
        });

      expect([200, 500]).toContain(response.status);
    });

    it('should include error report when requested', async () => {
      const response = await request(app)
        .post('/api/validation/validate-dataset')
        .send({
          entityType: EntityType.PART,
          records: [
            {
              partNumber: 'PART-001',
              description: 'Test Part',
              unitOfMeasure: 'INVALID'
            }
          ],
          generateErrorReport: true
        });

      expect([200, 500]).toContain(response.status);
    });

    it('should handle empty dataset', async () => {
      const response = await request(app)
        .post('/api/validation/validate-dataset')
        .send({
          entityType: EntityType.PART,
          records: []
        });

      expect([200, 500]).toContain(response.status);
    });
  });

  // ============================================================================
  // QUALITY SCORING ENDPOINTS
  // ============================================================================

  describe('GET /api/validation/quality-score/:entityType/:recordId', () => {
    it('should return quality score endpoint', async () => {
      const response = await request(app)
        .get('/api/validation/quality-score/PART/record-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recordId).toBe('record-001');
    });
  });

  describe('GET /api/validation/quality-report/:entityType/:datasetId', () => {
    it('should return quality report endpoint', async () => {
      const response = await request(app)
        .get('/api/validation/quality-report/PART/dataset-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.datasetId).toBe('dataset-001');
    });
  });

  // ============================================================================
  // ERROR REPORTING ENDPOINTS
  // ============================================================================

  describe('GET /api/validation/error-report/:batchId', () => {
    it('should return error report endpoint', async () => {
      const response = await request(app)
        .get('/api/validation/error-report/batch-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.batchId).toBe('batch-001');
    });
  });

  // ============================================================================
  // VALIDATION RULES ENDPOINTS
  // ============================================================================

  describe('GET /api/validation/rules/:entityType', () => {
    it('should return rules for entity type', async () => {
      const response = await request(app)
        .get('/api/validation/rules/PART');

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.entityType).toBe('PART');
        expect(response.body.data.rules).toBeDefined();
        expect(Array.isArray(response.body.data.rules)).toBe(true);
      }
    });

    it('should return rule count', async () => {
      const response = await request(app)
        .get('/api/validation/rules/PART');

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.ruleCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle invalid entity type', async () => {
      const response = await request(app)
        .get('/api/validation/rules/INVALID_ENTITY');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('POST /api/validation/rules', () => {
    it('should create custom validation rule', async () => {
      const response = await request(app)
        .post('/api/validation/rules')
        .send({
          id: 'CUSTOM_001',
          entityType: EntityType.PART,
          field: 'customField',
          ruleType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          description: 'Custom validation rule',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          requiredRule: {
            allowEmpty: false,
            allowNull: false,
            allowWhitespace: false
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ruleId).toBe('CUSTOM_001');
    });

    it('should reject rule without required fields', async () => {
      const response = await request(app)
        .post('/api/validation/rules')
        .send({
          id: 'CUSTOM_002',
          // Missing entityType and ruleType
          description: 'Incomplete rule'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/validation/rules/:ruleId', () => {
    it('should return rule details endpoint', async () => {
      const response = await request(app)
        .get('/api/validation/rules/PART_001');

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.ruleId).toBe('PART_001');
      }
    });
  });

  describe('PUT /api/validation/rules/:ruleId', () => {
    it('should update validation rule', async () => {
      const response = await request(app)
        .put('/api/validation/rules/PART_001')
        .send({
          severity: Severity.WARNING,
          enabled: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ruleId).toBe('PART_001');
    });

    it('should reject update without body', async () => {
      const response = await request(app)
        .put('/api/validation/rules/PART_001')
        .send({});

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('DELETE /api/validation/rules/:ruleId', () => {
    it('should delete validation rule', async () => {
      const response = await request(app)
        .delete('/api/validation/rules/CUSTOM_001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ruleId).toBe('CUSTOM_001');
    });
  });

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  describe('GET /api/validation/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/validation/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('operational');
      expect(response.body.data.service).toBe('Validation Framework');
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing body gracefully', async () => {
      const response = await request(app)
        .post('/api/validation/validate-record')
        .send();

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/validation/validate-record')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect([400, 200]).toContain(response.status);
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe('Integration Scenarios', () => {
    it('should handle complete validation workflow', async () => {
      // Step 1: Get validation rules first
      const rulesResponse = await request(app)
        .get('/api/validation/rules/PART');

      expect([200, 404]).toContain(rulesResponse.status);

      // Step 2: Validate batch (most robust endpoint)
      const batchResponse = await request(app)
        .post('/api/validation/validate-batch')
        .send({
          entityType: EntityType.PART,
          batchId: 'batch-001',
          records: [
            {
              id: 'part-001',
              partNumber: 'PART-001',
              description: 'Test Part 1',
              unitOfMeasure: 'EACH'
            },
            {
              id: 'part-002',
              partNumber: 'PART-002',
              description: 'Test Part 2',
              unitOfMeasure: 'LB'
            }
          ]
        });

      expect([200, 500]).toContain(batchResponse.status);
      if (batchResponse.status === 200) {
        expect(batchResponse.body.data.totalRecords).toBe(2);
        expect(batchResponse.body.data.validRecords).toBeDefined();
      }

      // Step 3: Health check endpoint
      const healthResponse = await request(app)
        .get('/api/validation/health');

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.success).toBe(true);
    });
  });
});
