---
description: Automatically select and implement the next highest-priority GitHub issue based on the prioritization framework
---

You are going to help implement the next GitHub issue based on the prioritization framework defined in `.github/issue-prioritization.yml`.

Follow these steps:

## Step 1: Load the Prioritization Configuration
Read the file `.github/issue-prioritization.yml` to get:
- All issue definitions with their metadata
- Scoring weights
- Strategic focus areas
- Dependency mappings

## Step 2: Check Issue Status and Dependencies
For each issue in the configuration:
1. Use `gh issue view <issue_number> --json state,number` to check if the issue is still open
2. For each issue's dependencies, check if they are closed (resolved)
3. An issue is **eligible** only if:
   - The issue itself is still OPEN
   - ALL of its dependencies are CLOSED (or it has no dependencies)

## Step 3: Calculate Priority Scores
For each **eligible** issue, calculate a priority score using the weighted formula:

```
Priority Score = (Foundation Score × 0.35) + (Dependency Score × 0.25) + (Strategic Score × 0.20) + (Business Value Score × 0.10) + (Effort/Value Score × 0.10)
```

Where:
- **Foundation Score**: `(3 - foundation_level) × 33.33` (L0=100, L1=66.67, L2=33.33, L3=0)
- **Dependency Score**: 100 if all dependencies are resolved, 0 otherwise (acts as a gate)
- **Strategic Score**: 100 if the issue matches a strategic focus area (time_tracking or quality_management), 50 otherwise
- **Business Value Score**: `business_value × 10` (scale 1-10 becomes 10-100)
- **Effort/Value Score**: `(business_value / effort_estimate) × 100` capped at 100 (rewards high value / low effort)

## Step 4: Select the Highest Priority Issue
- Sort all eligible issues by priority score (descending)
- Select the top-ranked issue

## Step 5: Present the Recommendation
Present the selected issue in this format:

```markdown
## Next Recommended Issue

**Issue #<number>: <title>**

**Category**: <category_name>
**Foundation Level**: L<level> (<level_description>)

**Priority Score**: <total_score>/100

**Score Breakdown**:
- Foundation Level (35%): <score>/35 (L<level> - <rationale>)
- Dependencies (25%): <score>/25 (All <n> dependencies resolved)
- Strategic Alignment (20%): <score>/20 (<is_strategic_focus>)
- Business Value (10%): <score>/10 (Value: <value>/10)
- Effort/Value Ratio (10%): <score>/10 (Value <value> / Effort <effort> = <ratio>)

**Why This Issue?**
<Explain in 2-3 sentences why this is the logical next step, what it unlocks, and how it builds on existing foundation>

**Dependencies** (all resolved ✓):
<If dependencies exist, list them with checkmarks>

**Blocks/Unlocks** (<n> issues):
<List issues that will become eligible after this is completed>

**Estimated Effort**: <effort>/10
**Business Value**: <value>/10

---

**Would you like me to proceed with implementing Issue #<number>?**
```

## Step 6: Wait for User Approval
Ask the user if they want to proceed with implementing this issue. If they say yes, then invoke the existing `/implement-gh-issue <number>` command to begin implementation.

If the user says no, ask if they want to:
1. See the next top 3 issues
2. Filter by a specific category
3. Manually specify an issue number

---

**IMPORTANT NOTES**:
- Only consider issues that are OPEN in GitHub
- NEVER suggest an issue that has unresolved dependencies
- If NO issues are eligible (all have dependencies or are closed), inform the user and suggest they review the prioritization config or close resolved issues
- The priority score heavily favors foundational (L0) issues, as requested by the user
