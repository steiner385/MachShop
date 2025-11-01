# Keyboard Navigation Implementation Guide

## Overview

This guide provides comprehensive documentation for implementing WCAG 2.1 Level AA compliant keyboard navigation in the MachShop2 application. The system is built around reusable hooks, utilities, and patterns that ensure consistent accessibility across all interactive components.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Hooks](#core-hooks)
3. [Implementation Patterns](#implementation-patterns)
4. [ARIA Guidelines](#aria-guidelines)
5. [Component Examples](#component-examples)
6. [Testing Guidelines](#testing-guidelines)
7. [Troubleshooting](#troubleshooting)

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Components (Enhanced with keyboard navigation)            │
│  ├── GlobalSearch          ├── ApprovalTaskQueue           │
│  ├── DraggableStepsTable   ├── WorkOrderCreate            │
│  └── SignatureModal        └── [Your Components]          │
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                     │
│  ├── useKeyboardHandler    ├── useFocusManagement          │
│  ├── useComponentShortcuts ├── KeyboardAccessible HOC     │
│  └── KeyboardShortcutProvider Context                     │
├─────────────────────────────────────────────────────────────┤
│                    Utilities Layer                          │
│  ├── ariaUtils             ├── Screen reader announcements │
│  ├── ARIA patterns         └── Focus management helpers    │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Progressive Enhancement**: Components work without JavaScript, enhanced with keyboard navigation
2. **Consistent Patterns**: Standardized keyboard shortcuts across similar components
3. **Screen Reader Support**: Comprehensive ARIA attributes and announcements
4. **Focus Management**: Predictable focus behavior and visual indicators
5. **Escape Hatches**: Always provide ways to exit or cancel operations

## Core Hooks

### useKeyboardHandler

Primary hook for handling keyboard events with standardized patterns.

```typescript
import { useKeyboardHandler } from '@/hooks/useKeyboardHandler';

const { keyboardProps } = useKeyboardHandler({
  enableActivation: true,     // Enter/Space activation
  enableArrowNavigation: true, // Arrow key navigation
  enableEscape: true,         // Escape key handling
  onActivate: (event) => {
    // Handle Enter/Space key press
    if (event.key === 'Enter') {
      performAction();
    }
  },
  onArrowNavigation: (direction, event) => {
    // Handle arrow key navigation
    if (direction === 'up' || direction === 'down') {
      navigateItems(direction);
    }
  },
  onEscape: () => {
    // Handle escape key
    closeModal();
  },
  disabled: false,
});

// Apply to your component
<div {...keyboardProps}>
  {/* Your content */}
</div>
```

### useFocusManagement

Handles focus trapping, restoration, and management.

```typescript
import { useFocusManagement } from '@/hooks/useFocusManagement';

const containerRef = useRef<HTMLDivElement>(null);

const { focusFirst, focusLast, focusElement } = useFocusManagement({
  containerRef,
  enableFocusTrap: true,  // Trap focus within container
  restoreFocus: true,     // Restore focus when container unmounts
  autoFocus: true,        // Auto-focus first element when container mounts
});

// Programmatic focus control
useEffect(() => {
  if (isModalOpen) {
    focusFirst(); // Focus first interactive element
  }
}, [isModalOpen, focusFirst]);
```

### useComponentShortcuts

Register component-specific keyboard shortcuts.

```typescript
import { useComponentShortcuts } from '@/contexts/KeyboardShortcutContext';

useComponentShortcuts('my-component', [
  {
    description: 'Save item',
    keys: 'Ctrl+S',
    handler: (event) => {
      event.preventDefault();
      saveItem();
    },
    category: 'editing',
    priority: 3,
  },
  {
    description: 'Delete item',
    keys: 'Delete',
    handler: () => {
      if (selectedItem) {
        deleteItem(selectedItem.id);
      }
    },
    category: 'editing',
    priority: 2,
  },
]);
```

## Implementation Patterns

### Pattern 1: Table Navigation

For data tables with row selection and navigation.

```typescript
const TableWithKeyboard: React.FC = () => {
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const navigateTable = useCallback((direction: 'up' | 'down') => {
    const newIndex = direction === 'down'
      ? Math.min(focusedRowIndex + 1, data.length - 1)
      : Math.max(focusedRowIndex - 1, 0);

    setFocusedRowIndex(newIndex);

    // Screen reader announcement
    announceToScreenReader(
      `Row ${newIndex + 1} of ${data.length}: ${data[newIndex].title}`,
      'POLITE'
    );
  }, [focusedRowIndex, data]);

  const { keyboardProps } = useKeyboardHandler({
    enableArrowNavigation: true,
    onArrowNavigation: (direction, event) => {
      if (direction === 'up' || direction === 'down') {
        event.preventDefault();
        navigateTable(direction);
      }
    },
    onActivate: (event) => {
      if (event.key === ' ') {
        event.preventDefault();
        toggleRowSelection(focusedRowIndex);
      }
    },
  });

  return (
    <div {...keyboardProps} role="grid" aria-label="Data table">
      <Table
        onRow={(record, index) => ({
          'aria-selected': selectedRows.includes(record.id),
          'aria-rowindex': index + 1,
          tabIndex: index === focusedRowIndex ? 0 : -1,
          onClick: () => setFocusedRowIndex(index),
        })}
      />
    </div>
  );
};
```

### Pattern 2: Modal with Focus Trapping

For modal dialogs that need to trap focus.

```typescript
const ModalWithKeyboard: React.FC = ({ visible, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const { focusFirst } = useFocusManagement({
    containerRef: modalRef,
    enableFocusTrap: visible,
    restoreFocus: true,
    autoFocus: true,
  });

  const { keyboardProps } = useKeyboardHandler({
    enableEscape: true,
    onEscape: () => {
      if (hasUnsavedChanges()) {
        if (window.confirm('Discard changes?')) {
          onClose();
        }
      } else {
        onClose();
      }
    },
  });

  useComponentShortcuts('modal', [
    {
      description: 'Save and close',
      keys: 'Ctrl+Enter',
      handler: () => {
        saveData();
        onClose();
      },
      category: 'modal',
      priority: 3,
    },
  ]);

  return (
    <Modal visible={visible} onCancel={onClose}>
      <div
        ref={modalRef}
        {...keyboardProps}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title">Edit Item</h2>
        {/* Modal content */}
      </div>
    </Modal>
  );
};
```

### Pattern 3: Search with Results Navigation

For search interfaces with navigable results.

```typescript
const SearchWithKeyboard: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [results, setResults] = useState([]);

  const navigateResults = useCallback((direction: 'up' | 'down') => {
    const newIndex = direction === 'down'
      ? (selectedIndex + 1) % results.length
      : selectedIndex <= 0 ? results.length - 1 : selectedIndex - 1;

    setSelectedIndex(newIndex);

    announceToScreenReader(
      `Result ${newIndex + 1} of ${results.length}: ${results[newIndex].title}`,
      'POLITE'
    );
  }, [selectedIndex, results]);

  useComponentShortcuts('search', [
    {
      description: 'Clear search',
      keys: 'Ctrl+K',
      handler: () => {
        setQuery('');
        setResults([]);
        setSelectedIndex(-1);
      },
      category: 'search',
      priority: 2,
    },
  ]);

  return (
    <div role="search" aria-label="Global search">
      <Input
        aria-expanded={results.length > 0}
        aria-owns={results.length > 0 ? 'search-results' : undefined}
        aria-activedescendant={
          selectedIndex >= 0 ? `result-${results[selectedIndex].id}` : undefined
        }
      />
      {results.length > 0 && (
        <div id="search-results" role="listbox">
          {results.map((result, index) => (
            <div
              key={result.id}
              id={`result-${result.id}`}
              role="option"
              aria-selected={index === selectedIndex}
            >
              {result.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## ARIA Guidelines

### Essential ARIA Attributes

| Attribute | Usage | Example |
|-----------|--------|---------|
| `role` | Define element purpose | `role="button"`, `role="grid"`, `role="dialog"` |
| `aria-label` | Accessible name | `aria-label="Save document"` |
| `aria-describedby` | Additional description | `aria-describedby="help-text"` |
| `aria-expanded` | Collapsible state | `aria-expanded={isOpen}` |
| `aria-selected` | Selection state | `aria-selected={isSelected}` |
| `aria-disabled` | Disabled state | `aria-disabled={isDisabled}` |

### Screen Reader Announcements

Use `announceToScreenReader` for dynamic updates:

```typescript
import { announceToScreenReader } from '@/utils/ariaUtils';

// For important notifications
announceToScreenReader('Document saved successfully', 'ASSERTIVE');

// For status updates
announceToScreenReader('Loading search results...', 'POLITE');

// For navigation feedback
announceToScreenReader(
  `Selected item 3 of 10: Work Order WO-2024-001`,
  'POLITE'
);
```

### ARIA Patterns Reference

#### Listbox Pattern
```typescript
<div role="listbox" aria-label="Select an option">
  {options.map((option, index) => (
    <div
      key={option.id}
      role="option"
      aria-selected={index === selectedIndex}
      tabIndex={index === selectedIndex ? 0 : -1}
    >
      {option.label}
    </div>
  ))}
</div>
```

#### Grid Pattern
```typescript
<table role="grid" aria-label="Data grid">
  <tbody>
    {rows.map((row, rowIndex) => (
      <tr key={row.id} role="row" aria-rowindex={rowIndex + 1}>
        {row.cells.map((cell, colIndex) => (
          <td
            key={colIndex}
            role="gridcell"
            aria-colindex={colIndex + 1}
            tabIndex={isSelected ? 0 : -1}
          >
            {cell.value}
          </td>
        ))}
      </tr>
    ))}
  </tbody>
</table>
```

## Component Examples

### Enhanced Component Checklist

When adding keyboard navigation to a component, ensure:

- [ ] **Arrow Navigation**: Up/Down/Left/Right keys work as expected
- [ ] **Activation**: Enter and Space keys activate primary actions
- [ ] **Escape**: Provides a way to cancel or exit
- [ ] **Tab Navigation**: Logical tab order through interactive elements
- [ ] **Focus Indicators**: Clear visual focus indicators
- [ ] **Screen Reader**: Proper ARIA labels and live announcements
- [ ] **Keyboard Shortcuts**: Documented shortcuts for power users
- [ ] **Testing**: Works with keyboard-only navigation

### Real-World Examples

The following components demonstrate complete implementations:

1. **GlobalSearch** (`/frontend/src/components/Search/GlobalSearch.tsx`)
   - Dropdown navigation with arrow keys
   - Result selection with Enter
   - Clear search with Ctrl+K

2. **ApprovalTaskQueue** (`/frontend/src/components/Approvals/ApprovalTaskQueue.tsx`)
   - Table navigation with arrow keys
   - Bulk actions with Ctrl+Enter
   - Row selection with Space

3. **DraggableStepsTable** (`/frontend/src/components/Routing/DraggableStepsTable.tsx`)
   - Table navigation with arrow keys
   - Keyboard reordering with Alt+Up/Down
   - Edit/Delete with F2/Delete keys

## Testing Guidelines

### Manual Testing

1. **Keyboard-Only Navigation**:
   - Disconnect mouse/trackpad
   - Navigate entire interface using only keyboard
   - Verify all functionality is accessible

2. **Screen Reader Testing**:
   - Test with NVDA (Windows), JAWS (Windows), or VoiceOver (Mac)
   - Verify announcements are clear and helpful
   - Check reading order makes sense

3. **Focus Testing**:
   - Verify focus indicators are visible
   - Check focus doesn't get trapped unexpectedly
   - Ensure focus returns to logical locations

### Automated Testing

Use the provided Playwright tests for keyboard navigation:

```bash
# Run keyboard navigation tests
npm run test:e2e -- --grep "keyboard"

# Run accessibility tests
npm run test:e2e -- --grep "accessibility"
```

### Testing Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical and predictable
- [ ] Focus indicators are clearly visible
- [ ] Screen reader announcements are appropriate
- [ ] Keyboard shortcuts work as documented
- [ ] No focus traps (unless intentional)
- [ ] Works with common assistive technologies

## Troubleshooting

### Common Issues

#### Focus Not Visible
```typescript
// Solution: Add custom focus styles
.my-component:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

// Or use the keyboard handler's built-in focus management
const { keyboardProps } = useKeyboardHandler({
  enableActivation: true,
});
```

#### Screen Reader Not Announcing
```typescript
// Check ARIA attributes are properly set
<button
  aria-label="Save document"
  aria-describedby="save-help"
  onClick={save}
>
  Save
</button>
<div id="save-help" style={{ display: 'none' }}>
  Saves the current document to the server
</div>

// Use announcements for dynamic changes
announceToScreenReader('Document saved', 'POLITE');
```

#### Keyboard Shortcuts Not Working
```typescript
// Ensure shortcuts are registered in the right scope
useComponentShortcuts('my-component', [
  {
    description: 'Save',
    keys: 'Ctrl+S',
    handler: (event) => {
      event.preventDefault(); // Prevent browser default
      save();
    },
    category: 'editing',
    priority: 3, // Higher priority = more specific scope
  },
]);
```

### Performance Considerations

- Use `useCallback` for event handlers to prevent unnecessary re-renders
- Debounce rapid keyboard events (like arrow key navigation)
- Lazy load keyboard shortcut handlers for large applications
- Use `React.memo` for components with complex keyboard logic

### Debugging Tools

1. **Browser DevTools**:
   - Use accessibility tree inspector
   - Check computed roles and properties
   - Verify focus order with Tab key

2. **Screen Reader Extensions**:
   - Chrome Accessibility Developer Tools
   - axe DevTools for accessibility testing

3. **Keyboard Navigation Visualization**:
   - Add temporary focus indicators during development
   - Use browser's focus tracking features

## Best Practices Summary

1. **Start with semantic HTML** - Use proper form controls, buttons, links
2. **Add ARIA incrementally** - Enhance, don't replace semantic meaning
3. **Test early and often** - Include keyboard testing in regular workflow
4. **Follow established patterns** - Use consistent shortcuts across components
5. **Provide escape hatches** - Always allow users to cancel or go back
6. **Document your patterns** - Help future developers understand the system
7. **Consider context** - Different components may need different navigation patterns

## Additional Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility Documentation](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

---

*This guide is a living document. Please update it as patterns evolve and new components are enhanced with keyboard navigation.*