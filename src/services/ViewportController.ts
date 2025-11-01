/**
 * Viewport Controller
 * Issue #66 Phase 5: Undo/redo and zoom/pan controls
 *
 * Manages viewport transformations: zoom, pan, and fit-to-view
 */

export interface ViewportState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Viewport Controller
 * Handles zoom, pan, and viewport management
 */
export class ViewportController {
  private state: ViewportState = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };

  private minScale = 0.1;
  private maxScale = 5;
  private zoomStep = 0.1;

  private history: ViewportState[] = [];
  private historyIndex = -1;

  constructor(initialScale = 1, initialOffsetX = 0, initialOffsetY = 0) {
    this.state = {
      scale: initialScale,
      offsetX: initialOffsetX,
      offsetY: initialOffsetY,
    };
    this.recordHistory();
  }

  /**
   * Get current viewport state
   */
  getState(): ViewportState {
    return { ...this.state };
  }

  /**
   * Set viewport state directly
   */
  setState(state: ViewportState): void {
    this.state = { ...state };
    this.recordHistory();
  }

  /**
   * Zoom in
   */
  zoomIn(factor = this.zoomStep): void {
    this.zoom(1 + factor);
  }

  /**
   * Zoom out
   */
  zoomOut(factor = this.zoomStep): void {
    this.zoom(1 - factor);
  }

  /**
   * Zoom to specific scale
   */
  zoom(factor: number, centerX?: number, centerY?: number): void {
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.state.scale * factor));

    if (newScale === this.state.scale) return;

    // If center point provided, zoom around it
    if (centerX !== undefined && centerY !== undefined) {
      const scaleFactor = newScale / this.state.scale;
      const newOffsetX = centerX - (centerX - this.state.offsetX) * scaleFactor;
      const newOffsetY = centerY - (centerY - this.state.offsetY) * scaleFactor;

      this.state.scale = newScale;
      this.state.offsetX = newOffsetX;
      this.state.offsetY = newOffsetY;
    } else {
      // Zoom around current center
      this.state.scale = newScale;
    }

    this.recordHistory();
  }

  /**
   * Pan by offset
   */
  pan(deltaX: number, deltaY: number): void {
    this.state.offsetX += deltaX;
    this.state.offsetY += deltaY;
    this.recordHistory();
  }

  /**
   * Pan to specific position
   */
  panTo(x: number, y: number): void {
    this.state.offsetX = x;
    this.state.offsetY = y;
    this.recordHistory();
  }

  /**
   * Set specific scale
   */
  setScale(scale: number): void {
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, scale));
    if (newScale !== this.state.scale) {
      this.state.scale = newScale;
      this.recordHistory();
    }
  }

  /**
   * Fit bounds to viewport
   */
  fitBounds(bounds: ViewportBounds, padding = 0.1, viewportWidth = 800, viewportHeight = 600): void {
    const width = bounds.width || 1;
    const height = bounds.height || 1;

    // Calculate scale to fit with padding
    const scaleX = (viewportWidth * (1 - padding)) / width;
    const scaleY = (viewportHeight * (1 - padding)) / height;
    const scale = Math.min(scaleX, scaleY, this.maxScale);

    // Center the bounds in viewport
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const offsetX = (viewportWidth - scaledWidth) / 2;
    const offsetY = (viewportHeight - scaledHeight) / 2;

    this.state.scale = scale;
    this.state.offsetX = offsetX - bounds.minX * scale;
    this.state.offsetY = offsetY - bounds.minY * scale;

    this.recordHistory();
  }

  /**
   * Zoom to fit all content
   */
  zoomToFit(
    contentBounds: ViewportBounds,
    padding = 0.1,
    viewportWidth = 800,
    viewportHeight = 600
  ): void {
    this.fitBounds(contentBounds, padding, viewportWidth, viewportHeight);
  }

  /**
   * Reset to default view
   */
  reset(): void {
    this.state = {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
    this.recordHistory();
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.state.offsetX) / this.state.scale,
      y: (screenY - this.state.offsetY) / this.state.scale,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.state.scale + this.state.offsetX,
      y: worldY * this.state.scale + this.state.offsetY,
    };
  }

  /**
   * Record viewport state in history
   */
  private recordHistory(): void {
    // Remove any redo history
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push({ ...this.state });
    this.historyIndex++;

    // Maintain max history size
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * Undo viewport change
   */
  undo(): boolean {
    if (this.historyIndex <= 0) return false;

    this.historyIndex--;
    this.state = { ...this.history[this.historyIndex] };
    return true;
  }

  /**
   * Redo viewport change
   */
  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;

    this.historyIndex++;
    this.state = { ...this.history[this.historyIndex] };
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
   * Get zoom percentage
   */
  getZoomPercentage(): number {
    return Math.round(this.state.scale * 100);
  }

  /**
   * Is zoomed to fit
   */
  isZoomedToFit(bounds: ViewportBounds, viewportWidth = 800, viewportHeight = 600): boolean {
    if (!bounds) return false;

    const width = bounds.width || 1;
    const height = bounds.height || 1;

    const scaleX = (viewportWidth * 0.9) / width;
    const scaleY = (viewportHeight * 0.9) / height;
    const expectedScale = Math.min(scaleX, scaleY, this.maxScale);

    return Math.abs(this.state.scale - expectedScale) < 0.01;
  }

  /**
   * Get scale constraints
   */
  getScaleLimits() {
    return {
      min: this.minScale,
      max: this.maxScale,
      current: this.state.scale,
    };
  }

  /**
   * Set scale limits
   */
  setScaleLimits(min: number, max: number): void {
    this.minScale = Math.max(0.01, min);
    this.maxScale = Math.min(10, max);

    // Clamp current scale to new limits
    if (this.state.scale < this.minScale) {
      this.setScale(this.minScale);
    } else if (this.state.scale > this.maxScale) {
      this.setScale(this.maxScale);
    }
  }

  /**
   * Get visible bounds in world coordinates
   */
  getVisibleBounds(viewportWidth = 800, viewportHeight = 600): ViewportBounds {
    const minX = this.screenToWorld(0, 0).x;
    const minY = this.screenToWorld(0, 0).y;
    const maxX = this.screenToWorld(viewportWidth, viewportHeight).x;
    const maxY = this.screenToWorld(viewportWidth, viewportHeight).y;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Check if point is in visible area
   */
  isPointVisible(worldX: number, worldY: number, viewportWidth = 800, viewportHeight = 600): boolean {
    const bounds = this.getVisibleBounds(viewportWidth, viewportHeight);
    return (
      worldX >= bounds.minX &&
      worldX <= bounds.maxX &&
      worldY >= bounds.minY &&
      worldY <= bounds.maxY
    );
  }

  /**
   * Check if bounds overlap visible area
   */
  boundsVisible(bounds: ViewportBounds, viewportWidth = 800, viewportHeight = 600): boolean {
    const visible = this.getVisibleBounds(viewportWidth, viewportHeight);
    return !(
      bounds.maxX < visible.minX ||
      bounds.minX > visible.maxX ||
      bounds.maxY < visible.minY ||
      bounds.minY > visible.maxY
    );
  }
}
