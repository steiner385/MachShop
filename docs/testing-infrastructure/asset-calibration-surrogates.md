# Asset & Calibration Management Surrogates - Testing Infrastructure

## Overview

The Asset & Calibration Management Surrogates are comprehensive mock implementations of IBM Maximo (asset management) and IndySoft (calibration management) APIs designed to enable integration testing for equipment management and calibration workflows without requiring access to live systems during CI/CD testing.

**Issue**: [#243 - Testing Infrastructure: Asset/Calibration Management Surrogates (Maximo, IndySoft)](https://github.com/steiner385/MachShop/issues/243)

## Features

### IBM Maximo Surrogate - Asset Management
- **Equipment Master Data Management**: Equipment lifecycle, specifications, and status tracking
- **Work Order Management**: Preventive and corrective maintenance work orders
- **Preventive Maintenance Scheduling**: Automated PM schedule generation and work order creation
- **Equipment Downtime Tracking**: Downtime events, MTBF/MTTR metrics, availability tracking
- **Spare Parts Management**: Parts inventory, usage tracking, and reorder management
- **Equipment Metrics & KPIs**: Availability, reliability, and maintenance cost tracking
- **Data Export to ERP**: Equipment master data export for ERP surrogate integration

### IndySoft Surrogate - Calibration Management
- **Gauge Master Data Management**: Gauge specifications, accuracy, measurement ranges
- **Calibration Scheduling**: Frequency-based calibration due date management
- **Calibration Records**: As-found/as-left readings, environmental conditions, uncertainty
- **Gage R&R Studies**: Measurement system analysis and repeatability/reproducibility
- **Out-of-Tolerance Management**: OOT detection, impact analysis, corrective actions
- **Calibration Due Notifications**: Automated reminders and overdue tracking
- **Data Export to ERP**: Gauge master data export for ERP surrogate integration

### Standards Compliance
- **ISO 17025** for calibration laboratory competence
- **AS9100** for asset management and maintenance
- **NIST** traceability for calibration standards
- **MTBF/MTTR** industry standard metrics
- **Gage R&R** per AIAG MSA methodology

## Architecture

### Service Layer
- `MaximoSurrogate.ts` - Core asset management service with 120+ equipment records
- `IndySoftSurrogate.ts` - Core calibration management service with 220+ gauge records
- In-memory data storage for fast testing performance
- Event-driven architecture for integration notifications

### API Layer
- `maximo-surrogate.ts` - RESTful API endpoints for equipment and work order management
- `indysoft-surrogate.ts` - RESTful API endpoints for gauge and calibration management
- Comprehensive validation using Zod schemas
- OpenAPI/Swagger documentation integration

### Integration
- Mounted at `/api/testing/maximo/` and `/api/testing/indysoft/` (no authentication required for testing)
- Services available as importable modules for direct usage
- Event emission for ERP data export integration

## Configuration

### Basic Configuration
```typescript
import { MaximoSurrogate } from '../services/MaximoSurrogate';
import { IndySoftSurrogate } from '../services/IndySoftSurrogate';

const maximoSurrogate = new MaximoSurrogate({
  mockMode: true,
  enableDataExport: true,
  erpEndpoint: 'http://localhost:3000/api/testing/erp',
  enableAuditLogging: true,
  maxEquipmentRecords: 1000,
  autoGeneratePMWorkOrders: true,
  defaultTechnician: 'SYSTEM'
});

const indySoftSurrogate = new IndySoftSurrogate({
  mockMode: true,
  enableDataExport: true,
  enableAuditLogging: true,
  maxGaugeRecords: 2000,
  autoGenerateCalibrationDueNotifications: true,
  defaultTechnician: 'SYSTEM',
  defaultGageRRAcceptanceCriteria: {
    gageRRLimit: 10,
    ndcMinimum: 5
  }
});
```

### Configuration Options

#### Maximo Surrogate Configuration
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mockMode` | boolean | true | Enable mock mode for testing |
| `enableDataExport` | boolean | true | Enable data export to ERP surrogate |
| `erpEndpoint` | string | undefined | ERP surrogate endpoint URL |
| `enableAuditLogging` | boolean | true | Enable audit trail logging |
| `maxEquipmentRecords` | number | 1000 | Maximum equipment records to store |
| `maxWorkOrderHistory` | number | 5000 | Maximum work order history |
| `autoGeneratePMWorkOrders` | boolean | true | Auto-generate PM work orders |
| `defaultTechnician` | string | 'SYSTEM' | Default technician for operations |

#### IndySoft Surrogate Configuration
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mockMode` | boolean | true | Enable mock mode for testing |
| `enableDataExport` | boolean | true | Enable data export to ERP surrogate |
| `erpEndpoint` | string | undefined | ERP surrogate endpoint URL |
| `enableAuditLogging` | boolean | true | Enable audit trail logging |
| `maxGaugeRecords` | number | 2000 | Maximum gauge records to store |
| `maxCalibrationHistory` | number | 10000 | Maximum calibration history |
| `autoGenerateCalibrationDueNotifications` | boolean | true | Auto-generate due notifications |
| `defaultTechnician` | string | 'SYSTEM' | Default technician for operations |

## API Reference

### Base URLs
```
Maximo Surrogate: /api/testing/maximo
IndySoft Surrogate: /api/testing/indysoft
```

## Maximo Surrogate API Endpoints

### Equipment Management

#### Create Equipment
```http
POST /api/testing/maximo/equipment
Content-Type: application/json

{
  "description": "CNC Milling Machine #001",
  "equipmentType": "CNC_MACHINE",
  "status": "ACTIVE",
  "location": "CELL_A",
  "department": "MACHINING",
  "manufacturer": "Haas Automation",
  "model": "VF-3SS",
  "serialNumber": "HAA-2023-001",
  "installDate": "2023-01-15T00:00:00Z",
  "acquisitionCost": 250000,
  "specifications": {
    "xAxisTravel": "762mm",
    "yAxisTravel": "406mm",
    "zAxisTravel": "508mm",
    "spindleSpeed": "8100rpm"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "equipmentId": "EQ-000001",
    "assetNum": "EQ-000001",
    "description": "CNC Milling Machine #001",
    "equipmentType": "CNC_MACHINE",
    "status": "ACTIVE",
    "location": "CELL_A",
    "department": "MACHINING",
    "manufacturer": "Haas Automation",
    "model": "VF-3SS",
    "serialNumber": "HAA-2023-001",
    "installDate": "2023-01-15T00:00:00.000Z",
    "acquisitionCost": 250000,
    "specifications": {
      "xAxisTravel": "762mm",
      "yAxisTravel": "406mm",
      "zAxisTravel": "508mm",
      "spindleSpeed": "8100rpm"
    },
    "createdDate": "2023-11-01T10:00:00.000Z",
    "lastModified": "2023-11-01T10:00:00.000Z"
  },
  "timestamp": "2023-11-01T10:00:00.000Z"
}
```

#### Query Equipment
```http
GET /api/testing/maximo/equipment?equipmentType=CNC_MACHINE&status=ACTIVE&limit=10&offset=0
```

#### Get Equipment by ID
```http
GET /api/testing/maximo/equipment/{equipmentId}
```

#### Update Equipment
```http
PUT /api/testing/maximo/equipment/{equipmentId}
Content-Type: application/json

{
  "status": "MAINTENANCE",
  "lastModifiedBy": "TECHNICIAN_001"
}
```

#### Delete Equipment
```http
DELETE /api/testing/maximo/equipment/{equipmentId}
```

### Work Order Management

#### Create Work Order
```http
POST /api/testing/maximo/work-orders
Content-Type: application/json

{
  "equipmentId": "EQ-000001",
  "workOrderType": "PREVENTIVE_MAINTENANCE",
  "description": "Monthly PM - Lubrication and inspection",
  "scheduledStartDate": "2023-11-05T08:00:00Z",
  "scheduledEndDate": "2023-11-05T12:00:00Z",
  "priority": 2,
  "estimatedHours": 4,
  "assignedTechnician": "TECH_001",
  "instructions": "Perform lubrication of all grease points and visual inspection of safety systems",
  "requiredParts": [
    {
      "partNumber": "GREASE-001",
      "description": "Bearing Grease",
      "quantityRequired": 2,
      "stockLocation": "MAINT_SHOP"
    }
  ]
}
```

### System Management

#### Health Check
```http
GET /api/testing/maximo/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "Maximo Asset Management Surrogate",
    "version": "1.0.0",
    "status": "healthy",
    "timestamp": "2023-11-01T10:00:00.000Z",
    "mockMode": true,
    "equipmentCount": 120,
    "workOrderCount": 45,
    "pmScheduleCount": 30,
    "downtimeEventCount": 12,
    "sparePartsCount": 250
  },
  "timestamp": "2023-11-01T10:00:00.000Z"
}
```

#### Reset Mock Data
```http
POST /api/testing/maximo/system/reset
```

## IndySoft Surrogate API Endpoints

### Gauge Management

#### Create Gauge
```http
POST /api/testing/indysoft/gauges
Content-Type: application/json

{
  "description": "Digital Caliper 0-150mm",
  "gaugeType": "CALIPER",
  "manufacturer": "Mitutoyo",
  "model": "CD-6\"CSX",
  "serialNumber": "MIT-2023-001",
  "measurementRange": {
    "minimum": 0,
    "maximum": 150,
    "units": "mm"
  },
  "resolution": 0.01,
  "accuracy": 0.02,
  "location": "INSPECTION_A",
  "department": "QUALITY",
  "costCenter": "QC001",
  "calibrationFrequency": 365,
  "acquisitionCost": 450
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gaugeId": "GAGE-000001",
    "assetTag": "GAGE-000001",
    "description": "Digital Caliper 0-150mm",
    "gaugeType": "CALIPER",
    "status": "ACTIVE",
    "manufacturer": "Mitutoyo",
    "model": "CD-6\"CSX",
    "serialNumber": "MIT-2023-001",
    "measurementRange": {
      "minimum": 0,
      "maximum": 150,
      "units": "mm"
    },
    "resolution": 0.01,
    "accuracy": 0.02,
    "location": "INSPECTION_A",
    "department": "QUALITY",
    "costCenter": "QC001",
    "calibrationFrequency": 365,
    "nextCalibrationDate": "2024-11-01T10:00:00.000Z",
    "createdDate": "2023-11-01T10:00:00.000Z"
  },
  "timestamp": "2023-11-01T10:00:00.000Z"
}
```

#### Query Gauges
```http
GET /api/testing/indysoft/gauges?gaugeType=CALIPER&status=ACTIVE&limit=10&offset=0
```

#### Get Gauge by ID
```http
GET /api/testing/indysoft/gauges/{gaugeId}
```

### Calibration Management

#### Create Calibration Record
```http
POST /api/testing/indysoft/calibrations
Content-Type: application/json

{
  "gaugeId": "GAGE-000001",
  "technician": "CAL_TECH_001",
  "calibrationStandard": "NIST Traceable Reference Standard",
  "environmentalConditions": {
    "temperature": 20.1,
    "humidity": 48.5,
    "pressure": 101.2
  },
  "procedure": "Standard calibration procedure for digital calipers per ISO 17025",
  "asFoundReadings": [
    {
      "nominalValue": 0,
      "actualValue": 0.001,
      "error": 0.001,
      "tolerance": 0.02,
      "withinTolerance": true,
      "units": "mm"
    },
    {
      "nominalValue": 50,
      "actualValue": 50.005,
      "error": 0.005,
      "tolerance": 0.02,
      "withinTolerance": true,
      "units": "mm"
    }
  ],
  "asLeftReadings": [
    {
      "nominalValue": 0,
      "actualValue": 0.000,
      "error": 0.000,
      "tolerance": 0.02,
      "withinTolerance": true,
      "units": "mm"
    },
    {
      "nominalValue": 50,
      "actualValue": 50.001,
      "error": 0.001,
      "tolerance": 0.02,
      "withinTolerance": true,
      "units": "mm"
    }
  ],
  "measurementUncertainty": {
    "value": 0.007,
    "type": "ABSOLUTE",
    "coverageFactor": 2,
    "confidenceLevel": 95,
    "contributingFactors": [
      {
        "source": "Reference standard uncertainty",
        "value": 0.005,
        "distribution": "NORMAL",
        "sensitivity": 1.0
      },
      {
        "source": "Environmental conditions",
        "value": 0.002,
        "distribution": "RECTANGULAR",
        "sensitivity": 0.5
      }
    ]
  },
  "passFailCriteria": {
    "tolerancePercentage": 10,
    "acceptanceLimit": 0.02,
    "units": "mm",
    "specification": "ISO/IEC 17025"
  },
  "overallResult": "PASS",
  "comments": "Calibration completed successfully. Minor zero adjustment performed."
}
```

#### Get Calibrations Due
```http
GET /api/testing/indysoft/calibrations/due?daysAhead=30&includeOverdue=true
```

### System Management

#### Health Check
```http
GET /api/testing/indysoft/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "IndySoft Calibration Management Surrogate",
    "version": "1.0.0",
    "status": "healthy",
    "timestamp": "2023-11-01T10:00:00.000Z",
    "mockMode": true,
    "gaugeCount": 220,
    "calibrationRecordCount": 50,
    "calibrationScheduleCount": 220,
    "gageRRStudyCount": 0,
    "outOfToleranceEventCount": 0,
    "gagesDue": 15,
    "gaugesOverdue": 3
  },
  "timestamp": "2023-11-01T10:00:00.000Z"
}
```

#### Reset Mock Data
```http
POST /api/testing/indysoft/system/reset
```

## Usage Examples

### Testing Equipment Lifecycle Management
```typescript
// Test equipment creation and PM schedule generation
describe('Equipment Lifecycle', () => {
  it('should create equipment and generate PM schedule', async () => {
    // 1. Create equipment
    const equipmentResponse = await request(app)
      .post('/api/testing/maximo/equipment')
      .send({
        description: 'Test CNC Machine',
        equipmentType: 'CNC_MACHINE',
        location: 'TEST_CELL',
        department: 'MACHINING',
        manufacturer: 'Test Manufacturer',
        model: 'TEST-001',
        serialNumber: 'TEST-2023-001'
      });

    expect(equipmentResponse.body.success).toBe(true);
    const equipmentId = equipmentResponse.body.data.equipmentId;

    // 2. Verify PM work order generation
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for PM generation

    const workOrdersResponse = await request(app)
      .get(`/api/testing/maximo/work-orders?equipmentId=${equipmentId}&workOrderType=PREVENTIVE_MAINTENANCE`);

    expect(workOrdersResponse.body.data.length).toBeGreaterThan(0);
  });
});
```

### Testing Calibration Due Workflow
```typescript
// Test calibration due notification and record creation
describe('Calibration Workflow', () => {
  it('should handle calibration due notification and record creation', async () => {
    // 1. Create gauge with short calibration frequency for testing
    const gaugeResponse = await request(app)
      .post('/api/testing/indysoft/gauges')
      .send({
        description: 'Test Micrometer',
        gaugeType: 'MICROMETER',
        manufacturer: 'Test Manufacturer',
        model: 'TEST-MIC-001',
        serialNumber: 'TEST-2023-001',
        measurementRange: { minimum: 0, maximum: 25, units: 'mm' },
        resolution: 0.001,
        accuracy: 0.002,
        location: 'TEST_LAB',
        department: 'QUALITY',
        costCenter: 'QC001',
        calibrationFrequency: 1 // 1 day for testing
      });

    expect(gaugeResponse.body.success).toBe(true);
    const gaugeId = gaugeResponse.body.data.gaugeId;

    // 2. Wait for calibration due notification
    await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000 + 1000)); // 1 day + 1 second

    // 3. Check if gauge status updated to CALIBRATION_DUE
    const gaugeStatusResponse = await request(app)
      .get(`/api/testing/indysoft/gauges/${gaugeId}`);

    expect(gaugeStatusResponse.body.data.status).toBe('CALIBRATION_DUE');

    // 4. Create calibration record
    const calibrationResponse = await request(app)
      .post('/api/testing/indysoft/calibrations')
      .send({
        gaugeId,
        technician: 'TEST_TECH',
        calibrationStandard: 'NIST Standard',
        environmentalConditions: {
          temperature: 20,
          humidity: 50,
          pressure: 101.3
        },
        procedure: 'Test calibration procedure',
        asFoundReadings: [
          {
            nominalValue: 0,
            actualValue: 0.0005,
            error: 0.0005,
            tolerance: 0.002,
            withinTolerance: true,
            units: 'mm'
          }
        ],
        asLeftReadings: [
          {
            nominalValue: 0,
            actualValue: 0.0001,
            error: 0.0001,
            tolerance: 0.002,
            withinTolerance: true,
            units: 'mm'
          }
        ],
        measurementUncertainty: {
          value: 0.0007,
          type: 'ABSOLUTE',
          coverageFactor: 2,
          confidenceLevel: 95,
          contributingFactors: []
        },
        passFailCriteria: {
          tolerancePercentage: 10,
          acceptanceLimit: 0.002,
          units: 'mm',
          specification: 'ISO 17025'
        },
        overallResult: 'PASS'
      });

    expect(calibrationResponse.body.success).toBe(true);

    // 5. Verify gauge status updated to ACTIVE
    const updatedGaugeResponse = await request(app)
      .get(`/api/testing/indysoft/gauges/${gaugeId}`);

    expect(updatedGaugeResponse.body.data.status).toBe('ACTIVE');
  });
});
```

### Testing Data Export to ERP
```typescript
// Test equipment and gauge data export to ERP surrogate
describe('ERP Integration', () => {
  it('should export equipment and gauge data to ERP surrogate', async () => {
    // Monitor ERP export events
    const exportEvents: any[] = [];

    maximoSurrogate.on('erpExport', (data) => {
      exportEvents.push(data);
    });

    indySoftSurrogate.on('erpExport', (data) => {
      exportEvents.push(data);
    });

    // 1. Create equipment (should trigger ERP export)
    const equipmentResponse = await request(app)
      .post('/api/testing/maximo/equipment')
      .send({
        description: 'ERP Test Equipment',
        equipmentType: 'TEST_EQUIPMENT',
        location: 'ERP_TEST',
        department: 'TESTING',
        manufacturer: 'ERP Test Mfg',
        model: 'ERP-001',
        serialNumber: 'ERP-2023-001'
      });

    // 2. Create gauge (should trigger ERP export)
    const gaugeResponse = await request(app)
      .post('/api/testing/indysoft/gauges')
      .send({
        description: 'ERP Test Gauge',
        gaugeType: 'CALIPER',
        manufacturer: 'ERP Test Mfg',
        model: 'ERP-CAL-001',
        serialNumber: 'ERP-2023-001',
        measurementRange: { minimum: 0, maximum: 100, units: 'mm' },
        resolution: 0.01,
        accuracy: 0.02,
        location: 'ERP_TEST',
        department: 'TESTING',
        costCenter: 'TEST001'
      });

    // 3. Verify ERP export events were triggered
    expect(exportEvents.length).toBe(2);
    expect(exportEvents[0].type).toBe('EQUIPMENT');
    expect(exportEvents[1].type).toBe('GAUGE');
    expect(exportEvents[0].data.equipmentId).toBeDefined();
    expect(exportEvents[1].data.gaugeId).toBeDefined();
  });
});
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Asset & Calibration Management Tests
on: [push, pull_request]

jobs:
  asset-calibration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run Maximo surrogate tests
        run: npm test -- src/tests/services/MaximoSurrogate.test.ts

      - name: Run IndySoft surrogate tests
        run: npm test -- src/tests/services/IndySoftSurrogate.test.ts

      - name: Run integration tests
        run: npm test -- src/tests/routes/maximo-surrogate.test.ts src/tests/routes/indysoft-surrogate.test.ts
```

### Test Environment Setup
```typescript
// Setup for integration tests
beforeAll(async () => {
  // Reset mock data for both surrogates
  await request(app)
    .post('/api/testing/maximo/system/reset')
    .expect(200);

  await request(app)
    .post('/api/testing/indysoft/system/reset')
    .expect(200);

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));
});
```

## Sample Data

The surrogates initialize with comprehensive sample data for testing:

### Sample Equipment (120+ records)
- **CNC Machines**: Haas, Mazak, DMG Mori (various models and configurations)
- **Furnaces**: Lindberg, Despatch, Nabertherm (heat treatment and processing)
- **Presses**: Greenerd, Schuler, Komatsu (hydraulic and mechanical)
- **Test Equipment**: Instron, MTS, Shimadzu (material testing)
- **Assembly Stations**: Bosch Rexroth, Festo (automated assembly)
- **Inspection Stations**: Zeiss, Hexagon, Mitutoyo (quality control)
- **Tooling**: Sandvik, Kennametal, Iscar (cutting tools and fixtures)

### Sample Gauges (220+ records)
- **Calipers**: Digital, dial, and vernier calipers (0-150mm, 0-200mm, 0-300mm)
- **Micrometers**: Outside, inside, and depth micrometers (various ranges)
- **Height Gauges**: Digital and dial height gauges (precision measurement)
- **Indicators**: Dial and digital indicators (surface and runout measurement)
- **CMMs**: Coordinate measuring machines (Zeiss, Hexagon, Mitutoyo)
- **Surface Plates**: Granite and cast iron reference surfaces
- **Torque Wrenches**: Click-type, beam, and digital torque wrenches
- **Pressure Gauges**: Various ranges and accuracies
- **Thermometers**: Digital, RTD, and thermocouple types
- **Scales**: Precision balances and analytical scales
- **Thread Gauges**: Ring, plug, and pitch gauges
- **Optical Comparators**: Profile projectors and shadow graphs

### Equipment Status Distribution
- **75%** Active (operational and available)
- **15%** Maintenance (scheduled or ongoing maintenance)
- **7%** Down (unplanned downtime)
- **3%** Retired (end of service life)

### Gauge Status Distribution
- **80%** Active (calibrated and in service)
- **10%** Calibration Due (within notification period)
- **5%** Overdue (past due for calibration)
- **3%** Out of Tolerance (failed calibration)
- **2%** Out of Service (repair or retirement)

## Error Handling

### Common Error Responses

#### Equipment Not Found (404)
```json
{
  "success": false,
  "errors": ["Equipment EQ-999999 not found"],
  "timestamp": "2023-11-01T10:00:00.000Z"
}
```

#### Gauge Not Found (404)
```json
{
  "success": false,
  "errors": ["Gauge GAGE-999999 not found"],
  "timestamp": "2023-11-01T10:00:00.000Z"
}
```

#### Validation Error (400)
```json
{
  "success": false,
  "errors": [
    "description: Description is required",
    "equipmentType: Invalid enum value"
  ],
  "timestamp": "2023-11-01T10:00:00.000Z"
}
```

#### Duplicate Asset Number (400)
```json
{
  "success": false,
  "errors": ["Equipment with asset number EQ-000001 already exists"],
  "timestamp": "2023-11-01T10:00:00.000Z"
}
```

#### Cannot Delete Equipment with Active Work Orders (400)
```json
{
  "success": false,
  "errors": ["Cannot delete equipment EQ-000001: 3 active work order(s) exist"],
  "timestamp": "2023-11-01T10:00:00.000Z"
}
```

## Performance Considerations

- **In-Memory Storage**: Fast access but limited to test data volumes
- **Automatic Cleanup**: Expired tokens and old records are automatically cleaned up
- **Event Throttling**: PM generation and calibration notifications are throttled for performance
- **Concurrent Access**: Thread-safe for CI/CD parallel execution
- **Data Limits**: Configurable limits prevent memory exhaustion during long test runs

## Security Notes

- **Test Environment Only**: Not for production use
- **No Real Authentication**: Mock credentials and operations only
- **Audit Trail**: All actions logged for test verification
- **No Persistence**: Data reset between test runs
- **Network Isolation**: Designed for isolated test environments

## Troubleshooting

### Common Issues

#### Connection Errors
- Ensure services are running on correct ports
- Check endpoint URLs match documentation
- Verify no authentication middleware blocking test access

#### PM Work Orders Not Generated
- Check `autoGeneratePMWorkOrders: true` in configuration
- Verify equipment has PM schedules created
- Allow time for PM generation interval (default 1 minute)

#### Calibration Due Notifications Not Working
- Check `autoGenerateCalibrationDueNotifications: true` in configuration
- Verify gauge calibration frequencies are set correctly
- Allow time for notification check interval (default 1 minute)

#### Data Export Not Working
- Check `enableDataExport: true` in configuration
- Verify ERP endpoint is configured and accessible
- Monitor console logs for ERP export events

#### Test Data Reset Issues
```typescript
// Reset between tests
beforeEach(async () => {
  await request(app)
    .post('/api/testing/maximo/system/reset')
    .expect(200);

  await request(app)
    .post('/api/testing/indysoft/system/reset')
    .expect(200);

  // Allow time for reset to complete
  await new Promise(resolve => setTimeout(resolve, 500));
});
```

### Debug Logging
Enable debug logging for detailed operation tracking:
```typescript
const maximoSurrogate = new MaximoSurrogate({
  ...config,
  enableAuditLogging: true
});

// Monitor events for debugging
maximoSurrogate.on('equipmentCreated', (equipment) => {
  console.log('Equipment created:', equipment.assetNum);
});

maximoSurrogate.on('workOrderCreated', (workOrder) => {
  console.log('Work order created:', workOrder.workOrderNum);
});

maximoSurrogate.on('erpExport', (data) => {
  console.log('ERP export:', data.type, data.data);
});
```

## Development

### Adding New Features
1. Update service classes (`MaximoSurrogate.ts`, `IndySoftSurrogate.ts`)
2. Add corresponding API endpoints in route files
3. Create comprehensive tests for both service and API layers
4. Update documentation and examples

### Testing Changes
```bash
# Run service tests
npm test src/tests/services/MaximoSurrogate.test.ts
npm test src/tests/services/IndySoftSurrogate.test.ts

# Run API tests
npm test src/tests/routes/maximo-surrogate.test.ts
npm test src/tests/routes/indysoft-surrogate.test.ts

# Run all asset/calibration surrogate tests
npm test -- --grep "Asset|Calibration|Maximo|IndySoft"
```

## Future Enhancements

- **Database Persistence**: Optional persistent storage for longer test scenarios
- **Advanced Work Flows**: Multi-step approval processes for work orders and calibrations
- **Integration Templates**: Pre-built integration patterns for common scenarios
- **Performance Metrics**: Response time and throughput monitoring
- **Advanced Analytics**: Equipment reliability predictions and calibration optimization
- **Mobile API Support**: Endpoints optimized for mobile calibration and maintenance apps

## Support

For issues or questions regarding the Asset & Calibration Management Surrogates:

1. Check this documentation for common solutions
2. Review test files for usage examples
3. Create issue in GitHub repository with detailed description
4. Include configuration and error logs for troubleshooting

---

**Note**: This is a testing infrastructure component designed to enable comprehensive asset and calibration management testing without external dependencies. It should not be used in production environments for actual asset management or calibration operations.