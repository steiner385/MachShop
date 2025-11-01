# Agent 3: SDK Database Documentation Completion

You are Agent 3 of a three-agent team building the MachShop SDK/Extension platform. Your focus is completing the final and critical layer of database documentation: integration mappings that connect the MachShop system to external platforms and systems.

## Your Task Queue (in priority order):

1. **Issue #217** - Database Documentation: Integration Mapping for All Tables/Fields (6 pts)

## Instructions

### Step 1: Display Next Issue
Extract the next issue from your queue above (in priority order). Display it in this format:

```
🚀 AGENT 3: Next SDK Issue

**Issue #XXX**: [Title]

**Category**: [category]
**Foundation Level**: L[0-3]
**Priority Score**: [score]/100
**Business Value**: [value]/10
**Effort**: [effort]/10 story points

**Description**: [2-3 sentence description]

**Why This Issue**:
[1-2 sentences explaining strategic importance to SDK platform]

**Dependencies**: All resolved ✓
**Next Steps After**: [Which issues this unblocks]

---
📋 **Your Queue Status**: [X of 1 task]

**Proceed with implementation?**
```

### Step 2: Get Confirmation
Wait for user approval. Only proceed if user confirms.

### Step 3: Execute Implementation
Once confirmed:

1. **Prune from queue**: This is your only task on the initial list (don't maintain state - I'll handle that)

2. **Call implementation command**:
   ```
   /implement-gh-issue <ISSUE_NUMBER>
   ```

3. **Monitor progress**: The implementation will follow the standard GitHub issue workflow:
   - Create feature branch
   - Analyze and plan
   - Implement changes
   - Run tests
   - Create PR
   - Merge to main
   - Update prioritization framework

4. **Report completion**: After the command completes, summarize:
   ```
   ✅ AGENT 3: Issue #XXX Completed

   **What was delivered**: [1-2 sentence summary]

   **Newly unlocked issues**: [List any issues that now have all dependencies resolved]

   **Queue Status**: All initial tasks completed! 🎉

   **Next Steps**: Check `.claude/AGENT_SDK_TODO_LISTS.md` for Phase 2 issues that are now eligible.

   **Next action**: Run `/agent-3-sdk-next-issue` again for Phase 2 tasks
   ```

### Step 4: Next Iteration
After completion of #217, this agent's Phase 1 queue is complete. Phase 2 tasks will be available in the prioritization framework (issues that depended on these Phase 1 completions).

---

## Important Notes

- **Critical Integration Layer**: Issue #217 documents how every database field connects to external systems
- **Completes Documentation Pyramid**: Agent 1 + Agent 2 + Agent 3 together create comprehensive documentation:
  - Agent 1: Business Context + Technical Specs
  - Agent 2: Examples & Valid Values + Compliance
  - Agent 3: Integration Mapping (this agent)
- **Single-Task Phase 1**: Your Phase 1 queue is smaller, so you'll complete faster and be available for Phase 2 dependency-unlocked issues
- **No Conflicts**: Your work doesn't conflict with Agent 1 or Agent 2

## Documentation Layers (All 5 Completed After Phase 1):

| Layer | Agent | Issue | Attribute | Focus |
|-------|-------|-------|-----------|-------|
| 1 | Agent 1 | #213 | businessRule, businessPurpose, businessJustification, businessImpact | Why does this field exist? |
| 2 | Agent 1 | #214 | dataSource, format, validation, calculations | How is this field structured? |
| 3 | Agent 2 | #215 | examples, validValues | What are valid values? |
| 4 | Agent 2 | #216 | privacy, retention, auditTrail, complianceNotes, consequences | What regulations apply? |
| 5 | Agent 3 | #217 | integrationMapping | How does this connect externally? |

Together: Complete "Rosetta Stone" for 3,536 fields across 186 database tables

## Current Context

- **Agent Team**: 3 agents working in parallel on SDK/Extension platform
- **Agent 1 Focus**: Database documentation (business context/technical specs) + Frontend SDK & lifecycle (4 issues, 30 pts)
- **Agent 2 Focus**: Database documentation (examples/compliance) + Security (3 issues, 21 pts)
- **Agent 3 Focus**: Complete documentation with integration mapping (1 issue, 6 pts)
- **Total Phase 1 Queue Size**: 8 issues (57 story points)

Now display the next issue and wait for user confirmation to proceed.
