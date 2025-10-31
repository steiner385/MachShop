/**
 * Parser Factory for Auto-Detection (Issue #32)
 * Auto-detects file format from extension and content
 */

import { existsSync, readFileSync } from 'fs';
import { csvParser } from './CSVParser';
import { excelParser } from './ExcelParser';
import { jsonParser } from './JSONParser';
import { BaseParser, FileFormat } from './types';
import { logger } from '../../../utils/logger';

export class ParserFactory {
  /**
   * Get appropriate parser based on file extension
   */
  static getParserByExtension(filePath: string): BaseParser {
    const ext = this.getFileExtension(filePath).toLowerCase();

    switch (ext) {
      case '.csv':
      case '.txt':
        return csvParser;
      case '.xlsx':
      case '.xls':
      case '.xlsm':
        return excelParser;
      case '.json':
      case '.ndjson':
      case '.jsonl':
        return jsonParser;
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  /**
   * Get appropriate parser by detecting file content (magic bytes)
   */
  static getParserByContent(filePath: string): BaseParser {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      // Read first 512 bytes for magic byte detection
      const buffer = readFileSync(filePath, { flag: 'r' });
      const header = buffer.toString('utf-8', 0, 512);

      // Check for Excel file (ZIP format with specific content)
      if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
        // ZIP magic bytes (PK)
        if (header.includes('xl') || header.includes('workbook')) {
          return excelParser;
        }
      }

      // Check for JSON (starts with { or [ or whitespace followed by { or [)
      const trimmedHeader = header.trim();
      if (trimmedHeader.startsWith('{') || trimmedHeader.startsWith('[')) {
        return jsonParser;
      }

      // Check for NDJSON (lines starting with {)
      const lines = header.split('\n').slice(0, 5);
      if (lines.some((line) => line.trim().startsWith('{'))) {
        return jsonParser;
      }

      // Default to CSV if no specific magic bytes detected
      return csvParser;
    } catch (error) {
      logger.error('Failed to detect format by content', { filePath, error });
      // Fallback to extension-based detection
      return this.getParserByExtension(filePath);
    }
  }

  /**
   * Get parser with auto-detection (tries extension first, then content)
   */
  static getParser(filePath: string): BaseParser {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      // First try extension-based detection (faster)
      return this.getParserByExtension(filePath);
    } catch (error) {
      logger.warn(`Extension-based detection failed, trying content detection`, { filePath });

      // Fall back to content detection
      return this.getParserByContent(filePath);
    }
  }

  /**
   * Get all supported formats
   */
  static getSupportedFormats(): FileFormat[] {
    return ['csv', 'excel', 'json'];
  }

  /**
   * Get supported file extensions for a format
   */
  static getSupportedExtensions(format: FileFormat): string[] {
    switch (format) {
      case 'csv':
        return ['.csv', '.txt'];
      case 'excel':
        return ['.xlsx', '.xls', '.xlsm'];
      case 'json':
        return ['.json', '.ndjson', '.jsonl'];
      default:
        return [];
    }
  }

  /**
   * Get file extension
   */
  private static getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    if (lastDot === -1) {
      throw new Error(`No file extension found: ${filePath}`);
    }
    return filePath.substring(lastDot);
  }

  /**
   * Validate that file exists and is readable
   */
  static validateFile(filePath: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!existsSync(filePath)) {
      errors.push('File not found');
      return { valid: false, errors };
    }

    try {
      const stats = require('fs').statSync(filePath);

      if (stats.size === 0) {
        errors.push('File is empty');
      }

      if (stats.size > 1024 * 1024 * 500) {
        // 500MB limit for initial load
        errors.push('File exceeds 500MB limit');
      }
    } catch (error) {
      errors.push(`File validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get estimated row count (format-specific)
   */
  static async estimateRowCount(filePath: string): Promise<number> {
    const parser = this.getParser(filePath);

    try {
      return await parser.estimateRowCount(filePath);
    } catch (error) {
      logger.error('Failed to estimate row count', { filePath, error });
      return -1; // Indicate unknown
    }
  }

  /**
   * Get file format from path
   */
  static getFormat(filePath: string): FileFormat {
    const ext = this.getFileExtension(filePath).toLowerCase();

    if (['.csv', '.txt'].includes(ext)) {
      return 'csv';
    } else if (['.xlsx', '.xls', '.xlsm'].includes(ext)) {
      return 'excel';
    } else if (['.json', '.ndjson', '.jsonl'].includes(ext)) {
      return 'json';
    }

    throw new Error(`Unknown format: ${ext}`);
  }
}
