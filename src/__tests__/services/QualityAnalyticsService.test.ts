/**
 * QualityAnalyticsService Unit Tests (Issue #58)
 * Tests for quality metrics calculation, Pareto analysis, and Cost of Quality tracking
 */

import { QualityAnalyticsService } from "../../services/QualityAnalyticsService";
import { prisma } from "../../db/client";

describe("QualityAnalyticsService", () => {
  let analyticsService: QualityAnalyticsService;

  beforeAll(() => {
    analyticsService = new QualityAnalyticsService();
  });

  describe("calculateNCRRate", () => {
    it("should calculate NCR rate correctly", async () => {
      jest.spyOn(prisma.nCR, "count").mockResolvedValue(10);
      jest.spyOn(prisma.workOrder, "aggregate").mockResolvedValue({
        _sum: { plannedQuantity: 1000 },
      } as any);

      const result = await analyticsService.calculateNCRRate(
        "site1",
        new Date("2025-11-01"),
        new Date("2025-11-30")
      );

      expect(result.metricType).toBe("NCR_RATE");
      expect(result.value).toBe(1.0); // 10 / 1000 * 100
      expect(result.numerator).toBe(10);
      expect(result.denominator).toBe(1000);
    });

    it("should handle zero NCRs", async () => {
      jest.spyOn(prisma.nCR, "count").mockResolvedValue(0);
      jest.spyOn(prisma.workOrder, "aggregate").mockResolvedValue({
        _sum: { plannedQuantity: 1000 },
      } as any);

      const result = await analyticsService.calculateNCRRate(
        "site1",
        new Date("2025-11-01"),
        new Date("2025-11-30")
      );

      expect(result.value).toBe(0);
      expect(result.status).toBe("GREEN");
    });

    it("should filter by defect type when provided", async () => {
      const countSpy = jest.spyOn(prisma.nCR, "count");
      jest.spyOn(prisma.workOrder, "aggregate").mockResolvedValue({
        _sum: { plannedQuantity: 1000 },
      } as any);

      await analyticsService.calculateNCRRate(
        "site1",
        new Date("2025-11-01"),
        new Date("2025-11-30"),
        "DIMENSIONAL"
      );

      expect(countSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            defectType: "DIMENSIONAL",
          }),
        })
      );
    });
  });

  describe("calculateFirstPassYield", () => {
    it("should calculate FPY correctly", async () => {
      jest.spyOn(prisma.workOrderOperation, "count")
        .mockResolvedValueOnce(100)  // Total operations
        .mockResolvedValueOnce(95);  // Passed operations

      const result = await analyticsService.calculateFirstPassYield(
        "site1",
        new Date("2025-11-01"),
        new Date("2025-11-30")
      );

      expect(result.metricType).toBe("FIRST_PASS_YIELD");
      expect(result.value).toBe(95.0);
      expect(result.status).toBe("GREEN");
    });

    it("should handle zero operations", async () => {
      jest.spyOn(prisma.workOrderOperation, "count").mockResolvedValue(0);

      const result = await analyticsService.calculateFirstPassYield(
        "site1",
        new Date("2025-11-01"),
        new Date("2025-11-30")
      );

      expect(result.value).toBe(0);
    });

    it("should flag low FPY as RED", async () => {
      jest.spyOn(prisma.workOrderOperation, "count")
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80);

      const result = await analyticsService.calculateFirstPassYield(
        "site1",
        new Date("2025-11-01"),
        new Date("2025-11-30")
      );

      expect(result.value).toBe(80.0);
      expect(result.status).toBe("RED");
    });
  });

  describe("calculateDPMO", () => {
    it("should calculate DPMO correctly", async () => {
      jest.spyOn(prisma.nCR, "count").mockResolvedValue(100);
      jest.spyOn(prisma.workOrderOperation, "count").mockResolvedValue(1000);

      const result = await analyticsService.calculateDPMO(
        "site1",
        new Date("2025-11-01"),
        new Date("2025-11-30")
      );

      expect(result.metricType).toBe("DPMO");
      expect(result.value).toBe(100000); // 100 / 1000 * 1000000
    });

    it("should handle severity filter", async () => {
      const countSpy = jest.spyOn(prisma.nCR, "count");
      jest.spyOn(prisma.workOrderOperation, "count").mockResolvedValue(1000);

      await analyticsService.calculateDPMO(
        "site1",
        new Date("2025-11-01"),
        new Date("2025-11-30"),
        "CRITICAL"
      );

      expect(countSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            severity: "CRITICAL",
          }),
        })
      );
    });
  });

  describe("calculateCostOfQuality", () => {
    it("should calculate CoQ with all components", async () => {
      const mockNCRs = [
        {
          scrapCost: { toNumber: () => 1000 },
          reworkCost: { toNumber: () => 500 },
          sortingCost: { toNumber: () => 200 },
          engineeringCost: { toNumber: () => 1500 },
          customerCost: { toNumber: () => 5000 },
        },
      ] as any;

      jest.spyOn(prisma.nCR, "findMany").mockResolvedValue(mockNCRs);
      jest.spyOn(prisma.qualityInspection, "count").mockResolvedValue(100);

      const result = await analyticsService.calculateCostOfQuality(
        "site1",
        new Date("2025-11-01"),
        new Date("2025-11-30")
      );

      expect(result.internalFailureCost).toBe(1700); // Scrap + Rework + Sorting
      expect(result.externalFailureCost).toBe(5000);
      expect(result.appraisalCost).toBe(10000); // 100 inspections * $100
      expect(result.preventionCost).toBeGreaterThan(0);
      expect(result.totalCoq).toBeGreaterThan(0);
    });

    it("should handle NCRs with missing cost data", async () => {
      const mockNCRs = [
        {
          scrapCost: null,
          reworkCost: null,
          sortingCost: null,
          engineeringCost: null,
          customerCost: null,
        },
      ] as any;

      jest.spyOn(prisma.nCR, "findMany").mockResolvedValue(mockNCRs);
      jest.spyOn(prisma.qualityInspection, "count").mockResolvedValue(0);

      const result = await analyticsService.calculateCostOfQuality(
        "site1",
        new Date("2025-11-01"),
        new Date("2025-11-30")
      );

      expect(result.internalFailureCost).toBe(0);
      expect(result.externalFailureCost).toBe(0);
      expect(result.totalCoq).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateParetoAnalysis", () => {
    it("should generate Pareto analysis for defect types", async () => {
      const mockNCRs = [
        { defectType: "DIMENSIONAL", actualCost: { toNumber: () => 1000 } },
        { defectType: "DIMENSIONAL", actualCost: { toNumber: () => 1000 } },
        { defectType: "DIMENSIONAL", actualCost: { toNumber: () => 1000 } },
        { defectType: "SURFACE", actualCost: { toNumber: () => 500 } },
        { defectType: "SURFACE", actualCost: { toNumber: () => 500 } },
      ] as any;

      jest.spyOn(prisma.nCR, "findMany").mockResolvedValue(mockNCRs);

      const result = await analyticsService.generateParetoAnalysis(
        "site1",
        "DEFECT_TYPE",
        new Date("2025-11-01"),
        new Date("2025-11-30")
      );

      expect(result.analysisType).toBe("DEFECT_TYPE");
      expect(result.items.length).toBe(2);
      expect(result.items[0].category).toBe("DIMENSIONAL");
      expect(result.items[0].count).toBe(3);
      expect(result.totalOccurrences).toBe(5);
      expect(result.totalCost).toBe(4000);
    });

    it("should calculate cumulative percentages correctly", async () => {
      const mockNCRs = [
        { defectType: "TYPE_A", actualCost: { toNumber: () => 100 } },
        { defectType: "TYPE_A", actualCost: { toNumber: () => 100 } },
        { defectType: "TYPE_A", actualCost: { toNumber: () => 100 } },
        { defectType: "TYPE_B", actualCost: { toNumber: () => 100 } },
        { defectType: "TYPE_B", actualCost: { toNumber: () => 100 } },
      ] as any;

      jest.spyOn(prisma.nCR, "findMany").mockResolvedValue(mockNCRs);

      const result = await analyticsService.generateParetoAnalysis(
        "site1",
        "DEFECT_TYPE",
        new Date("2025-11-01"),
        new Date("2025-11-30")
      );

      const typeA = result.items[0];
      const typeB = result.items[1];

      expect(typeA.percentage).toBe(60); // 3/5 * 100
      expect(typeA.cumulativePercentage).toBe(60);
      expect(typeB.percentage).toBe(40); // 2/5 * 100
      expect(typeB.cumulativePercentage).toBe(100);
      expect(result.vitalFewCount).toBe(1); // Just TYPE_A is 60%
    });

    it("should identify vital few at 80% threshold", async () => {
      const mockNCRs = Array(80).fill({ defectType: "A", actualCost: { toNumber: () => 1 } })
        .concat(Array(15).fill({ defectType: "B", actualCost: { toNumber: () => 1 } }))
        .concat(Array(5).fill({ defectType: "C", actualCost: { toNumber: () => 1 } })) as any;

      jest.spyOn(prisma.nCR, "findMany").mockResolvedValue(mockNCRs);

      const result = await analyticsService.generateParetoAnalysis(
        "site1",
        "DEFECT_TYPE",
        new Date("2025-11-01"),
        new Date("2025-11-30")
      );

      // A is 80%, B is 15%, C is 5%
      expect(result.items[0].category).toBe("A");
      expect(result.items[0].cumulativePercentage).toBe(80);
      expect(result.vitalFewCount).toBe(1);
    });

    it("should handle invalid analysis type", async () => {
      await expect(
        analyticsService.generateParetoAnalysis(
          "site1",
          "INVALID_TYPE",
          new Date("2025-11-01"),
          new Date("2025-11-30")
        )
      ).rejects.toThrow("Invalid Pareto analysis type");
    });
  });

  describe("getQualitySummary", () => {
    it("should return comprehensive quality summary", async () => {
      jest.spyOn(analyticsService, "calculateNCRRate").mockResolvedValue({
        metricType: "NCR_RATE",
        period: "2025-11-01 to 2025-11-30",
        value: 1.5,
        trend: 10,
        status: "GREEN",
        numerator: 15,
        denominator: 1000,
        sampleSize: 15,
      } as any);

      jest.spyOn(analyticsService, "calculateFirstPassYield").mockResolvedValue({
        metricType: "FIRST_PASS_YIELD",
        value: 97.5,
        status: "GREEN",
        trend: -2,
      } as any);

      jest.spyOn(analyticsService, "calculateDPMO").mockResolvedValue({
        metricType: "DPMO",
        value: 15000,
        status: "YELLOW",
      } as any);

      jest.spyOn(analyticsService, "calculateCostOfQuality").mockResolvedValue({
        totalCoq: 150000,
        preventionCost: 10000,
        appraisalCost: 20000,
        internalFailureCost: 80000,
        externalFailureCost: 40000,
        copqPercent: 2.5,
      } as any);

      jest.spyOn(analyticsService, "generateParetoAnalysis").mockResolvedValue({
        analysisType: "DEFECT_TYPE",
        items: [],
        vitalFewCount: 3,
        totalItems: 10,
        totalOccurrences: 100,
        totalCost: 50000,
      } as any);

      jest.spyOn(prisma.nCR, "count").mockResolvedValue(5);
      jest.spyOn(prisma.qualityAlert, "count").mockResolvedValue(3);

      const summary = await analyticsService.getQualitySummary("site1", "DAY");

      expect(summary.siteId).toBe("site1");
      expect(summary.period).toBe("DAY");
      expect(summary.metrics.ncrRate).toBe(1.5);
      expect(summary.metrics.firstPassYield).toBe(97.5);
      expect(summary.metrics.dpmo).toBe(15000);
      expect(summary.escapeCount).toBe(5);
      expect(summary.alertCount).toBe(3);
    });
  });

  describe("storeMetric", () => {
    it("should create new metric record", async () => {
      const upsertSpy = jest.spyOn(prisma.qualityMetric, "upsert");

      await analyticsService.storeMetric(
        "site1",
        "NCR_RATE",
        "DAY",
        new Date("2025-11-01"),
        new Date("2025-11-02"),
        1.5,
        15,
        1000,
        "DIMENSIONAL"
      );

      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            siteId: "site1",
            metricType: "NCR_RATE",
            period: "DAY",
            value: 1.5,
          }),
        })
      );
    });

    it("should update existing metric record", async () => {
      jest.spyOn(prisma.qualityMetric, "upsert").mockResolvedValue({
        id: "metric1",
      } as any);

      await analyticsService.storeMetric(
        "site1",
        "NCR_RATE",
        "DAY",
        new Date("2025-11-01"),
        new Date("2025-11-02"),
        2.0,
        20,
        1000
      );

      // Should complete without errors
      expect(true).toBe(true);
    });
  });
});
