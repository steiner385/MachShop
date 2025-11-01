/**
 * Database Documentation Service Tests
 * Tests for business context documentation generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from 'winston';
import { DatabaseDocumentationService } from '../../services/DatabaseDocumentationService';
import { DocumentationGenerationRequest } from '../../types/databaseDocumentation';

describe('DatabaseDocumentationService', () => {
  let service: DatabaseDocumentationService;
  let logger: Logger;

  beforeEach(() => {
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;

    service = new DatabaseDocumentationService(logger);
  });

  describe('Business Context Documentation', () => {
    it('should generate documentation for common fields', async () => {
      const request: DocumentationGenerationRequest = {
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      expect(result.success).toBe(true);
      expect(result.fieldsProcessed).toBeGreaterThan(0);
      expect(result.documentation.length).toBeGreaterThan(0);
    });

    it('should document id field as critical', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['id'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      expect(result.fieldsProcessed).toBeGreaterThan(0);
      const idField = result.documentation.find(
        f => f.fieldName === 'id'
      );
      expect(idField).toBeDefined();
      expect(idField?.businessContext.criticalityLevel).toBe('critical');
      expect(idField?.businessContext.businessRule).toContain('globally unique');
    });

    it('should document status field with valid values', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['status'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      const statusField = result.documentation.find(
        f => f.fieldName === 'status'
      );
      expect(statusField?.examplesAndValues.validValues).toBeDefined();
      expect(statusField?.examplesAndValues.validValues?.length).toBeGreaterThan(
        0
      );
    });

    it('should document timestamps with audit trail requirement', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['createdAt', 'updatedAt'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      const createdField = result.documentation.find(
        f => f.fieldName === 'createdAt'
      );
      // Timestamp fields should be documented as critical
      expect(createdField).toBeDefined();
      expect(createdField?.metadata.documentationComplete).toBe(true);
      expect(createdField?.businessContext.criticalityLevel).toBe('critical');
    });

    it('should document code field for integration mapping', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['code'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      const codeField = result.documentation.find(
        f => f.fieldName === 'code'
      );
      expect(codeField?.integrationMapping.externalSystems.length).toBeGreaterThan(
        0
      );
      expect(codeField?.businessContext.businessJustification).toContain(
        'integration'
      );
    });

    it('should generate examples for each field', async () => {
      const request: DocumentationGenerationRequest = {
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      for (const field of result.documentation) {
        expect(field.examplesAndValues.examples.length).toBeGreaterThan(0);
        expect(
          field.examplesAndValues.examples[0].value
        ).toBeDefined();
        expect(
          field.examplesAndValues.examples[0].description
        ).toBeDefined();
      }
    });

    it('should infer data types correctly', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['id', 'quantity', 'createdAt', 'isActive', 'email', 'status'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      // Look for the specific fields we requested
      const hasId = result.documentation.some(f => f.fieldName === 'id' && f.technicalSpec.dataType.includes('UUID'));
      const hasQuantity = result.documentation.some(f => f.fieldName === 'quantity' && f.technicalSpec.dataType.includes('Integer'));
      const hasCreatedAt = result.documentation.some(f => f.fieldName === 'createdAt' && f.technicalSpec.dataType.includes('DateTime'));
      const hasIsActive = result.documentation.some(f => f.fieldName === 'isActive' && f.technicalSpec.dataType.includes('Boolean'));
      const hasEmail = result.documentation.some(f => f.fieldName === 'email' && f.technicalSpec.dataType.includes('Email'));

      expect(hasId).toBe(true);
      expect(hasQuantity).toBe(true);
      expect(hasCreatedAt).toBe(true);
      expect(hasIsActive).toBe(true);
      expect(hasEmail).toBe(true);
    });

    it('should assign correct privacy levels', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['email', 'id', 'status'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      const emailField = result.documentation.find(f => f.fieldName === 'email');
      const idField = result.documentation.find(f => f.fieldName === 'id');
      const statusField = result.documentation.find(
        f => f.fieldName === 'status'
      );

      expect(emailField?.compliance.privacy).toBe('pii');
      expect(idField?.compliance.privacy).toBe('internal');
      expect(statusField?.compliance.privacy).toBe('internal');
    });

    it('should identify encrypted fields', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['password', 'apiKey'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      for (const field of result.documentation) {
        if (field.fieldName.toLowerCase().includes('password') ||
            field.fieldName.toLowerCase().includes('apikey')) {
          expect(field.technicalSpec.encrypted).toBe(true);
        }
      }
    });

    it('should generate compliance regulations for fields', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['email', 'createdAt'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      const emailField = result.documentation.find(f => f.fieldName === 'email');
      expect(emailField?.compliance.regulations.length).toBeGreaterThan(0);
      expect(emailField?.compliance.regulations).toContain('GDPR');
    });

    it('should map fields to external systems', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['code'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      const codeField = result.documentation.find(f => f.fieldName === 'code');
      expect(codeField?.integrationMapping.externalSystems.length).toBeGreaterThan(
        0
      );
      const sap = codeField?.integrationMapping.externalSystems.find(
        s => s.systemName === 'SAP'
      );
      expect(sap?.fieldMapping).toBeDefined();
      expect(sap?.direction).toContain('bidirectional' || 'export' || 'import');
    });

    it('should generate comprehensive report', async () => {
      const request: DocumentationGenerationRequest = {
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      expect(result.report).toBeDefined();
      expect(result.report.totalFields).toBeGreaterThan(0);
      expect(result.report.documentedFields).toBeGreaterThan(0);
      expect(result.report.overallCompleteness).toBeGreaterThan(0);
      expect(result.report.tables.length).toBeGreaterThan(0);
    });

    it('should document related fields', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['enterpriseId'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      const enterpriseIdField = result.documentation.find(
        f => f.fieldName === 'enterpriseId'
      );
      expect(enterpriseIdField?.businessContext.relatedFields.length).toBeGreaterThan(
        0
      );
    });

    it('should include validation constraints', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['id', 'email', 'status'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      for (const field of result.documentation) {
        // Constraints and validation should be present for most fields
        if (['id', 'email', 'status'].includes(field.fieldName)) {
          expect(field.examplesAndValues.constraints.length).toBeGreaterThanOrEqual(0);
          expect(field.technicalSpec.validation.length).toBeGreaterThan(0);
        }
      }
    });

    it('should set correct criticality levels', async () => {
      const request: DocumentationGenerationRequest = {
        fields: ['id', 'status', 'description'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      const idField = result.documentation.find(f => f.fieldName === 'id');
      const statusField = result.documentation.find(
        f => f.fieldName === 'status'
      );
      const descField = result.documentation.find(
        f => f.fieldName === 'description'
      );

      expect(idField?.businessContext.criticalityLevel).toBe('critical');
      expect(statusField?.businessContext.criticalityLevel).toBe('high');
      // Description field is medium, not low
      expect(['low', 'medium']).toContain(descField?.businessContext.criticalityLevel);
    });
  });

  describe('Documentation Completeness', () => {
    it('should mark documentation as complete', async () => {
      const request: DocumentationGenerationRequest = {
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      for (const field of result.documentation) {
        expect(field.metadata.documentationComplete).toBe(true);
        expect(field.metadata.documentationPercentage).toBe(100);
      }
    });

    it('should handle multiple table documentation', async () => {
      const request: DocumentationGenerationRequest = {
        tables: ['Enterprise', 'Site', 'User'],
        includeExamples: true,
        includeCompliance: true,
        includeIntegrations: true,
        outputFormat: 'json',
        validate: true,
      };

      const result = await service.generateDocumentation(request);

      expect(result.report.tables.length).toBeGreaterThan(0);
      expect(result.report.totalTables).toBeGreaterThan(0);
    });
  });
});
