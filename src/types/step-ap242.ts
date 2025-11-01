/**
 * STEP AP242 Integration Types
 * Issue #220: SDK & Extensibility: Add STEP AP242 Integration Fields for MBE
 *
 * Types and interfaces for STEP AP242 (ISO 10303-242) Model-Based Enterprise integration
 * Enables CAD/PLM integration with Product Manufacturing Information (PMI) traceability
 */

/**
 * STEP AP242 File Metadata
 * Stores information about imported STEP files and their associated CAD models
 */
export interface StepAP242Metadata {
  // File identification
  stepAp242Uuid: string;        // Unique identifier from STEP file
  stepAp242FileUrl: string;     // URL/path to STEP file
  stepAp242Version: string;     // STEP file version number
  stepAp242Checksum: string;    // SHA256 checksum for integrity verification
  stepAp242LastSync: Date;      // Last synchronization with PLM system

  // CAD Model Information
  cadModelUuid: string;         // CAD system's unique identifier
  cadModelRevision: string;     // Revision level (e.g., "A", "B", "1.0")
  cadModelFormat: 'STEP' | 'JT' | '3DPDF' | 'OTHER'; // File format
  cadSystemSource: string;      // Source CAD system (NX, CATIA, Creo, SolidWorks, etc.)

  // PLM System Integration
  plmSystemName: string;        // PLM system (Teamcenter, Windchill, ENOVIA, Aras)
  plmItemId: string;            // Item ID in PLM system
  plmRevisionId: string;        // Revision ID in PLM system
  plmLastModified: Date;        // Last modified date in PLM
}

/**
 * Product Manufacturing Information (PMI)
 * Extracted from STEP AP242 files - contains all manufacturing-related data from CAD
 */
export interface PMIData {
  uuid: string;                           // Unique identifier for this PMI set
  extractionDate: Date;                   // When PMI was extracted from CAD
  cadModelUuid: string;                   // Reference to source CAD model
  hasPMI: boolean;                        // Whether PMI is present in model

  features: PMIFeature[];                 // Manufacturing features
  annotations: PMIAnnotation[];           // CAD annotations
  datums: DatumDefinition[];              // Geometric datums
  tolerances: ToleranceSpecification[];   // GD&T tolerances
  dimensions: DimensionSpecification[];   // Dimensions
  materials: MaterialSpecification[];     // Material specifications
  surfaceFinishes: SurfaceFinish[];       // Surface finish callouts
}

/**
 * PMI Feature - represents a manufacturing feature defined in CAD
 */
export interface PMIFeature {
  id: string;                        // Unique feature identifier in STEP
  name: string;                      // Feature name
  type: 'hole' | 'pocket' | 'boss' | 'slot' | 'surface' | 'edge' | 'other';
  uuid: string;                      // Persistent UUID
  geometry: FeatureGeometry;         // Geometric properties
  manufacturingMethod?: string;      // Recommended manufacturing method
  material?: string;                 // Material specification
  annotations: string[];             // Associated annotation IDs
}

/**
 * Feature Geometry - detailed geometric definition
 */
export interface FeatureGeometry {
  type: string;                      // Geometry type (e.g., "CYLINDER", "PLANE")
  dimensions: Record<string, number>; // Key dimensions (diameter, depth, etc.)
  position: Position3D;              // 3D position in model
  orientation: Orientation3D;        // 3D orientation
  vertices?: Position3D[];           // Boundary vertices if polygon
}

/**
 * Position in 3D space
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Orientation in 3D space (quaternion or Euler angles)
 */
export interface Orientation3D {
  method: 'quaternion' | 'euler';
  // Quaternion format
  qx?: number;
  qy?: number;
  qz?: number;
  qw?: number;
  // Euler angles format (radians)
  roll?: number;
  pitch?: number;
  yaw?: number;
}

/**
 * PMI Annotation - text, dimension, or note in CAD model
 */
export interface PMIAnnotation {
  id: string;                        // Unique annotation ID in STEP
  type: 'dimension' | 'note' | 'symbol' | 'datum' | 'tolerance';
  text?: string;                     // Annotation text content
  featureReference?: string;         // Referenced feature ID
  datumReferences?: string[];        // Referenced datums
  relatedCharacteristicId?: string;  // Quality characteristic ID if applicable
  position3D?: Position3D;           // 3D position in model
}

/**
 * Geometric Datum - reference element for tolerances
 */
export interface DatumDefinition {
  id: string;                        // Unique datum ID
  label: string;                     // Datum label (A, B, C, etc.)
  type: 'point' | 'line' | 'plane' | 'surface' | 'axis' | 'cylinder';
  featureReference: string;          // Associated feature ID
  description?: string;              // Description of datum
  precedence: number;                // Datum precedence order
  priority?: 'primary' | 'secondary' | 'tertiary';
}

/**
 * GD&T Tolerance Specification
 * Geometric Dimensioning & Tolerancing as defined in CAD
 */
export interface ToleranceSpecification {
  id: string;                        // Unique tolerance ID
  type: string;                      // Type: FLATNESS, POSITION, PERPENDICULAR, etc.
  featureReference?: string;         // Referenced feature
  toleranceValue: number;            // Tolerance magnitude
  toleranceUnit: string;             // Unit (mm, inch, etc.)
  modifier?: 'MMC' | 'LMC' | 'RFS' | 'FREE'; // GD&T modifier
  datumReferences?: string[];        // Referenced datums (primary, secondary, tertiary)
  description?: string;              // Human-readable description
  iso14659Type?: string;             // ISO 14659 standard type
}

/**
 * Dimension Specification
 * Exact dimensions as defined in STEP file
 */
export interface DimensionSpecification {
  id: string;                        // Unique dimension ID
  featureReference: string;          // Referenced feature
  type: 'length' | 'angle' | 'radius' | 'diameter' | 'depth' | 'width';
  nominal: number;                   // Nominal value
  minimum?: number;                  // Minimum allowed
  maximum?: number;                  // Maximum allowed
  unit: string;                      // Unit (mm, inch, degrees, etc.)
  referenceFrame?: string;           // Coordinate reference frame
  description?: string;              // Description
}

/**
 * Material Specification
 */
export interface MaterialSpecification {
  id: string;                        // Unique ID
  material: string;                  // Material name (e.g., "6061-T6 Aluminum")
  specification?: string;            // Specification (e.g., "ASTM B221")
  condition?: string;                // Condition (heat treat, etc.)
  featureReferences?: string[];      // Applied to features
}

/**
 * Surface Finish Specification
 */
export interface SurfaceFinish {
  id: string;                        // Unique ID
  featureReference: string;          // Applied to feature
  roughness: string;                 // Roughness value (e.g., "Ra 0.8")
  process?: string;                  // Process (grinding, polishing, etc.)
  specification?: string;            // Standard (ISO 1302, ANSI Y14.36, etc.)
}

/**
 * STEP File Import Request
 */
export interface StepImportRequest {
  fileUrl: string;                   // URL or path to STEP file
  plmSystemName?: string;            // Source PLM system
  plmItemId?: string;                // PLM item identifier
  cadSystemSource?: string;          // CAD system that created file
  auto ExtractPMI?: boolean;         // Auto-extract PMI data
  validateGDT?: boolean;             // Validate GD&T specifications
}

/**
 * STEP File Import Result
 */
export interface StepImportResult {
  success: boolean;                  // Import success status
  stepAp242Uuid: string;             // Generated or extracted UUID
  metadata: StepAP242Metadata;       // File metadata
  pmiData?: PMIData;                 // Extracted PMI if requested
  warnings: string[];                // Import warnings
  errors: string[];                  // Import errors
  importedAt: Date;                  // Import timestamp
}

/**
 * Digital Thread Trace
 * Links CAD model features to manufacturing data
 */
export interface DigitalThreadTrace {
  id: string;
  cadModelUuid: string;              // Source CAD model
  pmiFeatureId: string;              // PMI feature in CAD
  partId: string;                    // Manufactured part
  operationIds: string[];            // Operations on this feature
  qualityCharacteristicIds: string[]; // Quality checks
  measurementData?: Record<string, number>; // Measurement results
  asBuiltVsAsDesigned?: {            // As-built comparison
    nominal: number;
    actual: number;
    difference: number;
    withinTolerance: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 3D Model View State
 * Saved camera position and visibility for specific operations
 */
export interface ModelViewState {
  id: string;
  modelUuid: string;                 // Associated STEP model
  operationId?: string;              // Associated operation
  viewName: string;                  // View name (e.g., "Operation 10 Setup")

  // Camera properties
  cameraPosition: Position3D;
  cameraTarget: Position3D;
  cameraUp: Position3D;
  fov?: number;                      // Field of view

  // Visibility
  visibleFeatures?: string[];        // Visible PMI features
  visibleAnnotations?: string[];     // Visible annotations
  hiddenFeatures?: string[];         // Hidden features

  // Highlights
  highlightedFeatures?: string[];    // Highlighted feature IDs
  highlightColor?: string;           // Highlight color (hex)

  savedAt: Date;
}

/**
 * PLM System Configuration
 * Connection details for PLM system integration
 */
export interface PLMSystemConfig {
  systemName: 'Teamcenter' | 'Windchill' | 'ENOVIA' | 'Aras' | 'OTHER';
  baseUrl: string;                   // Base URL
  apiVersion: string;                // API version
  authentication: {
    method: 'oauth' | 'basic' | 'saml' | 'api_key';
    credentials: Record<string, string>;
  };
  autoSyncEnabled: boolean;          // Auto-sync from PLM
  syncInterval?: number;             // Sync interval in minutes
  fileExportPath: string;            // Path to export STEP files
}

/**
 * STEP AP242 Service Interface
 * Main service for STEP integration operations
 */
export interface ISTEPAp242Service {
  // File import
  importStepFile(request: StepImportRequest): Promise<StepImportResult>;
  validateStepFile(fileUrl: string): Promise<{ valid: boolean; errors: string[] }>;

  // PMI extraction
  extractPMI(stepData: PMIData): Promise<PMIData>;
  extractGDT(pmiData: PMIData): Promise<ToleranceSpecification[]>;
  extractDimensions(pmiData: PMIData): Promise<DimensionSpecification[]>;

  // Mapping and linking
  mapPMIToCharacteristics(
    pmiData: PMIData,
    partId: string
  ): Promise<Record<string, string[]>>; // Maps PMI features to characteristic IDs

  linkStepToPart(stepUuid: string, partId: string): Promise<void>;
  linkPMIFeatureToOperation(pmiFeatureId: string, operationId: string): Promise<void>;

  // PLM Integration
  connectToPLM(config: PLMSystemConfig): Promise<void>;
  syncFromPLM(itemId: string, revisionId: string): Promise<StepImportResult>;
  publishToCADSystem(partId: string, dataUrl: string): Promise<void>;

  // Digital Thread
  createDigitalThreadTrace(
    cadModelUuid: string,
    pmiFeatureId: string,
    partId: string
  ): Promise<DigitalThreadTrace>;

  getDigitalThread(partId: string): Promise<DigitalThreadTrace[]>;
  recordMeasurement(traceId: string, actualValue: number): Promise<void>;

  // 3D Visualization
  saveModelViewState(viewState: ModelViewState): Promise<void>;
  getModelViewState(viewId: string): Promise<ModelViewState>;
  generateAsBuiltModel(partId: string): Promise<string>; // Returns model URL
}

/**
 * Constants for STEP AP242
 */
export const STEP_AP242_CONSTANTS = {
  // Supported CAD systems
  CAD_SYSTEMS: {
    NX: 'Siemens NX',
    CATIA: 'Dassault CATIA',
    CREO: 'PTC Creo',
    SOLIDWORKS: 'Dassault SolidWorks',
    INVENTOR: 'Autodesk Inventor',
    FUSION: 'Autodesk Fusion 360',
  },

  // Supported PLM systems
  PLM_SYSTEMS: {
    TEAMCENTER: 'Siemens Teamcenter',
    WINDCHILL: 'PTC Windchill',
    ENOVIA: 'Dassault ENOVIA',
    ARAS: 'Aras Innovator',
  },

  // Supported file formats
  FILE_FORMATS: {
    STEP: 'ISO 10303-21 (STEP)',
    JT: 'Siemens JT Format',
    PDF_3D: '3D PDF',
    IGES: 'IGES (legacy)',
  },

  // Standard GD&T types (ISO 14659)
  GDT_TYPES: [
    'FLATNESS',
    'STRAIGHTNESS',
    'ROUNDNESS',
    'CYLINDRICITY',
    'PROFILE_LINE',
    'PROFILE_SURFACE',
    'ANGULARITY',
    'PERPENDICULARITY',
    'PARALLELISM',
    'POSITION',
    'CONCENTRICITY',
    'SYMMETRY',
    'RUN_OUT',
    'TOTAL_RUN_OUT',
  ],

  // ISO 3040 tolerance codes
  TOLERANCE_MODIFIERS: ['MMC', 'LMC', 'RFS', 'FREE', 'NULL'],

  // Feature types from STEP
  FEATURE_TYPES: [
    'hole',
    'pocket',
    'boss',
    'slot',
    'surface',
    'edge',
    'datum',
    'other',
  ],
};

/**
 * Errors specific to STEP AP242 operations
 */
export class StepAP242Error extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'StepAP242Error';
  }
}

export class StepFileValidationError extends StepAP242Error {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'STEP_VALIDATION_ERROR', details);
  }
}

export class PMIExtractionError extends StepAP242Error {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'PMI_EXTRACTION_ERROR', details);
  }
}

export class PLMConnectionError extends StepAP242Error {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'PLM_CONNECTION_ERROR', details);
  }
}
