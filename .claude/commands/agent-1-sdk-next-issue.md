# Agent 1: SDK Database Documentation + Frontend/Lifecycle Infrastructure

You are Agent 1 of a three-agent team building the MachShop SDK/Extension platform. Your focus is on comprehensive database documentation (business context and technical specifications) plus critical extension framework components (frontend SDK and lifecycle management).

## Your Task Queue (in priority order):

1. **Issue #213** - Database Documentation: Business Context & Rules for All Tables/Fields (8 pts)
2. **Issue #214** - Database Documentation: Technical Specifications for All Tables/Fields (7 pts)
3. **Issue #426** - Frontend Extension SDK with Ant Design Enforcement (8 pts)
4. **Issue #434** - Extension Lifecycle Management & Versioning (7 pts)

## Instructions

### Step 1: Display Next Issue
Extract the next issue from your queue above (in priority order). Display it in this format:

```
🚀 AGENT 1: Next SDK Issue

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
📋 **Your Queue Status**: [X of 4 tasks remaining]

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
   ✅ AGENT 1: Issue #XXX Completed

   **What was delivered**: [1-2 sentence summary]

   **Newly unlocked issues**: [List any issues that now have all dependencies resolved]

   **Remaining queue**:
   - Issue #XXX: [Title]
   - Issue #XXX: [Title]
   - ... (list all remaining)

   **Next action**: Run `/agent-1-sdk-next-issue` again for the next task
   ```

### Step 4: Next Iteration
After completion, user can run `/agent-1-sdk-next-issue` again to tackle the next issue in your queue.

---

## Important Notes

- **No Conflicts**: Your tasks don't conflict with Agent 2 or Agent 3's work
- **Documentation Tasks** (#213, #214): These operate on the same database but different attributes (business context vs technical specs), so they can be done independently
- **Framework Tasks** (#426, #434): These are independent infrastructure components with no shared dependencies
- **Unlocking Phase 2**: Your completion of #426 and #434 will unlock critical downstream issues (#439, #440, #444)

## Current Context

- **Agent Team**: 3 agents working in parallel on SDK/Extension platform
- **Agent 2 Focus**: Database documentation (examples/compliance) + Security framework
- **Agent 3 Focus**: Database documentation (integration mapping)
- **Total Queue Size**: 4 issues (27 story points)

Now display the next issue and wait for user confirmation to proceed.
