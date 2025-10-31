import express from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { handleAsync } from '../middleware/errorHandler';
import BuildBookPDFService, {
  GenerateBuildBookRequest,
  BuildBookTemplate,
} from '../services/BuildBookPDFService';
import BuildRecordService from '../services/BuildRecordService';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const GenerateBuildBookSchema = z.object({
  buildRecordId: z.string().cuid(),
  templateId: z.string().optional(),
  customTemplate: z.any().optional(), // Would be BuildBookTemplate type
  includePhotos: z.boolean().default(true),
  includeSignatures: z.boolean().default(true),
  includeAppendices: z.boolean().default(true),
  digitalSignatures: z.boolean().default(false),
  outputFormat: z.enum(['PDF', 'PDF_A']).default('PDF'),
  customerSpecific: z.boolean().default(false),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  customer: z.string().optional(),
  description: z.string().optional(),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    order: z.number().int().positive(),
    required: z.boolean(),
    includePhotos: z.boolean(),
    includeSignatures: z.boolean(),
    content: z.array(z.any()).default([]),
  })),
  headerConfig: z.object({
    includeCompanyLogo: z.boolean().default(true),
    includeCustomerLogo: z.boolean().default(false),
    includeTitle: z.boolean().default(true),
    includeEngineInfo: z.boolean().default(true),
    customText: z.string().optional(),
  }),
  footerConfig: z.object({
    includePageNumbers: z.boolean().default(true),
    includeGeneratedDate: z.boolean().default(true),
    includeSignatureInfo: z.boolean().default(true),
    customText: z.string().optional(),
  }),
  pageSettings: z.object({
    size: z.enum(['A4', 'Letter', 'Legal']).default('A4'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    margins: z.object({
      top: z.number().positive().default(50),
      bottom: z.number().positive().default(50),
      left: z.number().positive().default(50),
      right: z.number().positive().default(50),
    }),
  }),
});

const UpdateTemplateSchema = CreateTemplateSchema.partial();

const GetBuildBooksQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  pageSize: z.string().optional().transform(val => val ? parseInt(val) : 20),
  buildRecordId: z.string().cuid().optional(),
  dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
  dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
  generatedBy: z.string().cuid().optional(),
});

// ============================================================================
// BUILD BOOK GENERATION ENDPOINTS
// ============================================================================

/**
 * POST /api/build-books/generate
 * Generate build book PDF for a build record
 */
router.post(
  '/generate',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  validateRequest({ body: GenerateBuildBookSchema }),
  handleAsync(async (req, res) => {
    const generateRequest = req.body as z.infer<typeof GenerateBuildBookSchema>;

    // Verify build record exists and user has access
    const buildRecord = await BuildRecordService.getBuildRecordById(generateRequest.buildRecordId);
    if (!buildRecord) {
      return res.status(404).json({
        success: false,
        error: 'Build record not found',
      });
    }

    // Check if build record is in a state that allows PDF generation
    if (buildRecord.status === 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Cannot generate build book for draft build records',
      });
    }

    try {
      // Generate the build book
      const result = await BuildBookPDFService.generateBuildBook(generateRequest);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Build book generation failed',
          details: result.errors,
        });
      }

      // Log the generation event
      console.log(`Build book generated for ${buildRecord.buildRecordNumber} by user ${req.user!.id}`);

      res.json({
        success: true,
        data: {
          filePath: result.filePath,
          fileName: result.fileName,
          fileSize: result.fileSize,
          pageCount: result.pageCount,
          generatedAt: result.generatedAt,
          buildRecordNumber: result.buildRecordNumber,
          downloadUrl: `/api/build-books/download/${buildRecord.id}`,
        },
        message: 'Build book generated successfully',
        warnings: result.warnings,
      });

    } catch (error) {
      console.error('Build book generation error:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred during build book generation',
        details: error.message,
      });
    }
  })
);

/**
 * POST /api/build-books/generate/:buildRecordId
 * Generate build book with default settings for a specific build record
 */
router.post(
  '/generate/:buildRecordId',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const { buildRecordId } = req.params;

    const generateRequest: GenerateBuildBookRequest = {
      buildRecordId,
      includePhotos: true,
      includeSignatures: true,
      includeAppendices: true,
      digitalSignatures: false,
    };

    // Use the same logic as the main generate endpoint
    const buildRecord = await BuildRecordService.getBuildRecordById(buildRecordId);
    if (!buildRecord) {
      return res.status(404).json({
        success: false,
        error: 'Build record not found',
      });
    }

    if (buildRecord.status === 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Cannot generate build book for draft build records',
      });
    }

    try {
      const result = await BuildBookPDFService.generateBuildBook(generateRequest);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Build book generation failed',
          details: result.errors,
        });
      }

      res.json({
        success: true,
        data: {
          filePath: result.filePath,
          fileName: result.fileName,
          fileSize: result.fileSize,
          pageCount: result.pageCount,
          generatedAt: result.generatedAt,
          buildRecordNumber: result.buildRecordNumber,
          downloadUrl: `/api/build-books/download/${buildRecordId}`,
        },
        message: 'Build book generated successfully',
      });

    } catch (error) {
      console.error('Build book generation error:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred during build book generation',
        details: error.message,
      });
    }
  })
);

/**
 * GET /api/build-books/download/:buildRecordId
 * Download the latest build book PDF for a build record
 */
router.get(
  '/download/:buildRecordId',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const { buildRecordId } = req.params;

    // Get build record with file path
    const buildRecord = await BuildRecordService.getBuildRecordById(buildRecordId);
    if (!buildRecord) {
      return res.status(404).json({
        success: false,
        error: 'Build record not found',
      });
    }

    if (!buildRecord.buildBookGenerated || !buildRecord.buildBookPath) {
      return res.status(404).json({
        success: false,
        error: 'Build book has not been generated for this build record',
      });
    }

    const filePath = buildRecord.buildBookPath;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Build book file not found on disk',
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileName = `BuildBook_${buildRecord.buildRecordNumber}_v${buildRecord.buildBookVersion}.pdf`;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error streaming build book file',
        });
      }
    });
  })
);

/**
 * GET /api/build-books/preview/:buildRecordId
 * Preview build book PDF in browser (inline viewing)
 */
router.get(
  '/preview/:buildRecordId',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const { buildRecordId } = req.params;

    const buildRecord = await BuildRecordService.getBuildRecordById(buildRecordId);
    if (!buildRecord) {
      return res.status(404).json({
        success: false,
        error: 'Build record not found',
      });
    }

    if (!buildRecord.buildBookGenerated || !buildRecord.buildBookPath) {
      return res.status(404).json({
        success: false,
        error: 'Build book has not been generated for this build record',
      });
    }

    const filePath = buildRecord.buildBookPath;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Build book file not found on disk',
      });
    }

    const stats = fs.statSync(filePath);
    const fileName = `BuildBook_${buildRecord.buildRecordNumber}_v${buildRecord.buildBookVersion}.pdf`;

    // Set headers for inline viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size.toString());

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  })
);

/**
 * GET /api/build-books/status/:buildRecordId
 * Get build book generation status and information
 */
router.get(
  '/status/:buildRecordId',
  authenticateToken,
  requireRole(['staging_operator', 'staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const { buildRecordId } = req.params;

    const buildRecord = await BuildRecordService.getBuildRecordById(buildRecordId);
    if (!buildRecord) {
      return res.status(404).json({
        success: false,
        error: 'Build record not found',
      });
    }

    const status = {
      buildRecordId,
      buildRecordNumber: buildRecord.buildRecordNumber,
      buildBookGenerated: buildRecord.buildBookGenerated,
      buildBookGeneratedAt: buildRecord.buildBookGeneratedAt,
      buildBookVersion: buildRecord.buildBookVersion,
      buildBookPath: buildRecord.buildBookPath,
      canGenerate: buildRecord.status !== 'DRAFT',
      downloadAvailable: buildRecord.buildBookGenerated &&
                        buildRecord.buildBookPath &&
                        fs.existsSync(buildRecord.buildBookPath),
      downloadUrl: buildRecord.buildBookGenerated ? `/api/build-books/download/${buildRecordId}` : null,
      previewUrl: buildRecord.buildBookGenerated ? `/api/build-books/preview/${buildRecordId}` : null,
    };

    res.json({
      success: true,
      data: status,
    });
  })
);

// ============================================================================
// BUILD BOOK TEMPLATE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/build-books/templates
 * Get list of available build book templates
 */
router.get(
  '/templates',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    // For now, return mock templates - in production this would query the database
    const templates = [
      {
        id: 'default',
        name: 'AS9100 Standard Build Book',
        description: 'Standard aerospace build book template compliant with AS9100 requirements',
        customer: null,
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'boeing',
        name: 'Boeing Custom Template',
        description: 'Boeing-specific build book format with additional quality requirements',
        customer: 'Boeing',
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'airbus',
        name: 'Airbus Template',
        description: 'Airbus-compliant build book template with EASA requirements',
        customer: 'Airbus',
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    res.json({
      success: true,
      data: templates,
    });
  })
);

/**
 * GET /api/build-books/templates/:templateId
 * Get specific template details
 */
router.get(
  '/templates/:templateId',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const { templateId } = req.params;

    // For now, return a mock template - in production this would query the database
    if (templateId === 'default') {
      const template = {
        id: 'default',
        name: 'AS9100 Standard Build Book',
        description: 'Standard aerospace build book template compliant with AS9100 requirements',
        customer: null,
        sections: [
          {
            id: 'engine_identification',
            title: 'Engine Identification',
            order: 1,
            required: true,
            includePhotos: false,
            includeSignatures: false,
            content: [],
          },
          {
            id: 'as_built_configuration',
            title: 'As-Built Configuration',
            order: 2,
            required: true,
            includePhotos: true,
            includeSignatures: false,
            content: [],
          },
          {
            id: 'manufacturing_operations',
            title: 'Manufacturing Operations',
            order: 3,
            required: true,
            includePhotos: true,
            includeSignatures: true,
            content: [],
          },
        ],
        headerConfig: {
          includeCompanyLogo: true,
          includeCustomerLogo: false,
          includeTitle: true,
          includeEngineInfo: true,
          customText: null,
        },
        footerConfig: {
          includePageNumbers: true,
          includeGeneratedDate: true,
          includeSignatureInfo: true,
          customText: null,
        },
        pageSettings: {
          size: 'A4',
          orientation: 'portrait',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        },
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      res.json({
        success: true,
        data: template,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
  })
);

/**
 * POST /api/build-books/templates
 * Create new build book template
 */
router.post(
  '/templates',
  authenticateToken,
  requireRole(['production_manager', 'admin']),
  validateRequest({ body: CreateTemplateSchema }),
  handleAsync(async (req, res) => {
    const templateData = req.body as z.infer<typeof CreateTemplateSchema>;

    // In production, this would save to database
    const template = {
      id: `template_${Date.now()}`,
      ...templateData,
      isDefault: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user!.id,
    };

    res.status(201).json({
      success: true,
      data: template,
      message: 'Build book template created successfully',
    });
  })
);

/**
 * PUT /api/build-books/templates/:templateId
 * Update existing build book template
 */
router.put(
  '/templates/:templateId',
  authenticateToken,
  requireRole(['production_manager', 'admin']),
  validateRequest({ body: UpdateTemplateSchema }),
  handleAsync(async (req, res) => {
    const { templateId } = req.params;
    const updateData = req.body;

    // In production, this would update in database
    const template = {
      id: templateId,
      ...updateData,
      updatedAt: new Date(),
      updatedBy: req.user!.id,
    };

    res.json({
      success: true,
      data: template,
      message: 'Build book template updated successfully',
    });
  })
);

/**
 * DELETE /api/build-books/templates/:templateId
 * Delete build book template
 */
router.delete(
  '/templates/:templateId',
  authenticateToken,
  requireRole(['admin']),
  handleAsync(async (req, res) => {
    const { templateId } = req.params;

    if (templateId === 'default') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the default template',
      });
    }

    // In production, this would delete from database
    res.json({
      success: true,
      message: 'Build book template deleted successfully',
    });
  })
);

// ============================================================================
// BUILD BOOK HISTORY & ANALYTICS
// ============================================================================

/**
 * GET /api/build-books/history
 * Get build book generation history
 */
router.get(
  '/history',
  authenticateToken,
  requireRole(['staging_coordinator', 'production_manager', 'admin']),
  validateRequest({ query: GetBuildBooksQuerySchema }),
  handleAsync(async (req, res) => {
    const query = req.query as z.infer<typeof GetBuildBooksQuerySchema>;

    // In production, this would query actual generation history
    const mockHistory = {
      buildBooks: [
        {
          id: '1',
          buildRecordId: 'rec_123',
          buildRecordNumber: 'BR-GE9X-2024-0001',
          fileName: 'BuildBook_BR-GE9X-2024-0001_v1.pdf',
          fileSize: 2500000,
          pageCount: 45,
          templateUsed: 'AS9100 Standard',
          generatedAt: new Date(),
          generatedBy: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@company.com',
          },
          downloadCount: 3,
          lastDownloaded: new Date(),
        },
      ],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: 1,
        totalPages: 1,
      },
    };

    res.json({
      success: true,
      data: mockHistory,
    });
  })
);

/**
 * GET /api/build-books/analytics
 * Get build book generation analytics
 */
router.get(
  '/analytics',
  authenticateToken,
  requireRole(['production_manager', 'admin']),
  handleAsync(async (req, res) => {
    const analytics = {
      totalBuildBooksGenerated: 150,
      buildBooksGeneratedThisMonth: 25,
      averageGenerationTime: 45, // seconds
      mostUsedTemplate: 'AS9100 Standard',
      templateUsage: [
        { templateName: 'AS9100 Standard', count: 120 },
        { templateName: 'Boeing Custom', count: 20 },
        { templateName: 'Airbus Template', count: 10 },
      ],
      generationsByMonth: [
        { month: '2024-01', count: 12 },
        { month: '2024-02', count: 18 },
        { month: '2024-03', count: 25 },
      ],
      averagePageCount: 42,
      averageFileSize: 2.3, // MB
      errorRate: 2.5, // percentage
    };

    res.json({
      success: true,
      data: analytics,
    });
  })
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Build book API error:', error);

  if (error.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      error: 'File not found',
    });
  }

  if (error.code === 'EACCES') {
    return res.status(403).json({
      success: false,
      error: 'Access denied to file',
    });
  }

  next(error);
});

export default router;