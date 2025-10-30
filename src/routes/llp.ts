/**
 * Life-Limited Parts (LLP) API Routes
 *
 * Comprehensive REST API for LLP back-to-birth traceability, life tracking,
 * alert management, certification document management, and regulatory compliance.
 *
 * Supports IATA, FAA, EASA regulatory requirements for safety-critical
 * aerospace components.
 */

import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { LLPService } from '../services/LLPService';
import { LLPAlertService } from '../services/LLPAlertService';
import { LLPCertificationService } from '../services/LLPCertificationService';
import { LLPReportingService, ExportFormat, ReportType } from '../services/LLPReportingService';
import { requireProductionAccess } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import {
  LLPCriticalityLevel,
  LLPRetirementType,
  LLPAlertSeverity,
  LLPCertificationType
} from '@prisma/client';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Initialize services
const llpService = new LLPService(prisma);
const llpAlertService = new LLPAlertService(prisma);
const llpCertificationService = new LLPCertificationService(prisma);
const llpReportingService = new LLPReportingService(prisma, llpService, llpCertificationService);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const llpConfigurationSchema = z.object({
  partId: z.string(),
  isLifeLimited: z.boolean(),
  criticalityLevel: z.nativeEnum(LLPCriticalityLevel),
  retirementType: z.nativeEnum(LLPRetirementType),
  cycleLimit: z.number().int().positive().optional(),
  timeLimit: z.number().int().positive().optional(),
  inspectionInterval: z.number().int().positive().optional(),
  regulatoryReference: z.string().optional(),
  certificationRequired: z.boolean(),
  notes: z.string().optional(),
});

const llpLifeEventSchema = z.object({
  serializedPartId: z.string(),
  eventType: z.string(),
  eventDate: z.string().datetime(),
  cyclesAtEvent: z.number().int().min(0).optional(),
  hoursAtEvent: z.number().min(0).optional(),
  parentAssemblyId: z.string().optional(),
  parentSerialNumber: z.string().optional(),
  workOrderId: z.string().optional(),
  operationId: z.string().optional(),
  performedBy: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  certificationUrls: z.array(z.string()).optional(),
  inspectionResults: z.any().optional(),
  repairDetails: z.any().optional(),
  metadata: z.any().optional(),
});

const llpAlertConfigSchema = z.object({
  serializedPartId: z.string().optional(),
  globalConfig: z.boolean().optional(),
  enabled: z.boolean(),
  thresholds: z.object({
    info: z.number().min(0).max(100),
    warning: z.number().min(0).max(100),
    critical: z.number().min(0).max(100),
    urgent: z.number().min(0).max(100),
  }),
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    dashboard: z.boolean(),
  }),
  recipients: z.array(z.string()),
});

const llpRetirementSchema = z.object({
  serializedPartId: z.string(),
  retirementDate: z.string().datetime(),
  retirementCycles: z.number().int().min(0),
  retirementReason: z.string(),
  disposition: z.enum(['SCRAP', 'MUSEUM', 'TRAINING', 'RETURN_TO_OEM']),
  performedBy: z.string(),
  location: z.string(),
  notes: z.string().optional(),
});

const certificationVerifySchema = z.object({
  certificationId: z.string(),
  verifiedBy: z.string(),
  verificationNotes: z.string().optional(),
  complianceStandards: z.array(z.string()).optional(),
});

const reportGenerationSchema = z.object({
  format: z.nativeEnum(ExportFormat).optional().default(ExportFormat.PDF),
  filters: z.object({
    partNumber: z.string().optional(),
    criticalityLevel: z.string().optional(),
    status: z.string().optional(),
    dateRange: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }).optional(),
  }).optional(),
  includeGraphics: z.boolean().optional().default(true),
  includeRawData: z.boolean().optional().default(false),
});

const retirementForecastSchema = z.object({
  daysAhead: z.number().int().min(1).max(3650).optional().default(365),
  format: z.nativeEnum(ExportFormat).optional().default(ExportFormat.PDF),
});

const complianceReportSchema = z.object({
  regulatoryStandard: z.enum(['IATA', 'FAA', 'EASA', 'ALL']).optional().default('ALL'),
  format: z.nativeEnum(ExportFormat).optional().default(ExportFormat.PDF),
});

// ============================================================================
// LLP CONFIGURATION ROUTES
// ============================================================================

/**
 * @route POST /api/v1/llp/configuration
 * @desc Configure LLP settings for a part
 * @access Private (Production Access Required)
 */
router.post(
  '/configuration',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = llpConfigurationSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid LLP configuration data', validationResult.error.errors);
    }

    const config = validationResult.data;
    const result = await llpService.configureLLPPart(config);

    logger.info('LLP configuration created', {
      userId: req.user?.id,
      partId: config.partId,
      criticalityLevel: config.criticalityLevel,
      retirementType: config.retirementType,
    });

    return res.status(201).json(result);
  })
);

/**
 * @route GET /api/v1/llp/configuration/:partId
 * @desc Get LLP configuration for a part
 * @access Private (Production Access Required)
 */
router.get(
  '/configuration/:partId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { partId } = req.params;
    const config = await llpService.getLLPConfiguration(partId);

    if (!config) {
      return res.status(404).json({ error: 'LLP configuration not found' });
    }

    logger.info('LLP configuration retrieved', {
      userId: req.user?.id,
      partId,
    });

    return res.status(200).json(config);
  })
);

// ============================================================================
// LIFE TRACKING AND HISTORY ROUTES
// ============================================================================

/**
 * @route POST /api/v1/llp/life-events
 * @desc Record a life event for an LLP
 * @access Private (Production Access Required)
 */
router.post(
  '/life-events',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = llpLifeEventSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid life event data', validationResult.error.errors);
    }

    const eventData = {
      ...validationResult.data,
      eventDate: new Date(validationResult.data.eventDate),
    };

    const eventId = await llpService.recordLifeEvent(eventData);

    logger.info('LLP life event recorded', {
      userId: req.user?.id,
      eventId,
      serializedPartId: eventData.serializedPartId,
      eventType: eventData.eventType,
    });

    return res.status(201).json({ id: eventId });
  })
);

/**
 * @route GET /api/v1/llp/life-status/:serializedPartId
 * @desc Get current life status for an LLP
 * @access Private (Production Access Required)
 */
router.get(
  '/life-status/:serializedPartId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serializedPartId } = req.params;
    const status = await llpService.getLifeStatus(serializedPartId);

    logger.info('LLP life status retrieved', {
      userId: req.user?.id,
      serializedPartId,
      overallPercentageUsed: status.overallPercentageUsed,
      alertLevel: status.alertLevel,
    });

    return res.status(200).json(status);
  })
);

/**
 * @route GET /api/v1/llp/back-to-birth/:serializedPartId
 * @desc Get complete back-to-birth traceability record
 * @access Private (Production Access Required)
 */
router.get(
  '/back-to-birth/:serializedPartId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serializedPartId } = req.params;
    const trace = await llpService.getBackToBirthTrace(serializedPartId);

    logger.info('LLP back-to-birth trace retrieved', {
      userId: req.user?.id,
      serializedPartId,
      installationCount: trace.installationHistory.length,
      maintenanceCount: trace.maintenanceHistory.length,
    });

    return res.status(200).json(trace);
  })
);

/**
 * @route GET /api/v1/llp/life-history/:serializedPartId
 * @desc Get complete life history for an LLP
 * @access Private (Production Access Required)
 */
router.get(
  '/life-history/:serializedPartId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serializedPartId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const eventType = req.query.eventType as string | undefined;

    const history = await llpService.getLifeHistory(serializedPartId, {
      page,
      limit,
      eventType,
    });

    logger.info('LLP life history retrieved', {
      userId: req.user?.id,
      serializedPartId,
      page,
      limit,
      eventType,
      resultCount: history.data.length,
    });

    return res.status(200).json(history);
  })
);

// ============================================================================
// ALERT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route POST /api/v1/llp/alerts/configuration
 * @desc Configure alert settings for LLP monitoring
 * @access Private (Production Access Required)
 */
router.post(
  '/alerts/configuration',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = llpAlertConfigSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid alert configuration data', validationResult.error.errors);
    }

    const config = validationResult.data;
    await llpAlertService.configureAlerts(config);

    logger.info('LLP alert configuration updated', {
      userId: req.user?.id,
      serializedPartId: config.serializedPartId,
      globalConfig: config.globalConfig,
      enabled: config.enabled,
    });

    return res.status(200).json({ message: 'Alert configuration updated successfully' });
  })
);

/**
 * @route GET /api/v1/llp/alerts
 * @desc Get active alerts with filtering options
 * @access Private (Production Access Required)
 */
router.get(
  '/alerts',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const filters = {
      serializedPartId: req.query.serializedPartId as string | undefined,
      severity: req.query.severity as LLPAlertSeverity | undefined,
      isActive: req.query.isActive === 'true',
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 50,
    };

    const alerts = await llpAlertService.getAlerts(filters);

    logger.info('LLP alerts retrieved', {
      userId: req.user?.id,
      filters,
      resultCount: alerts.data.length,
    });

    return res.status(200).json(alerts);
  })
);

/**
 * @route POST /api/v1/llp/alerts/:alertId/acknowledge
 * @desc Acknowledge an LLP alert
 * @access Private (Production Access Required)
 */
router.post(
  '/alerts/:alertId/acknowledge',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const { notes } = req.body;
    const userId = req.user?.id || 'system';

    await llpAlertService.acknowledgeAlert(alertId, userId, notes);

    logger.info('LLP alert acknowledged', {
      userId: req.user?.id,
      alertId,
      acknowledgedBy: userId,
    });

    return res.status(200).json({ message: 'Alert acknowledged successfully' });
  })
);

/**
 * @route POST /api/v1/llp/alerts/:alertId/resolve
 * @desc Resolve an LLP alert
 * @access Private (Production Access Required)
 */
router.post(
  '/alerts/:alertId/resolve',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const { resolution, notes } = req.body;
    const userId = req.user?.id || 'system';

    await llpAlertService.resolveAlert(alertId, userId, resolution, notes);

    logger.info('LLP alert resolved', {
      userId: req.user?.id,
      alertId,
      resolvedBy: userId,
      resolution,
    });

    return res.status(200).json({ message: 'Alert resolved successfully' });
  })
);

// ============================================================================
// CERTIFICATION DOCUMENT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route POST /api/v1/llp/certifications/upload
 * @desc Upload certification document
 * @access Private (Production Access Required)
 */
router.post(
  '/certifications/upload',
  requireProductionAccess,
  upload.single('document'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('Document file is required');
    }

    const uploadRequest = {
      file: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      uploadedBy: req.user?.id || 'system',
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
    };

    const result = await llpCertificationService.uploadDocument(uploadRequest);

    logger.info('LLP certification document uploaded', {
      userId: req.user?.id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      documentUrl: result.documentUrl,
    });

    return res.status(201).json(result);
  })
);

/**
 * @route POST /api/v1/llp/certifications
 * @desc Create new certification record
 * @access Private (Production Access Required)
 */
router.post(
  '/certifications',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const certificationData = {
      ...req.body,
      issuedDate: req.body.issuedDate ? new Date(req.body.issuedDate) : undefined,
      expirationDate: req.body.expirationDate ? new Date(req.body.expirationDate) : undefined,
      verifiedAt: req.body.verifiedAt ? new Date(req.body.verifiedAt) : undefined,
    };

    const certificationId = await llpCertificationService.createCertification(certificationData);

    logger.info('LLP certification created', {
      userId: req.user?.id,
      certificationId,
      serializedPartId: certificationData.serializedPartId,
      certificationType: certificationData.certificationType,
    });

    return res.status(201).json({ id: certificationId });
  })
);

/**
 * @route GET /api/v1/llp/certifications/:serializedPartId
 * @desc Get certification status for a serialized part
 * @access Private (Production Access Required)
 */
router.get(
  '/certifications/:serializedPartId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serializedPartId } = req.params;
    const status = await llpCertificationService.getCertificationStatus(serializedPartId);

    logger.info('LLP certification status retrieved', {
      userId: req.user?.id,
      serializedPartId,
      isCompliant: status.isCompliant,
      missingCount: status.missingCertifications.length,
    });

    return res.status(200).json(status);
  })
);

/**
 * @route POST /api/v1/llp/certifications/verify
 * @desc Verify a certification document
 * @access Private (Production Access Required)
 */
router.post(
  '/certifications/verify',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = certificationVerifySchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid verification data', validationResult.error.errors);
    }

    const verificationData = validationResult.data;
    await llpCertificationService.verifyCertification(verificationData);

    logger.info('LLP certification verified', {
      userId: req.user?.id,
      certificationId: verificationData.certificationId,
      verifiedBy: verificationData.verifiedBy,
    });

    return res.status(200).json({ message: 'Certification verified successfully' });
  })
);

/**
 * @route GET /api/v1/llp/certifications/expiring
 * @desc Get expiring certifications
 * @access Private (Production Access Required)
 */
router.get(
  '/certifications/expiring',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const daysAhead = parseInt(req.query.daysAhead as string, 10) || 30;
    const expiringCertifications = await llpCertificationService.getExpiringCertifications(daysAhead);

    logger.info('LLP expiring certifications retrieved', {
      userId: req.user?.id,
      daysAhead,
      count: expiringCertifications.length,
    });

    return res.status(200).json(expiringCertifications);
  })
);

/**
 * @route GET /api/v1/llp/documents/:documentId
 * @desc Download certification document
 * @access Private (Production Access Required)
 */
router.get(
  '/documents/:documentId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const documentUrl = `/api/llp/documents/${documentId}`;

    try {
      const documentBuffer = await llpCertificationService.retrieveDocument(documentUrl);

      // Set appropriate headers for file download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${documentId}"`);

      logger.info('LLP document downloaded', {
        userId: req.user?.id,
        documentId,
        size: documentBuffer.length,
      });

      return res.send(documentBuffer);
    } catch (error) {
      logger.error('LLP document download failed', {
        userId: req.user?.id,
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return res.status(404).json({ error: 'Document not found' });
    }
  })
);

// ============================================================================
// COMPLIANCE AND REPORTING ROUTES
// ============================================================================

/**
 * @route GET /api/v1/llp/compliance/:serializedPartId
 * @desc Get comprehensive compliance status
 * @access Private (Production Access Required)
 */
router.get(
  '/compliance/:serializedPartId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serializedPartId } = req.params;
    const compliance = await llpCertificationService.getComplianceStatus(serializedPartId);

    logger.info('LLP compliance status retrieved', {
      userId: req.user?.id,
      serializedPartId,
      overallCompliant: compliance.overallCompliant,
      issueCount: compliance.complianceIssues.length,
    });

    return res.status(200).json(compliance);
  })
);

/**
 * @route GET /api/v1/llp/fleet-report
 * @desc Get fleet-wide LLP status report
 * @access Private (Production Access Required)
 */
router.get(
  '/fleet-report',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const report = await llpService.generateFleetReport();

    logger.info('LLP fleet report generated', {
      userId: req.user?.id,
      totalLLPs: report.totalLLPs,
      retirementsNext30Days: report.retirementsNext30Days,
      complianceIssues: report.complianceIssues,
    });

    return res.status(200).json(report);
  })
);

/**
 * @route GET /api/v1/llp/analytics/dashboard
 * @desc Get LLP analytics dashboard data
 * @access Private (Production Access Required)
 */
router.get(
  '/analytics/dashboard',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const dashboard = await llpService.generateAnalyticsDashboard();

    logger.info('LLP analytics dashboard generated', {
      userId: req.user?.id,
      totalLLPs: dashboard.fleetSummary.totalLLPs,
      averageLifeUsed: dashboard.fleetSummary.averageLifeUsed,
      criticalAlerts: dashboard.fleetSummary.criticalAlerts,
    });

    return res.status(200).json(dashboard);
  })
);

// ============================================================================
// ENHANCED REPORTING AND EXPORT ROUTES
// ============================================================================

/**
 * @route POST /api/v1/llp/reports/fleet-status
 * @desc Generate comprehensive fleet status report with export
 * @access Private (Production Access Required)
 */
router.post(
  '/reports/fleet-status',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = reportGenerationSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid report generation parameters', validationResult.error.errors);
    }

    const { format, filters } = validationResult.data;
    const userId = req.user?.id || 'system';

    const result = await llpReportingService.generateFleetStatusReport(filters, format);

    logger.info('LLP fleet status report generated', {
      userId,
      reportId: result.reportId,
      format,
      filters,
      fileSize: result.fileSize,
      recordCount: result.metadata.recordCount,
    });

    return res.status(201).json(result);
  })
);

/**
 * @route POST /api/v1/llp/reports/retirement-forecast
 * @desc Generate retirement forecast report with export
 * @access Private (Production Access Required)
 */
router.post(
  '/reports/retirement-forecast',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = retirementForecastSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid retirement forecast parameters', validationResult.error.errors);
    }

    const { daysAhead, format } = validationResult.data;
    const userId = req.user?.id || 'system';

    const result = await llpReportingService.generateRetirementForecastReport(daysAhead, format);

    logger.info('LLP retirement forecast report generated', {
      userId,
      reportId: result.reportId,
      daysAhead,
      format,
      fileSize: result.fileSize,
      recordCount: result.metadata.recordCount,
    });

    return res.status(201).json(result);
  })
);

/**
 * @route POST /api/v1/llp/reports/compliance
 * @desc Generate comprehensive compliance report with export
 * @access Private (Production Access Required)
 */
router.post(
  '/reports/compliance',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = complianceReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid compliance report parameters', validationResult.error.errors);
    }

    const { regulatoryStandard, format } = validationResult.data;
    const userId = req.user?.id || 'system';

    const result = await llpReportingService.generateComplianceReport(regulatoryStandard, format);

    logger.info('LLP compliance report generated', {
      userId,
      reportId: result.reportId,
      regulatoryStandard,
      format,
      fileSize: result.fileSize,
      recordCount: result.metadata.recordCount,
    });

    return res.status(201).json(result);
  })
);

/**
 * @route GET /api/v1/llp/reports/download/:reportId
 * @desc Download generated report file
 * @access Private (Production Access Required)
 */
router.get(
  '/reports/download/:reportId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const userId = req.user?.id || 'system';

    try {
      const reportBuffer = await llpReportingService.getReportFile(reportId);

      // Set appropriate headers for file download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="llp-report-${reportId}"`);
      res.setHeader('Content-Length', reportBuffer.length.toString());

      logger.info('LLP report downloaded', {
        userId,
        reportId,
        fileSize: reportBuffer.length,
      });

      return res.send(reportBuffer);
    } catch (error) {
      logger.error('LLP report download failed', {
        userId,
        reportId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Report file not found or expired' });
      }

      throw error;
    }
  })
);

/**
 * @route GET /api/v1/llp/reports/formats
 * @desc Get available export formats and report types
 * @access Private (Production Access Required)
 */
router.get(
  '/reports/formats',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const formats = {
      exportFormats: Object.values(ExportFormat),
      reportTypes: Object.values(ReportType),
      supportedCombinations: [
        { reportType: ReportType.FLEET_STATUS, formats: [ExportFormat.PDF, ExportFormat.EXCEL, ExportFormat.CSV, ExportFormat.JSON] },
        { reportType: ReportType.RETIREMENT_FORECAST, formats: [ExportFormat.PDF, ExportFormat.EXCEL, ExportFormat.JSON] },
        { reportType: ReportType.REGULATORY_COMPLIANCE, formats: [ExportFormat.PDF, ExportFormat.EXCEL, ExportFormat.JSON] },
      ],
      maxRetentionDays: 7,
    };

    logger.info('LLP report formats retrieved', {
      userId: req.user?.id,
    });

    return res.status(200).json(formats);
  })
);

// ============================================================================
// RETIREMENT WORKFLOW ROUTES
// ============================================================================

/**
 * @route POST /api/v1/llp/retirement
 * @desc Retire an LLP and record disposition
 * @access Private (Production Access Required)
 */
router.post(
  '/retirement',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = llpRetirementSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid retirement data', validationResult.error.errors);
    }

    const retirementData = {
      ...validationResult.data,
      retirementDate: new Date(validationResult.data.retirementDate),
    };

    const retirementId = await llpService.retireLLP(retirementData);

    logger.info('LLP retired', {
      userId: req.user?.id,
      retirementId,
      serializedPartId: retirementData.serializedPartId,
      retirementReason: retirementData.retirementReason,
      disposition: retirementData.disposition,
    });

    return res.status(201).json({ id: retirementId });
  })
);

/**
 * @route GET /api/v1/llp/retirement-forecast
 * @desc Get retirement forecast for planning
 * @access Private (Production Access Required)
 */
router.get(
  '/retirement-forecast',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const daysAhead = parseInt(req.query.daysAhead as string, 10) || 90;
    const forecast = await llpService.getRetirementForecast(daysAhead);

    logger.info('LLP retirement forecast generated', {
      userId: req.user?.id,
      daysAhead,
      forecastCount: forecast.length,
    });

    return res.status(200).json(forecast);
  })
);

// ============================================================================
// BATCH OPERATIONS ROUTES
// ============================================================================

/**
 * @route POST /api/v1/llp/batch/life-events
 * @desc Batch process multiple life events
 * @access Private (Production Access Required)
 */
router.post(
  '/batch/life-events',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      throw new ValidationError('Events array is required and must not be empty');
    }

    const results = await llpService.batchProcessLifeEvents(events);

    logger.info('LLP batch life events processed', {
      userId: req.user?.id,
      totalEvents: events.length,
      successful: results.successful.length,
      failed: results.failed.length,
    });

    return res.status(200).json(results);
  })
);

/**
 * @route POST /api/v1/llp/batch/certifications
 * @desc Batch process multiple certifications
 * @access Private (Production Access Required)
 */
router.post(
  '/batch/certifications',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { certifications } = req.body;

    if (!Array.isArray(certifications) || certifications.length === 0) {
      throw new ValidationError('Certifications array is required and must not be empty');
    }

    const results = await llpCertificationService.batchProcessCertifications(certifications);

    logger.info('LLP batch certifications processed', {
      userId: req.user?.id,
      totalCertifications: certifications.length,
      successful: results.successful.length,
      failed: results.failed.length,
    });

    return res.status(200).json(results);
  })
);

// ============================================================================
// HEALTH CHECK AND SYSTEM STATUS ROUTES
// ============================================================================

/**
 * @route GET /api/v1/llp/health
 * @desc LLP system health check
 * @access Private (Production Access Required)
 */
router.get(
  '/health',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        llpService: 'operational',
        alertService: 'operational',
        certificationService: 'operational',
        database: 'operational',
      },
      version: '1.0.0',
    };

    return res.status(200).json(health);
  })
);

export default router;