/**
 * Enhanced Documentation Generator
 * Generates documentation with external documentation integration
 */

import MinimalDocumentationBase from './minimal-doc-base';
import { SchemaMetadata, ModelMetadata } from './types/schema-metadata';
import * as fs from 'fs';
import * as path from 'path';

interface FieldDisplayConfig {
  showInMainTable: string[];
  showInDetailedView: string[];
  tableStyle: 'compact' | 'comprehensive' | 'custom';
  interactive?: boolean;
}

export class EnhancedDocumentationGenerator extends MinimalDocumentationBase {
  private fieldDisplayConfig: FieldDisplayConfig;

  constructor(metadata: SchemaMetadata, outputDir: string = './docs/generated', displayConfig?: Partial<FieldDisplayConfig>) {
    super(metadata, outputDir);

    // Default configuration - show key business attributes in main table
    this.fieldDisplayConfig = {
      showInMainTable: [
        'businessRule',
        'businessPurpose',
        'dataSource',
        'validation',
        'complianceNotes'
      ],
      showInDetailedView: [
        'businessJustification',
        'businessImpact',
        'format',
        'examples',
        'calculations',
        'privacy',
        'retention',
        'auditTrail',
        'integrationMapping',
        'validValues',
        'consequences'
      ],
      tableStyle: 'comprehensive',
      ...displayConfig
    };
  }

  /**
   * Set field display configuration
   */
  setFieldDisplayConfig(config: Partial<FieldDisplayConfig>): void {
    this.fieldDisplayConfig = { ...this.fieldDisplayConfig, ...config };
  }

  /**
   * Get predefined display configurations
   */
  static getPresetConfigs(): Record<string, FieldDisplayConfig> {
    return {
      'minimal': {
        showInMainTable: ['businessRule'],
        showInDetailedView: ['businessPurpose', 'dataSource', 'validation', 'complianceNotes', 'businessImpact', 'format', 'examples', 'calculations', 'privacy', 'retention', 'auditTrail', 'integrationMapping', 'validValues', 'consequences', 'businessJustification'],
        tableStyle: 'compact'
      },
      'business-focused': {
        showInMainTable: ['businessRule', 'businessPurpose', 'businessImpact', 'complianceNotes'],
        showInDetailedView: ['businessJustification', 'dataSource', 'format', 'examples', 'validation', 'calculations', 'privacy', 'retention', 'auditTrail', 'integrationMapping', 'validValues', 'consequences'],
        tableStyle: 'comprehensive'
      },
      'technical-focused': {
        showInMainTable: ['dataSource', 'format', 'validation', 'calculations', 'integrationMapping'],
        showInDetailedView: ['businessRule', 'businessPurpose', 'businessJustification', 'businessImpact', 'examples', 'privacy', 'retention', 'auditTrail', 'validValues', 'complianceNotes', 'consequences'],
        tableStyle: 'comprehensive'
      },
      'compliance-focused': {
        showInMainTable: ['complianceNotes', 'privacy', 'retention', 'auditTrail', 'businessRule'],
        showInDetailedView: ['businessPurpose', 'businessJustification', 'businessImpact', 'dataSource', 'format', 'examples', 'validation', 'calculations', 'integrationMapping', 'validValues', 'consequences'],
        tableStyle: 'comprehensive'
      },
      'all-attributes': {
        showInMainTable: ['businessRule', 'businessPurpose', 'businessJustification', 'businessImpact', 'dataSource', 'format', 'examples', 'validation', 'calculations', 'privacy', 'retention', 'auditTrail', 'integrationMapping', 'validValues', 'complianceNotes', 'consequences'],
        showInDetailedView: [],
        tableStyle: 'comprehensive'
      }
    };
  }

  /**
   * Generate comprehensive business rules analytics report
   */
  async generateBusinessRulesAnalytics(): Promise<void> {
    const analytics = this.buildBusinessRulesAnalytics();
    const content = this.buildAnalyticsReport(analytics);
    const outputPath = path.join(this.outputDir, 'business-rules-analytics.md');
    await fs.promises.writeFile(outputPath, content, 'utf8');
    console.log(`📊 Business Rules Analytics: ${outputPath}`);
  }

  /**
   * Generate compliance coverage dashboard
   */
  async generateComplianceDashboard(): Promise<void> {
    const compliance = this.buildComplianceAnalysis();
    const content = this.buildComplianceDashboard(compliance);
    const outputPath = path.join(this.outputDir, 'compliance-dashboard.md');
    await fs.promises.writeFile(outputPath, content, 'utf8');
    console.log(`🔒 Compliance Dashboard: ${outputPath}`);
  }

  /**
   * Generate stakeholder-specific documentation views
   */
  async generateStakeholderViews(): Promise<void> {
    const stakeholders = ['engineering', 'quality', 'production', 'management'];

    for (const stakeholder of stakeholders) {
      const content = this.buildStakeholderView(stakeholder);
      const outputPath = path.join(this.outputDir, `${stakeholder}-view.md`);
      await fs.promises.writeFile(outputPath, content, 'utf8');
      console.log(`👥 ${stakeholder.charAt(0).toUpperCase() + stakeholder.slice(1)} View: ${outputPath}`);
    }
  }

  /**
   * Generate enhanced Markdown documentation with external docs
   */
  override async generateMarkdownDocumentation(): Promise<void> {
    const content = this.buildEnhancedMarkdownContent();
    const outputPath = path.join(this.outputDir, 'schema-tables-enhanced.md');
    await fs.promises.writeFile(outputPath, content, 'utf8');
    console.log(`📄 Enhanced Markdown documentation: ${outputPath}`);
  }

  /**
   * Generate enhanced HTML documentation with field descriptions
   */
  override async generateHTMLDocumentation(): Promise<void> {
    const content = this.buildEnhancedHTMLContent();
    const outputPath = path.join(this.outputDir, 'data-dictionary.html');
    await fs.promises.writeFile(outputPath, content, 'utf8');
    console.log(`🌐 HTML data dictionary: ${outputPath}`);
  }

  /**
   * Build enhanced Markdown content with external documentation
   */
  private buildEnhancedMarkdownContent(): string {
    const { models, enums, totalModels, totalFields, totalRelationships, generatedAt } = this.metadata;

    let content = `# Enhanced Database Schema Documentation

> **Generated:** ${new Date(generatedAt).toLocaleString()}
> **Total Models:** ${totalModels}
> **Total Fields:** ${totalFields}
> **Total Relationships:** ${totalRelationships}

## Overview

This document provides comprehensive documentation for the MachShop Manufacturing Execution System (MES) database schema, enhanced with business context and operational details. The schema implements ISA-95 standards and supports enterprise manufacturing operations across ${totalModels} interconnected data models.

## Table of Contents

- [Documentation Coverage Summary](#documentation-coverage-summary)
- [Models by Category](#models-by-category)
- [Detailed Table Definitions](#detailed-table-definitions)
- [Data Governance Information](#data-governance-information)
- [Compliance and Security](#compliance-and-security)
- [Integration Points](#integration-points)
- [Enumerations](#enumerations)

## Documentation Coverage Summary

`;

    // Calculate and display documentation coverage
    const coverageStats = this.calculateDocumentationCoverage();
    content += this.generateCoverageSummary(coverageStats);

    content += '\n## Models by Category\n\n';

    // Group models by category with enhanced information
    const modelsByCategory = this.groupModelsByCategory();

    for (const [category, categoryModels] of Object.entries(modelsByCategory)) {
      content += `\n### ${category} (${categoryModels.length} tables)\n\n`;
      content += '| Table | Description | Data Owner | Fields | Relationships | Compliance |\n';
      content += '|-------|-------------|------------|--------|---------------|------------|\n';

      for (const model of categoryModels) {
        const description = model.documentation?.split('\n')[0] || 'No description available';
        const dataOwner = (model as any).dataOwner || 'Not specified';
        const compliance = (model as any).complianceNotes ? '⚠️' : '';
        content += `| [${model.name}](#${model.name.toLowerCase()}) | ${description} | ${dataOwner} | ${model.fields.length} | ${model.relationships.length} | ${compliance} |\n`;
      }
    }

    content += '\n## Detailed Table Definitions\n\n';

    // Generate enhanced table documentation
    for (const model of models) {
      content += this.generateEnhancedModelMarkdown(model);
    }

    // Add data governance section
    content += this.generateDataGovernanceSection(models);

    // Add compliance and security section
    content += this.generateComplianceSection(models);

    // Add integration points section
    content += this.generateIntegrationSection(models);

    // Add enums section
    if (enums.length > 0) {
      content += '\n## Enumerations\n\n';
      for (const enumDef of enums) {
        content += this.generateEnumMarkdown(enumDef);
      }
    }

    return content;
  }

  /**
   * Build enhanced HTML content with comprehensive field descriptions and architectural documentation
   */
  private buildEnhancedHTMLContent(): string {
    const { models, enums, totalModels, totalFields, totalRelationships, generatedAt } = this.metadata;
    const coverageStats = this.calculateDocumentationCoverage();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MachShop MES - Data Dictionary</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .table-card { margin-bottom: 2rem; }
        .field-type { font-family: monospace; font-weight: bold; }
        .stats-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .field-description { font-size: 0.9em; color: #6c757d; }
        .field-row:hover { background-color: #f8f9fa; }
        ${this.fieldDisplayConfig.interactive ? this.generateInteractiveCSS() : ''}
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
                        <h2 class="card-title">${totalModels}</h2>
                        <p class="card-text">Tables</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stats-card">
                    <div class="card-body text-center">
                        <h2 class="card-title">${totalFields}</h2>
                        <p class="card-text">Fields</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stats-card">
                    <div class="card-body text-center">
                        <h2 class="card-title">${totalRelationships}</h2>
                        <p class="card-text">Relations</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stats-card">
                    <div class="card-body text-center">
                        <h2 class="card-title">${coverageStats.fieldCoverage}%</h2>
                        <p class="card-text">Documentation</p>
                    </div>
                </div>
            </div>
        </div>

        ${this.fieldDisplayConfig.interactive ? this.generateInteractiveControlPanel() : ''}

        <!-- Search and Filter -->
        <div class="row mb-4">
            <div class="col-md-8">
                <input type="text" id="searchInput" class="form-control" placeholder="Search tables, fields, or descriptions...">
            </div>
            <div class="col-md-4">
                <select id="categoryFilter" class="form-select">
                    <option value="">All Categories</option>
                    <option value="Personnel Management">Personnel Management</option>
                    <option value="Production Management">Production Management</option>
                    <option value="Quality Management">Quality Management</option>
                    <option value="Material Management">Material Management</option>
                    <option value="Equipment Management">Equipment Management</option>
                    <option value="Document Management">Document Management</option>
                    <option value="Security & Access">Security & Access</option>
                    <option value="Core Infrastructure">Core Infrastructure</option>
                    <option value="General Operations">General Operations</option>
                    <option value="Other">Other</option>
                </select>
            </div>
        </div>

        <!-- Category Navigation -->
        <div class="row mb-4">
            <div class="col-12">
                <nav class="nav nav-pills flex-column flex-sm-row">
                    <a class="flex-sm-fill text-sm-center nav-link active" href="#fundamentals">📚 Business Guide</a>
                    <a class="flex-sm-fill text-sm-center nav-link" href="#architecture">🏗️ Architecture</a>
                    <a class="flex-sm-fill text-sm-center nav-link" href="#business-entities">🎯 Core Entities</a>
                    <a class="flex-sm-fill text-sm-center nav-link" href="#integration">🔌 Integration</a>
                    <a class="flex-sm-fill text-sm-center nav-link" href="#all-tables">📊 All Tables</a>
                    <a class="flex-sm-fill text-sm-center nav-link" href="#enumerations">📋 Enumerations</a>
                </nav>
            </div>
        </div>

        <!-- Business Fundamentals Guide -->
        <div id="fundamentals">
            ${this.generateArchitecturalContent('fundamentals')}
        </div>

        <!-- Architecture Overview -->
        <div id="architecture" style="display: none;">
            ${this.generateArchitecturalContent('architecture')}
        </div>

        <!-- Core Business Entities -->
        <div id="business-entities" style="display: none;">
            ${this.generateArchitecturalContent('business-entities')}
        </div>

        <!-- Integration Patterns -->
        <div id="integration" style="display: none;">
            ${this.generateArchitecturalContent('integration')}
        </div>

        <!-- Tables by Category -->
        <div id="all-tables" style="display: none;">
            ${this.generateHTMLTablesByCategory(models)}
        </div>

        <!-- Enumerations -->
        <div id="enumerations" style="display: none;">
            ${this.generateHTMLEnumsContent(enums)}
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const tables = document.querySelectorAll('.table-card');
            const categorySections = document.querySelectorAll('.category-section');

            tables.forEach(table => {
                const text = table.textContent.toLowerCase();
                table.style.display = text.includes(searchTerm) ? 'block' : 'none';
            });

            // Hide empty category sections
            categorySections.forEach(section => {
                const visibleTables = section.querySelectorAll('.table-card[style*="display: block"], .table-card:not([style*="display: none"])');
                section.style.display = visibleTables.length > 0 ? 'block' : 'none';
            });
        });

        // Category filter
        document.getElementById('categoryFilter').addEventListener('change', function(e) {
            const selectedCategory = e.target.value;
            const tables = document.querySelectorAll('.table-card');
            const categorySections = document.querySelectorAll('.category-section');

            if (!selectedCategory) {
                // Show all
                tables.forEach(table => table.style.display = 'block');
                categorySections.forEach(section => section.style.display = 'block');
            } else {
                // Filter by category
                tables.forEach(table => {
                    const tableCategory = table.getAttribute('data-category');
                    table.style.display = tableCategory === selectedCategory ? 'block' : 'none';
                });

                categorySections.forEach(section => {
                    const categoryName = section.querySelector('.badge').textContent;
                    section.style.display = categoryName === selectedCategory ? 'block' : 'none';
                });
            }
        });

        // Tab navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();

                // Update active tab
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');

                // Show/hide content
                const target = this.getAttribute('href').substring(1);
                document.querySelectorAll('#fundamentals, #architecture, #business-entities, #integration, #all-tables, #enumerations').forEach(section => {
                    section.style.display = section.id === target ? 'block' : 'none';
                });
            });
        });

        ${this.fieldDisplayConfig.interactive ? this.generateInteractiveJavaScript() : ''}
    </script>
</body>
</html>`;
  }

  /**
   * Generate HTML tables organized by category
   */
  private generateHTMLTablesByCategory(models: any[]): string {
    const modelsByCategory = this.groupModelsByCategory();

    return Object.entries(modelsByCategory).map(([category, categoryModels]) => `
      <div class="category-section mb-5">
        <h3 class="mb-3">
          <span class="badge bg-primary">${category}</span>
          <small class="text-muted ms-2">${categoryModels.length} tables</small>
        </h3>
        ${this.generateHTMLTablesContent(categoryModels)}
      </div>
    `).join('');
  }

  /**
   * Generate HTML tables content with complete field descriptions and business context
   */
  private generateHTMLTablesContent(models: any[]): string {
    return models.map(model => {
      const documentation = model.documentation ?
        model.documentation.split('\\n')[0] :
        'No description available';

      return `
        <div class="card table-card" data-category="${this.getCategoryForModel(model)}">
            <div class="card-header">
                <h4>${model.name} <span class="badge bg-info">${model.fields.length} fields</span></h4>
                <p class="text-muted mb-0">${documentation}</p>
                ${this.generateTableBusinessContext(model)}
            </div>
            <div class="card-body">
                ${this.generateBusinessRulesSection(model)}
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th style="min-width: 120px;">Field</th>
                                <th style="min-width: 100px;">Type</th>
                                <th style="min-width: 120px;">Constraints</th>
                                <th style="min-width: 200px;">Description</th>
                                ${this.generateAdditionalColumnHeaders()}
                            </tr>
                        </thead>
                        <tbody>
                            ${model.fields.map((field: any) => `
                                <tr class="field-row">
                                    <td><code>${field.name}</code></td>
                                    <td><span class="field-type">${field.type}${field.isList ? '[]' : ''}${field.isOptional ? '?' : ''}</span></td>
                                    <td><span class="constraints">${this.getFieldConstraints(field, model)}</span></td>
                                    <td class="field-description">${this.getFieldDescription(field, model)}</td>
                                    ${this.generateAdditionalColumnCells(field)}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${this.generateTableFooterInfo(model)}
            </div>
        </div>`;
    }).join('');
  }

  /**
   * Generate table business context section
   */
  private generateTableBusinessContext(model: any): string {
    let contextHtml = '';

    // Business Purpose
    if (model.businessPurpose && model.businessPurpose.trim()) {
      contextHtml += `<div class="mt-2"><strong>🎯 Purpose:</strong> ${model.businessPurpose}</div>`;
    }

    // Data Owner
    if (model.dataOwner && model.dataOwner.trim()) {
      contextHtml += `<div class="mt-1"><strong>👤 Owner:</strong> <span class="badge bg-secondary">${model.dataOwner}</span></div>`;
    }

    // Compliance Notes
    if (model.complianceNotes && model.complianceNotes.trim()) {
      contextHtml += `<div class="mt-1"><strong>⚖️ Compliance:</strong> ${model.complianceNotes}</div>`;
    }

    // Integrations
    if (model.integrations && Array.isArray(model.integrations) && model.integrations.length > 0) {
      const integrationsList = model.integrations.slice(0, 3).map(int => `<code>${int}</code>`).join(', ');
      contextHtml += `<div class="mt-1"><strong>🔗 Integrations:</strong> ${integrationsList}</div>`;
    }

    return contextHtml;
  }

  /**
   * Generate business rules section for table
   */
  private generateBusinessRulesSection(model: any): string {
    if (!model.businessRules || !Array.isArray(model.businessRules) || model.businessRules.length === 0) {
      return '';
    }

    const rulesHtml = model.businessRules.map((rule: any) => {
      if (typeof rule === 'string') {
        return `<li>${rule}</li>`;
      } else if (typeof rule === 'object' && rule.description) {
        const priorityBadge = this.getPriorityBadge(rule.priority);
        const typeBadge = this.getTypeBadge(rule.type);
        return `
          <li>
            ${priorityBadge} ${typeBadge} ${rule.description}
            ${rule.businessJustification ? `<br><small class="text-muted">📖 ${rule.businessJustification}</small>` : ''}
            ${rule.consequences ? `<br><small class="text-warning">⚠️ ${rule.consequences}</small>` : ''}
          </li>`;
      }
      return '';
    }).join('');

    return `
      <div class="alert alert-primary mt-3" role="alert">
        <h6><strong>📋 Business Rules</strong></h6>
        <ul class="mb-0">${rulesHtml}</ul>
      </div>`;
  }

  /**
   * Generate table footer information
   */
  private generateTableFooterInfo(model: any): string {
    let footerHtml = '';

    // Update Frequency
    if (model.updateFrequency && model.updateFrequency.trim()) {
      footerHtml += `<div class="mt-3"><small class="text-muted"><strong>🔄 Update Frequency:</strong> ${model.updateFrequency}</small></div>`;
    }

    // Data Retention
    if (model.dataRetention && model.dataRetention.trim()) {
      footerHtml += `<div class="mt-1"><small class="text-muted"><strong>📅 Retention:</strong> ${model.dataRetention}</small></div>`;
    }

    // Security Classification
    if (model.securityClassification && model.securityClassification.trim()) {
      footerHtml += `<div class="mt-1"><small class="text-muted"><strong>🔒 Security:</strong> <span class="badge bg-warning text-dark">${model.securityClassification}</span></small></div>`;
    }

    return footerHtml;
  }

  /**
   * Get priority badge for business rules
   */
  private getPriorityBadge(priority: string): string {
    if (!priority) return '';

    const priorityMap = {
      'critical': '<span class="badge bg-danger">CRITICAL</span>',
      'high': '<span class="badge bg-warning text-dark">HIGH</span>',
      'medium': '<span class="badge bg-info">MEDIUM</span>',
      'low': '<span class="badge bg-secondary">LOW</span>'
    };

    return priorityMap[priority.toLowerCase()] || `<span class="badge bg-light text-dark">${priority}</span>`;
  }

  /**
   * Get type badge for business rules
   */
  private getTypeBadge(type: string): string {
    if (!type) return '';

    const typeMap = {
      'validation': '<span class="badge bg-success">VALIDATION</span>',
      'workflow': '<span class="badge bg-primary">WORKFLOW</span>',
      'calculation': '<span class="badge bg-info">CALCULATION</span>',
      'constraint': '<span class="badge bg-warning text-dark">CONSTRAINT</span>'
    };

    return typeMap[type.toLowerCase()] || `<span class="badge bg-light text-dark">${type}</span>`;
  }

  /**
   * Generate HTML enumerations content
   */
  private generateHTMLEnumsContent(enums: any[]): string {
    if (enums.length === 0) {
      return '<div class="alert alert-info">No enumerations found in the schema.</div>';
    }

    return `
      <div class="row">
        <div class="col-12">
          <h3 class="mb-4">Enumerations <span class="badge bg-secondary">${enums.length} enums</span></h3>
        </div>
      </div>
      ${enums.map(enumDef => `
        <div class="card table-card">
          <div class="card-header">
            <h4>${enumDef.name} <span class="badge bg-warning text-dark">Enum</span></h4>
            <p class="text-muted mb-0">${enumDef.documentation || 'Enumeration values'}</p>
          </div>
          <div class="card-body">
            <div class="row">
              ${enumDef.values.map((value: any) => `
                <div class="col-md-4 mb-2">
                  <div class="border rounded p-2">
                    <code class="text-primary">${value.name}</code>
                    ${value.documentation ? `<br><small class="text-muted">${value.documentation}</small>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('')}`;
  }

  /**
   * Get category for a specific model
   */
  private getCategoryForModel(model: any): string {
    const name = model.name.toLowerCase();

    if (name.includes('user') || name.includes('personnel') || name.includes('person')) {
      return 'Personnel Management';
    } else if (name.includes('work') && name.includes('order')) {
      return 'Production Management';
    } else if (name.includes('material') || name.includes('inventory')) {
      return 'Material Management';
    } else if (name.includes('quality') || name.includes('inspection')) {
      return 'Quality Management';
    } else if (name.includes('equipment') || name.includes('machine')) {
      return 'Equipment Management';
    } else if (name.includes('document') || name.includes('instruction')) {
      return 'Document Management';
    } else if (name.includes('role') || name.includes('permission')) {
      return 'Security & Access';
    } else if (name.includes('site') || name.includes('area')) {
      return 'Core Infrastructure';
    } else if (name.includes('enterprise')) {
      return 'General Operations';
    }

    return 'Other';
  }

  /**
   * Generate relationship documentation
   */
  async generateRelationshipDocumentation(): Promise<void> {
    const content = this.buildRelationshipContent();
    const outputPath = path.join(this.outputDir, 'schema-relationships.md');
    await fs.promises.writeFile(outputPath, content, 'utf8');
    console.log(`🔗 Relationships documentation: ${outputPath}`);
  }

  /**
   * Build relationship documentation content
   */
  private buildRelationshipContent(): string {
    const { models, totalRelationships, generatedAt } = this.metadata;

    // Count relationship types
    let oneToOne = 0;
    let oneToMany = 0;
    let manyToMany = 0;

    models.forEach(model => {
      model.relationships.forEach((rel: any) => {
        if (rel.type === 'one-to-one') oneToOne++;
        else if (rel.type === 'one-to-many') oneToMany++;
        else if (rel.type === 'many-to-many') manyToMany++;
      });
    });

    let content = `# Database Relationships

Generated: ${new Date(generatedAt).toLocaleString()}

## Summary

- **Total Relationships:** ${totalRelationships}
- **One-to-One:** ${oneToOne}
- **One-to-Many:** ${oneToMany}
- **Many-to-Many:** ${manyToMany}

## Detailed Relationships

| From Table | From Field | Relationship Type | To Table | Description |
|------------|------------|------------------|----------|-------------|
`;

    // Add all relationships
    models.forEach(model => {
      model.relationships.forEach((rel: any) => {
        const description = rel.description || `${rel.type} relationship between ${model.name} and ${rel.relatedModel}`;
        content += `| ${model.name} | ${rel.fieldName} | ${rel.type} | ${rel.relatedModel} | ${description} |\n`;
      });
    });

    return content;
  }

  /**
   * Generate summary report
   */
  async generateSummaryReport(): Promise<void> {
    const content = this.buildSummaryContent();
    const outputPath = path.join(this.outputDir, 'schema-summary.md');
    await fs.promises.writeFile(outputPath, content, 'utf8');
    console.log(`📈 Summary report: ${outputPath}`);
  }

  /**
   * Build summary content
   */
  private buildSummaryContent(): string {
    const { models, enums, totalModels, totalFields, totalRelationships, generatedAt } = this.metadata;
    const coverageStats = this.calculateDocumentationCoverage();

    return `# Schema Summary Report

Generated: ${new Date(generatedAt).toLocaleString()}

## Overview

This is a comprehensive summary of the MachShop Manufacturing Execution System database schema.

## Statistics

- **Total Models:** ${totalModels}
- **Total Fields:** ${totalFields}
- **Total Relationships:** ${totalRelationships}
- **Total Enumerations:** ${enums.length}
- **Documentation Coverage:** ${coverageStats.fieldCoverage}%

## Model Categories

${Object.entries(this.groupModelsByCategory()).map(([category, categoryModels]) =>
  `- **${category}:** ${categoryModels.length} models`
).join('\n')}

## Most Connected Models

${models
  .sort((a: any, b: any) => b.relationships.length - a.relationships.length)
  .slice(0, 10)
  .map((model: any) => `- **${model.name}:** ${model.relationships.length} relationships`)
  .join('\n')}

## Documentation Quality

- **Tables with Documentation:** ${coverageStats.tablesWithDocs}/${coverageStats.totalTables}
- **Fields with Documentation:** ${coverageStats.fieldsWithDocs}/${coverageStats.totalFields}
- **Coverage Percentage:** ${coverageStats.fieldCoverage}%
`;
  }

  /**
   * Generate enhanced model documentation with business context
   */
  private generateEnhancedModelMarkdown(model: ModelMetadata): string {
    let content = `\n### ${model.name}\n\n`;

    // Basic description
    if (model.documentation) {
      content += `**Description:** ${model.documentation}\n\n`;
    }

    // Business purpose (from external docs)
    if ((model as any).businessPurpose) {
      content += `**Business Purpose:** ${(model as any).businessPurpose}\n\n`;
    }

    // Data governance information
    const governanceInfo = [];
    if ((model as any).dataOwner) governanceInfo.push(`**Data Owner:** ${(model as any).dataOwner}`);
    if ((model as any).updateFrequency) governanceInfo.push(`**Update Frequency:** ${(model as any).updateFrequency}`);
    if ((model as any).dataRetention) governanceInfo.push(`**Data Retention:** ${(model as any).dataRetention}`);
    if ((model as any).securityClassification) governanceInfo.push(`**Security Classification:** ${(model as any).securityClassification}`);

    if (governanceInfo.length > 0) {
      content += '**Data Governance:**\n';
      for (const info of governanceInfo) {
        content += `- ${info}\n`;
      }
      content += '\n';
    }

    // Compliance and security notes
    if ((model as any).complianceNotes) {
      content += `**Compliance Notes:** ${(model as any).complianceNotes}\n\n`;
    }

    // Integration information
    if ((model as any).integrations && (model as any).integrations.length > 0) {
      content += `**System Integrations:** ${(model as any).integrations.join(', ')}\n\n`;
    }

    // Business rules
    if (model.businessRules && model.businessRules.length > 0) {
      content += `**Business Rules:**\n`;
      for (const rule of model.businessRules) {
        content += `- ${rule}\n`;
      }
      content += '\n';
    }

    // Enhanced fields table with configurable columns
    content += `**Fields (${model.fields.length}):**\n\n`;

    // Generate dynamic headers
    const baseHeaders = ['Field', 'Type', 'Required', 'Default', 'Description'];
    const additionalHeaders = this.fieldDisplayConfig.showInMainTable.map(attr => {
      const attributeLabels = {
        'businessRule': 'Business Rule',
        'businessPurpose': 'Purpose',
        'businessJustification': 'Justification',
        'businessImpact': 'Impact',
        'dataSource': 'Source',
        'format': 'Format',
        'examples': 'Examples',
        'validation': 'Validation',
        'calculations': 'Calculations',
        'privacy': 'Privacy',
        'retention': 'Retention',
        'auditTrail': 'Audit',
        'integrationMapping': 'Integration',
        'validValues': 'Valid Values',
        'complianceNotes': 'Compliance',
        'consequences': 'Consequences'
      };
      return attributeLabels[attr] || attr;
    });

    const allHeaders = [...baseHeaders, ...additionalHeaders];
    content += `| ${allHeaders.join(' | ')} |\n`;
    content += `|${allHeaders.map(() => '-------').join('|')}|\n`;

    for (const field of model.fields) {
      const required = field.isOptional ? '' : '✓';
      const defaultVal = field.hasDefaultValue ? (field.defaultValue || 'auto') : '';
      const description = field.documentation || field.businessRule || '';
      const typeDisplay = field.isList ? `${field.type}[]` : field.type;

      // Generate additional column values
      const additionalValues = this.fieldDisplayConfig.showInMainTable.map(attr => {
        const value = field[attr];
        return this.formatAttributeValueForMarkdown(value, attr);
      });

      const allValues = [field.name, typeDisplay, required, defaultVal, description, ...additionalValues];
      content += `| ${allValues.join(' | ')} |\n`;
    }

    // Enhanced field details with 17-attribute system
    const documentedFields = model.fields.filter(field => this.hasAny17Attributes(field));

    if (documentedFields.length > 0) {
      content += '\n**Detailed Field Documentation (17-Attribute System):**\n\n';

      for (const field of documentedFields) {
        content += `#### ${field.name}\n\n`;
        content += this.generate17AttributeMarkdown(field);
        content += '\n---\n\n';
      }
    }

    // Relationships
    if (model.relationships.length > 0) {
      content += `**Relationships (${model.relationships.length}):**\n\n`;
      content += '| Type | Related Model | Field | Required | Description |\n';
      content += '|------|---------------|-------|----------|-------------|\n';

      for (const rel of model.relationships) {
        const required = rel.isRequired ? '✓' : '';
        const description = rel.description || '';
        content += `| ${rel.type} | ${rel.relatedModel} | ${rel.fieldName} | ${required} | ${description} |\n`;
      }
    }

    // Examples from external documentation
    if ((model as any).examples && (model as any).examples.length > 0) {
      content += '\n**Usage Examples:**\n\n';

      for (const example of (model as any).examples) {
        content += `#### ${example.scenario}\n\n`;
        if (example.explanation) {
          content += `${example.explanation}\n\n`;
        }
        content += '```json\n';
        content += JSON.stringify(example.sampleData, null, 2);
        content += '\n```\n\n';
      }
    }

    // Common queries
    if ((model as any).commonQueries && (model as any).commonQueries.length > 0) {
      content += '**Common Queries:**\n';
      for (const query of (model as any).commonQueries) {
        content += `- ${query}\n`;
      }
      content += '\n';
    }

    // Related tables
    if ((model as any).relatedTables && (model as any).relatedTables.length > 0) {
      content += `**Related Tables:** ${(model as any).relatedTables.join(', ')}\n\n`;
    }

    // Constraints and indexes
    if (model.primaryKey || model.uniqueFields.length > 0 || model.indices.length > 0) {
      content += '**Constraints & Indexes:**\n\n';

      if (model.primaryKey) {
        content += `- **Primary Key:** ${model.primaryKey.fields.join(', ')}\n`;
      }

      for (const unique of model.uniqueFields) {
        content += `- **Unique:** ${unique.fields.join(', ')}\n`;
      }

      for (const index of model.indices) {
        content += `- **Index:** ${index.fields.join(', ')}\n`;
      }
      content += '\n';
    }

    content += '---\n';
    return content;
  }

  /**
   * Calculate documentation coverage statistics
   */
  private calculateDocumentationCoverage(): any {
    const models = this.metadata.models;
    let tablesWithDocs = 0;
    let fieldsWithDocs = 0;
    let totalFields = 0;

    for (const model of models) {
      if (model.documentation || (model as any).businessPurpose) {
        tablesWithDocs++;
      }

      for (const field of model.fields) {
        totalFields++;
        if (field.documentation || (field as any).dataSource) {
          fieldsWithDocs++;
        }
      }
    }

    return {
      totalTables: models.length,
      tablesWithDocs,
      totalFields,
      fieldsWithDocs,
      tablesCoverage: Math.round((tablesWithDocs / models.length) * 100),
      fieldsCoverage: Math.round((fieldsWithDocs / totalFields) * 100)
    };
  }

  /**
   * Generate coverage summary section
   */
  private generateCoverageSummary(stats: any): string {
    return `
| Metric | Count | Coverage |
|--------|-------|----------|
| **Tables with Documentation** | ${stats.tablesWithDocs} / ${stats.totalTables} | ${stats.tablesCoverage}% |
| **Fields with Documentation** | ${stats.fieldsWithDocs} / ${stats.totalFields} | ${stats.fieldsCoverage}% |

`;
  }

  /**
   * Generate data governance section
   */
  private generateDataGovernanceSection(models: ModelMetadata[]): string {
    let content = '\n## Data Governance Information\n\n';

    // Group by data owner
    const byDataOwner: Record<string, string[]> = {};

    for (const model of models) {
      const owner = (model as any).dataOwner || 'Not Specified';
      if (!byDataOwner[owner]) {
        byDataOwner[owner] = [];
      }
      byDataOwner[owner].push(model.name);
    }

    content += '### Data Ownership\n\n';
    content += '| Data Owner | Tables | Count |\n';
    content += '|------------|--------|-------|\n';

    for (const [owner, tables] of Object.entries(byDataOwner)) {
      content += `| ${owner} | ${tables.join(', ')} | ${tables.length} |\n`;
    }

    return content + '\n';
  }

  /**
   * Generate compliance and security section
   */
  private generateComplianceSection(models: ModelMetadata[]): string {
    let content = '\n## Compliance and Security\n\n';

    // Tables with compliance notes
    const complianceTables = models.filter(model => (model as any).complianceNotes);

    if (complianceTables.length > 0) {
      content += '### Compliance Requirements\n\n';
      content += '| Table | Compliance Notes |\n';
      content += '|-------|------------------|\n';

      for (const model of complianceTables) {
        content += `| ${model.name} | ${(model as any).complianceNotes} |\n`;
      }
      content += '\n';
    }

    // Fields with privacy considerations
    const privacyFields: Array<{table: string, field: string, privacy: string}> = [];

    for (const model of models) {
      for (const field of model.fields) {
        if ((field as any).privacy) {
          privacyFields.push({
            table: model.name,
            field: field.name,
            privacy: (field as any).privacy
          });
        }
      }
    }

    if (privacyFields.length > 0) {
      content += '### Privacy and PII Data\n\n';
      content += '| Table | Field | Privacy Classification |\n';
      content += '|-------|-------|------------------------|\n';

      for (const item of privacyFields) {
        content += `| ${item.table} | ${item.field} | ${item.privacy} |\n`;
      }
      content += '\n';
    }

    return content;
  }

  /**
   * Generate integration points section
   */
  private generateIntegrationSection(models: ModelMetadata[]): string {
    let content = '\n## Integration Points\n\n';

    // Collect all integration systems
    const integrationSystems = new Set<string>();
    const integrationMappings: Record<string, Array<{table: string, description?: string}>> = {};

    for (const model of models) {
      if ((model as any).integrations) {
        for (const integration of (model as any).integrations) {
          integrationSystems.add(integration);
          if (!integrationMappings[integration]) {
            integrationMappings[integration] = [];
          }
          integrationMappings[integration].push({
            table: model.name,
            description: model.documentation
          });
        }
      }
    }

    if (integrationSystems.size > 0) {
      content += '### External System Integrations\n\n';

      for (const system of Array.from(integrationSystems).sort()) {
        content += `#### ${system}\n\n`;
        content += '| Table | Description |\n';
        content += '|-------|-------------|\n';

        for (const mapping of integrationMappings[system]) {
          const description = mapping.description?.split('\n')[0] || 'No description';
          content += `| ${mapping.table} | ${description} |\n`;
        }
        content += '\n';
      }
    }

    return content;
  }

  /**
   * Get field constraints as badges (PK, UK, FK, nullable, etc.)
   */
  private getFieldConstraints(field: any, model: any): string {
    const constraints: string[] = [];

    // Primary Key
    if (field.isId) {
      constraints.push('<span class="badge bg-primary">PK</span>');
    }

    // Unique Key
    if (field.isUnique) {
      constraints.push('<span class="badge bg-info">UK</span>');
    }

    // Foreign Key - check if this field is a relationFromFields in any relationship
    const isForeignKey = this.isForeignKeyField(field.name, model);
    if (isForeignKey) {
      constraints.push('<span class="badge bg-secondary">FK</span>');
    }

    // Nullable/NOT NULL
    if (!field.isOptional) {
      constraints.push('<span class="badge bg-warning text-dark">NOT NULL</span>');
    }

    // Default value
    if (field.hasDefaultValue) {
      constraints.push('<span class="badge bg-success">DEFAULT</span>');
    }

    return constraints.join(' ');
  }

  /**
   * Check if a field is a foreign key by looking at relationFromFields
   */
  private isForeignKeyField(fieldName: string, model: any): boolean {
    // Check if this field name appears in relationFromFields of any relationship field
    // Include both 'object' and 'enum' kinds as some might be misclassified
    const relationshipFields = model.fields?.filter((f: any) =>
      (f.kind === 'object' || f.kind === 'enum') && f.relationFromFields
    ) || [];

    for (const relationshipField of relationshipFields) {
      if (relationshipField.relationFromFields && relationshipField.relationFromFields.includes(fieldName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get enhanced field description including relationship info and all 17 attributes
   */
  private getFieldDescription(field: any, model: any): string {
    let description = field.documentation || 'No description available';

    // For foreign key fields, generate meaningful descriptions
    if (this.isForeignKeyField(field.name, model)) {
      const relationshipInfo = this.getForeignKeyRelationshipInfo(field.name, model);
      if (relationshipInfo) {
        description = this.generateMeaningfulFKDescription(field, relationshipInfo, model);
      }
    }

    // For measurement fields, ALWAYS enhance with unit information (regardless of existing documentation)
    if (this.isMeasurementField(field)) {
      description = this.enhanceDescriptionWithUnits(field, model, description);
    }

    // Add comprehensive field attributes (17-attribute system)
    description += this.buildComprehensiveFieldAttributes(field, model);

    // Add relationship information for object fields
    const relationship = model.relationships?.find((rel: any) => rel.fieldName === field.name);
    if (relationship) {
      description += `<br><small class="text-muted"><strong>Relationship:</strong> ${relationship.type} to ${relationship.relatedModel}</small>`;

      if (relationship.description && relationship.description.trim()) {
        description += `<br><small class="text-info">${relationship.description}</small>`;
      }
    }

    return description;
  }

  /**
   * Build comprehensive field attributes display (17-attribute system) as separate structured fields
   */
  private buildComprehensiveFieldAttributes(field: any, model: any): string {
    const attributes = this.get17FieldAttributes(field);

    if (Object.keys(attributes).length === 0) {
      return '';
    }

    // Create accordion-style collapsible section for detailed attributes
    const fieldId = `field-${model.name}-${field.name}`.replace(/[^a-zA-Z0-9]/g, '-');

    return `
      <div class="mt-3">
        <button class="btn btn-sm btn-outline-primary" type="button" data-bs-toggle="collapse" data-bs-target="#${fieldId}-details" aria-expanded="false">
          <i class="fas fa-info-circle"></i> View 17-Attribute Details (${Object.keys(attributes).length} attributes available)
        </button>
        <div class="collapse mt-2" id="${fieldId}-details">
          <div class="card card-body bg-light">
            ${this.render17AttributeTable(attributes)}
          </div>
        </div>
      </div>`;
  }

  /**
   * Extract all 17 field attributes that have values
   */
  private get17FieldAttributes(field: any): Record<string, any> {
    const attributeMap = {
      'businessRule': { icon: '📋', label: 'Business Rule', type: 'text', priority: 1 },
      'businessPurpose': { icon: '🎯', label: 'Business Purpose', type: 'text', priority: 2 },
      'businessJustification': { icon: '📊', label: 'Business Justification', type: 'text', priority: 3 },
      'businessImpact': { icon: '⚡', label: 'Business Impact', type: 'text', priority: 4 },
      'dataSource': { icon: '📥', label: 'Data Source', type: 'text', priority: 5 },
      'format': { icon: '📝', label: 'Format Specification', type: 'code', priority: 6 },
      'examples': { icon: '💡', label: 'Examples', type: 'array', priority: 7 },
      'validation': { icon: '✅', label: 'Validation Rules', type: 'text', priority: 8 },
      'calculations': { icon: '🧮', label: 'Calculations', type: 'text', priority: 9 },
      'privacy': { icon: '🔐', label: 'Privacy Classification', type: 'badge-info', priority: 10 },
      'retention': { icon: '📅', label: 'Data Retention Policy', type: 'text', priority: 11 },
      'auditTrail': { icon: '📋', label: 'Audit Trail Requirements', type: 'text', priority: 12 },
      'integrationMapping': { icon: '🔗', label: 'System Integration Mapping', type: 'object', priority: 13 },
      'validValues': { icon: '🎛️', label: 'Valid Values', type: 'array', priority: 14 },
      'complianceNotes': { icon: '⚖️', label: 'Regulatory Compliance', type: 'text', priority: 15 },
      'consequences': { icon: '⚠️', label: 'Consequences of Violations', type: 'warning', priority: 16 }
    };

    const attributes: Record<string, any> = {};

    Object.entries(attributeMap).forEach(([key, config]) => {
      const value = field[key];
      if (this.hasValidValue(value)) {
        attributes[key] = {
          ...config,
          value: value
        };
      }
    });

    return attributes;
  }

  /**
   * Check if a value is valid for display
   */
  private hasValidValue(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  }

  /**
   * Render 17-attribute table with proper formatting and organization
   */
  private render17AttributeTable(attributes: Record<string, any>): string {
    // Sort attributes by priority for logical display order
    const sortedAttributes = Object.entries(attributes)
      .sort(([,a], [,b]) => a.priority - b.priority);

    const rows = sortedAttributes.map(([key, attr]) => {
      let formattedValue = '';

      switch (attr.type) {
        case 'code':
          formattedValue = `<code class="text-primary bg-light px-2 py-1 rounded">${attr.value}</code>`;
          break;
        case 'badge-info':
          formattedValue = `<span class="badge bg-info">${attr.value}</span>`;
          break;
        case 'warning':
          formattedValue = `<span class="text-danger fw-bold">${attr.value}</span>`;
          break;
        case 'array':
          if (Array.isArray(attr.value)) {
            const items = attr.value.slice(0, 7).map(item => `<code class="bg-light px-1">${item}</code>`).join(', ');
            formattedValue = items;
            if (attr.value.length > 7) {
              formattedValue += ` <small class="text-muted">and ${attr.value.length - 7} more...</small>`;
            }
          }
          break;
        case 'object':
          if (typeof attr.value === 'object') {
            formattedValue = '<div class="mt-1">' + Object.entries(attr.value)
              .map(([system, mapping]) => `<div><strong class="text-primary">${system}:</strong> <code class="bg-light px-1">${mapping}</code></div>`)
              .join('') + '</div>';
          }
          break;
        default:
          formattedValue = attr.value;
      }

      return `
        <tr>
          <td style="width: 220px; vertical-align: top;" class="fw-bold">
            ${attr.icon} ${attr.label}
          </td>
          <td style="vertical-align: top;">${formattedValue}</td>
        </tr>`;
    }).join('');

    return `
      <div class="table-responsive">
        <table class="table table-sm table-hover">
          <thead class="table-primary">
            <tr>
              <th style="width: 220px;">Attribute</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      <div class="text-muted small mt-2">
        <i class="fas fa-info-circle"></i> This field includes ${sortedAttributes.length} of 17 possible manufacturing documentation attributes.
      </div>`;
  }

  /**
   * Check if field has any of the 17 attributes for Markdown documentation
   */
  private hasAny17Attributes(field: any): boolean {
    const attributeKeys = [
      'businessRule', 'businessPurpose', 'businessJustification', 'businessImpact',
      'dataSource', 'format', 'examples', 'validation', 'calculations',
      'privacy', 'retention', 'auditTrail', 'integrationMapping',
      'validValues', 'complianceNotes', 'consequences'
    ];

    return attributeKeys.some(key => this.hasValidValue(field[key]));
  }

  /**
   * Generate 17-attribute documentation in Markdown format
   */
  private generate17AttributeMarkdown(field: any): string {
    const attributes = this.get17FieldAttributes(field);

    if (Object.keys(attributes).length === 0) {
      return '';
    }

    let content = `**📋 Manufacturing Field Documentation (${Object.keys(attributes).length}/17 attributes)**\n\n`;

    // Sort attributes by priority for logical display order
    const sortedAttributes = Object.entries(attributes)
      .sort(([,a], [,b]) => a.priority - b.priority);

    // Create table format
    content += '| Attribute | Value |\n';
    content += '|-----------|-------|\n';

    for (const [key, attr] of sortedAttributes) {
      let formattedValue = '';

      switch (attr.type) {
        case 'code':
          formattedValue = `\`${attr.value}\``;
          break;
        case 'badge-info':
          formattedValue = `**${attr.value}**`;
          break;
        case 'warning':
          formattedValue = `⚠️ **${attr.value}**`;
          break;
        case 'array':
          if (Array.isArray(attr.value)) {
            const items = attr.value.slice(0, 5).map(item => `\`${item}\``).join(', ');
            formattedValue = items;
            if (attr.value.length > 5) {
              formattedValue += ` *(and ${attr.value.length - 5} more)*`;
            }
          }
          break;
        case 'object':
          if (typeof attr.value === 'object') {
            formattedValue = '<ul>' + Object.entries(attr.value)
              .map(([system, mapping]) => `<li><strong>${system}:</strong> \`${mapping}\`</li>`)
              .join('') + '</ul>';
          }
          break;
        default:
          formattedValue = attr.value;
      }

      content += `| ${attr.icon} **${attr.label}** | ${formattedValue} |\n`;
    }

    content += '\n';

    return content;
  }

  /**
   * Generate additional column headers based on configuration
   */
  private generateAdditionalColumnHeaders(): string {
    const attributeLabels = {
      'businessRule': '📋 Business Rule',
      'businessPurpose': '🎯 Purpose',
      'businessJustification': '📊 Justification',
      'businessImpact': '⚡ Impact',
      'dataSource': '📥 Source',
      'format': '📝 Format',
      'examples': '💡 Examples',
      'validation': '✅ Validation',
      'calculations': '🧮 Calculations',
      'privacy': '🔐 Privacy',
      'retention': '📅 Retention',
      'auditTrail': '📋 Audit',
      'integrationMapping': '🔗 Integration',
      'validValues': '🎛️ Valid Values',
      'complianceNotes': '⚖️ Compliance',
      'consequences': '⚠️ Consequences'
    };

    return this.fieldDisplayConfig.showInMainTable
      .map(attr => {
        const dataAttr = this.fieldDisplayConfig.interactive ? ` data-column="${attr}"` : '';
        const cssClass = this.fieldDisplayConfig.interactive ? ` column-${attr}` : '';
        return `<th style="min-width: 150px;" class="toggleable-column${cssClass}"${dataAttr}>${attributeLabels[attr] || attr}</th>`;
      })
      .join('');
  }

  /**
   * Generate additional column cells for a field based on configuration
   */
  private generateAdditionalColumnCells(field: any): string {
    return this.fieldDisplayConfig.showInMainTable
      .map(attr => {
        const value = field[attr];
        const formattedValue = this.formatAttributeValueForTable(value, attr);
        const dataAttr = this.fieldDisplayConfig.interactive ? ` data-column="${attr}"` : '';
        const cssClass = this.fieldDisplayConfig.interactive ? ` column-${attr}` : '';
        return `<td style="max-width: 200px; word-wrap: break-word;" class="toggleable-column${cssClass}"${dataAttr}>${formattedValue}</td>`;
      })
      .join('');
  }

  /**
   * Format attribute value for table display
   */
  private formatAttributeValueForTable(value: any, attributeType: string): string {
    if (!this.hasValidValue(value)) {
      return '<span class="text-muted">—</span>';
    }

    switch (attributeType) {
      case 'format':
        return `<code class="small">${value}</code>`;
      case 'privacy':
        return `<span class="badge bg-info small">${value}</span>`;
      case 'complianceNotes':
        return `<span class="text-primary small">${this.truncateText(value, 50)}</span>`;
      case 'examples':
        if (Array.isArray(value)) {
          const examples = value.slice(0, 2).map(ex => `<code>${ex}</code>`).join(', ');
          return value.length > 2 ? `${examples}...` : examples;
        }
        return value;
      case 'validValues':
        if (Array.isArray(value)) {
          const values = value.slice(0, 3).map(val => `<code>${val}</code>`).join(', ');
          return value.length > 3 ? `${values}...` : values;
        }
        return value;
      case 'integrationMapping':
        if (typeof value === 'object') {
          const systems = Object.keys(value).slice(0, 2).join(', ');
          return Object.keys(value).length > 2 ? `${systems}...` : systems;
        }
        return value;
      case 'consequences':
        return `<span class="text-warning small">${this.truncateText(value, 60)}</span>`;
      default:
        return `<span class="small">${this.truncateText(value, 80)}</span>`;
    }
  }

  /**
   * Truncate text for table display
   */
  private truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Format attribute value for Markdown table display
   */
  private formatAttributeValueForMarkdown(value: any, attributeType: string): string {
    if (!this.hasValidValue(value)) {
      return '—';
    }

    // Escape pipe characters for Markdown table compatibility
    const escapePipes = (text: string) => text.replace(/\|/g, '\\|');

    switch (attributeType) {
      case 'format':
        return `\`${escapePipes(value)}\``;
      case 'privacy':
        return `**${escapePipes(value)}**`;
      case 'complianceNotes':
        return escapePipes(this.truncateText(value, 40));
      case 'examples':
        if (Array.isArray(value)) {
          const examples = value.slice(0, 2).map(ex => `\`${escapePipes(ex)}\``).join(', ');
          return value.length > 2 ? `${examples}...` : examples;
        }
        return escapePipes(value);
      case 'validValues':
        if (Array.isArray(value)) {
          const values = value.slice(0, 2).map(val => `\`${escapePipes(val)}\``).join(', ');
          return value.length > 2 ? `${values}...` : values;
        }
        return escapePipes(value);
      case 'integrationMapping':
        if (typeof value === 'object') {
          const systems = Object.keys(value).slice(0, 2).join(', ');
          return Object.keys(value).length > 2 ? `${escapePipes(systems)}...` : escapePipes(systems);
        }
        return escapePipes(value);
      case 'consequences':
        return `⚠️ ${escapePipes(this.truncateText(value, 50))}`;
      default:
        return escapePipes(this.truncateText(value, 60));
    }
  }

  /**
   * Get relationship information for a foreign key field
   */
  private getForeignKeyRelationshipInfo(fieldName: string, model: any): any {
    const relationshipFields = model.fields?.filter((f: any) =>
      (f.kind === 'object' || f.kind === 'enum') && f.relationFromFields
    ) || [];

    for (const relationshipField of relationshipFields) {
      if (relationshipField.relationFromFields && relationshipField.relationFromFields.includes(fieldName)) {
        return {
          objectFieldName: relationshipField.name,
          relatedModel: relationshipField.type,
          relationFromFields: relationshipField.relationFromFields,
          relationToFields: relationshipField.relationToFields
        };
      }
    }

    return null;
  }

  /**
   * Generate meaningful description for foreign key fields
   */
  private generateMeaningfulFKDescription(field: any, relationshipInfo: any, model: any): string {
    const fieldName = field.name;
    let relatedModel = relationshipInfo?.relatedModel;
    const objectFieldName = relationshipInfo?.objectFieldName;

    // Use existing documentation if it's meaningful (not generic)
    if (field.documentation &&
        !field.documentation.includes('Foreign key reference') &&
        !field.documentation.includes('Purpose: Relationship to referenced entity')) {
      return field.documentation;
    }

    // If we don't have relationship info but field follows *Id pattern, infer the model
    if (!relatedModel && fieldName.endsWith('Id')) {
      const baseName = fieldName.replace(/Id$/, '');
      // Capitalize first letter for model name
      relatedModel = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    }

    // Generate meaningful description based on field names
    let description = '';

    if (fieldName.endsWith('Id')) {
      // Standard foreign key naming (e.g., siteId -> Site)
      const baseName = fieldName.replace(/Id$/, '');

      if (fieldName.includes('parent') || objectFieldName?.includes('parent')) {
        description = `References the parent ${relatedModel} in the ${model.name} hierarchy`;
      } else if (fieldName.includes('owner') || objectFieldName?.includes('owner')) {
        description = `References the ${relatedModel} that owns this ${model.name}`;
      } else if (fieldName.includes('created') || fieldName.includes('modified') || fieldName.includes('updated')) {
        description = `References the ${relatedModel} who performed this action on ${model.name}`;
      } else if (fieldName.includes('assigned') || fieldName.includes('responsible')) {
        description = `References the ${relatedModel} assigned to or responsible for this ${model.name}`;
      } else {
        description = `References the ${relatedModel} record that this ${model.name} is associated with`;
      }
    } else {
      // Non-standard naming
      description = `References the associated ${relatedModel || 'related'} record for this ${model.name}`;
    }

    // Add field-specific context if available
    if (field.isOptional) {
      description += ' (optional relationship)';
    }

    return description;
  }

  /**
   * Check if a field is a measurement field that should have unit information
   */
  private isMeasurementField(field: any): boolean {
    // Only consider numeric fields (Int, Float)
    if (!['Int', 'Float'].includes(field.type)) {
      return false;
    }

    const fieldName = field.name.toLowerCase();

    // Time-related measurements
    const timeFields = ['duration', 'time', 'setuptime', 'teardowntime', 'cycletime', 'mincycletime', 'maxcycletime'];

    // Statistical Process Control and limits
    const spcFields = ['minvalue', 'maxvalue', 'engineeringmin', 'engineeringmax', 'lsl', 'usl', 'nominalvalue', 'lowerlimit', 'upperlimit'];

    // Physical measurements
    const physicalFields = ['weight', 'length', 'width', 'height', 'depth', 'thickness', 'diameter', 'radius', 'area', 'volume', 'quantity'];

    // Process measurements
    const processFields = ['temperature', 'pressure', 'voltage', 'current', 'power', 'flow', 'rate', 'speed', 'velocity', 'rpm'];

    // Alarm and monitoring values
    const alarmFields = ['highalarm', 'lowalarm', 'highhighalarm', 'lowlowalarm'];

    // General measurement and result fields
    const measurementFields = ['value', 'result', 'reading', 'measurement'];

    const allMeasurementFields = [
      ...timeFields,
      ...spcFields,
      ...physicalFields,
      ...processFields,
      ...alarmFields,
      ...measurementFields
    ];

    return allMeasurementFields.some(pattern => fieldName.includes(pattern));
  }

  /**
   * Enhance field description with unit information
   */
  private enhanceDescriptionWithUnits(field: any, model: any, currentDescription: string): string {
    const fieldName = field.name.toLowerCase();

    // Skip if description already mentions specific units (but allow general "unit" references)
    if (currentDescription.toLowerCase().includes('kg') ||
        currentDescription.toLowerCase().includes('minute') ||
        currentDescription.toLowerCase().includes('second') ||
        currentDescription.toLowerCase().includes('meter') ||
        currentDescription.toLowerCase().includes('degree') ||
        currentDescription.toLowerCase().includes('volts') ||
        currentDescription.toLowerCase().includes('amperes') ||
        currentDescription.toLowerCase().includes('watts') ||
        currentDescription.toLowerCase().includes('typically in') ||
        currentDescription.toLowerCase().includes('units specified in')) {
      return currentDescription;
    }

    // Check if model has unitOfMeasure or unit field
    const hasUnitField = model.fields?.some((f: any) =>
      f.name === 'unitOfMeasure' || f.name === 'unit'
    );

    let unitInfo = '';

    // Time-related fields - specify common units
    if (fieldName.includes('duration') || fieldName.includes('time')) {
      if (fieldName.includes('cycle')) {
        unitInfo = ' (typically in seconds)';
      } else {
        unitInfo = ' (typically in minutes)';
      }
    }

    // Statistical Process Control fields
    else if (['lsl', 'usl', 'nominalvalue', 'minvalue', 'maxvalue', 'engineeringmin', 'engineeringmax'].some(term => fieldName.includes(term))) {
      if (hasUnitField) {
        unitInfo = ' (units specified in `unitOfMeasure` field)';
      } else {
        // Specific SPC term explanations
        if (fieldName.includes('lsl')) {
          return currentDescription.replace('L s l', 'Lower Specification Limit (LSL)') + ' (units vary by characteristic)';
        } else if (fieldName.includes('usl')) {
          return currentDescription.replace('U s l', 'Upper Specification Limit (USL)') + ' (units vary by characteristic)';
        } else {
          unitInfo = ' (units vary by parameter type)';
        }
      }
    }

    // Weight fields
    else if (fieldName.includes('weight')) {
      unitInfo = ' (typically in kilograms)';
    }

    // Quantity fields
    else if (fieldName.includes('quantity')) {
      if (hasUnitField) {
        unitInfo = '. Quantity units specified in `unitOfMeasure` field';
        return currentDescription.replace('Numerical quantity', 'Material or part quantity') + unitInfo;
      } else {
        return currentDescription.replace('Numerical quantity', 'Material or part quantity (units context-dependent)');
      }
    }

    // Alarm values
    else if (['highalarm', 'lowalarm', 'highhighalarm', 'lowlowalarm'].some(term => fieldName.includes(term))) {
      unitInfo = ' (units match monitored parameter)';
    }

    // Temperature
    else if (fieldName.includes('temperature') || fieldName.includes('temp')) {
      unitInfo = ' (typically in °C)';
    }

    // Pressure
    else if (fieldName.includes('pressure')) {
      unitInfo = ' (typically in bar or PSI)';
    }

    // Electrical measurements
    else if (fieldName.includes('voltage')) {
      unitInfo = ' (in volts)';
    } else if (fieldName.includes('current')) {
      unitInfo = ' (in amperes)';
    } else if (fieldName.includes('power')) {
      unitInfo = ' (in watts)';
    }

    // Dimensional measurements
    else if (['length', 'width', 'height', 'depth', 'thickness', 'diameter', 'radius'].some(term => fieldName.includes(term))) {
      unitInfo = ' (typically in millimeters)';
    } else if (fieldName.includes('area')) {
      unitInfo = ' (typically in mm²)';
    } else if (fieldName.includes('volume')) {
      unitInfo = ' (typically in cm³ or liters)';
    }

    // Speed/Rate measurements
    else if (fieldName.includes('rpm')) {
      unitInfo = ' (in revolutions per minute)';
    } else if (fieldName.includes('rate') || fieldName.includes('speed') || fieldName.includes('velocity')) {
      unitInfo = ' (units vary by context)';
    } else if (fieldName.includes('flow')) {
      unitInfo = ' (typically in L/min or m³/h)';
    }

    // Generic measurement fields
    else if (['value', 'result', 'reading', 'measurement'].some(term => fieldName.includes(term))) {
      if (hasUnitField) {
        unitInfo = ' (units specified in associated `unit` field)';
      } else {
        unitInfo = ' (units context-dependent)';
      }
    }

    return currentDescription + unitInfo;
  }

  /**
   * Build comprehensive business rules analytics
   */
  private buildBusinessRulesAnalytics(): any {
    const allRules: any[] = [];

    // Collect all business rules from metadata
    this.metadata.models.forEach(model => {
      if (model.businessRules && Array.isArray(model.businessRules)) {
        model.businessRules.forEach((rule: any) => {
          allRules.push({
            ...rule,
            tableName: model.name,
            category: this.getCategoryForModel(model)
          });
        });
      }
    });

    // Analyze by domain/category
    const byCategory = allRules.reduce((acc, rule) => {
      const category = rule.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(rule);
      return acc;
    }, {});

    // Analyze by priority
    const byPriority = allRules.reduce((acc, rule) => {
      const priority = rule.priority || 'medium';
      if (!acc[priority]) acc[priority] = 0;
      acc[priority]++;
      return acc;
    }, {});

    // Analyze by compliance standard
    const byCompliance = allRules.reduce((acc, rule) => {
      if (rule.compliance && Array.isArray(rule.compliance)) {
        rule.compliance.forEach((standard: string) => {
          if (!acc[standard]) acc[standard] = 0;
          acc[standard]++;
        });
      }
      return acc;
    }, {});

    // Analyze by rule type
    const byType = allRules.reduce((acc, rule) => {
      const type = rule.type || 'validation';
      if (!acc[type]) acc[type] = 0;
      acc[type]++;
      return acc;
    }, {});

    return {
      totalRules: allRules.length,
      totalTables: Object.keys(byCategory).length,
      byCategory,
      byPriority,
      byCompliance,
      byType,
      allRules
    };
  }

  /**
   * Build analytics report content
   */
  private buildAnalyticsReport(analytics: any): string {
    const { totalRules, totalTables, byCategory, byPriority, byCompliance, byType } = analytics;

    return `# Business Rules Analytics Report

> **Generated:** ${new Date().toLocaleString()}
> **Total Rules:** ${totalRules}
> **Total Tables Covered:** ${totalTables}

## Executive Summary

This report provides comprehensive analytics on the business rules implemented across the MachShop MES system, including coverage analysis, compliance mapping, and priority distribution.

## Rule Coverage by Manufacturing Domain

| Domain | Rules | Tables | Avg Rules/Table |
|--------|-------|--------|-----------------|
${Object.entries(byCategory).map(([category, rules]: [string, any]) =>
  `| ${category} | ${rules.length} | ${new Set(rules.map((r: any) => r.tableName)).size} | ${(rules.length / new Set(rules.map((r: any) => r.tableName)).size).toFixed(1)} |`
).join('\n')}

## Priority Distribution

| Priority | Count | Percentage |
|----------|-------|------------|
${Object.entries(byPriority).map(([priority, count]: [string, any]) =>
  `| ${priority.toUpperCase()} | ${count} | ${((count / totalRules) * 100).toFixed(1)}% |`
).join('\n')}

## Compliance Standards Coverage

| Standard | Rules | Tables Affected | Coverage |
|----------|-------|-----------------|----------|
${Object.entries(byCompliance).map(([standard, count]: [string, any]) =>
  `| ${standard} | ${count} | ${new Set(analytics.allRules.filter((r: any) => r.compliance?.includes(standard)).map((r: any) => r.tableName)).size} | ${((count / totalRules) * 100).toFixed(1)}% |`
).join('\n')}

## Rule Type Analysis

| Type | Count | Description |
|------|-------|-------------|
${Object.entries(byType).map(([type, count]: [string, any]) => {
  const descriptions = {
    'validation': 'Data validation and format checking',
    'workflow': 'Business process and state transition rules',
    'constraint': 'Data integrity and relationship constraints',
    'calculation': 'Business calculation and formula rules'
  };
  return `| ${type.toUpperCase()} | ${count} | ${descriptions[type] || 'Other rule type'} |`;
}).join('\n')}

## High Priority Rule Summary

### Critical Priority Rules
${analytics.allRules.filter((r: any) => r.priority === 'critical').map((rule: any) =>
  `- **${rule.tableName}.${rule.field || 'General'}**: ${rule.description}`
).join('\n')}

## Recommendations

### Immediate Actions
1. **Address Critical Rules**: Focus implementation on ${Object.entries(byPriority).find(([p]) => p === 'critical')?.[1] || 0} critical priority rules
2. **Strengthen Compliance**: Expand ${Object.entries(byCompliance).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0]} coverage
3. **Balance Coverage**: Add rules to domains with fewer than 3 rules per table

### Strategic Improvements
- Implement automated rule validation for all constraint and validation type rules
- Create compliance audit trails for all AS9100 and FDA related rules
- Develop dashboards for real-time business rule monitoring

---

*Generated by MachShop Enhanced Documentation System*`;
  }

  /**
   * Build compliance analysis
   */
  private buildComplianceAnalysis(): any {
    const standards = ['AS9100', 'FDA', 'ISO9001', 'SOX', 'GDPR', 'GAAP'];
    const analysis: any = {};

    standards.forEach(standard => {
      const businessRules = this.metadata.models.flatMap(model =>
        (model.businessRules || []).filter((rule: any) =>
          rule.compliance?.includes(standard)
        )
      );

      const fieldRules = this.metadata.models.flatMap(model =>
        model.fields.filter((field: any) =>
          field.complianceNotes?.includes(standard)
        ).map(field => ({ ...field, tableName: model.name }))
      );

      const tableRules = this.metadata.models.filter(model =>
        model.complianceNotes?.includes(standard)
      );

      analysis[standard] = {
        businessRules: businessRules.length,
        fieldRules: fieldRules.length,
        tableRules: tableRules.length,
        totalCoverage: businessRules.length + fieldRules.length + tableRules.length,
        tables: new Set([
          ...businessRules.map((r: any) => r.tableName),
          ...fieldRules.map((r: any) => r.tableName),
          ...tableRules.map((r: any) => r.name)
        ]).size
      };
    });

    return analysis;
  }

  /**
   * Build compliance dashboard content
   */
  private buildComplianceDashboard(compliance: any): string {
    const totalStandards = Object.keys(compliance).length;
    const totalCoverage = Object.values(compliance).reduce((sum: number, std: any) => sum + std.totalCoverage, 0);

    return `# Compliance Coverage Dashboard

> **Generated:** ${new Date().toLocaleString()}
> **Standards Tracked:** ${totalStandards}
> **Total Compliance Points:** ${totalCoverage}

## Regulatory Standards Overview

| Standard | Business Rules | Field Rules | Table Rules | Total Coverage | Tables |
|----------|----------------|-------------|-------------|----------------|--------|
${Object.entries(compliance).map(([standard, data]: [string, any]) =>
  `| **${standard}** | ${data.businessRules} | ${data.fieldRules} | ${data.tableRules} | ${data.totalCoverage} | ${data.tables} |`
).join('\n')}

## Compliance Strength Analysis

### 🔴 Critical Compliance (Mandatory)
- **AS9100**: Aerospace quality management requirements
- **FDA**: Medical device and pharmaceutical regulations
- **ISO9001**: Quality management system standards

### 🟡 Important Compliance (Business Critical)
- **SOX**: Financial reporting and internal controls
- **GDPR**: Personal data protection requirements
- **GAAP**: Financial accounting standards

## Coverage Recommendations

### Immediate Priorities
${Object.entries(compliance)
  .sort(([,a], [,b]) => (a as any).totalCoverage - (b as any).totalCoverage)
  .slice(0, 3)
  .map(([standard, data]: [string, any]) =>
    `1. **${standard}**: Increase coverage from ${data.totalCoverage} points across ${data.tables} tables`
  ).join('\n')}

### Audit Readiness
| Standard | Current Status | Recommendation |
|----------|----------------|----------------|
${Object.entries(compliance).map(([standard, data]: [string, any]) => {
  let status = 'Needs Improvement';
  if (data.totalCoverage >= 10) status = 'Good';
  if (data.totalCoverage >= 20) status = 'Excellent';

  let recommendation = 'Add comprehensive coverage';
  if (data.totalCoverage >= 10) recommendation = 'Maintain current level';
  if (data.totalCoverage >= 20) recommendation = 'Ready for audit';

  return `| ${standard} | ${status} | ${recommendation} |`;
}).join('\n')}

---

*Generated by MachShop Enhanced Documentation System*`;
  }

  /**
   * Build stakeholder-specific view
   */
  private buildStakeholderView(stakeholder: string): string {
    const stakeholderConfigs = {
      engineering: {
        title: 'Engineering View',
        focus: ['validation', 'constraint', 'calculation'],
        categories: ['Core Infrastructure', 'Production Management', 'Equipment Management'],
        fieldTypes: ['measurement', 'calculation', 'technical'],
        icon: '⚙️'
      },
      quality: {
        title: 'Quality Assurance View',
        focus: ['workflow', 'validation'],
        categories: ['Quality Management', 'Non-Conformance', 'Audit'],
        fieldTypes: ['audit', 'regulatory', 'measurement'],
        icon: '🔍'
      },
      production: {
        title: 'Production Management View',
        focus: ['workflow', 'calculation'],
        categories: ['Production Management', 'Material Management', 'Personnel Management'],
        fieldTypes: ['status', 'workflow', 'calculation'],
        icon: '🏭'
      },
      management: {
        title: 'Executive Management View',
        focus: ['critical', 'high'],
        categories: ['All'],
        fieldTypes: ['financial', 'audit', 'regulatory'],
        icon: '📊'
      }
    };

    const config = stakeholderConfigs[stakeholder];
    if (!config) return '';

    // Filter relevant business rules
    const relevantRules = this.metadata.models.flatMap(model =>
      (model.businessRules || []).filter((rule: any) => {
        if (stakeholder === 'management') {
          return rule.priority === 'critical' || rule.priority === 'high';
        }
        return config.focus.includes(rule.type) || config.focus.includes(rule.priority);
      }).map(rule => ({ ...rule, tableName: model.name }))
    );

    // Filter relevant tables by category
    const relevantTables = this.metadata.models.filter(model => {
      const category = this.getCategoryForModel(model);
      return config.categories.includes('All') || config.categories.includes(category);
    });

    return `# ${config.icon} ${config.title}

> **Generated:** ${new Date().toLocaleString()}
> **Focus Areas:** ${config.focus.join(', ')}
> **Relevant Tables:** ${relevantTables.length}
> **Key Rules:** ${relevantRules.length}

## Overview

This view provides ${stakeholder} stakeholders with focused documentation relevant to their responsibilities and decision-making needs.

## Key Business Rules

${relevantRules.slice(0, 10).map(rule => `
### ${rule.tableName}.${rule.field || 'General'}
- **Rule**: ${rule.description}
- **Priority**: ${rule.priority?.toUpperCase() || 'MEDIUM'}
- **Impact**: ${rule.businessJustification || 'Not specified'}
- **Compliance**: ${rule.compliance?.join(', ') || 'None specified'}
`).join('')}

## Relevant Tables

| Table | Category | Key Fields | Business Impact |
|-------|----------|------------|-----------------|
${relevantTables.slice(0, 15).map(model => {
  const category = this.getCategoryForModel(model);
  const keyFields = model.fields.slice(0, 3).map((f: any) => f.name).join(', ');
  const impact = model.businessPurpose || model.documentation || 'Core system table';
  return `| ${model.name} | ${category} | ${keyFields} | ${impact.slice(0, 50)}... |`;
}).join('\n')}

## Action Items for ${config.title}

### High Priority
${relevantRules.filter(r => r.priority === 'critical' || r.priority === 'high').slice(0, 5).map(rule =>
  `- [ ] **${rule.tableName}**: ${rule.description}`
).join('\n')}

### Monitoring Recommendations
- Review business rules quarterly for ${config.focus.join(' and ')} compliance
- Monitor key performance indicators related to ${config.categories.join(', ').toLowerCase()}
- Ensure stakeholder training on critical business rules

---

*Tailored for ${config.title} by MachShop Enhanced Documentation System*`;
  }

  /**
   * Generate interactive control panel for column toggling
   */
  private generateInteractiveControlPanel(): string {
    const allAttributes = [
      'businessRule', 'businessPurpose', 'businessJustification', 'businessImpact',
      'dataSource', 'format', 'examples', 'validation', 'calculations',
      'privacy', 'retention', 'auditTrail', 'integrationMapping',
      'validValues', 'complianceNotes', 'consequences'
    ];

    const attributeLabels = {
      'businessRule': '📋 Business Rule',
      'businessPurpose': '🎯 Purpose',
      'businessJustification': '📊 Justification',
      'businessImpact': '⚡ Impact',
      'dataSource': '📥 Source',
      'format': '📝 Format',
      'examples': '💡 Examples',
      'validation': '✅ Validation',
      'calculations': '🧮 Calculations',
      'privacy': '🔐 Privacy',
      'retention': '📅 Retention',
      'auditTrail': '📋 Audit',
      'integrationMapping': '🔗 Integration',
      'validValues': '🎛️ Valid Values',
      'complianceNotes': '⚖️ Compliance',
      'consequences': '⚠️ Consequences'
    };

    const presetConfigs = EnhancedDocumentationGenerator.getPresetConfigs();

    return `
        <!-- Interactive Column Controls -->
        <div class="card mb-4" id="columnControls">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">🎛️ Interactive Column Controls</h5>
                <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse"
                        data-bs-target="#columnControlsBody" aria-expanded="true">
                    Toggle Controls
                </button>
            </div>
            <div class="collapse show" id="columnControlsBody">
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-12">
                            <h6>📋 Quick Presets:</h6>
                            <div class="btn-group flex-wrap" role="group">
                                ${Object.entries(presetConfigs).map(([preset, config]) =>
                                    `<button type="button" class="btn btn-outline-primary btn-sm" onclick="applyPreset('${preset}')">${preset.replace(/-/g, ' ')}</button>`
                                ).join('')}
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="toggleAllColumns(true)">Show All</button>
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="toggleAllColumns(false)">Hide All</button>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-12">
                            <h6>🔧 Individual Attributes:</h6>
                            <div class="row">
                                ${allAttributes.map(attr => `
                                    <div class="col-xl-3 col-lg-4 col-md-6 mb-2">
                                        <div class="form-check">
                                            <input class="form-check-input column-toggle" type="checkbox" value="${attr}"
                                                   id="toggle-${attr}" checked onchange="toggleColumn('${attr}')">
                                            <label class="form-check-label small" for="toggle-${attr}">
                                                ${attributeLabels[attr]}
                                            </label>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-12">
                            <small class="text-muted">
                                💡 Your column preferences are automatically saved and will be restored when you revisit this page.
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
  }

  /**
   * Generate CSS for interactive controls
   */
  private generateInteractiveCSS(): string {
    return `
        /* Interactive Column Controls */
        #columnControls {
            border: 2px solid #007bff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,123,255,0.1);
        }

        .column-toggle {
            cursor: pointer;
        }

        .toggleable-column {
            transition: all 0.3s ease;
        }

        .toggleable-column.hidden {
            display: none !important;
        }

        .btn-group .btn {
            margin: 2px;
        }

        .form-check {
            padding: 4px 8px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }

        .form-check:hover {
            background-color: #f8f9fa;
        }

        .form-check-input:checked + .form-check-label {
            font-weight: 500;
            color: #007bff;
        }

        /* Responsive table handling */
        @media (max-width: 768px) {
            .table-responsive {
                font-size: 0.85em;
            }

            .toggleable-column {
                min-width: 120px !important;
            }
        }

        /* Column fade effect */
        .toggleable-column.fading-out {
            opacity: 0.3;
            transform: scale(0.95);
        }

        /* Preset button styling */
        .btn-group .btn.active-preset {
            background-color: #007bff;
            color: white;
            border-color: #007bff;
        }`;
  }

  /**
   * Generate JavaScript for interactive controls
   */
  private generateInteractiveJavaScript(): string {
    const presetConfigs = EnhancedDocumentationGenerator.getPresetConfigs();

    return `
        // Interactive Column Toggle Functionality
        const STORAGE_KEY = 'machshop-column-preferences';

        // Preset configurations
        const presets = ${JSON.stringify(presetConfigs, null, 2)};

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadColumnPreferences();
            updateColumnCounts();
        });

        function toggleColumn(columnName) {
            const isVisible = document.getElementById('toggle-' + columnName).checked;
            const columns = document.querySelectorAll('[data-column="' + columnName + '"]');

            columns.forEach(col => {
                if (isVisible) {
                    col.classList.remove('hidden');
                    col.classList.remove('fading-out');
                } else {
                    col.classList.add('fading-out');
                    setTimeout(() => {
                        col.classList.add('hidden');
                        col.classList.remove('fading-out');
                    }, 300);
                }
            });

            saveColumnPreferences();
            updateColumnCounts();
        }

        function toggleAllColumns(show) {
            const checkboxes = document.querySelectorAll('.column-toggle');
            checkboxes.forEach(checkbox => {
                checkbox.checked = show;
                toggleColumn(checkbox.value);
            });
        }

        function applyPreset(presetName) {
            const preset = presets[presetName];
            if (!preset) return;

            // Reset all checkboxes
            const checkboxes = document.querySelectorAll('.column-toggle');
            checkboxes.forEach(checkbox => {
                const shouldShow = preset.showInMainTable.includes(checkbox.value);
                checkbox.checked = shouldShow;
                toggleColumn(checkbox.value);
            });

            // Visual feedback for preset button
            document.querySelectorAll('.btn-group .btn').forEach(btn => {
                btn.classList.remove('active-preset');
            });
            event.target.classList.add('active-preset');

            setTimeout(() => {
                event.target.classList.remove('active-preset');
            }, 2000);

            showNotification('Applied preset: ' + presetName.replace(/-/g, ' '));
        }

        function saveColumnPreferences() {
            const preferences = {};
            document.querySelectorAll('.column-toggle').forEach(checkbox => {
                preferences[checkbox.value] = checkbox.checked;
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        }

        function loadColumnPreferences() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const preferences = JSON.parse(saved);
                    Object.entries(preferences).forEach(([column, isVisible]) => {
                        const checkbox = document.getElementById('toggle-' + column);
                        if (checkbox) {
                            checkbox.checked = isVisible;
                            toggleColumn(column);
                        }
                    });
                }
            } catch (e) {
                console.warn('Could not load column preferences:', e);
            }
        }

        function updateColumnCounts() {
            const visibleCount = document.querySelectorAll('.column-toggle:checked').length;
            const totalCount = document.querySelectorAll('.column-toggle').length;

            // Update any column count displays
            const countDisplay = document.getElementById('column-count');
            if (countDisplay) {
                countDisplay.textContent = \`\${visibleCount}/\${totalCount} columns visible\`;
            }
        }

        function showNotification(message) {
            // Create temporary notification
            const notification = document.createElement('div');
            notification.className = 'alert alert-info alert-dismissible fade show position-fixed';
            notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
            notification.innerHTML = \`
                \${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            \`;
            document.body.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }

        // Export functions for console debugging
        window.machShopControls = {
            toggleColumn,
            toggleAllColumns,
            applyPreset,
            saveColumnPreferences,
            loadColumnPreferences
        };`;
  }

  /**
   * Generate architectural documentation content for different sections
   */
  private generateArchitecturalContent(section: string): string {
    try {
      let filePath: string;
      let title: string;

      switch (section) {
        case 'fundamentals':
          filePath = path.join(this.outputDir, 'database-fundamentals-guide.md');
          title = 'MachShop MES Database Fundamentals Guide';
          break;
        case 'architecture':
          filePath = path.join(this.outputDir, 'database-architecture-overview.md');
          title = 'Database Architecture Overview';
          break;
        case 'business-entities':
          filePath = path.join(this.outputDir, 'core-business-entities.md');
          title = 'Core Business Entities';
          break;
        case 'integration':
          filePath = path.join(this.outputDir, 'application-integration-patterns.md');
          title = 'Application Integration Patterns';
          break;
        default:
          return '<div class="alert alert-warning">Unknown section requested.</div>';
      }

      if (fs.existsSync(filePath)) {
        const markdownContent = fs.readFileSync(filePath, 'utf8');
        const htmlContent = this.convertMarkdownToHTML(markdownContent);

        return `
        <div class="card">
          <div class="card-header">
            <h2 class="mb-0">${title}</h2>
          </div>
          <div class="card-body">
            <div class="architectural-content">
              ${htmlContent}
            </div>
          </div>
        </div>`;
      } else {
        return `
        <div class="alert alert-info">
          <h4>📚 ${title}</h4>
          <p>This architectural documentation section is being generated. Please regenerate the documentation to see the complete content.</p>
          <p><strong>Expected file:</strong> <code>${filePath}</code></p>
        </div>`;
      }
    } catch (error) {
      return `
      <div class="alert alert-danger">
        <h4>Error Loading ${section}</h4>
        <p>Unable to load architectural documentation: ${error.message}</p>
      </div>`;
    }
  }

  /**
   * Convert Markdown to basic HTML for embedding in the documentation
   */
  private convertMarkdownToHTML(markdown: string): string {
    // Basic Markdown to HTML conversion
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^## (.*$)/gm, '<h3>$1</h3>')
      .replace(/^# (.*$)/gm, '<h2>$1</h2>')

      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-light p-3 rounded"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-light px-1 rounded">$1</code>')

      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')

      // Lists
      .replace(/^\- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')

      // Tables - basic support
      .replace(/\|(.+)\|/g, (match, content) => {
        const cells = content.split('|').map(cell => cell.trim()).filter(cell => cell);
        const isHeader = content.includes('---');
        if (isHeader) return ''; // Skip separator rows

        const tag = cells.every(cell => cell.includes('**')) ? 'th' : 'td';
        const row = cells.map(cell => `<${tag}>${cell.replace(/\*\*/g, '')}</${tag}>`).join('');
        return `<tr>${row}</tr>`;
      })
      .replace(/(<tr>.*<\/tr>)/gs, '<table class="table table-striped"><tbody>$1</tbody></table>')

      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-decoration-none">$1</a>')

      // Line breaks and paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Wrap in paragraphs
    if (html && !html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<table')) {
      html = `<p>${html}</p>`;
    }

    return html;
  }
}

export default EnhancedDocumentationGenerator;