import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Data collection field types
export type FieldType =
  | 'text'
  | 'number'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'image'
  | 'signature'
  | 'barcode'
  | 'qrcode'
  | 'measurement'
  | 'temperature'
  | 'pressure'
  | 'weight'
  | 'dimension';

// Validation rule types
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'range' | 'custom';
  value?: any;
  message?: string;
  customFunction?: string;
}

// Field template interface
export interface DataCollectionFieldTemplate {
  id: string;
  name: string;
  description?: string;
  fieldType: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  isRequired: boolean;
  validationRules: ValidationRule[];
  options?: FieldOption[];
  styling?: FieldStyling;
  metadata?: Record<string, any>;
  category?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
  isDefault?: boolean;
}

export interface FieldStyling {
  width?: 'auto' | 'small' | 'medium' | 'large' | 'full';
  alignment?: 'left' | 'center' | 'right';
  inputStyle?: Record<string, any>;
  labelStyle?: Record<string, any>;
  containerStyle?: Record<string, any>;
  theme?: 'default' | 'compact' | 'spacious';
}

export interface FieldTemplateCreateInput {
  name: string;
  description?: string;
  fieldType: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  isRequired?: boolean;
  validationRules?: ValidationRule[];
  options?: FieldOption[];
  styling?: FieldStyling;
  metadata?: Record<string, any>;
  category?: string;
  tags?: string[];
}

export interface FieldTemplateUpdateInput {
  name?: string;
  description?: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  isRequired?: boolean;
  validationRules?: ValidationRule[];
  options?: FieldOption[];
  styling?: FieldStyling;
  metadata?: Record<string, any>;
  category?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface FieldTemplateSearchFilters {
  fieldType?: FieldType | FieldType[];
  category?: string;
  tags?: string[];
  isActive?: boolean;
  isRequired?: boolean;
  search?: string;
}

/**
 * ✅ GITHUB ISSUE #18 - Phase 3: DataCollectionFieldTemplateService
 *
 * Service for managing data collection field templates.
 * Provides CRUD operations, template library management, and field validation.
 */
export class DataCollectionFieldTemplateService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new data collection field template
   */
  async createFieldTemplate(input: FieldTemplateCreateInput): Promise<DataCollectionFieldTemplate> {
    try {
      logger.info(`Creating new data collection field template: ${input.name}`);

      const template = await this.prisma.dataCollectionFieldTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          fieldType: input.fieldType,
          label: input.label,
          placeholder: input.placeholder,
          helpText: input.helpText,
          defaultValue: input.defaultValue,
          isRequired: input.isRequired || false,
          validationRules: input.validationRules || [],
          options: input.options || [],
          styling: input.styling || {},
          metadata: input.metadata || {},
          category: input.category,
          tags: input.tags || [],
          isActive: true
        }
      });

      logger.info(`Successfully created field template: ${template.id}`);
      return this.mapToFieldTemplate(template);
    } catch (error: any) {
      logger.error('Failed to create field template:', {
        error: error?.message || 'Unknown error',
        input: input
      });
      throw new Error(`Failed to create field template: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get field template by ID
   */
  async getFieldTemplate(id: string): Promise<DataCollectionFieldTemplate | null> {
    try {
      logger.debug(`Fetching field template: ${id}`);

      const template = await this.prisma.dataCollectionFieldTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        logger.warn(`Field template not found: ${id}`);
        return null;
      }

      return this.mapToFieldTemplate(template);
    } catch (error: any) {
      logger.error('Failed to fetch field template:', {
        error: error?.message || 'Unknown error',
        templateId: id
      });
      throw new Error(`Failed to fetch field template: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Search and filter field templates
   */
  async searchFieldTemplates(
    filters: FieldTemplateSearchFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ templates: DataCollectionFieldTemplate[]; total: number }> {
    try {
      logger.debug('Searching field templates with filters:', filters);

      const where: any = {};

      // Apply filters
      if (filters.fieldType) {
        if (Array.isArray(filters.fieldType)) {
          where.fieldType = { in: filters.fieldType };
        } else {
          where.fieldType = filters.fieldType;
        }
      }

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.isRequired !== undefined) {
        where.isRequired = filters.isRequired;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { label: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const [templates, total] = await Promise.all([
        this.prisma.dataCollectionFieldTemplate.findMany({
          where,
          orderBy: [
            { category: 'asc' },
            { name: 'asc' }
          ],
          take: limit,
          skip: offset
        }),
        this.prisma.dataCollectionFieldTemplate.count({ where })
      ]);

      return {
        templates: templates.map(template => this.mapToFieldTemplate(template)),
        total
      };
    } catch (error: any) {
      logger.error('Failed to search field templates:', {
        error: error?.message || 'Unknown error',
        filters: filters
      });
      throw new Error(`Failed to search field templates: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get field templates by category
   */
  async getFieldTemplatesByCategory(): Promise<Record<string, DataCollectionFieldTemplate[]>> {
    try {
      logger.debug('Fetching field templates grouped by category');

      const templates = await this.prisma.dataCollectionFieldTemplate.findMany({
        where: { isActive: true },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      const grouped: Record<string, DataCollectionFieldTemplate[]> = {};

      templates.forEach(template => {
        const category = template.category || 'Uncategorized';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(this.mapToFieldTemplate(template));
      });

      return grouped;
    } catch (error: any) {
      logger.error('Failed to get field templates by category:', {
        error: error?.message || 'Unknown error'
      });
      throw new Error(`Failed to get field templates by category: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update an existing field template
   */
  async updateFieldTemplate(id: string, input: FieldTemplateUpdateInput): Promise<DataCollectionFieldTemplate> {
    try {
      logger.info(`Updating field template: ${id}`);

      // Check if template exists
      const existingTemplate = await this.prisma.dataCollectionFieldTemplate.findUnique({
        where: { id }
      });

      if (!existingTemplate) {
        throw new Error(`Field template not found: ${id}`);
      }

      const template = await this.prisma.dataCollectionFieldTemplate.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          label: input.label,
          placeholder: input.placeholder,
          helpText: input.helpText,
          defaultValue: input.defaultValue,
          isRequired: input.isRequired,
          validationRules: input.validationRules,
          options: input.options,
          styling: input.styling,
          metadata: input.metadata,
          category: input.category,
          tags: input.tags,
          isActive: input.isActive
        }
      });

      logger.info(`Successfully updated field template: ${id}`);
      return this.mapToFieldTemplate(template);
    } catch (error: any) {
      logger.error('Failed to update field template:', {
        error: error?.message || 'Unknown error',
        templateId: id,
        input: input
      });
      throw new Error(`Failed to update field template: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a field template (soft delete by setting isActive to false)
   */
  async deleteFieldTemplate(id: string, hardDelete: boolean = false): Promise<void> {
    try {
      logger.info(`Deleting field template: ${id} (hard: ${hardDelete})`);

      const template = await this.prisma.dataCollectionFieldTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        throw new Error(`Field template not found: ${id}`);
      }

      if (hardDelete) {
        await this.prisma.dataCollectionFieldTemplate.delete({
          where: { id }
        });
      } else {
        await this.prisma.dataCollectionFieldTemplate.update({
          where: { id },
          data: { isActive: false }
        });
      }

      logger.info(`Successfully deleted field template: ${id}`);
    } catch (error: any) {
      logger.error('Failed to delete field template:', {
        error: error?.message || 'Unknown error',
        templateId: id,
        hardDelete: hardDelete
      });
      throw new Error(`Failed to delete field template: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Duplicate an existing field template
   */
  async duplicateFieldTemplate(id: string, newName?: string): Promise<DataCollectionFieldTemplate> {
    try {
      logger.info(`Duplicating field template: ${id}`);

      const originalTemplate = await this.getFieldTemplate(id);
      if (!originalTemplate) {
        throw new Error(`Field template not found: ${id}`);
      }

      const duplicatedTemplate = await this.createFieldTemplate({
        name: newName || `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        fieldType: originalTemplate.fieldType,
        label: originalTemplate.label,
        placeholder: originalTemplate.placeholder,
        helpText: originalTemplate.helpText,
        defaultValue: originalTemplate.defaultValue,
        isRequired: originalTemplate.isRequired,
        validationRules: originalTemplate.validationRules,
        options: originalTemplate.options,
        styling: originalTemplate.styling,
        metadata: originalTemplate.metadata,
        category: originalTemplate.category,
        tags: originalTemplate.tags
      });

      logger.info(`Successfully duplicated field template: ${duplicatedTemplate.id}`);
      return duplicatedTemplate;
    } catch (error: any) {
      logger.error('Failed to duplicate field template:', {
        error: error?.message || 'Unknown error',
        templateId: id
      });
      throw new Error(`Failed to duplicate field template: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Validate field value against template rules
   */
  validateFieldValue(template: DataCollectionFieldTemplate, value: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Required validation
      if (template.isRequired && (value === null || value === undefined || value === '')) {
        errors.push(`${template.label} is required`);
      }

      // Skip further validation if value is empty and not required
      if (!template.isRequired && (value === null || value === undefined || value === '')) {
        return { isValid: true, errors: [] };
      }

      // Type-specific validation
      switch (template.fieldType) {
        case 'number':
        case 'decimal':
          if (isNaN(Number(value))) {
            errors.push(`${template.label} must be a valid number`);
          }
          break;

        case 'date':
        case 'datetime':
        case 'time':
          if (!this.isValidDate(value)) {
            errors.push(`${template.label} must be a valid date`);
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${template.label} must be true or false`);
          }
          break;

        case 'select':
        case 'radio':
          if (template.options && !template.options.some(option => option.value === value)) {
            errors.push(`${template.label} must be one of the available options`);
          }
          break;

        case 'multiselect':
        case 'checkbox':
          if (Array.isArray(value) && template.options) {
            const validValues = template.options.map(option => option.value);
            const invalidValues = value.filter(v => !validValues.includes(v));
            if (invalidValues.length > 0) {
              errors.push(`${template.label} contains invalid options: ${invalidValues.join(', ')}`);
            }
          }
          break;
      }

      // Apply validation rules
      for (const rule of template.validationRules) {
        const ruleErrors = this.validateRule(template.label, value, rule);
        errors.push(...ruleErrors);
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error: any) {
      logger.error('Error during field validation:', {
        error: error?.message || 'Unknown error',
        templateId: template.id,
        value: value
      });
      return {
        isValid: false,
        errors: [`Validation error for ${template.label}`]
      };
    }
  }

  /**
   * Create built-in field templates for common use cases
   */
  async createBuiltInTemplates(): Promise<void> {
    try {
      logger.info('Creating built-in field templates');

      const builtInTemplates: FieldTemplateCreateInput[] = [
        // Basic text fields
        {
          name: 'Standard Text Input',
          description: 'Basic text input field',
          fieldType: 'text',
          label: 'Text Input',
          category: 'Basic',
          tags: ['basic', 'text', 'input']
        },
        {
          name: 'Employee ID',
          description: 'Employee identification number',
          fieldType: 'text',
          label: 'Employee ID',
          placeholder: 'Enter employee ID',
          isRequired: true,
          validationRules: [
            { type: 'pattern', value: '^[A-Z0-9]{6,12}$', message: 'Employee ID must be 6-12 alphanumeric characters' }
          ],
          category: 'Identification',
          tags: ['employee', 'id', 'required']
        },

        // Quality measurements
        {
          name: 'Temperature Reading',
          description: 'Temperature measurement with validation',
          fieldType: 'temperature',
          label: 'Temperature (°C)',
          placeholder: 'Enter temperature',
          isRequired: true,
          validationRules: [
            { type: 'range', value: { min: -50, max: 200 }, message: 'Temperature must be between -50°C and 200°C' }
          ],
          category: 'Quality',
          tags: ['temperature', 'measurement', 'quality']
        },
        {
          name: 'Dimension Measurement',
          description: 'Physical dimension measurement',
          fieldType: 'dimension',
          label: 'Dimension (mm)',
          placeholder: 'Enter dimension',
          isRequired: true,
          validationRules: [
            { type: 'min', value: 0, message: 'Dimension must be positive' }
          ],
          category: 'Quality',
          tags: ['dimension', 'measurement', 'quality']
        },

        // Approval and sign-off
        {
          name: 'Quality Approval',
          description: 'Quality inspector approval',
          fieldType: 'select',
          label: 'Quality Status',
          isRequired: true,
          options: [
            { value: 'approved', label: 'Approved', isDefault: false },
            { value: 'rejected', label: 'Rejected', isDefault: false },
            { value: 'requires_review', label: 'Requires Review', isDefault: true }
          ],
          category: 'Approval',
          tags: ['quality', 'approval', 'status']
        },
        {
          name: 'Digital Signature',
          description: 'Digital signature capture',
          fieldType: 'signature',
          label: 'Signature',
          isRequired: true,
          helpText: 'Please sign to confirm completion',
          category: 'Approval',
          tags: ['signature', 'approval', 'confirmation']
        },

        // Data collection
        {
          name: 'Batch Number',
          description: 'Production batch identification',
          fieldType: 'text',
          label: 'Batch Number',
          placeholder: 'Enter batch number',
          isRequired: true,
          validationRules: [
            { type: 'pattern', value: '^[A-Z]{2}\\d{6}$', message: 'Batch number must be 2 letters followed by 6 digits' }
          ],
          category: 'Production',
          tags: ['batch', 'production', 'tracking']
        },
        {
          name: 'Defect Count',
          description: 'Number of defects found',
          fieldType: 'number',
          label: 'Defect Count',
          defaultValue: 0,
          validationRules: [
            { type: 'min', value: 0, message: 'Defect count cannot be negative' }
          ],
          category: 'Quality',
          tags: ['defects', 'quality', 'count']
        },

        // Documentation
        {
          name: 'Photo Evidence',
          description: 'Photo documentation',
          fieldType: 'image',
          label: 'Photo',
          helpText: 'Take a photo for documentation',
          category: 'Documentation',
          tags: ['photo', 'documentation', 'evidence']
        },
        {
          name: 'Notes',
          description: 'Additional notes or comments',
          fieldType: 'text',
          label: 'Notes',
          placeholder: 'Enter any additional notes...',
          styling: { width: 'full' },
          category: 'Documentation',
          tags: ['notes', 'comments', 'documentation']
        }
      ];

      for (const templateInput of builtInTemplates) {
        // Check if template already exists
        const existing = await this.prisma.dataCollectionFieldTemplate.findFirst({
          where: { name: templateInput.name }
        });

        if (!existing) {
          await this.createFieldTemplate(templateInput);
          logger.debug(`Created built-in template: ${templateInput.name}`);
        }
      }

      logger.info('Successfully created built-in field templates');
    } catch (error: any) {
      logger.error('Failed to create built-in templates:', {
        error: error?.message || 'Unknown error'
      });
      // Don't throw - this is initialization, continue even if it fails
    }
  }

  /**
   * Map database record to DataCollectionFieldTemplate interface
   */
  private mapToFieldTemplate(dbTemplate: any): DataCollectionFieldTemplate {
    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      fieldType: dbTemplate.fieldType,
      label: dbTemplate.label,
      placeholder: dbTemplate.placeholder,
      helpText: dbTemplate.helpText,
      defaultValue: dbTemplate.defaultValue,
      isRequired: dbTemplate.isRequired,
      validationRules: dbTemplate.validationRules || [],
      options: dbTemplate.options || [],
      styling: dbTemplate.styling || {},
      metadata: dbTemplate.metadata || {},
      category: dbTemplate.category,
      tags: dbTemplate.tags || [],
      isActive: dbTemplate.isActive,
      createdAt: dbTemplate.createdAt,
      updatedAt: dbTemplate.updatedAt
    };
  }

  /**
   * Validate a single validation rule
   */
  private validateRule(fieldLabel: string, value: any, rule: ValidationRule): string[] {
    const errors: string[] = [];

    switch (rule.type) {
      case 'min':
        if (Number(value) < rule.value) {
          errors.push(rule.message || `${fieldLabel} must be at least ${rule.value}`);
        }
        break;

      case 'max':
        if (Number(value) > rule.value) {
          errors.push(rule.message || `${fieldLabel} must be at most ${rule.value}`);
        }
        break;

      case 'minLength':
        if (String(value).length < rule.value) {
          errors.push(rule.message || `${fieldLabel} must be at least ${rule.value} characters`);
        }
        break;

      case 'maxLength':
        if (String(value).length > rule.value) {
          errors.push(rule.message || `${fieldLabel} must be at most ${rule.value} characters`);
        }
        break;

      case 'pattern':
        const regex = new RegExp(rule.value);
        if (!regex.test(String(value))) {
          errors.push(rule.message || `${fieldLabel} format is invalid`);
        }
        break;

      case 'range':
        const numValue = Number(value);
        if (numValue < rule.value.min || numValue > rule.value.max) {
          errors.push(rule.message || `${fieldLabel} must be between ${rule.value.min} and ${rule.value.max}`);
        }
        break;

      case 'custom':
        // Custom validation would be implemented based on specific requirements
        logger.debug(`Custom validation rule not implemented: ${rule.customFunction}`);
        break;

      default:
        logger.warn(`Unknown validation rule type: ${rule.type}`);
    }

    return errors;
  }

  /**
   * Check if a value is a valid date
   */
  private isValidDate(value: any): boolean {
    if (!value) return false;
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

export default DataCollectionFieldTemplateService;