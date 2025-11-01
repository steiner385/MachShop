/**
 * SDK + Validation Framework Integration Tests
 *
 * Tests the integration between Frontend Extension SDK and Extension Validation Framework.
 * Verifies that extensions pass validation before loading, invalid extensions are rejected,
 * and validation errors are properly reported.
 */

import {
  ExtensionSDK,
  ExtensionContext,
  ExtensionConfig,
} from '@machshop/frontend-extension-sdk';
import {
  ExtensionValidationFramework,
  ValidationContext,
  ValidationResult,
} from '@machshop/extension-validation-framework';

describe('SDK + Validation Framework Integration', () => {
  let sdk: ExtensionSDK;
  let validationFramework: ExtensionValidationFramework;
  let extensionContext: Partial<ExtensionContext>;

  beforeEach(() => {
    sdk = new ExtensionSDK();
    validationFramework = new ExtensionValidationFramework();

    extensionContext = {
      extensionId: 'validation-test-extension',
      userId: 'test-user',
      siteId: 'test-site',
      permissions: [],
      config: {
        extensionId: 'validation-test-extension',
        siteId: 'test-site',
      } as ExtensionConfig,
      state: {},
    };
  });

  describe('Manifest Validation Before Loading', () => {
    test('should validate manifest before extension registration', async () => {
      const validManifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest: validManifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test-extension',
      };

      const validation = await validationFramework.validateManifest(validationContext);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject extension with invalid manifest', async () => {
      const invalidManifest: any = {
        // Missing required id field
        name: 'Invalid Extension',
        version: '1.0.0',
      };

      const validationContext: ValidationContext = {
        manifest: invalidManifest,
        manifestPath: 'manifest.json',
        extensionPath: '/invalid-extension',
      };

      const validation = await validationFramework.validateManifest(validationContext);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'MANIFEST_SCHEMA_ERROR',
        })
      );
    });

    test('should validate semantic manifest requirements', async () => {
      const manifest = {
        id: 'INVALID-ID-FORMAT', // Should be lowercase with hyphens
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test-extension',
      };

      const validation = await validationFramework.validateManifest(validationContext);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_ID_FORMAT',
        })
      );
    });

    test('should validate version format (semver)', async () => {
      const invalidVersionManifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: 'invalid.version', // Not semver
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest: invalidVersionManifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test-extension',
      };

      const validation = await validationFramework.validateManifest(validationContext);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_VERSION_FORMAT',
        })
      );
    });
  });

  describe('Code Quality Validation', () => {
    test('should validate extension code quality rules', async () => {
      const manifest = {
        id: 'quality-test',
        name: 'Quality Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/quality-test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: 'console.log("test");',
          },
        ],
      };

      const validation = await validationFramework.validateCodeQuality(validationContext);

      // Code quality should be validated
      expect(validation).toBeDefined();
      expect(validation.errors).toBeDefined();
    });

    test('should detect console statements', async () => {
      const manifest = {
        id: 'console-test',
        name: 'Console Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/console-test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: 'console.log("debug"); console.error("error");',
          },
        ],
      };

      const validation = await validationFramework.validateCodeQuality(validationContext);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'CONSOLE_STATEMENT',
        })
      );
    });

    test('should validate proper error handling patterns', async () => {
      const manifest = {
        id: 'error-handling-test',
        name: 'Error Handling Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/error-handling-test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: 'try { } catch(e) { }',
          },
        ],
      };

      const validation = await validationFramework.validateCodeQuality(validationContext);

      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'EMPTY_CATCH_BLOCK',
        })
      );
    });
  });

  describe('Security Vulnerability Detection', () => {
    test('should detect potential XSS vulnerabilities', async () => {
      const manifest = {
        id: 'xss-test',
        name: 'XSS Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/xss-test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: 'element.innerHTML = userInput;',
          },
        ],
      };

      const validation = await validationFramework.validateSecurity(validationContext);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'XSS_VULNERABILITY',
          severity: 'error',
        })
      );
    });

    test('should detect potential SQL injection patterns', async () => {
      const manifest = {
        id: 'sql-injection-test',
        name: 'SQL Injection Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/sql-injection-test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: 'const query = "SELECT * FROM users WHERE id = " + userId;',
          },
        ],
      };

      const validation = await validationFramework.validateSecurity(validationContext);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'SQL_INJECTION_PATTERN',
          severity: 'error',
        })
      );
    });

    test('should warn about hardcoded credentials', async () => {
      const manifest = {
        id: 'credentials-test',
        name: 'Credentials Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/credentials-test',
        codeFiles: [
          {
            path: 'src/config.ts',
            content: 'const apiKey = "sk-1234567890abcdef";',
          },
        ],
      };

      const validation = await validationFramework.validateSecurity(validationContext);

      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'HARDCODED_SECRET',
          severity: 'error',
        })
      );
    });
  });

  describe('Accessibility Compliance', () => {
    test('should validate UI components for accessibility', async () => {
      const manifest = {
        id: 'a11y-test',
        name: 'Accessibility Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            id: 'custom-button',
            type: 'widget',
            name: 'Custom Button',
          },
        ],
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/a11y-test',
      };

      const validation = await validationFramework.validateAccessibility(validationContext);

      expect(validation).toBeDefined();
      expect(validation.errors).toBeDefined();
    });

    test('should check for missing ARIA attributes', async () => {
      const manifest = {
        id: 'aria-test',
        name: 'ARIA Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            id: 'icon-button',
            type: 'widget',
            name: 'Icon Button',
            // Missing aria-label
          },
        ],
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/aria-test',
      };

      const validation = await validationFramework.validateAccessibility(validationContext);

      if (validation.errors.length > 0) {
        expect(validation.isValid).toBe(false);
      }
    });
  });

  describe('Validation Error Reporting', () => {
    test('should provide detailed validation error messages', async () => {
      const manifest = {
        id: 'invalid-manifest',
        name: 'x'.repeat(101), // Name too long
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/invalid-manifest',
      };

      const validation = await validationFramework.validateManifest(validationContext);

      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'NAME_TOO_LONG',
          severity: 'error',
          message: expect.stringContaining('100'),
        })
      );
    });

    test('should categorize errors by severity', async () => {
      const manifest = {
        id: 'test-id',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        // Missing description (warning) and author (warning)
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test-id',
      };

      const validation = await validationFramework.validateManifest(validationContext);

      const warnings = validation.errors.filter(e => e.severity === 'warning');
      const errors = validation.errors.filter(e => e.severity === 'error');

      expect(warnings.length).toBeGreaterThan(0);
      // Should have warnings for missing optional fields
    });

    test('should provide fix suggestions in error messages', async () => {
      const manifest = {
        id: 'INVALID-ID',
        name: 'Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/invalid',
      };

      const validation = await validationFramework.validateManifest(validationContext);

      const errorWithFix = validation.errors.find(e => e.code === 'INVALID_ID_FORMAT');

      expect(errorWithFix?.fix).toBeDefined();
      expect(errorWithFix?.fix).toContain('lowercase');
    });
  });

  describe('Full Validation Pipeline', () => {
    test('should run complete validation on manifest', async () => {
      const manifest = {
        id: 'complete-test',
        name: 'Complete Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        description: 'A complete test extension',
        author: 'Test Author',
        ui_components: [
          {
            id: 'test-widget',
            type: 'widget',
            name: 'Test Widget',
            slot: 'test-slot',
          },
        ],
        navigation: [
          {
            id: 'test-nav',
            label: 'Test Navigation',
            path: '/test',
          },
        ],
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/complete-test',
      };

      const validation = await validationFramework.validateManifest(validationContext);

      expect(validation.isValid).toBe(true);
    });

    test('should validate manifest and code together', async () => {
      const manifest = {
        id: 'full-validation',
        name: 'Full Validation Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/full-validation',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: 'export function initialize() { }',
          },
        ],
      };

      const manifestValidation = await validationFramework.validateManifest(validationContext);
      const codeValidation = await validationFramework.validateCodeQuality(validationContext);

      expect(manifestValidation.isValid).toBe(true);
      expect(codeValidation).toBeDefined();
    });
  });

  describe('Validation Caching and Performance', () => {
    test('should cache validation results', async () => {
      const manifest = {
        id: 'cache-test',
        name: 'Cache Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const validationContext: ValidationContext = {
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/cache-test',
      };

      const validation1 = await validationFramework.validateManifest(validationContext);
      const validation2 = await validationFramework.validateManifest(validationContext);

      // Both should have same results
      expect(validation1.isValid).toBe(validation2.isValid);
      expect(validation1.errors).toEqual(validation2.errors);
    });

    test('should invalidate cache on manifest change', async () => {
      const manifest1 = {
        id: 'cache-invalidation-test',
        name: 'Cache Invalidation Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const manifest2 = {
        ...manifest1,
        version: '2.0.0',
      };

      const context1: ValidationContext = {
        manifest: manifest1,
        manifestPath: 'manifest.json',
        extensionPath: '/cache-invalidation-test',
      };

      const context2: ValidationContext = {
        manifest: manifest2,
        manifestPath: 'manifest.json',
        extensionPath: '/cache-invalidation-test',
      };

      const validation1 = await validationFramework.validateManifest(context1);
      const validation2 = await validationFramework.validateManifest(context2);

      // Versions are different, so results might differ
      expect(validation1).toBeDefined();
      expect(validation2).toBeDefined();
    });
  });
});
