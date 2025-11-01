# Oracle Cloud ERP Integration Setup Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Oracle Cloud Configuration](#oracle-cloud-configuration)
4. [MachShop3 Configuration](#machshop3-configuration)
5. [OAuth 2.0 Setup](#oauth-20-setup)
6. [REST API Configuration](#rest-api-configuration)
7. [Field Mapping for Oracle](#field-mapping-for-oracle)
8. [Testing the Integration](#testing-the-integration)
9. [Production Deployment](#production-deployment)
10. [Oracle-Specific Troubleshooting](#oracle-specific-troubleshooting)
11. [Reference](#reference)

## Overview

Oracle Cloud ERP (formerly Oracle Fusion) is a complete, modern, cloud-based enterprise resource planning suite. This guide provides detailed instructions for integrating MachShop3 with Oracle Cloud ERP using REST APIs.

### Integration Architecture

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│        MachShop3 MES           │         │      Oracle Cloud ERP          │
├────────────────────────────────┤         ├────────────────────────────────┤
│                                │         │                                │
│   Oracle ERP Adapter           │◄────────► Oracle REST API Gateway       │
│                                │  HTTPS  │                                │
│   - OAuth 2.0 Client           │         │  - API Platform Cloud Service  │
│   - JWT Token Handler          │         │  - Business Event Publishing   │
│   - Pagination Manager         │         │  - Integration Cloud Service   │
│   - Bulk Data Processor        │         │  - Security Token Service      │
│                                │         │                                │
└────────────────────────────────┘         └────────────────────────────────┘
```

### Supported Oracle Modules

- **Procurement Cloud**: Purchase orders, suppliers, requisitions
- **Inventory Management Cloud**: Item master, transactions, transfers
- **Manufacturing Cloud**: Work orders, operations, resources
- **Quality Management Cloud**: Quality plans, inspections, results
- **Costing Cloud**: Cost accounting, actual costs, variances
- **Supply Chain Orchestration**: Order orchestration, fulfillment

### Key Features

- RESTful API with JSON payload
- OAuth 2.0 authentication with JWT tokens
- Real-time event notifications via Oracle Integration Cloud
- Bulk data import/export capabilities
- Advanced query and filtering options
- Comprehensive audit trail

## Prerequisites

### Oracle Cloud ERP Requirements

#### Version Requirements
- Oracle Cloud ERP Release 13 (Update 20A) or higher
- Oracle Integration Cloud (optional, for real-time events)
- Oracle API Platform Cloud Service (optional, for API management)

#### Required Subscriptions
- Oracle Cloud ERP Base
- REST API Access
- Integration User License
- Required functional modules (Procurement, Manufacturing, etc.)

#### Required Roles and Privileges

The integration user needs these Oracle roles:

```
Application Roles:
- Integration Specialist (ORA_FND_INTEGRATION_SPECIALIST_JOB)
- Procurement Manager (ORA_PO_PROCUREMENT_MANAGER_JOB)
- Inventory Manager (ORA_INV_INVENTORY_MANAGER_JOB)
- Manufacturing Manager (ORA_MFG_MANUFACTURING_MANAGER_JOB)
- Quality Manager (ORA_QM_QUALITY_MANAGER_JOB)

Function Security Privileges:
- Manage Purchase Orders (PO_PURCHASE_ORDERS_MANAGE)
- Manage Suppliers (POZ_MANAGE_SUPPLIERS)
- Manage Inventory Transactions (INV_MANAGE_INVENTORY_TRANSACTIONS)
- Manage Work Orders (MFG_MANAGE_WORK_ORDERS)
- View Cost Accounting (CST_VIEW_COST_ACCOUNTING)
```

### MachShop3 Requirements

- MachShop3 version 3.0 or higher
- Oracle Adapter module licensed
- Valid SSL certificates
- Network access to Oracle Cloud (port 443)

### Network Requirements

#### DNS and Connectivity
```bash
# Oracle Cloud ERP URLs follow this pattern:
# https://{instance}.fa.{datacenter}.oraclecloud.com

# Example:
# Production: https://company-prod.fa.us2.oraclecloud.com
# Test: https://company-test.fa.us2.oraclecloud.com

# Test connectivity
ping company-prod.fa.us2.oraclecloud.com
curl -I https://company-prod.fa.us2.oraclecloud.com
```

#### Firewall Configuration
- Allow outbound HTTPS (port 443) to Oracle Cloud domains
- Whitelist Oracle Cloud IP ranges (obtain from Oracle support)

## Oracle Cloud Configuration

### Step 1: Create Integration User

1. **Sign in to Oracle Cloud ERP**
   ```
   URL: https://company.fa.us2.oraclecloud.com
   Username: admin_user
   Password: [admin_password]
   ```

2. **Navigate to Security Console**
   - Click on **Navigator** (☰) → **Tools** → **Security Console**

3. **Create User Account**
   - Click **Users** → **Add User Account**
   - Enter details:
     ```
     User Name: MES_INTEGRATION
     Email: mes.integration@company.com
     First Name: MES
     Last Name: Integration
     User Category: Employee
     ```

4. **Set Password**
   - Click **Reset Password**
   - Set a strong password
   - Uncheck "User must change password at next sign-in"

5. **Assign Roles**
   - Click **Add Role**
   - Search and add:
     ```
     ✓ Integration Specialist
     ✓ Procurement Manager
     ✓ Inventory Manager
     ✓ Manufacturing Manager
     ✓ Quality Manager
     ```
   - Set **From Date**: Today
   - Set **To Date**: 12/31/2099

### Step 2: Configure API Access

1. **Enable REST API Access**
   - Navigate to **Setup and Maintenance**
   - Search for task: "Manage Administrator Profile Values"
   - Set profile options:
     ```
     FND_REST_ENABLED: Yes
     FND_REST_MAX_RECORDS: 500
     FND_REST_TIMEOUT: 300
     ```

2. **Configure Rate Limiting**
   - Search for: "Manage REST Service Rate Limits"
   - Configure:
     ```
     Default Rate Limit: 1000 requests/hour
     Burst Limit: 100 requests/minute
     Integration User Override: 5000 requests/hour
     ```

3. **Set Up CORS (if needed)**
   - Search for: "Manage Cross-Origin Resource Sharing"
   - Add allowed origin:
     ```
     Origin: https://machshop3.company.com
     Methods: GET, POST, PUT, PATCH, DELETE
     Headers: Authorization, Content-Type, X-Requested-With
     ```

### Step 3: Configure Business Objects

1. **Purchase Orders Configuration**
   - Navigate to **Procurement** → **Configure Procurement Business Function**
   - Enable:
     ```
     ✓ Purchase Order Automation
     ✓ Supplier Portal
     ✓ Three-Way Match
     ✓ REST API for Purchase Orders
     ```

2. **Inventory Configuration**
   - Navigate to **Inventory** → **Manage Inventory Organizations**
   - For each organization, enable:
     ```
     ✓ API Access Enabled
     ✓ External System Integration
     ✓ Real-time Transaction Processing
     ```

3. **Manufacturing Configuration**
   - Navigate to **Manufacturing** → **Manage Plants**
   - Configure:
     ```
     ✓ Work Order API Enabled
     ✓ External MES Integration
     ✓ Operation Reporting via API
     ```

### Step 4: Set Up Integration Cloud (Optional)

For real-time event notifications:

1. **Create Integration**
   - Sign in to Oracle Integration Cloud
   - Create new integration: "MES_ERP_SYNC"

2. **Configure Connections**
   ```
   Source: Oracle ERP Cloud Adapter
   Target: REST Adapter (MachShop3 webhook)
   ```

3. **Define Mappings**
   - Map Oracle business events to MachShop3 webhook payloads

4. **Activate Integration**
   - Test and activate the integration flow

## MachShop3 Configuration

### Step 1: Create Oracle Integration

1. **Access Integration Settings**
   ```
   Navigate: Settings → Integrations → ERP Systems → Add New
   ```

2. **Basic Configuration**
   ```json
   {
     "name": "oracle-production",
     "erpSystem": "ORACLE",
     "description": "Oracle Cloud ERP Production Integration",
     "environment": "Production"
   }
   ```

3. **Connection Settings**
   ```json
   {
     "apiEndpoint": "https://company-prod.fa.us2.oraclecloud.com",
     "apiVersion": "v13",
     "connectionTimeout": 30000,
     "requestTimeout": 120000,
     "maxRetries": 3,
     "retryDelay": 2000
   }
   ```

4. **API Endpoints Configuration**
   ```json
   {
     "endpoints": {
       "purchaseOrders": "/fscmRestApi/resources/11.13.18.05/purchaseOrders",
       "suppliers": "/fscmRestApi/resources/11.13.18.05/suppliers",
       "items": "/fscmRestApi/resources/11.13.18.05/items",
       "inventoryTransactions": "/fscmRestApi/resources/11.13.18.05/inventoryTransactions",
       "workOrders": "/fscmRestApi/resources/11.13.18.05/workOrders",
       "receipts": "/fscmRestApi/resources/11.13.18.05/receipts",
       "costs": "/fscmRestApi/resources/11.13.18.05/standardCosts"
     }
   }
   ```

## OAuth 2.0 Setup

### Step 1: Register OAuth Client

1. **Access Oracle IDCS (Identity Cloud Service)**
   ```
   URL: https://idcs-{tenant}.identity.oraclecloud.com/ui/v1/adminconsole
   ```

2. **Create Confidential Application**
   - Navigate to **Applications** → **Add**
   - Select **Confidential Application**
   - Configure:
     ```
     Name: MES_Integration_Client
     Description: MachShop3 MES Integration OAuth Client
     ```

3. **Configure OAuth**
   - Client Configuration:
     ```
     Allowed Grant Types:
     ✓ Client Credentials
     ✓ JWT Assertion
     ✓ Refresh Token

     Token Issuance Policy:
     Access Token Expiration: 3600 seconds
     Refresh Token Expiration: 604800 seconds
     ```

4. **Add Resources**
   - Click **Add Scope**
   - Select:
     ```
     Oracle ERP Cloud: All
     Oracle SCM Cloud: All
     ```

5. **Generate Credentials**
   - Note down:
     ```
     Client ID: 8a7f9c2d5e1b4a3f
     Client Secret: ************
     ```

### Step 2: Configure MachShop3 OAuth

1. **Add OAuth Configuration**
   ```json
   {
     "authMethod": "OAUTH2",
     "oauth": {
       "tokenEndpoint": "https://idcs-{tenant}.identity.oraclecloud.com/oauth2/v1/token",
       "clientId": "8a7f9c2d5e1b4a3f",
       "clientSecret": "[encrypted_secret]",
       "scope": "https://company.fa.us2.oraclecloud.com:443",
       "grantType": "client_credentials"
     }
   }
   ```

2. **Implement Token Management**
   ```javascript
   class OracleTokenManager {
     async getToken() {
       if (this.isTokenValid()) {
         return this.currentToken;
       }

       const response = await fetch(tokenEndpoint, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/x-www-form-urlencoded',
           'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
         },
         body: 'grant_type=client_credentials&scope=' + encodeURIComponent(scope)
       });

       const data = await response.json();
       this.currentToken = data.access_token;
       this.tokenExpiry = Date.now() + (data.expires_in * 1000);

       return this.currentToken;
     }

     isTokenValid() {
       return this.currentToken && Date.now() < this.tokenExpiry - 60000;
     }
   }
   ```

### Step 3: Configure JWT Authentication (Alternative)

1. **Generate Key Pair**
   ```bash
   # Generate private key
   openssl genrsa -out oracle-integration.key 2048

   # Generate public key
   openssl rsa -in oracle-integration.key -pubout -out oracle-integration.pub
   ```

2. **Register Public Key in Oracle**
   - Navigate to IDCS → Applications → MES_Integration_Client
   - Upload public key under **Certificates**

3. **Create JWT Assertion**
   ```javascript
   const jwt = require('jsonwebtoken');

   function createJWTAssertion() {
     const payload = {
       iss: clientId,
       sub: clientId,
       aud: 'https://identity.oraclecloud.com/',
       iat: Math.floor(Date.now() / 1000),
       exp: Math.floor(Date.now() / 1000) + 300
     };

     return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
   }
   ```

## REST API Configuration

### Understanding Oracle REST API Structure

#### API URL Pattern
```
https://{instance}.fa.{dc}.oraclecloud.com/fscmRestApi/resources/{version}/{resource}

Example:
https://company-prod.fa.us2.oraclecloud.com/fscmRestApi/resources/11.13.18.05/purchaseOrders
```

#### Common HTTP Headers
```http
Authorization: Bearer {access_token}
Content-Type: application/json
Accept: application/json
REST-Framework-Version: 6
Upsert-Mode: true
REST-Pretty-Print: true
```

### Pagination and Querying

#### Pagination Parameters
```
?limit=25           # Number of records per page
&offset=0          # Starting position
&onlyData=true     # Exclude metadata
&fields=OrderNumber,Supplier  # Select specific fields
```

#### Query Syntax
```
# Simple filter
?q=OrderNumber='PO123456'

# Complex filter
?q=CreationDate>'2024-01-01' AND Status='OPEN'

# Wildcard search
?q=SupplierName LIKE 'Acme%'

# Sort results
?orderBy=CreationDate:desc
```

### Batch Operations

Oracle supports batch operations for better performance:

```json
{
  "parts": [
    {
      "id": "part1",
      "path": "/purchaseOrders",
      "operation": "create",
      "payload": {
        "OrderNumber": "PO001",
        "Supplier": "VENDOR001"
      }
    },
    {
      "id": "part2",
      "path": "/purchaseOrders",
      "operation": "create",
      "payload": {
        "OrderNumber": "PO002",
        "Supplier": "VENDOR002"
      }
    }
  ]
}
```

## Field Mapping for Oracle

### Oracle Field Conventions

- PascalCase for field names (e.g., `OrderNumber`)
- ISO 8601 date format: `YYYY-MM-DDTHH:MM:SS.sssZ`
- Currency amounts as numbers without symbols
- Boolean values as `true`/`false` (not Y/N)

### Purchase Order Field Mappings

```json
{
  "entityType": "PurchaseOrder",
  "oracleResource": "purchaseOrders",
  "mappings": [
    {
      "mesField": "poNumber",
      "oracleField": "OrderNumber",
      "dataType": "string",
      "maxLength": 30,
      "isRequired": true
    },
    {
      "mesField": "documentType",
      "oracleField": "DocumentTypeCode",
      "dataType": "string",
      "isRequired": true,
      "defaultValue": "STANDARD"
    },
    {
      "mesField": "vendorId",
      "oracleField": "Supplier",
      "dataType": "string",
      "maxLength": 30,
      "isRequired": true
    },
    {
      "mesField": "vendorSiteId",
      "oracleField": "SupplierSite",
      "dataType": "string",
      "maxLength": 30,
      "isRequired": false
    },
    {
      "mesField": "buyerId",
      "oracleField": "BuyerId",
      "dataType": "number",
      "isRequired": true
    },
    {
      "mesField": "orderDate",
      "oracleField": "OrderDate",
      "dataType": "datetime",
      "isRequired": true,
      "transformation": "new Date(value).toISOString()"
    },
    {
      "mesField": "currencyCode",
      "oracleField": "CurrencyCode",
      "dataType": "string",
      "maxLength": 15,
      "isRequired": true,
      "defaultValue": "USD"
    },
    {
      "mesField": "status",
      "oracleField": "StatusCode",
      "dataType": "string",
      "isRequired": false,
      "transformation": "{'DRAFT': 'INCOMPLETE', 'APPROVED': 'APPROVED', 'CLOSED': 'CLOSED'}[value]"
    },
    {
      "mesField": "businessUnit",
      "oracleField": "RequisitioningBUId",
      "dataType": "number",
      "isRequired": true
    },
    {
      "mesField": "legalEntity",
      "oracleField": "SoldToLegalEntity",
      "dataType": "string",
      "maxLength": 30,
      "isRequired": false
    },
    {
      "mesField": "description",
      "oracleField": "Description",
      "dataType": "string",
      "maxLength": 240,
      "isRequired": false
    }
  ]
}
```

### Purchase Order Line Field Mappings

```json
{
  "entityType": "PurchaseOrderLine",
  "oracleResource": "lines",
  "parentEntity": "PurchaseOrder",
  "mappings": [
    {
      "mesField": "lineNumber",
      "oracleField": "LineNumber",
      "dataType": "number",
      "isRequired": true
    },
    {
      "mesField": "lineType",
      "oracleField": "LineTypeCode",
      "dataType": "string",
      "isRequired": true,
      "defaultValue": "GOODS"
    },
    {
      "mesField": "itemNumber",
      "oracleField": "ItemNumber",
      "dataType": "string",
      "maxLength": 300,
      "isRequired": false
    },
    {
      "mesField": "itemDescription",
      "oracleField": "ItemDescription",
      "dataType": "string",
      "maxLength": 240,
      "isRequired": true
    },
    {
      "mesField": "quantity",
      "oracleField": "Quantity",
      "dataType": "number",
      "isRequired": true
    },
    {
      "mesField": "unitOfMeasure",
      "oracleField": "UOM",
      "dataType": "string",
      "maxLength": 25,
      "isRequired": true
    },
    {
      "mesField": "unitPrice",
      "oracleField": "UnitPrice",
      "dataType": "number",
      "isRequired": true
    },
    {
      "mesField": "needByDate",
      "oracleField": "NeedByDate",
      "dataType": "datetime",
      "isRequired": false,
      "transformation": "value ? new Date(value).toISOString() : null"
    },
    {
      "mesField": "promisedDate",
      "oracleField": "PromisedDate",
      "dataType": "datetime",
      "isRequired": false
    },
    {
      "mesField": "requesterId",
      "oracleField": "RequesterId",
      "dataType": "number",
      "isRequired": false
    },
    {
      "mesField": "destinationType",
      "oracleField": "DestinationTypeCode",
      "dataType": "string",
      "isRequired": true,
      "defaultValue": "INVENTORY"
    },
    {
      "mesField": "shipToOrganization",
      "oracleField": "DestinationOrganizationId",
      "dataType": "number",
      "isRequired": true
    },
    {
      "mesField": "shipToLocation",
      "oracleField": "ShipToLocationId",
      "dataType": "number",
      "isRequired": true
    }
  ]
}
```

### Supplier Field Mappings

```json
{
  "entityType": "Supplier",
  "oracleResource": "suppliers",
  "mappings": [
    {
      "mesField": "vendorNumber",
      "oracleField": "Supplier",
      "dataType": "string",
      "maxLength": 30,
      "isRequired": true
    },
    {
      "mesField": "vendorName",
      "oracleField": "SupplierName",
      "dataType": "string",
      "maxLength": 360,
      "isRequired": true
    },
    {
      "mesField": "alternateName",
      "oracleField": "AlternateName",
      "dataType": "string",
      "maxLength": 320,
      "isRequired": false
    },
    {
      "mesField": "taxPayerId",
      "oracleField": "TaxpayerIdentificationNumber",
      "dataType": "string",
      "maxLength": 30,
      "isRequired": false
    },
    {
      "mesField": "dunsNumber",
      "oracleField": "DUNSNumber",
      "dataType": "string",
      "maxLength": 30,
      "isRequired": false
    },
    {
      "mesField": "supplierType",
      "oracleField": "SupplierType",
      "dataType": "string",
      "isRequired": false,
      "defaultValue": "VENDOR"
    },
    {
      "mesField": "startDate",
      "oracleField": "StartDateActive",
      "dataType": "datetime",
      "isRequired": false
    },
    {
      "mesField": "endDate",
      "oracleField": "EndDateActive",
      "dataType": "datetime",
      "isRequired": false
    }
  ]
}
```

### Work Order Field Mappings

```json
{
  "entityType": "WorkOrder",
  "oracleResource": "workOrders",
  "mappings": [
    {
      "mesField": "workOrderNumber",
      "oracleField": "WorkOrderNumber",
      "dataType": "string",
      "maxLength": 30,
      "isRequired": true
    },
    {
      "mesField": "workOrderType",
      "oracleField": "WorkOrderType",
      "dataType": "string",
      "isRequired": true,
      "defaultValue": "STANDARD"
    },
    {
      "mesField": "itemNumber",
      "oracleField": "InventoryItemId",
      "dataType": "number",
      "isRequired": true
    },
    {
      "mesField": "startQuantity",
      "oracleField": "PlannedStartQuantity",
      "dataType": "number",
      "isRequired": true
    },
    {
      "mesField": "completedQuantity",
      "oracleField": "CompletedQuantity",
      "dataType": "number",
      "isRequired": false
    },
    {
      "mesField": "scheduledStartDate",
      "oracleField": "ScheduledStartDate",
      "dataType": "datetime",
      "isRequired": true
    },
    {
      "mesField": "scheduledEndDate",
      "oracleField": "ScheduledCompletionDate",
      "dataType": "datetime",
      "isRequired": true
    },
    {
      "mesField": "status",
      "oracleField": "WorkOrderStatusCode",
      "dataType": "string",
      "isRequired": false,
      "transformation": "{'UNRELEASED': 'UNRELEASED', 'RELEASED': 'RELEASED', 'COMPLETE': 'COMPLETE', 'CLOSED': 'CLOSED'}[value]"
    },
    {
      "mesField": "organizationId",
      "oracleField": "OrganizationId",
      "dataType": "number",
      "isRequired": true
    }
  ]
}
```

## Testing the Integration

### Step 1: Test OAuth Authentication

1. **Get Access Token**
   ```bash
   curl -X POST \
     https://idcs-tenant.identity.oraclecloud.com/oauth2/v1/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -u "client_id:client_secret" \
     -d "grant_type=client_credentials&scope=https://company.fa.us2.oraclecloud.com:443"
   ```

2. **Verify Token Response**
   ```json
   {
     "access_token": "eyJ4NXQjUzI1...",
     "token_type": "Bearer",
     "expires_in": 3600
   }
   ```

### Step 2: Test API Access

1. **Test Basic API Call**
   ```bash
   TOKEN="eyJ4NXQjUzI1..."

   curl -X GET \
     "https://company.fa.us2.oraclecloud.com/fscmRestApi/resources/11.13.18.05/purchaseOrders?limit=1" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json"
   ```

2. **Test Creating a Purchase Order**
   ```bash
   curl -X POST \
     "https://company.fa.us2.oraclecloud.com/fscmRestApi/resources/11.13.18.05/purchaseOrders" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "DocumentTypeCode": "STANDARD",
       "RequisitioningBUId": 300000001,
       "Supplier": "VENDOR001",
       "CurrencyCode": "USD",
       "lines": [
         {
           "LineTypeCode": "GOODS",
           "ItemDescription": "Test Item",
           "Quantity": 10,
           "UOM": "EA",
           "UnitPrice": 100
         }
       ]
     }'
   ```

### Step 3: Test Data Synchronization

1. **Sync Suppliers**
   ```bash
   curl -X POST \
     "https://machshop3.company.com/api/v1/erp/sync-jobs/oracle-production/execute" \
     -H "Authorization: Bearer [machshop_token]" \
     -H "Content-Type: application/json" \
     -d '{"entityTypes": ["Supplier"], "testMode": true}'
   ```

2. **Verify Data Mapping**
   - Check field transformations
   - Verify data types
   - Validate required fields

### Step 4: Test Error Handling

1. **Test Invalid Request**
   ```bash
   # Missing required field
   curl -X POST \
     "https://company.fa.us2.oraclecloud.com/fscmRestApi/resources/11.13.18.05/purchaseOrders" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "DocumentTypeCode": "STANDARD"
     }'
   ```

2. **Verify Error Response**
   ```json
   {
     "title": "Bad Request",
     "status": "400",
     "detail": "The required attribute Supplier is missing",
     "o:errorCode": "FND-0001"
   }
   ```

### Step 5: Performance Testing

1. **Test Bulk Operations**
   ```javascript
   // Test batch creation
   const batchPayload = {
     parts: Array.from({length: 50}, (_, i) => ({
       id: `part${i}`,
       path: "/purchaseOrders",
       operation: "create",
       payload: generateTestPO(i)
     }))
   };
   ```

2. **Monitor Performance Metrics**
   - Response times
   - Throughput (records/second)
   - Error rates
   - Token refresh frequency

## Production Deployment

### Pre-Production Checklist

#### Oracle Cloud
- [ ] Production instance configured
- [ ] OAuth client registered for production
- [ ] Integration user created with appropriate roles
- [ ] API rate limits configured
- [ ] Business rules validated
- [ ] Audit logging enabled

#### MachShop3
- [ ] Production OAuth credentials configured
- [ ] SSL certificates valid
- [ ] Field mappings reviewed and tested
- [ ] Error handling tested
- [ ] Monitoring configured
- [ ] Backup procedures in place

### Deployment Steps

1. **Configure Production Environment**
   ```bash
   # Set production environment variables
   export ORACLE_INSTANCE=company-prod
   export ORACLE_DC=us2
   export ORACLE_VERSION=11.13.18.05
   ```

2. **Deploy Configuration**
   ```bash
   npm run erp:deploy \
     --integration=oracle-production \
     --config=oracle-prod-config.json \
     --validate
   ```

3. **Initialize Master Data**
   ```bash
   # Sync master data first
   npm run erp:sync:initial \
     --integration=oracle-production \
     --entities=Supplier,Item \
     --mode=validate
   ```

4. **Enable Scheduled Jobs**
   ```bash
   npm run erp:scheduler:enable \
     --integration=oracle-production
   ```

### Monitoring and Maintenance

1. **Set Up Monitoring**
   ```json
   {
     "monitors": [
       {
         "name": "Oracle API Health",
         "endpoint": "/health",
         "interval": 300
       },
       {
         "name": "Token Refresh",
         "metric": "token_refresh_count",
         "threshold": 100
       },
       {
         "name": "Sync Job Success",
         "metric": "sync_success_rate",
         "threshold": 0.95
       }
     ]
   }
   ```

2. **Configure Alerts**
   ```json
   {
     "alerts": [
       {
         "condition": "api_error_rate > 0.05",
         "severity": "high",
         "notify": ["ops@company.com"]
       },
       {
         "condition": "token_refresh_failed",
         "severity": "critical",
         "notify": ["admin@company.com"]
       }
     ]
   }
   ```

## Oracle-Specific Troubleshooting

### Issue 1: OAuth Token Expiration

**Error**: `401 Unauthorized: Token expired`

**Solution**:
```javascript
class TokenRefreshManager {
  async ensureValidToken() {
    if (this.tokenExpiresIn < 300) { // Refresh 5 minutes before expiry
      await this.refreshToken();
    }
    return this.currentToken;
  }

  async refreshToken() {
    try {
      const newToken = await this.getNewToken();
      this.updateToken(newToken);
    } catch (error) {
      // Fallback to getting new token
      const newToken = await this.authenticate();
      this.updateToken(newToken);
    }
  }
}
```

### Issue 2: Large Dataset Pagination

**Error**: `Response too large`

**Solution**:
```javascript
async function getAllRecords(resource) {
  const records = [];
  let hasMore = true;
  let offset = 0;
  const limit = 500;

  while (hasMore) {
    const response = await fetch(
      `${resource}?limit=${limit}&offset=${offset}`,
      { headers: getAuthHeaders() }
    );

    const data = await response.json();
    records.push(...data.items);

    hasMore = data.hasMore;
    offset += limit;
  }

  return records;
}
```

### Issue 3: Concurrent Request Limits

**Error**: `429 Too Many Requests`

**Solution**:
```javascript
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.queue = [];
  }

  async execute(request) {
    await this.waitForSlot();
    return this.performRequest(request);
  }

  async waitForSlot() {
    while (this.queue.length >= this.maxRequests) {
      await sleep(100);
    }
  }
}
```

### Issue 4: Business Object Validation

**Error**: `Business validation failed`

**Solution**:
```javascript
// Pre-validate before sending to Oracle
function validatePurchaseOrder(po) {
  const errors = [];

  // Required field validation
  if (!po.Supplier) errors.push("Supplier is required");
  if (!po.RequisitioningBUId) errors.push("Business Unit is required");

  // Business rule validation
  if (po.lines?.length === 0) errors.push("At least one line is required");

  po.lines?.forEach((line, index) => {
    if (line.Quantity <= 0) {
      errors.push(`Line ${index + 1}: Quantity must be positive`);
    }
  });

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
```

### Issue 5: Date/Time Format Issues

**Error**: `Invalid date format`

**Solution**:
```javascript
// Oracle expects ISO 8601 format
function formatOracleDate(date) {
  if (!date) return null;

  // Handle various input formats
  const parsed = new Date(date);

  if (isNaN(parsed)) {
    throw new Error(`Invalid date: ${date}`);
  }

  // Oracle format: YYYY-MM-DDTHH:MM:SS.sssZ
  return parsed.toISOString();
}

// For date-only fields
function formatOracleDateOnly(date) {
  if (!date) return null;
  const parsed = new Date(date);
  return parsed.toISOString().split('T')[0];
}
```

### Issue 6: Nested Object Updates

**Error**: `Cannot update child objects directly`

**Solution**:
```javascript
// Update parent with nested children
async function updatePOWithLines(poNumber, updates) {
  // Get existing PO with lines
  const existingPO = await getPO(poNumber, { expand: 'lines' });

  // Merge updates
  const updatedPO = {
    ...existingPO,
    ...updates,
    lines: updates.lines || existingPO.lines
  };

  // Update via parent endpoint
  return await updatePO(poNumber, updatedPO);
}
```

## Reference

### Oracle REST API Endpoints

```
Base URL: https://{instance}.fa.{datacenter}.oraclecloud.com/fscmRestApi/resources/{version}

Common Endpoints:
/purchaseOrders                    - Purchase Orders
/suppliers                         - Suppliers/Vendors
/items                            - Item Master
/receipts                         - Purchase Order Receipts
/inventoryTransactions            - Inventory Movements
/workOrders                       - Manufacturing Work Orders
/workOrderOperations              - Work Order Operations
/standardCosts                    - Standard Costs
/actualCosts                      - Actual Costs
/qualityActions                   - Quality Actions
/inspectionPlans                  - Quality Inspection Plans
```

### HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 200 | Success | Request processed successfully |
| 201 | Created | Resource created successfully |
| 204 | No Content | Delete successful |
| 400 | Bad Request | Invalid payload or parameters |
| 401 | Unauthorized | Token expired or invalid |
| 403 | Forbidden | Insufficient privileges |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate or constraint violation |
| 422 | Unprocessable Entity | Business validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Oracle server error |

### Oracle Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| FND-0001 | Required attribute missing | Provide required field |
| FND-0002 | Invalid attribute value | Check field format/values |
| POZ-0001 | Supplier not found | Verify supplier exists |
| PO-0001 | Invalid PO status transition | Check allowed status changes |
| INV-0001 | Item not found | Verify item number |
| INV-0002 | Insufficient quantity | Check available quantity |
| MFG-0001 | Work order not found | Verify work order number |
| CST-0001 | Cost element not defined | Configure cost elements |

### Query Examples

#### Complex Filtering
```
# POs created in last 30 days
?q=CreationDate > '2024-01-01T00:00:00Z' AND StatusCode != 'CLOSED'

# Items by category
?q=ItemCategory = 'ELECTRONICS' OR ItemCategory = 'COMPONENTS'

# Suppliers by country
?q=Country = 'US' AND SupplierType = 'VENDOR'
```

#### Field Selection
```
# Get specific fields only
?fields=OrderNumber,Supplier,TotalAmount

# Exclude fields
?excludeFields=SystemAttributes,Links
```

#### Expansion
```
# Get PO with lines
/purchaseOrders/{id}?expand=lines

# Get PO with lines and schedules
/purchaseOrders/{id}?expand=lines,lines.schedules

# Get all child objects
/purchaseOrders/{id}?expand=all
```

### Performance Optimization

```json
{
  "optimization": {
    "connection": {
      "keepAlive": true,
      "maxSockets": 50,
      "timeout": 120000
    },
    "batching": {
      "enabled": true,
      "maxBatchSize": 100,
      "maxBatchSizeBytes": 1048576
    },
    "caching": {
      "staticData": {
        "ttl": 3600,
        "entities": ["suppliers", "items", "businessUnits"]
      },
      "token": {
        "refreshBeforeExpiry": 300
      }
    },
    "pagination": {
      "defaultLimit": 500,
      "maxLimit": 1000
    }
  }
}
```

### Monitoring Queries

```sql
-- Sync job performance
SELECT
  DATE(created_at) as sync_date,
  entity_type,
  COUNT(*) as job_count,
  AVG(duration_seconds) as avg_duration,
  SUM(records_processed) as total_records,
  SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_jobs
FROM erp_sync_jobs
WHERE erp_integration_id = 'oracle-production'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), entity_type
ORDER BY sync_date DESC;

-- API call metrics
SELECT
  endpoint,
  COUNT(*) as call_count,
  AVG(response_time_ms) as avg_response_time,
  MAX(response_time_ms) as max_response_time,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
FROM oracle_api_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY endpoint
ORDER BY call_count DESC;
```

## Support Resources

### Oracle Documentation
- Oracle Cloud ERP Documentation: https://docs.oracle.com/en/cloud/saas/
- REST API for Oracle Cloud ERP: https://docs.oracle.com/en/cloud/saas/erp-cloud/
- Oracle Integration Cloud: https://docs.oracle.com/en/cloud/paas/integration-cloud/

### Oracle Support
- My Oracle Support: https://support.oracle.com
- Oracle Cloud Customer Connect: https://cloudcustomerconnect.oracle.com
- Oracle University: https://education.oracle.com

### Tools and Utilities
- Oracle REST API Explorer: Built into Oracle Cloud
- Postman Collection: https://www.postman.com/oraclecloud
- Oracle Cloud CLI: https://docs.oracle.com/iaas/Content/API/SDKDocs/cliinstall.htm

### Community Resources
- Oracle Cloud Community: https://community.oracle.com
- Stack Overflow: Tag with `oracle-cloud` and `oracle-rest-api`
- GitHub: https://github.com/oracle

For additional support:
- Oracle Support: 1-800-223-1711
- MachShop3 Integration Team: integration@machshop3.com
- Oracle Partner Network: https://partner.oracle.com