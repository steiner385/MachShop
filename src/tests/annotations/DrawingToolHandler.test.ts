/**
 * Drawing Tool Handler Tests
 * Issue #66 Phase 2: Interactive drawing tool implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DrawingToolHandler,
  FreehandPathCollector,
  type DrawingContext,
} from '@/services/DrawingToolHandler';

describe('DrawingToolHandler', () => {
  describe('createContext', () => {
    it('should create a drawing context with correct initial values', () => {
      const context = DrawingToolHandler.createContext('rectangle', 10, 20);

      expect(context).toEqual({
        toolType: 'rectangle',
        startX: 10,
        startY: 20,
        currentX: 10,
        currentY: 20,
        properties: {},
      });
    });

    it('should include default properties when provided', () => {
      const defaultProps = { strokeColor: '#ff0000', strokeWidth: 3 };
      const context = DrawingToolHandler.createContext(
        'circle',
        5,
        15,
        defaultProps
      );

      expect(context.properties).toEqual(defaultProps);
    });

    it('should work with all annotation types', () => {
      const types = [
        'arrow',
        'rectangle',
        'circle',
        'line',
        'freehand',
        'text',
        'callout',
        'highlight',
        'measurement',
      ] as const;

      types.forEach((type) => {
        const context = DrawingToolHandler.createContext(type, 0, 0);
        expect(context.toolType).toBe(type);
      });
    });
  });

  describe('updateContext', () => {
    let context: DrawingContext;

    beforeEach(() => {
      context = DrawingToolHandler.createContext('rectangle', 0, 0);
    });

    it('should update current coordinates', () => {
      const updated = DrawingToolHandler.updateContext(context, 50, 75);

      expect(updated.currentX).toBe(50);
      expect(updated.currentY).toBe(75);
      expect(updated.startX).toBe(0);
      expect(updated.startY).toBe(0);
    });

    it('should preserve other context properties', () => {
      context.properties = { strokeColor: '#000' };
      const updated = DrawingToolHandler.updateContext(context, 100, 100);

      expect(updated.properties).toEqual(context.properties);
      expect(updated.toolType).toBe('rectangle');
    });
  });

  describe('getDrawingBounds', () => {
    it('should calculate bounds correctly for positive coordinates', () => {
      const context = DrawingToolHandler.createContext('rectangle', 10, 20);
      const updated = DrawingToolHandler.updateContext(context, 50, 60);

      const bounds = DrawingToolHandler.getDrawingBounds(updated);

      expect(bounds).toEqual({
        x: 10,
        y: 20,
        width: 40,
        height: 40,
      });
    });

    it('should normalize bounds when drawing backward', () => {
      const context = DrawingToolHandler.createContext('rectangle', 100, 100);
      const updated = DrawingToolHandler.updateContext(context, 50, 60);

      const bounds = DrawingToolHandler.getDrawingBounds(updated);

      expect(bounds).toEqual({
        x: 50,
        y: 60,
        width: 50,
        height: 40,
      });
    });

    it('should handle zero-sized drawings', () => {
      const context = DrawingToolHandler.createContext('rectangle', 25, 35);
      const updated = DrawingToolHandler.updateContext(context, 25, 35);

      const bounds = DrawingToolHandler.getDrawingBounds(updated);

      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });
  });

  describe('createAnnotation', () => {
    it('should create a valid annotation from context', () => {
      const context = DrawingToolHandler.createContext('rectangle', 10, 20);
      const updated = DrawingToolHandler.updateContext(context, 50, 60);
      updated.properties = { strokeColor: '#0000ff' };

      const annotation = DrawingToolHandler.createAnnotation(
        updated,
        'test-id-123',
        'user-1'
      );

      expect(annotation.id).toBe('test-id-123');
      expect(annotation.type).toBe('rectangle');
      expect(annotation.x).toBe(10);
      expect(annotation.y).toBe(20);
      expect(annotation.width).toBe(40);
      expect(annotation.height).toBe(40);
      expect(annotation.createdBy).toBe('user-1');
      expect(annotation.properties).toEqual({ strokeColor: '#0000ff' });
    });

    it('should set default values for annotation', () => {
      const context = DrawingToolHandler.createContext('circle', 5, 5);
      const updated = DrawingToolHandler.updateContext(context, 25, 25);

      const annotation = DrawingToolHandler.createAnnotation(
        updated,
        'circle-1',
        'user-1'
      );

      expect(annotation.locked).toBe(false);
      expect(annotation.hidden).toBe(false);
      expect(annotation.zIndex).toBe(0);
      expect(annotation.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('isValidDrawing', () => {
    it('should return false for drawings smaller than minimum size', () => {
      const context = DrawingToolHandler.createContext('rectangle', 10, 10);
      const updated = DrawingToolHandler.updateContext(context, 12, 12);

      expect(DrawingToolHandler.isValidDrawing(updated)).toBe(false);
    });

    it('should return true for drawings larger than minimum size', () => {
      const context = DrawingToolHandler.createContext('rectangle', 10, 10);
      const updated = DrawingToolHandler.updateContext(context, 20, 20);

      expect(DrawingToolHandler.isValidDrawing(updated)).toBe(true);
    });

    it('should always return true for freehand tool', () => {
      const context = DrawingToolHandler.createContext('freehand', 10, 10);
      const updated = DrawingToolHandler.updateContext(context, 11, 11);

      expect(DrawingToolHandler.isValidDrawing(updated)).toBe(true);
    });
  });

  describe('getMinimumSize', () => {
    it('should return 1 for freehand', () => {
      expect(DrawingToolHandler.getMinimumSize('freehand')).toBe(1);
    });

    it('should return 5 for other tools', () => {
      const tools = [
        'arrow',
        'rectangle',
        'circle',
        'line',
        'text',
        'callout',
        'highlight',
        'measurement',
      ] as const;

      tools.forEach((tool) => {
        expect(DrawingToolHandler.getMinimumSize(tool)).toBe(5);
      });
    });
  });

  describe('finalizeProperties', () => {
    it('should set default arrow properties', () => {
      const context = DrawingToolHandler.createContext('arrow', 0, 0);
      const props = DrawingToolHandler.finalizeProperties('arrow', context);

      expect(props.arrowStart).toBe('none');
      expect(props.arrowEnd).toBe('arrow');
      expect(props.arrowStyle).toBe('solid');
      expect(props.strokeColor).toBe('#000000');
      expect(props.strokeWidth).toBe(2);
    });

    it('should set default rectangle properties', () => {
      const context = DrawingToolHandler.createContext('rectangle', 0, 0);
      const props = DrawingToolHandler.finalizeProperties('rectangle', context);

      expect(props.strokeColor).toBe('#000000');
      expect(props.fillColor).toBe('transparent');
      expect(props.fillOpacity).toBe(0);
    });

    it('should preserve custom properties', () => {
      const context = DrawingToolHandler.createContext('circle', 0, 0, {
        strokeColor: '#ff0000',
      });
      const props = DrawingToolHandler.finalizeProperties('circle', context);

      expect(props.strokeColor).toBe('#ff0000');
      expect(props.strokeWidth).toBe(2); // Default added
    });
  });

  describe('getCursorForTool', () => {
    it('should return correct cursor for each tool', () => {
      expect(DrawingToolHandler.getCursorForTool('text')).toBe('text');
      expect(DrawingToolHandler.getCursorForTool('freehand')).toBe('pencil');
      expect(DrawingToolHandler.getCursorForTool('rectangle')).toBe('crosshair');
      expect(DrawingToolHandler.getCursorForTool('circle')).toBe('crosshair');
    });
  });

  describe('requiresSpecialMode', () => {
    it('should identify freehand mode', () => {
      expect(DrawingToolHandler.requiresSpecialMode('freehand')).toBe(
        'freehand'
      );
    });

    it('should identify text mode', () => {
      expect(DrawingToolHandler.requiresSpecialMode('text')).toBe('text');
      expect(DrawingToolHandler.requiresSpecialMode('callout')).toBe('text');
    });

    it('should identify measurement mode', () => {
      expect(DrawingToolHandler.requiresSpecialMode('measurement')).toBe(
        'measurement'
      );
    });

    it('should return normal mode for shapes', () => {
      expect(DrawingToolHandler.requiresSpecialMode('arrow')).toBe('normal');
      expect(DrawingToolHandler.requiresSpecialMode('rectangle')).toBe('normal');
    });
  });

  describe('getPreviewData', () => {
    it('should return arrow preview data', () => {
      const context = DrawingToolHandler.createContext('arrow', 10, 20);
      const updated = DrawingToolHandler.updateContext(context, 50, 80);

      const preview = DrawingToolHandler.getPreviewData(updated);

      expect(preview).toEqual({
        type: 'arrow',
        x1: 10,
        y1: 20,
        x2: 50,
        y2: 80,
      });
    });

    it('should return rectangle preview data with normalized bounds', () => {
      const context = DrawingToolHandler.createContext('rectangle', 50, 50);
      const updated = DrawingToolHandler.updateContext(context, 10, 20);

      const preview = DrawingToolHandler.getPreviewData(updated);

      expect(preview).toEqual({
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 40,
        height: 30,
      });
    });

    it('should return circle preview data with center and radius', () => {
      const context = DrawingToolHandler.createContext('circle', 10, 10);
      const updated = DrawingToolHandler.updateContext(context, 30, 30);

      const preview = DrawingToolHandler.getPreviewData(updated);

      expect(preview?.type).toBe('circle');
      expect(preview?.cx).toBe(20);
      expect(preview?.cy).toBe(20);
      expect(preview?.radius).toBe(10);
    });
  });
});

describe('FreehandPathCollector', () => {
  let collector: FreehandPathCollector;

  beforeEach(() => {
    collector = new FreehandPathCollector(0, 0, 2);
  });

  describe('addPoint', () => {
    it('should add point if distance threshold is met', () => {
      const added = collector.addPoint(5, 0);

      expect(added).toBe(true);
      expect(collector.getPoints().length).toBe(2);
    });

    it('should not add point if distance threshold is not met', () => {
      const added = collector.addPoint(1, 0);

      expect(added).toBe(false);
      expect(collector.getPoints().length).toBe(1);
    });

    it('should track multiple points correctly', () => {
      collector.addPoint(5, 0);
      collector.addPoint(10, 0);
      collector.addPoint(15, 5);

      const points = collector.getPoints();
      expect(points.length).toBe(4); // Initial + 3 added
      expect(points[0]).toEqual([0, 0]);
      expect(points[3]).toEqual([15, 5]);
    });
  });

  describe('getPathData', () => {
    it('should return empty string for single point', () => {
      const pathData = collector.getPathData();

      expect(pathData).toBe('M 0 0');
    });

    it('should generate SVG path from points', () => {
      collector.addPoint(10, 0);
      collector.addPoint(10, 10);

      const pathData = collector.getPathData();

      expect(pathData).toMatch(/^M 0 0 L 10 0 L 10 10$/);
    });
  });

  describe('getBoundingBox', () => {
    it('should calculate bounding box correctly', () => {
      collector.addPoint(10, 5);
      collector.addPoint(5, 15);

      const bbox = collector.getBoundingBox();

      expect(bbox.x).toBe(0);
      expect(bbox.y).toBe(0);
      expect(bbox.width).toBe(10);
      expect(bbox.height).toBe(15);
    });

    it('should handle negative coordinates', () => {
      const collector2 = new FreehandPathCollector(-10, -10, 2);
      collector2.addPoint(5, 5);

      const bbox = collector2.getBoundingBox();

      expect(bbox.x).toBe(-10);
      expect(bbox.y).toBe(-10);
      expect(bbox.width).toBe(15);
      expect(bbox.height).toBe(15);
    });
  });

  describe('isValid', () => {
    it('should return false for single point', () => {
      expect(collector.isValid()).toBe(false);
    });

    it('should return true for multiple points', () => {
      collector.addPoint(5, 0);

      expect(collector.isValid()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all points', () => {
      collector.addPoint(10, 0);
      collector.addPoint(20, 0);

      collector.reset();

      expect(collector.getPoints().length).toBe(0);
      expect(collector.isValid()).toBe(false);
    });
  });
});
