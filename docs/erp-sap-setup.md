# SAP S/4HANA ERP Integration Setup Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [SAP Configuration](#sap-configuration)
4. [MachShop3 Configuration](#machshop3-configuration)
5. [OData Service Setup](#odata-service-setup)
6. [Authentication Configuration](#authentication-configuration)
7. [Field Mapping for SAP](#field-mapping-for-sap)
8. [Testing the Integration](#testing-the-integration)
9. [Production Deployment](#production-deployment)
10. [SAP-Specific Troubleshooting](#sap-specific-troubleshooting)
11. [Reference](#reference)

## Overview

SAP S/4HANA is a next-generation enterprise resource planning suite built on the SAP HANA in-memory database platform. This guide provides comprehensive instructions for integrating MachShop3 with SAP S/4HANA using OData services.

### Integration Architecture

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│        MachShop3 MES           │         │      SAP S/4HANA               │
├────────────────────────────────┤         ├────────────────────────────────┤
│                                │         │                                │
│   SAP ERP Adapter              │◄────────►  SAP Gateway                  │
│                                │  OData  │                                │
│   - OAuth 2.0 Client           │         │  - OData Service Provider      │
│   - CSRF Token Handler         │         │  - Business Object Access      │
│   - Batch Request Builder      │         │  - Authorization Check         │
│   - EDM Parser                 │         │  - Change Document Logging     │
│                                │         │                                │
└────────────────────────────────┘         └────────────────────────────────┘
```

### Supported SAP Modules

- **MM (Materials Management)**: Purchase orders, vendors, material movements
- **PP (Production Planning)**: Work orders, production orders, routing
- **QM (Quality Management)**: Inspection lots, quality notifications
- **PM (Plant Maintenance)**: Maintenance orders, equipment tracking
- **FI/CO (Finance/Controlling)**: Cost posting, financial documents

### Integration Methods

- **OData Services**: RESTful API using OData v4 protocol
- **RFC/BAPI**: Remote Function Calls for complex operations
- **IDoc**: Intermediate Documents for batch processing
- **WebSocket**: Real-time event streaming (S/4HANA 2020+)

## Prerequisites

### SAP S/4HANA Requirements

#### Version Requirements
- SAP S/4HANA 1809 or higher
- SAP Gateway 7.50 or higher
- SAP NetWeaver 7.52 or higher

#### Required Components
- **SAP Gateway Foundation** (SAP_GWFND)
- **SAP Gateway Core** (IW_FND)
- **OData Provisioning** (IW_BEP)
- **Integration Content** for your industry

#### Required Authorizations
The integration user needs the following SAP authorizations:

```
Authorization Objects:
- S_SERVICE: OData Service authorization
- S_RFC: Remote Function Call authorization
- S_TABU_DIS: Table display authorization
- S_DEVELOP: Development object access (for custom services)

Specific Roles:
- SAP_BC_SRV_GEN_USER: Generic service user
- SAP_BC_SRV_ODATA_USER: OData service user
- Z_MES_INTEGRATION: Custom role for MES integration
```

### MachShop3 Requirements

- MachShop3 version 3.0 or higher
- SAP Adapter module licensed
- Valid SSL certificates for production
- Network access to SAP Gateway (typically port 8443)

### Network Requirements

#### Required Ports
- **8443**: SAP Gateway HTTPS (production)
- **8000**: SAP Gateway HTTP (development only)
- **3300**: SAP RFC (if using direct RFC)
- **44300**: SAP Web Dispatcher (if applicable)

#### Firewall Configuration
```bash
# Allow outbound HTTPS to SAP Gateway
iptables -A OUTPUT -p tcp --dport 8443 -d sap-gateway.company.com -j ACCEPT

# Allow SAP callback (for async operations)
iptables -A INPUT -p tcp --dport 9091 -s sap-gateway.company.com -j ACCEPT
```

## SAP Configuration

### Step 1: Create Integration User

1. **Access SAP GUI**
   ```
   System: PRD
   Client: 100
   User: BASIS_ADMIN
   ```

2. **Create User (SU01)**
   ```
   Transaction: SU01
   User: MES_INTEGRATION
   User Type: System
   Valid From: [Today]
   Valid To: 12/31/9999
   ```

3. **Set User Parameters**
   ```
   Parameter ID | Value
   -------------|----------------
   LANGU        | EN
   DATFM        | 2 (MM/DD/YYYY)
   DCPFM        | X (1,234.56)
   TIMEFM       | 1 (24-hour)
   ```

4. **Assign Roles**
   - Navigate to Roles tab
   - Add roles:
     ```
     SAP_BC_SRV_GEN_USER
     SAP_BC_SRV_ODATA_USER
     Z_MES_INTEGRATION (custom role)
     ```

### Step 2: Configure SAP Gateway

1. **Activate Gateway Services (SICF)**
   ```
   Transaction: SICF
   Path: /default_host/sap/opu/odata/

   Activate services:
   - sap/opu/odata/sap/API_PURCHASEORDER_SRV
   - sap/opu/odata/sap/API_SUPPLIER_SRV
   - sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV
   - sap/opu/odata/sap/API_PRODUCTION_ORDER_SRV
   ```

2. **Configure Gateway Settings (SPRO)**
   ```
   Path: SAP NetWeaver → Gateway → OData Channel → Configuration

   Settings:
   - Enable Soft State: Yes
   - Default Page Size: 100
   - Maximum Page Size: 1000
   - Enable Batch Requests: Yes
   - CSRF Protection: Required
   ```

3. **Set Up Error Log (SLG1)**
   ```
   Transaction: /IWFND/ERROR_LOG

   Configure:
   - Log Level: Error and Warning
   - Retention: 30 days
   - Auto-archive: Enabled
   ```

### Step 3: Create Custom OData Service (Optional)

For custom integration requirements:

1. **Create Service (SEGW)**
   ```
   Transaction: SEGW
   Project: ZMES_INTEGRATION
   Description: MES Integration Services
   ```

2. **Define Entity Types**
   ```xml
   <EntityType Name="OutsourcedOperation">
     <Key>
       <PropertyRef Name="OperationID"/>
     </Key>
     <Property Name="OperationID" Type="Edm.String" MaxLength="12"/>
     <Property Name="WorkOrder" Type="Edm.String" MaxLength="12"/>
     <Property Name="Vendor" Type="Edm.String" MaxLength="10"/>
     <Property Name="Status" Type="Edm.String" MaxLength="4"/>
     <Property Name="Cost" Type="Edm.Decimal" Precision="15" Scale="2"/>
   </EntityType>
   ```

3. **Implement Service Methods**
   ```abap
   METHOD outsourcedoperati_get_entity.
     SELECT SINGLE * FROM zosp_operations
       INTO CORRESPONDING FIELDS OF er_entity
       WHERE operation_id = iv_operation_id.
   ENDMETHOD.
   ```

### Step 4: Configure Change Pointers (BD61)

For real-time data synchronization:

1. **Activate Change Pointers**
   ```
   Transaction: BD61
   Message Type: MATMAS (Material Master)

   Check: ✓ Active
   ```

2. **Configure Distribution Model (BD64)**
   ```
   Model View: MES_INTEGRATION
   Sender: PRD/100
   Receiver: MACHSHOP3
   Message Types: MATMAS, CREMAS, ORDERS
   ```

## MachShop3 Configuration

### Step 1: Access Integration Settings

1. **Login to MachShop3**
   ```
   URL: https://machshop3.company.com
   User: admin
   Role: Administrator
   ```

2. **Navigate to SAP Integration**
   ```
   Settings → Integrations → ERP Systems → Add New
   ```

### Step 2: Configure SAP Connection

1. **Basic Configuration**
   ```json
   {
     "name": "sap-production",
     "erpSystem": "SAP",
     "description": "SAP S/4HANA Production Integration",
     "environment": "Production"
   }
   ```

2. **Connection Settings**
   ```json
   {
     "apiEndpoint": "https://sap-gateway.company.com:8443/sap/opu/odata",
     "apiVersion": "v4",
     "sapClient": "100",
     "sapLanguage": "EN",
     "connectionTimeout": 30000,
     "requestTimeout": 60000,
     "maxRetries": 3
   }
   ```

3. **Service Endpoints**
   ```json
   {
     "services": {
       "purchaseOrder": "/sap/API_PURCHASEORDER_PROCESS_SRV",
       "supplier": "/sap/API_SUPPLIER_SRV",
       "material": "/sap/API_MATERIAL_DOCUMENT_SRV",
       "productionOrder": "/sap/API_PRODUCTION_ORDER_SRV",
       "costCenter": "/sap/API_COSTCENTER_SRV",
       "qualityNotification": "/sap/API_QUALITY_NOTIFICATION_SRV"
     }
   }
   ```

## OData Service Setup

### Understanding SAP OData Services

SAP OData services follow specific conventions:

1. **Service URL Structure**
   ```
   https://{host}:{port}/sap/opu/odata/{namespace}/{service_name}/

   Example:
   https://sap.company.com:8443/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/
   ```

2. **Metadata Document**
   ```
   GET /sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/$metadata
   ```

3. **Entity Sets**
   ```
   Purchase Orders: /A_PurchaseOrder
   PO Items: /A_PurchaseOrderItem
   Suppliers: /A_Supplier
   Materials: /A_Material
   ```

### Configuring Service Access

1. **Test Service Availability**
   ```bash
   # Get service metadata
   curl -u MES_INTEGRATION:password \
     "https://sap.company.com:8443/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/\$metadata" \
     -H "sap-client: 100"
   ```

2. **Verify Entity Access**
   ```bash
   # List purchase orders
   curl -u MES_INTEGRATION:password \
     "https://sap.company.com:8443/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder" \
     -H "sap-client: 100" \
     -H "Accept: application/json"
   ```

### Handling CSRF Tokens

SAP requires CSRF tokens for state-changing operations:

1. **Fetch CSRF Token**
   ```bash
   curl -u MES_INTEGRATION:password \
     "https://sap.company.com:8443/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/" \
     -H "X-CSRF-Token: Fetch" \
     -H "sap-client: 100" \
     -I
   ```

2. **Use Token in POST Request**
   ```bash
   curl -X POST \
     -u MES_INTEGRATION:password \
     "https://sap.company.com:8443/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder" \
     -H "X-CSRF-Token: [token-from-previous-request]" \
     -H "sap-client: 100" \
     -H "Content-Type: application/json" \
     -d '{"PurchaseOrder": "4500000001", ...}'
   ```

## Authentication Configuration

### Option 1: Basic Authentication

1. **Configure in MachShop3**
   ```json
   {
     "authMethod": "BASIC",
     "sapUsername": "MES_INTEGRATION",
     "sapPassword": "[encrypted_password]",
     "sapClient": "100"
   }
   ```

2. **Security Considerations**
   - Use HTTPS only
   - Rotate passwords regularly
   - Monitor failed login attempts

### Option 2: OAuth 2.0

1. **Configure OAuth in SAP**
   ```
   Transaction: SOAUTH2
   Client ID: MES_INTEGRATION_CLIENT
   Scope: API_PURCHASEORDER_PROCESS_SRV API_SUPPLIER_SRV
   Grant Type: Client Credentials
   ```

2. **Configure in MachShop3**
   ```json
   {
     "authMethod": "OAUTH2",
     "tokenEndpoint": "https://sap.company.com:8443/sap/bc/sec/oauth2/token",
     "clientId": "MES_INTEGRATION_CLIENT",
     "clientSecret": "[encrypted_secret]",
     "scope": "API_PURCHASEORDER_PROCESS_SRV API_SUPPLIER_SRV",
     "sapClient": "100"
   }
   ```

### Option 3: Certificate-Based Authentication

1. **Generate Certificate**
   ```bash
   # Generate private key
   openssl genrsa -out mes-integration.key 2048

   # Generate certificate request
   openssl req -new -key mes-integration.key -out mes-integration.csr \
     -subj "/C=US/ST=State/L=City/O=Company/CN=mes-integration"

   # Sign certificate (use company CA)
   openssl x509 -req -in mes-integration.csr -CA ca.crt -CAkey ca.key \
     -CAcreateserial -out mes-integration.crt -days 365
   ```

2. **Import Certificate in SAP (STRUST)**
   ```
   Transaction: STRUST
   PSE: SSL Server Standard
   Import Certificate: mes-integration.crt
   Add to ACL: CN=mes-integration
   ```

3. **Configure in MachShop3**
   ```json
   {
     "authMethod": "CERTIFICATE",
     "clientCertPath": "/certs/mes-integration.crt",
     "clientKeyPath": "/certs/mes-integration.key",
     "sapClient": "100"
   }
   ```

## Field Mapping for SAP

### SAP Field Naming Conventions

SAP uses specific naming patterns:
- CamelCase for OData properties (e.g., `PurchaseOrder`)
- Prefixes: A_ for API entities, C_ for custom fields
- Date format: `/Date(timestamp)/` or `YYYY-MM-DD`
- Amount fields include currency code

### Purchase Order Field Mappings

```json
{
  "entityType": "PurchaseOrder",
  "sapEntitySet": "A_PurchaseOrder",
  "mappings": [
    {
      "mesField": "poNumber",
      "sapField": "PurchaseOrder",
      "dataType": "string",
      "length": 10,
      "isRequired": true,
      "transformation": "value.padStart(10, '0')"
    },
    {
      "mesField": "vendorId",
      "sapField": "Supplier",
      "dataType": "string",
      "length": 10,
      "isRequired": true,
      "transformation": "value.padStart(10, '0')"
    },
    {
      "mesField": "poDate",
      "sapField": "PurchaseOrderDate",
      "dataType": "date",
      "isRequired": true,
      "transformation": "value.toISOString().split('T')[0]"
    },
    {
      "mesField": "totalAmount",
      "sapField": "NetAmount",
      "dataType": "decimal",
      "precision": 13,
      "scale": 2,
      "isRequired": true
    },
    {
      "mesField": "currency",
      "sapField": "DocumentCurrency",
      "dataType": "string",
      "length": 5,
      "isRequired": true,
      "defaultValue": "USD"
    },
    {
      "mesField": "status",
      "sapField": "PurchasingProcessingStatus",
      "dataType": "string",
      "isRequired": false,
      "transformation": "{'DRAFT': '01', 'APPROVED': '02', 'ORDERED': '03', 'DELIVERED': '04', 'INVOICED': '05', 'CLOSED': '06'}[value]"
    },
    {
      "mesField": "companyCode",
      "sapField": "CompanyCode",
      "dataType": "string",
      "length": 4,
      "isRequired": true,
      "defaultValue": "1000"
    },
    {
      "mesField": "purchasingOrg",
      "sapField": "PurchasingOrganization",
      "dataType": "string",
      "length": 4,
      "isRequired": true,
      "defaultValue": "1000"
    },
    {
      "mesField": "purchasingGroup",
      "sapField": "PurchasingGroup",
      "dataType": "string",
      "length": 3,
      "isRequired": true,
      "defaultValue": "001"
    }
  ]
}
```

### Purchase Order Item Field Mappings

```json
{
  "entityType": "PurchaseOrderItem",
  "sapEntitySet": "A_PurchaseOrderItem",
  "mappings": [
    {
      "mesField": "lineNumber",
      "sapField": "PurchaseOrderItem",
      "dataType": "string",
      "length": 5,
      "isRequired": true,
      "transformation": "String(value).padStart(5, '0')"
    },
    {
      "mesField": "materialNumber",
      "sapField": "Material",
      "dataType": "string",
      "length": 18,
      "isRequired": true,
      "transformation": "value.padStart(18, '0')"
    },
    {
      "mesField": "description",
      "sapField": "PurchaseOrderItemText",
      "dataType": "string",
      "length": 40,
      "isRequired": false
    },
    {
      "mesField": "quantity",
      "sapField": "OrderQuantity",
      "dataType": "decimal",
      "precision": 13,
      "scale": 3,
      "isRequired": true
    },
    {
      "mesField": "unitOfMeasure",
      "sapField": "PurchaseOrderQuantityUnit",
      "dataType": "string",
      "length": 3,
      "isRequired": true,
      "transformation": "value.toUpperCase()"
    },
    {
      "mesField": "unitPrice",
      "sapField": "NetPriceAmount",
      "dataType": "decimal",
      "precision": 11,
      "scale": 2,
      "isRequired": true
    },
    {
      "mesField": "deliveryDate",
      "sapField": "ScheduleLineDeliveryDate",
      "dataType": "date",
      "isRequired": false,
      "transformation": "value ? value.toISOString().split('T')[0] : null"
    },
    {
      "mesField": "plant",
      "sapField": "Plant",
      "dataType": "string",
      "length": 4,
      "isRequired": true,
      "defaultValue": "1000"
    },
    {
      "mesField": "storageLocation",
      "sapField": "StorageLocation",
      "dataType": "string",
      "length": 4,
      "isRequired": false,
      "defaultValue": "0001"
    }
  ]
}
```

### Supplier/Vendor Field Mappings

```json
{
  "entityType": "Supplier",
  "sapEntitySet": "A_Supplier",
  "mappings": [
    {
      "mesField": "vendorCode",
      "sapField": "Supplier",
      "dataType": "string",
      "length": 10,
      "isRequired": true,
      "transformation": "value.padStart(10, '0')"
    },
    {
      "mesField": "vendorName",
      "sapField": "SupplierName",
      "dataType": "string",
      "length": 80,
      "isRequired": true
    },
    {
      "mesField": "searchTerm",
      "sapField": "SearchTerm",
      "dataType": "string",
      "length": 20,
      "isRequired": false,
      "transformation": "value.substring(0, 20).toUpperCase()"
    },
    {
      "mesField": "address",
      "sapField": "StreetAddressName",
      "dataType": "string",
      "length": 60,
      "isRequired": false
    },
    {
      "mesField": "city",
      "sapField": "CityName",
      "dataType": "string",
      "length": 40,
      "isRequired": false
    },
    {
      "mesField": "postalCode",
      "sapField": "PostalCode",
      "dataType": "string",
      "length": 10,
      "isRequired": false
    },
    {
      "mesField": "country",
      "sapField": "Country",
      "dataType": "string",
      "length": 3,
      "isRequired": false,
      "defaultValue": "US"
    },
    {
      "mesField": "taxNumber",
      "sapField": "TaxNumber1",
      "dataType": "string",
      "length": 16,
      "isRequired": false
    },
    {
      "mesField": "paymentTerms",
      "sapField": "SupplierPaymentTerms",
      "dataType": "string",
      "length": 4,
      "isRequired": false,
      "transformation": "{'NET30': '0001', 'NET60': '0002', 'COD': '0003', '2/10NET30': '0004'}[value] || '0001'"
    }
  ]
}
```

### Material Document Field Mappings

```json
{
  "entityType": "MaterialDocument",
  "sapEntitySet": "A_MaterialDocument",
  "mappings": [
    {
      "mesField": "movementType",
      "sapField": "GoodsMovementCode",
      "dataType": "string",
      "length": 2,
      "isRequired": true,
      "transformation": "{'RECEIPT': '01', 'ISSUE': '02', 'TRANSFER': '03'}[value] || '01'"
    },
    {
      "mesField": "postingDate",
      "sapField": "PostingDate",
      "dataType": "date",
      "isRequired": true
    },
    {
      "mesField": "documentDate",
      "sapField": "DocumentDate",
      "dataType": "date",
      "isRequired": true
    },
    {
      "mesField": "material",
      "sapField": "Material",
      "dataType": "string",
      "length": 18,
      "isRequired": true,
      "transformation": "value.padStart(18, '0')"
    },
    {
      "mesField": "quantity",
      "sapField": "QuantityInEntryUnit",
      "dataType": "decimal",
      "precision": 13,
      "scale": 3,
      "isRequired": true
    },
    {
      "mesField": "plant",
      "sapField": "Plant",
      "dataType": "string",
      "length": 4,
      "isRequired": true
    },
    {
      "mesField": "storageLocation",
      "sapField": "StorageLocation",
      "dataType": "string",
      "length": 4,
      "isRequired": true
    },
    {
      "mesField": "batch",
      "sapField": "Batch",
      "dataType": "string",
      "length": 10,
      "isRequired": false
    }
  ]
}
```

## Testing the Integration

### Step 1: Validate Connection

1. **Test Basic Connectivity**
   ```bash
   # Test SAP Gateway availability
   curl -I https://sap.company.com:8443/sap/opu/odata/ \
     -u MES_INTEGRATION:password \
     -H "sap-client: 100"
   ```

2. **Verify Service Access**
   ```bash
   # Get service document
   curl https://sap.company.com:8443/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/ \
     -u MES_INTEGRATION:password \
     -H "sap-client: 100" \
     -H "Accept: application/json"
   ```

### Step 2: Test Data Retrieval

1. **Fetch Purchase Orders**
   ```bash
   curl "https://sap.company.com:8443/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder?\$top=10" \
     -u MES_INTEGRATION:password \
     -H "sap-client: 100" \
     -H "Accept: application/json"
   ```

2. **Test Filtering**
   ```bash
   # Get POs for specific vendor
   curl "https://sap.company.com:8443/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder?\$filter=Supplier%20eq%20'0000100000'" \
     -u MES_INTEGRATION:password \
     -H "sap-client: 100" \
     -H "Accept: application/json"
   ```

### Step 3: Test Data Creation

1. **Create Test Purchase Order**
   ```bash
   # Get CSRF token
   TOKEN=$(curl -s -I \
     https://sap.company.com:8443/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/ \
     -u MES_INTEGRATION:password \
     -H "X-CSRF-Token: Fetch" \
     -H "sap-client: 100" | grep "x-csrf-token:" | cut -d' ' -f2)

   # Create PO
   curl -X POST \
     https://sap.company.com:8443/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder \
     -u MES_INTEGRATION:password \
     -H "X-CSRF-Token: $TOKEN" \
     -H "sap-client: 100" \
     -H "Content-Type: application/json" \
     -d '{
       "CompanyCode": "1000",
       "PurchaseOrderType": "NB",
       "Supplier": "0000100000",
       "PurchasingOrganization": "1000",
       "PurchasingGroup": "001",
       "DocumentCurrency": "USD"
     }'
   ```

### Step 4: Test Batch Operations

1. **Create Batch Request**
   ```http
   POST /sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/$batch
   Content-Type: multipart/mixed; boundary=batch_boundary

   --batch_boundary
   Content-Type: application/http
   Content-Transfer-Encoding: binary

   GET A_PurchaseOrder('4500000001') HTTP/1.1
   Accept: application/json

   --batch_boundary
   Content-Type: application/http
   Content-Transfer-Encoding: binary

   GET A_PurchaseOrderItem?$filter=PurchaseOrder eq '4500000001' HTTP/1.1
   Accept: application/json

   --batch_boundary--
   ```

### Step 5: Test Error Handling

1. **Test Invalid Request**
   ```bash
   # Send invalid PO number format
   curl -X GET \
     "https://sap.company.com:8443/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder('INVALID')" \
     -u MES_INTEGRATION:password \
     -H "sap-client: 100" \
     -H "Accept: application/json"
   ```

2. **Verify Error Response**
   ```json
   {
     "error": {
       "code": "CX_SD_MESSAGE",
       "message": {
         "lang": "en",
         "value": "Purchase order INVALID does not exist"
       }
     }
   }
   ```

## Production Deployment

### Pre-Production Checklist

#### SAP Preparation
- [ ] Production client configured
- [ ] Integration user created with production authorizations
- [ ] OData services activated in production
- [ ] Change pointers configured for real-time sync
- [ ] Performance parameters optimized
- [ ] Monitoring configured in Solution Manager

#### MachShop3 Preparation
- [ ] Production configuration tested in QA
- [ ] SSL certificates valid for production
- [ ] Connection pooling configured
- [ ] Retry logic tested
- [ ] Error handling validated
- [ ] Monitoring and alerting configured

### Deployment Process

1. **Export Configuration from QA**
   ```bash
   npm run erp:export:config \
     --integration=sap-qa \
     --file=sap-config-qa.json
   ```

2. **Update for Production**
   ```json
   {
     "apiEndpoint": "https://sap-prd.company.com:8443/sap/opu/odata",
     "sapClient": "100",
     "sapUsername": "MES_INTEGRATION_PRD"
   }
   ```

3. **Deploy Configuration**
   ```bash
   npm run erp:import:config \
     --file=sap-config-prd.json \
     --env=production \
     --validate
   ```

4. **Run Initial Sync**
   ```bash
   # Start with master data
   npm run erp:sync:initial \
     --integration=sap-production \
     --entities=Supplier,Material \
     --validate

   # Then transactional data
   npm run erp:sync:initial \
     --integration=sap-production \
     --entities=PurchaseOrder,ProductionOrder \
     --validate
   ```

### Performance Optimization

1. **Configure Connection Pool**
   ```json
   {
     "connectionPool": {
       "maxSize": 20,
       "minSize": 5,
       "acquireTimeout": 30000,
       "idleTimeout": 600000,
       "validateOnBorrow": true
     }
   }
   ```

2. **Optimize Batch Sizes**
   ```json
   {
     "batchSizes": {
       "supplier": 50,
       "material": 100,
       "purchaseOrder": 25,
       "productionOrder": 20,
       "materialDocument": 50
     }
   }
   ```

3. **Enable Caching**
   ```json
   {
     "caching": {
       "metadata": {
         "ttl": 86400,
         "enabled": true
       },
       "masterData": {
         "ttl": 3600,
         "enabled": true
       }
     }
   }
   ```

## SAP-Specific Troubleshooting

### Issue 1: CSRF Token Errors

**Error**: `403 Forbidden: CSRF token validation failed`

**Solution**:
```javascript
// Implement token refresh
async function getCSRFToken() {
  const response = await fetch(baseUrl, {
    method: 'HEAD',
    headers: {
      'X-CSRF-Token': 'Fetch',
      'sap-client': sapClient
    }
  });
  return response.headers.get('x-csrf-token');
}

// Use fresh token for each state-changing operation
const token = await getCSRFToken();
```

### Issue 2: German Decimal Format

**Error**: `Invalid number format: 1.234,56`

**Solution**:
```javascript
// Convert SAP decimal format to standard
function convertSAPNumber(sapNumber) {
  return parseFloat(
    sapNumber.toString()
      .replace('.', '')
      .replace(',', '.')
  );
}
```

### Issue 3: Date Format Issues

**Error**: `Invalid date format: /Date(1642464000000)/`

**Solution**:
```javascript
// Parse SAP date format
function parseSAPDate(sapDate) {
  const match = sapDate.match(/\/Date\((\d+)\)\//);
  if (match) {
    return new Date(parseInt(match[1]));
  }
  return new Date(sapDate);
}

// Format date for SAP
function formatSAPDate(date) {
  return `/Date(${date.getTime()})/`;
}
```

### Issue 4: Authorization Errors

**Error**: `401 Unauthorized: User MES_INTEGRATION lacks authorization`

**Solution**:
1. Check authorization in SU53:
   ```
   Transaction: SU53
   User: MES_INTEGRATION
   ```

2. Add missing authorizations:
   ```
   Transaction: PFCG
   Role: Z_MES_INTEGRATION
   Add Authorization: S_SERVICE
   Service: API_PURCHASEORDER_PROCESS_SRV
   Activity: 03 (Display), 02 (Change)
   ```

### Issue 5: Lock Conflicts

**Error**: `Purchase order 4500000001 is locked by user SMITH`

**Solution**:
```javascript
// Implement retry with exponential backoff
async function retryOnLock(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'LOCKED' && i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

### Issue 6: Performance Issues

**Symptoms**: Slow response times, timeouts

**Solutions**:

1. **Use $select to limit fields**:
   ```
   GET /A_PurchaseOrder?$select=PurchaseOrder,Supplier,NetAmount
   ```

2. **Implement pagination**:
   ```
   GET /A_PurchaseOrder?$top=50&$skip=0
   ```

3. **Use $expand carefully**:
   ```
   GET /A_PurchaseOrder?$expand=PurchaseOrderItem($select=Material,OrderQuantity)
   ```

4. **Enable compression**:
   ```javascript
   headers: {
     'Accept-Encoding': 'gzip, deflate'
   }
   ```

## Reference

### SAP OData Service URLs

```
Base: https://sap.company.com:8443/sap/opu/odata

Core Services:
/sap/API_PURCHASEORDER_PROCESS_SRV    - Purchase Orders
/sap/API_SUPPLIER_SRV                  - Suppliers/Vendors
/sap/API_MATERIAL_DOCUMENT_SRV         - Material Movements
/sap/API_PRODUCT_SRV                   - Material Master
/sap/API_PRODUCTION_ORDER_SRV          - Production Orders
/sap/API_QUALITY_NOTIFICATION_SRV      - Quality Notifications
/sap/API_COSTCENTER_SRV               - Cost Centers
/sap/API_MAINTENANCE_ORDER_SRV         - Maintenance Orders
```

### Common SAP Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| EKKO | Purchase Order Header | EBELN (PO Number) |
| EKPO | Purchase Order Item | EBELN, EBELP |
| LFA1 | Vendor Master | LIFNR (Vendor) |
| MARA | Material Master | MATNR (Material) |
| MKPF | Material Document Header | MBLNR, MJAHR |
| MSEG | Material Document Item | MBLNR, MJAHR, ZEILE |
| AFKO | Production Order Header | AUFNR (Order) |

### SAP Transaction Codes

| T-Code | Description | Use Case |
|--------|-------------|----------|
| SE80 | Object Navigator | View OData services |
| SEGW | Gateway Service Builder | Create/modify services |
| /IWFND/MAINT_SERVICE | Gateway Service Maintenance | Activate services |
| /IWFND/ERROR_LOG | Gateway Error Log | Troubleshoot errors |
| SU01 | User Maintenance | Manage integration user |
| PFCG | Role Maintenance | Configure authorizations |
| SM59 | RFC Destinations | Configure connections |
| SOAMANAGER | SOA Manager | Web service configuration |
| SLG1 | Application Log | View integration logs |
| ST22 | Runtime Errors | Check for dumps |

### SAP Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| CX_BAPI_ERROR | BAPI call failed | Check BAPI return messages |
| CX_ST22_RUNTIME_ERROR | ABAP runtime error | Check ST22 for dump analysis |
| /IWBEP/CX_MGW_BUSI_EXCEPTION | Business logic error | Review business rules |
| /IWBEP/CX_MGW_TECH_EXCEPTION | Technical error | Check gateway configuration |
| CX_SY_AUTHORIZATION | Authorization missing | Add required authorizations |
| CX_SY_CONVERSION_ERROR | Data conversion error | Check field mappings |
| CX_SY_FOREIGN_LOCK | Object locked | Implement retry logic |

### Useful ABAP Code Snippets

#### Custom BAPI for OSP Operations
```abap
FUNCTION Z_MES_CREATE_OSP_OPERATION.
  DATA: ls_operation TYPE zosp_operation,
        lv_po_number TYPE ebeln.

  " Create purchase order for OSP operation
  CALL FUNCTION 'BAPI_PO_CREATE1'
    EXPORTING
      poheader = ls_poheader
    IMPORTING
      exppurchaseorder = lv_po_number
    TABLES
      poitem = lt_poitem
      return = lt_return.

  IF lt_return IS INITIAL.
    CALL FUNCTION 'BAPI_TRANSACTION_COMMIT'.
    ev_po_number = lv_po_number.
  ELSE.
    CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
    RAISE EXCEPTION TYPE zcx_mes_error.
  ENDIF.
ENDFUNCTION.
```

### Performance Tuning Parameters

```json
{
  "performance": {
    "maxParallelRequests": 5,
    "requestTimeout": 60000,
    "keepAlive": true,
    "compression": "gzip",
    "cacheMetadata": true,
    "batchRequestSize": 50,
    "useDeltaQueries": true,
    "enableChangeTracking": true
  }
}
```

## Support Resources

### Documentation
- SAP Help Portal: https://help.sap.com/docs/SAP_S4HANA
- SAP API Business Hub: https://api.sap.com
- OData.org: https://www.odata.org/documentation/

### SAP Support
- SAP Support Portal: https://support.sap.com
- SAP Community: https://community.sap.com
- SAP Notes: https://launchpad.support.sap.com

### Training
- openSAP: https://open.sap.com
- SAP Learning Hub: https://learninghub.sap.com
- YouTube: SAP Technology channel

### Tools
- SAP Gateway Client (/IWFND/GW_CLIENT)
- Postman Collection for SAP APIs
- SAP Cloud Platform Integration
- SAP Process Integration/Orchestration

For additional support, contact:
- SAP Support: support@sap.com
- MachShop3 Integration Team: integration@machshop3.com
- Community Forum: https://forum.machshop3.com/sap-integration