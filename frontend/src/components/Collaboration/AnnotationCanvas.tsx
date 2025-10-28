import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Tooltip,
  Select,
  ColorPicker,
  Slider,
  Input,
  message,
  Popover,
  Typography,
  Divider,
  Modal,
} from 'antd';
import {
  EditOutlined,
  ArrowRightOutlined,
  HighlightOutlined,
  CommentOutlined,
  ShapeOutlined,
  BorderOutlined,
  DeleteOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {
  DocumentAnnotation,
  AnnotationInput,
  AnnotationType,
} from '@/api/collaboration';
import { collaborationApi } from '@/api/collaboration';

const { Text } = Typography;
const { Option } = Select;

interface Point {
  x: number;
  y: number;
}

interface AnnotationCanvasProps {
  documentType: string;
  documentId: string;
  mediaUrl: string;
  mediaType: 'image' | 'pdf' | 'video';
  annotations: DocumentAnnotation[];
  currentUserId: string;
  onAnnotationsChange: () => void;
  className?: string;
  width?: number;
  height?: number;
}

interface DrawingState {
  isDrawing: boolean;
  currentPath: Point[];
  annotations: LocalAnnotation[];
  selectedAnnotation: string | null;
}

interface LocalAnnotation {
  id: string;
  type: AnnotationType;
  coordinates: Point[];
  text?: string;
  style: {
    color: string;
    thickness: number;
    fillColor?: string;
    opacity: number;
  };
  isTemporary?: boolean;
}

const ANNOTATION_TOOLS = [
  { type: 'ARROW' as AnnotationType, icon: ArrowRightOutlined, label: 'Arrow' },
  { type: 'CALLOUT' as AnnotationType, icon: CommentOutlined, label: 'Callout' },
  { type: 'HIGHLIGHT' as AnnotationType, icon: HighlightOutlined, label: 'Highlight' },
  { type: 'FREEHAND' as AnnotationType, icon: EditOutlined, label: 'Freehand' },
  { type: 'RECTANGLE' as AnnotationType, icon: BorderOutlined, label: 'Rectangle' },
  { type: 'CIRCLE' as AnnotationType, icon: ShapeOutlined, label: 'Circle' },
];

const DEFAULT_COLORS = [
  '#ff4d4f', '#fa8c16', '#faad14', '#52c41a', '#13c2c2', '#1890ff', '#722ed1', '#eb2f96'
];

/**
 * Annotation Canvas Component
 * Provides tools for creating visual annotations on images, PDFs, and videos
 */
export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  documentType,
  documentId,
  mediaUrl,
  mediaType,
  annotations,
  currentUserId,
  onAnnotationsChange,
  className,
  width = 800,
  height = 600,
}) => {
  // State
  const [currentTool, setCurrentTool] = useState<AnnotationType | null>(null);
  const [currentColor, setCurrentColor] = useState('#ff4d4f');
  const [currentThickness, setCurrentThickness] = useState(2);
  const [currentOpacity, setCurrentOpacity] = useState(0.8);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPath: [],
    annotations: [],
    selectedAnnotation: null,
  });
  const [calloutText, setCalloutText] = useState('');
  const [showCalloutModal, setShowCalloutModal] = useState(false);
  const [pendingCallout, setPendingCallout] = useState<Point | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);

  // Convert server annotations to local format
  useEffect(() => {
    const localAnnotations: LocalAnnotation[] = annotations.map(annotation => ({
      id: annotation.id,
      type: annotation.annotationType,
      coordinates: annotation.annotationData.coordinates || [],
      text: annotation.annotationData.text,
      style: annotation.annotationData.style || {
        color: '#ff4d4f',
        thickness: 2,
        opacity: 0.8,
      },
    }));

    setDrawingState(prev => ({
      ...prev,
      annotations: localAnnotations,
    }));
  }, [annotations]);

  // Drawing utilities
  const getCanvasContext = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  };

  const getMousePosition = (event: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  // Clear canvas and redraw all annotations
  const redrawCanvas = useCallback(() => {
    const ctx = getCanvasContext();
    if (!ctx || !canvasRef.current) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw all annotations
    drawingState.annotations.forEach(annotation => {
      drawAnnotation(ctx, annotation);
    });

    // Draw current path if drawing
    if (drawingState.isDrawing && drawingState.currentPath.length > 0) {
      drawCurrentPath(ctx);
    }
  }, [drawingState]);

  // Draw individual annotation
  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: LocalAnnotation) => {
    ctx.save();
    ctx.globalAlpha = annotation.style.opacity;
    ctx.strokeStyle = annotation.style.color;
    ctx.lineWidth = annotation.style.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const coords = annotation.coordinates;

    switch (annotation.type) {
      case 'FREEHAND':
        if (coords.length > 1) {
          ctx.beginPath();
          ctx.moveTo(coords[0].x, coords[0].y);
          for (let i = 1; i < coords.length; i++) {
            ctx.lineTo(coords[i].x, coords[i].y);
          }
          ctx.stroke();
        }
        break;

      case 'ARROW':
        if (coords.length >= 2) {
          const start = coords[0];
          const end = coords[coords.length - 1];
          drawArrow(ctx, start, end);
        }
        break;

      case 'RECTANGLE':
        if (coords.length >= 2) {
          const start = coords[0];
          const end = coords[coords.length - 1];
          const width = end.x - start.x;
          const height = end.y - start.y;

          if (annotation.style.fillColor) {
            ctx.fillStyle = annotation.style.fillColor;
            ctx.fillRect(start.x, start.y, width, height);
          }
          ctx.strokeRect(start.x, start.y, width, height);
        }
        break;

      case 'CIRCLE':
        if (coords.length >= 2) {
          const start = coords[0];
          const end = coords[coords.length - 1];
          const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

          ctx.beginPath();
          ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
          if (annotation.style.fillColor) {
            ctx.fillStyle = annotation.style.fillColor;
            ctx.fill();
          }
          ctx.stroke();
        }
        break;

      case 'HIGHLIGHT':
        if (coords.length >= 2) {
          const start = coords[0];
          const end = coords[coords.length - 1];
          const width = end.x - start.x;
          const height = Math.max(20, Math.abs(end.y - start.y));

          ctx.fillStyle = annotation.style.color;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(start.x, start.y, width, height);
        }
        break;

      case 'CALLOUT':
        if (coords.length >= 1) {
          const point = coords[0];
          drawCallout(ctx, point, annotation.text || '');
        }
        break;
    }

    ctx.restore();
  };

  // Draw arrow
  const drawArrow = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const headLength = 15;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  // Draw callout
  const drawCallout = (ctx: CanvasRenderingContext2D, point: Point, text: string) => {
    const padding = 8;
    const fontSize = 14;
    ctx.font = `${fontSize}px Arial`;
    const textWidth = ctx.measureText(text).width;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = fontSize + padding * 2;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(point.x, point.y - boxHeight, boxWidth, boxHeight);

    // Draw border
    ctx.strokeRect(point.x, point.y - boxHeight, boxWidth, boxHeight);

    // Draw text
    ctx.fillStyle = '#000000';
    ctx.fillText(text, point.x + padding, point.y - padding);
  };

  // Draw current drawing path
  const drawCurrentPath = (ctx: CanvasRenderingContext2D) => {
    if (drawingState.currentPath.length === 0) return;

    ctx.save();
    ctx.globalAlpha = currentOpacity;
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentThickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const path = drawingState.currentPath;

    switch (currentTool) {
      case 'FREEHAND':
        if (path.length > 1) {
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
          }
          ctx.stroke();
        }
        break;

      case 'ARROW':
        if (path.length >= 2) {
          drawArrow(ctx, path[0], path[path.length - 1]);
        }
        break;

      case 'RECTANGLE':
        if (path.length >= 2) {
          const start = path[0];
          const end = path[path.length - 1];
          const width = end.x - start.x;
          const height = end.y - start.y;
          ctx.strokeRect(start.x, start.y, width, height);
        }
        break;

      case 'CIRCLE':
        if (path.length >= 2) {
          const start = path[0];
          const end = path[path.length - 1];
          const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          ctx.beginPath();
          ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case 'HIGHLIGHT':
        if (path.length >= 2) {
          const start = path[0];
          const end = path[path.length - 1];
          const width = end.x - start.x;
          const height = Math.max(20, Math.abs(end.y - start.y));
          ctx.fillStyle = currentColor;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(start.x, start.y, width, height);
        }
        break;
    }

    ctx.restore();
  };

  // Redraw canvas when state changes
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Mouse event handlers
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentTool) return;

    const point = getMousePosition(event);

    if (currentTool === 'CALLOUT') {
      setPendingCallout(point);
      setShowCalloutModal(true);
      return;
    }

    setDrawingState(prev => ({
      ...prev,
      isDrawing: true,
      currentPath: [point],
    }));
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingState.isDrawing || !currentTool) return;

    const point = getMousePosition(event);

    setDrawingState(prev => ({
      ...prev,
      currentPath: currentTool === 'FREEHAND'
        ? [...prev.currentPath, point]
        : [prev.currentPath[0], point],
    }));
  };

  const handleMouseUp = () => {
    if (!drawingState.isDrawing || !currentTool) return;

    // Create annotation from current path
    const newAnnotation: LocalAnnotation = {
      id: `temp-${Date.now()}`,
      type: currentTool,
      coordinates: [...drawingState.currentPath],
      style: {
        color: currentColor,
        thickness: currentThickness,
        opacity: currentOpacity,
      },
      isTemporary: true,
    };

    setDrawingState(prev => ({
      ...prev,
      isDrawing: false,
      currentPath: [],
      annotations: [...prev.annotations, newAnnotation],
    }));

    // Save annotation to server
    saveAnnotation(newAnnotation);
  };

  // Handle callout creation
  const handleCalloutSubmit = () => {
    if (!pendingCallout || !calloutText.trim()) {
      message.error('Please enter callout text');
      return;
    }

    const newAnnotation: LocalAnnotation = {
      id: `temp-${Date.now()}`,
      type: 'CALLOUT',
      coordinates: [pendingCallout],
      text: calloutText.trim(),
      style: {
        color: currentColor,
        thickness: currentThickness,
        opacity: currentOpacity,
      },
      isTemporary: true,
    };

    setDrawingState(prev => ({
      ...prev,
      annotations: [...prev.annotations, newAnnotation],
    }));

    // Save to server
    saveAnnotation(newAnnotation);

    // Reset callout state
    setCalloutText('');
    setShowCalloutModal(false);
    setPendingCallout(null);
  };

  // Save annotation to server
  const saveAnnotation = async (annotation: LocalAnnotation) => {
    try {
      const annotationInput: AnnotationInput = {
        documentType,
        documentId,
        annotationType: annotation.type,
        annotationData: {
          coordinates: annotation.coordinates,
          text: annotation.text,
          style: annotation.style,
        },
      };

      await collaborationApi.createAnnotation(annotationInput);
      onAnnotationsChange();
      message.success('Annotation saved successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to save annotation');

      // Remove temporary annotation on error
      setDrawingState(prev => ({
        ...prev,
        annotations: prev.annotations.filter(a => a.id !== annotation.id),
      }));
    }
  };

  // Delete annotation
  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      await collaborationApi.deleteAnnotation(annotationId);
      onAnnotationsChange();
      message.success('Annotation deleted successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to delete annotation');
    }
  };

  // Export annotations
  const handleExportAnnotations = async () => {
    try {
      const response = await collaborationApi.exportAnnotations(documentType, documentId, 'PNG');

      // Create download link
      const blob = new Blob([response], { type: 'image/png' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `annotations-${documentId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('Annotations exported successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to export annotations');
    }
  };

  return (
    <div className={className}>
      {/* Toolbar */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space wrap>
          {/* Tool Selection */}
          <Space>
            <Text strong>Tools:</Text>
            {ANNOTATION_TOOLS.map(tool => (
              <Tooltip key={tool.type} title={tool.label}>
                <Button
                  type={currentTool === tool.type ? 'primary' : 'default'}
                  icon={<tool.icon />}
                  onClick={() => setCurrentTool(currentTool === tool.type ? null : tool.type)}
                />
              </Tooltip>
            ))}
          </Space>

          <Divider type="vertical" />

          {/* Style Controls */}
          <Space>
            <Text>Color:</Text>
            <ColorPicker
              value={currentColor}
              onChange={(color) => setCurrentColor(color.toHexString())}
              presets={[{ label: 'Recommended', colors: DEFAULT_COLORS }]}
            />
          </Space>

          <Space>
            <Text>Thickness:</Text>
            <Slider
              min={1}
              max={10}
              value={currentThickness}
              onChange={setCurrentThickness}
              style={{ width: '100px' }}
            />
          </Space>

          <Space>
            <Text>Opacity:</Text>
            <Slider
              min={0.1}
              max={1}
              step={0.1}
              value={currentOpacity}
              onChange={setCurrentOpacity}
              style={{ width: '100px' }}
            />
          </Space>

          <Divider type="vertical" />

          {/* Actions */}
          <Space>
            <Tooltip title="Export Annotations">
              <Button icon={<DownloadOutlined />} onClick={handleExportAnnotations}>
                Export
              </Button>
            </Tooltip>
          </Space>
        </Space>
      </Card>

      {/* Canvas Container */}
      <div style={{ position: 'relative', border: '1px solid #d9d9d9', borderRadius: '6px', overflow: 'hidden' }}>
        {/* Media Background */}
        {mediaType === 'image' && (
          <img
            ref={mediaRef as React.RefObject<HTMLImageElement>}
            src={mediaUrl}
            alt="Document"
            style={{ width: '100%', height: 'auto', display: 'block' }}
            onLoad={() => {
              const img = mediaRef.current as HTMLImageElement;
              if (canvasRef.current && img) {
                canvasRef.current.width = img.clientWidth;
                canvasRef.current.height = img.clientHeight;
                redrawCanvas();
              }
            }}
          />
        )}

        {mediaType === 'video' && (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={mediaUrl}
            controls
            style={{ width: '100%', height: 'auto', display: 'block' }}
            onLoadedMetadata={() => {
              const video = mediaRef.current as HTMLVideoElement;
              if (canvasRef.current && video) {
                canvasRef.current.width = video.clientWidth;
                canvasRef.current.height = video.clientHeight;
                redrawCanvas();
              }
            }}
          />
        )}

        {/* Annotation Canvas Overlay */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: currentTool ? 'crosshair' : 'default',
            pointerEvents: 'auto',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Callout Modal */}
      <Modal
        title="Add Callout Text"
        open={showCalloutModal}
        onOk={handleCalloutSubmit}
        onCancel={() => {
          setShowCalloutModal(false);
          setPendingCallout(null);
          setCalloutText('');
        }}
        okText="Add Callout"
      >
        <Input.TextArea
          value={calloutText}
          onChange={(e) => setCalloutText(e.target.value)}
          placeholder="Enter callout text..."
          autoSize={{ minRows: 2, maxRows: 4 }}
          autoFocus
        />
      </Modal>

      {/* Annotation List */}
      {annotations.length > 0 && (
        <Card size="small" style={{ marginTop: '16px' }}>
          <Text strong>Annotations ({annotations.length})</Text>
          <div style={{ marginTop: '8px' }}>
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <Space>
                  <Text style={{ textTransform: 'capitalize' }}>
                    {annotation.annotationType.toLowerCase()}
                  </Text>
                  {annotation.annotationData.text && (
                    <Text type="secondary">"{annotation.annotationData.text}"</Text>
                  )}
                </Space>
                {annotation.authorId === currentUserId && (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteAnnotation(annotation.id)}
                  />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnnotationCanvas;