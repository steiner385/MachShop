/**
 * QualityEnforcementService Unit Tests (Issue #44)
 * Tests for configurable quality enforcement with STRICT/RECOMMENDED/OPTIONAL/EXTERNAL modes
 */

import { QualityEnforcementService } from "../../services/QualityEnforcementService";
import { WorkflowConfigurationService } from "../../services/WorkflowConfigurationService";
import { prisma } from "../../db/client";

describe("QualityEnforcementService", () => {
  let enforcementService: QualityEnforcementService;
  let configService: WorkflowConfigurationService;

  beforeAll(() => {
    configService = new WorkflowConfigurationService();
    enforcementService = new QualityEnforcementService(configService);
  });

  describe("isQualityInspectionRequired", () => {
    it("should require quality inspection in STRICT mode", async () => {
      jest
        .spyOn(enforcementService, "getEffectiveQualityConfiguration")
        .mockResolvedValue({
          mode: "STRICT",
          enforceInspectionPass: true,
          requireElectronicSig: false,
          acceptExternalQuality: false,
          qualityRequired: true,
          source: { site: {} },
        } as any);

      const requirement = await enforcementService.isQualityInspectionRequired(
        "op123"
      );

      expect(requirement.required).toBe(true);
      expect(requirement.mode).toBe("STRICT");
      expect(requirement.reason).toContain("required");
    });

    it("should not require quality inspection in OPTIONAL mode", async () => {
      jest
        .spyOn(enforcementService, "getEffectiveQualityConfiguration")
        .mockResolvedValue({
          mode: "OPTIONAL",
          enforceInspectionPass: false,
          requireElectronicSig: false,
          acceptExternalQuality: false,
          qualityRequired: true,
          source: { site: {} },
        } as any);

      const requirement = await enforcementService.isQualityInspectionRequired(
        "op123"
      );

      expect(requirement.required).toBe(false);
      expect(requirement.mode).toBe("OPTIONAL");
    });

    it("should not require quality inspection in EXTERNAL mode", async () => {
      jest
        .spyOn(enforcementService, "getEffectiveQualityConfiguration")
        .mockResolvedValue({
          mode: "EXTERNAL",
          enforceInspectionPass: false,
          requireElectronicSig: false,
          acceptExternalQuality: true,
          qualityRequired: true,
          source: { site: {} },
        } as any);

      const requirement = await enforcementService.isQualityInspectionRequired(
        "op123"
      );

      expect(requirement.required).toBe(false);
      expect(requirement.mode).toBe("EXTERNAL");
      expect(requirement.reason).toContain("external");
    });

    it("should respect operation-level quality exemption", async () => {
      jest
        .spyOn(enforcementService, "getEffectiveQualityConfiguration")
        .mockResolvedValue({
          mode: "STRICT",
          enforceInspectionPass: true,
          requireElectronicSig: false,
          acceptExternalQuality: false,
          qualityRequired: false, // Operation exempted
          source: { site: {}, operation: {} },
        } as any);

      const requirement = await enforcementService.isQualityInspectionRequired(
        "op123"
      );

      expect(requirement.required).toBe(false);
      expect(requirement.source).toBe("OPERATION");
    });
  });

  describe("canCompleteWithoutPassingInspection", () => {
    it("should allow completion in STRICT mode when inspection PASS", async () => {
      jest
        .spyOn(enforcementService, "getEffectiveQualityConfiguration")
        .mockResolvedValue({
          mode: "STRICT",
          enforceInspectionPass: true,
          requireElectronicSig: false,
          acceptExternalQuality: false,
          qualityRequired: true,
          source: { site: {} },
        } as any);

      jest.spyOn(prisma.qualityInspection, "findFirst").mockResolvedValue({
        id: "insp123",
        result: "PASS",
        status: "COMPLETED",
        completedAt: new Date(),
      } as any);

      const decision =
        await enforcementService.canCompleteWithoutPassingInspection("op123");

      expect(decision.allowed).toBe(true);
      expect(decision.configMode).toBe("STRICT");
    });

    it("should reject completion in STRICT mode when inspection FAIL", async () => {
      jest
        .spyOn(enforcementService, "getEffectiveQualityConfiguration")
        .mockResolvedValue({
          mode: "STRICT",
          enforceInspectionPass: true,
          requireElectronicSig: false,
          acceptExternalQuality: false,
          qualityRequired: true,
          source: { site: {} },
        } as any);

      jest.spyOn(prisma.qualityInspection, "findFirst").mockResolvedValue({
        id: "insp123",
        result: "FAIL",
        status: "COMPLETED",
        completedAt: new Date(),
      } as any);

      const decision =
        await enforcementService.canCompleteWithoutPassingInspection("op123");

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("failed");
      expect(decision.configMode).toBe("STRICT");
    });

    it("should allow completion in RECOMMENDED mode with warnings when inspection FAIL", async () => {
      jest
        .spyOn(enforcementService, "getEffectiveQualityConfiguration")
        .mockResolvedValue({
          mode: "RECOMMENDED",
          enforceInspectionPass: false,
          requireElectronicSig: false,
          acceptExternalQuality: false,
          qualityRequired: true,
          source: { site: {} },
        } as any);

      jest.spyOn(prisma.qualityInspection, "findFirst").mockResolvedValue({
        id: "insp123",
        result: "FAIL",
        status: "COMPLETED",
        completedAt: new Date(),
      } as any);

      const decision =
        await enforcementService.canCompleteWithoutPassingInspection("op123");

      expect(decision.allowed).toBe(true);
      expect(decision.configMode).toBe("RECOMMENDED");
      expect(decision.warnings.length).toBeGreaterThan(0);
      expect(decision.bypassesApplied).toContain("quality_pass_requirement");
    });

    it("should reject completion in STRICT mode with no inspection", async () => {
      jest
        .spyOn(enforcementService, "getEffectiveQualityConfiguration")
        .mockResolvedValue({
          mode: "STRICT",
          enforceInspectionPass: true,
          requireElectronicSig: false,
          acceptExternalQuality: false,
          qualityRequired: true,
          source: { site: {} },
        } as any);

      jest.spyOn(prisma.qualityInspection, "findFirst").mockResolvedValue(null);

      const decision =
        await enforcementService.canCompleteWithoutPassingInspection("op123");

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("not performed");
    });

    it("should allow completion in OPTIONAL mode with no inspection", async () => {
      jest
        .spyOn(enforcementService, "getEffectiveQualityConfiguration")
        .mockResolvedValue({
          mode: "OPTIONAL",
          enforceInspectionPass: false,
          requireElectronicSig: false,
          acceptExternalQuality: false,
          qualityRequired: true,
          source: { site: {} },
        } as any);

      jest.spyOn(prisma.qualityInspection, "findFirst").mockResolvedValue(null);

      const decision =
        await enforcementService.canCompleteWithoutPassingInspection("op123");

      expect(decision.allowed).toBe(true);
      expect(decision.configMode).toBe("OPTIONAL");
    });
  });

  describe("validateNCRDisposition", () => {
    it("should allow valid disposition per rules", async () => {
      jest.spyOn(prisma.nCR, "findUnique").mockResolvedValue({
        id: "ncr123",
        severity: "MINOR",
        siteId: "site1",
      } as any);

      jest
        .spyOn(prisma.nCRDispositionRule, "findMany")
        .mockResolvedValue([
          {
            severity: "MINOR",
            allowedDisposition: ["USE_AS_IS", "REWORK"],
            requiresApproval: false,
          },
        ] as any);

      const validation = await enforcementService.validateNCRDisposition(
        "ncr123",
        "USE_AS_IS"
      );

      expect(validation.valid).toBe(true);
      expect(validation.requiresApproval).toBe(false);
    });

    it("should reject invalid disposition per rules", async () => {
      jest.spyOn(prisma.nCR, "findUnique").mockResolvedValue({
        id: "ncr123",
        severity: "CRITICAL",
        siteId: "site1",
      } as any);

      jest
        .spyOn(prisma.nCRDispositionRule, "findMany")
        .mockResolvedValue([
          {
            severity: "CRITICAL",
            allowedDisposition: ["REWORK", "SCRAP"], // USE_AS_IS NOT allowed
            requiresApproval: true,
          },
        ] as any);

      const validation = await enforcementService.validateNCRDisposition(
        "ncr123",
        "USE_AS_IS"
      );

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain("not allowed");
    });

    it("should enforce default rule: critical NCRs cannot use USE_AS_IS", async () => {
      jest.spyOn(prisma.nCR, "findUnique").mockResolvedValue({
        id: "ncr123",
        severity: "CRITICAL",
        siteId: "site1",
      } as any);

      jest.spyOn(prisma.nCRDispositionRule, "findMany").mockResolvedValue([]);

      const validation = await enforcementService.validateNCRDisposition(
        "ncr123",
        "USE_AS_IS"
      );

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain("Critical");
    });

    it("should require approval when specified in rules", async () => {
      jest.spyOn(prisma.nCR, "findUnique").mockResolvedValue({
        id: "ncr123",
        severity: "MAJOR",
        siteId: "site1",
      } as any);

      jest
        .spyOn(prisma.nCRDispositionRule, "findMany")
        .mockResolvedValue([
          {
            severity: "MAJOR",
            allowedDisposition: ["REWORK"],
            requiresApproval: true,
            approvalLevel: "QUALITY_MANAGER",
          },
        ] as any);

      const validation = await enforcementService.validateNCRDisposition(
        "ncr123",
        "REWORK"
      );

      expect(validation.valid).toBe(true);
      expect(validation.requiresApproval).toBe(true);
      expect(validation.approvalLevel).toBe("QUALITY_MANAGER");
    });
  });

  describe("isElectronicSignatureRequired", () => {
    it("should require electronic signature when configured", async () => {
      jest
        .spyOn(prisma.electronicSignatureRequirement, "findFirst")
        .mockResolvedValue({
          requiresSignature: true,
          signatureLevel: "QUALITY_MANAGER",
        } as any);

      const requirement = await enforcementService.isElectronicSignatureRequired(
        "QUALITY_INSPECTION",
        "site1"
      );

      expect(requirement.required).toBe(true);
      expect(requirement.signatureLevel).toBe("QUALITY_MANAGER");
    });

    it("should not require electronic signature when not configured", async () => {
      jest
        .spyOn(prisma.electronicSignatureRequirement, "findFirst")
        .mockResolvedValue(null);

      const requirement = await enforcementService.isElectronicSignatureRequired(
        "OPERATION_COMPLETION",
        "site1"
      );

      expect(requirement.required).toBe(false);
    });

    it("should use global rule when site-specific not configured", async () => {
      jest
        .spyOn(prisma.electronicSignatureRequirement, "findFirst")
        .mockResolvedValue({
          requiresSignature: true,
          signatureLevel: "SUPERVISOR",
          siteId: null, // Global rule
        } as any);

      const requirement = await enforcementService.isElectronicSignatureRequired(
        "NCR_DISPOSITION",
        "site1"
      );

      expect(requirement.required).toBe(true);
      expect(requirement.signatureLevel).toBe("SUPERVISOR");
    });
  });

  describe("recordQualityEnforcementAction", () => {
    it("should record enforcement action in audit trail", async () => {
      const createSpy = jest
        .spyOn(prisma.workflowEnforcementAudit, "create")
        .mockResolvedValue({
          id: "audit123",
        } as any);

      const decision = {
        allowed: true,
        warnings: [],
        configMode: "STRICT" as any,
        bypassesApplied: [],
      };

      await enforcementService.recordQualityEnforcementAction(
        "wo123",
        "op123",
        "INSPECTION_PASSED",
        decision,
        "user123"
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workOrderId: "wo123",
            operationId: "op123",
            action: "QUALITY_INSPECTION_PASSED",
            enforcementMode: "STRICT",
            userId: "user123",
          }),
        })
      );
    });
  });
});
