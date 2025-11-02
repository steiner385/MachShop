/**
 * Marketplace Template Service
 * Manages template catalog, discovery, browsing, and installation
 * Issue #401 - Manufacturing Template Marketplace for Low-Code Platform
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';

/**
 * Template Category
 */
export type TemplateCategory =
  | 'quality_management'
  | 'time_tracking'
  | 'production_planning'
  | 'inventory_management'
  | 'equipment_maintenance'
  | 'engineering_change'
  | 'regulatory_compliance'
  | 'advanced_manufacturing';

/**
 * Industry Type
 */
export type IndustryType = 'aerospace' | 'automotive' | 'medical_device' | 'defense' | 'general';

/**
 * Complexity Level
 */
export type ComplexityLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Template License Type
 */
export type TemplateLicenseType = 'free' | 'perpetual' | 'subscription' | 'trial' | 'enterprise';

/**
 * Template Metadata
 */
export interface TemplateMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  category: TemplateCategory;
  industry?: IndustryType;
  author: string;
  publisherId: string;
  createdAt: Date;
  updatedAt: Date;
  lastPublishedAt: Date;
}

/**
 * Template Details
 */
export interface TemplateDetails {
  metadata: TemplateMetadata;
  features: string[];
  includedWorkflows: string[];
  includedForms: string[];
  includedRules: string[];
  includedDashboards: string[];
  estimatedDeploymentTime: number; // hours
  complexity: ComplexityLevel;
  prerequisites: string[];
  dependencies: string[]; // Extension IDs
  conflictsWith: string[]; // Extension IDs
  documentation: {
    setupGuide: string;
    processGuide: string;
    trainingMaterials: string[];
    faq: string;
  };
  support: {
    email: string;
    documentationUrl: string;
    supportLevel: 'community' | 'standard' | 'premium';
  };
  pricing: {
    licenseType: TemplateLicenseType;
    pricePerSite?: number; // USD
    subscriptionPrice?: number; // USD/month
    trialDays?: number;
  };
  ratings: {
    averageRating: number; // 0-5
    reviewCount: number;
    installCount: number;
  };
  compliance: {
    certifications: string[]; // AS9100, FDA, ISO13485, etc.
    validated: boolean;
    validatedDate?: Date;
  };
}

/**
 * Template Search Criteria
 */
export interface TemplateSearchCriteria {
  query?: string;
  category?: TemplateCategory;
  industry?: IndustryType;
  complexity?: ComplexityLevel;
  licenseType?: TemplateLicenseType;
  minRating?: number;
  priceRange?: { min: number; max: number };
  compliance?: string[];
  sortBy?: 'relevance' | 'rating' | 'popularity' | 'newest' | 'price';
  page?: number;
  pageSize?: number;
}

/**
 * Template Search Result
 */
export interface TemplateSearchResult {
  templates: TemplateDetails[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Template Installation Record
 */
export interface TemplateInstallation {
  id: string;
  templateId: string;
  siteId: string;
  installationDate: Date;
  status: 'installing' | 'installed' | 'failed' | 'removing';
  version: string;
  configuration: Record<string, any>;
  healthStatus: 'healthy' | 'warning' | 'error';
  errorDetails?: string;
}

/**
 * Template Review
 */
export interface TemplateReview {
  id: string;
  templateId: string;
  reviewerId: string;
  rating: number; // 1-5
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  helpful: number; // count of helpful votes
}

/**
 * Marketplace Template Service
 * Manages template catalog, discovery, and installation
 */
export class MarketplaceTemplateService {
  private readonly prisma: PrismaClient;
  private readonly logger: Logger;

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Search templates in marketplace
   */
  async searchTemplates(criteria: TemplateSearchCriteria): Promise<TemplateSearchResult> {
    this.logger.info(`Searching marketplace templates with criteria: ${JSON.stringify(criteria)}`);

    // Simulate template catalog
    const allTemplates: TemplateDetails[] = [
      {
        metadata: {
          id: 'template-wom',
          name: 'Work Order Management',
          version: '2.1.0',
          description: 'Complete work order lifecycle management with scheduling and tracking',
          category: 'production_planning',
          author: 'MES Team',
          publisherId: 'pub-internal',
          createdAt: new Date(Date.now() - 31536000000),
          updatedAt: new Date(Date.now() - 604800000),
          lastPublishedAt: new Date(Date.now() - 604800000),
        },
        features: [
          'Work order creation and scheduling',
          'Real-time status tracking',
          'Resource allocation',
          'Completion approval workflows',
        ],
        includedWorkflows: ['wo-creation', 'wo-dispatch', 'wo-completion'],
        includedForms: ['wo-entry', 'wo-approval'],
        includedRules: ['auto-escalation', 'status-notification'],
        includedDashboards: ['wo-overview', 'wo-analytics'],
        estimatedDeploymentTime: 3,
        complexity: 'intermediate',
        prerequisites: ['Base MES Setup'],
        dependencies: [],
        conflictsWith: [],
        documentation: {
          setupGuide: 'Setup guide content',
          processGuide: 'Process documentation',
          trainingMaterials: ['Quick Start', 'Administrator Guide'],
          faq: 'Frequently asked questions',
        },
        support: {
          email: 'support@example.com',
          documentationUrl: 'https://docs.example.com/templates/wom',
          supportLevel: 'premium',
        },
        pricing: {
          licenseType: 'subscription',
          subscriptionPrice: 500,
        },
        ratings: {
          averageRating: 4.7,
          reviewCount: 124,
          installCount: 847,
        },
        compliance: {
          certifications: ['AS9100', 'ISO9001'],
          validated: true,
          validatedDate: new Date(Date.now() - 2592000000),
        },
      },
      {
        metadata: {
          id: 'template-ncm',
          name: 'Non-Conformance Management',
          version: '1.8.0',
          description: 'NCR creation, investigation, and CAPA tracking',
          category: 'quality_management',
          industry: 'aerospace',
          author: 'Quality Team',
          publisherId: 'pub-internal',
          createdAt: new Date(Date.now() - 63072000000),
          updatedAt: new Date(Date.now() - 1209600000),
          lastPublishedAt: new Date(Date.now() - 1209600000),
        },
        features: [
          'NCR creation with automatic numbering',
          'Investigation workflow',
          'Root cause analysis',
          'CAPA tracking and closure',
          'Audit trail and compliance reporting',
        ],
        includedWorkflows: ['ncr-creation', 'investigation', 'capa-tracking'],
        includedForms: ['ncr-entry', 'investigation-form', 'capa-form'],
        includedRules: ['escalation-on-age', 'capa-reminder', 'compliance-alert'],
        includedDashboards: ['ncr-metrics', 'capa-status'],
        estimatedDeploymentTime: 4,
        complexity: 'intermediate',
        prerequisites: ['Base MES Setup', 'Approval Workflows'],
        dependencies: ['governance-controls'],
        conflictsWith: [],
        documentation: {
          setupGuide: 'NCM setup guide',
          processGuide: 'Quality process documentation',
          trainingMaterials: ['Quick Start', 'Quality Manager Guide', 'Video Tutorial'],
          faq: 'NCM FAQs',
        },
        support: {
          email: 'quality-support@example.com',
          documentationUrl: 'https://docs.example.com/templates/ncm',
          supportLevel: 'premium',
        },
        pricing: {
          licenseType: 'subscription',
          subscriptionPrice: 750,
        },
        ratings: {
          averageRating: 4.8,
          reviewCount: 98,
          installCount: 623,
        },
        compliance: {
          certifications: ['AS9100', 'FDA21CFR11', 'ISO13485'],
          validated: true,
          validatedDate: new Date(Date.now() - 5184000000),
        },
      },
      {
        metadata: {
          id: 'template-dtc',
          name: 'Daily Time Clock',
          version: '3.0.0',
          description: 'Shift clock with badge scan, PIN entry, and kiosk support',
          category: 'time_tracking',
          author: 'HR Team',
          publisherId: 'pub-internal',
          createdAt: new Date(Date.now() - 94608000000),
          updatedAt: new Date(Date.now() - 604800000),
          lastPublishedAt: new Date(Date.now() - 604800000),
        },
        features: [
          'Badge scan time entry',
          'PIN entry fallback',
          'Web and mobile kiosk',
          'Shift management',
          'Attendance reporting',
        ],
        includedWorkflows: ['clock-in', 'clock-out', 'shift-management'],
        includedForms: ['time-entry', 'shift-assignment'],
        includedRules: ['overtime-alert', 'shift-reminder'],
        includedDashboards: ['attendance-dashboard', 'labor-cost-analysis'],
        estimatedDeploymentTime: 2,
        complexity: 'beginner',
        prerequisites: ['Base MES Setup'],
        dependencies: [],
        conflictsWith: [],
        documentation: {
          setupGuide: 'Time clock setup',
          processGuide: 'Time tracking process',
          trainingMaterials: ['Quick Start', 'Operator Guide', 'Administrator Manual'],
          faq: 'Time clock FAQs',
        },
        support: {
          email: 'hr-support@example.com',
          documentationUrl: 'https://docs.example.com/templates/time-clock',
          supportLevel: 'standard',
        },
        pricing: {
          licenseType: 'perpetual',
          pricePerSite: 2500,
        },
        ratings: {
          averageRating: 4.5,
          reviewCount: 156,
          installCount: 1203,
        },
        compliance: {
          certifications: ['ISO9001'],
          validated: true,
          validatedDate: new Date(Date.now() - 7776000000),
        },
      },
    ];

    // Apply filters
    let filtered = allTemplates;

    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      filtered = filtered.filter((t) =>
        t.metadata.name.toLowerCase().includes(query) ||
        t.metadata.description.toLowerCase().includes(query) ||
        t.features.some((f) => f.toLowerCase().includes(query))
      );
    }

    if (criteria.category) {
      filtered = filtered.filter((t) => t.metadata.category === criteria.category);
    }

    if (criteria.industry) {
      filtered = filtered.filter((t) => t.metadata.industry === criteria.industry);
    }

    if (criteria.complexity) {
      filtered = filtered.filter((t) => t.complexity === criteria.complexity);
    }

    if (criteria.minRating) {
      filtered = filtered.filter((t) => t.ratings.averageRating >= criteria.minRating);
    }

    // Sort
    const sortBy = criteria.sortBy || 'relevance';
    if (sortBy === 'rating') {
      filtered.sort((a, b) => b.ratings.averageRating - a.ratings.averageRating);
    } else if (sortBy === 'popularity') {
      filtered.sort((a, b) => b.ratings.installCount - a.ratings.installCount);
    } else if (sortBy === 'newest') {
      filtered.sort((a, b) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime());
    }

    // Paginate
    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 10;
    const startIdx = (page - 1) * pageSize;
    const paginatedTemplates = filtered.slice(startIdx, startIdx + pageSize);

    const result: TemplateSearchResult = {
      templates: paginatedTemplates,
      totalCount: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };

    this.logger.info(`Search returned ${paginatedTemplates.length} templates (${filtered.length} total matches)`);
    return result;
  }

  /**
   * Get template details
   */
  async getTemplateDetails(templateId: string): Promise<TemplateDetails | null> {
    this.logger.info(`Retrieving template details for ${templateId}`);

    // Simulate template lookup
    const templates: Record<string, TemplateDetails> = {
      'template-wom': {
        metadata: {
          id: 'template-wom',
          name: 'Work Order Management',
          version: '2.1.0',
          description: 'Complete work order lifecycle management',
          category: 'production_planning',
          author: 'MES Team',
          publisherId: 'pub-internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastPublishedAt: new Date(),
        },
        features: ['Work order creation', 'Scheduling', 'Resource allocation'],
        includedWorkflows: ['wo-creation'],
        includedForms: ['wo-entry'],
        includedRules: ['auto-escalation'],
        includedDashboards: ['wo-overview'],
        estimatedDeploymentTime: 3,
        complexity: 'intermediate',
        prerequisites: [],
        dependencies: [],
        conflictsWith: [],
        documentation: {
          setupGuide: 'Guide',
          processGuide: 'Process',
          trainingMaterials: [],
          faq: 'FAQ',
        },
        support: {
          email: 'support@example.com',
          documentationUrl: 'https://docs.example.com',
          supportLevel: 'premium',
        },
        pricing: {
          licenseType: 'subscription',
          subscriptionPrice: 500,
        },
        ratings: {
          averageRating: 4.7,
          reviewCount: 124,
          installCount: 847,
        },
        compliance: {
          certifications: ['AS9100'],
          validated: true,
        },
      },
    };

    return templates[templateId] || null;
  }

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(limit: number = 5): Promise<TemplateDetails[]> {
    this.logger.info(`Retrieving featured templates (limit: ${limit})`);

    // Return most popular templates
    const result = await this.searchTemplates({
      sortBy: 'popularity',
      pageSize: limit,
    });

    return result.templates;
  }

  /**
   * Get similar templates
   */
  async getSimilarTemplates(templateId: string, limit: number = 5): Promise<TemplateDetails[]> {
    this.logger.info(`Finding templates similar to ${templateId}`);

    const template = await this.getTemplateDetails(templateId);
    if (!template) {
      return [];
    }

    // Search by same category
    const result = await this.searchTemplates({
      category: template.metadata.category,
      pageSize: limit + 1, // +1 to exclude the source template
    });

    return result.templates.filter((t) => t.metadata.id !== templateId).slice(0, limit);
  }

  /**
   * Get template reviews
   */
  async getTemplateReviews(
    templateId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ reviews: TemplateReview[]; totalCount: number }> {
    this.logger.info(`Retrieving reviews for template ${templateId}`);

    // Simulate reviews
    const reviews: TemplateReview[] = [
      {
        id: 'review-1',
        templateId,
        reviewerId: 'user-123',
        rating: 5,
        title: 'Excellent template, great support',
        content: 'Deployed this template at multiple sites. Setup was smooth and support was responsive.',
        createdAt: new Date(Date.now() - 604800000),
        updatedAt: new Date(Date.now() - 604800000),
        helpful: 23,
      },
      {
        id: 'review-2',
        templateId,
        reviewerId: 'user-456',
        rating: 4,
        title: 'Good features but needs customization',
        content: 'Template covered 80% of our requirements. Customization was straightforward.',
        createdAt: new Date(Date.now() - 1209600000),
        updatedAt: new Date(Date.now() - 1209600000),
        helpful: 15,
      },
    ];

    const startIdx = (page - 1) * pageSize;
    const paginatedReviews = reviews.slice(startIdx, startIdx + pageSize);

    return {
      reviews: paginatedReviews,
      totalCount: reviews.length,
    };
  }

  /**
   * Add template review
   */
  async addTemplateReview(
    templateId: string,
    reviewerId: string,
    rating: number,
    title: string,
    content: string
  ): Promise<TemplateReview> {
    this.logger.info(`Adding review for template ${templateId} by ${reviewerId}`);

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const review: TemplateReview = {
      id: `review-${Date.now()}`,
      templateId,
      reviewerId,
      rating,
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      helpful: 0,
    };

    this.logger.info(`Review added successfully for template ${templateId}`);
    return review;
  }

  /**
   * Install template to site
   */
  async installTemplate(
    templateId: string,
    siteId: string,
    configuration: Record<string, any>
  ): Promise<TemplateInstallation> {
    this.logger.info(`Installing template ${templateId} to site ${siteId}`);

    const template = await this.getTemplateDetails(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const installation: TemplateInstallation = {
      id: `install-${templateId}-${siteId}-${Date.now()}`,
      templateId,
      siteId,
      installationDate: new Date(),
      status: 'installing',
      version: template.metadata.version,
      configuration,
      healthStatus: 'healthy',
    };

    this.logger.info(`Installation started: ${installation.id}`);
    return installation;
  }

  /**
   * Get template installation status
   */
  async getInstallationStatus(installationId: string): Promise<TemplateInstallation | null> {
    this.logger.debug(`Checking installation status for ${installationId}`);

    // Simulate installation tracking
    const installation: TemplateInstallation = {
      id: installationId,
      templateId: 'template-wom',
      siteId: 'site-1',
      installationDate: new Date(Date.now() - 3600000),
      status: 'installed',
      version: '2.1.0',
      configuration: {},
      healthStatus: 'healthy',
    };

    return installation;
  }

  /**
   * Get installed templates for site
   */
  async getInstalledTemplates(siteId: string): Promise<TemplateInstallation[]> {
    this.logger.info(`Retrieving installed templates for site ${siteId}`);

    // Simulate installed templates
    const installations: TemplateInstallation[] = [
      {
        id: 'install-wom-site-1',
        templateId: 'template-wom',
        siteId,
        installationDate: new Date(Date.now() - 2592000000),
        status: 'installed',
        version: '2.1.0',
        configuration: { enableScheduling: true },
        healthStatus: 'healthy',
      },
      {
        id: 'install-dtc-site-1',
        templateId: 'template-dtc',
        siteId,
        installationDate: new Date(Date.now() - 5184000000),
        status: 'installed',
        version: '3.0.0',
        configuration: { supportBadgeScan: true },
        healthStatus: 'healthy',
      },
    ];

    return installations;
  }

  /**
   * Check template compatibility
   */
  async checkTemplateCompatibility(templateId: string, siteId: string): Promise<{
    compatible: boolean;
    missingDependencies: string[];
    conflicts: string[];
    warnings: string[];
  }> {
    this.logger.info(`Checking compatibility of template ${templateId} for site ${siteId}`);

    const template = await this.getTemplateDetails(templateId);
    if (!template) {
      return {
        compatible: false,
        missingDependencies: [templateId],
        conflicts: [],
        warnings: [],
      };
    }

    const installed = await this.getInstalledTemplates(siteId);
    const installedIds = installed.map((i) => i.templateId);

    const missingDependencies = template.dependencies.filter((dep) => !installedIds.includes(dep));
    const conflicts = template.conflictsWith.filter((conf) => installedIds.includes(conf));

    return {
      compatible: missingDependencies.length === 0 && conflicts.length === 0,
      missingDependencies,
      conflicts,
      warnings: missingDependencies.length > 0 ? ['Install dependencies first'] : [],
    };
  }

  /**
   * Uninstall template from site
   */
  async uninstallTemplate(installationId: string): Promise<void> {
    this.logger.info(`Uninstalling template: ${installationId}`);

    // Simulate uninstallation
    this.logger.info(`Template uninstalled successfully: ${installationId}`);
  }

  /**
   * Update installed template to new version
   */
  async updateTemplate(installationId: string, newVersion: string): Promise<TemplateInstallation> {
    this.logger.info(`Updating template ${installationId} to version ${newVersion}`);

    const installation: TemplateInstallation = {
      id: installationId,
      templateId: 'template-wom',
      siteId: 'site-1',
      installationDate: new Date(Date.now() - 2592000000),
      status: 'installed',
      version: newVersion,
      configuration: {},
      healthStatus: 'healthy',
    };

    this.logger.info(`Template updated to version ${newVersion}`);
    return installation;
  }

  /**
   * Get template update notifications
   */
  async getUpdateNotifications(siteId: string): Promise<
    Array<{
      templateId: string;
      templateName: string;
      currentVersion: string;
      newVersion: string;
      releaseDate: Date;
      releaseNotes: string;
    }>
  > {
    this.logger.info(`Checking for template updates for site ${siteId}`);

    const updates = [
      {
        templateId: 'template-wom',
        templateName: 'Work Order Management',
        currentVersion: '2.1.0',
        newVersion: '2.2.0',
        releaseDate: new Date(Date.now() - 86400000),
        releaseNotes: 'Bug fixes and performance improvements',
      },
    ];

    return updates;
  }
}
