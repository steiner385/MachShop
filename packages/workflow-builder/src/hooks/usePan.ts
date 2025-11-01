/**
 * usePan Hook
 * Handles pan/translate interactions on the workflow canvas
 */

import { useCallback, useRef, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';

export interface UsePanOptions {
  enabled?: boolean;
  minPan?: number;
  maxPan?: number;
}

export const usePan = (options: UsePanOptions = {}) => {
  const { enabled = true } = options;

  const { panX, panY, setPan, panBy } = useWorkflowStore(state => ({
    panX: state.panX,
    panY: state.panY,
    setPan: state.setPan,
    panBy: state.panBy,
  }));

  const panStartRef = useRef({ x: 0, y: 0, panStartX: 0, panStartY: 0 });
  const isPanningRef = useRef(false);

  /**
   * Start panning
   */
  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      if (!enabled) return;

      isPanningRef.current = true;
      panStartRef.current = {
        x: clientX,
        y: clientY,
        panStartX: panX,
        panStartY: panY,
      };
    },
    [enabled, panX, panY]
  );

  /**
   * Continue panning
   */
  const continuePan = useCallback(
    (clientX: number, clientY: number) => {
      if (!enabled || !isPanningRef.current) return;

      const { x, y, panStartX, panStartY } = panStartRef.current;
      const deltaX = clientX - x;
      const deltaY = clientY - y;

      setPan(panStartX + deltaX, panStartY + deltaY);
    },
    [enabled, setPan]
  );

  /**
   * End panning
   */
  const endPan = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  /**
   * Pan by offset
   */
  const pan = useCallback(
    (deltaX: number, deltaY: number) => {
      if (!enabled) return;
      panBy(deltaX, deltaY);
    },
    [enabled, panBy]
  );

  /**
   * Handle mouse wheel for panning
   */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!enabled) return;

      // Allow shift+wheel or middle-mouse wheel for panning
      const isPanningWheel = e.shiftKey || e.button === 1 || e.ctrlKey;
      if (!isPanningWheel) return;

      e.preventDefault();

      const deltaX = -e.deltaX * 0.5;
      const deltaY = -e.deltaY * 0.5;

      panBy(deltaX, deltaY);
    },
    [enabled, panBy]
  );

  /**
   * Handle spacebar for pan mode
   */
  useEffect(() => {
    if (!enabled) return;

    let spacePressed = false;
    let lastClientX = 0;
    let lastClientY = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed && !isPanningRef.current) {
        e.preventDefault();
        spacePressed = true;
        document.body.style.cursor = 'grab';
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spacePressed) {
        spacePressed = false;
        endPan();
        document.body.style.cursor = 'default';
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (spacePressed) {
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        startPan(e.clientX, e.clientY);
        document.body.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (spacePressed && isPanningRef.current) {
        continuePan(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      if (spacePressed) {
        document.body.style.cursor = 'grab';
      }
      endPan();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, startPan, continuePan, endPan]);

  return {
    panX,
    panY,
    startPan,
    continuePan,
    endPan,
    pan,
    handleWheel,
  };
};
