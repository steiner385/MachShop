# GitHub Issue Prioritization Framework

## Overview

This document describes the automated prioritization framework for GitHub issues in the MES project. The framework ensures that features are built in a logical, foundational-first order, with core infrastructure implemented before dependent features.

## Philosophy

The framework is designed around these core principles:

1. **Foundation First**: Build core infrastructure (L0) before dependent features
2. **Dependency Awareness**: Never implement a feature until its dependencies are complete
3. **Strategic Alignment**: Prioritize features that align with current business goals
4. **Efficient Sequencing**: Balance quick wins with long-term foundational work
5. **Automation**: Minimize manual prioritization decisions through systematic scoring

## Foundation Levels

All 77 GitHub issues are categorized into 4 foundation levels:

### L0: Core Infrastructure
**Foundation Level 0** - Must be built first, enables everything else

Issues at this level provide fundamental capabilities that many other features depend on:
- Time Tracking Infrastructure (#46)
- Enterprise SSO & Authentication (#134, #133, #132, #131)
- Advanced RBAC Extensions (#127, #126, #125)

**Priority**: Highest - These issues get a foundation score of 100/100

### L1: Essential Capabilities
**Foundation Level 1** - Core business features that depend on L0

These are the primary operational capabilities of the MES:
- Time Tracking Operations (#47, #49, #51)
- Quality Management Foundation (#54, #55, #56, #57)
- Inventory & Material Management (#88, #90, #91, #92)
- Production Planning (#82, #83, #84, #85)
- Regulatory Compliance (#102, #103, #104, #105)

**Priority**: High - These issues get a foundation score of 66.67/100

### L2: Enhanced Features
**Foundation Level 2** - Advanced capabilities that extend L1

These features build upon the essential capabilities with advanced tools:
- Advanced Quality Management (#58, #98, #99, #100, #101)
- Equipment & Maintenance (#94, #95, #96, #97)
- Outside Processing (OSP) (#59, #60, #61, #62)
- Flexible MES Workflow (#40, #41, #43, #44, #45)

**Priority**: Medium - These issues get a foundation score of 33.33/100

### L3: Refinements & Advanced Tools
**Foundation Level 3** - Nice-to-have features, optimizations, and tools

These are valuable but not blocking other work:
- Advanced Time Tracking (#52, #53)
- Analytics & Reporting (#106, #107, #108, #109)
- Document Management Enhancements (#64-73)
- SDK & Extensibility (#74-81)
- Data Migration Tools (#31-39)

**Priority**: Lower - These issues get a foundation score of 0/100

## Scoring Algorithm

Each issue receives a priority score from 0-100 using a weighted formula:

```
Priority Score = (Foundation × 35%) + (Dependencies × 25%) + (Strategic × 20%) + (Business Value × 10%) + (Effort/Value × 10%)
```

### 1. Foundation Level Score (35% weight)

The most heavily weighted factor. Lower foundation levels get higher scores:

- **L0**: 100 points (3 - 0) × 33.33 = 100
- **L1**: 66.67 points (3 - 1) × 33.33 = 66.67
- **L2**: 33.33 points (3 - 2) × 33.33 = 33.33
- **L3**: 0 points (3 - 3) × 33.33 = 0

**Contribution to total**: 0-35 points

### 2. Dependency Status Score (25% weight)

Acts as a gate - issues with unresolved dependencies are automatically ineligible:

- **All dependencies resolved**: 100 points
- **Any dependency unresolved**: 0 points (issue becomes ineligible)

**Contribution to total**: 0 or 25 points

### 3. Strategic Alignment Score (20% weight)

Boosts issues that align with current strategic focus areas:

**Current Strategic Focus**:
- Time Tracking & Labor Costing
- Quality Management

**Scoring**:
- **Matches strategic focus**: 100 points
- **Does not match**: 50 points (still gets credit for business value)

**Contribution to total**: 10-20 points

### 4. Business Value Score (10% weight)

Direct customer impact and revenue potential (1-10 scale):

```
Business Value Score = business_value × 10
```

Example:
- Business value of 9/10 → 90 points → 9 points contribution
- Business value of 5/10 → 50 points → 5 points contribution

**Contribution to total**: 1-10 points

### 5. Effort/Value Ratio Score (10% weight)

Rewards high-value, low-effort "quick wins":

```
Effort/Value Score = min((business_value / effort_estimate) × 100, 100)
```

Example:
- Value 8, Effort 4 → (8/4) × 100 = 200 → capped at 100 → 10 points contribution
- Value 9, Effort 10 → (9/10) × 100 = 90 → 9 points contribution

**Contribution to total**: 0-10 points

## Example Score Calculation

Let's calculate the priority score for Issue #46 (Core Time Tracking Infrastructure):

**Metadata from config**:
- Foundation Level: L0
- Dependencies: None (all resolved)
- Strategic Focus: time_tracking ✓
- Business Value: 9/10
- Effort Estimate: 8/10

**Calculation**:

1. **Foundation Score**: (3 - 0) × 33.33 = **100** × 35% = **35.0 points**
2. **Dependency Score**: All resolved = **100** × 25% = **25.0 points**
3. **Strategic Score**: Matches focus = **100** × 20% = **20.0 points**
4. **Business Value**: 9 × 10 = **90** × 10% = **9.0 points**
5. **Effort/Value**: (9/8) × 100 = **112.5** (capped at 100) × 10% = **10.0 points**

**Total Priority Score**: 35.0 + 25.0 + 20.0 + 9.0 + 10.0 = **99.0 / 100**

This is an extremely high priority issue (L0, strategic focus, high value, good effort ratio).

## Using the Framework

### Automated Selection: `/implement-next-gh-issue`

The easiest way to use the framework is via the Claude Code slash command:

```
/implement-next-gh-issue
```

This command will:
1. Load the prioritization configuration
2. Check GitHub for issue status and dependency resolution
3. Calculate priority scores for all eligible issues
4. Present the highest-priority issue with detailed reasoning
5. Ask for your approval before proceeding

**Example output**:

```
## Next Recommended Issue

**Issue #47: Multi-Interface Time Clock System (Kiosk, Mobile, Embedded)**

**Category**: Time Tracking & Labor Costing
**Foundation Level**: L1 (Essential Capabilities)

**Priority Score**: 89.3/100

**Score Breakdown**:
- Foundation Level (35%): 23.3/35 (L1 - Essential capability)
- Dependencies (25%): 25.0/25 (All 1 dependencies resolved: #46 ✓)
- Strategic Alignment (20%): 20.0/20 (Matches strategic focus: time_tracking)
- Business Value (10%): 9.0/10 (Value: 9/10)
- Effort/Value Ratio (10%): 12.9/10 (Value 9 / Effort 7 = 1.29)

**Why This Issue?**
With the Core Time Tracking Infrastructure (#46) now complete, this issue is the logical next step to provide the primary time entry interface for shop floor operators. It unlocks time entry management (#51) and performance reporting (#53).

**Dependencies** (all resolved ✓):
- #46: Core Time Tracking Infrastructure & Configuration ✓

**Blocks/Unlocks** (2 issues):
- #51: Time Entry Management & Approvals
- #53: Performance Feedback & Time Reporting

**Estimated Effort**: 7/10
**Business Value**: 9/10

---

**Would you like me to proceed with implementing Issue #47?**
```

### Manual Review

You can also manually review the prioritization configuration:

1. **View all issues**: See `.github/issue-prioritization.yml`
2. **Check dependency tree**: Look at the `dependencies` and `blocks` fields
3. **Filter by category**: Search for specific category tags
4. **View foundation levels**: Group issues by `foundation_level`

### Adding New Issues: `/add-gh-issues`

The easiest way to create new GitHub issues and integrate them into the prioritization framework is with the automated command:

```
/add-gh-issues
```

This command provides a **guided wizard** that:
1. **Prompts you** to describe the capabilities or defects you want to create
2. **Systematically gathers** all required metadata for each issue:
   - Title and description
   - Category assignment
   - Foundation level (L0-L3)
   - Dependencies on other issues
   - Strategic focus alignment
   - Business value estimate (1-10)
   - Effort estimate (1-10)
   - Additional context
3. **Creates the GitHub issues** with proper labels
4. **Updates the prioritization config** (`.github/issue-prioritization.yml`)
5. **Updates dependency relationships** (adds to `blocks` fields of dependent issues)

**Example workflow**:
```
User: /add-gh-issues

Claude: Please describe the new capabilities or defects you'd like to create GitHub issues for...

User: I need to add support for real-time equipment monitoring and automated alerts when machines go down

Claude: [Asks questions about category, foundation level, dependencies, etc.]

User: [Answers questions]

Claude:
✅ Successfully created 1 issue and updated prioritization framework:
- Issue #135: Real-Time Equipment Monitoring & Alerts (L2, equipment_maintenance)

📊 Updated .github/issue-prioritization.yml with:
- Added 1 new issue
- Updated 2 dependency relationships

💡 Run `/implement-next-gh-issue` to see how this affects prioritization!
```

**Benefits**:
- **No manual YAML editing**: Reduces errors and ensures consistency
- **Guided process**: Helps you think through dependencies and prioritization
- **Automatic updates**: Keeps the framework synchronized with GitHub
- **Validation**: Ensures all required metadata is provided

## Maintenance Guide

### When to Update the Configuration

Update `.github/issue-prioritization.yml` when:

1. **New issues are created**: Add them to the config with appropriate metadata
2. **Business priorities change**: Adjust `strategic_focus` areas or `business_value` scores
3. **Dependencies are discovered**: Add new dependency relationships
4. **Issues are closed**: The framework will automatically ignore closed issues
5. **Effort estimates change**: Update `effort_estimate` as you learn more

### Adding a New Issue

**Recommended**: Use the `/add-gh-issues` command (see above) for the easiest experience.

**Manual Method**: If you need to manually add an issue to the configuration:

```yaml
- number: 999
  title: "Your New Feature"
  category: quality_management  # Choose appropriate category
  foundation_level: 2           # Determine foundation level (0-3)
  dependencies: [54, 55]        # List issue numbers this depends on
  strategic_focus: quality_management  # null or strategic area
  business_value: 7             # 1-10 scale
  effort_estimate: 6            # 1-10 scale
  blocks: []                    # Issues that depend on this one
  notes: "Additional context"
```

**Determining Foundation Level**:
- **L0**: Does this provide core infrastructure many features will need?
- **L1**: Is this a primary operational capability of the MES?
- **L2**: Does this extend or enhance L1 features?
- **L3**: Is this a refinement, optimization, or nice-to-have?

**Identifying Dependencies**:
- What existing features does this require to be complete?
- What infrastructure must be in place first?
- Can this be built independently?

### Updating Strategic Focus

As business priorities evolve, update the `strategic_focus` section in the config:

```yaml
strategic_focus:
  - time_tracking          # Current focus area
  - quality_management     # Current focus area
  # Add new focus areas as priorities change
```

Issues matching these areas get a 20-point priority boost.

### Adjusting Scoring Weights

If you want to change the importance of different factors, modify the `scoring_weights` section:

```yaml
scoring_weights:
  foundation_level: 35    # How much to favor foundational issues
  dependency_status: 25   # Dependency gate (keep at 25%)
  strategic_alignment: 20 # Strategic focus boost
  business_value: 10      # Direct business impact
  effort_value_ratio: 10  # Quick wins preference
```

**Note**: Weights must sum to 100.

## Dependency Graph Visualization

Here's a high-level view of the dependency relationships:

```
L0 (Core Infrastructure)
├── #46 Time Tracking Infrastructure
│   ├── #47 Multi-Interface Time Clock (L1)
│   │   ├── #51 Time Entry Management (L1)
│   │   │   └── #53 Performance Reporting (L3)
│   │   └── #53 Performance Reporting (L3)
│   ├── #49 Machine-Based Time Tracking (L1)
│   └── #52 External T&A Integration (L3)
│
├── #134 Unified SSO Management
│   ├── #133 Azure AD Integration (L0)
│   ├── #132 OAuth/OIDC Integration (L0)
│   └── #131 SAML Integration (L0)
│
├── #127 Permission Usage Tracking (L0)
├── #126 Time-Based Permissions (L0)
└── #125 Role Templates (L0)

L1 (Essential Capabilities)
├── Quality Foundation
│   ├── #54 Cause Code System
│   │   ├── #56 CAPA Tracking (L1)
│   │   │   ├── #57 8D Problem Solving (L1)
│   │   │   │   └── #58 Quality Analytics (L2)
│   │   │   └── #58 Quality Analytics (L2)
│   │   └── #58 Quality Analytics (L2)
│   └── #55 Enhanced NCR Workflow
│       ├── #56 CAPA Tracking (L1)
│       ├── #98 Statistical Process Control (L2)
│       │   ├── #99 PPAP & APQP (L2)
│       │   └── #101 Control Plans (L2)
│
├── Inventory & Material
│   ├── #88 Inventory Management
│   │   ├── #90 Lot Tracking (L1)
│   │   │   └── #105 Product Genealogy (L1)
│   │   ├── #91 Transaction Engine (L1)
│   │   │   └── #89 Warehouse Management (L3)
│   │   ├── #92 Barcode & RFID (L1)
│   │   └── #84 MRP (L1)
│
└── Production Planning
    ├── #82 Production Scheduler
    │   ├── #83 Capacity Planning (L1)
    │   │   └── #87 What-If Analysis (L3)
    │   ├── #85 Master Production Schedule (L1)
    │   │   └── #86 Demand Forecasting (L3)
    │   └── #87 What-If Analysis (L3)
```

## Categories

Issues are organized into 14 categories:

| Category | Count | Focus Areas |
|----------|-------|-------------|
| Time Tracking & Labor Costing | 6 | Shop floor time tracking, labor costing ⭐ Strategic Focus |
| Quality Management | 11 | NCR, CAPA, SPC, PPAP, compliance ⭐ Strategic Focus |
| Enterprise SSO & Authentication | 4 | Single sign-on, identity management |
| Advanced RBAC & Security | 3 | Role-based access control enhancements |
| Inventory & Material Management | 5 | Inventory, warehouse, lot tracking |
| Production Planning & Scheduling | 6 | Scheduling, capacity, MRP |
| Regulatory Compliance | 4 | AS9100, FDA, ITAR compliance |
| Equipment & Maintenance | 4 | Asset management, calibration |
| Outside Processing (OSP) | 4 | Supplier and farmout management |
| Flexible MES Workflow | 5 | Configurable shop floor execution |
| Analytics & Reporting | 4 | BI, dashboards, reporting |
| Document Management | 10 | Work instructions, media |
| SDK & Extensibility | 7 | Platform extensibility |
| Data Migration Tools | 8 | Customer onboarding utilities |

## FAQ

### Why is my high-value issue not being suggested?

Check these possibilities:
1. **Dependencies not resolved**: The issue may have dependencies that are still open
2. **Foundation level**: L3 issues will always score lower than L0-L1 issues
3. **Not strategic focus**: Issues outside time_tracking/quality_management get lower scores
4. **Issue is closed**: The framework only considers open issues

### Can I override the automatic selection?

Yes, you can always manually specify an issue to implement:
```
/implement-gh-issue <number>
```

The prioritization framework is a recommendation tool, not a hard constraint.

### How do I re-prioritize a specific area?

You have several options:
1. **Add to strategic focus**: Update the `strategic_focus` list in the config
2. **Increase business value**: Adjust the `business_value` score for those issues
3. **Lower foundation level**: If appropriate, reclassify issues to a lower foundation level
4. **Adjust dependencies**: Remove artificial dependencies if they're not truly blocking

### What if no issues are eligible?

This means all remaining issues have unresolved dependencies. Check:
1. Are there issues that should be closed but aren't?
2. Are there dependency relationships that are incorrect?
3. Do you need to complete one of the blocking issues first?

### How often should I update the configuration?

**At minimum**:
- When creating new GitHub issues (add them to config)
- When business priorities shift (update strategic focus)
- Monthly review to ensure accuracy

**Optionally**:
- After completing major features (update what they unblock)
- When effort estimates change significantly
- When new dependencies are discovered

## Integration with Existing Roadmap

The prioritization framework complements (but doesn't replace) the existing `MES_IMPLEMENTATION_ROADMAP.md`. The roadmap defines strategic phases, while this framework provides tactical issue-by-issue prioritization.

**How they work together**:
- **Roadmap**: Defines 8 major phases and their order
- **Framework**: Ensures daily implementation respects dependencies and foundation layers
- **Flexibility**: Framework can adapt to changing priorities while roadmap provides north star

## Conclusion

This prioritization framework ensures that the MES is built on a solid foundation, with infrastructure preceding dependent features, while maintaining flexibility for strategic priorities and quick wins.

By automating the selection process, we reduce decision fatigue and ensure consistent, logical feature sequencing throughout the development process.

For questions or suggestions about the framework, please update this document or discuss in team meetings.
