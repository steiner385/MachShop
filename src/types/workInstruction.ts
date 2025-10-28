import { z } from 'zod';

// Enums
export enum WorkInstructionStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  SUPERSEDED = 'SUPERSEDED',
  ARCHIVED = 'ARCHIVED',
}

export enum WorkInstructionExecutionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export enum StepExecutionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

// GitHub Issue #18: Enhanced enums for document management
export enum WorkInstructionFormat {
  NATIVE = 'NATIVE',
  IMPORTED_PDF = 'IMPORTED_PDF',
  IMPORTED_DOC = 'IMPORTED_DOC',
  IMPORTED_PPT = 'IMPORTED_PPT',
}

// Zod validation schemas
export const CreateWorkInstructionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  version: z.string().default('1.0.0'),
  ecoNumber: z.string().optional(),
  // GitHub Issue #18: Document management fields
  contentFormat: z.nativeEnum(WorkInstructionFormat).default(WorkInstructionFormat.NATIVE),
  nativeContent: z.any().optional(),
  importedFromFile: z.string().optional(),
  exportTemplateId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  thumbnailUrl: z.string().optional(),
});

export const UpdateWorkInstructionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  version: z.string().optional(),
  status: z.nativeEnum(WorkInstructionStatus).optional(),
  effectiveDate: z.string().datetime().optional(),
  supersededDate: z.string().datetime().optional(),
  ecoNumber: z.string().optional(),
  // GitHub Issue #18: Document management fields
  contentFormat: z.nativeEnum(WorkInstructionFormat).optional(),
  nativeContent: z.any().optional(),
  importedFromFile: z.string().optional(),
  exportTemplateId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  thumbnailUrl: z.string().optional(),
});

export const CreateStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  imageUrls: z.array(z.string().url()).default([]),
  videoUrls: z.array(z.string().url()).default([]),
  attachmentUrls: z.array(z.string().url()).default([]),
  estimatedDuration: z.number().int().positive().optional(),
  isCritical: z.boolean().default(false),
  requiresSignature: z.boolean().default(false),
  dataEntryFields: z.record(z.any()).optional(), // JSON schema for data entry
});

export const UpdateStepSchema = z.object({
  stepNumber: z.number().int().positive().optional(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  imageUrls: z.array(z.string().url()).optional(),
  videoUrls: z.array(z.string().url()).optional(),
  attachmentUrls: z.array(z.string().url()).optional(),
  estimatedDuration: z.number().int().positive().optional(),
  isCritical: z.boolean().optional(),
  requiresSignature: z.boolean().optional(),
  dataEntryFields: z.record(z.any()).optional(),
});

// TypeScript types
export type CreateWorkInstructionInput = z.infer<typeof CreateWorkInstructionSchema>;
export type UpdateWorkInstructionInput = z.infer<typeof UpdateWorkInstructionSchema>;
export type CreateStepInput = z.infer<typeof CreateStepSchema>;
export type UpdateStepInput = z.infer<typeof UpdateStepSchema>;

// Response types
export interface WorkInstructionResponse {
  id: string;
  title: string;
  description: string | null;
  partId: string | null;
  operationId: string | null;
  version: string;
  status: WorkInstructionStatus;
  effectiveDate: Date | null;
  supersededDate: Date | null;
  ecoNumber: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  createdById: string;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
  steps?: WorkInstructionStepResponse[];
  createdBy?: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
  updatedBy?: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
  approvedBy?: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface WorkInstructionStepResponse {
  id: string;
  workInstructionId: string;
  stepNumber: number;
  title: string;
  content: string;
  imageUrls: string[];
  videoUrls: string[];
  attachmentUrls: string[];
  estimatedDuration: number | null;
  isCritical: boolean;
  requiresSignature: boolean;
  dataEntryFields: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkInstructionListResponse {
  data: WorkInstructionResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query parameters
export interface WorkInstructionQueryParams {
  page?: number;
  pageSize?: number;
  status?: WorkInstructionStatus;
  partId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'version';
  sortOrder?: 'asc' | 'desc';
}
