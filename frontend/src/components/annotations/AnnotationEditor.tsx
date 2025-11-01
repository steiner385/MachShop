/**
 * Annotation Editor
 * Issue #66 Phase 6: Frontend UI components and toolbar
 *
 * Unified annotation editing interface
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AnnotationObject, AnnotationTool, AnnotationLayer } from './types';
import { AnnotationManager } from './AnnotationManager';
import { ToolRegistry } from './tools/ToolRegistry';
import { SelectionManager } from './SelectionManager';
import { ViewportController } from './ViewportController';
import { AnnotationToolbar } from './AnnotationToolbar';
import { HistoryBar } from './HistoryBar';
import { LayerPanel } from './LayerPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { AnnotationCanvasWithTools } from './AnnotationCanvasWithTools';

interface AnnotationEditorProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  onSave?: (annotations: AnnotationObject[]) => void;
  initialAnnotations?: AnnotationObject[];
  readOnly?: boolean;
}

/**
 * Complete annotation editor interface
 */
export const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  onSave,
  initialAnnotations = [],
  readOnly = false,
}) => {
  // Core services
  const toolRegistry = React.useMemo(() => new ToolRegistry(), []);
  const annotationManager = React.useMemo(() => new AnnotationManager(), []);
  const selectionManager = React.useMemo(() => new SelectionManager(), []);
  const viewportController = React.useMemo(
    () => new ViewportController(1, 0, 0),
    []
  );

  // State
  const [annotations, setAnnotations] = useState<AnnotationObject[]>(
    initialAnnotations
  );
  const [selectedTool, setSelectedTool] = useState<AnnotationTool | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(
    null
  );
  const [layers, setLayers] = useState<AnnotationLayer[]>([
    {
      id: 'default',
      name: 'Default Layer',
      visible: true,
      locked: false,
      zIndex: 0,
      annotations: [],
    },
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('default');
  const [viewport, setViewport] = useState(viewportController.getState());
  const [showSidebar, setShowSidebar] = useState(true);

  // Load initial annotations into manager
  useEffect(() => {
    initialAnnotations.forEach((ann) => {
      annotationManager.addAnnotation(ann);
    });
  }, []);

  // Handlers
  const handleToolSelect = useCallback((tool: AnnotationTool) => {
    setSelectedTool(tool);
    selectionManager.clearSelection();
  }, []);

  const handleToolDeselect = useCallback(() => {
    setSelectedTool(null);
  }, []);

  const handleAnnotationsChange = useCallback(
    (newAnnotations: AnnotationObject[]) => {
      setAnnotations(newAnnotations);
      newAnnotations.forEach((ann) => {
        if (!annotations.find((a) => a.id === ann.id)) {
          annotationManager.addAnnotation(ann);
        }
      });
    },
    [annotations]
  );

  const handleAnnotationSelect = useCallback(
    (annotationId: string | null, shiftKey = false) => {
      if (!shiftKey) {
        selectionManager.selectAnnotation(annotationId);
      } else {
        if (annotationId) {
          selectionManager.addToSelection(annotationId, true);
        }
      }
      setSelectedAnnotationId(annotationId);
    },
    []
  );

  const handleAnnotationDelete = useCallback(() => {
    if (selectedAnnotationId) {
      const updated = annotations.filter((a) => a.id !== selectedAnnotationId);
      setAnnotations(updated);
      annotationManager.removeAnnotation(selectedAnnotationId);
      setSelectedAnnotationId(null);
    }
  }, [selectedAnnotationId, annotations]);

  const handlePropertyChange = useCallback(
    (propertyName: string, value: any) => {
      if (!selectedAnnotationId) return;

      const updated = annotations.map((ann) => {
        if (ann.id === selectedAnnotationId) {
          if (propertyName.startsWith('properties.')) {
            const propName = propertyName.replace('properties.', '');
            return {
              ...ann,
              properties: { ...ann.properties, [propName]: value },
            };
          }
          return { ...ann, [propertyName]: value };
        }
        return ann;
      });

      setAnnotations(updated);
      annotationManager.updateAnnotation(selectedAnnotationId, {
        [propertyName]: value,
      });
    },
    [selectedAnnotationId, annotations]
  );

  const handleUndo = useCallback(() => {
    if (annotationManager.canUndo()) {
      annotationManager.undo();
      setAnnotations(annotationManager.getAllAnnotations());
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (annotationManager.canRedo()) {
      annotationManager.redo();
      setAnnotations(annotationManager.getAllAnnotations());
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    viewportController.zoomIn();
    setViewport(viewportController.getState());
  }, []);

  const handleZoomOut = useCallback(() => {
    viewportController.zoomOut();
    setViewport(viewportController.getState());
  }, []);

  const handleZoomReset = useCallback(() => {
    viewportController.setScale(1);
    setViewport(viewportController.getState());
  }, []);

  const handleZoomToFit = useCallback(() => {
    const bounds = {
      minX: 0,
      minY: 0,
      maxX: imageWidth,
      maxY: imageHeight,
      width: imageWidth,
      height: imageHeight,
    };
    viewportController.zoomToFit(bounds, 0.1, 800, 600);
    setViewport(viewportController.getState());
  }, [imageWidth, imageHeight]);

  const handleZoomChange = useCallback((percentage: number) => {
    viewportController.setScale(percentage);
    setViewport(viewportController.getState());
  }, []);

  const handleCreateLayer = useCallback((name: string) => {
    const layerId = `layer-${Date.now()}`;
    const newLayer: AnnotationLayer = {
      id: layerId,
      name,
      visible: true,
      locked: false,
      zIndex: Math.max(...layers.map((l) => l.zIndex)) + 1,
      annotations: [],
    };
    setLayers([...layers, newLayer]);
  }, [layers]);

  const handleDeleteLayer = useCallback((layerId: string) => {
    setLayers(layers.filter((l) => l.id !== layerId));
  }, [layers]);

  const handleToggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(
      layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      )
    );
  }, [layers]);

  const handleToggleLayerLocked = useCallback((layerId: string) => {
    setLayers(
      layers.map((l) =>
        l.id === layerId ? { ...l, locked: !l.locked } : l
      )
    );
  }, [layers]);

  const handleRenameLayer = useCallback(
    (layerId: string, newName: string) => {
      setLayers(
        layers.map((l) =>
          l.id === layerId ? { ...l, name: newName } : l
        )
      );
    },
    [layers]
  );

  const handleReorderLayers = useCallback(
    (layerId: string, direction: 'up' | 'down') => {
      const newLayers = [...layers];
      const idx = newLayers.findIndex((l) => l.id === layerId);
      if (idx === -1) return;

      const swapIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (swapIdx < 0 || swapIdx >= newLayers.length) return;

      [newLayers[idx], newLayers[swapIdx]] = [newLayers[swapIdx], newLayers[idx]];
      setLayers(newLayers);
    },
    [layers]
  );

  const handleSave = useCallback(() => {
    onSave?.(annotations);
  }, [annotations, onSave]);

  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId);

  return (
    <div
      className="annotation-editor"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        backgroundColor: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* History Bar */}
      <HistoryBar
        canUndo={annotationManager.canUndo()}
        canRedo={annotationManager.canRedo()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onZoomToFit={handleZoomToFit}
        zoomPercentage={viewportController.getZoomPercentage()}
        onZoomChange={handleZoomChange}
      />

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Toolbar */}
        <AnnotationToolbar
          selectedToolId={selectedTool?.id}
          onToolSelect={handleToolSelect}
          onToolDeselect={handleToolDeselect}
          toolRegistry={toolRegistry}
          vertical={true}
        />

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <AnnotationCanvasWithTools
            imageUrl={imageUrl}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            onAnnotationsChange={handleAnnotationsChange}
            readOnly={readOnly}
            scale={viewport.scale}
            offsetX={viewport.offsetX}
            offsetY={viewport.offsetY}
          />
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div style={{ display: 'flex', overflow: 'hidden' }}>
            {/* Layers Panel */}
            <LayerPanel
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onCreateLayer={handleCreateLayer}
              onDeleteLayer={handleDeleteLayer}
              onToggleVisibility={handleToggleLayerVisibility}
              onToggleLocked={handleToggleLayerLocked}
              onRenameLayer={handleRenameLayer}
              onReorderLayers={handleReorderLayers}
            />

            {/* Properties Panel */}
            <PropertiesPanel
              annotation={selectedAnnotation || null}
              onPropertyChange={handlePropertyChange}
              onDelete={handleAnnotationDelete}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#f0f0f0',
          borderTop: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#666',
        }}
      >
        <div>
          {annotations.length} annotation{annotations.length !== 1 ? 's' : ''} •{' '}
          {selectedAnnotationId ? '1 selected' : 'None selected'} • {layers.length} layer
          {layers.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            {showSidebar ? 'Hide' : 'Show'} Sidebar
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '4px 12px',
              backgroundColor: '#4a90e2',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnotationEditor;
