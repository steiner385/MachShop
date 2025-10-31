# Andon API Reference

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL and Versioning](#base-url-and-versioning)
- [Common Headers](#common-headers)
- [Error Handling](#error-handling)
- [Alert Endpoints](#alert-endpoints)
- [Issue Type Endpoints](#issue-type-endpoints)
- [Escalation Rule Endpoints](#escalation-rule-endpoints)
- [Configuration Endpoints](#configuration-endpoints)
- [Notification Template Endpoints](#notification-template-endpoints)
- [System Settings Endpoints](#system-settings-endpoints)
- [Analytics Endpoints](#analytics-endpoints)
- [Webhook Events](#webhook-events)
- [Rate Limiting](#rate-limiting)
- [Code Examples](#code-examples)

## Overview

The Andon API provides programmatic access to all Andon system functionality. This RESTful API uses JSON for request and response bodies and follows standard HTTP conventions.

### API Design Principles

- **RESTful**: Standard HTTP verbs (GET, POST, PUT, DELETE)
- **Predictable**: Consistent URL patterns and response formats
- **Versioned**: API versioning through URL path
- **Documented**: Comprehensive documentation with examples
- **Secure**: JWT authentication and role-based access control

## Authentication

### JWT Token Authentication

All API requests require authentication using JWT tokens.

#### Obtaining a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "role": "SUPERVISOR"
  }
}
```

#### Using the Token

Include the token in the Authorization header:

```http
GET /api/andon/alerts
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Key Authentication (Integrations)

For system integrations, use API keys:

```http
GET /api/andon/alerts
X-API-Key: your-api-key-here
```

## Base URL and Versioning

### Base URL

```
Production: https://api.machshop.com/api
Staging: https://staging-api.machshop.com/api
Development: http://localhost:3001/api
```

### API Version

Current version: `v1` (implied, not in URL path)

Future versions will use: `/api/v2/andon/...`

## Common Headers

### Request Headers

| Header | Required | Description | Example |
|--------|----------|-------------|---------|
| `Authorization` | Yes* | JWT token | `Bearer eyJ...` |
| `X-API-Key` | Yes* | API key (alternative to JWT) | `api_key_123` |
| `Content-Type` | Yes (POST/PUT) | Request body type | `application/json` |
| `X-Request-ID` | No | Unique request ID for tracking | `req-123-456` |
| `X-Site-ID` | No | Filter by specific site | `site-001` |

*One authentication method required

### Response Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-Request-ID` | Echo of request ID | `req-123-456` |
| `X-Rate-Limit-Remaining` | Remaining requests | `999` |
| `X-Rate-Limit-Reset` | Reset timestamp | `1640000000` |
| `X-Total-Count` | Total items (pagination) | `150` |

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "AND-001",
    "message": "Invalid issue type",
    "details": "Issue type 'INVALID' does not exist",
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/api/andon/alerts",
    "requestId": "req-123-456"
  }
}
```

### HTTP Status Codes

| Status | Meaning | Common Causes |
|--------|---------|---------------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 204 | No Content | Delete successful, no body |
| 400 | Bad Request | Invalid parameters or body |
| 401 | Unauthorized | Missing or invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate or conflicting data |
| 422 | Unprocessable | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

## Alert Endpoints

### Create Alert

**Endpoint:** `POST /api/andon/alerts`

**Description:** Create a new Andon alert

**Request Body:**
```json
{
  "title": "Machine jam at Station 3",
  "description": "Conveyor belt stopped, material backing up",
  "issueTypeId": "issue-type-equipment",
  "severity": "HIGH",
  "priority": "URGENT",
  "siteId": "site-001",
  "areaId": "area-production",
  "workCenterId": "wc-assembly-1",
  "equipmentId": "eq-conveyor-3",
  "workOrderId": "wo-2024-001",
  "raisedById": "user-123",
  "metadata": {
    "errorCode": "E-501",
    "temperature": 85
  },
  "attachments": [
    {
      "type": "image",
      "url": "https://storage.example.com/photo1.jpg",
      "caption": "Jam location"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": "alert-456",
  "alertNumber": "AND-2024-001234",
  "title": "Machine jam at Station 3",
  "status": "OPEN",
  "severity": "HIGH",
  "priority": "URGENT",
  "issueType": {
    "id": "issue-type-equipment",
    "typeName": "Equipment",
    "typeCode": "EQUIPMENT"
  },
  "raisedBy": {
    "id": "user-123",
    "name": "John Doe"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "nextEscalationAt": "2024-01-15T10:45:00Z"
}
```

### Get Alert by ID

**Endpoint:** `GET /api/andon/alerts/{id}`

**Description:** Retrieve a specific alert

**Response:** `200 OK`
```json
{
  "id": "alert-456",
  "alertNumber": "AND-2024-001234",
  "title": "Machine jam at Station 3",
  "description": "Conveyor belt stopped, material backing up",
  "status": "IN_PROGRESS",
  "severity": "HIGH",
  "priority": "URGENT",
  "issueType": {
    "id": "issue-type-equipment",
    "typeName": "Equipment"
  },
  "site": {
    "id": "site-001",
    "siteName": "Plant A"
  },
  "workCenter": {
    "id": "wc-assembly-1",
    "name": "Assembly Line 1"
  },
  "statusHistory": [
    {
      "status": "OPEN",
      "changedAt": "2024-01-15T10:30:00Z",
      "changedBy": "system"
    },
    {
      "status": "ACKNOWLEDGED",
      "changedAt": "2024-01-15T10:32:00Z",
      "changedBy": "user-456"
    }
  ],
  "escalationHistory": [],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:32:00Z"
}
```

### List Alerts

**Endpoint:** `GET /api/andon/alerts`

**Description:** List alerts with filtering and pagination

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string[] | Filter by status | `OPEN,IN_PROGRESS` |
| `severity` | string[] | Filter by severity | `HIGH,CRITICAL` |
| `priority` | string[] | Filter by priority | `URGENT,HIGH` |
| `issueTypeId` | string | Filter by issue type | `issue-type-equipment` |
| `siteId` | string | Filter by site | `site-001` |
| `areaId` | string | Filter by area | `area-production` |
| `workCenterId` | string | Filter by work center | `wc-assembly-1` |
| `raisedById` | string | Filter by reporter | `user-123` |
| `assignedToId` | string | Filter by assignee | `user-456` |
| `dateFrom` | datetime | Start date filter | `2024-01-01T00:00:00Z` |
| `dateTo` | datetime | End date filter | `2024-01-31T23:59:59Z` |
| `search` | string | Text search | `conveyor` |
| `page` | number | Page number | `1` |
| `limit` | number | Items per page | `20` |
| `sortBy` | string | Sort field | `createdAt` |
| `sortOrder` | string | Sort direction | `DESC` |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "alert-456",
      "alertNumber": "AND-2024-001234",
      "title": "Machine jam at Station 3",
      "status": "OPEN",
      "severity": "HIGH",
      "priority": "URGENT",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Update Alert

**Endpoint:** `PUT /api/andon/alerts/{id}`

**Description:** Update an existing alert

**Request Body:**
```json
{
  "title": "Updated: Machine jam cleared",
  "status": "IN_PROGRESS",
  "assignedToId": "user-789",
  "priority": "NORMAL",
  "metadata": {
    "updateReason": "Issue partially resolved"
  }
}
```

**Response:** `200 OK`

### Resolve Alert

**Endpoint:** `POST /api/andon/alerts/{id}/resolve`

**Description:** Mark an alert as resolved

**Request Body:**
```json
{
  "resolutionNotes": "Belt realigned and debris cleared",
  "resolutionActionTaken": "Preventive maintenance scheduled",
  "resolvedById": "user-456"
}
```

**Response:** `200 OK`

### Close Alert

**Endpoint:** `POST /api/andon/alerts/{id}/close`

**Description:** Close a resolved alert

**Request Body:**
```json
{
  "closureNotes": "Verified by supervisor"
}
```

**Response:** `200 OK`

### Escalate Alert

**Endpoint:** `POST /api/andon/alerts/{id}/escalate`

**Description:** Manually escalate an alert

**Request Body:**
```json
{
  "reason": "Requires specialized expertise",
  "targetLevel": 2,
  "notifyUserIds": ["user-999"]
}
```

**Response:** `200 OK`

## Issue Type Endpoints

### List Issue Types

**Endpoint:** `GET /api/andon/issue-types`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `siteId` | string | Filter by site | `site-001` |
| `isActive` | boolean | Active only | `true` |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "issue-type-equipment",
      "typeCode": "EQUIPMENT",
      "typeName": "Equipment Issue",
      "description": "Equipment-related problems",
      "defaultSeverity": "HIGH",
      "defaultPriority": "NORMAL",
      "requiresAttachment": false,
      "requiresWorkOrder": false,
      "enableEscalation": true,
      "escalationTimeoutMins": 30,
      "iconName": "wrench",
      "colorCode": "#FFA500",
      "isActive": true
    }
  ]
}
```

### Create Issue Type

**Endpoint:** `POST /api/andon/issue-types`

**Request Body:**
```json
{
  "typeCode": "CUSTOM",
  "typeName": "Custom Issue",
  "description": "Custom issue type",
  "defaultSeverity": "MEDIUM",
  "defaultPriority": "NORMAL",
  "requiresAttachment": true,
  "autoAssignRole": "SUPERVISOR",
  "escalationTimeoutMins": 20,
  "iconName": "custom-icon",
  "colorCode": "#123456"
}
```

**Response:** `201 Created`

### Update Issue Type

**Endpoint:** `PUT /api/andon/issue-types/{id}`

**Request Body:**
```json
{
  "typeName": "Updated Name",
  "defaultSeverity": "HIGH",
  "escalationTimeoutMins": 15
}
```

**Response:** `200 OK`

### Delete Issue Type

**Endpoint:** `DELETE /api/andon/issue-types/{id}`

**Response:** `204 No Content`

## Escalation Rule Endpoints

### List Escalation Rules

**Endpoint:** `GET /api/andon/escalation-rules`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `siteId` | string | Filter by site | `site-001` |
| `issueTypeId` | string | Filter by issue type | `issue-type-equipment` |
| `isActive` | boolean | Active only | `true` |
| `escalationLevel` | number | Filter by level | `1` |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "rule-123",
      "ruleName": "Equipment Critical Escalation",
      "description": "Escalate critical equipment issues",
      "siteId": null,
      "issueTypeId": "issue-type-equipment",
      "triggerSeverity": ["CRITICAL"],
      "triggerAfterMinutes": 10,
      "escalationLevel": 1,
      "notifyRoles": ["MAINTENANCE_MANAGER"],
      "notifyChannels": ["EMAIL", "SMS"],
      "priority": 100,
      "isActive": true,
      "executionCount": 45,
      "lastExecutedAt": "2024-01-15T09:00:00Z"
    }
  ]
}
```

### Create Escalation Rule

**Endpoint:** `POST /api/andon/escalation-rules`

**Request Body:**
```json
{
  "ruleName": "New Escalation Rule",
  "description": "Description of the rule",
  "siteId": "site-001",
  "issueTypeId": "issue-type-quality",
  "triggerSeverity": ["HIGH", "CRITICAL"],
  "triggerAfterMinutes": 20,
  "escalationLevel": 1,
  "notifyUserIds": ["user-123", "user-456"],
  "notifyRoles": ["QUALITY_MANAGER"],
  "notifyChannels": ["EMAIL"],
  "assignToRole": "QUALITY_MANAGER",
  "conditions": {
    "AND": [
      {"field": "workCenter", "operator": "IN", "value": ["wc-001", "wc-002"]}
    ]
  },
  "priority": 150
}
```

**Response:** `201 Created`

### Update Escalation Rule

**Endpoint:** `PUT /api/andon/escalation-rules/{id}`

**Request Body:**
```json
{
  "triggerAfterMinutes": 15,
  "notifyChannels": ["EMAIL", "SMS", "PUSH"],
  "isActive": true
}
```

**Response:** `200 OK`

### Delete Escalation Rule

**Endpoint:** `DELETE /api/andon/escalation-rules/{id}`

**Response:** `204 No Content`

### Test Escalation Rule

**Endpoint:** `POST /api/andon/escalation-rules/{id}/test`

**Description:** Test a rule against a sample alert

**Request Body:**
```json
{
  "testAlert": {
    "severity": "HIGH",
    "issueTypeId": "issue-type-equipment",
    "siteId": "site-001",
    "metadata": {}
  }
}
```

**Response:** `200 OK`
```json
{
  "wouldTrigger": true,
  "matchedConditions": ["severity", "issueType"],
  "actions": {
    "notifyUsers": ["user-123"],
    "notifyRoles": ["MAINTENANCE_MANAGER"],
    "channels": ["EMAIL", "SMS"]
  }
}
```

## Configuration Endpoints

### List Configurations

**Endpoint:** `GET /api/andon/config/configurations`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category` | string | Filter by category | `ESCALATION` |
| `isActive` | boolean | Active only | `true` |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "config-001",
      "configKey": "andon.escalation.base_delay",
      "configValue": 30,
      "description": "Base escalation delay in minutes",
      "dataType": "NUMBER",
      "category": "ESCALATION",
      "isRequired": true,
      "defaultValue": 30,
      "isActive": true
    }
  ]
}
```

### Get Configuration

**Endpoint:** `GET /api/andon/config/configurations/{key}`

**Response:** `200 OK`
```json
{
  "configKey": "andon.escalation.base_delay",
  "configValue": 30,
  "effectiveValue": 15,
  "source": "SITE_OVERRIDE",
  "description": "Base escalation delay in minutes"
}
```

### Update Configuration

**Endpoint:** `PUT /api/andon/config/configurations/{key}`

**Request Body:**
```json
{
  "configValue": 25,
  "description": "Updated delay time"
}
```

**Response:** `200 OK`

### Get Site Configuration

**Endpoint:** `GET /api/andon/config/site-configurations/{siteId}`

**Response:** `200 OK`
```json
{
  "siteId": "site-001",
  "configurations": [
    {
      "configKey": "andon.escalation.base_delay",
      "configValue": 15,
      "isOverride": true
    }
  ]
}
```

### Update Site Configuration

**Endpoint:** `PUT /api/andon/config/site-configurations/{siteId}`

**Request Body:**
```json
{
  "configurations": [
    {
      "configKey": "andon.escalation.base_delay",
      "configValue": 20,
      "isOverride": true
    }
  ]
}
```

**Response:** `200 OK`

### Export Configuration

**Endpoint:** `GET /api/andon/config/export`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `format` | string | Export format | `json` or `yaml` |
| `siteId` | string | Site-specific export | `site-001` |

**Response:** `200 OK`
```json
{
  "version": "1.0",
  "exportedAt": "2024-01-15T10:00:00Z",
  "configurations": {
    "global": [...],
    "sites": {...},
    "issueTypes": [...],
    "escalationRules": [...],
    "templates": [...]
  }
}
```

### Import Configuration

**Endpoint:** `POST /api/andon/config/import`

**Request Body:**
```json
{
  "version": "1.0",
  "configurations": {...},
  "options": {
    "overwrite": false,
    "validate": true,
    "dryRun": true
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "imported": {
    "configurations": 15,
    "issueTypes": 8,
    "escalationRules": 12
  },
  "errors": [],
  "warnings": [
    "Configuration 'andon.custom' not recognized"
  ]
}
```

## Notification Template Endpoints

### List Templates

**Endpoint:** `GET /api/andon/config/templates`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `siteId` | string | Filter by site | `site-001` |
| `isActive` | boolean | Active only | `true` |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "template-001",
      "templateKey": "ALERT_CREATED",
      "templateName": "Alert Created Notification",
      "subject": "New {{severity}} Alert: {{title}}",
      "bodyTemplate": "Alert #{{alertNumber}} has been created...",
      "variables": ["alertNumber", "title", "severity"],
      "emailTemplate": "<html>...</html>",
      "smsTemplate": "Alert {{alertNumber}}: {{title}}",
      "isActive": true
    }
  ]
}
```

### Create Template

**Endpoint:** `POST /api/andon/config/templates`

**Request Body:**
```json
{
  "templateKey": "CUSTOM_ALERT",
  "templateName": "Custom Alert Template",
  "subject": "Custom: {{title}}",
  "bodyTemplate": "Custom alert body...",
  "variables": ["title", "description"],
  "emailTemplate": "<html>{{content}}</html>",
  "smsTemplate": "{{title}} - Reply ACK"
}
```

**Response:** `201 Created`

### Update Template

**Endpoint:** `PUT /api/andon/config/templates/{id}`

**Request Body:**
```json
{
  "subject": "Updated: {{title}}",
  "bodyTemplate": "Updated template body..."
}
```

**Response:** `200 OK`

### Preview Template

**Endpoint:** `POST /api/andon/config/templates/{id}/preview`

**Description:** Preview template with sample data

**Request Body:**
```json
{
  "sampleData": {
    "alertNumber": "AND-2024-001234",
    "title": "Sample Alert",
    "severity": "HIGH"
  }
}
```

**Response:** `200 OK`
```json
{
  "subject": "New HIGH Alert: Sample Alert",
  "body": "Alert #AND-2024-001234 has been created...",
  "email": "<html>...</html>",
  "sms": "Alert AND-2024-001234: Sample Alert"
}
```

## System Settings Endpoints

### Get System Settings

**Endpoint:** `GET /api/andon/config/system-settings`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `siteId` | string | Get site-specific settings | `site-001` |

**Response:** `200 OK`
```json
{
  "id": "settings-001",
  "siteId": null,
  "andonEnabled": true,
  "escalationEnabled": true,
  "notificationsEnabled": true,
  "defaultSeverity": "MEDIUM",
  "defaultPriority": "NORMAL",
  "autoAssignEnabled": true,
  "defaultResponseTimeMin": 15,
  "maxEscalationLevels": 3,
  "baseEscalationDelayMin": 30,
  "enableMobileAccess": true,
  "enableKioskMode": true,
  "requireComments": false,
  "allowAnonymousReports": false
}
```

### Update System Settings

**Endpoint:** `PUT /api/andon/config/system-settings`

**Request Body:**
```json
{
  "escalationEnabled": true,
  "defaultResponseTimeMin": 10,
  "maxEscalationLevels": 4
}
```

**Response:** `200 OK`

## Analytics Endpoints

### Get Alert Statistics

**Endpoint:** `GET /api/andon/statistics`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `siteId` | string | Filter by site | `site-001` |
| `dateFrom` | datetime | Start date | `2024-01-01T00:00:00Z` |
| `dateTo` | datetime | End date | `2024-01-31T23:59:59Z` |
| `groupBy` | string | Group results | `day`, `week`, `month` |

**Response:** `200 OK`
```json
{
  "summary": {
    "totalAlerts": 1234,
    "openAlerts": 47,
    "averageResponseTime": 8.5,
    "averageResolutionTime": 45.2,
    "escalationRate": 15.3
  },
  "byStatus": {
    "OPEN": 47,
    "IN_PROGRESS": 23,
    "RESOLVED": 1150,
    "CLOSED": 14
  },
  "bySeverity": {
    "CRITICAL": 12,
    "HIGH": 234,
    "MEDIUM": 678,
    "LOW": 310
  },
  "byIssueType": [
    {
      "typeCode": "EQUIPMENT",
      "typeName": "Equipment",
      "count": 456,
      "percentage": 37.0
    }
  ],
  "trends": [
    {
      "date": "2024-01-01",
      "created": 45,
      "resolved": 42,
      "escalated": 3
    }
  ]
}
```

### Get Performance Metrics

**Endpoint:** `GET /api/andon/metrics`

**Response:** `200 OK`
```json
{
  "realtime": {
    "alertsPerHour": 12.5,
    "currentBacklog": 47,
    "activeEscalations": 3
  },
  "sla": {
    "responseTimeCompliance": 94.5,
    "resolutionTimeCompliance": 87.3,
    "escalationEffectiveness": 92.1
  },
  "capacity": {
    "averageAlertsPerDay": 150,
    "peakHour": "14:00",
    "peakLoad": 45
  }
}
```

### Get Alert History

**Endpoint:** `GET /api/andon/alerts/{id}/history`

**Response:** `200 OK`
```json
{
  "alertId": "alert-456",
  "events": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "event": "CREATED",
      "user": "user-123",
      "details": "Alert created"
    },
    {
      "timestamp": "2024-01-15T10:32:00Z",
      "event": "ACKNOWLEDGED",
      "user": "user-456",
      "details": "Alert acknowledged by supervisor"
    },
    {
      "timestamp": "2024-01-15T10:45:00Z",
      "event": "ESCALATED",
      "user": "system",
      "details": "Auto-escalated to level 1"
    }
  ]
}
```

## Webhook Events

### Webhook Configuration

Configure webhooks to receive real-time notifications:

```http
POST /api/andon/webhooks
Content-Type: application/json

{
  "url": "https://your-system.com/webhook",
  "events": ["alert.created", "alert.escalated", "alert.resolved"],
  "secret": "your-webhook-secret",
  "isActive": true
}
```

### Event Types

| Event | Description | Payload |
|-------|-------------|---------|
| `alert.created` | New alert created | Alert object |
| `alert.updated` | Alert updated | Alert object + changes |
| `alert.escalated` | Alert escalated | Alert + escalation details |
| `alert.resolved` | Alert resolved | Alert + resolution |
| `alert.closed` | Alert closed | Alert object |

### Webhook Payload Example

```json
{
  "event": "alert.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "alert-456",
    "alertNumber": "AND-2024-001234",
    "title": "Machine jam at Station 3",
    "severity": "HIGH",
    "priority": "URGENT"
  },
  "signature": "sha256=abcd1234..."
}
```

### Webhook Security

Verify webhook signatures:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return `sha256=${hash}` === signature;
}
```

## Rate Limiting

### Rate Limits

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 10 | 1 minute |
| Alert Creation | 100 | 1 minute |
| Alert Queries | 1000 | 1 minute |
| Configuration | 50 | 1 minute |
| Analytics | 100 | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
```

### Handling Rate Limits

When rate limited, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "retryAfter": 60
  }
}
```

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

class AndonClient {
  constructor(apiUrl, token) {
    this.api = axios.create({
      baseURL: apiUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createAlert(alertData) {
    try {
      const response = await this.api.post('/andon/alerts', alertData);
      return response.data;
    } catch (error) {
      console.error('Error creating alert:', error.response.data);
      throw error;
    }
  }

  async getAlerts(filters = {}) {
    const response = await this.api.get('/andon/alerts', { params: filters });
    return response.data;
  }

  async escalateAlert(alertId, reason) {
    const response = await this.api.post(`/andon/alerts/${alertId}/escalate`, {
      reason
    });
    return response.data;
  }
}

// Usage
const client = new AndonClient('https://api.machshop.com/api', 'your-token');

// Create an alert
const alert = await client.createAlert({
  title: 'Equipment malfunction',
  issueTypeId: 'issue-type-equipment',
  severity: 'HIGH',
  raisedById: 'user-123'
});

// Get open alerts
const openAlerts = await client.getAlerts({
  status: 'OPEN',
  limit: 10
});
```

### Python

```python
import requests
from typing import Dict, List, Optional

class AndonClient:
    def __init__(self, api_url: str, token: str):
        self.api_url = api_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def create_alert(self, alert_data: Dict) -> Dict:
        """Create a new Andon alert"""
        response = requests.post(
            f'{self.api_url}/andon/alerts',
            json=alert_data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def get_alerts(self, **filters) -> Dict:
        """Get alerts with optional filters"""
        response = requests.get(
            f'{self.api_url}/andon/alerts',
            params=filters,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def resolve_alert(self, alert_id: str, notes: str) -> Dict:
        """Resolve an alert"""
        response = requests.post(
            f'{self.api_url}/andon/alerts/{alert_id}/resolve',
            json={'resolutionNotes': notes},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
client = AndonClient('https://api.machshop.com/api', 'your-token')

# Create alert
alert = client.create_alert({
    'title': 'Quality issue detected',
    'issueTypeId': 'issue-type-quality',
    'severity': 'HIGH',
    'raisedById': 'user-123'
})

# Get alerts
alerts = client.get_alerts(status='OPEN', severity='HIGH')
```

### cURL Examples

```bash
# Create alert
curl -X POST https://api.machshop.com/api/andon/alerts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Machine breakdown",
    "issueTypeId": "issue-type-equipment",
    "severity": "CRITICAL",
    "raisedById": "user-123"
  }'

# Get alerts
curl -X GET "https://api.machshop.com/api/andon/alerts?status=OPEN&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update alert
curl -X PUT https://api.machshop.com/api/andon/alerts/alert-456 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS",
    "assignedToId": "user-789"
  }'

# Resolve alert
curl -X POST https://api.machshop.com/api/andon/alerts/alert-456/resolve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolutionNotes": "Issue fixed",
    "resolutionActionTaken": "Replaced component"
  }'
```

### PowerShell

```powershell
# Set up headers
$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN"
    "Content-Type" = "application/json"
}

# Create alert
$alertData = @{
    title = "Equipment issue"
    issueTypeId = "issue-type-equipment"
    severity = "HIGH"
    raisedById = "user-123"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "https://api.machshop.com/api/andon/alerts" `
    -Method POST `
    -Headers $headers `
    -Body $alertData

# Get alerts
$alerts = Invoke-RestMethod `
    -Uri "https://api.machshop.com/api/andon/alerts?status=OPEN" `
    -Method GET `
    -Headers $headers
```

---

*For additional API support, contact the development team or refer to the OpenAPI specification at `/api/docs`.*