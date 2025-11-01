/**
 * useZoom Hook
 * Handles zoom level management and zoom interactions
 */

import { useCallback, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';

export interface UseZoomOptions {
  enabled?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  smoothZoom?: boolean;
}

const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 5;
const DEFAULT_ZOOM_STEP = 0.1;

export const useZoom = (options: UseZoomOptions = {}) => {
  const {
    enabled = true,
    minZoom = DEFAULT_MIN_ZOOM,
    maxZoom = DEFAULT_MAX_ZOOM,
    zoomStep = DEFAULT_ZOOM_STEP,
    smoothZoom = true,
  } = options;

  const { zoom, setZoom, zoomBy, resetView, fitToView } = useWorkflowStore(state => ({
    zoom: state.zoom,
    setZoom: state.setZoom,
    zoomBy: state.zoomBy,
    resetView: state.resetView,
    fitToView: state.fitToView,
  }));

  /**
   * Zoom in
   */
  const zoomIn = useCallback(() => {
    if (!enabled) return;
    const newZoom = Math.min(maxZoom, zoom + zoomStep);
    setZoom(newZoom);
  }, [enabled, zoom, zoomStep, maxZoom, setZoom]);

  /**
   * Zoom out
   */
  const zoomOut = useCallback(() => {
    if (!enabled) return;
    const newZoom = Math.max(minZoom, zoom - zoomStep);
    setZoom(newZoom);
  }, [enabled, zoom, zoomStep, minZoom, setZoom]);

  /**
   * Set zoom to specific level
   */
  const setZoomLevel = useCallback(
    (level: number) => {
      if (!enabled) return;
      setZoom(Math.max(minZoom, Math.min(maxZoom, level)));
    },
    [enabled, minZoom, maxZoom, setZoom]
  );

  /**
   * Zoom to fit all content in view
   */
  const fitAllToView = useCallback(() => {
    if (!enabled) return;
    fitToView();
  }, [enabled, fitToView]);

  /**
   * Reset zoom to 100%
   */
  const resetZoom = useCallback(() => {
    if (!enabled) return;
    setZoom(1);
  }, [enabled, setZoom]);

  /**
   * Handle keyboard shortcuts (Ctrl/Cmd +/- for zoom)
   */
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.code === 'Equal') {
        e.preventDefault();
        zoomIn();
      } else if (isCtrlOrCmd && e.code === 'Minus') {
        e.preventDefault();
        zoomOut();
      } else if (isCtrlOrCmd && e.code === 'Digit0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, zoomIn, zoomOut, resetZoom]);

  /**
   * Handle mouse wheel zoom (Ctrl+wheel)
   */
  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom with Ctrl key (not Shift which is for pan)
      if (!e.ctrlKey || e.shiftKey) return;

      e.preventDefault();

      // Determine zoom direction
      const isZoomingIn = e.deltaY < 0;
      const zoomChange = isZoomingIn ? zoomStep : -zoomStep;

      // Get mouse position for zoom center
      const centerX = e.clientX;
      const centerY = e.clientY;

      zoomBy(zoomChange, centerX, centerY);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, zoomStep, zoomBy]);

  /**
   * Get zoom percentage
   */
  const getZoomPercentage = useCallback(() => {
    return Math.round(zoom * 100);
  }, [zoom]);

  /**
   * Check if at min zoom
   */
  const isAtMinZoom = useCallback(() => {
    return zoom <= minZoom;
  }, [zoom, minZoom]);

  /**
   * Check if at max zoom
   */
  const isAtMaxZoom = useCallback(() => {
    return zoom >= maxZoom;
  }, [zoom, maxZoom]);

  return {
    zoom,
    zoomIn,
    zoomOut,
    setZoomLevel,
    fitAllToView,
    resetZoom,
    getZoomPercentage,
    isAtMinZoom,
    isAtMaxZoom,
  };
};
