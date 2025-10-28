/**
 * DocumentManagementService
 *
 * Implements GitHub Issue #18: Multi-Format Document Management & Native Work Instruction Editor
 *
 * Core service for importing, exporting, and managing work instruction documents.
 * Supports PDF, DOCX, and PPT formats with native content format conversion.
 */

import { PrismaClient } from '@prisma/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as PDFParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import TurndownService from 'turndown';
import PDFKit from 'pdfkit';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import PptxGenJS from 'pptxgenjs';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { FileUploadService } from './FileUploadService';

// Type definitions for document operations
export interface ImportMetadata {
  title: string;
  description?: string;
  partId?: string;
  operationId?: string;
  tags?: string[];
  categories?: string[];
  createdById: string;
}

export interface ExportOptions {
  templateId?: string;
  includeImages?: boolean;
  includeThumbnails?: boolean;
  format: 'PDF' | 'DOCX' | 'PPTX';
}

export interface NativeContent {
  version: string;
  steps: NativeContentStep[];
  metadata?: {
    estimatedDuration?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    requiredTools?: string[];
    safetyNotes?: string[];
  };
}

export interface NativeContentStep {
  id: string;
  stepNumber: number;
  title: string;
  content: string; // Rich text/HTML content
  media?: {
    images?: string[];
    videos?: string[];
    documents?: string[];
  };
  dataCollection?: {
    fields: DataCollectionField[];
  };
  estimatedDuration?: number;
  isCritical?: boolean;
  requiresSignature?: boolean;
}

export interface DataCollectionField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'time';
  label: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  defaultValue?: any;
}

export class DocumentManagementService {
  private prisma: PrismaClient;
  private fileUploadService: FileUploadService;
  private turndownService: TurndownService;

  constructor() {
    this.prisma = new PrismaClient();
    this.fileUploadService = new FileUploadService();

    // Configure Turndown for HTML to Markdown conversion
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }

  /**
   * Import PDF document and convert to work instruction
   */
  async importPDF(fileBuffer: Buffer, metadata: ImportMetadata): Promise<any> {
    try {
      logger.info(`[DocumentManagement] Starting PDF import: ${metadata.title}`);

      // Parse PDF content
      const pdfData = await PDFParse(fileBuffer);

      // Extract text content
      const content = pdfData.text;
      const pages = content.split('\f'); // Form feed character separates pages

      // Convert to native content format
      const nativeContent: NativeContent = {
        version: '1.0',
        steps: this.convertTextToSteps(pages, metadata.title),
        metadata: {
          estimatedDuration: pages.length * 300 // 5 minutes per page estimate
        }
      };

      // Create work instruction record
      const workInstruction = await this.prisma.workInstruction.create({
        data: {
          title: metadata.title,
          description: metadata.description,
          partId: metadata.partId,
          operationId: metadata.operationId,
          contentFormat: 'IMPORTED_PDF',
          nativeContent: nativeContent as any,
          importedFromFile: `${metadata.title}.pdf`,
          tags: metadata.tags || [],
          categories: metadata.categories || [],
          keywords: this.extractKeywords(content),
          createdById: metadata.createdById,
          updatedById: metadata.createdById,
          steps: {
            create: nativeContent.steps.map(step => ({
              stepNumber: step.stepNumber,
              title: step.title,
              content: step.content,
              estimatedDuration: step.estimatedDuration,
              isCritical: step.isCritical || false,
              requiresSignature: step.requiresSignature || false,
              dataEntryFields: step.dataCollection?.fields || null
            }))
          }
        },
        include: {
          steps: true
        }
      });

      logger.info(`[DocumentManagement] ✅ PDF import completed: ${workInstruction.id}`);
      return workInstruction;

    } catch (error) {
      logger.error('[DocumentManagement] PDF import failed:', error);
      throw new Error(`PDF import failed: ${error.message}`);
    }
  }

  /**
   * Import DOCX document and convert to work instruction
   */
  async importDOCX(fileBuffer: Buffer, metadata: ImportMetadata): Promise<any> {
    try {
      logger.info(`[DocumentManagement] Starting DOCX import: ${metadata.title}`);

      // Convert DOCX to HTML
      const result = await mammoth.convertToHtml({ buffer: fileBuffer });
      const htmlContent = result.value;

      // Convert HTML to markdown for easier processing
      const markdownContent = this.turndownService.turndown(htmlContent);

      // Split content into logical steps (by headers or sections)
      const sections = this.splitDocumentSections(markdownContent);

      // Convert to native content format
      const nativeContent: NativeContent = {
        version: '1.0',
        steps: this.convertSectionsToSteps(sections, metadata.title),
        metadata: {
          estimatedDuration: sections.length * 600 // 10 minutes per section estimate
        }
      };

      // Create work instruction record
      const workInstruction = await this.prisma.workInstruction.create({
        data: {
          title: metadata.title,
          description: metadata.description,
          partId: metadata.partId,
          operationId: metadata.operationId,
          contentFormat: 'IMPORTED_DOC',
          nativeContent: nativeContent as any,
          importedFromFile: `${metadata.title}.docx`,
          tags: metadata.tags || [],
          categories: metadata.categories || [],
          keywords: this.extractKeywords(markdownContent),
          createdById: metadata.createdById,
          updatedById: metadata.createdById,
          steps: {
            create: nativeContent.steps.map(step => ({
              stepNumber: step.stepNumber,
              title: step.title,
              content: step.content,
              estimatedDuration: step.estimatedDuration,
              isCritical: step.isCritical || false,
              requiresSignature: step.requiresSignature || false,
              dataEntryFields: step.dataCollection?.fields || null
            }))
          }
        },
        include: {
          steps: true
        }
      });

      logger.info(`[DocumentManagement] ✅ DOCX import completed: ${workInstruction.id}`);
      return workInstruction;

    } catch (error) {
      logger.error('[DocumentManagement] DOCX import failed:', error);
      throw new Error(`DOCX import failed: ${error.message}`);
    }
  }

  /**
   * Export work instruction to PDF format
   */
  async exportToPDF(instructionId: string, options: ExportOptions = { format: 'PDF' }): Promise<Buffer> {
    try {
      logger.info(`[DocumentManagement] Starting PDF export: ${instructionId}`);

      // Fetch work instruction with steps
      const instruction = await this.prisma.workInstruction.findUnique({
        where: { id: instructionId },
        include: {
          steps: { orderBy: { stepNumber: 'asc' } },
          createdBy: true,
          exportTemplate: true
        }
      });

      if (!instruction) {
        throw new Error(`Work instruction not found: ${instructionId}`);
      }

      // Create PDF document
      const pdfDoc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Buffer to collect PDF data
      const chunks: Buffer[] = [];
      pdfDoc.on('data', chunk => chunks.push(chunk));
      pdfDoc.on('end', () => {}); // Will be handled by Promise

      // Add header
      pdfDoc.fontSize(20).text(instruction.title, { align: 'center' });
      pdfDoc.moveDown();

      if (instruction.description) {
        pdfDoc.fontSize(12).text(instruction.description);
        pdfDoc.moveDown();
      }

      // Add metadata
      pdfDoc.fontSize(10)
        .text(`Version: ${instruction.version}`, { continued: true })
        .text(`  |  Created: ${instruction.createdAt.toLocaleDateString()}`, { align: 'right' });

      if (instruction.partId) {
        pdfDoc.text(`Part ID: ${instruction.partId}`);
      }

      pdfDoc.moveDown();

      // Add steps
      for (const step of instruction.steps) {
        // Step header
        pdfDoc.fontSize(14).text(`Step ${step.stepNumber}: ${step.title}`, {
          underline: true
        });
        pdfDoc.moveDown(0.5);

        // Step content
        pdfDoc.fontSize(11).text(step.content);

        // Add duration and criticality info
        if (step.estimatedDuration || step.isCritical) {
          pdfDoc.moveDown(0.3);
          pdfDoc.fontSize(9);

          if (step.estimatedDuration) {
            pdfDoc.text(`⏱ Estimated time: ${Math.round(step.estimatedDuration / 60)} minutes`, {
              continued: step.isCritical
            });
          }

          if (step.isCritical) {
            pdfDoc.text(step.estimatedDuration ? '  |  ⚠ Critical Step' : '⚠ Critical Step');
          }
        }

        pdfDoc.moveDown();
      }

      // Add footer
      pdfDoc.fontSize(8)
        .text(`Generated by MES Document Management System - ${new Date().toLocaleString()}`,
               { align: 'center' });

      // Finalize PDF
      pdfDoc.end();

      // Wait for PDF generation to complete
      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        pdfDoc.on('end', () => {
          const result = Buffer.concat(chunks);
          resolve(result);
        });
      });

      logger.info(`[DocumentManagement] ✅ PDF export completed: ${pdfBuffer.length} bytes`);
      return pdfBuffer;

    } catch (error) {
      logger.error('[DocumentManagement] PDF export failed:', error);
      throw new Error(`PDF export failed: ${error.message}`);
    }
  }

  /**
   * Export work instruction to DOCX format
   * ✅ GITHUB ISSUE #18: Multi-Format Document Management
   */
  async exportToDOCX(instructionId: string, options: ExportOptions = { format: 'DOCX' }): Promise<Buffer> {
    try {
      logger.info(`[DocumentManagement] Starting DOCX export: ${instructionId}`);

      // Fetch work instruction with steps
      const instruction = await this.prisma.workInstruction.findUnique({
        where: { id: instructionId },
        include: {
          steps: { orderBy: { stepNumber: 'asc' } },
          createdBy: true,
          exportTemplate: true
        }
      });

      if (!instruction) {
        throw new Error(`Work instruction not found: ${instructionId}`);
      }

      // Create document structure
      const children = [];

      // Add title
      children.push(
        new Paragraph({
          text: instruction.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 }
        })
      );

      // Add description
      if (instruction.description) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: instruction.description,
                italics: true
              })
            ],
            spacing: { after: 300 }
          })
        );
      }

      // Add metadata
      const metadataText = [
        `Version: ${instruction.version}`,
        `Created: ${instruction.createdAt.toLocaleDateString()}`,
        `Created by: ${instruction.createdBy?.firstName} ${instruction.createdBy?.lastName}`
      ];

      if (instruction.partId) {
        metadataText.push(`Part ID: ${instruction.partId}`);
      }

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadataText.join(' | '),
              size: 18,
              color: '666666'
            })
          ],
          spacing: { after: 400 }
        })
      );

      // Add steps
      for (const step of instruction.steps) {
        // Step header
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Step ${step.stepNumber}: ${step.title}`,
                bold: true,
                size: 24
              })
            ],
            spacing: { before: 300, after: 200 }
          })
        );

        // Step content
        const stepContentLines = step.content.split('\n').filter(line => line.trim());
        stepContentLines.forEach(line => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.trim(),
                  size: 20
                })
              ],
              spacing: { after: 100 }
            })
          );
        });

        // Add metadata for step
        const stepMetadata = [];
        if (step.estimatedDuration) {
          stepMetadata.push(`⏱ Estimated time: ${Math.round(step.estimatedDuration / 60)} minutes`);
        }
        if (step.isCritical) {
          stepMetadata.push('⚠ Critical Step');
        }
        if (step.requiresSignature) {
          stepMetadata.push('✍ Requires Signature');
        }

        if (stepMetadata.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: stepMetadata.join(' | '),
                  size: 16,
                  color: '888888',
                  italics: true
                })
              ],
              spacing: { after: 200 }
            })
          );
        }

        // Add data collection fields if present
        if (step.dataEntryFields && Array.isArray(step.dataEntryFields) && step.dataEntryFields.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Data Collection:',
                  bold: true,
                  size: 18
                })
              ],
              spacing: { before: 100, after: 100 }
            })
          );

          step.dataEntryFields.forEach((field: any) => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${field.label}${field.required ? ' (Required)' : ''}`,
                    size: 16
                  })
                ],
                spacing: { after: 50 }
              })
            );
          });
        }
      }

      // Add footer
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated by MES Document Management System - ${new Date().toLocaleString()}`,
              size: 16,
              color: '999999',
              italics: true
            })
          ],
          spacing: { before: 600 },
          alignment: 'center'
        })
      );

      // Create DOCX document
      const doc = new DocxDocument({
        sections: [{
          properties: {},
          children: children
        }]
      });

      // Generate buffer
      const docxBuffer = await Packer.toBuffer(doc);

      logger.info(`[DocumentManagement] ✅ DOCX export completed: ${docxBuffer.length} bytes`);
      return docxBuffer;

    } catch (error) {
      logger.error('[DocumentManagement] DOCX export failed:', error);
      throw new Error(`DOCX export failed: ${error.message}`);
    }
  }

  /**
   * Export work instruction to PPTX format
   * ✅ GITHUB ISSUE #18: Multi-Format Document Management
   */
  async exportToPPTX(instructionId: string, options: ExportOptions = { format: 'PPTX' }): Promise<Buffer> {
    try {
      logger.info(`[DocumentManagement] Starting PPTX export: ${instructionId}`);

      // Fetch work instruction with steps
      const instruction = await this.prisma.workInstruction.findUnique({
        where: { id: instructionId },
        include: {
          steps: { orderBy: { stepNumber: 'asc' } },
          createdBy: true,
          exportTemplate: true
        }
      });

      if (!instruction) {
        throw new Error(`Work instruction not found: ${instructionId}`);
      }

      // Create PowerPoint presentation
      const pptx = new PptxGenJS();

      // Set presentation properties
      pptx.author = `${instruction.createdBy?.firstName} ${instruction.createdBy?.lastName}` || 'MES System';
      pptx.company = 'Manufacturing Execution System';
      pptx.title = instruction.title;
      pptx.subject = 'Work Instruction';

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText(instruction.title, {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 1.5,
        fontSize: 36,
        fontFace: 'Arial',
        bold: true,
        color: '2F4F4F',
        align: 'center'
      });

      if (instruction.description) {
        titleSlide.addText(instruction.description, {
          x: 0.5,
          y: 3.5,
          w: 9,
          h: 1,
          fontSize: 18,
          fontFace: 'Arial',
          italic: true,
          color: '666666',
          align: 'center'
        });
      }

      // Add metadata
      const metadataText = [
        `Version: ${instruction.version}`,
        `Created: ${instruction.createdAt.toLocaleDateString()}`,
        `Created by: ${instruction.createdBy?.firstName} ${instruction.createdBy?.lastName}`
      ];

      if (instruction.partId) {
        metadataText.push(`Part ID: ${instruction.partId}`);
      }

      titleSlide.addText(metadataText.join('\n'), {
        x: 0.5,
        y: 5.5,
        w: 9,
        h: 1.5,
        fontSize: 12,
        fontFace: 'Arial',
        color: '888888',
        align: 'center'
      });

      // Overview slide with all steps
      if (instruction.steps.length > 0) {
        const overviewSlide = pptx.addSlide();
        overviewSlide.addText('Work Instruction Overview', {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 0.8,
          fontSize: 28,
          fontFace: 'Arial',
          bold: true,
          color: '2F4F4F'
        });

        const stepsList = instruction.steps.map((step, index) =>
          `${step.stepNumber}. ${step.title}${step.isCritical ? ' ⚠' : ''}${step.requiresSignature ? ' ✍' : ''}`
        ).join('\n');

        overviewSlide.addText(stepsList, {
          x: 0.5,
          y: 1.5,
          w: 9,
          h: 5.5,
          fontSize: 16,
          fontFace: 'Arial',
          color: '333333',
          bullet: true
        });
      }

      // Individual step slides
      for (const step of instruction.steps) {
        const stepSlide = pptx.addSlide();

        // Step title
        stepSlide.addText(`Step ${step.stepNumber}: ${step.title}`, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 0.8,
          fontSize: 24,
          fontFace: 'Arial',
          bold: true,
          color: step.isCritical ? 'CC0000' : '2F4F4F'
        });

        // Step content
        const contentY = 1.5;
        const contentLines = step.content.split('\n').filter(line => line.trim());
        const contentText = contentLines.join('\n');

        stepSlide.addText(contentText, {
          x: 0.5,
          y: contentY,
          w: 9,
          h: 3.5,
          fontSize: 14,
          fontFace: 'Arial',
          color: '333333',
          valign: 'top'
        });

        // Step metadata box
        const metadata = [];
        if (step.estimatedDuration) {
          metadata.push(`⏱ Time: ${Math.round(step.estimatedDuration / 60)} min`);
        }
        if (step.isCritical) {
          metadata.push('⚠ Critical Step');
        }
        if (step.requiresSignature) {
          metadata.push('✍ Signature Required');
        }

        if (metadata.length > 0) {
          stepSlide.addText(metadata.join(' | '), {
            x: 0.5,
            y: 6,
            w: 9,
            h: 0.5,
            fontSize: 11,
            fontFace: 'Arial',
            italic: true,
            color: '666666',
            fill: 'F0F0F0',
            align: 'center'
          });
        }

        // Data collection fields
        if (step.dataEntryFields && Array.isArray(step.dataEntryFields) && step.dataEntryFields.length > 0) {
          stepSlide.addText('Data Collection:', {
            x: 0.5,
            y: 5.2,
            w: 9,
            h: 0.3,
            fontSize: 12,
            fontFace: 'Arial',
            bold: true,
            color: '2F4F4F'
          });

          const fieldsText = step.dataEntryFields
            .map((field: any) => `• ${field.label}${field.required ? ' (Required)' : ''}`)
            .join('\n');

          stepSlide.addText(fieldsText, {
            x: 0.5,
            y: 5.6,
            w: 9,
            h: 1.5,
            fontSize: 10,
            fontFace: 'Arial',
            color: '555555'
          });
        }
      }

      // Summary slide
      const summarySlide = pptx.addSlide();
      summarySlide.addText('Work Instruction Complete', {
        x: 0.5,
        y: 2,
        w: 9,
        h: 1,
        fontSize: 32,
        fontFace: 'Arial',
        bold: true,
        color: '2F4F4F',
        align: 'center'
      });

      const totalSteps = instruction.steps.length;
      const criticalSteps = instruction.steps.filter(step => step.isCritical).length;
      const signatureSteps = instruction.steps.filter(step => step.requiresSignature).length;
      const totalDuration = instruction.steps.reduce((sum, step) => sum + (step.estimatedDuration || 0), 0);

      const summaryText = [
        `Total Steps: ${totalSteps}`,
        `Critical Steps: ${criticalSteps}`,
        `Signature Required: ${signatureSteps}`,
        `Estimated Duration: ${Math.round(totalDuration / 60)} minutes`
      ].join('\n');

      summarySlide.addText(summaryText, {
        x: 0.5,
        y: 3.5,
        w: 9,
        h: 2,
        fontSize: 16,
        fontFace: 'Arial',
        color: '333333',
        align: 'center'
      });

      // Footer
      summarySlide.addText(`Generated by MES Document Management System - ${new Date().toLocaleString()}`, {
        x: 0.5,
        y: 6.5,
        w: 9,
        h: 0.5,
        fontSize: 10,
        fontFace: 'Arial',
        italic: true,
        color: '999999',
        align: 'center'
      });

      // Generate PPTX buffer
      const pptxBuffer = await pptx.write('base64');
      const buffer = Buffer.from(pptxBuffer as string, 'base64');

      logger.info(`[DocumentManagement] ✅ PPTX export completed: ${buffer.length} bytes`);
      return buffer;

    } catch (error) {
      logger.error('[DocumentManagement] PPTX export failed:', error);
      throw new Error(`PPTX export failed: ${error.message}`);
    }
  }

  /**
   * Save native content format for work instruction
   */
  async saveNativeContent(instructionId: string, content: NativeContent): Promise<any> {
    try {
      logger.info(`[DocumentManagement] Saving native content: ${instructionId}`);

      const updatedInstruction = await this.prisma.workInstruction.update({
        where: { id: instructionId },
        data: {
          contentFormat: 'NATIVE',
          nativeContent: content as any,
          updatedAt: new Date()
        },
        include: {
          steps: true
        }
      });

      logger.info(`[DocumentManagement] ✅ Native content saved successfully`);
      return updatedInstruction;

    } catch (error) {
      logger.error('[DocumentManagement] Save native content failed:', error);
      throw new Error(`Save native content failed: ${error.message}`);
    }
  }

  /**
   * Search work instructions with full-text and metadata search
   */
  async searchDocuments(query: {
    text?: string;
    tags?: string[];
    categories?: string[];
    contentFormat?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const where: any = {};

      // Text search in title, description, and keywords
      if (query.text) {
        where.OR = [
          { title: { contains: query.text, mode: 'insensitive' } },
          { description: { contains: query.text, mode: 'insensitive' } },
          { keywords: { has: query.text } }
        ];
      }

      // Filter by tags
      if (query.tags && query.tags.length > 0) {
        where.tags = { hasSome: query.tags };
      }

      // Filter by categories
      if (query.categories && query.categories.length > 0) {
        where.categories = { hasSome: query.categories };
      }

      // Filter by content format
      if (query.contentFormat) {
        where.contentFormat = query.contentFormat;
      }

      const instructions = await this.prisma.workInstruction.findMany({
        where,
        include: {
          steps: { orderBy: { stepNumber: 'asc' } },
          createdBy: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: query.offset || 0,
        take: query.limit || 50
      });

      return instructions;

    } catch (error) {
      logger.error('[DocumentManagement] Search failed:', error);
      throw new Error(`Document search failed: ${error.message}`);
    }
  }

  // Helper methods

  private convertTextToSteps(pages: string[], title: string): NativeContentStep[] {
    return pages.map((pageContent, index) => ({
      id: `step-${index + 1}`,
      stepNumber: index + 1,
      title: `Step ${index + 1}`,
      content: pageContent.trim(),
      estimatedDuration: 300, // 5 minutes default
      isCritical: false,
      requiresSignature: false
    }));
  }

  private convertSectionsToSteps(sections: string[], title: string): NativeContentStep[] {
    return sections.map((section, index) => {
      const lines = section.split('\n');
      const stepTitle = lines[0]?.replace(/^#+\s*/, '') || `Step ${index + 1}`;
      const stepContent = lines.slice(1).join('\n').trim();

      return {
        id: `step-${index + 1}`,
        stepNumber: index + 1,
        title: stepTitle,
        content: stepContent,
        estimatedDuration: 600, // 10 minutes default for document sections
        isCritical: stepTitle.toLowerCase().includes('critical') || stepTitle.toLowerCase().includes('important'),
        requiresSignature: stepTitle.toLowerCase().includes('signature') || stepTitle.toLowerCase().includes('approval')
      };
    });
  }

  private splitDocumentSections(content: string): string[] {
    // Split by headers (markdown style)
    const sections = content.split(/\n(?=#{1,6}\s)/);
    return sections.filter(section => section.trim().length > 0);
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP libraries
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have', 'will', 'been', 'were', 'they', 'there', 'their'].includes(word));

    // Get unique words and return top 20 most frequent
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Cleanup method for proper service shutdown
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default DocumentManagementService;