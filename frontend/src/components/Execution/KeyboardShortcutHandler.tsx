/**
 * KeyboardShortcutHandler
 *
 * GitHub Issue #19: Configurable Side-by-Side Execution Interface
 */

import { useEffect } from 'react';

interface KeyboardShortcutHandlerProps {
  onShortcut: (shortcut: string) => void;
}

export const KeyboardShortcutHandler: React.FC<KeyboardShortcutHandlerProps> = ({
  onShortcut,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, altKey } = event;

      // Build shortcut string
      let shortcut = '';
      if (ctrlKey || metaKey) shortcut += 'Ctrl+';
      if (altKey) shortcut += 'Alt+';
      shortcut += key;

      // Check for known shortcuts
      const knownShortcuts = [
        'Ctrl+1',
        'Ctrl+2',
        'Ctrl+N',
        'Ctrl+P',
        'Ctrl+S',
        'Ctrl+Enter',
        'F11',
        'Ctrl+\\',
        'Ctrl+[',
        'Ctrl+]',
      ];

      if (knownShortcuts.includes(shortcut)) {
        event.preventDefault();
        onShortcut(shortcut);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onShortcut]);

  return null; // This component doesn't render anything
};

export default KeyboardShortcutHandler;