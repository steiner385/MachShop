# ERP Integration Administrator Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [System Requirements](#system-requirements)
5. [Initial Setup](#initial-setup)
6. [Integration Management](#integration-management)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Security Configuration](#security-configuration)
9. [Backup & Recovery](#backup--recovery)
10. [Performance Tuning](#performance-tuning)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

## Overview

The MachShop3 ERP Integration System provides bidirectional data synchronization between the Manufacturing Execution System (MES) and Enterprise Resource Planning (ERP) systems. This guide covers administration, configuration, and maintenance of ERP integrations.

### Supported ERP Systems

- **Impact ERP**: Comprehensive MES/ERP solution for aerospace/defense manufacturing
- **SAP S/4HANA**: Enterprise resource planning with OData service integration
- **Oracle Cloud ERP**: Cloud-based ERP with REST API integration
- **Custom Systems**: Extensible adapter framework for custom integrations

### Key Capabilities

- **Real-time Synchronization**: Event-driven updates via webhooks
- **Batch Processing**: Scheduled sync jobs for bulk data transfer
- **Data Transformation**: Configurable field mapping and data conversion
- **Error Handling**: Automatic retry with exponential backoff
- **Audit Trail**: Complete transaction history and reconciliation
- **Multi-tenant Support**: Isolated integrations per business unit

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      MachShop3 MES                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Webhook    │  │     Sync     │  │ Reconciliation│      │
│  │   Service    │  │   Scheduler  │  │    Engine     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│  ┌──────┴──────────────────┴──────────────────┴───────┐     │
│  │          ERP Integration Service                     │     │
│  └──────────────────────┬───────────────────────────────┘     │
│                         │                                     │
│  ┌──────────────────────┴───────────────────────────────┐     │
│  │              Adapter Factory                          │     │
│  └────┬──────────┬──────────┬──────────┬───────────────┘     │
│       │          │          │          │                     │
│  ┌────┴────┐ ┌──┴────┐ ┌──┴────┐ ┌───┴────┐               │
│  │ Impact  │ │  SAP  │ │Oracle │ │ Custom │               │
│  │ Adapter │ │Adapter│ │Adapter│ │ Adapter│               │
│  └─────────┘ └───────┘ └───────┘ └────────┘               │
│                                                               │
└───────────────────────────┬───────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────┴────┐        ┌────┴────┐        ┌────┴────┐
   │ Impact  │        │   SAP   │        │ Oracle  │
   │   ERP   │        │S/4HANA  │        │Cloud ERP│
   └─────────┘        └─────────┘        └─────────┘
```

### Data Flow

1. **Inbound (ERP → MES)**:
   - ERP systems push data via webhooks or MES polls via scheduled jobs
   - Data passes through adapter for normalization
   - Field mappings transform ERP format to MES format
   - Data is validated and persisted in MES database

2. **Outbound (MES → ERP)**:
   - MES events trigger webhook notifications
   - Data is transformed using field mappings
   - Adapter formats data for target ERP system
   - Transaction is logged with status tracking

## Prerequisites

### Software Requirements

- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- Redis 7.x (for job queuing)
- Docker (optional, for containerized deployment)

### Access Requirements

- Administrative access to MachShop3 system
- Network connectivity to ERP systems
- API credentials for each ERP system
- SSL certificates for secure communication

### User Permissions

Required permissions for ERP administration:
- `erp:admin` - Full administrative access
- `erp:create` - Create new integrations
- `erp:update` - Modify existing integrations
- `erp:delete` - Remove integrations
- `erp:sync` - Execute sync operations
- `erp:reconciliation` - Run reconciliation processes

## System Requirements

### Minimum Hardware

- **CPU**: 4 cores @ 2.4GHz
- **Memory**: 8GB RAM
- **Storage**: 50GB available disk space
- **Network**: 100Mbps connection

### Recommended Hardware

- **CPU**: 8 cores @ 3.0GHz
- **Memory**: 16GB RAM
- **Storage**: 100GB SSD storage
- **Network**: 1Gbps connection

### Network Requirements

- **Outbound Ports**:
  - 443 (HTTPS) for API communication
  - 1433 (SQL Server) if using database integration
  - 8443 (SAP) for SAP Gateway services

- **Inbound Ports**:
  - 3001 (API server)
  - 9090 (Webhook receiver)

## Initial Setup

### 1. Environment Configuration

Create or update the `.env` file with ERP-specific variables:

```bash
# ERP Integration Configuration
ERP_INTEGRATION_ENABLED=true
ERP_SYNC_INTERVAL=300000  # 5 minutes in milliseconds
ERP_MAX_RETRY_ATTEMPTS=3
ERP_RETRY_DELAY=60000  # 1 minute
WEBHOOK_BASE_URL=https://your-domain.com
WEBHOOK_TIMEOUT=30000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/machshop3

# Redis Configuration (for job queue)
REDIS_URL=redis://localhost:6379

# Logging
ERP_LOG_LEVEL=info  # debug, info, warn, error
```

### 2. Database Migration

Run the ERP integration schema migrations:

```bash
# Run Prisma migrations
npx prisma migrate deploy

# Seed initial ERP configuration data
npm run seed:erp
```

### 3. SSL Certificate Setup

For production environments, configure SSL certificates:

```bash
# Place certificates in the certs directory
mkdir -p certs
cp /path/to/cert.pem certs/
cp /path/to/key.pem certs/
cp /path/to/ca.pem certs/  # If using custom CA

# Update environment variables
SSL_CERT_PATH=./certs/cert.pem
SSL_KEY_PATH=./certs/key.pem
SSL_CA_PATH=./certs/ca.pem
```

### 4. Service Initialization

Start the ERP integration services:

```bash
# Start all services
npm run start:erp

# Or start individual services
npm run start:webhook-service
npm run start:sync-scheduler
npm run start:reconciliation-engine
```

## Integration Management

### Creating an Integration

#### Via Admin UI

1. Navigate to **Settings → ERP Integrations**
2. Click **Add New Integration**
3. Fill in the configuration form:
   - **Name**: Unique identifier for the integration
   - **ERP System**: Select from Impact, SAP, Oracle, or Custom
   - **Description**: Brief description of the integration purpose
   - **Connection Method**: API, File, or Database
4. Configure authentication based on the selected method
5. Test the connection
6. Save the integration

#### Via API

```bash
curl -X POST https://api.machshop3.com/api/v1/erp/integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "impact-production",
    "erpSystem": "IMPACT",
    "description": "Production Impact ERP Integration",
    "apiEndpoint": "https://impact.company.com/api",
    "apiVersion": "v2",
    "authMethod": "BASIC",
    "apiUsername": "api_user",
    "apiPassword": "encrypted_password",
    "syncSchedule": {
      "enabled": true,
      "interval": "*/15 * * * *"
    }
  }'
```

### Configuring Field Mappings

Field mappings define how data is transformed between MES and ERP systems.

#### Example Field Mapping Configuration

```json
{
  "integrationId": "impact-production",
  "entityType": "PurchaseOrder",
  "mappings": [
    {
      "mesField": "poNumber",
      "erpField": "PO_NUM",
      "dataType": "string",
      "isRequired": true
    },
    {
      "mesField": "vendorId",
      "erpField": "VENDOR_CODE",
      "dataType": "string",
      "isRequired": true,
      "transformation": "value.toUpperCase()"
    },
    {
      "mesField": "totalAmount",
      "erpField": "PO_TOTAL",
      "dataType": "number",
      "isRequired": true,
      "transformation": "Math.round(value * 100) / 100"
    },
    {
      "mesField": "status",
      "erpField": "PO_STATUS",
      "dataType": "string",
      "isRequired": true,
      "transformation": "{'DRAFT': '10', 'APPROVED': '20', 'SENT': '30'}[value] || value"
    }
  ]
}
```

### Managing Sync Jobs

#### Schedule Configuration

Configure automatic synchronization schedules using cron expressions:

```javascript
// Every 15 minutes
"*/15 * * * *"

// Daily at 2 AM
"0 2 * * *"

// Monday-Friday at 6 PM
"0 18 * * 1-5"

// First day of month at midnight
"0 0 1 * *"
```

#### Manual Sync Execution

Trigger manual synchronization via API:

```bash
# Sync all entities
curl -X POST https://api.machshop3.com/api/v1/erp/sync-jobs/impact-production/execute \
  -H "Authorization: Bearer YOUR_TOKEN"

# Sync specific entity type
curl -X POST https://api.machshop3.com/api/v1/erp/sync-jobs/impact-production/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entityTypes": ["PurchaseOrder", "Supplier"]}'
```

### Webhook Configuration

#### Registering Webhooks

```bash
curl -X POST https://api.machshop3.com/api/v1/webhooks/integrations/impact-production \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://impact.company.com/webhooks/mes",
    "eventTypes": [
      "sync.started",
      "sync.completed",
      "sync.failed",
      "reconciliation.discrepancy_found"
    ],
    "description": "Impact ERP webhook endpoint",
    "secret": "shared_secret_for_hmac"
  }'
```

#### Webhook Event Types

- `integration.created` - New integration configured
- `integration.updated` - Integration settings modified
- `integration.deleted` - Integration removed
- `integration.test.success` - Connection test successful
- `integration.test.failed` - Connection test failed
- `sync.started` - Sync job initiated
- `sync.completed` - Sync job finished successfully
- `sync.failed` - Sync job encountered errors
- `sync.progress` - Sync job progress update
- `reconciliation.started` - Reconciliation process started
- `reconciliation.completed` - Reconciliation finished
- `reconciliation.discrepancy_found` - Data mismatch detected
- `discrepancy.created` - New discrepancy recorded
- `discrepancy.resolved` - Discrepancy resolved
- `discrepancy.correction_applied` - Correction applied to data

## Monitoring & Health Checks

### Integration Dashboard

Access the monitoring dashboard at `/admin/erp/dashboard` to view:

- **Active Integrations**: List of configured integrations with status
- **Sync History**: Recent sync jobs with success/failure metrics
- **Error Log**: Recent errors with details
- **Performance Metrics**: Average sync time, data volume, throughput
- **Queue Status**: Pending, active, and failed jobs

### Health Check Endpoints

```bash
# Overall ERP integration health
curl https://api.machshop3.com/api/v1/erp/health

# Specific integration health
curl https://api.machshop3.com/api/v1/erp/integrations/impact-production/health

# Detailed health metrics
curl https://api.machshop3.com/api/v1/erp/metrics
```

### Monitoring Metrics

Key metrics to monitor:

- **Sync Success Rate**: Percentage of successful sync operations
- **Average Sync Duration**: Time taken for sync completion
- **Error Rate**: Number of errors per time period
- **Queue Depth**: Number of pending sync jobs
- **API Response Time**: ERP system response latency
- **Data Volume**: Records processed per sync
- **Retry Rate**: Frequency of retry attempts

### Alert Configuration

Configure alerts for critical events:

```json
{
  "alerts": [
    {
      "name": "Sync Failure",
      "condition": "sync.failed",
      "threshold": 3,
      "window": "1h",
      "recipients": ["admin@company.com"],
      "severity": "high"
    },
    {
      "name": "High Error Rate",
      "condition": "error_rate > 0.1",
      "window": "15m",
      "recipients": ["ops@company.com"],
      "severity": "medium"
    },
    {
      "name": "Queue Backup",
      "condition": "queue_depth > 100",
      "window": "5m",
      "recipients": ["admin@company.com"],
      "severity": "low"
    }
  ]
}
```

## Security Configuration

### Authentication Methods

#### Basic Authentication
```json
{
  "authMethod": "BASIC",
  "apiUsername": "api_user",
  "apiPassword": "encrypted_password"
}
```

#### OAuth 2.0
```json
{
  "authMethod": "OAUTH2",
  "clientId": "mes_client",
  "clientSecret": "client_secret",
  "tokenEndpoint": "https://erp.company.com/oauth/token",
  "scope": "read write"
}
```

#### API Key
```json
{
  "authMethod": "API_KEY",
  "apiToken": "your_api_key_here",
  "apiKeyHeader": "X-API-Key"
}
```

### Encryption

All sensitive data is encrypted at rest and in transit:

- **Database**: AES-256 encryption for credentials
- **API Communication**: TLS 1.3 minimum
- **File Storage**: Encrypted file system
- **Webhook Signatures**: HMAC-SHA256 validation

### Access Control

Configure role-based access control (RBAC):

```javascript
const erpRoles = {
  "erp_admin": {
    permissions: ["erp:*"],
    description: "Full ERP integration access"
  },
  "erp_operator": {
    permissions: ["erp:view", "erp:sync", "erp:reconciliation"],
    description: "Operate ERP integrations"
  },
  "erp_viewer": {
    permissions: ["erp:view"],
    description: "View-only access to ERP data"
  }
};
```

## Backup & Recovery

### Backup Strategy

#### Configuration Backup

```bash
# Export all integration configurations
npm run erp:backup:config

# Backup specific integration
npm run erp:backup:config -- --integration=impact-production

# Restore configuration
npm run erp:restore:config -- --file=backup-2024-01-01.json
```

#### Transaction Log Backup

```bash
# Backup transaction logs
pg_dump -t erp_sync_transactions -t erp_reconciliation_logs \
  postgresql://user:password@localhost/machshop3 \
  > erp_transactions_backup.sql

# Archive old transactions
npm run erp:archive:transactions -- --before="2024-01-01"
```

### Disaster Recovery

#### Recovery Point Objective (RPO)
- Configuration data: 24 hours
- Transaction logs: 1 hour
- Webhook deliveries: 15 minutes

#### Recovery Time Objective (RTO)
- Critical integrations: 1 hour
- Non-critical integrations: 4 hours
- Full system restoration: 8 hours

### Recovery Procedures

1. **Integration Failure Recovery**
   ```bash
   # Reset failed integration
   npm run erp:reset:integration -- --id=impact-production

   # Replay failed transactions
   npm run erp:replay:transactions -- --from="2024-01-01T00:00:00Z"
   ```

2. **Data Corruption Recovery**
   ```bash
   # Run reconciliation to identify discrepancies
   npm run erp:reconcile -- --integration=impact-production

   # Apply corrections
   npm run erp:apply:corrections -- --report=reconciliation-report.json
   ```

## Performance Tuning

### Database Optimization

```sql
-- Add indexes for frequent queries
CREATE INDEX idx_sync_trans_status ON erp_sync_transactions(status, created_at);
CREATE INDEX idx_sync_trans_entity ON erp_sync_transactions(entity_type, entity_id);
CREATE INDEX idx_field_mapping_lookup ON erp_field_mappings(erp_integration_id, entity_type);

-- Analyze tables for query optimization
ANALYZE erp_sync_transactions;
ANALYZE erp_field_mappings;
ANALYZE erp_reconciliation_logs;
```

### Connection Pooling

```javascript
// Configure connection pool settings
const poolConfig = {
  min: 2,          // Minimum connections
  max: 10,         // Maximum connections
  idleTimeout: 30000,  // Close idle connections after 30s
  connectionTimeout: 5000,  // Connection timeout
  statementTimeout: 60000   // Statement timeout
};
```

### Batch Processing

Optimize batch sizes for different operations:

```json
{
  "batchSizes": {
    "supplier_sync": 100,
    "purchase_order_sync": 50,
    "inventory_sync": 500,
    "cost_posting": 25
  },
  "parallelism": {
    "max_concurrent_syncs": 3,
    "max_concurrent_webhooks": 10
  }
}
```

### Caching Strategy

```javascript
// Configure Redis caching
const cacheConfig = {
  fieldMappings: {
    ttl: 3600,  // 1 hour
    strategy: 'lazy'
  },
  erpMetadata: {
    ttl: 86400,  // 24 hours
    strategy: 'eager'
  },
  syncStatus: {
    ttl: 300,  // 5 minutes
    strategy: 'write-through'
  }
};
```

## Troubleshooting

### Common Issues and Solutions

#### Connection Failures

**Symptom**: "Failed to connect to ERP system"

**Solutions**:
1. Verify network connectivity: `ping erp.company.com`
2. Check firewall rules for required ports
3. Validate SSL certificates: `openssl s_client -connect erp.company.com:443`
4. Test authentication credentials manually
5. Review ERP system logs for connection attempts

#### Sync Performance Issues

**Symptom**: Sync jobs taking longer than expected

**Solutions**:
1. Check database query performance
2. Increase batch sizes for bulk operations
3. Enable parallel processing for independent entities
4. Review network latency metrics
5. Optimize field mapping transformations

#### Data Discrepancies

**Symptom**: Data mismatch between MES and ERP

**Solutions**:
1. Run reconciliation process
2. Review field mapping configurations
3. Check for timezone issues in date fields
4. Verify data type conversions
5. Examine transformation functions for errors

### Diagnostic Commands

```bash
# Check integration status
npm run erp:status -- --integration=impact-production

# View recent errors
npm run erp:errors -- --limit=50

# Test specific field mapping
npm run erp:test:mapping -- --entity=PurchaseOrder --sample=sample.json

# Validate webhook delivery
npm run erp:test:webhook -- --webhook-id=webhook-123

# Check queue status
npm run erp:queue:status

# Clear stuck jobs
npm run erp:queue:clear -- --status=failed
```

### Log Analysis

#### Log Locations

- **Application Logs**: `/var/log/machshop3/erp-integration.log`
- **Sync Logs**: `/var/log/machshop3/sync-jobs.log`
- **Webhook Logs**: `/var/log/machshop3/webhooks.log`
- **Error Logs**: `/var/log/machshop3/erp-errors.log`

#### Log Queries

```bash
# Find errors for specific integration
grep "integration=impact-production" erp-errors.log | grep ERROR

# Track sync job progress
tail -f sync-jobs.log | grep "job-id=12345"

# Monitor webhook deliveries
grep "webhook.delivered" webhooks.log | tail -20

# Analyze performance metrics
grep "sync.completed" sync-jobs.log | awk '{print $5}' | stats
```

## Best Practices

### 1. Integration Design

- **Start Small**: Begin with a single entity type and expand gradually
- **Use Staging**: Test integrations in staging before production
- **Document Mappings**: Maintain detailed documentation of field mappings
- **Version Control**: Track integration configurations in Git
- **Monitor Actively**: Set up proactive monitoring and alerts

### 2. Data Management

- **Validate Input**: Always validate data before transformation
- **Handle Nulls**: Define clear rules for handling null/empty values
- **Use Transactions**: Wrap related operations in database transactions
- **Implement Idempotency**: Ensure operations can be safely retried
- **Archive Old Data**: Regularly archive old transaction logs

### 3. Security

- **Rotate Credentials**: Implement regular credential rotation
- **Use Least Privilege**: Grant minimal required permissions
- **Audit Access**: Log all administrative actions
- **Encrypt Sensitive Data**: Always encrypt credentials and PII
- **Validate Webhooks**: Use HMAC signatures for webhook validation

### 4. Performance

- **Optimize Queries**: Regular database maintenance and indexing
- **Batch Operations**: Process records in optimal batch sizes
- **Cache Strategically**: Cache frequently accessed, rarely changing data
- **Monitor Resources**: Track CPU, memory, and network usage
- **Scale Horizontally**: Use multiple workers for parallel processing

### 5. Error Handling

- **Implement Retry Logic**: Use exponential backoff for transient errors
- **Log Comprehensively**: Include context in error logs
- **Alert Appropriately**: Set up tiered alerting based on severity
- **Provide Recovery Options**: Enable manual intervention when needed
- **Document Solutions**: Maintain a knowledge base of common issues

### 6. Maintenance

- **Schedule Downtime**: Plan maintenance windows in advance
- **Test Backups**: Regularly verify backup restoration procedures
- **Update Dependencies**: Keep libraries and frameworks updated
- **Review Logs**: Regularly review logs for patterns and issues
- **Optimize Continuously**: Regular performance analysis and tuning

## Appendix A: Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| ERP001 | Connection timeout | Check network connectivity and firewall rules |
| ERP002 | Authentication failed | Verify credentials and authentication method |
| ERP003 | Invalid field mapping | Review field mapping configuration |
| ERP004 | Transformation error | Check transformation function syntax |
| ERP005 | Rate limit exceeded | Reduce request frequency or increase limits |
| ERP006 | Webhook delivery failed | Verify webhook URL and endpoint availability |
| ERP007 | Sync job timeout | Increase timeout or reduce batch size |
| ERP008 | Data validation error | Check data format and required fields |
| ERP009 | Reconciliation mismatch | Review and apply corrections |
| ERP010 | Queue overflow | Scale workers or reduce sync frequency |

## Appendix B: Configuration Templates

### Impact ERP Template
```json
{
  "name": "impact-template",
  "erpSystem": "IMPACT",
  "apiEndpoint": "https://impact.company.com/api",
  "apiVersion": "v2",
  "authMethod": "BASIC",
  "syncSchedule": {
    "suppliers": "0 2 * * *",
    "purchaseOrders": "*/30 * * * *",
    "inventory": "0 */4 * * *"
  }
}
```

### SAP S/4HANA Template
```json
{
  "name": "sap-template",
  "erpSystem": "SAP",
  "apiEndpoint": "https://sap.company.com:8443/sap/opu/odata/sap/",
  "apiVersion": "v4",
  "authMethod": "OAUTH2",
  "syncSchedule": {
    "masterData": "0 1 * * *",
    "transactional": "*/15 * * * *"
  }
}
```

### Oracle Cloud ERP Template
```json
{
  "name": "oracle-template",
  "erpSystem": "ORACLE",
  "apiEndpoint": "https://oracle.cloud.company.com/fscmRestApi/resources/",
  "apiVersion": "v13",
  "authMethod": "OAUTH2",
  "syncSchedule": {
    "all": "*/20 * * * *"
  }
}
```

## Support and Resources

- **Documentation**: https://docs.machshop3.com/erp-integration
- **API Reference**: https://api.machshop3.com/docs
- **Support Portal**: https://support.machshop3.com
- **Community Forum**: https://forum.machshop3.com/erp-integration
- **Training Videos**: https://training.machshop3.com/erp

For additional assistance, contact the MachShop3 support team at support@machshop3.com or call +1-555-MACHSHOP.