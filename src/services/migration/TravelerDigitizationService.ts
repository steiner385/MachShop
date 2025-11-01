/**
 * Traveler Digitization Service
 * Issue #36: Paper-Based Traveler Digitization
 *
 * Core service for digitizing travelers, managing entry, review, and work order creation
 */

import { logger } from '../../utils/logger';
import { OCRService, OCRConfig } from './OCRService';
import { TemplateMatcher, TravelerTemplate } from './TemplateMatcher';

// ============================================================================
// Interfaces
// ============================================================================

export interface DigitizedOperationData {
  operationNumber: string;
  operationDescription?: string;
  workCenter?: string;
  quantity?: number;
  startTime?: Date;
  endTime?: Date;
  status?: string;
  notes?: string;
  laborHours?: number;
  materialUsed?: Record<string, number>;
  tools?: string[];
  qualityNotes?: string;
}

export interface DigitizedTravelerData {
  id?: string;
  sourceDocument?: {
    fileName: string;
    uploadedAt: Date;
    processingMethod: 'ocr' | 'manual' | 'hybrid';
  };
  workOrderNumber: string;
  partNumber: string;
  partDescription?: string;
  quantity: number;
  dueDate?: Date;
  priority?: string;
  operations: DigitizedOperationData[];
  extractedFrom?: {
    templateId: string;
    templateName: string;
    matchConfidence: number;
  };
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'work_order_created';
  reviewerNotes?: string;
  confidence: number;
  warnings?: string[];
  errors?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface ManualEntryRequest {
  workOrderNumber: string;
  partNumber: string;
  partDescription?: string;
  quantity: number;
  dueDate?: Date;
  priority?: string;
  operations: DigitizedOperationData[];
  sourceFileName?: string;
}

export interface TravelerReviewData {
  travelerId: string;
  approved: boolean;
  reviewerNotes?: string;
  corrections?: {
    fieldName: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface BatchProcessingConfig {
  fileNames: string[];
  templateIds?: string[];
  enableAutoApproval?: boolean;
  autoApprovalThreshold?: number; // Confidence threshold
}

export interface BatchProcessingResult {
  totalFiles: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  partialCount: number;
  travelersCreated: string[];
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

// ============================================================================
// Traveler Digitization Service Class
// ============================================================================

export class TravelerDigitizationService {
  private ocrService: OCRService;
  private templateMatcher: TemplateMatcher;
  private travelers: Map<string, DigitizedTravelerData> = new Map();
  private reviewQueue: Map<string, DigitizedTravelerData> = new Map();

  constructor(ocrConfig: OCRConfig) {
    this.ocrService = new OCRService(ocrConfig);
    this.templateMatcher = new TemplateMatcher();
  }

  /**
   * Register a template for template matching
   */
  registerTemplate(template: TravelerTemplate): void {
    try {
      this.templateMatcher.defineTemplate(template);
      logger.info('Template registered', { templateName: template.name });
    } catch (error) {
      logger.error('Failed to register template:', error);
      throw error;
    }
  }

  /**
   * Digitize a traveler from OCR document
   */
  async digitizeTraveler(
    imageBuffer: Buffer,
    fileName: string,
    templateIds?: string[]
  ): Promise<DigitizedTravelerData> {
    const travelerId = `traveler_${Date.now()}`;

    try {
      logger.info('Starting traveler digitization', { fileName, travelerId });

      // Process document with OCR
      const ocrResult = await this.ocrService.processDocument(imageBuffer, fileName);

      if (!ocrResult.success) {
        throw new Error(`OCR processing failed: ${ocrResult.errors.join(', ')}`);
      }

      // Match against templates
      const matchResult = this.templateMatcher.matchTemplate(ocrResult, templateIds);

      if (!matchResult.bestMatch) {
        throw new Error('No matching template found');
      }

      // Extract traveler data from matched template
      const travelerData = this.extractTravelerData(matchResult.bestMatch);

      const digitizedTraveler: DigitizedTravelerData = {
        id: travelerId,
        sourceDocument: {
          fileName,
          uploadedAt: new Date(),
          processingMethod: 'ocr'
        },
        workOrderNumber: travelerData.workOrderNumber,
        partNumber: travelerData.partNumber,
        partDescription: travelerData.partDescription,
        quantity: travelerData.quantity,
        dueDate: travelerData.dueDate,
        priority: travelerData.priority,
        operations: travelerData.operations,
        extractedFrom: {
          templateId: matchResult.bestMatch.templateId,
          templateName: matchResult.bestMatch.templateName,
          matchConfidence: matchResult.bestMatch.confidence
        },
        status: matchResult.bestMatch.confidence > 0.8 ? 'pending_review' : 'draft',
        confidence: matchResult.bestMatch.confidence,
        warnings: matchResult.warnings,
        errors: matchResult.errors,
        createdAt: new Date()
      };

      // Store traveler
      this.travelers.set(travelerId, digitizedTraveler);

      // Add to review queue
      this.reviewQueue.set(travelerId, digitizedTraveler);

      logger.info('Traveler digitized', {
        travelerId,
        workOrderNumber: digitizedTraveler.workOrderNumber,
        confidence: digitizedTraveler.confidence
      });

      return digitizedTraveler;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Traveler digitization failed:', error);

      const failedTraveler: DigitizedTravelerData = {
        id: travelerId,
        sourceDocument: {
          fileName,
          uploadedAt: new Date(),
          processingMethod: 'ocr'
        },
        workOrderNumber: '',
        partNumber: '',
        quantity: 0,
        operations: [],
        status: 'draft',
        confidence: 0,
        errors: [errorMsg],
        createdAt: new Date()
      };

      this.travelers.set(travelerId, failedTraveler);
      return failedTraveler;
    }
  }

  /**
   * Create traveler from manual entry
   */
  async createManualEntry(request: ManualEntryRequest): Promise<DigitizedTravelerData> {
    const travelerId = `traveler_${Date.now()}`;

    try {
      logger.info('Creating manual traveler entry', { workOrderNumber: request.workOrderNumber });

      const traveler: DigitizedTravelerData = {
        id: travelerId,
        sourceDocument: request.sourceFileName
          ? {
              fileName: request.sourceFileName,
              uploadedAt: new Date(),
              processingMethod: 'manual'
            }
          : undefined,
        workOrderNumber: request.workOrderNumber,
        partNumber: request.partNumber,
        partDescription: request.partDescription,
        quantity: request.quantity,
        dueDate: request.dueDate,
        priority: request.priority,
        operations: request.operations,
        status: 'pending_review',
        confidence: 1.0, // Manual entry has 100% confidence
        createdAt: new Date()
      };

      this.travelers.set(travelerId, traveler);
      this.reviewQueue.set(travelerId, traveler);

      logger.info('Manual traveler entry created', { travelerId });

      return traveler;
    } catch (error) {
      logger.error('Failed to create manual traveler entry:', error);
      throw error;
    }
  }

  /**
   * Update traveler data
   */
  async updateTraveler(travelerId: string, updates: Partial<DigitizedTravelerData>): Promise<DigitizedTravelerData> {
    try {
      const traveler = this.travelers.get(travelerId);
      if (!traveler) {
        throw new Error(`Traveler not found: ${travelerId}`);
      }

      const updated: DigitizedTravelerData = {
        ...traveler,
        ...updates,
        id: travelerId,
        updatedAt: new Date()
      };

      this.travelers.set(travelerId, updated);

      // Update in review queue if it's there
      if (this.reviewQueue.has(travelerId)) {
        this.reviewQueue.set(travelerId, updated);
      }

      logger.info('Traveler updated', { travelerId });

      return updated;
    } catch (error) {
      logger.error('Failed to update traveler:', error);
      throw error;
    }
  }

  /**
   * Submit traveler for review
   */
  async submitForReview(travelerId: string): Promise<DigitizedTravelerData> {
    try {
      const traveler = this.travelers.get(travelerId);
      if (!traveler) {
        throw new Error(`Traveler not found: ${travelerId}`);
      }

      if (traveler.status !== 'draft') {
        throw new Error(`Traveler status must be 'draft' to submit for review`);
      }

      const updated = await this.updateTraveler(travelerId, {
        status: 'pending_review'
      });

      logger.info('Traveler submitted for review', { travelerId });

      return updated;
    } catch (error) {
      logger.error('Failed to submit traveler for review:', error);
      throw error;
    }
  }

  /**
   * Approve traveler for work order creation
   */
  async approveTraveler(travelerId: string, reviewData: TravelerReviewData): Promise<DigitizedTravelerData> {
    try {
      const traveler = this.travelers.get(travelerId);
      if (!traveler) {
        throw new Error(`Traveler not found: ${travelerId}`);
      }

      let updated = traveler;

      // Apply corrections if any
      if (reviewData.corrections && reviewData.corrections.length > 0) {
        for (const correction of reviewData.corrections) {
          const fieldPath = correction.fieldName.split('.');
          if (fieldPath.length === 1) {
            // Top-level field
            (updated as any)[fieldPath[0]] = correction.newValue;
          } else if (fieldPath[0] === 'operations' && !isNaN(Number(fieldPath[1]))) {
            // Operation field
            const opIndex = Number(fieldPath[1]);
            const fieldName = fieldPath[2];
            if (updated.operations[opIndex]) {
              (updated.operations[opIndex] as any)[fieldName] = correction.newValue;
            }
          }
        }
      }

      updated = await this.updateTraveler(travelerId, {
        ...updated,
        status: reviewData.approved ? 'approved' : 'rejected',
        reviewerNotes: reviewData.reviewerNotes,
        reviewedAt: new Date()
      });

      // Remove from review queue
      this.reviewQueue.delete(travelerId);

      logger.info('Traveler approved', {
        travelerId,
        approved: reviewData.approved
      });

      return updated;
    } catch (error) {
      logger.error('Failed to approve traveler:', error);
      throw error;
    }
  }

  /**
   * Create work order from approved traveler
   */
  async createWorkOrderFromTraveler(travelerId: string): Promise<any> {
    try {
      const traveler = this.travelers.get(travelerId);
      if (!traveler) {
        throw new Error(`Traveler not found: ${travelerId}`);
      }

      if (traveler.status !== 'approved') {
        throw new Error('Traveler must be approved before creating work order');
      }

      // This would integrate with the work order service
      // For now, just mark the traveler as work order created
      const updated = await this.updateTraveler(travelerId, {
        status: 'work_order_created'
      });

      logger.info('Work order created from traveler', { travelerId });

      return {
        travelerId,
        workOrderId: `wo_${Date.now()}`,
        workOrderNumber: traveler.workOrderNumber,
        partNumber: traveler.partNumber,
        quantity: traveler.quantity
      };
    } catch (error) {
      logger.error('Failed to create work order:', error);
      throw error;
    }
  }

  /**
   * Get traveler by ID
   */
  getTraveler(travelerId: string): DigitizedTravelerData | undefined {
    return this.travelers.get(travelerId);
  }

  /**
   * Get all travelers
   */
  getAllTravelers(): DigitizedTravelerData[] {
    return Array.from(this.travelers.values());
  }

  /**
   * Get review queue
   */
  getReviewQueue(): DigitizedTravelerData[] {
    return Array.from(this.reviewQueue.values());
  }

  /**
   * Process batch of documents
   */
  async processBatch(config: BatchProcessingConfig): Promise<BatchProcessingResult> {
    const result: BatchProcessingResult = {
      totalFiles: config.fileNames.length,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      partialCount: 0,
      travelersCreated: [],
      errors: [],
      startedAt: new Date()
    };

    try {
      logger.info('Starting batch processing', {
        fileCount: config.fileNames.length
      });

      for (const fileName of config.fileNames) {
        try {
          // In production, would read actual file
          // For now, create a stub for testing
          const imageBuffer = Buffer.from('stub_image_data');

          const traveler = await this.digitizeTraveler(imageBuffer, fileName, config.templateIds);

          result.processedCount++;

          if (traveler.errors && traveler.errors.length > 0) {
            result.failureCount++;
          } else if (traveler.warnings && traveler.warnings.length > 0) {
            result.partialCount++;
          } else {
            result.successCount++;
          }

          if (traveler.id) {
            result.travelersCreated.push(traveler.id);

            // Auto-approve if enabled and confidence is high
            if (
              config.enableAutoApproval &&
              traveler.confidence >= (config.autoApprovalThreshold || 0.9)
            ) {
              await this.approveTraveler(traveler.id, {
                travelerId: traveler.id,
                approved: true,
                reviewerNotes: 'Auto-approved by batch process'
              });
            }
          }
        } catch (error) {
          result.failureCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`${fileName}: ${errorMsg}`);
          logger.error(`Failed to process file: ${fileName}`, error);
        }
      }

      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - result.startedAt.getTime();

      logger.info('Batch processing completed', {
        processed: result.processedCount,
        success: result.successCount,
        failure: result.failureCount,
        partial: result.partialCount,
        duration: result.duration
      });

      return result;
    } catch (error) {
      logger.error('Batch processing error:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * Extract traveler data from template match
   */
  private extractTravelerData(matchResult: any): Partial<DigitizedTravelerData> {
    const travelerData: Partial<DigitizedTravelerData> = {
      workOrderNumber: '',
      partNumber: '',
      quantity: 0,
      operations: []
    };

    // Map extracted fields to traveler data
    for (const field of matchResult.extractedFields) {
      switch (field.fieldName.toLowerCase()) {
        case 'work_order_number':
        case 'wo_number':
          travelerData.workOrderNumber = field.value;
          break;

        case 'part_number':
        case 'part_no':
          travelerData.partNumber = field.value;
          break;

        case 'part_description':
        case 'description':
          travelerData.partDescription = field.value;
          break;

        case 'quantity':
        case 'qty':
          travelerData.quantity = Number(field.value);
          break;

        case 'due_date':
          travelerData.dueDate = new Date(field.value);
          break;

        case 'priority':
          travelerData.priority = field.value;
          break;
      }
    }

    return travelerData;
  }
}

export default TravelerDigitizationService;
