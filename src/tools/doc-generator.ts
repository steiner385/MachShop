/**
 * Documentation Generator
 * Generates multiple documentation formats from schema metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  SchemaMetadata,
  ModelMetadata,
  FieldMetadata,
  RelationshipMetadata
} from './types/schema-metadata';

export class DocumentationGenerator {
  private metadata: SchemaMetadata;
  private outputDir: string;

  constructor(metadata: SchemaMetadata, outputDir: string = './docs/generated') {
    this.metadata = metadata;
    this.outputDir = outputDir;
  }

  /**
   * Generate all documentation formats
   */
  async generateAll(): Promise<void> {
    await this.ensureOutputDir();

    console.log('📝 Generating comprehensive data dictionary documentation...');

    await Promise.all([
      this.generateMarkdownDocumentation(),
      this.generateHTMLDataDictionary(),
      this.generateCSVExport(),
      this.generateJSONExport(),
      this.generateRelationshipDocumentation(),
      this.generateSummaryReport()
    ]);

    console.log('✅ All documentation formats generated successfully!');
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDir(): Promise<void> {
    await fs.promises.mkdir(this.outputDir, { recursive: true });
  }

  /**
   * Generate comprehensive Markdown documentation
   */
  async generateMarkdownDocumentation(): Promise<void> {
    const content = this.buildMarkdownContent();
    const outputPath = path.join(this.outputDir, 'schema-tables.md');
    await fs.promises.writeFile(outputPath, content, 'utf8');
    console.log(`📄 Markdown documentation: ${outputPath}`);
  }

  /**
   * Build Markdown content
   */
  private buildMarkdownContent(): string {
    const { models, enums, totalModels, totalFields, totalRelationships, generatedAt } = this.metadata;

    let content = `# Database Schema Documentation

> **Generated:** ${new Date(generatedAt).toLocaleString()}
> **Total Models:** ${totalModels}
> **Total Fields:** ${totalFields}
> **Total Relationships:** ${totalRelationships}

## Overview

This document provides comprehensive documentation for the MachShop Manufacturing Execution System (MES) database schema. The schema implements ISA-95 standards and supports enterprise manufacturing operations across ${totalModels} interconnected data models.

## Table of Contents

- [Models by Category](#models-by-category)
- [Table Definitions](#table-definitions)
- [Enumerations](#enumerations)
- [Relationship Summary](#relationship-summary)

## Models by Category

`;

    // Group models by category
    const modelsByCategory = this.groupModelsByCategory();

    for (const [category, categoryModels] of Object.entries(modelsByCategory)) {
      content += `\n### ${category} (${categoryModels.length} tables)\n\n`;
      content += '| Table | Description | Fields | Relationships |\n';
      content += '|-------|-------------|--------|---------------|\n';

      for (const model of categoryModels) {
        const description = model.documentation?.split('\n')[0] || 'No description available';
        content += `| [${model.name}](#${model.name.toLowerCase()}) | ${description} | ${model.fields.length} | ${model.relationships.length} |\n`;
      }
    }

    content += '\n## Table Definitions\n\n';

    // Generate detailed table documentation
    for (const model of models) {
      content += this.generateModelMarkdown(model);
    }

    // Add enums section
    if (enums.length > 0) {
      content += '\n## Enumerations\n\n';
      for (const enumDef of enums) {
        content += this.generateEnumMarkdown(enumDef);
      }
    }

    content += this.generateRelationshipSummary();

    return content;
  }

  /**
   * Generate Markdown for individual model
   */
  private generateModelMarkdown(model: ModelMetadata): string {
    let content = `\n### ${model.name}\n\n`;

    if (model.documentation) {
      content += `**Description:** ${model.documentation}\n\n`;
    }

    if (model.category) {
      content += `**Category:** ${model.category}\n\n`;
    }

    if (model.businessRules && model.businessRules.length > 0) {
      content += `**Business Rules:**\n`;
      for (const rule of model.businessRules) {
        content += `- ${rule}\n`;
      }
      content += '\n';
    }

    // Fields table
    content += `**Fields (${model.fields.length}):**\n\n`;
    content += '| Field | Type | Nullable | Default | Description |\n';
    content += '|-------|------|----------|---------|-------------|\n';

    for (const field of model.fields) {
      const nullable = field.isOptional ? '✓' : '';
      const defaultVal = field.hasDefaultValue ? (field.defaultValue || 'auto') : '';
      const description = field.documentation || field.businessRule || '';
      const typeDisplay = field.isList ? `${field.type}[]` : field.type;

      content += `| ${field.name} | ${typeDisplay} | ${nullable} | ${defaultVal} | ${description} |\n`;
    }

    // Relationships
    if (model.relationships.length > 0) {
      content += `\n**Relationships (${model.relationships.length}):**\n\n`;
      content += '| Type | Related Model | Field | Required |\n';
      content += '|------|---------------|-------|----------|\n';

      for (const rel of model.relationships) {
        const required = rel.isRequired ? '✓' : '';
        content += `| ${rel.type} | ${rel.relatedModel} | ${rel.fieldName} | ${required} |\n`;
      }
    }

    // Constraints
    if (model.primaryKey || model.uniqueFields.length > 0 || model.indices.length > 0) {
      content += '\n**Constraints & Indexes:**\n\n';

      if (model.primaryKey) {
        content += `- **Primary Key:** ${model.primaryKey.fields.join(', ')}\n`;
      }

      for (const unique of model.uniqueFields) {
        content += `- **Unique:** ${unique.fields.join(', ')}\n`;
      }

      for (const index of model.indices) {
        content += `- **Index:** ${index.fields.join(', ')}\n`;
      }
    }

    content += '\n---\n';
    return content;
  }

  /**
   * Generate Markdown for enum
   */
  private generateEnumMarkdown(enumDef: any): string {
    let content = `\n#### ${enumDef.name}\n\n`;

    if (enumDef.documentation) {
      content += `${enumDef.documentation}\n\n`;
    }

    content += '**Values:**\n';
    for (const value of enumDef.values) {
      content += `- \`${value.name}\``;
      if (value.documentation) {
        content += ` - ${value.documentation}`;
      }
      content += '\n';
    }

    return content;
  }

  /**
   * Generate relationship summary
   */
  private generateRelationshipSummary(): string {
    let content = '\n## Relationship Summary\n\n';

    const relationshipStats = this.calculateRelationshipStats();

    content += `**Total Relationships:** ${relationshipStats.total}\n`;
    content += `**One-to-One:** ${relationshipStats.oneToOne}\n`;
    content += `**One-to-Many:** ${relationshipStats.oneToMany}\n`;
    content += `**Many-to-Many:** ${relationshipStats.manyToMany}\n\n`;

    content += '### Key Relationships\n\n';

    // Show key relationships between major entities
    const keyModels = ['Enterprise', 'Site', 'WorkOrder', 'User', 'Material', 'NCR'];
    const keyRelationships = this.metadata.models
      .filter(model => keyModels.includes(model.name))
      .flatMap(model =>
        model.relationships.map(rel => ({
          from: model.name,
          to: rel.relatedModel,
          type: rel.type,
          field: rel.fieldName
        }))
      );

    content += '| From | To | Type | Field |\n';
    content += '|------|----|----- |-------|\n';

    for (const rel of keyRelationships.slice(0, 20)) { // Limit to top 20
      content += `| ${rel.from} | ${rel.to} | ${rel.type} | ${rel.field} |\n`;
    }

    return content;
  }

  /**
   * Generate HTML Data Dictionary
   */
  async generateHTMLDataDictionary(): Promise<void> {
    const htmlContent = this.buildHTMLContent();
    const outputPath = path.join(this.outputDir, 'data-dictionary.html');
    await fs.promises.writeFile(outputPath, htmlContent, 'utf8');
    console.log(`🌐 HTML data dictionary: ${outputPath}`);
  }

  /**
   * Build HTML content
   */
  private buildHTMLContent(): string {
    const { models, enums, totalModels, totalFields, generatedAt } = this.metadata;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MachShop MES - Data Dictionary</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/themes/prism.min.css" rel="stylesheet">
    <style>
        .table-card { margin-bottom: 2rem; }
        .field-type { font-family: monospace; font-weight: bold; }
        .relationship-badge { font-size: 0.8em; }
        .search-highlight { background-color: yellow; }
        .category-section { border-left: 4px solid #007bff; padding-left: 1rem; margin: 2rem 0; }
        .stats-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    </style>
</head>
<body>
    <nav class="navbar navbar-dark bg-dark">
        <div class="container">
            <span class="navbar-brand mb-0 h1">📊 MachShop MES Data Dictionary</span>
            <span class="badge bg-light text-dark">Generated: ${new Date(generatedAt).toLocaleDateString()}</span>
        </div>
    </nav>

    <div class="container mt-4">
        <!-- Statistics Dashboard -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card stats-card">
                    <div class="card-body text-center">
                        <h3>${totalModels}</h3>
                        <p>Total Tables</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stats-card">
                    <div class="card-body text-center">
                        <h3>${totalFields}</h3>
                        <p>Total Fields</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stats-card">
                    <div class="card-body text-center">
                        <h3>${enums.length}</h3>
                        <p>Enumerations</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stats-card">
                    <div class="card-body text-center">
                        <h3>${this.calculateRelationshipStats().total}</h3>
                        <p>Relationships</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Search and Filter -->
        <div class="row mb-4">
            <div class="col-md-8">
                <input type="text" id="searchInput" class="form-control" placeholder="Search tables, fields, or descriptions...">
            </div>
            <div class="col-md-4">
                <select id="categoryFilter" class="form-control">
                    <option value="">All Categories</option>
                    ${Object.keys(this.groupModelsByCategory()).map(category =>
                        `<option value="${category}">${category}</option>`
                    ).join('')}
                </select>
            </div>
        </div>

        <!-- Tables by Category -->
        ${this.generateHTMLModelsByCategory()}

        <!-- Enumerations -->
        ${enums.length > 0 ? this.generateHTMLEnums() : ''}
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tables = document.querySelectorAll('.table-card');

            tables.forEach(table => {
                const text = table.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    table.style.display = 'block';
                    // Highlight search terms
                    if (searchTerm) {
                        table.innerHTML = table.innerHTML.replace(
                            new RegExp(searchTerm, 'gi'),
                            '<span class="search-highlight">$&</span>'
                        );
                    }
                } else {
                    table.style.display = 'none';
                }
            });
        });

        // Category filter
        document.getElementById('categoryFilter').addEventListener('change', function() {
            const category = this.value;
            const sections = document.querySelectorAll('.category-section');

            sections.forEach(section => {
                if (!category || section.dataset.category === category) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate HTML for models by category
   */
  private generateHTMLModelsByCategory(): string {
    const modelsByCategory = this.groupModelsByCategory();
    let html = '';

    for (const [category, categoryModels] of Object.entries(modelsByCategory)) {
      html += `<div class="category-section" data-category="${category}">`;
      html += `<h2>${category} <span class="badge bg-secondary">${categoryModels.length}</span></h2>`;

      for (const model of categoryModels) {
        html += this.generateHTMLModel(model);
      }

      html += '</div>';
    }

    return html;
  }

  /**
   * Generate HTML for individual model
   */
  private generateHTMLModel(model: ModelMetadata): string {
    return `
    <div class="card table-card">
        <div class="card-header">
            <h4>${model.name} <span class="badge bg-info">${model.fields.length} fields</span></h4>
            ${model.documentation ? `<p class="text-muted mb-0">${model.documentation}</p>` : ''}
        </div>
        <div class="card-body">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Field</th>
                        <th>Type</th>
                        <th>Constraints</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${model.fields.map(field => `
                    <tr>
                        <td><code>${field.name}</code></td>
                        <td><span class="field-type">${field.isList ? `${field.type}[]` : field.type}</span></td>
                        <td>
                            ${field.isId ? '<span class="badge bg-warning">PK</span> ' : ''}
                            ${field.isUnique ? '<span class="badge bg-info">Unique</span> ' : ''}
                            ${!field.isOptional ? '<span class="badge bg-danger">Required</span> ' : ''}
                            ${field.hasDefaultValue ? '<span class="badge bg-success">Default</span>' : ''}
                        </td>
                        <td>${field.documentation || field.businessRule || ''}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            ${model.relationships.length > 0 ? `
            <h6>Relationships</h6>
            <div class="row">
                ${model.relationships.map(rel => `
                <div class="col-md-4 mb-2">
                    <span class="badge relationship-badge bg-${rel.type === 'one-to-many' ? 'primary' : rel.type === 'many-to-many' ? 'success' : 'secondary'}">
                        ${rel.type}
                    </span>
                    <strong>${rel.relatedModel}</strong> (${rel.fieldName})
                </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    </div>`;
  }

  /**
   * Generate HTML for enums
   */
  private generateHTMLEnums(): string {
    let html = '<h2>Enumerations</h2>';

    for (const enumDef of this.metadata.enums) {
      html += `
      <div class="card mb-3">
          <div class="card-header">
              <h5>${enumDef.name}</h5>
              ${enumDef.documentation ? `<p class="text-muted mb-0">${enumDef.documentation}</p>` : ''}
          </div>
          <div class="card-body">
              <div class="row">
                  ${enumDef.values.map(value => `
                  <div class="col-md-3 mb-2">
                      <code>${value.name}</code>
                      ${value.documentation ? `<br><small class="text-muted">${value.documentation}</small>` : ''}
                  </div>
                  `).join('')}
              </div>
          </div>
      </div>`;
    }

    return html;
  }

  /**
   * Generate CSV export
   */
  async generateCSVExport(): Promise<void> {
    const csvRows = ['Table,Field,Type,Nullable,Default,Description,Category'];

    for (const model of this.metadata.models) {
      for (const field of model.fields) {
        const row = [
          model.name,
          field.name,
          field.isList ? `${field.type}[]` : field.type,
          field.isOptional ? 'Yes' : 'No',
          field.hasDefaultValue ? (field.defaultValue || 'auto') : '',
          (field.documentation || field.businessRule || '').replace(/,/g, ';'),
          model.category || 'Other'
        ];
        csvRows.push(row.join(','));
      }
    }

    const csvContent = csvRows.join('\n');
    const outputPath = path.join(this.outputDir, 'schema-export.csv');
    await fs.promises.writeFile(outputPath, csvContent, 'utf8');
    console.log(`📊 CSV export: ${outputPath}`);
  }

  /**
   * Generate JSON export
   */
  async generateJSONExport(): Promise<void> {
    const outputPath = path.join(this.outputDir, 'schema-metadata.json');
    await fs.promises.writeFile(outputPath, JSON.stringify(this.metadata, null, 2), 'utf8');
    console.log(`📋 JSON export: ${outputPath}`);
  }

  /**
   * Generate relationship documentation
   */
  async generateRelationshipDocumentation(): Promise<void> {
    let content = `# Database Relationships\n\n`;
    content += `Generated: ${new Date(this.metadata.generatedAt).toLocaleString()}\n\n`;

    const relationshipStats = this.calculateRelationshipStats();
    content += `## Summary\n\n`;
    content += `- **Total Relationships:** ${relationshipStats.total}\n`;
    content += `- **One-to-One:** ${relationshipStats.oneToOne}\n`;
    content += `- **One-to-Many:** ${relationshipStats.oneToMany}\n`;
    content += `- **Many-to-Many:** ${relationshipStats.manyToMany}\n\n`;

    content += `## Detailed Relationships\n\n`;
    content += `| From Table | From Field | Relationship Type | To Table | Description |\n`;
    content += `|------------|------------|------------------|----------|-------------|\n`;

    for (const model of this.metadata.models) {
      for (const rel of model.relationships) {
        content += `| ${model.name} | ${rel.fieldName} | ${rel.type} | ${rel.relatedModel} | ${rel.description || ''} |\n`;
      }
    }

    const outputPath = path.join(this.outputDir, 'schema-relationships.md');
    await fs.promises.writeFile(outputPath, content, 'utf8');
    console.log(`🔗 Relationships documentation: ${outputPath}`);
  }

  /**
   * Generate summary report
   */
  async generateSummaryReport(): Promise<void> {
    const stats = this.calculateComprehensiveStats();

    const content = `# Schema Analysis Summary

## Database Overview
- **Total Models:** ${this.metadata.totalModels}
- **Total Fields:** ${this.metadata.totalFields}
- **Total Relationships:** ${this.metadata.totalRelationships}
- **Total Enums:** ${this.metadata.enums.length}

## Model Distribution by Category
${Object.entries(stats.modelsByCategory).map(([category, count]) =>
  `- **${category}:** ${count} models`
).join('\n')}

## Field Type Distribution
${Object.entries(stats.fieldTypes).map(([type, count]) =>
  `- **${type}:** ${count} fields`
).join('\n')}

## Relationship Type Distribution
- **One-to-One:** ${stats.relationships.oneToOne}
- **One-to-Many:** ${stats.relationships.oneToMany}
- **Many-to-Many:** ${stats.relationships.manyToMany}

## Largest Tables
${stats.largestTables.map(table =>
  `- **${table.name}:** ${table.fieldCount} fields`
).join('\n')}

## Most Connected Tables
${stats.mostConnected.map(table =>
  `- **${table.name}:** ${table.relationshipCount} relationships`
).join('\n')}

---
Generated: ${new Date(this.metadata.generatedAt).toLocaleString()}
`;

    const outputPath = path.join(this.outputDir, 'schema-summary.md');
    await fs.promises.writeFile(outputPath, content, 'utf8');
    console.log(`📈 Summary report: ${outputPath}`);
  }

  /**
   * Group models by category
   */
  private groupModelsByCategory(): Record<string, ModelMetadata[]> {
    const grouped: Record<string, ModelMetadata[]> = {};

    for (const model of this.metadata.models) {
      const category = model.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(model);
    }

    // Sort each category by model name
    for (const category of Object.keys(grouped)) {
      grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    }

    return grouped;
  }

  /**
   * Calculate relationship statistics
   */
  private calculateRelationshipStats(): { total: number; oneToOne: number; oneToMany: number; manyToMany: number } {
    let oneToOne = 0;
    let oneToMany = 0;
    let manyToMany = 0;

    for (const model of this.metadata.models) {
      for (const rel of model.relationships) {
        switch (rel.type) {
          case 'one-to-one':
            oneToOne++;
            break;
          case 'one-to-many':
            oneToMany++;
            break;
          case 'many-to-many':
            manyToMany++;
            break;
        }
      }
    }

    return {
      total: oneToOne + oneToMany + manyToMany,
      oneToOne,
      oneToMany,
      manyToMany
    };
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateComprehensiveStats(): any {
    const modelsByCategory: Record<string, number> = {};
    const fieldTypes: Record<string, number> = {};
    const largestTables: Array<{ name: string; fieldCount: number }> = [];
    const mostConnected: Array<{ name: string; relationshipCount: number }> = [];

    for (const model of this.metadata.models) {
      // Category stats
      const category = model.category || 'Other';
      modelsByCategory[category] = (modelsByCategory[category] || 0) + 1;

      // Field type stats
      for (const field of model.fields) {
        fieldTypes[field.type] = (fieldTypes[field.type] || 0) + 1;
      }

      // Largest tables
      largestTables.push({ name: model.name, fieldCount: model.fields.length });

      // Most connected tables
      mostConnected.push({ name: model.name, relationshipCount: model.relationships.length });
    }

    // Sort and limit
    largestTables.sort((a, b) => b.fieldCount - a.fieldCount);
    mostConnected.sort((a, b) => b.relationshipCount - a.relationshipCount);

    return {
      modelsByCategory,
      fieldTypes,
      largestTables: largestTables.slice(0, 10),
      mostConnected: mostConnected.slice(0, 10),
      relationships: this.calculateRelationshipStats()
    };
  }
}

export default DocumentationGenerator;