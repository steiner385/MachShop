/**
 * Comprehensive PDF Generator
 * Combines all MachShop database documentation into a single PDF document
 * Architecture-first order: Fundamentals → Architecture → Business Entities → Integration → Detailed Tables
 */

import * as fs from 'fs';
import * as path from 'path';

interface DocumentSection {
  title: string;
  filePath: string;
  priority: number;
  category: 'architectural' | 'detailed' | 'specialized';
}

export class ComprehensivePDFGenerator {
  private docsDir: string;
  private outputDir: string;

  constructor(docsDir: string = './docs/generated', outputDir: string = './docs/generated') {
    this.docsDir = docsDir;
    this.outputDir = outputDir;
  }

  /**
   * Generate comprehensive PDF documentation
   */
  async generateComprehensivePDF(): Promise<void> {
    console.log('🚀 Starting Comprehensive PDF Generation');

    // Define document structure in architecture-first order
    const sections = this.defineDocumentSections();

    // Generate combined markdown
    const combinedMarkdown = await this.generateCombinedMarkdown(sections);

    // Write combined markdown file
    const markdownPath = path.join(this.outputDir, 'comprehensive-database-documentation.md');
    await fs.promises.writeFile(markdownPath, combinedMarkdown, 'utf8');
    console.log(`📝 Combined markdown: ${markdownPath}`);

    // Generate table of contents
    const tocMarkdown = this.generateTableOfContents(sections);
    const tocPath = path.join(this.outputDir, 'documentation-table-of-contents.md');
    await fs.promises.writeFile(tocPath, tocMarkdown, 'utf8');
    console.log(`📑 Table of contents: ${tocPath}`);

    console.log(`
✅ Comprehensive PDF Documentation Generation Complete!

📄 GENERATED FILES:
   ✓ comprehensive-database-documentation.md - Complete combined documentation
   ✓ documentation-table-of-contents.md - Navigation index

📋 TO GENERATE PDF:
   Use pandoc or similar tool to convert to PDF:

   # Using pandoc (if installed)
   pandoc comprehensive-database-documentation.md -o machshop-database-documentation.pdf --toc --number-sections

   # Using markdown-pdf (npm package)
   npm install -g markdown-pdf
   markdown-pdf comprehensive-database-documentation.md

   # Using VS Code with Markdown PDF extension
   Open the markdown file in VS Code and use "Markdown PDF: Export (pdf)" command

📊 DOCUMENT STRUCTURE:
   ${sections.map(s => `   ${s.priority}. ${s.title}`).join('\n   ')}
`);
  }

  /**
   * Define the document sections in architecture-first order
   */
  private defineDocumentSections(): DocumentSection[] {
    return [
      // 1. Executive Summary and Index
      {
        title: '📚 Documentation Index and Navigation Guide',
        filePath: 'database-documentation-index.md',
        priority: 1,
        category: 'architectural'
      },

      // 2. Fundamentals (Business Guide)
      {
        title: '🎯 MachShop MES Database Fundamentals Guide',
        filePath: 'database-fundamentals-guide.md',
        priority: 2,
        category: 'architectural'
      },

      // 3. Architecture Overview
      {
        title: '🏗️ Database Architecture Overview',
        filePath: 'database-architecture-overview.md',
        priority: 3,
        category: 'architectural'
      },

      // 4. Core Business Entities
      {
        title: '⚡ Core Business Entities in Manufacturing Operations',
        filePath: 'core-business-entities.md',
        priority: 4,
        category: 'architectural'
      },

      // 5. Relationship Diagrams
      {
        title: '🔗 Database Relationship Diagrams and Data Flow',
        filePath: 'database-relationship-diagrams.md',
        priority: 5,
        category: 'architectural'
      },

      // 6. Integration Patterns
      {
        title: '🔌 Application Integration Patterns',
        filePath: 'application-integration-patterns.md',
        priority: 6,
        category: 'architectural'
      },

      // 7. Schema Summary
      {
        title: '📊 Database Schema Summary',
        filePath: 'schema-summary.md',
        priority: 7,
        category: 'detailed'
      },

      // 8. Coverage and Analytics
      {
        title: '📈 Documentation Coverage Report',
        filePath: 'coverage-report.md',
        priority: 8,
        category: 'detailed'
      },

      // 9. Business Rules Analytics
      {
        title: '🧭 Business Rules Analytics',
        filePath: 'business-rules-analytics.md',
        priority: 9,
        category: 'specialized'
      },

      // 10. Compliance Dashboard
      {
        title: '⚖️ Compliance and Regulatory Dashboard',
        filePath: 'compliance-dashboard.md',
        priority: 10,
        category: 'specialized'
      },

      // 11. Enhanced Table Documentation
      {
        title: '📋 Complete Database Tables Documentation',
        filePath: 'schema-tables-enhanced.md',
        priority: 11,
        category: 'detailed'
      },

      // 12. Relationship Details
      {
        title: '🔄 Database Relationships Reference',
        filePath: 'schema-relationships.md',
        priority: 12,
        category: 'detailed'
      },

      // 13. Specialized Views
      {
        title: '👥 Management View',
        filePath: 'management-view.md',
        priority: 13,
        category: 'specialized'
      },
      {
        title: '🔧 Engineering View',
        filePath: 'engineering-view.md',
        priority: 14,
        category: 'specialized'
      },
      {
        title: '⚙️ Production View',
        filePath: 'production-view.md',
        priority: 15,
        category: 'specialized'
      },
      {
        title: '🔍 Quality Assurance View',
        filePath: 'quality-view.md',
        priority: 16,
        category: 'specialized'
      }
    ];
  }

  /**
   * Generate combined markdown document
   */
  private async generateCombinedMarkdown(sections: DocumentSection[]): Promise<string> {
    const timestamp = new Date().toLocaleString();
    let combinedContent = `# MachShop MES Database Documentation
## Comprehensive Architectural and Technical Reference

> **Generated:** ${timestamp}
> **Version:** Complete Database Documentation Suite
> **Coverage:** 186 Tables, 3,536 Fields, 417 Relationships

---

## Document Overview

This comprehensive documentation combines architectural overview, business context, and detailed technical specifications for the MachShop Manufacturing Execution System database. The documentation is organized in layers, progressing from high-level business concepts to detailed technical implementation.

### Architecture-First Organization

This document follows an **architecture-first** approach, beginning with fundamental concepts and building toward detailed specifications:

1. **Business Foundation** - Understanding MES operations and business context
2. **System Architecture** - Database design principles and domain organization
3. **Entity Relationships** - Core business objects and their interactions
4. **Integration Patterns** - How the database supports application integrations
5. **Detailed Reference** - Complete table, field, and relationship specifications
6. **Specialized Views** - Role-specific documentation for different stakeholders

---

`;

    // Process each section
    for (const section of sections.sort((a, b) => a.priority - b.priority)) {
      console.log(`📄 Processing: ${section.title}`);

      const filePath = path.join(this.docsDir, section.filePath);

      if (fs.existsSync(filePath)) {
        try {
          const content = await fs.promises.readFile(filePath, 'utf8');

          // Add section header
          combinedContent += `\\newpage\n\n` + // LaTeX page break for PDF generation
            `# ${section.title}\n\n` +
            `*Category: ${section.category.charAt(0).toUpperCase() + section.category.slice(1)} Documentation*\n\n` +
            `---\n\n`;

          // Clean the content (remove the original title if it exists)
          let cleanedContent = content.replace(/^# .*$/m, ''); // Remove first H1 title
          cleanedContent = cleanedContent.replace(/^> \*\*Generated:.*$/gm, ''); // Remove generation timestamps
          cleanedContent = cleanedContent.replace(/^> \*\*Purpose:.*$/gm, ''); // Remove purpose lines
          cleanedContent = cleanedContent.replace(/^> \*\*Audience:.*$/gm, ''); // Remove audience lines
          cleanedContent = cleanedContent.trim();

          combinedContent += cleanedContent + '\n\n';

        } catch (error) {
          console.warn(`⚠️  Warning: Could not read ${section.filePath}: ${error.message}`);
          combinedContent += `## ${section.title}\n\n*Documentation section not available - file may need to be generated.*\n\n`;
        }
      } else {
        console.warn(`⚠️  Warning: File not found: ${section.filePath}`);
        combinedContent += `## ${section.title}\n\n*Documentation section not available - file not found.*\n\n`;
      }
    }

    // Add footer
    combinedContent += `
---

## Document Information

**Generated:** ${timestamp}
**Generator:** MachShop Enhanced Documentation System
**Source:** Database schema analysis with business context integration
**Coverage:** Complete architectural and technical documentation

### Documentation Maintenance

This documentation is automatically generated from the live database schema and should be updated whenever significant schema changes are made.

**Regeneration Command:**
\`\`\`bash
npx tsx src/tools/comprehensive-pdf-generator.ts
\`\`\`

**Integration with Schema Changes:**
The documentation includes both automatically extracted schema information and manually curated business context. When updating:

1. Schema changes are automatically reflected in table/field documentation
2. Business rules and architectural context may need manual updates
3. Integration patterns should be reviewed for new functionality

### Support and Feedback

For documentation improvements or questions:
- Technical issues: Review the enhanced-doc-generator.ts source
- Business context: Coordinate with manufacturing domain experts
- Integration patterns: Consult with system integration team

---

*End of MachShop MES Database Documentation*
`;

    return combinedContent;
  }

  /**
   * Generate table of contents document
   */
  private generateTableOfContents(sections: DocumentSection[]): string {
    const timestamp = new Date().toLocaleString();

    let toc = `# MachShop MES Database Documentation
## Table of Contents and Navigation Guide

> **Generated:** ${timestamp}
> **Purpose:** Navigation index for comprehensive database documentation

## Document Structure

The MachShop database documentation is organized in an **architecture-first** approach, progressing from business concepts to technical details:

### 📚 Part I: Architectural Foundation
Business context and system design principles

`;

    const architecturalSections = sections.filter(s => s.category === 'architectural');
    for (const section of architecturalSections) {
      toc += `${section.priority}. [${section.title}](#${this.createAnchor(section.title)})\n`;
    }

    toc += `\n### 📊 Part II: Detailed Technical Reference
Complete database schema and field specifications

`;

    const detailedSections = sections.filter(s => s.category === 'detailed');
    for (const section of detailedSections) {
      toc += `${section.priority}. [${section.title}](#${this.createAnchor(section.title)})\n`;
    }

    toc += `\n### 🎯 Part III: Specialized Views
Role-specific documentation for different stakeholders

`;

    const specializedSections = sections.filter(s => s.category === 'specialized');
    for (const section of specializedSections) {
      toc += `${section.priority}. [${section.title}](#${this.createAnchor(section.title)})\n`;
    }

    toc += `
## Quick Access by Role

### 🏢 **Business Stakeholders**
Start here for understanding MES operations and business value:
- [Database Fundamentals Guide](#database-fundamentals-guide)
- [Core Business Entities](#core-business-entities)
- [Management View](#management-view)

### 👨‍💻 **Developers & Architects**
Technical foundation and implementation guidance:
- [Database Architecture Overview](#database-architecture-overview)
- [Database Relationship Diagrams](#database-relationship-diagrams)
- [Complete Database Tables Documentation](#complete-database-tables-documentation)

### 🔧 **System Integrators**
Integration patterns and external system connectivity:
- [Application Integration Patterns](#application-integration-patterns)
- [Database Relationships Reference](#database-relationships-reference)
- [Engineering View](#engineering-view)

### 🏭 **Manufacturing Engineers**
Production and quality management focus:
- [Production View](#production-view)
- [Quality Assurance View](#quality-view)
- [Compliance Dashboard](#compliance-dashboard)

## Document Statistics

| Metric | Value |
|--------|--------|
| **Total Sections** | ${sections.length} |
| **Architectural Sections** | ${architecturalSections.length} |
| **Detailed Reference Sections** | ${detailedSections.length} |
| **Specialized Views** | ${specializedSections.length} |
| **Database Tables** | 186 |
| **Database Fields** | 3,536 |
| **Relationships** | 417 |

---

*This table of contents provides navigation through the complete MachShop MES database documentation suite.*
`;

    return toc;
  }

  /**
   * Create markdown anchor from title
   */
  private createAnchor(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Replace multiple hyphens with single
      .replace(/^-|-$/g, '');   // Remove leading/trailing hyphens
  }
}

// CLI execution
if (require.main === module) {
  const generator = new ComprehensivePDFGenerator();
  generator.generateComprehensivePDF().catch(console.error);
}

export default ComprehensivePDFGenerator;