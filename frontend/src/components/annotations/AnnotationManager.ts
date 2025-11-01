/**
 * Annotation Manager
 * Issue #66: Centralized annotation management with history, layers, and operations
 *
 * Features:
 * - Undo/Redo functionality
 * - Layer management
 * - Selection and transformation
 * - Collaborative updates
 * - Export/Import
 */

import {
  AnnotationObject,
  AnnotationAction,
  AnnotationLayer,
  AnnotationExport,
  CollaborativeAnnotationUpdate,
  AnnotationProperties,
} from './types';

interface AnnotationManagerConfig {
  maxHistorySize?: number;
  enableCollaboration?: boolean;
}

/**
 * Core annotation management engine
 */
export class AnnotationManager {
  private annotations: Map<string, AnnotationObject> = new Map();
  private layers: Map<string, AnnotationLayer> = new Map();
  private history: AnnotationAction[] = [];
  private historyIndex: number = -1;
  private selectedAnnotationId: string | null = null;
  private clipboard: AnnotationObject[] = [];
  private config: AnnotationManagerConfig;
  private listeners: Set<(action: AnnotationAction) => void> = new Set();

  constructor(config: AnnotationManagerConfig = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize || 100,
      enableCollaboration: config.enableCollaboration !== false,
    };

    this.createDefaultLayer();
  }

  /**
   * Create default layer
   */
  private createDefaultLayer(): void {
    const defaultLayer: AnnotationLayer = {
      id: 'default',
      name: 'Default Layer',
      visible: true,
      locked: false,
      zIndex: 0,
      annotations: [],
    };
    this.layers.set('default', defaultLayer);
  }

  /**
   * Add annotation
   */
  addAnnotation(annotation: AnnotationObject, layerId: string = 'default'): void {
    this.annotations.set(annotation.id, annotation);

    const layer = this.layers.get(layerId);
    if (layer) {
      layer.annotations.push(annotation.id);
    }

    this.recordAction({
      type: 'ADD',
      annotation,
    });

    this.notifyListeners({ type: 'ADD', annotation });
  }

  /**
   * Remove annotation
   */
  removeAnnotation(annotationId: string): void {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return;

    this.annotations.delete(annotationId);

    // Remove from all layers
    this.layers.forEach((layer) => {
      const index = layer.annotations.indexOf(annotationId);
      if (index > -1) {
        layer.annotations.splice(index, 1);
      }
    });

    this.recordAction({
      type: 'REMOVE',
      annotationId,
    });

    this.notifyListeners({ type: 'REMOVE', annotationId });
  }

  /**
   * Update annotation
   */
  updateAnnotation(annotationId: string, changes: Partial<AnnotationObject>): void {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return;

    const updated = { ...annotation, ...changes };
    this.annotations.set(annotationId, updated);

    this.recordAction({
      type: 'UPDATE',
      annotationId,
      changes,
    });

    this.notifyListeners({ type: 'UPDATE', annotationId, changes });
  }

  /**
   * Select annotation
   */
  selectAnnotation(annotationId: string | null): void {
    this.selectedAnnotationId = annotationId;

    this.recordAction({
      type: 'SELECT',
      annotationId,
    });
  }

  /**
   * Move annotation
   */
  moveAnnotation(annotationId: string, deltaX: number, deltaY: number): void {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return;

    const updated = {
      ...annotation,
      x: annotation.x + deltaX,
      y: annotation.y + deltaY,
    };
    this.annotations.set(annotationId, updated);

    this.recordAction({
      type: 'MOVE',
      annotationId,
      deltaX,
      deltaY,
    });

    this.notifyListeners({ type: 'MOVE', annotationId, deltaX, deltaY });
  }

  /**
   * Resize annotation
   */
  resizeAnnotation(annotationId: string, width: number, height: number): void {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return;

    const updated = {
      ...annotation,
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
    this.annotations.set(annotationId, updated);

    this.recordAction({
      type: 'RESIZE',
      annotationId,
      width,
      height,
    });

    this.notifyListeners({ type: 'RESIZE', annotationId, width, height });
  }

  /**
   * Get annotation
   */
  getAnnotation(annotationId: string): AnnotationObject | undefined {
    return this.annotations.get(annotationId);
  }

  /**
   * Get all annotations
   */
  getAllAnnotations(): AnnotationObject[] {
    return Array.from(this.annotations.values());
  }

  /**
   * Get annotations by layer
   */
  getAnnotationsByLayer(layerId: string): AnnotationObject[] {
    const layer = this.layers.get(layerId);
    if (!layer) return [];

    return layer.annotations
      .map((id) => this.annotations.get(id))
      .filter((ann) => ann !== undefined) as AnnotationObject[];
  }

  /**
   * Create layer
   */
  createLayer(name: string): string {
    const layerId = `layer-${Date.now()}`;
    const layer: AnnotationLayer = {
      id: layerId,
      name,
      visible: true,
      locked: false,
      zIndex: this.layers.size,
      annotations: [],
    };
    this.layers.set(layerId, layer);
    return layerId;
  }

  /**
   * Delete layer
   */
  deleteLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    // Move annotations to default layer
    const defaultLayer = this.layers.get('default');
    if (defaultLayer) {
      defaultLayer.annotations.push(...layer.annotations);
    }

    this.layers.delete(layerId);
  }

  /**
   * Get layer
   */
  getLayer(layerId: string): AnnotationLayer | undefined {
    return this.layers.get(layerId);
  }

  /**
   * Get all layers
   */
  getAllLayers(): AnnotationLayer[] {
    return Array.from(this.layers.values());
  }

  /**
   * Toggle layer visibility
   */
  toggleLayerVisibility(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.visible = !layer.visible;
    }
  }

  /**
   * Toggle layer locked state
   */
  toggleLayerLocked(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.locked = !layer.locked;
    }
  }

  /**
   * Copy annotations to clipboard
   */
  copy(annotationIds: string[]): void {
    this.clipboard = annotationIds
      .map((id) => this.annotations.get(id))
      .filter((ann) => ann !== undefined) as AnnotationObject[];
  }

  /**
   * Cut annotations (copy + delete)
   */
  cut(annotationIds: string[]): void {
    this.copy(annotationIds);
    annotationIds.forEach((id) => this.removeAnnotation(id));
  }

  /**
   * Paste annotations from clipboard
   */
  paste(offsetX: number = 10, offsetY: number = 10): AnnotationObject[] {
    const pasted: AnnotationObject[] = [];

    this.clipboard.forEach((original) => {
      const copy: AnnotationObject = {
        ...original,
        id: `annotation-${Date.now()}-${Math.random()}`,
        x: original.x + offsetX,
        y: original.y + offsetY,
        timestamp: new Date(),
      };

      this.addAnnotation(copy);
      pasted.push(copy);
    });

    return pasted;
  }

  /**
   * Undo last action
   */
  undo(): boolean {
    if (this.historyIndex <= 0) return false;

    this.historyIndex--;
    this.applyHistoryState();
    return true;
  }

  /**
   * Redo last undone action
   */
  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;

    this.historyIndex++;
    this.applyHistoryState();
    return true;
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
  }

  /**
   * Record action in history
   */
  private recordAction(action: AnnotationAction): void {
    // Remove any redo history
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(action);
    this.historyIndex++;

    // Maintain max history size
    if (this.history.length > (this.config.maxHistorySize || 100)) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * Apply history state
   */
  private applyHistoryState(): void {
    // Rebuild state from history
    this.annotations.clear();
    this.layers.forEach((layer) => (layer.annotations = []));

    for (let i = 0; i <= this.historyIndex; i++) {
      const action = this.history[i];

      switch (action.type) {
        case 'ADD':
          this.annotations.set(action.annotation.id, action.annotation);
          const defaultLayer = this.layers.get('default');
          if (defaultLayer) {
            defaultLayer.annotations.push(action.annotation.id);
          }
          break;

        case 'REMOVE':
          this.annotations.delete(action.annotationId);
          this.layers.forEach((layer) => {
            const idx = layer.annotations.indexOf(action.annotationId);
            if (idx > -1) layer.annotations.splice(idx, 1);
          });
          break;

        case 'UPDATE':
          const ann = this.annotations.get(action.annotationId);
          if (ann) {
            Object.assign(ann, action.changes);
          }
          break;
      }
    }
  }

  /**
   * Export annotations
   */
  export(format: 'json' | 'svg' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(
        {
          annotations: Array.from(this.annotations.values()),
          layers: Array.from(this.layers.values()),
        },
        null,
        2
      );
    }

    // SVG export
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">\n';

    this.annotations.forEach((ann) => {
      svg += `  <g id="${ann.id}">\n`;
      svg += `    <!-- ${ann.type} annotation -->\n`;
      svg += `  </g>\n`;
    });

    svg += '</svg>';
    return svg;
  }

  /**
   * Import annotations
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data);

      if (parsed.annotations && Array.isArray(parsed.annotations)) {
        parsed.annotations.forEach((ann: AnnotationObject) => {
          this.annotations.set(ann.id, ann);
        });
      }

      if (parsed.layers && Array.isArray(parsed.layers)) {
        parsed.layers.forEach((layer: AnnotationLayer) => {
          this.layers.set(layer.id, layer);
        });
      }
    } catch (error) {
      console.error('Failed to import annotations:', error);
    }
  }

  /**
   * Register change listener
   */
  onChangeListener(callback: (action: AnnotationAction) => void): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(action: AnnotationAction): void {
    this.listeners.forEach((callback) => {
      try {
        callback(action);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      totalAnnotations: this.annotations.size,
      totalLayers: this.layers.size,
      historySize: this.history.length,
      historyIndex: this.historyIndex,
      clipboardSize: this.clipboard.length,
      selectedAnnotationId: this.selectedAnnotationId,
    };
  }
}
