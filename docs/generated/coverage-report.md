# Documentation Coverage Report

Generated: 10/30/2025, 2:06:17 PM

## Summary

| Metric | Value | Coverage |
|--------|-------|----------|
| **Tables** | 186 / 186 | 100% |
| **Fields** | 3536 / 3536 | 100% |

## Coverage by Category

| Category | Tables | Table Coverage | Fields | Field Coverage |
|----------|--------|----------------|--------|----------------|
| Core Infrastructure | 17/17 | 100% | 318/318 | 100% |
| Personnel Management | 6/6 | 100% | 145/145 | 100% |
| Other | 94/94 | 100% | 1775/1775 | 100% |
| Material Management | 10/10 | 100% | 242/242 | 100% |
| Production Management | 26/26 | 100% | 536/536 | 100% |
| Quality Management | 5/5 | 100% | 78/78 | 100% |
| Document Management | 13/13 | 100% | 210/210 | 100% |
| Security & Access | 10/10 | 100% | 131/131 | 100% |
| Time Tracking | 5/5 | 100% | 101/101 | 100% |

## Missing Documentation

### Tables Without Documentation (0)

### Fields Without Documentation (0)

## Recommendations

### Priority Actions
1. **Document core tables**: Focus on User, WorkOrder, QualityPlan, Equipment, Material
2. **Add field descriptions**: Prioritize fields marked with business rules or constraints
3. **Define data owners**: Specify responsible teams for each category
4. **Add compliance notes**: Document PII and regulatory requirements

### Quick Wins
- Use `--generate-templates` to create documentation scaffolding
- Start with high-usage tables that appear in common queries
- Document integration points first for external system clarity

---

*Run `npm run docs:schema:enhanced --generate-templates` to create templates for missing documentation.*
