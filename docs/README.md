# Documentation Directory

This directory contains all project documentation organized according to the 5S methodology for maximum clarity and maintainability.

## Directory Structure

```
docs/
├── archive/              # Completed work and historical documentation
├── testing/              # Test strategies, results, and testing guides
├── development/          # Implementation plans and progress tracking
├── deployment/           # Deployment guides and configurations
├── adr/                  # Architecture Decision Records
├── integration/          # Integration documentation
├── roadmaps/             # Product and technical roadmaps
├── specs/                # Specifications and requirements
├── sprints/              # Sprint planning and retrospectives
└── [Root files]          # Current, active user-facing documentation
```

## What Goes Where

### Root Directory (`docs/`)
**Purpose:** Current, actively-used documentation for end users and developers.

**Contents:**
- User guides (e.g., `ROUTING_VISUAL_EDITOR_GUIDE.md`)
- System architecture documentation
- API reference and integration guides
- Technology stack overview
- Product requirements and use cases
- ERD (Entity Relationship Diagram)

**Examples:**
- `SYSTEM_ARCHITECTURE.md` - Current system design
- `ROUTING_VISUAL_EDITOR_GUIDE.md` - User guide for routing editor
- `TECHNOLOGY_STACK.md` - Technology choices and stack
- `erd.md` - Database entity relationships

---

### `archive/`
**Purpose:** Historical documentation and completed work for reference.

**Contents:**
- Completed phase/sprint summaries
- Test fix session reports
- Validation results from previous work
- Bug fix summaries
- Implementation completion reports
- Investigation and analysis documents (completed)

**Examples:**
- `PHASE_1_COMPLETION_SUMMARY.md`
- `E2E_TEST_FIXES_SESSION1_SUMMARY.md`
- `B2M_TEST_FIXES_COMPLETE.md`
- `BUG_FIX_VALIDATION_REPORT.md`

**When to Archive:**
- When a phase/sprint is complete
- When a test fix session concludes
- When validation/investigation work is finished
- When documentation becomes historical reference only

---

### `testing/`
**Purpose:** Testing strategies, methodologies, and test result documentation.

**Contents:**
- Test strategies and plans
- Testing guides and best practices
- Test result summaries (current)
- QA documentation
- Test data specifications
- Frontend/backend testing summaries

**Examples:**
- `frontend-testing-summary.md`
- `E2E_TEST_GROUPS.md`
- `TEST_CASES.md`
- `TEST_SCENARIOS.md`

---

### `development/`
**Purpose:** Active implementation plans and development progress tracking.

**Contents:**
- Feature implementation plans (in progress)
- Development progress reports
- Refactoring plans
- Technical design documents
- Implementation roadmaps (active)

**Examples:**
- `ROUTING_IMPROVEMENTS_PROGRESS.md`
- `COLLABORATIVE_ROUTING_IMPLEMENTATION.md`
- `UI_IMPLEMENTATION_REQUIREMENTS.md`
- `MULTI_SITE_ROUTING_README.md` - Multi-site routing implementation guide

**Move to archive when:** Implementation is complete

---

### `deployment/`
**Purpose:** Deployment guides, configurations, and operations documentation.

**Contents:**
- Deployment guides for different environments
- Configuration management documentation
- Migration guides
- Infrastructure as Code documentation
- Docker and Kubernetes configurations
- Database migration procedures

**Examples:**
- `DEPLOYMENT_GUIDE.md`
- `DOCKER_QUICK_START.md`
- `DATABASE_MIGRATION_GUIDE.md`
- `ENTERPRISE_DEPLOYMENT_GUIDE.md`

---

### `adr/`
**Purpose:** Architecture Decision Records - documenting important architectural choices.

**Format:** Each ADR follows a standard template:
```markdown
# ADR-XXX: Title

## Status
Accepted | Rejected | Deprecated | Superseded

## Context
What is the issue we're addressing?

## Decision
What is the change we're making?

## Consequences
What becomes easier or more difficult?
```

**Contents:**
- Technology selection decisions
- Architectural pattern choices
- Database design decisions
- API design decisions

---

### `integration/`
**Purpose:** External system integration documentation.

**Contents:**
- Integration guides for external systems
- API integration specifications
- Data exchange formats
- Integration test documentation
- Third-party system configurations

**Examples:**
- `INTEGRATION_GUIDE.md`
- `AEROSPACE_INTEGRATIONS.md`
- `PROFICY_HISTORIAN_INTEGRATION.md`

---

### `roadmaps/`
**Purpose:** Product and technical roadmaps for planning.

**Contents:**
- Product roadmaps
- Technical roadmaps
- Feature planning documents
- Long-term vision documents

**Examples:**
- `MES_IMPLEMENTATION_ROADMAP.md`
- `IMPLEMENTATION_ROADMAP.md`
- `UI_IMPROVEMENT_ROADMAP.md`

---

### `specs/`
**Purpose:** Detailed specifications and requirements.

**Contents:**
- Feature specifications
- API specifications
- Data model specifications
- Functional requirements
- Non-functional requirements

**Examples:**
- `REQUIREMENTS.md`
- `PRODUCT_REQUIREMENTS.md`
- `USE_CASES.md`

---

### `sprints/`
**Purpose:** Sprint planning and tracking.

**Contents:**
- Sprint plans
- Sprint retrospectives
- Sprint completion summaries
- Velocity tracking

**Example Structure:**
```
sprints/
├── sprint-01/
│   ├── plan.md
│   ├── retrospective.md
│   └── summary.md
└── sprint-02/
    └── ...
```

---

## Documentation Best Practices

### File Naming
- Use `UPPERCASE_WITH_UNDERSCORES.md` for major documents
- Use `kebab-case.md` for supplementary documents
- Be descriptive and specific

### Markdown Standards
- Use clear headings hierarchy (# ## ###)
- Include a table of contents for long documents
- Use code blocks with language specification
- Include examples and diagrams where helpful

### When to Create New Documentation
1. **New Feature:** Create in `development/`, move to archive when complete
2. **Architectural Decision:** Create ADR in `adr/`
3. **Test Results:** Create in `testing/`, archive completed test sessions
4. **Deployment Process:** Create in `deployment/`
5. **User Guide:** Create in root `docs/`

### When to Archive
- When a phase/sprint is complete
- When feature implementation is finished
- When test fix session is concluded
- When investigation/analysis is complete
- When document is historical reference only

### When to Delete
- Duplicate documentation exists
- Information is outdated and incorrect
- No historical value for future reference

---

## Quick Reference

| I need to... | Location |
|-------------|----------|
| Understand the system architecture | `SYSTEM_ARCHITECTURE.md` |
| Learn about routing features | `ROUTING_VISUAL_EDITOR_GUIDE.md` |
| Deploy the system | `deployment/DEPLOYMENT_GUIDE.md` |
| Review past implementation work | `archive/` |
| Write tests | `testing/TEST_CASES.md` |
| Integrate external system | `integration/INTEGRATION_GUIDE.md` |
| See product roadmap | `roadmaps/MES_IMPLEMENTATION_ROADMAP.md` |
| Check sprint progress | `sprints/` |
| Review an architectural decision | `adr/` |
| Work on routing implementation | `development/MULTI_SITE_ROUTING_README.md` |

---

## Maintenance

This documentation structure follows the **5S methodology**:
1. **Sort** - Remove unnecessary/outdated docs
2. **Set in Order** - Organize in logical directories
3. **Shine** - Keep documentation clean and current
4. **Standardize** - Follow consistent formats and naming
5. **Sustain** - Regular reviews and updates

### Monthly Documentation Review
- Archive completed work
- Update roadmaps and progress docs
- Remove duplicate or obsolete files
- Verify links are not broken
- Update this README if structure changes

---

For questions about documentation organization, see `/CONTRIBUTING.md` or create an issue.
