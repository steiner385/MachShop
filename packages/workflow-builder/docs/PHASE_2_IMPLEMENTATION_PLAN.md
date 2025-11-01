# Phase 2: React Visual Canvas UI - Implementation Plan
## Low-Code/No-Code Workflow Builder (Issue #394)

### Overview
Phase 2 implements a complete React-based visual canvas for designing workflows through a drag-and-drop interface. This phase bridges the backend services (Phase 1) with end-user interaction.

### Deliverables
- ✅ WorkflowCanvas main component (started)
- ✅ NodeElement component (started)
- ConnectionLine component
- NodePalette component
- PropertyEditor component
- Zustand state management store
- Undo/redo system
- Accessibility features (WCAG 2.1 AA)
- Comprehensive test suite (80%+ coverage)

### Architecture Overview

```
WorkflowBuilder (Main Container)
├── WorkflowCanvas (Canvas Grid)
│   ├── NodeElement (Individual Nodes)
│   ├── ConnectionLine (Connection Lines)
│   └── ContextMenu
├── NodePalette (Sidebar)
│   ├── CategoryGroup
│   └── NodeTypeItem
├── PropertyEditor (Right Panel)
│   ├── NodeProperties
│   ├── ValidationDisplay
│   └── Preview
└── Toolbar
    ├── ZoomControls
    ├── UndoRedo
    └── ExportImport
```

### Component Specifications

#### 1. WorkflowCanvas (Core Canvas)
**File**: `src/ui/WorkflowCanvas.tsx` (Started - 200 lines)

**Features**:
- SVG-based grid with snap-to-grid support
- Drag-and-drop node positioning
- Pan and zoom with keyboard shortcuts (Ctrl/Cmd +/-)
- Connection drawing and validation
- Context menu for node operations
- Multi-select support (Shift+Click)
- Keyboard shortcuts (Delete, Escape, Ctrl+Z/Y)
- Grid background visualization
- Mini-map for large workflows

**Key Methods**:
- `handleNodeDragStart/Move/End`
- `handleConnectionDragStart/Draw/End`
- `handlePanStart/Move/End`
- `handleZoomIn/Out`
- `handleCanvasContextMenu`

**Dependencies**:
- usePan hook
- useZoom hook
- NodeElement component
- ConnectionLine component

#### 2. NodeElement (Individual Nodes)
**File**: `src/ui/NodeElement.tsx` (Started - 120 lines)

**Features**:
- Visual node representation with icon and color
- Drag handle for repositioning
- Input/output connection ports
- Context menu (delete, duplicate, properties)
- Selection highlighting
- Type badge indicator
- Dragging state visual feedback
- Accessibility attributes (aria-label, aria-selected, role)

**Styling**:
- Border color based on node type
- Semi-transparent fill based on node type color
- Hover effects for ports
- Selected state highlighting
- Dragging visual feedback

#### 3. ConnectionLine (Connection Visualization)
**File**: `src/ui/ConnectionLine.tsx` (To be created - 80 lines)

**Features**:
- Smooth curved SVG lines (Bezier paths)
- Condition labels for decision nodes
- Arrow indicators
- Hover highlighting
- Click to delete
- Selection state
- Accessibility support (aria-label)

**Properties**:
- Source and target nodes
- Condition expression display
- Visual styling (stroke width, color)
- Hover and selected states

#### 4. NodePalette (Component Sidebar)
**File**: `src/ui/NodePalette.tsx` (To be created - 200 lines)

**Features**:
- Categorized node types:
  - Start/End
  - Operations (Material, Equipment, Quality, Data Transform, API, Subprocess)
  - Decisions (If/Then/Else, Switch, Loop, Wait, Parallel)
  - Integrations (Salesforce, SAP, NetSuite, Custom API, Events)
  - Error Handling (Error Handler, Retry, Fallback, Notification)
- Search and filter functionality
- Favorites and recently used nodes
- Drag-to-canvas creation
- Node preview tooltips
- Collapsible categories

**State**:
- `searchQuery`: Filter nodes by name
- `expandedCategories`: Which categories are open
- `favorites`: User-selected favorite nodes
- `recentlyUsed`: Recently added nodes

#### 5. PropertyEditor (Configuration Panel)
**File**: `src/ui/PropertyEditor.tsx` (To be created - 250 lines)

**Features**:
- Selected node property editing
- Type-specific input fields:
  - Text inputs with validation
  - Number inputs with min/max
  - Dropdown/select for enums
  - Checkbox for booleans
  - Code editor for expressions/conditions
  - Object/JSON editor for complex properties
- Real-time validation feedback
- Field grouping and organization
- Default value management
- Help text and tooltips
- Undo/redo for property changes

**Components**:
- PropertyInput (base component)
- PropertyGroup (section container)
- ExpressionEditor (for conditions/transformations)
- ValidationFeedback (error/warning display)

#### 6. State Management (Zustand Store)
**File**: `src/store/workflowStore.ts` (To be created - 200 lines)

**Store Structure**:
```typescript
interface WorkflowStoreState {
  // Current workflow
  workflow: Workflow | null;

  // UI State
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  hover:NodeId: string | null;

  // Viewport
  pan: { x: number; y: number };
  zoom: number;

  // Undo/Redo
  history: Workflow[];
  historyIndex: number;

  // Actions
  setWorkflow: (workflow: Workflow) => void;
  selectNode: (nodeId: string) => void;
  addNode: (node: NodeConfig) => void;
  updateNode: (nodeId: string, updates: Partial<NodeConfig>) => void;
  deleteNode: (nodeId: string) => void;
  addConnection: (source: string, target: string) => void;
  deleteConnection: (connectionId: string) => void;
  undo: () => void;
  redo: () => void;
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
}
```

#### 7. Hooks

##### usePan Hook
**File**: `src/hooks/usePan.ts` (To be created - 50 lines)

Manages pan/translate of canvas:
- `handlePanStart`: Initialize pan
- `handlePanMove`: Update pan position
- `handlePanEnd`: Finalize pan
- `pan`: Current pan coordinates

##### useZoom Hook
**File**: `src/hooks/useZoom.ts` (To be created - 40 lines)

Manages zoom level:
- `handleZoomIn`: Increase zoom (max 200%)
- `handleZoomOut`: Decrease zoom (min 25%)
- `zoom`: Current zoom level

##### useNodeDraggy Hook
**File**: `src/hooks/useNodeDrag.ts` (To be created - 60 lines)

Manages node dragging:
- `handleDragStart`: Begin drag
- `handleDrag`: Update position during drag
- `handleDragEnd`: Finalize position
- `draggedNode`: Current drag state

##### useUndoRedo Hook
**File**: `src/hooks/useUndoRedo.ts` (To be created - 80 lines)

Manages undo/redo stack:
- `undo`: Go back one state
- `redo`: Go forward one state
- `canUndo`: Whether undo is available
- `canRedo`: Whether redo is available
- `pushState`: Add new state to history

#### 8. Utility Functions

##### nodeUtils.ts (To be created - 100 lines)
```typescript
export function getNodeIcon(type: NodeType): React.ReactNode
export function getNodeColor(type: NodeType): string
export function getNodeCategory(type: NodeType): string
export function isConnectionValid(source: NodeConfig, target: NodeConfig): boolean
export function calculateConnectionPath(source: NodeConfig, target: NodeConfig): string
export function snapToGrid(value: number, gridSize: number): number
```

##### canvasUtils.ts (To be created - 80 lines)
```typescript
export function calculateNodeBounds(node: NodeConfig): DOMRect
export function isPointInNode(point: {x: number; y: number}, node: NodeConfig): boolean
export function getNodeAtPosition(x: number, y: number, nodes: NodeConfig[]): NodeConfig | null
export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number
```

### Styling Strategy

All components use CSS modules with strict variable naming:
- `.workflow-canvas` - Main canvas container
- `.node-element` - Individual node
- `.node-element.selected` - Selected state
- `.node-element.dragging` - Dragging state
- `.node-port` - Connection port
- `.node-port.port-input` - Input port
- `.node-port.port-output` - Output port
- `.connection-line` - Connection path
- `.connection-line.selected` - Selected connection
- `.grid-background` - Canvas grid pattern
- `.canvas-toolbar` - Toolbar container
- `.context-menu` - Context menu
- `.node-palette` - Sidebar palette
- `.property-editor` - Properties panel

**CSS Features**:
- CSS Grid for layout
- CSS Flexbox for alignment
- CSS Variables for theming
- Smooth transitions and animations
- Dark/Light mode support
- Responsive design
- Touch-friendly hover areas (44px minimum)

### Accessibility Requirements (WCAG 2.1 AA)

#### Keyboard Navigation
- Tab: Move focus between elements
- Enter: Activate button/select node
- Delete: Remove selected node
- Arrow Keys: Move selected node (hold Shift for large moves)
- Escape: Deselect/close menu
- Ctrl+Z: Undo
- Ctrl+Shift+Z: Redo
- Ctrl/Cmd+Plus: Zoom in
- Ctrl/Cmd+Minus: Zoom out

#### Screen Reader Support
- All buttons have `aria-label`
- Canvas has `role="region"` and `aria-label="Workflow canvas"`
- Nodes have `role="button"` and `aria-selected`
- Connections have `aria-label` with source/target info
- Form inputs have associated `<label>` elements
- Status updates announced via `aria-live="polite"`

#### Color Contrast
- Text: 4.5:1 contrast ratio (WCAG AA)
- UI Components: 3:1 contrast ratio (WCAG AA)
- Color-blind friendly palette
- Icon + text for all meaningful information

#### Focus Management
- Visible focus indicators (2px outline)
- Logical tab order
- Focus trap in modals/menus
- Focus restored after closing dialogs

### Testing Strategy (80%+ Coverage)

#### Unit Tests (`src/ui/__tests__/`)
- WorkflowCanvas component tests
- NodeElement component tests
- ConnectionLine component tests
- NodePalette component tests
- PropertyEditor component tests
- Hook tests (usePan, useZoom, useNodeDrag, useUndoRedo)
- Utility function tests

#### Integration Tests (`src/tests/extensions/workflow-builder/`)
- Complete workflow design flow
- Node creation and configuration
- Connection creation and validation
- Drag and drop operations
- Pan and zoom operations
- Undo/redo functionality
- Keyboard shortcuts
- Context menu operations

#### Accessibility Tests
- Keyboard navigation tests
- Screen reader compatibility tests
- Color contrast verification
- Focus management tests
- ARIA attribute validation

#### Performance Tests
- Canvas rendering with 100+ nodes
- Smooth dragging performance (60fps target)
- Zoom/pan responsiveness
- Large workflow handling
- Memory usage profiling

### Implementation Phases

#### Phase 2a: Core Components (Week 1)
- WorkflowCanvas main component
- NodeElement component
- ConnectionLine component
- Pan and zoom hooks
- Grid and snap-to-grid
- Keyboard shortcuts

#### Phase 2b: Palettes and Editors (Week 1.5)
- NodePalette component
- PropertyEditor component
- Node drag-from-palette
- Property validation
- Help and tooltips

#### Phase 2c: State Management (Week 2)
- Zustand store setup
- Undo/redo system
- State persistence
- Performance optimization

#### Phase 2d: Accessibility & Polish (Week 2.5)
- Accessibility compliance
- Keyboard navigation
- Screen reader testing
- Visual polish and animations
- Performance optimization

### Dependencies
- React 18.0+
- React DOM 18.0+
- Zustand 4.0+
- TypeScript 5.0+
- Testing Library (for unit tests)
- vitest (for test runner)
- axe-core (for accessibility testing)

### Success Criteria
- [ ] All components rendering correctly
- [ ] Drag-and-drop fully functional
- [ ] Pan and zoom working smoothly (60fps)
- [ ] All keyboard shortcuts working
- [ ] WCAG 2.1 AA compliance verified
- [ ] 80%+ code coverage
- [ ] Performance targets met
- [ ] All 100+ node types displayable
- [ ] Undo/redo fully functional
- [ ] Context menus working

### Notes
- SVG-based connections for smooth rendering
- CSS Grid for responsive layout
- No external canvas libraries (HTML Canvas) for accessibility
- Proper event delegation for performance
- Debounced drag handlers to prevent excessive re-renders
- Memoization of expensive computations
- Lazy loading of node palette categories

### Related Issues
- #394: Main workflow builder issue
- #427: Navigation extension framework
- #428: Component override safety system
- #431: UI/UX consistency architecture

### Next Phase
**Phase 3: Node Types & Execution Logic** (4 story points)
- 100+ manufacturing-specific node types
- Variable management system
- Error handling and retry logic
- Workflow execution engine
- Integration connectors

