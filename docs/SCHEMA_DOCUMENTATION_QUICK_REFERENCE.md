# MachShop Database Schema - Quick Reference Guide

## Key Numbers at a Glance

| Metric | Count |
|--------|-------|
| **Database Tables** | 398 models |
| **Total Fields** | 7,859 |
| **Enums** | 159 |
| **Enum Values** | ~1,300 |
| **Fields with Examples** | 17 (0.22%) |
| **Fields Missing Examples** | 7,852 (99.78%) |
| **Prisma Schema Lines** | 16,734 |

## Field Naming Patterns (Quick Identify)

### Look For These Suffixes

| Pattern | Count | Examples | Use Case |
|---------|-------|----------|----------|
| `*Status` | 100+ | workOrderStatus, equipmentStatus | Track entity state |
| `*Date` / `*At` / `*Time` | 100+ | createdAt, actualStartDate, clockInTime | Temporal tracking |
| `*Number` | 40+ | workOrderNumber, batchNumber | Traceability IDs |
| `*Code` | 30+ | departmentCode, operationCode | Classification codes |
| `*Id` | 500+ | partId, siteId, userId | Foreign keys |
| `quantity*` | 30+ | quantityCompleted, quantityScrapped | Measurements |

## High-Priority Fields for Example Population

### Tables with Most Fields Missing Examples

1. **User** (201 fields) - Authentication, roles, preferences
2. **Part** (101 fields) - Manufacturing specs, variants
3. **Equipment** (67 fields) - Assets, capabilities
4. **ToolDrawing** (60 fields) - Technical documentation
5. **Site** (57 fields) - Organization structure
6. **WorkOrder** (54 fields) - Production tracking
7. **Operation** (55 fields) - Process steps
8. **BuildRecord** (51 fields) - Production history
9. **EngineeringChangeOrder** (55 fields) - Change management
10. **StandardOperatingProcedure** (46 fields) - Work instructions

## Manufacturing Domain Formats

### Work Order Format
```
WO-YYYY-NNNNNN
Example: WO-2024-000123, WO-2024-R00456
Meaning: Work Order + Year + Sequential Number (Optional Rework indicator)
```

### Material Lot Format
```
LOT + Date + Sequence
Examples: LOT240301001, SUP-ABC-2024-0123, STEEL-2024Q1-456
```

### Standard Timestamp Format
```
ISO 8601 with Timezone
Examples: 2024-10-30T08:15:30.000Z, 2024-11-01T14:22:15.123Z
```

## 159 Enums Breakdown

| Category | Count | Key Examples |
|----------|-------|--------------|
| Personnel & Qualifications | 5 | QualificationType, CertificationStatus, CompetencyLevel |
| Material & Inventory | 6 | MaterialType, MaterialLotStatus, MaterialPropertyType |
| Operations & Routing | 8 | OperationType, ParameterType, DependencyType |
| Production & Scheduling | 8 | WorkOrderStatus, ScheduleState, RoutingType |
| Quality & Compliance | 11 | QualityInspectionStatus, NCRStatus, InspectionResult |
| Equipment & Assets | 7 | EquipmentStatus, EquipmentState, EquipmentCommandStatus |
| Product & Configuration | 5 | ProductType, ProductLifecycleState, ConfigurationType |
| Workflow & Approval | 13 | WorkflowStatus, ApprovalAction, WorkflowEventType |
| Engineering Change | 7 | ECOStatus, ECOType, CRBDecision |
| Integration | 5 | IntegrationType, IntegrationDirection, IntegrationLogStatus |
| Time Tracking | 9 | TimeEntryStatus, TimeType, TimeValidationRuleType |
| Security & Compliance | 8 | SecurityEventType, PermissionChangeType, AuthenticationEventType |
| ICD System | 7 | ICDStatus, InterfaceType, InterfaceCriticality |
| Other Categories | 27 | Various specialized enums |

## Example Templates (Ready to Use)

### String/Text Fields
**Pattern**: Business-specific codes with clear meaning
```json
{
  "examples": [
    "WO-2024-000123",
    "SENSOR_A1_TEMP",
    "Premium_Grade_Steel"
  ]
}
```

### Numeric Fields
**Pattern**: Realistic manufacturing values
```json
{
  "quantity": [100, 500, 1000],
  "price": [25.50, 150.00, 1000.00],
  "percentage": [95.5, 99.9, 0.5],
  "tolerance": [0.01, 0.05, 0.001]
}
```

### Date/Time Fields
**Pattern**: ISO 8601 with timezone
```json
{
  "examples": [
    "2024-10-30T08:15:30.000Z",
    "2024-11-01T14:22:15.123Z",
    "2024-12-25T00:00:00.000Z"
  ]
}
```

### Enum Fields
**Pattern**: Use actual enum values
```json
{
  "status": ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
  "priority": ["LOW", "NORMAL", "HIGH", "URGENT"]
}
```

### Boolean Fields
**Pattern**: Context-specific true/false
```json
{
  "examples": [
    true,
    false
  ]
}
```

## Field-Descriptions.json Structure

### Complete Metadata for Each Field (17 Attributes)
1. `description` - What it does
2. `businessRule` - Rules and constraints
3. `dataSource` - Where data comes from
4. `format` - Expected format/pattern
5. `examples` - **MISSING FOR 7,852 FIELDS**
6. `validation` - Validation rules (regex, constraints)
7. `calculations` - Formula info
8. `privacy` - Data classification
9. `retention` - How long to keep it
10. `auditTrail` - Audit requirements
11. `integrationMapping` - External system mappings
12. `businessImpact` - Impact if wrong
13. `validValues` - For enums
14. `complianceNotes` - Regulatory notes
15. `businessPurpose` - Why it exists
16. `businessJustification` - Justification
17. `consequences` - Bad data consequences

### Example Structure
```json
{
  "workOrderNumber": {
    "description": "Human-readable unique identifier for manufacturing work orders",
    "format": "WO-YYYY-NNNNNN",
    "examples": ["WO-2024-000123", "WO-2024-R00456", "WO-2025-000001"],
    "validation": "Regex: ^WO-\\d{4}-[R]?\\d{6}$",
    "businessPurpose": "Provides unique identification for work orders",
    "complianceNotes": "Required for AS9100 and ISO9001"
  }
}
```

## Documentation Files

| File | Location | Size | Purpose |
|------|----------|------|---------|
| field-descriptions.json | `/docs/schema-documentation/` | 3.2MB | Complete field metadata (missing examples) |
| table-descriptions.json | `/docs/schema-documentation/` | — | Table-level documentation |
| business-rules.json | `/docs/schema-documentation/` | — | Business rule definitions |
| schema_analysis_structured.json | `/docs/schema-documentation/` | 11KB | This analysis in JSON format |
| DATABASE_SCHEMA_ANALYSIS_SUMMARY.md | `/docs/` | 30KB | Complete analysis report |

## Prisma Schema Files

| File | Lines | Purpose |
|------|-------|---------|
| prisma/schema.prisma | 16,734 | Main database schema |
| prisma/modular/modules/ | — | 398 models organized by functional area |
| prisma/modular/modules/enums.prisma | — | All 159 enum definitions |
| prisma/modular/modules/documented/ | — | Documented variant with comments |

## Programmatic Generation Strategy

### Priority Order for Example Population

**Tier 1** (200 fields) - Critical, high-impact
- All Status fields (100+)
- Work Order fields
- Material identification
- Quality results
- Equipment state
- Financial fields

**Tier 2** (500 fields) - Common, medium-impact
- Date/Time fields (100+)
- Quantity fields
- Code fields (30+)
- Operation parameters
- Personnel fields

**Tier 3** (7,152 fields) - Remaining, lower-impact
- Reference fields
- System/audit fields
- Relationship fields

## Quick Implementation Checklist

- [ ] Identify field type (string, number, date, enum, boolean)
- [ ] Check field naming pattern (status, number, code, etc.)
- [ ] Determine manufacturing domain (work order, material, equipment, etc.)
- [ ] Generate examples based on type and domain
- [ ] Validate against existing enum definitions
- [ ] Update field-descriptions.json with examples array
- [ ] Verify format matches validation regex
- [ ] Test with actual manufacturing data

## Key Insights

1. **Documentation Exists**: Field metadata is 99% complete
2. **Gap is Examples**: Only examples attribute missing (7,852 fields)
3. **Patterns Clear**: Naming conventions are consistent and identifiable
4. **Enums Complete**: All 159 enums with all values documented
5. **Manufacturing Domain**: Clear conventions for work orders, materials, quality
6. **Ready for Automation**: All patterns suitable for programmatic generation

---

**Generated**: 2025-11-01  
**Analysis Scope**: Complete MachShop MES Database Schema  
**Total Analysis Size**: 30KB markdown + 11KB JSON structured data
