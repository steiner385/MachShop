/**
 * Selection Manager
 * Issue #66 Phase 4: Layer management and selection/editing
 *
 * Handles annotation selection, multi-selection, and transformation
 */

import { AnnotationObject } from './types';

export type TransformMode = 'move' | 'resize' | 'rotate' | 'none';

/**
 * Selection state
 */
export interface SelectionState {
  selectedIds: Set<string>;
  primaryId: string | null;
  mode: TransformMode;
  transformStartX: number;
  transformStartY: number;
  transformStart: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

/**
 * Selection info for quick access
 */
export interface SelectionInfo {
  selectedAnnotations: AnnotationObject[];
  primaryAnnotation: AnnotationObject | null;
  count: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } | null;
}

/**
 * Selection Manager
 * Manages multi-selection and transform operations
 */
export class SelectionManager {
  private state: SelectionState = {
    selectedIds: new Set(),
    primaryId: null,
    mode: 'none',
    transformStartX: 0,
    transformStartY: 0,
    transformStart: null,
  };

  /**
   * Select single annotation
   */
  selectAnnotation(annotationId: string | null, replace: boolean = true): void {
    if (replace) {
      this.state.selectedIds.clear();
    }

    if (annotationId) {
      this.state.selectedIds.add(annotationId);
      this.state.primaryId = annotationId;
    } else {
      this.state.selectedIds.clear();
      this.state.primaryId = null;
    }
  }

  /**
   * Add annotation to selection
   */
  addToSelection(annotationId: string): void {
    this.state.selectedIds.add(annotationId);
    if (!this.state.primaryId) {
      this.state.primaryId = annotationId;
    }
  }

  /**
   * Remove annotation from selection
   */
  removeFromSelection(annotationId: string): void {
    this.state.selectedIds.delete(annotationId);
    if (this.state.primaryId === annotationId) {
      this.state.primaryId = this.state.selectedIds.size > 0
        ? Array.from(this.state.selectedIds)[0]
        : null;
    }
  }

  /**
   * Toggle annotation selection
   */
  toggleSelection(annotationId: string): void {
    if (this.state.selectedIds.has(annotationId)) {
      this.removeFromSelection(annotationId);
    } else {
      this.addToSelection(annotationId);
    }
  }

  /**
   * Check if annotation is selected
   */
  isSelected(annotationId: string): boolean {
    return this.state.selectedIds.has(annotationId);
  }

  /**
   * Check if annotation is primary
   */
  isPrimary(annotationId: string): boolean {
    return this.state.primaryId === annotationId;
  }

  /**
   * Get selected annotation IDs
   */
  getSelectedIds(): string[] {
    return Array.from(this.state.selectedIds);
  }

  /**
   * Get selection count
   */
  getSelectionCount(): number {
    return this.state.selectedIds.size;
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.state.selectedIds.clear();
    this.state.primaryId = null;
    this.state.mode = 'none';
  }

  /**
   * Start transform operation
   */
  startTransform(
    mode: TransformMode,
    x: number,
    y: number,
    annotation: AnnotationObject
  ): void {
    this.state.mode = mode;
    this.state.transformStartX = x;
    this.state.transformStartY = y;
    this.state.transformStart = {
      x: annotation.x,
      y: annotation.y,
      width: annotation.width,
      height: annotation.height,
    };
  }

  /**
   * Get current transform state
   */
  getTransformState() {
    return {
      mode: this.state.mode,
      startX: this.state.transformStartX,
      startY: this.state.transformStartY,
      start: this.state.transformStart,
    };
  }

  /**
   * End transform operation
   */
  endTransform(): void {
    this.state.mode = 'none';
    this.state.transformStart = null;
  }

  /**
   * Get selection info
   */
  getSelectionInfo(annotations: AnnotationObject[]): SelectionInfo {
    const selectedAnnotations = annotations.filter((ann) =>
      this.state.selectedIds.has(ann.id)
    );

    const primaryAnnotation = selectedAnnotations.find(
      (ann) => ann.id === this.state.primaryId
    ) || null;

    let bounds = null;
    if (selectedAnnotations.length > 0) {
      let minX = selectedAnnotations[0].x;
      let minY = selectedAnnotations[0].y;
      let maxX = selectedAnnotations[0].x + selectedAnnotations[0].width;
      let maxY = selectedAnnotations[0].y + selectedAnnotations[0].height;

      for (const ann of selectedAnnotations) {
        minX = Math.min(minX, ann.x);
        minY = Math.min(minY, ann.y);
        maxX = Math.max(maxX, ann.x + ann.width);
        maxY = Math.max(maxY, ann.y + ann.height);
      }

      bounds = {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    return {
      selectedAnnotations,
      primaryAnnotation,
      count: selectedAnnotations.length,
      bounds,
    };
  }

  /**
   * Select all annotations
   */
  selectAll(annotations: AnnotationObject[]): void {
    this.state.selectedIds.clear();
    for (const ann of annotations) {
      this.state.selectedIds.add(ann.id);
    }
    if (annotations.length > 0) {
      this.state.primaryId = annotations[0].id;
    }
  }

  /**
   * Invert selection
   */
  invertSelection(annotations: AnnotationObject[]): void {
    const inverted = new Set<string>();
    for (const ann of annotations) {
      if (!this.state.selectedIds.has(ann.id)) {
        inverted.add(ann.id);
      }
    }
    this.state.selectedIds = inverted;
    if (inverted.size > 0) {
      this.state.primaryId = Array.from(inverted)[0];
    } else {
      this.state.primaryId = null;
    }
  }

  /**
   * Hit test - find annotation at coordinates
   */
  hitTest(x: number, y: number, annotations: AnnotationObject[]): string | null {
    // Test from top to bottom (reverse z-order)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i];
      if (
        x >= ann.x &&
        x <= ann.x + ann.width &&
        y >= ann.y &&
        y <= ann.y + ann.height
      ) {
        return ann.id;
      }
    }
    return null;
  }

  /**
   * Hit test with margin
   */
  hitTestWithMargin(
    x: number,
    y: number,
    margin: number,
    annotations: AnnotationObject[]
  ): string | null {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i];
      if (
        x >= ann.x - margin &&
        x <= ann.x + ann.width + margin &&
        y >= ann.y - margin &&
        y <= ann.y + ann.height + margin
      ) {
        return ann.id;
      }
    }
    return null;
  }

  /**
   * Select annotations in rectangle
   */
  selectInRectangle(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    annotations: AnnotationObject[],
    append: boolean = false
  ): void {
    if (!append) {
      this.state.selectedIds.clear();
    }

    for (const ann of annotations) {
      const annMaxX = ann.x + ann.width;
      const annMaxY = ann.y + ann.height;

      // Check if annotation is within rectangle
      if (ann.x >= minX && annMaxX <= maxX && ann.y >= minY && annMaxY <= maxY) {
        this.state.selectedIds.add(ann.id);
      }
    }

    if (this.state.selectedIds.size > 0 && !this.state.primaryId) {
      this.state.primaryId = Array.from(this.state.selectedIds)[0];
    }
  }

  /**
   * Get transform handles for selected annotations
   */
  getTransformHandles(annotation: AnnotationObject) {
    return {
      topLeft: { x: annotation.x, y: annotation.y },
      topRight: { x: annotation.x + annotation.width, y: annotation.y },
      bottomLeft: { x: annotation.x, y: annotation.y + annotation.height },
      bottomRight: {
        x: annotation.x + annotation.width,
        y: annotation.y + annotation.height,
      },
      top: {
        x: annotation.x + annotation.width / 2,
        y: annotation.y,
      },
      bottom: {
        x: annotation.x + annotation.width / 2,
        y: annotation.y + annotation.height,
      },
      left: { x: annotation.x, y: annotation.y + annotation.height / 2 },
      right: {
        x: annotation.x + annotation.width,
        y: annotation.y + annotation.height / 2,
      },
      center: {
        x: annotation.x + annotation.width / 2,
        y: annotation.y + annotation.height / 2,
      },
    };
  }

  /**
   * Get cursor for handle
   */
  getCursorForHandle(
    handle: keyof ReturnType<typeof this.getTransformHandles>
  ): string {
    const cursors = {
      topLeft: 'nwse-resize',
      topRight: 'nesw-resize',
      bottomLeft: 'nesw-resize',
      bottomRight: 'nwse-resize',
      top: 'ns-resize',
      bottom: 'ns-resize',
      left: 'ew-resize',
      right: 'ew-resize',
      center: 'move',
    };
    return cursors[handle];
  }
}
