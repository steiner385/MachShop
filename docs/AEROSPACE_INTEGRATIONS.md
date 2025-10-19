# Aerospace Integration Guide

**AS9100 Rev D Compliant Manufacturing Execution System**

This document provides comprehensive guidance for configuring and using the 6 aerospace-grade integrations in the MES system.

## Table of Contents

- [Overview](#overview)
- [AS9100 Compliance Mapping](#as9100-compliance-mapping)
- [Integration Architecture](#integration-architecture)
- [Configuration](#configuration)
- [IBM Maximo CMMS](#ibm-maximo-cmms)
- [Indysoft Gauge Calibration](#indysoft-gauge-calibration)
- [Covalent Skills Tracking](#covalent-skills-tracking)
- [Shop Floor Connect](#shop-floor-connect)
- [Predator PDM](#predator-pdm)
- [Predator DNC](#predator-dnc)
- [CMM Integration (PC-DMIS/Calypso)](#cmm-integration-pc-dmiscalypso)
- [QIF (Quality Information Framework)](#qif-quality-information-framework)
- [Authorization Handshake Workflow](#authorization-handshake-workflow)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

The MES system integrates with 7 aerospace-grade systems to ensure AS9100 Rev D compliance:

| System | Purpose | AS9100 Compliance |
|--------|---------|-------------------|
| IBM Maximo | Equipment maintenance tracking (CMMS) | Clause 7.1.3: Infrastructure |
| Indysoft | Gauge calibration management | Clause 7.1.5: Monitoring and measuring resources |
| Covalent | Operator skills and competency tracking | Clause 7.2: Competence |
| Shop Floor Connect | CNC program version control | Clause 8.5.6: Control of changes |
| Predator PDM | Production data management | Configuration management |
| Predator DNC | **CRITICAL:** CNC program distribution with authorization handshake | Multi-system validation |
| CMM (PC-DMIS/Calypso) | Coordinate measuring machine with QIF 3.0 support | AS9102 Form 3: Dimensional inspection |

---

## AS9100 Compliance Mapping

### AS9100 Clause 7.1.3: Infrastructure
**Requirement:** Organization shall determine, provide, and maintain the infrastructure necessary for the operation of its processes.

**MES Implementation:** IBM Maximo CMMS integration tracks:
- Equipment maintenance schedules (PM, CM, CAL)
- Equipment failure history and MTBF
- Maintenance work order completion
- Equipment availability for OEE calculation

### AS9100 Clause 7.1.5: Monitoring and Measuring Resources
**Requirement:** Equipment used for inspection shall be calibrated and traceable to national standards (NIST).

**MES Implementation:** Indysoft integration provides:
- ISO 17025 compliant calibration records
- Measurement uncertainty budgets
- Gage R&R studies
- Auto-quarantine of parts measured with out-of-cal gauges
- NIST traceability chain

### AS9100 Clause 7.2: Competence
**Requirement:** Personnel performing work affecting product conformity shall be competent based on education, training, skills, and experience.

**MES Implementation:** Covalent integration validates:
- Operator certifications before work authorization
- FAI inspector qualifications (AS9102)
- Special process certifications (welding, heat treat, NDT)
- Certification expiration tracking

### AS9100 Clause 8.5.6: Control of Changes
**Requirement:** Changes to production processes shall be reviewed, verified, validated, and controlled.

**MES Implementation:** Shop Floor Connect integration ensures:
- CNC program version control with Teamcenter PLM
- ECO/ECN tracking and incorporation
- First piece approval before production
- Revision mismatch prevention

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         MES Core                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Integration Manager                          │   │
│  │  (Unified adapter orchestration & health monitoring) │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│       ┌───────────────────┼───────────────────┐             │
│       │                   │                   │             │
│  ┌────▼────┐       ┌─────▼─────┐      ┌─────▼──────┐      │
│  │ Maximo  │       │ Indysoft  │      │  Covalent  │      │
│  │ Adapter │       │  Adapter  │      │   Adapter  │      │
│  └────┬────┘       └─────┬─────┘      └─────┬──────┘      │
│       │                  │                   │             │
│  ┌────▼────┐       ┌─────▼─────┐      ┌─────▼──────┐      │
│  │   SFC   │       │    PDM    │      │    DNC     │      │
│  │ Adapter │       │  Adapter  │      │  Adapter   │      │
│  └────┬────┘       └─────┬─────┘      └──────┬─────┘      │
│       │                  │                    │            │
└───────┼──────────────────┼────────────────────┼────────────┘
        │                  │                    │
        │                  │                    │
    ┌───▼──────┐     ┌─────▼─────┐      ┌──────▼───────┐
    │Teamcenter│     │ Predator  │      │   Predator   │
    │   PLM    │     │    PDM    │      │     DNC      │
    └──────────┘     └───────────┘      └──────┬───────┘
                                                │
                                         ┌──────▼────────┐
                                         │ CNC Equipment │
                                         │  (MTConnect)  │
                                         └───────────────┘
```

### Authorization Handshake Flow (DNC → Covalent → SFC → Indysoft)

```
Program Load Request
       │
       ▼
┌─────────────────────────────────────┐
│  STEP 1: Operator Authentication   │ ◄── DNC Adapter
│  (Badge scan, PIN, biometric)       │
└────────────┬────────────────────────┘
             │ PASS
             ▼
┌─────────────────────────────────────┐
│  STEP 2: Work Order Validation     │ ◄── DNC Adapter
│  (Correct operation, sequence OK)   │
└────────────┬────────────────────────┘
             │ PASS
             ▼
┌─────────────────────────────────────┐
│  STEP 3: Certification Check        │ ◄── Covalent Adapter
│  (Operator qualified for part)      │
└────────────┬────────────────────────┘
             │ PASS
             ▼
┌─────────────────────────────────────┐
│  STEP 4: Program Version Check      │ ◄── SFC Adapter
│  (Correct revision, ECO incorporated)│
└────────────┬────────────────────────┘
             │ PASS
             ▼
┌─────────────────────────────────────┐
│  STEP 5: Gauge Calibration Check    │ ◄── Indysoft Adapter
│  (All gauges in calibration)        │
└────────────┬────────────────────────┘
             │ PASS
             ▼
┌─────────────────────────────────────┐
│  ✅ AUTHORIZED - Transfer Program   │
│  + Create audit trail               │
│  + Log to database                  │
└─────────────────────────────────────┘

          ANY STEP FAILS
                │
                ▼
┌─────────────────────────────────────┐
│  ❌ BLOCKED - No program transfer   │
│  + Notify supervisor                │
│  + Log rejection reason             │
│  + Operator see failure message     │
└─────────────────────────────────────┘
```

---

## Configuration

### 1. Environment Variables

Copy `.env.example` to `.env` and configure aerospace integrations:

```bash
# IBM Maximo CMMS
MAXIMO_BASE_URL=https://your-maximo-server.com
MAXIMO_USERNAME=mes_integration
MAXIMO_PASSWORD=<secure-password>
MAXIMO_USE_OSLC=true
MAXIMO_SYNC_INTERVAL=900000  # 15 minutes

# Indysoft Gauge Calibration
INDYSOFT_BASE_URL=https://your-indysoft-server.com
INDYSOFT_USERNAME=mes_integration
INDYSOFT_PASSWORD=<secure-password>
INDYSOFT_ENABLE_ISO17025=true
INDYSOFT_AUTO_QUARANTINE=true
INDYSOFT_SYNC_INTERVAL=3600000  # 1 hour

# Covalent Skills Tracking
COVALENT_BASE_URL=https://your-covalent-server.com
COVALENT_API_KEY=<api-key>
COVALENT_ENABLE_AS9100_COMPLIANCE=true
COVALENT_FAI_INSPECTOR_VALIDATION=true
COVALENT_CERT_EXPIRY_WARNING_DAYS=30

# Shop Floor Connect
SHOP_FLOOR_CONNECT_BASE_URL=https://your-sfc-server.com
SHOP_FLOOR_CONNECT_USERNAME=mes_integration
SHOP_FLOOR_CONNECT_PASSWORD=<secure-password>
SHOP_FLOOR_CONNECT_PLM_INTEGRATION=TEAMCENTER
SHOP_FLOOR_CONNECT_ENABLE_ECO_TRACKING=true
SHOP_FLOOR_CONNECT_ENABLE_MBE=true

# Predator PDM
PREDATOR_PDM_BASE_URL=https://your-pdm-server.com
PREDATOR_PDM_USERNAME=mes_integration
PREDATOR_PDM_PASSWORD=<secure-password>
PREDATOR_PDM_ENABLE_MBE=true
PREDATOR_PDM_ENABLE_REQIF=true

# Predator DNC (CRITICAL)
PREDATOR_DNC_BASE_URL=https://your-dnc-server.com
PREDATOR_DNC_USERNAME=mes_integration
PREDATOR_DNC_PASSWORD=<secure-password>
PREDATOR_DNC_ENABLE_AUTHORIZATION_HANDSHAKE=true
PREDATOR_DNC_ENABLE_OPERATOR_VALIDATION=true
PREDATOR_DNC_ENABLE_PROGRAM_VERSIONING=true
PREDATOR_DNC_ENABLE_GAUGE_VALIDATION=true
PREDATOR_DNC_ALERT_ON_AUTHORIZATION_FAILURE=true

# CMM (Coordinate Measuring Machine)
CMM_BASE_URL=https://your-cmm-server.com
CMM_TYPE=PC-DMIS                    # PC-DMIS or Calypso
CMM_USERNAME=mes_integration
CMM_PASSWORD=<secure-password>
CMM_API_KEY=<api-key>
CMM_TIMEOUT=60000
CMM_AUTO_IMPORT_RESULTS=true
CMM_QIF_VERSION=3.0.0
CMM_ENABLE_AS9102_FAI=true
```

### 2. Database Seed

Run seed to create integration configurations:

```bash
npx prisma migrate dev
npx prisma db seed
```

This creates disabled integration configs that can be enabled via API or database.

### 3. Enable Integrations

Use the Integration API to enable/configure each integration:

```bash
# Enable IBM Maximo
curl -X PUT http://localhost:3000/api/v1/integrations/{maximo-id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "config": {
      "baseUrl": "https://your-maximo-server.com",
      "username": "mes_integration",
      "password": "secure-password"
    }
  }'
```

---

## IBM Maximo CMMS

### Purpose
Track equipment maintenance history, schedule preventive maintenance, and ensure equipment availability for production.

### API Endpoints

#### POST /api/v1/maximo/sync-work-orders
Sync work orders from Maximo to MES.

**Request:**
```json
{
  "status": ["WAPPR", "APPR", "INPRG"],
  "worktype": ["PM", "CM", "CAL"],
  "dateFrom": "2024-10-01T00:00:00Z",
  "dateTo": "2024-10-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "syncedCount": 45,
  "failedCount": 0,
  "workOrders": [...]
}
```

#### POST /api/v1/maximo/work-order-status
Push work order status update to Maximo.

**Request:**
```json
{
  "wonum": "WO-2024-12345",
  "status": "COMP",
  "actualStart": "2024-10-15T08:00:00Z",
  "actualFinish": "2024-10-15T12:30:00Z"
}
```

#### POST /api/v1/maximo/create-cm-work-order
Create corrective maintenance work order.

**Request:**
```json
{
  "assetnum": "CNC-MILL-01",
  "description": "Spindle making abnormal noise - requires bearing replacement",
  "failureCode": "BEARING-FAILURE",
  "priority": 1
}
```

**Response:**
```json
{
  "success": true,
  "wonum": "WO-2024-67890",
  "message": "Corrective maintenance work order created"
}
```

### Workflow Example

1. Equipment failure detected on shop floor
2. Operator creates CM work order via MES UI
3. MES calls `/api/v1/maximo/create-cm-work-order`
4. Maximo assigns to maintenance team
5. Maintenance completes work in Maximo
6. MES syncs work order status
7. Equipment becomes available for production

---

## Indysoft Gauge Calibration

### Purpose
Ensure all measurement equipment is calibrated, traceable to NIST, and compliant with ISO 17025.

### Critical Features

- **Auto-Quarantine:** Parts measured with out-of-cal gauges are automatically quarantined
- **Measurement Uncertainty:** ISO 17025 uncertainty budgets tracked
- **Gage R&R:** Measurement System Analysis validation
- **NIST Traceability:** Calibration certificates link to NIST standards

### API Endpoints

#### POST /api/v1/indysoft/sync-gauges
Sync gauge calibration data from Indysoft.

**Response:**
```json
{
  "success": true,
  "syncedCount": 120,
  "outOfCalCount": 3,
  "warningCount": 12
}
```

#### GET /api/v1/indysoft/gauge/:gaugeId/certificate
Get ISO 17025 calibration certificate.

**Response:**
```json
{
  "success": true,
  "certificate": {
    "certificateNumber": "CAL-2024-00123",
    "gaugeId": "MIC-0001",
    "calibrationDate": "2024-09-15",
    "nextCalibrationDate": "2025-09-15",
    "uncertainty": "±0.0001 in",
    "nistTraceability": "NIST-12345",
    "asFoundCondition": "IN_TOLERANCE",
    "calibratedBy": "Acme Calibration Lab",
    "accreditationNumber": "ISO17025-789"
  }
}
```

#### POST /api/v1/indysoft/out-of-cal
Handle out-of-calibration investigation.

**Request:**
```json
{
  "gaugeId": "MIC-0001",
  "asFoundCondition": "OUT_OF_TOLERANCE",
  "outOfToleranceBy": 0.0003
}
```

**Response:**
```json
{
  "success": true,
  "investigation": {
    "investigationId": "OOC-2024-001",
    "affectedParts": 45,
    "quarantinedParts": 45,
    "ncrCreated": "NCR-2024-123",
    "requiresDisposition": true
  }
}
```

### Out-of-Calibration Workflow

1. Gauge sent for calibration
2. Calibration lab finds gauge out-of-tolerance
3. Indysoft updated with "OUT_OF_CAL" status
4. MES syncs gauge data
5. **AUTO-QUARANTINE:** All parts measured since last calibration are quarantined
6. NCR auto-created
7. Engineering performs investigation
8. Disposition: Accept, Rework, or Scrap

---

## Covalent Skills Tracking

### Purpose
Validate operator competency and certifications before authorizing work.

### API Endpoints

#### POST /api/v1/covalent/check-authorization
Check if operator is authorized for specific work.

**Request:**
```json
{
  "operatorId": "OP-001",
  "workType": "MACHINING",
  "partNumber": "PART-12345",
  "partComplexity": "COMPLEX",
  "machineType": "5-AXIS-MILL",
  "requiredCertifications": ["CNC-ADVANCED", "GD&T-LEVEL-3"]
}
```

**Response:**
```json
{
  "success": true,
  "authorized": true,
  "operatorId": "OP-001",
  "certifications": [
    {
      "certificationCode": "CNC-ADVANCED",
      "status": "VALID",
      "expirationDate": "2025-12-31"
    },
    {
      "certificationCode": "GD&T-LEVEL-3",
      "status": "VALID",
      "expirationDate": "2026-06-30"
    }
  ],
  "workAuthorizations": ["5-AXIS-MILL", "COMPLEX-PARTS"],
  "reasons": []
}
```

#### POST /api/v1/covalent/validate-fai-inspector
Validate FAI inspector qualification (AS9102).

**Request:**
```json
{
  "operatorId": "QE-005"
}
```

**Response:**
```json
{
  "success": true,
  "qualified": true,
  "certificationValid": true,
  "certificationExpiry": "2025-08-15",
  "reasons": []
}
```

**If NOT qualified:**
```json
{
  "success": true,
  "qualified": false,
  "certificationValid": false,
  "reasons": [
    "FAI certification expired on 2024-09-01",
    "Requires refresher training"
  ]
}
```

---

## Shop Floor Connect

### Purpose
Ensure correct CNC program version is used for production, incorporating all ECOs.

### API Endpoints

#### POST /api/v1/shop-floor-connect/check-revision
Check if CNC program is at correct revision.

**Request:**
```json
{
  "programName": "PART-12345_OP-010.nc",
  "partNumber": "PART-12345",
  "workOrderNumber": "WO-2024-001"
}
```

**Response (Correct Revision):**
```json
{
  "success": true,
  "isCorrectRevision": true,
  "currentRevision": "REV-C",
  "programName": "PART-12345_OP-010.nc",
  "lastModified": "2024-10-01T14:30:00Z",
  "ecoIncorporated": ["ECO-2024-045", "ECO-2024-067"],
  "approved": true,
  "approvedBy": "Engineering Manager",
  "approvalDate": "2024-10-02T10:00:00Z"
}
```

**Response (Wrong Revision - BLOCKED):**
```json
{
  "success": true,
  "isCorrectRevision": false,
  "currentRevision": "REV-C",
  "machineRevision": "REV-B",
  "message": "ECO-2024-067 not incorporated in machine program. Update required.",
  "authorized": false
}
```

#### POST /api/v1/shop-floor-connect/approve-first-piece
Approve first piece for CNC program.

**Request:**
```json
{
  "programId": "prog-12345",
  "programName": "PART-12345_OP-010.nc",
  "revision": "REV-C",
  "faiReportNumber": "FAI-2024-123",
  "approvedBy": "QE-005",
  "approvalDate": "2024-10-15T15:30:00Z"
}
```

---

## Predator PDM

### Purpose
Manage production documentation including CAM programs, work instructions, FAI templates, and MBE data (STEP AP242, ReqIF).

### Model-Based Enterprise (MBE) Support

- **STEP AP242:** 3D PMI models with embedded GD&T
- **ReqIF:** Requirements traceability (digital thread)
- **Digital Product Definition:** No 2D drawings required

### API Endpoints

#### GET /api/v1/predator-pdm/nc-program/:partNumber/:operationCode
Get NC program for part and operation.

**Response:**
```json
{
  "success": true,
  "program": {
    "documentId": "doc-12345",
    "partNumber": "PART-12345",
    "operationCode": "OP-010",
    "revision": "REV-C",
    "fileName": "PART-12345_OP-010_REVC.nc",
    "status": "RELEASED",
    "approvedBy": "Engineering",
    "downloadUrl": "https://pdm.company.com/download/doc-12345"
  }
}
```

#### GET /api/v1/predator-pdm/step-ap242/:partNumber
Get STEP AP242 3D model with PMI.

**Response:**
```json
{
  "success": true,
  "model": {
    "modelId": "model-789",
    "partNumber": "PART-12345",
    "revision": "REV-C",
    "fileName": "PART-12345_REVC.step",
    "fileUrl": "https://pdm.company.com/mbe/model-789",
    "pmiData": {
      "geometricTolerances": 45,
      "dimensions": 128,
      "surfaceFinish": 12
    },
    "requirementsLinks": ["REQ-001", "REQ-045", "REQ-067"],
    "validationStatus": "VALID"
  }
}
```

#### GET /api/v1/predator-pdm/requirements/:partNumber
Get requirements traceability (ReqIF).

**Response:**
```json
{
  "success": true,
  "partNumber": "PART-12345",
  "requirements": [
    {
      "requirementId": "REQ-001",
      "title": "Surface Finish Ra 32",
      "category": "QUALITY",
      "priority": "CRITICAL",
      "status": "VERIFIED",
      "linkedDocuments": ["doc-12345", "doc-67890"],
      "traceabilityChain": ["CUSTOMER-REQ-A", "DESIGN-SPEC-B", "MFG-PROC-C"]
    }
  ],
  "count": 8
}
```

---

## Predator DNC

### **CRITICAL: Authorization Handshake**

This is the most important integration. It prevents unauthorized program loading by validating 5 criteria before allowing CNC program transfer.

### 5-Step Authorization Handshake

#### POST /api/v1/predator-dnc/authorization-handshake

**Request:**
```json
{
  "operatorId": "OP-001",
  "machineId": "CNC-MILL-01",
  "programName": "PART-12345_OP-010.nc",
  "partNumber": "PART-12345",
  "operationCode": "OP-010",
  "workOrderNumber": "WO-2024-001"
}
```

**Response (AUTHORIZED):**
```json
{
  "success": true,
  "authorized": true,
  "authorizationId": "auth-2024-12345",
  "timestamp": "2024-10-15T08:00:00Z",

  "validationResults": {
    "operatorAuthenticated": true,
    "workOrderValid": true,
    "certificationValid": true,
    "programVersionValid": true,
    "gaugeCalibrationValid": true
  },

  "failureReasons": [],
  "supervisorNotified": false,

  "traceabilityData": {
    "operatorName": "John Smith",
    "operatorCertifications": ["CNC-ADVANCED", "GD&T-LEVEL-3"],
    "programRevision": "REV-C",
    "workOrderStatus": "IN_PROGRESS",
    "currentOperation": "OP-010",
    "gaugesRequired": ["MIC-0001", "PIN-0045"],
    "gaugesInCalibration": true
  }
}
```

**Response (BLOCKED - Certification Expired):**
```json
{
  "success": true,
  "authorized": false,
  "authorizationId": "auth-2024-12346",
  "timestamp": "2024-10-15T08:05:00Z",

  "validationResults": {
    "operatorAuthenticated": true,
    "workOrderValid": true,
    "certificationValid": false,
    "programVersionValid": null,
    "gaugeCalibrationValid": null
  },

  "failureReasons": [
    "Operator certification expired on 2024-09-30",
    "Requires CNC-ADVANCED recertification"
  ],

  "supervisorNotified": true,
  "supervisorAlert": {
    "alertId": "alert-789",
    "notifiedAt": "2024-10-15T08:05:02Z",
    "supervisor": "Jane Manager"
  }
}
```

### Program Transfer (After Authorization)

#### POST /api/v1/predator-dnc/transfer-program

**Request:**
```json
{
  "operatorId": "OP-001",
  "machineId": "CNC-MILL-01",
  "programName": "PART-12345_OP-010.nc",
  "partNumber": "PART-12345",
  "operationCode": "OP-010",
  "workOrderNumber": "WO-2024-001",
  "authorizationId": "auth-2024-12345"
}
```

**Response:**
```json
{
  "success": true,
  "downloadId": "download-456",
  "transferredAt": "2024-10-15T08:00:15Z",
  "programSize": 245678,
  "checksum": "a3b4c5d6e7f8",
  "message": "Program successfully transferred to CNC-MILL-01"
}
```

---

## Authorization Handshake Workflow

### Complete Example

```bash
# 1. Operator scans badge at machine
# 2. Machine requests program load
# 3. MES performs authorization handshake

curl -X POST http://localhost:3000/api/v1/predator-dnc/authorization-handshake \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operatorId": "OP-001",
    "machineId": "CNC-MILL-01",
    "programName": "PART-12345_OP-010.nc",
    "partNumber": "PART-12345",
    "operationCode": "OP-010",
    "workOrderNumber": "WO-2024-001"
  }'

# Response includes authorizationId

# 4. If authorized, transfer program
curl -X POST http://localhost:3000/api/v1/predator-dnc/transfer-program \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operatorId": "OP-001",
    "machineId": "CNC-MILL-01",
    "programName": "PART-12345_OP-010.nc",
    "partNumber": "PART-12345",
    "operationCode": "OP-010",
    "workOrderNumber": "WO-2024-001",
    "authorizationId": "auth-2024-12345"
  }'
```

---

## API Reference

### Authentication

All API endpoints require authentication. Include JWT token in Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error Responses

All endpoints use standard HTTP status codes and return errors in this format:

```json
{
  "success": false,
  "error": "Detailed error message",
  "timestamp": "2024-10-15T08:00:00Z"
}
```

### Health Check Endpoints

Each integration has a health endpoint:

- GET `/api/v1/maximo/health`
- GET `/api/v1/indysoft/health`
- GET `/api/v1/covalent/health`
- GET `/api/v1/shop-floor-connect/health`
- GET `/api/v1/predator-pdm/health`
- GET `/api/v1/predator-dnc/health`

**Response:**
```json
{
  "connected": true,
  "responseTime": 45,
  "lastSync": "2024-10-15T07:55:00Z"
}
```

---

## Troubleshooting

### Authorization Handshake Fails

**Problem:** DNC authorization always fails even with valid credentials.

**Solutions:**
1. Check cross-adapter dependencies:
   ```bash
   curl http://localhost:3000/api/v1/covalent/health
   curl http://localhost:3000/api/v1/shop-floor-connect/health
   curl http://localhost:3000/api/v1/indysoft/health
   ```

2. Verify integration configs are enabled:
   ```bash
   curl http://localhost:3000/api/v1/integrations
   ```

3. Check logs for validation failures:
   ```bash
   tail -f logs/mes-api.log | grep "authorization-handshake"
   ```

### Gauge Auto-Quarantine Not Working

**Problem:** Parts not quarantined when gauge goes out-of-cal.

**Solutions:**
1. Verify Indysoft integration config:
   ```env
   INDYSOFT_AUTO_QUARANTINE=true
   INDYSOFT_ALERT_ON_OUT_OF_CAL=true
   ```

2. Check `InspectionRecord` table has gauge-to-part linkage:
   ```sql
   SELECT * FROM inspection_records WHERE gaugeId = 'MIC-0001';
   ```

3. Ensure Indysoft sync is running:
   ```bash
   curl http://localhost:3000/api/v1/indysoft/sync-gauges
   ```

### Program Version Mismatch

**Problem:** SFC reports wrong program revision.

**Solutions:**
1. Sync programs from Teamcenter:
   ```bash
   curl -X POST http://localhost:3000/api/v1/shop-floor-connect/sync-programs \
     -d '{"partNumber": "PART-12345"}'
   ```

2. Check ECO incorporation status:
   ```bash
   curl http://localhost:3000/api/v1/shop-floor-connect/eco/ECO-2024-067
   ```

3. Verify program revision in database matches Teamcenter:
   ```sql
   SELECT * FROM cnc_programs WHERE partNumber = 'PART-12345';
   ```

---

## CMM Integration (PC-DMIS/Calypso)

### Purpose
Integrate Coordinate Measuring Machines (CMM) with the MES for automated dimensional inspection with QIF 3.0 (Quality Information Framework) support for AS9102 FAI compliance.

### Supported CMM Software
- **PC-DMIS** - Hexagon Manufacturing Intelligence
- **Calypso** - Carl Zeiss

### Key Features
- QIF 3.0 MeasurementPlan generation from FAI reports
- QIF 3.0 MeasurementResults import from CMM
- Bi-directional data exchange (export plans, import results)
- AS9102 Form 3 characteristic accountability
- GD&T characteristic evaluation
- Statistical analysis (Cpk, Ppk)
- Digital thread from design → FAI → CMM → results

### API Endpoints

#### POST /api/v1/cmm/qif/plan/import
Import QIF MeasurementPlan XML to create inspection program.

**Request:**
```json
{
  "qifXml": "<?xml version=\"1.0\"?>..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "QIF measurement plan imported successfully",
  "qifPlanId": "FAI-2024-123"
}
```

#### POST /api/v1/cmm/qif/results/import
Import QIF MeasurementResults from CMM inspection.

**Request:**
```json
{
  "qifXml": "<?xml version=\"1.0\"?>...",
  "workOrderId": "wo-123",
  "serializedPartId": "serial-456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "QIF measurement results imported successfully",
  "qifResultsId": "FAI-RESULT-2024-123"
}
```

#### POST /api/v1/cmm/inspection/execute
Execute CMM inspection program.

**Request:**
```json
{
  "programName": "PART-12345_FAI.prg",
  "partNumber": "PART-12345",
  "serialNumber": "SN-001",
  "operatorId": "QE-005"
}
```

**Response:**
```json
{
  "success": true,
  "message": "CMM inspection started successfully",
  "inspectionId": "insp-789",
  "status": "RUNNING",
  "progress": 0
}
```

#### GET /api/v1/cmm/inspection/:inspectionId
Get CMM inspection status.

**Response:**
```json
{
  "success": true,
  "inspectionId": "insp-789",
  "status": "COMPLETED",
  "progress": 100,
  "startTime": "2024-10-15T08:00:00Z",
  "endTime": "2024-10-15T08:15:00Z"
}
```

#### GET /api/v1/cmm/inspection/:inspectionId/results
Get measurement results from completed inspection.

**Response:**
```json
{
  "success": true,
  "results": {
    "resultId": "result-123",
    "programId": "prog-456",
    "partNumber": "PART-12345",
    "serialNumber": "SN-001",
    "inspectionDate": "2024-10-15T08:15:00Z",
    "overallStatus": "PASS",
    "characteristics": [
      {
        "characteristicId": "CHAR-1",
        "balloonNumber": "1",
        "description": "Hole Diameter",
        "nominalValue": 0.5000,
        "upperTolerance": 0.5010,
        "lowerTolerance": 0.4990,
        "measuredValue": 0.5003,
        "deviation": 0.0003,
        "status": "PASS",
        "unitOfMeasure": "inch"
      }
    ]
  }
}
```

#### GET /api/v1/cmm/programs
List available CMM inspection programs.

**Response:**
```json
{
  "success": true,
  "programs": [
    {
      "programId": "prog-123",
      "programName": "PART-12345_FAI.prg",
      "partNumber": "PART-12345",
      "revision": "REV-C",
      "cmmType": "PC-DMIS",
      "characteristics": 45,
      "isActive": true
    }
  ],
  "count": 1
}
```

#### POST /api/v1/cmm/plan/create
Create MES QIF plan from part characteristics.

**Request:**
```json
{
  "partNumber": "PART-12345",
  "revision": "REV-C",
  "characteristics": [
    {
      "balloonNumber": "1",
      "description": "Hole Diameter",
      "nominalValue": 0.5000,
      "upperTolerance": 0.5010,
      "lowerTolerance": 0.4990,
      "gdtType": "Position"
    }
  ],
  "workOrderId": "wo-123",
  "faiReportId": "fai-456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "QIF measurement plan created successfully",
  "qifPlan": {
    "qifPlanId": "FAI-2024-123",
    "partNumber": "PART-12345",
    "revision": "REV-C",
    "characteristics": [...],
    "xmlContent": "<?xml version=\"1.0\"?>..."
  }
}
```

---

## QIF (Quality Information Framework)

### Overview
QIF 3.0 (ANSI/DMSC Quality Information Framework) is the industry standard for dimensional metrology data exchange. The MES implements QIF 3.0 for AS9102 FAI compliance.

### QIF Components

| Component | Purpose | AS9102 Mapping |
|-----------|---------|----------------|
| QIF Product | Part definition | Form 1: Part Number Accountability |
| QIF MeasurementPlan | Inspection plan with characteristics | Form 3: Characteristic definitions |
| QIF MeasurementResults | Actual measurement data | Form 3: Actual measurements |
| QIF Resources | Measurement equipment/gauges | Equipment traceability |
| QIF Statistics | Statistical analysis (Cpk, Ppk) | Process capability |

### FAI Integration - QIF Endpoints

The FAI module has built-in QIF support for complete AS9102 compliance:

#### POST /api/v1/fai/:id/qif/plan
Generate QIF MeasurementPlan from FAI report.

**Request:** (No body required)

**Response:** QIF XML (application/xml)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<QIFDocument version="3.0.0" xmlns="http://qifstandards.org/xsd/qif3">
  <Header>
    <Application>
      <Name>MachShop MES</Name>
      <Organization>Manufacturing Enterprise</Organization>
    </Application>
  </Header>
  <Product id="1">
    <PartNumber>PART-12345</PartNumber>
    <Revision>REV-C</Revision>
  </Product>
  <MeasurementPlan id="FAI-PLAN-2024-123">
    <InspectionSteps>
      <InspectionStep id="STEP-1">
        <CharacteristicId>CHAR-1</CharacteristicId>
        <BalloonNumber>1</BalloonNumber>
        <NominalValue>0.5000</NominalValue>
        <UpperLimit>0.5010</UpperLimit>
        <LowerLimit>0.4990</LowerLimit>
      </InspectionStep>
    </InspectionSteps>
  </MeasurementPlan>
</QIFDocument>
```

#### POST /api/v1/fai/:id/qif/results
Generate QIF MeasurementResults from FAI report.

**Request:**
```json
{
  "serialNumber": "SN-001"
}
```

**Response:** QIF XML (application/xml) with MeasurementResults

#### GET /api/v1/fai/:id/qif/export
Export complete FAI report as QIF AS9102 document.

Downloads XML file with both MeasurementPlan and MeasurementResults.

**Filename:** `QIF-AS9102-{faiNumber}.xml`

#### POST /api/v1/fai/:id/qif/import
Import QIF MeasurementResults from CMM into FAI report.

**Request:**
```json
{
  "qifXml": "<?xml version=\"1.0\"?>..."
}
```

**Response:**
```json
{
  "id": "fai-123",
  "faiNumber": "FAI-2024-123",
  "status": "IN_PROGRESS",
  "characteristics": [
    {
      "characteristicNumber": 1,
      "actualValue": 0.5003,
      "result": "PASS"
    }
  ]
}
```

### QIF Workflow Example

```bash
# 1. Create FAI report with characteristics
curl -X POST http://localhost:3000/api/v1/fai \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "faiNumber": "FAI-2024-123",
    "partId": "part-456",
    "characteristics": [...]
  }'

# 2. Generate QIF MeasurementPlan for CMM programming
curl -X POST http://localhost:3000/api/v1/fai/{fai-id}/qif/plan \
  -H "Authorization: Bearer $TOKEN" \
  > measurement-plan.xml

# 3. Import measurement plan to PC-DMIS or Calypso
#    (Manual step - upload to CMM software)

# 4. Run CMM inspection on first article
#    CMM generates QIF MeasurementResults XML

# 5. Import CMM results back to FAI report
curl -X POST http://localhost:3000/api/v1/fai/{fai-id}/qif/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qifXml": "<?xml version=\"1.0\"?>..."
  }'

# 6. Export complete AS9102 report
curl -X GET http://localhost:3000/api/v1/fai/{fai-id}/qif/export \
  -H "Authorization: Bearer $TOKEN" \
  > QIF-AS9102-FAI-2024-123.xml
```

### QIF Benefits

1. **Standardized Data Exchange** - Industry standard eliminates proprietary formats
2. **Digital Thread** - Complete traceability from design → inspection → results
3. **CMM Independence** - Works with any QIF-compliant CMM software
4. **AS9102 Compliance** - Direct mapping to AS9102 Form 3 requirements
5. **Statistical Analysis** - Built-in support for Cpk, Ppk calculations
6. **Audit Trail** - Complete measurement history in standardized format

### QIF Standards Compliance

- **ANSI/DMSC QIF 3.0** - Quality Information Framework
- **AS9102 Rev C** - First Article Inspection
- **Y14.5-2018** - GD&T (Geometric Dimensioning and Tolerancing)
- **ISO 1101** - Geometrical tolerancing
- **ISO 17025** - Calibration laboratory competence (via QIF Resources)

---

## Support and Documentation

- **MES API Documentation:** http://localhost:3000/api-docs (when enabled)
- **AS9100 Rev D Standard:** [AS9100 Store](https://www.sae.org/standards/content/as9100d/)
- **ISO 17025:** [ISO.org](https://www.iso.org/standard/66912.html)
- **AS9102 FAI:** [SAE AS9102](https://www.sae.org/standards/content/as9102/)

---

**Document Version:** 1.0
**Last Updated:** October 2024
**Author:** MES Development Team
