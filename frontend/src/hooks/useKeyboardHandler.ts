/**
 * useKeyboardHandler Hook
 * Issue #281: Systematic Keyboard Navigation Enhancement
 *
 * Provides consistent keyboard interaction patterns for interactive elements
 * Supports Enter/Space activation, arrow navigation, and custom key handlers
 */

import { useCallback, useEffect, useRef } from 'react';

// Keyboard key constants for consistency
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

export type KeyboardKey = typeof KEYBOARD_KEYS[keyof typeof KEYBOARD_KEYS];

export interface KeyboardHandlerOptions {
  /** Element ref to attach keyboard listeners to */
  targetRef?: React.RefObject<HTMLElement>;
  /** Enable default activation on Enter/Space */
  enableActivation?: boolean;
  /** Enable arrow key navigation */
  enableArrowNavigation?: boolean;
  /** Enable escape key handling */
  enableEscape?: boolean;
  /** Custom key handlers */
  onKeyDown?: (event: KeyboardEvent, key: string) => void;
  /** Activation handler for Enter/Space */
  onActivate?: (event: KeyboardEvent) => void;
  /** Arrow navigation handler */
  onArrowNavigation?: (direction: 'up' | 'down' | 'left' | 'right', event: KeyboardEvent) => void;
  /** Escape key handler */
  onEscape?: (event: KeyboardEvent) => void;
  /** Prevent default behavior for handled keys */
  preventDefault?: boolean;
  /** Stop event propagation for handled keys */
  stopPropagation?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export interface UseKeyboardHandlerReturn {
  /** Keyboard event handlers to spread on element */
  keyboardProps: {
    onKeyDown: (event: React.KeyboardEvent) => void;
    tabIndex: number;
    role?: string;
  };
  /** Check if a key is an activation key (Enter/Space) */
  isActivationKey: (key: string) => boolean;
  /** Check if a key is an arrow key */
  isArrowKey: (key: string) => boolean;
  /** Get arrow direction from key */
  getArrowDirection: (key: string) => 'up' | 'down' | 'left' | 'right' | null;
}

/**
 * Custom hook for consistent keyboard navigation and interaction
 *
 * Features:
 * - Enter/Space activation for interactive elements
 * - Arrow key navigation with directional callbacks
 * - Escape key handling for dismissible elements
 * - Custom key handler support
 * - WCAG 2.1 compliant keyboard patterns
 *
 * @example
 * // Basic button activation
 * const { keyboardProps } = useKeyboardHandler({
 *   onActivate: () => console.log('Button activated!'),
 * });
 *
 * <div {...keyboardProps} onClick={handleClick}>
 *   Custom Button
 * </div>
 *
 * @example
 * // Arrow navigation for lists
 * const { keyboardProps } = useKeyboardHandler({
 *   enableArrowNavigation: true,
 *   onArrowNavigation: (direction) => {
 *     if (direction === 'down') focusNextItem();
 *     if (direction === 'up') focusPreviousItem();
 *   },
 * });
 */
export const useKeyboardHandler = (options: KeyboardHandlerOptions = {}): UseKeyboardHandlerReturn => {
  const {
    targetRef,
    enableActivation = true,
    enableArrowNavigation = false,
    enableEscape = false,
    onKeyDown,
    onActivate,
    onArrowNavigation,
    onEscape,
    preventDefault = true,
    stopPropagation = false,
    disabled = false,
  } = options;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Check if a key is an activation key (Enter or Space)
   */
  const isActivationKey = useCallback((key: string): boolean => {
    return key === KEYBOARD_KEYS.ENTER || key === KEYBOARD_KEYS.SPACE;
  }, []);

  /**
   * Check if a key is an arrow key
   */
  const isArrowKey = useCallback((key: string): boolean => {
    return [
      KEYBOARD_KEYS.ARROW_UP,
      KEYBOARD_KEYS.ARROW_DOWN,
      KEYBOARD_KEYS.ARROW_LEFT,
      KEYBOARD_KEYS.ARROW_RIGHT,
    ].includes(key as KeyboardKey);
  }, []);

  /**
   * Get arrow direction from key
   */
  const getArrowDirection = useCallback((key: string): 'up' | 'down' | 'left' | 'right' | null => {
    switch (key) {
      case KEYBOARD_KEYS.ARROW_UP:
        return 'up';
      case KEYBOARD_KEYS.ARROW_DOWN:
        return 'down';
      case KEYBOARD_KEYS.ARROW_LEFT:
        return 'left';
      case KEYBOARD_KEYS.ARROW_RIGHT:
        return 'right';
      default:
        return null;
    }
  }, []);

  /**
   * Main keyboard event handler
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent | KeyboardEvent) => {
    if (disabled) return;

    const key = event.key;
    const currentOptions = optionsRef.current;

    // Call custom key handler first
    if (currentOptions.onKeyDown) {
      currentOptions.onKeyDown(event as KeyboardEvent, key);
    }

    let handled = false;

    // Handle activation keys (Enter/Space)
    if (enableActivation && isActivationKey(key) && currentOptions.onActivate) {
      currentOptions.onActivate(event as KeyboardEvent);
      handled = true;
    }

    // Handle arrow navigation
    if (enableArrowNavigation && isArrowKey(key) && currentOptions.onArrowNavigation) {
      const direction = getArrowDirection(key);
      if (direction) {
        currentOptions.onArrowNavigation(direction, event as KeyboardEvent);
        handled = true;
      }
    }

    // Handle escape key
    if (enableEscape && key === KEYBOARD_KEYS.ESCAPE && currentOptions.onEscape) {
      currentOptions.onEscape(event as KeyboardEvent);
      handled = true;
    }

    // Prevent default and stop propagation if requested
    if (handled) {
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }
    }
  }, [
    disabled,
    enableActivation,
    enableArrowNavigation,
    enableEscape,
    isActivationKey,
    isArrowKey,
    getArrowDirection,
    preventDefault,
    stopPropagation,
  ]);

  /**
   * Attach keyboard listeners to target element if provided
   */
  useEffect(() => {
    if (!targetRef?.current) return;

    const element = targetRef.current;
    element.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      element.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [targetRef, handleKeyDown]);

  return {
    keyboardProps: {
      onKeyDown: handleKeyDown,
      tabIndex: disabled ? -1 : 0,
      role: enableActivation ? 'button' : undefined,
    },
    isActivationKey,
    isArrowKey,
    getArrowDirection,
  };
};

export default useKeyboardHandler;