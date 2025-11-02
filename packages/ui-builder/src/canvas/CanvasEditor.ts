/**
 * Canvas Editor Implementation (#485)
 * Drag-and-drop canvas with undo/redo and data binding
 */

import { CanvasElement, CanvasState, CanvasHistoryEntry, DataBinding, CanvasElementType } from '../types';

export class CanvasEditor {
  private state: CanvasState;
  private listeners: Set<(state: CanvasState) => void> = new Set();

  constructor() {
    this.state = {
      elements: new Map(),
      history: [],
      historyIndex: -1,
      zoom: 1,
      panX: 0,
      panY: 0,
      gridSize: 10,
      snapToGrid: true,
      showGrid: true,
    };
  }

  // ========== Element Management ==========

  public addElement(element: CanvasElement): void {
    this.state.elements.set(element.id, element);
    this.recordHistory('add', element.id, undefined, element);
    this.notifyListeners();
  }

  public removeElement(elementId: string): void {
    const element = this.state.elements.get(elementId);
    if (element) {
      this.state.elements.delete(elementId);
      this.recordHistory('remove', elementId, element, undefined);
      this.notifyListeners();
    }
  }

  public updateElement(elementId: string, updates: Partial<CanvasElement>): void {
    const element = this.state.elements.get(elementId);
    if (element) {
      const updated = { ...element, ...updates };
      this.state.elements.set(elementId, updated);
      this.recordHistory('modify', elementId, element, updated);
      this.notifyListeners();
    }
  }

  public getElement(elementId: string): CanvasElement | undefined {
    return this.state.elements.get(elementId);
  }

  public getAllElements(): CanvasElement[] {
    return Array.from(this.state.elements.values());
  }

  // ========== Selection ==========

  public selectElement(elementId: string): void {
    const current = this.state.selectedElementId;
    if (current) {
      const elem = this.state.elements.get(current);
      if (elem) {
        elem.selected = false;
      }
    }

    const elem = this.state.elements.get(elementId);
    if (elem) {
      elem.selected = true;
      this.state.selectedElementId = elementId;
      this.notifyListeners();
    }
  }

  public deselectElement(): void {
    if (this.state.selectedElementId) {
      const elem = this.state.elements.get(this.state.selectedElementId);
      if (elem) {
        elem.selected = false;
      }
      this.state.selectedElementId = undefined;
      this.notifyListeners();
    }
  }

  public getSelectedElement(): CanvasElement | undefined {
    if (this.state.selectedElementId) {
      return this.state.elements.get(this.state.selectedElementId);
    }
    return undefined;
  }

  // ========== Movement & Resizing ==========

  public moveElement(elementId: string, x: number, y: number): void {
    const elem = this.state.elements.get(elementId);
    if (elem) {
      const snappedX = this.state.snapToGrid ? Math.round(x / this.state.gridSize) * this.state.gridSize : x;
      const snappedY = this.state.snapToGrid ? Math.round(y / this.state.gridSize) * this.state.gridSize : y;

      const before = { ...elem };
      elem.position = { x: snappedX, y: snappedY };
      this.recordHistory('move', elementId, before, elem);
      this.notifyListeners();
    }
  }

  public resizeElement(elementId: string, width: number, height: number): void {
    const elem = this.state.elements.get(elementId);
    if (elem) {
      const before = { ...elem };
      elem.size = { width: Math.max(50, width), height: Math.max(50, height) };
      this.recordHistory('resize', elementId, before, elem);
      this.notifyListeners();
    }
  }

  // ========== Copy/Paste ==========

  private clipboard: CanvasElement | null = null;

  public copyElement(elementId: string): void {
    const elem = this.state.elements.get(elementId);
    if (elem) {
      this.clipboard = { ...elem };
    }
  }

  public pasteElement(): CanvasElement | undefined {
    if (!this.clipboard) return undefined;

    const newId = `${this.clipboard.type}_${Date.now()}`;
    const newElement: CanvasElement = {
      ...this.clipboard,
      id: newId,
      position: {
        x: this.clipboard.position.x + 20,
        y: this.clipboard.position.y + 20,
      },
    };

    this.addElement(newElement);
    return newElement;
  }

  // ========== Undo/Redo ==========

  public undo(): void {
    if (this.state.historyIndex > 0) {
      this.state.historyIndex--;
      this.applyHistory();
    }
  }

  public redo(): void {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.historyIndex++;
      this.applyHistory();
    }
  }

  private recordHistory(
    action: string,
    elementId: string,
    before: CanvasElement | undefined,
    after: CanvasElement | undefined
  ): void {
    // Remove any history after current index
    this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);

    this.state.history.push({
      action: action as any,
      elementId,
      before,
      after,
      timestamp: Date.now(),
    });

    this.state.historyIndex++;
  }

  private applyHistory(): void {
    const entry = this.state.history[this.state.historyIndex];
    if (!entry) return;

    switch (entry.action) {
      case 'add':
        if (entry.after) {
          this.state.elements.set(entry.elementId, entry.after);
        }
        break;
      case 'remove':
        this.state.elements.delete(entry.elementId);
        break;
      case 'modify':
      case 'move':
      case 'resize':
        if (entry.after) {
          this.state.elements.set(entry.elementId, entry.after);
        }
        break;
    }

    this.notifyListeners();
  }

  // ========== Zoom & Pan ==========

  public setZoom(zoom: number): void {
    this.state.zoom = Math.max(0.1, Math.min(5, zoom));
    this.notifyListeners();
  }

  public setPan(x: number, y: number): void {
    this.state.panX = x;
    this.state.panY = y;
    this.notifyListeners();
  }

  public getZoom(): number {
    return this.state.zoom;
  }

  public getPan(): { x: number; y: number } {
    return { x: this.state.panX, y: this.state.panY };
  }

  // ========== Grid Settings ==========

  public setGridSize(size: number): void {
    this.state.gridSize = Math.max(5, size);
    this.notifyListeners();
  }

  public setSnapToGrid(snap: boolean): void {
    this.state.snapToGrid = snap;
    this.notifyListeners();
  }

  public setShowGrid(show: boolean): void {
    this.state.showGrid = show;
    this.notifyListeners();
  }

  // ========== State Management ==========

  public getState(): CanvasState {
    return { ...this.state };
  }

  public subscribe(listener: (state: CanvasState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  // ========== Validation ==========

  public validateLayout(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const elem of this.state.elements.values()) {
      if (elem.size.width < 10 || elem.size.height < 10) {
        errors.push(`Element ${elem.id} is too small`);
      }

      if (elem.parent && !this.state.elements.has(elem.parent)) {
        errors.push(`Element ${elem.id} has invalid parent`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ========== Export/Import ==========

  public exportCanvas(): string {
    return JSON.stringify({
      elements: Array.from(this.state.elements.values()),
      zoom: this.state.zoom,
      gridSize: this.state.gridSize,
    });
  }

  public importCanvas(json: string): void {
    try {
      const data = JSON.parse(json);
      this.state.elements.clear();

      for (const elem of data.elements) {
        this.state.elements.set(elem.id, elem);
      }

      this.state.zoom = data.zoom || 1;
      this.state.gridSize = data.gridSize || 10;
      this.state.history = [];
      this.state.historyIndex = -1;

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to import canvas:', error);
    }
  }
}
