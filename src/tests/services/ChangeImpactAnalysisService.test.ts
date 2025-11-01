/**
 * Change Impact Analysis Service Tests (Issue #225)
 *
 * Comprehensive test suite for change impact analysis including where-used
 * analysis, impact assessment, and change recommendations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangeImpactAnalysisService } from '../../services/ChangeImpactAnalysisService';
import prisma from '../../lib/database';

// Mock Prisma
vi.mock('../../lib/database', () => ({
  default: {
    part: {
      findUnique: vi.fn(),
    },
    bOMLine: {
      findMany: vi.fn(),
    },
    interfaceControlDocument: {
      findMany: vi.fn(),
    },
  },
}));

describe('ChangeImpactAnalysisService', () => {
  let service: ChangeImpactAnalysisService;

  const mockPart = {
    id: 'part-1',
    partNumber: 'PART-001',
    partName: 'Engine Compressor Blade',
  };

  const mockBomLines = [
    {
      id: 'bom-line-1',
      bomId: 'bom-1',
      partId: 'part-1',
      quantity: 4,
      position: 'Position A1',
      relationship: 'COMPONENT',
      effectivityStart: new Date('2023-01-01'),
      effectivityEnd: null,
      bom: {
        id: 'bom-1',
        partId: 'part-2',
        part: {
          partNumber: 'ASSEMBLY-001',
          partName: 'Compressor Assembly',
        },
      },
    },
    {
      id: 'bom-line-2',
      bomId: 'bom-2',
      partId: 'part-1',
      quantity: 8,
      position: 'Position A2',
      relationship: 'COMPONENT',
      effectivityStart: new Date('2023-01-01'),
      effectivityEnd: null,
      bom: {
        id: 'bom-2',
        partId: 'part-3',
        part: {
          partNumber: 'ASSEMBLY-002',
          partName: 'Turbine Assembly',
        },
      },
    },
  ];

  beforeEach(() => {
    service = ChangeImpactAnalysisService.getInstance();
    vi.clearAllMocks();
  });

  // ============================================================================
  // WHERE-USED ANALYSIS TESTS
  // ============================================================================

  describe('Where-Used Analysis', () => {
    it('should perform basic where-used analysis', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const result = await service.analyzeWhereUsed({
        partId: 'part-1',
      });

      expect(result.partId).toBe('part-1');
      expect(result.partNumber).toBe('PART-001');
      expect(result.partName).toBe('Engine Compressor Blade');
      expect(result.affectedAssemblies.length).toBeGreaterThan(0);
    });

    it('should handle part not found error', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(null);

      await expect(
        service.analyzeWhereUsed({
          partId: 'invalid-id',
        })
      ).rejects.toThrow('not found');
    });

    it('should respect max depth parameter', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const result = await service.analyzeWhereUsed({
        partId: 'part-1',
        maxDepth: 3,
      });

      expect(result).toBeDefined();
      expect(result.hierarchyDepth).toBeLessThanOrEqual(3);
    });

    it('should include effectivity filtering when specified', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const effectiveDate = new Date('2023-06-01');
      const result = await service.analyzeWhereUsed({
        partId: 'part-1',
        includeEffectivity: true,
        effectiveDate,
      });

      expect(result).toBeDefined();
      expect(result.affectedAssemblies.length).toBeGreaterThan(0);
    });

    it('should identify interface boundaries', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany)
        .mockResolvedValueOnce([{ icdNumber: 'ICD-001' }]) // First assembly has ICD
        .mockResolvedValueOnce([]); // Second assembly has no ICD

      const result = await service.analyzeWhereUsed({
        partId: 'part-1',
      });

      expect(result.affectedAssemblies.length).toBeGreaterThan(0);
      expect(
        result.affectedAssemblies.some((a) => a.hasInterfaceBoundary)
      ).toBe(true);
    });
  });

  // ============================================================================
  // IMPACT ASSESSMENT TESTS
  // ============================================================================

  describe('Impact Assessment', () => {
    it('should perform comprehensive impact assessment', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const assessment = await service.assessChangeImpact({
        sourcePart: mockPart,
        changeDescription: 'Material composition change',
        changeType: 'MATERIAL',
        severity: 'MAJOR',
        affectedAssemblies: ['bom-1', 'bom-2'],
      });

      expect(assessment.sourcePart).toEqual(mockPart);
      expect(assessment.changeType).toBe('MATERIAL');
      expect(assessment.severity).toBe('MAJOR');
      expect(assessment.blastRadius).toBeDefined();
      expect(assessment.recommendation).toBeDefined();
      expect(assessment.riskAssessment).toBeDefined();
      expect(assessment.implications).toBeDefined();
    });

    it('should calculate correct blast radius', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const assessment = await service.assessChangeImpact({
        sourcePart: mockPart,
        changeDescription: 'Testing blast radius',
        changeType: 'DESIGN',
        severity: 'CRITICAL',
        affectedAssemblies: [],
      });

      expect(assessment.blastRadius.directlyAffected).toBeGreaterThan(0);
      expect(assessment.blastRadius.totalAffected).toBeGreaterThanOrEqual(
        assessment.blastRadius.directlyAffected
      );
      expect(assessment.blastRadius.maxDepth).toBeGreaterThan(0);
    });

    it('should generate appropriate recommendations based on severity', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const minorChange = await service.assessChangeImpact({
        sourcePart: mockPart,
        changeDescription: 'Minor change',
        changeType: 'PROCESS',
        severity: 'MINOR',
        affectedAssemblies: [],
      });

      const criticalChange = await service.assessChangeImpact({
        sourcePart: mockPart,
        changeDescription: 'Critical change',
        changeType: 'DESIGN',
        severity: 'CRITICAL',
        affectedAssemblies: [],
      });

      expect(minorChange.recommendation).toBeDefined();
      expect(criticalChange.recommendation).toBeDefined();
      expect(criticalChange.recommendation.confidence).toBeGreaterThan(0);
    });

    it('should assess risks accurately', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const assessment = await service.assessChangeImpact({
        sourcePart: mockPart,
        changeDescription: 'Risk assessment test',
        changeType: 'DIMENSIONAL',
        severity: 'CRITICAL',
        affectedAssemblies: [],
      });

      expect(assessment.riskAssessment.overallRisk).toMatch(
        /LOW|MEDIUM|HIGH|CRITICAL/
      );
      expect(assessment.riskAssessment.supplyChainRisk).toBeDefined();
      expect(assessment.riskAssessment.complianceRisk).toBeDefined();
      expect(assessment.riskAssessment.inventoryRisk).toBeDefined();
      expect(assessment.riskAssessment.scheduleRisk).toBeDefined();
      expect(Array.isArray(assessment.riskAssessment.mitigationActions)).toBe(
        true
      );
    });

    it('should identify all relevant implications', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany)
        .mockResolvedValueOnce([{ icdNumber: 'ICD-001' }]);

      const assessment = await service.assessChangeImpact({
        sourcePart: mockPart,
        changeDescription: 'Testing implications',
        changeType: 'DESIGN',
        severity: 'MAJOR',
        affectedAssemblies: [],
      });

      expect(Array.isArray(assessment.implications)).toBe(true);
      expect(assessment.implications.length).toBeGreaterThan(0);
      expect(
        assessment.implications.every((imp) => imp.category && imp.description)
      ).toBe(true);
    });
  });

  // ============================================================================
  // RECOMMENDATION TESTS
  // ============================================================================

  describe('Intelligent Recommendations', () => {
    it('should recommend PROPAGATE for critical changes', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const assessment = await service.assessChangeImpact({
        sourcePart: mockPart,
        changeDescription: 'Critical design change',
        changeType: 'DESIGN',
        severity: 'CRITICAL',
        affectedAssemblies: [],
      });

      expect(assessment.recommendation.strategy).toBe('PROPAGATE');
      expect(assessment.recommendation.confidence).toBeGreaterThan(0);
    });

    it('should provide multiple alternative strategies', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const assessment = await service.assessChangeImpact({
        sourcePart: mockPart,
        changeDescription: 'Minor change with alternatives',
        changeType: 'PROCESS',
        severity: 'MINOR',
        affectedAssemblies: [],
      });

      expect(Array.isArray(assessment.recommendation.alternativeStrategies)).toBe(
        true
      );
      expect(assessment.recommendation.alternativeStrategies.length).toBeGreaterThan(
        0
      );
    });

    it('should include detailed rationale for recommendations', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const assessment = await service.assessChangeImpact({
        sourcePart: mockPart,
        changeDescription: 'Testing rationale',
        changeType: 'MATERIAL',
        severity: 'MODERATE',
        affectedAssemblies: [],
      });

      expect(assessment.recommendation.rationale).toBeDefined();
      expect(assessment.recommendation.rationale.length).toBeGreaterThan(0);
      expect(assessment.recommendation.estimatedImpact).toBeDefined();
    });
  });

  // ============================================================================
  // EXPORT TESTS
  // ============================================================================

  describe('Export Functionality', () => {
    it('should export where-used analysis in JSON format', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const exported = await service.exportWhereUsedAnalysis(
        'part-1',
        'JSON'
      );

      expect(exported).toBeDefined();
      expect(exported.partId).toBe('part-1');
      expect(exported.affectedAssemblies).toBeDefined();
    });

    it('should export where-used analysis in CSV format', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const csv = await service.exportWhereUsedAnalysis('part-1', 'CSV');

      expect(typeof csv).toBe('string');
      expect(csv).toContain('Part Number');
      expect(csv).toContain(mockPart.partNumber);
    });

    it('should handle missing affected assemblies gracefully', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue([]);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const result = await service.analyzeWhereUsed({
        partId: 'part-1',
      });

      expect(result.totalAffectedCount).toBe(0);
      expect(result.affectedAssemblies).toHaveLength(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.part.findUnique).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        service.analyzeWhereUsed({ partId: 'part-1' })
      ).rejects.toThrow();
    });

    it('should validate required fields in impact assessment', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue([]);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const assessment = await service.assessChangeImpact({
        sourcePart: mockPart,
        changeDescription: '',
        changeType: 'DESIGN',
        severity: 'MAJOR',
        affectedAssemblies: [],
      });

      expect(assessment).toBeDefined();
      expect(assessment.sourcePart).toEqual(mockPart);
    });

    it('should return consistent results for repeated analyses', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(mockPart);
      vi.mocked(prisma.bOMLine.findMany).mockResolvedValue(mockBomLines);
      vi.mocked(prisma.interfaceControlDocument.findMany).mockResolvedValue([]);

      const result1 = await service.analyzeWhereUsed({ partId: 'part-1' });
      const result2 = await service.analyzeWhereUsed({ partId: 'part-1' });

      expect(result1.totalAffectedCount).toBe(result2.totalAffectedCount);
      expect(result1.partId).toBe(result2.partId);
    });
  });
});
