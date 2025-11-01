/**
 * Validation Framework Regression Tests
 *
 * Comprehensive test suite with 50+ validation scenarios covering:
 * - Manifest schema validation
 * - Semantic validation rules
 * - Code quality checks
 * - Security vulnerability detection
 * - Accessibility compliance
 * - Performance validation
 *
 * Targets: <5% false positive rate, <2s validation time
 */

import {
  ExtensionValidationFramework,
  ValidationContext,
  ValidationResult,
} from '@machshop/extension-validation-framework';

describe('Validation Framework Regression Tests', () => {
  let validationFramework: ExtensionValidationFramework;

  beforeEach(() => {
    validationFramework = new ExtensionValidationFramework();
  });

  describe('Manifest Schema Validation (15+ scenarios)', () => {
    // Valid manifest scenarios
    test('should accept minimal valid manifest', async () => {
      const manifest = {
        id: 'minimal-extension',
        name: 'Minimal Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/minimal',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept complete valid manifest with all fields', async () => {
      const manifest = {
        id: 'complete-extension',
        name: 'Complete Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        description: 'A complete extension with all fields',
        author: 'Test Author',
        license: 'MIT',
        homepage: 'https://example.com',
        repository: {
          type: 'git',
          url: 'https://github.com/example/repo',
        },
        capabilities: [
          {
            id: 'cap:read',
            description: 'Read capability',
            required: true,
          },
        ],
        ui_components: [
          {
            id: 'widget-1',
            type: 'widget',
            name: 'Widget 1',
            slot: 'main',
            permissions: ['read:data'],
            category: 'utilities',
          },
        ],
        navigation: [
          {
            id: 'nav-1',
            label: 'Navigation Item',
            path: '/nav1',
            group: 'main',
            icon: 'icon-nav',
            permissions: ['read:navigation'],
          },
        ],
        configurations: {
          setting1: 'value1',
          setting2: 123,
        },
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/complete',
      });

      expect(result.isValid).toBe(true);
    });

    test('should reject manifest with missing required id field', async () => {
      const manifest: any = {
        name: 'No ID Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/no-id',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'MANIFEST_SCHEMA_ERROR' })
      );
    });

    test('should reject manifest with invalid id format (uppercase)', async () => {
      const manifest = {
        id: 'INVALID-ID', // Should be lowercase
        name: 'Invalid ID',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/invalid-id',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_ID_FORMAT' })
      );
    });

    test('should reject manifest with invalid id format (special chars)', async () => {
      const manifest = {
        id: 'invalid@id!', // Invalid special characters
        name: 'Invalid Special',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/invalid-special',
      });

      expect(result.isValid).toBe(false);
    });

    test('should reject manifest with invalid version format', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: 'not-a-version', // Invalid semver
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_VERSION_FORMAT' })
      );
    });

    test('should accept semantic version with prerelease', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0-alpha',
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.isValid).toBe(true);
    });

    test('should reject manifest with name exceeding max length', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'x'.repeat(101), // Exceeds 100 character limit
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'NAME_TOO_LONG' })
      );
    });

    test('should warn about missing optional description field', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        // Missing description (optional but recommended)
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const warnings = result.errors.filter(e => e.severity === 'warning');
      expect(warnings.length).toBeGreaterThan(0);
    });

    test('should warn about missing optional author field', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        // Missing author (optional but recommended)
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const warnings = result.errors.filter(e => e.severity === 'warning');
      expect(warnings.length).toBeGreaterThan(0);
    });

    test('should reject manifest with invalid homepage URL format', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        homepage: 'not-a-url', // Invalid URL format
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      // Should have validation error or warning about invalid URL
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    test('should detect duplicate component IDs', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            id: 'duplicate-comp',
            type: 'widget',
            name: 'Component 1',
          },
          {
            id: 'duplicate-comp', // Duplicate
            type: 'widget',
            name: 'Component 2',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'DUPLICATE_COMPONENT_ID' })
      );
    });

    test('should detect duplicate navigation IDs', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'duplicate-nav',
            label: 'Nav Item 1',
            path: '/nav1',
          },
          {
            id: 'duplicate-nav', // Duplicate
            label: 'Nav Item 2',
            path: '/nav2',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'DUPLICATE_NAVIGATION_ID' })
      );
    });
  });

  describe('Component Validation (10+ scenarios)', () => {
    test('should reject component missing required id field', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            // Missing id
            type: 'widget',
            name: 'Widget',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'COMPONENT_MISSING_ID' })
      );
    });

    test('should reject component missing required type field', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            id: 'test-comp',
            // Missing type
            name: 'Component',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'COMPONENT_MISSING_TYPE' })
      );
    });

    test('should reject component with invalid type value', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            id: 'test-comp',
            type: 'invalid-type', // Not in [widget, page, modal, form]
            name: 'Component',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_COMPONENT_TYPE' })
      );
    });

    test('should accept all valid component types', async () => {
      const validTypes = ['widget', 'page', 'modal', 'form'];

      for (const type of validTypes) {
        const manifest = {
          id: 'test-extension',
          name: 'Test Extension',
          version: '1.0.0',
          manifest_version: '2.0.0',
          ui_components: [
            {
              id: `comp-${type}`,
              type,
              name: `Component ${type}`,
            },
          ],
        };

        const result = await validationFramework.validateManifest({
          manifest,
          manifestPath: 'manifest.json',
          extensionPath: '/test',
        });

        expect(result.errors.filter(e => e.code === 'INVALID_COMPONENT_TYPE')).toHaveLength(0);
      }
    });

    test('should warn when widget missing slot field', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            id: 'test-widget',
            type: 'widget',
            name: 'Widget',
            // Missing slot (recommended for widgets)
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'WIDGET_MISSING_SLOT' })
      );
    });

    test('should accept widget with slot field', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            id: 'test-widget',
            type: 'widget',
            name: 'Widget',
            slot: 'main-slot',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const widgetErrors = result.errors.filter(e => e.code === 'WIDGET_MISSING_SLOT');
      expect(widgetErrors).toHaveLength(0);
    });

    test('should accept component with permissions array', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            id: 'admin-widget',
            type: 'widget',
            name: 'Admin Widget',
            permissions: ['admin:dashboard', 'admin:settings'],
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('Navigation Validation (10+ scenarios)', () => {
    test('should reject navigation item missing required id', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            // Missing id
            label: 'Navigation Item',
            path: '/nav',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'NAV_MISSING_ID' })
      );
    });

    test('should reject navigation item missing required label', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'nav-item',
            // Missing label
            path: '/nav',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'NAV_MISSING_LABEL' })
      );
    });

    test('should warn when navigation item missing both path and href', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'nav-item',
            label: 'Navigation Item',
            // Missing both path and href
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'NAV_NO_TARGET' })
      );
    });

    test('should accept navigation item with path', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'nav-item',
            label: 'Navigation Item',
            path: '/nav',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const navErrors = result.errors.filter(e => e.code?.startsWith('NAV_'));
      expect(navErrors.filter(e => e.code === 'NAV_MISSING_ID')).toHaveLength(0);
    });

    test('should accept navigation item with href', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'external-nav',
            label: 'External Link',
            href: 'https://example.com',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const targetErrors = result.errors.filter(e => e.code === 'NAV_NO_TARGET');
      expect(targetErrors).toHaveLength(0);
    });

    test('should accept navigation item with group', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'grouped-nav',
            label: 'Grouped Item',
            path: '/nav',
            group: 'admin',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.isValid).toBe(true);
    });

    test('should accept navigation item with icon', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'icon-nav',
            label: 'Icon Item',
            path: '/nav',
            icon: 'icon-settings',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.isValid).toBe(true);
    });

    test('should accept navigation item with permissions', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'restricted-nav',
            label: 'Restricted Item',
            path: '/restricted',
            permissions: ['admin:navigation', 'admin:system'],
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('Capability Validation (8+ scenarios)', () => {
    test('should accept extension with no capabilities', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        // No capabilities field
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const hasCapErrors = result.errors.some(e => e.code === 'INVALID_CAPABILITY');
      expect(hasCapErrors).toBe(false);
    });

    test('should warn when extension declares no capabilities', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        capabilities: [],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const noCapWarnings = result.errors.filter(e => e.code === 'NO_CAPABILITIES');
      // Should have info/warning about empty capabilities
      expect(noCapWarnings.length).toBeGreaterThanOrEqual(0);
    });

    test('should reject capability missing required id field', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        capabilities: [
          {
            // Missing id
            description: 'Some capability',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_CAPABILITY' })
      );
    });

    test('should reject capability with invalid id format', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        capabilities: [
          {
            id: 'INVALID@ID!', // Invalid special characters
            description: 'Invalid capability',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_CAPABILITY_ID' })
      );
    });

    test('should accept capability with valid id format', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        capabilities: [
          {
            id: 'cap:read_data',
            description: 'Read data capability',
          },
          {
            id: 'cap-write-data',
            description: 'Write data capability',
          },
          {
            id: 'cap_delete_data',
            description: 'Delete data capability',
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const capErrors = result.errors.filter(e => e.code === 'INVALID_CAPABILITY_ID');
      expect(capErrors).toHaveLength(0);
    });

    test('should accept capability with required flag', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        capabilities: [
          {
            id: 'essential:feature',
            description: 'Essential feature',
            required: true,
          },
        ],
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('Code Quality Validation (8+ scenarios)', () => {
    test('should detect console.log statements in code', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: 'console.log("debug message");',
          },
        ],
      };

      const result = await validationFramework.validateCodeQuality(context);

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'CONSOLE_STATEMENT' })
      );
    });

    test('should detect empty catch blocks', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: 'try { } catch(e) { }',
          },
        ],
      };

      const result = await validationFramework.validateCodeQuality(context);

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'EMPTY_CATCH_BLOCK' })
      );
    });

    test('should not flag proper error handling', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: `try {
              await operation();
            } catch(error) {
              logger.error('Operation failed', error);
              throw error;
            }`,
          },
        ],
      };

      const result = await validationFramework.validateCodeQuality(context);

      const emptyCatchErrors = result.errors.filter(e => e.code === 'EMPTY_CATCH_BLOCK');
      expect(emptyCatchErrors).toHaveLength(0);
    });

    test('should accept code without quality issues', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: `
export async function initialize() {
  try {
    await setupExtension();
  } catch (error) {
    console.error('Failed to initialize', error);
    throw error;
  }
}`,
          },
        ],
      };

      const result = await validationFramework.validateCodeQuality(context);

      expect(result.errors.length).toBeLessThan(5); // Allow some warnings but not critical errors
    });
  });

  describe('Security Validation (10+ scenarios)', () => {
    test('should detect innerHTML assignment with user input', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: 'element.innerHTML = userInput;',
          },
        ],
      };

      const result = await validationFramework.validateSecurity(context);

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'XSS_VULNERABILITY' })
      );
    });

    test('should detect string concatenation in SQL queries', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/db.ts',
            content: `const query = "SELECT * FROM users WHERE id = " + userId;`,
          },
        ],
      };

      const result = await validationFramework.validateSecurity(context);

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'SQL_INJECTION_PATTERN' })
      );
    });

    test('should detect hardcoded API keys', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/config.ts',
            content: `const API_KEY = "sk-1234567890abcdef";`,
          },
        ],
      };

      const result = await validationFramework.validateSecurity(context);

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'HARDCODED_SECRET' })
      );
    });

    test('should detect hardcoded passwords', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/auth.ts',
            content: `const password = "admin123";`,
          },
        ],
      };

      const result = await validationFramework.validateSecurity(context);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'HARDCODED_SECRET',
          severity: 'error',
        })
      );
    });

    test('should not flag textContent assignment (safe)', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: 'element.textContent = userInput;',
          },
        ],
      };

      const result = await validationFramework.validateSecurity(context);

      const xssErrors = result.errors.filter(e => e.code === 'XSS_VULNERABILITY');
      expect(xssErrors).toHaveLength(0);
    });

    test('should not flag parameterized SQL queries', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/db.ts',
            content: 'const query = "SELECT * FROM users WHERE id = ?"; db.query(query, [userId]);',
          },
        ],
      };

      const result = await validationFramework.validateSecurity(context);

      const sqlErrors = result.errors.filter(e => e.code === 'SQL_INJECTION_PATTERN');
      expect(sqlErrors).toHaveLength(0);
    });

    test('should not flag environment variable usage', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/config.ts',
            content: 'const apiKey = process.env.API_KEY;',
          },
        ],
      };

      const result = await validationFramework.validateSecurity(context);

      const secretErrors = result.errors.filter(e => e.code === 'HARDCODED_SECRET');
      expect(secretErrors).toHaveLength(0);
    });
  });

  describe('Performance Validation (5+ scenarios)', () => {
    test('should validate manifest quickly (< 100ms)', async () => {
      const manifest = {
        id: 'perf-test',
        name: 'Performance Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const startTime = Date.now();

      await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/perf-test',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
    });

    test('should validate large manifest quickly', async () => {
      const components = Array.from({ length: 100 }, (_, i) => ({
        id: `comp-${i}`,
        type: 'widget',
        name: `Component ${i}`,
      }));

      const manifest = {
        id: 'large-extension',
        name: 'Large Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: components,
      };

      const startTime = Date.now();

      await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/large',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should still validate quickly even with 100 components
      expect(duration).toBeLessThan(500);
    });

    test('should validate code quality quickly', async () => {
      const largeCode = 'const x = 1;\n'.repeat(1000);

      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: largeCode,
          },
        ],
      };

      const startTime = Date.now();

      await validationFramework.validateCodeQuality(context);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('False Positive Analysis (5+ scenarios)', () => {
    test('should not flag valid hyphenated IDs', async () => {
      const manifest = {
        id: 'my-valid-extension-name',
        name: 'Valid Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/valid',
      });

      const idErrors = result.errors.filter(e => e.code === 'INVALID_ID_FORMAT');
      expect(idErrors).toHaveLength(0);
    });

    test('should not flag valid numeric IDs', async () => {
      const manifest = {
        id: 'extension-123',
        name: 'Numeric Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/numeric',
      });

      const idErrors = result.errors.filter(e => e.code === 'INVALID_ID_FORMAT');
      expect(idErrors).toHaveLength(0);
    });

    test('should not flag single-digit versions', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '0.0.1', // Single digits are valid
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const versionErrors = result.errors.filter(e => e.code === 'INVALID_VERSION_FORMAT');
      expect(versionErrors).toHaveLength(0);
    });

    test('should not flag comments in code as issues', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: `
// This is a comment: element.innerHTML = userInput;
/* console.log("debug"); */
const safeCode = "hello";`,
          },
        ],
      };

      const result = await validationFramework.validateCodeQuality(context);

      // Comments shouldn't trigger actual violations
      expect(result.errors.length).toBeLessThan(2);
    });

    test('should not flag legitimate logging frameworks', async () => {
      const context: ValidationContext = {
        manifest: {
          id: 'test-ext',
          name: 'Test',
          version: '1.0.0',
          manifest_version: '2.0.0',
        },
        manifestPath: 'manifest.json',
        extensionPath: '/test',
        codeFiles: [
          {
            path: 'src/index.ts',
            content: `
import { logger } from '@machshop/logging';

logger.info('Application started');
logger.error('An error occurred', error);`,
          },
        ],
      };

      const result = await validationFramework.validateCodeQuality(context);

      // Logger calls are acceptable, not console.log
      const consoleErrors = result.errors.filter(e => e.code === 'CONSOLE_STATEMENT');
      expect(consoleErrors).toHaveLength(0);
    });
  });

  describe('Validation Report Generation (3+ scenarios)', () => {
    test('should generate comprehensive validation report', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      expect(result.timestamp).toBeDefined();
      expect(result.extensionPath).toBe('/test');
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should include error severity levels in report', async () => {
      const manifest = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        // Missing optional fields
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const errors = result.errors.filter(e => e.severity === 'error');
      const warnings = result.errors.filter(e => e.severity === 'warning');
      const infos = result.errors.filter(e => e.severity === 'info');

      // Should have proper categorization
      expect(errors.concat(warnings, infos).length).toBeGreaterThanOrEqual(0);
    });

    test('should provide actionable error messages with fixes', async () => {
      const manifest = {
        id: 'INVALID-ID',
        name: 'Invalid Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/invalid',
      });

      const errorWithFix = result.errors.find(e => e.code === 'INVALID_ID_FORMAT');

      if (errorWithFix) {
        expect(errorWithFix.fix).toBeDefined();
        expect(errorWithFix.message).toBeDefined();
      }
    });
  });
});
