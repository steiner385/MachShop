/**
 * Annotation Canvas Component
 * Issue #66 Phase 1: Core annotation infrastructure with SVG-based rendering
 *
 * Features:
 * - SVG-based annotation overlay system
 * - Tool registry for different annotation types
 * - Coordinate transformation and viewport management
 * - Event handling for drawing interactions
 * - Layer management
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { AnnotationTool, AnnotationObject, AnnotationState } from './types';
import { ToolRegistry } from './tools/ToolRegistry';

interface AnnotationCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  onAnnotationsChange?: (annotations: AnnotationObject[]) => void;
  readOnly?: boolean;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

interface ViewportState {
  scale: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  dragStartOffsetX: number;
  dragStartOffsetY: number;
}

/**
 * Core SVG-based annotation canvas
 * Manages rendering, interaction, and tool coordination
 */
export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  onAnnotationsChange,
  readOnly = false,
  scale: initialScale = 1,
  offsetX: initialOffsetX = 0,
  offsetY: initialOffsetY = 0,
}) => {
  // Canvas references
  const canvasRef = useRef<SVGSVGElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State management
  const [annotations, setAnnotations] = useState<AnnotationObject[]>([]);
  const [viewport, setViewport] = useState<ViewportState>({
    scale: initialScale,
    offsetX: initialOffsetX,
    offsetY: initialOffsetY,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartOffsetX: 0,
    dragStartOffsetY: 0,
  });

  const [activeTool, setActiveTool] = useState<AnnotationTool | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<Partial<AnnotationObject> | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Tool registry instance
  const toolRegistry = React.useMemo(() => new ToolRegistry(), []);

  /**
   * Convert screen coordinates to canvas coordinates
   */
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };

      const rect = canvasRef.current.getBoundingClientRect();
      const x = (screenX - rect.left - viewport.offsetX) / viewport.scale;
      const y = (screenY - rect.top - viewport.offsetY) / viewport.scale;

      return { x, y };
    },
    [viewport.scale, viewport.offsetX, viewport.offsetY]
  );

  /**
   * Convert canvas coordinates to screen coordinates
   */
  const canvasToScreen = useCallback(
    (canvasX: number, canvasY: number) => {
      const x = canvasX * viewport.scale + viewport.offsetX;
      const y = canvasY * viewport.scale + viewport.offsetY;
      return { x, y };
    },
    [viewport.scale, viewport.offsetX, viewport.offsetY]
  );

  /**
   * Handle mouse down on canvas
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (readOnly) return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);

      // Check if clicking on existing annotation (selection mode)
      const clickedAnnotation = annotations.find((ann) => {
        // Simple bounding box check
        return (
          x >= ann.x - 10 &&
          x <= ann.x + ann.width + 10 &&
          y >= ann.y - 10 &&
          y <= ann.y + ann.height + 10
        );
      });

      if (clickedAnnotation) {
        setSelectedAnnotationId(clickedAnnotation.id);
        return;
      }

      // Start drawing with active tool
      if (activeTool) {
        setIsDrawing(true);
        setCurrentDrawing({
          type: activeTool.type,
          x,
          y,
          width: 0,
          height: 0,
          properties: {},
        });
      }
    },
    [annotations, screenToCanvas, activeTool, readOnly]
  );

  /**
   * Handle mouse move on canvas
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing || !activeTool || !currentDrawing) return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);

      const width = Math.abs(x - (currentDrawing.x || 0));
      const height = Math.abs(y - (currentDrawing.y || 0));

      setCurrentDrawing((prev) => ({
        ...prev,
        width,
        height,
        x: Math.min(x, currentDrawing.x || 0),
        y: Math.min(y, currentDrawing.y || 0),
      }));
    },
    [isDrawing, activeTool, currentDrawing, screenToCanvas]
  );

  /**
   * Handle mouse up on canvas
   */
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing || !currentDrawing) return;

      setIsDrawing(false);

      // Create final annotation
      const newAnnotation: AnnotationObject = {
        id: `annotation-${Date.now()}`,
        type: currentDrawing.type || 'arrow',
        x: currentDrawing.x || 0,
        y: currentDrawing.y || 0,
        width: currentDrawing.width || 0,
        height: currentDrawing.height || 0,
        properties: currentDrawing.properties || {},
        timestamp: new Date(),
        createdBy: 'current-user', // TODO: Get from auth context
      };

      const updatedAnnotations = [...annotations, newAnnotation];
      setAnnotations(updatedAnnotations);
      onAnnotationsChange?.(updatedAnnotations);

      setCurrentDrawing(null);
    },
    [isDrawing, currentDrawing, annotations, onAnnotationsChange]
  );

  /**
   * Handle wheel zoom
   */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(5, viewport.scale * delta));

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newOffsetX = mouseX - ((mouseX - viewport.offsetX) / viewport.scale) * newScale;
      const newOffsetY = mouseY - ((mouseY - viewport.offsetY) / viewport.scale) * newScale;

      setViewport((prev) => ({
        ...prev,
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      }));
    },
    [viewport.scale, viewport.offsetX, viewport.offsetY]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  /**
   * Render annotation
   */
  const renderAnnotation = (annotation: AnnotationObject) => {
    const { type, x, y, width, height, properties } = annotation;

    // Apply viewport transformation
    const screenX = x * viewport.scale + viewport.offsetX;
    const screenY = y * viewport.scale + viewport.offsetY;
    const screenWidth = width * viewport.scale;
    const screenHeight = height * viewport.scale;

    const isSelected = annotation.id === selectedAnnotationId;

    switch (type) {
      case 'arrow':
        return (
          <g key={annotation.id}>
            <line
              x1={screenX}
              y1={screenY}
              x2={screenX + screenWidth}
              y2={screenY + screenHeight}
              stroke={isSelected ? '#ff6b6b' : '#000'}
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            {isSelected && (
              <circle cx={screenX} cy={screenY} r="5" fill="#ff6b6b" />
            )}
          </g>
        );

      case 'rectangle':
        return (
          <g key={annotation.id}>
            <rect
              x={screenX}
              y={screenY}
              width={screenWidth}
              height={screenHeight}
              fill="none"
              stroke={isSelected ? '#ff6b6b' : '#000'}
              strokeWidth="2"
              onClick={() => setSelectedAnnotationId(annotation.id)}
            />
            {isSelected && (
              <>
                <circle cx={screenX} cy={screenY} r="5" fill="#ff6b6b" />
                <circle cx={screenX + screenWidth} cy={screenY + screenHeight} r="5" fill="#ff6b6b" />
              </>
            )}
          </g>
        );

      case 'circle':
        const radius = Math.min(screenWidth, screenHeight) / 2;
        return (
          <g key={annotation.id}>
            <circle
              cx={screenX + radius}
              cy={screenY + radius}
              r={radius}
              fill="none"
              stroke={isSelected ? '#ff6b6b' : '#000'}
              strokeWidth="2"
            />
            {isSelected && (
              <circle cx={screenX + radius} cy={screenY + radius} r="5" fill="#ff6b6b" />
            )}
          </g>
        );

      case 'freehand':
        return (
          <path
            key={annotation.id}
            d={properties.pathData || ''}
            fill="none"
            stroke={isSelected ? '#ff6b6b' : '#000'}
            strokeWidth="2"
            strokeLinecap="round"
            onClick={() => setSelectedAnnotationId(annotation.id)}
          />
        );

      default:
        return null;
    }
  };

  /**
   * Render current drawing preview
   */
  const renderCurrentDrawing = () => {
    if (!currentDrawing) return null;

    const screenX = (currentDrawing.x || 0) * viewport.scale + viewport.offsetX;
    const screenY = (currentDrawing.y || 0) * viewport.scale + viewport.offsetY;
    const screenWidth = (currentDrawing.width || 0) * viewport.scale;
    const screenHeight = (currentDrawing.height || 0) * viewport.scale;

    switch (currentDrawing.type) {
      case 'rectangle':
        return (
          <rect
            x={screenX}
            y={screenY}
            width={screenWidth}
            height={screenHeight}
            fill="none"
            stroke="#4a90e2"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.7"
          />
        );

      case 'circle':
        const radius = Math.min(screenWidth, screenHeight) / 2;
        return (
          <circle
            cx={screenX + radius}
            cy={screenY + radius}
            r={radius}
            fill="none"
            stroke="#4a90e2"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.7"
          />
        );

      case 'arrow':
        return (
          <line
            x1={screenX}
            y1={screenY}
            x2={screenX + screenWidth}
            y2={screenY + screenHeight}
            stroke="#4a90e2"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="annotation-canvas-container" style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Image layer */}
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Annotation Target"
        style={{
          position: 'absolute',
          left: viewport.offsetX,
          top: viewport.offsetY,
          width: imageWidth * viewport.scale,
          height: imageHeight * viewport.scale,
          pointerEvents: 'none',
        }}
      />

      {/* Annotation layer */}
      <svg
        ref={canvasRef}
        width={imageWidth}
        height={imageHeight}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          cursor: activeTool && !readOnly ? 'crosshair' : 'default',
          transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
          transformOrigin: '0 0',
          pointerEvents: 'auto',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDrawing(false)}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#000" />
          </marker>
        </defs>

        {/* Render annotations */}
        {annotations.map(renderAnnotation)}

        {/* Render current drawing preview */}
        {renderCurrentDrawing()}
      </svg>

      {/* Debug info */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        padding: '10px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontSize: '12px',
        borderRadius: '4px',
      }}>
        <div>Scale: {viewport.scale.toFixed(2)}x</div>
        <div>Annotations: {annotations.length}</div>
        <div>Selected: {selectedAnnotationId || 'None'}</div>
      </div>
    </div>
  );
};

export default AnnotationCanvas;
