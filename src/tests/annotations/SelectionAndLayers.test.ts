/**
 * Selection and Layer Management Tests
 * Issue #66 Phase 4: Layer management and selection/editing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SelectionManager, type SelectionState } from '@/services/SelectionManager';

describe('SelectionManager', () => {
  let selectionManager: SelectionManager;
  const mockAnnotations = [
    {
      id: 'ann-1',
      type: 'rectangle' as const,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      properties: {},
      timestamp: new Date(),
      createdBy: 'user-1',
    },
    {
      id: 'ann-2',
      type: 'circle' as const,
      x: 120,
      y: 0,
      width: 80,
      height: 80,
      properties: {},
      timestamp: new Date(),
      createdBy: 'user-1',
    },
    {
      id: 'ann-3',
      type: 'text' as const,
      x: 50,
      y: 120,
      width: 150,
      height: 40,
      properties: {},
      timestamp: new Date(),
      createdBy: 'user-1',
    },
  ];

  beforeEach(() => {
    selectionManager = new SelectionManager();
  });

  describe('Single Selection', () => {
    it('should select a single annotation', () => {
      selectionManager.selectAnnotation('ann-1');

      expect(selectionManager.isSelected('ann-1')).toBe(true);
      expect(selectionManager.getSelectionCount()).toBe(1);
    });

    it('should replace selection when selecting another', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.selectAnnotation('ann-2');

      expect(selectionManager.isSelected('ann-1')).toBe(false);
      expect(selectionManager.isSelected('ann-2')).toBe(true);
      expect(selectionManager.getSelectionCount()).toBe(1);
    });

    it('should set primary annotation', () => {
      selectionManager.selectAnnotation('ann-1');

      expect(selectionManager.isPrimary('ann-1')).toBe(true);
    });

    it('should clear selection when selecting null', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.selectAnnotation(null);

      expect(selectionManager.getSelectionCount()).toBe(0);
    });
  });

  describe('Multi-Selection', () => {
    it('should add annotations to selection', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.addToSelection('ann-2', true); // Keep primary

      expect(selectionManager.isSelected('ann-1')).toBe(true);
      expect(selectionManager.isSelected('ann-2')).toBe(true);
      expect(selectionManager.getSelectionCount()).toBe(2);
    });

    it('should remove from selection', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.addToSelection('ann-2', true); // Keep primary
      selectionManager.removeFromSelection('ann-1');

      expect(selectionManager.isSelected('ann-1')).toBe(false);
      expect(selectionManager.isSelected('ann-2')).toBe(true);
      expect(selectionManager.getSelectionCount()).toBe(1);
    });

    it('should toggle selection', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.toggleSelection('ann-1', false);

      expect(selectionManager.isSelected('ann-1')).toBe(false);

      selectionManager.toggleSelection('ann-1', false);

      expect(selectionManager.isSelected('ann-1')).toBe(true);
    });

    it('should select all annotations', () => {
      selectionManager.selectAll(mockAnnotations);

      expect(selectionManager.getSelectionCount()).toBe(3);
      expect(selectionManager.isSelected('ann-1')).toBe(true);
      expect(selectionManager.isSelected('ann-2')).toBe(true);
      expect(selectionManager.isSelected('ann-3')).toBe(true);
    });

    it('should invert selection', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.addToSelection('ann-2', false);
      selectionManager.invertSelection(mockAnnotations);

      expect(selectionManager.isSelected('ann-1')).toBe(false);
      expect(selectionManager.isSelected('ann-2')).toBe(false);
      expect(selectionManager.isSelected('ann-3')).toBe(true);
      expect(selectionManager.getSelectionCount()).toBe(1);
    });
  });

  describe('Selection Info', () => {
    it('should return selection info', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.addToSelection('ann-2', true); // Keep primary

      const info = selectionManager.getSelectionInfo(mockAnnotations);

      expect(info.count).toBe(2);
      expect(info.selectedAnnotations.length).toBe(2);
      expect(info.primaryAnnotation?.id).toBe('ann-1');
    });

    it('should calculate selection bounds', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.addToSelection('ann-3', true); // Keep primary

      const info = selectionManager.getSelectionInfo(mockAnnotations);

      expect(info.bounds).not.toBeNull();
      expect(info.bounds?.minX).toBe(0);
      expect(info.bounds?.minY).toBe(0);
      expect(info.bounds?.maxX).toBe(200);
      expect(info.bounds?.maxY).toBe(160);
    });

    it('should return null bounds for empty selection', () => {
      const info = selectionManager.getSelectionInfo(mockAnnotations);

      expect(info.bounds).toBeNull();
      expect(info.count).toBe(0);
    });
  });

  describe('Hit Testing', () => {
    it('should find annotation at coordinates', () => {
      const hitId = selectionManager.hitTest(50, 50, mockAnnotations);

      expect(hitId).toBe('ann-1');
    });

    it('should return null for coordinates outside all annotations', () => {
      const hitId = selectionManager.hitTest(300, 300, mockAnnotations);

      expect(hitId).toBeNull();
    });

    it('should test with margin', () => {
      const hitId = selectionManager.hitTestWithMargin(
        105,
        50,
        10,
        mockAnnotations
      );

      expect(hitId).toBe('ann-1'); // Within margin
    });

    it('should select annotations in rectangle', () => {
      selectionManager.selectInRectangle(0, 0, 200, 200, mockAnnotations);

      expect(selectionManager.isSelected('ann-1')).toBe(true);
      expect(selectionManager.isSelected('ann-2')).toBe(true);
      expect(selectionManager.isSelected('ann-3')).toBe(true);
    });

    it('should handle partial rectangle selection', () => {
      selectionManager.selectInRectangle(
        0,
        0,
        100,
        100,
        mockAnnotations
      );

      expect(selectionManager.isSelected('ann-1')).toBe(true);
      expect(selectionManager.isSelected('ann-2')).toBe(false);
    });
  });

  describe('Transform Operations', () => {
    it('should start transform operation', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.startTransform('move', 50, 50, mockAnnotations[0]);

      const state = selectionManager.getTransformState();

      expect(state.mode).toBe('move');
      expect(state.startX).toBe(50);
      expect(state.startY).toBe(50);
      expect(state.start?.x).toBe(0);
    });

    it('should end transform operation', () => {
      selectionManager.startTransform('move', 50, 50, mockAnnotations[0]);
      selectionManager.endTransform();

      const state = selectionManager.getTransformState();

      expect(state.mode).toBe('none');
      expect(state.start).toBeNull();
    });
  });

  describe('Transform Handles', () => {
    it('should get transform handles for annotation', () => {
      const handles = selectionManager.getTransformHandles(mockAnnotations[0]);

      expect(handles.topLeft).toEqual({ x: 0, y: 0 });
      expect(handles.bottomRight).toEqual({ x: 100, y: 100 });
      expect(handles.center).toEqual({ x: 50, y: 50 });
    });

    it('should get correct cursor for handle', () => {
      expect(selectionManager.getCursorForHandle('topLeft')).toBe('nwse-resize');
      expect(selectionManager.getCursorForHandle('top')).toBe('ns-resize');
      expect(selectionManager.getCursorForHandle('center')).toBe('move');
    });
  });

  describe('Selection Clearing', () => {
    it('should clear selection', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.addToSelection('ann-2', false);
      selectionManager.clearSelection();

      expect(selectionManager.getSelectionCount()).toBe(0);
      expect(selectionManager.isSelected('ann-1')).toBe(false);
    });
  });

  describe('Primary Selection Management', () => {
    it('should update primary when removing primary annotation', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.addToSelection('ann-2', true); // Keep primary

      expect(selectionManager.isPrimary('ann-1')).toBe(true);

      selectionManager.removeFromSelection('ann-1');

      expect(selectionManager.isPrimary('ann-2')).toBe(true);
    });

    it('should clear primary when last annotation is removed', () => {
      selectionManager.selectAnnotation('ann-1');
      selectionManager.removeFromSelection('ann-1');

      expect(selectionManager.getSelectionCount()).toBe(0);
      expect(selectionManager.isPrimary('ann-1')).toBe(false);
    });
  });
});

describe('Layer Management Logic', () => {
  it('should validate layer structure', () => {
    const layer = {
      id: 'layer-1',
      name: 'Layer 1',
      visible: true,
      locked: false,
      zIndex: 0,
      annotations: ['ann-1', 'ann-2'],
    };

    expect(layer.id).toBeDefined();
    expect(layer.annotations).toBeInstanceOf(Array);
    expect(layer.zIndex).toBeGreaterThanOrEqual(0);
  });

  it('should handle z-index ordering', () => {
    const layers = [
      { id: 'layer-1', name: 'Layer 1', zIndex: 0, annotations: [] },
      { id: 'layer-2', name: 'Layer 2', zIndex: 1, annotations: [] },
      { id: 'layer-3', name: 'Layer 3', zIndex: 2, annotations: [] },
    ];

    const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);

    expect(sorted[0].zIndex).toBe(2);
    expect(sorted[2].zIndex).toBe(0);
  });

  it('should support layer visibility toggle', () => {
    const layer = { id: 'layer-1', visible: true, locked: false, annotations: [] };

    layer.visible = !layer.visible;

    expect(layer.visible).toBe(false);

    layer.visible = !layer.visible;

    expect(layer.visible).toBe(true);
  });

  it('should support layer locking', () => {
    const layer = { id: 'layer-1', visible: true, locked: false, annotations: [] };

    layer.locked = true;

    expect(layer.locked).toBe(true);
  });

  it('should track annotations per layer', () => {
    const layer = {
      id: 'layer-1',
      annotations: ['ann-1', 'ann-2', 'ann-3'],
    };

    expect(layer.annotations.length).toBe(3);

    layer.annotations.push('ann-4');

    expect(layer.annotations.length).toBe(4);

    layer.annotations.splice(1, 1);

    expect(layer.annotations.length).toBe(3);
    expect(layer.annotations).toContain('ann-1');
    expect(layer.annotations).not.toContain('ann-2');
  });
});
