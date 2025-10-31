/**
 * Andon Configuration API Routes
 * GitHub Issue #171: Production Alerts & Andon Core Infrastructure
 *
 * REST API endpoints for Andon configuration management including:
 * - Global configuration settings
 * - Site-specific configuration overrides
 * - Notification templates
 * - System settings
 * - Configuration validation and deployment
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AndonService } from '../services/AndonService';
import { asyncHandler, ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { requireSiteAccess, requireAdminAccess } from '../middleware/auth';
import { auditLogger } from '../middleware/requestLogger';
import { logger } from '../utils/logger';
import { AndonSeverity, AndonPriority } from '@prisma/client';
import prisma from '../lib/database';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Configuration schemas
const setConfigurationSchema = z.object({
  configKey: z.string().min(1, 'Configuration key is required').max(100),
  configValue: z.any(),
  description: z.string().max(500).optional(),
  dataType: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'ARRAY']),
  category: z.enum(['GENERAL', 'ESCALATION', 'NOTIFICATION', 'UI', 'INTEGRATION']),
  isRequired: z.boolean().optional(),
  validationRules: z.any().optional(),
  defaultValue: z.any().optional(),
  isEncrypted: z.boolean().optional(),
  accessLevel: z.enum(['ADMIN', 'MANAGER', 'SUPERVISOR']).optional()
});

const setSiteConfigurationSchema = z.object({
  siteId: z.string().min(1, 'Site ID is required'),
  configKey: z.string().min(1, 'Configuration key is required').max(100),
  configValue: z.any(),
  isOverride: z.boolean().optional(),
  inheritFromGlobal: z.boolean().optional()
});

const bulkConfigurationSchema = z.object({
  configurations: z.array(setConfigurationSchema).min(1, 'At least one configuration required')
});

const bulkSiteConfigurationSchema = z.object({
  siteId: z.string().min(1, 'Site ID is required'),
  configurations: z.array(z.object({
    configKey: z.string().min(1),
    configValue: z.any(),
    isOverride: z.boolean().optional(),
    inheritFromGlobal: z.boolean().optional()
  })).min(1)
});

// Notification template schemas
const createNotificationTemplateSchema = z.object({
  templateKey: z.string().min(1, 'Template key is required').max(100),
  templateName: z.string().min(1, 'Template name is required').max(200),
  description: z.string().max(500).optional(),
  subject: z.string().min(1, 'Subject is required').max(200),
  bodyTemplate: z.string().min(1, 'Body template is required'),
  variables: z.any().optional(),
  emailTemplate: z.string().optional(),
  smsTemplate: z.string().optional(),
  pushTemplate: z.string().optional(),
  siteId: z.string().optional(),
  priority: z.number().int().optional()
});

const updateNotificationTemplateSchema = z.object({
  templateName: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  subject: z.string().min(1).max(200).optional(),
  bodyTemplate: z.string().min(1).optional(),
  variables: z.any().optional(),
  emailTemplate: z.string().optional(),
  smsTemplate: z.string().optional(),
  pushTemplate: z.string().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional()
});

// System settings schemas
const updateSystemSettingsSchema = z.object({
  siteId: z.string().optional(),
  andonEnabled: z.boolean().optional(),
  escalationEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  defaultSeverity: z.nativeEnum(AndonSeverity).optional(),
  defaultPriority: z.nativeEnum(AndonPriority).optional(),
  autoAssignEnabled: z.boolean().optional(),
  defaultResponseTimeMin: z.number().int().positive().optional(),
  maxEscalationLevels: z.number().int().positive().max(10).optional(),
  baseEscalationDelayMin: z.number().int().positive().optional(),
  enableMobileAccess: z.boolean().optional(),
  enableKioskMode: z.boolean().optional(),
  requireComments: z.boolean().optional(),
  allowAnonymousReports: z.boolean().optional(),
  integrationSettings: z.any().optional()
});

// ============================================================================
// GLOBAL CONFIGURATION ROUTES
// ============================================================================

/**
 * @route GET /api/v1/andon/config
 * @desc Get all global configurations
 * @access Private - Requires admin access
 */
router.get('/config',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const category = req.query.category as string;
    const activeOnly = req.query.activeOnly !== 'false';

    const whereClause: any = {};
    if (category) {
      whereClause.category = category;
    }
    if (activeOnly) {
      whereClause.isActive = true;
    }

    const configurations = await prisma.andonConfiguration.findMany({
      where: whereClause,
      include: {
        lastModifiedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { configKey: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: configurations
    });
  })
);

/**
 * @route GET /api/v1/andon/config/:key
 * @desc Get specific configuration value (with site override support)
 * @access Private - Requires site access
 */
router.get('/config/:key',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    const siteId = req.query.siteId as string;

    const value = await AndonService.getConfiguration(key, siteId);

    if (value === null || value === undefined) {
      throw new NotFoundError(`Configuration '${key}' not found`);
    }

    res.json({
      success: true,
      data: {
        configKey: key,
        configValue: value,
        siteId: siteId || null,
        isOverride: !!siteId
      }
    });
  })
);

/**
 * @route POST /api/v1/andon/config
 * @desc Set global configuration value
 * @access Private - Requires admin access
 */
router.post('/config',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const validationResult = setConfigurationSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid configuration data', validationResult.error.errors);
    }

    if (!req.user?.id) {
      throw new ValidationError('User ID is required');
    }

    const configData = { ...validationResult.data, lastModifiedBy: req.user.id };
    const configuration = await AndonService.setConfiguration(configData);

    auditLogger.info('Global Andon configuration set', {
      userId: req.user.id,
      configKey: configuration.configKey,
      category: configuration.category
    });

    res.status(201).json({
      success: true,
      data: configuration,
      message: 'Configuration set successfully'
    });
  })
);

/**
 * @route POST /api/v1/andon/config/bulk
 * @desc Set multiple global configurations
 * @access Private - Requires admin access
 */
router.post('/config/bulk',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const validationResult = bulkConfigurationSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid bulk configuration data', validationResult.error.errors);
    }

    if (!req.user?.id) {
      throw new ValidationError('User ID is required');
    }

    const results = [];
    for (const configData of validationResult.data.configurations) {
      const config = await AndonService.setConfiguration({
        ...configData,
        lastModifiedBy: req.user.id
      });
      results.push(config);
    }

    auditLogger.info('Bulk global Andon configurations set', {
      userId: req.user.id,
      count: results.length,
      keys: results.map(c => c.configKey)
    });

    res.status(201).json({
      success: true,
      data: results,
      message: `${results.length} configurations set successfully`
    });
  })
);

/**
 * @route DELETE /api/v1/andon/config/:key
 * @desc Delete global configuration
 * @access Private - Requires admin access
 */
router.delete('/config/:key',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;

    const deletedConfig = await prisma.andonConfiguration.delete({
      where: { configKey: key }
    });

    auditLogger.info('Global Andon configuration deleted', {
      userId: req.user?.id,
      configKey: key
    });

    res.json({
      success: true,
      data: deletedConfig,
      message: 'Configuration deleted successfully'
    });
  })
);

// ============================================================================
// SITE-SPECIFIC CONFIGURATION ROUTES
// ============================================================================

/**
 * @route GET /api/v1/andon/config/sites/:siteId
 * @desc Get site-specific configurations
 * @access Private - Requires site access
 */
router.get('/config/sites/:siteId',
  requireSiteAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { siteId } = req.params;
    const activeOnly = req.query.activeOnly !== 'false';

    // Check site access
    if (!req.user?.sites?.includes(siteId)) {
      throw new ForbiddenError('Access denied to specified site');
    }

    const whereClause: any = { siteId };
    if (activeOnly) {
      whereClause.isActive = true;
    }

    const siteConfigurations = await prisma.andonSiteConfiguration.findMany({
      where: whereClause,
      include: {
        site: {
          select: { id: true, siteName: true }
        },
        lastModifiedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { configKey: 'asc' }
    });

    res.json({
      success: true,
      data: siteConfigurations
    });
  })
);

/**
 * @route POST /api/v1/andon/config/sites
 * @desc Set site-specific configuration override
 * @access Private - Requires admin access
 */
router.post('/config/sites',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const validationResult = setSiteConfigurationSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid site configuration data', validationResult.error.errors);
    }

    if (!req.user?.id) {
      throw new ValidationError('User ID is required');
    }

    const configData = { ...validationResult.data, lastModifiedBy: req.user.id };
    const configuration = await AndonService.setSiteConfiguration(configData);

    auditLogger.info('Site Andon configuration set', {
      userId: req.user.id,
      siteId: configuration.siteId,
      configKey: configuration.configKey
    });

    res.status(201).json({
      success: true,
      data: configuration,
      message: 'Site configuration set successfully'
    });
  })
);

/**
 * @route POST /api/v1/andon/config/sites/bulk
 * @desc Set multiple site-specific configurations
 * @access Private - Requires admin access
 */
router.post('/config/sites/bulk',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const validationResult = bulkSiteConfigurationSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid bulk site configuration data', validationResult.error.errors);
    }

    if (!req.user?.id) {
      throw new ValidationError('User ID is required');
    }

    const { siteId, configurations } = validationResult.data;
    const results = [];

    for (const configData of configurations) {
      const config = await AndonService.setSiteConfiguration({
        siteId,
        ...configData,
        lastModifiedBy: req.user.id
      });
      results.push(config);
    }

    auditLogger.info('Bulk site Andon configurations set', {
      userId: req.user.id,
      siteId,
      count: results.length,
      keys: results.map(c => c.configKey)
    });

    res.status(201).json({
      success: true,
      data: results,
      message: `${results.length} site configurations set successfully`
    });
  })
);

/**
 * @route DELETE /api/v1/andon/config/sites/:siteId/:key
 * @desc Delete site-specific configuration override
 * @access Private - Requires admin access
 */
router.delete('/config/sites/:siteId/:key',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { siteId, key } = req.params;

    const deletedConfig = await prisma.andonSiteConfiguration.delete({
      where: {
        siteId_configKey: {
          siteId,
          configKey: key
        }
      }
    });

    auditLogger.info('Site Andon configuration deleted', {
      userId: req.user?.id,
      siteId,
      configKey: key
    });

    res.json({
      success: true,
      data: deletedConfig,
      message: 'Site configuration override deleted successfully'
    });
  })
);

// ============================================================================
// NOTIFICATION TEMPLATE ROUTES
// ============================================================================

/**
 * @route GET /api/v1/andon/config/notification-templates
 * @desc Get notification templates
 * @access Private - Requires admin access
 */
router.get('/config/notification-templates',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const siteId = req.query.siteId as string;
    const activeOnly = req.query.activeOnly !== 'false';

    const whereClause: any = {};
    if (siteId) {
      whereClause.OR = [
        { siteId: siteId },
        { siteId: null } // Include global templates
      ];
    }
    if (activeOnly) {
      whereClause.isActive = true;
    }

    const templates = await prisma.andonNotificationTemplate.findMany({
      where: whereClause,
      include: {
        site: {
          select: { id: true, siteName: true }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { templateName: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: templates
    });
  })
);

/**
 * @route POST /api/v1/andon/config/notification-templates
 * @desc Create notification template
 * @access Private - Requires admin access
 */
router.post('/config/notification-templates',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const validationResult = createNotificationTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid notification template data', validationResult.error.errors);
    }

    if (!req.user?.id) {
      throw new ValidationError('User ID is required');
    }

    const templateData = { ...validationResult.data, createdBy: req.user.id };
    const template = await prisma.andonNotificationTemplate.create({
      data: templateData
    });

    auditLogger.info('Andon notification template created', {
      userId: req.user.id,
      templateId: template.id,
      templateKey: template.templateKey
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Notification template created successfully'
    });
  })
);

/**
 * @route GET /api/v1/andon/config/notification-templates/:id
 * @desc Get specific notification template
 * @access Private - Requires admin access
 */
router.get('/config/notification-templates/:id',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const template = await prisma.andonNotificationTemplate.findUnique({
      where: { id },
      include: {
        site: {
          select: { id: true, siteName: true }
        }
      }
    });

    if (!template) {
      throw new NotFoundError('Notification template not found');
    }

    res.json({
      success: true,
      data: template
    });
  })
);

/**
 * @route PUT /api/v1/andon/config/notification-templates/:id
 * @desc Update notification template
 * @access Private - Requires admin access
 */
router.put('/config/notification-templates/:id',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const validationResult = updateNotificationTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid notification template update data', validationResult.error.errors);
    }

    if (!req.user?.id) {
      throw new ValidationError('User ID is required');
    }

    const updateData = { ...validationResult.data, updatedBy: req.user.id };
    const template = await prisma.andonNotificationTemplate.update({
      where: { id },
      data: updateData
    });

    auditLogger.info('Andon notification template updated', {
      userId: req.user.id,
      templateId: id,
      changes: validationResult.data
    });

    res.json({
      success: true,
      data: template,
      message: 'Notification template updated successfully'
    });
  })
);

// ============================================================================
// SYSTEM SETTINGS ROUTES
// ============================================================================

/**
 * @route GET /api/v1/andon/config/system-settings
 * @desc Get system settings (global and site-specific)
 * @access Private - Requires admin access
 */
router.get('/config/system-settings',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const siteId = req.query.siteId as string;

    const whereClause: any = {};
    if (siteId) {
      whereClause.OR = [
        { siteId: siteId },
        { siteId: null } // Include global settings
      ];
    }

    const settings = await prisma.andonSystemSettings.findMany({
      where: whereClause,
      include: {
        site: {
          select: { id: true, siteName: true }
        },
        lastModifiedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { siteId: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: settings
    });
  })
);

/**
 * @route POST /api/v1/andon/config/system-settings
 * @desc Create or update system settings
 * @access Private - Requires admin access
 */
router.post('/config/system-settings',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const validationResult = updateSystemSettingsSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid system settings data', validationResult.error.errors);
    }

    if (!req.user?.id) {
      throw new ValidationError('User ID is required');
    }

    const { siteId, ...settingsData } = validationResult.data;
    const data = { ...settingsData, lastModifiedBy: req.user.id };

    const settings = await prisma.andonSystemSettings.upsert({
      where: {
        siteId: siteId || 'global-settings'
      },
      update: data,
      create: {
        siteId,
        ...data
      },
      include: {
        site: {
          select: { id: true, siteName: true }
        }
      }
    });

    auditLogger.info('Andon system settings updated', {
      userId: req.user.id,
      siteId: siteId || 'global',
      settingsId: settings.id
    });

    res.json({
      success: true,
      data: settings,
      message: 'System settings updated successfully'
    });
  })
);

// ============================================================================
// CONFIGURATION VALIDATION AND DEPLOYMENT
// ============================================================================

/**
 * @route POST /api/v1/andon/config/validate
 * @desc Validate configuration changes before deployment
 * @access Private - Requires admin access
 */
router.post('/config/validate',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { configurations, siteId } = req.body;

    if (!Array.isArray(configurations)) {
      throw new ValidationError('Configurations must be an array');
    }

    const validationResults = [];
    const errors = [];

    for (const config of configurations) {
      try {
        // Validate configuration format
        const validation = setConfigurationSchema.safeParse(config);
        if (!validation.success) {
          errors.push({
            configKey: config.configKey,
            error: 'Invalid format',
            details: validation.error.errors
          });
          continue;
        }

        // Validate data type
        const { configValue, dataType } = validation.data;
        let isValidType = true;

        switch (dataType) {
          case 'STRING':
            isValidType = typeof configValue === 'string';
            break;
          case 'NUMBER':
            isValidType = typeof configValue === 'number';
            break;
          case 'BOOLEAN':
            isValidType = typeof configValue === 'boolean';
            break;
          case 'JSON':
            isValidType = typeof configValue === 'object';
            break;
          case 'ARRAY':
            isValidType = Array.isArray(configValue);
            break;
        }

        if (!isValidType) {
          errors.push({
            configKey: config.configKey,
            error: 'Data type mismatch',
            expectedType: dataType,
            actualType: typeof configValue
          });
          continue;
        }

        validationResults.push({
          configKey: config.configKey,
          status: 'valid'
        });

      } catch (error) {
        errors.push({
          configKey: config.configKey,
          error: 'Validation error',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const isValid = errors.length === 0;

    res.json({
      success: true,
      data: {
        isValid,
        validConfigurations: validationResults.length,
        invalidConfigurations: errors.length,
        errors,
        validationResults
      },
      message: isValid ? 'All configurations are valid' : `${errors.length} configuration(s) have validation errors`
    });
  })
);

/**
 * @route GET /api/v1/andon/config/export
 * @desc Export configuration for backup or transfer
 * @access Private - Requires admin access
 */
router.get('/config/export',
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const siteId = req.query.siteId as string;
    const includeGlobal = req.query.includeGlobal !== 'false';

    const exportData: any = {
      exportTimestamp: new Date().toISOString(),
      exportedBy: req.user?.id,
      siteId: siteId || null
    };

    // Export global configurations
    if (!siteId || includeGlobal) {
      exportData.globalConfigurations = await prisma.andonConfiguration.findMany({
        where: { isActive: true },
        select: {
          configKey: true,
          configValue: true,
          description: true,
          dataType: true,
          category: true,
          isRequired: true,
          validationRules: true,
          defaultValue: true,
          accessLevel: true
        }
      });
    }

    // Export site configurations
    if (siteId) {
      exportData.siteConfigurations = await prisma.andonSiteConfiguration.findMany({
        where: { siteId, isActive: true },
        select: {
          configKey: true,
          configValue: true,
          isOverride: true,
          inheritFromGlobal: true
        }
      });
    }

    // Export notification templates
    const templateWhere: any = { isActive: true };
    if (siteId) {
      templateWhere.OR = [
        { siteId: siteId },
        { siteId: null }
      ];
    }

    exportData.notificationTemplates = await prisma.andonNotificationTemplate.findMany({
      where: templateWhere,
      select: {
        templateKey: true,
        templateName: true,
        description: true,
        subject: true,
        bodyTemplate: true,
        variables: true,
        emailTemplate: true,
        smsTemplate: true,
        pushTemplate: true,
        siteId: true,
        priority: true
      }
    });

    // Export system settings
    const settingsWhere: any = {};
    if (siteId) {
      settingsWhere.OR = [
        { siteId: siteId },
        { siteId: null }
      ];
    }

    exportData.systemSettings = await prisma.andonSystemSettings.findMany({
      where: settingsWhere,
      select: {
        siteId: true,
        andonEnabled: true,
        escalationEnabled: true,
        notificationsEnabled: true,
        defaultSeverity: true,
        defaultPriority: true,
        autoAssignEnabled: true,
        defaultResponseTimeMin: true,
        maxEscalationLevels: true,
        baseEscalationDelayMin: true,
        enableMobileAccess: true,
        enableKioskMode: true,
        requireComments: true,
        allowAnonymousReports: true,
        integrationSettings: true
      }
    });

    auditLogger.info('Andon configuration exported', {
      userId: req.user?.id,
      siteId: siteId || 'global',
      globalConfigs: exportData.globalConfigurations?.length || 0,
      siteConfigs: exportData.siteConfigurations?.length || 0,
      templates: exportData.notificationTemplates?.length || 0
    });

    res.json({
      success: true,
      data: exportData
    });
  })
);

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Andon Configuration API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });

  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: error.message,
      details: error.details
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: error.message
    });
  }

  if (error instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: error.message
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

export default router;