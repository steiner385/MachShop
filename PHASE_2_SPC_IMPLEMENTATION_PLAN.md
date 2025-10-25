# Phase 2: Statistical Process Control (SPC) Module - Implementation Plan

**Status**: 🚧 **IN PROGRESS**
**Duration**: 7 weeks (Weeks 1-4: SPC Module, Weeks 5-6: Sampling Plans, Week 7: Integration)
**Start Date**: 2025-10-24
**Target Completion**: 2025-12-12

---

## Executive Summary

Phase 2 extends the Variable System with advanced quality and process control capabilities, adding Statistical Process Control (SPC) and Sampling Plans to match or exceed capabilities found in leading MES systems from Siemens, Dassault, and SAP.

---

## Weeks 1-4: SPC Module

### Goals
- Implement comprehensive SPC functionality
- Support multiple control chart types
- Implement Western Electric Rules for out-of-control detection
- Calculate process capability indices
- Provide real-time SPC monitoring

### Database Schema Design

#### SPCConfiguration Model

```prisma
model SPCConfiguration {
  id          String   @id @default(cuid())
  parameterId String   @unique
  parameter   OperationParameter @relation(fields: [parameterId], references: [id])

  // Chart Configuration
  chartType   SPCChartType  // X_BAR_R, X_BAR_S, I_MR, P_CHART, C_CHART, etc.
  subgroupSize Int?         // Sample size for subgroup charts (X-bar, R)

  // Control Limits
  UCL         Float?   // Upper Control Limit
  centerLine  Float?   // Process mean or median
  LCL         Float?   // Lower Control Limit

  // Range/StdDev Limits (for X-bar/R, X-bar/S charts)
  rangeUCL    Float?
  rangeCL     Float?
  rangeLCL    Float?

  // Specification Limits (from ParameterLimits, cached for performance)
  USL         Float?   // Upper Specification Limit
  LSL         Float?   // Lower Specification Limit
  targetValue Float?   // Nominal/target value

  // Calculation Method
  limitsBasedOn      LimitCalculationMethod  // HISTORICAL_DATA, SPEC_LIMITS, MANUAL
  historicalDataDays Int?                    // Days of data for limit calculation
  lastCalculatedAt   DateTime?

  // Western Electric Rules (bitmask or JSON)
  enabledRules       Json   // Array of enabled rule numbers [1,2,3,4,5,6,7,8]
  ruleSensitivity    String @default("NORMAL")  // LOW, NORMAL, HIGH

  // Capability Settings
  enableCapability   Boolean @default(true)
  confidenceLevel    Float   @default(0.95)  // 95% confidence for capability

  // Status
  isActive           Boolean @default(true)

  // Metadata
  createdBy          String
  lastModifiedBy     String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  // Relations
  violations SPCRuleViolation[]

  @@map("spc_configurations")
}

enum SPCChartType {
  X_BAR_R        // X-bar and Range (variable data, small subgroups)
  X_BAR_S        // X-bar and Std Dev (variable data, large subgroups)
  I_MR           // Individual and Moving Range (variable data, n=1)
  P_CHART        // Proportion defective (attribute data)
  NP_CHART       // Number defective (attribute data)
  C_CHART        // Count of defects (attribute data)
  U_CHART        // Defects per unit (attribute data)
  EWMA           // Exponentially Weighted Moving Average
  CUSUM          // Cumulative Sum
}

enum LimitCalculationMethod {
  HISTORICAL_DATA   // Calculate from historical process data
  SPEC_LIMITS       // Derive from specification limits (LSL/USL)
  MANUAL            // Manually entered by user
}

model SPCRuleViolation {
  id              String   @id @default(cuid())
  configurationId String
  configuration   SPCConfiguration @relation(fields: [configurationId], references: [id])

  // Violation Details
  ruleNumber      Int      // Western Electric Rule number (1-8)
  ruleName        String   // "Rule 1: One point beyond 3σ"
  severity        String   // CRITICAL, WARNING, INFO

  // Data Point
  dataPointId     String?  // Reference to ProcessDataPoint if available
  value           Float
  timestamp       DateTime
  subgroupNumber  Int?

  // Context
  UCL             Float?
  LCL             Float?
  centerLine      Float?
  deviationSigma  Float?   // How many σ from centerline

  // Status
  acknowledged    Boolean  @default(false)
  acknowledgedBy  String?
  acknowledgedAt  DateTime?
  resolution      String?  @db.Text

  createdAt       DateTime @default(now())

  @@index([configurationId, timestamp])
  @@index([acknowledged])
  @@map("spc_rule_violations")
}
```

### Backend Service: SPCService

**File**: `src/services/SPCService.ts`

**Key Methods**:

1. **Configuration Management**
   ```typescript
   async createConfiguration(config: CreateSPCConfigInput): Promise<SPCConfiguration>
   async updateConfiguration(id: string, updates: UpdateSPCConfigInput): Promise<SPCConfiguration>
   async deleteConfiguration(id: string): Promise<void>
   async getConfiguration(parameterId: string): Promise<SPCConfiguration | null>
   ```

2. **Control Limit Calculations**
   ```typescript
   async calculateControlLimits(parameterId: string, method: LimitCalculationMethod): Promise<ControlLimits>
   async recalculateFromHistoricalData(parameterId: string, days: number): Promise<ControlLimits>
   ```

3. **Statistical Calculations**
   ```typescript
   calculateXBarRLimits(data: number[][], subgroupSize: number): XBarRLimits
   calculateIMRLimits(data: number[]): IMRLimits
   calculatePChartLimits(defectives: number[], samples: number[]): PChartLimits
   calculateCChartLimits(defects: number[]): CChartLimits
   ```

4. **Western Electric Rules Engine**
   ```typescript
   evaluateWesternElectricRules(dataPoints: DataPoint[], config: SPCConfiguration): RuleViolation[]

   // Individual rules
   rule1_OnePointBeyond3Sigma(points: DataPoint[], limits: ControlLimits): boolean
   rule2_NinePointsOnOneSide(points: DataPoint[], limits: ControlLimits): boolean
   rule3_SixPointsTrending(points: DataPoint[]): boolean
   rule4_FourteenPointsAlternating(points: DataPoint[]): boolean
   rule5_TwoOfThreeBeyond2Sigma(points: DataPoint[], limits: ControlLimits): boolean
   rule6_FourOfFiveBeyond1Sigma(points: DataPoint[], limits: ControlLimits): boolean
   rule7_FifteenWithin1Sigma(points: DataPoint[], limits: ControlLimits): boolean
   rule8_EightPointsBeyond1Sigma(points: DataPoint[], limits: ControlLimits): boolean
   ```

5. **Capability Index Calculations**
   ```typescript
   async calculateCapability(parameterId: string): Promise<CapabilityIndices>

   calculateCp(data: number[], USL: number, LSL: number): number
   calculateCpk(data: number[], USL: number, LSL: number, target?: number): number
   calculatePp(data: number[], USL: number, LSL: number): number
   calculatePpk(data: number[], USL: number, LSL: number, target?: number): number
   calculateCpm(data: number[], USL: number, LSL: number, target: number): number
   ```

6. **Real-Time Monitoring**
   ```typescript
   async evaluateDataPoint(parameterId: string, value: number, timestamp: Date): Promise<EvaluationResult>
   async triggerViolationAlert(violation: RuleViolation): Promise<void>
   ```

### REST API Endpoints

**File**: `src/routes/spc.ts`

```typescript
// Configuration
POST   /api/v1/spc/configurations              - Create SPC configuration
GET    /api/v1/spc/configurations/:id          - Get SPC configuration
PUT    /api/v1/spc/configurations/:id          - Update SPC configuration
DELETE /api/v1/spc/configurations/:id          - Delete SPC configuration
GET    /api/v1/spc/configurations              - List all SPC configurations

// Control Limits
POST   /api/v1/spc/configurations/:id/calculate-limits   - Calculate control limits
GET    /api/v1/spc/configurations/:id/limits             - Get current limits

// Evaluation
POST   /api/v1/spc/configurations/:id/evaluate    - Evaluate data point(s)
POST   /api/v1/spc/evaluate-batch                 - Batch evaluate multiple points

// Capability
GET    /api/v1/spc/configurations/:id/capability  - Get capability indices
POST   /api/v1/spc/configurations/:id/capability/recalculate - Recalculate capability

// Violations
GET    /api/v1/spc/violations                     - List violations (with filters)
GET    /api/v1/spc/violations/:id                 - Get violation details
POST   /api/v1/spc/violations/:id/acknowledge     - Acknowledge violation
PUT    /api/v1/spc/violations/:id/resolve         - Resolve violation

// Historical Data
GET    /api/v1/spc/configurations/:id/data        - Get historical data for charts
GET    /api/v1/spc/configurations/:id/trends      - Get trend analysis
```

### Frontend Components

#### 1. ControlChart Component
**File**: `frontend/src/components/SPC/ControlChart.tsx`

**Features**:
- Multiple chart type support (X-bar, R, I-MR, P, C)
- Real-time data plotting
- Control limit lines (UCL, CL, LCL)
- Specification limit lines (USL, LSL)
- Rule violation highlighting
- Zoom and pan capabilities
- Export to image/PDF

**Technology**: Recharts or D3.js

#### 2. SPCConfiguration Component
**File**: `frontend/src/components/SPC/SPCConfiguration.tsx`

**Features**:
- Chart type selection
- Subgroup size configuration
- Limit calculation method selection
- Western Electric Rules toggle
- Historical data range selection
- Capability settings

#### 3. RuleViolationAlert Component
**File**: `frontend/src/components/SPC/RuleViolationAlert.tsx`

**Features**:
- Real-time violation notifications
- Violation list with filters
- Severity indicators
- Acknowledgment interface
- Resolution tracking

#### 4. CapabilityReport Component
**File**: `frontend/src/components/SPC/CapabilityReport.tsx`

**Features**:
- Cp, Cpk, Pp, Ppk display
- Process capability histogram
- Specification limits visualization
- Confidence intervals
- Interpretation guidance

### Western Electric Rules Implementation

**8 Rules for Detecting Out-of-Control Processes**:

1. **Rule 1**: One point beyond 3σ from centerline
   - **Severity**: CRITICAL
   - **Meaning**: Special cause variation

2. **Rule 2**: Nine consecutive points on same side of centerline
   - **Severity**: WARNING
   - **Meaning**: Process shift

3. **Rule 3**: Six consecutive points trending up or down
   - **Severity**: WARNING
   - **Meaning**: Trend in process

4. **Rule 4**: Fourteen consecutive points alternating up and down
   - **Severity**: WARNING
   - **Meaning**: Systematic variation

5. **Rule 5**: Two out of three consecutive points beyond 2σ (same side)
   - **Severity**: WARNING
   - **Meaning**: Process approaching limits

6. **Rule 6**: Four out of five consecutive points beyond 1σ (same side)
   - **Severity**: INFO
   - **Meaning**: Process drifting

7. **Rule 7**: Fifteen consecutive points within 1σ of centerline
   - **Severity**: INFO
   - **Meaning**: Stratification or measurement issue

8. **Rule 8**: Eight consecutive points beyond 1σ from centerline (either side)
   - **Severity**: WARNING
   - **Meaning**: Mixture or over-adjustment

### Capability Indices Formulas

**Process Capability (Short-term)**:
```
Cp = (USL - LSL) / (6σ)
Cpk = min[(USL - μ) / (3σ), (μ - LSL) / (3σ)]
Cpm = (USL - LSL) / (6 * sqrt(σ² + (μ - T)²))
```

**Process Performance (Long-term)**:
```
Pp = (USL - LSL) / (6s)
Ppk = min[(USL - x̄) / (3s), (x̄ - LSL) / (3s)]
```

Where:
- σ = within-subgroup standard deviation (short-term)
- s = overall standard deviation (long-term)
- μ = process mean
- T = target value

**Interpretation**:
- Cp/Pp ≥ 2.0: Excellent
- Cp/Pp ≥ 1.33: Adequate
- Cp/Pp < 1.0: Process not capable

### Integration with ProcessDataCollection

**Auto-Evaluation on Data Collection**:
```typescript
// In ProcessDataCollectionService
async recordDataPoint(parameterId: string, value: number): Promise<void> {
  // Save data point
  await prisma.processDataPoint.create({ ... });

  // Check if SPC is enabled for this parameter
  const spcConfig = await spcService.getConfiguration(parameterId);
  if (spcConfig && spcConfig.isActive) {
    // Evaluate against SPC rules
    const evaluation = await spcService.evaluateDataPoint(parameterId, value, new Date());

    // Trigger alerts if violations found
    if (evaluation.violations.length > 0) {
      await notificationService.sendSPCAlert(evaluation.violations);
    }
  }
}
```

### E2E Tests

**File**: `src/tests/e2e/spc.spec.ts`

**Test Coverage**:
1. SPC Configuration CRUD
2. Control limit calculation (X-bar/R, I-MR, P-chart, C-chart)
3. Western Electric Rules evaluation (all 8 rules)
4. Capability index calculation (Cp, Cpk, Pp, Ppk)
5. Real-time data point evaluation
6. Violation detection and alerts
7. Historical data retrieval
8. Chart data generation

**Target**: 30+ E2E tests

---

## Weeks 5-6: Sampling Plans

### Goals
- Implement ANSI/ASQ Z1.4 sampling plans
- Support acceptance sampling (single, double, multiple)
- Implement switching rules (normal, tightened, reduced)
- Provide sample size determination

### Database Schema Design

#### SamplingPlan Model

```prisma
model SamplingPlan {
  id                String   @id @default(cuid())
  planName          String
  planType          SamplingPlanType  // SINGLE, DOUBLE, MULTIPLE, SEQUENTIAL

  // Scope
  parameterId       String?
  parameter         OperationParameter? @relation(fields: [parameterId], references: [id])
  operationId       String?
  operation         Operation? @relation(fields: [operationId], references: [id])

  // ANSI/ASQ Z1.4 Configuration
  inspectionLevel   String   // I, II, III, S1, S2, S3, S4
  AQL               Float    // Acceptable Quality Level (%)
  lotSizeMin        Int?
  lotSizeMax        Int?

  // Sampling Parameters (Normal Inspection)
  sampleSizeNormal  Int
  acceptanceNumber  Int
  rejectionNumber   Int

  // Sampling Parameters (Tightened Inspection)
  sampleSizeTightened Int?
  acceptanceNumberTightened Int?

  // Sampling Parameters (Reduced Inspection)
  sampleSizeReduced Int?
  acceptanceNumberReduced Int?

  // Double/Multiple Sampling
  sampleSize2       Int?
  acceptanceNumber2 Int?
  rejectionNumber2  Int?

  // Switching Rules
  currentInspectionLevel String @default("NORMAL")  // NORMAL, TIGHTENED, REDUCED
  consecutiveAccepted   Int    @default(0)
  consecutiveRejected   Int    @default(0)

  // Status
  isActive          Boolean  @default(true)

  // Metadata
  createdBy         String
  lastModifiedBy    String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  inspectionResults SamplingInspectionResult[]

  @@map("sampling_plans")
}

enum SamplingPlanType {
  SINGLE     // Single sampling plan
  DOUBLE     // Double sampling plan
  MULTIPLE   // Multiple sampling plan
  SEQUENTIAL // Sequential sampling
}

model SamplingInspectionResult {
  id              String   @id @default(cuid())
  planId          String
  plan            SamplingPlan @relation(fields: [planId], references: [id])

  // Lot Information
  lotNumber       String
  lotSize         Int
  inspectionDate  DateTime

  // Sample Details
  sampleSize      Int
  defectsFound    Int

  // Decision
  decision        String   // ACCEPT, REJECT, RESAMPLE
  inspectionLevel String   // NORMAL, TIGHTENED, REDUCED

  // Inspector
  inspectorId     String

  // Notes
  notes           String?  @db.Text

  createdAt       DateTime @default(now())

  @@index([planId, inspectionDate])
  @@map("sampling_inspection_results")
}
```

### Backend Service: SamplingService

**File**: `src/services/SamplingService.ts`

**Key Methods**:
1. ANSI/ASQ Z1.4 table lookups
2. Sample size determination
3. Accept/reject evaluation
4. Switching rule logic
5. Plan recommendations

### Frontend Components

1. **SamplingPlanEditor** - Configure sampling plans
2. **InspectionResultEntry** - Enter inspection results
3. **SwitchingRecommendation** - Display switching recommendations
4. **SamplingHistory** - Historical results and trends

---

## Week 7: Integration & Testing

### Integration Tasks
1. Connect SPC with real-time data collection
2. Add SPC dashboard to main UI
3. Integrate capability reports into quality module
4. Link sampling plans to work orders
5. Add SPC/Sampling to parameter detail pages

### Testing Tasks
1. Cross-module integration tests
2. Performance testing (10,000+ data points)
3. Statistical accuracy validation
4. User acceptance testing
5. Documentation updates

### Performance Targets
- Control limit calculation: < 500ms for 1000 points
- Rule evaluation: < 100ms for 30 recent points
- Capability calculation: < 200ms
- Chart rendering: < 1s for 500 points

---

## Deliverables

### Code Files (Estimated)
1. `prisma/schema.prisma` - SPCConfiguration, SPCRuleViolation, SamplingPlan models
2. `src/services/SPCService.ts` (~800 lines)
3. `src/services/SamplingService.ts` (~400 lines)
4. `src/routes/spc.ts` (~300 lines)
5. `src/routes/samplingPlans.ts` (~200 lines)
6. `frontend/src/components/SPC/ControlChart.tsx` (~500 lines)
7. `frontend/src/components/SPC/SPCConfiguration.tsx` (~400 lines)
8. `frontend/src/components/SPC/RuleViolationAlert.tsx` (~300 lines)
9. `frontend/src/components/SPC/CapabilityReport.tsx` (~350 lines)
10. `frontend/src/components/Sampling/SamplingPlanEditor.tsx` (~400 lines)
11. `frontend/src/components/Sampling/InspectionResultEntry.tsx` (~300 lines)
12. `frontend/src/api/spc.ts` (~250 lines)
13. `src/tests/e2e/spc.spec.ts` (~600 lines, 30 tests)
14. `src/tests/e2e/sampling.spec.ts` (~400 lines, 20 tests)

**Total**: ~5,200 lines of code, 50+ E2E tests

### Documentation
1. SPC Configuration Guide
2. Western Electric Rules Reference
3. Capability Index Interpretation Guide
4. ANSI/ASQ Z1.4 Implementation Guide
5. API Documentation

---

## Dependencies

### Backend
```json
{
  "simple-statistics": "^7.8.3"  // Statistical calculations
}
```

### Frontend
```json
{
  "recharts": "^2.10.0",  // Already installed - for control charts
  "d3": "^7.9.0"           // Already installed - for advanced charts
}
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Test Coverage | > 90% |
| E2E Tests | 50+ passing |
| Control Limit Accuracy | 99.9% |
| Western Electric Rule Detection | 100% |
| Capability Calculation Accuracy | 99.99% |
| Real-time Evaluation Speed | < 100ms |
| Chart Rendering Performance | < 1s for 500 points |

---

## Competitive Advantages (Phase 2)

After Phase 2, our system will have:

1. ✅ **Most comprehensive SPC implementation** (8 Western Electric Rules vs. 4-6 in competitors)
2. ✅ **Real-time rule evaluation** on every data point
3. ✅ **Automated control limit calculation** from historical data
4. ✅ **ANSI/ASQ Z1.4 full compliance** for sampling plans
5. ✅ **Integrated capability reporting** (Cp, Cpk, Pp, Ppk, Cpm)
6. ✅ **Multiple chart types** (X-bar/R, I-MR, P, C, EWMA, CUSUM)
7. ✅ **Automatic switching rules** for sampling plans

---

**Document Created**: 2025-10-24
**Phase**: 2 - Statistical Process Control
**Status**: 🚧 IN PROGRESS
