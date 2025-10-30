# Data Dictionary Infrastructure & Tooling Design Document

## Overview

This document outlines the design and implementation of comprehensive data dictionary infrastructure for MachShop's Manufacturing Execution System (MES). The system builds upon existing documentation assets while adding automated tooling and enhanced capabilities.

## Current State Assessment

### Existing Assets
- **186 database models** in Prisma schema (57K+ tokens)
- **Prisma ERD Generator** producing Mermaid diagrams (`docs/erd.md` - 87KB)
- **Schema Analysis Document** (`docs/MES_SCHEMA_ANALYSIS.md` - 69KB)
- **D3.js Visualization** (`docs/schema-visualization.html`)
- **10+ functional domains** (ISA-95 hierarchy, personnel, quality, etc.)

### Identified Gaps
1. **Manual Documentation Process** - No automated tooling for metadata extraction
2. **Limited Searchability** - No structured, searchable data dictionary
3. **No CI/CD Integration** - Documentation can become stale
4. **Missing Metadata** - No column descriptions, constraints, or business rules documentation
5. **No Relationship Mapping** - Limited relationship documentation beyond ERD

## Proposed Architecture

### 1. Core Components

#### A. Prisma Schema Parser (`src/tools/schema-parser.ts`)
- **Purpose**: Extract comprehensive metadata from Prisma schema
- **Capabilities**:
  - Parse all models, fields, relationships, and constraints
  - Extract enums, indexes, and database-specific configurations
  - Generate structured JSON metadata for downstream consumption

#### B. Documentation Generator (`src/tools/doc-generator.ts`)
- **Purpose**: Generate multiple documentation formats from parsed metadata
- **Output Formats**:
  - **HTML Data Dictionary** - Interactive, searchable interface
  - **Markdown Documentation** - GitHub-friendly table definitions
  - **JSON Schema Export** - Machine-readable schema definitions
  - **CSV Data Dictionary** - Spreadsheet-compatible export

#### C. Interactive Web Interface (`docs/data-dictionary/`)
- **Purpose**: Provide searchable, filterable database documentation
- **Features**:
  - Table browser with search and filtering
  - Column details with types, constraints, and relationships
  - Visual relationship explorer
  - Export capabilities (PDF, CSV, JSON)

#### D. CI/CD Integration Scripts (`scripts/generate-docs.sh`)
- **Purpose**: Ensure documentation stays current with schema changes
- **Integration Points**:
  - Pre-commit hooks for documentation validation
  - Post-migration documentation regeneration
  - Automated deployment to documentation site

### 2. Enhanced Documentation Standards

#### A. Schema Comments Enhancement
```prisma
model WorkOrder {
  /// Unique identifier for the work order
  /// @business_rule: Auto-generated using CUID format
  /// @required: true
  id String @id @default(cuid())

  /// Human-readable work order number
  /// @format: WO-YYYY-NNNNNN (e.g., WO-2024-000001)
  /// @business_rule: Sequential numbering per site per year
  workOrderNumber String @unique

  // ... other fields
}
```

#### B. Documentation Templates
- **Table Documentation Template** - Standardized format for table descriptions
- **Business Rules Template** - Capturing business logic and constraints
- **Relationship Documentation** - Clear foreign key and association explanations

### 3. Technology Stack

#### Core Technologies
- **TypeScript** - Type-safe tooling development
- **Prisma DMMF** - Prisma's Data Model Meta Format for schema parsing
- **Handlebars** - Template engine for documentation generation
- **SQLite/JSON** - Lightweight storage for extracted metadata
- **GitHub Actions** - CI/CD automation

#### Documentation Technologies
- **Mermaid.js** - Enhanced ERD generation (building on existing)
- **DataTables** - Interactive table browsing
- **Bootstrap** - Responsive UI framework
- **Prism.js** - Syntax highlighting for SQL/Prisma examples

## Implementation Plan

### Phase 1: Core Infrastructure (Current Sprint)
1. **Schema Parser Implementation**
   - Create TypeScript tool to parse Prisma schema
   - Extract models, fields, relationships, enums
   - Generate structured metadata JSON

2. **Basic Documentation Generator**
   - Implement Markdown table generator
   - Create HTML data dictionary template
   - Add npm scripts for documentation generation

3. **CI/CD Integration**
   - Add npm scripts for automated documentation generation
   - Integrate with existing Prisma generate workflow
   - Create git hooks for documentation validation

### Phase 2: Enhanced Features (Future Sprint)
1. **Interactive Web Interface**
   - Build searchable table browser
   - Add visual relationship explorer
   - Implement export capabilities

2. **Advanced Metadata**
   - Enhanced schema comment parsing
   - Business rules documentation
   - Performance index documentation

3. **Integration Enhancements**
   - GitHub Pages deployment
   - Automated change detection
   - Documentation versioning

## File Structure

```
/docs/
├── data-dictionary/
│   ├── index.html              # Interactive data dictionary
│   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   └── data/
│   │       └── schema-metadata.json
│   └── templates/
│       ├── table-detail.hbs
│       └── relationship-map.hbs
├── generated/
│   ├── schema-tables.md        # Generated table documentation
│   ├── schema-relationships.md # Generated relationship documentation
│   └── schema-metadata.json    # Structured schema data
└── templates/
    ├── table-documentation.md  # Template for manual table docs
    └── business-rules.md       # Template for business rules

/src/tools/
├── schema-parser.ts           # Prisma schema parser
├── doc-generator.ts          # Documentation generator
├── metadata-extractor.ts     # Metadata extraction utilities
└── types/
    └── schema-metadata.ts    # TypeScript types for metadata

/scripts/
├── generate-docs.sh          # Main documentation generation script
├── validate-schema-docs.sh   # Validation script for CI/CD
└── deploy-docs.sh           # Documentation deployment script
```

## Benefits

### Immediate Benefits
1. **Automated Documentation** - Eliminates manual documentation maintenance
2. **Comprehensive Coverage** - Documents all 186 models systematically
3. **Developer Productivity** - Faster onboarding and development
4. **Data Governance** - Clear ownership and understanding of data structures

### Long-term Benefits
1. **Compliance Support** - Easier regulatory documentation and audits
2. **Integration Support** - Clear API and data contracts for third parties
3. **Migration Planning** - Better understanding of data dependencies
4. **Business Intelligence** - Foundation for data analysis and reporting

## Success Metrics

1. **Documentation Coverage**: 100% of Prisma models documented
2. **Automation Level**: 0 manual steps for documentation updates
3. **Developer Adoption**: Documentation access metrics and feedback
4. **Maintenance Efficiency**: Reduced time spent on schema documentation

## Risk Mitigation

1. **Schema Change Impact**: Automated validation prevents documentation drift
2. **Performance Impact**: Generated documentation cached and optimized
3. **Maintenance Overhead**: Self-documenting system reduces manual work
4. **Tool Dependencies**: Use stable, well-maintained open source tools

## Next Steps

1. Implement core schema parser and basic documentation generator
2. Add npm scripts and CI/CD integration
3. Generate initial data dictionary from existing schema
4. Validate with development team and iterate
5. Plan Phase 2 enhancements based on feedback

---

**Document Version**: 1.0
**Last Updated**: October 30, 2025
**Author**: Claude Code Assistant
**Status**: Design Phase Complete