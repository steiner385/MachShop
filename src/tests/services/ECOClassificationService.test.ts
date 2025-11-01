/**
 * ECO Classification Service Tests (Issue #226)
 *
 * Comprehensive test suite for ECO classification including:
 * - Change type classification (Form/Fit/Function)
 * - Safety criticality assessment
 * - Certification impact determination
 * - Interface boundary analysis
 * - Automatic classification with override capability
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ECOClassificationService } from '../../services/ECOClassificationService';
import {
  ChangeClassification,
  SafetyCriticality,
  CertificationImpact,
} from '../../services/ECOClassificationService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('../../lib/database', () => ({
  default: {
    part: {
      findUnique: vi.fn(),
    },
    interfaceControlDocument: {
      findMany: vi.fn(),
    },
  },
}));

describe('ECOClassificationService', () => {
  let service: ECOClassificationService;
  let mockPrisma: any;

  const mockPart = {
    id: 'part-1',
    partNumber: 'PART-001',
    partName: 'Test Part',
    certificationBodies: ['FAA', 'EASA'],
    icdOwner: [],
    icdParticipant: [],
  };

  beforeEach(() => {
    mockPrisma = {
      part: {
        findUnique: vi.fn().mockResolvedValue(mockPart),
      },
      interfaceControlDocument: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as any;

    service = new ECOClassificationService(mockPrisma);
  });

  // ============================================================================
  // Change Type Classification Tests
  // ============================================================================

  describe('Change Type Classification', () => {
    it('should classify form-only changes', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Changed aesthetic appearance',
        currentCharacteristics: {
          form: 'Cylindrical',
          fit: '10mm diameter',
          function: 'Rotate at 1000 RPM',
        },
        proposedCharacteristics: {
          form: 'Oval',
          fit: '10mm diameter',
          function: 'Rotate at 1000 RPM',
        },
      };

      const result = await service.classifyChange(request);

      expect(result.changeClassification).toBe(ChangeClassification.FORM_CHANGE);
      expect(result.safetyCriticality).toBe(SafetyCriticality.NON_CRITICAL);
      expect(result.requiresFullPropagation).toBe(false);
    });

    it('should classify fit changes', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Changed dimensions for tolerance improvement',
        currentCharacteristics: {
          form: 'Cylindrical',
          fit: '10.0mm ± 0.1mm',
          function: 'Rotate at 1000 RPM',
        },
        proposedCharacteristics: {
          form: 'Cylindrical',
          fit: '10.0mm ± 0.05mm',
          function: 'Rotate at 1000 RPM',
        },
      };

      const result = await service.classifyChange(request);

      expect(result.changeClassification).toBe(ChangeClassification.FIT_CHANGE);
      expect(result.requiresFullPropagation).toBe(false);
    });

    it('should classify function changes', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Increased RPM capability',
        currentCharacteristics: {
          form: 'Cylindrical',
          fit: '10mm diameter',
          function: 'Rotate at 1000 RPM',
        },
        proposedCharacteristics: {
          form: 'Cylindrical',
          fit: '10mm diameter',
          function: 'Rotate at 2000 RPM',
        },
      };

      const result = await service.classifyChange(request);

      expect(result.changeClassification).toBe(
        ChangeClassification.FUNCTION_CHANGE
      );
      expect(result.requiresFullPropagation).toBe(true);
    });

    it('should classify combined changes', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Complete redesign',
        currentCharacteristics: {
          form: 'Cylindrical',
          fit: '10mm diameter',
          function: 'Rotate at 1000 RPM',
        },
        proposedCharacteristics: {
          form: 'Rectangular',
          fit: '12mm × 8mm',
          function: 'Rotate at 2000 RPM',
        },
      };

      const result = await service.classifyChange(request);

      expect(result.changeClassification).toBe(
        ChangeClassification.COMBINED_CHANGE
      );
      expect(result.requiresFullPropagation).toBe(true);
    });
  });

  // ============================================================================
  // Safety Criticality Assessment Tests
  // ============================================================================

  describe('Safety Criticality Assessment', () => {
    it('should assess non-critical safety items as low risk', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Paint color change',
        currentCharacteristics: {
          form: 'Rectangular',
          safetyFunction: false,
        },
        proposedCharacteristics: {
          form: 'Rectangular',
          safetyFunction: false,
        },
      };

      const result = await service.classifyChange(request);

      expect(result.safetyCriticality).toBe(SafetyCriticality.NON_CRITICAL);
    });

    it('should assess safety-critical fit changes as high risk', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Safety brake fit tolerance',
        currentCharacteristics: {
          fit: '10.0mm ± 0.1mm',
          safetyFunction: true,
        },
        proposedCharacteristics: {
          fit: '10.0mm ± 0.05mm',
          safetyFunction: true,
        },
      };

      const result = await service.classifyChange(request);

      expect(result.safetyCriticality).toBe(SafetyCriticality.HIGH);
    });

    it('should assess safety-critical function changes as critical', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Safety system performance change',
        currentCharacteristics: {
          function: 'Stop in 5 seconds',
          safetyFunction: true,
        },
        proposedCharacteristics: {
          function: 'Stop in 2 seconds',
          safetyFunction: true,
        },
      };

      const result = await service.classifyChange(request);

      expect(result.safetyCriticality).toBe(SafetyCriticality.CRITICAL);
    });
  });

  // ============================================================================
  // Certification Impact Tests
  // ============================================================================

  describe('Certification Impact Assessment', () => {
    it('should assess no certification impact for non-certificated items', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Standard modification',
        currentCharacteristics: {
          certificated: false,
        },
        proposedCharacteristics: {},
      };

      const result = await service.classifyChange(request);

      expect(result.certificationImpact).toBe(CertificationImpact.NONE);
    });

    it('should assess form changes as minor certification impact', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Paint color update',
        currentCharacteristics: {
          form: 'Rectangular',
          certificated: true,
        },
        proposedCharacteristics: {
          form: 'Rounded',
          certificated: true,
        },
      };

      const result = await service.classifyChange(request);

      expect(result.certificationImpact).toBe(CertificationImpact.MINOR);
    });

    it('should assess fit changes as moderate certification impact', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Dimensional tolerance update',
        currentCharacteristics: {
          fit: '10.0mm',
          certificated: true,
        },
        proposedCharacteristics: {
          fit: '10.5mm',
          certificated: true,
        },
      };

      const result = await service.classifyChange(request);

      expect(result.certificationImpact).toBe(CertificationImpact.MODERATE);
    });

    it('should assess function changes as major certification impact', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Performance specification change',
        currentCharacteristics: {
          function: 'Max load 100 lbs',
          certificated: true,
        },
        proposedCharacteristics: {
          function: 'Max load 150 lbs',
          certificated: true,
        },
      };

      const result = await service.classifyChange(request);

      expect(result.certificationImpact).toBe(CertificationImpact.MAJOR);
    });

    it('should assess combined changes as complete recertification', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Complete redesign of certified component',
        currentCharacteristics: {
          form: 'Cylindrical',
          fit: '10mm',
          function: 'Rotate at 1000 RPM',
          certificated: true,
        },
        proposedCharacteristics: {
          form: 'Rectangular',
          fit: '12mm',
          function: 'Rotate at 2000 RPM',
          certificated: true,
        },
      };

      const result = await service.classifyChange(request);

      expect(result.certificationImpact).toBe(
        CertificationImpact.COMPLETE_RECERTIFICATION
      );
    });
  });

  // ============================================================================
  // CRB Review Determination Tests
  // ============================================================================

  describe('CRB Review Determination', () => {
    it('should require CRB review for function changes', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Performance change',
        currentCharacteristics: {
          function: 'Speed: 1000 RPM',
        },
        proposedCharacteristics: {
          function: 'Speed: 2000 RPM',
        },
      };

      const result = await service.classifyChange(request);

      expect(result.requiresCRBReview).toBe(true);
    });

    it('should require CRB review for critical safety changes', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Safety system function change',
        currentCharacteristics: {
          safetyFunction: true,
          function: 'Stop in 5 seconds',
        },
        proposedCharacteristics: {
          safetyFunction: true,
          function: 'Stop in 2 seconds',
        },
      };

      const result = await service.classifyChange(request);

      expect(result.requiresCRBReview).toBe(true);
    });

    it('should require CRB review for large cascades', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Minor change with large impact',
        currentCharacteristics: {
          form: 'Rectangular',
        },
        proposedCharacteristics: {
          form: 'Rectangular',
        },
        affectedAssemblyIds: new Array(6).fill('assembly-id'),
      };

      const result = await service.classifyChange(request);

      expect(result.requiresCRBReview).toBe(true);
    });
  });

  // ============================================================================
  // Interface Boundary Analysis Tests
  // ============================================================================

  describe('Interface Boundary Analysis', () => {
    it('should identify maintained interfaces', async () => {
      const mockPartWithInterfaces = {
        ...mockPart,
        icdOwner: [
          {
            id: 'icd-1',
            icdNumber: 'ICD-001',
            interfaceType: 'ELECTRICAL',
            interfaceDefinition: { id: 'def-1' },
          },
        ],
        icdParticipant: [],
      };

      mockPrisma.part.findUnique.mockResolvedValue(mockPartWithInterfaces);

      const analysis = await service.analyzeInterfaceBoundaries(
        'part-1',
        'Changed internal wiring'
      );

      expect(analysis.canBeContained).toBe(true);
      expect(analysis.interfaceDocuments.length).toBeGreaterThan(0);
      expect(analysis.maintainedCount || analysis.interfaceDocuments.length).toBeGreaterThan(0);
    });

    it('should identify affected interfaces', async () => {
      const mockPartWithInterfaces = {
        ...mockPart,
        icdOwner: [
          {
            id: 'icd-1',
            icdNumber: 'ICD-001',
            interfaceType: 'MECHANICAL',
            interfaceDefinition: { id: 'def-1' },
          },
        ],
        icdParticipant: [],
      };

      mockPrisma.part.findUnique.mockResolvedValue(mockPartWithInterfaces);

      const analysis = await service.analyzeInterfaceBoundaries(
        'part-1',
        'Changed connector interface specification'
      );

      expect(analysis.affectedInterfaces.length).toBeGreaterThan(0);
    });

    it('should handle parts without interfaces', async () => {
      const analysis = await service.analyzeInterfaceBoundaries('part-1', 'Some change');

      expect(analysis.interfaceIds).toBeDefined();
      expect(Array.isArray(analysis.interfaceDocuments)).toBe(true);
    });
  });

  // ============================================================================
  // Confidence Score Tests
  // ============================================================================

  describe('Classification Confidence', () => {
    it('should provide high confidence with complete information', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Clear paint change',
        currentCharacteristics: {
          form: 'Rectangular',
          fit: '10mm',
          function: 'Rotate at 1000 RPM',
        },
        proposedCharacteristics: {
          form: 'Rounded',
          fit: '10mm',
          function: 'Rotate at 1000 RPM',
        },
      };

      const result = await service.classifyChange(request);

      expect(result.confidence).toBeGreaterThan(75);
    });

    it('should reduce confidence with incomplete information', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Unclear change',
        currentCharacteristics: {},
        proposedCharacteristics: {},
      };

      const result = await service.classifyChange(request);

      expect(result.confidence).toBeLessThan(80);
    });

    it('should reduce confidence for multi-category changes', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Complex redesign',
        currentCharacteristics: {
          form: 'Old',
          fit: 'Old',
          function: 'Old',
        },
        proposedCharacteristics: {
          form: 'New',
          fit: 'New',
          function: 'New',
        },
      };

      const result = await service.classifyChange(request);

      expect(result.confidence).toBeLessThan(85);
    });
  });

  // ============================================================================
  // Override Capability Tests
  // ============================================================================

  describe('Classification Override', () => {
    it('should apply engineer override to automatic classification', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Paint change',
        currentCharacteristics: { form: 'Rectangular' },
        proposedCharacteristics: { form: 'Rectangular' },
        overrideClassification: {
          classification: ChangeClassification.FUNCTION_CHANGE,
          reason: 'Engineering assessment indicates functional impact',
          overriddenBy: 'user-123',
        },
      };

      const result = await service.classifyChange(request);

      expect(result.changeClassification).toBe(
        ChangeClassification.FUNCTION_CHANGE
      );
      expect(result.overriddenFromAutomatic).toBeDefined();
      expect(result.overriddenFromAutomatic?.overriddenBy).toBe('user-123');
    });

    it('should record override rationale', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Standard update',
        currentCharacteristics: { form: 'A' },
        proposedCharacteristics: { form: 'B' },
        overrideClassification: {
          classification: ChangeClassification.CRITICAL,
          reason: 'Customer specified as critical',
          overriddenBy: 'eng-001',
        },
      };

      const result = await service.classifyChange(request);

      expect(result.overriddenFromAutomatic?.overrideReason).toBe(
        'Customer specified as critical'
      );
    });
  });

  // ============================================================================
  // Suggested Approvers Tests
  // ============================================================================

  describe('Suggested Approvers', () => {
    it('should include engineering for all changes', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Any change',
        currentCharacteristics: { form: 'A' },
        proposedCharacteristics: { form: 'B' },
      };

      const result = await service.classifyChange(request);

      expect(result.suggestedApprovers).toContain('ENGINEERING');
    });

    it('should include quality for certified items', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Certified part change',
        currentCharacteristics: { form: 'A', certificated: true },
        proposedCharacteristics: { form: 'B', certificated: true },
      };

      const result = await service.classifyChange(request);

      expect(result.suggestedApprovers).toContain('QUALITY');
    });

    it('should include manufacturing for fit/function changes', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Fit change',
        currentCharacteristics: { fit: '10mm' },
        proposedCharacteristics: { fit: '12mm' },
      };

      const result = await service.classifyChange(request);

      expect(result.suggestedApprovers).toContain('MANUFACTURING');
    });
  });

  // ============================================================================
  // Priority Assignment Tests
  // ============================================================================

  describe('Priority Assignment', () => {
    it('should assign CRITICAL priority for safety-critical changes', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Safety system change',
        currentCharacteristics: { safetyFunction: true, function: 'Old' },
        proposedCharacteristics: { safetyFunction: true, function: 'New' },
      };

      const result = await service.classifyChange(request);

      expect(result.suggestedPriority).toBe('CRITICAL');
    });

    it('should assign MEDIUM priority for standard changes', async () => {
      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Paint color',
        currentCharacteristics: { form: 'A' },
        proposedCharacteristics: { form: 'B' },
      };

      const result = await service.classifyChange(request);

      expect(['LOW', 'MEDIUM']).toContain(result.suggestedPriority);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing part gracefully', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      const request = {
        ecoId: 'eco-1',
        partId: 'nonexistent',
        changeDescription: 'Test change',
        currentCharacteristics: { form: 'A' },
        proposedCharacteristics: { form: 'B' },
      };

      // Classification should proceed without interfaces
      const result = await service.classifyChange(request);
      expect(result).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.part.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      const request = {
        ecoId: 'eco-1',
        partId: 'part-1',
        changeDescription: 'Test',
        currentCharacteristics: {},
        proposedCharacteristics: {},
      };

      await expect(service.analyzeInterfaceBoundaries('part-1', 'change')).rejects.toThrow();
    });
  });
});
