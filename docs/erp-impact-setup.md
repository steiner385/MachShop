# Impact ERP Integration Setup Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Impact ERP Configuration](#impact-erp-configuration)
4. [MachShop3 Configuration](#machshop3-configuration)
5. [Connection Setup](#connection-setup)
6. [Field Mapping Configuration](#field-mapping-configuration)
7. [Testing the Integration](#testing-the-integration)
8. [Production Deployment](#production-deployment)
9. [Common Issues and Solutions](#common-issues-and-solutions)
10. [Reference](#reference)

## Overview

Impact ERP is a comprehensive Manufacturing Execution System (MES) and Enterprise Resource Planning (ERP) solution widely used in aerospace and defense manufacturing. This guide provides step-by-step instructions for setting up bidirectional integration between MachShop3 and Impact ERP.

### Integration Capabilities

- **Purchase Order Management**: Create, update, and track POs
- **Supplier/Vendor Synchronization**: Keep vendor data in sync
- **Work Order Status Updates**: Real-time work order tracking
- **Receipt Posting**: Post material receipts to Impact
- **Cost Tracking**: Post actual costs and variances
- **Inventory Transactions**: Track material movements
- **Shipment Notifications**: Update shipment status

### Architecture Overview

```
┌─────────────────────────────┐         ┌─────────────────────────────┐
│       MachShop3 MES         │         │       Impact ERP            │
├─────────────────────────────┤         ├─────────────────────────────┤
│                             │         │                             │
│  Impact ERP Adapter         │◄────────► Impact API Gateway         │
│                             │  HTTPS  │                             │
│  - Authentication           │         │  - Session Management       │
│  - Data Transformation      │         │  - Request Validation       │
│  - Error Handling           │         │  - Response Formatting      │
│                             │         │                             │
└─────────────────────────────┘         └─────────────────────────────┘
```

## Prerequisites

### Impact ERP Requirements

#### Version Requirements
- Impact ERP version 8.0 or higher
- Impact API module licensed and installed
- Web Services enabled in Impact configuration

#### Access Requirements
- Impact system administrator access
- API user account with appropriate permissions
- Network access from MachShop3 to Impact servers

#### Required Impact Modules
- **Core Manufacturing**: Base manufacturing functionality
- **Purchasing**: Purchase order management
- **Inventory**: Material and warehouse management
- **Quality**: Quality control and inspection
- **API Gateway**: REST API access

### MachShop3 Requirements

- MachShop3 version 3.0 or higher
- ERP Integration module enabled
- Administrative access to MachShop3
- SSL certificates configured

### Network Requirements

#### Firewall Rules
Allow outbound connections from MachShop3 to Impact:
- **Port 443**: HTTPS API communication
- **Port 8443**: Impact API Gateway (if using non-standard port)

#### DNS Configuration
Ensure MachShop3 can resolve Impact ERP hostname:
```bash
# Test DNS resolution
nslookup impact.company.com

# Test connectivity
telnet impact.company.com 443
```

## Impact ERP Configuration

### Step 1: Create API User Account

1. **Log into Impact as Administrator**
   ```
   URL: https://impact.company.com/impact
   Username: admin
   Password: [admin_password]
   ```

2. **Navigate to System Administration**
   - Click **Administration** → **Security** → **Users**

3. **Create New API User**
   - Click **Add User**
   - Enter user details:
     ```
     Username: mes_api_user
     Full Name: MES API Integration User
     Email: mes-integration@company.com
     User Type: System
     Authentication: Local
     ```
   - Set a strong password
   - Click **Save**

4. **Assign API Permissions**
   - Select the new user
   - Click **Permissions** tab
   - Assign the following permissions:
     ```
     ✓ API.Access
     ✓ PurchaseOrder.Create
     ✓ PurchaseOrder.Read
     ✓ PurchaseOrder.Update
     ✓ Supplier.Read
     ✓ WorkOrder.Read
     ✓ WorkOrder.Update
     ✓ Inventory.Create
     ✓ Inventory.Read
     ✓ Receipt.Create
     ✓ Cost.Create
     ✓ Shipment.Create
     ✓ Shipment.Update
     ```

### Step 2: Configure API Settings

1. **Navigate to API Configuration**
   - Click **Administration** → **Integration** → **API Settings**

2. **Configure API Gateway**
   ```
   API Endpoint: /api/v2
   Authentication: Basic Auth
   Session Timeout: 30 minutes
   Max Concurrent Sessions: 10
   Rate Limit: 1000 requests/hour
   ```

3. **Enable Required API Modules**
   - Check the following modules:
     ```
     ✓ Purchase Management API
     ✓ Supplier Management API
     ✓ Work Order API
     ✓ Inventory API
     ✓ Receipt API
     ✓ Cost Management API
     ✓ Shipping API
     ```

4. **Configure API Security**
   ```
   Require HTTPS: Yes
   IP Whitelist: [MachShop3 Server IPs]
   CORS Enabled: Yes
   Allowed Origins: https://machshop3.company.com
   ```

### Step 3: Set Up Company and Division

1. **Configure Company Code**
   - Navigate to **Administration** → **Organization** → **Companies**
   - Note your company code (e.g., `AERO01`)

2. **Configure Division/Plant**
   - Navigate to **Administration** → **Organization** → **Divisions**
   - Note your division code (e.g., `PLANT01`)

3. **Configure Warehouse**
   - Navigate to **Inventory** → **Warehouses**
   - Note default warehouse code (e.g., `WH01`)

### Step 4: Configure Integration Points

1. **Purchase Order Settings**
   - Navigate to **Purchasing** → **Settings**
   - Configure:
     ```
     Auto-numbering: Enabled
     Number Format: PO-YYYY-######
     Approval Required: Yes
     Default Terms: Net 30
     ```

2. **Inventory Settings**
   - Navigate to **Inventory** → **Settings**
   - Configure:
     ```
     Track Lot Numbers: Yes
     Track Serial Numbers: Yes
     Allow Negative Inventory: No
     Default UOM: EA
     ```

3. **Quality Settings**
   - Navigate to **Quality** → **Settings**
   - Configure:
     ```
     Inspection Required: Yes
     Default Sampling Plan: AQL 2.5
     NCR Auto-numbering: Yes
     ```

## MachShop3 Configuration

### Step 1: Access ERP Integration Settings

1. **Log into MachShop3 as Administrator**
   ```
   URL: https://machshop3.company.com
   Username: admin
   Password: [admin_password]
   ```

2. **Navigate to ERP Integration**
   - Click **Settings** → **Integrations** → **ERP Systems**

### Step 2: Create Impact Integration

1. **Click "Add New Integration"**

2. **Fill in Basic Information**
   ```
   Name: impact-production
   ERP System: Impact
   Description: Production Impact ERP Integration
   Environment: Production
   ```

3. **Configure Connection Settings**
   ```
   API Endpoint: https://impact.company.com/api/v2
   API Version: v2
   Connection Method: REST API
   Timeout (ms): 30000
   Retry Attempts: 3
   Retry Delay (ms): 1000
   ```

4. **Configure Authentication**
   ```
   Authentication Method: Basic
   Username: mes_api_user
   Password: [api_user_password]
   ```

5. **Configure Company Settings**
   ```
   Company Code: AERO01
   Division: PLANT01
   Warehouse: WH01
   Business Unit: MFG
   Facility: MAIN
   ```

### Step 3: Configure Sync Settings

1. **Set Sync Schedule**
   ```
   Enable Automatic Sync: Yes

   Suppliers:
   - Schedule: 0 2 * * * (Daily at 2 AM)
   - Batch Size: 100

   Purchase Orders:
   - Schedule: */30 * * * * (Every 30 minutes)
   - Batch Size: 50

   Work Orders:
   - Schedule: */15 * * * * (Every 15 minutes)
   - Batch Size: 25

   Inventory:
   - Schedule: 0 */4 * * * (Every 4 hours)
   - Batch Size: 500
   ```

2. **Configure Error Handling**
   ```
   Max Retry Attempts: 3
   Retry Backoff: Exponential
   Base Delay: 60 seconds
   Max Delay: 30 minutes
   Dead Letter Queue: Enabled
   ```

## Connection Setup

### Step 1: Test Basic Connectivity

1. **Click "Test Connection"** in the integration settings

2. **Verify Response**
   ```json
   {
     "connected": true,
     "message": "Connected to Impact API",
     "version": "8.2.1",
     "modules": [
       "Purchase Management",
       "Supplier Management",
       "Work Order",
       "Inventory",
       "Quality"
     ]
   }
   ```

### Step 2: Validate Authentication

1. **Test Authentication**
   ```bash
   curl -X GET https://impact.company.com/api/v2/auth/validate \
     -u mes_api_user:password \
     -H "Content-Type: application/json"
   ```

2. **Expected Response**
   ```json
   {
     "authenticated": true,
     "user": "mes_api_user",
     "permissions": ["API.Access", "PurchaseOrder.Create", ...],
     "sessionId": "abc123..."
   }
   ```

### Step 3: Configure Webhook Endpoints (Optional)

1. **In Impact, configure outbound webhooks**
   - Navigate to **Administration** → **Integration** → **Webhooks**
   - Add webhook:
     ```
     Name: MES Sync Webhook
     URL: https://machshop3.company.com/api/v1/webhooks/impact
     Method: POST
     Authentication: Bearer Token
     Token: [webhook_token]
     Events: PO Created, PO Updated, Receipt Posted
     ```

2. **In MachShop3, register webhook receiver**
   ```bash
   curl -X POST https://machshop3.company.com/api/v1/webhooks/integrations/impact-production \
     -H "Authorization: Bearer [token]" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://machshop3.company.com/api/v1/webhooks/impact",
       "eventTypes": ["sync.started", "sync.completed", "sync.failed"],
       "secret": "shared_secret"
     }'
   ```

## Field Mapping Configuration

### Understanding Impact Field Structure

Impact uses specific field naming conventions:
- Uppercase field names (e.g., `PO_NUM`, `VENDOR_CODE`)
- Date format: `YYYY-MM-DD HH:MM:SS`
- Status codes: Numeric (10=Draft, 20=Approved, 30=Sent)
- Currency: 2 decimal places, no currency symbol

### Purchase Order Field Mappings

Configure the following field mappings for Purchase Orders:

```json
{
  "entityType": "PurchaseOrder",
  "mappings": [
    {
      "mesField": "poNumber",
      "erpField": "PO_NUM",
      "dataType": "string",
      "isRequired": true
    },
    {
      "mesField": "poDate",
      "erpField": "PO_DATE",
      "dataType": "datetime",
      "isRequired": true,
      "transformation": "new Date(value).toISOString().replace('T', ' ').substring(0, 19)"
    },
    {
      "mesField": "vendorId",
      "erpField": "VENDOR_CODE",
      "dataType": "string",
      "isRequired": true,
      "transformation": "value.toUpperCase()"
    },
    {
      "mesField": "status",
      "erpField": "PO_STATUS",
      "dataType": "string",
      "isRequired": true,
      "transformation": "{'DRAFT': '10', 'APPROVED': '20', 'SENT': '30', 'ACKNOWLEDGED': '40', 'IN_PROGRESS': '50', 'RECEIVED': '60', 'CLOSED': '70'}[value]"
    },
    {
      "mesField": "totalAmount",
      "erpField": "PO_TOTAL",
      "dataType": "decimal",
      "isRequired": true,
      "transformation": "parseFloat(value).toFixed(2)"
    },
    {
      "mesField": "currency",
      "erpField": "CURRENCY_CODE",
      "dataType": "string",
      "isRequired": false,
      "defaultValue": "USD"
    },
    {
      "mesField": "requiredDate",
      "erpField": "REQUIRED_DATE",
      "dataType": "datetime",
      "isRequired": false,
      "transformation": "value ? new Date(value).toISOString().substring(0, 10) : null"
    },
    {
      "mesField": "shipToLocation",
      "erpField": "SHIP_TO_CODE",
      "dataType": "string",
      "isRequired": false,
      "defaultValue": "MAIN"
    },
    {
      "mesField": "accountCode",
      "erpField": "GL_ACCOUNT",
      "dataType": "string",
      "isRequired": false
    },
    {
      "mesField": "costCenter",
      "erpField": "COST_CENTER",
      "dataType": "string",
      "isRequired": false
    }
  ]
}
```

### Supplier Field Mappings

```json
{
  "entityType": "Supplier",
  "mappings": [
    {
      "mesField": "vendorCode",
      "erpField": "VENDOR_CODE",
      "dataType": "string",
      "isRequired": true
    },
    {
      "mesField": "vendorName",
      "erpField": "VENDOR_NAME",
      "dataType": "string",
      "isRequired": true
    },
    {
      "mesField": "address",
      "erpField": "ADDRESS_LINE1",
      "dataType": "string",
      "isRequired": false
    },
    {
      "mesField": "city",
      "erpField": "CITY",
      "dataType": "string",
      "isRequired": false
    },
    {
      "mesField": "state",
      "erpField": "STATE_PROV",
      "dataType": "string",
      "isRequired": false
    },
    {
      "mesField": "postalCode",
      "erpField": "POSTAL_CODE",
      "dataType": "string",
      "isRequired": false
    },
    {
      "mesField": "country",
      "erpField": "COUNTRY_CODE",
      "dataType": "string",
      "isRequired": false,
      "defaultValue": "US"
    },
    {
      "mesField": "contactEmail",
      "erpField": "EMAIL",
      "dataType": "string",
      "isRequired": false
    },
    {
      "mesField": "contactPhone",
      "erpField": "PHONE",
      "dataType": "string",
      "isRequired": false,
      "transformation": "value.replace(/[^0-9]/g, '')"
    },
    {
      "mesField": "paymentTerms",
      "erpField": "PAYMENT_TERMS",
      "dataType": "string",
      "isRequired": false,
      "defaultValue": "NET30"
    },
    {
      "mesField": "approvedVendor",
      "erpField": "APPROVED_FLAG",
      "dataType": "boolean",
      "isRequired": false,
      "transformation": "value ? 'Y' : 'N'"
    },
    {
      "mesField": "leadTime",
      "erpField": "LEAD_TIME_DAYS",
      "dataType": "integer",
      "isRequired": false,
      "defaultValue": 30
    }
  ]
}
```

### Work Order Field Mappings

```json
{
  "entityType": "WorkOrder",
  "mappings": [
    {
      "mesField": "workOrderNumber",
      "erpField": "WO_NUM",
      "dataType": "string",
      "isRequired": true
    },
    {
      "mesField": "partNumber",
      "erpField": "PART_NUM",
      "dataType": "string",
      "isRequired": true
    },
    {
      "mesField": "quantity",
      "erpField": "ORDER_QTY",
      "dataType": "integer",
      "isRequired": true
    },
    {
      "mesField": "status",
      "erpField": "WO_STATUS",
      "dataType": "string",
      "isRequired": true,
      "transformation": "{'PLANNED': '10', 'RELEASED': '20', 'IN_PROGRESS': '30', 'COMPLETED': '40', 'CLOSED': '50'}[value]"
    },
    {
      "mesField": "startDate",
      "erpField": "START_DATE",
      "dataType": "datetime",
      "isRequired": false
    },
    {
      "mesField": "completionDate",
      "erpField": "COMPLETION_DATE",
      "dataType": "datetime",
      "isRequired": false
    },
    {
      "mesField": "actualCost",
      "erpField": "ACTUAL_COST",
      "dataType": "decimal",
      "isRequired": false,
      "transformation": "parseFloat(value || 0).toFixed(2)"
    }
  ]
}
```

## Testing the Integration

### Step 1: Initial Data Sync

1. **Test Supplier Sync**
   ```bash
   curl -X POST https://machshop3.company.com/api/v1/erp/sync-jobs/impact-production/execute \
     -H "Authorization: Bearer [token]" \
     -H "Content-Type: application/json" \
     -d '{"entityTypes": ["Supplier"], "testMode": true}'
   ```

2. **Verify Supplier Data**
   - Check MachShop3 supplier list
   - Compare with Impact vendor list
   - Verify field mappings are correct

### Step 2: Test Purchase Order Creation

1. **Create Test PO in MachShop3**
   ```json
   {
     "poNumber": "TEST-PO-001",
     "vendorId": "VENDOR001",
     "totalAmount": 1000.00,
     "status": "DRAFT",
     "requiredDate": "2024-02-01"
   }
   ```

2. **Verify in Impact**
   - Log into Impact
   - Navigate to **Purchasing** → **Purchase Orders**
   - Search for `TEST-PO-001`
   - Verify all fields are mapped correctly

### Step 3: Test Receipt Posting

1. **Create Receipt in MachShop3**
   ```json
   {
     "poId": "TEST-PO-001",
     "quantityReceived": 10,
     "receiptDate": "2024-01-15",
     "lotNumber": "LOT123",
     "inspectionStatus": "ACCEPTED"
   }
   ```

2. **Verify Receipt in Impact**
   - Navigate to **Inventory** → **Receipts**
   - Find receipt for `TEST-PO-001`
   - Verify quantity and status

### Step 4: Test Error Handling

1. **Test Invalid Data**
   - Send PO with missing required field
   - Verify error is logged correctly
   - Check retry mechanism works

2. **Test Connection Failure**
   - Temporarily block network access
   - Attempt sync operation
   - Verify graceful failure and queuing

### Step 5: Performance Testing

1. **Bulk Data Test**
   ```bash
   # Generate test data
   npm run test:generate-bulk-data -- --count=1000

   # Run bulk sync
   npm run erp:sync:bulk -- --integration=impact-production
   ```

2. **Monitor Performance**
   - Check sync duration
   - Monitor memory usage
   - Verify no data loss

## Production Deployment

### Pre-Deployment Checklist

#### Impact ERP
- [ ] API user created with production permissions
- [ ] IP whitelist configured for production servers
- [ ] SSL certificates valid and not expiring soon
- [ ] Backup procedures in place
- [ ] Monitoring configured

#### MachShop3
- [ ] Production credentials configured
- [ ] Field mappings reviewed and tested
- [ ] Sync schedules appropriate for production
- [ ] Error alerting configured
- [ ] Backup strategy implemented

#### Network
- [ ] Firewall rules configured
- [ ] DNS entries correct
- [ ] Load balancer configured (if applicable)
- [ ] VPN setup (if required)

### Deployment Steps

1. **Deploy Configuration**
   ```bash
   # Export tested configuration
   npm run erp:export:config -- --integration=impact-staging

   # Import to production
   npm run erp:import:config -- --file=impact-config.json --env=production
   ```

2. **Initialize Data**
   ```bash
   # Run initial sync with validation
   npm run erp:sync:initial -- --integration=impact-production --validate
   ```

3. **Enable Scheduled Jobs**
   ```bash
   # Start sync scheduler
   npm run erp:scheduler:start -- --integration=impact-production
   ```

4. **Monitor Initial Operations**
   - Watch logs for first 24 hours
   - Verify all scheduled jobs run successfully
   - Check for any data discrepancies

### Post-Deployment Verification

1. **Data Integrity Checks**
   ```bash
   # Run reconciliation
   npm run erp:reconcile -- --integration=impact-production

   # Generate report
   npm run erp:report:reconciliation -- --format=pdf
   ```

2. **Performance Validation**
   - Sync completion times meet SLA
   - No excessive resource usage
   - API rate limits not exceeded

## Common Issues and Solutions

### Issue 1: Authentication Failures

**Error Message**:
```
Error: Authentication failed for user mes_api_user
Code: ERP002
```

**Causes and Solutions**:

1. **Incorrect Password**
   - Verify password in Impact user settings
   - Check for special characters that need escaping
   - Reset password if necessary

2. **User Account Locked**
   - Check Impact audit logs for failed login attempts
   - Unlock account in Impact user management
   - Review password policy compliance

3. **Session Timeout**
   - Increase session timeout in Impact API settings
   - Implement session refresh in MachShop3

**Diagnostic Commands**:
```bash
# Test authentication directly
curl -u mes_api_user:password https://impact.company.com/api/v2/auth/validate

# Check MachShop3 logs
tail -f /var/log/machshop3/erp-integration.log | grep AUTH
```

### Issue 2: Field Mapping Errors

**Error Message**:
```
Error: Transformation failed for field 'poDate'
Details: Cannot read property 'toISOString' of null
```

**Causes and Solutions**:

1. **Null Values Not Handled**
   ```javascript
   // Bad transformation
   "transformation": "new Date(value).toISOString()"

   // Good transformation
   "transformation": "value ? new Date(value).toISOString() : null"
   ```

2. **Data Type Mismatch**
   - Verify Impact field data types
   - Update transformation functions
   - Add type validation

3. **Invalid Date Format**
   - Check Impact date format requirements
   - Adjust transformation to match expected format

### Issue 3: Sync Performance Issues

**Symptoms**:
- Sync jobs taking > 5 minutes
- Timeout errors
- High CPU/memory usage

**Solutions**:

1. **Optimize Batch Sizes**
   ```json
   {
     "suppliers": 50,      // Reduced from 100
     "purchaseOrders": 25,  // Reduced from 50
     "inventory": 250      // Reduced from 500
   }
   ```

2. **Enable Pagination**
   ```javascript
   // In Impact API calls
   GET /api/v2/suppliers?page=1&pageSize=50
   ```

3. **Implement Caching**
   - Cache supplier data (changes infrequently)
   - Cache field mappings
   - Use Redis for session management

### Issue 4: Data Discrepancies

**Symptoms**:
- PO totals don't match
- Status codes incorrect
- Missing required fields

**Solutions**:

1. **Run Reconciliation**
   ```bash
   npm run erp:reconcile -- --integration=impact-production --entity=PurchaseOrder
   ```

2. **Review Transformation Logic**
   - Check rounding in decimal fields
   - Verify status code mappings
   - Ensure timezone handling is correct

3. **Enable Detailed Logging**
   ```javascript
   // In .env file
   ERP_LOG_LEVEL=debug
   ERP_LOG_TRANSFORMATIONS=true
   ```

### Issue 5: Network Connectivity Issues

**Error Message**:
```
Error: ETIMEDOUT - Connection to impact.company.com timed out
```

**Solutions**:

1. **Check Network Path**
   ```bash
   # Trace route
   traceroute impact.company.com

   # Test port connectivity
   nc -zv impact.company.com 443
   ```

2. **Verify Firewall Rules**
   - Check outbound rules on MachShop3 server
   - Verify Impact server allows inbound connections
   - Review any proxy configurations

3. **Increase Timeouts**
   ```json
   {
     "timeout": 60000,  // Increased to 60 seconds
     "keepAlive": true,
     "maxSockets": 10
   }
   ```

### Issue 6: Impact API Rate Limiting

**Error Message**:
```
Error: 429 Too Many Requests
X-RateLimit-Remaining: 0
```

**Solutions**:

1. **Implement Rate Limiting**
   ```javascript
   // Add delay between requests
   const delay = 1000; // 1 second
   await sleep(delay);
   ```

2. **Use Batch Operations**
   - Combine multiple operations into single API calls
   - Use Impact's bulk endpoints when available

3. **Distribute Load**
   - Spread sync operations throughout the day
   - Avoid scheduling all jobs at the same time

## Reference

### Impact API Endpoints

```
Base URL: https://impact.company.com/api/v2

Authentication:
GET  /auth/validate           - Validate credentials
POST /auth/login              - Create session
POST /auth/logout             - End session

Suppliers:
GET  /suppliers               - List suppliers
GET  /suppliers/{code}        - Get supplier details
POST /suppliers               - Create supplier
PUT  /suppliers/{code}        - Update supplier

Purchase Orders:
GET  /purchase-orders         - List POs
GET  /purchase-orders/{num}   - Get PO details
POST /purchase-orders         - Create PO
PUT  /purchase-orders/{num}   - Update PO
POST /purchase-orders/{num}/approve - Approve PO
POST /purchase-orders/{num}/cancel  - Cancel PO

Work Orders:
GET  /work-orders            - List work orders
GET  /work-orders/{num}      - Get work order
PUT  /work-orders/{num}      - Update work order

Inventory:
POST /receipts               - Post receipt
POST /inventory-transactions - Post transaction
GET  /inventory/balances     - Get balances

Costs:
POST /costs                  - Post cost transaction
GET  /costs/{id}            - Get cost details
```

### Status Code Mappings

#### Purchase Order Status
| MachShop3 | Impact | Code |
|-----------|--------|------|
| DRAFT | Draft | 10 |
| APPROVED | Approved | 20 |
| SENT | Sent | 30 |
| ACKNOWLEDGED | Acknowledged | 40 |
| IN_PROGRESS | In Progress | 50 |
| RECEIVED | Received | 60 |
| CLOSED | Closed | 70 |
| CANCELLED | Cancelled | 90 |

#### Work Order Status
| MachShop3 | Impact | Code |
|-----------|--------|------|
| PLANNED | Planned | 10 |
| RELEASED | Released | 20 |
| IN_PROGRESS | In Progress | 30 |
| COMPLETED | Completed | 40 |
| CLOSED | Closed | 50 |
| CANCELLED | Cancelled | 90 |

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| IMP001 | Invalid company code | Verify company configuration in Impact |
| IMP002 | Vendor not found | Ensure vendor exists in Impact |
| IMP003 | Part number not found | Check part master in Impact |
| IMP004 | Insufficient permissions | Review API user permissions |
| IMP005 | Invalid date format | Use YYYY-MM-DD HH:MM:SS format |
| IMP006 | Duplicate PO number | Check PO numbering sequence |
| IMP007 | Invalid status code | Use correct status code mapping |
| IMP008 | Missing required field | Check field mapping configuration |
| IMP009 | Transaction locked | Wait and retry operation |
| IMP010 | API version mismatch | Update API version configuration |

### Sample Configuration Files

#### Full Integration Configuration
```json
{
  "name": "impact-production",
  "erpSystem": "IMPACT",
  "description": "Production Impact ERP Integration",
  "apiEndpoint": "https://impact.company.com/api/v2",
  "apiVersion": "v2",
  "authMethod": "BASIC",
  "apiUsername": "mes_api_user",
  "apiPassword": "encrypted:AES256:...",
  "company": "AERO01",
  "division": "PLANT01",
  "warehouse": "WH01",
  "businessUnit": "MFG",
  "facility": "MAIN",
  "timeout": 30000,
  "retryAttempts": 3,
  "retryDelay": 1000,
  "syncSchedule": {
    "enabled": true,
    "suppliers": "0 2 * * *",
    "purchaseOrders": "*/30 * * * *",
    "workOrders": "*/15 * * * *",
    "inventory": "0 */4 * * *"
  },
  "batchSizes": {
    "suppliers": 100,
    "purchaseOrders": 50,
    "workOrders": 25,
    "inventory": 500
  },
  "webhooks": {
    "enabled": true,
    "endpoint": "https://machshop3.company.com/api/v1/webhooks/impact",
    "events": ["sync.started", "sync.completed", "sync.failed"]
  }
}
```

### Monitoring Queries

```sql
-- Recent sync jobs
SELECT
  entity_type,
  status,
  started_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds,
  records_processed,
  error_message
FROM erp_sync_jobs
WHERE erp_integration_id = 'impact-production'
ORDER BY started_at DESC
LIMIT 20;

-- Error frequency
SELECT
  DATE(created_at) as date,
  entity_type,
  COUNT(*) as error_count,
  COUNT(DISTINCT error_message) as unique_errors
FROM erp_sync_transactions
WHERE
  erp_integration_id = 'impact-production'
  AND status = 'FAILED'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), entity_type
ORDER BY date DESC;

-- Field mapping usage
SELECT
  entity_type,
  mes_field,
  erp_field,
  COUNT(*) as usage_count,
  AVG(CASE WHEN transformation IS NOT NULL THEN 1 ELSE 0 END) as transform_rate
FROM erp_field_mappings fm
JOIN erp_sync_transactions st ON st.erp_integration_id = fm.erp_integration_id
WHERE fm.erp_integration_id = 'impact-production'
GROUP BY entity_type, mes_field, erp_field
ORDER BY usage_count DESC;
```

## Support Resources

### Documentation
- Impact API Documentation: https://impact.company.com/api/docs
- MachShop3 ERP Integration: https://docs.machshop3.com/erp-integration
- Field Mapping Guide: https://docs.machshop3.com/erp-field-mapping

### Support Contacts
- **Impact Support**: support@impacterp.com | +1-800-IMPACT1
- **MachShop3 Support**: support@machshop3.com | +1-555-MACHSHOP
- **Integration Team**: integration@company.com

### Training Resources
- Video Tutorial: "Setting up Impact Integration" (30 min)
- Webinar: "Best Practices for ERP Integration" (Monthly)
- Knowledge Base: https://kb.machshop3.com/impact-erp

### Community
- MachShop3 Forum: https://forum.machshop3.com/erp-integration
- Impact User Group: https://community.impacterp.com
- Stack Overflow: Tag with `machshop3` and `impact-erp`