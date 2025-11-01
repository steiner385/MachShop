# Oracle EBS Surrogate

A comprehensive mock Oracle EBS (Enterprise Business Suite) system for MES integration testing. Provides realistic ERP API endpoints without requiring access to a live Oracle EBS instance.

## Status

**Phase 1: Core ERP API Foundation** ✅ COMPLETE

Delivers minimal working Oracle EBS surrogate with:
- ✅ Express.js REST API server
- ✅ SQLite database for mock data
- ✅ Work Order CRUD endpoints
- ✅ Inventory management endpoints
- ✅ Purchase Order endpoints
- ✅ Equipment master data endpoints
- ✅ Gauge master data endpoints
- ✅ Error handling and validation
- ✅ Health check endpoint
- ✅ Request/response logging

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
cd surrogates/oracle-ebs
npm install
```

### Environment Setup

Create a `.env` file (or copy from `.env.example`):

```env
NODE_ENV=development
PORT=3002
DB_PATH=./data
```

### Running the Surrogate

**Development Mode** (with auto-reload):
```bash
npm run dev
```

**Production Mode**:
```bash
npm run build
npm start
```

**Docker**:
```bash
docker build -t oracle-ebs-surrogate .
docker run -p 3002:3002 oracle-ebs-surrogate
```

The server will start on `http://localhost:3002`

## API Endpoints

### Health Check

**GET** `/health`

Returns the health status of the surrogate.

```bash
curl http://localhost:3002/health
```

Response:
```json
{
  "success": true,
  "message": "Oracle EBS Surrogate is healthy",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Work Orders

#### List Work Orders

**GET** `/api/workorders`

Query Parameters:
- `status` (optional): Filter by status (RELEASED, IN_PROCESS, COMPLETED, CLOSED)

```bash
curl http://localhost:3002/api/workorders
curl "http://localhost:3002/api/workorders?status=IN_PROCESS"
```

#### Get Work Order

**GET** `/api/workorders/:id`

Path Parameters:
- `id`: Work order ID or order number

```bash
curl http://localhost:3002/api/workorders/WO-2024-001
```

#### Create Work Order

**POST** `/api/workorders`

Request Body:
```json
{
  "orderNumber": "WO-2024-005",
  "description": "Assembly new component",
  "quantity": 20,
  "dueDate": "2024-01-15T00:00:00Z",
  "costCenter": "CC-001"
}
```

```bash
curl -X POST http://localhost:3002/api/workorders \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "WO-2024-005",
    "description": "Assembly new component",
    "quantity": 20
  }'
```

#### Update Work Order Status

**PUT** `/api/workorders/:id`

Request Body:
```json
{
  "status": "IN_PROCESS"
}
```

Valid statuses: `RELEASED`, `IN_PROCESS`, `COMPLETED`, `CLOSED`

```bash
curl -X PUT http://localhost:3002/api/workorders/WO-2024-001 \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROCESS"}'
```

### Inventory Management

#### List Inventory Items

**GET** `/api/inventory`

Query Parameters:
- `partNumber` (optional): Filter by part number (wildcard)

```bash
curl http://localhost:3002/api/inventory
curl "http://localhost:3002/api/inventory?partNumber=PART-001"
```

#### Get Inventory for Part

**GET** `/api/inventory/:partNumber`

```bash
curl http://localhost:3002/api/inventory/PART-001
```

#### Record Inventory Transaction

**POST** `/api/inventory/transactions`

Request Body:
```json
{
  "partNumber": "PART-001",
  "transactionType": "ISSUE",
  "quantity": 10,
  "workOrderId": "WO-2024-001",
  "referenceNumber": "REF-12345",
  "notes": "Material issue for assembly"
}
```

Transaction Types: `ISSUE`, `RECEIVE`, `ADJUST`

```bash
curl -X POST http://localhost:3002/api/inventory/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "partNumber": "PART-001",
    "transactionType": "ISSUE",
    "quantity": 10,
    "workOrderId": "WO-2024-001"
  }'
```

### Purchase Orders

#### List Purchase Orders

**GET** `/api/purchaseorders`

Query Parameters:
- `status` (optional): Filter by status

```bash
curl http://localhost:3002/api/purchaseorders
curl "http://localhost:3002/api/purchaseorders?status=OPEN"
```

#### Get Purchase Order

**GET** `/api/purchaseorders/:id`

```bash
curl http://localhost:3002/api/purchaseorders/PO-2024-001
```

### Equipment Master Data

#### List Equipment

**GET** `/api/equipment`

```bash
curl http://localhost:3002/api/equipment
```

#### Get Equipment

**GET** `/api/equipment/:id`

```bash
curl http://localhost:3002/api/equipment/EQ-CNC-001
```

### Gauge Master Data

#### List Gauges

**GET** `/api/gauges`

```bash
curl http://localhost:3002/api/gauges
```

#### Get Gauge

**GET** `/api/gauges/:id`

```bash
curl http://localhost:3002/api/gauges/GAGE-CAL-001
```

### Data Management

#### Reset to Initial State

**POST** `/api/admin/reset`

Clears all data and reloads initial test data set.

```bash
curl -X POST http://localhost:3002/api/admin/reset
```

## Sample Test Data

The surrogate is pre-populated with realistic test data:

### Work Orders
- **WO-2024-001**: Assembly Engine Block (RELEASED, 10 units)
- **WO-2024-002**: Machine Cylinder Head (IN_PROCESS, 5 units)
- **WO-2024-003**: Test & Inspect (COMPLETED, 2 units)
- **WO-2024-004**: Pack & Ship (RELEASED, 15 units)

### Inventory
- **PART-001**: Steel Plate - 1mm (500 units)
- **PART-002**: Aluminum Bar - 50mm (300 units)
- **PART-003**: Bearing Assembly (150 units)
- **PART-004**: Fastener Kit (1000 units)
- **PART-005**: Gasket Material (250 units)

### Purchase Orders
- **PO-2024-001**: Steel Suppliers Inc (25,000 USD)
- **PO-2024-002**: Bearing Manufacturers Ltd (15,000 USD)

### Equipment
- **EQ-CNC-001**: CNC Mill - Horizontal (CELL-A)
- **EQ-TURN-001**: Lathe - Production (CELL-B)
- **EQ-HEAT-001**: Heat Treat Furnace (HEAT-TREAT)
- **EQ-PRESS-001**: Hydraulic Press (CELL-C)

### Gauges
- **GAGE-CAL-001**: Caliper - Digital
- **GAGE-MIC-001**: Micrometer - Outside
- **GAGE-CMM-001**: Coordinate Measuring Machine

## Error Handling

The API returns appropriate HTTP status codes and error responses:

### Error Response Format
```json
{
  "success": false,
  "error": "Description of what went wrong",
  "errorCode": "SPECIFIC_ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Common Error Codes
- **400 Bad Request**: Invalid request data (missing fields, invalid values)
- **404 Not Found**: Resource not found (part, work order, etc.)
- **500 Internal Server Error**: Unexpected server error

### Example Error Response

**Insufficient Inventory**:
```json
{
  "success": false,
  "error": "Insufficient inventory. Available: 50, Requested: 100",
  "errorCode": "INSUFFICIENT_INVENTORY",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Invalid Work Order Status**:
```json
{
  "success": false,
  "error": "Invalid status. Must be one of: RELEASED, IN_PROCESS, COMPLETED, CLOSED",
  "errorCode": "INVALID_STATUS",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Architecture

### Directory Structure
```
surrogates/oracle-ebs/
├── src/
│   ├── index.ts                    # Main Express server & routes
│   ├── models/
│   │   └── types.ts               # TypeScript type definitions
│   ├── services/
│   │   └── database.service.ts    # SQLite database management
│   └── utils/
│       ├── logger.ts              # Logging utility
│       └── test-data.ts           # Test data generation
├── tests/
│   └── integration.test.ts        # Integration tests (Phase 1)
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### Technology Stack
- **Express.js**: REST API framework
- **SQLite**: Embedded database for test data
- **TypeScript**: Type-safe development
- **Winston**: Structured logging
- **UUID**: Unique identifier generation

## Testing Integration

### Running Integration Tests

```bash
npm run test:integration
```

### Example MES Integration

The surrogate is designed for integration testing with the MachShop MES:

```typescript
// MES integration example
const response = await fetch('http://localhost:3002/api/workorders');
const { data: workOrders } = await response.json();

// Process work orders
workOrders.forEach(wo => {
  console.log(`${wo.order_number}: ${wo.description}`);
});
```

## Development Workflow

### Local Development
```bash
npm run dev
```

The server watches for changes and automatically restarts.

### Building for Production
```bash
npm run build
npm start
```

### Code Quality
```bash
npm run lint
npm run format
```

## Docker Deployment

### Build Image
```bash
docker build -t oracle-ebs-surrogate .
```

### Run Container
```bash
docker run -p 3002:3002 oracle-ebs-surrogate
```

### Docker Compose (for CI/CD)
```bash
docker-compose up
```

## Future Phases

**Phase 2**: Stateful Workflow Management
- Work order status progression
- Inventory transaction processing
- PO receipt tracking
- Transaction atomicity

**Phase 3**: Master Data & Asset Integration
- Equipment data sync from Maximo surrogate
- Gauge data sync from IndySoft surrogate
- Data flow pipelines

**Phase 4**: Test Data & Error Scenarios
- Comprehensive test data generation
- Error scenario simulation
- Data reset capabilities

**Phase 5**: Advanced Features & Optimization
- Financial integration
- Performance optimization
- Webhook notifications

**Phase 6**: Deployment & Documentation
- Kubernetes deployment
- OpenAPI/Swagger documentation
- Complete deployment guides

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Execution environment |
| PORT | 3002 | Server port |
| DB_PATH | ./data | Database directory |

### Database

By default, SQLite is used for test data storage. The database is created automatically on first run.

For in-memory database (testing), set `DB_PATH=:memory:` in `.env`.

## Support & Documentation

For detailed documentation on Phase 1 implementation, see GitHub Issue #296.

Related issues:
- **#297**: Phase 2 - Stateful Workflows
- **#298**: Phase 3 - Master Data Integration
- **#299**: Phase 4 - Test Data & Errors
- **#300**: Phase 5 - Advanced Features
- **#301**: Phase 6 - Deployment & Docs

## License

MIT
