# Documentation Coverage Report

Generated: 10/30/2025, 7:17:31 AM

## Summary

| Metric | Value | Coverage |
|--------|-------|----------|
| **Tables** | 58 / 186 | 31% |
| **Fields** | 7 / 3536 | 0% |

## Coverage by Category

| Category | Tables | Table Coverage | Fields | Field Coverage |
|----------|--------|----------------|--------|----------------|
| Core Infrastructure | 2/17 | 12% | 0/318 | 0% |
| Personnel Management | 5/6 | 83% | 4/145 | 3% |
| Other | 25/100 | 25% | 0/1895 | 0% |
| Material Management | 0/10 | 0% | 0/242 | 0% |
| Production Management | 1/20 | 5% | 3/416 | 1% |
| Quality Management | 2/5 | 40% | 0/78 | 0% |
| Document Management | 8/13 | 62% | 0/210 | 0% |
| Security & Access | 10/10 | 100% | 0/131 | 0% |
| Time Tracking | 5/5 | 100% | 0/101 | 0% |

## Missing Documentation

### Tables Without Documentation (128)
- Enterprise
- Site
- Area
- PersonnelClass
- PersonnelQualification
- PersonnelCertification
- PersonnelSkill
- PersonnelSkillAssignment
- PersonnelWorkCenterAssignment
- PersonnelAvailability
- MaterialClass
- MaterialDefinition
- MaterialProperty
- MaterialLot
- MaterialSublot
- MaterialLotGenealogy
- MaterialStateHistory
- Operation
- OperationParameter
- ParameterLimits

... and 108 more tables.

### Fields Without Documentation (3529)
- Enterprise.id
- Enterprise.enterpriseCode
- Enterprise.enterpriseName
- Enterprise.description
- Enterprise.headquarters
- Enterprise.isActive
- Enterprise.createdAt
- Enterprise.updatedAt
- Enterprise.sites
- Site.id
- Site.siteCode
- Site.siteName
- Site.location
- Site.enterpriseId
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

... and 3499 more fields.

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
