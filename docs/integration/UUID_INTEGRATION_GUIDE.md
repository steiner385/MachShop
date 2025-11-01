# Integration Guide: UUID for Partners

**Status:** Partner Integration Guide
**Version:** 1.0
**Date:** October 31, 2025
**Audience:** External Integration Partners, API Consumers

---

## Overview

The MachShop MES provides standardized UUID-based identifiers for all manufacturing entities. This guide explains how to integrate with our APIs using UUIDs for stable, long-term references to parts, work orders, and other manufacturing data.

## Why UUIDs?

UUIDs provide several benefits for partners:

- **Stability:** UUID never changes, even if the system is upgraded
- **Traceability:** UUID can be archived and referenced decades later
- **Standards Compliance:** UUID is ISO/IEC 9834-8:2005 standard
- **Interoperability:** UUID works across all our systems (ERP, QIF, CAD, etc.)
- **Independence:** UUID is not tied to internal system implementation

---

## Getting Started

### 1. Understand UUID Format

A UUID looks like:
```
550e8400-e29b-41d4-a716-446655440000
```

Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (36 characters including hyphens)

### 2. Find a Resource's UUID

All MachShop MES resources have a UUID. For example, querying a part:

```bash
curl -X GET "https://api.machshop.io/api/v1/external/parts/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "data": {
    "persistentUuid": "550e8400-e29b-41d4-a716-446655440000",
    "partNumber": "PART-2024-001",
    "description": "Precision bearing assembly",
    "status": "ACTIVE",
    "erpPartId": "ERP-PART-12345",
    "stepAp242Uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "createdAt": "2024-10-31T10:00:00Z",
    "updatedAt": "2024-10-31T10:00:00Z"
  },
  "metadata": {
    "requestedUuid": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-10-31T12:00:00Z"
  }
}
```

### 3. Store UUIDs in Your System

Always store the UUID in your system alongside your own ID:

```
My System          MachShop MES
─────────────────────────────────
ID: 12345    ↔    UUID: 550e8400-e29b-41d4-a716-446655440000
ID: 12346    ↔    UUID: 650e8400-e29b-41d4-a716-446655440001
ID: 12347    ↔    UUID: 750e8400-e29b-41d4-a716-446655440002
```

---

## API Endpoints

### External API Endpoints (Use UUIDs)

All external API endpoints accept UUIDs. These are specifically designed for partner integrations.

#### Get Part by UUID
```
GET /api/v1/external/parts/{uuid}

Parameters:
  uuid (string, required) - Part UUID

Response:
  {
    "data": {
      "persistentUuid": "550e8400-e29b-41d4-a716-446655440000",
      "partNumber": "PART-001",
      "description": "Precision bearing",
      "status": "ACTIVE",
      ...
    },
    "metadata": { ... }
  }
```

#### Get Work Order by UUID
```
GET /api/v1/external/work-orders/{uuid}

Parameters:
  uuid (string, required) - Work Order UUID

Response:
  {
    "data": {
      "persistentUuid": "550e8400-e29b-41d4-a716-446655440000",
      "workOrderNumber": "WO-2024-001",
      "partUuid": "650e8400-e29b-41d4-a716-446655440001",
      "quantity": 1000,
      "status": "IN_PROGRESS",
      ...
    }
  }
```

#### List Parts
```
GET /api/v1/external/parts

Parameters:
  limit (integer, optional) - Results per page (default: 50, max: 500)
  offset (integer, optional) - Starting offset (default: 0)
  status (string, optional) - Filter by status (ACTIVE, INACTIVE, etc.)

Response:
  {
    "data": [
      {
        "persistentUuid": "550e8400-e29b-41d4-a716-446655440000",
        "partNumber": "PART-001",
        ...
      },
      ...
    ],
    "pagination": {
      "total": 1234,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
```

### Batch Operations

#### Get Multiple Parts by UUIDs
```
POST /api/v1/external/parts/batch

Request:
  {
    "uuids": [
      "550e8400-e29b-41d4-a716-446655440000",
      "650e8400-e29b-41d4-a716-446655440001",
      "750e8400-e29b-41d4-a716-446655440002"
    ]
  }

Response:
  {
    "data": [
      { "persistentUuid": "...", "partNumber": "PART-001", ... },
      { "persistentUuid": "...", "partNumber": "PART-002", ... },
      ...
    ],
    "metadata": {
      "requestedCount": 3,
      "foundCount": 3,
      "notFoundUuids": []
    }
  }
```

---

## Integration Patterns

### Pattern 1: One-Time Data Import

Import parts from MachShop into your system:

```python
import requests
import json

# Configuration
MACHSHOP_API_BASE = "https://api.machshop.io"
AUTH_TOKEN = "your-api-token-here"

headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

def import_parts():
    """Import all active parts from MachShop"""

    parts = []
    offset = 0
    limit = 100

    while True:
        # Fetch batch of parts
        response = requests.get(
            f"{MACHSHOP_API_BASE}/api/v1/external/parts",
            params={
                "status": "ACTIVE",
                "limit": limit,
                "offset": offset
            },
            headers=headers
        )

        if response.status_code != 200:
            raise Exception(f"API error: {response.status_code}")

        data = response.json()

        # Process parts
        for part in data['data']:
            parts.append({
                'machshop_uuid': part['persistentUuid'],
                'part_number': part['partNumber'],
                'description': part['description'],
                'material_type': part['materialType'],
                'status': part['status'],
                'imported_at': datetime.now()
            })

        # Check if more data
        if not data['pagination']['hasMore']:
            break

        offset += limit

    # Save to your database
    save_parts_to_db(parts)
    print(f"Imported {len(parts)} parts")

if __name__ == "__main__":
    import_parts()
```

### Pattern 2: Real-Time Synchronization

Keep your system in sync with MachShop when changes occur:

```typescript
// Integration webhook handler (your system receives updates from MachShop)

interface PartUpdatedEvent {
  eventType: "PART_UPDATED" | "PART_CREATED" | "PART_DELETED";
  partUuid: string;
  timestamp: string;
  changes: {
    [field: string]: {
      oldValue: any;
      newValue: any;
    };
  };
}

async function handlePartUpdate(event: PartUpdatedEvent) {
  // 1. Find the part in your system using UUID
  const localPart = await db.parts.findOne({
    where: { machshop_uuid: event.partUuid }
  });

  if (!localPart) {
    console.error(`Unknown part: ${event.partUuid}`);
    return;
  }

  // 2. Update fields based on changes
  const updates = {};
  for (const [field, change] of Object.entries(event.changes)) {
    updates[field] = change.newValue;
  }

  // 3. Save to your database
  await db.parts.update(
    { machshop_uuid: event.partUuid },
    updates
  );

  console.log(`Updated part ${localPart.partNumber}`);
}
```

### Pattern 3: Work Order Tracking

Track work orders across systems:

```java
// Java example: Tracking work order progress

import java.util.UUID;
import com.machshop.client.MachShopClient;

public class WorkOrderTracker {
    private MachShopClient client;

    // Mapping of MachShop UUIDs to your work order IDs
    private Map<UUID, Integer> workOrderMapping;

    /**
     * Get current status of a work order from MachShop
     */
    public WorkOrderStatus getStatus(Integer localWorkOrderId) {
        // Look up UUID
        UUID machshopUuid = workOrderMapping.get(localWorkOrderId);
        if (machshopUuid == null) {
            throw new IllegalArgumentException("Unknown work order: " + localWorkOrderId);
        }

        // Get status from MachShop
        WorkOrder wo = client.getWorkOrder(machshopUuid);

        // Map to your status format
        return mapStatus(wo.getStatus());
    }

    /**
     * Update work order in your system based on MachShop updates
     */
    public void syncWorkOrderStatus(UUID machshopUuid) {
        // Get from MachShop
        WorkOrder wo = client.getWorkOrder(machshopUuid);

        // Find local work order
        Integer localId = workOrderMapping.getKey(machshopUuid);

        // Update local database
        updateWorkOrderStatus(localId, wo.getStatus(), wo.getQuantityCompleted());
    }
}
```

---

## Common Integration Scenarios

### Scenario 1: ERP Integration (Outbound from MachShop)

MachShop sends manufacturing data to your ERP:

```
MachShop                          Your ERP
────────────────────────────────────────────
Create Part ──[persistentUuid]──→ Import to Catalog
Create Work Order ──[UUIDs]──→ Create Job
Record Production ──[UUIDs]──→ Post Transaction
```

**Your Implementation:**

1. Subscribe to MachShop webhooks
2. Receive events with `persistentUuid`
3. Store UUID as foreign key
4. Use UUID for subsequent queries
5. Never need to re-query by part number (UUID is stable)

### Scenario 2: Quality System Integration (Inbound to MachShop)

Your quality system sends inspection results to MachShop:

```
Your Quality System               MachShop
────────────────────────────────────────────
Get Work Order by UUID ──→ Fetch from MachShop
Record Inspection Results ──[UUID]──→ POST /quality-results
Report Non-Conformance ──[UUID]──→ POST /ncr
```

**Your Implementation:**

```python
def record_inspection_result(machshop_wo_uuid, measurement_value):
    """Record inspection in MachShop using its UUID"""

    payload = {
        "workOrderUuid": machshop_wo_uuid,  # Use UUID from MachShop
        "measurementValue": measurement_value,
        "timestamp": datetime.now().isoformat(),
        "inspectorId": get_current_user_id()
    }

    response = requests.post(
        f"{MACHSHOP_API_BASE}/api/v1/external/quality-results",
        json=payload,
        headers=auth_headers
    )

    return response.json()
```

### Scenario 3: CAD/PLM Integration

Link CAD models to manufacturing parts:

```
Your CAD System                   MachShop
────────────────────────────────────────────
Get Part by UUID ──→ Fetch from MachShop
Link to CAD Model ──[UUID]──→ POST /parts/{uuid}/cad-link
Update Drawing Ref ──[UUID]──→ PATCH /parts/{uuid}
```

**Your Implementation:**

```python
def link_part_to_cad(machshop_part_uuid, cad_file_uuid):
    """Link a MachShop part to a CAD model"""

    payload = {
        "cadUuid": cad_file_uuid,
        "cadRevision": "3.1",
        "linkedDate": datetime.now().isoformat()
    }

    response = requests.post(
        f"{MACHSHOP_API_BASE}/api/v1/external/parts/{machshop_part_uuid}/cad-link",
        json=payload,
        headers=auth_headers
    )

    return response.json()
```

---

## Error Handling

### Invalid UUID Format

```
Status: 400 Bad Request

{
  "error": "Invalid UUID format",
  "provided": "not-a-uuid",
  "expected": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Your Response:** Validate UUIDs before sending to MachShop.

```python
import uuid

def is_valid_uuid(value):
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False

# Usage
if not is_valid_uuid(uuid_string):
    raise ValueError(f"Invalid UUID: {uuid_string}")
```

### UUID Not Found

```
Status: 404 Not Found

{
  "error": "Resource not found",
  "uuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Your Response:** The UUID doesn't exist in MachShop, or you don't have permission to access it.

```python
def get_part(uuid):
    response = requests.get(
        f"{API_BASE}/parts/{uuid}",
        headers=auth_headers
    )

    if response.status_code == 404:
        print(f"Part not found: {uuid}")
        # Check if UUID is correct in your system
        # If correct, may have been deleted from MachShop
        return None

    return response.json()
```

### Rate Limiting

```
Status: 429 Too Many Requests

{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

**Your Response:** Implement exponential backoff.

```python
import time

def get_with_retry(url, max_retries=3):
    for attempt in range(max_retries):
        response = requests.get(url, headers=auth_headers)

        if response.status_code == 429:
            wait_time = int(response.json()['retryAfter'])
            print(f"Rate limited, waiting {wait_time}s")
            time.sleep(wait_time)
            continue

        if response.status_code >= 500:
            wait_time = 2 ** attempt  # Exponential backoff
            print(f"Server error, retrying in {wait_time}s")
            time.sleep(wait_time)
            continue

        return response

    raise Exception("Max retries exceeded")
```

---

## Best Practices for Partners

### ✅ DO

- [ ] Store UUID in your database
- [ ] Use UUID for all API requests
- [ ] Validate UUID format before querying
- [ ] Implement exponential backoff for retries
- [ ] Cache UUIDs to minimize API calls
- [ ] Include UUID in exported data
- [ ] Archive UUIDs with historical records
- [ ] Document your UUID mappings
- [ ] Test with multiple UUIDs
- [ ] Subscribe to API change notifications

### ❌ DON'T

- [ ] Store internal MachShop IDs (CUID)
- [ ] Use part numbers as unique identifiers
- [ ] Assume UUID never changes (though it doesn't)
- [ ] Share UUIDs across customers/tenants
- [ ] Log UUIDs without encryption (PII considerations)
- [ ] Cache indefinitely (refresh periodically)
- [ ] Skip UUID validation
- [ ] Use UUID as password or token
- [ ] Modify UUID values
- [ ] Rely on UUID format (treat as opaque string)

---

## Data Mapping Examples

### Example 1: Part Import

**MachShop Part:**
```json
{
  "persistentUuid": "550e8400-e29b-41d4-a716-446655440000",
  "partNumber": "BEARING-SKF-6206",
  "description": "SKF Ball Bearing 6206",
  "materialType": "STEEL",
  "weight": 0.185,
  "unit": "KG",
  "status": "ACTIVE"
}
```

**Your ERP:**
```sql
INSERT INTO parts (
  machshop_uuid,
  part_number,
  description,
  material,
  weight_kg,
  status,
  last_synced
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'BEARING-SKF-6206',
  'SKF Ball Bearing 6206',
  'STEEL',
  0.185,
  'ACTIVE',
  NOW()
);
```

### Example 2: Work Order Tracking

**MachShop Work Order:**
```json
{
  "persistentUuid": "650e8400-e29b-41d4-a716-446655440001",
  "workOrderNumber": "MES-WO-2024-001",
  "partUuid": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 1000,
  "status": "IN_PROGRESS",
  "startDate": "2024-10-31T08:00:00Z",
  "expectedEndDate": "2024-11-01T16:00:00Z"
}
```

**Your MRP:**
```sql
UPDATE production_orders
SET
  machshop_uuid = '650e8400-e29b-41d4-a716-446655440001',
  status = 'IN_PROGRESS',
  last_status_update = NOW()
WHERE order_number = 'PO-2024-1234';
```

---

## Testing Your Integration

### Test Checklist

- [ ] UUID validation (valid and invalid formats)
- [ ] Successfully fetch resource by UUID
- [ ] Handle 404 when UUID doesn't exist
- [ ] Batch operations with multiple UUIDs
- [ ] Rate limiting and retry logic
- [ ] UUID persistence (UUID doesn't change)
- [ ] Webhook receipt and processing
- [ ] Error handling for all error codes
- [ ] Data consistency with MachShop
- [ ] Performance under load

### Integration Test Template

```python
import pytest
import uuid

class TestMachShopIntegration:

    @pytest.fixture
    def valid_uuid(self):
        return str(uuid.uuid4())

    def test_get_part_by_valid_uuid(self, valid_uuid):
        response = client.get_part(valid_uuid)
        assert response.status_code == 200
        assert response.data['persistentUuid'] == valid_uuid

    def test_invalid_uuid_format(self):
        response = client.get_part("not-a-uuid")
        assert response.status_code == 400
        assert "Invalid UUID" in response.error

    def test_nonexistent_uuid(self):
        response = client.get_part(str(uuid.uuid4()))
        assert response.status_code == 404

    def test_batch_operation(self):
        uuids = [str(uuid.uuid4()) for _ in range(3)]
        response = client.get_parts_batch(uuids)
        assert len(response.data) <= len(uuids)

    def test_uuid_persistence(self, valid_uuid):
        part1 = client.get_part(valid_uuid)
        part2 = client.get_part(valid_uuid)
        assert part1.persistentUuid == part2.persistentUuid
```

---

## Support & Resources

### Documentation
- **Architecture & Rationale:** [ADR-012: UUID Strategy](../adr/ADR-012-UUID-Strategy-MBE-Compliance.md)
- **Developer Guide:** [Developer Guide: UUIDs](../DEVELOPER_GUIDE_UUIDS.md)
- **Implementation Details:** [UUID Strategy Guide](../UUID_STRATEGY.md)

### API Reference
- Full API documentation: https://api.machshop.io/docs
- API status page: https://status.machshop.io
- API changelog: https://api.machshop.io/changelog

### Support Channels
- **Email:** integrations@machshop.io
- **Slack:** #partner-integrations
- **Issue Tracker:** https://github.com/steiner385/MachShop2/issues

### Rate Limits
- **Default:** 1,000 requests per hour
- **Enterprise:** Contact sales for higher limits
- **Burst:** 100 requests per minute

### Deprecation Policy
- **Announced:** 6 months notice
- **Support:** 12 months after deprecation
- **Migration:** Detailed guides provided for all changes

---

## FAQ for Partners

**Q: Can I use part numbers instead of UUIDs?**
A: Part numbers can change. UUIDs never change. Always use UUIDs for stable integration.

**Q: What if I lose track of a UUID?**
A: Query by part number to get the UUID: `GET /api/v1/external/parts/by-number/{partNumber}`

**Q: Do UUIDs work across MachShop instances?**
A: UUIDs are specific to each MachShop instance. If you have multiple MachShop instances, track which instance each UUID belongs to.

**Q: How often should I sync?**
A: Real-time webhooks are recommended for critical data. For non-critical data, once per day is typical.

**Q: What happens if a part is deleted in MachShop?**
A: You'll get a 404 when querying the UUID. We recommend subscribing to deletion webhooks to proactively remove from your system.

**Q: Can I modify a UUID?**
A: No. UUIDs are immutable. If you need a different UUID, delete and recreate the record (not recommended).

**Q: How should I version my integration?**
A: Use API version prefix (`/api/v1/`) to isolate from breaking changes. We maintain backward compatibility for 12 months.

---

## Changelog

### Version 1.0 (October 31, 2025)
- Initial release of UUID Integration Guide
- External API endpoints using UUIDs
- Integration patterns and examples
- Error handling and best practices

---

## Next Steps

1. **Register for API Access:** https://api.machshop.io/signup
2. **Read Full API Docs:** https://api.machshop.io/docs
3. **Test Integration:** Follow the testing checklist above
4. **Contact Support:** integrations@machshop.io for questions
5. **Deploy to Production:** Follow your deployment procedures

---

**Last Updated:** October 31, 2025
**API Version:** 1.0
**UUID Standard:** RFC 4122
