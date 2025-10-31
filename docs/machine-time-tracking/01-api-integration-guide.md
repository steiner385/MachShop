# Machine Time Tracking API Integration Guide

## Overview

The Machine Time Tracking system provides comprehensive REST APIs for tracking machine operating time, calculating costs, and analyzing equipment utilization. This system supports both automatic signal-based tracking from industrial equipment and manual time entry, enabling accurate cost allocation and OEE (Overall Equipment Effectiveness) calculations.

### Key Capabilities

- **Real-time Machine Time Tracking**: Start, stop, pause, and resume machine time entries
- **Automatic Signal Processing**: Process signals from PLCs, SCADA systems, and IoT devices
- **Cost Calculation**: Multiple costing models with overhead allocation
- **Utilization Analytics**: Calculate machine utilization and efficiency metrics
- **Historical Analysis**: Query and analyze historical machine time data
- **Multi-source Integration**: Support for OPC-UA, Modbus, MTConnect, MQTT, and historian systems

## Authentication Requirements

All API endpoints require Bearer token authentication. Include your API token in the Authorization header:

```http
Authorization: Bearer <your-api-token>
```

## Base URL

```
https://api.machshop3.com/api/v2/machine-time
```

## Rate Limiting

- **Standard endpoints**: 1000 requests per minute
- **Reporting endpoints**: 100 requests per minute
- **Signal processing**: 5000 requests per minute
- **Bulk operations**: 50 requests per minute

## API Endpoint Reference

### 1. Start Machine Time Entry

Start tracking time for a machine/equipment.

**Endpoint**: `POST /api/v2/machine-time/start`

**Request Body**:
```json
{
  "equipmentId": "equip-cnc-001",
  "workOrderId": "wo-2024-1234",
  "operationId": "op-drill-5678",
  "entrySource": "MANUAL",
  "dataSource": "Operator Kiosk",
  "cycleCount": 0,
  "partCount": 0,
  "machineRate": 125.50
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "mte-abc123",
    "equipmentId": "equip-cnc-001",
    "workOrderId": "wo-2024-1234",
    "operationId": "op-drill-5678",
    "startTime": "2024-10-31T08:30:00Z",
    "entrySource": "MANUAL",
    "dataSource": "Operator Kiosk",
    "status": "ACTIVE",
    "machineRate": 125.50,
    "createdAt": "2024-10-31T08:30:00Z"
  },
  "message": "Machine time entry started successfully"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Equipment equip-cnc-001 already has active time entry: mte-xyz789"
}
```

### 2. Stop Machine Time Entry

Stop an active machine time entry and calculate duration/cost.

**Endpoint**: `POST /api/v2/machine-time/:entryId/stop`

**URL Parameters**:
- `entryId`: Machine time entry ID

**Request Body** (optional):
```json
{
  "endTime": "2024-10-31T12:45:00Z"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "mte-abc123",
    "equipmentId": "equip-cnc-001",
    "workOrderId": "wo-2024-1234",
    "operationId": "op-drill-5678",
    "startTime": "2024-10-31T08:30:00Z",
    "endTime": "2024-10-31T12:45:00Z",
    "duration": 4.25,
    "status": "COMPLETED",
    "machineRate": 125.50,
    "machineCost": 533.38,
    "cycleCount": 425,
    "partCount": 420,
    "machineUtilization": 0.92
  },
  "message": "Machine time entry stopped successfully"
}
```

### 3. Pause Machine Time Entry

Temporarily pause an active machine time entry.

**Endpoint**: `POST /api/v2/machine-time/:entryId/pause`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "mte-abc123",
    "status": "PAUSED",
    "pausedAt": "2024-10-31T10:15:00Z"
  },
  "message": "Machine time entry paused successfully"
}
```

### 4. Resume Machine Time Entry

Resume a paused machine time entry.

**Endpoint**: `POST /api/v2/machine-time/:entryId/resume`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "mte-abc123",
    "status": "ACTIVE",
    "resumedAt": "2024-10-31T10:30:00Z"
  },
  "message": "Machine time entry resumed successfully"
}
```

### 5. Get Active Machine Time Entries

Retrieve all currently active machine time entries.

**Endpoint**: `GET /api/v2/machine-time/active`

**Query Parameters**:
- `equipmentId` (optional): Filter by specific equipment

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "mte-abc123",
      "equipmentId": "equip-cnc-001",
      "equipment": {
        "id": "equip-cnc-001",
        "name": "CNC Mill #1",
        "type": "CNC_MILL",
        "status": "RUNNING"
      },
      "workOrderId": "wo-2024-1234",
      "workOrder": {
        "id": "wo-2024-1234",
        "number": "WO-2024-1234",
        "product": "Part XYZ-789"
      },
      "startTime": "2024-10-31T08:30:00Z",
      "runningDuration": 2.5,
      "status": "ACTIVE",
      "cycleCount": 250,
      "partCount": 248
    }
  ],
  "count": 1
}
```

### 6. Get Machine Time History

Retrieve historical machine time entries for specific equipment.

**Endpoint**: `GET /api/v2/machine-time/history/:equipmentId`

**Query Parameters**:
- `startDate`: Start date for history (ISO 8601)
- `endDate`: End date for history (ISO 8601)

**Request Example**:
```
GET /api/v2/machine-time/history/equip-cnc-001?startDate=2024-10-01T00:00:00Z&endDate=2024-10-31T23:59:59Z
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "mte-hist001",
      "equipmentId": "equip-cnc-001",
      "workOrderId": "wo-2024-1100",
      "startTime": "2024-10-15T07:00:00Z",
      "endTime": "2024-10-15T15:30:00Z",
      "duration": 8.5,
      "machineCost": 1066.75,
      "cycleCount": 850,
      "partCount": 842,
      "machineUtilization": 0.94
    },
    {
      "id": "mte-hist002",
      "equipmentId": "equip-cnc-001",
      "workOrderId": "wo-2024-1101",
      "startTime": "2024-10-16T07:30:00Z",
      "endTime": "2024-10-16T16:00:00Z",
      "duration": 8.5,
      "machineCost": 1066.75,
      "cycleCount": 825,
      "partCount": 820,
      "machineUtilization": 0.91
    }
  ],
  "count": 2
}
```

### 7. Get Machine Utilization Metrics

Calculate machine utilization metrics for a specific time period.

**Endpoint**: `GET /api/v2/machine-time/utilization/:equipmentId`

**Query Parameters** (required):
- `startDate`: Start date for calculation
- `endDate`: End date for calculation

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "equipmentId": "equip-cnc-001",
    "period": {
      "startDate": "2024-10-01T00:00:00Z",
      "endDate": "2024-10-31T23:59:59Z"
    },
    "metrics": {
      "totalAvailableHours": 744,
      "totalOperatingHours": 512.5,
      "totalDowntimeHours": 45.3,
      "totalIdleHours": 186.2,
      "utilization": 0.689,
      "availability": 0.939,
      "performance": 0.912,
      "quality": 0.987,
      "oee": 0.638
    },
    "breakdown": {
      "productive": 512.5,
      "setup": 28.4,
      "maintenance": 45.3,
      "idle": 157.8
    }
  }
}
```

### 8. Get Machine Cost Summary

Get cost summary for machine operations within a time period.

**Endpoint**: `GET /api/v2/machine-time/costs/:equipmentId`

**Query Parameters** (required):
- `startDate`: Start date for cost calculation
- `endDate`: End date for cost calculation

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "equipmentId": "equip-cnc-001",
    "period": {
      "startDate": "2024-10-01T00:00:00Z",
      "endDate": "2024-10-31T23:59:59Z"
    },
    "costSummary": {
      "totalMachineHours": 512.5,
      "machineHourRate": 125.50,
      "totalMachineCost": 64318.75,
      "totalLaborHours": 520.0,
      "totalLaborCost": 18720.00,
      "totalOverheadCost": 12488.81,
      "totalCost": 95527.56,
      "averageCostPerHour": 186.39
    },
    "costByWorkOrder": [
      {
        "workOrderId": "wo-2024-1100",
        "workOrderNumber": "WO-2024-1100",
        "machineHours": 42.5,
        "machineCost": 5333.75,
        "laborCost": 1530.00,
        "overheadCost": 1029.57,
        "totalCost": 7893.32
      }
    ]
  }
}
```

### 9. Process Equipment Signal

Process equipment signals for automatic time tracking.

**Endpoint**: `POST /api/v2/machine-time/process-signal`

**Request Body**:
```json
{
  "equipmentId": "equip-cnc-001",
  "signalType": "START",
  "sourceType": "OPC_UA",
  "value": {
    "workOrderId": "wo-2024-1234",
    "operationId": "op-drill-5678",
    "programNumber": "PRG-1234"
  },
  "quality": "GOOD",
  "timestamp": "2024-10-31T08:30:00Z"
}
```

**Response** (202 Accepted):
```json
{
  "success": true,
  "message": "Equipment signal accepted for processing"
}
```

**Signal Types**:
- `START`: Machine started operation
- `STOP`: Machine stopped operation
- `RUNNING`: Machine is running (heartbeat)
- `IDLE`: Machine is idle
- `ERROR`: Machine error/fault
- `PAUSE`: Machine paused
- `RESUME`: Machine resumed

### 10. Handle Equipment Signal (Simplified)

Handle equipment signals with automatic action determination.

**Endpoint**: `POST /api/v2/machine-time/signal`

**Request Body**:
```json
{
  "equipmentId": "equip-cnc-001",
  "signalType": "START",
  "workOrderId": "wo-2024-1234",
  "operationId": "op-drill-5678"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "mte-sig123",
    "action": "STARTED",
    "entryId": "mte-abc123"
  },
  "message": "Equipment signal processed successfully"
}
```

### 11. Auto-Stop Idle Machines

Automatically stop time entries for idle machines.

**Endpoint**: `POST /api/v2/machine-time/auto-stop-idle`

**Request Body** (optional):
```json
{
  "idleTimeoutSeconds": 600
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "stoppedCount": 3
  },
  "message": "3 idle machine time entries stopped"
}
```

### 12. Validate Machine Time Entry

Validate a machine time entry for data integrity.

**Endpoint**: `GET /api/v2/machine-time/:entryId/validate`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "entryId": "mte-abc123",
    "isValid": true,
    "validationResults": {
      "hasValidEquipment": true,
      "hasValidTimeRange": true,
      "hasValidWorkOrder": true,
      "hasValidCostData": true,
      "hasNoOverlaps": true
    },
    "warnings": [],
    "errors": []
  }
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Error message describing the issue",
  "errorCode": "ERROR_CODE",
  "details": {
    "field": "Additional error context"
  }
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|------------|------------|-------------|
| 400 | INVALID_REQUEST | Request validation failed |
| 400 | EQUIPMENT_BUSY | Equipment already has active entry |
| 400 | INVALID_TIME_RANGE | End time before start time |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Conflicting time entries |
| 422 | UNPROCESSABLE | Business rule violation |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |

## Pagination

List endpoints support pagination using standard parameters:

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 200)
- `sort`: Sort field (e.g., "startTime")
- `order`: Sort order ("asc" or "desc")

**Paginated Response Headers**:
```http
X-Total-Count: 1250
X-Page-Count: 25
X-Current-Page: 1
X-Per-Page: 50
Link: <.../active?page=2>; rel="next", <.../active?page=25>; rel="last"
```

## Real-World Usage Examples

### Example 1: Track Machine Time for Production Run

```javascript
// Start machine time when production begins
const startResponse = await fetch('/api/v2/machine-time/start', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token123',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    equipmentId: 'equip-cnc-001',
    workOrderId: 'wo-2024-1234',
    operationId: 'op-drill-5678',
    entrySource: 'KIOSK',
    dataSource: 'Shop Floor Tablet',
    machineRate: 125.50
  })
});

const { data: entry } = await startResponse.json();
console.log(`Started tracking: ${entry.id}`);

// ... Production runs ...

// Stop machine time when production completes
const stopResponse = await fetch(`/api/v2/machine-time/${entry.id}/stop`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token123'
  }
});

const { data: completed } = await stopResponse.json();
console.log(`Duration: ${completed.duration} hours, Cost: $${completed.machineCost}`);
```

### Example 2: Monitor Active Machines

```javascript
// Poll active machines every 30 seconds
setInterval(async () => {
  const response = await fetch('/api/v2/machine-time/active', {
    headers: {
      'Authorization': 'Bearer token123'
    }
  });

  const { data: activeEntries } = await response.json();

  activeEntries.forEach(entry => {
    console.log(`${entry.equipment.name}: Running for ${entry.runningDuration} hours`);
  });
}, 30000);
```

### Example 3: Generate Monthly Utilization Report

```javascript
async function generateMonthlyReport(equipmentId, year, month) {
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Get utilization metrics
  const utilizationResponse = await fetch(
    `/api/v2/machine-time/utilization/${equipmentId}?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: { 'Authorization': 'Bearer token123' }
    }
  );

  // Get cost summary
  const costResponse = await fetch(
    `/api/v2/machine-time/costs/${equipmentId}?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: { 'Authorization': 'Bearer token123' }
    }
  );

  const utilization = await utilizationResponse.json();
  const costs = await costResponse.json();

  return {
    equipment: equipmentId,
    period: `${year}-${month}`,
    oee: utilization.data.metrics.oee,
    totalHours: utilization.data.metrics.totalOperatingHours,
    totalCost: costs.data.costSummary.totalCost,
    costPerHour: costs.data.costSummary.averageCostPerHour
  };
}
```

### Example 4: Process PLC Signals

```javascript
// Example PLC signal handler
async function handlePLCSignal(signal) {
  const signalData = {
    equipmentId: signal.machineId,
    signalType: mapPLCStatusToSignalType(signal.status),
    sourceType: 'OPC_UA',
    value: {
      workOrderId: signal.currentJob,
      programNumber: signal.programNumber,
      cycleCount: signal.cycleCounter
    },
    quality: signal.quality || 'GOOD'
  };

  const response = await fetch('/api/v2/machine-time/process-signal', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer token123',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(signalData)
  });

  if (!response.ok) {
    console.error(`Signal processing failed: ${response.status}`);
  }
}

function mapPLCStatusToSignalType(plcStatus) {
  const statusMap = {
    'CYCLE_START': 'START',
    'CYCLE_END': 'STOP',
    'IN_CYCLE': 'RUNNING',
    'WAITING': 'IDLE',
    'ALARM': 'ERROR'
  };
  return statusMap[plcStatus] || 'IDLE';
}
```

## Webhook Events

The system can send webhook notifications for machine time events:

### Available Events

- `machine.time.started`: Machine time entry started
- `machine.time.stopped`: Machine time entry stopped
- `machine.time.paused`: Machine time entry paused
- `machine.time.resumed`: Machine time entry resumed
- `machine.idle.detected`: Machine idle detected
- `machine.error.detected`: Machine error detected

### Webhook Payload Example

```json
{
  "event": "machine.time.stopped",
  "timestamp": "2024-10-31T12:45:00Z",
  "data": {
    "entryId": "mte-abc123",
    "equipmentId": "equip-cnc-001",
    "duration": 4.25,
    "cost": 533.38
  }
}
```

## Best Practices

1. **Always validate equipment availability** before starting new time entries
2. **Use appropriate entry sources** to track data origin for auditing
3. **Implement retry logic** with exponential backoff for transient failures
4. **Cache active entries** locally to reduce API calls
5. **Use webhooks** for real-time updates instead of polling when possible
6. **Batch historical queries** to respect rate limits
7. **Store entry IDs** for reliable stop/pause operations
8. **Implement signal debouncing** when processing equipment signals
9. **Monitor idle time** and implement auto-stop for cost control
10. **Validate time ranges** before submitting to avoid conflicts

## Security Considerations

- All API communications must use HTTPS
- Implement API key rotation every 90 days
- Use IP allowlisting for production environments
- Implement request signing for critical operations
- Log all machine time modifications for audit trails
- Encrypt sensitive cost data in transit and at rest
- Implement role-based access control (RBAC)
- Monitor for unusual patterns (e.g., excessive duration entries)