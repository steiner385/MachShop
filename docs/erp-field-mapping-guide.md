# ERP Field Mapping Configuration Guide

## Table of Contents
1. [Overview](#overview)
2. [Understanding Field Mapping](#understanding-field-mapping)
3. [Configuration Methods](#configuration-methods)
4. [Common Mapping Patterns](#common-mapping-patterns)
5. [Data Type Conversions](#data-type-conversions)
6. [Transformation Functions](#transformation-functions)
7. [Custom Field Handling](#custom-field-handling)
8. [Testing Field Mappings](#testing-field-mappings)
9. [Best Practices](#best-practices)
10. [Examples by ERP System](#examples-by-erp-system)
11. [Troubleshooting](#troubleshooting)
12. [Reference](#reference)

## Overview

Field mapping is the cornerstone of successful ERP integration, defining how data is transformed between MachShop3 MES and various ERP systems. This guide provides comprehensive instructions for configuring, testing, and maintaining field mappings.

### Why Field Mapping Matters

- **Data Integrity**: Ensures accurate data transfer between systems
- **Business Logic**: Applies necessary transformations and validations
- **System Compatibility**: Bridges differences in data formats and structures
- **Flexibility**: Adapts to changing business requirements
- **Performance**: Optimizes data processing through efficient mappings

## Understanding Field Mapping

### Core Concepts

```
┌─────────────────┐    Field Mapping    ┌─────────────────┐
│   MES Field     │  ────────────────►  │   ERP Field     │
│                 │                     │                 │
│  Data Type: X   │   Transformation    │  Data Type: Y   │
│  Format: A      │   ─────────────►    │  Format: B      │
│  Rules: M       │    Validation       │  Rules: N       │
└─────────────────┘                     └─────────────────┘
```

### Field Mapping Components

1. **Source Field** (MES)
   - Field name in MachShop3
   - Data type and format
   - Validation rules

2. **Target Field** (ERP)
   - Field name in ERP system
   - Expected data type
   - System-specific requirements

3. **Transformation**
   - Data conversion logic
   - Format adjustments
   - Business rule application

4. **Validation**
   - Required field checking
   - Format verification
   - Range/constraint validation

### Mapping Direction

```json
{
  "bidirectional": {
    "mes_to_erp": "Outbound data flow (MES → ERP)",
    "erp_to_mes": "Inbound data flow (ERP → MES)",
    "sync_both": "Two-way synchronization"
  }
}
```

## Configuration Methods

### Method 1: Web Interface

1. **Navigate to Field Mappings**
   ```
   Settings → ERP Integration → Field Mappings
   ```

2. **Select Integration and Entity**
   - Choose ERP integration (e.g., "sap-production")
   - Select entity type (e.g., "PurchaseOrder")

3. **Configure Mapping**
   ```
   MES Field: [Dropdown] → poNumber
   ERP Field: [Text Input] → PO_NUMBER
   Data Type: [Select] → String
   Required: [Checkbox] → ✓
   Transformation: [Text Area] → value.padStart(10, '0')
   ```

4. **Save and Validate**
   - Click "Validate Mapping"
   - Review test results
   - Save configuration

### Method 2: JSON Configuration

```json
{
  "integrationId": "impact-production",
  "entityType": "PurchaseOrder",
  "mappings": [
    {
      "mesField": "poNumber",
      "erpField": "PO_NUM",
      "dataType": "string",
      "maxLength": 20,
      "isRequired": true,
      "direction": "bidirectional",
      "transformation": "value.toUpperCase()",
      "validation": "^PO\\d{6}$",
      "defaultValue": null,
      "description": "Purchase order number"
    }
  ]
}
```

### Method 3: API Configuration

```bash
curl -X POST https://api.machshop3.com/api/v1/erp/field-mappings \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integrationId": "oracle-production",
    "entityType": "Supplier",
    "mappings": [...]
  }'
```

### Method 4: Bulk Import

```csv
Entity,MES Field,ERP Field,Data Type,Required,Transformation,Default
PurchaseOrder,poNumber,PO_NUMBER,string,true,value.toUpperCase(),
PurchaseOrder,vendorId,VENDOR_CODE,string,true,value.padStart(10,'0'),
PurchaseOrder,totalAmount,TOTAL_AMT,decimal,true,parseFloat(value).toFixed(2),
```

## Common Mapping Patterns

### Pattern 1: Direct Mapping

Simple one-to-one field mapping without transformation:

```json
{
  "mesField": "description",
  "erpField": "Description",
  "dataType": "string",
  "transformation": null
}
```

### Pattern 2: Value Transformation

Applying functions to modify values:

```json
{
  "mesField": "vendorCode",
  "erpField": "SUPPLIER_ID",
  "dataType": "string",
  "transformation": "value.toUpperCase().padStart(10, '0')"
}
```

### Pattern 3: Conditional Mapping

Different mappings based on conditions:

```json
{
  "mesField": "status",
  "erpField": "STATUS_CODE",
  "dataType": "string",
  "transformation": "value === 'ACTIVE' ? '1' : value === 'INACTIVE' ? '0' : '2'"
}
```

### Pattern 4: Lookup Table

Mapping values using lookup tables:

```json
{
  "mesField": "status",
  "erpField": "PO_STATUS",
  "dataType": "string",
  "transformation": "{'DRAFT': '10', 'APPROVED': '20', 'SENT': '30', 'CLOSED': '40'}[value] || '10'"
}
```

### Pattern 5: Composite Fields

Combining multiple fields:

```json
{
  "mesField": ["firstName", "lastName"],
  "erpField": "FULL_NAME",
  "dataType": "string",
  "transformation": "`${source.firstName} ${source.lastName}`"
}
```

### Pattern 6: Field Splitting

Splitting one field into multiple:

```json
{
  "mesField": "fullAddress",
  "erpField": ["STREET", "CITY", "STATE", "ZIP"],
  "dataType": "string",
  "transformation": "value.split(',').map(s => s.trim())"
}
```

### Pattern 7: Calculated Fields

Deriving values through calculation:

```json
{
  "mesField": ["quantity", "unitPrice"],
  "erpField": "LINE_TOTAL",
  "dataType": "decimal",
  "transformation": "source.quantity * source.unitPrice"
}
```

## Data Type Conversions

### String Conversions

```javascript
// String to uppercase
"transformation": "value.toUpperCase()"

// String padding
"transformation": "value.padStart(10, '0')"
"transformation": "value.padEnd(20, ' ')"

// String truncation
"transformation": "value.substring(0, 50)"

// String replacement
"transformation": "value.replace(/[^A-Z0-9]/g, '')"

// String concatenation
"transformation": "`${value}-SUFFIX`"
```

### Number Conversions

```javascript
// String to number
"transformation": "parseFloat(value)"
"transformation": "parseInt(value, 10)"

// Number formatting
"transformation": "value.toFixed(2)"
"transformation": "Math.round(value * 100) / 100"

// Number padding (as string)
"transformation": "String(value).padStart(10, '0')"

// Currency conversion
"transformation": "value * exchangeRate"
```

### Date Conversions

```javascript
// String to date
"transformation": "new Date(value)"

// Date formatting
"transformation": "new Date(value).toISOString()"
"transformation": "new Date(value).toISOString().split('T')[0]"

// Custom date format
"transformation": "formatDate(value, 'YYYY-MM-DD')"
"transformation": "formatDate(value, 'MM/DD/YYYY')"

// Date arithmetic
"transformation": "new Date(Date.parse(value) + 86400000)" // Add 1 day

// SAP date format
"transformation": "'/Date(' + new Date(value).getTime() + ')/'"

// Oracle date format
"transformation": "new Date(value).toISOString()"
```

### Boolean Conversions

```javascript
// Boolean to string
"transformation": "value ? 'Y' : 'N'"
"transformation": "value ? 'true' : 'false'"
"transformation": "value ? '1' : '0'"

// String to boolean
"transformation": "value === 'Y'"
"transformation": "['true', '1', 'Y', 'yes'].includes(value.toLowerCase())"

// Number to boolean
"transformation": "value === 1"
"transformation": "value > 0"
```

### Array Conversions

```javascript
// Array to string
"transformation": "value.join(',')"
"transformation": "value.join('|')"

// String to array
"transformation": "value.split(',')"
"transformation": "value.split(',').map(s => s.trim())"

// Array filtering
"transformation": "value.filter(v => v !== null)"

// Array mapping
"transformation": "value.map(v => v.toUpperCase())"
```

## Transformation Functions

### Built-in Functions

```javascript
// String functions
toUpperCase()      // Convert to uppercase
toLowerCase()      // Convert to lowercase
trim()            // Remove whitespace
padStart(n, char) // Pad left
padEnd(n, char)   // Pad right
substring(s, e)   // Extract substring
replace(p, r)     // Replace pattern

// Number functions
Math.round()      // Round to integer
Math.floor()      // Round down
Math.ceil()       // Round up
toFixed(n)        // Fixed decimals
parseFloat()      // Convert to float
parseInt()        // Convert to integer

// Date functions
Date.now()        // Current timestamp
toISOString()     // ISO format
getTime()         // Unix timestamp
toLocaleDateString() // Locale date
```

### Custom Transformation Functions

```javascript
// Register custom functions
const customFunctions = {
  // Format phone number
  formatPhone: (value) => {
    const cleaned = value.replace(/\D/g, '');
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6,10)}`;
  },

  // Convert currency code
  currencyCode: (value) => {
    const codes = { 'Dollar': 'USD', 'Euro': 'EUR', 'Pound': 'GBP' };
    return codes[value] || value;
  },

  // Calculate business days
  addBusinessDays: (date, days) => {
    let result = new Date(date);
    let count = 0;
    while (count < days) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        count++;
      }
    }
    return result;
  },

  // Validate and format tax ID
  formatTaxId: (value) => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (cleaned.length === 9) {
      return `${cleaned.slice(0,2)}-${cleaned.slice(2)}`;
    }
    return value;
  }
};
```

### Complex Transformations

```javascript
// Multi-field calculation
{
  "transformation": "(source.quantity || 0) * (source.unitPrice || 0) * (1 + (source.taxRate || 0) / 100)"
}

// Conditional with multiple fields
{
  "transformation": "source.preferredVendor ? source.preferredVendor : source.defaultVendor || 'VENDOR001'"
}

// Nested object access
{
  "transformation": "source.address?.street || source.billingAddress?.street || ''"
}

// Array aggregation
{
  "transformation": "source.lineItems.reduce((sum, item) => sum + item.quantity * item.price, 0)"
}
```

## Custom Field Handling

### Defining Custom Fields

```json
{
  "customFields": {
    "prefix": "CF_",
    "mappings": [
      {
        "mesField": "customField1",
        "erpField": "CF_PROJECT_CODE",
        "dataType": "string",
        "maxLength": 20,
        "isRequired": false,
        "validation": "^PROJ-\\d{4}$"
      },
      {
        "mesField": "customField2",
        "erpField": "CF_COST_CENTER",
        "dataType": "string",
        "isRequired": false,
        "defaultValue": "CC001"
      }
    ]
  }
}
```

### Dynamic Custom Fields

```javascript
// Handle variable custom fields
function mapCustomFields(source, customFieldDefs) {
  const mapped = {};

  customFieldDefs.forEach(def => {
    const value = source[def.mesField];

    if (value !== undefined) {
      // Apply transformation
      let transformed = value;
      if (def.transformation) {
        transformed = eval(def.transformation);
      }

      // Apply validation
      if (def.validation) {
        const regex = new RegExp(def.validation);
        if (!regex.test(transformed)) {
          throw new Error(`Validation failed for ${def.mesField}`);
        }
      }

      mapped[def.erpField] = transformed;
    } else if (def.defaultValue !== undefined) {
      mapped[def.erpField] = def.defaultValue;
    }
  });

  return mapped;
}
```

### Extension Attributes

```json
{
  "extensionAttributes": {
    "namespace": "ext",
    "mappings": [
      {
        "mesField": "attributes.color",
        "erpField": "ExtensionAttributes.Color",
        "dataType": "string"
      },
      {
        "mesField": "attributes.weight",
        "erpField": "ExtensionAttributes.Weight",
        "dataType": "decimal",
        "transformation": "parseFloat(value).toFixed(3)"
      }
    ]
  }
}
```

## Testing Field Mappings

### Unit Testing Mappings

```javascript
// Test framework for field mappings
describe('Field Mapping Tests', () => {
  test('PO Number transformation', () => {
    const mapping = {
      mesField: 'poNumber',
      erpField: 'PO_NUM',
      transformation: 'value.toUpperCase().padStart(10, "0")'
    };

    const testCases = [
      { input: 'po123', expected: '0000PO123' },
      { input: 'PO456789', expected: '0PO456789' },
      { input: '1234567890', expected: '1234567890' }
    ];

    testCases.forEach(tc => {
      const result = applyTransformation(tc.input, mapping.transformation);
      expect(result).toBe(tc.expected);
    });
  });
});
```

### Integration Testing

```bash
# Test single field mapping
curl -X POST https://api.machshop3.com/api/v1/erp/test-mapping \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "integrationId": "sap-production",
    "entityType": "PurchaseOrder",
    "fieldName": "poNumber",
    "testValue": "po123",
    "expected": "0000000123"
  }'
```

### Validation Testing

```javascript
// Test validation rules
function testValidation(mapping, testValues) {
  const results = [];

  testValues.forEach(value => {
    try {
      const transformed = applyTransformation(value, mapping.transformation);
      const isValid = validateField(transformed, mapping);

      results.push({
        input: value,
        output: transformed,
        valid: isValid,
        error: null
      });
    } catch (error) {
      results.push({
        input: value,
        output: null,
        valid: false,
        error: error.message
      });
    }
  });

  return results;
}
```

### End-to-End Testing

```javascript
// Test complete entity mapping
async function testEntityMapping(entity, testData) {
  const mappings = await getFieldMappings(entity);
  const results = {
    success: [],
    failures: [],
    warnings: []
  };

  for (const mapping of mappings) {
    try {
      const sourceValue = testData[mapping.mesField];
      const targetValue = await transformField(sourceValue, mapping);

      // Validate result
      if (mapping.isRequired && !targetValue) {
        results.failures.push({
          field: mapping.mesField,
          error: 'Required field is empty after transformation'
        });
      } else {
        results.success.push({
          field: mapping.mesField,
          source: sourceValue,
          target: targetValue
        });
      }
    } catch (error) {
      results.failures.push({
        field: mapping.mesField,
        error: error.message
      });
    }
  }

  return results;
}
```

## Best Practices

### 1. Design Principles

```yaml
Consistency:
  - Use consistent naming conventions
  - Standardize transformation patterns
  - Document all custom functions

Maintainability:
  - Keep transformations simple
  - Avoid complex nested logic
  - Use lookup tables for mappings

Performance:
  - Minimize transformation complexity
  - Cache static lookups
  - Batch similar transformations

Reliability:
  - Handle null/undefined values
  - Provide sensible defaults
  - Validate before transformation
```

### 2. Naming Conventions

```javascript
// Good naming examples
{
  "mesField": "purchaseOrderNumber",  // camelCase
  "erpField": "PO_NUMBER",            // ERP convention
  "transformation": "transformPONumber" // Descriptive function name
}

// Naming patterns by system
const namingPatterns = {
  impact: "UPPER_SNAKE_CASE",
  sap: "PascalCase",
  oracle: "MixedCase",
  custom: "camelCase"
};
```

### 3. Error Handling

```javascript
// Robust transformation with error handling
{
  "transformation": `
    try {
      if (!value) return null;
      const cleaned = value.toString().trim();
      if (cleaned.length > 20) {
        console.warn('Value truncated: ' + value);
        return cleaned.substring(0, 20);
      }
      return cleaned.toUpperCase();
    } catch (e) {
      console.error('Transformation error:', e);
      return null;
    }
  `
}
```

### 4. Documentation

```json
{
  "mesField": "vendorCode",
  "erpField": "SUPPLIER_ID",
  "description": "Vendor/Supplier identifier",
  "notes": "Must be 10 characters, left-padded with zeros",
  "examples": {
    "input": "V123",
    "output": "0000000V123"
  },
  "businessRule": "Active vendors only (status = 'A')",
  "transformation": "value.toUpperCase().padStart(10, '0')"
}
```

### 5. Version Control

```json
{
  "version": "1.2.0",
  "lastModified": "2024-01-15T10:30:00Z",
  "modifiedBy": "admin@company.com",
  "changeLog": [
    {
      "version": "1.2.0",
      "date": "2024-01-15",
      "changes": "Added validation for vendor code format"
    },
    {
      "version": "1.1.0",
      "date": "2024-01-01",
      "changes": "Updated padding logic for PO numbers"
    }
  ]
}
```

## Examples by ERP System

### Impact ERP Examples

```json
{
  "purchaseOrder": {
    "mappings": [
      {
        "mesField": "poNumber",
        "erpField": "PO_NUM",
        "transformation": "value.toUpperCase()"
      },
      {
        "mesField": "poDate",
        "erpField": "PO_DATE",
        "transformation": "formatDate(value, 'YYYY-MM-DD HH:mm:ss')"
      },
      {
        "mesField": "status",
        "erpField": "PO_STATUS",
        "transformation": "{'DRAFT': '10', 'APPROVED': '20', 'SENT': '30'}[value]"
      }
    ]
  }
}
```

### SAP S/4HANA Examples

```json
{
  "purchaseOrder": {
    "mappings": [
      {
        "mesField": "poNumber",
        "erpField": "PurchaseOrder",
        "transformation": "value.padStart(10, '0')"
      },
      {
        "mesField": "vendor",
        "erpField": "Supplier",
        "transformation": "value.padStart(10, '0')"
      },
      {
        "mesField": "amount",
        "erpField": "NetAmount",
        "transformation": "parseFloat(value.toString().replace(',', '.'))"
      }
    ]
  }
}
```

### Oracle Cloud Examples

```json
{
  "purchaseOrder": {
    "mappings": [
      {
        "mesField": "poNumber",
        "erpField": "OrderNumber",
        "transformation": "value"
      },
      {
        "mesField": "orderDate",
        "erpField": "OrderDate",
        "transformation": "new Date(value).toISOString()"
      },
      {
        "mesField": "businessUnit",
        "erpField": "RequisitioningBUId",
        "transformation": "lookupBusinessUnit(value)"
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues

#### Issue 1: Type Mismatch

**Error**: `Cannot convert string to number`

**Solution**:
```javascript
// Add type checking
{
  "transformation": "typeof value === 'string' ? parseFloat(value) : value"
}
```

#### Issue 2: Null Values

**Error**: `Cannot read property 'toUpperCase' of null`

**Solution**:
```javascript
// Add null checking
{
  "transformation": "value ? value.toUpperCase() : null"
}
```

#### Issue 3: Length Constraints

**Error**: `Value exceeds maximum length`

**Solution**:
```javascript
// Add length validation
{
  "transformation": "value.length > 50 ? value.substring(0, 50) : value"
}
```

#### Issue 4: Invalid Characters

**Error**: `Invalid character in field`

**Solution**:
```javascript
// Clean invalid characters
{
  "transformation": "value.replace(/[^A-Z0-9]/gi, '')"
}
```

#### Issue 5: Date Format Issues

**Error**: `Invalid date format`

**Solution**:
```javascript
// Parse various date formats
{
  "transformation": `
    const formats = ['MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];
    let parsed = null;
    for (const fmt of formats) {
      parsed = moment(value, fmt);
      if (parsed.isValid()) break;
    }
    return parsed ? parsed.format('YYYY-MM-DD') : null;
  `
}
```

### Debugging Mappings

```javascript
// Enable debug logging
{
  "mesField": "complexField",
  "erpField": "TARGET_FIELD",
  "transformation": `
    console.log('Input:', value);
    const result = complexTransformation(value);
    console.log('Output:', result);
    return result;
  `,
  "debug": true
}
```

### Performance Analysis

```sql
-- Analyze mapping performance
SELECT
  entity_type,
  mes_field,
  AVG(transformation_time_ms) as avg_time,
  MAX(transformation_time_ms) as max_time,
  COUNT(*) as execution_count,
  SUM(CASE WHEN error_occurred THEN 1 ELSE 0 END) as error_count
FROM field_mapping_metrics
WHERE integration_id = 'production'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY entity_type, mes_field
ORDER BY avg_time DESC
LIMIT 20;
```

## Reference

### Field Mapping Schema

```typescript
interface FieldMapping {
  mesField: string | string[];          // Source field(s)
  erpField: string | string[];          // Target field(s)
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  direction: 'mes_to_erp' | 'erp_to_mes' | 'bidirectional';
  isRequired: boolean;
  maxLength?: number;
  minLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;                     // Regex pattern
  transformation?: string;              // Transformation function
  validation?: string;                  // Validation rule
  defaultValue?: any;
  lookupTable?: string;                // Reference to lookup table
  description?: string;
  examples?: {
    input: any;
    output: any;
  }[];
  metadata?: Record<string, any>;
}
```

### Transformation Function Library

```javascript
// String transformations
const stringTransforms = {
  uppercase: (v) => v.toUpperCase(),
  lowercase: (v) => v.toLowerCase(),
  trim: (v) => v.trim(),
  padLeft: (v, len, char) => v.padStart(len, char),
  padRight: (v, len, char) => v.padEnd(len, char),
  truncate: (v, len) => v.substring(0, len),
  removeSpaces: (v) => v.replace(/\s/g, ''),
  alphanumeric: (v) => v.replace(/[^a-zA-Z0-9]/g, '')
};

// Number transformations
const numberTransforms = {
  round: (v, decimals) => Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals),
  floor: (v) => Math.floor(v),
  ceil: (v) => Math.ceil(v),
  abs: (v) => Math.abs(v),
  percentage: (v) => v * 100,
  currency: (v) => parseFloat(v).toFixed(2)
};

// Date transformations
const dateTransforms = {
  iso: (v) => new Date(v).toISOString(),
  dateOnly: (v) => new Date(v).toISOString().split('T')[0],
  timeOnly: (v) => new Date(v).toISOString().split('T')[1],
  timestamp: (v) => new Date(v).getTime(),
  addDays: (v, days) => new Date(Date.parse(v) + days * 86400000)
};
```

### Validation Patterns

```javascript
const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^\d+$/,
  decimal: /^\d+\.?\d*$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  poNumber: /^PO\d{6,10}$/,
  vendorCode: /^V\d{5}$/
};
```

### API Endpoints

```yaml
Field Mapping Management:
  GET /api/v1/erp/field-mappings:
    - List all field mappings
    - Query params: integrationId, entityType

  GET /api/v1/erp/field-mappings/{id}:
    - Get specific field mapping

  POST /api/v1/erp/field-mappings:
    - Create new field mapping

  PUT /api/v1/erp/field-mappings/{id}:
    - Update field mapping

  DELETE /api/v1/erp/field-mappings/{id}:
    - Delete field mapping

  POST /api/v1/erp/field-mappings/test:
    - Test field mapping
    - Body: { mapping, testData }

  POST /api/v1/erp/field-mappings/validate:
    - Validate field mappings
    - Body: { integrationId, entityType }

  POST /api/v1/erp/field-mappings/import:
    - Import mappings from file
    - Body: multipart/form-data

  GET /api/v1/erp/field-mappings/export:
    - Export mappings to file
    - Query params: format (json, csv)
```

### CLI Commands

```bash
# List field mappings
npm run erp:mappings:list -- --integration=sap-production

# Test field mapping
npm run erp:mappings:test -- --entity=PurchaseOrder --field=poNumber --value=test123

# Validate all mappings
npm run erp:mappings:validate -- --integration=oracle-production

# Import mappings
npm run erp:mappings:import -- --file=mappings.json

# Export mappings
npm run erp:mappings:export -- --integration=impact-production --format=csv

# Generate mapping documentation
npm run erp:mappings:docs -- --output=mapping-docs.md
```

## Support

For additional assistance with field mappings:
- Documentation: https://docs.machshop3.com/erp-field-mapping
- Support: support@machshop3.com
- Community Forum: https://forum.machshop3.com/field-mapping