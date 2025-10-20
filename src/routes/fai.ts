import express, { Request, Response, NextFunction } from 'express';
import { faiService } from '../services/FAIService';
import { cmmImportService } from '../services/CMMImportService';
import { fairPDFService } from '../services/FAIRPDFService';
import {
  CreateFAIReportSchema,
  UpdateFAIReportSchema,
  CreateCharacteristicSchema,
  UpdateCharacteristicSchema,
  FAIQueryParams,
} from '../types/fai';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @route   POST /api/v1/fai
 * @desc    Create a new FAI report
 * @access  Private
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Validate request body
    const validatedData = CreateFAIReportSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const faiReport = await faiService.createFAIReport(validatedData, userId);

    res.status(201).json(faiReport);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/fai
 * @desc    List FAI reports with filtering and pagination
 * @access  Private
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const queryParams: FAIQueryParams = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      status: req.query.status as any,
      partId: req.query.partId as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
    };

    const result = await faiService.listFAIReports(queryParams);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/fai/:id
 * @desc    Get FAI report by ID
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const faiReport = await faiService.getFAIReport(id);

    if (!faiReport) {
      res.status(404).json({ error: 'FAI report not found' });
      return;
    }

    res.json(faiReport);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/fai/number/:faiNumber
 * @desc    Get FAI report by FAI number
 * @access  Private
 */
router.get('/number/:faiNumber', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { faiNumber } = req.params;

    const faiReport = await faiService.getFAIReportByNumber(faiNumber);

    if (!faiReport) {
      res.status(404).json({ error: 'FAI report not found' });
      return;
    }

    res.json(faiReport);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/fai/:id
 * @desc    Update FAI report
 * @access  Private
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    // Validate request body
    const validatedData = UpdateFAIReportSchema.parse(req.body);

    const faiReport = await faiService.updateFAIReport(id, validatedData);

    res.json(faiReport);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/fai/:id
 * @desc    Delete FAI report
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    await faiService.deleteFAIReport(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/fai/:id/characteristics
 * @desc    Add characteristic to FAI report
 * @access  Private
 */
router.post('/:id/characteristics', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    // Validate request body
    const validatedData = CreateCharacteristicSchema.parse(req.body);

    const characteristic = await faiService.addCharacteristic(id, validatedData);

    res.status(201).json(characteristic);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/fai/:id/characteristics
 * @desc    Get all characteristics for FAI report
 * @access  Private
 */
router.get('/:id/characteristics', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const characteristics = await faiService.getCharacteristics(id);

    res.json(characteristics);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/fai/:id/characteristics/:charId
 * @desc    Update characteristic
 * @access  Private
 */
router.put('/:id/characteristics/:charId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { charId } = req.params;

    // Validate request body
    const validatedData = UpdateCharacteristicSchema.parse(req.body);

    const characteristic = await faiService.updateCharacteristic(charId, validatedData);

    res.json(characteristic);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/fai/:id/characteristics/:charId
 * @desc    Delete characteristic
 * @access  Private
 */
router.delete('/:id/characteristics/:charId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { charId } = req.params;

    await faiService.deleteCharacteristic(charId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/fai/:id/approve
 * @desc    Approve FAI report
 * @access  Private (requires approval permission)
 */
router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // TODO: Check if user has approval permission

    const faiReport = await faiService.approveFAIReport(id, userId);

    res.json(faiReport);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/fai/:id/form1
 * @desc    Get Form 1 data (Part Number Accountability)
 * @access  Private
 */
router.get('/:id/form1', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const faiReport = await faiService.getFAIReport(id);

    if (!faiReport) {
      res.status(404).json({ error: 'FAI report not found' });
      return;
    }

    res.json({
      faiNumber: faiReport.faiNumber,
      form1Data: faiReport.form1Data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/fai/:id/form2
 * @desc    Get Form 2 data (Product Accountability)
 * @access  Private
 */
router.get('/:id/form2', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const faiReport = await faiService.getFAIReport(id);

    if (!faiReport) {
      res.status(404).json({ error: 'FAI report not found' });
      return;
    }

    res.json({
      faiNumber: faiReport.faiNumber,
      form2Data: faiReport.form2Data,
    });
  } catch (error) {
    next(error);
  }
});

// ===== SPRINT 4: CMM DATA IMPORT ENDPOINTS =====

/**
 * @route   POST /api/v1/fai/:id/import-cmm/preview
 * @desc    Preview CMM data import without committing
 * @access  Private
 */
router.post('/:id/import-cmm/preview', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { xmlContent } = req.body;

    if (!xmlContent || typeof xmlContent !== 'string') {
      res.status(400).json({ error: 'XML content is required' });
      return;
    }

    // Validate XML first
    const validation = await cmmImportService.validateXML(xmlContent);
    if (!validation.isValid) {
      res.status(400).json({
        error: 'Invalid XML file',
        errors: validation.errors,
        warnings: validation.warnings,
      });
      return;
    }

    // Generate preview
    const preview = await cmmImportService.previewImport(id, xmlContent);

    logger.info('CMM import preview generated', {
      userId: (req as any).user?.id,
      faiReportId: id,
      totalDimensions: preview.totalDimensions,
      matchedCharacteristics: preview.matchedCharacteristics,
    });

    res.json(preview);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/fai/:id/import-cmm
 * @desc    Import CMM data into FAI report
 * @access  Private
 */
router.post('/:id/import-cmm', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { xmlContent, autoMatch } = req.body;

    if (!xmlContent || typeof xmlContent !== 'string') {
      res.status(400).json({ error: 'XML content is required' });
      return;
    }

    // Validate XML first
    const validation = await cmmImportService.validateXML(xmlContent);
    if (!validation.isValid) {
      res.status(400).json({
        error: 'Invalid XML file',
        errors: validation.errors,
        warnings: validation.warnings,
      });
      return;
    }

    // Perform import
    const result = await cmmImportService.importCMMData(id, xmlContent, autoMatch !== false);

    logger.info('CMM data imported', {
      userId: (req as any).user?.id,
      faiReportId: id,
      success: result.success,
      importedCount: result.importedCount,
      errorCount: result.errorCount,
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/fai/:id/import-cmm/validate
 * @desc    Validate CMM XML file
 * @access  Private
 */
router.post('/:id/import-cmm/validate', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { xmlContent } = req.body;

    if (!xmlContent || typeof xmlContent !== 'string') {
      res.status(400).json({ error: 'XML content is required' });
      return;
    }

    const validation = await cmmImportService.validateXML(xmlContent);

    logger.info('CMM XML validated', {
      userId: (req as any).user?.id,
      faiReportId: req.params.id,
      isValid: validation.isValid,
      errorCount: validation.errors.length,
    });

    res.json(validation);
  } catch (error) {
    next(error);
  }
});

// ===== SPRINT 4: FAIR PDF GENERATION ENDPOINTS =====

/**
 * @route   POST /api/v1/fai/:id/generate-pdf
 * @desc    Generate FAIR PDF (Forms 1, 2, 3 + signatures)
 * @access  Private
 */
router.post('/:id/generate-pdf', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const options = req.body.options || {};

    const result = await fairPDFService.generateFAIR(id, {
      ...options,
      returnBuffer: false,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    logger.info('FAIR PDF generated', {
      userId: (req as any).user?.id,
      faiReportId: id,
      filePath: result.filePath,
      pageCount: result.pageCount,
      fileSize: result.fileSize,
    });

    res.json({
      success: true,
      filePath: result.filePath,
      documentHash: result.documentHash,
      pageCount: result.pageCount,
      fileSize: result.fileSize,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/fai/:id/download-pdf
 * @desc    Download FAIR PDF
 * @access  Private
 */
router.get('/:id/download-pdf', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    // Generate PDF with buffer
    const result = await fairPDFService.generateFAIR(id, {
      returnBuffer: true,
    });

    if (!result.success || !result.buffer) {
      res.status(400).json({ error: result.error || 'Failed to generate PDF' });
      return;
    }

    // Get FAI report for filename
    const faiReport = await faiService.getFAIReport(id);
    const fileName = `FAIR-${faiReport?.faiNumber || id}.pdf`;

    logger.info('FAIR PDF downloaded', {
      userId: (req as any).user?.id,
      faiReportId: id,
      fileName,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
});

// ===== QIF (Quality Information Framework) ENDPOINTS =====

/**
 * @route   POST /api/v1/fai/:id/qif/plan
 * @desc    Generate QIF MeasurementPlan from FAI report
 * @access  Private
 */
router.post('/:id/qif/plan', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const qifXml = await faiService.generateQIFPlan(id);

    logger.info('QIF MeasurementPlan generated', {
      userId: (req as any).user?.id,
      faiReportId: id,
    });

    res.setHeader('Content-Type', 'application/xml');
    res.send(qifXml);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/fai/:id/qif/results
 * @desc    Generate QIF MeasurementResults from FAI report
 * @access  Private
 */
router.post('/:id/qif/results', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { serialNumber } = req.body;

    const qifXml = await faiService.generateQIFResults(id, serialNumber);

    logger.info('QIF MeasurementResults generated', {
      userId: (req as any).user?.id,
      faiReportId: id,
      serialNumber,
    });

    res.setHeader('Content-Type', 'application/xml');
    res.send(qifXml);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/fai/:id/qif/export
 * @desc    Export complete FAI report as QIF AS9102 document
 * @access  Private
 */
router.get('/:id/qif/export', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { serialNumber } = req.query;

    const qifXml = await faiService.exportFAIAsQIF(id, serialNumber as string | undefined);

    // Get FAI report for filename
    const faiReport = await faiService.getFAIReport(id);
    const fileName = `QIF-AS9102-${faiReport?.faiNumber || id}.xml`;

    logger.info('QIF AS9102 document exported', {
      userId: (req as any).user?.id,
      faiReportId: id,
      fileName,
    });

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(qifXml);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/fai/:id/qif/import
 * @desc    Import QIF MeasurementResults into FAI report
 * @access  Private
 */
router.post('/:id/qif/import', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { qifXml } = req.body;

    if (!qifXml || typeof qifXml !== 'string') {
      res.status(400).json({ error: 'QIF XML content is required' });
      return;
    }

    const faiReport = await faiService.importQIFResults(id, qifXml);

    logger.info('QIF MeasurementResults imported', {
      userId: (req as any).user?.id,
      faiReportId: id,
    });

    res.json(faiReport);
  } catch (error) {
    next(error);
  }
});

export default router;
