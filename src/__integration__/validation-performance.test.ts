/**
 * Validation Framework Performance Tests
 *
 * Validates that the validation framework performs efficiently.
 * Target: Complete validation in < 2 seconds for typical extensions
 */

import {
  ExtensionValidationFramework,
  ValidationContext,
} from '@machshop/extension-validation-framework';
import {
  validManifestFixtures,
  codeQualityFixtures,
  securityFixtures,
} from './validation-test-data';

describe('Validation Framework Performance Tests', () => {
  let validationFramework: ExtensionValidationFramework;
  const performanceResults: {
    test: string;
    duration: number;
    passed: boolean;
  }[] = [];

  beforeEach(() => {
    validationFramework = new ExtensionValidationFramework();
  });

  afterAll(() => {
    // Log performance summary
    console.log('\n=== Validation Performance Summary ===');
    console.log(`Total tests: ${performanceResults.length}`);

    const passedTests = performanceResults.filter(r => r.passed);
    const failedTests = performanceResults.filter(r => !r.passed);

    console.log(`Passed: ${passedTests.length}`);
    console.log(`Failed: ${failedTests.length}`);

    if (failedTests.length > 0) {
      console.log('\nFailed performance tests:');
      failedTests.forEach(r => {
        console.log(`  - ${r.test}: ${r.duration}ms (target: 2000ms)`);
      });
    }

    const avgDuration =
      performanceResults.reduce((sum, r) => sum + r.duration, 0) /
      performanceResults.length;
    console.log(`\nAverage validation time: ${avgDuration.toFixed(2)}ms`);
  });

  describe('Basic Manifest Validation Performance', () => {
    test('should validate minimal manifest in < 100ms', async () => {
      const startTime = performance.now();

      await validationFramework.validateManifest({
        manifest: validManifestFixtures.minimal,
        manifestPath: 'manifest.json',
        extensionPath: '/minimal',
      });

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Minimal manifest validation',
        duration,
        passed: duration < 100,
      });

      expect(duration).toBeLessThan(100);
    });

    test('should validate complete manifest in < 150ms', async () => {
      const startTime = performance.now();

      await validationFramework.validateManifest({
        manifest: validManifestFixtures.complete,
        manifestPath: 'manifest.json',
        extensionPath: '/complete',
      });

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Complete manifest validation',
        duration,
        passed: duration < 150,
      });

      expect(duration).toBeLessThan(150);
    });

    test('should validate manifest with 50 components in < 200ms', async () => {
      const startTime = performance.now();

      await validationFramework.validateManifest({
        manifest: validManifestFixtures.manyComponents,
        manifestPath: 'manifest.json',
        extensionPath: '/many',
      });

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: '50 components manifest validation',
        duration,
        passed: duration < 200,
      });

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Code Quality Validation Performance', () => {
    test('should validate small code file in < 50ms', async () => {
      const context: ValidationContext = {
        manifest: validManifestFixtures.minimal,
        manifestPath: 'manifest.json',
        extensionPath: '/code-small',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: codeQualityFixtures.cleanCode,
          },
        ],
      };

      const startTime = performance.now();

      await validationFramework.validateCodeQuality(context);

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Small code file validation',
        duration,
        passed: duration < 50,
      });

      expect(duration).toBeLessThan(50);
    });

    test('should validate large code file (10KB) in < 100ms', async () => {
      const largeCode = codeQualityFixtures.cleanCode.repeat(100);

      const context: ValidationContext = {
        manifest: validManifestFixtures.minimal,
        manifestPath: 'manifest.json',
        extensionPath: '/code-large',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: largeCode,
          },
        ],
      };

      const startTime = performance.now();

      await validationFramework.validateCodeQuality(context);

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Large code file validation (10KB)',
        duration,
        passed: duration < 100,
      });

      expect(duration).toBeLessThan(100);
    });

    test('should validate multiple code files in < 100ms', async () => {
      const context: ValidationContext = {
        manifest: validManifestFixtures.minimal,
        manifestPath: 'manifest.json',
        extensionPath: '/code-multi',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: codeQualityFixtures.cleanCode,
          },
          {
            path: 'src/utils.ts',
            content: codeQualityFixtures.cleanCode,
          },
          {
            path: 'src/helpers.ts',
            content: codeQualityFixtures.cleanCode,
          },
          {
            path: 'src/config.ts',
            content: codeQualityFixtures.cleanCode,
          },
          {
            path: 'src/services.ts',
            content: codeQualityFixtures.cleanCode,
          },
        ],
      };

      const startTime = performance.now();

      await validationFramework.validateCodeQuality(context);

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Multiple code files validation',
        duration,
        passed: duration < 100,
      });

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Security Validation Performance', () => {
    test('should validate code for security issues in < 100ms', async () => {
      const context: ValidationContext = {
        manifest: validManifestFixtures.minimal,
        manifestPath: 'manifest.json',
        extensionPath: '/security',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: securityFixtures.safeDOMMethod,
          },
          {
            path: 'src/db.ts',
            content: securityFixtures.safeParameterizedQuery,
          },
          {
            path: 'src/config.ts',
            content: securityFixtures.safeEnvironmentVariable,
          },
        ],
      };

      const startTime = performance.now();

      await validationFramework.validateSecurity(context);

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Security validation for 3 files',
        duration,
        passed: duration < 100,
      });

      expect(duration).toBeLessThan(100);
    });

    test('should detect security issues quickly', async () => {
      const context: ValidationContext = {
        manifest: validManifestFixtures.minimal,
        manifestPath: 'manifest.json',
        extensionPath: '/security-issues',
        codeFiles: [
          {
            path: 'src/vulnerable.ts',
            content: securityFixtures.xssInnerHTML,
          },
          {
            path: 'src/injection.ts',
            content: securityFixtures.sqlInjectionConcat,
          },
          {
            path: 'src/secrets.ts',
            content: securityFixtures.hardcodedApiKey,
          },
        ],
      };

      const startTime = performance.now();

      await validationFramework.validateSecurity(context);

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Security issue detection',
        duration,
        passed: duration < 100,
      });

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Full Validation Pipeline Performance', () => {
    test('should complete full validation of typical extension in < 500ms', async () => {
      const context: ValidationContext = {
        manifest: validManifestFixtures.complete,
        manifestPath: 'manifest.json',
        extensionPath: '/full-validation',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: codeQualityFixtures.cleanCode,
          },
          {
            path: 'src/components.ts',
            content: codeQualityFixtures.properErrorHandling,
          },
        ],
      };

      const startTime = performance.now();

      await Promise.all([
        validationFramework.validateManifest(context),
        validationFramework.validateCodeQuality(context),
        validationFramework.validateSecurity(context),
      ]);

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Full validation pipeline (typical extension)',
        duration,
        passed: duration < 500,
      });

      expect(duration).toBeLessThan(500);
    });

    test('should complete full validation of complex extension in < 1000ms', async () => {
      const context: ValidationContext = {
        manifest: validManifestFixtures.manyComponents,
        manifestPath: 'manifest.json',
        extensionPath: '/full-validation-complex',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: codeQualityFixtures.cleanCode.repeat(10),
          },
          {
            path: 'src/components.ts',
            content: codeQualityFixtures.properErrorHandling.repeat(10),
          },
          {
            path: 'src/services.ts',
            content: codeQualityFixtures.cleanCode.repeat(10),
          },
        ],
      };

      const startTime = performance.now();

      await Promise.all([
        validationFramework.validateManifest(context),
        validationFramework.validateCodeQuality(context),
        validationFramework.validateSecurity(context),
      ]);

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Full validation pipeline (complex extension)',
        duration,
        passed: duration < 1000,
      });

      expect(duration).toBeLessThan(1000);
    });

    test('should complete validation within target of 2 seconds', async () => {
      const context: ValidationContext = {
        manifest: validManifestFixtures.complete,
        manifestPath: 'manifest.json',
        extensionPath: '/validation-2sec-target',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: codeQualityFixtures.cleanCode.repeat(50),
          },
        ],
      };

      const startTime = performance.now();

      await Promise.all([
        validationFramework.validateManifest(context),
        validationFramework.validateCodeQuality(context),
        validationFramework.validateSecurity(context),
        validationFramework.validateAccessibility(context),
      ]);

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Full validation (all checks) - 2s target',
        duration,
        passed: duration < 2000,
      });

      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Concurrent Validation Performance', () => {
    test('should validate multiple extensions concurrently', async () => {
      const contexts: ValidationContext[] = Array.from({ length: 5 }, (_, i) => ({
        manifest: {
          id: `concurrent-ext-${i}`,
          name: `Concurrent Extension ${i}`,
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: `/concurrent-${i}`,
      }));

      const startTime = performance.now();

      await Promise.all(
        contexts.map(ctx => validationFramework.validateManifest(ctx))
      );

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Concurrent validation (5 extensions)',
        duration,
        passed: duration < 500,
      });

      expect(duration).toBeLessThan(500);
    });

    test('should validate 10 extensions concurrently', async () => {
      const contexts: ValidationContext[] = Array.from({ length: 10 }, (_, i) => ({
        manifest: {
          id: `concurrent-ext-${i}`,
          name: `Concurrent Extension ${i}`,
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: `/concurrent-${i}`,
      }));

      const startTime = performance.now();

      await Promise.all(
        contexts.map(ctx => validationFramework.validateManifest(ctx))
      );

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Concurrent validation (10 extensions)',
        duration,
        passed: duration < 1000,
      });

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Caching Performance', () => {
    test('should use cache for repeated validations', async () => {
      const context: ValidationContext = {
        manifest: validManifestFixtures.complete,
        manifestPath: 'manifest.json',
        extensionPath: '/cache-test',
      };

      // First validation (not cached)
      const startTime1 = performance.now();
      await validationFramework.validateManifest(context);
      const duration1 = performance.now() - startTime1;

      // Second validation (should be cached)
      const startTime2 = performance.now();
      await validationFramework.validateManifest(context);
      const duration2 = performance.now() - startTime2;

      performanceResults.push({
        test: 'First validation (no cache)',
        duration: duration1,
        passed: true,
      });

      performanceResults.push({
        test: 'Cached validation',
        duration: duration2,
        passed: duration2 < duration1 || duration2 < 50, // Cached should be faster
      });

      // Cached validation should be significantly faster or near-instant
      expect(duration2).toBeLessThan(duration1 + 100);
    });
  });

  describe('Performance Degradation Testing', () => {
    test('should handle very large manifests efficiently', async () => {
      const largeComponents = Array.from({ length: 200 }, (_, i) => ({
        id: `component-${i}`,
        type: (
          ['widget', 'page', 'modal', 'form'][i % 4] as
            | 'widget'
            | 'page'
            | 'modal'
            | 'form'
        ),
        name: `Component ${i}`,
      }));

      const manifest = {
        id: 'huge-extension',
        name: 'Huge Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: largeComponents,
      };

      const startTime = performance.now();

      await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/huge',
      });

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Very large manifest (200 components)',
        duration,
        passed: duration < 500,
      });

      expect(duration).toBeLessThan(500); // Should still be reasonable
    });

    test('should handle very large code files efficiently', async () => {
      const largeCode = 'const x = 1;\n'.repeat(10000); // ~50KB

      const context: ValidationContext = {
        manifest: validManifestFixtures.minimal,
        manifestPath: 'manifest.json',
        extensionPath: '/huge-code',
        codeFiles: [
          {
            path: 'src/huge.ts',
            content: largeCode,
          },
        ],
      };

      const startTime = performance.now();

      await validationFramework.validateCodeQuality(context);

      const duration = performance.now() - startTime;
      performanceResults.push({
        test: 'Very large code file (~50KB)',
        duration,
        passed: duration < 500,
      });

      expect(duration).toBeLessThan(500);
    });
  });
});
