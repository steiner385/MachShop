# Seed Data Generation - Priority & Complexity Matrix

## Quick Reference: Prioritized Seed Data Gaps

```
PRIORITY MATRIX (Business Impact vs. Implementation Complexity)

HIGH IMPACT / MEDIUM COMPLEXITY (Do First!)
┌─────────────────────────────────────────┐
│ • Personnel (Roles, Certifications)     │
│ • Material Genealogy (Splits, Merges)   │
│ • Work Order States (Rework, Scrap)     │
│ • Quality Sampling Plans                │
│ • Equipment Maintenance                 │
│ • Setup Sheets & Changeover             │
└─────────────────────────────────────────┘

HIGH IMPACT / HIGH COMPLEXITY (Plan Carefully)
┌─────────────────────────────────────────┐
│ • Production Scheduling (Constraints)   │
│ • Equipment OEE Calculation             │
│ • Digital Thread / Traceability         │
│ • Workflow Automation                   │
│ • Electronic Signatures (21 CFR Part 11)│
└─────────────────────────────────────────┘

MEDIUM IMPACT / MEDIUM COMPLEXITY (Nice to Have)
┌─────────────────────────────────────────┐
│ • CNC Programs & Tool Management        │
│ • Document Management                   │
│ • Engineering Change Orders (ECO)       │
│ • Time Tracking & Labor Costs           │
│ • Integration/ERP Sync                  │
└─────────────────────────────────────────┘

LOW IMPACT / LOW COMPLEXITY (Can Wait)
┌─────────────────────────────────────────┐
│ • SOP Management                        │
│ • Backup & Recovery                     │
│ • File Storage & Versioning             │
│ • UX Preferences & Configuration        │
│ • Alerts & Notifications                │
└─────────────────────────────────────────┘
```

---

## Phased Implementation Roadmap

### PHASE 1: Core Production Workflows (Weeks 1-2)
**Goal:** Ensure comprehensive test coverage of primary MES functions

#### Personnel (10 scenarios)
- [ ] 30-50 users across all roles
- [ ] Multi-level supervisor hierarchies
- [ ] Certifications with expiration tracking
- [ ] Skill assignments at varying competency levels (1-5)
- [ ] Complex shift schedules with recurrence
- [ ] Work center assignments (primary/secondary)
- [ ] Dynamic RBAC (global and site-specific roles)
- [ ] Cross-training scenarios
- [ ] Vacation/sick leave coverage
- [ ] Cost center allocations

#### Materials (12 scenarios)
- [ ] 20-30 material lots with full genealogy
- [ ] Lot split scenarios (1 → 3)
- [ ] Lot merge scenarios (3 → 1)
- [ ] Multi-generation genealogy (A → B → C → D)
- [ ] Quality lot status transitions
- [ ] Expired/quarantined lots
- [ ] Supplier lot mapping
- [ ] Serial number validation
- [ ] Batch recall scenarios
- [ ] Material property variations
- [ ] Stock levels triggering reorder
- [ ] Multi-location inventory movements

#### Work Orders (10 scenarios)
- [ ] 10-15 work orders in all states
- [ ] Multi-operation work orders (5+ operations)
- [ ] Rework workflow (original → quality issue → rework → success)
- [ ] Scrap workflow (original → quality issue → scrap)
- [ ] Work order split scenarios
- [ ] Work order merge scenarios
- [ ] Expedited work order insertion
- [ ] On-hold with material waiting
- [ ] Cancelled with cleanup
- [ ] Partial completion with remaining scrapped

#### Quality (8 scenarios)
- [ ] 5-10 quality plans for different parts
- [ ] Plans with 10-20 characteristics each
- [ ] Multiple inspection types (RECEIVING, IN_PROCESS, FINAL)
- [ ] Different sampling methods (100%, FIRST_LAST, NORMAL, TIGHTENED, RELAXED)
- [ ] Inspections that pass and fail
- [ ] Multiple NCRs with different severities
- [ ] NCR dispositions (SCRAP, REWORK, USE_AS_IS)
- [ ] FAI with engineering change

**Estimated Effort:** 2 weeks  
**Resources Needed:** 1-2 developers familiar with Prisma/data modeling

---

### PHASE 2: Advanced Production Features (Weeks 3-4)
**Goal:** Support complex manufacturing scenarios and compliance

#### Scheduling (6 scenarios)
- [ ] 2-4 week rolling schedules
- [ ] 20-30 schedule entries
- [ ] Material availability constraints
- [ ] Equipment capacity constraints
- [ ] Personnel availability constraints
- [ ] Schedule conflicts and resolution

#### Equipment (10 scenarios)
- [ ] Equipment hierarchies (cell → equipment → component)
- [ ] Daily equipment logs across 3 shifts
- [ ] OEE calculations (Availability × Performance × Quality)
- [ ] Equipment downtime with reasons
- [ ] Maintenance work orders (preventive and unplanned)
- [ ] Tool calibration records
- [ ] Equipment state transitions (UP, DOWN, DEGRADED, MAINTENANCE)
- [ ] Performance degradation requiring maintenance
- [ ] Multi-shift usage patterns
- [ ] Concurrent equipment usage

#### Setup & Tools (8 scenarios)
- [ ] Setup sheets with multiple steps
- [ ] Setup parameters and validation
- [ ] Setup execution with sign-off
- [ ] Changeover time tracking
- [ ] Tool management with versioning
- [ ] Tool offset adjustments
- [ ] Tool life consumption
- [ ] CNC program versioning

#### Compliance (8 scenarios)
- [ ] Electronic signatures (21 CFR Part 11)
- [ ] Multi-stage approval chains (sequential and parallel)
- [ ] Approval delegation
- [ ] Signature invalidation
- [ ] Approval audit trails
- [ ] Conditional approvals
- [ ] Approval escalation
- [ ] Complete compliance documentation

**Estimated Effort:** 2 weeks  
**Resources Needed:** 1-2 developers + QA for compliance validation

---

### PHASE 3: Advanced Workflows & Documents (Weeks 5-6)
**Goal:** Enable automation and document management

#### Workflows (12 scenarios)
- [ ] NCR approval workflow (SUBMITTED → REVIEWED → APPROVED → CLOSED)
- [ ] ECO review workflow (DRAFT → CRB → APPROVED → IMPLEMENTED)
- [ ] FAI approval workflow
- [ ] Document review workflow
- [ ] Multi-stage approval chains
- [ ] Conditional branching
- [ ] Parallel approvals
- [ ] Task delegation and escalation
- [ ] Workflow performance metrics
- [ ] SLA violation scenarios
- [ ] Workflow instance history
- [ ] Workflow template library

#### Document Management (10 scenarios)
- [ ] Document templates
- [ ] Document review assignments
- [ ] Version control with conflict resolution
- [ ] Document annotations and comments
- [ ] Concurrent editing
- [ ] Change tracking
- [ ] Document activity audit trail
- [ ] Document subscriptions/notifications
- [ ] File versioning
- [ ] Access control

#### ECO Management (6 scenarios)
- [ ] ECO lifecycle (DRAFT → SUBMITTED → REVIEW → APPROVED → IMPLEMENTED)
- [ ] Affected documents tracking
- [ ] ECO impact analysis
- [ ] CRB decision workflows
- [ ] Implementation task tracking
- [ ] Traceability of ECO changes

**Estimated Effort:** 2 weeks  
**Resources Needed:** 1-2 developers + process analyst

---

### PHASE 4: Analytics & Integration (Weeks 7-8)
**Goal:** Support reporting, analytics, and external integration

#### Advanced Quality (8 scenarios)
- [ ] SPC control charts with trend detection
- [ ] Rule violations (Nelson rules, Western Electric rules)
- [ ] Measurement system analysis (MSA/GR&R)
- [ ] Sampling plan execution history
- [ ] Quality trend analysis
- [ ] Out-of-control detection
- [ ] Capability studies
- [ ] Lot acceptance decisions

#### Integration & Data Collection (10 scenarios)
- [ ] ERP schedule push/pull
- [ ] Material transaction sync
- [ ] Production performance export
- [ ] Equipment data collection (real-time streams)
- [ ] IoT sensor data aggregation
- [ ] Equipment telemetry scenarios
- [ ] Error handling and retries
- [ ] Sync conflict resolution
- [ ] Data transformation pipelines
- [ ] Integration audit trails

#### Time Tracking & Labor (6 scenarios)
- [ ] Shift-based time tracking
- [ ] Overtime scenarios
- [ ] Labor rate variations
- [ ] Cost center allocations
- [ ] Machine utilization tracking
- [ ] Downtime cost tracking

#### Reporting (8 scenarios)
- [ ] KPI calculations (OEE, First Pass Yield, etc.)
- [ ] Dashboard data
- [ ] Production metrics
- [ ] Quality reports
- [ ] Equipment performance reports
- [ ] Cost analysis reports
- [ ] Alert generation and escalation
- [ ] Report scheduling and delivery

**Estimated Effort:** 2 weeks  
**Resources Needed:** 1 developer + analytics specialist

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review and approve priority matrix
- [ ] Design seed data framework architecture
- [ ] Set up git feature branch for seed data work
- [ ] Create test harness for data validation
- [ ] Document data generation conventions

### Phase 1 Implementation
- [ ] Build EntityFactory base classes
- [ ] Implement PersonnelGenerator
- [ ] Implement MaterialGenerator
- [ ] Implement WorkOrderGenerator
- [ ] Implement QualityGenerator
- [ ] Create seed data validation tests
- [ ] Document generated data schemas

### Phase 2 Implementation
- [ ] Implement SchedulingGenerator
- [ ] Implement EquipmentGenerator
- [ ] Implement SetupGenerator
- [ ] Implement ComplianceGenerator
- [ ] Create scenario builders for complex cases
- [ ] Test cross-service data consistency

### Phase 3 Implementation
- [ ] Implement WorkflowGenerator
- [ ] Implement DocumentGenerator
- [ ] Implement ECOGenerator
- [ ] Create workflow scenario builders
- [ ] Test approval chain execution

### Phase 4 Implementation
- [ ] Implement QualityAdvancedGenerator
- [ ] Implement IntegrationGenerator
- [ ] Implement TimeTrackingGenerator
- [ ] Implement ReportingGenerator
- [ ] Create analytics validation tests

### Post-Implementation
- [ ] Comprehensive documentation
- [ ] Training for developers
- [ ] Integration with CI/CD pipeline
- [ ] Performance optimization
- [ ] Backup and recovery procedures

---

## Success Metrics

### Quantitative Metrics
- [ ] 100+ seed data entities created
- [ ] 75%+ schema model coverage
- [ ] < 5% data validation errors
- [ ] < 2 seconds seed execution time (for Phase 1)
- [ ] 90%+ test pass rate with seeded data

### Qualitative Metrics
- [ ] Developers report easy scenario composition
- [ ] Test data feels realistic and production-like
- [ ] Comprehensive documentation available
- [ ] Framework extensible for future models
- [ ] Cross-service data consistency verified

---

## Risk Mitigation

### Risk: Data Consistency Across Microservices
**Mitigation:** 
- Implement SeedOrchestrator to coordinate service order
- Create DataIntegrityChecker to validate relationships
- Maintain mapping of cross-service IDs

### Risk: Complex Scenario Composition
**Mitigation:**
- Use ScenarioBuilder pattern for composability
- Create reusable scenario templates
- Provide detailed documentation with examples

### Risk: Performance Degradation
**Mitigation:**
- Profile seed execution time
- Implement parallel seeding where possible
- Use upsert operations for idempotence
- Cache frequently used data

### Risk: Maintenance Burden
**Mitigation:**
- Use templates and factories to reduce duplication
- Version control all seed data definitions
- Create automated validation tests
- Document conventions thoroughly

---

## Resource Allocation

**Phase 1 (2 weeks):** 2 developers
**Phase 2 (2 weeks):** 2 developers  
**Phase 3 (2 weeks):** 2 developers + 1 process analyst
**Phase 4 (2 weeks):** 1 developer + 1 analytics specialist

**Total Effort:** 8 weeks with 2-3 concurrent resources

**Estimated Cost Savings:** 10-20x ROI through:
- 80% reduction in manual test data creation
- 50% reduction in test setup time
- Improved test reliability and consistency
- Faster development cycle

---

## References

- **Full Analysis:** `/home/tony/GitHub/MachShop/docs/MES_SCHEMA_ANALYSIS.md`
- **Schema File:** `/home/tony/GitHub/MachShop/prisma/schema.prisma`
- **Current Seeds:** `/home/tony/GitHub/MachShop/services/*/prisma/seed.ts`

---

**Document Status:** READY FOR IMPLEMENTATION PLANNING  
**Last Updated:** October 29, 2025  
**Next Review:** After Phase 1 completion

