# Issue #38: Data Mapping Assistant with AI Suggestions - Design & Implementation Plan

**Status:** Design Document & Implementation Roadmap
**Date:** November 1, 2025
**Scope:** Intelligent field mapping with AI-powered suggestions, transformations, and templates

---

## Executive Summary

Issue #38 requires building an intelligent data mapping assistant that helps users map legacy system fields to the new MES schema. This design document outlines the complete architecture, AI/ML strategy, transformation rules engine, and 9-phase implementation approach.

### Dependencies (Resolved ✅)
- **Issue #37** - Guided Migration Wizard (provides wizard framework for mapping step) - COMPLETED
- Integrates with: Issue #32 (Bulk Import), Issue #34 (ETL Engine)

### Core Features
- **Visual Field Mapper** - Drag-and-drop, table-based, side-by-side schema view
- **AI-Powered Suggestions** - Fuzzy matching, abbreviation recognition, synonym detection, ML confidence scoring
- **Transformation Rule Builder** - Concatenate, split, lookup, calculate, conditional, default values
- **Sample Data Preview** - Before/after comparison with transformation testing
- **Mapping Templates** - Save/reuse/share common field mappings
- **Validation & Testing** - Completeness, data type, transformation testing, data loss detection
- **Documentation** - Auto-generated mapping documentation with export to CSV/Excel

---

## Architecture

### Frontend Components

```
DataMappingAssistant (Main Container)
├── MappingToolbar
│   ├── AutoMapButton
│   ├── LoadTemplateButton
│   ├── SaveTemplateButton
│   └── ValidationStatus
├── MappingBody
│   ├── SchemaPanel (Source Schema)
│   │   └── SchemaTree
│   ├── MappingCanvas
│   │   └── MappingTable
│   │       └── MappingRow (for each target field)
│   │           ├── SourceFieldSelector
│   │           ├── SuggestionDropdown
│   │           ├── TransformationEditor
│   │           └── FieldStatus (required/optional/unmapped)
│   ├── PreviewPanel
│   │   └── SampleDataPreview
│   │       ├── SourceDataTable
│   │       ├── TransformedDataTable
│   │       └── IssuesHighlight
│   └── SidePanel
│       ├── MappingDetails
│       ├── TransformationHelp
│       └── FieldDocumentation
└── MappingFooter
    ├── CompletionPercentage
    ├── ErrorCount
    ├── TestMappingButton
    └── ApplyMappingButton
```

### Backend Service Architecture

```
FieldMatchingService
├── Matching Algorithms
│   ├── Exact Match
│   ├── Abbreviation Matching
│   ├── Synonym Matching
│   ├── Fuzzy Matching (Levenshtein)
│   └── Pattern Matching
├── Suggestion Generation
│   ├── Single Best Match (highest confidence)
│   ├── Top N Matches (sorted by confidence)
│   └── Confidence Scoring
├── ML Integration
│   ├── Train on User Mappings
│   ├── Store Mapping History
│   └── Update Model Weights
└── Learning System
    ├── Record User Corrections
    ├── Retrain on Schedule
    └── Improve Suggestions Over Time

TransformationService
├── Transformation Executors
│   ├── ConcatTransformation
│   ├── SplitTransformation
│   ├── LookupTransformation
│   ├── CalculateTransformation
│   ├── ConditionalTransformation
│   └── DefaultValueTransformation
├── Expression Evaluator
│   ├── Parse & Validate Expressions
│   ├── Execute with Sample Data
│   ├── Handle Errors Gracefully
│   └── Return Transformed Values
└── Transformation Tester
    ├── Test with Sample Data
    ├── Identify Issues
    └── Provide Feedback

MappingTemplateService
├── CRUD Operations
│   ├── Create Template
│   ├── Read Template
│   ├── Update Template
│   └── Delete Template
├── Template Management
│   ├── List Available Templates
│   ├── Filter by Entity Type
│   ├── Filter by Source System
│   └── Search Templates
├── Template Sharing
│   ├── Share with Users
│   ├── Make Public
│   └── Access Control
└── Version Control
    ├── Track Changes
    ├── Revert to Previous Version
    └── Version Comparison

MappingValidationService
├── Completeness Validation
│   ├── Check All Required Fields Mapped
│   ├── Check All Fields Have Transformations if Needed
│   └── List Missing Mappings
├── Data Type Validation
│   ├── Check Type Compatibility
│   ├── Warn on Type Mismatches
│   └── Suggest Type Conversions
├── Transformation Validation
│   ├── Validate Expression Syntax
│   ├── Check for Circular Dependencies
│   └── Test with Sample Data
└── Data Loss Detection
    ├── Identify Unmapped Required Fields
    ├── Warn on Concatenation (data loss potential)
    └── Suggest Improvements
```

### Database Schema

```typescript
model MappingTemplate {
  id              String   @id @default(cuid())
  name            String
  description     String?
  entityType      String                      // Part, WorkOrder, etc.
  sourceSystem    String?                     // SAP, Oracle, Legacy MES, etc.

  // Mapping & Transformation Data
  fieldMappings   Json     // Array of FieldMapping
  transformations Json?    // Array of Transformation

  // Configuration
  isPublic        Boolean  @default(false)
  isActive        Boolean  @default(true)

  // Versioning
  version         Int      @default(1)

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String

  // Indexes
  @@index([entityType])
  @@index([sourceSystem])
  @@index([isPublic])
}

model FieldMappingHistory {
  id              String   @id @default(cuid())

  // Mapping Information
  entityType      String
  sourceField     String
  targetField     String

  // Learning Data
  usageCount      Int      @default(1)
  correctCount    Int      @default(0)    // User confirmed this mapping
  incorrectCount  Int      @default(0)    // User rejected this mapping

  // Metadata
  lastUsedAt      DateTime @default(now())
  createdAt       DateTime @default(now())

  // Composite Index
  @@unique([entityType, sourceField, targetField])
  @@index([entityType])
  @@index([usageCount])
}

model TransformationRule {
  id              String   @id @default(cuid())

  // Rule Information
  name            String   @unique
  description     String?
  ruleType        String   // concat, split, lookup, calculate, conditional, default

  // Rule Definition
  config          Json     // Rule-specific configuration

  // Metadata
  isPublic        Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String

  @@index([ruleType])
  @@index([isPublic])
}
```

### API Specification

```typescript
// Field Mapping Suggestions
POST   /api/v1/migration/mapping/suggest
Input: {
  entityType: string
  sourceSchema: Schema
  targetField: FieldDefinition
}
Output: FieldSuggestion[]

// Auto-Map Fields
POST   /api/v1/migration/mapping/auto-map
Input: {
  entityType: string
  sourceSchema: Schema
  targetSchema: Schema
  confidenceThreshold?: number   // default: 0.9
}
Output: FieldMapping[]

// Test Mappings with Sample Data
POST   /api/v1/migration/mapping/test
Input: {
  mappings: FieldMapping[]
  transformations: Transformation[]
  sampleData: any[]
}
Output: {
  results: TransformedRecord[]
  issues: ValidationIssue[]
}

// Validate Mappings
POST   /api/v1/migration/mapping/validate
Input: {
  entityType: string
  mappings: FieldMapping[]
  targetSchema: Schema
}
Output: ValidationResult

// Mapping Templates
GET    /api/v1/migration/mapping/templates
GET    /api/v1/migration/mapping/templates/:id
POST   /api/v1/migration/mapping/templates
PUT    /api/v1/migration/mapping/templates/:id
DELETE /api/v1/migration/mapping/templates/:id

// Transformation Rules
GET    /api/v1/migration/mapping/transformations
GET    /api/v1/migration/mapping/transformations/:id
POST   /api/v1/migration/mapping/transformations
PUT    /api/v1/migration/mapping/transformations/:id
DELETE /api/v1/migration/mapping/transformations/:id

// Record User Mapping (ML Training)
POST   /api/v1/migration/mapping/record
Input: {
  entityType: string
  sourceField: string
  targetField: string
  confirmed: boolean   // true if user accepted, false if rejected
}

// Export Mappings
POST   /api/v1/migration/mapping/export
Input: { mappings: FieldMapping[] }
Output: Buffer (CSV or Excel file)
```

---

## Field Matching Algorithm

### Matching Strategy (Priority Order)

1. **Exact Match** (confidence: 1.0)
   - `source.toLowerCase() === target.toLowerCase()`
   - Example: `PARTNUM` → `partNum`

2. **Abbreviation Expansion** (confidence: 0.95)
   ```
   Abbreviations map:
   PN → partNumber
   PT → partType
   DESC → description
   QTY → quantity
   UOM → unitOfMeasure
   WO → workOrder
   OP → operation
   STA → status
   (... 50+ more)
   ```

3. **Synonym Matching** (confidence: 0.90)
   ```
   Synonyms map:
   part ↔ [item, material, product, sku]
   quantity ↔ [qty, amount, count, volume]
   description ↔ [desc, name, title, label]
   status ↔ [state, condition, state]
   (... many more)
   ```

4. **Pattern Matching** (confidence: 0.85)
   - `^(.+)_id$ → ${match[1]}Id`
   - `^(.+)_num$ → ${match[1]}Number`
   - `^(.+)_qty$ → ${match[1]}Quantity`
   - `^(.+)_date$ → ${match[1]}Date`

5. **Fuzzy Matching** (confidence: 0.70 - 0.80)
   - Levenshtein distance < 3
   - Example: `PARTNUMBER` → `partNumber` (distance: 1)

6. **ML Prediction** (confidence: variable)
   - Trained on user mapping history
   - Learns common patterns from corrections
   - Confidence score based on training data

### Confidence Scoring

```typescript
interface FieldSuggestion {
  sourceField: string
  targetField: string
  confidence: number        // 0.0 - 1.0
  matchType: MatchType     // exact, abbreviation, synonym, pattern, fuzzy, ml
  reason: string           // Why this match was suggested
  alternatives: Alternative[]
}

interface Alternative {
  targetField: string
  confidence: number
  reason: string
}

// Example output:
{
  sourceField: "PN",
  targetField: "partNumber",
  confidence: 0.95,
  matchType: "abbreviation",
  reason: "Matches common abbreviation PN → partNumber",
  alternatives: [
    { targetField: "partType", confidence: 0.40, reason: "Fuzzy match" }
  ]
}
```

---

## Transformation Rule Types

### 1. Concatenation
Combines multiple source fields into one target field
```
Config:
  sourceFields: string[]    // ["firstName", "lastName"]
  separator: string         // " "

Example:
  firstName: "John"
  lastName: "Doe"
  → fullName: "John Doe"
```

### 2. Split
Splits source field into multiple target fields
```
Config:
  sourceField: string       // "fullName"
  delimiter: string         // " "
  targetIndex: number       // 0 (first), 1 (second), etc.

Example:
  fullName: "John Doe"
  split by " " [0]
  → firstName: "John"
```

### 3. Lookup
Maps source values to target values using lookup table
```
Config:
  sourceField: string
  lookupTable: Map<string, string>
  defaultValue?: any
  caseSensitive: boolean

Example:
  status: "A"
  lookup: { "A": "ACTIVE", "I": "INACTIVE" }
  → status: "ACTIVE"
```

### 4. Calculate
Applies mathematical expression to source fields
```
Config:
  expression: string        // "quantity * unitPrice * (1 + taxRate/100)"
  functions?: string[]      // Math.js supported functions

Example:
  quantity: 10
  unitPrice: 100
  taxRate: 10
  → totalPrice: 1100
```

### 5. Conditional
Applies different transformations based on condition
```
Config:
  condition: string         // "status === 'A'"
  trueValue: any
  falseValue: any

Example:
  status: "A"
  condition: status === "A"
  → isActive: true
```

### 6. Default Value
Uses default when source is empty/null
```
Config:
  defaultValue: any

Example:
  priority: null
  defaultValue: "NORMAL"
  → priority: "NORMAL"
```

---

## Implementation Phases

### Phase 1: Core Mapping UI (1 week)
**Deliverables:**
- DataMappingAssistant main component
- MappingTable with drag-and-drop
- Side-by-side schema view
- Field status indicators (required/optional/unmapped)
- Color coding system

**Files to Create:**
- `frontend/src/components/Migration/DataMappingAssistant.tsx`
- `frontend/src/components/Migration/MappingTable.tsx`
- `frontend/src/components/Migration/MappingRow.tsx`
- `frontend/src/components/Migration/SchemaTree.tsx`

**Acceptance Criteria:**
- Drag-and-drop mapping works
- Schema displayed clearly
- Field statuses visible
- Responsive design

---

### Phase 2: Field Matching Service (1 week)
**Deliverables:**
- FieldMatchingService with 5 matching algorithms
- Exact match, abbreviation, synonym, pattern, fuzzy matching
- Confidence scoring
- Test coverage

**Files to Create:**
- `src/services/migration/FieldMatchingService.ts`
- `src/__tests__/services/FieldMatchingService.test.ts`

**Acceptance Criteria:**
- All 5 matching algorithms implemented
- Confidence scores accurate
- Performance <100ms for 500-field schema
- 95%+ accuracy on test data

---

### Phase 3: AI Suggestions (1 week)
**Deliverables:**
- getSuggestions() endpoint
- Auto-map functionality
- Confidence-based filtering
- UI integration

**Files to Create:**
- `src/routes/migration/mapping.ts` (suggestions endpoint)
- `frontend/src/components/Migration/SuggestionDropdown.tsx`

**Acceptance Criteria:**
- Suggestions load in <1 second
- Auto-map correctly maps >90% of obvious fields
- Confidence scores align with user expectations

---

### Phase 4: Transformation Builder (1.5 weeks)
**Deliverables:**
- TransformationBuilder dialog component
- All 6 transformation types
- Expression evaluator (using math.js)
- Transformation configuration UI

**Files to Create:**
- `frontend/src/components/Migration/TransformationBuilder.tsx`
- `frontend/src/components/Migration/TransformationConfigs/*.tsx`
- `src/services/migration/TransformationService.ts`

**Acceptance Criteria:**
- All transformation types work
- Expressions validate correctly
- Error messages helpful
- Performance adequate (>10k transformations/sec)

---

### Phase 5: Sample Data Preview (1 week)
**Deliverables:**
- SampleDataPreview component
- Before/after transformation display
- Transformation testing
- Issue highlighting

**Files to Create:**
- `frontend/src/components/Migration/SampleDataPreview.tsx`
- `frontend/src/components/Migration/TransformationTest.tsx`

**Acceptance Criteria:**
- Sample data displayed correctly
- Transformations applied accurately
- Issues identified and highlighted
- Performance good with 10K rows

---

### Phase 6: Mapping Templates (1 week)
**Deliverables:**
- MappingTemplate model
- Template CRUD API
- Template selector UI
- Template library

**Files to Create:**
- `src/routes/migration/templates.ts`
- `frontend/src/components/Migration/TemplateSelector.tsx`
- `frontend/src/components/Migration/TemplateSaver.tsx`

**Acceptance Criteria:**
- Templates save and load correctly
- Public/private visibility works
- Template library searchable
- Version control functional

---

### Phase 7: Validation & Testing (1 week)
**Deliverables:**
- MappingValidationService
- Completeness validation
- Data type checking
- Transformation testing
- Data loss detection

**Files to Create:**
- `src/services/migration/MappingValidationService.ts`

**Acceptance Criteria:**
- Completeness validation catches missing fields
- Type validation identifies incompatibilities
- Transformation testing works
- Data loss warnings accurate

---

### Phase 8: ML Learning System (1 week)
**Deliverables:**
- FieldMappingHistory model
- Record user mappings
- Learn from corrections
- Update suggestions

**Files to Create:**
- Prisma migration
- `src/services/migration/FieldMappingHistory.ts`

**Acceptance Criteria:**
- User mappings recorded accurately
- Corrections improve suggestions
- Learning system scalable

---

### Phase 9: Documentation & Polish (1 week)
**Deliverables:**
- Export to CSV/Excel
- Auto-generated documentation
- Field-level notes
- Help content
- Testing and refinement

**Files to Create:**
- `src/services/migration/MappingDocumentation.ts`
- `frontend/src/components/Migration/MappingNotes.tsx`

**Acceptance Criteria:**
- Export works correctly
- Documentation clear and complete
- Help content helpful
- All tests passing
- Performance optimized

---

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **React DnD** for drag-and-drop
- **React Hook Form** for transformation config
- **React Query** for API data
- **Tailwind CSS** for styling
- **Headless UI** for components

### Backend
- **Node.js/Express** (existing)
- **Math.js** for expression evaluation
- **Fuzzy-match** for fuzzy matching
- **Prisma ORM** for database

### Database
- **PostgreSQL** with 3 new models

### Testing
- **Jest** for unit tests
- **React Testing Library** for components
- **Supertest** for API tests

---

## Success Metrics

### User Experience
- [ ] AI suggestions useful (>80% user satisfaction)
- [ ] Auto-map reduces manual work by 50%
- [ ] Mapping completed in <30 minutes for typical entity

### Functionality
- [ ] All transformation types working
- [ ] Validation catches 100% of type mismatches
- [ ] Sample data preview 100% accurate

### Quality
- [ ] >90% test coverage
- [ ] Zero data loss in transformations
- [ ] Suggestions accurate >85% of the time

### Performance
- [ ] Suggestions generated in <1 second
- [ ] Auto-map handles 500+ field schemas
- [ ] Preview transforms 10K rows in <5 seconds

---

## Risk Mitigation

### Risk 1: AI Suggestions Inaccurate
- **Mitigation:** Start with simple heuristics, add ML gradually
- **Fallback:** Always allow manual mapping

### Risk 2: Complex Transformations Failing
- **Mitigation:** Comprehensive testing, clear error messages
- **Fallback:** Manual transformation testing

### Risk 3: Performance Issues with Large Schemas
- **Mitigation:** Lazy loading, caching, optimization
- **Fallback:** Server-side processing

---

## Dependencies & Integration

### Integration Points
- **Issue #37:** Migration Wizard (mapping step)
- **Issue #32:** Bulk Import Engine (apply mappings)
- **Issue #34:** ETL Engine (transformation execution)

### API Contracts Required
- Template storage & retrieval
- Transformation execution
- Sample data processing

---

## Acceptance Criteria - Complete Checklist

### Visual Mapping
- [ ] Drag-and-drop intuitive
- [ ] Table view efficient
- [ ] Schema displayed clearly
- [ ] Field statuses obvious

### Field Matching
- [ ] Suggestions accurate >85%
- [ ] Confidence scores reliable
- [ ] Auto-map works for obvious fields
- [ ] All 5 matching algorithms implemented

### Transformations
- [ ] All 6 types functional
- [ ] Expression evaluation accurate
- [ ] Error messages helpful
- [ ] Transformation testing works

### Sample Data
- [ ] Preview accurate
- [ ] Before/after comparison clear
- [ ] Transformation issues highlighted
- [ ] Performance good

### Templates
- [ ] Save/load correct
- [ ] Library searchable
- [ ] Public/private working
- [ ] Versioning functional

### Validation
- [ ] Completeness checking works
- [ ] Type validation catches issues
- [ ] Data loss warnings accurate
- [ ] Suggestions helpful

### Performance
- [ ] Suggestions <1 second
- [ ] Auto-map <5 seconds
- [ ] Preview responsive
- [ ] Large schemas handled

### Integration
- [ ] Works with Migration Wizard
- [ ] Works with Bulk Import
- [ ] Works with ETL Engine

---

## Conclusion

Issue #38 (Data Mapping Assistant with AI Suggestions) provides critical value by automating one of the most tedious and error-prone parts of data migration. With comprehensive field matching, transformation rules, templates, and learning capabilities, the assistant will reduce mapping time from hours to minutes.

The phased 9-week implementation allows for incremental delivery and refinement, with the core mapping UI available in week 1 and full AI/ML capabilities by week 9.

This assistant will become an essential tool for data migration projects, significantly improving accuracy and reducing implementation time.
