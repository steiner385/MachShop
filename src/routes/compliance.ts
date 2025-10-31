import express, { Router } from 'express';
import { validateRequest } from '../middleware/validation';
import { requireAuth, requireRole } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';
import ComplianceService from '../services/ComplianceService';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * QMS Compliance Management Routes (Issue #102)
 * Document Control, Training & Competency Management
 */

// ============================================================================
// DOCUMENT CONTROL (ISO 9001 Clause 7.5)
// ============================================================================

/**
 * GET /api/v1/compliance/documents
 * Get all controlled documents with optional filtering
 */
router.get(
  '/documents',
  requireAuth,
  errorHandler(async (req, res) => {
    const { documentType, status, isControlled } = req.query;

    const documents = await ComplianceService.getDocuments({
      ...(documentType && { documentType: documentType as any }),
      ...(status && { status: status as any }),
      ...(isControlled && { isControlled: isControlled === 'true' }),
    });

    res.json({
      success: true,
      data: documents,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/documents
 * Create a new controlled document
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/documents',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        documentNumber: { type: 'string', required: true },
        title: { type: 'string', required: true },
        description: { type: 'string', required: false },
        documentType: { type: 'string', required: true },
        category: { type: 'string', required: false },
        fileUrl: { type: 'string', required: true },
        fileName: { type: 'string', required: true },
        reviewFrequency: { type: 'number', required: false },
        isControlled: { type: 'boolean', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { documentNumber, title, description, documentType, category, fileUrl, fileName, reviewFrequency, isControlled } = req.body;
    const userId = req.user?.id || 'system';

    const document = await ComplianceService.createDocument({
      documentNumber,
      title,
      description,
      documentType,
      category,
      fileUrl,
      fileName,
      reviewFrequency,
      isControlled,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      data: document,
      message: `Document ${documentNumber} created successfully`,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/documents/:id
 * Get a specific document with approval workflow
 */
router.get(
  '/documents/:id',
  requireAuth,
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const document = await ComplianceService.getDocument(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Document ${id} not found` },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: document,
      timestamp: new Date(),
    });
  })
);

/**
 * PUT /api/v1/compliance/documents/:id
 * Update a document
 * Required roles: System Administrator, Quality Manager
 */
router.put(
  '/documents/:id',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        title: { type: 'string', required: false },
        description: { type: 'string', required: false },
        status: { type: 'string', required: false },
        reviewFrequency: { type: 'number', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, status, reviewFrequency } = req.body;
    const userId = req.user?.id || 'system';

    const updated = await ComplianceService.updateDocument(id, {
      title,
      description,
      status,
      reviewFrequency,
      updatedBy: userId,
    });

    res.json({
      success: true,
      data: updated,
      message: 'Document updated successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/documents/:id/request-approval
 * Request document approval
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/documents/:id/request-approval',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        approverRole: { type: 'string', required: true },
        approverId: { type: 'string', required: true },
        sequence: { type: 'number', required: true },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { approverRole, approverId, sequence } = req.body;

    const approval = await ComplianceService.requestApproval(id, approverRole, approverId, sequence);

    res.status(201).json({
      success: true,
      data: approval,
      message: 'Approval requested successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/documents/approvals/:approvalId/approve
 * Approve a document
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/documents/approvals/:approvalId/approve',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        comments: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { approvalId } = req.params;
    const { comments } = req.body;
    const userId = req.user?.id || 'system';

    const approval = await ComplianceService.approveDocument(approvalId, userId, comments);

    res.json({
      success: true,
      data: approval,
      message: 'Document approved successfully',
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// TRAINING COURSES & COMPETENCY (ISO 9001 Clause 7.2)
// ============================================================================

/**
 * GET /api/v1/compliance/training-courses
 * Get all training courses
 */
router.get(
  '/training-courses',
  requireAuth,
  errorHandler(async (req, res) => {
    const { isActive } = req.query;

    const courses = await ComplianceService.getCourses(isActive === 'true');

    res.json({
      success: true,
      data: courses,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/training-courses
 * Create a new training course
 * Required roles: System Administrator, Training Manager
 */
router.post(
  '/training-courses',
  requireAuth,
  requireRole(['System Administrator', 'Training Manager', 'Quality Manager']),
  validateRequest(
    {
      body: {
        courseNumber: { type: 'string', required: true },
        courseName: { type: 'string', required: true },
        description: { type: 'string', required: false },
        courseType: { type: 'string', required: true },
        duration: { type: 'number', required: false },
        objectives: { type: 'string', required: false },
        materials: { type: 'string', required: false },
        requiredForRoles: { type: 'array', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { courseNumber, courseName, description, courseType, duration, objectives, materials, requiredForRoles } = req.body;
    const userId = req.user?.id || 'system';

    const course = await ComplianceService.createCourse({
      courseNumber,
      courseName,
      description,
      courseType,
      duration,
      objectives,
      materials,
      requiredForRoles,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      data: course,
      message: `Course ${courseNumber} created successfully`,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/training-courses/:id
 * Get a specific training course with all details
 */
router.get(
  '/training-courses/:id',
  requireAuth,
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const course = await ComplianceService.getCourse(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Course ${id} not found` },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: course,
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// TRAINING RECORDS & CERTIFICATION
// ============================================================================

/**
 * POST /api/v1/compliance/training-records
 * Record a training completion
 * Required roles: System Administrator, Training Manager
 */
router.post(
  '/training-records',
  requireAuth,
  requireRole(['System Administrator', 'Training Manager', 'Quality Manager']),
  validateRequest(
    {
      body: {
        trainingCourseId: { type: 'string', required: true },
        traineeId: { type: 'string', required: true },
        trainingDate: { type: 'string', required: true },
        instructorId: { type: 'string', required: false },
        testScore: { type: 'number', required: false },
        passed: { type: 'boolean', required: false },
        certificateUrl: { type: 'string', required: false },
        notes: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { trainingCourseId, traineeId, trainingDate, instructorId, testScore, passed, certificateUrl, notes } = req.body;

    const record = await ComplianceService.recordTraining({
      trainingCourseId,
      traineeId,
      trainingDate: new Date(trainingDate),
      instructorId,
      testScore,
      passed,
      certificateUrl,
      notes,
    });

    res.status(201).json({
      success: true,
      data: record,
      message: 'Training record created successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/users/:userId/training-records
 * Get training records for a user
 */
router.get(
  '/users/:userId/training-records',
  requireAuth,
  errorHandler(async (req, res) => {
    const { userId } = req.params;

    const records = await ComplianceService.getUserTrainingRecords(userId);

    res.json({
      success: true,
      data: records,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/expiring-certifications
 * Get certifications expiring within 30 days
 */
router.get(
  '/expiring-certifications',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  errorHandler(async (req, res) => {
    const { daysUntilExpiry = '30' } = req.query;

    const records = await ComplianceService.getExpiringCertifications(parseInt(daysUntilExpiry as string));

    res.json({
      success: true,
      data: records,
      count: records.length,
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// DOCUMENT REVIEW & COMPLIANCE
// ============================================================================

/**
 * GET /api/v1/compliance/documents-due-for-review
 * Get documents that are due for review
 */
router.get(
  '/documents-due-for-review',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  errorHandler(async (req, res) => {
    const documents = await ComplianceService.getDocumentsDueForReview();

    res.json({
      success: true,
      data: documents,
      count: documents.length,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/statistics
 * Get QMS compliance statistics dashboard
 */
router.get(
  '/statistics',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  errorHandler(async (req, res) => {
    const stats = await ComplianceService.getComplianceStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });
  })
);

export default router;
