# GE Proficy Historian Surrogate API Documentation

## Overview

The GE Proficy Historian Surrogate provides a comprehensive REST API that mimics the behavior of GE Proficy Historian for testing purposes. This documentation covers all available endpoints, request/response formats, and usage examples.

## Base URL

```
http://localhost:8080/historian
```

## Authentication

All API endpoints require HTTP Basic Authentication unless otherwise specified.

**Default Credentials:**
- Username: `historian`
- Password: `password`

**Example:**
```bash
curl -u historian:password http://localhost:8080/historian/health
```

## Response Format

All API responses follow a consistent format:

```json
{
  "Success": true,
  "Message": "Operation completed successfully",
  "Data": { ... },
  "Timestamp": "2025-01-01T12:00:00.000Z"
}
```

**Error Response:**
```json
{
  "Success": false,
  "Error": "Error description",
  "ErrorCode": "ERR_CODE",
  "Timestamp": "2025-01-01T12:00:00.000Z"
}
```

---

## Health and Status Endpoints

### GET /historian/health

Get basic health status of the surrogate server.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Example:**
```bash
curl -u historian:password http://localhost:8080/historian/health
```

### GET /historian/server/info

Get detailed server information and capabilities.

**Response:**
```json
{
  "name": "GE Proficy Historian Surrogate",
  "version": "1.0.0",
  "description": "Mock implementation of GE Proficy Historian for testing",
  "capabilities": [
    "data_collection",
    "data_retrieval",
    "tag_management",
    "aggregations",
    "compression"
  ],
  "api_version": "1.0",
  "supported_formats": ["json", "xml"]
}
```

### GET /historian/server/status

Get comprehensive server status including storage and performance metrics.

**Response:**
```json
{
  "server": {
    "status": "running",
    "uptime": 3600,
    "port": 8080,
    "connections": 5
  },
  "storage": {
    "totalDataPoints": 50000,
    "totalTags": 150,
    "storageUtilization": 0.25,
    "compressionRatio": 0.7
  },
  "performance": {
    "requestsPerSecond": 45.2,
    "averageResponseTime": 12.5,
    "memoryUsage": {
      "used": 256,
      "total": 1024
    }
  }
}
```

---

## Tag Management Endpoints

### GET /historian/tags

Retrieve all tags with optional filtering.

**Query Parameters:**
- `collector` (optional): Filter by collector name
- `dataType` (optional): Filter by data type (Float, Integer, Boolean, String, DateTime)
- `activeOnly` (optional): Only return active tags (true/false)

**Response:**
```json
{
  "Success": true,
  "tags": [
    {
      "id": "tag-1",
      "tagName": "PRODUCTION.LINE1.TEMPERATURE",
      "description": "Production line 1 temperature sensor",
      "dataType": "Float",
      "engineeringUnits": "°C",
      "collector": "PRODUCTION",
      "compressionType": "Swinging Door",
      "compressionDeviation": 0.1,
      "isActive": true,
      "defaultQuality": 100,
      "createdAt": "2025-01-01T10:00:00.000Z",
      "updatedAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl -u historian:password "http://localhost:8080/historian/tags?collector=PRODUCTION&activeOnly=true"
```

### GET /historian/tags/{tagName}

Retrieve a specific tag by name.

**Path Parameters:**
- `tagName`: The tag name (URL encoded if necessary)

**Response:**
```json
{
  "Success": true,
  "tag": {
    "id": "tag-1",
    "tagName": "PRODUCTION.LINE1.TEMPERATURE",
    "description": "Production line 1 temperature sensor",
    "dataType": "Float",
    "engineeringUnits": "°C",
    "collector": "PRODUCTION",
    "isActive": true
  }
}
```

**Example:**
```bash
curl -u historian:password http://localhost:8080/historian/tags/PRODUCTION.LINE1.TEMPERATURE
```

### POST /historian/tags

Create a new tag.

**Request Body:**
```json
{
  "tagName": "PRODUCTION.LINE2.PRESSURE",
  "description": "Production line 2 pressure sensor",
  "dataType": "Float",
  "engineeringUnits": "psi",
  "collector": "PRODUCTION",
  "compressionType": "Swinging Door",
  "compressionDeviation": 0.5,
  "storageType": "Normal",
  "retentionHours": 168,
  "isActive": true,
  "defaultQuality": 100,
  "qualityThreshold": 50
}
```

**Response:**
```json
{
  "Success": true,
  "tag": {
    "id": "tag-2",
    "tagName": "PRODUCTION.LINE2.PRESSURE",
    "description": "Production line 2 pressure sensor",
    "dataType": "Float",
    "createdAt": "2025-01-01T12:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -u historian:password -X POST http://localhost:8080/historian/tags \
  -H "Content-Type: application/json" \
  -d '{
    "tagName": "TEST.SENSOR.TEMP",
    "description": "Test temperature sensor",
    "dataType": "Float",
    "engineeringUnits": "°C"
  }'
```

### PUT /historian/tags/{tagName}

Update an existing tag.

**Path Parameters:**
- `tagName`: The tag name to update

**Request Body:**
```json
{
  "description": "Updated description",
  "engineeringUnits": "K",
  "isActive": false
}
```

**Response:**
```json
{
  "Success": true,
  "tag": {
    "tagName": "PRODUCTION.LINE2.PRESSURE",
    "description": "Updated description",
    "engineeringUnits": "K",
    "isActive": false,
    "updatedAt": "2025-01-01T12:30:00.000Z"
  }
}
```

### DELETE /historian/tags/{tagName}

Delete a tag.

**Path Parameters:**
- `tagName`: The tag name to delete

**Response:**
```json
{
  "Success": true,
  "Message": "Tag deleted successfully"
}
```

---

## Data Collection Endpoints

### POST /historian/data/write

Write multiple data points to the historian.

**Request Body:**
```json
{
  "Data": [
    {
      "TagName": "PRODUCTION.LINE1.TEMPERATURE",
      "Value": 75.5,
      "Timestamp": "2025-01-01T12:00:00.000Z",
      "Quality": 100
    },
    {
      "TagName": "PRODUCTION.LINE1.PRESSURE",
      "Value": 150.2,
      "Timestamp": "2025-01-01T12:00:00.000Z",
      "Quality": 100
    }
  ]
}
```

**Response:**
```json
{
  "Success": true,
  "PointsWritten": 2,
  "PointsFailed": 0,
  "ProcessingTime": 25.3,
  "CompressionApplied": true,
  "Message": "Data written successfully"
}
```

**Error Response:**
```json
{
  "Success": false,
  "PointsWritten": 1,
  "PointsFailed": 1,
  "Errors": [
    "Tag INVALID.TAG not found"
  ]
}
```

**Example:**
```bash
curl -u historian:password -X POST http://localhost:8080/historian/data/write \
  -H "Content-Type: application/json" \
  -d '{
    "Data": [
      {
        "TagName": "TEST.SENSOR.TEMP",
        "Value": 25.5,
        "Timestamp": "2025-01-01T12:00:00.000Z",
        "Quality": 100
      }
    ]
  }'
```

### POST /historian/data/write/single

Write a single data point.

**Request Body:**
```json
{
  "TagName": "PRODUCTION.LINE1.TEMPERATURE",
  "Value": 75.5,
  "Timestamp": "2025-01-01T12:00:00.000Z",
  "Quality": 100
}
```

**Response:**
```json
{
  "Success": true,
  "Message": "Data point written successfully",
  "ProcessingTime": 5.2
}
```

### POST /historian/data/write/buffered

Write data using buffered mode for high-throughput scenarios.

**Request Body:**
```json
{
  "Data": [
    {
      "TagName": "PRODUCTION.LINE1.TEMPERATURE",
      "Value": 75.5,
      "Timestamp": "2025-01-01T12:00:00.000Z",
      "Quality": 100
    }
  ],
  "BufferSize": 1000,
  "FlushInterval": 5000
}
```

**Response:**
```json
{
  "Success": true,
  "BufferStatus": {
    "currentSize": 1,
    "maxSize": 1000,
    "lastFlush": "2025-01-01T12:00:00.000Z"
  },
  "Message": "Data added to buffer"
}
```

---

## Data Retrieval Endpoints

### GET /historian/data/query

Query historical data points.

**Query Parameters:**
- `tagNames` (required): Comma-separated list of tag names
- `startTime` (required): Start time (ISO 8601 format)
- `endTime` (required): End time (ISO 8601 format)
- `maxResults` (optional): Maximum number of results (default: 1000)
- `qualityFilter` (optional): Minimum quality threshold (0-100)

**Response:**
```json
{
  "Success": true,
  "Data": [
    {
      "TagName": "PRODUCTION.LINE1.TEMPERATURE",
      "Value": 75.5,
      "Timestamp": "2025-01-01T12:00:00.000Z",
      "Quality": 100
    },
    {
      "TagName": "PRODUCTION.LINE1.TEMPERATURE",
      "Value": 76.1,
      "Timestamp": "2025-01-01T12:01:00.000Z",
      "Quality": 100
    }
  ],
  "TotalPoints": 2,
  "ProcessingTime": 15.7
}
```

**Example:**
```bash
curl -u historian:password "http://localhost:8080/historian/data/query?tagNames=TEST.SENSOR.TEMP&startTime=2025-01-01T10:00:00Z&endTime=2025-01-01T14:00:00Z&maxResults=100"
```

### GET /historian/data/recent

Get most recent data points for a tag.

**Query Parameters:**
- `tagName` (required): Tag name
- `count` (optional): Number of recent points (default: 10, max: 100)

**Response:**
```json
{
  "Success": true,
  "Data": [
    {
      "TagName": "PRODUCTION.LINE1.TEMPERATURE",
      "Value": 76.8,
      "Timestamp": "2025-01-01T12:05:00.000Z",
      "Quality": 100
    },
    {
      "TagName": "PRODUCTION.LINE1.TEMPERATURE",
      "Value": 76.1,
      "Timestamp": "2025-01-01T12:04:00.000Z",
      "Quality": 100
    }
  ]
}
```

**Example:**
```bash
curl -u historian:password "http://localhost:8080/historian/data/recent?tagName=TEST.SENSOR.TEMP&count=5"
```

### POST /historian/data/aggregate

Calculate aggregations on historical data.

**Request Body:**
```json
{
  "TagName": "PRODUCTION.LINE1.TEMPERATURE",
  "AggregationType": "Average",
  "StartTime": "2025-01-01T10:00:00.000Z",
  "EndTime": "2025-01-01T14:00:00.000Z",
  "Interval": "1h"
}
```

**Supported Aggregation Types:**
- `Average`
- `Minimum`
- `Maximum`
- `Sum`
- `Count`
- `StandardDeviation`
- `Range`

**Response:**
```json
{
  "Success": true,
  "TagName": "PRODUCTION.LINE1.TEMPERATURE",
  "AggregationType": "Average",
  "Value": 75.3,
  "Count": 240,
  "StartTime": "2025-01-01T10:00:00.000Z",
  "EndTime": "2025-01-01T14:00:00.000Z",
  "ProcessingTime": 8.2
}
```

**Example:**
```bash
curl -u historian:password -X POST http://localhost:8080/historian/data/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "TagName": "TEST.SENSOR.TEMP",
    "AggregationType": "Average",
    "StartTime": "2025-01-01T10:00:00Z",
    "EndTime": "2025-01-01T14:00:00Z"
  }'
```

---

## Test Scenario Management

### GET /historian/scenarios

Get list of available test scenarios.

**Response:**
```json
{
  "Success": true,
  "Scenarios": [
    {
      "name": "manufacturing_line_1",
      "displayName": "Manufacturing Line 1",
      "description": "Complete CNC machining line with temperature, pressure, and vibration sensors",
      "tagCount": 25,
      "dataPointCount": 5000,
      "duration": 3600,
      "equipmentCount": 5
    },
    {
      "name": "quality_control_station",
      "displayName": "Quality Control Station",
      "description": "Quality control measurements and inspection data",
      "tagCount": 15,
      "dataPointCount": 2000,
      "duration": 1800,
      "equipmentCount": 3
    }
  ]
}
```

### POST /historian/scenarios/{scenarioName}/load

Load a test scenario with sample data.

**Path Parameters:**
- `scenarioName`: Name of the scenario to load

**Request Body:**
```json
{
  "clearExisting": true,
  "options": {
    "batchSize": 100,
    "verbose": false
  }
}
```

**Response:**
```json
{
  "Success": true,
  "ScenarioName": "manufacturing_line_1",
  "TagsLoaded": 25,
  "DataPointsLoaded": 5000,
  "LoadingTime": 2340.5,
  "Message": "Scenario loaded successfully"
}
```

### POST /historian/scenarios/reset

Reset all data (clear tags and data points).

**Response:**
```json
{
  "Success": true,
  "Message": "All data has been reset",
  "TagsRemoved": 50,
  "DataPointsRemoved": 15000
}
```

---

## Error Simulation

### GET /historian/simulation/errors/scenarios

Get available error simulation scenarios.

**Response:**
```json
{
  "Success": true,
  "Scenarios": [
    {
      "name": "null_values",
      "description": "Inject null and undefined values into data streams"
    },
    {
      "name": "extreme_values",
      "description": "Test with extreme numeric values (infinity, max/min)"
    },
    {
      "name": "timestamp_edges",
      "description": "Test with edge case timestamps"
    },
    {
      "name": "data_corruption",
      "description": "Simulate data corruption scenarios"
    }
  ]
}
```

### POST /historian/simulation/errors/activate

Activate an error simulation scenario.

**Request Body:**
```json
{
  "scenario": "null_values",
  "enabled": true
}
```

**Response:**
```json
{
  "Success": true,
  "Message": "Error scenario 'null_values' activated",
  "ActiveScenarios": ["null_values"]
}
```

### GET /historian/simulation/errors/status

Get current error simulation status.

**Response:**
```json
{
  "Success": true,
  "Enabled": true,
  "ActiveScenarios": ["null_values", "extreme_values"],
  "ErrorRate": 0.05,
  "TotalErrorsSimulated": 127
}
```

---

## Performance Monitoring

### GET /historian/performance/metrics

Get performance metrics and statistics.

**Response:**
```json
{
  "Success": true,
  "Metrics": {
    "requestsPerSecond": 45.2,
    "averageResponseTime": 12.5,
    "totalRequests": 15247,
    "totalErrors": 23,
    "uptime": 86400,
    "memoryUsage": {
      "used": 256,
      "total": 1024,
      "percentage": 25.0
    },
    "storage": {
      "dataPoints": 50000,
      "tags": 150,
      "compressionRatio": 0.7
    }
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `ERR_AUTH_REQUIRED` | Authentication required |
| `ERR_AUTH_INVALID` | Invalid credentials |
| `ERR_TAG_NOT_FOUND` | Tag not found |
| `ERR_TAG_EXISTS` | Tag already exists |
| `ERR_INVALID_DATA` | Invalid data format |
| `ERR_VALIDATION_FAILED` | Data validation failed |
| `ERR_STORAGE_FULL` | Storage capacity exceeded |
| `ERR_RATE_LIMITED` | Request rate limit exceeded |
| `ERR_SERVER_ERROR` | Internal server error |

---

## Data Types

### Tag Data Types

- **Float**: Floating-point numbers (IEEE 754 double precision)
- **Integer**: 32-bit signed integers
- **Boolean**: True/false values
- **String**: Text strings (UTF-8 encoded)
- **DateTime**: ISO 8601 formatted timestamps

### Quality Values

Quality values range from 0-100:
- **100**: Good quality data
- **95-99**: Good with minor issues
- **50-94**: Questionable quality
- **0-49**: Bad quality data
- **0**: No value/null data

---

## Rate Limits

- **Default**: 1000 requests per 15 minutes per IP
- **Data Write**: 100 requests per minute per IP
- **Data Query**: 200 requests per minute per IP
- **Tag Management**: 50 requests per minute per IP

Rate limits can be configured via server settings.

---

## Best Practices

1. **Batch Data Writes**: Use bulk write endpoints for better performance
2. **Quality Filtering**: Filter by quality to avoid processing bad data
3. **Time Range Limits**: Limit query time ranges to avoid timeouts
4. **Compression**: Enable compression for numeric data types
5. **Authentication**: Always use HTTPS in production environments
6. **Error Handling**: Implement retry logic with exponential backoff
7. **Monitoring**: Monitor server health and performance metrics

---

## Examples

See the [Usage Guide](USAGE_GUIDE.md) for comprehensive examples and integration patterns.