# Manufacturing Template Marketplace

**Issue #401** - Manufacturing Template Marketplace for Low-Code Platform

## Overview

The Manufacturing Template Marketplace provides a curated catalog of pre-built, production-ready templates for common manufacturing processes. Organizations can discover, purchase, and deploy templates with minimal customization, accelerating implementation timelines while maintaining governance and compliance standards.

## Architecture Overview

The marketplace platform consists of four core services:

- **MarketplaceTemplateService**: Template discovery, browsing, installation, and management
- **MarketplaceLicenseService**: License creation, activation, validation, usage tracking, and renewal
- **MarketplacePublisherService**: Publisher account management, submission review, and approval workflows
- **MarketplaceDeploymentService**: Template deployment, configuration, health checks, and rollback

## Core Services

### MarketplaceTemplateService

Manages template catalog, discovery, and installation operations.

**Key Features:**
- Advanced template search with filtering and sorting
- Browse featured and similar templates
- User reviews and ratings
- One-click installation
- Compatibility checking
- Version management and updates

**Methods:**

```typescript
// Discovery
async searchTemplates(criteria: TemplateSearchCriteria): Promise<TemplateSearchResult>
async getTemplateDetails(templateId: string): Promise<TemplateDetails | null>
async getFeaturedTemplates(limit: number = 5): Promise<TemplateDetails[]>
async getSimilarTemplates(templateId: string, limit: number = 5): Promise<TemplateDetails[]>

// Reviews
async getTemplateReviews(templateId: string, page?: number, pageSize?: number): Promise<{reviews, totalCount}>
async addTemplateReview(templateId, reviewerId, rating, title, content): Promise<TemplateReview>

// Installation
async installTemplate(templateId, siteId, configuration): Promise<TemplateInstallation>
async getInstallationStatus(installationId): Promise<TemplateInstallation | null>
async getInstalledTemplates(siteId): Promise<TemplateInstallation[]>
async checkTemplateCompatibility(templateId, siteId): Promise<CompatibilityResult>
async uninstallTemplate(installationId): Promise<void>
async updateTemplate(installationId, newVersion): Promise<TemplateInstallation>
async getUpdateNotifications(siteId): Promise<UpdateNotification[]>
```

**Template Metadata:**

```typescript
interface TemplateMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  category: TemplateCategory; // quality_management, time_tracking, etc.
  industry?: IndustryType;
  author: string;
  publisherId: string;
  createdAt: Date;
  updatedAt: Date;
  lastPublishedAt: Date;
}
```

**Search Criteria:**

```typescript
interface TemplateSearchCriteria {
  query?: string;
  category?: TemplateCategory;
  industry?: IndustryType;
  complexity?: ComplexityLevel; // beginner, intermediate, advanced
  licenseType?: TemplateLicenseType;
  minRating?: number; // 0-5
  priceRange?: { min, max };
  compliance?: string[]; // AS9100, FDA, etc.
  sortBy?: 'relevance' | 'rating' | 'popularity' | 'newest' | 'price';
  page?: number;
  pageSize?: number;
}
```

### MarketplaceLicenseService

Manages template licensing, activation, and usage monitoring.

**Key Features:**
- Multiple license types (free, perpetual, subscription, trial, enterprise)
- Per-site license entitlements
- Usage tracking and limits
- Subscription auto-renewal
- License expiration management
- Revenue reporting for publishers

**Methods:**

```typescript
// License Management
async createLicenseFromPurchase(templateId, siteId, licenseType, publisherId, quantity?, durationMonths?): Promise<License>
async activateLicense(licenseKey): Promise<License>
async validateLicense(licenseKey): Promise<{valid, license?, reason?}>
async suspendLicense(licenseId, reason): Promise<License>
async resumeLicense(licenseId): Promise<License>
async cancelLicense(licenseId, reason): Promise<void>

// Usage Tracking
async checkLicenseUsage(licenseId): Promise<{withinLimits, usagePercentage, warnings}>
async recordUsage(licenseId, concurrentUsers, transactionCount): Promise<LicenseUsageRecord>
async getLicenseUsageHistory(licenseId, days?): Promise<LicenseUsageRecord[]>

// Renewal & Expiration
async renewSubscriptionLicense(licenseId, durationMonths?): Promise<License>
async getExpiringLicenses(daysUntilExpiration?): Promise<License[]>

// Reporting
async getLicensePurchaseHistory(siteId): Promise<LicensePurchaseOrder[]>
async getPublisherRevenueReport(publisherId, startDate, endDate): Promise<RevenueReport>
```

**License Types:**

- **Free**: No cost, unlimited usage, community support
- **Perpetual**: One-time payment, permanent license, standard support
- **Subscription**: Monthly/annual recurring payment, feature updates included
- **Trial**: 30-day evaluation, full features, free
- **Enterprise**: Custom pricing, SLA, dedicated support

### MarketplacePublisherService

Manages publisher registration, submission review, and approval workflows.

**Key Features:**
- Publisher account management
- Automated quality gate validation
- Multi-stage review process (code, security, functional, documentation)
- SLA-based review timeline
- Publisher dashboard and analytics
- Payment processing and reporting

**Methods:**

```typescript
// Publisher Management
async registerPublisher(name, email, description, website?, logoUrl?): Promise<Publisher>
async verifyPublisher(publisherId, verificationToken): Promise<Publisher>
async updatePublisherStatus(publisherId, status): Promise<Publisher>

// Submission Management
async submitExtension(publisherId, templateName, description, version, artifactUrl, documentationUrl): Promise<ExtensionSubmission>
async runAutomatedQualityGates(submissionId): Promise<QualityGateResult[]>
async assignReview(submissionId, reviewType, assignedTo, dueDate): Promise<ReviewAssignment>
async completeReview(reviewAssignmentId, approvalStatus, notes): Promise<ReviewAssignment>
async getSubmissionReviewProgress(submissionId): Promise<ReviewProgress>

// Approval/Rejection
async approveSubmission(submissionId, approvedBy): Promise<ExtensionSubmission>
async rejectSubmission(submissionId, reason, rejectedBy): Promise<ExtensionSubmission>
async publishSubmissionToMarketplace(submissionId): Promise<ExtensionSubmission>

// Dashboard & Reporting
async getPublisherDashboard(publisherId): Promise<PublisherDashboardMetrics>
async getPublisherSubmissions(publisherId): Promise<ExtensionSubmission[]>
async generatePublisherPaymentReport(publisherId, month, year): Promise<PaymentReport>
```

**Quality Gates:**

1. **Code Coverage** - Minimum 80% coverage required
2. **Security Scan** - No critical vulnerabilities
3. **Performance Tests** - Response time and throughput benchmarks
4. **API Compatibility** - Validates SDK version compatibility
5. **Test Suite** - All tests must pass

**Review Types:**
- Code Review (5-7 business days)
- Security Audit (3-5 business days)
- Functional Testing (2-3 business days)
- Documentation Review (1-2 business days)
- UX Evaluation (1-2 business days)

### MarketplaceDeploymentService

Manages template deployment, configuration, and health monitoring.

**Key Features:**
- One-click deployment automation
- Pre-deployment validation and compatibility checking
- Configuration template support
- Staged deployment (dev → staging → production)
- Post-deployment health checks
- Deployment rollback with version management
- Bulk multi-site deployment
- Continuous health monitoring

**Methods:**

```typescript
// Deployment Lifecycle
async startDeployment(templateId, siteId, version, environment, configuration): Promise<Deployment>
async getDeploymentStatus(deploymentId): Promise<Deployment | null>
async executeDeployment(deploymentId): Promise<Deployment>
async validateDeploymentPrerequisites(templateId, siteId, version): Promise<ValidationResult>

// Configuration
async configureTemplate(deploymentId, configuration): Promise<Deployment>
async updateDeploymentConfiguration(deploymentId, updates): Promise<Deployment>

// Health & Monitoring
async runHealthChecks(deploymentId): Promise<HealthCheckResult>
async monitorDeploymentHealth(deploymentId): Promise<HealthCheckResult>
async rollbackDeployment(deploymentId, reason): Promise<Deployment>

// Bulk & Staged Deployment
async bulkDeployTemplate(templateId, siteIds, version, environment, configuration): Promise<BulkDeployment>
async getBulkDeploymentStatus(bulkDeploymentId): Promise<BulkDeployment | null>
async schedulesStagedDeployment(templateId, siteId, version, stages): Promise<StagedDeploymentResult>

// History & Reporting
async getDeploymentHistory(siteId, templateId?): Promise<Deployment[]>
async getDeploymentMetrics(deploymentId): Promise<DeploymentMetrics>
```

**Deployment Status:**
- `pending` - Awaiting download and validation
- `downloading` - Artifact being downloaded
- `validating` - Pre-deployment checks running
- `installing` - Installation in progress
- `configured` - Configuration completed
- `active` - Deployed and operational
- `failed` - Deployment failed
- `rolling_back` - Rolling back to previous version
- `rolled_back` - Successfully rolled back

**Health Status:**
- `healthy` - All checks passing
- `degraded` - Minor issues detected
- `unhealthy` - Critical issues detected
- `unknown` - Health status unavailable

## Template Categories

### Quality Management (8+ templates)
- Non-Conformance Management (NCR/CAPA)
- First Article Inspection (FAI)
- In-Process Quality Checks
- Control Plan Management
- Supplier Quality
- First Time Through (FTT) Tracking

### Time Tracking (6+ templates)
- Daily Time Clock
- Time Entry Management
- Labor Costing
- Operator Performance
- Certification & Skills Matrix
- Training Time Tracking

### Production Planning (5+ templates)
- Work Order Management
- Material Kitting
- Production Schedule
- Order Promising
- Shop Floor Dispatch

### Inventory & Material (5+ templates)
- Receiving & Inspection
- Inventory Transactions
- Lot/Serial Tracking
- Material Shortage Resolution
- Expiration Management

### Equipment & Maintenance (5+ templates)
- Equipment Health Monitoring
- Preventive Maintenance
- Equipment Downtime Tracking
- Calibration Management
- Tool Life Tracking

### Engineering Change (4+ templates)
- Engineering Change Order (ECO)
- Product Structure Changes
- Configuration Control
- Change Impact Analysis

### Regulatory & Compliance (5+ templates)
- Document Control
- Training & Certification
- Internal Audits
- Management Review
- Compliance Reporting

### Advanced Manufacturing (5+ templates)
- Engine Assembly Build Book
- Sub-Assembly Serialization
- Rework & Repair
- Lean/Continuous Improvement
- Safety & 5S

## MVP Template Features

Each template includes:
- **Pre-built Workflows** - Complete workflow definitions
- **Custom Forms** - Data entry forms for the process
- **Automation Rules** - Auto-triggered actions and notifications
- **Dashboard Widgets** - KPI displays and analytics
- **Reports** - Standard reports for the process
- **Sample Data** - Test data for configuration and learning
- **Documentation** - Setup guides, process documentation, training materials
- **Best Practices** - Manufacturing-specific guidance

## Usage Examples

### Template Discovery & Installation

```typescript
// Search for work order templates
const results = await templateService.searchTemplates({
  query: 'work order',
  category: 'production_planning',
  minRating: 4.0,
  sortBy: 'popularity'
});

// Get template details
const template = await templateService.getTemplateDetails(results.templates[0].metadata.id);

// Check compatibility
const compat = await templateService.checkTemplateCompatibility(templateId, 'site-1');
if (compat.compatible) {
  // Install template
  const installation = await templateService.installTemplate(
    templateId,
    'site-1',
    { enableScheduling: true }
  );
}
```

### License Management

```typescript
// Create license from purchase
const license = await licenseService.createLicenseFromPurchase(
  'template-wom',
  'site-1',
  'subscription',
  'pub-internal',
  1,
  12 // 12-month subscription
);

// Check usage
const usage = await licenseService.checkLicenseUsage(license.id);
if (usage.warnings.length > 0) {
  console.log('Usage warnings:', usage.warnings);
}

// Renew when needed
if (isExpiringInXDays(license, 30)) {
  await licenseService.renewSubscriptionLicense(license.id, 12);
}
```

### Template Deployment

```typescript
// Start deployment
const deployment = await deploymentService.startDeployment(
  'template-wom',
  'site-1',
  '2.1.0',
  'production',
  {
    templateId: 'template-wom',
    siteId: 'site-1',
    fieldMappings: {
      'template.wo-number': 'company.work-order-id',
      'template.wo-status': 'company.status-field'
    },
    enabledFeatures: ['scheduling', 'approval-workflow']
  }
);

// Execute deployment
await deploymentService.executeDeployment(deployment.id);

// Run health checks
const health = await deploymentService.runHealthChecks(deployment.id);
if (health.status === 'healthy') {
  console.log('Deployment successful');
} else {
  await deploymentService.rollbackDeployment(deployment.id, 'Health checks failed');
}
```

### Publisher Submission

```typescript
// Register publisher
const publisher = await publisherService.registerPublisher(
  'My Company',
  'publisher@company.com',
  'Manufacturing template provider',
  'https://company.com'
);

// Submit extension
const submission = await publisherService.submitExtension(
  publisher.id,
  'Equipment Maintenance Template',
  'Comprehensive PM and calibration management',
  '1.0.0',
  'https://artifacts.company.com/equipment-maintenance.tar.gz',
  'https://docs.company.com/equipment-maintenance'
);

// Monitor review progress
const progress = await publisherService.getSubmissionReviewProgress(submission.id);
console.log(`Review progress: ${progress.overallProgress}%`);
```

## Testing

Comprehensive test suite with 50 tests covering:

- **Template Discovery**: Search, filtering, sorting, pagination
- **Template Installation**: Install, compatibility checking, updates
- **License Management**: Creation, activation, validation, usage tracking, renewal
- **Publisher Management**: Registration, submission, review workflow, dashboard
- **Deployment**: Lifecycle management, configuration, health checks, rollback

**Run Tests:**
```bash
npm test -- src/tests/services/Marketplace.test.ts
```

## Integration Points

### With Other Services

- **Governance Framework (Issue #396)**: Ensures templates comply with organizational governance
- **Approval Workflows (Issue #147)**: Templates include pre-built approval configurations
- **Component Library (Issue #397)**: Templates use pre-built components
- **Form & UI Builder (Issue #399)**: Templates include custom forms and UI
- **Automation Rules (Issue #398)**: Templates include automation rules
- **License Management (Issue #405)**: Integrated license tracking per site
- **Compatibility Matrix (Issue #404)**: Pre-installation compatibility validation
- **Multi-Site Service (Issue #403)**: Bulk deployment and site management

## Best Practices

1. **Search Effectively**: Use category and complexity filters to find relevant templates
2. **Review Quality**: Check ratings and reviews before installation
3. **Test First**: Deploy to development/staging before production
4. **Configure Carefully**: Map template fields to your organization's data structures
5. **Monitor Health**: Regular health checks after deployment
6. **Keep Updated**: Install security and feature updates promptly
7. **Document Configuration**: Record customizations for future reference
8. **Plan Bulk Deployments**: Schedule multi-site deployments during maintenance windows

## Marketplace Growth

**MVP Templates (Phase 1):**
- Work Order Management
- Non-Conformance Management
- Daily Time Clock
- Material Receiving & Inspection
- Equipment Health Monitoring

**Future Roadmap:**
- Industry-specific variants (aerospace, automotive, medical)
- Advanced analytics templates
- Compliance reporting templates
- Integration templates with ERP systems
- Community-contributed templates

## Troubleshooting

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Template installation fails | Check prerequisites validation results for missing dependencies |
| Compatibility check fails | Review missing dependencies or conflicting extensions |
| Deployment health check fails | Review health check results for specific failed checks |
| License activation fails | Verify license key format and validity |
| License usage exceeds limits | Upgrade license tier or request temporary increase |

## Performance Considerations

- **Search Performance**: ~100-200ms for typical searches
- **Installation Time**: 2-5 minutes depending on template complexity
- **Deployment**: 15-30 minutes including configuration and health checks
- **Bulk Deployment**: Scales linearly with number of sites (30-60 seconds per site)

## Security & Compliance

- All templates validated against security standards before marketplace release
- License keys cryptographically signed and validated
- Usage tracking for licensing compliance
- Audit trail of all marketplace operations
- Integration with governance framework for compliance enforcement
