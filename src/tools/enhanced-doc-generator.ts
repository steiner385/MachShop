/**
 * Enhanced Documentation Generator
 * Generates documentation with external documentation integration
 */

import DocumentationGenerator from './doc-generator';
import { SchemaMetadata, ModelMetadata } from './types/schema-metadata';
import * as fs from 'fs';
import * as path from 'path';

export class EnhancedDocumentationGenerator extends DocumentationGenerator {
  constructor(metadata: SchemaMetadata, outputDir: string = './docs/generated') {
    super(metadata, outputDir);
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

    // Enhanced fields table
    content += `**Fields (${model.fields.length}):**\n\n`;
    content += '| Field | Type | Required | Default | Description | Business Impact |\n';
    content += '|-------|------|----------|---------|-------------|------------------|\n';

    for (const field of model.fields) {
      const required = field.isOptional ? '' : '✓';
      const defaultVal = field.hasDefaultValue ? (field.defaultValue || 'auto') : '';
      const description = field.documentation || field.businessRule || '';
      const businessImpact = (field as any).businessImpact || '';
      const typeDisplay = field.isList ? `${field.type}[]` : field.type;

      content += `| ${field.name} | ${typeDisplay} | ${required} | ${defaultVal} | ${description} | ${businessImpact} |\n`;
    }

    // Enhanced field details for important fields
    const documentedFields = model.fields.filter(field =>
      (field as any).dataSource || (field as any).validation || (field as any).privacy
    );

    if (documentedFields.length > 0) {
      content += '\n**Field Details:**\n\n';

      for (const field of documentedFields) {
        content += `#### ${field.name}\n\n`;

        const fieldDetails = [];
        if ((field as any).dataSource) fieldDetails.push(`**Data Source:** ${(field as any).dataSource}`);
        if ((field as any).format) fieldDetails.push(`**Format:** ${(field as any).format}`);
        if ((field as any).validation) fieldDetails.push(`**Validation:** ${(field as any).validation}`);
        if ((field as any).privacy) fieldDetails.push(`**Privacy:** ${(field as any).privacy}`);
        if ((field as any).auditTrail) fieldDetails.push(`**Audit Trail:** ${(field as any).auditTrail}`);

        for (const detail of fieldDetails) {
          content += `- ${detail}\n`;
        }

        if ((field as any).examples && (field as any).examples.length > 0) {
          content += `- **Examples:** ${(field as any).examples.join(', ')}\n`;
        }

        if ((field as any).integrationMapping) {
          content += `- **Integration Mapping:**\n`;
          for (const [system, mapping] of Object.entries((field as any).integrationMapping)) {
            content += `  - ${system}: ${mapping}\n`;
          }
        }

        content += '\n';
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
}

export default EnhancedDocumentationGenerator;