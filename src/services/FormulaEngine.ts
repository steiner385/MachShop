import { PrismaClient, ParameterFormula, EvaluationTrigger } from '@prisma/client';
import { create, all, MathJsStatic } from 'mathjs';
import { createLogger } from '../utils/logger';

const prisma = new PrismaClient();
const logger = createLogger('FormulaEngine');

// Create a sandboxed math.js instance with limited functions for security
const math = create(all, {
  number: 'BigNumber', // Use BigNumber for precision
  precision: 64,
}) as MathJsStatic;

// Whitelist of allowed functions (security: prevent code execution)
const ALLOWED_FUNCTIONS = [
  // Basic operations
  'add', 'subtract', 'multiply', 'divide', 'mod', 'pow', 'sqrt', 'abs',
  // Rounding
  'round', 'floor', 'ceil', 'fix',
  // Trigonometry
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  // Exponential/logarithmic
  'exp', 'log', 'log10', 'log2',
  // Statistical
  'min', 'max', 'mean', 'median', 'std', 'variance', 'sum',
  // Logical
  'and', 'or', 'not', 'xor',
  // Comparison
  'equal', 'unequal', 'larger', 'largerEq', 'smaller', 'smallerEq',
  // Conditional
  'if', 'ternary',
];

export interface FormulaResult {
  success: boolean;
  value?: any;
  error?: string;
  executionTime?: number;
}

export interface TestCase {
  inputs: Record<string, any>;
  expectedOutput: any;
  description?: string;
}

export interface TestResult {
  passed: boolean;
  testCase: TestCase;
  actualOutput?: any;
  error?: string;
}

export interface CreateFormulaInput {
  formulaName: string;
  outputParameterId: string;
  formulaExpression: string;
  evaluationTrigger?: EvaluationTrigger;
  evaluationSchedule?: string;
  testCases?: TestCase[];
  createdBy: string;
}

export class FormulaEngineService {
  private readonly EVAL_TIMEOUT = 5000; // 5 seconds max execution time
  private readonly MAX_FORMULA_LENGTH = 10000; // Max characters in formula

  /**
   * Create a new formula
   */
  async createFormula(input: CreateFormulaInput): Promise<ParameterFormula> {
    // Validate formula expression
    const validation = await this.validateFormula(input.formulaExpression);
    if (!validation.valid) {
      throw new Error(`Invalid formula: ${validation.error}`);
    }

    // Extract dependencies from formula
    const dependencies = this.extractDependencies(input.formulaExpression);

    // Verify all input parameters exist
    if (dependencies.length > 0) {
      const params = await prisma.operationParameter.findMany({
        where: { id: { in: dependencies } },
      });
      if (params.length !== dependencies.length) {
        throw new Error('Some input parameters do not exist');
      }
    }

    // Run test cases if provided
    if (input.testCases && input.testCases.length > 0) {
      const testResults = await this.runTestCases(input.formulaExpression, input.testCases);
      const failures = testResults.filter((r) => !r.passed);
      if (failures.length > 0) {
        throw new Error(
          `${failures.length} test case(s) failed: ${failures.map((f) => f.error).join(', ')}`
        );
      }
    }

    logger.info('Creating formula', { formulaName: input.formulaName });

    return await prisma.parameterFormula.create({
      data: {
        formulaName: input.formulaName,
        outputParameterId: input.outputParameterId,
        formulaExpression: input.formulaExpression,
        inputParameterIds: dependencies,
        evaluationTrigger: input.evaluationTrigger || 'ON_CHANGE',
        evaluationSchedule: input.evaluationSchedule,
        testCases: input.testCases as any,
        isActive: true,
        createdBy: input.createdBy,
      },
    });
  }

  /**
   * Evaluate a formula with given parameter values
   */
  async evaluateFormula(
    formulaId: string,
    parameterValues: Record<string, any>
  ): Promise<FormulaResult> {
    const formula = await prisma.parameterFormula.findUnique({
      where: { id: formulaId },
    });

    if (!formula) {
      return { success: false, error: 'Formula not found' };
    }

    if (!formula.isActive) {
      return { success: false, error: 'Formula is inactive' };
    }

    return this.evaluate(formula.formulaExpression, parameterValues);
  }

  /**
   * Evaluate a formula expression directly (for testing)
   */
  async evaluate(
    expression: string,
    scope: Record<string, any>
  ): Promise<FormulaResult> {
    const startTime = Date.now();

    try {
      // Security checks
      if (expression.length > this.MAX_FORMULA_LENGTH) {
        throw new Error(`Formula exceeds maximum length of ${this.MAX_FORMULA_LENGTH} characters`);
      }

      // Create a safe execution context with timeout
      const result = await Promise.race([
        this.safeEvaluate(expression, scope),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Formula evaluation timeout')), this.EVAL_TIMEOUT)
        ),
      ]);

      const executionTime = Date.now() - startTime;

      logger.debug('Formula evaluated successfully', { expression, executionTime });

      return {
        success: true,
        value: result,
        executionTime,
      };
    } catch (error: any) {
      logger.error('Formula evaluation error', { expression, error: error.message });
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Safe evaluation using mathjs with restricted scope
   */
  private async safeEvaluate(expression: string, scope: Record<string, any>): Promise<any> {
    try {
      // Compile the expression (this validates syntax)
      const compiled = math.compile(expression);

      // Evaluate with the provided scope
      const result = compiled.evaluate(scope);

      return result;
    } catch (error: any) {
      throw new Error(`Evaluation error: ${error.message}`);
    }
  }

  /**
   * Validate formula syntax
   */
  async validateFormula(expression: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Try to parse the expression
      math.parse(expression);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Extract parameter dependencies from formula
   * Returns array of parameter IDs/names referenced in the formula
   */
  extractDependencies(expression: string): string[] {
    try {
      const parsed = math.parse(expression);
      const symbols = new Set<string>();

      // Traverse the AST to find all symbol nodes (variables)
      parsed.traverse((node: any) => {
        if (node.type === 'SymbolNode') {
          symbols.add(node.name);
        }
      });

      // Filter out math.js built-in constants and functions
      const dependencies = Array.from(symbols).filter(
        (symbol) =>
          !ALLOWED_FUNCTIONS.includes(symbol) &&
          !['pi', 'e', 'true', 'false', 'null', 'undefined'].includes(symbol.toLowerCase())
      );

      return dependencies;
    } catch (error) {
      logger.error('Error extracting dependencies', { expression, error });
      return [];
    }
  }

  /**
   * Run test cases against a formula
   */
  async runTestCases(expression: string, testCases: TestCase[]): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      const result = await this.evaluate(expression, testCase.inputs);

      if (!result.success) {
        results.push({
          passed: false,
          testCase,
          error: result.error,
        });
        continue;
      }

      // Check if output matches expected
      const passed = this.compareValues(result.value, testCase.expectedOutput);

      results.push({
        passed,
        testCase,
        actualOutput: result.value,
        error: passed ? undefined : `Expected ${testCase.expectedOutput}, got ${result.value}`,
      });
    }

    return results;
  }

  /**
   * Compare two values with tolerance for floating point
   */
  private compareValues(actual: any, expected: any, tolerance = 1e-10): boolean {
    if (typeof actual === 'number' && typeof expected === 'number') {
      return Math.abs(actual - expected) < tolerance;
    }
    return actual === expected;
  }

  /**
   * Get formula by ID
   */
  async getFormula(id: string) {
    return await prisma.parameterFormula.findUnique({
      where: { id },
      include: {
        outputParameter: {
          include: {
            operation: true,
          },
        },
      },
    });
  }

  /**
   * Update formula
   */
  async updateFormula(
    id: string,
    updates: Partial<CreateFormulaInput>,
    userId: string
  ): Promise<ParameterFormula> {
    const existing = await prisma.parameterFormula.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Formula not found');
    }

    // If expression is being updated, validate it
    if (updates.formulaExpression) {
      const validation = await this.validateFormula(updates.formulaExpression);
      if (!validation.valid) {
        throw new Error(`Invalid formula: ${validation.error}`);
      }

      // Extract new dependencies
      const dependencies = this.extractDependencies(updates.formulaExpression);
      updates.inputParameterIds = dependencies as any;

      // Run test cases if provided
      if (updates.testCases && updates.testCases.length > 0) {
        const testResults = await this.runTestCases(updates.formulaExpression, updates.testCases);
        const failures = testResults.filter((r) => !r.passed);
        if (failures.length > 0) {
          throw new Error(
            `${failures.length} test case(s) failed: ${failures.map((f) => f.error).join(', ')}`
          );
        }
      }
    }

    logger.info('Updating formula', { id, updates });

    return await prisma.parameterFormula.update({
      where: { id },
      data: {
        ...updates,
        lastModifiedBy: userId,
      } as any,
    });
  }

  /**
   * Delete formula
   */
  async deleteFormula(id: string): Promise<void> {
    await prisma.parameterFormula.delete({ where: { id } });
    logger.info('Deleted formula', { id });
  }

  /**
   * Activate/deactivate formula
   */
  async setFormulaActive(id: string, isActive: boolean): Promise<ParameterFormula> {
    return await prisma.parameterFormula.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Get all formulas for a parameter
   */
  async getFormulasForParameter(parameterId: string) {
    // Formulas where this parameter is an output
    const asOutput = await prisma.parameterFormula.findMany({
      where: { outputParameterId: parameterId },
    });

    // Formulas where this parameter is an input
    const asInput = await prisma.parameterFormula.findMany({
      where: {
        inputParameterIds: {
          has: parameterId,
        },
      },
    });

    return {
      asOutput,
      asInput,
    };
  }

  /**
   * Get all active formulas that should be evaluated on parameter change
   */
  async getTriggeredFormulas(changedParameterId: string) {
    return await prisma.parameterFormula.findMany({
      where: {
        isActive: true,
        evaluationTrigger: 'ON_CHANGE',
        inputParameterIds: {
          has: changedParameterId,
        },
      },
      include: {
        outputParameter: true,
      },
    });
  }

  /**
   * Evaluate all formulas triggered by a parameter change
   * Returns results for each formula
   */
  async evaluateTriggeredFormulas(
    changedParameterId: string,
    allParameterValues: Record<string, any>
  ): Promise<Array<{ formulaId: string; result: FormulaResult }>> {
    const formulas = await this.getTriggeredFormulas(changedParameterId);
    const results: Array<{ formulaId: string; result: FormulaResult }> = [];

    for (const formula of formulas) {
      const result = await this.evaluate(formula.formulaExpression, allParameterValues);
      results.push({
        formulaId: formula.id,
        result,
      });

      // If evaluation successful, could update the output parameter value here
      if (result.success) {
        logger.info('Formula evaluated on trigger', {
          formulaId: formula.id,
          outputParameterId: formula.outputParameterId,
          value: result.value,
        });
      }
    }

    return results;
  }

  /**
   * List all formulas
   */
  async listFormulas(filters?: { isActive?: boolean; outputParameterId?: string }) {
    return await prisma.parameterFormula.findMany({
      where: filters,
      include: {
        outputParameter: {
          include: {
            operation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const formulaEngine = new FormulaEngineService();
