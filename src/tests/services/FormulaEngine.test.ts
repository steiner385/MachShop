import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FormulaEngineService } from '../../services/FormulaEngine';
import { EvaluationTrigger } from '@prisma/client';

// Mock PrismaClient
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');

  const mockPrisma = {
    parameterFormula: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    operationParameter: {
      findMany: vi.fn(),
    },
  };

  return {
    ...actual,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

import { PrismaClient } from '@prisma/client';

describe('FormulaEngineService', () => {
  let formulaEngine: FormulaEngineService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    formulaEngine = new FormulaEngineService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== FORMULA VALIDATION ====================

  describe('validateFormula', () => {
    it('should validate a simple arithmetic formula', async () => {
      const result = await formulaEngine.validateFormula('a + b');
      expect(result.valid).toBe(true);
    });

    it('should validate a complex mathematical formula', async () => {
      const result = await formulaEngine.validateFormula('sqrt(pow(x, 2) + pow(y, 2))');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid syntax', async () => {
      const result = await formulaEngine.validateFormula('a +* b');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate formula with functions', async () => {
      const result = await formulaEngine.validateFormula('max(a, b, c)');
      expect(result.valid).toBe(true);
    });
  });

  // ==================== DEPENDENCY EXTRACTION ====================

  describe('extractDependencies', () => {
    it('should extract variables from simple formula', () => {
      const deps = formulaEngine.extractDependencies('a + b - c');
      expect(deps).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      expect(deps.length).toBe(3);
    });

    it('should extract variables from complex formula', () => {
      const deps = formulaEngine.extractDependencies('sqrt(x^2 + y^2)');
      expect(deps).toEqual(expect.arrayContaining(['x', 'y']));
      expect(deps.length).toBe(2);
    });

    it('should filter out math functions', () => {
      const deps = formulaEngine.extractDependencies('max(a, b) + min(c, d)');
      expect(deps).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));
      expect(deps).not.toContain('max');
      expect(deps).not.toContain('min');
    });

    it('should filter out mathematical constants', () => {
      const deps = formulaEngine.extractDependencies('a * pi + e');
      expect(deps).toEqual(['a']);
      expect(deps).not.toContain('pi');
      expect(deps).not.toContain('e');
    });

    it('should handle formulas with no variables', () => {
      const deps = formulaEngine.extractDependencies('1 + 2 * 3');
      expect(deps).toEqual([]);
    });
  });

  // ==================== FORMULA EVALUATION ====================

  describe('evaluate', () => {
    it('should evaluate simple arithmetic', async () => {
      const result = await formulaEngine.evaluate('a + b', { a: 5, b: 3 });
      expect(result.success).toBe(true);
      expect(result.value).toBe(8);
    });

    it('should evaluate complex expressions', async () => {
      const result = await formulaEngine.evaluate('sqrt(pow(x, 2) + pow(y, 2))', { x: 3, y: 4 });
      expect(result.success).toBe(true);
      expect(Number(result.value)).toBeCloseTo(5, 5);
    });

    it('should handle mathematical functions', async () => {
      const result = await formulaEngine.evaluate('max(a, b, c)', { a: 5, b: 10, c: 3 });
      expect(result.success).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should handle conditional expressions', async () => {
      const result = await formulaEngine.evaluate('a > b ? a : b', { a: 5, b: 3 });
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should reject formulas exceeding max length', async () => {
      const longFormula = 'a'.repeat(15000);
      const result = await formulaEngine.evaluate(longFormula, { a: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum length');
    });

    it('should handle evaluation errors gracefully', async () => {
      const result = await formulaEngine.evaluate('a / b', { a: 10, b: 0 });
      expect(result.success).toBe(true);
      expect(result.value).toBe(Infinity);
    });

    it('should return execution time', async () => {
      const result = await formulaEngine.evaluate('a + b', { a: 1, b: 2 });
      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  // ==================== TEST CASE EXECUTION ====================

  describe('runTestCases', () => {
    it('should run and validate test cases', async () => {
      const testCases = [
        { inputs: { a: 2, b: 3 }, expectedOutput: 5 },
        { inputs: { a: 10, b: 5 }, expectedOutput: 15 },
      ];

      const results = await formulaEngine.runTestCases('a + b', testCases);

      expect(results).toHaveLength(2);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(true);
    });

    it('should detect failing test cases', async () => {
      const testCases = [
        { inputs: { a: 2, b: 3 }, expectedOutput: 6 }, // Should be 5
      ];

      const results = await formulaEngine.runTestCases('a + b', testCases);

      expect(results[0].passed).toBe(false);
      expect(results[0].error).toContain('Expected 6, got 5');
    });

    it('should handle floating point comparisons', async () => {
      const testCases = [
        { inputs: { a: 0.1, b: 0.2 }, expectedOutput: 0.3 },
      ];

      const results = await formulaEngine.runTestCases('a + b', testCases);

      expect(results[0].passed).toBe(true);
    });
  });

  // ==================== FORMULA CRUD ====================

  describe('createFormula', () => {
    it('should create a formula with valid expression', async () => {
      const mockFormula = {
        id: '1',
        formulaName: 'Test Formula',
        outputParameterId: 'param1',
        formulaExpression: 'a + b',
        inputParameterIds: ['a', 'b'],
        evaluationTrigger: 'ON_CHANGE' as EvaluationTrigger,
        isActive: true,
        createdBy: 'user1',
      };

      vi.mocked(mockPrisma.operationParameter.findMany).mockResolvedValue([
        { id: 'a' },
        { id: 'b' },
      ] as any);

      vi.mocked(mockPrisma.parameterFormula.create).mockResolvedValue(mockFormula as any);

      const result = await formulaEngine.createFormula({
        formulaName: 'Test Formula',
        outputParameterId: 'param1',
        formulaExpression: 'a + b',
        createdBy: 'user1',
      });

      expect(result).toEqual(mockFormula);
      expect(mockPrisma.parameterFormula.create).toHaveBeenCalled();
    });

    it('should reject invalid formula', async () => {
      await expect(
        formulaEngine.createFormula({
          formulaName: 'Invalid Formula',
          outputParameterId: 'param1',
          formulaExpression: 'a +* b',
          createdBy: 'user1',
        })
      ).rejects.toThrow('Invalid formula');
    });

    it('should validate test cases before creation', async () => {
      vi.mocked(mockPrisma.operationParameter.findMany).mockResolvedValue([
        { id: 'a' },
        { id: 'b' },
      ] as any);

      await expect(
        formulaEngine.createFormula({
          formulaName: 'Test Formula',
          outputParameterId: 'param1',
          formulaExpression: 'a + b',
          testCases: [{ inputs: { a: 1, b: 2 }, expectedOutput: 10 }], // Wrong expected
          createdBy: 'user1',
        })
      ).rejects.toThrow('test case(s) failed');
    });
  });

  describe('evaluateFormula', () => {
    it('should evaluate an active formula', async () => {
      const mockFormula = {
        id: '1',
        formulaExpression: 'a + b',
        isActive: true,
      };

      vi.mocked(mockPrisma.parameterFormula.findUnique).mockResolvedValue(mockFormula as any);

      const result = await formulaEngine.evaluateFormula('1', { a: 5, b: 3 });

      expect(result.success).toBe(true);
      expect(result.value).toBe(8);
    });

    it('should reject inactive formula', async () => {
      const mockFormula = {
        id: '1',
        formulaExpression: 'a + b',
        isActive: false,
      };

      vi.mocked(mockPrisma.parameterFormula.findUnique).mockResolvedValue(mockFormula as any);

      const result = await formulaEngine.evaluateFormula('1', { a: 5, b: 3 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('inactive');
    });

    it('should handle non-existent formula', async () => {
      vi.mocked(mockPrisma.parameterFormula.findUnique).mockResolvedValue(null);

      const result = await formulaEngine.evaluateFormula('nonexistent', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ==================== TRIGGERED FORMULAS ====================

  describe('getTriggeredFormulas', () => {
    it('should get formulas triggered by parameter change', async () => {
      const mockFormulas = [
        {
          id: '1',
          formulaName: 'Formula 1',
          inputParameterIds: ['param1', 'param2'],
          evaluationTrigger: 'ON_CHANGE',
          isActive: true,
        },
      ];

      vi.mocked(mockPrisma.parameterFormula.findMany).mockResolvedValue(mockFormulas as any);

      const result = await formulaEngine.getTriggeredFormulas('param1');

      expect(result).toEqual(mockFormulas);
      expect(mockPrisma.parameterFormula.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
          evaluationTrigger: 'ON_CHANGE',
          inputParameterIds: { has: 'param1' },
        }),
        include: { outputParameter: true },
      });
    });
  });

  // ==================== FORMULA LISTING ====================

  describe('listFormulas', () => {
    it('should list all formulas', async () => {
      const mockFormulas = [
        { id: '1', formulaName: 'Formula 1' },
        { id: '2', formulaName: 'Formula 2' },
      ];

      vi.mocked(mockPrisma.parameterFormula.findMany).mockResolvedValue(mockFormulas as any);

      const result = await formulaEngine.listFormulas();

      expect(result).toEqual(mockFormulas);
    });

    it('should filter by isActive', async () => {
      const mockFormulas = [{ id: '1', formulaName: 'Active Formula', isActive: true }];

      vi.mocked(mockPrisma.parameterFormula.findMany).mockResolvedValue(mockFormulas as any);

      await formulaEngine.listFormulas({ isActive: true });

      expect(mockPrisma.parameterFormula.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });
  });
});
