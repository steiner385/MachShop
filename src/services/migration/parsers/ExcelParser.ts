/**
 * Excel File Parser for Bulk Import (Issue #32)
 * Supports XLSX files with single and multi-sheet parsing
 */

import { existsSync } from 'fs';
import { Readable } from 'stream';
import * as ExcelJS from 'exceljs';
import { BaseParser, FileFormat, ParseOptions, ParseResult, StreamParseOptions, ParseError, ExcelSheet } from './types';
import { logger } from '../../../utils/logger';

export class ExcelParser implements BaseParser {
  private format: FileFormat = 'excel';

  getFormat(): FileFormat {
    return this.format;
  }

  /**
   * Parse single sheet from Excel file into memory
   */
  async parse(filePath: string, options: ParseOptions = {}): Promise<ParseResult> {
    const { sheetName, hasHeader = true, maxRows } = options;

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const errors: ParseError[] = [];
    const data: any[] = [];
    let headers: string[] = [];

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      // Get sheet
      let worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];

      if (!worksheet) {
        throw new Error(`Sheet not found: ${sheetName || 'first sheet'}`);
      }

      let rowIndex = 0;

      worksheet.eachRow((row, rowNumber) => {
        rowIndex++;

        // Extract headers from first row
        if (rowIndex === 1 && hasHeader) {
          headers = row.values
            ? (Array.isArray(row.values) ? row.values : Object.values(row.values)).map(String)
            : [];
          return;
        }

        // Stop if max rows reached
        if (maxRows && rowIndex - 1 > maxRows) {
          return;
        }

        // Convert row values to object
        const values = row.values;
        if (!values || (Array.isArray(values) && values.length === 0)) {
          return; // Skip empty rows
        }

        const rowObj = this.rowToObject(values, headers);
        if (Object.keys(rowObj).length > 0) {
          data.push(rowObj);
        }
      });

      logger.info(`Parsed Excel sheet: ${filePath}`, {
        sheet: sheetName || worksheet.name,
        totalRows: data.length,
        headers: headers.length,
        errors: errors.length,
      });

      return {
        format: this.format,
        totalRows: data.length,
        headers,
        data,
        errors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Excel parse error: ${message}`, { filePath });
      throw new Error(`Failed to parse Excel file: ${message}`);
    }
  }

  /**
   * Parse all sheets from Excel file
   */
  async parseAllSheets(filePath: string, options: ParseOptions = {}): Promise<Map<string, any[]>> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const results = new Map<string, any[]>();

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      for (const worksheet of workbook.worksheets) {
        const sheetData: any[] = [];
        let isFirst = true;
        let headers: string[] = [];

        worksheet.eachRow((row) => {
          const values = row.values;

          if (isFirst) {
            headers = values ? (Array.isArray(values) ? values : Object.values(values)).map(String) : [];
            isFirst = false;
            return;
          }

          const rowObj = this.rowToObject(values, headers);
          if (Object.keys(rowObj).length > 0) {
            sheetData.push(rowObj);
          }
        });

        results.set(worksheet.name, sheetData);
      }

      logger.info(`Parsed all Excel sheets: ${filePath}`, {
        sheetCount: results.size,
        sheets: Array.from(results.keys()),
      });

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Excel multi-sheet parse error: ${message}`, { filePath });
      throw new Error(`Failed to parse Excel sheets: ${message}`);
    }
  }

  /**
   * Stream-based parsing for large Excel sheets
   * Processes rows using callback to avoid loading entire sheet into memory
   */
  async parseStream(stream: Readable, options: StreamParseOptions): Promise<void> {
    const { sheetName, hasHeader = true, callback, onProgress } = options;

    let headers: string[] = [];
    let processed = 0;
    let rowNumber = 0;
    let isFirstRow = true;

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.read(stream);

      let worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];

      if (!worksheet) {
        throw new Error(`Sheet not found: ${sheetName || 'first sheet'}`);
      }

      worksheet.eachRow(async (row) => {
        rowNumber++;

        if (isFirstRow && hasHeader) {
          headers = row.values ? (Array.isArray(row.values) ? row.values : Object.values(row.values)).map(String) : [];
          isFirstRow = false;
          return;
        }

        const rowObj = this.rowToObject(row.values, headers);
        if (Object.keys(rowObj).length > 0) {
          try {
            await callback(rowObj, rowNumber);
            processed++;

            if (onProgress && processed % 1000 === 0) {
              onProgress({ processed });
            }
          } catch (error) {
            logger.error(`Row processing error at row ${rowNumber}`, { error });
            throw error;
          }
        }
      });

      if (onProgress) {
        onProgress({ processed });
      }

      logger.info(`Excel stream parsing complete`, { processedRows: processed });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Excel stream parse error: ${message}`);
      throw new Error(`Failed to parse Excel stream: ${message}`);
    }
  }

  /**
   * Validate Excel file structure
   */
  async validateStructure(filePath: string): Promise<{ valid: boolean; errors: ParseError[] }> {
    const errors: ParseError[] = [];

    if (!existsSync(filePath)) {
      return {
        valid: false,
        errors: [{ message: 'File not found' }],
      };
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      if (workbook.worksheets.length === 0) {
        return {
          valid: false,
          errors: [{ message: 'No worksheets found in file' }],
        };
      }

      return {
        valid: true,
        errors: [],
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }],
      };
    }
  }

  /**
   * Get sheet names from Excel file
   */
  async getSheetNames(filePath: string): Promise<string[]> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      return workbook.worksheets.map((ws) => ws.name);
    } catch (error) {
      logger.error('Failed to get sheet names', { error });
      throw error;
    }
  }

  /**
   * Get headers from first row of Excel sheet
   */
  async getHeaders(filePath: string, sheetName?: string): Promise<string[]> {
    try {
      const result = await this.parse(filePath, { sheetName, maxRows: 0 });
      return result.headers || [];
    } catch (error) {
      logger.error('Failed to extract headers', { error });
      throw error;
    }
  }

  /**
   * Estimate total rows in Excel sheet
   */
  async estimateRowCount(filePath: string, sheetName?: string): Promise<number> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('Worksheet not found');
      }

      // Subtract 1 for header row
      return Math.max(0, (worksheet.rowCount || 0) - 1);
    } catch (error) {
      logger.error('Failed to estimate row count', { error });
      throw error;
    }
  }

  /**
   * Helper: Convert row values to object using headers as keys
   */
  private rowToObject(values: any, headers: string[]): Record<string, any> {
    const obj: Record<string, any> = {};

    if (!values) {
      return obj;
    }

    const valueArray = Array.isArray(values) ? values : Object.values(values);

    headers.forEach((header, index) => {
      obj[header] = valueArray[index] ?? null;
    });

    return obj;
  }
}

export const excelParser = new ExcelParser();
