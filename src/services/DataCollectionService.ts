/**
 * Data Collection Service (Issue #45 - Phase 2)
 * Manages data collection forms and submissions for shop floor operations
 */

import { prisma } from '../db/client';
import { Logger } from '../utils/logger';
import { z } from 'zod';

const logger = Logger.getInstance();

// ============================================================================
// Type Definitions & Interfaces
// ============================================================================

export interface DataCollectionFieldDefinition {
  id: string;
  fieldName: string;
  displayLabel: string;
  dataType: 'NUMBER' | 'TEXT' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT' | 'DATE' | 'TIME' | 'DATETIME' | 'FILE' | 'SIGNATURE' | 'TEXTAREA';
  required: boolean;
  displayOrder: number;

  // Validation rules
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: string;
    allowedValues?: string[];
    minLength?: number;
    maxLength?: number;
  };

  // Conditional display
  conditionalOn?: {
    fieldId: string;
    condition: string; // e.g., "value > 50" or "value == 'YES'"
  };

  // UI hints
  placeholder?: string;
  helpText?: string;
  unitOfMeasure?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: string }>;
}

export interface DataCollectionFormDTO {
  id: string;
  routingOperationId: string;
  formName: string;
  description?: string;
  version: string;
  fields: DataCollectionFieldDefinition[];
  requiredForCompletion: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}

export interface DataCollectionSubmissionDTO {
  id: string;
  workOrderOperationId: string;
  formId: string;
  data: Record<string, any>;
  validationStatus: string;
  validationErrors?: any[];
  submittedBy: string;
  submittedAt: Date;
  deviceInfo?: string;
  locationCode?: string;
  offlineSubmitted: boolean;
  syncedAt?: Date;
  syncStatus: string;
}

export interface ValidationError {
  fieldId: string;
  fieldName: string;
  error: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// ============================================================================
// Data Collection Service
// ============================================================================

export class DataCollectionService {
  /**
   * Get all data collection forms for a routing operation
   */
  async getDataCollectionForms(routingOperationId: string): Promise<DataCollectionFormDTO[]> {
    try {
      const forms = await prisma.dataCollectionForm.findMany({
        where: {
          routingOperationId,
          isActive: true,
        },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      });

      return forms.map((form) => this.mapFormToDTO(form));
    } catch (error) {
      logger.error(`Error getting data collection forms for operation ${routingOperationId}`, error);
      throw error;
    }
  }

  /**
   * Get a specific data collection form
   */
  async getDataCollectionForm(formId: string): Promise<DataCollectionFormDTO | null> {
    try {
      const form = await prisma.dataCollectionForm.findUnique({
        where: { id: formId },
      });

      return form ? this.mapFormToDTO(form) : null;
    } catch (error) {
      logger.error(`Error getting data collection form ${formId}`, error);
      throw error;
    }
  }

  /**
   * Create a new data collection form
   */
  async createDataCollectionForm(
    routingOperationId: string,
    formName: string,
    fields: DataCollectionFieldDefinition[],
    createdById: string,
    options?: {
      description?: string;
      requiredForCompletion?: boolean;
      displayOrder?: number;
    }
  ): Promise<DataCollectionFormDTO> {
    try {
      // Validate that routing operation exists
      const routingOp = await prisma.routingOperation.findUnique({
        where: { id: routingOperationId },
      });

      if (!routingOp) {
        throw new Error(`Routing operation ${routingOperationId} not found`);
      }

      // Validate fields
      this.validateFieldDefinitions(fields);

      // Check for unique form name per operation
      const existingForm = await prisma.dataCollectionForm.findFirst({
        where: {
          routingOperationId,
          formName,
        },
      });

      if (existingForm) {
        throw new Error(
          `A form named "${formName}" already exists for this routing operation`
        );
      }

      const form = await prisma.dataCollectionForm.create({
        data: {
          routingOperationId,
          formName,
          description: options?.description,
          fields: fields,
          requiredForCompletion: options?.requiredForCompletion ?? false,
          displayOrder: options?.displayOrder ?? 0,
          createdById,
        },
      });

      logger.info(`Created data collection form ${form.id} for operation ${routingOperationId}`);
      return this.mapFormToDTO(form);
    } catch (error) {
      logger.error('Error creating data collection form', error);
      throw error;
    }
  }

  /**
   * Update a data collection form
   */
  async updateDataCollectionForm(
    formId: string,
    updates: {
      formName?: string;
      description?: string;
      fields?: DataCollectionFieldDefinition[];
      requiredForCompletion?: boolean;
      displayOrder?: number;
      isActive?: boolean;
    }
  ): Promise<DataCollectionFormDTO> {
    try {
      const form = await prisma.dataCollectionForm.findUnique({
        where: { id: formId },
      });

      if (!form) {
        throw new Error(`Data collection form ${formId} not found`);
      }

      // Validate fields if provided
      if (updates.fields) {
        this.validateFieldDefinitions(updates.fields);
      }

      const updatedForm = await prisma.dataCollectionForm.update({
        where: { id: formId },
        data: {
          formName: updates.formName,
          description: updates.description,
          fields: updates.fields,
          requiredForCompletion: updates.requiredForCompletion,
          displayOrder: updates.displayOrder,
          isActive: updates.isActive,
        },
      });

      logger.info(`Updated data collection form ${formId}`);
      return this.mapFormToDTO(updatedForm);
    } catch (error) {
      logger.error(`Error updating data collection form ${formId}`, error);
      throw error;
    }
  }

  /**
   * Submit collected data
   */
  async submitDataCollection(
    workOrderOperationId: string,
    formId: string,
    data: Record<string, any>,
    submittedBy: string,
    options?: {
      deviceInfo?: string;
      locationCode?: string;
      notes?: string;
      offlineSubmitted?: boolean;
    }
  ): Promise<DataCollectionSubmissionDTO> {
    try {
      // Validate form exists
      const form = await this.getDataCollectionForm(formId);
      if (!form) {
        throw new Error(`Data collection form ${formId} not found`);
      }

      // Validate operation exists
      const operation = await prisma.workOrderOperation.findUnique({
        where: { id: workOrderOperationId },
      });

      if (!operation) {
        throw new Error(`Work order operation ${workOrderOperationId} not found`);
      }

      // Validate collected data
      const validationResult = await this.validateDataCollection(formId, data);

      const submission = await prisma.dataCollectionSubmission.create({
        data: {
          workOrderOperationId,
          formId,
          data,
          validationStatus: validationResult.valid ? 'VALID' : 'INVALID',
          validationErrors: validationResult.valid ? null : validationResult.errors,
          submittedBy,
          submittedAt: new Date(),
          deviceInfo: options?.deviceInfo,
          locationCode: options?.locationCode,
          notes: options?.notes,
          offlineSubmitted: options?.offlineSubmitted ?? false,
          syncStatus: 'SYNCED',
        },
      });

      logger.info(
        `Created data collection submission ${submission.id} for operation ${workOrderOperationId}`
      );

      return this.mapSubmissionToDTO(submission);
    } catch (error) {
      logger.error(
        `Error submitting data collection for operation ${workOrderOperationId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Validate collected data against form schema
   */
  async validateDataCollection(
    formId: string,
    data: Record<string, any>
  ): Promise<ValidationResult> {
    try {
      const form = await this.getDataCollectionForm(formId);
      if (!form) {
        throw new Error(`Data collection form ${formId} not found`);
      }

      const errors: ValidationError[] = [];
      const warnings: string[] = [];

      // Check each field
      for (const field of form.fields) {
        const value = data[field.id];

        // Check required fields
        if (field.required && (value === undefined || value === null || value === '')) {
          errors.push({
            fieldId: field.id,
            fieldName: field.displayLabel,
            error: `${field.displayLabel} is required`,
          });
          continue;
        }

        // Skip validation for empty optional fields
        if (!field.required && (value === undefined || value === null || value === '')) {
          continue;
        }

        // Type-specific validation
        const typeError = this.validateFieldValue(field, value);
        if (typeError) {
          errors.push({
            fieldId: field.id,
            fieldName: field.displayLabel,
            error: typeError,
          });
          continue;
        }

        // Rule-based validation
        if (field.validationRules) {
          const ruleError = this.validateFieldRules(field, value);
          if (ruleError) {
            errors.push({
              fieldId: field.id,
              fieldName: field.displayLabel,
              error: ruleError,
            });
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error(`Error validating data collection for form ${formId}`, error);
      throw error;
    }
  }

  /**
   * Get submission history for an operation
   */
  async getSubmissionHistory(
    workOrderOperationId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    submissions: DataCollectionSubmissionDTO[];
    total: number;
  }> {
    try {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;

      const [submissions, total] = await Promise.all([
        prisma.dataCollectionSubmission.findMany({
          where: { workOrderOperationId },
          orderBy: { submittedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.dataCollectionSubmission.count({
          where: { workOrderOperationId },
        }),
      ]);

      return {
        submissions: submissions.map((s) => this.mapSubmissionToDTO(s)),
        total,
      };
    } catch (error) {
      logger.error(
        `Error getting submission history for operation ${workOrderOperationId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get pending offline submissions for sync
   */
  async getPendingOfflineSubmissions(limit: number = 100): Promise<DataCollectionSubmissionDTO[]> {
    try {
      const submissions = await prisma.dataCollectionSubmission.findMany({
        where: {
          offlineSubmitted: true,
          syncStatus: 'PENDING',
        },
        orderBy: { submittedAt: 'asc' },
        take: limit,
      });

      return submissions.map((s) => this.mapSubmissionToDTO(s));
    } catch (error) {
      logger.error('Error getting pending offline submissions', error);
      throw error;
    }
  }

  /**
   * Mark submission as synced
   */
  async markSubmissionSynced(submissionId: string): Promise<void> {
    try {
      await prisma.dataCollectionSubmission.update({
        where: { id: submissionId },
        data: {
          syncStatus: 'SYNCED',
          syncedAt: new Date(),
        },
      });

      logger.info(`Marked submission ${submissionId} as synced`);
    } catch (error) {
      logger.error(`Error marking submission ${submissionId} as synced`, error);
      throw error;
    }
  }

  /**
   * Track work instruction view
   */
  async trackWorkInstructionView(
    workInstructionId: string,
    viewedBy: string,
    options?: {
      workOrderOperationId?: string;
      viewDuration?: number;
      stepsViewed?: number[];
      deviceType?: string;
      deviceId?: string;
    }
  ): Promise<void> {
    try {
      await prisma.workInstructionView.create({
        data: {
          workInstructionId,
          workOrderOperationId: options?.workOrderOperationId,
          viewedBy,
          viewedAt: new Date(),
          viewDuration: options?.viewDuration,
          stepsViewed: options?.stepsViewed,
          deviceType: options?.deviceType,
          deviceId: options?.deviceId,
        },
      });

      logger.info(
        `Tracked view of work instruction ${workInstructionId} by user ${viewedBy}`
      );
    } catch (error) {
      logger.error(
        `Error tracking work instruction view for ${workInstructionId}`,
        error
      );
      // Don't throw - this is non-critical analytics
    }
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private mapFormToDTO(form: any): DataCollectionFormDTO {
    return {
      id: form.id,
      routingOperationId: form.routingOperationId,
      formName: form.formName,
      description: form.description,
      version: form.version,
      fields: form.fields || [],
      requiredForCompletion: form.requiredForCompletion,
      displayOrder: form.displayOrder,
      isActive: form.isActive,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      createdById: form.createdById,
    };
  }

  private mapSubmissionToDTO(submission: any): DataCollectionSubmissionDTO {
    return {
      id: submission.id,
      workOrderOperationId: submission.workOrderOperationId,
      formId: submission.formId,
      data: submission.data || {},
      validationStatus: submission.validationStatus,
      validationErrors: submission.validationErrors,
      submittedBy: submission.submittedBy,
      submittedAt: submission.submittedAt,
      deviceInfo: submission.deviceInfo,
      locationCode: submission.locationCode,
      offlineSubmitted: submission.offlineSubmitted,
      syncedAt: submission.syncedAt,
      syncStatus: submission.syncStatus,
    };
  }

  private validateFieldDefinitions(fields: DataCollectionFieldDefinition[]): void {
    // Check for unique field IDs
    const ids = new Set<string>();
    for (const field of fields) {
      if (ids.has(field.id)) {
        throw new Error(`Duplicate field ID: ${field.id}`);
      }
      ids.add(field.id);
    }

    // Check for valid field types
    const validTypes = [
      'NUMBER',
      'TEXT',
      'BOOLEAN',
      'SELECT',
      'MULTISELECT',
      'DATE',
      'TIME',
      'DATETIME',
      'FILE',
      'SIGNATURE',
      'TEXTAREA',
    ];

    for (const field of fields) {
      if (!validTypes.includes(field.dataType)) {
        throw new Error(`Invalid field type: ${field.dataType}`);
      }
    }
  }

  private validateFieldValue(field: DataCollectionFieldDefinition, value: any): string | null {
    switch (field.dataType) {
      case 'NUMBER':
        if (typeof value !== 'number') {
          return `${field.displayLabel} must be a number`;
        }
        break;

      case 'TEXT':
      case 'TEXTAREA':
        if (typeof value !== 'string') {
          return `${field.displayLabel} must be text`;
        }
        break;

      case 'BOOLEAN':
        if (typeof value !== 'boolean') {
          return `${field.displayLabel} must be a boolean`;
        }
        break;

      case 'SELECT':
        if (typeof value !== 'string') {
          return `${field.displayLabel} must be a string`;
        }
        break;

      case 'MULTISELECT':
        if (!Array.isArray(value)) {
          return `${field.displayLabel} must be an array`;
        }
        break;

      case 'DATE':
        if (!(value instanceof Date) && typeof value !== 'string') {
          return `${field.displayLabel} must be a valid date`;
        }
        break;

      case 'TIME':
      case 'DATETIME':
        if (!(value instanceof Date) && typeof value !== 'string') {
          return `${field.displayLabel} must be a valid datetime`;
        }
        break;

      case 'FILE':
        if (typeof value !== 'string') {
          return `${field.displayLabel} must be a file URL`;
        }
        break;

      case 'SIGNATURE':
        if (typeof value !== 'string') {
          return `${field.displayLabel} must be a signature`;
        }
        break;
    }

    return null;
  }

  private validateFieldRules(
    field: DataCollectionFieldDefinition,
    value: any
  ): string | null {
    const rules = field.validationRules;
    if (!rules) return null;

    // Min/Max validation for numbers
    if (field.dataType === 'NUMBER') {
      if (rules.min !== undefined && value < rules.min) {
        return `${field.displayLabel} must be at least ${rules.min}`;
      }
      if (rules.max !== undefined && value > rules.max) {
        return `${field.displayLabel} must be at most ${rules.max}`;
      }
    }

    // Length validation for text
    if (field.dataType === 'TEXT' || field.dataType === 'TEXTAREA') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        return `${field.displayLabel} must be at least ${rules.minLength} characters`;
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        return `${field.displayLabel} must be at most ${rules.maxLength} characters`;
      }
    }

    // Pattern validation
    if (rules.pattern) {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        return `${field.displayLabel} format is invalid`;
      }
    }

    // Allowed values validation
    if (rules.allowedValues && Array.isArray(rules.allowedValues)) {
      if (!rules.allowedValues.includes(value)) {
        return `${field.displayLabel} value is not allowed`;
      }
    }

    return null;
  }
}

export default new DataCollectionService();
