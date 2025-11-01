/**
 * Test Certificate Service
 * Issue #233: Test Cell Integration & Engine Acceptance Testing
 *
 * Manages test result certificates:
 * - Certificate generation after successful tests
 * - FAA AC 43-207 compliance documentation
 * - Certificate validation and expiration tracking
 * - Digital signature and approval workflows
 */

import { PrismaClient, TestCertificate } from '@prisma/client';
import { logger } from '../utils/logger';

export interface GenerateCertificateInput {
  testRunId: string;
  certificateType: string;
  allTestsPassed: boolean;
  failedCriteria?: string[];
  certificationStandards: string[];
  issuedById?: string;
  approverComments?: string;
  expirationDate?: Date;
}

export interface TestCertificateResponse {
  id: string;
  testRunId: string;
  certificateNumber: string;
  certificateType: string;
  issuedDate: Date;
  expirationDate?: Date;
  certificationStandards: string[];
  allTestsPassed: boolean;
  testSummary?: string;
  failedCriteria?: string[];
  isValid: boolean;
  certificatePath?: string;
  createdAt: Date;
}

export class TestCertificateService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Generate a test certificate
   */
  async generateCertificate(input: GenerateCertificateInput): Promise<TestCertificateResponse> {
    try {
      // Validate test run exists
      const testRun = await this.prisma.testRun.findUnique({
        where: { id: input.testRunId },
        include: {
          buildRecord: true,
          testCell: true,
        },
      });

      if (!testRun) {
        throw new Error(`Test run not found: ${input.testRunId}`);
      }

      // Generate unique certificate number
      const timestamp = Date.now();
      const certificateNumber = `TEST-CERT-${timestamp}`;

      // Build test summary
      const testSummary = this.buildTestSummary(testRun);

      // Create certificate
      const certificate = await this.prisma.testCertificate.create({
        data: {
          testRunId: input.testRunId,
          certificateNumber,
          certificateType: input.certificateType,
          issuedDate: new Date(),
          certificationStandards: input.certificationStandards,
          allTestsPassed: input.allTestsPassed,
          testSummary,
          failedCriteria: input.failedCriteria || [],
          issuedById: input.issuedById,
          approvalDate: input.issuedById ? new Date() : undefined,
          approverComments: input.approverComments,
          expirationDate: input.expirationDate,
          isValid: true,
        },
      });

      // Update test run to mark certificate as generated
      await this.prisma.testRun.update({
        where: { id: input.testRunId },
        data: {
          testCertificateGenerated: true,
          faaCompliant: input.allTestsPassed,
        },
      });

      logger.info(`Generated certificate ${certificateNumber} for test run ${input.testRunId}`);
      return this.mapToResponse(certificate);
    } catch (error) {
      logger.error(`Error in generateCertificate: ${error}`);
      throw error;
    }
  }

  /**
   * Get certificate by ID
   */
  async getCertificate(certificateId: string): Promise<TestCertificateResponse | null> {
    try {
      const certificate = await this.prisma.testCertificate.findUnique({
        where: { id: certificateId },
      });

      if (!certificate) {
        logger.warn(`Certificate not found: ${certificateId}`);
        return null;
      }

      return this.mapToResponse(certificate);
    } catch (error) {
      logger.error(`Error in getCertificate: ${error}`);
      throw error;
    }
  }

  /**
   * Get certificate by certificate number
   */
  async getCertificateByNumber(certificateNumber: string): Promise<TestCertificateResponse | null> {
    try {
      const certificate = await this.prisma.testCertificate.findUnique({
        where: { certificateNumber },
      });

      if (!certificate) {
        logger.warn(`Certificate not found: ${certificateNumber}`);
        return null;
      }

      return this.mapToResponse(certificate);
    } catch (error) {
      logger.error(`Error in getCertificateByNumber: ${error}`);
      throw error;
    }
  }

  /**
   * Get certificates for a test run
   */
  async getTestRunCertificates(testRunId: string): Promise<TestCertificateResponse[]> {
    try {
      const certificates = await this.prisma.testCertificate.findMany({
        where: { testRunId },
        orderBy: { issuedDate: 'desc' },
      });

      return certificates.map(cert => this.mapToResponse(cert));
    } catch (error) {
      logger.error(`Error in getTestRunCertificates: ${error}`);
      throw error;
    }
  }

  /**
   * Validate certificate - check validity and expiration
   */
  async validateCertificate(certificateId: string): Promise<{ isValid: boolean; reason?: string }> {
    try {
      const certificate = await this.prisma.testCertificate.findUnique({
        where: { id: certificateId },
      });

      if (!certificate) {
        return { isValid: false, reason: 'Certificate not found' };
      }

      if (!certificate.isValid) {
        return { isValid: false, reason: 'Certificate has been invalidated' };
      }

      if (certificate.expirationDate && new Date() > certificate.expirationDate) {
        return { isValid: false, reason: 'Certificate has expired' };
      }

      logger.info(`Certificate ${certificate.certificateNumber} is valid`);
      return { isValid: true };
    } catch (error) {
      logger.error(`Error in validateCertificate: ${error}`);
      throw error;
    }
  }

  /**
   * Revoke a certificate
   */
  async revokeCertificate(certificateId: string, reason?: string): Promise<TestCertificateResponse> {
    try {
      const certificate = await this.prisma.testCertificate.update({
        where: { id: certificateId },
        data: {
          isValid: false,
          approverComments: reason || 'Certificate revoked',
        },
      });

      logger.warn(`Revoked certificate ${certificate.certificateNumber}: ${reason || 'No reason provided'}`);
      return this.mapToResponse(certificate);
    } catch (error) {
      logger.error(`Error in revokeCertificate: ${error}`);
      throw error;
    }
  }

  /**
   * Get valid certificates for a build
   */
  async getBuildCertificates(buildRecordId: string): Promise<TestCertificateResponse[]> {
    try {
      const certificates = await this.prisma.testCertificate.findMany({
        where: {
          testRun: {
            buildRecordId,
          },
          isValid: true,
        },
        orderBy: { issuedDate: 'desc' },
      });

      return certificates.map(cert => this.mapToResponse(cert));
    } catch (error) {
      logger.error(`Error in getBuildCertificates: ${error}`);
      throw error;
    }
  }

  /**
   * Check FAA AC 43-207 compliance for a build
   */
  async checkFAACompliance(buildRecordId: string): Promise<{
    isCompliant: boolean;
    certificates: TestCertificateResponse[];
    allPassed: boolean;
  }> {
    try {
      const certificates = await this.getBuildCertificates(buildRecordId);

      const allPassed = certificates.length > 0 && certificates.every(cert => cert.allTestsPassed);
      const isCompliant = allPassed && this.validateFAAStandards(certificates);

      logger.info(`FAA compliance check for build ${buildRecordId}: ${isCompliant}`);

      return {
        isCompliant,
        certificates,
        allPassed,
      };
    } catch (error) {
      logger.error(`Error in checkFAACompliance: ${error}`);
      throw error;
    }
  }

  /**
   * Store certificate file path
   */
  async setCertificatePath(certificateId: string, certificatePath: string): Promise<TestCertificateResponse> {
    try {
      const certificate = await this.prisma.testCertificate.update({
        where: { id: certificateId },
        data: {
          certificatePath,
        },
      });

      logger.info(`Set certificate path for ${certificate.certificateNumber}: ${certificatePath}`);
      return this.mapToResponse(certificate);
    } catch (error) {
      logger.error(`Error in setCertificatePath: ${error}`);
      throw error;
    }
  }

  /**
   * Get certificates expiring within a date range
   */
  async getExpiringCertificates(startDate: Date, endDate: Date): Promise<TestCertificateResponse[]> {
    try {
      const certificates = await this.prisma.testCertificate.findMany({
        where: {
          expirationDate: {
            gte: startDate,
            lte: endDate,
          },
          isValid: true,
        },
        orderBy: { expirationDate: 'asc' },
      });

      logger.info(`Found ${certificates.length} certificates expiring between ${startDate} and ${endDate}`);
      return certificates.map(cert => this.mapToResponse(cert));
    } catch (error) {
      logger.error(`Error in getExpiringCertificates: ${error}`);
      throw error;
    }
  }

  /**
   * Helper: Build test summary string
   */
  private buildTestSummary(testRun: any): string {
    const summary: string[] = [];
    summary.push(`Test Run: ${testRun.testRunNumber}`);
    summary.push(`Build: ${testRun.buildRecord?.buildRecordNumber || 'Unknown'}`);
    summary.push(`Test Cell: ${testRun.testCell?.cellName || 'Unknown'}`);
    summary.push(`Status: ${testRun.status}`);
    summary.push(`Duration: ${testRun.actualDuration || 'Not specified'} minutes`);

    if (testRun.testPassed !== null) {
      summary.push(`Result: ${testRun.testPassed ? 'PASSED' : 'FAILED'}`);
    }

    return summary.join('\n');
  }

  /**
   * Helper: Validate FAA standards are present
   */
  private validateFAAStandards(certificates: TestCertificate[]): boolean {
    return certificates.some(cert =>
      cert.certificationStandards.some(std =>
        std.includes('FAA') || std.includes('43-207')
      )
    );
  }

  /**
   * Helper: Map to response
   */
  private mapToResponse(certificate: TestCertificate): TestCertificateResponse {
    return {
      id: certificate.id,
      testRunId: certificate.testRunId,
      certificateNumber: certificate.certificateNumber,
      certificateType: certificate.certificateType,
      issuedDate: certificate.issuedDate,
      expirationDate: certificate.expirationDate || undefined,
      certificationStandards: certificate.certificationStandards,
      allTestsPassed: certificate.allTestsPassed,
      testSummary: certificate.testSummary || undefined,
      failedCriteria: certificate.failedCriteria,
      isValid: certificate.isValid,
      certificatePath: certificate.certificatePath || undefined,
      createdAt: certificate.createdAt,
    };
  }
}
