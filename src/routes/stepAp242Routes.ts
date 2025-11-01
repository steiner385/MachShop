/**
 * STEP AP242 Integration API Routes
 * Issue #220 Phase 2: REST endpoints for CAD/PMI integration
 *
 * Provides API endpoints for:
 * - STEP file import and validation
 * - PMI extraction and mapping
 * - Digital thread traceability
 * - PLM system integration
 * - 3D model view management
 */

import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import StepAp242Service from '../services/StepAp242Service';
import { logger } from '../logging/logger';
import { StepAP242Error, StepFileValidationError } from '../types/step-ap242';
import path from 'path';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();
const stepService = new StepAp242Service(prisma);

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, process.env.UPLOAD_DIR || './uploads/step-files');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'step-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedFormats = ['.step', '.stp', '.jt', '.pdf', '.3dxml'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file format: ${ext}`));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

/**
 * POST /api/v1/step-ap242/import
 * Import STEP file and extract PMI
 *
 * Request body:
 * {
 *   file: File,
 *   partId?: string,
 *   operationIds?: string[],
 *   extractPMI?: boolean,
 *   cadSystemSource?: 'NX' | 'CATIA' | 'Creo' | 'SolidWorks',
 *   cadModelRevision?: string
 * }
 */
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'NO_FILE',
        message: 'No STEP file provided'
      });
    }

    const { partId, operationIds, extractPMI, cadSystemSource, cadModelRevision } = req.body;
    const fileUrl = `/uploads/step-files/${req.file.filename}`;
    const stepUuid = crypto.randomUUID();

    logger.info(`[STEP Import] Received file: ${req.file.originalname}`, {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      partId
    });

    const importRequest = {
      fileUrl,
      fileSize: req.file.size,
      stepUuid,
      cadModelUuid: crypto.randomUUID(),
      cadSystemSource: cadSystemSource || 'UNKNOWN',
      cadModelRevision: cadModelRevision || 'A',
      partId: partId || null,
      operationIds: operationIds ? JSON.parse(operationIds) : [],
      extractPMI: extractPMI === 'true' || extractPMI === true,
      importedBy: req.user?.id || 'anonymous'
    };

    const result = await stepService.importStepFile(importRequest);

    res.status(201).json({
      success: true,
      importId: result.importId,
      stepUuid: result.stepUuid,
      message: result.message,
      pmiExtracted: result.pmiExtracted,
      data: {
        fileUrl,
        fileSize: req.file.size,
        fileName: req.file.originalname
      }
    });
  } catch (error) {
    logger.error('STEP import failed:', error);
    const statusCode = error instanceof StepFileValidationError ? 400 : 500;
    res.status(statusCode).json({
      error: error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/step-ap242/imports/:importId
 * Get import status and details
 */
router.get('/imports/:importId', async (req: Request, res: Response) => {
  try {
    const { importId } = req.params;

    const importRecord = await prisma.sTEPFileImport.findUnique({
      where: { id: importId }
    });

    if (!importRecord) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Import ${importId} not found`
      });
    }

    res.json({
      success: true,
      import: {
        id: importRecord.id,
        fileName: importRecord.fileName,
        fileUrl: importRecord.fileUrl,
        status: importRecord.status,
        stepUuid: importRecord.stepUuid,
        cadSystemSource: importRecord.cadSystemSource,
        pmiExtracted: importRecord.pmiExtracted,
        importedAt: importRecord.importedAt,
        completedAt: importRecord.completedAt,
        errors: importRecord.extractionErrors,
        warnings: importRecord.extractionWarnings
      }
    });
  } catch (error) {
    logger.error('Failed to get import status:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve import status'
    });
  }
});

/**
 * POST /api/v1/step-ap242/extract-pmi
 * Extract PMI from uploaded STEP data
 *
 * Request body:
 * {
 *   stepUuid: string,
 *   cadModelUuid?: string,
 *   features: Array<{id, uuid, name, geometry}>,
 *   tolerances: Array<{type, value, unit, featureId}>,
 *   dimensions: Array<{type, value, unit, featureId}>
 * }
 */
router.post('/extract-pmi', async (req: Request, res: Response) => {
  try {
    const { stepUuid, cadModelUuid, features, tolerances, dimensions, materials, surfaceFinishes } = req.body;

    if (!stepUuid) {
      return res.status(400).json({
        error: 'MISSING_STEP_UUID',
        message: 'stepUuid is required'
      });
    }

    const pmiData = {
      uuid: stepUuid,
      cadModelUuid: cadModelUuid || stepUuid,
      extractionDate: new Date(),
      hasPMI: (features?.length || 0) > 0 || (tolerances?.length || 0) > 0,
      features: features || [],
      annotations: [],
      datums: [],
      tolerances: tolerances || [],
      dimensions: dimensions || [],
      materials: materials || [],
      surfaceFinishes: surfaceFinishes || []
    };

    const extractedPmi = await stepService.extractPMI(pmiData);

    res.json({
      success: true,
      pmiData: extractedPmi,
      summary: {
        featuresCount: extractedPmi.features.length,
        tolerancesCount: extractedPmi.tolerances.length,
        dimensionsCount: extractedPmi.dimensions.length,
        hasPMI: extractedPmi.hasPMI
      }
    });
  } catch (error) {
    logger.error('PMI extraction failed:', error);
    const statusCode = error instanceof Error && error.message.includes('features') ? 400 : 500;
    res.status(statusCode).json({
      error: 'PMI_EXTRACTION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to extract PMI'
    });
  }
});

/**
 * POST /api/v1/step-ap242/link-to-part
 * Link STEP model to manufacturing part
 *
 * Request body:
 * {
 *   stepUuid: string,
 *   partId: string
 * }
 */
router.post('/link-to-part', async (req: Request, res: Response) => {
  try {
    const { stepUuid, partId } = req.body;

    if (!stepUuid || !partId) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: 'stepUuid and partId are required'
      });
    }

    await stepService.linkStepToPart(stepUuid, partId);

    const part = await prisma.part.findUnique({
      where: { id: partId },
      select: {
        id: true,
        partNumber: true,
        partName: true,
        stepAp242Uuid: true,
        cadModelUuid: true,
        hasPMI: true,
        stepAp242LastSync: true
      }
    });

    res.json({
      success: true,
      message: `STEP model ${stepUuid} linked to part ${partId}`,
      part
    });
  } catch (error) {
    logger.error('Failed to link STEP to part:', error);
    res.status(500).json({
      error: 'LINK_FAILED',
      message: error instanceof Error ? error.message : 'Failed to link STEP model'
    });
  }
});

/**
 * POST /api/v1/step-ap242/map-pmi-to-characteristics
 * Map PMI tolerances to quality characteristics
 *
 * Request body:
 * {
 *   stepUuid: string,
 *   partId: string,
 *   tolerances: Array<{type, value, unit, featureId}>
 * }
 */
router.post('/map-pmi-to-characteristics', async (req: Request, res: Response) => {
  try {
    const { partId, features, tolerances, dimensions, materials, surfaceFinishes } = req.body;

    if (!partId) {
      return res.status(400).json({
        error: 'MISSING_PART_ID',
        message: 'partId is required'
      });
    }

    const pmiData = {
      uuid: crypto.randomUUID(),
      cadModelUuid: crypto.randomUUID(),
      extractionDate: new Date(),
      hasPMI: true,
      features: features || [],
      annotations: [],
      datums: [],
      tolerances: tolerances || [],
      dimensions: dimensions || [],
      materials: materials || [],
      surfaceFinishes: surfaceFinishes || []
    };

    const mapping = await stepService.mapPMIToCharacteristics(pmiData, partId);

    res.json({
      success: true,
      message: `Mapped ${Object.keys(mapping).length} PMI features to quality characteristics`,
      mapping,
      characteristicCount: Object.values(mapping).reduce((sum, arr) => sum + arr.length, 0)
    });
  } catch (error) {
    logger.error('PMI mapping failed:', error);
    res.status(500).json({
      error: 'MAPPING_FAILED',
      message: error instanceof Error ? error.message : 'Failed to map PMI to characteristics'
    });
  }
});

/**
 * POST /api/v1/step-ap242/digital-thread
 * Create digital thread trace linking CAD to manufacturing
 *
 * Request body:
 * {
 *   cadModelUuid: string,
 *   pmiFeatureId: string,
 *   partId: string,
 *   operationId?: string
 * }
 */
router.post('/digital-thread', async (req: Request, res: Response) => {
  try {
    const { cadModelUuid, pmiFeatureId, partId, operationId } = req.body;

    if (!cadModelUuid || !pmiFeatureId || !partId) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: 'cadModelUuid, pmiFeatureId, and partId are required'
      });
    }

    const trace = await stepService.createDigitalThreadTrace(cadModelUuid, pmiFeatureId, partId);

    // Associate with operation if provided
    if (operationId) {
      await prisma.digitalThreadTrace.update({
        where: { id: trace.id },
        data: { operationId }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Digital thread trace created',
      trace: {
        id: trace.id,
        cadModelUuid: trace.cadModelUuid,
        pmiFeatureId: trace.pmiFeatureId,
        partId: trace.partId,
        operationId: trace.operationId,
        createdAt: trace.createdAt
      }
    });
  } catch (error) {
    logger.error('Failed to create digital thread:', error);
    res.status(500).json({
      error: 'DIGITAL_THREAD_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create digital thread'
    });
  }
});

/**
 * GET /api/v1/step-ap242/digital-thread/:traceId
 * Get digital thread trace details
 */
router.get('/digital-thread/:traceId', async (req: Request, res: Response) => {
  try {
    const { traceId } = req.params;

    const trace = await prisma.digitalThreadTrace.findUnique({
      where: { id: traceId },
      include: {
        part: {
          select: { id: true, partNumber: true, partName: true }
        },
        operation: {
          select: { id: true, operationCode: true, operationName: true }
        },
        qualityCharacteristic: {
          select: { id: true, characteristic: true, specification: true }
        }
      }
    });

    if (!trace) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Digital thread ${traceId} not found`
      });
    }

    res.json({
      success: true,
      trace: {
        ...trace,
        deviationStatus: trace.withinTolerance ? 'PASS' : trace.withinTolerance === false ? 'FAIL' : 'UNVERIFIED'
      }
    });
  } catch (error) {
    logger.error('Failed to get digital thread:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve digital thread'
    });
  }
});

/**
 * POST /api/v1/step-ap242/model-view-state
 * Create 3D model view state for operation
 *
 * Request body:
 * {
 *   modelUuid: string,
 *   operationId: string,
 *   viewName: string,
 *   cameraPosition: {x, y, z},
 *   cameraTarget: {x, y, z},
 *   cameraUp?: {x, y, z},
 *   fov?: number
 * }
 */
router.post('/model-view-state', async (req: Request, res: Response) => {
  try {
    const { modelUuid, operationId, viewName, cameraPosition, cameraTarget, cameraUp, fov } = req.body;

    if (!modelUuid || !operationId || !viewName || !cameraPosition || !cameraTarget) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: 'modelUuid, operationId, viewName, cameraPosition, and cameraTarget are required'
      });
    }

    const viewState = await stepService.createModelViewState(
      modelUuid,
      operationId,
      viewName,
      cameraPosition,
      cameraTarget
    );

    res.status(201).json({
      success: true,
      message: 'Model view state created',
      viewState: {
        id: viewState.id,
        modelUuid: viewState.modelUuid,
        operationId: viewState.operationId,
        viewName: viewState.viewName,
        cameraPosition: {
          x: viewState.cameraPositionX,
          y: viewState.cameraPositionY,
          z: viewState.cameraPositionZ
        },
        cameraTarget: {
          x: viewState.cameraTargetX,
          y: viewState.cameraTargetY,
          z: viewState.cameraTargetZ
        },
        fov: viewState.fov,
        createdAt: viewState.createdAt
      }
    });
  } catch (error) {
    logger.error('Failed to create model view state:', error);
    res.status(500).json({
      error: 'VIEW_STATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create view state'
    });
  }
});

/**
 * GET /api/v1/step-ap242/model-view-state/:operationId
 * Get model view states for operation
 */
router.get('/model-view-state/:operationId', async (req: Request, res: Response) => {
  try {
    const { operationId } = req.params;

    const viewStates = await prisma.modelViewState.findMany({
      where: { operationId },
      select: {
        id: true,
        modelUuid: true,
        viewName: true,
        description: true,
        cameraPositionX: true,
        cameraPositionY: true,
        cameraPositionZ: true,
        cameraTargetX: true,
        cameraTargetY: true,
        cameraTargetZ: true,
        fov: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      operationId,
      viewStates: viewStates.map(vs => ({
        ...vs,
        cameraPosition: {
          x: vs.cameraPositionX,
          y: vs.cameraPositionY,
          z: vs.cameraPositionZ
        },
        cameraTarget: {
          x: vs.cameraTargetX,
          y: vs.cameraTargetY,
          z: vs.cameraTargetZ
        }
      })),
      count: viewStates.length
    });
  } catch (error) {
    logger.error('Failed to get model view states:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve view states'
    });
  }
});

/**
 * GET /api/v1/step-ap242/part/:partId/metadata
 * Get STEP AP242 metadata for part
 */
router.get('/part/:partId/metadata', async (req: Request, res: Response) => {
  try {
    const { partId } = req.params;

    const metadata = await stepService.getPartMetadata(partId);

    res.json({
      success: true,
      partId,
      metadata
    });
  } catch (error) {
    logger.error('Failed to get part metadata:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'METADATA_FAILED',
      message: error instanceof Error ? error.message : 'Failed to get metadata'
    });
  }
});

/**
 * POST /api/v1/step-ap242/plm/register
 * Register PLM system connection
 *
 * Request body:
 * {
 *   systemName: string,
 *   baseUrl: string,
 *   apiVersion: string,
 *   credentialsEncrypted: string,
 *   autoSync?: boolean
 * }
 */
router.post('/plm/register', async (req: Request, res: Response) => {
  try {
    const { systemName, baseUrl, apiVersion, credentialsEncrypted, autoSync } = req.body;

    if (!systemName || !baseUrl || !apiVersion || !credentialsEncrypted) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: 'systemName, baseUrl, apiVersion, and credentialsEncrypted are required'
      });
    }

    await stepService.registerPLMConnection(
      systemName,
      baseUrl,
      apiVersion,
      credentialsEncrypted,
      autoSync ?? true
    );

    res.status(201).json({
      success: true,
      message: `PLM system ${systemName} registered`,
      system: { systemName, baseUrl, apiVersion, autoSync: autoSync ?? true }
    });
  } catch (error) {
    logger.error('Failed to register PLM system:', error);
    res.status(500).json({
      error: 'PLM_REGISTRATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to register PLM system'
    });
  }
});

/**
 * POST /api/v1/step-ap242/plm/sync
 * Sync STEP data from PLM system
 *
 * Request body:
 * {
 *   systemName: string,
 *   plmItemId: string
 * }
 */
router.post('/plm/sync', async (req: Request, res: Response) => {
  try {
    const { systemName, plmItemId } = req.body;

    if (!systemName || !plmItemId) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: 'systemName and plmItemId are required'
      });
    }

    await stepService.syncFromPLM(systemName, plmItemId);

    res.json({
      success: true,
      message: `Synced PLM item ${plmItemId} from ${systemName}`,
      syncedAt: new Date()
    });
  } catch (error) {
    logger.error('Failed to sync from PLM:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'PLM_SYNC_FAILED',
      message: error instanceof Error ? error.message : 'Failed to sync from PLM'
    });
  }
});

/**
 * POST /api/v1/step-ap242/verify-digital-thread/:traceId
 * Verify digital thread integrity
 *
 * Request body:
 * {
 *   verifiedBy: string
 * }
 */
router.post('/verify-digital-thread/:traceId', async (req: Request, res: Response) => {
  try {
    const { traceId } = req.params;
    const { verifiedBy } = req.body;

    if (!verifiedBy) {
      return res.status(400).json({
        error: 'MISSING_VERIFIED_BY',
        message: 'verifiedBy is required'
      });
    }

    await stepService.verifyDigitalThread(traceId, verifiedBy);

    res.json({
      success: true,
      message: `Digital thread ${traceId} verified`,
      verifiedAt: new Date(),
      verifiedBy
    });
  } catch (error) {
    logger.error('Failed to verify digital thread:', error);
    res.status(500).json({
      error: 'VERIFICATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to verify digital thread'
    });
  }
});

/**
 * GET /api/v1/step-ap242/imports
 * List all STEP imports with optional filtering
 *
 * Query parameters:
 * - status: pending, processing, success, failed
 * - partId: Filter by part ID
 * - limit: Number of results (default: 20)
 * - offset: Pagination offset (default: 0)
 */
router.get('/imports', async (req: Request, res: Response) => {
  try {
    const { status, partId, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (partId) where.partId = partId;

    const [imports, total] = await Promise.all([
      prisma.sTEPFileImport.findMany({
        where,
        orderBy: { importedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.sTEPFileImport.count({ where })
    ]);

    res.json({
      success: true,
      imports,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Failed to list imports:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve imports'
    });
  }
});

export default router;
