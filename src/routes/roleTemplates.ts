/**
 * ✅ GITHUB ISSUE #125: Role Templates for Predefined Role Configurations
 *
 * API Routes for Role Template Management
 * Provides RESTful endpoints for CRUD operations on role templates and instantiation
 */

import express from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole, requirePermission } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import prisma from '../lib/database';
import { RoleTemplateService } from '../services/RoleTemplateService';
import { ManufacturingRoleTemplatesInitializer } from '../services/ManufacturingRoleTemplatesInitializer';
import {
  CreateRoleTemplateInput,
  UpdateRoleTemplateInput,
  InstantiateRoleTemplateInput,
  RoleTemplateListFilters
} from '../types/roleTemplate';

const router = express.Router();

// Initialize services
const roleTemplateService = new RoleTemplateService(prisma);
const manufacturingTemplatesInitializer = new ManufacturingRoleTemplatesInitializer(prisma);

// Validation schemas
const createRoleTemplateSchema = z.object({
  templateCode: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/, 'Template code must be uppercase alphanumeric with underscores/hyphens'),
  templateName: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['PRODUCTION', 'QUALITY', 'MAINTENANCE', 'MANAGEMENT', 'ADMINISTRATION', 'ENGINEERING', 'SAFETY', 'COMPLIANCE', 'CUSTOM']),
  isActive: z.boolean().default(true),
  isGlobal: z.boolean().default(true),
  version: z.string().default('1.0.0'),
  metadata: z.record(z.any()).optional(),
  permissions: z.array(z.object({
    permissionId: z.string(),
    isRequired: z.boolean().default(true),
    isOptional: z.boolean().default(false),
    metadata: z.record(z.any()).optional()
  })).optional()
});

const updateRoleTemplateSchema = createRoleTemplateSchema.partial();

const instantiateRoleTemplateSchema = z.object({
  templateId: z.string(),
  roleName: z.string().min(3).max(100),
  roleCode: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  instanceName: z.string().max(100).optional(),
  siteId: z.string().optional(),
  customPermissions: z.object({
    addPermissions: z.array(z.string()).optional(),
    removePermissions: z.array(z.string()).optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
});

const listTemplatesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  category: z.enum(['PRODUCTION', 'QUALITY', 'MAINTENANCE', 'MANAGEMENT', 'ADMINISTRATION', 'ENGINEERING', 'SAFETY', 'COMPLIANCE', 'CUSTOM']).optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  isGlobal: z.string().transform(val => val === 'true').optional(),
  search: z.string().optional(),
  sortBy: z.enum(['templateName', 'templateCode', 'category', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * @route GET /api/v1/role-templates
 * @desc List role templates with filtering and pagination
 * @access Private (requires users.view_roles permission)
 */
router.get('/',
  authMiddleware,
  requirePermission('users.view_roles'),
  asyncHandler(async (req, res) => {
    const query = listTemplatesQuerySchema.parse(req.query);

    const filters: RoleTemplateListFilters = {
      category: query.category,
      isActive: query.isActive,
      isGlobal: query.isGlobal,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    };

    const result = await roleTemplateService.listRoleTemplates(
      filters,
      query.page,
      query.limit
    );

    logger.info('Role templates listed', {
      userId: req.user!.id,
      filters,
      resultCount: result.templates.length,
      totalCount: result.pagination.total
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Role templates retrieved successfully'
    });
  })
);

/**
 * @route GET /api/v1/role-templates/:id
 * @desc Get role template by ID
 * @access Private (requires users.view_roles permission)
 */
router.get('/:id',
  authMiddleware,
  requirePermission('users.view_roles'),
  asyncHandler(async (req, res) => {
    const templateId = req.params.id;

    const template = await roleTemplateService.getRoleTemplateById(templateId);

    logger.info('Role template retrieved', {
      userId: req.user!.id,
      templateId,
      templateCode: template.templateCode
    });

    res.status(200).json({
      success: true,
      data: template,
      message: 'Role template retrieved successfully'
    });
  })
);

/**
 * @route GET /api/v1/role-templates/code/:templateCode
 * @desc Get role template by template code
 * @access Private (requires users.view_roles permission)
 */
router.get('/code/:templateCode',
  authMiddleware,
  requirePermission('users.view_roles'),
  asyncHandler(async (req, res) => {
    const templateCode = req.params.templateCode;

    const template = await roleTemplateService.getRoleTemplateByCode(templateCode);

    logger.info('Role template retrieved by code', {
      userId: req.user!.id,
      templateCode,
      templateId: template.id
    });

    res.status(200).json({
      success: true,
      data: template,
      message: 'Role template retrieved successfully'
    });
  })
);

/**
 * @route POST /api/v1/role-templates
 * @desc Create new role template
 * @access Private (requires users.manage_roles permission)
 */
router.post('/',
  authMiddleware,
  requirePermission('users.manage_roles'),
  asyncHandler(async (req, res) => {
    const input = createRoleTemplateSchema.parse(req.body) as CreateRoleTemplateInput;

    const template = await roleTemplateService.createRoleTemplate(input, req.user!.id);

    logger.info('Role template created', {
      userId: req.user!.id,
      templateId: template.id,
      templateCode: template.templateCode,
      templateName: template.templateName
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Role template created successfully'
    });
  })
);

/**
 * @route PUT /api/v1/role-templates/:id
 * @desc Update role template
 * @access Private (requires users.manage_roles permission)
 */
router.put('/:id',
  authMiddleware,
  requirePermission('users.manage_roles'),
  asyncHandler(async (req, res) => {
    const templateId = req.params.id;
    const input = updateRoleTemplateSchema.parse(req.body) as UpdateRoleTemplateInput;

    const template = await roleTemplateService.updateRoleTemplate(
      templateId,
      input,
      req.user!.id
    );

    logger.info('Role template updated', {
      userId: req.user!.id,
      templateId,
      templateCode: template.templateCode,
      updatedFields: Object.keys(input)
    });

    res.status(200).json({
      success: true,
      data: template,
      message: 'Role template updated successfully'
    });
  })
);

/**
 * @route DELETE /api/v1/role-templates/:id
 * @desc Delete role template (soft delete)
 * @access Private (requires users.manage_roles permission)
 */
router.delete('/:id',
  authMiddleware,
  requirePermission('users.manage_roles'),
  asyncHandler(async (req, res) => {
    const templateId = req.params.id;

    await roleTemplateService.deleteRoleTemplate(templateId, req.user!.id);

    logger.info('Role template deleted', {
      userId: req.user!.id,
      templateId
    });

    res.status(200).json({
      success: true,
      message: 'Role template deleted successfully'
    });
  })
);

/**
 * @route POST /api/v1/role-templates/:id/instantiate
 * @desc Instantiate role template into actual role
 * @access Private (requires users.manage_roles permission)
 */
router.post('/:id/instantiate',
  authMiddleware,
  requirePermission('users.manage_roles'),
  asyncHandler(async (req, res) => {
    const templateId = req.params.id;
    const input = instantiateRoleTemplateSchema.parse({
      ...req.body,
      templateId
    }) as InstantiateRoleTemplateInput;

    const instance = await roleTemplateService.instantiateRoleTemplate(
      input,
      req.user!.id
    );

    logger.info('Role template instantiated', {
      userId: req.user!.id,
      templateId,
      instanceId: instance.id,
      roleId: instance.role.id,
      roleName: input.roleName
    });

    res.status(201).json({
      success: true,
      data: instance,
      message: 'Role template instantiated successfully'
    });
  })
);

/**
 * @route GET /api/v1/role-templates/:id/usage-stats
 * @desc Get usage statistics for role template
 * @access Private (requires users.view_roles permission)
 */
router.get('/:id/usage-stats',
  authMiddleware,
  requirePermission('users.view_roles'),
  asyncHandler(async (req, res) => {
    const templateId = req.params.id;

    const stats = await roleTemplateService.getRoleTemplateUsageStats(templateId);

    logger.info('Role template usage stats retrieved', {
      userId: req.user!.id,
      templateId,
      totalInstances: stats.totalInstances,
      activeInstances: stats.activeInstances
    });

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Role template usage statistics retrieved successfully'
    });
  })
);

/**
 * @route POST /api/v1/role-templates/initialize-manufacturing
 * @desc Initialize predefined manufacturing role templates
 * @access Private (requires admin role)
 */
router.post('/initialize-manufacturing',
  authMiddleware,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const isAlreadyInitialized = await manufacturingTemplatesInitializer.areManufacturingTemplatesInitialized();

    if (isAlreadyInitialized) {
      logger.info('Manufacturing templates already initialized', {
        userId: req.user!.id
      });

      return res.status(200).json({
        success: true,
        message: 'Manufacturing role templates are already initialized'
      });
    }

    await manufacturingTemplatesInitializer.initializeManufacturingRoleTemplates(req.user!.id);

    logger.info('Manufacturing templates initialized', {
      userId: req.user!.id
    });

    res.status(201).json({
      success: true,
      message: 'Manufacturing role templates initialized successfully'
    });
  })
);

/**
 * @route GET /api/v1/role-templates/manufacturing/status
 * @desc Check manufacturing templates initialization status
 * @access Private (requires users.view_roles permission)
 */
router.get('/manufacturing/status',
  authMiddleware,
  requirePermission('users.view_roles'),
  asyncHandler(async (req, res) => {
    const isInitialized = await manufacturingTemplatesInitializer.areManufacturingTemplatesInitialized();
    const missingTemplates = await manufacturingTemplatesInitializer.getMissingManufacturingTemplates();

    logger.info('Manufacturing templates status checked', {
      userId: req.user!.id,
      isInitialized,
      missingCount: missingTemplates.length
    });

    res.status(200).json({
      success: true,
      data: {
        isInitialized,
        missingTemplates,
        totalExpected: 8, // Based on ManufacturingRoleTemplatesInitializer definitions
        foundCount: 8 - missingTemplates.length
      },
      message: 'Manufacturing templates status retrieved successfully'
    });
  })
);

/**
 * @route POST /api/v1/role-templates/manufacturing/create-missing
 * @desc Create only missing manufacturing templates
 * @access Private (requires admin role)
 */
router.post('/manufacturing/create-missing',
  authMiddleware,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const createdTemplates = await manufacturingTemplatesInitializer.createMissingManufacturingTemplates(req.user!.id);

    logger.info('Missing manufacturing templates created', {
      userId: req.user!.id,
      createdCount: createdTemplates.length,
      createdTemplates
    });

    res.status(201).json({
      success: true,
      data: {
        createdTemplates,
        createdCount: createdTemplates.length
      },
      message: `${createdTemplates.length} missing manufacturing templates created successfully`
    });
  })
);

/**
 * @route GET /api/v1/role-templates/categories
 * @desc Get available role template categories
 * @access Private (requires users.view_roles permission)
 */
router.get('/categories',
  authMiddleware,
  requirePermission('users.view_roles'),
  asyncHandler(async (req, res) => {
    const categories = [
      { value: 'PRODUCTION', label: 'Production', description: 'Production operations and manufacturing' },
      { value: 'QUALITY', label: 'Quality', description: 'Quality control and assurance' },
      { value: 'MAINTENANCE', label: 'Maintenance', description: 'Equipment maintenance and repair' },
      { value: 'MANAGEMENT', label: 'Management', description: 'Site and department management' },
      { value: 'ADMINISTRATION', label: 'Administration', description: 'Administrative and support functions' },
      { value: 'ENGINEERING', label: 'Engineering', description: 'Process and design engineering' },
      { value: 'SAFETY', label: 'Safety', description: 'Safety management and compliance' },
      { value: 'COMPLIANCE', label: 'Compliance', description: 'Regulatory and audit compliance' },
      { value: 'CUSTOM', label: 'Custom', description: 'Custom or site-specific roles' }
    ];

    res.status(200).json({
      success: true,
      data: categories,
      message: 'Role template categories retrieved successfully'
    });
  })
);

/**
 * @route GET /api/v1/role-templates/export
 * @desc Export role templates (future enhancement)
 * @access Private (requires users.view_roles permission)
 */
router.get('/export',
  authMiddleware,
  requirePermission('users.view_roles'),
  asyncHandler(async (req, res) => {
    // Placeholder for future export functionality
    res.status(501).json({
      success: false,
      message: 'Export functionality not yet implemented'
    });
  })
);

/**
 * Error handling middleware specific to role templates
 */
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error.message?.includes('Role template')) {
    logger.error('Role template operation error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      path: req.path,
      method: req.method
    });

    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'ROLE_TEMPLATE_ERROR'
    });
  }

  next(error);
});

export default router;