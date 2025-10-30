# Documentation Coverage Report

Generated: 10/30/2025, 9:59:11 AM

## Summary

| Metric | Value | Coverage |
|--------|-------|----------|
| **Tables** | 186 / 186 | 100% |
| **Fields** | 50 / 3536 | 1% |

## Coverage by Category

| Category | Tables | Table Coverage | Fields | Field Coverage |
|----------|--------|----------------|--------|----------------|
| Core Infrastructure | 17/17 | 100% | 15/318 | 5% |
| Personnel Management | 6/6 | 100% | 4/145 | 3% |
| Other | 94/94 | 100% | 0/1775 | 0% |
| Material Management | 10/10 | 100% | 5/242 | 2% |
| Production Management | 26/26 | 100% | 4/536 | 1% |
| Quality Management | 5/5 | 100% | 0/78 | 0% |
| Document Management | 13/13 | 100% | 0/210 | 0% |
| Security & Access | 10/10 | 100% | 10/131 | 8% |
| Time Tracking | 5/5 | 100% | 12/101 | 12% |

## Missing Documentation

### Tables Without Documentation (0)

### Fields Without Documentation (3486)
- Enterprise.id
- Enterprise.description
- Enterprise.isActive
- Enterprise.createdAt
- Enterprise.updatedAt
- Enterprise.sites
- Site.id
- Site.isActive
- Site.createdAt
- Site.updatedAt
- Site.areas
- Site.auditReports
- Site.equipment
- Site.indirectCostCodes
- Site.ncrs
- Site.operations
- Site.partAvailability
- Site.permissionChangeLogs
- Site.permissionUsageLogs
- Site.productionSchedules
- Site.routingTemplates
- Site.routings
- Site.securityEvents
- Site.enterprise
- Site.timeTrackingConfiguration
- Site.userSiteRoles
- Site.workOrders
- Site.roleTemplateInstances
- Site.roleTemplateUsageLogs
- Area.id

... and 3456 more fields.

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
