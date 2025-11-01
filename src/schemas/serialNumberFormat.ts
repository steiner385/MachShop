/**
 * Serial Number Format Validation Schemas (Issue #149)
 * Zod schemas for API request/response validation
 */

import { z } from 'zod';

// Create Format Config Schema
export const CreateFormatConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Format name is required')
    .max(255, 'Format name must be 255 characters or less'),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),
  patternTemplate: z
    .string()
    .min(1, 'Pattern template is required')
    .regex(
      /\{[A-Z_]+/,
      'Pattern must contain at least one component like {YYYY} or {SEQ:6}'
    ),
  isActive: z.boolean().default(true),
  validationRules: z.record(z.any()).optional(),
  sequentialCounterStart: z
    .number()
    .int()
    .min(0, 'Counter start must be >= 0')
    .default(1),
  sequentialCounterIncrement: z
    .number()
    .int()
    .min(1, 'Counter increment must be >= 1')
    .default(1),
  counterResetRule: z
    .enum(['daily', 'monthly', 'yearly'])
    .optional()
    .nullable(),
});

// Update Format Config Schema (all fields optional)
export const UpdateFormatConfigSchema = CreateFormatConfigSchema.partial().strict();

// Assign Format to Part Schema
export const AssignFormatToPartSchema = z.object({
  partId: z.string().min(1, 'Part ID is required'),
  isDefault: z.boolean().default(false),
  priority: z.number().int().min(0).default(0),
  effectiveFrom: z.date().default(() => new Date()),
  effectiveUntil: z.date().optional(),
});

// Generate Serial Schema
export const GenerateSerialSchema = z.object({
  formatConfigId: z.string().min(1, 'Format config ID is required'),
  context: z
    .object({
      siteId: z.string(),
      partId: z.string().optional(),
      customValues: z.record(z.string().or(z.number())).optional(),
    })
    .optional(),
});

// Generate Serial Batch Schema
export const GenerateSerialBatchSchema = z.object({
  formatConfigId: z.string().min(1, 'Format config ID is required'),
  count: z
    .number()
    .int()
    .min(1, 'Count must be at least 1')
    .max(10000, 'Count cannot exceed 10,000'),
  context: z
    .object({
      siteId: z.string(),
      partId: z.string().optional(),
      customValues: z.record(z.string().or(z.number())).optional(),
    })
    .optional(),
});

// Validate Serial Schema
export const ValidateSerialSchema = z.object({
  serial: z.string().min(1, 'Serial number is required'),
  formatConfigId: z.string().optional(),
});

// Validate Pattern Schema
export const ValidatePatternSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required'),
});

// Preview Format Schema
export const PreviewFormatSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required'),
  count: z
    .number()
    .int()
    .min(1, 'Count must be at least 1')
    .max(100, 'Count cannot exceed 100')
    .default(5),
});

// Check Uniqueness Schema
export const CheckUniquenessSchema = z.object({
  serial: z.string().min(1, 'Serial number is required'),
  scope: z.enum(['global', 'site', 'part']).optional(),
});

// Check Batch Uniqueness Schema
export const CheckBatchUniquenessSchema = z.object({
  serials: z
    .array(z.string().min(1))
    .min(1, 'At least one serial is required')
    .max(1000, 'Cannot check more than 1000 serials at once'),
  scope: z.enum(['global', 'site', 'part']).optional(),
});

// Reset Counter Schema
export const ResetCounterSchema = z.object({
  formatConfigId: z.string().min(1, 'Format config ID is required'),
});

// List Formats Query Schema
export const ListFormatsQuerySchema = z.object({
  siteId: z.string().min(1, 'Site ID is required'),
  isActive: z.boolean().optional(),
  search: z.string().max(255).optional(),
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(100).default(20),
});

// Export types inferred from schemas
export type CreateFormatConfigInput = z.infer<typeof CreateFormatConfigSchema>;
export type UpdateFormatConfigInput = z.infer<typeof UpdateFormatConfigSchema>;
export type AssignFormatToPartInput = z.infer<typeof AssignFormatToPartSchema>;
export type GenerateSerialInput = z.infer<typeof GenerateSerialSchema>;
export type GenerateSerialBatchInput = z.infer<typeof GenerateSerialBatchSchema>;
export type ValidateSerialInput = z.infer<typeof ValidateSerialSchema>;
export type ValidatePatternInput = z.infer<typeof ValidatePatternSchema>;
export type PreviewFormatInput = z.infer<typeof PreviewFormatSchema>;
export type CheckUniquenessInput = z.infer<typeof CheckUniquenessSchema>;
export type CheckBatchUniquenessInput = z.infer<typeof CheckBatchUniquenessSchema>;
export type ListFormatsQueryInput = z.infer<typeof ListFormatsQuerySchema>;
