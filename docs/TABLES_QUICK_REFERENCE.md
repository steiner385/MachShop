# Quick Reference: Top 10 Strategic Undocumented Tables

| Rank | Table Name | Business Domain | Complexity | Priority | Why Strategic | Blocks What? |
|------|-----------|-----------------|-----------|----------|---------------|-------------|
| 1 | **EngineeringChangeOrder** | Engineering Change Mgmt | HIGH (45+ fields, 8 relations) | CRITICAL | Manages product changes, compliance required | ECO workflows, document control, change traceability |
| 2 | **WorkflowDefinition/Instance** | Process Automation | HIGH (13+ fields, 5 relations each) | CRITICAL | Routes all approvals, enables BPA | ECO approvals, order releases, quality sign-offs |
| 3 | **InspectionPlan** | Quality Systems | HIGH (30+ fields, 5 relations) | CRITICAL | Defines inspection strategy & data capture | FAI workflows, SPC integration, quality compliance |
| 4 | **StandardOperatingProcedure** | Documentation | HIGH (35+ fields, 5 relations) | CRITICAL | Regulatory requirement, training hub | Personnel competency, process compliance |
| 5 | **SPCConfiguration & SamplingPlan** | Statistical QC | MEDIUM (15-25 fields, 2 relations) | HIGH | Quality control automation | Predictive quality, sampling compliance |
| 6 | **FAIReport** | Advanced QC | MEDIUM (20+ fields, 5 relations) | HIGH | AS9102 compliance, aerospace requirement | First-piece release, part certification |
| 7 | **PersonnelQualification** | Competency Mgmt | MEDIUM (10+ fields, 1 relation) | HIGH | Skills & certifications mgmt | Operator authorization, training tracking |
| 8 | **CNCProgram** | Equipment Control | MEDIUM (27 fields, 1 relation) | MEDIUM | Program traceability, first-piece auth | Program downloads, machine control |
| 9 | **SetupSheet & ToolCalibration** | Equipment/Maintenance | MEDIUM (40+ fields, 5 relations) | MEDIUM | Setup procedures, maintenance tracking | Equipment availability, setup time reduction |
| 10 | **IntegrationConfig** | System Integration | MEDIUM (20+ fields, 5 relations) | MEDIUM | ERP/system integration mgmt | Data synchronization, external system control |

## Impact Matrix

### These 3 Tables Enable Most MES Functions:
```
EngineeringChangeOrder + WorkflowDefinition/Instance + InspectionPlan
     ↓
  ~40% of critical MES capabilities unlocked
     ↓
  Add SOP + SPC/Sampling + FAI + Personnel
     ↓
  ~80% of core MES compliance requirements covered
```

## Effort vs Impact Analysis

| Tier | Tables | Effort | Impact | Coverage Gain |
|------|--------|--------|--------|---------------|
| **Must Have** | ECO, Workflow, Inspection | 40-50h | CRITICAL | +3-4% |
| **Should Have** | SOP, SPC/Sampling, FAI | 25-30h | HIGH | +2-3% |
| **Nice to Have** | Personnel, CNC, Setup, Integration | 20-25h | MEDIUM | +1-2% |
| **TOTAL** | All 10 + supporting | ~120h | 70%+ coverage | +7-10 tables |

## Regulatory Alignment

```
ISO 9001 Compliance:
  ├─ EngineeringChangeOrder (Change control)
  ├─ WorkflowDefinition (Procedure execution)
  ├─ StandardOperatingProcedure (Documented procedures)
  ├─ InspectionPlan (Quality planning)
  └─ PersonnelQualification (Competency management)

21 CFR Part 11 (Electronic Records):
  ├─ EngineeringChangeOrder (Record integrity)
  ├─ WorkflowDefinition (Audit trails)
  ├─ StandardOperatingProcedure (E-signatures)
  └─ SecurityEvent (Access logs)

Aerospace (AS9102, AS9120):
  ├─ FAIReport (First article inspection)
  ├─ InspectionPlan (Inspection requirements)
  ├─ CNCProgram (Program control)
  ├─ PersonnelQualification (Personnel certification)
  └─ ToolCalibrationRecord (Tool certification)

Medical Device (FDA):
  ├─ EngineeringChangeOrder (Design history)
  ├─ StandardOperatingProcedure (Process procedures)
  └─ InspectionPlan (Acceptance criteria)
```

## Quick Win Opportunities

1. **Highest ROI**: Document EngineeringChangeOrder + Workflow combo (enables change management & approvals)
2. **Fastest**: FAIReport + InspectionPlan (similar structure, reusable documentation patterns)
3. **Compliance Boost**: StandardOperatingProcedure (unlocks ISO 9001 documentation completeness)
4. **Technical Depth**: SPCConfiguration (specialized but high-value for quality teams)
5. **System Wide**: IntegrationConfig (enables better understanding of data flows)

## Recommended Documentation Sequence (Per Phase)

**Week 1-2:** Tables 1-3 (ECO, Workflow, Inspection)
**Week 3-4:** Tables 4-5 (SOP, SPC/Sampling)  
**Week 5:** Tables 6-7 (FAI, Personnel)
**Week 6+:** Tables 8-10 (CNC, Setup, Integration)

---

**Result**: 130+/186 tables documented (70%+) with maximum business value
