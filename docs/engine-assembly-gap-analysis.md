# Jet Engine Assembly - MES Capability Gap Analysis

## Executive Summary

This analysis assesses the MachShop MES system's readiness for supporting jet engine final assembly operations. While the system has strong foundations for component manufacturing (machining, composites, additive), engine assembly introduces unique complexities that require additional capabilities.

**Key Finding:** MachShop has ~60% of required capabilities. Major gaps exist in kitting, test cell integration, digital torque management, and assembly-specific serialization.

---

## Research Context

### Engine Assembly Complexity
- Boeing 747 engine: **~25,000 parts**
- Assembly timeline: **~2 years** (after 5 years design/testing)
- Regulatory requirements: FAA AC 43-207, AS9100, life-limited parts traceability
- Multi-level BOMs with complex dependencies and spatial constraints

### Critical Differences from Component Manufacturing
1. **Material Staging**: Components arrive from multiple suppliers; must be kitted and staged
2. **Assembly Sequence**: Strict ordering constraints (you can't install compressor before fan case)
3. **Torque Sequences**: Bolts must be tightened in specific patterns with precise torque values
4. **Test Integration**: Engines undergo acceptance testing in test cells before delivery
5. **Build Records**: Complete electronic build books documenting every step
6. **Module Serialization**: Major modules (fan, compressor, turbine, etc.) independently serialized

---

## Current MachShop Capabilities (STRENGTHS ✅)

### 1. Core Data Models
- ✅ **BOMItem model**: Parent/component relationships, effectivity dates, ECO tracking
- ✅ **WorkOrder system**: Comprehensive work order management with operations
- ✅ **Routing system**: Multi-step routing with operations and steps
- ✅ **SerializedPart model**: Serialization and traceability foundation
- ✅ **Material models**: MaterialLot, MaterialTransaction, Inventory tracking
- ✅ **Quality system**: NCR, QualityInspection, QIF measurement tracking

### 2. Traceability Infrastructure
- ✅ MaterialLotGenealogy for material traceability
- ✅ SerializedPart with parent/child relationships
- ✅ Material transaction history
- ✅ Work order operation tracking

### 3. Manufacturing Execution
- ✅ Operation-level execution tracking
- ✅ Labor and machine time tracking
- ✅ Process data collection
- ✅ Equipment integration

---

## CRITICAL GAPS for Engine Assembly (MISSING ❌)

### Gap #1: Kitting & Material Staging System
**Status:** ❌ NOT IMPLEMENTED

**What's Missing:**
- No Kit or KitItem models
- No material staging locations or zones
- No multi-level trial kitting (BOM-driven kit generation)
- No kit status tracking (staged, issued, partially consumed, returned)
- No kit shortage identification and resolution
- No vendor-specific kitting (pre-kitted from suppliers)

**Impact:** **CRITICAL**
- Assembly workers waste time locating parts
- Risk of using wrong components (compatibility errors)
- Cannot efficiently manage 25,000+ parts for engine assembly
- No visibility into material readiness for work orders

**Industry Requirement:**
> "Kitting is a collection of parts, materials, specific tools and equipment required to complete the tasks described on a work order. Proper tools and parts available at the correct time and in the correct location reduces material handling complexity." - Aerospace kitting best practices

**Use Case Example:**
- Engine assembly work order for GE9X
- BOM contains 25,000 parts from 200+ suppliers
- System should auto-generate kits by assembly stage (fan module kit, combustor kit, turbine kit)
- Each kit staged in secure location near assembly cell
- Scanner verifies all parts present before work starts

---

### Gap #2: Digital Torque Management & Sequence Control
**Status:** ❌ NOT IMPLEMENTED

**What's Missing:**
- No TorqueSpecification model
- No torque sequence tracking (e.g., "tighten bolts in star pattern 1-5-3-7-2-6-4-8")
- No integration with digital torque wrenches
- No real-time torque value capture and verification
- No visual guidance for bolt tightening sequences
- No alerts when torque out of specification

**Impact:** **CRITICAL**
- Quality risk: Improper bolt tensioning can cause catastrophic engine failure
- Compliance risk: AS9100 requires torque documentation
- No traceability of actual torque values applied
- Manual paper-based torque recording is error-prone

**Industry Requirement:**
> "Digital work instructions visually guide workers through the correct sequence of components fastening. Digital torque wrenches integrate with work instruction software with real-time monitoring and data capture, documenting required torque down to the last decimal points." - Digital assembly best practices

**Use Case Example:**
- Turbine disk assembly operation
- 48 bolts must be torqued to 175 ± 2 Nm
- Sequence: Star pattern in 3 passes (30%, 70%, 100%)
- Digital wrench automatically captures actual torque for each bolt
- System alerts if any value out of spec
- Electronic signature on completion

---

### Gap #3: Test Cell Integration & Acceptance Testing
**Status:** ❌ NOT IMPLEMENTED

**What's Missing:**
- No TestRun or TestCell models
- No engine performance test tracking
- No test cell run data capture (thrust, fuel flow, temperatures, vibration)
- No acceptance criteria validation
- No correlation with build records
- No test cell scheduling

**Impact:** **CRITICAL**
- Cannot verify engine meets performance specifications
- No integration between assembly data and test results
- Manual correlation between work order and test results
- Regulatory requirement: FAA AC 43-207 compliance

**Industry Requirement:**
> "Production acceptance tests on new or freshly overhauled engines verify clearly defined performance parameters. The main reason to test an engine in a test cell is to prove that the engine is capable of providing the minimum required certified engine thrust." - FAA AC 43-207

**Use Case Example:**
- Engine serial #12345 completes final assembly
- System schedules test cell run
- Test cell data acquisition system records:
  - Takeoff thrust: 84,500 lbf (spec: 84,000 ± 1,000)
  - Cruise SFC: 0.585 lb/lbf/hr (spec: < 0.59)
  - EGT margin: +48°C (spec: > +25°C)
  - Vibration: 0.15 mils (spec: < 0.2)
- All parameters green → engine accepted
- Test results permanently linked to work order/serial number

---

### Gap #4: Electronic Build Book / Assembly Build Record
**Status:** ⚠️ PARTIAL (has work instructions, but not comprehensive build book)

**What's Missing:**
- No comprehensive BuildRecord model
- No as-built configuration documentation
- No deviation tracking from build-to-print
- No integrated sign-off workflow per assembly step
- No photo/video capture during critical operations
- No automated build book generation

**Impact:** **HIGH**
- Regulatory requirement: AS9100 requires complete build records
- Customer requirement: Airlines demand full build documentation
- Difficult to prove conformance to engineering drawings
- Manual build book creation is time-consuming and error-prone

**Industry Requirement:**
> "Records should include information to support documentation that may be helpful in making a final determination as to the airworthiness and eligibility of the part. Complete build records are required for engine certification." - FAA Part 43

**Use Case Example:**
- Turbine section assembly
- Each blade installation documented:
  - Blade serial number
  - Position in disk
  - Torque values
  - Inspector signature
  - Photo of installation
- System auto-generates electronic build book
- PDF export for customer delivery with engine

---

### Gap #5: Assembly Tooling & Fixture Management
**Status:** ⚠️ PARTIAL (has ToolDrawing, ToolMaintenance, but missing fixture/cell management)

**What's Missing:**
- No Fixture or AssemblyCell models
- No tooling assignment to operations
- No fixture calibration requirements
- No work cell layout management
- No tooling availability checking
- No determinate assembly tooling support

**Impact:** **MEDIUM-HIGH**
- Large, low-stiffness assemblies require rigid fixtures
- Tooling must be assigned to operations before work starts
- Calibration traceability required for AS9100
- Cannot optimize work cell layouts for takt time

**Industry Requirement:**
> "Assembly tooling is essential equipment in aircraft production. The large size, relative low stiffness, and high positional tolerances required for aircraft components require rigid fixed tooling to maintain precision part relationships over time." - Aerospace assembly best practices

**Use Case Example:**
- Fan case assembly operation
- Requires:
  - Fan case fixture (ID: FX-1234, Cal due: 2025-12-01)
  - Alignment jig (ID: JIG-5678, Cal due: 2025-11-15)
  - Lifting tooling (ID: LIFT-9012, Load test current)
- System verifies all tools calibrated and available
- Prevents operation start if tooling not ready

---

### Gap #6: Life-Limited Parts (LLP) Tracking
**Status:** ⚠️ PARTIAL (has serialization, but missing LLP-specific functionality)

**What's Missing:**
- No LLP designation on parts
- No "back-to-birth" (BtB) traceability
- No time/cycles tracking from first installation
- No LLP retirement tracking
- No LLP certification documentation
- No automated LLP expiration alerts

**Impact:** **CRITICAL**
- Safety-critical: LLPs must be retired at specified intervals
- Commercial requirement: Airlines require BtB traceability for LLPs
- Regulatory: IATA, FAA guidance on LLP tracking
- Liability: Failure to track LLPs can cause catastrophic failures

**Industry Requirement:**
> "Back to birth (BtB) trace provides unbroken or complete trace documentation showing the aircraft part's times and cycles, installation, removal, and repair history from when it was first manufactured, and is commonly used to track life-limited parts for engines. Commercial practice has evolved such that back-to-birth traceability is a de facto requirement for U.S. transactions in life-limited parts." - IATA LLP Traceability Standard

**Use Case Example:**
- Turbine disk (P/N: TD-9876, S/N: 123456)
- Designated as LLP: 20,000 cycles or 15 years
- Current status:
  - First installed: 2020-01-15
  - Total cycles: 5,432
  - Remaining life: 14,568 cycles (73%)
  - Next inspection: 10,000 cycles
- System alerts at 80%, 90%, 95% of life limit
- Automatic retirement at limit

---

### Gap #7: Assembly Sequence Constraints & Validation
**Status:** ❌ NOT IMPLEMENTED

**What's Missing:**
- No spatial constraint modeling (can't install A until B is installed)
- No tooling access constraints
- No assembly sequence validation
- No work cell capacity modeling
- No takt time balancing
- No parallel assembly stream management

**Impact:** **MEDIUM-HIGH**
- Risk of operations performed out of sequence
- Inefficient assembly line balancing
- Cannot detect physical conflicts until assembly attempt
- Difficulty optimizing parallel assembly streams

**Industry Requirement:**
> "Aircraft assembly operations face multiple constraints including job sequencing constraints, resource constraints, and spatial constraints that make production planning highly challenging. Managing assembly sequence involves addressing assembly variations and the means by which parts are fastened." - Assembly line balancing research

**Use Case Example:**
- Engine assembly has 3 parallel streams:
  - Stream 1: Fan module (cells A1-A5)
  - Stream 2: Core module (cells B1-B8)
  - Stream 3: Turbine module (cells C1-C6)
- Final integration: Fan + Core + Turbine
- System models:
  - Sequence constraints (fan case before fan blades)
  - Spatial constraints (cannot access aft bolts after front cover installed)
  - Resource constraints (only 2 certified turbine assemblers)
  - Takt time: 3 days per cell

---

### Gap #8: Multi-Level BOM Visualization & Explosion
**Status:** ⚠️ PARTIAL (has BOMItem relationships, but missing visualization/explosion tools)

**What's Missing:**
- No graphical BOM tree visualization
- No BOM explosion/implosion queries
- No "where-used" across multiple levels
- No BOM comparison tools (as-designed vs. as-built)
- No effectivity date visualization
- No phantom part support

**Impact:** **MEDIUM**
- Difficult to visualize 10+ level deep BOMs
- Manual effort to trace component usage
- Cannot easily compare alternate BOMs
- Limited support for complex assemblies

**Industry Requirement:**
> "A multi-level bill of materials (BOM) lists assemblies, components, and parts required to make a product in a parent-child, top-down method. Aerospace companies like Boeing deal with intricate assemblies and thousands of parts; implementing multi-level BOMs helps manage components efficiently while tracking revisions and substitutions." - Multi-level BOM best practices

---

### Gap #9: Serialized Sub-Assembly Management
**Status:** ⚠️ PARTIAL (has SerializedPart, but missing module-level independence)

**What's Missing:**
- No independent serialization for major modules
- No module interchange tracking (fan module S/N ABC123 replaced with S/N XYZ789)
- No module configuration management
- No module-level build records
- No module test history independent of parent assembly

**Impact:** **HIGH**
- Cannot track major module changes/swaps
- FAA requirement: "Major engine modules that can be changed independently in service must be suitably identified"
- Loss of configuration visibility when modules swapped
- Difficulty managing module-level repairs

**Industry Requirement:**
> "Major engine modules that can be changed independently in service must be suitably identified so as to ensure traceability of parts and to enable proper control over the interchangeability of such modules." - EASA CS-E, FAA regulations

**Use Case Example:**
- Engine S/N: ENG-12345 consists of:
  - Fan module S/N: FAN-98765
  - Compressor module S/N: CMP-54321
  - Turbine module S/N: TRB-11111
  - Combustor S/N: CMB-22222
- During service, turbine module TRB-11111 replaced with TRB-33333
- System must:
  - Track module swap
  - Maintain independent module histories
  - Update engine configuration
  - Preserve traceability for both modules

---

### Gap #10: Kit Shortage Resolution Workflow
**Status:** ❌ NOT IMPLEMENTED

**What's Missing:**
- No automated shortage identification
- No shortage notification workflow
- No alternate part suggestion
- No expedite/rush order workflow
- No partial kit release capability
- No supplier coordination for missing components

**Impact:** **MEDIUM-HIGH**
- Assembly delays waiting for parts
- No proactive shortage detection
- Manual coordination with procurement
- Cannot start assembly with partial kits

**Use Case Example:**
- Work order WO-54321 for engine assembly
- Kitting process identifies:
  - 24,987 of 25,000 parts available
  - Missing: 13 bolts (P/N: BOLT-1234)
- System:
  - Notifies material planner
  - Checks if alternate part exists (substitute approved)
  - Escalates if on critical path
  - Provides partial kit option (proceed with available work)

---

## Summary of Gaps

| Capability | Current Status | Priority | Complexity | Business Impact |
|------------|---------------|----------|------------|-----------------|
| Kitting & Material Staging | ❌ Missing | **L0** | High | **CRITICAL** |
| Digital Torque Management | ❌ Missing | **L0** | Medium | **CRITICAL** |
| Test Cell Integration | ❌ Missing | **L1** | High | **CRITICAL** |
| Electronic Build Book | ⚠️ Partial | **L0** | Medium | **HIGH** |
| Tooling/Fixture Management | ⚠️ Partial | **L1** | Medium | **MEDIUM-HIGH** |
| Life-Limited Parts (LLP) | ⚠️ Partial | **L0** | Medium | **CRITICAL** |
| Assembly Sequence Constraints | ❌ Missing | **L2** | High | **MEDIUM-HIGH** |
| Multi-Level BOM Tools | ⚠️ Partial | **L2** | Medium | **MEDIUM** |
| Serialized Module Management | ⚠️ Partial | **L1** | Medium | **HIGH** |
| Kit Shortage Resolution | ❌ Missing | **L1** | Medium | **MEDIUM-HIGH** |

---

## Recommended Prioritization

### Phase 1: L0 Foundation (MUST HAVE)
1. **Kitting & Material Staging System** - Cannot do engine assembly without this
2. **Digital Torque Management** - Quality/safety critical
3. **Life-Limited Parts Tracking** - Regulatory/safety critical
4. **Electronic Build Book** - Regulatory requirement

### Phase 2: L1 Essential (SHOULD HAVE)
5. **Test Cell Integration** - Required for engine acceptance
6. **Tooling/Fixture Management** - Operational efficiency
7. **Serialized Module Management** - Configuration control
8. **Kit Shortage Resolution** - Operational efficiency

### Phase 3: L2 Enhanced (NICE TO HAVE)
9. **Assembly Sequence Constraints** - Optimization
10. **Multi-Level BOM Visualization** - User experience

---

## Estimated Development Effort

| Phase | Issues | Effort (Story Points) | Timeline |
|-------|--------|----------------------|----------|
| Phase 1 (L0) | 4 issues | ~32-38 points | 8-10 sprints |
| Phase 2 (L1) | 4 issues | ~28-32 points | 7-8 sprints |
| Phase 3 (L2) | 2 issues | ~14-16 points | 3-4 sprints |
| **TOTAL** | **10 issues** | **~74-86 points** | **~18-22 sprints** |

---

## Business Case

### Without These Capabilities:
- ❌ Cannot efficiently support engine assembly operations
- ❌ Manual workarounds create quality/compliance risks
- ❌ Competitive disadvantage vs. specialized engine MES systems
- ❌ High risk of assembly errors with 25,000+ parts
- ❌ Regulatory compliance challenges (AS9100, FAA)

### With These Capabilities:
- ✅ **Market expansion**: Serve engine OEMs and Tier 1 suppliers
- ✅ **Competitive differentiation**: Few MES systems support both component mfg AND final assembly
- ✅ **Higher ASP**: Engine assembly customers are premium segment
- ✅ **Stickiness**: Customers unlikely to switch once integrated
- ✅ **Reference accounts**: GE, P&W, Rolls-Royce, Safran are marquee names

---

## Next Steps

1. **Validate priorities** with engine assembly subject matter experts
2. **Create GitHub issues** for each gap (detailed requirements)
3. **Engage potential customers** for early validation
4. **Build Phase 1 (L0)** - foundation capabilities
5. **Beta test** with friendly engine assembly customer
6. **Scale to Phase 2/3** based on market feedback

---

*Analysis Date: 2025-10-30*
*Author: MES Capability Assessment*
*Status: For Review and GitHub Issue Creation*
