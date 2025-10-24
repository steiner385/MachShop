import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ParameterLimitsService } from '../../services/ParameterLimitsService';
import { ParameterLimits } from '@prisma/client';

// Mock PrismaClient
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');

  const mockPrisma = {
    parameterLimits: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return {
    ...actual,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

import { PrismaClient } from '@prisma/client';

describe('ParameterLimitsService', () => {
  let limitsService: ParameterLimitsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    limitsService = new ParameterLimitsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== LIMIT HIERARCHY VALIDATION ====================

  describe('validateLimitHierarchy', () => {
    it('should accept valid limit hierarchy', () => {
      const limits = {
        engineeringMin: 0,
        lowLowAlarm: 10,
        lowAlarm: 20,
        operatingMin: 30,
        LSL: 40,
        nominalValue: 50,
        USL: 60,
        operatingMax: 70,
        highAlarm: 80,
        highHighAlarm: 90,
        engineeringMax: 100,
      };

      const result = limitsService.validateLimitHierarchy(limits);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept partial limits with nulls', () => {
      const limits = {
        engineeringMin: null,
        lowLowAlarm: null,
        lowAlarm: 20,
        operatingMin: 30,
        LSL: null,
        nominalValue: 50,
        USL: null,
        operatingMax: 70,
        highAlarm: 80,
        highHighAlarm: null,
        engineeringMax: null,
      };

      const result = limitsService.validateLimitHierarchy(limits);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject when engineering min > engineering max', () => {
      const limits = {
        engineeringMin: 100,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: null,
        LSL: null,
        nominalValue: null,
        USL: null,
        operatingMax: null,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: 50,
      };

      const result = limitsService.validateLimitHierarchy(limits);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Engineering Min');
      expect(result.errors[0]).toContain('Engineering Max');
    });

    it('should reject when operating min > operating max', () => {
      const limits = {
        engineeringMin: null,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: 70,
        LSL: null,
        nominalValue: null,
        USL: null,
        operatingMax: 30,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: null,
      };

      const result = limitsService.validateLimitHierarchy(limits);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Operating Min');
      expect(result.errors[0]).toContain('Operating Max');
    });

    it('should reject when LSL > USL', () => {
      const limits = {
        engineeringMin: null,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: null,
        LSL: 60,
        nominalValue: null,
        USL: 40,
        operatingMax: null,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: null,
      };

      const result = limitsService.validateLimitHierarchy(limits);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('LSL');
      expect(result.errors[0]).toContain('USL');
    });

    it('should reject when nominal > USL', () => {
      const limits = {
        engineeringMin: null,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: null,
        LSL: null,
        nominalValue: 80,
        USL: 60,
        operatingMax: null,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: null,
      };

      const result = limitsService.validateLimitHierarchy(limits);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Nominal');
      expect(result.errors[0]).toContain('USL');
    });

    it('should detect multiple hierarchy violations', () => {
      const limits = {
        engineeringMin: 50,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: 40,
        LSL: 60,
        nominalValue: 50,
        USL: 55,
        operatingMax: null,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: null,
      };

      const result = limitsService.validateLimitHierarchy(limits);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept when all limits are null', () => {
      const limits = {
        engineeringMin: null,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: null,
        LSL: null,
        nominalValue: null,
        USL: null,
        operatingMax: null,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: null,
      };

      const result = limitsService.validateLimitHierarchy(limits);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ==================== VALUE EVALUATION ====================

  describe('evaluateValue', () => {
    const fullLimits: ParameterLimits = {
      id: '1',
      parameterId: 'param1',
      engineeringMin: 0,
      lowLowAlarm: 10,
      lowAlarm: 20,
      operatingMin: 30,
      LSL: 40,
      nominalValue: 50,
      USL: 60,
      operatingMax: 70,
      highAlarm: 80,
      highHighAlarm: 90,
      engineeringMax: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return OK for value within all limits', () => {
      const result = limitsService.evaluateValue(50, fullLimits);
      expect(result.severity).toBe('OK');
      expect(result.type).toBe('IN_SPEC');
    });

    it('should return CRITICAL for value above engineering max', () => {
      const result = limitsService.evaluateValue(110, fullLimits);
      expect(result.severity).toBe('CRITICAL');
      expect(result.type).toBe('ENGINEERING_HIGH');
      expect(result.message).toContain('equipment damage risk');
      expect(result.limit).toBe(100);
    });

    it('should return CRITICAL for value below engineering min', () => {
      const result = limitsService.evaluateValue(-5, fullLimits);
      expect(result.severity).toBe('CRITICAL');
      expect(result.type).toBe('ENGINEERING_LOW');
      expect(result.message).toContain('equipment damage risk');
      expect(result.limit).toBe(0);
    });

    it('should return CRITICAL for high-high alarm', () => {
      const result = limitsService.evaluateValue(95, fullLimits);
      expect(result.severity).toBe('CRITICAL');
      expect(result.type).toBe('ALARM_HIGH_HIGH');
      expect(result.message).toContain('immediate action required');
      expect(result.limit).toBe(90);
    });

    it('should return CRITICAL for low-low alarm', () => {
      const result = limitsService.evaluateValue(5, fullLimits);
      expect(result.severity).toBe('CRITICAL');
      expect(result.type).toBe('ALARM_LOW_LOW');
      expect(result.message).toContain('immediate action required');
      expect(result.limit).toBe(10);
    });

    it('should return WARNING for high alarm', () => {
      const result = limitsService.evaluateValue(85, fullLimits);
      expect(result.severity).toBe('WARNING');
      expect(result.type).toBe('ALARM_HIGH');
      expect(result.message).toContain('monitor closely');
      expect(result.limit).toBe(80);
    });

    it('should return WARNING for low alarm', () => {
      const result = limitsService.evaluateValue(15, fullLimits);
      expect(result.severity).toBe('WARNING');
      expect(result.type).toBe('ALARM_LOW');
      expect(result.message).toContain('monitor closely');
      expect(result.limit).toBe(20);
    });

    it('should return WARNING for USL violation', () => {
      const result = limitsService.evaluateValue(65, fullLimits);
      expect(result.severity).toBe('WARNING');
      expect(result.type).toBe('SPEC_HIGH');
      expect(result.message).toContain('out of spec');
      expect(result.limit).toBe(60);
    });

    it('should return WARNING for LSL violation', () => {
      const result = limitsService.evaluateValue(35, fullLimits);
      expect(result.severity).toBe('WARNING');
      expect(result.type).toBe('SPEC_LOW');
      expect(result.message).toContain('out of spec');
      expect(result.limit).toBe(40);
    });

    it('should return INFO for value above operating max', () => {
      const result = limitsService.evaluateValue(75, fullLimits);
      expect(result.severity).toBe('INFO');
      expect(result.type).toBe('OPERATING_HIGH');
      expect(result.message).toContain('normal operating range');
      expect(result.limit).toBe(70);
    });

    it('should return INFO for value below operating min', () => {
      const result = limitsService.evaluateValue(25, fullLimits);
      expect(result.severity).toBe('INFO');
      expect(result.type).toBe('OPERATING_LOW');
      expect(result.message).toContain('normal operating range');
      expect(result.limit).toBe(30);
    });

    it('should handle null limits gracefully', () => {
      const partialLimits: ParameterLimits = {
        id: '1',
        parameterId: 'param1',
        engineeringMin: null,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: null,
        LSL: 40,
        nominalValue: 50,
        USL: 60,
        operatingMax: null,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = limitsService.evaluateValue(55, partialLimits);
      expect(result.severity).toBe('OK');
    });

    it('should prioritize most severe violation', () => {
      // Value exceeds all upper limits - should return engineering (CRITICAL)
      const result = limitsService.evaluateValue(110, fullLimits);
      expect(result.severity).toBe('CRITICAL');
      expect(result.type).toBe('ENGINEERING_HIGH');
    });
  });

  // ==================== CRUD OPERATIONS ====================

  describe('upsertLimits', () => {
    it('should create limits with valid hierarchy', async () => {
      const validLimits = {
        engineeringMin: 0,
        lowLowAlarm: 10,
        lowAlarm: 20,
        operatingMin: 30,
        LSL: 40,
        nominalValue: 50,
        USL: 60,
        operatingMax: 70,
        highAlarm: 80,
        highHighAlarm: 90,
        engineeringMax: 100,
      };

      const mockResult: ParameterLimits = {
        id: '1',
        parameterId: 'param1',
        ...validLimits,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.parameterLimits.upsert).mockResolvedValue(mockResult);

      const result = await limitsService.upsertLimits('param1', validLimits);

      expect(result).toEqual(mockResult);
      expect(mockPrisma.parameterLimits.upsert).toHaveBeenCalledWith({
        where: { parameterId: 'param1' },
        create: {
          parameterId: 'param1',
          ...validLimits,
        },
        update: validLimits,
      });
    });

    it('should reject limits with invalid hierarchy', async () => {
      const invalidLimits = {
        engineeringMin: 100,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: null,
        LSL: null,
        nominalValue: null,
        USL: null,
        operatingMax: null,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: 50,
      };

      await expect(
        limitsService.upsertLimits('param1', invalidLimits)
      ).rejects.toThrow('Invalid limit hierarchy');

      expect(mockPrisma.parameterLimits.upsert).not.toHaveBeenCalled();
    });

    it('should update existing limits', async () => {
      const updatedLimits = {
        engineeringMin: 5,
        lowLowAlarm: 15,
        lowAlarm: 25,
        operatingMin: 35,
        LSL: 45,
        nominalValue: 55,
        USL: 65,
        operatingMax: 75,
        highAlarm: 85,
        highHighAlarm: 95,
        engineeringMax: 105,
      };

      const mockResult: ParameterLimits = {
        id: '1',
        parameterId: 'param1',
        ...updatedLimits,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.parameterLimits.upsert).mockResolvedValue(mockResult);

      const result = await limitsService.upsertLimits('param1', updatedLimits);

      expect(result).toEqual(mockResult);
    });
  });

  describe('getLimits', () => {
    it('should retrieve limits for parameter', async () => {
      const mockLimits: ParameterLimits = {
        id: '1',
        parameterId: 'param1',
        engineeringMin: 0,
        lowLowAlarm: 10,
        lowAlarm: 20,
        operatingMin: 30,
        LSL: 40,
        nominalValue: 50,
        USL: 60,
        operatingMax: 70,
        highAlarm: 80,
        highHighAlarm: 90,
        engineeringMax: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.parameterLimits.findUnique).mockResolvedValue(mockLimits as any);

      const result = await limitsService.getLimits('param1');

      expect(result).toEqual(mockLimits);
      expect(mockPrisma.parameterLimits.findUnique).toHaveBeenCalledWith({
        where: { parameterId: 'param1' },
        include: { parameter: true },
      });
    });

    it('should return null for non-existent parameter', async () => {
      vi.mocked(mockPrisma.parameterLimits.findUnique).mockResolvedValue(null);

      const result = await limitsService.getLimits('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteLimits', () => {
    it('should delete limits for parameter', async () => {
      vi.mocked(mockPrisma.parameterLimits.delete).mockResolvedValue({} as any);

      await limitsService.deleteLimits('param1');

      expect(mockPrisma.parameterLimits.delete).toHaveBeenCalledWith({
        where: { parameterId: 'param1' },
      });
    });
  });

  describe('getAllParametersWithLimits', () => {
    it('should retrieve all parameters with limits', async () => {
      const mockLimits: ParameterLimits[] = [
        {
          id: '1',
          parameterId: 'param1',
          engineeringMin: 0,
          lowLowAlarm: null,
          lowAlarm: null,
          operatingMin: 30,
          LSL: 40,
          nominalValue: 50,
          USL: 60,
          operatingMax: 70,
          highAlarm: null,
          highHighAlarm: null,
          engineeringMax: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          parameterId: 'param2',
          engineeringMin: 10,
          lowLowAlarm: 20,
          lowAlarm: 30,
          operatingMin: 40,
          LSL: 50,
          nominalValue: 60,
          USL: 70,
          operatingMax: 80,
          highAlarm: 90,
          highHighAlarm: 95,
          engineeringMax: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockPrisma.parameterLimits.findMany).mockResolvedValue(mockLimits as any);

      const result = await limitsService.getAllParametersWithLimits();

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockLimits);
      expect(mockPrisma.parameterLimits.findMany).toHaveBeenCalledWith({
        include: { parameter: true },
      });
    });

    it('should return empty array when no limits exist', async () => {
      vi.mocked(mockPrisma.parameterLimits.findMany).mockResolvedValue([]);

      const result = await limitsService.getAllParametersWithLimits();

      expect(result).toHaveLength(0);
    });
  });
});
