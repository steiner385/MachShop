# Annotation System API Documentation

## Overview

The Advanced Media Annotation Tools (Issue #66) provide a comprehensive system for creating, editing, and managing annotations on images. The system is organized into several layers:

1. **Type System** - TypeScript interfaces for type safety
2. **Core Services** - Business logic for annotations, selection, and viewport
3. **Frontend Components** - React components for UI
4. **Unified Editor** - Complete annotation editing interface

## Type System

### AnnotationType
Supported annotation types:
- `'arrow'` - Directional arrows with customizable start/end
- `'rectangle'` - Rectangular areas
- `'circle'` - Circular areas
- `'line'` - Straight lines
- `'freehand'` - Custom drawn shapes
- `'text'` - Simple text annotations
- `'callout'` - Text with leader lines and tail markers
- `'highlight'` - Semi-transparent highlighting
- `'measurement'` - Distance and angle measurements

### AnnotationObject
Core annotation structure:
```typescript
interface AnnotationObject {
  id: string;                    // Unique identifier
  type: AnnotationType;          // Annotation type
  x: number;                     // X coordinate
  y: number;                     // Y coordinate
  width: number;                 // Width in pixels
  height: number;                // Height in pixels
  properties: AnnotationProperties; // Type-specific properties
  timestamp: Date;               // Creation timestamp
  createdBy: string;             // User who created
  locked?: boolean;              // Edit protection
  hidden?: boolean;              // Visibility
  zIndex?: number;               // Stacking order
}
```

### AnnotationProperties
Flexible properties object supporting all annotation types:
```typescript
interface AnnotationProperties {
  // Common
  strokeColor?: string;          // "#RRGGBB"
  strokeWidth?: number;          // pixels
  fillColor?: string;            // "#RRGGBB" or "transparent"
  fillOpacity?: number;          // 0-1

  // Text
  text?: string;                 // Content
  fontSize?: number;             // pixels (8-32)
  fontFamily?: string;           // Font name
  fontWeight?: number;           // 400, 600, 700
  textColor?: string;            // "#RRGGBB"

  // Arrow
  arrowStart?: 'none' | 'arrow' | 'circle' | 'square';
  arrowEnd?: 'none' | 'arrow' | 'circle' | 'square';
  arrowStyle?: 'solid' | 'dashed' | 'dotted';

  // Callout
  calloutStyle?: 'rectangular' | 'rounded' | 'cloud';
  leaderLineStyle?: 'straight' | 'curved';
  leaderTailStyle?: 'none' | 'arrow' | 'triangle' | 'circle';

  // Highlight
  highlightColor?: string;       // "#RRGGBB"
  transparency?: number;         // 0-1

  // Measurement
  unit?: 'px' | 'mm' | 'inch';
  scale?: number;                // Calibration scale
  showDimension?: boolean;

  // Freehand
  pathData?: string;             // SVG path string
}
```

### AnnotationLayer
Layer grouping for organization:
```typescript
interface AnnotationLayer {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  visible: boolean;              // Visibility toggle
  locked: boolean;               // Edit protection
  zIndex: number;                // Stacking order
  annotations: string[];         // Annotation IDs in layer
}
```

## Core Services

### AnnotationManager
Central annotation management engine.

```typescript
// Create manager
const manager = new AnnotationManager();

// CRUD Operations
manager.addAnnotation(annotation);
manager.removeAnnotation(annotationId);
manager.updateAnnotation(annotationId, changes);
manager.getAnnotation(annotationId);
manager.getAllAnnotations();

// Layer Management
manager.createLayer(name);              // Returns layerId
manager.deleteLayer(layerId);
manager.toggleLayerVisibility(layerId);
manager.toggleLayerLocked(layerId);
manager.getLayer(layerId);
manager.getAllLayers();
manager.getAnnotationsByLayer(layerId);

// Clipboard Operations
manager.copy(annotationIds);
manager.cut(annotationIds);
manager.paste(offsetX, offsetY);       // Returns pasted annotations

// Undo/Redo
manager.undo();                        // Returns success
manager.redo();
manager.canUndo();
manager.canRedo();
manager.clearHistory();

// Import/Export
manager.export(format: 'json' | 'svg'); // Returns string
manager.import(jsonString);

// Event Listeners
manager.onChangeListener(callback);    // Returns unsubscribe function

// Statistics
manager.getStatistics();
```

### SelectionManager
Multi-selection and transformation management.

```typescript
const selectionManager = new SelectionManager();

// Selection
selectionManager.selectAnnotation(id, replace?: true);
selectionManager.addToSelection(id, keepPrimary?: true);
selectionManager.removeFromSelection(id);
selectionManager.toggleSelection(id, keepOthers?: true);
selectionManager.clearSelection();

// Selection Queries
selectionManager.isSelected(id);
selectionManager.isPrimary(id);
selectionManager.getSelectedIds();
selectionManager.getSelectionCount();

// Bulk Selection
selectionManager.selectAll(annotations);
selectionManager.invertSelection(annotations);
selectionManager.selectInRectangle(minX, minY, maxX, maxY, annotations);

// Hit Testing
selectionManager.hitTest(x, y, annotations);        // Returns id or null
selectionManager.hitTestWithMargin(x, y, margin, annotations);

// Transform Operations
selectionManager.startTransform(mode, x, y, annotation);
selectionManager.endTransform();
selectionManager.getTransformState();

// Selection Info
const info = selectionManager.getSelectionInfo(annotations);
// Returns: {
//   selectedAnnotations: [],
//   primaryAnnotation: {},
//   count: 0,
//   bounds: { minX, minY, maxX, maxY, width, height }
// }

// Transform Handles
const handles = selectionManager.getTransformHandles(annotation);
// Returns handles: topLeft, topRight, bottomLeft, bottomRight, top, bottom, left, right, center
selectionManager.getCursorForHandle(handle);
```

### ViewportController
Viewport transformation and coordinate management.

```typescript
const viewport = new ViewportController(initialScale, offsetX, offsetY);

// State
viewport.getState();               // Returns { scale, offsetX, offsetY }
viewport.setState({ scale, offsetX, offsetY });

// Zoom
viewport.zoomIn(factor?: 0.1);
viewport.zoomOut(factor?: 0.1);
viewport.zoom(factor, centerX?, centerY?);
viewport.setScale(scale);          // Clamps to limits
viewport.getZoomPercentage();

// Pan
viewport.pan(deltaX, deltaY);
viewport.panTo(x, y);

// Fitting
viewport.fitBounds(bounds, padding?, width?, height?);
viewport.zoomToFit(bounds, padding?, width?, height?);
viewport.isZoomedToFit(bounds, width?, height?);

// Reset
viewport.reset();

// Coordinate Conversion
const world = viewport.screenToWorld(screenX, screenY);
const screen = viewport.worldToScreen(worldX, worldY);

// Visibility
const visible = viewport.getVisibleBounds(width?, height?);
viewport.isPointVisible(worldX, worldY, width?, height?);
viewport.boundsVisible(bounds, width?, height?);

// History (for viewport changes)
viewport.undo();
viewport.redo();
viewport.canUndo();
viewport.canRedo();

// Limits
const limits = viewport.getScaleLimits();
viewport.setScaleLimits(min, max);
```

### ToolRegistry
Tool definition and management.

```typescript
const registry = new ToolRegistry();

// Access
registry.getTool(toolId);           // Returns AnnotationTool | undefined
registry.getAllTools();
registry.getToolsByCategory(category);
registry.getToolsByType(type);
registry.getCategories();
registry.getToolsByCategories();    // Returns Record<category, tools[]>

// Management
registry.registerTool(tool);
registry.unregisterTool(toolId);
registry.updateTool(toolId, updates);
registry.hasTool(toolId);
registry.getToolCount();

// Persistence
registry.export();                  // Returns tool configs
registry.import(tools);
```

## Frontend Components

### AnnotationEditor (Main Component)
Complete annotation editing interface.

```typescript
<AnnotationEditor
  imageUrl={string}                // Image source URL
  imageWidth={number}              // Image width
  imageHeight={number}             // Image height
  onSave={(annotations) => void}  // Save callback
  initialAnnotations={[]}          // Initial state
  readOnly={false}                 // Read-only mode
/>
```

### AnnotationToolbar
Tool selection toolbar with category organization.

```typescript
<AnnotationToolbar
  selectedToolId={string | undefined}
  onToolSelect={(tool) => void}
  onToolDeselect={() => void}
  toolRegistry={ToolRegistry}
  vertical={boolean}               // Layout direction
/>
```

### LayerPanel
Layer management interface.

```typescript
<LayerPanel
  layers={AnnotationLayer[]}
  selectedLayerId={string}
  onSelectLayer={(id) => void}
  onCreateLayer={(name) => void}
  onDeleteLayer={(id) => void}
  onToggleVisibility={(id) => void}
  onToggleLocked={(id) => void}
  onRenameLayer={(id, name) => void}
  onReorderLayers={(id, direction) => void}
/>
```

### PropertiesPanel
Property editing for selected annotation.

```typescript
<PropertiesPanel
  annotation={AnnotationObject | null}
  onPropertyChange={(name, value) => void}
  onDelete={() => void}
/>
```

### HistoryBar
Undo/redo and zoom controls.

```typescript
<HistoryBar
  canUndo={boolean}
  canRedo={boolean}
  onUndo={() => void}
  onRedo={() => void}
  onZoomIn={() => void}
  onZoomOut={() => void}
  onZoomReset={() => void}
  onZoomToFit={() => void}
  zoomPercentage={number}
  onZoomChange={(percentage) => void}
/>
```

### TextAnnotationEditor
Modal dialog for text annotation input.

```typescript
<TextAnnotationEditor
  annotation={AnnotationObject | undefined}
  isCallout={boolean}
  onSave={(text, properties) => void}
  onCancel={() => void}
  x={number}                       // Position
  y={number}
/>
```

## Usage Examples

### Basic Annotation Creation
```typescript
import { AnnotationEditor } from '@/components/annotations';

function App() {
  const handleSave = (annotations) => {
    console.log('Annotations saved:', annotations);
  };

  return (
    <AnnotationEditor
      imageUrl="/image.jpg"
      imageWidth={800}
      imageHeight={600}
      onSave={handleSave}
    />
  );
}
```

### Programmatic Annotation Management
```typescript
import { AnnotationManager } from '@/components/annotations';

const manager = new AnnotationManager();

// Add annotation
manager.addAnnotation({
  id: 'ann-1',
  type: 'rectangle',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  properties: {
    strokeColor: '#ff0000',
    strokeWidth: 2,
  },
  timestamp: new Date(),
  createdBy: 'user-1',
});

// Export
const json = manager.export('json');

// History
manager.undo();
manager.redo();
```

### Selection and Transform
```typescript
import { SelectionManager } from '@/components/annotations';

const selector = new SelectionManager();

// Select annotations
selector.selectAnnotation('ann-1');
selector.addToSelection('ann-2', true);

// Get bounds
const info = selector.getSelectionInfo(annotations);
console.log(info.bounds); // { minX, minY, maxX, maxY, width, height }

// Transform
selector.startTransform('move', startX, startY, annotation);
// ... handle drag ...
selector.endTransform();
```

### Viewport Management
```typescript
import { ViewportController } from '@/components/annotations';

const viewport = new ViewportController();

// Zoom to fit
const bounds = { minX: 0, minY: 0, maxX: 1000, maxY: 800, width: 1000, height: 800 };
viewport.zoomToFit(bounds, 0.1, 1024, 768);

// Coordinate conversion
const worldPoint = viewport.screenToWorld(100, 100);
const screenPoint = viewport.worldToScreen(50, 50);

// Pan
viewport.pan(50, 50);

// Undo/redo
viewport.undo();
viewport.redo();
```

## Testing

Each major component includes comprehensive unit tests:
- **Phase 1**: 36 tests (Drawing tool handler)
- **Phase 2**: 36 tests (Interactive drawing)
- **Phase 3**: 25 tests (Text annotations)
- **Phase 4**: 29 tests (Selection & layers)
- **Phase 5**: 37 tests (Viewport & history)
- **Total**: 163 tests with 100% pass rate

Run tests:
```bash
npm test -- src/tests/annotations/
```

## Performance Considerations

1. **Rendering**: SVG-based rendering scales well up to ~1000 annotations per layer
2. **History**: Limited to 100 action entries by default (configurable)
3. **Viewport**: Supports culling checks for efficient rendering
4. **Memory**: Each annotation is ~200 bytes; 1000 annotations = ~200KB

## Known Limitations

1. Text rendering doesn't support full SVG text styling
2. Measurement tool calibration is UI-only (not persisted)
3. Freehand paths are not smoothed automatically
4. No OCR or text detection support
5. No collaborative real-time editing

## Future Enhancements

1. Database persistence for annotations
2. WebSocket support for real-time collaboration
3. Advanced path manipulation (curves, beziers)
4. Annotation templates and presets
5. Advanced text formatting (bold, italic, multiline)
6. Image filters and adjustments
7. Annotation search and filtering
8. Export to PDF, PNG, SVG with annotations
