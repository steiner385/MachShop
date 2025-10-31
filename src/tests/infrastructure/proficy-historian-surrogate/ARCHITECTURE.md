# GE Proficy Historian Surrogate Architecture

## Overview

The GE Proficy Historian Surrogate is a comprehensive mock system that replicates the GE Proficy Historian REST API and behavior for integration testing. This surrogate enables testing of time-series data collection, storage, and analysis without requiring access to a live Proficy Historian system.

## Design Principles

1. **API Compatibility**: Full REST API compatibility with the existing `ProficyHistorianAdapter`
2. **Realistic Behavior**: Mimics real Proficy Historian response patterns and timing
3. **Test Isolation**: Independent operation for parallel test execution
4. **Data Persistence**: In-memory time-series storage with realistic data patterns
5. **Error Simulation**: Configurable failure modes and edge cases
6. **Performance**: Low latency and resource usage for test efficiency

## Architecture Components

### 1. Core Express.js Server
```
src/tests/infrastructure/proficy-historian-surrogate/
├── server/
│   ├── ProficyHistorianSurrogate.ts    # Main server class
│   ├── middleware/                      # Authentication, logging, error handling
│   ├── routes/                         # REST API endpoints
│   └── config/                         # Server configuration
```

**Key Features:**
- Express.js-based HTTP server
- Configurable port and host
- Basic authentication middleware
- Request/response logging
- Error handling and status codes matching Proficy API

### 2. Time-Series Data Storage Engine
```
├── storage/
│   ├── TimeSeriesStore.ts              # In-memory time-series database
│   ├── TagRegistry.ts                  # Tag management and metadata
│   ├── DataAggregator.ts               # Real-time aggregation engine
│   └── CompactionEngine.ts             # Data compression and cleanup
```

**Storage Features:**
- In-memory time-series data structure optimized for queries
- Tag-based indexing with metadata
- Configurable data retention policies
- Real-time aggregation (min, max, avg, count)
- Data compression using swinging door algorithm
- Memory-efficient storage with automatic cleanup

### 3. Data Pattern Generators
```
├── generators/
│   ├── RealisticsDataGenerator.ts      # Equipment simulation patterns
│   ├── TrendGenerator.ts               # Trend and seasonal patterns
│   ├── NoiseGenerator.ts               # Realistic sensor noise
│   ├── EventGenerator.ts               # Alarms and discrete events
│   └── EquipmentSimulator.ts           # Equipment-specific behaviors
```

**Pattern Features:**
- CNC machine operation cycles (spindle speed, feed rate, temperature)
- Process parameter trends (temperature ramps, pressure cycles)
- Quality measurement variations (within control limits)
- Equipment alarm patterns (startup/shutdown, fault conditions)
- Seasonal and time-based variations
- Configurable noise and drift characteristics

### 4. REST API Implementation
```
├── api/
│   ├── ServerInfoController.ts         # /historian/server/info
│   ├── TagController.ts                # /historian/tags CRUD operations
│   ├── DataWriteController.ts          # /historian/data/write
│   ├── DataQueryController.ts          # /historian/data/query
│   ├── HealthController.ts             # Health monitoring endpoints
│   └── ConfigController.ts             # Runtime configuration
```

**API Endpoints:**
- `GET /historian/server/info` - Server information and capabilities
- `POST /historian/tags` - Create new tags
- `GET /historian/tags` - List and search tags
- `PUT /historian/tags/{id}` - Update tag configuration
- `DELETE /historian/tags/{id}` - Delete tags
- `POST /historian/data/write` - Bulk data point writes
- `GET /historian/data/query` - Historical data queries
- `GET /historian/health` - Health status and metrics

### 5. Test Integration Framework
```
├── integration/
│   ├── SurrogateManager.ts             # Test lifecycle management
│   ├── TestScenarios.ts                # Predefined test scenarios
│   ├── DataPreloader.ts                # Historical data seeding
│   └── ConfigurationProfiles.ts       # Environment configurations
```

**Integration Features:**
- Automatic startup/shutdown for test lifecycle
- Port allocation and conflict resolution
- Test data preloading and cleanup
- Configuration profiles for different test scenarios
- Health monitoring and diagnostics

## Data Model

### Tag Structure
```typescript
interface SurrogateTag {
  id: string;
  tagName: string;                      // "EQUIPMENT.CNC001.SPINDLE_SPEED"
  description: string;
  dataType: 'Float' | 'Integer' | 'String' | 'Boolean' | 'DateTime';
  engineeringUnits: string;             // "RPM", "°C", "psi"
  minValue?: number;
  maxValue?: number;
  compressionType: 'None' | 'Swinging Door' | 'Boxcar';
  compressionDeviation: number;         // Percentage
  storageType: 'Normal' | 'Lab';
  collector: string;                    // "MES", "PLC", "SCADA"
  createdAt: Date;
  isActive: boolean;
}
```

### Data Point Structure
```typescript
interface SurrogateDataPoint {
  tagName: string;
  timestamp: Date;
  value: any;                          // Type depends on tag dataType
  quality: number;                     // 0-100, 100 = good quality
  source?: string;                     // Data source identifier
}
```

### Time-Series Storage
```typescript
interface TimeSeriesIndex {
  tagName: string;
  startTime: Date;
  endTime: Date;
  pointCount: number;
  dataPoints: SurrogateDataPoint[];
  aggregatedData?: {                   // Pre-computed aggregations
    [interval: string]: {              // "1m", "5m", "1h", "1d"
      min: number;
      max: number;
      avg: number;
      count: number;
      timestamp: Date;
    }[];
  };
}
```

## Configuration System

### Server Configuration
```typescript
interface SurrogateConfig {
  server: {
    port: number;                      // Default: 8080
    host: string;                      // Default: "localhost"
    enableCors: boolean;               // Default: true
    requestTimeout: number;            // Default: 30000ms
  };
  authentication: {
    enabled: boolean;                  // Default: true
    username: string;                  // Default: "historian"
    password: string;                  // Default: "password"
    authType: 'basic' | 'bearer';      // Default: "basic"
  };
  storage: {
    maxDataPoints: number;             // Default: 1000000
    retentionHours: number;            // Default: 24
    compressionEnabled: boolean;       // Default: true
    aggregationIntervals: string[];    // ["1m", "5m", "1h", "1d"]
  };
  simulation: {
    enableDataGeneration: boolean;     // Default: true
    generationInterval: number;        // Default: 1000ms
    equipmentProfiles: string[];       // Equipment types to simulate
    noiseLevel: number;                // 0.0-1.0, default: 0.05
  };
  testing: {
    enableErrorSimulation: boolean;    // Default: false
    errorRate: number;                 // 0.0-1.0, default: 0.01
    latencySimulation: boolean;        // Default: false
    averageLatency: number;            // Default: 50ms
  };
}
```

## Test Scenarios

### 1. Equipment Data Collection
- **CNC Machine Simulation**: Spindle speed, feed rate, cutting temperature
- **Press Operation**: Tonnage, cycle time, position feedback
- **Oven Process**: Temperature profiles, heating/cooling curves
- **Quality Station**: Measurement data with statistical variations

### 2. Process Monitoring
- **Batch Process**: Recipe execution with parameter tracking
- **Continuous Process**: Flow rates, pressures, temperatures
- **Material Flow**: Inventory levels, consumption rates
- **Energy Monitoring**: Power consumption, efficiency metrics

### 3. Alarm and Event Handling
- **Equipment Alarms**: Fault conditions, maintenance alerts
- **Process Alarms**: Out-of-spec conditions, limit violations
- **System Events**: Startup/shutdown sequences, mode changes
- **Quality Events**: Non-conformance detection, corrective actions

### 4. Performance and Scale Testing
- **High-Volume Data**: 10,000+ tags with 1-second sampling
- **Burst Traffic**: Simultaneous writes from multiple sources
- **Historical Queries**: Large time range aggregations
- **Concurrent Users**: Multiple simultaneous query sessions

## Error Simulation

### Configurable Failure Modes
1. **Connection Failures**: Network timeouts, connection refused
2. **Authentication Errors**: Invalid credentials, expired tokens
3. **Rate Limiting**: Too many requests, quota exceeded
4. **Data Validation**: Invalid tag names, out-of-range values
5. **Storage Errors**: Disk full, memory exhaustion
6. **Processing Delays**: Slow queries, write backlog

### Error Configuration
```typescript
interface ErrorSimulationConfig {
  connectionFailureRate: number;       // 0.0-1.0
  authenticationErrorRate: number;     // 0.0-1.0
  validationErrorRate: number;         // 0.0-1.0
  storageErrorRate: number;            // 0.0-1.0
  averageProcessingDelay: number;      // Milliseconds
  enableRandomErrors: boolean;
}
```

## Performance Characteristics

### Target Performance
- **Write Throughput**: 10,000 points/second
- **Query Response**: <100ms for typical ranges (1 hour, 1000 points)
- **Memory Usage**: <256MB for 24 hours of data (1000 tags, 1-second intervals)
- **Startup Time**: <2 seconds for test environment
- **CPU Usage**: <5% during normal operation

### Monitoring Metrics
- Data points stored/retrieved per second
- Memory usage and garbage collection
- API response times by endpoint
- Error rates and types
- Tag and query statistics

## Docker Integration

### Container Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 8080
CMD ["node", "dist/server/ProficyHistorianSurrogate.js"]
```

### Docker Compose Integration
```yaml
services:
  proficy-historian-surrogate:
    build: ./src/tests/infrastructure/proficy-historian-surrogate
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=test
      - HISTORIAN_PORT=8080
      - HISTORIAN_AUTH_ENABLED=true
    volumes:
      - ./test-data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/historian/health"]
      interval: 10s
      timeout: 5s
      retries: 3
```

## Testing Framework Integration

### Vitest Integration
```typescript
// Test setup with automatic surrogate management
export class ProficyHistorianTestHarness {
  private surrogate: ProficyHistorianSurrogate;
  private adapter: ProficyHistorianAdapter;

  async setup(): Promise<void> {
    this.surrogate = new ProficyHistorianSurrogate(testConfig);
    await this.surrogate.start();

    this.adapter = new ProficyHistorianAdapter({
      baseUrl: `http://localhost:${this.surrogate.port}`,
      username: 'test',
      password: 'test'
    });
  }

  async teardown(): Promise<void> {
    await this.surrogate.stop();
  }
}
```

### Test Utilities
```typescript
// Predefined test scenarios
export const TestScenarios = {
  basicEquipmentData: () => SurrogateDataPreloader.loadCNCScenario(),
  processMonitoring: () => SurrogateDataPreloader.loadBatchProcessScenario(),
  alarmHandling: () => SurrogateDataPreloader.loadAlarmScenario(),
  performanceTest: () => SurrogateDataPreloader.loadHighVolumeScenario(),
};
```

## Future Enhancements

1. **Real-time Subscriptions**: WebSocket support for live data streaming
2. **Advanced Analytics**: Statistical process control calculations
3. **Multi-tenancy**: Support for multiple isolated test environments
4. **Data Persistence**: Optional file-based storage for longer test scenarios
5. **API Versioning**: Support for different Proficy Historian API versions
6. **Integration Adapters**: Support for other historian systems (OSIsoft PI, Wonderware)

This architecture provides a comprehensive foundation for creating a realistic and feature-complete GE Proficy Historian surrogate system that will enable robust integration testing for the MachShop3 manufacturing execution system.