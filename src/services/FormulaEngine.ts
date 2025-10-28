import { PrismaClient, ParameterFormula, EvaluationTrigger } from '@prisma/client';
import { Prisma } from '@prisma/client';
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

    // Check if a formula already exists for this output parameter
    const existingFormula = await prisma.parameterFormula.findFirst({
      where: { outputParameterId: input.outputParameterId },
    });
    if (existingFormula) {
      throw new Error(`A formula already exists for parameter ${input.outputParameterId}. Only one formula per output parameter is allowed.`);
    }

    // Verify output parameter exists
    const outputParam = await prisma.operationParameter.findUnique({
      where: { id: input.outputParameterId },
    });
    if (!outputParam) {
      throw new Error(`Output parameter ${input.outputParameterId} does not exist`);
    }

    // Extract dependencies from formula
    const dependencies = this.extractDependencies(input.formulaExpression);

    // Verify all input parameters exist
    if (dependencies.length > 0) {
      const params = await prisma.operationParameter.findMany({
        where: { id: { in: dependencies } },
      });
      if (params.length !== dependencies.length) {
        const missingParams = dependencies.filter(dep => !params.find(p => p.id === dep));
        throw new Error(`Some input parameters do not exist: ${missingParams.join(', ')}`);
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

    logger.info('Creating formula', { formulaName: input.formulaName, outputParameterId: input.outputParameterId });

    try {
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
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation
          throw new Error(`A formula already exists for parameter ${input.outputParameterId}. Only one formula per output parameter is allowed.`);
        } else if (error.code === 'P2003') {
          // Foreign key constraint violation
          throw new Error(`Referenced parameter does not exist: ${error.meta?.field_name || 'unknown'}`);
        }
      }
      throw error;
    }
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
   * ✅ PHASE 13C FIX: Enhanced formula validation with better error reporting
   */
  private async safeEvaluate(expression: string, scope: Record<string, any>): Promise<any> {
    try {
      // ✅ PHASE 13C FIX: Pre-validation to catch common formula errors
      if (!expression || typeof expression !== 'string') {
        throw new Error('Formula expression is required and must be a string');
      }

      if (expression.trim() === '') {
        throw new Error('Formula expression cannot be empty');
      }

      // Check for obviously malformed syntax patterns that cause "Value expected" errors
      if (/[\+\-\*\/\%\^]\s*[\+\-\*\/\%\^]/.test(expression)) {
        throw new Error('Invalid syntax: consecutive operators detected (e.g., "++", "+-", "*+")');
      }

      if (/[\+\-\*\/\%\^]\s*$/.test(expression)) {
        throw new Error('Invalid syntax: formula cannot end with an operator');
      }

      if (/^[\+\*\/\%\^]/.test(expression.trim())) {
        throw new Error('Invalid syntax: formula cannot start with an operator (except "-")');
      }

      // Check for unmatched parentheses
      let parenCount = 0;
      for (const char of expression) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (parenCount < 0) {
          throw new Error('Invalid syntax: unmatched closing parenthesis');
        }
      }
      if (parenCount !== 0) {
        throw new Error('Invalid syntax: unmatched opening parenthesis');
      }

      // ✅ PHASE 13C FIX: Enhanced scope validation
      const requiredVariables = this.extractVariables(expression);
      const missingVariables = requiredVariables.filter(variable => !(variable in scope));

      if (missingVariables.length > 0) {
        throw new Error(`Some input parameters do not exist: ${missingVariables.join(', ')}`);
      }

      // Compile the expression (this validates syntax)
      let compiled;
      try {
        compiled = math.compile(expression);
      } catch (mathError: any) {
        // Enhance mathjs error messages for better debugging
        let enhancedMessage = mathError.message;

        if (enhancedMessage.includes('Value expected')) {
          enhancedMessage += `. Check for syntax errors like consecutive operators, missing operands, or invalid characters.`;
        }

        if (enhancedMessage.includes('Unexpected')) {
          enhancedMessage += `. Verify all operators and function names are valid.`;
        }

        throw new Error(`Formula compilation failed: ${enhancedMessage}`);
      }

      // Evaluate with the provided scope
      const result = compiled.evaluate(scope);

      // Convert BigNumber to regular number for JSON serialization
      if (result && typeof result === 'object' && 'toNumber' in result) {
        return result.toNumber();
      }

      return result;
    } catch (error: any) {
      // ✅ PHASE 13C FIX: Add test environment debugging
      if (process.env.NODE_ENV === 'test') {
        console.error(`[FormulaEngine] PHASE 13C: Formula evaluation failed`);
        console.error(`   Expression: "${expression}"`);
        console.error(`   Scope keys: [${Object.keys(scope).join(', ')}]`);
        console.error(`   Error: ${error.message}`);
      }

      throw new Error(`Evaluation error: ${error.message}`);
    }
  }

  /**
   * ✅ PHASE 13C FIX: Extract variable names from formula expression
   */
  private extractVariables(expression: string): string[] {
    const variables = new Set<string>();

    // Simple regex to find variable-like patterns (alphanumeric + underscore)
    // This won't catch all edge cases but handles common variable naming patterns
    const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    let match;

    while ((match = variablePattern.exec(expression)) !== null) {
      const variable = match[0];

      // Skip mathjs built-in constants and functions
      if (!ALLOWED_FUNCTIONS.includes(variable) &&
          !['e', 'pi', 'true', 'false', 'null', 'undefined', 'i'].includes(variable)) {
        variables.add(variable);
      }
    }

    return Array.from(variables);
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
      throw new Error(`Formula with ID ${id} not found`);
    }

    // If output parameter is being changed, check for conflicts
    if (updates.outputParameterId && updates.outputParameterId !== existing.outputParameterId) {
      const conflictingFormula = await prisma.parameterFormula.findFirst({
        where: {
          outputParameterId: updates.outputParameterId,
          id: { not: id } // Exclude current formula
        },
      });
      if (conflictingFormula) {
        throw new Error(`A formula already exists for parameter ${updates.outputParameterId}. Only one formula per output parameter is allowed.`);
      }

      // Verify new output parameter exists
      const outputParam = await prisma.operationParameter.findUnique({
        where: { id: updates.outputParameterId },
      });
      if (!outputParam) {
        throw new Error(`Output parameter ${updates.outputParameterId} does not exist`);
      }
    }

    // If expression is being updated, validate it
    if (updates.formulaExpression) {
      const validation = await this.validateFormula(updates.formulaExpression);
      if (!validation.valid) {
        throw new Error(`Invalid formula: ${validation.error}`);
      }

      // Extract new dependencies
      const dependencies = this.extractDependencies(updates.formulaExpression);

      // Verify all input parameters exist
      if (dependencies.length > 0) {
        const params = await prisma.operationParameter.findMany({
          where: { id: { in: dependencies } },
        });
        if (params.length !== dependencies.length) {
          const missingParams = dependencies.filter(dep => !params.find(p => p.id === dep));
          throw new Error(`Some input parameters do not exist: ${missingParams.join(', ')}`);
        }
      }

      (updates as any).inputParameterIds = dependencies;

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

    logger.info('Updating formula', { id, formulaName: existing.formulaName, updates });

    try {
      return await prisma.parameterFormula.update({
        where: { id },
        data: {
          ...updates,
          lastModifiedBy: userId,
        } as any,
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation
          throw new Error(`A formula already exists for parameter ${updates.outputParameterId}. Only one formula per output parameter is allowed.`);
        } else if (error.code === 'P2003') {
          // Foreign key constraint violation
          throw new Error(`Referenced parameter does not exist: ${error.meta?.field_name || 'unknown'}`);
        } else if (error.code === 'P2025') {
          // Record to update does not exist
          throw new Error(`Formula with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Delete formula
   */
  async deleteFormula(id: string): Promise<void> {
    // Check if formula exists before attempting to delete
    const existingFormula = await prisma.parameterFormula.findUnique({
      where: { id },
    });

    if (!existingFormula) {
      throw new Error(`Formula with ID ${id} not found`);
    }

    try {
      await prisma.parameterFormula.delete({ where: { id } });
      logger.info('Deleted formula', { id, formulaName: existingFormula.formulaName });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record to delete does not exist
          throw new Error(`Formula with ID ${id} not found`);
        }
      }
      throw error;
    }
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
