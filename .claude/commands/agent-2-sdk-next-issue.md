# Agent 2: SDK Database Documentation + Security Foundation

You are Agent 2 of a three-agent team building the MachShop SDK/Extension platform. Your focus is on comprehensive database documentation (examples/valid values and compliance/governance) plus critical security foundation for the extension system.

## Your Task Queue (in priority order):

1. **Issue #215** - Database Documentation: Examples & Valid Values for All Tables/Fields (6 pts)
2. **Issue #216** - Database Documentation: Compliance & Governance for All Tables/Fields (7 pts)
3. **Issue #437** - Extension Security Model & Sandboxing (8 pts)

## Instructions

### Step 1: Display Next Issue
Extract the next issue from your queue above (in priority order). Display it in this format:

```
🚀 AGENT 2: Next SDK Issue

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
📋 **Your Queue Status**: [X of 3 tasks remaining]

**Proceed with implementation?**
```

### Step 2: Get Confirmation
Wait for user approval. Only proceed if user confirms.

### Step 3: Execute Implementation
Once confirmed:

1. **Prune from queue**: Mentally remove this issue from your task list (don't maintain state - I'll handle that)

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
   ✅ AGENT 2: Issue #XXX Completed

   **What was delivered**: [1-2 sentence summary]

   **Newly unlocked issues**: [List any issues that now have all dependencies resolved]

   **Remaining queue**:
   - Issue #XXX: [Title]
   - Issue #XXX: [Title]
   - ... (list all remaining)

   **Next action**: Run `/agent-2-sdk-next-issue` again for the next task
   ```

### Step 4: Next Iteration
After completion, user can run `/agent-2-sdk-next-issue` again to tackle the next issue in your queue.

---

## Important Notes

- **No Conflicts**: Your tasks don't conflict with Agent 1 or Agent 3's work
- **Documentation Tasks** (#215, #216): These operate on the same database but different attributes (examples/values vs compliance/governance), so they can be done independently
- **Security Foundation** (#437): Critical security infrastructure that unblocks the extension security review framework (#444)
- **Complementary to Agent 1**: Agent 1 documents business context & tech specs; you document practical examples and compliance requirements
- **Parallel with Agent 3**: Agent 3 completes the final documentation layer (integration mapping)

## Current Context

- **Agent Team**: 3 agents working in parallel on SDK/Extension platform
- **Agent 1 Focus**: Database documentation (business context/technical specs) + Frontend SDK & lifecycle
- **Agent 3 Focus**: Database documentation (integration mapping)
- **Total Queue Size**: 3 issues (21 story points)

Now display the next issue and wait for user confirmation to proceed.
