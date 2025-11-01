/**
 * Contract Testing Framework
 * Validates hook responses against API specification contracts
 */

export interface ApiContract {
  name: string;
  endpoint: string;
  method: string;
  requestSchema?: Record<string, any>;
  responseSchema: Record<string, any>;
  examples?: {
    request?: any;
    response: any;
  }[];
  statusCode?: number;
}

export interface ContractTestResult {
  contractName: string;
  passed: boolean;
  errors: ContractViolation[];
  warnings: string[];
  testDuration: number;
}

export interface ContractViolation {
  type: 'missing_field' | 'invalid_type' | 'invalid_value' | 'extra_field' | 'schema_violation';
  path: string;
  expected: any;
  actual: any;
  message: string;
}

export class ContractTester {
  /**
   * Validate response against contract schema
   */
  static validateResponse(
    response: any,
    contract: ApiContract
  ): ContractTestResult {
    const startTime = Date.now();
    const errors: ContractViolation[] = [];
    const warnings: string[] = [];

    // Validate response shape
    const shapeErrors = this.validateSchema(response, contract.responseSchema, '');
    errors.push(...shapeErrors);

    // Validate status code if specified
    if (contract.statusCode && response.statusCode !== contract.statusCode) {
      errors.push({
        type: 'invalid_value',
        path: 'statusCode',
        expected: contract.statusCode,
        actual: response.statusCode,
        message: `Expected status code ${contract.statusCode}, got ${response.statusCode}`
      });
    }

    // Check response structure matches examples
    if (contract.examples && contract.examples.length > 0) {
      const matchesExample = contract.examples.some(example =>
        this.responseMatchesExample(response, example.response)
      );

      if (!matchesExample) {
        warnings.push('Response does not match any documented examples');
      }
    }

    const testDuration = Date.now() - startTime;

    return {
      contractName: contract.name,
      passed: errors.length === 0,
      errors,
      warnings,
      testDuration
    };
  }

  /**
   * Validate request against contract schema
   */
  static validateRequest(
    request: any,
    contract: ApiContract
  ): ContractTestResult {
    const startTime = Date.now();
    const errors: ContractViolation[] = [];
    const warnings: string[] = [];

    if (contract.requestSchema) {
      const schemaErrors = this.validateSchema(request, contract.requestSchema, '');
      errors.push(...schemaErrors);
    }

    // Check request matches examples
    if (contract.examples && contract.examples.length > 0) {
      const hasMatchingExample = contract.examples.some(example =>
        example.request && this.objectMatchesShape(request, example.request)
      );

      if (!hasMatchingExample) {
        warnings.push('Request does not match any documented examples');
      }
    }

    const testDuration = Date.now() - startTime;

    return {
      contractName: contract.name,
      passed: errors.length === 0,
      errors,
      warnings,
      testDuration
    };
  }

  /**
   * Test hook against multiple contracts
   */
  static async testHookAgainstContracts(
    hook: Function,
    contracts: ApiContract[],
    context?: any
  ): Promise<ContractTestResult[]> {
    const results: ContractTestResult[] = [];

    for (const contract of contracts) {
      try {
        const response = await hook(context);
        const result = this.validateResponse(response, contract);
        results.push(result);
      } catch (error) {
        results.push({
          contractName: contract.name,
          passed: false,
          errors: [{
            type: 'schema_violation',
            path: 'hook',
            expected: 'successful execution',
            actual: 'threw error',
            message: `Hook threw error: ${(error as any).message}`
          }],
          warnings: [],
          testDuration: 0
        });
      }
    }

    return results;
  }

  /**
   * Generate contract from hook response
   */
  static generateContract(
    hookName: string,
    response: any,
    endpoint: string,
    method: string = 'POST'
  ): ApiContract {
    return {
      name: `${hookName}_contract`,
      endpoint,
      method,
      responseSchema: this.inferSchema(response),
      examples: [{ response }],
      statusCode: 200
    };
  }

  // Private helper methods

  private static validateSchema(
    object: any,
    schema: Record<string, any>,
    path: string
  ): ContractViolation[] {
    const errors: ContractViolation[] = [];

    if (!schema) return errors;

    const schemaKeys = Object.keys(schema);
    const objectKeys = Object.keys(object || {});

    // Check for missing fields
    for (const key of schemaKeys) {
      if (!(key in (object || {}))) {
        errors.push({
          type: 'missing_field',
          path: path ? `${path}.${key}` : key,
          expected: schema[key],
          actual: undefined,
          message: `Missing required field: ${path ? `${path}.${key}` : key}`
        });
      }
    }

    // Check for extra fields
    for (const key of objectKeys) {
      if (!(key in schema)) {
        errors.push({
          type: 'extra_field',
          path: path ? `${path}.${key}` : key,
          expected: 'not present',
          actual: object[key],
          message: `Unexpected field: ${path ? `${path}.${key}` : key}`
        });
      }
    }

    // Check field types
    for (const key of schemaKeys) {
      if (key in (object || {})) {
        const expectedType = schema[key];
        const actualValue = object[key];
        const actualType = typeof actualValue;

        if (expectedType !== actualType && actualValue !== null) {
          errors.push({
            type: 'invalid_type',
            path: path ? `${path}.${key}` : key,
            expected: expectedType,
            actual: actualType,
            message: `Field ${path ? `${path}.${key}` : key} should be ${expectedType}, got ${actualType}`
          });
        }
      }
    }

    return errors;
  }

  private static inferSchema(object: any): Record<string, string> {
    if (object === null || object === undefined) {
      return {};
    }

    const schema: Record<string, string> = {};

    for (const [key, value] of Object.entries(object)) {
      if (Array.isArray(value)) {
        schema[key] = 'array';
      } else {
        schema[key] = typeof value;
      }
    }

    return schema;
  }

  private static responseMatchesExample(response: any, example: any): boolean {
    return this.objectMatchesShape(response, example);
  }

  private static objectMatchesShape(object: any, shape: any): boolean {
    if (typeof object !== typeof shape) {
      return false;
    }

    if (typeof shape !== 'object' || shape === null) {
      return object === shape;
    }

    const shapeKeys = Object.keys(shape);
    const objectKeys = Object.keys(object);

    if (shapeKeys.length !== objectKeys.length) {
      return false;
    }

    for (const key of shapeKeys) {
      if (!(key in object)) {
        return false;
      }

      if (typeof object[key] !== typeof shape[key]) {
        return false;
      }
    }

    return true;
  }
}

export default ContractTester;
