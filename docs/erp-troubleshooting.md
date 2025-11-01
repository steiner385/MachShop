# ERP Integration Troubleshooting Guide

## Table of Contents
1. [Quick Diagnosis](#quick-diagnosis)
2. [Connection Issues](#connection-issues)
3. [Authentication Problems](#authentication-problems)
4. [Sync Errors](#sync-errors)
5. [Data Discrepancies](#data-discrepancies)
6. [Performance Issues](#performance-issues)
7. [Webhook Failures](#webhook-failures)
8. [Reconciliation Problems](#reconciliation-problems)
9. [Field Mapping Errors](#field-mapping-errors)
10. [System-Specific Issues](#system-specific-issues)
11. [Advanced Diagnostics](#advanced-diagnostics)
12. [Recovery Procedures](#recovery-procedures)
13. [Prevention Strategies](#prevention-strategies)
14. [Support Escalation](#support-escalation)

## Quick Diagnosis

### Diagnostic Flowchart

```
Problem Detected
       │
       ▼
Is connection active? ──No──► Check Connection Issues
       │Yes
       ▼
Is auth valid? ─────────No──► Check Authentication
       │Yes
       ▼
Is sync running? ────────No──► Check Sync Errors
       │Yes
       ▼
Is data correct? ────────No──► Check Data Discrepancies
       │Yes
       ▼
Is performance OK? ──────No──► Check Performance Issues
       │Yes
       ▼
System Operating Normally
```

### Quick Health Check

```bash
# Run comprehensive health check
npm run erp:health:check -- --integration=all

# Check specific integration
npm run erp:health:check -- --integration=sap-production

# Generate health report
npm run erp:health:report -- --format=json > health-report.json
```

### Common Error Codes

| Code | Category | Quick Fix |
|------|----------|-----------|
| ERP001 | Connection | Check network/firewall |
| ERP002 | Authentication | Verify credentials |
| ERP003 | Field Mapping | Review field configuration |
| ERP004 | Transformation | Fix transformation function |
| ERP005 | Rate Limit | Reduce request frequency |
| ERP006 | Webhook | Verify endpoint availability |
| ERP007 | Timeout | Increase timeout/reduce batch |
| ERP008 | Validation | Check data format |
| ERP009 | Reconciliation | Run manual reconciliation |
| ERP010 | Queue | Scale workers or clear queue |

## Connection Issues

### Issue: Cannot Connect to ERP System

**Error Messages**:
```
Error: ETIMEDOUT - Connection timeout
Error: ECONNREFUSED - Connection refused
Error: EHOSTUNREACH - Host unreachable
```

**Diagnosis Steps**:

1. **Check Network Connectivity**
   ```bash
   # Ping ERP server
   ping erp.company.com

   # Test port connectivity
   telnet erp.company.com 443
   nc -zv erp.company.com 443

   # Trace network route
   traceroute erp.company.com
   ```

2. **Verify DNS Resolution**
   ```bash
   # Check DNS
   nslookup erp.company.com
   dig erp.company.com

   # Check /etc/hosts
   cat /etc/hosts | grep erp
   ```

3. **Check Firewall Rules**
   ```bash
   # List firewall rules
   sudo iptables -L -n

   # Check if port is open
   sudo netstat -tulpn | grep 443
   ```

**Solutions**:

1. **Network Configuration**
   ```yaml
   Firewall:
     - Add outbound rule for ERP server IP
     - Open required ports (443, 8443)
     - Whitelist MachShop3 IP in ERP firewall

   DNS:
     - Add ERP server to /etc/hosts
     - Use IP address instead of hostname
     - Configure DNS forwarder

   Proxy:
     - Configure HTTP_PROXY environment variable
     - Add proxy settings to integration config
   ```

2. **Connection Settings**
   ```json
   {
     "connectionTimeout": 60000,  // Increase timeout
     "keepAlive": true,
     "maxRetries": 5,
     "retryDelay": 2000,
     "proxy": {
       "host": "proxy.company.com",
       "port": 8080
     }
   }
   ```

### Issue: SSL/TLS Certificate Errors

**Error Messages**:
```
Error: self signed certificate
Error: unable to verify the first certificate
Error: certificate has expired
```

**Solutions**:

1. **Certificate Validation**
   ```bash
   # Check certificate expiry
   openssl s_client -connect erp.company.com:443 2>/dev/null | openssl x509 -noout -dates

   # View certificate details
   openssl s_client -connect erp.company.com:443 -showcerts

   # Test with curl
   curl -v https://erp.company.com
   ```

2. **Certificate Configuration**
   ```javascript
   // For self-signed certificates (development only)
   process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

   // Add custom CA
   const https = require('https');
   const fs = require('fs');
   const ca = fs.readFileSync('ca-cert.pem');

   const agent = new https.Agent({
     ca: ca,
     rejectUnauthorized: true
   });
   ```

## Authentication Problems

### Issue: Authentication Failed

**Error Messages**:
```
401 Unauthorized: Invalid credentials
403 Forbidden: Access denied
Error: Authentication token expired
```

**Diagnosis**:

1. **Verify Credentials**
   ```bash
   # Test basic auth
   curl -u username:password https://erp.company.com/api/auth

   # Test OAuth
   curl -X POST https://auth.erp.com/token \
     -d "grant_type=client_credentials&client_id=xxx&client_secret=yyy"
   ```

2. **Check User Status**
   - Verify user account is active
   - Check password expiry
   - Verify user permissions/roles

**Solutions**:

1. **Reset Credentials**
   ```bash
   # Update credentials in MachShop3
   npm run erp:config:set -- --key=password --value=newpass --encrypted

   # Test new credentials
   npm run erp:test:auth -- --integration=sap-production
   ```

2. **OAuth Token Management**
   ```javascript
   class TokenManager {
     async refreshToken() {
       // Implement token refresh
       const response = await fetch(tokenEndpoint, {
         method: 'POST',
         body: 'grant_type=refresh_token&refresh_token=' + this.refreshToken
       });

       const data = await response.json();
       this.accessToken = data.access_token;
       this.tokenExpiry = Date.now() + data.expires_in * 1000;
     }

     isTokenValid() {
       return this.tokenExpiry > Date.now() + 60000; // 1 minute buffer
     }
   }
   ```

### Issue: Permission Denied

**Error**: `User lacks required permissions`

**Solutions**:

1. **Verify Required Permissions**
   ```sql
   -- Check user permissions
   SELECT * FROM user_permissions
   WHERE user_id = 'MES_INTEGRATION';
   ```

2. **Grant Missing Permissions**
   - Add required roles in ERP system
   - Update integration user privileges
   - Configure API access permissions

## Sync Errors

### Issue: Sync Job Failing

**Error Messages**:
```
Sync job failed: Timeout exceeded
Error: Maximum retry attempts reached
Sync aborted: Data validation failed
```

**Diagnosis**:

1. **Check Sync Status**
   ```bash
   # View sync job status
   npm run erp:sync:status -- --job-id=12345

   # List failed jobs
   npm run erp:sync:failed -- --last=24h

   # View error details
   npm run erp:sync:errors -- --job-id=12345
   ```

2. **Analyze Logs**
   ```bash
   # Tail sync logs
   tail -f /var/log/machshop3/sync-jobs.log

   # Search for errors
   grep ERROR /var/log/machshop3/sync-jobs.log | tail -50

   # Filter by job ID
   grep "job-id=12345" /var/log/machshop3/sync-jobs.log
   ```

**Solutions**:

1. **Retry Failed Jobs**
   ```bash
   # Retry single job
   npm run erp:sync:retry -- --job-id=12345

   # Retry all failed jobs
   npm run erp:sync:retry -- --status=failed --last=24h

   # Reset and retry
   npm run erp:sync:reset -- --job-id=12345
   ```

2. **Optimize Sync Configuration**
   ```json
   {
     "batchSize": 25,        // Reduce batch size
     "timeout": 300000,      // Increase timeout
     "retryAttempts": 5,     // Increase retries
     "retryDelay": 5000,     // Add delay between retries
     "parallelism": 1        // Reduce parallel jobs
   }
   ```

### Issue: Partial Sync Completion

**Symptoms**:
- Some records synced, others failed
- Inconsistent data state
- Orphaned transactions

**Solutions**:

1. **Implement Transaction Rollback**
   ```javascript
   async function syncWithRollback(records) {
     const synced = [];

     try {
       for (const record of records) {
         const result = await syncRecord(record);
         synced.push(result);
       }
       await commitTransaction();
     } catch (error) {
       // Rollback synced records
       for (const record of synced) {
         await rollbackRecord(record);
       }
       throw error;
     }
   }
   ```

2. **Use Checkpointing**
   ```javascript
   async function syncWithCheckpoint(records, checkpointId) {
     let lastProcessed = await getCheckpoint(checkpointId);

     for (let i = lastProcessed; i < records.length; i++) {
       await syncRecord(records[i]);
       await saveCheckpoint(checkpointId, i);
     }
   }
   ```

## Data Discrepancies

### Issue: Data Mismatch Between Systems

**Symptoms**:
- Field values don't match
- Missing records in one system
- Duplicate records

**Diagnosis**:

1. **Run Reconciliation**
   ```bash
   # Full reconciliation
   npm run erp:reconcile -- --integration=sap-production

   # Specific entity reconciliation
   npm run erp:reconcile -- --entity=PurchaseOrder --date-range=7d

   # Generate discrepancy report
   npm run erp:reconcile:report -- --format=excel
   ```

2. **Compare Specific Records**
   ```sql
   -- Find mismatched records
   SELECT
     m.po_number,
     m.total_amount as mes_amount,
     e.total_amount as erp_amount,
     ABS(m.total_amount - e.total_amount) as difference
   FROM mes_purchase_orders m
   LEFT JOIN erp_sync_data e ON m.po_number = e.po_number
   WHERE ABS(m.total_amount - e.total_amount) > 0.01;
   ```

**Solutions**:

1. **Data Correction**
   ```bash
   # Apply corrections from reconciliation
   npm run erp:reconcile:apply -- --report=reconciliation-report.json

   # Manually sync specific records
   npm run erp:sync:record -- --entity=PurchaseOrder --id=PO123456

   # Force overwrite ERP data
   npm run erp:sync:force -- --entity=PurchaseOrder --id=PO123456 --direction=mes-to-erp
   ```

2. **Prevent Future Discrepancies**
   ```javascript
   // Add data validation
   function validateBeforeSync(mesData, erpData) {
     const validations = [
       {
         field: 'amount',
         rule: (mes, erp) => Math.abs(mes - erp) < 0.01,
         message: 'Amount discrepancy exceeds threshold'
       },
       {
         field: 'status',
         rule: (mes, erp) => isValidStatusTransition(mes, erp),
         message: 'Invalid status transition'
       }
     ];

     for (const validation of validations) {
       if (!validation.rule(mesData[validation.field], erpData[validation.field])) {
         throw new ValidationError(validation.message);
       }
     }
   }
   ```

### Issue: Duplicate Records

**Diagnosis**:
```sql
-- Find duplicates
SELECT po_number, COUNT(*) as count
FROM erp_sync_transactions
WHERE entity_type = 'PurchaseOrder'
GROUP BY po_number
HAVING COUNT(*) > 1;
```

**Solutions**:

1. **Implement Idempotency**
   ```javascript
   async function idempotentSync(record) {
     const existingId = await findExisting(record);

     if (existingId) {
       return updateRecord(existingId, record);
     } else {
       return createRecord(record);
     }
   }
   ```

2. **Add Unique Constraints**
   ```sql
   -- Add unique constraint
   ALTER TABLE erp_sync_data
   ADD CONSTRAINT unique_po_number UNIQUE (po_number, integration_id);
   ```

## Performance Issues

### Issue: Slow Sync Performance

**Symptoms**:
- Sync jobs taking hours
- Timeouts during large syncs
- High CPU/memory usage

**Diagnosis**:

1. **Performance Metrics**
   ```bash
   # Monitor sync performance
   npm run erp:performance:monitor -- --integration=oracle-production

   # Generate performance report
   npm run erp:performance:report -- --last=7d
   ```

2. **Query Analysis**
   ```sql
   -- Analyze slow queries
   SELECT
     query,
     calls,
     mean_exec_time,
     total_exec_time
   FROM pg_stat_statements
   WHERE query LIKE '%erp_sync%'
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

**Solutions**:

1. **Database Optimization**
   ```sql
   -- Add indexes
   CREATE INDEX idx_sync_trans_status_date
   ON erp_sync_transactions(status, created_at);

   CREATE INDEX idx_field_mapping_lookup
   ON erp_field_mappings(integration_id, entity_type);

   -- Analyze tables
   ANALYZE erp_sync_transactions;
   VACUUM FULL erp_sync_transactions;
   ```

2. **Batch Processing Optimization**
   ```javascript
   // Optimize batch processing
   async function optimizedBatchSync(records, batchSize = 100) {
     const batches = [];

     // Create batches
     for (let i = 0; i < records.length; i += batchSize) {
       batches.push(records.slice(i, i + batchSize));
     }

     // Process batches in parallel (limited)
     const results = [];
     const parallelLimit = 3;

     for (let i = 0; i < batches.length; i += parallelLimit) {
       const parallelBatches = batches.slice(i, i + parallelLimit);
       const batchResults = await Promise.all(
         parallelBatches.map(batch => processBatch(batch))
       );
       results.push(...batchResults);
     }

     return results;
   }
   ```

3. **Caching Strategy**
   ```javascript
   // Implement caching
   const cache = new Map();

   async function getCachedFieldMapping(integrationId, entityType) {
     const key = `${integrationId}:${entityType}`;

     if (cache.has(key)) {
       return cache.get(key);
     }

     const mapping = await fetchFieldMapping(integrationId, entityType);
     cache.set(key, mapping);

     // Clear cache after TTL
     setTimeout(() => cache.delete(key), 3600000); // 1 hour

     return mapping;
   }
   ```

### Issue: Memory Leaks

**Symptoms**:
- Increasing memory usage over time
- Out of memory errors
- Process crashes

**Solutions**:

1. **Memory Management**
   ```javascript
   // Prevent memory leaks
   async function processLargeDataset(query) {
     const stream = db.stream(query);

     for await (const record of stream) {
       await processRecord(record);

       // Force garbage collection periodically
       if (processed % 1000 === 0) {
         if (global.gc) global.gc();
       }
     }

     stream.destroy();
   }
   ```

2. **Resource Cleanup**
   ```javascript
   // Ensure cleanup
   class ResourceManager {
     constructor() {
       this.resources = [];
     }

     register(resource) {
       this.resources.push(resource);
     }

     async cleanup() {
       for (const resource of this.resources) {
         try {
           await resource.close();
         } catch (error) {
           console.error('Cleanup error:', error);
         }
       }
       this.resources = [];
     }
   }
   ```

## Webhook Failures

### Issue: Webhook Delivery Failed

**Error Messages**:
```
Webhook delivery failed: Connection timeout
HTTP 404: Webhook endpoint not found
HTTP 500: Internal server error at endpoint
```

**Diagnosis**:

1. **Check Webhook Status**
   ```bash
   # List webhook deliveries
   npm run erp:webhooks:deliveries -- --webhook-id=wh123

   # Test webhook endpoint
   npm run erp:webhooks:test -- --webhook-id=wh123

   # View failed deliveries
   npm run erp:webhooks:failed -- --last=24h
   ```

2. **Verify Endpoint**
   ```bash
   # Test endpoint manually
   curl -X POST https://endpoint.com/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "payload"}'
   ```

**Solutions**:

1. **Retry Failed Deliveries**
   ```javascript
   async function retryWebhook(webhookId, maxRetries = 3) {
     let attempt = 0;
     let lastError;

     while (attempt < maxRetries) {
       try {
         await deliverWebhook(webhookId);
         return { success: true, attempts: attempt + 1 };
       } catch (error) {
         lastError = error;
         attempt++;

         // Exponential backoff
         await sleep(Math.pow(2, attempt) * 1000);
       }
     }

     return { success: false, error: lastError, attempts: attempt };
   }
   ```

2. **Implement Circuit Breaker**
   ```javascript
   class CircuitBreaker {
     constructor(threshold = 5, timeout = 60000) {
       this.failureCount = 0;
       this.threshold = threshold;
       this.timeout = timeout;
       this.state = 'CLOSED';
       this.nextAttempt = 0;
     }

     async call(fn) {
       if (this.state === 'OPEN') {
         if (Date.now() < this.nextAttempt) {
           throw new Error('Circuit breaker is OPEN');
         }
         this.state = 'HALF_OPEN';
       }

       try {
         const result = await fn();
         this.onSuccess();
         return result;
       } catch (error) {
         this.onFailure();
         throw error;
       }
     }

     onSuccess() {
       this.failureCount = 0;
       this.state = 'CLOSED';
     }

     onFailure() {
       this.failureCount++;
       if (this.failureCount >= this.threshold) {
         this.state = 'OPEN';
         this.nextAttempt = Date.now() + this.timeout;
       }
     }
   }
   ```

### Issue: Webhook Signature Validation Failed

**Error**: `Invalid webhook signature`

**Solutions**:

1. **Verify Signature**
   ```javascript
   function validateWebhookSignature(payload, signature, secret) {
     const hmac = crypto.createHmac('sha256', secret);
     hmac.update(JSON.stringify(payload));
     const expectedSignature = hmac.digest('hex');

     return crypto.timingSafeEqual(
       Buffer.from(signature),
       Buffer.from(expectedSignature)
     );
   }
   ```

2. **Regenerate Secret**
   ```bash
   # Generate new webhook secret
   npm run erp:webhooks:regenerate-secret -- --webhook-id=wh123

   # Update endpoint with new secret
   npm run erp:webhooks:notify-secret-change -- --webhook-id=wh123
   ```

## Reconciliation Problems

### Issue: Reconciliation Discrepancies

**Symptoms**:
- Large number of mismatches
- False positives in discrepancy report
- Reconciliation taking too long

**Solutions**:

1. **Improve Matching Logic**
   ```javascript
   function improvedRecordMatching(mesRecord, erpRecords) {
     // Try exact match first
     let match = erpRecords.find(e => e.id === mesRecord.id);

     if (!match) {
       // Try fuzzy matching
       match = erpRecords.find(e => {
         return similarity(e.number, mesRecord.number) > 0.95 &&
                Math.abs(e.amount - mesRecord.amount) < 0.01;
       });
     }

     if (!match) {
       // Try date-based matching
       match = erpRecords.find(e => {
         const dateDiff = Math.abs(e.date - mesRecord.date);
         return dateDiff < 86400000 && // Within 24 hours
                e.vendor === mesRecord.vendor;
       });
     }

     return match;
   }
   ```

2. **Optimize Reconciliation Performance**
   ```javascript
   async function parallelReconciliation(entities, workers = 4) {
     const queue = [...entities];
     const results = [];

     const worker = async () => {
       while (queue.length > 0) {
         const entity = queue.shift();
         if (entity) {
           const result = await reconcileEntity(entity);
           results.push(result);
         }
       }
     };

     // Start workers
     await Promise.all(
       Array(workers).fill().map(() => worker())
     );

     return results;
   }
   ```

## Field Mapping Errors

### Issue: Transformation Function Error

**Error**: `Cannot execute transformation: value.toUpperCase is not a function`

**Solutions**:

1. **Safe Transformation**
   ```javascript
   function safeTransform(value, transformation) {
     try {
       // Type checking
       if (transformation.includes('toUpperCase') && typeof value !== 'string') {
         value = String(value);
       }

       // Null checking
       if (value === null || value === undefined) {
         return null;
       }

       // Execute transformation
       return eval(transformation);
     } catch (error) {
       console.error(`Transformation error: ${error.message}`);
       return value; // Return original value
     }
   }
   ```

2. **Transformation Testing**
   ```javascript
   function testTransformation(transformation, testCases) {
     const results = [];

     for (const testCase of testCases) {
       try {
         const result = safeTransform(testCase.input, transformation);
         results.push({
           input: testCase.input,
           expected: testCase.expected,
           actual: result,
           passed: result === testCase.expected
         });
       } catch (error) {
         results.push({
           input: testCase.input,
           error: error.message,
           passed: false
         });
       }
     }

     return results;
   }
   ```

### Issue: Required Field Missing

**Error**: `Required field 'vendorId' is missing`

**Solutions**:

1. **Default Value Handling**
   ```javascript
   function applyDefaults(data, fieldMappings) {
     for (const mapping of fieldMappings) {
       if (mapping.isRequired && !data[mapping.mesField]) {
         if (mapping.defaultValue !== undefined) {
           data[mapping.mesField] = mapping.defaultValue;
         } else {
           throw new Error(`Required field '${mapping.mesField}' is missing and has no default`);
         }
       }
     }
     return data;
   }
   ```

2. **Validation Before Sync**
   ```javascript
   function validateRequiredFields(data, mappings) {
     const errors = [];

     for (const mapping of mappings) {
       if (mapping.isRequired) {
         const value = data[mapping.mesField];

         if (value === null || value === undefined || value === '') {
           errors.push({
             field: mapping.mesField,
             message: 'Required field is empty'
           });
         }
       }
     }

     if (errors.length > 0) {
       throw new ValidationError('Required fields missing', errors);
     }
   }
   ```

## System-Specific Issues

### Impact ERP Issues

#### Issue: Session Timeout

**Error**: `Session expired. Please re-authenticate`

**Solution**:
```javascript
class ImpactSessionManager {
  async ensureSession() {
    if (!this.isSessionValid()) {
      await this.createSession();
    }
    return this.sessionId;
  }

  isSessionValid() {
    return this.sessionId &&
           this.sessionExpiry > Date.now() + 60000;
  }

  async createSession() {
    const response = await this.authenticate();
    this.sessionId = response.sessionId;
    this.sessionExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes
  }
}
```

### SAP S/4HANA Issues

#### Issue: CSRF Token Invalid

**Error**: `403 Forbidden: CSRF token validation failed`

**Solution**:
```javascript
class SAPCSRFManager {
  async getToken() {
    const response = await fetch(this.endpoint, {
      method: 'HEAD',
      headers: {
        'X-CSRF-Token': 'Fetch',
        'Authorization': this.auth
      }
    });

    this.csrfToken = response.headers.get('x-csrf-token');
    this.cookies = response.headers.get('set-cookie');

    return this.csrfToken;
  }

  async request(method, url, body) {
    if (!this.csrfToken || method !== 'GET') {
      await this.getToken();
    }

    return fetch(url, {
      method,
      headers: {
        'X-CSRF-Token': this.csrfToken,
        'Cookie': this.cookies,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }
}
```

### Oracle Cloud Issues

#### Issue: Rate Limit Exceeded

**Error**: `429 Too Many Requests`

**Solution**:
```javascript
class OracleRateLimiter {
  constructor(limit = 100, window = 60000) {
    this.limit = limit;
    this.window = window;
    this.requests = [];
  }

  async waitIfNeeded() {
    const now = Date.now();

    // Remove old requests
    this.requests = this.requests.filter(
      time => time > now - this.window
    );

    // Check if limit reached
    if (this.requests.length >= this.limit) {
      const oldestRequest = this.requests[0];
      const waitTime = this.window - (now - oldestRequest) + 1000;

      await sleep(waitTime);
      return this.waitIfNeeded();
    }

    // Record new request
    this.requests.push(now);
  }

  async execute(fn) {
    await this.waitIfNeeded();
    return fn();
  }
}
```

## Advanced Diagnostics

### Database Analysis

```sql
-- Analyze sync performance
WITH sync_stats AS (
  SELECT
    entity_type,
    DATE(created_at) as sync_date,
    COUNT(*) as total_syncs,
    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
  FROM erp_sync_transactions
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY entity_type, DATE(created_at)
)
SELECT
  entity_type,
  sync_date,
  total_syncs,
  successful,
  failed,
  ROUND(100.0 * successful / total_syncs, 2) as success_rate,
  ROUND(avg_duration_seconds::numeric, 2) as avg_duration
FROM sync_stats
ORDER BY sync_date DESC, entity_type;

-- Find stuck transactions
SELECT
  id,
  entity_type,
  entity_id,
  status,
  created_at,
  NOW() - created_at as age,
  retry_count,
  error_message
FROM erp_sync_transactions
WHERE status IN ('IN_PROGRESS', 'RETRYING')
  AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at;

-- Identify error patterns
SELECT
  error_message,
  entity_type,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurrence
FROM erp_sync_transactions
WHERE status = 'FAILED'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message, entity_type
ORDER BY error_count DESC;
```

### Log Analysis

```bash
#!/bin/bash
# Comprehensive log analysis script

LOG_DIR="/var/log/machshop3"
INTEGRATION="$1"
HOURS="${2:-24}"

echo "=== ERP Integration Log Analysis ==="
echo "Integration: $INTEGRATION"
echo "Time Range: Last $HOURS hours"
echo "===================================="

# Error summary
echo -e "\n### Error Summary ###"
grep -h ERROR $LOG_DIR/erp-*.log |
  grep "$INTEGRATION" |
  awk '{print $5}' |
  sort | uniq -c | sort -rn | head -10

# Performance metrics
echo -e "\n### Performance Metrics ###"
grep -h "sync.completed" $LOG_DIR/sync-jobs.log |
  grep "$INTEGRATION" |
  awk '{print $7}' |
  awk '{sum+=$1; count++} END {print "Avg Duration: " sum/count "s"}'

# Failed webhook deliveries
echo -e "\n### Failed Webhooks ###"
grep -h "webhook.failed" $LOG_DIR/webhooks.log |
  grep "$INTEGRATION" |
  tail -5

# Connection issues
echo -e "\n### Connection Issues ###"
grep -hE "ETIMEDOUT|ECONNREFUSED|EHOSTUNREACH" $LOG_DIR/erp-*.log |
  grep "$INTEGRATION" |
  tail -5
```

### Performance Profiling

```javascript
// Performance profiler
class PerformanceProfiler {
  constructor() {
    this.metrics = new Map();
  }

  start(operation) {
    this.metrics.set(operation, {
      startTime: process.hrtime.bigint(),
      startMemory: process.memoryUsage()
    });
  }

  end(operation) {
    const start = this.metrics.get(operation);
    if (!start) return null;

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();

    return {
      operation,
      duration: Number(endTime - start.startTime) / 1000000, // Convert to ms
      memoryDelta: {
        heapUsed: endMemory.heapUsed - start.startMemory.heapUsed,
        external: endMemory.external - start.startMemory.external
      }
    };
  }

  async profile(operation, fn) {
    this.start(operation);
    try {
      const result = await fn();
      return result;
    } finally {
      const metrics = this.end(operation);
      console.log('Performance:', metrics);
    }
  }
}
```

## Recovery Procedures

### Emergency Recovery

```bash
#!/bin/bash
# Emergency recovery script

echo "=== ERP Integration Emergency Recovery ==="

# 1. Stop all sync jobs
echo "Stopping sync jobs..."
npm run erp:sync:stop --all

# 2. Clear stuck transactions
echo "Clearing stuck transactions..."
npm run erp:transactions:clear --status=IN_PROGRESS --older-than=2h

# 3. Reset failed webhooks
echo "Resetting failed webhooks..."
npm run erp:webhooks:reset --status=failed

# 4. Validate configuration
echo "Validating configuration..."
npm run erp:config:validate --all

# 5. Test connections
echo "Testing connections..."
npm run erp:test:connection --all

# 6. Restart services
echo "Restarting services..."
npm run erp:restart

echo "Recovery complete!"
```

### Data Recovery

```javascript
// Point-in-time recovery
async function recoverToPointInTime(timestamp) {
  // 1. Stop all operations
  await stopAllSyncJobs();

  // 2. Create backup of current state
  await createBackup('pre-recovery-backup');

  // 3. Identify transactions after timestamp
  const transactions = await getTransactionsAfter(timestamp);

  // 4. Reverse transactions in order
  for (const tx of transactions.reverse()) {
    await reverseTransaction(tx);
  }

  // 5. Verify data consistency
  const validation = await validateDataConsistency();

  if (!validation.isValid) {
    // Restore from backup if validation fails
    await restoreBackup('pre-recovery-backup');
    throw new Error('Recovery validation failed');
  }

  return {
    recoveredTo: timestamp,
    transactionsReversed: transactions.length
  };
}
```

## Prevention Strategies

### Monitoring Setup

```yaml
monitoring:
  alerts:
    - name: High Error Rate
      condition: error_rate > 5%
      window: 5 minutes
      action: email, slack

    - name: Sync Job Stuck
      condition: job_duration > 1 hour
      action: restart_job, alert

    - name: Connection Lost
      condition: connection_check_failed
      retries: 3
      action: reconnect, alert

  health_checks:
    - endpoint: /health
      interval: 60s
      timeout: 10s

    - query: SELECT COUNT(*) FROM stuck_transactions
      threshold: 0
      interval: 300s

  metrics:
    - sync_success_rate
    - average_sync_duration
    - error_count_by_type
    - webhook_delivery_rate
```

### Preventive Maintenance

```bash
# Daily maintenance script
#!/bin/bash

# Clean old logs
find /var/log/machshop3 -name "*.log" -mtime +30 -delete

# Archive completed transactions
npm run erp:archive:transactions --older-than=30d

# Optimize database
npm run erp:db:optimize

# Update field mapping cache
npm run erp:cache:refresh --type=field-mappings

# Validate all configurations
npm run erp:config:validate --all

# Generate health report
npm run erp:health:report --email=admin@company.com
```

## Support Escalation

### Escalation Levels

```yaml
Level 1 - Basic Support:
  - Connection issues
  - Authentication problems
  - Basic configuration
  Response: 2 hours
  Contact: support@machshop3.com

Level 2 - Technical Support:
  - Field mapping issues
  - Performance problems
  - Data discrepancies
  Response: 4 hours
  Contact: technical@machshop3.com

Level 3 - Engineering Support:
  - System bugs
  - Complex integration issues
  - Custom development
  Response: 8 hours
  Contact: engineering@machshop3.com

Critical - Emergency Support:
  - Production down
  - Data loss
  - Security breach
  Response: 1 hour
  Contact: +1-555-EMERGENCY
```

### Information to Provide

When escalating issues, provide:

1. **System Information**
   ```bash
   npm run erp:support:gather-info
   ```

2. **Error Details**
   - Exact error message
   - Error code
   - Timestamp
   - Integration name
   - Entity type affected

3. **Logs**
   - Last 1000 lines of relevant logs
   - Stack traces
   - Debug output

4. **Configuration**
   - Integration configuration (sanitized)
   - Field mappings
   - Recent changes

5. **Impact**
   - Number of records affected
   - Business impact
   - Urgency level

### Remote Diagnostics

```bash
# Enable remote diagnostics
npm run erp:diagnostics:enable --token=support-token-123

# Generate diagnostic bundle
npm run erp:diagnostics:bundle --case=CASE-123

# Upload to support
npm run erp:diagnostics:upload --case=CASE-123
```

## Quick Reference Card

### Common Commands

```bash
# Health checks
npm run erp:health:check --all
npm run erp:test:connection --integration=sap

# Sync operations
npm run erp:sync:status
npm run erp:sync:retry --failed
npm run erp:sync:stop --all

# Troubleshooting
npm run erp:logs:tail --integration=oracle
npm run erp:errors:recent --limit=50
npm run erp:transactions:stuck

# Recovery
npm run erp:recover:emergency
npm run erp:rollback --to=timestamp

# Maintenance
npm run erp:cache:clear
npm run erp:db:optimize
npm run erp:config:validate
```

### Error Code Quick Lookup

| Code | Quick Fix Command |
|------|------------------|
| ERP001 | `npm run erp:test:connection` |
| ERP002 | `npm run erp:auth:refresh` |
| ERP003 | `npm run erp:mappings:validate` |
| ERP004 | `npm run erp:mappings:test` |
| ERP005 | `npm run erp:rate:adjust` |
| ERP006 | `npm run erp:webhooks:test` |
| ERP007 | `npm run erp:timeout:increase` |
| ERP008 | `npm run erp:data:validate` |
| ERP009 | `npm run erp:reconcile` |
| ERP010 | `npm run erp:queue:clear` |

For comprehensive support documentation, visit:
https://docs.machshop3.com/erp-troubleshooting