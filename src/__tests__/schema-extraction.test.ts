/**
 * Schema Extraction Tests
 * Issue #167: SDK & Extensibility: Automated Data Dictionary & CI/CD Integration
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SchemaExtractor, SchemaMetadata } from '../../scripts/schema-extractor';

describe('Schema Extractor', () => {
  let extractor: SchemaExtractor;
  const testOutputDir = './test-schema-output';

  beforeAll(() => {
    extractor = new SchemaExtractor('./prisma/schema.prisma', testOutputDir);
    // Create output directory for tests
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test output
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
  });

  describe('extractSchema', () => {
    it('should successfully extract schema metadata', () => {
      const metadata = extractor.extractSchema();

      expect(metadata).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.lastUpdated).toBeDefined();
      expect(Array.isArray(metadata.models)).toBe(true);
      expect(typeof metadata.enums).toBe('object');
    });

    it('should extract models with correct structure', () => {
      const metadata = extractor.extractSchema();

      for (const model of metadata.models) {
        expect(model.name).toBeDefined();
        expect(typeof model.name).toBe('string');
        expect(model.pluralName).toBeDefined();
        expect(Array.isArray(model.fields)).toBe(true);
        expect(Array.isArray(model.relationships)).toBe(true);
      }
    });

    it('should extract field definitions correctly', () => {
      const metadata = extractor.extractSchema();

      // Find a model with fields
      const modelWithFields = metadata.models.find(m => m.fields.length > 0);
      expect(modelWithFields).toBeDefined();

      if (modelWithFields) {
        for (const field of modelWithFields.fields) {
          expect(field.name).toBeDefined();
          expect(field.type).toBeDefined();
          expect(typeof field.required).toBe('boolean');
        }
      }
    });

    it('should handle prisma enums', () => {
      const metadata = extractor.extractSchema();

      const enums = Object.keys(metadata.enums);
      expect(Array.isArray(enums)).toBe(true);

      for (const enumName of enums) {
        const enumValues = metadata.enums[enumName];
        expect(Array.isArray(enumValues)).toBe(true);
        expect(enumValues.length).toBeGreaterThan(0);
      }
    });

    it('should throw error for non-existent schema file', () => {
      const invalidExtractor = new SchemaExtractor(
        './non-existent/schema.prisma',
        testOutputDir
      );

      expect(() => invalidExtractor.extractSchema()).toThrow();
    });
  });

  describe('generateDocumentation', () => {
    it('should generate valid markdown documentation', () => {
      extractor.extractSchema();
      const doc = extractor.generateDocumentation();

      expect(doc).toBeDefined();
      expect(typeof doc).toBe('string');
      expect(doc.length).toBeGreaterThan(0);
    });

    it('should include model sections in documentation', () => {
      extractor.extractSchema();
      const doc = extractor.generateDocumentation();

      expect(doc).toContain('# Automated Database Schema Documentation');
      expect(doc).toContain('## Models');
    });

    it('should include table of contents', () => {
      extractor.extractSchema();
      const doc = extractor.generateDocumentation();

      expect(doc).toContain('## Table of Contents');
      expect(doc).toContain('1. [Models](#models)');
    });

    it('should document enums if present', () => {
      extractor.extractSchema();
      const doc = extractor.generateDocumentation();

      // Check if enums section exists when enums are present
      const metadata = extractor.extractSchema();
      if (Object.keys(metadata.enums).length > 0) {
        expect(doc).toContain('## Enums');
      }
    });
  });

  describe('generateERD', () => {
    it('should generate valid mermaid ERD', () => {
      extractor.extractSchema();
      const erd = extractor.generateERD();

      expect(erd).toBeDefined();
      expect(typeof erd).toBe('string');
      expect(erd).toContain('erDiagram');
    });

    it('should include entity definitions', () => {
      extractor.extractSchema();
      const erd = extractor.generateERD();

      // Should have at least one entity
      expect(erd.match(/\s+{\s*$/m)).toBeDefined();
    });
  });

  describe('File Operations', () => {
    it('should save metadata to JSON file', () => {
      extractor.extractSchema();
      extractor.saveMetadata();

      const metadataPath = path.join(testOutputDir, 'schema-metadata.json');
      expect(fs.existsSync(metadataPath)).toBe(true);

      // Verify valid JSON
      const content = fs.readFileSync(metadataPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.models).toBeDefined();
      expect(parsed.enums).toBeDefined();
    });

    it('should save documentation to markdown file', () => {
      extractor.extractSchema();
      const doc = extractor.generateDocumentation();
      extractor.saveDocumentation(doc);

      const docPath = path.join(testOutputDir, 'SCHEMA_DOCUMENTATION.md');
      expect(fs.existsSync(docPath)).toBe(true);

      const content = fs.readFileSync(docPath, 'utf-8');
      expect(content).toContain('# Automated Database Schema Documentation');
    });

    it('should save ERD to mermaid file', () => {
      extractor.extractSchema();
      const erd = extractor.generateERD();
      extractor.saveERD(erd);

      const erdPath = path.join(testOutputDir, 'schema-erd.mmd');
      expect(fs.existsSync(erdPath)).toBe(true);

      const content = fs.readFileSync(erdPath, 'utf-8');
      expect(content).toContain('erDiagram');
    });

    it('should create output directory if not exists', () => {
      const newOutputDir = path.join(testOutputDir, 'nested', 'output');
      const newExtractor = new SchemaExtractor(
        './prisma/schema.prisma',
        newOutputDir
      );

      newExtractor.extractSchema();
      newExtractor.saveMetadata();

      expect(fs.existsSync(newOutputDir)).toBe(true);

      // Cleanup
      fs.rmSync(path.join(testOutputDir, 'nested'), { recursive: true });
    });
  });

  describe('Metadata Quality', () => {
    it('should have valid version format', () => {
      const metadata = extractor.extractSchema();

      expect(metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have recent lastUpdated timestamp', () => {
      const metadata = extractor.extractSchema();
      const lastUpdated = new Date(metadata.lastUpdated);
      const now = new Date();

      // Should be within last 5 seconds
      expect(now.getTime() - lastUpdated.getTime()).toBeLessThan(5000);
    });

    it('should not have duplicate model names', () => {
      const metadata = extractor.extractSchema();
      const modelNames = metadata.models.map(m => m.name);
      const uniqueNames = new Set(modelNames);

      expect(modelNames.length).toBe(uniqueNames.size);
    });

    it('should generate valid plural names', () => {
      const metadata = extractor.extractSchema();

      for (const model of metadata.models) {
        expect(model.pluralName).toBeDefined();
        expect(model.pluralName.length).toBeGreaterThan(model.name.length);
        expect(model.pluralName).not.toBe(model.name);
      }
    });
  });

  describe('Complete Pipeline', () => {
    it('should run full extraction pipeline successfully', async () => {
      const pipelineDir = path.join(testOutputDir, 'pipeline');
      const pipelineExtractor = new SchemaExtractor(
        './prisma/schema.prisma',
        pipelineDir
      );

      // Run complete pipeline
      await pipelineExtractor.run();

      // Verify all files were created
      expect(
        fs.existsSync(path.join(pipelineDir, 'schema-metadata.json'))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(pipelineDir, 'SCHEMA_DOCUMENTATION.md'))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(pipelineDir, 'schema-erd.mmd'))
      ).toBe(true);

      // Cleanup
      fs.rmSync(pipelineDir, { recursive: true });
    });
  });

  describe('Documentation Quality', () => {
    it('should generate valid markdown syntax', () => {
      extractor.extractSchema();
      const doc = extractor.generateDocumentation();

      // Check for basic markdown structure
      expect(doc).toMatch(/^#+ /m); // Headers
      expect(doc).toMatch(/\|.*\|.*\|/m); // Tables
      expect(doc).toMatch(/\n\n/); // Proper spacing
    });

    it('should include all models in documentation', () => {
      const metadata = extractor.extractSchema();
      const doc = extractor.generateDocumentation();

      for (const model of metadata.models) {
        expect(doc).toContain(`### ${model.name}`);
      }
    });

    it('should include all enums in documentation', () => {
      const metadata = extractor.extractSchema();
      const doc = extractor.generateDocumentation();

      for (const enumName of Object.keys(metadata.enums)) {
        if (Object.keys(metadata.enums).length > 0) {
          expect(doc).toContain(`### ${enumName}`);
        }
      }
    });
  });
});
