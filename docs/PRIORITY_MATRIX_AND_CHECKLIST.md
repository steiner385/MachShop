# Strategic Priority Matrix: 70% Coverage Roadmap

## Executive Summary
To reach 70% documentation coverage (130/186 tables) with maximum business impact, focus on 7 critical "hub" tables that enable core MES functions. Combined with their supporting tables, you'll document 25-30 tables and exceed the coverage target while providing the most strategic value.

---

## TIER 1: CRITICAL PATH (Must Implement First)

### TABLE 1: EngineeringChangeOrder (ECO)
**Why First**: Foundation for change management, enables traceability for compliance

```
Business Value:
  HIGH ████████████████ 
  Affects: Product specs, processes, documents, compliance
  Regulatory: Required for ISO 9001, 21 CFR Part 11, aerospace
  Risk if skipped: Cannot manage design/process changes compliantly

Related Tables to Document:
  + ECOTask (11+ fields) - change implementation tasks
  + ECOHistory (8+ fields) - audit trail of changes
  + ECOAffectedDocument (9+ fields) - documents needing updates
  + ECOAttachment (9+ fields) - supporting documentation
  + ECOCRBReview (10+ fields) - CCB/CRB review tracking
  + ECORelation (6+ fields) - links between ECOs

Total Tables: 1 core + 6 supporting = 7 tables
Estimated Effort: 12-15 hours
Coverage Impact: +3.7% (7 tables / 186)

Key Fields to Document:
  ├─ ecoNumber (unique identifier for audits)
  ├─ status (tracks workflow state)
  ├─ impactAnalysis (JSON field for change impact)
  ├─ affectedParts (array of impacted part numbers)
  ├─ crbDecision (CRB/CCB decision)
  ├─ effectivityType (when change takes effect)
  └─ completedDate (controls implementation date)
```

**Implementation Checklist**:
- [ ] Define ECO numbering scheme and status workflow
- [ ] Document CRB/CCB review process integration
- [ ] Show link to DocumentTemplate for affected docs
- [ ] Define who can create/approve ECOs
- [ ] Explain effectivity and interchangeability concepts
- [ ] Document cascading impacts (what triggers what)

**Quick Win**: Start with ECO business process doc, then add schema descriptions

---

### TABLE 2: WorkflowDefinition & WorkflowInstance (Workflow Engine)
**Why Second**: Routes all approvals, enables BPA, prerequisites for many workflows

```
Business Value:
  CRITICAL ███████████████████ 
  Affects: ECO approvals, quality plan approvals, order releases, sign-offs
  Regulatory: Audit trail for 21 CFR Part 11, ISO 9001
  Risk if skipped: Manual approval workflows, no compliance audit trail

Core Tables:
  1. WorkflowDefinition (11+ fields) - workflow templates
     └─ Supported by: WorkflowStage, WorkflowRule

  2. WorkflowInstance (13+ fields) - live workflow instances
     └─ Supported by: WorkflowStageInstance, WorkflowAssignment, WorkflowHistory

Supporting Tables to Document:
  + WorkflowStage (10+ fields) - approval stages
  + WorkflowRule (9+ fields) - conditional routing
  + WorkflowStageInstance (8+ fields) - current stage state
  + WorkflowAssignment (10+ fields) - who's responsible
  + WorkflowHistory (9+ fields) - audit trail
  + WorkflowDelegation (8+ fields) - approval delegation
  + WorkflowMetrics (7+ fields) - performance metrics
  + WorkflowParallelCoordination (6+ fields) - parallel approvals

Total Tables: 2 core + 8 supporting = 10 tables
Estimated Effort: 15-18 hours
Coverage Impact: +5.4% (10 tables / 186)

Key Concepts to Explain:
  ├─ Workflow types (ECO approval, quality approval, order release, etc.)
  ├─ Stage flow with conditions and escalation
  ├─ Assignment strategies (auto, manual, role-based)
  ├─ Parallel vs. sequential approvals
  ├─ Delegation rules and audit trail
  ├─ Escalation and deadline management
  └─ Integration with SignalR for real-time updates
```

**Implementation Checklist**:
- [ ] Define standard workflow patterns (serial, parallel, conditional)
- [ ] Document stage definition and routing rules
- [ ] Show assignment strategies and role mapping
- [ ] Explain escalation triggers and deadlines
- [ ] Document approval action types (approve/reject/revise)
- [ ] Show how workflows integrate with existing tables
- [ ] Create example workflows for common processes

**Critical Integration**:
- Links to ECOTask (changes must be approved)
- Links to QualityPlan (inspection plans need approval)
- Links to User (who performs actions)
- Links to WorkInstruction (SOP approvals)

---

### TABLE 3: InspectionPlan (Quality Strategy)
**Why Third**: Core quality capability, links FAI, SPC, sampling, and compliance

```
Business Value:
  CRITICAL ███████████████████ 
  Affects: All quality checks, FAI workflows, SPC rules, sampling decisions
  Regulatory: Required for ISO 9001, AIAG standards, aerospace AS9102
  Risk if skipped: No documented inspection strategy, compliance gaps

Core Table:
  1. InspectionPlan (30+ fields) - defines inspection strategy
     └─ Supported by: Characteristics, Steps, Executions

Supporting Tables to Document:
  + InspectionCharacteristic (8+ fields) - what to inspect
  + InspectionStep (7+ fields) - how to inspect
  + InspectionExecution (12+ fields) - execution records
  + SamplingPlan (25+ fields) - sampling strategy (ANSI/ASQ Z1.4)
  + SamplingInspectionResult (9+ fields) - sampling results

Total Tables: 1 core + 5 supporting = 6 tables
Estimated Effort: 14-16 hours
Coverage Impact: +3.2% (6 tables / 186)

Key Concepts:
  ├─ Inspection types (incoming, in-process, final)
  ├─ Frequency rules (every piece vs. periodic vs. statistical)
  ├─ Characteristic definitions (nominal, limits, measurement method)
  ├─ Sampling plans per ANSI/ASQ Z1.4
  ├─ AQL (Acceptable Quality Level) tightening/relaxation
  ├─ Gage R&R requirements
  ├─ Disposition rules (accept/reject/inspect further)
  └─ Traceability to Quality Plan
```

**Implementation Checklist**:
- [ ] Document inspection type definitions
- [ ] Explain measurement and sampling strategies
- [ ] Show characteristic definition with limits
- [ ] Document sampling plan curves and transitions
- [ ] Explain disposition rules and next actions
- [ ] Link to QualityMeasurement for actual data
- [ ] Show connection to FAI workflow

**Critical Integrations**:
- Links to Operation (which operations to inspect)
- Links to Part (what part is being inspected)
- Links to QualityPlan (overall quality strategy)
- Links to FAIReport (first article inspection)
- Links to SPCConfiguration (SPC setup)
- Links to OperationGaugeRequirement (what gauges needed)

---

## TIER 2: HIGH-VALUE COMPLIANCE (Implement After Tier 1)

### TABLE 4: StandardOperatingProcedure (SOP)
**Why Important**: Regulatory requirement, training and competency foundation

```
Business Value:
  HIGH ████████████████ 
  Affects: Process execution, training compliance, personnel qualification
  Regulatory: Critical for ISO 9001, 21 CFR Part 11, FDA
  Risk if skipped: No documented procedures, audit failures

Core Table:
  1. StandardOperatingProcedure (35+ fields) - procedure definition
     └─ Supported by: Steps, Acknowledgments, Audits

Supporting Tables:
  + SOPStep (7+ fields) - procedure steps
  + SOPAcknowledgment (9+ fields) - who acknowledged/trained
  + SOPAudit (10+ fields) - compliance audits

Total Tables: 1 core + 3 supporting = 4 tables
Estimated Effort: 10-12 hours
Coverage Impact: +2.2% (4 tables / 186)

Key Concepts:
  ├─ SOP types (operations, quality, maintenance, safety)
  ├─ Procedure structure (purpose, scope, responsibilities)
  ├─ Step instructions with images/videos
  ├─ Critical vs. warning vs. informational steps
  ├─ Acknowledgment and training requirements
  ├─ Version control and effectivity
  ├─ Audit trails and compliance verification
  └─ Links to PersonnelQualification
```

**Implementation Checklist**:
- [ ] Define SOP types and templates
- [ ] Document step definition and media
- [ ] Explain acknowledgment and training workflow
- [ ] Show version history and obsolescence tracking
- [ ] Document audit requirements and records
- [ ] Link to WorkflowDefinition for approvals
- [ ] Show connection to training systems

**Regulatory Alignment**:
- 21 CFR Part 11: E-signature, audit trails
- ISO 9001: Documented procedures, change control
- AS9102: Quality procedures for aerospace

---

### TABLE 5: SPCConfiguration & SamplingPlan (Statistical Quality Control)
**Why Important**: Enables predictive quality, automated rule violations, sampling compliance

```
Business Value:
  HIGH ████████████████ 
  Affects: Process monitoring, defect prevention, sampling compliance
  Regulatory: ANSI/ASQ Z1.4, ISO 3207, aerospace AQL requirements
  Risk if skipped: No statistical control, reactive quality only

Tables to Document:
  1. SPCConfiguration (15+ fields) - SPC chart setup
     └─ Supported by: SPCRuleViolation

  2. SamplingPlan (25+ fields) - ANSI/ASQ Z1.4 plans
     └─ Supported by: SamplingInspectionResult

Supporting Tables:
  + SPCRuleViolation (12+ fields) - violation records
  + SamplingInspectionResult (9+ fields) - sampling results

Total Tables: 2 core + 2 supporting = 4 tables
Estimated Effort: 12-14 hours
Coverage Impact: +2.2% (4 tables / 186)

Key Concepts:
  ├─ SPC chart types (X-bar/R, X-bar/S, I-MR, p, np, c, u)
  ├─ Control limits (UCL, CL, LCL) calculation
  ├─ Capability indices (Cp, Cpk, Pp, Ppk)
  ├─ Western Electric rules and detection
  ├─ Tightened/Reduced/Normal switching rules
  ├─ AQL tightening based on violations
  ├─ Sampling curve and acceptance numbers
  └─ Integration with QualityMeasurement for data
```

**Implementation Checklist**:
- [ ] Explain SPC chart theory and rules
- [ ] Document control limit calculation methods
- [ ] Show sampling plan curves and transitions
- [ ] Document rule violation types and severity
- [ ] Explain AQL tightening logic
- [ ] Link to OperationParameter for monitored data
- [ ] Show integration with QualityMeasurement

**Technical Note**: Requires statistical knowledge; consider involving quality team

---

### TABLE 6: FAIReport (First Article Inspection)
**Why Important**: AS9102 compliance, aerospace requirement, part certification

```
Business Value:
  HIGH ████████████ 
  Affects: Aerospace supplier compliance, part release authority
  Regulatory: AS9102 Form 3, ISO 9001, 21 CFR Part 11
  Risk if skipped: Cannot release aerospace parts, customer non-compliance

Core Table:
  1. FAIReport (20+ fields) - FAI document
     └─ Supported by: FAICharacteristic, QIFMeasurement

Supporting Tables:
  + FAICharacteristic (10+ fields) - measured characteristics
  + QIFMeasurementPlan (12+ fields) - measurement plan
  + QIFMeasurementResult (15+ fields) - measurement data
  + QIFMeasurement (12+ fields) - individual measurements

Total Tables: 1 core + 4 supporting = 5 tables
Estimated Effort: 11-13 hours
Coverage Impact: +2.7% (5 tables / 186)

Key Concepts:
  ├─ AS9102 Form 1/2/3 mapping
  ├─ Characteristic definition per print
  ├─ Measurement method and traceability
  ├─ Uncertainty calculations
  ├─ Pass/Fail decision logic
  ├─ Approval signatures (electronic)
  ├─ QIF (Quality Information Framework) integration
  └─ Part release workflow
```

**Implementation Checklist**:
- [ ] Explain AS9102 form structure
- [ ] Document characteristic measurement
- [ ] Show uncertainty calculation
- [ ] Link to PartSiteAvailability (release status)
- [ ] Document approval workflow
- [ ] Show integration with QIFMeasurement
- [ ] Create example FAI report

**Compliance Context**: Critical for aerospace suppliers, customers often audit FAI system

---

### TABLE 7: PersonnelQualification & PersonnelCertification
**Why Important**: Competency management, compliance, operator authorization

```
Business Value:
  HIGH ████████████ 
  Affects: Personnel assignments, operation authorization, training tracking
  Regulatory: ISO 9001, 21 CFR Part 11, aerospace operator certification
  Risk if skipped: Unauthorized operations, training gaps, regulatory failures

Core Tables:
  1. PersonnelQualification (10+ fields) - qualification definitions
     └─ Supported by: PersonnelCertification

  2. PersonnelCertification (12+ fields) - individual certifications
     └─ Links to: User, PersonnelQualification

  3. PersonnelSkill (9+ fields) - skill catalog
     └─ Supported by: PersonnelSkillAssignment

  4. PersonnelSkillAssignment (10+ fields) - skill assignments

Total Tables: 4 tables
Estimated Effort: 10-12 hours
Coverage Impact: +2.2% (4 tables / 186)

Key Concepts:
  ├─ Qualification types (training, certification, license)
  ├─ Validity periods and renewal requirements
  ├─ Competency levels (basic, intermediate, advanced)
  ├─ Assessment records and dates
  ├─ Expiration tracking and alerts
  ├─ Skill categories and proficiency levels
  ├─ Operation-specific qualifications
  └─ Personnel class restrictions
```

**Implementation Checklist**:
- [ ] Define qualification types and requirements
- [ ] Document competency level definitions
- [ ] Show expiration tracking and renewal
- [ ] Link to PersonnelOperationSpecification (operation restrictions)
- [ ] Show training history integration
- [ ] Document assessment and verification
- [ ] Create personnel competency matrix

**Integration Points**:
- PersonnelOperationSpecification: who can do what
- WorkOrderOperation: which personnel assigned
- Routing: personnel requirements per operation
- Training system: qualification evidence

---

## TIER 3: SUPPORTING SYSTEMS (Implement to Reach 70%)

### TABLE 8: CNCProgram (Equipment Control)
```
Complexity: MEDIUM (27 fields, 1 relation)
Coverage: +0.5% (1 table)
Effort: 3-4 hours
Focus: Program traceability, first-piece authorization, machine control
```

### TABLE 9: SetupSheet & ToolCalibrationRecord (Setup & Maintenance)
```
Complexity: MEDIUM (40+ fields, 5 relations combined)
Coverage: +1% (2 tables)
Effort: 4-5 hours
Focus: Setup procedures, tool management, calibration tracking
```

### TABLE 10: IntegrationConfig (System Integration)
```
Complexity: MEDIUM (20+ fields, 5 relations)
Coverage: +0.5% (1 table)
Effort: 3-4 hours
Focus: ERP integration, system synchronization, data flows
```

---

## CONSOLIDATION OPPORTUNITY

**Document Core "Hub" Tables + All Related Tables = 25-30 tables documented**

```
EngineeringChangeOrder family      → 7 tables
WorkflowDefinition/Instance family → 10 tables
InspectionPlan family              → 6 tables
StandardOperatingProcedure family  → 4 tables
SPCConfiguration/SamplingPlan      → 4 tables
FAIReport family                   → 5 tables
PersonnelQualification family      → 4 tables
Supporting tables                  → 3 tables
                                   ─────────
TOTAL:                              ~43 tables

Coverage: 123 + 25-30 = 148-153 / 186 (79-82%)
TARGET: Exceeds 70% goal significantly
```

---

## FINAL RECOMMENDATION

**START WITH**:
1. **Tier 1 (Weeks 1-2)**: Focus on Tables 1-3 (ECO, Workflow, Inspection)
   - Estimated: 45-50 hours
   - Result: +7-10 tables, +4-5% coverage to 70-71%
   - Business value: IMMEDIATE - enables core MES workflows

2. **Tier 2 (Weeks 3-4)**: Add Tables 4-7 (SOP, SPC, FAI, Personnel)
   - Estimated: 40-50 hours  
   - Result: +13-18 tables, +7-10% coverage to 77-81%
   - Business value: HIGH - compliance and quality foundations

3. **Tier 3 (Week 5+)**: Add Tables 8-10 + others (Optional)
   - Estimated: 15-20 hours
   - Result: +3-5 tables, exceeds 80% coverage
   - Business value: MEDIUM - supporting capabilities

**Total Effort**: 100-120 hours to reach 70%+ coverage with maximum strategic value

