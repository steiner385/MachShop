/**
 * Vendor Serial Service
 * Issue #150: Serialization - Advanced Assignment Workflows
 *
 * Handles acceptance, validation, and propagation of vendor-provided serial numbers.
 * Supports serial format validation, uniqueness checking, and linking to internal tracking.
 */

import { PrismaClient, VendorSerial, SerializedPart } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface VendorSerialInput {
  vendorSerialNumber: string;
  vendorName: string;
  partId: string;
  receivedDate?: Date;
}

export interface VendorSerialValidationResult {
  isValid: boolean;
  formatValid: boolean;
  isUnique: boolean;
  errors: string[];
  warnings: string[];
}

export interface VendorSerialAcceptanceInput {
  vendorSerialId: string;
  acceptedBy: string;
  internalSerialId?: string;
}

export interface VendorSerialRejectInput {
  vendorSerialId: string;
  rejectionReason: string;
  rejectedBy: string;
}

export interface VendorSerialPropagationInput {
  vendorSerialId: string;
  operationCode: string;
  quantity: number;
  sourceLocationId?: string;
  targetLocationId?: string;
  propagatedBy: string;
}

export class VendorSerialService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Receive and validate vendor-provided serial number
   */
  async receiveVendorSerial(input: VendorSerialInput): Promise<VendorSerial> {
    try {
      logger.info(`Receiving vendor serial ${input.vendorSerialNumber} from ${input.vendorName}`);

      // Validate input
      if (!input.vendorSerialNumber || !input.vendorSerialNumber.trim()) {
        throw new Error('Vendor serial number cannot be empty');
      }

      if (!input.vendorName || !input.vendorName.trim()) {
        throw new Error('Vendor name is required');
      }

      if (!input.partId || !input.partId.trim()) {
        throw new Error('Part ID is required');
      }

      // Verify part exists
      const part = await this.prisma.part.findUnique({
        where: { id: input.partId },
      });

      if (!part) {
        throw new Error(`Part ${input.partId} not found`);
      }

      // Check for duplicate vendor serial
      const existing = await this.prisma.vendorSerial.findUnique({
        where: {
          vendorSerialNumber_vendorName_partId: {
            vendorSerialNumber: input.vendorSerialNumber,
            vendorName: input.vendorName,
            partId: input.partId,
          },
        },
      });

      if (existing && !existing.rejectedDate) {
        throw new Error(
          `Vendor serial ${input.vendorSerialNumber} from ${input.vendorName} already exists for this part`
        );
      }

      // Validate serial format
      const formatValidation = await this.validateSerialFormat(
        input.vendorSerialNumber,
        input.partId
      );

      // Create vendor serial record
      const vendorSerial = await this.prisma.vendorSerial.create({
        data: {
          vendorSerialNumber: input.vendorSerialNumber,
          vendorName: input.vendorName,
          partId: input.partId,
          receivedDate: input.receivedDate || new Date(),
          formatValid: formatValidation.isValid,
          validationErrors: formatValidation.errors,
        },
      });

      logger.info(`Vendor serial ${vendorSerial.id} created successfully`);
      return vendorSerial;
    } catch (error) {
      logger.error(`Error receiving vendor serial: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Validate serial format against expected patterns
   */
  private async validateSerialFormat(
    serialNumber: string,
    partId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];

      // Get part serial configuration
      const part = await this.prisma.part.findUnique({
        where: { id: partId },
        include: { serialNumberFormatConfig: true },
      });

      if (!part?.serialNumberFormatConfig) {
        // No format configuration - accept any format
        return { isValid: true, errors: [] };
      }

      const config = part.serialNumberFormatConfig;

      // Check minimum length
      if (config.minimumLength && serialNumber.length < config.minimumLength) {
        errors.push(`Serial number is shorter than minimum length of ${config.minimumLength}`);
      }

      // Check maximum length
      if (config.maximumLength && serialNumber.length > config.maximumLength) {
        errors.push(`Serial number is longer than maximum length of ${config.maximumLength}`);
      }

      // Check pattern if defined
      if (config.pattern) {
        const regex = new RegExp(config.pattern);
        if (!regex.test(serialNumber)) {
          errors.push(`Serial number does not match required pattern: ${config.pattern}`);
        }
      }

      // Check for allowed characters
      if (config.allowedCharacterSet) {
        const allowedChars = new RegExp(`^[${config.allowedCharacterSet}]+$`);
        if (!allowedChars.test(serialNumber)) {
          errors.push(`Serial number contains invalid characters. Allowed: ${config.allowedCharacterSet}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      logger.error(`Error validating serial format: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors: ['Format validation failed'] };
    }
  }

  /**
   * Validate vendor serial (format, uniqueness, completeness)
   */
  async validateVendorSerial(vendorSerialId: string): Promise<VendorSerialValidationResult> {
    try {
      logger.info(`Validating vendor serial ${vendorSerialId}`);

      const vendorSerial = await this.prisma.vendorSerial.findUnique({
        where: { id: vendorSerialId },
      });

      if (!vendorSerial) {
        throw new Error(`Vendor serial ${vendorSerialId} not found`);
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check format validation
      const formatValid = vendorSerial.formatValid;
      if (!formatValid) {
        errors.push(...vendorSerial.validationErrors);
      }

      // Check uniqueness
      const isUnique = await this.checkUniqueness(
        vendorSerial.vendorSerialNumber,
        vendorSerial.partId
      );

      if (!isUnique) {
        errors.push(`Serial number ${vendorSerial.vendorSerialNumber} is not unique for this part`);
      }

      // Check if already accepted
      if (vendorSerial.acceptedDate) {
        warnings.push('Serial number already accepted');
      }

      // Check if already rejected
      if (vendorSerial.rejectedDate) {
        errors.push('Serial number has been rejected');
      }

      return {
        isValid: errors.length === 0,
        formatValid,
        isUnique,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error(`Error validating vendor serial: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check serial number uniqueness based on configured scopes
   */
  private async checkUniqueness(serialNumber: string, partId: string): Promise<boolean> {
    try {
      // Get all uniqueness scopes for this serial/part combination
      const scopes = await this.prisma.serialUniquenessScope.findMany({
        where: {
          serialNumber,
          partId,
        },
      });

      if (scopes.length === 0) {
        // No existing scopes means it's unique
        return true;
      }

      // Check if any scope has conflicts
      const hasConflicts = scopes.some((scope) => scope.hasConflict);

      return !hasConflicts;
    } catch (error) {
      logger.error(`Error checking uniqueness: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Accept a vendor serial and optionally link to internal serial
   */
  async acceptVendorSerial(input: VendorSerialAcceptanceInput): Promise<VendorSerial> {
    try {
      logger.info(`Accepting vendor serial ${input.vendorSerialId} by user ${input.acceptedBy}`);

      const vendorSerial = await this.prisma.vendorSerial.findUnique({
        where: { id: input.vendorSerialId },
      });

      if (!vendorSerial) {
        throw new Error(`Vendor serial ${input.vendorSerialId} not found`);
      }

      if (vendorSerial.acceptedDate) {
        throw new Error('Vendor serial has already been accepted');
      }

      if (vendorSerial.rejectedDate) {
        throw new Error('Vendor serial has been rejected and cannot be accepted');
      }

      // If linking to internal serial, verify it exists
      if (input.internalSerialId) {
        const internalSerial = await this.prisma.serializedPart.findUnique({
          where: { id: input.internalSerialId },
        });

        if (!internalSerial) {
          throw new Error(`Internal serial ${input.internalSerialId} not found`);
        }

        // Verify part matches
        if (internalSerial.partId !== vendorSerial.partId) {
          throw new Error('Part ID mismatch between vendor serial and internal serial');
        }
      }

      // Update vendor serial
      const updated = await this.prisma.vendorSerial.update({
        where: { id: input.vendorSerialId },
        data: {
          acceptedDate: new Date(),
          acceptedBy: input.acceptedBy,
          internalSerialId: input.internalSerialId,
          isUnique: true,
        },
      });

      // Create audit trail
      await this.createAuditTrail({
        serialNumber: vendorSerial.vendorSerialNumber,
        serialId: input.internalSerialId || input.vendorSerialId,
        partId: vendorSerial.partId,
        eventType: 'ACCEPTED',
        eventSource: 'VENDOR',
        performedBy: input.acceptedBy,
        details: JSON.stringify({
          vendorName: vendorSerial.vendorName,
          linkedToInternal: !!input.internalSerialId,
        }),
      });

      logger.info(`Vendor serial ${input.vendorSerialId} accepted successfully`);
      return updated;
    } catch (error) {
      logger.error(
        `Error accepting vendor serial: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Reject a vendor serial with reason
   */
  async rejectVendorSerial(input: VendorSerialRejectInput): Promise<VendorSerial> {
    try {
      logger.info(`Rejecting vendor serial ${input.vendorSerialId}`);

      const vendorSerial = await this.prisma.vendorSerial.findUnique({
        where: { id: input.vendorSerialId },
      });

      if (!vendorSerial) {
        throw new Error(`Vendor serial ${input.vendorSerialId} not found`);
      }

      if (vendorSerial.acceptedDate) {
        throw new Error('Cannot reject an already accepted vendor serial');
      }

      if (vendorSerial.rejectedDate) {
        throw new Error('Vendor serial has already been rejected');
      }

      // Update vendor serial
      const updated = await this.prisma.vendorSerial.update({
        where: { id: input.vendorSerialId },
        data: {
          rejectedDate: new Date(),
          rejectionReason: input.rejectionReason,
        },
      });

      // Create audit trail
      await this.createAuditTrail({
        serialNumber: vendorSerial.vendorSerialNumber,
        serialId: input.vendorSerialId,
        partId: vendorSerial.partId,
        eventType: 'CREATED', // Mark as failed/rejected
        eventSource: 'VENDOR',
        performedBy: input.rejectedBy,
        details: JSON.stringify({
          rejectionReason: input.rejectionReason,
          vendorName: vendorSerial.vendorName,
        }),
      });

      logger.info(`Vendor serial ${input.vendorSerialId} rejected successfully`);
      return updated;
    } catch (error) {
      logger.error(
        `Error rejecting vendor serial: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Propagate vendor serial through routing
   */
  async propagateVendorSerial(input: VendorSerialPropagationInput): Promise<void> {
    try {
      logger.info(
        `Propagating vendor serial ${input.vendorSerialId} through operation ${input.operationCode}`
      );

      const vendorSerial = await this.prisma.vendorSerial.findUnique({
        where: { id: input.vendorSerialId },
        include: { internalSerial: true },
      });

      if (!vendorSerial) {
        throw new Error(`Vendor serial ${input.vendorSerialId} not found`);
      }

      if (!vendorSerial.acceptedDate) {
        throw new Error('Vendor serial must be accepted before propagation');
      }

      if (!vendorSerial.internalSerialId) {
        throw new Error('Vendor serial must be linked to an internal serial for propagation');
      }

      // Record propagation event
      await this.prisma.serialPropagation.create({
        data: {
          sourceSerialId: vendorSerial.internalSerialId,
          propagationType: 'PASS_THROUGH',
          quantity: input.quantity,
          operationCode: input.operationCode,
          createdBy: input.propagatedBy,
          notes: `Vendor serial ${vendorSerial.vendorSerialNumber} from ${vendorSerial.vendorName}`,
        },
      });

      // Create audit trail
      await this.createAuditTrail({
        serialNumber: vendorSerial.vendorSerialNumber,
        serialId: vendorSerial.internalSerialId,
        partId: vendorSerial.partId,
        eventType: 'PROPAGATED',
        eventSource: 'VENDOR',
        performedBy: input.propagatedBy,
        details: JSON.stringify({
          operationCode: input.operationCode,
          quantity: input.quantity,
          sourceLocation: input.sourceLocationId,
          targetLocation: input.targetLocationId,
        }),
      });

      logger.info(`Vendor serial propagation recorded successfully`);
    } catch (error) {
      logger.error(
        `Error propagating vendor serial: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get vendor serial by ID
   */
  async getVendorSerial(vendorSerialId: string): Promise<VendorSerial | null> {
    try {
      return await this.prisma.vendorSerial.findUnique({
        where: { id: vendorSerialId },
      });
    } catch (error) {
      logger.error(`Error getting vendor serial: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get vendor serials for a part
   */
  async getVendorSerialsByPart(
    partId: string,
    filters?: {
      status?: 'pending' | 'accepted' | 'rejected';
      vendorName?: string;
    }
  ): Promise<VendorSerial[]> {
    try {
      const where: any = { partId };

      if (filters?.status === 'accepted') {
        where.acceptedDate = { not: null };
      } else if (filters?.status === 'rejected') {
        where.rejectedDate = { not: null };
      } else if (filters?.status === 'pending') {
        where.acceptedDate = null;
        where.rejectedDate = null;
      }

      if (filters?.vendorName) {
        where.vendorName = filters.vendorName;
      }

      return await this.prisma.vendorSerial.findMany({
        where,
        orderBy: { receivedDate: 'desc' },
      });
    } catch (error) {
      logger.error(
        `Error getting vendor serials: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Create audit trail entry
   */
  private async createAuditTrail(input: {
    serialNumber: string;
    serialId: string;
    partId: string;
    eventType: string;
    eventSource: string;
    performedBy: string;
    details?: string;
  }): Promise<void> {
    try {
      await this.prisma.serialAssignmentAudit.create({
        data: {
          serialNumber: input.serialNumber,
          serialId: input.serialId,
          partId: input.partId,
          eventType: input.eventType,
          eventSource: input.eventSource,
          performedBy: input.performedBy,
          performedAt: new Date(),
          details: input.details,
        },
      });
    } catch (error) {
      logger.error(
        `Error creating audit trail: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - audit trail failure shouldn't block main operation
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default VendorSerialService;
