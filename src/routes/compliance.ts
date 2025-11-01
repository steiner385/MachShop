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

// ============================================================================
// PHASE 2: AUDIT MANAGEMENT (ISO 9001 Clause 9.2)
// ============================================================================

/**
 * POST /api/v1/compliance/internal-audits
 * Create a new internal audit
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/internal-audits',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        auditNumber: { type: 'string', required: true },
        auditTitle: { type: 'string', required: true },
        auditType: { type: 'string', required: true },
        auditScope: { type: 'string', required: false },
        plannedDate: { type: 'string', required: true },
        leadAuditorId: { type: 'string', required: true },
        auditeeId: { type: 'string', required: true },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { auditNumber, auditTitle, auditType, auditScope, plannedDate, leadAuditorId, auditeeId } = req.body;

    const audit = await ComplianceService.createAudit({
      auditNumber,
      auditTitle,
      auditType,
      auditScope,
      plannedDate: new Date(plannedDate),
      leadAuditorId,
      auditeeId,
    });

    res.status(201).json({
      success: true,
      data: audit,
      message: `Audit ${auditNumber} created successfully`,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/internal-audits
 * Get all internal audits with optional filtering
 */
router.get(
  '/internal-audits',
  requireAuth,
  errorHandler(async (req, res) => {
    const { status, auditType } = req.query;

    const audits = await ComplianceService.getAudits({
      ...(status && { status: status as string }),
      ...(auditType && { auditType: auditType as string }),
    });

    res.json({
      success: true,
      data: audits,
      count: audits.length,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/internal-audits/:id
 * Get a specific internal audit
 */
router.get(
  '/internal-audits/:id',
  requireAuth,
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const audit = await ComplianceService.getAudit(id);
    if (!audit) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Audit ${id} not found` },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: audit,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/internal-audits/:id/close
 * Close an internal audit
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/internal-audits/:id/close',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        reportUrl: { type: 'string', required: false },
        summary: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { reportUrl, summary } = req.body;
    const userId = req.user?.id || 'system';

    const audit = await ComplianceService.closeAudit(id, userId, reportUrl, summary);

    res.json({
      success: true,
      data: audit,
      message: 'Audit closed successfully',
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// AUDIT FINDINGS (ISO 9001 Clause 9.2.2)
// ============================================================================

/**
 * POST /api/v1/compliance/audit-findings
 * Create an audit finding
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/audit-findings',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        auditId: { type: 'string', required: true },
        findingNumber: { type: 'string', required: true },
        findingType: { type: 'string', required: true },
        clause: { type: 'string', required: false },
        description: { type: 'string', required: true },
        objectiveEvidence: { type: 'string', required: false },
        severity: { type: 'string', required: true },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { auditId, findingNumber, findingType, clause, description, objectiveEvidence, severity } = req.body;

    const finding = await ComplianceService.createFinding({
      auditId,
      findingNumber,
      findingType,
      clause,
      description,
      objectiveEvidence,
      severity,
    });

    res.status(201).json({
      success: true,
      data: finding,
      message: `Finding ${findingNumber} created successfully`,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/audits/:auditId/findings
 * Get findings for an audit
 */
router.get(
  '/audits/:auditId/findings',
  requireAuth,
  errorHandler(async (req, res) => {
    const { auditId } = req.params;

    const findings = await ComplianceService.getAuditFindings(auditId);

    res.json({
      success: true,
      data: findings,
      count: findings.length,
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// CORRECTIVE/PREVENTIVE ACTIONS (CAPA) (ISO 9001 Clause 10)
// ============================================================================

/**
 * POST /api/v1/compliance/corrective-actions
 * Create a corrective action
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/corrective-actions',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        caNumber: { type: 'string', required: true },
        title: { type: 'string', required: true },
        description: { type: 'string', required: false },
        source: { type: 'string', required: true },
        sourceReference: { type: 'string', required: false },
        rootCauseMethod: { type: 'string', required: true },
        rootCause: { type: 'string', required: false },
        correctiveAction: { type: 'string', required: false },
        preventiveAction: { type: 'string', required: false },
        assignedToId: { type: 'string', required: true },
        targetDate: { type: 'string', required: true },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const {
      caNumber,
      title,
      description,
      source,
      sourceReference,
      rootCauseMethod,
      rootCause,
      correctiveAction,
      preventiveAction,
      assignedToId,
      targetDate,
    } = req.body;

    const action = await ComplianceService.createCorrectiveAction({
      caNumber,
      title,
      description,
      source,
      sourceReference,
      rootCauseMethod,
      rootCause,
      correctiveAction,
      preventiveAction,
      assignedToId,
      targetDate: new Date(targetDate),
    });

    res.status(201).json({
      success: true,
      data: action,
      message: `Corrective action ${caNumber} created successfully`,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/corrective-actions/:id
 * Get a corrective action
 */
router.get(
  '/corrective-actions/:id',
  requireAuth,
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const action = await ComplianceService.getCorrectiveAction(id);
    if (!action) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Corrective action ${id} not found` },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: action,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/corrective-actions/:id/implement
 * Implement a corrective action
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/corrective-actions/:id/implement',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        correctiveAction: { type: 'string', required: false },
        preventiveAction: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { correctiveAction, preventiveAction } = req.body;

    const action = await ComplianceService.implementAction(id, {
      correctiveAction,
      preventiveAction,
    });

    res.json({
      success: true,
      data: action,
      message: 'Corrective action implemented successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/corrective-actions/:id/verify
 * Verify effectiveness of corrective action
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/corrective-actions/:id/verify',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        isEffective: { type: 'boolean', required: true },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { isEffective } = req.body;
    const userId = req.user?.id || 'system';

    const action = await ComplianceService.verifyAction(id, userId, isEffective);

    res.json({
      success: true,
      data: action,
      message: `Corrective action verification: ${isEffective ? 'effective' : 'ineffective'}`,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/corrective-actions/overdue
 * Get overdue corrective actions
 */
router.get(
  '/corrective-actions/overdue',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  errorHandler(async (req, res) => {
    const actions = await ComplianceService.getActionsOverdue();

    res.json({
      success: true,
      data: actions,
      count: actions.length,
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// MANAGEMENT REVIEW (ISO 9001 Clause 9.3)
// ============================================================================

/**
 * POST /api/v1/compliance/management-reviews
 * Create a management review
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/management-reviews',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        reviewNumber: { type: 'string', required: true },
        reviewDate: { type: 'string', required: true },
        chairpersonId: { type: 'string', required: true },
        inputsDiscussed: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { reviewNumber, reviewDate, chairpersonId, inputsDiscussed } = req.body;

    const review = await ComplianceService.createManagementReview({
      reviewNumber,
      reviewDate: new Date(reviewDate),
      chairpersonId,
      inputsDiscussed,
    });

    res.status(201).json({
      success: true,
      data: review,
      message: `Management review ${reviewNumber} created successfully`,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/management-reviews/:id
 * Get a management review
 */
router.get(
  '/management-reviews/:id',
  requireAuth,
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const review = await ComplianceService.getManagementReview(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Management review ${id} not found` },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: review,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/management-reviews/:id/complete
 * Record management review completion
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/management-reviews/:id/complete',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        decisions: { type: 'string', required: false },
        resourceNeeds: { type: 'string', required: false },
        minutesUrl: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { decisions, resourceNeeds, minutesUrl } = req.body;

    const review = await ComplianceService.completeManagementReview(id, {
      decisions,
      resourceNeeds,
      minutesUrl,
    });

    res.json({
      success: true,
      data: review,
      message: 'Management review completed successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/management-reviews/:id/actions
 * Add action item to management review
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/management-reviews/:id/actions',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        actionDescription: { type: 'string', required: true },
        assignedToId: { type: 'string', required: true },
        dueDate: { type: 'string', required: true },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { actionDescription, assignedToId, dueDate } = req.body;

    const action = await ComplianceService.addReviewAction({
      reviewId: id,
      actionDescription,
      assignedToId,
      dueDate: new Date(dueDate),
    });

    res.status(201).json({
      success: true,
      data: action,
      message: 'Management review action added successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/review-actions/:id/close
 * Close a review action
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/review-actions/:id/close',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const action = await ComplianceService.closeReviewAction(id);

    res.json({
      success: true,
      data: action,
      message: 'Review action closed successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/review-actions/open
 * Get open management review actions
 */
router.get(
  '/review-actions/open',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  errorHandler(async (req, res) => {
    const actions = await ComplianceService.getOpenReviewActions();

    res.json({
      success: true,
      data: actions,
      count: actions.length,
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// CHANGE MANAGEMENT (AS9100D Clause 8.5.6)
// ============================================================================

/**
 * POST /api/v1/compliance/change-requests
 * Create a change request
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/change-requests',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        changeNumber: { type: 'string', required: true },
        title: { type: 'string', required: true },
        description: { type: 'string', required: false },
        changeType: { type: 'string', required: true },
        affectedParts: { type: 'array', required: false },
        reason: { type: 'string', required: false },
        benefits: { type: 'string', required: false },
        risks: { type: 'string', required: false },
        impactAssessment: { type: 'string', required: false },
        customerNotificationRequired: { type: 'boolean', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const {
      changeNumber,
      title,
      description,
      changeType,
      affectedParts,
      reason,
      benefits,
      risks,
      impactAssessment,
      customerNotificationRequired,
    } = req.body;
    const userId = req.user?.id || 'system';

    const change = await ComplianceService.createChangeRequest({
      changeNumber,
      title,
      description,
      changeType,
      affectedParts,
      reason,
      benefits,
      risks,
      impactAssessment,
      customerNotificationRequired,
      createdById: userId,
    });

    res.status(201).json({
      success: true,
      data: change,
      message: `Change request ${changeNumber} created successfully`,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/change-requests
 * Get all change requests with optional filtering
 */
router.get(
  '/change-requests',
  requireAuth,
  errorHandler(async (req, res) => {
    const { status, changeType } = req.query;

    const changes = await ComplianceService.getChangeRequests({
      ...(status && { status: status as string }),
      ...(changeType && { changeType: changeType as string }),
    });

    res.json({
      success: true,
      data: changes,
      count: changes.length,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/compliance/change-requests/:id
 * Get a specific change request
 */
router.get(
  '/change-requests/:id',
  requireAuth,
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const change = await ComplianceService.getChangeRequest(id);
    if (!change) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Change request ${id} not found` },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: change,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/change-requests/:id/approve
 * Approve a change request
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/change-requests/:id/approve',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        implementationPlan: { type: 'string', required: false },
        implementationDate: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { implementationPlan, implementationDate } = req.body;
    const userId = req.user?.id || 'system';

    const change = await ComplianceService.approveChangeRequest(
      id,
      userId,
      implementationPlan,
      implementationDate ? new Date(implementationDate) : undefined
    );

    res.json({
      success: true,
      data: change,
      message: 'Change request approved successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/compliance/change-requests/:id/implement
 * Implement a change request
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/change-requests/:id/implement',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const change = await ComplianceService.implementChangeRequest(id);

    res.json({
      success: true,
      data: change,
      message: 'Change request implemented successfully',
      timestamp: new Date(),
    });
  })
);

export default router;
