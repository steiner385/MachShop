# Schema Documentation Guide

This directory contains external documentation for database tables and fields that enhances the auto-generated data dictionary.

## Documentation Structure

```
docs/schema-documentation/
├── README.md                     # This file
├── table-descriptions.json      # Table-level descriptions and metadata
├── field-descriptions.json      # Field-level descriptions and business rules
├── business-rules.json         # Cross-table business rules and constraints
├── categories/                  # Category-specific documentation
│   ├── core-infrastructure.json
│   ├── production-management.json
│   ├── quality-management.json
│   └── personnel-management.json
└── templates/                   # Templates for documentation
    ├── table-documentation.json
    └── field-documentation.json
```

## Documentation Standards

### Table Documentation Format

```json
{
  "TableName": {
    "description": "Brief description of what this table represents",
    "businessPurpose": "Why this table exists and how it's used in business processes",
    "dataOwner": "Team or role responsible for this data",
    "updateFrequency": "How often data changes (real-time, daily, etc.)",
    "complianceNotes": "Regulatory or compliance considerations",
    "integrations": ["List of systems that integrate with this table"],
    "examples": [
      {
        "scenario": "Common use case description",
        "sampleData": {"field1": "value1", "field2": "value2"}
      }
    ]
  }
}
```

### Field Documentation Format

```json
{
  "TableName": {
    "fieldName": {
      "description": "What this field represents",
      "businessRule": "Business logic or constraints",
      "dataSource": "Where this data comes from",
      "format": "Expected format or pattern",
      "examples": ["example1", "example2"],
      "validation": "Validation rules beyond database constraints",
      "privacy": "PII or sensitive data handling notes",
      "retention": "Data retention requirements"
    }
  }
}
```

## Getting Started

### 1. Priority Tables to Document

Start with these high-impact tables:

**Core Operations:**
- User, WorkOrder, Operation, Routing, Part
- QualityPlan, NCR, Equipment, Material

**Integration Points:**
- ERPMaterialTransaction, QIFMeasurementResult
- IntegrationLog, B2MMessageStatus

### 2. Documentation Process

1. **Identify Stakeholders**: Who knows this data best?
2. **Gather Information**: Interview subject matter experts
3. **Document Systematically**: Use the JSON templates
4. **Review and Validate**: Have data owners review documentation
5. **Integrate**: Run enhanced data dictionary generation

### 3. Collaboration Workflow

```bash
# 1. Generate documentation templates for specific categories
npm run docs:generate-templates -- --category production-management

# 2. Fill in documentation (can be done by business stakeholders)
# Edit the generated JSON files

# 3. Validate documentation format
npm run docs:validate-documentation

# 4. Generate enhanced data dictionary
npm run docs:schema:enhanced

# 5. Review and iterate
open docs/generated/data-dictionary.html
```

## Quality Guidelines

### Required Documentation
- **Every table must have**: description, businessPurpose, dataOwner
- **Key fields must have**: description, businessRule (if applicable)
- **PII fields must have**: privacy and retention notes

### Writing Guidelines
- Use clear, non-technical language for descriptions
- Focus on business value and usage, not implementation details
- Include examples for complex fields
- Specify data owners by role/team, not individual names

### Validation Rules
- All references to other tables must be valid
- Business rules should be testable/verifiable
- Compliance notes must reference specific regulations
- Format specifications should include examples

## Integration with Data Dictionary

The enhanced data dictionary tool will:

1. **Merge Documentation**: Combine schema comments + external docs
2. **Show Data Lineage**: Display data sources and integrations
3. **Highlight Compliance**: Flag PII and regulatory requirements
4. **Enable Search**: Search by business purpose, data owner, etc.
5. **Generate Reports**: Compliance reports, data owner matrices

## Migration Path

### Phase 1: External Documentation (Current)
- Quick to implement
- Business stakeholders can contribute
- No schema changes required

### Phase 2: Hybrid Documentation
- Critical docs moved to schema comments
- External docs for complex business rules
- Version controlled with schema

### Phase 3: Schema-Embedded Documentation
- All documentation in Prisma schema
- Single source of truth
- Type-safe documentation

## Examples

See the `examples/` directory for sample documentation for common MES patterns:
- Manufacturing work order lifecycle
- Quality inspection workflows
- Material traceability chains
- Personnel certification tracking

## Tools and Automation

```bash
# Generate documentation templates
npm run docs:generate-templates

# Validate documentation completeness
npm run docs:validate-coverage

# Generate enhanced data dictionary
npm run docs:schema:enhanced

# Extract documentation from stakeholder interviews
npm run docs:import-from-confluence  # Future enhancement
```

---

**Next Steps:**
1. Create initial table-descriptions.json for top 20 tables
2. Document field meanings for User, WorkOrder, QualityPlan tables
3. Set up review process with data owners
4. Enhance data dictionary tooling to consume external docs