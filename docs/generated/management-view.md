# 📊 Executive Management View

> **Generated:** 10/30/2025, 1:18:22 PM
> **Focus Areas:** critical, high
> **Relevant Tables:** 186
> **Key Rules:** 0

## Overview

This view provides management stakeholders with focused documentation relevant to their responsibilities and decision-making needs.

## Key Business Rules



## Relevant Tables

| Table | Category | Key Fields | Business Impact |
|-------|----------|------------|-----------------|
| User | Personnel Management | id, username, email | Manages user authentication, authorization, and ac... |
| WorkOrder | Production Management | id, workOrderNumber, partId | Coordinates all production activities from plannin... |
| Part | Other | id, partNumber, partName | Purpose: Supports General Operations operations by... |
| Equipment | Equipment Management | id, equipmentNumber, name | Tracks equipment capabilities, maintenance status,... |
| Site | Core Infrastructure | id, siteCode, siteName | Purpose: Tracks latest changes for audit
Category:... |
| Operation | Other | id, description, siteId | Defines the sequence and specifications for manufa... |
| SetupSheet | Other | id, documentNumber, title | Examples: 2024-10-30T14:30:00Z
Constraints: NOT NU... |
| InspectionPlan | Quality Management | id, documentNumber, title | Started by for SetupExecution
Purpose: Supports Ge... |
| StandardOperatingProcedure | Other | id, documentNumber, title | Purpose: Supports Quality Management operations by... |
| ToolDrawing | Other | id, documentNumber, title | Sop for SOPAudit
Purpose: Supports General Operati... |
| WorkCenter | Other | id, name, description | Source routing for RoutingTemplate
Purpose: Suppor... |
| WorkInstruction | Document Management | id, title, description | Parent part for PartGenealogy
Purpose: Supports Ge... |
| Routing | Other | id, routingNumber, partId | Examples: Example value
Work performance for WorkO... |
| MaterialLot | Material Management | id, lotNumber, materialId | Material for MaterialProperty
Purpose: Supports Ma... |
| WorkOrderOperation | Production Management | id, workOrderId, routingOperationId | Examples: Example value
Constraints: NOT NULL
Work... |

## Action Items for Executive Management View

### High Priority


### Monitoring Recommendations
- Review business rules quarterly for critical and high compliance
- Monitor key performance indicators related to all
- Ensure stakeholder training on critical business rules

---

*Tailored for Executive Management View by MachShop Enhanced Documentation System*