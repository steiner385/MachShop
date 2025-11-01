/**
 * Annotation System Exports
 * Issue #66: Advanced Media Annotation Tools
 */

// Core Components
export { AnnotationCanvas, type AnnotationCanvasProps } from './AnnotationCanvas';
export { AnnotationCanvasWithTools, type AnnotationCanvasWithToolsProps } from './AnnotationCanvasWithTools';
export { AnnotationEditor, type AnnotationEditorProps } from './AnnotationEditor';
export { AnnotationManager } from './AnnotationManager';
export { AnnotationToolbar, type AnnotationToolbarProps } from './AnnotationToolbar';

// UI Components
export { HistoryBar, type HistoryBarProps } from './HistoryBar';
export { LayerPanel, type LayerPanelProps } from './LayerPanel';
export { PropertiesPanel, type PropertiesPanelProps } from './PropertiesPanel';
export { TextAnnotationEditor, type TextAnnotationEditorProps } from './TextAnnotationEditor';
export { TextAnnotationRenderer, type TextAnnotationRendererProps } from './TextAnnotationRenderer';

// Managers
export { SelectionManager, type SelectionState, type SelectionInfo, type TransformMode } from './SelectionManager';
export { ViewportController, type ViewportState, type ViewportBounds } from './ViewportController';

// Tools
export { ToolRegistry } from './tools/ToolRegistry';
export { DrawingToolHandler, FreehandPathCollector, type DrawingContext } from './tools/DrawingToolHandler';

// Types
export * from './types';
