/**
 * Annotation Canvas with Drawing Tools
 * Issue #66 Phase 2: Interactive drawing tool implementations
 *
 * Features:
 * - Complete drawing tool support (arrow, rectangle, circle, line, freehand)
 * - Tool-specific rendering and interaction
 * - Real-time drawing preview
 * - Viewport zoom and pan
 * - Annotation selection and manipulation
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { AnnotationObject, AnnotationTool, AnnotationType } from './types';
import { ToolRegistry } from './tools/ToolRegistry';
import {
  DrawingToolHandler,
  DrawingContext,
  FreehandPathCollector,
} from './tools/DrawingToolHandler';
import { AnnotationManager } from './AnnotationManager';

interface AnnotationCanvasWithToolsProps {
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
 * Enhanced SVG-based annotation canvas with full drawing tool support
 */
export const AnnotationCanvasWithTools: React.FC<
  AnnotationCanvasWithToolsProps
> = ({
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
  const [drawingContext, setDrawingContext] = useState<DrawingContext | null>(
    null
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(
    null
  );
  const [freehandCollector, setFreehandCollector] =
    useState<FreehandPathCollector | null>(null);

  // Core services
  const toolRegistry = React.useMemo(() => new ToolRegistry(), []);
  const annotationManager = React.useMemo(() => new AnnotationManager(), []);
  const [annotations, setAnnotations] = useState<AnnotationObject[]>([]);

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
   * Handle mouse down - start drawing or select
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (readOnly) return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);

      // Check if clicking on existing annotation (selection mode)
      const clickedAnnotation = annotations.find((ann) => {
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
        const toolType = activeTool.type as AnnotationType;
        const context = DrawingToolHandler.createContext(
          toolType,
          x,
          y,
          activeTool.defaultProperties || {}
        );

        setDrawingContext(context);
        setIsDrawing(true);

        // Initialize freehand collector if needed
        if (toolType === 'freehand') {
          setFreehandCollector(new FreehandPathCollector(x, y, 2));
        }
      }
    },
    [annotations, screenToCanvas, activeTool, readOnly]
  );

  /**
   * Handle mouse move - update drawing preview
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing || !activeTool || !drawingContext) return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const toolType = activeTool.type as AnnotationType;

      if (toolType === 'freehand' && freehandCollector) {
        // Freehand path collection
        freehandCollector.addPoint(x, y);
        const pathData = freehandCollector.getPathData();
        const updatedContext = {
          ...drawingContext,
          properties: { ...drawingContext.properties, pathData },
        };
        setDrawingContext(updatedContext);
      } else {
        // Standard drawing with rectangle bounds
        const updatedContext = DrawingToolHandler.updateContext(
          drawingContext,
          x,
          y
        );
        setDrawingContext(updatedContext);
      }
    },
    [isDrawing, activeTool, drawingContext, screenToCanvas, freehandCollector]
  );

  /**
   * Handle mouse up - finalize drawing
   */
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing || !drawingContext || !activeTool) return;

      setIsDrawing(false);

      const toolType = activeTool.type as AnnotationType;

      // Validate drawing
      if (!DrawingToolHandler.isValidDrawing(drawingContext)) {
        setDrawingContext(null);
        setFreehandCollector(null);
        return;
      }

      // Finalize properties
      const finalProperties = DrawingToolHandler.finalizeProperties(
        toolType,
        drawingContext
      );

      // Create annotation
      const newAnnotation: AnnotationObject = DrawingToolHandler.createAnnotation(
        { ...drawingContext, properties: finalProperties },
        `annotation-${Date.now()}-${Math.random()}`,
        'current-user' // TODO: Get from auth context
      );

      // Add to manager and update state
      annotationManager.addAnnotation(newAnnotation);
      const updatedAnnotations = [
        ...annotations,
        newAnnotation,
      ];
      setAnnotations(updatedAnnotations);
      onAnnotationsChange?.(updatedAnnotations);

      // Reset drawing state
      setDrawingContext(null);
      setFreehandCollector(null);
    },
    [isDrawing, drawingContext, activeTool, annotations, annotationManager, onAnnotationsChange]
  );

  /**
   * Handle mouse leave - cancel drawing
   */
  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    setDrawingContext(null);
    setFreehandCollector(null);
  }, []);

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

      const newOffsetX =
        mouseX - ((mouseX - viewport.offsetX) / viewport.scale) * newScale;
      const newOffsetY =
        mouseY - ((mouseY - viewport.offsetY) / viewport.scale) * newScale;

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
    const strokeColor = isSelected ? '#ff6b6b' : (properties.strokeColor || '#000000');
    const strokeWidth = properties.strokeWidth || 2;

    switch (type) {
      case 'arrow':
        return (
          <g key={annotation.id} onClick={() => setSelectedAnnotationId(annotation.id)} style={{ cursor: 'pointer' }}>
            <line
              x1={screenX}
              y1={screenY}
              x2={screenX + screenWidth}
              y2={screenY + screenHeight}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              markerEnd="url(#arrowhead)"
            />
            {isSelected && (
              <circle cx={screenX} cy={screenY} r="5" fill="#ff6b6b" />
            )}
          </g>
        );

      case 'rectangle':
        return (
          <g key={annotation.id} onClick={() => setSelectedAnnotationId(annotation.id)} style={{ cursor: 'pointer' }}>
            <rect
              x={screenX}
              y={screenY}
              width={screenWidth}
              height={screenHeight}
              fill={properties.fillColor === 'transparent' ? 'none' : properties.fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {isSelected && (
              <>
                <circle cx={screenX} cy={screenY} r="5" fill="#ff6b6b" />
                <circle
                  cx={screenX + screenWidth}
                  cy={screenY + screenHeight}
                  r="5"
                  fill="#ff6b6b"
                />
              </>
            )}
          </g>
        );

      case 'circle':
        const radius = Math.min(screenWidth, screenHeight) / 2;
        return (
          <g key={annotation.id} onClick={() => setSelectedAnnotationId(annotation.id)} style={{ cursor: 'pointer' }}>
            <circle
              cx={screenX + radius}
              cy={screenY + radius}
              r={radius}
              fill={properties.fillColor === 'transparent' ? 'none' : properties.fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {isSelected && (
              <circle
                cx={screenX + radius}
                cy={screenY + radius}
                r="5"
                fill="#ff6b6b"
              />
            )}
          </g>
        );

      case 'line':
        return (
          <g key={annotation.id} onClick={() => setSelectedAnnotationId(annotation.id)} style={{ cursor: 'pointer' }}>
            <line
              x1={screenX}
              y1={screenY}
              x2={screenX + screenWidth}
              y2={screenY + screenHeight}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {isSelected && (
              <circle cx={screenX} cy={screenY} r="5" fill="#ff6b6b" />
            )}
          </g>
        );

      case 'freehand': {
        const pathData = properties.pathData || '';
        const transformedPath = transformFreehandPath(
          pathData,
          screenX,
          screenY,
          viewport.scale
        );
        return (
          <g key={annotation.id} onClick={() => setSelectedAnnotationId(annotation.id)} style={{ cursor: 'pointer' }}>
            <path
              d={transformedPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {isSelected && (
              <circle cx={screenX} cy={screenY} r="5" fill="#ff6b6b" />
            )}
          </g>
        );
      }

      default:
        return null;
    }
  };

  /**
   * Transform freehand path for rendering
   */
  const transformFreehandPath = (
    pathData: string,
    offsetX: number,
    offsetY: number,
    scale: number
  ): string => {
    if (!pathData) return '';

    const commands = pathData.split(/([MLmlhvHVcCsSqQaAzZ])/);
    let transformed = '';

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];

      if (/[MLmlhvHVcCsSqQaAzZ]/.test(cmd)) {
        transformed += cmd;
      } else if (cmd) {
        const coords = cmd.trim().split(/[\s,]+/);
        for (let j = 0; j < coords.length; j += 2) {
          const x = parseFloat(coords[j]);
          const y = parseFloat(coords[j + 1]);

          if (!isNaN(x) && !isNaN(y)) {
            transformed += ` ${x * scale + offsetX} ${y * scale + offsetY}`;
          }
        }
      }
    }

    return transformed;
  };

  /**
   * Render current drawing preview
   */
  const renderCurrentDrawing = () => {
    if (!drawingContext) return null;

    const toolType = drawingContext.toolType;
    const previewData = DrawingToolHandler.getPreviewData(drawingContext);

    if (!previewData) return null;

    const strokeColor = '#4a90e2';
    const strokeWidth = 2;

    switch (previewData.type) {
      case 'rectangle': {
        const screenX = previewData.x * viewport.scale + viewport.offsetX;
        const screenY = previewData.y * viewport.scale + viewport.offsetY;
        const screenWidth = previewData.width * viewport.scale;
        const screenHeight = previewData.height * viewport.scale;

        return (
          <rect
            key="preview"
            x={screenX}
            y={screenY}
            width={screenWidth}
            height={screenHeight}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray="5,5"
            opacity="0.7"
          />
        );
      }

      case 'circle': {
        const screenX = previewData.cx * viewport.scale + viewport.offsetX;
        const screenY = previewData.cy * viewport.scale + viewport.offsetY;
        const screenRadius = previewData.radius * viewport.scale;

        return (
          <circle
            key="preview"
            cx={screenX}
            cy={screenY}
            r={screenRadius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray="5,5"
            opacity="0.7"
          />
        );
      }

      case 'arrow':
      case 'line': {
        const x1 = previewData.x1 * viewport.scale + viewport.offsetX;
        const y1 = previewData.y1 * viewport.scale + viewport.offsetY;
        const x2 = previewData.x2 * viewport.scale + viewport.offsetX;
        const y2 = previewData.y2 * viewport.scale + viewport.offsetY;

        return (
          <line
            key="preview"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray="5,5"
            opacity="0.7"
            markerEnd={previewData.type === 'arrow' ? 'url(#arrowhead)' : undefined}
          />
        );
      }

      case 'freehand': {
        const screenX = previewData.x * viewport.scale + viewport.offsetX;
        const screenY = previewData.y * viewport.scale + viewport.offsetY;
        const pathData = drawingContext.properties.pathData || '';
        const transformedPath = transformFreehandPath(pathData, screenX, screenY, viewport.scale);

        return (
          <path
            key="preview"
            d={transformedPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray="5,5"
            opacity="0.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="annotation-canvas-container"
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
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

      {/* Annotation canvas */}
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
        onMouseLeave={handleMouseLeave}
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
        {annotations.map((ann) => renderAnnotation(ann))}

        {/* Render current drawing preview */}
        {renderCurrentDrawing()}
      </svg>

      {/* Debug info */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#fff',
          fontSize: '12px',
          borderRadius: '4px',
          fontFamily: 'monospace',
        }}
      >
        <div>Scale: {viewport.scale.toFixed(2)}x</div>
        <div>Annotations: {annotations.length}</div>
        <div>Active Tool: {activeTool?.name || 'None'}</div>
        <div>Selected: {selectedAnnotationId || 'None'}</div>
        {drawingContext && <div>Drawing: {drawingContext.toolType}</div>}
      </div>

      {/* Tool info */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#fff',
          fontSize: '12px',
          borderRadius: '4px',
          fontFamily: 'monospace',
        }}
      >
        <div>Ctrl+Scroll to zoom</div>
        <div>Click to select or draw</div>
      </div>
    </div>
  );
};

export default AnnotationCanvasWithTools;
