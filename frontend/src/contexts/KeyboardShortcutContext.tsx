/**
 * Keyboard Shortcut Context
 * Issue #281: Systematic Keyboard Navigation Enhancement
 *
 * Provides global keyboard shortcut management with configurable shortcuts,
 * scope-based activation, and conflict prevention
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Human-readable description */
  description: string;
  /** Key combination (e.g., 'Ctrl+S', 'Alt+N', 'F11') */
  keys: string;
  /** Callback function to execute */
  handler: (event: KeyboardEvent) => void;
  /** Scope where shortcut is active (global, component, page) */
  scope?: 'global' | 'component' | 'page';
  /** Component/page identifier for scoped shortcuts */
  scopeId?: string;
  /** Priority for conflict resolution (higher = more important) */
  priority?: number;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Stop event propagation */
  stopPropagation?: boolean;
  /** Whether shortcut is currently enabled */
  enabled?: boolean;
  /** Category for organization */
  category?: string;
}

export interface ShortcutCategory {
  id: string;
  name: string;
  description?: string;
  shortcuts: KeyboardShortcut[];
}

interface KeyboardShortcutContextValue {
  // Shortcut management
  shortcuts: KeyboardShortcut[];
  categories: ShortcutCategory[];

  // Current state
  activeScope: string | null;
  isEnabled: boolean;

  // Actions
  registerShortcut: (shortcut: KeyboardShortcut) => string;
  unregisterShortcut: (id: string) => void;
  updateShortcut: (id: string, updates: Partial<KeyboardShortcut>) => void;
  enableShortcut: (id: string) => void;
  disableShortcut: (id: string) => void;
  setActiveScope: (scope: string | null) => void;
  enableGlobalShortcuts: () => void;
  disableGlobalShortcuts: () => void;

  // Utilities
  getShortcutsByCategory: (category: string) => KeyboardShortcut[];
  getShortcutsByScope: (scope: string, scopeId?: string) => KeyboardShortcut[];
  getShortcutByKeys: (keys: string) => KeyboardShortcut | undefined;
  hasConflict: (keys: string, scope?: string, scopeId?: string) => boolean;
  formatShortcutKeys: (keys: string) => string;
}

const KeyboardShortcutContext = createContext<KeyboardShortcutContextValue | null>(null);

const SHORTCUTS_STORAGE_KEY = 'mes-keyboard-shortcuts';

// Default global shortcuts
const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'global-help',
    description: 'Show help',
    keys: 'F1',
    handler: () => console.log('Help requested'),
    scope: 'global',
    category: 'navigation',
    priority: 1,
  },
  {
    id: 'global-search',
    description: 'Global search',
    keys: 'Ctrl+K',
    handler: () => console.log('Search activated'),
    scope: 'global',
    category: 'navigation',
    priority: 2,
  },
  {
    id: 'global-dashboard',
    description: 'Go to dashboard',
    keys: 'Ctrl+H',
    handler: () => console.log('Navigate to dashboard'),
    scope: 'global',
    category: 'navigation',
    priority: 1,
  },
  {
    id: 'global-save',
    description: 'Save current form/document',
    keys: 'Ctrl+S',
    handler: () => console.log('Save requested'),
    scope: 'global',
    category: 'actions',
    priority: 3,
  },
  {
    id: 'global-refresh',
    description: 'Refresh current page',
    keys: 'F5',
    handler: () => window.location.reload(),
    scope: 'global',
    category: 'actions',
    priority: 1,
    preventDefault: false, // Allow browser refresh
  },
];

interface KeyboardShortcutProviderProps {
  children: ReactNode;
  /** Initial shortcuts to register */
  initialShortcuts?: KeyboardShortcut[];
  /** Whether to load shortcuts from localStorage */
  persistShortcuts?: boolean;
}

export const KeyboardShortcutProvider: React.FC<KeyboardShortcutProviderProps> = ({
  children,
  initialShortcuts = [],
  persistShortcuts = true,
}) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [activeScope, setActiveScope] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  const shortcutsRef = useRef<KeyboardShortcut[]>([]);
  const activeScopeRef = useRef<string | null>(null);
  const isEnabledRef = useRef(true);

  // Update refs when state changes
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    activeScopeRef.current = activeScope;
  }, [activeScope]);

  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  /**
   * Parse key combination into normalized format
   */
  const parseKeys = useCallback((keys: string): string => {
    // Normalize key combinations
    const parts = keys.split('+').map(part => part.trim());
    const modifiers: string[] = [];
    let key = '';

    parts.forEach(part => {
      const lowerPart = part.toLowerCase();
      if (lowerPart === 'ctrl' || lowerPart === 'cmd' || lowerPart === 'meta') {
        modifiers.push('Ctrl');
      } else if (lowerPart === 'alt') {
        modifiers.push('Alt');
      } else if (lowerPart === 'shift') {
        modifiers.push('Shift');
      } else {
        key = part;
      }
    });

    return [...modifiers.sort(), key].join('+');
  }, []);

  /**
   * Check if event matches key combination
   */
  const matchesKeys = useCallback((event: KeyboardEvent, keys: string): boolean => {
    const eventKeys: string[] = [];

    if (event.ctrlKey || event.metaKey) eventKeys.push('Ctrl');
    if (event.altKey) eventKeys.push('Alt');
    if (event.shiftKey) eventKeys.push('Shift');
    eventKeys.push(event.key);

    const eventKeyString = eventKeys.join('+');
    const normalizedKeys = parseKeys(keys);

    return eventKeyString === normalizedKeys;
  }, [parseKeys]);

  /**
   * Register a new keyboard shortcut
   */
  const registerShortcut = useCallback((shortcut: KeyboardShortcut): string => {
    const normalizedKeys = parseKeys(shortcut.keys);
    const newShortcut: KeyboardShortcut = {
      ...shortcut,
      keys: normalizedKeys,
      enabled: shortcut.enabled !== false,
      priority: shortcut.priority || 1,
      preventDefault: shortcut.preventDefault !== false,
      stopPropagation: shortcut.stopPropagation !== false,
    };

    setShortcuts(prev => {
      // Remove existing shortcut with same ID
      const filtered = prev.filter(s => s.id !== newShortcut.id);
      return [...filtered, newShortcut].sort((a, b) => (b.priority || 1) - (a.priority || 1));
    });

    return newShortcut.id;
  }, [parseKeys]);

  /**
   * Unregister a keyboard shortcut
   */
  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts(prev => prev.filter(shortcut => shortcut.id !== id));
  }, []);

  /**
   * Update an existing shortcut
   */
  const updateShortcut = useCallback((id: string, updates: Partial<KeyboardShortcut>) => {
    setShortcuts(prev => prev.map(shortcut =>
      shortcut.id === id
        ? { ...shortcut, ...updates, keys: updates.keys ? parseKeys(updates.keys) : shortcut.keys }
        : shortcut
    ));
  }, [parseKeys]);

  /**
   * Enable/disable specific shortcuts
   */
  const enableShortcut = useCallback((id: string) => {
    updateShortcut(id, { enabled: true });
  }, [updateShortcut]);

  const disableShortcut = useCallback((id: string) => {
    updateShortcut(id, { enabled: false });
  }, [updateShortcut]);

  /**
   * Enable/disable all shortcuts
   */
  const enableGlobalShortcuts = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disableGlobalShortcuts = useCallback(() => {
    setIsEnabled(false);
  }, []);

  /**
   * Get shortcuts by category
   */
  const getShortcutsByCategory = useCallback((category: string): KeyboardShortcut[] => {
    return shortcuts.filter(shortcut => shortcut.category === category);
  }, [shortcuts]);

  /**
   * Get shortcuts by scope
   */
  const getShortcutsByScope = useCallback((scope: string, scopeId?: string): KeyboardShortcut[] => {
    return shortcuts.filter(shortcut =>
      shortcut.scope === scope &&
      (!scopeId || shortcut.scopeId === scopeId)
    );
  }, [shortcuts]);

  /**
   * Get shortcut by key combination
   */
  const getShortcutByKeys = useCallback((keys: string): KeyboardShortcut | undefined => {
    const normalizedKeys = parseKeys(keys);
    return shortcuts.find(shortcut => shortcut.keys === normalizedKeys);
  }, [shortcuts, parseKeys]);

  /**
   * Check for shortcut conflicts
   */
  const hasConflict = useCallback((keys: string, scope?: string, scopeId?: string): boolean => {
    const normalizedKeys = parseKeys(keys);
    return shortcuts.some(shortcut =>
      shortcut.keys === normalizedKeys &&
      shortcut.scope === scope &&
      (!scopeId || shortcut.scopeId === scopeId)
    );
  }, [shortcuts, parseKeys]);

  /**
   * Format shortcut keys for display
   */
  const formatShortcutKeys = useCallback((keys: string): string => {
    return keys.replace('Ctrl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
               .replace('Alt', navigator.platform.includes('Mac') ? '⌥' : 'Alt')
               .replace('Shift', '⇧');
  }, []);

  /**
   * Get organized categories
   */
  const categories: ShortcutCategory[] = React.useMemo(() => {
    const categoryMap = new Map<string, ShortcutCategory>();

    shortcuts.forEach(shortcut => {
      const categoryId = shortcut.category || 'general';
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
          shortcuts: [],
        });
      }
      categoryMap.get(categoryId)!.shortcuts.push(shortcut);
    });

    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [shortcuts]);

  /**
   * Handle global keyboard events
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabledRef.current) return;

    const currentShortcuts = shortcutsRef.current;
    const currentScope = activeScopeRef.current;

    // Find matching shortcuts, prioritizing by scope and priority
    const candidates = currentShortcuts
      .filter(shortcut =>
        shortcut.enabled !== false &&
        matchesKeys(event, shortcut.keys)
      )
      .sort((a, b) => {
        // Prioritize current scope
        if (currentScope) {
          if (a.scope === 'component' && a.scopeId === currentScope &&
              b.scope !== 'component') return -1;
          if (b.scope === 'component' && b.scopeId === currentScope &&
              a.scope !== 'component') return 1;
          if (a.scope === 'page' && a.scopeId === currentScope &&
              b.scope === 'global') return -1;
          if (b.scope === 'page' && b.scopeId === currentScope &&
              a.scope === 'global') return 1;
        }

        // Then by priority
        return (b.priority || 1) - (a.priority || 1);
      });

    const matchedShortcut = candidates[0];
    if (matchedShortcut) {
      if (matchedShortcut.preventDefault) {
        event.preventDefault();
      }
      if (matchedShortcut.stopPropagation) {
        event.stopPropagation();
      }

      try {
        matchedShortcut.handler(event);
      } catch (error) {
        console.error('Error executing keyboard shortcut:', error);
      }
    }
  }, [matchesKeys]);

  /**
   * Initialize shortcuts
   */
  useEffect(() => {
    const allInitialShortcuts = [...DEFAULT_SHORTCUTS, ...initialShortcuts];

    // Load from localStorage if enabled
    if (persistShortcuts) {
      try {
        const saved = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
        if (saved) {
          const savedShortcuts = JSON.parse(saved) as KeyboardShortcut[];
          // Merge with defaults, prioritizing saved shortcuts
          const merged = [...allInitialShortcuts];
          savedShortcuts.forEach(saved => {
            const existingIndex = merged.findIndex(s => s.id === saved.id);
            if (existingIndex >= 0) {
              merged[existingIndex] = saved;
            } else {
              merged.push(saved);
            }
          });
          allInitialShortcuts.splice(0, allInitialShortcuts.length, ...merged);
        }
      } catch (error) {
        console.warn('Failed to load keyboard shortcuts from localStorage:', error);
      }
    }

    // Register all initial shortcuts
    allInitialShortcuts.forEach(shortcut => {
      registerShortcut(shortcut);
    });
  }, [initialShortcuts, persistShortcuts, registerShortcut]);

  /**
   * Save shortcuts to localStorage when they change
   */
  useEffect(() => {
    if (persistShortcuts && shortcuts.length > 0) {
      try {
        localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts));
      } catch (error) {
        console.warn('Failed to save keyboard shortcuts to localStorage:', error);
      }
    }
  }, [shortcuts, persistShortcuts]);

  /**
   * Set up global keyboard event listener
   */
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);

  const contextValue: KeyboardShortcutContextValue = {
    shortcuts,
    categories,
    activeScope,
    isEnabled,
    registerShortcut,
    unregisterShortcut,
    updateShortcut,
    enableShortcut,
    disableShortcut,
    setActiveScope,
    enableGlobalShortcuts,
    disableGlobalShortcuts,
    getShortcutsByCategory,
    getShortcutsByScope,
    getShortcutByKeys,
    hasConflict,
    formatShortcutKeys,
  };

  return (
    <KeyboardShortcutContext.Provider value={contextValue}>
      {children}
    </KeyboardShortcutContext.Provider>
  );
};

/**
 * Hook to access keyboard shortcut context
 */
export const useKeyboardShortcuts = (): KeyboardShortcutContextValue => {
  const context = useContext(KeyboardShortcutContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutProvider');
  }
  return context;
};

/**
 * Hook to register shortcuts for a component
 */
export const useComponentShortcuts = (
  componentId: string,
  shortcuts: Omit<KeyboardShortcut, 'id' | 'scope' | 'scopeId'>[]
) => {
  const { registerShortcut, unregisterShortcut, setActiveScope } = useKeyboardShortcuts();
  const shortcutIdsRef = useRef<string[]>([]);

  useEffect(() => {
    // Register shortcuts
    const ids = shortcuts.map((shortcut, index) => {
      const id = `${componentId}-${index}`;
      registerShortcut({
        ...shortcut,
        id,
        scope: 'component',
        scopeId: componentId,
      });
      return id;
    });

    shortcutIdsRef.current = ids;

    // Set active scope
    setActiveScope(componentId);

    return () => {
      // Unregister shortcuts
      ids.forEach(id => unregisterShortcut(id));
      setActiveScope(null);
    };
  }, [componentId, shortcuts, registerShortcut, unregisterShortcut, setActiveScope]);

  return {
    shortcuts: shortcutIdsRef.current,
  };
};

export default KeyboardShortcutProvider;