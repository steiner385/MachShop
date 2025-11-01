/**
 * Serial Number Format Types (Issue #149)
 * Type definitions for the configurable serial number format engine
 */

// Pattern Components
export type PatternComponentType =
  | 'PREFIX'
  | 'YYYY'
  | 'YY'
  | 'MM'
  | 'DD'
  | 'WW'
  | 'SEQ'
  | 'RANDOM'
  | 'SITE'
  | 'PART'
  | 'CHECK'
  | 'UUID';

export type CheckAlgorithm = 'luhn' | 'mod10' | 'custom';

export type RandomType = 'alpha' | 'numeric' | 'alphanumeric';

export type CounterResetRule = 'daily' | 'monthly' | 'yearly' | null;

// Pattern Component Interface
export interface PatternComponent {
  type: PatternComponentType;
  position: number;
  length?: number;
  config?: Record<string, string | number>;
  rawText: string; // Original {COMPONENT:CONFIG} text
}

// Parsed Pattern
export interface ParsedPattern {
  rawPattern: string;
  components: PatternComponent[];
  fixedLength?: number; // Total fixed length if deterministic
  isDeterministic: boolean; // True if length is always the same
  metadata: PatternMetadata;
}

export interface PatternMetadata {
  hasSequential: boolean;
  hasRandom: boolean;
  hasCheckDigit: boolean;
  hasDate: boolean;
  estimatedLength: number; // Average/typical length
  maxLength: number; // Maximum possible length
  minLength: number; // Minimum possible length
}

// Generation Context
export interface GenerationContext {
  formatConfigId: string;
  siteId: string;
  partId?: string;
  timestamp?: Date;
  customValues?: Record<string, string | number>;
}

// Validation Result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

// Syntax Validation Result
export interface SyntaxValidation {
  isValid: boolean;
  errors: Array<{
    position: number;
    message: string;
    component: string;
  }>;
}

// Format Config DTO
export interface FormatConfigDTO {
  name: string;
  description?: string;
  patternTemplate: string;
  siteId: string;
  isActive?: boolean;
  validationRules?: Record<string, any>;
  sequentialCounterStart?: number;
  sequentialCounterIncrement?: number;
  counterResetRule?: CounterResetRule;
}

export interface CreateFormatConfigDTO extends FormatConfigDTO {
  createdBy?: string;
}

export interface UpdateFormatConfigDTO extends Partial<FormatConfigDTO> {
  id: string;
}

// Part Assignment Options
export interface AssignmentOptions {
  isDefault?: boolean;
  priority?: number;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}

// Counter Status
export interface CounterStatus {
  formatConfigId: string;
  currentValue: number;
  lastGenerated?: Date;
  totalGenerated: number;
  totalUsed: number;
  duplicateAttempts: number;
  nextValue: number;
}

// Usage Statistics
export interface UsageStatistics {
  formatConfigId: string;
  totalGenerated: number;
  totalUsed: number;
  duplicateAttempts: number;
  lastGeneratedDate?: Date;
  counterResetDate?: Date;
  averageGenerationTime?: number; // milliseconds
}

// Preview Result
export interface PreviewResult {
  pattern: string;
  examples: Array<{
    serial: string;
    components: Record<string, string>;
  }>;
  statistics: {
    minLength: number;
    maxLength: number;
    estimatedLength: number;
  };
}

// Uniqueness Scope
export type UniquenessScope = 'global' | 'site' | 'part' | 'part_family';

// Check Digit Result
export interface CheckDigitResult {
  algorithm: CheckAlgorithm;
  checkDigit: string;
  value: string; // Value with check digit appended
  isValid?: boolean; // For validation
}

// Filter Options
export interface FilterOptions {
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

// Export Serialization Results
export interface SerializationResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
