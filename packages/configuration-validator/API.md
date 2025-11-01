# Site-Scoped Extension API Reference

## Overview

The Site-Scoped Extension API provides RESTful endpoints for managing per-site extension configurations, compliance signoffs, and validation in a multi-tenant MachShop deployment.

All endpoints are site-scoped - a single siteId parameter ensures complete isolation between sites.

## Authentication & Headers

All endpoints require:
- **Authorization**: Standard authentication (bearer token, session, etc.)
- **x-site-id** or path parameter: Site identifier
- **x-user-id** or authenticated user: User performing the action

## API Endpoints

### 1. List Site Features

**GET** `/api/v1/site/{siteId}/features`

List all available features (enabled extensions) at a site.

**Parameters:**
- `siteId` (path): Site identifier

**Response:**
```json
{
  "ok": true,
  "data": {
    "siteId": "site-123",
    "features": {
      "erp-integration": {
        "enabled": true,
        "version": "v1.0.0",
        "providedAt": "2024-11-01T10:00:00Z",
        "configuration": { ... }
      },
      "work-instruction-authoring": {
        "enabled": true,
        "version": "v2.0.0",
        "providedAt": "2024-11-01T11:00:00Z",
        "configuration": { ... }
      }
    },
    "status": {
      "siteId": "site-123",
      "totalExtensions": 2,
      "validConfigurations": 2,
      "invalidConfigurations": 0,
      "conflictingConfigurations": 0,
      "requiresAttention": false
    }
  }
}
```

**Error Responses:**
- `400` - Bad request
- `401` - Unauthorized
- `500` - Server error

### 2. Get Capability Provider

**GET** `/api/v1/site/{siteId}/capabilities/{capabilityName}`

Determine which extension provides a specific capability at this site.

**Parameters:**
- `siteId` (path): Site identifier
- `capabilityName` (path): Capability name (e.g., "erp-integration")

**Response:**
```json
{
  "ok": true,
  "data": {
    "name": "erp-integration",
    "enabled": true,
    "provider": "sap-ebs-adapter",
    "version": "v1.0.0"
  }
}
```

### 3. Get Site Status

**GET** `/api/v1/site/{siteId}/status`

Get site-wide extension configuration status.

**Response:**
```json
{
  "ok": true,
  "data": {
    "siteId": "site-123",
    "totalExtensions": 5,
    "validConfigurations": 5,
    "invalidConfigurations": 0,
    "conflictingConfigurations": 0,
    "unsignedCompliance": [],
    "lastValidatedAt": "2024-11-01T12:00:00Z",
    "requiresAttention": false
  }
}
```

### 4. Pre-Activation Validation

**POST** `/api/v1/site/{siteId}/extensions/{extensionId}/validate`

Validate extension can be activated at site before proceeding.

**Parameters:**
- `siteId` (path): Site identifier
- `extensionId` (path): Extension identifier

**Request Body:**
```json
{
  "version": "v1.0.0",
  "configuration": {
    "erpSystem": "SAP",
    "apiEndpoint": "https://sap.example.com",
    "authMethod": "oauth2"
  }
}
```

**Response (Valid):**
```json
{
  "ok": true,
  "data": {
    "siteId": "site-123",
    "extensionId": "sap-ebs-adapter",
    "valid": true,
    "timestamp": "2024-11-01T10:00:00Z",
    "schemaErrors": [],
    "dependencyErrors": [],
    "conflictErrors": [],
    "complianceWarnings": [
      {
        "aspect": "electronic-signature-validation",
        "message": "Compliance signoff required from quality-focal",
        "severity": "warning"
      }
    ],
    "detectedConflicts": [],
    "dependencyResolution": {
      "satisfied": true,
      "missingDependencies": [],
      "warnings": []
    },
    "missingSignoffs": [
      {
        "extensionId": "sap-ebs-adapter",
        "aspects": ["electronic-signature-validation"]
      }
    ],
    "recommendations": []
  }
}
```

**Response (Invalid):**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Extension validation failed before activation",
    "details": {
      "schemaErrors": [
        {
          "field": "configuration.apiEndpoint",
          "message": "Invalid URL format",
          "severity": "error"
        }
      ],
      "conflictErrors": [
        {
          "type": "policy",
          "extensionId1": "sap-ebs-adapter",
          "extensionId2": "oracle-ebs-adapter",
          "scope": "capability",
          "capability": "erp-integration",
          "policy1": "sap-specific",
          "policy2": "oracle-specific",
          "reason": "Cannot use multiple ERP adapters simultaneously",
          "severity": "error"
        }
      ]
    }
  }
}
```

### 5. Activate Extension

**POST** `/api/v1/site/{siteId}/extensions/{extensionId}/activate`

Activate extension at site with compliance signoffs.

**Parameters:**
- `siteId` (path): Site identifier
- `extensionId` (path): Extension identifier
- `x-user-id` (header): User ID (who is activating)

**Request Body:**
```json
{
  "version": "v1.0.0",
  "configuration": {
    "erpSystem": "SAP",
    "apiEndpoint": "https://sap.example.com",
    "authMethod": "oauth2"
  },
  "complianceSignoffs": [
    {
      "aspect": "electronic-signature-validation",
      "signedBy": "user-456",
      "role": "quality-focal",
      "notes": "Validated against site QMS"
    }
  ]
}
```

**Response (Success):**
```json
{
  "ok": true,
  "data": {
    "siteId": "site-123",
    "extensionId": "sap-ebs-adapter",
    "activated": true,
    "message": "Extension sap-ebs-adapter activated at site site-123"
  }
}
```

**Response (Failure):**
```json
{
  "ok": false,
  "error": {
    "code": "ACTIVATION_ERROR",
    "message": "Extension activation failed",
    "details": { ... }
  }
}
```

### 6. Deactivate Extension

**DELETE** `/api/v1/site/{siteId}/extensions/{extensionId}`

Safely deactivate extension (checks for dependent extensions first).

**Parameters:**
- `siteId` (path): Site identifier
- `extensionId` (path): Extension identifier
- `x-user-id` (header): User ID (who is deactivating)
- `reason` (query): Optional reason for deactivation

**Response (Success):**
```json
{
  "ok": true,
  "data": {
    "siteId": "site-123",
    "extensionId": "sap-ebs-adapter",
    "deactivated": true,
    "message": "Extension sap-ebs-adapter deactivated at site site-123"
  }
}
```

**Response (Has Dependents):**
```json
{
  "ok": false,
  "error": {
    "code": "DEACTIVATION_FAILED",
    "message": "Cannot deactivate sap-ebs-adapter: other extensions depend on it",
    "details": {
      "ok": false,
      "dependentExtensions": [
        "procurement-integration",
        "inventory-sync"
      ]
    }
  }
}
```

### 7. Validate Extension Combination

**POST** `/api/v1/site/{siteId}/extensions/validate-combination`

Check if a set of extensions can coexist at a site.

**Parameters:**
- `siteId` (path): Site identifier

**Request Body:**
```json
{
  "extensions": [
    { "id": "work-instruction-from-mes", "version": "v1.0" },
    { "id": "aerospace-compliance", "version": "v2.0" },
    { "id": "sap-ebs-adapter", "version": "v1.0" }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "siteId": "site-123",
    "valid": true,
    "conflicts": [],
    "warnings": [
      "work-instruction-from-mes (v1.0) requires quality-focal signoff"
    ]
  }
}
```

### 8. Get Compliance Signoffs

**GET** `/api/v1/site/{siteId}/extensions/{extensionId}/signoffs`

Get all compliance signoffs for an extension at a site.

**Response:**
```json
{
  "ok": true,
  "data": {
    "siteId": "site-123",
    "extensionId": "aerospace-compliance",
    "signoffs": [
      {
        "aspect": "electronic-signature-validation",
        "signedBy": "user-456",
        "role": "quality-focal",
        "signedAt": "2024-11-01T10:00:00Z",
        "configurationHash": "hash-abc123def456",
        "notes": "Validated per site QMS"
      }
    ],
    "pendingSignoffs": [
      {
        "aspect": "audit-trail-validation",
        "requiredRole": "compliance-officer"
      }
    ],
    "isFullySigned": false
  }
}
```

### 9. Get Audit Trail

**GET** `/api/v1/site/{siteId}/extensions/{extensionId}/audit-trail`

Get audit trail of all configuration changes for an extension.

**Response:**
```json
{
  "ok": true,
  "data": {
    "siteId": "site-123",
    "extensionId": "sap-ebs-adapter",
    "auditTrail": [
      {
        "id": "audit-1",
        "action": "activated",
        "changedBy": "admin-user",
        "changedAt": "2024-11-01T10:00:00Z",
        "newConfigHash": "hash-abc123",
        "reason": "Initial setup"
      },
      {
        "id": "audit-2",
        "action": "reconfigured",
        "changedBy": "admin-user",
        "changedAt": "2024-11-01T11:00:00Z",
        "oldConfigHash": "hash-abc123",
        "newConfigHash": "hash-def456",
        "reason": "Updated API endpoint"
      }
    ],
    "count": 2
  }
}
```

## Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `MISSING_SITE_ID` | 400 | siteId not provided |
| `UNAUTHORIZED` | 401 | User not authenticated or identified |
| `INVALID_REQUEST` | 400 | Request body malformed or missing required fields |
| `VALIDATION_FAILED` | 400 | Pre-activation validation failed |
| `ACTIVATION_ERROR` | 500 | Error during activation |
| `DEACTIVATION_FAILED` | 400 | Cannot deactivate (has dependents) |
| `DEACTIVATION_ERROR` | 500 | Error during deactivation |
| `NOT_FOUND` | 404 | Extension not found at site |
| `STATUS_ERROR` | 500 | Error retrieving status |
| `AUDIT_TRAIL_ERROR` | 500 | Error retrieving audit trail |
| `SITE_FEATURES_ERROR` | 500 | Error listing features |
| `CAPABILITY_ERROR` | 500 | Error retrieving capability info |
| `COMBINATION_VALIDATION_ERROR` | 500 | Error validating combinations |
| `SIGNOFF_RETRIEVAL_ERROR` | 500 | Error retrieving signoffs |

## Multi-Tenant Isolation

All endpoints are completely site-scoped:
- Data from one site is never visible to another site
- Users can only operate on their own site
- Signoffs are site-specific
- Configurations are not shared between sites

## Implementation Examples

### Express.js

```typescript
import { ConfigurationValidator } from '@machshop/configuration-validator';
import { createExtensionRouter } from '@machshop/configuration-validator/express-adapter';

const validator = new ConfigurationValidator();
app.use('/api/v1', createExtensionRouter(validator));
```

### Using the API

```bash
# Check features at site
curl -H "x-site-id: site-123" \
  http://localhost:3000/api/v1/site/site-123/features

# Validate extension before activation
curl -X POST \
  -H "x-site-id: site-123" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "v1.0.0",
    "configuration": { "setting": "value" }
  }' \
  http://localhost:3000/api/v1/site/site-123/extensions/sap-ebs-adapter/validate

# Activate extension with signoffs
curl -X POST \
  -H "x-site-id: site-123" \
  -H "x-user-id: user-1" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "v1.0.0",
    "configuration": { "setting": "value" },
    "complianceSignoffs": [
      {
        "aspect": "electronic-signature-validation",
        "signedBy": "user-456",
        "role": "quality-focal"
      }
    ]
  }' \
  http://localhost:3000/api/v1/site/site-123/extensions/sap-ebs-adapter/activate
```

## Rate Limiting

Recommended rate limits per site:
- `100 req/min` for read operations
- `10 req/min` for activation/deactivation operations
- `5 req/min` for validation operations

## Future Enhancements

- [ ] Batch activation/deactivation operations
- [ ] Configuration versioning and rollback
- [ ] Compliance report generation
- [ ] Webhook notifications for activation events
- [ ] Policy-based role access control (RBAC)
- [ ] Extension marketplace integration
- [ ] Automatic conflict detection with ML
