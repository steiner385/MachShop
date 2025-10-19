# ERP/PLM Integration Guide

**Version:** 1.0
**Last Updated:** October 15, 2025
**Phase:** Phase 1 - Sprint 5

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Oracle Fusion Cloud ERP Integration](#oracle-fusion-cloud-erp-integration)
4. [Oracle E-Business Suite (EBS) Integration](#oracle-e-business-suite-ebs-integration)
5. [Siemens Teamcenter PLM Integration](#siemens-teamcenter-plm-integration)
6. [API Reference](#api-reference)
7. [Configuration Management](#configuration-management)
8. [Monitoring and Health Checks](#monitoring-and-health-checks)
9. [Troubleshooting](#troubleshooting)
10. [Security Best Practices](#security-best-practices)

---

## Overview

The MES Integration Framework provides bi-directional synchronization between the Manufacturing Execution System (MES) and enterprise systems including ERP (Enterprise Resource Planning) and PLM (Product Lifecycle Management) platforms.

### Supported Integrations

| System | Type | Version | Authentication | Protocol |
|--------|------|---------|----------------|----------|
| **Oracle Fusion Cloud ERP** | ERP | Cloud (21C+) | OAuth 2.0 | REST API |
| **Oracle E-Business Suite** | ERP | R12.1+, R12.2+ | Basic/Session | ISG REST |
| **Siemens Teamcenter** | PLM | 11.x, 12.x, 13.x | Session-based | SOA REST |

### Integration Capabilities

#### Oracle Fusion Cloud ERP
- **Inbound:** Item master data, BOM structures, work order creation
- **Outbound:** Production confirmations, inventory transactions, quality results
- **Real-time:** Webhook events for item/BOM changes

#### Oracle E-Business Suite (EBS)
- **Inbound:** Work orders (WIP), item master (INV), BOM structures
- **Outbound:** Production completions, move transactions, material issues
- **Batch:** Scheduled synchronization (configurable intervals)

#### Siemens Teamcenter PLM
- **Inbound:** Item/part master data, multi-level BOMs, engineering changes (ECOs)
- **Outbound:** As-built configurations, manufacturing feedback
- **Features:** Manufacturing vs Engineering BOM views, revision rules

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MES Application                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          Integration Manager                        │    │
│  │  - Job Scheduling (node-cron)                       │    │
│  │  - Health Monitoring                                │    │
│  │  - Configuration Management                         │    │
│  │  - Encryption (AES-256-CBC)                         │    │
│  └────────┬────────────┬─────────────┬──────────────────┘    │
│           │            │             │                       │
│  ┌────────▼───────┐ ┌──▼──────────┐ ┌▼──────────────────┐   │
│  │ Oracle Fusion  │ │ Oracle EBS  │ │ Teamcenter PLM    │   │
│  │ Adapter        │ │ Adapter     │ │ Adapter           │   │
│  │ - OAuth 2.0    │ │ - Basic/    │ │ - Session Mgmt    │   │
│  │ - Token Refresh│ │   Session   │ │ - Multi-level BOM │   │
│  │ - Webhooks     │ │ - ISG REST  │ │ - SOA Services    │   │
│  └────────┬───────┘ └──┬──────────┘ └┬──────────────────┘   │
└───────────┼────────────┼─────────────┼──────────────────────┘
            │            │             │
            │   HTTPS    │   HTTPS     │   HTTPS
            │            │             │
┌───────────▼────────────▼─────────────▼──────────────────────┐
│              External Enterprise Systems                     │
│  ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Oracle Fusion   │ │ Oracle EBS   │ │ Teamcenter PLM   │  │
│  │ Cloud           │ │ (On-Premises)│ │ (On-Premises)    │  │
│  └─────────────────┘ └──────────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Inbound (External System → MES)
1. Scheduled job triggers sync operation
2. Adapter authenticates with external system
3. Data retrieved via REST API (items, BOMs, work orders)
4. Data transformed using mapping functions
5. Data persisted to MES database (Prisma ORM)
6. Integration log created with statistics

#### Outbound (MES → External System)
1. MES operation triggers outbound event (e.g., production completion)
2. Adapter retrieves work order from MES database
3. Data transformed to external system format
4. API request sent to external system
5. Response validated and logged
6. MES records updated with external transaction ID

### Scheduled Jobs

| Job Type | Schedule | Description |
|----------|----------|-------------|
| **Item Sync** | Daily at 2:00 AM | Synchronize item master data |
| **BOM Sync** | Daily at 3:00 AM | Synchronize BOM structures |
| **Work Order Sync** | Every 15 minutes | Retrieve new/updated work orders (ERP only) |
| **Health Check** | Every 5 minutes | Verify system connectivity and health |

---

## Oracle Fusion Cloud ERP Integration

### Prerequisites

#### Oracle Cloud Infrastructure (OCI) Setup
1. **OCI Account** with Fusion Cloud ERP subscription
2. **Oracle Integration Cloud (OIC)** instance (optional but recommended)
3. **OAuth 2.0 Application** registered in OCI Identity Cloud Service (IDCS)

#### Required Scopes
- `urn:opc:resource:fa` - Fusion Applications REST API access
- `urn:opc:resource:consumer::all` - Full resource access

#### Fusion Modules Required
- **SCM (Supply Chain Management)** - Item and BOM management
- **MFG (Manufacturing)** - Work order management
- **INV (Inventory)** - Inventory transactions

### Configuration Steps

#### Step 1: Create OAuth 2.0 Application in IDCS

1. Log in to **Oracle Identity Cloud Service (IDCS)**
2. Navigate to **Applications** → **Add**
3. Select **Confidential Application**
4. Configure application:
   - **Name:** `MES Integration`
   - **Description:** `MES to Fusion ERP Integration`
5. Click **Next** → **Configure OAuth**
6. Select **Resource Owner** and **Client Credentials**
7. Add **Scopes:**
   ```
   urn:opc:resource:fa:instanceid=<YOUR_FA_INSTANCE_ID>
   urn:opc:resource:consumer::all
   ```
8. Set **Redirect URL:** `https://your-mes-domain.com/callback` (if using authorization code flow)
9. Click **Finish**
10. **Save Client ID and Client Secret** (you won't see the secret again)

#### Step 2: Obtain Token Endpoint URL

The token URL format is:
```
https://<IDCS_TENANT>.identity.oraclecloud.com/oauth2/v1/token
```

Example:
```
https://idcs-abc123.identity.oraclecloud.com/oauth2/v1/token
```

#### Step 3: Configure Integration in MES

1. Log in to MES as **Plant Manager** or **System Admin**
2. Navigate to **Integrations** → **Configuration**
3. Click **Add Integration**
4. Select **Oracle Fusion Cloud ERP**
5. Fill in configuration:

**Basic Settings:**
```yaml
Name: oracle_fusion_prod
Display Name: Oracle Fusion Production
Enabled: true
```

**Connection Settings:**
```yaml
OIC Base URL: https://your-instance.oic.oraclecloud.com
Fusion Base URL: https://your-instance.fa.oraclecloud.com
Client ID: <YOUR_CLIENT_ID>
Client Secret: <YOUR_CLIENT_SECRET>
Token URL: https://idcs-abc123.identity.oraclecloud.com/oauth2/v1/token
Scopes: urn:opc:resource:fa:instanceid=<FA_INSTANCE_ID>
```

**Sync Settings:**
```yaml
Sync Interval: 60 (minutes)
Batch Size: 100 (records per batch)
Timeout: 30000 (milliseconds)
Retry Attempts: 3
Retry Delay: 1000 (milliseconds)
```

**Webhook Settings:**
```yaml
Webhook Secret: <GENERATE_STRONG_SECRET>
```

6. Click **Test Connection** to verify configuration
7. Click **Save**

#### Step 4: Configure Webhooks in Fusion (Optional)

For real-time synchronization, configure webhooks in Oracle Integration Cloud:

1. Log in to **Oracle Integration Cloud (OIC)**
2. Create new **Integration Flow**
3. Add **Trigger:** REST API endpoint
4. Configure **Business Events:**
   - `oracle.apps.scm.items.itemCreated`
   - `oracle.apps.scm.items.itemUpdated`
   - `oracle.apps.scm.bom.bomCreated`
   - `oracle.apps.scm.bom.bomUpdated`
5. Add **Action:** HTTP POST to MES webhook endpoint
   ```
   POST https://your-mes-domain.com/api/v1/integrations/oracle_fusion_prod/webhook
   ```
6. Add **Signature Header:**
   - Header Name: `X-Hub-Signature-256`
   - Value: HMAC-SHA256 signature of request body using webhook secret

### API Endpoints Used

#### Item Master Data
```http
GET /fscmRestApi/resources/11.13.18.05/itemsV2
```

**Query Parameters:**
- `organizationCode` - Manufacturing organization (e.g., "M1", "M2")
- `itemClass` - Filter by item class (Root, Purchased, Manufactured, Model)
- `finder` - Use finder query (e.g., "findByLastUpdateDate;LastUpdateDate>=2024-01-01")
- `limit` - Records per page (default 100)
- `offset` - Pagination offset

**Response Fields:**
- `ItemNumber` → MES `partNumber`
- `ItemDescription` → MES `partName`
- `ItemClass` → MES `partType` (via mapping)
- `PrimaryUOMCode` → MES `unitOfMeasure`

#### BOM Structures
```http
GET /fscmRestApi/resources/11.13.18.05/billsOfMaterials
```

**Query Parameters:**
- `assemblyItemNumber` - Parent item number
- `organizationCode` - Manufacturing organization
- `limit` - Records per page

**Response Fields:**
- `AssemblyItemNumber` → Parent part
- `BOMComponents` → Component array
  - `ComponentItemNumber` → Child part
  - `ComponentQuantity` → Quantity per assembly
  - `ComponentUOM` → Unit of measure

#### Production Completions (Outbound)
```http
POST /fscmRestApi/resources/11.13.18.05/workOrderCompletions
```

**Request Body:**
```json
{
  "WorkOrderNumber": "WO-001",
  "CompletedQuantity": 100,
  "ScrapQuantity": 2,
  "CompletionDate": "2024-10-15T10:30:00Z",
  "TransactionType": "COMPLETION"
}
```

### Data Mapping

#### Item Class Mapping
```typescript
const itemClassMapping: Record<string, string> = {
  'Root': 'ASSEMBLY',
  'Purchased': 'COMPONENT',
  'Manufactured': 'ASSEMBLY',
  'Model': 'MODEL',
  'default': 'COMPONENT'
};
```

### Example: Manual Item Sync via API

```bash
curl -X POST https://your-mes-domain.com/api/v1/integrations/oracle_fusion_prod/sync \
  -H "Authorization: Bearer YOUR_MES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "sync_items",
    "filters": {
      "organizationCode": "M1",
      "itemClass": "Manufactured",
      "modifiedSince": "2024-10-01T00:00:00Z"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "recordsProcessed": 45,
  "recordsCreated": 10,
  "recordsUpdated": 35,
  "recordsFailed": 0,
  "errors": [],
  "duration": 2340
}
```

---

## Oracle E-Business Suite (EBS) Integration

### Prerequisites

#### EBS Setup Requirements
1. **Oracle E-Business Suite R12.1 or R12.2**
2. **Integrated SOA Gateway (ISG)** enabled and configured
3. **REST Services** deployed for:
   - Work In Process (WIP) module
   - Inventory (INV) module
   - Bill of Materials (BOM) module
   - Purchase Orders (PO) module (optional)

#### Required Responsibilities
- `Manufacturing User` - Work order access
- `Inventory User` - Item access
- `BOM User` - BOM access

#### Database Patches
Ensure these patches are applied:
- **Patch 12345678** - ISG REST Services for WIP
- **Patch 87654321** - JSON support for ISG

### Configuration Steps

#### Step 1: Enable ISG REST Services in EBS

1. Log in to EBS as **System Administrator**
2. Navigate to **Integrated SOA Gateway** → **Administration**
3. Deploy REST services:
   - `WIP_MOVE_INTERFACE` - Work order move transactions
   - `MTL_SYSTEM_ITEMS` - Item master data
   - `BOM_BILL_OF_MATERIALS` - BOM structures
4. Set **REST Service Base URL:**
   ```
   https://ebs.company.com:8000/webservices/rest
   ```

#### Step 2: Create Integration User

1. Navigate to **System Administrator** → **User** → **Define**
2. Create user: `MES_INTEGRATION`
3. Assign responsibilities:
   - `Manufacturing User`
   - `Inventory User`
   - `BOM User`
4. Set password and note credentials

#### Step 3: Configure Integration in MES

1. Log in to MES as **Plant Manager** or **System Admin**
2. Navigate to **Integrations** → **Configuration**
3. Click **Add Integration**
4. Select **Oracle E-Business Suite (EBS)**
5. Fill in configuration:

**Basic Settings:**
```yaml
Name: oracle_ebs_prod
Display Name: Oracle EBS Production
Enabled: true
```

**Connection Settings:**
```yaml
EBS Base URL: https://ebs.company.com:8000
ISG REST Path: /webservices/rest
EBS Version: R12.2
Username: MES_INTEGRATION
Password: <SECURE_PASSWORD>
```

**Authentication:**
```yaml
Auth Type: SESSION  # or BASIC
```

**Context Settings:**
```yaml
Responsibility: Manufacturing User
Responsibility Application: WIP
Security Group: STANDARD
Organization ID: 101  # Your manufacturing org ID
```

**Module Configuration:**
```yaml
Modules:
  WIP (Work In Process): enabled
  INV (Inventory): enabled
  BOM (Bill of Materials): enabled
  PO (Purchase Orders): disabled
```

**Sync Settings:**
```yaml
Sync Interval: 15 (minutes for work orders)
Batch Size: 50
Timeout: 45000
Retry Attempts: 3
Retry Delay: 2000
```

6. Click **Test Connection**
7. Click **Save**

### API Endpoints Used

#### Work Orders (WIP)
```http
GET /webservices/rest/WIP_MOVE_INTERFACE/work_orders/
```

**Query Parameters:**
- `organization_id` - Manufacturing organization ID
- `status_type` - Work order status (1=Released, 3=Complete, 4=Complete-No Charges, 5=On Hold, 7=Closed)
- `last_update_date` - Filter by modification date

**Response Fields:**
- `wip_entity_id` → External system ID
- `wip_entity_name` → MES `workOrderNumber`
- `primary_item_id` → Part reference
- `start_quantity` → Order quantity
- `quantity_completed` → Completed quantity
- `quantity_scrapped` → Scrap quantity
- `status_type` → MES status (via mapping)
- `scheduled_start_date` → Start date
- `scheduled_completion_date` → Due date

#### Item Master (INV)
```http
GET /webservices/rest/MTL_SYSTEM_ITEMS/items/
```

**Query Parameters:**
- `organization_id` - Inventory organization
- `inventory_item_id` - Specific item ID (optional)

**Response Fields:**
- `segment1` → MES `partNumber`
- `description` → MES `partName`
- `primary_uom_code` → MES `unitOfMeasure`
- `inventory_item_id` → External reference

#### BOM Structures (BOM)
```http
GET /webservices/rest/BOM_BILL_OF_MATERIALS/bom_structures/
```

**Query Parameters:**
- `assembly_item_id` - Parent item ID
- `organization_id` - Organization ID
- `alternate_bom_designator` - Alternate BOM (optional)

**Response Fields:**
- `bill_sequence_id` → BOM ID
- `assembly_item_id` → Parent part
- `component_item_id` → Child part
- `component_quantity` → Quantity per assembly
- `operation_seq_num` → Operation sequence

#### Production Move Transaction (Outbound)
```http
POST /webservices/rest/WIP_MOVE_INTERFACE/move_transactions/
```

**Request Body:**
```json
{
  "group_id": 12345,
  "transaction_type": 1,
  "organization_id": 101,
  "wip_entity_id": 67890,
  "primary_item_id": 54321,
  "fm_operation_seq_num": 10,
  "to_operation_seq_num": 20,
  "transaction_quantity": 100,
  "transaction_date": "2024-10-15",
  "reason_id": null,
  "reference": "MES Production Completion"
}
```

### Data Mapping

#### Status Mapping (EBS → MES)
```typescript
const statusMapping: Record<number, string> = {
  1: 'RELEASED',      // Released
  3: 'COMPLETED',     // Complete
  4: 'COMPLETED',     // Complete - No Charges
  5: 'ON_HOLD',       // On Hold
  7: 'CLOSED',        // Closed
  12: 'CANCELLED',    // Cancelled
  6: 'PENDING',       // Pending
  17: 'CREATED'       // Unreleased
};
```

### Example: Work Order Sync

```bash
curl -X POST https://your-mes-domain.com/api/v1/integrations/oracle_ebs_prod/sync \
  -H "Authorization: Bearer YOUR_MES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "sync_workorders",
    "filters": {
      "organizationId": 101,
      "statusType": 1,
      "modifiedSince": "2024-10-15T00:00:00Z"
    }
  }'
```

---

## Siemens Teamcenter PLM Integration

### Prerequisites

#### Teamcenter Setup Requirements
1. **Siemens Teamcenter 11.x, 12.x, or 13.x**
2. **SOA (Service-Oriented Architecture)** REST services enabled
3. **Active Workspace** (optional, for testing)

#### Required Modules
- **Item Management** - Part master data
- **BOM Management** - Multi-level BOM structures
- **Change Management** (optional) - ECO/ECN integration

#### Required Privileges
Create a Teamcenter user with these privileges:
- `READ` on Item
- `READ` on BOMLine
- `READ` on ItemRevision
- `EXPORT` privilege (for data extraction)

#### Teamcenter Groups
- Group: `MES_Integration`
- Role: `Designer` or `Manufacturing Engineer`

### Configuration Steps

#### Step 1: Enable SOA REST Services

1. Log in to Teamcenter **System Administration**
2. Navigate to **Preferences** → **TC_SOA_Preferences**
3. Enable REST services:
   - `SOA_REST_enabled` = `true`
   - `SOA_REST_port` = `8080` (or your configured port)
4. Restart Teamcenter services

#### Step 2: Create Integration User

1. Navigate to **Organization** → **User**
2. Create user: `mes_integration`
3. Assign to group: `MES_Integration`
4. Set password and note credentials

#### Step 3: Configure BOM Views

Teamcenter uses BOM views to separate manufacturing and engineering BOMs:

1. Navigate to **Structure Manager**
2. Create/verify BOM views:
   - **Manufacturing BOM** - View used by MES (e.g., `MfgBOMView`)
   - **Engineering BOM** - Design BOM (e.g., `EngBOMView`)
3. Note view names for configuration

#### Step 4: Configure Revision Rules

Revision rules determine which item revisions to retrieve:

1. Navigate to **Preferences** → **Revision Rules**
2. Common rules:
   - **Working** - Latest working revision (in-progress)
   - **Latest Released** - Latest released revision (production)
3. Note rule names for configuration

#### Step 5: Configure Integration in MES

1. Log in to MES as **Plant Manager** or **System Admin**
2. Navigate to **Integrations** → **Configuration**
3. Click **Add Integration**
4. Select **Siemens Teamcenter PLM**
5. Fill in configuration:

**Basic Settings:**
```yaml
Name: teamcenter_prod
Display Name: Teamcenter PLM Production
Enabled: true
```

**Connection Settings:**
```yaml
Teamcenter Base URL: https://tc.company.com:8080
SOA REST Path: /tc/soa/rest
Teamcenter Version: 12.4
Username: mes_integration
Password: <SECURE_PASSWORD>
```

**Locale Settings:**
```yaml
Locale: en_US
```

**BOM Configuration:**
```yaml
BOM View Types:
  - Manufacturing
  - Engineering
Default BOM View: Manufacturing
```

**Revision Rules:**
```yaml
Revision Rules:
  - Working
  - Latest Released
Default Revision Rule: Latest Released
```

**Module Configuration:**
```yaml
Modules:
  Item Management: enabled
  BOM Management: enabled
  Change Management (ECO/ECN): disabled
  Manufacturing Process Plans (MPP): disabled
  Document Management: disabled
```

**Sync Settings:**
```yaml
Sync Interval: 120 (minutes)
Batch Size: 50
Timeout: 60000
Retry Attempts: 3
Retry Delay: 2000
```

6. Click **Test Connection**
7. Click **Save**

### API Endpoints Used

#### Session Login
```http
POST /tc/soa/rest/SessionManagementService/login
```

**Request Body:**
```json
{
  "credentials": {
    "user": "mes_integration",
    "password": "<PASSWORD>",
    "discriminator": "Teamcenter"
  },
  "locale": "en_US"
}
```

**Response:**
```json
{
  "ServiceData": {
    "ssoCredentials": "<SESSION_TOKEN>"
  }
}
```

#### Query Items
```http
POST /tc/soa/rest/Query-2014-11-Finder/findSavedQuery
```

**Request Body:**
```json
{
  "query": {
    "queryName": "Item...",
    "entries": [
      {
        "key": "Type",
        "value": ["Item"]
      },
      {
        "key": "Last Modified Date",
        "value": ["2024-10-01"]
      }
    ],
    "maxResults": 50
  }
}
```

#### Get Item Properties
```http
POST /tc/soa/rest/Core-2007-01-DataManagement/getProperties
```

**Request Body:**
```json
{
  "objects": ["<ITEM_UID>"],
  "attributes": [
    "item_id",
    "object_name",
    "object_desc",
    "uom_tag",
    "item_type"
  ]
}
```

**Response Mapping:**
- `item_id` → MES `partNumber`
- `object_name` → MES `partName`
- `object_desc` → MES `description`
- `uom_tag` → MES `unitOfMeasure`
- `item_type` → MES `partType` (via mapping)

#### Expand BOM
```http
POST /tc/soa/rest/Cad-2007-01-StructureManagement/expandPSAllLevels
```

**Request Body:**
```json
{
  "input": {
    "parentElements": ["<ITEM_REVISION_UID>"],
    "bomView": "MfgBOMView",
    "revisionRule": "Latest Released",
    "expandAllLevels": true
  }
}
```

**Response:**
Multi-level BOM structure with recursive components

### Data Mapping

#### Item Type Mapping (Teamcenter → MES)
```typescript
const itemTypeMapping: Record<string, string> = {
  'Design': 'COMPONENT',
  'Part': 'COMPONENT',
  'Assembly': 'ASSEMBLY',
  'Product': 'ASSEMBLY',
  'Material': 'RAW_MATERIAL',
  'Tool': 'TOOLING',
  'Equipment': 'EQUIPMENT',
  'default': 'COMPONENT'
};
```

### Example: Multi-Level BOM Sync

```bash
curl -X POST https://your-mes-domain.com/api/v1/integrations/teamcenter_prod/sync \
  -H "Authorization: Bearer YOUR_MES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "sync_boms",
    "filters": {
      "assemblyItemNumber": "ASM-12345",
      "bomView": "Manufacturing",
      "revisionRule": "Latest Released"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "recordsProcessed": 127,
  "recordsCreated": 15,
  "recordsUpdated": 112,
  "recordsFailed": 0,
  "errors": [],
  "duration": 5600,
  "bomLevels": 5
}
```

---

## API Reference

### Integration Management Endpoints

#### List All Integrations
```http
GET /api/v1/integrations
Authorization: Bearer <YOUR_TOKEN>
```

**Response:**
```json
[
  {
    "id": "cuid123",
    "name": "oracle_fusion_prod",
    "displayName": "Oracle Fusion Production",
    "type": "ERP",
    "enabled": true,
    "lastSync": "2024-10-15T10:30:00Z",
    "lastSyncStatus": "SUCCESS",
    "totalSyncs": 245,
    "successCount": 240,
    "failureCount": 5
  }
]
```

#### Get Integration Details
```http
GET /api/v1/integrations/:id
Authorization: Bearer <YOUR_TOKEN>
```

#### Create Integration
```http
POST /api/v1/integrations
Authorization: Bearer <YOUR_TOKEN>
Content-Type: application/json

{
  "name": "oracle_fusion_prod",
  "displayName": "Oracle Fusion Production",
  "type": "ERP",
  "integrationType": "oracle_fusion",
  "enabled": true,
  "config": {
    "oicBaseUrl": "https://...",
    "fusionBaseUrl": "https://...",
    "clientId": "...",
    "clientSecret": "...",
    "tokenUrl": "https://...",
    "scopes": ["urn:opc:resource:fa"],
    "webhookSecret": "...",
    "syncInterval": 60,
    "batchSize": 100,
    "timeout": 30000,
    "retryAttempts": 3,
    "retryDelay": 1000
  }
}
```

#### Update Integration
```http
PUT /api/v1/integrations/:id
Authorization: Bearer <YOUR_TOKEN>
Content-Type: application/json
```

#### Delete Integration
```http
DELETE /api/v1/integrations/:id
Authorization: Bearer <YOUR_TOKEN>
```

#### Trigger Manual Sync
```http
POST /api/v1/integrations/:id/sync
Authorization: Bearer <YOUR_TOKEN>
Content-Type: application/json

{
  "operation": "sync_items",
  "filters": {
    "modifiedSince": "2024-10-01T00:00:00Z"
  }
}
```

**Operations:**
- `sync_items` - Synchronize item master data
- `sync_boms` - Synchronize BOM structures
- `sync_workorders` - Synchronize work orders (ERP only)

#### Get Health Status
```http
GET /api/v1/integrations/:id/health
Authorization: Bearer <YOUR_TOKEN>
```

**Response:**
```json
{
  "connected": true,
  "responseTime": 245,
  "version": "21C",
  "lastCheck": "2024-10-15T10:35:00Z"
}
```

#### Get Integration Logs
```http
GET /api/v1/integrations/:id/logs?page=1&limit=50
Authorization: Bearer <YOUR_TOKEN>
```

**Query Parameters:**
- `page` - Page number (default 1)
- `limit` - Records per page (default 50, max 100)
- `operation` - Filter by operation (sync_items, sync_boms, etc.)
- `status` - Filter by status (SUCCESS, PARTIAL, FAILURE)
- `startDate` - Filter by date range start
- `endDate` - Filter by date range end

**Response:**
```json
{
  "logs": [
    {
      "id": "log123",
      "operation": "sync_items",
      "direction": "INBOUND",
      "status": "SUCCESS",
      "recordCount": 45,
      "successCount": 45,
      "errorCount": 0,
      "duration": 2340,
      "createdAt": "2024-10-15T10:30:00Z"
    }
  ],
  "total": 245,
  "page": 1,
  "totalPages": 5
}
```

#### Test Connection
```http
POST /api/v1/integrations/:id/test
Authorization: Bearer <YOUR_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "responseTime": 312,
  "version": "R12.2"
}
```

---

## Configuration Management

### Configuration Encryption

All integration configurations are encrypted at rest using **AES-256-CBC** encryption.

**Encryption Process:**
1. Configuration JSON is serialized
2. Random 16-byte IV (Initialization Vector) generated
3. AES-256-CBC cipher created with derived key (scrypt)
4. Encrypted data stored as: `{IV}:{encrypted_data}`

**Decryption Process:**
1. Split stored value by `:` separator
2. Extract IV and encrypted data
3. Decrypt using AES-256-CBC with original key

**Implementation Reference:** See `src/services/IntegrationManager.ts:encryptConfig()`

### Environment Variables

Set these environment variables for production deployment:

```bash
# Integration Framework
INTEGRATION_ENCRYPTION_KEY=<GENERATE_STRONG_32_BYTE_KEY>

# Oracle Fusion (optional, can be stored in database)
FUSION_CLIENT_ID=<YOUR_CLIENT_ID>
FUSION_CLIENT_SECRET=<YOUR_CLIENT_SECRET>

# Oracle EBS (optional)
EBS_USERNAME=<INTEGRATION_USER>
EBS_PASSWORD=<SECURE_PASSWORD>

# Teamcenter (optional)
TC_USERNAME=<INTEGRATION_USER>
TC_PASSWORD=<SECURE_PASSWORD>
```

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Backup and Recovery

#### Backup Integration Configurations

```bash
# Export all integration configs (encrypted)
curl -X GET https://your-mes-domain.com/api/v1/integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  > integrations_backup.json
```

#### Restore Integration Configurations

```bash
# Import integration configs
cat integrations_backup.json | jq -c '.[]' | while read config; do
  curl -X POST https://your-mes-domain.com/api/v1/integrations \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$config"
done
```

---

## Monitoring and Health Checks

### Automated Health Checks

The Integration Manager performs health checks every **5 minutes** for all enabled integrations.

**Health Check Process:**
1. Send lightweight API request to external system
2. Measure response time
3. Validate response structure
4. Update integration status
5. Log errors if connection fails

**Health Status Fields:**
- `connected` - Boolean (true/false)
- `responseTime` - Milliseconds
- `version` - External system version
- `lastCheck` - Timestamp
- `error` - Error message (if failed)

### Monitoring Dashboard

Access the Integration Dashboard:
```
https://your-mes-domain.com/integrations
```

**Dashboard Metrics:**
- **Total Integrations** - All configured integrations
- **Active Integrations** - Enabled integrations
- **Connected** - Successfully connected integrations
- **Avg Success Rate** - Overall synchronization success percentage

**Integration Status Table:**
- Real-time connection status (green/red indicators)
- Last sync timestamp
- Success rate (last 100 syncs)
- Manual sync buttons

### Alerts and Notifications

Set up alerts for integration failures:

1. Navigate to **Integrations** → **Settings** (future feature)
2. Configure alert rules:
   - **Connection Lost** - Alert if health check fails 3 consecutive times
   - **Sync Failure** - Alert if sync fails with > 10% error rate
   - **High Latency** - Alert if response time > 5 seconds
3. Set notification channels:
   - Email
   - Slack webhook
   - PagerDuty

### Integration Logs

Access logs for troubleshooting:
```
https://your-mes-domain.com/integrations/logs
```

**Log Filters:**
- Integration name
- Operation type
- Status (SUCCESS, PARTIAL, FAILURE)
- Date range

**Log Details:**
- Request payload (JSON)
- Response payload (JSON)
- Error messages
- Duration metrics

### Performance Metrics

**Target SLAs:**
- **Health Check Response Time:** < 1 second
- **Item Sync (100 records):** < 5 seconds
- **BOM Sync (50 BOMs):** < 10 seconds
- **Success Rate:** > 99%
- **Uptime:** > 99.9%

---

## Troubleshooting

### Common Issues

#### Issue 1: OAuth Token Expired (Fusion)

**Symptoms:**
- 401 Unauthorized errors
- Log message: "OAuth token expired"

**Solution:**
The adapter automatically refreshes expired tokens. If you see persistent 401 errors:
1. Verify client ID and secret are correct
2. Check token URL is accessible
3. Verify scopes are correct
4. Test authentication manually:
   ```bash
   curl -X POST https://idcs-abc123.identity.oraclecloud.com/oauth2/v1/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET&scope=urn:opc:resource:fa"
   ```

#### Issue 2: EBS Session Timeout

**Symptoms:**
- Connection works initially, then fails after 30-60 minutes
- Error: "Session expired"

**Solution:**
The adapter manages session tokens automatically. If sessions expire too quickly:
1. Increase EBS session timeout in FND profile options:
   - `ICX: Session Timeout` (default 30 minutes → 120 minutes)
2. Reduce sync interval to match session timeout
3. Consider switching to BASIC auth for simpler management

#### Issue 3: Teamcenter Session Lost

**Symptoms:**
- Error: "Invalid session ID"
- Sync fails after running successfully

**Solution:**
1. Check Teamcenter SOA server logs for session timeouts
2. Verify integration user has correct privileges
3. Increase session timeout in Teamcenter preferences:
   - `TC_SOA_session_timeout` = `7200` (2 hours)
4. Check for network interruptions between MES and Teamcenter

#### Issue 4: Certificate Validation Failed

**Symptoms:**
- Error: "SSL certificate problem: unable to get local issuer certificate"

**Solution:**
1. **Production:** Install proper SSL certificates on external systems
2. **Development/Testing Only:** Disable SSL verification (not recommended for production):
   ```typescript
   // In adapter configuration (development only)
   const agent = new https.Agent({
     rejectUnauthorized: false
   });
   ```

#### Issue 5: Network Timeout

**Symptoms:**
- Error: "ECONNABORTED" or "timeout of 30000ms exceeded"

**Solution:**
1. Increase timeout in integration config (e.g., 30000 → 60000)
2. Check network latency between MES and external system
3. Optimize query filters to reduce response size
4. Consider batch size reduction

#### Issue 6: Data Mapping Error

**Symptoms:**
- Sync completes but data is incorrect in MES
- Missing fields or null values

**Solution:**
1. Review data mapping functions in adapter code
2. Check external system field names (API version differences)
3. Enable debug logging to see raw API responses:
   ```bash
   # Set environment variable
   DEBUG=integrations:* npm start
   ```
4. Verify UOM (Unit of Measure) codes match between systems

#### Issue 7: Duplicate Records

**Symptoms:**
- Multiple records created for same part/BOM

**Solution:**
1. Verify unique constraints in Prisma schema
2. Check external system ID mapping is correct
3. Review upsert logic in adapter code
4. Clear duplicate records manually:
   ```sql
   -- Find duplicates
   SELECT partNumber, COUNT(*)
   FROM Part
   GROUP BY partNumber
   HAVING COUNT(*) > 1;
   ```

### Error Codes Reference

| Error Code | Description | Solution |
|------------|-------------|----------|
| `ERR_OAUTH_INVALID` | OAuth authentication failed | Verify client ID/secret, check token URL |
| `ERR_SESSION_EXPIRED` | Session token expired | Adapter will auto-retry, check session timeout settings |
| `ERR_NETWORK_TIMEOUT` | Request timed out | Increase timeout, check network connectivity |
| `ERR_INVALID_RESPONSE` | Unexpected API response format | Check API version compatibility |
| `ERR_DATA_MAPPING` | Data transformation failed | Review mapping functions, check field names |
| `ERR_DATABASE` | Database operation failed | Check database logs, verify schema |
| `ERR_WEBHOOK_SIGNATURE` | Invalid webhook signature | Verify webhook secret matches |
| `ERR_BATCH_SIZE` | Batch too large | Reduce batch size in config |
| `ERR_PERMISSION_DENIED` | Insufficient privileges | Check integration user permissions |

### Debug Logging

Enable debug logging for troubleshooting:

**Backend (Node.js):**
```bash
# Set environment variable
DEBUG=integrations:*,axios:* npm start

# Or in code (IntegrationManager.ts)
private logger = {
  debug: (msg: string, data?: any) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${msg}`, data || '');
    }
  }
};
```

**View Logs:**
```bash
# Tail application logs
tail -f /var/log/mes/application.log | grep "integrations"

# Docker logs
docker logs -f mes-backend | grep "integrations"
```

### Support Contacts

| Integration | Support Contact | Documentation |
|-------------|----------------|---------------|
| **Oracle Fusion** | Oracle Cloud Support | https://docs.oracle.com/en/cloud/saas/supply-chain-management/ |
| **Oracle EBS** | Oracle Support (My Oracle Support) | https://docs.oracle.com/cd/E51367_01/ |
| **Siemens Teamcenter** | Siemens PLM Support | https://docs.sw.siemens.com/en-US/product/239835763/ |

---

## Security Best Practices

### 1. Credential Management

**DO:**
- Store credentials encrypted in database (AES-256-CBC)
- Use OAuth 2.0 where available (Fusion)
- Rotate passwords every 90 days
- Use dedicated integration user accounts
- Set strong passwords (16+ characters, mixed case, symbols)

**DON'T:**
- Hard-code credentials in source code
- Store credentials in environment variables (except encryption key)
- Reuse passwords across systems
- Use privileged accounts for integration

### 2. Network Security

**DO:**
- Use HTTPS/TLS for all API communications
- Validate SSL certificates in production
- Whitelist MES server IP addresses in external system firewalls
- Use VPN or private network connections where possible
- Implement rate limiting on API endpoints

**DON'T:**
- Disable SSL certificate validation (except dev/test)
- Expose integration endpoints to public internet
- Use unencrypted HTTP connections
- Allow unrestricted API access

### 3. Webhook Security

**DO:**
- Validate HMAC-SHA256 signatures on all webhook requests
- Use strong webhook secrets (32+ characters)
- Implement request replay protection (timestamp validation)
- Log all webhook requests
- Rate limit webhook endpoints

**DON'T:**
- Accept unsigned webhook requests
- Use weak or default secrets
- Process webhooks without validation

**Example Webhook Signature Validation:**
```typescript
import crypto from 'crypto';

function validateWebhookSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}
```

### 4. Access Control

**DO:**
- Restrict integration management to Plant Manager and System Admin roles
- Use role-based access control (RBAC)
- Audit all configuration changes
- Implement least privilege principle
- Log all API requests with user identity

**DON'T:**
- Allow operators to modify integration configs
- Grant unnecessary database permissions
- Share integration user credentials

### 5. Data Privacy

**DO:**
- Encrypt sensitive configuration data at rest
- Use TLS 1.2+ for data in transit
- Redact credentials in logs
- Implement data retention policies for logs
- Comply with data privacy regulations (GDPR, CCPA)

**DON'T:**
- Log sensitive data (passwords, tokens)
- Store unencrypted credentials
- Retain logs indefinitely

### 6. Monitoring and Auditing

**DO:**
- Monitor integration health continuously
- Alert on failed authentications
- Log all configuration changes
- Track sync success/failure rates
- Review logs regularly for anomalies

**DON'T:**
- Ignore failed authentication attempts
- Disable logging for performance
- Allow unlimited failed login attempts

### 7. Disaster Recovery

**DO:**
- Backup integration configurations regularly
- Document recovery procedures
- Test disaster recovery plan quarterly
- Maintain configuration version control
- Have rollback procedures

**DON'T:**
- Rely on single point of failure
- Skip backup testing
- Store backups without encryption

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **ERP** | Enterprise Resource Planning - Business management software |
| **PLM** | Product Lifecycle Management - Product data management |
| **OAuth 2.0** | Open Authorization 2.0 - Authentication framework |
| **ISG** | Integrated SOA Gateway - Oracle EBS web services |
| **SOA** | Service-Oriented Architecture |
| **BOM** | Bill of Materials - Product structure |
| **HMAC** | Hash-based Message Authentication Code |
| **IDCS** | Identity Cloud Service - Oracle cloud identity |
| **OIC** | Oracle Integration Cloud |
| **UOM** | Unit of Measure (EA, LB, KG, etc.) |

### B. API Version Compatibility

| System | MES Integration Version | Tested API Versions |
|--------|------------------------|---------------------|
| Oracle Fusion Cloud | 1.0 | 21C, 22A, 22B, 23A |
| Oracle EBS | 1.0 | R12.1.3, R12.2.3, R12.2.10 |
| Siemens Teamcenter | 1.0 | 11.6, 12.4, 13.0, 13.1 |

### C. Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-10-15 | Initial release - Sprint 5 |

### D. Additional Resources

- **MES Developer Documentation:** `/docs/DEVELOPER_GUIDE.md`
- **API Reference:** `/docs/API_REFERENCE.md`
- **Deployment Guide:** `/docs/DEPLOYMENT_GUIDE.md`
- **Sprint 5 Summary:** `/docs/SPRINT_5_COMPLETION_SUMMARY.md`

---

**Document Version:** 1.0
**Last Updated:** October 15, 2025
**Maintained By:** MES Development Team
**Next Review Date:** November 15, 2025
