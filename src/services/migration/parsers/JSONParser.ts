/**
 * JSON File Parser for Bulk Import (Issue #32)
 * Supports JSON objects, arrays, and newline-delimited JSON (NDJSON)
 */

import { createReadStream, existsSync } from 'fs';
import { Readable, Transform } from 'stream';
import { BaseParser, FileFormat, ParseOptions, ParseResult, StreamParseOptions, ParseError } from './types';
import { logger } from '../../../utils/logger';

export class JSONParser implements BaseParser {
  private format: FileFormat = 'json';

  getFormat(): FileFormat {
    return this.format;
  }

  /**
   * Parse JSON file (object, array, or NDJSON)
   */
  async parse(filePath: string, options: ParseOptions = {}): Promise<ParseResult> {
    const { maxRows } = options;

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const errors: ParseError[] = [];
    const data: any[] = [];
    let headers: string[] = [];

    try {
      const content = require('fs').readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Handle different JSON structures
      let records: any[] = [];

      if (Array.isArray(parsed)) {
        // JSON array
        records = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Single object or object with array property
        if (Array.isArray(parsed.data)) {
          records = parsed.data;
        } else if (Array.isArray(parsed.records)) {
          records = parsed.records;
        } else if (Array.isArray(parsed.items)) {
          records = parsed.items;
        } else {
          // Single object
          records = [parsed];
        }
      } else {
        throw new Error('JSON must be object or array');
      }

      // Extract headers from first record
      if (records.length > 0 && typeof records[0] === 'object') {
        headers = Object.keys(records[0]);
      }

      // Limit rows if specified
      const limitedRecords = maxRows ? records.slice(0, maxRows) : records;

      data.push(...limitedRecords);

      logger.info(`Parsed JSON file: ${filePath}`, {
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
      logger.error(`JSON parse error: ${message}`, { filePath });
      throw new Error(`Failed to parse JSON file: ${message}`);
    }
  }

  /**
   * Stream-based parsing for NDJSON (newline-delimited JSON)
   * Each line should be a valid JSON object
   */
  async parseStream(stream: Readable, options: StreamParseOptions): Promise<void> {
    const { callback, onProgress } = options;
    let processed = 0;
    let lineNumber = 0;
    const readline = require('readline');

    try {
      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        lineNumber++;

        // Skip empty lines
        if (!line.trim()) {
          continue;
        }

        try {
          const record = JSON.parse(line);

          if (typeof record === 'object' && record !== null) {
            await callback(record, lineNumber);
            processed++;

            if (onProgress && processed % 1000 === 0) {
              onProgress({ processed });
            }
          }
        } catch (error) {
          logger.error(`JSON parse error at line ${lineNumber}`, { error, line: line.substring(0, 100) });
          throw new Error(`Invalid JSON at line ${lineNumber}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (onProgress) {
        onProgress({ processed });
      }

      logger.info(`JSON stream parsing complete`, { processedRows: processed });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`JSON stream parse error: ${message}`);
      throw new Error(`Failed to parse JSON stream: ${message}`);
    }
  }

  /**
   * Validate JSON file structure
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
      const content = require('fs').readFileSync(filePath, 'utf-8');
      JSON.parse(content);

      return {
        valid: true,
        errors: [],
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error instanceof Error ? error.message : 'Invalid JSON' }],
      };
    }
  }

  /**
   * Get headers from JSON file
   */
  async getHeaders(filePath: string): Promise<string[]> {
    try {
      const result = await this.parse(filePath, { maxRows: 1 });
      return result.headers || [];
    } catch (error) {
      logger.error('Failed to extract headers', { error });
      throw error;
    }
  }

  /**
   * Estimate total rows in JSON file
   * For NDJSON, count lines; for JSON arrays, parse and count
   */
  async estimateRowCount(filePath: string): Promise<number> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      const readline = require('readline');
      const fs = require('fs');

      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });

      let lineCount = 0;

      for await (const line of rl) {
        if (line.trim()) {
          lineCount++;
        }
      }

      // For NDJSON files, line count is row count
      // For regular JSON, this is an estimate
      return lineCount;
    } catch (error) {
      logger.error('Failed to estimate row count', { error });
      throw error;
    }
  }
}

export const jsonParser = new JSONParser();
