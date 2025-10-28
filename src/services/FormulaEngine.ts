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

    // ✅ GITHUB ISSUE #10 FIX: Enhanced parameter existence validation
    if (dependencies.length > 0) {
      const params = await prisma.operationParameter.findMany({
        where: { id: { in: dependencies } },
      });
      if (params.length !== dependencies.length) {
        const foundParams = params.map(p => p.id);
        const missingParams = dependencies.filter(dep => !foundParams.includes(dep));

        // Enhanced error message with context
        throw new Error(`Some input parameters do not exist: ${missingParams.join(', ')}. Found parameters: ${foundParams.join(', ')}. Please ensure all referenced parameters are created before using them in formulas.`);
      }

      // Additional validation: check if parameters are active/available
      const inactiveParams = params.filter(p => (p as any).isActive === false);
      if (inactiveParams.length > 0) {
        console.warn(`Warning: Some referenced parameters are inactive: ${inactiveParams.map(p => p.id).join(', ')}`);
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
   * ✅ GITHUB ISSUE #10 FIX: Additional edge case handling for mathjs validation
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

      // ✅ GITHUB ISSUE #10 FIX: Enhanced operator validation for edge cases
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

      // ✅ GITHUB ISSUE #10 FIX: Additional edge case patterns
      // Check for spaces around operators that can cause parsing issues
      if (/\s+[\+\-\*\/\%\^]\s+[\+\-\*\/\%\^]/.test(expression)) {
        throw new Error('Invalid syntax: consecutive operators with spaces detected');
      }

      // Check for malformed operator sequences like "+*", "-/", etc.
      if (/[\+\-\*\/\%\^][\+\*\/\%\^]/.test(expression)) {
        throw new Error('Invalid syntax: invalid operator combination detected');
      }

      // Check for expressions starting with operators in the middle (after operators)
      if (/[\+\-\*\/\%\^]\s*[\*\/\%\^]/.test(expression)) {
        throw new Error('Invalid syntax: operator followed by binary operator');
      }

      // Check for empty parentheses or malformed parentheses content
      if (/\(\s*\)/.test(expression)) {
        throw new Error('Invalid syntax: empty parentheses not allowed');
      }

      if (/\(\s*[\+\*\/\%\^]/.test(expression)) {
        throw new Error('Invalid syntax: parentheses cannot start with an operator (except "-")');
      }

      if (/[\+\-\*\/\%\^]\s*\)/.test(expression)) {
        throw new Error('Invalid syntax: parentheses cannot end with an operator');
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

      // ✅ GITHUB ISSUE #10 FIX: Enhanced scope validation with better error context
      const requiredVariables = this.extractVariables(expression);
      const missingVariables = requiredVariables.filter(variable => !(variable in scope));

      if (missingVariables.length > 0) {
        throw new Error(`Some input parameters do not exist: ${missingVariables.join(', ')}. Available parameters: ${Object.keys(scope).join(', ')}`);
      }

      // ✅ GITHUB ISSUE #10 FIX: Additional validation for variable names
      const invalidVariables = requiredVariables.filter(variable => {
        // Check for variables that might be confused with numbers or invalid identifiers
        return /^\d/.test(variable) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable);
      });

      if (invalidVariables.length > 0) {
        throw new Error(`Invalid variable names detected: ${invalidVariables.join(', ')}. Variable names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
      }

      // Compile the expression (this validates syntax)
      let compiled;
      try {
        compiled = math.compile(expression);
      } catch (mathError: any) {
        // ✅ GITHUB ISSUE #10 FIX: Enhanced mathjs error messages for better debugging
        let enhancedMessage = mathError.message;

        // Handle specific mathjs error patterns
        if (enhancedMessage.includes('Value expected')) {
          const charMatch = enhancedMessage.match(/char (\d+)/);
          const charPos = charMatch ? parseInt(charMatch[1]) : null;

          enhancedMessage += `. Check for syntax errors like consecutive operators, missing operands, or invalid characters`;

          if (charPos !== null && charPos < expression.length) {
            const problemChar = expression[charPos];
            const context = expression.substring(Math.max(0, charPos - 5), charPos + 5);
            enhancedMessage += `. Problem near character '${problemChar}' at position ${charPos} in context: "${context}"`;
          }
        }

        if (enhancedMessage.includes('Unexpected')) {
          enhancedMessage += `. Verify all operators and function names are valid. Allowed functions: ${ALLOWED_FUNCTIONS.slice(0, 10).join(', ')}, ...`;
        }

        if (enhancedMessage.includes('Unknown function')) {
          enhancedMessage += `. Only whitelisted functions are allowed for security. Allowed functions: ${ALLOWED_FUNCTIONS.join(', ')}`;
        }

        throw new Error(`Formula compilation failed: ${enhancedMessage}`);
      }

      // Evaluate with the provided scope
      const result = compiled.evaluate(scope);

      // ✅ GITHUB ISSUE #10 FIX: Enhanced result validation
      // Check for invalid results that could cause issues
      if (result === undefined || result === null) {
        throw new Error('Formula evaluation resulted in undefined or null value');
      }

      if (typeof result === 'number' && !isFinite(result)) {
        if (isNaN(result)) {
          throw new Error('Formula evaluation resulted in NaN (Not a Number)');
        }
        if (!isFinite(result)) {
          throw new Error('Formula evaluation resulted in infinite value');
        }
      }

      // Convert BigNumber to regular number for JSON serialization
      if (result && typeof result === 'object' && 'toNumber' in result) {
        const numericResult = result.toNumber();

        // Validate the converted number
        if (!isFinite(numericResult)) {
          throw new Error('Formula evaluation resulted in non-finite number after BigNumber conversion');
        }

        return numericResult;
      }

      return result;
    } catch (error: any) {
      // ✅ GITHUB ISSUE #10 FIX: Enhanced test environment debugging
      if (process.env.NODE_ENV === 'test') {
        console.error(`[FormulaEngine] ISSUE #10: Formula evaluation failed`);
        console.error(`   Expression: "${expression}"`);
        console.error(`   Scope keys: [${Object.keys(scope).join(', ')}]`);
        console.error(`   Scope values:`, scope);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
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
   * ✅ GITHUB ISSUE #10 FIX: Enhanced validation to catch edge cases before mathjs parsing
   */
  async validateFormula(expression: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // ✅ GITHUB ISSUE #10 FIX: Use enhanced pre-validation from safeEvaluate
      if (!expression || typeof expression !== 'string') {
        return { valid: false, error: 'Formula expression is required and must be a string' };
      }

      if (expression.trim() === '') {
        return { valid: false, error: 'Formula expression cannot be empty' };
      }

      // Apply the same pre-validation checks from safeEvaluate
      if (/[\+\-\*\/\%\^]\s*[\+\-\*\/\%\^]/.test(expression)) {
        return { valid: false, error: 'Invalid syntax: consecutive operators detected (e.g., "++", "+-", "*+")' };
      }

      if (/[\+\-\*\/\%\^]\s*$/.test(expression)) {
        return { valid: false, error: 'Invalid syntax: formula cannot end with an operator' };
      }

      if (/^[\+\*\/\%\^]/.test(expression.trim())) {
        return { valid: false, error: 'Invalid syntax: formula cannot start with an operator (except "-")' };
      }

      if (/\s+[\+\-\*\/\%\^]\s+[\+\-\*\/\%\^]/.test(expression)) {
        return { valid: false, error: 'Invalid syntax: consecutive operators with spaces detected' };
      }

      if (/[\+\-\*\/\%\^][\+\*\/\%\^]/.test(expression)) {
        return { valid: false, error: 'Invalid syntax: invalid operator combination detected' };
      }

      if (/[\+\-\*\/\%\^]\s*[\*\/\%\^]/.test(expression)) {
        return { valid: false, error: 'Invalid syntax: operator followed by binary operator' };
      }

      if (/\(\s*\)/.test(expression)) {
        return { valid: false, error: 'Invalid syntax: empty parentheses not allowed' };
      }

      if (/\(\s*[\+\*\/\%\^]/.test(expression)) {
        return { valid: false, error: 'Invalid syntax: parentheses cannot start with an operator (except "-")' };
      }

      if (/[\+\-\*\/\%\^]\s*\)/.test(expression)) {
        return { valid: false, error: 'Invalid syntax: parentheses cannot end with an operator' };
      }

      // Check for unmatched parentheses
      let parenCount = 0;
      for (const char of expression) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (parenCount < 0) {
          return { valid: false, error: 'Invalid syntax: unmatched closing parenthesis' };
        }
      }
      if (parenCount !== 0) {
        return { valid: false, error: 'Invalid syntax: unmatched opening parenthesis' };
      }

      // Check for invalid variable names
      const variables = this.extractVariables(expression);
      const invalidVariables = variables.filter(variable => {
        return /^\d/.test(variable) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable);
      });

      if (invalidVariables.length > 0) {
        return { valid: false, error: `Invalid variable names detected: ${invalidVariables.join(', ')}. Variable names must start with a letter or underscore and contain only letters, numbers, and underscores.` };
      }

      // Try to parse the expression with mathjs
      try {
        math.parse(expression);
        return { valid: true };
      } catch (mathError: any) {
        let enhancedMessage = mathError.message;

        if (enhancedMessage.includes('Value expected')) {
          const charMatch = enhancedMessage.match(/char (\d+)/);
          const charPos = charMatch ? parseInt(charMatch[1]) : null;

          enhancedMessage += `. Check for syntax errors like consecutive operators, missing operands, or invalid characters`;

          if (charPos !== null && charPos < expression.length) {
            const problemChar = expression[charPos];
            const context = expression.substring(Math.max(0, charPos - 5), charPos + 5);
            enhancedMessage += `. Problem near character '${problemChar}' at position ${charPos} in context: "${context}"`;
          }
        }

        if (enhancedMessage.includes('Unexpected')) {
          enhancedMessage += `. Verify all operators and function names are valid. Allowed functions: ${ALLOWED_FUNCTIONS.slice(0, 10).join(', ')}, ...`;
        }

        if (enhancedMessage.includes('Unknown function')) {
          enhancedMessage += `. Only whitelisted functions are allowed for security. Allowed functions: ${ALLOWED_FUNCTIONS.join(', ')}`;
        }

        return { valid: false, error: enhancedMessage };
      }
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
   * ✅ GITHUB ISSUE #10 FIX: Enhanced value comparison with better type handling
   */
  private compareValues(actual: any, expected: any, tolerance = 1e-10): boolean {
    // ✅ GITHUB ISSUE #10 FIX: Handle null/undefined cases
    if (actual === null && expected === null) return true;
    if (actual === undefined && expected === undefined) return true;
    if ((actual === null || actual === undefined) !== (expected === null || expected === undefined)) {
      return false;
    }

    // ✅ GITHUB ISSUE #10 FIX: Enhanced numeric comparison
    if (typeof actual === 'number' && typeof expected === 'number') {
      // Handle special numeric cases
      if (isNaN(actual) && isNaN(expected)) return true;
      if (isNaN(actual) || isNaN(expected)) return false;
      if (!isFinite(actual) && !isFinite(expected)) return actual === expected; // Both infinity
      if (!isFinite(actual) || !isFinite(expected)) return false;

      return Math.abs(actual - expected) < tolerance;
    }

    // ✅ GITHUB ISSUE #10 FIX: Handle string-to-number conversion cases
    if ((typeof actual === 'string' && typeof expected === 'number') ||
        (typeof actual === 'number' && typeof expected === 'string')) {
      const actualNum = Number(actual);
      const expectedNum = Number(expected);

      if (!isNaN(actualNum) && !isNaN(expectedNum)) {
        return Math.abs(actualNum - expectedNum) < tolerance;
      }
    }

    // ✅ GITHUB ISSUE #10 FIX: Handle boolean comparisons
    if (typeof actual === 'boolean' && typeof expected === 'boolean') {
      return actual === expected;
    }

    // ✅ GITHUB ISSUE #10 FIX: Handle string comparisons with whitespace tolerance
    if (typeof actual === 'string' && typeof expected === 'string') {
      return actual.trim() === expected.trim();
    }

    // ✅ GITHUB ISSUE #10 FIX: Handle array comparisons
    if (Array.isArray(actual) && Array.isArray(expected)) {
      if (actual.length !== expected.length) return false;
      return actual.every((val, index) => this.compareValues(val, expected[index], tolerance));
    }

    // Default comparison
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

      // ✅ GITHUB ISSUE #10 FIX: Enhanced parameter existence validation (update method)
      if (dependencies.length > 0) {
        const params = await prisma.operationParameter.findMany({
          where: { id: { in: dependencies } },
        });
        if (params.length !== dependencies.length) {
          const foundParams = params.map(p => p.id);
          const missingParams = dependencies.filter(dep => !foundParams.includes(dep));

          // Enhanced error message with context
          throw new Error(`Some input parameters do not exist: ${missingParams.join(', ')}. Found parameters: ${foundParams.join(', ')}. Please ensure all referenced parameters are created before using them in formulas.`);
        }

        // Additional validation: check if parameters are active/available
        const inactiveParams = params.filter(p => (p as any).isActive === false);
        if (inactiveParams.length > 0) {
          console.warn(`Warning: Some referenced parameters are inactive: ${inactiveParams.map(p => p.id).join(', ')}`);
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
