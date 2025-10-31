/**
 * KeyboardShortcutHandler
 *
 * Enhanced for Issue #281: Systematic Keyboard Navigation Enhancement
 * Original: GitHub Issue #19: Configurable Side-by-Side Execution Interface
 *
 * Now integrates with KeyboardShortcutProvider context while maintaining
 * backward compatibility for existing usage
 */

import { useEffect, useCallback } from 'react';
import { useKeyboardShortcuts, KeyboardShortcut } from '../../contexts/KeyboardShortcutContext';

interface KeyboardShortcutHandlerProps {
  /** Legacy callback for backward compatibility */
  onShortcut: (shortcut: string) => void;
  /** Component identifier for scoped shortcuts */
  componentId?: string;
  /** Additional shortcuts to register for this component */
  shortcuts?: Omit<KeyboardShortcut, 'id' | 'scope' | 'scopeId'>[];
  /** Enable integration with new context system */
  useContextIntegration?: boolean;
}

// Legacy shortcut mappings for backward compatibility
const LEGACY_SHORTCUTS: Record<string, string> = {
  'Ctrl+1': 'Switch to view 1',
  'Ctrl+2': 'Switch to view 2',
  'Ctrl+N': 'New item',
  'Ctrl+P': 'Print',
  'Ctrl+S': 'Save',
  'Ctrl+Enter': 'Submit',
  'F11': 'Toggle fullscreen',
  'Ctrl+\\': 'Toggle sidebar',
  'Ctrl+[': 'Navigate back',
  'Ctrl+]': 'Navigate forward',
};

export const KeyboardShortcutHandler: React.FC<KeyboardShortcutHandlerProps> = ({
  onShortcut,
  componentId = 'execution-interface',
  shortcuts = [],
  useContextIntegration = true,
}) => {
  const keyboardShortcuts = useContextIntegration ?
    (() => {
      try {
        return useKeyboardShortcuts();
      } catch {
        // Context not available, fall back to legacy mode
        return null;
      }
    })() : null;

  /**
   * Enhanced shortcut handler with context integration
   */
  const handleShortcutWithContext = useCallback((shortcut: string) => {
    // Call the legacy callback
    onShortcut(shortcut);
  }, [onShortcut]);

  /**
   * Legacy shortcut handler (fallback)
   */
  const handleLegacyKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, ctrlKey, metaKey, altKey } = event;

    // Build shortcut string
    let shortcut = '';
    if (ctrlKey || metaKey) shortcut += 'Ctrl+';
    if (altKey) shortcut += 'Alt+';
    shortcut += key;

    // Check for known shortcuts
    const knownShortcuts = Object.keys(LEGACY_SHORTCUTS);

    if (knownShortcuts.includes(shortcut)) {
      event.preventDefault();
      onShortcut(shortcut);
    }
  }, [onShortcut]);

  /**
   * Register shortcuts with context system
   */
  useEffect(() => {
    if (!keyboardShortcuts) return;

    const registeredIds: string[] = [];

    // Register legacy shortcuts for backward compatibility
    Object.entries(LEGACY_SHORTCUTS).forEach(([keys, description]) => {
      const id = keyboardShortcuts.registerShortcut({
        id: `${componentId}-legacy-${keys.replace(/\+/g, '-')}`,
        description,
        keys,
        handler: () => handleShortcutWithContext(keys),
        scope: 'component',
        scopeId: componentId,
        category: 'execution',
        priority: 2,
      });
      registeredIds.push(id);
    });

    // Register additional component shortcuts
    shortcuts.forEach((shortcut, index) => {
      const id = keyboardShortcuts.registerShortcut({
        ...shortcut,
        id: `${componentId}-custom-${index}`,
        scope: 'component',
        scopeId: componentId,
        category: shortcut.category || 'execution',
      });
      registeredIds.push(id);
    });

    // Set active scope
    keyboardShortcuts.setActiveScope(componentId);

    return () => {
      // Cleanup: unregister shortcuts and clear scope
      registeredIds.forEach(id => {
        keyboardShortcuts.unregisterShortcut(id);
      });
      keyboardShortcuts.setActiveScope(null);
    };
  }, [keyboardShortcuts, componentId, shortcuts, handleShortcutWithContext]);

  /**
   * Legacy mode: direct event listener
   */
  useEffect(() => {
    if (keyboardShortcuts) return; // Use context system instead

    document.addEventListener('keydown', handleLegacyKeyDown);

    return () => {
      document.removeEventListener('keydown', handleLegacyKeyDown);
    };
  }, [keyboardShortcuts, handleLegacyKeyDown]);

  return null; // This component doesn't render anything
};

export default KeyboardShortcutHandler;