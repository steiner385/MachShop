/**
 * Type definitions for bulk import parsers (Issue #32)
 */

import { Readable } from 'stream';

export type FileFormat = 'csv' | 'excel' | 'json';

export interface ParseOptions {
  encoding?: string;
  delimiter?: string; // CSV only
  skipEmptyLines?: boolean;
  trimValues?: boolean;
  hasHeader?: boolean;
  sheetName?: string; // Excel only
  maxRows?: number;
}

export interface ParseResult {
  format: FileFormat;
  totalRows: number;
  headers?: string[];
  data: any[];
  errors: ParseError[];
}

export interface StreamParseOptions extends ParseOptions {
  callback: (row: any, rowNumber: number) => Promise<void>;
  batchSize?: number;
  onProgress?: (progress: { processed: number; total?: number }) => void;
}

export interface ParseError {
  row?: number;
  column?: string;
  message: string;
  value?: any;
}

export interface BaseParser {
  // Parse entire file into memory
  parse(filePath: string, options?: ParseOptions): Promise<ParseResult>;

  // Stream-based parsing for large files
  parseStream(stream: Readable, options: StreamParseOptions): Promise<void>;

  // Get file format
  getFormat(): FileFormat;

  // Validate file structure
  validateStructure(filePath: string): Promise<{ valid: boolean; errors: ParseError[] }>;

  // Get headers/schema
  getHeaders(filePath: string): Promise<string[]>;

  // Estimate total rows without full parse
  estimateRowCount(filePath: string): Promise<number>;
}

export interface CellRef {
  row: number;
  column: string;
  value: any;
}

export interface ExcelSheet {
  name: string;
  rowCount: number;
  colCount: number;
  headers: string[];
  data: any[];
}
