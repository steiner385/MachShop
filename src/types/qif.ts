/**
 * QIF (Quality Information Framework) Type Definitions
 *
 * TypeScript interfaces for ANSI/DMSC QIF 3.0 standard
 * https://qifstandards.org/
 *
 * QIF is the industry-standard format for dimensional metrology data exchange
 * Used for:
 * - CMM (Coordinate Measuring Machine) measurement plans and results
 * - AS9102 First Article Inspection reports
 * - Supplier quality data exchange
 * - Digital thread for quality data
 *
 * QIF Components:
 * - QIFMeasurementPlan: Inspection plan (what to measure and how)
 * - QIFMeasurementResults: Actual measurement data
 * - QIFProduct: Product definition with GD&T characteristics
 * - QIFResources: Measurement equipment capabilities
 * - QIFStatistics: Statistical analysis (SPC, Cpk, Gage R&R)
 * - QIFRules: Validation and decision rules
 */

// =======================
// QIF Root Document
// =======================

export interface QIFDocument {
  QIFDocument: {
    Version: string;              // QIF version (e.g., "3.0.0")
    idMax: number;                // Maximum ID used in document
    FileUnits?: FileUnits;        // Default units
    Header?: QIFHeader;           // Document header
    Product?: QIFProduct[];       // Product definitions
    MeasurementPlan?: QIFMeasurementPlan;  // Inspection plan
    MeasurementResults?: QIFMeasurementResults;  // Actual measurements
    Resources?: QIFResources;     // Equipment capabilities
    Statistics?: QIFStatistics;   // Statistical analysis
    Rules?: QIFRules;             // Validation rules
  };
}

// =======================
// QIF Header
// =======================

export interface QIFHeader {
  Author?: string;
  Organization?: string;
  CreationDate?: string;          // ISO 8601 datetime
  ModificationDate?: string;
  Description?: string;
  ApplicationName?: string;
  ApplicationVersion?: string;
  Comment?: string;
}

// =======================
// File Units
// =======================

export interface FileUnits {
  PrimaryUnits: LinearUnit;
  AngularUnits?: AngularUnit;
}

export interface LinearUnit {
  UnitName: 'meter' | 'millimeter' | 'inch' | 'foot';
  SIUnitName?: string;
  UnitConversion?: number;
}

export interface AngularUnit {
  UnitName: 'degree' | 'radian';
  SIUnitName?: string;
  UnitConversion?: number;
}

// =======================
// QIF Product (Characteristics)
// =======================

export interface QIFProduct {
  id: string;
  PartNumber?: string;
  PartName?: string;
  PartVersion?: string;
  Revision?: string;
  DrawingNumber?: string;
  Organization?: string;
  ModelNumber?: string;
  SerialNumber?: string;
  Characteristics?: Characteristic[];
  Datums?: Datum[];
  CoordinateSystems?: CoordinateSystem[];
  Notations?: Notation[];
}

export interface Characteristic {
  id: string;
  CharacteristicNominal: CharacteristicNominal;
  CharacteristicItem: CharacteristicItem;
}

export interface CharacteristicNominal {
  CharacteristicDesignator?: string;  // Balloon number (e.g., "1", "A")
  Name?: string;
  Description?: string;
  TargetValue?: number;
  PlusTolerance?: number;
  MinusTolerance?: number;
  Attributes?: CharacteristicAttribute[];
}

export interface CharacteristicItem {
  // Dimensional characteristics
  DiameterCharacteristicItem?: DiameterCharacteristic;
  LengthCharacteristicItem?: LengthCharacteristic;
  DistanceBetweenCharacteristicItem?: DistanceBetweenCharacteristic;
  AngleBetweenCharacteristicItem?: AngleBetweenCharacteristic;

  // Geometric tolerances (GD&T)
  PositionCharacteristicItem?: PositionCharacteristic;
  ProfileCharacteristicItem?: ProfileCharacteristic;
  FlatnessCharacteristicItem?: FlatnessCharacteristic;
  StraightnessCharacteristicItem?: StraightnessCharacteristic;
  CircularityCharacteristicItem?: CircularityCharacteristic;
  PerpendicularityCharacteristicItem?: PerpendicularityCharacteristic;
  ParallelismCharacteristicItem?: ParallelismCharacteristic;
  ConcentricityCharacteristicItem?: ConcentricityCharacteristic;

  // Surface characteristics
  SurfaceTextureCharacteristicItem?: SurfaceTextureCharacteristic;
  ThreadCharacteristicItem?: ThreadCharacteristic;
}

export interface DiameterCharacteristic {
  Nominal: number;
  PlusTolerance?: number;
  MinusTolerance?: number;
  Feature?: FeatureReference;
}

export interface LengthCharacteristic {
  Nominal: number;
  PlusTolerance?: number;
  MinusTolerance?: number;
  MeasuredFrom?: FeatureReference;
  MeasuredTo?: FeatureReference;
}

export interface DistanceBetweenCharacteristic {
  Nominal: number;
  PlusTolerance?: number;
  MinusTolerance?: number;
  Feature1?: FeatureReference;
  Feature2?: FeatureReference;
}

export interface AngleBetweenCharacteristic {
  Nominal: number;
  PlusTolerance?: number;
  MinusTolerance?: number;
  Feature1?: FeatureReference;
  Feature2?: FeatureReference;
}

export interface PositionCharacteristic {
  ToleranceValue: number;
  MaterialCondition?: 'MMC' | 'LMC' | 'RFS';
  DatumReferenceFrame?: DatumReferenceFrame;
  Feature?: FeatureReference;
}

export interface ProfileCharacteristic {
  ToleranceValue: number;
  MaterialCondition?: 'MMC' | 'LMC' | 'RFS';
  DatumReferenceFrame?: DatumReferenceFrame;
  ProfileType?: 'SURFACE' | 'LINE';
}

export interface FlatnessCharacteristic {
  ToleranceValue: number;
  Feature?: FeatureReference;
}

export interface StraightnessCharacteristic {
  ToleranceValue: number;
  Feature?: FeatureReference;
}

export interface CircularityCharacteristic {
  ToleranceValue: number;
  Feature?: FeatureReference;
}

export interface PerpendicularityCharacteristic {
  ToleranceValue: number;
  MaterialCondition?: 'MMC' | 'LMC' | 'RFS';
  DatumReferenceFrame?: DatumReferenceFrame;
  Feature?: FeatureReference;
}

export interface ParallelismCharacteristic {
  ToleranceValue: number;
  MaterialCondition?: 'MMC' | 'LMC' | 'RFS';
  DatumReferenceFrame?: DatumReferenceFrame;
  Feature?: FeatureReference;
}

export interface ConcentricityCharacteristic {
  ToleranceValue: number;
  DatumReferenceFrame?: DatumReferenceFrame;
  Feature?: FeatureReference;
}

export interface SurfaceTextureCharacteristic {
  RoughnessParameter: 'Ra' | 'Rz' | 'Rq' | 'Rt';
  UpperLimit?: number;
  LowerLimit?: number;
  Feature?: FeatureReference;
}

export interface ThreadCharacteristic {
  ThreadType: string;           // e.g., "M12x1.5", "1/4-20 UNC"
  Class?: string;
  PitchDiameter?: number;
  PlusTolerance?: number;
  MinusTolerance?: number;
}

export interface Datum {
  id: string;
  DatumLabel: string;             // e.g., "A", "B", "C"
  DatumDefinition: DatumDefinition;
}

export interface DatumDefinition {
  DatumFeature?: FeatureReference;
  DatumTargets?: DatumTarget[];
}

export interface DatumTarget {
  TargetId: string;
  TargetType: 'POINT' | 'LINE' | 'AREA';
  Location?: Point3D;
}

export interface DatumReferenceFrame {
  PrimaryDatum?: DatumReference;
  SecondaryDatum?: DatumReference;
  TertiaryDatum?: DatumReference;
}

export interface DatumReference {
  DatumId: string;                // References Datum.id
  MaterialCondition?: 'MMC' | 'LMC' | 'RFS';
}

export interface FeatureReference {
  FeatureId: string;
  FeatureName?: string;
}

export interface Point3D {
  X: number;
  Y: number;
  Z: number;
}

export interface CoordinateSystem {
  id: string;
  Name?: string;
  Origin?: Point3D;
  XAxis?: Vector3D;
  ZAxis?: Vector3D;
}

export interface Vector3D {
  I: number;
  J: number;
  K: number;
}

export interface Notation {
  id: string;
  Label: string;
  Text: string;
  Location?: Point3D;
}

export interface CharacteristicAttribute {
  AttributeName: string;
  AttributeValue: string | number | boolean;
}

// =======================
// QIF Measurement Plan
// =======================

export interface QIFMeasurementPlan {
  id: string;
  Version?: string;
  CreationDate?: string;
  ModificationDate?: string;
  Author?: string;
  Description?: string;
  MeasurementDevices?: MeasurementDevice[];
  InspectionSteps?: InspectionStep[];
  SamplingPlan?: SamplingPlan;
}

export interface MeasurementDevice {
  id: string;
  DeviceType: 'CMM' | 'VISION' | 'LASER_SCANNER' | 'ARTICULATED_ARM' | 'HANDHELD' | 'MANUAL';
  Manufacturer?: string;
  Model?: string;
  SerialNumber?: string;
  CalibrationDate?: string;
  CalibrationDueDate?: string;
  Accuracy?: number;
  Resolution?: number;
  WorkingVolume?: WorkingVolume;
  Capabilities?: DeviceCapability[];
}

export interface WorkingVolume {
  XRange?: Range;
  YRange?: Range;
  ZRange?: Range;
}

export interface Range {
  Min: number;
  Max: number;
}

export interface DeviceCapability {
  CapabilityType: string;
  CapabilityValue: string | number;
}

export interface InspectionStep {
  id: string;
  StepNumber: number;
  StepName?: string;
  CharacteristicId: string;       // References Characteristic.id
  MeasurementDeviceId?: string;   // References MeasurementDevice.id
  MeasurementMethod?: string;
  SampleSize?: number;
  AcceptanceCriteria?: AcceptanceCriteria;
  Instructions?: string;
}

export interface SamplingPlan {
  SampleSize: number;
  SamplingFrequency?: string;
  SamplingType?: 'FIRST_PIECE' | 'IN_PROCESS' | 'FINAL' | 'PERIODIC';
  AcceptanceNumber?: number;
  RejectionNumber?: number;
}

export interface AcceptanceCriteria {
  CriteriaType: 'TOLERANCE' | 'CPKCP' | 'PASS_FAIL';
  MinimumCpk?: number;
  MinimumCp?: number;
  RequireAllMeasurements?: boolean;
}

// =======================
// QIF Measurement Results
// =======================

export interface QIFMeasurementResults {
  id: string;
  Version?: string;
  MeasurementDate?: string;
  MeasuredBy?: string;
  InspectionStatus?: 'PASS' | 'FAIL' | 'CONDITIONAL';
  MeasurementPlanId?: string;     // References MeasurementPlan.id
  Results?: MeasurementResult[];
  Summary?: ResultsSummary;
}

export interface MeasurementResult {
  id: string;
  CharacteristicId: string;       // References Characteristic.id
  MeasuredValue?: number;
  Deviation?: number;
  Status?: 'PASS' | 'FAIL' | 'OUT_OF_TOLERANCE';
  MeasuredBy?: string;
  MeasurementDate?: string;
  MeasurementDeviceId?: string;
  Uncertainty?: Uncertainty;
  Attributes?: MeasurementAttribute[];
}

export interface Uncertainty {
  Value: number;
  CoverageFactor?: number;        // k-factor (typically 2 for 95% confidence)
  ConfidenceLevel?: number;       // e.g., 0.95 for 95%
  UncertaintyType?: 'EXPANDED' | 'STANDARD' | 'COMBINED';
}

export interface MeasurementAttribute {
  AttributeName: string;
  AttributeValue: string | number | boolean;
}

export interface ResultsSummary {
  TotalCharacteristics: number;
  PassedCharacteristics: number;
  FailedCharacteristics: number;
  OverallStatus: 'PASS' | 'FAIL' | 'CONDITIONAL';
  InspectionDate: string;
  Inspector?: string;
  Comments?: string;
}

// =======================
// QIF Resources
// =======================

export interface QIFResources {
  MeasurementDevices?: MeasurementDeviceResource[];
  Fixtures?: FixtureResource[];
  Software?: SoftwareResource[];
  Personnel?: PersonnelResource[];
  Facilities?: FacilityResource[];
}

export interface MeasurementDeviceResource {
  id: string;
  DeviceType: string;
  Manufacturer: string;
  Model: string;
  SerialNumber?: string;
  AssetNumber?: string;
  CalibrationStatus: 'IN_CAL' | 'OUT_OF_CAL' | 'DUE' | 'OVERDUE';
  CalibrationDate?: string;
  CalibrationDueDate?: string;
  CalibrationCertificateNumber?: string;
  Accuracy?: number;
  Resolution?: number;
  MeasurementUncertainty?: Uncertainty;
  WorkingVolume?: WorkingVolume;
  Location?: string;
  Owner?: string;
  Status?: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
  GageRR?: GageRRData;
}

export interface GageRRData {
  StudyDate: string;
  GRR: number;                    // Total Gage R&R (%)
  Repeatability: number;          // EV %
  Reproducibility: number;        // AV %
  PartVariation: number;          // PV %
  NDC: number;                    // Number of distinct categories
  Status: 'ACCEPTABLE' | 'MARGINAL' | 'UNACCEPTABLE';
}

export interface FixtureResource {
  id: string;
  FixtureName: string;
  FixtureType: string;
  SerialNumber?: string;
  Description?: string;
  PartNumbers?: string[];         // Parts this fixture supports
}

export interface SoftwareResource {
  id: string;
  SoftwareName: string;
  Version: string;
  Vendor?: string;
  LicenseNumber?: string;
}

export interface PersonnelResource {
  id: string;
  PersonnelId: string;
  FirstName: string;
  LastName: string;
  Certifications?: Certification[];
  Qualifications?: Qualification[];
}

export interface Certification {
  CertificationType: string;
  CertificationNumber?: string;
  IssuedDate: string;
  ExpirationDate?: string;
  IssuingOrganization?: string;
  Status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
}

export interface Qualification {
  QualificationType: string;
  QualifiedDate: string;
  QualifiedBy?: string;
  ExpirationDate?: string;
}

export interface FacilityResource {
  id: string;
  FacilityName: string;
  FacilityType: string;
  Location?: string;
  EnvironmentalConditions?: EnvironmentalConditions;
}

export interface EnvironmentalConditions {
  Temperature?: TemperatureCondition;
  Humidity?: HumidityCondition;
  Pressure?: PressureCondition;
}

export interface TemperatureCondition {
  Value: number;
  Unit: 'C' | 'F' | 'K';
  Tolerance?: number;
}

export interface HumidityCondition {
  RelativeHumidity: number;       // Percentage
  Tolerance?: number;
}

export interface PressureCondition {
  Value: number;
  Unit: 'Pa' | 'psi' | 'bar' | 'mmHg';
  Tolerance?: number;
}

// =======================
// QIF Statistics
// =======================

export interface QIFStatistics {
  StatisticalStudies?: StatisticalStudy[];
  ProcessCapabilityStudies?: ProcessCapabilityStudy[];
  ControlCharts?: ControlChart[];
}

export interface StatisticalStudy {
  id: string;
  StudyType: 'DESCRIPTIVE' | 'INFERENTIAL' | 'REGRESSION' | 'CORRELATION';
  CharacteristicId: string;
  SampleSize: number;
  Mean?: number;
  Median?: number;
  Mode?: number;
  StandardDeviation?: number;
  Variance?: number;
  Range?: number;
  Min?: number;
  Max?: number;
  Skewness?: number;
  Kurtosis?: number;
}

export interface ProcessCapabilityStudy {
  id: string;
  CharacteristicId: string;
  StudyDate: string;
  SampleSize: number;
  Mean: number;
  StandardDeviation: number;
  USL?: number;                   // Upper specification limit
  LSL?: number;                   // Lower specification limit
  Target?: number;
  Cp?: number;                    // Process capability
  Cpk?: number;                   // Process capability index
  Cpm?: number;                   // Process performance
  Pp?: number;                    // Overall process capability
  Ppk?: number;                   // Overall process capability index
  Sigma?: number;                 // Sigma level (e.g., 6 for Six Sigma)
  DPMO?: number;                  // Defects per million opportunities
}

export interface ControlChart {
  id: string;
  ChartType: 'XBAR_R' | 'XBAR_S' | 'I_MR' | 'P' | 'NP' | 'C' | 'U';
  CharacteristicId: string;
  Subgroups?: Subgroup[];
  ControlLimits?: ControlLimits;
  SpecificationLimits?: SpecificationLimits;
  OutOfControlPoints?: number[];
  Rules?: ControlChartRule[];
}

export interface Subgroup {
  SubgroupNumber: number;
  Values: number[];
  SubgroupMean?: number;
  SubgroupRange?: number;
  SubgroupStdDev?: number;
  Date?: string;
}

export interface ControlLimits {
  UCL: number;                    // Upper control limit
  CL: number;                     // Center line
  LCL: number;                    // Lower control limit
}

export interface SpecificationLimits {
  USL?: number;                   // Upper specification limit
  Target?: number;
  LSL?: number;                   // Lower specification limit
}

export interface ControlChartRule {
  RuleName: string;
  RuleDescription?: string;
  ViolationCount?: number;
}

// =======================
// QIF Rules
// =======================

export interface QIFRules {
  ValidationRules?: ValidationRule[];
  DecisionRules?: DecisionRule[];
}

export interface ValidationRule {
  id: string;
  RuleName: string;
  RuleType: 'CHARACTERISTIC' | 'MEASUREMENT' | 'STATISTICAL';
  Condition: string;
  Action: string;
  Severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

export interface DecisionRule {
  id: string;
  RuleName: string;
  Condition: string;
  Decision: 'ACCEPT' | 'REJECT' | 'CONDITIONAL' | 'MRB';
  RequiredApproval?: string[];
}

// =======================
// Simplified QIF Interfaces for MES Use
// =======================

/**
 * Simplified QIF Measurement Plan for MES storage
 * Updated to support NIST AMS 300-12 UUID standards
 */
export interface MESQIFPlan {
  qifPlanUuid?: string;           // NIST AMS 300-12 compliant UUID (preferred)
  qifPlanId?: string;             // Legacy string ID (deprecated)
  partNumber: string;
  revision: string;
  planVersion: string;
  createdDate: Date;
  characteristics: {
    characteristicUuid?: string;  // NIST AMS 300-12 compliant UUID (preferred)
    characteristicId?: string;    // Legacy string ID (deprecated)
    balloonNumber: string;
    description: string;
    nominalValue: number;
    upperTolerance: number;
    lowerTolerance: number;
    toleranceType: string;
    measurementMethod?: string;
    samplingRequired: boolean;
  }[];
  xmlContent: string;             // Full QIF XML stored as text
}

/**
 * Simplified QIF Measurement Results for MES storage
 * Updated to support NIST AMS 300-12 UUID standards
 */
export interface MESQIFResults {
  qifResultsUuid?: string;        // NIST AMS 300-12 compliant UUID (preferred)
  qifResultsId?: string;          // Legacy string ID (deprecated)
  qifPlanUuid?: string;           // NIST AMS 300-12 compliant plan UUID reference (preferred)
  qifPlanId?: string;             // Legacy plan ID reference (deprecated)
  serialNumber?: string;
  inspectionDate: Date;
  inspectedBy: string;
  overallStatus: 'PASS' | 'FAIL' | 'CONDITIONAL';
  measurements: {
    characteristicUuid?: string;  // NIST AMS 300-12 compliant UUID reference (preferred)
    characteristicId?: string;    // Legacy characteristic ID (deprecated)
    measuredValue: number;
    deviation: number;
    status: 'PASS' | 'FAIL';
    measurementDevice?: string;
    uncertainty?: number;
  }[];
  xmlContent: string;             // Full QIF XML stored as text
}

/**
 * QIF Export Options
 */
export interface QIFExportOptions {
  includeHeader?: boolean;
  includeProduct?: boolean;
  includePlan?: boolean;
  includeResults?: boolean;
  includeResources?: boolean;
  includeStatistics?: boolean;
  formatXML?: boolean;            // Pretty-print XML
  validateAgainstSchema?: boolean;
}

/**
 * QIF Import Result
 */
export interface QIFImportResult {
  success: boolean;
  qifVersion?: string;
  characteristics?: number;
  measurements?: number;
  errors?: string[];
  warnings?: string[];
}

// =======================
// UUID Support Types
// =======================

/**
 * QIF UUID Validation Result
 */
export interface QIFUUIDValidationResult {
  isValid: boolean;
  format: 'UUID' | 'LEGACY' | 'INVALID';
  normalizedValue?: string;
  errors?: string[];
}

/**
 * QIF ID Resolution - supports both UUID and legacy string IDs
 */
export interface QIFIdentifier {
  uuid?: string;      // NIST AMS 300-12 compliant UUID (preferred)
  legacyId?: string;  // Legacy string ID (deprecated)
  primary: string;    // The preferred identifier to use
}

/**
 * QIF Migration Status for entities
 */
export interface QIFMigrationStatus {
  hasUuid: boolean;
  hasLegacyId: boolean;
  migrationComplete: boolean;
  identifierType: 'UUID_ONLY' | 'LEGACY_ONLY' | 'HYBRID';
}

/**
 * Extended QIF Plan interface supporting UUID migration
 */
export interface ExtendedMESQIFPlan extends MESQIFPlan {
  migrationStatus?: QIFMigrationStatus;
  identifiers?: QIFIdentifier;
}

/**
 * Extended QIF Results interface supporting UUID migration
 */
export interface ExtendedMESQIFResults extends MESQIFResults {
  migrationStatus?: QIFMigrationStatus;
  identifiers?: QIFIdentifier;
  planIdentifiers?: QIFIdentifier;
}

/**
 * QIF Service Configuration for UUID handling
 */
export interface QIFServiceConfig {
  preferUuids: boolean;           // Use UUIDs when available
  requireUuids: boolean;          // Enforce UUID-only mode
  allowLegacyIds: boolean;        // Support legacy string IDs
  validateUuidFormat: boolean;    // Validate UUID format strictly
  migrationMode: boolean;         // Enable migration-specific features
  nistCompliance: boolean;        // Enforce NIST AMS 300-12 standards
}

export default {
  // Export all interfaces as namespace
};
