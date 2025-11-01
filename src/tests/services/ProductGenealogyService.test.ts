/**
 * Product Genealogy & BOM Management Services - Unit Tests
 * Tests for ProductGenealogyService, AsBuiltBOMService, and RecallSimulationService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ProductGenealogyService from '../../services/ProductGenealogyService';
import AsBuiltBOMService from '../../services/AsBuiltBOMService';
import RecallSimulationService from '../../services/RecallSimulationService';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ProductGenealogyService', () => {
  let genealogyService: ProductGenealogyService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      part: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      serializedPart: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    genealogyService = new ProductGenealogyService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize service successfully', () => {
      expect(genealogyService).toBeDefined();
    });

    it('should have all public methods', () => {
      expect(genealogyService.getBackwardTraceability).toBeDefined();
      expect(genealogyService.getForwardTraceability).toBeDefined();
      expect(genealogyService.getFullGenealogyTree).toBeDefined();
      expect(genealogyService.analyzeRecallImpact).toBeDefined();
      expect(genealogyService.getPartNumberingScheme).toBeDefined();
      expect(genealogyService.getProductFamily).toBeDefined();
      expect(genealogyService.getGenealogyDepth).toBeDefined();
      expect(genealogyService.disconnect).toBeDefined();
    });
  });

  describe('getBackwardTraceability', () => {
    it('should get backward traceability', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
        partType: 'ASSEMBLY',
        parentBom: [
          {
            parent: {
              id: 'parent-1',
              partNumber: 'PN-002',
              partName: 'Parent Part',
              partType: 'ASSEMBLY',
            },
          },
        ],
      });

      const traceability = await genealogyService.getBackwardTraceability('part-1');

      expect(traceability).toBeDefined();
      expect(traceability.root).toBe('part-1');
      expect(traceability.path).toBeDefined();
      expect(Array.isArray(traceability.path)).toBe(true);
    });

    it('should handle part not found gracefully', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      const traceability = await genealogyService.getBackwardTraceability('nonexistent');

      expect(traceability).toBeDefined();
      expect(traceability.root).toBe('nonexistent');
      expect(traceability.path).toEqual([]);
    });
  });

  describe('getForwardTraceability', () => {
    it('should get forward traceability', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
        partType: 'COMPONENT',
        bom: [
          {
            component: {
              id: 'child-1',
              partNumber: 'PN-003',
              partName: 'Child Part',
              partType: 'ASSEMBLY',
            },
          },
        ],
      });

      const traceability = await genealogyService.getForwardTraceability('part-1');

      expect(traceability).toBeDefined();
      expect(traceability.root).toBe('part-1');
      expect(traceability.path).toBeDefined();
    });
  });

  describe('getFullGenealogyTree', () => {
    it('should get full genealogy tree', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
        partType: 'ASSEMBLY',
        parentBom: [],
        bom: [],
      });

      const tree = await genealogyService.getFullGenealogyTree('part-1');

      expect(tree).toBeDefined();
      expect(tree.rootPartId).toBe('part-1');
      expect(tree.rootPartNumber).toBe('PN-001');
      expect(tree.upstreamTree).toBeDefined();
      expect(tree.downstreamTree).toBeDefined();
      expect(tree.immediateRelatives).toBeDefined();
    });

    it('should handle part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      await expect(genealogyService.getFullGenealogyTree('nonexistent')).rejects.toThrow();
    });
  });

  describe('analyzeRecallImpact', () => {
    it('should analyze recall impact', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
      });

      mockPrisma.serializedPart.count.mockResolvedValue(100);

      const impact = await genealogyService.analyzeRecallImpact('part-1');

      expect(impact).toBeDefined();
      expect(impact.initiatingPartId).toBe('part-1');
      expect(impact.affectedParts).toBeDefined();
      expect(impact.estimatedProductsAffected).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPartNumberingScheme', () => {
    it('should get part numbering scheme', async () => {
      const scheme = await genealogyService.getPartNumberingScheme('standard-manufacturing');

      expect(scheme).toBeDefined();
      expect(scheme?.schemeId).toBe('standard-manufacturing');
      expect(scheme?.segments).toBeDefined();
      expect(Array.isArray(scheme?.segments)).toBe(true);
    });

    it('should return null for unknown scheme', async () => {
      const scheme = await genealogyService.getPartNumberingScheme('unknown-scheme');

      expect(scheme).toBeNull();
    });
  });

  describe('getProductFamily', () => {
    it('should get product family', async () => {
      mockPrisma.part.findUnique.mockResolvedValueOnce({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
        bom: [
          {
            componentId: 'comp-1',
            component: {
              id: 'comp-1',
              partNumber: 'PN-002',
              partName: 'Component 1',
            },
          },
        ],
      });

      mockPrisma.part.findMany.mockResolvedValue([
        {
          id: 'variant-1',
          partNumber: 'PN-001-V1',
          partName: 'Test Part Variant 1',
          bom: [],
        },
      ]);

      const family = await genealogyService.getProductFamily('part-1');

      expect(family).toBeDefined();
      expect(family.parentPartId).toBe('part-1');
      expect(family.variants).toBeDefined();
    });
  });

  describe('getGenealogyDepth', () => {
    it('should get genealogy depth', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
        parentBom: [],
        bom: [],
      });

      const depth = await genealogyService.getGenealogyDepth('part-1');

      expect(depth).toBeDefined();
      expect(depth.upstreamDepth).toBeGreaterThanOrEqual(0);
      expect(depth.downstreamDepth).toBeGreaterThanOrEqual(0);
      expect(depth.totalDepth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await genealogyService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});

describe('AsBuiltBOMService', () => {
  let bomService: AsBuiltBOMService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      part: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    bomService = new AsBuiltBOMService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize service successfully', () => {
      expect(bomService).toBeDefined();
    });

    it('should have all public methods', () => {
      expect(bomService.getAsBuiltBOM).toBeDefined();
      expect(bomService.createOrUpdateAsBuiltBOM).toBeDefined();
      expect(bomService.getBOMVariants).toBeDefined();
      expect(bomService.compareBOMs).toBeDefined();
      expect(bomService.checkComponentSubstitutions).toBeDefined();
      expect(bomService.applySubstitution).toBeDefined();
      expect(bomService.getBOMVersionHistory).toBeDefined();
      expect(bomService.validateBOMCompleteness).toBeDefined();
      expect(bomService.analyzeBOMCost).toBeDefined();
      expect(bomService.disconnect).toBeDefined();
    });
  });

  describe('getAsBuiltBOM', () => {
    it('should get as-built BOM', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
        bom: [
          {
            quantity: 2,
            uom: 'EA',
            component: {
              id: 'comp-1',
              partNumber: 'PN-002',
              partName: 'Component 1',
            },
            notes: 'Test note',
          },
        ],
      });

      const bom = await bomService.getAsBuiltBOM('part-1');

      expect(bom).toBeDefined();
      expect(bom?.parentPartId).toBe('part-1');
      expect(bom?.components).toBeDefined();
      expect(Array.isArray(bom?.components)).toBe(true);
    });

    it('should handle part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      await expect(bomService.getAsBuiltBOM('nonexistent')).rejects.toThrow();
    });
  });

  describe('createOrUpdateAsBuiltBOM', () => {
    it('should create or update as-built BOM', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
      });

      const components = [
        {
          componentPartId: 'comp-1',
          componentPartNumber: 'PN-002',
          componentPartName: 'Component 1',
          quantity: 2,
          uom: 'EA',
          isOptional: false,
        },
      ];

      const bom = await bomService.createOrUpdateAsBuiltBOM('part-1', components, 'USER-001');

      expect(bom).toBeDefined();
      expect(bom.parentPartId).toBe('part-1');
      expect(bom.components).toEqual(components);
    });
  });

  describe('getBOMVariants', () => {
    it('should get BOM variants', async () => {
      mockPrisma.part.findUnique.mockResolvedValueOnce({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
        bom: [
          {
            componentId: 'comp-1',
            component: { id: 'comp-1', partNumber: 'PN-002', partName: 'Component 1' },
          },
        ],
      });

      mockPrisma.part.findMany.mockResolvedValue([
        {
          id: 'variant-1',
          partNumber: 'PN-001-V1',
          partName: 'Test Part Variant',
          bom: [
            {
              componentId: 'comp-2',
              component: { id: 'comp-2', partNumber: 'PN-003', partName: 'Component 2' },
            },
          ],
        },
      ]);

      const variants = await bomService.getBOMVariants('part-1');

      expect(variants).toBeDefined();
      expect(Array.isArray(variants)).toBe(true);
    });
  });

  describe('compareBOMs', () => {
    it('should compare BOMs', async () => {
      const plannedBOM = [
        {
          componentPartId: 'comp-1',
          componentPartNumber: 'PN-002',
          componentPartName: 'Component 1',
          quantity: 2,
          uom: 'EA',
          isOptional: false,
        },
      ];

      const asBuiltBOM = [
        {
          componentPartId: 'comp-1',
          componentPartNumber: 'PN-002',
          componentPartName: 'Component 1',
          quantity: 2,
          uom: 'EA',
          isOptional: false,
        },
        {
          componentPartId: 'comp-2',
          componentPartNumber: 'PN-003',
          componentPartName: 'Component 2',
          quantity: 1,
          uom: 'EA',
          isOptional: false,
        },
      ];

      const comparison = await bomService.compareBOMs('part-1', plannedBOM, asBuiltBOM);

      expect(comparison).toBeDefined();
      expect(comparison.parentPartId).toBe('part-1');
      expect(comparison.addedComponents).toBeDefined();
      expect(comparison.compliancePercentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkComponentSubstitutions', () => {
    it('should check component substitutions', async () => {
      mockPrisma.part.findUnique.mockResolvedValueOnce({
        id: 'comp-1',
        partNumber: 'PN-002',
        partType: 'COMPONENT',
      });

      mockPrisma.part.findMany.mockResolvedValue([
        {
          id: 'substitute-1',
          partNumber: 'PN-004',
          partName: 'Substitute Component',
        },
      ]);

      const substitutions = await bomService.checkComponentSubstitutions('comp-1');

      expect(substitutions).toBeDefined();
      expect(Array.isArray(substitutions)).toBe(true);
    });
  });

  describe('applySubstitution', () => {
    it('should apply component substitution', async () => {
      mockPrisma.part.findUnique
        .mockResolvedValueOnce({
          id: 'original-1',
          partNumber: 'PN-002',
        })
        .mockResolvedValueOnce({
          id: 'substitute-1',
          partNumber: 'PN-004',
        })
        .mockResolvedValueOnce({
          id: 'parent-1',
          partNumber: 'PN-001',
        });

      const result = await bomService.applySubstitution(
        'original-1',
        'substitute-1',
        'parent-1',
        'USER-001'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('getBOMVersionHistory', () => {
    it('should get BOM version history', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
      });

      const history = await bomService.getBOMVersionHistory('part-1');

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('validateBOMCompleteness', () => {
    it('should validate BOM completeness', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
        bom: [
          {
            quantity: 2,
            component: {
              id: 'comp-1',
              partNumber: 'PN-002',
              isActive: true,
            },
          },
        ],
      });

      const validation = await bomService.validateBOMCompleteness('part-1');

      expect(validation).toBeDefined();
      expect(validation.isComplete).toBeDefined();
      expect(validation.componentCount).toBe(1);
    });
  });

  describe('analyzeBOMCost', () => {
    it('should analyze BOM cost', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
        bom: [
          {
            quantity: 2,
            component: {
              id: 'comp-1',
              partNumber: 'PN-002',
              partName: 'Component 1',
            },
          },
        ],
      });

      const cost = await bomService.analyzeBOMCost('part-1');

      expect(cost).toBeDefined();
      expect(cost.totalComponentCost).toBeGreaterThanOrEqual(0);
      expect(cost.componentCount).toBe(1);
      expect(cost.componentCosts).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await bomService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});

describe('RecallSimulationService', () => {
  let recallService: RecallSimulationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      part: {
        findUnique: vi.fn(),
      },
      serializedPart: {
        findMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    recallService = new RecallSimulationService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize service successfully', () => {
      expect(recallService).toBeDefined();
    });

    it('should have all public methods', () => {
      expect(recallService.simulateRecall).toBeDefined();
      expect(recallService.getRecallImpactAnalysis).toBeDefined();
      expect(recallService.generateRecallActionPlan).toBeDefined();
      expect(recallService.trackRecallEffectiveness).toBeDefined();
      expect(recallService.estimateRecallCost).toBeDefined();
      expect(recallService.identifyCriticalAreas).toBeDefined();
      expect(recallService.generateRecallReport).toBeDefined();
      expect(recallService.disconnect).toBeDefined();
    });
  });

  describe('simulateRecall', () => {
    it('should simulate a recall', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        partName: 'Test Part',
      });

      mockPrisma.serializedPart.findMany.mockResolvedValue(
        Array(100).fill({ id: 'serial-1', partId: 'part-1' })
      );

      const simulation = await recallService.simulateRecall('part-1', 'HIGH', 'Defective component');

      expect(simulation).toBeDefined();
      expect(simulation.initiatingPartId).toBe('part-1');
      expect(simulation.severity).toBe('HIGH');
      expect(simulation.estimatedAffectedUnits).toBe(100);
      expect(simulation.estimatedCost).toBeGreaterThan(0);
    });

    it('should handle part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      await expect(
        recallService.simulateRecall('nonexistent', 'HIGH', 'Defective component')
      ).rejects.toThrow();
    });
  });

  describe('getRecallImpactAnalysis', () => {
    it('should get recall impact analysis', async () => {
      const analysis = await recallService.getRecallImpactAnalysis('recall-1');

      expect(analysis).toBeDefined();
      expect(analysis.recallId).toBe('recall-1');
      expect(analysis.totalAffectedUnits).toBeGreaterThan(0);
      expect(analysis.financialImpact).toBeDefined();
      expect(analysis.timelineEstimates).toBeDefined();
    });
  });

  describe('generateRecallActionPlan', () => {
    it('should generate recall action plan', async () => {
      const actions = await recallService.generateRecallActionPlan('recall-1', 100, 'HIGH');

      expect(actions).toBeDefined();
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].recallId).toBe('recall-1');
    });
  });

  describe('trackRecallEffectiveness', () => {
    it('should track recall effectiveness', async () => {
      const effectiveness = await recallService.trackRecallEffectiveness('recall-1');

      expect(effectiveness).toBeDefined();
      expect(effectiveness.recallId).toBe('recall-1');
      expect(effectiveness.recoveryRate).toBeGreaterThanOrEqual(0);
      expect(effectiveness.successRate).toBeGreaterThanOrEqual(0);
      expect(effectiveness.remainingUnits).toBeGreaterThanOrEqual(0);
    });
  });

  describe('estimateRecallCost', () => {
    it('should estimate recall cost', async () => {
      const estimate = await recallService.estimateRecallCost(100, 'HIGH', 'SAFETY');

      expect(estimate).toBeDefined();
      expect(estimate.totalCost).toBeGreaterThan(0);
      expect(estimate.breakdown).toBeDefined();
      expect(estimate.breakdown.replacement).toBeGreaterThan(0);
    });
  });

  describe('identifyCriticalAreas', () => {
    it('should identify critical recall areas', async () => {
      const areas = await recallService.identifyCriticalAreas('recall-1');

      expect(areas).toBeDefined();
      expect(Array.isArray(areas)).toBe(true);
      expect(areas.length).toBeGreaterThan(0);
    });
  });

  describe('generateRecallReport', () => {
    it('should generate recall report', async () => {
      const report = await recallService.generateRecallReport('recall-1');

      expect(report).toBeDefined();
      expect(report.recallId).toBe('recall-1');
      expect(report.summary).toBeDefined();
      expect(report.financials).toBeDefined();
      expect(report.timeline).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await recallService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
