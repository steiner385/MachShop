import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Template interfaces for different export formats
export interface BaseTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentTemplate extends BaseTemplate {
  format: 'PDF' | 'DOCX' | 'PPTX';
  headerTemplate?: string;
  footerTemplate?: string;
  styling: {
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
    margins?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    colors?: {
      primary?: string;
      secondary?: string;
      text?: string;
      background?: string;
    };
  };
}

export interface PDFTemplate extends DocumentTemplate {
  format: 'PDF';
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  watermark?: {
    text: string;
    opacity: number;
    rotation: number;
  };
}

export interface DOCXTemplate extends DocumentTemplate {
  format: 'DOCX';
  styles: {
    headingStyles?: Record<string, any>;
    paragraphStyles?: Record<string, any>;
    tableStyles?: Record<string, any>;
  };
  pageSetup: {
    size: string;
    orientation: 'portrait' | 'landscape';
  };
}

export interface PPTXTemplate extends DocumentTemplate {
  format: 'PPTX';
  slideLayout: 'standard' | 'widescreen';
  masterSlide: {
    background?: string;
    titlePosition: { x: number; y: number; w: number; h: number };
    contentPosition: { x: number; y: number; w: number; h: number };
  };
  slideTransitions?: {
    type: string;
    duration: number;
  };
}

export type ExportTemplate = PDFTemplate | DOCXTemplate | PPTXTemplate;

export interface TemplateCreateInput {
  name: string;
  description?: string;
  format: 'PDF' | 'DOCX' | 'PPTX';
  isDefault?: boolean;
  styling: any;
  formatSpecific?: any;
}

export interface TemplateUpdateInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
  styling?: any;
  formatSpecific?: any;
}

/**
 * ✅ GITHUB ISSUE #18 - Phase 3: ExportTemplateService
 *
 * Service for managing document export templates across PDF, DOCX, and PPTX formats.
 * Provides CRUD operations and template application functionality.
 */
export class ExportTemplateService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new export template
   */
  async createTemplate(input: TemplateCreateInput): Promise<ExportTemplate> {
    try {
      logger.info(`Creating new ${input.format} export template: ${input.name}`);

      // If this is set as default, unset other defaults for the same format
      if (input.isDefault) {
        await this.prisma.exportTemplate.updateMany({
          where: { format: input.format, isDefault: true },
          data: { isDefault: false }
        });
      }

      const template = await this.prisma.exportTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          format: input.format,
          isDefault: input.isDefault || false,
          styling: input.styling,
          formatSpecific: input.formatSpecific || {}
        }
      });

      logger.info(`Successfully created export template: ${template.id}`);
      return this.mapToExportTemplate(template);
    } catch (error: any) {
      logger.error('Failed to create export template:', {
        error: error?.message || 'Unknown error',
        input: input
      });
      throw new Error(`Failed to create export template: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<ExportTemplate | null> {
    try {
      logger.debug(`Fetching export template: ${id}`);

      const template = await this.prisma.exportTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        logger.warn(`Export template not found: ${id}`);
        return null;
      }

      return this.mapToExportTemplate(template);
    } catch (error: any) {
      logger.error('Failed to fetch export template:', {
        error: error?.message || 'Unknown error',
        templateId: id
      });
      throw new Error(`Failed to fetch export template: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get all templates, optionally filtered by format
   */
  async getTemplates(format?: 'PDF' | 'DOCX' | 'PPTX'): Promise<ExportTemplate[]> {
    try {
      logger.debug(`Fetching export templates${format ? ` for format: ${format}` : ''}`);

      const templates = await this.prisma.exportTemplate.findMany({
        where: format ? { format } : undefined,
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' }
        ]
      });

      return templates.map(template => this.mapToExportTemplate(template));
    } catch (error: any) {
      logger.error('Failed to fetch export templates:', {
        error: error?.message || 'Unknown error',
        format: format
      });
      throw new Error(`Failed to fetch export templates: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get default template for a format
   */
  async getDefaultTemplate(format: 'PDF' | 'DOCX' | 'PPTX'): Promise<ExportTemplate | null> {
    try {
      logger.debug(`Fetching default template for format: ${format}`);

      const template = await this.prisma.exportTemplate.findFirst({
        where: { format, isDefault: true }
      });

      if (!template) {
        // Return built-in default if no custom default exists
        return this.getBuiltInDefaultTemplate(format);
      }

      return this.mapToExportTemplate(template);
    } catch (error: any) {
      logger.error('Failed to fetch default template:', {
        error: error?.message || 'Unknown error',
        format: format
      });
      throw new Error(`Failed to fetch default template: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, input: TemplateUpdateInput): Promise<ExportTemplate> {
    try {
      logger.info(`Updating export template: ${id}`);

      // Check if template exists
      const existingTemplate = await this.prisma.exportTemplate.findUnique({
        where: { id }
      });

      if (!existingTemplate) {
        throw new Error(`Template not found: ${id}`);
      }

      // If setting as default, unset other defaults for the same format
      if (input.isDefault) {
        await this.prisma.exportTemplate.updateMany({
          where: {
            format: existingTemplate.format,
            isDefault: true,
            id: { not: id }
          },
          data: { isDefault: false }
        });
      }

      const template = await this.prisma.exportTemplate.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          isDefault: input.isDefault,
          styling: input.styling,
          formatSpecific: input.formatSpecific
        }
      });

      logger.info(`Successfully updated export template: ${id}`);
      return this.mapToExportTemplate(template);
    } catch (error: any) {
      logger.error('Failed to update export template:', {
        error: error?.message || 'Unknown error',
        templateId: id,
        input: input
      });
      throw new Error(`Failed to update export template: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      logger.info(`Deleting export template: ${id}`);

      const template = await this.prisma.exportTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        throw new Error(`Template not found: ${id}`);
      }

      await this.prisma.exportTemplate.delete({
        where: { id }
      });

      logger.info(`Successfully deleted export template: ${id}`);
    } catch (error: any) {
      logger.error('Failed to delete export template:', {
        error: error?.message || 'Unknown error',
        templateId: id
      });
      throw new Error(`Failed to delete export template: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Apply template to export options
   */
  applyTemplate(template: ExportTemplate, baseOptions: any = {}): any {
    logger.debug(`Applying template: ${template.name} (${template.format})`);

    const appliedOptions = {
      ...baseOptions,
      format: template.format,
      template: {
        id: template.id,
        name: template.name
      },
      styling: {
        ...template.styling,
        ...baseOptions.styling
      }
    };

    // Apply format-specific configurations
    switch (template.format) {
      case 'PDF':
        const pdfTemplate = template as PDFTemplate;
        appliedOptions.pageSize = pdfTemplate.pageSize;
        appliedOptions.orientation = pdfTemplate.orientation;
        if (pdfTemplate.watermark) {
          appliedOptions.watermark = pdfTemplate.watermark;
        }
        break;

      case 'DOCX':
        const docxTemplate = template as DOCXTemplate;
        appliedOptions.styles = docxTemplate.styles;
        appliedOptions.pageSetup = docxTemplate.pageSetup;
        break;

      case 'PPTX':
        const pptxTemplate = template as PPTXTemplate;
        appliedOptions.slideLayout = pptxTemplate.slideLayout;
        appliedOptions.masterSlide = pptxTemplate.masterSlide;
        if (pptxTemplate.slideTransitions) {
          appliedOptions.slideTransitions = pptxTemplate.slideTransitions;
        }
        break;
    }

    return appliedOptions;
  }

  /**
   * Map database record to ExportTemplate interface
   */
  private mapToExportTemplate(dbTemplate: any): ExportTemplate {
    const base = {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      isDefault: dbTemplate.isDefault,
      createdAt: dbTemplate.createdAt,
      updatedAt: dbTemplate.updatedAt,
      format: dbTemplate.format,
      styling: dbTemplate.styling || {}
    };

    switch (dbTemplate.format) {
      case 'PDF':
        return {
          ...base,
          format: 'PDF',
          pageSize: dbTemplate.formatSpecific?.pageSize || 'A4',
          orientation: dbTemplate.formatSpecific?.orientation || 'portrait',
          watermark: dbTemplate.formatSpecific?.watermark
        } as PDFTemplate;

      case 'DOCX':
        return {
          ...base,
          format: 'DOCX',
          styles: dbTemplate.formatSpecific?.styles || {},
          pageSetup: dbTemplate.formatSpecific?.pageSetup || {
            size: 'A4',
            orientation: 'portrait'
          }
        } as DOCXTemplate;

      case 'PPTX':
        return {
          ...base,
          format: 'PPTX',
          slideLayout: dbTemplate.formatSpecific?.slideLayout || 'standard',
          masterSlide: dbTemplate.formatSpecific?.masterSlide || {
            titlePosition: { x: 0.5, y: 0.5, w: 9, h: 1.5 },
            contentPosition: { x: 0.5, y: 2, w: 9, h: 5 }
          },
          slideTransitions: dbTemplate.formatSpecific?.slideTransitions
        } as PPTXTemplate;

      default:
        throw new Error(`Unsupported template format: ${dbTemplate.format}`);
    }
  }

  /**
   * Get built-in default templates
   */
  private getBuiltInDefaultTemplate(format: 'PDF' | 'DOCX' | 'PPTX'): ExportTemplate {
    const baseTemplate = {
      id: `builtin-default-${format.toLowerCase()}`,
      name: `Default ${format} Template`,
      description: `Built-in default template for ${format} exports`,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      styling: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 12,
        lineHeight: 1.4,
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        colors: {
          primary: '#2563eb',
          secondary: '#64748b',
          text: '#1e293b',
          background: '#ffffff'
        }
      }
    };

    switch (format) {
      case 'PDF':
        return {
          ...baseTemplate,
          format: 'PDF',
          pageSize: 'A4',
          orientation: 'portrait'
        } as PDFTemplate;

      case 'DOCX':
        return {
          ...baseTemplate,
          format: 'DOCX',
          styles: {
            headingStyles: {
              heading1: { fontSize: 18, bold: true },
              heading2: { fontSize: 16, bold: true },
              heading3: { fontSize: 14, bold: true }
            },
            paragraphStyles: {
              normal: { fontSize: 12, lineHeight: 1.4 }
            }
          },
          pageSetup: {
            size: 'A4',
            orientation: 'portrait'
          }
        } as DOCXTemplate;

      case 'PPTX':
        return {
          ...baseTemplate,
          format: 'PPTX',
          slideLayout: 'standard',
          masterSlide: {
            titlePosition: { x: 0.5, y: 0.5, w: 9, h: 1.5 },
            contentPosition: { x: 0.5, y: 2, w: 9, h: 5 }
          }
        } as PPTXTemplate;

      default:
        throw new Error(`Unsupported format for built-in template: ${format}`);
    }
  }

  /**
   * Create built-in default templates if they don't exist
   */
  async ensureDefaultTemplates(): Promise<void> {
    try {
      logger.info('Ensuring default export templates exist');

      const formats: Array<'PDF' | 'DOCX' | 'PPTX'> = ['PDF', 'DOCX', 'PPTX'];

      for (const format of formats) {
        const existingDefault = await this.prisma.exportTemplate.findFirst({
          where: { format, isDefault: true }
        });

        if (!existingDefault) {
          const defaultTemplate = this.getBuiltInDefaultTemplate(format);
          await this.createTemplate({
            name: defaultTemplate.name,
            description: defaultTemplate.description,
            format: format,
            isDefault: true,
            styling: defaultTemplate.styling,
            formatSpecific: format === 'PDF' ? {
              pageSize: (defaultTemplate as PDFTemplate).pageSize,
              orientation: (defaultTemplate as PDFTemplate).orientation
            } : format === 'DOCX' ? {
              styles: (defaultTemplate as DOCXTemplate).styles,
              pageSetup: (defaultTemplate as DOCXTemplate).pageSetup
            } : {
              slideLayout: (defaultTemplate as PPTXTemplate).slideLayout,
              masterSlide: (defaultTemplate as PPTXTemplate).masterSlide
            }
          });

          logger.info(`Created default ${format} template`);
        }
      }
    } catch (error: any) {
      logger.error('Failed to ensure default templates:', {
        error: error?.message || 'Unknown error'
      });
      // Don't throw - this is initialization, continue even if it fails
    }
  }
}

export default ExportTemplateService;