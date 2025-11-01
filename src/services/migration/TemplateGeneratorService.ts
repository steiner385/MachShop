/**
 * Template Generator Service for Data Migration (Issue #31)
 * Generates Excel and CSV templates for data import with validation rules, field descriptions, and example data
 */

import * as ExcelJS from 'exceljs';
import { stringify as stringifyCSV } from 'csv-stringify/sync';
import archiver from 'archiver';
import { Readable } from 'stream';
import { TEMPLATE_REGISTRY, TemplateMetadata, EntityType, getTemplateMetadata, getAvailableEntityTypes } from './TemplateRegistry';

export class TemplateGeneratorService {
  /**
   * Generate Excel template for a specific entity type
   */
  async generateExcelTemplate(entityType: EntityType): Promise<Buffer> {
    const metadata = getTemplateMetadata(entityType);
    if (!metadata) {
      throw new Error(`Template not found for entity type: ${entityType}`);
    }

    const workbook = new ExcelJS.Workbook();

    // Add Instructions sheet
    this.addInstructionsSheet(workbook, metadata);

    // Add Field Definitions sheet
    this.addFieldDefinitionsSheet(workbook, metadata);

    // Add Data sheet
    this.addDataSheet(workbook, metadata);

    // Add Enum Values sheet if there are enum fields
    const enumFields = metadata.fields.filter(f => f.dataType === 'enum');
    if (enumFields.length > 0) {
      this.addEnumValuesSheet(workbook, enumFields);
    }

    // Generate buffer
    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  /**
   * Generate CSV template for a specific entity type
   */
  async generateCSVTemplate(entityType: EntityType): Promise<string> {
    const metadata = getTemplateMetadata(entityType);
    if (!metadata) {
      throw new Error(`Template not found for entity type: ${entityType}`);
    }

    // Create rows: header, description, data types, then example data
    const rows: any[] = [];

    // Header row
    rows.push(metadata.fields.map(f => f.name));

    // Description row
    rows.push(metadata.fields.map(f => f.description));

    // Data type row
    rows.push(
      metadata.fields.map(f => {
        let type = f.dataType.toUpperCase();
        if (f.required) type += ' (REQUIRED)';
        return type;
      })
    );

    // Validation rules row
    rows.push(
      metadata.fields.map(f => {
        const rules: string[] = [];
        if (f.required) rules.push('Required');
        if (f.maxLength) rules.push(`Max ${f.maxLength} chars`);
        if (f.pattern) rules.push(`Pattern: ${f.pattern}`);
        if (f.enumValues) rules.push(`Values: ${f.enumValues.join(', ')}`);
        return rules.join(' | ');
      })
    );

    // Example data rows
    for (const example of metadata.exampleData) {
      rows.push(metadata.fields.map(f => example[f.name] ?? ''));
    }

    return stringifyCSV(rows);
  }

  /**
   * Generate multi-sheet Excel for related entities
   */
  async generateRelatedEntityTemplate(entities: EntityType[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Add instructions
    const instructionsSheet = workbook.addWorksheet('Instructions', {
      properties: { tabColor: { argb: 'FFC00000' } },
    });
    instructionsSheet.columns = [{ header: 'Instructions', width: 80 }];
    instructionsSheet.addRows([
      ['Related Entity Import Template'],
      [''],
      ['This template includes multiple related entities:'],
      ...entities.map(e => {
        const metadata = getTemplateMetadata(e);
        return [metadata?.displayName || e];
      }),
      [''],
      ['Instructions:'],
      ['1. Each entity type has its own sheet'],
      ['2. Fill in data in each sheet following the field definitions'],
      ['3. Maintain referential integrity between related sheets'],
      ['4. Required fields are marked with *'],
      ['5. Save and upload the entire workbook'],
    ]);

    // Add sheet for each entity
    for (const entityType of entities) {
      const metadata = getTemplateMetadata(entityType);
      if (metadata) {
        this.addDataSheet(workbook, metadata, metadata.displayName);
      }
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  /**
   * Get complete template metadata
   */
  getTemplateMetadata(entityType: EntityType): TemplateMetadata | null {
    return getTemplateMetadata(entityType);
  }

  /**
   * Download all templates as ZIP
   */
  async generateAllTemplates(): Promise<NodeJS.ReadableStream> {
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Add each template to the ZIP
    const entityTypes = getAvailableEntityTypes();
    for (const entityType of entityTypes) {
      const metadata = getTemplateMetadata(entityType);
      if (metadata) {
        const buffer = await this.generateExcelTemplate(entityType);
        const filename = `${metadata.entityType}_${metadata.entityName.replace(/\s+/g, '_')}_import_template.xlsx`;
        archive.append(buffer, { name: filename });
      }
    }

    // Finalize the archive
    archive.finalize();

    return archive;
  }

  /**
   * List all available templates with metadata
   */
  listAllTemplates() {
    return getAvailableEntityTypes().map(entityType => {
      const metadata = getTemplateMetadata(entityType);
      return {
        entityType,
        entityName: metadata?.entityName,
        displayName: metadata?.displayName,
        description: metadata?.description,
        category: metadata?.category,
        fieldCount: metadata?.fields.length || 0,
        relationshipCount: metadata?.relationships.length || 0,
      };
    });
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private addInstructionsSheet(workbook: ExcelJS.Workbook, metadata: TemplateMetadata) {
    const sheet = workbook.addWorksheet('Instructions', {
      properties: { tabColor: { argb: 'FFC00000' } },
    });

    sheet.columns = [{ header: 'Instructions', width: 100 }];

    const headerFont = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0066CC' } };

    const rows = [
      [`${metadata.displayName} Import Template`],
      [''],
      ['Overview:'],
      [metadata.description],
      [''],
      ['How to Use:'],
      ['1. Review the Field Definitions sheet to understand each field'],
      ['2. Fill in the Data sheet with your information'],
      ['3. Required fields are marked with an asterisk (*)'],
      ['4. Enum fields have dropdown validation - use only provided values'],
      ['5. Follow the data types and validation rules'],
      ['6. Review example data for reference'],
      ['7. Save the file and upload via the Migration Portal'],
      [''],
      ['Field Rules:'],
      [
        `- Unique Fields: Must not duplicate values from existing records`,
      ],
      [
        `- Required Fields: Must have a value (cannot be blank)`,
      ],
      [
        `- Enum Fields: Must use only the provided valid values`,
      ],
      [
        `- Date Fields: Use format YYYY-MM-DD`,
      ],
      [
        `- Foreign Keys: Must reference existing records in related tables`,
      ],
      [''],
      ['Support:'],
      ['Contact Migration Team at migration@company.com'],
      ['Or visit: https://help.company.com/data-migration'],
    ];

    sheet.addRows(rows);

    // Style header
    const firstCell = sheet.getCell('A1');
    firstCell.font = headerFont;
    firstCell.fill = headerFill;
    firstCell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };

    sheet.getColumn('A').width = 100;
  }

  private addFieldDefinitionsSheet(workbook: ExcelJS.Workbook, metadata: TemplateMetadata) {
    const sheet = workbook.addWorksheet('Field Definitions', {
      properties: { tabColor: { argb: 'FF92D050' } },
    });

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF70AD47' } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
    };

    // Add headers
    sheet.columns = [
      { header: 'Field Name', width: 20 },
      { header: 'Display Name', width: 25 },
      { header: 'Description', width: 40 },
      { header: 'Data Type', width: 15 },
      { header: 'Required', width: 10 },
      { header: 'Validation Rules', width: 40 },
      { header: 'Valid Values/Examples', width: 40 },
    ];

    // Apply header styling
    sheet.getRow(1).eachCell(cell => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
    });

    // Add field definitions
    const rows = metadata.fields.map(field => [
      field.name,
      field.displayName,
      field.description,
      field.dataType.toUpperCase(),
      field.required ? 'Yes' : 'No',
      this.buildValidationRulesString(field),
      field.enumValues ? field.enumValues.join(', ') : `Example: ${field.example}`,
    ]);

    sheet.addRows(rows);

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private addDataSheet(workbook: ExcelJS.Workbook, metadata: TemplateMetadata, sheetName?: string) {
    const sheet = workbook.addWorksheet(sheetName || 'Data', {
      properties: { tabColor: { argb: 'FF4472C4' } },
    });

    // Create columns
    sheet.columns = metadata.fields.map(field => ({
      header: field.required ? `${field.displayName} *` : field.displayName,
      width: Math.min(30, Math.max(15, field.displayName.length + 2)),
    }));

    // Style header row
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    });

    // Add example data rows
    const dataRows = metadata.exampleData.map(example =>
      metadata.fields.map(field => example[field.name] ?? '')
    );
    sheet.addRows(dataRows);

    // Add data validation for enum fields
    this.addDataValidations(sheet, metadata);

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private addEnumValuesSheet(workbook: ExcelJS.Workbook, enumFields: any[]) {
    const sheet = workbook.addWorksheet('Valid Values', {
      properties: { tabColor: { argb: 'FFFFC000' } },
    });

    // Create columns for each enum field
    sheet.columns = enumFields.map((field, index) => ({
      header: field.displayName,
      width: 30,
    }));

    // Style header
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF4B084' } };
      cell.alignment = { horizontal: 'center', vertical: 'center' };
    });

    // Find max enum values length
    const maxLength = Math.max(...enumFields.map(f => f.enumValues?.length || 0));

    // Add enum values
    for (let i = 0; i < maxLength; i++) {
      const row: any[] = [];
      for (const field of enumFields) {
        row.push(field.enumValues?.[i] || '');
      }
      sheet.addRow(row);
    }

    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private addDataValidations(sheet: ExcelJS.Worksheet, metadata: TemplateMetadata) {
    const startRow = 2; // Data starts at row 2 (after header)
    const maxRows = 1000; // Allow up to 1000 rows of data

    metadata.fields.forEach((field, colIndex) => {
      const colLetter = String.fromCharCode(65 + colIndex); // A, B, C, etc.
      const range = `${colLetter}${startRow}:${colLetter}${startRow + maxRows}`;

      if (field.dataType === 'enum' && field.enumValues) {
        sheet.dataValidations.add({
          type: 'list',
          formula1: `"${field.enumValues.join(',')}"`,
          showInputMessage: true,
          showErrorMessage: true,
          errorTitle: 'Invalid Value',
          error: `Must be one of: ${field.enumValues.join(', ')}`,
          promptTitle: field.displayName,
          prompt: `Enter a valid value for ${field.displayName}`,
          sqref: range,
        });
      }
    });
  }

  private buildValidationRulesString(field: any): string {
    const rules: string[] = [];

    if (field.required) rules.push('Required');
    if (field.maxLength) rules.push(`Max length: ${field.maxLength}`);
    if (field.minValue !== undefined) rules.push(`Min value: ${field.minValue}`);
    if (field.maxValue !== undefined) rules.push(`Max value: ${field.maxValue}`);
    if (field.pattern) rules.push(`Pattern: ${field.pattern}`);
    if (field.dataType === 'enum') rules.push('Enum validation');

    return rules.join(' | ') || 'None';
  }
}

// Export singleton instance
export const templateGeneratorService = new TemplateGeneratorService();
