/**
 * Minimal Documentation Base Class
 * Provides essential functionality for enhanced documentation generator
 */

import { SchemaMetadata } from './types/schema-metadata';

export default class MinimalDocumentationBase {
  protected metadata: SchemaMetadata;
  protected outputDir: string;

  constructor(metadata: SchemaMetadata, outputDir: string = './docs/generated') {
    this.metadata = metadata;
    this.outputDir = outputDir;
  }

  /**
   * Base method for generating markdown - to be overridden
   */
  async generateMarkdownDocumentation(): Promise<void> {
    // Base implementation - enhanced generator will override this
  }

  /**
   * Base method for generating HTML - to be overridden
   */
  async generateHTMLDocumentation(): Promise<void> {
    // Base implementation - enhanced generator will override this
  }

  /**
   * Base method for generating CSV - to be overridden
   */
  async generateCSVExport(): Promise<void> {
    // Base implementation - enhanced generator will override this
  }

  /**
   * Base method for generating JSON - to be overridden
   */
  async generateJSONExport(): Promise<void> {
    // Base implementation - enhanced generator will override this
  }

  /**
   * Group models by category for organization
   */
  protected groupModelsByCategory(): Record<string, any[]> {
    const categories: Record<string, any[]> = {};

    for (const model of this.metadata.models) {
      // Simple categorization based on model name patterns
      let category = 'Other';
      const name = model.name.toLowerCase();

      if (name.includes('user') || name.includes('personnel') || name.includes('person')) {
        category = 'Personnel Management';
      } else if (name.includes('work') && name.includes('order')) {
        category = 'Production Management';
      } else if (name.includes('material') || name.includes('inventory')) {
        category = 'Material Management';
      } else if (name.includes('quality') || name.includes('inspection')) {
        category = 'Quality Management';
      } else if (name.includes('equipment') || name.includes('machine')) {
        category = 'Equipment Management';
      } else if (name.includes('document') || name.includes('instruction')) {
        category = 'Document Management';
      } else if (name.includes('role') || name.includes('permission')) {
        category = 'Security & Access';
      } else if (name.includes('site') || name.includes('area')) {
        category = 'Core Infrastructure';
      }

      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(model);
    }

    return categories;
  }

  /**
   * Calculate documentation coverage statistics
   */
  protected calculateDocumentationCoverage(): any {
    let tablesWithDocs = 0;
    let fieldsWithDocs = 0;
    let totalFields = 0;

    for (const model of this.metadata.models) {
      if (model.documentation) {
        tablesWithDocs++;
      }

      for (const field of model.fields) {
        totalFields++;
        if (field.documentation) {
          fieldsWithDocs++;
        }
      }
    }

    return {
      totalTables: this.metadata.models.length,
      tablesWithDocs,
      totalFields,
      fieldsWithDocs,
      tableCoverage: Math.round((tablesWithDocs / this.metadata.models.length) * 100),
      fieldCoverage: Math.round((fieldsWithDocs / totalFields) * 100)
    };
  }

  /**
   * Generate coverage summary section
   */
  protected generateCoverageSummary(stats: any): string {
    return `
## Documentation Coverage Summary

| Metric | Value | Coverage |
|--------|-------|----------|
| **Tables** | ${stats.tablesWithDocs} / ${stats.totalTables} | ${stats.tableCoverage}% |
| **Fields** | ${stats.fieldsWithDocs} / ${stats.totalFields} | ${stats.fieldCoverage}% |

`;
  }

  /**
   * Generate enhanced model markdown
   */
  protected generateEnhancedModelMarkdown(model: any): string {
    let content = `### ${model.name}\n\n`;

    if (model.documentation) {
      content += `${model.documentation}\n\n`;
    }

    content += `**Fields:** ${model.fields.length}\n\n`;
    content += `| Field | Type | Description |\n`;
    content += `|-------|------|-------------|\n`;

    for (const field of model.fields) {
      const description = field.documentation || 'No description available';
      content += `| ${field.name} | ${field.type} | ${description} |\n`;
    }

    content += '\n';
    return content;
  }

  /**
   * Generate enum markdown
   */
  protected generateEnumMarkdown(enumDef: any): string {
    let content = `### ${enumDef.name} (Enum)\n\n`;

    if (enumDef.documentation) {
      content += `${enumDef.documentation}\n\n`;
    }

    content += `**Values:**\n`;
    for (const value of enumDef.values) {
      content += `- \`${value.name}\``;
      if (value.documentation) {
        content += `: ${value.documentation}`;
      }
      content += '\n';
    }

    content += '\n';
    return content;
  }

  /**
   * Generate data governance section
   */
  protected generateDataGovernanceSection(models: any[]): string {
    return `
## Data Governance Information

This section provides data governance information for the manufacturing execution system.

### Data Ownership
- **Technical Owner**: Database Engineering Team
- **Business Owner**: Manufacturing Operations
- **Data Steward**: Quality Assurance Team

### Data Classification
- **Confidentiality**: Internal Use
- **Integrity**: High - Critical manufacturing data
- **Availability**: High - 99.9% uptime required

`;
  }

  /**
   * Generate compliance section
   */
  protected generateComplianceSection(models: any[]): string {
    return `
## Compliance and Security

### Regulatory Compliance
- **AS9100**: Aerospace quality management standards
- **ISO 9001**: Quality management systems
- **NIST Cybersecurity Framework**: Data protection standards

### Data Security
- All personally identifiable information (PII) is encrypted
- Access controls implemented via role-based permissions
- Audit trails maintained for all data modifications

`;
  }

  /**
   * Generate integration section
   */
  protected generateIntegrationSection(models: any[]): string {
    return `
## Integration Points

### External System Interfaces
- **ERP Integration**: Material and production data synchronization
- **Equipment Integration**: Real-time machine data collection
- **Quality Systems**: Measurement and inspection data exchange

### API Endpoints
- RESTful APIs for all major data entities
- Real-time WebSocket connections for live updates
- Batch processing interfaces for bulk operations

`;
  }
}