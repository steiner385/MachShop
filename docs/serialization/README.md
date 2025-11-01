# Serialization System Documentation

Welcome to the MachShop Serialization System documentation. This comprehensive guide covers all aspects of the advanced assignment workflows for serial number management.

## Quick Start

### For Developers

1. **Setup**: Follow the [Deployment Guide](./DEPLOYMENT.md#environment-setup) for environment configuration
2. **API Reference**: Check [API_REFERENCE.md](./API_REFERENCE.md) for all available endpoints
3. **Testing**: Run `npm test` to verify your setup
4. **Troubleshooting**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues

### For System Administrators

1. **Deployment**: Follow the [Deployment Guide](./DEPLOYMENT.md) step-by-step
2. **Monitoring**: Set up alerts as described in [Monitoring & Logging](./DEPLOYMENT.md#monitoring--logging)
3. **Backup Strategy**: Implement backup procedures from [Backup & Recovery](./DEPLOYMENT.md#backup--recovery)
4. **Troubleshooting**: Use [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for production issues

### For End Users

1. **Getting Started**: Read [USER_GUIDE.md](./USER_GUIDE.md#getting-started)
2. **Workflows**: Follow step-by-step guides for each workflow
3. **Best Practices**: Review [Best Practices](./USER_GUIDE.md#best-practices) section
4. **Support**: Check [Troubleshooting](./USER_GUIDE.md#troubleshooting) or contact support

---

## Documentation Structure

### Core Documentation Files

| Document | Purpose | Audience |
|----------|---------|----------|
| **[API_REFERENCE.md](./API_REFERENCE.md)** | Complete REST API documentation with all 33 endpoints | Developers, API Consumers |
| **[USER_GUIDE.md](./USER_GUIDE.md)** | Step-by-step workflows and best practices | End Users, Administrators |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Production deployment and configuration guide | DevOps, System Administrators |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | Common issues and solutions | Support, Operators |
| **[README.md](./README.md)** | This file - documentation overview | Everyone |

---

## System Overview

### What is the Serialization System?

The MachShop Serialization System provides comprehensive management of serial numbers throughout the manufacturing process, supporting multiple workflows:

1. **Vendor-Provided Serials**: Accept and validate serial numbers from suppliers
2. **System-Generated Serials**: Auto-generate serials using configurable pattern templates
3. **Late Assignment**: Handle deferred serialization post-manufacturing
4. **Serial Propagation**: Track serials through manufacturing routing and transformations
5. **Uniqueness Management**: Ensure serials are unique across configurable scopes
6. **Trigger Configuration**: Set up automatic serial assignment at key workflow points
7. **Serial Printing**: Configure and manage serial number label templates
8. **Audit Trail**: Complete compliance tracking and regulatory reporting

### Key Features

- **Multi-Source Support**: Accept serials from vendors or generate automatically
- **Flexible Assignment Triggers**: Configure triggers for material receipt, work orders, operations, etc.
- **Advanced Pattern Templates**: Support for date patterns, sequences, checksums, random values
- **Scope-Based Uniqueness**: Validate uniqueness at site, enterprise, or part-type level
- **Complete Audit Trail**: Full compliance history with event logging
- **Print Management**: Create and manage multiple label templates for different printers
- **Conflict Resolution**: Automatic and manual resolution of serial conflicts
- **Real-Time Validation**: Instant feedback on serial number validity

---

## Architecture

### Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
├─────────────────────────────────────────────────────────┤
│  VendorSerialEntryForm | TriggerConfigurationForm       │
│  SerialPrintingSetup | SerialAuditTrail                 │
├─────────────────────────────────────────────────────────┤
│                   REST API (Express)                     │
├─────────────────────────────────────────────────────────┤
│                  Service Layer                           │
│ ┌──────────────────────────────────────────────────┐   │
│ │ VendorSerialService                              │   │
│ │ SystemGeneratedSerialService                     │   │
│ │ LateAssignmentSerialService                      │   │
│ │ SerialPropagationService                         │   │
│ │ SerialUniquenessValidator                        │   │
│ │ SerialAssignmentTriggerConfigService             │   │
│ └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│              Data & Cache Layer                          │
│  PostgreSQL Database | Redis Cache                       │
└─────────────────────────────────────────────────────────┘
```

### Database Schema

Core tables include:
- `vendor_serials`: Vendor-provided serial numbers
- `system_generated_serials`: Auto-generated serials
- `late_assignment_placeholders`: Deferred serialization tracking
- `serial_propagations`: Serial lineage and routing
- `serial_uniqueness_checks`: Uniqueness validation records
- `serial_assignment_triggers`: Trigger configurations
- `audit_events`: Complete audit trail
- `print_templates`: Label template definitions

---

## Getting Help

### Documentation Navigation

- **Need to understand a concept?** → Check [USER_GUIDE.md](./USER_GUIDE.md#getting-started)
- **Need to call an API?** → Check [API_REFERENCE.md](./API_REFERENCE.md)
- **Need to deploy?** → Check [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Something not working?** → Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### Support Resources

1. **Internal Documentation**: This documentation folder
2. **GitHub Issues**: https://github.com/steiner385/MachShop/issues
3. **Team Slack**: #serialization-support channel
4. **Code Repository**: https://github.com/steiner385/MachShop

### Common Quick Links

- [API Endpoints Overview](./API_REFERENCE.md#endpoints-overview)
- [Vendor Serial Workflow](./USER_GUIDE.md#vendor-serial-management)
- [System-Generated Serial Setup](./USER_GUIDE.md#system-generated-serials)
- [Uniqueness Conflict Resolution](./USER_GUIDE.md#uniqueness--conflict-management)
- [Deployment Checklist](./DEPLOYMENT.md#pre-deployment-checklist)
- [Health Check Script](./TROUBLESHOOTING.md#quick-diagnostics)

---

## Workflow Overview

### Typical Serial Number Lifecycle

```
1. Serial Source Selection
   └─> Vendor Provided OR System Generated OR Late Assignment

2. Initial Validation
   └─> Format validation, uniqueness check, scope verification

3. Trigger Evaluation (Optional)
   └─> If configured, automatic assignment at workflow points

4. Assignment & Registration
   └─> Serial registered in system, audit event created

5. Propagation (Optional)
   └─> Track through manufacturing routing (pass-through, split, merge)

6. Printing & Application
   └─> Label template selected, serial printed and applied

7. Audit & Compliance
   └─> Complete event history available for compliance reporting

8. Retirement (End of Life)
   └─> Serial marked inactive, archive for historical records
```

---

## Key Concepts

### Pattern Templates

Serial numbers can be generated using pattern templates with support for:
- **Date tokens**: `{YYYY}`, `{MM}`, `{DD}` for year, month, day
- **Sequence counters**: `{SEQ:5}` for auto-incrementing 5-digit sequence
- **Checksums**: `{CHECK:luhn}` for Luhn validation digit
- **Random values**: `{RANDOM:numeric}` for random numbers
- **Examples**:
  - `2024-{MM}-{SEQ:6}` → `2024-11-000001`
  - `{YYYY}{MM}{DD}-{SEQ:4}-{CHECK:luhn}` → `20241101-0001-7`

### Uniqueness Scopes

Serial numbers can be validated as unique within different scopes:
- **SITE**: Unique within a single manufacturing site
- **ENTERPRISE**: Unique across all enterprise sites
- **PART_TYPE**: Unique for a specific part type across all sites

### Serial Propagation Types

Track how serials move through manufacturing:
- **PASS_THROUGH**: Serial continues unchanged through operation
- **SPLIT**: One parent serial splits into multiple child serials
- **MERGE**: Multiple parent serials combine into single child serial
- **TRANSFORMATION**: Serial transforms to new number during operation

### Trigger Types

Automatic serial assignment can be triggered on:
- **MATERIAL_RECEIPT**: When material arrives from vendor
- **WORK_ORDER_CREATE**: When manufacturing work order is created
- **OPERATION_COMPLETE**: When production operation finishes
- **QUALITY_CHECKPOINT**: When quality inspection passes
- **BATCH_COMPLETION**: When production batch is completed

---

## Configuration

### Environment Variables

Essential configuration variables (see [DEPLOYMENT.md](./DEPLOYMENT.md#environment-setup) for complete list):

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
DB_POOL_SIZE=20

# Cache
REDIS_URL=redis://host:6379/0

# Serialization
SERIAL_BATCH_SIZE=100
SERIAL_UNIQUENESS_CACHE_TTL=3600
SERIAL_PROPAGATION_DEPTH_LIMIT=50

# Audit
AUDIT_RETENTION_DAYS=2555
AUDIT_BATCH_WRITE_SIZE=500
```

### Default Configurations

- Serial batch size: 100 serials per generation
- Uniqueness cache TTL: 3600 seconds (1 hour)
- Propagation depth limit: 50 levels
- Audit retention: 2555 days (~7 years)

---

## Performance

### Expected Performance Metrics

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Vendor serial receipt | < 200ms | Includes validation |
| Serial uniqueness check | < 100ms | Cached after first check |
| Trigger evaluation | < 150ms | Per trigger |
| Audit event logging | < 50ms | Asynchronous batching |
| Serial generation (batch) | < 500ms | For 100 serials |
| Propagation lineage query | < 300ms | Depends on depth |

### Optimization Tips

1. Use pagination for large result sets
2. Filter by date range to reduce query scope
3. Enable Redis caching for frequently checked serials
4. Create appropriate database indexes (see Deployment guide)
5. Use batch operations for bulk serial generation

---

## Security

### Authentication

All API endpoints require authentication via JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Authorization

Role-based access control is enforced at endpoint level:
- **Admin**: Full access to all operations
- **Supervisor**: Create and manage configurations
- **Operator**: Execute workflows and view audit trail
- **Viewer**: Read-only access to audit trail and reports

### Data Protection

- All sensitive data encrypted at rest
- TLS 1.3 for all network communication
- Audit trail immutable and tamper-evident
- Database backups encrypted and secured
- Credentials managed via environment variables

---

## Testing

### Running Tests

```bash
# Unit tests for all services
npm test

# Integration tests with database
npm run test:integration

# Load testing
npm run test:load

# Coverage report
npm run test:coverage
```

### Test Coverage

- Services: 95%+ coverage with 134 total test cases
- API Endpoints: Comprehensive integration tests
- Database: Schema validation and migration tests
- Frontend: Component rendering and interaction tests

---

## Version History

### Current Version: 1.0.0

**Features**:
- Complete vendor serial management
- System-generated serial generation with pattern templates
- Late assignment workflow
- Serial propagation tracking
- Multi-scope uniqueness validation
- Configurable trigger system
- Comprehensive audit trail
- Serial printing templates
- REST API with 33 endpoints
- Full frontend UI components

**Issues Addressed**: GitHub Issue #150

---

## Contributing

For information about contributing to the serialization system:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and add tests
3. Submit a pull request with detailed description
4. Reference this documentation in your PR

---

## Related Resources

- **Main Repository**: https://github.com/steiner385/MachShop
- **Issue Tracker**: https://github.com/steiner385/MachShop/issues
- **Project Board**: https://github.com/steiner385/MachShop/projects
- **Continuous Integration**: GitHub Actions

---

## FAQ

**Q: How do I choose between vendor serials and system-generated serials?**
A: Use vendor serials when suppliers provide them, system-generated serials for parts you manufacture. See [USER_GUIDE.md](./USER_GUIDE.md#vendor-serial-management) for workflows.

**Q: What if a serial number needs to be corrected?**
A: Use the uniqueness conflict resolution feature to handle duplicates or incorrect assignments. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#issue-serial-number-uniqueness-constraint-violations).

**Q: How long are audit records kept?**
A: Default is 2555 days (~7 years) for regulatory compliance. See [DEPLOYMENT.md](./DEPLOYMENT.md#environment-setup) to configure.

**Q: Can I export audit reports for compliance?**
A: Yes, use the CSV export feature in the Audit Trail UI. See [USER_GUIDE.md](./USER_GUIDE.md#audit-trail--compliance).

**Q: How do I scale to handle high volume?**
A: See [DEPLOYMENT.md](./DEPLOYMENT.md#scaling-considerations) for connection pooling, caching, and horizontal scaling options.

---

## Last Updated

This documentation is current as of **November 1, 2024** and covers version **1.0.0**.

For the latest updates, check the [GitHub repository](https://github.com/steiner385/MachShop).

---

## Document Map

```
docs/serialization/
├── README.md (this file)
├── API_REFERENCE.md (50+ pages, all endpoints)
├── USER_GUIDE.md (40+ pages, workflows and best practices)
├── DEPLOYMENT.md (25+ pages, deployment and operations)
├── TROUBLESHOOTING.md (30+ pages, issues and solutions)
└── ... (source code and tests in src/ directory)
```

---

**Questions?** Contact the serialization team or check the documentation files above.
