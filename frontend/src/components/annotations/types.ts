/**
 * Type Definitions for Annotation System
 * Issue #66: Advanced Media Annotation Tools
 */

/**
 * Supported annotation types
 */
export type AnnotationType =
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'freehand'
  | 'text'
  | 'callout'
  | 'highlight'
  | 'measurement';

/**
 * Annotation tool definition
 */
export interface AnnotationTool {
  id: string;
  type: AnnotationType;
  name: string;
  icon: string;
  description: string;
  category: 'shape' | 'text' | 'measurement' | 'markup';
  cursor?: string;
  defaultProperties?: Record<string, any>;
}

/**
 * Core annotation object
 */
export interface AnnotationObject {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: AnnotationProperties;
  timestamp: Date;
  createdBy: string;
  locked?: boolean;
  hidden?: boolean;
  zIndex?: number;
}

/**
 * Flexible properties object for different annotation types
 */
export interface AnnotationProperties {
  // Common properties
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  fillOpacity?: number;

  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  textColor?: string;

  // Arrow properties
  arrowStart?: 'none' | 'arrow' | 'circle' | 'square';
  arrowEnd?: 'none' | 'arrow' | 'circle' | 'square';
  arrowStyle?: 'solid' | 'dashed' | 'dotted';

  // Callout properties
  calloutStyle?: 'rectangular' | 'rounded' | 'cloud';
  leaderLineStyle?: 'straight' | 'curved';
  leaderTailStyle?: 'none' | 'arrow' | 'triangle' | 'circle';

  // Highlight properties
  highlightColor?: string;
  transparency?: number;

  // Measurement properties
  unit?: 'px' | 'mm' | 'inch';
  scale?: number;
  showDimension?: boolean;

  // Freehand path data
  pathData?: string;

  // Custom
  [key: string]: any;
}

/**
 * Annotation state for drawing
 */
export interface AnnotationState {
  isDrawing: boolean;
  activeTool: AnnotationTool | null;
  selectedAnnotationId: string | null;
  currentDrawing: Partial<AnnotationObject> | null;
}

/**
 * Annotation layer
 */
export interface AnnotationLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  annotations: AnnotationObject[];
}

/**
 * Annotation action for undo/redo
 */
export type AnnotationAction =
  | { type: 'ADD'; annotation: AnnotationObject }
  | { type: 'REMOVE'; annotationId: string }
  | { type: 'UPDATE'; annotationId: string; changes: Partial<AnnotationObject> }
  | { type: 'SELECT'; annotationId: string | null }
  | { type: 'MOVE'; annotationId: string; deltaX: number; deltaY: number }
  | { type: 'RESIZE'; annotationId: string; width: number; height: number };

/**
 * Annotation export format
 */
export interface AnnotationExport {
  format: 'svg' | 'png' | 'json';
  includeImage: boolean;
  quality?: number; // For PNG
  scale?: number;
}

/**
 * Collaborative annotation update
 */
export interface CollaborativeAnnotationUpdate {
  userId: string;
  userName: string;
  action: AnnotationAction;
  timestamp: Date;
}

/**
 * Measurement result
 */
export interface MeasurementResult {
  type: 'distance' | 'angle' | 'area';
  value: number;
  unit: string;
  calibration: MeasurementCalibration;
}

/**
 * Measurement calibration
 */
export interface MeasurementCalibration {
  referenceLengthPixels: number;
  referenceLength: number;
  referenceUnit: string;
  calibratedAt: Date;
}

/**
 * Annotation template
 */
export interface AnnotationTemplate {
  id: string;
  name: string;
  description: string;
  annotations: Omit<AnnotationObject, 'id' | 'timestamp' | 'createdBy'>[];
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Annotation batch operation
 */
export interface AnnotationBatchOperation {
  id: string;
  operation: 'copy' | 'delete' | 'move' | 'transform';
  annotationIds: string[];
  parameters: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}
