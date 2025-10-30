/**
 * LLP Certification Document Management Service
 *
 * Comprehensive service for managing LLP certification documents including:
 * - Document upload, validation, and secure storage
 * - Hash verification and integrity checking
 * - Compliance tracking and expiration management
 * - Document lifecycle management and audit trails
 * - Integration with regulatory requirements (IATA, FAA, EASA)
 *
 * Safety-critical system for aerospace regulatory compliance.
 */

import { EventEmitter } from 'events';
import { PrismaClient, LLPCertificationType, LLPCertification } from '@prisma/client';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import {
  LLPCertificationRequest,
  LLPCertificationStatus,
  LLPCertificationWithRelations,
  LLPComplianceStatus,
  LLPError,
  LLPErrorType,
  LLPValidationResult,
  CreateLLPCertification,
  UpdateLLPCertification
} from '../types/llp.js';

// ============================================================================
// CERTIFICATION MANAGEMENT TYPES
// ============================================================================

/**
 * Document upload configuration
 */
export interface DocumentUploadConfig {
  maxFileSize: number;           // Maximum file size in bytes
  allowedMimeTypes: string[];    // Allowed MIME types
  allowedExtensions: string[];   // Allowed file extensions
  requireVirusScan: boolean;     // Whether to require virus scanning
  storageLocation: string;       // Base storage location for documents
  encryptAtRest: boolean;        // Whether to encrypt documents at rest
}

/**
 * Document upload request
 */
export interface DocumentUploadRequest {
  file: Buffer;                  // File content
  fileName: string;              // Original file name
  mimeType: string;              // MIME type
  uploadedBy: string;            // User uploading the document
  metadata?: Record<string, any>; // Additional metadata
}

/**
 * Document upload result
 */
export interface DocumentUploadResult {
  documentUrl: string;           // URL to access the document
  documentHash: string;          // SHA-256 hash of document
  fileName: string;              // Stored file name
  fileSize: number;              // File size in bytes
  uploadDate: Date;              // Upload timestamp
  virusScanResult?: VirusScanResult;
}

/**
 * Virus scan result
 */
export interface VirusScanResult {
  isClean: boolean;
  scanDate: Date;
  scanEngine: string;
  threats?: string[];
}

/**
 * Certification compliance rule
 */
export interface CertificationComplianceRule {
  certificationType: LLPCertificationType;
  isRequired: boolean;
  requiresExpiration: boolean;
  maxAge?: number;               // Maximum age in days
  regulatoryStandards: string[]; // Required compliance standards
  verificationRequired: boolean; // Whether verification is required
}

/**
 * Certification verification request
 */
export interface CertificationVerificationRequest {
  certificationId: string;
  verifiedBy: string;
  verificationNotes?: string;
  complianceStandards?: string[];
}

/**
 * Certification batch processing result
 */
export interface CertificationBatchResult {
  successful: string[];          // Successfully processed certification IDs
  failed: Array<{               // Failed processing attempts
    certificationId?: string;
    request?: LLPCertificationRequest;
    error: LLPError;
  }>;
  warnings: Array<{             // Warnings during processing
    certificationId: string;
    warning: LLPError;
  }>;
}

/**
 * Document integrity check result
 */
export interface DocumentIntegrityResult {
  isValid: boolean;
  originalHash: string;
  currentHash: string;
  lastVerified: Date;
  integrityIssues: string[];
}

// ============================================================================
// CERTIFICATION MANAGEMENT SERVICE
// ============================================================================

export class LLPCertificationService extends EventEmitter {
  private prisma: PrismaClient;
  private uploadConfig: DocumentUploadConfig;
  private complianceRules: Map<LLPCertificationType, CertificationComplianceRule>;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
    this.loadUploadConfiguration();
    this.loadComplianceRules();
  }

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  /**
   * Load document upload configuration
   */
  private loadUploadConfiguration(): void {
    this.uploadConfig = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/tiff',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ],
      allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.doc', '.docx', '.txt'],
      requireVirusScan: true,
      storageLocation: process.env.LLP_DOCUMENT_STORAGE || './storage/llp-documents',
      encryptAtRest: true
    };
  }

  /**
   * Load certification compliance rules for different types
   */
  private loadComplianceRules(): void {
    this.complianceRules = new Map([
      [LLPCertificationType.FORM_1, {
        certificationType: LLPCertificationType.FORM_1,
        isRequired: true,
        requiresExpiration: false,
        regulatoryStandards: ['AS9100', 'IATA'],
        verificationRequired: true
      }],
      [LLPCertificationType.MATERIAL_CERT, {
        certificationType: LLPCertificationType.MATERIAL_CERT,
        isRequired: true,
        requiresExpiration: true,
        maxAge: 1825, // 5 years
        regulatoryStandards: ['ASTM', 'AMS'],
        verificationRequired: true
      }],
      [LLPCertificationType.TEST_REPORT, {
        certificationType: LLPCertificationType.TEST_REPORT,
        isRequired: true,
        requiresExpiration: true,
        maxAge: 365, // 1 year
        regulatoryStandards: ['NADCAP', 'AS9100'],
        verificationRequired: true
      }],
      [LLPCertificationType.TRACEABILITY_CERT, {
        certificationType: LLPCertificationType.TRACEABILITY_CERT,
        isRequired: true,
        requiresExpiration: false,
        regulatoryStandards: ['AS9100', 'FAA', 'EASA'],
        verificationRequired: true
      }],
      [LLPCertificationType.HEAT_LOT_CERT, {
        certificationType: LLPCertificationType.HEAT_LOT_CERT,
        isRequired: false,
        requiresExpiration: false,
        regulatoryStandards: ['AMS'],
        verificationRequired: false
      }],
      [LLPCertificationType.NDT_REPORT, {
        certificationType: LLPCertificationType.NDT_REPORT,
        isRequired: false,
        requiresExpiration: true,
        maxAge: 730, // 2 years
        regulatoryStandards: ['ASNT', 'NADCAP'],
        verificationRequired: true
      }],
      [LLPCertificationType.OEM_CERT, {
        certificationType: LLPCertificationType.OEM_CERT,
        isRequired: false,
        requiresExpiration: true,
        maxAge: 3650, // 10 years
        regulatoryStandards: ['OEM_SPECIFIC'],
        verificationRequired: false
      }]
    ]);
  }

  // ============================================================================
  // DOCUMENT UPLOAD AND STORAGE
  // ============================================================================

  /**
   * Upload and store certification document
   */
  async uploadDocument(request: DocumentUploadRequest): Promise<DocumentUploadResult> {
    // Validate upload request
    const validation = this.validateUploadRequest(request);
    if (!validation.isValid) {
      throw new Error(`Document upload validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    try {
      // Generate unique filename
      const fileExtension = path.extname(request.fileName);
      const uniqueId = crypto.randomUUID();
      const storedFileName = `${uniqueId}${fileExtension}`;
      const documentUrl = `/api/llp/documents/${uniqueId}`;

      // Calculate document hash
      const documentHash = crypto.createHash('sha256').update(request.file).digest('hex');

      // Perform virus scan if required
      let virusScanResult: VirusScanResult | undefined;
      if (this.uploadConfig.requireVirusScan) {
        virusScanResult = await this.performVirusScan(request.file);
        if (!virusScanResult.isClean) {
          throw new Error(`Document failed virus scan: ${virusScanResult.threats?.join(', ')}`);
        }
      }

      // Store document
      await this.storeDocument(storedFileName, request.file);

      // Emit event
      this.emit('documentUploaded', {
        fileName: request.fileName,
        storedFileName,
        documentUrl,
        documentHash,
        uploadedBy: request.uploadedBy
      });

      return {
        documentUrl,
        documentHash,
        fileName: storedFileName,
        fileSize: request.file.length,
        uploadDate: new Date(),
        virusScanResult
      };

    } catch (error) {
      this.emit('documentUploadError', {
        fileName: request.fileName,
        error: error instanceof Error ? error.message : 'Unknown error',
        uploadedBy: request.uploadedBy
      });
      throw error;
    }
  }

  /**
   * Validate document upload request
   */
  private validateUploadRequest(request: DocumentUploadRequest): LLPValidationResult {
    const errors: LLPError[] = [];

    // Check file size
    if (request.file.length > this.uploadConfig.maxFileSize) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'FILE_TOO_LARGE',
        message: `File size ${request.file.length} exceeds maximum ${this.uploadConfig.maxFileSize} bytes`
      });
    }

    // Check MIME type
    if (!this.uploadConfig.allowedMimeTypes.includes(request.mimeType)) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'INVALID_MIME_TYPE',
        message: `MIME type ${request.mimeType} is not allowed`
      });
    }

    // Check file extension
    const fileExtension = path.extname(request.fileName).toLowerCase();
    if (!this.uploadConfig.allowedExtensions.includes(fileExtension)) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'INVALID_FILE_EXTENSION',
        message: `File extension ${fileExtension} is not allowed`
      });
    }

    // Check for empty file
    if (request.file.length === 0) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'EMPTY_FILE',
        message: 'File cannot be empty'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Perform virus scan on document
   */
  private async performVirusScan(fileBuffer: Buffer): Promise<VirusScanResult> {
    // This is a placeholder for actual virus scanning integration
    // In production, this would integrate with ClamAV, Windows Defender, or similar

    // Simulate scan time
    await new Promise(resolve => setTimeout(resolve, 100));

    // Basic signature detection for demonstration
    const suspiciousPatterns = [
      Buffer.from('virus', 'utf8'),
      Buffer.from('malware', 'utf8'),
      Buffer.from('trojan', 'utf8')
    ];

    const threats: string[] = [];
    for (const pattern of suspiciousPatterns) {
      if (fileBuffer.includes(pattern)) {
        threats.push(`Suspicious pattern detected: ${pattern.toString()}`);
      }
    }

    return {
      isClean: threats.length === 0,
      scanDate: new Date(),
      scanEngine: 'MockAV-1.0',
      threats: threats.length > 0 ? threats : undefined
    };
  }

  /**
   * Store document to filesystem
   */
  private async storeDocument(fileName: string, fileBuffer: Buffer): Promise<void> {
    try {
      // Ensure storage directory exists
      await fs.mkdir(this.uploadConfig.storageLocation, { recursive: true });

      // Store file
      const filePath = path.join(this.uploadConfig.storageLocation, fileName);

      if (this.uploadConfig.encryptAtRest) {
        // Encrypt file before storage (simplified example)
        const cipher = crypto.createCipher('aes256', process.env.DOCUMENT_ENCRYPTION_KEY || 'default-key');
        let encrypted = cipher.update(fileBuffer);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        await fs.writeFile(filePath, encrypted);
      } else {
        await fs.writeFile(filePath, fileBuffer);
      }

    } catch (error) {
      throw new Error(`Failed to store document ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // CERTIFICATION LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Create new LLP certification record
   */
  async createCertification(request: LLPCertificationRequest): Promise<string> {
    // Validate certification request
    const validation = await this.validateCertificationRequest(request);
    if (!validation.isValid) {
      throw new Error(`Certification validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    try {
      // Create certification record
      const certification = await this.prisma.lLPCertification.create({
        data: {
          serializedPartId: request.serializedPartId,
          certificationType: request.certificationType,
          documentName: request.documentName,
          documentUrl: request.documentUrl,
          documentHash: request.documentHash,
          issuedBy: request.issuedBy,
          issuedDate: request.issuedDate,
          expirationDate: request.expirationDate,
          certificationNumber: request.certificationNumber,
          batchNumber: request.batchNumber,
          testResults: request.testResults,
          complianceStandards: request.complianceStandards || [],
          verifiedBy: request.verifiedBy,
          verifiedAt: request.verifiedAt,
          isActive: true,
          notes: request.notes
        }
      });

      // Emit event
      this.emit('certificationCreated', {
        certificationId: certification.id,
        serializedPartId: request.serializedPartId,
        certificationType: request.certificationType,
        documentUrl: request.documentUrl
      });

      return certification.id;

    } catch (error) {
      this.emit('certificationError', {
        operation: 'create',
        serializedPartId: request.serializedPartId,
        certificationType: request.certificationType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validate certification request
   */
  private async validateCertificationRequest(request: LLPCertificationRequest): Promise<LLPValidationResult> {
    const errors: LLPError[] = [];
    const warnings: LLPError[] = [];

    // Check if serialized part exists
    const serializedPart = await this.prisma.serializedPart.findUnique({
      where: { id: request.serializedPartId },
      include: { part: true }
    });

    if (!serializedPart) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'INVALID_SERIALIZED_PART',
        message: `Serialized part ${request.serializedPartId} not found`,
        serializedPartId: request.serializedPartId
      });
    }

    // Validate certification type against compliance rules
    const complianceRule = this.complianceRules.get(request.certificationType);
    if (complianceRule) {
      // Check expiration requirement
      if (complianceRule.requiresExpiration && !request.expirationDate) {
        errors.push({
          type: LLPErrorType.COMPLIANCE_VIOLATION,
          code: 'MISSING_EXPIRATION_DATE',
          message: `Certification type ${request.certificationType} requires expiration date`,
          serializedPartId: request.serializedPartId
        });
      }

      // Check compliance standards
      if (request.complianceStandards) {
        const missingStandards = complianceRule.regulatoryStandards.filter(
          standard => !request.complianceStandards!.includes(standard)
        );
        if (missingStandards.length > 0) {
          warnings.push({
            type: LLPErrorType.COMPLIANCE_VIOLATION,
            code: 'MISSING_COMPLIANCE_STANDARDS',
            message: `Missing required compliance standards: ${missingStandards.join(', ')}`,
            serializedPartId: request.serializedPartId
          });
        }
      }
    }

    // Check for duplicate certifications
    if (serializedPart) {
      const existingCertification = await this.prisma.lLPCertification.findFirst({
        where: {
          serializedPartId: request.serializedPartId,
          certificationType: request.certificationType,
          isActive: true
        }
      });

      if (existingCertification) {
        warnings.push({
          type: LLPErrorType.BUSINESS_RULE_VIOLATION,
          code: 'DUPLICATE_CERTIFICATION',
          message: `Active certification of type ${request.certificationType} already exists`,
          serializedPartId: request.serializedPartId
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Verify certification authenticity and compliance
   */
  async verifyCertification(request: CertificationVerificationRequest): Promise<void> {
    const certification = await this.prisma.lLPCertification.findUnique({
      where: { id: request.certificationId }
    });

    if (!certification) {
      throw new Error(`Certification ${request.certificationId} not found`);
    }

    // Update verification status
    await this.prisma.lLPCertification.update({
      where: { id: request.certificationId },
      data: {
        verifiedBy: request.verifiedBy,
        verifiedAt: new Date(),
        complianceStandards: request.complianceStandards || certification.complianceStandards,
        notes: request.verificationNotes || certification.notes
      }
    });

    // Emit event
    this.emit('certificationVerified', {
      certificationId: request.certificationId,
      verifiedBy: request.verifiedBy,
      certificationType: certification.certificationType
    });
  }

  /**
   * Check document integrity
   */
  async checkDocumentIntegrity(certificationId: string): Promise<DocumentIntegrityResult> {
    const certification = await this.prisma.lLPCertification.findUnique({
      where: { id: certificationId }
    });

    if (!certification || !certification.documentUrl || !certification.documentHash) {
      throw new Error(`Certification ${certificationId} or document not found`);
    }

    try {
      // Read stored document
      const fileName = path.basename(certification.documentUrl);
      const filePath = path.join(this.uploadConfig.storageLocation, fileName);

      let fileBuffer: Buffer;
      if (this.uploadConfig.encryptAtRest) {
        const encryptedBuffer = await fs.readFile(filePath);
        const decipher = crypto.createDecipher('aes256', process.env.DOCUMENT_ENCRYPTION_KEY || 'default-key');
        let decrypted = decipher.update(encryptedBuffer);
        fileBuffer = Buffer.concat([decrypted, decipher.final()]);
      } else {
        fileBuffer = await fs.readFile(filePath);
      }

      // Calculate current hash
      const currentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const isValid = currentHash === certification.documentHash;

      const result: DocumentIntegrityResult = {
        isValid,
        originalHash: certification.documentHash,
        currentHash,
        lastVerified: new Date(),
        integrityIssues: isValid ? [] : ['Document hash mismatch - potential tampering detected']
      };

      if (!isValid) {
        this.emit('documentIntegrityFailure', {
          certificationId,
          originalHash: certification.documentHash,
          currentHash,
          documentUrl: certification.documentUrl
        });
      }

      return result;

    } catch (error) {
      return {
        isValid: false,
        originalHash: certification.documentHash,
        currentHash: '',
        lastVerified: new Date(),
        integrityIssues: [`Document access failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // ============================================================================
  // COMPLIANCE AND REPORTING
  // ============================================================================

  /**
   * Get certification status for a serialized part
   */
  async getCertificationStatus(serializedPartId: string): Promise<LLPCertificationStatus> {
    const certifications = await this.prisma.lLPCertification.findMany({
      where: {
        serializedPartId,
        isActive: true
      }
    });

    const now = new Date();
    const expiringThreshold = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days

    // Check which certification types are present
    const presentTypes = new Set(certifications.map(cert => cert.certificationType));

    const status: LLPCertificationStatus = {
      hasForm1: presentTypes.has(LLPCertificationType.FORM_1),
      hasMaterialCert: presentTypes.has(LLPCertificationType.MATERIAL_CERT),
      hasTestReports: presentTypes.has(LLPCertificationType.TEST_REPORT),
      hasTraceabilityCert: presentTypes.has(LLPCertificationType.TRACEABILITY_CERT),
      missingCertifications: [],
      expiringCertifications: [],
      isCompliant: true,
      complianceNotes: []
    };

    // Check for missing required certifications
    for (const [certType, rule] of this.complianceRules.entries()) {
      if (rule.isRequired && !presentTypes.has(certType)) {
        status.missingCertifications.push(certType);
        status.isCompliant = false;
        status.complianceNotes.push(`Missing required certification: ${certType}`);
      }
    }

    // Check for expiring certifications
    status.expiringCertifications = certifications.filter(cert =>
      cert.expirationDate && cert.expirationDate <= expiringThreshold
    );

    if (status.expiringCertifications.length > 0) {
      status.complianceNotes.push(`${status.expiringCertifications.length} certification(s) expiring within 30 days`);
    }

    return status;
  }

  /**
   * Get compliance status for all LLP requirements
   */
  async getComplianceStatus(serializedPartId: string): Promise<LLPComplianceStatus> {
    const certificationStatus = await this.getCertificationStatus(serializedPartId);
    const serializedPart = await this.prisma.serializedPart.findUnique({
      where: { id: serializedPartId },
      include: {
        part: true,
        llpLifeHistory: true
      }
    });

    if (!serializedPart) {
      throw new Error(`Serialized part ${serializedPartId} not found`);
    }

    const complianceIssues: string[] = [];

    // IATA compliance
    const hasBackToBirthTrace = serializedPart.llpLifeHistory.some(
      history => history.eventType === 'MANUFACTURE'
    );
    const iataCompliant = certificationStatus.hasTraceabilityCert && hasBackToBirthTrace;

    if (!iataCompliant) {
      complianceIssues.push('IATA: Missing back-to-birth traceability requirements');
    }

    // FAA compliance
    const hasPart43Records = serializedPart.llpLifeHistory.some(
      history => ['REPAIR', 'INSPECT', 'OVERHAUL'].includes(history.eventType)
    );
    const faaCompliant = certificationStatus.hasForm1 && hasPart43Records;

    if (!faaCompliant) {
      complianceIssues.push('FAA: Missing Form 1 or Part 43 maintenance records');
    }

    // EASA compliance
    const hasMarkingRequirements = certificationStatus.hasTraceabilityCert;
    const easaCompliant = hasMarkingRequirements && certificationStatus.hasForm1;

    if (!easaCompliant) {
      complianceIssues.push('EASA: Missing marking or certification requirements');
    }

    return {
      iataCompliant,
      hasBackToBirthTrace,
      faaCompliant,
      hasPart43Records,
      easaCompliant,
      hasMarkingRequirements,
      overallCompliant: iataCompliant && faaCompliant && easaCompliant,
      complianceIssues,
      complianceNotes: certificationStatus.complianceNotes
    };
  }

  /**
   * Get expiring certifications across all parts
   */
  async getExpiringCertifications(daysAhead: number = 30): Promise<LLPCertificationWithRelations[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysAhead);

    return await this.prisma.lLPCertification.findMany({
      where: {
        isActive: true,
        expirationDate: {
          lte: thresholdDate,
          gte: new Date()
        }
      },
      include: {
        serializedPart: {
          include: {
            part: true
          }
        }
      },
      orderBy: {
        expirationDate: 'asc'
      }
    });
  }

  /**
   * Batch process multiple certifications
   */
  async batchProcessCertifications(requests: LLPCertificationRequest[]): Promise<CertificationBatchResult> {
    const result: CertificationBatchResult = {
      successful: [],
      failed: [],
      warnings: []
    };

    for (const request of requests) {
      try {
        const certificationId = await this.createCertification(request);
        result.successful.push(certificationId);
      } catch (error) {
        result.failed.push({
          request,
          error: {
            type: LLPErrorType.CERTIFICATION_ERROR,
            code: 'BATCH_PROCESSING_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
            serializedPartId: request.serializedPartId
          }
        });
      }
    }

    // Emit batch processing complete event
    this.emit('batchProcessingComplete', {
      totalRequests: requests.length,
      successful: result.successful.length,
      failed: result.failed.length,
      warnings: result.warnings.length
    });

    return result;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Retrieve document content
   */
  async retrieveDocument(documentUrl: string): Promise<Buffer> {
    try {
      const fileName = path.basename(documentUrl);
      const filePath = path.join(this.uploadConfig.storageLocation, fileName);

      if (this.uploadConfig.encryptAtRest) {
        const encryptedBuffer = await fs.readFile(filePath);
        const decipher = crypto.createDecipher('aes256', process.env.DOCUMENT_ENCRYPTION_KEY || 'default-key');
        let decrypted = decipher.update(encryptedBuffer);
        return Buffer.concat([decrypted, decipher.final()]);
      } else {
        return await fs.readFile(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to retrieve document ${documentUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete certification and associated document
   */
  async deleteCertification(certificationId: string, deletedBy: string): Promise<void> {
    const certification = await this.prisma.lLPCertification.findUnique({
      where: { id: certificationId }
    });

    if (!certification) {
      throw new Error(`Certification ${certificationId} not found`);
    }

    // Mark as inactive instead of deleting for audit trail
    await this.prisma.lLPCertification.update({
      where: { id: certificationId },
      data: {
        isActive: false,
        notes: `${certification.notes || ''}\nDeleted by ${deletedBy} on ${new Date().toISOString()}`
      }
    });

    // Emit event
    this.emit('certificationDeleted', {
      certificationId,
      serializedPartId: certification.serializedPartId,
      certificationType: certification.certificationType,
      deletedBy
    });
  }

  /**
   * Update certification expiration monitoring
   */
  async updateExpirationMonitoring(): Promise<void> {
    const expiringCertifications = await this.getExpiringCertifications(30);

    for (const certification of expiringCertifications) {
      this.emit('certificationExpiring', {
        certificationId: certification.id,
        serializedPartId: certification.serializedPartId,
        certificationType: certification.certificationType,
        expirationDate: certification.expirationDate,
        daysUntilExpiration: certification.expirationDate ?
          Math.ceil((certification.expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) :
          null
      });
    }
  }
}