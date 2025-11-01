/**
 * ReactFlow Keyboard Shortcuts Reference
 * Issue #279: Implement Keyboard Navigation for ReactFlow Components
 *
 * Comprehensive documentation of all keyboard shortcuts available in ReactFlow components
 * WCAG 2.1 Level AA compliant keyboard interaction patterns
 */

export interface KeyboardShortcut {
  key: string[];
  description: string;
  category: 'navigation' | 'selection' | 'editing' | 'view' | 'creation';
  context?: string;
  implementation: string;
}

export const REACTFLOW_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation shortcuts
  {
    key: ['Tab'],
    description: 'Navigate to next element (node or edge)',
    category: 'navigation',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Shift', 'Tab'],
    description: 'Navigate to previous element',
    category: 'navigation',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Arrow Up'],
    description: 'Move to previous element in flow',
    category: 'navigation',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Arrow Down'],
    description: 'Move to next element in flow',
    category: 'navigation',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Arrow Left'],
    description: 'Move to element on the left',
    category: 'navigation',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Arrow Right'],
    description: 'Move to element on the right',
    category: 'navigation',
    implementation: 'useReactFlowKeyboard',
  },

  // Selection shortcuts
  {
    key: ['Enter'],
    description: 'Select focused element',
    category: 'selection',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Space'],
    description: 'Toggle selection of focused element',
    category: 'selection',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Ctrl', 'A'],
    description: 'Select all elements',
    category: 'selection',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Escape'],
    description: 'Clear all selections and exit current mode',
    category: 'selection',
    implementation: 'useReactFlowKeyboard',
  },

  // Editing shortcuts
  {
    key: ['Delete'],
    description: 'Delete selected element(s)',
    category: 'editing',
    context: 'Editable diagrams only',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Backspace'],
    description: 'Delete selected element(s)',
    category: 'editing',
    context: 'Editable diagrams only',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['F2'],
    description: 'Edit selected node properties',
    category: 'editing',
    context: 'Individual nodes',
    implementation: 'RoutingStepNode',
  },
  {
    key: ['Ctrl', 'Z'],
    description: 'Undo last action',
    category: 'editing',
    context: 'Future enhancement',
    implementation: 'Not yet implemented',
  },
  {
    key: ['Ctrl', 'Y'],
    description: 'Redo last undone action',
    category: 'editing',
    context: 'Future enhancement',
    implementation: 'Not yet implemented',
  },

  // Creation shortcuts
  {
    key: ['Ctrl', 'N'],
    description: 'Create new node at current viewport center',
    category: 'creation',
    context: 'Editable diagrams only',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Ctrl', 'Shift', 'N'],
    description: 'Create new node at focused element position',
    category: 'creation',
    context: 'Future enhancement',
    implementation: 'Not yet implemented',
  },
  {
    key: ['Ctrl', 'L'],
    description: 'Create connection from selected node',
    category: 'creation',
    context: 'Future enhancement',
    implementation: 'Not yet implemented',
  },

  // View shortcuts
  {
    key: ['Ctrl', '+'],
    description: 'Zoom in',
    category: 'view',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Ctrl', '-'],
    description: 'Zoom out',
    category: 'view',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Ctrl', '0'],
    description: 'Fit view to show all elements',
    category: 'view',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Ctrl', 'H'],
    description: 'Center view on focused element',
    category: 'view',
    implementation: 'useReactFlowKeyboard',
  },
  {
    key: ['Home'],
    description: 'Focus on first element',
    category: 'view',
    context: 'Future enhancement',
    implementation: 'Not yet implemented',
  },
  {
    key: ['End'],
    description: 'Focus on last element',
    category: 'view',
    context: 'Future enhancement',
    implementation: 'Not yet implemented',
  },
];

/**
 * Get shortcuts by category
 */
export const getShortcutsByCategory = (category: KeyboardShortcut['category']): KeyboardShortcut[] => {
  return REACTFLOW_KEYBOARD_SHORTCUTS.filter(shortcut => shortcut.category === category);
};

/**
 * Get implemented shortcuts only
 */
export const getImplementedShortcuts = (): KeyboardShortcut[] => {
  return REACTFLOW_KEYBOARD_SHORTCUTS.filter(shortcut =>
    shortcut.implementation !== 'Not yet implemented'
  );
};

/**
 * Format shortcut keys for display
 */
export const formatShortcutKeys = (keys: string[]): string => {
  const keyMap: Record<string, string> = {
    'Ctrl': '⌃',
    'Shift': '⇧',
    'Alt': '⌥',
    'Meta': '⌘',
    'Enter': '↩',
    'Space': '␣',
    'Arrow Up': '↑',
    'Arrow Down': '↓',
    'Arrow Left': '←',
    'Arrow Right': '→',
    'Tab': '⇥',
    'Escape': '⎋',
    'Delete': '⌦',
    'Backspace': '⌫',
  };

  return keys.map(key => keyMap[key] || key).join(' + ');
};

/**
 * Check if a keyboard event matches a shortcut
 */
export const matchesShortcut = (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
  const keys = shortcut.key;

  // Check modifier keys
  const hasCtrl = keys.includes('Ctrl');
  const hasShift = keys.includes('Shift');
  const hasAlt = keys.includes('Alt');
  const hasMeta = keys.includes('Meta');

  if (event.ctrlKey !== hasCtrl) return false;
  if (event.shiftKey !== hasShift) return false;
  if (event.altKey !== hasAlt) return false;
  if (event.metaKey !== hasMeta) return false;

  // Check main key
  const mainKey = keys.find(key =>
    !['Ctrl', 'Shift', 'Alt', 'Meta'].includes(key)
  );

  if (!mainKey) return false;

  return event.key === mainKey || event.code === mainKey;
};

/**
 * Component-specific shortcut contexts
 */
export const COMPONENT_SHORTCUTS = {
  VisualRoutingEditor: [
    'Tab', 'Shift+Tab', 'Arrow Keys', 'Enter', 'Space', 'Delete', 'Escape',
    'Ctrl+N', 'Ctrl++', 'Ctrl+-', 'Ctrl+0', 'Ctrl+H'
  ],
  DependencyVisualizer: [
    'Tab', 'Shift+Tab', 'Arrow Keys', 'Enter', 'Space', 'Escape',
    'Ctrl++', 'Ctrl+-', 'Ctrl+0', 'Ctrl+H'
  ],
  RoutingStepNode: [
    'Enter', 'Space', 'F2', 'Escape'
  ],
} as const;

/**
 * ARIA announcements for keyboard shortcuts
 */
export const SHORTCUT_ANNOUNCEMENTS = {
  navigationStart: 'Keyboard navigation active. Use Tab to move between elements, arrow keys for directional navigation.',
  selectionMade: (elementType: string, elementId: string) =>
    `Selected ${elementType}: ${elementId}. Press F2 to edit, Delete to remove.`,
  modeChanged: (mode: string) => `Switched to ${mode} mode.`,
  zoomChanged: (action: string) => `Zoom ${action}`,
  viewChanged: (action: string) => `View ${action}`,
  elementCreated: (elementType: string) => `Created new ${elementType}`,
  elementDeleted: (elementType: string) => `Deleted ${elementType}`,
  helpAvailable: 'Press Ctrl+? for keyboard shortcuts help',
} as const;