/**
 * CLI Integration Tests
 *
 * Tests for the mach-ext CLI tool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateManifestSchema } from '../utils/manifest-validator';
import { TestRunner } from '../utils/test-runner';
import { DeploymentService } from '../utils/deployment-service';

describe('Extension CLI', () => {
  describe('Manifest Validation', () => {
    it('should validate correct manifest', () => {
      const manifest = {
        name: 'my-extension',
        type: 'ui-component',
        version: '1.0.0',
        description: 'Test extension',
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject manifest with missing required fields', () => {
      const manifest = {
        name: 'my-extension',
        // missing type, version, description
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate extension type', () => {
      const manifest = {
        name: 'my-extension',
        type: 'invalid-type',
        version: '1.0.0',
        description: 'Test extension',
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'type')
      ).toBe(true);
    });

    it('should validate semantic versioning', () => {
      const manifest = {
        name: 'my-extension',
        type: 'ui-component',
        version: 'not-a-version',
        description: 'Test extension',
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'version')
      ).toBe(true);
    });

    it('should validate name format', () => {
      const manifest = {
        name: 'My Extension', // should be lowercase with hyphens
        type: 'ui-component',
        version: '1.0.0',
        description: 'Test extension',
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'name')
      ).toBe(true);
    });

    it('should provide warnings in strict mode', () => {
      const manifest = {
        name: 'my-extension',
        type: 'ui-component',
        version: '1.0.0',
        description: 'Test extension',
        // missing optional fields like repository, bugs, homepage
      };

      const result = validateManifestSchema(manifest, { strict: true });
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Test Runner', () => {
    it('should initialize test runner with config', () => {
      const runner = new TestRunner({
        projectDir: '/path/to/project',
        watch: false,
        coverage: false,
      });

      expect(runner).toBeDefined();
    });

    it('should generate JUnit XML format', async () => {
      const runner = new TestRunner({
        projectDir: '/path/to/project',
        format: 'junit',
      });

      const results = await runner.run();
      expect(results.junit).toBeDefined();
      expect(results.junit).toContain('<?xml');
      expect(results.junit).toContain('testsuites');
    });

    it('should track test statistics', async () => {
      const runner = new TestRunner({
        projectDir: '/path/to/project',
      });

      const results = await runner.run();
      expect(results.total).toBeGreaterThan(0);
      expect(results.passed).toBeLessThanOrEqual(results.total);
      expect(results.failed).toBeLessThanOrEqual(results.total);
      expect(results.skipped).toBeLessThanOrEqual(results.total);
    });

    it('should generate coverage report', async () => {
      const runner = new TestRunner({
        projectDir: '/path/to/project',
        coverage: true,
      });

      const results = await runner.run();
      expect(results.coverage).toBeDefined();
      expect(results.coverage?.statements).toBeGreaterThanOrEqual(0);
      expect(results.coverage?.statements).toBeLessThanOrEqual(100);
    });
  });

  describe('Deployment Service', () => {
    let service: DeploymentService;

    beforeEach(() => {
      service = new DeploymentService({
        registryUrl: 'https://registry.test.io',
        apiKey: 'test-api-key',
        environment: 'staging',
      });
    });

    it('should initialize deployment service', () => {
      expect(service).toBeDefined();
    });

    it('should deploy extension', async () => {
      const result = await service.deploy({
        manifest: {
          name: 'test-ext',
          type: 'ui-component',
          version: '1.0.0',
        },
        projectDir: '/path/to/project',
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBeDefined();
      expect(result.status).toBe('preview');
    });

    it('should generate unique deployment IDs', async () => {
      const manifest = {
        name: 'test-ext',
        type: 'ui-component',
        version: '1.0.0',
      };

      const result1 = await service.deploy({
        manifest,
        projectDir: '/path/to/project',
        dryRun: true,
      });

      const result2 = await service.deploy({
        manifest,
        projectDir: '/path/to/project',
        dryRun: true,
      });

      expect(result1.deploymentId).not.toBe(result2.deploymentId);
    });

    it('should track deployment duration', async () => {
      const result = await service.deploy({
        manifest: {
          name: 'test-ext',
          type: 'ui-component',
          version: '1.0.0',
        },
        projectDir: '/path/to/project',
        dryRun: true,
      });

      expect(result.duration).toBeGreaterThan(0);
    });

    it('should collect test results', async () => {
      const result = await service.deploy({
        manifest: {
          name: 'test-ext',
          type: 'ui-component',
          version: '1.0.0',
        },
        projectDir: '/path/to/project',
        dryRun: true,
      });

      expect(result.testsRun).toBe(3);
      expect(result.testsPassed).toBe(3);
    });
  });

  describe('Extension Types', () => {
    const validTypes = [
      'ui-component',
      'business-logic',
      'data-model',
      'integration',
      'compliance',
      'infrastructure',
    ];

    validTypes.forEach((type) => {
      it(`should accept ${type} extension type`, () => {
        const manifest = {
          name: 'test-ext',
          type,
          version: '1.0.0',
          description: 'Test extension',
        };

        const result = validateManifestSchema(manifest);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Dependency Validation', () => {
    it('should validate extension dependencies', () => {
      const manifest = {
        name: 'my-extension',
        type: 'ui-component',
        version: '1.0.0',
        description: 'Test extension',
        dependencies: [
          { name: 'base-extension', version: '1.0.0' },
          { name: 'utils-extension', version: '^2.0.0' },
        ],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid dependency format', () => {
      const manifest = {
        name: 'my-extension',
        type: 'ui-component',
        version: '1.0.0',
        description: 'Test extension',
        dependencies: [
          { name: 'base-extension' }, // missing version
        ],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
    });
  });

  describe('Permission Validation', () => {
    it('should accept permissions array', () => {
      const manifest = {
        name: 'my-extension',
        type: 'business-logic',
        version: '1.0.0',
        description: 'Test extension',
        permissions: ['read:database', 'write:database', 'execute:webhooks'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(true);
    });
  });
});
