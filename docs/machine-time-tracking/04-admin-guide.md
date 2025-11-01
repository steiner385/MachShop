# Machine Time Tracking Administrator Guide

## Overview

This guide provides comprehensive instructions for system administrators to configure, manage, and maintain the Machine Time Tracking & Costing System. It covers initial setup, ongoing maintenance, monitoring, troubleshooting, and performance optimization.

## System Architecture

```mermaid
graph TB
    subgraph "Data Sources"
        A[OPC-UA Servers]
        B[Modbus Devices]
        C[MTConnect Agents]
        D[MQTT Brokers]
        E[Historian Systems]
        F[Manual Entry]
    end

    subgraph "Processing Layer"
        G[Equipment Signal Processor]
        H[Machine Time Service]
        I[Cost Calculator]
    end

    subgraph "Storage"
        J[(PostgreSQL Database)]
        K[(Redis Cache)]
        L[(Time Series DB)]
    end

    subgraph "API Layer"
        M[REST API]
        N[WebSocket Server]
        O[GraphQL API]
    end

    subgraph "Clients"
        P[Web Dashboard]
        Q[Mobile Apps]
        R[Reporting Tools]
        S[ERP Integration]
    end

    A --> G
    B --> G
    C --> G
    D --> G
    E --> G
    F --> H
    G --> H
    H --> I
    H --> J
    I --> J
    G --> K
    H --> K
    G --> L
    J --> M
    K --> M
    L --> M
    M --> N
    M --> O
    M --> P
    M --> Q
    M --> R
    M --> S
```

## Initial System Setup

### 1. Database Configuration

#### PostgreSQL Setup

```sql
-- Create database and user
CREATE DATABASE machshop_production;
CREATE USER machshop_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE machshop_production TO machshop_user;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configure connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
```

#### Time Series Database (TimescaleDB)

```sql
-- Install TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create hypertable for equipment signals
CREATE TABLE equipment_signals (
    time TIMESTAMPTZ NOT NULL,
    equipment_id TEXT NOT NULL,
    signal_type TEXT,
    value JSONB,
    quality TEXT
);

SELECT create_hypertable('equipment_signals', 'time');

-- Create continuous aggregate for hourly summaries
CREATE MATERIALIZED VIEW equipment_hourly_summary
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS hour,
    equipment_id,
    COUNT(*) as signal_count,
    AVG((value->>'numeric_value')::float) as avg_value
FROM equipment_signals
GROUP BY hour, equipment_id;

-- Add refresh policy
SELECT add_continuous_aggregate_policy('equipment_hourly_summary',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

#### Redis Cache Setup

```bash
# Redis configuration (redis.conf)
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Enable Redis modules
loadmodule /usr/lib/redis/modules/redisearch.so
loadmodule /usr/lib/redis/modules/redistimeseries.so
```

### 2. Environment Configuration

```bash
# .env.production
NODE_ENV=production

# Database
DATABASE_URL=postgresql://machshop_user:secure_password@localhost:5432/machshop_production
REDIS_URL=redis://localhost:6379

# Time Series Database
TIMESCALE_URL=postgresql://tsdb_user:password@localhost:5433/timeseries

# Authentication
JWT_SECRET=your-256-bit-secret-key
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=30d

# API Configuration
API_PORT=3000
API_RATE_LIMIT=1000
API_TIMEOUT=30000

# Signal Processing
SIGNAL_DEBOUNCE_MS=2000
SIGNAL_TIMEOUT_MS=300000
MAX_SIGNAL_QUEUE_SIZE=10000

# Cost Configuration
DEFAULT_COSTING_MODEL=MACHINE_HOURS
DEFAULT_OVERHEAD_RATE=0.15
DEFAULT_MACHINE_RATE=125.00

# Monitoring
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000
LOG_LEVEL=info

# External Systems
OPC_UA_SERVER=opc.tcp://192.168.1.100:4840
MODBUS_GATEWAY=192.168.1.150:502
MQTT_BROKER=mqtt://192.168.1.50:1883
HISTORIAN_URL=https://historian.factory.local
```

### 3. SSL/TLS Configuration

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.machshop3.com;

    ssl_certificate /etc/ssl/certs/machshop3.crt;
    ssl_certificate_key /etc/ssl/private/machshop3.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location /api/v2/machine-time {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Equipment Configuration

### 1. Equipment Setup

```javascript
// Equipment configuration script
const equipmentConfig = {
  equipmentId: 'equip-cnc-001',
  name: 'CNC Mill #1',
  type: 'CNC_MILL',
  manufacturer: 'Haas',
  model: 'VF-2SS',
  serialNumber: 'SN123456',

  capabilities: {
    maxSpindleSpeed: 12000,
    maxFeedRate: 1000,
    toolCapacity: 30,
    palletChanger: false,
    coolantTypes: ['FLOOD', 'MIST', 'THROUGH_SPINDLE']
  },

  costing: {
    purchasePrice: 125000,
    installationDate: '2020-01-15',
    depreciationYears: 7,
    salvageValue: 12500,
    machineHourRate: 125.00,
    setupHourRate: 85.00,
    idleHourRate: 35.00
  },

  maintenance: {
    annualMaintenanceCost: 15000,
    preventiveSchedule: 'MONTHLY',
    lastMaintenanceDate: '2024-10-01',
    nextMaintenanceDate: '2024-11-01',
    maintenanceHoursPerYear: 100
  },

  power: {
    installedPowerKW: 25,
    averageLoadFactor: 0.7,
    energyRatePerKWH: 0.12
  },

  signals: {
    source: 'OPC_UA',
    endpoint: 'opc.tcp://192.168.1.101:4840',
    nodeMapping: {
      status: 'ns=2;s=CNC_01.Status',
      program: 'ns=2;s=CNC_01.Program',
      cycleCount: 'ns=2;s=CNC_01.CycleCount',
      spindleSpeed: 'ns=2;s=CNC_01.SpindleSpeed',
      feedRate: 'ns=2;s=CNC_01.FeedRate',
      toolNumber: 'ns=2;s=CNC_01.ToolNumber'
    }
  }
};

// Register equipment
async function registerEquipment(config) {
  const equipment = await prisma.equipment.create({
    data: {
      id: config.equipmentId,
      name: config.name,
      type: config.type,
      manufacturer: config.manufacturer,
      model: config.model,
      serialNumber: config.serialNumber,
      capabilities: config.capabilities,
      machineHourRate: config.costing.machineHourRate,
      metadata: config
    }
  });

  // Configure signal processor
  await equipmentSignalProcessor.registerEquipment({
    equipmentId: config.equipmentId,
    signalConfig: config.signals
  });

  return equipment;
}
```

### 2. Signal Source Configuration

```javascript
// Configure multiple signal sources for an equipment
const signalConfiguration = {
  primary: {
    type: 'OPC_UA',
    priority: 1,
    config: {
      endpoint: 'opc.tcp://192.168.1.101:4840',
      security: 'SignAndEncrypt',
      authentication: {
        type: 'Certificate',
        certPath: '/certs/client.pem',
        keyPath: '/certs/client.key'
      }
    }
  },

  fallback: {
    type: 'MODBUS_TCP',
    priority: 2,
    config: {
      host: '192.168.1.101',
      port: 502,
      unitId: 1,
      registers: [
        { address: 40001, type: 'HOLDING', dataType: 'status' },
        { address: 40010, type: 'HOLDING', dataType: 'cycleCount' }
      ]
    }
  },

  manual: {
    type: 'MANUAL',
    priority: 3,
    config: {
      allowedSources: ['KIOSK', 'MOBILE', 'API'],
      requireApproval: false
    }
  }
};
```

## Costing Configuration

### 1. Global Costing Settings

```javascript
const globalCostingConfig = {
  // Default costing model
  defaultModel: 'MACHINE_HOURS',

  // Overhead rates by department
  overheadRates: {
    machining: 0.35,
    assembly: 0.25,
    finishing: 0.20,
    packaging: 0.15
  },

  // Labor rates by classification
  laborRates: {
    classifications: {
      apprentice: { base: 25.00, overtime: 37.50 },
      journeyman: { base: 35.00, overtime: 52.50 },
      master: { base: 45.00, overtime: 67.50 },
      specialist: { base: 55.00, overtime: 82.50 }
    },

    shifts: {
      day: { multiplier: 1.0, hours: '06:00-14:00' },
      evening: { multiplier: 1.15, hours: '14:00-22:00' },
      night: { multiplier: 1.25, hours: '22:00-06:00' }
    },

    holidays: {
      multiplier: 2.0,
      dates: ['2024-01-01', '2024-07-04', '2024-12-25']
    }
  },

  // Allocation methods
  allocationMethods: {
    overhead: 'ACTIVITY_BASED',
    depreciation: 'STRAIGHT_LINE',
    maintenance: 'USAGE_BASED'
  },

  // Cost centers
  costCenters: [
    {
      id: 'CC-100',
      name: 'CNC Machining',
      overhead: 150000,
      allocationBase: 'MACHINE_HOURS'
    },
    {
      id: 'CC-200',
      name: 'Manual Assembly',
      overhead: 80000,
      allocationBase: 'LABOR_HOURS'
    }
  ]
};

// Apply configuration
async function applyGlobalCostingConfig(config) {
  await prisma.costingConfiguration.upsert({
    where: { id: 'global' },
    update: config,
    create: { id: 'global', ...config }
  });
}
```

### 2. Product-Specific Costing

```javascript
const productCostingConfig = {
  productId: 'prod-xyz-789',
  costingOverrides: {
    model: 'BOTH',
    laborAllocation: 0.3,
    machineAllocation: 0.7,
    customOverheadRate: 0.22,
    targetCostPerUnit: 45.00
  },

  operations: [
    {
      operationId: 'op-001',
      standardTime: 0.5,
      setupTime: 0.25,
      machineRate: 125.00,
      laborRate: 35.00
    },
    {
      operationId: 'op-002',
      standardTime: 0.75,
      setupTime: 0.1,
      machineRate: 110.00,
      laborRate: 35.00
    }
  ]
};
```

## Monitoring and Health Checking

### 1. System Health Dashboard

```javascript
class SystemHealthMonitor {
  constructor() {
    this.metrics = {
      system: {},
      database: {},
      signals: {},
      api: {}
    };
  }

  async collectMetrics() {
    // System metrics
    this.metrics.system = {
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      loadAverage: os.loadavg()
    };

    // Database metrics
    this.metrics.database = await this.getDatabaseMetrics();

    // Signal processing metrics
    this.metrics.signals = {
      activeProcessors: equipmentSignalProcessor.getActiveCount(),
      signalQueue: equipmentSignalProcessor.getQueueSize(),
      processingRate: equipmentSignalProcessor.getProcessingRate(),
      errorRate: equipmentSignalProcessor.getErrorRate()
    };

    // API metrics
    this.metrics.api = {
      requestsPerMinute: this.getRequestRate(),
      averageResponseTime: this.getAverageResponseTime(),
      errorRate: this.getAPIErrorRate(),
      activeConnections: this.getActiveConnections()
    };

    return this.metrics;
  }

  async getDatabaseMetrics() {
    const result = await prisma.$queryRaw`
      SELECT
        numbackends as connections,
        xact_commit as commits,
        xact_rollback as rollbacks,
        blks_read as blocks_read,
        blks_hit as blocks_hit,
        tup_returned as rows_returned,
        tup_fetched as rows_fetched,
        tup_inserted as rows_inserted,
        tup_updated as rows_updated,
        tup_deleted as rows_deleted
      FROM pg_stat_database
      WHERE datname = current_database()
    `;

    return result[0];
  }

  checkHealth() {
    const health = {
      status: 'HEALTHY',
      issues: []
    };

    // Check CPU usage
    if (this.metrics.system.cpuUsage.system > 80) {
      health.issues.push({
        severity: 'WARNING',
        component: 'CPU',
        message: 'High CPU usage detected'
      });
    }

    // Check memory usage
    const memUsagePercent = (this.metrics.system.memoryUsage.heapUsed /
                           this.metrics.system.memoryUsage.heapTotal) * 100;
    if (memUsagePercent > 90) {
      health.issues.push({
        severity: 'CRITICAL',
        component: 'MEMORY',
        message: 'Critical memory usage'
      });
      health.status = 'CRITICAL';
    }

    // Check database connections
    if (this.metrics.database.connections > 180) {
      health.issues.push({
        severity: 'WARNING',
        component: 'DATABASE',
        message: 'High number of database connections'
      });
    }

    // Check signal processing
    if (this.metrics.signals.errorRate > 0.05) {
      health.issues.push({
        severity: 'WARNING',
        component: 'SIGNALS',
        message: 'High signal processing error rate'
      });
    }

    if (health.issues.length > 0 && health.status === 'HEALTHY') {
      health.status = 'DEGRADED';
    }

    return health;
  }
}
```

### 2. Monitoring Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'machine-time-api'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
```

### 3. Alert Rules

```yaml
# alerts.yml
groups:
  - name: machine_time_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High error rate detected
          description: "Error rate is {{ $value }} errors per second"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends > 180
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: High database connections
          description: "{{ $value }} connections to database"

      - alert: SignalProcessingLag
        expr: signal_processing_lag_seconds > 60
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Signal processing lag detected
          description: "Processing lag is {{ $value }} seconds"

      - alert: MachineCostCalculationFailed
        expr: increase(cost_calculation_errors_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Cost calculation errors
          description: "{{ $value }} calculation errors in 5 minutes"
```

## Maintenance Tasks

### 1. Daily Maintenance

```javascript
class DailyMaintenance {
  async run() {
    const tasks = [
      this.validateActiveEntries(),
      this.cleanupStaleSessions(),
      this.archiveCompletedEntries(),
      this.updateCostSummaries(),
      this.checkSignalHealth()
    ];

    const results = await Promise.allSettled(tasks);

    return this.generateMaintenanceReport(results);
  }

  async validateActiveEntries() {
    // Check for orphaned active entries
    const orphaned = await prisma.machineTimeEntry.findMany({
      where: {
        status: 'ACTIVE',
        updatedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    for (const entry of orphaned) {
      logger.warn(`Orphaned active entry found: ${entry.id}`);
      // Auto-stop or alert
    }

    return { task: 'validateActiveEntries', orphaned: orphaned.length };
  }

  async cleanupStaleSessions() {
    const deleted = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return { task: 'cleanupStaleSessions', deleted: deleted.count };
  }

  async archiveCompletedEntries() {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const toArchive = await prisma.machineTimeEntry.findMany({
      where: {
        status: 'COMPLETED',
        endTime: {
          lt: cutoffDate
        }
      }
    });

    // Move to archive table or cold storage
    for (const entry of toArchive) {
      await this.archiveEntry(entry);
    }

    return { task: 'archiveCompletedEntries', archived: toArchive.length };
  }
}

// Schedule daily maintenance
cron.schedule('0 2 * * *', async () => {
  const maintenance = new DailyMaintenance();
  const results = await maintenance.run();
  logger.info('Daily maintenance completed', results);
});
```

### 2. Weekly Maintenance

```javascript
class WeeklyMaintenance {
  async run() {
    const tasks = [
      this.recalculateCostAggregates(),
      this.validateCostingRules(),
      this.optimizeDatabase(),
      this.generateWeeklyReports(),
      this.syncWithERP()
    ];

    return await Promise.allSettled(tasks);
  }

  async optimizeDatabase() {
    // Vacuum and analyze tables
    await prisma.$executeRaw`VACUUM ANALYZE machine_time_entries`;
    await prisma.$executeRaw`VACUUM ANALYZE equipment`;

    // Update statistics
    await prisma.$executeRaw`ANALYZE`;

    // Reindex if needed
    const indexBloat = await this.checkIndexBloat();
    if (indexBloat > 30) {
      await prisma.$executeRaw`REINDEX TABLE machine_time_entries`;
    }

    return { task: 'optimizeDatabase', indexBloat };
  }

  async checkIndexBloat() {
    const result = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
        pg_size_pretty(pg_relation_size(indrelid)) AS table_size,
        ROUND(100 * pg_relation_size(indexrelid) /
              pg_relation_size(indrelid))::INTEGER AS index_ratio
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND indexrelname LIKE 'machine_time%'
      ORDER BY pg_relation_size(indexrelid) DESC;
    `;

    return result[0]?.index_ratio || 0;
  }
}

// Schedule weekly maintenance
cron.schedule('0 3 * * 0', async () => {
  const maintenance = new WeeklyMaintenance();
  const results = await maintenance.run();
  logger.info('Weekly maintenance completed', results);
});
```

### 3. Monthly Maintenance

```javascript
class MonthlyMaintenance {
  async run() {
    const tasks = [
      this.updateStandardCosts(),
      this.reviewCostVariances(),
      this.calibrateSignalProcessors(),
      this.performSecurityAudit(),
      this.archiveHistoricalData()
    ];

    return await Promise.allSettled(tasks);
  }

  async updateStandardCosts() {
    // Review and update standard costs based on actual data
    const actualCosts = await this.calculateActualAverages();
    const standardCosts = await this.getStandardCosts();

    const updates = [];
    for (const [key, standard] of Object.entries(standardCosts)) {
      const actual = actualCosts[key];
      const variance = Math.abs(actual - standard) / standard;

      if (variance > 0.1) {
        updates.push({
          item: key,
          oldStandard: standard,
          newStandard: actual,
          variance: variance
        });
      }
    }

    return { task: 'updateStandardCosts', updates };
  }

  async performSecurityAudit() {
    const audit = {
      expiredTokens: await this.checkExpiredTokens(),
      unusedAccounts: await this.findUnusedAccounts(),
      failedLogins: await this.analyzeFailedLogins(),
      permissions: await this.validatePermissions()
    };

    return { task: 'performSecurityAudit', audit };
  }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Machine time entries not starting automatically

**Symptoms:**
- Equipment signals received but no time entries created
- Manual entries work but automatic ones don't

**Diagnostic Steps:**
```javascript
// Check signal processor status
const processorStatus = equipmentSignalProcessor.getProcessorState(equipmentId);
console.log('Processor status:', processorStatus);

// Check last signals
const signals = equipmentSignalProcessor.getSignalHistory(equipmentId, 10);
console.log('Recent signals:', signals);

// Check for active entries
const activeEntries = await prisma.machineTimeEntry.findMany({
  where: { equipmentId, status: 'ACTIVE' }
});
console.log('Active entries:', activeEntries);
```

**Resolution:**
1. Verify signal mapping configuration
2. Check for existing active entries blocking new ones
3. Validate signal quality and debouncing settings
4. Review equipment authorization settings

#### Issue: Cost calculations incorrect

**Symptoms:**
- Costs don't match expected values
- Variance reports show large discrepancies

**Diagnostic Query:**
```sql
-- Check cost calculation details
SELECT
  mte.id,
  mte.equipment_id,
  mte.duration,
  mte.machine_rate,
  mte.machine_cost,
  mte.duration * mte.machine_rate as calculated_cost,
  ABS(mte.machine_cost - (mte.duration * mte.machine_rate)) as difference
FROM machine_time_entries mte
WHERE mte.created_at > NOW() - INTERVAL '7 days'
  AND ABS(mte.machine_cost - (mte.duration * mte.machine_rate)) > 0.01
ORDER BY difference DESC;
```

**Resolution:**
1. Verify costing model configuration
2. Check overhead allocation settings
3. Validate rate cards and multipliers
4. Review rounding settings

#### Issue: High database connection usage

**Symptoms:**
- Connection pool exhausted errors
- Slow API responses
- Database connection limit reached

**Diagnostic Commands:**
```sql
-- Check current connections
SELECT
  datname,
  usename,
  application_name,
  client_addr,
  state,
  COUNT(*) as connection_count
FROM pg_stat_activity
WHERE datname = 'machshop_production'
GROUP BY datname, usename, application_name, client_addr, state
ORDER BY connection_count DESC;

-- Find long-running queries
SELECT
  pid,
  now() - query_start as duration,
  query,
  state
FROM pg_stat_activity
WHERE datname = 'machshop_production'
  AND state != 'idle'
  AND now() - query_start > interval '1 minute'
ORDER BY duration DESC;
```

**Resolution:**
1. Adjust connection pool settings
2. Implement connection timeout
3. Review and optimize slow queries
4. Add read replicas for reporting

#### Issue: Signal processing lag

**Symptoms:**
- Delays between equipment events and time entries
- Signal queue building up
- High memory usage

**Monitoring Script:**
```javascript
class SignalMonitor {
  async diagnose() {
    const metrics = {
      queueSize: equipmentSignalProcessor.getQueueSize(),
      processingRate: equipmentSignalProcessor.getProcessingRate(),
      avgProcessingTime: equipmentSignalProcessor.getAvgProcessingTime(),
      errorRate: equipmentSignalProcessor.getErrorRate()
    };

    if (metrics.queueSize > 1000) {
      console.warn('Signal queue backlog:', metrics.queueSize);
    }

    if (metrics.avgProcessingTime > 1000) {
      console.warn('Slow signal processing:', metrics.avgProcessingTime, 'ms');
    }

    return metrics;
  }
}
```

**Resolution:**
1. Scale signal processing workers
2. Implement batch processing
3. Optimize debouncing settings
4. Add signal filtering rules

## Performance Optimization

### 1. Database Optimization

```sql
-- Create optimized indexes
CREATE INDEX idx_mte_equipment_status ON machine_time_entries(equipment_id, status)
  WHERE status = 'ACTIVE';

CREATE INDEX idx_mte_date_range ON machine_time_entries(start_time, end_time)
  WHERE end_time IS NOT NULL;

CREATE INDEX idx_mte_work_order ON machine_time_entries(work_order_id)
  WHERE work_order_id IS NOT NULL;

-- Create partial indexes for common queries
CREATE INDEX idx_active_entries ON machine_time_entries(equipment_id)
  WHERE status = 'ACTIVE';

CREATE INDEX idx_recent_entries ON machine_time_entries(created_at)
  WHERE created_at > NOW() - INTERVAL '30 days';

-- Create materialized view for reporting
CREATE MATERIALIZED VIEW daily_equipment_summary AS
SELECT
  DATE(start_time) as date,
  equipment_id,
  COUNT(*) as entry_count,
  SUM(duration) as total_hours,
  SUM(machine_cost) as total_cost,
  AVG(machine_utilization) as avg_utilization
FROM machine_time_entries
WHERE status = 'COMPLETED'
GROUP BY DATE(start_time), equipment_id;

CREATE UNIQUE INDEX ON daily_equipment_summary(date, equipment_id);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_equipment_summary;
```

### 2. Caching Strategy

```javascript
class CacheManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true
    });
  }

  // Cache active entries
  async cacheActiveEntries(equipmentId, entries) {
    const key = `active_entries:${equipmentId}`;
    await this.redis.setex(key, 60, JSON.stringify(entries));
  }

  // Cache equipment configuration
  async cacheEquipmentConfig(equipmentId, config) {
    const key = `equipment_config:${equipmentId}`;
    await this.redis.setex(key, 3600, JSON.stringify(config));
  }

  // Cache cost calculations
  async cacheCostCalculation(entryId, cost) {
    const key = `cost_calc:${entryId}`;
    await this.redis.setex(key, 300, JSON.stringify(cost));
  }

  // Implement cache warming
  async warmCache() {
    // Pre-load frequently accessed data
    const equipment = await prisma.equipment.findMany();

    for (const equip of equipment) {
      await this.cacheEquipmentConfig(equip.id, equip);

      const activeEntries = await prisma.machineTimeEntry.findMany({
        where: { equipmentId: equip.id, status: 'ACTIVE' }
      });

      if (activeEntries.length > 0) {
        await this.cacheActiveEntries(equip.id, activeEntries);
      }
    }
  }
}
```

### 3. Query Optimization

```javascript
class QueryOptimizer {
  // Use database views for complex queries
  async getEquipmentUtilization(equipmentId, startDate, endDate) {
    // Instead of complex join query, use pre-calculated view
    return await prisma.$queryRaw`
      SELECT * FROM equipment_utilization_view
      WHERE equipment_id = ${equipmentId}
        AND date BETWEEN ${startDate} AND ${endDate}
    `;
  }

  // Implement query result caching
  async getCachedReport(reportType, params) {
    const cacheKey = `report:${reportType}:${JSON.stringify(params)}`;

    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Generate report
    const report = await this.generateReport(reportType, params);

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(report));

    return report;
  }

  // Use connection pooling efficiently
  async batchQuery(queries) {
    const results = await prisma.$transaction(
      queries.map(query => prisma.$queryRawUnsafe(query))
    );

    return results;
  }
}
```

## Data Retention and Cleanup

### 1. Retention Policy Configuration

```javascript
const retentionPolicy = {
  machineTimeEntries: {
    active: 'INDEFINITE',
    completed: '2_YEARS',
    archived: '7_YEARS'
  },

  signals: {
    raw: '30_DAYS',
    aggregated: '1_YEAR',
    alerts: '2_YEARS'
  },

  reports: {
    daily: '90_DAYS',
    monthly: '2_YEARS',
    annual: '7_YEARS'
  },

  auditLogs: {
    access: '1_YEAR',
    changes: '7_YEARS',
    security: '7_YEARS'
  }
};
```

### 2. Data Archival Process

```javascript
class DataArchiver {
  async archiveOldData() {
    const cutoffDate = this.getCutoffDate('2_YEARS');

    // Move to archive tables
    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO machine_time_entries_archive
        SELECT * FROM machine_time_entries
        WHERE status = 'COMPLETED'
          AND end_time < ${cutoffDate}
      `,

      prisma.$executeRaw`
        DELETE FROM machine_time_entries
        WHERE status = 'COMPLETED'
          AND end_time < ${cutoffDate}
      `
    ]);

    // Compress and move to cold storage
    await this.compressAndStore(cutoffDate);
  }

  async compressAndStore(cutoffDate) {
    // Export to compressed format
    const data = await prisma.machineTimeEntry.findMany({
      where: {
        endTime: { lt: cutoffDate }
      }
    });

    const compressed = zlib.gzipSync(JSON.stringify(data));

    // Store in S3 or similar
    await s3.putObject({
      Bucket: 'machshop-archives',
      Key: `machine-time/${cutoffDate.toISOString()}.json.gz`,
      Body: compressed,
      StorageClass: 'GLACIER'
    }).promise();
  }
}
```

## Security Best Practices

### 1. Access Control

```javascript
const accessControl = {
  roles: {
    ADMIN: ['ALL'],
    SUPERVISOR: ['READ', 'CREATE', 'UPDATE'],
    OPERATOR: ['READ', 'CREATE'],
    VIEWER: ['READ']
  },

  resources: {
    machineTime: {
      create: ['ADMIN', 'SUPERVISOR', 'OPERATOR'],
      read: ['ALL'],
      update: ['ADMIN', 'SUPERVISOR'],
      delete: ['ADMIN']
    },

    costReports: {
      read: ['ADMIN', 'SUPERVISOR'],
      export: ['ADMIN']
    },

    configuration: {
      read: ['ADMIN', 'SUPERVISOR'],
      update: ['ADMIN']
    }
  }
};
```

### 2. Audit Logging

```javascript
class AuditLogger {
  async logAction(action, userId, details) {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        timestamp: new Date(),
        details: JSON.stringify(details),
        ipAddress: this.getClientIP(),
        userAgent: this.getUserAgent()
      }
    });
  }

  async logCostingChange(before, after, userId) {
    await this.logAction('COSTING_CONFIG_CHANGE', userId, {
      before,
      after,
      changes: this.diffObjects(before, after)
    });
  }
}
```

## Disaster Recovery

### 1. Backup Strategy

```bash
#!/bin/bash
# backup.sh

# Database backup
pg_dump -h localhost -U machshop_user -d machshop_production \
  -f /backups/machshop_$(date +%Y%m%d_%H%M%S).sql

# Redis backup
redis-cli --rdb /backups/redis_$(date +%Y%m%d_%H%M%S).rdb

# Configuration backup
tar -czf /backups/config_$(date +%Y%m%d_%H%M%S).tar.gz \
  /app/.env \
  /app/config/ \
  /etc/nginx/

# Upload to S3
aws s3 sync /backups/ s3://machshop-backups/ \
  --storage-class STANDARD_IA

# Clean old local backups
find /backups/ -type f -mtime +7 -delete
```

### 2. Recovery Procedures

```bash
#!/bin/bash
# restore.sh

# Stop services
systemctl stop machshop-api
systemctl stop redis
systemctl stop postgresql

# Restore database
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS machshop_production"
psql -h localhost -U postgres -c "CREATE DATABASE machshop_production"
psql -h localhost -U machshop_user -d machshop_production < $1

# Restore Redis
redis-cli FLUSHALL
redis-cli --rdb $2

# Restart services
systemctl start postgresql
systemctl start redis
systemctl start machshop-api

# Verify restoration
curl http://localhost:3000/health
```

## Compliance and Regulations

### 1. Data Privacy Compliance

```javascript
class ComplianceManager {
  // GDPR compliance
  async handleDataRequest(userId, requestType) {
    switch (requestType) {
      case 'ACCESS':
        return await this.exportUserData(userId);

      case 'DELETE':
        return await this.deleteUserData(userId);

      case 'PORTABILITY':
        return await this.exportPortableData(userId);
    }
  }

  // Anonymize old data
  async anonymizeOldData() {
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    await prisma.machineTimeEntry.updateMany({
      where: {
        createdAt: { lt: cutoff }
      },
      data: {
        createdBy: 'ANONYMIZED',
        modifiedBy: 'ANONYMIZED'
      }
    });
  }
}
```

### 2. Financial Compliance

```javascript
class FinancialCompliance {
  // SOX compliance for cost reporting
  async generateSOXReport() {
    const report = {
      period: this.getCurrentPeriod(),
      controls: await this.verifyControls(),
      changes: await this.getConfigChanges(),
      approvals: await this.getApprovals(),
      segregationOfDuties: await this.verifySoD()
    };

    return report;
  }

  async verifyControls() {
    return {
      costCalculation: await this.verifyCostCalculationIntegrity(),
      accessControl: await this.verifyAccessControl(),
      changeManagement: await this.verifyChangeManagement(),
      dataIntegrity: await this.verifyDataIntegrity()
    };
  }
}
```