# 🏭 Production Management View

> **Generated:** 10/30/2025, 1:18:22 PM
> **Focus Areas:** workflow, calculation
> **Relevant Tables:** 31
> **Key Rules:** 0

## Overview

This view provides production stakeholders with focused documentation relevant to their responsibilities and decision-making needs.

## Key Business Rules



## Relevant Tables

| Table | Category | Key Fields | Business Impact |
|-------|----------|------------|-----------------|
| User | Personnel Management | id, username, email | Manages user authentication, authorization, and ac... |
| WorkOrder | Production Management | id, workOrderNumber, partId | Coordinates all production activities from plannin... |
| MaterialLot | Material Management | id, lotNumber, materialId | Material for MaterialProperty
Purpose: Supports Ma... |
| WorkOrderOperation | Production Management | id, workOrderId, routingOperationId | Examples: Example value
Constraints: NOT NULL
Work... |
| PersonnelClass | Personnel Management | id, classCode, className | Purpose: Supports Personnel Management operations ... |
| MaterialClass | Material Management | id, classCode, className | Personnel for PersonnelAvailability
Purpose: Suppo... |
| MaterialDefinition | Material Management | id, materialNumber, materialName | Materials for MaterialClass
Purpose: Supports Mate... |
| PersonnelQualification | Personnel Management | id, qualificationCode, qualificationName | Examples: Example value
Constraints: NOT NULL
Pers... |
| PersonnelCertification | Personnel Management | id, personnelId, qualificationId | Personnel class for PersonnelQualification
Purpose... |
| PersonnelSkillAssignment | Personnel Management | id, personnelId, skillId | Constraints: NOT NULL
Skill assignments for Person... |
| PersonnelWorkCenterAssignment | Personnel Management | id, personnelId, workCenterId | Purpose: Supports Personnel Management operations ... |
| ERPMaterialTransaction | Material Management | id, messageId, configId | Category: Other
Examples: Example value
Constraint... |
| UserSiteRole | Personnel Management | id, userId, roleId | Examples: Example value
Constraints: NOT NULL
Junc... |
| PersonnelSkill | Personnel Management | id, skillCode, skillName | Category: Other
Examples: Example value
Constraint... |
| PersonnelAvailability | Personnel Management | id, personnelId, availabilityType | Purpose: Supports Personnel Management operations ... |

## Action Items for Production Management View

### High Priority


### Monitoring Recommendations
- Review business rules quarterly for workflow and calculation compliance
- Monitor key performance indicators related to production management, material management, personnel management
- Ensure stakeholder training on critical business rules

---

*Tailored for Production Management View by MachShop Enhanced Documentation System*