# Oracle EBS Surrogate - Configuration and Customization Guide

Complete guide for configuring and customizing the Oracle EBS Surrogate system for different environments and use cases.

## Table of Contents

1. [Configuration Options](#configuration-options)
2. [Database Configuration](#database-configuration)
3. [Logging Configuration](#logging-configuration)
4. [Webhook Configuration](#webhook-configuration)
5. [API Customization](#api-customization)
6. [Data Sync Configuration](#data-sync-configuration)
7. [Performance Tuning](#performance-tuning)
8. [Security Configuration](#security-configuration)

## Configuration Options

### Environment Variables

Create `.env` file in the project root:

```env
# Server Configuration
NODE_ENV=production
PORT=3002
HOST=0.0.0.0

# Database Configuration
DB_PATH=/app/data/oracle-ebs.db
DB_TIMEOUT=5000
DB_MAX_CONNECTIONS=10

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=logs/oracle-ebs.log

# Webhook Configuration
WEBHOOK_POLL_INTERVAL=10000
MAX_WEBHOOK_RETRIES=3
WEBHOOK_BACKOFF_SECONDS=60
WEBHOOK_TIMEOUT=5000

# Work Order Configuration
WORK_ORDER_AUTO_INCREMENT=true
WORK_ORDER_STATUS_NOTIFICATION=true

# Inventory Configuration
INVENTORY_LOW_STOCK_THRESHOLD=50
INVENTORY_REORDER_POINT=100
INVENTORY_AUTOMATIC_REORDER=false

# PO Receipt Configuration
PO_THREE_WAY_MATCH_ENABLED=true
PO_AUTO_RECEIPT=false

# Data Sync Configuration
DATA_SYNC_ENABLED=true
DATA_SYNC_INTERVAL=60000
DATA_SYNC_TIMEOUT=30000
MAXIMO_API_URL=https://maximo.example.com/api
INDYSOFT_API_URL=https://indysoft.example.com/api

# Financial Configuration
FINANCIAL_GL_ACCOUNT_PREFIX=51
FINANCIAL_COST_CENTER_REQUIRED=true
FINANCIAL_AUDIT_ENABLED=true

# Test Data Configuration
TEST_DATA_SEED=12345
TEST_DATA_BATCH_SIZE=50
```

### Configuration File

Create `config.json` for structured configuration:

```json
{
  "server": {
    "port": 3002,
    "host": "0.0.0.0",
    "nodeEnv": "production"
  },
  "database": {
    "path": "/app/data/oracle-ebs.db",
    "timeout": 5000,
    "maxConnections": 10,
    "pragmas": {
      "journal_mode": "WAL",
      "cache_size": 10000,
      "foreign_keys": true,
      "synchronous": 1
    }
  },
  "logging": {
    "level": "info",
    "format": "json",
    "file": "logs/oracle-ebs.log",
    "maxSize": "10m",
    "maxFiles": 10
  },
  "webhook": {
    "pollInterval": 10000,
    "maxRetries": 3,
    "backoffSeconds": 60,
    "timeout": 5000,
    "enabled": true
  },
  "workOrder": {
    "autoIncrement": true,
    "statusNotification": true,
    "defaultEstimatedHours": 8
  },
  "inventory": {
    "lowStockThreshold": 50,
    "reorderPoint": 100,
    "automaticReorder": false
  },
  "dataSync": {
    "enabled": true,
    "interval": 60000,
    "timeout": 30000,
    "sources": {
      "maximo": {
        "url": "https://maximo.example.com/api",
        "enabled": true
      },
      "indysoft": {
        "url": "https://indysoft.example.com/api",
        "enabled": true
      }
    }
  },
  "financial": {
    "glAccountPrefix": "51",
    "costCenterRequired": true,
    "auditEnabled": true
  }
}
```

## Database Configuration

### SQLite Configuration

#### PragMas for Performance

```sql
-- Enable Write-Ahead Logging for concurrency
PRAGMA journal_mode=WAL;

-- Set cache size (in pages)
PRAGMA cache_size=10000;

-- Synchronous mode (0=off, 1=normal, 2=full)
PRAGMA synchronous=1;

-- Foreign keys
PRAGMA foreign_keys=ON;

-- Page size
PRAGMA page_size=4096;

-- Temp store in memory
PRAGMA temp_store=MEMORY;

-- Query only mode (read-only)
PRAGMA query_only=0;
```

#### Connection Pooling

```typescript
// src/services/database.service.ts configuration
const config = {
  timeout: 5000,
  maxConnections: 10,
  connectionTimeout: 10000,
  idleTimeout: 30000
};
```

### Database Initialization

```bash
# Initialize database with schema
npm run db:init

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Backup database
npm run db:backup

# Restore database
npm run db:restore --file=backup.db
```

## Logging Configuration

### Log Levels

```typescript
// src/utils/logger.ts
const logLevels = {
  debug: 0,    // Detailed debug information
  info: 1,     // General informational messages
  warn: 2,     // Warning messages
  error: 3,    // Error messages
  fatal: 4     // Fatal errors
};
```

### Structured Logging

```typescript
// Configure structured logging
logger.info('User action', {
  userId: 'user-123',
  action: 'create_work_order',
  workOrderId: 'wo-456',
  timestamp: new Date().toISOString(),
  duration: 150
});
```

### Log Aggregation

#### ELK Stack Integration

```json
{
  "outputs": {
    "elasticsearch": {
      "hosts": ["http://elasticsearch:9200"],
      "index": "oracle-ebs-%{+YYYY.MM.dd}"
    }
  }
}
```

#### Datadog Integration

```typescript
const tracer = require('dd-trace').init({
  hostname: 'datadog-agent',
  port: 8126,
  service: 'oracle-ebs-surrogate',
  env: 'production'
});
```

## Webhook Configuration

### Event Types

```typescript
export type WebhookEvent =
  | 'WORK_ORDER_CREATED'
  | 'WORK_ORDER_STATUS_CHANGED'
  | 'INVENTORY_TRANSACTION'
  | 'INVENTORY_THRESHOLD_ALERT'
  | 'PO_RECEIPT_RECEIVED'
  | 'EQUIPMENT_DOWNTIME_ALERT';
```

### Retry Strategy

```typescript
// Exponential backoff configuration
const retryConfig = {
  maxRetries: 3,
  initialBackoff: 60,        // seconds
  maxBackoff: 3600,          // seconds (1 hour)
  backoffMultiplier: 2,      // exponential
  timeoutPerRequest: 5000    // milliseconds
};

// Retry schedule:
// Attempt 1: immediate
// Attempt 2: 60 seconds
// Attempt 3: 120 seconds
// Attempt 4: 240 seconds
```

### Custom Webhook Filters

```typescript
// Filter events by conditions
const subscription = {
  name: 'Critical Alerts',
  url: 'https://example.com/webhooks',
  events: ['INVENTORY_THRESHOLD_ALERT'],
  filter: {
    field: 'quantity',
    operator: 'lt',
    value: 10
  }
};
```

## API Customization

### Custom Endpoints

```typescript
// src/routes/custom.ts
import express, { Router } from 'express';

const router = Router();

router.post('/custom/operation', async (req, res) => {
  try {
    const result = await customBusinessLogic(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### Request/Response Middleware

```typescript
// src/middleware/transform.ts
export const transformResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    const enhanced = {
      ...data,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    };
    return originalJson(enhanced);
  };
  
  next();
};

// Register middleware
app.use(transformResponse);
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.user?.isAdmin
});

app.use('/api/', limiter);
```

## Data Sync Configuration

### Master Data Sources

```typescript
// src/services/data-sync.service.ts
const dataSyncConfig = {
  sources: [
    {
      name: 'maximo',
      url: 'https://maximo.example.com/api',
      endpoints: [
        '/equipment',
        '/workorders',
        '/inventory'
      ],
      pollInterval: 60000,
      timeout: 30000,
      retry: { maxAttempts: 3 }
    },
    {
      name: 'indysoft',
      url: 'https://indysoft.example.com/api',
      endpoints: [
        '/purchase-orders',
        '/receipts'
      ],
      pollInterval: 120000,
      timeout: 30000,
      retry: { maxAttempts: 3 }
    }
  ]
};
```

### Data Transformation

```typescript
// Map external data to internal schema
const transformEquipment = (externalData) => {
  return {
    id: externalData.EQUIPMENT_ID,
    name: externalData.DESCRIPTION,
    status: mapStatus(externalData.STATUS),
    location: externalData.LOCATION,
    costCenter: externalData.COST_CENTER
  };
};
```

## Performance Tuning

### Query Optimization

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_cost_center ON work_orders(cost_center);
CREATE INDEX idx_inventory_items_part_number ON inventory_items(part_number);
CREATE INDEX idx_cost_transactions_work_order ON cost_transactions(work_order_id);

-- Analyze query plans
EXPLAIN QUERY PLAN SELECT * FROM work_orders WHERE status = 'COMPLETED';
```

### Connection Pooling

```typescript
// Configure connection pooling
const poolConfig = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  reapIntervalMillis: 5000
};
```

### Caching Strategy

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

// Cache work orders
const getWorkOrder = async (id) => {
  const cached = cache.get(`work_order_${id}`);
  if (cached) return cached;
  
  const data = await db.get('SELECT * FROM work_orders WHERE id = ?', [id]);
  cache.set(`work_order_${id}`, data);
  return data;
};
```

## Security Configuration

### HTTPS/TLS

```typescript
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('/path/to/private.key'),
  cert: fs.readFileSync('/path/to/certificate.cert')
};

https.createServer(options, app).listen(3443);
```

### CORS Configuration

```typescript
const corsOptions = {
  origin: ['https://example.com', 'https://app.example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### Request Validation

```typescript
import { body, validationResult } from 'express-validator';

const validateWorkOrder = [
  body('equipment_id').isString().notEmpty(),
  body('description').isString().notEmpty(),
  body('estimated_hours').isNumeric().gt(0),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

app.post('/work-orders', validateWorkOrder, handler);
```

### API Key Authentication

```typescript
// src/middleware/auth.ts
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

app.use('/api/', authMiddleware);
```

### Sensitive Data Masking

```typescript
// Mask sensitive data in logs
const maskSensitiveData = (obj) => {
  const masked = { ...obj };
  if (masked.password) masked.password = '***';
  if (masked.apiKey) masked.apiKey = '***';
  return masked;
};
```

