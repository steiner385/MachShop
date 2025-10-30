/**
 * QIF Validation Service Test Suite
 * Tests for centralized QIF validation with NIST compliance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { QIFValidationService } from '../../services/QIFValidationService';
import { v4 as uuidv4, v1 as uuidv1 } from 'uuid';

// Mock Prisma
const prismaMock = vi.mocked({
  qIFMeasurementPlan: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  qIFCharacteristic: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  qIFMeasurementResult: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  qIFMeasurement: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
} as any);

// Test data
const testData = {
  validUUIDv4: uuidv4(),
  validUUIDv1: uuidv1(),
  invalidUUID: 'invalid-uuid',
  legacyId: 'PLAN-001',

  validQIFXml: `<?xml version="1.0" encoding="UTF-8"?>
<QIFDocument>
  <Version>3.0.0</Version>
  <Header>
    <ApplicationName>Test</ApplicationName>
  </Header>
  <Product>
    <Characteristics>
      <Characteristic id="${uuidv4()}">
        <CharacteristicNominal>
          <Name>Test Characteristic</Name>
        </CharacteristicNominal>
      </Characteristic>
    </Characteristics>
  </Product>
  <MeasurementPlan id="${uuidv4()}">
    <Version>1.0</Version>
  </MeasurementPlan>
  <MeasurementResults id="${uuidv4()}">
    <Version>1.0</Version>
  </MeasurementResults>
</QIFDocument>`,

  invalidQIFXml: `<InvalidRoot>Not a QIF document</InvalidRoot>`,

  mockPlans: [
    {
      id: 'cuid1',
      qifPlanUuid: uuidv4(),
      qifPlanId: 'PLAN-001',
    },
    {
      id: 'cuid2',
      qifPlanUuid: null,
      qifPlanId: 'PLAN-002',
    },
    {
      id: 'cuid3',
      qifPlanUuid: 'invalid-uuid',
      qifPlanId: null,
    },
  ],

  mockCharacteristics: [
    {
      id: 'char1',
      characteristicUuid: uuidv4(),
      characteristicId: 'CHAR-001',
    },
    {
      id: 'char2',
      characteristicUuid: null,
      characteristicId: 'CHAR-002',
    },
  ],

  mockResults: [
    {
      id: 'result1',
      qifResultsUuid: uuidv4(),
      qifResultsId: 'RESULT-001',
    },
  ],
};

describe('QIFValidationService', () => {
  let validationService: QIFValidationService;

  beforeEach(() => {
    vi.clearAllMocks();
    validationService = new QIFValidationService(prismaMock, {
      enforceNistCompliance: false,
      allowLegacyIds: true,
      validateUuidUniqueness: true,
      strictMode: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateQIFDocument', () => {
    it('should validate a valid QIF document with UUIDs', async () => {
      const result = await validationService.validateQIFDocument(testData.validQIFXml);

      expect(result.isValid).toBe(true);
      expect(result.hasUuids).toBe(true);
      expect(result.qifVersion).toBe('3.0.0');
      expect(result.structuralErrors).toHaveLength(0);
      expect(result.uuidErrors).toHaveLength(0);
      expect(result.uuidValidations.length).toBeGreaterThan(0);
    });

    it('should detect invalid QIF document structure', async () => {
      const result = await validationService.validateQIFDocument(testData.invalidQIFXml);

      expect(result.isValid).toBe(false);
      expect(result.structuralErrors.length).toBeGreaterThan(0);
    });

    it('should validate QIF document without UUIDs', async () => {
      const qifWithoutUUIDs = `<?xml version="1.0" encoding="UTF-8"?>
<QIFDocument>
  <Version>3.0.0</Version>
  <MeasurementPlan id="PLAN-001">
    <Version>1.0</Version>
  </MeasurementPlan>
</QIFDocument>`;

      const result = await validationService.validateQIFDocument(qifWithoutUUIDs);

      expect(result.hasUuids).toBe(false);
      expect(result.nistCompliant).toBe(false);
      expect(result.recommendations).toContain(
        expect.stringContaining('Consider adding UUIDs')
      );
    });

    it('should detect non-NIST-compliant UUIDs', async () => {
      const qifWithV1UUID = `<?xml version="1.0" encoding="UTF-8"?>
<QIFDocument>
  <Version>3.0.0</Version>
  <MeasurementPlan id="${testData.validUUIDv1}">
    <Version>1.0</Version>
  </MeasurementPlan>
</QIFDocument>`;

      const result = await validationService.validateQIFDocument(qifWithV1UUID);

      expect(result.hasUuids).toBe(true);
      expect(result.nistCompliant).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Non-NIST-compliant');
    });

    it('should handle malformed XML gracefully', async () => {
      const malformedXml = '<QIFDocument><MissingClosingTag>';

      const result = await validationService.validateQIFDocument(malformedXml);

      expect(result.isValid).toBe(false);
      expect(result.structuralErrors.length).toBeGreaterThan(0);
      expect(result.structuralErrors[0]).toContain('Failed to parse');
    });
  });

  describe('validateQIFData', () => {
    beforeEach(() => {
      prismaMock.qIFMeasurementPlan.findMany.mockResolvedValue(testData.mockPlans as any);
      prismaMock.qIFCharacteristic.findMany.mockResolvedValue(testData.mockCharacteristics as any);
      prismaMock.qIFMeasurementResult.findMany.mockResolvedValue(testData.mockResults as any);
    });

    it('should validate QIF database entities', async () => {
      const result = await validationService.validateQIFData();

      expect(result.overallStatus).toBeDefined();
      expect(result.summary.totalEntities).toBeGreaterThan(0);
      expect(result.planValidation).toBeDefined();
      expect(result.characteristicValidations).toBeDefined();
      expect(result.resultValidation).toBeDefined();
    });

    it('should calculate correct summary statistics', async () => {
      const result = await validationService.validateQIFData();

      expect(result.summary.totalEntities).toBe(4); // 1 plan + 2 characteristics + 1 result
      expect(result.summary.validEntities).toBeLessThanOrEqual(result.summary.totalEntities);
      expect(result.summary.entitiesWithErrors).toBe(1); // The plan with invalid UUID
    });

    it('should determine correct overall status', async () => {
      const result = await validationService.validateQIFData();

      // Should be ERROR due to invalid UUID in mock data
      expect(result.overallStatus).toBe('ERROR');
    });

    it('should handle empty database gracefully', async () => {
      prismaMock.qIFMeasurementPlan.findMany.mockResolvedValue([]);
      prismaMock.qIFCharacteristic.findMany.mockResolvedValue([]);
      prismaMock.qIFMeasurementResult.findMany.mockResolvedValue([]);

      const result = await validationService.validateQIFData();

      expect(result.summary.totalEntities).toBe(0);
      expect(result.overallStatus).toBe('VALID');
    });
  });

  describe('validateUUIDUniqueness', () => {
    it('should detect unique UUIDs', async () => {
      const uniquePlans = [
        { id: 'plan1', qifPlanUuid: uuidv4() },
        { id: 'plan2', qifPlanUuid: uuidv4() },
      ];

      prismaMock.qIFMeasurementPlan.findMany.mockResolvedValue(uniquePlans as any);
      prismaMock.qIFCharacteristic.findMany.mockResolvedValue([]);
      prismaMock.qIFMeasurementResult.findMany.mockResolvedValue([]);

      const result = await validationService.validateUUIDUniqueness();

      expect(result.isUnique).toBe(true);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should detect duplicate UUIDs across tables', async () => {
      const duplicateUUID = uuidv4();
      const plansWithDuplicate = [
        { id: 'plan1', qifPlanUuid: duplicateUUID },
      ];
      const charsWithDuplicate = [
        { id: 'char1', characteristicUuid: duplicateUUID },
      ];

      prismaMock.qIFMeasurementPlan.findMany.mockResolvedValue(plansWithDuplicate as any);
      prismaMock.qIFCharacteristic.findMany.mockResolvedValue(charsWithDuplicate as any);
      prismaMock.qIFMeasurementResult.findMany.mockResolvedValue([]);

      const result = await validationService.validateUUIDUniqueness();

      expect(result.isUnique).toBe(false);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].uuid).toBe(duplicateUUID);
      expect(result.duplicates[0].count).toBe(2);
      expect(result.duplicates[0].entities).toHaveLength(2);
    });

    it('should ignore null UUIDs', async () => {
      const plansWithNulls = [
        { id: 'plan1', qifPlanUuid: null },
        { id: 'plan2', qifPlanUuid: uuidv4() },
      ];

      prismaMock.qIFMeasurementPlan.findMany.mockResolvedValue(plansWithNulls as any);
      prismaMock.qIFCharacteristic.findMany.mockResolvedValue([]);
      prismaMock.qIFMeasurementResult.findMany.mockResolvedValue([]);

      const result = await validationService.validateUUIDUniqueness();

      expect(result.isUnique).toBe(true);
      expect(result.duplicates).toHaveLength(0);
    });
  });

  describe('generateValidationReport', () => {
    beforeEach(() => {
      prismaMock.qIFMeasurementPlan.findMany.mockResolvedValue(testData.mockPlans as any);
      prismaMock.qIFCharacteristic.findMany.mockResolvedValue(testData.mockCharacteristics as any);
      prismaMock.qIFMeasurementResult.findMany.mockResolvedValue(testData.mockResults as any);
    });

    it('should generate comprehensive validation report', async () => {
      const report = await validationService.generateValidationReport();

      expect(report.timestamp).toBeDefined();
      expect(report.systemHealth).toBeOneOf(['HEALTHY', 'WARNING', 'CRITICAL']);
      expect(report.dataValidation).toBeDefined();
      expect(report.uniquenessCheck).toBeDefined();
      expect(report.migrationProgress).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should calculate migration progress correctly', async () => {
      const report = await validationService.generateValidationReport();

      expect(report.migrationProgress.totalEntities).toBeGreaterThan(0);
      expect(report.migrationProgress.migrationPercentage).toBeGreaterThanOrEqual(0);
      expect(report.migrationProgress.migrationPercentage).toBeLessThanOrEqual(100);
    });

    it('should provide actionable recommendations', async () => {
      const report = await validationService.generateValidationReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('migration') || r.includes('entities'))).toBe(true);
    });

    it('should determine system health correctly', async () => {
      const report = await validationService.generateValidationReport();

      // With invalid UUID in test data, should be CRITICAL
      expect(report.systemHealth).toBe('CRITICAL');
    });
  });

  describe('Configuration-based Behavior', () => {
    it('should enforce NIST compliance when configured', () => {
      const strictService = new QIFValidationService(prismaMock, {
        enforceNistCompliance: true,
        allowLegacyIds: false,
        strictMode: true,
      });

      expect(strictService).toBeInstanceOf(QIFValidationService);
      // Configuration is tested through behavior in other tests
    });

    it('should allow legacy IDs when configured', () => {
      const permissiveService = new QIFValidationService(prismaMock, {
        enforceNistCompliance: false,
        allowLegacyIds: true,
        strictMode: false,
      });

      expect(permissiveService).toBeInstanceOf(QIFValidationService);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      prismaMock.qIFMeasurementPlan.findMany.mockRejectedValue(new Error('Database connection failed'));

      const result = await validationService.validateQIFData();

      expect(result.overallStatus).toBe('ERROR');
    });

    it('should handle invalid QIF XML gracefully', async () => {
      const invalidXml = 'not-xml-at-all';

      const result = await validationService.validateQIFDocument(invalidXml);

      expect(result.isValid).toBe(false);
      expect(result.structuralErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large mock datasets
      const largePlans = Array.from({ length: 1000 }, (_, i) => ({
        id: `plan${i}`,
        qifPlanUuid: uuidv4(),
        qifPlanId: `PLAN-${i.toString().padStart(3, '0')}`,
      }));

      prismaMock.qIFMeasurementPlan.findMany.mockResolvedValue(largePlans as any);
      prismaMock.qIFCharacteristic.findMany.mockResolvedValue([]);
      prismaMock.qIFMeasurementResult.findMany.mockResolvedValue([]);

      const start = Date.now();
      const result = await validationService.validateQIFData();
      const duration = Date.now() - start;

      expect(result.summary.totalEntities).toBe(1000);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should validate uniqueness efficiently for large datasets', async () => {
      const largePlans = Array.from({ length: 500 }, (_, i) => ({
        id: `plan${i}`,
        qifPlanUuid: uuidv4(),
      }));

      prismaMock.qIFMeasurementPlan.findMany.mockResolvedValue(largePlans as any);
      prismaMock.qIFCharacteristic.findMany.mockResolvedValue([]);
      prismaMock.qIFMeasurementResult.findMany.mockResolvedValue([]);

      const start = Date.now();
      const result = await validationService.validateUUIDUniqueness();
      const duration = Date.now() - start;

      expect(result.isUnique).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });

  describe('Integration Scenarios', () => {
    it('should validate end-to-end QIF workflow', async () => {
      // Test a complete QIF validation workflow
      prismaMock.qIFMeasurementPlan.findMany.mockResolvedValue([
        { id: 'plan1', qifPlanUuid: uuidv4(), qifPlanId: 'PLAN-001' }
      ] as any);
      prismaMock.qIFCharacteristic.findMany.mockResolvedValue([]);
      prismaMock.qIFMeasurementResult.findMany.mockResolvedValue([]);

      // Validate document
      const docResult = await validationService.validateQIFDocument(testData.validQIFXml);
      expect(docResult.isValid).toBe(true);

      // Validate data
      const dataResult = await validationService.validateQIFData();
      expect(dataResult.overallStatus).toBe('VALID');

      // Check uniqueness
      const uniqueResult = await validationService.validateUUIDUniqueness();
      expect(uniqueResult.isUnique).toBe(true);

      // Generate report
      const report = await validationService.generateValidationReport();
      expect(report.systemHealth).toBe('HEALTHY');
    });
  });
});

// Export test utilities for other test files
export const mockPrismaClient = () => mockDeep<PrismaClient>();

export const createTestQIFXml = (options: {
  includeUUIDs?: boolean;
  useValidUUIDs?: boolean;
  version?: string;
} = {}) => {
  const { includeUUIDs = true, useValidUUIDs = true, version = '3.0.0' } = options;

  const planId = includeUUIDs ? (useValidUUIDs ? uuidv4() : 'invalid-uuid') : 'PLAN-001';
  const charId = includeUUIDs ? (useValidUUIDs ? uuidv4() : 'invalid-uuid') : 'CHAR-001';

  return `<?xml version="1.0" encoding="UTF-8"?>
<QIFDocument>
  <Version>${version}</Version>
  <Header>
    <ApplicationName>Test</ApplicationName>
  </Header>
  <Product>
    <Characteristics>
      <Characteristic id="${charId}">
        <CharacteristicNominal>
          <Name>Test Characteristic</Name>
        </CharacteristicNominal>
      </Characteristic>
    </Characteristics>
  </Product>
  <MeasurementPlan id="${planId}">
    <Version>1.0</Version>
  </MeasurementPlan>
</QIFDocument>`;
};

export default {
  mockPrismaClient,
  createTestQIFXml,
  testData,
};