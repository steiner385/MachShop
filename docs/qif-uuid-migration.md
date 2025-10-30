# QIF UUID Migration - NIST AMS 300-12 Compliance

## Overview

This document describes the implementation of GitHub Issue #219: "Quality Management: Migrate QIF Models to Use UUID per NIST Standards". This migration enhances the Quality Information Framework (QIF) implementation to support NIST AMS 300-12 compliant UUID identifiers while maintaining backward compatibility with existing string-based identifiers.

## NIST AMS 300-12 Standard

The NIST AMS 300-12 standard ("Quality Information Framework (QIF) Application Protocol Interface Specification") recommends the use of UUID version 4 identifiers for quality data exchange to:

- Ensure global uniqueness across distributed systems
- Enable secure data sharing between organizations
- Support aerospace industry requirements (AS9102 First Article Inspection)
- Facilitate cross-enterprise quality data integration

## Implementation Summary

### Database Schema Changes

All QIF models have been enhanced with UUID fields while maintaining legacy string IDs for backward compatibility:

#### QIFMeasurementPlan
```prisma
model QIFMeasurementPlan {
  id              String   @id @default(cuid())
  qifPlanUuid     String   @unique @default(uuid()) /// NIST AMS 300-12 compliant UUID
  qifPlanId       String?  @unique                  /// Legacy ID (deprecated)
  // ... other fields

  @@index([qifPlanUuid])
  @@index([qifPlanId])
}
```

#### QIFCharacteristic
```prisma
model QIFCharacteristic {
  id                   String   @id @default(cuid())
  characteristicUuid   String   @unique @default(uuid()) /// NIST AMS 300-12 compliant UUID
  characteristicId     String?                           /// Legacy ID (deprecated)
  // ... other fields

  @@index([characteristicUuid])
  @@index([characteristicId])
}
```

#### QIFMeasurementResult
```prisma
model QIFMeasurementResult {
  id               String   @id @default(cuid())
  qifResultsUuid   String   @unique @default(uuid()) /// NIST AMS 300-12 compliant UUID
  qifResultsId     String?  @unique                  /// Legacy ID (deprecated)
  // ... other fields

  @@index([qifResultsUuid])
  @@index([qifResultsId])
}
```

#### QIFMeasurement
```prisma
model QIFMeasurement {
  id                    String   @id @default(cuid())
  characteristicUuidRef String?  /// UUID reference to QIFCharacteristic
  characteristicId      String?  /// Legacy ID reference (deprecated)
  // ... other fields

  @@index([characteristicUuidRef])
  @@index([characteristicId])
}
```

### Service Layer Enhancements

#### QIF Service Configuration
```typescript
const qifService = new QIFService({
  preferUuids: true,           // Use UUIDs when available
  requireUuids: false,         // Allow legacy IDs during migration
  allowLegacyIds: true,        // Support backward compatibility
  validateUuidFormat: true,    // Validate UUID format strictly
  migrationMode: true,         // Enable migration-specific features
  nistCompliance: true,        // Enforce NIST AMS 300-12 standards
});
```

#### UUID Validation and Generation
```typescript
// Generate NIST-compliant UUID
const uuid = qifService.generateQIFUUID();

// Validate UUID format and NIST compliance
const validation = qifService.validateIdentifier(uuid);
console.log(validation.isNistCompliant); // true for UUID v4

// Resolve identifier (UUID or legacy)
const identifier = qifService.resolveQIFIdentifier(uuidField, legacyField);
console.log(identifier.primary); // Preferred identifier to use
```

### API Enhancements

#### Enhanced QIF Plan Generation
```http
POST /api/v1/fai/:id/qif/plan
Content-Type: application/json

{
  "planUuid": "550e8400-e29b-41d4-a716-446655440000",
  "includeUuids": true,
  "nistCompliance": true
}
```

#### UUID-based Lookups
```http
GET /api/v1/fai/qif/plan/:qifPlanId?format=json&includeMetadata=true
```

#### QIF Validation
```http
POST /api/v1/fai/qif/validate
Content-Type: application/json

{
  "qifXml": "<QIFDocument>...</QIFDocument>",
  "checkNistCompliance": true
}
```

## Migration Process

### 1. Database Migration

Run the migration script to populate UUID fields for existing records:

```bash
# Dry run (recommended first)
npm run migrate:qif-uuid

# Production migration
npm run migrate:qif-uuid -- --production
```

The migration script:
- Generates UUID v4 for all existing QIF records
- Updates UUID reference fields in QIFMeasurement table
- Maintains existing legacy IDs for backward compatibility
- Provides rollback capabilities

### 2. Application Configuration

Update your QIF service configuration based on migration phase:

#### Phase 1: Migration Mode (Current)
```typescript
const config = {
  preferUuids: true,
  requireUuids: false,
  allowLegacyIds: true,
  migrationMode: true,
};
```

#### Phase 2: UUID-Preferred Mode (After Migration)
```typescript
const config = {
  preferUuids: true,
  requireUuids: false,
  allowLegacyIds: true,
  migrationMode: false,
};
```

#### Phase 3: UUID-Only Mode (Future)
```typescript
const config = {
  preferUuids: true,
  requireUuids: true,
  allowLegacyIds: false,
  migrationMode: false,
};
```

### 3. Client Application Updates

Update client applications to handle UUID responses:

```typescript
// Enhanced QIF Plan interface
interface QIFPlan {
  qifPlanUuid?: string;     // NIST AMS 300-12 compliant (preferred)
  qifPlanId?: string;       // Legacy ID (deprecated)
  // ... other fields
}

// Use UUID when available
const planId = plan.qifPlanUuid || plan.qifPlanId;
```

## API Documentation

### QIF Plan Operations

#### Generate QIF Measurement Plan
```http
POST /api/v1/fai/:id/qif/plan
Content-Type: application/json

{
  "planUuid": "550e8400-e29b-41d4-a716-446655440000",  // Optional: specific UUID
  "includeUuids": true,                                 // Include UUIDs in output
  "nistCompliance": true                                // Enforce NIST compliance
}
```

**Response Headers:**
- `X-QIF-Version: 3.0.0`
- `X-NIST-Compliance: AMS-300-12`
- `Content-Type: application/xml`

#### Get QIF Plan by ID
```http
GET /api/v1/fai/qif/plan/:qifPlanId
Query Parameters:
- format: xml|json (default: xml)
- includeMetadata: boolean (default: false)
```

Supports both UUID and legacy ID formats:
- `GET /api/v1/fai/qif/plan/550e8400-e29b-41d4-a716-446655440000` (UUID)
- `GET /api/v1/fai/qif/plan/PLAN-001` (Legacy ID)

### QIF Results Operations

#### Generate QIF Measurement Results
```http
POST /api/v1/fai/:id/qif/results
Content-Type: application/json

{
  "serialNumber": "SN-001",
  "resultsUuid": "550e8400-e29b-41d4-a716-446655440001",
  "planUuid": "550e8400-e29b-41d4-a716-446655440000",
  "includeUuids": true,
  "nistCompliance": true
}
```

#### Get QIF Results by ID
```http
GET /api/v1/fai/qif/results/:qifResultsId
Query Parameters:
- format: xml|json (default: xml)
- includeMetadata: boolean (default: false)
```

### QIF Validation

#### Validate QIF Document
```http
POST /api/v1/fai/qif/validate
Content-Type: application/json

{
  "qifXml": "<QIFDocument>...</QIFDocument>",
  "checkNistCompliance": true
}
```

**Response:**
```json
{
  "isValid": true,
  "hasUuids": true,
  "nistCompliant": true,
  "uuidValidations": [
    {
      "field": "MeasurementPlan.id",
      "value": "550e8400-e29b-41d4-a716-446655440000",
      "validation": {
        "isValid": true,
        "isNistCompliant": true,
        "version": 4
      }
    }
  ],
  "warnings": [],
  "errors": []
}
```

### CMM Integration

#### Export QIF Plan (UUID-Enhanced)
```http
GET /api/v1/cmm/qif/plan/:qifPlanId
Query Parameters:
- format: xml|json (default: xml)
- includeUuids: boolean (default: true)
- nistCompliance: boolean (default: true)
- validateUuid: boolean (default: true)
```

**Response Headers:**
- `X-QIF-Version: 3.0.0`
- `X-NIST-Compliance: AMS-300-12`
- `X-UUID-Support: true`

## Validation and Middleware

### UUID Validation Middleware

Use built-in middleware for automatic UUID validation:

```typescript
import {
  validateQIFPlanIdParam,
  validateNISTCompliantUUIDs,
  validateQIFImportRequest
} from '../middleware/qif-uuid-validation';

// Validate plan ID parameter (supports UUID and legacy)
router.get('/plan/:qifPlanId', validateQIFPlanIdParam, (req, res) => {
  const validatedId = req.validatedUUIDs?.qifPlanId?.normalized;
  // Use validated and normalized ID
});

// Enforce NIST-compliant UUIDs only
router.post('/strict/:uuid', validateNISTCompliantUUIDs, (req, res) => {
  // Only UUID v4 accepted
});

// Validate QIF import requests
router.post('/import', validateQIFImportRequest, (req, res) => {
  // Request body validated with UUID checking
});
```

### Custom Validation

```typescript
import {
  validateQIFUUID,
  UUIDSchema,
  NISTCompliantUUIDSchema
} from '../utils/qif-uuid-validation';

// Comprehensive UUID validation
const validation = validateQIFUUID(uuid);
if (validation.isValid && validation.isNistCompliant) {
  // Proceed with NIST-compliant UUID
}

// Zod schema validation
const schema = z.object({
  planUuid: NISTCompliantUUIDSchema,
  resultsUuid: UUIDSchema.optional(),
});
```

## Monitoring and Health Checks

### System Health Validation

```typescript
import { QIFValidationService } from '../services/QIFValidationService';

const validationService = new QIFValidationService(prisma);

// Generate comprehensive validation report
const report = await validationService.generateValidationReport();
console.log(report.systemHealth); // 'HEALTHY' | 'WARNING' | 'CRITICAL'
console.log(report.migrationProgress.migrationPercentage); // % complete
```

### UUID Uniqueness Check

```typescript
// Validate UUID uniqueness across all QIF entities
const uniquenessCheck = await validationService.validateUUIDUniqueness();
if (!uniquenessCheck.isUnique) {
  console.log(`Found ${uniquenessCheck.duplicates.length} duplicate UUIDs`);
}
```

## Error Handling

### UUID Validation Errors

API endpoints return structured error responses for UUID validation failures:

```json
{
  "error": "UUID validation failed",
  "details": [
    "Invalid UUID format - must be a valid RFC 4122 UUID",
    "UUID version 1 detected - NIST AMS 300-12 recommends UUID v4"
  ],
  "field": "planUuid",
  "providedValue": "invalid-uuid",
  "nistCompliance": "AMS-300-12",
  "supportedFormats": [
    "UUID v4 (recommended)",
    "Legacy string ID (if enabled)"
  ]
}
```

### Common Error Scenarios

1. **Invalid UUID Format**
   ```json
   {
     "error": "Invalid UUID format",
     "details": ["Must be a valid RFC 4122 UUID"],
     "providedValue": "not-a-uuid"
   }
   ```

2. **Non-NIST Compliant UUID**
   ```json
   {
     "error": "Non-NIST compliant UUID",
     "details": ["UUID version 1 detected - NIST AMS 300-12 recommends UUID v4"],
     "warnings": ["Consider upgrading to UUID v4 for NIST compliance"]
   }
   ```

3. **Legacy ID in Strict Mode**
   ```json
   {
     "error": "UUID required",
     "details": ["Legacy IDs not allowed in current configuration"],
     "nistCompliance": "AMS-300-12"
   }
   ```

## Testing

### Running UUID Tests

```bash
# Run all UUID-related tests
npm test -- uuid

# Run specific test suites
npm test src/tests/utils/qif-uuid-validation.test.ts
npm test src/tests/services/QIFValidationService.test.ts
npm test src/tests/middleware/qif-uuid-validation.test.ts
npm test src/tests/services/QIFService-uuid.test.ts
```

### Test Coverage

The test suite includes:
- **Unit tests** for UUID validation functions
- **Integration tests** for service interactions
- **API tests** for route validation
- **Performance tests** for large datasets
- **Error handling tests** for edge cases

## Best Practices

### 1. UUID Generation
- Always use UUID v4 for new records (NIST AMS 300-12 compliant)
- Use the service's `generateQIFUUID()` method for consistency
- Store UUIDs in lowercase for consistency

### 2. Identifier Resolution
- Prefer UUIDs over legacy IDs when both are available
- Use `resolveQIFIdentifier()` for consistent identifier handling
- Validate UUID format before database operations

### 3. Migration Strategy
- Run migration scripts in dry-run mode first
- Monitor system health during migration
- Maintain rollback capabilities
- Update client applications incrementally

### 4. API Design
- Include UUID support in all new endpoints
- Provide both XML and JSON response formats
- Add NIST compliance headers for transparency
- Support backward compatibility during transition

### 5. Error Handling
- Provide clear error messages for UUID validation failures
- Include remediation suggestions in error responses
- Log UUID validation warnings for monitoring
- Handle null/undefined UUIDs gracefully

## Rollback Procedures

### Database Rollback

If rollback is needed, use the saved rollback data:

```bash
# Rollback using saved rollback file
npm run migrate:qif-uuid -- --rollback --rollback-file=./logs/qif-uuid-rollback-2024-10-30T12-00-00.json
```

### Application Rollback

1. **Revert service configuration** to legacy mode:
   ```typescript
   const config = {
     preferUuids: false,
     requireUuids: false,
     allowLegacyIds: true,
   };
   ```

2. **Update API clients** to use legacy IDs:
   ```typescript
   const planId = plan.qifPlanId; // Use legacy ID only
   ```

3. **Remove UUID validation middleware** from routes

## Future Considerations

### Phase-out Timeline

1. **Phase 1: Migration (Current)**
   - Support both UUID and legacy IDs
   - Prefer UUIDs, allow legacy fallback
   - Migration mode enabled

2. **Phase 2: UUID-Preferred (6 months)**
   - UUIDs become primary identifiers
   - Legacy IDs supported but deprecated
   - Client warnings for legacy ID usage

3. **Phase 3: UUID-Only (12 months)**
   - UUID-only mode enabled
   - Legacy IDs rejected
   - Full NIST AMS 300-12 compliance

### Integration Opportunities

- **Blockchain Integration**: UUIDs enable integration with blockchain-based quality tracking
- **Multi-Enterprise QIF**: UUIDs support cross-enterprise quality data exchange
- **Digital Twins**: UUIDs provide consistent part tracking across digital twin systems
- **Supply Chain Integration**: NIST-compliant identifiers enhance supplier quality data sharing

## Compliance and Certification

### NIST AMS 300-12 Compliance

This implementation achieves NIST AMS 300-12 compliance through:
- UUID v4 identifiers for all QIF entities
- RFC 4122 compliant UUID generation
- Proper UUID validation and normalization
- Cross-enterprise unique identification

### AS9102 First Article Inspection

Enhanced support for AS9102 requirements:
- Traceable part identification using UUIDs
- Cross-reference with supplier quality data
- Integration with measurement equipment data
- Support for multi-supplier quality chains

### Audit Trail

UUID implementation provides enhanced audit capabilities:
- Immutable record identification
- Cross-system traceability
- Compliance reporting
- Quality data lineage tracking

## Support and Troubleshooting

### Common Issues

1. **UUID Validation Failures**
   - Check UUID format (RFC 4122)
   - Verify UUID version (v4 recommended)
   - Ensure proper case (lowercase preferred)

2. **Migration Issues**
   - Run dry-run mode first
   - Check database connectivity
   - Verify sufficient disk space for rollback data
   - Monitor migration progress logs

3. **API Integration Issues**
   - Update client applications for UUID support
   - Handle both UUID and legacy ID responses
   - Check HTTP headers for compliance status

### Monitoring

Monitor these metrics during and after migration:
- UUID validation success rate
- Legacy ID usage (should decrease over time)
- NIST compliance percentage
- System performance impact

### Getting Help

- Check migration logs in `./logs/` directory
- Review validation reports for system health
- Use QIF validation endpoints to test compliance
- Monitor API response headers for troubleshooting

---

This implementation successfully delivers GitHub Issue #219 requirements while maintaining production system stability and providing a clear migration path to full NIST AMS 300-12 compliance.