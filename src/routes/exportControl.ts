/**
 * Export Control Management API Routes
 * Issue #104: ITAR/Export Control Management
 *
 * Endpoints for:
 * - Part classification (USML, EAR, ECCN)
 * - Person screening (DPL, Entity List, SDN)
 * - Export license management
 * - Compliance auditing and reporting
 */

import { Router, Request, Response } from 'express';
import ExportControlClassificationService from '../services/ExportControlClassificationService';
import PersonScreeningService from '../services/PersonScreeningService';
import ExportLicenseService from '../services/ExportLicenseService';
import ExportComplianceService from '../services/ExportComplianceService';
import { authenticateRequest, authorizeAction } from '../middleware/auth';

const router = Router();
const classificationService = new ExportControlClassificationService();
const screeningService = new PersonScreeningService();
const licenseService = new ExportLicenseService();
const complianceService = new ExportComplianceService();

// ==================== PART CLASSIFICATION ====================

/**
 * Classify a part for export control
 * POST /export-control/classifications
 */
router.post('/classifications', authenticateRequest, authorizeAction('export_control_classify'), async (req: Request, res: Response) => {
  try {
    const {
      partNumber,
      partName,
      isITARControlled,
      isEARControlled,
      usmlCategory,
      eccn,
      technicalDataClass,
      classificationBasis,
      exportLicenseRequired,
      authorizedCountries,
      prohibitedCountries,
    } = req.body;

    if (!partNumber || !partName) {
      return res.status(400).json({error: 'Part number and name required'});
    }

    const result = await classificationService.classifyPart(
      {
        partNumber,
        partName,
        isITARControlled,
        isEARControlled,
        usmlCategory,
        eccn,
        technicalDataClass,
        classificationBasis,
        exportLicenseRequired,
        authorizedCountries,
        prohibitedCountries,
      },
      req.user?.id || 'SYSTEM'
    );

    res.json({success: true, data: result});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Get classification for a part
 * GET /export-control/classifications/:partNumber
 */
router.get('/classifications/:partNumber', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const classification = await classificationService.getClassification(req.params.partNumber);

    res.json({success: true, data: classification});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Get USML categories
 * GET /export-control/usml-categories
 */
router.get('/usml-categories', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const categories = classificationService.getUSMLCategories();

    res.json({success: true, data: categories, count: categories.length});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Validate ECCN
 * POST /export-control/validate-eccn
 */
router.post('/validate-eccn', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const {eccn} = req.body;

    if (!eccn) {
      return res.status(400).json({error: 'ECCN required'});
    }

    const validation = classificationService.validateECCN(eccn);

    res.json({success: true, data: validation});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

// ==================== PERSON SCREENING ====================

/**
 * Screen a person for export control compliance
 * POST /export-control/persons/screen
 */
router.post('/persons/screen', authenticateRequest, authorizeAction('export_control_screen'), async (req: Request, res: Response) => {
  try {
    const {personId, firstName, lastName, email, isUSPerson, countryOfCitizenship, employer, jobTitle} = req.body;

    if (!personId) {
      return res.status(400).json({error: 'Person ID required'});
    }

    const result = await screeningService.screenPerson(personId, {
      firstName: firstName || '',
      lastName: lastName || '',
      email,
      isUSPerson,
      countryOfCitizenship,
      employer,
      jobTitle,
      createdById: req.user?.id || 'SYSTEM',
    });

    res.json({success: true, data: result});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Batch screen multiple persons
 * POST /export-control/persons/batch-screen
 */
router.post('/persons/batch-screen', authenticateRequest, authorizeAction('export_control_screen'), async (req: Request, res: Response) => {
  try {
    const {personIds} = req.body;

    if (!personIds || !Array.isArray(personIds)) {
      return res.status(400).json({error: 'Person IDs array required'});
    }

    const results = await screeningService.batchScreenPersons(personIds);

    res.json({success: true, data: results, count: results.length});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Verify U.S. Person status
 * POST /export-control/persons/verify-us-person
 */
router.post('/persons/verify-us-person', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const {personId, countryOfCitizenship, countryOfResidence} = req.body;

    if (!personId) {
      return res.status(400).json({error: 'Person ID required'});
    }

    const result = await screeningService.verifyUSPersonStatus(personId, countryOfCitizenship, countryOfResidence);

    res.json({success: true, data: result});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Get screening lists info
 * GET /export-control/screening-lists
 */
router.get('/screening-lists', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const dplInfo = screeningService.getDeniedPartiesListInfo();
    const entityInfo = screeningService.getEntityListInfo();
    const sdnInfo = screeningService.getSDNListInfo();

    res.json({
      success: true,
      data: {
        deniedPartiesList: dplInfo,
        entityList: entityInfo,
        sdnList: sdnInfo,
      },
    });
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

// ==================== EXPORT LICENSES ====================

/**
 * Create export license
 * POST /export-control/licenses
 */
router.post('/licenses', authenticateRequest, authorizeAction('export_control_license'), async (req: Request, res: Response) => {
  try {
    const {licenseNumber, licenseType, issuingAgency, coveredParts, authorizedCountries, issueDate, expirationDate, conditions, maxValue} = req.body;

    if (!licenseNumber || !licenseType || !issuingAgency) {
      return res.status(400).json({error: 'License number, type, and issuing agency required'});
    }

    const result = await licenseService.createLicense({
      licenseNumber,
      licenseType,
      issuingAgency,
      coveredParts,
      authorizedCountries,
      issueDate: new Date(issueDate),
      expirationDate: new Date(expirationDate),
      conditions,
      maxValue,
      createdById: req.user?.id || 'SYSTEM',
    });

    res.json({success: true, data: result});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Get export license
 * GET /export-control/licenses/:licenseNumber
 */
router.get('/licenses/:licenseNumber', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const license = await licenseService.getLicense(req.params.licenseNumber);

    res.json({success: true, data: license});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Validate license coverage
 * POST /export-control/licenses/validate-coverage
 */
router.post('/licenses/validate-coverage', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const {licenseNumber, partNumber, destinationCountry} = req.body;

    if (!licenseNumber || !partNumber || !destinationCountry) {
      return res.status(400).json({error: 'License number, part, and destination country required'});
    }

    const result = await licenseService.validateLicenseCoverage(licenseNumber, partNumber, destinationCountry);

    res.json({success: true, data: result});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Record license utilization
 * POST /export-control/licenses/:licenseNumber/utilize
 */
router.post('/licenses/:licenseNumber/utilize', authenticateRequest, authorizeAction('export_control_license'), async (req: Request, res: Response) => {
  try {
    const {shipmentDate, partNumber, quantity, destinationCountry, endUser, value} = req.body;

    if (!partNumber || !quantity || !destinationCountry || !endUser) {
      return res.status(400).json({error: 'Part, quantity, destination, and end-user required'});
    }

    const result = await licenseService.recordUtilization(
      req.params.licenseNumber,
      new Date(shipmentDate),
      partNumber,
      quantity,
      destinationCountry,
      endUser,
      value
    );

    res.json({success: true, data: result});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Get expiring licenses
 * GET /export-control/licenses/expiring
 */
router.get('/licenses/expiring', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const daysThreshold = parseInt(req.query.days as string) || 90;
    const licenses = await licenseService.getExpiringLicenses(daysThreshold);

    res.json({success: true, data: licenses, count: licenses.length});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

// ==================== COMPLIANCE & REPORTING ====================

/**
 * Create compliance audit
 * POST /export-control/audits
 */
router.post('/audits', authenticateRequest, authorizeAction('export_control_audit'), async (req: Request, res: Response) => {
  try {
    const {auditType, auditScope} = req.body;

    if (!auditType || !auditScope) {
      return res.status(400).json({error: 'Audit type and scope required'});
    }

    const result = await complianceService.createAudit(auditType, auditScope, req.user?.id || 'SYSTEM');

    res.json({success: true, data: result});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Get compliance metrics dashboard
 * GET /export-control/compliance/metrics
 */
router.get('/compliance/metrics', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const metrics = await complianceService.getComplianceMetrics();

    res.json({success: true, data: metrics});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

/**
 * Generate compliance report
 * POST /export-control/compliance/report
 */
router.post('/compliance/report', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const {startDate, endDate} = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({error: 'Start and end dates required'});
    }

    const report = await complianceService.generateComplianceReport(new Date(startDate), new Date(endDate));

    res.json({success: true, data: report});
  } catch (error: any) {
    res.status(400).json({error: error.message});
  }
});

export default router;
