# Issue #149: Serialization - Configurable Serial Number Format Engine

## Implementation Plan & Architecture

**Issue**: Build a configurable serial number format engine supporting diverse manufacturing serialization standards
**Priority**: L0 (Core Infrastructure) - Priority Score: 90/100
**Dependencies**: Issue #90 (Completed ✓)
**Estimated Effort**: 8/10 (2-3 sprints)

---

## Architecture Overview

### 1. **Pattern Language Design**

The format engine will use a simple but powerful pattern syntax:

```
Pattern Syntax: {COMPONENT:CONFIG}

Components:
- {PREFIX:value}           - Fixed text prefix
- {YYYY}                   - 4-digit year
- {YY}                     - 2-digit year
- {MM}                     - 2-digit month
- {DD}                     - 2-digit day
- {WW}                     - 2-digit week number
- {SEQ:length}             - Sequential counter (length: 4-8)
- {RANDOM:type:length}     - Random alphanumeric (type: alpha|numeric|alphanumeric)
- {SITE:code}              - Site/location code
- {PART:length}            - Part number segment
- {CHECK:algorithm}        - Check digit (algorithm: luhn|mod10|custom)
- {UUID}                   - Full or partial UUID

Example Formats:
- "PRE-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}"
- "{SITE}-{PART:4}-{RANDOM:numeric:4}"
- "AERO-{YYYY}{WW}-{SEQ:6}"
```

### 2. **Database Models**

#### SerialNumberFormatConfig (Primary)
```prisma
model SerialNumberFormatConfig {
  id                    String   @id @default(cuid())
  name                  String   // e.g., "Aerospace Standard", "Medical Device"
  description           String?
  patternTemplate       String   // e.g., "PRE-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}"
  siteId                String
  site                  Site     @relation(fields: [siteId], references: [id])

  // Configuration
  isActive              Boolean  @default(true)
  version               Int      @default(1)
  validationRules       String   // JSON: character sets, length, etc.
  sequentialCounterStart Int     @default(1)
  sequentialCounterIncrement Int @default(1)
  counterResetRule      String?  // "daily", "yearly", "monthly", null

  // Assignment
  partAssignments       SerialFormatPartAssignment[]
  partFamilyAssignments SerialFormatPartFamilyAssignment[]

  // Audit
  createdBy             String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([siteId, name])
  @@map("serial_number_format_configs")
}
```

#### SerialFormatPartAssignment
```prisma
model SerialFormatPartAssignment {
  id                   String   @id @default(cuid())
  partId               String
  part                 Part     @relation(fields: [partId], references: [id])
  formatConfigId       String
  formatConfig         SerialNumberFormatConfig @relation(fields: [formatConfigId], references: [id])

  // Assignment level
  isDefault            Boolean  @default(false)
  priority             Int      @default(0)  // Higher = override lower
  effectiveFrom        DateTime @default(now())
  effectiveUntil       DateTime?

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([partId, formatConfigId])
  @@map("serial_format_part_assignments")
}
```

#### SerialNumberUsageTracking
```prisma
model SerialNumberUsageTracking {
  id                   String   @id @default(cuid())
  formatConfigId       String
  formatConfig         SerialNumberFormatConfig @relation(fields: [formatConfigId], references: [id])

  // Counter Management
  currentSequenceValue Int      @default(1)
  lastGeneratedDate    DateTime?
  counterResetDate     DateTime?

  // Statistics
  totalGenerated       Int      @default(0)
  totalUsed            Int      @default(0)
  duplicateAttempts    Int      @default(0)

  // Concurrency Control
  lastUpdateTimestamp  DateTime @updatedAt
  version              Int      @default(1)  // Optimistic locking

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([formatConfigId])
  @@map("serial_number_usage_tracking")
}
```

### 3. **Service Layer**

#### SerialNumberFormatConfigService
```typescript
class SerialNumberFormatConfigService {
  // Format Configuration Management
  async createFormatConfig(data: CreateFormatConfigDTO): Promise<SerialNumberFormatConfig>
  async updateFormatConfig(id: string, data: UpdateFormatConfigDTO): Promise<SerialNumberFormatConfig>
  async deleteFormatConfig(id: string): Promise<void>
  async getFormatConfig(id: string): Promise<SerialNumberFormatConfig>
  async listFormatConfigs(siteId: string, filters?: FilterOptions): Promise<SerialNumberFormatConfig[]>

  // Format Validation
  async validateFormatPattern(pattern: string): Promise<ValidationResult>
  async validateFormatDefinition(config: FormatConfigDTO): Promise<ValidationResult>

  // Part Assignment
  async assignFormatToPart(partId: string, formatConfigId: string, options?: AssignmentOptions): Promise<SerialFormatPartAssignment>
  async unassignFormatFromPart(partId: string, formatConfigId: string): Promise<void>
  async getFormatForPart(partId: string): Promise<SerialNumberFormatConfig>

  // Format Usage & Statistics
  async getFormatUsageStats(formatConfigId: string): Promise<UsageStatistics>
  async resetSequentialCounter(formatConfigId: string): Promise<void>
  async getCounterStatus(formatConfigId: string): Promise<CounterStatus>
}
```

#### SerialNumberGeneratorService
```typescript
class SerialNumberGeneratorService {
  // Single Serial Generation
  async generateSerial(formatConfigId: string, context?: GenerationContext): Promise<string>

  // Batch Generation
  async generateSerialBatch(
    formatConfigId: string,
    count: number,
    context?: GenerationContext
  ): Promise<string[]>

  // Serial Validation
  async validateSerial(serial: string, formatConfigId?: string): Promise<ValidationResult>
  async validateSerialFormat(serial: string, pattern: string): Promise<ValidationResult>

  // Uniqueness Checking
  async checkUniqueness(serial: string, scope?: UniquenessScope): Promise<boolean>
  async checkBatchUniqueness(serials: string[]): Promise<Map<string, boolean>>

  // Format Preview
  async previewFormat(pattern: string, count?: number): Promise<PreviewResult>
}
```

#### PatternEngine (Internal)
```typescript
class PatternEngine {
  // Pattern Parsing
  parsePattern(pattern: string): ParsedPattern
  extractComponents(pattern: string): PatternComponent[]
  validatePatternSyntax(pattern: string): SyntaxValidation

  // Generation
  generateValue(component: PatternComponent, context: GenerationContext): string
  buildSerial(parsedPattern: ParsedPattern, context: GenerationContext): string

  // Validation
  validateAgainstPattern(value: string, pattern: string): boolean
  getPatternMetadata(pattern: string): PatternMetadata
}
```

### 4. **API Endpoints**

```
POST   /api/v1/serial-formats                  - Create format config
GET    /api/v1/serial-formats                  - List format configs
GET    /api/v1/serial-formats/:id              - Get format config
PATCH  /api/v1/serial-formats/:id              - Update format config
DELETE /api/v1/serial-formats/:id              - Delete format config

POST   /api/v1/serial-formats/:id/validate     - Validate pattern syntax
POST   /api/v1/serial-formats/:id/preview      - Preview format examples

POST   /api/v1/serial-formats/:id/assign-part  - Assign format to part
DELETE /api/v1/serial-formats/:id/unassign-part - Unassign format from part
GET    /api/v1/parts/:id/format                - Get format for part

GET    /api/v1/serial-formats/:id/usage-stats  - Get usage statistics
POST   /api/v1/serial-formats/:id/reset-counter - Reset sequential counter
GET    /api/v1/serial-formats/:id/counter      - Get counter status

POST   /api/v1/serials/generate                - Generate single serial
POST   /api/v1/serials/generate-batch          - Generate batch of serials
POST   /api/v1/serials/validate                - Validate serial against format
POST   /api/v1/serials/check-uniqueness        - Check if serial is unique
```

### 5. **UI Components**

#### Pages
- `SerialNumberFormatManagement.tsx` - Main format management dashboard
- `FormatConfigForm.tsx` - Create/edit format configuration
- `FormatPartAssignmentManager.tsx` - Manage part assignments
- `SerialGenerationWizard.tsx` - Generate serials UI

#### Components
- `PatternBuilder.tsx` - Visual pattern editor
- `PatternValidator.tsx` - Pattern validation display
- `FormatUsageStats.tsx` - Usage statistics visualization
- `SerialPreview.tsx` - Format preview/examples
- `CounterStatus.tsx` - Counter status display

### 6. **Implementation Phases**

#### Phase 1: Foundation (Week 1)
- [ ] Database models (Prisma schema + migrations)
- [ ] PatternEngine (parsing, validation, generation)
- [ ] Unit tests for pattern engine

#### Phase 2: Service Layer (Week 2)
- [ ] SerialNumberFormatConfigService
- [ ] SerialNumberGeneratorService
- [ ] Comprehensive service tests

#### Phase 3: API Layer (Week 2-3)
- [ ] All REST endpoints
- [ ] Input validation (Zod schemas)
- [ ] Error handling
- [ ] Integration tests

#### Phase 4: Frontend (Week 3)
- [ ] Format management UI
- [ ] Part assignment management
- [ ] Serial generation wizard

#### Phase 5: Testing & Optimization (Week 3)
- [ ] Performance tests (10,000+ serials)
- [ ] Concurrent load testing
- [ ] Edge case handling

#### Phase 6: Documentation (Week 3)
- [ ] API documentation
- [ ] Usage examples
- [ ] Architecture documentation

---

## Key Design Decisions

1. **Pattern Syntax**: Simple, readable, extensible (not regex-heavy)
2. **Sequential Counter**: Database-level with optimistic locking for concurrency
3. **Check Digits**: Support Luhn and Mod-10 algorithms, customizable
4. **Format Versioning**: Track changes to format definitions over time
5. **Part Assignment**: Hierarchical (part family → part → sublot) with priority
6. **Validation**: Server-side validation + client-side preview
7. **Thread Safety**: Use database sequences and optimistic locking

---

## Acceptance Criteria Mapping

✓ Serial number format templates can be defined and managed
✓ Pattern language supports all common serial format requirements
✓ Formats can be assigned to specific parts
✓ Format validation works for all pattern types
✓ Auto-generation creates valid serials from formats
✓ Sequential counters maintain uniqueness under concurrent load
✓ Check digit algorithms (Luhn, mod-10) implemented
✓ Uniqueness validation prevents duplicates
✓ Format versioning tracks changes over time
✓ UI for format management operational
✓ API for format operations documented
✓ Performance tested with 10,000+ serials generated

---

## Integration Points

1. **With Issue #90** (Lot Tracking):
   - SerializedPart will reference SerialNumberFormatConfig
   - Lot/sublot generation uses assigned format

2. **With Part Management**:
   - Part model extended with format assignment
   - PartFamily model extended with default format

3. **With WorkOrder System**:
   - Serial generation triggered during work order fulfillment

4. **With UI**:
   - Integration into existing Serialization management page
   - Format templates available in part configuration

---

## Success Metrics

- [ ] All 11 acceptance criteria met
- [ ] 80%+ code coverage
- [ ] Performance: 10,000 serials in <5 seconds
- [ ] 0 concurrent conflicts with 100 parallel generators
- [ ] API documentation complete
- [ ] Zero breaking changes to existing serialization system
