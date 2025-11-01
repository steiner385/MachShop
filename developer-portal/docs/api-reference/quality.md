---
sidebar_position: 4
title: Quality API
description: Quality management, inspections, and non-conformance reports
---

# Quality API

The Quality API manages inspection data, non-conformance reports (NCRs), and quality metrics for manufacturing operations.

## Endpoints

- `GET /quality/ncrs` - List NCRs
- `GET /quality/ncrs/{id}` - Get NCR
- `POST /quality/ncrs` - Create NCR
- `PUT /quality/ncrs/{id}` - Update NCR
- `GET /quality/inspections` - List inspections
- `POST /quality/inspections` - Create inspection
- `GET /quality/analytics` - Quality analytics dashboard data

## Non-Conformance Reports (NCRs)

An NCR documents a defect or issue found during manufacturing.

### Create NCR

```bash
curl -X POST "https://api.mes.company.com/api/v2/quality/ncrs" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workOrderId": "wo-123",
    "operationId": "op-456",
    "description": "Surface scratches on part",
    "severity": "MAJOR",
    "detectedBy": "John Smith"
  }'
```

### NCR Statuses

- `OPEN` - Newly created
- `UNDER_INVESTIGATION` - Being analyzed
- `DISPOSITIONED` - Decision made (SCRAP, REWORK, USE_AS_IS)
- `RESOLVED` - Corrective action complete
- `CLOSED` - Verified and archived

## Inspections

Record inspection results and measurements.

### Create Inspection

```bash
curl -X POST "https://api.mes.company.com/api/v2/quality/inspections" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workOrderId": "wo-123",
    "operationId": "op-456",
    "inspectionType": "DIMENSIONAL",
    "result": "PASS",
    "measurements": {
      "diameter": {"value": 25.4, "unit": "mm", "status": "OK"},
      "length": {"value": 100.2, "unit": "mm", "status": "OK"}
    }
  }'
```

## Analytics

Get quality metrics and trending data.

```bash
curl "https://api.mes.company.com/api/v2/quality/analytics?period=30days" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Returns:
- Defect rate
- Pass/fail ratio
- Most common issues
- Quality trends

## Fields

### NCR Fields

- `id` - NCR ID
- `workOrderId` - Associated work order
- `operationId` - Associated operation
- `description` - Issue description
- `severity` - HIGH, MAJOR, MINOR
- `status` - Current status
- `detectedBy` - Inspector name
- `detectionDate` - When found
- `disposition` - How it was resolved
- `createdAt` - Creation timestamp

### Inspection Fields

- `id` - Inspection ID
- `workOrderId` - Work order
- `operationId` - Operation
- `inspectionType` - DIMENSIONAL, VISUAL, FUNCTIONAL, etc.
- `result` - PASS, FAIL, CONDITIONAL
- `measurements` - Actual vs. specification
- `inspectedBy` - Inspector
- `createdAt` - Timestamp

## Related Documentation

- [Work Orders API](./work-orders.md)
- [Operations API](./operations.md)  
- [Webhooks - Quality Events](../webhooks/events.md)

---

**Need help?** [Email support](mailto:developers@mes.company.com)
