# Data Dictionary Infrastructure

This directory contains the interactive data dictionary for the MachShop Manufacturing Execution System (MES) database schema.

## Overview

The MachShop MES uses a comprehensive database schema with **186 models**, **3,536 fields**, and **417 relationships** implementing ISA-95 standards for manufacturing operations. This data dictionary provides comprehensive documentation and tools for understanding and working with the database schema.

## Generated Documentation

The following documentation is automatically generated from the Prisma schema:

### 📄 Generated Files

| File | Description | Use Case |
|------|-------------|----------|
| `schema-tables.md` | Comprehensive Markdown documentation | GitHub viewing, technical documentation |
| `data-dictionary.html` | Interactive HTML data dictionary | Web browsing, searching, filtering |
| `schema-export.csv` | CSV export of all tables and fields | Spreadsheet analysis, data imports |
| `schema-metadata.json` | Machine-readable schema metadata | API integration, tooling development |
| `schema-relationships.md` | Detailed relationship documentation | Understanding data connections |
| `schema-summary.md` | High-level analysis and statistics | Quick overview, reporting |

### 🌐 Interactive Features

The HTML data dictionary includes:

- **Search Functionality** - Find tables, fields, or descriptions instantly
- **Category Filtering** - Filter by functional areas (Quality, Production, etc.)
- **Statistics Dashboard** - Overview of schema complexity
- **Responsive Design** - Works on desktop and mobile devices
- **Export Options** - Download data in various formats

## Usage

### Quick Start

```bash
# Generate all documentation formats
npm run docs:schema

# Generate only HTML and Markdown (faster)
npm run docs:schema:quick

# Generate only JSON metadata
npm run docs:schema:json

# Use the full shell script with validation
npm run docs:generate

# Quick generation without ERD update
npm run docs:generate:quick

# Validate existing documentation
npm run docs:validate
```

### Manual Generation

```bash
# Direct tool usage with custom options
npx tsx src/tools/generate-data-dictionary.ts --help
npx tsx src/tools/generate-data-dictionary.ts --formats html,markdown --output ./custom-output
```

### Integration with CI/CD

```bash
# Add to your CI pipeline
./scripts/generate-docs.sh --quick
```

## Schema Statistics

- **186 Database Models** across 10+ functional domains
- **3,536 Total Fields** with comprehensive metadata
- **417 Relationships** mapping data connections
- **152 Enumerations** defining valid values

### Model Distribution by Category

- **Core Infrastructure**: 17 models (Enterprise, Site, Area, Equipment)
- **Production Management**: 20 models (Work Orders, Operations, Routing)
- **Quality Management**: 5 models (NCR, Audits, Inspections)
- **Personnel Management**: 6 models (Users, Skills, Certifications)
- **Material Management**: 10 models (Materials, BOM, Inventory)
- **Document Management**: 13 models (Work Instructions, SOPs)
- **Security & Access**: 10 models (Roles, Permissions, Authentication)
- **Time Tracking**: 5 models (Time entries, Cost codes)
- **Other**: 100 models (Specialized domain models)

## Architecture

### Data Dictionary Infrastructure Components

```
src/tools/
├── generate-data-dictionary.ts    # Main CLI tool
├── metadata-extractor.ts         # Prisma schema parser
├── doc-generator.ts              # Multi-format documentation generator
└── types/schema-metadata.ts      # TypeScript type definitions

scripts/
└── generate-docs.sh              # Shell script with validation

docs/
├── generated/                    # Auto-generated documentation
├── data-dictionary/              # Interactive web interface
└── DATA_DICTIONARY_INFRASTRUCTURE_DESIGN.md
```

### Technology Stack

- **Prisma Schema Parsing** - Direct schema file analysis
- **Multi-format Generation** - HTML, Markdown, CSV, JSON
- **Interactive UI** - Bootstrap + DataTables + Search
- **Type Safety** - Full TypeScript implementation
- **CI/CD Integration** - Automated documentation updates

## Customization

### Adding Business Rules

Enhance your Prisma schema with documentation comments:

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
}
```

### Custom Categories

Modify the categorization logic in `metadata-extractor.ts`:

```typescript
const categories = {
  'Custom Category': ['Model1', 'Model2'],
  // ...
};
```

### Output Formats

Add new output formats by extending `doc-generator.ts`:

```typescript
async generateCustomFormat(): Promise<void> {
  // Implementation
}
```

## Maintenance

### Keeping Documentation Current

The data dictionary should be regenerated whenever the Prisma schema changes:

1. **Automatic** - Add to pre-commit hooks or CI/CD pipeline
2. **Manual** - Run `npm run docs:generate` after schema changes
3. **Validation** - Use `npm run docs:validate` to check for issues

### Performance Considerations

- **Large Schemas** - The tool efficiently handles 100+ models
- **Generation Speed** - ~2-3 seconds for complete documentation
- **File Sizes** - HTML output is 2MB+ for large schemas (normal)
- **Memory Usage** - Minimal memory footprint during generation

## Troubleshooting

### Common Issues

1. **Schema Parse Errors**
   ```bash
   # Check schema syntax
   npx prisma validate
   ```

2. **Permission Errors**
   ```bash
   # Ensure output directory is writable
   chmod +w docs/generated
   ```

3. **Missing Dependencies**
   ```bash
   # Install required packages
   npm install
   ```

### Getting Help

- **Documentation Issues** - Check the design document
- **Tool Bugs** - Review test files for expected behavior
- **Schema Questions** - Refer to Prisma documentation

## Examples

### Quick Schema Overview

```bash
# View summary statistics
cat docs/generated/schema-summary.md
```

### Finding Specific Tables

```bash
# Search for quality-related models
grep -i "quality" docs/generated/schema-tables.md
```

### Integration Examples

```javascript
// Load schema metadata in Node.js
const metadata = require('./docs/generated/schema-metadata.json');
console.log(`Found ${metadata.totalModels} models`);
```

### CSV Analysis

```python
# Analyze schema in Python
import pandas as pd
df = pd.read_csv('docs/generated/schema-export.csv')
print(df.groupby('Category')['Table'].count())
```

## Contributing

When contributing to the data dictionary infrastructure:

1. **Update Tests** - Add tests for new functionality
2. **Update Documentation** - Keep this README current
3. **Test Generation** - Verify all formats generate correctly
4. **Performance** - Consider impact on large schemas

---

**Generated by**: MachShop Data Dictionary Infrastructure
**Last Updated**: October 30, 2025
**Schema Version**: Current Prisma schema
**Total Models**: 186

For more information, see the [Design Document](../DATA_DICTIONARY_INFRASTRUCTURE_DESIGN.md).