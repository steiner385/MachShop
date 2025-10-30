import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import DocumentationGenerator from '../../tools/doc-generator';
import { SchemaMetadata, ModelMetadata, FieldMetadata, EnumMetadata } from '../../tools/types/schema-metadata';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn(),
    mkdir: vi.fn()
  },
  existsSync: vi.fn()
}));

describe('DocumentationGenerator', () => {
  let generator: DocumentationGenerator;
  let mockMetadata: SchemaMetadata;

  beforeEach(() => {
    // Create mock metadata for testing
    const mockUserModel: ModelMetadata = {
      name: 'User',
      category: 'Personnel Management',
      isJunctionTable: false,
      fields: [
        {
          name: 'id',
          type: 'String',
          kind: 'scalar',
          isList: false,
          isOptional: false,
          isReadOnly: false,
          hasDefaultValue: true,
          defaultValue: 'cuid()',
          isGenerated: true,
          isId: true,
          isUnique: false,
          documentation: 'Unique identifier for the user',
          constraints: []
        },
        {
          name: 'username',
          type: 'String',
          kind: 'scalar',
          isList: false,
          isOptional: false,
          isReadOnly: false,
          hasDefaultValue: false,
          isGenerated: false,
          isId: false,
          isUnique: true,
          documentation: 'Unique username for authentication',
          constraints: []
        },
        {
          name: 'email',
          type: 'String',
          kind: 'scalar',
          isList: false,
          isOptional: false,
          isReadOnly: false,
          hasDefaultValue: false,
          isGenerated: false,
          isId: false,
          isUnique: true,
          constraints: []
        },
        {
          name: 'posts',
          type: 'Post',
          kind: 'object',
          isList: true,
          isOptional: false,
          isReadOnly: false,
          hasDefaultValue: false,
          isGenerated: false,
          isId: false,
          isUnique: false,
          constraints: []
        }
      ],
      relationships: [
        {
          type: 'one-to-many',
          relatedModel: 'Post',
          fieldName: 'posts',
          isRequired: false,
          description: 'Posts authored by this user'
        }
      ],
      primaryKey: { fields: ['id'] },
      uniqueFields: [
        { fields: ['username'] },
        { fields: ['email'] }
      ],
      indices: [
        { fields: ['username'] }
      ],
      documentation: 'User entity representing system users',
      businessRules: ['Username must be unique across the system'],
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    };

    const mockPostModel: ModelMetadata = {
      name: 'Post',
      category: 'Content Management',
      isJunctionTable: false,
      fields: [
        {
          name: 'id',
          type: 'String',
          kind: 'scalar',
          isList: false,
          isOptional: false,
          isReadOnly: false,
          hasDefaultValue: true,
          defaultValue: 'cuid()',
          isGenerated: true,
          isId: true,
          isUnique: false,
          constraints: []
        },
        {
          name: 'title',
          type: 'String',
          kind: 'scalar',
          isList: false,
          isOptional: false,
          isReadOnly: false,
          hasDefaultValue: false,
          isGenerated: false,
          isId: false,
          isUnique: false,
          constraints: []
        },
        {
          name: 'authorId',
          type: 'String',
          kind: 'scalar',
          isList: false,
          isOptional: false,
          isReadOnly: false,
          hasDefaultValue: false,
          isGenerated: false,
          isId: false,
          isUnique: false,
          relationFromFields: ['authorId'],
          relationToFields: ['id'],
          constraints: []
        }
      ],
      relationships: [
        {
          type: 'one-to-one',
          relatedModel: 'User',
          fieldName: 'author',
          isRequired: true,
          description: 'Author of this post'
        }
      ],
      primaryKey: { fields: ['id'] },
      uniqueFields: [],
      indices: [],
      documentation: 'Blog post entity'
    };

    const mockUserRoleEnum: EnumMetadata = {
      name: 'UserRole',
      values: [
        { name: 'ADMIN', documentation: 'Administrator role' },
        { name: 'USER', documentation: 'Regular user role' },
        { name: 'OPERATOR', documentation: 'Operator role' }
      ],
      documentation: 'Available user roles in the system'
    };

    mockMetadata = {
      models: [mockUserModel, mockPostModel],
      enums: [mockUserRoleEnum],
      generators: [
        {
          name: 'client',
          provider: 'prisma-client-js',
          config: {}
        }
      ],
      datasource: {
        name: 'db',
        provider: 'postgresql',
        url: 'env("DATABASE_URL")'
      },
      generatedAt: '2025-10-30T07:00:00.000Z',
      totalModels: 2,
      totalFields: 7,
      totalRelationships: 2
    };

    generator = new DocumentationGenerator(mockMetadata, './test-output');

    // Mock fs functions
    (fs.promises.writeFile as any).mockResolvedValue(undefined);
    (fs.promises.mkdir as any).mockResolvedValue(undefined);
    (fs.existsSync as any).mockReturnValue(true);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateMarkdownDocumentation', () => {
    it('should generate comprehensive Markdown documentation', async () => {
      await generator.generateMarkdownDocumentation();

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        path.join('./test-output', 'schema-tables.md'),
        expect.stringContaining('# Database Schema Documentation'),
        'utf8'
      );

      const markdownContent = (fs.promises.writeFile as any).mock.calls[0][1];

      // Check that it contains key sections
      expect(markdownContent).toContain('## Table of Contents');
      expect(markdownContent).toContain('## Models by Category');
      expect(markdownContent).toContain('## Table Definitions');
      expect(markdownContent).toContain('### User');
      expect(markdownContent).toContain('### Post');
    });

    it('should include model statistics in documentation', async () => {
      await generator.generateMarkdownDocumentation();

      const markdownContent = (fs.promises.writeFile as any).mock.calls[0][1];

      expect(markdownContent).toContain('**Total Models:** 2');
      expect(markdownContent).toContain('**Total Fields:** 7');
      expect(markdownContent).toContain('**Total Relationships:** 2');
    });

    it('should categorize models correctly in documentation', async () => {
      await generator.generateMarkdownDocumentation();

      const markdownContent = (fs.promises.writeFile as any).mock.calls[0][1];

      expect(markdownContent).toContain('### Personnel Management (1 tables)');
      expect(markdownContent).toContain('### Content Management (1 tables)');
    });

    it('should include field details with proper formatting', async () => {
      await generator.generateMarkdownDocumentation();

      const markdownContent = (fs.promises.writeFile as any).mock.calls[0][1];

      // Check field table headers
      expect(markdownContent).toContain('| Field | Type | Nullable | Default | Description |');

      // Check specific field entries
      expect(markdownContent).toContain('| id | String |  | cuid() | Unique identifier for the user |');
      expect(markdownContent).toContain('| username | String |  |  | Unique username for authentication |');
    });

    it('should include relationship information', async () => {
      await generator.generateMarkdownDocumentation();

      const markdownContent = (fs.promises.writeFile as any).mock.calls[0][1];

      expect(markdownContent).toContain('**Relationships (1):**');
      expect(markdownContent).toContain('| one-to-many | Post | posts |  |');
    });

    it('should include business rules when present', async () => {
      await generator.generateMarkdownDocumentation();

      const markdownContent = (fs.promises.writeFile as any).mock.calls[0][1];

      expect(markdownContent).toContain('**Business Rules:**');
      expect(markdownContent).toContain('- Username must be unique across the system');
    });
  });

  describe('generateHTMLDataDictionary', () => {
    it('should generate interactive HTML data dictionary', async () => {
      await generator.generateHTMLDataDictionary();

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        path.join('./test-output', 'data-dictionary.html'),
        expect.stringContaining('<!DOCTYPE html>'),
        'utf8'
      );

      const htmlContent = (fs.promises.writeFile as any).mock.calls[0][1];

      // Check for key HTML elements
      expect(htmlContent).toContain('<title>MachShop MES - Data Dictionary</title>');
      expect(htmlContent).toContain('.stats-card'); // CSS class definition
      expect(htmlContent).toContain('id="searchInput"');
      expect(htmlContent).toContain('id="categoryFilter"');
    });

    it('should include statistics dashboard in HTML', async () => {
      await generator.generateHTMLDataDictionary();

      const htmlContent = (fs.promises.writeFile as any).mock.calls[0][1];

      expect(htmlContent).toContain('<h3>2</h3>'); // Total tables
      expect(htmlContent).toContain('<h3>7</h3>'); // Total fields
      expect(htmlContent).toContain('<h3>1</h3>'); // Enumerations
    });

    it('should include search and filter functionality', async () => {
      await generator.generateHTMLDataDictionary();

      const htmlContent = (fs.promises.writeFile as any).mock.calls[0][1];

      expect(htmlContent).toContain('Search tables, fields, or descriptions');
      expect(htmlContent).toContain('All Categories');
      expect(htmlContent).toContain('Personnel Management');
      expect(htmlContent).toContain('Content Management');
    });
  });

  describe('generateCSVExport', () => {
    it('should generate CSV export with all fields', async () => {
      await generator.generateCSVExport();

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        path.join('./test-output', 'schema-export.csv'),
        expect.stringContaining('Table,Field,Type,Nullable,Default,Description,Category'),
        'utf8'
      );

      const csvContent = (fs.promises.writeFile as any).mock.calls[0][1];

      // Check that it contains model data
      expect(csvContent).toContain('User,id,String,No,cuid()');
      expect(csvContent).toContain('User,username,String,No,');
      expect(csvContent).toContain('Post,title,String,No,');
    });

    it('should handle semicolon replacement in descriptions', async () => {
      await generator.generateCSVExport();

      const csvContent = (fs.promises.writeFile as any).mock.calls[0][1];

      // Descriptions with commas should be replaced with semicolons
      expect(csvContent).not.toContain('Unique identifier, for the user');
    });
  });

  describe('generateJSONExport', () => {
    it('should generate JSON export of metadata', async () => {
      await generator.generateJSONExport();

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        path.join('./test-output', 'schema-metadata.json'),
        JSON.stringify(mockMetadata, null, 2),
        'utf8'
      );
    });
  });

  describe('generateRelationshipDocumentation', () => {
    it('should generate relationship documentation', async () => {
      await generator.generateRelationshipDocumentation();

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        path.join('./test-output', 'schema-relationships.md'),
        expect.stringContaining('# Database Relationships'),
        'utf8'
      );

      const relationshipContent = (fs.promises.writeFile as any).mock.calls[0][1];

      expect(relationshipContent).toContain('## Summary');
      expect(relationshipContent).toContain('**Total Relationships:** 2');
      expect(relationshipContent).toContain('**One-to-One:** 1');
      expect(relationshipContent).toContain('**One-to-Many:** 1');
      expect(relationshipContent).toContain('| From Table | From Field | Relationship Type | To Table |');
    });
  });

  describe('generateSummaryReport', () => {
    it('should generate comprehensive summary report', async () => {
      await generator.generateSummaryReport();

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        path.join('./test-output', 'schema-summary.md'),
        expect.stringContaining('# Schema Analysis Summary'),
        'utf8'
      );

      const summaryContent = (fs.promises.writeFile as any).mock.calls[0][1];

      expect(summaryContent).toContain('## Database Overview');
      expect(summaryContent).toContain('- **Total Models:** 2');
      expect(summaryContent).toContain('## Model Distribution by Category');
      expect(summaryContent).toContain('## Field Type Distribution');
      expect(summaryContent).toContain('## Largest Tables');
      expect(summaryContent).toContain('## Most Connected Tables');
    });
  });

  describe('generateAll', () => {
    it('should generate all documentation formats', async () => {
      await generator.generateAll();

      // Should call mkdir to ensure output directory exists
      expect(fs.promises.mkdir).toHaveBeenCalledWith('./test-output', { recursive: true });

      // Should generate all formats
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(6);

      const writeCalls = (fs.promises.writeFile as any).mock.calls;
      const filenames = writeCalls.map((call: any) => path.basename(call[0]));

      expect(filenames).toContain('schema-tables.md');
      expect(filenames).toContain('data-dictionary.html');
      expect(filenames).toContain('schema-export.csv');
      expect(filenames).toContain('schema-metadata.json');
      expect(filenames).toContain('schema-relationships.md');
      expect(filenames).toContain('schema-summary.md');
    });
  });

  describe('error handling', () => {
    it('should handle write errors gracefully', async () => {
      (fs.promises.writeFile as any).mockRejectedValue(new Error('Write failed'));

      await expect(generator.generateMarkdownDocumentation()).rejects.toThrow('Write failed');
    });

    it('should handle empty metadata gracefully', async () => {
      const emptyMetadata: SchemaMetadata = {
        models: [],
        enums: [],
        generators: [],
        datasource: { name: 'db', provider: 'postgresql', url: 'test' },
        generatedAt: '2025-10-30T07:00:00.000Z',
        totalModels: 0,
        totalFields: 0,
        totalRelationships: 0
      };

      const emptyGenerator = new DocumentationGenerator(emptyMetadata, './test-output');

      await emptyGenerator.generateMarkdownDocumentation();

      const markdownContent = (fs.promises.writeFile as any).mock.calls[0][1];
      expect(markdownContent).toContain('**Total Models:** 0');
      expect(markdownContent).toContain('**Total Fields:** 0');
    });
  });

  describe('utility functions', () => {
    it('should group models by category correctly', async () => {
      await generator.generateMarkdownDocumentation();

      const markdownContent = (fs.promises.writeFile as any).mock.calls[0][1];

      // Should group models by their categories
      expect(markdownContent).toContain('### Personnel Management (1 tables)');
      expect(markdownContent).toContain('### Content Management (1 tables)');
    });

    it('should calculate relationship statistics correctly', async () => {
      await generator.generateRelationshipDocumentation();

      const relationshipContent = (fs.promises.writeFile as any).mock.calls[0][1];

      expect(relationshipContent).toContain('**Total Relationships:** 2');
      expect(relationshipContent).toContain('**One-to-One:** 1');
      expect(relationshipContent).toContain('**One-to-Many:** 1');
      expect(relationshipContent).toContain('**Many-to-Many:** 0');
    });
  });
});