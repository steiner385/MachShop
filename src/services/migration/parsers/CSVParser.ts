/**
 * CSV File Parser for Bulk Import (Issue #32)
 * Supports RFC 4180 compliant CSV parsing with streaming for large files
 */

import { createReadStream, existsSync } from 'fs';
import { Readable } from 'stream';
import { parse } from 'csv-parse';
import { BaseParser, FileFormat, ParseOptions, ParseResult, StreamParseOptions, ParseError } from './types';
import { logger } from '../../../utils/logger';

export class CSVParser implements BaseParser {
  private format: FileFormat = 'csv';

  getFormat(): FileFormat {
    return this.format;
  }

  /**
   * Parse entire CSV file into memory
   */
  async parse(filePath: string, options: ParseOptions = {}): Promise<ParseResult> {
    const { delimiter = ',', skipEmptyLines = true, trimValues = true, hasHeader = true, maxRows } = options;

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const errors: ParseError[] = [];
    const data: any[] = [];
    let headers: string[] = [];
    let rowNumber = 0;
    let totalRows = 0;

    try {
      const parser = createReadStream(filePath).pipe(
        parse({
          delimiter,
          skip_empty_lines: skipEmptyLines,
          trim: trimValues,
          relax_column_count: true,
          on_error(err) {
            errors.push({ row: rowNumber, message: err.message });
          },
        })
      );

      let isFirstRow = true;

      for await (const record of parser) {
        rowNumber++;
        totalRows++;

        // Extract headers from first row
        if (isFirstRow && hasHeader) {
          headers = Array.isArray(record) ? record : Object.keys(record);
          isFirstRow = false;
          continue;
        }

        // Stop if max rows reached
        if (maxRows && totalRows > maxRows) {
          break;
        }

        // Convert array to object if needed
        const row = Array.isArray(record)
          ? this.arrayToObject(record, headers)
          : record;

        data.push(row);
      }

      logger.info(`Parsed CSV file: ${filePath}`, {
        totalRows,
        dataRows: data.length,
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
      logger.error(`CSV parse error: ${message}`, { filePath });
      throw new Error(`Failed to parse CSV file: ${message}`);
    }
  }

  /**
   * Stream-based parsing for large CSV files
   * Processes rows using callback to avoid loading entire file into memory
   */
  async parseStream(stream: Readable, options: StreamParseOptions): Promise<void> {
    const {
      delimiter = ',',
      skipEmptyLines = true,
      trimValues = true,
      hasHeader = true,
      callback,
      batchSize = 100,
      onProgress,
    } = options;

    let headers: string[] = [];
    let processed = 0;
    let rowNumber = 0;
    let isFirstRow = true;

    try {
      const parser = stream.pipe(
        parse({
          delimiter,
          skip_empty_lines: skipEmptyLines,
          trim: trimValues,
          relax_column_count: true,
        })
      );

      for await (const record of parser) {
        rowNumber++;

        // Extract headers from first row
        if (isFirstRow && hasHeader) {
          headers = Array.isArray(record) ? record : Object.keys(record);
          isFirstRow = false;
          continue;
        }

        // Convert array to object if needed
        const row = Array.isArray(record) ? this.arrayToObject(record, headers) : record;

        try {
          await callback(row, rowNumber);
          processed++;

          // Report progress periodically
          if (onProgress && processed % (batchSize * 10) === 0) {
            onProgress({ processed });
          }
        } catch (error) {
          logger.error(`Row processing error at row ${rowNumber}`, { error });
          throw error;
        }
      }

      if (onProgress) {
        onProgress({ processed });
      }

      logger.info(`CSV stream parsing complete`, { processedRows: processed });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`CSV stream parse error: ${message}`);
      throw new Error(`Failed to parse CSV stream: ${message}`);
    }
  }

  /**
   * Validate CSV file structure
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
      const result = await this.parse(filePath, { maxRows: 10 });
      return {
        valid: result.errors.length === 0,
        errors: result.errors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }],
      };
    }
  }

  /**
   * Get headers from CSV file
   */
  async getHeaders(filePath: string): Promise<string[]> {
    try {
      const result = await this.parse(filePath, { maxRows: 0 });
      return result.headers || [];
    } catch (error) {
      logger.error('Failed to extract headers', { error });
      throw error;
    }
  }

  /**
   * Estimate total rows in CSV file (line count - 1 for header)
   */
  async estimateRowCount(filePath: string): Promise<number> {
    const fs = require('fs');
    const readline = require('readline');

    return new Promise((resolve, reject) => {
      let lineCount = 0;
      const stream = fs.createReadStream(filePath);

      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

      rl.on('line', () => {
        lineCount++;
      });

      rl.on('close', () => {
        // Subtract 1 for header row
        resolve(Math.max(0, lineCount - 1));
      });

      rl.on('error', reject);
    });
  }

  /**
   * Helper: Convert array to object using headers as keys
   */
  private arrayToObject(array: any[], headers: string[]): Record<string, any> {
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      obj[header] = array[index] ?? null;
    });
    return obj;
  }
}

export const csvParser = new CSVParser();
