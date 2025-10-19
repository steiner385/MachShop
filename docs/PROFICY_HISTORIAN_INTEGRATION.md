# GE Proficy Historian Integration

## Overview

This document describes the GE Proficy Historian integration for the MES system. The integration enables automatic storage of equipment data, process data, and material tracking information in GE Proficy Historian for long-term time-series analysis and reporting.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MES Application                          │
│                                                              │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │ L2 Equipment     │────────>│ ProficyHistorianAdapter │  │
│  │ Integration      │         └────────┬────────────────┘  │
│  └──────────────────┘                  │                    │
│                                        │                    │
│  ┌──────────────────┐                  │                    │
│  │ Process Data     │─────────────────>│                    │
│  │ Collection       │                  │                    │
│  └──────────────────┘                  │                    │
│                                        │                    │
│  ┌──────────────────┐                  │                    │
│  │ Material         │─────────────────>│                    │
│  │ Tracking         │                  │                    │
│  └──────────────────┘                  │                    │
└────────────────────────────────────────┼────────────────────┘
                                         │
                                         │ HTTP/HTTPS
                                         │ REST API
                                         v
                           ┌─────────────────────────┐
                           │  GE Proficy Historian   │
                           │                         │
                           │  - Time-series storage  │
                           │  - Data aggregation     │
                           │  - Historical queries   │
                           │  - Real-time streaming  │
                           └─────────────────────────┘
```

## Features

### Data Collection
- **Equipment Data**: Automatic push of sensor readings, alarms, and events to Proficy tags
- **Process Data**: Storage of process parameters, trends, and quality metrics
- **Material Tracking**: Traceability events stored for lot genealogy
- **Quality Data**: Inspection results and test data preservation

### Data Queries
- **Historical Queries**: Retrieve time-series data for analysis
- **Aggregated Data**: Min, max, average, count over time periods
- **Real-time Queries**: Latest values from Proficy tags
- **Trend Analysis**: Long-term trend data for process optimization

### Tag Management
- **Auto-configuration**: Automatically create tags for all equipment
- **Dynamic Tag Creation**: Create tags on-demand via API
- **Tag Naming Convention**: `EQUIPMENT.<EQUIP_CODE>.<DATA_TYPE>`
- **Tag Metadata**: Description, units, data type, compression settings

## Installation

### 1. Configuration

Add the following to your `.env` file:

```bash
# GE Proficy Historian Configuration
PROFICY_HISTORIAN_URL=http://your-historian-server:8080
PROFICY_HISTORIAN_USERNAME=your_username
PROFICY_HISTORIAN_PASSWORD=your_password
PROFICY_HISTORIAN_SERVER=DefaultServer
PROFICY_HISTORIAN_AUTH_TYPE=basic
PROFICY_HISTORIAN_BUFFER_SIZE=100
PROFICY_HISTORIAN_AUTO_CONFIGURE=false
```

### 2. Database Migration

The database schema has been updated to support HISTORIAN integration type:

```bash
npx prisma migrate dev
```

### 3. Seed Data

Run the seed script to create the integration configuration:

```bash
npx prisma db seed
```

This creates a disabled Proficy Historian configuration that you can enable after configuring the connection details.

### 4. Enable Integration

Update the integration configuration in the database:

```sql
UPDATE integration_configs
SET enabled = true
WHERE name = 'proficy_historian';
```

Or use the API:

```bash
curl -X PATCH http://localhost:3000/api/v1/integrations/proficy_historian \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

## API Endpoints

### Health Check
**GET** `/api/v1/historian/health`

Check connection status to Proficy Historian.

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "responseTime": 145
  }
}
```

### Tag Management

#### Create Tag
**POST** `/api/v1/historian/tags/create`

Create a new tag in Proficy Historian.

**Request Body:**
```json
{
  "tagName": "EQUIPMENT.CNC001.TEMPERATURE",
  "description": "CNC Machine Temperature Sensor",
  "dataType": "Float",
  "engineeringUnits": "°C",
  "compressionType": "Swinging Door",
  "compressionDeviation": 0.1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tag created successfully",
  "data": {
    "created": true
  }
}
```

#### Auto-Configure Tags
**POST** `/api/v1/historian/tags/auto-configure`

Automatically create tags for all active equipment.

**Response:**
```json
{
  "success": true,
  "message": "Auto-configuration completed",
  "data": {
    "created": 42,
    "failed": 0
  }
}
```

### Data Writing

#### Write Data Points
**POST** `/api/v1/historian/data/write`

Write data points to Proficy Historian.

**Request Body:**
```json
{
  "dataPoints": [
    {
      "tagName": "EQUIPMENT.CNC001.TEMPERATURE",
      "value": 75.5,
      "timestamp": "2025-10-17T12:00:00Z",
      "quality": 100
    },
    {
      "tagName": "EQUIPMENT.CNC001.PRESSURE",
      "value": 30.2,
      "timestamp": "2025-10-17T12:00:00Z",
      "quality": 100
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wrote 2 data points",
  "data": {
    "pointsWritten": 2,
    "pointsFailed": 0,
    "duration": 145
  }
}
```

#### Push Equipment Data
**POST** `/api/v1/historian/equipment/:equipmentDataCollectionId/push`

Push a specific equipment data collection to Proficy Historian.

**Response:**
```json
{
  "success": true,
  "message": "Equipment data pushed to historian",
  "data": {
    "pointsWritten": 1,
    "pointsFailed": 0,
    "duration": 98
  }
}
```

#### Push Process Data
**POST** `/api/v1/historian/process/:processDataCollectionId/push`

Push a specific process data collection to Proficy Historian.

**Response:**
```json
{
  "success": true,
  "message": "Process data pushed to historian",
  "data": {
    "pointsWritten": 5,
    "pointsFailed": 0,
    "duration": 156
  }
}
```

### Data Querying

#### Query Historical Data
**GET** `/api/v1/historian/data/query`

Query historical time-series data from Proficy Historian.

**Query Parameters:**
- `tagNames` (required): Comma-separated tag names
- `startTime` (required): ISO 8601 start time
- `endTime` (required): ISO 8601 end time
- `samplingMode` (optional): RawByTime | Interpolated | Average | Minimum | Maximum | Count
- `intervalMilliseconds` (optional): Sampling interval for aggregated queries
- `maxResults` (optional): Maximum number of results (default: 10000)

**Example:**
```
GET /api/v1/historian/data/query?tagNames=EQUIPMENT.CNC001.TEMPERATURE,EQUIPMENT.CNC001.PRESSURE&startTime=2025-10-17T00:00:00Z&endTime=2025-10-17T23:59:59Z&samplingMode=Average&intervalMilliseconds=3600000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dataPoints": [
      {
        "tagName": "EQUIPMENT.CNC001.TEMPERATURE",
        "timestamp": "2025-10-17T12:00:00Z",
        "value": 75.5,
        "quality": 100
      },
      {
        "tagName": "EQUIPMENT.CNC001.TEMPERATURE",
        "timestamp": "2025-10-17T13:00:00Z",
        "value": 76.2,
        "quality": 100
      }
    ],
    "recordCount": 2,
    "duration": 234
  }
}
```

#### Query Aggregated Data
**GET** `/api/v1/historian/data/aggregate`

Query aggregated statistical data.

**Query Parameters:**
- `tagNames` (required): Comma-separated tag names
- `startTime` (required): ISO 8601 start time
- `endTime` (required): ISO 8601 end time
- `aggregateType` (required): Average | Minimum | Maximum | Count
- `intervalMinutes` (optional): Aggregation interval in minutes (default: 60)

**Example:**
```
GET /api/v1/historian/data/aggregate?tagNames=EQUIPMENT.CNC001.TEMPERATURE&startTime=2025-10-17T00:00:00Z&endTime=2025-10-17T23:59:59Z&aggregateType=Average&intervalMinutes=60
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dataPoints": [
      {
        "tagName": "EQUIPMENT.CNC001.TEMPERATURE",
        "timestamp": "2025-10-17T00:00:00Z",
        "value": 75.0,
        "quality": 100
      }
    ],
    "recordCount": 24,
    "duration": 189
  }
}
```

### Buffer Management

#### Flush Buffer
**POST** `/api/v1/historian/buffer/flush`

Manually flush buffered data points to historian.

**Response:**
```json
{
  "success": true,
  "message": "Buffer flushed successfully",
  "data": {
    "pointsWritten": 15,
    "pointsFailed": 0,
    "duration": 234
  }
}
```

## Tag Naming Convention

Tags in Proficy Historian follow a hierarchical naming convention:

```
<CATEGORY>.<IDENTIFIER>.<DATA_TYPE>

Examples:
- EQUIPMENT.CNC001.TEMPERATURE
- EQUIPMENT.CNC001.PRESSURE
- EQUIPMENT.CNC001.SPINDLE_SPEED
- PROCESS.CNC001.CYCLE_TIME
- PROCESS.CNC001.PART_COUNT
- MATERIAL.LOT12345.LOCATION
```

### Categories
- **EQUIPMENT**: Equipment sensor data, alarms, status
- **PROCESS**: Process parameters, trends, performance
- **MATERIAL**: Material tracking, lot information
- **QUALITY**: Inspection results, test data

## Data Buffering

The adapter implements automatic data buffering to optimize network performance:

- **Buffer Size**: Configurable (default: 100 data points)
- **Auto-Flush**: Triggered when buffer is full
- **Timed Flush**: Automatic flush after 5 seconds of inactivity
- **Manual Flush**: Available via API endpoint

## Integration with L2 Equipment

The Proficy Historian adapter integrates seamlessly with the L2 Equipment Integration system:

### Automatic Data Push

Equipment data collections are automatically pushed to Proficy Historian when created:

```typescript
// Example: Equipment data collection triggers historian write
const dataCollection = await EquipmentDataCollection.create({
  equipmentId: 'CNC001',
  dataCollectionType: 'SENSOR',
  value: 75.5,
  unit: '°C',
});

// Automatically pushed to Proficy tag: EQUIPMENT.CNC001.SENSOR
```

### Process Data Push

Process data is pushed to historian upon completion:

```typescript
// Example: Process completion triggers historian write
const processData = await ProcessDataCollection.complete({
  processDataCollectionId: 'proc_123',
  parameters: {
    CYCLE_TIME: 45.2,
    PART_COUNT: 150,
    TEMPERATURE_AVG: 75.5,
  },
});

// Creates tags:
// - PROCESS.CNC001.CYCLE_TIME
// - PROCESS.CNC001.PART_COUNT
// - PROCESS.CNC001.TEMPERATURE_AVG
```

## Testing

### Unit Tests

Run the Proficy Historian adapter tests:

```bash
npm run test -- ProficyHistorianAdapter.test.ts
```

### Manual Testing

1. **Test Connection**:
   ```bash
   curl http://localhost:3000/api/v1/historian/health \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Create Test Tag**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/historian/tags/create \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "tagName": "TEST.DEMO.VALUE",
       "description": "Test tag",
       "dataType": "Float"
     }'
   ```

3. **Write Test Data**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/historian/data/write \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "dataPoints": [{
         "tagName": "TEST.DEMO.VALUE",
         "value": 123.45,
         "timestamp": "2025-10-17T12:00:00Z"
       }]
     }'
   ```

4. **Query Data**:
   ```bash
   curl "http://localhost:3000/api/v1/historian/data/query?tagNames=TEST.DEMO.VALUE&startTime=2025-10-17T00:00:00Z&endTime=2025-10-17T23:59:59Z" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Troubleshooting

### Connection Issues

**Problem**: `connected: false` in health check

**Solutions**:
1. Verify Proficy Historian server is running
2. Check network connectivity to historian server
3. Verify username/password credentials
4. Check firewall rules allow connection on port 8080

### Authentication Failures

**Problem**: `401 Unauthorized` errors

**Solutions**:
1. Verify credentials in `.env` file
2. Check authentication type (basic vs windows)
3. Ensure user has permissions in Proficy Historian

### Tag Creation Failures

**Problem**: Tags fail to create

**Solutions**:
1. Check tag naming convention (no invalid characters)
2. Verify user has write permissions
3. Check if tag already exists
4. Review Proficy Historian logs

### Data Write Failures

**Problem**: Data points fail to write

**Solutions**:
1. Verify tags exist before writing data
2. Check data type matches tag configuration
3. Verify timestamp format (ISO 8601)
4. Check quality value (0-100)

## Performance Considerations

### Optimization Tips

1. **Use Buffering**: Enable buffering for high-frequency data
2. **Batch Writes**: Write multiple data points in single request
3. **Tag Compression**: Enable Swinging Door compression for storage efficiency
4. **Query Limits**: Use `maxResults` to limit query response size
5. **Aggregate Queries**: Use aggregation for large time ranges

### Monitoring

Monitor integration health using:

```bash
# Check health status
curl http://localhost:3000/api/v1/historian/health \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check integration logs
SELECT * FROM integration_logs
WHERE config_id = (
  SELECT id FROM integration_configs
  WHERE name = 'proficy_historian'
)
ORDER BY created_at DESC
LIMIT 10;
```

## Future Enhancements

- [ ] Real-time data streaming support
- [ ] Automatic tag synchronization
- [ ] Enhanced compression algorithms
- [ ] Multi-historian support
- [ ] Alarm and event integration
- [ ] Trend calculation service
- [ ] Dashboard widgets for historian data
- [ ] Scheduled data archival

## Support

For issues or questions:
- Check GE Proficy Historian documentation
- Review integration logs in the database
- Contact system administrator
- Report bugs in MES issue tracker

## References

- [GE Proficy Historian Documentation](https://www.ge.com/digital/documentation/proficy-historian/)
- [ISA-95 Standard](https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95)
- [MES Integration Framework](./INTEGRATION_FRAMEWORK.md)
- [L2 Equipment Integration](./L2_EQUIPMENT_INTEGRATION.md)
