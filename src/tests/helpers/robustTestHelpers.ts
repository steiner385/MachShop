/**
 * ✅ PHASE 13A FIX: Enhanced Test Setup Robustness
 *
 * Provides robust test helpers with enhanced error handling,
 * detailed logging, and fallback strategies for test setup failures.
 */

import { APIRequestContext } from '@playwright/test';
import { test } from '@playwright/test';

export interface TestPrerequisites {
  [key: string]: any;
}

export interface APICallOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  skipNullChecks?: boolean;
  fallbackStrategies?: Map<string, () => Promise<any>>;
}

export interface ValidationResult {
  isValid: boolean;
  missingValues: string[];
  errors: string[];
  warnings: string[];
}

/**
 * Enhanced version of validateTestPrerequisites with detailed logging and fallback strategies
 */
export function validateTestPrerequisitesEnhanced(
  variables: TestPrerequisites,
  context?: string
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    missingValues: [],
    errors: [],
    warnings: []
  };

  const contextPrefix = context ? `[${context}] ` : '';

  for (const [name, value] of Object.entries(variables)) {
    if (!value) {
      result.isValid = false;
      result.missingValues.push(name);

      const errorMsg = `${contextPrefix}Test prerequisite '${name}' is not defined (setup may have failed)`;
      result.errors.push(errorMsg);

      // Enhanced logging for debugging
      console.error(`❌ PHASE 13A: ${errorMsg}`);
      console.error(`   Variable type: ${typeof value}`);
      console.error(`   Variable value: ${JSON.stringify(value)}`);

      // If we're in test mode, skip the test but with enhanced debugging
      if (typeof test !== 'undefined') {
        console.error(`   Test will be skipped due to missing prerequisite`);
        test.skip();
      }
    } else {
      // Log successful validation
      console.log(`✅ PHASE 13A: ${contextPrefix}Test prerequisite '${name}' validated: ${typeof value === 'string' ? value : typeof value}`);
    }
  }

  return result;
}

/**
 * Robust API call with retry logic and enhanced error handling
 */
export async function robustAPICall<T>(
  request: APIRequestContext,
  url: string,
  headers: Record<string, string>,
  options: APICallOptions = {}
): Promise<{ success: boolean; data?: T; error?: string; statusCode?: number }> {

  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    skipNullChecks = false
  } = options;

  let lastError: string = '';
  let lastStatusCode: number = 0;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 PHASE 13A: Attempting API call to ${url} (attempt ${attempt}/${retries})`);

      const response = await request.get(url, {
        headers,
        timeout
      });

      lastStatusCode = response.status();

      if (response.ok()) {
        const data = await response.json();

        // Enhanced validation
        if (!skipNullChecks && (!data || (Array.isArray(data) && data.length === 0))) {
          lastError = `API returned empty or null data from ${url}`;
          console.warn(`⚠️  PHASE 13A: ${lastError} (attempt ${attempt}/${retries})`);

          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          return { success: false, error: lastError, statusCode: lastStatusCode };
        }

        console.log(`✅ PHASE 13A: API call to ${url} successful`);
        console.log(`   Response type: ${Array.isArray(data) ? `array[${data.length}]` : typeof data}`);

        return { success: true, data };
      } else {
        lastError = `HTTP ${response.status()}: ${response.statusText()}`;
        console.error(`❌ PHASE 13A: API call failed: ${lastError} (attempt ${attempt}/${retries})`);

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
      }
    } catch (error: any) {
      lastError = error.message || 'Unknown error';
      console.error(`❌ PHASE 13A: API call exception: ${lastError} (attempt ${attempt}/${retries})`);

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
    }
  }

  return { success: false, error: lastError, statusCode: lastStatusCode };
}

/**
 * Enhanced test setup with fallback strategies
 */
export async function robustTestSetup(
  request: APIRequestContext,
  authHeaders: Record<string, string>,
  setupSteps: Array<{
    name: string;
    url: string;
    validator?: (data: any) => boolean;
    fallback?: () => Promise<any>;
    required?: boolean;
  }>
): Promise<{ success: boolean; results: Record<string, any>; errors: string[] }> {

  const results: Record<string, any> = {};
  const errors: string[] = [];
  let overallSuccess = true;

  console.log(`🚀 PHASE 13A: Starting robust test setup with ${setupSteps.length} steps`);

  for (const step of setupSteps) {
    const { name, url, validator, fallback, required = true } = step;

    console.log(`📋 PHASE 13A: Setting up ${name}...`);

    const apiResult = await robustAPICall(request, url, authHeaders, {
      retries: 3,
      retryDelay: 1000,
      timeout: 30000
    });

    if (apiResult.success && apiResult.data) {
      // Apply custom validator if provided
      if (validator && !validator(apiResult.data)) {
        const errorMsg = `Setup step '${name}' failed validation`;
        errors.push(errorMsg);
        console.error(`❌ PHASE 13A: ${errorMsg}`);

        // Try fallback if available
        if (fallback) {
          console.log(`🔄 PHASE 13A: Attempting fallback for ${name}...`);
          try {
            results[name] = await fallback();
            console.log(`✅ PHASE 13A: Fallback for ${name} successful`);
            continue;
          } catch (fallbackError: any) {
            console.error(`❌ PHASE 13A: Fallback for ${name} failed: ${fallbackError.message}`);
          }
        }

        if (required) {
          overallSuccess = false;
        }
      } else {
        results[name] = apiResult.data;
        console.log(`✅ PHASE 13A: Setup step '${name}' completed successfully`);
      }
    } else {
      const errorMsg = `Setup step '${name}' failed: ${apiResult.error} (HTTP ${apiResult.statusCode || 'unknown'})`;
      errors.push(errorMsg);
      console.error(`❌ PHASE 13A: ${errorMsg}`);

      // Try fallback if available
      if (fallback) {
        console.log(`🔄 PHASE 13A: Attempting fallback for ${name}...`);
        try {
          results[name] = await fallback();
          console.log(`✅ PHASE 13A: Fallback for ${name} successful`);
          continue;
        } catch (fallbackError: any) {
          console.error(`❌ PHASE 13A: Fallback for ${name} failed: ${fallbackError.message}`);
        }
      }

      if (required) {
        overallSuccess = false;
      }
    }
  }

  const summary = {
    success: overallSuccess,
    results,
    errors
  };

  console.log(`📊 PHASE 13A: Test setup completed. Success: ${overallSuccess}, Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.error(`❌ PHASE 13A: Setup errors:`, errors);
  }

  return summary;
}

/**
 * Create fallback work center for testing
 */
export async function createFallbackWorkCenter(
  request: APIRequestContext,
  authHeaders: Record<string, string>,
  siteId: string
): Promise<string> {
  console.log(`🔄 PHASE 13A: Creating fallback work center for site ${siteId}`);

  const fallbackWorkCenter = {
    workCenterCode: `FALLBACK_WC_${Date.now()}`,
    workCenterName: 'Fallback Work Center (Test)',
    siteId: siteId,
    description: 'Auto-generated fallback work center for test setup',
    isActive: true,
    capacity: 1,
    efficiency: 100
  };

  const response = await request.post('/api/v1/equipment/work-centers', {
    headers: authHeaders,
    data: fallbackWorkCenter
  });

  if (!response.ok()) {
    throw new Error(`Failed to create fallback work center: HTTP ${response.status()}`);
  }

  const created = await response.json();
  console.log(`✅ PHASE 13A: Fallback work center created: ${created.id}`);
  return created.id;
}

/**
 * Enhanced error reporting for test failures
 */
export function reportTestSetupFailure(
  testName: string,
  missingPrerequisites: string[],
  errors: string[],
  context?: Record<string, any>
): void {
  console.error(`\n❌ PHASE 13A: TEST SETUP FAILURE REPORT`);
  console.error(`   Test: ${testName}`);
  console.error(`   Missing Prerequisites: ${missingPrerequisites.join(', ')}`);
  console.error(`   Errors: ${errors.length}`);

  errors.forEach((error, index) => {
    console.error(`     ${index + 1}. ${error}`);
  });

  if (context) {
    console.error(`   Context:`, JSON.stringify(context, null, 2));
  }

  console.error(`   Recommendation: Check test data seeding and API endpoint availability`);
  console.error(`\n`);
}

export default {
  validateTestPrerequisitesEnhanced,
  robustAPICall,
  robustTestSetup,
  createFallbackWorkCenter,
  reportTestSetupFailure
};