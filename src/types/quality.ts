export enum InspectionResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  CONDITIONAL = 'CONDITIONAL'
}

export enum NCRStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DISPOSITION_SET = 'DISPOSITION_SET',
  CLOSED = 'CLOSED'
}

export enum NCRSeverity {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL'
}

export enum NCRDisposition {
  REWORK = 'REWORK',
  REPAIR = 'REPAIR',
  SCRAP = 'SCRAP',
  USE_AS_IS = 'USE_AS_IS',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER'
}

export enum CharacteristicType {
  DIMENSIONAL = 'DIMENSIONAL',
  VISUAL = 'VISUAL',
  ATTRIBUTE = 'ATTRIBUTE',
  VARIABLE = 'VARIABLE'
}

export interface QualityCharacteristic {
  id: string;
  qualityPlanId: string;
  characteristicNumber: number;
  characteristicName: string;
  characteristicType: CharacteristicType;
  specificationNominal?: number;
  specificationLowerLimit?: number;
  specificationUpperLimit?: number;
  uom?: string;
  measurementMethod?: string;
  requiredEquipment?: string;
  isCritical: boolean;
  controlChartType?: string;
  createdAt: Date;
}

export interface Inspection {
  id: string;
  inspectionNumber: string;
  workOrderOperationId: string;
  qualityPlanId: string;
  lotNumber?: string;
  serialNumber?: string;
  sampleSize: number;
  inspectorId: string;
  inspectionDate: Date;
  overallResult: InspectionResult;
  notes?: string;
  certificateRequired: boolean;
  certificateGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
  results?: InspectionMeasurement[];
}

export interface InspectionMeasurement {
  id: string;
  inspectionId: string;
  qualityCharacteristicId: string;
  sampleNumber: number;
  measuredValue?: number;
  attributeValue?: string;
  result: InspectionResult;
  outOfSpecReason?: string;
  measurementEquipment?: string;
  measuredAt: Date;
  measuredBy?: string;
  createdAt: Date;
}

export interface NonConformanceReport {
  id: string;
  ncrNumber: string;
  inspectionId?: string;
  workOrderId?: string;
  partId: string;
  description: string;
  quantityAffected: number;
  severity: NCRSeverity;
  status: NCRStatus;
  disposition?: NCRDisposition;
  dispositionReason?: string;
  rootCause?: string;
  correctiveAction?: string;
  reportedBy: string;
  reportedDate: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  closedBy?: string;
  closedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeasurementValidationResult {
  isValid: boolean;
  result: InspectionResult;
  deviation?: number;
  message?: string;
}

export interface QualityMetrics {
  firstPassYield: number;
  defectRate: number;
  customerComplaints: number;
  ncrCount: number;
  averageInspectionTime: number;
}