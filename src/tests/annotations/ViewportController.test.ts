/**
 * Viewport Controller Tests
 * Issue #66 Phase 5: Undo/redo and zoom/pan controls
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ViewportController, type ViewportState } from '@/services/ViewportController';

describe('ViewportController', () => {
  let controller: ViewportController;

  beforeEach(() => {
    controller = new ViewportController();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const state = controller.getState();

      expect(state.scale).toBe(1);
      expect(state.offsetX).toBe(0);
      expect(state.offsetY).toBe(0);
    });

    it('should initialize with custom values', () => {
      const ctrl = new ViewportController(2, 100, 200);
      const state = ctrl.getState();

      expect(state.scale).toBe(2);
      expect(state.offsetX).toBe(100);
      expect(state.offsetY).toBe(200);
    });
  });

  describe('Zoom Operations', () => {
    it('should zoom in', () => {
      controller.zoomIn(0.2);

      const state = controller.getState();
      expect(state.scale).toBeGreaterThan(1);
    });

    it('should zoom out', () => {
      controller.zoomOut(0.2);

      const state = controller.getState();
      expect(state.scale).toBeLessThan(1);
    });

    it('should respect min scale', () => {
      controller.zoom(0.05);
      controller.zoom(0.05);

      const state = controller.getState();
      expect(state.scale).toBeGreaterThanOrEqual(0.1);
    });

    it('should respect max scale', () => {
      controller.zoom(10);
      controller.zoom(10);

      const state = controller.getState();
      expect(state.scale).toBeLessThanOrEqual(5);
    });

    it('should set specific scale', () => {
      controller.setScale(2.5);

      expect(controller.getState().scale).toBe(2.5);
    });

    it('should clamp scale to limits when setting', () => {
      controller.setScale(10);

      expect(controller.getState().scale).toBe(5);
    });

    it('should get zoom percentage', () => {
      controller.setScale(1.5);

      expect(controller.getZoomPercentage()).toBe(150);
    });

    it('should zoom around center point', () => {
      controller.zoom(2, 100, 100);

      const state = controller.getState();
      expect(state.scale).toBe(2);
      expect(state.offsetX).not.toBe(0);
      expect(state.offsetY).not.toBe(0);
    });
  });

  describe('Pan Operations', () => {
    it('should pan by delta', () => {
      controller.pan(50, 75);

      const state = controller.getState();
      expect(state.offsetX).toBe(50);
      expect(state.offsetY).toBe(75);
    });

    it('should pan to specific position', () => {
      controller.panTo(200, 300);

      const state = controller.getState();
      expect(state.offsetX).toBe(200);
      expect(state.offsetY).toBe(300);
    });

    it('should accumulate pan operations', () => {
      controller.pan(50, 50);
      controller.pan(30, 20);

      const state = controller.getState();
      expect(state.offsetX).toBe(80);
      expect(state.offsetY).toBe(70);
    });
  });

  describe('Coordinate Conversion', () => {
    it('should convert screen to world coordinates', () => {
      controller.setScale(2);
      controller.panTo(100, 100);

      const world = controller.screenToWorld(100, 100);

      expect(world.x).toBe(0);
      expect(world.y).toBe(0);
    });

    it('should convert world to screen coordinates', () => {
      controller.setScale(2);
      controller.panTo(100, 100);

      const screen = controller.worldToScreen(0, 0);

      expect(screen.x).toBe(100);
      expect(screen.y).toBe(100);
    });

    it('should be invertible', () => {
      controller.setScale(1.5);
      controller.pan(75, 100);

      const worldPoint = { x: 200, y: 150 };
      const screenPoint = controller.worldToScreen(worldPoint.x, worldPoint.y);
      const backToWorld = controller.screenToWorld(screenPoint.x, screenPoint.y);

      expect(Math.abs(backToWorld.x - worldPoint.x)).toBeLessThan(0.01);
      expect(Math.abs(backToWorld.y - worldPoint.y)).toBeLessThan(0.01);
    });
  });

  describe('Fit Bounds', () => {
    it('should fit bounds in viewport', () => {
      const bounds = { minX: 0, minY: 0, maxX: 200, maxY: 200, width: 200, height: 200 };

      controller.fitBounds(bounds, 0.1, 800, 600);

      expect(controller.getState().scale).toBeGreaterThan(0);
      expect(controller.getState().scale).toBeLessThanOrEqual(5);
    });

    it('should respect max scale in fit bounds', () => {
      const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };

      controller.fitBounds(bounds, 0, 800, 600);

      expect(controller.getState().scale).toBeLessThanOrEqual(5);
    });

    it('should zoom to fit is same as fit bounds', () => {
      const bounds = { minX: 0, minY: 0, maxX: 300, maxY: 300, width: 300, height: 300 };

      controller.zoomToFit(bounds, 0.1, 800, 600);

      const state = controller.getState();
      expect(state.scale).toBeGreaterThan(0);
    });
  });

  describe('Reset', () => {
    it('should reset to default view', () => {
      controller.setScale(3);
      controller.panTo(100, 150);

      controller.reset();

      const state = controller.getState();
      expect(state.scale).toBe(1);
      expect(state.offsetX).toBe(0);
      expect(state.offsetY).toBe(0);
    });
  });

  describe('History', () => {
    it('should track zoom history', () => {
      controller.setScale(2);
      controller.setScale(1.5);

      expect(controller.canUndo()).toBe(true);
      expect(controller.canRedo()).toBe(false);
    });

    it('should undo zoom operation', () => {
      controller.setScale(2);
      const beforeUndo = controller.getState();

      controller.undo();

      const afterUndo = controller.getState();
      expect(afterUndo.scale).not.toBe(beforeUndo.scale);
    });

    it('should redo zoom operation', () => {
      controller.setScale(2);
      const afterZoom = controller.getState();

      controller.undo();
      controller.redo();

      const afterRedo = controller.getState();
      expect(afterRedo.scale).toBe(afterZoom.scale);
    });

    it('should not undo past beginning', () => {
      const result = controller.undo();

      expect(result).toBe(false);
    });

    it('should not redo past end', () => {
      const result = controller.redo();

      expect(result).toBe(false);
    });

    it('should clear redo history on new operation', () => {
      controller.setScale(2);
      controller.undo();
      expect(controller.canRedo()).toBe(true);

      controller.pan(10, 10);
      expect(controller.canRedo()).toBe(false);
    });
  });

  describe('Visible Bounds', () => {
    it('should calculate visible bounds', () => {
      controller.setScale(1);
      controller.panTo(0, 0);

      const bounds = controller.getVisibleBounds(800, 600);

      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.height).toBeGreaterThan(0);
    });

    it('should check if point is visible', () => {
      controller.setScale(1);
      controller.panTo(0, 0);

      expect(controller.isPointVisible(100, 100, 800, 600)).toBe(true);
      expect(controller.isPointVisible(2000, 2000, 800, 600)).toBe(false);
    });

    it('should check if bounds overlap visible area', () => {
      controller.setScale(1);
      controller.panTo(0, 0);

      const visibleBounds = {
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 100,
        width: 100,
        height: 100,
      };

      expect(controller.boundsVisible(visibleBounds, 800, 600)).toBe(true);
    });

    it('should detect non-overlapping bounds', () => {
      controller.setScale(1);
      controller.panTo(0, 0);

      const farBounds = {
        minX: 2000,
        minY: 2000,
        maxX: 2100,
        maxY: 2100,
        width: 100,
        height: 100,
      };

      expect(controller.boundsVisible(farBounds, 800, 600)).toBe(false);
    });
  });

  describe('Scale Limits', () => {
    it('should get scale limits', () => {
      const limits = controller.getScaleLimits();

      expect(limits.min).toBe(0.1);
      expect(limits.max).toBe(5);
      expect(limits.current).toBe(1);
    });

    it('should set scale limits', () => {
      controller.setScaleLimits(0.5, 3);

      const limits = controller.getScaleLimits();
      expect(limits.min).toBe(0.5);
      expect(limits.max).toBe(3);
    });

    it('should clamp scale to new limits', () => {
      controller.setScale(4);
      controller.setScaleLimits(0.5, 3);

      expect(controller.getState().scale).toBeLessThanOrEqual(3);
    });
  });

  describe('State Management', () => {
    it('should get state as copy', () => {
      const state1 = controller.getState();
      state1.scale = 5;

      const state2 = controller.getState();
      expect(state2.scale).not.toBe(5);
    });

    it('should set state directly', () => {
      const newState: ViewportState = {
        scale: 2,
        offsetX: 100,
        offsetY: 150,
      };

      controller.setState(newState);

      expect(controller.getState()).toEqual(newState);
    });
  });

  describe('Zoom to Fit Check', () => {
    it('should detect when zoomed to fit', () => {
      const bounds = { minX: 0, minY: 0, maxX: 1000, maxY: 750, width: 1000, height: 750 };

      controller.zoomToFit(bounds, 0.1, 800, 600);

      expect(controller.isZoomedToFit(bounds, 800, 600)).toBe(true);
    });

    it('should detect when not zoomed to fit', () => {
      controller.setScale(1);

      const bounds = { minX: 0, minY: 0, maxX: 1000, maxY: 750, width: 1000, height: 750 };

      expect(controller.isZoomedToFit(bounds, 800, 600)).toBe(false);
    });
  });
});
