# Life-Limited Parts (LLP) Development Guide

## Overview

The Life-Limited Parts (LLP) system provides comprehensive tracking and management of safety-critical aerospace components that have defined service life limits. This system ensures regulatory compliance with IATA, FAA, and EASA requirements for back-to-birth traceability and retirement management.

## Quick Start

### Seed Data Generation

Generate sample LLP data for development and testing:

```bash
# Basic LLP data (10 parts, moderate complexity)
npm run db:seed:llp

# Comprehensive LLP data (50 parts, complex scenarios)
npm run db:seed:llp:comprehensive
```

### Running Tests

```bash
# Run all LLP tests
npm test src/tests/services/LLP*.test.ts src/tests/routes/llp.test.ts

# Run specific test suites
npm test src/tests/services/LLPService.test.ts
npm test src/tests/services/LLPAlertService.test.ts
npm test src/tests/services/LLPCertificationService.test.ts
npm test src/tests/routes/llp.test.ts
```

## System Components

### Core Services

- **LLPService**: Life tracking, back-to-birth traceability, retirement calculations
- **LLPAlertService**: Alert generation, threshold management, notification workflows
- **LLPCertificationService**: Document management, compliance validation
- **LLPReportingService**: Report generation with PDF/Excel/CSV/JSON export

### Database Models

- **Part**: Extended with LLP configuration fields
- **LLPLifeHistory**: Complete event tracking for back-to-birth traceability
- **LLPAlert**: Alert management with severity levels and workflows
- **LLPCertification**: Certification document management with verification

### API Endpoints

Base URL: `/api/v1/llp`

#### Configuration
- `POST /configuration` - Configure LLP settings for a part
- `GET /configuration/:partId` - Get LLP configuration

#### Life Tracking
- `POST /life-events` - Record life events
- `GET /life-status/:serializedPartId` - Get current life status
- `GET /back-to-birth/:serializedPartId` - Get complete traceability
- `GET /life-history/:serializedPartId` - Get paginated life history

#### Alerts
- `POST /alerts/configuration` - Configure alert settings
- `GET /alerts` - Get alerts with filtering
- `POST /alerts/:alertId/acknowledge` - Acknowledge alert
- `POST /alerts/:alertId/resolve` - Resolve alert

#### Certifications
- `POST /certifications/upload` - Upload certification document
- `POST /certifications` - Create certification record
- `GET /certifications/:serializedPartId` - Get certification status
- `POST /certifications/verify` - Verify certification
- `GET /certifications/expiring` - Get expiring certifications

#### Reporting
- `POST /reports/fleet-status` - Generate fleet status report
- `POST /reports/retirement-forecast` - Generate retirement forecast
- `POST /reports/compliance` - Generate compliance report
- `GET /reports/download/:reportId` - Download report file
- `GET /reports/formats` - Get available formats

#### Retirement
- `POST /retirement` - Retire an LLP
- `GET /retirement-forecast` - Get retirement forecast

### UI Components

Located in `frontend/src/components/LLP/`:

- **LLPDashboard**: Fleet overview with statistics and alerts
- **LLPDetailView**: Detailed part view with complete history
- **LLPConfigurationForm**: Multi-step LLP configuration wizard
- **LLPLifeEventForm**: Life event recording with validation
- **LLPAlertManagement**: Alert management with workflows

## Development Data

### Sample Parts Created

The seed data creates realistic aerospace LLP components:

#### Turbine Blades
- High-Pressure Turbine Blade Stage 1 (1000 cycles, 8760 hours, CRITICAL)
- High-Pressure Turbine Blade Stage 2 (1200 cycles, 10000 hours, CRITICAL)
- Low-Pressure Turbine Blades (1500-1800 cycles, CONTROLLED)

#### Compressor Components
- High-Pressure Compressor Disks (2000-2500 cycles, CRITICAL)
- Low-Pressure Compressor Blades (3000 cycles, CONTROLLED)
- Compressor Case Assembly (25000 hours, TRACKED)

#### Rotating Assemblies
- High-Pressure Shaft Assembly (1500 cycles, 15000 hours, CRITICAL)
- Low-Pressure Shaft Assembly (2000 cycles, 20000 hours, CONTROLLED)
- Turbine/Compressor Rotor Assemblies (CRITICAL/CONTROLLED)

#### Structural Components
- Engine Mount Assembly (30000 hours, TRACKED)
- Combustor Liner Assembly (800 cycles, 8000 hours, CRITICAL)
- Exhaust Nozzle Assembly (2000 cycles, 22000 hours, CONTROLLED)

### Sample Life Events

Each serialized part includes comprehensive lifecycle data:

1. **Manufacturing Complete** - Initial production
2. **Quality Inspection** - Dimensional and material verification
3. **Installation** - Installation in engine assembly
4. **Operation** - In-service usage tracking
5. **Maintenance** - Scheduled maintenance activities
6. **Inspection** - Periodic inspections
7. **Repair** - Minor repairs and blend repairs
8. **Overhaul** - Complete refurbishment
9. **Retirement** - End-of-life processing

### Sample Alerts

Alerts are generated based on realistic scenarios:

- **Life Limit Approaching** (75%, 90%, 95% thresholds)
- **Life Limit Exceeded** (>100% usage)
- **Inspection Due** (based on intervals)
- **Certification Expiring** (various renewal periods)

### Sample Certifications

Multiple certification types per part:

- **Manufacturing** (AS9100, no expiration)
- **Installation** (MIL-STD-1530, 24 months)
- **Maintenance** (FAR 145, 12 months)
- **Overhaul** (FAR 145, 36 months)
- **Repair** (FAR 145, 18 months)

## Complex Scenarios

The comprehensive seed data includes advanced scenarios:

### Exceeded Limits Scenario
- Part with cycles/hours exceeding certified limits
- Urgent alerts requiring immediate action
- Complete audit trail of usage progression

### Certification Expiration Scenario
- Certifications expiring within 15 days
- Warning alerts for renewal requirements
- Compliance risk assessment

### Complex Maintenance Scenario
- Series of maintenance events with detailed records
- Inspection results with measurements
- Repair procedures with before/after data
- Overhaul documentation with test results

## Testing Strategy

### Unit Tests
- Service layer business logic
- Data validation and error handling
- Regulatory compliance calculations
- Alert generation algorithms

### Integration Tests
- API endpoint functionality
- Database model relationships
- Service-to-service interactions
- Authentication and authorization

### Database Tests
- Model constraints and relationships
- Complex queries and indexing
- Transaction handling
- Performance testing

## Regulatory Compliance

The system supports multiple regulatory standards:

- **FAA** (Federal Aviation Administration)
- **EASA** (European Union Aviation Safety Agency)
- **IATA** (International Air Transport Association)
- **TCCA** (Transport Canada Civil Aviation)

### Compliance Features

- **Back-to-Birth Traceability** - Complete component history
- **Life Limit Enforcement** - Automated retirement calculations
- **Certification Management** - Document verification and expiration tracking
- **Audit Trail** - Comprehensive event logging
- **Regulatory Reporting** - Export capabilities for compliance documentation

## Security Considerations

- All LLP operations require production access permissions
- Sensitive part data is protected with role-based access
- Audit logging for all critical operations
- Document upload validation and storage security
- API authentication and authorization

## Performance Optimizations

- Database indexing for efficient queries
- Paginated results for large datasets
- Background report generation
- Efficient alert processing
- Optimized lifecycle event storage

## Troubleshooting

### Common Issues

1. **Missing Prerequisites**
   - Ensure users exist before running seed data
   - Verify database migrations are current

2. **Seed Data Conflicts**
   - Clean existing LLP data before re-seeding
   - Use unique suffixes to avoid conflicts

3. **Test Failures**
   - Verify test database is properly configured
   - Check for proper test data cleanup

### Debug Commands

```bash
# Check LLP data
npx prisma studio

# Verify migrations
npx prisma migrate status

# Generate fresh schema
npx prisma generate
```

## Contributing

When working with the LLP system:

1. Follow existing patterns for service and API design
2. Maintain comprehensive test coverage
3. Update documentation for new features
4. Ensure regulatory compliance requirements are met
5. Test with both basic and comprehensive seed data

## References

- [FAA Advisory Circular AC 33.70-1](https://www.faa.gov/regulations_policies/advisory_circulars/)
- [EASA Certification Specifications CS-E](https://www.easa.europa.eu/document-library/certification-specifications)
- [IATA Guidance Material for Aircraft Life Limited Parts](https://www.iata.org/en/programs/ops-infra/aircraft-operations/)
- [AS9100 Quality Management Systems](https://www.sae.org/standards/content/as9100d/)