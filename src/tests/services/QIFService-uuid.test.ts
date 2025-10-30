/**
 * QIF Service UUID Integration Test Suite
 * Tests for QIF service UUID functionality and NIST compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QIFService } from '../../services/QIFService';
import { v4 as uuidv4, v1 as uuidv1 } from 'uuid';

// Test data
const testData = {
  validUUIDv4: uuidv4(),
  validUUIDv1: uuidv1(),
  invalidUUID: 'invalid-uuid',
  legacyId: 'PLAN-001',

  partData: {
    partNumber: 'ENG-BLADE-001',
    revision: 'Rev-C',
    characteristics: [
      {
        balloonNumber: '1',
        description: 'Blade Length',
        nominalValue: 125.0,
        upperTolerance: 0.1,
        lowerTolerance: -0.1,
        characteristicType: 'LENGTH',
        characteristicUuid: uuidv4(),
        characteristicId: 'CHAR-001',
      },
      {
        balloonNumber: '2',
        description: 'Blade Width',
        nominalValue: 25.0,
        upperTolerance: 0.05,
        lowerTolerance: -0.05,
        characteristicType: 'LENGTH',
        characteristicUuid: uuidv4(),
        characteristicId: 'CHAR-002',
      },
    ],
  },

  measurementData: {
    partNumber: 'ENG-BLADE-001',
    serialNumber: 'SN-001',
    measurements: [
      {
        balloonNumber: '1',
        characteristicId: 'CHAR-001',
        measuredValue: 125.05,
        status: 'PASS' as const,
        measurementDevice: 'CMM-001',
        uncertainty: 0.001,
      },
      {
        balloonNumber: '2',
        characteristicId: 'CHAR-002',
        measuredValue: 24.98,
        status: 'PASS' as const,
        measurementDevice: 'CMM-001',
        uncertainty: 0.001,
      },
    ],
    inspectedBy: 'John Smith',
    inspectionDate: new Date('2024-10-30'),
  },
};

describe('QIF Service UUID Integration', () => {
  let qifService: QIFService;

  beforeEach(() => {
    qifService = new QIFService({
      preferUuids: true,
      requireUuids: false,
      allowLegacyIds: true,
      validateUuidFormat: true,
      migrationMode: true,
      nistCompliance: true,
    });
  });

  describe('UUID Validation Methods', () => {
    describe('validateIdentifier', () => {
      it('should validate UUID v4 as NIST compliant', () => {
        const result = qifService.validateIdentifier(testData.validUUIDv4);
        expect(result.isValid).toBe(true);
        expect(result.format).toBe('UUID');
        expect(result.normalizedValue).toBe(testData.validUUIDv4.toLowerCase());
      });

      it('should validate UUID v1 as non-NIST compliant', () => {
        const result = qifService.validateIdentifier(testData.validUUIDv1);
        expect(result.isValid).toBe(true);
        expect(result.format).toBe('UUID');
        expect(result.errors?.length || 0).toBe(0);
      });

      it('should validate legacy IDs when allowed', () => {
        const result = qifService.validateIdentifier(testData.legacyId);
        expect(result.isValid).toBe(true);
        expect(result.format).toBe('LEGACY');
        expect(result.normalizedValue).toBe(testData.legacyId);
      });

      it('should reject invalid identifiers', () => {
        const result = qifService.validateIdentifier(testData.invalidUUID);
        expect(result.isValid).toBe(false);
        expect(result.format).toBe('INVALID');
        expect(result.errors?.length || 0).toBeGreaterThan(0);
      });

      it('should reject empty identifiers', () => {
        const result = qifService.validateIdentifier('');
        expect(result.isValid).toBe(false);
        expect(result.format).toBe('INVALID');
        expect(result.errors).toContain('Identifier cannot be empty');
      });
    });

    describe('generateQIFUUID', () => {
      it('should generate valid UUID v4', () => {
        const uuid = qifService.generateQIFUUID();
        const validation = qifService.validateIdentifier(uuid);

        expect(validation.isValid).toBe(true);
        expect(validation.format).toBe('UUID');
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });

      it('should generate unique UUIDs', () => {
        const uuid1 = qifService.generateQIFUUID();
        const uuid2 = qifService.generateQIFUUID();
        expect(uuid1).not.toBe(uuid2);
      });

      it('should generate NIST-compliant UUIDs', () => {
        const uuid = qifService.generateQIFUUID();
        const validation = qifService.validateIdentifier(uuid);
        expect(validation.isValid).toBe(true);
        expect(validation.format).toBe('UUID');
      });
    });

    describe('resolveQIFIdentifier', () => {
      it('should prefer UUID over legacy ID', () => {
        const result = qifService.resolveQIFIdentifier(testData.validUUIDv4, testData.legacyId);
        expect(result.primary).toBe(testData.validUUIDv4);
        expect(result.uuid).toBe(testData.validUUIDv4);
        expect(result.legacyId).toBe(testData.legacyId);
      });

      it('should fall back to legacy ID when UUID is not available', () => {
        const result = qifService.resolveQIFIdentifier(undefined, testData.legacyId);
        expect(result.primary).toBe(testData.legacyId);
        expect(result.uuid).toBeUndefined();
        expect(result.legacyId).toBe(testData.legacyId);
      });

      it('should throw when no valid identifier is found', () => {
        expect(() => {
          qifService.resolveQIFIdentifier(undefined, undefined);
        }).toThrow('No valid identifier found');
      });

      it('should handle invalid UUIDs gracefully', () => {
        expect(() => {
          qifService.resolveQIFIdentifier(testData.invalidUUID, testData.legacyId);
        }).toThrow(); // Should throw due to invalid UUID
      });
    });

    describe('analyzeQIFMigrationStatus', () => {
      it('should report complete migration for UUID-only entities', () => {
        const status = qifService.analyzeQIFMigrationStatus(testData.validUUIDv4, undefined);
        expect(status.hasUuid).toBe(true);
        expect(status.hasLegacyId).toBe(false);
        expect(status.migrationComplete).toBe(true);
        expect(status.identifierType).toBe('UUID_ONLY');
      });

      it('should report partial migration for hybrid entities', () => {
        const status = qifService.analyzeQIFMigrationStatus(testData.validUUIDv4, testData.legacyId);
        expect(status.hasUuid).toBe(true);
        expect(status.hasLegacyId).toBe(true);
        expect(status.migrationComplete).toBe(true);
        expect(status.identifierType).toBe('HYBRID');
      });

      it('should report incomplete migration for legacy-only entities', () => {
        const status = qifService.analyzeQIFMigrationStatus(undefined, testData.legacyId);
        expect(status.hasUuid).toBe(false);
        expect(status.hasLegacyId).toBe(true);
        expect(status.migrationComplete).toBe(false);
        expect(status.identifierType).toBe('LEGACY_ONLY');
      });
    });
  });

  describe('Enhanced QIF Document Generation', () => {
    describe('createMeasurementPlan with UUIDs', () => {
      it('should create measurement plan with UUID identifiers', () => {
        const planUuid = qifService.generateQIFUUID();
        const qifDoc = qifService.createMeasurementPlan({
          ...testData.partData,
          planUuid,
          author: 'Test User',
          organization: 'Test Org',
        });

        expect(qifDoc.QIFDocument.MeasurementPlan?.id).toBe(planUuid);
        expect(qifDoc.QIFDocument.Version).toBe('3.0.0');
        expect(qifDoc.QIFDocument.Product?.[0].Characteristics?.length).toBe(2);

        // Check that characteristics use UUIDs
        const characteristics = qifDoc.QIFDocument.Product?.[0].Characteristics || [];
        characteristics.forEach((char) => {
          const validation = qifService.validateIdentifier(char.id);
          expect(validation.isValid).toBe(true);
        });
      });

      it('should use provided characteristic UUIDs', () => {
        const planUuid = qifService.generateQIFUUID();
        const qifDoc = qifService.createMeasurementPlan({
          ...testData.partData,
          planUuid,
        });

        const characteristics = qifDoc.QIFDocument.Product?.[0].Characteristics || [];
        expect(characteristics[0].id).toBe(testData.partData.characteristics[0].characteristicUuid);
        expect(characteristics[1].id).toBe(testData.partData.characteristics[1].characteristicUuid);
      });

      it('should generate UUIDs when not provided', () => {
        const characteristicsWithoutUUIDs = testData.partData.characteristics.map(char => ({
          ...char,
          characteristicUuid: undefined,
          characteristicId: undefined,
        }));

        const qifDoc = qifService.createMeasurementPlan({
          partNumber: testData.partData.partNumber,
          revision: testData.partData.revision,
          characteristics: characteristicsWithoutUUIDs,
        });

        const characteristics = qifDoc.QIFDocument.Product?.[0].Characteristics || [];
        characteristics.forEach((char) => {
          const validation = qifService.validateIdentifier(char.id);
          expect(validation.isValid).toBe(true);
          expect(validation.format).toBe('UUID');
        });
      });

      it('should fall back to legacy IDs when UUID generation is disabled', () => {
        const legacyService = new QIFService({
          preferUuids: false,
          requireUuids: false,
          allowLegacyIds: true,
        });

        const characteristicsWithLegacyIds = testData.partData.characteristics.map((char, index) => ({
          ...char,
          characteristicUuid: undefined,
          characteristicId: `CHAR-${index + 1}`,
        }));

        const qifDoc = legacyService.createMeasurementPlan({
          partNumber: testData.partData.partNumber,
          revision: testData.partData.revision,
          characteristics: characteristicsWithLegacyIds,
          planId: 'PLAN-001',
        });

        expect(qifDoc.QIFDocument.MeasurementPlan?.id).toBe('PLAN-001');
        const characteristics = qifDoc.QIFDocument.Product?.[0].Characteristics || [];
        expect(characteristics[0].id).toBe('CHAR-1');
        expect(characteristics[1].id).toBe('CHAR-2');
      });
    });

    describe('Enhanced MES QIF integration', () => {
      it('should enhance MES QIF Plan with UUID metadata', () => {
        const mesQIFPlan = {
          qifPlanUuid: testData.validUUIDv4,
          qifPlanId: testData.legacyId,
          partNumber: testData.partData.partNumber,
          revision: testData.partData.revision,
          planVersion: '1.0',
          createdDate: new Date(),
          characteristics: testData.partData.characteristics.map(char => ({
            characteristicUuid: char.characteristicUuid,
            characteristicId: char.characteristicId,
            balloonNumber: char.balloonNumber,
            description: char.description,
            nominalValue: char.nominalValue,
            upperTolerance: char.upperTolerance,
            lowerTolerance: char.lowerTolerance,
            toleranceType: char.characteristicType,
            measurementMethod: 'CMM',
            samplingRequired: false,
          })),
          xmlContent: '<QIFDocument>...</QIFDocument>',
        };

        const enhanced = qifService.enhanceMESQIFPlan(mesQIFPlan);

        expect(enhanced.identifiers).toBeDefined();
        expect(enhanced.identifiers?.primary).toBe(testData.validUUIDv4);
        expect(enhanced.migrationStatus).toBeDefined();
        expect(enhanced.migrationStatus?.migrationComplete).toBe(true);
        expect(enhanced.migrationStatus?.identifierType).toBe('HYBRID');
      });

      it('should enhance MES QIF Results with UUID metadata', () => {
        const mesQIFResults = {
          qifResultsUuid: testData.validUUIDv4,
          qifResultsId: testData.legacyId,
          qifPlanUuid: testData.validUUIDv4,
          qifPlanId: testData.legacyId,
          serialNumber: testData.measurementData.serialNumber,
          inspectionDate: testData.measurementData.inspectionDate,
          inspectedBy: testData.measurementData.inspectedBy,
          overallStatus: 'PASS' as const,
          measurements: testData.measurementData.measurements.map(meas => ({
            characteristicUuid: testData.partData.characteristics[0].characteristicUuid,
            characteristicId: meas.characteristicId,
            measuredValue: meas.measuredValue,
            deviation: meas.measuredValue - testData.partData.characteristics[0].nominalValue,
            status: meas.status,
            measurementDevice: meas.measurementDevice,
            uncertainty: meas.uncertainty,
          })),
          xmlContent: '<QIFDocument>...</QIFDocument>',
        };

        const enhanced = qifService.enhanceMESQIFResults(mesQIFResults);

        expect(enhanced.identifiers).toBeDefined();
        expect(enhanced.identifiers?.primary).toBe(testData.validUUIDv4);
        expect(enhanced.planIdentifiers).toBeDefined();
        expect(enhanced.planIdentifiers?.primary).toBe(testData.validUUIDv4);
        expect(enhanced.migrationStatus?.migrationComplete).toBe(true);
      });
    });
  });

  describe('Configuration-based Behavior', () => {
    it('should enforce UUID requirements when configured', () => {
      const strictService = new QIFService({
        preferUuids: true,
        requireUuids: true,
        allowLegacyIds: false,
        validateUuidFormat: true,
        nistCompliance: true,
      });

      expect(() => {
        strictService.resolveQIFIdentifier(undefined, testData.legacyId);
      }).toThrow();
    });

    it('should allow legacy IDs when configured', () => {
      const permissiveService = new QIFService({
        preferUuids: false,
        requireUuids: false,
        allowLegacyIds: true,
        validateUuidFormat: false,
        nistCompliance: false,
      });

      const result = permissiveService.resolveQIFIdentifier(undefined, testData.legacyId);
      expect(result.primary).toBe(testData.legacyId);
    });

    it('should validate UUID format when configured', () => {
      const validatingService = new QIFService({
        validateUuidFormat: true,
      });

      const result = validatingService.validateIdentifier(testData.invalidUUID);
      expect(result.isValid).toBe(false);
    });

    it('should operate in migration mode', () => {
      const migrationService = new QIFService({
        migrationMode: true,
        preferUuids: true,
        allowLegacyIds: true,
      });

      // Migration mode should allow both UUIDs and legacy IDs
      const uuidResult = migrationService.resolveQIFIdentifier(testData.validUUIDv4, undefined);
      expect(uuidResult.primary).toBe(testData.validUUIDv4);

      const legacyResult = migrationService.resolveQIFIdentifier(undefined, testData.legacyId);
      expect(legacyResult.primary).toBe(testData.legacyId);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => {
        qifService.validateIdentifier(null as any);
      }).not.toThrow();

      expect(() => {
        qifService.validateIdentifier(undefined as any);
      }).not.toThrow();

      const result = qifService.validateIdentifier(null as any);
      expect(result.isValid).toBe(false);
    });

    it('should handle very long identifiers', () => {
      const longId = 'a'.repeat(1000);
      const result = qifService.validateIdentifier(longId);
      expect(result.isValid).toBe(false);
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+{}|:<>?[]\\;\'",./`~';
      const result = qifService.validateIdentifier(specialChars);
      expect(result.isValid).toBe(false);
    });

    it('should handle whitespace-only strings', () => {
      const whitespace = '   \t\n   ';
      const result = qifService.validateIdentifier(whitespace);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should validate UUIDs efficiently', () => {
      const uuids = Array.from({ length: 1000 }, () => qifService.generateQIFUUID());

      const start = Date.now();
      const results = uuids.map(uuid => qifService.validateIdentifier(uuid));
      const duration = Date.now() - start;

      expect(results.every(r => r.isValid)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should generate UUIDs efficiently', () => {
      const start = Date.now();
      const uuids = Array.from({ length: 10000 }, () => qifService.generateQIFUUID());
      const duration = Date.now() - start;

      expect(uuids).toHaveLength(10000);
      expect(new Set(uuids).size).toBe(10000); // All unique
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    it('should create QIF documents with many characteristics efficiently', () => {
      const manyCharacteristics = Array.from({ length: 100 }, (_, i) => ({
        balloonNumber: `${i + 1}`,
        description: `Characteristic ${i + 1}`,
        nominalValue: 100 + i,
        upperTolerance: 0.1,
        lowerTolerance: -0.1,
        characteristicType: 'LENGTH',
        characteristicUuid: qifService.generateQIFUUID(),
        characteristicId: `CHAR-${i + 1}`,
      }));

      const start = Date.now();
      const qifDoc = qifService.createMeasurementPlan({
        partNumber: 'PERF-TEST-001',
        revision: 'Rev-A',
        characteristics: manyCharacteristics,
        planUuid: qifService.generateQIFUUID(),
      });
      const duration = Date.now() - start;

      expect(qifDoc.QIFDocument.Product?.[0].Characteristics).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Integration with XML Generation', () => {
    it('should generate valid QIF XML with UUIDs', () => {
      const qifDoc = qifService.createMeasurementPlan({
        ...testData.partData,
        planUuid: qifService.generateQIFUUID(),
      });

      const xmlString = qifService.generateQIF(qifDoc);

      expect(xmlString).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlString).toContain('<QIFDocument>');
      expect(xmlString).toContain('<Version>3.0.0</Version>');
      expect(xmlString).toContain('</QIFDocument>');

      // Check that UUIDs are properly embedded in XML
      const characteristics = qifDoc.QIFDocument.Product?.[0].Characteristics || [];
      characteristics.forEach((char) => {
        expect(xmlString).toContain(char.id);
      });
    });

    it('should parse QIF XML with UUIDs correctly', () => {
      const qifDoc = qifService.createMeasurementPlan({
        ...testData.partData,
        planUuid: qifService.generateQIFUUID(),
      });

      const xmlString = qifService.generateQIF(qifDoc);
      const parsedDoc = qifService.parseQIF(xmlString);

      expect(parsedDoc.QIFDocument.Version).toBe('3.0.0');
      expect(parsedDoc.QIFDocument.MeasurementPlan?.id).toBeDefined();

      const validation = qifService.validateIdentifier(parsedDoc.QIFDocument.MeasurementPlan?.id || '');
      expect(validation.isValid).toBe(true);
    });

    it('should validate round-trip XML conversion with UUIDs', () => {
      const originalDoc = qifService.createMeasurementPlan({
        ...testData.partData,
        planUuid: qifService.generateQIFUUID(),
      });

      const xmlString = qifService.generateQIF(originalDoc);
      const parsedDoc = qifService.parseQIF(xmlString);
      const regeneratedXml = qifService.generateQIF(parsedDoc);

      // The regenerated XML should be functionally equivalent
      const secondParsedDoc = qifService.parseQIF(regeneratedXml);

      expect(secondParsedDoc.QIFDocument.Version).toBe(originalDoc.QIFDocument.Version);
      expect(secondParsedDoc.QIFDocument.MeasurementPlan?.id).toBe(originalDoc.QIFDocument.MeasurementPlan?.id);
    });
  });
});

// Export test utilities for other integration tests
export const createTestQIFService = (config: Partial<any> = {}) => {
  return new QIFService({
    preferUuids: true,
    requireUuids: false,
    allowLegacyIds: true,
    validateUuidFormat: true,
    migrationMode: true,
    nistCompliance: true,
    ...config,
  });
};

export const generateTestCharacteristics = (count: number = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    balloonNumber: `${i + 1}`,
    description: `Test Characteristic ${i + 1}`,
    nominalValue: 100 + i * 10,
    upperTolerance: 0.1,
    lowerTolerance: -0.1,
    characteristicType: 'LENGTH',
    characteristicUuid: uuidv4(),
    characteristicId: `CHAR-${(i + 1).toString().padStart(3, '0')}`,
  }));
};

export const generateTestMeasurements = (characteristics: any[]) => {
  return characteristics.map((char, i) => ({
    balloonNumber: char.balloonNumber,
    characteristicId: char.characteristicId,
    measuredValue: char.nominalValue + (Math.random() - 0.5) * 0.1,
    status: 'PASS' as const,
    measurementDevice: 'CMM-001',
    uncertainty: 0.001,
  }));
};

export default {
  testData,
  createTestQIFService,
  generateTestCharacteristics,
  generateTestMeasurements,
};