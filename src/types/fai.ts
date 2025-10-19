import { z } from 'zod';

/**
 * AS9102 First Article Inspection (FAI) Types
 *
 * Implements AS9102 Rev C standard for aerospace First Article Inspection
 *
 * Forms:
 * - Form 1: Part Number Accountability
 * - Form 2: Product Accountability
 * - Form 3: Characteristic Accountability
 */

// ============================================================================
// Enums
// ============================================================================

export enum FAIStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUPERSEDED = 'SUPERSEDED',
}

export enum CharacteristicResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  NA = 'N/A',
}

export enum InspectionMethod {
  CMM = 'CMM',
  MANUAL = 'MANUAL',
  GAGE = 'GAGE',
  OPTICAL = 'OPTICAL',
  FUNCTIONAL = 'FUNCTIONAL',
  VISUAL = 'VISUAL',
}

export enum ToleranceType {
  BILATERAL = 'BILATERAL',
  UNILATERAL_PLUS = 'UNILATERAL_PLUS',
  UNILATERAL_MINUS = 'UNILATERAL_MINUS',
  NOMINAL = 'NOMINAL',
}

// ============================================================================
// Form 1: Part Number Accountability
// ============================================================================

export interface FAIForm1Data {
  // Part identification
  partNumber: string;
  partName: string;
  drawingNumber: string;
  drawingRevision: string;
  additionalChanges?: string;

  // Organization information
  manufacturerName: string;
  manufacturerCode?: string;
  supplierName?: string;
  supplierCode?: string;

  // Purchase order information
  purchaseOrderNumber?: string;
  purchaseOrderDate?: Date;

  // Manufacturing information
  manufacturingProcessReference?: string;
  serialNumber?: string;
  lotNumber?: string;

  // Functional test procedure
  functionalTestProcedure?: string;
  functionalTestResults?: string;
}

export const FAIForm1Schema = z.object({
  partNumber: z.string().min(1, 'Part number is required'),
  partName: z.string().min(1, 'Part name is required'),
  drawingNumber: z.string().min(1, 'Drawing number is required'),
  drawingRevision: z.string().min(1, 'Drawing revision is required'),
  additionalChanges: z.string().optional(),
  manufacturerName: z.string().min(1, 'Manufacturer name is required'),
  manufacturerCode: z.string().optional(),
  supplierName: z.string().optional(),
  supplierCode: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  purchaseOrderDate: z.date().optional(),
  manufacturingProcessReference: z.string().optional(),
  serialNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  functionalTestProcedure: z.string().optional(),
  functionalTestResults: z.string().optional(),
});

// ============================================================================
// Form 2: Product Accountability
// ============================================================================

export interface FAIForm2Data {
  // Product information
  quantity: number;
  unitOfMeasure: string;

  // Verification information
  verificationDate?: Date;
  verificationLocation?: string;

  // Quality system information
  qualitySystemReference?: string;
  procedureReference?: string;

  // Material information
  materialSpecification?: string;
  materialCertification?: string;
  materialHeatNumber?: string;

  // Special processes
  specialProcesses?: SpecialProcess[];

  // Design differences
  designDifferences?: string;
  designDifferenceApproval?: string;
}

export interface SpecialProcess {
  processName: string;
  processorName: string;
  certificateNumber?: string;
  expirationDate?: Date;
}

export const SpecialProcessSchema = z.object({
  processName: z.string().min(1, 'Process name is required'),
  processorName: z.string().min(1, 'Processor name is required'),
  certificateNumber: z.string().optional(),
  expirationDate: z.date().optional(),
});

export const FAIForm2Schema = z.object({
  quantity: z.number().positive('Quantity must be positive'),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  verificationDate: z.date().optional(),
  verificationLocation: z.string().optional(),
  qualitySystemReference: z.string().optional(),
  procedureReference: z.string().optional(),
  materialSpecification: z.string().optional(),
  materialCertification: z.string().optional(),
  materialHeatNumber: z.string().optional(),
  specialProcesses: z.array(SpecialProcessSchema).optional(),
  designDifferences: z.string().optional(),
  designDifferenceApproval: z.string().optional(),
});

// ============================================================================
// Form 3: Characteristic Accountability
// ============================================================================

export interface FAICharacteristic {
  id?: string;
  faiReportId?: string;
  characteristicNumber: number;

  // Characteristic details
  characteristic: string;
  specification: string;
  requirement?: string;

  // Tolerance information
  toleranceType?: ToleranceType;
  nominalValue?: number;
  upperLimit?: number;
  lowerLimit?: number;
  unitOfMeasure?: string;

  // Inspection method
  inspectionMethod?: InspectionMethod;
  inspectionFrequency?: string;

  // Measurement results
  measuredValues: number[];
  actualValue?: number;
  deviation?: number;
  result?: CharacteristicResult;

  // Verification
  notes?: string;
  verifiedById?: string;
  verifiedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CreateCharacteristicSchema = z.object({
  characteristicNumber: z.number().int().positive(),
  characteristic: z.string().min(1, 'Characteristic description is required'),
  specification: z.string().min(1, 'Specification is required'),
  requirement: z.string().optional(),
  toleranceType: z.nativeEnum(ToleranceType).optional(),
  nominalValue: z.number().optional(),
  upperLimit: z.number().optional(),
  lowerLimit: z.number().optional(),
  unitOfMeasure: z.string().optional(),
  inspectionMethod: z.nativeEnum(InspectionMethod).optional(),
  inspectionFrequency: z.string().optional(),
  measuredValues: z.array(z.number()).default([]),
  actualValue: z.number().optional(),
  deviation: z.number().optional(),
  result: z.nativeEnum(CharacteristicResult).optional(),
  notes: z.string().optional(),
});

export const UpdateCharacteristicSchema = CreateCharacteristicSchema.partial().extend({
  measuredValues: z.array(z.number()).optional(),
});

// ============================================================================
// FAI Report
// ============================================================================

export interface FAIReport {
  id: string;
  faiNumber: string;
  partId: string;
  workOrderId?: string;
  inspectionId?: string;
  status: FAIStatus;
  revisionLevel?: string;

  // Form data
  form1Data?: FAIForm1Data;
  form2Data?: FAIForm2Data;
  characteristics?: FAICharacteristic[];

  // Metadata
  createdById?: string;
  reviewedById?: string;
  approvedById?: string;
  reviewedAt?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateFAIReportSchema = z.object({
  faiNumber: z.string().min(1, 'FAI number is required'),
  partId: z.string().min(1, 'Part ID is required'),
  workOrderId: z.string().optional(),
  inspectionId: z.string().optional(),
  revisionLevel: z.string().optional(),
  form1Data: FAIForm1Schema.optional(),
  form2Data: FAIForm2Schema.optional(),
});

export const UpdateFAIReportSchema = z.object({
  status: z.nativeEnum(FAIStatus).optional(),
  form1Data: FAIForm1Schema.optional(),
  form2Data: FAIForm2Schema.optional(),
  reviewedById: z.string().optional(),
  approvedById: z.string().optional(),
});

// ============================================================================
// Query and Response Types
// ============================================================================

export interface FAIQueryParams {
  page?: number;
  pageSize?: number;
  status?: FAIStatus;
  partId?: string;
  search?: string;
  sortBy?: 'faiNumber' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface FAIListResponse {
  data: FAIReport[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateFAIReportInput {
  faiNumber: string;
  partId: string;
  workOrderId?: string;
  inspectionId?: string;
  revisionLevel?: string;
  form1Data?: FAIForm1Data;
  form2Data?: FAIForm2Data;
}

export interface UpdateFAIReportInput {
  status?: FAIStatus;
  form1Data?: FAIForm1Data;
  form2Data?: FAIForm2Data;
  reviewedById?: string;
  approvedById?: string;
}

export interface CreateCharacteristicInput {
  characteristicNumber: number;
  characteristic: string;
  specification: string;
  requirement?: string;
  toleranceType?: ToleranceType;
  nominalValue?: number;
  upperLimit?: number;
  lowerLimit?: number;
  unitOfMeasure?: string;
  inspectionMethod?: InspectionMethod;
  inspectionFrequency?: string;
  measuredValues?: number[];
  actualValue?: number;
  deviation?: number;
  result?: CharacteristicResult;
  notes?: string;
}

export interface UpdateCharacteristicInput {
  characteristic?: string;
  specification?: string;
  requirement?: string;
  toleranceType?: ToleranceType;
  nominalValue?: number;
  upperLimit?: number;
  lowerLimit?: number;
  unitOfMeasure?: string;
  inspectionMethod?: InspectionMethod;
  inspectionFrequency?: string;
  measuredValues?: number[];
  actualValue?: number;
  deviation?: number;
  result?: CharacteristicResult;
  notes?: string;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate characteristic measurement against tolerance
 */
export function validateCharacteristic(
  actualValue: number,
  nominalValue: number,
  upperLimit?: number,
  lowerLimit?: number,
  toleranceType?: ToleranceType
): CharacteristicResult {
  if (!upperLimit && !lowerLimit) {
    return CharacteristicResult.NA;
  }

  switch (toleranceType) {
    case ToleranceType.BILATERAL:
      if (upperLimit !== undefined && lowerLimit !== undefined) {
        const upper = nominalValue + upperLimit;
        const lower = nominalValue - lowerLimit;
        return actualValue >= lower && actualValue <= upper
          ? CharacteristicResult.PASS
          : CharacteristicResult.FAIL;
      }
      break;

    case ToleranceType.UNILATERAL_PLUS:
      if (upperLimit !== undefined) {
        const upper = nominalValue + upperLimit;
        return actualValue <= upper
          ? CharacteristicResult.PASS
          : CharacteristicResult.FAIL;
      }
      break;

    case ToleranceType.UNILATERAL_MINUS:
      if (lowerLimit !== undefined) {
        const lower = nominalValue - lowerLimit;
        return actualValue >= lower
          ? CharacteristicResult.PASS
          : CharacteristicResult.FAIL;
      }
      break;

    case ToleranceType.NOMINAL:
      return actualValue === nominalValue
        ? CharacteristicResult.PASS
        : CharacteristicResult.FAIL;

    default:
      // Default to bilateral if no type specified
      if (upperLimit !== undefined && lowerLimit !== undefined) {
        return actualValue >= lowerLimit && actualValue <= upperLimit
          ? CharacteristicResult.PASS
          : CharacteristicResult.FAIL;
      }
  }

  return CharacteristicResult.NA;
}

/**
 * Calculate deviation from nominal
 */
export function calculateDeviation(actualValue: number, nominalValue: number): number {
  return actualValue - nominalValue;
}

/**
 * Calculate average of measured values
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}
