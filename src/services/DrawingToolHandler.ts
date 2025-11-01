/**
 * Drawing Tool Handler - Shared Service
 * Issue #66 Phase 2: Interactive drawing tool implementations
 *
 * This service is shared between frontend and backend for consistency
 */

import type { AnnotationType } from '@prisma/client';

/**
 * Annotation object interface
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
  [key: string]: any;
}

/**
 * Drawing context for current drawing operation
 */
export interface DrawingContext {
  toolType: AnnotationType;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  properties: AnnotationProperties;
}

/**
 * Drawing Tool Handler
 * Provides tool-specific drawing logic
 */
export class DrawingToolHandler {
  /**
   * Create drawing context from starting point
   */
  static createContext(
    toolType: AnnotationType,
    startX: number,
    startY: number,
    defaultProperties: AnnotationProperties = {}
  ): DrawingContext {
    return {
      toolType,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      properties: { ...defaultProperties },
    };
  }

  /**
   * Update drawing context with current mouse position
   */
  static updateContext(
    context: DrawingContext,
    currentX: number,
    currentY: number
  ): DrawingContext {
    return {
      ...context,
      currentX,
      currentY,
    };
  }

  /**
   * Get drawing bounds (normalized)
   */
  static getDrawingBounds(context: DrawingContext) {
    const minX = Math.min(context.startX, context.currentX);
    const minY = Math.min(context.startY, context.currentY);
    const maxX = Math.max(context.startX, context.currentX);
    const maxY = Math.max(context.startY, context.currentY);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Create annotation from drawing context
   */
  static createAnnotation(
    context: DrawingContext,
    annotationId: string,
    createdBy: string
  ): AnnotationObject {
    const bounds = this.getDrawingBounds(context);

    const annotation: AnnotationObject = {
      id: annotationId,
      type: context.toolType,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      properties: context.properties,
      timestamp: new Date(),
      createdBy,
      locked: false,
      hidden: false,
      zIndex: 0,
    };

    return annotation;
  }

  /**
   * Get tool-specific preview data for live feedback
   */
  static getPreviewData(context: DrawingContext) {
    const bounds = this.getDrawingBounds(context);

    switch (context.toolType) {
      case 'arrow':
        return {
          type: 'arrow' as const,
          x1: context.startX,
          y1: context.startY,
          x2: context.currentX,
          y2: context.currentY,
        };

      case 'rectangle':
        return {
          type: 'rectangle' as const,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        };

      case 'circle':
        return {
          type: 'circle' as const,
          cx: bounds.x + bounds.width / 2,
          cy: bounds.y + bounds.height / 2,
          radius: Math.min(bounds.width, bounds.height) / 2,
        };

      case 'line':
        return {
          type: 'line' as const,
          x1: context.startX,
          y1: context.startY,
          x2: context.currentX,
          y2: context.currentY,
        };

      case 'freehand':
        return {
          type: 'freehand' as const,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        };

      default:
        return null;
    }
  }

  /**
   * Validate drawing result (prevent zero-sized annotations)
   */
  static isValidDrawing(context: DrawingContext): boolean {
    const bounds = this.getDrawingBounds(context);

    switch (context.toolType) {
      case 'freehand':
        // Freehand needs special handling - will be validated during path collection
        return true;

      default:
        // Other tools need minimum dimensions (at least 5 pixels)
        return bounds.width >= 5 && bounds.height >= 5;
    }
  }

  /**
   * Get minimum size threshold for drawing
   */
  static getMinimumSize(toolType: AnnotationType): number {
    switch (toolType) {
      case 'freehand':
        return 1; // Any movement counts
      default:
        return 5; // 5 pixel minimum
    }
  }

  /**
   * Finalize tool-specific properties
   */
  static finalizeProperties(
    toolType: AnnotationType,
    context: DrawingContext
  ): AnnotationProperties {
    const props = { ...context.properties };

    // Ensure required properties are set
    switch (toolType) {
      case 'arrow':
        props.arrowStart ??= 'none';
        props.arrowEnd ??= 'arrow';
        props.arrowStyle ??= 'solid';
        props.strokeColor ??= '#000000';
        props.strokeWidth ??= 2;
        break;

      case 'rectangle':
      case 'circle':
      case 'line':
        props.strokeColor ??= '#000000';
        props.strokeWidth ??= 2;
        if (toolType !== 'line') {
          props.fillColor ??= 'transparent';
          props.fillOpacity ??= 0;
        }
        break;

      case 'freehand':
        props.strokeColor ??= '#000000';
        props.strokeWidth ??= 2;
        break;
    }

    return props;
  }

  /**
   * Handle freehand drawing point collection
   */
  static addFreehandPoint(
    context: DrawingContext,
    x: number,
    y: number
  ): DrawingContext {
    if (!context.properties.pathData) {
      context.properties.pathData = `M ${x} ${y}`;
    } else {
      context.properties.pathData += ` L ${x} ${y}`;
    }

    return this.updateContext(context, x, y);
  }

  /**
   * Smooth freehand path for better appearance
   */
  static smoothFreehandPath(pathData: string): string {
    // Split path into segments
    const segments = pathData.split(' ');
    if (segments.length < 3) return pathData;

    // Group coordinates and apply simple moving average smoothing
    const points: Array<[number, number]> = [];
    for (let i = 0; i < segments.length; i += 2) {
      if (segments[i] === 'M' || segments[i] === 'L') {
        const x = parseFloat(segments[i + 1]);
        const y = parseFloat(segments[i + 2]);
        if (!isNaN(x) && !isNaN(y)) {
          points.push([x, y]);
        }
      }
    }

    // Reconstruct with original density
    if (points.length < 2) return pathData;

    let smoothed = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      smoothed += ` L ${points[i][0]} ${points[i][1]}`;
    }

    return smoothed;
  }

  /**
   * Get cursor style for tool
   */
  static getCursorForTool(toolType: AnnotationType): string {
    switch (toolType) {
      case 'text':
        return 'text';
      case 'freehand':
        return 'pencil';
      default:
        return 'crosshair';
    }
  }

  /**
   * Check if tool requires special interaction mode
   */
  static requiresSpecialMode(
    toolType: AnnotationType
  ): 'normal' | 'freehand' | 'text' | 'measurement' {
    switch (toolType) {
      case 'freehand':
        return 'freehand';
      case 'text':
      case 'callout':
        return 'text';
      case 'measurement':
        return 'measurement';
      default:
        return 'normal';
    }
  }
}

/**
 * Freehand Path Collector
 * Specialized handler for freehand drawing with point collection
 */
export class FreehandPathCollector {
  private points: Array<[number, number]> = [];
  private lastX: number = 0;
  private lastY: number = 0;
  private minDistance: number = 2; // Minimum pixels between recorded points

  constructor(startX: number, startY: number, minDistance: number = 2) {
    this.lastX = startX;
    this.lastY = startY;
    this.minDistance = minDistance;
    this.points.push([startX, startY]);
  }

  /**
   * Add point to path if distance threshold met
   */
  addPoint(x: number, y: number): boolean {
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= this.minDistance) {
      this.points.push([x, y]);
      this.lastX = x;
      this.lastY = y;
      return true;
    }

    return false;
  }

  /**
   * Get current path as SVG path string
   */
  getPathData(): string {
    if (this.points.length === 0) return '';

    let pathData = `M ${this.points[0][0]} ${this.points[0][1]}`;
    for (let i = 1; i < this.points.length; i++) {
      pathData += ` L ${this.points[i][0]} ${this.points[i][1]}`;
    }

    return pathData;
  }

  /**
   * Get bounding box of path
   */
  getBoundingBox(): { x: number; y: number; width: number; height: number } {
    if (this.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = this.points[0][0];
    let maxX = this.points[0][0];
    let minY = this.points[0][1];
    let maxY = this.points[0][1];

    for (const [x, y] of this.points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Get all collected points
   */
  getPoints(): Array<[number, number]> {
    return [...this.points];
  }

  /**
   * Check if path is valid
   */
  isValid(): boolean {
    return this.points.length >= 2;
  }

  /**
   * Reset collector
   */
  reset(): void {
    this.points = [];
  }
}
