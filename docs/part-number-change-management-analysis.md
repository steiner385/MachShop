# Part Number Change Management: Architecture Analysis

## Executive Summary

This document analyzes two competing methodologies for managing part number changes in manufacturing execution systems (MES), particularly for complex assemblies like aircraft engines. The fundamental question: **Should design changes propagate through all affected assemblies, or should interface abstractions shield downstream assemblies from upstream changes?**

## The Core Debate

### Philosophy 1: Full Propagation (Strict Interchangeability)
**Principle:** Any change affecting form, fit, or function requires a new part number that cascades up the Bill of Materials (BOM).

### Philosophy 2: Interface Abstraction (Modular Design)
**Principle:** Define standardized interfaces; modules can change internally as long as interfaces remain stable.

---

## Research Findings

### 1. AS9100 Configuration Management Requirements

**Source:** AS9100 Rev D, Section 8.1.2

#### Key Requirements:
- **Configuration Identification:** Products must be properly identified with current part and revision numbers
- **Configuration Change Control:** Known configuration must be maintained when design changes occur
- **Part Number Change Rule:** When a repair part is no longer interchangeable with its previous version:
  - It SHALL be assigned a new part number
  - A new number SHALL be assigned to the next higher assembly
  - New numbers SHALL be assigned to ALL subsequent higher assemblies **up to the level where interchangeability is reestablished**

#### Interchangeability Criteria:
- **Form:** Appearance/physical characteristics
- **Fit:** Physical assembly capability
- **Function:** Performance, safety, reliability
- **Rule:** If you can't reach into a bin with both configurations and use them interchangeably, it's a part number change

---

### 2. Part Number vs. Revision Management

#### When to Use Revisions (Same Part Number):
- Minor updates that don't affect form, fit, or function
- Quality improvements maintaining full interchangeability
- Documentation corrections
- Incremental tracking (Rev A, Rev B, Rev C)

#### When to Require New Part Numbers:
- Any change affecting interchangeability
- Design modifications impacting downstream assemblies
- Material substitutions affecting performance
- Dimensional changes affecting fit

**Best Practice Guidance:** "When in doubt, change the part number, as this is always the safest decision."

---

### 3. The Cascade Problem

#### Issue:
When a component part number changes, it triggers cascading changes:

```
Component A (version 1.0) → Component A (version 2.0)
    ↓                               ↓
Subassembly B (version 1.0) → Subassembly B (version 2.0)
    ↓                               ↓
Assembly C (version 1.0)    → Assembly C (version 2.0)
    ↓                               ↓
Final Product (version 1.0) → Final Product (version 2.0)
```

**Impact:**
- "A lot of needless churn" in downstream systems (MRP/ERP)
- Configuration management complexity
- Documentation updates across multiple levels
- Inventory management challenges
- Supply chain confusion

---

### 4. Interface Control Documents (ICDs)

#### Purpose (per NASA/SAE AIR6181A):
- Establish and maintain compatibility between items with common boundaries
- Coordinate and control interfaces between interconnected systems
- Communicate design decisions to participating activities
- **Isolate changes within modules**

#### Engine Assembly Example (SAE AIR6181A):
- Electronic Propulsion Control System/Aircraft Interface Control
- Specifies functional and physical interface requirements
- Allows engine changes without aircraft redesign (if interface maintained)

#### Key Principle:
"Once an assembly and its drawings are finalized, form, fit and function should not be changed, as these are the very things interface control specifies."

---

### 5. Modular Design Strategy

#### Characteristics:
- **Functional partitioning** into discrete, scalable, reusable modules
- **Rigorous use of well-defined modular interfaces**
- **Industry standards for interfaces**
- **Standardized interfaces** enabling module interchange

#### Benefits:
- Changes "immediately reflected on every bill of materials upon release of the new item revision **without touching the parent assembly**"
- Economy of scale and stability
- Module variants can be configured without affecting fundamental parts

#### Engine Example:
"By creating standardized interfaces between fuel injection systems and cylinder heads, fuel types can be configured without affecting the engine's fundamental functional parts."

---

### 6. Substitution Groups & Alternate Parts

#### Interchangeability Types:

**Two-Way Interchangeable:**
- Part A can replace Part B
- Part B can replace Part A
- Default for all parts valid in same build position

**One-Way Interchangeable:**
- Part A (newer) can replace Part B (older)
- Part B (older) CANNOT replace Part A (newer)
- Used for progressive improvements
- MES systems enforce: can install same or higher interchangeability order, but not lower

#### Implementation:
- Part groups define interchangeable sets
- Authority/approval required (e.g., Honeywell engineering approved substitutions)
- Some MES systems import only primary part (alternates loaded manually)
- Other systems use PRIMARY/ALTERNATE columns

---

## Pros and Cons Analysis

### Approach 1: Full Propagation (Strict Part Number Changes)

#### Pros:
✅ **Absolute traceability** - every change tracked explicitly
✅ **Clear configuration control** - no ambiguity about what's installed
✅ **AS9100 compliant** by default
✅ **Safest approach** - eliminates interchangeability errors
✅ **Simplest logic** - clear rules, less judgment required
✅ **Audit-friendly** - inspectors can easily verify configurations

#### Cons:
❌ **Cascading changes** create "needless churn"
❌ **Administrative burden** - change orders for all assemblies
❌ **Inventory complexity** - multiple part numbers for similar items
❌ **Supply chain confusion** - many part numbers to manage
❌ **Documentation explosion** - drawings/specs for every variant
❌ **Legacy system compatibility** - old part numbers become obsolete
❌ **Cost** - engineering resources for change propagation

---

### Approach 2: Interface Abstraction (Modular Design)

#### Pros:
✅ **Change isolation** - modifications don't cascade unnecessarily
✅ **Reduced churn** - downstream systems remain stable
✅ **Flexibility** - easier to accommodate design improvements
✅ **Modularity** - components evolve independently
✅ **Efficiency** - fewer change orders, less documentation
✅ **Innovation-friendly** - encourages continuous improvement
✅ **Inventory simplification** - fewer part number variants

#### Cons:
❌ **Complexity** - requires sophisticated interface management
❌ **Rigor required** - interfaces must be carefully defined and maintained
❌ **Compliance risk** - must prove interchangeability for AS9100
❌ **Training** - personnel must understand substitution rules
❌ **System capability** - MES must support substitution groups
❌ **Configuration ambiguity** - "what's actually installed?"
❌ **Late discovery** - problems may surface during assembly
❌ **Authority management** - who approves interchangeability?

---

## Industry Best Practices

### 1. Hybrid Approach
Most mature aerospace manufacturers use a **hybrid strategy**:

- **Interface-driven for modules:** Stable interfaces between major systems (engine-to-aircraft, avionics-to-structure)
- **Strict propagation for critical items:** Safety-critical components, certified assemblies
- **Substitution groups for commodities:** Fasteners, standard parts, off-the-shelf components

### 2. Configuration Management Maturity

**Level 1 (Basic):** All changes propagate (safest but inefficient)
**Level 2 (Intermediate):** Substitution groups for approved alternates
**Level 3 (Advanced):** Interface control documents with modular boundaries
**Level 4 (Mature MBE):** Model-based enterprise with digital thread, interface specs in 3D models

### 3. Critical Success Factors

For interface abstraction to work effectively:

1. **Well-defined interfaces** - Clear ICD specifications
2. **Authority structure** - Engineering approval process for interchangeability
3. **MES capability** - System support for substitution groups, one-way/two-way interchangeability
4. **Training** - Personnel understand when to use which approach
5. **Audit trail** - Clear documentation of interchangeability decisions
6. **Where-used analysis** - Impact assessment tools in PLM/MES
7. **Quality gates** - Validation that interface compliance is maintained

---

## Recommendations for MachShop MES

### Strategic Direction: Hybrid Modular Architecture

**Core Principle:** Support both methodologies, with clear rules about when each applies.

### Phase 1: Foundation (L0)
**Build core capabilities:**

1. **Part Interchangeability Framework**
   - Define `PartInterchangeabilityGroup` model
   - Support two-way and one-way interchangeability
   - Engineering approval workflow for interchangeability declarations

2. **Interface Specification System**
   - Create `InterfaceControlDocument` model
   - Link interfaces to parts and assemblies
   - Version control for interface specifications

3. **Substitution Management**
   - Alternate part designations (PRIMARY/ALTERNATE)
   - Effectivity date ranges
   - Authority/approval tracking

### Phase 2: Automation (L1)
**Add intelligent decision support:**

1. **Change Impact Analysis**
   - "Where-used" queries across BOM structure
   - Automatic identification of affected assemblies
   - Recommendation: propagate or isolate?

2. **Interchangeability Validation**
   - Form/Fit/Function criteria checking
   - Interface compliance verification
   - Alert when changes break interchangeability

3. **Engineering Change Order (ECO) Workflow**
   - Smart ECO routing based on change type
   - Automatic cascade when needed
   - Interface boundary containment when possible

### Phase 3: Intelligence (L2)
**Leverage MBE capabilities:**

1. **Model-Based Interface Definition**
   - Integration with CAD systems
   - 3D interface specifications
   - Automatic interface compliance checking

2. **Digital Thread Integration**
   - UUID-based traceability (Issue #218)
   - STEP AP242 integration (Issue #220)
   - QIF measurement linkage (Issue #219)

3. **Predictive Impact Analysis**
   - Machine learning to predict change impact
   - Historical pattern analysis
   - Risk scoring for configuration changes

---

## Implementation Guidelines

### Decision Matrix: When to Propagate vs. Abstract

| Scenario | Approach | Rationale |
|----------|----------|-----------|
| Safety-critical component change | **Propagate** | Absolute traceability required |
| Certified assembly modification | **Propagate** | Regulatory compliance (FAA, EASA) |
| Material substitution affecting specs | **Propagate** | Performance/quality impact |
| Internal module improvement (interface unchanged) | **Abstract** | No downstream impact |
| Approved alternate part addition | **Abstract** | Interchangeability pre-validated |
| Commodity/standard part replacement | **Abstract** | Fungible components |
| Engine control system (with ICD) | **Abstract** | Interface-controlled module |
| Cosmetic change (no functional impact) | **Revision** | Not even new part number needed |

### Configuration Rules to Implement

1. **Default: Propagate**
   - When in doubt, change the part number and cascade
   - Safest approach for compliance

2. **Exception: Interface-Controlled**
   - IF interface specification exists AND
   - IF change maintains interface compliance AND
   - IF engineering approval granted
   - THEN allow module change without parent cascade

3. **Substitution Group Rules**
   - Two-way: Any part in group replaces any other
   - One-way: Higher interchangeability order replaces lower
   - MES enforces during work order execution

4. **Audit Trail Requirements**
   - Record WHY interchangeability was granted
   - Document WHO approved the decision
   - Track WHAT testing validated compatibility
   - Maintain WHEN effectivity applies

---

## Compliance Considerations

### AS9100 Requirements
- ✅ All part and revision changes documented
- ✅ Configuration identification maintained
- ✅ Traceability from raw material to final product
- ✅ Engineering approval for changes
- ✅ Can demonstrate interchangeability basis

**Key:** Interface abstraction is AS9100 compliant IF:
- Interchangeability is formally declared and approved
- Changes maintaining interfaces are documented
- Traceability shows what was actually built
- Effectivity dates properly managed

### FDA/Medical Device
If applicable, requires even stricter controls:
- Design History File (DHF) for all changes
- Validation that interchangeability doesn't affect safety/efficacy
- May require new 510(k) if "significant change"

### ITAR/EAR (Export Control)
- Technical data about interfaces may be export-controlled
- Substitution groups must maintain classification
- Cryptographic modules have special interface rules

---

## Risk Assessment

### Risks of Full Propagation Approach:
1. **Change avoidance** - Engineers avoid beneficial improvements due to administrative burden
2. **Configuration complexity** - Explosion of part numbers
3. **Supply chain strain** - Difficult to source many variants

### Risks of Interface Abstraction Approach:
1. **Hidden incompatibility** - Change looks OK but causes field failure
2. **Audit findings** - Inspector questions interchangeability basis
3. **Certification issues** - Regulator doesn't accept abstraction

### Mitigation Strategies:
1. **Clear governance** - Change control board with authority
2. **Validation gates** - Physical/functional testing of substitutions
3. **Training programs** - All stakeholders understand the rules
4. **Tool support** - MES enforces rules automatically
5. **Periodic audits** - Review interchangeability decisions quarterly
6. **Customer acceptance** - Aerospace customers approve approach

---

## Next Steps

### 1. Stakeholder Alignment
- [ ] Review this analysis with engineering leadership
- [ ] Present to quality/compliance team
- [ ] Discuss with customer base (aerospace OEMs)
- [ ] Confirm regulatory acceptability

### 2. Architecture Decisions
- [ ] Define interface control strategy
- [ ] Establish change control board
- [ ] Document configuration management policy
- [ ] Create interchangeability approval workflow

### 3. System Design
- [ ] Create GitHub issues for implementation
- [ ] Add database models (PartInterchangeabilityGroup, InterfaceControlDocument)
- [ ] Design ECO workflow with intelligent routing
- [ ] Implement change impact analysis

### 4. Validation
- [ ] Test with real engine assembly scenarios
- [ ] Validate AS9100 compliance
- [ ] Pilot with selected customers
- [ ] Measure effectiveness (cycle time, error rates)

---

## References

### Standards
- AS9100 Rev D - Quality Management Systems (Aerospace)
- ISO 10007 - Configuration Management Guidelines
- SAE AIR6181A - Electronic Propulsion Control System Interface Control Documents
- ASME Y14.24 - Interface Control Documentation

### Key Concepts
- Form, Fit, Function (FFF) - Interchangeability criteria
- Interface Control Document (ICD) - Boundary specifications
- Engineering Change Order (ECO) - Formal change process
- Product Lifecycle Management (PLM) - Configuration management system
- Model-Based Enterprise (MBE) - Digital thread approach

### Research Sources
- NASA Interface Management Guidelines (Section 6.3)
- OpenBOM blog: "Interchangeable Parts - New Part Number or Revision?"
- Beyond PLM: "Interchangeability, Revisions, and New Part Number"
- Engineering Documentation Control / Configuration Management Standards Manual

---

## Glossary

**SIN (Serial Interface Number):** Likely a proprietary term for interface position identifiers in engine assemblies; allows abstract reference to mounting points regardless of specific part installed.

**PPN (Part Position Number):** Likely a proprietary term for position-based identification in BOMs; abstracts specific part numbers behind interface specifications.

**Interchangeability:** Property allowing one part to replace another without affecting form, fit, or function.

**Two-Way Interchangeable:** Parts can replace each other bidirectionally.

**One-Way Interchangeable:** Newer part can replace older, but not vice versa.

**Cascade/Propagation:** Part number changes rippling up through parent assemblies.

**Interface Control Document (ICD):** Specification defining boundaries between modules.

**Effectivity:** Date or serial number range when a configuration applies.

**Where-Used Analysis:** Identifying all assemblies containing a specific part.

**Digital Thread:** Seamless flow of data throughout product lifecycle (MBE concept).

---

## Conclusion

The choice between full propagation and interface abstraction is not binary. **Mature aerospace manufacturers use a hybrid approach:**

- **Propagate by default** (safest, compliant)
- **Abstract at defined interfaces** (efficient, flexible)
- **Clear rules for which applies when** (governance)
- **Tool support to enforce rules** (MES capability)
- **Audit trail for all decisions** (traceability)

**Recommendation:** Build MachShop MES to support BOTH methodologies with clear decision criteria and automated enforcement. This provides:
- **Safety and compliance** through propagation when needed
- **Efficiency and flexibility** through abstraction when appropriate
- **Competitive advantage** through intelligent configuration management

The system should guide users to the right approach for each scenario, making it "easy to do the right thing."

---

*Document Version: 1.0*
*Date: 2025-10-30*
*Author: Architecture Analysis based on Industry Research*
*Status: For Review and Decision*
