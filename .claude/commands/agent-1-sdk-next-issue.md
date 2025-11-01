# Agent 1: SDK Core Architecture - Extension Types, Compatibility, & Conflict Detection

You are Agent 1 of a three-agent team building the MachShop SDK/Extension platform. Your focus is on the **foundational SDK architecture** that enables all other extension features: extension type taxonomy, compatibility checking, and conflict detection.

## Your Task Queue (in priority order):

1. **Issue #403** - Extension Type Taxonomy & Manifest Schema (5 pts) ⭐ CRITICAL - START HERE
2. **Issue #404** - Extension Compatibility Matrix Service (6 pts)
3. **Issue #409** - Extension Conflict Detection Engine (5 pts)

## ⚠️ CRITICAL: Issue #403 Must Be Completed First

**Issue #403** is the ROOT BLOCKER for the entire SDK platform. It defines the type system and manifest schema that ALL other SDK work depends on.

- **Must start immediately**
- **Blocks**: #404, #405, #407, #409, #413, #414, #436
- **Duration**: 2-3 weeks
- **Value/Effort Ratio**: 1.8 ⭐⭐⭐ Excellent

**Agent 1 should COMPLETE #403 before Agent 2 or Agent 3 can efficiently start their work.**

---

## Why This Work is Critical

The three issues in Agent 1's queue form the **foundational architecture layer**:

1. **#403 (Type Taxonomy)** - Defines what extensions ARE (types, capabilities, structure)
   - Creates manifest schema v2
   - Defines extension type taxonomy (UI, Service, Data Processor, etc.)
   - Provides type system for all downstream issues
   - **Enables**: Everyone else's work

2. **#404 (Compatibility Matrix)** - Determines what extensions can COEXIST
   - Checks version compatibility (semver)
   - Platform version requirements
   - Extension compatibility with each other
   - **Used by**: #407, #409, #414

3. **#409 (Conflict Detection)** - Detects what BREAKS with extensions
   - Namespace conflicts
   - Resource conflicts
   - Permission conflicts
   - Resolution strategies
   - **Used by**: #407, #414, manual conflict resolution

### Data Dependencies

```
Issue #403 (Type Taxonomy)
    ↓
    ├─→ Issue #404 (Compatibility)
    │       ↓
    │       └─→ Issue #409 (Conflict Detection)
    │       └─→ Issue #407 (Multi-Site) [Agent 2]
    │       └─→ Issue #414 (Migration Tool)
    ├─→ Issue #405 (Dependency Resolution) [Agent 2]
    ├─→ Issue #407 (Multi-Site) [Agent 2]
    ├─→ Issue #413 (License Management) [Agent 3]
    ├─→ Issue #414 (Migration Tool)
    └─→ Issue #436 (SDK Documentation) [Agent 3]
```

**Once #403 is published, Agent 2 and Agent 3 can start work** (they don't depend on #404 or #409)

---

## Implementation Phases

### Phase 1: Issue #403 (Week 1-2)
- Extension type taxonomy
- Manifest schema v2
- Type validator
- **Output**: Type definitions exported for other agents to use

### Phase 2: Issue #404 (Week 2-3)
- Version compatibility checker
- Semver parser and version ranges
- **Output**: Compatibility service for #407, #409, #414

### Phase 3: Issue #409 (Week 3)
- Conflict detector
- Conflict resolution engine
- **Output**: Conflict detection service for #407, #414

---

## Queue Management

This command will step you through each issue:

```bash
/implement-next-gh-issue
```

This will:
1. Display the next issue from your queue
2. Wait for your confirmation
3. Execute the implementation automatically
4. Report completion
5. Suggest the next issue to work on

**DO NOT manually change the prioritization framework** - the implementation command handles that.

---

## Important Notes for Team Coordination

### Agent 1 (You)
- **Focus**: SDK core architecture (types, compatibility, conflicts)
- **Start**: Issue #403 immediately
- **Blockers**: None (can start right now!)
- **Critical**: Publish #403 types ASAP for Agent 2 & 3 to depend on

### Agent 2
- **Focus**: Dependency resolution, multi-site deployment, documentation
- **Starts after**: #403 complete (can use your type definitions)
- **Queue**: #405, #407, #436 documentation
- **Note**: Can work independently on any issue in their queue

### Agent 3
- **Focus**: License management, SDK documentation, optional features
- **Starts after**: #403 complete (can use your type definitions)
- **Queue**: #413, #436 documentation, optional features
- **Note**: Can work independently on any issue in their queue

---

## Implementation Command

When ready to start implementing:

```bash
/implement-next-gh-issue
```

This will automatically handle Issue #403, and guide you through the rest of your queue.
