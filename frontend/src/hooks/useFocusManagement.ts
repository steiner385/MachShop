/**
 * useFocusManagement Hook
 * Issue #281: Systematic Keyboard Navigation Enhancement
 *
 * Manages focus for complex components like modals, menus, and lists
 * Provides focus trapping, restoration, and programmatic focus control
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface FocusManagementOptions {
  /** Container element to manage focus within */
  containerRef?: React.RefObject<HTMLElement>;
  /** Enable focus trapping (prevent focus from leaving container) */
  enableFocusTrap?: boolean;
  /** Restore focus to trigger element when unmounting */
  restoreFocus?: boolean;
  /** Initially focused element selector or ref */
  initialFocus?: string | React.RefObject<HTMLElement>;
  /** Elements to exclude from focus management */
  excludeSelectors?: string[];
  /** Auto-focus first focusable element on mount */
  autoFocus?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export interface UseFocusManagementReturn {
  /** Focus the first focusable element */
  focusFirst: () => void;
  /** Focus the last focusable element */
  focusLast: () => void;
  /** Focus the next focusable element */
  focusNext: () => void;
  /** Focus the previous focusable element */
  focusPrevious: () => void;
  /** Focus a specific element */
  focusElement: (element: HTMLElement | null) => void;
  /** Get all focusable elements in container */
  getFocusableElements: () => HTMLElement[];
  /** Check if focus is within the container */
  isFocusWithin: boolean;
  /** Current focused element index */
  focusedIndex: number;
  /** Total number of focusable elements */
  focusableCount: number;
}

// Focusable element selectors (WCAG compliant)
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'details summary',
  'iframe',
  'embed',
  'object',
  'area[href]',
].join(', ');

/**
 * Custom hook for comprehensive focus management
 *
 * Features:
 * - Focus trapping for modals and dialogs
 * - Keyboard navigation between focusable elements
 * - Focus restoration after component unmount
 * - Programmatic focus control
 * - WCAG 2.1 compliant focus management
 *
 * @example
 * // Modal with focus trapping
 * const modalRef = useRef<HTMLDivElement>(null);
 * const { focusFirst, focusLast } = useFocusManagement({
 *   containerRef: modalRef,
 *   enableFocusTrap: true,
 *   restoreFocus: true,
 *   autoFocus: true,
 * });
 *
 * @example
 * // List navigation
 * const listRef = useRef<HTMLUListElement>(null);
 * const { focusNext, focusPrevious } = useFocusManagement({
 *   containerRef: listRef,
 * });
 */
export const useFocusManagement = (options: FocusManagementOptions = {}): UseFocusManagementReturn => {
  const {
    containerRef,
    enableFocusTrap = false,
    restoreFocus = false,
    initialFocus,
    excludeSelectors = [],
    autoFocus = false,
    disabled = false,
  } = options;

  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [focusableCount, setFocusableCount] = useState(0);

  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Get all focusable elements within the container
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef?.current || disabled) return [];

    const container = containerRef.current;
    const elements = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)) as HTMLElement[];

    // Filter out excluded elements
    return elements.filter(element => {
      if (excludeSelectors.some(selector => element.matches(selector))) {
        return false;
      }

      // Check if element is actually visible and focusable
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }

      // Check if element is disabled
      if (element.hasAttribute('disabled')) {
        return false;
      }

      return true;
    });
  }, [containerRef, disabled, excludeSelectors]);

  /**
   * Focus a specific element and update state
   */
  const focusElement = useCallback((element: HTMLElement | null) => {
    if (!element || disabled) return;

    element.focus();

    const focusableElements = getFocusableElements();
    const index = focusableElements.indexOf(element);
    setFocusedIndex(index);
  }, [disabled, getFocusableElements]);

  /**
   * Focus the first focusable element
   */
  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      focusElement(elements[0]);
    }
  }, [getFocusableElements, focusElement]);

  /**
   * Focus the last focusable element
   */
  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      focusElement(elements[elements.length - 1]);
    }
  }, [getFocusableElements, focusElement]);

  /**
   * Focus the next focusable element
   */
  const focusNext = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    const currentIndex = focusedIndex;
    const nextIndex = currentIndex + 1;

    if (nextIndex < elements.length) {
      focusElement(elements[nextIndex]);
    } else if (enableFocusTrap) {
      // Wrap to first element if focus trapping is enabled
      focusElement(elements[0]);
    }
  }, [getFocusableElements, focusElement, focusedIndex, enableFocusTrap]);

  /**
   * Focus the previous focusable element
   */
  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    const currentIndex = focusedIndex;
    const previousIndex = currentIndex - 1;

    if (previousIndex >= 0) {
      focusElement(elements[previousIndex]);
    } else if (enableFocusTrap) {
      // Wrap to last element if focus trapping is enabled
      focusElement(elements[elements.length - 1]);
    }
  }, [getFocusableElements, focusElement, focusedIndex, enableFocusTrap]);

  /**
   * Handle focus events within the container
   */
  const handleFocusIn = useCallback((event: FocusEvent) => {
    if (!containerRef?.current) return;

    const target = event.target as HTMLElement;
    const container = containerRef.current;

    if (container.contains(target)) {
      setIsFocusWithin(true);

      const elements = getFocusableElements();
      const index = elements.indexOf(target);
      setFocusedIndex(index);
    }
  }, [containerRef, getFocusableElements]);

  /**
   * Handle focus leaving the container
   */
  const handleFocusOut = useCallback((event: FocusEvent) => {
    if (!containerRef?.current) return;

    const target = event.relatedTarget as HTMLElement;
    const container = containerRef.current;

    // Check if focus is moving outside the container
    if (!target || !container.contains(target)) {
      setIsFocusWithin(false);
      setFocusedIndex(-1);

      // If focus trapping is enabled and focus is leaving, bring it back
      if (enableFocusTrap && !disabled) {
        // Small delay to ensure the focus event has completed
        setTimeout(() => {
          if (document.activeElement && !container.contains(document.activeElement)) {
            focusFirst();
          }
        }, 0);
      }
    }
  }, [containerRef, enableFocusTrap, disabled, focusFirst]);

  /**
   * Handle Tab key for focus trapping
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableFocusTrap || disabled || event.key !== 'Tab') return;

    const elements = getFocusableElements();
    if (elements.length === 0) return;

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    // If Shift+Tab on first element, focus last
    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      focusElement(lastElement);
    }
    // If Tab on last element, focus first
    else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      focusElement(firstElement);
    }
  }, [enableFocusTrap, disabled, getFocusableElements, focusElement]);

  /**
   * Store previously focused element on mount
   */
  useEffect(() => {
    if (restoreFocus && !disabled) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
    }
  }, [restoreFocus, disabled]);

  /**
   * Auto-focus initial element
   */
  useEffect(() => {
    if (!autoFocus || disabled) return;

    const handleInitialFocus = () => {
      if (initialFocus) {
        if (typeof initialFocus === 'string') {
          const element = containerRef?.current?.querySelector(initialFocus) as HTMLElement;
          if (element) {
            focusElement(element);
            return;
          }
        } else if (initialFocus.current) {
          focusElement(initialFocus.current);
          return;
        }
      }

      // Fallback to first focusable element
      focusFirst();
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(handleInitialFocus, 0);

    return () => clearTimeout(timeoutId);
  }, [autoFocus, disabled, initialFocus, containerRef, focusElement, focusFirst]);

  /**
   * Update focusable count when container changes
   */
  useEffect(() => {
    const updateCount = () => {
      const elements = getFocusableElements();
      setFocusableCount(elements.length);
    };

    updateCount();

    // Set up mutation observer to watch for changes
    if (containerRef?.current) {
      const observer = new MutationObserver(updateCount);
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'tabindex', 'aria-hidden'],
      });

      return () => observer.disconnect();
    }
  }, [containerRef, getFocusableElements]);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    if (!containerRef?.current || disabled) return;

    const container = containerRef.current;

    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);

    if (enableFocusTrap) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);

      if (enableFocusTrap) {
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [containerRef, disabled, handleFocusIn, handleFocusOut, handleKeyDown, enableFocusTrap]);

  /**
   * Restore focus on unmount
   */
  useEffect(() => {
    return () => {
      if (restoreFocus && previouslyFocusedElementRef.current && !disabled) {
        // Small delay to ensure component is fully unmounted
        setTimeout(() => {
          if (previouslyFocusedElementRef.current) {
            previouslyFocusedElementRef.current.focus();
          }
        }, 0);
      }
    };
  }, [restoreFocus, disabled]);

  return {
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusElement,
    getFocusableElements,
    isFocusWithin,
    focusedIndex,
    focusableCount,
  };
};

export default useFocusManagement;