# ReactFlow Keyboard Navigation Guide

## Overview

This guide covers keyboard navigation for ReactFlow components in MachShop3. Our ReactFlow components are designed to be fully accessible and comply with WCAG 2.1 Level AA standards.

## 🎯 Quick Start

### Essential Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Tab` | Navigate to next element | All diagrams |
| `Shift + Tab` | Navigate to previous element | All diagrams |
| `Enter` | Select focused element | All diagrams |
| `Space` | Toggle selection | All diagrams |
| `Delete` | Remove selected element | Editable diagrams |
| `Ctrl + N` | Create new node | Editable diagrams |
| `Ctrl + 0` | Fit view to content | All diagrams |
| `Ctrl + ?` | Show keyboard shortcuts help | All diagrams |

## 📍 Components with Keyboard Navigation

### 1. Visual Routing Editor
**Location**: Routing management for manufacturing workflows
**Purpose**: Create and edit manufacturing routing steps with drag-and-drop interface

**Features**:
- ✅ Full keyboard navigation between routing steps
- ✅ Node creation, editing, and deletion via keyboard
- ✅ Connection management
- ✅ Auto-layout functionality
- ✅ Real-time dependency visualization

### 2. Dependency Visualizer
**Location**: Parameter management for formula dependencies
**Purpose**: Visualize relationships between calculation formulas

**Features**:
- ✅ Read-only navigation between formulas
- ✅ Dependency highlighting on selection
- ✅ Circular dependency detection
- ✅ Zoom and pan controls

### 3. Custom Node Components
**Location**: Individual nodes within ReactFlow diagrams
**Purpose**: Interactive elements representing steps or formulas

**Features**:
- ✅ Individual focus management
- ✅ Context-specific actions (edit, delete)
- ✅ Screen reader descriptions
- ✅ Visual focus indicators

## 🔧 Detailed Navigation Guide

### Basic Navigation

#### Element Navigation
1. **Focus the diagram**: Click on the diagram or use `Tab` to reach it from other page elements
2. **Navigate elements**: Use `Tab`/`Shift+Tab` or arrow keys to move between nodes and connections
3. **Select elements**: Press `Enter` or `Space` to select the focused element
4. **Clear selection**: Press `Escape` to deselect all elements

#### Visual Feedback
- **Focus indicator**: Blue outline around focused element
- **Selection highlight**: Enhanced border and shadow on selected elements
- **Screen reader announcements**: Audio feedback for navigation actions

### Advanced Operations

#### Creating Elements (Editable Diagrams)
```
Ctrl + N          → Create new node at viewport center
Click Add buttons → Create specific node types (Process, Inspection, etc.)
```

#### Editing Elements
```
F2                → Edit focused node properties
Enter (on node)   → Select and highlight connections
Delete/Backspace  → Remove selected element(s)
```

#### View Controls
```
Ctrl + +          → Zoom in
Ctrl + -          → Zoom out
Ctrl + 0          → Fit all elements in view
Ctrl + H          → Center view on focused element
Home              → Focus first element
End               → Focus last element
```

#### Help and Information
```
Ctrl + ?          → Display keyboard shortcuts help modal
```

### Component-Specific Features

#### Visual Routing Editor

**Step Types Available**:
- **Process**: Standard manufacturing operation
- **Inspection**: Quality verification step
- **Decision**: Branching point in workflow
- **Parallel Split/Join**: Concurrent operation management
- **OSP**: Outside processing farmout
- **Lot Split/Merge**: Lot quantity management
- **Telescoping**: Optional operations

**Keyboard Actions**:
```
Tab                → Navigate between steps and connections
Enter              → Select step and show details
Delete             → Remove step (with confirmation)
Ctrl + N           → Add new process step
Ctrl + S           → Save routing changes
Ctrl + L           → Apply auto-layout
```

#### Dependency Visualizer

**Formula Navigation**:
```
Tab                → Navigate between formulas
Enter              → Select formula and highlight dependencies
Arrow keys         → Navigate in spatial order
Escape             → Clear highlighting
```

**Dependency Analysis**:
- **Dependencies**: Formulas that the selected formula depends on (highlighted in yellow)
- **Dependents**: Formulas that depend on the selected formula (highlighted in green)
- **Circular Dependencies**: Problematic loops (highlighted in red)

## ♿ Accessibility Features

### WCAG 2.1 Level AA Compliance

#### Keyboard Accessibility
- ✅ **2.1.1 Keyboard**: All functionality available via keyboard
- ✅ **2.1.2 No Keyboard Trap**: Users can navigate away from any component
- ✅ **2.1.4 Character Key Shortcuts**: Can be turned off or remapped

#### Focus Management
- ✅ **2.4.3 Focus Order**: Logical tab order through elements
- ✅ **2.4.7 Focus Visible**: Clear visual focus indicators
- ✅ **3.2.1 On Focus**: No unexpected context changes

#### Screen Reader Support
- ✅ **1.3.1 Info and Relationships**: Proper semantic structure
- ✅ **2.4.6 Headings and Labels**: Descriptive element labels
- ✅ **4.1.2 Name, Role, Value**: Complete ARIA implementation

### Assistive Technology Features

#### Screen Reader Announcements
- Element navigation: "Focused on Process step: Cutting Operation"
- Selection changes: "Selected routing step 10: Quality Inspection"
- Actions: "Created new process step", "Deleted connection"
- Errors: "Cannot delete: step has dependencies"

#### ARIA Labels and Roles
- **Canvas**: `role="application"` with instructions
- **Nodes**: `role="button"` with descriptive labels
- **Edges**: `role="button"` with connection descriptions
- **Live regions**: Announce dynamic changes

#### High Contrast and Reduced Motion
- **High contrast mode**: Enhanced focus indicators and colors
- **Reduced motion**: Disabled animations when preferred
- **Color independence**: All information conveyed without color alone

## 🛠️ Developer Guide

### Implementation Overview

#### Core Hook: `useReactFlowKeyboard`
```typescript
import { useReactFlowKeyboard } from '@/hooks/useReactFlowKeyboard';

const {
  containerRef,           // Ref for the main container
  focusElement,          // Function to focus specific element
  clearFocusIndicators,  // Clear all focus states
  navigateElements,      // Navigate between elements
} = useReactFlowKeyboard({
  reactFlowInstance,     // ReactFlow instance
  nodes,                 // Current nodes array
  edges,                 // Current edges array
  onNodeSelect,          // Node selection callback
  onEdgeSelect,          // Edge selection callback
  onNodeDelete,          // Node deletion callback
  onEdgeDelete,          // Edge deletion callback
  onNodeCreate,          // Node creation callback
  enableNodeEdit: true,  // Allow editing operations
  enableConnection: true, // Allow connection operations
});
```

#### Adding to Existing Components
1. **Import the hook and utilities**:
```typescript
import { useReactFlowKeyboard, generateReactFlowAriaLabels } from '@/hooks/useReactFlowKeyboard';
import { announceToScreenReader } from '@/utils/ariaUtils';
import '@/styles/reactflow-keyboard.css';
```

2. **Set up keyboard navigation**:
```typescript
const { containerRef, focusElement } = useReactFlowKeyboard({
  reactFlowInstance,
  nodes,
  edges,
  onNodeSelect: (nodeId) => {
    setSelectedNode(nodeId);
    announceToScreenReader(`Selected node: ${nodeId}`);
  },
  // ... other callbacks
});
```

3. **Apply to ReactFlow container**:
```jsx
<div
  ref={containerRef}
  role="application"
  aria-label="Workflow diagram"
  aria-describedby="diagram-instructions"
>
  <ReactFlow
    nodes={nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        ...generateReactFlowAriaLabels.node(node),
      },
    }))}
    // ... other props
  />
</div>
```

#### Custom Node Components
```typescript
export const CustomNode = memo(({ data, selected, id }: NodeProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  const accessibilityProps = {
    role: 'button',
    'aria-label': `${data.type} step: ${data.label}`,
    'aria-describedby': `node-${id}-description`,
    'aria-selected': selected,
    'tabindex': selected ? 0 : -1,
    'data-keyboard-focusable': 'true',
  };

  return (
    <div ref={nodeRef} {...accessibilityProps}>
      {/* Hidden description for screen readers */}
      <div id={`node-${id}-description`} className="sr-only">
        {data.description}
      </div>

      {/* Node content */}
      {/* ... */}
    </div>
  );
});
```

### CSS Classes and Styling

#### Focus Indicators
```css
[data-keyboard-focused="true"] {
  outline: 3px solid #1890ff !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 5px rgba(24, 144, 255, 0.2) !important;
}
```

#### Screen Reader Only Content
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Testing Accessibility

#### Automated Testing
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('should navigate with keyboard', async () => {
  const user = userEvent.setup();
  render(<YourReactFlowComponent />);

  const container = screen.getByRole('application');
  await user.click(container);
  await user.keyboard('{Tab}');

  // Assert navigation worked
});
```

#### Manual Testing Checklist
- [ ] All elements reachable via keyboard
- [ ] Focus indicators clearly visible
- [ ] Screen reader announcements appropriate
- [ ] No keyboard traps
- [ ] Logical tab order
- [ ] All shortcuts work as documented

## 🔍 Troubleshooting

### Common Issues

#### Focus Not Visible
**Problem**: Can't see which element is focused
**Solution**: Ensure CSS imports include `reactflow-keyboard.css`

#### Navigation Not Working
**Problem**: Tab/arrow keys don't move between elements
**Solution**: Check that `useReactFlowKeyboard` hook is properly implemented

#### Screen Reader Silent
**Problem**: No announcements during navigation
**Solution**: Verify `announceToScreenReader` calls are present in callbacks

#### Performance Issues
**Problem**: Slow navigation with many elements
**Solution**: Implement virtualization for large datasets (>100 elements)

### Browser Compatibility

| Browser | Keyboard Navigation | Screen Reader | Focus Indicators |
|---------|-------------------|---------------|------------------|
| Chrome 90+ | ✅ Full support | ✅ NVDA, JAWS | ✅ Full support |
| Firefox 88+ | ✅ Full support | ✅ NVDA, ORCA | ✅ Full support |
| Safari 14+ | ✅ Full support | ✅ VoiceOver | ✅ Full support |
| Edge 90+ | ✅ Full support | ✅ NVDA, JAWS | ✅ Full support |

### Getting Help

#### Internal Resources
- **Accessibility Team**: Contact for WCAG compliance questions
- **Component Library**: Check existing implementations
- **Testing Tools**: Use axe-core for automated accessibility testing

#### External Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [ReactFlow Documentation](https://reactflow.dev/)

## 📈 Future Enhancements

### Planned Features
- [ ] **Undo/Redo**: Ctrl+Z/Ctrl+Y for action history
- [ ] **Multi-selection**: Ctrl+click for multiple element selection
- [ ] **Grouping**: Create and navigate element groups
- [ ] **Search**: Ctrl+F to find specific nodes
- [ ] **Voice Commands**: Integration with speech recognition
- [ ] **Touch Navigation**: Improved mobile accessibility

### Customization Options
- [ ] **Keyboard Shortcuts**: User-configurable key mappings
- [ ] **Announcement Verbosity**: Adjust screen reader detail level
- [ ] **Focus Styles**: Customizable focus indicator themes
- [ ] **Navigation Modes**: Grid-based vs. spatial navigation

---

*This documentation is maintained by the MachShop3 development team. For updates or corrections, please submit a pull request.*