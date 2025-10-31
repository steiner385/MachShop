/**
 * Covalent Training & Certification Management Surrogate
 * Issue #244: Testing Infrastructure - Training & Certification Management Surrogates
 *
 * Mock Covalent API endpoints for personnel training, skills management, certifications,
 * and compliance tracking to enable integration testing without access to live system.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '@/services/database.service';
import { initializeTestData } from '@/utils/test-data';
import { logger } from '@/utils/logger';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import {
  PersonnelRecord,
  TrainingProgram,
  Certification,
  CertificationStatus,
  TrainingStatus,
  QualificationCheckRequest,
  QualificationCheckResponse,
  EmploymentStatus,
  SkillLevel,
  AlertPayload,
  WebhookEvent
} from '@/models/types';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Covalent Training & Certification Management Surrogate API',
      version: '1.0.0',
      description: 'Mock Covalent API for personnel training, certifications, and skills management'
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ]
  },
  apis: ['./src/index.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ============================================================================
// PERSONNEL ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/personnel:
 *   get:
 *     summary: Get all personnel records
 *     tags: [Personnel]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, TERMINATED, ON_LEAVE]
 *     responses:
 *       200:
 *         description: List of personnel records
 */
app.get('/api/personnel', (req: Request, res: Response) => {
  const { status } = req.query;
  const personnel = databaseService.getAllPersonnel();

  if (status) {
    const filtered = personnel.filter(p => p.employmentStatus === status);
    return res.json(filtered);
  }

  res.json(personnel);
});

/**
 * @swagger
 * /api/personnel/{id}:
 *   get:
 *     summary: Get personnel record by ID
 *     tags: [Personnel]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
app.get('/api/personnel/:id', (req: Request, res: Response) => {
  const personnel = databaseService.getPersonnel(req.params.id);

  if (!personnel) {
    return res.status(404).json({
      error: 'Personnel not found',
      code: 'PERSONNEL_NOT_FOUND'
    });
  }

  res.json(personnel);
});

/**
 * @swagger
 * /api/personnel:
 *   post:
 *     summary: Create new personnel record
 *     tags: [Personnel]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 */
app.post('/api/personnel', (req: Request, res: Response) => {
  const { firstName, lastName, email, jobTitle, department, shift, employmentStatus } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      error: 'Missing required fields: firstName, lastName, email',
      code: 'VALIDATION_ERROR'
    });
  }

  const personnel: PersonnelRecord = {
    id: uuidv4(),
    employeeId: `EMP-${Date.now()}`,
    firstName,
    lastName,
    email,
    jobTitle: jobTitle || '',
    department: department || '',
    shift: shift || '',
    reportingManager: '',
    employmentStatus: employmentStatus || EmploymentStatus.ACTIVE,
    hireDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  databaseService.addPersonnel(personnel);

  res.status(201).json(personnel);
});

// ============================================================================
// QUALIFICATION CHECK ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/qualifications/check:
 *   post:
 *     summary: Check if operator is qualified for operation
 *     tags: [Qualifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personnelId
 *               - operationId
 *             properties:
 *               personnelId:
 *                 type: string
 *               operationId:
 *                 type: string
 */
app.post('/api/qualifications/check', (req: Request, res: Response) => {
  const { personnelId, operationId } = req.body as QualificationCheckRequest;

  if (!personnelId || !operationId) {
    return res.status(400).json({
      error: 'Missing required fields: personnelId, operationId',
      code: 'VALIDATION_ERROR'
    });
  }

  const personnel = databaseService.getPersonnel(personnelId);

  if (!personnel) {
    return res.status(404).json({
      error: 'Personnel not found',
      code: 'PERSONNEL_NOT_FOUND'
    });
  }

  // Check employment status
  if (personnel.employmentStatus !== EmploymentStatus.ACTIVE) {
    const response: QualificationCheckResponse = {
      personnelId,
      operationId,
      qualified: false,
      reason: `Employee is ${personnel.employmentStatus.toLowerCase()}`
    };
    return res.status(200).json(response);
  }

  // Get certifications for personnel
  const certifications = databaseService.getPersonnelCertifications(personnelId);
  const now = new Date();

  const expiredCerts: string[] = [];
  const expiringCerts: any[] = [];

  certifications.forEach(cert => {
    const expDate = new Date(cert.expirationDate);
    if (expDate < now) {
      expiredCerts.push(cert.certificationName);
    } else {
      const daysUntilExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiration <= 30) {
        expiringCerts.push({
          certificationId: cert.id,
          certificationName: cert.certificationName,
          daysUntilExpiration
        });
      }
    }
  });

  const qualified = expiredCerts.length === 0 && certifications.length > 0;

  const response: QualificationCheckResponse = {
    personnelId,
    operationId,
    qualified,
    reason: qualified ? 'Operator qualified for operation' : 'Operator not qualified',
    expiredCertifications: expiredCerts.length > 0 ? expiredCerts : undefined,
    expiringCertifications: expiringCerts.length > 0 ? expiringCerts : undefined,
    certificationDetails: certifications.map(c => ({
      id: c.id,
      name: c.certificationName,
      status: c.status,
      expirationDate: c.expirationDate
    }))
  };

  res.json(response);
});

// ============================================================================
// CERTIFICATION ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/certifications:
 *   get:
 *     summary: Get all certifications
 *     tags: [Certifications]
 */
app.get('/api/certifications', (req: Request, res: Response) => {
  const state = databaseService.getState();
  res.json(state.certifications);
});

/**
 * @swagger
 * /api/certifications/{id}:
 *   get:
 *     summary: Get certification by ID
 *     tags: [Certifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
app.get('/api/certifications/:id', (req: Request, res: Response) => {
  const cert = databaseService.getCertification(req.params.id);

  if (!cert) {
    return res.status(404).json({
      error: 'Certification not found',
      code: 'CERTIFICATION_NOT_FOUND'
    });
  }

  res.json(cert);
});

/**
 * @swagger
 * /api/certifications/personnel/{personnelId}:
 *   get:
 *     summary: Get certifications for a personnel
 *     tags: [Certifications]
 *     parameters:
 *       - in: path
 *         name: personnelId
 *         required: true
 *         schema:
 *           type: string
 */
app.get('/api/certifications/personnel/:personnelId', (req: Request, res: Response) => {
  const certs = databaseService.getPersonnelCertifications(req.params.personnelId);
  res.json(certs);
});

/**
 * @swagger
 * /api/certifications:
 *   post:
 *     summary: Create new certification
 *     tags: [Certifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 */
app.post('/api/certifications', (req: Request, res: Response) => {
  const {
    personnelId,
    certificationTypeId,
    certificationName,
    issuer,
    expirationDate
  } = req.body;

  if (!personnelId || !certificationName || !expirationDate) {
    return res.status(400).json({
      error: 'Missing required fields',
      code: 'VALIDATION_ERROR'
    });
  }

  const cert: Certification = {
    id: uuidv4(),
    personnelId,
    certificationTypeId: certificationTypeId || uuidv4(),
    certificationName,
    certificateNumber: `CERT-${Date.now()}`,
    issuanceDate: new Date().toISOString(),
    expirationDate,
    status: CertificationStatus.CURRENT,
    issuer: issuer || 'Covalent',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  databaseService.addCertification(cert);

  res.status(201).json(cert);
});

// ============================================================================
// ALERTS & NOTIFICATIONS
// ============================================================================

/**
 * @swagger
 * /api/alerts/expiring:
 *   get:
 *     summary: Get certifications expiring in next 30 days
 *     tags: [Alerts]
 */
app.get('/api/alerts/expiring', (req: Request, res: Response) => {
  const state = databaseService.getState();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiring = state.certifications.filter(cert => {
    const expDate = new Date(cert.expirationDate);
    return expDate > now && expDate <= thirtyDaysFromNow && cert.status !== CertificationStatus.EXPIRED;
  });

  res.json(expiring);
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/admin/state:
 *   get:
 *     summary: Get current database state
 *     tags: [Admin]
 */
app.get('/api/admin/state', (req: Request, res: Response) => {
  const state = databaseService.getState();
  res.json({
    ...state,
    stats: {
      totalPersonnel: state.personnel.length,
      totalCertifications: state.certifications.length,
      totalTrainingEnrollments: state.trainingEnrollments.length,
      expiredCertifications: state.certifications.filter(c => c.status === CertificationStatus.EXPIRED).length,
      expiringCertifications: state.certifications.filter(c => c.status === CertificationStatus.EXPIRING_SOON).length
    }
  });
});

/**
 * @swagger
 * /api/admin/reset:
 *   post:
 *     summary: Reset database to initial state
 *     tags: [Admin]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includePersonnel:
 *                 type: boolean
 *               includeTraining:
 *                 type: boolean
 *               includeCertifications:
 *                 type: boolean
 */
app.post('/api/admin/reset', (req: Request, res: Response) => {
  const { includePersonnel, includeTraining, includeCertifications, includeSkills, includeWebhookLogs } = req.body;

  if (Object.keys(req.body).length === 0) {
    // Full reset
    databaseService.resetDatabase();
    initializeTestData();
  } else {
    // Partial reset
    databaseService.partialReset({
      personnel: includePersonnel,
      training: includeTraining,
      certifications: includeCertifications,
      skills: includeSkills,
      webhooks: includeWebhookLogs
    });
  }

  res.json({
    success: true,
    message: 'Database reset successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/admin/initialize:
 *   post:
 *     summary: Initialize with test data
 *     tags: [Admin]
 */
app.post('/api/admin/initialize', (req: Request, res: Response) => {
  databaseService.resetDatabase();
  initializeTestData();

  res.json({
    success: true,
    message: 'Initialized with test data',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    code: 'INTERNAL_ERROR'
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Covalent Surrogate API listening on http://localhost:${PORT}`);
  logger.info(`Swagger docs available at http://localhost:${PORT}/api/docs`);
  initializeTestData();
});

export default app;
